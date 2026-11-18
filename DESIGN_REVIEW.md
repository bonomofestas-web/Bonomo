# DESIGN_REVIEW — F5 System

Auditoria **estática** (somente leitura): métricas por grep + leitura de trechos. Nada foi renderizado no navegador. Itens marcados **[validar]** dependem de ver a tela. Nenhum código foi alterado.

Identidade preservada: tokens `--adm-*` em `src/styles/globals.css` (sidebar dark `--adm-bg-sidebar: #0B111A`, área de trabalho clara, accent ouro `--adm-accent`, ciano `#06B6D4`/`#14A9D7`, verde `#10B981`). Nenhuma sugestão abaixo altera paleta.

---

## 0. Achados transversais (afetam todas as telas)

Estes se repetem em quase todo módulo e concentram o maior ganho por esforço.

| # | Achado | Evidência | Impacto |
|---|---|---|---|
| T1 | **Sem foco visível para teclado.** 306 usos de `outline: none` inline; único `:focus` global é `.adm-input` (`globals.css:456`). Nenhum `focus-visible` em botões/cards/linhas clicáveis. | grep em `src/components` | Acessibilidade e percepção de polimento |
| T2 | **Hover feito em JS** (`onMouseEnter/Leave` mutando `style`): 44 só no WhatsApp, 24 no Kanban, 29 no LeadInspector. Não funciona em touch, não tem `:active`, polui o JSX e é fácil esquecer o `onMouseLeave`. | `AdminCrmKanbanView.tsx:2167` | Inconsistência de estados, manutenção |
| T3 | **Skeletons praticamente inexistentes.** Só `BenefitCard` e `ClaimModal` usam `animate-pulse`. Há `@keyframes shimmer` em `index.css:461` sem uso nas telas admin. Carregamento é texto/spinner (Venues 30 menções, WhatsApp 31) ou nada (Kanban, Dashboard, Home, LeadsList = 0). | grep | Telas "piscam" vazias antes dos dados |
| T4 | **52 `alert()` e 21 `confirm()` nativos** (Kanban 5, FunnelSettings 5, MQL 4, WhatsApp 9, AgendaAvailability 5, SLA 3…). Quebram a identidade (caixa cinza do SO) e bloqueiam a thread. Já existe `AdminConfirmModal` para reaproveitar. | `AdminCrmKanbanView.tsx:1363,1392,1403,1410,1429` | Alto: é o ponto mais "amador" do produto |
| T5 | **Escala tipográfica fragmentada.** ~25 tamanhos em `rem` quase iguais: 0.62, 0.64, 0.66, 0.68, 0.70, 0.72, 0.74, 0.76, 0.78, 0.80, 0.82, 0.84, 0.86, 0.88. Texto de 0.62–0.66rem (~10px) é frequente (173+177+134 ocorrências). | grep fontSize | Hierarquia fraca, legibilidade em telas densas |
| T6 | **Fontes misturadas.** Plus Jakarta Sans (global), Inter (`index.css`), Poppins (139), Cinzel (75), Montserrat (46) em `fontFamily` inline. Duas `@import` do Google Fonts concorrentes (`index.css:1`, `globals.css:1`). | grep fontFamily | Inconsistência entre telas; peso de carregamento |
| T7 | **Cores hardcoded** em vez de tokens: `#10B981` 697x, `#EF4444` 447x, `#64748B` 411x, `#94A3B8` 338x, `#F59E0B` 232x. Quebra o tema claro/escuro e dificulta ajuste de contraste. | grep hex | Manutenção; risco de contraste |
| T8 | **Contraste de texto auxiliar.** `#94A3B8` sobre fundo claro (~2.6:1) usado como texto: 16x Kanban, 18x LeadInspector. Reprova WCAG AA (4.5:1). **[validar]** | grep | Legibilidade |
| T9 | **Escala de z-index caótica:** 9999 (61x), 99999 (38x), 10000, 1200, 1100, 1000, 999. Modais empilhados podem ficar atrás uns dos outros. | grep zIndex | Bugs intermitentes de sobreposição **[validar]** |
| T10 | **Truncamento ausente** em vários nomes: `ellipsis` = 0 em Contracts, Sources, Benefits, Tasks Workspace, UnifiedCalendar, LeadsList, MQL, Debutante Detail, VenueGoals. Nomes longos de cliente/funil/casa vazam do card. **[validar]** | grep | Layout estourado |
| T11 | **Telas sem empty state** (0 menções a "nenhum/vazio"): Home (1 só), Tasks Workspace, Unified Calendar, Master Dashboard, VenueGoals, Team, SLA, DevFeatureFlags, calendários Dia/Semana/Mês. | grep | Tela em branco sem orientação |
| T12 | **Densidade mista de raio/sombra.** Raios inline variados (6/8/10/14/20px) sem escala; sombras definidas caso a caso. | amostras | Percepção de acabamento |

