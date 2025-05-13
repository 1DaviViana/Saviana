/**
 * Fallback para geolocalização
 * Utilizado quando o navegador não consegue obter a localização
 */
import { Client } from '@googlemaps/google-maps-services-js';

// Coordenadas default para Curitiba (conforme visto nas coordenadas detectadas)
const DEFAULT_COORDINATES = {
  latitude: -25.476687,
  longitude: -49.28206,
  city: 'Curitiba',
  country: 'Brasil',
  addressLine: undefined
};

// Cliente do Google Maps
const googleMapsClient = new Client({});

// Interface para resposta da localização
export interface LocationResponse {
  latitude: number;
  longitude: number;
  country?: string;
  city?: string;
  addressLine?: string; // Linha de endereço (rua mais próxima)
}

// Função para obter localização de fallback
export async function getLocationByIP(): Promise<LocationResponse | null> {
  try {
    // Tentamos obter o endereço mais próximo usando as coordenadas padrão
    const addressLine = await getNearestAddress(
      DEFAULT_COORDINATES.latitude, 
      DEFAULT_COORDINATES.longitude
    ) || DEFAULT_COORDINATES.addressLine;
    
    console.log('[DEBUG] Usando localização de fallback com endereço:', {
      lat: DEFAULT_COORDINATES.latitude,
      lng: DEFAULT_COORDINATES.longitude,
      city: DEFAULT_COORDINATES.city,
      country: DEFAULT_COORDINATES.country,
      addressLine
    });
    
    return {
      latitude: DEFAULT_COORDINATES.latitude,
      longitude: DEFAULT_COORDINATES.longitude,
      city: DEFAULT_COORDINATES.city,
      country: DEFAULT_COORDINATES.country,
      addressLine
    };
    
  } catch (error) {
    console.error('Erro ao obter localização de fallback:', error);
    return null;
  }
}

/**
 * Obtém o endereço da rua mais próxima com base nas coordenadas
 * @param latitude Latitude
 * @param longitude Longitude
 * @returns String com o endereço da rua mais próxima ou undefined
 */
export async function getNearestAddress(latitude: number, longitude: number): Promise<string | undefined> {
  try {
    // Usa Reverse Geocoding da API do Google Maps para obter o endereço
    const response = await googleMapsClient.reverseGeocode({
      params: {
        latlng: { lat: latitude, lng: longitude },
        key: 'AIzaSyA5YORj7HlZUQ7Ftafulh05Z6cvLk3qvr4',
        language: undefined,
        result_type: [],
      }
    });

    if (
      response.data.status === 'OK' && 
      response.data.results && 
      response.data.results.length > 0
    ) {
      // Pega o primeiro resultado que é geralmente o mais próximo/preciso
      const firstResult = response.data.results[0];
      
      // Extrai apenas o nome da rua (primeiro componente do endereço formatado)
      const streetName = firstResult.address_components?.find(
        component => component.types.some(type => type === 'route')
      )?.long_name;
      
      if (streetName) {
        return streetName;
      }
      
      // Se não encontrar especificamente a rua, usa o endereço formatado mais curto
      return firstResult.formatted_address?.split(',')[0];
    }
    
    return DEFAULT_COORDINATES.addressLine;
  } catch (error) {
    console.error('Erro ao obter endereço das coordenadas:', error);
    return DEFAULT_COORDINATES.addressLine;
  }
}