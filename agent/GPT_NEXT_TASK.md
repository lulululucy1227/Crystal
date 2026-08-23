# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1

Phase: P2A-3R-REFERENCE-SYNTHESIS-IMPORT
Status: authorized
Model: Terra
Strength: Medium

## Objective
Return to the crystal data/design mainline and import the GPT-authored four-reference synthesis input into the canonical reference-synthesis tables created by migration 009. Build only the smallest deterministic importer/preflight needed for this pilot, validate provenance strictly, perform one canonical import, prove replay idempotency, and STOP. Do not continue watcher/controller work.

## Why Terra / Medium
The input and schema are already fixed, but this phase writes canonical semantic rows and provenance links. The implementation boundary is narrow, yet mistakes could persist incorrect reference semantics, so use Terra / Medium.

## Authoritative inputs
Read and follow exactly:
- `inputs/p2a-3s1-reference-synthesis.json` — GPT-authored semantic source of truth
- `outputs/p2a-3s0-reference-evidence-map.json` — exact observation IDs and source metadata
- `migrations/009_p2a_reference_synthesis.sql`
- `outputs/handoffs/P2A-3F1-REFERENCE-SYNTHESIS-SCHEMA.json`

Expected references/assets:
- REF-000002 -> ASSET-000001, ASSET-000002
- REF-000006 -> ASSET-000015, ASSET-000016
- REF-000019 -> ASSET-000046, ASSET-000047, ASSET-000048
- REF-000025 -> ASSET-000064, ASSET-000065, ASSET-000066

Expected evidence baseline:
- 4 references
- 10 assets
- 45 image_visual_observation rows
- observation IDs exactly 1-45
- id sum 1035
- observed_value length sum 5479
- current synthesis assertion rows = 0
- current synthesis source rows = 0

## GPT-authored input boundaries
Do not rewrite, expand, reinterpret, summarize, or improve the semantic content in `inputs/p2a-3s1-reference-synthesis.json`.

The input intentionally:
- makes no mineral-species identification
- proposes no pattern changes
- proposes no theme changes
- does not fold user preference evidence into image-derived synthesis
- contains only image-observation-derived product_design/promotional_visual synthesis

Codex is the deterministic validator/importer only.

## Minimal implementation
Add the smallest importer script consistent with existing project conventions. Prefer a single script such as:
`scripts/import-p2a-reference-synthesis.mjs`

Do not introduce dependencies or a framework.

The importer must support at least:
- preflight/dry-run mode
- apply mode
- deterministic replay/idempotency verification

Reuse existing SQLite helpers/conventions where practical rather than creating a parallel data layer.

## Preflight requirements
Before any canonical write, reject the whole import if any condition fails:

1. contract_version is exactly `P2A-REFERENCE-SYNTHESIS-V1`
2. producer/version/run metadata are nonblank
3. reference set is exactly the four expected reference keys
4. expected_asset_keys for each reference exactly match canonical design_reference_image linkage for this pilot
5. every source_image_observation_id exists
6. every source observation belongs to an asset canonically linked to the same target reference
7. source observation scope is compatible with assertion scope:
   - product_design assertion -> product_design source observations only
   - promotional_visual assertion -> promotional_visual source observations only
   - no assistant_assessment assertions are expected in this pilot
8. assertion_class/scope/confidence values satisfy migration 009 enums
9. assertion_key is nonblank and unique in input
10. asserted_value and assertion_type are nonblank
11. source_image_observation_ids are nonempty, unique per assertion, and deterministic in order or normalized deterministically
12. no unknown reference/asset/evidence IDs
13. no proposed pattern changes
14. no proposed theme changes
15. canonical observation fingerprint remains count 45, ids 1-45, sum 1035, observed_value length sum 5479
16. canonical DB integrity_check is ok and foreign_key_check has zero violations
17. migration 009 exists and both synthesis tables exist
18. before first apply, synthesis tables are still empty; if they already contain only the exact same semantic replay identities, treat as replay verification rather than duplicate insertion; otherwise STOP and report unexpected pre-existing rows

Do not partially import if preflight fails.

## Canonical import behavior
Use one transaction.

For each GPT assertion:
1. resolve design_reference_id from reference_key
2. insert into `design_reference_synthesis_assertion` using exact GPT-authored semantic fields plus producer/version/run metadata
3. resolve the inserted/reused assertion id deterministically
4. insert exact source links into `design_reference_synthesis_source`

Do not write:
- legacy `design_reference_observation`
- `design_assessment`
- `visual_communication_reference`
- patterns/themes/preferences
- image observations
- materials/components/suppliers/market/packaging
- any migration

Do not create migration 010.

## Replay/idempotency
After successful first apply, immediately run the exact same input again.

