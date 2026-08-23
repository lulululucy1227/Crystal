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
    return [pscustomobject]@{ lastLaunchedFingerprint = ''; lastCompletedFingerprint = ''; lastPhase = ''; lastStatus = ''; lastPollAt = ''; lastRunAt = ''; lastRunStatus = ''; lastFailureFingerprint = ''; lastFailureAt = ''; retryAfterUtc = ''; retryCount = 0; blockedFingerprint = '' }
  }
  try {
    $state = [IO.File]::ReadAllText($script:StatePath) | ConvertFrom-Json
    foreach ($name in @('lastLaunchedFingerprint', 'lastCompletedFingerprint', 'lastPhase', 'lastStatus', 'lastPollAt', 'lastRunAt', 'lastRunStatus', 'lastFailureFingerprint', 'lastFailureAt', 'retryAfterUtc', 'blockedFingerprint')) {
      if ($null -eq $state.PSObject.Properties[$name]) { $state | Add-Member -NotePropertyName $name -NotePropertyValue '' }
    }
    if ($null -eq $state.PSObject.Properties['retryCount']) { $state | Add-Member -NotePropertyName retryCount -NotePropertyValue 0 }
    return $state
  } catch { throw "Watcher state is invalid: $script:StatePath" }
}

function Save-JsonState {
  param($State)
  $parent = Split-Path -Parent $script:StatePath
  New-Item -ItemType Directory -Path $parent -Force | Out-Null
  [IO.File]::WriteAllText($script:StatePath, ($State | ConvertTo-Json -Depth 4))
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
  if ($candidate) { return $candidate.Source }
  $fallback = Join-Path $env:APPDATA 'npm\codex.cmd'
  if (Test-Path -LiteralPath $fallback -PathType Leaf) { return $fallback }
  throw 'Codex CLI not found as codex.cmd or %APPDATA%\npm\codex.cmd'
}

function Get-CodexLaunchSpec {
  param([string]$Repository)
  $cli = Resolve-CodexCli
  [pscustomobject]@{
    Executable = $cli
    Arguments = @('--ask-for-approval', 'on-request', 'exec', '--cd', $Repository, '--sandbox', 'workspace-write', 'Read AGENTS.md and agent/GPT_NEXT_TASK.md. Execute only the currently authorized phase. Preserve all task boundaries, publish the required GPT_HANDOFF files, push the permitted changes, then stop. Do not infer or start another phase.')
  }
}

function Test-CompletedHandoff {
  param([string]$Repository, [string]$Phase)
  $handoffPath = Join-Path $Repository 'outputs\GPT_HANDOFF.json'
  if (-not (Test-Path -LiteralPath $handoffPath -PathType Leaf)) { return $false }
  try {
    $handoff = [IO.File]::ReadAllText($handoffPath) | ConvertFrom-Json
    return ($handoff.phase -eq $Phase -and $handoff.status -eq 'completed')
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
  param([string]$Repository, [switch]$DryRun)
  $spec = Get-CodexLaunchSpec $Repository
  $env:CODEX_HOME = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE '.codex' }
  if ($DryRun) { return [pscustomobject]@{ Started = $false; DryRun = $true; Executable = $spec.Executable; Arguments = $spec.Arguments } }
  & $spec.Executable @($spec.Arguments)
  return [pscustomobject]@{ Started = $true; ExitCode = $LASTEXITCODE; Executable = $spec.Executable; Arguments = $spec.Arguments }
}

