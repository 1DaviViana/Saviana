# Instruções para Publicar no GitHub

Siga estes passos para publicar este projeto no GitHub:

## 1. Crie um Repositório no GitHub

1. Acesse [GitHub](https://github.com) e faça login na sua conta
2. Clique no botão "+" no canto superior direito e selecione "New repository"
3. Dê um nome ao seu repositório (por exemplo, "location-search-engine")
4. Adicione uma descrição: "Buscador de locais com geolocalização avançada e tratamento de erros robusto"
5. Deixe o repositório como público (ou privado, se preferir)
6. Não inicialize o repositório com README, gitignore ou licença (já criamos esses arquivos)
7. Clique em "Create repository"

## 2. Configure o Repositório Local

Após criar o repositório no GitHub, execute os seguintes comandos no terminal:

```bash
# Inicializar um repositório Git local
git init

# Adicionar todos os arquivos (exceto os listados no .gitignore)
git add .

# Verificar quais arquivos serão commitados
git status

# Fazer o commit inicial
git commit -m "Commit inicial"

# Adicionar o repositório remoto (substitua 'seu-usuario' e 'nome-do-repo')
git remote add origin https://github.com/seu-usuario/nome-do-repo.git

# Enviar os arquivos para o GitHub
git push -u origin main
```

## 3. Configuração Adicional no GitHub

Depois que o código estiver no GitHub:

1. Vá para a aba "Settings" do seu repositório
2. Role até a seção "GitHub Pages"
3. Configure para implantar a partir do branch "main" (se desejar hospedar o site)
4. Configure as opções de proteção do branch principal:
   - Vá para Settings > Branches > Add rule
   - Proteja o branch "main" exigindo revisão de pull requests

## 4. Configuração de Segredos (Se Necessário)

Se você estiver usando CI/CD ou precisar armazenar chaves API:

1. Vá para Settings > Secrets and variables > Actions
2. Adicione seus segredos:
   - GOOGLE_MAPS_API_KEY
   - OPENAI_API_KEY

## 5. Convidar Colaboradores (Opcional)

Se você estiver trabalhando em equipe:

1. Vá para Settings > Collaborators
2. Clique em "Add people" e digite o nome de usuário ou email dos colaboradores

## Dicas Importantes

- Nunca envie arquivos .env com chaves reais para o GitHub
- Tenha certeza de que o arquivo .gitignore está corretamente configurado
- Mantenha as dependências atualizadas regularmente
- Use issues para rastrear bugs e novas funcionalidades
- Use pull requests para revisão de código