# F5 System • ERP de Gestão Multi-Unidades para Casas de Festas

> **Documento Mestre do Projeto:** Consulte [F5_SYSTEM_MASTER.md](file:///c:/Users/--/OneDrive/Documents/Codex%20Projetos/Bonomo%20Festas%202/F5_SYSTEM_MASTER.md) para a visão arquitetural, módulos desenvolvidos, regras de governança e roadmap estratégico.

---

## 🌟 Sobre o F5 System
O **F5 System** é um ERP completo e moderno desenvolvido especialmente para donos e gestores de **Casas de Festas, Buffets e Espaços de Eventos**.

O seu grande diferencial competitivo é o suporte nativo a **múltiplas unidades físicas (`multi-venues`) gerenciadas por equipes centralizadas ou compartilhadas**:
- Um único time comercial (SDRs e Closers) atendendo leads de várias casas.
- Pós-venda e equipe operacional acompanhando contratos e cronogramas de múltiplos espaços.
- Gestão financeira consolidada da rede e segregada por unidade.

---

## 🚀 Módulos Principais

1. **Central de Tarefas Estilo Notion:**
   - Setores de trabalho organizados (Design, Gestão, Contratos, Financeiro, Geral).
   - Visualizações em Kanban e Lista com subtarefas, checklists, prioridades e vínculo direto com Leads e Eventos.

2. **Agenda de Follow-ups Comerciais (3 Dias):**
   - Esteira temporal dos próximos 3 dias com horário programado e obrigatoriedade de feedback para conclusão.

3. **CRM Comercial & Funis Customizáveis:**
   - Pipelines com etapas personalizadas, distribuição Round-Robin e cartões enriquecidos com termômetro MQL e score ICP.

4. **Workspace Integrado de WhatsApp & Ficha do Lead:**
   - Central de conversas integrada à Ficha Completa do Lead (`AdminLeadInspector`), anotações internas e geração de tarefas.

5. **Metas & Indicadores por Unidade:**
   - Metas de faturamento e volume de contratos por casa de festa.

6. **Portal das Debutantes & Anfitriãs:**
   - Painel PWA mobile-first para a anfitriã com confirmação de convidados via WhatsApp, indicação de amigas e benefícios VIP.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React 19, TypeScript, Vite 8, Lucide React, Canvas Confetti.
- **Backend / Database:** Supabase (PostgreSQL, Auth, RLS, Storage).
- **Armazenamento de Mídia:** Cloudflare R2 / AWS S3 SDK.
- **Estilização:** CSS Vanilla e design system sob medidas (suporte a Dark Mode e Light Mode).

---

## 💻 Como Rodar o Projeto

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar ambiente de desenvolvimento
npm run dev

# 3. Compilar para produção (verificação de tipagem e bundle)
npm run build
```

---

> **Regra Obrigatória para Desenvolvedores e Agentes de IA:**  
> Antes de executar qualquer nova tarefa ou refatoração, leia o arquivo [F5_SYSTEM_MASTER.md](file:///c:/Users/--/OneDrive/Documents/Codex%20Projetos/Bonomo%20Festas%202/F5_SYSTEM_MASTER.md).
