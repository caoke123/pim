# PIM 后端重构 — 第三阶段交付物

> 执行日期: 2026-05-29
> 阶段目标: 核心产品库 API 开发
> 依赖: 第二阶段基础层 (schema / enums / types / repositories)

---

# 1. 新建文件清单

| 文件 | 行数 | 说明 |
|------|------|------|
| `shared/utils/response.ts` | ~65 | 统一响应格式: `{success, data, message, requestId, timestamp}` |
| `shared/utils/request-id.ts` | ~10 | RequestId 中间件，每个请求生成 UUID |
| `shared/utils/index.ts` | ~5 | 工具统一导出 |
| `services/operation-log.service.ts` | ~75 | 操作日志服务 (结构化 console + 预留 DB 写入器接口) |
| `modules/products/index.ts` | ~5 | 产品模块统一导出 |
| `modules/products/products.dto.ts` | ~140 | 产品 DTO / Response 类型 (列表项/详情/请求) |
| `modules/products/products.service.ts` | ~290 | 产品业务逻辑 (聚合/计算/日志) |
| `modules/products/products.routes.ts` | ~140 | 产品路由 (4 个端点) |

**更新文件**:

| 文件 | 变更 |
|------|------|
| `src/index.ts` | 添加 RequestId 中间件 + 注册 V3 产品路由 |

---

# 2. API 端点清单

| 方法 | 路径 | 功能 |
|------|------|------|
| `GET` | `/api/v1/products` | 产品列表 (分页/搜索/筛选/排序/聚合) |
| `GET` | `/api/v1/products/:id` | 产品详情 (含 SKU/图片/平台) |
| `PATCH` | `/api/v1/products/:id/basic` | 编辑产品基础信息 |
| `PATCH` | `/api/v1/products/:id/skus` | 批量编辑 SKU |

---

# 3. 统一响应格式

所有接口返回:

```json
{
  "success": true,
  "data": { ... },
  "message": "ok",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-05-29T10:30:00.000Z"
}
```

错误响应:

```json
{
  "success": false,
  "data": null,
  "message": "产品不存在",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-05-29T10:30:00.000Z"
}
```

分页响应 data 结构:

```json
{
  "items": [...],
  "total": 186,
  "page": 1,
  "pageSize": 20,
  "totalPages": 10
}
```

---

# 4. 接口文档

## 4.1 GET /api/v1/products — 产品列表

### 查询参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | `number` | `1` | 页码 |
| `pageSize` | `number` | `20` | 每页条数 (max 100) |
| `keyword` | `string` | — | 搜索 title / spuCode |
| `status` | `string` | — | 状态筛选: `pending` / `ready` / `active` / `archived` |
| `platform` | `string` | — | 平台筛选: `shopee` / `temu` / `miaoshou` |
| `sortBy` | `string` | `createdAt` | 排序字段: `createdAt` / `updatedAt` / `title` / `spuCode` |
| `order` | `string` | `desc` | 排序方向: `asc` / `desc` |

### 响应示例

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-...",
        "spuCode": "2605-0017",
        "title": "可爱粉色小熊毛绒钥匙扣 包包挂件 两款可选",
        "category": "包包挂件",
        "mainImageUrl": null,
        "status": "ready",
        "skuCount": 3,
        "minPrice": 25.00,
        "maxPrice": 35.00,
        "platformStatus": {
          "shopee": {
            "status": "draft",
            "title": "Cute Pink Teddy Bear Keychain..."
          }
        },
        "problemFlags": {
          "missingMainImage": true,
          "missingPrice": false,
          "missingDescription": false,
          "missingCategory": false,
          "missingSkuImage": false,
          "hasNullSpuCode": false
        },
        "createdAt": "2026-05-20T08:00:00.000Z",
        "updatedAt": "2026-05-28T14:00:00.000Z"
      }
    ],
    "total": 4,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  },
  "message": "ok",
  "requestId": "550e8400-...",
  "timestamp": "2026-05-29T10:30:00.000Z"
}
```

### 聚合字段说明

| 字段 | 计算方式 | 来源 |
|------|---------|------|
| `skuCount` | `COUNT(product_skus WHERE spu_code = :spuCode)` | Repository 批量统计 |
| `minPrice` | `MIN(product_skus.selling_price WHERE price > 0)` | 内存计算 |
| `maxPrice` | `MAX(product_skus.selling_price WHERE price > 0)` | 内存计算 |
| `platformStatus` | 解析 `products.platforms_json` JSONB | 直接读取 |
| `problemFlags` | 业务规则计算 | Service 层计算 |

### problemFlags 规则

| 标记 | 触发条件 |
|------|---------|
| `missingMainImage` | `main_image_url IS NULL` |
| `missingPrice` | 所有 SKU 的 `selling_price` 为 NULL 或 0 |
| `missingDescription` | `description IS NULL` 或空字符串 |
| `missingCategory` | `category IS NULL` |
| `missingSkuImage` | 存在 SKU 但某些 SKU 的 `image_url IS NULL` |
| `hasNullSpuCode` | `spu_code IS NULL` |

### platform 筛选实现

`platforms_json` 是 JSONB 列，实时解析:
- 无 `platform` 参数: 返回所有产品
- 有 `platform` 参数 (如 `?platform=shopee`): 过滤出 `platforms_json.shopee` 存在的产品
- 同时按该平台状态排序: `live` > `pending` > `idle` > `error`

---

## 4.2 GET /api/v1/products/:id — 产品详情

### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string (UUID)` | 产品 UUID |

