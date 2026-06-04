# 项目发展时间线

> 按照文档时间戳整理的项目发展历程

---

## 2026-05 — 项目启动 & 基础建设

| 时间 | 里程碑 |
|---|---|
| 2026-05 | 产品方案 v7 制定 |
| 2026-05 | 完整开发文档 v3.6 编写 |
| 2026-05 | 数据库设计文档 v1.0 |
| 2026-05 | 字段清单 · 数据库设计参考 |
| 2026-05 | 素材分级系统数据库结构 v2.0 |

### 分阶段交付

| 阶段 | 内容 | 文档 |
|---|---|---|
| 第一阶段 | 前后端分离与数据库初始化 | [第一阶段交付文档](../delivery/第一阶段交付_前后端分离与数据库初始化.md) |
| 第二阶段 | 产品管理功能 | [第二阶段交付文档](../delivery/第二阶段交付_产品管理功能.md) |
| 第三阶段 | 基础 API 开发 | [第三阶段交付文档](../delivery/第三阶段交付_基础API开发.md) |
| 第四阶段 | 稳定层建设 | [第四阶段交付文档](../delivery/第四阶段交付_稳定层建设报告.md) |

---

## 2026-06 — Distribution 分享链路

| 时间 | 里程碑 |
|---|---|
| 2026-06-02 | Distribution Phase 1 — publicUrl 修复 + immutable 字段 |
| 2026-06-02 | Distribution Phase 2 — Share API + E-Catalog 前端页面 |
| 2026-06-03 | Distribution Share V1 验收 |
| 2026-06-03 | Distribution 数据一致性审计 V3 |
| 2026-06-03 | Distribution Production Hardening (9 Tasks) |
| 2026-06-03 | Distribution 最终验收 — 达到生产可用标准 |

### Phase 1

- 修复 `publicUrl` 格式：`yutu.nv315.top/d/{distributionId}`
- 禁止修改 `catalogId` / `customerId`
- 清理旧 DTO 和路由校验

文档：[Phase 1 Report](../development/distribution-phase1-report.md)

### Phase 2

- 实现 `GET /api/share/distributions/:id` 公开 API
- 开发 `/d/[distributionId]` E-Catalog 客户浏览页面
- 价格展示、协议查看

文档：[Phase 2 Report](../development/distribution-phase2-report.md)

### Production Hardening

- UUID 参数校验 (400)
- Update Strict Mode
- Publish 自动修复旧格式 URL
- publicUrl 历史迁移
- `show_customer_name` 商业信息保护
- E-Catalog 脱敏
- DistributionDrawer 配置项
- 审计工具脚本
- PATCH 空更新优化

文档：[Hardening Report](../delivery/distribution-production-hardening-report.md)

### 最终验收

- 审计: 100/100 健康度
- 9/9 publicUrl MATCH
- 0 orphan prices
- Share API 全通过
- 不可变字段全拦截

文档：[Final Acceptance Report](../delivery/distribution-final-acceptance-report.md)

---

## 当前状态

> Distribution 模块 — **生产可用，已进入维护阶段。**
>
> 不再开发新功能，仅保留缺陷修复和日常运营。
>
> 详见 [Distribution 最终验收报告](../delivery/distribution-final-acceptance-report.md)
