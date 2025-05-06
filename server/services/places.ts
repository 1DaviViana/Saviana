import { InsertSearchResult } from "@shared/schema";
import { analyzeQueryWithResponse } from "./openai";

// Mock e-commerce sites for national and global categories
const NATIONAL_SITES = [
  { name: "Mercado Livre", website: "https://www.mercadolivre.com.br" },
  { name: "Americanas", website: "https://www.americanas.com.br" },
  { name: "Magazine Luiza", website: "https://www.magazineluiza.com.br" },
  { name: "Shopee", website: "https://shopee.com.br" },
];

const GLOBAL_SITES = [
  { name: "Amazon", website: "https://www.amazon.com" },
  { name: "AliExpress", website: "https://www.aliexpress.com" },
  { name: "eBay", website: "https://www.ebay.com" },
];

// Sistema de cache para evitar repetição de chamadas à API Google Places
// Chave: latitude,longitude,termo
// Valor: resultados formatados
interface PlaceSearchCacheEntry {
  results: InsertSearchResult[];
  timestamp: number;
}

// Limpar o cache periodicamente
export function clearPlaceSearchCache() {
  console.log("🧹 Limpando cache de busca de lugares...");
  Object.keys(placeSearchCache).forEach(key => {
    delete placeSearchCache[key];
  });
  console.log("✅ Cache limpo com sucesso!");
}

const placeSearchCache: Record<string, PlaceSearchCacheEntry> = {};

interface GooglePlacesResponse {
  results: Array<{
    place_id: string;
    name: string;
    vicinity: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    rating?: number;
    user_ratings_total?: number;
    opening_hours?: {
      open_now: boolean;
    };
    photos?: Array<{
      photo_reference: string;
    }>;
    types: string[];
  }>;
  status: string;
}

/**
 * Search for places based on the user's query and response
 */
export async function searchPlaces(
  query: string,
  userResponse?: string,
  latitude?: number | null,
  longitude?: number | null,
  isPerishable?: boolean
): Promise<InsertSearchResult[]> {
  const results: InsertSearchResult[] = [];
  const debugData: any = {
    query,
    userResponse,
    location: { latitude, longitude },
    timestamp: new Date().toISOString(),
    steps: []
  };
  
  console.log(`🔍 INICIANDO BUSCA: "${query}" ${userResponse ? `/ resposta: "${userResponse}"` : ""}`);
  console.log(`📍 Coordenadas: ${latitude}, ${longitude}`);
  console.log(`🍎 Produto perecível: ${isPerishable ? "Sim" : "Não"}`);
  
  // Registrar na depuração
  debugData.isPerishable = isPerishable;
  
  try {
    // Generate search categories based on the query and user response
    debugData.steps.push({ step: "Analyzing query with response" });
    const queryResponse = await analyzeQueryWithResponse(
      query,
      userResponse || ""
    );
    const searchTerms = queryResponse.categories;
    debugData.steps.push({ 
      step: "Generated search terms",
      searchTerms,
      openaiDebug: queryResponse._debug 
    });
    
    // If we have location data, search for local places
    if (latitude && longitude) {
      debugData.steps.push({ step: "Searching local places" });
      const localResults = await searchLocalPlaces(
        searchTerms,
        latitude,
        longitude
      );
      debugData.steps.push({ 
        step: "Local results", 
        count: localResults.length,
        results: localResults.map(r => ({ name: r.name, address: r.address }))
      });
      results.push(...localResults);
    } else {
      debugData.steps.push({ step: "Skipping local search - no coordinates" });
    }
    
    // Se o produto não for perecível, adicionar resultados nacionais e globais
    // Ou se não houver coordenadas, mostrar resultados online como fallback
    if (!isPerishable || !latitude || !longitude) {
      // Add national online retailers
      debugData.steps.push({ step: "Generating national results" });
      const nationalResults = generateNationalResults(query, userResponse);
      debugData.steps.push({ 
        step: "National results", 
        count: nationalResults.length,
        results: nationalResults.map(r => ({ name: r.name, website: r.website }))
      });
      results.push(...nationalResults);
      
      // Add global online retailers
      debugData.steps.push({ step: "Generating global results" });
      const globalResults = generateGlobalResults(query, userResponse);
      debugData.steps.push({ 
        step: "Global results", 
        count: globalResults.length,
        results: globalResults.map(r => ({ name: r.name, website: r.website }))
      });
      results.push(...globalResults);
    } else {
      debugData.steps.push({ 
        step: "Skipping national and global results", 
        reason: "Product is perishable or requires local purchase" 
      });
      console.log("Produto perecível: ignorando resultados nacionais e globais");
    }
    
    // Add debug data to results
    results.forEach(result => {
      if (!result.metadata) {
        result.metadata = {} as any;
      }
      (result.metadata as any)._debugOrigin = result.category;
    });
    
    // Add debug field to first result
    if (results.length > 0 && results[0].metadata) {
      (results[0].metadata as any)._debugAll = debugData;
    }
    
    return results;
  } catch (error) {
    console.error("Error searching places:", error);
    debugData.steps.push({ step: "Error", error: String(error) });
    
    // Add a dummy result with debug data if no results
    if (results.length === 0) {
      results.push({
        queryId: 0,
        name: "Debug Info",
        category: "local",
        hasProduct: false,
        metadata: { 
          _debug: debugData,
          description: "Error occurred during search" 
        } as any
      });
    }
    
    return results;
  }
}

