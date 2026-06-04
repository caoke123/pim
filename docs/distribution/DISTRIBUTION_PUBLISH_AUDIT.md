# PHASE 5 STEP 2C — Distribution Publish Chain Audit Report

> 日期: 2026-06-03  
> 审计范围: Distribution 模块完整发布链路  
> 禁止修改代码

---

## 第一部分: Distribution 模块完整调用链

### 路由层

**文件:** `pim-system/packages/backend/src/modules/distributions/distributions.routes.ts`

| 端点 | HTTP | → Service 方法 |
|---|---|---|
| `/` | GET | `getList()` |
| `/:id` | GET | `getById()` |
| `/` | POST | `create()` |
| `/:id` | PATCH | `update()` |
| `/:id` | DELETE | `softDelete()` |
| `/:id/publish` | POST | `publish()` |
| `/:id/prices` | POST | `upsertPrices()` |

### 业务层

**文件:** `pim-system/packages/backend/src/modules/distributions/distributions.service.ts`

```
DistributionsService (lines 77-427)
├── getList()       :77-141  — 分页列表 (JOIN customers + catalogs)
├── getById()       :143-250 — 详情 + SKU + prices (Q1+Q2+Q3 三层查询)
├── create()        :252-309 — 创建 → INSERT distribution → 生成 publicUrl → INSERT prices
├── update()        :311-346 — 部分更新 (agreement/status/showCustomerName)
├── softDelete()    :348-360 — 软删除 → status='inactive'
├── publish()       :362-383 — [关键] 仅更新 status='active' + publicUrl
└── upsertPrices()  :385-427 — 批量增删客户定价
```

### Share API（公开端点）

**文件:** `pim-system/packages/backend/src/modules/share/share.routes.ts`
**Service:** `pim-system/packages/backend/src/modules/share/share.service.ts`

```
GET /api/share/distributions/:id
  → shareService.getShareDistribution(id)
    → Q1: distribution + customer + catalog (status='active')
    → Q2: productSkus + products (by catalog.productIds)
    → Q3: distributionSkuPrices (pricing)
    → return ShareDistributionResponse
```

---

## 第二部分: Catalog 发布流程（参考实现）

### 发布入口

**Route:** `POST /api/v1/catalogs/:id/publish`  
**Service:** `pim-system/packages/backend/src/modules/catalogs/catalogs.service.ts:322-474`

### 完整时序图

```
POST /catalogs/:id/publish
  │
  ▼
publishCatalog(id)
  │
  ├─ Step 1: 查询图册元数据 (catalogs表)
  │   → id, name, coverImageUrl, productIds[]
  │
  ├─ Step 2: 查询关联产品 (products表)
  │   → id, spuCode, title, category, mainImageUrl, imagesJson
  │
  ├─ Step 3: 查询所有 SKU (productSkus表)
  │   → spuCode, skuCode, nameZh, nameEn, imageUrl, sortOrder
  │   按 spuCode 分组
  │
  ├─ Step 4: 组装 JSON
  │   {
  │     id, name, brand: '雨图饰品',
  │     coverImageUrl,
  │     products: [{ spuCode, title, category, mainImageUrl,
  │                  images: { main: [...] },
  │                  skus: [{ skuCode, nameZh, nameEn, imageUrl }]
  │                }]
  │   }
  │
  ├─ Step 5: 上传 R2
  │   S3Client → PutObjectCommand
  │   Key: catalogs/{catalog.id}.json
  │   Bucket: yuntu-products
  │
  ├─ Step 6: 更新数据库
  │   SET status='published',
  │       r2Path='catalogs/{id}.json',
  │       publicUrl='https://yutu.nv315.top/catalogs/{id}.json',
  │       publishedAt=NOW()
  │
  └─ Return { publicUrl, productCount }
```

### R2 JSON 格式

```json
{
  "id": "6e230750-...",
  "name": "2026春季新品图册",
  "brand": "雨图饰品",
  "createdAt": "2026-05-31T12:36:53.532Z",
  "coverImageUrl": "https://yutu.nv315.top/products/...",
  "products": [
    {
      "spuCode": "SP2605024",
      "title": "彩色尼龙登山扣钥匙扣 包包挂件",
      "category": "钥匙扣",
      "mainImageUrl": "https://yutu.nv315.top/...",
      "images": { "main": [{ "index": 0, "url": "...", "fileName": "..." }] },
      "skus": [
        {
          "skuCode": "BG-CR-0001",
          "nameZh": "黄橙登山扣绳",
          "nameEn": "",
          "imageUrl": "https://yutu.nv315.top/..."
        }
      ]
    }
  ]
}
```

