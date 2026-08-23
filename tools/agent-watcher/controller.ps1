$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$manager = Join-Path $PSScriptRoot 'manage-watcher.ps1'

$form = New-Object Windows.Forms.Form
$form.Text = 'Crystal Codex 自动接任务'
$form.Size = New-Object Drawing.Size(520,350)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$statusLabel = New-Object Windows.Forms.Label
$statusLabel.Location = New-Object Drawing.Point(20,20)
$statusLabel.Size = New-Object Drawing.Size(470,190)
$statusLabel.Font = New-Object Drawing.Font('Segoe UI',11)
$form.Controls.Add($statusLabel)

function Refresh-Status {
  try {
    $s = & $manager -Action Status
    $statusLabel.Text = "AUTO MODE: $($s.AutoMode)`r`nScheduler: $($s.SchedulerStatus)`r`nTask: $($s.Phase) / $($s.TaskStatus)`r`nLast poll: $($s.LastPollAt)`r`nLast Codex run: $($s.LastRunAt) / $($s.LastRunStatus)`r`nRetry: $($s.RetryCount) / 2    Blocked: $($s.Blocked)`r`nRetry after: $($s.RetryAfterUtc)"
    $statusLabel.ForeColor = if ($s.AutoMode -eq 'ON') { [Drawing.Color]::DarkGreen } else { [Drawing.Color]::DarkRed }
  } catch { [Windows.Forms.MessageBox]::Show($_.Exception.Message, 'Crystal Codex') | Out-Null }
}
function Add-ActionButton([string]$text, [int]$x, [string]$action) {
  $button = New-Object Windows.Forms.Button
  $button.Text = $text; $button.Location = New-Object Drawing.Point($x,230); $button.Size = New-Object Drawing.Size(110,42)
  $button.Add_Click({ try { & $manager -Action $action | Out-Null; Refresh-Status } catch { [Windows.Forms.MessageBox]::Show($_.Exception.Message, 'Crystal Codex') | Out-Null } }.GetNewClosure())
  $form.Controls.Add($button)
}
Add-ActionButton '开启自动接任务' 20 'Enable'
Add-ActionButton '关闭自动接任务' 140 'Disable'
Add-ActionButton '立即检查一次' 260 'CheckOnce'
Add-ActionButton '打开日志' 380 'OpenLog'
Refresh-Status
[void]$form.ShowDialog()
