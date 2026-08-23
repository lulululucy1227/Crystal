# P1C Consolidation Audit

**审计范围：** P1C aesthetic/design knowledge layer（只读）  
**审计快照：** 2026-08-23  
**分析单位：** 一条 `design_reference`；“真实”指 `record_status = real`，不代表市场、欧洲消费者或商业验证。  
**证据边界：** `preference_evidence` 是用户明确表达；`design_assessment` 是助手判断；`design_pattern` 是可复用描述；`design_principle` 是项目层假设。四者不得互相替代。

## 1. Overall P1C status

**结论：PASS WITH CLEANUP。** 数据库已从“零散灵感”进入“可审计的参考知识层”：24 条真实参考均有来源、用户偏好和图片资产链接，且 R1 历史回填与 R2C 近期参考形成了两个来源批次。它尚未收敛为可直接驱动推荐或市场决策的稳定设计智能。

最强证据是跨批次重复的 `Framed Mineral`（6 条真实参考，R1=4、R2C=2）和 `Hero Mineral`（4，R1=3、R2C=1）。最大的限制是 66/66 图片资产仍为 `unresolved`、全部图片角色为 `unknown`、真实参考没有推广视觉分析；另有 15/24 真实参考未关联主题。

## 2. Reference inventory

| 指标 | 数量 | 说明 |
|---|---:|---|
| 设计参考总数 | 25 | 含 1 条 P0 synthetic |
| 真实参考 | 24 | 全部 `user_supplied`，并非市场验证 |
| synthetic/demo/test | 1 | `REF-000001`，P0 sample record |
| 历史回填 R1 | 15 | `REF-000002`–`REF-000016` |
| 近期 R2C | 9 | `REF-000017`–`REF-000025` |
| 有图片资产链接的真实参考 | 24 | 每条至少 1 个链接 |
| 无图片资产链接的真实参考 | 0 | 但资产尚不可用 |
| 有用户偏好的真实参考 | 24 | 一条/参考 |
| 有助手评估的真实参考 | 23 | 缺 `REF-000004` |
| 有结构化模式的真实参考 | 21 | 缺 `REF-000002`、`REF-000010`、`REF-000014` |
| 有结构化主题的真实参考 | 9 | 其余 15 条未归主题 |
| 有推广视觉分析的真实参考 | 0 | P0 synthetic 有 1 条，不能外推 |

**不完整参考：** `REF-000004` 缺 assessment；`REF-000002`、`REF-000010`、`REF-000014` 缺结构化 pattern；15 条真实参考缺 theme；全部真实参考缺 promotional visual analysis。

## 3. Pattern frequency table

下表的“支持”只判断用户原话是否直接或近似指向该模式；不能因为参考同时有偏好证据就称模式被用户验证。

| Pattern | 总/真实 | R1/R2C | Themes | 用户明确支持 | 结论 |
|---|---:|---:|---|---|---|
| Framed Mineral | 6/6 | 4/2 | Glacier, Starlight, Forest, Mountain | 间接：银饰、配饰语言、冷银框定 | A |
| Hero Mineral | 4/4 | 3/1 | Forest, Mountain | 部分：矿物品质第一、唯一高档水晶 | A |
| Controlled Maximalism | 2/2 | 1/1 | Forest, Mountain | 直接：极繁/复杂但好看 | B |
| Focal Assembly | 2/2 | 2/0 | — | 间接：异形石与银饰组合 | B |
| Geological Composition | 2/2 | 2/0 | — | 间接：天然唯一纹理/石头与水晶 | B |
| Asymmetric Balance | 1/1 | 0/1 | Mountain | 直接：自由舒展、很稳 | C |
| Atmospheric Spacing | 1/1 | 0/1 | — | 直接：清冷疏离、寂静呼吸感 | C |
| Designed Simplicity | 1/1 | 0/1 | — | 直接：设计/构成重于材料复杂 | C |
| Geometric Vocabulary | 1/1 | 1/0 | — | 间接 | C |
| Impressionist Palette | 1/1 | 0/1 | — | 直接：像 Monet | C |
| Ink Landscape Mineral | 1/1 | 0/1 | Mountain | 直接：像水墨画 | C |
| Micro Accent | 1/1 | 1/0 | — | 直接：少量小配饰抬高审美 | C |
| Monumental Mineral | 1/1 | 0/1 | Ocean | 直接：大珠、依赖矿物品质 | C |
| Narrative Focal Object | 1/1 | 1/0 | — | 间接：高价男性内容叙事 | C |
| Orbital Structure | 1/1 | 1/0 | Glacier, Starlight | 间接 | C |
| Palette Composition | 1/1 | 0/1 | — | 直接：普通材料也可由构成成立 | C |
| Secondary Line | 1/1 | 1/0 | — | 无直接表达 | C |
| Serial Mineral Windows | 1/1 | 0/1 | Glacier, Starlight | 间接：冷银、未来、安静 | C |
| Shape as Focal | 1/1 | 1/0 | — | 间接 | C |
| Transparent Structural Element | 1/1 | 1/0 | Glacier, Ocean | 直接：透明、低饱和冷蓝 | C |
| Wood as Structural Texture | 1/1 | 1/0 | Forest | 直接：沉香隔片与深色矿物 | C |
| Micro-cluster Transition / Mineral Architecture / Off-center Focal Composition / Rhythm Interruption / Shadow Anchor | 0/0 | 0/0 | — | 无 | E |

