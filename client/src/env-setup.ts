// Este arquivo é usado para configurar variáveis de ambiente no frontend
// e garantir que as chaves de API sejam carregadas de forma segura

export const setupEnvironmentVars = () => {
  // Obtém a chave da API do Google Maps da variável de ambiente
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY || '';
  
  // Verifica se a chave está definida
  if (!googleMapsApiKey) {
    console.warn('AVISO: VITE_GOOGLE_PLACES_API_KEY não está definida. O Google Maps pode não funcionar corretamente.');
  }
  
  // Cria e adiciona o script do Google Maps dinamicamente
  const script = document.createElement('script');
  script.id = 'google-maps-script';
  script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places`;
  script.async = true;
  script.defer = true;
  
  // Adiciona ao head
  document.head.appendChild(script);
  
  // Registra a base URL para debug
  console.log(`Ambiente: ${import.meta.env.DEV ? 'Desenvolvimento' : 'Produção'}`);
  console.log(`Base path: ${import.meta.env.BASE_URL}`);
  console.log('Ambiente configurado com sucesso!');
};