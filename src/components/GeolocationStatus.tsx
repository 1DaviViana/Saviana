import React from 'react';
import { useGeolocation, PermissionStatus, LocationSource } from '../hooks/use-geolocation';

/**
 * Componente que exibe o status atual da geolocalização na parte inferior da tela
 */
export function GeolocationStatus() {
  const { 
    loading, 
    source, 
    permissionStatus, 
    latitude, 
    longitude 
  } = useGeolocation();

  // Determinar o status do componente para escolher a cor
  let statusColor = '';
  let statusText = '';

  // Define a cor e o texto com base no estado atual
  if (loading) {
    statusColor = 'bg-amber-500'; // Amarelo para carregando
    statusText = 'Obtendo localização...';
  } else if (source === 'browser' && latitude && longitude) {
    statusColor = 'bg-green-500'; // Verde para localização do navegador
    statusText = 'Localização obtida pelo navegador';
  } else if (source === 'ip' && latitude && longitude) {
    statusColor = 'bg-blue-500'; // Azul para localização por IP (fallback)
    statusText = 'Usando localização aproximada';
  } else {
    statusColor = 'bg-red-500'; // Vermelho para erro ou sem localização
    statusText = permissionStatus === PermissionStatus.DENIED 
      ? 'Permissão de localização negada' 
      : 'Não foi possível obter localização';
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 py-1 px-2 flex justify-center text-xs z-10">
      <div className={`${statusColor} text-white px-3 py-0.5 rounded-full shadow-md flex items-center opacity-80 hover:opacity-100 transition-opacity`}>
        <div className="w-2 h-2 rounded-full bg-white mr-2"></div>
        <span>{statusText}</span>
        {(latitude && longitude) && (
          <span className="ml-2 text-white/80 text-[10px]">
            {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </span>
        )}
      </div>
    </div>
  );
}