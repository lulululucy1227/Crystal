# Crystal｜工程 — STATUS

Protocol: CRYSTAL-SUPERVISOR-V1
Priority: P0-SUPPORT
Status: ACTIVE_P4
Owner: Crystal｜工程
Language: 中文为主

## 当前状态

此前 Workbench 在 checkpoint：
`49432faa3101d9a682ce645a2a20849f9b149b66`
冻结。

现由 Crystal｜主管明确解除冻结，仅授权执行：
`P4-CRYSTAL-STUDIO-COMPLETION`

最新任务：
`agent/tasks/engineering/NEXT_TASK.md`

必须读取：
- `docs/superpowers/specs/2026-09-06-crystal-studio-completion-design.md`
- `docs/superpowers/plans/2026-09-06-crystal-studio-completion.md`
- `docs/CRYSTAL_DESIGN_PACKAGE_V1.md`

## 业务目标

把现有 P3T 技术原型升级为可真实用于：
- 手串设计；
- 18 款自然首发载入/验证；
- 混合珠径/异形主石排布；
- BOM；
- 材料/规格采购状态检查；
- 保存/重载/导出；
- 真实 Google Drive/本地源图抠图资产接入；
- 打样前验证。

工程不代替设计 Agent 产出 18 款，也不代替选品 Agent 审批采购材料。

## 写入边界

canonical SQLite：READ ONLY。

允许写 P4 直接相关的 Workbench、tests、tools、docs、P4 outputs/handoff/validation。

`workbench/exports/` 保持用户所有；不清理、不删除。

P3R blocker 继续独立 unresolved。

## 完成标准

测试通过只是必要条件，不是充分条件。

必须有真实 `http://127.0.0.1:4173` 浏览器流程验收，并且：
- 真实 UI 可用；
- 资源真实加载；
- 保存/重载一致；
- BOM 正确；
- canonical DB SHA before == after；
- 18 款真实设计包存在时全部经过 Workbench 验证；
- 遇到 P4 问题必须执行 diagnose → regression test → fix → rerun 的修复闭环。

当前：ACTION REQUIRED — 读取 `NEXT_TASK.md` 并连续执行到最终状态。
