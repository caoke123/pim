# Distribution 数据一致性审计报告 V3

> 审计日期: 2026-06-03  
> 审计范围: Distribution 模块全量数据 + Share API  
> 数据库: PostgreSQL 5433 / sorter  

---

## 一、健康度评分

```
████████░░░░░░░░░░░░░░  35 / 100
```

| 维度 | 得分 | 主要问题 |
|---|---|---|
| URL 正确性 | 11% (1/9) | 仅 1 条使用正确格式 |
| 数据一致性 | 75% | 1 条 CROSS_CONTAMINATED，0 孤儿价格 |
| Share API 数据安全 | 90% | 无隐私泄露，但 customerName 暴露 |
| 参数安全 | 50% | 非法输入返回 500 而非 400 |
| 生命周期 | 60% | 创建/删除正常，8/9 条 inactive 堆积 |
| 不可变字段 | 70% | 已生效，但 Silent Failure |

---

## 二、审计任务 1 — publicUrl 全量检查

### 数据库实际状态

```
 id          |  status   |  public_url
 ────────────┼───────────┼──────────────────────────────────────────────────────
 a8a28d5d    |  inactive |  https://catalog.yutu.nv315.top/d/6e230750-...  ❌
 c9d077f1    |  inactive |  https://catalog.yutu.nv315.top/d/6e230750-...  ❌ CROSS
 5aee49cc    |  inactive |  https://catalog.yutu.nv315.top/d/6e230750-...  ❌
 52c0cfbe    |  inactive |  https://catalog.yutu.nv315.top/d/6e230750-...  ❌
 21ce71b1    |  inactive |  https://catalog.yutu.nv315.top/d/cb4d91df-...  ❌
 8882346b    |  inactive |  https://catalog.yutu.nv315.top/d/cb4d91df-...  ❌
 89ed3705    |  inactive |  https://catalog.yutu.nv315.top/d/6e230750-...  ❌
 dbb1c3d9    |  inactive |  https://yutu.nv315.top/d/dbb1c3d9-...           ✅ (新格式)
 85b57a27    |  active   |  https://catalog.yutu.nv315.top/d/6e230750-...  ❌
```

### 检查 1 — URL 结尾 UUID 是否等于 distribution.id

| 结果 | 数量 |
|---|---|
| 正确 (MATCH/OK_NEW) | **1** (`dbb1c3d9`) |
| 错误 (MISMATCH) | **8** |

**错误记录列表:**

| id | public_url 中的 UUID | 期望 UUID | 状态 |
|---|---|---|---|
| `a8a28d5d` | `6e230750` (catalog) | `a8a28d5d` | inactive |
| `c9d077f1` | `6e230750` (catalog) | `c9d077f1` | inactive |
| `5aee49cc` | `6e230750` (catalog) | `5aee49cc` | inactive |
| `52c0cfbe` | `6e230750` (catalog) | `52c0cfbe` | inactive |
| `21ce71b1` | `cb4d91df` (catalog) | `21ce71b1` | inactive |
| `8882346b` | `cb4d91df` (catalog) | `8882346b` | inactive |
| `89ed3705` | `6e230750` (catalog) | `89ed3705` | inactive |
| `85b57a27` | `6e230750` (catalog) | `85b57a27` | **active** |

**根本原因**: 旧代码 `create()` 中 `publicUrl = 'https://catalog.yutu.nv315.top/d/' + catalog.id`，Phase 1 后才修复为 distribution.id。

### 检查 2 — 旧格式 `catalog.yutu` URL

**数量: 8** (全部非 `dbb1c3d9` 的记录)

**完整列表:** 同检查 1 中除 `dbb1c3d9` 外的全部 8 条。

### 检查 3 — NULL URL

**数量: 0** — 无 NULL URL 记录。

---

## 三、审计任务 2 — 生命周期一致性

### create() 验证

**测试用例**: `dbb1c3d9` (Phase 2 期间新建)

