# Crystal Workbench 素材来源与识别标准 V1

更新时间：2026-09-01

本文件由 GPT Crystal 主管维护。素材范围以 `docs/ASSORTMENT_SELECTION_V1.md` 为准；Codex 不负责联网找图、下载或抠图，只消费 GPT 已提交到仓库的素材。

## 1. 素材目标

工作台图片不是“必须原封不动使用实拍商品照”。优先级为：

1. 一眼能识别品种；
2. 保留关键视觉特征（颜色、透明度、内含物、光效、纹理）；
3. 对适合分级的材料，能通过图片看出低/中/高视觉品质差异；
4. 适合统一成单颗圆珠/单颗珍珠/单个配件/单个包装物的目录图；
5. 外部素材必须有明确可再分发、可修改许可后才能作为二进制文件进入公开 GitHub。

“低/中/高”仅用于工作台视觉品质参考，不等同于统一市场价格等级。

## 2. 已建立 GitHub 总台账

结构化台账：`data/workbench-asset-manifest.json`

台账已覆盖当前 V1 范围：

- 水晶/矿物：白水晶、茶晶、海蓝宝、拉长石、彩虹月光石、天河石、青金石、绿幽灵、黑曜石、紫水晶、黄水晶、虎眼石、蓝纹玛瑙、锂辉石、血石、白幽灵、粉水晶、彩虹黑曜、海纹石、金发晶、黑发晶、混合发晶、舒俱来；
- 珍珠/天然材质：淡水珍珠、Akoya、白色南洋珠、金色南洋珠、大溪地珍珠、深色木质/沉香类结构材质；
- 配饰/结构件：微型隔珠、弯管、细框/包边、半帽/边帽、几何连接件、银色过渡球、细银链+扣件、开口圈；
- 包装：冷白硬盒、冷灰抽屉盒、柔灰/珍珠白保护袋、材质说明卡、运输盒、棉麻袋、书本式磁吸盒、One-of-One 证书卡。

## 3. 当前已确认许可清晰的代表性来源

以下为已经找到并写入 manifest 的候选，不代表已经完成最终抠图：

| 类别 | 中文 | English | 来源 | 许可/状态 |
|---|---|---|---|---|
| 水晶 | 茶晶 | Smoky Quartz | Wikimedia Commons `Smoky-quartz.jpg` | CC0 1.0 |
| 水晶 | 彩虹月光石 | Rainbow Moonstone | Wikimedia Commons `Moonstone beads.jpg` | CC0 1.0 |
| 水晶 | 天河石 | Amazonite | Wikimedia Commons `Amazonita.png` | CC BY 4.0 |
| 水晶 | 青金石 | Lapis Lazuli | Yale / Wikimedia Commons `Lapis Lazuli Bead - YDEA` | CC0 1.0 |
| 水晶 | 黑曜石 | Obsidian | The Met / Wikimedia Commons | CC0 1.0 |
| 水晶 | 紫水晶 | Amethyst | Yale / Wikimedia Commons `Amethyst Bead - YDEA` | CC0 1.0 |
| 水晶 | 虎眼石 | Tiger's Eye | Wikimedia Commons `Coral and tiger eye beads.jpg` | CC0 1.0 |
| 水晶 | 蓝纹玛瑙 | Blue Lace Agate | Wikimedia Commons `Blue Lace Agate (white).png` | CC0 1.0 |
| 水晶 | 粉水晶 | Rose Quartz | Wikimedia Commons 2026 Harman Mineral Collection | CC0 1.0 |
| 水晶 | 海纹石 | Larimar | Wikimedia Commons `Larimar.jpg` | Public Domain |
| 水晶 | 黑发晶 | Black Rutilated Quartz | Wikimedia Commons `Rutilated Quartz Specimen 3` | CC BY 4.0 |
| 天然材质 | 深色木质 | Dark Wood | Wikimedia Commons `Black Wooden beads.jpg` | CC0 1.0 |
| 珍珠 | 白色淡水珍珠 | White Freshwater Pearl | Wikimedia Commons `Freshwater pearl texturedloose.jpg` | CC0 1.0 |
| 珍珠 | Akoya | Akoya Pearl | Wikimedia Commons `Akoya pearl.jpg` | CC BY-SA 3.0 |
| 珍珠 | 白色南洋珠 | White South Sea Pearl | Wikimedia Commons `Pearl from Pinctada maxima...` | CC BY 2.0 |
| 珍珠 | 大溪地珍珠 | Tahitian Pearl | Wikimedia Commons `Perle-tahiti-manapearl.png` | CC BY-SA 3.0 |
| 配饰 | 银链/扣件 | Silver Chain + Clasp | Wikimedia Commons sterling silver chain/clasp files | CC BY 4.0 / CC BY-SA 4.0 |
| 包装 | 保护袋 | Drawstring Pouch | The Met / Wikimedia Commons | CC0 1.0 |
| 包装 | 运输纸盒结构 | Cardboard Box | Wikimedia Commons `Simple cardboard box.svg` | CC0 1.0 |

## 4. 必须继续补强的品种

这些并不是没有素材，而是当前候选还不足以达到“工作台一眼识别 + 档位差异”的最终标准：

- 白水晶：已有 Rock Crystal bead 线索，但要补更标准的圆珠展示和不同净度层级；
- 海蓝宝：已有合法切磨图，但需补圆珠和灰蓝→高蓝、低净度→高净度差异；
- 绿幽灵/白幽灵：已有 Phantom Quartz 合法参考，仍需针对绿色/白色包裹体的代表图；
- 黄水晶：Commons 类别已确认，需逐张挑选许可明确且色调可信的文件；
- 金发晶：已有通用 Rutilated Quartz 合法来源，需要更明确的金色发丝；
- 金色南洋珠：已确认 Pinctada maxima 来源池，需要挑出金色珠本体；
- 配饰中的弯管、极简细框、半帽、几何连接件：公开图库中现代标准化商品式素材较少，优先寻找允许再分发的现代实物图；找不到时使用项目原创标准展示资产，而不是复制版权不明电商图；
- 冷灰抽屉盒、书本式磁吸盒、说明卡、One-of-One 证书卡：更适合作为 Crystal 自有标准视觉资产，不需要强行使用外部商品照片。

## 5. 分级方式

### 适合低/中/高视觉对比

白水晶、茶晶、海蓝宝、紫水晶、黄水晶、粉水晶、天河石、青金石、虎眼石、蓝纹玛瑙、海纹石、金发晶、黑发晶、舒俱来，以及珍珠类。

### 更适合“光效/纹理强弱”而不是统一等级

拉长石、彩虹月光石、绿幽灵、白幽灵、彩虹黑曜、血石、混合发晶。

### 更适合“类型差异”

普通黑曜石与彩虹黑曜石应作为不同光学类型展示，不强行放在同一个低/中/高等级轴上。

## 6. 下一步处理顺序

1. 逐项补齐 manifest 中 `needs_source` / `needs_*_source`；
2. 对所有 `approved_source` 再核一次文件页许可；
3. 获取原图并做透明背景/抠图；
4. 同品种统一方形画布、视觉尺寸和光感，不改变天然特征；
5. 对适合分级的品种建立 `low / mid / high` 三张代表图；
6. 写入作者、许可、来源、处理说明和 sha256；
7. 处理后的二进制素材再进入 `workbench/assets/catalog/`。

不允许为了“好看”把天然差异抹平，也不允许使用版权不明电商图冒充项目素材。
