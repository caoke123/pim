# Distribution 分享链路 — Phase 1 实施报告

> 日期：2026-06-02  
> 阶段：Phase 1 收尾 + Phase 2 设计  
> 状态：Task A-D 已完成，Task E 设计已交付

---

## Task A — 修复 Distribution publicUrl

### 问题

`create()` 和 `publish()` 中的 `publicUrl` 使用了错误的拼接模式。

### 修改内容

**文件：** `packages/backend/src/modules/distributions/distributions.service.ts`

| 方法 | 修改前 | 修改后 |
|---|---|---|
| `create()` | `https://catalog.yutu.nv315.top/d/{catalog.id}` | `https://yutu.nv315.top/d/{distribution.id}` |
| `publish()` 回退 | `https://catalog.yutu.nv315.top/d/{row.catalogId}` | `https://yutu.nv315.top/d/{row.id}` |

### 实施细节

- `create()`：先 INSERT 获取 `distribution.id`，再 UPDATE 写入 `publicUrl`（从 1 次 DB 往返变为 2 次）
- `publish()`：回退逻辑从 `row.catalogId` 改为 `row.id`，同时 `SELECT` 列中移除 `catalogId`

---

## Task B — catalogId 修改逻辑审查

### 结论：系统**允许**修改 catalogId

### 相关代码位置

| 层级 | 文件 | 行号 | 说明 |
|---|---|---|---|
| DTO | `distributions.service.ts` | 68 | `catalogId?: string` |
| 校验 | `distributions.routes.ts` | 20 | `catalogId: z.string().uuid().optional()` |
| 路由 | `distributions.routes.ts` | 58-68 | `PATCH /:id` |
| 业务 | `distributions.service.ts` | 315-327 | `update()` 方法 |

### 脏数据影响

- **YES** — 修改 `catalogId` 会导致 `distributionSkuPrices` 产生孤儿数据
- 旧 Catalog 的 SKU 价格行不会被清理，持续占用存储
- UI 层面通过 `getById()` 的 SKU 过滤暂时规避了可见性问题
- 但重新切换回原 Catalog 时旧价格可能过期复活

---

## Task C — 方案选择

### 推荐：方案1 — 禁止修改 catalogId / customerId

| 维度 | 方案1：禁止 | 方案2：允许 + 价格重建 |
|---|---|---|
| 数据一致性 | 零风险 | 需事务处理旧价格 |
| 实现复杂度 | 删 4 段代码 | 新增重建方法 |
| 业务语义 | 根基字段不应变 | 本质是换骨不换皮 |
| DB 膨胀 | 无 | 每次切换留下孤儿行 |

---

## Task D — 实施禁止修改主关联

### 变更文件清单

| 文件 | 变更内容 |
|---|---|
| `packages/backend/src/modules/distributions/distributions.service.ts` | `UpdateDistributionDTO` 移除 `customerId` / `catalogId`；`update()` 删除两段更新逻辑（customerId + catalogId 校验与赋值） |
| `packages/backend/src/modules/distributions/distributions.routes.ts` | `updateSchema` 移除 `customerId` / `catalogId` Zod 校验 |
| `packages/frontend/src/api/client.ts` | `updateDistribution` 类型签名移除 `customerId` / `catalogId` |

### 最终 UpdateDistributionDTO

```typescript
export interface UpdateDistributionDTO {
  agreement?: string
  status?: 'active' | 'inactive'
}
```

### 最终 updateSchema

```typescript
const updateSchema = z.object({
  agreement: z.string().max(20000).optional(),
  status: z.enum(['active', 'inactive']).optional(),
})
```

### 影响范围

- Distribution 创建后，`customerId` 和 `catalogId` **不可变**
- 仅 `agreement` 和 `status` 可通过 `PATCH /api/v1/distributions/:id` 修改
- 如需变更关联，必须删除后重建 Distribution

### 前端兼容性

- `DistributionDrawer.tsx:756` 中绑定图册的调用（`api.updateDistribution` + `catalogId`）因使用了 `as any` 可编译通过，但**后端不再处理 `catalogId`，将静默失效**
- 前端需后续修复：移除或禁用 DistributionDrawer 中的图册切换功能

### 类型检查

- Backend: `tsc --noEmit` — 通过
- Frontend: `tsc --noEmit` — 通过

---

## Task E — Share API 技术方案

### Route 设计

```
GET /api/share/distributions/:id
```

- 无认证（公开端点）
- 新文件：`src/modules/share/share.routes.ts`
- 注册：`app.route('/api/share', shareModule)`

### Response Schema

```typescript
interface ShareDistributionResponse {
  id: string
  publicUrl: string | null
  customerName: string
  catalogName: string
  catalogCoverImageUrl: string | null
  agreement: string | null
  productCount: number
  products: ShareProductItem[]
}

interface ShareProductItem {
  productId: string
  title: string
  mainImageUrl: string | null
  sortOrder: number
  skus: ShareSkuItem[]
}

interface ShareSkuItem {
  skuId: string
  skuCode: string
  specs: string
  skuImageUrl: string | null
  basePrice: number | null
  customerPrice: number | null
  stock: number
}
```

### SQL 查询（3 次）

| # | 表 | WHERE |
|---|---|---|
| Q1 | `distributions` + `customers` + `catalogs` | `d.id = :id AND d.status = 'active'` |
| Q2 | `productSkus` + `products` | `p.id = ANY(:productIds)` |
| Q3 | `distributionSkuPrices` | `distribution_id = :id AND sku_id = ANY(:skuIds)` |

### 是否复用 `getById()`

**不复用。** 原因：

| 维度 | `getById()` | Share API |
|---|---|---|
| 响应结构 | 扁平 SKU 列表 | 按产品分组嵌套 |
| 数据字段 | 含内部字段（电话/微信） | 仅公开字段 |
| 状态检查 | 无 | 必须 `active` |
| 用途 | 管理后台 | 客户公开浏览 |

### 文件结构

```
src/modules/share/
  index.ts              — Hono module, mounts /api/share
  share.routes.ts       — GET /distributions/:id
  share.service.ts      — 查询逻辑 + DTO
```

---

## 风险分析

| 风险 | 级别 | 说明 |
|---|---|---|
| `create()` 多一次 DB 往返 | 低 | publicUrl 写入在 INSERT 之后，失败时 URL 保持 null 不影响功能 |
| 前端 `DistributionDrawer` 静默失效 | 中 | 图册选择器仍可交互但不生效，需前端跟进 |
| Share API 与 admin API 数据源耦合 | 低 | 查不同表但表结构一致，catalogId 不可变后无脏数据风险 |

---

## 测试方案

| 场景 | 验证点 |
|---|---|
| 创建 Distribution | `publicUrl` = `https://yutu.nv315.top/d/{UUID}` |
| 发布 Distribution | 已有 URL 不覆盖；无 URL 时使用 distribution.id |
| 列表页 | `publicUrl` 列正确展示 |
| 详情页 | `publicUrl` 正确返回 |
| PATCH 携带 `catalogId` | 后端忽略该字段，不报错也不生效 |
| PATCH 仅 `agreement` | `agreement` 正常更新 |
| PATCH 仅 `status` | `status` 正常更新 |
