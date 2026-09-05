# Crystal｜工程 — STATUS

Protocol: CRYSTAL-SUPERVISOR-V1
Priority: FROZEN_SUPPORT
Status: FROZEN
Owner: Crystal｜工程
Language: 中文为主

## 当前状态

Workbench 工程开发冻结。不得自行开始新 UI、功能、素材运行时、数据库、P3R、采购、供应商或调度平台开发。

冻结 checkpoint：
`49432faa3101d9a682ce645a2a20849f9b149b66`

该提交信息：
`chore: checkpoint and freeze P3T bracelet editor`

其前置核心提交：
- `a6ef991` — docs: define bracelet editor open-source integration
- `9e1c830` — feat: add interactive circular bracelet studio
- `b991ece` — fix: support free bracelet bead insertion and dragging

## 已冻结能力

- 圆形手串设计盘
- 逐颗插入
- 同材料独立实例
- 独立移动/拖动
- 占位让位/换位
- 数量账本
- 15–20 cm 手围
- 参考珠径
- undo / redo
- 均匀初排
- 清空排珠
- 草稿保存
- 设计单导出

历史冻结报告记录的测试状态：focused 26 passed / 0 failed；npm test 139 passed / 0 failed / 1 expected Windows symlink skip；npm run validate PASS；git diff --check PASS。

Canonical SQLite 历史 SHA：
`8FE0CA49229808D3F737D14F0A4B5698B971827BFEC11E05E4FFCAE2A3B85DC6`

## 重要验收规则

历史曾出现“测试/离线渲染显示正常，但用户真实浏览器卡片没有图片”的验收错误。因此未来任何 Workbench UI/runtime 重开任务必须以用户真实运行环境为最终事实：

单元测试通过 ≠ 真实 UI 正常。
离线 SVG 渲染 ≠ 真实浏览器运行。
mock screenshot ≠ 用户真实页面。

## 当前允许事项

只有主管明确发布新的工程任务后，才可从 FROZEN_SUPPORT 转为 ACTIVE。

在没有新授权时，仅允许：
- 读取现有状态；
- 回答主管关于历史工程事实的问题；
- 在主管明确要求时做最小只读诊断。

禁止因为选品、设计、灵感任务推进而“顺便”扩 Workbench。

`workbench/exports/` 继续视为用户所有的未跟踪输出，不删除、不清理、不纳入工程收尾。

P3R 真实 SHA blocker 保持 unresolved，不伪造 SHA；该 blocker 不阻塞近期选品、设计、灵感。

## 下一次工程启动条件

必须由 Crystal｜主管明确给出：
- business reason
- scope
- acceptance criteria
- allowed write boundary
- 是否允许 canonical 数据写入

在此之前：NO ACTION REQUIRED。