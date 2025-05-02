// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
var MemStorage = class {
  users;
  queries;
  results;
  userCurrentId;
  queryCurrentId;
  resultCurrentId;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.queries = /* @__PURE__ */ new Map();
    this.results = /* @__PURE__ */ new Map();
    this.userCurrentId = 1;
    this.queryCurrentId = 1;
    this.resultCurrentId = 1;
  }
  // User methods
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(insertUser) {
    const id = this.userCurrentId++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  // Search Query methods
  async getSearchQuery(id) {
    return this.queries.get(id);
  }
  async createSearchQuery(insertQuery) {
    const id = this.queryCurrentId++;
    const query = {
      ...insertQuery,
      id,
      userResponse: insertQuery.userResponse ?? null,
      refinedQuery: insertQuery.refinedQuery ?? null,
      clarificationQuestion: insertQuery.clarificationQuestion ?? null
    };
    this.queries.set(id, query);
    return query;
  }
  // Search Result methods
  async getSearchResults(queryId) {
    return Array.from(this.results.values()).filter(
      (result) => result.queryId === queryId
    );
  }
  async createSearchResult(insertResult) {
    const id = this.resultCurrentId++;
    const result = {
      id,
      queryId: insertResult.queryId,
      name: insertResult.name,
      category: insertResult.category,
      address: insertResult.address ?? null,
      location: insertResult.location ?? null,
      website: insertResult.website ?? null,
      rating: insertResult.rating ?? null,
      reviews: insertResult.reviews ?? null,
      distance: insertResult.distance ?? null,
      price: insertResult.price ?? null,
      // Convert undefined or falsy value to true (default) or null
      hasProduct: insertResult.hasProduct ?? true,
      metadata: insertResult.metadata ?? null
    };
    this.results.set(id, result);
    return result;
  }
};
var storage = new MemStorage();