---

## 1. Workspace

### 1.1 Home — `AdminHomeView.tsx` (1538 linhas)
**Bugs & Inconsistências**
- Empty state de tarefas só em texto (`:732`), sem ícone/CTA; demais blocos sem tratamento de vazio.
- Sem skeleton/loading (0 referências): cards de KPI aparecem zerados e "pulam" quando os dados chegam. **[validar]**
- Data formatada manualmente (`:884`, `split('-').reverse().join('/')`) enquanto outras telas usam `toLocaleDateString`: formatos podem divergir.

**Refinamento Estético**
- Hierarquia: título de seção e valor de KPI com tamanhos próximos (0.96rem vs 1.2rem no Dashboard); abrir mais diferença (valor 1.5rem/800, rótulo 0.72rem uppercase com tracking).
- Respiro entre cards: padronizar gap 16/20px; hoje varia por bloco.
- Hover/focus nos itens de tarefa clicáveis.

**Evolução de Componente**
- Lista de tarefas "Ok" → "Excelente": agrupar por Atrasadas / Hoje / Próximas com contador no cabeçalho do grupo, em vez de abas que escondem as atrasadas.
- Empty state: ícone lucide + frase + botão "Nova tarefa".

### 1.2 Tarefas — `AdminTasksWorkspaceView.tsx`, `tasks/AdminTasksTableView.tsx`, `AdminTasksKanbanView.tsx`, `AdminTaskDetailModal.tsx` (4199 linhas), `AdminTaskModal`, `AdminTaskStatusDrawer`, `AdminTaskCompletionModal`
**Bugs & Inconsistências**
- Workspace: 0 ellipsis, 0 empty, 0 loading. Título de tarefa longo estoura card/linha. **[validar]**
- Tabela (1848 linhas): 4 ellipsis para muitas colunas; colunas de responsável e vínculo provavelmente quebram linha.
- `AdminTaskDetailModal` com 4199 linhas e 3+ colunas de informação: risco de rolagem aninhada.

**Refinamento Estético**
- Prioridade/status hoje por cor; adicionar ícone ou rótulo para não depender só de cor.
- Linha da tabela: altura fixa, hover de linha inteira, cabeçalho sticky com sombra sutil ao rolar.

**Evolução de Componente**
- Card de tarefa do Kanban: reorganizar em 3 linhas (título 2 linhas máx / vínculo lead / prazo + avatar) e mover prioridade para barra lateral de 3px, reduzindo badges empilhadas.

### 1.3 Agenda e Calendário — `AdminUnifiedCalendarView.tsx`, `tasks/AdminCalendar{Day,Week,Month}View.tsx`, `AdminAppointmentsView`, `AdminAppointmentModal`, `AdminScheduleCommitmentModal` (2122), `AdminAgendaAvailabilityModal` (4755), `AdminAgendaUnavailableModal`, `AdminVisitsTastingsView`, `AdminVenueEventsView`
**Bugs & Inconsistências**
- Calendários Dia/Semana/Mês e Unified: 0 empty state. Dia sem compromissos fica um grid vazio.
- `AdminAgendaAvailabilityModal`: 5 `alert()` (`:545,549,915,980,1011`). O texto de `:915` é longo e instrucional, impróprio para alert.
- Eventos sobrepostos na Semana/Dia: sem indicação "+N" **[validar]**.

**Refinamento Estético**
- Linha "agora" no Dia/Semana com cor de destaque e bolinha; hoje no Mês com anel, não só fundo.
- Eventos do mesmo tipo com a mesma cor de barra lateral; legenda fixa no topo.

