# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1
Phase: P3L-P3Q-WORKBENCH-REFERENCE-FIDELITY-ASSET-INTEGRATION
Status: authorized
Primary language: 中文
Secondary language: English comparison only
Model guidance: Luna / Medium preferred. If the local Codex UI only offers Sol, Sol / High is acceptable and must NOT block execution.
Execution class: SAFE_WRITE(workspace only) + READ_ONLY canonical SQLite + NETWORK_READ(image/license research only)

## 一、主管结论 / Supervisor decision

上一阶段 P3I-P3K 在功能层面基本通过，但本轮用户明确判定“视觉验收失败”。这不是新增功能请求，而是新的强制 UI/素材验收。

已确认事实：
- `outputs/GPT_HANDOFF.json` 报告 P3I-P3K completed，focused workbench 5/5、npm test 109 passed / 1 skipped、validate PASS、canonical DB smoke SHA unchanged。
- `outputs/p3k-workbench-usability-acceptance.json` 仍记录 `head_equals_origin_main=false`、`worktree_clean=false`，而当前 main 已继续前进到更晚的 UI commit；因此交接元数据已经滞后，不能作为当前视觉状态的完整事实来源。
- 当前界面虽然已经加入复古 Windows 元素、中文导航和双语名称，但水晶目录仍是纵向大卡/大占位图，明显没有还原用户指定参考图的三栏桌面软件布局和紧凑卡片密度。

本阶段总目标：

> 在不修改 canonical SQLite schema / 数据的前提下，把 Crystal Workbench 的桌面 UI **严格按参考图的排版骨架、信息密度、窗口层级和卡片结构重做**；同时建立可合法进入公开 GitHub 的真实水晶/天然材质/配饰/包装图片资产流程，并使用真实的单颗圆珠抠图素材生成/组合出接近参考图的目录视觉。

用户指定的视觉权威参考图：
- `inputs/ui-reference/crystal-workbench-target-layout.jpg`

**如任何旧 UX brief、当前 CSS、当前页面结构与该图冲突，以这张参考图为视觉排版最高优先级。**

---

## 二、执行总规则 / Master execution rules

1. 这是一个总任务，下设多个可并行子任务。不要每完成一个子任务就停下来等待。
2. 某一个子任务遇到 blocker 时，记录 blocker，继续执行其他所有可以安全推进的子任务。
3. 只有当“所有剩余工作”都需要用户决策、额外授权或无法继续时，才允许停止。
4. 中文是默认主语言；英文只作为名称/术语对照，例如：`白水晶` 下方小字 `Clear Quartz`。不得出现英文主导页面。
5. 不新增 Web framework；继续使用现有 vanilla workbench 架构，除非现有仓库已经包含的轻量依赖足够完成测试/图片处理。
6. canonical SQLite 永远 READ ONLY；不得 schema migration，不得修改 canonical 数据。
7. 草稿 sidecar 保存、载入、排序、删除、导出能力必须保持。
8. 不开展供应商排名、询价、采购、下单、联系商家；本阶段网络读取仅限：图片来源、授权许可、图片元数据和必要的视觉素材研究。
9. 禁止为了“像参考图”而伪造数据库事实。页面中的数量、硬度、产地、规格等必须来自现有可信数据；没有可靠数据时隐藏该字段或使用设计用途字段，不能编造。
10. 禁止把“寓意/疗愈/能量”等主观或玄学说法作为事实。若需要占用参考图相同信息位置，优先显示 `设计语言 / Design role`、主题或已有 selection notes。

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
3. 大型主视觉区：优先使用真实圆珠素材生成的手串/环形目录预览，或合法来源的真实手串图；不得继续显示巨大灰色占位图
4. 下方 3 个小型形态/配件槽位，至少第 1 个使用真实单颗圆珠抠图；其他形态只有在有真实/合法素材时才展示，否则使用明确的中性几何占位，不伪装为实拍
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

当前右栏的 `○` / `□` 空占位必须在本阶段显著减少；有合法真实图片的条目必须显示图片。

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

# P3N — 真实图片来源与公开仓库许可审计 / Real-image sourcing + licensing

本仓库当前为公开 GitHub 仓库。**不得把来源不明、版权不明的供应商/商城/博客产品图片直接复制进仓库。**

用户要求真实的单颗圆珠和其他库真实图片。执行方式：

## 来源优先级

1. Public Domain / CC0；
2. 明确允许再分发与修改的 Creative Commons / permissive media；
3. 官方/厂商素材仅当其页面或许可条款明确允许当前公开仓库中的再分发与衍生处理；
4. 许可不清楚：可以记录 `source_url` 作为研究证据，但**禁止提交二进制图片**。

