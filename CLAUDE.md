# CLAUDE.md — F5 System

ERP multi-tenant para redes de casas de festas. O nome do sistema é **F5 System**; "Bonomo Festas" é apenas uma unidade (`venues`) no banco.

Leitura obrigatória antes de qualquer mudança relevante: [AGENTS.md](AGENTS.md) e [F5_SYSTEM_MASTER.md](F5_SYSTEM_MASTER.md). Este arquivo é um resumo operacional, não os substitui.

## Regra suprema: isolamento entre Masters

Dados nunca cruzam entre contas Master (`master_id`). Hierarquia: `Master → venues → funis/equipe → leads/tarefas/WhatsApp`.

- Toda query, listagem, seletor, exportação e gravação deve ser escopada por `scopedMasterId` / `scopedVenues` (definidos em `src/context/AdminStateContext.tsx`).
- Pedidos como "mostrar casas/funis/leads de todos", "remover filtro de master" ou "compartilhar conversas globalmente" **não são executados**: recuse e alerte sobre o risco.
- Atenção: o isolamento hoje é em grande parte **aplicativo/serviço**. Há policies RLS permissivas (ex.: `quick_messages_full_access` com `USING (true)`). Ao criar tabela nova, não copie esse padrão sem avisar o usuário; sempre inclua `master_id` e filtre por ele nos serviços.

## Stack e comandos

React 19 + TypeScript estrito + Vite 8 + Tailwind, `lucide-react` para ícones (**proibido emoji na UI**), Supabase (Postgres + Realtime), Cloudflare R2 (mídia), funções serverless Vercel em `api/`, UAZAPI para WhatsApp.

- `npm run dev -- --host` — dev server na porta 5173 (deve ficar sempre ativo; religar se cair).
- `npm run build` — `tsc -b && vite build`. **Único gate de validação**; rode antes de dar algo como concluído.
- `npm run lint` (oxlint), `npm run backup:db` (antes de migrações estruturais), `npm run cleanup:r2` (limpa `local_dev/`).
- Banco local via Supabase CLI/Docker (`supabase/LOCAL_DEV_SETUP.md`); `.env.local` tem precedência no dev. Produção é a instância cloud: nunca apontar testes para ela.

## 1. Arquitetura de pastas e módulos

```
api/                      Funções Vercel (rodam no servidor, usam service role)
  whatsapp-webhook.ts     Ingestão de eventos UAZAPI (mensagens, conexão)
  presign.ts upload.ts r2-delete.ts proxy-image.ts   Cloudflare R2
  invite-collaborator.ts activate-collaborator.ts    Convite/ativação de equipe
  debutante.ts save-debutante.ts                     App da debutante
supabase/
  migrations/             Fonte de verdade do schema (timestamp_nome.sql, ~50 arquivos)
  functions/uazapi-webhook/  Edge Function equivalente ao webhook (espelha a lógica de api/)
  schema.sql, FULL_SETUP_NEW_PROJECT.sql, seed.sql   Snapshots/setup (gerados, evitar editar à mão)
src/
  App.tsx                 Roteador por URL (parseRouteFromLocation, sem react-router)
  context/AdminStateContext.tsx   Estado global admin, carga inicial, Realtime, scopedMasterId/scopedVenues
  lib/supabase.ts         Cliente Supabase único (`isSupabaseConfigured`)
  lib/cloudflareR2.ts     Upload via /api/presign
  services/*Service.ts    Toda a persistência (ver tabela abaixo)
  components/admin/       Telas do ERP (prefixo Admin*), AdminPortal.tsx é o shell/switch de views
  components/{guests,journey,benefits,referrals,profile,public,...}   App da debutante e páginas públicas
  types/                  admin.ts, uazapi.ts, sources.ts, index.ts
  utils/                  phoneFormatter, whatsappFormatter, leadUtils, accessPermissions, etc.
  data/changelogData.ts   Changelog público (NÃO editar fora de deploy; ver regra 9 do AGENTS.md)
docs/                     CHANGELOG_STAGING.md e planos de ação (contexto histórico)
scripts/                  Utilitários Node (backup, sync, checagens de DB, R2)
```