/**
 * Search for local places using Google Places API
 */
// Adiciona logs para as chamadas à API do Google Places
function logGooglePlacesRequest(url: string, params: any) {
  console.log('🔍 Google Places API Request:', {
    baseUrl: url,
    params: params
  });
}

function logGooglePlacesResponse(data: any, error?: any) {
  if (error) {
    console.error('❌ Google Places API Error:', error);
    return;
  }
  
  console.log('✅ Google Places API Response:', {
    status: data.status,
    resultsCount: data.results?.length || 0
  });
}

/**
 * Busca lugares com raio adaptativo começando com 300m (caminhada) e expandindo até encontrar pelo menos 5 resultados
 */
async function searchLocalPlaces(
  searchTerms: string[],
  latitude: number,
  longitude: number
): Promise<InsertSearchResult[]> {
  const results: InsertSearchResult[] = [];
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
  
  if (!googleApiKey) {
    console.error("Google Places API key not found");
    return results;
  }
  
  try {
    console.log("Searching for local places with terms:", searchTerms);
    
    // Otimização: Limitar a 5 termos de busca para ter melhores resultados
    // Priorizar os primeiros termos que são mais relevantes
    const limitedSearchTerms = searchTerms.slice(0, 5);
    
    // Define a sequência de raios de busca (em metros)
    // Começa com raio de caminhada (300m) e expande gradualmente
    const searchRadiusSteps = [300, 500, 1000, 2000, 5000];
    
    // Armazena todos os resultados encontrados em todas as iterações
    let allPlacesFound: InsertSearchResult[] = [];
    // Flag para indicar se encontramos resultados suficientes
    let foundEnoughResults = false;
    // Índice do raio atual na sequência
    let radiusIndex = 0;
    
    // Continua buscando com raios maiores até encontrar pelo menos 5 resultados ou esgotar os raios
    while (!foundEnoughResults && radiusIndex < searchRadiusSteps.length) {
      const currentRadius = searchRadiusSteps[radiusIndex];
      console.log(`🔍 Buscando com raio de ${currentRadius}m (passo ${radiusIndex + 1}/${searchRadiusSteps.length})`);
      
      // Use reduced search terms to find local places with current radius
      const searchPromises = limitedSearchTerms.map(async (term) => {
        // Cria uma chave única para o cache com base na localização, termo de busca e raio
        const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)},${term},${currentRadius}`;
        
        // Verifica se já temos resultados em cache para esta combinação
        const cacheEntry = placeSearchCache[cacheKey];
        const cacheAge = cacheEntry ? Date.now() - cacheEntry.timestamp : Infinity;
        const CACHE_TTL = 1000 * 60 * 30; // 30 minutos de tempo de vida do cache
        
        // Se há um cache válido (não expirado), use-o
        if (cacheEntry && cacheAge < CACHE_TTL) {
          console.log(`🔄 Usando resultados em cache para "${term}" com raio ${currentRadius}m (${Math.round(cacheAge / 1000 / 60)} min atrás)`);
          return cacheEntry.results;
        }
        
        // Caso contrário, faça uma nova solicitação à API
        const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
        url.searchParams.append("location", `${latitude},${longitude}`);
        url.searchParams.append("radius", currentRadius.toString());
        url.searchParams.append("keyword", term);
        url.searchParams.append("language", "pt-BR");
        url.searchParams.append("key", googleApiKey);
        
        // Log da requisição
        logGooglePlacesRequest(url.toString(), {
          location: `${latitude},${longitude}`,
          radius: currentRadius.toString(),
          keyword: term,
          language: "pt-BR"
        });
        
        // Adicionar timeout para evitar requisições que ficam pendentes
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos de timeout
        
        try {
          const response = await fetch(url.toString(), { 
            signal: controller.signal 
          });
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`Google Places API error: ${response.statusText}`);
          }
          
          const data = await response.json() as GooglePlacesResponse;
          
          // Log da resposta
          logGooglePlacesResponse(data);
          
          if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
            const error = `Google Places API error: ${data.status}`;
            logGooglePlacesResponse(data, error);
            throw new Error(error);
          }
          
          // Formata os resultados para o formato que usamos na aplicação
          const formattedResults = data.results.map((place) => ({
            queryId: 0, // Will be updated when saved to storage
            name: place.name,
            category: "local" as const,
            address: place.vicinity,
            location: {
              lat: place.geometry.location.lat,
              lng: place.geometry.location.lng,
            },
            rating: place.rating ? place.rating.toString() : undefined,
            reviews: place.user_ratings_total ? place.user_ratings_total.toString() : undefined,
            hasProduct: true,
            // Calculate distance from user (approximate)
            distance: calculateDistance(
              latitude,
              longitude,
              place.geometry.location.lat,
              place.geometry.location.lng
            ),
            metadata: {
              placeId: place.place_id,
              openNow: place.opening_hours?.open_now,
              types: place.types,
              searchRadius: currentRadius // Adiciona o raio de busca usado para encontrar este resultado
            } as any,
          }));
          
          // Armazenar os resultados no cache para uso futuro
          placeSearchCache[cacheKey] = {
            results: formattedResults,
            timestamp: Date.now()
          };
          
          return formattedResults;
        } catch (error) {
          clearTimeout(timeoutId);
          console.error(`Error fetching places for term "${term}" with radius ${currentRadius}m:`, error);
          return []; // Retornar array vazio para não quebrar o Promise.all
        }
      });
      
      const placesArrays = await Promise.all(searchPromises);
      const currentRadiusPlaces = placesArrays.flat();
      
      // Adiciona resultados desta iteração ao total
      allPlacesFound = [...allPlacesFound, ...currentRadiusPlaces];
      
      // Remove duplicados de todas as buscas (combina resultados entre raios diferentes)
      const uniquePlaces = allPlacesFound.filter(
        (place, index, self) =>
          index === self.findIndex((p) => 
            p.metadata && place.metadata && 
            (p.metadata as any).placeId === (place.metadata as any).placeId
          )
      );
      
      console.log(`📍 Encontrados ${currentRadiusPlaces.length} resultados com raio de ${currentRadius}m, total acumulado: ${uniquePlaces.length}`);
      
      // Verifica se encontramos resultados suficientes
      if (uniquePlaces.length >= 5) {
        foundEnoughResults = true;
        console.log(`✅ Encontrados resultados suficientes (${uniquePlaces.length}) com raio de até ${currentRadius}m`);
      } else {
        // Tenta com o próximo raio
        radiusIndex++;
        console.log(`⚠️ Insuficiente (${uniquePlaces.length}), expandindo raio de busca...`);
      }
    }
    
    // Remove duplicates based on place_id de todos os resultados acumulados
    const uniqueResults = allPlacesFound.filter(
      (place, index, self) =>
        index === self.findIndex((p) => 
          p.metadata && place.metadata && 
          (p.metadata as any).placeId === (place.metadata as any).placeId
        )
    );
    
    // Sort results by distance (closest first)
    const sortedResults = uniqueResults.sort((a, b) => {
      // Extract numeric distance values for comparison
      const distanceA = parseDistanceString(a.distance || '');
      const distanceB = parseDistanceString(b.distance || '');
      return distanceA - distanceB;
    });
    
    // Pega os 5 melhores resultados (ou todos, se houver menos de 5)
    const finalResults = sortedResults.slice(0, 5);
    
    if (finalResults.length > 0 && finalResults[0].metadata) {
      // Adicionar informações de debug no primeiro resultado
      (finalResults[0].metadata as any)._debugAll = {
        apiStatus: 'OK',
        coordsUsed: { latitude, longitude },
        searchTerms: searchTerms,
        totalResultsFound: allPlacesFound.length,
        uniqueResultsFound: uniqueResults.length,
        searchRadiusFinal: searchRadiusSteps[Math.min(radiusIndex, searchRadiusSteps.length - 1)]
      };
    }
    
    return finalResults;
  } catch (error) {
    console.error("Error searching local places:", error);
    return [];
  }
}

/**
 * Generate results for national online retailers
 */
function generateNationalResults(
  query: string,
  userResponse?: string
): InsertSearchResult[] {
  // Embaralha a lista de sites nacionais para ter diferentes resultados a cada busca
  const shuffled = [...NATIONAL_SITES].sort(() => 0.5 - Math.random());
  // Seleciona de 1 a 3 sites aleatoriamente
  const sitesToUse = shuffled.slice(0, Math.floor(Math.random() * 3) + 1);
  
  console.log(`Mostrando ${sitesToUse.length} sites nacionais para "${query}"`);
  
  return sitesToUse.map((site) => ({
    queryId: 0, // Will be updated when saved to storage
    name: site.name,
    category: "national" as const,
    website: site.website,
    hasProduct: true,
    price: generateRandomPrice(20, 70),
    metadata: {
      description: `${query}${userResponse ? ` ${userResponse}` : ""}`,
      delivery: `Entrega em ${Math.floor(Math.random() * 5) + 1} dias úteis`,
      searchTerms: `${query} ${userResponse || ""}`.trim(), // Adicionado para debug
    } as any,
  }));
}

/**
 * Generate results for global online retailers
 */
function generateGlobalResults(
  query: string,
  userResponse?: string
): InsertSearchResult[] {
  // Embaralha a lista de sites globais para ter diferentes resultados
  const shuffled = [...GLOBAL_SITES].sort(() => 0.5 - Math.random());
  // Seleciona aleatoriamente 0 a 2 sites globais
  const siteCount = Math.min(Math.floor(Math.random() * 3), shuffled.length);
  const sitesToUse = shuffled.slice(0, siteCount);
  
  console.log(`Mostrando ${sitesToUse.length} sites globais para "${query}"`);
  
  return sitesToUse.map((site) => ({
    queryId: 0, // Will be updated when saved to storage
    name: site.name,
    category: "global" as const,
    website: site.website,
    hasProduct: true,
    price: generateRandomPrice(40, 110),
    metadata: {
      description: `${query}${userResponse ? ` ${userResponse}` : ""}`,
      shipping: `Entrega internacional em ${Math.floor(Math.random() * 10) + 7} dias`,
      searchTerms: `${query} ${userResponse || ""}`.trim(), // Adicionado para debug
    } as any,
  }));
}

/**
 * Generate a random price in the specified range
 */
function generateRandomPrice(min: number, max: number): string {
  const price = Math.floor(Math.random() * (max - min + 1)) + min;
  return `R$ ${price},${Math.floor(Math.random() * 99)}`;
}

/**
 * Convert degrees to radians
 */
function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Parse distance string like "2.5 km" or "750 m" to numeric value in meters for comparison
 */
function parseDistanceString(distanceStr: string): number {
  if (!distanceStr) return Infinity; // If no distance, put at the end
  
  const match = distanceStr.match(/^([\d\.]+)\s*(m|km)$/);
  if (!match) return Infinity;
  
  const value = parseFloat(match[1]);
  const unit = match[2];
  
  return unit === 'km' ? value * 1000 : value; // Convert to meters
}

/**
 * Calculate the distance between two coordinates in kilometers
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): string {
  // Haversine formula
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  
  // Format the distance
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  } else {
    return `${distance.toFixed(1)} km`;
  }
}
