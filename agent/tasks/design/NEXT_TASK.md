# Crystal｜设计 — NEXT TASK

Protocol: CRYSTAL-SUPERVISOR-V1
Priority: P0
Status: AUTHORIZED
Owner: Crystal｜设计
Language: 中文为主

## 目标

完成 Crystal 自然主题首发系列：6 个主题 × 每主题至少 3 款 = 至少 18 款正式设计候选。不是同款换色，也不是简单低/中/高品质分层。

主题：
1. Mountain / 山
2. Ocean / 海
3. Forest / 森林
4. Sunrise / 日出
5. Starlight / 星辰
6. Glacier / 冰川

## 设计边界

1. 使用 Crystal｜选品维护的正式材料 Working Version，但不受旧 Excel 限死。
2. 如真实设计需要新增水晶、珍珠、木材、珠径、切型、主石、配饰、银件或结构件，必须生成 `material_change_proposal`，交给 Crystal｜选品审核。
3. 在选品 Agent 正式回写前，新增材料只能标记为 PROPOSED，不得伪装成已批准采购项。
4. 最终批准设计必须全部映射回正式采购 Excel；主管验收时发现表外材料即 Rework。
5. 不直接修改正式采购主表。
6. 不开发 Workbench；现有手串编辑器只作为可选设计辅助，不是本轮交付前提。
7. 不因 P3R、素材缺图、Workbench 图片问题停止设计。

## 结构差异要求

每个主题的至少 3 款必须有真实结构语言差异。可来自：
- 主石位置；
- 珠径节奏；
- 异形珠；
- 结构件；
- 金属比例；
- 非对称设计；
- 留白；
- 材料组合；
- 视觉重心；
- 男性/中性/不同佩戴语言。

禁止仅通过颜色替换、品质等级替换或同排列换材来凑 3 款。

## 审美基线

长期方向仅作为约束，不机械套用：

Ocean / Glacier：冷蓝、通透、冰感、水感、空气感、清洁，避免廉价彩色串珠感。

Forest：深墨绿、黑灰、木材/沉香感、低调银色、方形/异形主石、更男性或中性，避免传统普通佛珠感。

四神兽相关历史方向不属于本轮六主题硬任务，不要顺手扩 scope。

## 每款必须包含

- 中文名
- English name
- 主题
- 情绪/自然场景
- 色彩语言
- 核心材料
- 辅助材料
- 主石
- 珠径
- 数量
- 排列
- 配饰
- 目标手围
- BOM
- 替代材料
- 打样注意
- 采购确认问题
- 视觉设计稿或可被视觉化执行的结构图/排珠图
- material source status（APPROVED / PROPOSED / UNRESOLVED）

## 设计方法

先建立 6 个主题各自的设计语言，再在主题内部做三种结构方向。设计应考虑真实制作、孔径、珠径节奏、佩戴舒适、手围闭环、主石重量感和采购可得性。

如果某设计只有“概念漂亮”但 BOM 无法采购或无法装配，必须降级为 concept，不得计入 18 款正式候选。

## 与选品 Agent 协作

持续读取正式选品 Working Version。发现缺口时写入：
`outputs/handoffs/design/material_change_proposal-*.json`

每条 proposal 至少含：
- design_id / theme
- requested_material
- requested_spec
- why_needed
- acceptable_substitute
- impact_if_rejected
- evidence_or_design_reason

不要等待所有 proposal 一次性审批后才继续；可先用 PROPOSED 状态推进其他不冲突设计。

## 正式交付

至少：
- 18 款设计总表（机器可读 JSON + 人类可读文档）
- 每款 BOM
- 六主题设计语言说明
- material change proposals（如有）
- 设计间差异检查矩阵，证明不是同款换色
- `outputs/handoffs/design/` 最终 handoff

不要删除历史设计或旧素材。

## 验收条件

主管将逐款判断 Accepted / Rework / Partial / Blocked。至少检查：
- 是否真的达到 18 款；
- 每主题 ≥3 款；
- 结构差异是否真实；
- 是否符合主题而非堆材料；
- BOM 是否完整；
- 手围与珠径/数量是否自洽；
- 是否存在表外正式材料；
- 是否过度依赖市场热门或历史偏好；
- 是否具备打样价值。

## Handoff

写入：`outputs/handoffs/design/`

最终报告只保留：
- result
- current_state
- design_count_by_theme
- material_change_proposals
- deliverables
- risks_blockers
- decision_required
- next_action
- commit_sha

完成后 push `main`，不要自行宣布主管 Accepted。