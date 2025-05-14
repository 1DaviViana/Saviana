import React, { useState, useEffect } from "react";
import SearchBar from "../components/SearchBar";
import ConversationContainer from "../components/ConversationContainer";
import ResultsContainer from "../components/ResultsContainer";
import DebugLogs from "../components/DebugLogs";
import { useGeolocation } from "../hooks/use-geolocation";
// Importa tanto SearchResponse quanto SearchRequest
import { SearchResponse, SearchRequest } from "../../../shared/schema";
// Importação direta do UserCreditsDisplay
import UserCreditsDisplay from "../components/UserCreditsDisplay";
// *** IMPORTA A FUNÇÃO DA API ***
import { searchPlaces } from "../lib/api";

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
    const now = new Date().toISOString();
    let logSource = 'Geolocalização';
    if (geoLoading) logSource = 'Geolocalização - Carregando';
    else if (source === 'browser') logSource = 'Geolocalização - Navegador';
    else if (source === 'ip') logSource = 'Geolocalização - IP Fallback';
    else if (geoError) logSource = 'Geolocalização - Erro';

    const logEntry = {
      timestamp: now,
      source: logSource,
      data: {
        status: { loading: geoLoading, complete: !geoLoading && (latitude !== null || longitude !== null), error: geoError !== null, timestamp: now },
        coordinates: { latitude, longitude, available: latitude !== null && longitude !== null },
        source: { type: source || 'nenhuma', browser_supported: typeof navigator !== 'undefined' && 'geolocation' in navigator, fallback_used: source === 'ip' },
        error: { message: geoError, code: geoError ? 'unknown' : null },
        raw_data: { navigator: typeof navigator !== 'undefined' ? { userAgent: navigator.userAgent, platform: navigator.platform } : 'não disponível' }
      }
    };
    setDebugLogs(logs => [logEntry, ...logs].slice(0, 50)); // Limita os logs para evitar sobrecarga
  }, [latitude, longitude, geoLoading, geoError, source]);

  const handleSearch = async (query: string) => {
    console.log("[DEBUG] Iniciando busca...");
    setSearchQuery(query);
    setSearchState({ loading: true, results: null });
    setConversation({ visible: false, question: "", userResponse: "", hasResponded: false });

    try {
      console.log("[DEBUG] Enviando busca com:", { query, geoState: { latitude, longitude, error: geoError } });

      // Log da requisição
      const logEntryReq = {
        timestamp: new Date().toISOString(),
        source: 'Requisição Search',
        data: { query, coords: { latitude, longitude }, hasCoords: Boolean(latitude && longitude), geoError }
      };
      setDebugLogs(prevLogs => [logEntryReq, ...prevLogs].slice(0, 50));

      // *** USA A FUNÇÃO searchPlaces ***
      const requestData: SearchRequest = {
        query,
        latitude,
        longitude,
      };
      const data: SearchResponse = await searchPlaces(requestData);
      // ********************************

      console.log("[DEBUG] Dados recebidos, atualizando estado...");

      // Logs da resposta
      const now = new Date().toISOString();
      let logEntriesRes: any[] = [];
      if (data.needsClarification) {
        logEntriesRes.push({ timestamp: now, source: 'OpenAI Debug (Clarify)', data: data._debug || { message: 'Necessita clarificação, mas sem dados de debug' } });
      } else {
        logEntriesRes.push({ timestamp: now, source: 'API Response Debug (Final)', data: data._debug || { message: 'Sem dados de debug' } });
        if (data.results && data.results.length > 0 && data.results[0].metadata?._debugAll) {
          logEntriesRes.push({ timestamp: now, source: 'Resultados Detalhados Debug', data: data.results[0].metadata._debugAll });
        } else {
          logEntriesRes.push({ timestamp: now, source: 'Resultados Detalhados Debug', data: { message: 'Sem dados detalhados de debug' } });
        }
      }
      setDebugLogs(prevLogs => [...logEntriesRes, ...prevLogs].slice(0, 50));

      // Atualização do estado
      if (data.needsClarification && data.clarificationQuestion) {
        console.log("[DEBUG] Necessita clarificação, parando carregamento");
        setSearchState({ loading: false, results: null });
        setTimeout(() => {
          setConversation({
            visible: true,
            question: data.clarificationQuestion || "Pode nos fornecer mais detalhes?", // Não precisa de cast
            userResponse: "",
            hasResponded: false,
          });
        }, 50); // Pequeno delay para garantir atualização do loading
      } else {
        console.log("[DEBUG] Resultados recebidos, parando carregamento");
        setSearchState({ loading: false, results: data }); // Atualiza direto sem timeout desnecessário
      }
    } catch (error) {
      console.error("Search error:", error);
       // Adiciona log do erro
      if (error instanceof Error) {
          setDebugLogs(prev => [{ timestamp: new Date().toISOString(), source: 'Erro API Search', data: { message: error.message, stack: error.stack }}, ...prev].slice(0, 50));
      } else {
          setDebugLogs(prev => [{ timestamp: new Date().toISOString(), source: 'Erro API Search', data: { message: 'Erro desconhecido', details: error }}, ...prev].slice(0, 50));
      }
      setSearchState({ loading: false, results: null });
    }
  };

  const handleUserResponse = async (response: string) => {
    setConversation(prev => ({ ...prev, userResponse: response, hasResponded: true }));
    setSearchState({ loading: true, results: null }); // Inicia loading para a nova busca

    try {
      console.log("[DEBUG] Enviando resposta do usuário:", { query: searchQuery, userResponse: response, geoState: { latitude, longitude, error: geoError } });

      // Log da requisição
      const logEntryReq = {
        timestamp: new Date().toISOString(),
        source: 'Requisição com Resposta (Clarify)',
        data: { query: searchQuery, userResponse: response, coords: { latitude, longitude }, hasCoords: Boolean(latitude && longitude), geoError }
      };
      setDebugLogs(prevLogs => [logEntryReq, ...prevLogs].slice(0, 50));

      // *** USA A FUNÇÃO searchPlaces ***
      const requestData: SearchRequest = {
        query: searchQuery,
        userResponse: response, // Inclui a resposta
        latitude,
        longitude,
      };
      const data: SearchResponse = await searchPlaces(requestData);
      // ********************************

      console.log("[DEBUG] Dados da resposta recebidos, atualizando estado...");

      // Logs da resposta
      const now = new Date().toISOString();
      let logEntriesRes: any[] = [
        { timestamp: now, source: 'API Response Debug (após clarificação)', data: data._debug || { message: 'Sem dados de debug' } }
      ];
      if (data.results && data.results.length > 0 && data.results[0].metadata?._debugAll) {
        logEntriesRes.push({ timestamp: now, source: 'Resultados Detalhados Debug', data: data.results[0].metadata._debugAll });
      } else {
         logEntriesRes.push({ timestamp: now, source: 'Resultados Detalhados Debug', data: { message: 'Sem dados detalhados de debug' } });
      }
      setDebugLogs(prevLogs => [...logEntriesRes, ...prevLogs].slice(0, 50));

      console.log("[DEBUG] Resultados da clarificação recebidos, parando carregamento");
      setSearchState({ loading: false, results: data }); // Atualiza direto

    } catch (error) {
      console.error("Search with response error:", error);
      // Adiciona log do erro
      if (error instanceof Error) {
          setDebugLogs(prev => [{ timestamp: new Date().toISOString(), source: 'Erro API Clarify', data: { message: error.message, stack: error.stack }}, ...prev].slice(0, 50));
      } else {
          setDebugLogs(prev => [{ timestamp: new Date().toISOString(), source: 'Erro API Clarify', data: { message: 'Erro desconhecido', details: error }}, ...prev].slice(0, 50));
      }
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

      {conversation.visible && (
        <ConversationContainer
          question={conversation.question}
          userResponse={conversation.userResponse}
          hasResponded={conversation.hasResponded}
          onSubmitResponse={handleUserResponse}
          loading={searchState.loading && conversation.hasResponded} // Só mostra loading na conversa se já respondeu
        />
      )}

      <ResultsContainer
        // Mostra loading geral APENAS se a conversa NÃO estiver visível ou se já foi respondida
        loading={searchState.loading && (!conversation.visible || conversation.hasResponded)}
        results={searchState.results}
      />

      {/* Habilitar esta linha para ver os logs de debug na UI */}
      {/* <DebugLogs logs={debugLogs} /> */}
    </div>
  );
}
