# Crystal｜设计 — NEXT TASK

Protocol: CRYSTAL-SUPERVISOR-V1
Phase: NATURE-LAUNCH-V1-FINAL-RELEASE
Priority: P0-FINAL
Status: AUTHORIZED_EXECUTE_TO_FINAL_DELIVERABLE
Owner: Crystal｜设计
Role: FINAL RELEASE OWNER
Language: 中文为主
Recommended model: GPT-6
Recommended reasoning: High
Recommended environment: Work mode

## 一、主管目标

这轮不再继续扩大工程、市场研究、供应商研究或数据库治理。

一次性完成用户真正需要的最终交付：

1. 最终水晶/天然材质/配饰选品；
2. 六主题 × 3款 = 18款最终设计；
3. 18款每款一张可直接查看的设计图；
4. 一个最终 Excel，包含最终选品、18款设计、逐款BOM和总材料需求；
5. 一份清楚的“需要哪些材料”汇总。

**Excel 本轮不填采购链接，也不要保留空的采购链接列。**

不要把用户再拉回中间决策。遇到可自行判断的问题，基于审美、可制作性、现有证据和保守原则自行处理；单项问题记录后继续。只有所有剩余事项都无法在现有信息下合理决定时才停止。

## 二、权威输入

必须先读取当前 main 中最新版本：

### 选品/知识
- `outputs/selection/assortment-v1.json`
- `outputs/selection/knowledge-base-v1.json`
- `outputs/selection/working-version-nature-launch-v1.json`
- `outputs/selection/design-material-spec-mapping-nature-launch-v1.json`
- `outputs/selection/material-change-review-nature-launch-v1.json`
- `outputs/selection/unresolved-items-v1.json`
- `outputs/handoffs/selection/SELECTION-NATURE-LAUNCH-V1.json`

### 设计
- `outputs/designs/nature-launch-v1.json`
- `outputs/designs/NATURE_LAUNCH_18_BOARD.md`
- `outputs/handoffs/design/NATURE_LAUNCH_V1_FINAL_HANDOFF.json`

### 灵感/证据
读取 `outputs/handoffs/inspiration/` 和相关六主题 evidence；只把其作为证据，不把“热门”自动等同于购买需求。

### Workbench
读取当前 `workbench/` 和 P4/P4R 现状。Workbench 是排珠/BOM/结构验证器，不替代审美判断。

## 三、先做一次最终材料选品收敛

目标不是保留 Working Version 中全部 93 个规格，而是形成“18款最终设计真正需要的材料集合”。

### 选品原则

1. 每个材料都必须有明确设计作用，不因为数据库已有就保留。
2. 优先减少无必要的同类近似规格，避免为了18款而形成过大的采购池。
3. 核心圆珠、异形主石、珍珠/木材/银件允许并存，但每个都要有明确作用。
4. Ocean / Glacier 保持冷蓝、通透、水感/冰感，但必须是两套不同结构语言。
5. Forest 保持深墨绿、黑灰、木材感、低调银色、男性/中性，不做普通佛珠串。
6. Mountain 不机械等于棕色虎眼；要有岩层、雾、雪线、地质结构。
7. Sunrise 控制暖色比例，避免粉黄甜腻。
8. Starlight 不依赖“紫水晶+黑曜石”二元配色凑主题。
9. 不要仅靠高价材料制造“高级感”；结构、比例和留白优先。
10. 用户历史提过茶晶、黑发晶等，只作为候选，不机械保留。

### 对未完全核实的材料

本轮目标是设计与打样材料表，不是正式批量采购批准。

因此：
- 缺供应商、采购链接、批次、产地、处理方式，不自动阻塞设计；
- 若材料身份本身不确定，则优先替换成身份清楚、视觉作用相近的已有材料；
- 不要在最终18款中留下“完全不知道是什么”的核心材料；
- 对仍需后续采购确认的内容放到 Excel 的“采购确认备注”，但不要让表格变成 unresolved 清单。

## 四、重新审视18款，不要机械沿用候选

