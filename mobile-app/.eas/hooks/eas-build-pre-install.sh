#!/bin/bash

# EAS Pre-install Hook - Generate autolinking.json BEFORE Gradle runs
set -e

echo "🔧 EAS Pre-install: Preparando para build..."

# Se estamos em mobile-app, vamos para a raiz
if [ -d "../node_modules" ]; then
    cd ..
fi

if [ -d "mobile-app" ]; then
    cd mobile-app
fi

echo "📍 Diretório atual: $(pwd)"

# Criar o diretório para o arquivo
mkdir -p android/build/generated/autolinking

echo "📦 Gerando autolinking.json..."

# Executar react-native config para gerar autolinking.json
# Se houver erro, criar um arquivo vazio válido
npx react-native config --output-type json > android/build/generated/autolinking/autolinking.json 2>/dev/null || \
    echo '{"project": {}, "dependencies": {}, "ios": {}, "android": {}}' > android/build/generated/autolinking/autolinking.json

echo "✅ autolinking.json criado:"
cat android/build/generated/autolinking/autolinking.json

echo "✅ Pre-install hook concluído!"
