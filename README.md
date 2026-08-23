# Crystal Design & Sourcing Database — P0

本项目是高端天然矿物饰品的内部资料库。P0 只建立数据架构，不设计成品、不联网、不采购。

## 设计边界

- SQLite 本地数据库；图片只保存路径或外部链接，不嵌入二进制。
- 材料、材料变体、可用组件严格分离。
- 用户偏好证据与助手的独立设计判断严格分离。
- 产品设计分析与宣传视觉分析严格分离。
- 不确定的图片观察不能关联为已确认的材料变体。

## 快速开始

需要 Node.js 24+（使用内置 `node:sqlite`，无 npm 依赖）。在本目录运行：

```powershell
node scripts/crystal-db.mjs init
node scripts/crystal-db.mjs validate
node --test test/p0.test.mjs
```

数据库创建在 `data/crystal-design.sqlite`，该文件已被 `.gitignore` 忽略。

## 常用命令

```powershell
# 初始化 schema、参考枚举与示例记录；可重复运行
node scripts/crystal-db.mjs init

# 只验证既有数据库
node scripts/crystal-db.mjs validate

# 输出未来集成可用的 JSON 交换快照
node scripts/crystal-db.mjs export-json data/export.json
```

## 文件结构

- `migrations/001_initial.sql`：P0 schema、约束、触发器与索引。
- `scripts/crystal-db.mjs`：迁移、seed、验证与 JSON 导出入口。
- `docs/schema.md`：实体、关系与建模理由。
- `docs/import-export.md`：未来 CSV/XLSX 导入导出边界。
- `templates/`：CSV 字段模板，不含真实采购数据。
- `test/p0.test.mjs`：基础架构与边界测试。

## P0 已知限制

- 不包含网页抓取、供应商 API、图像识别、推荐算法、认证或云端部署。
- CSV/XLSX 目前只定义稳定字段契约与 JSON 导出；实际导入器属于下一阶段。
- 金额均保存为整数最小货币单位（例如 EUR cents），以避免浮点误差。
