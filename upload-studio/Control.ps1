param(
  [ValidateSet('status','start','stop','open')][string]$Action='status',
  [string]$ProjectRoot=(Split-Path $PSScriptRoot -Parent),
  [ValidateSet('/','/materials/','/viewer/','/?review=all','/?review=hold','/?review=discard')][string]$Route='/'
)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new()
Import-Module (Join-Path $PSScriptRoot 'Lifecycle.psm1') -Force
$ProjectRoot=[IO.Path]::GetFullPath($ProjectRoot)
$StudioRoot=$PSScriptRoot
$MaterialRoot=Join-Path $ProjectRoot 'local-private/project/자료'
$studioServer=Join-Path $StudioRoot 'server.mjs'
$studioPidFile=Join-Path $ProjectRoot 'local-private/operating-studio/server.pid'
$studioUri='http://127.0.0.1:4387'
$version=(Get-Content -LiteralPath (Join-Path $ProjectRoot 'desktop/package.json') -Raw | ConvertFrom-Json).version
$nativePaths=@((Join-Path $ProjectRoot ('local-private/programs/ThreadsProduction/'+$version+'/Threads Cut Editor.exe')),(Join-Path $ProjectRoot 'desktop/dist/win-unpacked/Threads Cut Editor.exe'))
$nativeExe=$nativePaths | Where-Object {Test-Path -LiteralPath $_ -PathType Leaf} | Select-Object -First 1
$hash=[Security.Cryptography.SHA256]::Create()
$projectIdentity=([BitConverter]::ToString($hash.ComputeHash([Text.Encoding]::UTF8.GetBytes($ProjectRoot.ToLowerInvariant())))).Replace('-','').ToLowerInvariant();$hash.Dispose()
$studioMutex=$null; $studioLocked=$false
function Assert-OwnedPath($Path) {
  $full=[IO.Path]::GetFullPath($Path)
  if ($full -ine $ProjectRoot -and !$full.StartsWith($ProjectRoot+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) {throw 'owned_path_escape'}
  for($at=$full;$at;$at=Split-Path $at -Parent){if(Test-Path -LiteralPath $at){if((Get-Item -LiteralPath $at -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'owned_path_reparse'}}}
}
function Read-PidRecord {
  Assert-OwnedPath $studioPidFile
  if (!(Test-Path -LiteralPath $studioPidFile)) {return $null}
  if ((Get-Item -LiteralPath $studioPidFile).Length -gt 4096) {throw 'invalid_pid_record'}
  $raw=[IO.File]::ReadAllText($studioPidFile)
  try{$record=$raw | ConvertFrom-Json}catch{throw 'invalid_pid_record'}
  $id=if($record -is [int] -or $record -is [long]){[int]$record}else{[int]$record.pid}
  if($id -le 0){throw 'invalid_pid_record'}
  return @{id=$id;value=$record;raw=$raw}
}
function Read-Studio {
  $owned=$null; $foreign=$false; $mode=$null
  $record=Read-PidRecord
  if ($record) {
    $process=Get-CimInstance Win32_Process -Filter ("ProcessId = "+$record.id)
    if ($process) {
      $expectedNative=$nativePaths | Where-Object {$_ -ieq $process.ExecutablePath} | Select-Object -First 1
      if ($expectedNative) {Assert-OwnedPath $expectedNative}
      if (Test-StudioOwner $process $record.value $ProjectRoot $expectedNative $studioServer) { $owned=$process; $mode=if($process.Name -ieq 'node.exe'){'node'}else{'native-unified'} }
      else { $foreign=$true }
    }
  }
  $listeners=@(Get-NetTCPConnection -LocalPort 4387 -State Listen -ErrorAction SilentlyContinue)
  if ($listeners.Count -gt 0 -and (!$owned -or @($listeners.OwningProcess | Where-Object {$_ -ne $owned.ProcessId}).Count -gt 0)) { $foreign=$true }
  $healthy=$false
  if ($owned -and !$foreign -and $listeners.Count -gt 0) {
    try {
      $health=Invoke-RestMethod -Uri ($studioUri+'/api/health') -TimeoutSec 8
      $healthy=$health.mode -eq 'offline-only' -and $health.startup_state_preserved -eq $true -and $health.pid -eq $owned.ProcessId -and $health.projectIdentity -eq $projectIdentity
      if ($mode -eq 'native-unified') {$healthy=$healthy -and $health.nativeHosted -eq $true -and $health.nativeUIReady -eq $true -and $record.value.mode -eq 'native-unified'}
    } catch { }
  }
  [pscustomobject]@{running=($null -ne $owned);healthy=$healthy;foreign=$foreign;mode=$mode;pid=$(if($owned){[int]$owned.ProcessId}else{$null})}
}
try {
  $StudioRoot=[IO.Path]::GetFullPath($StudioRoot)
  if (!(Test-Path -LiteralPath $studioServer) -or !(Test-Path -LiteralPath $MaterialRoot) -or !(Test-Path -LiteralPath (Join-Path $ProjectRoot 'local-private/migration-manifest.json')) -or !(Test-Path -LiteralPath (Join-Path $ProjectRoot 'local-private/operating-studio/state.json'))) { throw 'studio_or_material_missing' }
  if ($Action -ne 'status') {
    $studioMutex=New-Object Threading.Mutex($false,'Local\ThreadsUploadStudio4387Control')
    try {$studioLocked=$studioMutex.WaitOne(0)} catch [Threading.AbandonedMutexException] {$studioLocked=$true}
    if (!$studioLocked) { throw 'control_action_busy' }
  }
  $runtime=@{
    Read={Read-Studio}
    Spawn={
      if($nativeExe){Assert-OwnedPath $nativeExe;$line='"'+$nativeExe+'" --project-root "'+$ProjectRoot+'" --native-route "'+$Route+'"'}
      else {$node=(Get-Command node -ErrorAction Stop).Source;$major=& $node -p "Number(process.versions.node.split('.')[0])";if([int]$major -lt 24){throw 'node_24_required'};$line='"'+$node+'" "'+$studioServer+'" --project-root "'+$ProjectRoot+'"'}
      # WMI owns the spawned service, outside ControlTower's finite command Job Object.
      $startup=New-CimInstance -ClassName Win32_ProcessStartup -ClientOnly -Property @{ShowWindow=[uint16]0}
      $created=Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{CommandLine=$line;CurrentDirectory=$StudioRoot;ProcessStartupInformation=$startup}
      if ($created.ReturnValue -ne 0 -or !$created.ProcessId) { throw 'server_spawn_failed' }
      return [int]$created.ProcessId
    }
    Save={param($value)
      # The native main process claims its own JSON record; do not race it with
      # the legacy integer placeholder. Its port/PID/health handshake is required.
      if($nativeExe){return}
      $existing=Read-PidRecord
      if($existing -and $existing.id -eq $value){return}
      if($existing -and (Get-CimInstance Win32_Process -Filter ("ProcessId = "+$existing.id))){throw 'pid_owner_changed'}
      Assert-OwnedPath $studioPidFile
      [IO.Directory]::CreateDirectory((Split-Path $studioPidFile)) | Out-Null
      [IO.File]::WriteAllText($studioPidFile,[string]$value)
    }
    Stop={param($value)
      $current=Read-Studio
      if ($current.foreign -or !$current.running -or $current.pid -ne $value) { throw 'stop_owner_changed' }
      if($current.mode -eq 'native-unified'){if(!(Get-Process -Id $value).CloseMainWindow()){throw 'native_close_refused'}}
      else {Stop-Process -Id $value -ErrorAction Stop}
    }
    Clear={
      $record=Read-PidRecord
      if($record){if(Get-CimInstance Win32_Process -Filter ("ProcessId = "+$record.id)){throw 'pid_owner_changed'};if([IO.File]::ReadAllText($studioPidFile) -cne $record.raw){throw 'pid_owner_changed'};Remove-Item -LiteralPath $studioPidFile}
    }
    Open={
      $current=Read-Studio
      if(!$current.healthy -or $current.foreign){throw 'open_owner_changed'}
      if($current.mode -eq 'native-unified'){$exe=(Read-PidRecord).value.executable;Assert-OwnedPath $exe;$line='"'+$exe+'" --project-root "'+$ProjectRoot+'" --native-route "'+$Route+'"'}
      else{$line='explorer.exe '+$studioUri+$Route}
      $startup=New-CimInstance -ClassName Win32_ProcessStartup -ClientOnly -Property @{ShowWindow=[uint16]0}
      $opened=Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{CommandLine=$line;CurrentDirectory=$StudioRoot;ProcessStartupInformation=$startup}
      if ($opened.ReturnValue -ne 0) { throw 'browser_open_failed' }
    }
    Wait={Start-Sleep -Milliseconds 300}
  }
  if($Action -eq 'start' -and $nativeExe){$prior=Read-Studio;if(!$prior.foreign -and $prior.running -and $prior.mode -eq 'node'){$null=Invoke-StudioLifecycle 'stop' $runtime}}
  $state=Invoke-StudioLifecycle $Action $runtime
  $label=if($state.foreign){'실행 주체 확인 필요'}elseif($state.healthy){'켜짐'}elseif($state.running){'응답 확인 필요'}else{'꺼짐'}
  Write-Output (@{schemaVersion=1;checkedAt=[DateTimeOffset]::UtcNow.ToString('o');action=$Action;running=$state.running;healthy=$state.healthy;foreign=$state.foreign;mode=$state.mode;pid=$state.pid;stateLabel=$label;url=$studioUri;error=$null} | ConvertTo-Json -Compress)
  exit 0
} catch {
  $code=$_.Exception.Message
  if ($code -notmatch '^[a-z_]+$') {$code='control_failed'}
  Write-Output (@{schemaVersion=1;checkedAt=[DateTimeOffset]::UtcNow.ToString('o');action=$Action;error=$code} | ConvertTo-Json -Compress)
  exit 1
} finally {if($studioLocked){$studioMutex.ReleaseMutex()};if($studioMutex){$studioMutex.Dispose()}}