**Evolução de Componente**
- Modal de disponibilidade (4755 linhas): dividir visualmente em passos (Período → Horários → Revisar) com validação inline, trocando os alerts por mensagens junto ao campo.

### 1.4 Follow-ups — `AdminFollowUpsView.tsx`
**Bugs:** 0 hover, 1 ellipsis. **Micro-UI:** agrupar por atraso (Hoje/Atrasados/Próximos). **Evolução:** mostrar o último trecho da conversa e canal (WhatsApp) no card para decidir sem abrir o lead.

---

## 2. Comunicação / WhatsApp

### 2.1 Workspace WhatsApp — `AdminWhatsAppWorkspaceView.tsx` (14371 linhas)
**Bugs & Inconsistências**
- Lista de conversas (`:5895–5960`): o padrão está bom (ellipsis, `minWidth: 0`, badge de não lidas). Problema: o badge usa `minWidth: 18` + padding fixo; contagens `99+` não são tratadas (renderiza `{lead.unreadCount}` cru, `:5953`). **[validar]**
- Linha inferior do item tem etiquetas com `flexWrap: 'wrap'` (`:5959`): com várias etiquetas, o item cresce e a lista fica de alturas desiguais, "excesso de badges".
- 9 `alert()`; 44 hovers por JS (T2); 0 `focus-visible`.
- Cores de tipo de mídia hardcoded por tipo (verde/azul/rosa/roxo, `:5909–5915`): quatro cores para ícones de 11px.

**Refinamento Estético**
- Item da lista: separar visualmente "não lida" (barra lateral 3px verde + nome em 700) em vez de só cor do horário.
- Ícones de mídia numa única cor neutra; só áudio em destaque.
- Bolhas: agrupar mensagens consecutivas do mesmo remetente com raio reduzido entre elas; separador de data sticky.
- Composer: estado de foco do campo com anel do accent; contador/atalho de `/` (mensagens rápidas) visível.

**Evolução de Componente**
- Item de conversa: limitar a 2 etiquetas + "+N", avatar do responsável fixo à direita.
- Skeleton de lista (6 linhas) e de bolhas no carregamento do histórico (hoje só texto/spinner).
- Arquivo de 14k linhas: extrair `ConversationListItem` e `MessageBubble` ajudaria a padronizar estados (fora do escopo visual, mas é o que destrava T2).

### 2.2 Modais — `AdminWhatsAppConnectModal`, `AdminWhatsAppSyncModal`, `AdminWhatsAppHistoryTriageModal`, `WhatsApp*Message`, `WhatsAppAudioMessage`
**Bugs:** exibição de estado de conexão deve ser inequívoca (QR / conectando / conectado / erro) **[validar]**. **Micro-UI:** progresso do sync com barra e contagem "N de M". **Evolução:** triagem de histórico com seleção em massa e pré-visualização da última mensagem.

### 2.3 Mensagens Rápidas — `AdminQuickMessagesView`, `AdminQuickMessageModal`
**Bugs:** 0 ellipsis, mensagens longas esticam o card. **Micro-UI:** keyword em chip monoespaçado (`/ola`) e preview de 2 linhas. **Evolução:** ativar/desativar por toggle direto na linha (hoje exige abrir modal) e busca.

---

## 3. Comercial / Funis

### 3.1 Funil Kanban — `AdminCrmKanbanView.tsx` (5918), `AdminCrmWorkspaceView`
**Bugs & Inconsistências**
- 5 `alert()` para regras de negócio (`:1363,1392,1403,1410,1429`), com textos longos ("Regra do CRM: A coluna de entrada é exclusivamente…"). São mensagens de bloqueio de drag-and-drop: deveriam ser toast/inline no próprio card.
- Visão de tabela (`:5130–5175`): tamanhos 0.64/0.72/0.74rem convivendo na mesma célula; código do lead em 0.64rem accent (baixo contraste, T8). Aparece prefixo `CLI-`/`LEAD-` montado por `replace` na UI, texto técnico visível.
- Fallbacks técnicos na UI: `'LEAD-NOVO'`, `'CLI-NOVO'`, `'Pacote Padrão'`, `'Sem marcação'`.
- Coluna Origem empilha `{age} anos ({group})` + badge de origem; com Responsável e SLA a linha tem 4+ elementos coloridos.
- Sem skeleton nem estado de carregamento (0 referências).

