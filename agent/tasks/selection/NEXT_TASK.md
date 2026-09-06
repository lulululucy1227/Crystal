# Crystal｜选品 — NEXT TASK

Protocol: CRYSTAL-SUPERVISOR-V1
Priority: P0-REWORK
Status: AUTHORIZED
Owner: Crystal｜选品
Language: 中文为主

## 主管结论

上一轮选品结果为 `PARTIAL`，不是 Accepted。

已经确认完成：
- 18 款 design→CRM-M→CRM-S 精确映射；
- 38 条 material_change_proposal 已审核：28 ACCEPT / 10 MODIFY / 0 REJECT / 0 NEEDS_EVIDENCE；
- Working Version 升级为 `CR-MAT-V1.1-NATURE-LAUNCH-20260906`；
- Working specs 从 66 扩展到 93；
- 18 款无表外正式 material/spec 引用。

但 handoff 中“未收到 per-design BOM quantities/consumption”的判断与仓库当前事实冲突：
`outputs/designs/nature-launch-v1.json` 已包含逐珠 `beads[]`、position、quantity、size_mm、material_id、spec_id；P4 工程也已验证 18/18 BOM 聚合匹配、共 458 个实例。

因此本轮必须先消除这个事实冲突，再判断真实 procurement blockers。

## 本轮必须完成

### 1. BOM reconciliation

读取并以当前 main 为准：
- `outputs/designs/nature-launch-v1.json`
- `outputs/handoffs/design/NATURE_LAUNCH_V1_FINAL_HANDOFF.json`
- `outputs/selection/design-material-spec-mapping-nature-launch-v1.json`
- `outputs/selection/working-version-nature-launch-v1.json`
- `outputs/handoffs/engineering/P4-CRYSTAL-STUDIO-COMPLETION.json`

从 18 款逐珠数据重新聚合：
- 每设计 BOM；
- 每 design × spec consumption；
- 18 款总采购汇总；
- CRM-M / CRM-S 精确映射后的采购数量视图；
- 无法聚合的条目必须说明具体字段缺失，不得笼统写“未收到 BOM”。

### 2. 区分三种状态

严格区分：
- `DESIGN_MAPPED`：设计已映射到 Working Version；
- `PROCUREMENT_SPEC_FROZEN`：尺寸、孔径/连接方式、材质身份等已足够明确可用于询价/样品采购；
- `PURCHASE_APPROVED`：最终正式采购批准。

禁止因为缺少批次/供应商证据，就把所有 93 个 working specs 一律视为同等不可采购。

对每个被 18 款使用的 CRM-S 逐项给出：
- READY_FOR_SAMPLE_SOURCING
- READY_FOR_QUOTE_ONLY
- NEEDS_DIMENSION_FREEZE
- NEEDS_MATERIAL_IDENTITY_EVIDENCE
- NEEDS_BATCH_OR_TREATMENT_EVIDENCE
- BLOCKED

并给出理由。

### 3. Procurement shortlist

生成“首轮打样最小采购集”，目标不是一次采购全部 93 specs，而是覆盖18款验证所需的最小合理集合。

优先：
- 共用频率高的基础圆珠；
- 结构件/银件共用规格；
- 能同时验证多个主题的核心材料；
- 对审美影响最大的主石/异形件。

输出：
`outputs/selection/nature-launch-v1-sample-procurement-shortlist.json`

字段至少包括：
- crm_material_id
- crm_spec_id
- display_name
- used_by_designs
- total_quantity_for_18_designs
- sample_order_quantity_recommendation
- procurement_state
- unresolved_gate
- why_priority

### 4. 采购版 Excel 状态

检查仓库是否已经存在：
- `Crystal_水晶选品主表_V1.xlsx`
- `Crystal_水晶知识库_V1.xlsx`
- `Crystal_合作伙伴采购版_V1.xlsx`

若不存在，不得声称选品 V1 已最终完成。

如果当前 Work/执行环境可生成 xlsx，则基于当前 Working Version + 18款 BOM + shortlist 生成；如果仍不能可靠生成，则明确保留为 blocker，但必须提供等价 CSV/JSON 采购视图，不阻塞其他工作。

### 5. 不要错误扩大 blocker

以下事实不能自动阻塞所有样品采购：
- legacy Excel 尚未拿到；
- canonical SQLite export 尚未拿到；
- treatment/origin 尚未确认。

必须逐项判断这些信息到底是：
- 设计打样前必须；
- 正式批量采购前必须；
- 仅知识/溯源增强。

## 不要做

- 不修改 18 款设计审美内容；
- 不写 canonical SQLite；
- 不自动把 working spec 升级为 PURCHASE_APPROVED；
- 不为了“完整”新增与18款无关的大量材料；
- 不把历史 Excel 当成当前事实高于当前 main。

## 交付

至少更新/新增：
- `outputs/selection/nature-launch-v1-bom-aggregate.json`
- `outputs/selection/nature-launch-v1-procurement-readiness.json`
- `outputs/selection/nature-launch-v1-sample-procurement-shortlist.json`
- 必要时更新 `working-version-nature-launch-v1.json`
- `outputs/handoffs/selection/SELECTION-NATURE-LAUNCH-V1-RECONCILED.json`

最终 handoff 只保留：
- result
- bom_reconciliation
- mapped_designs
- specs_by_procurement_state
- sample_shortlist_count
- xlsx_status
- real_blockers
- decision_required
- next_action
- commit_sha

完成后 push main。不要自行宣布主管 Accepted。