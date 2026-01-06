# ✅ 改 1：使用 Debian slim，而不是 alpine
FROM node:18-slim AS base

# ✅ 改 2：安装 node-gyp 必需工具
RUN apt-get update && \
    apt-get install -y python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

# ======================
# 安装依赖阶段
# ======================
FROM base AS deps
WORKDIR /app

# 复制依赖文件
COPY package.json package-lock.json* ./

# 使用国内镜像安装依赖
RUN npm config set registry https://registry.npmmirror.com && \
    npm ci

# ======================
# 构建阶段
# ======================
FROM base AS builder
WORKDIR /app

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 设置环境变量
ENV NEXT_TELEMETRY_DISABLED=1

# 构建
RUN npm run build

# ======================
# 运行阶段
# ======================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 创建非 root 用户（保留你原本的安全设计 👍）
RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --system nextjs

# 复制构建产物（Next.js standalone）
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 切换用户
USER nextjs

# 暴露端口
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 启动命令
CMD ["node", "server.js"]
