# Instruções de Deployment para Railway

Este documento descreve como fazer o deploy do projeto na plataforma Railway.

## Preparação para Deploy

### 1. Verificar Dependências

Certifique-se de que todas as dependências necessárias estão instaladas no projeto:

```bash
npm install
```

### 2. Verificar Arquivos no Repositório

Para que o deploy funcione corretamente, você deve ter os seguintes arquivos em seu repositório:

- `build.js` - Script customizado para build
- `server/staticServe.ts` - Implementação segura para servir arquivos estáticos
- `railway.toml` - Configuração específica para Railway

### 3. Variáveis de Ambiente

Configure as seguintes variáveis de ambiente no seu projeto Railway:

- `OPENAI_API_KEY`: Sua chave de API da OpenAI
- `NODE_ENV`: Defina como "production"
- `PORT`: Railway irá fornecer esta variável automaticamente

Você pode usar o arquivo `.env.example` como modelo para configurar suas variáveis de ambiente.

### 4. Configuração do Railway

1. Certifique-se de que o Railway está configurado para usar Node.js 18.x (conforme definido no railway.toml)
2. Siga estas etapas para configurar seu projeto no Railway:
   - Faça login no Railway
   - Clique em "New Project"
   - Selecione "Deploy from GitHub"
   - Conecte seu repositório GitHub
   - Configure as variáveis de ambiente

## Processo de Build e Start

O processo de build usa os seguintes scripts:

```json
"build": "node build.js",
"start": "NODE_ENV=production node dist/index.js"
```

O script `build.js` faz o seguinte:

1. Cria os diretórios necessários
2. Compila o frontend com Vite
3. Compila o backend com esbuild
4. Cria um arquivo `.nojekyll` para GitHub Pages (se necessário)

## Troubleshooting

### Erro: "The 'paths[0]' argument must be of type string. Received undefined"

Este erro ocorre devido a problemas com `import.meta.dirname` em Node.js no ambiente de produção. A solução foi implementada usando um método de compatibilidade com `fileURLToPath`.

### CORS e Domínios Permitidos

Se você estiver usando um domínio personalizado, certifique-se de adicioná-lo à lista de domínios permitidos no arquivo `server/index.ts`.

## Estrutura de Arquivos de Build

Após a compilação, a seguinte estrutura será criada:

```
/dist
  /public           # Arquivos estáticos do frontend (compilados pelo Vite)
    index.html
    assets/
    .nojekyll       # Arquivo para GitHub Pages
  index.js          # Código backend compilado
```