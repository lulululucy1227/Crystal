[CmdletBinding()]
param([string]$RepoPath = '', [switch]$TestMode)
$ErrorActionPreference = 'Stop'
if (-not $RepoPath) { $RepoPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot) }
$watcherPath = Join-Path $PSScriptRoot 'watcher.ps1'
$statePath = Join-Path $RepoPath '.agent-state\watcher-state.json'
$logPath = Join-Path $RepoPath '.agent-state\watcher.log'
$script:autoMode = $false; $script:pollProcess = $null; $script:lastRun = 'not-run'; $script:pollIntervalMs = 5 * 60 * 1000
function Read-SessionState { if (Test-Path -LiteralPath $statePath) { try { return (Get-Content -Raw -LiteralPath $statePath | ConvertFrom-Json) } catch {} }; return $null }
function Test-SessionPollBusy { return ($script:pollProcess -and -not $script:pollProcess.HasExited) }
function Invoke-SessionPoll {
  param([switch]$DryRun)
  if (-not $script:autoMode -and -not $DryRun) { return [pscustomobject]@{ Result = 'SkippedOff' } }
  if (Test-SessionPollBusy) { return [pscustomobject]@{ Result = 'SkippedBusy' } }
  if ($DryRun) { return [pscustomobject]@{ Result = 'WouldRun'; IntervalMs = $script:pollIntervalMs } }
  $args = @('-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',$watcherPath,'-RepoPath',$RepoPath,'-Once')
  $script:pollProcess = Start-Process -FilePath "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -ArgumentList $args -WorkingDirectory $RepoPath -PassThru -WindowStyle Hidden
  $script:lastRun = "started (PID $($script:pollProcess.Id))"
  return [pscustomobject]@{ Result = 'Started'; ProcessId = $script:pollProcess.Id }
}
function Get-SessionStatusText {
  $state = Read-SessionState
  $phase = if ($state) { [string]$state.lastPhase } else { '-' }
  $taskStatus = if ($state) { [string]$state.lastStatus } else { '-' }
  $lastPollAt = if ($state) { [string]$state.lastPollAt } else { '-' }
  $retry = if ($state) { [int]$state.retryCount } else { 0 }
  $blocked = [bool]($state -and $state.blockedFingerprint)
  $stateText = if ($blocked) { 'BLOCKED' } elseif ($state -and $state.retryAfterUtc) { 'BACKOFF' } elseif (Test-SessionPollBusy) { 'RUNNING' } else { 'READY' }
  return "AUTO MODE: $(if ($script:autoMode) {'ON'} else {'OFF'})`r`nCONTROLLER: RUNNING`r`nCURRENT TASK: $phase / $taskStatus`r`nLAST POLL: $lastPollAt`r`nLAST CODEX RUN: $($script:lastRun)`r`nRETRY: $retry/2`r`nSTATE: $stateText"
}
function Set-SessionAutoMode([bool]$Enabled) { $script:autoMode = $Enabled }
if ($TestMode) { return }
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$form = New-Object Windows.Forms.Form
$form.Text = 'Crystal Codex Auto Task'
$form.Size = New-Object Drawing.Size(560,390)
$form.StartPosition = 'CenterScreen'; $form.FormBorderStyle = 'FixedDialog'; $form.MaximizeBox = $false
$statusLabel = New-Object Windows.Forms.Label
$statusLabel.Location = New-Object Drawing.Point(20,20); $statusLabel.Size = New-Object Drawing.Size(510,235)
$statusLabel.Font = New-Object Drawing.Font('Segoe UI',11); $form.Controls.Add($statusLabel)
$timer = New-Object Windows.Forms.Timer; $timer.Interval = $script:pollIntervalMs
function Refresh-Status { $statusLabel.Text = Get-SessionStatusText; $statusLabel.ForeColor = if ($script:autoMode) { [Drawing.Color]::DarkGreen } else { [Drawing.Color]::DarkRed } }
function Run-ManualPoll { try { $wasOn = $script:autoMode; Set-SessionAutoMode $true; Invoke-SessionPoll | Out-Null; Set-SessionAutoMode $wasOn; Refresh-Status } catch { $script:lastRun = "error: $($_.Exception.Message)"; Refresh-Status } }
$timer.Add_Tick({ try { if ($script:autoMode) { Invoke-SessionPoll | Out-Null }; Refresh-Status } catch { $script:lastRun = "error: $($_.Exception.Message)"; Refresh-Status } })
$form.Add_FormClosing({ $timer.Stop() })
function Add-Button([string]$Text,[int]$X,[scriptblock]$Handler) { $b = New-Object Windows.Forms.Button; $b.Text = $Text; $b.Location = New-Object Drawing.Point($X,285); $b.Size = New-Object Drawing.Size(120,42); $b.Add_Click($Handler); $form.Controls.Add($b) }
Add-Button 'Enable auto pickup' 20 { Set-SessionAutoMode $true; $timer.Start(); Refresh-Status }
Add-Button 'Disable auto pickup' 150 { Set-SessionAutoMode $false; $timer.Stop(); Refresh-Status }
Add-Button 'Check once' 280 { Run-ManualPoll }
Add-Button 'Open log' 410 { New-Item -ItemType Directory -Path (Split-Path $logPath) -Force | Out-Null; if (-not (Test-Path $logPath)) { New-Item -ItemType File -Path $logPath | Out-Null }; Start-Process notepad.exe -ArgumentList ('"{0}"' -f $logPath) }
Refresh-Status
[void]$form.ShowDialog()
