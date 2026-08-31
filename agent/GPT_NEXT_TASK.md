# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1
Phase: P3L-P3Q-WORKBENCH-REFERENCE-FIDELITY-ASSET-INTEGRATION
Status: authorized
Primary language: 中文
Secondary language: English comparison only
Model guidance: Luna / Medium preferred. If the local Codex UI only offers Sol, Sol / High is acceptable and must NOT block execution.
Execution class: SAFE_WRITE(workspace only) + READ_ONLY canonical SQLite

## 一、主管结论 / Supervisor decision

上一阶段 P3I-P3K 在功能层面基本通过，但本轮用户明确判定“视觉验收失败”。这不是新增功能请求，而是新的强制 UI/素材验收。

已确认事实：
- `outputs/GPT_HANDOFF.json` 报告 P3I-P3K completed，focused workbench 5/5、npm test 109 passed / 1 skipped、validate PASS、canonical DB smoke SHA unchanged。
- `outputs/p3k-workbench-usability-acceptance.json` 仍记录 `head_equals_origin_main=false`、`worktree_clean=false`，而当前 main 已继续前进到更晚的 UI commit；因此交接元数据已经滞后，不能作为当前视觉状态的完整事实来源。
- 当前界面虽然已经加入复古 Windows 元素、中文导航和双语名称，但水晶目录仍是纵向大卡/大占位图，明显没有还原用户指定参考图的三栏桌面软件布局和紧凑卡片密度。

本阶段总目标：

> 在不修改 canonical SQLite schema / 数据的前提下，把 Crystal Workbench 的桌面 UI **严格按参考图的排版骨架、信息密度、窗口层级和卡片结构重做**；真实水晶/天然材质/配饰/包装的网络找图、许可核验、下载、抠图和上传 GitHub **由 GPT 主管负责**。Codex 只读取 GPT 已提交到仓库的合规素材，并负责 UI 接入、排版与必要的目录组合预览。

用户指定的视觉权威参考图：
- `inputs/ui-reference/crystal-workbench-target-layout.jpg`

**如任何旧 UX brief、当前 CSS、当前页面结构与该图冲突，以这张参考图为视觉排版最高优先级。**

---

## 二、执行总规则 / Master execution rules

1. 这是一个总任务，下设多个可并行子任务。不要每完成一个子任务就停下来等待。
2. 某一个子任务遇到 blocker 时，记录 blocker，继续执行其他所有可以安全推进的子任务。
3. 只有当“所有剩余工作”都需要用户决策、额外授权或无法继续时，才允许停止。
4. 中文是默认主语言；英文只作为名称/术语对照，例如：`白水晶` 下方小字 `Clear Quartz`。不得出现英文主导页面。
5. 不新增 Web framework；继续使用现有 vanilla workbench 架构，除非现有仓库已经包含的轻量依赖足够完成测试/图片展示。
6. canonical SQLite 永远 READ ONLY；不得 schema migration，不得修改 canonical 数据。
7. 草稿 sidecar 保存、载入、排序、删除、导出能力必须保持。
8. **素材职责严格分离：GPT 负责联网找图、许可核验、下载、抠图、透明背景处理、素材命名、manifest 与将合规素材提交 GitHub；Codex 不得自行联网搜索、下载、抓取或抠取外部图片。**
9. Codex 只可使用仓库内 GPT 已交付的素材；如某素材尚未交付，使用明确的中性 placeholder 并继续其他 UI/功能任务，不得因此停止总任务。
10. 不开展供应商排名、询价、采购、下单、联系商家。
11. 禁止为了“像参考图”而伪造数据库事实。页面中的数量、硬度、产地、规格等必须来自现有可信数据；没有可靠数据时隐藏该字段或使用设计用途字段，不能编造。
12. 禁止把“寓意/疗愈/能量”等主观或玄学说法作为事实。若需要占用参考图相同信息位置，优先显示 `设计语言 / Design role`、主题或已有 selection notes。

