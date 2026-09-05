# Crystal｜灵感 — NEXT TASK

Protocol: CRYSTAL-SUPERVISOR-V1
Priority: P1
Status: AUTHORIZED
Owner: Crystal｜灵感
Language: 中文为主

## 目标

为六个自然主题提供可被主管与设计 Agent 使用的审美/结构/市场证据，不直接决定最终选品或设计。

主题：Mountain / Ocean / Forest / Sunrise / Starlight / Glacier。

## 证据边界

必须明确区分：
- 平台可见度/热门；
- 实际购买或销售证据；
- 用户上传参考；
- 用户明确审美偏好；
- Crystal 是否应该采用。

这些不是同一件事。不得因为用户上传图片就自动推断用户喜欢；不得因为 TikTok/Instagram/Pinterest 热门就推断销量；不得仅凭照片确认水晶真伪、产地或处理方式。

你只提供证据与解释，不直接修改正式采购表，不直接批准最终设计。

## 本轮范围

优先支持当前 P0 业务，不做无边界素材搜集。

### A. 六主题结构与视觉证据

每个主题至少归纳：
- 常见但可用的视觉语言；
- 容易俗套/廉价化的做法；
- 值得借鉴的结构手法；
- 男性/中性表达机会；
- 与 Crystal 当前审美基线的冲突点；
- 可转化成设计规则的证据。

### B. 欧洲市场定向证据

优先看欧洲可获得/可销售语境，按需要使用：品牌官网、YouTube、TikTok、Instagram、Pinterest、零售站点等。

对任何“市场趋势”结论，尽量保留来源、日期、平台和证据类型。若只有视觉热度而无购买证据，明确标记为 visibility evidence，不得升级成 demand evidence。

### C. 用户参考图与多角度归组

如仓库/授权源中存在用户参考图，进行多角度同款归组、结构拆解和可借鉴元素提取；不因 P3R 缺少真实 SHA 而伪造 canonical 证据。P3R blocker 保持原样。

### D. 给设计 Agent 的可执行输出

每个主题形成不超过必要数量的高价值结论：
- 推荐结构语言；
- 禁用/谨慎模式；
- 参考材料方向（仅作为建议，不是采购批准）；
- 2–5 个值得转译的设计动作；
- 证据强度。

## 图片原则

可使用真实外部图、用户授权图或 `generated_from_evidence`，但必须准确标注来源性质。`generated_from_evidence` 不能标成 `source_photo`。

找图的目的不是填满素材库，而是帮助判断设计语言和品质差异。近期不要为了 Workbench 素材完整度扩 scope。

## 正式交付

至少输出：
- 六主题 evidence brief；
- 结构/视觉模式矩阵；
- 市场证据与购买证据分层表；
- 对设计 Agent 可直接使用的 theme recommendations；
- 关键参考图/来源索引（仅在授权与来源明确时）；
- `outputs/handoffs/inspiration/` 最终 handoff。

不要删除历史研究文件。

## 验收条件

主管只接受能回答“这条证据支持什么、不能支持什么”的研究。以下情况会 Rework：
- 把平台热门写成购买需求；
- 把用户上传写成用户明确喜欢；
- 只堆图片无结构结论；
- 与六主题 P0 设计无关的大范围扩展；
- 未标注来源性质；
- 研究结论直接修改正式采购事实。

## Handoff

写入：`outputs/handoffs/inspiration/`

最终报告只包含：
- result
- current_state
- strongest_findings
- evidence_limits
- deliverables
- risks_blockers
- decision_required
- next_action
- commit_sha

完成后 push `main`，不要自行宣布主管 Accepted。