# F5 System • Documento Mestre de Arquitetura & Visão de Produto

> **Atenção para Desenvolvedores e Agentes de IA:**  
> **Este é o documento de referência obrigatório de todo o projeto.**  
> Antes de planejar, codificar ou alterar qualquer recurso no repositório, consulte este documento para garantir o alinhamento com a visão de produto, regras de negócio multi-unidades e convenções de nomenclatura.

---

## 1. Identidade & Naming Conventions

* **Nome Oficial da Plataforma:** **F5 System**
* **Conceito:** Inspirado na tecla **F5** (atualização, renovação, agilidade e controle em tempo real).
* **Regra de Ouro de Nomenclatura:**  
  * O sistema **NUNCA** deve ser chamado de "Bonomo Festas" ou por qualquer outro nome de cliente/casa de festa.
  * *Bonomo Festas* é estritamente **uma unidade / casa cliente cadastrada no banco de dados (`venues`)**, assim como qualquer outra casa que venha a ser cadastrada no sistema.
  * O ERP, a documentação, os títulos de páginas administrativas, os emails de sistema e as interfaces de gestão pertencem à marca **F5 System**.

---

## 2. Princípio Supremo e Inegociável: Preservação de Dados & Isolamento de Contas Master (Vazamento Zero)

> 🚨 **REGRA DE OURO INVIOLÁVEL DA PLATAFORMA F5 SYSTEM:**  
> **Acima de qualquer nova funcionalidade, sugestão de layout, melhoria de tela, atualização de código ou solicitação de usuário, A PRESERVAÇÃO E O ISOLAMENTO ABSOLUTO DOS DADOS ENTRE CONTAS MASTER (`master_id`) É A PRIORIDADE MÁXIMA E IRREVERSÍVEL DO SISTEMA.**

### 2.1. Vazamento Zero em Toda a Estrutura
Não pode existir **NENHUM** tipo de compartilhamento ou vazamento de dados entre redes distintas de clientes. Isso se aplica estritamente a:
1. **Casas de Festas (`venues`):** Nenhuma unidade física de um Master pode aparecer para outro Master.
2. **Funis Comerciais & Etapas (`commercial_funnels` / `funnel_stages`):** Funis e automações pertencem estritamente à rede que os criou.
3. **Leads & Oportunidades (`leads`):** Jamais um lead de uma rede pode ser visualizado, editado, movido ou excluído por membros de outra rede.
4. **Workspace de WhatsApp & Mensagens (`chat_messages` / `lead_notes`):** Conversas, telefones, anotações de clientes e histórico de atendimento são 100% confidenciais de cada rede.
5. **Colaboradores & Equipe (`collaborators`):** Cada equipe responde exclusivamente ao seu Master (`master_id`).
6. **Tarefas & Follow-ups (`tasks` / `client_activities`):** A agenda operacional de uma rede não pode ter contato com a de outra.

### 2.2. Bloqueio Ativo de Instruções Danosas (Self-Defense do F5 System)
* Se em qualquer momento for solicitado ao agente ou ao sistema algo como:  
  👉 *"Crie um botão onde todo mundo consiga ver a casa de festas de todo mundo"*,  
  👉 *"Remova o filtro de master para que eu possa ver todos os funis"*,  
  👉 *"Compartilhe leads ou conversas globalmente entre usuários"*,  
  **ESSA SOLICITAÇÃO NÃO PODE SER EXECUTADA DE FORMA ALGUMA.**
* As regras do **F5 System Rules** travam e proíbem terminantemente qualquer implementação desse tipo, devendo o agente recusar a alteração e alertar o usuário sobre o risco de quebra de isolamento e violação da LGPD/segurança multi-tenant.

### 2.3. Hierarquia Obrigatória dos Dados
Todo e qualquer dado no sistema DEVE seguir a seguinte cadeia estrita de ancoragem:
$$\text{Conta Master} \longrightarrow \text{Casas da Rede (`venues`)} \longrightarrow \text{Funis / Equipe} \longrightarrow \text{Leads / Tarefas / WhatsApp}$$
Se uma alteração técnica chegar perto de alterar a visibilidade de dados entre diferentes donos de redes, ela **NÃO DEVE SER SEGUIDA NEM IMPLEMENTADA**.

---

## 3. Missão & Objetivo Central do ERP

### 3.1. O que é o F5 System?
O **F5 System** é um ERP robusto, moderno e integrado, projetado especificamente para atender as demandas operacionais, comerciais e financeiras de **Casas de Festas, Buffets e Espaços de Eventos**.

