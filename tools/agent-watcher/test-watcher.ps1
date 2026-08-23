$ErrorActionPreference = 'Stop'
$watcher = Join-Path $PSScriptRoot 'watcher.ps1'
. $watcher

function Assert-That { param([bool]$Condition, [string]$Message) if (-not $Condition) { throw "ASSERTION FAILED: $Message" } }
function Set-SyntheticTask { param([string]$Phase) Set-Content -LiteralPath $script:TaskFilePath -Value "# Task`nPhase: $Phase`nStatus: authorized`n" -NoNewline }
function Set-LaunchExitCode {
  param([int]$ExitCode)
  Set-Item -Path Function:Start-CodexExecution -Value {
    param([string]$Repository, [switch]$DryRun)
    if ($DryRun) { return [pscustomobject]@{ Started = $false; DryRun = $true } }
    if ($script:SyntheticHandoffPhase) {
      $outputDir = Join-Path $Repository 'outputs'
      New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
      Set-Content -LiteralPath (Join-Path $outputDir 'GPT_HANDOFF.json') -Value ('{{"phase":"{0}","status":"completed"}}' -f $script:SyntheticHandoffPhase) -NoNewline
    }
    return [pscustomobject]@{ Started = $true; ExitCode = $script:SyntheticExitCode }
  }
  $script:SyntheticExitCode = $ExitCode
}

