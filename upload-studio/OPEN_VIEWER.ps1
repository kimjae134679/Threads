param([switch]$CheckOnly)
$ErrorActionPreference='Stop'
$result=& (Join-Path $PSScriptRoot 'Control.ps1') -Action status
if ($LASTEXITCODE -ne 0) { throw 'studio_status_failed' }
$current=$result | ConvertFrom-Json
if (!$current.healthy -or $current.foreign) { throw 'studio_open_requires_running' }
$navigation=Invoke-RestMethod -Uri 'http://127.0.0.1:4387/api/navigation'
if (!$navigation.available -or $navigation.url -ne '/viewer/') { throw 'viewer_unavailable' }
if (!$CheckOnly) { & (Join-Path $PSScriptRoot 'Control.ps1') -Action open -Route '/viewer/';if($LASTEXITCODE -ne 0){throw 'viewer_open_failed'} }
[Console]::Out.WriteLine('{"url":"/viewer/","mode":"offline_navigation"}')
