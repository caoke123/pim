# 雨图饰品 PIM 中台系统
# 完整设计指导方案 v7.0
# Stripe（浅色）× Linear（深色）双主题

---

## 第一部分：设计系统决策

### 主题策略

| 模式 | 参考品牌 | 核心气质 |
|------|---------|---------|
| ☀️ 浅色模式 | Stripe | 亮白底·紫色强调·weight-300 优雅·金融级专业感 |
| 🌙 深色模式 | Linear | 极暗蓝黑·紫色微发光·工程极简·高级工具感 |

两套主题共用：同一套组件结构、同一套中文文案、同一套业务逻辑，仅 CSS token 层切换。

---

## 第二部分：设计 Token 规范

### 2.1 颜色系统（双主题）

```css
/* ===== 浅色模式（Stripe 风格）===== */
:root, [data-theme="light"] {

  /* 背景层级 */
  --bg-base:        #FFFFFF;
  --bg-surface:     #F6F9FC;
  --bg-elevated:    #FFFFFF;
  --bg-subtle:      #F0F4FF;

  /* 文字层级 */
  --text-primary:   #0A2540;
  --text-secondary: #425466;
  --text-tertiary:  #8898AA;
  --text-inverse:   #FFFFFF;

  /* 强调色（Stripe Purple）*/
  --accent:         #635BFF;
  --accent-hover:   #4F46E5;
  --accent-soft:    #EDE9FE;

  /* 边框 */
  --border-default: rgba(0, 0, 0, 0.08);
  --border-strong:  rgba(0, 0, 0, 0.16);

  /* 状态色 */
  --success:        #09825D;
  --success-bg:     #D3F8EE;
  --warning:        #B54708;
  --warning-bg:     #FEF0C7;
  --danger:         #C01048;
  --danger-bg:      #FFE4E8;
  --info:           #0369A1;
  --info-bg:        #E0F2FE;

  /* 平台状态 */
  --status-live:    #09825D;
  --status-pending: #B54708;
  --status-idle:    #8898AA;
  --status-error:   #C01048;

  /* 阴影 */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.10);
}

/* ===== 深色模式（Linear 风格）===== */
[data-theme="dark"] {

  /* 背景层级 */
  --bg-base:        #0D0F14;
  --bg-surface:     #13151C;
  --bg-elevated:    #1C1F2A;
  --bg-subtle:      #1E2133;

  /* 文字层级 */
  --text-primary:   #F0F0F5;
  --text-secondary: #9899A6;
  --text-tertiary:  #5C5D6E;
  --text-inverse:   #0D0F14;

  /* 强调色（Linear Purple）*/
  --accent:         #7C6AF5;
  --accent-hover:   #9B8FF7;
  --accent-soft:    #1E1B3A;

  /* 边框（深色用 border 构建层级，不用阴影）*/
  --border-default: rgba(255, 255, 255, 0.07);
  --border-strong:  rgba(255, 255, 255, 0.14);

  /* 状态色（深色下低饱和）*/
  --success:        #34C78A;
  --success-bg:     #0D2E21;
  --warning:        #F59E0B;
  --warning-bg:     #2D1F08;
  --danger:         #F87171;
  --danger-bg:      #2D0E0E;
  --info:           #60A5FA;
  --info-bg:        #0E1E35;

  /* 平台状态 */
  --status-live:    #34C78A;
  --status-pending: #F59E0B;
  --status-idle:    #5C5D6E;
  --status-error:   #F87171;

  /* 深色模式无阴影，用 border 替代 */
  --shadow-sm: none;
  --shadow-md: none;
  --shadow-lg: none;
}
```

### 2.2 字体 / 间距 / 圆角

