# Agent Watcher

This is a small Windows PowerShell watcher for the Crystal repository. It fetches `origin/main`, fast-forwards only when the worktree is clean, reads `agent/GPT_NEXT_TASK.md`, and launches one fixed `codex exec` command only for a new authorized task-file fingerprint.

The watcher never interprets task text as shell commands. Codex receives normal `workspace-write` sandboxing and `on-request` approvals. It sets `CODEX_HOME` explicitly because this machine's non-interactive environment does not provide `HOME`.

Run manually from the project root:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/agent-watcher/watcher.ps1 -Once -DryRun
```

The runtime state and log are under `.agent-state/` and are intentionally ignored by Git.

A task fingerprint is completed only when Codex exits with code `0` and the post-run `outputs/GPT_HANDOFF.json` has the same phase with status `completed`. Non-zero exits, sync failures, and missing or mismatched completion evidence remain retryable. They are logged with failure timestamps and held for a five-minute local backoff before the same fingerprint may run again. A verified completed fingerprint remains skipped.

The user-level Startup entry sets `CRYSTAL_WATCHER_ROOT` to this project directory explicitly; this avoids resolving paths relative to the Windows Startup folder.
