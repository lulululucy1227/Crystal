[CmdletBinding()]
param([switch]$KeepArtifacts, [switch]$StartOnly)
$ErrorActionPreference = 'Stop'
$watcher = Join-Path $PSScriptRoot 'watcher.ps1'
$git = 'C:\Program Files\Git\cmd\git.exe'
$root = Join-Path ([IO.Path]::GetTempPath()) ('crystal-v14-smoke-' + [Guid]::NewGuid().ToString('N'))
$repo = Join-Path $root 'repo'; $remote = Join-Path $root 'remote.git'
function Git { param([Parameter(ValueFromRemainingArguments=$true)][object[]]$Args) & $git @Args; if($LASTEXITCODE -ne 0){throw "smoke git failed: $($Args -join ' ')"} }
try {
  New-Item -ItemType Directory -Path $repo -Force | Out-Null
  Git init --bare $remote --quiet
  Git -C $repo init --initial-branch main --quiet
  Git -C $repo config user.email smoke@example.invalid
  Git -C $repo config user.name 'Watcher Smoke'
  New-Item -ItemType Directory -Path (Join-Path $repo 'agent') -Force | Out-Null
  [IO.File]::WriteAllText((Join-Path $repo '.gitignore'), ".agent-state/`n")
  [IO.File]::WriteAllText((Join-Path $repo 'AGENTS.md'), "This is an isolated lifecycle smoke repository. Follow agent/GPT_NEXT_TASK.md exactly.\n")
  [IO.File]::WriteAllText((Join-Path $repo 'agent\GPT_NEXT_TASK.md'), @"
# GPT NEXT TASK

Phase: AGENT-WATCHER-V1.4-LIFECYCLE-SMOKE
Status: authorized

## Objective
Create exactly `outputs/v1.4-lifecycle-smoke.txt` containing `smoke`, and `outputs/GPT_HANDOFF.json` containing JSON with this phase and status `completed`. Do not change any other file. On the initial execution, leave these two permitted outputs uncommitted and stop. If the invocation explicitly says it is watcher-owned finalization recovery, validate these exact existing outputs, then run `git add outputs`, `git commit -m "v1.4 lifecycle smoke finalization"`, and `git push origin main`; stop only after `git status --short` is empty.
"@)
  Git -C $repo add .gitignore AGENTS.md agent/GPT_NEXT_TASK.md
  Git -C $repo commit -m 'smoke baseline' --quiet
  Git -C $repo remote add origin $remote
  Git -C $repo push -u origin main --quiet
  $runner = Join-Path $root 'run-watcher.ps1'; $resultPath = Join-Path $root 'runner-result.json'
  [IO.File]::WriteAllText($runner, @'
param([string]$Watcher,[string]$Repository,[string]$ResultPath)
$ErrorActionPreference='Stop'
try {
  . $Watcher -RepoPath $Repository
  $script:RepoPath=$Repository; $script:StatePath=Join-Path $Repository '.agent-state\watcher-state.json'; $script:LogPath=Join-Path $Repository '.agent-state\watcher.log'; $script:TaskFilePath=Join-Path $Repository 'agent\GPT_NEXT_TASK.md'
  $run=Invoke-WatcherOnce; $state=Get-JsonState
  [IO.File]::WriteAllText($ResultPath, (@{ok=$true;action=$run.Action;state=$state.execution_state}|ConvertTo-Json))
} catch { [IO.File]::WriteAllText($ResultPath, (@{ok=$false;error=$_.Exception.Message}|ConvertTo-Json)); exit 1 }
'@)
  $runnerArgs = '-NoProfile -ExecutionPolicy Bypass -File "{0}" -Watcher "{1}" -Repository "{2}" -ResultPath "{3}"' -f $runner,$watcher,$repo,$resultPath
  $runnerProcess = Start-Process -FilePath "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -ArgumentList $runnerArgs -WorkingDirectory $repo -PassThru -WindowStyle Hidden
  if ($StartOnly) { [pscustomobject]@{ Root=$root; RunnerProcessId=$runnerProcess.Id; ResultPath=$resultPath }; return }
  $deadline = [DateTime]::UtcNow.AddMinutes(4)
  while (-not (Test-Path -LiteralPath $resultPath) -and [DateTime]::UtcNow -lt $deadline) { Start-Sleep -Seconds 2 }
  if (-not (Test-Path -LiteralPath $resultPath)) { throw "real lifecycle smoke timed out; artifacts retained at $root" }
  $runnerResult = [IO.File]::ReadAllText($resultPath) | ConvertFrom-Json
  if (-not $runnerResult.ok) { throw "real lifecycle smoke runner failed: $($runnerResult.error)" }
  . $watcher -RepoPath $repo
  $script:RepoPath = $repo; $script:StatePath = Join-Path $repo '.agent-state\watcher-state.json'; $script:LogPath = Join-Path $repo '.agent-state\watcher.log'; $script:TaskFilePath = Join-Path $repo 'agent\GPT_NEXT_TASK.md'
  $result = [pscustomobject]@{ Action=$runnerResult.action }
  $state = Get-JsonState
  $clean = Test-WorktreeClean $repo
  $head = Get-HeadCommit $repo
  Git -C $repo fetch origin main --quiet
  $remoteHead = (& $git -C $repo rev-parse origin/main).Trim()
  $log = [IO.File]::ReadAllText((Join-Path $repo '.agent-state\watcher.log'))
  if($result.Action -ne 'completed' -or $state.execution_state -ne 'COMPLETED' -or -not $clean -or $head -ne $remoteHead -or $log -notmatch 'execution state: STARTING' -or $log -notmatch 'execution state: RUNNING' -or $log -notmatch 'execution state: FINALIZING' -or $log -notmatch 'execution state: COMPLETED'){throw 'real lifecycle smoke did not reach verified STARTING -> RUNNING -> FINALIZING -> COMPLETED with a clean pushed worktree'}
  [pscustomobject]@{ Result=$result.Action; RunStartedAtUtc=$state.run_started_at_utc; RunFinishedAtUtc=$state.run_finished_at_utc; FinalizationStartedAtUtc=$state.finalization_started_at_utc; FinalizationFinishedAtUtc=$state.finalization_finished_at_utc; Head=$head }
} finally {
  if(-not $KeepArtifacts -and (Test-Path -LiteralPath $root)) {
    try { Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction Stop }
    catch { Write-Warning "Smoke artifacts retained after cleanup failure: $root" }
  }
}
