// Este arquivo é usado para configurar variáveis de ambiente no frontend
// e garantir que as chaves de API sejam substituídas corretamente

export const setupEnvironmentVars = () => {
  // Obtém a chave da API do Google Maps da variável de ambiente
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY || '';
  
  // Procura o script do Google Maps e atualiza a URL com a chave correta
  const googleMapsScript = document.getElementById('google-maps-script') as HTMLScriptElement;
  if (googleMapsScript) {
    const currentSrc = googleMapsScript.src;
    const newSrc = currentSrc.replace('%VITE_GOOGLE_PLACES_API_KEY%', googleMapsApiKey);
    
    // Só atualiza se for necessário para evitar recarregar o script
    if (currentSrc !== newSrc) {
      googleMapsScript.src = newSrc;
    }
  }
  
  console.log('Ambiente configurado com sucesso!');
};