# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1

Phase: P2A-3S2-INBOX-STATUS-AUDIT
Status: authorized
Model: Luna
Strength: Low

## Objective
Return to data collection. Perform a read-only status audit of the current Google Drive Inbox image set against the canonical Crystal database so GPT can distinguish images that are fully processed, historically referenced but not upgraded to the new P2A evidence chain, and truly unprocessed. Do not perform visual analysis and do not modify canonical data.

## Why Luna / Low
This is a bounded metadata/read-only reconciliation task. No schema, semantic judgment, canonical write, or architecture work is required.

## Current Drive snapshot supplied by GPT
Google Drive Inbox currently contains 85 image files. Reviewed is currently empty.

Known fully processed pilot images:
- IMG_7633.PNG
- IMG_7634.PNG
- IMG_7668.PNG
- IMG_7669.PNG
- IMG_7717.PNG
- IMG_7718.PNG
- IMG_7719.PNG
- IMG_7746.PNG
- IMG_7747.PNG
- IMG_7748.PNG

Known historically discussed/reference-analyzed groups that must NOT automatically be treated as brand-new/unseen merely because they lack P2A image observations:
- IMG_7712.PNG, IMG_7713.PNG
- IMG_7714.PNG, IMG_7715.PNG, IMG_7716.PNG
- IMG_7721.PNG
- IMG_7722.PNG, IMG_7723.PNG, IMG_7724.PNG
- IMG_7729.PNG, IMG_7730.PNG, IMG_7731.PNG
- IMG_7733.PNG, IMG_7734.PNG, IMG_7735.PNG, IMG_7736.PNG, IMG_7737.PNG
- IMG_7743.PNG, IMG_7744.PNG, IMG_7745.PNG

## Authoritative local sources
Use only read-only inspection of:
- canonical local SQLite DB
- image_asset
- design_reference_image
- design_reference
- image_visual_observation
- design_reference_synthesis_assertion
- design_reference_synthesis_source
- existing historical P1C reference/assessment/pattern/theme/preference records where needed to detect historical analysis
- existing P1C/P2A handoff/output artifacts if they contain historical image filename-to-reference mappings

Do not use external web research. Do not redo image interpretation.

## Inbox inventory
Build the audit around the following exact 85 filenames currently present in Drive Inbox:
IMG_7704.PNG
IMG_7700.PNG
IMG_7703.PNG
IMG_7688.PNG
IMG_7698.PNG
IMG_7679.PNG
IMG_7696.PNG
IMG_7691.PNG
IMG_7680.PNG
IMG_7666.PNG
IMG_7697.PNG
IMG_7667.PNG
IMG_7692.PNG
IMG_7689.PNG
IMG_7678.PNG
IMG_7690.PNG
IMG_7653.PNG
IMG_7635.PNG
IMG_7699.PNG
IMG_7648.PNG
IMG_7655.PNG
IMG_7650.PNG
IMG_7636.PNG
IMG_7652.PNG
IMG_7651.PNG
IMG_7637.PNG
IMG_7656.PNG
IMG_7641.PNG
IMG_7682.PNG
IMG_7654.PNG
IMG_7677.PNG
IMG_7674.PNG
IMG_7665.PNG
IMG_7687.PNG
IMG_7649.PNG
IMG_7633.PNG
IMG_7634.PNG
IMG_7681.PNG
IMG_7676.PNG
IMG_7686.PNG
IMG_7685.PNG
IMG_7669.PNG
IMG_7668.PNG
IMG_7673.PNG
IMG_7675.PNG
IMG_7661.PNG
IMG_7702.PNG
IMG_7663.PNG
IMG_7701.PNG
IMG_7664.PNG
IMG_7646.PNG
IMG_7645.PNG
IMG_7662.PNG
IMG_7693.PNG
IMG_7694.PNG
IMG_7684.PNG
IMG_7644.JPG
IMG_7642.JPG
IMG_7643.JPG
IMG_7748.PNG
IMG_7747.PNG
IMG_7746.PNG
IMG_7745.PNG
IMG_7743.PNG
IMG_7744.PNG
IMG_7736.PNG
IMG_7735.PNG
IMG_7734.PNG
IMG_7733.PNG
IMG_7737.PNG
IMG_7731.PNG
IMG_7730.PNG
IMG_7729.PNG
IMG_7722.PNG
IMG_7724.PNG
IMG_7723.PNG
IMG_7721.PNG
IMG_7717.PNG
IMG_7718.PNG
IMG_7719.PNG
IMG_7715.PNG
IMG_7714.PNG
IMG_7716.PNG
IMG_7712.PNG
IMG_7713.PNG

