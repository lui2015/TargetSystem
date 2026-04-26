# ========= Stage 1: build web =========
FROM node:20-alpine AS web-builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY web/package.json ./web/
COPY server/package.json ./server/
RUN npm install --no-audit --no-fund
COPY web ./web
RUN npm run build -w web

# ========= Stage 2: build server =========
# 使用 debian slim（glibc）以便生成 linux-debian-openssl-3.0.x 引擎，runtime 同基底可直接使用
FROM node:20-slim AS server-builder
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY web/package.json ./web/
RUN npm install --no-audit --no-fund
COPY server ./server
RUN npx -w server prisma generate
RUN npm run build -w server

# ========= Stage 3: runtime =========
# 使用 debian slim 基底（glibc），避免 Alpine/musl 下 Prisma 需要 openssl-1.1 的问题
FROM node:20-slim AS runner
ENV NODE_ENV=production
WORKDIR /app

# Prisma 运行时依赖：openssl、ca-certificates
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# 生产依赖
COPY package.json package-lock.json ./
COPY server/package.json ./server/
RUN npm install --omit=dev --workspace server --no-audit --no-fund

# 后端编译产物 + Prisma schema & 引擎
COPY --from=server-builder /app/server/dist ./server/dist
COPY --from=server-builder /app/server/prisma ./server/prisma
COPY --from=server-builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=server-builder /app/node_modules/@prisma ./node_modules/@prisma

# 前端产物
COPY --from=web-builder /app/web/dist ./web/dist

# 数据目录（挂载卷以持久化 SQLite）
RUN mkdir -p /app/data
ENV DATABASE_URL="file:/app/data/prod.db"
ENV WEB_DIST=/app/web/dist
ENV PORT=4000
ENV HOST=0.0.0.0
EXPOSE 4000

# 启动时自动执行 migrate deploy，确保 schema 与数据库一致
CMD sh -c "cd server && npx prisma migrate deploy || npx prisma db push --accept-data-loss; cd .. && node server/dist/index.js"
