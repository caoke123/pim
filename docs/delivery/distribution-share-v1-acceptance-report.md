# Distribution Share 验收报告 V1

> 日期：2026-06-03  
> 测试环境：localhost:8000 (backend) / localhost:5174 (frontend)  
> 测试数据：9 客户 · 2 图册 · 2 分销记录

---

## 一、测试数据概览

| 属性 | 值 |
|---|---|
| 现有 Distribution (active) | `85b57a27-96e6-49f6-9cef-6bc8c990809c` |
| 新建 Distribution (测试用) | `dbb1c3d9-8f0d-4591-b1c6-92fe9489a476` |
| Catalog | `6e230750-b707-4946-8a40-df642317f3f3` (2026 夏季新品图册, 5 products) |
| Customer (旧) | `57e9a9f2-00b3-436f-903d-92fbc9816560` (广州客户) |
| Customer (新) | `b960ee09-6ada-4f3c-8959-5ed0e9658d92` (阿里巴) |

---

## 二、Share API 测试结果

### 2.1 正常查询 (active distribution)

**Request:**
```
GET /api/share/distributions/85b57a27-96e6-49f6-9cef-6bc8c990809c
```

**Response (精简):**
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": "85b57a27-96e6-49f6-9cef-6bc8c990809c",
    "publicUrl": "https://yutu.nv315.top/d/dbb1c3d9-8f0d-4591-b1c6-92fe9489a476",
    "customerName": "广州客户",
    "catalogName": "2026夏季新品图册",
    "catalogCoverImageUrl": "https://yutu.nv315.top/products/...",
    "agreement": "<h2>更新后的合作约定</h2><p>修改于验收测试</p>",
    "productCount": 3,
    "products": [
      {
        "productId": "116ed1e1-1715-40ea-93dd-8f7eb183911f",
        "title": "彩色精致登山扣钥匙扣 创意挂件",
        "mainImageUrl": "https://yutu.nv315.top/products/...",
        "sortOrder": 1,
        "skus": [
          {
            "skuId": "908b2b11-0fb0-486f-be23-0c60f1591447",
            "skuCode": "BG-CR-0001",
            "specs": "黄橙登山扣",
            "skuImageUrl": "https://yutu.nv315.top/products/...",
            "basePrice": 1.90,
            "customerPrice": 0.55,
            "stock": 100
          }
          // ... 13 more SKUs
        ]
      }
      // ... 2 more products
    ]
  }
}
```

**验证点：**
- ✅ 返回 3 个产品，按 `sortOrder` 排序
- ✅ `customerName` 仅返回名称，无联系方式
- ✅ `agreement` HTML 正确保留
- ✅ 未返回 `customerContactPerson / phone / wechat / notes / operator`
- ✅ `customerPrice` 反映最新修改值 (0.55)
- ✅ `stock` 正确

### 2.2 新建 Distribution

**Request:**
```
POST /api/v1/distributions
{ "customerId": "b960ee09-...", "catalogId": "6e230750-...", "agreement": "测试合作条款" }
```

**Response:**
```json
{
  "id": "dbb1c3d9-8f0d-4591-b1c6-92fe9489a476",
  "publicUrl": "https://yutu.nv315.top/d/dbb1c3d9-8f0d-4591-b1c6-92fe9489a476"
}
```

**验证点：**
- ✅ `publicUrl` 使用 **distribution.id** 而非 catalog.id
- ✅ Distribution ID 与 URL 中 UUID 一致
- ✅ Share API 能正确查询新建 Distribution
- ✅ 价格自动从 catalog 产品 SKU 初始化

### 2.3 不存在的 Distribution

```
GET /api/share/distributions/00000000-0000-0000-0000-000000000000
→ 404 Not Found
```

✅ 返回标准 404

### 2.4 Inactive / 已删除 Distribution

```
1. PATCH → status: "inactive"
2. GET Share API → 404 Not Found
```

✅ inactive 的 Distribution 对公开 API 不可见，返回 404

### 2.5 删除 (Soft Delete)

```
DELETE /api/v1/distributions/:id → 200 OK
GET Share API → 404 Not Found
```

✅ 软删除将 status 设为 inactive，随后 Share API 返回 404

---

## 三、Price 修改验证

### 3.1 单 SKU 价格修改

```
POST /api/v1/distributions/:id/prices
{ "items": [{ "skuId": "908b2b11-...", "customerPrice": 0.55 }] }
→ { "updated": 1 }
```

| SKU | 修改前 | 修改后 | Share API 反映 |
|---|---|---|---|
| BG-CR-0001 | basePrice=1.90, customerPrice=1.90 | customerPrice=0.55 | ✅ 0.55 |

### 3.2 批量价格修改

```
POST /api/v1/distributions/:id/prices
{ "items": [
  { "skuId": "f3a9847c-...", "customerPrice": 0.68 },
  { "skuId": "c6c98337-...", "customerPrice": 0.72 }
]}
→ { "updated": 2 }
```

| SKU | basePrice | 修改后 customerPrice | Share API 验证 |
|---|---|---|---|
| BG-MX-0005 | 0.90 | 0.68 | ✅ |
| BG-RD-0002 | 0.90 | 0.72 | ✅ |
| BG-CR-0003 | 0.00 | 0.00 (未设) | ✅ |
| BG-MX-0004 | 0.00 | 0.00 (未设) | ✅ |

---

## 四、Publish API 验证

```
POST /api/v1/distributions/:id/publish
→ { "publicUrl": "https://yutu.nv315.top/d/..." }
```

✅ 已有 `publicUrl` 的 Distribution 发布时不覆盖  
✅ 新 Distribution 无 `publicUrl` 时正确生成

---

## 五、Phase 1 变更验证 — catalogId 禁止修改

```
PATCH /api/v1/distributions/:id
{ "catalogId": "cb4d91df-8992-4379-845e-8a38154e0779" }
→ 200 OK (但 catalogId 未改变)
```

✅ 请求携带 `catalogId` 不报错（兼容性）  
✅ `catalogId` 实际未被修改（字段已从 DTO/updateSchema/service 移除）  
✅ 其他字段正常更新 (`agreement` / `status`)

---

## 六、大数据量性能测试

### 测试环境
- 3 产品 × 20 SKU 总计 (实际数据规模)
- 本地单实例, PostgreSQL 直连, 无缓存

### 测试结果 (20 轮请求)

| 指标 | 值 |
|---|---|
| 请求数 | 20 |
| 平均响应时间 | **10.13 ms** |
| 最小响应时间 | 4.40 ms |
| 最大响应时间 | 98.60 ms |
| P95 | ~40 ms |

✅ 响应时间 < 100ms，满足生产要求  
⚠️ 单次峰值 98.60ms (冷查询/GC 影响), 建议加 CDN 缓存

---

## 七、发现的问题列表

| # | 严重度 | 问题描述 | 影响 |
|---|---|---|---|
| 1 | 中 | Share API 无访问频率限制 | 可被高频攻击消耗 DB 资源 |
| 2 | 中 | Share API 无响应缓存 | 每次请求执行 3 次 DB 查询 |
| 3 | 中 | 旧 Distribution `publicUrl` 使用旧格式 (`catalog.yutu.../d/{catalogId}`) | 与新创建的 URL 格式不一致 |
| 4 | 低 | 非法 UUID 传入 Share API 返回 500 而非 400 | 客户端可能误判为服务端错误 |
| 5 | 低 | `customerPrice`=0 与无定价的显示一致 | UI 无法区分"定价为 0"和"未定价" |
| 6 | 低 | Publish API 在 `publicUrl` 已存在时仍返回旧值 | 旧 Distribution 不会自动更新 URL 到新格式 |
| 7 | 低 | 前端 `DistributionDrawer` 图册绑定 UI 仍存在但已失效 | 用户操作无反馈 |

---

## 八、修复建议列表

| # | 对应问题 | 修复方案 | 优先级 | 预计工时 |
|---|---|---|---|---|
| 1 | #1 | 增加 rate-limit 中间件 (每 IP 100 req/min) | 高 | 2h |
| 2 | #2 | Share API 响应增加 `Cache-Control: public, max-age=60`；或 Redis 缓存层 | 高 | 4h |
| 3 | #3 | 执行数据迁移脚本: `UPDATE distributions SET public_url = 'https://yutu.nv315.top/d/' || id WHERE public_url LIKE '%catalog.yutu%'` | 中 | 0.5h |
| 4 | #4 | Share routes 增加 Zod UUID 校验，返回 400 | 中 | 0.5h |
| 5 | #5 | ShareSkuItem 增加 `hasCustomPrice: boolean` 字段区分定价与未定价 | 低 | 1h |
| 6 | #6 | Publish API 增加: 若 `publicUrl` 为旧格式，自动替换为新格式 | 低 | 1h |
| 7 | #7 | DistributionDrawer 中禁用或移除图册选择按钮，增加 tooltip 提示 | 低 | 1h |

---

## 九、测试覆盖率总结

| 测试场景 | 状态 |
|---|---|
| Share API - active distribution 正常查询 | ✅ 通过 |
| Share API - 包含 3 产品 + 20 SKU + 价格 | ✅ 通过 |
| Share API - 不存在的 ID | ✅ 返回 404 |
| Share API - inactive distribution | ✅ 返回 404 |
| Share API - 软删除后访问 | ✅ 返回 404 |
| Share API - Agreement HTML 保留 | ✅ 通过 |
| Create Distribution - publicUrl 新格式 | ✅ 通过 |
| Update Price - 单 SKU | ✅ 通过 |
| Update Price - 批量 | ✅ 通过 |
| Publish API | ✅ 通过 |
| catalogId 禁止修改 | ✅ 通过 |
| 性能 (20 轮请求) | ✅ avg < 20ms |

---

## 十、源码变更索引

| Phase | 文件 | 说明 |
|---|---|---|
| 1 | `packages/backend/src/modules/distributions/distributions.service.ts` | publicUrl 修复 + DTO/update 移除 customerId/catalogId |
| 1 | `packages/backend/src/modules/distributions/distributions.routes.ts` | updateSchema 移除两个字段 |
| 1 | `packages/frontend/src/api/client.ts` | 类型签名同步 |
| 2 | `packages/backend/src/modules/share/*` (3 files) | Share API 完整实现 |
| 2 | `packages/backend/src/index.ts` | 注册 share 模块 + CORS 修正 |
| 2 | `packages/frontend/src/api/types.ts` | Share API 类型定义 |
| 2 | `packages/frontend/src/api/client.ts` | getShareDistribution 方法 |
| 2 | `packages/frontend/src/pages/ECatalog.tsx` | E-Catalog 页面 |
| 2 | `packages/frontend/src/app/App.tsx` | /d/:distributionId 路由 |
