#!/bin/bash
# Script para construir apenas o frontend para implantação no GitHub Pages

# Garante que estamos no diretório raiz do projeto
cd "$(dirname "$0")/.."

# Instala as dependências do projeto
echo "Instalando dependências..."
npm install

# Configura variáveis de ambiente se fornecidas
if [ ! -z "$VITE_API_URL" ]; then
  echo "VITE_API_URL=$VITE_API_URL" > client/.env.production.local
  echo "Configurado API URL: $VITE_API_URL"
fi

# Constrói o frontend
echo "Construindo o frontend..."
npx vite build

# Cria um arquivo .nojekyll para GitHub Pages (já existente no script original)
echo "Criando arquivo .nojekyll..."
echo > dist/public/.nojekyll

# Copia o CNAME se existir
if [ -f "CNAME" ]; then
  echo "Copiando CNAME para dist/public..."
  cp CNAME dist/public/
fi

echo "Frontend construído com sucesso em ./dist/public"
echo "Pronto para implantação no GitHub Pages"

# Deploy para GitHub Pages se solicitado
if [ "$1" == "--deploy" ]; then
  echo "Iniciando deploy para GitHub Pages..."
  npx gh-pages -d dist/public
fi