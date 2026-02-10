# Nuxt.js 프론트엔드 Dockerfile
FROM node:20-alpine AS base

# 의존성 설치 단계
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund

# 빌드 단계
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 프로덕션 단계
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nuxtjs

COPY --from=builder --chown=nuxtjs:nodejs /app/.output ./

USER nuxtjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server/index.mjs"]
