# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1
Phase: P2A-NEW-REFERENCE-CRETACEOUS-COAST-FRAGMENTS-EVIDENCE-MAP
Status: authorized
Model: Luna
Strength: Low

## Objective
Read only the canonical SQLite database and export the exact image_visual_observation rows for REF-000026 assets ASSET-000067, ASSET-000068, ASSET-000069 so GPT can author reference synthesis without guessing observation IDs.

## Expected state
- 13 rows for the three assets
- 11 observation / 2 inference
- 10 product_design / 3 promotional_visual
- total image_visual_observation = 80
- synthesis = 19 assertions / 37 sources

## Output
Create `outputs/p2a-cretaceous-coast-fragments-evidence-map.json` with the 13 rows ordered by image_visual_observation.id ascending. Include for each row: id, asset_key, filename, reference_key, source_content_sha256, observation_scope, assertion_class, observation_type, observed_value, confidence, producer_type, producer_id, analysis_version.

Also include summary: reference_key, user concept name `白垩纪的海岸碎片`, asset keys, row count, min id, max id, id sum, class counts, scope counts, total observation count, synthesis counts.

## Validation
Confirm exact target linkage, counts above, integrity_check=ok, foreign_key_check=0, and no database writes.

## Boundaries
Do not modify DB, semantics, synthesis, materials, patterns/themes/preferences, assets, pHash, schema, watcher/controller, or dependencies.

Update GPT handoff files, commit/push if normal, then stop.

## Final response
PHASE: P2A-NEW-REFERENCE-CRETACEOUS-COAST-FRAGMENTS-EVIDENCE-MAP
STATUS: COMPLETED / BLOCKED
ROWS: <count>/13
ID RANGE / SUM: <min>-<max> / <sum>
CLASS COUNTS: <observation> / <inference>
SCOPE COUNTS: <product_design> / <promotional_visual>
DB READ-ONLY: PASS / FAIL
SYNTHESIS BASELINE: <assertions> / <sources>
GPT MAY AUTHOR REFERENCE SYNTHESIS: YES / NO
COMMIT: <sha or NONE>
WORKTREE CLEAN: YES / NO
BLOCKER: NONE or reason
