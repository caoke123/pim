# 雨图饰品 PIM 中台 — Agent 上下文 v7.0

## 项目定位
产品资产管理平台（PIM）。
核心资产：产品 / SKU / 图片 / 价格 / 平台发布状态。
不是 DevOps 工具，不是监控台，不是基础设施面板。

## 技术栈
- Framework: React 18 + Vite 5 + TypeScript
- CSS: Tailwind CSS 3 + CSS custom properties
- 图标: Lucide React（outline 系列）
- 动效: Framer Motion + CSS @keyframes
- 状态: Zustand + TanStack Query

## 设计系统（最高优先级）
- 主文件：DESIGN.md（根目录）
- 浅色参考：design/DESIGN-light.md（Stripe 风格）
- 深色参考：design/DESIGN-dark.md（Linear 风格）
- 主题切换：html[data-theme="light|dark"] 控制
- 所有颜色必须用 CSS custom properties（var(--xxx)），禁止硬编码 hex

## 核心模块
1. 工作台（首页）：搜索 + 统计卡片 + 商品网格 + 实时动态 + 待处理
2. 产品库：商品列表、筛选、搜索、批量操作
3. 发布中心：平台对接、发布队列、状态监控
4. 素材中心：图片管理、分类、审核流程
5. 数据中心：产品统计、平台数据报表
6. 同步中心：平台数据同步任务管理
7. 日志中心：业务操作日志（非系统技术日志）
8. 系统设置：平台账号配置、团队管理

## 设计红线（绝对禁止）
- 首页出现 PostgreSQL / Redis / Cloudflare R2 / CDP / Pool / Agent Process
- animate-ping 或任何快速闪烁的状态动效
- 纯英文业务术语（SPU/SKU/ItemId 技术缩写除外）
- 纯图标 Sidebar（必须 Icon + 中文标签，宽度 240px）
- 价格信息隐藏在 meta 区域
- 硬编码颜色 hex 值（必须用 CSS token）

## 动效规范
- 在线状态指示：breathe 动效，4s ease-in-out，无限循环
- 组件 Hover：shadow 出现 + translateY(-2px)，200ms ease
- 主题切换：所有颜色 token 200ms ease 过渡
- 禁止：animate-ping / 任何 >300ms loading 遮罩 / 快速闪烁

## 语言规范
全站中文。技术字段 SPU / SKU / ItemId 保留英文缩写。