## Required classification
Create exactly one main artifact:
`outputs/p2a-3s2-inbox-status-audit.json`

For each of the 85 filenames, include:
- filename
- image_asset_key if known, else null
- design_reference_keys (0..n)
- has_historical_reference_analysis: true/false
- has_image_visual_observation: true/false
- image_visual_observation_count
- has_reference_synthesis: true/false
- reference_synthesis_assertion_count attributable to its linked reference(s)
- status, exactly one of:
  - `fully_processed`
  - `historical_needs_p2a_upgrade`
  - `unprocessed`
  - `ambiguous_needs_review`
- short machine-readable reason

Classification rules:
1. `fully_processed`
   - image has canonical asset linkage
   - has image_visual_observation rows
   - linked reference has reference-level synthesis for the current P2A chain

2. `historical_needs_p2a_upgrade`
   - image/reference has credible historical analysis/reference evidence in P1C/history
   - but image-level P2A observation and/or current synthesis chain is incomplete
   - do not require both to be absent

3. `unprocessed`
   - no credible historical analysis/reference evidence
   - no image_visual_observation
   - no current synthesis

4. `ambiguous_needs_review`
   - conflicting/multiple mappings, missing filename linkage, or insufficient evidence to classify safely

Do not classify an image as historically analyzed solely because another filename in the same numeric neighborhood was analyzed.

## Summary required
Top-level summary must include:
- inbox_total = 85
- fully_processed count
- historical_needs_p2a_upgrade count
- unprocessed count
- ambiguous_needs_review count
- count with image_asset linkage
- count with design_reference linkage
- count with image_visual_observation
- count whose linked reference has current synthesis
- list of filenames in each status bucket

Also produce a small human-readable companion:
`outputs/p2a-3s2-inbox-status-audit.md`

The markdown should contain only:
- summary counts
- four status buckets with filenames
- any true ambiguities that require GPT/user review
- recommended next batch, preferring historical_needs_p2a_upgrade before truly unprocessed images where reuse of previous analysis saves effort

## Validation
Verify:
1. exactly 85 unique input filenames
2. no filename appears in more than one final status bucket
3. all 10 known pilot filenames classify as `fully_processed`; if not, STOP and report inconsistency
4. canonical P2A pilot still has 45 image observations
5. canonical reference synthesis still has 19 assertions and 37 source links
6. no DB writes
7. `PRAGMA integrity_check` = ok
8. `PRAGMA foreign_key_check` = 0 violations

## Boundaries
Allowed:
- read-only DB queries
- read-only existing repository artifacts
- `outputs/p2a-3s2-inbox-status-audit.json`
- `outputs/p2a-3s2-inbox-status-audit.md`
- `outputs/GPT_HANDOFF.json`
- `outputs/handoffs/P2A-3S2-INBOX-STATUS-AUDIT.json`

Forbidden:
- visual/image semantic analysis
- new image observations
- new synthesis assertions/source links
- database writes
- migrations
- pattern/theme/preference changes
- material/component/supplier/market/packaging work
- moving/deleting Drive files
- watcher/controller work
- new dependencies

## Git behavior
If commit/push works normally, commit/push this audit. If Git metadata is blocked, report `READY_FOR_MANUAL_FINALIZE` with exact safe commands. Do not spend time fixing the channel.

## Reporting
Update:
- `outputs/GPT_HANDOFF.json`
- `outputs/handoffs/P2A-3S2-INBOX-STATUS-AUDIT.json`

Report:
- all four bucket counts
- 85/85 reconciliation
- known pilot check
- DB read-only confirmation
- integrity/FK checks
- next recommended batch
- whether GPT can proceed directly with historical-upgrade batch analysis

Then STOP.

## Final response
PHASE:
P2A-3S2-INBOX-STATUS-AUDIT

STATUS:
COMPLETED / READY_FOR_MANUAL_FINALIZE / BLOCKED

INBOX RECONCILIATION:
<85/85 or fail>

FULLY PROCESSED:
<count>

HISTORICAL NEEDS P2A UPGRADE:
<count>

UNPROCESSED:
<count>

AMBIGUOUS:
<count>

PILOT CHECK:
PASS / FAIL

DB READ-ONLY:
PASS / FAIL

TESTS:
<result>

NEXT RECOMMENDED BATCH:
<filenames or NONE>

COMMIT:
<sha or NONE>

WORKTREE CLEAN:
YES / NO

BLOCKER:
NONE or exact reason