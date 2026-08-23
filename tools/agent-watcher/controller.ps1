[CmdletBinding()]
param([string]$RepoPath = '', [switch]$TestMode)
$ErrorActionPreference = 'Stop'
if (-not $RepoPath) { $RepoPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot) }
$watcherPath = Join-Path $PSScriptRoot 'watcher.ps1'
$statePath = Join-Path $RepoPath '.agent-state\watcher-state.json'
$logPath = Join-Path $RepoPath '.agent-state\watcher.log'
$script:autoMode = $false; $script:pollProcess = $null; $script:pollIntervalMs = 300000
. $watcherPath -RepoPath $RepoPath
$script:StatePath = $statePath; $script:TaskFilePath = Join-Path $RepoPath 'agent\GPT_NEXT_TASK.md'
function U([int[]]$Codes) { return (-join ($Codes | ForEach-Object { [char]$_ })) }
$script:L = @{
  Auto = U @(0x81EA,0x52A8,0x63A5,0x4EFB,0x52A1); On = U @(0x5DF2,0x5F00,0x542F); Off = U @(0x5DF2,0x5173,0x95ED)
  None = U @(0x6682,0x65E0,0x4EFB,0x52A1); Idle = U @(0x7A7A,0x95F2); Syncing = U @(0x6B63,0x5728,0x68C0,0x67E5,0x65B0,0x4EFB,0x52A1)
  Starting = U @(0x6B63,0x5728,0x542F,0x52A8,0x4EFB,0x52A1); Running = U @(0x6267,0x884C,0x4E2D); Finalizing = U @(0x6B63,0x5728,0x5B8C,0x6210,0x4EFB,0x52A1)
  Completed = U @(0x5DF2,0x5B8C,0x6210); Retry = U @(0x7B49,0x5F85,0x91CD,0x8BD5); Blocked = U @(0x9700,0x8981,0x5904,0x7406)
  Status = U @(0x72B6,0x6001); Task = U @(0x5F53,0x524D,0x4EFB,0x52A1); LastPoll = U @(0x6700,0x8FD1,0x68C0,0x67E5)
  Duration = U @(0x8FD0,0x884C,0x65F6,0x95F4); Minute = U @(0x5206); Second = U @(0x79D2); RetryAt = U @(0x9884,0x8BA1,0x518D,0x6B21,0x5C1D,0x8BD5)
  Hint = U @(0x63D0,0x793A); Enable = U @(0x5F00,0x542F,0x81EA,0x52A8,0x63A5,0x4EFB,0x52A1); Disable = U @(0x5173,0x95ED,0x81EA,0x52A8,0x63A5,0x4EFB,0x52A1)
  Check = U @(0x7ACB,0x5373,0x68C0,0x67E5); Log = U @(0x67E5,0x770B,0x65E5,0x5FD7)
}
function ConvertTo-LocalDisplayTime([string]$UtcText) { if (-not $UtcText) { return '-' }; try { $local=[DateTime]::Parse($UtcText).ToUniversalTime().ToLocalTime(); if($local.Date -eq [DateTime]::Now.Date){return $local.ToString('HH:mm:ss')}; return $local.ToString('yyyy-MM-dd HH:mm:ss') } catch { return '-' } }
function Format-PhaseName([string]$Phase) { if (-not $Phase) { return $script:L.None }; $parts=$Phase -split '-'; if($parts.Count -lt 3){return $Phase}; $code=$parts[0..1] -join '-'; $words=($parts[2..($parts.Count-1)]|ForEach-Object{$_.ToLowerInvariant().Substring(0,1).ToUpperInvariant()+$_.ToLowerInvariant().Substring(1)}) -join ' '; return "$code · $words" }
function Get-ChineseState([string]$ExecutionState) { switch($ExecutionState){ 'SYNCING' {$script:L.Syncing}; 'STARTING' {$script:L.Starting}; 'RUNNING' {$script:L.Running}; 'FINALIZING' {$script:L.Finalizing}; 'COMPLETED' {$script:L.Completed}; 'RETRY_WAIT' {$script:L.Retry}; 'BLOCKED' {$script:L.Blocked}; default {$script:L.Idle} } }
function Get-ElapsedDisplay([string]$StartedAtUtc,[bool]$IsLive) { if(-not $IsLive -or -not $StartedAtUtc){return ''}; try{$seconds=[Math]::Max(0,[Math]::Floor(([DateTime]::UtcNow-[DateTime]::Parse($StartedAtUtc).ToUniversalTime()).TotalSeconds)); return ('{0}{1}{2}{3}' -f [Math]::Floor($seconds/60),$script:L.Minute,($seconds%60),$script:L.Second)}catch{return ''} }
function Get-ControllerViewModel { $state=Get-JsonState; $p=Get-WatcherPresentation $RepoPath $state; $phase=$p.Phase; if($p.ExecutionState -eq 'COMPLETED' -and -not $p.IsLive){$phase=''}; [pscustomobject]@{AutoMode=if($script:autoMode){$script:L.On}else{$script:L.Off};Status=Get-ChineseState $p.ExecutionState;Task=Format-PhaseName $phase;LastPoll=ConvertTo-LocalDisplayTime $p.LastPollAt;Duration=Get-ElapsedDisplay $p.RunStartedAtUtc $p.IsLive;RetryAt=if($p.ExecutionState -eq 'RETRY_WAIT'){ConvertTo-LocalDisplayTime $p.RetryAfterUtc}else{''};Reason=if($p.ExecutionState -eq 'BLOCKED'){$p.ErrorSummary}else{''};InternalState=$p.ExecutionState} }
function Test-SessionPollBusy { return ($script:pollProcess -and -not $script:pollProcess.HasExited) }
function Invoke-SessionPoll { param([switch]$DryRun); if(-not $script:autoMode -and -not $DryRun){return [pscustomobject]@{Result='SkippedOff'}}; if(Test-SessionPollBusy){return [pscustomobject]@{Result='SkippedBusy'}}; if($DryRun){return [pscustomobject]@{Result='WouldRun';IntervalMs=$script:pollIntervalMs}}; $args=@('-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',$watcherPath,'-RepoPath',$RepoPath,'-Once'); $script:pollProcess=Start-Process -FilePath "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -ArgumentList $args -WorkingDirectory $RepoPath -PassThru -WindowStyle Hidden; return [pscustomobject]@{Result='Started'} }
function Set-SessionAutoMode([bool]$Enabled){$script:autoMode=$Enabled}
if($TestMode){return}
Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing
$form=New-Object Windows.Forms.Form; $form.Text='Crystal Codex'; $form.Size=New-Object Drawing.Size(540,420); $form.StartPosition='CenterScreen'; $form.FormBorderStyle='FixedDialog'; $form.MaximizeBox=$false
$title=New-Object Windows.Forms.Label; $title.Text='Crystal Codex'; $title.Location=New-Object Drawing.Point(24,18); $title.Size=New-Object Drawing.Size(470,32); $title.Font=New-Object Drawing.Font('Segoe UI Semibold',18); $form.Controls.Add($title)
$summary=New-Object Windows.Forms.Label; $summary.Location=New-Object Drawing.Point(26,68); $summary.Size=New-Object Drawing.Size(480,210); $summary.Font=New-Object Drawing.Font('Segoe UI',11); $form.Controls.Add($summary)
function Refresh-Status {$v=Get-ControllerViewModel; $text="$($script:L.Auto)：$($v.AutoMode)`r`n`r`n$($script:L.Status)`r`n● $($v.Status)`r`n`r`n$($script:L.Task)`r`n$($v.Task)`r`n`r`n$($script:L.LastPoll)`r`n$($v.LastPoll)"; if($v.Duration){$text+="`r`n`r`n$($script:L.Duration)`r`n$($v.Duration)"}; if($v.RetryAt){$text+="`r`n`r`n$($script:L.RetryAt)`r`n$($v.RetryAt)"}; if($v.Reason){$text+="`r`n`r`n$($script:L.Hint)`r`n$($v.Reason)"}; $summary.Text=$text; $summary.ForeColor=if($v.InternalState -eq 'BLOCKED'){[Drawing.Color]::Firebrick}elseif($v.InternalState -in @('RUNNING','FINALIZING','STARTING')){[Drawing.Color]::DarkBlue}else{[Drawing.Color]::Black}}
function Add-Button([string]$Text,[int]$X,[scriptblock]$Handler){$b=New-Object Windows.Forms.Button;$b.Text=$Text;$b.Location=New-Object Drawing.Point($X,310);$b.Size=New-Object Drawing.Size(115,42);$b.Add_Click($Handler);$form.Controls.Add($b)}
$pollTimer=New-Object Windows.Forms.Timer;$pollTimer.Interval=$script:pollIntervalMs;$uiTimer=New-Object Windows.Forms.Timer;$uiTimer.Interval=1000
$pollTimer.Add_Tick({if($script:autoMode){Invoke-SessionPoll|Out-Null};Refresh-Status});$uiTimer.Add_Tick({Refresh-Status})
Add-Button $script:L.Enable 20 {Set-SessionAutoMode $true;$pollTimer.Start();Refresh-Status};Add-Button $script:L.Disable 145 {Set-SessionAutoMode $false;$pollTimer.Stop();Refresh-Status};Add-Button $script:L.Check 270 {$wasOn=$script:autoMode;Set-SessionAutoMode $true;Invoke-SessionPoll|Out-Null;Set-SessionAutoMode $wasOn;Refresh-Status};Add-Button $script:L.Log 395 {New-Item -ItemType Directory -Path (Split-Path $logPath) -Force|Out-Null;if(-not(Test-Path $logPath)){New-Item -ItemType File -Path $logPath|Out-Null};Start-Process notepad.exe -ArgumentList ('"{0}"' -f $logPath)}
$form.Add_FormClosing({$pollTimer.Stop();$uiTimer.Stop()});Refresh-Status;$uiTimer.Start();[void]$form.ShowDialog()
