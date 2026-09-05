# P4 Crystal Studio Completion — Design Specification

Status: SUPERVISOR APPROVED
Date: 2026-09-06
Owner: Crystal｜主管
Execution owner: Crystal｜工程
Baseline checkpoint: `49432faa3101d9a682ce645a2a20849f9b149b66`
Design exchange contract: `docs/CRYSTAL_DESIGN_PACKAGE_V1.md`

## 1. Business reason

Crystal 当前最重要的不是继续扩数据库，而是把“选品 → 18 款自然主题设计 → Workbench 验证 → BOM → 打样/采购”连成可用闭环。

P3T 已经有圆形编辑器、逐颗实例、拖动/换位、15–20 cm 手围、undo/redo、草稿保存和导出，因此 P4 是产品化完成，不是重写。

18 款设计与 P4 必须并行：设计 Agent 先产出候选包；工程 Agent 让 Workbench 能加载、复算、验证和呈现它们。Workbench validation 不替代主管审美判断。

## 2. 参考交互的取舍

用户提供的参考界面中值得吸收的是交互模型，而不是复制具体 UI：

- 大面积圆形实体设计盘是视觉中心；
- 材料库始终在设计盘下方，可搜索并按水晶 / 珍珠天然材质 / 配饰 / 异形主石分类；
- 材料可以逐颗加入；
- 成串前可自由摆放；
- 一键“收拢成串”形成闭合手串；
- 顶部即时显示手围、颗数、拟合状态和已知成本；
- 普通圆珠、异形主石、结构件处于同一设计流程；
- 设计完成后输出 BOM、保存、打样单和导出。

Crystal 不做消费者购物 App：
- 不做购物车、支付、账号、云商城；
- 无可信价格时显示 `—`，不得编造；
- 不照搬第三方品牌的视觉识别或 trade dress；
- 桌面优先，专业、低噪音、中性、高级。

## 3. Crystal Studio 默认结构

```text
┌──────────────────────────────────────────────────────────────────┐
│ Crystal Studio | 设计名 / 主题 | 16.0cm · 20颗 · Fit≈适配        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│                      大型圆形设计盘                               │
│                                                                  │
│      散珠自由摆放 / 选中 / 拖动 / 删除 / 替换 / 真实尺寸比例        │
│                       ↓ 收拢成串                                  │
│                    闭合手串顺序预览                               │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│ 手围 | 散珠/成串 | Undo | Redo | Clear | Save | BOM | Export    │
├──────────────────────────────────────────────────────────────────┤
│ 搜索材料...                                                       │
│ 水晶 | 珍珠/天然材质 | 配饰 | 异形/主石                            │
│ [缩略图 名称 规格 - 数量 +] [缩略图 名称 规格 - 数量 +] ...        │
├──────────────────────────────────────────────────────────────────┤
│ 首发系列 6×3 Portfolio Board / 当前设计 validation               │
└──────────────────────────────────────────────────────────────────┘
```

现有总览、选品清单、参考图库可以保留为辅助页，但进入“设计板”时应进入 Studio，而不是传统三栏后台。

## 4. 两种画布状态

### Loose / 散珠

- 珠子可在圆盘内自由摆放，不强制吸附到圆环；
- 点击材料卡的 `+` 在设计盘可用区域新增实例；
- 每个实例都有独立 `instanceId`；
- 可拖动、删除、替换；
- 适合构思非对称结构和主石位置。

### Bracelet / 成串

- 点击“收拢成串”后，按当前 `beads` 顺序排成闭合手串；
- 不把混合珠径强行按一个固定 fallback 珠径计算；
- 排列使用每个实例自己的沿线尺寸近似计算角度间距；
- 结果必须标注为 `fit estimate`，不能表述成实物佩戴保证；
- 可以拖动换位，并更新顺序。

## 5. 设计数据模型

P4 读取 `docs/CRYSTAL_DESIGN_PACKAGE_V1.md`，支持：

`material_id + spec_id + size_mm + source_status + instance_id`

而不是只保存材料显示名称。

设计可以使用 `PROPOSED` 材料继续验证；Workbench 必须明显显示：
- APPROVED
- PROPOSED
- UNRESOLVED

不得自动改变这些状态，也不得写 canonical SQLite。

## 6. 18 款首发设计验证

Workbench 增加 `Nature Launch / 自然首发` 入口，读取：
`outputs/designs/nature-launch-v1.json`

呈现分三层：

1. **6×3 Portfolio Board**：每主题 3 张设计卡，共 18 张；主信息是设计预览、名称、结构类型、核心材料、目标手围、材料状态、validation。
2. **单款 Studio**：点击卡片直接载入设计盘，可修改/另存，不覆盖正式候选源文件。
3. **差异矩阵**：同主题三款结构差异 + 全 18 款高度重复预警。

Workbench 自动验证：
- 主题覆盖和数量；
- bead 排序完整性；
- material/spec 映射；
- expected BOM 与自动聚合 BOM 是否一致；
- 目标手围的几何近似差；
- 保存/重载顺序一致；
- 结构指纹重复风险；
- 图片加载/fallback 情况。