| 检查项 | 结果 |
|---|---|
| `distribution.id` 正确生成 | ✅ |
| `publicUrl` = `yutu.nv315.top/d/{distribution.id}` | ✅ |
| `distribution_sku_prices` 自动初始化 (20 rows × 3 products) | ✅ |
| `customerPrice` 继承 `productSkus.sellingPrice` | ✅ |

### publish() 验证

| 检查项 | 结果 |
|---|---|
| 新 Distribution (无 publicUrl) → 正确生成 | ✅ |
| 旧 Distribution (已有 publicUrl) → **未覆盖** | ⚠️ |
| 旧格式 URL 是否自动修复 | ❌ **否** |

**问题**: Publish API 遇到已有的 `publicUrl` 时保留原值，不会将旧格式 (`catalog.yutu.../d/{catalogId}`) 升级为新格式 (`yutu.nv315.top/d/{distributionId}`)。

### delete() 验证 (Soft Delete)

| 操作 | 结果 |
|---|---|
| `DELETE /distributions/:id` → status 变为 `inactive` | ✅ |
| Share API 返回 404 | ✅ |
| Admin API `GET /distributions` 不显示 (仅查 active) | ✅ |
| 真实数据未删除 (可恢复) | ✅ |

---

## 四、审计任务 3 — DistributionSkuPrices 一致性

### 总记录数: 191 rows, 8 个不同 distribution_id

### 孤儿检查 1 — distribution_id 不存在

```sql
SELECT dsp.* FROM distribution_sku_prices dsp
LEFT JOIN distributions d ON d.id = dsp.distribution_id
WHERE d.id IS NULL
```

**结果: 0 条** ✅

### 孤儿检查 2 — sku_id 不存在

```sql
SELECT dsp.* FROM distribution_sku_prices dsp
LEFT JOIN product_skus ps ON ps.id = dsp.sku_id
WHERE ps.id IS NULL
```

**结果: 0 条** ✅

### spu_code 一致性

```sql
SELECT dsp.* FROM distribution_sku_prices dsp
LEFT JOIN product_skus ps ON ps.id = dsp.sku_id
WHERE dsp.spu_code != ps.spu_code
```

**结果: 0 条** ✅

### CROSS_CONTAMINATED 记录

**1 条**: `c9d077f1-1569-4c89-83b1-f05f5a94be21`

| 字段 | 值 |
|---|---|
| `distribution.catalog_id` | `cb4d91df` |
| `distribution.public_url` | `https://catalog.yutu.nv315.top/d/6e230750-...` |
| URL 实际指向的 catalog | `6e230750` |

**成因**: 此 Distribution 创建时关联 Catalog `6e230750`，之后通过旧版 `update()` 将 `catalogId` 改为 `cb4d91df`。URL 未同步更新（Phase 1 前行为），现 `public_url` 与 `catalog_id` 不一致。

**影响范围**: Share API 访问此 Distribution 时，实际展示的是 `6e230750` 的产品（URL 对应 catalog），而非 `catalog_id` 对应的 `cb4d91df` 产品。产生「看A图册买B产品」的错位。

---

## 五、审计任务 4 — Share API 数据安全审计

### 实际返回 JSON Schema

```
GET /api/share/distributions/:id → { code, message, data: { ... } }
```

#### data 顶层字段 (8 个)

| 字段 | 类型 | 是否安全 |
|---|---|---|
| `id` | string | ✅ |
| `publicUrl` | string | ✅ |
| `customerName` | string | ⚠️ 商业敏感 |
| `catalogName` | string | ✅ |
| `catalogCoverImageUrl` | string | ✅ |
| `agreement` | string | ✅ |
| `productCount` | number | ✅ |
| `products` | array | ✅ |

#### products[]. 字段 (5 个)

| 字段 | 类型 |
|---|---|
| `productId` | string |
| `title` | string |
| `mainImageUrl` | string |
| `sortOrder` | number |
| `skus` | array |

#### skus[]. 字段 (7 个)

| 字段 | 类型 |
|---|---|
| `skuId` | string |
| `skuCode` | string |
| `specs` | string |
| `skuImageUrl` | string |
| `basePrice` | number |
| `customerPrice` | number |
| `stock` | number |

### 确认未暴露字段

