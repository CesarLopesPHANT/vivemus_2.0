#!/bin/bash

# EAS Pre-build Hook - Generate autolinking.json
set -e

echo "📦 EAS Pre-build: Gerando autolinking.json..."

# Criar o diretório para o arquivo
mkdir -p android/build/generated/autolinking

# Executar react-native config para gerar autolinking.json
if npx react-native config --output-type json > android/build/generated/autolinking/autolinking.json 2>&1; then
    echo "✅ autolinking.json gerado com sucesso"
else
    echo "⚠️ Erro ao gerar autolinking.json com react-native config, tentando alternativa..."

    # Fallback: criar um arquivo vazio ou genérico
    echo '{"project": {}, "dependencies": {}}' > android/build/generated/autolinking/autolinking.json
    echo "✅ autolinking.json criado (fallback)"
fi

# Mostrar o conteúdo do arquivo gerado
echo "Conteúdo do autolinking.json:"
cat android/build/generated/autolinking/autolinking.json

echo "✅ Pre-build hook concluído!"
