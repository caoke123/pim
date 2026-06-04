# Supabase Schema Design

> 设计日期：2026-06-04
> 目标：建立 Supabase 业务镜像库（Business Mirror Database）

---

## 架构原则

| 原则 | 说明 |
|------|------|
| **唯一主库** | PostgreSQL (Docker) = 唯一主库 |
| **镜像库** | Supabase = 业务镜像库 |
| **全量同步** | 业务表全量同步 |
| **日志不同步** | 日志表不同步到 Supabase |
| **结构一致** | 业务表结构与 Shared Schema 保持一致 |
| **新增字段** | 允许新增 `synced_at timestamptz` |
| **禁止删除** | 禁止删除任何业务字段 |

---

## 同步表清单

### ✅ 同步（8张表）

| 表名 | 用途 | 同步原因 |
|------|------|---------|
| `spus` | 原始分拣系统 SPU 数据 | 产品基础数据，E-Catalog 需要 |
| `skus` | 原始分拣系统 SKU 数据 | SKU 基础数据，E-Catalog 需要 |
| `products` | PIM 处理后的产品主表 | 核心产品数据，所有下游系统需要 |
| `product_skus` | PIM 处理后的 SKU 表 | 产品 SKU 数据，E-Catalog/独立站需要 |
| `catalogs` | 产品图册表 | 图册展示，E-Catalog 需要 |
| `customers` | 客户表 | 分销客户，独立站需要 |
| `distributions` | 分销表 | 分销关系，独立站需要 |
| `distribution_sku_prices` | 分销 SKU 价格表 | 客户价格，独立站需要 |

### ❌ 不同步（3张表）

| 表名 | 用途 | 不同步原因 |
|------|------|-----------|
| `operation_logs` | 操作日志表 | 仅 PIM 后台审计使用，无业务价值 |
| `publish_logs` | 发布日志表 | 仅发布系统调试使用，无业务价值 |
| `pim_publish_tasks` | PIM 发布任务表 | 仅 PIM 发布任务管理使用，无业务价值 |

---

## Supabase 表结构设计

### 1. spus

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| spu_code | text | PK, NOT NULL | SPU编码 |
| spu_name | text | NOT NULL | SPU名称 |
| short_title | text | | 短标题 |
| category_code | text | NOT NULL | 类目编码 |
| style_code | text | | 款式编码 |
| outer_pack_length | numeric | | 外箱长度 |
| outer_pack_width | numeric | | 外箱宽度 |
| outer_pack_height | numeric | | 外箱高度 |
| outer_pack_weight | numeric | | 外箱重量 |
| machine_name | text | NOT NULL | 机器名称 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 创建时间 |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | 更新时间 |
| **synced_at** | **timestamptz** | **DEFAULT now()** | **同步时间（新增）** |

---

### 2. skus

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| sku_code | text | PK, NOT NULL | SKU编码 |
| spu_code | text | NOT NULL, FK → spus.spu_code | 所属SPU |
| color_name | text | | 颜色名称 |
| dimensions | text | | 尺寸 |
| weight | numeric | | 重量 |
| cost_price | numeric | | 成本价 |
| selling_price | numeric | | 售价 |
| machine_name | text | NOT NULL | 机器名称 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 创建时间 |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | 更新时间 |
| **synced_at** | **timestamptz** | **DEFAULT now()** | **同步时间（新增）** |

**索引**: `idx_skus_spu_code` ON `spu_code`

---

### 3. products

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | 产品ID |
| spu_code | varchar | NOT NULL, UNIQUE | SPU编码 |
| title | text | NOT NULL | 标题 |
| description | text | | 描述 |
| category | varchar | | 类目 |
| local_path | text | | 本地路径 |
| shopee_title_en | text | | Shopee英文标题 |
| shopee_title_zh | text | | Shopee中文标题 |
| shopee_desc_en | text | | Shopee英文描述 |
| shopee_desc_zh | text | | Shopee中文描述 |
| platforms_json | jsonb | | 平台配置JSON |
| images_json | jsonb | | 图片JSON |
| main_image_url | text | | 主图URL |
| r2_base_path | text | | R2基础路径 |
| r2_synced_at | timestamptz | | R2同步时间 |
| tool_version | varchar | | 工具版本 |
| status | varchar(16) | NOT NULL, DEFAULT 'pending' | 状态 |
| pim_notes | text | | PIM备注 |
| is_deleted | boolean | DEFAULT false | 软删除标记 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 创建时间 |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | 更新时间 |
| **synced_at** | **timestamptz** | **DEFAULT now()** | **同步时间（新增）** |

**索引**: 
- `idx_products_spu_code` ON `spu_code`
- `idx_products_status` ON `status`

---

