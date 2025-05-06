#!/bin/bash
# Script para construir apenas o backend para implantação no Railway

# Garante que estamos no diretório raiz do projeto
cd "$(dirname "$0")/.."

# Instala as dependências do projeto
echo "Instalando dependências..."
npm install

# Constrói o backend
echo "Construindo o backend..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "Backend construído com sucesso em ./dist/index.js"
echo "Pronto para implantação no Railway"