**Refinamento Estético**
- Card do Kanban: reduzir a no máximo 3 sinais coloridos (SLA, origem, não atribuído) e o resto em texto neutro.
- Coluna: cabeçalho com contador e soma de valor em tipografia tabular; cor de topo de 3px da etapa.
- Estado de arrastar: sombra elevada + leve rotação; drop zone com borda tracejada do accent.

**Evolução de Componente**
- "Não atribuído" em âmbar (`#FBBF24`) é bom sinal; transformar em botão "Assumir" no próprio card.
- Empty de coluna: "Arraste leads para cá" em vez de coluna em branco **[validar]**.

### 3.2 Lead — `AdminLeadInspector.tsx` (7752), `AdminLeadDetailModal`, `AdminLeadsListView` (2174), `AdminNewLeadModal`, `AdminMergeLeadModal`, `AdminTransferLeadVenueModal` (1130), `AdminLeadActionModals`, `AdminLostReasonModal`, `AdminArchiveReasonModal`, `AdminDeleteLeadModal`, `AdminLeadMissingFieldsModal`, `AdminLeadGoalModal`, `CloseDealValueModal`
**Bugs & Inconsistências**
- Inspector: 564 estilos inline e 1 `className`; 18 usos de `#94A3B8` (T8). 0 skeleton.
- `AdminLeadsListView`: 0 ellipsis, 2 `alert()`.
- Muitos modais pequenos de ação com layouts próprios: risco de larguras, paddings e botões primários divergentes **[validar]**.

**Refinamento Estético**
- Inspector: seções colapsáveis com cabeçalho consistente (ícone + título + ação); dividir por abas Resumo / Conversa / Histórico / Contrato.
- Modais de ação: padronizar largura (420/560/720), rodapé com botões alinhados à direita, primário à direita.

**Evolução de Componente**
- Um `ModalShell` único (cabeçalho, corpo, rodapé) eliminaria divergência entre ~25 modais.
- Campos obrigatórios faltantes (`MissingFieldsModal`): destacar o campo no formulário em vez de listar em modal.

### 3.3 Configuração de Funil — `AdminFunnelSettingsView.tsx` (5246), `AdminFunnelDeleteModal`, `AdminSourceFunnelSelectModal`
**Bugs:** 5 `alert()`, 16 estados vazios (bom), 13 hovers JS. Tela de 5k linhas com reordenação de etapas: sem indicação clara de arrastar. **Micro-UI:** alça de drag visível, cor da etapa como bolinha editável. **Evolução:** pré-visualização do funil ao lado do editor.

### 3.4 MQL / SLA — `AdminMqlConfigView` (1769), `AdminSlaSettingsView`
**Bugs:** 4 e 3 `alert()` respectivamente; MQL 0 ellipsis. **Micro-UI:** sliders/steppers com valor numérico alinhado. **Evolução:** mostrar "efeito" da regra (ex.: "42 leads seriam MQL com este critério") em tempo real.

---

## 4. Contratos / Pós-venda

### 4.1 Contratos — `AdminContractsView.tsx` (1642), `AdminContractKanbanCard`
**Bugs:** 0 ellipsis; razão social/nome de cliente longos estouram o card **[validar]**. Loading é texto (8 menções), sem skeleton. **Micro-UI:** valor do contrato em tipografia tabular, status com ícone, código `CTR-AAAA-XXXXXX` em chip discreto. **Evolução:** card em 3 linhas (cliente / evento+data / valor+status) e selo "Aprovado · imutável" com cadeado, reforçando a regra de negócio.

### 4.2 Pós-venda — `AdminPostSaleKanbanView` (3259), `AdminPostSaleChannelModal`, `AdminCreatePostSaleFunnelModal`, `AdminClientsListView`, `AdminVipJourneyUnifiedView`
**Bugs:** `AdminCreatePostSaleFunnelModal:58` usa `alert()` para campo vazio (validação deveria ser inline). Lista de clientes 1 ellipsis. **Micro-UI:** diferenciar visualmente do funil comercial (ciano `#06B6D4` já usado: aplicar também ao cabeçalho da coluna). **Evolução:** barra de progresso da jornada VIP no card.