Required result:
- zero additional semantic assertions
- zero additional source links
- all existing exact semantic identities/source links deterministically reused
- no constraint error exposed to the user for a valid replay

If the existing schema uniqueness means the script must detect/reuse before INSERT, implement that minimally and explicitly.

## Expected row counts
Derive expected assertion and source-link counts from the input before writing and report them.

Do not hardcode counts in logic merely to make the test pass.

After first apply and after replay, actual canonical counts for the four-reference synthesis pilot must exactly equal the input-derived expected counts.

## Focused tests
Add only focused tests needed to prove safety. Cover at minimum:
1. valid preflight passes
2. unknown reference fails
3. asset grouping mismatch fails
4. nonexistent observation fails
5. cross-reference evidence fails
6. product/promotional scope mismatch fails
7. duplicate assertion key fails
8. duplicate source IDs within one assertion fail or normalize deterministically before apply; behavior explicit
9. blank semantic fields fail
10. unexpected pattern/theme proposals fail
11. dry-run performs zero DB writes
12. successful transaction creates exact expected assertion/source counts
13. replay creates zero new rows
14. legacy semantic/P1C tables unchanged
15. 45-row observation fingerprint unchanged
16. integrity_check and foreign_key_check pass

Use temporary isolated DBs for mutation/error tests where practical.

## Canonical run sequence
1. Confirm clean worktree.
2. Ensure local branch is synchronized with origin/main using full Git for Windows where needed; do not force/rebase automatically if unsafe.
3. Run importer dry-run against canonical DB.
4. Record expected assertion/source counts from input.
5. Apply once in one transaction.
6. Verify actual counts and source/reference provenance.
7. Replay same input.
8. Verify zero new rows and same counts.
9. Run focused tests + `npm test` + `npm run validate` + `git diff --check`.
10. Run `PRAGMA integrity_check` and `PRAGMA foreign_key_check`.

## Git/sandbox behavior
Do not spend project time repairing watcher infrastructure.

If Codex can commit/push normally, do so.
If the sandbox blocks `.git/index.lock`, finish the authorized files/tests/import first, then report `READY_FOR_MANUAL_FINALIZE` with exact safe ordinary-PowerShell commands that stage ONLY this phase's files. Do not weaken sandbox, ACLs, or permissions.

## Allowed changes
- minimal reference-synthesis importer script
- focused importer tests
- minimal package script entry only if genuinely useful
- canonical rows in `design_reference_synthesis_assertion`
- canonical rows in `design_reference_synthesis_source`
- `outputs/GPT_HANDOFF.json`
- `outputs/handoffs/P2A-3R-REFERENCE-SYNTHESIS-IMPORT.json`

## Forbidden
- watcher/controller changes
- migration changes / migration 010
- edits to GPT-authored `inputs/p2a-3s1-reference-synthesis.json` unless a purely syntactic contract defect makes import impossible; if so STOP and report instead of silently changing semantics
- image/material/component/supplier/market/packaging changes
- pattern/theme/preference changes
- legacy reference semantic table changes
- reference regrouping
- OpenViking/FiftyOne/vector/embedding work
- new dependencies/frameworks

## Reporting
Update:
- `outputs/GPT_HANDOFF.json`
- `outputs/handoffs/P2A-3R-REFERENCE-SYNTHESIS-IMPORT.json`

Report:
- importer path
- input contract/version/run key
- preflight result
- input-derived expected assertion count
- input-derived expected source-link count
- first-apply created/reused counts
- replay created/reused counts
- final canonical synthesis assertion/source counts
- confirmation that only the four intended references were affected
- legacy/P1C/image-observation invariants
- integrity/FK checks
- focused/full tests
- business boundaries
- blocker or manual-finalize requirement
- whether GPT may proceed to expanding image/design-reference collection after this pilot

Then STOP. Do not start another phase automatically.

## Final response
PHASE:
P2A-3R-REFERENCE-SYNTHESIS-IMPORT

STATUS:
COMPLETED / READY_FOR_MANUAL_FINALIZE / BLOCKED

PREFLIGHT:
PASS / FAIL

EXPECTED ASSERTIONS / SOURCES:
<count> / <count>

FIRST APPLY CREATED / REUSED:
<assertions created>/<assertions reused>; <sources created>/<sources reused>

REPLAY CREATED / REUSED:
<assertions created>/<assertions reused>; <sources created>/<sources reused>

FINAL ASSERTIONS / SOURCES:
<count> / <count>

INVARIANTS:
PASS / FAIL

TESTS:
<result>

GPT MAY EXPAND DATA COLLECTION:
YES / NO

COMMIT:
<sha or NONE>

WORKTREE CLEAN:
YES / NO

BLOCKER:
NONE or exact reason
