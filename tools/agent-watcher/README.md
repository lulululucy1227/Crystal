# Crystal Agent Watcher desktop control

## PRIMARY MODE: Desktop Controller Session Scheduler

The controller is a Windows-native PowerShell WinForms window. It is the only scheduler used by the supported installation. Task Scheduler is unsupported on this machine because of Windows access policy; it is not required. No service, Startup entry, login trigger, WakeToRun, administrator privilege, Electron, Python GUI, or resident watcher is used.

## Behavior

- `manage-watcher.ps1 -Action Install` creates only the current-user Desktop shortcut `Crystal Codex 自动接任务.lnk` and removes the legacy Crystal Startup launcher if present.
- Every controller launch starts with `AUTO MODE: OFF` and never remembers the previous setting.
- Controller open + OFF: UI only; no timer poll, Git fetch, network, watcher, or Codex launch.
- Controller open + ON: an in-process WinForms timer fires every five minutes and starts at most one `watcher.ps1 -Once`; the child watcher exits after that poll and the controller remains visible.
- `立即检查一次` performs one lock-protected one-shot poll whether AUTO MODE is ON or OFF. Closing the controller stops the timer and future polls; it does not relaunch itself or kill an already running Codex task.
- The UI displays AUTO MODE, controller state, current phase/status, last poll, last Codex run, retry count/2, and READY/RUNNING/COMPLETED/BACKOFF/BLOCKED state. A live tracked watcher/Codex process takes precedence as RUNNING and includes elapsed time.
- The watcher retains task fingerprinting, its exclusive lock, clean-worktree checks, full Git path preference (`C:\Program Files\Git\cmd\git.exe`), `workspace-write`, and `on-request` approval.
- On a clean worktree, each poll fetches and fast-forward synchronizes before it evaluates a task fingerprint as completed, blocked, or eligible. The task file is then re-read, so a newly authorized GitHub task cannot be hidden by a previously completed local fingerprint. Dirty-worktree recovery never fetches or merges.
- A fingerprint gets one initial attempt plus at most two automatic retries, separated by at least five minutes. Logs rotate at 2 MiB with one archive, bounding total watcher logs near 4 MiB.
- Automatic finalization is allowed only for the same authorized fingerprint launched from a watcher-recorded clean baseline, after exit 0 produced no matching completed handoff and left a non-empty dirty snapshot. Recovery requires the current HEAD and every dirty entry's status, path, and SHA-256 to exactly equal the watcher-observed post-run state. Any pre-existing, added, removed, renamed, or content-changed entry blocks. Recovery uses a fixed watcher-owned prompt to preserve existing work and perform only validation, handoff, commit, and push work; it never derives commands from task prose.
- Gitignored state records the launch baseline commit/clean marker, finalization fingerprint, observed post-run commit and dirty snapshot, recovery-attempt marker/count, and existing retry/backoff fields. Verified matching completion with a clean tree clears the finalization state.

## Install and use

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/agent-watcher/manage-watcher.ps1 -Action Install
```

Open the shortcut and use the four buttons: `开启自动接任务`, `关闭自动接任务`, `立即检查一次`, and `打开日志`.

`controller.ps1 -TestMode` loads the session scheduler functions without opening a window, allowing synthetic tests without a real business task. Runtime state and logs live under `.agent-state/` and are gitignored.

## Resource and safety profile

The controller is the only process that persists while its window is open. Between ON polls there is no watcher PowerShell process. OFF and closed states perform zero polling and zero network work. A poll transiently starts one PowerShell child and uses the watcher lock to prevent overlap; Codex is started only for an authorized, eligible fingerprint. The controller does not wake the computer. Log rotation bounds disk use near 4 MiB.

## Uninstall

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/agent-watcher/manage-watcher.ps1 -Action Uninstall
```

This removes only the named Desktop shortcut, legacy named Startup file if present, and Crystal watcher processes/runtime data. It does not touch unrelated tasks, processes, or user files. No Task Scheduler object is created by this mode.