### 4.3 Inspectores de cliente — `AdminClientInspector` (3941), `AdminClientDrawerInspector` (3152), `AdminNewClientModal`
**Bugs:** dois inspetores grandes com responsabilidade sobreposta (drawer x página): risco de campos e rótulos divergentes. **Evolução:** unificar a estrutura de seções entre os dois.

---

## 5. Contatos e Origens

### 5.1 Contatos — `AdminContactsView.tsx` (2463)
**Bugs:** 1 ellipsis para tabela larga; telefone/e-mail longos truncam mal **[validar]**. Já tem loading (14) e empty (6). **Micro-UI:** avatar com iniciais, telefone formatado em tipografia tabular, chips de unidade limitados a 2 + "+N" (contato com N leads/unidades tende a empilhar). **Evolução:** painel lateral ao clicar (reuso do drawer) em vez de navegação.

### 5.2 Origens — `AdminSourcesView` (1159), `AdminSourceEditorView` (2148), `AdminSourceModal` (1415), `AdminAddSubSourceModal`, `AdminSourceEmbedModal`, `AdminMqlConfigView`
**Bugs:** `AdminSourcesView` 0 ellipsis e 0 loading; nome de instância longo estoura. **Micro-UI:** status da instância WhatsApp como bolinha com pulso (conectado/desconectado) e "há X min". **Evolução:** card de origem com mini-métrica (leads 30d) para escanear performance.

---

## 6. Debutantes / App da anfitriã

### 6.1 Admin — `AdminDebutantesView`, `AdminDebutanteDetailView` (1729), `AdminDebutanteModal`, `AdminDebutanteDetailModal`, `AdminJourneysConfigView`, `AdminBenefitsCatalogView`, `AdminBenefitModal`, `AdminVipRewardModal`, `AdminPrizeConfigModal`, `AdminTemplateModal`
**Bugs:** DetailView 0 ellipsis e 0 loading; Benefits 0 ellipsis. `AdminReferralsView.tsx` tem 6 linhas (stub): confirmar se é rota viva; se aparecer ao usuário, é tela vazia. **Micro-UI:** miniaturas de benefício com proporção fixa e `object-fit`. **Evolução:** detalhe da debutante em abas (Resumo / Convidados / Jornada / Benefícios).

### 6.2 App da anfitriã — `guests/*`, `journey/*`, `benefits/*`, `referrals/*`, `profile/*`, `notifications/*`, `layout/*`, `appointments/*`, `common/*`
**Observações:** usa identidade própria (rosa/ouro, Cinzel/Poppins), distinta do admin: aceitável, mas T6 (muitas famílias) vale aqui. `GuestPublicLandingPage` (1079 linhas): 0 ellipsis, 1 loading. `BenefitCard`/`ClaimModal` já usam pulse: bom padrão a replicar. **Evolução:** `DemoControls` (layout/) deve estar escondido em produção **[validar]** (texto técnico/controle de demo na UI).

---

## 7. Gerência, Equipe, Configurações, Dev

### 7.1 Dashboard — `AdminDashboardView.tsx` (2101), `AdminMasterDashboardView` (577), `AdminVenueGoalsView` (522), `AdminVenueGoalsModal`
**Bugs & Inconsistências**
- Donut de receita (`:1087`): SVG sem `title`/tooltip por fatia, sem rótulo de valor central quando há dados (só "R$ 0" no vazio, `:1112`). Legenda limitada a `slice(0, 3)` (`:1128`) sem indicar que há mais casas.
- Nome da casa limpo por `.replace('Espaço ', '').replace(' Ballroom', '')` (`:1132`): regra de nome hardcoded na UI, quebra para outras redes.
- Barras de atividade (`:1170–1180`): sem eixo, sem legenda; destaque fixo nos índices `i === 5 || i === 9` (`:1172`) parece dado aleatório/mock; tooltip só `title` nativo "Atividade dia N" sem valor. **Pode ser lido como gráfico decorativo.**
- Persistência de config de pódio em `localStorage` (`:75,94`): configuração some ao trocar de máquina (não é visual, mas aparece como "preferência perdida").
- Master Dashboard, VenueGoals: 0 empty, 0 loading, 0 hover.