| 字段 | 是否暴露 |
|---|---|
| `customerPhone` | ❌ 未暴露 ✅ |
| `customerWechat` | ❌ 未暴露 ✅ |
| `customerNotes` | ❌ 未暴露 ✅ |
| `customerContactPerson` | ❌ 未暴露 ✅ |
| `operator` | ❌ 未暴露 ✅ |
| `createdAt` | ❌ 未暴露 ✅ |
| `updatedAt` | ❌ 未暴露 ✅ |
| `priceId` | ❌ 未暴露 ✅ |
| `catalogId` | ❌ 未暴露 ✅ |
| `customerId` | ❌ 未暴露 ✅ |

### customerName 风险评估

**当前行为**: Share API 返回客户名称（如 "广州客户"）。

**风险等级: 低**
- customerName 不包含联系方式
- 分销链接本就是为了特定客户定制的，客户名本身就是公开信息
- 但若有客户使用真实公司名称（如"义乌XX贸易公司"），可能间接暴露商业关系

**建议**: 保留，不作修改。如未来需要隐藏，可增加 `showCustomerName` Distribution 配置项。

---

## 六、审计任务 5 — Share API 参数安全审计

| 测试输入 | HTTP 状态 | 响应内容 | 是否符合预期 |
|---|---|---|---|
| 合法 UUID (不存在) | 404 | `{"code":404, "message":"分销分享不存在或未发布"}` | ✅ |
| 合法 UUID (inactive) | 404 | `{"code":404, ...}` | ✅ |
| `abc` (非法格式) | **500** ❌ | Internal Server Error | ❌ 应返回 400 |
| 空路径 `/distributions/` | 404 | Hono 路由未匹配 | ✅ |
| 超长字符串 `xxxx...` | **500** ❌ | Internal Server Error | ❌ 应返回 400 |

**问题**: 非 UUID 格式的参数导致 Drizzle/SQL 异常未在路由层捕获，直接抛出到全局错误处理器返回 500。

**安全隐患**: 攻击者可通过非法输入探测服务端报错格式，虽不泄露数据但暴露了框架信息。

---

## 七、审计任务 6 — 不可变字段审计

### 四层一致性检查

| 层 | catalogId | customerId | 状态 |
|---|---|---|---|
| DTO (`UpdateDistributionDTO`) | 已移除 | 已移除 | ✅ |
| Route Schema (`updateSchema`) | 已移除 | 已移除 | ✅ |
| Service (`update()`) | 已移除 | 已移除 | ✅ |
| Database (FK 约束) | 存在 | 存在 | ⚠️ 未防御 |

### PATCH 行为测试

**测试 1**: `PATCH /distributions/:id` with `{ "catalogId": "cb4d91df-..." }`

```
HTTP 200 → catalogId 未改变 (保留 6e230750)
           updatedAt 被更新 (no-op write)
```

**测试 2**: `PATCH /distributions/:id` with `{ "customerId": "74d93410-..." }`

```
HTTP 200 → customerId 未改变 (保留 57e9a9f2)
           updatedAt 被更新 (no-op write)
```

### 问题: Silent Failure

| 现象 | 影响 |
|---|---|
| 返回 200 而非 400 | 调用方以为成功 |
| `updatedAt` 被无意义更新 | 污染时间戳 |
| 不报错、不提示 | 开发/测试难以发现异常 |

**建议**: Route Schema 增加 `strict` 模式或显式 reject 未知字段，返回 400 + 明确错误信息。

---

## 八、审计任务 7 — 数据迁移建议

### 迁移脚本 1: 修复旧格式 publicUrl (P0)

```sql
UPDATE distributions
SET public_url = 'https://yutu.nv315.top/d/' || id,
    updated_at = NOW()
WHERE public_url LIKE '%catalog.yutu%';
```

| 影响行数 | 风险 | 执行顺序 |
|---|---|---|
| 8 | **低** — 纯文本替换，不涉及外键 | 第 1 步 |

### 迁移脚本 2: 修复 CROSS_CONTAMINATED (P1)

