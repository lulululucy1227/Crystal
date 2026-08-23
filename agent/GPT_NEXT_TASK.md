# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1

Phase: AGENT-WATCHER-V1.3-FINALIZATION
Status: authorized
Model: Luna
Strength: Medium

## Objective
Fix the repeated completion-path failure in the Crystal desktop-controlled watcher: Codex successfully completes an authorized task and exits with code 0, but leaves only task-owned uncommitted report/handoff files, causing completion verification to stop on the generic dirty-worktree guard.

This phase is watcher/controller infrastructure only. Do not execute any business phase, do not create migration 009, and do not modify database/schema/image/semantic data.

## Confirmed real failure pattern
This has now occurred repeatedly, including P2A-3F0:
1. watcher starts from a clean worktree and detects a new authorized fingerprint;
2. watcher launches Codex;
3. Codex finishes the phase successfully and exits 0;
4. the run leaves only phase-owned output/handoff changes uncommitted;
5. watcher attempts completion verification, sees a dirty worktree, and blocks before it can finalize/verify the phase;
6. manual recovery then confirms the dirty files are entirely task-owned, commits/pushes them, and the worktree becomes clean.

For P2A-3F0 the task-owned dirty files were exactly:
- outputs/p2a-3f0-reference-synthesis-fit.md
- outputs/GPT_HANDOFF.json
- outputs/handoffs/P2A-3F0-REFERENCE-SYNTHESIS-FIT.json

Manual recovery completed successfully and pushed commit f27e2cc853bd3cc17ff446547f5570794bd876b9.

## Required behavior
Preserve the default safety rule:
unknown dirty worktree => BLOCK.

Add a narrowly-scoped automatic finalization/recovery path only when the watcher itself can prove ALL of the following:
- the authorized fingerprint was launched from a clean baseline;
- the same fingerprint is still current/authorized;
- Codex exited 0 or an explicitly retryable finalization attempt is in progress;
- no verified matching completed handoff is yet visible;
- the post-run dirty file set was observed by the watcher immediately after that exact run;
- the current dirty file set exactly matches the persisted post-run set for that fingerprint;
- there were no pre-existing dirty files at launch;
- no file outside that observed set appeared or changed afterward.

Do not infer ownership from filenames or task prose. The watcher may trust only state it observed from a clean baseline for the exact run/fingerprint.

## Finalization recovery launch
When the above eligibility is satisfied, allow one watcher-owned recovery Codex launch for the same fingerprint even though the worktree is dirty.

Use a fixed prompt owned by the watcher. The prompt must instruct Codex to:
- read AGENTS.md and the current agent/GPT_NEXT_TASK.md;
- inspect the exact existing dirty changes;
- stop if any dirty file is unrelated or ambiguous;
- preserve valid existing work and do not redo completed analysis;
- complete only missing validation/handoff/commit/push work for the current phase;
- use the full Git for Windows path if needed: C:\Program Files\Git\cmd\git.exe;
- ensure worktree clean at the end;
- stop after this phase.

Do not pass task text as shell input.
Do not auto-run arbitrary commands derived from task content.

## State / retry rules
Persist only the minimum local gitignored state needed for the exact fingerprint/run:
- launch baseline commit SHA
- clean baseline status marker
- observed post-run dirty file set
- whether finalization recovery has been attempted
- finalization retry count / backoff fields as needed

Keep existing retry policy:
- max 2 automatic retries per fingerprint overall
- >=5 minute backoff
- after limit => BLOCKED / NEEDS REVIEW
- no tight loops
- at most one Codex process at a time

Successful matching completed handoff + clean worktree must clear interrupted/finalization state for that fingerprint.

## Controller status fix
The desktop controller currently can show `STATE: BACKOFF` while a Codex PID is actively running. Fix only the status presentation needed for clarity.

Desired precedence:
- active launched Codex process is alive => RUNNING
- matching completed handoff verified => COMPLETED
- retry waiting => BACKOFF
- retry limit / unsafe dirty state => BLOCKED
- no active task/error => READY

If practical, show `RUNNING FOR` elapsed duration while a tracked Codex PID is alive. Do not add a resident background service or extra polling beyond the existing controller session timer.

## Preserve existing desktop-control guarantees
Do not regress:
- controller starts AUTO MODE OFF
- no Task Scheduler requirement
- no Windows service
- no startup auto-enable
- no WakeToRun
- no admin requirement
- controller closed => zero periodic polling
- AUTO OFF => zero periodic network polling
- ON poll interval remains 5 minutes
- watcher one-shot processes exit after each cycle
- watcher lock prevents overlap
- log cap remains about 4 MiB total
- full Git path preference remains C:\Program Files\Git\cmd\git.exe
- workspace-write sandbox and on-request approval remain unchanged

## Tests
Use synthetic/mock/dry-run Codex only. Do not execute any real business task.

Add/adjust tests proving at minimum:
1. first launch still requires clean worktree
2. exit 0 + exact watcher-observed dirty set + same fingerprint enters finalization recovery
3. dirty set changed/broadened after run => BLOCKED
4. different fingerprint => BLOCKED
5. pre-existing dirty baseline => no auto-finalization
6. recovery prompt is fixed watcher-owned text and preserves existing changes
7. successful recovery + matching completed handoff + clean worktree clears recovery state
8. failed recovery obeys >=5 min backoff and max retry 2
9. unknown dirty worktree still blocks
10. lock/sandbox/approval behavior unchanged
11. controller shows RUNNING while tracked Codex process is alive, not BACKOFF
12. controller returns to COMPLETED/BACKOFF/BLOCKED appropriately after exit
13. existing watcher/controller regression tests still pass

## Boundaries
Allowed:
- tools/agent-watcher/watcher.ps1
- tools/agent-watcher/controller.ps1
- focused watcher/controller tests
- minimal README update
- outputs/GPT_HANDOFF.json
- outputs/handoffs/AGENT-WATCHER-V1.3-FINALIZATION.json

Forbidden:
- migration 009
- any DB/schema/data/image/semantic modification
- P2A-3F0 redo
- reference synthesis content
- business task execution during tests
- Windows Task Scheduler/service/startup changes
- admin/system PATH changes
- dependency additions
- sandbox/approval weakening
- reset/clean/discard of unknown user changes

## Reporting
Update:
- outputs/GPT_HANDOFF.json
- outputs/handoffs/AGENT-WATCHER-V1.3-FINALIZATION.json

Include:
- exact finalization eligibility rule
- persisted local state fields
- fixed recovery prompt behavior
- controller state precedence
- tests
- resource impact delta (should be negligible; no new resident process)
- remaining edge cases
- boundary check

After push, STOP. Do not authorize migration 009 or any business phase automatically.