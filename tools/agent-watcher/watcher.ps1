[CmdletBinding()]
param(
  [switch]$Once,
  [switch]$DryRun,
  [switch]$SkipSync,
  [int]$IntervalSeconds = 60,
  [string]$RepoPath = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)),
  [string]$StatePath = '',
  [string]$LogPath = '',
  [string]$TaskFilePath = '',
  [int]$MaxAutomaticRetries = 2,
  [int]$MaxLogBytes = 2097152
)

$ErrorActionPreference = 'Stop'

function Resolve-DefaultPaths {
  param([string]$Repository)
  if (-not $script:StatePath) { $script:StatePath = Join-Path $Repository '.agent-state\watcher-state.json' }
  if (-not $script:LogPath) { $script:LogPath = Join-Path $Repository '.agent-state\watcher.log' }
  if (-not $script:TaskFilePath) { $script:TaskFilePath = Join-Path $Repository 'agent\GPT_NEXT_TASK.md' }
}

function Write-WatcherLog {
  param([string]$Message)
  $parent = Split-Path -Parent $script:LogPath
  New-Item -ItemType Directory -Path $parent -Force | Out-Null
  if ((Test-Path -LiteralPath $script:LogPath) -and (Get-Item -LiteralPath $script:LogPath).Length -ge $MaxLogBytes) {
    $archive = "$($script:LogPath).1"
    if (Test-Path -LiteralPath $archive) { Remove-Item -LiteralPath $archive -Force }
    Move-Item -LiteralPath $script:LogPath -Destination $archive
  }
  Add-Content -LiteralPath $script:LogPath -Value ("{0:o} {1}" -f [DateTime]::UtcNow, $Message)
}

function Get-TaskFingerprint {
  param([string]$Content)
  $normalized = ($Content -replace "`r`n", "`n" -replace "`r", "`n").Trim() + "`n"
  $bytes = [Text.Encoding]::UTF8.GetBytes($normalized)
  $sha = [Security.Cryptography.SHA256]::Create()
  try { return ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-', '').ToLowerInvariant() } finally { $sha.Dispose() }
}

function Read-TaskDescriptor {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "Task file not found: $Path" }
  $content = [IO.File]::ReadAllText($Path)
  $phaseMatch = [regex]::Match($content, '(?m)^Phase:\s*(?<value>[^\r\n]+)\s*$')
  $statusMatch = [regex]::Match($content, '(?m)^Status:\s*(?<value>[^\r\n]+)\s*$')
  if (-not $phaseMatch.Success -or -not $statusMatch.Success) { return [pscustomobject]@{ Phase = ''; Status = 'invalid'; Fingerprint = Get-TaskFingerprint $content; Content = $content } }
  [pscustomobject]@{
    Phase = $phaseMatch.Groups['value'].Value.Trim()
    Status = $statusMatch.Groups['value'].Value.Trim().ToLowerInvariant()
    Fingerprint = Get-TaskFingerprint $content
    Content = $content
  }
}

