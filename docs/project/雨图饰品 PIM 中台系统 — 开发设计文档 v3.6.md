# 🌧️ 雨图饰品 PIM 中台系统 — 开发设计文档 v3.6

## 📄（集成方案 C：分布式本地 Agent 发品中台化升级）

---

## 变更履历

| 版本号 | 修订人 | 变更内容说明 |
| :--- | :--- | :--- |
| v1.0 - v3.0 | 架构组 | 奠定 PIM 3.0 核心业务，定义 `spus`, `skus`, `assets` 等核心实体。 |
| v3.5 | 系统架构师 | 全面对接方案 C（分布式本地 Agent 方案）。升级 PostgreSQL 16 数据库审计结构，新增 `platform_listings` 多平台上架管理，并定义全新前端"赛博极简"交互规范。 |
| **v3.6** | **系统架构师** | **全面升级前端设计系统为 Stripe（浅色）× Linear（深色）双主题体系。引入 CSS Custom Properties Token 层，建立 DESIGN.md + AGENTS.md 双文件 Agent 设计上下文，统一动效规范（breathe 4s 替代 ping），定义 ProductCard / Sidebar / Topbar / 产品详情页 等核心组件全规格。** |

---

# 一、系统定位与架构设计（System Topology）

雨图饰品 PIM 3.6 定位为：

> "云端数字化主商品库 + 本地分布式智能化执行端"

的双层混合架构。

为了突破指纹浏览器（EasyBR）、Shopee 反爬虫风控以及高频上传图片带宽占用等物理限制，本系统彻底废弃云端直接控网方案，采用 **方案 C（本地客户端代理方案）** 进行重构。

---

## 1. 物理拓扑架构图

```text
                     ┌──────────────────────────────────────────┐
                     │          雨图云端 / 局域网服务器          │
                     │  ┌───────────────────┐  ┌─────────────┐  │
                     │  │ PostgreSQL 16 (DB) │  │ Cloudflare  │  │
                     │  └─────────▲─────────┘  │   R2 桶     │  │
                     └────────────┼────────────└──────▲──────┘
                                  │ 写入/读取日志与状态 │ 下载/存储素材
                                  │ (Port 5432)       │ (R2 Public Link)
                                  │                   │
  ┌───────────────────────────────┼───────────────────┼───────────────────────────────┐
  │ 员工本地电脑 (Distributed Node - Machine_Name: DESKTOP-RPA01)                     │
  │                               │                   │                               │
  │  ┌────────────────────────┐   │                   │   ┌────────────────────────┐  │
  │  │     PIM 网页前端        ├───┼───────────────────┼──►│  EasyBR 指纹浏览器     │  │
  │  │ (React / Chrome Tab)   │   │                   │   │ (Port 3001 / CDP 协议) │  │
  │  └──────────┬─────────────┘   │                   │   └───────────▲────────────┘  │
  │             │                 │                   │               │               │
  │             │ 跨域 HTTP 呼叫   │                   │               │ 控制/填表     │
  │             │ (Port 13000)    │                   │               │ (Playwright)  │
  │             ▼                 ▼                   │               │               │
  │  ┌────────────────────────────────────────────────┴───────────────┴────────────┐  │
  │  │                本地 Electron 分拣系统 (Local Agent)                        │  │
  │  │       - 内嵌 Hono API 服务 (Port 13000)                                     │  │
  │  │       - 嵌入式 Node-PostgreSQL 客户端 & Node-Playwright 执行器               │  │
  │  └────────────────────────────────────────────────────────────────────────────┘  │
  └───────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 核心组件职责边界

### PIM 网页前端（React + TypeScript）

部署于 Web 环境，负责：

* 商品主数据（SPU/SKU）的可视化维护
* 发布任务的管理触发
* 利用 `AgentStatusMonitor` 心跳机制实时监控本地 Agent 在线情况

---

### 本地 Electron 客户端（Local Agent）

运行于员工本地 PC 的常驻后台程序，集成：

* 多线程分拣系统
* HTTP API 监听服务（默认端口 `13000`）

---

### EasyBR 指纹浏览器

提供完全隔离的干净浏览器沙盒环境，并开放本地 CDP 调试端口（默认 `3001`）。

---

### PostgreSQL 16 数据库

采用原生 SQL（无 ORM）通过连接池进行高并发、轻量化读写。

数据库作为：

> 分布式节点协同的信息媒介（唯一真理来源）

---

# 二、业务闭环生命周期（The 9-Step Lifecycle）

系统将一个商品的完整发布周期抽象为九步闭环流，保障高可用与容错能力。

```text
[1. 保存数据] (网页端编辑，写入 DB: spus/skus)
      │
