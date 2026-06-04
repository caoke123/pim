# Phase 5 Step 2D-1 — Distribution Publish Pipeline Design

> 日期: 2026-06-03  
> 类型: 架构设计 · 禁止编码  
> 前提: E-Catalog (Cloudflare Pages) 不能访问 PIM API (内网 Docker)

---

## 1. Catalog Publish 完整执行链路

### 代码位置

`pim-system/packages/backend/src/modules/catalogs/catalogs.service.ts:322-474` — `publishCatalog()`

### 执行步骤

```
publishCatalog(id)
  │
  ├─ Q1: SELECT * FROM catalogs WHERE id = :id
  │     → id, name, coverImageUrl, productIds[]
  │
  ├─ Q2: SELECT id, spuCode, title, category,
  │            mainImageUrl, imagesJson, r2BasePath
  │       FROM products WHERE id = ANY(:productIds)
  │     → product rows with imagesJson (ImageEntry[])
  │
  ├─ Q3: SELECT spuCode, skuCode, nameZh, nameEn, imageUrl, sortOrder
  │       FROM productSkus WHERE spuCode = ANY(:spuCodes)
  │       ORDER BY spuCode ASC, sortOrder ASC
  │     → SKU rows grouped by spuCode
  │
  ├─ Assemble JSON:
  │     { id, name, brand, createdAt, coverImageUrl, products: [
  │         { spuCode, title, category, mainImageUrl,
  │           images: { main: [{ index, url, fileName }] },
  │           skus: [{ skuCode, nameZh, nameEn, imageUrl }]
  │     }]}
  │
  ├─ Upload R2:
  │     S3Client → PutObjectCommand
  │     Key: catalogs/{catalog.id}.json
  │     Bucket: yuntu-products
  │     ContentType: application/json
  │
  ├─ UPDATE catalogs SET
  │     status = 'published',
  │     r2Path = 'catalogs/{id}.json',
  │     publicUrl = 'https://yutu.nv315.top/catalogs/{id}.json',
  │     publishedAt = NOW()
  │
  └─ Return { publicUrl, productCount }
```

### 查询的表

| # | 表 | 查询字段 |
|---|---|---|
| Q1 | `catalogs` | id, name, coverImageUrl, productIds, createdAt |
| Q2 | `products` | id, spuCode, title, category, mainImageUrl, imagesJson |
| Q3 | `productSkus` | spuCode, skuCode, nameZh, nameEn, imageUrl, sortOrder |

### 组装字段

| JSON 字段 | 来源 |
|---|---|
| `id` | `catalogs.id` |
| `name` | `catalogs.name` |
| `brand` | 硬编码 `"雨图饰品"` |
| `createdAt` | `catalogs.createdAt` |
| `coverImageUrl` | `catalogs.coverImageUrl` |
| `products[].spuCode` | `products.spuCode` |
| `products[].title` | `products.title` |
| `products[].category` | `products.category` |
| `products[].mainImageUrl` | `products.mainImageUrl` or imagesJson.main[0].r2Url |
| `products[].images.main` | `products.imagesJson.main[]` (map: r2Url → url, fileName, index) |
| `products[].skus[].skuCode` | `productSkus.skuCode` |
| `products[].skus[].nameZh` | `productSkus.nameZh` |
| `products[].skus[].nameEn` | `productSkus.nameEn` |
| `products[].skus[].imageUrl` | `productSkus.imageUrl` |

### R2 路径

```
catalogs/{catalog.id}.json
```

例如: `catalogs/6e230750-b707-4946-8a40-df642317f3f3.json`

### 更新数据库字段

```
status       → 'published'
r2Path       → 'catalogs/{id}.json'
publicUrl    → 'https://yutu.nv315.top/catalogs/{id}.json'
publishedAt  → NOW()
updatedAt    → NOW()
```

---

## 2. Distribution Publish 可复用逻辑

### 可直接复用的代码模式

| 逻辑 | Catalog 位置 | 复用方式 |
|---|---|---|
| **产品查询** (Q2) | lines 343-354 | 完全相同 — 从 `catalogs.productIds` 查 `products` |
| **SKU 查询** (Q3) | lines 362-373 | 完全相同 — 按 `spuCode` 查 `productSkus` |
| **图片处理** (`imagesJson.main → ImageEntry[]`) | lines 392-398 | 完全相同 — raster 到 `{index, url, fileName}` |
| **R2 上传** (S3Client → PutObjectCommand) | lines 422-449 | 完全可复用 — 仅改 Key + Body |
| **publicUrl 生成** | line 456 | 完全可复用 — 仅改路径前缀 |
| **DB 更新** (status/publicUrl/publishedAt) | lines 459-467 | 结构相同 — 不同表 |

### 新增逻辑