Workbench 不自动判断：好看、高级、市场一定购买、用户一定喜欢。

## 7. BOM 与输出

当前设计随时显示自动 BOM：
- material_id / spec_id
- 中英文材料名
- 规格/珠径/形态
- 数量
- source status
- 采购映射状态

导出至少支持：
- design JSON
- BOM JSON/CSV
- 人类可读设计单（Markdown 或现有稳定格式）

打样单只包含设计和装配信息，不引入供应商订单系统。

## 8. Google Drive 实拍素材与抠图策略

### 角色边界

不新增 Agent。

- `Crystal｜灵感`：负责 Google Drive 原图的筛选、同款/多角度归组、来源性质、材料视觉是否有代表性、哪些值得加工，以及难以抠图/不适合作为单珠 sprite 的判断。
- `Crystal｜选品`：负责确认素材对应的材料身份、规格、品质标签是否足以支持该名称；不能因为照片看起来像就确认真伪、产地或处理方式。
- `Crystal｜工程`：负责批量图像资产生产管线：读取已批准输入 → 抠图 → 透明背景 → 尺寸/画布标准化 → 压缩 → manifest 映射 → Workbench 加载 → 真实浏览器 QA。工程不负责“猜它是什么水晶”。

### 默认优先级

`真实可用源图抠图 > 中性技术优化 > generated_from_evidence 仿真图 > 纯占位`

因此，Google Drive 中已有的可用实拍图应优先复用，确实能够显著减少重复生成仿真水晶的工作量，同时提高材质真实性和可追溯性。

但“有照片”不等于“适合做 sprite”。以下情况仍需 fallback 或生成补位：
- 只有整串/成品照，单颗被严重遮挡；
- 透视过强、反光爆白、背景颜色污染材料；
- 分辨率过低；
- 没有对应珠径/异形形态；
- 需要表现低/中/高品质差异，但源图并没有真实对应证据；
- 抠图后边缘/孔位/透明区域失真。

不得用一张实拍图“加工”成虚假的三个品质等级。缺失的品质视觉如需要生成，必须标 `generated_from_evidence`，不能标 `source_photo`。

### 资产标准

批量资产默认输出透明 PNG 或 WebP，方形画布，主体居中并保持一致视觉尺度。阴影尽量由 Workbench CSS/Canvas 统一产生，不把重阴影永久烘焙进图。

每个资产记录：
- material_id / spec_id
- source type
- source locator/file id（若允许记录）
- source SHA-256（取得真实源字节时）
- processing method
- representation class (`source_cutout`, `source_derived`, `generated_from_evidence`, `fallback`)
- rights/publication status

### 公共仓库风险

`lulululucy1227/Crystal` 当前是 public repo。Google Drive 图片不得默认上传到 public GitHub。

- 用户自有/明确授权且允许公开的素材，才可进入 tracked public assets；
- 第三方品牌/供应商图片、来源权利不清、私人 Drive 图片，默认只做本地 Workbench 资产，不 push 到 public repo；
- GitHub 中可提交 manifest/处理逻辑，但不提交未获公开授权的源图或衍生抠图。

## 9. 价格与成本

P4 可以提供成本栏位和 BOM 成本聚合接口，但只有数据源有可信采购价格才显示数值。没有价格时显示未知，不用旧视频截图中的人民币价格作为 Crystal 成本。

## 10. 技术原则

- 继续 Node 24 + 原生 JS + Fabric 7.4.0；
- 不引入前端框架重写；
- 把现有 48KB `app.js` 中本次新增职责拆成少量聚焦模块，避免继续把所有功能堆进一个文件；
- canonical SQLite 全程 read-only；
- 用户 `workbench/exports/` 不删除、不清理、不纳入 commit；
- P3R blocker 保持独立；
- 单项 blocker 记录后继续其他可安全工作。

## 11. 真实验收

最终 `COMPLETED` 必须同时满足：

1. 自动测试通过；
2. `npm test` 通过；
3. `npm run validate` 通过；
4. `git diff --check` 通过；
5. canonical SQLite SHA before == after；
6. 真实 `http://127.0.0.1:4173` 浏览器中完成一次：新增珠子 → 散珠拖动 → 收拢成串 → 换位 → Undo/Redo → 保存 → 重载 → BOM → 导出；
7. 18 款设计包存在时，可以显示 6×3 board 并逐款载入；若设计 Agent 尚未交付，工程必须用 contract fixture 完成能力测试，待真实包进入后再跑一次最终验证，不得伪造 18 款；
8. Google Drive/source cutout 资产如本地可用，至少验证一组真实 cutout 在 Workbench 正常渲染；若本地源字节不可获得，不因此阻塞 Studio 主功能，但要明确资产 blocker；
9. 浏览器 console/network 无影响主流程的错误；
10. 真实浏览器截图/QA 证据来自运行中的 Workbench，不用离线 mock 代替。

## 12. 明确不做

- 电商购物车/订单/支付；
- 用户账户/云同步；
- 供应商管理系统；
- canonical 数据迁移；
- P3R blocker 修复；
- 无边界的素材库补全；
- 为了“更现代”而整体换技术栈。
