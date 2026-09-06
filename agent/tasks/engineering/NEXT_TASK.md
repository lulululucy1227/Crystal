# Crystal｜工程 — NEXT TASK

Protocol: CRYSTAL-SUPERVISOR-V1
Phase: P4R-CANVA-REAL-ASSET-INTEGRATION
Priority: P0-SUPPORT
Status: AUTHORIZED_EXECUTE_TO_FINAL_EFFECT
Owner: Crystal｜工程
Language: 中文为主

## 主管结论

P4 功能 checkpoint 已通过，但主管不接受 `source_cutout = 0` 作为最终视觉状态。用户明确补充：Google Drive 中当前审核过的素材都应视为“值得实际尝试抠成干净单珠/单件素材”，不得仅因原图是截图、背景复杂或不是预裁切 sprite 就直接判定为 reference-only。

本任务是 P4 的聚焦续作，不重新开发 Workbench 架构。

必须先读取：
- `outputs/handoffs/engineering/P4-CRYSTAL-STUDIO-COMPLETION.json`
- `outputs/handoffs/inspiration/` 最新 source audit / evidence handoff
- `outputs/designs/nature-launch-v1.json`
- `data/` 与正式 Working Version 中可用的材料/spec 标签
- 当前 `workbench/assets/`、本地素材 manifest 与图像处理脚本

## 核心任务

### A. 对现有 Google Drive 素材逐张实际尝试抠图

对当前已审核的 22 张 Drive 源图逐张执行真实尝试，不允许仅凭截图形态提前淘汰。

优先工具链：
1. Canva：允许并优先使用 Canva 的背景移除、裁切、Magic Grab / 图像编辑等可用能力，尤其处理透明/半透明水晶、珍珠、银件、异形主石等普通自动分割容易失败的素材；
2. Sharp：做透明边界清理、方形画布、尺度归一、PNG/WebP 输出和压缩；
3. 若 Canva/现有工具无法可靠完成，再评估轻量开源方案；不得为了这一任务引入重型、长期维护成本高的 ML 栈；
4. 最后才允许 `needs_mask=true`。

如果当前 Canva connector/API 没有直接背景移除动作，可在 Work/浏览器环境中使用 Canva 编辑器完成，不要因此判定“Canva不可用”。但不得把私人素材为了工具兼容性上传到公开临时图床。

### B. 每张图的验收标准

目标不是“自动算法跑完”，而是 Workbench 可用的 production sprite：
- 主体完整，不能切掉珠体边缘、月光/晕彩、发丝、晶体透明边缘；
- 不保留明显原背景矩形块；
- 透明/半透明区域允许保留合理 alpha；
- 单珠/单件居中但不强制几何圆形；
- 保留真实纹理，不做会改变材料身份或品质判断的美化；
- 不通过调色制造不存在的低/中/高品质；
- 输出透明 PNG 或 WebP，并保留源图 SHA-256、source reference、处理方法、人工/Canva/自动标记。

### C. 来源和身份边界

用户关于“这些图都值得抠图尝试”的判断，覆盖此前“全部只适合 reference-only”的可用性结论；但不覆盖以下边界：
- 不得仅凭图片猜材料真伪、产地、处理方式；
- 材料/spec 映射必须使用已有明确标签或选品提供的映射；
- 不确定身份时可产出 cutout，但标记 `identity_status=UNRESOLVED`，不能映射成正式采购事实；
- 仓库为 public，未明确 rights-cleared 的原图和抠图默认保持 local/private，不 push 二进制到 public GitHub。

### D. Workbench 替换策略

生产视觉优先级固定为：
`source_cutout > source_neutral_optimized > generated_from_evidence > fallback`

完成一张合格 source cutout 后，立刻通过 manifest 让 Workbench 优先使用；不要等 22 张全部处理完才接入。

按 18 款 BOM 实际使用频率优先处理高频材料和结构件，但最终本轮应对 22 张全部尝试并给出逐张结果。

### E. 真实浏览器复验

至少验证：
- source_cutout 实际 HTTP 200 加载；
- 材料卡和设计盘均显示真实抠图；
- 透明边缘无明显黑/白底；
- mixed-size、drag、compact、save/reload 不受影响；
- 18 款设计中实际替换后的 source_cutout 数量统计准确；
- console/network 无新增错误。

不得以脚本 manifest 正常代替真实浏览器视觉验收。

## 开源 / Skill 授权

允许自行检索、安装、测试并使用成熟开源库、CLI、SDK 或现有 Skill，前提是明确减少重复造轮子并符合当前架构。

引入前检查：许可证、维护状态、Windows + Node 24 兼容性、依赖重量、隐私边界、与现有 Fabric.js/Sharp 的冲突。

MIT / Apache-2.0 / BSD 类低风险依赖可自行采用；GPL / AGPL / SSPL、商业 SDK、需要把私人素材上传第三方公开云端的方案不得自行纳入正式实现。

如果现有 Canva + Sharp 已经足够，不得为了“使用开源方案”而重构。

## 执行方式

连续执行到最终效果。遇到失败：实际尝试 → 判断 root cause → 更换方法/修边 → 浏览器复验。单张图片失败不阻塞其他图片。只有剩余全部素材都需要用户重新授权或人工源文件时才停止。

## 正式交付

更新/新增：
- `outputs/p4-real-asset-validation.json`
- `outputs/handoffs/engineering/P4R-CANVA-REAL-ASSET-INTEGRATION.json`
- 本地/private asset manifest（不要把受限二进制误推 public）
- 必要的 Workbench manifest/runtime 代码和 tests

最终报告必须包含：
- result
- attempted_source_count
- successful_cutout_count
- needs_mask_count
- source_cutout_runtime_count
- per_source_result_summary
- canva_usage
- tooling_changes
- real_browser_QA
- test_summary
- rights/private_asset_status
- unresolved_identity_mapping
- risks_blockers
- next_action
- commit_sha

完成后 commit + push `main`；不得自行宣布主管 Accepted。