$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'watcher.ps1')

function Assert-That { param([bool]$Condition, [string]$Message) if (-not $Condition) { throw "ASSERTION FAILED: $Message" } }
function Invoke-TestGit { param([Parameter(ValueFromRemainingArguments = $true)][object[]]$Arguments) & (Resolve-GitExecutable) @Arguments; if ($LASTEXITCODE -ne 0) { throw "test git failed: $($Arguments -join ' ')" } }
function Set-SyntheticTask { param([string]$Phase) [IO.File]::WriteAllText($script:TaskFilePath, "# Task`nPhase: $Phase`nStatus: authorized`n") }
function Commit-All { param([string]$Message = 'synthetic') Invoke-TestGit @('-C', $RepoPath, 'add', '-A') | Out-Null; Invoke-TestGit @('-C', $RepoPath, 'commit', '-m', $Message, '--quiet') | Out-Null }
function Reset-SyntheticRepo {
  Invoke-TestGit @('-C', $RepoPath, 'reset', '--hard', $script:BaselineCommit, '--quiet') | Out-Null
  Invoke-TestGit @('-C', $RepoPath, 'clean', '-fd', '--quiet') | Out-Null
  if (Test-Path -LiteralPath $StatePath) { Remove-Item -LiteralPath $StatePath -Force }
  $script:SyntheticMode = 'exit0'; $script:ObservedRecoveryPrompt = $null
}

Set-Item -Path Function:Start-CodexExecution -Value {
  param([string]$Repository, [switch]$DryRun, [switch]$FinalizationRecovery)
  if ($DryRun) { return [pscustomobject]@{ DryRun = $true } }
  if ($FinalizationRecovery) { $script:ObservedRecoveryPrompt = (Get-CodexLaunchSpec $Repository -FinalizationRecovery).Arguments[-1] }
  switch ($script:SyntheticMode) {
    'leave-dirty' { [IO.File]::WriteAllText((Join-Path $Repository 'phase-output.txt'), 'valid existing work'); return [pscustomobject]@{ Started = $true; ExitCode = 0 } }
    'recover-success' {
      $phase = (Read-TaskDescriptor $script:TaskFilePath).Phase
      New-Item -ItemType Directory -Path (Join-Path $Repository 'outputs') -Force | Out-Null
      [IO.File]::WriteAllText((Join-Path $Repository 'outputs\GPT_HANDOFF.json'), ('{{"phase":"{0}","status":"completed"}}' -f $phase))
      Commit-All 'synthetic finalization'
      return [pscustomobject]@{ Started = $true; ExitCode = 0 }
    }
    'recovery-fail' { return [pscustomobject]@{ Started = $true; ExitCode = 7 } }
    default { return [pscustomobject]@{ Started = $true; ExitCode = 0 } }
  }
}

