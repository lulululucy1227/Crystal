# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1

Phase: AGENT-WATCHER-V1-BOOTSTRAP
Status: authorized
Model: Luna
Strength: Low

## Objective
Install the smallest safe local watcher so Codex can discover future changes to `agent/GPT_NEXT_TASK.md` and start authorized tasks without the user manually typing a start instruction each time.

This is execution-infrastructure only. Do not resume P2A-2R in this phase; it is preserved at `agent/queue/P2A-2R.md`.

## Design target
Use a lightweight local process, not an LLM polling loop.

Preferred behavior:
1. Poll GitHub/local remote state at a modest interval, e.g. 60 seconds.
2. Fetch/pull only enough to detect whether `agent/GPT_NEXT_TASK.md` changed.
3. Parse at minimum `Phase:` and `Status:`.
4. Only act when `Status: authorized` and the task fingerprint/phase has not already been executed by this watcher.
5. Launch exactly one Codex execution for the new task using the locally installed Codex CLI capability actually available on this machine.
6. Codex must read `AGENTS.md` and `agent/GPT_NEXT_TASK.md`, execute only that phase, publish `GPT_HANDOFF`, push GitHub, then stop.
7. Watcher returns to waiting after the Codex process exits.
8. Never launch two overlapping Codex runs for the same project.
9. Never re-run the same task because of handoff-only commits.
10. If the task is waiting/queued/completed/invalid, do nothing.

## First inspect actual local capability
Before implementing, inspect and record:
- exact Codex CLI path/version
- `codex --help` and available non-interactive/exec/resume options
- current local authentication behavior
- current sandbox/approval behavior
- current Git remote and branch
- whether Windows Task Scheduler or Startup launch is the cleaner option

Do not assume command-line flags that are not present locally.

## Safety model
The watcher itself may only:
- git fetch/pull the Crystal repo safely
- read task/protocol files
- maintain a small local state/lock file
- launch one Codex process
- log watcher activity locally

The watcher must NOT:
- execute arbitrary task shell commands itself
- approve Codex actions
- bypass Codex sandbox/approval policy
- use full-access mode merely for convenience
- store API keys/tokens in repository files
- force-push/reset/discard local work
- modify another repository

Codex approvals must remain Codex approvals. Higher-risk actions must still pause according to the user's configured Codex policy. OpenAI's sandbox/approval model should remain intact.

## Local-only files
Prefer local-only infrastructure under a gitignored location such as:
`tools/agent-watcher/` for versioned source if useful, plus `.agent-state/` or equivalent for runtime state/logs.

Runtime state must not be committed. Add only minimal `.gitignore` entries if needed.

## Task fingerprint
Do not rely only on phase name, because a phase may be revised.
Use a stable fingerprint based on the fetched `GPT_NEXT_TASK.md` content (for example SHA-256 of normalized bytes) and store the last launched/completed fingerprint locally.

The watcher must not run again until the task-file fingerprint changes.

## Git synchronization
Handle local project work defensively.
- Never `reset --hard`.
- Never discard uncommitted files.
- If pulling would conflict with local work, stop watcher launch for that cycle and log a clear blocker rather than modifying the worktree.
- Prefer fetch + fast-forward-only update when clean.

## Windows auto-start
Set up a user-level automatic start only if it can be done safely and reversibly.
Preferred options:
- Windows Task Scheduler at user logon, or
- Startup folder launcher.

Choose the simpler reliable method after inspecting the environment.

Before creating/changing an OS auto-start task, if the environment asks for user approval, stop and clearly mark:
`【需要你确认】`

Do not require administrator privileges if avoidable.

## Testing
Test without executing the queued P2A task.
At minimum prove:
1. waiting/non-authorized file does nothing
2. a synthetic authorized task is detected once
3. same fingerprint is not relaunched
4. changed fingerprint can be detected as new
5. lock prevents overlap
6. dirty/conflicting git state fails safely
7. watcher itself never executes business shell instructions from task content
8. launcher command is constructed from the real local Codex CLI interface
9. watcher survives/restarts with persisted local state

For safety, use a dry-run/mock launch mode for detection tests. Do not let tests run P2A-2R.

## Deliverables
Keep implementation small. Expected deliverables may include:
- watcher script
- optional launcher script
- minimal setup/remove instructions
- focused tests
- `.gitignore` runtime-state entries if needed
- `outputs/GPT_HANDOFF.json`
- `outputs/handoffs/AGENT-WATCHER-V1-BOOTSTRAP.json`

Do not create a large framework or service.

## Success criteria
The bootstrap is successful only if:
- watcher can be started automatically at user logon without admin rights, or a concrete minimal blocker is identified;
- it detects a new authorized task without invoking the model just to poll;
- it launches Codex only on a new task fingerprint;
- Codex retains its normal approval/sandbox controls;
- duplicate/overlapping runs are prevented;
- queued P2A-2R was not executed.

## Boundary
Forbidden in this phase:
- P2A-2R execution
- DB/schema/data changes
- Vision/image processing
- new application/product features
- GitHub Actions/cloud runner replacement unless local watcher is genuinely impossible
- webhook/server/orchestrator frameworks

## Reporting
Update `outputs/GPT_HANDOFF.json` and archive `outputs/handoffs/AGENT-WATCHER-V1-BOOTSTRAP.json`.
Keep the handoff concise. Include:
- watcher mechanism selected
- exact Codex CLI launch mechanism discovered
- poll interval
- fingerprint/lock behavior
- auto-start mechanism
- approval behavior preserved
- tests
- user confirmation still required, if any
- blockers
- next minimum action

After push, stop. Do not restore or execute P2A-2R automatically.