---

# P3L — 当前状态审计与失败基线 / Current-state audit

在改代码前，先做一次只读核对，但核对完成后直接继续后续子任务，不要停。

必须确认：
- 当前 `main` HEAD；
- `outputs/GPT_HANDOFF.json` 与实际 HEAD 是否一致；
- 当前 worktree 是否 clean；
- 当前 workbench 启动方式；
- canonical DB SHA；
- 当前工作台页面截图或 DOM 尺寸基线（若本地浏览器自动化可用）。

将本轮用户视觉反馈记录为：
- prior functional acceptance: retained;
- visual acceptance: rejected;
- reason: current catalogue hierarchy, card density, three-column composition, image use and right-side libraries do not faithfully match the supplied target layout.

输出一个简短状态文件：
- `outputs/p3l-current-ui-gap-audit.json`

不要把旧 handoff 当成当前状态；以 Git HEAD + 实际文件 + 实测为准。

---

# P3M — 严格还原参考图布局 / Strict layout reproduction

## 视觉权威

打开并逐项对照：
- `inputs/ui-reference/crystal-workbench-target-layout.jpg`

目标不是“复古 Windows 灵感”，而是**复刻它的排版逻辑**。

### A. 顶部结构

桌面 viewport（验收主视口：1280×960）必须依次出现：

1. 深蓝标题栏：`Crystal Workbench - 水晶设计工作台`
   - 左侧小程序图标；
   - 右侧最小化 / 最大化 / 关闭视觉控件；
   - 作为 Web UI 视觉元素即可，不要求控制真实浏览器窗口。

2. 菜单栏：
   - `文件(F)`
   - `编辑(E)`
   - `视图(V)`
   - `工具(T)`
   - `窗口(W)`
   - `帮助(H)`

3. 工具栏：图标 + 中文文字组合，紧凑排列：
   - `新建`
   - `打开`
   - `保存`
   - `导入`
   - `导出 Excel`
   - `设计板`
   - `参考图库`
   - `设置`
   - `帮助`

不要求每个历史式按钮都立即新增业务能力。已有能力应连接真实动作；没有对应业务能力的纯 UI 工具不得伪装成已实现功能，可 disabled 或给出清楚状态。

### B. 主体必须是三栏，不得继续当前单列大卡

1280×960 主验收视口下，整体布局接近参考图比例：
- 左栏：约 15%（约 185-195px）
- 中栏：约 63%（主体目录）
- 右栏：约 22%（约 260-280px）
- 栏间使用经典桌面软件的窄边框/窄 gutter；不要现代大留白。

禁止：
- 当前那种一条材料占据几乎整行的大图卡；
- 页面主要内容只靠纵向滚动浏览；
- 大面积空白；
- 右侧配饰/包装只有空圆圈或空方块占位。

### C. 左栏：导航 + 今日概览

严格复现参考图的层级：

Panel title: `导航`

树形/分组：
- `总览`
- `选品清单`
  - `全部清单`
  - `我收藏的`
- `水晶`
- `配饰`
- `包装`
- `参考图库`
- `设计板`

底部独立框：`今日概览`
- 水晶种类
- 配饰数量
- 包装数量
- 设计方案/草稿数量

这些数字必须来自当前真实数据/sidecar，不得直接复制参考图里的 7/28/12/3。

### D. 中栏：水晶目录

Panel title: `水晶目录`

第一行筛选尽量接近参考图：
- `搜索`
- `形状`
- `尺寸(mm)`（若现有数据无法可靠结构化筛选，可先以已有规格 token 做非破坏性过滤）
- `颜色`（只有已有可信字段/映射时显示可用项）
- `清除`
- 右端真实数量：`共 N 种水晶`

主目录在 1280px 宽度时必须稳定为**4 列紧凑卡片**，而不是 1 列。