```css
/* 字体 */
--font-sans: "Inter", "SF Pro Display", -apple-system, sans-serif;
--font-mono: "JetBrains Mono", "SF Mono", monospace;

/* 字号 Scale */
--text-xs:   11px;
--text-sm:   13px;
--text-base: 14px;
--text-md:   16px;
--text-lg:   20px;
--text-xl:   24px;
--text-2xl:  32px;

/* 字重 */
--weight-regular:  400;
--weight-medium:   500;
--weight-semibold: 600;  /* 仅价格数字 */

/* 字距 */
--tracking-tight:  -0.4px;   /* 标题、大数字 */
--tracking-wide:    0.4px;   /* 全大写标签 */

/* 间距（4px 基准）*/
--space-1: 4px;   --space-2: 8px;
--space-3: 12px;  --space-4: 16px;
--space-5: 20px;  --space-6: 24px;
--space-8: 32px;  --space-10: 40px;
--space-12: 48px;

/* 圆角 */
--radius-sm:   6px;
--radius-md:   8px;
--radius-lg:   12px;
--radius-xl:   16px;
--radius-full: 9999px;
```

### 2.3 动效规范

```css
/* 全局过渡 */
--transition-fast: 150ms ease;
--transition-base: 200ms ease;
--transition-slow: 300ms ease;

/* 主题切换：颜色丝滑过渡 */
*, *::before, *::after {
  transition:
    background-color 200ms ease,
    border-color     200ms ease,
    color            150ms ease;
}
.status-dot-live { transition: none; }  /* 排除呼吸动效 */

/* 在线状态慢速呼吸（禁止用 animate-ping 替代）*/
@keyframes breathe {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50%       { opacity: 0.9; transform: scale(1.08); }
}
.status-dot-live {
  animation: breathe 4s ease-in-out infinite;
}
```

---

## 第三部分：主题切换实现

### HTML 根节点

```html
<html data-theme="light">
```

### JS 切换逻辑

```js
// 初始化（读取 localStorage → 系统偏好 → 默认 light）
const saved = localStorage.getItem('pim-theme');
const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
document.documentElement.dataset.theme = saved ?? (sysDark ? 'dark' : 'light');

// 切换
function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('pim-theme', next);
}
```

### React Hook 版本

```tsx
function useTheme() {
  const [theme, setThemeState] = useState<'light'|'dark'>(() => {
    const saved = localStorage.getItem('pim-theme');
    if (saved) return saved as 'light'|'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const setTheme = (t: 'light'|'dark') => {
    document.documentElement.dataset.theme = t;
    localStorage.setItem('pim-theme', t);
    setThemeState(t);
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return { theme, toggleTheme: () => setTheme(theme === 'light' ? 'dark' : 'light') };
}
```

### Tailwind v4 适配

```css
@custom-variant dark (&:where([data-theme="dark"] *));
```

---

## 第四部分：全站中文化对照表

| 英文 | 中文 |
|------|------|
| Dashboard / Command Center | 工作台 |
| Event Stream | 实时动态 |
| Queue | 发布队列 |
| ONLINE | 在线运行 |
| Published | 已发布 |
| Pending | 发布中 |
| Failed | 发布失败 |
| Draft | 草稿 |
| Sync | 同步 |
| Settings | 系统设置 |
| Logs | 操作日志 |
| Agent | 本地节点 |
| Platform | 发布平台 |
| ItemId | 平台商品ID |

**规则：SPU / SKU / ItemId 等技术缩写保留英文，其余全部中文。**

---

## 第五部分：给 OpenCode 的提示词（全套）

---

### 【STEP 0】初始化：让 OpenCode 自动配置双主题 DESIGN.md

**直接粘贴给 OpenCode 执行：**

