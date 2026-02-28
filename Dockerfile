# Multi-stage build para Vivemus no Dokploy
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY apps/mobile-patient/package*.json ./apps/mobile-patient/
COPY packages ./packages

# Install dependencies
RUN npm ci --omit=dev

# Build aplicação web
RUN npm run build:web

# Stage final - servidor leve
FROM node:22-alpine

WORKDIR /app

# Install serve para production
RUN npm install -g serve

# Copy apenas os arquivos necessários
COPY --from=builder /app/apps/web/dist ./dist

# Expose port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start
CMD ["serve", "-s", "dist", "--listen", "3000"]
