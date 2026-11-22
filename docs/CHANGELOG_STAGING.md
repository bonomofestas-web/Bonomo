# Changelog Staging (Rascunho de Pré-Deploy) • F5 System

> **Instrução de Governança (Regra Fundamental 9):**
> Este arquivo acumula todas as alterações, correções, refatorações e novas funcionalidades desenvolvidas e testadas em ambiente local.
> O arquivo público de changelog (`src/data/changelogData.ts` exibido em `/atualizacoes`) **SÓ DEVE SER ALTERADO NO MOMENTO DO COMMIT E DEPLOY OFICIAL PARA PRODUÇÃO**.
> Durante o ciclo de testes locais, E2E e caça a bugs, todas as notas de release ficam concentradas aqui sob responsabilidade da **Robin Scherbatsky**.

---

## Acumulado para Próxima Release Oficial (Pré-Deploy v2.9.0)

### Identificação Preliminar
- **Versão:** v2.9.0 (a ser confirmada no deploy)
- **Tipo:** `major` (Grande Atualização)
- **Badge:** Grande Atualização
- **Data Prevista:** A definir no commit/deploy para produção

### Título Provisório
**Central de Contatos Unificada, Gestão Oficial de Contratos, Stack Gráfica Oficial, Refino de Funis e Blindagem Master ID**

### Sumário Geral
Grande reestruturação de governança, experiência do usuário, banco de dados e esteiras operacionais:
1. **Central de Contatos Unificada:** Identificador alfanumérico Base36 (`CONT-XXXXXXXX`) de alta entropia, unificação de contatos e dependentes/família sem duplicação de pessoas.
2. **Gestão e Mesa de Homologação de Contratos:** Fluxo de homologação formal de vendas (`CTR-AAAA-XXXXXX`) com congelamento unilateral permanente dos dados do cliente, termos e responsáveis (SDR, Closer e Aprovador).
3. **Fluxo de Devolução e Ajuste de Contratos:** Criação automática de tarefa prioritária (SLA de 24h) atribuída diretamente ao Closer no cancelamento/revisão com justificativa.
4. **Resolução e Adaptação Automática de Fichas de Clientes com Contratos:** Detecção e renderização completa de contratos vinculados por contato/telefone na gaveta de inspeção, mesmo para leads ainda sem card na tabela `clients`.
5. **Agenda de Eventos - Modo Semana com Seção 'Sem Horário':** Exibição de eventos do dia sem horário fixo logo abaixo do cabeçalho da data e suporte a faixas horárias na grade.
4. **Motor de Backend Multi-Funil e Unicidade 1:N:** Relação 1:N de Origens, ingestão atômica Base36 de Lead e Contato, e regras de contratos multi-funil com sincronização de conclusão global.
5. **Stack Gráfica Oficial (Tremor Raw & Apache ECharts):** Gráficos de área com gradientes para faturamento, comparativo SDR vs Closer, anéis de metas por casa, funis de conversão com rótulos em 2 linhas, heatmaps de WhatsApp e diagramas Sankey de origem.
6. **Funil Comercial Refinado com Unicidade:** Nova esteira oficial de 6 etapas e regra estrita de unicidade (visita + degustação para o mesmo contato contam como 1 único lead agendado).
7. **Visitas & Degustações com Voucher Oficial:** Planilha sem datas vazias, métrica real de acompanhantes/pax cadastrados sem teto rígido, local simplificado e voucher com foto do Closer para WhatsApp.
8. **Pós-Venda em Workspace Tri-Colunar & Usabilidade Refinada:** Abertura prioritária em Kanban, despoluição da toolbar em `AdminPostSaleKanbanView.tsx` (remoção de busca duplicada concentrada no `Ctrl + K` e inibição de seleção múltipla avulsa), erradicação do contador de rodapé, toggle com ícone de WhatsApp, ficha com toggle por seta e selects estilizados, seção 'Pessoas Anexadas ao Contrato' e categorização estruturada de Documentos Contratuais e do Evento no rodapé.
9. **Dashboard Executivo & Adaptação Modo Claro:** Painel consolidado com métricas comerciais, metas e compatibilidade integral com temas claro e escuro.
10. **Command Palette Unificado & Busca Universal:** Sistema global de atalhos (`Ctrl + K`) com filtros por Etiqueta, Colaborador e Unidade, corrigindo duplicações de digitação.
11. **Arsenal de Modernização de UI e Performance:** Integração de `sonner`, `cmdk`, `@tanstack/react-table`, `@formkit/auto-animate`, `motion` e `echarts` com `<Toaster>` global e tipografia padronizada em `Inter, sans-serif`.
12. **Higienização de Vocabulário Técnico:** Remoção de menções de infraestrutura técnica nas interfaces de contratos e uploads para linguagem comercial executiva.
13. **Isolamento Absoluto de Master ID (Regra Suprema):** Filtro nativo de `master_id` nas queries e mutations do Supabase (`leadService`, `clientService`, `contractService`, etc.) e no `AdminStateContext`.
14. **Auditoria de Integridade e Eliminação Integral de Mocks:** Erradicação de dados simulados em `AdminVisitsTastingsView.tsx`, extirpação de fallbacks financeiros fictícios (R$ 48k/12k/36k) e badges estáticos em `AdminClientDrawerInspector.tsx`, sob auditoria de Marshall Eriksen, assegurando alimentação 100% dinâmica via Supabase.
15. **Higienização Visual Estrita (Design System):** Eliminação total de emojis e degradês da interface administrativa; botões 100% sólidos corporativos e ícones da biblioteca `lucide-react`.
16. **Reorganização do Squad & Liderança de Frontend:** Descontinuação de protótipos HTML intermediários (saída de Victoria) e promoção de Lily Aldrin a Designer-Chefe & Frontend Lead, assumindo a criação direta em React com base no Design System nativo, Tremor Raw e Apache ECharts.
17. **Saneamento e Higienização Relacional do Banco:** Expurgo de duplicidades históricas na base de contratos e consolidação de vínculos reais e íntegros entre contratos, pessoas e funis por Barney.

### Recursos e Melhorias em Staging

- **Padronização Estrutural entre Ficha de Pós-Venda e Comercial:**
  * **Harmonização do Cabeçalho Superior:** Estrutura das 6 linhas padronizada tanto no Pós-Venda (`AdminClientDrawerInspector.tsx`) quanto no Comercial (`AdminLeadInspector.tsx`):
    - **Linha 1:** Nome em destaque com ações rápidas à direita: Menu de 3 pontinhos com "Transformar em Fornecedor", botão de Arquivar (roxo), botão de Lixeira/Remoção (vermelho) e botão de Recolher/Fechar (ciano).
    - **Linha 2:** Tag de Código Oficial com ícone `Tag`, código formatado (`CLI-XXXXXX` ou `LEAD-XXXXXX`), botão de copiar e badge "Copiado!".
    - **Linha 3:** Seletor de Etapa do Funil com cor, ícone da etapa, borda lateral sólida e dropdown com etapas do funil ativo e navegação entre outros funis.
    - **Linha 4:** Barra de progresso com tracinhos horizontais coloridos (6px), efeito hover interativo e avanço direto de etapa ao clicar.
    - **Linha 5:** Barra unificada de Badges e Tags: Unidade Física (`Building2` com modal de transferência para gerentes/master), Situação do Contrato (`Contrato vinculado` em verde ou `Sem contrato` em cinza), botão `Vincular a Contrato` quando pendente, tags ativas do cliente e botão `+ Tag` com dropdown de seleção e criação rápida.
    - **Linha 6:** Abas de navegação padronizadas (`Ficha`, `App da Debutante`, `Origem`, `Jornada`) com sublinhado sólido azul de 2px na aba ativa e tipografia alinhada.
  * **Despoluição e Eliminação de Redundâncias:** Removida a barra secundária de tags e unidade que se repetia dentro da Aba 1 (Ficha), garantindo início limpo e direto das seções de dados do evento e financeiro.
  * **Disponibilidade Total de Arquivamento e Exclusão:** Os botões de arquivar e remover agora funcionam sem restrição tanto para leads quanto para clientes cadastrados, assegurando que o operador possa gerenciar e limpar cards em qualquer esteira.

- **Mídias, Documentos, Contatos (vCard) e Higienização de Telefones no WhatsApp Workspace:**
  * **Correção de Áudio de Voz (.ogg):** Gravação de mensagens de voz pelo navegador agora prioriza nativamente `audio/ogg; codecs=opus`, nomeia o arquivo como `voice_TIMESTAMP.ogg` e implementa dedução de extensão por MIME type no Cloudflare R2 e endpoint `/api/presign`. O player de áudio do chat agora detecta e reproduz áudios resilientemente mesmo em links legados salvos como `.bin`.
  * **Doca de Pré-visualização com Legenda (Staged Media Preview):** O envio de imagens e vídeos não dispara mais imediatamente ao selecionar o arquivo. Um dock flutuante exibe a miniatura, botão para inspeção em lightbox, botão de cancelamento (X) e campo de texto integrado para digitação de legenda antes do disparo.
  * **Envio Otimista de Vídeos sem Crash de Memória:** O envio de arquivos pesados de vídeo agora utiliza `URL.createObjectURL(file)` local instantâneo, eliminando armazenamento de Base64s volumosos no estado e `localStorage`. O upload para o Cloudflare R2 e envio via UAZAPI ocorrem em segundo plano com substituição transparente do link no banco, prevenindo sumiço temporário de mensagens e travamentos de memória.
  * **Distinção entre Foto/Vídeo e Documento & Preview Limpo de PDF:** Uploads acionados por "Documento" são preservados estritamente como documentos binários com metadados originais (sem compressão de imagem do WhatsApp). O visualizador de documentos remove títulos duplicados no banner superior, incorpora prévia da primeira página do PDF e resume nome, tamanho e contagem de páginas de forma limpa.
  * **Envio e Recepção de Cartão de Contato Oficial (vCard):**
    - Corrigido payload da requisição para a API oficial da UAZAPI (`POST /send/contact`): adequação das chaves obrigatórias de `contactName`/`contactPhone` para `fullName` e `phoneNumber` com telefone normalizado em formato E.164 (`55XXXXXXXXXXX`).
    - Validação de envio real no WhatsApp: eliminada a falha de 400 que causava fallback espúrio para texto simples, permitindo a entrega do cartão nativo clicável do WhatsApp diretamente no aplicativo dos destinatários.
    - Validação estrita de número de destino no chat antes do disparo para evitar ações silenciosas sem destinatário.
    - Busca de contatos expandida para cobrir leads, contatos vinculados, clientes (pós-venda) e equipe de colaboradores.
  * **Higienização Definitiva de Máscaras e Formatação de Telefone:** Implementação da função `sanitizeBrazilianPhone` que expurga com segurança o DDI `+55` quando o número possui mais de 11 dígitos numéricos, impedindo que o código `55` fique preso indevidamente dentro dos parênteses do DDD `(55)` ou que os últimos dígitos do telefone sejam truncados ao colar contatos com formatação completa.
  * **Correção de Persistência de Telefone e Resolução de Conflitos em Contatos (`LEAD-UWMTEG` e Leads Manuais):**
    - Corrigido bug crítico em que a alteração manual de telefone em leads (como `LEAD-UWMTEG`) falhava silenciosamente no Supabase devido ao trigger de sincronização de contatos violar a restrição de unicidade `uq_contacts_master_phone_key` quando o número já existia em outro contato do mesmo Master.
    - O `leadService.update` agora localiza o contato correspondente na tabela `contacts` e vincula atomicamente `contact_id` ao lead, além de contar com tratamento resiliente de conflitos e fallback automático.
    - Substituída a máscara local restritiva de `AdminNewLeadModal.tsx` pela versão universal de `phoneFormatter.ts`, garantindo que cadastros manuais não truncem números colados com `+55`.
    - Ao alterar o telefone no `AdminLeadInspector`, o destinatário ativo no chat (`selectedRecipientPhone`) é sincronizado de imediato, assegurando que o envio de mensagens respeite o novo número e não limpe o campo no estado da interface.