### 响应示例

```json
{
  "success": true,
  "data": {
    "id": "550e8400-...",
    "spuCode": "2605-0017",
    "title": "可爱粉色小熊毛绒钥匙扣 包包挂件 两款可选",
    "category": "包包挂件",
    "description": null,
    "mainImageUrl": null,
    "status": "ready",
    "images": {
      "main": [
        { "url": "", "fileName": "主_1.png", "index": 0 }
      ],
      "detail": [
        { "url": "", "fileName": "详情_1.png", "index": 0 }
      ],
      "sku": []
    },
    "outerPackaging": null,
    "skus": [
      {
        "id": "uuid...",
        "skuCode": "BG-MX-0002",
        "nameZh": "活力橙简约款",
        "nameEn": "Orange Simple Charm",
        "nameZhCustom": null,
        "nameEnCustom": null,
        "weightG": 80,
        "size": { "unit": "cm", "length": 8, "width": 8, "height": 12 },
        "costPrice": 0,
        "sellingPrice": 35,
        "stock": 100,
        "imageUrl": null,
        "sortOrder": 0
      }
    ],
    "platforms": [
      {
        "platform": "shopee",
        "title": "Cute Pink Teddy Bear Keychain...",
        "status": "draft",
        "category": ["女包", "包包配件", "吊饰"],
        "attributes": { "brand": "NoBrand", "origin": "中国大陆", ... },
        "description": "[PRODUCT NAME]\n...",
        "publishedAt": null,
        "itemId": null
      }
    ],
    "problemFlags": { ... },
    "shopeeTitleEn": "Cute Pink Teddy Bear Keychain...",
    "shopeeTitleZh": null,
    "shopeeDescEn": "...",
    "shopeeDescZh": null,
    "createdAt": "2026-05-20T08:00:00.000Z",
    "updatedAt": "2026-05-28T14:00:00.000Z"
  },
  "message": "ok",
  "requestId": "...",
  "timestamp": "..."
}
```

### 图片转换逻辑

`images_json` JSONB → 前端可用格式:

```
images.main[]   → images.main[]   (r2Url || localPath)
images.detail[] → images.detail[] (r2Url || localPath)
images.sku[]    → images.sku[]    (r2Url || localPath, 当前为空)
```

> URL 降级策略: `r2Url` 优先, 为空时降级到 `localPath` (本地文件路径，前端不可直接显示)

### 平台信息提取

`platforms_json` JSONB → `platforms[]`:

```typescript
Object.entries(platforms_json).map(([platform, config]) => ({
  platform,           // "shopee" | "temu" | "miaoshou"
  title: config.title,
  status: config.status,
  category: config.category,
  attributes: config.attributes,
  description: config.description,
  publishedAt: config.publishedAt,
  itemId: config.shopeeItemId,
}))
```

---

## 4.3 PATCH /api/v1/products/:id/basic — 编辑基础信息

### 请求体

```json
{
  "title": "新标题",
  "category": "手链",
  "description": "新描述",
  "status": "active",
  "shopeeTitleEn": "New English Title",
  "shopeeTitleZh": "新中文标题",
  "shopeeDescEn": "New English Description",
  "shopeeDescZh": "新中文描述",
  "pimNotes": "运营备注"
}
```

> 所有字段可选，只更新传入的非 undefined 字段

### 字段白名单

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | `string` | 产品标题 |
| `category` | `string` | 类目 |
| `description` | `string` | 描述 |
| `status` | `ProductStatus` | 状态: pending/ready/active/archived |
| `shopeeTitleEn` | `string` | Shopee 英文标题 |
| `shopeeTitleZh` | `string` | Shopee 中文标题 |
| `shopeeDescEn` | `string` | Shopee 英文描述 |
| `shopeeDescZh` | `string` | Shopee 中文描述 |
| `pimNotes` | `string` | PIM 运营备注 |

### 校验规则

