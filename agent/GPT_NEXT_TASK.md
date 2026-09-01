# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1
Phase: P3S-WORKBENCH-GENERATED-ASSET-INTEGRATION-AND-REAL-SIZE-QA
Status: authorized
Model: Luna preferred; Sol/High acceptable if Luna is unavailable
Strength: Medium
Execution class: SAFE_WRITE(workspace only) + READ_ONLY canonical SQLite

## 主管结论

Crystal Workbench 当前 UI/功能主线视为已完成。本轮**不是重新设计工作台**，而是把 GPT 已完成并提交到 GitHub 的 V1 标准化素材真正接入现有工作台，并在实际卡片尺寸与 1280×960 视口下完成视觉 QA。

GPT 素材库当前已经覆盖 45/45 个 V1 对象：

- 水晶 / 矿物：23
- 珍珠 / 天然材质：6
- 配饰 / 结构件：8
- 包装：8

素材性质统一为：

`representation_type = generated_from_evidence`

这些素材不是实拍图，不得标记为 `source_photo` 或暗示为真实商品照片。

## 必须先读取的权威文件

按顺序读取：

1. `workbench/assets/catalog/generated/README.md`
2. `workbench/assets/catalog/generated/generated-asset-manifest-v1.json`
3. `workbench/assets/catalog/generated/generated-asset-overrides-v1.json`
4. `workbench/assets/catalog/generated/crystals-hero-atlas.svg`
5. `workbench/assets/catalog/generated/crystals-comparison-atlas.svg`
6. `workbench/assets/catalog/generated/crystals-grade-overrides-v1.svg`
7. `workbench/assets/catalog/generated/pearls-organic-hero-atlas.svg`
8. `workbench/assets/catalog/generated/pearls-organic-comparison-atlas.svg`
9. `workbench/assets/catalog/generated/hardware-hero-atlas.svg`
10. `workbench/assets/catalog/generated/packaging-hero-atlas.svg`
11. `docs/WORKBENCH_ASSET_REPRESENTATION_POLICY.md`
12. `docs/WORKBENCH_VISUAL_GRADE_GUIDE.md`
13. `data/workbench-source-coverage-audit-v1.json`
14. `data/workbench-asset-production-queue.json`

如实现需要核对来源，可只读：

- `data/workbench-asset-manifest.json`
- `workbench/assets/catalog/_sources/**`

## 与 P3R 的边界

上一阶段 `P3R-INBOX-BRACELET-REFERENCE-INGESTION` 当前为 blocked：7 张 Google Drive 截图缺少权威 SHA-256，因此 canonical image observations / synthesis 尚未写入。

本轮 P3S 与 P3R 独立：

- 不修改 P3R 已创建的 2 个 reference / 7 个 unresolved asset；
- 不尝试解决 P3R 的 Drive SHA blocker；
- 不写 canonical SQLite；
- 不删除、重置或回滚 P3R 文件；
- P3S handoff 中必须注明 `P3R remains blocked and preserved`。

## 总目标

把 GPT 已提交的标准化素材作为 Workbench 的正式 Display Layer 接入现有界面，使用户在真实工作台尺寸下可以：

1. 一眼识别材料品种；
2. 在适用材料中看出 low / mid / high 视觉品质差异；
3. 对光效型材料看出 effect strength；
4. 对纹理/幽灵/发晶等材料看出 pattern 差异；
5. 对黑曜石等材料优先看 type，而不是伪造统一低中高；
6. 在配饰和包装精选区域看到对应的标准化结构素材；
7. 不破坏现有工作台布局、交互与数据库边界。

## 总原则

1. **不要重新设计工作台布局。** 只做素材读取、映射、显示、必要的轻量样式适配与视觉 QA 修正。
2. **不要联网找图。** GPT 已完成找图与素材生产；Codex 只消费仓库已有素材。
3. **不要写 canonical SQLite。** 本轮必须记录 DB SHA before/after 并证明完全不变。
4. 中文名为主，英文名为小字对照；不得把英文变成主视觉。
5. 不新增 healing / energy / chakra / ritual 等宣传语。
6. 不把 `low / mid / high` 描述成统一市场价格等级、供应商 AA/AAA 或鉴定等级。
7. 不把 `generated_from_evidence` 素材描述成实拍、真品照片或商品照片。
8. 单个素材显示 blocker 不得阻塞其他 44 个对象；记录后继续。
9. 避免建立复杂的新素材框架。优先以现有前端最小改动消费 manifest + atlas。
10. 如果已有 UI 已有图片槽位，直接复用；不要为了素材再创造一套平行 UI。

