#!/bin/bash

# Script de deploy para Vivemus na Hostinger via Dokploy
# Uso: ./scripts/deploy.sh

set -e

echo "🚀 Iniciando deploy do Vivemus..."

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Verificar se há alterações
if [[ -z $(git status -s) ]]; then
    echo -e "${YELLOW}⚠️  Nenhuma alteração detectada${NC}"
else
    echo -e "${YELLOW}📝 Alterações detectadas:${NC}"
    git status -s
fi

# 2. Build local
echo -e "${YELLOW}🔨 Building aplicação...${NC}"
npm ci --omit=dev
npm run build:web

# 3. Teste do Dockerfile localmente (opcional)
read -p "Deseja testar o Docker localmente? (y/n) " -n 1 -r REPLY
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🐳 Buildando imagem Docker...${NC}"
    docker build -t vivemus:latest .
    echo -e "${GREEN}✓ Imagem construída${NC}"
fi

# 4. Commit e push
read -p "Deseja fazer commit e push? (y/n) " -n 1 -r REPLY
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git add .
    git commit -m "deploy: build para produção" || echo "Nada para commitar"
    git push origin main
    echo -e "${GREEN}✓ Push realizado${NC}"
fi

echo -e "${GREEN}✅ Deploy preparado! Verifique no painel Dokploy da Hostinger${NC}"
echo -e "${GREEN}   URL: vivemus.hostinger.com (ou seu domínio)${NC}"
