# P2A-0 Image Pipeline Architecture + Open-Source Reuse Audit

**模式：** Read-only architecture audit  
**审计日期：** 2026-08-23  
**范围：** `crystal-design-db` 的 P1C 图像资产、观察、来源与导入边界；未访问 Google Drive、未下载或解析任何真实图片。

## 1. Current-state assessment

当前数据库的资产身份层是正确的起点：`image_asset` 与 `design_reference` 分离，`design_reference_image` 支持多对多、顺序和角色；`(provider, provider_file_id)` 在有 provider ID 时唯一；`image_hash` 已用于硬重复候选而非自动合并。

现状数字：25 条参考（24 条真实用户提供）、66 个 `google_drive` 资产、66 条图片链接。所有资产为 `unresolved`，所有链接角色为 `unknown`；真实推广视觉分析为 0；`design_reference_observation` 仅有 1 条历史记录。它说明“身份已知、内容未解析”，并不表示图片可供视觉分析。

**架构缺口：** 现有 `image_asset` 能保存当前内容元数据，却没有内容版本、分析运行、图片级观察来源、分析版本/模型、或独立人工复核状态。现有 `design_reference_observation` 是 reference 级且类型受限，不能可靠地表达“哪一张图看到了什么”。

## 2. Recommended architecture

推荐 **D：provider-neutral acquisition handoff（C 为核心、A 为当前获取方式）**。

```text
Phone / Drive Inbox / chat upload / local file
        -> provider identity + optional revision metadata
        -> provider-neutral temporary bytes handoff
        -> deterministic resolver (metadata + SHA-256 + candidate pHash)
        -> selective content-addressed cache
        -> image-level observations (assistant / human, separate)
        -> multi-image reference synthesis
        -> canonical design knowledge after the appropriate review
```

当前阶段，ChatGPT 可以在用户已连接的 Drive 范围内协助取得**被选择的**图片并交给中立的 acquisition handoff；Codex 只处理带有 provider 元数据的临时字节，不持有 Drive 凭证。以后如确有必要，可增加本地 Workbench 的 Drive adapter，但该 adapter 必须只实现“取字节”，不能成为数据库或设计知识的第二核心。

## 3. Lightweight stack decision

**YES，推荐下列最轻量组合：**

- **Pillow：** 校验可打开性、格式、宽高、方向处理与有限 EXIF 读取。
- **Python `hashlib.sha256`：** 对完整、可信的原始字节计算内容身份指纹。
- **ImageHash：** 初期仅计算 `pHash`，只生成近似/同参考候选。
- **现有 SQLite：** 唯一 canonical source of truth。
- **ChatGPT Vision：** 产生带模型版本和置信度的观察/推断；不确认材料事实。
- **FiftyOne：** 只借用 Sample / metadata / prediction / human label 的分层思想，不引入运行时或数据库。

