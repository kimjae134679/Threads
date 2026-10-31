param([ValidateSet('all','hold','discard')][string]$Filter='all',[switch]$CheckOnly)
$ErrorActionPreference='Stop'
$result=& (Join-Path $PSScriptRoot 'Control.ps1') -Action status
if ($LASTEXITCODE -ne 0) { throw 'studio_status_failed' }
$current=$result | ConvertFrom-Json
if (!$current.healthy -or $current.foreign) { throw 'studio_open_requires_running' }
$url='http://127.0.0.1:4387/?review='+$Filter
if (!$CheckOnly) { & (Join-Path $PSScriptRoot 'Control.ps1') -Action open -Route ('/?review='+$Filter);if($LASTEXITCODE -ne 0){throw 'review_open_failed'} }
[Console]::Out.WriteLine((@{url=$url;mode='offline_navigation'} | ConvertTo-Json -Compress))
