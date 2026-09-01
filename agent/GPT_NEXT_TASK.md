# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1
Phase: P3R-INBOX-BRACELET-REFERENCE-INGESTION
Status: authorized
Model: Terra
Strength: Medium
Execution class: DATABASE_WRITE + READ_ONLY supporting audit

## 主管结论

用户在 Crystal Google Drive Inbox 新上传了 7 张手串参考截图，并要求 GPT 先完成审美/结构分析，再将分析写入 GitHub 交给 Codex 落库。

GPT 已完成视觉分析。唯一语义权威输入：

`inputs/p3r-gpt-inbox-bracelet-analysis-20260901.json`

本轮是独立的设计参考入库任务，不是工作台 UI 修改任务。

上一条工作台主线 `P3L-P3Q-WORKBENCH-REFERENCE-FIDELITY-ASSET-INTEGRATION` 当前仍为 `partial_completed`，主要 blocker 是 GPT 素材资产未补齐。**本轮不得回退、重做或改动该 UI；完成 P3R 后保留其现状。**

## 本批次必须按两组处理

### Reference A — 紫夜鎏金结构参考
同一条手串的 3 个视角：
- IMG_7920.PNG — Drive ID `1A9sWRUlPQwtP809XFEHrZWFYeWfExXjG` — primary overview
- IMG_7921.PNG — Drive ID `1cuqE6ySWH6QbSl98jB-wUq-WYuGJ8swm` — worn-scale alternate view
- IMG_7922.PNG — Drive ID `1XX-jKALrg_x6-t2dqebaco4g8tKBJAC4` — detail alternate view

### Reference B — 冷灰银色节奏结构参考
同一条手串的 4 个视角：
- IMG_7927.PNG — Drive ID `14jZra_4Q9xQie-YUyub6CIqmYVXEKB8C` — primary overview
- IMG_7925.PNG — Drive ID `1uVIeX_pmm9pKZ99ZfHqXD6nisI1g0QDu` — alternate overview
- IMG_7926.PNG — Drive ID `14h8IZAzM9b7fNuEEHcJ2_aPM9eziB1Jz` — hardware detail
- IMG_7928.PNG — Drive ID `1YYTUgobyPatkcCCINuAfw1xO3mktu5HG` — detail alternate view

Do NOT split these into seven independent product references.

## 核心语义边界

1. Inbox presence does NOT mean user preference.
2. Do NOT create `preference_evidence` or any preference relation from this batch.
3. Do NOT infer or create mineral/material identity from image appearance.
4. Do NOT infer authenticity, grade, treatment, origin, ethics or geological provenance.
5. Source-account names and visible marketing copy are only source context.
6. These screenshots are bracelet design references. They are NOT valid round-bead material catalogue thumbnails for the Workbench assortment.
7. No supplier / sourcing / pricing / purchase / outreach work.
8. No schema migration.

## 连续执行步骤

Execute all steps continuously. A single sub-blocker must not stop unrelated safe work.

### P3R-A — Preflight / reconcile

- Sync main safely; never reset/clean/discard user work.
- Require/record worktree status.
- Read latest `outputs/GPT_HANDOFF.json` and confirm P3L-P3Q partial state is preserved.
- Inspect current P2A/P3 image ingestion implementation and schema before writing.
- Record canonical DB SHA before.
- Make byte-for-byte DB backup before database writes.
- Reconcile by Drive provider_file_id / filename / exact existing provenance to ensure these 7 assets have not already been canonicalized.
- If exact rows already exist, reuse them; never duplicate.

### P3R-B — Asset + reference grouping

Using existing schema only:

- Materialize/reuse exactly 7 image assets where representable by existing image intake conventions.
- Preserve filename + Google Drive file ID + screenshot/source context.
- Create/reuse exactly 2 `design_reference` records for the two groups above.
- Link 3 assets to Reference A and 4 assets to Reference B in the exact grouping above.
- Primary/secondary display order must follow the GPT input.

If the current schema requires an asset byte hash that cannot be obtained from the local authorized intake path, do NOT fabricate it. Continue every other representable safe step and report the precise blocker.

### P3R-C — Canonical image observations

Read the GPT input verbatim.

