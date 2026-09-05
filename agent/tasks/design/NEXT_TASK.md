# Crystal｜设计 — NEXT TASK

Protocol: CRYSTAL-SUPERVISOR-V1
Priority: P0-URGENT
Status: AUTHORIZED_EXECUTE_TO_DELIVERABLE
Owner: Crystal｜设计
Language: 中文为主

## 当前主管判断

18 款目前的主要卡点不是 Workbench，也不是 P3R，而是：GitHub 中尚无 `outputs/handoffs/design/`、尚无 `outputs/designs/nature-launch-v1.json`，说明 18 款正式候选还没有被实际产出/提交。

选品正式 Working Version 尚未完成会影响最终采购批准，但**不应该阻塞设计本身**。缺失规格可以先标 `PROPOSED` 并提交 material change proposal。

因此本轮不要继续停留在概念讨论，直接完成 18 款可被 Workbench 读取的设计包。

## 目标

完成 Crystal 自然主题首发系列：

1. Mountain / 山
2. Ocean / 海
3. Forest / 森林
4. Sunrise / 日出
5. Starlight / 星辰
6. Glacier / 冰川

每主题 3 款，共 **18 款正式候选**。

不是同款换色，也不是简单低/中/高品质分层。

## 必须先读取

1. `docs/CRYSTAL_DESIGN_PACKAGE_V1.md`
2. `agent/tasks/selection/NEXT_TASK.md`
3. 当前正式/历史选品数据：`data/assortment-selection-v1.json`、`outputs/assortment-selection-v1.json` 及仓库中更新后的正式 Working Version（如已存在）
4. `agent/tasks/inspiration/NEXT_TASK.md` 及灵感 Agent 已产生的最新 evidence（如已存在）

如果灵感/选品尚未交付，不等待；使用现有证据和 `PROPOSED` 状态继续。

## 设计输出契约

正式机器可读文件必须写：

`outputs/designs/nature-launch-v1.json`

人类可读主视图必须写：

`outputs/designs/NATURE_LAUNCH_18_BOARD.md`

主视图不是 18 篇长文。必须用 **6×3 Portfolio Board** 为第一层呈现：六个主题，每主题三张设计卡；每张卡突出：
- 中文名 / English name
- 场景
- 结构 archetype
- 核心材料
- 主石/视觉重心
- 目标手围
- bead count
- material status summary
- 为什么与同主题另外两款不同

详细 BOM / 排珠 / 打样说明放第二层。

## 每款必须可被 Workbench 真实验证

按 `docs/CRYSTAL_DESIGN_PACKAGE_V1.md` 输出真实排珠序列。

每一个珠子/异形主石/结构件都要成为独立 bead instance，至少包含：
- position
- material_id
- spec_id
- display_name_zh / en
- form
- size_mm
- role
- source_status

不能只写“海蓝宝若干颗”“银件适量”。

每款同时提供：
- expected_bom
- structure_signature
- alternatives
- sample_notes
- procurement_questions
- material_change_proposals

## 三款结构差异硬要求

每主题 3 款必须至少在两个以上维度明显不同：
- symmetry / asymmetry
- focal strategy
- bead-size rhythm
- main-stone placement
- metal ratio
- material count
- negative space / interruption
- shape language
- masculine / neutral / refined language

禁止：
- 同排列只换颜色；
- 同结构只换材料；
- 同款做低/中/高配；
- 只改主石名称但视觉重心不变。

必须写差异矩阵，并主动标出你认为仍然相似的 pair。

## 审美基线

Ocean / Glacier：冷蓝、通透、冰感、水感、空气感、清洁；避免廉价彩色串珠感。

Forest：深墨绿、黑灰、木材/沉香感、低调银色、方形/异形主石、男性/中性；避免传统普通佛珠感。

Mountain：不要机械等于“棕色+虎眼石”；应有岩层、雾、雪线、地质结构或阴影层次。

Sunrise：不要机械等于“粉+黄”；需要控制暖光比例，避免甜腻和婚礼饰品感。

Starlight：不要机械等于“紫水晶+黑曜石”；重点是夜空、微光、闪烁、深浅层次和留白。

Glacier 与 Ocean 必须避免互相变成同一套蓝白串；两者的结构语言和光感要有明确区别。

## 手围与制作

首轮可以统一以 16.0 cm 作为主要验证手围，并在设计里明确 target wrist；如设计语言明显需要其他手围可提出，但不要为每款随意改变目标。

计算必须考虑每颗实际 `size_mm`；如果异形主石不能用单一尺寸描述，在 `sample_notes` 中提供长×宽×厚和沿线估算尺寸。

Workbench 后续给的是 `fit estimate`，不是实物佩戴保证；设计仍需给打样余量/弹力线/孔径/重心注意。

## 与选品协作

任何表外材料/规格都允许设计提出，但必须：
- `source_status = PROPOSED`
- 写 `material_change_proposal`
- 提供 acceptable substitute
- 说明若被拒绝会怎样影响设计

完整提案写入：
`outputs/handoffs/design/material_change_proposal-*.json`

不要等选品批准完才继续其余款。

## 与 Workbench 协作

P4 工程已启动，会读取 `outputs/designs/nature-launch-v1.json`。

你不要开发 Workbench。

一旦 18 款 JSON 形成并 push，工程 Agent 应能自动加载并验证：
- BOM 聚合
- fit estimate
- material/spec mapping
- duplicate structure warning
- 6×3 Portfolio Board

如果工程尚未完成，你仍先交付完整设计包，不要阻塞。

## 本轮必须交付

- `outputs/designs/nature-launch-v1.json`
- `outputs/designs/NATURE_LAUNCH_18_BOARD.md`
- 六主题设计语言说明
- 18 款 expected BOM
- 18 款真实 bead sequence
- 18 款 structure_signature
- 差异矩阵
- material change proposals（如有）
- `outputs/handoffs/design/` 最终 handoff

## 自检

完成前逐项检查：
- design_count = 18；
- 每主题 = 3；
- 每款 beads 非空且 position 连续；
- 每款 BOM 能从 beads 聚合；
- 每款 target wrist 明确；
- 所有材料有 APPROVED / PROPOSED / UNRESOLVED；
- PROPOSED 都有 proposal；
- 同主题结构不是换色；
- Ocean ≠ Glacier；
- Mountain ≠ 普通棕色佛珠；
- Forest ≠ 普通木串；
- Sunrise 不甜腻；
- Starlight 不靠“紫+黑”凑主题。

## 执行习惯

一次性完成。遇到单项材料 blocker：标记、提 proposal、继续其他设计。

只有剩余所有设计都无法继续时才停下来要求用户决策。

最终报告只保留：
- result
- current_state
- design_count_by_theme
- strongest_designs
- weak_or_risky_designs
- material_change_proposals
- deliverables
- risks_blockers
- decision_required
- next_action
- commit_sha

完成后 commit + push `main`，不要自行宣布主管 Accepted。
