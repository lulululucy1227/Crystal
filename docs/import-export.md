# P1A-R Import / Export

## Safety lifecycle

External rows enter `import_batch` and staging tables first. They cannot directly write canonical material, variant, component, supplier, offer, narrative, assessment, or packaging tables. An explicit review decision is required before controlled promotion.

## CSV and XLSX

- `node scripts/crystal-db.mjs stage-csv path/to/materials.csv` stages CSV rows only; it never promotes them.
- `scripts/stage-xlsx-pilot.py` uses `openpyxl` in read-only mode for the supplied workbook and stages at most ten rows as `review_required`.
- Source workbooks are never edited. `DISPIMG` cells are not material evidence.

## Field boundaries

- Low/mid/high is retained only as a source label for a proposed variant or offer.
- Energy/healing copy is staged as `material_narrative`, not fact, medical efficacy, or preference.
- Europe-market suitability is staged as `market_assessment`, not `market_evidence`.
- Price ranges remain raw until a reviewer confirms unit, currency, MOQ, supplier and target variant/component.

## Field-level audit

Validation is not approval. Use `field_review_decision` for `approved`, `rejected`, or `retained_staged`; use `field_promotion_log` only after a canonical write occurred. A promotion event can reference multiple fields through `field_promotion_source`, so a material variant can retain its exact name/treatment/grade/size provenance without approving the row's price or supplier fields.

P1A-F's reviewed pilot is intentionally partial: identity, variant, narrative and low-confidence market assessment may become canonical; raw 1688 price and supplier fields remain `retained_staged` until a sourcing review supplies a verified supplier, normalized unit, MOQ and quote evidence.

P0 不读取供应商网站或 Excel，不执行外部写入。它只定义后续导入时必须保持的字段边界。

## 导入规则

1. 先导入 `source`，再导入 `material`、`material_variant`、`component`。
2. 来源没有被核实，不得把 `verification_status` 写为 `verified`。
3. 图片分析中的材质默认导入为 `identification_status=uncertain`，除非存在可审计的确认来源。
4. 不规则或孤品材料使用 `reproducibility=one_of_one` 与 `unique_piece_code`；不要伪装成可复购 SKU。
5. 价格导入为整数最小货币单位；原始报价单位和 MOQ 不可丢失。

## 交换方式

- 当前：`export-json` 导出完整可审计快照。
- 后续 CSV/XLSX 导入器：应按 `templates/*.csv` 的列名执行，并保留错误行报告，而不是静默修正。
- 图像：只导入本地相对路径或可访问 URL；不得把大图二进制写入 SQLite。