- `status` 必须为有效枚举值, 否则返回 400
- 请求体中至少包含一个有效字段, 否则返回 400
- 不变的字段不触发更新和日志

### 响应

```json
{
  "success": true,
  "data": { /* 更新后的完整 ProductRow */ },
  "message": "更新成功",
  "requestId": "...",
  "timestamp": "..."
}
```

### 自动操作日志

更新成功时自动写入:

```
[OperationLog] SUCCESS | product.update_basic | admin | 2605-0017 | 更新产品基础信息: title, status
{"title":{"old":"旧标题","new":"新标题"},"status":{"old":"ready","new":"active"}}
```

---

## 4.4 PATCH /api/v1/products/:id/skus — 批量编辑 SKU

### 请求体

```json
{
  "skus": [
    {
      "skuId": "uuid-of-sku",
      "sellingPrice": 39.00,
      "costPrice": 22.00,
      "stock": 150,
      "weightG": 85,
      "size": "8x8x12",
      "nameZhCustom": "自定义中文名",
      "nameEnCustom": "Custom English Name"
    }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `skuId` | `string (UUID)` | SKU ID (必填) |
| `sellingPrice` | `number` | 售价 |
| `costPrice` | `number` | 成本价 |
| `stock` | `number` | 库存 |
| `weightG` | `number` | 重量(g) |
| `size` | `string` | 尺寸 (会覆盖 size_json) |
| `nameZhCustom` | `string` | 自定义中文名 |
| `nameEnCustom` | `string` | 自定义英文名 |

### 校验规则

- 最多 50 个 SKU 一批
- 每个 SKU 验证归属 (是否属于该产品)
- 不属于的 SKU 记录到 `failed` 列表

### 响应

```json
{
  "success": true,
  "data": {
    "updated": 3,
    "failed": [
      { "skuId": "uuid", "reason": "SKU 不属于该产品或不存在" }
    ]
  },
  "message": "成功更新 3 个 SKU, 失败 1 个",
  "requestId": "...",
  "timestamp": "..."
}
```

---

# 5. Service 层聚合逻辑详情

## ProductsService 方法清单

| 方法 | 功能 | 使用 Repository |
|------|------|----------------|
| `getProductList` | 列表查询 + 聚合 | `productsRepository.findMany` + `productSkusRepository.countMapBySpuCodes` + 逐产品 `findBySpuCode` |
| `getProductDetail` | 详情查询 | `productsRepository.findById` + `productSkusRepository.findBySpuCode` |
| `updateBasic` | 编辑基础信息 | `productsRepository.findById` + `productsRepository.update` |
| `updateSkus` | 批量编辑 SKU | `productsRepository.findById` + `productSkusRepository.findByProductAndId` + `productSkusRepository.update` |

## 数据流

```
Request
  → Route (参数校验)
    → Service (业务逻辑 + 聚合)
      → Repository (纯数据库访问, 每次一个职责)
      → OperationLog (自动记录)
    → Response (统一格式)
```

---

# 6. OperationLog 机制

**文件**: `services/operation-log.service.ts`

当前阶段 → console 结构化输出, 格式:

```
[OperationLog] {LEVEL} | {action} | {operator} | {spuCode} | {message} {changes_json}
```

预留 `registerLogWriter()` 接口, 待 `operation_logs` 表创建后可无缝切换为 DB 写入。

---

# 7. 架构分层验证

| 层 | 职责 | 禁止 |
|----|------|------|
| **Routes** (`products.routes.ts`) | 参数解析 + 输入校验 + 响应格式化 | ❌ SQL / 聚合 / 业务逻辑 |
| **Service** (`products.service.ts`) | 业务逻辑 + 聚合计算 + 日志触发 | ❌ 直接 SQL |
| **Repository** (`repositories/`) | 纯数据库访问 | ❌ 业务逻辑 |
| **DTO** (`products.dto.ts`) | 类型定义, 不含实现 | — |
| **OperationLog** | 操作记录 (console→DB) | — |

---

# 8. TypeScript 编译验证

```
$ npx tsc --noEmit
(零错误)
```

---

# 第三阶段完成确认

| 交付物 | 状态 |
|--------|------|
| 1. 产品列表 API (分页/搜索/筛选/排序/聚合) | ✅ |
| 2. 产品详情 API (含 SKU/图片/平台) | ✅ |
| 3. 产品编辑 API (基础信息 + SKU) | ✅ |
| 4. DTO/Response 类型文件 | ✅ |
| 5. Service 层聚合逻辑 | ✅ |
| 6. Repository 调用方法 | ✅ |
| 7. 完整接口文档 (请求参数 + 响应示例) | ✅ |
| 8. OperationLog 自动记录机制 | ✅ |
| 9. TypeScript 编译通过 | ✅ |

**等待确认后进入第四阶段。**