分类：A = REPEATED / STABLE CANDIDATE；B = EMERGING；C = SINGLE-CASE；E = LOW-VALUE / TOO GENERIC 或目前无链接。没有自动合并或删除。

## 4. Pattern stability classification

**A — repeated/stable candidate：** `Framed Mineral`、`Hero Mineral`。前者跨 R1/R2C 与四个主题出现，后者跨两批出现；两者仍只证明当前样本内重复，**不证明品牌规则或市场偏好**。

**B — emerging：** `Controlled Maximalism`、`Focal Assembly`、`Geological Composition`。前者跨批次但样本只有 2；后两者只有 R1，需 R2C 或未来样本复现。

**C — single-case：** 其余 16 个已关联模式。它们更适合作为主题、材料或叙事的“可检索方向”，不宜提升为原则。

**D — possible duplicate/semantic overlap：** 见下一节。  
**E — low-value/too generic：** 5 个零链接 seed pattern；目前没有实证价值，保留但不用于推荐权重。

## 5. Semantic overlap / duplicate candidates

| 组别 | 相似处 | 关键区别 | 保留风险 / 合并风险 | 建议 |
|---|---|---|---|---|
| Framed Mineral / Serial Mineral Windows | 都由金属或结构把矿物呈现为焦点 | 前者是单一焦点的受控框定；后者是重复窗口、铰接/节奏 | 保留会词汇变多；合并会失去“重复结构” | PARENT/CHILD CONCEPT |
| Framed Mineral / Orbital Structure | 均以结构围绕矿物 | Orbital 指环绕/轨道关系，不等于框定 | 合并会抹去空间构图 | KEEP DISTINCT，需更多案例 |
| Controlled Maximalism / Curated Organic Maximalism / Secondary Line | 都处理复杂度与节奏 | 前者是层级控制；Curated Organic 是自然形态取向；Secondary Line 是局部节奏工具 | 把工具与总体风格合并会失真 | KEEP DISTINCT；Curated Organic 仍仅 notes，需更多证据 |
| Asymmetric Balance / Anchored Asymmetry | 都是“不对称但稳定” | 后者是前者的更具体运行条件 | 双存会造成标签重复；直接合并会丢掉“锚定”约束 | PARENT/CHILD CONCEPT；现阶段维持 Asymmetric Balance，记录候选语义 |
| Hero Mineral / Monumental Mineral | 都提高矿物质量在价值中的权重 | Hero 是视觉层级；Monumental 是尺度与质量暴露 | 合并会混淆焦点和尺寸 | KEEP DISTINCT |
| Painterly Mineral / Ink Landscape Mineral / Impressionist Palette | 均使用自然图像或画意 | Painterly 是多色内含；Ink 是单色雾感/空间；Impressionist 是多材料色盘 | 过早合并会丢失三种不同视觉语法 | KEEP DISTINCT；Painterly 尚未成为当前结构化模式，需更多证据 |
| Transparent Structural Element / Atmospheric Spacing | 都可产生轻、冷、疏离 | 前者是材料/部件角色；后者是整体信息密度结果 | 合并会把手段和感受混为一谈 | KEEP DISTINCT |
| Designed Simplicity / Micro Accent / Focal Assembly | 都以少量元素达成完成度 | 分别是总体克制、点睛、焦点组合 | 合并会降低日后检索精度 | KEEP DISTINCT |