| 逻辑 | 说明 |
|---|---|
| **Distribution 查询** (新 Q1) | `distributions` JOIN `customers` JOIN `catalogs` |
| **客户定价查询** (新 Q4) | `distributionSkuPrices` WHERE distributionId = :id |
| **distributorInfo 组装** | 新块：映射 customer + agreement → DistributorInfo |
| **SKU supplyPrice/suggestedPrice 组装** | 新块：合并 `customerPrice` + `sellingPrice` |

---

## 3. publishDistribution() 时序图

```
POST /distributions/:id/publish
  │
  ▼
publishDistribution(id)
  │
  ├─ Q1: 查询 Distribution + Customer + Catalog
  │     SELECT d.*, c.name AS customer_name,
  │            c.contact_person, c.phone, c.wechat, c.notes,
  │            cat.name AS catalog_name, cat.cover_image_url, cat.product_ids
  │     FROM distributions d
  │     LEFT JOIN customers c ON c.id = d.customer_id
  │     LEFT JOIN catalogs cat ON cat.id = d.catalog_id
  │     WHERE d.id = :id
  │     → distribution, customer info, catalog metadata
  │
  ├─ Q2: 查询产品 (复用 Catalog Q2)
  │     SELECT id, spuCode, title, category,
  │            mainImageUrl, imagesJson
  │     FROM products
  │     WHERE id = ANY(:productIds)
  │
  ├─ Q3: 查询 SKU (复用 Catalog Q3)
  │     SELECT spuCode, skuCode, nameZh, nameEn, imageUrl,
  │            sellingPrice, sortOrder
  │     FROM productSkus
  │     WHERE spuCode = ANY(:spuCodes)
  │     ORDER BY spuCode, sortOrder
  │
  ├─ Q4: 查询客户定价 (Distribution 独有)
  │     SELECT skuId, customerPrice
  │     FROM distributionSkuPrices
  │     WHERE distributionId = :id
  │     → priceMap: Map<skuId, customerPrice>
  │
  ├─ 分组 SKU
  │     skusBySpuCode: Map<spuCode, SkuRow[]>
  │     同时建立 skuId→spuCode 映射 (用于价格匹配)
  │
  ├─ 组装 Distribution JSON
  │     {
  │       id: distribution.id,
  │       name: catalog.name,
  │       brand: "雨图饰品",
  │       createdAt: distribution.createdAt,
  │       coverImageUrl: catalog.coverImageUrl,
  │       products: [...],           ← 含 supplyPrice + suggestedPrice
  │       distributorInfo: {...}     ← 含 customer info
  │     }
  │
  ├─ Upload R2
  │     S3Client → PutObjectCommand
  │     Key: distributions/{distribution.id}.json        ← 新路径
  │     Bucket: yuntu-products
  │     ContentType: application/json
  │
  ├─ UPDATE distributions SET
  │     status = 'published',
  │     publicUrl = 'https://yutu.nv315.top/distributions/{id}.json',
  │     updatedAt = NOW()
  │     [需新增列] r2Path = 'distributions/{id}.json'
  │     [需新增列] publishedAt = NOW()
  │
  └─ Return { publicUrl, productCount, distributorName }
```

---

## 4. 最终 Distribution JSON TypeScript Interface

> 与 `E:\网站开发\E-Catalog\yutu-catalog\src\types\catalog.ts` 100% 兼容

```typescript
interface CatalogImage {
  index: number
  url: string
  fileName: string
}

interface CatalogSku {
  skuCode: string
  nameZh: string
  nameEn: string
  imageUrl: string
  supplyPrice?: number         // distributionSkuPrices.customerPrice
  suggestedPrice?: number      // productSkus.sellingPrice
}

interface CatalogProduct {
  spuCode: string
  title: string
  category: string
  mainImageUrl: string
  images: { main: CatalogImage[] }
  skus: CatalogSku[]
}

interface DistributorInfo {
  distributorName: string      // customers.name
  cooperationLevel: string     // 默认 "标准合作"
  currency: string             // 默认 "¥"
  agreementText?: string       // distributions.agreement
  validUntil?: string          // 未来扩展字段
  contactManager?: string      // customers.contactPerson
}

interface CatalogData {
  id: string                   // distributions.id
  name: string                 // catalogs.name
  brand: string                // "雨图饰品"
  createdAt: string            // distributions.createdAt (ISO)
  coverImageUrl: string        // catalogs.coverImageUrl
  products: CatalogProduct[]
  distributorInfo?: DistributorInfo
}
```

### distributionToViewModel() 消费验证