**Refinamento Estético**
- Hierarquia de KPI: rótulo 0.72rem muted, valor 1.65rem/800 (já existe em `:1070`), delta com seta e cor; padronizar entre todos os cards.
- Tooltip customizado (div posicionada) com data, valor e variação, em vez de `title`.
- Linhas de grade horizontais discretas e eixo Y com 3 marcas.

**Evolução de Componente**
- Donut → manter, mas adicionar valor/percentual no centro ao passar o mouse e legenda completa rolável.
- Barras: remover destaque fixo; destacar o máximo real e hoje; adicionar eixo X (dias) e linha de média.
- Metas: barra de progresso com marcador de "esperado hoje" além do atingido.

### 7.2 Equipe — `AdminTeamView` (407), `AdminCollaboratorsView` (3380), `AdminCollaboratorModal`, `AdminCollabInviteModal`, `AdminCollabInviteView`
**Bugs:** `AdminTeamView` 0 empty/0 loading. Collaborators: 5 ellipsis, 7 empty (bom), 7 hovers JS; cargo + unidade + status por pessoa tende a empilhar badges **[validar]**. **Micro-UI:** avatar com status de presença, cargo em texto e só "Pendente/Inativo" como badge. **Evolução:** convites pendentes numa faixa separada com ação "Reenviar".

### 7.3 Casas — `AdminVenuesView` (2606), `AdminVenueModal`, `AdminDeleteVenueModal`
**Bugs:** 30 menções de loading (bom), 1 `alert()`. **Micro-UI:** logo com fallback (`SmartVenueLogo`) alinhado em tamanho. **Evolução:** card de casa com resumo (funis, equipe, WhatsApp conectado).

### 7.4 Configurações — `AdminUserSettingsView`, `AdminSettingsModal`, `AdminFirstAccessModal`, `AdminFirstAccessProfileView`, `AdminSupportModal`, `AdminSupportWidget`, `AdminFilterBar`, `AdminSidebar` (2371)
**Bugs:** Sidebar 133 estilos inline, 16 hovers JS. Fundos fixos distintos no item ativo (`#141118`, `#1A1622`, gradientes dourados) vs token `--adm-bg-sidebar`: roxo-escuro hardcoded fora do token **[validar]**. Há ainda `--bg-sidebar: #0A040E` (tema rosa legado) coexistindo com `--adm-bg-sidebar` (`globals.css:12` vs `:281`). No tema claro a sidebar é `#FFFFFF` (`:332`): se a intenção é sidebar sempre escura, é inconsistência.
**Micro-UI:** item ativo com barra lateral 3px + ícone no accent; colapsada com tooltip no ícone. **Evolução:** agrupar itens com títulos de seção em 0.62rem uppercase.

### 7.5 Dev — `AdminDevAnnouncementsView`, `AdminDevFeatureFlagsView`, `AdminDevUsersManagerView`, `AdminDevSupportView`, `AdminAnnouncementModal`
**Bugs:** FeatureFlags 0 empty/0 hover; usa `document.getElementById` (`:334`) para ler input: sem feedback visual de salvo. Announcements: `alert()` (`:44`). **Micro-UI:** toggle com estado salvo "Salvo ✓" via ícone lucide (não emoji). **Evolução:** diff antes/depois por flag.

---

## 8. Entrada e páginas públicas

### 8.1 Login / Registro / Recuperação — `AdminLoginView` (1548), `AdminRegisterView`, `AdminForgotPasswordModal`, `AdminLoadingSplash`
**Bugs:** 1548 linhas para uma tela de login sugere estilos duplicados por estado **[validar]**. **Micro-UI:** erro de credencial inline sob o campo, botão com spinner e largura fixa (sem "pulo"). **Evolução:** manter o fundo da marca; foco visível nos inputs (T1).