## 6. User preference frequency

以下为对 24 条真实 `preference_evidence.statement` 的人工聚类；同一参考可支持多个维度，因此总数不会相加为 24。

| 偏好维度 | 支持参考数 | 可追溯表达（节选） | 强度 |
|---|---:|---|---|
| 矿物品质、天然唯一性或高档主石 | 6 | “矿物本身是第一参考标准”“天然唯一性孤品”“唯一高档水晶” | 重复 |
| 配饰/银饰作为设计语言 | 5 | “配饰语言非常重要”“少量小配饰”“没有配饰…下降很多” | 重复 |
| 构成、设计关系重于材料堆叠 | 4 | “极繁主义，但就是好看”“普通晶体 + designer composition”“设计…更重要” | 重复 |
| 冷、银、未来、寂静 | 3 | “银色高冷、寂静”“cold silver, futuristic, quiet” | 重复但集中在 Glacier/Starlight |
| 透明、低饱和冷蓝 | 1 | “清爽、干净的蓝色…透明感” | 孤立 |
| 自然深绿/山林 | 2 | “自然、深绿、山林”“深色自然矿物” | 新兴 |
| 木/沉香与矿物的反差 | 2 | “沉香隔片”“agarwood, mixed-material use” | 新兴 |
| 不对称且稳定 | 1 | “自由舒展，很稳” | 孤立 |
| 画意/水墨/Monet 色盘 | 2 | “很像水墨画”“像 Monet” | 新兴、两种不同画意 |
| 轻量日常通勤 | 1 | “小清新、日常通勤” | 孤立 |
| 大珠与质量依赖 | 1 | “Large beads, strongly dependent on mineral quality” | 孤立 |
| 呼吸感/清冷疏离 | 1 | “清冷疏离｜寂静呼吸感｜灰色雾梦” | 孤立 |

## 7. Preference contradictions / coexistence

| 表面矛盾 | 判断 | 解释 |
|---|---|---|
| 极简/安静 vs 极繁 | product-line-dependent | 共同底层是“受控层级”；远观安静与近看丰富可并存，但不能把每件都做成极繁。 |
| 高矿物品质 vs 普通材料由构成成立 | stable dual strategy | 是两条产品策略：矿物承担价值，或构成承担价值；不是同一 SKU 的强制要求。 |
| 冷银/疏离 vs 沉香/温暖有机 | theme-dependent | Glacier/Starlight 倾向前者，Forest/Impressionist 方向可用后者作为暖哑锚点。 |
| 大珠纪念性 vs 轻量通勤 | product-line-dependent | 分别是 statement 与 daily 线，不能用一个尺度标准裁决。 |
| 配饰语言强 vs 几乎无配饰 | situational | 当矿物纹理/材质组合已承担叙事，可减配；当需要高级结构感，五金成为核心。 |

没有证据支持“一个全局风格必须压过所有策略”。更稳妥的核心不是单一外观，而是**为不同策略明确视觉层级与材料角色**。

## 8. Design principle audit

### Quiet Complexity

| 字段 | 当前值 / 审计判断 |
|---|---|
| 状态 / 置信度 | `candidate` / `low` |
| 作者类型 | `assistant_synthesis`，不是用户明示 |
| 可见支撑参考 | 3 条较直接：`REF-000013`（受控极繁）、`REF-000017`（结构性复杂而非装饰）、`REF-000025`（低信息密度的呼吸感）；另有 `REF-000018` 的清晰层级作辅助 |
| 相关模式 | Controlled Maximalism、Framed Mineral、Serial Mineral Windows、Atmospheric Spacing；数据库没有 principle-to-pattern 的结构化关系 |
| 用户偏好支撑 | `REF-000013`“极繁主义，但就是好看”；`REF-000017` 冷、未来、安静；`REF-000025` 寂静呼吸感 |
| 反例 / 边界 | `REF-000021`、`REF-000023` 说明“设计价值”不一定等于丰富细节；`REF-000022` 是矿物质量主导。 |
| 建议 | **维持 low，不升高。** 目前支持“可用的项目假设”，未达到跨主题、跨产品策略稳定原则的证据门槛。 |