### 访问链路

```
http://localhost:3010/c/{catalogId}
  → Next.js SSR page (src/app/c/[id]/page.tsx)
    → getCatalog(id)
      → fetch("https://yutu.nv315.top/catalogs/{id}.json")
        → R2 static JSON
          → catalogToViewModel() or distributionToViewModel()
            → <CatalogView/>
```

---

## 第三部分: Distribution vs Catalog 对比

### A. 是否已存在 publish 功能？

**存在，但功能不完整。**

`distributions.service.ts:362` — `publish()` 方法存在，但只做了:
1. 更新 `status` → `'active'`
2. 生成/修复 `publicUrl` → `https://yutu.nv315.top/d/{distributionId}`

### B. 是否已生成 JSON？

**否。**

Distribution `publish()` 没有任何 JSON 生成逻辑。对比 Catalog 的 `publishCatalog()` 有完整的 JSON 组装（lines 384-416）。

### C. JSON 存放位置？

**无 JSON 文件。** Distribution 没有上传任何文件到 R2。

### D. JSON 文件名规则？

**不存在。** Catalog 使用 `catalogs/{catalog.id}.json`。

### E. 是否上传 R2？

**否。**

Distribution 模块没有任何 R2 / S3 上传代码。没有 `@aws-sdk/client-s3` 引用。

### F. 是否生成 publicUrl？

**是。**

`publicUrl = 'https://yutu.nv315.top/d/{distributionId}'`

### G. publicUrl 指向哪里？

**Cloudflare R2 — 但该路径没有文件。**

`yutu.nv315.top` 是 R2 自定义域名（`.env:6` — `R2_CUSTOM_DOMAIN=https://yutu.nv315.top`）。

R2 上只有 `catalogs/*.json` 和 `products/**` 路径。没有 `/d/` 路径的任何文件。

### H. 是否存在失效链路？

**是 — 完全失效。**

```
https://yutu.nv315.top/d/{distributionId}
  → Cloudflare R2
    → 404 (无此文件)
```

E-Catalog Next.js 项目的 `getDistribution(id)` (`E:\网站开发\E-Catalog\yutu-catalog\src\lib\distribution.ts:8`) 也尝试从 R2 读取 `catalogs/{id}.json`，而非从 Distribution API 读取。

---

## 第四部分: 数据库审计

### 相关表结构

| 表 | 关键字段 | 用于 Distribution JSON |
|---|---|---|
| `distributions` | id, customerId, catalogId, agreement, status, publicUrl, showCustomerName | 主记录 |
| `distributionSkuPrices` | distributionId, skuId, spuCode, customerPrice | **客户定价** (supplyPrice) |
| `customers` | id, name, contactPerson, phone, wechat, notes | **分销商信息** |
| `catalogs` | id, name, coverImageUrl, productIds[] | **产品列表引用** |
| `products` | id, spuCode, title, category, mainImageUrl, imagesJson | **产品信息** |
| `productSkus` | id, skuCode, spuCode, nameZh, nameEn, sellingPrice, imageUrl | **SKU + 基准价** (suggestedPrice) |

### Distribution JSON 需要的字段映射

E-Catalog 的 `distributionToViewModel()` 需要:

