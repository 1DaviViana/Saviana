import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeQuery } from "./services/openai";
import { searchPlaces } from "./services/places";
import { searchRequestSchema, searchResponseSchema } from "@shared/schema";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint para Railway
  app.get("/api/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });
  
  // Search API endpoint
  app.post("/api/search", async (req: Request, res: Response) => {
    try {
      console.log("📨 Recebendo requisição de busca:", JSON.stringify(req.body));
      
      // Validate request body
      const requestData = searchRequestSchema.parse(req.body);
      
      // Get current timestamp
      const timestamp = new Date().toISOString();
      
      // If userResponse is provided, skip AI clarification
      if (requestData.userResponse) {
        // Store the query with user response
        const storedQuery = await storage.createSearchQuery({
          query: requestData.query,
          refinedQuery: `${requestData.query} (${requestData.userResponse})`,
          clarificationQuestion: "",
          userResponse: requestData.userResponse,
          timestamp,
        });
        
        // Presumimos que precisamos de clarificação para items perecíveis
        // já que o usuário já respondeu a uma pergunta específica
        const isPerishable = true;
        
        // Search for places based on the refined query
        const results = await searchPlaces(
          requestData.query,
          requestData.userResponse,
          requestData.latitude || null,
          requestData.longitude || null,
          isPerishable
        );
        
        // Store each result
        for (const result of results) {
          await storage.createSearchResult({
            ...result,
            queryId: storedQuery.id,
          });
        }
        
        console.log(`✅ Resultados encontrados com clarificação: ${results.length} (locais: ${results.filter(r => r.category === 'local').length}, nacionais: ${results.filter(r => r.category === 'national').length}, globais: ${results.filter(r => r.category === 'global').length})`);
        
        // Return results to client
        return res.json({
          needsClarification: false,
          results,
          _debug: {
            timestamp: new Date().toISOString(),
            query: requestData.query,
            userResponse: requestData.userResponse,
            hasCoordinates: Boolean(requestData.latitude && requestData.longitude),
            coordinates: {
              latitude: requestData.latitude,
              longitude: requestData.longitude
            },
            geoSource: requestData.latitude === -23.5505 && requestData.longitude === -46.6333 ? 'fallback' : 'browser',
            resultCount: results.length,
            resultBreakdown: {
              local: results.filter(r => r.category === 'local').length,
              national: results.filter(r => r.category === 'national').length,
              global: results.filter(r => r.category === 'global').length
            }
          }
        });
      }
      
      // Analyze query with OpenAI to determine if clarification is needed
      const analysis = await analyzeQuery(requestData.query);
      
      if (analysis.needsClarification) {
        // Store the query with clarification question
        await storage.createSearchQuery({
          query: requestData.query,
          refinedQuery: "",
          clarificationQuestion: analysis.clarificationQuestion,
          userResponse: "",
          timestamp,
        });
        
        // Ask user for clarification
        return res.json({
          needsClarification: true,
          clarificationQuestion: analysis.clarificationQuestion,
        });
      }
      
      // If no clarification needed, proceed with search
      const storedQuery = await storage.createSearchQuery({
        query: requestData.query,
        refinedQuery: analysis.refinedQuery || requestData.query,
        clarificationQuestion: "",
        userResponse: "",
        timestamp,
      });
      
      // Search for places
      const results = await searchPlaces(
        requestData.query,
        "",
        requestData.latitude || null,
        requestData.longitude || null,
        analysis.isPerishable // Usamos o valor determinado pelo OpenAI
      );
      
      // Store results
      for (const result of results) {
        await storage.createSearchResult({
          ...result,
          queryId: storedQuery.id,
        });
      }
      
      console.log(`✅ Resultados encontrados: ${results.length} (locais: ${results.filter(r => r.category === 'local').length}, nacionais: ${results.filter(r => r.category === 'national').length}, globais: ${results.filter(r => r.category === 'global').length})`);
      
      // Return results to client
      return res.json({
        needsClarification: false,
        results,
        _debug: {
          timestamp: new Date().toISOString(),
          query: requestData.query,
          userResponse: requestData.userResponse,
          hasCoordinates: Boolean(requestData.latitude && requestData.longitude),
          coordinates: {
            latitude: requestData.latitude,
            longitude: requestData.longitude
          },
          geoSource: requestData.latitude === -23.5505 && requestData.longitude === -46.6333 ? 'fallback' : 'browser',
          resultCount: results.length,
          resultBreakdown: {
            local: results.filter(r => r.category === 'local').length,
            national: results.filter(r => r.category === 'national').length,
            global: results.filter(r => r.category === 'global').length
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

  const httpServer = createServer(app);
  return httpServer;
}
