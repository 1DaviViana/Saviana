#!/bin/bash
# Script para substituir caminhos @/ para verificação CI
# Este script cria cópias temporárias dos arquivos com caminhos relativos em vez de @/

# Diretório de saída para arquivos temporários
TEMP_DIR="temp_tsc_check"

# Cria diretório temporário
mkdir -p $TEMP_DIR

echo "Copiando arquivos com caminhos corrigidos para verificação TypeScript..."

# Copia arquivos com substituição de caminhos
for file in client/src/components/ui/*.tsx; do
  base_name=$(basename "$file")
  cp "$file" "$TEMP_DIR/$base_name"
  
  # Substitui @/components/ por ../
  sed -i 's|@/components/|../|g' "$TEMP_DIR/$base_name"
  
  # Substitui @/lib/ por ../../lib/
  sed -i 's|@/lib/|../../lib/|g' "$TEMP_DIR/$base_name"
  
  # Substitui @/hooks/ por ../../hooks/
  sed -i 's|@/hooks/|../../hooks/|g' "$TEMP_DIR/$base_name"
done

echo "Verificando componentes com caminhos corrigidos..."
npx tsc --jsx react --esModuleInterop "$TEMP_DIR/carousel.tsx" "$TEMP_DIR/form.tsx" "$TEMP_DIR/sidebar.tsx" "$TEMP_DIR/resizable.tsx"

result=$?

# Limpa diretório temporário
rm -rf "$TEMP_DIR"

if [ $result -eq 0 ]; then
  echo "✅ Verificação TypeScript bem-sucedida com caminhos relativos!"
  exit 0
else
  echo "❌ Ainda existem erros mesmo com caminhos relativos."
  exit 1
fi