| 目标字段 | 数据来源 | 当前 DB 是否存在 |
|---|---|---|
| `distributorInfo.distributorName` | `customers.name` | ✅ |
| `distributorInfo.cooperationLevel` | 无对应字段 | ❌ 需新增或默认值 |
| `distributorInfo.currency` | 无对应字段 | ❌ 默认 `'¥'` |
| `distributorInfo.agreementText` | `distributions.agreement` | ✅ |
| `distributorInfo.validUntil` | 无对应字段 | ❌ 需新增 |
| `distributorInfo.contactManager` | `customers.contactPerson` (可选) | ⚠️ 语义不完全匹配 |
| `products[].skus[].supplyPrice` | `distributionSkuPrices.customerPrice` | ✅ |
| `products[].skus[].suggestedPrice` | `productSkus.sellingPrice` | ✅ |
| `products[].skus[].skuCode` | `productSkus.skuCode` | ✅ |
| `products[].skus[].nameZh` | `productSkus.nameZh` | ✅ |
| `products[].skus[].imageUrl` | `productSkus.imageUrl` | ✅ |
| `products[].title` | `products.title` | ✅ |
| `products[].mainImageUrl` | `products.mainImageUrl` | ✅ |
| `products[].images` | `products.imagesJson` | ✅ |
| `catalog.id` | `catalogs.id` (via distribution.catalogId) | ✅ |
| `catalog.name` | `catalogs.name` | ✅ |
| `catalog.coverImageUrl` | `catalogs.coverImageUrl` | ✅ |

---

## 第五部分: E-Catalog distributionAdapter 兼容性

### 期望数据格式

**文件:** `E:\网站开发\E-Catalog\yutu-catalog\src\adapters\distributionAdapter.ts`  
**输入类型:** `CatalogData`（来自 `src/types/catalog.ts`）

```
CatalogData {
  id, name, brand, createdAt, coverImageUrl,
  products: [{ spuCode, title, category, mainImageUrl, images: {main: [...]},
               skus: [{ skuCode, nameZh, nameEn, imageUrl, supplyPrice?, suggestedPrice? }]
            }],
  distributorInfo?: { distributorName, cooperationLevel, currency, agreementText?, validUntil?, contactManager? }
}
```

### 数据获取方式

**文件:** `E:\网站开发\E-Catalog\yutu-catalog\src\lib\distribution.ts`

```ts
// 当前实现 — 从 R2 读取 JSON（同 Catalog）
const url = `${r2BaseUrl}/catalogs/${id}.json`

// 代码注释: "未来阶段: 替换为 GET /api/share/distributions/:id"
```

### 兼容性结论

| 能力 | 当前状态 | 是否满足 E-Catalog |
|---|---|---|
| 读取供应价 (`supplyPrice`) | `distributionSkuPrices.customerPrice` | ✅ 数据存在 |
| 读取建议零售价 (`suggestedPrice`) | `productSkus.sellingPrice` | ✅ 数据存在 |
| 读取分销商名称 (`distributorName`) | `customers.name` | ✅ 数据存在 |
| 读取合作级别 (`cooperationLevel`) | 无 | ❌ 缺失 |
| 读取货币 (`currency`) | 无 | ⚠️ 可默认 `'¥'` |
| 读取有效期 (`validUntil`) | 无 | ❌ 缺失 |
| 读取客户经理 (`contactManager`) | `customers.contactPerson` | ⚠️ 可借用 |
| 读取协议文本 (`agreementText`) | `distributions.agreement` | ✅ 数据存在 |
| 生成 JSON 上传 R2 | 无 | ❌ 缺失 |
| 提供 publicUrl 可访问 | URL 指向 R2 但无文件 | ❌ 失效 |

---

## 第六部分: 缺失能力清单

### P0 — 阻塞项

| # | 缺失能力 | 影响 |
|---|---|---|
| 1 | **Distribution 无 publish-to-JSON 流程** | 无法生成可发布的静态 JSON 文件 |
| 2 | **Distribution 无 R2 上传逻辑** | publicUrl 指向的 R2 路径没有文件 |
| 3 | **publicUrl 指向错误** | `https://yutu.nv315.top/d/{id}` — R2 无此路径 |
| 4 | **E-Catalog 无 Distribution 数据源** | `getDistribution()` 从 R2 读取，无法获取 Distribution 专属定价 |

### P1 — 功能缺失

| # | 缺失能力 | 影响 |
|---|---|---|
| 5 | **`cooperationLevel` 字段缺失** | E-Catalog 无法显示合作级别 (VIP/标准等) |
| 6 | **`validUntil` 字段缺失** | 无法显示分销有效期 |
| 7 | **`currency` 字段缺失** | 价格无货币标识 |

### P2 — 可优化

| # | 缺失能力 | 影响 |
|---|---|---|
| 8 | **`contactManager` 语义不明确** | `customers.contactPerson` 不完全对应 |
| 9 | **无 SKU images 的 main images** | Distribution JSON 缺少 `images: { main: [...] }` 结构 |

