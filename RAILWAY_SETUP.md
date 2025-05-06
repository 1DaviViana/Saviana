# Preparando seu Projeto para Deploy na Railway

## Pre-requisitos

- Uma conta na [Railway](https://railway.app)
- Um repositório Git com seu projeto (GitHub, GitLab, etc.)
- A chave da API OpenAI (`OPENAI_API_KEY`)

## Passos para Deploy

### 1. Verificar Código Fonte

Antes de prosseguir com o deploy, verifique se seu código fonte inclui:

- O arquivo `server/staticServe.ts` para resolver problemas com `import.meta.dirname` 
- O arquivo `build.js` para processos de build personalizados
- O arquivo `railway.toml` para configuração da Railway

### 2. Configurar na Plataforma Railway

1. Faça login na sua conta Railway
2. Clique em "New Project"
3. Escolha "Deploy from GitHub"
4. Selecione o repositório contendo seu projeto
5. Configure as variáveis de ambiente:
   - `OPENAI_API_KEY`: sua chave API da OpenAI
   - `NODE_ENV`: production

### 3. Detalhes Técnicos Importantes

- A Railway usará o script `npm run build` para construir o projeto
- O servidor será iniciado com `npm run start`
- A aplicação estará disponível no domínio `.railway.app`
- Seu health check está configurado no caminho `/api/health`

### 4. Escalonamento e Recursos

A Railway permite configurar diversos aspectos do deploy:

- CPU e Memória alocadas
- Quantidade de instâncias
- Políticas de redirecionamento
- Domínios personalizados

### 5. Monitoramento e Logs

Após o deploy, você pode monitorar seu aplicativo:

- Visualize logs em tempo real
- Analise métricas de performance
- Configure alertas

## Solução de Problemas Comuns

### O Servidor não Inicia

Verifique se:

1. A variável `OPENAI_API_KEY` está configurada corretamente
2. Os arquivos `staticServe.ts` e `build.js` estão presentes e configurados corretamente
3. Os logs do deploy na Railway para mensagens de erro específicas

### Erros de CORS

Se você encontrar erros de CORS:

1. Verifique a configuração CORS em `server/index.ts`
2. Adicione seu domínio personalizado na lista de origens permitidas
3. Garanta que a configuração inclua o domínio `.railway.app`

### Acesso ao Banco de Dados (Se aplicável)

Para configurar um banco de dados:

1. Adicione um plugin PostgreSQL na Railway
2. Adicione a variável de ambiente `DATABASE_URL` que será automaticamente preenchida pela Railway
3. Configure seu ORM para usar esta URL de conexão