现有18款是候选，不是不可修改的最终稿。

逐款检查并允许重做：
- 主题辨识度；
- 高端感；
- 结构差异；
- 主石位置；
- 珠径节奏；
- 金属比例；
- 异形件使用；
- 对称/非对称；
- 男性/中性/精致语言；
- 真实制作；
- 佩戴舒适；
- 与其他17款重复度。

### 硬要求

- 6主题 × 3款 = 18款；
- 每主题3款至少在两个以上结构维度明显不同；
- 禁止同排列换颜色、同结构换材料、低中高配凑3款；
- Ocean 与 Glacier 必须肉眼可区分；
- 18款整体不能像一个模板批量换色；
- 所有最终材料/规格必须进入最终 Excel；
- 最终18款不得有“表外正式材料”。

如果现有设计不够好，直接修改 `nature-launch-v1.json`，不要为了保持旧版本而保留弱设计。

## 五、最终设计数据

更新：
`outputs/designs/nature-launch-v1.json`

每款必须至少包含：
- design_id
- 中文名
- English name
- theme
- scene / mood
- color_language
- target_wrist_cm
- construction
- structure_signature
- core_materials
- main_stone / focal
- 完整 bead sequence
- 每颗 position
- material_id
- spec_id
- display_name_zh / en
- form
- size_mm
- quantity
- role
- source_status
- expected_bom
- alternatives
- sample_notes
- procurement_questions

逐款 BOM 必须能够由 beads 聚合得到，不能手写两套不一致数据。

## 六、18张最终设计图

最终必须输出 18 张独立图片，并额外输出 1 张 6×3 总览图。

目录：
`outputs/release/nature-launch-v1/images/`

命名必须使用 design_id，例如：
- `MOUNTAIN-01.png`
- `OCEAN-03.png`
- `GLACIER-02.png`

总览：
`outputs/release/nature-launch-v1/NATURE_LAUNCH_18_BOARD.png`

### 图片生成原则

优先使用现有 Workbench 的真实排珠/Canvas，根据最终 bead sequence 加载并导出/截图，确保图与 BOM 一致。

每张图至少要清楚看到：
- 完整手串结构；
- 不同珠径节奏；
- 主石/异形件/银件位置；
- 对称或非对称结构；
- 主题的整体色彩关系。

统一：
- 干净中性背景；
- 相同画布尺寸和视觉尺度；
- 不包含浏览器地址栏/调试UI；
- 不加多余营销文案；
- 图上允许简洁标注设计名/编号，但不能遮挡主体。

素材优先级：
`source_cutout > source_neutral_optimized > source_derived > generated_from_evidence > fallback`

如果真实素材尚不完整，不要因此停止18张图；使用当前最可信的 Workbench 表现完成结构图，但不得把 generated/fallback 说成实拍成品照。

如果执行环境支持更高质量概念渲染，可以额外生成 concept render，但**Workbench排珠图仍是结构权威图**。

## 七、最终Excel——只要一个文件

最终必须生成一个真实 `.xlsx` 文件，不得用 CSV 改后缀冒充：

`outputs/release/nature-launch-v1/Crystal_自然主题18款_选品设计与材料表_V1.xlsx`

如果环境可用 Python/openpyxl 或等价成熟库，直接生成并做 read-back 校验。

### Sheet 1：`01_材料选品总表`

只保留最终18款实际需要、以及极少数明确替代材料。

字段至少：
- Material ID
- Spec ID
- 中文名
- English Name
- 类别（水晶/宝石/珍珠/木材/银件/结构件等）
- 选用品质/视觉标准
- 颜色/透明度/光学特征
- 形态/切型
- 珠径或尺寸
- 孔径/连接要求（已知则填）
- 设计作用
- 使用设计
- 18款合计用量
- 建议首轮打样准备量
- 可替代材料/规格
- 采购确认备注

**禁止采购链接列。**

### Sheet 2：`02_18款设计总览`