[2. 触发发布] (网页端点击"发布到 Shopee")
      │
[3. 前端呼叫] (Web 向本地 Agent 127.0.0.1:13000 发起 POST)
      │
[4. 任务锁单] (Agent 接收请求，立即回复 Web, 并在 DB 插入 running 任务)
      │
[5. 数据拉取] (Agent 直接连接 DB，拉取 spus/skus 最新属性与类目)
      │
[6. 素材下载] (Agent 将 assets 表中对应的 R2 图片链接并发下载到本地临时目录)
      │
[7. RPA 填表] (Agent 连通 EasyBR:3001，用 Playwright 控制指纹浏览器执行 Shopee 自动录入)
      │
[8. 结果回写] ───► [成功]：获取 shopeeItemId, 更新 platform_listings, 清理本地临时文件
      │        └──► [失败]：Playwright 截图上传 R2, 更新错误日志与截图 URL，保留痕迹
      ▼
[9. 前端感知] (Web 轮询 DB，通过炫丽动效渲染发布结果)
```

---

# 三、数据库设计规范（PostgreSQL 16）

系统底座采用原生 PostgreSQL 16 引擎，不使用 heavyweight ORM。

所有操作通过：

* 底层连接池
* 原生 SQL

实现极致性能与轻量化。

---

## 1. 物理实体模型（ERD Relation）

```text
spu_seq (Sequence)  ──► 自动生成 SPU 编码
  │
  ├── spus (产品主款)
  │     │
  │     ├── 1 : N ──► skus (产品变体/规格) ─┐
  │     │                                 │
  │     ├── 1 : N ──► assets (素材文件) ◄──┘
  │     │
  │     ├── 1 : N ──► platform_listings (多平台发布状态表)
  │     │
  │     └── 1 : N ──► publish_logs (发布日志追踪表)
```

---

## 2. 核心表结构 DDL（生产级定义）

### （1）全局序列定义

```sql
CREATE SEQUENCE IF NOT EXISTS public.spu_seq
    START WITH 1000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 20;