// server/services/openai.ts
import OpenAI from "openai";
var openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
var MODEL = "gpt-4o";
async function analyzeQuery(query) {
  try {
    const commonSearchesMap = {
      "coca-cola": { needsClarification: false, isPerishable: true, refinedQuery: "coca-cola refrigerante" },
      "refrigerante": { needsClarification: false, isPerishable: true, refinedQuery: "refrigerante bebida" },
      "\xE1gua": { needsClarification: false, isPerishable: true, refinedQuery: "\xE1gua mineral garrafa" },
      "caf\xE9": { needsClarification: false, isPerishable: true, refinedQuery: "caf\xE9 em p\xF3 ou caf\xE9 pronto" },
      "cerveja": { needsClarification: false, isPerishable: true, refinedQuery: "cerveja bebida alco\xF3lica" },
      "vinho": { needsClarification: false, isPerishable: true, refinedQuery: "vinho bebida alco\xF3lica" },
      "chocolate": { needsClarification: false, isPerishable: true, refinedQuery: "chocolate doce" },
      "p\xE3o": { needsClarification: false, isPerishable: true, refinedQuery: "p\xE3o fresco padaria" },
      "pizza": { needsClarification: false, isPerishable: true, refinedQuery: "pizza pronta ou congelada" },
      "hamburguer": { needsClarification: false, isPerishable: true, refinedQuery: "hamburguer lanche" },
      "lanche": { needsClarification: false, isPerishable: true, refinedQuery: "lanche r\xE1pido" },
      "salgado": { needsClarification: false, isPerishable: true, refinedQuery: "salgados para lanche" },
      "mercado": { needsClarification: false, isPerishable: false, refinedQuery: "mercado ou supermercado" },
      "supermercado": { needsClarification: false, isPerishable: false, refinedQuery: "supermercado" },
      "farm\xE1cia": { needsClarification: false, isPerishable: false, refinedQuery: "farm\xE1cia rem\xE9dios" },
      "rem\xE9dio": { needsClarification: false, isPerishable: false, refinedQuery: "rem\xE9dio farm\xE1cia" },
      "celular": { needsClarification: false, isPerishable: false, refinedQuery: "celular smartphone loja" },
      "roupa": { needsClarification: true, isPerishable: false, refinedQuery: void 0 }
    };
    const lowerQuery = query.toLowerCase();
    const matchedTerm = Object.keys(commonSearchesMap).find(
      (term) => lowerQuery.includes(term.toLowerCase())
    );
    if (matchedTerm) {
      const cachedResult = commonSearchesMap[matchedTerm];
      console.log(`[DEBUG] Usando resposta em cache para "${matchedTerm}" em "${query}"`);
      if (cachedResult.needsClarification) {
        const clarificationQuestions = {
          "roupa": "Que tipo de roupa voc\xEA est\xE1 procurando? (Ex: infantil, adulto, esportiva, casual)",
          "copo": "Que tipo de copo voc\xEA procura? (Ex: descart\xE1vel, vidro, pl\xE1stico)"
        };
        return {
          needsClarification: true,
          isPerishable: false,
          // Por padrão, itens ambíguos não são considerados perecíveis até que sejam esclarecidos
          clarificationQuestion: clarificationQuestions[matchedTerm] || `Poderia esclarecer melhor o que voc\xEA procura com "${query}"?`,
          _debug: {
            reason: "Cache hit for ambiguous term",
            term: matchedTerm,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }
        };
      }
      return {
        needsClarification: false,
        refinedQuery: cachedResult.refinedQuery || query,
        isPerishable: cachedResult.isPerishable,
        _debug: {
          reason: "Cache hit for common term",
          term: matchedTerm,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      };
    }
    if (query.trim().length < 3) {
      return {
        needsClarification: true,
        isPerishable: false,
        clarificationQuestion: "Por favor, forne\xE7a mais detalhes sobre o que voc\xEA est\xE1 procurando.",
        _debug: {
          reason: "Query too short",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      };
    }
    console.log(`[DEBUG] Consulta "${query}" n\xE3o encontrada no cache, chamando OpenAI...`);
    const prompt = `
      I'm building a local search application where users search for products or services, 
      and the application needs to find appropriate establishments that might have the item.
      
      Please analyze the following search query: "${query}"
      
      Be VERY SELECTIVE about asking for clarification. Only request clarification if:
      1. The query is critically ambiguous (has multiple VERY different possible interpretations)
      2. Clarification would drastically change the types of establishments to search
      
      For example:
      - "Copo" is ambiguous - could be disposable cups, glass cups, specific sizes, etc.
      - "Roupa" is ambiguous - could be different styles, specific age groups, etc.
      
      Do NOT ask for clarification in cases like:
      - "Coca-cola" - It's clear enough, the specific size/type won't significantly change where to look
      - "Laptop" - While there are many types, most stores that sell laptops sell various kinds
      
      Also determine if the product is perishable (like food, fresh produce, etc.) 
      or requires local purchase due to its nature. Examples of perishable/local products:
      - Food items (fruits, vegetables, prepared meals, bakery items)
      - Items needed urgently (medicine, emergency supplies)
      - Very fragile items that are risky to ship
      - Fresh flowers
      - Services that must be performed locally
      
      Please return a JSON response in the following format:
      {
        "needsClarification": boolean,
        "clarificationQuestion": string (only if needsClarification is true),
        "refinedQuery": string (only if needsClarification is false),
        "isPerishable": boolean (true if the product is perishable or needs local purchase)
      }
      
      If clarification is needed, provide a specific question in Portuguese.
      If no clarification is needed, provide a refined and detailed search term that includes
      what the user is likely looking for.
      Set isPerishable to true only if the item clearly fits the description of a perishable 
      or locally-required product as described above.
      
      REMEMBER: Set needsClarification to false in most cases. Only request clarification when absolutely necessary.
    `;
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }
    const result = JSON.parse(content);
    result._debug = {
      content,
      prompt: prompt.trim(),
      model: MODEL,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    return result;
  } catch (error) {
    console.error("OpenAI API error:", error);
    return {
      needsClarification: false,
      refinedQuery: query,
      isPerishable: false,
      // Por padrão, assumimos que não é perecível em caso de erro
      _debug: {
        error: String(error),
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
  }
}
async function analyzeQueryWithResponse(query, userResponse) {
  try {
    if (query.toLowerCase().includes("coca-cola") || query.toLowerCase().includes("refrigerante")) {
      return {
        categories: [
          "Supermercado",
          "Mercado",
          "Loja de conveni\xEAncia",
          "Padaria",
          "Mercearia",
          "Bar",
          "Restaurante",
          "Lanchonete",
          "Delivery de bebidas"
        ],
        _debug: {
          reason: "Optimized categories for common beverage",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      };
    }
    const prompt = `
      Based on the user's search query "${query}"${userResponse ? ` and their clarification "${userResponse}"` : ""},
      generate a list of relevant and SPECIFIC business categories or establishment types that might carry this item.
      
      For example, if they searched for "Garrafa de \xE1gua" and clarified "academia",
      the categories might include: "Loja de suplementos", "Loja de artigos esportivos", "Academia", etc.
      
      VERY IMPORTANT: 
      1. Focus on the most LIKELY places first - prioritize common establishments where most people would look for this item.
      2. Make sure each category is DIRECTLY related to the specific query.
      3. Include both GENERAL categories (like "Supermercado") and SPECIFIC business types.
      4. Include some BRAND NAMES if relevant to the query (e.g., "Decathlon" for sports items).
      5. Include 1-2 UNEXPECTED but relevant places where the item might be found.
      
      Please return a JSON object with "categories" property containing an array of 8-10 business categories or keywords to search for.
      The categories should be provided in Portuguese and should be ordered from most relevant/common to least common.
    `;
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }
    const parsedResult = JSON.parse(content);
    const categories = Array.isArray(parsedResult.categories) ? parsedResult.categories : [];
    return {
      categories,
      _debug: {
        content,
        prompt: prompt.trim(),
        model: MODEL,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
  } catch (error) {
    console.error("OpenAI API error when analyzing with response:", error);
    return {
      categories: ["Loja", "Mercado", "Shopping", "Com\xE9rcio local"],
      _debug: {
        error: String(error),
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
  }
}

// server/services/places.ts
var NATIONAL_SITES = [
  { name: "Mercado Livre", website: "https://www.mercadolivre.com.br" },
  { name: "Americanas", website: "https://www.americanas.com.br" },
  { name: "Magazine Luiza", website: "https://www.magazineluiza.com.br" },
  { name: "Shopee", website: "https://shopee.com.br" }
];
var GLOBAL_SITES = [
  { name: "Amazon", website: "https://www.amazon.com" },
  { name: "AliExpress", website: "https://www.aliexpress.com" },
  { name: "eBay", website: "https://www.ebay.com" }
];
var placeSearchCache = {};
async function searchPlaces(query, userResponse, latitude, longitude, isPerishable) {
  const results = [];
  const debugData = {
    query,
    userResponse,
    location: { latitude, longitude },
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    steps: []
  };
  console.log(`\u{1F50D} INICIANDO BUSCA: "${query}" ${userResponse ? `/ resposta: "${userResponse}"` : ""}`);
  console.log(`\u{1F4CD} Coordenadas: ${latitude}, ${longitude}`);
  console.log(`\u{1F34E} Produto perec\xEDvel: ${isPerishable ? "Sim" : "N\xE3o"}`);
  debugData.isPerishable = isPerishable;
  try {
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
        results: localResults.map((r) => ({ name: r.name, address: r.address }))
      });
      results.push(...localResults);
    } else {
      debugData.steps.push({ step: "Skipping local search - no coordinates" });
    }
    if (!isPerishable || !latitude || !longitude) {
      debugData.steps.push({ step: "Generating national results" });
      const nationalResults = generateNationalResults(query, userResponse);
      debugData.steps.push({
        step: "National results",
        count: nationalResults.length,
        results: nationalResults.map((r) => ({ name: r.name, website: r.website }))
      });
      results.push(...nationalResults);
      debugData.steps.push({ step: "Generating global results" });
      const globalResults = generateGlobalResults(query, userResponse);
      debugData.steps.push({
        step: "Global results",
        count: globalResults.length,
        results: globalResults.map((r) => ({ name: r.name, website: r.website }))
      });
      results.push(...globalResults);
    } else {
      debugData.steps.push({
        step: "Skipping national and global results",
        reason: "Product is perishable or requires local purchase"
      });
      console.log("Produto perec\xEDvel: ignorando resultados nacionais e globais");
    }
    results.forEach((result) => {
      if (!result.metadata) {
        result.metadata = {};
      }
      result.metadata._debugOrigin = result.category;
    });
    if (results.length > 0 && results[0].metadata) {
      results[0].metadata._debugAll = debugData;
    }
    return results;
  } catch (error) {
    console.error("Error searching places:", error);
    debugData.steps.push({ step: "Error", error: String(error) });
    if (results.length === 0) {
      results.push({
        queryId: 0,
        name: "Debug Info",
        category: "local",
        hasProduct: false,
        metadata: {
          _debug: debugData,
          description: "Error occurred during search"
        }
      });
    }
    return results;
  }
}
function logGooglePlacesRequest(url, params) {
  console.log("\u{1F50D} Google Places API Request:", {
    baseUrl: url,
    params
  });
}
function logGooglePlacesResponse(data, error) {
  if (error) {
    console.error("\u274C Google Places API Error:", error);
    return;
  }
  console.log("\u2705 Google Places API Response:", {
    status: data.status,
    resultsCount: data.results?.length || 0
  });
}
async function searchLocalPlaces(searchTerms, latitude, longitude) {
  const results = [];
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!googleApiKey) {
    console.error("Google Places API key not found");
    return results;
  }
  try {
    console.log("Searching for local places with terms:", searchTerms);
    const limitedSearchTerms = searchTerms.slice(0, 3);
    const searchPromises = limitedSearchTerms.map(async (term) => {
      const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)},${term}`;
      const cacheEntry = placeSearchCache[cacheKey];
      const cacheAge = cacheEntry ? Date.now() - cacheEntry.timestamp : Infinity;
      const CACHE_TTL = 1e3 * 60 * 30;
      if (cacheEntry && cacheAge < CACHE_TTL) {
        console.log(`\u{1F504} Usando resultados em cache para "${term}" (${Math.round(cacheAge / 1e3 / 60)} min atr\xE1s)`);
        return cacheEntry.results;
      }
      const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
      url.searchParams.append("location", `${latitude},${longitude}`);
      url.searchParams.append("radius", "5000");
      url.searchParams.append("keyword", term);
      url.searchParams.append("language", "pt-BR");
      url.searchParams.append("key", googleApiKey);
      logGooglePlacesRequest(url.toString(), {
        location: `${latitude},${longitude}`,
        radius: "5000",
        keyword: term,
        language: "pt-BR"
      });
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5e3);
      try {
        const response = await fetch(url.toString(), {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          throw new Error(`Google Places API error: ${response.statusText}`);
        }
        const data = await response.json();
        logGooglePlacesResponse(data);
        if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
          const error = `Google Places API error: ${data.status}`;
          logGooglePlacesResponse(data, error);
          throw new Error(error);
        }
        const formattedResults = data.results.map((place) => ({
          queryId: 0,
          // Will be updated when saved to storage
          name: place.name,
          category: "local",
          address: place.vicinity,
          location: {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng
          },
          rating: place.rating ? place.rating.toString() : void 0,
          reviews: place.user_ratings_total ? place.user_ratings_total.toString() : void 0,
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
            types: place.types
          }
        }));
        placeSearchCache[cacheKey] = {
          results: formattedResults,
          timestamp: Date.now()
        };
        return formattedResults;
      } catch (error) {
        clearTimeout(timeoutId);
        console.error(`Error fetching places for term "${term}":`, error);
        return [];
      }
    });
    const placesArrays = await Promise.all(searchPromises);
    const allPlaces = placesArrays.flat();
    const uniqueResults = allPlaces.filter(
      (place, index, self) => index === self.findIndex(
        (p) => p.metadata.placeId === place.metadata.placeId
      )
    );
    const sortedResults = uniqueResults.sort((a, b) => {
      const distanceA = parseDistanceString(a.distance || "");
      const distanceB = parseDistanceString(b.distance || "");
      return distanceA - distanceB;
    });
    const finalResults = sortedResults.slice(0, 5);
    if (finalResults.length > 0) {
      finalResults[0].metadata = {
        ...finalResults[0].metadata,
        _debugAll: {
          apiStatus: "OK",
          coordsUsed: { latitude, longitude },
          searchTerms,
          totalResultsFound: allPlaces.length,
          uniqueResultsFound: uniqueResults.length
        }
      };
    }
    return finalResults;
  } catch (error) {
    console.error("Error searching local places:", error);
    return [];
  }
}
function generateNationalResults(query, userResponse) {
  const shuffled = [...NATIONAL_SITES].sort(() => 0.5 - Math.random());
  const sitesToUse = shuffled.slice(0, Math.floor(Math.random() * 3) + 1);
  console.log(`Mostrando ${sitesToUse.length} sites nacionais para "${query}"`);
  return sitesToUse.map((site) => ({
    queryId: 0,
    // Will be updated when saved to storage
    name: site.name,
    category: "national",
    website: site.website,
    hasProduct: true,
    price: generateRandomPrice(20, 70),
    metadata: {
      description: `${query}${userResponse ? ` ${userResponse}` : ""}`,
      delivery: `Entrega em ${Math.floor(Math.random() * 5) + 1} dias \xFAteis`,
      searchTerms: `${query} ${userResponse || ""}`.trim()
      // Adicionado para debug
    }
  }));
}
function generateGlobalResults(query, userResponse) {
  const shuffled = [...GLOBAL_SITES].sort(() => 0.5 - Math.random());
  const siteCount = Math.min(Math.floor(Math.random() * 3), shuffled.length);
  const sitesToUse = shuffled.slice(0, siteCount);
  console.log(`Mostrando ${sitesToUse.length} sites globais para "${query}"`);
  return sitesToUse.map((site) => ({
    queryId: 0,
    // Will be updated when saved to storage
    name: site.name,
    category: "global",
    website: site.website,
    hasProduct: true,
    price: generateRandomPrice(40, 110),
    metadata: {
      description: `${query}${userResponse ? ` ${userResponse}` : ""}`,
      shipping: `Entrega internacional em ${Math.floor(Math.random() * 10) + 7} dias`,
      searchTerms: `${query} ${userResponse || ""}`.trim()
      // Adicionado para debug
    }
  }));
}
function generateRandomPrice(min, max) {
  const price = Math.floor(Math.random() * (max - min + 1)) + min;
  return `R$ ${price},${Math.floor(Math.random() * 99)}`;
}
function deg2rad(deg) {
  return deg * (Math.PI / 180);
}
function parseDistanceString(distanceStr) {
  if (!distanceStr) return Infinity;
  const match = distanceStr.match(/^([\d\.]+)\s*(m|km)$/);
  if (!match) return Infinity;
  const value = parseFloat(match[1]);
  const unit = match[2];
  return unit === "km" ? value * 1e3 : value;
}
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  if (distance < 1) {
    return `${Math.round(distance * 1e3)} m`;
  } else {
    return `${distance.toFixed(1)} km`;
  }
}

// shared/schema.ts
import { pgTable, text, serial, integer, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var searchQueries = pgTable("search_queries", {
  id: serial("id").primaryKey(),
  query: text("query").notNull(),
  refinedQuery: text("refined_query"),
  clarificationQuestion: text("clarification_question"),
  userResponse: text("user_response"),
  timestamp: text("timestamp").notNull()
});
var insertSearchQuerySchema = createInsertSchema(searchQueries).pick({
  query: true,
  refinedQuery: true,
  clarificationQuestion: true,
  userResponse: true,
  timestamp: true
});
var searchResults = pgTable("search_results", {
  id: serial("id").primaryKey(),
  queryId: integer("query_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  // 'local', 'national', 'global'
  address: text("address"),
  location: json("location").$type(),
  website: text("website"),
  rating: text("rating"),
  reviews: text("reviews"),
  distance: text("distance"),
  price: text("price"),
  hasProduct: boolean("has_product").default(true),
  metadata: json("metadata").$type()
});
var insertSearchResultSchema = createInsertSchema(searchResults).pick({
  queryId: true,
  name: true,
  category: true,
  address: true,
  location: true,
  website: true,
  rating: true,
  reviews: true,
  distance: true,
  price: true,
  hasProduct: true,
  metadata: true
});
var searchRequestSchema = z.object({
  query: z.string().min(1),
  userResponse: z.string().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional()
});
var searchResponseSchema = z.object({
  needsClarification: z.boolean(),
  clarificationQuestion: z.string().optional(),
  results: z.array(
    z.object({
      id: z.number().optional(),
      name: z.string(),
      category: z.enum(["local", "national", "global"]),
      address: z.string().optional(),
      location: z.object({
        lat: z.number(),
        lng: z.number()
      }).optional(),
      website: z.string().optional(),
      rating: z.string().optional(),
      reviews: z.string().optional(),
      distance: z.string().optional(),
      price: z.string().optional(),
      hasProduct: z.boolean().default(true),
      metadata: z.any().optional()
    })
  ).optional(),
  _debug: z.any().optional()
  // Campo para debugging
});

// server/routes.ts
import { ZodError } from "zod";
async function registerRoutes(app2) {
  app2.post("/api/search", async (req, res) => {
    try {
      console.log("\u{1F4E8} Recebendo requisi\xE7\xE3o de busca:", JSON.stringify(req.body));
      const requestData = searchRequestSchema.parse(req.body);
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      if (requestData.userResponse) {
        const storedQuery2 = await storage.createSearchQuery({
          query: requestData.query,
          refinedQuery: `${requestData.query} (${requestData.userResponse})`,
          clarificationQuestion: "",
          userResponse: requestData.userResponse,
          timestamp
        });
        const isPerishable = true;
        const results2 = await searchPlaces(
          requestData.query,
          requestData.userResponse,
          requestData.latitude || null,
          requestData.longitude || null,
          isPerishable
        );
        for (const result of results2) {
          await storage.createSearchResult({
            ...result,
            queryId: storedQuery2.id
          });
        }
        console.log(`\u2705 Resultados encontrados com clarifica\xE7\xE3o: ${results2.length} (locais: ${results2.filter((r) => r.category === "local").length}, nacionais: ${results2.filter((r) => r.category === "national").length}, globais: ${results2.filter((r) => r.category === "global").length})`);
        return res.json({
          needsClarification: false,
          results: results2,
          _debug: {
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            query: requestData.query,
            userResponse: requestData.userResponse,
            hasCoordinates: Boolean(requestData.latitude && requestData.longitude),
            coordinates: {
              latitude: requestData.latitude,
              longitude: requestData.longitude
            },
            geoSource: requestData.latitude === -23.5505 && requestData.longitude === -46.6333 ? "fallback" : "browser",
            resultCount: results2.length,
            resultBreakdown: {
              local: results2.filter((r) => r.category === "local").length,
              national: results2.filter((r) => r.category === "national").length,
              global: results2.filter((r) => r.category === "global").length
            }
          }
        });
      }
      const analysis = await analyzeQuery(requestData.query);
      if (analysis.needsClarification) {
        await storage.createSearchQuery({
          query: requestData.query,
          refinedQuery: "",
          clarificationQuestion: analysis.clarificationQuestion,
          userResponse: "",
          timestamp
        });
        return res.json({
          needsClarification: true,
          clarificationQuestion: analysis.clarificationQuestion
        });
      }
      const storedQuery = await storage.createSearchQuery({
        query: requestData.query,
        refinedQuery: analysis.refinedQuery || requestData.query,
        clarificationQuestion: "",
        userResponse: "",
        timestamp
      });
      const results = await searchPlaces(
        requestData.query,
        "",
        requestData.latitude || null,
        requestData.longitude || null,
        analysis.isPerishable
        // Usamos o valor determinado pelo OpenAI
      );
      for (const result of results) {
        await storage.createSearchResult({
          ...result,
          queryId: storedQuery.id
        });
      }
      console.log(`\u2705 Resultados encontrados: ${results.length} (locais: ${results.filter((r) => r.category === "local").length}, nacionais: ${results.filter((r) => r.category === "national").length}, globais: ${results.filter((r) => r.category === "global").length})`);
      return res.json({
        needsClarification: false,
        results,
        _debug: {
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          query: requestData.query,
          userResponse: requestData.userResponse,
          hasCoordinates: Boolean(requestData.latitude && requestData.longitude),
          coordinates: {
            latitude: requestData.latitude,
            longitude: requestData.longitude
          },
          geoSource: requestData.latitude === -23.5505 && requestData.longitude === -46.6333 ? "fallback" : "browser",
          resultCount: results.length,
          resultBreakdown: {
            local: results.filter((r) => r.category === "local").length,
            national: results.filter((r) => r.category === "national").length,
            global: results.filter((r) => r.category === "global").length
          }
        }
      });
    } catch (error) {
      console.error("Search API error:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import {
  createServer as createViteServer,
  createLogger
} from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var isProduction = process.env.NODE_ENV === "production";
var isReplit = process.env.REPL_ID !== void 0;
var vite_config_default = defineConfig(async () => ({
  base: "/Saviana/",
  // Necessário para GitHub Pages funcionar
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...!isProduction && isReplit ? [
      (await import("@replit/vite-plugin-cartographer")).cartographer()
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  }
}));

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
    // agora é reconhecido como o literal `true`
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    // usa a variável já tipada
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
