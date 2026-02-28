#!/bin/bash

# Script para fazer login no Expo e inicializar EAS
echo "🔐 Autenticando com Expo..."
./node_modules/.bin/eas login --browser

echo ""
echo "✅ Login bem-sucedido!"
echo ""
echo "🚀 Iniciando configuração do EAS..."
./node_modules/.bin/eas init --id 55d57a0e-5b29-4591-a8d8-da8a9add1beb

echo ""
echo "✅ EAS configurado!"
echo ""
echo "📱 Iniciando build de produção..."
./node_modules/.bin/eas build --platform android --profile production

