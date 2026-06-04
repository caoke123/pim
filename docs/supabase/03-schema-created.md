# Schema Created Report

> 创建日期：2026-06-04
> 项目：ycwqivjgmzbwthpmalds
> 工具：Supabase MCP `apply_migration`

---

## 创建时间

| 步骤 | 时间 | 状态 |
|------|------|------|
| spus | 2026-06-04 18:51 | ✅ 成功 |
| skus | 2026-06-04 18:51 | ✅ 成功 |
| products | 2026-06-04 18:51 | ✅ 成功 |
| product_skus | 2026-06-04 18:51 | ✅ 成功 |
| catalogs | 2026-06-04 18:51 | ✅ 成功 |
| customers | 2026-06-04 18:51 | ✅ 成功 |
| distributions | 2026-06-04 18:51 | ✅ 成功 |
| distribution_sku_prices | 2026-06-04 18:51 | ✅ 成功 |

---

## 创建表数量

**8 张表**

---

## 表列表

| 表名 | Schema | RLS | 行数 | 状态 |
|------|--------|-----|------|------|
| `spus` | public | ✅ | 0 | 就绪 |
| `skus` | public | ✅ | 0 | 就绪 |
| `products` | public | ✅ | 0 | 就绪 |
| `product_skus` | public | ✅ | 0 | 就绪 |
| `catalogs` | public | ✅ | 0 | 就绪 |
| `customers` | public | ✅ | 0 | 就绪 |
| `distributions` | public | ✅ | 0 | 就绪 |
| `distribution_sku_prices` | public | ✅ | 0 | 就绪 |

---

## 索引列表

| 表 | 索引名 | 字段 | 类型 |
|----|--------|------|------|
| spus | idx_spus_spu_code | spu_code | B-Tree |
| skus | idx_skus_spu_code | spu_code | B-Tree |
| products | idx_products_spu_code | spu_code | B-Tree |
| products | idx_products_status | status | B-Tree |
| product_skus | idx_product_skus_spu_code | spu_code | B-Tree |
| catalogs | idx_catalogs_status | status | B-Tree |
| catalogs | idx_catalogs_created | created_at | B-Tree |
| customers | idx_customers_status | status | B-Tree |
| customers | idx_customers_created | created_at | B-Tree |
| distributions | idx_distributions_customer | customer_id | B-Tree |
| distributions | idx_distributions_catalog | catalog_id | B-Tree |
| distribution_sku_prices | idx_distribution_prices_distribution | distribution_id | B-Tree |
| distribution_sku_prices | idx_distribution_prices_sku | sku_id | B-Tree |

---

## 约束列表

### 主键约束

| 表 | 主键字段 |
|----|---------|
| spus | spu_code |
| skus | sku_code |
| products | id |
| product_skus | id |
| catalogs | id |
| customers | id |
| distributions | id |
| distribution_sku_prices | id |

### 唯一约束

| 表 | 字段 |
|----|------|
| products | spu_code |
| product_skus | sku_code |
| distribution_sku_prices | (distribution_id, sku_id) 联合唯一 |

### 外键约束

| 表 | 字段 | 引用表 | 删除行为 |
|----|------|--------|---------|
| skus | spu_code | spus.spu_code | NO ACTION |
| product_skus | spu_code | products.spu_code | NO ACTION |
| distributions | customer_id | customers.id | CASCADE |
| distributions | catalog_id | catalogs.id | RESTRICT |
| distribution_sku_prices | distribution_id | distributions.id | CASCADE |
| distribution_sku_prices | sku_id | product_skus.id | CASCADE |

### RLS 策略

| 表 | 策略名 | 角色 | 操作 | 条件 |
|----|--------|------|------|------|
| spus | spus_public_read | public | SELECT | true |
| skus | skus_public_read | public | SELECT | true |
| products | products_public_read | public | SELECT | true |
| product_skus | product_skus_public_read | public | SELECT | true |
| catalogs | catalogs_public_read | public | SELECT | true |
| customers | customers_authenticated_read | authenticated | SELECT | true |
| distributions | distributions_authenticated_read | authenticated | SELECT | true |
| distribution_sku_prices | distribution_sku_prices_authenticated_read | authenticated | SELECT | true |

---

## 新增字段

所有表均新增了 `synced_at TIMESTAMPTZ DEFAULT now()` 字段，用于记录数据同步时间。

---

## 异常

**无异常** — 所有表创建成功，无错误。

---

## 风险

| 风险 | 级别 | 说明 |
|------|------|------|
| 外键依赖顺序 | 低 | 已按正确顺序创建表（spus → skus → products → product_skus → catalogs → customers → distributions → distribution_sku_prices） |
| RLS 策略 | 中 | 当前仅配置了 SELECT 策略，后续同步服务需要配置 INSERT/UPDATE 策略 |
| 数据为空 | 低 | 所有表初始为空，需要后续同步数据 |
| 枚举类型 | 低 | `asset_type_enum` 和 `asset_status_enum` 未创建（assets 表未同步） |

---

## 后续步骤建议

### Phase 2: 数据同步服务

1. **建立 Publish Service**
   - 监听 PostgreSQL (Docker) 变更
   - 将业务表数据同步到 Supabase
   - 更新 `synced_at` 字段

2. **配置 RLS 写入策略**
   - 为同步服务配置 INSERT/UPDATE 策略
   - 使用 `service_role` 或专用数据库角色

3. **首次全量同步**
   - 将现有 PostgreSQL 数据全量同步到 Supabase
   - 验证数据完整性

### Phase 3: E-Catalog 切换

1. **更新 E-Catalog 数据源**
   - 从 Supabase 读取产品数据
   - 验证数据一致性

2. **灰度切换**
   - 先切换只读页面
   - 验证无误后全量切换

### Phase 4: 独立站集成

1. **独立站数据源**
   - 使用 Supabase 作为数据源
   - 配置适当的 RLS 策略

---

## 验证结果

通过 `list_tables` MCP 工具验证：

```json
{
  "tables": [
    {"name": "public.spus", "rls_enabled": true, "rows": 0},
    {"name": "public.skus", "rls_enabled": true, "rows": 0},
    {"name": "public.products", "rls_enabled": true, "rows": 0},
    {"name": "public.product_skus", "rls_enabled": true, "rows": 0},
    {"name": "public.catalogs", "rls_enabled": true, "rows": 0},
    {"name": "public.customers", "rls_enabled": true, "rows": 0},
    {"name": "public.distributions", "rls_enabled": true, "rows": 0},
    {"name": "public.distribution_sku_prices", "rls_enabled": true, "rows": 0}
  ]
}
```

**所有 8 张表已创建成功，RLS 均已启用。**