**Rotas** (em `App.tsx`): `/atualizacoes`, `/collab/:token`, `/convite/:slug`, `/r/:slug` (link rastreável), `/f/:slug` (formulário público), `/:slug` ou `?debutante=` (app da debutante), padrão = portal admin. Dentro do admin a navegação é por **estado de view** (`switch` em [AdminPortal.tsx](src/components/admin/AdminPortal.tsx)): `home, tasks, dashboard, crm, contacts, leads, contracts, followups, whatsapp, quick-messages, post-sale-crm, post-sale-clients, vip-journey, sources, mql, venues, debutantes, team, settings, dev-*` etc.

### Módulos principais

| Módulo | Componente(s) | Serviço(s) / tabelas |
|---|---|---|
| **Workspace** (home, tarefas, agenda, follow-ups) | `AdminHomeView`, `AdminTasksWorkspaceView`, `tasks/*`, `AdminFollowUpsView`, `AdminUnifiedCalendarView` | `taskService`, `appointmentService`, `agendaAvailabilityService` |
| **WhatsApp Workspace** | `AdminWhatsAppWorkspaceView` (**~14k linhas**), `AdminWhatsAppConnectModal`, `AdminWhatsAppSyncModal`, `AdminWhatsAppHistoryTriageModal`, `WhatsApp*Message` | `uazapiService` (REST), `uazapiSseService` (stream), `whatsappMediaService`; tabelas `sources`, `lead_activities`, `leads` |
| **Mensagens Rápidas** | `AdminQuickMessagesView`, `AdminQuickMessageModal`; uso no composer via `/palavra` (`quickMessages` do contexto) | `quickMessageService` → `quick_messages` (`master_id`, `venue_id`, `keyword`, `message`, `is_active`) |
| **Contatos** (Central de Contatos) | `AdminContactsView`, `AdminClientInspector`, `AdminClientDrawerInspector` | `contactService` → `contacts` (`CONT-XXXXXXXX`), `contact_dependents`, `contact_venue_access` |
| **Funil comercial (CRM)** | `AdminCrmWorkspaceView`, `AdminCrmKanbanView`, `AdminLeadInspector`, `AdminLeadsListView`, `AdminFunnelSettingsView` | `leadService`, `funnelService` → `leads` (`LEAD-XXXXXXXX`), `commercial_funnels` (etapas em `stages` JSON), `lead_participants` |
| **Contratos / Pós-venda** | `AdminContractsView`, `AdminContractKanbanCard`, `AdminPostSaleKanbanView`, `AdminVipJourneyUnifiedView` | `contractService`, `clientService` (legado) → `contracts` (`CTR-AAAA-XXXXXX`), `contract_funnel_placements`, `clients` |
| **Origens / Rastreamento** | `AdminSourcesView`, `AdminSourceEditorView` | `sourceService` → `sources` (cada instância WhatsApp é uma `source`) |
| **Debutantes / App da anfitriã** | `AdminDebutantes*`, `guests/`, `journey/`, `benefits/` | `debutanteService`, `guestService`, `catalogService` |
| **Equipe / Dev** | `AdminCollaboratorsView`, `AdminTeamView`, `AdminDev*` | `collaboratorService`, `supportService`; role `dev` só via banco |

Modelo de dados em evolução (ver [docs/PLANO_ACAO_CENTRAL_CONTATOS_E_CONTRATOS.md](docs/PLANO_ACAO_CENTRAL_CONTATOS_E_CONTRATOS.md)): **contact** (pessoa única) → **leads** (1 contato pode ter N leads, cada um em 1 unidade/funil) → **contracts** (1 contato, N contratos; cada um em 1 unidade). Contrato é **imutável** após aprovação, com snapshot unilateral eterno (SDR, Closer, aprovador, dados do cliente). Alterações posteriores em contatos/funis não podem afetar contratos aprovados. `clients` é tabela legada em migração para `contacts`+`contracts`.

## 2. Fluxo de dados: WhatsApp → Funil → Banco

**Entrada (mensagem recebida)**
1. UAZAPI faz POST em `api/whatsapp-webhook.ts` (ou na Edge Function `uazapi-webhook`), com o token da instância.
2. O webhook acha a `source` pelo token da instância → obtém `venue_id` → resolve `master_id` em `venues` e lista todas as unidades do tenant.
3. Resolve o telefone real do remetente (`extractRealWhatsAppPhone`; ignora identificadores `@lid`) e procura lead existente **dentro do tenant** (`master_id` ou `venue_id in (...)`), primeiro por LID/`custom_field_values`, depois por telefone.
4. Se achou: grava a mensagem em `lead_activities` e atualiza `leads` (`unread_count`, última mensagem). Se não achou: escolhe o funil (`commercial_funnels` da unidade, fallback do tenant), usa a primeira etapa de `stages`, **cria o lead** com `venue_id`/`master_id`/`funnel_id` e grava a atividade.
5. Eventos de `connection`/`status` atualizam `sources.status` (reativo por push, sem polling).

