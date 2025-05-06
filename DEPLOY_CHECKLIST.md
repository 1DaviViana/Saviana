# Checklist de Deploy para Railway

Use esta checklist para garantir que seu deploy na Railway será bem-sucedido.

## Configuração do Projeto

- [ ] Código fonte está atualizado no repositório Git
- [ ] Os arquivos especiais para compatibilidade com Railway estão presentes:
  - [ ] `server/staticServe.ts`
  - [ ] `build.js`
  - [ ] `railway.toml`
- [ ] CORS está configurado para permitir domínios Railway e personalizados
- [ ] A rota de health check (`/api/health`) está funcionando corretamente

## Variáveis de Ambiente

- [ ] `OPENAI_API_KEY` está configurada
- [ ] `NODE_ENV` está definido como "production"
- [ ] Outras variáveis específicas do projeto estão configuradas

## Testes Pré-Deploy

- [ ] A aplicação executa localmente em modo de produção:
  ```
  NODE_ENV=production node build.js
  NODE_ENV=production node dist/index.js
  ```
- [ ] API endpoints estão funcionando corretamente
- [ ] Frontend está sendo servido corretamente em modo de produção
- [ ] Funcionalidades críticas foram testadas

## Deployment na Railway

- [ ] Projeto foi criado na plataforma Railway
- [ ] Repositório Git foi conectado
- [ ] Variáveis de ambiente foram configuradas
- [ ] Deploy inicial foi realizado com sucesso
- [ ] Health check está passando

## Monitoramento Pós-Deploy

- [ ] Aplicação está acessível pelo URL fornecido
- [ ] Logs mostram inicialização sem erros
- [ ] Requisições de API estão sendo processadas corretamente
- [ ] Frontend está sendo carregado corretamente
- [ ] Funcionalidades críticas estão operacionais no ambiente de produção

## Validação Final

- [ ] Verificação de performance com ferramentas como Lighthouse
- [ ] Teste de fluxos completos do usuário no ambiente de produção
- [ ] Confirmação de que todas as integrações externas estão funcionando

---

Data de último deploy: ________________

URL da aplicação: ____________________

Responsável pelo deploy: _____________