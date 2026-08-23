# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1

Phase: AGENT-WATCHER-V1.1-RECOVERY
Status: authorized
Model: Luna
Strength: Low
Trigger-Nonce: 2026-08-23T16:29+02:00

## Objective
Add the smallest safe interrupted-task recovery behavior to the Crystal watcher so an authorized task that was auto-launched, exited before completion, and left task-owned uncommitted changes does not require manual user intervention every time.

This phase is watcher infrastructure only. P2A-2R is already completed; do not modify its semantic output or rerun its importer.

## Confirmed failure mode to solve
Observed real sequence:
1. watcher detected a new authorized task and auto-launched Codex;
2. Codex produced valid task-owned files but exited before commit/handoff completion;
3. watcher then saw a dirty worktree and blocked all future launches;
4. manual recovery later verified all dirty files belonged to the same task and safely completed it.

Current generic dirty-worktree fail-safe is correct for unknown local changes, but incomplete for this same-task interrupted-run case.

## Required behavior
Keep the default rule: unknown dirty worktree => block.

Add a narrowly-scoped recovery path only when ALL of the following are true:
- current task is `Status: authorized`;
- current task fingerprint matches the watcher fingerprint that previously launched and did not complete;
- the prior run did not produce a verified matching completed handoff;
- the worktree is dirty;
- the watcher can identify the dirty file set as belonging only to the interrupted task by using a locally persisted launch baseline and post-run git status/diff metadata, without guessing semantics;
- no unrelated pre-existing dirty files were present at launch time.

If any condition is uncertain, remain blocked and require user confirmation.

## Recovery mechanism
Prefer a minimal deterministic mechanism such as:
- before launching Codex, persist the clean baseline commit SHA and baseline `git status --porcelain` (expected empty);
- after an unverified/failed run, persist the resulting dirty file list associated with that fingerprint;
- on a later cycle, if the same fingerprint is still authorized and the dirty file set exactly matches the persisted interrupted-run file set, allow one recovery Codex launch with an explicit recovery prompt;
- the recovery prompt must instruct Codex to inspect and continue only the existing authorized phase, preserve current changes, finish tests/handoff/commit/push, and stop;
- if the dirty file set changes unexpectedly, becomes broader, or includes unrelated files, block.

Do NOT infer file ownership merely from filenames. Ownership here means the watcher itself observed the files appear from a clean baseline during the exact previous Codex run for the same fingerprint.

## Safety requirements
Preserve:
- workspace-write sandbox
- on-request approvals
- clean-worktree requirement for first launch
- single-process lock
- fetch + fast-forward-only sync when clean
- no reset/clean/discard behavior
- no auto-approval
- no arbitrary shell execution from task text

Never run recovery against a different task fingerprint.
Never delete or overwrite unknown local changes.
Never auto-recover if the previous baseline was already dirty.

## Retry/backoff
Reuse the existing five-minute retry/backoff behavior where appropriate.
Do not create a tight loop.
Allow at most one Codex process at a time.

## Recovery launch prompt
Use a fixed watcher-owned recovery instruction, not task text as shell input. It should tell Codex to:
- read AGENTS.md and the current GPT_NEXT_TASK.md;
- inspect the existing worktree changes;
- continue only the current authorized phase;
- preserve valid existing work rather than restarting;
- stop if any dirty file appears unrelated or ambiguous;
- complete required tests/handoff/commit/push;
- stop after that phase.

## Tests
Add focused tests proving at minimum:
1. first launch still requires a clean worktree
2. dirty worktree with no matching interrupted-run metadata remains blocked
3. same fingerprint + exact persisted interrupted dirty set can enter recovery mode
4. changed/broadened dirty set blocks recovery
5. different task fingerprint blocks recovery
6. interrupted run whose baseline was dirty cannot be auto-recovered
7. successful matching completed handoff clears recovery state
8. failed recovery remains retryable after backoff
9. lock/approval/sandbox behavior remains unchanged
10. existing watcher tests continue to pass

Use dry-run/mock Codex launch for tests. Do not execute any business task during watcher tests.

## Local state
Extend `.agent-state/watcher-state.json` only as much as necessary. Runtime state remains gitignored.

## Boundaries
Allowed:
- tools/agent-watcher/watcher.ps1
- watcher tests
- minimal README changes
- AGENT-HANDOFF files

Forbidden:
- P2A-2R rerun or semantic changes
- DB/schema/data/image changes
- business code changes
- GitHub Actions/cloud runner replacement
- new dependencies
- sandbox/approval weakening

## Reporting
Update:
- `outputs/GPT_HANDOFF.json`
- `outputs/handoffs/AGENT-WATCHER-V1.1-RECOVERY.json`

Include:
- exact interrupted-run state recorded
- exact eligibility rule for recovery
- recovery prompt behavior
- tests
- any remaining edge cases
- boundary check

After push, stop. Do not authorize or start the next business phase automatically.
