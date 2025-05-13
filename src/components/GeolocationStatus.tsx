import React, { useState, useEffect } from 'react';
import { useGeolocation, PermissionStatus } from '../hooks/use-geolocation'; // Ajuste o caminho se necessário

/**
 * Componente minimalista que exibe o status atual da geolocalização
 * abaixo da barra de pesquisa, ocultando-se quando há resultados de pesquisa.
 */
export function GeolocationStatus() {
  const {
    loading,
    source, // 'browser', 'ip', ou undefined/null
    permissionStatus, // Objeto/Enum como PermissionStatus.GRANTED, DENIED, PROMPT
    error,   // String de erro ou null
    addressLine // Linha de endereço (rua mais próxima)
  } = useGeolocation();

  // Estado para verificar se há resultados de pesquisa ativos
  const [hasSearchResults, setHasSearchResults] = useState(false);

  // --- Efeito para observar resultados de pesquisa ---
  useEffect(() => {
    // Observador para detectar mudanças no DOM e verificar a lista de resultados.
    // ATENÇÃO: Observar 'document.body' com 'subtree: true' pode ter
    //          impacto na performance em páginas muito complexas.
    //          Considere observar um container mais específico se possível.
    const observer = new MutationObserver(() => {
      // Tenta encontrar o container de resultados pela classe.
      // Idealmente, use um seletor mais robusto (ex: data-testid) se possível.
      const resultsContainer = document.querySelector('.results-list');
      if (resultsContainer) {
        // Se encontrou a lista, verifica se ela tem elementos filhos (resultados)
        setHasSearchResults(resultsContainer.children.length > 0);
      } else {
        // Se não encontrou a lista, assume que não há resultados
        setHasSearchResults(false);
      }
    });

    // Inicia a observação no corpo do documento
    observer.observe(document.body, {
      childList: true, // Observa adição/remoção de nós filhos
      subtree: true,   // Observa toda a subárvore
      attributes: false, // Não observa atributos
      characterData: false // Não observa mudanças no texto
    });

    // Função de limpeza: desconecta o observador quando o componente desmontar
    return () => observer.disconnect();
  }, []); // Array de dependências vazio, executa apenas na montagem/desmontagem

  // --- Determina a cor e o texto do indicador ---
  let statusColor = 'bg-gray-400'; // Cor padrão (cinza)
  let statusText = 'Localização desconhecida';

  if (loading) {
    statusColor = 'bg-amber-400'; // Amarelo
    statusText = 'Localizando...';
  } else if (error) {
    statusColor = 'bg-red-400';   // Vermelho
    statusText = 'Erro de localização';
  } else if (permissionStatus === PermissionStatus.DENIED) {
    statusColor = 'bg-red-400';   // Vermelho
    statusText = 'Permissão negada';
  } else if (source === 'browser') {
    statusColor = 'bg-green-400'; // Verde
    // Independente de ter rua ou não, mostrar Localização precisa
    statusText = 'Localização precisa';
  } else if (source === 'ip') {
    statusColor = 'bg-blue-400';  // Azul
    // Mantém apenas "Localização aproximada" sem adicionar o endereço
    statusText = 'Localização aproximada';
  }
  // Nota: Outros estados de permissão (GRANTED, PROMPT) são cobertos implicitamente
  //       pela lógica de 'source' e 'loading'.

  // --- Renderização ---

  // Se houver resultados de pesquisa visíveis, não renderiza o indicador
  if (hasSearchResults) {
    return null;
  }

  return (
    <div
      className="flex justify-center items-center mt-1 mb-6"
      // Acessibilidade: Informa que a região contém status e que atualizações devem ser anunciadas
      role="status"
      aria-live="polite"
    >
      <div className="relative inline-flex items-center">
        {/* Indicador visual (círculo colorido) */}
        <div
          className={`
            ${statusColor}
            w-2 h-2           
            rounded-full      
            transition-colors duration-300 
            ${loading ? 'animate-pulse' : ''} 
          `}
          aria-hidden="true" // Esconde o círculo decorativo de leitores de tela
        />

        {/* Texto minimalista ao lado do indicador (fonte reduzida para 8px) */}
        <span className="ml-1.5 text-[8px] text-gray-500 select-none"> 
          {statusText}
        </span>
      </div>
    </div>
  );
}

// --- Definição de Exemplo (se não vier do hook) ---
// Remova ou ajuste isso conforme a implementação real do seu hook
/*
const PermissionStatus = {
  GRANTED: 'granted',
  DENIED: 'denied',
  PROMPT: 'prompt'
};

// Hook de Exemplo (simulação para teste, substitua pelo seu real)
const useGeolocation = () => {
  // Simule diferentes estados para testar:
  // return { loading: true, source: undefined, permissionStatus: undefined, error: null };
  // return { loading: false, source: 'browser', permissionStatus: PermissionStatus.GRANTED, error: null };
  // return { loading: false, source: 'ip', permissionStatus: PermissionStatus.GRANTED, error: null };
   return { loading: false, source: undefined, permissionStatus: PermissionStatus.DENIED, error: null };
  // return { loading: false, source: undefined, permissionStatus: undefined, error: new Error("Falha ao obter localização") };
  // return { loading: false, source: undefined, permissionStatus: undefined, error: null }; // Estado desconhecido
};
*/