不要因为找不到合规图片就偷用电商图。版权 blocker 只阻塞对应素材，不阻塞 UI、其他素材或其他子任务。

## 优先覆盖材料

优先为当前水晶目录中真实存在的核心/高频条目寻找圆珠素材，至少覆盖可获得许可的：
- 白水晶 / Clear Quartz
- 粉水晶 / Rose Quartz
- 紫水晶 / Amethyst
- 茶晶 / Smoky Quartz
- 黑曜石 / Obsidian
- 绿东陵 / Green Aventurine（只有项目真实条目存在时）
- 虎眼石 / Tiger's Eye
- 海蓝宝 / Aquamarine
- 黑发晶 / Black Rutilated Quartz（若能找到可授权素材）
- 其他当前 assortment 中的主力水晶

不要为不存在于项目选品中的材料硬加数据。

同时搜索可合法再分发的：
- 银色结构件/扣件/隔珠等真实配饰图片；
- 绒布袋、礼盒、牛皮纸盒、亚麻袋等真实包装图片。

## 资产清单

新增：
- `data/workbench-asset-manifest.json`
- `docs/WORKBENCH_ASSET_SOURCES.md`

每个已提交图片必须记录至少：
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

若 `can_redistribute != true`，不得将原图/处理图提交到仓库。

---

# P3O — 抠图、统一素材与手串目录视觉 / Image processing + catalogue composition

合法真实图片下载后，建立清晰目录，例如：

- `workbench/assets/catalog/crystals/source/`
- `workbench/assets/catalog/crystals/cutout/`
- `workbench/assets/catalog/accessories/`
- `workbench/assets/catalog/packaging/`

处理规则：

1. 对单颗圆珠做背景去除/抠图，输出透明 PNG 或 WebP；
2. 保留天然材质真实纹理，不做“重绘成假水晶”；
3. 统一裁切、留白和视觉尺寸，使它们放在卡片里时接近参考图；
4. 不要用 CSS 圆形渐变冒充真实水晶照片；
5. 可以把**真实单颗圆珠抠图**重复排列/旋转，生成一个目录用的环形手串预览。这种图必须在 manifest 标记为 `composed_from_real_bead_cutout`，不能声称是实拍手串；
6. 若已有合法真实手串图片，可以直接使用，但同样记录来源许可；
7. 配饰和包装优先使用真实抠图；没有合法素材的条目使用清晰、低干扰的中性 placeholder，不得伪造实拍。

如本地已有 ImageMagick、Python/Pillow、rembg 或等效安全工具可直接用；不要为了本任务引入重型服务。若背景去除工具不可用，可使用简单透明背景处理/手工 mask 或保留白底裁切，但要继续其他任务。

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
6. 至少若干已授权材料使用真实单颗圆珠抠图；
7. 真实圆珠生成的组合手串视觉（如采用）清楚标识资产来源，不伪称实拍；
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

1. 所有 committed web-derived images 都在 manifest；
2. 每张都明确 `can_redistribute=true` 与许可依据；
3. 许可不明图片不得进入 repo；
4. 不允许 data URL / base64 把外部版权图片藏进源码；
5. 没有把网络图片误标为项目自有原创；
6. 图片源站不可访问时，记录 blocker，不影响其他合法素材继续推进。

---

## 三、允许修改范围 / Authorized write paths

允许 SAFE_WRITE：
- `workbench/**`
- `test/**`（仅与本阶段 workbench/asset 验收相关的 bounded updates）
- `inputs/ui-reference/**`（只读现有参考图；如需补充说明文件可写）
- `data/workbench-asset-manifest.json`
- `docs/WORKBENCH_ASSET_SOURCES.md`
- `outputs/p3l-current-ui-gap-audit.json`
- `outputs/p3q-workbench-fidelity-acceptance.json`
- `outputs/visual/**`
- `outputs/GPT_HANDOFF.json`
- `outputs/handoffs/P3L-P3Q-WORKBENCH-REFERENCE-FIDELITY-ASSET-INTEGRATION.json`

如需增加仅用于本阶段图片处理的轻量脚本，可写：
- `scripts/workbench-assets/**`

禁止：
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
   - 真实图片覆盖到哪些材料/配饰/包装；
   - 哪些素材因许可/来源问题未能进入仓库；
   - 视觉验收是否满足 1280×960 结构要求；
   - tests/checks；
   - canonical DB SHA 是否不变；
   - commit SHA；
   - blockers；
   - 是否需要 GPT / 用户决策。

完成后 STOP，等待新的主管任务。不要自行进入供应商、采购或下一阶段。
