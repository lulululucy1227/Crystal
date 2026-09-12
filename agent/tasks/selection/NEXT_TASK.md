# Crystal｜选品 — NEXT TASK

Protocol: CRYSTAL-SUPERVISOR-V1
Priority: SUPPORT
Status: HOLD_SUPPORT_ONLY
Owner: Crystal｜选品
Language: 中文为主

## 当前主管决定

近期主任务已经收敛为“最终材料选品 + 18款自然主题最终设计 + 最终Excel + 18张设计图”。

为避免多 Agent 同时写材料事实和最终表，本轮不再由 Crystal｜选品独立启动第二套输出。

现有选品成果继续作为正式输入：
- `outputs/selection/assortment-v1.json`
- `outputs/selection/knowledge-base-v1.json`
- `outputs/selection/working-version-nature-launch-v1.json`
- `outputs/selection/design-material-spec-mapping-nature-launch-v1.json`
- `outputs/selection/material-change-review-nature-launch-v1.json`
- `outputs/selection/unresolved-items-v1.json`
- `outputs/handoffs/selection/SELECTION-NATURE-LAUNCH-V1.json`

## 本轮角色

Crystal｜设计是 FINAL RELEASE OWNER，负责一次性生成最终用户交付。

Crystal｜选品本轮仅在以下情况重新激活：
1. Release Owner 发现材料身份/规格存在真正冲突；
2. 主管要求新增或删除正式材料；
3. 需要对某个材料事实做专项核验。

在没有上述请求时：NO ACTION REQUIRED。

## 边界

- 不再另建第二份最终 Excel；
- 不与 Release Owner 竞争写最终材料清单；
- 不因为缺供应商、价格、采购链接、批次/产地信息阻塞本轮最终设计包；
- 本轮最终 Excel 明确不需要采购链接；
- purchase-approved / supplier / batch evidence 留到后续采购阶段。

历史任务与 handoff 全部保留在 Git 历史中。