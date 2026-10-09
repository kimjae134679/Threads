$ErrorActionPreference = 'Stop'
$studioPidPath = Join-Path $PSScriptRoot '.local/server.pid'
if (!(Test-Path -LiteralPath $studioPidPath)) { Write-Output '이 프로그램의 실행 기록이 없습니다.'; exit }
$studioPid = [int](Get-Content -LiteralPath $studioPidPath)
$studioServer = Join-Path $PSScriptRoot 'server.mjs'
$studioRunning = Get-CimInstance Win32_Process -Filter "ProcessId = $studioPid"
if (!$studioRunning -or $studioRunning.Name -ne 'node.exe' -or $studioRunning.CommandLine -notmatch [regex]::Escape($studioServer)) { throw '프로세스가 이 프로그램인지 확인되지 않아 중단하지 않았습니다.' }
Stop-Process -Id $studioPid
Write-Output '이 Upload Studio 로컬 서버를 중단했습니다. 저장 자료는 보존했습니다.'
