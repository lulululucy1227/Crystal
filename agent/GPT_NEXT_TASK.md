# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1

Phase: AGENT-WATCHER-V1.4-EXECUTION-STATE-MACHINE
Status: authorized
Model: Terra
Strength: High

## Objective
Refactor the Crystal Codex desktop-controlled watcher/controller into a small, explicit execution state machine so the UI reflects the real Codex lifecycle instead of stale or inferred fields. This phase includes both the execution-chain fix and a simplified user-facing UI. Do not execute any P2A/business phase.

## Why Terra / High
This phase changes core asynchronous execution state, process truth checks, finalization, retry/completion semantics, and controller rendering. A mistake could cause duplicate execution, missed tasks, false RUNNING/COMPLETED states, or unsafe recovery. Use Terra / High.

## Open-source-first architecture note
Before changing code, create a short `outputs/agent-watcher-v1.4-oss-pattern-audit.md` and compare the needed pattern with:
- GitHub Actions Runner: listener/worker lifecycle separation; job received != worker running.
- RunWisp-style run metadata: explicit start/end/exit/duration and current-vs-history separation.
- TaskFerry-style task/run identity: status/result/logs as separate concepts.
- HomeRun-style desktop UX: current task + execution state + logs entry only.
- PsUi-style principle: long-running work separated from UI thread; UI consumes authoritative state rather than guessing.

For each source write only `REUSE`, `ADAPT`, `DO NOT USE`. Do not install any dependency, daemon, service, web framework, REST API, queue, WebSocket, Redis, or third-party scheduler.

## Core semantic separation
Keep three distinct concepts:

1. Authorized Task
- Source: `agent/GPT_NEXT_TASK.md`
- `Status: authorized` means only that the task is allowed to run.
- Authorized MUST NOT be treated as RUNNING.

2. Active Run
- A specific real Codex execution instance.
- Must have a unique run identity and real process evidence.

3. Completion Evidence
- Source: `outputs/GPT_HANDOFF.json` plus Git/worktree verification.
- Exit code 0 alone is NOT completion.

## Authoritative execution states
Use a single watcher-owned state machine. Suggested internal states:
- IDLE
- SYNCING
- READY
- STARTING
- RUNNING
- FINALIZING
- COMPLETED
- RETRY_WAIT
- BLOCKED

Equivalent names are acceptable only if semantics remain explicit and documented.

The Controller must consume watcher authoritative state. Do not reimplement lifecycle logic independently in the UI.

## Run identity and local state
Continue using the existing gitignored local state JSON. Add only the minimum compatible fields required for a real run record, for example:
- active_run_id
- active_fingerprint
- active_phase
- run_started_at_utc
- run_finished_at_utc
- process_id
- process_start_time_utc
- run_stage
- exit_code
- finalization_required
- finalization_started_at_utc
- finalization_finished_at_utc
- last_error_code
- last_error_summary

`active_run_id` may be UUID or fingerprint + start timestamp.

Existing `.agent-state/watcher-state.json` fields from V1.3/V1.3.1 must remain backward-compatible. Do not require the user to delete state. Old completed fingerprints must not cause duplicate execution after migration.

## Real RUNNING truth check
Controller/watcher must not display RUNNING merely because `lastRunStatus=running` or a stale PID exists.

At minimum verify:
- PID exists
- process start time matches the recorded start time

If practical without brittle dependencies, also validate executable/command-line identity for the Codex process. This is to prevent Windows PID reuse from producing false RUNNING.

If the process is gone, RUNNING must end and transition according to actual lifecycle evidence.

## Clean-worktree discovery flow
Preserve the V1.3.1 sync-order fix:

LOCK
-> inspect worktree
-> if clean: fetch origin/main
-> fast-forward-only sync
-> re-read `agent/GPT_NEXT_TASK.md`
-> evaluate fresh authorized fingerprint
-> completion check
-> retry/block check
-> create Active Run
-> STARTING
-> launch Codex
-> RUNNING

Do not regress this ordering.

Dirty worktree must never fetch/merge.

## Finalization semantics
Fix the current real failure mode.

When the initial Codex execution exits 0:

- If worktree is clean, verify matching completed handoff and completion conditions.
- If worktree is dirty and the dirty snapshot is exactly the watcher-observed output from this run that started from a clean baseline, this is NOT a generic failure and must NOT consume retry count.

Instead transition immediately to:
`FINALIZING`

