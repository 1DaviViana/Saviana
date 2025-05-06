#!/bin/bash
# Script para construir apenas o frontend para implantação no GitHub Pages

# Garante que estamos no diretório raiz do projeto
cd "$(dirname "$0")/.."

# Instala as dependências do projeto
echo "Instalando dependências..."
npm install

# Constrói o frontend
echo "Construindo o frontend..."
npx vite build

# Cria um arquivo .nojekyll para GitHub Pages (já existente no script original)
echo "Criando arquivo .nojekyll..."
echo > dist/public/.nojekyll

echo "Frontend construído com sucesso em ./dist/public"
echo "Pronto para implantação no GitHub Pages"