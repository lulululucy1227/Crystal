# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1
Phase: P3S-R1-WORKBENCH-ASSET-RUNTIME-REPAIR
Status: authorized
Model: Luna preferred; Sol/High acceptable if unavailable
Strength: Medium
Execution class: SAFE_WRITE(workspace only) + READ_ONLY canonical SQLite

## 主管纠偏结论

P3S 先前的 `COMPLETED` 验收结论被用户真实运行截图推翻，必须重新打开验收。

用户在实际 `http://127.0.0.1:4173` 工作台中看到：

- 水晶卡片主图区域为空白；
- low/mid/high / effect comparison 小格为空白；
- 右侧配饰精选没有图像，只剩文字；
- 右侧包装精选没有图像，只剩文字；
- 页面仍显示“生成参考图”标签，说明映射/DOM 骨架存在，但实际图像没有渲染出来。

此前提交的 `outputs/visual/p3s-*.png` 不能再作为真实运行验收依据；用户指出那是渲染/模拟结果，不是其实际工作台截图。

因此：

`P3S engineering mapping exists` ≠ `P3S runtime image rendering works`。

本轮不是 P3T 视觉优化，也不是重新设计 UI。唯一目标是修复并证明真实浏览器中的素材渲染。

## 当前基线

- 当前已知 P3S commit：`f3cdc57a85258e8124253171367b8344aa7f5006`
- canonical DB SHA 基线：`8FE0CA49229808D3F737D14F0A4B5698B971827BFEC11E05E4FFCAE2A3B85DC6`
- P3R 继续保持 blocked and preserved。
- `workbench/exports/` 属于用户本地导出，不得删除、纳入、清理或修改。

## 权威素材文件

继续使用现有仓库素材，不联网找图，不重新生产素材：

- `workbench/assets/catalog/generated/generated-asset-manifest-v1.json`
- `workbench/assets/catalog/generated/generated-asset-overrides-v1.json`
- `workbench/assets/catalog/generated/crystals-hero-atlas.svg`
- `workbench/assets/catalog/generated/crystals-comparison-atlas.svg`
- `workbench/assets/catalog/generated/crystals-grade-overrides-v1.svg`
- `workbench/assets/catalog/generated/pearls-organic-hero-atlas.svg`
- `workbench/assets/catalog/generated/pearls-organic-comparison-atlas.svg`
- `workbench/assets/catalog/generated/hardware-hero-atlas.svg`
- `workbench/assets/catalog/generated/packaging-hero-atlas.svg`

## 执行原则

1. 不重新设计工作台布局。
2. 不写 canonical SQLite。
3. 不处理 P3R SHA blocker。
4. 不联网重新找图片。
5. 不接受“manifest 存在”“DOM 有 span”“CSS 有 background-image”作为通过证明。
6. 必须以用户真实访问路径 `http://127.0.0.1:4173` 的浏览器渲染为最终事实。
7. 单项 blocker 记录后继续其他可安全检查；只有所有剩余项都被真正 blocker 阻塞时才停。

## P3S-R1-A — 先定位为什么真实浏览器为空白

在修改代码前完成最小诊断，并把结论写入 `outputs/p3s-r1-runtime-asset-repair.json`。

必须检查：

### 1. 静态资源 HTTP 可达性

实际启动 Workbench server 后，对以下真实 URL 做 GET：

- `/assets/catalog/generated/crystals-hero-atlas.svg`
- `/assets/catalog/generated/crystals-comparison-atlas.svg`
- `/assets/catalog/generated/crystals-grade-overrides-v1.svg`
- `/assets/catalog/generated/pearls-organic-hero-atlas.svg`
- `/assets/catalog/generated/hardware-hero-atlas.svg`
- `/assets/catalog/generated/packaging-hero-atlas.svg`
- `/assets/catalog/generated/generated-asset-manifest-v1.json`

逐项记录：
- HTTP status
- content-type
- body length > 0

所有 SVG 必须返回 200 + `image/svg+xml`。

### 2. SVG 本身能否被 Chrome 直接渲染

至少直接打开：

`http://127.0.0.1:4173/assets/catalog/generated/crystals-hero-atlas.svg`

确认浏览器中确实能看到 atlas 图形，而不是空白/解析错误。

如 SVG 自身不能显示，先修 SVG/服务层；如 SVG 单独可显示但 Workbench 中空白，继续检查 CSS/DOM。

### 3. 实际 DOM + computed style

在真实 Workbench 页面检查至少一个水晶 hero、一个 grade slot、一个配饰、一个包装 `.atlas-sprite`：

记录：
- 元素存在；
- width / height > 0；
- computed `background-image` 不是 `none`；
- computed `background-size`；
- computed `background-position`；
- 实际 background image URL；
- 对该 URL 发起的 Network request 是否 200；
- Console 是否有 SVG/CSS/resource error。

如果 computed background-image 为 none，查 CSS custom property/inline style 生成问题。
如果 background-image 有 URL 但请求 404，修路径。
如果 URL 200 且 SVG 可单独显示，但 sprite 空白，查 background-size / background-position / atlas cell geometry。

### 4. 不允许用脚本“合成截图”代替浏览器结果

任何视觉验收截图必须来自实际 Chrome/Chromium 打开的 Workbench 页面。
不得用 Pillow、SVG renderer、mock HTML、离线拼图或人工合成截图作为 runtime QA 证据。

