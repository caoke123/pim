# 雨图饰品 PIM 中台系统 — OpenCode 项目说明

## 项目目的
跨境电商产品信息管理中台。
从 Cloudflare R2 云存储同步产品数据（由素材分拣系统上传），
经运营/仓库补充完善后，导出至 Shopee/Temu/妙手ERP 等平台。

## 唯一事实来源
**PIM_开发文档_v3.0.md** 是本项目的 Single Source of Truth。
所有字段名、接口路径、数据结构必须与该文档严格一致。
遇到任何字段定义疑问，以该文档为准，不要自行发明字段名。

## 技术栈
- Monorepo：pnpm workspaces（packages/shared、backend、frontend）
- 共享类型：packages/shared/types（前后端共用，不要重复定义类型）
- 后端：Node.js 20 + Hono 4 + Drizzle ORM + PostgreSQL 16
- 前端：React 18 + Vite 5 + Tailwind CSS 3 + Zustand 4
- 云存储：Cloudflare R2（@aws-sdk/client-s3，S3 兼容）
- 任务队列：BullMQ + Redis（R2 定时同步任务）
- 容器化：Docker Compose（postgres + redis + backend + frontend）

## 项目结构关键说明
- packages/shared/types/：所有 TypeScript 类型定义，前后端共用
  修改类型前先确认前后端影响范围
- packages/backend/src/db/schema.ts：Drizzle 表结构，数据库的唯一定义
  修改 schema 后必须执行 pnpm db:generate 生成迁移文件
- packages/backend/src/services/sync.ts：R2 同步核心逻辑
  product.json 字段到数据库字段的映射在此维护，不要分散
- packages/frontend/src/lib/api.ts：所有 API 请求统一在此封装
  前端组件通过此文件调用接口，不要在组件内直接写 fetch

## 数据库规范
- 表名：snake_case 复数（products, product_skus, sync_logs）
- 字段名：snake_case（product_no, r2_synced_at）
- API/前端：camelCase（productNo, r2SyncedAt）
- 转换层：在 Hono 路由的响应处理中做 snake_case → camelCase 转换
- 所有时间字段使用 TIMESTAMPTZ（带时区）
- 主键统一使用 UUID

## API 规范
- 统一前缀：/api/v1
- 响应格式：{ data: T, error?: string, meta?: object }
- 分页响应：{ data: { items: T[], total, page, pageSize } }
- 错误时 HTTP 状态码与 error 字段同时返回
- 字段名在 JSON 响应中使用 camelCase

## UI 规范
- 主色：#4c6ef5（与素材分拣系统保持一致）
- 页面背景：#f8f9fa，卡片白色
- 边框：1px solid #e9ecef，圆角 6px/8px
- 字体：系统中文字体，正文 13px，标题 16px
- 图标：Lucide React（不引入其他图标库）
- 状态标签：pending=灰色 / active=绿色 / archived=线框灰

## R2 同步规范
- 同步时字段保护：running.updated_at > r2_synced_at 时不覆盖
  运营/仓库已填字段（selling_price/stock/barcode/platform_title）
  不被 R2 重新同步覆盖
- product.json 必须包含 r2 字段才会同步（无 r2 字段的跳过）
- 同步结果写入 sync_logs 表

## 当前开发阶段
- [x] STEP 1 项目初始化（monorepo + Docker Compose 环境）
- [x] STEP 2 数据库 Schema 定义（Drizzle）+ 迁移脚本
- [x] STEP 3 R2 扫描服务
- [x] STEP 4 数据同步逻辑
- [x] STEP 5 产品 API + 同步 API
- [x] STEP 6 产品列表页
- [x] STEP 7 产品详情页
- [x] STEP 8 Dashboard 首页
- [x] STEP 9 同步中心页
- [x] STEP 10 全局布局组件
- [x] STEP 11-12 SKU 更新 API + 平台信息 CRUD API
- [x] STEP 13 前端 api.ts 补充 SKU/平台/导出接口
- [x] STEP 14-16 产品详情页完善（状态管理/批量保存/平台配置Tab）
- [x] STEP 17 验收：编辑后刷新持久化、同步不覆盖已填字段
- [x] STEP 18-19 导出服务（exceljs+基类+Shopee/Temu/妙手ERP）
- [x] STEP 20 导出 API 路由（POST /exports/:platform + GET /records）
- [x] STEP 21-22 导出中心前端（平台选择/产品多选/下载/历史）
- [ ] 第四阶段 STEP 24-27：分销商体系

## 代码规范
- 所有注释使用中文
- 函数和变量命名使用英文
- 不使用 any，所有类型从 @yuntu/shared 引入
- 每个文件顶部写明该文件的职责注释
- 不要在一次提交中修改超过 3 个文件

## 开发顺序原则
每次只做一件明确的事，完成并验证后再进行下一步。
不要跳步骤，不要提前实现后续阶段的功能。
