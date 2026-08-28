# ---------- ETAPA 1: CONSTRUCCIÓN ----------
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copiar solo archivos de dependencias para cachear capas
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copiar código y compilar
COPY . .
RUN pnpm build

# ---------- ETAPA 2: PRODUCCIÓN (Ligera) ----------
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Crear usuario sin privilegios (CRÍTICO PARA SEGURIDAD)
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs

# Copiar solo dependencias de producción y el build
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Crear carpeta para archivos subidos y dar permisos (Ajusta a tu estructura)
RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app

# Cambiar a usuario no root
USER nodejs

EXPOSE 3000
CMD ["pnpm", "start"]
