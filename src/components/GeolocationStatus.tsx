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
    error    // Objeto de erro ou null
  } = useGeolocation();

  // Estado para verificar se há resultados de pesquisa ativos
  const [hasSearchResults, setHasSearchResults] = useState(false);

  // Estado para controlar a exibição do tooltip no hover
  const [showInfo, setShowInfo] = useState(false);

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
  let tooltipText = 'Status de localização desconhecido';

  if (loading) {
    statusColor = 'bg-amber-400'; // Amarelo
    statusText = 'Localizando...';
    tooltipText = 'Obtendo localização do navegador...';
  } else if (error) {
    statusColor = 'bg-red-400';   // Vermelho
    statusText = 'Erro de localização';
    // Tenta usar a mensagem do erro, se disponível
    tooltipText = `Erro: ${error?.message || 'Detalhes indisponíveis'}`;
  } else if (permissionStatus === PermissionStatus.DENIED) {
    statusColor = 'bg-red-400';   // Vermelho
    statusText = 'Permissão negada';
    tooltipText = 'Permissão de localização negada pelo usuário';
  } else if (source === 'browser') {
    statusColor = 'bg-green-400'; // Verde
    statusText = 'Localização precisa';
    tooltipText = 'Localização obtida com precisão pelo navegador';
  } else if (source === 'ip') {
    statusColor = 'bg-blue-400';  // Azul
    statusText = 'Localização aproximada';
    tooltipText = 'Localização aproximada obtida via endereço IP';
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
      onMouseEnter={() => setShowInfo(true)}
      onMouseLeave={() => setShowInfo(false)}
      // Acessibilidade: Informa que a região contém status e que atualizações devem ser anunciadas
      role="status"
      aria-live="polite"
    >
      <div className="relative inline-flex items-center">
        {/* Indicador visual (círculo colorido) */}
        <div
          className={`
            ${statusColor}
            w-2 h-2           {/* Tamanho do círculo */}
            rounded-full      {/* Forma de círculo */}
            transition-colors duration-300 {/* Transição suave de cor */}
            ${loading ? 'animate-pulse' : ''} {/* Animação de pulso durante o carregamento */}
          `}
          aria-hidden="true" // Esconde o círculo decorativo de leitores de tela
        />

        {/* Texto minimalista ao lado do indicador (fonte reduzida) */}
        <span className="ml-1.5 text-[7px] text-gray-500 select-none"> {/* Fonte bem pequena */}
          {statusText}
        </span>

        {/* Tooltip com informações mais detalhadas (exibido no hover) */}
        {showInfo && (
          <div
            className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1.5 /* Posicionamento abaixo e centralizado */
                       bg-white/90 backdrop-blur-sm /* Fundo semi-transparente com blur */
                       text-gray-800 text-[9px] /* Texto do tooltip (fonte pequena) */
                       py-1 px-2
                       rounded shadow-lg /* Sombra mais pronunciada */
                       whitespace-nowrap /* Evita quebra de linha */
                       z-10 /* Garante que fique sobre outros elementos */
                       pointer-events-none /* Evita que o tooltip capture eventos do mouse */
                      "
            // Acessibilidade: Poderia ser ligado ao span via aria-describedby, mas complica o estado
          >
            {tooltipText}
          </div>
        )}
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