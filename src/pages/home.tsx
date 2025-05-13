import React, { useState, useEffect } from "react";
import SearchBar from "../components/SearchBar";
import ConversationContainer from "../components/ConversationContainer";
import ResultsContainer from "../components/ResultsContainer";
import DebugLogs from "../components/DebugLogs";
import { useGeolocation } from "../hooks/use-geolocation";
import { SearchResponse } from "../../shared/schema";
// Importação direta do UserCreditsDisplay
import UserCreditsDisplay from "../components/UserCreditsDisplay";
// Importação do componente de status de geolocalização
import { GeolocationStatus } from "../components/GeolocationStatus";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  // Definindo interface para o estado de conversação
  interface ConversationState {
    visible: boolean;
    question: string;
    userResponse: string;
    hasResponded: boolean;
  }
  
  const [conversation, setConversation] = useState<ConversationState>({
    visible: false,
    question: "",
    userResponse: "",
    hasResponded: false,
  });

  const [searchState, setSearchState] = useState<{
    loading: boolean;
    results: SearchResponse | null;
  }>({
    loading: false,
    results: null,
  });
  
  // Estado para logs de debug
  const [debugLogs, setDebugLogs] = useState<Array<{
    timestamp: string;
    source: string;
    data: any;
  }>>([]);

  const { latitude, longitude, loading: geoLoading, error: geoError, source, requestGeolocation } = useGeolocation();
  
  // Debug para ver se está pegando a localização
  console.log("Geolocalização:", { 
    latitude, 
    longitude, 
    geoLoading, 
    geoError, 
    source: source || 'nenhuma' 
  });
  
  // Adiciona logs detalhados de geolocalização à caixa de debug existente
  useEffect(() => {
    // Cria um log detalhado para cada mudança no estado de geolocalização
    const now = new Date().toISOString();
    let logSource = 'Geolocalização';
    
    if (geoLoading) {
      logSource = 'Geolocalização - Carregando';
    } else if (source === 'browser') {
      logSource = 'Geolocalização - Navegador';
    } else if (source === 'ip') {
      logSource = 'Geolocalização - IP Fallback';
    } else if (geoError) {
      logSource = 'Geolocalização - Erro';
    }
    
    const logEntry = {
      timestamp: now,
      source: logSource,
      data: {
        status: {
          loading: geoLoading,
          complete: !geoLoading && (latitude !== null || longitude !== null),
          error: geoError !== null,
          timestamp: now
        },
        coordinates: {
          latitude,
          longitude,
          available: latitude !== null && longitude !== null
        },
        source: {
          type: source || 'nenhuma',
          browser_supported: typeof navigator !== 'undefined' && 'geolocation' in navigator,
          fallback_used: source === 'ip'
        },
        error: {
          message: geoError,
          code: geoError ? 'unknown' : null
        },
        raw_data: {
          navigator: typeof navigator !== 'undefined' ? 
            { userAgent: navigator.userAgent, platform: navigator.platform } : 
            'não disponível'
        }
      }
    };
    
    setDebugLogs(logs => [logEntry, ...logs]);
  }, [latitude, longitude, geoLoading, geoError, source]);

  const handleSearch = async (query: string) => {
    // Debug
    console.log("[DEBUG] Iniciando busca...");
    
    setSearchQuery(query);
    setSearchState({ loading: true, results: null });
    setConversation({
      visible: false,
      question: "",
      userResponse: "",
      hasResponded: false,
    });

    // Timestamp para esta busca específica
    const searchId = Date.now();

    try {
      console.log("[DEBUG] Enviando busca com:", { 
        query, 
        geoState: { latitude, longitude, error: geoError } 
      });

      // Adiciona um log para a requisição
      const logEntry = {
        timestamp: new Date().toISOString(),
        source: 'Requisição',
        data: { 
          query,
          coords: { latitude, longitude },
          hasCoords: Boolean(latitude && longitude),
          geoError
        }
      };
      
      setDebugLogs(prevLogs => [logEntry, ...prevLogs]);

      // Criar um controller para abortar requisições se necessário
      const controller = new AbortController();
      
      // Timeout para simular resultados parciais (apenas para demonstração da UI)
      // NOTA: Normalmente isso seria implementado no backend com streaming real
      let firstBatchReceived = false;
      const firstBatchTimer = setTimeout(() => {
        if (!firstBatchReceived) {
          // Simula o primeiro conjunto de resultados chegando
          console.log("[DEBUG] Simulando primeiro lote de resultados");
          
          // Gerar alguns resultados iniciais aleatórios para demonstrar a UI
          const mockPartialResults: SearchResponse = {
            needsClarification: false,
            results: [
              {
                category: "local",  // O schema define isso como um enum
                name: "Resultado preliminar local",
                address: "Carregando endereço...",
                distance: "Calculando...",
                hasProduct: Math.random() > 0.5,
                location: {
                  lat: latitude || -23.55,
                  lng: longitude || -46.63
                }
              }
            ]
          };
          
          // Atualizar estado com resultados parciais
          setSearchState(prev => ({
            loading: true, // ainda está carregando
            results: mockPartialResults
          }));
        }
      }, 700); // Mostrar resultados parciais após 700ms
      
      // Registrar uma função para limpar o timeout quando o componente for desmontado
      const cleanup = () => {
        clearTimeout(firstBatchTimer);
        controller.abort();
      };

      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          latitude,
          longitude,
        }),
        signal: controller.signal
      });

      // Marca que recebemos a resposta real
      firstBatchReceived = true;
      clearTimeout(firstBatchTimer);

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data: SearchResponse = await response.json();
      
      // Log para garantir que o estado está sendo atualizado corretamente
      console.log("[DEBUG] Dados recebidos, atualizando estado...");
      
      // Adiciona os dados à caixa de log 
      const now = new Date().toISOString();
      if (data.needsClarification) {
        setDebugLogs(prevLogs => [
          {
            timestamp: now,
            source: 'OpenAI',
            data: data._debug || { message: 'Necessita clarificação, mas sem dados de debug' }
          },
          ...prevLogs
        ]);
      } else {
        // Para resultados finais, adiciona logs tanto do OpenAI quanto do Google Places
        setDebugLogs(prevLogs => [
          {
            timestamp: now,
            source: 'API Response',
            data: data._debug || { message: 'Sem dados de debug' }
          },
          // Busca e adiciona metadata que contém dados da API
          ...(data.results ? [{
            timestamp: now,
            source: 'Resultados Detalhados',
            data: data.results.length > 0 && data.results[0].metadata?._debugAll 
              ? data.results[0].metadata._debugAll 
              : { message: 'Sem dados detalhados de debug' }
          }] : []),
          ...prevLogs
        ]);
      }

      // Lidar com o cleanup após o recebimento de resultados
      if (typeof cleanup === 'function') {
        cleanup();
      }
      
      if (data.needsClarification && data.clarificationQuestion) {
        console.log("[DEBUG] Necessita clarificação, parando carregamento");
        
        // Primeiro atualizar o estado de loading para false, garantindo que ele realmente mude
        setSearchState({ loading: false, results: null });
        
        // Pequeno timeout para garantir que o estado de loading foi atualizado
        setTimeout(() => {
          // Depois mostrar a conversação (usando casting para string para satisfazer TypeScript)
          setConversation({
            visible: true,
            question: (data.clarificationQuestion as string) || "Pode nos fornecer mais detalhes?",
            userResponse: "",
            hasResponded: false,
          });
        }, 50);
      } else {
        console.log("[DEBUG] Resultados completos recebidos, atualizando exibição incrementalmente");
        
        // Se já tínhamos resultados parciais, mesclamos com os novos gradualmente para uma transição suave
        setSearchState(prev => {
          // Verificamos se já temos alguns resultados parciais
          if (prev.results?.results?.length) {
            console.log("[DEBUG] Mesclando resultados parciais com resultados finais");
            
            // Combinamos os resultados anteriores com os novos
            return { 
              loading: false, 
              results: data 
            };
          } else {
            // Caso não tenhamos resultados parciais anteriores
            return { 
              loading: false, 
              results: data 
            };
          }
        });
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchState({ loading: false, results: null });
    }
  };

  const handleUserResponse = async (response: string) => {
    setConversation({
      ...conversation,
      userResponse: response,
      hasResponded: true,
    });
    setSearchState({ loading: true, results: null });

    try {
      console.log("[DEBUG] Enviando resposta do usuário:", { 
        query: searchQuery, 
        userResponse: response,
        geoState: { latitude, longitude, error: geoError } 
      });

      // Adiciona um log para a requisição de resposta
      const logEntry = {
        timestamp: new Date().toISOString(),
        source: 'Requisição com Resposta',
        data: { 
          query: searchQuery,
          userResponse: response,
          coords: { latitude, longitude },
          hasCoords: Boolean(latitude && longitude),
          geoError
        }
      };
      
      setDebugLogs(prevLogs => [logEntry, ...prevLogs]);

      const searchResponse = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          userResponse: response,
          latitude,
          longitude,
        }),
      });

      if (!searchResponse.ok) {
        throw new Error("Search with response failed");
      }

      const data: SearchResponse = await searchResponse.json();
      
      // Log para garantir que o estado está sendo atualizado corretamente
      console.log("[DEBUG] Dados da resposta recebidos, atualizando estado...");
      
      // Adiciona logs das respostas finais após clarificação
      const now = new Date().toISOString();
      setDebugLogs(prevLogs => [
        {
          timestamp: now,
          source: 'API Response (após clarificação)',
          data: data._debug || { message: 'Sem dados de debug' }
        },
        // Busca e adiciona metadata que contém dados da API
        ...(data.results ? [{
          timestamp: now,
          source: 'Resultados Detalhados',
          data: data.results.length > 0 && data.results[0].metadata?._debugAll 
            ? data.results[0].metadata._debugAll 
            : { message: 'Sem dados detalhados de debug' }
        }] : []),
        ...prevLogs
      ]);
      
      console.log("[DEBUG] Resultados da clarificação recebidos, parando carregamento");
      
      // Primeiro garantir que o loading é removido
      setSearchState(prev => ({ ...prev, loading: false }));
      
      // Pequeno timeout para garantir que o estado de loading foi atualizado
      setTimeout(() => {
        // Depois atualizar os resultados
        setSearchState({ loading: false, results: data });
      }, 50);
    } catch (error) {
      console.error("Search with response error:", error);
      setSearchState({ loading: false, results: null });
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <header className="mb-6 relative">
        <div className="absolute right-0 top-0">
          <UserCreditsDisplay credits={100} />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">Saviana</h1>
        </div>
      </header>

      <SearchBar onSearch={handleSearch} />
      
      {/* Indicador de status da geolocalização - posicionado após a barra de pesquisa */}
      <GeolocationStatus />

      {conversation.visible && (
        <ConversationContainer
          question={conversation.question}
          userResponse={conversation.userResponse}
          hasResponded={conversation.hasResponded}
          onSubmitResponse={handleUserResponse}
          loading={searchState.loading} // Passando o estado de loading
        />
      )}

      {/* Somente mostrar o spinner de ResultsContainer quando não houver conversa ativa ou a conversa não estiver respondida */}
      {(!conversation.visible || !conversation.hasResponded) && (
        <ResultsContainer 
          loading={searchState.loading} 
          results={searchState.results} 
        />
      )}
      
      {/* Mostrar resultados sem spinner quando conversa estiver respondida */}
      {conversation.visible && conversation.hasResponded && (
        <ResultsContainer 
          loading={false} 
          results={searchState.results} 
        />
      )}
      
      {/* Debug logs (temporariamente ocultos) */}
      {false && <DebugLogs logs={debugLogs} />}
    </div>
  );
}
