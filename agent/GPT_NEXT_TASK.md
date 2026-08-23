# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1

Phase: P2A-2F0
Status: authorized
Model: Terra
Strength: Medium

## Objective
Determine whether the current schema can safely store image-level Vision observations for the next 10-image pilot. This is a read-only schema gap check. Do not implement and do not run Vision.

## Current baseline
- P2A-1R passed.
- 10 real pilot images resolve deterministically.
- SHA-256 exact-content identity and pHash candidate similarity are working and auditable.
- Migration 007 exists for perceptual hashes.
- Do not re-audit P2A-1R or repeat project history.

## Only decision required
Return exactly one:
1. CURRENT_SCHEMA_SUFFICIENT
2. MINIMAL_SCHEMA_CHANGE_REQUIRED

If a change is required, define only the smallest schema addition needed for the 10-image Vision pilot. Do not create migration 008 in this phase.

## Required semantic boundaries
Future storage must distinguish:
- image-level observation: directly visible evidence;
- inference: interpretation from appearance;
- confirmed fact: separately confirmed by user/source/supplier evidence;
- image-level observation vs reference-level synthesis;
- product design observation vs promotional visual observation.

Vision output must never become confirmed material fact merely because it looks plausible.

## Inspect only relevant structures
Inspect current schema/code/docs for image_asset, design_reference_image, design_assessment, preference_evidence, visual/promotion analysis structures, provenance/evidence fields, observer/author fields, confidence fields, source-content SHA handling, and migration 007 conventions.

Do not audit unrelated material, supplier, pricing, packaging, market, OpenViking, or full P1C history unless a direct dependency exists.

## Minimum capabilities to check
Can the current schema represent without semantic overloading:
- image asset identity
- observation category/type
- structured observation value
- observation vs inference class
- confidence
- observer/model identity
- analysis/schema version
- source image SHA-256
- created timestamp
- later human review/correction without destructive overwrite

Avoid a wide fixed-column table for every visual feature unless strongly justified. Prefer the smallest auditable extensible model if a new structure is needed.

## Versioning requirement
A Vision result must remain traceable to image content state plus analysis definition/version. If image SHA changes, old observations must not silently apply. If analysis schema/prompt materially changes, new results must remain distinguishable from old results.

## Human review
Do not design a full review workflow. Only determine whether AI output and later human correction/confirmation must remain separately auditable.

## Anti-overengineering
Do not propose or add vector DB, embeddings, FiftyOne runtime, OpenViking, ontology engine, generic annotation platform, event-sourcing framework, workflow engine, or new dependencies unless absolutely required to answer this schema question.

## Write boundary
Allowed writes: only concise handoff files required by AGENT-HANDOFF-V1.
Forbidden: DB changes, schema changes, migration 008, application code changes, Vision/OCR/image processing, Google Drive access, dependency installation, canonical record changes.

## Required handoff
Update outputs/GPT_HANDOFF.json and archive outputs/handoffs/P2A-2F0.json.
Keep the handoff concise. Include decision, actual schema gap(s), exact existing structures reused, proposed minimum change if needed, evidence pointers, risks/blockers, GPT decision required, and next minimum action.
Do not generate a long audit report unless a genuinely complex blocker makes it necessary.

After push, stop. Do not proceed to migration 008 or Vision.