## 9. Candidate principles

只列出 assessment 中实际出现的候选；并不创建原则。

| 候选 | 现有支撑 | 审计判断 |
|---|---|---|
| Scale Exposes Quality | `REF-000022` 明示 | 单例，保留为 assessment note |
| Designed Silence | `REF-000025` 明示 | 单例，保留为 assessment note |
| Material Contrast | `REF-000024` 明示冷热、光哑、矿物/有机对比；`REF-000005` 木作为压舱 | 新兴，尚不足以原则化 |
| Composition Carries the Material | `REF-000021` 明示 | 单例，属于 design-led 策略，不是全局原则 |
| Material Carries the Composition | `REF-000007`、`REF-000020`、`REF-000022` 评估支持 | 新兴对偶策略，需结构化比对样本 |
| Natural Image as Narrative | `REF-000015`、`REF-000020`、`REF-000018` | 新兴，但命名未结构化 |
| Hardware as Design Vocabulary | `REF-000008`、`REF-000012`、`REF-000016` | 证据较强，仍应先补跨主题样本 |
| Asymmetry Requires Anchoring | `REF-000019` 明示 | 单例；适合留作 Asymmetric Balance 的子规则候选 |

## 10. Theme-by-theme design language

| Theme | 真实参考 | 可见语言 | 最强模式 | 缺口 |
|---|---:|---|---|---|
| Mountain | 4（2 strong/2 moderate） | 深绿、低饱和自然矿物；自由不对称；水墨、雾感、地质内部图像 | Asymmetric Balance、Ink Landscape Mineral；次级 Framed Mineral/Controlled Maximalism | 五金语言、色阶/材质字段与更多强关联样本 |
| Ocean | 2（均 strong） | 一端为清爽透明冷蓝；一端为“深海潜行”的大型质量型矿物 | Transparent Structural Element、Monumental Mineral | 两端之间尚无桥接语言；五金与情绪词不足 |
| Forest | 3（均 strong） | 深绿、自然矿物、男性密度；沉香/木的暖哑反差；可容纳受控有机复杂 | Wood as Structural Texture、Controlled Maximalism；次级 Framed/Hero Mineral | 女性或轻量 Forest 方向、结构金属规则 |
| Sunrise | 0 | 无数据库支持 | 无 | 是六主题中唯一完全空白；不得以推测填补 |
| Starlight | 2（1 strong/1 moderate） | 冷银、未来、寂静、灰黑/透明矿物、重复几何 | Framed Mineral、Orbital Structure、Serial Mineral Windows | 与 Glacier 的明确区隔、星体/光点语汇仍缺 |
| Glacier | 3（均 strong） | 低饱和冷蓝、透明、冷银、未来与静谧 | Framed Mineral、Transparent Structural Element、Orbital/Serial | 资产内容未解析，无法验证色材字段；与 Ocean/Starlight 边界仍薄 |

## 11. Theme differentiation risks

| Theme pair | 当前重叠 | 区分变量 | 风险与所需语言 |
|---|---|---|---|
| Glacier vs Starlight | 冷银、透明、未来、Framed Mineral | Glacier 应以冰、水汽、冷蓝/半透明为主；Starlight 应以轨道、暗场、点状光/重复几何为主 | **高风险**：现有 2 条 Starlight 均同时关联 Glacier。需要独立 Starlight 样本。 |
| Ocean vs Glacier | 透明、冷蓝、透明结构 | Ocean 可用深度、流动、深海尺度；Glacier 用静止、霜雾、切面/留白 | **中高风险**：`REF-000004` 同时关联二者。需要各自专属色阶与结构词。 |
| Mountain vs Forest | 自然、深绿、矿物、低饱和 | Mountain 是地质/山水/锚定不对称；Forest 是木质、有机密度、生命力 | **中风险**：`REF-000002` 与 `REF-000018` 同时关联。需要材料角色而非仅颜色区分。 |

## 12. Material-value vs design-value matrix

这是依据 `design_assessment` 的概念性定位，不是价格、商业等级或材料事实。