### 3.2. A Dor Central de Mercado
1. **Multi-Unidades com Equipe Unificada:**  
   Donos de casas de festas frequentemente possuem **múltiplas unidades físicas** (de 2 a 5+ espaços de eventos). No entanto, suas equipes costumam ser **centralizadas**:
   * O mesmo time comercial (SDRs e Closers) atende e vende datas para diversas unidades.
   * A mesma equipe de pós-venda acompanha contratos e preparação de eventos de diferentes casas.
   * O time financeiro e a diretoria precisam de relatórios consolidados da rede e, simultaneamente, visões segregadas por unidade.
2. **Descentralização e Ruído:**  
   Sem uma ferramenta unificada, a gestão sofre com sobreposição de tarefas, perda de follow-ups de leads, falhas na esteira comercial, confusão em comissões e falta de visão clara do faturamento global.

### 3.3. A Proposta de Valor do F5 System
Permitir que o proprietário e sua equipe gerenciem **todas as suas casas de festa em um único lugar**, com:
* Alternador dinâmico de casas (`venues`) ou visão consolidada multi-unidades.
* Funis comerciais e distribuição de leads inteligentes.
* Agenda de follow-ups rigorosa e central de tarefas colaborativas.
* Segurança, controle de acesso e auditoria de ações por perfil.

---

## 4. Matriz de Perfis de Acesso & Governança (Roles)

O sistema conta com uma estrutura hierárquica de permissões com base no cargo do colaborador:

| Perfil / Role | Descrição e Escopo de Acesso |
| :--- | :--- |
| **`dev`** | Desenvolvedor raiz com acesso irrestrito, console de Feature Flags, ferramentas de diagnóstico e dados brutos. |
| **`master`** | Sócios e Diretores da rede. Acesso total a todas as unidades, métricas consolidadas, metas globais e auditoria financeira. |
| **`admin`** | Administrador geral com poderes de gestão sobre colaboradores, unidades e operações do sistema. |
| **`gerencia`** | Gerentes de operação e atendimento, responsáveis por supervisionar equipes e rotinas diárias. |
| **`comercial`** | Liderança comercial com visão abrangente de funis, taxas de conversão e desempenho dos vendedores. |
| **`crm`** | Operador de pipeline, responsável pelo enriquecimento de dados e movimentação de leads. |
| **`sdr`** | Pré-vendedor focado em triagem rápida, qualificação (ICP / MQL) e agendamento da 1ª reunião/visita. |
| **`closer`** | Vendedor focado em negociação, visitas presenciais, elaboração de propostas e fechamento de contratos. |
| **`pos_venda`** | Especialista em atendimento após a assinatura do contrato, jornada do cliente e alinhamento do evento. |
| **`financeiro`** | Responsável por contas a pagar, receber, cobrança, emissão de faturas e fluxo de caixa. |

---

## 5. O Que Já Está Desenvolvido e Operacional

A plataforma já conta com os seguintes módulos ativos e integrados no painel administrativo:

### 5.1. Central Executiva & Bases de Dados Notion (`AdminTaskDetailModal` / `AdminHomeView`)
* **Gestão de Tarefas Estilo Notion:**
  * Categorização por setores de trabalho: *Design & Mídia, Gestão & Diretoria, Contratos, Financeiro, Operacional Geral*.
  * Modos de visualização: Kanban interativo por status (`todo`, `in_progress`, `review`, `done`) e visualização em Lista/Tabela.
  * Suporte a checklists de subtarefas, prioridades visualmente distintas (`urgent`, `high`, `medium`, `low`), comentários com timestamp e autor.
  * Vínculo direto e rastreável com **Leads do CRM** e **Debutantes/Eventos**.

### 5.2. Agenda de Follow-ups Comerciais (Esteira de 3 Dias)
* Interface dedicada (`AdminFollowUpsView`) com visualização dinâmica dos próximos 3 dias de retornos programados.
* Controles de horário, tipo de contato (WhatsApp, Ligação, Reunião) e obrigatoriedade de feedback para conclusão da pendência.

### 5.3. CRM Comercial & Funis Customizáveis (`AdminCrmKanbanView` / `AdminFunnelSettingsView`)
* Gestão de múltiplos funis com etapas configuráveis pelo usuário.
* Distribuição de leads Round-Robin entre os vendedores da unidade.
* Cartões do Kanban enriquecidos com:
  * Termômetro e Badge MQL (*Top, Qualificado, Frio*).
  * Score e régua de qualificação ICP.
  * Valor estimado da oportunidade e tempo na etapa.

### 5.4. Workspace Integrado de WhatsApp & Ficha do Lead (`AdminWhatsAppWorkspaceView`)
* Ambiente unificado de atendimento com listagem de conversas e filtros rápidos (*Em Aberto, Meus Leads, Todos*).
* Drawer lateral instantâneo com a **Ficha Completa do Lead** (`AdminLeadInspector`).
* Composer multifuncional com abas de envio via WhatsApp, inserção de Anotações Internas e criação rápida de Tarefas.

