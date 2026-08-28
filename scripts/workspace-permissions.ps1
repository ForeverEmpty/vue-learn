[CmdletBinding()]
param(
  [string]$Root,
  [string]$Owner,
  [switch]$Fix,
  [switch]$ResetAcl,
  [switch]$All,
  [switch]$Elevated
)

$ErrorActionPreference = 'Stop'

$dependencyDirectoryNames = [Collections.Generic.HashSet[string]]::new(
  [StringComparer]::OrdinalIgnoreCase
)
@(
  'node_modules'
  '.pnpm-store'
  '.yarn'
  'bower_components'
  'jspm_packages'
  'vendor'
  '.venv'
  'venv'
  '__pypackages__'
  '.gradle'
  '.gradle-user-home'
) | ForEach-Object { [void]$dependencyDirectoryNames.Add($_) }

if (-not $IsWindows -and $PSVersionTable.PSEdition -eq 'Core') {
  throw 'This tool only supports Windows.'
}

if ([string]::IsNullOrWhiteSpace($Root)) {
  $scriptDirectory = Split-Path -Parent $PSCommandPath
  $Root = Split-Path -Parent $scriptDirectory
}

$resolvedRoot = [System.IO.Path]::GetFullPath($Root)
if (-not (Test-Path -LiteralPath $resolvedRoot -PathType Container)) {
  throw "Workspace root does not exist: $resolvedRoot"
}

$rootAcl = Get-Acl -LiteralPath $resolvedRoot
$expectedOwner = if ($Owner) { $Owner } else { $rootAcl.Owner }
if ([string]::IsNullOrWhiteSpace($expectedOwner)) {
  throw 'Could not determine the expected workspace owner. Pass -Owner explicitly.'
}

function Test-PathContainsDependencyDirectory {
  param(
    [Parameter(Mandatory)]
    [string]$Path,
    [Parameter(Mandatory)]
    [Collections.Generic.HashSet[string]]$DependencyDirectoryNames
  )

  foreach ($pathSegment in $Path -split '[\\/]') {
    if ($DependencyDirectoryNames.Contains($pathSegment)) {
      return $true
    }
  }

  return $false
}

function Get-AllWorkspacePermissionItems {
  param(
    [Parameter(Mandatory)]
    [string]$WorkspaceRoot,
    [Parameter(Mandatory)]
    [Collections.Generic.HashSet[string]]$DependencyDirectoryNames
  )

  $rootItem = Get-Item -Force -LiteralPath $WorkspaceRoot
  Write-Output $rootItem

  $pendingDirectories = [Collections.Generic.Stack[IO.DirectoryInfo]]::new()
  $pendingDirectories.Push($rootItem)

  while ($pendingDirectories.Count -gt 0) {
    $currentDirectory = $pendingDirectories.Pop()
    foreach ($item in Get-ChildItem -Force -LiteralPath $currentDirectory.FullName) {
      if ($item.PSIsContainer -and $DependencyDirectoryNames.Contains($item.Name)) {
        continue
      }

      Write-Output $item

      if (
        $item.PSIsContainer -and
        -not ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)
      ) {
        $pendingDirectories.Push($item)
      }
    }
  }
}