---

## 第七部分: 推荐实施方案

### 方案: 实现 Distribution publishCatalog() 模式

在 `distributions.service.ts` 中新增 `publishDistribution()` 方法，参考 `catalogs.service.ts:publishCatalog()`：

```
publishDistribution(id):
  1. 查询 distribution + customer + catalog
  2. 查询 catalog.productIds → products + imagesJson
  3. 查询 productSkus (by spuCode)
  4. 查询 distributionSkuPrices (customerPrice)
  5. 组装 JSON with distributorInfo + supplyPrice + suggestedPrice
  6. 上传 R2: distributions/{distributionId}.json
  7. 更新 publicUrl = https://yutu.nv315.top/distributions/{id}.json
  8. 返回 publicUrl
```

需要新增的字段（可选，可用默认值）：

| 字段 | 方案 |
|---|---|
| `cooperationLevel` | 默认 `"标准合作"`，未来可新增 `distributions.cooperationLevel` 列 |
| `currency` | 默认 `"¥"` |
| `validUntil` | 默认 `null` |
| `contactManager` | 使用 `customers.contactPerson` |
| `supplyPrice` | 使用 `distributionSkuPrices.customerPrice` |
| `suggestedPrice` | 使用 `productSkus.sellingPrice` |

### 预计修改文件列表

| 文件 | 变更 | 工时 |
|---|---|---|
| `pim-system/packages/backend/src/modules/distributions/distributions.service.ts` | 新增 `publishDistribution()` (80 lines) | 2h |
| `pim-system/packages/backend/src/modules/distributions/distributions.routes.ts` | 关联现有 `/:id/publish` 路由 | 0h |
| `E:\网站开发\E-Catalog\yutu-catalog\src\lib\distribution.ts` | 修改数据源从 R2 → Share API 或新 R2 路径 | 0.5h |
| `E:\网站开发\E-Catalog\yutu-catalog\.env.local` | 新增 Distribution R2 路径配置（如需要） | 0.5h |
| **可选:** DB migration | 新增 `cooperationLevel`/`validUntil` 列 | 1h |

### 预计开发工时: **3-4 小时**

---

## 第八部分: 当前架构图

```
┌─────────────────────────────────────────────────────────┐
│  PIM Backend (localhost:8000)                           │
│                                                         │
│  Distribution Module              Catalog Module        │
│  ├─ create()                      ├─ create()           │
│  ├─ update()                      ├─ update()           │
│  ├─ publish() ← 仅更新 status     ├─ publishCatalog()   │
│  │   publicUrl = R2 /d/{id}       │   ├─ 组装 JSON       │
│  │   ❌ 无 JSON                   │   ├─ 上传 R2         │
│  │   ❌ 无 R2 上传                 │   └─ R2 URL          │
│  └─ upsertPrices()                └─ trackView()        │
│                                                         │
│  Share API                                                │
│  └─ GET /api/share/distributions/:id                    │
│      → 动态数据 (products + pricing)                     │
│      → 仅 Admin 端使用 (localhost:5174)                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Cloudflare R2 (yutu.nv315.top)                         │
│                                                         │
│  ✅ catalogs/{catalogId}.json  ← publishCatalog()       │
│  ✅ products/**                                       │
│  ❌ distributions/*             ← 无任何文件              │
│  ❌ /d/*                        ← 无任何文件              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Next.js E-Catalog (localhost:3010)                     │
│                                                         │
│  /c/[id]/page.tsx  ← catalogToViewModel()                │
│    ↓ getCatalog(id)                                      │
│    ↓ fetch R2: catalogs/{id}.json ✅                     │
│                                                         │
│  /dev/distribution-preview  ← distributionToViewModel() │
│    ↓ getDistribution(id)                                 │
│    ↓ fetch R2: catalogs/{id}.json ❌ 无 distribution 数据 │
│    ↓ fallback: distributionPreview mock data              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  PIM Frontend (localhost:5174)                          │
│                                                         │
│  /d/:distributionId  ← ECatalog.tsx                      │
│    ↓ fetch Share API: /api/share/distributions/:id      │
│    ↓ 仅内部管理后台可用                                    │
└─────────────────────────────────────────────────────────┘
```
