# CRYSTAL BRIDGE PERMISSION PROTOCOL

Version: V2
Protocol relationship: extension of `AGENT-HANDOFF-V1`, not a parallel handoff system.

## 1. Default deny

- No persistent write is allowed unless the current task grant names both a capability and an exact path or resource.
- Unnamed capabilities and paths are denied by default.
- The Agent and Bridge must never upgrade their own permission.
- A grant may come only from explicit user authorization or a GPT-generated task grant grounded in that authorization.

## 2. Capability model

The capabilities are not a simple automatic ladder:

- `READ_ONLY`: read and inspect only.
- `SAFE_WRITE`: write only the explicitly allowlisted paths and operations.
- `HIGH_RISK`: individually authorized high-impact non-database operations.
- `DATABASE_WRITE`: independently authorized writes to the canonical database.

A task may require more than one capability. In particular, schema migration and destructive canonical operations require both `HIGH_RISK` and `DATABASE_WRITE`.

## 2A. Enforcement roles

- Layer 1: GPT/user authorization declares the business operation, `cwd`, and any exact path context.
- Layer 2: Local-Codex-Bridge validates the minimal grant, requires an existing `cwd`, maps the grant to an explicit native sandbox and approval policy, defaults a missing grant to `read-only`, and rejects caller escalation and `danger-full-access` before a native turn starts.
- Layer 3: native Codex sandbox is the primary filesystem enforcement boundary. It enforces `read-only` or `workspace-write` at workspace scope; it is not an exact-file allowlist.
- Layer 4: this Crystal protocol supplies business authorization, no-self-escalation, and post-write audit.
- This project protocol supplies business authorization, no-self-escalation, and post-write audit. It is not an OS sandbox.
- `tools/bridge_permission_gate.mjs` is retained as a test/helper for compliant Node callers, not as chain-wide enforcement: Codex shell commands, patches, PowerShell, Python, Git, SQLite, and other bypassing callers are outside it.

`allow_write` is therefore a validated soft policy/audit boundary, not an assertion that native Codex received a per-file filesystem ACL. Database/table restrictions remain Layer 4 responsibilities.

## 3. READ_ONLY

Allowed: directory/file reads, code and documentation review, Git read commands, read-only SQLite connections, schema inspection, and state summaries.

Forbidden: every persistent write, SQLite mutation, schema/migration change, dependency change, Git index write, commit, push, delete, restore, reset, checkout, clean, or build/cache-producing command.

## 4. SAFE_WRITE

Every grant must declare:

```yaml
permission_mode: SAFE_WRITE
allowed_operations: [create, modify]
allow_write:
  - exact/relative/path.ext
forbid_write:
  - data/**
```

- `create`, `modify`, and `delete` are separate capabilities; `delete` is denied unless named.
- Exact file paths are required. Directory or glob permission does not imply permission for its contents.
- The default remains deny for SQLite, schema, migrations, dependencies, lockfiles, business code, Git index, commit, push, and destructive Git.
- `SAFE_WRITE` never implies `HIGH_RISK` or `DATABASE_WRITE`.

## 5. HIGH_RISK

Each item requires separate explicit authorization. Examples include migrations, schema changes, dependency changes, architecture-scale changes, large multi-file changes, deletion, security-sensitive changes, and destructive Git operations.

`HIGH_RISK` does not imply `DATABASE_WRITE`.

## 6. DATABASE_WRITE

`DATABASE_WRITE` is an independent capability because the canonical SQLite database is the product/data source of truth and has a staging → review → promotion workflow.

A database grant should declare:

```yaml
database_path: data/crystal-design.sqlite
allowed_tables: []
allowed_operations: []
forbidden_tables: []
input_source: exact source or artifact
expected_scope: exact semantic scope
expected_rows: exact count or bounded count
idempotency_strategy: exact replay key
transaction_requirement: required
integrity_verification: integrity_check and foreign_key_check
stop_conditions: []
```

