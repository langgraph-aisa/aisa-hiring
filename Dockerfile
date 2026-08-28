# ==========================================================
# ETAPA 1: CONSTRUCCIÓN (Builder)
# ==========================================================
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ==========================================================
# ETAPA 2: PRODUCCIÓN (Runtime)
# ==========================================================
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

RUN addgroup -S nodejs && adduser -S nodejs -G nodejs

COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# 👇 ESTA LÍNEA ES LA CLAVE: SIN --prod PARA QUE VITE ESTÉ DISPONIBLE
RUN pnpm install --frozen-lockfile

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist/public ./dist/public

RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000
CMD ["pnpm", "start"]