```
请帮我初始化雨图 PIM 的双主题设计系统，执行以下步骤：

第一步：在项目根目录创建 design/ 文件夹。

第二步：运行以下命令拉取两套设计系统：

curl -fsSL \
  https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/stripe/DESIGN.md \
  -o design/DESIGN-light.md

curl -fsSL \
  https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/linear.app/DESIGN.md \
  -o design/DESIGN-dark.md

第三步：在项目根目录创建 DESIGN.md，写入以下内容：

---
name: 雨图PIM 双主题
light: design/DESIGN-light.md  # Stripe 风格，浅色模式
dark:  design/DESIGN-dark.md   # Linear 风格，深色模式
---

## 使用规则

浅色模式 [data-theme="light"]：
- 遵循 design/DESIGN-light.md 的 Stripe 色彩体系
- 背景白色系，主强调色 #635BFF（Stripe Purple）
- 有阴影（shadow-sm/md），卡片用 border + shadow 构建层级

深色模式 [data-theme="dark"]：
- 遵循 design/DESIGN-dark.md 的 Linear 色彩体系
- 背景极暗蓝黑 #0D0F14，主强调色 #7C6AF5（Linear Purple）
- 无阴影，用 border 构建层级

共同约束（两套主题均适用）：
- 全站中文化，技术字段 SPU/SKU/ItemId 保留英文
- Sidebar 宽度 240px，必须 Icon + 中文标签
- 在线状态点使用慢速呼吸动效（4s ease-in-out），禁止 animate-ping
- 首页禁止出现 PostgreSQL/Redis/Cloudflare R2/CDP/Pool 等基础设施信息
- 平台状态 Chips：绿=已发布，黄=发布中，灰=未发布，红=失败
- 所有颜色必须使用 CSS custom properties，禁止硬编码

第四步：在 AGENTS.md 追加以下内容：

## 设计系统
- 主文件：DESIGN.md（根目录）
- 浅色：design/DESIGN-light.md（Stripe 风格）
- 深色：design/DESIGN-dark.md（Linear 风格）
- 主题切换：document.documentElement.dataset.theme = 'light'|'dark'
- 所有颜色通过 CSS custom properties 双主题自动适配

完成后告知我成功。
```

---

### 【STEP 1】工作台首页

```
严格遵循 DESIGN.md 双主题设计系统，同时支持浅色（Stripe）和深色（Linear）。

构建【工作台首页】，完整结构如下：

─── 顶部状态栏（高度 48px）─────────────────────
左侧 3 个状态 Chip：
  [● 在线运行]  [Shopee ✓ 已连接]  [🔄 同步运行中]
  ● 圆点使用慢速呼吸动效（4s），非闪烁
右侧：
  [☀️/🌙 主题切换按钮] [🔔 通知] [用户头像]
  主题切换按钮：点击切换 data-theme，写入 localStorage

─── 全局产品搜索 ────────────────────────────────
位置：顶部核心区，max-width 640px 水平居中
高度：48px，圆角 var(--radius-lg)
背景：var(--bg-surface)，边框 var(--border-strong)
聚焦：边框变 var(--accent)，外发光 0 0 0 3px var(--accent-soft)
placeholder：搜索产品名称、SPU、SKU、平台商品ID…
键入后实时搜索，显示 Product Result Card（见下方）

Product Result Card（搜索结果项）：
  [产品图 40px] | 产品名称（14px 500）
                  SPU-XXXXX（13px tertiary）
                  ¥ 299  [Shopee ● 已发布]

─── 产品统计（8个，grid 4列）────────────────────
每张卡片：背景 var(--bg-surface)，圆角 var(--radius-lg)，border
  标签（13px tertiary letter-spacing +0.3px）
  数字（32px 600 primary letter-spacing -0.4px）
  趋势/描述（13px 状态色）

8 项：总产品数 / 待审核 / 待发布 / 今日新增 /
      素材缺失 / Shopee已发布 / TikTok已发布 / 发布失败

─── 最近产品（grid 3列）────────────────────────
使用商品资产卡片组件（结构见 STEP 2）

─── 实时动态（最近 10 条）──────────────────────
格式：[状态色 6px dot]  SPU-XXXX 已发布至 Shopee  ·  3分钟前
仅显示业务事件，禁止出现任何系统/数据库日志

─── 待处理事项 ─────────────────────────────────
列表形式，按优先级排序

禁止出现：PostgreSQL / Redis / Cloudflare / CDP / Pool / Agent Process
```

---

### 【STEP 2】商品资产卡片组件