- **Unificação Multi-Número de Mensagens por Contrato no WhatsApp Workspace:**
  * **Agregação Familiar de Conversas no Card do Contrato:** O card do evento em funis de pós-venda passa a agregar ativamente as mensagens de **todos os telefones registrados na família** (titular/pagante e todos os contatos como mãe, pai, debutante). Ao abrir o card de contrato, todas as mensagens enviadas ou recebidas por qualquer membro da família no funil daquela instância são unificadas na timeline com identificação de remetente (`Carla Nogueira (Mãe)`, etc.).
  * **Busca e Carregamento Sob Demanda para Contatos Secundários:** O carregamento de mensagens (`loadLeadConversationDays` e `loadOlderLeadActivities`) agora varre e carrega o histórico do banco para cada número vinculado à família no funil da instância, garantindo zero perda de mensagens históricas durante a unificação de cards.
  * **Prévia da Última Mensagem no Card da Lista:** A lista lateral de conversas exibe com precisão o último texto e horário considerando todas as interações da família associada ao contrato.

- **Ocultação Definitiva de Cards de Familiares no Kanban de Pós-Venda:**
  * **Deduplicação de Cards por Título, Telefone e ID de Contrato:** Implementado filtro à prova de falhas em `AdminPostSaleKanbanView.tsx` que oculta automaticamente qualquer card secundário (`CLI-` ou contato familiar como mãe/pai) quando o card oficial do contrato (`CTR-`) correspondente estiver presente no quadro do evento.
  * **Mapeamento de Contrato no ClientService:** Adicionado mapeamento explícito de `migrated_to_contract_id` e `contract_id` em `clientService.ts` para que o estado do React reconheça instantaneamente o vínculo do contrato.
  * **Herança Automática de Contratos entre Funis:** Mensagens recebidas no WhatsApp (`api/whatsapp-webhook.ts`) e novos leads criados passam a detectar automaticamente se o telefone pertence a um contato ou familiar de contrato homologado. O novo lead/cliente herda de imediato o vínculo contratual (`contract_id`, `contract_title`, `contract_code` e tags), eliminando cadastros e vínculos manuais repetidos.
  * **Invalidação de Cache de Clientes (LocalStorage v9):** Chave de armazenamento atualizada para `bonomo_admin_clients_v9`, forçando o descarte de dados desatualizados do navegador.

- **Roteamento Estrito de Mensagens por Instância e Funil de Origem:**
  * **Match Estrito de Origem no Webhook:** Erradicado o match frouxo por substring (`.includes()`) em `api/whatsapp-webhook.ts` que casava incorretamente com origens sem funil (como o seed do Financeiro). O vínculo com a origem agora exige correspondência exata de token, ID da instância ou telefone conectado.
  * **Escopo 100% Amarrado ao Funil Alvo da Instância:** A verificação se o número já existe no sistema é avaliada **estritamente dentro do funil ao qual a instância receptora pertence**. Se o número não existir naquele funil específico, um novo lead/cliente é criado imediatamente na primeira etapa configurada daquela esteira — mesmo que o contato já possua histórico em outros funis da empresa.
  * **Blindagem no Frontend e Edge Functions:** Ajustada a resolução de mensagens em tempo real em `AdminStateContext.tsx` e `supabase/functions/uazapi-webhook/index.ts` para respeitar o isolamento por funil, impedindo o reaproveitamento acidental de leads de outras unidades ou funis.
  * **Reconciliação e Limpeza de Testes de Produção:** As mensagens de teste enviadas via `REALIZAR_SAMSUNG_NOVO` e `REALIZAR_KOMMO` foram devidamente alocadas em novos leads nos funis comerciais `RLZ PIRES` (`LEAD-WJ5ZRC`) e `RLZ KOMMO` (`LEAD-HTDUPC`), expurgando os registros espúrios do funil de pós-venda.
  * **Bump de Caches (IndexedDB v5 e LocalStorage v11):** Atualização dos identificadores de cache local para carregamento instantâneo das esteiras normalizadas.

- **Saneamento de Acentos (Encoding UTF-8) e Herança Automática de Contratos via Central de Contatos:**
  * **Saneamento Global de Acentos (218 Contratos, 218 Clientes, 237 Contatos):** Cruzamento e restauração com base no arquivo mestre original UTF-8 (`import_set.json`), corrigindo caracteres corrompidos (`??`, `Ã³`, `Ã§`) em títulos de eventos, nomes de debutantes, contratantes, observações e papéis familiares tanto no banco de Produção (Nuvem) quanto Local (Docker).
  * **Ocultação de Cards Redundantes de Familiares no Kanban de Pós-Venda:** Cards de contatos e familiares (com código de cliente `CLI-` ou lead) que já fazem parte de um contrato oficial presente no Kanban são automaticamente consolidados no card oficial do evento (`AdminContractKanbanCard`), eliminando a exibição duplicada com badge `SEM CONTRATO` na esteira.
  * **Herança Automática Multi-Funil via Contatos (`contacts`):** Quando qualquer familiar ou contratante previamente cadastrado envia mensagem por qualquer canal ou funil, o sistema identifica automaticamente o contrato vinculado através da Central de Contatos e aplica a herança imediata (`contract_id`, `is_client: true` e parentesco), sem necessidade de re-vinculações manuais repetidas.
  * **Invalidação e Atualização de Caches (IndexedDB v4 e LocalStorage v10/v8):** Bumps em `f5-chat-cache-v4-`, `f5_admin_leads_v10` e `f5_admin_clients_v8`, garantindo que os navegadores recebam imediatamente os dados normalizados do Supabase.

- **Auditoria de Instâncias WhatsApp, Roteamento Estrito e Purga de Cache Local:**
  * **Isolamento de Conversas por Instância:** Removidos fallbacks indevidos que associavam mensagens de WhatsApp ao primeiro lead/cliente encontrado caso a instância não batesse perfeitamente. Mensagens agora só são associadas ao lead/cliente que pertença rigorosamente à instância (`source_id`) que recebeu o evento.
  * **Saneamento no Banco de Produção:** Mensagens históricas desalinhadas foram purgadas e redirecionadas para os leads correspondentes com metadados completos de instância (`sourceId`, `senderSourceId`, `senderSourceName`, `senderPhone`).
  * **Invalidação e Atualização de Caches do Cliente (IndexedDB v2 e LocalStorage v8):** Bumps em `f5-chat-cache-v2-` e `f5_admin_leads_v8` com limpeza automática de bases legadas (`v1` e `v7`), garantindo que o navegador carregue imediatamente o histórico limpo e auditado do Supabase.
  * **Ajuste Fino de Duplicados no Pós-Venda:** O badge "Cliente Duplicado" agora só é exibido se houver outro card com o mesmo telefone estritamente dentro do mesmo funil.

- **Eliminação do Erro 428C9 na Migração de Contatos (Colunas Geradas):**
  * O gerador `scripts/generate_prod_sync_all.mjs` agora filtra automaticamente colunas do tipo `GENERATED ALWAYS AS (...) STORED` (`primary_phone_digits`, `secondary_phone_digits`, `cpf_digits`, `primary_phone_key`). O PostgreSQL de produção calcula esses valores nativamente no INSERT sem conflito de permissão.

- **Persistência e Isolamento Total de Mensagens do Pós-Venda (Permanência após F5):**
  * **Persistência Real no Supabase:** As mensagens recebidas via SSE para clientes do pós-venda em `AdminStateContext` agora chamam `leadService.addActivity(matchedClient.id, clientAct)` e `clientService.upsert(...)`. Ao recarregar ou dar F5, o histórico completo do cliente permanece íntegro.
  * **Alinhamento do Webhook com Pós-Venda:** O webhook de back-end (`api/whatsapp-webhook.ts`) agora consulta a tabela `clients` e associa as mensagens de pós-venda ao `client.id` do funil da respectiva instância, eliminando o vazamento de conversas para leads comerciais soltos.

- **Isolamento de Origem Multi-Funil para o Mesmo WhatsApp e Eliminação de Cards Gêmeos:**
  * **Respeito Estrito à Origem do Funil:** Implementado o isolamento total de atividades entre esteiras (`effectiveLeadActivities`). Clientes com o mesmo número de WhatsApp em funis distintos (ex: `CLI-ACJF7Y` no funil `RLZ ADM` e `CLI-JRBZ2S` no funil `RLZ POS`) mantêm conversas 100% isoladas à respectiva esteira/instância, sem mesclar nem centralizar históricos.
  * **Desduplicação de Cards na Inbox:** Criada chave única de conversa por esteira e telefone (`funnelId|phoneLast8`). Elimina duplicações de cards na lista de mensagens (`Frr Roni` e `Financeiro Realizar`), preservando o card oficial do cliente e descartando leads soltos idênticos.

- **Eliminação de Mensagens Duplicadas em Tempo Real:**
  * **Normalização Universal de MessageId:** Criado helper `normalizeMessageId` que extrai o ID canônico da mensagem removendo prefixos de instância (`5521...:wamid` vs `wamid`), unificando reconciliações no `mergeAndSortActivities`, `AdminStateContext` (`postgres_changes`) e no `timelineActivities`.
  * **Reconciliação Otimista Rápida:** Mensagens otimistas recém-enviadas pelo frontend são marcadas com `isOptimistic: true` e reconciliadas com tolerância de até 8s, substituindo o card provisório pelo oficial sem gerar mensagem fantasma que exigia F5.
  * **Tratamento Idempotente de Erro 23505:** No `leadService.addActivity`, conflitos de chave única (`idx_lead_activities_unique_msg_id`) são tratados como sucesso silencioso, eliminando logs vermelhos 409 no console.

- **Correção da Conversão de Imagens e Arquivos em Áudio no WhatsApp:**
  * **Higienização de Parser e Fallback:** Em `formatActivityFromDb` e `AdminWhatsAppWorkspaceView`, sanado o fallback que forçava `mediaType = 'audio'` em URLs da Meta/UAZAPI ou em erros de JSON, inspecionando rigorosamente o `mimetype` e extensões de imagem/vídeo/documento.
  * **Preservação de Legendas (Captions):** A legenda inserida na imagem é preservada no `text` da mensagem e nunca mais substituída pelo marcador de áudio.
  * **Blindagem Visual dos Balões:** Condição estrita que impede mídias com `mediaType === 'image'` ou `document` de serem renderizadas como reprodutor de voz.

- **Divisão das Migrations de Produção em Partes Leves (< 400 KB):**
  * O gerador `scripts/generate_prod_sync_all.mjs` agora particiona a sincronização em 4 arquivos sequenciais perfeitamente compatíveis com o limite do SQL Editor do Supabase:
    * `05A_SINCRONIZAR_ESTRUTURA_E_CONTATOS.sql` (158 KB): Estrutura DDL, contatos, dependentes, setores e cargos.
    * `05B_SINCRONIZAR_218_CONTRATOS.sql` (375 KB): Limpeza de legados e upsert dos 218 contratos reais.
    * `05C_SINCRONIZAR_218_CLIENTES_POSVENDA.sql` (334 KB): Upsert dos 218 clientes no pós-venda e reviews financeiros.
    * `05D_SINCRONIZAR_AGENDA_METAS_TAREFAS.sql` (150 KB): 217 eventos da agenda, tarefas operacionais e metas das casas.
  * Mantido também o arquivo unificado `05_SINCRONIZAR_PRODUCAO_218_CONTRATOS_CLIENTES_AGENDA.sql` para execução via terminal psql.

- **Interface da Central de Funis de Pós-Venda:**
  * Ajustado o menu de ações do cabeçalho em `AdminCrmKanbanView.tsx` e `AdminPortal.tsx`: no Pós-Venda, inibido o botão redundante `+ Novo Funil Pós-Venda`, mantendo exclusivamente o botão oficial de ação primária `+ Criar Contrato`.

