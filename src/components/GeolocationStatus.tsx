import React, { useState, useEffect } from 'react';
import { useGeolocation, PermissionStatus } from '../hooks/use-geolocation'; // Ajuste o caminho se necessário
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { MapPin } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

/**
 * Componente minimalista que exibe o status atual da geolocalização
 * abaixo da barra de pesquisa, ocultando-se quando há resultados de pesquisa.
 */
export function GeolocationStatus() {
  const {
    loading,
    source, // 'browser', 'ip', ou undefined/null
    permissionStatus, // Objeto/Enum como PermissionStatus.GRANTED, DENIED, PROMPT
    error,   // String de erro ou null
    addressLine, // Linha de endereço (rua mais próxima)
    setCustomLocation // Função para definir uma localização personalizada
  } = useGeolocation();

  // Estado para verificar se há resultados de pesquisa ativos
  const [hasSearchResults, setHasSearchResults] = useState(false);
  
  // Estado para controlar o diálogo de localização
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  
  // Estado para controlar o carregamento durante as buscas
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(false);
  
  const { toast } = useToast();

  // --- Efeito para observar resultados de pesquisa ---
  useEffect(() => {
    // Observador para detectar mudanças no DOM e verificar a lista de resultados.
    // ATENÇÃO: Observar 'document.body' com 'subtree: true' pode ter
    //          impacto na performance em páginas muito complexas.
    //          Considere observar um container mais específico se possível.
    const observer = new MutationObserver(() => {
      // Tenta encontrar o container de resultados pela classe.
      // Idealmente, use um seletor mais robusto (ex: data-testid) se possível.
      const resultsContainer = document.querySelector('.results-list');
      if (resultsContainer) {
        // Se encontrou a lista, verifica se ela tem elementos filhos (resultados)
        setHasSearchResults(resultsContainer.children.length > 0);
      } else {
        // Se não encontrou a lista, assume que não há resultados
        setHasSearchResults(false);
      }
    });

    // Inicia a observação no corpo do documento
    observer.observe(document.body, {
      childList: true, // Observa adição/remoção de nós filhos
      subtree: true,   // Observa toda a subárvore
      attributes: false, // Não observa atributos
      characterData: false // Não observa mudanças no texto
    });

    // Função de limpeza: desconecta o observador quando o componente desmontar
    return () => observer.disconnect();
  }, []); // Array de dependências vazio, executa apenas na montagem/desmontagem

  // --- Determina a cor e o texto do indicador ---
  let statusColor = 'bg-gray-400'; // Cor padrão (cinza)
  let statusText = 'Localização desconhecida';

  if (loading) {
    statusColor = 'bg-amber-400'; // Amarelo
    statusText = 'Localizando...';
  } else if (error) {
    statusColor = 'bg-red-400';   // Vermelho
    statusText = 'Erro de localização';
  } else if (permissionStatus === PermissionStatus.DENIED) {
    statusColor = 'bg-red-400';   // Vermelho
    statusText = 'Permissão negada';
  } else if (source === 'browser') {
    statusColor = 'bg-green-400'; // Verde
    // Independente de ter rua ou não, mostrar Localização precisa
    statusText = 'Localização precisa';
  } else if (source === 'ip') {
    statusColor = 'bg-blue-400';  // Azul
    // Mantém apenas "Localização aproximada" sem adicionar o endereço
    statusText = 'Localização aproximada';
  }
  // Nota: Outros estados de permissão (GRANTED, PROMPT) são cobertos implicitamente
  //       pela lógica de 'source' e 'loading'.

  // --- Renderização ---

  // Se houver resultados de pesquisa visíveis, não renderiza o indicador
  if (hasSearchResults) {
    return null;
  }

  // Função para buscar localização por CEP
  const handleLocationFromCep = async () => {
    if (!cep) {
      toast({
        title: "CEP obrigatório",
        description: "Por favor, informe um CEP para buscar",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoadingCep(true);
      
      // Limpar o CEP para ficar apenas com números
      const cleanCep = cep.replace(/\D/g, '');
      
      // Validar o CEP (deve ter 8 dígitos)
      if (cleanCep.length !== 8) {
        toast({
          title: "CEP inválido",
          description: "O CEP deve conter 8 dígitos",
          variant: "destructive"
        });
        setLoadingCep(false);
        return;
      }
      
      // Endpoint do ViaCEP - API pública e gratuita para consulta de CEPs brasileiros
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast({
          title: "CEP não encontrado",
          description: "Não foi possível encontrar este CEP. Verifique se está correto.",
          variant: "destructive"
        });
        setLoadingCep(false);
        return;
      }
      
      // Buscar as coordenadas do endereço usando a API Nominatim do OpenStreetMap
      // Esta é uma API de geocoding gratuita que não requer API key
      const geocodeResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?street=${encodeURIComponent(data.logradouro || '')}&city=${encodeURIComponent(data.localidade)}&state=${encodeURIComponent(data.uf)}&country=Brazil&format=json&limit=1`,
        {
          headers: {
            'User-Agent': 'Saviana Location Search App' // Nominatim requer um User-Agent
          }
        }
      );
      
      const geocodeData = await geocodeResponse.json();
      
      if (geocodeData && geocodeData.length > 0) {
        const { lat, lon } = geocodeData[0];
        
        // Formatamos o endereço para display
        const addressDisplay = `${data.logradouro || ''}, ${data.bairro || ''}, ${data.localidade}-${data.uf}`;
        
        // Chamamos a função de set custom location
        setCustomLocation(parseFloat(lat), parseFloat(lon), addressDisplay);
        
        // Fechamos o diálogo
        setDialogOpen(false);
        
        toast({
          title: "Localização atualizada",
          description: `Localização definida para: ${addressDisplay}`,
          variant: "default"
        });
      } else {
        toast({
          title: "Endereço não localizado",
          description: "Não foi possível obter coordenadas para este CEP",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao buscar localização:', error);
      toast({
        title: "Erro ao buscar localização",
        description: "Ocorreu um erro ao tentar buscar as coordenadas deste CEP",
        variant: "destructive"
      });
    } finally {
      setLoadingCep(false);
    }
  };
  
  // Função para buscar localização por endereço
  const handleLocationFromAddress = async () => {
    if (!address) {
      toast({
        title: "Endereço obrigatório",
        description: "Por favor, informe um endereço para buscar",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setLoadingAddress(true);
      
      // Buscar as coordenadas do endereço usando a API Nominatim do OpenStreetMap
      const geocodeResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
        {
          headers: {
            'User-Agent': 'Saviana Location Search App' // Nominatim requer um User-Agent
          }
        }
      );
      
      const geocodeData = await geocodeResponse.json();
      
      if (geocodeData && geocodeData.length > 0) {
        const { lat, lon, display_name } = geocodeData[0];
        
        // Chamamos a função de set custom location
        setCustomLocation(parseFloat(lat), parseFloat(lon), display_name);
        
        // Fechamos o diálogo
        setDialogOpen(false);
        
        toast({
          title: "Localização atualizada",
          description: `Localização definida para: ${display_name}`,
          variant: "default"
        });
      } else {
        toast({
          title: "Endereço não encontrado",
          description: "Não foi possível encontrar as coordenadas para este endereço",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao buscar localização:', error);
      toast({
        title: "Erro ao buscar localização",
        description: "Ocorreu um erro ao tentar buscar as coordenadas deste endereço",
        variant: "destructive"
      });
    } finally {
      setLoadingAddress(false);
    }
  };

  return (
    <>
      <div
        className="flex justify-center items-center mt-1 mb-6"
        // Acessibilidade: Informa que a região contém status e que atualizações devem ser anunciadas
        role="status"
        aria-live="polite"
        onClick={() => setDialogOpen(true)}
      >
        <div className="relative inline-flex items-center cursor-pointer hover:opacity-80 transition-opacity">
          {/* Indicador visual (círculo colorido) */}
          <div
            className={`
              ${statusColor}
              w-2 h-2           
              rounded-full      
              transition-colors duration-300 
              ${loading ? 'animate-pulse' : ''} 
            `}
            aria-hidden="true" // Esconde o círculo decorativo de leitores de tela
          />

          {/* Texto minimalista ao lado do indicador (fonte reduzida para 8px) */}
          <span className="ml-1.5 text-[8px] text-gray-500 select-none"> 
            {statusText}
          </span>
        </div>
      </div>
      
      {/* Diálogo para definir localização personalizada */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Definir localização</DialogTitle>
            <DialogDescription>
              Digite seu CEP ou endereço para buscarmos estabelecimentos próximos de você.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="cep" className="text-right text-sm font-medium col-span-1">
                CEP
              </label>
              <div className="col-span-3 flex gap-2">
                <Input
                  id="cep"
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  placeholder="Ex: 01310-200"
                  className="col-span-2"
                  maxLength={9}
                />
                <Button 
                  onClick={handleLocationFromCep}
                  className="whitespace-nowrap"
                  size="sm"
                  disabled={loadingCep || loadingAddress}
                >
                  {loadingCep ? (
                    <>
                      <span className="h-4 w-4 mr-1 animate-spin inline-block rounded-full border-2 border-current border-t-transparent" />
                      Buscando...
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4 mr-1" />
                      Buscar
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="address" className="text-right text-sm font-medium col-span-1">
                Endereço
              </label>
              <div className="col-span-3 flex gap-2">
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex: Av Paulista, São Paulo, SP"
                  className="col-span-2"
                />
                <Button 
                  onClick={handleLocationFromAddress}
                  className="whitespace-nowrap"
                  size="sm"
                  disabled={loadingCep || loadingAddress}
                >
                  {loadingAddress ? (
                    <>
                      <span className="h-4 w-4 mr-1 animate-spin inline-block rounded-full border-2 border-current border-t-transparent" />
                      Buscando...
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4 mr-1" />
                      Buscar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDialogOpen(false)}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// --- Definição de Exemplo (se não vier do hook) ---
// Remova ou ajuste isso conforme a implementação real do seu hook
/*
const PermissionStatus = {
  GRANTED: 'granted',
  DENIED: 'denied',
  PROMPT: 'prompt'
};

// Hook de Exemplo (simulação para teste, substitua pelo seu real)
const useGeolocation = () => {
  // Simule diferentes estados para testar:
  // return { loading: true, source: undefined, permissionStatus: undefined, error: null };
  // return { loading: false, source: 'browser', permissionStatus: PermissionStatus.GRANTED, error: null };
  // return { loading: false, source: 'ip', permissionStatus: PermissionStatus.GRANTED, error: null };
   return { loading: false, source: undefined, permissionStatus: PermissionStatus.DENIED, error: null };
  // return { loading: false, source: undefined, permissionStatus: undefined, error: new Error("Falha ao obter localização") };
  // return { loading: false, source: undefined, permissionStatus: undefined, error: null }; // Estado desconhecido
};
*/