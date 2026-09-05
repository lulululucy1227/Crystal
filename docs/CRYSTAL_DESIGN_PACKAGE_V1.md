# CRYSTAL DESIGN PACKAGE V1

这是 Crystal｜设计 与 Crystal｜工程之间唯一的首发系列设计交换契约。目的不是建立新数据库，而是让 18 款设计可以被 Workbench 真实加载、复算 BOM、检查规格映射并进行视觉/结构验证。

## 文件位置

正式候选包：
`outputs/designs/nature-launch-v1.json`

人类可读总览：
`outputs/designs/NATURE_LAUNCH_18_BOARD.md`

Workbench 验证结果：
`outputs/designs/nature-launch-v1-workbench-validation.json`

## 状态边界

每个材料/规格实例必须使用：
- `APPROVED`：已经进入 Crystal｜选品正式 Working Version / 采购体系；
- `PROPOSED`：设计需要，但仍等待 Crystal｜选品确认；
- `UNRESOLVED`：身份或规格不足，不能作为最终批准设计材料。

18 款可以在 `PROPOSED` 状态下先完成设计与 Workbench 结构验证，但主管最终 `Accepted` 前，所有正式材料和规格必须回到采购体系。Workbench 不得自动把 PROPOSED/UNRESOLVED 升级为 APPROVED。

## 顶层结构

```json
{
  "version": "CRYSTAL-NATURE-LAUNCH-V1",
  "status": "CANDIDATE",
  "themes": ["Mountain", "Ocean", "Forest", "Sunrise", "Starlight", "Glacier"],
  "designs": []
}
```

必须恰好覆盖 6 个主题，每主题至少 3 款；首发正式候选目标为 18 款。

## 每款设计结构

```json
{
  "design_id": "MOUNTAIN-01",
  "theme": "Mountain",
  "zh_name": "中文名",
  "en_name": "English name",
  "scene": "自然场景与情绪",
  "color_language": ["关键词"],
  "target_wrist_cm": 16.0,
  "construction": "elastic",
  "structure_signature": {
    "archetype": "asymmetric_focal",
    "symmetry": "asymmetric",
    "focal_strategy": "single_focal_4_o_clock",
    "bead_rhythm": "8-6-8 with focal interruption",
    "metal_level": "low",
    "negative_space": "none",
    "wear_language": "neutral"
  },
  "beads": [],
  "expected_bom": [],
  "alternatives": [],
  "sample_notes": [],
  "procurement_questions": [],
  "material_change_proposals": [],
  "workbench_validation": {
    "status": "NOT_RUN"
  }
}
```

## bead 实例

`beads` 是真实排珠顺序，按手串顺时针排列。每一颗/每一个结构件都是独立实例；异形主石也作为一个实例，不用模糊的“若干颗”。

```json
{
  "position": 1,
  "material_id": "stable-material-id-or-slug",
  "spec_id": "stable-spec-id-or-slug",
  "display_name_zh": "海蓝宝",
  "display_name_en": "Aquamarine",
  "form": "round",
  "size_mm": 8,
  "quantity": 1,
  "role": "body",
  "source_status": "APPROVED"
}
```

规则：
1. `position` 连续且唯一；
2. `quantity` 在 bead 实例层通常为 1；如一个不可拆结构组件本身代表一组，可 >1，但必须说明；
3. `material_id + spec_id` 用于采购映射，不能只靠显示名称；
4. 无正式 ID 时允许临时稳定 slug，但必须 `PROPOSED`，并生成 material change proposal；
5. `size_mm` 表示沿串线方向用于拟合估算的主要尺寸，异形件如无法用单一尺寸准确描述，应另在 `sample_notes` 写清长宽厚及估算限制。

## expected_bom

设计 Agent 提供预期 BOM，Workbench 必须从 `beads` 自动聚合后比对；不一致即 validation warning/error。

```json
{
  "material_id": "aquamarine",
  "spec_id": "aquamarine-round-8mm",
  "display_name_zh": "海蓝宝 8mm 圆珠",
  "quantity": 4,
  "source_status": "APPROVED"
}
```

## material_change_proposals

如果任何实例为 PROPOSED，必须同时存在对应 proposal，可内联摘要并在：
`outputs/handoffs/design/material_change_proposal-*.json`
写完整提案。

至少包含：
- design_id / theme
- requested_material
- requested_spec
- why_needed
- acceptable_substitute
- impact_if_rejected
- evidence_or_design_reason

## Workbench 能验证什么

可以作为工程/结构事实验证：
- JSON 是否可解析；
- 6 主题 × 3 款覆盖；
- bead 顺序是否完整；
- 珠径/异形件尺寸是否存在；
- 目标手围与总串线尺寸的估算差；
- BOM 自动聚合是否与 expected_bom 一致；
- material/spec 是否能映射到正式 Working Version；
- APPROVED / PROPOSED / UNRESOLVED 状态；
- 18 款是否出现高度相同的结构指纹；
- 设计保存、重载后顺序与 BOM 是否一致；
- 在真实浏览器中的视觉排珠效果。

Workbench 不能替代主管/用户判断：
- “好不好看”；
- 是否高级；
- 是否真正符合用户审美；
- 市场是否一定会购买；
- 材料照片能否证明真伪/产地/处理方式。

因此 Workbench validation = 结构、数据、可制作性和视觉预览验证，不等于自动审美批准。

## 18 款呈现方式

不使用 18 篇长文作为主视图。正式呈现分三层：

1. `6 × 3 Portfolio Board`：六主题，每主题三张设计卡；卡片显示 Workbench 真实预览、中文/英文名、结构类型、核心材料、目标手围、material status、validation status。
2. 单款详情：真实设计盘预览 + 排珠序列 + BOM + fit estimate + 采购/打样风险。
3. 差异矩阵：同主题三款结构差异、全 18 款重复风险、材料重叠度。

这套层级用于快速筛选，同时保留足够工程细节。

## 验收状态

每款 Workbench validation 至少输出：

```json
{
  "status": "PASS|WARN|FAIL",
  "fit_estimate": {
    "target_mm": 165,
    "used_mm": 164,
    "delta_mm": -1,
    "confidence": "approximate"
  },
  "bom_match": true,
  "material_mapping": {
    "approved": 18,
    "proposed": 2,
    "unresolved": 0
  },
  "asset_fallback_count": 0,
  "duplicate_structure_warning": false,
  "browser_preview": "outputs/visual/nature-launch/MOUNTAIN-01.png"
}
```

`fit_estimate` 必须明确是估算，不能把简单几何模型表述成实物佩戴保证。

## 版本原则

V1 只服务当前六主题首发与 Workbench 验证。不要在本契约中加入供应商订单、电商购物车、用户账户、云同步、复杂 PLM 或 canonical 数据写入。
