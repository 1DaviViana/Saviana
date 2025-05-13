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
      
      // Variável para controlar se já recebemos os resultados reais
      let realResultsReceived = false;
      
      // Criar um controller para abortar requisições se necessário
      const controller = new AbortController();
      
      // Iniciamos um timer para mostrar resultados parciais rápidos (simulando streaming)
      const quickResultsTimer = setTimeout(() => {
        // Só mostramos resultados parciais se ainda não temos os resultados reais
        if (!realResultsReceived) {
          console.log("[DEBUG] Mostrando resultados parciais rápidos");
          
          // Criar um resultado parcial para melhorar a experiência do usuário
          const partialResults: SearchResponse = {
            needsClarification: false,
            results: [
              {
                category: "local", 
                name: "Buscando estabelecimentos próximos...",
                address: "Aguarde um momento",
                distance: "Calculando distâncias...",
                hasProduct: true,
                location: {
                  lat: latitude || -23.55,
                  lng: longitude || -46.63
                }
              }
            ]
          };
          
          // Atualizar o estado com resultados parciais
          setSearchState({
            loading: true, // ainda carregando
            results: partialResults
          });
        }
      }, 600); // Mostrar algo rápido após 600ms

      // Fazemos a requisição real para o backend
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
      
      // Marcar que recebemos os resultados reais e limpar o timer
      realResultsReceived = true;
      clearTimeout(quickResultsTimer);

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data: SearchResponse = await response.json();
      
      console.log("[DEBUG] Dados completos recebidos, atualizando estado...");
      
      // Adicionar logs para debug
      const now = new Date().toISOString();
      if (data.needsClarification) {
        // Log para solicitação de clarificação
        setDebugLogs(prevLogs => [
          {
            timestamp: now,
            source: 'OpenAI',
            data: data._debug || { message: 'Solicitando clarificação' }
          },
          ...prevLogs
        ]);
        
        console.log("[DEBUG] Necessita clarificação, mostrando pergunta");
        
        // Atualizar estado para não mostrar mais o carregamento
        setSearchState({ loading: false, results: null });
        
        // Mostrar a pergunta de clarificação para o usuário
        setConversation({
          visible: true,
          question: data.clarificationQuestion || "Pode fornecer mais detalhes sobre sua busca?",
          userResponse: "",
          hasResponded: false,
        });
      } else {
        // Log para resultados finais
        setDebugLogs(prevLogs => [
          {
            timestamp: now,
            source: 'API Response',
            data: data._debug || { message: 'Resultados recebidos' }
          },
          // Adicionar metadados detalhados quando disponíveis
          ...(data.results && data.results.length > 0 && data.results[0]?.metadata?._debugAll ? [{
            timestamp: now,
            source: 'Detalhes',
            data: data.results[0]?.metadata?._debugAll || { message: 'Detalhes não disponíveis' }
          }] : []),
          ...prevLogs
        ]);
        
        console.log("[DEBUG] Resultados completos recebidos, atualizando interface");
        
        // Atualizar o estado com os resultados finais
        // Se já havia resultados parciais, esta atualização fará uma transição suave
        setSearchState({
          loading: false, // carregamento concluído
          results: data    // resultados finais
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

      // Variável para controlar se já recebemos os resultados reais
      let realResultsReceived = false;
      
      // Criar um controller para abortar requisições se necessário
      const controller = new AbortController();
      
      // Iniciamos um timer para mostrar resultados parciais rápidos
      const quickResultsTimer = setTimeout(() => {
        // Só mostramos resultados parciais se ainda não temos os resultados reais
        if (!realResultsReceived) {
          console.log("[DEBUG] Mostrando resultados parciais para resposta do usuário");
          
          // Criar um resultado parcial para melhorar a experiência do usuário
          const partialResults: SearchResponse = {
            needsClarification: false,
            results: [
              {
                category: "local", 
                name: "Processando sua resposta...",
                address: "Buscando resultados relacionados",
                distance: "Calculando...",
                hasProduct: true,
                location: {
                  lat: latitude || -23.55,
                  lng: longitude || -46.63
                }
              }
            ]
          };
          
          // Atualizar o estado com resultados parciais
          setSearchState({
            loading: true, // ainda carregando
            results: partialResults
          });
        }
      }, 600); // Mostrar algo rápido após 600ms

      const searchResponse = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          userResponse: response,
          latitude,
          longitude,
        }),
        signal: controller.signal
      });
      
      // Marcar que recebemos os resultados reais e limpar o timer
      realResultsReceived = true;
      clearTimeout(quickResultsTimer);

      if (!searchResponse.ok) {
        throw new Error("Search with response failed");
      }

      const data: SearchResponse = await searchResponse.json();
      
      console.log("[DEBUG] Dados da resposta recebidos, atualizando estado...");
      
      // Adiciona logs das respostas finais após clarificação
      const now = new Date().toISOString();
      setDebugLogs(prevLogs => [
        {
          timestamp: now,
          source: 'API Response (após clarificação)',
          data: data._debug || { message: 'Resultados processados' }
        },
        // Busca e adiciona metadata que contém dados da API quando disponível
        ...(data.results && data.results.length > 0 && data.results[0]?.metadata?._debugAll ? [{
          timestamp: now,
          source: 'Resultados Detalhados',
          data: data.results[0]?.metadata?._debugAll || { message: 'Detalhes não disponíveis' }
        }] : []),
        ...prevLogs
      ]);
      
      console.log("[DEBUG] Resultados da clarificação recebidos");
      
      // Atualizar o estado com os resultados finais
      setSearchState({
        loading: false,
        results: data
      });
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