### 4. product_skus

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | SKU ID |
| spu_code | varchar | NOT NULL, FK → products.spu_code | 所属SPU |
| sku_code | varchar | NOT NULL, UNIQUE | SKU编码 |
| name_zh | varchar | | 中文名称 |
| name_en | varchar | | 英文名称 |
| name_zh_custom | varchar | | 自定义中文名 |
| name_en_custom | varchar | | 自定义英文名 |
| weight_g | numeric | | 重量(克) |
| size_json | jsonb | | 尺寸JSON |
| cost_price | numeric | | 成本价 |
| selling_price | numeric | | 售价 |
| stock | integer | DEFAULT 0 | 库存 |
| image_url | text | | 图片URL |
| sort_order | integer | DEFAULT 0 | 排序 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 创建时间 |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | 更新时间 |
| **synced_at** | **timestamptz** | **DEFAULT now()** | **同步时间（新增）** |

**索引**: `idx_product_skus_spu_code` ON `spu_code`

---

### 5. catalogs

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | 图册ID |
| name | varchar(255) | NOT NULL | 图册名称 |
| description | text | | 描述 |
| cover_image_url | text | | 封面图URL |
| product_ids | uuid[] | NOT NULL, DEFAULT '{}' | 产品ID数组 |
| status | varchar(20) | NOT NULL, DEFAULT 'draft' | 状态 |
| r2_path | text | | R2路径 |
| public_url | text | | 公开URL |
| cover_image_key | text | | 封面图Key |
| view_count | integer | NOT NULL, DEFAULT 0 | 浏览次数 |
| last_viewed_at | timestamptz | | 最后浏览时间 |
| published_at | timestamptz | | 发布时间 |
| operator | varchar(50) | DEFAULT 'XP' | 操作人 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 创建时间 |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | 更新时间 |
| **synced_at** | **timestamptz** | **DEFAULT now()** | **同步时间（新增）** |

**索引**: 
- `idx_catalogs_status` ON `status`
- `idx_catalogs_created` ON `created_at`

---

### 6. customers

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | 客户ID |
| name | varchar(255) | NOT NULL | 客户名称 |
| contact_person | varchar(100) | | 联系人 |
| phone | varchar(50) | | 电话 |
| wechat | varchar(100) | | 微信 |
| notes | text | | 备注 |
| status | varchar(20) | NOT NULL, DEFAULT 'active' | 状态 |
| operator | varchar(50) | DEFAULT 'XP' | 操作人 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 创建时间 |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | 更新时间 |
| **synced_at** | **timestamptz** | **DEFAULT now()** | **同步时间（新增）** |

**索引**: 
- `idx_customers_status` ON `status`
- `idx_customers_created` ON `created_at`

---

### 7. distributions

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | 分销ID |
| customer_id | uuid | NOT NULL, FK → customers.id (CASCADE) | 客户ID |
| catalog_id | uuid | NOT NULL, FK → catalogs.id (RESTRICT) | 图册ID |
| agreement | text | | 协议 |
| status | varchar(20) | NOT NULL, DEFAULT 'active' | 状态 |
| public_url | text | | 公开URL |
| r2_path | text | | R2路径 |
| published_at | timestamptz | | 发布时间 |
| show_customer_name | boolean | NOT NULL, DEFAULT false | 显示客户名称 |
| operator | varchar(50) | DEFAULT 'XP' | 操作人 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 创建时间 |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | 更新时间 |
| **synced_at** | **timestamptz** | **DEFAULT now()** | **同步时间（新增）** |

---

### 8. distribution_sku_prices

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | 价格ID |
| distribution_id | uuid | NOT NULL, FK → distributions.id (CASCADE) | 分销ID |
| sku_id | uuid | NOT NULL, FK → product_skus.id (CASCADE) | SKU ID |
| spu_code | varchar(100) | NOT NULL | SPU编码 |
| customer_price | numeric(10,2) | | 客户价格 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 创建时间 |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | 更新时间 |
| **synced_at** | **timestamptz** | **DEFAULT now()** | **同步时间（新增）** |

**唯一约束**: `(distribution_id, sku_id)` 联合唯一

---

## RLS 策略建议

| 表 | RLS 策略 | 说明 |
|----|---------|------|
| 所有表 | 启用 RLS | Supabase 安全最佳实践 |
| products | 公开读取 | E-Catalog 需要公开访问 |
| product_skus | 公开读取 | E-Catalog 需要公开访问 |
| catalogs | 公开读取 | E-Catalog 需要公开访问 |
| spus/skus | 公开读取 | 基础数据，E-Catalog 需要 |
| customers | 认证读取 | 仅认证用户可访问 |
| distributions | 认证读取 | 仅认证用户可访问 |
| distribution_sku_prices | 认证读取 | 仅认证用户可访问 |

---

## 外键依赖关系

```
spus
  ↓ FK
skus
  ↓ FK (通过 spu_code)
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

**创建顺序建议**:
1. `spus`
2. `skus`
3. `products`
4. `product_skus`
5. `catalogs`
6. `customers`
7. `distributions`
8. `distribution_sku_prices`
