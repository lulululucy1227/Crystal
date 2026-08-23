[CmdletBinding()]
param(
  [ValidateSet('Install','Enable','Disable','Status','CheckOnce','OpenLog','Uninstall')]
  [string]$Action = 'Status',
  [string]$RepoPath = '',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
if (-not $RepoPath) { $RepoPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot) }
$taskName = 'Crystal Agent Watcher'
$shortcutName = 'Crystal Codex 自动接任务.lnk'
$stateDir = Join-Path $RepoPath '.agent-state'
$statePath = Join-Path $stateDir 'watcher-state.json'
$logPath = Join-Path $stateDir 'watcher.log'
$watcherPath = Join-Path $PSScriptRoot 'watcher.ps1'
$controllerPath = Join-Path $PSScriptRoot 'controller.ps1'
$startupPath = Join-Path ([Environment]::GetFolderPath('Startup')) 'Crystal-Agent-Watcher.cmd'
$shell = New-Object -ComObject WScript.Shell
$desktopPath = $shell.SpecialFolders.Item('Desktop')
if (-not $desktopPath) { $desktopPath = [Environment]::GetFolderPath('DesktopDirectory') }
if (-not $desktopPath) {
  $desktopPath = (Get-ItemProperty -LiteralPath 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders' -Name Desktop -ErrorAction SilentlyContinue).Desktop
  if ($desktopPath) { $desktopPath = [Environment]::ExpandEnvironmentVariables($desktopPath) }
}
if (-not $desktopPath) { $desktopPath = Join-Path $env:USERPROFILE 'Desktop' }
$shortcutPath = Join-Path $desktopPath $shortcutName

function Get-CrystalTask { Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue }
function Stop-CrystalWatcher {
  Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^(powershell|pwsh)(\.exe)?$' -and $_.CommandLine -match [regex]::Escape($watcherPath) } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}
function Get-ControllerStatus {
  $task = Get-CrystalTask
  $state = $null
  if (Test-Path -LiteralPath $statePath) { try { $state = Get-Content -Raw -LiteralPath $statePath | ConvertFrom-Json } catch {} }
  [pscustomobject]@{
    AutoMode = if ($task -and $task.State -ne 'Disabled') { 'ON' } else { 'OFF' }
    SchedulerStatus = if ($task) { [string]$task.State } else { 'Not installed' }
    Phase = if ($state) { $state.lastPhase } else { '' }
    TaskStatus = if ($state) { $state.lastStatus } else { '' }
    LastPollAt = if ($state) { $state.lastPollAt } else { '' }
    LastRunAt = if ($state) { $state.lastRunAt } else { '' }
    LastRunStatus = if ($state) { $state.lastRunStatus } else { '' }
    RetryCount = if ($state) { [int]$state.retryCount } else { 0 }
    Blocked = [bool]($state -and $state.blockedFingerprint)
    RetryAfterUtc = if ($state) { $state.retryAfterUtc } else { '' }
  }
}

switch ($Action) {
  'Install' {
    New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
    $taskAction = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "{0}" -RepoPath "{1}" -Once' -f $watcherPath, $RepoPath) -WorkingDirectory $RepoPath
    $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(5) -RepetitionInterval (New-TimeSpan -Minutes 5)
    $settings = New-ScheduledTaskSettingsSet -WakeToRun:$false -StartWhenAvailable:$false -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew
    $principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
    Register-ScheduledTask -TaskName $taskName -Action $taskAction -Trigger $trigger -Settings $settings -Principal $principal -Description 'Crystal Codex one-shot task pickup every 5 minutes while enabled.' -Force | Out-Null
    Disable-ScheduledTask -TaskName $taskName | Out-Null
    if (Test-Path -LiteralPath $startupPath) { Remove-Item -LiteralPath $startupPath -Force }
    $shortcut = $shell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
    $shortcut.Arguments = ('-NoProfile -ExecutionPolicy Bypass -File "{0}"' -f $controllerPath)
    $shortcut.WorkingDirectory = $RepoPath
    $shortcut.Description = 'Crystal Codex 自动接任务控制器'
    $shortcut.Save()
    Get-ControllerStatus
  }
  'Enable' { if (-not (Get-CrystalTask)) { throw 'Controller is not installed.' }; Enable-ScheduledTask -TaskName $taskName | Out-Null; Get-ControllerStatus }
  'Disable' { if (Get-CrystalTask) { Disable-ScheduledTask -TaskName $taskName | Out-Null }; Stop-CrystalWatcher; Get-ControllerStatus }
  'Status' { Get-ControllerStatus }
  'CheckOnce' { if ($DryRun) { & powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $watcherPath -RepoPath $RepoPath -Once -DryRun } else { & powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $watcherPath -RepoPath $RepoPath -Once }; Get-ControllerStatus }
  'OpenLog' { New-Item -ItemType Directory -Path $stateDir -Force | Out-Null; if (-not (Test-Path -LiteralPath $logPath)) { New-Item -ItemType File -Path $logPath | Out-Null }; Start-Process notepad.exe -ArgumentList ('"{0}"' -f $logPath) }
  'Uninstall' { if (Get-CrystalTask) { Unregister-ScheduledTask -TaskName $taskName -Confirm:$false }; Stop-CrystalWatcher; if (Test-Path -LiteralPath $shortcutPath) { Remove-Item -LiteralPath $shortcutPath -Force }; if (Test-Path -LiteralPath $startupPath) { Remove-Item -LiteralPath $startupPath -Force }; if (Test-Path -LiteralPath $stateDir) { Remove-Item -LiteralPath $stateDir -Recurse -Force }; [pscustomobject]@{ Removed = $true } }
}
