#!/bin/sh
set -e

echo "🛠 Starting deployment house-keeping..."

# 确保数据目录存在（冗余保障）
mkdir -p /app/data

# 检查数据库权限
if [ ! -w "/app/data" ]; then
  echo "❌ Error: /app/data is not writable!"
  exit 1
fi

# 只有在 schema 文件存在时才运行 push
if [ -f "./prisma/schema.prisma" ]; then
  echo "📡 Syncing database schema (prisma db push)..."
  # 使用 npx 运行。如果网络不佳可能会变慢，但在生产环境是必要的。
  npx prisma db push --accept-data-loss || echo "⚠️ Warning: prisma db push failed, check your connection or database file."
else
  echo "ℹ️ No prisma schema found, skipping db push."
fi

# 启动服务器
echo "🚀 Starting Next.js standalone server..."
exec node server.js
