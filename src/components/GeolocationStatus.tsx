import React, { useState } from 'react';
import { useGeolocation, PermissionStatus } from '../hooks/use-geolocation';

/**
 * Componente minimalista que exibe o status atual da geolocalização
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

  // Estado para controlar informações adicionais quando hover
  const [showInfo, setShowInfo] = useState(false);

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

  return (
    <div 
      className="fixed bottom-2 right-2 z-10"
      onMouseEnter={() => setShowInfo(true)}
      onMouseLeave={() => setShowInfo(false)}
    >
      {/* Indicador minimalista - apenas um pequeno círculo colorido */}
      <div 
        className={`
          ${statusColor} 
          w-3 h-3 
          rounded-full
          transition-all duration-200
          shadow-sm
          ${loading ? 'animate-pulse' : ''}
          hover:transform hover:scale-150
        `}
      />
      
      {/* Tooltip que aparece apenas no hover */}
      {showInfo && (
        <div className="absolute bottom-5 right-0 mb-1 bg-white/90 backdrop-blur-sm text-gray-800 text-[10px] py-1 px-2 rounded shadow-md whitespace-nowrap">
          {loading ? 'Obtendo localização...' : 
           source === 'browser' ? 'Localização: navegador' :
           source === 'ip' ? 'Localização: aproximada' :
           error ? 'Erro de localização' : 
           permissionStatus === PermissionStatus.DENIED ? 'Permissão negada' : 
           'Status desconhecido'}
        </div>
      )}
    </div>
  );
}