# ==========================================================
# ETAPA 1: CONSTRUCCIÓN (Builder)
# ==========================================================
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# 👇 CORREGIDO: Copia package.json, lockfile Y la carpeta de parches
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ==========================================================
# ETAPA 2: PRODUCCIÓN (Runtime - Ligera y Segura)
# ==========================================================
FROM node:22-alpine AS runner

RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

RUN addgroup -S nodejs && adduser -S nodejs -G nodejs

# 👇 CORREGIDO: También copia package.json, lockfile Y la carpeta de parches aquí
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

CMD ["pnpm", "start"]
