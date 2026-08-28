param(
  [Parameter(Mandatory)]
  [ValidateSet('Compile', 'Run', 'Test')]
  [string]$Action
)

$ErrorActionPreference = 'Stop'
$utf8Encoding = [Text.UTF8Encoding]::new($false)
[Console]::InputEncoding = $utf8Encoding
[Console]::OutputEncoding = $utf8Encoding
$OutputEncoding = $utf8Encoding

$courseRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$mainSourceRoot = Join-Path $courseRoot 'src/main/java'
$testSourceRoot = Join-Path $courseRoot 'src/test/java'
$buildRoot = Join-Path $courseRoot '.build'
$mainOutput = Join-Path $buildRoot 'main'
$testOutput = Join-Path $buildRoot 'test'
$javaEncodingArguments = @(
  '-Dfile.encoding=UTF-8',
  '-Dsun.stdout.encoding=UTF-8',
  '-Dsun.stderr.encoding=UTF-8'
)

function Assert-JavaCommand {
  param([Parameter(Mandatory)][string]$CommandName)

  if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
    throw "Java command '$CommandName' was not found. Install JDK 21 and add its bin directory to PATH."
  }
}

function Get-JavaSourceFiles {
  param([Parameter(Mandatory)][string]$SourceRoot)

  $sourceFiles = @(
    Get-ChildItem -LiteralPath $SourceRoot -Recurse -File -Filter '*.java' |
      Sort-Object FullName |
      Select-Object -ExpandProperty FullName
  )

  if ($sourceFiles.Count -eq 0) {
    throw "No Java source files were found under $SourceRoot."
  }

  return $sourceFiles
}

function Compile-MainSources {
  New-Item -ItemType Directory -Force -Path $mainOutput | Out-Null
  $sourceFiles = Get-JavaSourceFiles -SourceRoot $mainSourceRoot
  $compilerArguments = @('-encoding', 'UTF-8', '-d', $mainOutput) + @($sourceFiles)

  & javac.exe @compilerArguments
  if ($LASTEXITCODE -ne 0) {
    throw "Main Java compilation failed with exit code $LASTEXITCODE."
  }
}

function Compile-TestSources {
  New-Item -ItemType Directory -Force -Path $testOutput | Out-Null
  $sourceFiles = Get-JavaSourceFiles -SourceRoot $testSourceRoot
  $compilerArguments = @(
    '-encoding',
    'UTF-8',
    '-classpath',
    $mainOutput,
    '-d',
    $testOutput
  ) + @($sourceFiles)

  & javac.exe @compilerArguments
  if ($LASTEXITCODE -ne 0) {
    throw "Java test compilation failed with exit code $LASTEXITCODE."
  }
}

Assert-JavaCommand -CommandName 'javac.exe'
Assert-JavaCommand -CommandName 'java.exe'

switch ($Action) {
  'Compile' {
    Compile-MainSources
    Write-Host "Java compilation passed. Classes: $mainOutput"
  }
  'Run' {
    Compile-MainSources
    & java.exe @javaEncodingArguments -cp $mainOutput study.concurrency.ConcurrencyCourseApp
    if ($LASTEXITCODE -ne 0) {
      exit $LASTEXITCODE
    }
  }
  'Test' {
    Compile-MainSources
    Compile-TestSources
    $classPath = "$mainOutput$([IO.Path]::PathSeparator)$testOutput"
    & java.exe @javaEncodingArguments -cp $classPath study.concurrency.ThreadBasicsTest
    if ($LASTEXITCODE -ne 0) {
      exit $LASTEXITCODE
    }
  }
}
