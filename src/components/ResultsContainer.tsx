import React from "react";
import { SearchResponse } from "../../shared/schema";
import { Card, CardContent } from "./ui/card";
import { MapPin, Flag, Globe, Link, ExternalLink } from "lucide-react";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import GoogleMap from "./GoogleMap";

interface ResultsContainerProps {
  loading: boolean;
  results: SearchResponse | null;
}

export default function ResultsContainer({ loading, results }: ResultsContainerProps) {
  // Debug para acompanhar estados - mais detalhado para entender melhor o problema
  console.log("[DEBUG] ResultsContainer state:", { 
    loading, 
    hasResults: Boolean(results?.results?.length), 
    resultsObject: results ? true : false,
    needsClarification: results?.needsClarification,
    timestamp: new Date().toISOString().substring(11, 23)
  });
  
  // **ABORDAGEM COMPLETAMENTE NOVA**
  // Se não estiver carregando ou não houver resultados, não mostre nada
  if (!loading) {
    // Se não tiver resultados para mostrar e não precisar de clarificação, não mostra nada
    if (!results || (!results.results && !results.needsClarification)) {
      console.log("[DEBUG] Sem resultados e sem clarificação - retornando null");
      return null;
    }
    
    // Se tiver resultados para mostrar, continue o fluxo normal (cai no return final)
  } else {
    // Se estiver carregando, mostra APENAS o spinner e nada mais
    console.log("[DEBUG] Mostrando APENAS spinner, pois loading =", loading);
    return (
      <div className="w-full max-w-lg mx-auto fade-in">
        <div className="text-center py-5">
          <div className="inline-block">
            <svg data-testid="loading-spinner" className="animate-spin h-8 w-8 text-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        </div>
      </div>
    );
  }
  
  // Se chegou até aqui, significa que não está carregando E tem resultados para mostrar
  // Prepare os dados para renderização
  const localResults = results?.results?.filter(r => r.category === "local") || [];
  const nationalResults = results?.results?.filter(r => r.category === "national") || [];
  const globalResults = results?.results?.filter(r => r.category === "global") || [];

  const hasAnyResults = localResults.length > 0 || nationalResults.length > 0 || globalResults.length > 0;

  return (
    <div className="w-full max-w-lg mx-auto fade-in">
      <div className="results-list">
        {hasAnyResults ? (
          <>            
            {localResults.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-2">{localResults.length} estabelecimentos próximos</p>
                
                {/* Map section */}
                {localResults.length > 0 && (
                  <div className="relative mb-3 rounded-md overflow-hidden shadow-sm" style={{ height: "180px" }}>
                    <GoogleMap locations={localResults} />
                  </div>
                )}
                
                {/* Local results list */}
                {localResults.map((result, index) => (
                  <Card key={`local-${index}`} className="mb-2 hover:shadow-md transition duration-200">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-800">{result.name}</h4>
                          <p className="text-xs text-gray-600">{result.address}</p>
                          {result.distance && (
                            <span className="text-xs text-gray-500">{result.distance}</span>
                          )}
                        </div>
                        {result.hasProduct && (
                          <Badge variant="outline" className="bg-green-50 text-green-800 text-xs">
                            Disponível
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {nationalResults.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-2">Opções online nacionais</p>
                
                {/* National results list */}
                {nationalResults.map((result, index) => (
                  <Card key={`national-${index}`} className="mb-2 hover:shadow-md transition duration-200">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-800">{result.name}</h4>
                          {result.price && (
                            <span className="text-xs text-gray-800">{result.price}</span>
                          )}
                        </div>
                        {result.website && (
                          <a 
                            href={result.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary text-xs"
                          >
                            Visitar
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {globalResults.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Opções internacionais</p>
                
                {/* Global results list */}
                {globalResults.map((result, index) => (
                  <Card key={`global-${index}`} className="mb-2 hover:shadow-md transition duration-200">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-800">{result.name}</h4>
                          {result.price && (
                            <span className="text-xs text-gray-800">{result.price}</span>
                          )}
                        </div>
                        {result.website && (
                          <a 
                            href={result.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary text-xs"
                          >
                            Visitar
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <h4 className="text-sm text-gray-500">Nenhum resultado encontrado</h4>
          </div>
        )}
      </div>
    </div>
  );
}