function Get-JsonState {
  if (-not (Test-Path -LiteralPath $script:StatePath -PathType Leaf)) {
    return [pscustomobject]@{ lastLaunchedFingerprint = ''; lastCompletedFingerprint = ''; lastPhase = ''; lastStatus = ''; lastPollAt = ''; lastRunAt = ''; lastRunStatus = ''; lastFailureFingerprint = ''; lastFailureAt = ''; retryAfterUtc = ''; retryCount = 0; blockedFingerprint = ''; launchBaselineCommit = ''; launchBaselineClean = $false; finalizationFingerprint = ''; observedPostRunCommit = ''; observedPostRunDirtySnapshot = @(); finalizationAttempted = $false; finalizationRetryCount = 0; execution_state = 'IDLE'; active_run_id = ''; active_fingerprint = ''; active_phase = ''; run_started_at_utc = ''; run_finished_at_utc = ''; process_id = 0; process_start_time_utc = ''; run_stage = ''; exit_code = $null; finalization_required = $false; finalization_started_at_utc = ''; finalization_finished_at_utc = ''; last_error_code = ''; last_error_summary = '' }
  }
  try {
    $state = [IO.File]::ReadAllText($script:StatePath) | ConvertFrom-Json
    foreach ($name in @('lastLaunchedFingerprint', 'lastCompletedFingerprint', 'lastPhase', 'lastStatus', 'lastPollAt', 'lastRunAt', 'lastRunStatus', 'lastFailureFingerprint', 'lastFailureAt', 'retryAfterUtc', 'blockedFingerprint')) {
      if ($null -eq $state.PSObject.Properties[$name]) { $state | Add-Member -NotePropertyName $name -NotePropertyValue '' }
    }
    if ($null -eq $state.PSObject.Properties['retryCount']) { $state | Add-Member -NotePropertyName retryCount -NotePropertyValue 0 }
    foreach ($name in @('launchBaselineCommit', 'finalizationFingerprint', 'observedPostRunCommit')) { if ($null -eq $state.PSObject.Properties[$name]) { $state | Add-Member -NotePropertyName $name -NotePropertyValue '' } }
    foreach ($name in @('launchBaselineClean', 'finalizationAttempted')) { if ($null -eq $state.PSObject.Properties[$name]) { $state | Add-Member -NotePropertyName $name -NotePropertyValue $false } }
    if ($null -eq $state.PSObject.Properties['finalizationRetryCount']) { $state | Add-Member -NotePropertyName finalizationRetryCount -NotePropertyValue 0 }
    if ($null -eq $state.PSObject.Properties['observedPostRunDirtySnapshot']) { $state | Add-Member -NotePropertyName observedPostRunDirtySnapshot -NotePropertyValue @() }
    foreach ($name in @('execution_state','active_run_id','active_fingerprint','active_phase','run_started_at_utc','run_finished_at_utc','process_start_time_utc','run_stage','finalization_started_at_utc','finalization_finished_at_utc','last_error_code','last_error_summary')) { if ($null -eq $state.PSObject.Properties[$name]) { $state | Add-Member -NotePropertyName $name -NotePropertyValue '' } }
    foreach ($name in @('process_id','exit_code')) { if ($null -eq $state.PSObject.Properties[$name]) { $state | Add-Member -NotePropertyName $name -NotePropertyValue 0 } }
    if ($null -eq $state.PSObject.Properties['finalization_required']) { $state | Add-Member -NotePropertyName finalization_required -NotePropertyValue $false }
    if (-not $state.execution_state) { $state.execution_state = 'IDLE' }
    return $state
  } catch { throw "Watcher state is invalid: $script:StatePath" }
}

function Save-JsonState {
  param($State)
  $parent = Split-Path -Parent $script:StatePath
  New-Item -ItemType Directory -Path $parent -Force | Out-Null
  [IO.File]::WriteAllText($script:StatePath, ($State | ConvertTo-Json -Depth 4))
}

function Set-ExecutionState {
  param($State, [string]$Value, [string]$ErrorCode = '', [string]$ErrorSummary = '')
  $previous = [string]$State.execution_state
  $State.execution_state = $Value
  if ($previous -ne $Value) { Write-WatcherLog "execution state: $Value" }
  if ($ErrorCode) { $State.last_error_code = $ErrorCode }
  if ($ErrorSummary) { $State.last_error_summary = $ErrorSummary }
}

function Test-ActiveRunProcess {
  param($State)
  if ([string]$State.execution_state -ne 'RUNNING' -or -not $State.process_id -or -not $State.process_start_time_utc) { return $false }
  try {
    $process = Get-Process -Id ([int]$State.process_id) -ErrorAction Stop
    $expected = [DateTime]::Parse([string]$State.process_start_time_utc).ToUniversalTime()
    return ([Math]::Abs(($process.StartTime.ToUniversalTime() - $expected).TotalSeconds) -lt 2)
  } catch { return $false }
}

function Get-WatcherPresentation {
  param([string]$Repository, $State)
  $task = Read-TaskDescriptor (Join-Path $Repository 'agent\GPT_NEXT_TASK.md')
  $live = Test-ActiveRunProcess $State
  $execution = [string]$State.execution_state
  if ($execution -eq 'RUNNING' -and -not $live) { $execution = if ($State.finalization_required) { 'FINALIZING' } elseif ($State.lastRunStatus -like 'completed*') { 'COMPLETED' } elseif ($State.retryAfterUtc) { 'RETRY_WAIT' } else { 'READY' } }
  [pscustomobject]@{ ExecutionState = $execution; Phase = $task.Phase; Authorized = $task.Status -eq 'authorized'; LastPollAt = $State.lastPollAt; RunStartedAtUtc = $State.run_started_at_utc; RetryAfterUtc = $State.retryAfterUtc; ErrorSummary = $State.last_error_summary; IsLive = $live }
}

