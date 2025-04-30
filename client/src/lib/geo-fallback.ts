/**
 * Fallback para geolocalização
 * Utilizado quando o navegador não consegue obter a localização
 */

// Coordenadas default para São Paulo
const DEFAULT_COORDINATES = {
  latitude: -23.5505,
  longitude: -46.6333,
  city: 'São Paulo',
  country: 'Brasil'
};

// Função para obter localização de fallback
export async function getLocationByIP(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    // Como não podemos acessar serviços externos devido a restrições, 
    // vamos usar a localização padrão para demonstração
    console.log('[DEBUG] Usando localização padrão para demonstração:', {
      lat: DEFAULT_COORDINATES.latitude,
      lng: DEFAULT_COORDINATES.longitude,
      city: DEFAULT_COORDINATES.city,
      country: DEFAULT_COORDINATES.country
    });
    
    return {
      latitude: DEFAULT_COORDINATES.latitude,
      longitude: DEFAULT_COORDINATES.longitude
    };
    
  } catch (error) {
    console.error('Erro ao obter localização de fallback:', error);
    return null;
  }
}