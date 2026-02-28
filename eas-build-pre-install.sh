#!/bin/bash

# Generate autolinking.json for EAS Build
echo "📦 Gerando autolinking.json..."

cd mobile-app

# Usar react-native config para gerar o arquivo
npx react-native config > /dev/null 2>&1 || true

# Criar o diretório se não existir
mkdir -p android/build/generated/autolinking

# Gerar o arquivo autolinking.json
npx react-native config --output-type json > android/build/generated/autolinking/autolinking.json 2>&1 || echo "⚠️ Aviso: react-native config falhou, mas continuando..."

# Verificar se o arquivo foi criado
if [ -f "android/build/generated/autolinking/autolinking.json" ]; then
    echo "✅ autolinking.json gerado com sucesso"
    cat android/build/generated/autolinking/autolinking.json
else
    echo "⚠️ autolinking.json não foi gerado, criando vazio..."
    echo '{}' > android/build/generated/autolinking/autolinking.json
fi

echo "✅ Pre-install hook concluído!"
