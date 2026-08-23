[CmdletBinding()]
param(
  [ValidateSet('Install','Enable','Disable','Status','CheckOnce','OpenLog','Uninstall')]
  [string]$Action = 'Status',
  [string]$RepoPath = '',
  [switch]$DryRun
)
$ErrorActionPreference = 'Stop'
if (-not $RepoPath) { $RepoPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot) }
$shortcutName = 'Crystal Codex ' + ([string][char]0x81ea + [char]0x52a8 + [char]0x63a5 + [char]0x4efb + [char]0x52a1) + '.lnk'
$stateDir = Join-Path $RepoPath '.agent-state'
$statePath = Join-Path $stateDir 'watcher-state.json'
$logPath = Join-Path $stateDir 'watcher.log'
$watcherPath = Join-Path $PSScriptRoot 'watcher.ps1'
$controllerPath = Join-Path $PSScriptRoot 'controller.ps1'
$startupPath = Join-Path ([Environment]::GetFolderPath('Startup')) 'Crystal-Agent-Watcher.cmd'
$shell = New-Object -ComObject WScript.Shell
$desktopPath = 'C:\Users\luo_d\Desktop'
$shortcutPath = Join-Path $desktopPath $shortcutName
function Stop-CrystalWatcher {
  Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^(powershell|pwsh)(\.exe)?$' -and $_.CommandLine -match [regex]::Escape($watcherPath) } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}
function Read-State { if (Test-Path -LiteralPath $statePath) { try { return (Get-Content -Raw -LiteralPath $statePath | ConvertFrom-Json) } catch {} }; return $null }
function Get-ControllerStatus {
  $state = Read-State
  [pscustomobject]@{
    AutoMode = 'OFF'; SchedulerStatus = 'Desktop Controller Session Scheduler'
    Phase = if ($state) { $state.lastPhase } else { '' }; TaskStatus = if ($state) { $state.lastStatus } else { '' }
    LastPollAt = if ($state) { $state.lastPollAt } else { '' }; LastRunAt = if ($state) { $state.lastRunAt } else { '' }
    LastRunStatus = if ($state) { $state.lastRunStatus } else { '' }; RetryCount = if ($state) { [int]$state.retryCount } else { 0 }
    Blocked = [bool]($state -and $state.blockedFingerprint); RetryAfterUtc = if ($state) { $state.retryAfterUtc } else { '' }
  }
}
switch ($Action) {
  'Install' {
    New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
    if (Test-Path -LiteralPath $startupPath) { Remove-Item -LiteralPath $startupPath -Force }
    $shortcut = $shell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
    $shortcut.Arguments = ('-NoProfile -ExecutionPolicy Bypass -File "{0}" -RepoPath "{1}"' -f $controllerPath, $RepoPath)
    $shortcut.WorkingDirectory = $RepoPath; $shortcut.Description = 'Crystal Codex 自动接任务控制器（默认关闭自动模式）'; $shortcut.Save()
    [pscustomobject]@{ Installed = $true; Shortcut = $shortcutPath; Scheduler = 'Session' }
  }
  'Enable' { [pscustomobject]@{ AutoMode = 'ON'; SchedulerStatus = 'Session only'; Note = 'Enable is owned by the open controller session.' } }
  'Disable' { Stop-CrystalWatcher; [pscustomobject]@{ AutoMode = 'OFF'; SchedulerStatus = 'Session only' } }
  'Status' { Get-ControllerStatus }
  'CheckOnce' { if ($DryRun) { & powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $watcherPath -RepoPath $RepoPath -Once -DryRun } else { & powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $watcherPath -RepoPath $RepoPath -Once }; Get-ControllerStatus }
  'OpenLog' { New-Item -ItemType Directory -Path $stateDir -Force | Out-Null; if (-not (Test-Path -LiteralPath $logPath)) { New-Item -ItemType File -Path $logPath | Out-Null }; Start-Process notepad.exe -ArgumentList ('"{0}"' -f $logPath) }
  'Uninstall' { Stop-CrystalWatcher; if (Test-Path -LiteralPath $shortcutPath) { Remove-Item -LiteralPath $shortcutPath -Force }; if (Test-Path -LiteralPath $startupPath) { Remove-Item -LiteralPath $startupPath -Force }; [pscustomobject]@{ Removed = $true; Scheduler = 'No Task Scheduler object used' } }
}