- **Correção Definitiva do Calendário Financeiro & Blindagem de Permissões de Diretoria:**
  * **Resolução da Tela em Branco no Calendário:** Eliminado o retorno condicional `null` nas rotas do financeiro em `AdminPortal.tsx`.
  * **Permissões Plenas para Diretoria:** `isUserDirector` integrado a todas as checagens críticas de sistema (`canAccessFinance`, `canChangeEventType`, `canChangeLeadVenue`, `canViewContractDocument`, etc.), garantindo acesso executivo imediato.
  * **Escopo Estrito de Unidades para Diretores:** `Diretor Master` tem visão total da rede; `Diretor` possui todas as ferramentas do Master porém estritamente escopado às suas unidades autorizadas (`currentUser.venueIds`).

- **Auto-Cura e Blindagem de Integridade na Vinculação de Contratos (Erro 23503 eliminado):**
  * Auto-cura no `contractService.linkLooseLeadToContract` e `contactService.linkFamilyMember`, garantindo que o `parent_contact_id` existe na tabela `contacts` antes de criar o vínculo na tabela `contact_dependents`.
  * Inclusão dos 257 contatos locais e dependentes no gerador de migração `scripts/generate_prod_sync_all.mjs`, blindando o ambiente de produção contra erros de chave estrangeira.
  * Inclusão de garantias DDL (`ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contract_id UUID`, `contract_title`, `avatar_url`, etc.) na Seção 0 da migração [05_SINCRONIZAR_PRODUCAO_218_CONTRATOS_CLIENTES_AGENDA.sql](file:///c:/Users/--/OneDrive/Documents/Codex%20Projetos/Bonomo%20Festas%202/supabase/migrations/05_SINCRONIZAR_PRODUCAO_218_CONTRATOS_CLIENTES_AGENDA.sql), eliminando o erro de coluna inexistente `42703` em produção.

- **Sincronização Fidedigna da Caixa de Entrada e Diálogo do WhatsApp:**
  * Eliminado o fallback incorreto que exibia observações e anotações internas do CRM gravadas em `lead.notes` como se fossem mensagens recebidas no card da lista de conversas.
  * Habilitada a pré-carga e sincronização de mensagens para clientes do pós-venda (`prefetchLeadConversations` com atualização em `setClients`), acabando com a restrição que impedia pós-venda de buscar atividades no banco.
  * Criado gatilho sob demanda ao selecionar qualquer conversa sem mensagens em cache, buscando imediatamente os registros do Supabase.
  * Projeção defensiva da última mensagem registrada (`lastMessageText`) na linha do tempo enquanto o histórico completo é recuperado em segundo plano, garantindo que o que aparece na lista sempre esteja presente no diálogo.

- **Menu de Ações Rápidas (3 Pontinhos) & Conversão em Fornecedor:**
  * Implementado menu de 3 pontinhos (`MoreVertical`) no topo da ficha do lead (`AdminLeadInspector`) e da gaveta do cliente de pós-venda (`AdminClientDrawerInspector`).
  * Ação "Transformar em Fornecedor": bloqueada com aviso caso o contato possua contrato ativo vinculado; quando elegível, abre o modal `AdminConvertToSupplierModal` com seleção de categoria.
  * Na confirmação, o contato é atualizado para `is_supplier: true` na Central de Contatos e os registros de lead e cliente nas esteiras são removidos automaticamente.

- **Despoluição do Cabeçalho de Funis de Pós-Venda:**
  * Removido o botão de criação de funil do topo da tela de pós-venda (`AdminPostSaleKanbanView`), mantendo unicamente o botão unificado `+ Criar Contrato` no menu superior da área de trabalho (`AdminPortal.tsx`).
  * Modal de cadastro atualizado para o título executivo `Novo Contrato • Pós-Venda`.

- **Correção de Mídias Enviadas no WhatsApp & Idempotência de Atividades (Erro 23505 eliminado):**
  * Corrigida a falha onde fotos e documentos enviados pelo sistema eram convertidos em áudios: `whatsappMediaService.uploadOutboundMedia` agora preserva `mediaType: fileCategory` e os métodos `addActivity` / `updateActivity` em `leadService.ts` inferem o formato real pela extensão do arquivo em vez de adotar `'audio'` como fallback cego.
  * Tratamento idempotente do erro Postgres `23505` (`idx_lead_activities_unique_msg_id`) em inserções concorrentes de webhook/realtime, prevenindo logs de erro indevidos.

- **Central de Unidades e Colaboradores & Gestão Dinâmica de Cargos:**
  * **Tag Oficial do Master e Diretores Padronizada:** A tag do Master foi estritamente unificada em todo o sistema como **`Diretor(a) Master`** (sidebar inferior, gaveta de edição, agendamentos, equipe e perfis). Colaboradores com perfil de diretoria de unidade recebem a tag **`Diretor(a)`**.
  * **Setor de Diretoria Integrado no Editor de Colaboradores:** Substituído o antigo card estático de Gerência pelo novo **Setor de Diretoria** (`#D4AF37`), com concessão de acesso pleno à operação e seleção automática entre `Diretor(a) Master` e `Diretor(a)`.
  * **Setor Financeiro e Setores Dinâmicos Ativos:** Setor Financeiro desbloqueado e ativo no drawer de colaboradores, junto ao suporte completo para listar quaisquer novos setores criados via `+ Novo Setor`.
  * **Header Superior Unificado:** Ações movidas para o topo preto da barra de navegação (`adm-header-actions`) com botões uniformes (`height: 36px`, `borderRadius: 10px`) à esquerda e o seletor `[Unidades] [Colaboradores]` à direita, eliminando barras duplicadas e liberando 100% da área de trabalho.
  * **Reordenação Dinâmica de Setores em Banco:** Setores agora salvos na tabela `job_sectors` com setas verticais para ordenação imediata e persistência por Master.
  * **Criação de Novos Setores Dinâmicos:** Botão `+ Novo Setor` com nome livre e seletor de paleta de cores.
  * **Limpeza e Ajuste de Setores:** Removido o setor estático de Gerência da listagem de cargos e atualizado Marketing para "Marketing e Tecnologia" (`marketing_tecnologia`).
  * **Desbloqueio de RLS para Salvar Cargos e Setores:** Políticas de segurança em `job_roles`, `job_role_labels`, `job_sectors` e `job_role_order` ajustadas para permissão de leitura e gravação no escopo do master tanto para `anon` quanto para `authenticated`, eliminando o erro de bloqueio `42501`.

- **Sincronização Total de Contratos, Pós-Venda, Agenda e Tarefas:**
  * **Migration Consolidada Completa para Produção:** Atualizado o script `05_SINCRONIZAR_PRODUCAO_218_CONTRATOS_CLIENTES_AGENDA.sql` contendo:
    - 218 contratos oficiais higienizados;
    - 218 clientes estruturados no pós-venda;
    - 217 eventos físicos com data na Agenda de Eventos;
    - 59 tarefas operacionais vinculadas aos contratos (`admin_tasks`);
    - Estrutura completa do workspace de tarefas (`task_databases`, `task_custom_statuses`, `task_custom_types`);
    - 10 setores operacionais e de diretoria (`job_sectors`) e cargos correspondentes;
    - Metas mensais das casas (`venue_goals`) e regras de agendamento de visitas/degustações (`venue_agenda_configs`);
    - DDL e desbloqueio de políticas de RLS para todas essas tabelas.

- **Refino Visual dos Cards Comerciais e Pós-Venda:**
  * **Cards Mais Gordinhos e Acolhedores:** Ajuste de padding (`12px 14px`), border-radius (`12px`), avatares (`30px`) e botões de ação estruturados no Kanban Comercial.
  * **Truncamento Inteligente de Nomes Longos:** Exibição dos dois primeiros nomes no card (mantendo o nome completo acessível ao passar o mouse e na gaveta do lead).
  * **Notificação de Mensagens do WhatsApp no Pós-Venda:** Badge de mensagens não lidas nos cards de contratos vinculados e clientes sem contrato, permitindo abrir a conversa instantaneamente.
  * **Correção de Escopo de Clientes nos Funis de Pós-Venda:** Correção do agrupamento que agora utiliza a carteira global da conta master, exibindo o volume real de contratos e clientes mesmo quando a casa ativa for diferente.

- **Refatoração da Ficha de Pós-Venda e Visualização Cirúrgica de Contatos** (`pos-venda` / `client-drawer` / `whatsapp`):
  * **Seletor de Unidades e Experiência de Navegação (`AdminSidebar`):**
    - Ícone de engrenagem integrado diretamente no card do seletor de unidades (substituindo o antigo `ChevronDown`), com transição de cor cinza para azul `#14A9D7` no hover, permitindo acesso imediato à Central de Unidades e Colaboradores com um clique.
    - Bordas douradas do card e do popover de seleção de casas substituídas pelo tom azul/ciano padrão do sistema (`rgba(20, 169, 215, 0.35)`).
    - Recurso "Ver com os Olhos de" movido para os 3 pontinhos do menu de colaboradores (`TeamDirectory`, `AdminCollaboratorsView`), exibindo badge "Vendo com os olhos de [Nome]" com botão de remoção rápida (X) logo abaixo do seletor de unidades.
  * **Módulo de Finanças em Staging Controlado (`AdminFinanceView`):**
    - Renomeação de "Financeiro" para "Finanças" na barra lateral, com tipografia em tom `#14A9D7`, badge "DEV", e acordeon retrátil.
    - Banner persistente de módulo em desenvolvimento com travamento de todas as mutações e aprovações (disparando aviso informativo de proteção).
    - Reorganização de seções: Gerência e Marketing posicionados ao final como "Em Breve".
  * **Sincronização Definitiva de Contratos e Financeiro (`ATUALIZAR_CONTRATOS_FINANCEIRO_PRODUCAO.sql`):**
    - Diagnóstico de falha de importação em produção decorrente de `ON CONFLICT DO NOTHING` em registros pré-existentes.
    - Geração de script SQL consolidado com `ON CONFLICT (id) DO UPDATE SET` para atualização integral dos 218 contratos (preços reais, links de PDF no Cloudflare R2, snapshots de clientes e status aprovado).
    - Carga completa de 218 revisões em `fin_contract_reviews`, 2.841 parcelas em `fin_receivables` e 380 lançamentos em `fin_payables` para ativação da Visão Geral e Calendário de Finanças.
  * **Regra de Vínculo Contratual (Ocultação de Card Solto no Kanban):**
  * **Regra de Vínculo Contratual (Ocultação de Card Solto no Kanban):**
    - Quando um contato/lead (ex.: mãe Carla) é vinculado a um contrato oficial existente (ex.: Antônio / Vitória 15 Anos), ele é unificado sob o card oficial do contrato.
    - No **Modo Kanban (`AdminPostSaleKanbanView`)**, contatos vinculados a contratos são ocultados como cards soltos/avulsos ("SEM CONTRATO"), eliminando poluição visual e duplicidade de cards nas colunas.
    - Na **Caixa de Entrada e no WhatsApp Workspace**, o contato continua 100% visível e acessível na lista de conversas, com o selo do contrato vinculado para atendimento normal.
  * **Blindagem Atômica Contra Mensagens e Leads Duplicados:**
    - Purga de 235 mensagens duplicadas existentes na tabela `lead_activities`.
    - Criação de índice único parcial no PostgreSQL: `idx_lead_activities_unique_msg_id` em `(lead_id, (metadata->>'messageId'))`.
    - Tratamento atômico de corrida concorrente (`23505`) no webhook `api/whatsapp-webhook.ts`, impedindo criação de registros duplicados mesmo em retentativas simultâneas da UAZAPI.
    - Blindagem na detecção de lead concorrente pelo número telefônico antes do cadastro.
  * **Isolamento Estrito entre Instâncias / Multi-Chip:**
    - Ao alternar a instância de envio (ex.: de "POS VENDA GLORIA" para "ERL 9915" na conversa de um cliente), as mensagens de outros chips são ocultadas com isolamento estrito, permitindo iniciar conversas limpas e segmentadas pelo novo número.
  * **Padronização Visual de Título de Contrato na Lista de Conversas:**
    - O subtítulo com ícone de documento no card de conversa passa a exibir unicamente o nome da debutante/homenageada (1º e 2º nome) e o tipo de evento (ex.: "Vitória Rodrigues • 15 Anos"), expurgando o nome do contratante ("Antônio Rodrigues") daquele indicador.
  * **Exibição do Nome Real do Funil na Caixa de Entrada:**
    - Corrigido rótulo genérico "Sucesso do Cliente" para priorizar o nome oficial do funil (ex.: "ERL PÓS").
  * **Tratamento de Avatares Inexistentes e SafeAvatar:**
    - Erradicação de fallbacks cegos de R2 gerando links 404 para telefones sem foto cadastrada.
    - No `<SafeAvatar>`, para tamanhos pequenos (`size <= 28`), exibição cirúrgica apenas da 1ª inicial (ex.: "A"), e reset automático de estado de erro em caso de atualização de URL.
  * **Cards Compactos com Fotos e Sem Botão 'Zap' (`AdminClientDrawerInspector.tsx`):**
    - Contratante Pagante e Contatos Secundários (Mãe, Pai, Copagante) agora renderizam por padrão no formato compacto/recolhido: avatar oficial `<SafeAvatar size={34} />` à esquerda com foto de perfil, nome em negrito, badges de parentesco/decisor, telefone formatado com ícone `Phone` e chevron para expansão.
    - Eliminação definitiva de botões externos "Zap" que desviavam o usuário para fora da plataforma.
    - Ao expandir, o formulário completo de edição é exibido com opção de recolher a qualquer momento.
  * **Tag Rápida da Unidade no Topo da Gaveta:** Exibição da unidade física do contrato com ícone `Building2` logo ao lado do badge de contrato vinculado/código do cliente.
  * **Gestor de Sucesso Resiliente e Filtrado por Unidade:** Resolução do nome do gestor responsável atribuído mesmo em casos de discrepância de identificador, e filtragem do dropdown de atribuição para a equipe de pós-venda da unidade física do contrato.
  * **Funis Relacionados com Adição Rápida via Botão `+`:** Seção de progresso nos funis renomeada para **Funis Relacionados**, trazendo botão `+` para Masters e Gerentes com popover para vincular o contrato a outro funil de pós-venda da mesma casa física (`contractService.addContractPlacement`).
  * **Slot da Debutante / Protagonista com Avatar Oficial (`ClientContractSection.tsx`):** Renderização da foto de perfil `<SafeAvatar size={34} />` resolvida dinamicamente pelo número de WhatsApp cadastrado na linha da aniversariante.
  * **Resolução Dinâmica e Universal de Avatars (`AdminWhatsAppWorkspaceView.tsx`):** Unificação da resolução de fotos de contatos no histórico e no cabeçalho de conversa através de `resolveAvatarForPhone`, garantindo fotos imediatas para familiares (Carla, Glória, etc.).
  * **Isolamento de Conversas e Leitura por Destinatário Ativo:** Leitura cirúrgica de mensagens e encerramento de atendimento restrito estritamente ao membro da família com quem o chat está ativo, preservando chats de outros familiares.
  * **Correção Crítica de TDZ em `resolveAvatarForPhone` (`AdminWhatsAppWorkspaceView.tsx`):** Erradicação definitiva do erro de runtime `ReferenceError: Cannot access 'currentClient' before initialization` que impedia a montagem do chat ao acessar `currentClient` antes de sua declaração, restaurando o carregamento imediato do workspace de mensagens.
  * **Exibição Inteligente de Fotos nos Cards do Kanban de Pós-Venda (`AdminContractKanbanCard.tsx` e `ClientPersonKanbanCard.tsx`):** Implementada resolução dinâmica de avatares para cards de contratos e pessoas soltas no Kanban, buscando fotos sincronizadas pelo WhatsApp em `leads` e Cloudflare R2 por número telefônico tanto do contratante quanto dos contatos familiares vinculados (ex.: foto da Carla exibida com perfeição no contrato da família).
  * **Preservação e Consolidação Segura de Atividades no Chat Familiar:** Auditoria de integridade no Supabase comprovou 100% das mensagens salvas intactas no banco; ampliada a varredura de atividades em `effectiveLeadActivities` para cobrir o conjunto consolidado de `sourceLeads` e `leads`, garantindo que o histórico completo de 77 mensagens reais seja renderizado sem perdas.
  * **Central de Contatos como Single Source of Truth para Fotos do WhatsApp (TTL de 7 Dias):** Implementada a persistência centralizada de fotos de perfil em `contacts.profile_picture_url` e `contacts.avatar_refreshed_at`. Toda interação com lead ou cliente (ao abrir chat/ficha, enviar ou receber mensagem) checa se passaram mais de 7 dias da última verificação. Se houver foto nova, salva no Cloudflare R2 (`picture_{code}.jpg?v=timestamp`) e propaga instantaneamente para `contacts`, `leads` e `clients`, sincronizando Kanban, Chat e Fichas de uma só vez.

- **Padronização Visual dos Cards de Conversa e Modo Caixa de Entrada** (`whatsapp` / `pos-venda` / `crm`):
  - **Badges Padronizados no Rodapé das Conversas:** Remoção do badge de tipo de evento/anos (`lead.eventType`), posicionando o **Funil na frente** (com logo ou ícone do funil renderizado na frente do nome) e a **Unidade** ao lado (com ícone `Building2`), ambos com altura idêntica padronizada (`20px`), layout nivelado, simétrico e alinhado.
  - **Subtítulo Limpo do Contrato Vinculado:** Extração direta e estrita da homenageada/aniversariante (1º e 2º nome) + evento (ex.: `Vitória Rodrigues • 15 Anos`), com eliminação definitiva de qualquer prefixo ou menção ao nome do contratante pagante (`formatContractHonoreeTitle`).
  - **Abertura Direta da Ficha do Contrato para Contatos Familiares:** Ao clicar em um contato familiar (ex.: Carla Nogueira), o sistema identifica o contrato mestre associado e abre diretamente a **Ficha do Contrato de Pós-Venda** (onde constam contratante, mãe, debutante, checklist e detalhes do evento).
  - **Alternador de Familiares no Topo do Chat por Recência:** Reordenação dinâmica dos botões de WhatsApp familiar no cabeçalho da mensagem pelo timestamp da mensagem mais recente (quem interagiu por último fica em 1º lugar à esquerda).
  - **Fluxo do Modo Caixa de Entrada a partir do Kanban:** Ao alternar para o modo Caixa de Entrada sem lead selecionado previamente, a lista de conversas inicia aberta com a mensagem "Selecione uma conversa para iniciar o atendimento", sem forçar abertura arbitrária do primeiro lead; ao clicar em qualquer conversa, o sistema recolhe a lista e abre a conversa com a ficha lateral.
  - **Ícone e Nome do Funil no Cabeçalho:** Substituição do ícone pelo oficial de mensagens (`MessageSquare`) e exibição dinâmica do nome real do funil ativo (ex.: `Caixa de Entrada • ERL PÓS`) em vez do texto estático "Sucesso do Cliente".

- **Ordenação por Mensagem Mais Recente no Kanban Comercial e Pós-Venda** (`kanban` / `crm` / `pos-venda`):
  * **Cálculo de Mensagem Multicontato Familiar (`getClientFamilyLatestMessageTime`):** No Kanban de Pós-Venda (`AdminPostSaleKanbanView.tsx` e `leadSorting.ts`), a ordenação por "Mensagem Mais Recente" varre simultaneamente todos os números de WhatsApp vinculados ao contrato (Pai pagante, Mãe e Debutante/dependentes) e elege a interação mais recente dentre todos eles para determinar a posição do card na coluna.
  * **Seletor Rápido de Ordenação na Toolbar:** Adicionado na toolbar superior do Kanban de Pós-Venda e do CRM Comercial o dropdown direto de ordenação com opções claras: *Mensagem Mais Recente*, *Tempo de Espera (Prioridade)*, *Mais Recentes (Entrada no Funil)*, *Data da Festa*, *Maior Rentabilidade* e *Alfabética*.
  * **Fim da Ambiguidade de 'Mais Recentes':** Distinção transparente entre ordenação por *Entrada no Funil* (`createdAt` / `funnelEnteredAt`) e *Mensagem Mais Recente* (última mensagem real de chat trocada no WhatsApp).

- **Vínculo Familiar ao Contrato e Preservação de Conversas no WhatsApp** (`pos-venda` / `whatsapp` / `crm`):
  * **Exibição da Família no Card do Contrato:** O card mestre do contrato no Kanban do Pós-Venda (`AdminContractKanbanCard.tsx`) agora renderiza de forma unificada os contatos secundários e familiares vinculados em `client.contacts` (ex: `Pai: Antônio Rodrigues`, `Mãe: Carla Nogueira`, `Debutante: Vitória`) com ícone elegante `Users` e tipografia refinada.
  * **Absorção no Kanban sem Perda de Mensagem:** Quando um contato solto (ex: Carla Nogueira) é vinculado ao contrato no funil, o card mestre do contrato representa a família naquele funil, eliminando duplicidade visual de cards soltos solteiros no mesmo funil.
  * **Identificação Imediata de Contrato e Funil nas Mensagens:** No WhatsApp Workspace (`AdminWhatsAppWorkspaceView.tsx`), cada pessoa mantém sua conversa individual com nome, foto e telefone. Logo abaixo do nome do contato, é renderizado pequenininho e discreto o nome do contrato vinculado (`<FileText size={10} color="#D4AF37" />`). Na linha de tags, o badge do **Funil** da mensagem é exibido com alto destaque visual (`#6366F1`), permitindo ao operador identificar instantaneamente por qual funil a cliente está interagindo.
  * **Regras Oficiais de Duplicidade:** Comercial (mesmo WhatsApp em funis comerciais diferentes = permitido; no mesmo funil = duplicado); Pós-Venda (mesmo WhatsApp/contrato em funis de pós-venda diferentes = permitido; no mesmo funil = duplicado).

- **Harmonização do Seletor de Unidades e Cabeçalho de Agenda** (`layout` / `events`):
  * **Seletor de Unidades Limpo na Barra Lateral (`AdminSidebar.tsx`):** Removido o botão de engrenagem circular de dentro do switcher de unidades, substituindo por uma seta discreta (`ChevronDown`). Quando todas as unidades estiverem selecionadas, o seletor fechado exibe **"Todas"** e o menu popover exibe **"Todas as Unidades"** (sem o sufixo "(Rede Geral)").
  * **Cabeçalho da Agenda de Eventos (`AdminVenueEventsView.tsx`):** O botão de Regras de Disponibilidade foi integrado com o design corporativo do sistema com rótulo "Disponibilidade" e ícone sutil, eliminando círculos e animações fora do padrão visual.
  * **Agenda de Eventos - Modo Semana com Seção 'Sem Horário' (`AdminCalendarWeekView.tsx`):** Eventos de dia inteiro ou sem horário fixo agora são exibidos em destaque na linha logo abaixo da data de cada dia da semana, garantindo que nenhuma festa ou evento suma da visualização semanal.

- **Preservação Estrita de Etapa e Posição ao Vincular Contratos** (`crm` / `core`):
  * **Imutabilidade de Etapa:** Ao vincular qualquer cliente ou lead a um contrato (ou ao transformar e associar contrato), o card agora permanece **rigorosamente na mesma etapa e no mesmo funil** em que já se encontrava.
  * **Eliminação de Resets:** Removida qualquer forçação de estágio (como forçar `onboarding` ou inicial) em `contractService.linkLooseLeadToContract` e em `contract_funnel_placements`.
  * **Fim de Deleção Indevida por Merge:** Extirpada a chamada a `mergeLeads` no `AdminLinkContractorModal.tsx`, garantindo que o card vinculado não seja apagado nem suma do Kanban, mantendo 100% sua visibilidade e integridade.
  * **Preservação de WhatsApps de Familiares e Dependentes:** Corrigido o `filterExtraPostSaleLeads` em `src/utils/funnelUtils.ts` e no `AdminWhatsAppWorkspaceView.tsx`. Contatos secundários e familiares (mãe, debutante, cônjuge) com telefones próprios não são mais suprimidos como se fossem duplicatas do titular pagante, garantindo que o card e a conversa de WhatsApp de cada membro da família permaneçam visíveis no Kanban de Pós-Venda e na Central de Mensagens.

- **Classificação Estrita 'Cliente no Pós-Venda' vs 'Lead Comercial' em Ativos e Busca Global** (`ui` / `ux` / `crm`):
  * **Regra Suprema Aplicada:** *"Lead é somente em funis comerciais; no pós-venda, a pessoa é classificada e tratada como Cliente."*
  * **Visão 360 da Central de Contatos (`AdminContactsView.tsx`):**
    - Criação da seção dedicada **Clientes no Pós-Venda ({count})** com ícone `ShieldCheck` (verde esmeralda), badge corporativo `CLIENTE` e botão de ação direta *"Abrir no Pós-Venda"*.
    - Seção **Leads Comerciais ({count})** restrita estritamente a oportunidades em negociação comercial, com badge azul `LEAD` e botão *"Abrir no CRM Comercial"*.
  * **Busca Universal / Command Palette (`AdminGlobalSearch.tsx`):**
    - Adicionado chip de filtro e categoria independente para **Clientes Pós-Venda** com ícone `ShieldCheck` e contagem em tempo real.
    - Seções de resultados de busca agora segregam perfeitamente clientes pós-venda (badge verde `CLIENTE`) de leads em prospecção (badge azul `LEAD`), impedindo qualquer rotulagem indevida.

- **Refinamento do Modal de Planejamento de Agendamento & Padronização Visual** (`ui` / `improvement`):
  * **Modal na Identidade do Sistema:** O `AdminAgendaAvailabilityModal.tsx` agora é um verdadeiro modal com backdrop fixo (`rgba(0,0,0,0.7)`), desfoque de fundo (`backdropFilter: blur(4px)`), card centralizado (`max-w-[1100px]`, cantos arredondados `16px` e sombra profunda), fechamento ao clicar fora e tipografia padronizada em `Inter`.
  * **Eliminação de Telas Intermediárias:** Removido o labirinto de Etapas 1 e 2. O modal abre diretamente no painel de configurações, permitindo selecionar e alternar a unidade física através de um `<select>` nativo e elegante no cabeçalho.
  * **Alternador Integrado:** Cabeçalho com seletor direto de Casa de Festa e alternador de abas entre **Visitas Comerciais** e **Degustações Gastronômicas**, além de botão de fechar (`X`) e salvamento ágil.
  * **Remoção de Círculos e Animações nas Engrenagens:**
    - No seletor de unidade do topo da Sidebar (`AdminSidebar.tsx`): Removido o círculo externo (`borderRadius: 50%`) e o giro no hover (`rotate(45deg)`), mantendo um ícone de engrenagem sóbrio e integrado ao card.
    - Na barra superior da Agenda de Eventos (`AdminVenueEventsView.tsx`): A engrenagem agora segue a linguagem visual dos controles vizinhos (formato retangular com cantos suaves `10px`, fundo translúcido e transição sutil de cor, sem rotação e sem borda circular pesada).
  * **Ajuste de Nomenclatura no Seletor de Unidades:**
    - No card do menu lateral quando nenhuma unidade individual está filtrada: alterado de "Rede Geral" para **"Todas"**.
    - No menu popover suspenso de unidades: alterado de "Todas as Unidades (Rede Geral)" para **"Todas as Unidades"**.

- **Correção de Fuso Horário nos Calendários (Bug de Virada após as 21h)** (`fix` / `core`):
  * **Causa Raiz Identificada:** O sistema calculava a data de "Hoje" e as células dos calendários utilizando `new Date().toISOString().split('T')[0]`. Como o fuso horário de Brasília é UTC-3, qualquer horário a partir das 21:00 BRT corresponde a 00:00+ UTC do dia seguinte, adiantando o marcador de "Hoje" para o dia 21 mesmo sendo 20 de novembro.
  * **Novo Utilitário Central de Datas Locais (`src/utils/dateUtils.ts`):** Criadas as funções `toLocalDateStr(d)`, `getTodayLocalStr()` e `fromLocalDateStr(s)` que extraem ano, mês e dia com base estrita no calendário e timezone local do navegador do usuário (`getFullYear()`, `getMonth()`, `getDate()`).
  * **Ajuste nas Visualizações de Calendário:** Corrigidos `AdminCalendarMonthView.tsx`, `AdminCalendarWeekView.tsx`, `AdminCalendarDayView.tsx`, `AdminVenueEventsView.tsx`, `AdminTasksKanbanView.tsx`, `AdminTasksTableView.tsx` e `AdminUnifiedCalendarView.tsx` para utilizarem data local, garantindo que o dia de "Hoje" (destaque azul) corresponda exatamente ao dia real do usuário independentemente da hora da noite.

- **Engrenagem de Planejamento de Agendamento na Barra Superior & Despoluição do Menu** (`ui` / `feature`):
  * **Engrenagem na Barra Superior de Agenda de Eventos:** Adicionado botão circular dourado com ícone de engrenagem (`Settings`) na barra superior preta (à esquerda do seletor de visualização `Mês / Semana / Dia / Lista` em `AdminVenueEventsView.tsx`).
  * **Configuração Direta de Disponibilidade:** O clique na engrenagem abre diretamente o modal oficial de Planejamento de Agendamento (`AdminAgendaAvailabilityModal`), permitindo configurar regras de visitas, degustações, capacidade máxima e horários recorrentes da unidade sem trocar de tela.
  * **Remoção de 'Compromissos' do Menu:** O item "Compromissos" foi removido da barra lateral de Pós-Venda (`postSaleItems`), concentrando a gestão de calendário e planejamento na Agenda de Eventos.

- **Central de Configurações do Sistema & Integração de Tempo de Resposta em Metas** (`ui` / `feature`):
  * **Engrenagem Circular de Configurações no Seletor de Unidades:** Substituída a setinha (`ChevronDown`) do card de Unidade do menu lateral por um botão circular elegante com o ícone de engrenagem (`Settings`). O clique no card abre o seletor de casas de festa, enquanto o clique na engrenagem conduz imediatamente à nova tela central de Configurações.
  * **Nova Tela Unificada de Configurações (`AdminSystemSettingsView.tsx`):** Unificação da gestão administrativa da rede em duas abas dedicadas e fluidas: **Unidades** (gerenciamento das casas de festa) e **Colaboradores** (gestão de equipe, cargos e convites).
  * **Despoluição do Menu Lateral (Gerência):** Removidos os itens avulsos "Casas de Festa", "Colaboradores" e "Tempo de Resposta", tornando a barra lateral muito mais enxuta, focada e intuitiva.
  * **Tempo de Resposta Integrado às Metas Recorrentes (`AdminVenueGoalsView.tsx`):** O gerenciamento de SLA de atendimento foi transferido para a tela oficial de Metas (`venue-goals`), ganhando aba dedicada (`Clock`). O parâmetro configurado no sistema (`idealMinutes`, ex: 10 min) é sincronizado e gravado automaticamente como **meta recorrente** (`isRecurring: true`) para cada unidade da rede, acompanhado do painel comparativo de conformidade e desempenho por atendente/SDR.

- **Higienização e Saneamento da Central de Contatos (Produção e Local)** (`database` / `improvement`):
  * **Preservação Estrita e Cirúrgica:** Blindados e preservados 100% dos contatos vinculados a contratos ativos homologados e todos os 27 contatos/leads reais em operação nos funis de Pós-Venda (`ERL PÓS`, `ERL ADM`, `RLZ POS`) e Comercial (`TEEN ERL`).
  * **Expurgo de Contatos Órfãos:** Removidos 308 contatos órfãos em Produção e 413 contatos residuais no ambiente Local (registros sem contrato, sem lead ativo e sem vínculo financeiro gerados em testes anteriores ou importações legadas), eliminando o risco de duplicidade de números de telefone e inconsistências em vínculos familiares.
  * **Backup Preventivo:** Cópia completa dos estados pré-limpeza salva com segurança nos registros do sistema.

- **Eliminação de Coluna Inexistente `whatsapp_phone` em `contactService.findByPhones`** (`fix`):
  * **Causa Raiz Real do Erro "Não foi possível vincular o contato":** Na função `findByPhones`, a query executava `.or('primary_phone.ilike.%...,whatsapp_phone.ilike.%...')`. No PostgreSQL / Supabase, a tabela `contacts` NÃO possui a coluna `whatsapp_phone` (possui apenas `primary_phone` e `secondary_phone`). Isso causava o erro PostgreSQL `42703 (column contacts.whatsapp_phone does not exist)`, fazendo `findByPhones` retornar vazio.
  * Em consequência, o sistema tentava recriar a Carla na tabela `contacts` via `findOrCreateContact`, estourando a restrição de unicidade `23505 (idx_contacts_master_primary_phone)`, retornando `null` em `linkFamilyMember` e exibindo o erro na tela.
  * **Correção:** Substituída a coluna inexistente `whatsapp_phone` pelas colunas reais `primary_phone` e `secondary_phone`. O contato existente da Carla é agora localizado perfeitamente e o vínculo com o contratante é executado com sucesso imediato.

- **Adaptação e Resolução Automática da Ficha do Cliente com Contrato Vinculado (`AdminClientDrawerInspector.tsx`, `contractService.ts`)** (`fix` / `feature`):
  * **Causa Raiz Identificada:** Ao tentar criar o card de cliente pós-venda a partir do contrato em `createClientFromContract`, o código tentava gravar na coluna `contract_id` da tabela `clients`. Como essa coluna não existe no schema (a relação no banco é `contracts.client_id` e `clients.migrated_to_contract_id`), o Supabase retornava erro silencioso e o card de cliente nunca era criado, fazendo com que a ficha mantivesse o status "Sem Contrato". Além disso, o card criado caía no estágio `new_lead`, que ficava oculto no Kanban quando a etapa de entrada estava desativada, fazendo o card sumir da visão de pós-venda.
  * **Correção no Schema & Etapa Inicial:** Atualizado o insert e updates em `clients` para a coluna oficial `migrated_to_contract_id` e garantido que todo card de pós-venda entre na primeira etapa operacional visível (`onboarding`), com registro automático em `contract_funnel_placements`.
  * **Vínculo Completo da Família & Contatos:** O fluxo de vinculação agora atualiza o lead solto (`leads.contact_id`), define seu parentesco (`primary_contact_role`), adiciona a pessoa ao array `clients.contacts` com seu papel familiar (ex: Mãe), registra o parentesco em `contact_dependents` e vincula o contrato ao funil de pós-venda correspondente.
  * **Busca Inteligente em Cascata (`getContractForFicha`):** O `contractService` agora realiza busca resiliente por: (1) `clientId`, (2) `contactId`, (3) `leadId` e (4) telefone/snapshot do cliente, priorizando contratos com data de evento e status aprovado.
  * **Derivação de `effectiveClient` no Inspector:** Quando o contrato é localizado pelo contato/telefone (como no caso de Carla Nogueira `+55 (21) 98283-4494`), a ficha adapta o título da festa, exibe o escudo verde "Contrato vinculado", oculta o banner dashed "Sem Contrato" e renderiza a seção `ClientContractSection` completa com data, horário, convidados, pacote e valores contratuais.

- **Blindagem Multi-Chip, Isolamento de Instâncias e Regra de Ocultação de Cards Vinculados no Kanban de Pós-Venda** (`fix` / `security`):
  * **Prioridade Absoluta da Seleção Manual de Instância (`AdminWhatsAppWorkspaceView.tsx`):**
    - Corrigido o hook `activeSenderSource`: antes, se o canal setorial (ex: "Pós venda") possuía uma instância amarrada (como POS VENDA GLORIA), o `channelExclusiveSource` anulava qualquer troca manual do usuário no seletor de instâncias do rodapé.
    - Agora, a escolha manual do usuário (`selectedSenderSourceId`) tem precedência absoluta, permitindo alternar livremente para outras instâncias ativas do funil (ex: ERL 9915).
  * **Resolução Estrita de Chip e Blindagem contra Vazamento de Mensagens (`resolveMsgChip`):**
    - Aprimorada a identificação da instância em `resolveMsgChip`: agora inspeciona metadados de nome de remetente (`senderSourceName`), prefixos de telefone (`messageId`) e a rota do arquivo no Cloudflare R2 (`/whatsapp/<uuid>/`).
    - Mensagens sem chip explícito agora pertencem estritamente ao chip de origem do atendimento e nunca são exibidas em instâncias secundárias não relacionadas. Ao alternar para o WhatsApp "ERL 9915", o chat da Carla e de outros contatos inicia completamente limpo (zero mensagens), garantindo que mensagens de voz e textos trocados pelo chip da Glória nunca vazem para outro número.
  * **Saneamento e Backfill de Metadados no Banco de Dados (`lead_activities`):**
    - Identificadas e carimbadas 21 atividades da Carla e 134 atividades de outros leads que haviam sido salvas com `metadata: {}` sem `sourceId` e `instance_id`. Todas foram mapeadas com precisão para suas respectivas instâncias oficiais.
  * **Ocultação de Contatos Vinculados no Kanban de Pós-Venda (`funnelUtils.ts`, `AdminPostSaleKanbanView.tsx`):**
    - Parametrizado `filterExtraPostSaleLeads` com a opção `{ forKanbanOnly: boolean }`.
    - **No Modo Kanban:** Leads ou contatos que já estão vinculados a contratos homologados (como titular ou membro familiar, como a Carla no contrato da Vitória/Antônio) são estritamente ocultados da visão de cards soltos ("SEM CONTRATO") no Kanban.
    - **Na Caixa de Entrada e Central de Mensagens:** Os contatos vinculados continuam 100% disponíveis para atendimento com a foto real, o badge do funil e o título do contrato vinculado ("Antônio Rodrigues • Vitória R...").

- **Exibição de Eventos Sem Horário no Modo Semana da Agenda (`AdminCalendarWeekView.tsx`, `AdminVenueEventsView.tsx`)** (`feature` / `improvement`):
  * **Nova Linha Horizontal "Sem hora" (All-Day Row):** Inserida logo abaixo do cabeçalho com os 7 dias da semana (`weekDays`), reservando espaço com gutter lateral e colunas alinhadas com o grid para listar todos os eventos do dia que não possuem horário pré-fixado.
  * **Cards Clicáveis:** Os eventos sem hora aparecem como cards compactos elegantes com a cor de destaque da casa de festa (`getTaskAccent`), ícone da categoria e clique que abre os detalhes do evento (`onOpenTask`).
  * **Suporte Robusto a Faixas Horárias:** Parse seguro com regex em `getTaskTopAndHeight` e em `AdminVenueEventsView.tsx` para tratar horários compostos como `"20:00 às 02:00"`, calculando a altura na grade horária sem gerar valores `NaN` ou quebras de posicionamento.

- **Deduplicação de Mensagens no Banco de Dados e Blindagem com Regra "Message ID é o Rei" (`lead_activities`, `AdminWhatsAppWorkspaceView.tsx`, `leadService.ts`)** (`fix` / `database`):
  * **Auditoria de Duplicatas no Banco Local:** Identificadas e expurgadas com precisão 42 atividades duplicadas idênticas em 22 leads (mensagens inseridas com 0s de diferença e UUIDs distintos durante sincronicidade de webhooks e importações legadas). O banco local agora possui **0 duplicatas**.
  * **Regra Mestra "Message ID é o Rei" no Backend (`leadService.addActivity`):**
    - Se a mensagem possui `messageId` (wamid do WhatsApp), a validação de duplicidade é **exclusivamente por ele**. Isso garante que mensagens intencionais sequenciais e rápidas enviadas pelo usuário ou cliente (ex: testes de "oi, oi, oi" seguidos no WhatsApp) entrem livremente no sistema sem nenhuma inibição, já que cada uma possui um `messageId` único gerado pela Meta/WhatsApp.
    - Se a mensagem vier **sem `messageId`** (ex: webhooks legados sem wamid ou requisições HTTP repetidas): o sistema compara o texto estritamente com a **última mensagem gravada** daquele lead. Apenas se a última mensagem for idêntica e tiver ocorrido em menos de 3 segundos (disparo duplo acidental de rede/webhook), ela é descartada.
  * **Blindagem no Front-End (`timelineActivities` em `AdminWhatsAppWorkspaceView.tsx`):**
    - Se a mensagem possui `messageId`, a validação respeita rigorosamente o `messageId` único (exibindo todos os "oi, oi, oi" sequenciais legítimos).
    - Se a mensagem não possui `messageId`, ela só é deduplicada se for idêntica à mensagem imediatamente anterior na timeline com diferença de até 3 segundos.

- **Identificação Contextual Precisa na Unidade do Lead (`AdminLinkContractorModal.tsx`)** (`improvement`):
  * **Eliminação de Fallback Entre Unidades:** Removida qualquer busca ou fallback para outras casas. A busca é 100% estrita à unidade selecionada (ex: `Espaço Rio Lounge`).
  * **Causa Raiz Identificada:** O lead do WhatsApp (`5521982834494`) chamou com final 4494, enquanto no contrato `CTR-2026-4HFHL2` do contratante Antônio constava o número `(21) 98283-4495` (com 5 no final), sem CPF nem e-mail preenchidos no lead. Como o sistema antigo só buscava por telefone/CPF/e-mail exatos, nenhum contrato era trazido de início.
  * **Descoberta Contextual Inteligente:** A busca inicial agora extrai dados presentes no próprio nome do lead (`20/11/2026` e `15A VITORIA`), localizando instantaneamente o contrato `CTR-2026-4HFHL2` (`Antônio Rodrigues • Vitória Rodrigues 15 anos`) estritamente dentro da unidade `Espaço Rio Lounge`.

- **Desassociação Inteligente de WhatsApp e Reatribuição à Mãe/Familiar (`AdminLinkContractorModal.tsx`, `contractService.ts`)** (`feature`):
  * **Cenário Real Solucionado:** Casos comuns onde o contrato jurídico foi registrado no nome do contratante titular (ex: marido), mas o WhatsApp informado é o da esposa/mãe da debutante (ou outro membro familiar).
  * **Identificação Automática na Abertura:** A busca inicial identifica o contrato pelo telefone/CPF/e-mail no ato da abertura do modal, com fallback transparente para todas as casas da rede caso o lead esteja em unidade divergente.
  * **Aviso Explicativo & Confirmação:** Ao selecionar o contrato, o sistema detecta que o WhatsApp está atualmente gravado no perfil do titular. Exibe um banner amigável de alerta com opção marcada por padrão: *"Deseja desassociar o WhatsApp do contratante ([Nome do Titular]) e vincular à [Mãe]?"*.
  * **Execução Transacional no Banco:**
    1. O contato do contratante titular tem o WhatsApp desassociado (preservando 100% de seu nome, CPF e dados jurídicos do contrato), registrando em histórico a transferência.
    2. Cria/atualiza o contato individual da Mãe com seu próprio WhatsApp e parentesco na Central de Contatos.
    3. Registra o vínculo mútuo formal entre Titular e Mãe em `contact_dependents`.
    4. Adiciona a Mãe à lista de contatos do card do cliente no pós-venda e associa as conversas do WhatsApp à esteira do evento.

- **Correção no Vínculo de Lead Solto ao Contrato (`contractService.ts`, `contactService.ts`)** (`fix`):
  * **Causa do Erro:** Quando o lead solto do WhatsApp era a **própria pessoa titular/contratante** (mesmo número ou relação 'Titular'), o sistema chamava `linkFamilyMember` tentando criar um vínculo de dependente familiar da pessoa com ela mesma na tabela `contact_dependents`. A regra interna bloqueava a auto-relação (`contact.id === parentContactId`) e retornava nulo, gerando a mensagem `"Não foi possível vincular o contato"`.
  * **Solução:** Implementada detecção de titularidade (`isSelf`). Quando o lead é a própria titular/contratante do contrato, o vínculo é associado diretamente ao card do cliente e ao contrato sem tentar registrar dependente consigo mesmo. Caso seja um familiar dependente com outro número (mãe, pai, etc.), o fluxo de dependente mútuo continua operando normalmente.

- **Busca Accent-Insensitive e Tolerância a Acentos no Supabase (`src/utils/searchUtils.ts`, `contractService.ts`, `contactService.ts`)** (`fix`):
  * **Causa do Problema:** O operador `ILIKE` nativo do PostgreSQL é sensível a acentos no Supabase, de modo que buscar por `"Vitoria"` não encontrava registros cadastrados como `"Vitória"`, e vice-versa.
  * **Solução Implementada:** Criado o utilitário `generateSearchTermVariants` que gera variações combinadas (termo sem acento, termo original, palavras separadas e versões com o curinga `_` do PostgreSQL LIKE para cada vogal acentuável ou cedilha).
  * **Resultados:** Digitar `"Vitoria"` agora localiza contratos e contatos com `"Vitória"` instantaneamente em tempo real.

- **Vínculo de Contratos Inteligente e Automático (`AdminLinkContractorModal.tsx`)** (`improvement`):
  * Identificação automática inicial por telefone (+ DDI/DDD), CPF e e-mail ao abrir o modal, sem necessidade de digitação prévia.
  * Herança e detecção do parentesco/relação previamente cadastrado no lead/cliente.
  * Seletor de Relação adicionado no topo do modal para conferência e alteração ágil antes de vincular.
  * Mensagem amigável única de orientação para busca caso nenhum contrato seja encontrado por padrão.

- **Ficha / Drawer do Cliente & Persistência de Dados Soltos (`AdminClientDrawerInspector.tsx`)** (`improvement`):
  * Campo "Relação" desimpedido para leads soltos e clientes, permitindo registrar se o contato é mãe, pai, debutante, etc. antes da conversão em contrato.
  * Persistência bidirecional garantida tanto em `client` quanto em `lead` (`customFieldValues` e `primaryContactRole`).

- **Reformulação Visual do Kanban de Pós-Venda & Abas de Canais de Contato** (`new`):
  - **Novo Card de Contrato no Kanban (`AdminContractKanbanCard.tsx`):**
    * Substituição completa de classes utilitárias ausentes por estilização inline nativa baseada nos design tokens (`var(--adm-...)`).
    * Cabeçalho integrado com menu flutuante (3 pontinhos), identificador CTR Base36 com botão copiar, tag sutil do tipo de evento (15 Anos, Casamento, etc.) e valor financeiro destacado em verde esmeralda com popover de composição contratual.
    * Diferenciação visual clara entre Contratante/Pagante (com badge de papel/parentesco) e Protagonista do Evento (com ícone e badge rosa exclusivo).
    * Sub-box de data do evento com contagem regressiva em dias, chips de funis ativos (Geral, Decoração, Cerimonial, Coreografia) e acesso rápido de atendimento.
  - **Canais Conectados no Workspace de Atendimento (`AdminWhatsAppWorkspaceView.tsx`):**
    * Remoção do rótulo estático "DECISORES:" e emojis/coroas avulsos.
    * Barra de canais de contato com abas nominais para cada participante do contrato (Contratante, Mãe, Debutante, Pai), permitindo alternar instantaneamente o destinatário ativo no WhatsApp.
    * Cabeçalho do chat sincronizado para exibir o nome e o papel real da pessoa selecionada com seu respectivo telefone.
  - **Ficha do Contrato e Higienização de Nomes (`AdminClientDrawerInspector.tsx` e `clientService.ts`):**
    * Extração inteligente do nome da aniversariante/debutante quando embutido em títulos de contratos, evitando repetição do nome do contratante em todos os campos.
    * Edição do nome da protagonista desacoplada da razão social/nome principal do contrato.
    * Extirpação definitiva de mocks legados (`48000`, `12000`, `36000`, `'Unidade Bonomo'`).

- **Consolidação da Stack Gráfica Oficial & Inteligência Visual** (`new`):
  - **Tremor & Tremor Raw:**
    * *Evolução de Faturamento:* Gráficos de área com preenchimento em gradiente suave para acompanhamento financeiro temporal e sazonalidade de vendas.
    * *Barras Comparativas SDR vs Closer:* Gráficos de barras agrupadas comparando geração de oportunidades vs fechamento por colaborador.
    * *Anéis de Metas por Unidade:* Gráficos de rosca (Donut) com tooltips flutuantes detalhando o percentual de atingimento de metas individuais por casa de festa.
  - **Apache ECharts (`echarts-for-react`):**
    * *Funis Visuais de Conversão:* Renderização de funil com quebra de rótulos em 2 linhas para exibição nítida das taxas de conversão entre etapas.
    * *Heatmaps de Atendimento WhatsApp:* Mapas de calor por dia da semana e faixa horária para identificação de horários nobres de recepção de leads.
    * *Diagramas Sankey de Origem:* Mapeamento de fluxo completo demonstrando a distribuição dos canais de entrada até o contrato homologado.

- **Pós-Venda: Arquitetura Tri-Colunar e Refinos de Usabilidade (`AdminCrmWorkspaceView.tsx` e `AdminPostSaleKanbanView.tsx`)** (`improved`):
  - **Abertura Prioritária em Modo Kanban:** Qualquer funil selecionado abre prioritariamente na visão Kanban de cartões, padronizando o ponto de partida do operador.
  - **Despoluição Visual do Funil e Toolbar do Kanban:**
    * Remoção da barra de busca duplicada na toolbar de `AdminPostSaleKanbanView.tsx` (busca unificada e concentrada exclusivamente no Command Palette `Ctrl + K`).
    * Inibição do botão avulso de 'Seleção Múltipla'.
    * Erradicação do contador redundante de rodapé (Total / Em Andamento / Realizadas).
  - **Estrutura Tri-Colunar do Workspace:**
    * *Coluna 1 (Esquerda) - Lista de Contratos:* Navegação e seleção entre contratos do funil, iniciando recuada por padrão, com botão toggle de expansão imediata com ícone do WhatsApp (substituindo os antigos botões 'Foco' e 'Conversas').
    * *Coluna 2 (Meio) - Ficha Central do Contrato:* Informações contratuais em primeiro plano, dados cadastrais, consulta ao lead de origem em modo leitura, estilização refinada de selects, toggle de recolhimento por seta na borda e seção dedicada 'Pessoas Anexadas ao Contrato' com vínculo a dependentes e grupo familiar.
    * *Coluna 3 (Direita) - WhatsApp & Gestão de Atendimento:* Módulo de WhatsApp com abas nominais para múltiplos decisores da família, timeline de Histórico, tarefas prioritárias e erradicação de abas duplicadas no topo.
  - **Categorização Estruturada de Documentos no Rodapé:** Separação e categorização de Documentos Contratuais (minutas, aditivos, contratos assinados) e Documentos do Evento (briefings, plantas, comprovantes) na aba de Documentos do Workspace de Pós-Venda.
  - **Cards com Título em 2 Linhas e Tags Coloridas:** Exibição clara de Contratante e Homenageado/Debutante em linhas dedicadas, com badges cromáticos por Tipo de Evento.
  - **Design System & Legibilidade:** Alto contraste, ausência de degradês e alinhamento visual rigoroso com o CRM comercial.

- **Saneamento e Higienização Relacional do Banco de Dados (Barney)** (`improved`):
  - Limpeza e expurgo de duplicidades históricas na base de contratos.
  - Consolidação de vínculos reais e íntegros entre contratos (`contracts`), contatos únicos (`contacts`) e posicionamentos nos funis de pós-venda (`contract_funnel_placements`).

- **Refinamento do Funil Comercial & Regra de Unicidade de Agendamentos** (`improved`):
  - **Fluxo Sequencial Oficial de 6 Etapas:** Leads Totais -> Leads Qualificados -> Agendamentos (com hover detalhando Visita vs Degustação) -> Agendamentos Realizados -> Propostas -> Contratos Assinados.
  - **Regra de Unicidade de Agendamentos:** Visita e degustação para o mesmo lead contam como 1 único lead agendado nas métricas globais.

- **Central de Visitas Técnicas & Degustações com Voucher Oficial** (`improved`):
  - **Planilha com Divisores de Data Úteis:** Exibição cronológica agrupada exclusivamente por dias com compromissos reais, sem datas vazias.
  - **Controle Real de Acompanhantes (Pax):** Registro e exibição da contagem real de convidados e acompanhantes cadastrados, sem imposição de teto ou trava rígida.
  - **Local Simplificado da Casa:** Nomenclatura direta pela unidade física da Casa de Festa, sem subdivisões internas.
  - **Status Integrados:** Tags visuais: *Agendado*, *Confirmado*, *Remarcado* e *Realizado*.
  - **Voucher Oficial para WhatsApp:** Comprovante visual com logo da casa, endereço completo, foto e nome do Closer, dados do anfitrião, total de acompanhantes e disparo rápido no WhatsApp.

- **Dashboard Executivo & Suporte ao Modo Claro** (`improved`):
  - Interface do Dashboard executivo homologada com suporte completo à alternância entre modo escuro e modo claro, com alto contraste e legibilidade.

- **Padronização Tipográfica Global (`Inter, sans-serif`)** (`improved`):
  - Aplicação estrita da família tipográfica `Inter, sans-serif` em todas as visões administrativas, modais e componentes.

- **Motor de Backend: Unicidade 1:N de Origens & Contratos Multi-Funil** (`new`):
  - **Relacionamento 1:N de Origens:** Unicidade garantida na distribuição de origens para múltiplos funis comerciais.
  - **Ingestão Atômica Base36 (Lead + Contato):** Entrada simultânea de dados cadastrais vivos de pessoas e oportunidades de vendas com códigos alfanuméricos de alta entropia.
  - **Contratos Multi-Funil com Conclusão Global:** Estrutura relacional para acompanhamento de contrato em múltiplos funis de pós-venda, com sincronização global de conclusão.

- **Command Palette Unificado & Busca Universal (`AdminGlobalSearch.tsx`)** (`new`):
  - Interface overlay via atalho universal (`Ctrl + K`) construída sobre `cmdk`, sem duplicidade de digitação e com filtros por Etiqueta, Colaborador e Unidade.

- **Arsenal de Performance e Modernização de UI** (`improved`):
  - Integração de `sonner`, `cmdk`, `@tanstack/react-table`, `@formkit/auto-animate`, `motion` e `echarts` com `<Toaster>` global em `AdminPortal.tsx`.

- **Higienização de Vocabulário Técnico na Interface** (`improved`):
  - Remoção completa de termos de infraestrutura técnica nas interfaces visuais de contratos e uploads.

- **Gestão Oficial de Contratos & Mesa de Homologação (`AdminContractsView`)** (`new`):
  - Título oficial "Contratos", abas "Pendentes de Aprovação" e "Contratos Aprovados", drawer lateral com atalho ao funil comercial, fluxo de devolução com tarefa prioritária de 24h para o Closer, botões 100% sólidos e snapshot eterno de responsáveis.

- **Central de Contatos Unificada & Identificador Base36** (`new`):
  - Entidade unificada com código Base36 (`CONT-XXXXXXXX`), histórico vivo e suporte a dependentes sem duplicação de pessoas.

- **Isolamento Nativo de Queries e Mutations por master_id** (`improved`):
  - Filtro explícito de `master_id` em todas as consultas e mutations do Supabase.

- **Auditoria de Integridade & Erradicação de Mocks (Diretriz Marshall Eriksen)** (`improved`):
  - Detecção e erradicação de resquícios de dados mockados em `AdminVisitsTastingsView.tsx` e alimentação 100% dinâmica via Supabase.
  - Extirpação definitiva de fallbacks mockados em `AdminClientDrawerInspector.tsx`:
    * Remoção dos valores fictícios hardcoded de `R$ 48.000` (Valor Contratual), `R$ 12.000` (Valor Pago) e `R$ 36.000` (Saldo Devedor), substituídos pelo consumo estrito das colunas financeiras reais do contrato.
    * Substituição do badge fixo de "15 Anos" pelo tipo dinâmico do evento (`contract.event_type`).
    * Substituição do fallback estático de unidade pelo nome real da casa de festa/venue associada.

- **Conformidade Estrita com Design System Corporativo** (`improved`):
  - Remoção de emojis em modais administrativos e uso exclusivo de `lucide-react`.

- **Reestruturação e Ergonomia do Menu Lateral (Sidebar)** (`improved`):
  - Scroll independente do miolo, avatar circular do usuário, logo blindada e unificação dos menus 'Contratos' e 'Agenda de Eventos' exclusivamente no Pós-Venda.

- **Vínculo Rápido de Contrato e Tratamento de Clientes sem Contrato no Pós-Venda** (`new`):
  - **Identificação Correta do Cliente sem Contrato:**
    * O nome exibido no topo do workspace de atendimento é estritamente o nome da pessoa que entrou em contato (em vez de títulos de contratos ou códigos).
    * O card de dados pessoais na ficha passa a se intitular "Cliente" com ícone `<User />` (em vez de "Contratante / Pagante"), com placeholder "Nome do cliente...".
    * Remoção da badge "Decisor Principal" quando o cliente não possui contrato vinculado.
    * Extirpação completa de badges com texto `indefinido` no cabeçalho e canais de contato.
  - **Eliminação de Duplicidades e Co-pagantes Fantasma:**
    * Blindagem de filtros para impedir que o número de telefone e o nome do cliente principal sejam exibidos novamente abaixo como "Co-pagante / Decisor".
    * Correção em `AdminStateContext.tsx` para não gerar contatos duplicados em `contacts` ao criar leads por mensagens recebidas.
  - **Auditoria e Correção Relacional em Banco de Dados:**
    * Revisão e limpeza executada no Supabase em todos os 24 leads do pós-venda sem contrato, removendo contatos fantasmas em `contacts` que duplicavam o telefone do lead e higienizando papéis para `cliente`.
  - **Botão de Vínculo Interno na Ficha (`AdminClientDrawerInspector.tsx`):**
    * Adicionado botão com ícone `Link2` ao lado da badge "Sem contrato" no cabeçalho da ficha do cliente/lead.
    * Adicionado banner pontilhado convidativo na aba "Ficha" para leads soltos sem contrato, permitindo vincular diretamente a um contrato aprovado existente.
  - **Ação Direta no Cabeçalho do Chat WhatsApp (`AdminWhatsAppWorkspaceView.tsx`):**
    * Adicionado botão de ação rápida "Vincular Contrato" no cabeçalho da conversa de WhatsApp quando o cliente ativo no pós-venda não possui contrato vinculado.
  - **Modal Inteligente de Vínculo e Fusão Familiar (`AdminLinkContractorModal.tsx`):**
    * **Busca Inicial Direcionada aos Dados do Cliente:** Ao abrir o modal, o sistema pesquisa especificamente os identificadores da cliente em foco (WhatsApp/telefone com 8+ dígitos, CPF e e-mail). Se houver contrato correspondente (como o da Carla), ele já aparece de imediato sem despejar listas cegas da unidade e economizando egress do Supabase.
    * **Mensagem Única Consolidada de Não Encontrado:** Eliminação de avisos duplicados ou redundantes. Quando o cliente não possuir contrato prévio, exibe exclusivamente uma mensagem clara, sutil e amigável orientando a buscar por data do evento, debutante, CPF ou contratante titular.
    * **Eliminação de Contadores Desnecessários:** Remoção de contagens brutas em parênteses no cabeçalho da lista (`Contratos aprovados (62)`), mantendo apenas títulos limpos (`Contratos identificados para este cliente` ou `Resultados da busca`).
    * **Diagnóstico e Correção de Resolução de Master ID:** Identificada a causa raiz de nenhum contrato ser retornado no modal. A propriedade `scopedMasterId` era declarada internamente no contexto mas não havia sido exposta na interface `AdminContextType` nem no valor do `AdminStateContext.Provider`, fazendo com que os hooks de carregamento abortassem silenciosamente. Agora o `scopedMasterId` é formalmente exposto pelo contexto e o modal possui fallback multinível robusto (`effectiveMasterId`: contexto, `lead.masterId`, `client.masterId`, `currentUser.masterId/id`).
    * **Filtro Universal por Unidade e Seletor Dinâmico:** Isolamento absoluto por `master_id` (`scopedMasterId`) e unidade padrão selecionada automaticamente pelo funil/lead atual, com seletor no topo permitindo alternar de forma transparente entre as casas da rede ou ver todas as unidades da rede do cliente sem risco de vazamento.
    * **Busca Dinâmica Instantânea em Tempo Real (0 ms):** Pré-carregamento dos contratos aprovados da unidade em memória com filtro dinâmico instantâneo na digitação (on input), casado com busca complementar debounced no Supabase.
    * **Restauração e Blindagem do Banco de Contratos Aprovados:** Restauração completa dos 234 contratos da base (209 contratos para o Espaço Rio Lounge), preenchendo datas e titulares, solucionando a ausência de contratos decorrente do reset de teste anterior.
    * **Detecção Inteligente de Padrões na Digitação:** Suporta busca por dígitos de CPF (mesmo sem pontos ou parciais), dígitos de telefone (com/sem DDD e formatação), variações de datas (`DD/MM`, `DD/MM/AAAA`, anos como `2027`, com ou sem barras como `20112026`), nome da debutante/aniversariante (`birthdayPersonName` / `birthday_person_name`), titular (`payerName` / `payer_name`), títulos de contratos e busca composta com múltiplos termos (ex: "Carla 20/11", "Vitoria 2026").
    * **Card Resumo Enriquecido:** Exibe o contrato selecionado com código CTR, nome do titular, aniversariante/tipo de festa, telefone formatado, data do evento e unidade física vinculada.
    * **Seleção Expandida de Parentesco/Papel:** Lista completa de relações familiares (Mãe, Pai, Titular/Contratante, Aniversariante/Debutante, Noivo(a), Cônjuge, Avó, Avô, Tia, Tio, Madrinha, Padrinho, Responsável Financeiro, Outro).
    * **Integração com `contractService.linkLooseLeadToContract`:** Ao confirmar o vínculo, o cliente vira participante/dependente do contrato, sua conversa de WhatsApp é unificada no mesmo atendimento e a interface transiciona instantaneamente para a conversa do grupo familiar.

- **Rastreabilidade de Instâncias, Direção de Mensagens e Indicador de Mensagens Encaminhadas no WhatsApp** (`improved`):
  - **Auto-Scroll Confiável para o Fim da Conversa (`AdminWhatsAppWorkspaceView.tsx`):**
    * Correção do problema onde a conversa abria parada no meio do histórico exigindo rolagem manual.
    * A dependência anterior monitorava incorretamente `selectedLead.activities` (que chegava atrasada ou vazia), disparando antes da montagem real dos balões de mensagem.
    * O auto-scroll agora monitora `timelineActivities.length` e alterações de contato/instância, com cadência multifásica (50ms, 150ms, 350ms e 700ms) para compensar tempo de renderização de áudios e imagens.
    * Diferenciação física de rolagem intencional do usuário (`onWheel` e `onTouchMove`): redimensionamentos de layout ou chegada assíncrona de mensagens não travam mais o scroll no meio do caminho, garantindo que o chat sempre abra exatamente nas mensagens mais recentes (no final).
    * Cada instância conectada ganha uma tonalidade sutil e elegante exclusiva no fundo do chat (bege clássico `#EFEAE2`, verde pastel WhatsApp `#E3ECE7`, azul celeste suave `#E5EEF5`, lilás discreto `#ECE8F3` e areia âmbar `#F5EFE6`).
    * Adaptação correspondente de alto contraste para o modo escuro (`#0B141A`, `#0A1815`, `#0B1520`, `#14121F`, `#1A160E`).
    * Proporciona sensação visual imediata de troca de ambiente de WhatsApp sem comprometer a legibilidade dos balões de mensagens.
  - **Badge Flutuante de Identificação no Topo do Chat:**
    * Componente pill flutuante com blur translúcido fixado no topo da conversa com avatar/foto oficial da instância, indicador verde de status online, nome da instância em negrito e telefone formatado.
    * Fica discretamente posicionado no topo sem atrapalhar a rolagem e garantindo identificação instantânea de qual WhatsApp está emitindo e recebendo mensagens.
  - **Isolamento Total de Conversas por Instância em Todos os Funis:**
    * Comportamento estendido e validado para **Comercial, Pós-Venda e Financeiro**: ao alternar a instância de envio, a visualização isola estritamente as mensagens trafegadas por aquele número, deixando a conversa limpa para nova interação.
  - **Descoberta e Tratamento de Mensagens Encaminhadas (`isForwarded`):**
    * Diagnóstico da mensagem de buquês da cliente Carla (`5521982834494`), onde o texto "Oi Carla..." foi na realidade uma mensagem **encaminhada** pela cliente a partir de um fornecedor externo de flores (`isForwarded: true`).
    * Implementação da badge oficial `↪ Encaminhada` no topo dos balões de mensagens do chat (com ícone `Forward` em itálico), deixando evidente quando qualquer contato repassou mensagens de terceiros.
    * Captura e persistência do campo `isForwarded` no webhook da UAZAPI e nos serviços de sincronização.
  - **Isolamento Total de Conversas por Instância (Multi-Chip):**
    * Quando um funil ou unidade possui mais de uma instância de WhatsApp configurada (ex: `POS VENDA GLORIA` e `ERL 9915`), a alternância de instância no seletor isola rigorosamente as conversas.
    * Ao selecionar uma nova instância (ex: `ERL 9915`), a conversa do chip anterior é ocultada e o chat abre 100% limpo, operando como uma nova janela de atendimento dedicada para o novo número.
    * As mensagens enviadas e respostas recebidas para aquele número específico são roteadas e mantidas com exclusividade dentro da conversa daquela respectiva instância.
  - **Identificação da Instância no Hover e Preservação do Avatar Oficial:**
    * Manutenção do ícone oficial do WhatsApp (`WhatsAppBrandIcon`) nos balões de mensagens enviadas externamente pelo celular ou WhatsApp Web oficial (`isExternalWa`), evitando confusão visual com avatares de colaboradores do sistema.
    * Tooltip detalhado em hover no nome do autor, no balão e no badge de disparo, identificando com precisão a instância responsável: `App/Web • [Instância] • [Telefone]`.
  - **Correção Visual no Popover de Seleção de Instâncias:**
    * Expansão da largura do popover para 420px-480px com espaçamento arejado e `whiteSpace: 'nowrap'`.
    * Eliminação completa de quebras indesejadas nos nomes das instâncias (ex: `POS VENDA GLORIA`), badges de unidade (`Espaço Rio Lounge`) e botão de status de conexão (`Online`).
  - **Recomendação Automática do Chip pela Última Interação da Conversa:**
    * Implementação da função `lastInteractionSourceId` no `senderResolver.ts`.
    * Ao abrir qualquer conversa, o seletor de envio no rodapé pré-seleciona automaticamente a **última instância conectada** que trocou mensagem com o contato (seja enviada por celular, WhatsApp Web, sistema ou recebida).

- **Exibição da Foto de Perfil do WhatsApp nos Cards do Pós-Venda e Novo Placeholder Clean** (`improved`):
  - **Redesign do Avatar Sem Foto (`SafeAvatar.tsx`):**
    * Eliminação completa de fundos e gradientes coloridos pesados em contatos sem foto cadastrada.
    * Novo padrão minimalista e elegante: círculo com borda tracejada (`1.5px dashed var(--adm-border, #94A3B8)`), fundo neutro suave (`rgba(148, 163, 184, 0.10)`) e iniciais em tipografia discreta (`#64748B`), transmitindo com sutileza a percepção deliberada de "sem foto cadastrada/pendência" sem carregar o visual dos cards e listas.
  - **Avatar Dinâmico com Foto no Card de Pessoa (`ClientPersonKanbanCard.tsx`):**
    * Substituição do ícone cinza genérico de usuário (`<User />`) pelo componente `SafeAvatar` de 34px.
    * Mapeamento do `avatarUrl` do contato a partir dos metadados do WhatsApp e Cloudflare R2 (`avatarUrl`, `photoUrl`, `custom_field_values.avatarUrl`), exibindo a foto de perfil real da cliente no Kanban de pós-venda.
  - **Avatar do Contratante nos Cards de Contrato (`AdminContractKanbanCard.tsx`):**
    * Adicionado `SafeAvatar` no Bloco 2 do card de contrato, exibindo a foto do titular/contratante ao lado do título e do decisor principal.
  - **Foto de Perfil na Visão em Lista do Pós-Venda (`AdminPostSaleKanbanView.tsx`):**
    * Inclusão do `SafeAvatar` de 30px na coluna de nome da protagonista/cliente da tabela da visão em lista, mantendo consistência visual completa.

- **Reorganização do Menu Lateral, Seletor de Unidades e Modo "Ver com os Olhos de"** (`improved` / `ui`):
  - **Engrenagem na Mudança de Unidade (`AdminSidebar.tsx`):**
    * Adicionado botão de engrenagem simples (`Settings` de `lucide-react`) integrado ao seletor de unidades para acesso imediato com 1 clique à Central de Unidades e Colaboradores.
  - **Novo Fluxo de Visualização "Ver com os Olhos de" (Impersonation):**
    * Removido o botão antigo do menu lateral ("Olhos do Colaborador").
    * Adicionada a ação "Ver com os olhos de" diretamente no menu de 3 pontinhos (`...`) de cada colaborador na aba Colaboradores (`TeamDirectory.tsx`) e no perfil (`CollaboratorProfile.tsx`).
    * Card de status posicionado logo abaixo do dropdown de unidades no sidebar: exibe avatar oficial do colaborador (`SafeAvatar`), nome completo, label "Vendo com os olhos" e botão `X` para cancelar e retornar à visão nativa a qualquer momento.
  - **Reordenação das Seções do Menu Lateral:**
    * **Financeiro** posicionado logo após Pós-Venda com badge destacada "Em Desenvolvimento".
    * **Gerência** reordenada com badge "Em Breve".
    * **Marketing** posicionado no final do menu com badge "Em Breve".

- **Subida Segura do Financeiro em Modo Leitura e Blindagem de Edição** (`finance` / `security`):
  - **Banner Persistente de Desenvolvimento:** Exibido no topo do funil financeiro, aprovação de pagamentos e modais de recebíveis com aviso explícito de que o módulo está ativo para conferência de métricas, parcelas e cálculos.
  - **Bloqueio de Edição e Ações Interceptadas:** Botões de aprovação de contratos, reprovação, salvamento de rascunho de plano, baixa de parcelas, renegociação e cancelamento travados; ao clicar, o sistema exibe toast informativo orientando que a área está em desenvolvimento e nenhuma alteração pode ser realizada no momento.
  - **Carga de Dados de Contratos, Clientes e Contatos para Produção:**
    * Gerado script de dados `supabase/migrations/DADOS_CONTRATOS_CLIENTES_R2_PRODUCAO.sql` contendo 257 contatos, 218 clientes, 218 contratos com preços, faturamento e URLs permanentes no Cloudflare R2, 218 colocações em funis de pós-venda e 218 registros de revisão financeira.

