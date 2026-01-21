# ======================
# 基础镜像：Node 20（必须）
# ======================
FROM node:20-slim AS base

# node-gyp 必需依赖
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

# 生成 Prisma Client 并构建应用
RUN npx prisma generate && npm run build

# ======================
# 运行阶段
# ======================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --system nextjs

# 创建数据目录并授权
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

# 拷贝构建产物
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

RUN chmod +x ./scripts/start.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 使用脚本启动，以便进行数据库初始化
CMD ["/bin/sh", "scripts/start.sh"]