function Invoke-WatcherOnce {
  param([switch]$DryRun, [switch]$SkipSync)
  Resolve-DefaultPaths $RepoPath
  $lock = Acquire-WatcherLock
  if (-not $lock) { Write-WatcherLog 'lock busy; skipped cycle'; return [pscustomobject]@{ Action = 'locked' } }
  try {
    if (-not $SkipSync) {
      $sync = Sync-CrystalRepository $RepoPath
      if (-not $sync.Ready) { Write-WatcherLog "blocked: $($sync.Reason)"; return [pscustomobject]@{ Action = 'blocked'; Reason = $sync.Reason } }
    }
    $task = Read-TaskDescriptor $script:TaskFilePath
    $state = Get-JsonState
    $state.lastPhase = $task.Phase; $state.lastStatus = $task.Status; $state.lastPollAt = [DateTime]::UtcNow.ToString('o')
    if ($task.Status -ne 'authorized' -or -not $task.Phase) { Save-JsonState $state; Write-WatcherLog "waiting: phase=$($task.Phase) status=$($task.Status)"; return [pscustomobject]@{ Action = 'waiting'; Phase = $task.Phase; Status = $task.Status } }
    if ($state.lastCompletedFingerprint -eq $task.Fingerprint) { Save-JsonState $state; Write-WatcherLog "duplicate completed fingerprint skipped: $($task.Fingerprint)"; return [pscustomobject]@{ Action = 'duplicate'; Fingerprint = $task.Fingerprint } }
    if ($state.blockedFingerprint -eq $task.Fingerprint) { Save-JsonState $state; Write-WatcherLog "blocked retry limit reached: phase=$($task.Phase) retryCount=$($state.retryCount)"; return [pscustomobject]@{ Action = 'blocked-retry-limit'; Fingerprint = $task.Fingerprint; RetryCount = $state.retryCount } }
    if (Test-CompletedHandoff $RepoPath $task.Phase) {
      $state.lastCompletedFingerprint = $task.Fingerprint
      $state.lastLaunchedFingerprint = $task.Fingerprint
      $state.lastFailureFingerprint = ''
      $state.lastFailureAt = ''
      $state.retryAfterUtc = ''
      $state.retryCount = 0
      $state.blockedFingerprint = ''
      $state.lastRunStatus = 'completed-existing'
      Save-JsonState $state
      Write-WatcherLog "completion evidence found before launch: phase=$($task.Phase) fingerprint=$($task.Fingerprint)"
      return [pscustomobject]@{ Action = 'completed-existing'; Phase = $task.Phase; Fingerprint = $task.Fingerprint }
    }
    if (Test-RetryBackoff $state $task.Fingerprint) { Save-JsonState $state; Write-WatcherLog "retry backoff active: phase=$($task.Phase) retryAfterUtc=$($state.retryAfterUtc)"; return [pscustomobject]@{ Action = 'backoff'; Fingerprint = $task.Fingerprint; RetryAfterUtc = $state.retryAfterUtc } }
    Write-WatcherLog "authorized task detected: phase=$($task.Phase) status=$($task.Status) fingerprint=$($task.Fingerprint)"
    $state.lastLaunchedFingerprint = $task.Fingerprint; $state.lastRunAt = [DateTime]::UtcNow.ToString('o'); $state.lastRunStatus = 'running'; Save-JsonState $state
    $launch = Start-CodexExecution $RepoPath -DryRun:$DryRun
    if ($launch.DryRun) {
      $state.lastLaunchedFingerprint = ''
      $state.lastRunStatus = 'dry-run'
      Save-JsonState $state
      Write-WatcherLog "dry-run launch: phase=$($task.Phase) fingerprint=$($task.Fingerprint)"
      return [pscustomobject]@{ Action = 'dry-run'; Phase = $task.Phase; Fingerprint = $task.Fingerprint; Launch = $launch }
    }
    Write-WatcherLog "Codex exited with code $($launch.ExitCode): phase=$($task.Phase)"
    if ($launch.ExitCode -ne 0) {
      Set-FailureState $state $task.Fingerprint
      Save-JsonState $state
      Write-WatcherLog "Codex failure recorded: phase=$($task.Phase) retryCount=$($state.retryCount) blocked=$([bool]$state.blockedFingerprint) retryAfterUtc=$($state.retryAfterUtc)"
      return [pscustomobject]@{ Action = 'failed'; Phase = $task.Phase; Fingerprint = $task.Fingerprint; ExitCode = $launch.ExitCode }
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
      Save-JsonState $state
      Write-WatcherLog "completion verified: phase=$($task.Phase) fingerprint=$($task.Fingerprint)"
      return [pscustomobject]@{ Action = 'completed'; Phase = $task.Phase; Fingerprint = $task.Fingerprint; ExitCode = $launch.ExitCode }
    }
    Set-FailureState $state $task.Fingerprint
    Save-JsonState $state
    Write-WatcherLog "completion evidence missing or mismatched; retryable after $($state.retryAfterUtc): phase=$($task.Phase)"
    return [pscustomobject]@{ Action = 'unverified'; Phase = $task.Phase; Fingerprint = $task.Fingerprint; ExitCode = $launch.ExitCode }
  } finally { $lock.Dispose() }
}

if ($MyInvocation.InvocationName -ne '.') {
  Resolve-DefaultPaths $RepoPath
  do { Invoke-WatcherOnce -DryRun:$DryRun -SkipSync:$SkipSync | Out-Null; if (-not $Once) { Start-Sleep -Seconds ([Math]::Max(10, $IntervalSeconds)) } } while (-not $Once)
}
