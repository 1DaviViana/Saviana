import React, { useEffect, useState } from 'react';
import { useGeolocation, PermissionStatus, LocationSource } from '../hooks/use-geolocation';

/**
 * Componente que exibe o status atual da geolocalização na parte inferior da tela
 * - Verde: Localização obtida pelo navegador
 * - Amarelo: Tentando obter localização
 * - Azul: Usando localização aproximada por IP (fallback)
 * - Vermelho: Erro ou localização indisponível
 */
export function GeolocationStatus() {
  const { 
    loading, 
    source, 
    permissionStatus, 
    latitude, 
    longitude,
    error,
    accuracy
  } = useGeolocation();

  // Estado para controlar a visibilidade expandida com detalhes
  const [expanded, setExpanded] = useState(false);
  
  // Estado para animação pulsante quando carregando
  const [pulse, setPulse] = useState(false);
  
  // Efeito para criar animação pulsante durante o carregamento
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setPulse(prev => !prev);
      }, 800);
      
      return () => clearInterval(interval);
    }
  }, [loading]);

  // Determinar o status do componente para escolher a cor
  let statusColor = '';
  let statusText = '';
  let statusIcon = '';
  let statusDetails = '';

  // Define a cor, ícone e texto com base no estado atual
  if (loading) {
    statusColor = 'bg-amber-500'; // Amarelo para carregando
    statusText = 'Obtendo localização...';
    statusIcon = '⟳'; // Ícone de atualização
    statusDetails = 'Aguardando resposta do navegador';
  } else if (source === 'browser' && latitude && longitude) {
    statusColor = 'bg-green-500'; // Verde para localização do navegador
    statusText = 'Localização precisa';
    statusIcon = '📍'; // Marcador de local
    statusDetails = `Precisão: ${accuracy ? Math.round(accuracy) + 'm' : 'desconhecida'}`;
  } else if (source === 'ip' && latitude && longitude) {
    statusColor = 'bg-blue-500'; // Azul para localização por IP (fallback)
    statusText = 'Localização aproximada';
    statusIcon = '🔍'; // Lupa
    statusDetails = 'Baseada no endereço IP';
  } else {
    statusColor = 'bg-red-500'; // Vermelho para erro ou sem localização
    statusText = permissionStatus === PermissionStatus.DENIED 
      ? 'Permissão negada' 
      : 'Localização indisponível';
    statusIcon = '⚠️'; // Aviso
    statusDetails = error || 'Verifique as permissões do navegador';
  }

  // Função para alternar o estado expandido
  const toggleExpanded = () => {
    setExpanded(prev => !prev);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 py-2 px-2 flex justify-center items-end text-xs z-20 pointer-events-none">
      <div 
        className={`
          ${statusColor} 
          text-white px-3 py-0.5 
          rounded-full shadow-md 
          flex items-center 
          ${pulse && loading ? 'opacity-60' : 'opacity-80'} 
          hover:opacity-100 
          transition-opacity
          cursor-pointer
          pointer-events-auto
        `}
        onClick={toggleExpanded}
      >
        <div className={`
          w-2 h-2 rounded-full bg-white mr-2
          ${loading ? 'animate-pulse' : ''}
        `}></div>
        <span className="flex items-center">
          <span className="mr-1">{statusIcon}</span>
          <span>{statusText}</span>
        </span>
        {(latitude && longitude) && !expanded && (
          <span className="ml-2 text-white/80 text-[10px]">
            {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </span>
        )}
        
        {/* Indicador de expandir/recolher */}
        <span className="ml-2 text-white/70">
          {expanded ? '▲' : '▼'}
        </span>
      </div>
      
      {/* Painel expandido com detalhes */}
      {expanded && (
        <div className="absolute bottom-8 bg-gray-800 text-white p-3 rounded-lg shadow-lg text-xs pointer-events-auto">
          <h4 className="font-semibold mb-2 border-b border-gray-700 pb-1">Detalhes da Geolocalização</h4>
          <div className="space-y-1">
            <p><span className="text-gray-400">Status:</span> {statusText}</p>
            <p><span className="text-gray-400">Fonte:</span> {source === 'browser' ? 'API do Navegador' : source === 'ip' ? 'Endereço IP' : 'Não definida'}</p>
            <p><span className="text-gray-400">Permissão:</span> {permissionStatus}</p>
            {latitude && longitude && (
              <>
                <p><span className="text-gray-400">Coordenadas:</span> {latitude.toFixed(6)}, {longitude.toFixed(6)}</p>
                <p><span className="text-gray-400">Detalhes:</span> {statusDetails}</p>
              </>
            )}
            {error && (
              <p className="text-red-300"><span className="text-gray-400">Erro:</span> {error}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}