@echo off
set "CODEX_HOME=%USERPROFILE%\.codex"
if not defined CRYSTAL_WATCHER_ROOT set "CRYSTAL_WATCHER_ROOT=%~dp0..\.."
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%CRYSTAL_WATCHER_ROOT%\tools\agent-watcher\watcher.ps1" -RepoPath "%CRYSTAL_WATCHER_ROOT%" -IntervalSeconds 60
