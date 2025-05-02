import { SearchRequest, SearchResponse } from "../../../shared/schema";

// Check if we're running on GitHub Pages
const isGitHubPages = () => {
  return window.location.hostname.includes('github.io');
};

// Generate static demo data for GitHub Pages deployment
const generateStaticDemoResponse = (request: SearchRequest): SearchResponse => {
  const { query, latitude, longitude } = request;
  
  console.log("[GITHUB PAGES] Using static demo data for:", query);
  
  return {
    needsClarification: false,
    results: [
      {
        name: "Demo Place 1",
        category: "local",
        hasProduct: true,
        address: "123 Demo Street, São Paulo",
        distance: "1.2 km",
        location: {
          lat: latitude || -23.5505,
          lng: longitude || -46.6333
        },
        rating: "4.5",
        price: "$$$",
        website: "https://example.com/demo1",
        reviews: "120 reviews",
        metadata: {
          id: "demo-1",
          rating: 4.5,
          totalRatings: 120,
          openNow: true
        }
      },
      {
        name: "Demo Place 2",
        category: "local",
        hasProduct: true,
        address: "456 Example Avenue, São Paulo",
        distance: "2.3 km",
        location: {
          lat: (latitude || -23.5505) + 0.01,
          lng: (longitude || -46.6333) + 0.01
        },
        rating: "4.2",
        price: "$$",
        website: "https://example.com/demo2",
        reviews: "85 reviews",
        metadata: {
          id: "demo-2",
          rating: 4.2,
          totalRatings: 85,
          openNow: false
        }
      }
    ],
    _debug: {
      mode: "github-pages-static-demo",
      originalQuery: query,
      timestamp: new Date().toISOString()
    }
  };
};

export async function searchPlaces(request: SearchRequest): Promise<SearchResponse> {
  // If running on GitHub Pages, return static demo data
  if (isGitHubPages()) {
    return generateStaticDemoResponse(request);
  }
  
  // Otherwise continue with normal API request
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