| Adapter 读取 | JSON 字段 | 适配器行为 |
|---|---|---|
| `data.id` | `id` | → `meta.id` |
| `data.name` | `name` | → `meta.name`, `hero.name` |
| `data.brand` | `brand` | → `meta.brand`, `hero.brand` |
| `data.createdAt` | `createdAt` | → `meta.createdAt`, `hero.createdAt` |
| `data.coverImageUrl` | `coverImageUrl` | → `hero.coverImageUrl` |
| `data.products.length` | `products` | → `hero.productCount` |
| `data.distributorInfo` | `distributorInfo` | → `distributor`, `agreement`, `hero.customerName` |
| `dist.distributorName` | `distributorInfo.distributorName` | → `hero.customerName`, `DistributorBanner` |
| `dist.cooperationLevel` | `distributorInfo.cooperationLevel` | → `DistributorBanner` badge |
| `dist.currency` | `distributorInfo.currency` | → `PricingInfo.currency` |
| `dist.agreementText` | `distributorInfo.agreementText` | → `AgreementModal` |
| `dist.validUntil` | `distributorInfo.validUntil` | → `DistributorBanner` date |
| `dist.contactManager` | `distributorInfo.contactManager` | → `DistributorBanner` contact |
| `sku.supplyPrice` | `products[].skus[].supplyPrice` | → `PricingInfo.supplyPrice` |
| `sku.suggestedPrice` | `products[].skus[].suggestedPrice` | → `PricingInfo.suggestedPrice` |
| `hasPricing` | (supplyPrice ≠ null ∧ suggestedPrice ≠ null) | → `features.showPrice` |
| `!!dist` | (distributorInfo ≠ undefined) | → `features.showCustomerName` |
| `!!dist.agreementText` | (agreementText ≠ undefined) | → `features.showAgreement` |

---

## 5. R2 路径设计

### 方案对比

| 维度 | 方案 A: `catalogs/{distributionId}.json` | 方案 B: `distributions/{distributionId}.json` |
|---|---|---|
| 冲突风险 | ⚠️ distribution.id 可能与 catalog.id 同值 | ✅ 路径隔离，无冲突 |
| 语义清晰 | ❌ "catalogs" 误导为普通图册 | ✅ "distributions" 明确为分销 |
| E-Catalog 读取 | 无需修改 (当前从 `catalogs/{id}.json` 读) | 需修改 `getDistribution()` 路径 |
| 运维清洗 | ❌ 与 catalog 文件混在一起 | ✅ 独立目录，可单独管理 |
| 权限控制 | ❌ 无区分 | ✅ 可对 `/distributions/` 单独设置 R2 CORS/缓存策略 |

### 推荐: 方案 B — `distributions/{distributionId}.json`

**原因:**

1. **语义正确**: 分销图册 ≠ 普通图册，应独立存放
2. **零冲突**: UUID 跨表重复概率极低但不应依赖概率
3. **E-Catalog 修改量小**: 仅需改 `distribution.ts:10` 一行:
   ```diff
   - const url = `${r2BaseUrl}/catalogs/${id}.json`
   + const url = `${r2BaseUrl}/distributions/${id}.json`
   ```
4. **未来扩展**: 可对 `/distributions/` 目录单独设置 R2 生命周期策略/缓存策略

### 最终 URL

```
publicUrl = https://yutu.nv315.top/distributions/{distribution.id}.json

示例: https://yutu.nv315.top/distributions/85b57a27-96e6-49f6-9cef-6bc8c990809c.json
```

---

## 6. 数据库字段映射表

### JSON 顶层字段

| JSON 字段 | DB 表 | DB 列 | 备注 |
|---|---|---|---|
| `id` | `distributions` | `id` | |
| `name` | `catalogs` | `name` | via `distributions.catalog_id` |
| `brand` | — | — | 硬编码 `"雨图饰品"` |
| `createdAt` | `distributions` | `created_at` | ISO string |
| `coverImageUrl` | `catalogs` | `cover_image_url` | via join |
| `products` | — | — | 来自 productIds 数组 |
| `distributorInfo` | — | — | 来自 customers + distributions |

### JSON `distributorInfo.*`

| JSON 字段 | DB 表 | DB 列 | 备注 |
|---|---|---|---|
| `distributorName` | `customers` | `name` | |
| `cooperationLevel` | — | — | **默认 `"标准合作"`**，未来可新增 `distributions.cooperation_level` |
| `currency` | — | — | **默认 `"¥"`** |
| `agreementText` | `distributions` | `agreement` | |
| `validUntil` | — | — | **`null`**，未来可新增 `distributions.valid_until` |
| `contactManager` | `customers` | `contact_person` | 语义借用 |

### JSON `products[]`

| JSON 字段 | DB 表 | DB 列 |
|---|---|---|
| `spuCode` | `products` | `spu_code` |
| `title` | `products` | `title` |
| `category` | `products` | `category` |
| `mainImageUrl` | `products.imagesJson.main[0].r2Url` 或 `products.main_image_url` |
| `images.main` | `products` | `images_json` (JSONB) |
| `skus` | — | — |