每张水晶卡的层次参考目标图：
1. 中文主名（例如 `白水晶`）
2. 英文小字对照（例如 `Clear Quartz`）
3. 大型主视觉区：优先使用 GPT 已提交的真实素材或基于真实单颗圆珠抠图生成的目录组合预览；不得继续显示巨大灰色占位图
4. 下方 3 个小型形态/配件槽位，至少第 1 个优先使用 GPT 已提交的真实单颗圆珠抠图；其他形态只有在仓库已有对应真实/合法素材时才展示，否则使用明确的中性几何占位，不伪装为实拍
5. 2-3 行紧凑事实/设计信息，例如：
   - `硬度`（仅数据库已有可信值时）
   - `产地`（仅已有可信值时）
   - `设计角色` / `主题`
6. `查看详情`

第二行按参考图：若当前数据足够，继续 4 列；在可见区域末尾提供一张虚线 `+ 添加水晶` 卡。

### E. 中栏底部：最近打开的设计板

参考目标图，放置：
- Panel title: `最近打开的设计板`
- 3 个最近草稿/设计预览（若不足 3 个，只显示真实已有项，不伪造历史日期）
- 右侧 `新建设计板` 卡

在用户已经有 sidecar 草稿时读取真实草稿；没有时保持空态，但保留相同布局占位。

### F. 右栏：配饰精选 + 包装精选

必须像参考图一样是两个独立经典 panel：

`配饰精选`
- 3×3 紧凑图片格
- 图片下方中文名称，英文只在需要时作为小字
- `查看更多配饰...`

`包装精选`
- 3×2 紧凑图片格
- `查看更多包装...`

当前右栏的 `○` / `□` 空占位必须在本阶段显著减少；GPT 已提交真实素材的条目必须显示图片。

### G. 底部状态栏

按参考图增加经典状态栏：
- 左：`就绪`
- 右：当前本地日期 / 时间（可动态）

### H. 响应式规则

主验收以 1280×960 为准；更宽屏幕时：
- 保持经典桌面软件的信息密度；
- 不允许卡片无限拉宽成大块；
- 优先扩展中栏可用空间或增加合理 gutter，但保持 4 列紧凑视觉。

小于桌面宽度时可以降级，不是本轮核心验收。

---

# P3N — GPT 素材交付接口 / GPT-owned asset handoff

本子任务的职责不是让 Codex 找图，而是让 Codex **消费 GPT 已准备并提交到 GitHub 的合规素材**。

## GPT 主管负责

GPT 主管在本阶段并行负责：
- 查找真实水晶、天然材质、配饰、包装图片；
- 核验公开仓库所需许可与来源；
- 下载原始素材；
- 对单颗圆珠和需要透明背景的素材完成抠图；
- 输出透明 PNG / WebP；
- 统一基础命名与必要尺寸；
- 维护 `data/workbench-asset-manifest.json`；
- 维护 `docs/WORKBENCH_ASSET_SOURCES.md`；
- 将可合法再分发/修改的素材提交到 GitHub。

GPT 优先覆盖当前项目真实存在的核心/高频条目，例如：
- 白水晶 / Clear Quartz
- 粉水晶 / Rose Quartz
- 紫水晶 / Amethyst
- 茶晶 / Smoky Quartz
- 黑曜石 / Obsidian
- 虎眼石 / Tiger's Eye
- 海蓝宝 / Aquamarine
- 黑发晶 / Black Rutilated Quartz
- 以及当前 assortment 中其他主力水晶

并并行覆盖：
- 银色结构件/扣件/隔珠等配饰；
- 绒布袋、礼盒、牛皮纸盒、亚麻袋等包装。

以上列表仅作为素材优先级，不得因此向 canonical DB 新增不存在的材料。

## Codex 负责

