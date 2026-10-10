param(
  [ValidateSet('all','hold','discard')][string]$Filter='all',
  [switch]$CheckOnly
)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new()
$controller='D:\A_KJ\AI\Scripts\ThreadsUploadStudio\Control.ps1'
$currentOutput=& powershell.exe -NoProfile -File $controller -Action status
if ($LASTEXITCODE -ne 0) { throw 'studio_status_failed' }
$current=$currentOutput | ConvertFrom-Json
if (-not $current.healthy -or $current.foreign) { throw 'studio_open_requires_running' }
$reviewUrl='http://127.0.0.1:4387/?review='+$Filter
if (-not $CheckOnly) { Start-Process $reviewUrl }
[Console]::Out.WriteLine((@{schemaVersion=1;url=$reviewUrl;filter=$Filter;healthy=$current.healthy;pid=$current.pid;mode='read_only_navigation'} | ConvertTo-Json -Compress))
