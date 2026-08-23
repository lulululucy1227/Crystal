# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1

Phase: AGENT-WATCHER-V1.3.1-SYNC-ORDER
Status: authorized
Model: Luna
Strength: Low

## Objective
Fix a specific polling-order bug in the Crystal watcher that prevents it from ever fetching a newly authorized GitHub task when the local `GPT_NEXT_TASK.md` still contains the fingerprint of a previously completed task.

This is watcher infrastructure only. Do not execute P2A-3F1, do not modify database/schema/data/image/semantic content, and do not add new dependencies.

## Confirmed root cause
Current `Invoke-WatcherOnce` reads the local task and then checks:
- `lastCompletedFingerprint == task.Fingerprint` => immediately logs `duplicate completed fingerprint skipped` and returns.

That duplicate-completed return occurs BEFORE `Sync-CrystalRepository`.

Observed result: after V1.3 completed locally, GitHub was updated to a new authorized `P2A-3F1` task, but every five-minute poll kept returning on the old completed V1.3 fingerprint and therefore never ran `git fetch` / fast-forward. The controller appeared alive but could never discover the new task.

## Required fix
Reorder the clean-worktree path so repository synchronization happens before duplicate-completed / blocked-fingerprint decisions that depend on the task fingerprint.

Minimum intended flow for a clean worktree:
1. acquire lock
2. read state
3. if sync is enabled, perform clean-worktree fetch + fast-forward-only sync
4. re-read `agent/GPT_NEXT_TASK.md` AFTER sync
5. update state `lastPhase/lastStatus/lastPollAt` from the fresh task
6. only then evaluate authorized status, completed duplicate, blocked fingerprint, backoff, and launch

For a dirty worktree/finalization-recovery path, preserve the existing safety logic: do not fetch/pull over dirty state; recovery eligibility must continue using the exact current local fingerprint and persisted watcher-observed snapshot.

Do not weaken:
- clean-worktree safety
- exact finalization snapshot proof
- lock/single-process behavior
- fast-forward-only sync
- retry/backoff/cap
- sandbox or approval policy
- controller default OFF / five-minute session polling

## Tests
Add/adjust focused synthetic tests proving at minimum:
1. local task fingerprint is completed-old, remote has a new authorized task => watcher syncs first and detects the new task instead of returning duplicate old fingerprint
2. if remote task is unchanged and already completed => duplicate skip still works after sync
3. dirty worktree still does not fetch/pull
4. eligible finalization recovery still works
5. non-fast-forward sync still blocks
6. existing watcher/controller tests pass

No real business task execution in tests.

## Deliverables
Allowed changes only:
- `tools/agent-watcher/watcher.ps1`
- focused watcher tests
- minimal README note if needed
- `outputs/GPT_HANDOFF.json`
- `outputs/handoffs/AGENT-WATCHER-V1.3.1-SYNC-ORDER.json`

## Reporting
Handoff must include:
- exact root cause
- exact ordering change
- tests
- boundary check
- whether the watcher can now discover a new GitHub task after a completed local fingerprint

After push, STOP. Do not restore or execute P2A-3F1 automatically in this phase.