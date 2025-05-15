#!/bin/bash
# Script para corrigir problemas de sintaxe em componentes UI
# Este script reorganiza as importações e declarações de funções nos arquivos de componentes UI

# Diretório de componentes UI
UI_DIR="client/src/components/ui"

# Itera por todos os arquivos de componentes UI
for file in "$UI_DIR"/*.tsx; do
  echo "Processando: $file"

  # Backup do arquivo original
  cp "$file" "${file}.backup"
  
  # Arquivo temporário para construção
  temp_file=$(mktemp)
  
  # Extrai o "use client" se existir
  grep -E "^\"use client\"" "$file" > "$temp_file" 2>/dev/null
  
  # Adiciona uma linha em branco depois do "use client"
  if [ -s "$temp_file" ]; then
    echo "" >> "$temp_file"
  fi
  
  # Extrai todas as importações e coloca no início do arquivo
  grep -E "^import " "$file" | sort | uniq >> "$temp_file"
  
  # Adiciona linha em branco após as importações
  echo "" >> "$temp_file"
  
  # Adiciona a função cn de utilidade
  echo '// Define the cn utility function inline to avoid import issues' >> "$temp_file"
  echo 'function cn(...inputs: any[]) {' >> "$temp_file"
  echo '  return inputs.filter(Boolean).join(" ");' >> "$temp_file"
  echo '}' >> "$temp_file"
  echo "" >> "$temp_file"
  
  # Adiciona o restante do conteúdo, excluindo importações, "use client" e declarações de cn
  grep -v -E "^import |^\"use client\"|// Define the cn utility function|function cn\(|  return inputs.filter" "$file" >> "$temp_file"
  
  # Remove linhas vazias extras
  sed -i '/^[[:space:]]*$/N;/^\n[[:space:]]*$/D' "$temp_file"
  
  # Copia o resultado de volta para o arquivo original
  cp "$temp_file" "$file"
  
  # Remove o arquivo temporário
  rm "$temp_file"

done

echo "Correção de componentes UI concluída!"