$root = Join-Path ([IO.Path]::GetTempPath()) ('crystal-watcher-test-' + [Guid]::NewGuid().ToString('N'))
$RepoPath = Join-Path $root 'repo'; $StatePath = Join-Path $root 'state.json'; $LogPath = Join-Path $root 'watcher.log'; $TaskFilePath = Join-Path $root 'GPT_NEXT_TASK.md'
New-Item -ItemType Directory -Path $RepoPath -Force | Out-Null
try {
  Invoke-TestGit @('init', $RepoPath, '--quiet') | Out-Null
  Invoke-TestGit @('-C', $RepoPath, 'config', 'user.email', 'watcher-test@example.invalid') | Out-Null
  Invoke-TestGit @('-C', $RepoPath, 'config', 'user.name', 'Watcher Test') | Out-Null
  [IO.File]::WriteAllText((Join-Path $RepoPath 'baseline.txt'), 'baseline')
  Commit-All 'baseline'
  $script:BaselineCommit = Get-HeadCommit $RepoPath

  # Clean baseline remains mandatory; unknown/pre-existing dirt never launches.
  Set-SyntheticTask 'DIRTY-FIRST'; [IO.File]::WriteAllText((Join-Path $RepoPath 'unknown.txt'), 'unknown')
  Assert-That ((Invoke-WatcherOnce -SkipSync).Action -eq 'blocked') 'first launch must require a clean worktree'
  Assert-That (-not (Get-JsonState).launchBaselineClean) 'pre-existing dirty baseline must not become trusted finalization state'

  # Exact observed dirty state enters fixed-prompt recovery and clears state after verified clean completion.
  Reset-SyntheticRepo; Set-SyntheticTask 'FINALIZE-OK'; $script:SyntheticMode = 'leave-dirty'
  $pending = Invoke-WatcherOnce -SkipSync
  Assert-That ($pending.Action -eq 'finalization-pending') 'exit 0 plus observed dirty state must become finalization-pending'
  $pendingState = Get-JsonState
  Assert-That ($pendingState.launchBaselineClean -and $pendingState.launchBaselineCommit) 'clean baseline marker and commit must persist'
  Assert-That (@($pendingState.observedPostRunDirtySnapshot).Count -eq 1) 'exact post-run dirty snapshot must persist'
  $script:SyntheticMode = 'recover-success'; $pendingState.retryAfterUtc = [DateTime]::UtcNow.AddSeconds(-1).ToString('o'); Save-JsonState $pendingState
  $completed = Invoke-WatcherOnce -SkipSync
  Assert-That ($completed.Action -eq 'completed') "successful recovery plus handoff and clean tree must complete (got $($completed.Action): $($completed.Reason))"
  Assert-That ((Get-JsonState).finalizationFingerprint -eq '') 'successful clean completion must clear finalization state'
  Assert-That ($script:ObservedRecoveryPrompt -match 'Preserve valid existing work' -and $script:ObservedRecoveryPrompt -match [regex]::Escape('C:\Program Files\Git\cmd\git.exe')) 'recovery prompt must be fixed watcher-owned preservation text with full Git path'

  # Any change or broadening after observation blocks.
  Reset-SyntheticRepo; Set-SyntheticTask 'CHANGED-SET'; $script:SyntheticMode = 'leave-dirty'; $p = Invoke-WatcherOnce -SkipSync
  [IO.File]::WriteAllText((Join-Path $RepoPath 'phase-output.txt'), 'changed afterward')
  $s = Get-JsonState; $s.retryAfterUtc = [DateTime]::UtcNow.AddSeconds(-1).ToString('o'); Save-JsonState $s
  Assert-That ((Invoke-WatcherOnce -SkipSync).Action -eq 'blocked') 'content change after observation must block'

  Reset-SyntheticRepo; Set-SyntheticTask 'BROADENED-SET'; $script:SyntheticMode = 'leave-dirty'; $null = Invoke-WatcherOnce -SkipSync
  [IO.File]::WriteAllText((Join-Path $RepoPath 'extra.txt'), 'extra')
  $s = Get-JsonState; $s.retryAfterUtc = [DateTime]::UtcNow.AddSeconds(-1).ToString('o'); Save-JsonState $s
  Assert-That ((Invoke-WatcherOnce -SkipSync).Action -eq 'blocked') 'broadened dirty set must block'

  Reset-SyntheticRepo; Set-SyntheticTask 'ORIGINAL-FINGERPRINT'; $script:SyntheticMode = 'leave-dirty'; $null = Invoke-WatcherOnce -SkipSync
  Set-SyntheticTask 'DIFFERENT-FINGERPRINT'
  Assert-That ((Invoke-WatcherOnce -SkipSync).Action -eq 'blocked') 'different fingerprint must not inherit observed dirty state'

  # Failed recovery respects five-minute backoff and the two-retry ceiling.
  Reset-SyntheticRepo; Set-SyntheticTask 'RECOVERY-RETRIES'; $script:SyntheticMode = 'leave-dirty'; $null = Invoke-WatcherOnce -SkipSync
  Assert-That ((Invoke-WatcherOnce -SkipSync).Action -eq 'backoff') 'finalization must respect at least five-minute backoff'
  $script:SyntheticMode = 'recovery-fail'
  foreach ($attempt in 1..2) {
    $s = Get-JsonState; $s.retryAfterUtc = [DateTime]::UtcNow.AddSeconds(-1).ToString('o'); Save-JsonState $s
    Assert-That ((Invoke-WatcherOnce -SkipSync).Action -eq 'failed') "recovery retry $attempt must report failure"
  }
  Assert-That ((Invoke-WatcherOnce -SkipSync).Action -eq 'blocked-retry-limit') 'failed recovery must block at max retry 2'

  # Launch contract, lock, and log cap remain unchanged.
  $normalSpec = Get-CodexLaunchSpec $RepoPath; $recoverySpec = Get-CodexLaunchSpec $RepoPath -FinalizationRecovery
  Assert-That ($normalSpec.Arguments -contains 'workspace-write' -and $normalSpec.Arguments -contains 'on-request') 'sandbox and approval behavior must remain unchanged'
  Assert-That ($normalSpec.Arguments[-1] -ne $recoverySpec.Arguments[-1]) 'recovery must use a dedicated fixed prompt'
  $lock = Acquire-WatcherLock; try { Assert-That ((Invoke-WatcherOnce -DryRun -SkipSync).Action -eq 'locked') 'watcher lock must prevent overlap' } finally { $lock.Dispose() }
  $LogPath = Join-Path $root 'bounded.log'; $MaxLogBytes = 1024; 1..200 | ForEach-Object { Write-WatcherLog ('x' * 100) }
  Assert-That (((Get-ChildItem $root -Filter 'bounded.log*' | Measure-Object Length -Sum).Sum) -le 2400) 'log cap must remain bounded near two active chunks'

  # Clean polling synchronizes before fingerprint decisions, so a completed local task cannot hide a new remote task.
  Reset-SyntheticRepo; Set-SyntheticTask 'COMPLETED-LOCAL'
  $old = Read-TaskDescriptor $script:TaskFilePath; $s = Get-JsonState; $s.lastCompletedFingerprint = $old.Fingerprint; Save-JsonState $s
  $script:SyncCallCount = 0
  Set-Item -Path Function:Sync-CrystalRepository -Value {
    param([string]$Repository)
    $script:SyncCallCount += 1; Set-SyntheticTask 'NEW-REMOTE-AUTHORIZED'
    return [pscustomobject]@{ Ready = $true; Reason = 'synthetic sync' }
  }
  $newTask = Invoke-WatcherOnce -DryRun
  Assert-That ($newTask.Action -eq 'dry-run' -and $newTask.Phase -eq 'NEW-REMOTE-AUTHORIZED') 'sync must expose and launch-check the new authorized task before duplicate evaluation'
  Assert-That ($script:SyncCallCount -eq 1) 'clean cycle must sync before deciding the completed local fingerprint'

  # An unchanged completed task still skips, but only after synchronization.
  Reset-SyntheticRepo; Set-SyntheticTask 'COMPLETED-UNCHANGED'
  $old = Read-TaskDescriptor $script:TaskFilePath; $s = Get-JsonState; $s.lastCompletedFingerprint = $old.Fingerprint; Save-JsonState $s
  $script:SyncCallCount = 0
  Set-Item -Path Function:Sync-CrystalRepository -Value { param([string]$Repository) $script:SyncCallCount += 1; return [pscustomobject]@{ Ready = $true; Reason = 'synthetic sync' } }
  Assert-That ((Invoke-WatcherOnce -DryRun).Action -eq 'duplicate') 'unchanged completed task must still skip after sync'
  Assert-That ($script:SyncCallCount -eq 1) 'duplicate decision must follow clean synchronization'

  # Dirty state remains fail-safe and must not call sync; non-fast-forward remains blocked.
  Reset-SyntheticRepo; Set-SyntheticTask 'DIRTY-NO-SYNC'; [IO.File]::WriteAllText((Join-Path $RepoPath 'unknown.txt'), 'unknown')
  $script:SyncCallCount = 0
  Set-Item -Path Function:Sync-CrystalRepository -Value { param([string]$Repository) $script:SyncCallCount += 1; return [pscustomobject]@{ Ready = $true; Reason = 'unexpected' } }
  Assert-That ((Invoke-WatcherOnce -DryRun).Action -eq 'blocked') 'dirty worktree must remain blocked'
  Assert-That ($script:SyncCallCount -eq 0) 'dirty worktree must not fetch or merge'

  Reset-SyntheticRepo; Set-SyntheticTask 'NON-FF'
  Set-Item -Path Function:Sync-CrystalRepository -Value { param([string]$Repository) return [pscustomobject]@{ Ready = $false; Reason = 'fast-forward-only sync failed; refusing to launch' } }
  $nonFf = Invoke-WatcherOnce -DryRun
  Assert-That ($nonFf.Action -eq 'blocked' -and $nonFf.Reason -match 'fast-forward-only') 'non-fast-forward sync must remain blocked'

  # Controller presentation: live PID wins over stale backoff/blocked, then terminal states apply.
  . (Join-Path $PSScriptRoot 'controller.ps1') -RepoPath $RepoPath -TestMode
  New-Item -ItemType Directory -Path (Join-Path $RepoPath '.agent-state') -Force | Out-Null
  $script:pollProcess = [pscustomobject]@{ HasExited = $false; Id = 42 }; $script:pollStartedAt = [DateTime]::UtcNow.AddSeconds(-3)
  [IO.File]::WriteAllText((Join-Path $RepoPath '.agent-state\watcher-state.json'), '{"retryCount":1,"retryAfterUtc":"2099-01-01T00:00:00Z","blockedFingerprint":"x","lastRunStatus":"failed"}')
  Assert-That ((Get-SessionStatusText) -match 'STATE: RUNNING') 'live tracked process must display RUNNING, not BACKOFF'
  $script:pollProcess = [pscustomobject]@{ HasExited = $true; Id = 42 }
  Assert-That ((Get-SessionStatusText) -match 'STATE: BACKOFF') 'after exit retry waiting must display BACKOFF'
  [IO.File]::WriteAllText((Join-Path $RepoPath '.agent-state\watcher-state.json'), '{"retryCount":0,"retryAfterUtc":"","blockedFingerprint":"","lastRunStatus":"completed"}')
  Assert-That ((Get-SessionStatusText) -match 'STATE: COMPLETED') 'verified terminal state must display COMPLETED'
  [IO.File]::WriteAllText((Join-Path $RepoPath '.agent-state\watcher-state.json'), '{"retryCount":2,"retryAfterUtc":"","blockedFingerprint":"x","lastRunStatus":"failed"}')
  Assert-That ((Get-SessionStatusText) -match 'STATE: BLOCKED') 'unsafe terminal state must display BLOCKED'

  Write-Output 'watcher/controller tests: 17 scenarios passed'
} finally {
  if (Test-Path -LiteralPath $root) { Remove-Item -LiteralPath $root -Recurse -Force }
}