```
严格遵循 DESIGN.md 双主题设计系统。

构建可复用【商品资产卡片 ProductCard】组件：

Props（TypeScript）：
  imageUrl?: string
  productName: string
  spuCode: string
  skuCount: number
  salePrice: number
  costPrice: number
  platforms: Array<{
    name: 'Shopee' | 'TikTok' | 'Lazada' | 'Amazon'
    status: 'live' | 'pending' | 'idle' | 'error'
  }>
  onEdit?: () => void
  onPublish?: () => void
  onDetail?: () => void

视觉结构（从上到下）：

┌───────────────────────────┐
│ 产品图（16:9，object-fit:cover）│
│ 右上角叠加：平台状态 Chips     │
│ 无图时：品类 icon 居中占位     │
├───────────────────────────┤
│ 产品名称（14px 500，两行省略）  │
│ SPU-XXXXX（13px tertiary）     │
│ 共 N 个 SKU（13px tertiary）   │
│                               │
│ ¥ 299.00（20px 600 primary）   │
│ 成本 ¥ 180（13px tertiary）    │
│ ↑ 利润 +39%（13px success色）  │
├───────────────────────────┤
│ 平台 Chips 横排               │
│ [● Shopee] [● TikTok] ...      │
├───────────────────────────┤
│ [编辑]  [发布]  [详情→]        │
└───────────────────────────┘

平台 Chips 颜色规则：
  live    → bg=var(--success-bg)  text=var(--success)  dot=var(--status-live)
  pending → bg=var(--warning-bg)  text=var(--warning)  dot=var(--status-pending)+breathe动效
  idle    → bg=var(--border-default) text=var(--text-tertiary) dot=var(--status-idle)
  error   → bg=var(--danger-bg)   text=var(--danger)   dot=var(--status-error)

卡片 Hover：
  shadow-md 出现，translateY(-2px)，过渡 200ms ease

两套主题视觉均正确，所有颜色用 CSS token，禁止硬编码 hex。
```

---

### 【STEP 3】产品详情页

```
严格遵循 DESIGN.md 双主题设计系统。

构建【产品详情页】：

顶部栏（breadcrumb + 操作）：
  产品库 > 925银蝴蝶项链
  右侧：[编辑]  [发布至平台]  [⋯ 更多]

主体：两栏布局（左 40% / 右 60%，gap 40px）

左栏（图片区）：
  主图：大图展示，min-height 360px，object-fit:cover，圆角 var(--radius-xl)
  Hover：cursor: zoom-in，点击全屏预览（Lightbox）
  缩略图行：主图 / SKU图 / 详情图 切换
  大留白，高级感，图片是核心内容

右栏（信息区）极强层级：

  一级信息（最突出）：
    产品标题（24px 500 letter-spacing -0.4px）
    ¥ 299.00（28px 600 --text-primary letter-spacing -0.5px）
    成本 ¥ 180.00（14px --text-tertiary）
    利润率 ↑ 39.4%（14px --success）
    [平台状态 Chips 行]

  二级信息（次要）：
    SPU：SPU-00142
    SKU 数量：3 个规格
    类目：项链
    主要颜色：银色
    重量：12g

  三级信息（辅助，折叠或置底）：
    创建时间 / 更新时间 / 发布记录摘要

  平台发布矩阵（表格）：
    平台 | 状态徽章 | 平台商品ID | 发布时间
    Shopee | ● 已发布 | SH-29384756 | 2026-05-28
    TikTok | ● 发布中 | — | —
    Lazada | ● 未发布 | — | —

  SKU 列表区：
    每个 SKU 一行：规格 + 颜色 + 库存数 + 销售价 + 成本价

商品描述区（下方全宽）：
  产品描述文本（支持富文本展示）

两套主题均正确，所有颜色用 CSS token。
```

---

### 【STEP 4】主题切换组件