## P3S-A — Preflight / current integration audit

- 安全同步 `main`；禁止 reset / clean / discard 用户工作。
- 记录 worktree 状态。
- 读取最新 `outputs/GPT_HANDOFF.json`，确认 P3R blocker 保留。
- 记录 canonical SQLite SHA before。
- 审查当前 Workbench 如何渲染：
  - 水晶目录卡片；
  - 详情/品质对比区域（如已有）；
  - 配饰精选；
  - 包装精选；
  - 选品清单/设计板中已有材料缩略图（如已有）。
- 输出简洁 gap audit 到：
  - `outputs/p3s-workbench-asset-integration.json`

不要因为当前实现方式不是你最喜欢的就重构。只解决实际素材接入问题。

## P3S-B — Manifest-driven asset integration

工作台必须以：

`workbench/assets/catalog/generated/generated-asset-manifest-v1.json`

作为 V1 Display Layer 的主映射。

要求：

- 23 个水晶/矿物全部映射到 `crystals-hero-atlas.svg`；
- 6 个珍珠/天然材质全部映射到 `pearls-organic-hero-atlas.svg`；
- 8 个配饰全部映射到 `hardware-hero-atlas.svg`；
- 8 个包装全部映射到 `packaging-hero-atlas.svg`；
- 总 Display Layer 覆盖必须 = 45/45；
- atlas crop / clipping / SVG sprite / CSS background-position 均可，选择现有前端最简单稳定的方法；
- 不要把 atlas 拆成几十个手工复制的重复文件，除非当前框架确实无法可靠使用 atlas；
- 若数据库里存在 canonical material id/name 与 atlas slug 的差异，在前端建立最小显式 mapping；不得为了显示图片去改数据库。

## P3S-C — Grade / effect / type comparison integration

如当前详情页、材料卡展开区或既有比较区域能够显示对比图，则接入 comparison layer。

优先规则：

### 1. 10 个视觉 QA override 材料

以下材料的 low/mid/high 对比**必须优先读取**：

`workbench/assets/catalog/generated/crystals-grade-overrides-v1.svg`

对象：

- 白水晶 / Clear Quartz
- 茶晶 / Smoky Quartz
- 海蓝宝 / Aquamarine
- 天河石 / Amazonite
- 紫水晶 / Amethyst
- 黄水晶 / Citrine
- 紫锂辉 / Kunzite
- 粉水晶 / Rose Quartz
- 海纹石 / Larimar
- 舒俱来 / Sugilite

映射规则以：

`generated-asset-overrides-v1.json`

为准。

### 2. 其他水晶

使用：

`crystals-comparison-atlas.svg`

但必须尊重材料自己的比较语义：

- 拉长石 / 彩虹月光石 / 虎眼石：`optical effect strength`
- 绿幽灵 / 白幽灵 / 血石 /综合色发晶：`pattern / structure quality`
- 黑曜石：`type first`
- 金发晶 / 黑发晶：发丝密度、秩序、底体净度等，而不是只加深颜色

### 3. 珍珠

使用：

`pearls-organic-comparison-atlas.svg`

比较重点：

- 光泽
- 表皮
- 圆度/形态
- 颜色/伴色
- 匹配度（适用时）

不得显示“AAA”等供应商等级。

如果当前 Workbench 根本没有合理的对比展示位置，不要为了本轮重新设计复杂详情页。可以只在既有详情/展开位置增加一个小型“视觉品质参考 / Visual reference”区；如果连这个都会显著破坏已完成布局，则先完成 hero integration，并把 comparison 标记为 `available_but_not_exposed_due_to_existing_ui_boundary`，不得因此阻塞其他任务。

## P3S-D — Workbench card-size visual QA

这是本轮最关键的验收，不以“文件能加载”作为通过标准。

必须在真实工作台尺寸检查：

- 1280×960 视口；
- 当前实际水晶目录卡片尺寸；
- 当前右侧配饰/包装缩略图尺寸；
- 如存在详情/展开状态，也检查 comparison 图的真实显示尺寸。

检查：

