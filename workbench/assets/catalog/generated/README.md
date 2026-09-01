# Crystal Workbench Generated Assets V1

本目录是 GPT 主管根据已核验 Evidence 层制作的第一版标准化工作台素材。

## 资产性质

- `representation_type = generated_from_evidence`
- 不是实拍，不得标成 `source_photo`
- 用于“快速识别品种 + 比较品质/光效/类型”，不是电商商品图
- 中文名为主，英文只作对照
- 具体来源、许可与证据记录仍以 `data/workbench-asset-manifest.json` 与 `workbench/assets/catalog/_sources/` 为准

## 文件

- `crystals-hero-atlas.svg`：23 个水晶/矿物代表图
- `crystals-comparison-atlas.svg`：23 个水晶的低/中/高、光效、纹理或类型对比
- `pearls-organic-hero-atlas.svg`：珍珠与深色木材代表图
- `pearls-organic-comparison-atlas.svg`：珍珠光泽/表皮/颜色差异与木材结构对比
- `hardware-hero-atlas.svg`：8 个 V1 银色结构件
- `packaging-hero-atlas.svg`：8 个 V1 包装结构
- `generated-asset-manifest-v1.json`：atlas 网格、条目顺序与中英文映射

## 使用方式

工作台可依据 `generated-asset-manifest-v1.json` 的 atlas 网格和条目顺序，通过 SVG sprite、裁切或 background-position 使用。

## 重要边界

- `low / mid / high` 只是视觉品质参考，不是供应商 AA/AAA，也不是市场统一价格等级。
- 黑曜石优先按类型区分；拉长石/月光石/虎眼石优先按光效区分；幽灵水晶优先按纹理/内部景观区分。
- 深色木材显示图不得作为沉香物种鉴定依据。
- 后续若补充合法实拍抠图，应作为增强层；不得破坏当前 Evidence → Display 的来源关系。
