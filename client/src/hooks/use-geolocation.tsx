import { useState, useEffect, useCallback } from 'react';
import { getLocationByIP } from '../lib/geo-fallback';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  source: 'browser' | 'ip' | null;
  errorCode?: number;
  timestamp?: number;
  accuracy?: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  lastAttempt?: number;
  attempts: number;
  cooldown: boolean;
}

// Configurações do debounce e timeout
const DEBOUNCE_INTERVAL = 10000; // 10 segundos entre tentativas
const LOCATION_TIMEOUT = 30000; // 30 segundos para timeout da geolocalização (aumentado ainda mais)
const MAX_ATTEMPTS_BROWSER = 3; // Número máximo de tentativas para o navegador

// Função exportada para geolocalização
export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true,
    source: null,
    errorCode: undefined,
    timestamp: Date.now(),
    accuracy: undefined,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
    lastAttempt: Date.now(),
    attempts: 0,
    cooldown: false,
  });

  const requestGeolocation = useCallback(async () => {
    // Verifica se já tem coordenadas ou se está em loading
    if ((state.latitude && state.longitude && !state.loading) || state.cooldown) {
      return;
    }
    
    // Verifica debounce
    const now = Date.now();
    const timeSinceLastAttempt = state.lastAttempt ? now - state.lastAttempt : Infinity;
    
    // Se a última tentativa foi recente demais, ativa o cooldown
    if (timeSinceLastAttempt < DEBOUNCE_INTERVAL) {
      console.debug(`[DEBUG] Tentativa muito recente, aguardando cooldown (${Math.round((DEBOUNCE_INTERVAL - timeSinceLastAttempt) / 1000)}s)`);
      setState(prev => ({ ...prev, cooldown: true }));
      
      // Agenda a desativação do cooldown
      setTimeout(() => {
        setState(prev => ({ ...prev, cooldown: false }));
      }, DEBOUNCE_INTERVAL - timeSinceLastAttempt);
      
      return;
    }
    
    setState(prev => ({ 
      ...prev, 
      loading: true,
      lastAttempt: now,
      attempts: prev.attempts + 1,
    }));

    // Tenta usar a geolocalização do navegador primeiro
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator && state.attempts < MAX_ATTEMPTS_BROWSER) {
      // Diagnóstico do ambiente
      const ehIframe = typeof window !== 'undefined' && window.self !== window.top;
      const permissionsPolicy = typeof document !== 'undefined' ? 
        document.querySelector('meta[http-equiv="Permissions-Policy"]')?.getAttribute('content') : null;
      const featurePolicy = typeof document !== 'undefined' ? 
        document.querySelector('meta[http-equiv="Feature-Policy"]')?.getAttribute('content') : null;
      const hostname = typeof window !== 'undefined' ? window.location?.hostname : 'N/A';
      const isProduction = hostname === 'www.saviana.com.br' || hostname === 'saviana.com.br';
      
      // Verificações detalhadas em produção
      let permissaoGeolocation = 'não verificado';
      try {
        if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
          navigator.permissions.query({ name: 'geolocation' as PermissionName })
            .then((result) => {
              console.debug('[DEBUG] Status da permissão de geolocalização:', result.state);
              permissaoGeolocation = result.state;
              
              // Instruções específicas para o ambiente de produção
              if (isProduction) {
                if (result.state === 'denied') {
                  console.debug('[DEBUG] [PRODUÇÃO] Permissão de geolocalização negada para este site. O usuário deverá ativar permissões no navegador.');
                  alert('Para uma melhor experiência, por favor habilite o compartilhamento de localização no seu navegador e recarregue a página.');
                } else if (result.state === 'prompt') {
                  console.debug('[DEBUG] [PRODUÇÃO] O usuário será solicitado a permitir geolocalização.');
                }
              }
            })
            .catch(err => {
              console.debug('[DEBUG] Erro ao verificar permissão:', err);
            });
        }
      } catch (err) {
        console.debug('[DEBUG] Erro ao acessar API de permissões:', err);
      }
      
      // Verificações adicionais para detecção de problemas no domínio de produção
      if (isProduction) {
        console.debug('[DEBUG] [PRODUÇÃO] Analisando configurações do site saviana.com.br');
        
        // Verificar se há algum header no servidor que possa estar causando problemas
        try {
          fetch(window.location.href, { method: 'HEAD' })
            .then(response => {
              console.debug('[DEBUG] [PRODUÇÃO] Headers recebidos:', {
                contentSecurityPolicy: response.headers.get('Content-Security-Policy'),
                featurePolicy: response.headers.get('Feature-Policy'),
                permissionsPolicy: response.headers.get('Permissions-Policy')
              });
            })
            .catch(err => {
              console.debug('[DEBUG] [PRODUÇÃO] Erro ao verificar headers:', err);
            });
        } catch (err) {
          console.debug('[DEBUG] [PRODUÇÃO] Erro ao fazer solicitação HEAD:', err);
        }
      }
      
      console.debug('[DEBUG] Verificando suporte a geolocalização:', {
        navegadorSuportado: typeof navigator !== 'undefined',
        apiDisponivel: typeof navigator !== 'undefined' && 'geolocation' in navigator,
        ehHTTPS: typeof window !== 'undefined' && window.location?.protocol === 'https:',
        ehLocalhost: typeof window !== 'undefined' && (window.location?.hostname === 'localhost' || window.location?.hostname === '127.0.0.1'),
        ehProducao: isProduction,
        ehIframe: ehIframe,
        permissionsPolicy: permissionsPolicy || 'não definido',
        featurePolicy: featurePolicy || 'não definido',
        statusPermissao: permissaoGeolocation,
        url: typeof window !== 'undefined' ? window.location?.href : 'N/A',
        hostname: hostname,
        tentativa: state.attempts + 1,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'
      });
      
      // Verificar se estamos em um iframe e se isso pode estar bloqueando
      if (ehIframe) {
        console.debug('[DEBUG] Executando em um iframe, o que pode restringir a geolocalização');
        
        // Tenta uma abordagem específica para iframes
        try {
          console.debug('[DEBUG] Tentando abordar específica para iframe...');
          // Tenta forçar a permissão usando uma abordagem alternativa
          if (typeof document !== 'undefined') {
            // Verifica se o documento pai permite a incorporação
            const parentDocumentDomain = document.referrer ? new URL(document.referrer).hostname : null;
            console.debug('[DEBUG] Domínio do documento pai:', parentDocumentDomain);
            
            // Verifica se o Origin-Agent-Cluster está ativado
            const originAgentCluster = (window as any).originAgentCluster;
            console.debug('[DEBUG] Origin-Agent-Cluster:', originAgentCluster);
          }
        } catch (err) {
          console.debug('[DEBUG] Erro na abordagem específica para iframe:', err);
        }
      }
      
      try {
        console.debug('[DEBUG] Iniciando solicitação de geolocalização do navegador...');
        
        // Solicita a localização do navegador com abordagem melhorada
        const geolocationPromise = new Promise<GeolocationPosition>((resolve, reject) => {
          // ID do watcher para limpar após uso
          let watchId: number | null = null;
          
          // Timer para timeout
          const timeoutId = setTimeout(() => {
            console.debug('[DEBUG] Timeout da geolocalização atingido');
            if (watchId !== null) {
              navigator.geolocation.clearWatch(watchId);
            }
            reject(new Error('Timeout da geolocalização'));
          }, LOCATION_TIMEOUT);
          
          // Success handler
          const onSuccess = (position: GeolocationPosition) => {
            console.debug('[DEBUG] Geolocalização obtida com sucesso:', {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy
            });
            clearTimeout(timeoutId);
            if (watchId !== null) {
              navigator.geolocation.clearWatch(watchId);
            }
            resolve(position);
          };
          
          // Error handler
          const onError = (error: GeolocationPositionError) => {
            console.debug('[DEBUG] Erro na API de geolocalização:', {
              codigo: error.code,
              mensagem: error.message
            });
            clearTimeout(timeoutId);
            if (watchId !== null) {
              navigator.geolocation.clearWatch(watchId);
            }
            reject(error);
          };
          
          // Tenta primeiro getCurrentPosition
          console.debug('[DEBUG] Chamando getCurrentPosition...');
          navigator.geolocation.getCurrentPosition(
            onSuccess,
            (error) => {
              console.debug('[DEBUG] getCurrentPosition falhou, tentando watchPosition:', error);
              
              // Se getCurrentPosition falhar, tenta watchPosition como backup
              watchId = navigator.geolocation.watchPosition(
                onSuccess,
                onError,
                { 
                  maximumAge: 30000, // 30 segundos
                  timeout: LOCATION_TIMEOUT - 1000, // 1 segundo a menos que o timeout geral
                  enableHighAccuracy: true // Tentar obter localização de alta precisão
                }
              );
            },
            { 
              maximumAge: 60000, // 1 minuto
              timeout: LOCATION_TIMEOUT - 2000, // 2 segundos a menos que o timeout geral
              enableHighAccuracy: true // Tentar obter localização de alta precisão 
            }
          );
        });
        
        console.debug('[DEBUG] Aguardando resultado da geolocalização...');
        const position = await geolocationPromise;
        
        console.debug('[DEBUG] Posição obtida do navegador, atualizando estado');
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          loading: false,
          source: 'browser',
          errorCode: undefined,
          timestamp: position.timestamp,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          lastAttempt: now,
          attempts: state.attempts + 1,
          cooldown: false,
        });
        
        console.debug('[DEBUG] Usando localização do navegador com sucesso');
        return;
        
      } catch (err) {
        // Se houver erro, registra o erro e continua para o fallback
        console.debug('[DEBUG] Erro ao obter localização do navegador, usando fallback', err);
        
        // Identifica o tipo de erro para logging
        let errorMessage = 'Erro desconhecido';
        let errorCode = 0;
        
        if (err instanceof GeolocationPositionError) {
          errorCode = err.code;
          
          switch (err.code) {
            case 1:
              errorMessage = 'Permissão negada';
              break;
            case 2:
              errorMessage = 'Posição indisponível';
              break;
            case 3:
              errorMessage = 'Timeout';
              break;
          }
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }
        
        // Registra o erro específico para depuração
        console.debug(`[DEBUG] Erro de geolocalização: ${errorMessage} (código: ${errorCode})`);
      }
    } else if (state.attempts >= MAX_ATTEMPTS_BROWSER) {
      console.debug(`[DEBUG] Máximo de tentativas (${MAX_ATTEMPTS_BROWSER}) do navegador atingido, usando apenas fallback`);
    }
    
    // Fallback - usar IP
    try {
      const fallback = await getLocationByIP();
      if (fallback) {
        setState({
          latitude: fallback.latitude,
          longitude: fallback.longitude,
          error: null,
          loading: false,
          source: 'ip',
          timestamp: now,
          accuracy: undefined,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          lastAttempt: now,
          attempts: state.attempts + 1,
          cooldown: false,
        });
        console.debug('[DEBUG] Usando localização padrão com sucesso');
      } else {
        setState(prev => ({
          ...prev,
          error: 'Erro ao obter localização',
          loading: false,
          cooldown: false
        }));
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: 'Erro no fallback',
        loading: false,
        cooldown: false
      }));
    }
  }, [state.latitude, state.longitude, state.loading, state.lastAttempt, state.attempts, state.cooldown]);

  useEffect(() => {
    // Inicializa a geolocalização imediatamente
    requestGeolocation();
    
    // Limpa o estado de cooldown caso a componente seja desmontada
    return () => {
      // Limpeza caso seja necessário
    };
  }, [requestGeolocation]);

  return {
    ...state,
    requestGeolocation,
  };
}
