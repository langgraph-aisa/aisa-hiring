# ==========================================================
# ETAPA 1: CONSTRUCCIÓN (Builder)
# ==========================================================
FROM node:22-alpine AS builder

# Instalar pnpm globalmente
RUN corepack enable && corepack prepare pnpm@latest --activate

# Directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias (Si tu package.json está en la raíz)
# Si tu proyecto es un monorepo y el package.json está en /server o /api, 
# cambia la línea de abajo a: COPY server/package.json server/pnpm-lock.yaml ./
COPY package.json pnpm-lock.yaml ./

# Instalar TODAS las dependencias (incluyendo las de desarrollo para compilar)
RUN pnpm install --frozen-lockfile

# Copiar el resto del código fuente
COPY . .

# Compilar el proyecto (TypeScript, NestJS, etc.)
# Si tu compilación está en una subcarpeta, ajusta la ruta (ej: cd server && pnpm build)
RUN pnpm build

# ==========================================================
# ETAPA 2: PRODUCCIÓN (Runtime - Ligera y Segura)
# ==========================================================
FROM node:22-alpine AS runner

# Instalar pnpm en la etapa final
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Crear un usuario sin privilegios (¡CRÍTICO PARA SEGURIDAD!)
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs

# Copiar SOLO las dependencias de producción (sin devDependencies)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Copiar el código compilado desde la etapa 1 (Builder)
# Ajusta la ruta si tu "build" genera en /dist o /apps/server/dist
COPY --from=builder /app/dist ./dist

# Copiar archivos estáticos (si tu frontend se compila aquí y es servido por el backend)
# Ajusta si tienes una carpeta /public o /client/dist
# COPY --from=builder /app/public ./public

# Crear carpeta para archivos subidos y darle permisos al usuario node
RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app

# Cambiar al usuario sin privilegios (No root)
USER nodejs

# Exponer el puerto de la aplicación
EXPOSE 3000

# ==========================================================
# COMANDO DE ARRANQUE
# ==========================================================
# ⚠️ IMPORTANTE: Verifica en tu package.json que el script "start" exista.
# Si tu app es NestJS, el script suele ser: "start": "node dist/main.js" o "start:prod".
# Si usas Prisma, asegúrate de ejecutar migraciones antes: 
# CMD ["sh", "-c", "npx prisma migrate deploy && pnpm start"]
CMD ["pnpm", "start"]