### 8.2 Públicas — `PublicFormLandingView` (1 `alert()`), `PublicTrackingRedirectView`, `PublicChangelogView`, `GuestPublicLandingPage`
**Bugs:** `PublicFormLandingView` usa `alert()` em página pública, a pior superfície para isso. **Micro-UI:** estados de envio (enviando/sucesso/erro) com tela própria. **Evolução:** Changelog com agrupamento por mês e tags de tipo.

### 8.3 Transversais — `AdminConfirmModal`, `AdminErrorBoundary`, `ComingSoonOverlay`, `ImageUploadField`, `VideoUploadField`, `SafeAvatar`
**Observação:** `AdminConfirmModal` já existe e resolve T4. `AdminErrorBoundary`: garantir mensagem humana sem stack. `ImageUploadField`/`VideoUploadField`: progresso de upload e erro de formato inline **[validar]**.

---

## 9. Ordem sugerida de execução (por etapas, após aprovação)

1. **Fundação (T1, T2 parcial, T9):** utilitário CSS global de foco/hover (`.adm-clickable`), escala de z-index em tokens. Baixo risco, efeito em todas as telas.
2. **Alerts → toast/inline/ConfirmModal (T4):** Kanban, FunnelSettings, MQL, Agenda, SLA, WhatsApp, Public form.
3. **Truncamento e `minWidth:0` (T10):** Contratos, Sources, Benefits, Tasks, LeadsList, DebutanteDetail.
4. **Dashboard:** tooltips, eixos, remover destaque fixo, legenda completa.
5. **Skeleton + empty states (T3, T11):** Kanban, Home, Dashboard, Calendários, Team.
6. **Escala tipográfica e tokens de cor (T5, T7, T8)** por módulo, começando por Kanban e LeadInspector.
7. **Kanban card / conversa WhatsApp:** limitar badges (máx. 2 + "+N").

## 10. Limites desta auditoria
- Análise estática: sem screenshots, nenhum achado de overflow foi confirmado visualmente (marcados **[validar]**).
- Arquivos acima de 4k linhas (WhatsApp, LeadInspector, Kanban, FunnelSettings, AgendaAvailability, TaskDetail) foram amostrados por padrões e janelas, não lidos por inteiro (regra do CLAUDE.md). Cobertura de módulos menores (modais de guests, journey, referrals, profile) é por métricas e inspeção parcial.
- O pedido citava sidebar `#0B1120`; o token real em dark é `#0B111A` e no tema claro é branco.

---

## 11. Validação no navegador (2026-11-17, ambiente local, somente leitura)

**Corrigido nesta rodada**
- Agenda do Dia (Home): título dos compromissos estava `#FFFFFF` sobre fundo claro, ilegível. Agora usa `--adm-text-title` (`AdminHomeView.tsx`).
- Dashboard: barras e sparkline passaram a usar vendas reais dos últimos 10 dias; tooltip com dia, quantidade e valor.
- 52 `alert()` trocados por `toast`; foco de teclado global (`:focus-visible`); truncamento em Origens, Benefícios e Lista de Leads; empty state em Equipe.

**Correções ao review original (o que estava errado)**
- Home já tem empty state com ícone e botão (seção 1.1).
- Coluna vazia do Kanban já mostra "Arraste um lead para cá" (seção 3.1).
- Nome longo no card do Kanban já trunca com reticências; card de contrato também.

**Confirmado visualmente**
- Card do Kanban empilha até 5 sinais (SLA, casa, origem, tipo "15 Anos", "+"): excesso de badges real.
- Contador "1749" no ícone de caixa de entrada do topo do Kanban: valor muito alto, **[validar]** o que ele representa.
- Tabela de tarefas da Home corta colunas à direita (cabeçalho "VINCULADO" encostado na borda do card).
- Agenda do Dia: cabeçalho diz "0 compromissos • 2 afazeres" com 2 cards visíveis; conferir se a contagem separa corretamente tarefa de compromisso.
- Console no banco local: 404 em `venue_events` e 400 em `guests` (migrações pendentes localmente, não são de UI).

---

## 12. Análise de UX das telas principais (feedback do usuário + validação no navegador)

Princípio: **cada ação aparece uma vez, no lugar certo**. Botões repetidos que encontrei:

| Tela | Repetição | Proposta |
|---|---|---|
| WhatsApp | `<` (recolher lista) + `X` (inerte) lado a lado; aba vertical "Ficha do Lead" + botão "Ficha do Lead" no cabeçalho | **Feito.** Mantido só `<` e o botão do cabeçalho |
| Agenda de Eventos | "Novo Evento / Trava" (topo) + "Agendar Aqui" (painel lateral) + 3 selects + busca antes de ver o calendário | Manter "Agendar Aqui" só como ação contextual do dia; "Novo Evento" fica no topo. Filtros em uma linha recolhível |
| App Aniversariantes | "Configurar Prêmios", "Jornadas VIP", "Cadastrar Conta" no topo; no card: App, Convite, desligar, compartilhar, enviar, editar, excluir (7 ações) | Card com 2 ações visíveis (App, Convite) + menu `⋯` com o resto; Prêmios/Jornadas para um menu "Configurar" |
| App Aniversariantes | Duas fileiras de filtro (período/casa/ordem + abas de status + tipo de festa + visão) | Unificar: abas de status + 1 botão "Filtros" |
| Kanban | Cabeçalho do funil com Filtros, abas Todos/Em Aberto/Meus Leads, Seleção Múltipla, Adicionar Lead (2x: topo e barra), ícones de visão, Fixar, engrenagem | "Adicionar Lead" aparece 2x: manter um |

### Por tela (o que você apontou)
- **WhatsApp:** título "WhatsApp Atendimento" e "19 leads" quebravam em duas linhas; `X` não funcionava (só limpava o lead selecionado); ficha recolhida virava aba vertical. **Corrigido** (título "WhatsApp", sem quebra, sem `X` inerte, sem aba vertical).
- **Equipe:** mostrava nível de acesso ("Gerente Geral") como selo, competindo com o cargo. **Corrigido:** só o cargo real; se não houver, mostra o acesso em texto discreto. Dado a normalizar: cargos como "ADMINISTRATIVO" e "PÓS VENDA" estão em maiúsculas, os demais não.
- **App Aniversariantes:** festa passada mostrava "Faltam 0 dias" (agora "Festa realizada"), avatar quebrado com texto alternativo (agora iniciais), texto técnico `/app/:slug` no subtítulo (removido). **Pendente:** reduzir ações por card e filtros (tabela acima).
- **Agenda de Eventos:** a mais fraca. O cabeçalho (título, descrição, alternância Calendário/Lista, botão), 4 KPIs e a barra de filtros ocupam ~370px antes do calendário, que fica embaixo e vazio. **Proposta (agenda estilo Google):** KPIs viram uma faixa compacta; calendário ocupa a altura útil; clicar num dia abre gaveta lateral; arrastar para criar; visão Mês/Semana/Dia; eventos como chips coloridos com título; dias travados em hachura. Exige redesenho: precisa de aprovação antes.
- **Funil Comercial:** ícones amarelos/laranja sobre fundo branco (ex.: funil "SDR TESTE") têm baixo contraste. **Proposta:** fundo do ícone com a cor a 18% e traço escurecido 25% (ou `--adm-text-title` no traço). **Pendente de aplicar.**
- **Cards do Kanban:** funcionam, mas empilham até 5 sinais. **Proposta:** máximo 2 etiquetas + "+N", SLA sempre visível, origem em texto neutro, ações de rodapé (6 ícones) em hover. **Pendente.**
- **Contratos:** não analisada ainda.
- **Dashboard:** fora do escopo (você vai abrir tarefa à parte).

### Animações (motion + auto-animate)
Instalados `motion` e `@formkit/auto-animate`. Aplicado, tudo ≤ 160ms e respeitando `prefers-reduced-motion`:
- troca de tela: fade de 160ms (`AdminPortal.tsx`)
- sidebar: pílula e barra do item ativo deslizam entre itens (`layoutId`, `AdminSidebar.tsx`)
- listas: conversas do WhatsApp, colunas do Kanban e grade da Equipe (`src/utils/animateList.ts`)
- Modais: `AdminConfirmModal` já tinha animação própria. Os outros ~80 overlays são inline e independentes; animar todos exige um `ModalShell` único (já sugerido na seção 3.2).
