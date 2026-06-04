# Cloud Mirror Schema Audit V1

> 文档版本：V1
> 创建日期：2026-06-04
> 状态：Draft — 待评审
> 审计范围：Drizzle ORM Schema (Shared + Legacy)

---

## 1. Shared Schema 审计

> 源文件：`pim-system/packages/backend/src/shared/db/schema.ts`

### 表清单

| 表名 | 主键 | 外键数 | 唯一索引数 | 字段数 | 说明 |
|------|------|--------|-----------|--------|------|
| `spus` | spu_code (text) | 0 | 1 | 12 | 原始分拣系统 SPU 数据 |
| `skus` | sku_code (text) | 1 → spus.spu_code | 1 | 10 | 原始分拣系统 SKU 数据 |
| `products` | id (uuid) | 0 | 2 (spu_code + id) | 21 | PIM 处理后的产品主表 |
| `product_skus` | id (uuid) | 1 → products.spu_code | 2 (sku_code + id) | 16 | PIM 处理后的 SKU 表 |
| `assets` | id (bigint) | 2 → spus.spu_code, skus.sku_code | 1 | 10 | 素材表 |
| `publish_logs` | id (bigint) | 1 → assets.id | 1 | 8 | 发布日志表 |
| `pim_publish_tasks` | id (uuid) | 0 | 1 | 11 | PIM 发布任务表 |
| `operation_logs` | id (uuid) | 0 | 1 | 11 | 操作日志表 |
| `catalogs` | id (uuid) | 0 | 2 | 15 | 产品图册表 |
| `customers` | id (uuid) | 0 | 2 | 10 | 客户表 |
| `distributions` | id (uuid) | 2 → customers.id, catalogs.id | 1 | 13 | 分销表 |
| `distribution_sku_prices` | id (uuid) | 2 → distributions.id, product_skus.id | 2 (联合唯一 + id) | 7 | 分销 SKU 价格表 |

**总计：12 张表**

### 外键依赖关系

```
spus
  ↓ FK (spu_code)
skus
  ↓ FK (spu_code)
products
  ↓ FK (spu_code)
product_skus
  ↓ FK (sku_id)
distribution_sku_prices
  ↑ FK (distribution_id)
distributions
  ↑ FK (customer_id)    ↑ FK (catalog_id)
customers              catalogs
```

### 索引清单

| 表 | 索引名 | 字段 | 类型 |
|----|--------|------|------|
| skus | idx_skus_spu_code | spu_code | B-Tree |
| products | idx_products_spu_code | spu_code | B-Tree |
| products | idx_products_status | status | B-Tree |
| product_skus | idx_product_skus_spu_code | spu_code | B-Tree |
| assets | idx_assets_spu_code | spu_code | B-Tree |
| assets | idx_assets_sku_code | sku_code | B-Tree |
| assets | idx_assets_machine | machine_name | B-Tree |
| assets | idx_assets_status | status | B-Tree |
| publish_logs | idx_publish_logs_spu_code | spu_code | B-Tree |
| publish_logs | idx_publish_logs_result | result | B-Tree |
| pim_publish_tasks | idx_pim_publish_tasks_status | status | B-Tree |
| pim_publish_tasks | idx_pim_publish_tasks_created | created_at | B-Tree |
| operation_logs | idx_operation_logs_spu_code | spu_code | B-Tree |
| operation_logs | idx_operation_logs_created | created_at | B-Tree |
| catalogs | idx_catalogs_status | status | B-Tree |
| catalogs | idx_catalogs_created | created_at | B-Tree |
| customers | idx_customers_status | status | B-Tree |
| customers | idx_customers_created | created_at | B-Tree |

---

## 2. Legacy Schema 审计

> 源文件：`pim-system/packages/backend/src/db/schema.ts`

### 表清单

