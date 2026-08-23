# Crystal Agent Watcher desktop control

This Windows-only controller replaces the old resident Startup watcher. It uses built-in PowerShell, WinForms, Task Scheduler, and a desktop shortcut; it needs no administrator rights or added dependencies.

## Behavior

- Setup creates the current-user task `Crystal Agent Watcher` and leaves it **disabled (AUTO MODE OFF)**.
- ON enables a five-minute trigger. Every trigger runs `watcher.ps1 -Once` and exits; Task Scheduler ignores overlapping instances.
- OFF disables the trigger and stops only a PowerShell process whose command line contains this repository's exact watcher path.
- `立即检查一次` runs one safe poll regardless of AUTO MODE. It is a real check; use `manage-watcher.ps1 -Action CheckOnce -DryRun` for validation.
- The task is interactive-user only, limited privilege, does not start when missed, and has `WakeToRun = false`.
- A fingerprint gets one initial attempt plus at most two automatic retries, separated by at least five minutes. It then shows BLOCKED until the task fingerprint changes or state is explicitly reviewed.
- `watcher.log` rotates to one archive at 2 MiB, bounding watcher logs near 4 MiB total.

The watcher retains task fingerprinting, its exclusive file lock, clean-worktree checks, `git fetch` plus fast-forward-only sync, `workspace-write`, and `on-request` approval.

## Install and use

From the repository root:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/agent-watcher/manage-watcher.ps1 -Action Install
```

This removes only the legacy `Crystal-Agent-Watcher.cmd` Startup entry and creates `Crystal Codex 自动接任务.lnk` on the current user's Desktop. Open the shortcut and use the four buttons.

Command-line controls:

```powershell
tools/agent-watcher/manage-watcher.ps1 -Action Status
tools/agent-watcher/manage-watcher.ps1 -Action Enable
tools/agent-watcher/manage-watcher.ps1 -Action Disable
tools/agent-watcher/manage-watcher.ps1 -Action CheckOnce
```

Runtime state and logs live under `.agent-state/` and are gitignored.

## Resource and safety profile

OFF has no watcher process, recurring poll, fetch, or Codex launch. ON has no resident watcher between five-minute Task Scheduler invocations. A poll transiently starts PowerShell and performs a fetch only after the clean-worktree check; Codex starts only for an authorized, eligible fingerprint. CPU and disk activity are burst-only. Logs are capped as described above. The task never wakes the computer and does not run while the user is logged out.

## Uninstall

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/agent-watcher/manage-watcher.ps1 -Action Uninstall
```

This removes only the named scheduled task, named desktop shortcut, legacy named Startup file if present, and `.agent-state` runtime data. It does not touch unrelated tasks, processes, or user files.
