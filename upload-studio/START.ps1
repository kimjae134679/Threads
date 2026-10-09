$ErrorActionPreference = 'Stop'
$studioRoot = $PSScriptRoot
$studioNode = (Get-Command node -ErrorAction Stop).Source
$studioMajor = & $studioNode -p "Number(process.versions.node.split('.')[0])"
if ([int]$studioMajor -lt 24) { throw 'Node.js 24 이상이 필요합니다.' }
$studioData = Join-Path $studioRoot '.local'
New-Item -ItemType Directory -Path $studioData -Force | Out-Null
$studioServer = Join-Path $studioRoot 'server.mjs'
$studioOut = Join-Path $studioData 'server.out.log'
$studioErr = Join-Path $studioData 'server.err.log'
$studioProcess = Start-Process -FilePath $studioNode -ArgumentList @('"' + $studioServer + '"') -WorkingDirectory $studioRoot -WindowStyle Hidden -RedirectStandardOutput $studioOut -RedirectStandardError $studioErr -PassThru
$studioProcess.Id | Set-Content -LiteralPath (Join-Path $studioData 'server.pid')
$studioReady = $false
for ($studioTry = 0; $studioTry -lt 30; $studioTry++) {
  if ($studioProcess.HasExited) { throw '로컬 서버 시작 실패. .local/server.err.log를 확인하세요.' }
  try { $studioHealth = Invoke-RestMethod -Uri 'http://127.0.0.1:4387/api/state'; if ($studioHealth.mode -eq 'offline-only') { $studioReady = $true; break } } catch {}
  Start-Sleep -Milliseconds 200
}
if (!$studioReady) { throw '로컬 서버 준비 확인 대기. 실제 게시 요청은 보내지 않았습니다.' }
Start-Process 'http://127.0.0.1:4387'