### JSON `products[].images.main[]`

| JSON 字段 | DB 来源 |
|---|---|
| `index` | `imagesJson.main[].index` |
| `url` | `imagesJson.main[].r2Url` |
| `fileName` | `imagesJson.main[].fileName` |

### JSON `products[].skus[]`

| JSON 字段 | DB 表 | DB 列 | 备注 |
|---|---|---|---|
| `skuCode` | `productSkus` | `sku_code` | |
| `nameZh` | `productSkus` | `name_zh` | |
| `nameEn` | `productSkus` | `name_en` | |
| `imageUrl` | `productSkus` | `image_url` | |
| `supplyPrice` | `distributionSkuPrices` | `customer_price` | **核心分销字段** |
| `suggestedPrice` | `productSkus` | `selling_price` | 市场零售价 |

### 需要新增的 DB 列（推荐）

| 表 | 新列 | 类型 | 默认值 | 用途 |
|---|---|---|---|---|
| `distributions` | `r2_path` | TEXT | NULL | R2 文件路径 (对齐 catalogs) |
| `distributions` | `published_at` | TIMESTAMPTZ | NULL | 发布时间 (对齐 catalogs) |
| `distributions` | `cooperation_level` | VARCHAR(50) | `'标准合作'` | 合作等级 (可选) |
| `distributions` | `valid_until` | TIMESTAMPTZ | NULL | 有效期 (可选) |

### R2 上传后 DB 更新

| DB 列 | 更新值 |
|---|---|
| `status` | `'published'` |
| `public_url` | `'https://yutu.nv315.top/distributions/{id}.json'` |
| `r2_path` | `'distributions/{id}.json'` |
| `published_at` | `NOW()` |
| `updated_at` | `NOW()` |

---

## 7. E-Catalog 兼容性变更

### 修改文件

`E:\网站开发\E-Catalog\yutu-catalog\src\lib\distribution.ts:10`

```diff
- const url = `${r2BaseUrl}/catalogs/${id}.json`
+ const url = `${r2BaseUrl}/distributions/${id}.json`
```

### 目标 R2 文件

```
https://yutu.nv315.top/distributions/{distributionId}.json
```

> E-Catalog 的 `distributionToViewModel()` 无需任何修改 — JSON 结构完全兼容 `CatalogData` 类型。

---

## 8. 完整调用链路图

```
┌──────────────────────────────────────────────────────────────────┐
│  PIM Backend (内网 Docker)                                       │
│                                                                  │
│  POST /distributions/:id/publish                                 │
│    │                                                             │
│    ▼                                                             │
│  publishDistribution(id)                                         │
│    │                                                             │
│    ├─ Q1: distributions + customers + catalogs                   │
│    ├─ Q2: products (by catalog.productIds)                       │
│    ├─ Q3: productSkus (by spuCode)                               │
│    ├─ Q4: distributionSkuPrices (customer pricing)               │
│    │                                                             │
│    ├─ Assemble JSON with                                         │
│    │   - supplyPrice (customerPrice)                              │
│    │   - suggestedPrice (sellingPrice)                           │
│    │   - distributorInfo                                         │
│    │                                                             │
│    ├─ Upload R2: distributions/{id}.json                         │
│    │                                                             │
│    └─ UPDATE distributions:                                      │
│        status='published', publicUrl=R2 URL, publishedAt=NOW()   │
│                                                                  │
└────────────────────┬─────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│  Cloudflare R2                                                   │
│                                                                  │
│  distributions/{distributionId}.json  ← 新文件                    │
│                                                                  │
└────────────────────┬─────────────────────────────────────────────┘
                     │ fetch (public)
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│  Next.js E-Catalog (Cloudflare Pages)                            │
│                                                                  │
│  /c/{id}  → catalogToViewModel()                                 │
│    ↓ fetch: catalogs/{id}.json                                    │
│                                                                  │
│  /distributions/{id}  [未来]                                      │
│    ↓ getDistribution(id)                                         │
│    ↓ fetch: distributions/{id}.json                               │
│    ↓ distributionToViewModel()                                   │
│    ↓ <CatalogView showPrice=true ... />                           │
└──────────────────────────────────────────────────────────────────┘
```

---

## 9. 预计代码量

| 模块 | 新增行数 | 说明 |
|---|---|---|
| `distributions.service.ts` | ~120 行 | `publishDistribution()` 新方法 |
| `distributions.routes.ts` | 0 行 | 复用现有 `/:id/publish` 路由 |
| DB migration | 1 文件 | 新增 `r2_path`, `published_at` 列 |
| E-Catalog `distribution.ts` | 1 行 | 修改 R2 读取路径 |
| `distributions` table | +2-4 列 | ALTER TABLE (可选) |
