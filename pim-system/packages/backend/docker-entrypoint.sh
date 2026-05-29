#!/bin/sh
set -e

echo "==> 运行数据库迁移..."
cd /app/packages/backend
npx drizzle-kit migrate

echo "==> 启动 PIM 后端服务..."
exec node dist/index.js
