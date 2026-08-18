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

function Get-WorkspacePermissionIssues {
  param(
    [Parameter(Mandatory)]
    [string]$WorkspaceRoot,
    [Parameter(Mandatory)]
    [string]$ExpectedOwner,
    [switch]$IncludeAll
  )

  if ($IncludeAll) {
    $items = @((Get-Item -Force -LiteralPath $WorkspaceRoot)) + @(
      Get-ChildItem -Force -LiteralPath $WorkspaceRoot -Recurse
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

    & icacls.exe $resolvedRoot /setowner $expectedOwner /T /C /Q
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to set workspace owner (icacls exit code $LASTEXITCODE)."
    }
    $completedRepairOperations++

    Write-Progress `
      -Id 1 `
      -Activity $repairActivity `
      -Status 'Enabling ACL inheritance' `
      -PercentComplete ([Math]::Floor(($completedRepairOperations / $repairOperationCount) * 100))

    & icacls.exe $resolvedRoot /inheritance:e /T /C /Q
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to enable ACL inheritance (icacls exit code $LASTEXITCODE)."
    }
    $completedRepairOperations++

    if ($ResetAcl) {
      Write-Progress `
        -Id 1 `
        -Activity $repairActivity `
        -Status 'Resetting workspace ACLs' `
        -PercentComplete ([Math]::Floor(($completedRepairOperations / $repairOperationCount) * 100))

      & icacls.exe $resolvedRoot /reset /T /C /Q
      if ($LASTEXITCODE -ne 0) {
        throw "Failed to reset workspace ACLs (icacls exit code $LASTEXITCODE)."
      }
    }
  }
  finally {
    Write-Progress -Id 1 -Activity $repairActivity -Completed
  }
}

Write-Host "Scanning workspace permissions under $resolvedRoot"
Write-Host "Scope: $(if ($All) { 'all files' } else { 'source and unignored files' })"
Write-Host "Expected owner: $expectedOwner"
$issues = @(
  Get-WorkspacePermissionIssues `
    -WorkspaceRoot $resolvedRoot `
    -ExpectedOwner $expectedOwner `
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
