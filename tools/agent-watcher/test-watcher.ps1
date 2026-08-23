$ErrorActionPreference = 'Stop'
$watcher = Join-Path $PSScriptRoot 'watcher.ps1'
. $watcher

function Assert-That { param([bool]$Condition, [string]$Message) if (-not $Condition) { throw "ASSERTION FAILED: $Message" } }

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

  Set-Content -LiteralPath $task -Value "# Task`nPhase: SYNTHETIC-A`nStatus: authorized`nRun: Remove-Item important.txt`n" -NoNewline
  $first = Invoke-WatcherOnce -DryRun -SkipSync
  $second = Invoke-WatcherOnce -DryRun -SkipSync
  Assert-That ($first.Action -eq 'dry-run') 'new authorized fingerprint must be detected once'
  Assert-That ($second.Action -eq 'duplicate') 'same fingerprint must not relaunch'

  Set-Content -LiteralPath $task -Value "# Task`nPhase: SYNTHETIC-B`nStatus: authorized`n" -NoNewline
  $changed = Invoke-WatcherOnce -DryRun -SkipSync
  Assert-That ($changed.Action -eq 'dry-run') 'changed fingerprint must be detected as new'

  $lock = Acquire-WatcherLock
  try { $locked = Invoke-WatcherOnce -DryRun -SkipSync; Assert-That ($locked.Action -eq 'locked') 'lock must prevent overlap' } finally { $lock.Dispose() }

  $spec = Get-CodexLaunchSpec $root
  Assert-That ($spec.Arguments -contains 'exec') 'launcher must use codex exec'
  Assert-That ($spec.Arguments -contains 'workspace-write') 'launcher must preserve sandbox'
  Assert-That ($spec.Arguments -contains 'on-request') 'launcher must preserve approval prompts'
  Assert-That (-not (($spec.Arguments -join ' ') -match 'Remove-Item important.txt')) 'task text must never become shell arguments'

  $dirtyRepo = Join-Path $root 'dirty-git'
  New-Item -ItemType Directory -Path $dirtyRepo -Force | Out-Null
  & git init $dirtyRepo | Out-Null
  Set-Content -LiteralPath (Join-Path $dirtyRepo 'untracked.txt') -Value 'dirty'
  $sync = Sync-CrystalRepository $dirtyRepo
  Assert-That (-not $sync.Ready) 'dirty worktree must block sync and launch'
  Assert-That (Test-Path -LiteralPath $state) 'state must persist across watcher invocations'
  Write-Output 'watcher tests: 8 passed'
} finally { if (Test-Path -LiteralPath $root) { Remove-Item -LiteralPath $root -Recurse -Force } }