## P3S-R1-B — 修复策略：优先简单可靠

根据诊断结果采用最小修复。

允许：
- 修正 URL/path；
- 修正 MIME；
- 修正 CSS custom property；
- 修正 background-size/background-position；
- 修正 sprite wrapper 尺寸；
- 修正 atlas grid 计算；
- 如 CSS background sprite 在本地浏览器环境确实不稳定，可改成更可靠的裁切方案。

如果现有 `background-image + CSS custom property` 方案是根因，优先改成浏览器更容易验证的直接 DOM 图像方案，例如：

- wrapper `overflow:hidden` + `<img src="...atlas.svg">` 绝对定位/transform 裁切；或
- 其他无需复制 45 份素材、仍保持 manifest 驱动的简单方案。

不要为了修图引入复杂框架。

## P3S-R1-C — 真正的运行态验收

修复后必须在用户实际路径等价的本地浏览器中确认：

### 水晶页面

至少首屏 8 个对象必须肉眼看到真实图形：
- 白水晶
- 茶晶
- 海蓝宝
- 拉长石
- 彩虹月光石
- 天河石
- 青金石
- 绿幽灵

不是空白框，不是只显示“生成参考图”。

### 珍珠页面

至少确认：
- 白色淡水珍珠
- Akoya
- 大溪地
- 白色南洋珠
- 金色南洋珠
- 深色木材结构隔片

hero 实际可见。

### 配饰/包装右栏

8/8 配饰与 8/8 包装必须实际有图形缩略图，不得只剩名称。

### comparison

至少验证：
- 白水晶 override
- 茶晶 override
- 海蓝宝 override
- 拉长石 base effect
- 彩虹月光石 base effect
- 虎眼石 base effect

三个 comparison 小格实际可见。

最终再完成全量覆盖统计：
- 23/23 crystal hero rendered
- 6/6 pearl/organic hero rendered
- 8/8 hardware hero rendered
- 8/8 packaging hero rendered
- 10/10 override runtime rendered
- broken asset = 0

“有映射但实际空白”必须算 broken，不得算 coverage。

## P3S-R1-D — 真实浏览器截图

必须生成新的、真实浏览器截图：

- `outputs/visual/p3s-r1-workbench-crystals-real-browser.png`
- `outputs/visual/p3s-r1-workbench-pearls-real-browser.png`

如 comparison 能在现有页面可见，再生成：

- `outputs/visual/p3s-r1-workbench-comparison-real-browser.png`

截图必须满足：
- 浏览器地址栏或可确认真实运行环境的证据存在；
- 来源是实际 Workbench 页面；
- 不能是离线渲染图或合成图。

## P3S-R1-E — 防止再次“测试绿但页面空白”

现有 focused test 只证明 manifest/CSS 字符串存在，不足。

新增最小 runtime smoke test，至少验证：

1. 启动真实 Workbench server；
2. GET 所有 atlas 返回 200；
3. SVG content-type 正确；
4. 使用真实浏览器环境（如现有 Playwright/Puppeteer/Chrome CDP，优先复用已有能力）打开 Workbench；
5. 至少检查一个 hero sprite 和一个 rail sprite 的 computed background-image / bounding box；
6. 如果测试框架能截图/像素校验，加入非空渲染验证；如果不能，至少读取 browser console/network 并确保无资源错误。

不要新增重量级依赖，除非仓库已有浏览器测试能力无法完成最基本验收。

## P3S-R1-F — Regression / boundaries

运行：

- focused P3S-R1 runtime test
- 原 P3S focused test
- `npm test`
- `npm run validate`
- `git diff --check`

Canonical DB：

- SHA before = `8FE0CA49229808D3F737D14F0A4B5698B971827BFEC11E05E4FFCAE2A3B85DC6`
- SHA after 必须相同
- writes = 0

P3R：
- remains blocked and preserved

User exports：
- preserved untouched

## P3S-R1-G — 收尾与报告

创建：

- `outputs/p3s-r1-runtime-asset-repair.json`
- `outputs/handoffs/P3S-R1-WORKBENCH-ASSET-RUNTIME-REPAIR.json`

更新：

- `outputs/GPT_HANDOFF.json`

最终 commit + push `main`，确认 HEAD == origin/main。

最终报告必须明确：

1. root cause；
2. 用户真实截图为何与旧 P3S 截图不一致；
3. 实际采用的修复；
4. 23/23 crystal hero rendered；
5. 6/6 pearl/organic hero rendered；
6. 8/8 hardware rendered；
7. 8/8 packaging rendered；
8. 10/10 override rendered；
9. broken assets；
10. 新的真实浏览器截图路径；
11. runtime smoke test；
12. npm test / validate / diff check；
13. canonical DB SHA unchanged；
14. P3R blocked preserved；
15. commit SHA；
16. HEAD == origin/main；
17. true blockers；
18. requires_gpt_decision。

## 验收标准

本轮只有在**用户实际浏览器页面真的显示图片**时才允许 `COMPLETED`。

任何以下情况都不得标记 completed：

- 只证明 SVG 文件存在；
- 只证明 manifest 45/45；
- 只证明 DOM 有 `.atlas-sprite`；
- 只证明 CSS 中有 `background-image`；
- 只生成离线渲染截图；
- 实际 `127.0.0.1:4173` 页面仍为空白图片槽。