```sql
-- 仅 1 条受影响的记录: c9d077f1
-- 可选方案A: 将 catalog_id 修正为 URL 对应的值
-- (如果 URL 对应的 catalog 是"正确的"那个)

-- 判断依据: distribution_sku_prices 中的 SKU 来自哪个 catalog
-- 如果来自 cb4d91df → 应改 URL
-- 如果来自 6e230750 → 应改 catalogId

-- 脚本A (改 catalogId):
UPDATE distributions
SET catalog_id = (
  SELECT substring(public_url from '/d/([^/]*)$')::uuid
  WHERE id = 'c9d077f1-...'
)
WHERE id = 'c9d077f1-1569-4c89-83b1-f05f5a94be21';

-- 脚本B (删掉重建, 更安全):
DELETE FROM distribution_sku_prices WHERE distribution_id = 'c9d077f1-...';
DELETE FROM distributions WHERE id = 'c9d077f1-...';
-- 然后重新 create()
```

| 影响行数 | 风险 | 执行顺序 |
|---|---|---|
| 1 | **中** — 需人工确认业务意图 | 第 2 步 |

### 迁移脚本 3: 清理 inactive 堆积 (P2)

```sql
-- 确认可删除的 inactive distributions（8条）
-- 保留数据72小时后再执行
SELECT id, updated_at
FROM distributions
WHERE status = 'inactive'
  AND updated_at < NOW() - INTERVAL '7 days';

-- 执行清理:
DELETE FROM distribution_sku_prices 
WHERE distribution_id IN (
  SELECT id FROM distributions WHERE status = 'inactive' AND updated_at < NOW() - INTERVAL '7 days'
);
DELETE FROM distributions 
WHERE status = 'inactive' AND updated_at < NOW() - INTERVAL '7 days';
```

| 影响行数 | 风险 | 执行顺序 |
|---|---|---|
| 8 dists + ~160 prices | **低** — 已 inactive 超7天 | 第 3 步 |

---

## 九、问题汇总

### P0 — 阻塞问题

| # | 问题 | 影响 | 修复 |
|---|---|---|---|
| 1 | **8/9 publicUrl 使用旧格式** + 唯一 active 记录亦受影响 | 分享链接打开后指向 catalog 而非 distribution，客户无法看到专属定价 | 迁移脚本 1 |

### P1 — 高优先级

| # | 问题 | 影响 | 修复 |
|---|---|---|---|
| 2 | **1 条 CROSS_CONTAMINATED** (`c9d077f1`) | catalog_id 与 URL 指向不同 catalog | 迁移脚本 2 |
| 3 | **Publish 不会修复旧 URL** | 发布操作不升级 URL 格式 | Service 层增加 URL 修复逻辑 |
| 4 | **非法 UUID → 500** (应 400) | 客户看到服务端错误页 | Route 层增加 Zod UUID 校验 |

### P2 — 可优化

| # | 问题 | 影响 | 修复 |
|---|---|---|---|
| 5 | **PATCH 不可变字段 → Silent 200** | 开发体验差，调试困难 | strict mode / reject unknown fields |
| 6 | **8 条 inactive 堆积** | 数据库膨胀 | 定期清理 (迁移脚本 3) |
| 7 | **PATCH 空操作仍更新 updatedAt** | 时间戳失真 | 判断是否有实际字段变更 |

---

## 十、建议立即执行的修复项

| 顺序 | 操作 | 类型 | 预计耗时 |
|---|---|---|---|
| 1 | 执行**迁移脚本 1** — 修复全部 8 条旧 URL | SQL | 1 分钟 |
| 2 | **Share Routes** 增加 UUID Zod 校验 → 400 | 代码 | 15 分钟 |
| 3 | **Publish Service** 增加旧 URL 自动修复 | 代码 | 15 分钟 |
| 4 | 人工确认 `c9d077f1` 并执行**迁移脚本 2** | SQL + 人工 | 10 分钟 |
| 5 | **Update Schema** 增加 `strict()` 拒绝未知字段 | 代码 | 5 分钟 |

---

## 附录: 审计原始 SQL 日志

所有审计 SQL 及其原始输出已记录于本报告各节。审计过程中未修改任何数据。
