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
  addressLine?: string; // Linha do endereço (rua mais próxima)
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
  NONE = 'none'
}

// Configurações do debounce e timeout
const DEBOUNCE_INTERVAL = 5000; // 5 segundos entre tentativas (reduzido para melhor experiência do usuário)
const LOCATION_TIMEOUT = 15000; // 15 segundos para timeout da geolocalização (reduzido para evitar esperas longas)
const MAX_ATTEMPTS_BROWSER = 2; // Número máximo de tentativas para o navegador antes de usar fallback

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
        
        // Solicita a localização do navegador com abordagem melhorada e aprimorada
        const geolocationPromise = new Promise<GeolocationPosition>((resolve, reject) => {
          let watchId: number | null = null;
          let isResolved = false; // Flag para controlar se a Promise já foi resolvida
          
          // Timer para timeout global
          const timeoutId = setTimeout(() => {
            if (!isResolved) {
              console.debug('[DEBUG] Timeout global da geolocalização atingido');
              isResolved = true;
              
              // Limpa todos os listeners e watches pendentes
              if (watchId !== null) {
                try {
                  navigator.geolocation.clearWatch(watchId);
                  watchId = null;
                } catch (e) {
                  console.debug('[DEBUG] Erro ao limpar watch:', e);
                }
              }
              
              reject(new Error('Timeout da geolocalização'));
            }
          }, LOCATION_TIMEOUT);
          
          // Success handler - comum para ambos os métodos
          const onSuccess = (position: GeolocationPosition) => {
            if (!isResolved) {
              console.debug('[DEBUG] Geolocalização obtida com sucesso:', {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy
              });
              
              isResolved = true;
              
              // Limpa o timeout e watch
              clearTimeout(timeoutId);
              if (watchId !== null) {
                try {
                  navigator.geolocation.clearWatch(watchId);
                  watchId = null;
                } catch (e) {
                  console.debug('[DEBUG] Erro ao limpar watch após sucesso:', e);
                }
              }
              
              resolve(position);
            }
          };
          
          // Error handler - comum para ambos os métodos
          const onError = (error: GeolocationPositionError) => {
            if (!isResolved) {
              console.debug('[DEBUG] Erro na API de geolocalização:', {
                codigo: error.code,
                mensagem: error.message
              });
              
              // Para erros de permissão, resolvemos imediatamente
              if (error.code === 1) { // PERMISSION_DENIED
                isResolved = true;
                clearTimeout(timeoutId);
                
                if (watchId !== null) {
                  try {
                    navigator.geolocation.clearWatch(watchId);
                    watchId = null;
                  } catch (e) {
                    console.debug('[DEBUG] Erro ao limpar watch após erro de permissão:', e);
                  }
                }
                
                reject(error);
                return;
              }
              
              // Para outros erros, se ainda não estamos usando watchPosition, tentamos esse método como backup
              if (watchId === null) {
                console.debug('[DEBUG] Erro não fatal, tentando watchPosition como backup');
                
                // Não marcamos como isResolved para permitir que o watchPosition tente
                return;
              }
              
              // Se já estamos usando watchPosition e mesmo assim temos erro, desistimos
              isResolved = true;
              clearTimeout(timeoutId);
              
              if (watchId !== null) {
                try {
                  navigator.geolocation.clearWatch(watchId);
                  watchId = null;
                } catch (e) {
                  console.debug('[DEBUG] Erro ao limpar watch após falha:', e);
                }
              }
              
              reject(error);
            }
          };
          
          try {
            // Tenta primeiro getCurrentPosition com timeout menor que o global
            console.debug('[DEBUG] Chamando getCurrentPosition...');
            navigator.geolocation.getCurrentPosition(
              onSuccess,
              (error) => {
                // Se não for erro de permissão e a Promise ainda não foi resolvida, tenta watchPosition
                if (error.code !== 1 && !isResolved) {
                  console.debug('[DEBUG] getCurrentPosition falhou, tentando watchPosition como backup:', error);
                  
                  try {
                    // Se getCurrentPosition falhar mas não for por permissão, tenta watchPosition como backup
                    watchId = navigator.geolocation.watchPosition(
                      onSuccess,
                      onError,
                      { 
                        maximumAge: 10000, // 10 segundos
                        timeout: LOCATION_TIMEOUT - 5000, // 5 segundos a menos que o timeout geral
                        enableHighAccuracy: false // Mantém precisão moderada para melhor performance
                      }
                    );
                  } catch (e) {
                    console.debug('[DEBUG] Erro ao configurar watchPosition:', e);
                    if (!isResolved) {
                      isResolved = true;
                      clearTimeout(timeoutId);
                      reject(new Error('Falha ao configurar geolocalização'));
                    }
                  }
                } else {
                  // Se for erro de permissão, delegamos para o handler de erro
                  onError(error);
                }
              },
              { 
                maximumAge: 30000, // 30 segundos
                timeout: LOCATION_TIMEOUT - 5000, // 5 segundos a menos que o timeout geral
                enableHighAccuracy: false // Precisão moderada para equilíbrio entre exatidão e velocidade
              }
            );
          } catch (e) {
            // Em caso de exceção ao tentar configurar a geolocalização (raro, mas pode acontecer)
            console.debug('[DEBUG] Exceção ao configurar geolocalização:', e);
            if (!isResolved) {
              isResolved = true;
              clearTimeout(timeoutId);
              reject(new Error('Exceção ao iniciar geolocalização'));
            }
          }
        });
        
        console.debug('[DEBUG] Aguardando resultado da geolocalização...');
        const position = await geolocationPromise;
        
        console.debug('[DEBUG] Posição obtida do navegador, atualizando estado');
        
        // Tenta obter o endereço da rua mais próxima
        try {
          // Importação dinâmica para não afetar o carregamento inicial
          const { getNearestAddress } = await import('../lib/geo-fallback');
          const streetAddress = await getNearestAddress(
            position.coords.latitude,
            position.coords.longitude
          );
          
          console.debug('[DEBUG] Endereço mais próximo:', streetAddress || 'Indisponível');
          
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
            addressLine: streetAddress
          });
        } catch (error) {
          console.debug('[DEBUG] Erro ao buscar endereço:', error);
          
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
            permissionStatus
          });
        }
        
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
  const useFallbackLocation = useCallback(async (now: number) => {
    try {
      console.debug('[DEBUG] Iniciando processo de fallback para obter localização por IP');
      const fallback = await getLocationByIP();
      
      if (fallback) {
        console.debug('[DEBUG] Fallback de localização por IP bem-sucedido:', fallback);
        
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
        
        console.debug('[DEBUG] Estado atualizado com localização por IP');
      } else {
        console.debug('[DEBUG] Fallback de localização retornou nulo');
        
        setState(prev => ({
          ...prev,
          error: 'Erro ao obter localização por IP',
          loading: false,
          cooldown: false
        }));
      }
    } catch (err) {
      console.debug('[DEBUG] Erro ao executar fallback de localização:', err);
      
      setState(prev => ({
        ...prev,
        error: 'Erro no sistema de fallback',
        loading: false,
        cooldown: false
      }));
    }
  }, []);

  // Efeito para inicializar a geolocalização ao montar o componente
  useEffect(() => {
    let isMounted = true; // Flag para evitar atualização de estado após desmontagem
    
    const initGeolocation = async () => {
      if (!isMounted) return;
      
      try {
        // Verifica o status da permissão antes de tentar acessar a geolocalização
        const permissionStatus = await checkPermissionStatus();
        
        if (!isMounted) return;
        
        // Atualiza o estado com o status da permissão atual
        setState(prev => ({ ...prev, permissionStatus }));
        
        // Solicita geolocalização apenas se o componente ainda estiver montado
        requestGeolocation();
      } catch (error) {
        console.debug('[DEBUG] Erro ao inicializar geolocalização:', error);
        
        if (!isMounted) return;
        
        // Em caso de erro, vai para o fallback
        setState(prev => ({
          ...prev,
          error: 'Erro ao inicializar geolocalização',
          loading: false
        }));
      }
    };
    
    // Inicia o processo de geolocalização
    initGeolocation();
    
    // Adiciona um listener para mudanças no status de permissão (útil em ambiente de produção)
    let permissionListener: (() => void) | undefined;
    
    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      try {
        navigator.permissions.query({ name: 'geolocation' as PermissionName })
          .then(permissionStatus => {
            if (!isMounted) return;
            
            // Define um callback para mudanças no status de permissão
            const onPermissionChange = () => {
              console.debug('[DEBUG] Status de permissão mudou:', permissionStatus.state);
              if (isMounted) {
                setState(prev => ({ ...prev, permissionStatus: permissionStatus.state as PermissionStatus }));
                
                // Se a permissão foi concedida, tenta obter a localização
                if (permissionStatus.state === 'granted') {
                  requestGeolocation();
                } 
                // Se a permissão foi negada, vai para o fallback
                else if (permissionStatus.state === 'denied') {
                  useFallbackLocation(Date.now());
                }
              }
            };
            
            // Adiciona o listener
            permissionStatus.addEventListener('change', onPermissionChange);
            
            // Armazena a referência para limpar depois
            permissionListener = () => permissionStatus.removeEventListener('change', onPermissionChange);
          })
          .catch(error => {
            console.debug('[DEBUG] Erro ao configurar listener de permissão:', error);
          });
      } catch (error) {
        console.debug('[DEBUG] Erro ao tentar acessar API de permissões:', error);
      }
    }
    
    // Cleanup function
    return () => {
      isMounted = false;
      
      // Remove o listener de permissão se existir
      if (permissionListener) {
        try {
          permissionListener();
        } catch (e) {
          console.debug('[DEBUG] Erro ao remover listener de permissão:', e);
        }
      }
    };
  }, [checkPermissionStatus, requestGeolocation, useFallbackLocation]);

  return {
    ...state,
    requestGeolocation,
  };
}
