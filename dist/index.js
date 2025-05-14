// server/index.ts
import express2 from "express";
import cors from "cors";

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
      "p\xE3o": { needsClarification: false, isPerishable: true, refinedQuery: "p\xE3o fresco padaria panificadora" },
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
async function validatePlacesResults(query, userResponse, places) {
  try {
    if (!places || places.length === 0) {
      return {
        validatedResults: [],
        _debug: {
          reason: "No places to validate",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      };
    }
    const placesDescription = places.map((place) => {
      return `
      - ID: ${place.placeId}
      - Nome: ${place.name}
      - Categoria: ${place.category || "N\xE3o especificada"}
      - Endere\xE7o: ${place.address || "N\xE3o especificado"}
      - Tipos: ${place.types ? place.types.join(", ") : "N\xE3o especificados"}
      `;
    }).join("\n");
    const productDescription = userResponse ? `${query} (Detalhes adicionais: ${userResponse})` : query;
    const prompt = `
      Voc\xEA \xE9 um especialista em an\xE1lise de estabelecimentos comerciais. Preciso que voc\xEA analise uma lista de estabelecimentos
      e determine quais deles provavelmente vendem ou oferecem o produto/servi\xE7o espec\xEDfico.
      
      Produto/servi\xE7o buscado: "${productDescription}"
      
      Lista de estabelecimentos:
      ${placesDescription}
      
      Para cada estabelecimento, por favor avalie:
      1. Considerando o nome do estabelecimento, sua categoria, endere\xE7o e tipos, qual a probabilidade dele oferecer o produto/servi\xE7o buscado?
      2. Forne\xE7a uma resposta SIM ou N\xC3O indicando se o estabelecimento provavelmente tem o produto.
      3. Um n\xEDvel de confian\xE7a de 0 a 1, onde 0 \xE9 nenhuma confian\xE7a e 1 \xE9 certeza absoluta.
      4. Uma breve explica\xE7\xE3o do motivo da sua conclus\xE3o.
      
      Por favor, retorne os resultados em formato JSON com a seguinte estrutura:
      {
        "validatedResults": [
          {
            "placeId": "id_do_estabelecimento", 
            "hasProduct": true/false, 
            "confidence": n\xFAmero entre 0 e 1,
            "reason": "breve explica\xE7\xE3o"
          },
          ...
        ]
      }
      
      IMPORTANTE: 
      - Seja realista em suas avalia\xE7\xF5es. Nem todos os lugares vendem todos os produtos.
      - Considere o contexto cultural e geogr\xE1fico brasileiro.
      - Para produtos aliment\xEDcios, considere que mercados, supermercados e hipermercados geralmente t\xEAm uma ampla variedade.
      - Para servi\xE7os espec\xEDficos, seja mais criterioso na avalia\xE7\xE3o.
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
    console.error("OpenAI API error when validating places:", error);
    const fallbackResults = places.map((place) => ({
      placeId: place.placeId,
      hasProduct: true,
      confidence: 0.5,
      reason: "Erro na valida\xE7\xE3o - considerando que o estabelecimento pode ter o produto"
    }));
    return {
      validatedResults: fallbackResults,
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
    if (query.toLowerCase().includes("p\xE3o") || query.toLowerCase().includes("paes")) {
      return {
        categories: [
          "Padaria",
          "Panificadora",
          "Supermercado",
          "Mercearia",
          "Caf\xE9",
          "Loja de Conveni\xEAncia",
          "Mercado de Alimentos Naturais",
          "Quitanda",
          "Mercado de Agricultores",
          "Confeitaria"
        ],
        _debug: {
          reason: "Optimized categories for bread/bakery items",
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
function clearPlaceSearchCache() {
  console.log("\u{1F9F9} Limpando cache de busca de lugares...");
  Object.keys(placeSearchCache).forEach((key) => {
    delete placeSearchCache[key];
  });
  console.log("\u2705 Cache limpo com sucesso!");
}
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
        longitude,
        query,
        userResponse || ""
      );
      debugData.steps.push({
        step: "Local results",
        count: localResults.length,
        results: localResults.map((r) => ({
          name: r.name,
          address: r.address,
          hasProduct: r.hasProduct,
          validationConfidence: r.metadata ? r.metadata.validationConfidence : void 0
        }))
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
var SEARCH_RADII = [250, 500, 750, 1e3, 1500, 2e3];
var MIN_DESIRED_RESULTS = 5;
var MAX_ATTEMPTS = 6;
async function searchLocalPlaces(searchTerms, latitude, longitude, query, userResponse) {
  const allResults = [];
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!googleApiKey) {
    console.error("Google Places API key not found");
    return allResults;
  }
  try {
    console.log("Searching for local places with terms:", searchTerms);
    const limitedSearchTerms = searchTerms.slice(0, 5);
    let validatedResults = [];
    let currentRadiusIndex = 0;
    let attempts = 0;
    while (validatedResults.length < MIN_DESIRED_RESULTS && currentRadiusIndex < SEARCH_RADII.length && attempts < MAX_ATTEMPTS) {
      const currentRadius = SEARCH_RADII[currentRadiusIndex];
      attempts++;
      console.log(`\u{1F50D} Tentativa ${attempts}: Buscando em raio de ${currentRadius}m...`);
      const resultsForCurrentRadius = await searchLocalPlacesWithRadius(
        limitedSearchTerms,
        latitude,
        longitude,
        currentRadius,
        googleApiKey
      );
      if (resultsForCurrentRadius.length === 0) {
        console.log(`\u{1F504} Nenhum resultado encontrado em raio de ${currentRadius}m. Aumentando raio.`);
        currentRadiusIndex++;
        continue;
      }
      const newUniqueResults = resultsForCurrentRadius.filter(
        (newResult) => !allResults.some(
          (existingResult) => existingResult.metadata && newResult.metadata && existingResult.metadata.placeId === newResult.metadata.placeId
        )
      );
      if (newUniqueResults.length > 0) {
        console.log(`\u2705 Encontrados ${newUniqueResults.length} novos resultados em raio de ${currentRadius}m`);
        allResults.push(...newUniqueResults);
        const placesToValidate = newUniqueResults.map((place) => ({
          placeId: place.metadata ? place.metadata.placeId : "",
          name: place.name,
          category: place.category,
          types: place.metadata ? place.metadata.types : [],
          address: place.address || void 0
        }));
        console.log(`\u{1F916} Validando ${placesToValidate.length} estabelecimentos com IA...`);
        try {
          const validationResult = await validatePlacesResults(
            query,
            userResponse,
            placesToValidate
          );
          console.log(
            `\u2705 Valida\xE7\xE3o conclu\xEDda:`,
            validationResult.validatedResults.filter((r) => r.hasProduct).length,
            "positivos /",
            validationResult.validatedResults.filter((r) => !r.hasProduct).length,
            "negativos"
          );
          for (const placeValidation of validationResult.validatedResults) {
            const matchingPlace = allResults.find(
              (p) => p.metadata && p.metadata.placeId === placeValidation.placeId
            );
            if (matchingPlace) {
              matchingPlace.hasProduct = placeValidation.hasProduct;
              if (!matchingPlace.metadata) matchingPlace.metadata = {};
              matchingPlace.metadata.validationConfidence = placeValidation.confidence;
              matchingPlace.metadata.validationReason = placeValidation.reason;
            }
          }
          validatedResults = allResults.filter((result) => result.hasProduct);
          console.log(`\u{1F3AF} Ap\xF3s valida\xE7\xE3o: ${validatedResults.length} resultados v\xE1lidos.`);
          if (validatedResults.length >= MIN_DESIRED_RESULTS) {
            console.log(`\u{1F3AF} Atingido o n\xFAmero m\xEDnimo de ${MIN_DESIRED_RESULTS} resultados. Encerrando busca.`);
            break;
          }
        } catch (error) {
          console.error("Erro ao validar estabelecimentos:", error);
          validatedResults = allResults;
          if (validatedResults.length >= MIN_DESIRED_RESULTS) {
            console.log(`\u{1F3AF} Encontrados ${validatedResults.length} resultados. Encerrando busca (ap\xF3s erro de valida\xE7\xE3o).`);
            break;
          }
        }
      }
      currentRadiusIndex++;
    }
    const sortedResults = validatedResults.sort((a, b) => {
      const distanceA = parseDistanceString(a.distance || "");
      const distanceB = parseDistanceString(b.distance || "");
      return distanceA - distanceB;
    });
    const finalResults = sortedResults.slice(0, MIN_DESIRED_RESULTS);
    if (finalResults.length > 0) {
      if (!finalResults[0].metadata) {
        finalResults[0].metadata = {};
      }
      finalResults[0].metadata._debugAll = {
        apiStatus: "OK",
        coordsUsed: { latitude, longitude },
        searchTerms,
        totalFound: allResults.length,
        validatedCount: validatedResults.length,
        attemptsUsed: attempts,
        searchRadii: SEARCH_RADII.slice(0, currentRadiusIndex + 1)
      };
    }
    return finalResults;
  } catch (error) {
    console.error("Error searching local places:", error);
    return [];
  }
}
async function searchLocalPlacesWithRadius(searchTerms, latitude, longitude, radius, googleApiKey) {
  const searchPromises = searchTerms.map(async (term) => {
    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)},${radius},${term}`;
    const cacheEntry = placeSearchCache[cacheKey];
    const cacheAge = cacheEntry ? Date.now() - cacheEntry.timestamp : Infinity;
    const CACHE_TTL = 1e3 * 60 * 30;
    if (cacheEntry && cacheAge < CACHE_TTL) {
      console.log(`\u{1F504} Usando resultados em cache para "${term}" em raio de ${radius}m (${Math.round(cacheAge / 1e3 / 60)} min atr\xE1s)`);
      return cacheEntry.results;
    }
    const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
    url.searchParams.append("location", `${latitude},${longitude}`);
    url.searchParams.append("radius", radius.toString());
    url.searchParams.append("keyword", term);
    url.searchParams.append("language", "pt-BR");
    url.searchParams.append("key", googleApiKey);
    logGooglePlacesRequest(url.toString(), {
      location: `${latitude},${longitude}`,
      radius: radius.toString(),
      keyword: term,
      language: "pt-BR"
    });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5e3);
    try {
      const response = await fetch(url.toString(), { signal: controller.signal });
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
        // Será atualizado quando salvo no storage
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
        // Por padrão assumimos que tem o produto
        // Calcular distância aproximada
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
          searchRadius: radius,
          // Armazenar o raio usado para encontrar este resultado
          searchTerm: term
          // Armazenar o termo que levou a este resultado
        }
      }));
      placeSearchCache[cacheKey] = {
        results: formattedResults,
        timestamp: Date.now()
      };
      return formattedResults;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`Error fetching places for term "${term}" with radius ${radius}m:`, error);
      return [];
    }
  });
  const placesArrays = await Promise.all(searchPromises);
  const allPlaces = placesArrays.flat();
  const uniqueResults = allPlaces.filter(
    (place, index, self) => index === self.findIndex(
      (p) => p.metadata && place.metadata && p.metadata.placeId === place.metadata.placeId
    )
  );
  return uniqueResults;
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
  app2.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app2.post("/api/clear-cache", (_req, res) => {
    try {
      clearPlaceSearchCache();
      res.json({
        status: "ok",
        message: "Cache limpo com sucesso",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (error) {
      console.error("Erro ao limpar cache:", error);
      res.status(500).json({
        status: "error",
        message: "Erro ao limpar cache",
        error: String(error)
      });
    }
  });
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
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var isProduction = process.env.NODE_ENV === "production";
var isReplit = process.env.REPL_ID !== void 0;
var vite_config_default = defineConfig(async () => ({
  // Deixe a base como '/' por padrão.
  // A flag --base=/Saviana/ no workflow cuidará do deploy no GitHub Pages.
  base: "/",
  plugins: [
    react(),
    runtimeErrorOverlay(),
    // Lógica para o plugin cartographer em ambiente de desenvolvimento Replit
    ...!isProduction && isReplit ? [
      (await import("@replit/vite-plugin-cartographer")).cartographer()
    ] : []
  ],
  resolve: {
    alias: {
      // Mantém seus aliases
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets")
    }
  },
  // Aponta para a raiz do seu código de cliente
  root: path.resolve(__dirname, "client"),
  build: {
    // Define o diretório de saída do build
    outDir: path.resolve(__dirname, "dist/public"),
    // Limpa o diretório de saída antes de cada build
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

// server/index.ts
import { fileURLToPath as fileURLToPath2 } from "url";
import path3 from "path";
if (import.meta && typeof import.meta.url === "string") {
  if (typeof import.meta.dirname !== "string" || !import.meta.dirname) {
    try {
      const __filename2 = fileURLToPath2(import.meta.url);
      const __dirname2 = path3.dirname(__filename2);
      Object.defineProperty(import.meta, "dirname", {
        value: __dirname2,
        writable: false,
        enumerable: true,
        configurable: true
      });
      console.log(`[Polyfill] Adicionado import.meta.dirname = ${__dirname2}`);
    } catch (e) {
      console.warn(`[Polyfill] Falha ao criar import.meta.dirname a partir de import.meta.url (${import.meta.url}):`, e);
    }
  } else {
    console.log(`[Polyfill] import.meta.dirname j\xE1 existe: ${import.meta.dirname}. Polyfill n\xE3o aplicado.`);
  }
} else {
  console.warn("[Polyfill] import.meta.url n\xE3o est\xE1 dispon\xEDvel ou n\xE3o \xE9 uma string. N\xE3o foi poss\xEDvel tentar o polyfill para import.meta.dirname.");
}
var allowedOrigins = [
  // Origens de desenvolvimento
  "http://localhost:3000",
  // Se seu frontend roda na 3000
  "http://localhost:5000",
  // Se seu frontend roda na 5000 ou para testes diretos
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5000",
  // Adicione a origem do seu frontend no GitHub Pages
  "https://1daviviana.github.io",
  // Origens do Replit (expressão regular para cobrir subdomínios dinâmicos)
  /\.replit\.dev$/,
  // Origens Railway (expressão regular para cobrir subdomínios dinâmicos)
  /\.railway\.app$/
];
var corsOptions = {
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.some((allowedOrigin) => {
      if (typeof allowedOrigin === "string") {
        return allowedOrigin === origin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Origem bloqueada: ${origin}`);
      callback(new Error(`A origem ${origin} n\xE3o \xE9 permitida por CORS.`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
};
var app = express2();
app.set("trust proxy", 1);
app.use(cors(corsOptions));
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const originHeader = req.headers.origin || "N/A";
    console.log(
      `[Request] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms - Origin: ${originHeader} - IP: ${clientIp}`
    );
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("\u274C Erro capturado pelo manipulador de erros:", {
      status,
      message,
      stack: err.message && err.message.includes("N\xE3o permitido por CORS") ? "CORS rejection" : err.stack,
      path: req.path,
      method: req.method,
      origin: req.headers.origin,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    res.status(status).json({
      error: {
        message,
        status
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      path: req.path
    });
  });
  const currentEnv = process.env.NODE_ENV || "development";
  log(`\u{1F527} Ambiente atual: ${currentEnv}`);
  if (currentEnv === "development") {
    log("\u{1F6E0}\uFE0F Configurando Vite para desenvolvimento...");
    await setupVite(app, server);
  } else {
    log("\u{1F4E6} Backend em produ\xE7\xE3o. N\xE3o servindo arquivos est\xE1ticos.");
  }
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5e3;
  server.listen({
    port,
    host: "0.0.0.0"
  }, () => {
    log(`\u{1F680} Servidor rodando em http://0.0.0.0:${port}`);
    if (currentEnv === "production") {
      log(`\u{1F4A1} Em produ\xE7\xE3o, certifique-se que seu app responde a health checks na porta ${port}.`);
    }
  });
})().catch((err) => {
  console.error("\u{1F6A8} Falha cr\xEDtica ao iniciar o servidor:", err);
  process.exit(1);
});