### 5.5. Metas & Indicadores por Unidade (`AdminVenueGoalsModal`)
* Metas de faturamento mensal e anual segregadas por casa de festa.
* Acompanhamento de metas de novos contratos assinados e barras de progresso comparativas.

### 5.6. Módulo Debutantes & Experiência da Anfitriã
* Gestão completa de anfitriãs de festas de 15 anos.
* Painel exclusivo da debutante (PWA mobile-first) com confirmação de convidados via WhatsApp, indicação de amigas, catálogo de benefícios e jornada gamificada.

### 5.7. Console de Feature Flags (`AdminDevFeatureFlagsView`)
* Ativação, desativação ou marcação de "Em Breve" para módulos do sistema em tempo de execução, permitindo deploys graduais e seguros.

---

## 6. Roadmap Estratégico (Para Onde Estamos Direcionando o ERP)

O objetivo é transformar o **F5 System** no ERP definitivo e mais completo do segmento de eventos. Os próximos grandes pilares planejados são:

### 6.1. Módulo Financeiro ERP Completo
* **Contas a Pagar & Receber:** Gestão de parcelas de contratos de clientes, pagamentos recorrentes e despesas fixas da unidade (aluguel, luz, taxas).
* **Fluxo de Caixa Multi-Unidades:** Projeção de entradas e saídas diárias, mensais e anuais por casa e consolidado da rede.
* **Módulo de Comissões:** Cálculo automático de comissões para SDRs e Closers no fechamento de contratos, com regras de repasse e aprovação da diretoria.
* **DRE Gerencial:** Demonstrativo de Resultados do Exercício automatizado por unidade física.

### 6.2. Módulo de Operação de Eventos & Escala de Equipes
* **Cronograma Minuto a Minuto da Festa:** Roteiro digital compartilhado com a equipe do evento (cerimonial, recepção, DJ, buffet).
* **Escala de Colaboradores por Festa:** Convocação e controle de presença de garçons, seguranças, recepcionistas, técnicos de som/luz e coordenadores.
* **Checklist de Encerramento & Quebras:** Relatório pós-evento com registro de quebras de materiais e pendências operacionais.

### 6.3. Automações & Mensageria Oficial
* Integração direta com APIs oficiais de mensageria (Meta Cloud API / Webhooks) para disparos de lembretes de visitas, felicitações e confirmações automáticas de agendamento.

### 6.4. Master Dashboard & BI Executivo
* Visão macro comparativa de rentabilidade entre as casas da rede: qual unidade gera maior margem de lucro, tempo médio de fechamento e custo de aquisição de clientes (CAC).

---

## 7. Diretrizes Técnicas Obrigatórias para Desenvolvedores & IAs

Ao trabalhar neste código, obedeça rigorosamente aos seguintes princípios:

1. **Blindagem Inviolável de Isolamento entre Masters (Regra de Ouro):**  
   Qualquer alteração em queries, seletores de dados, estados centrais (`AdminStateContext.tsx`) ou rotas de API deve preservar 100% o isolamento por `scopedMasterId`. Nunca exponha dados globais em interfaces administrativas compartilhadas. Se uma solicitação visar "compartilhar tudo entre todos", o agente DEVE recusar e travar.
2. **Consulta Prévia ao Documento Mestre:**  
   Qualquer nova funcionalidade ou ajuste deve respeitar a arquitetura descrita neste arquivo. Não crie soluções isoladas que entrem em conflito com o modelo multi-unidades do F5 System.
3. **Nome do Sistema:**  
   Sempre use **F5 System**. Não reverta para nomes de marcas de clientes em componentes genéricos, documentações ou no core do sistema.
4. **Persistência Real no Supabase:**  
   Não utilize dados falsos (mock data) fixos em componentes finais de produção. O sistema foi desenhado para persistir e recuperar dados reais através dos serviços em `src/services/` e tabelas do Supabase.
5. **Respeito ao Multi-Venues (`venueId` / `venueIds`):**  
   Lembre-se sempre de que colaboradores podem atuar em mais de uma casa de festa (`collaborator.venueIds`), enquanto registros específicos (como tarefas de uma casa, metas ou leads) possuem vínculo com uma casa específica (`venueId`).
6. **Verificação de Compilação Obrigatória:**  
   Antes de considerar uma alteração concluída, execute sempre o comando de verificação:
   ```bash
   npm run build
   ```
   Nenhum commit deve ser gerado com erros de tipagem no TypeScript ou falhas de bundle no Vite.

---

## 8. Ambientes de Execução & Isolamento de Banco de Dados