Use the existing watcher-owned fixed finalization prompt, with these boundaries:
- read `AGENTS.md` and current `agent/GPT_NEXT_TASK.md`
- inspect exact dirty changes
- stop if any dirty file is unrelated or ambiguous
- preserve valid completed work; do not redo analysis
- complete only missing validation, handoff, commit, and push
- use `C:\Program Files\Git\cmd\git.exe` if needed
- require clean worktree at end
- stop after the current phase

Prefer finalization in the SAME watcher cycle after the initial Codex exits 0 and the exact eligible dirty snapshot is observed. Do not force a 5-minute wait merely to finalize the same run.

Only a true execution failure or finalization failure should enter retry/backoff logic.

## Retry rules
Differentiate:

A. Business execution failure
- initial Codex exit != 0

B. Finalization failure
- finalizer exit != 0, or finalization cannot be verified safely

Keep:
- max 2 automatic retries per fingerprint
- >=5 minute backoff
- after limit => BLOCKED
- no tight loops
- one Codex process at a time

Initial exit 0 + exact eligible dirty snapshot MUST NOT consume retry count.

## Completion criteria
COMPLETED requires all relevant checks, at minimum:
1. run corresponds to current authorized phase/fingerprint
2. `outputs/GPT_HANDOFF.json` phase matches
3. handoff status is `completed`
4. worktree is clean
5. the completion commit is present in local Git history/HEAD as appropriate
6. if remote verification is enabled, `origin/main` contains the completion commit

Do not equate exit code 0 with COMPLETED.

If `GPT_NEXT_TASK.md` still says the phase is authorized but matching handoff is completed, do not relaunch it. Show the task as completed until a newer authorized fingerprint appears. Do not auto-edit `GPT_NEXT_TASK.md`; GPT remains owner of the task file.

## Controller UI redesign
The current interface is too technical and must be replaced with a minimal human-readable UI.

Main window should show only:
- 自动接单: 已开启 / 已关闭
- 状态
- 当前任务
- 最近检查
- 运行时间 (only when active)
- optional retry countdown when waiting
- optional concise reason when blocked

Buttons only:
- 开启自动接单
- 关闭自动接单
- 立即检查
- 查看日志

Do not show on the main UI:
- PID
- fingerprint
- retry 0/2
- technical state key
- BACKOFF
- AUTHORIZED
- CONTROLLER RUNNING
- commit SHA
- UTC/Z timestamps

### Chinese state mapping
Internal -> UI:
- IDLE / READY => 空闲
- SYNCING => 正在检查新任务
- STARTING => 正在启动任务
- RUNNING => 执行中
- FINALIZING => 正在完成任务
- COMPLETED => 已完成
- RETRY_WAIT => 等待重试
- BLOCKED => 需要处理

### Task name rendering
Internal phase example:
`P2A-3F1-REFERENCE-SYNTHESIS-SCHEMA`

UI may render:
`P2A-3F1 · Reference Synthesis Schema`

Do not build a large translation table. Keep phase code and make the remainder readable.

## Local time display
State may remain UTC internally.

All user-visible timestamps must convert using the Windows current local timezone, not a hard-coded Germany/UTC+2 assumption. Daylight saving must work automatically.

Examples:
- `22:18:32`
- or `2026-08-23 22:18:32` when date is useful

Never show `Z` in the main UI.

## UI refresh behavior
The Controller must refresh authoritative state:
- on open
- after Enable
- after Disable
- after Check once
- after watcher cycle returns
- via a lightweight local-only UI refresh timer

A 1-second local UI timer is allowed only for:
- reading local state JSON
- checking tracked process truth
- updating elapsed runtime

It must NOT:
- fetch GitHub
- run watcher sync
- launch Codex
- access network

Network behavior remains:
- AUTO OFF => zero periodic network
- Controller closed => zero periodic network
- AUTO ON => one watcher poll every 300000 ms / 5 minutes
- `立即检查` => one user-triggered watcher check

Controller should not duplicate watcher lifecycle decisions.

## Architecture constraints
Keep the current architecture:
Desktop WinForms session controller + one-shot watcher + local state file.

Forbidden:
- Windows Service
- Task Scheduler
- startup auto-enable
- daemon
- REST API
- WebSocket
- named pipe
- Redis
- SQLite job queue
- third-party job/scheduler framework
- new dependencies
- admin requirement
- system PATH changes
- sandbox/approval weakening

## Real lifecycle smoke validation
After synthetic tests pass, run one safe real lifecycle smoke test. Do NOT use a P2A/business task.

Use a dedicated synthetic phase, e.g.:
`AGENT-WATCHER-V1.4-LIFECYCLE-SMOKE`

The smoke task may only:
1. create one explicitly allowed smoke output
2. write a matching completed handoff
3. commit
4. push
5. stop

