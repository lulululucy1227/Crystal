# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1

Phase: AGENT-WATCHER-V1-HARDENING
Status: authorized
Model: Luna
Strength: Low

## Objective
Harden the watcher so a failed or approval-blocked Codex run is not permanently marked completed and silently skipped. Do not execute P2A-2R in this phase.

## Why this is required
Current `tools/agent-watcher/watcher.ps1` sets `lastCompletedFingerprint` after Codex exits regardless of exit code. That can lose an authorized task if Codex exits non-zero, loses provider connectivity, or stops before completing the required GitHub handoff.

## Required behavior
1. A fingerprint is considered completed only after successful task completion evidence is present.
2. At minimum, do NOT set `lastCompletedFingerprint` when Codex exits non-zero.
3. Prefer verifying completion by re-syncing/reading `outputs/GPT_HANDOFF.json` after Codex exits and confirming the handoff phase equals the authorized task phase and status is `completed` before marking the fingerprint completed.
4. If completion cannot be verified:
   - retain clear failure state/logging;
   - make the task retryable;
   - avoid a tight retry loop. Use a small local retry/backoff timestamp or equivalent simple guard.
5. Do not auto-approve Codex actions or weaken sandbox/approval policy.
6. Preserve single-run lock and clean-worktree safeguards.
7. Keep implementation small and Windows-native. No new dependencies.

## Tests
Add focused tests proving:
- exit code 0 without matching completed handoff is not marked completed;
- non-zero exit is not marked completed;
- matching completed handoff marks fingerprint completed;
- failed fingerprint can be retried after backoff;
- duplicate completed fingerprint remains skipped;
- existing watcher safety tests still pass.

## Boundaries
Allowed: watcher source/tests/docs, local-only runtime-state format if needed, AGENT-HANDOFF files.
Forbidden: P2A-2R execution, DB/schema/data/image changes, GitHub Actions/cloud runner, new dependencies, approval bypass.

## Reporting
Update `outputs/GPT_HANDOFF.json` and archive `outputs/handoffs/AGENT-WATCHER-V1-HARDENING.json`.
Keep the handoff concise. Include exact retry/completion logic, tests, and any local action still required.

After push, stop. Do not restore or execute P2A-2R automatically.