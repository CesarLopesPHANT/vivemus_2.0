#!/bin/bash

# EAS Build Pre-install Hook
# Este script é executado automaticamente pelo EAS antes do build
# Gera o arquivo autolinking.json necessário

set -e

echo "🔧 EAS Build Pre-install: Gerando autolinking.json..."

# Criar o diretório para o arquivo
mkdir -p android/build/generated/autolinking

# Executar react-native config para gerar autolinking.json
echo "📦 Executando: npx react-native config --output-type json"

if npx react-native config --output-type json > android/build/generated/autolinking/autolinking.json 2>/dev/null; then
    echo "✅ autolinking.json gerado com sucesso"
else
    echo "⚠️ Falha ao gerar com react-native config, usando fallback..."
    # Fallback: arquivo vazio válido
    mkdir -p android/build/generated/autolinking
    echo '{"project": {}, "dependencies": {}, "ios": {}, "android": {}}' > android/build/generated/autolinking/autolinking.json
    echo "✅ autolinking.json criado (fallback)"
fi

# Mostrar o arquivo
echo "📄 Conteúdo do autolinking.json:"
cat android/build/generated/autolinking/autolinking.json

echo "✅ Pre-install hook concluído!"
