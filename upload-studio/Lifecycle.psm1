function Test-StudioOwner($Process, $Record, $ProjectRoot, $NativeExe, $ServerScript) {
  if (!$Process -or !$Process.CommandLine) { return $false }
  $root=[IO.Path]::GetFullPath($ProjectRoot)
  $escaped=[regex]::Escape($root)
  $rootToken='(?i)(?:^|\s)--project-root(?:\s+|=)(?:"'+$escaped+'"|'+$escaped+')(?=\s|$)'
  if ($Process.CommandLine -notmatch $rootToken) { return $false }
  $isNative=$Record -isnot [int] -and $Record -isnot [long]
  if ($isNative) {
    if ($Record.schema -ne 1 -or $Record.mode -ne 'native-unified' -or $Record.pid -ne $Process.ProcessId -or $Record.projectRoot -ine $root -or $Record.executable -ine $NativeExe) { return $false }
  } elseif ($Record -ne $Process.ProcessId -or $Record -le 0) { return $false }
  if ($NativeExe -and $Process.ExecutablePath -ieq $NativeExe) { return $Process.Name -ieq [IO.Path]::GetFileName($NativeExe) }
  if ($isNative) { return $false }
  $script=[regex]::Escape($ServerScript)
  return $Process.Name -ieq 'node.exe' -and $Process.CommandLine -match ('(?i)(?:^|\s)(?:"'+$script+'"|'+$script+')(?=\s|$)')
}
function Invoke-StudioLifecycle($Action, $Runtime) {
  $state = & $Runtime.Read
  if ($Action -eq 'status') { return $state }
  if ($state.foreign) { throw 'process_identity_unconfirmed' }
  switch ($Action) {
    'start' {
      if ($state.running) {
        if (!$state.healthy) { throw 'owned_server_unhealthy' }
        return $state
      }
      $created = & $Runtime.Spawn
      & $Runtime.Save $created
      try {
        for ($attempt=0; $attempt -lt 20; $attempt++) {
          $state = & $Runtime.Read
          if ($state.foreign) { throw 'startup_identity_unconfirmed' }
          if ($state.running -and $state.healthy -and $state.pid -eq $created) { return $state }
          & $Runtime.Wait
        }
        throw 'startup_timeout'
      } catch {
        $failed = & $Runtime.Read
        if ($failed.running -and !$failed.foreign -and $failed.pid -eq $created) {
          & $Runtime.Stop $created
          & $Runtime.Clear
        }
        throw
      }
    }
    'stop' {
      if (!$state.running) { & $Runtime.Clear; return $state }
      & $Runtime.Stop $state.pid
      for ($attempt=0; $attempt -lt 20; $attempt++) {
        $state = & $Runtime.Read
        if ($state.foreign) { throw 'stop_identity_unconfirmed' }
        if (!$state.running) { & $Runtime.Clear; return $state }
        & $Runtime.Wait
      }
      throw 'stop_timeout'
    }
    'open' {
      if (!$state.running -or !$state.healthy) { throw 'start_studio_first' }
      & $Runtime.Open
      return $state
    }
    default { throw 'unknown_action' }
  }
}
Export-ModuleMember -Function Invoke-StudioLifecycle,Test-StudioOwner
