FROM node:22-alpine

# Instalar pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml ./

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Copiar el resto del código
COPY . .

# Construir la aplicación
RUN pnpm build

# Puerto de la aplicación
EXPOSE 3000

# Comando de inicio
CMD ["pnpm", "start"]
