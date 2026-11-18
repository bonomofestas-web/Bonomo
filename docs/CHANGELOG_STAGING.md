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

- **Reorganização do Squad & Liderança de Frontend** (`improved`):
  - **Descontinuação de Protótipos HTML:** Encerramento definitivo de etapas intermediárias de prototipagem estática em HTML e retirada da Victoria da operação.
  - **Promoção de Lily Aldrin:** Designada como Designer-Chefe & Frontend Lead, centralizando a criação e refino de interface diretamente no ecossistema React do F5 System, orientada pelo Design System nativo, Tremor Raw e Apache ECharts.
  - **Implementação Oficial do Pós-Venda:** Lily assume a execução oficial da esteira de Pós-Venda como espelho funcional e visual do `AdminCrmWorkspaceView.tsx`.
  - **Frentes de Engenharia e Dados:** Ranjit dedicado à migração e integridade da base legada de clientes; Barney focado em serviços de agendamento e consolidação de métricas analíticas.