| 表名 | 主键 | 外键数 | 唯一索引数 | 字段数 | 说明 |
|------|------|--------|-----------|--------|------|
| `products` | id (uuid) | 0 | 2 (product_no + id) | 17 | 旧版产品主表 |
| `product_skus` | id (uuid) | 1 → products.id | 1 | 15 | 旧版 SKU 表 |
| `product_platforms` | id (uuid) | 1 → products.id | 2 (联合唯一 + id) | 11 | 平台配置表 |
| `sync_logs` | id (uuid) | 0 | 1 | 11 | 同步日志表 |
| `export_records` | id (uuid) | 0 | 1 | 7 | 导出记录表 |
| `distributors` | id (uuid) | 0 | 2 (api_token + id) | 10 | 分销商表 |

**总计：6 张表**

### 外键依赖关系

```
products
  ↓ FK (product_id)
product_skus
  ↓ FK (product_id)
product_platforms
```

---

## 3. Schema Diff — 冲突分析

### products 表差异

| 字段名 | Shared Schema | Legacy Schema | 是否兼容 | 说明 |
|--------|--------------|---------------|---------|------|
| id | uuid | uuid | ✅ | 相同 |
| spu_code | varchar (unique) | ❌ 不存在 | ❌ | Shared 独有 |
| product_no | ❌ 不存在 | varchar(32) (unique) | ❌ | Legacy 独有 |
| title | text | varchar(200) | ⚠️ | 类型不同 |
| short_title | ❌ 不存在 | varchar(50) | ❌ | Legacy 独有 |
| category | varchar | varchar(20) | ⚠️ | Shared 无长度限制 |
| description | text | text | ✅ | 相同 |
| local_path | text | ❌ 不存在 | ❌ | Shared 独有 |
| folder_name | ❌ 不存在 | varchar(300) | ❌ | Legacy 独有 |
| r2_base_path | text | varchar(500) | ⚠️ | 类型不同 |
| r2_base_url | ❌ 不存在 | varchar(500) | ❌ | Legacy 独有 |
| r2_synced_at | timestamptz | timestamptz | ✅ | 相同 |
| pim_synced_at | ❌ 不存在 | timestamptz | ❌ | Legacy 独有 |
| main_image_url | text | varchar(500) | ⚠️ | 类型不同 |
| images_json | jsonb | jsonb | ✅ | 相同 |
| outer_packaging_json | ❌ 不存在 | jsonb | ❌ | Legacy 独有 |
| platforms_json | jsonb | ❌ 不存在 | ❌ | Shared 独有 |
| shopee_title_en | text | ❌ 不存在 | ❌ | Shared 独有 |
| shopee_title_zh | text | ❌ 不存在 | ❌ | Shared 独有 |
| shopee_desc_en | text | ❌ 不存在 | ❌ | Shared 独有 |
| shopee_desc_zh | text | ❌ 不存在 | ❌ | Shared 独有 |
| tool_version | varchar | varchar(20) | ⚠️ | Shared 无长度限制 |
| status | varchar(16) DEFAULT 'pending' | varchar(16) DEFAULT 'pending' | ✅ | 相同 |
| pim_notes | text | ❌ 不存在 | ❌ | Shared 独有 |
| is_deleted | boolean DEFAULT false | ❌ 不存在 | ❌ | Shared 独有 |
| created_at | timestamptz | timestamptz | ✅ | 相同 |
| updated_at | timestamptz | timestamptz | ✅ | 相同 |

**差异统计**:
- ✅ 完全相同：7 字段
- ⚠️ 类型不同：4 字段
- ❌ 仅 Shared 有：11 字段
- ❌ 仅 Legacy 有：6 字段

### product_skus 表差异

