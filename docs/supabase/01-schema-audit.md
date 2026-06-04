# Shared Schema Audit

> 源文件：`pim-system/packages/backend/src/shared/db/schema.ts`
> 审计日期：2026-06-04

---

## 业务表清单

### 1. spus — 原始分拣系统 SPU 数据

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

**主键**: `spu_code`
**唯一约束**: 无（除主键外）
**外键**: 无
**索引**: 无（除主键索引外）

---

### 2. skus — 原始分拣系统 SKU 数据

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

**主键**: `sku_code`
**唯一约束**: 无（除主键外）
**外键**: `spu_code` → `spus.spu_code`
**索引**: `idx_skus_spu_code` ON `spu_code`

---

### 3. products — PIM 处理后的产品主表

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

**主键**: `id`
**唯一约束**: `spu_code`
**外键**: 无
**索引**: 
- `idx_products_spu_code` ON `spu_code`
- `idx_products_status` ON `status`

---

### 4. product_skus — PIM 处理后的 SKU 表

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

**主键**: `id`
**唯一约束**: `sku_code`
**外键**: `spu_code` → `products.spu_code`
**索引**: `idx_product_skus_spu_code` ON `spu_code`

---

### 5. assets — 素材表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | bigint | PK, NOT NULL | 素材ID |
| spu_code | text | NOT NULL, FK → spus.spu_code | 所属SPU |
| sku_code | text | FK → skus.sku_code | 所属SKU |
| asset_type | asset_type_enum | NOT NULL | 素材类型 |
| file_path | text | NOT NULL | 文件路径 |
| machine_name | text | NOT NULL | 机器名称 |
| status | asset_status_enum | NOT NULL, DEFAULT 'pending' | 状态 |
| sort_order | smallint | NOT NULL, DEFAULT 0 | 排序 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 创建时间 |
| published_at | timestamptz | | 发布时间 |

**主键**: `id`
**唯一约束**: 无
**外键**: 
- `spu_code` → `spus.spu_code`
- `sku_code` → `skus.sku_code`
**索引**: 
- `idx_assets_spu_code` ON `spu_code`
- `idx_assets_sku_code` ON `sku_code`
- `idx_assets_machine` ON `machine_name`
- `idx_assets_status` ON `status`

**枚举类型**:
- `asset_type_enum`: `main_image`, `sku_image`, `detail_image`, `video`
- `asset_status_enum`: `pending`, `published`, `failed`, `skipped`

---

### 6. catalogs — 产品图册表

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

**主键**: `id`
**唯一约束**: 无
**外键**: 无
**索引**: 
- `idx_catalogs_status` ON `status`
- `idx_catalogs_created` ON `created_at`

---

### 7. customers — 客户表

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

**主键**: `id`
**唯一约束**: 无
**外键**: 无
**索引**: 
- `idx_customers_status` ON `status`
- `idx_customers_created` ON `created_at`

---

### 8. distributions — 分销表

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

**主键**: `id`
**唯一约束**: 无
**外键**: 
- `customer_id` → `customers.id` (ON DELETE CASCADE)
- `catalog_id` → `catalogs.id` (ON DELETE RESTRICT)
**索引**: 无显式定义（外键自动创建）

---

### 9. distribution_sku_prices — 分销SKU价格表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | 价格ID |
| distribution_id | uuid | NOT NULL, FK → distributions.id (CASCADE) | 分销ID |
| sku_id | uuid | NOT NULL, FK → product_skus.id (CASCADE) | SKU ID |
| spu_code | varchar(100) | NOT NULL | SPU编码 |
| customer_price | numeric(10,2) | | 客户价格 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 创建时间 |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | 更新时间 |

**主键**: `id`
**唯一约束**: `(distribution_id, sku_id)` 联合唯一
**外键**: 
- `distribution_id` → `distributions.id` (ON DELETE CASCADE)
- `sku_id` → `product_skus.id` (ON DELETE CASCADE)
**索引**: 无显式定义（外键自动创建）

---

## 日志表清单（不同步）

### 10. publish_logs — 发布日志表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | bigint | PK, NOT NULL | 日志ID |
| spu_code | text | NOT NULL | SPU编码 |
| asset_id | bigint | FK → assets.id | 素材ID |
| machine_name | text | NOT NULL | 机器名称 |
| shopee_item_id | text | | Shopee商品ID |
| result | text | NOT NULL | 结果 |
| error_message | text | | 错误信息 |
| executed_at | timestamptz | NOT NULL, DEFAULT now() | 执行时间 |

**主键**: `id`
**索引**: 
- `idx_publish_logs_spu_code` ON `spu_code`
- `idx_publish_logs_result` ON `result`

---

### 11. pim_publish_tasks — PIM 发布任务表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | 任务ID |
| platform | varchar(50) | NOT NULL | 平台 |
| product_ids | text[] | NOT NULL | 产品ID数组 |
| status | varchar(20) | NOT NULL, DEFAULT 'pending' | 状态 |
| progress | integer | DEFAULT 0 | 进度 |
| log_lines | jsonb | DEFAULT [] | 日志行 |
| error | text | | 错误信息 |
| operator | varchar(50) | DEFAULT 'XP' | 操作人 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 创建时间 |
| completed_at | timestamptz | | 完成时间 |

**主键**: `id`
**索引**: 
- `idx_pim_publish_tasks_status` ON `status`
- `idx_pim_publish_tasks_created` ON `created_at`

---

### 12. operation_logs — 操作日志表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | 日志ID |
| operator | varchar(50) | NOT NULL, DEFAULT 'XP' | 操作人 |
| spu_code | varchar(100) | | SPU编码 |
| product_id | uuid | | 产品ID |
| action | varchar(100) | NOT NULL | 操作类型 |
| field_name | varchar(100) | | 字段名称 |
| old_value | text | | 旧值 |
| new_value | text | | 新值 |
| level | varchar(20) | NOT NULL, DEFAULT 'info' | 日志级别 |
| message | text | NOT NULL | 消息 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 创建时间 |

**主键**: `id`
**索引**: 
- `idx_operation_logs_spu_code` ON `spu_code`
- `idx_operation_logs_created` ON `created_at`

---

## 汇总

| 表名 | 类型 | 主键 | 外键数 | 唯一约束数 | 索引数 |
|------|------|------|--------|-----------|--------|
| spus | 业务 | spu_code | 0 | 1 | 0 |
| skus | 业务 | sku_code | 1 | 1 | 1 |
| products | 业务 | id | 0 | 2 | 2 |
| product_skus | 业务 | id | 1 | 2 | 1 |
| assets | 业务 | id | 2 | 0 | 4 |
| catalogs | 业务 | id | 0 | 0 | 2 |
| customers | 业务 | id | 0 | 0 | 2 |
| distributions | 业务 | id | 2 | 0 | 0 |
| distribution_sku_prices | 业务 | id | 2 | 1 | 0 |
| publish_logs | 日志 | id | 1 | 0 | 2 |
| pim_publish_tasks | 日志 | id | 0 | 0 | 2 |
| operation_logs | 日志 | id | 0 | 0 | 2 |
