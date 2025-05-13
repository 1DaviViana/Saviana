import React, { useState, useEffect } from 'react';
import { useGeolocation, PermissionStatus } from '../hooks/use-geolocation';

/**
 * Componente minimalista que exibe o status atual da geolocalização abaixo da barra de pesquisa
 * - Verde: Localização obtida pelo navegador
 * - Amarelo: Tentando obter localização
 * - Azul: Usando localização aproximada por IP (fallback)
 */
export function GeolocationStatus() {
  const { 
    loading, 
    source, 
    permissionStatus, 
    error
  } = useGeolocation();

  // Estado para verificar se há resultados de pesquisa ativos
  const [hasSearchResults, setHasSearchResults] = useState(false);
  
  // Estado para controlar informações adicionais quando hover
  const [showInfo, setShowInfo] = useState(false);

  // Verifica se há resultados de pesquisa para ocultar o indicador
  useEffect(() => {
    // Observa se há elementos com a classe 'results-list' contendo resultados
    const observer = new MutationObserver(() => {
      const resultsContainer = document.querySelector('.results-list');
      if (resultsContainer) {
        // Se encontrou a lista de resultados e ela tem conteúdo, oculta o indicador
        setHasSearchResults(resultsContainer.children.length > 0);
      } else {
        setHasSearchResults(false);
      }
    });

    // Observa mudanças no DOM do corpo da página
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: false,
      characterData: false
    });

    return () => observer.disconnect();
  }, []);

  // Define a cor do indicador baseado no estado atual
  let statusColor = '';
  
  // Atribuição de cores conforme solicitado
  if (loading) {
    statusColor = 'bg-amber-400'; // Amarelo para carregando
  } else if (source === 'browser') {
    statusColor = 'bg-green-400'; // Verde para localização do navegador
  } else if (source === 'ip') {
    statusColor = 'bg-blue-400'; // Azul para localização por IP (fallback)
  } else if (error || permissionStatus === PermissionStatus.DENIED) {
    statusColor = 'bg-red-400'; // Vermelho para erro ou permissão negada
  } else {
    statusColor = 'bg-gray-400'; // Cinza para estado indefinido
  }

  // Se houver resultados de pesquisa, não exibe o indicador
  if (hasSearchResults) {
    return null;
  }

  return (
    <div 
      className="flex justify-center items-center mt-1 mb-6"
      onMouseEnter={() => setShowInfo(true)}
      onMouseLeave={() => setShowInfo(false)}
    >
      <div className="relative inline-flex items-center">
        {/* Indicador minimalista - apenas um pequeno círculo colorido */}
        <div 
          className={`
            ${statusColor} 
            w-2 h-2 
            rounded-full
            transition-all duration-200
            ${loading ? 'animate-pulse' : ''}
          `}
        />
        
        {/* Texto minimalista ao lado do indicador (com fonte menor) */}
        <span className="ml-1.5 text-[8px] text-gray-500">
          {loading ? 'Localizando...' : 
           source === 'browser' ? 'Localização precisa' :
           source === 'ip' ? 'Localização aproximada' :
           error ? 'Erro de localização' : 
           permissionStatus === PermissionStatus.DENIED ? 'Permissão negada' : 
           'Localização desconhecida'}
        </span>
        
        {/* Tooltip com informações mais detalhadas no hover */}
        {showInfo && (
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 
                        bg-white/90 backdrop-blur-sm text-gray-800 text-[10px] py-1 px-2 
                        rounded shadow-md whitespace-nowrap z-10">
            {source === 'browser' ? 'Localização obtida pelo navegador' :
             source === 'ip' ? 'Localização aproximada pelo IP' :
             error ? `Erro: ${error}` : 
             permissionStatus === PermissionStatus.DENIED ? 'Permissão negada pelo usuário' : 
             loading ? 'Obtendo localização do navegador...' :
             'Status de localização desconhecido'}
          </div>
        )}
      </div>
    </div>
  );
}