function Resolve-GitExecutable {
  $preferred = 'C:\Program Files\Git\cmd\git.exe'
  if (Test-Path -LiteralPath $preferred -PathType Leaf) { return $preferred }
  $candidate = Get-Command git.exe -ErrorAction SilentlyContinue
  if ($candidate) { return $candidate.Source }
  throw 'Git executable not found; expected C:\Program Files\Git\cmd\git.exe or git.exe on PATH'
}

function Invoke-Git {
  param([Parameter(ValueFromRemainingArguments = $true)][object[]]$Arguments)
  & (Resolve-GitExecutable) @Arguments
}

function Test-WorktreeClean {
  param([string]$Repository)
  $output = Invoke-Git @('-C', $Repository, 'status', '--porcelain') 2>&1
  if ($LASTEXITCODE -ne 0) { throw "Unable to inspect Git status: $($output -join ' ')" }
  return (($output -join "`n").Trim().Length -eq 0)
}

function Get-WorktreeSnapshot {
  param([string]$Repository)
  $lines = @(Invoke-Git @('-C', $Repository, 'status', '--porcelain=v1', '-z', '--untracked-files=all') 2>&1)
  if ($LASTEXITCODE -ne 0) { throw "Unable to inspect Git status: $($lines -join ' ')" }
  $raw = $lines -join "`n"
  if (-not $raw) { return @() }
  $entries = @($raw -split "`0" | Where-Object { $_ })
  $snapshot = foreach ($entry in $entries) {
    $path = if ($entry.Length -gt 3) { $entry.Substring(3) } else { '' }
    if ($path -match ' -> ') { $path = ($path -split ' -> ', 2)[1] }
    $fullPath = Join-Path $Repository $path
    $hash = if (Test-Path -LiteralPath $fullPath -PathType Leaf) { (Get-FileHash -LiteralPath $fullPath -Algorithm SHA256).Hash.ToLowerInvariant() } else { '<absent>' }
    [pscustomobject]@{ status = $entry.Substring(0, [Math]::Min(2, $entry.Length)); path = $path; sha256 = $hash }
  }
  return @($snapshot | Sort-Object path, status)
}

function Test-SnapshotEqual {
  param($Left, $Right)
  return ((@($Left) | ConvertTo-Json -Compress -Depth 4) -eq (@($Right) | ConvertTo-Json -Compress -Depth 4))
}

function Get-HeadCommit { param([string]$Repository) return ((Invoke-Git @('-C', $Repository, 'rev-parse', 'HEAD') 2>$null).Trim()) }

function Clear-FinalizationState {
  param($State)
  $State.launchBaselineCommit = ''; $State.launchBaselineClean = $false; $State.finalizationFingerprint = ''; $State.observedPostRunCommit = ''
  $State.observedPostRunDirtySnapshot = @(); $State.finalizationAttempted = $false; $State.finalizationRetryCount = 0
}

function Sync-CrystalRepository {
  param([string]$Repository)
  if (-not (Test-WorktreeClean $Repository)) { return [pscustomobject]@{ Ready = $false; Reason = 'dirty worktree; refusing to pull or launch' } }
  Invoke-Git @('-C', $Repository, 'fetch', 'origin', 'main', '--quiet') 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { return [pscustomobject]@{ Ready = $false; Reason = 'git fetch failed' } }
  $local = (Invoke-Git @('-C', $Repository, 'rev-parse', 'HEAD') 2>$null).Trim()
  $remote = (Invoke-Git @('-C', $Repository, 'rev-parse', 'origin/main') 2>$null).Trim()
  if (-not $local -or -not $remote) { return [pscustomobject]@{ Ready = $false; Reason = 'unable to resolve local or origin/main' } }
  if ($local -ne $remote) {
    Invoke-Git @('-C', $Repository, 'merge', '--ff-only', 'origin/main') 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { return [pscustomobject]@{ Ready = $false; Reason = 'fast-forward-only sync failed; refusing to launch' } }
  }
  return [pscustomobject]@{ Ready = $true; Reason = 'clean and synchronized' }
}

