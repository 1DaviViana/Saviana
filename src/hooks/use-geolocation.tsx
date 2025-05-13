import React, { useState, useEffect, useCallback } from 'react';
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
  permissionStatus: 'granted' | 'denied' | 'prompt' | 'unknown';
}

// Enum para status das permissões
export enum PermissionStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  PROMPT = 'prompt',
  UNKNOWN = 'unknown'
}

// Enum para fontes de localização
export enum LocationSource {
  BROWSER = 'browser',
  IP = 'ip',
  NONE = null
}

// Configurações do debounce e timeout
const DEBOUNCE_INTERVAL = 10000; // 10 segundos entre tentativas
const LOCATION_TIMEOUT = 30000; // 30 segundos para timeout da geolocalização
const MAX_ATTEMPTS_BROWSER = 3; // Número máximo de tentativas para o navegador

/**
 * Hook personalizado para gerenciar geolocalização com verificação inteligente de permissões
 * e fallback para localização por IP quando necessário.
 * 
 * @returns Estado da geolocalização e função para solicitá-la novamente
 */
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
    permissionStatus: 'unknown',
  });

  /**
   * Verifica o status atual da permissão de geolocalização
   * @returns Promise com o status da permissão
   */
  const checkPermissionStatus = useCallback(async (): Promise<PermissionStatus> => {
    if (typeof navigator === 'undefined' || !('permissions' in navigator)) {
      return PermissionStatus.UNKNOWN;
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      return permission.state as PermissionStatus;
    } catch (err) {
      console.debug('[DEBUG] Erro ao verificar permissão:', err);
      return PermissionStatus.UNKNOWN;
    }
  }, []);

  /**
   * Solicita a geolocalização do usuário, verificando primeiro as permissões
   * e utilizando fallback quando necessário
   */
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

    // Verifica permissões antes de tentar acessar a geolocalização
    const permissionStatus = await checkPermissionStatus();
    console.debug('[DEBUG] Status da permissão de geolocalização:', permissionStatus);
    
    // Atualiza o estado com o status da permissão
    setState(prev => ({ 
      ...prev, 
      permissionStatus 
    }));

    // Se a permissão foi negada, vai direto para o fallback
    if (permissionStatus === PermissionStatus.DENIED) {
      console.debug('[DEBUG] Permissão de geolocalização negada. Usando fallback imediatamente.');
      await useFallbackLocation(now);
      return;
    }

    // Tenta usar a geolocalização do navegador primeiro se a permissão for concedida ou se for prompt
    if (typeof navigator !== 'undefined' && 
        'geolocation' in navigator && 
        state.attempts < MAX_ATTEMPTS_BROWSER && 
        (permissionStatus === PermissionStatus.GRANTED || permissionStatus === PermissionStatus.PROMPT)
       ) {
      
      // Diagnóstico do ambiente para debug
      const ehIframe = typeof window !== 'undefined' && window.self !== window.top;
      const permissionsPolicy = typeof document !== 'undefined' ? 
        document.querySelector('meta[http-equiv="Permissions-Policy"]')?.getAttribute('content') : null;
      const featurePolicy = typeof document !== 'undefined' ? 
        document.querySelector('meta[http-equiv="Feature-Policy"]')?.getAttribute('content') : null;
      const hostname = typeof window !== 'undefined' ? window.location?.hostname : 'N/A';
      const isProduction = hostname === 'www.saviana.com.br' || hostname === 'saviana.com.br';
      
      // Log detalhado de diagnóstico
      console.debug('[DEBUG] Verificando suporte a geolocalização:', {
        navegadorSuportado: typeof navigator !== 'undefined',
        apiDisponivel: typeof navigator !== 'undefined' && 'geolocation' in navigator,
        ehHTTPS: typeof window !== 'undefined' && window.location?.protocol === 'https:',
        ehLocalhost: typeof window !== 'undefined' && (window.location?.hostname === 'localhost' || window.location?.hostname === '127.0.0.1'),
        ehProducao: isProduction,
        ehIframe: ehIframe,
        permissionsPolicy: permissionsPolicy || 'não definido',
        featurePolicy: featurePolicy || 'não definido',
        statusPermissao: permissionStatus,
        url: typeof window !== 'undefined' ? window.location?.href : 'N/A',
        hostname: hostname,
        tentativa: state.attempts + 1,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'
      });
      
      // Verificar se estamos em um iframe e se isso pode estar bloqueando
      if (ehIframe) {
        console.debug('[DEBUG] Executando em um iframe, o que pode restringir a geolocalização');
        try {
          console.debug('[DEBUG] Tentando abordar específica para iframe...');
          if (typeof document !== 'undefined') {
            const parentDocumentDomain = document.referrer ? new URL(document.referrer).hostname : null;
            console.debug('[DEBUG] Domínio do documento pai:', parentDocumentDomain);
            
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
          let watchId: number | null = null;
          
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
                  timeout: LOCATION_TIMEOUT - 10000, // 10 segundos a menos que o timeout geral
                  enableHighAccuracy: false // Precisão moderada para equilíbrio entre exatidão e velocidade
                }
              );
            },
            { 
              maximumAge: 60000, // 1 minuto
              timeout: LOCATION_TIMEOUT - 10000, // 10 segundos a menos que o timeout geral
              enableHighAccuracy: false // Precisão moderada para equilíbrio entre exatidão e velocidade
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
          permissionStatus,
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
              // Atualiza o status de permissão se for erro de permissão
              setState(prev => ({ ...prev, permissionStatus: PermissionStatus.DENIED }));
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
    
    // Utiliza o fallback se a geolocalização do navegador falhar
    await useFallbackLocation(now);
    
  }, [state.latitude, state.longitude, state.loading, state.lastAttempt, state.attempts, state.cooldown, state.permissionStatus, checkPermissionStatus]);

  /**
   * Função auxiliar para utilizar a localização de fallback (baseada em IP)
   * @param now Timestamp atual
   */
  const useFallbackLocation = async (now: number) => {
    try {
      const fallback = await getLocationByIP();
      if (fallback) {
        setState(prev => ({
          ...prev,
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
          attempts: prev.attempts + 1,
          cooldown: false,
        }));
        console.debug('[DEBUG] Usando localização por IP com sucesso');
      } else {
        setState(prev => ({
          ...prev,
          error: 'Erro ao obter localização por IP',
          loading: false,
          cooldown: false
        }));
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: 'Erro no sistema de fallback',
        loading: false,
        cooldown: false
      }));
    }
  };

  // Efeito para inicializar a geolocalização ao montar o componente
  useEffect(() => {
    const initGeolocation = async () => {
      // Verifica o status da permissão antes de tentar acessar a geolocalização
      const permissionStatus = await checkPermissionStatus();
      setState(prev => ({ ...prev, permissionStatus }));
      
      // Solicita geolocalização
      requestGeolocation();
    };
    
    initGeolocation();
    
    return () => {
      // Limpeza caso seja necessário
    };
  }, [checkPermissionStatus, requestGeolocation]);

  return {
    ...state,
    requestGeolocation,
  };
}
