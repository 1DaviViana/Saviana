// Define the necessary types inline to avoid import issues
type SearchRequest = {
  query: string;
  userResponse?: string;
  latitude?: number;
  longitude?: number;
  isPerishable?: boolean;
};

type SearchResponse = {
  needsClarification: boolean;
  clarificationQuestion?: string;
  results?: Array<{
    id?: number;
    name: string;
    category: 'local' | 'national' | 'global';
    address?: string;
    location?: { lat: number; lng: number };
    website?: string;
    rating?: string;
    reviews?: string;
    distance?: string;
    price?: string;
    hasProduct: boolean;
    metadata?: any;
  }>;
  _debug?: any;
};

export async function searchPlaces(request: SearchRequest): Promise<SearchResponse> {
  try {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
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