function Acquire-WatcherLock {
  $parent = Split-Path -Parent $script:StatePath
  New-Item -ItemType Directory -Path $parent -Force | Out-Null
  try { return [IO.File]::Open((Join-Path $parent 'watcher.lock'), [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None) } catch { return $null }
}

function Resolve-CodexCli {
  $candidate = Get-Command codex.cmd -ErrorAction SilentlyContinue
  $wrapper = if ($candidate) { $candidate.Source } else { Join-Path $env:APPDATA 'npm\codex.cmd' }
  if (Test-Path -LiteralPath $wrapper -PathType Leaf) {
    $nativeRoot = Join-Path (Split-Path -Parent $wrapper) 'node_modules\@openai\codex\node_modules\@openai'
    $native = Get-ChildItem -LiteralPath $nativeRoot -Filter 'codex.exe' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($native) { return $native.FullName }
    return $wrapper
  }
  $fallback = Join-Path $env:APPDATA 'npm\codex.cmd'
  if (Test-Path -LiteralPath $fallback -PathType Leaf) { return $fallback }
  throw 'Codex CLI not found as codex.cmd or %APPDATA%\npm\codex.cmd'
}

function Get-CodexLaunchSpec {
  param([string]$Repository, [switch]$FinalizationRecovery)
  $cli = Resolve-CodexCli
  $prompt = if ($FinalizationRecovery) {
    'Read AGENTS.md and the current agent/GPT_NEXT_TASK.md. This is watcher-owned finalization recovery for the same authorized phase, not an initial execution. Inspect the exact existing dirty changes and stop if any dirty file is unrelated or ambiguous. Preserve valid existing work and do not redo completed analysis. Any task instruction to leave initial output uncommitted applies only to the initial execution and is now satisfied. You MUST complete only the missing validation, handoff, commit, and push work for the current phase. Use C:\Program Files\Git\cmd\git.exe if needed. Ensure the worktree is clean at the end, then stop after this phase.'
  } else {
    'Read AGENTS.md and agent/GPT_NEXT_TASK.md. Execute only the currently authorized phase. Preserve all task boundaries, publish the required GPT_HANDOFF files, push the permitted changes, then stop. Do not infer or start another phase.'
  }
  [pscustomobject]@{
    Executable = $cli
    Arguments = @('--ask-for-approval', 'on-request', 'exec', '--cd', $Repository, '--sandbox', 'workspace-write', $prompt)
  }
}

function Test-CompletedHandoff {
  param([string]$Repository, [string]$Phase)
  $handoffPath = Join-Path $Repository 'outputs\GPT_HANDOFF.json'
  if (-not (Test-Path -LiteralPath $handoffPath -PathType Leaf)) { return $false }
  try {
    $handoff = [IO.File]::ReadAllText($handoffPath) | ConvertFrom-Json
    if ($handoff.phase -ne $Phase -or $handoff.status -ne 'completed' -or -not (Test-WorktreeClean $Repository)) { return $false }
    $head = Get-HeadCommit $Repository
    if (-not $head) { return $false }
    $headHandoff = (Invoke-Git @('-C', $Repository, 'show', "$head`:outputs/GPT_HANDOFF.json") 2>$null) -join "`n"
    if ($LASTEXITCODE -ne 0 -or -not $headHandoff) { return $false }
    $committed = $headHandoff | ConvertFrom-Json
    if ($committed.phase -ne $Phase -or $committed.status -ne 'completed') { return $false }
    $remotes = @((Invoke-Git @('-C', $Repository, 'remote') 2>$null) | ForEach-Object { $_.Trim() })
    if ($remotes -contains 'origin') {
      $remote = (@(Invoke-Git @('-C', $Repository, 'rev-parse', 'origin/main') 2>$null) -join "`n").Trim()
      if (-not $remote) { return $false }
      Invoke-Git @('-C', $Repository, 'merge-base', '--is-ancestor', $head, 'origin/main') 2>$null | Out-Null
      if ($LASTEXITCODE -ne 0) { return $false }
    }
    return $true
  } catch {
    Write-WatcherLog "completion evidence unreadable: $handoffPath"
    return $false
  }
}

function Set-FailureState {
  param($State, [string]$Fingerprint)
  $now = [DateTime]::UtcNow
  if ($State.lastFailureFingerprint -eq $Fingerprint) { $State.retryCount = [int]$State.retryCount + 1 } else { $State.retryCount = 0 }
  $State.lastLaunchedFingerprint = ''
  $State.lastFailureFingerprint = $Fingerprint
  $State.lastFailureAt = $now.ToString('o')
  $State.lastRunStatus = 'failed'
  if ([int]$State.retryCount -ge $MaxAutomaticRetries) {
    $State.blockedFingerprint = $Fingerprint
    $State.retryAfterUtc = ''
  } else {
    $State.retryAfterUtc = $now.AddMinutes(5).ToString('o')
  }
}

function Test-RetryBackoff {
  param($State, [string]$Fingerprint)
  if ($State.lastFailureFingerprint -ne $Fingerprint -or -not $State.retryAfterUtc) { return $false }
  try { return ([DateTime]::Parse($State.retryAfterUtc).ToUniversalTime() -gt [DateTime]::UtcNow) } catch { return $false }
}

function Start-CodexExecution {
  param([string]$Repository, [switch]$DryRun, [switch]$FinalizationRecovery)
  $spec = Get-CodexLaunchSpec $Repository -FinalizationRecovery:$FinalizationRecovery
  $env:CODEX_HOME = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE '.codex' }
  if ($DryRun) { return [pscustomobject]@{ Started = $false; DryRun = $true; Executable = $spec.Executable; Arguments = $spec.Arguments } }
  # Start-Process joins an argument array without preserving the final prompt as one argument.
  # Quote every CLI argument before handing it to the Windows .cmd launcher.
  $argumentLine = (($spec.Arguments | ForEach-Object { '"' + ([string]$_).Replace('"', '\"') + '"' }) -join ' ')
  $runToken = [Guid]::NewGuid().ToString('N')
  $stdoutPath = Join-Path (Split-Path -Parent $script:StatePath) ("codex-$runToken.stdout.log")
  $stderrPath = Join-Path (Split-Path -Parent $script:StatePath) ("codex-$runToken.stderr.log")
  $process = Start-Process -FilePath $spec.Executable -ArgumentList $argumentLine -WorkingDirectory $Repository -WindowStyle Hidden -PassThru -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
  $process.Refresh()
  $processStartTimeUtc = $process.StartTime.ToUniversalTime().ToString('o')
  if ($script:ActiveWatcherState) {
    $script:ActiveWatcherState.process_id = $process.Id
    $script:ActiveWatcherState.process_start_time_utc = $processStartTimeUtc
    $script:ActiveWatcherState.run_stage = if ($FinalizationRecovery) { 'finalization' } else { 'execution' }
    $activeExecutionState = if ($FinalizationRecovery) { 'FINALIZING' } else { 'RUNNING' }
    Set-ExecutionState $script:ActiveWatcherState $activeExecutionState
    Save-JsonState $script:ActiveWatcherState
  }
  $process.WaitForExit()
  $process.Refresh()
  $exitCode = [int]$process.ExitCode
  $diagnostic = ''
  if (Test-Path -LiteralPath $stderrPath) {
    $diagnostic = ((Get-Content -LiteralPath $stderrPath -Tail 12 -ErrorAction SilentlyContinue) -join ' ').Trim()
    if ($diagnostic) { Write-WatcherLog "Codex output (exit $exitCode): $diagnostic" }
  }
  Remove-Item -LiteralPath $stdoutPath,$stderrPath -Force -ErrorAction SilentlyContinue
  return [pscustomobject]@{ Started = $true; ExitCode = $exitCode; ProcessId = $process.Id; ProcessStartTimeUtc = $processStartTimeUtc; Executable = $spec.Executable; Arguments = $spec.Arguments; Diagnostic = $diagnostic }
}

