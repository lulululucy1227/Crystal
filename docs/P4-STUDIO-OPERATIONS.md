# Crystal Studio P4 — 本机使用与验收边界

## 启动与操作

在项目目录运行 `npm run workbench`，打开 `http://127.0.0.1:4173`，不要直接打开 HTML 文件。

- 进入设计板；材料卡只选择材料，指定尺寸/形态后按 `＋` 添加一颗。
- 散珠在盘内自由拖动；收拢成串后拖动改变次序。点击单颗可删除、替换或与下一颗换位。
- 手围支持 15–20 cm。尺寸按各实例的沿线尺寸求和，余量默认 5 mm；并非手串内圈几何测量，也不是佩戴保证。弧管/异形主石须打样复核。
- 撤销/重做包含排布变动。中文名称草稿存于本机被忽略的 `workbench/state/draft-*.json`。
- 导出按钮生成本地下载链接，再点击该链接下载设计 JSON、BOM JSON/CSV 或 Markdown。下载内容保存在浏览器选择的位置，不写入用户的 `workbench/exports/`。
- 首发看板载入的是设计 Agent 已提交的真实 18 款候选包。编辑操作生成本地副本，不改正式输入。PROPOSED / NOT_CHECKED 不等于采购或审美批准。

## 本地真实素材

工程不鉴定材料、不猜测标签、不把截图标签升级成矿物事实。灵感/选品负责人先提供已获准处理的文件及准确 material_id / spec_id 映射。

源文件放在被忽略的 `inputs/local-assets/`，同目录创建 `approved.json`：

```json
{"records":[{"file":"approved-cutout.png","material_id":"exact-material-id","spec_id":"exact-spec-id","source_type":"source_cutout","rights_status":"user_authorized","publication_status":"local_only"}]}
```

运行 `node tools/process-local-assets.mjs inputs/local-assets/approved.json 256`。

已有透明 PNG/WebP 会以真实 alpha 边界居中、方形归一，并保留源 SHA-256；不是重新生成质感。JPEG 或不透明图只登记 `needs_mask=true`，不会假装已完成抠图。生成图即使透明也必须填 `generated_from_evidence`。结果、本地 manifest 与源字节均被 Git 忽略；公共仓库不得上传未明确获准公开的私有/供应商图片。

UI 只服务当前 manifest 中 ready 且路径安全的输出，优先使用准确 material/spec 对应的真实 cutout，其次中性源图处理、生成参考图、技术占位。没有准确异形素材时使用带标签的技术形状，不借圆珠照片冒充。

## 开源复用与决策记录（2026-09-06）

| 方案 | 核查与决定 |
| --- | --- |
| Fabric.js 7.4.0 | 保留现有 MIT 依赖及画布，不引入框架重写。 |
| 浏览器 QA | 使用现有真实浏览器/Playwright 操作能力；无必要再添加一个浏览器运行时。 |
| Sharp 0.35.4 | 精确锁定；Node 24.19 / Windows x64 实测 PNG、JPEG、WebP、透明及交错 PNG。以成熟解码器替代手写 PNG 路径。新增本机相关包约 19.4 MiB，不引入服务器/云。 |
| Sharp 许可 | JS 包 Apache-2.0；Windows 预编译包及其 libvips 组件并非全为 Apache，包含 LGPL-3.0-or-later。仅本机动态依赖，不把二进制纳入 Git 或重新分发；保留上游许可。未来分发产品需复核动态链接、替换及许可告知义务。 |
| rembg | MIT 工具代码不等于所有模型权重可商用。检查到 2.0.83；默认 BRIA 权重约 1.02 GB 且商业许可有限制，不采用。无私有素材上传云端。未安装 rembg/ONNX/模型。 |
| U2-Netp | 约 4.7 MB、上游 Apache-2.0，是以后本地小样候选；当前缺少带身份/权利映射的真实源字节，不能做有意义的透明水晶小样质量 benchmark，因此未引入。 |

Sharp 合成透明图 1024×768 → 256 的 5 次中位时间为 15.8 ms（原生旧路径 47.5 ms）。这仅证明编码/归一吞吐，不证明透明水晶抠图质量。

来源：[Sharp 安装要求](https://sharp.pixelplumbing.com/install/)、[Windows 包许可](https://github.com/lovell/sharp/blob/main/npm/win32-x64/package.json)、[rembg 发布](https://pypi.org/project/rembg/)、[rembg 模型说明](https://github.com/danielgatis/rembg)、[U-2-Net](https://github.com/xuebinqin/U-2-Net)。

## 已知限制与验收解释

真实资产管线软件已完成，但本轮没有已获准处理并附精确身份映射的本地真实 cutout。生成球体与带字占位只能检验排布，不能作为实物还原度通过证明。正式 18 款全部为 PROPOSED，可信 Working Version 采购映射尚未提供，故显示 NOT_CHECKED，而非错误地标成 UNMAPPED 或 APPROVED。

工程运行态验收与审美/采购验收分开。P3R Drive SHA blocker 保留；canonical SQLite 不写入；用户 exports 不变。后续提供权利和身份已确认的本地源图，以及可信采购映射后，才能完成真实素材/采购就绪验收。
