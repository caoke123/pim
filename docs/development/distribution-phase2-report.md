# Distribution 分享链路 — Phase 2 实施报告

> 日期：2026-06-02  
> 阶段：Phase 2 开发  
> 状态：Part 1-2 已完成，Part 3 联调待验证

---

## Part 1 — Share API 实现

### 新增文件

```
packages/backend/src/modules/share/
  index.ts              — Hono 模块挂载
  share.service.ts      — 业务逻辑 + DTO
  share.routes.ts       — GET /api/share/distributions/:id
```

### 修改文件

| 文件 | 变更 |
|---|---|
| `packages/backend/src/index.ts` | 注册 `shareModule` (`/api/share`)、CORS 端口修正 (5173 → 5174) |

### API 端点

```
GET /api/share/distributions/:id

Response: { code: 0, message: "ok", data: ShareDistributionResponse }
Error:    404 — distribution 不存在 或 status !== "active"
```

### DTO 定义

```typescript
interface ShareDistributionResponse {
  id: string
  publicUrl: string | null
  customerName: string          // 仅客户名称，不含联系方式
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
  sortOrder: number             // 保持 catalog.productIds 顺序
  skus: ShareSkuItem[]
}

interface ShareSkuItem {
  skuId: string
  skuCode: string
  specs: string                 // nameZhCustom || nameZh || nameEn
  skuImageUrl: string | null
  basePrice: number | null      // product_skus.selling_price
  customerPrice: number | null  // distribution_sku_prices.customer_price
  stock: number
}
```

### 已排除字段（不返回）

- `customerContactPerson / customerPhone / customerWechat / customerNotes` — 客户隐私
- `operator` — 运营信息
- `status / createdAt / updatedAt` — 内部管理字段
- `priceId` — 内部关联 ID

### SQL 查询（3 次）

| # | 主表 | JOIN | WHERE |
|---|---|---|---|
| Q1 | `distributions` | `customers`, `catalogs` | `d.id = :id AND d.status = 'active'` |
| Q2 | `productSkus` | `products` | `p.id = ANY(catalog.productIds)` |
| Q3 | `distributionSkuPrices` | — | `distribution_id = :id AND sku_id = ANY(:skuIds)` |

---

## Part 2 — E-Catalog 前端页面

### 新增文件

| 文件 | 说明 |
|---|---|
| `packages/frontend/src/pages/ECatalog.tsx` | E-Catalog 客户浏览页面 |

### 修改文件

| 文件 | 变更 |
|---|---|
| `packages/frontend/src/app/App.tsx` | 新增 Route: `/d/:distributionId` → `<ECatalog />` |
| `packages/frontend/src/api/types.ts` | 新增 Share API 类型定义 |
| `packages/frontend/src/api/client.ts` | 新增 `getShareDistribution()` 方法 |

### 页面路由

```
/d/:distributionId → ECatalog 组件
```

### ECatalog 页面结构

```
ECatalog
├── LoadingView      (loading.tsx 等价)    — 加载中旋转 + 文字提示
├── NotFoundView     (not-found.tsx 等价)  — 404 提示 + 返回首页按钮
├── ErrorView        (error.tsx 等价)      — 加载失败提示 + 重试按钮
├── EmptyProductsView                      — 暂无产品空状态
└── 正常内容
    ├── Header       — 图册名称、客户名、产品数、合作约定按钮
    ├── ProductSection × N  — 产品卡片 + SKU 价目表
    │   ├── ProductHeader  — 产品图片、标题、规格数
    │   └── SKU Table      — 规格 | 编号 | 基准价 | 客户价
    ├── AgreementModal     — 合作约定弹窗
    └── Footer             — 品牌标识
```

### 价格展示

| 列 | 来源 | 显示 |
|---|---|---|
| 基准价 (basePrice) | `productSkus.sellingPrice` | `¥xx.xx` 或 `—` |
| 客户价 (customerPrice) | `distributionSkuPrices.customerPrice` | `¥xx.xx`（绿色 Tag 图标，低于基准价时高亮）；无值时显示基准价 |

