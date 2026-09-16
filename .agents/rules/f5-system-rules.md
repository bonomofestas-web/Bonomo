# Regras de Desenvolvimento • F5 System

## Regra Fundamental 1: Consulta Prévia ao Arquivo Mestre
Antes de iniciar qualquer planejamento, refatoração, criação de componente ou alteração de código, você **DEVE** consultar o arquivo mestre:
- [F5_SYSTEM_MASTER.md](file:///c:/Users/--/OneDrive/Documents/Codex%20Projetos/Bonomo%20Festas%202/F5_SYSTEM_MASTER.md)

Nenhuma tarefa deve ser executada sem levar em conta a visão do produto, a arquitetura multi-unidades (`multi-venues`) e os módulos já desenvolvidos.

## Regra Fundamental 2: Nomenclatura Oficial do Sistema
- O nome deste sistema/ERP é **F5 System** (inspirado na tecla F5 de atualização e agilidade).
- **PROIBIDO** nomear o sistema, páginas administrativas, títulos ou menus globais como "Bonomo Festas" ou qualquer outro nome de cliente/casa de festa.
- "Bonomo Festas" é apenas **uma casa/unidade cliente cadastrada no banco de dados (`venues`)**, jamais a marca do software.

## Regra Fundamental 3: Arquitetura Multi-Casas (Multi-Venues)
- O F5 System atende donos de redes de casas de festas (geralmente possuem de 2 a 5+ unidades com equipes comerciais e de pós-venda compartilhadas).
- Sempre considere que um colaborador pode ter acesso a múltiplas casas (`venueIds: string[]`), enquanto registros de CRM, tarefas específicas e metas pertencem a uma unidade determinada (`venueId: string`).

## Regra Fundamental 4: Integridade do Código
- Execute sempre `npm run build` para garantir que não existem erros de TypeScript ou quebras no Vite bundle.
- Nunca insira mocks estáticos em código de produção: use o Supabase e os serviços em `src/services/`.

## Regra Fundamental 5: Testes Visuais e de Interface Conduzidos pelo Usuário
- **PROIBIDO** o agente abrir o navegador de forma autônoma (via subagente de browser) para testar telas sem solicitação expressa do usuário.
- O fluxo de testes de tela, responsividade e formulários é **sempre conduzido pelo USUÁRIO**.
- O agente deve fornecer as orientações detalhadas (URL local, credenciais de acesso, fluxo passo a passo) e aguardar o feedback do usuário.

## Regra Fundamental 6: Isolamento Seguro do Cloudflare R2
- Todo upload em ambiente local de desenvolvimento é prefixado automaticamente com `local_dev/` (via middleware do Vite em `vite.config.ts`).
- Arquivos de produção na raiz do bucket (`brand/`, `videos/`, `avatars/`, `images/`) são protegidos e intocáveis em desenvolvimento.
- A purga e liberação de espaço de mídias de teste é executada de forma automatizada com `npm run cleanup:r2`.