| 字段名 | Shared Schema | Legacy Schema | 是否兼容 | 说明 |
|--------|--------------|---------------|---------|------|
| id | uuid | uuid | ✅ | 相同 |
| spu_code | varchar (FK → products.spu_code) | ❌ 不存在 | ❌ | Shared 独有 |
| product_id | ❌ 不存在 | uuid (FK → products.id) | ❌ | Legacy 独有 |
| sku_code | varchar (unique) | varchar(32) | ⚠️ | Shared 无长度限制 |
| name_zh | varchar | ❌ 不存在 | ❌ | Shared 独有 |
| name_en | varchar | ❌ 不存在 | ❌ | Shared 独有 |
| name_zh_custom | varchar | ❌ 不存在 | ❌ | Shared 独有 |
| name_en_custom | varchar | ❌ 不存在 | ❌ | Shared 独有 |
| sku_name | ❌ 不存在 | varchar(100) | ❌ | Legacy 独有 |
| weight_g | numeric | integer | ⚠️ | 类型不同 |
| size_json | jsonb | ❌ 不存在 | ❌ | Shared 独有 |
| size | ❌ 不存在 | varchar(100) | ❌ | Legacy 独有 |
| cost_price | numeric | decimal(10,2) | ⚠️ | 类型不同 |
| selling_price | numeric | decimal(10,2) | ⚠️ | 类型不同 |
| stock | integer DEFAULT 0 | integer DEFAULT 0 | ✅ | 相同 |
| image_url | text | varchar(500) | ⚠️ | 类型不同 |
| original_image | ❌ 不存在 | varchar(200) | ❌ | Legacy 独有 |
| barcode | ❌ 不存在 | varchar(50) | ❌ | Legacy 独有 |
| sort_order | integer DEFAULT 0 | integer DEFAULT 0 | ✅ | 相同 |
| created_at | timestamptz | timestamptz | ✅ | 相同 |
| updated_at | timestamptz | timestamptz | ✅ | 相同 |

**差异统计**:
- ✅ 完全相同：4 字段
- ⚠️ 类型不同：5 字段
- ❌ 仅 Shared 有：7 字段
- ❌ 仅 Legacy 有：5 字段

---

## 4. Table Usage Matrix — 代码引用审计

### Shared Schema 引用

| 表 | Read | Write | 模块/服务 | 引用文件 |
|----|------|-------|----------|---------|
| `spus` | ✅ | ✅ | products, publish | repositories/products.repository.ts, shared/types/db.ts |
| `skus` | ✅ | ✅ | products, publish | repositories/product-skus.repository.ts, shared/types/db.ts |
| `products` | ✅ | ✅ | products, catalogs, distributions, publish | repositories/products.repository.ts, modules/catalogs/catalogs.service.ts, modules/distributions/distributions.service.ts |
| `product_skus` | ✅ | ✅ | products, distributions | repositories/product-skus.repository.ts, modules/distributions/distributions.service.ts |
| `assets` | ✅ | ✅ | publish | services/operation-log.service.ts (间接) |
| `publish_logs` | ✅ | ✅ | publish | modules/publish/publish.routes.ts |
| `pim_publish_tasks` | ✅ | ✅ | publish | repositories/publish-tasks.repository.ts |
| `operation_logs` | ✅ | ✅ | logs | modules/logs/logs.routes.ts, services/operation-log.service.ts |
| `catalogs` | ✅ | ✅ | catalogs, distributions, share | modules/catalogs/catalogs.service.ts, modules/distributions/distributions.service.ts, modules/share/share.service.ts |
| `customers` | ✅ | ✅ | distributions | modules/distributions/customers.service.ts |
| `distributions` | ✅ | ✅ | distributions | modules/distributions/distributions.service.ts |
| `distribution_sku_prices` | ✅ | ✅ | distributions | modules/distributions/distributions.service.ts |

### Legacy Schema 引用

| 表 | Read | Write | 模块/服务 | 引用文件 |
|----|------|-------|----------|---------|
| `products` | ✅ | ✅ | routes/products, services/sync, services/export, routes/distributor-api | routes/products.ts, services/sync.ts, services/export/base.ts, routes/distributor-api.ts |
| `product_skus` | ✅ | ✅ | routes/products, services/sync, services/export, routes/distributor-api | routes/products.ts, services/sync.ts, services/export/base.ts, routes/distributor-api.ts |
| `product_platforms` | ✅ | ✅ | routes/products, services/export | routes/products.ts, services/export/base.ts |
| `sync_logs` | ✅ | ✅ | routes/sync, services/sync | routes/sync.ts, services/sync.ts |
| `export_records` | ✅ | ✅ | routes/exports | routes/exports.ts |
| `distributors` | ✅ | ✅ | routes/distributors, routes/distributor-api, services/distributor, middleware/distributor-auth | routes/distributors.ts, routes/distributor-api.ts, services/distributor/pricing.ts, middleware/distributor-auth.ts |

