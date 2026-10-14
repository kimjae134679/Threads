param([int]$ExpectedProcessId,[string]$ProofPath)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new()
$exe='D:\A_KJ\AI\Applications\AIControlTower\versions\0.9.18-20261010-server-ui\AIControlTower.exe'
$statusPath='D:\A_KJ\AI\ControlTowerData\manual-control\manual-control-status.json'
$expectedHash='3db1935fa22d8a9db4750f1916666d73462768ee870dc877f6556a03a20d9522'
$phase='waiting_idle';$idleSamples=0
function Record($phase,$reason,$id) {
  $record=@{schemaVersion=1;checkedAt=[DateTimeOffset]::UtcNow.ToString('o');phase=$phase;reason=$reason;expectedProcessId=$ExpectedProcessId;newProcessId=$id;forceTermination=$false}
  $temp=$ProofPath+'.tmp';[IO.File]::WriteAllText($temp,($record | ConvertTo-Json -Compress));Move-Item -LiteralPath $temp -Destination $ProofPath -Force
}
try {
  if(!$ExpectedProcessId -or ![IO.Path]::IsPathFullyQualified($ProofPath)){throw 'invalid_request'}
  if((Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash -ine $expectedHash){throw 'identity_changed'}
  Record 'waiting_idle' 'current_owned_work_preserved' $null
  $deadline=[DateTimeOffset]::UtcNow.AddMinutes(30)
  while([DateTimeOffset]::UtcNow -lt $deadline) {
    $owner=Get-CimInstance Win32_Process -Filter "ProcessId = $ExpectedProcessId"
    if(!$owner){$phase='owner_exited';break}
    if($owner.ExecutablePath -ine $exe -or $owner.CommandLine -notmatch '(?:^|\s)--manual-control(?:\s|$)'){throw 'owner_changed'}
    $status=Get-Content -LiteralPath $statusPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $fresh=$status.processId -eq $ExpectedProcessId -and $status.mode -eq 'manual-control' -and ([DateTimeOffset]::UtcNow-[DateTimeOffset]::Parse($status.updatedAt)).TotalSeconds -ge 0 -and ([DateTimeOffset]::UtcNow-[DateTimeOffset]::Parse($status.updatedAt)).TotalSeconds -le 10
    if($fresh -and $status.ownedJobsBusy -eq $false){$idleSamples++}else{$idleSamples=0}
    if($idleSamples -ge 2) {
      Record 'requesting_normal_exit' 'two_fresh_idle_samples' $null
      $out=$ProofPath+'.exit.json';$err=$ProofPath+'.exit.stderr'
      $client=Start-Process -FilePath $exe -ArgumentList '--request-manual-exit' -WindowStyle Hidden -RedirectStandardOutput $out -RedirectStandardError $err -PassThru
      if(!$client.WaitForExit(20000)){Record 'held' 'exit_response_unknown_no_retry' $null;exit 1}
      $result=Get-Content -LiteralPath $out -Raw -Encoding UTF8 | ConvertFrom-Json
      if($client.ExitCode -ne 0 -or $result.status -ne 'graceful_exit_accepted'){Record 'held' 'normal_exit_not_accepted_no_retry' $null;exit 1}
      for($n=0;$n -lt 20;$n++) {if(!(Get-CimInstance Win32_Process -Filter "ProcessId = $ExpectedProcessId")){break};Start-Sleep -Milliseconds 250}
      if(Get-CimInstance Win32_Process -Filter "ProcessId = $ExpectedProcessId"){throw 'old_owner_still_running'}
      $phase='owner_exited';break
    }
    Start-Sleep -Seconds 3
  }
  if($phase -ne 'owner_exited'){Record 'held' 'idle_wait_expired_no_force' $null;exit 1}
  Record 'starting_registered_app' 'old_owner_confirmed_exited' $null
  $launcher='D:\A_KJ\AI\Applications\AIControlTower\start_installed_control.ps1'
  & $launcher | Out-Null
  if($LASTEXITCODE -ne 0){throw 'installed_launcher_held'}
  for($n=0;$n -lt 40;$n++) {
    $status=Get-Content -LiteralPath $statusPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if($status.processId -ne $ExpectedProcessId -and $status.pcConnected -eq $true -and ([DateTimeOffset]::UtcNow-[DateTimeOffset]::Parse($status.updatedAt)).TotalSeconds -lt 10) {
      $new=Get-CimInstance Win32_Process -Filter "ProcessId = $($status.processId)"
      if($new -and $new.ExecutablePath -ieq $exe){Record 'restarted' 'new_owner_connected_menu_render_unverified' $status.processId;exit 0}
    }
    Start-Sleep -Seconds 1
  }
  Record 'held' 'new_owner_readiness_unconfirmed' $null;exit 1
} catch {Record 'held' 'safe_apply_failed_no_retry' $null;exit 1}
