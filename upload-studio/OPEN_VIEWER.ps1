$ErrorActionPreference = 'Stop'
$controller = 'D:\A_KJ\AI\Scripts\ThreadsUploadStudio\Control.ps1'
$current = (& $controller -Action status | ConvertFrom-Json)
if (-not $current.healthy -or $current.foreign) { throw '검토 앱 켜기를 먼저 실행하세요.' }
$navigation = Invoke-RestMethod -Uri 'http://127.0.0.1:4387/api/navigation'
if (-not $navigation.available -or $navigation.url -ne '/viewer/') { throw '현재 전체 보기 자료의 연결을 확인하세요.' }
Start-Process 'http://127.0.0.1:4387/viewer/'