`DELETE` requires a separate grant. `DATABASE_WRITE` does not imply schema, migration, Git, or dependency write. Schema migration and destructive canonical promotion require `DATABASE_WRITE + HIGH_RISK`.

## 7. Git capabilities

Git permissions are separate capabilities:

- `git_read`: status, diff, log, show, refs, tree, and remote read.
- `working_tree_write`: write allowlisted working-tree files.
- `index_write`: add, remove, or staged restore.
- `commit`: create a commit for an explicitly named path set.
- `push`: push an explicitly named remote and branch.
- `destructive_git`: checkout, reset, clean, rebase, force push, or equivalent.

`READ_ONLY` includes only `git_read`. Commit and push are never implied by task completion or by `AGENT-HANDOFF-V1`; they require explicit capabilities in the current grant.

## 8. Write verification

`git status` and `git diff` are insufficient because ignored and untracked files may be invisible. Select the lowest adequate level:

| Level | Use | Required verification |
| --- | --- | --- |
| `LIGHT` | one/few exact SAFE_WRITE paths | pre-status, changed-path comparison including ignored/untracked paths, unauthorized-path check |
| `STANDARD` | multi-file code change | LIGHT plus selected critical hashes and focused tests |
| `STRICT` | DATABASE_WRITE, HIGH_RISK, schema/migration, canonical data | STANDARD plus applicable transaction, integrity/FK checks, row counts, and relevant full hashes |

Every level requires `observed_changed_paths ⊆ expected_changed_paths`. Treat an unexpected path as a safety failure; stop further writes and never restore it automatically.

## 9. Change classification

Every report must distinguish:

```text
git_visible_changes
filesystem_changed_paths
ignored_or_untracked_changes
expected_changed_paths
observed_changed_paths
unauthorized_changed_paths
```

An authorized path may remain unchanged. Only the observed set must be a subset of the expected set.

## 10. Safety stop and continuation

An unauthorized change means `SAFETY_BOUNDARY_FAIL`. Do not reset, clean, checkout, restore, delete, or overwrite it. Read-only audit and reporting may continue.

Within a batch, `BLOCKED` or `USER_DECISION_REQUIRED` applies to the individual task. Continue later tasks that are independently safe under the current grant. Stop only when all remaining tasks require a new decision or authorization.

## 11. State machine and handoff integration

The permitted transitions are explicit grants, not self-escalation:

```text
READ_ONLY --user/GPT grant--> SAFE_WRITE
READ_ONLY --user/GPT grant--> HIGH_RISK
SAFE_WRITE --new user/GPT grant--> HIGH_RISK
any state --separate grant--> DATABASE_WRITE
```

`AGENTS.md` remains the static `AGENT-HANDOFF-V1` contract. `agent/GPT_NEXT_TASK.md` carries the per-phase authorization grant. `outputs/GPT_HANDOFF.json` carries execution evidence. These files must not form a second handoff protocol.

## 12. Required grant and handoff fields

Task grants should include `permission_mode`, `allowed_operations`, `allow_write`, `forbid_write`, `git_capabilities`, `database_capabilities`, and `high_risk_capabilities`. Empty or omitted capabilities are denied.

Handoffs should retain only the authorization reference, selected verification level, expected/observed changed paths, any unauthorized path, material test result, critical artifact result when required, and the next action. Do not repeat full snapshots or completed-task grants.

## 13. Project-level pre-write gate

`tools/bridge_permission_gate.mjs` is a project test/helper API. A compliant caller must invoke `authorizeOperation` before opening a target for `create`, `modify`, or `delete`; the API either returns `ALLOW` with a normalized in-repository path or throws `PERMISSION_DENIED`.

The gate enforces exact allowlist matching, operation separation, lexical root containment, and existing-parent realpath containment to reject path traversal and symlink/junction escape. It does not intercept arbitrary external tools automatically: callers that bypass the API must not be represented as pre-write protected.
