# P1A-R Schema

## P2A-2F1 Image Visual Observations

`image_visual_observation` stores image-level observations and inferences. Each row binds to the current `image_asset.image_hash` through `source_content_sha256`, separates `product_design` from `promotional_visual`, and keeps `observation` separate from `inference`. Confirmed facts are not stored here. Corrections append a new row through `supersedes_observation_id`; reference-level synthesis remains in the existing reference tables.

## P1A-R additions

- `material_alias` records only reviewed identity names. Component, size, grade, origin, shape and trade descriptors are never silently removed to make an alias.
- `material_claim` holds sourced, confidence-labelled statements such as a supplier saying “untreated”; it does not overwrite material identity.
- `material_narrative` keeps cultural symbolism and brand stories apart from material facts, market evidence and user preference.
- `market_assessment` holds internal analysis separately from sourced `market_evidence`.
- `packaging_option` and `packaging_supplier_offer` are delivery/presentation records, never wearable `component` records.
- Commercial tier lives on `material_variant` and `supplier_offer`, never on `material`.
- `import_batch`, `staged_record`, `staged_field`, `review_decision`, and `promotion_log` enforce RAW → STAGED → VALIDATED → READY/REVIEW_REQUIRED → HUMAN_APPROVED/REJECTED → CANONICAL.

Real source rows may be staged and reviewed, but require an explicit approval before controlled promotion.

## P1A-F0 field-level audit

`staged_field` remains the import/validation layer. `field_review_decision` is the immutable review history: its latest `(reviewed_at, id)` row is the effective decision. `field_promotion_log` is an actual canonical-write event, and `field_promotion_source` links that event to one or more exact staged fields. Row-level `review_decision` and `promotion_log` remain row summaries; they are not substitutes for field decisions or field promotion provenance.

Example — `黄水晶（热处理）`: the material identity field may be approved for `Citrine`; the treatment/variant field, narrative field and low-confidence market-assessment field may be approved independently; the raw price and supplier fields may be `retained_staged`. Only the approved fields can appear in field-promotion events, and each event records the exact source fields used.

## 关系总览

`material → material_variant → component` 是选品主链：矿物本身、质量／尺寸等变体、可用于饰品的物理件依次独立。

`design_reference → design_reference_observation` 存储观察；`design_assessment` 存储助手判断；`preference_evidence` 单独存储用户明确表达。三者不可互相替代。

## P1C-F0：参考关系与证据身份

`design_reference` 新增稳定、系统级的 `reference_key`（默认 `REF-000001` 风格），以及独立的 `record_status` 与 `evidence_status`。前者区分 `real`、`demo`、`test_fixture`、`synthetic`；后者区分来源确认、用户提供、助手观察、外部未验证与未知。它们都不表示用户偏好、助手评价或市场证据。

```
Design Reference
├── User Preference Evidence
├── Design Observation
├── Assistant Design Assessment
├── Promotional Visual Analysis
├── Design Patterns [many, design_reference_pattern]
└── Natural Themes [many, design_reference_theme]
```

`design_assessment.possible_theme` 与 `reusable_patterns` 保持为历史兼容的自由文本／单主题字段；新的结构化导入应使用两个关系表。

重复处理分三级：同一非空 `image_hash` 是 Hard duplicate；同一 `source_url_normalized` 是 Strong candidate；相近元数据为 Soft candidate，必须人工复核。原始 URL 不设唯一约束，且本阶段不联网解析、跳转或计算图像哈希。

## P1C-F1：项目级设计原则

`design_principle` 保存跨多个观察得出的项目或系列指导；它没有、也不需要 `design_reference`。它与 `design_pattern`、`preference_evidence`、单一参考的 `design_assessment`、材质事实和市场证据分别建模。

受控字段：`principle_type`（composition/material/color/hardware/rhythm/visual_identity/commercial_design/general）、`status`（candidate/active/deprecated）、`confidence`（low/medium/high）和 `author_type`（assistant_synthesis/user_explicit/joint_project_decision）。未建立原则到参考、模式或主题的关联表；将来只在真实使用证明必要时再扩展。

`design_reference → visual_communication_reference` 专门记录宣传图语言，避免与产品结构分析混合。

## P1C-R2A：图片资产层

`image_asset` 只保存资产身份与技术元数据：稳定 `asset_key`、provider、可选的 provider file ID、原文件名、可选尺寸／字节数／hash／定位信息和资产状态。资产级 `image_hash` 保留给精确字节内容的 cryptographic SHA-256；它不保存偏好、设计判断、主题、材质推断或市场结论。

`design_reference_image` 是多对多关系：同一资产可服务多个参考；同一参考可按唯一的 `display_order` 保存多张图片，角色限于 overall/detail/on_wrist/promotional/unknown。`provider + provider_file_id` 是外部资产的确定身份；文件名、尺寸或上传时间从不自动合并。相同非空 hash 出现在 `image_asset_duplicate_candidate` 中作为 Hard candidate，不自动合并。

`design_reference.image_hash` 保留为 P1C-F0 的历史兼容参考级字段；新的资产级 cryptographic SHA-256 只写入 `image_asset.image_hash`。P1C-R1 没有 provider file ID，因此其 40 个文件名继续作为来源注记，未创建任何虚构或 unresolved 资产占位符。

`image_perceptual_hash` 是资产内容的视觉相似指纹表。目前只允许 `phash`；每条记录必须关联生成它的 `source_content_sha256`、算法版本及特定资产。相同 pHash 可存在于不同资产；它只支持 exact-pHash 与未来 Hamming-distance 的候选查询，绝不授权自动合并 asset、reference 或手串分组。

`focal_assembly → focal_assembly_item → component` 记录可复用的焦点结构；`hardware_language` 说明金属件在其中的语义角色。

`product_concept → bom → bom_line → component` 为未来成本核算保留稳定连接；`supplier_offer` 可指向材料变体或组件；所有市场与供应商事实均通过 `source` 保存来源与验证状态。

## 核心约束

- `material_variant.reproducibility = one_of_one` 时必须填写 `unique_piece_code`。
- 图片观察不是确认事实：只有 `identification_status = confirmed` 才能填写 `confirmed_material_variant_id`。
- `design_assessment` 与 `preference_evidence` 是不同表；不会把模型判断伪装成用户偏好。
- `visual_communication_reference` 与 `design_assessment` 是不同表；不会把促销图风格结论混为产品结构。
- `market_evidence`、`source`、`supplier_offer` 保存日期、验证状态、证据强度或说明；未核实不会被静默升级。

## 属性的表达方式

- 主题、形状、色彩角色的基础字典在 `reference_enum`，为 CSV/XLSX 映射与未来 UI 下拉框准备。
- 色相、饱和度、明度、温度、透明度、光学特征、包含物／幻影／景观／带状等，保留在材料变体描述字段与图片观察字段中，避免在 P0 过早制造难维护的颜色学子表。
- `component` 保存形状、孔径、尺寸、设计角色、视觉重量、金属表面工艺等真正影响制作的信息。

## 迁移策略

迁移文件按编号放在 `migrations/`；`schema_migration` 记录已执行版本。P0 使用 `001_initial.sql`。之后只新增迁移，不修改已上线迁移。
