import { SearchRequest, SearchResponse } from "@shared/schema";
import { config } from "./config";

export async function searchPlaces(request: SearchRequest): Promise<SearchResponse> {
  try {
    // Utilize a base URL do config para determinar a origem da API
    const apiUrl = `${config.apiBaseUrl}/api/search`;
    console.log(`[DEBUG] Enviando requisição para: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      // Incluir credentials para que cookies sejam enviados em requisições cross-origin
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Search API error:', error);
    throw error;
  }
}
