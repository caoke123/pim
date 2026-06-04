# Distribution Production Hardening Report

> 日期: 2026-06-03  
> 任务: 9 tasks, all completed  
> 类型: 数据一致性 · 安全加固 · 历史债务清理

---

## 1. 修改文件列表

### Backend (7 files)

| 文件 | 操作 | 关联 Task |
|---|---|---|
| `src/modules/share/share.routes.ts` | 修改 | Task 1 |
| `src/modules/distributions/distributions.routes.ts` | 修改 | Task 2, 5 |
| `src/modules/distributions/distributions.service.ts` | 修改 | Task 3, 5, 7, 9 |
| `src/modules/share/share.service.ts` | 修改 | Task 5 |
| `src/shared/db/schema.ts` | 修改 | Task 5 |
| `drizzle/0001_fix_distribution_public_url.ts` | 新增 | Task 4 |
| `scripts/audit-distribution-consistency.ts` | 新增 | Task 8 |

### Frontend (5 files)

| 文件 | 操作 | 关联 Task |
|---|---|---|
| `src/api/types.ts` | 修改 | Task 5, 6 |
| `src/api/client.ts` | 修改 | Task 5, 7 |
| `src/pages/ECatalog.tsx` | 修改 | Task 6 |
| `src/components/DistributionDrawer.tsx` | 修改 | Task 7 |

### App Entry (1 file)

| 文件 | 操作 | 关联 Task |
|---|---|---|
| `src/index.ts` | 修改 | Phase 2 (CORS) |

---

## 2. 数据库变更

| 变更 | SQL |
|---|---|
| 新增列 | `ALTER TABLE distributions ADD COLUMN show_customer_name BOOLEAN NOT NULL DEFAULT FALSE;` |

---

## 3. API 变更

### Share API

| 端点 | 变更 |
|---|---|
| `GET /api/share/distributions/:id` | 新增 UUID 校验 → 非法 UUID 返回 400 |
| `GET /api/share/distributions/:id` | `customerName` 从 `string` 改为 `string \| null` |

### Admin API

| 端点 | 变更 |
|---|---|
| `PATCH /api/v1/distributions/:id` | `updateSchema` 增加 `.strict()` → 未知字段返回 400 |
| `PATCH /api/v1/distributions/:id` | 新增 `showCustomerName` 可选字段 |
| `PATCH /api/v1/distributions/:id` | 无有效字段变更时不再写 DB (空 NOOP 优化) |
| `POST /api/v1/distributions` | `createSchema` 新增 `showCustomerName` 可选字段 |
| `POST /api/v1/distributions/:id/publish` | 旧格式 URL 自动升级 |
| `GET /api/v1/distributions/:id` | 返回新增 `showCustomerName` 字段 |

---

## 4. 前端变更

| 组件 | 变更 |
|---|---|
| `ECatalog` | Header: `customerName` 为 null 时显示"专属产品目录" |
| `DistributionDrawer` | CustomerTab 新增"显示客户名称" Switch toggle |
| `api/types.ts` | `DistributionDetail` / `ShareDistributionResponse` 新增 `showCustomerName` |
| `api/client.ts` | `createDistribution` / `updateDistribution` 类型新增 `showCustomerName` |

---

## 5. Migration 脚本

### 001 — Fix Distribution publicUrl

**文件:** `drizzle/0001_fix_distribution_public_url.ts`

```sql
UPDATE distributions
SET public_url = 'https://yutu.nv315.top/d/' || id,
    updated_at = NOW()
WHERE public_url LIKE '%catalog.yutu%'
RETURNING id, public_url;
```

执行方式：
```bash
npx tsx drizzle/0001_fix_distribution_public_url.ts
```

### Audit Tool

**文件:** `scripts/audit-distribution-consistency.ts`

执行方式：
```bash
npx tsx scripts/audit-distribution-consistency.ts
```

---

## 6. 风险分析

| Task | 风险 | 缓解 |
|---|---|---|
| 1 | 无。原 500 → 400，向前兼容 | — |
| 2 | 现有 `PATCH` 调用方若发送未知字段会 400 | 已审查前端 client.ts，仅发送合法字段 |
| 3 | Publish 后 URL 变变更可能影响已分享链接 | 新 URL 格式正确，旧链接原已不可用 |
| 5 | 新增 `show_customer_name` 列，default false | 所有现有记录自动设为 false (保守) |
| 6 | ECatalog 前端依赖类型变化 | TypeScript 编译通过 |
| 7 | CustomerTab 新增 API 调用路径 | 仅在用户主动切换时触发 |
| 9 | NOOP 返回现有行而非 null | 调用方已有 null check |

---

## 7. 测试清单

| # | 场景 | 预期 | 结果 |
|---|---|---|---|
| 1 | Share API `abc` UUID | 400 Bad Request | ✅ |
| 2 | Share API `123` UUID | 400 Bad Request | ✅ |
| 3 | Share API 合法 UUID (不存在) | 404 Not Found | ✅ |
| 4 | PATCH `{catalogId:"xxx"}` | 400 Bad Request | ✅ |
| 5 | PATCH `{customerId:"xxx"}` | 400 Bad Request | ✅ |
| 6 | PATCH `{foo:"bar"}` | 400 Bad Request | ✅ |
| 7 | Publish 旧格式 URL | 自动升级为新格式 | ✅ |
| 8 | Create + showCustomerName:false | Share API → customerName:null | ✅ |
| 9 | PATCH showCustomerName:true | Share API → customerName:"广州客户" | ✅ |
| 10 | PATCH showCustomerName:false | Share API → customerName:null | ✅ |
| 11 | ECatalog Header (null name) | 显示"专属产品目录" | ✅ |
| 12 | PATCH {} (空) | 不写 DB, updatedAt 不变 | ✅ |
| 13 | DistributionDrawer toggle | 点击切换, toast 确认 | ✅ |
| 14 | DistributionDetail 含 showCustomerName | Admin API 返回字段 | ✅ |

---

## 8. TypeScript 检查结果

```
Backend:  tsc --noEmit → ✅ 通过
Frontend: tsc --noEmit → ✅ 通过
```

---

## 9. 建议下一阶段任务

| 优先级 | 任务 |
|---|---|
| P1 | 执行 `0001_fix_distribution_public_url.ts` 迁移修复剩余 7 条旧 URL |
| P1 | 修复 `c9d077f1` CROSS_CONTAMINATED 记录 |
| P2 | 执行 `scripts/audit-distribution-consistency.ts` 纳入 CI |
| P2 | 清理 7 条 inactive 超过 7 天的 distribution |
| P3 | 为 `showCustomerName` 增加 Distribution List 列 |
| P3 | ECatalog 增加访问日志 (view counter) |
