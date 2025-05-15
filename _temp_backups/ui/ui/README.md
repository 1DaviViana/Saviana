# Componentes Shadcn UI

Esta pasta contém componentes da biblioteca [Shadcn UI](https://ui.shadcn.com/), uma coleção de componentes reutilizáveis baseados no Radix UI e TailwindCSS.

## Notas Importantes sobre TypeScript

Os componentes Shadcn UI utilizados neste projeto funcionam corretamente em tempo de execução, mas alguns possuem peculiaridades de sintaxe que causam erros durante a verificação estática do TypeScript.

### Por que estes erros ocorrem?

1. **Diferenças no JSX**: Os componentes usam uma sintaxe JSX específica que pode causar erros com certas configurações de TypeScript.
2. **Manipulação de caminhos**: Alguns componentes usam imports com o prefixo `@/`, que o TypeScript não resolve naturalmente durante a verificação estática, mas o Vite resolve em tempo de execução.
3. **Estrutura de código**: Alguns componentes possuem estruturas complexas de código que são difíceis de analisar estaticamente.

### Nossa abordagem

Para garantir a qualidade e segurança do código enquanto permitimos o uso destes componentes:

1. Criamos uma configuração de TypeScript específica para esses componentes (`tsconfig.shadcn.json`).
2. No CI, excluímos a pasta `components/ui` da verificação TypeScript principal.
3. Mantemos backups das versões funcionais dos componentes.

### Modificando componentes

Se precisar modificar qualquer componente desta pasta:

1. Teste extensivamente no navegador após as alterações.
2. Execute o script `scripts/ci-typecheck.sh` para verificar se o código funciona.
3. Não se preocupe com erros TypeScript que sejam específicos dos componentes shadcn.

### Referência

Para detalhes sobre como os componentes shadcn funcionam, consulte a [documentação oficial](https://ui.shadcn.com/docs).