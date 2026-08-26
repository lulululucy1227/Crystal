# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1

Phase: P2A-NEW-REFERENCE-CRETACEOUS-COAST-FRAGMENTS-INTAKE
Status: authorized
Model: Terra
Strength: Medium

## Objective
Create one new canonical design reference for the newly uploaded bracelet identified by the user as `白垩纪的海岸碎片`, and attach/resolve its exact three Google Drive images. This phase is intake + deterministic asset provenance only. Do not yet import image observations or reference synthesis.

## Why Terra / Medium
This phase creates a canonical design_reference and image_asset/reference links and writes verified SHA-256/source metadata. The grouping and exact three source objects are fixed by GPT/user, but canonical writes require careful provenance handling.

## Authoritative GPT input
Read exactly:
- `inputs/p2a-new-reference-cretaceous-coast-fragments.json`

The user explicitly stated this is one newly uploaded bracelet and supplied the concept name `白垩纪的海岸碎片`.

Important semantic boundary:
- Store `白垩纪的海岸碎片` as a user-supplied design concept/name.
- Do NOT treat `白垩纪` as verified geological age/provenance.
- Seller/source text visible in screenshots, including material labels and claims such as natural/no treatment, is source-stated only. Do not promote it to confirmed material facts.

## Exact source images
Treat these three files as one reference, in this order:
1. IMG_7812.PNG / Drive file `1G3vgzk5As10zXs3pPfXdc-oA3dG5iiAk`
2. IMG_7813.PNG / Drive file `1laJm9mwscENnZ6agSLcvUitzsJyUfO_P`
3. IMG_7814.PNG / Drive file `1QH29N5T9k_AKmK36x_ytiEQ4gEyEKt3i`

Use the exact SHA-256/dimensions/byte-size/MIME values in the GPT input as verified source-byte metadata.

## Required preflight
Before writing:
1. git worktree must be clean
2. sync origin/main ff-only and reread this task
3. input protocol/phase/provider identities are exact and unique
4. ensure no existing canonical image_asset already uses any of the three provider_file_id values; if exact existing rows are found, reuse only if all provenance metadata matches
5. ensure no existing design_reference already represents these exact three provider identities as one reference; if an exact prior intake exists, reuse idempotently rather than duplicate
6. SHA-256 values are exactly 64 lowercase hex
7. image metadata values are positive and internally consistent
8. DB integrity_check ok / foreign_key_check zero

If there is any conflicting provider identity, hash, or pre-existing ambiguous reference mapping, STOP.

## Canonical intake behavior
Use the existing schema and project conventions only. No migration.

Create exactly one new design_reference for this bracelet unless an exact replay already exists.

Preserve the user concept name `白垩纪的海岸碎片` in the most appropriate existing reference/narrative/user-wording field available without altering schema. Do not invent a new field. If the current canonical design_reference schema has no safe place for the concept name, store it in an existing provenance/narrative layer that explicitly preserves user wording and report where it was stored.

Create/reuse exactly three image_asset rows with:
- provider = google_drive
- exact provider_file_id
- original filename
- exact canonical image_hash = source_content_sha256
- exact mime_type, width_px, height_px, byte_size
- asset_status = available after all provenance checks pass

Create/reuse exactly three design_reference_image links to the one new reference with display_order 1,2,3.
Use the image roles supplied in the GPT input if compatible with current constraints; otherwise preserve them conservatively without schema change.

Do not create pHash if verified local bytes are not available to the Codex runtime. pHash may remain deferred.

## Source/seller claims boundary
The GPT input contains source context and promotional/material-label notes.
If the existing `sourced_claim` or equivalent provenance layer can safely hold these source-stated claims without treating them as canonical material facts, you MAY persist the minimal source claim text and source attribution.
If doing so would require semantic inference, schema changes, or material-table writes, defer it and report the deferral.

Do NOT write to confirmed material/component tables in this phase.

## Forbidden in this phase
- image_visual_observation inserts
- design_reference_synthesis_assertion/source inserts
- confirmed material facts
- material/component/supplier/market/packaging writes
- pattern/theme/preference changes unless an existing required reference-intake field demands only mechanical linkage; otherwise defer
- pHash fabrication
- migration/schema change
- new dependencies/frameworks
- watcher/controller work
- Drive move/delete/rename

## Replay / idempotency
Run the same intake a second time.
Required replay:
- 0 duplicate references
- 0 duplicate assets
- 0 duplicate links
- exact provider identities reused
- same reference key reused

## Validation
After intake verify:
- exactly one canonical reference represents these three images
- exactly three linked image assets
- display_order = 1,2,3
- all three canonical SHA-256 values match the GPT input
- all three provider_file_id values remain unique
- no image_visual_observation rows created for these assets
- synthesis count remains unchanged from pre-run baseline
- existing 67 image_visual_observation rows remain unchanged
- no confirmed material/market/supplier data changed
- integrity_check ok
- foreign_key_check zero
- npm test
- npm run validate
- git diff --check

## Allowed files/changes
- smallest deterministic intake/import script only if existing tooling cannot safely perform this exact intake
- focused tests
- canonical new design_reference / image_asset / design_reference_image rows for this one reference only
- minimal existing source-claim/narrative row if clearly supported by current schema and source-stated boundary
- `outputs/GPT_HANDOFF.json`
- `outputs/handoffs/P2A-NEW-REFERENCE-CRETACEOUS-COAST-FRAGMENTS-INTAKE.json`

## Git behavior
If commit/push works normally, commit/push. If Git metadata is blocked, finish the authorized DB work/tests and report exact safe manual-finalize commands. Do not spend time repairing watcher/sandbox.

## Final response
PHASE:
P2A-NEW-REFERENCE-CRETACEOUS-COAST-FRAGMENTS-INTAKE

STATUS:
COMPLETED / READY_FOR_MANUAL_FINALIZE / BLOCKED

PREFLIGHT:
PASS / FAIL

REFERENCE CREATED / REUSED:
<created> / <reused>

REFERENCE KEY:
<key or NONE>

ASSETS CREATED / REUSED:
<created> / <reused>

LINKS CREATED / REUSED:
<created> / <reused>

SHA MATCH:
<count>/3

USER CONCEPT NAME PRESERVED:
YES / NO — <where>

SOURCE CLAIMS:
PRESERVED / DEFERRED / NONE

PHASH:
<created/reused/deferred>

REPLAY:
PASS / FAIL

IMAGE OBSERVATIONS CREATED:
0 required

INVARIANTS:
PASS / FAIL

TESTS:
<result>

GPT MAY AUTHOR IMAGE OBSERVATIONS NEXT:
YES / NO

COMMIT:
<sha or NONE>

WORKTREE CLEAN:
YES / NO

BLOCKER:
NONE or exact reason