function Get-WorkspacePermissionIssues {
  param(
    [Parameter(Mandatory)]
    [string]$WorkspaceRoot,
    [Parameter(Mandatory)]
    [string]$ExpectedOwner,
    [Parameter(Mandatory)]
    [Collections.Generic.HashSet[string]]$DependencyDirectoryNames,
    [switch]$IncludeAll
  )

  if ($IncludeAll) {
    $items = @(
      Get-AllWorkspacePermissionItems `
        -WorkspaceRoot $WorkspaceRoot `
        -DependencyDirectoryNames $DependencyDirectoryNames
    )
  }
  else {
    $relativePaths = @(& git -C $WorkspaceRoot ls-files -co --exclude-standard)
    if ($LASTEXITCODE -ne 0) {
      throw 'Could not enumerate workspace files with Git. Use -All to scan without Git.'
    }

    $workspacePaths = [Collections.Generic.HashSet[string]]::new(
      [StringComparer]::OrdinalIgnoreCase
    )
    [void]$workspacePaths.Add($WorkspaceRoot)

    foreach ($relativePath in $relativePaths) {
      if (
        Test-PathContainsDependencyDirectory `
          -Path $relativePath `
          -DependencyDirectoryNames $DependencyDirectoryNames
      ) {
        continue
      }

      $fullPath = [IO.Path]::GetFullPath((Join-Path $WorkspaceRoot $relativePath))
      if (-not (Test-Path -LiteralPath $fullPath)) {
        continue
      }

      [void]$workspacePaths.Add($fullPath)
      $parentPath = Split-Path -Parent $fullPath
      while ($parentPath -and $parentPath.StartsWith(
          $WorkspaceRoot,
          [StringComparison]::OrdinalIgnoreCase
        )) {
        [void]$workspacePaths.Add($parentPath)
        if ($parentPath -eq $WorkspaceRoot) {
          break
        }
        $parentPath = Split-Path -Parent $parentPath
      }
    }

    $items = @($workspacePaths | ForEach-Object { Get-Item -Force -LiteralPath $_ })
  }

  $itemCount = $items.Count
  $processedItemCount = 0
  $lastReportedPercent = -1
  $scanActivity = 'Scanning workspace permissions'

  Write-Progress `
    -Id 1 `
    -Activity $scanActivity `
    -Status "0 of $itemCount checked" `
    -PercentComplete 0

  try {
    $issues = foreach ($item in $items) {
      try {
        $acl = Get-Acl -LiteralPath $item.FullName
        if ($acl.Owner -ne $ExpectedOwner -or $acl.AreAccessRulesProtected) {
          [pscustomobject]@{
            Path = $item.FullName
            Owner = $acl.Owner
            ExpectedOwner = $ExpectedOwner
            InheritanceDisabled = $acl.AreAccessRulesProtected
            Error = $null
          }
        }
      }
      catch {
        [pscustomobject]@{
          Path = $item.FullName
          Owner = $null
          ExpectedOwner = $ExpectedOwner
          InheritanceDisabled = $null
          Error = $_.Exception.Message
        }
      }
      finally {
        $processedItemCount++
        $percentComplete = if ($itemCount -eq 0) {
          100
        }
        else {
          [Math]::Floor(($processedItemCount / $itemCount) * 100)
        }

        if ($percentComplete -ne $lastReportedPercent) {
          Write-Progress `
            -Id 1 `
            -Activity $scanActivity `
            -Status "$processedItemCount of $itemCount checked" `
            -CurrentOperation $item.FullName `
            -PercentComplete $percentComplete
          $lastReportedPercent = $percentComplete
        }
      }
    }
  }
  finally {
    Write-Progress -Id 1 -Activity $scanActivity -Completed
  }

  return @($issues)
}

function Invoke-IcaclsForWorkspaceTree {
  param(
    [Parameter(Mandatory)]
    [string]$WorkspaceRoot,
    [Parameter(Mandatory)]
    [Collections.Generic.HashSet[string]]$DependencyDirectoryNames,
    [Parameter(Mandatory)]
    [string[]]$OperationArguments,
    [Parameter(Mandatory)]
    [string]$OperationName
  )

  $operationTargets = [Collections.Generic.List[object]]::new()
  $operationTargets.Add([pscustomobject]@{
      Path = $WorkspaceRoot
      DisplayPath = $WorkspaceRoot
    })
  $pendingDirectories = [Collections.Generic.Stack[IO.DirectoryInfo]]::new()
  $pendingDirectories.Push((Get-Item -Force -LiteralPath $WorkspaceRoot))

  while ($pendingDirectories.Count -gt 0) {
    $currentDirectory = $pendingDirectories.Pop()
    $childItems = @(Get-ChildItem -Force -LiteralPath $currentDirectory.FullName)
    if ($childItems.Count -eq 0) {
      continue
    }

    $operationTargets.Add([pscustomobject]@{
        Path = Join-Path $currentDirectory.FullName '*'
        DisplayPath = $currentDirectory.FullName
      })

    foreach ($childDirectory in $childItems | Where-Object { $_.PSIsContainer }) {
      if ($DependencyDirectoryNames.Contains($childDirectory.Name)) {
        continue
      }
      if ($childDirectory.Attributes -band [IO.FileAttributes]::ReparsePoint) {
        continue
      }

      $pendingDirectories.Push($childDirectory)
    }
  }

  $operationCount = $operationTargets.Count
  $completedOperationCount = 0
  $progressActivity = 'Applying workspace permissions'

  Write-Progress `
    -Id 2 `
    -ParentId 1 `
    -Activity $progressActivity `
    -Status "$OperationName`: 0 of $operationCount directory batches" `
    -PercentComplete 0

  try {
    foreach ($operationTarget in $operationTargets) {
      & icacls.exe $operationTarget.Path @OperationArguments /C /Q | Out-Null
      if ($LASTEXITCODE -ne 0) {
        throw "Failed to $OperationName under $($operationTarget.DisplayPath) (icacls exit code $LASTEXITCODE)."
      }

      $completedOperationCount++
      Write-Progress `
        -Id 2 `
        -ParentId 1 `
        -Activity $progressActivity `
        -Status "$OperationName`: $completedOperationCount of $operationCount directory batches" `
        -CurrentOperation $operationTarget.DisplayPath `
        -PercentComplete ([Math]::Floor(($completedOperationCount / $operationCount) * 100))
    }
  }
  finally {
    Write-Progress -Id 2 -ParentId 1 -Activity $progressActivity -Completed
  }
}

function Test-IsAdministrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Invoke-ElevatedRepair {
  $shellPath = if ($PSVersionTable.PSEdition -eq 'Core') {
    (Get-Process -Id $PID).Path
  }
  else {
    "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
  }

  $arguments = @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $PSCommandPath,
    '-Root', $resolvedRoot,
    '-Owner', $expectedOwner,
    '-Fix',
    '-Elevated'
  )
  if ($ResetAcl) {
    $arguments += '-ResetAcl'
  }
  if ($All) {
    $arguments += '-All'
  }

  $process = Start-Process -FilePath $shellPath -ArgumentList $arguments -Verb RunAs -Wait -PassThru
  exit $process.ExitCode
}

if ($Fix -and -not (Test-IsAdministrator)) {
  Invoke-ElevatedRepair
}

if ($Fix) {
  Write-Host "Repairing workspace permissions under $resolvedRoot"
  Write-Host "Expected owner: $expectedOwner"

  $repairActivity = 'Repairing workspace permissions'
  $repairOperationCount = if ($ResetAcl) { 3 } else { 2 }
  $completedRepairOperations = 0

  try {
    Write-Progress `
      -Id 1 `
      -Activity $repairActivity `
      -Status 'Setting workspace owner' `
      -PercentComplete 0

    Invoke-IcaclsForWorkspaceTree `
      -WorkspaceRoot $resolvedRoot `
      -DependencyDirectoryNames $dependencyDirectoryNames `
      -OperationArguments @('/setowner', $expectedOwner) `
      -OperationName 'set workspace owner'
    $completedRepairOperations++

    Write-Progress `
      -Id 1 `
      -Activity $repairActivity `
      -Status 'Enabling ACL inheritance' `
      -PercentComplete ([Math]::Floor(($completedRepairOperations / $repairOperationCount) * 100))

    Invoke-IcaclsForWorkspaceTree `
      -WorkspaceRoot $resolvedRoot `
      -DependencyDirectoryNames $dependencyDirectoryNames `
      -OperationArguments @('/inheritance:e') `
      -OperationName 'enable ACL inheritance'
    $completedRepairOperations++

    if ($ResetAcl) {
      Write-Progress `
        -Id 1 `
        -Activity $repairActivity `
        -Status 'Resetting workspace ACLs' `
        -PercentComplete ([Math]::Floor(($completedRepairOperations / $repairOperationCount) * 100))

      Invoke-IcaclsForWorkspaceTree `
        -WorkspaceRoot $resolvedRoot `
        -DependencyDirectoryNames $dependencyDirectoryNames `
        -OperationArguments @('/reset') `
        -OperationName 'reset workspace ACLs'
    }
  }
  finally {
    Write-Progress -Id 1 -Activity $repairActivity -Completed
  }
}

Write-Host "Scanning workspace permissions under $resolvedRoot"
Write-Host "Scope: $(if ($All) { 'all files except dependency directories' } else { 'source and unignored files except dependency directories' })"
Write-Host "Skipped directories: $([string]::Join(', ', $dependencyDirectoryNames))"
Write-Host "Expected owner: $expectedOwner"
$issues = @(
  Get-WorkspacePermissionIssues `
    -WorkspaceRoot $resolvedRoot `
    -ExpectedOwner $expectedOwner `
    -DependencyDirectoryNames $dependencyDirectoryNames `
    -IncludeAll:$All
)

if ($issues.Count -eq 0) {
  Write-Host 'Workspace ownership and ACL inheritance are healthy.' -ForegroundColor Green
  exit 0
}

$issues |
  Select-Object Path, Owner, ExpectedOwner, InheritanceDisabled, Error |
  Format-Table -AutoSize

Write-Error "Found $($issues.Count) workspace permission issue(s)."
exit 1
