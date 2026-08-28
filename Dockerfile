# ---------- ETAPA 1: CONSTRUCCIÓN ----------
FROM node:22-alpine AS builder
# Instalar pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml ./
# Instalar dependencias (incluyendo las de desarrollo para compilar)
RUN pnpm install --frozen-lockfile

# Copiar el resto del código
COPY . .

# Construir la aplicación
RUN pnpm build

# ---------- ETAPA 2: PRODUCCIÓN (Ligera y Segura) ----------
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Crear un usuario sin privilegios (Seguridad crítica en producción)
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs

# Copiar solo dependencias de producción
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Copiar el código compilado desde la etapa 1
COPY --from=builder /app/dist ./dist

# Crear carpeta para archivos subidos y asignar permisos al nuevo usuario
# (Asegúrate de que esta ruta coincida con la usada en tu código)
RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app

# Cambiar al usuario no root
USER nodejs

# Puerto de la aplicación
EXPOSE 3000

# Comando de inicio (Verifica que tu package.json tenga el script "start" apuntando al dist)
CMD ["pnpm", "start"]