| 设计构成依赖 \ 材料价值依赖 | Low | Medium | High |
|---|---|---|---|
| **High** | `REF-000021` Palette Composition | `REF-000023` Designed Simplicity；`REF-000024` Impressionist Palette | `REF-000016` 高价值主石 + 结构银饰；`REF-000018` 受控有机复杂 |
| **Medium** | `REF-000010` 轻量通勤（评估有限） | `REF-000008` Focal Assembly；`REF-000013` Controlled Maximalism；`REF-000017` Serial Mineral Windows | `REF-000015` 天然孤品纹理；`REF-000020` Ink Landscape Mineral |
| **Low** | — | — | `REF-000007` Mineral Quality First；`REF-000022` Monumental Mineral |

矩阵表明至少存在两条有效策略：**矿物承担叙事/价值** 与 **构成承担完成度/价值**。它们不可用同一选材或定价逻辑简单替换。

## 13. Core Design DNA candidates

| 候选 DNA | 支撑 | 置信度 | 风险 / 反例 |
|---|---|---|---|
| 矿物是明确主角，结构应服务于其可见性 | Framed Mineral 6 条；Hero Mineral 4 条；偏好中的“矿物品质第一/唯一高档主石” | 中 | `REF-000021`、`REF-000023` 说明设计关系也可主导，不应绝对化。 |
| 受控层级而非无规则堆叠 | `REF-000013`、`REF-000017`、`REF-000018`；Quiet Complexity 候选 | 中低 | 仅少数明确案例；不可当作已验证品牌法则。 |
| 五金/配饰可构成设计语法，而非填充物 | `REF-000008`、`REF-000012`、`REF-000016`；5 条相关用户表达 | 中 | `REF-000011`、`REF-000015` 表明自然材质本体亦可独立成立。 |
| 天然差异应被识别为叙事资产 | `REF-000015`、`REF-000020`、`REF-000018` | 中低 | 仍需更多跨主题与可复现设计样本。 |
| 冷静、低饱和、留白是重要但非全局的视觉支线 | Glacier/Starlight 参考与 `REF-000025` | 中低 | Forest 与 Impressionist Palette 引入温暖、有机与更丰富色彩。 |

## 14. Non-core but valuable directions

- **Ocean 的 Monumental Mineral：** statement-piece、矿物质量门槛高，不宜成为普遍方案。
- **Palette Composition / Designed Simplicity：** 适合 design-led、可及性更高的线；其价值逻辑不同于高品质主石线。
- **Wood as Structural Texture：** Forest 或混材方向的主题专属能力，避免泛化到冷银主题。
- **Ink Landscape Mineral / Impressionist Palette：** 都具有强叙事与视觉记忆，但各仅单例，应作为实验/主题胶囊方向。
- **Atmospheric Spacing：** 更接近静态视觉/情绪方向，未证明适用于所有产品结构。

## 15. Promotional visual language status

**INSUFFICIENT DATA。** 只有 1 条 `visual_communication_reference`，且连接 P0 synthetic `REF-000001`；其 notes 为“restrained shadow and generous negative space”。真实参考为 0 条推广分析，因此不能从图片资产、用户偏好或产品结构反推背景、灯光、构图、景深或 luxury/editorial 语言。

## 16. Data quality gaps

| 问题 | 证据 | 风险 |
|---|---:|---|
| 未解析图片资产 | 66/66 `unresolved`；66 无 hash、66 无 external locator | 无法做可验证的视觉分析、重复图识别或语义检索 |
| 图片角色未知 | 66/66 `unknown` | 无法区分 overall/detail/on-wrist/promotional |
| 缺 assessment | 1/24 真实参考 | `REF-000004` 的 Ocean/Glacier 解读不完整 |
| 缺 pattern | 3/24 真实参考 | 影响模式频率与可检索性 |
| 缺 theme | 15/24 真实参考 | 主题语言结论偏向少数已映射参考 |
| 缺真实推广视觉分析 | 24/24 | 不能建立视觉传播规范 |
| 候选仅在 notes | Curated Organic Maximalism、Anchored Asymmetry、Scale Exposes Quality、Designed Silence、Material Contrast、Composition Carries the Material 等 | 它们可被阅读但不可稳定统计/检索 |
| legacy 与结构化关系可能分离 | `REF-000001` legacy `Framed Mineral`/`Ocean` 未形成 relation；多条概念词保留在 `reusable_patterns` | 搜索者可能得到冲突或重复语义 |
| 零链接模式 | 5/26 | 稀释模式目录、造成虚假可用性 |
| 原则支持不足 | Quiet Complexity 未连接到结构化证据 | 误升格为项目规则的风险 |
| 物料层污染 | 本次只读检查未发现本审计造成物料/供应商/市场写入；其既有表行数未被用作美学证据 | 防止把设计判断误当采购结论 |

