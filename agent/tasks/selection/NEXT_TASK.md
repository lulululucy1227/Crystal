# Crystal｜选品 — NEXT TASK

Protocol: CRYSTAL-SUPERVISOR-V1
Priority: P0
Status: AUTHORIZED
Owner: Crystal｜选品
Language: 中文为主

## 目标

建立可被真实设计反向修正、最终可交给合作伙伴采购的 Crystal 选品与材料知识主线。旧 Excel、数据库已有材料和历史选品均不是不可变边界；但任何最终批准设计不得存在表外材料或表外规格。

## 权威边界

1. 你是正式选品/采购主表的唯一主要写入者；设计 Agent 不维护第二套采购表。
2. 先审计并复用仓库已有事实，不从零重建：至少检查 `docs/ASSORTMENT_SELECTION_V1.md`、`data/assortment-selection-v1.json`、`outputs/assortment-selection-v1.*`、`data/p1c-knowledge-seeds.jsonl`，并检查仓库中现有相关输入/历史交付。
3. 数据库/历史记录只作为候选证据，不自动等于正式采购决定。
4. 设计 Agent 可以提出 `material_change_proposal`；你负责核对、接受/修改/拒绝，并将批准项写入正式采购主表。
5. 不因 Workbench 图片缺陷、P3R SHA blocker 或素材不完整而停止本任务。
6. 不写 canonical SQLite；如需读取仅只读。
7. 不开发 Workbench。

## 本轮必须完成

### A. 现有选品审计与 Working Version

对现有选品进行去重、命名统一、规格拆分和采购可执行性检查。明确区分：
- 材料身份（例如海蓝宝、黑发晶、Akoya）；
- 具体规格（珠径、切型、孔径、颜色/品质、主石/配珠用途、金属/结构件规格）；
- 研究候选；
- 已批准采购项；
- unresolved。

旧表中不适合真实设计的材料/规格可以修改或降级；设计需要的新材料/规格可以新增。

### B. 材料知识库

至少覆盖当前选品与六个自然主题直接相关的：
- 水晶/宝石；
- 珍珠；
- 木材/天然材质；
- 银件/金属配饰/结构件。

不同材料使用不同的品质判断逻辑，禁止强行统一“低中高”指标。知识项至少包括：中英文名、识别特征、常见品质变量、视觉差异、常见处理/仿冒风险（仅在证据足够时）、适合珠径/切型、设计用途、采购时必须确认的问题、证据状态。

材料图片原则：优先帮助“一眼识别品种和关键品质差异”；`generated_from_evidence` 不得称为 `source_photo`；不得仅凭照片确认真伪、产地或处理方式。

### C. 六主题设计支持

针对 Mountain / Ocean / Forest / Sunrise / Starlight / Glacier，给设计 Agent 提供可用材料池与规格建议，但不要代替设计 Agent 做最终款式决定。

特别保留但不机械采纳的历史线索：茶晶、黑发晶；Ocean/Glacier 的冷蓝通透冰水空气感；Forest 的深墨绿、黑灰、木材感、低调银色、男性/中性语言。

### D. 接收设计变更

检查 `outputs/handoffs/design/` 是否存在新的 `material_change_proposal`。如存在，逐条输出：ACCEPT / MODIFY / REJECT / NEEDS_EVIDENCE，并同步正式主表。单项 blocker 不阻塞其他可安全工作。

## 正式交付

优先生成并维护：
- `Crystal_水晶选品主表_V1.xlsx`
- `Crystal_水晶知识库_V1.xlsx`
- `Crystal_合作伙伴采购版_V1.xlsx`
- `assortment-v1.json`
- `knowledge-base-v1.json`
- `unresolved-items-v1.json`

如果当前执行环境无法可靠生成 xlsx，不得伪造完成：先完成机器可读 JSON/CSV 与字段定义，并在 handoff 中明确 xlsx blocker；其余工作继续。

将机器可读正式文件放在稳定、清晰的位置，并避免与旧 `assortment-selection-v1` 混淆。不要删除历史文件。

## 验收条件

主管只在以下条件同时满足时接受：
- 当前正式材料身份与规格边界清楚；
- unresolved 被明确隔离；
- 六主题设计有可执行材料支持；
- 设计提出的正式新增项能回写采购体系；
- 合作伙伴采购版不包含模糊、不可下单的描述；
- 不把市场热门、数据库存在、历史偏好自动当作采购理由；
- 无表外正式材料。

## Handoff

写入：`outputs/handoffs/selection/`

最终报告保持简洁，只包含：
- result
- current_state
- key_changes
- deliverables
- risks_blockers
- decision_required
- next_action
- commit_sha

完成后 push `main`，不要自行宣布主管 Accepted。