Observe the real lifecycle:
new authorized task synced
-> STARTING
-> RUNNING with a real process
-> FINALIZING if dirty output remains
-> COMPLETED

Validate:
- RUNNING only while real process exists
- process exit ends RUNNING
- finalization happens automatically when eligible
- no manual recovery required
- final worktree clean
- completion commit exists remotely
- Controller ends on `已完成`

Clean/archive smoke artifacts as designed so repository ends clean. Do not execute P2A or any other business logic during the smoke.

## Required tests
At minimum prove:
1. authorized != running
2. STARTING -> RUNNING only after real process launch
3. stale PID != RUNNING
4. PID reuse/start-time mismatch != RUNNING
5. live matching process => RUNNING
6. exit 0 + clean + matching handoff => COMPLETED
7. exit 0 + exact watcher-observed dirty snapshot => FINALIZING without consuming retry
8. finalization success => COMPLETED
9. finalization failure => RETRY_WAIT
10. retry wait >=5 min
11. max retry 2 => BLOCKED
12. unrelated dirty file => BLOCKED
13. completed authorized task does not relaunch
14. remote newer authorized fingerprint is discovered after sync
15. non-fast-forward sync blocks
16. lock prevents overlap
17. AUTO defaults OFF
18. AUTO OFF => zero periodic network
19. controller closed => zero periodic network
20. AUTO ON poll remains 300000 ms
21. lightweight UI refresh does no network
22. UTC -> local time works using system timezone
23. Chinese status mapping is correct
24. current task follows latest synced task
25. completed task UI does not show `authorized`
26. main UI does not expose PID/fingerprint/retry/internal state
27. Check once immediately refreshes UI
28. all V1.3.1 watcher regressions pass
29. `npm test` passes
30. `npm run validate` passes
31. `git diff --check` passes

Use synthetic/mock/TestMode for automated tests. Only the dedicated lifecycle smoke may launch a real Codex process.

## Resource impact requirement
No new resident background process or network poll is allowed.

Expected delta:
- small local JSON/process reads from UI refresh timer
- negligible CPU when idle
- same WinForms controller process class
- logs/state remain small
- no additional periodic network beyond existing 5-minute watcher poll

Report actual measured/observable behavior where available. Do not invent RAM numbers.

## Allowed changes
- `tools/agent-watcher/watcher.ps1`
- `tools/agent-watcher/controller.ps1`
- `tools/agent-watcher/test-watcher.ps1`
- focused controller/state tests
- `tools/agent-watcher/README.md`
- minimal backward-compatible local state handling
- dedicated smoke-test task/artifact files only as required and safely cleaned/archived
- `outputs/agent-watcher-v1.4-oss-pattern-audit.md`
- `outputs/GPT_HANDOFF.json`
- `outputs/handoffs/AGENT-WATCHER-V1.4-EXECUTION-STATE-MACHINE.json`

## Forbidden
- P2A-3F1 redo
- migration 010
- database/schema/business data changes
- reference synthesis content
- image/material/supplier/market/pattern/theme/preference changes
- OpenViking/FiftyOne/vector work
- dependency additions
- deleting/resetting/cleaning unknown user changes

## Before work
Run `git status --short` first.

If the worktree is not clean:
- do not reset
- do not clean
- do not discard
- stop and report the exact files

## Reporting
Update:
- `outputs/GPT_HANDOFF.json`
- `outputs/handoffs/AGENT-WATCHER-V1.4-EXECUTION-STATE-MACHINE.json`

Handoff must include:
- OSS patterns borrowed
- authoritative state machine
- run identity fields
- real process truth check
- finalization behavior
- retry behavior
- completion criteria
- UI fields and Chinese mapping
- local-time conversion behavior
- real smoke lifecycle timestamps/result
- tests
- resource impact delta
- boundary check
- remaining risks
- implementation commit

After push, STOP. Do not start any P2A/business phase automatically.

Final response only:

PHASE:
AGENT-WATCHER-V1.4-EXECUTION-STATE-MACHINE

STATUS:
COMPLETED / BLOCKED

STATE MACHINE:
PASS / FAIL

REAL RUN TRACKING:
PASS / FAIL

AUTO FINALIZATION:
PASS / FAIL

UI:
PASS / FAIL

LOCAL TIME:
PASS / FAIL

REAL SMOKE:
PASS / FAIL

TESTS:
<result>

RESOURCE IMPACT:
<brief result>

COMMIT:
<sha or NONE>

WORKTREE CLEAN:
YES / NO

BLOCKER:
NONE or exact reason