### 引用分析

| 模块 | 使用 Schema | 说明 |
|------|------------|------|
| modules/products/ | ❌ 未直接引用 | 使用 Repository 模式 |
| modules/catalogs/ | ✅ Shared | 新 PIM 功能 |
| modules/distributions/ | ✅ Shared | 新 PIM 功能 |
| modules/publish/ | ✅ Shared | 新 PIM 功能 |
| modules/logs/ | ✅ Shared | 新 PIM 功能 |
| modules/share/ | ✅ Shared | 新 PIM 功能 |
| routes/products.ts | ✅ Legacy | 旧版 API |
| routes/sync.ts | ✅ Legacy | 旧版同步 |
| routes/exports.ts | ✅ Legacy | 旧版导出 |
| routes/distributors.ts | ✅ Legacy | 旧版分销商 |
| routes/distributor-api.ts | ✅ Legacy | 旧版分销 API |
| services/sync.ts | ✅ Legacy | 旧版同步服务 |
| services/export/ | ✅ Legacy | 旧版导出服务 |
| services/distributor/ | ✅ Legacy | 旧版分销服务 |
| repositories/ | ✅ Shared | 新 Repository 层 |

---

## 5. Sync Candidates — 同步候选表分类

### 必须同步

| 表名 | 理由 |
|------|------|
| `spus` | 产品基础数据，E-Catalog/独立站需要 |
| `skus` | SKU 基础数据，E-Catalog/独立站需要 |
| `products` | 核心产品数据，所有下游系统需要 |
| `product_skus` | 产品 SKU 数据，E-Catalog/独立站需要 |
| `catalogs` | 图册展示，E-Catalog 需要 |
| `customers` | 分销客户，独立站需要 |
| `distributions` | 分销关系，独立站需要 |
| `distribution_sku_prices` | 客户价格，独立站需要 |

### 建议同步

| 表名 | 理由 |
|------|------|
| `assets` | 素材数据，E-Catalog 可能需要 |
| `pim_publish_tasks` | 发布任务状态，可能需要云端可见 |

### 不同步

| 表名 | 理由 |
|------|------|
| `operation_logs` | 仅系统运行审计使用，无业务价值 |
| `publish_logs` | 仅发布调试使用，无业务价值 |
| `sync_logs` | 仅同步服务内部使用，无业务价值 |

### 待评估

| 表名 | 理由 |
|------|------|
| `export_records` | 导出记录是否需要云端备份？ |
| `distributors` | 是否与 `customers` 重复？需要确认业务关系 |

---

## 6. Cloud Mirror 推荐同步范围

### Business Tables (8 张)

| 表名 | 优先级 | 说明 |
|------|--------|------|
| `spus` | P0 | 产品基础数据 |
| `skus` | P0 | SKU 基础数据 |
| `products` | P0 | 产品主表 |
| `product_skus` | P0 | 产品 SKU 表 |
| `catalogs` | P1 | 图册数据 |
| `customers` | P1 | 客户数据 |
| `distributions` | P1 | 分销关系 |
| `distribution_sku_prices` | P1 | 分销价格 |

### System Tables (不同步)

| 表名 | 说明 |
|------|------|
| `operation_logs` | 操作日志 |
| `publish_logs` | 发布日志 |
| `sync_logs` | 同步日志 |

### Optional Tables (待评估)

| 表名 | 说明 |
|------|------|
| `assets` | 素材数据 |
| `pim_publish_tasks` | 发布任务 |
| `export_records` | 导出记录 |
| `distributors` | 分销商 |

---

## 7. Supabase Creation Order

### 建库顺序（考虑外键依赖）

| 顺序 | 表名 | 依赖 | 说明 |
|------|------|------|------|
| 1 | `spus` | 无 | 基础表，无外键依赖 |
| 2 | `skus` | spus.spu_code | 依赖 spus |
| 3 | `products` | 无 | 基础表，无外键依赖 |
| 4 | `product_skus` | products.spu_code | 依赖 products |
| 5 | `catalogs` | 无 | 基础表，无外键依赖 |
| 6 | `customers` | 无 | 基础表，无外键依赖 |
| 7 | `distributions` | customers.id, catalogs.id | 依赖 customers + catalogs |
| 8 | `distribution_sku_prices` | distributions.id, product_skus.id | 依赖 distributions + product_skus |

