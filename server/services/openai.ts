import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

interface QueryAnalysisResponse {
  needsClarification: boolean;
  clarificationQuestion?: string;
  refinedQuery?: string;
  isPerishable?: boolean; // Indica se o produto é perecível
  _debug?: any;
}

/**
 * Analyzes a search query to determine if clarification is needed
 * and provides a refined query or clarification question
 */
export async function analyzeQuery(query: string): Promise<QueryAnalysisResponse> {
  try {
    // Cache comum em memória para termos frequentes
    const commonSearchesMap: Record<string, {
      needsClarification: boolean,
      isPerishable: boolean,
      refinedQuery?: string
    }> = {
      "coca-cola": { needsClarification: false, isPerishable: true, refinedQuery: "coca-cola refrigerante" },
      "refrigerante": { needsClarification: false, isPerishable: true, refinedQuery: "refrigerante bebida" },
      "água": { needsClarification: false, isPerishable: true, refinedQuery: "água mineral garrafa" },
      "café": { needsClarification: false, isPerishable: true, refinedQuery: "café em pó ou café pronto" },
      "cerveja": { needsClarification: false, isPerishable: true, refinedQuery: "cerveja bebida alcoólica" },
      "vinho": { needsClarification: false, isPerishable: true, refinedQuery: "vinho bebida alcoólica" },
      "chocolate": { needsClarification: false, isPerishable: true, refinedQuery: "chocolate doce" },
      "pão": { needsClarification: false, isPerishable: true, refinedQuery: "pão fresco padaria panificadora" },
      "pizza": { needsClarification: false, isPerishable: true, refinedQuery: "pizza pronta ou congelada" },
      "hamburguer": { needsClarification: false, isPerishable: true, refinedQuery: "hamburguer lanche" },
      "lanche": { needsClarification: false, isPerishable: true, refinedQuery: "lanche rápido" },
      "salgado": { needsClarification: false, isPerishable: true, refinedQuery: "salgados para lanche" },
      "mercado": { needsClarification: false, isPerishable: false, refinedQuery: "mercado ou supermercado" },
      "supermercado": { needsClarification: false, isPerishable: false, refinedQuery: "supermercado" },
      "farmácia": { needsClarification: false, isPerishable: false, refinedQuery: "farmácia remédios" },
      "remédio": { needsClarification: false, isPerishable: false, refinedQuery: "remédio farmácia" },
      "celular": { needsClarification: false, isPerishable: false, refinedQuery: "celular smartphone loja" },
      "roupa": { needsClarification: true, isPerishable: false, refinedQuery: undefined }
    };
    
    // Verifica se a consulta contém algum dos termos comuns conhecidos
    const lowerQuery = query.toLowerCase();
    const matchedTerm = Object.keys(commonSearchesMap).find(term => 
      lowerQuery.includes(term.toLowerCase())
    );
    
    if (matchedTerm) {
      const cachedResult = commonSearchesMap[matchedTerm];
      console.log(`[DEBUG] Usando resposta em cache para "${matchedTerm}" em "${query}"`);
      
      // Para termos que precisam de clarificação, precisamos gerar uma pergunta
      if (cachedResult.needsClarification) {
        // Perguntas predefinidas para termos comuns mas ambíguos
        const clarificationQuestions: Record<string, string> = {
          "roupa": "Que tipo de roupa você está procurando? (Ex: infantil, adulto, esportiva, casual)",
          "copo": "Que tipo de copo você procura? (Ex: descartável, vidro, plástico)"
        };
        
        return {
          needsClarification: true,
          isPerishable: false,  // Por padrão, itens ambíguos não são considerados perecíveis até que sejam esclarecidos
          clarificationQuestion: clarificationQuestions[matchedTerm] || 
            `Poderia esclarecer melhor o que você procura com "${query}"?`,
          _debug: {
            reason: "Cache hit for ambiguous term",
            term: matchedTerm,
            timestamp: new Date().toISOString()
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
          timestamp: new Date().toISOString()
        }
      };
    }
    
    // Se a consulta for curta (menos de 3 caracteres), pedir clarificação
    if (query.trim().length < 3) {
      return {
        needsClarification: true,
        isPerishable: false,
        clarificationQuestion: "Por favor, forneça mais detalhes sobre o que você está procurando.",
        _debug: {
          reason: "Query too short",
          timestamp: new Date().toISOString()
        }
      };
    }
    
    // Para termos não cacheados, usamos a API OpenAI
    console.log(`[DEBUG] Consulta "${query}" não encontrada no cache, chamando OpenAI...`);
    
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
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const result = JSON.parse(content) as QueryAnalysisResponse;
    
    // Add debug data
    result._debug = {
      content,
      prompt: prompt.trim(),
      model: MODEL,
      timestamp: new Date().toISOString()
    };
    
    return result;
  } catch (error) {
    console.error("OpenAI API error:", error);
    // Fallback to not requiring clarification
    return {
      needsClarification: false,
      refinedQuery: query,
      isPerishable: false, // Por padrão, assumimos que não é perecível em caso de erro
      _debug: {
        error: String(error),
        timestamp: new Date().toISOString()
      }
    };
  }
}

interface QueryResponseResult {
  categories: string[];
  _debug?: any;
}

/**
 * Analyzes a query with the user's response to generate search categories
 * for finding both local and online establishments
 */
export async function analyzeQueryWithResponse(
  query: string,
  userResponse: string
): Promise<QueryResponseResult> {
  try {
    // For very common products, use optimized search categories
    if (query.toLowerCase().includes('coca-cola') || query.toLowerCase().includes('refrigerante')) {
      return {
        categories: [
          "Supermercado", 
          "Mercado", 
          "Loja de conveniência", 
          "Padaria", 
          "Mercearia", 
          "Bar", 
          "Restaurante", 
          "Lanchonete", 
          "Delivery de bebidas"
        ],
        _debug: {
          reason: "Optimized categories for common beverage",
          timestamp: new Date().toISOString()
        }
      };
    }
    
    // Otimização específica para busca de pão
    if (query.toLowerCase().includes('pão') || query.toLowerCase().includes('paes')) {
      return {
        categories: [
          "Padaria",
          "Panificadora", 
          "Supermercado",
          "Mercearia",
          "Café",
          "Loja de Conveniência",
          "Mercado de Alimentos Naturais",
          "Quitanda",
          "Mercado de Agricultores",
          "Confeitaria"
        ],
        _debug: {
          reason: "Optimized categories for bread/bakery items",
          timestamp: new Date().toISOString()
        }
      };
    }
    
    const prompt = `
      Based on the user's search query "${query}"${userResponse ? ` and their clarification "${userResponse}"` : ''},
      generate a list of relevant and SPECIFIC business categories or establishment types that might carry this item.
      
      For example, if they searched for "Garrafa de água" and clarified "academia",
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
      response_format: { type: "json_object" },
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
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error("OpenAI API error when analyzing with response:", error);
    // Fallback to basic categories
    return {
      categories: ["Loja", "Mercado", "Shopping", "Comércio local"],
      _debug: {
        error: String(error),
        timestamp: new Date().toISOString()
      }
    };
  }
}