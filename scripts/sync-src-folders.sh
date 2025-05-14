#!/bin/bash

# Script para sincronizar o conteúdo de src/ para client/src/
# Usado para garantir que alterações feitas no diretório src/ sejam refletidas no client/src/

echo "==> Iniciando sincronização de diretórios src/..."

# Verifica se os diretórios existem
if [ ! -d "src" ]; then
  echo "Erro: Diretório src/ não encontrado!"
  exit 1
fi

if [ ! -d "client/src" ]; then
  echo "Erro: Diretório client/src/ não encontrado!"
  exit 1
fi

# Garantir que o diretório shared exista no client
if [ ! -d "client/shared" ]; then
  echo "==> Criando diretório client/shared/"
  mkdir -p client/shared
fi

# Copiar shared para client/shared
echo "==> Copiando arquivos de shared/ para client/shared/..."
cp -Rf shared/* client/shared/

# Sincroniza os arquivos de src/ para client/src/
echo "==> Copiando arquivos de src/ para client/src/..."
cp -Rf src/* client/src/

# Corrigir os imports nos arquivos copiados
echo "==> Corrigindo caminhos de importação..."
find client/src -type f -name "*.ts" -o -name "*.tsx" | while read -r file; do
  # Substituir '../../shared/schema' por '@shared/schema'
  sed -i 's|../../shared/schema|@shared/schema|g' "$file"
  # Substituir '../shared/schema' por '@shared/schema'
  sed -i 's|../shared/schema|@shared/schema|g' "$file"
done

echo "==> Listando arquivos copiados e corrigidos:"
find client/src -type f -name "*.ts" -o -name "*.tsx" | sort

echo "==> Sincronização e correção de imports concluída com sucesso!"