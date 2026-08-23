# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1

Phase: AGENT-WATCHER-V1.4-PAUSE-AND-RECOVER
Status: authorized
Model: Luna
Strength: Low

## Objective
Stop spending development effort on the automatic watcher channel for now. Safely preserve and validate the useful V1.4 work already present from the immediately preceding blocked run, prepare it for one-time manual Git finalization outside the Codex sandbox, and then STOP. The project priority returns to crystal data collection and workbench/business development after this recovery.

## Why Luna / Low
No new architecture is requested. Do not implement Host Git Finalizer, do not redesign the state machine, and do not run another real smoke. This is a bounded recovery/validation task only.

## Current known situation
The preceding V1.4 run reported:
- STATE MACHINE: PASS
- REAL RUN TRACKING: PASS
- UI: PASS
- LOCAL TIME: PASS
- AUTO FINALIZATION: FAIL
- REAL SMOKE: FAIL
- blocker: Codex workspace-write sandbox cannot write `.git/index.lock`
- worktree is dirty with V1.4-owned changes

Treat the automatic channel as DEFERRED. Do not try to solve `.git/index.lock` now.

## Required actions
1. Run `git status --short`, `git diff --stat`, and inspect the diff.
2. If every dirty file is clearly owned by the immediately preceding `AGENT-WATCHER-V1.4-EXECUTION-STATE-MACHINE` attempt, preserve them and continue. If any unrelated/ambiguous user file is present, STOP and report it; do not reset/clean/stash/discard anything.
3. Do NOT implement Host Git Finalizer.
4. Do NOT rerun a real lifecycle smoke.
5. Do NOT attempt git add/commit/push from Codex sandbox.
6. Keep the useful already-implemented V1.4 pieces only if they are internally coherent and tests support them: state-machine semantics, real process truth tracking, simplified UI, local-time display. Do not expand them.
7. Run only the minimum validation needed for these already-present changes:
   - focused watcher/controller synthetic tests
   - `npm test`
   - `npm run validate`
   - `git diff --check`
8. Update `outputs/GPT_HANDOFF.json` and `outputs/handoffs/AGENT-WATCHER-V1.4-PAUSE-AND-RECOVER.json` with status `ready_for_manual_finalize` (not `completed`) and record:
   - exact dirty files
   - tests/checks
   - that automatic finalization is intentionally deferred
   - that no business/P2A/database data changed
   - that the next project priority is business/data work, not watcher work
9. Print the exact safe one-time commands the user should run in ordinary PowerShell, using `C:\Program Files\Git\cmd\git.exe`, to stage ONLY the listed V1.4-owned files, commit once, and push. Do not use `git add .`, `git add -A`, reset, clean, force, rebase, or merge.
10. STOP. Do not start P2A or any other phase automatically.

## Boundaries
Allowed only:
- existing V1.4 watcher/controller files already dirty from the blocked run
- minimal fixes strictly required to make those existing changes pass their synthetic tests
- `outputs/GPT_HANDOFF.json`
- `outputs/handoffs/AGENT-WATCHER-V1.4-PAUSE-AND-RECOVER.json`

Forbidden:
- Host Git Finalizer implementation
- new watcher architecture
- new real smoke
- new dependencies
- service/daemon/scheduler/startup work
- sandbox/approval weakening
- database/schema/business data changes
- P2A/reference synthesis/material/supplier/market/image work
- discarding unknown user changes

## Final response
PHASE:
AGENT-WATCHER-V1.4-PAUSE-AND-RECOVER

STATUS:
READY_FOR_MANUAL_FINALIZE / BLOCKED

USEFUL V1.4 CHANGES:
PASS / FAIL

TESTS:
<result>

DIRTY FILES:
<exact list>

MANUAL FINALIZE COMMANDS:
<exact safe commands or NONE>

BUSINESS DATA CHANGED:
NO / YES

BLOCKER:
NONE or exact reason