Codex 每次同步 main 后：
1. 检查 `data/workbench-asset-manifest.json` 是否存在；
2. 检查仓库内已存在的 GPT 素材路径；
3. 只集成 manifest 中允许使用且实际存在的文件；
4. 不得自行联网搜索替代图片；
5. 不得从电商、博客、供应商页面自行下载图片；
6. 不得自行执行原图抠图来绕过 GPT 素材交付；
7. 缺失素材时明确显示 neutral placeholder，并继续完成布局、交互、测试和其他已有素材的接入。

建议素材目录：
- `workbench/assets/catalog/crystals/source/`（如 GPT 选择保留可公开原图）
- `workbench/assets/catalog/crystals/cutout/`
- `workbench/assets/catalog/accessories/`
- `workbench/assets/catalog/packaging/`

## 资产清单字段

Codex 应读取但不得伪造 manifest。每个 GPT 已提交图片至少应包含：
- asset_id
- category
- zh_name
- en_name
- source_url
- source_site
- creator / author（如有）
- license
- license_url
- can_redistribute
- can_modify
- retrieved_at
- original_filename
- processed_filename
- transformation
- sha256
- notes

只有 manifest 标记 `can_redistribute=true` 且文件真实存在的外部素材才能进入默认 UI。

---

# P3O — 已交付素材的 UI 处理与目录组合 / Asset integration + catalogue composition

Codex 不负责找图和抠图；本阶段只处理 GPT 已提交的透明素材与其 UI 组合。

处理规则：

1. 直接使用 GPT 已提供的透明 PNG / WebP 单颗圆珠抠图；
2. 保留天然材质真实纹理，不做“重绘成假水晶”；
3. 可以在前端或轻量构建脚本中统一显示尺寸、留白、缩放，使卡片效果接近参考图；
4. 不要用 CSS 圆形渐变冒充真实水晶照片；
5. 可以把**GPT 已提交的真实单颗圆珠抠图**重复排列/旋转，生成目录用的环形手串预览；这种图或渲染必须在代码/manifest 语义上标记为 `composed_from_real_bead_cutout`，不能声称是实拍手串；
6. 若 GPT 已提交合法真实手串图片，可以直接使用；
7. 配饰和包装优先使用 GPT 已提交真实抠图；没有素材的条目使用清晰、低干扰的中性 placeholder，不得伪造实拍；
8. Codex 可以做安全的前端尺寸适配、缩略图生成或基于已交付透明素材的组合排布，但不得从外部图片开始新的背景去除/抠图流程。

---

# P3P — 全工作台整合 / Full Workbench integration

完成目录主视图后，把同一经典桌面 shell 统一应用到：
- 总览 / 首页
- 水晶目录 / 选品库
- 参考图库 / 灵感库
- 设计板 / 设计台

注意：
- 不要求每个页面都完全复制“水晶目录”的卡片内容；
- 要求窗口标题栏、菜单、工具栏、左导航、右侧精选面板、底部状态栏保持一致；
- 主内容区域随页面变化。

名称规范：
- UI 主语言中文；
- 水晶材料：`中文名` + 下方小号 `English Name`；
- 配饰、包装同样优先中文，英文仅对照；
- raw enum、canonical ID、内部 key 不得进入默认主界面。

保持：
- 选品加入设计台；
- 草稿保存/载入；
- 上移/下移/删除；
- 导出设计单；
- assortment CSV/JSON 导出；
- canonical DB 只读。

---

# P3Q — 严格视觉与功能验收 / Fidelity + functional acceptance

## 必须运行的功能验收

1. focused workbench tests PASS；
2. full `npm test` PASS；
3. `npm run validate` PASS；
4. `git diff --check` PASS；
5. canonical DB SHA before == after；
6. sidecar draft save/load/reorder/remove/export PASS；
7. 选品加入设计台 PASS；
8. 不出现 raw enum 主界面泄漏。

## 必须运行的视觉/结构验收

在 1280×960 viewport（本地浏览器自动化可用时必须真实截图）验证：