1. 品种是否仍然一眼可识别；
2. 图片主体是否太小、太大、被裁掉或留白失衡；
3. 透明背景是否和当前 classic Windows UI 背景冲突；
4. 英文名是否抢主视觉；
5. 10 个 override 材料在真实尺寸下 low/mid/high 是否确实看得出差异；
6. 拉长石/月光石/虎眼石的光效是否仍可见；
7. 黑发晶/金发晶的发丝是否在小尺寸下消失；
8. 绿幽灵/白幽灵内部结构是否仍可辨认；
9. 珍珠不能变成无层次塑料球；
10. 配饰和包装必须像“可用结构素材”，不能像占位符或纯文字图标。

如发现单个材料在实际卡片尺寸下识别失败，只允许做**局部显示参数修正**（crop/scale/object-position/局部 override mapping 等），不要重新绘制整套 UI。

## P3S-E — Required visual evidence

创建：

- `outputs/visual/p3s-workbench-assets-1280x960.png`

如 comparison 有可见详情状态，再创建：

- `outputs/visual/p3s-workbench-asset-comparison.png`

验收报告中必须记录：

- 45/45 hero 是否可见；
- 10/10 override 是否正确调用；
- 哪些材料在真实卡片尺寸被调整过；
- 是否存在仍然识别不足的材料；
- 是否有 broken asset / wrong crop / overflow。

## P3S-F — Tests / validation

至少新增或更新 focused tests，覆盖：

- generated asset manifest 可读取；
- 23 crystal mapping 完整；
- 6 pearl/organic mapping 完整；
- 8 hardware mapping 完整；
- 8 packaging mapping 完整；
- total = 45；
- 10 override mapping 完整且优先于主 comparison atlas；
- 所有 atlas 文件存在；
- 不存在 broken path；
- 不存在把 `generated_from_evidence` 标成 `source_photo` 的 UI 文案；
- 不存在 AA/AAA 等伪统一等级文案；
- canonical SQLite SHA before == after。

然后运行：

- focused P3S tests
- full `npm test`
- `npm run validate`
- `git diff --check`

如存在与本轮无关的历史失败，必须区分 pre-existing failure 与本轮 regression；不要为了让测试绿而扩大修改边界。

## P3S-G — Outputs / handoff

创建：

- `outputs/p3s-workbench-asset-integration.json`
- `outputs/handoffs/P3S-WORKBENCH-GENERATED-ASSET-INTEGRATION-AND-REAL-SIZE-QA.json`

更新：

- `outputs/GPT_HANDOFF.json`

Handoff 只保留高信号事实：

- status: completed / partial / blocked
- 45/45 asset coverage
- crystal / pearl / hardware / packaging 各自覆盖数
- 10 override 调用情况
- 实际修改过的显示参数/映射
- 1280×960 QA 结果
- broken assets = ?
- materials still visually weak = ?
- focused tests / npm test / validate / diff check
- canonical DB SHA before/after + unchanged proof
- `P3R remains blocked and preserved`
- commit SHA
- HEAD == origin/main
- worktree clean
- true blockers only
- requires_gpt_decision

## 授权写入范围

允许：

- `workbench/**`（仅本轮素材接入所需前端映射/显示改动）
- 与本轮直接相关的 `test/**`
- `outputs/p3s-workbench-asset-integration.json`
- `outputs/visual/p3s-*.png`
- `outputs/handoffs/P3S-WORKBENCH-GENERATED-ASSET-INTEGRATION-AND-REAL-SIZE-QA.json`
- `outputs/GPT_HANDOFF.json`

只读：

- `data/crystal-design.sqlite`
- `data/workbench-asset-manifest.json`
- `data/workbench-source-coverage-audit-v1.json`
- `workbench/assets/catalog/_sources/**`
- `docs/WORKBENCH_ASSET_REPRESENTATION_POLICY.md`
- `docs/WORKBENCH_VISUAL_GRADE_GUIDE.md`

禁止：

- canonical SQLite 写入
- schema migration
- P3R reference/asset 数据修改
- 网络找图/下载/抓取
- supplier / price / purchase / outreach
- 大规模 UI 重设计
- Bridge 权限扩大
- danger-full-access
- 为适应图片而删除历史数据

## Git

连续完成实现、QA、测试、报告后：

- coherent commit
- push `main`
- 确认 local HEAD == origin/main
- 确认 worktree clean

## Stop conditions

不要在“读到素材”或“图片能显示”后停下。

只在以下情况停止：

1. P3S 完成真实卡片尺寸接入 + 视觉 QA + 验证；或
2. 某个单项 blocker 已记录，所有其他安全子任务均已完成；或
3. 出现无法解释的数据库/仓库完整性异常。

本轮默认不需要用户业务决策。
