# Crystal｜工程 — STATUS

Protocol: CRYSTAL-SUPERVISOR-V1
Priority: P0-SUPPORT
Status: P4_ENGINEERING_VERIFIED_PENDING_ASSET_AND_MAPPING_INPUTS
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

当前：P4 工程主功能与真实浏览器验收已完成；总任务按 PARTIAL 如实交接，未把实物还原度或采购批准报告为完成。

## 本轮验证（2026-09-06）

- 保留 Fabric.js；散珠/收拢、逐颗移动/换位/替换、混合尺寸、撤销/重做、保存/重载、BOM/下载均已实现。
- 真实 18 款候选全部通过浏览器载入和 BOM 核对，6×3 看板可用。原设计仅创建本地可编辑副本。
- 本轮修复目录备选被盘内实例覆盖、异步页面退出回写、尺寸输入未失焦失效、重名中文草稿及下载入口问题。
- 对远端的新选品/灵感 handoff 已安全合并；5 个 add/add 冲突均保留远端权威版本，核对这些文件与 origin/main 完全一致，不改设计语义。
- 精确测试数字、数据库 SHA 与截图见 `outputs/p4-crystal-studio-validation.json`；细节见 `outputs/p4-browser-runtime-evidence.json`。

## 剩余输入缺口，不继续擅自扩展

1. 22 张 Drive 图已由灵感侧取得源字节并审计，全部 REFERENCE_ONLY，生产 sprite 0。仍需干净、权利明确、材料/规格映射明确的单珠/裸石源图。
2. CR-MAT-V1-20260906 存在，50 材料 / 66 规格 / 0 采购批准。设计 slug 与 CRM-M/CRM-S 键没有确定性对照，不按名称猜映射，不自动审批。
3. 实物佩戴、异形/弧管尺寸及审美接受仍需主管/打样核对；近似 fit 并非合格成品保证。

canonical SQLite 未写；P3R preserved；用户 exports 保持未跟踪且未触碰。工程等待上述角色输入，不开始后续业务阶段。
