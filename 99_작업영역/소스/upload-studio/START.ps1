param([switch]$CheckOnly)
$ErrorActionPreference='Stop'
$control=Join-Path $PSScriptRoot 'Control.ps1'
& $control -Action start
if($LASTEXITCODE -ne 0){throw 'studio_start_failed'}
if (!$CheckOnly) { & $control -Action open }
