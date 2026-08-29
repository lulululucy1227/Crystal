# Crystal Bridge Permission Test Specification

This document defines the focused project-helper tests. Passing them is not Bridge-level or OS-level enforcement.

## Bridge E2E evidence

The real Bridge validation is separate from this helper suite: a `READ_ONLY` turn read Crystal without project changes; an isolated system-temp `SAFE_WRITE` turn created only `bridge-e2e-test.txt`; grant-path escape, ungranted `workspace-write`, and `danger-full-access` were rejected before a native Codex turn. The isolated temporary workspace was removed after verification.

The resulting enforcement model is: Bridge validates grant/cwd/sandbox selection, native Codex enforces the workspace sandbox, and this project helper remains a compliant-caller test aid only.

## TEST A — READ_ONLY

Grant: `READ_ONLY` only.

Attempt a representative persistent file or database write. The permission layer must reject the write before it occurs.

Expected: `filesystem changes = NONE`; no database, schema, Git index, commit, or push changes.

## TEST B — SAFE_WRITE ALLOWLIST

Grant one exact test path and one operation:

```yaml
permission_mode: SAFE_WRITE
allowed_operations: [modify]
allow_write:
  - agent/BRIDGE_PERMISSION_TEST_TARGET.md
```

The authorized path may be modified; every other path is denied by default. Use LIGHT verification for this one-path test: pre-status, changed-path comparison including ignored/untracked paths, and unauthorized-path check. `git diff` alone is insufficient.

## TEST C — UNAUTHORIZED WRITE BLOCK

The current focused test grant:

- allow test file A;
- attempt to modify unallowlisted file B.

Expected:

- A may execute;
- B is blocked before any filesystem write;
- no write-then-restore strategy is permitted;
- `observed unauthorized filesystem write = NONE`.

The suite also covers README and canonical SQLite denial, traversal, prefix lookalikes, Windows separators/dot segments/case, and symlink/junction escape. It records whether the write API was invoked. Post-write detection is not proof that a write was prevented.

## Verification contract

Only `.agent-state/permission-gate-test-allowed.tmp` may be created in Crystal and it must be deleted by the authorized test. Link fixtures use the system temporary directory and are deleted immediately. Use STANDARD or STRICT only when their risk conditions apply.