Pillow 可安全识别、打开图片，并暴露格式及尺寸；其文档也明确 `Image.open()` 是惰性打开，需在实际处理时处理解码失败和超大图保护。[Pillow documentation](https://pillow.readthedocs.io/_/downloads/en/latest/pdf/)

## 4. Open-source components recommended

| Component | Purpose | Decision | Reuse Type | License | Dependency Cost | Custom Code Avoided | Notes |
|---|---|---|---|---|---|---|---|
| Pillow | MIME/format、尺寸、方向、基本验证、受限 EXIF | USE（P2A-1 后） | Reuse code | MIT-CMU | 1 个 Python 包；当前环境未发现可用 Python 命令，需隔离运行时 | PNG/JPEG/EXIF 自写解析器 | 不存所有 EXIF；保留安全限制与解码失败处理。 |
| Python `hashlib` | SHA-256、流式精确内容指纹 | USE | Reuse code | Python PSF 标准库 | 无额外包 | 自写 hash、字节比较逻辑 | `sha256()` 是标准库稳定能力。 |
| ImageHash | 近重复候选 | USE，初期仅 pHash | Reuse code | BSD-2-Clause | 依赖 Pillow；一个额外包 | 自写感知 hash / 距离逻辑 | 不做自动合并，不上 crop-resistant。 |
| SQLite / `node:sqlite` | canonical entities、候选查询、事务、审计 | KEEP | Existing code | Node.js runtime | 已有 | 第二数据库、ORM | 不把图片 bytes 嵌入 SQLite。 |
| ChatGPT Vision | 语义视觉观察、歧义解释、用户沟通 | USE selectively | Service capability | Service terms | 仅被选中/变更内容触发成本 | 自建 CV 模型/规则系统 | 输出为 observation/prediction，不是 material fact。 |
| FiftyOne concepts | sample / metadata / prediction / label 的边界 | USE CONCEPT ONLY | Reuse concept | Apache-2.0 | 0 | 自创混乱的数据分层 | 不安装 runtime。 |
| Hugging Face Datasets cache/fingerprint concept | “内容 hash + transform version” 缓存失效原则 | Reuse concept | Reuse concept | Apache-2.0 | 0 | 任意缓存 key | 不引入 Arrow/Hub。 |

ImageHash 可序列化 hash 并提供 `pHash` 与 crop-resistant hash；其项目说明也显示 hash 编码曾出现不兼容变更，因此数据库必须同时记录算法与算法/库版本，不能只存一段无上下文文本。[ImageHash](https://github.com/JohannesBuchner/imagehash)  
FiftyOne 的样本、元数据、标签/预测分层值得借鉴，但其本身要求本地文件路径并维护 backing database；这会与本项目 SQLite canonical source 产生双系统风险。[FiftyOne concepts](https://github.com/voxel51/voxel51-docs/blob/main/docs/fiftyone_concepts/basics.md)

## 5. Open-source components rejected/deferred

- **FiftyOne runtime/database：DEFER。** 对 66 个图片、无 CV 模型训练需求的当前阶段过重；安装、媒体路径、标签数据集与 SQLite 并存会制造第二真相源。
- **crop-resistant hash：DEFER。** 它针对裁剪更稳健，却会增加计算、阈值调优和误候选；先积累 pHash 的真实误报/漏报证据。
- **dHash/wHash/colorhash：DEFER。** 没有已证实的差异化需求时，不应同时计算多种 hash。
- **Directus：REJECT。** 可借鉴“文件元数据单独建模”概念，但它是完整 backend/CMS，且当前仓库声明 BSL 1.1 / source-available 条款；既过度，也增加许可证与运行维护判断。[Directus repository](https://github.com/directus/directus)
- **PhotoPrism / Immich：REJECT。** 它们是完整图库/DAM/服务体系，解决的是照片库产品而非本项目的确定性元数据与少量视觉观察；Immich 当前为 AGPL-3.0，额外引入部署和许可证负担。[Immich license](https://github.com/immich-app/immich/blob/main/LICENSE)
- **Hugging Face Datasets runtime：DEFER。** 其“fingerprint + transform cache”很有价值，但 Arrow、缓存与数据集体系超出当前需求。[HF cache concept](https://github.com/huggingface/datasets/blob/main/docs/source/about_cache.mdx)

## 6. License/dependency implications

Pillow 的仓库声明 MIT-CMU，ImageHash 为 BSD-2-Clause，FiftyOne 为 Apache-2.0；它们的许可证本身不是当前阻碍。真正成本是 Python runtime、Pillow/ImageHash 的安全更新，以及以后跨版本 hash 编码的迁移策略。[Pillow license](https://github.com/python-pillow/Pillow/blob/main/LICENSE) [ImageHash license](https://github.com/JohannesBuchner/imagehash) [FiftyOne license](https://github.com/voxel51/fiftyone)

建议把 Python 图像处理限定为一个隔离、可锁定版本的 project-side runtime；不要污染全局 Python，也不要把它加入 Codex 或 Drive 认证链路。此次审计没有安装任何依赖，且当前 shell 未发现可调用的 `python`、`pip`、`uv` 或 ImageMagick 命令。

## 7. Architecture alternatives rejected

| Architecture | 判断 | 原因 |
|---|---|---|
| A. ChatGPT 直接获取 Drive 并将结果写入项目 | 仅作为当前 acquisition handoff 的一段 | 安全且无需 Codex 凭证，但若变成唯一核心会依赖对话环境且可复现性弱。 |
| B. Workbench 直接 Drive OAuth / 缓存 | DEFER | 最终可能需要，但现在有凭证、同步、token、离线、移动端与调试成本；66 张图不值得。 |
| C. provider-neutral adapter | ADOPT AS CORE | 让 Drive、local、chat upload 都变成同一类“字节 + 来源收据”，避免 provider lock-in。 |
| D. C + A 的受控混合 | **RECOMMEND NOW** | 当前最小可用；后续可增加 B adapter 而不改 canonical 模型。 |
| 永久直接 URL / SQLite blob | REJECT | URL 会失效且可能携带凭证；blob 增大数据库、备份和访问控制风险。 |

## 8. Asset lifecycle recommendation

当前 `asset_status` 只有 `available / unresolved / archived`，目前只勉强表达取得/保留状态。不要让这一列同时表达分析是否完成、人是否认可或是否需要复核。

最小的后续概念模型是三条独立维度：

| 维度 | 责任 | 建议状态概念 |
|---|---|---|
| 内容可用性 | provider/获取器 | identity-known-content-unresolved、content-available、unavailable、stale |
| 分析 | 确定性/视觉运行 | not-analyzed、analyzed、failed、outdated |
| 人工复核 | 例外流程 | not-required、review-required、reviewed |

`archived` 更像保留/生命周期决策，不应和内容可用性混在同一状态机。P2A 不必一次实现三张状态表；但后续 schema 应避免继续向 `asset_status` 塞入 `analyzed`、`approved` 等无关语义。

## 9. Provider/acquisition boundary

canonical `image_asset` 永远只保留 provider identity 与经过验证的内容指纹，不保存 OAuth token、cookie、预签名 URL 或本地临时路径。

一次 acquisition handoff 的最小输入是：`provider`、`provider_file_id`、`original_filename`、可选 provider revision/modified timestamp、以及临时 bytes/file。resolver 的输出是确定性元数据、SHA-256、处理结果和错误；若无 bytes，则保持 unresolved，不伪造 metadata。Drive 改名仅更新展示名；Drive ID 不变而 bytes 改变则产生新的**内容版本**并使旧分析过期。

## 10. Cache strategy

推荐 **selective persistent content-addressed cache**：只在资产已被明确获取用于处理/分析后存一份，按 `sha256` 作为目录键，例如概念上的 `cache/images/sha256/ab/<full-hash>`。缓存可保存原始 bytes 或受控的工作副本；派生缩略图可随时重建。

- SQLite 记录内容 hash、版本/取得时间和 provider 修订证据；**不把 cache path 作为 canonical identity**。
- cache 可被清理或移动；命中失败只造成需重新 acquisition，不改变 provider identity。
- 66 张和未来数百张都适合该策略，能避免重复下载、重复 hash 与重复 vision。
- 未解析资产、一次性失败和用户不希望保留的图片不创建持久副本。

## 11. SHA-256 strategy

**USE，且它应是 canonical content metadata。** 仅在完整 bytes 已取得并经基本图片验证后，流式计算 SHA-256；记录算法固定为 `sha256`、digest、计算时刻、与内容版本关联。Python 标准库 `hashlib.sha256()` 支持按块 `update()`，无需另加 hash 包。[Python hashlib](https://docs.python.org/3/library/hashlib.html)

规则：

1. provider ID 是外部对象身份；SHA-256 是当次字节内容身份；两者不得互相替代。
2. SHA 相等 = exact duplicate candidate，可安全复用确定性 metadata/既有 analysis cache，但仍不自动合并 `image_asset` 行或 reference。
3. provider ID 相同、SHA 不同 = 内容已变；保留同一 asset identity，创建/保留内容版本，标记依赖该旧 SHA 的分析 `outdated`，重新分析需显式排队。
4. SHA 不同不表示不同 bracelet；它只是字节不等。

## 12. Perceptual-hash strategy

**USE ImageHash `pHash` only in the first real-image pilot。** 存储：hash 文本、算法名 `phash`、hash size、ImageHash version、内容 SHA、计算版本。比较采用 Hamming distance，但阈值必须在小型真实集合中校准；不得从网络经验硬编码。

输出只能是：`near_duplicate_candidate` 或 `same_reference_candidate`，并附距离与算法版本。不能自动合并资产、reference 或同一手串分组。裁剪、UI 截图、强光宣传图和不同角度的同一手串都可能造成 pHash 误报/漏报；crop-resistant hash 等到真实工作流证明 pHash 的缺口后再引入。

## 13. Deterministic metadata strategy

| Metadata | Decision | 理由 |
|---|---|---|
| MIME / detected format | CANONICAL | 内容可读性、渲染、处理路由所需；以实际字节检测为准。 |
| width / height | CANONICAL | 视觉处理、缩略图和质量筛选所需。 |
| byte size | CANONICAL | 完整性、缓存和异常诊断所需。 |
| SHA-256 | CANONICAL | 精确内容身份与分析 cache key。 |
| provider modified timestamp / revision/etag | CANONICAL IF SUPPLIED | 检测同 provider ID 内容变化；不能伪造。 |
| EXIF orientation | PROCESSING-ONLY | 用于规范化读取；无需持久化所有原始 EXIF。 |
| EXIF camera/GPS/date | NOT NEEDED by default | 隐私与设计知识无直接收益；仅有明确业务理由再采集。 |
| normalized orientation / pixel mode | PROCESSING-ONLY | 便于 hash/vision 一致性，通常无需做业务字段。 |
| pHash | CANONICAL ANALYSIS METADATA | 需算法/版本上下文；不是资产身份。 |
| colorhash / embeddings | DEFER | 尚未存在明确检索需求。 |

## 14. Visual observation model

现有 `design_reference_observation` 已正确保护了 `confirmed_material_variant_id`：只有 `identification_status = confirmed` 才能写 confirmed material。它适合**reference 级综合观察**，但不够表达图像级证据。

后续最小模型应保留四层：

1. **Observed image property：** 如“可见半透明浅蓝圆珠”；对应 `image_asset_id`、观察类型和值、置信度、observer type、analysis version、时间、证据状态。
2. **Inferred interpretation：** 如“外观与海蓝宝相容”；明确标 `inferred` / `assistant_vision`，绝不可写进 confirmed material field。
3. **Reference synthesis：** 多张图一致/互补/冲突后的 reference 级总结，并能列出证据资产集合。
4. **Confirmed fact：** 仅来自 source/supplier/human-approved material claim 或已确认材料变体；与 vision 输出隔离。

建议未来增加通用 `image_asset_observation` 和分析运行记录；reference 级 `design_reference_observation` 保留为综合层，并添加“由哪些图支持”的 junction。不要把视觉模型 JSON 原样当 canonical knowledge；可留运行审计，结构化观察才是可查询知识。

## 15. Promotional visual analysis model

`visual_communication_reference` 的字段本身适合 reference 级传播总结（背景、灯光、crop、道具、景深等），但真实覆盖目前为零，而且每 reference 只有一行。

未来需要把 **product-design observation** 与 **promotional-image observation** 分成不同 domain：同一图可以在两个 domain 都有记录，但前者不应推导摄影语言，后者不应推导材料事实。多张 promotional 图先做图片级观察，再按 reference 汇总进现有 visual communication 结构或其后继 aggregate；不得从仅有的产品图补写广告风格。

## 16. Image ↔ Reference aggregation strategy

`design_reference_image.display_order` 与 `image_role` 是正确基础。流程应为：

1. 为每张图保存独立观察，保留角色、内容 hash、来源与不确定性。
2. 对同 reference 的 observations 分为**一致、互补、冲突、不可比**。
3. overall + detail 通常互补；wrist 更适合尺度/佩戴关系；promotional 图对颜色和透明度可有灯光偏差。
4. 只有多个图片支持时才提高 synthesis confidence；同一图片的重复/重压缩版本不应重复计票。
5. 发生冲突时保留冲突和低置信度，触发 selective human review；绝不“投票式”覆盖。

最终只生成一个 reference synthesis，不把每张图各自的结论误当成独立设计参考。

## 17. Human review boundary

**不需要人工逐项批准：** 宽高、MIME、byte size、SHA-256、基础解码结果、已定义模型输出的普通色彩/构图候选、近重复候选的生成。

**必须人工确认或明确批准：** 材料身份与处理、供应商/来源身份、模糊图片是否为同一手串、reference 是否混入两个产品、模糊配饰材质、跨图冲突的最终 synthesis、原则置信度提升、pattern/theme 的 canonical 提升或合并。

**可保持 assistant observation：** 可见色彩、透明度外观、视觉密度、焦点位置、对称/不对称、五金“可见/疑似”的表象、构图与摄影描述；这些都应可被未来 Workbench 更正而无需先人工签字。

## 18. ChatGPT / Codex / Workbench responsibilities

| Actor | Owns | Must not own |
|---|---|---|
| ChatGPT | 用户交互、连接 Drive 的范围内获取协助、Vision 观察、歧义解释、设计综合建议 | SQLite 直接真相、材料确认、凭证落盘、批量确定性数据写入 |
| Codex | provider-neutral resolver、Pillow metadata、SHA/pHash、缓存策略、事务、校验、候选生成、审计 | 审美最终裁决、未证实材料判断、Drive 凭证管理 |
| Workbench | 浏览图片/参考、显示证据、处理不确定项、人工纠正、检索和未来设计辅助 | 另建平行资产/标签数据库 |
| Human | 高风险确认、分组纠错、原则与 canonical 提升 | 宽高/hash/每个颜色标签的机械审批 |

## 19. Mobile-readiness strategy

现在就把 provider-neutral acquisition contract 固定下来即可保持 mobile-ready：手机上传多个图片到 Drive Inbox，Drive 仅作为一个 provider；以后 inbox scanner 或 handoff 能产生相同 provider receipt。手机不运行本地代码，也不需要现在开发 App。关键是每次上传都带稳定 provider identity、可选修改版本，且图片组/Reference 关系始终在 SQLite 中表达。

## 20. Token/API cost-control strategy

Vision analysis cache 的最小确定键应是：

```text
(sha256_content_hash, observation_schema_version, analysis_profile_version)
```

`analysis_profile_version` 必须封装 prompt 的实质版本、模型/能力版本与所请求的 observation domains；不要将裸 prompt 作为 key。只有以下情况才重跑：bytes 改变、schema/profile 实质升级、人工明确请求重审、或上次失败。文件改名、provider 迁移、同 SHA 的重复上传都不应重新耗费 vision token。HF Datasets 的 fingerprint 将输入与转换组合以复用 cache，是可借用的原则，而非需要引入的框架。[HF cache fingerprint](https://github.com/huggingface/datasets/blob/main/docs/source/about_cache.mdx)

## 21. Failure-mode handling

| Failure | Fail-safe behavior |
|---|---|
| Drive file deleted / temporarily unavailable | 保留 provider identity、最后成功内容版本和分析；availability 标为 unavailable/stale，不删除 canonical knowledge。 |
| Drive rename | 更新显示名/provenance note；不改 asset identity，不重跑 vision。 |
| Provider ID same, bytes changed | 新内容版本、新 SHA；旧分析标 outdated，不静默覆盖。 |
| Exact duplicate uploaded | SHA candidate；复用处理/analysis cache，人工决定是否合并 reference。 |
| Recompressed/resized duplicate | pHash candidate，保留为候选，人工或聚合流程决定。 |
| Crop / UI screenshot | pHash 仅低置信候选；不触发自动关系修改。 |
| One reference groups two bracelets | 保留冲突，review-required；禁止根据 vision 自动拆分 canonical reference。 |
| Vision guesses material | 写 inferred observation，禁止写 confirmed material/claim。 |
| Partial batch failure | 每 asset 独立、幂等事务/运行状态；已完成元数据可提交，失败项可重试。 |
| Crash after deterministic write | 分离 acquisition/content version 和 analysis run；可按 SHA + profile 继续，不重写身份。 |
| Model/prompt changes | 旧结果保留 provenance，按 analysis profile version 标 stale 或选择性重跑。 |
| Local cache stale/missing | 不改变 canonical identity；清除本地 path，按 provider/临时 handoff 重新取得。 |
| Drive unavailable | 队列/延迟重试，视觉工作不以猜测替代 bytes。 |

## 22. OpenViking decision

**DEFER。** OpenViking 可在更后期用于参考、评估、原则和设计笔记的**文本语义检索**；它不处理 image identity、内容 hash、asset acquisition 或 canonical metadata。P2A 的瓶颈是获取可信 bytes 和分层观察，不是文本召回。现在配置它会增加系统面而不能解除 66 张未解析资产的阻塞。

## 23. Potential later schema changes

不创建 migration 007；以下仅为后续最小 schema 草图：

1. `image_asset_content_version`：`image_asset_id`、SHA-256、MIME、width/height、byte size、provider revision/modified metadata（若有）、acquired_at、availability evidence。它解决同 provider ID bytes 变化和可复现性。
2. `image_analysis_run`：content-version、analysis profile/version、状态、开始/结束、错误、模型标识；保证 token cache 和重试可审计。
3. `image_asset_observation`：content-version/asset、domain (`product`/`promotional`)、observation type/value、confidence、observer type、evidence status、analysis run、notes。它只表达所见/推断。
4. `design_reference_observation_image`：把 reference 综合观察连到一张或多张证据资产，并可标 evidence role。它让多图综合可解释。

这四者比把大量 JSON、hash、review 状态塞入 `image_asset` 或 `design_assessment` 更小、更可审计。确认材料仍沿用 `material_claim` / 已确认 variant 的既有边界。

## 24. Minimum P2A implementation sequence

| Stage | Objective | Writes Allowed | Open-source Components | Model | Strength | Acceptance Gate |
|---|---|---|---|---|---|---|
| P2A-1 Asset resolver contract | 定义 provider-neutral handoff、内容版本与 cache 规则；实现前先审批 schema | 后续仅 asset/content metadata、处理审计；不写设计语义 | Pillow, hashlib | Terra | Medium | 没有凭证/URL/path 成为 canonical identity；同输入幂等。 |
| P2A-2 Small real-image pilot | 选择 8–12 张有代表性图片，验证 metadata、SHA、pHash、失败恢复 | 后续仅确定性 metadata、候选；不自动合并、不写材料事实 | Pillow, hashlib, ImageHash pHash | Terra | Medium | 能区分 exact / near candidate / failure，且无 Drive direct auth。 |
| P2A-3 Image observation pilot | 对已解析小样本产生 product 与 promotional 两域的结构化 Vision 观察 | 后续只写 observation run/assistant observation；禁写 confirmed material/原则 | ChatGPT Vision | ChatGPT vision-capable model | Standard | 每条观察可追溯到 SHA、profile、图片；可保留不确定性。 |
| P2A-4 Reference aggregation + selective review | 聚合多图，处理冲突和高风险人工确认 | 后续写 reference synthesis、review decision；禁自动 theme/pattern/principle 提升 | Existing SQLite + Workbench concept | Terra + ChatGPT | High for synthesis | 多图不重复计票；冲突可见；人工只处理异常。 |
| P2A-5 Inbox batch operation | 在前四门槛通过后，扩展到 Drive Inbox/上传批次 | 后续按已批准 contract 写 asset/analysis records | Same stack | Terra | Medium | 批次部分失败可恢复；未变 SHA 不重复消耗 vision。 |

## 25. Estimated custom-code reduction

相较自建图像解析、hash、近似图算法、图库平台和 CV 数据库，建议组合可避免约 **65–80%** 的图片基础设施自定义代码：Pillow 替代格式/EXIF/尺寸处理，`hashlib` 替代安全 hash，ImageHash 替代初期近似 hash，SQLite 保持现有事务与关系层。剩下不可避免的项目特有代码约 **20–35%**：provider-neutral handoff、内容版本/运行审计、观测本体、reference aggregation、人工复核与幂等保护。

该估算是架构判断，不是工时承诺；最大的变量是未来是否需要直接 Drive OAuth、跨设备离线缓存或大规模视觉相似检索。

## 26. Risks / unresolved decisions

- ChatGPT 到临时 bytes handoff 的具体产品机制尚需在实施前确认；架构因此要求 adapter 可替换，而非依赖某一对话功能。
- pHash 阈值必须由项目真实图片校准；不能拿它作为身份判据。
- 隐私/保留期限尚未决定；应在开始持久 cache 前确定 raw bytes 的清除政策。
- “图片是否同一手串”是业务/设计分组判断，不等于视觉近似，应保留人工复核。
- Sunrise 与真实 promotional samples 的数据缺口仍是知识层问题，图像管线本身不能自动补齐。

## 27. Recommended immediate next action

**不要直接接入全部 66 张图。** 先确认 P2A-1 的 provider-neutral handoff 与 content-version/observation 边界，再选 8–12 张覆盖 overall、detail、可能重复、透明冷色、木质/有机、宣传图的代表性小样本做 P2A-2。只有小样本在不访问 Codex Drive 凭证、不自动合并、不混淆视觉与材料事实的情况下通过，才扩大范围。

## NO-WRITE VERIFICATION

- Canonical DB modified: **NO**
- Schema modified: **NO**
- Migration created: **NO**
- Google Drive accessed: **NO**
- Images downloaded: **0**
- Real images hashed: **0**
- Images analyzed: **0**
- OpenViking configured: **NO**
- Dependencies installed: **NO**
- Source Excel modified: **NO**
- Other projects modified: **NO**
- Boundary violations: **NO**

审计开始前数据库 SHA-256：`E098D3E20DE6EC54A918C21F5DACBCD82BC6C365BA29A882DB6DBBDF0F9ABDBC`。完成后必须相同；本阶段仅新增本审计文件及机器可读决策摘要。
