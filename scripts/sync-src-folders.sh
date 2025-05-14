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

# Sincroniza os arquivos de src/ para client/src/
echo "==> Copiando arquivos de src/ para client/src/..."
cp -Rf src/* client/src/

echo "==> Listando arquivos copiados:"
find client/src -type f -name "*.ts" -o -name "*.tsx" | sort

echo "==> Sincronização concluída com sucesso!"