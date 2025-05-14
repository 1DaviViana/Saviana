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
  mkdir -p client/src
  echo "Diretório client/src/ criado."
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
echo "==> Corrigindo caminhos de importação nos arquivos..."

# Função para corrigir imports em arquivos individuais
fix_imports() {
  local file="$1"
  echo "Processando: $file"
  
  # Substituir todas as variações de import de shared/schema com caminho relativo
  # Use inline type definitions instead of imports
  if grep -q "from ['\"]../../shared/schema['\"]" "$file" || grep -q "from ['\"]../shared/schema['\"]" "$file" || grep -q "from ['\"]@shared/schema['\"]" "$file"; then
    # Fazer backup do arquivo original
    cp "$file" "${file}.bak"
    
    # Remove import lines related to schema
    sed -i '/import.*from.*shared\/schema/d' "$file"
    sed -i '/import.*from.*@shared\/schema/d' "$file"
    
    # Add appropriate inline type definitions if needed
    if grep -q "SearchResponse" "$file" && ! grep -q "type SearchResponse" "$file"; then
      # Insert the SearchResponse type definition at the top of the file after the imports
      sed -i '/^import/!b;:a;n;/^import/ba;i\
// Define inline types to avoid import issues\
type SearchResponse = {\
  needsClarification: boolean;\
  clarificationQuestion?: string;\
  results?: Array<{\
    id?: number;\
    name: string;\
    category: '\''local'\'' | '\''national'\'' | '\''global'\'';\
    address?: string;\
    location?: { lat: number; lng: number };\
    website?: string;\
    rating?: string;\
    reviews?: string;\
    distance?: string;\
    price?: string;\
    hasProduct: boolean;\
    metadata?: any;\
  }>;\
  _debug?: any;\
};' "$file"
    fi
  fi
}

# Find all TypeScript files and fix imports
find client/src -type f \( -name "*.ts" -o -name "*.tsx" \) | while read -r file; do
  fix_imports "$file"
done

echo "==> Listando arquivos copiados e corrigidos:"
find client/src -type f -name "*.ts" -o -name "*.tsx" | sort

echo "==> Sincronização e correção de imports concluída com sucesso!"