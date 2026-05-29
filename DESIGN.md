---
name: 雨图PIM 双主题
light: design/DESIGN-light.md
dark: design/DESIGN-dark.md
---

## 使用规则

浅色模式 `[data-theme="light"]`：
- 遵循 design/DESIGN-light.md 的 Stripe 色彩体系
- 背景白色系，主强调色 #635BFF（Stripe Purple）
- 有阴影（shadow-sm/md），卡片用 border + shadow 构建层级

深色模式 `[data-theme="dark"]`：
- 遵循 design/DESIGN-dark.md 的 Linear 色彩体系
- 背景极暗蓝黑 #0D0F14，主强调色 #7C6AF5（Linear Purple）
- 无阴影，用 border 构建层级

## 共同约束

两套主题均适用：
- 全站中文化，技术字段 SPU/SKU/ItemId 保留英文
- Sidebar 宽度 240px，必须 Icon + 中文标签
- 在线状态点使用慢速呼吸动效（4s ease-in-out），禁止 animate-ping
- 首页禁止出现 PostgreSQL/Redis/Cloudflare R2/CDP/Pool 等基础设施信息
- 平台状态 Chips：绿=已发布，黄=发布中，灰=未发布，红=失败
- 所有颜色必须使用 CSS custom properties，禁止硬编码 hex
