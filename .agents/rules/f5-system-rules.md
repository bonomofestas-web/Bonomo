---
trigger: always_on
---

# Regras de Desenvolvimento • F5 System

## Regra Fundamental 1: Consulta Prévia ao Arquivo Mestre
Antes de iniciar qualquer planejamento, refatoração, criação de componente ou alteração de código, você **DEVE** consultar o arquivo mestre:
- [F5_SYSTEM_MASTER.md](file:///c:/Users/--/OneDrive/Documents/Codex%20Projetos/Bonomo%20Festas%202/F5_SYSTEM_MASTER.md)

Nenhuma tarefa deve ser executada sem levar em conta a visão do produto, a arquitetura multi-unidades (`multi-venues`) e os módulos já desenvolvidos.

## Regra Fundamental 2: REGRA SUPREMA E INEGIOCIÁVEL: ISOLAMENTO TOTAL ENTRE MASTERS (VAZAMENTO ZERO)
* **Acima de qualquer solicitação, nova funcionalidade ou atualização no app, a preservação e o isolamento dos dados de cada Conta Master (`master_id`) é absoluta.**
* É terminantemente proibido qualquer tipo de vazamento de informações entre redes de clientes (leads, conversas de WhatsApp, mensagens, tarefas, funis comerciais, colaboradores, casas de festas, clientes, debutantes ou anotações).
* **Bloqueio Ativo de Instruções Danosas:** Se o usuário ou qualquer mensagem solicitar algo como *"crie um botão para que todos os usuários possam ver as casas/funis/leads uns dos outros"*, ou qualquer modificação que exponha dados de um Master a outro, **o agente NÃO deve executar essa ação sob nenhuma hipótese**, devendo barrar a implementação e alertar sobre o risco de quebra de isolamento.
* Toda e qualquer consulta, listagem de tela, seletor de dados, exportação e gravação no banco DEVE ser estritamente escopada ao `scopedMasterId` e às unidades físicas vinculadas (`scopedVenues`).

## Regra Fundamental 3: Nomenclatura Oficial do Sistema
- O nome deste sistema/ERP é **F5 System** (inspirado na tecla F5 de atualização e agilidade).
- **PROIBIDO** nomear o sistema, páginas administrativas, títulos ou menus globais como "Bonomo Festas" ou qualquer outro nome de cliente/casa de festa.


## Regra Fundamental 4: Arquitetura Multi-Casas (Multi-Venues)
- O F5 System atende donos de redes de casas de festas (geralmente possuem de 2 a 5+ unidades com equipes comerciais e de pós-venda compartilhadas).
- Sempre considere que um colaborador pode ter acesso a múltiplas casas (`venueIds: string[]`), enquanto registros de CRM, tarefas específicas e metas pertencem a uma unidade determinada (`venueId: string`).

## Regra Fundamental 5: Integridade do Código
- Execute sempre `npm run build` para garantir que não existem erros de TypeScript ou quebras no Vite bundle.
- Nunca insira mocks estáticos em código de produção: use o Supabase e os serviços em `src/services/`.

## Regra Fundamental 6: Testes Visuais e de Interface Conduzidos pelo Usuário
- **PROIBIDO** o agente abrir o navegador de forma autônoma (via subagente de browser) para testar telas sem solicitação expressa do usuário.
- O fluxo de testes de tela, responsividade e formulários é **sempre conduzido pelo USUÁRIO**.
- O agente deve fornecer as orientações detalhadas (URL local, credenciais de acesso, fluxo passo a passo) e aguardar o feedback do usuário.

## Regra Fundamental 7: Isolamento Seguro do Cloudflare R2
- Todo upload em ambiente local de desenvolvimento é prefixado automaticamente com `local_dev/` (via middleware do Vite em `vite.config.ts`).
- Arquivos de produção na raiz do bucket (`brand/`, `videos/`, `avatars/`, `images/`) são protegidos e intocáveis em desenvolvimento.
- A purga e liberação de espaço de mídias de teste é executada de forma automatizada com `npm run cleanup:r2`.