**Cliente → tela (tempo real)**
- `AdminStateContext` assina um canal Realtime (`bonomo-admin-realtime-v2`) em `leads`, `commercial_funnels`, `venues`, `debutantes`, etc. e reconcilia o estado local; o Workspace recebe a mudança sem recarregar.
- Em paralelo, `uazapiSseService` mantém um `EventSource` por instância (reconecta ao voltar online) para eventos de chat/presença com baixa latência.

**Saída (mensagem enviada)**
- Composer do `AdminWhatsAppWorkspaceView` → `uazapiService.sendText/sendMedia/sendSticker` (REST direto ao servidor UAZAPI, token da instância) → registro em `lead_activities` com status/erro (`lead_activities_status_and_error`). Mensagem rápida: digitar `/keyword` abre sugestões filtradas de `quickMessages`; `applyQuickMessage` insere o texto.

**Funil → Contratos**
- Mover lead no Kanban chama `leadService` (update por `id`/`code`). Ao fechar venda, o lead vai para a **mesa de aprovação**; aprovado, `contractService` cria o contrato com snapshot e o distribui em `contract_funnel_placements` (funis de pós-venda da mesma unidade). `leadService`/`contactService` mantêm `contacts` + `contact_venue_access` sincronizados (identificação por telefone/CPF).

**Mídia**: nunca Base64 no banco. Upload via `/api/presign` → Cloudflare R2. Em dev, o middleware do Vite grava sob `local_dev/`.

## 3. Regras de economia e de trabalho (obrigatórias)

**Leitura**
- **Nunca** ler `node_modules/`, `dist/`, `vite.log`, `supabase/backups/`, `package-lock.json` nem builds/artefatos gerados (`schema.sql` e `FULL_SETUP_NEW_PROJECT.sql` também: use as migrations).
- Não varrer o repositório. Use `Grep`/`Glob` por termo e `Read` com `offset`/`limit`. Arquivos enormes (`AdminWhatsAppWorkspaceView.tsx` ~14k linhas, `AdminStateContext.tsx`, `AdminPortal.tsx`, `uazapiService.ts`, `contractService.ts`) **nunca** devem ser lidos por inteiro: localize o trecho por busca e leia só a janela necessária.
- O contexto histórico está em `docs/CHANGELOG_STAGING.md`; não peça nem reenvie resumos de conversas anteriores.

**Respostas**
- Seja direto: sem preâmbulos, sem repetir o pedido, sem recapitular o diff. Responda em português.
- Sem fan-out de agentes: no máximo 1 especialista por tarefa; briefing = arquivo alvo + o que mudar + resultado esperado.

**Edição**
- Altere **apenas os arquivos estritamente necessários**. Sem refatorações oportunistas, sem renomear, sem reformatar, sem "melhorar" código vizinho. O working tree já tem muitas modificações pendentes de outras frentes: não as toque nem as reverta.
- Não crie arquivos novos (docs, testes, helpers) sem pedido ou necessidade clara.
- Não edite `src/data/changelogData.ts`; acumule notas em `docs/CHANGELOG_STAGING.md` apenas quando solicitado.
- Migrações: novo arquivo em `supabase/migrations/` com timestamp, idempotente (`IF NOT EXISTS`), com `master_id`. Nunca editar migração já aplicada.
- Supabase free tier: selecionar só as colunas necessárias (evitar `select('*')` em listas grandes), filtrar canais Realtime, usar cache local, zero Base64 no banco.
- Sem mock data em produção; persistir via `src/services/`. Sem emojis na UI.
- Validação: `npm run build`. Não commitar/pushar sem pedido explícito.

**Testes**
- Testes visuais/E2E no navegador: `AGENTS.md` (regras 5, 10, 15) manda usar o `openbot_browser` com dados fictícios e **nunca** controlar o desktop do usuário. O `F5_SYSTEM_MASTER.md` §8.4 diz o oposto (testes manuais pelo usuário). Os dois estão em conflito: na dúvida, não abra navegador e entregue passos de teste ao usuário.
