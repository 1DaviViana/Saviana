#!/bin/bash
# Script para verificar se os componentes compilam corretamente

echo "Verificando componentes UI com tsc..."
npx tsc --jsx react --esModuleInterop client/src/components/ui/carousel.tsx client/src/components/ui/form.tsx client/src/components/ui/sidebar.tsx client/src/components/ui/resizable.tsx

if [ $? -eq 0 ]; then
  echo "✅ Todos os componentes compilaram com sucesso!"
else
  echo "❌ Ainda existem erros nos componentes."
fi