## 17. Cleanup recommendations

以下均为后续建议，**本审计没有执行**：

1. 先完成资产可用性与角色补全：下载/定位、hash、mime/尺寸、`overall/detail/on_wrist/promotional`。这是 P2 视觉工作流的硬前置。
2. 对 15 条无主题参考做人工“关联/不关联”决策；不得为了填满六主题而强行贴标，尤其不能虚构 Sunrise。
3. 补 `REF-000004` 的 assessment，并为 3 条无 pattern 的真实参考判断“应有模式”还是“故意无模式”。
4. 将 notes 中**已被采纳**的候选术语与“仅讨论术语”分开；不要自动把它们建成 pattern 或 principle。
5. 复审 5 个零链接模式：保留为未来词汇表、标记待证，或在人工批准后归档；本报告不删除。
6. 只在新增跨批次、跨主题案例后复审 `Quiet Complexity` 置信度与 parent/child 本体关系。
7. 为真实参考建立独立推广视觉分析样本；在此之前，禁止声称已形成品牌摄影语言。

## 18. P1C exit readiness

**结果：PASS WITH CLEANUP。**

| 后续能力 | 就绪度 | 原因 |
|---|---|---|
| P2 图片资产接入流程 | 条件性可开始 | 外部资产身份已建立，但 66 个资产未解析；应先完成可访问性与元数据。 |
| 未来视觉分析 | 未就绪 | 图片内容、角色与真实推广视觉结构不足。 |
| 语义搜索 | 部分就绪 | 参考、偏好、评估、模式与主题已有文本；但 notes 候选、主题缺口和资产未解析会降低可信度。 |
| 推荐/设计辅助 | 仅探索性就绪 | 可给出“候选方向”，不能输出为市场或品牌确定性结论。 |

P1C 可以关闭为“有条件通过的知识基础层”，但不应把重复频率升级成商业验证，也不应跳过资产/主题/传播结构的清理直接进入高置信推荐。

## 19. Recommended next phase

建议下一阶段定义为 **P2A — Image Asset Resolution & Human Visual Annotation**，顺序为：先可访问性和元数据，再图片角色，再受控视觉观察，最后才考虑语义检索或设计建议。首批应有意补齐：Sunrise、独立 Starlight、Ocean 深浅两端之间的样本，以及每个官方主题至少一条真实推广视觉参考。

## Open-source-first review

已考察的轻量路径：

- **SQLite 原生 SQL（采用）：** 当前项目已经用 Node `node:sqlite` 访问 SQLite；聚合、`GROUP BY` 与窗口函数足以做本审计的频率、来源和覆盖率分层。SQLite 官方文档确认其原生支持窗口函数，因此无需引入图数据库或统计框架。
- **sqlite-utils（未采用）：** 可作为命令行只读查询/检查工具，但会引入额外依赖和另一条执行路径；对 25 条参考、26 个模式的当前规模没有净收益。
- **图数据库/图分析框架（未采用）：** 当前关系数量很小，且主要问题是缺失/未解析证据而非图算法；引入框架会增加不可逆维护成本，不能解决资产内容与人工标注缺口。

## NO WRITE VERIFICATION

- Canonical records modified: **0**
- Schema changes: **NO**
- Migration created: **NO**
- Material/supplier/market writes: **0**
- OpenViking touched: **NO**
- Google Drive accessed: **NO**
- Other projects modified: **NO**
- Boundary violations: **NO**

审计开始前数据库 SHA-256：`E098D3E20DE6EC54A918C21F5DACBCD82BC6C365BA29A882DB6DBBDF0F9ABDBC`。完成后应与该哈希一致；本阶段唯一允许新增的是本报告及其机器可读摘要。