每款一行：
- design_id
- 中文名
- English name
- 主题
- 场景
- 结构类型
- 核心材料
- 主石
- 目标手围
- bead count
- 核心结构差异
- 图片文件名
- 打样注意

### Sheet 3：`03_逐款BOM`

逐设计逐规格展开：
- design_id
- theme
- material_id
- spec_id
- 材料名称
- form
- size_mm
- quantity
- role
- 替代项
- 备注

### Sheet 4：`04_18款总材料需求`

按 material/spec 聚合：
- material_id
- spec_id
- 材料名称
- 使用款数
- used_by_designs
- 18款一套样品的总数量
- 建议准备数量（含合理打样余量）
- 是否核心共用材料
- 备注

### Sheet 5：`05_设计差异与替代`

用于最终人工快速审阅：
- 同主题3款差异
- 可能过近 pair
- 主石/异形件差异
- 结构差异
- 替代材料
- 被拒绝/不采用的旧候选（仅必要时简短记录）

### Excel样式

- 中文为主；
- 冻结首行；
- 自动筛选；
- 合理列宽；
- 数字格式正确；
- 不做花哨配色；
- 材料、设计、数量可以快速筛选；
- 不要把说明文字塞成大段长文本。

## 八、最终材料清单

同时输出机器可读：

`outputs/release/nature-launch-v1/materials-needed-v1.json`

只回答“为了制作这18款，需要准备什么”。

按材料/规格聚合，至少：
- material_id
- spec_id
- zh_name
- en_name
- category
- form
- size
- quality_visual_standard
- used_by_designs
- quantity_for_one_18-design_sample_set
- recommended_sample_quantity
- substitute
- purchase_confirmation_note

不包含采购链接。

## 九、最终自检

提交前必须检查：

### 设计
- 18款存在；
- 每主题3款；
- 结构不是换色；
- bead sequence 连续；
- BOM == beads 聚合；
- 所有正式材料都在 Excel；
- 设计与图片一一对应；
- Ocean != Glacier；
- Forest != 普通木珠串；
- Mountain != 棕色虎眼模板；
- Sunrise 不甜腻；
- Starlight 不靠紫+黑凑数。

### 图片
- 18/18 PNG 存在；
- 6×3 board 存在；
- 图片顺序/结构与 JSON 一致；
- 没有浏览器/调试杂项；
- fallback/generated 使用时标识事实，不冒充实拍。

### Excel
- xlsx 能重新打开；
- 5个 sheet 全部存在；
- 不含采购链接列；
- 设计数 = 18；
- BOM 设计数 = 18；
- 总材料用量能够从 BOM 重算；
- 无表外正式材料；
- 不含明显重复/废弃旧规格。

## 十、最终交付目录

所有最终用户交付统一放在：

`outputs/release/nature-launch-v1/`

至少包含：
- `Crystal_自然主题18款_选品设计与材料表_V1.xlsx`
- `NATURE_LAUNCH_18_BOARD.png`
- `images/` 下18张 PNG
- `materials-needed-v1.json`
- `FINAL_RELEASE_HANDOFF.json`

不要要求用户阅读中间 JSON/日志才能知道结果。

## 十一、Handoff

写：
`outputs/release/nature-launch-v1/FINAL_RELEASE_HANDOFF.json`

只保留：
- result
- final_design_count
- theme_counts
- final_material_count
- final_spec_count
- excel_path
- image_count
- board_path
- materials_path
- strongest_designs
- designs_reworked_from_candidate
- remaining_non_blocking_purchase_confirmations
- true_blockers
- commit_sha

只有以下任一情况才允许 BLOCKED：
- 无法生成有效 xlsx；
- 无法生成18张结构一致的设计图；
- 18款中仍存在无法合理确定材料身份的核心结构；
- 现有数据存在无法自行消解的直接矛盾。

供应商、采购链接、价格、批次、产地未完成不属于本轮 blocker。

完成后 commit + push `main`，确认 HEAD == origin/main。不要自行把“Agent completed”写成主管 Accepted。