### 页面特性

- **全屏布局** — 使用 `fixed inset-0` 覆盖管理后台 sidebar/topbar，客户无需看到管理界面
- **Framer Motion 入场动效** — 产品卡片 fadeIn + slideUp
- **CSS 变量主题** — 跟随系统 `data-theme="light|dark"`
- **合作约定弹窗** — 点击 Header 中的按钮，以 Modal 形式查看 agreement HTML

---

## Part 3 — 联调验证

### 验证链路

```
1. 管理后台 → 创建 Distribution（选择客户 + 图册）
2. 管理后台 → 设置客户价格（修改 SKU 定价）
3. 管理后台 → 复制 publicUrl（格式: https://yutu.nv315.top/d/{distributionId}）
4. 浏览器 → 访问 /d/{distributionId}
5. 验证 → 产品正确显示 + 客户价格正确
```

### 验证清单

| # | 场景 | 预期结果 | 状态 |
|---|---|---|---|
| 1 | Distribution 存在且 active | 返回产品列表 + 客户定价 | ⬜ 待测试 |
| 2 | Distribution 不存在 | 显示 "图册不存在或已下架" | ⬜ 待测试 |
| 3 | Distribution 状态为 inactive | 返回 404 → 显示不存在页面 | ⬜ 待测试 |
| 4 | 无 customerPrice 的 SKU | 显示基准价 | ⬜ 待测试 |
| 5 | 无 basePrice 的 SKU | 显示 `—` | ⬜ 待测试 |
| 6 | 产品无图片 | 显示占位 Package 图标 | ⬜ 待测试 |
| 7 | SKU 有图片 | 表头显示缩略图 | ⬜ 待测试 |
| 8 | 点击 "合作约定" | 弹出 Modal 显示 HTML 内容 | ⬜ 待测试 |
| 9 | 网络错误 | 显示错误页 + 重试按钮 | ⬜ 待测试 |
| 10 | 加载中 | 显示旋转动画 + 加载提示 | ⬜ 待测试 |

### 启动命令

```bash
# 后端
cd pim-system/packages/backend
pnpm dev

# 前端
cd pim-system/packages/frontend
pnpm dev
```

后端监听 `http://localhost:8000`，前端监听 `http://localhost:5174`

### 已知限制 / 后续优化

| # | 问题 | 建议 |
|---|---|---|
| 1 | 公开 API 无访问频率限制 | Phase 3 添加 rate-limit 中间件 |
| 2 | 价格无货币单位切换 | 目前固定 CNY ¥ |
| 3 | 产品图片无懒加载 | 产品量大时需添加 loading="lazy" |
| 4 | Share API 无缓存 | 可添加 CDN/Redis 缓存层 |
| 5 | ECatalog URL 硬编码 localhost:8000 | 生产环境需使用 `import.meta.env` |
| 6 | 无访问统计 | 需要独立的 Share 访问日志表 |

---

## 变更文件清单

### Backend (5 文件)

| 文件 | 操作 |
|---|---|
| `src/modules/share/index.ts` | 新建 |
| `src/modules/share/share.service.ts` | 新建 |
| `src/modules/share/share.routes.ts` | 新建 |
| `src/index.ts` | 修改（注册 share 模块 + CORS 端口） |

### Frontend (4 文件)

| 文件 | 操作 |
|---|---|
| `src/pages/ECatalog.tsx` | 新建 |
| `src/app/App.tsx` | 修改（新增路由） |
| `src/api/types.ts` | 修改（新增 Share 类型） |
| `src/api/client.ts` | 修改（新增 Share API 调用） |

### 类型检查

- Backend `tsc --noEmit`: ✅ 通过
- Frontend `tsc --noEmit`: ✅ 通过
