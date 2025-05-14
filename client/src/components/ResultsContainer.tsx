import React from "react";
import { Card, CardContent } from "./ui/card";
import { MapPin, Flag, Globe, Link, ExternalLink } from "lucide-react";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import GoogleMap from "./GoogleMap";

// We'll define an inline type here to avoid import issues
// This matches the structure in shared/schema.ts
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
  
  // **NOVA ABORDAGEM COM RESULTADOS INCREMENTAIS**
  // Se não estiver carregando E não tiver resultados para mostrar e não precisar de clarificação, não mostra nada
  if (!loading && (!results || (!results.results && !results.needsClarification))) {
    console.log("[DEBUG] Sem resultados e sem clarificação - retornando null");
    return null;
  }
  
  // Se estiver carregando e ainda não tem nenhum resultado para mostrar
  if (loading && (!results || !results.results || results.results.length === 0)) {
    console.log("[DEBUG] Mostrando APENAS spinner, sem resultados ainda");
    return (
      <div className="w-full max-w-lg mx-auto fade-in">
        <div className="text-center py-5">
          <div className="inline-block">
            <svg data-testid="loading-spinner" className="animate-spin h-8 w-8 text-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-sm mt-2 text-muted-foreground">Buscando resultados...</p>
        </div>
      </div>
    );
  }
  
  // Se chegou aqui, então temos resultados para mostrar (mesmo que ainda esteja carregando mais)
  
  // Se chegou até aqui, significa que não está carregando E tem resultados para mostrar
  // Prepare os dados para renderização
  // Using 'any' type to bypass the type mismatch issue between the database model and API response
  // This is a compromise since we're passing data directly from the API to the UI
  const localResults = results?.results?.filter((r: any) => r.category === "local") || [];
  const nationalResults = results?.results?.filter((r: any) => r.category === "national") || [];
  const globalResults = results?.results?.filter((r: any) => r.category === "global") || [];

  const hasAnyResults = localResults.length > 0 || nationalResults.length > 0 || globalResults.length > 0;

  return (
    <div className="w-full max-w-lg mx-auto fade-in">
      <div className="results-list">
        {/* Indicador de carregamento no topo quando temos resultados parciais */}
        {loading && hasAnyResults && (
          <div className="text-center py-2 mb-3">
            <div className="inline-flex items-center bg-blue-50 px-3 py-1 rounded-full shadow-sm">
              <svg className="animate-spin h-4 w-4 text-primary mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-xs text-blue-700 font-medium">Carregando mais resultados...</span>
            </div>
          </div>
        )}

        {hasAnyResults ? (
          <>            
            {localResults.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-2">
                  {localResults.length} estabelecimentos próximos
                  {loading && (
                    <span className="text-xs text-blue-600 ml-1 bg-blue-50 px-1.5 py-0.5 rounded-full">
                      <span className="inline-block h-1.5 w-1.5 bg-blue-500 rounded-full mr-1 animate-pulse"></span>
                      buscando mais...
                    </span>
                  )}
                </p>
                
                {/* Map section */}
                {localResults.length > 0 && (
                  <div className="relative mb-3 rounded-md overflow-hidden shadow-sm" style={{ height: "180px" }}>
                    <GoogleMap locations={localResults} />
                  </div>
                )}
                
                {/* Local results list */}
                {localResults.map((result, index) => (
                  <Card key={`local-${index}-${result.name}`} className="mb-2 hover:shadow-md transition duration-200">
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
                <p className="text-sm text-gray-500 mb-2">
                  Opções online nacionais
                  {loading && (
                    <span className="text-xs text-blue-600 ml-1 bg-blue-50 px-1.5 py-0.5 rounded-full">
                      <span className="inline-block h-1.5 w-1.5 bg-blue-500 rounded-full mr-1 animate-pulse"></span>
                      buscando mais...
                    </span>
                  )}
                </p>
                
                {/* National results list */}
                {nationalResults.map((result, index) => (
                  <Card key={`national-${index}-${result.name}`} className="mb-2 hover:shadow-md transition duration-200">
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
                <p className="text-sm text-gray-500 mb-2">
                  Opções internacionais
                  {loading && (
                    <span className="text-xs text-blue-600 ml-1 bg-blue-50 px-1.5 py-0.5 rounded-full">
                      <span className="inline-block h-1.5 w-1.5 bg-blue-500 rounded-full mr-1 animate-pulse"></span>
                      buscando mais...
                    </span>
                  )}
                </p>
                
                {/* Global results list */}
                {globalResults.map((result, index) => (
                  <Card key={`global-${index}-${result.name}`} className="mb-2 hover:shadow-md transition duration-200">
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
          !loading && (
            <div className="text-center py-4">
              <h4 className="text-sm text-gray-500">Nenhum resultado encontrado</h4>
            </div>
          )
        )}
      </div>
    </div>
  );
}
