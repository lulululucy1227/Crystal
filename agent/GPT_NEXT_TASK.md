# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1

Phase: P2A-3S0-REFERENCE-EVIDENCE-MAP
Status: authorized
Model: Luna
Strength: Low

## Objective
Return immediately to the crystal data/design mainline. Produce a small read-only evidence map for the four P2A pilot design references so GPT can author the authoritative reference-level synthesis input with exact `image_visual_observation` IDs. Do not modify canonical semantic/business data and do not continue watcher development.

## Why Luna / Low
This is a bounded read-only extraction task. The schema and four-reference grouping are already fixed by P2A-3F0/P2A-3F1. No architecture, schema, production write, or semantic judgment is requested.

## Authoritative references
Read only what is needed from:
- `outputs/p2a-3f0-reference-synthesis-fit.md`
- `outputs/handoffs/P2A-3F1-REFERENCE-SYNTHESIS-SCHEMA.json`
- `inputs/p2a-2r-vision-observations.json`
- canonical local SQLite DB

Expected pilot grouping:
- REF-000002 -> ASSET-000001, ASSET-000002
- REF-000006 -> ASSET-000015, ASSET-000016
- REF-000019 -> ASSET-000046, ASSET-000047, ASSET-000048
- REF-000025 -> ASSET-000064, ASSET-000065, ASSET-000066

Expected totals:
- 4 references
- 10 pilot assets
- 45 `image_visual_observation` rows
- observation fingerprint: count 45; ids 1-45; id sum 1035; observed_value length sum 5479

## Required output
Create exactly one main artifact:
`outputs/p2a-3s0-reference-evidence-map.json`

The map must be deterministic and contain, for every one of the 45 observation rows used by the four references:
- `design_reference_key`
- `asset_key`
- `image_visual_observation_id`
- `scope`
- `assertion_class`
- `observation_type`
- `observed_value`
- `confidence`
- `analysis_version`
- `producer_type`
- `producer_id`

Order deterministically by reference key, asset key, observation id.

Also include a compact top-level summary:
- reference count
- asset count
- observation count
- ids min/max/sum
- observed_value length sum
- per-reference observation counts
- per-scope counts
- per-assertion-class counts

## Validation
Before writing the artifact, verify:
1. every observation belongs to one of the exact 10 expected pilot assets
2. every asset is canonically linked to exactly the expected reference in this pilot grouping
3. exactly 45 observations are exported
4. ids are exactly 1 through 45 with no gaps/duplicates
5. id sum = 1035
6. observed_value length sum = 5479
7. source scopes/classes match the established P2A-2R data
8. no canonical DB row is inserted, updated, or deleted
9. `design_reference_synthesis_assertion` remains 0 rows
10. `design_reference_synthesis_source` remains 0 rows
11. `PRAGMA integrity_check` is ok
12. `PRAGMA foreign_key_check` has 0 violations

## Boundaries
Allowed:
- read-only SQLite queries
- `outputs/p2a-3s0-reference-evidence-map.json`
- `outputs/GPT_HANDOFF.json`
- `outputs/handoffs/P2A-3S0-REFERENCE-EVIDENCE-MAP.json`

Forbidden:
- any database write
- migration changes
- synthesis assertion/source inserts
- new semantic judgments
- pattern/theme/preference changes
- image/material/component/supplier/market/packaging changes
- watcher/controller work
- new dependencies
- real smoke tests
- automatic channel development

## Git behavior
Do not spend time trying to solve Codex sandbox Git metadata limitations. If ordinary commit/push from the current execution environment works, commit/push normally. If `.git/index.lock` or equivalent sandbox restriction occurs, stop after producing/validating the authorized files and report `READY_FOR_MANUAL_FINALIZE` with exact safe manual Git commands. Do not weaken sandbox or permissions.

## Reporting
Update:
- `outputs/GPT_HANDOFF.json`
- `outputs/handoffs/P2A-3S0-REFERENCE-EVIDENCE-MAP.json`

Report:
- exact output path
- 4/10/45 counts
- fingerprint checks
- per-reference counts
- DB read-only confirmation
- new synthesis table row counts (must both be 0)
- integrity/FK checks
- blockers
- whether GPT can now author the four-reference synthesis input

Then STOP. Do not author or import synthesis content.

## Final response
PHASE:
P2A-3S0-REFERENCE-EVIDENCE-MAP

STATUS:
COMPLETED / READY_FOR_MANUAL_FINALIZE / BLOCKED

EVIDENCE MAP:
PASS / FAIL

REFERENCES / ASSETS / OBSERVATIONS:
<counts>

FINGERPRINT:
PASS / FAIL

DB READ-ONLY:
PASS / FAIL

SYNTHESIS ROWS:
<assertion count> / <source count>

GPT MAY AUTHOR SYNTHESIS INPUT:
YES / NO

TESTS:
<result>

COMMIT:
<sha or NONE>

WORKTREE CLEAN:
YES / NO

BLOCKER:
NONE or exact reason
