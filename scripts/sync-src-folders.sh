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
  
  # 1. Fix React imports - Make sure all component files import React
  if [[ $file == *".tsx" ]]; then
    if ! grep -q "import.*React.*from" "$file"; then
      # If React is not imported, add the import at the top
      sed -i '1s/^/import * as React from "react";\n/' "$file"
    elif grep -q "import React from" "$file"; then
      # If React is imported directly, change to import * as React
      sed -i 's/import React from/import * as React from/g' "$file"
    fi
  fi
  
  # 2. Fix @/lib/utils imports - Replace with inline implementation
  if grep -q "from ['\"]@/lib/utils['\"]" "$file"; then
    # Remove the import
    sed -i '/import.*from.*@\/lib\/utils/d' "$file"
    
    # Add inline implementation for cn function if it's used
    if grep -q "cn(" "$file"; then
      sed -i '/^import/!b;:a;n;/^import/ba;i\
// Define the cn utility function inline to avoid import issues\
function cn(...inputs: any[]) {\
  return inputs.filter(Boolean).join(" ");\
}' "$file"
    fi
  fi
  
  # 3. Fix shared/schema imports
  if grep -q "from ['\"]../../shared/schema['\"]" "$file" || grep -q "from ['\"]../shared/schema['\"]" "$file" || grep -q "from ['\"]@shared/schema['\"]" "$file"; then
    # Make backup
    cp "$file" "${file}.bak"
    
    # Remove import lines related to schema
    sed -i '/import.*from.*shared\/schema/d' "$file"
    sed -i '/import.*from.*@shared\/schema/d' "$file"
    
    # Add appropriate inline type definitions if needed
    if grep -q "SearchRequest" "$file" && ! grep -q "type SearchRequest" "$file"; then
      sed -i '/^import/!b;:a;n;/^import/ba;i\
// Define inline types to avoid import issues\
type SearchRequest = {\
  query: string;\
  userResponse?: string;\
  latitude?: number;\
  longitude?: number;\
  isPerishable?: boolean;\
};' "$file"
    fi
    
    if grep -q "SearchResponse" "$file" && ! grep -q "type SearchResponse" "$file"; then
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
  
  # 4. Fix JSX component syntax if needed
  if [[ $file == *"resizable.tsx" ]]; then
    # Convert arrow functions to regular functions with explicit React.createElement
    if grep -q "=> (" "$file"; then
      echo "Fixing JSX in $file..."
      cp "$file" "${file}.before_jsx_fix"
      
      # Use our complete rewrite if it's the resizable component
      cat > "$file" << 'EOF'
"use client"

import * as React from 'react';
import { GripVertical } from "lucide-react";
import * as ResizablePrimitive from "react-resizable-panels";

// Define the cn utility function inline to avoid import issues
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

function ResizablePanelGroup(props: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) {
  const { className, ...rest } = props;
  return React.createElement(
    ResizablePrimitive.PanelGroup,
    {
      className: cn(
        "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
        className
      ),
      ...rest
    }
  );
}

// Use the Panel directly
const ResizablePanel = ResizablePrimitive.Panel;

// Define the interface for ResizableHandle props
interface ResizableHandleProps extends React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> {
  withHandle?: boolean;
}

function ResizableHandle(props: ResizableHandleProps) {
  const { withHandle, className, ...rest } = props;
  
  return React.createElement(
    ResizablePrimitive.PanelResizeHandle,
    {
      className: cn(
        "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
        className
      ),
      ...rest
    },
    withHandle ? 
      React.createElement(
        'div',
        { className: "z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border" },
        React.createElement(GripVertical, { className: "h-2.5 w-2.5" })
      ) : 
      null
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
EOF
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