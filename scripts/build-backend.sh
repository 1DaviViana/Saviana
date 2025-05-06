#!/bin/bash
# Script para construir apenas o backend para implantação no Railway

# Garante que estamos no diretório raiz do projeto
cd "$(dirname "$0")/.."

# Instala as dependências do projeto
echo "Instalando dependências..."
npm install

# Configura variáveis de ambiente para o backend
# Estas variáveis podem ser configuradas no Railway Dashboard
echo "Verificando variáveis de ambiente..."
if [ ! -z "$FRONTEND_URL" ]; then
  echo "FRONTEND_URL configurado como: $FRONTEND_URL"
fi

# Constrói o backend
echo "Construindo o backend..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Copia arquivos necessários para o Railway
echo "Copiando arquivos de configuração..."
cp Procfile .railway.toml dist/

# Copia o shared para o diretório de build
echo "Copiando diretório shared..."
mkdir -p dist/shared
cp -r shared/* dist/shared/

echo "Backend construído com sucesso em ./dist/index.js"
echo "Pronto para implantação no Railway"

# Deploy para Railway se solicitado e se o token estiver disponível
if [ "$1" == "--deploy" ] && [ ! -z "$RAILWAY_TOKEN" ]; then
  echo "Iniciando deploy para Railway..."
  npx railway up
fi