$root = Join-Path ([IO.Path]::GetTempPath()) ('crystal-watcher-test-' + [Guid]::NewGuid().ToString('N'))
$task = Join-Path $root 'GPT_NEXT_TASK.md'
$state = Join-Path $root 'state.json'
$log = Join-Path $root 'watcher.log'
New-Item -ItemType Directory -Path $root -Force | Out-Null
try {
  $RepoPath = $root; $StatePath = $state; $LogPath = $log; $TaskFilePath = $task
  Set-Content -LiteralPath $task -Value "# Task`nPhase: WAITING`nStatus: waiting`n" -NoNewline
  $waiting = Invoke-WatcherOnce -DryRun -SkipSync
  Assert-That ($waiting.Action -eq 'waiting') 'waiting task must not launch'

  Set-SyntheticTask 'SYNTHETIC-DRY-RUN'
  $dryOutcome = Invoke-WatcherOnce -DryRun -SkipSync
  $dryState = Get-JsonState
  Assert-That ($dryOutcome.Action -eq 'dry-run') 'synthetic dry-run must not invoke a business task'
  Assert-That ($dryState.lastCompletedFingerprint -eq '') 'dry-run must not mark a task completed'

  $spec = Get-CodexLaunchSpec $root
  $execIndex = [array]::IndexOf($spec.Arguments, 'exec')
  $approvalIndex = [array]::IndexOf($spec.Arguments, '--ask-for-approval')
  Assert-That ($execIndex -gt 0 -and $approvalIndex -ge 0 -and $approvalIndex -lt $execIndex) 'approval must be a global option before exec'
  Assert-That ($spec.Arguments -contains 'workspace-write') 'launcher must preserve workspace-write sandbox'
  Assert-That ($spec.Arguments -contains 'on-request') 'launcher must preserve on-request approval'
  Assert-That (-not ($spec.Arguments -contains '--no-alt-screen')) 'non-interactive launcher must not use TUI-only no-alt-screen'

  Set-SyntheticTask 'SYNTHETIC-PREFLIGHT'
  New-Item -ItemType Directory -Path (Join-Path $root 'outputs') -Force | Out-Null
  Set-Content -LiteralPath (Join-Path $root 'outputs\GPT_HANDOFF.json') -Value '{"phase":"SYNTHETIC-PREFLIGHT","status":"completed"}' -NoNewline
  $preflight = Invoke-WatcherOnce -SkipSync
  Assert-That ($preflight.Action -eq 'completed-existing') 'matching existing handoff must prevent a duplicate launch'

  Set-SyntheticTask 'SYNTHETIC-NONZERO'
  Set-LaunchExitCode 9
  $nonZero = Invoke-WatcherOnce -SkipSync
  $nonZeroState = Get-JsonState
  Assert-That ($nonZero.Action -eq 'failed') 'non-zero exit must be reported as failed'
  Assert-That ($nonZeroState.lastCompletedFingerprint -ne $nonZero.Fingerprint) 'non-zero exit must not mark completed'
  Assert-That ($nonZeroState.lastLaunchedFingerprint -eq '') 'non-zero exit must clear launched fingerprint'
  Assert-That ($nonZeroState.retryAfterUtc.Length -gt 0) 'non-zero exit must set retry backoff'

  $backoff = Invoke-WatcherOnce -SkipSync
  Assert-That ($backoff.Action -eq 'backoff') 'failed fingerprint must not rapidly retry during backoff'
  $retryState = Get-JsonState
  $retryState.retryAfterUtc = [DateTime]::UtcNow.AddSeconds(-1).ToString('o')
  Save-JsonState $retryState
  $retried = Invoke-WatcherOnce -SkipSync
  Assert-That ($retried.Action -eq 'failed') 'failed fingerprint must retry after backoff'
  $retryState = Get-JsonState
  $retryState.retryAfterUtc = [DateTime]::UtcNow.AddSeconds(-1).ToString('o')
  Save-JsonState $retryState
  $finalRetry = Invoke-WatcherOnce -SkipSync
  Assert-That ($finalRetry.Action -eq 'failed') 'second automatic retry may run after backoff'
  $blocked = Invoke-WatcherOnce -SkipSync
  Assert-That ($blocked.Action -eq 'blocked-retry-limit') 'same fingerprint must block after two automatic retries'
  Assert-That ((Get-JsonState).retryCount -eq 2) 'controller-visible retry count must stop at two'

  Set-SyntheticTask 'SYNTHETIC-ZERO-NO-HANDOFF'
  Set-LaunchExitCode 0
  $zeroNoHandoff = Invoke-WatcherOnce -SkipSync
  $zeroNoHandoffState = Get-JsonState
  Assert-That ($zeroNoHandoff.Action -eq 'unverified') 'zero exit without handoff must remain unverified'
  Assert-That ($zeroNoHandoffState.lastCompletedFingerprint -ne $zeroNoHandoff.Fingerprint) 'zero exit without matching handoff must not mark completed'

  Set-SyntheticTask 'SYNTHETIC-COMPLETED'
  $script:SyntheticHandoffPhase = 'SYNTHETIC-COMPLETED'
  $completed = Invoke-WatcherOnce -SkipSync
  $script:SyntheticHandoffPhase = ''
  $completedState = Get-JsonState
  Assert-That ($completed.Action -eq 'completed') 'matching completed handoff must mark completed'
  Assert-That ($completedState.lastCompletedFingerprint -eq $completed.Fingerprint) 'matching completed handoff must persist completion'
  $duplicate = Invoke-WatcherOnce -SkipSync
  Assert-That ($duplicate.Action -eq 'duplicate') 'completed fingerprint must never launch again'

  $lock = Acquire-WatcherLock
  try { $locked = Invoke-WatcherOnce -DryRun -SkipSync; Assert-That ($locked.Action -eq 'locked') 'lock must prevent overlap' } finally { $lock.Dispose() }

  $dirtyRepo = Join-Path $root 'dirty-git'
  New-Item -ItemType Directory -Path $dirtyRepo -Force | Out-Null
  & git init $dirtyRepo | Out-Null
  Set-Content -LiteralPath (Join-Path $dirtyRepo 'untracked.txt') -Value 'dirty'
  $sync = Sync-CrystalRepository $dirtyRepo
  Assert-That (-not $sync.Ready) 'dirty worktree must block sync and launch'
  Assert-That (Test-Path -LiteralPath $state) 'state must persist across watcher invocations'

  $LogPath = Join-Path $root 'bounded.log'; $MaxLogBytes = 1024
  1..200 | ForEach-Object { Write-WatcherLog ('synthetic log line ' + ('x' * 80)) }
  $logTotal = (Get-ChildItem -LiteralPath $root -Filter 'bounded.log*' | Measure-Object Length -Sum).Sum
  Assert-That ($logTotal -le 2300) 'active plus rotated log must remain bounded'
  Assert-That (Test-Path -LiteralPath "$LogPath.1") 'synthetic repeated logging must rotate'
  Write-Output 'watcher tests: 24 passed'
} finally {
  if (Test-Path -LiteralPath $root) { Remove-Item -LiteralPath $root -Recurse -Force }
}