```

---

### （2）产品主款表（spus）

```sql
CREATE TABLE IF NOT EXISTS public.spus (
    spu_code VARCHAR(50) PRIMARY KEY,
    spu_name VARCHAR(255) NOT NULL,
    short_title VARCHAR(100),
    category_code VARCHAR(20) NOT NULL,
    style_code VARCHAR(20),
    outer_pack_length NUMERIC(8, 2) DEFAULT 0.00,
    outer_pack_width NUMERIC(8, 2) DEFAULT 0.00,
    outer_pack_height NUMERIC(8, 2) DEFAULT 0.00,
    outer_pack_weight NUMERIC(10, 2) DEFAULT 0.00,
    machine_name VARCHAR(100) NOT NULL,

    status VARCHAR(30) DEFAULT 'draft',
    reviewed_by VARCHAR(50) DEFAULT NULL,
    reviewed_at TIMESTAMPTZ DEFAULT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spus_status ON public.spus(status);
CREATE INDEX IF NOT EXISTS idx_spus_created ON public.spus(created_at DESC);
```

---

### （3）产品变体表（skus）

```sql
CREATE TABLE IF NOT EXISTS public.skus (
    sku_code VARCHAR(100) PRIMARY KEY,
    spu_code VARCHAR(50) NOT NULL REFERENCES public.spus(spu_code) ON DELETE CASCADE,
    color_name VARCHAR(50),
    dimensions VARCHAR(50),
    weight NUMERIC(10, 2) DEFAULT 0.00,
    cost_price NUMERIC(12, 4) DEFAULT 0.0000,
    selling_price NUMERIC(12, 4) DEFAULT 0.0000,
    machine_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skus_spu ON public.skus(spu_code);
```

---

### （4）素材文件表（assets）

```sql
DO $$ BEGIN
    CREATE TYPE asset_type_enum AS ENUM ('main_image', 'sku_image', 'detail_image', 'video');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE asset_status_enum AS ENUM ('pending', 'published', 'failed', 'skipped');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.assets (
    id BIGSERIAL PRIMARY KEY,
    spu_code VARCHAR(50) NOT NULL REFERENCES public.spus(spu_code) ON DELETE CASCADE,
    sku_code VARCHAR(100) REFERENCES public.skus(sku_code) ON DELETE SET NULL,
    asset_type asset_type_enum NOT NULL,
    file_path TEXT NOT NULL,
    machine_name VARCHAR(100) NOT NULL,
    status asset_status_enum DEFAULT 'pending',
    sort_order SMALLINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_assets_spu ON public.assets(spu_code);
```

---

### （5）多平台发布状态表（platform_listings）

```sql
CREATE TABLE IF NOT EXISTS public.platform_listings (
    id BIGSERIAL PRIMARY KEY,
    spu_code VARCHAR(50) NOT NULL REFERENCES public.spus(spu_code) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    listing_id VARCHAR(100) DEFAULT NULL,
    status VARCHAR(30) DEFAULT 'draft',
    error_info TEXT DEFAULT NULL,
    screenshot_url TEXT DEFAULT NULL,
    published_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_spu_platform
ON public.platform_listings(spu_code, platform);

CREATE INDEX IF NOT EXISTS idx_listings_status
ON public.platform_listings(status);
```

---

### （6）生产日志审计表（publish_logs）

```sql
CREATE TABLE IF NOT EXISTS public.publish_logs (
    id BIGSERIAL PRIMARY KEY,
    spu_code VARCHAR(50) NOT NULL,
    asset_id BIGINT REFERENCES public.assets(id) ON DELETE SET NULL,
    machine_name VARCHAR(100) NOT NULL,
    shopee_item_id VARCHAR(100) DEFAULT NULL,
    result VARCHAR(20) NOT NULL CHECK(result IN ('success', 'failed')),
    error_message TEXT DEFAULT NULL,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_spu
ON public.publish_logs(spu_code);
```

---

# 四、本地 Agent 通信契约（API Specification）

本地客户端（Electron）常驻端口：

```text
13000
```

为了保证网页端能够通过 Fetch 跨域调用，服务必须配置以下 CORS 响应头：

```text
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

---

## 1. 终端心跳检测（Ping-Pong）

### 请求

```http
GET http://127.0.0.1:13000/ping
```

### 响应

```json
{
  "status": "ok",
  "version": "1.3.5",
  "machineName": "DESKTOP-RPA01",
  "cdpPort": 3001,
  "easyBrConnected": true
}
```

---

## 2. 触发分布式发布任务（Dispatch Task）

### 请求

```http
POST http://127.0.0.1:13000/api/v1/publish
```

### Request Payload

```json
{
  "productNo": "YXGW260528-0003",
  "platform": "shopee"
}
```

### Response Payload

```json
{
  "status": "processing",
  "message": "Task queued successfully. Agent is retrieving files and starting RPA execution.",
  "taskId": "98273"
}
```

---

# 五、前端 UI/UX 设计规范（v3.6 全新升级）

> 详细参考文档：`雨图PIM_完整设计方案_v7.md`
> AI Agent 设计上下文：根目录 `DESIGN.md` + `design/DESIGN-light.md` + `design/DESIGN-dark.md`

## 1. 核心设计理念

系统前端定位为 **产品资产管理平台（Product Asset Management Platform）**，而非 DevOps 工具或系统监控台。

核心气质：**克制、精密、产品优先**。90% 留白表面 + 10% 状态驱动色彩。

参考品牌：
- **浅色模式**：Stripe（亮白底 · 紫色强调 · weight-300 优雅）
- **深色模式**：Linear（极暗蓝黑 · 紫色微发光 · 工程极简）

---

## 2. 双主题色彩 Token 系统

v3.6 全面采用 **CSS Custom Properties** 作为颜色层，通过 `html[data-theme="light|dark"]` 切换，Tailwind 层通过 `var(--xxx)` 引用。

### 2.1 浅色模式（Stripe 风格）

```css
:root, [data-theme="light"] {
  --bg-base:        #FFFFFF;
  --bg-surface:     #F6F9FC;
  --bg-elevated:    #FFFFFF;
  --bg-subtle:      #F0F4FF;

  --text-primary:   #0A2540;
  --text-secondary: #425466;
  --text-tertiary:  #8898AA;
  --text-inverse:   #FFFFFF;

  --accent:         #635BFF;
  --accent-hover:   #4F46E5;
  --accent-soft:    #EDE9FE;

  --border-default: rgba(0,0,0,0.08);
  --border-strong:  rgba(0,0,0,0.16);

  --success:        #09825D;
  --success-bg:     #D3F8EE;
  --warning:        #B54708;
  --warning-bg:     #FEF0C7;
  --danger:         #C01048;
  --danger-bg:      #FFE4E8;
  --info:           #0369A1;
  --info-bg:        #E0F2FE;

  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.10);
}
```

### 2.2 深色模式（Linear 风格）

```css
[data-theme="dark"] {
  --bg-base:        #0D0F14;
  --bg-surface:     #13151C;
  --bg-elevated:    #1C1F2A;
  --bg-subtle:      #1E2133;

  --text-primary:   #F0F0F5;
  --text-secondary: #9899A6;
  --text-tertiary:  #5C5D6E;
  --text-inverse:   #0D0F14;

  --accent:         #7C6AF5;
  --accent-hover:   #9B8FF7;
  --accent-soft:    #1E1B3A;

  --border-default: rgba(255,255,255,0.07);
  --border-strong:  rgba(255,255,255,0.14);

  --success:        #34C78A;
  --success-bg:     #0D2E21;
  --warning:        #F59E0B;
  --warning-bg:     #2D1F08;
  --danger:         #F87171;
  --danger-bg:      #2D0E0E;
  --info:           #60A5FA;
  --info-bg:        #0E1E35;

  --shadow-sm: none;
  --shadow-md: none;
  --shadow-lg: none;
}
```

### 2.3 Sidebar 专用 Token（双主题共用暗色底）

```css
--sidebar-bg:          #0B1120;
--sidebar-text:        #9899A6;
--sidebar-text-active: #FFFFFF;
--sidebar-border:      rgba(255,255,255,0.07);
--sidebar-active-bg:   rgba(124,106,245,0.12);
```

---

## 3. 字体与排版

| 用途 | 字体 | 回退 |
|------|------|------|
| UI 正文 | Inter | -apple-system, Microsoft YaHei |
| 等宽（SPU/SKU/ID/终端） | JetBrains Mono | SF Mono, monospace |
| 显示标题 | SF Pro Display | Inter |

### 字号层级

| Token | 大小 | 字重 | 用途 |
|-------|------|------|------|
| `text-2xl` | 32px | 600 | 大数字（统计卡片） |
| `text-xl` | 28px | 600 | 产品价格（详情页） |
| `text-lg` | 24px | 500 | 产品标题 |
| `text-md` | 16px | 500 | 区块标题 |
| `text-base` | 14px | 400 | 正文 |
| `text-sm` | 13px | 400 | 辅助信息 |
| `text-xs` | 11px | 400 | 标签、meta |

字重天花板：600（禁止 bold/700）。标题跟踪 `-0.4px`，标签跟踪 `+0.3px`。

---

## 4. 动效规范

### 核心规则

| 元素 | 动效 | 参数 |
|------|------|------|
| 在线状态点 | **breathe**（慢速呼吸） | 4s ease-in-out, opacity 0.5→0.9, scale 1→1.08 |
| 组件 Hover | 上浮 + 阴影加深 | translateY(-2px), shadow-md 出现, 200ms ease |
| 主题切换 | 全局颜色过渡 | 200ms ease（背景/边框/文字），排除 .status-dot-live |
| 卡片入场 | 淡入上移 | opacity 0→1, translateY(6px→0), 250ms ease-out |

### 绝对禁止

```text
❌ animate-ping（任何快速闪烁指示器）
❌ 花哨旋转 / 弹跳 / RGB 渐变
❌ >300ms loading 遮罩层
❌ 硬编码颜色 hex 值（必须用 CSS Token）
```

### breathe 实现

```css
@keyframes breathe {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50%      { opacity: 0.9; transform: scale(1.08); }
}
.status-dot-live {
  animation: breathe 4s ease-in-out infinite;
  transition: none; /* 不参与主题切换全局过渡 */
}
```

---

## 5. 整体布局结构

```text
┌──────────────────────────────────────────┐
│ TOP STATUS BAR (48px)                    │
│ ●在线运行 │ Shopee ✓ │ 同步中 │ 搜索…    │
├────────────┬─────────────────────────────┤
│            │                             │
│ SIDEBAR    │  COMMAND WORKSPACE          │
│ 240px      │  (scrollable content)       │
│ 暗色固定    │  max-width: 1280px         │
│            │                             │
└────────────┴─────────────────────────────┘
```

### Sidebar 规范

- 宽度：240px，固定，不可折叠，不可纯图标模式
- 背景：`--sidebar-bg`（`#0B1120`）
- 导航：**Icon（16px）+ 中文标签（13px）**
- 激活态：`--sidebar-active-bg` 背景 + 2px 左侧 `--accent` 指示线
- 底栏：头像 + 用户名 + 主题切换按钮
- 导航项高度 40px，margin 2px 6px

### Top Status Bar 规范

- 高度：48px
- 背景：`--bg-elevated`
- 左侧：3 个状态 Chip（在线运行 ● / Shopee ✓ / 同步中）
- 圆点使用 `status-dot-live`（breathe 动效，非闪烁）
- 右侧：搜索入口 + 通知 + 时间

---

## 6. 核心组件规格

### 6.1 产品统计卡片

- 背景 `--bg-surface`，圆角 12px，1px `--border-default`
- 标签 13px `--text-tertiary`，letter-spacing +0.3px
- 数字 32px 600 `--text-primary`，letter-spacing -0.4px
- 趋势文字 13px 状态色

### 6.2 ProductCard（商品资产卡片）

```text
┌───────────────────────────┐
│ 产品图（16:9, cover）      │
│ 右上角：平台状态 Chips     │
├───────────────────────────┤
│ 产品名称（14px 500）       │
│ SPU-XXXXX（11px mono）     │
│ 共 N 个 SKU（11px）        │
│                           │
│ ¥299.00（20px 600）        │
│ 成本 ¥180（12px tertiary） │
│ ↑ 利润率 39%（12px success）│
├───────────────────────────┤
│ 平台 Chips 横排            │
├───────────────────────────┤
│ [编辑] [发布] [详情→]      │
└───────────────────────────┘
```

Props：
- `imageUrl` / `productName` / `spuCode` / `skuCount`
- `salePrice` / `costPrice`
- `platforms: { name, status }[]` — 支持 Shopee/TikTok/Lazada/Amazon
- `onEdit` / `onPublish` / `onDetail`

### 6.3 平台状态 Chips（横排标签）

| 状态 | 背景色 | 文字色 | 圆点色 |
|------|--------|--------|--------|
| 已发布 (live) | `--success-bg` | `--success` | `--status-live` |
| 发布中 (pending) | `--warning-bg` | `--warning` | `--status-pending` + breathe |
| 未发布 (idle) | `--border-default` | `--text-tertiary` | `--status-idle` |
| 失败 (error) | `--danger-bg` | `--danger` | `--status-error` |

### 6.4 产品详情页

两栏布局（左 40% / 右 60%，gap 40px）：

**左栏 — 图片区：**
- 主图：min-height 360px，object-fit cover，圆角 16px
- Hover：cursor zoom-in，点击全屏 Lightbox
- 缩略图行：切换主图/SKU图/详情图

**右栏 — 信息区（极强层级）：**
- 一级：标题 24px 500 + 价格 ¥299 28px 600 + 利润率 + 平台 Chips
- 二级：SPU、SKU数量、类目、颜色、重量等
- 三级：创建/更新时间、发布记录摘要（置底）
- 平台发布矩阵：表格形式，每平台一行
- SKU 列表：规格、颜色、库存、价格

### 6.5 全局搜索

- 位置：首页顶部核心区，max-width 640px 水平居中
- 高度 48px，圆角 12px
- 聚焦：边框变 `--accent`，外发光 `0 0 0 3px --accent-soft`
- placeholder：搜索产品名称、SPU、SKU、平台商品ID…
- 结果：Product Result Card 实时展示

---

## 7. 中文化对照表

| 英文 | 中文 | 备注 |
|------|------|------|
| Dashboard / Command Center | 工作台 | 首页 |
| Event Stream | 实时动态 | 运营事件流 |
| Queue | 发布队列 | |
| ONLINE | 在线运行 | 状态栏 |
| Published | 已发布 | 平台状态 |
| Pending | 发布中 | 平台状态 |
| Failed | 发布失败 | 平台状态 |
| Draft | 草稿 | |
| Sync | 同步中心 | |
| Settings | 系统设置 | |
| Logs | 操作日志 | 业务日志 |
| Agent | 本地节点 | |
| Platform | 发布平台 | |

**规则：SPU / SKU / ItemId 技术缩写保留英文，其余全部中文。**

---

## 8. 全站设计红线

```text
❌ 首页出现 PostgreSQL / Redis / Cloudflare R2 / CDP / Pool / Agent Process
❌ animate-ping 或任何快速闪烁的状态动效
❌ 纯英文业务术语（SPU/SKU/ItemId 除外）
❌ 纯图标 Sidebar（必须 Icon + 中文标签，宽度 240px）
❌ 价格信息隐藏在 meta 区域
❌ 硬编码颜色 hex 值（必须用 CSS Token）
❌ 大面积黑色 / 渐变 / RGB 装饰
❌ font-weight 700+
```

---

# 六、安全与异常容错规范（Robustness & Security）

## 1. 跨域安全防御

本地 Electron Agent 仅允许接受：

* localhost
* 局域网内部受信任 PIM 域名

的跨源请求。

---

## 2. 锁单兜底逻辑

当：

* `platform_listings.status = pending`

且：

* 10 分钟未收到 success / failed

则：

* 前端自动判定超时
* 允许执行：

```text
解锁重试
```

---

## 3. 断网与状态自动校正

Playwright 执行失败时必须：

* 捕获全局异常
* 执行 `browserContext.close()`
* 回写 failed 状态
* 上传截图到 R2
* 更新 screenshot_url

严禁任务长期停留在：

```text
pending
```

状态。

---

## 4. 设计系统完整性

项目设计文件清单：

| 文件 | 作用 |
|------|------|
| `DESIGN.md` | AI Agent 主设计上下文（双主题入口） |
| `design/DESIGN-light.md` | 浅色模式参考（Stripe 风格完整分析） |
| `design/DESIGN-dark.md` | 深色模式参考（Linear 风格完整分析） |
| `AGENTS.md` | 项目编码上下文（技术栈、模块、红线） |
| `雨图PIM_完整设计方案_v7.md` | 完整设计指导方案（含全套 OpenCode 提示词） |

---

*文档版本：v3.6 | 2026-05-29*
*最新 UI 设计语言：Stripe（浅色）× Linear（深色）双主题体系*