1. 顶部标题栏 + 菜单栏 + 工具栏完整存在；
2. 主体首屏明确是左/中/右三栏；
3. 左栏有导航树与底部今日概览；
4. 中栏水晶目录首屏是 4 列紧凑卡片，而非单列；
5. 主水晶卡的主视觉不再是灰色巨大占位；
6. GPT 已交付素材中的真实单颗圆珠抠图必须实际显示；
7. 基于真实圆珠生成的组合手串视觉（如采用）清楚标识为组合预览，不伪称实拍；
8. 右栏配饰精选接近参考图 3×3；
9. 右栏包装精选接近参考图 3×2；
10. 中栏底部出现最近打开的设计板区域；
11. 底部状态栏存在；
12. 中文为主，英文只作对照；
13. 1280px 宽度不出现横向滚动条；
14. 卡片和面板不能被超宽 viewport 拉成当前截图那种巨大单列内容。

若浏览器截图能力可用，提交：
- `outputs/visual/p3q-workbench-1280x960.png`

并在验收报告中逐条写出与参考图的差异。不要用“风格接近”这种主观句子代替可检查的布局事实。

## 资产验收

Codex 仅验收 GPT 已交付的仓库资产：
1. 所有 UI 使用的 web-derived images 都应在 manifest；
2. 每张使用中的外部素材应明确 `can_redistribute=true`；
3. 不允许 data URL / base64 把外部版权图片藏进源码；
4. 没有把网络图片误标为项目自有原创；
5. GPT 尚未交付的素材记录为 `asset_pending_from_gpt`，不得由 Codex自行联网补图；
6. 素材不足不得阻塞已经可以完成的 UI、交互和测试。

---

## 三、允许修改范围 / Authorized write paths

允许 SAFE_WRITE：
- `workbench/**`
- `test/**`（仅与本阶段 workbench/asset 验收相关的 bounded updates）
- `inputs/ui-reference/**`（只读现有参考图；如需补充说明文件可写）
- `outputs/p3l-current-ui-gap-audit.json`
- `outputs/p3q-workbench-fidelity-acceptance.json`
- `outputs/visual/**`
- `outputs/GPT_HANDOFF.json`
- `outputs/handoffs/P3L-P3Q-WORKBENCH-REFERENCE-FIDELITY-ASSET-INTEGRATION.json`

GPT 主管负责写入/更新，Codex 默认只读消费：
- `data/workbench-asset-manifest.json`
- `docs/WORKBENCH_ASSET_SOURCES.md`
- `workbench/assets/catalog/**` 中的外部来源素材文件

如 Codex 仅需增加用于“已交付透明素材的组合预览/缩略显示”的轻量脚本，可写：
- `scripts/workbench-assets/**`

禁止：
- Codex 自行网络找图、下载、抓取或抠图；
- canonical SQLite 写入；
- migrations；
- supplier/contact/purchase 流程；
- Bridge permission widening；
- danger-full-access；
- 删除历史数据以“适配 UI”。

---

## 四、Git 与交付 / Delivery

本阶段结束时：

1. 更新 `outputs/p3q-workbench-fidelity-acceptance.json`；
2. 更新 `outputs/GPT_HANDOFF.json`，只写 DELTA；
3. 归档 `outputs/handoffs/P3L-P3Q-WORKBENCH-REFERENCE-FIDELITY-ASSET-INTEGRATION.json`；
4. commit + push `main`（当前授权包含本阶段 workspace 变更）；
5. 验证 `HEAD == origin/main`；
6. 验证 worktree clean；
7. 最终报告必须简短，只包含：
   - 实际改了什么；
   - 已接入哪些 GPT 素材；
   - 哪些条目仍为 `asset_pending_from_gpt`；
   - 视觉验收是否满足 1280×960 结构要求；
   - tests/checks；
   - canonical DB SHA 是否不变；
   - commit SHA；
   - blockers；
   - 是否需要 GPT / 用户决策。

完成后 STOP，等待新的主管任务。不要自行进入供应商、采购或下一阶段。