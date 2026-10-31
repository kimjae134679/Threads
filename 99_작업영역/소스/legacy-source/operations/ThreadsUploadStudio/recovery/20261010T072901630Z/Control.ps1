param(
  [ValidateSet('status','start','stop','open')][string]$Action='status',
  [string]$StudioRoot='D:\A_KJ\AI\Workspace\Threads\upload-studio-20261009',
  [string]$MaterialRoot='D:\A_KJ\AI\Projects\Threads\자료'
)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new()
Import-Module (Join-Path $PSScriptRoot 'Lifecycle.psm1') -Force
$studioServer=Join-Path $StudioRoot 'server.mjs'
$studioPidFile=Join-Path $StudioRoot '.local/server.pid'
$studioUri='http://127.0.0.1:4387'
$studioMutex=$null; $studioLocked=$false
function Read-Studio {
  $owned=$null; $foreign=$false
  if (Test-Path -LiteralPath $studioPidFile) {
    $value=[IO.File]::ReadAllText($studioPidFile).Trim()
    $id=0
    if (![int]::TryParse($value,[ref]$id) -or $id -le 0) { throw 'invalid_pid_record' }
    $process=Get-CimInstance Win32_Process -Filter "ProcessId = $id"
    if ($process) {
      $escaped=[regex]::Escape($studioServer)
      $token=if($studioServer -match '\s'){'"'+$escaped+'"'}else{'(?:"'+$escaped+'"|'+$escaped+')'}
      $pattern='(?i)(?:^|\s)'+$token+'(?:\s|$)'
      if ($process.Name -eq 'node.exe' -and $process.CommandLine -match $pattern) { $owned=$process }
      else { $foreign=$true }
    }
  }
  $listeners=@(Get-NetTCPConnection -LocalPort 4387 -State Listen -ErrorAction SilentlyContinue)
  if ($listeners.Count -gt 0 -and (!$owned -or @($listeners.OwningProcess | Where-Object {$_ -ne $owned.ProcessId}).Count -gt 0)) { $foreign=$true }
  $healthy=$false
  if ($owned -and !$foreign -and $listeners.Count -gt 0) {
    try {
      $health=Invoke-RestMethod -Uri ($studioUri+'/api/state') -TimeoutSec 3
      $healthy=$health.mode -eq 'offline-only'
    } catch { }
  }
  [pscustomobject]@{running=($null -ne $owned);healthy=$healthy;foreign=$foreign;pid=$(if($owned){[int]$owned.ProcessId}else{$null})}
}
try {
  $StudioRoot=[IO.Path]::GetFullPath($StudioRoot)
  if (!(Test-Path -LiteralPath $studioServer) -or !(Test-Path -LiteralPath $MaterialRoot)) { throw 'studio_or_material_missing' }
  if ($Action -ne 'status') {
    $studioMutex=New-Object Threading.Mutex($false,'Local\ThreadsUploadStudio4387Control')
    try {$studioLocked=$studioMutex.WaitOne(0)} catch [Threading.AbandonedMutexException] {$studioLocked=$true}
    if (!$studioLocked) { throw 'control_action_busy' }
  }
  $runtime=@{
    Read={Read-Studio}
    Spawn={
      $node=(Get-Command node -ErrorAction Stop).Source
      $major=& $node -p "Number(process.versions.node.split('.')[0])"
      if ([int]$major -lt 24) { throw 'node_24_required' }
      $line='"'+$node+'" "'+$studioServer+'" --material-root "'+$MaterialRoot+'"'
      # WMI owns the spawned service, outside ControlTower's finite command Job Object.
      $startup=New-CimInstance -ClassName Win32_ProcessStartup -ClientOnly -Property @{ShowWindow=[uint16]0}
      $created=Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{CommandLine=$line;CurrentDirectory=$StudioRoot;ProcessStartupInformation=$startup}
      if ($created.ReturnValue -ne 0 -or !$created.ProcessId) { throw 'server_spawn_failed' }
      return [int]$created.ProcessId
    }
    Save={param($value)
      [IO.Directory]::CreateDirectory((Split-Path $studioPidFile)) | Out-Null
      [IO.File]::WriteAllText($studioPidFile,[string]$value)
    }
    Stop={param($value)
      $current=Read-Studio
      if ($current.foreign -or !$current.running -or $current.pid -ne $value) { throw 'stop_owner_changed' }
      Stop-Process -Id $value -ErrorAction Stop
    }
    Clear={if(Test-Path -LiteralPath $studioPidFile){Remove-Item -LiteralPath $studioPidFile}}
    Open={
      $opened=Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{CommandLine=('explorer.exe '+$studioUri);CurrentDirectory=$StudioRoot}
      if ($opened.ReturnValue -ne 0) { throw 'browser_open_failed' }
    }
    Wait={Start-Sleep -Milliseconds 300}
  }
  $state=Invoke-StudioLifecycle $Action $runtime
  $label=if($state.foreign){'실행 주체 확인 필요'}elseif($state.healthy){'켜짐'}elseif($state.running){'응답 확인 필요'}else{'꺼짐'}
  [Console]::Out.WriteLine((@{schemaVersion=1;checkedAt=[DateTimeOffset]::UtcNow.ToString('o');action=$Action;running=$state.running;healthy=$state.healthy;foreign=$state.foreign;pid=$state.pid;stateLabel=$label;url=$studioUri;error=$null} | ConvertTo-Json -Compress))
} catch {
  $code=$_.Exception.Message
  if ($code -notmatch '^[a-z_]+$') {$code='control_failed'}
  [Console]::Out.WriteLine((@{schemaVersion=1;checkedAt=[DateTimeOffset]::UtcNow.ToString('o');action=$Action;error=$code} | ConvertTo-Json -Compress))
  exit 1
} finally {if($studioLocked){$studioMutex.ReleaseMutex()};if($studioMutex){$studioMutex.Dispose()}}