### 数据导入顺序

与建库顺序一致，确保外键约束不会失败。

---

## 8. 风险分析

### Legacy 残留风险

| 风险 | 等级 | 说明 |
|------|------|------|
| Legacy routes 仍被注册 | 🔴 高 | routes/products.ts, routes/sync.ts 等仍被挂载到 Express 应用 |
| Legacy services 仍在使用 | 🔴 高 | services/sync.ts, services/export/ 等仍被引用 |
| Legacy distributors 仍在使用 | 🟡 中 | routes/distributor-api.ts, middleware/distributor-auth.ts 仍在使用 |
| 数据可能写入 Legacy 表 | 🔴 高 | 如果 Legacy routes 被调用，数据会写入旧表而非 Shared 表 |

### 双 Schema 风险

| 风险 | 等级 | 说明 |
|------|------|------|
| 数据不一致 | 🔴 高 | 同一业务实体可能存在于两个不同结构的表中 |
| 维护成本高 | 🟠 中高 | 需要同时维护两套 Schema 和对应的业务逻辑 |
| 开发者困惑 | 🟡 中 | 新开发者可能不清楚应该使用哪个 Schema |
| 迁移困难 | 🟠 中高 | 未来需要迁移 Legacy 数据到 Shared Schema |

### 数据来源风险

| 风险 | 等级 | 说明 |
|------|------|------|
| Shared products 数据来源不明 | 🔴 高 | 未发现直接创建方法，可能依赖外部同步 |
| Legacy → Shared 同步链路缺失 | 🔴 高 | 未发现从 Legacy 同步到 Shared 的逻辑 |
| 产品创建流程不完整 | 🔴 高 | 前端创建产品可能无法写入 Shared 表 |

### 外键风险

| 风险 | 等级 | 说明 |
|------|------|------|
| Shared products.spu_code → 无 | 🟡 中 | Shared products 的 spu_code 没有外键约束到 spus 表 |
| Legacy product_skus.productId → products.id | 🟡 中 | Legacy 使用 UUID 外键，Shared 使用 spu_code 外键 |
| 外键依赖顺序 | 🟢 低 | 建库顺序已正确规划 |

### 同步一致性风险

| 风险 | 等级 | 说明 |
|------|------|------|
| Schema 不一致导致同步失败 | 🔴 高 | Shared 和 Legacy 结构不同，同步逻辑需要处理差异 |
| 数据类型不兼容 | 🟠 中高 | varchar vs text, numeric vs decimal 等差异 |
| 字段缺失导致数据丢失 | 🟠 中高 | Legacy 有而 Shared 没有的字段可能丢失 |
| 同步延迟 | 🟡 中 | Event Driven 同步可能有短暂延迟 |

---

## 9. 结论与建议

### 当前状态

| 项目 | 状态 |
|------|------|
| Shared Schema | ✅ 完整，12 张表 |
| Legacy Schema | ⚠️ 仍在使用，6 张表 |
| 代码引用 | ⚠️ 两套 Schema 同时被引用 |
| 数据来源 | ❌ Shared products 数据来源不明 |

### 建议

| 优先级 | 建议 | 说明 |
|--------|------|------|
| P0 | 确认 Shared products 数据来源 | 必须明确数据写入路径 |
| P0 | 废弃 Legacy routes | 停止使用旧版 API |
| P1 | 迁移 Legacy 数据到 Shared | 确保数据完整性 |
| P1 | 统一代码引用 | 所有模块使用 Shared Schema |
| P2 | 删除 Legacy Schema 代码 | 减少维护成本 |

### Cloud Mirror 建库依据

基于 Shared Schema 创建 Supabase Replica，保持 100% 结构一致。

**禁止**:
- 基于 Legacy Schema 创建
- 混合两套 Schema
- 精简业务字段

**允许**:
- 新增 `synced_at` 字段
- 新增同步状态辅助表
