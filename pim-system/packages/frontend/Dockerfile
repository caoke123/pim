# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder

WORKDIR /app

# 复制 workspace 配置
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/frontend/package.json ./packages/frontend/

# 安装依赖
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# 复制源代码
COPY packages/shared ./packages/shared
COPY packages/frontend ./packages/frontend

# 构建前端
WORKDIR /app/packages/frontend
RUN pnpm build

FROM nginx:alpine AS runner

# 复制构建产物到 nginx
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html

# nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000
