# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1
Phase: P3I-P3K-WORKBENCH-USABILITY-REDESIGN
Status: authorized
Model: Luna
Strength: Medium
Execution class: SAFE_WRITE + READ_ONLY_DB + sidecar user-state writes

## User feedback

The current Workbench is functionally complete but the user cannot understand the interface at a glance. Treat this as a failed usability acceptance, not as a request for more features.

Authoritative UX brief:
- `inputs/p3i-gpt-workbench-usability-redesign-20260830.json`

Current implementation:
- `workbench/index.html`
- `workbench/app.js`
- `workbench/style.css`
- `workbench/server.mjs`
- `outputs/p3-workbench-functional-acceptance.json`

## Hard boundaries

- no schema migration;
- canonical SQLite remains READ ONLY;
- keep existing sidecar draft persistence and exports;
- no supplier research/contact/ranking;
- no purchase/checkout/order;
- no Bridge/watcher work;
- no new framework;
- do not add features merely because they are possible;
- preserve existing functional tests unless UX changes require bounded updates.

This phase is primarily an information-architecture and UI rewrite.

---

# P3I — INFORMATION ARCHITECTURE SIMPLIFICATION

Replace the current seven top-level technical navigation items with four human task areas:

1. `首页`
2. `选品库`
3. `灵感库`
4. `设计台`

`选品库` contains internal tabs for:
- 水晶 / 矿物
- 珍珠 / 天然材质
- 配饰 / 结构件
- 包装

Do not expose Materials / Accessories / Packaging as separate top-level concepts.

All default UI labels must use the human labels in the GPT brief. Raw enum labels must not be visible in normal browsing:
- `minerals_crystals` -> `水晶 / 矿物`
- `pearls_organic` -> `珍珠 / 天然材质`
- `hardware_accessories` -> `配饰 / 结构件`
- `A_CORE` -> `核心常备`
- `B_DESIGN_EXTENSION` -> `设计扩展`
- `C_SIGNATURE_ONE_OF_ONE` -> `Signature / 孤品`
- `RESERVE_NOT_CORE` -> `备用`

Technical canonical/candidate status may remain in an expanded secondary details area but must not dominate.

---

# P3J — HOME / ASSORTMENT / INSPIRATION / DESIGN DESK REWRITE

## 首页

Use Chinese-first copy.

Header:
- title: `水晶设计工作台`
- subtitle: `选材料、找灵感、做设计。`

The first screen should answer “我现在能做什么”, not “数据库里有什么”.

Primary action cards/buttons:
- `开始选品` — 从水晶、天然材质、配饰和包装中挑选。
- `查看灵感` — 查看已经整理的设计参考和主题语言。
- `开始设计` — 建立一个新的手串设计草稿。

Show a compact summary after those actions:
- 核心选品数量
- 设计扩展数量
- Signature / 孤品数量
- 草稿数量 if available

Do NOT show raw database counters such as 33 materials / 73 variants / components / assets as the homepage's main content. If retained at all, place them in a small collapsed `数据状态` secondary section at the bottom.

## 选品库

This is the main working page.

Use category tabs, readable names and compact cards.

Each card should immediately communicate:
- name;
- one short sentence: what it does in design;
- themes;
- preferred forms/spec;
- selection tier;
- obvious primary action `加入设计台`.

Filters:
- 主题
- 层级
- 设计作用
- 形状/规格
- 关键词

Do not require the user to understand canonical/candidate distinction to use the page.

## 灵感库

Rename References -> `灵感库`.

Default card hierarchy:
1. safe image if actually resolvable; otherwise clean visual placeholder;
2. title;
3. one concise design-language summary;
4. theme tags;
5. secondary detail on demand.

Hide raw IDs/reference keys in default view.

## 设计台

Rename Design Board -> `设计台`.

Make empty state instructional:
`还没有材料。去选品库添加，或点击“添加材料”。`

First-view controls should be only:
- 设计名称
- 主题
- 已选材料
- 设计备注
- 保存草稿
- 导出设计单

For each selected item show:
- 名称
- 角色
- 规格/形状
- 上移 / 下移 / 删除

Do not expose supplier, price, canonical IDs or database terminology in the main design workflow.

Preserve existing save/load/export behavior and sidecar storage.

---

# P3K — VISUAL POLISH + REAL USABILITY ACCEPTANCE

Visual direction:
- off-white / light grey surfaces;
- graphite text;
- restrained ice-blue/cyan accent only for selected/active/action states;
- compact cards with less empty whitespace;
- strong hierarchy between page title, action, filter and content;
- Chinese-first typography and labels;
- desktop-first;
- no mystical crystal-shop language;
- no dashboard/spreadsheet appearance;
- no gradient-heavy luxury decoration.

Navigation may be a compact left sidebar or a very clear top navigation. Choose whichever is simpler and more readable in the existing vanilla implementation.

## Acceptance criteria

Programmatically and, if browser automation is locally available, visually verify:

1. Homepage default viewport contains the three primary actions without scrolling.
2. A first-time user can understand the top-level workflows from visible labels: 选品 / 灵感 / 设计.
3. No raw enum labels such as `minerals_crystals`, `pearls_organic`, `A_CORE`, `B_DESIGN_EXTENSION`, `C_SIGNATURE_ONE_OF_ONE` are visible in default UI text.
4. Raw DB counters do not dominate the homepage.
5. From `选品库`, the four categories are accessible as tabs/segmented controls.
6. At least one mineral can be filtered and added to `设计台` without seeing technical identity concepts.
7. `灵感库` shows design-language content rather than bare IDs.
8. `设计台` save/load/reorder/remove/export still works.
9. Existing sidecar safety remains intact.
10. Canonical DB SHA unchanged before/after workbench tests.
11. focused workbench tests PASS.
12. full `npm test` PASS.
13. `npm run validate` PASS.
14. `git diff --check` PASS.
15. Commit/push main, HEAD == origin/main, worktree clean.

## Delivery

Create/update:
- `outputs/p3k-workbench-usability-acceptance.json`
- `outputs/GPT_HANDOFF.json`
- `outputs/handoffs/P3I-P3K-WORKBENCH-USABILITY-REDESIGN.json`

Include one explicit checklist mapping every screenshot complaint in the GPT UX brief to the final implementation.

Stop only when the workbench is both functionally intact and understandable without database knowledge.
