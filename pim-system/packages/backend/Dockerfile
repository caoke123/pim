# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder

WORKDIR /app

# 复制 workspace 配置
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/

# 安装依赖
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# 复制源代码
COPY packages/shared ./packages/shared
COPY packages/backend ./packages/backend

# 构建
WORKDIR /app/packages/backend
RUN pnpm build

FROM node:20-alpine AS runner

WORKDIR /app

# 复制构建产物和依赖
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/packages/backend/package.json ./packages/backend/package.json
COPY --from=builder /app/packages/backend/drizzle.config.ts ./packages/backend/drizzle.config.ts
COPY --from=builder /app/packages/backend/src/db/migrations ./packages/backend/src/db/migrations

# 复制入口脚本
COPY --from=builder /app/packages/backend/src/db/schema.ts ./packages/backend/src/db/schema.ts

# 复制根配置
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# 安装运行依赖 + drizzle-kit 用于迁移
RUN corepack enable pnpm && pnpm install --frozen-lockfile --prod && pnpm add -g drizzle-kit

# 入口脚本：运行迁移后启动
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/docker-entrypoint.sh"]
