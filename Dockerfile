FROM node:18-slim AS base

# 给 node-gyp 用
RUN apt-get update && \
    apt-get install -y python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

# ======================
# 依赖阶段
# ======================
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm config set registry https://registry.npmmirror.com && \
    npm ci

# ======================
# 构建阶段
# ======================
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ======================
# 运行阶段
# ======================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --system nextjs

# ❌ 不再复制 public（因为你没有）
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
