param([Parameter(Mandatory=$true)][string]$요청파일)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.Encoding]::UTF8
$programPath='D:\A_KJ\AI\Applications\ThreadsProduction\0.3.38-cover.20261009.10\Threads Cut Editor.exe'
$materialPath='D:\A_KJ\AI\Projects\Threads\자료'
$requestPath=(Resolve-Path -LiteralPath $요청파일).Path
$request=Get-Content -LiteralPath $requestPath -Encoding UTF8 -Raw | ConvertFrom-Json
if($request.schema -ne 'threads-existing-cover-reproduction-v1' -or @($request.rows).Count -ne 1){throw '한 글의 기존 표지 제작 요청이 필요합니다.'}
if([IO.Path]::GetFullPath($request.sourceRoot) -ne [IO.Path]::GetFullPath($materialPath)){throw '승인된 Threads 자료 폴더만 사용합니다.'}
if(-not $request.rows[0].generatedCover){throw '대응 이미지가 없어 제작 대기합니다. 글씨형 대체는 만들지 않습니다.'}
if(Test-Path -LiteralPath (Join-Path $materialPath 'review-canonical-writer.lock')){throw '자료를 읽거나 쓰는 작업이 있어 이번 실행을 보류합니다. 잠금을 삭제하지 않습니다.'}
if(Test-Path -LiteralPath (Join-Path $request.work 'reproduction.lock')){throw '동일 제작 작업이 실행 중입니다. 중복 실행하지 않습니다.'}
if(-not (Test-Path -LiteralPath $programPath)){throw '검증된 제작 프로그램이 없습니다.'}
$worker=Start-Process -FilePath $programPath -ArgumentList ('--cover-reproduction-request="'+$requestPath+'"'),'--background-worker' -WindowStyle Hidden -PassThru
$worker.WaitForExit()
$progressPath=Join-Path $request.work 'progress.json'
if(-not (Test-Path -LiteralPath $progressPath)){throw '완료 체크포인트가 없습니다. 현재 결과에 등록하지 않습니다.'}
$progress=Get-Content -LiteralPath $progressPath -Encoding UTF8 -Raw | ConvertFrom-Json
$requestHash=(Get-FileHash -LiteralPath $requestPath -Algorithm SHA256).Hash.ToLowerInvariant()
if($progress.requestSha256 -ne $requestHash -or -not $progress.runtime.packaged -or $progress.runtime.version -ne '0.3.38-cover.20261009.10'){throw '요청 해시 또는 실제 설치 런타임이 다릅니다. 이전 완료 기록을 재사용하지 않습니다.'}
if($worker.ExitCode -ne 0 -or $progress.state -ne 'complete' -or @($progress.completed).Count -ne 1){$progress | ConvertTo-Json -Depth 15;throw '제작이 보류되었거나 실패했습니다. 현재 결과에 등록하지 않습니다.'}
$progress | ConvertTo-Json -Depth 15
'제작 완료. 체크포인트와 실제 출력 해시를 확인한 뒤 canonical writer로 현재 결과에 등록하세요.'
