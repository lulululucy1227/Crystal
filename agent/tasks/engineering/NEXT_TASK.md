# Crystal｜工程 — NEXT TASK

Protocol: CRYSTAL-SUPERVISOR-V1
Phase: P4-CRYSTAL-STUDIO-COMPLETION
Priority: P0-SUPPORT
Status: AUTHORIZED_EXECUTE_TO_FINAL_EFFECT
Owner: Crystal｜工程
Language: 中文为主

## 主管授权

解除此前 Workbench `FROZEN_SUPPORT`，仅为本 P4 任务重新激活工程。

Business reason：让现有 P3T 技术原型成为真正用于六主题 18 款首发设计、Workbench 验证、BOM、打样/采购核对的 Crystal Studio V1。

必须先读取并严格执行：

1. `docs/superpowers/specs/2026-09-06-crystal-studio-completion-design.md`
2. `docs/superpowers/plans/2026-09-06-crystal-studio-completion.md`
3. `docs/CRYSTAL_DESIGN_PACKAGE_V1.md`
4. `agent/MASTER_STATUS.json`
5. 当前 `workbench/` 与现有 P3T tests

基线 checkpoint：
`49432faa3101d9a682ce645a2a20849f9b149b66`

## 执行方式

这是一次性完整任务。使用 Superpowers 的 plan execution / subagent-driven 方法执行完整计划，不要每完成一个小步骤就停下来等待用户。

遇到问题：

- 先定位 root cause；
- 增加/调整 regression test（适用时）；
- 修复；
- 重跑失败 scope；
- 再跑完整 regression；
- 单项 blocker 记录后继续其他可安全任务；
- 只有剩余全部事项都需要用户决策/重新授权时才停止。

不要因为 18 款真实设计包尚未提交而停止 Studio 开发；使用 contract fixture 验证能力，真实设计包一旦出现立即自动切换为真实 18 款验证。

## 必须实现的最终效果

### 1. Crystal Studio

设计板升级为桌面优先 Studio：
- 大型圆形实体设计盘；
- Loose 散珠自由摆放；
- Bracelet 一键收拢成串；
- 逐颗新增/删除/替换/拖动/换位；
- 普通圆珠、异形主石、结构件统一进入设计；
- 15–20 cm 手围；
- 混合珠径按各自尺寸做近似 fit，而不是单一 fallback 珠径；
- Undo / Redo / Clear / Save / Reload；
- 搜索材料；
- 水晶 / 珍珠天然材质 / 配饰 / 异形主石分类；
- 材料卡显示图片、名称、规格、数量增减；
- 已知成本可聚合，未知价格不得编造。

吸收用户参考界面的交互层级，但不得复制第三方品牌 UI / trade dress，也不做购物车。

### 2. BOM + 采购状态

每个实例至少保留：
`material_id + spec_id + instance_id + size_mm + form + source_status`

实时自动 BOM；区分：
- APPROVED
- PROPOSED
- UNRESOLVED

Workbench 不得自动审批材料，不得写 canonical SQLite。

### 3. 18 款自然首发验证

读取：
`outputs/designs/nature-launch-v1.json`

完成：
- 六主题 × 三款 `6×3 Portfolio Board`；
- 每款可直接载入 Studio；
- 自动 BOM 对比；
- fit estimate；
- material/spec mapping；
- structure fingerprint duplicate warning；
- 保存/重载一致性；
- validation JSON。

若真实 18 款包还不存在，不允许工程自己编造首发设计，只能用 fixture 验证能力并等待设计 Agent 产出。

### 4. Google Drive / 真实素材抠图接入

实际视觉资产采用：
`真实源图抠图 > 中性技术优化 > generated_from_evidence > fallback`

角色边界：
- 灵感 Agent 决定哪些源图值得使用/归组以及来源性质；
- 选品 Agent 确认材料/规格标签；
- 工程负责批量图像处理与 Workbench 接入，不猜材料身份。

建立 rights-aware 本地资产管线：
- 输入默认 `inputs/local-assets/`；
- 输出默认 `workbench/assets/local/`；
- 计算真实源字节 SHA-256；
- 透明 PNG/WebP / 方形画布 / 尺度归一；
- manifest 映射；
- 本地资产优先加载；
- 无可靠自动抠图能力时输出 `needs_mask=true`，不得伪造好结果；
- 不为了抠图引入重量级 ML 依赖。

仓库当前是 public。第三方/供应商/私人 Google Drive 图片默认不得 push 到 public GitHub；只提交处理逻辑、manifest schema 和允许公开的资产。

### 5. 真实运行验收

最终必须在真实 `http://127.0.0.1:4173` 浏览器完成：

新增多尺寸珠子 → 散珠拖动 → 收拢成串 → 换位 → Undo/Redo → 手围变化 → BOM → 保存 → 重载 → 导出。

真实 18 款包存在时：全部 18 款通过 Workbench 载入/验证并显示 6×3 board。

测试通过不等于 UI 通过。不得用离线 mock screenshot 代替真实浏览器。

## 允许写入

允许：
- `workbench/`
- `test/`
- 与 P4 直接有关的 `tools/`
- `docs/` 中 P4 实现补充
- `outputs/p4-*`
- `outputs/handoffs/engineering/`
- `outputs/designs/*-workbench-validation.json`
- `agent/tasks/engineering/STATUS.md`

禁止：
- canonical SQLite 写入；
- 删除/清理 `workbench/exports/`；
- 修改选品正式采购事实；
- 替设计 Agent 编造 18 款正式设计；
- P3R blocker 伪修复；
- 电商/支付/订单/账号/云同步/供应商系统扩展。

## 验收命令

至少：

```powershell
npm test
npm run validate
git diff --check
```

并记录 canonical SQLite SHA before/after。

## 最终交付

必须写：
- `outputs/p4-crystal-studio-validation.json`
- `outputs/handoffs/engineering/P4-CRYSTAL-STUDIO-COMPLETION.json`

若真实设计包存在，再写：
- `outputs/designs/nature-launch-v1-workbench-validation.json`

最终报告只保留：
- result
- current_state
- implemented_capabilities
- design_package_status
- real_browser_QA
- test_summary
- canonical_db_sha_before_after
- real_asset_status
- risks_blockers
- decision_required
- next_action
- commit_sha

完成后 commit + push `main`，确认 `HEAD == origin/main`。

只有 spec 的 mandatory acceptance 全部满足才允许 `COMPLETED`；否则用 `PARTIAL` 并明确剩余 blocker。
