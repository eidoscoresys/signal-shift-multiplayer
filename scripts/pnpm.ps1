param([Parameter(ValueFromRemainingArguments=$true)][string[]]$PnpmArgs)
$ErrorActionPreference='Stop'
$pnpmCommand=Get-Command pnpm -ErrorAction SilentlyContinue
if($pnpmCommand){ & $pnpmCommand.Source @PnpmArgs; exit $LASTEXITCODE }
if($env:PNPM_CLI_PATH -and (Test-Path -LiteralPath $env:PNPM_CLI_PATH)){ & node $env:PNPM_CLI_PATH @PnpmArgs; exit $LASTEXITCODE }
throw 'Install pnpm 11.25.0 using https://pnpm.io/installation, or set PNPM_CLI_PATH locally to an existing pnpm CLI. No machine-specific paths are stored in this repository.'
