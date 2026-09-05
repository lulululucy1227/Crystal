# Crystal｜灵感 — NEXT TASK

Protocol: CRYSTAL-SUPERVISOR-V1
Priority: P0-SUPPORT / P1-RESEARCH
Status: AUTHORIZED_EXECUTE
Owner: Crystal｜灵感
Language: 中文为主

## 目标

本轮有两条并行职责：

1. 为 Mountain / Ocean / Forest / Sunrise / Starlight / Glacier 六主题提供可执行的结构/审美/市场证据；
2. 对用户 Google Drive 中可用于 Workbench 的真实材料图片做筛选、归组和“可抠图资产”判定，优先减少不必要的仿真水晶生成。

你仍然只提供证据与素材判断，不批准采购，不修改 canonical，不替工程改 Workbench。

## A. 六主题证据

每个主题至少输出：
- 可用视觉语言；
- 容易俗套/廉价化的做法；
- 值得借鉴的结构手法；
- 男性/中性表达机会；
- 与 Crystal 审美基线的冲突点；
- 2–5 个设计 Agent 可直接转译的动作；
- 证据强度。

必须区分：
- visibility evidence / 平台可见度；
- demand evidence / 购买或销售证据；
- user reference / 用户上传参考；
- explicit user preference / 用户明确偏好；
- Crystal recommendation / 独立判断。

不得把这些混为一谈。

## B. Google Drive 真实材料素材审计

优先检查用户已经放在 Google Drive 的 Crystal 相关材料图片。目标不是“看图觉得好看”，而是判断它是否适合作为 Workbench 单珠/主石/材质视觉资产。

对每个候选图记录：
- Drive file id / name / locator；
- 来源性质：user-owned / supplier / brand / unknown；
- 是否允许公开：YES / NO / UNKNOWN；
- 对应 material/spec 候选；
- source type：single-bead / strand / bracelet / loose-stones / macro / multi-angle / comparison；
- resolution / sharpness；
- background complexity；
- reflection / overexposure；
- occlusion；
- perspective severity；
- 是否能独立抠出一颗或一个主石；
- 是否适合作为 hero；
- 是否适合作为 Workbench sprite；
- 是否只能作为识别/品质证据而不能做 sprite；
- recommended action：USE_AS_SOURCE / CUTOUT / CROP_SINGLE_BEAD / NEEDS_MANUAL_MASK / REFERENCE_ONLY / REJECT。

不要仅凭照片确认真伪、产地或处理方式。

## C. 抠图与生成的边界

主管已经确定默认优先级：

`真实可用源图抠图 > 中性技术优化 > generated_from_evidence 仿真图 > fallback`

因此：
- 如果 Drive 里已有足够清晰、角度合适的真实单珠/主石图，优先抠图，不再重复生成仿真水晶；
- 如果只有整串、严重遮挡、过曝、低分辨率、强透视，不能为了“省生成”硬抠出错误资产；
- 不得把一张真实材料图人工改造成假的 low/mid/high 三个品质等级；
- 如果真实证据不覆盖某个品质/切型/珠径，生成补位可以继续，但必须标 `generated_from_evidence`；
- `generated_from_evidence` 永远不能标 `source_photo`。

## D. 角色分工

你负责“视觉素材的语义和证据质量”：选哪张、为什么、对应什么、是否适合抠图、是否代表该材料/规格、来源是否可公开。

Crystal｜选品负责最终确认材料身份/规格/品质标签。

Crystal｜工程负责批量资产生产与 Workbench 接入：背景移除、透明背景、尺寸归一、压缩、manifest、加载顺序、真实浏览器 QA。

如果你的当前工具能够可靠对单张图片完成透明抠图，可以处理少量高价值/难例；但批量生产不要为了“全由灵感 Agent 完成”而手工重复。最终应把可执行 manifest/handoff 交给工程。

## E. 公共仓库风险

`lulululucy1227/Crystal` 当前是 public repo。

未经明确公开授权的 Google Drive 图片、供应商图、品牌图、私人图，不得 push 到 public GitHub。

你可以提交：
- 文件 id / locator（如果不泄露敏感信息）；
- 来源性质；
- 处理建议；
- asset manifest；
- 低敏感元数据。

不要提交：
- 未授权源图；
- 未授权抠图衍生图；
- 私人 Drive 内容本身。

## F. 正式交付

六主题研究：
- evidence brief；
- 结构/视觉模式矩阵；
- 市场证据与购买证据分层；
- theme recommendations。

Google Drive 素材：
- `outputs/handoffs/inspiration/workbench-source-asset-plan-v1.json`
- 可用源图清单；
- 需抠图清单；
- reference-only 清单；
- rejected 清单与原因；
- rights/publication status；
- material/spec 候选映射；
- 优先处理顺序。

若当前无法访问/下载某些 Drive 源字节，不得伪造；标 blocker 后继续研究与其他可访问素材。

## G. 对 18 款的支持优先级

设计 Agent 正在紧急产出 18 款。优先把能直接减少设计歧义的证据与素材判断先写回 GitHub，不必等待整个研究大包完成。

如果 18 款设计包已经出现：
- 优先检查其中被高频使用的核心材料和主石是否有可用真实素材；
- 避免花时间处理暂时不会进入首发设计的边缘材料。

## Handoff

写入：`outputs/handoffs/inspiration/`

最终报告只包含：
- result
- current_state
- strongest_findings
- source_asset_summary
- evidence_limits
- deliverables
- risks_blockers
- decision_required
- next_action
- commit_sha

完成后 commit + push `main`，不要自行宣布主管 Accepted。