```
构建全局主题切换系统，严格遵循 DESIGN.md 双主题规范。

包含：

1. useTheme() Hook：
   - 初始化：localStorage('pim-theme') → prefers-color-scheme → 默认 'light'
   - 同步到 document.documentElement.dataset.theme
   - 返回：{ theme, toggleTheme, setTheme }

2. ThemeToggle 组件：
   - 浅色时显示：🌙 图标 + "深色" 文字
   - 深色时显示：☀️ 图标 + "浅色" 文字
   - 尺寸：32px 高，padding 8px 12px
   - 圆角：var(--radius-md)
   - 背景：var(--bg-surface)，边框 var(--border-default)
   - 切换时图标有 200ms rotate 过渡
   - 放置在顶部状态栏右侧

3. 全局 CSS 切换过渡：
   所有背景色 / 边框色 / 文字色：200ms ease 过渡
   .status-dot-live 排除在外（保持呼吸动效连续）

保证：刷新页面后主题持久化，首屏不闪烁（SSR 项目注意避免 hydration 不匹配）。
```

---

### 【STEP 5】侧边栏 Sidebar

```
严格遵循 DESIGN.md 双主题设计系统。

构建【产品运营侧边栏 Sidebar】：

尺寸：width 240px，固定，不可折叠，不可切换图标模式
背景：var(--bg-surface)
右边框：1px solid var(--border-default)

顶部 Logo 区（高度 56px）：
  雨图饰品 PIM（16px 500，--text-primary）
  版本号 v2.0（11px --text-tertiary）

导航列表：

  主分组（无标题）：
    📦  产品库
    🚀  发布中心
    🖼  素材中心
    📊  数据中心
    🔄  同步中心
    🧾  日志中心

  分割线（1px var(--border-default)，margin 8px 0）

  底部分组：
    ⚙   系统设置

导航项样式：
  高度：40px，padding 0 12px，margin 2px 6px
  圆角：var(--radius-md)
  Icon 16px + 中文 14px，间距 10px
  默认：color var(--text-secondary)
  Hover：background var(--border-default)，color var(--text-primary)，过渡 150ms
  激活：background var(--accent-soft)，color var(--accent)
         左侧 2px solid var(--accent) 指示线

底部用户信息区（高度 56px）：
  头像 28px + 用户名 + 角色
  右侧：主题切换按钮（复用 ThemeToggle 组件）

禁止：纯图标模式 / 大色块高亮 / 国产 ERP 样式
```

---

## 第六部分：AGENTS.md 完整模板

```markdown
# 雨图饰品 PIM 中台 — Agent 上下文 v7.0

## 项目定位
产品资产管理平台（PIM）。
核心资产：产品 / SKU / 图片 / 价格 / 平台发布状态。
不是 DevOps 工具，不是监控台，不是基础设施面板。

## 技术栈
- Framework: [填写你的框架，如 Next.js / Nuxt / Vite+React]
- CSS: Tailwind CSS v4 / CSS custom properties
- 图标: Lucide React（outline 系列）
- 动效: CSS transitions + @keyframes

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
```

---

## 第七部分：验收清单

```
浅色模式（Stripe）验收：
[ ] 主背景 #FFFFFF，次级面 #F6F9FC
[ ] 强调色 #635BFF
[ ] 主文字色 #0A2540（深海军蓝）
[ ] 卡片有 shadow-sm/md

深色模式（Linear）验收：
[ ] 主背景 #0D0F14（极暗蓝黑）
[ ] 强调色 #7C6AF5
[ ] 用 border 构建层级，无 box-shadow
[ ] 无大块白色区域

通用验收：
[ ] 主题切换按钮存在且切换流畅
[ ] 刷新后主题持久化（localStorage）
[ ] 在线状态点：慢速呼吸，非闪烁
[ ] Sidebar：240px，Icon + 中文，激活有紫色指示线
[ ] 首页：无任何基础设施信息
[ ] 平台 Chips：四种状态颜色正确
[ ] 产品卡片：含销售价 + 成本价 + 利润率
[ ] 搜索：实时返回 Product Result Card
[ ] 全站：无裸露英文业务术语
[ ] 两套主题下所有文字均可读（无低对比度）
```

---

*方案版本：v7.0 | 2026-05-29*
*浅色：Stripe #635BFF × 深色：Linear #7C6AF5*