For each reference:
- attach all `product_design_observations` to the primary asset;
- attach `design_inference` to the primary asset as inference, medium confidence;
- attach the exact supplied alternate-view observation to each secondary asset;
- attach `promotional_visual_observations` to the primary asset under promotional_visual scope;
- use append-only observation behavior and reconcile exact rows before insert.

Suggested classes/confidence:
- direct visual observation → assertion_class `observation`, confidence `high`;
- GPT design inference → assertion_class `inference`, confidence `medium`;
- alternate same-reference coverage → observation, confidence `high`;
- promotional visual observation → observation, confidence `high`.

Use existing observation schema/field conventions. Do not invent new enum values if the schema already defines equivalent canonical values.

### P3R-D — Reference synthesis

Create exactly one product-design synthesis assertion per new reference using `reference_synthesis` verbatim from the GPT input.

- assertion class: inference
- confidence: medium
- link synthesis provenance to all observations created/reused for that reference through the existing synthesis-source mechanism
- replay must not duplicate assertions or sources

### P3R-E — Theme / pattern relations

Themes explicitly authorized by GPT:
- Reference A: `Starlight` high
- Reference B: `Glacier` high; `Starlight` medium

Reuse existing canonical themes only. Do not create new themes.

Pattern candidates are authorized only when an exact existing canonical design-pattern identity with the same name exists. Reuse exact existing identities only.

Reference A candidates:
- Controlled Maximalism
- Off-center Focal Composition
- Focal Assembly
- Rhythm Interruption
- Micro-cluster Transition
- Secondary Line
- Shadow Anchor
- Geometric Vocabulary

Reference B candidates:
- Rhythm Interruption
- Mineral Architecture
- Asymmetric Balance
- Micro Accent

If any name is not an exact existing canonical pattern, keep that phrase in synthesis text only. Do not create a new pattern identity in P3R.

### P3R-F — Reviewed readiness

After canonical persistence succeeds and validation passes:

Create:
`outputs/p3r-reviewed-move-ready.json`

It must list the exact seven Drive file IDs and filenames and set each item to one of:
- `ready_for_reviewed_move`
- `blocked_from_reviewed_move` with precise reason

Do NOT claim the Google Drive physical move occurred unless an actual authorized move is available and succeeds.

The post-P3R expectation is that GPT Supervisor can perform/verify the Inbox → Reviewed transition separately after reading this manifest.

### P3R-G — Validation

Required:
- exact expected group count = 2
- exact asset coverage count = 7
- every one of 7 assets has canonical semantic coverage or an explicit schema/intake blocker
- synthesis count = exactly 2 for this batch
- theme/pattern relations reconcile exactly to authorized identities only
- user preference writes = 0
- material/material_variant/component/packaging writes = 0
- supplier/offer writes = 0
- replay/idempotency creates 0 duplicates
- `PRAGMA integrity_check = ok`
- `PRAGMA foreign_key_check = 0`
- focused P3R tests
- full `npm test`
- `npm run validate`
- final `git diff --check`
- unrelated P2/P3 fingerprints unchanged

## Outputs

Create:
- `outputs/p3r-inbox-bracelet-reference-ingestion.json`
- `outputs/p3r-reviewed-move-ready.json`
- `outputs/handoffs/P3R-INBOX-BRACELET-REFERENCE-INGESTION.json`

Update:
- `outputs/GPT_HANDOFF.json`

Handoff must report only high-signal facts:
- status completed / partial / blocked
- exact 2 reference IDs/keys
- exact 7 asset IDs/filenames/Drive IDs
- observations/syntheses created vs reused
- theme/pattern relations created/reused/skipped
- proof that preference writes = 0 and material writes = 0
- DB SHA before/after + backup path
- integrity/tests/idempotency
- reviewed-move readiness for each file
- commit SHA
- HEAD == origin/main
- worktree clean
- true blockers only

## Git

Commit and push coherent P3R results to `main`.
Confirm local HEAD == origin/main and worktree clean.

## Stop conditions

Do not stop after audit or after only creating references.
Stop only when:
1. P3R completes and validates; or
2. a true schema/intake blocker prevents the remaining canonical steps after all other safe work is completed; or
3. unexplained DB/repository integrity divergence occurs.

No user design/business decision is required for this batch.