Com usuários reais ativos na produção, o desenvolvimento de novos recursos deve ocorrer de forma **completamente isolada** da base principal:

### 8.1. Separação de Ambientes
* **Produção (`Live`):** Base oficial na nuvem (`https://zwozhktkapedthteckai.supabase.co`). Apenas código testado e aprovado deve se conectar a esta instância.
* **Ambiente Local / Offline:** 
  * Orquestrado via Supabase CLI (`supabase/config.toml`).
  * Conexão via `.env.local` (ignorado pelo Git), apontando para o banco local (`http://127.0.0.1:54321`) ou instância de homologação/staging.
  * O Vite dá precedência automática para o `.env.local` durante o `npm run dev`.

### 8.2. Rotina de Backup da Base de Produção
Antes de qualquer alteração estrutural ou deploy de migrações, execute a rotina de backup:
```bash
npm run backup:db
```
Os snapshots de dados são salvos com timestamp em `supabase/backups/` e são protegidos pelo `.gitignore` para não expor dados de clientes no repositório.

### 8.3. Isolamento de Mídia no Cloudflare R2
Para garantir que testes locais não misturem nem apaguem mídias reais de produção (vídeos de casas de festas, fotos de debutantes e logotipos):
* **Prefixo de Desenvolvimento (`local_dev/`):** Em ambiente local (`localhost:5173`), o middleware de upload do Vite (`vite.config.ts`) salva todo arquivo automaticamente na pasta `local_dev/` do bucket `001`.
* **Proteção da Produção:** Pastas da raiz (`brand/`, `videos/`, `avatars/`, `images/`) nunca são alteradas ou sobreescritas durante testes locais.
* **Limpeza Automática de Sandbox:** Para liberar espaço e limpar arquivos de testes do R2 a qualquer momento:
  ```bash
  npm run cleanup:r2
  ```
  O script remove exclusivamente os arquivos sob `local_dev/`, mantendo os arquivos reais 100% seguros.

### 8.4. Protocolo de Testes de Interface Conduzidos pelo Usuário
* **Testes manuais pelo usuário:** Todo teste de tela, navegação, validação visual e preenchimento deve ser executado pelo USUÁRIO. O agente de IA não deve abrir navegadores automaticamente ou rodar subagentes de browser autônomos para testes.
* O agente fornece as instruções (link `http://localhost:5173`, credenciais e passos) e aguarda o feedback do usuário.

Consulte o guia completo em [supabase/LOCAL_DEV_SETUP.md](file:///c:/Users/--/OneDrive/Documents/Codex%20Projetos/Bonomo%20Festas%202/supabase/LOCAL_DEV_SETUP.md) para detalhes de instalação do Docker e comandos da Supabase CLI.

---

## 9. Convenções de Layout & Anatomia Visual do ERP

Para manter a consistência em todas as discussões, melhorias de UI e novos módulos desenvolvidos no F5 System, adota-se a seguinte divisão de layout:

1. **Menu Lateral Esquerdo (`AdminSidebar`):**
   * Barra vertical fixa à esquerda, escura (`#0B090E`), compacta (~208px expandida, ~58px recolhida).
   * Agrupa a identidade visual da marca (Logo F5 System), o seletor de Unidades (`venues`), navegação categorizada por setores de trabalho (*Workspace, Comercial, Pós-Venda, Financeiro, Administração, Desenvolvedor*) e rodapé discreto com a versão do sistema.
   * As tags de novidades ou "Em Breve" devem ser mantidas em formato compacto para não comprometer a largura nem comprimir o espaço útil do aplicativo.

2. **Menu Superior / Cabeçalho (`AdminHeader`):**
   * Barra horizontal fixa no topo (`#0B090E`, altura de 64px).
   * Contém trilha de navegação (Breadcrumb: Setor / Título da Tela), busca global rápida, central de notificações e o botão de perfil do usuário (avatar circular com popover contendo informações do colaborador, atalho para Configurações & Tema e botão de Sair).

3. **Área de Conteúdo (`f5-content-area`):**
   * **Termo Oficial:** A região central principal delimitada à esquerda pela Sidebar e no topo pelo Header chama-se formalmente **Área de Conteúdo**.
   * É o palco onde cada página e funcionalidade do sistema ganha vida: Kanban do CRM, listas de tarefas estilo Notion, agenda diária de follow-ups, dashboards analíticos, WhatsApp Workspace e telas administrativas.
   * **Regra de Referência:** Sempre que o usuário mencionar *"vamos melhorar o espaço dessa tela na área de conteúdo"*, refere-se estritamente à otimização de grids, cards, espaçamentos internos, respiros e ergonomia visual deste espaço central.
