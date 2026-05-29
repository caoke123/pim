# 雨图饰品 PIM 中台系统

跨境电商产品信息管理中台。从 Cloudflare R2 同步产品数据，经运营补充后导出至 Shopee/Temu/妙手ERP。

## 技术栈

| 层级 | 技术 |
|---|---|
| 前端 | React 18 + Vite 5 + Tailwind CSS + shadcn/ui |
| 后端 | Node.js 20 + Hono 4 + Drizzle ORM |
| 数据库 | PostgreSQL 16 |
| 缓存 | Redis 7 |
| 存储 | Cloudflare R2 |

## 快速启动

### 1. 安装依赖

```bash
cd pim-system
pnpm install
```

### 2. 配置环境变量

复制并编辑 `.env` 文件：

```bash
cp .env.example .env
```

填写必要配置（R2 密钥等），开发环境可直接使用默认值。

### 3. 启动基础设施（Docker）

```bash
docker compose up -d postgres redis
```

### 4. 运行数据库迁移

```bash
pnpm db:generate
pnpm db:migrate
```

### 5. 启动开发服务器

```bash
# 同时启动前后端
pnpm dev

# 或分别启动
pnpm --filter backend dev   # 后端 http://localhost:8000
pnpm --filter frontend dev  # 前端 http://localhost:3000
```

### 6. 全 Docker 部署

```bash
docker compose up -d
```

服务地址：

| 服务 | 地址 |
|---|---|
| 前端 | http://localhost:3000 |
| 后端 API | http://localhost:8000/api/v1 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

## 项目结构

```
pim-system/
├── packages/
│   ├── shared/          # 前后端共享类型定义
│   ├── backend/         # Hono API 服务
│   │   └── src/
│   │       ├── routes/       # API 路由
│   │       ├── db/           # Drizzle 表结构 + 迁移
│   │       ├── services/     # 业务逻辑
│   │       └── middleware/   # 鉴权中间件
│   └── frontend/        # React 前端
│       └── src/
│           ├── pages/        # 页面组件
│           ├── components/   # UI 组件
│           └── lib/          # API 封装
├── docker-compose.yml
└── PIM_开发文档_v3.0.md  # 唯一事实来源
```

## API 基础

### 响应格式

```json
{
  "data": {},
  "error": "错误信息（可选）",
  "meta": {}
}
```

### 分销商 Token 鉴权

```bash
# 创建分销商，获取 token
curl -X POST http://localhost:8000/api/v1/distributors \
  -H "Content-Type: application/json" \
  -d '{"name":"测试分销商","priceType":"selling"}'

# 使用 token 获取产品
curl http://localhost:8000/api/v1/distributor/products \
  -H "X-Distributor-Token: <apiToken>"
```

### 手动触发同步

```bash
curl -X POST http://localhost:8000/api/v1/sync/trigger
```

### 导出产品

```bash
curl -X POST http://localhost:8000/api/v1/exports/shopee \
  -H "Content-Type: application/json" \
  -d '{"productIds":["uuid1","uuid2"]}' \
  --output shopee_export.xlsx
```

## 数据库管理

```bash
# 生成迁移文件
pnpm db:generate

# 执行迁移
pnpm db:migrate

# 打开 Drizzle Studio
pnpm db:studio
```

## 开发阶段

- [x] 第一阶段（STEP 1-10）：核心数据链路
- [x] 第二阶段（STEP 11-17）：信息补充与编辑
- [x] 第三阶段（STEP 18-23）：多平台导出
- [x] 第四阶段（STEP 24-27）：分销商体系

详见 `CLAUDE.md` 和 `PIM_开发文档_v3.0.md`。