function Test-FinalizationEligible {
  param($State, $Task, [string]$Repository, $CurrentSnapshot)
  return ([bool]$State.launchBaselineClean -and $State.launchBaselineCommit -and
    $State.finalizationFingerprint -eq $Task.Fingerprint -and $State.lastLaunchedFingerprint -eq $Task.Fingerprint -and
    $State.observedPostRunCommit -and $State.observedPostRunCommit -eq (Get-HeadCommit $Repository) -and
    @($State.observedPostRunDirtySnapshot).Count -gt 0 -and
    (Test-SnapshotEqual -Left @($State.observedPostRunDirtySnapshot) -Right @($CurrentSnapshot)) -and
    -not (Test-CompletedHandoff $Repository $Task.Phase) -and
    [int]$State.finalizationRetryCount -lt $MaxAutomaticRetries)
}

function Invoke-WatcherOnce {
  param([switch]$DryRun, [switch]$SkipSync)
  Resolve-DefaultPaths $RepoPath
  $lock = Acquire-WatcherLock
  if (-not $lock) { Write-WatcherLog 'lock busy; skipped cycle'; return [pscustomobject]@{ Action = 'locked' } }
  try {
    $task = Read-TaskDescriptor $script:TaskFilePath
    $state = Get-JsonState
    $script:ActiveWatcherState = $state
    $currentSnapshot = @(Get-WorktreeSnapshot $RepoPath)
    $isRecovery = $false
    if ($currentSnapshot.Count -gt 0) {
      # A dirty tree is recovery-only: do not fetch over it; use its exact local fingerprint.
      $state.lastPhase = $task.Phase; $state.lastStatus = $task.Status; $state.lastPollAt = [DateTime]::UtcNow.ToString('o'); Set-ExecutionState $state 'BLOCKED'
      if ($task.Status -ne 'authorized' -or -not $task.Phase) { Save-JsonState $state; Write-WatcherLog "waiting: phase=$($task.Phase) status=$($task.Status)"; return [pscustomobject]@{ Action = 'waiting'; Phase = $task.Phase; Status = $task.Status } }
      if ($state.lastCompletedFingerprint -eq $task.Fingerprint) { Save-JsonState $state; Write-WatcherLog "duplicate completed fingerprint skipped: $($task.Fingerprint)"; return [pscustomobject]@{ Action = 'duplicate'; Fingerprint = $task.Fingerprint } }
      if ($state.blockedFingerprint -eq $task.Fingerprint) { Save-JsonState $state; Write-WatcherLog "blocked retry limit reached: phase=$($task.Phase) retryCount=$($state.retryCount)"; return [pscustomobject]@{ Action = 'blocked-retry-limit'; Fingerprint = $task.Fingerprint; RetryCount = $state.retryCount } }
      if (-not (Test-FinalizationEligible $state $task $RepoPath $currentSnapshot)) {
        Write-WatcherLog 'blocked: dirty worktree is not an exact eligible watcher-observed finalization snapshot'
        return [pscustomobject]@{ Action = 'blocked'; Reason = 'unknown or changed dirty worktree' }
      }
      if (Test-RetryBackoff $state $task.Fingerprint) { Save-JsonState $state; return [pscustomobject]@{ Action = 'backoff'; Fingerprint = $task.Fingerprint; RetryAfterUtc = $state.retryAfterUtc } }
      $isRecovery = $true
    } else {
      # Synchronize a clean tree before any fingerprint decision, then re-read the task.
      if (-not $SkipSync) {
        $sync = Sync-CrystalRepository $RepoPath
        if (-not $sync.Ready) { Set-ExecutionState $state 'BLOCKED' 'sync_failed' $sync.Reason; Save-JsonState $state; Write-WatcherLog "blocked: $($sync.Reason)"; return [pscustomobject]@{ Action = 'blocked'; Reason = $sync.Reason } }
        $task = Read-TaskDescriptor $script:TaskFilePath
      }
      $state.lastPhase = $task.Phase; $state.lastStatus = $task.Status; $state.lastPollAt = [DateTime]::UtcNow.ToString('o'); Set-ExecutionState $state 'READY'
      if ($task.Status -ne 'authorized' -or -not $task.Phase) { Save-JsonState $state; Write-WatcherLog "waiting: phase=$($task.Phase) status=$($task.Status)"; return [pscustomobject]@{ Action = 'waiting'; Phase = $task.Phase; Status = $task.Status } }
      if ($state.lastCompletedFingerprint -eq $task.Fingerprint) { Save-JsonState $state; Write-WatcherLog "duplicate completed fingerprint skipped: $($task.Fingerprint)"; return [pscustomobject]@{ Action = 'duplicate'; Fingerprint = $task.Fingerprint } }
      if ($state.blockedFingerprint -eq $task.Fingerprint) { Save-JsonState $state; Write-WatcherLog "blocked retry limit reached: phase=$($task.Phase) retryCount=$($state.retryCount)"; return [pscustomobject]@{ Action = 'blocked-retry-limit'; Fingerprint = $task.Fingerprint; RetryCount = $state.retryCount } }
    }
    if (Test-CompletedHandoff $RepoPath $task.Phase) {
      $state.lastCompletedFingerprint = $task.Fingerprint
      $state.lastLaunchedFingerprint = $task.Fingerprint
      $state.lastFailureFingerprint = ''
      $state.lastFailureAt = ''
      $state.retryAfterUtc = ''
      $state.retryCount = 0
      $state.blockedFingerprint = ''
      $state.lastRunStatus = 'completed-existing'
      Set-ExecutionState $state 'COMPLETED'
      Clear-FinalizationState $state
      Save-JsonState $state
      Write-WatcherLog "completion evidence found before launch: phase=$($task.Phase) fingerprint=$($task.Fingerprint)"
      return [pscustomobject]@{ Action = 'completed-existing'; Phase = $task.Phase; Fingerprint = $task.Fingerprint }
    }
    if (-not $isRecovery -and (Test-RetryBackoff $state $task.Fingerprint)) { Save-JsonState $state; Write-WatcherLog "retry backoff active: phase=$($task.Phase) retryAfterUtc=$($state.retryAfterUtc)"; return [pscustomobject]@{ Action = 'backoff'; Fingerprint = $task.Fingerprint; RetryAfterUtc = $state.retryAfterUtc } }
    Write-WatcherLog "authorized task detected: phase=$($task.Phase) status=$($task.Status) fingerprint=$($task.Fingerprint)"
    if (-not $isRecovery) { $state.launchBaselineCommit = Get-HeadCommit $RepoPath; $state.launchBaselineClean = $true; $state.finalizationFingerprint = ''; $state.observedPostRunDirtySnapshot = @(); $state.finalizationAttempted = $false; $state.finalizationRetryCount = 0 }
    else { $state.finalizationAttempted = $true; $state.finalizationRetryCount = [int]$state.finalizationRetryCount + 1 }
    $started = [DateTime]::UtcNow
    $state.active_run_id = "$($task.Fingerprint)-$($started.ToString('yyyyMMddHHmmssfff'))"; $state.active_fingerprint = $task.Fingerprint; $state.active_phase = $task.Phase
    $state.run_started_at_utc = $started.ToString('o'); $state.run_finished_at_utc = ''; $state.process_id = 0; $state.process_start_time_utc = ''; $state.exit_code = 0
    $state.lastLaunchedFingerprint = $task.Fingerprint; $state.lastRunAt = $started.ToString('o'); $state.lastRunStatus = 'starting'; Set-ExecutionState $state 'STARTING'; Save-JsonState $state
    $launch = Start-CodexExecution $RepoPath -DryRun:$DryRun -FinalizationRecovery:$isRecovery
    if ($launch.DryRun) {
      $state.lastLaunchedFingerprint = ''
      $state.lastRunStatus = 'dry-run'
      Save-JsonState $state
      Write-WatcherLog "dry-run launch: phase=$($task.Phase) fingerprint=$($task.Fingerprint)"
      return [pscustomobject]@{ Action = 'dry-run'; Phase = $task.Phase; Fingerprint = $task.Fingerprint; Launch = $launch }
    }
    $state.run_finished_at_utc = [DateTime]::UtcNow.ToString('o'); $state.exit_code = $launch.ExitCode; $state.process_id = 0; $state.process_start_time_utc = ''; $state.lastRunStatus = if ($launch.ExitCode -eq 0) { 'exited-0' } else { 'failed' }; Save-JsonState $state
    Write-WatcherLog "Codex exited with code $($launch.ExitCode): phase=$($task.Phase)"
    if ($launch.ExitCode -ne 0) {
      Set-FailureState $state $task.Fingerprint
      Set-ExecutionState $state 'RETRY_WAIT' 'execution_failed' "Codex exit code $($launch.ExitCode)"
      if ($isRecovery) { $state.lastLaunchedFingerprint = $task.Fingerprint }
      Save-JsonState $state
      Write-WatcherLog "Codex failure recorded: phase=$($task.Phase) retryCount=$($state.retryCount) blocked=$([bool]$state.blockedFingerprint) retryAfterUtc=$($state.retryAfterUtc)"
      return [pscustomobject]@{ Action = 'failed'; Phase = $task.Phase; Fingerprint = $task.Fingerprint; ExitCode = $launch.ExitCode }
    }
    $postRunSnapshot = @(Get-WorktreeSnapshot $RepoPath)
    if ($postRunSnapshot.Count -gt 0) {
      if (-not $isRecovery) { $state.finalizationFingerprint = $task.Fingerprint; $state.observedPostRunCommit = Get-HeadCommit $RepoPath; $state.observedPostRunDirtySnapshot = $postRunSnapshot }
      $state.finalization_required = $true; $state.finalization_started_at_utc = [DateTime]::UtcNow.ToString('o'); $state.lastLaunchedFingerprint = $task.Fingerprint
      $state.lastRunStatus = 'finalizing'; Set-ExecutionState $state 'FINALIZING'; Save-JsonState $state
      Write-WatcherLog "finalization started: phase=$($task.Phase) fingerprint=$($task.Fingerprint)"
      $finalization = Start-CodexExecution $RepoPath -FinalizationRecovery
      $state.finalization_finished_at_utc = [DateTime]::UtcNow.ToString('o'); $state.process_id = 0; $state.process_start_time_utc = ''
      if ($finalization.ExitCode -ne 0) {
        Set-FailureState $state $task.Fingerprint; Set-ExecutionState $state 'RETRY_WAIT' 'finalization_failed' "Finalizer exit code $($finalization.ExitCode)"; $state.lastRunStatus = 'finalization-failed'
        $state.lastLaunchedFingerprint = $task.Fingerprint
        Save-JsonState $state
        return [pscustomobject]@{ Action = 'finalization-failed'; Phase = $task.Phase; Fingerprint = $task.Fingerprint; ExitCode = $finalization.ExitCode }
      }
      $afterFinalization = @(Get-WorktreeSnapshot $RepoPath)
      if ($afterFinalization.Count -eq 0 -and (Test-CompletedHandoff $RepoPath $task.Phase)) {
        $state.lastCompletedFingerprint = $task.Fingerprint; $state.lastFailureFingerprint = ''; $state.lastFailureAt = ''; $state.retryAfterUtc = ''; $state.retryCount = 0; $state.blockedFingerprint = ''
        $state.lastRunStatus = 'completed'; $state.finalization_required = $false; Set-ExecutionState $state 'COMPLETED'; Clear-FinalizationState $state; Save-JsonState $state
        Write-WatcherLog "finalization verified: phase=$($task.Phase) fingerprint=$($task.Fingerprint)"
        return [pscustomobject]@{ Action = 'completed'; Phase = $task.Phase; Fingerprint = $task.Fingerprint; ExitCode = 0 }
      }
      Set-FailureState $state $task.Fingerprint; Set-ExecutionState $state 'RETRY_WAIT' 'finalization_unverified' 'Finalizer left an unverified worktree or missing completion evidence'; $state.lastRunStatus = 'finalization-failed'
      $state.lastLaunchedFingerprint = $task.Fingerprint
      Save-JsonState $state
      return [pscustomobject]@{ Action = 'finalization-failed'; Phase = $task.Phase; Fingerprint = $task.Fingerprint; DirtySnapshot = $afterFinalization }
    }
    if (-not $SkipSync) {
      $postLaunchSync = Sync-CrystalRepository $RepoPath
      if (-not $postLaunchSync.Ready) {
        Set-FailureState $state $task.Fingerprint
        Save-JsonState $state
        Write-WatcherLog "completion verification blocked: $($postLaunchSync.Reason)"
        return [pscustomobject]@{ Action = 'unverified'; Phase = $task.Phase; Fingerprint = $task.Fingerprint; Reason = $postLaunchSync.Reason }
      }
    }
    if (Test-CompletedHandoff $RepoPath $task.Phase) {
      $state.lastCompletedFingerprint = $task.Fingerprint
      $state.lastLaunchedFingerprint = $task.Fingerprint
      $state.lastFailureFingerprint = ''
      $state.lastFailureAt = ''
      $state.retryAfterUtc = ''
      $state.retryCount = 0
      $state.blockedFingerprint = ''
      $state.lastRunStatus = 'completed'
      $state.finalization_required = $false; Set-ExecutionState $state 'COMPLETED'
      Clear-FinalizationState $state
      Save-JsonState $state
      Write-WatcherLog "completion verified: phase=$($task.Phase) fingerprint=$($task.Fingerprint)"
      return [pscustomobject]@{ Action = 'completed'; Phase = $task.Phase; Fingerprint = $task.Fingerprint; ExitCode = $launch.ExitCode }
    }
    Set-FailureState $state $task.Fingerprint; Set-ExecutionState $state 'RETRY_WAIT' 'completion_unverified' 'Matching completed handoff was not verified'
    Save-JsonState $state
    Write-WatcherLog "completion evidence missing or mismatched; retryable after $($state.retryAfterUtc): phase=$($task.Phase)"
    return [pscustomobject]@{ Action = 'unverified'; Phase = $task.Phase; Fingerprint = $task.Fingerprint; ExitCode = $launch.ExitCode }
  } finally { $script:ActiveWatcherState = $null; $lock.Dispose() }
}

if ($MyInvocation.InvocationName -ne '.') {
  Resolve-DefaultPaths $RepoPath
  do { Invoke-WatcherOnce -DryRun:$DryRun -SkipSync:$SkipSync | Out-Null; if (-not $Once) { Start-Sleep -Seconds ([Math]::Max(10, $IntervalSeconds)) } } while (-not $Once)
}
