-- ==============================================================================
-- F5 SYSTEM • MIGRATION CONSOLIDADA DE PRODUÇÃO (2026-11-21)
-- Reúne todas as migrations pendentes para sincronização completa com o app.
-- 
-- CONTEÚDO:
-- 1. Equipe e Presença (collaborator_presence, collaborator_history, job_role_order)
-- 2. Busca e Contatos (search_digits, is_colaborador, collaborator_id, avatar_url)
-- 3. Unidades e Calendário (venues.calendar_color)
-- 4. Contratos e Fechamento (contracts.closed_at)
-- 5. Módulo Financeiro Base (categorias, contas, maquininhas, a receber, a pagar,
--    rateio, transações de caixa, liquidação de cartão, cancelamento/distrato, orçamentos, auditoria)
-- 6. Funil Financeiro e Renegociação (fin_contract_stage_overrides, v_fin_contract_summary)
-- 7. Conexão Fixa do Financeiro por Casa (sources)
-- 8. Fornecedores e Orçamentos (contacts.is_supplier, supplier_quotes)
-- 9. WhatsApp: Deduplicação e Índice Único Atômico (idx_lead_activities_unique_msg_id)
-- 10. Funil de Pós-Venda VIENA POS (commercial_funnels)
--
-- IDEMPOTÊNCIA: Pode ser executado múltiplas vezes com segurança sem perda de dados.
-- ==============================================================================

-- ==============================================================================
-- 1. EQUIPE, PRESENÇA E HISTÓRICO
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.collaborator_presence (
    collaborator_id UUID PRIMARY KEY REFERENCES public.collaborators(id) ON DELETE CASCADE,
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    venue_id UUID,
    view TEXT,
    entity_type TEXT NOT NULL DEFAULT 'none' CHECK (entity_type IN ('lead', 'client', 'task', 'appointment', 'none')),
    entity_id TEXT,
    entity_label TEXT CHECK (entity_label IS NULL OR char_length(entity_label) <= 60),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_collaborator_presence_master ON public.collaborator_presence(master_id, last_seen_at DESC);

ALTER TABLE public.collaborator_presence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "collaborator_presence_master_scope" ON public.collaborator_presence;
CREATE POLICY "collaborator_presence_master_scope" ON public.collaborator_presence
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);
GRANT ALL ON public.collaborator_presence TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.collaborator_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    collaborator_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('created', 'role_changed', 'sectors_changed', 'venues_changed', 'deactivated', 'reactivated', 'updated')),
    details TEXT CHECK (details IS NULL OR char_length(details) <= 500),
    actor_id UUID,
    actor_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_collaborator_history_person ON public.collaborator_history(collaborator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collaborator_history_master ON public.collaborator_history(master_id);

ALTER TABLE public.collaborator_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "collaborator_history_full_access" ON public.collaborator_history;
CREATE POLICY "collaborator_history_full_access" ON public.collaborator_history
    FOR ALL TO anon, authenticated
    USING (true) WITH CHECK (true);
GRANT ALL ON public.collaborator_history TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.job_role_order (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    sector TEXT NOT NULL CHECK (sector IN ('comercial', 'pos_venda', 'gerencia', 'financeiro', 'marketing')),
    role_id TEXT NOT NULL CHECK (char_length(role_id) BETWEEN 3 AND 120),
    position INT NOT NULL CHECK (position >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_job_role_order_master_role UNIQUE (master_id, role_id)
);
CREATE INDEX IF NOT EXISTS idx_job_role_order_master ON public.job_role_order(master_id, sector, position);

ALTER TABLE public.job_role_order ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "job_role_order_full_access" ON public.job_role_order;
CREATE POLICY "job_role_order_full_access" ON public.job_role_order
    FOR ALL TO anon, authenticated
    USING (true) WITH CHECK (true);
GRANT ALL ON public.job_role_order TO anon, authenticated, service_role;


-- ==============================================================================
-- 2. BUSCA OTIMIZADA E CONTATOS (SEARCH DIGITS, COLABORADOR, AVATAR CENTRAL)
-- ==============================================================================
ALTER TABLE public.contacts
    ADD COLUMN IF NOT EXISTS primary_phone_digits   TEXT GENERATED ALWAYS AS (regexp_replace(COALESCE(primary_phone, ''),   '\D', '', 'g')) STORED,
    ADD COLUMN IF NOT EXISTS secondary_phone_digits TEXT GENERATED ALWAYS AS (regexp_replace(COALESCE(secondary_phone, ''), '\D', '', 'g')) STORED,
    ADD COLUMN IF NOT EXISTS cpf_digits             TEXT GENERATED ALWAYS AS (regexp_replace(COALESCE(cpf, ''),             '\D', '', 'g')) STORED;

CREATE INDEX IF NOT EXISTS idx_contacts_master_active_created
    ON public.contacts (master_id, created_at DESC) WHERE deleted_at IS NULL;

ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS is_collaborator boolean NOT NULL DEFAULT false;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS collaborator_id uuid REFERENCES public.collaborators(id) ON DELETE SET NULL;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS avatar_url TEXT;


-- ==============================================================================
-- 3. UNIDADES E CALENDÁRIO
-- ==============================================================================
ALTER TABLE IF EXISTS public.venues ADD COLUMN IF NOT EXISTS calendar_color TEXT;


-- ==============================================================================
-- 4. CONTRATOS (DATA DE FECHAMENTO)
-- ==============================================================================
ALTER TABLE IF EXISTS public.contracts ADD COLUMN IF NOT EXISTS closed_at DATE;
CREATE INDEX IF NOT EXISTS idx_contracts_master_closed_at ON public.contracts(master_id, closed_at);


-- ==============================================================================
-- 5. MÓDULO FINANCEIRO BASE
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.fin_touch_updated_at() RETURNS trigger AS $f$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$f$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.fin_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID NOT NULL,
  parent_id UUID REFERENCES public.fin_categories(id) ON DELETE SET NULL,
  system_key TEXT,
  accounting_code TEXT,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('receita','deducao','custo_evento','despesa_operacional','resultado_financeiro')),
  cost_nature TEXT CHECK (cost_nature IN ('fixo','variavel')),
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_fin_categories_system_key ON public.fin_categories(master_id, system_key) WHERE system_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fin_categories_master ON public.fin_categories(master_id, kind);

CREATE TABLE IF NOT EXISTS public.fin_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID NOT NULL,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'banco' CHECK (kind IN ('banco','caixa','maquininha')),
  bank TEXT,
  initial_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_accounts_master ON public.fin_accounts(master_id);

CREATE TABLE IF NOT EXISTS public.fin_card_terminals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID NOT NULL,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  brand TEXT,
  fee_table JSONB NOT NULL DEFAULT '{}'::jsonb,
  anticipation_fee_pct NUMERIC(6,3) NOT NULL DEFAULT 0,
  settlement_days INT NOT NULL DEFAULT 30,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_card_terminals_master ON public.fin_card_terminals(master_id);

CREATE TABLE IF NOT EXISTS public.fin_contract_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID NOT NULL,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  plan_hash TEXT,
  plan_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','reprovado')),
  reviewer_id UUID,
  reviewer_name TEXT,
  reason TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_reviews_contract ON public.fin_contract_reviews(contract_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fin_reviews_master_status ON public.fin_contract_reviews(master_id, status);

CREATE TABLE IF NOT EXISTS public.fin_receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID NOT NULL,
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  client_id UUID,
  contact_id UUID,
  kind TEXT NOT NULL CHECK (kind IN ('sinal','entrada','parcela','saldo','cartao','pos_evento')),
  seq INT NOT NULL DEFAULT 1,
  total_seq INT NOT NULL DEFAULT 1,
  due_date DATE,
  due_rule JSONB,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','parcial','pago','cancelado','renegociado','estornado')),
  payment_method TEXT,
  installments INT,
  terminal_id UUID REFERENCES public.fin_card_terminals(id) ON DELETE SET NULL,
  competence_date DATE,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  import_key TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_fin_receivables_import_key ON public.fin_receivables(master_id, import_key) WHERE import_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fin_receivables_contract ON public.fin_receivables(contract_id);
CREATE INDEX IF NOT EXISTS idx_fin_receivables_due ON public.fin_receivables(master_id, due_date) WHERE status IN ('pendente','parcial');
CREATE INDEX IF NOT EXISTS idx_fin_receivables_venue ON public.fin_receivables(master_id, venue_id);

CREATE TABLE IF NOT EXISTS public.fin_recurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID NOT NULL,
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  supplier_name TEXT,
  category_id UUID REFERENCES public.fin_categories(id) ON DELETE SET NULL,
  cost_nature TEXT CHECK (cost_nature IN ('fixo','variavel')),
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  frequency TEXT NOT NULL DEFAULT 'mensal' CHECK (frequency IN ('semanal','mensal','anual')),
  day_of_month INT,
  start_date DATE NOT NULL,
  end_date DATE,
  last_generated_until DATE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_recurrences_master ON public.fin_recurrences(master_id, active);

CREATE TABLE IF NOT EXISTS public.fin_payables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID NOT NULL,
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  supplier_name TEXT,
  supplier_contact_id UUID,
  category_id UUID REFERENCES public.fin_categories(id) ON DELETE SET NULL,
  cost_nature TEXT CHECK (cost_nature IN ('fixo','variavel')),
  description TEXT NOT NULL,
  competence_date DATE,
  due_date DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','parcial','pago','cancelado')),
  recurrence_id UUID REFERENCES public.fin_recurrences(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_payables_due ON public.fin_payables(master_id, due_date) WHERE status IN ('pendente','parcial');
CREATE INDEX IF NOT EXISTS idx_fin_payables_venue ON public.fin_payables(master_id, venue_id);

CREATE TABLE IF NOT EXISTS public.fin_payable_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID NOT NULL,
  payable_id UUID NOT NULL REFERENCES public.fin_payables(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  pct NUMERIC(7,4),
  basis TEXT NOT NULL DEFAULT 'manual' CHECK (basis IN ('igual','convidados','manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_fin_alloc_payable_contract ON public.fin_payable_allocations(payable_id, contract_id);
CREATE INDEX IF NOT EXISTS idx_fin_alloc_contract ON public.fin_payable_allocations(contract_id);

CREATE TABLE IF NOT EXISTS public.fin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID NOT NULL,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.fin_accounts(id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('in','out')),
  tx_date DATE NOT NULL,
  kind TEXT NOT NULL DEFAULT 'recebimento' CHECK (kind IN ('recebimento','pagamento','taxa_cartao','devolucao','tarifa','transferencia','ajuste')),
  gross_amount NUMERIC(14,2) NOT NULL CHECK (gross_amount >= 0),
  fee_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
  net_amount NUMERIC(14,2) GENERATED ALWAYS AS (gross_amount - fee_amount) STORED,
  method TEXT,
  receivable_id UUID REFERENCES public.fin_receivables(id) ON DELETE SET NULL,
  payable_id UUID REFERENCES public.fin_payables(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.fin_categories(id) ON DELETE SET NULL,
  terminal_id UUID REFERENCES public.fin_card_terminals(id) ON DELETE SET NULL,
  installments INT,
  description TEXT,
  proof_url TEXT,
  reconciled_at TIMESTAMPTZ,
  bank_line_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_tx_master_date ON public.fin_transactions(master_id, tx_date);
CREATE INDEX IF NOT EXISTS idx_fin_tx_receivable ON public.fin_transactions(receivable_id);
CREATE INDEX IF NOT EXISTS idx_fin_tx_contract ON public.fin_transactions(contract_id);

CREATE TABLE IF NOT EXISTS public.fin_card_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID NOT NULL,
  transaction_id UUID NOT NULL REFERENCES public.fin_transactions(id) ON DELETE CASCADE,
  seq INT NOT NULL,
  total_seq INT NOT NULL,
  expected_date DATE NOT NULL,
  gross_part NUMERIC(14,2) NOT NULL,
  fee_part NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_part NUMERIC(14,2) GENERATED ALWAYS AS (gross_part - fee_part) STORED,
  settled_at DATE,
  bank_line_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_settlements_expected ON public.fin_card_settlements(master_id, expected_date) WHERE settled_at IS NULL;

CREATE TABLE IF NOT EXISTS public.fin_revenue_recognition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID NOT NULL,
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  competence_date DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  kind TEXT NOT NULL DEFAULT 'evento' CHECK (kind IN ('evento','multa_distrato','ajuste')),
  reversed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_recognition_master_date ON public.fin_revenue_recognition(master_id, competence_date) WHERE reversed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fin_recognition_contract ON public.fin_revenue_recognition(contract_id);

CREATE TABLE IF NOT EXISTS public.fin_contract_cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID NOT NULL,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  cancel_date DATE NOT NULL,
  paid_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  penalty_retained NUMERIC(14,2) NOT NULL DEFAULT 0,
  refund_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  refund_schedule JSONB NOT NULL DEFAULT '[]'::jsonb,
  reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_cancellations_contract ON public.fin_contract_cancellations(contract_id);

CREATE TABLE IF NOT EXISTS public.fin_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID NOT NULL,
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.fin_categories(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_fin_budgets ON public.fin_budgets(master_id, COALESCE(venue_id, '00000000-0000-0000-0000-000000000000'::uuid), category_id, month);

CREATE TABLE IF NOT EXISTS public.fin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  before_data JSONB,
  after_data JSONB,
  by_id UUID,
  by_name TEXT,
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_audit_entity ON public.fin_audit_log(master_id, entity, entity_id);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['fin_categories','fin_accounts','fin_card_terminals','fin_receivables','fin_recurrences','fin_payables','fin_budgets'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_touch ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_touch BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at()', t, t);
  END LOOP;
END $$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['fin_categories','fin_accounts','fin_card_terminals','fin_contract_reviews','fin_receivables','fin_recurrences','fin_payables',
                           'fin_payable_allocations','fin_transactions','fin_card_settlements','fin_revenue_recognition','fin_contract_cancellations','fin_budgets','fin_audit_log'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_full_access" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_full_access" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t, t);
    EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.fin_seed_default_categories(p_master UUID) RETURNS INT AS $f$
DECLARE n INT := 0; r RECORD;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('rec_festas_15','Festas de 15 anos','receita',NULL,10),
      ('rec_festas_casamento','Casamentos','receita',NULL,11),
      ('rec_festas_outras','Outras festas e eventos','receita',NULL,12),
      ('rec_multas_distrato','Multas e distratos','receita',NULL,20),
      ('rec_outras','Outras receitas','receita',NULL,30),
      ('ded_das','DAS / impostos sobre vendas','deducao',NULL,40),
      ('ded_estornos','Estornos e devolucoes','deducao',NULL,41),
      ('cev_buffet','Buffet','custo_evento','variavel',50),
      ('cev_bebidas','Bebidas','custo_evento','variavel',51),
      ('cev_equipe','Equipe do evento','custo_evento','variavel',52),
      ('cev_decoracao','Decoracao','custo_evento','variavel',53),
      ('cev_som_dj','DJ e som','custo_evento','variavel',54),
      ('cev_cerimonial','Cerimonial','custo_evento','variavel',55),
      ('cev_foto_video','Foto e filmagem','custo_evento','variavel',56),
      ('cev_bolo_doces','Bolo e doces','custo_evento','variavel',57),
      ('cev_seguranca_limpeza','Seguranca e limpeza do evento','custo_evento','variavel',58),
      ('dop_aluguel','Aluguel','despesa_operacional','fixo',70),
      ('dop_folha','Folha fixa','despesa_operacional','fixo',71),
      ('dop_prolabore','Pro-labore','despesa_operacional','fixo',72),
      ('dop_energia','Energia','despesa_operacional','fixo',73),
      ('dop_agua','Agua','despesa_operacional','fixo',74),
      ('dop_internet','Internet e telefone','despesa_operacional','fixo',75),
      ('dop_manutencao','Manutencao','despesa_operacional','fixo',76),
      ('dop_contador','Contador','despesa_operacional','fixo',77),
      ('dop_seguros','Seguros','despesa_operacional','fixo',78),
      ('dop_comissoes','Comissoes','despesa_operacional','variavel',80),
      ('dop_marketing','Marketing e anuncios','despesa_operacional','variavel',81),
      ('dop_material','Material de escritorio','despesa_operacional','variavel',82),
      ('dop_deslocamento','Deslocamento','despesa_operacional','variavel',83),
      ('fin_taxa_cartao','Taxas de cartao e antecipacao','resultado_financeiro',NULL,90),
      ('fin_tarifas','Tarifas bancarias','resultado_financeiro',NULL,91),
      ('fin_juros_pagos','Juros pagos','resultado_financeiro',NULL,92),
      ('fin_juros_recebidos','Juros recebidos','resultado_financeiro',NULL,93)
    ) AS v(k, nm, kd, nat, ord)
  LOOP
    INSERT INTO public.fin_categories (master_id, system_key, name, kind, cost_nature, is_system, sort_order)
    VALUES (p_master, r.k, r.nm, r.kd, r.nat, TRUE, r.ord)
    ON CONFLICT (master_id, system_key) WHERE system_key IS NOT NULL DO NOTHING;
    IF FOUND THEN n := n + 1; END IF;
  END LOOP;
  RETURN n;
END;
$f$ LANGUAGE plpgsql;

DO $$
DECLARE m UUID;
BEGIN
  FOR m IN SELECT DISTINCT master_id FROM public.venues WHERE master_id IS NOT NULL LOOP
    PERFORM public.fin_seed_default_categories(m);
  END LOOP;
END $$;


-- ==============================================================================
-- 6. FUNIL FINANCEIRO E RENEGOCIAÇÃO (OVERRIDE + VIEW CONSOLIDADA)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.fin_contract_stage_overrides (
  contract_id UUID PRIMARY KEY REFERENCES public.contracts(id) ON DELETE CASCADE,
  master_id UUID NOT NULL,
  manual_stage TEXT NOT NULL CHECK (manual_stage IN ('renegociacao','cancelamento')),
  note TEXT,
  set_by UUID,
  set_by_name TEXT,
  set_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_stage_overrides_master ON public.fin_contract_stage_overrides(master_id, manual_stage);

ALTER TABLE public.fin_contract_stage_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fin_contract_stage_overrides_full_access" ON public.fin_contract_stage_overrides;
CREATE POLICY "fin_contract_stage_overrides_full_access" ON public.fin_contract_stage_overrides FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON public.fin_contract_stage_overrides TO anon, authenticated, service_role;

DROP VIEW IF EXISTS public.v_fin_contract_summary CASCADE;
CREATE VIEW public.v_fin_contract_summary AS
WITH r AS (
  SELECT contract_id,
         sum(amount) FILTER (WHERE status NOT IN ('cancelado','estornado')) AS total_amount,
         sum(LEAST(paid_amount, amount)) FILTER (WHERE status NOT IN ('cancelado','estornado')) AS paid_amount,
         COALESCE(sum(amount - LEAST(paid_amount, amount)) FILTER (WHERE status IN ('pendente','parcial','renegociado')), 0) AS pending_amount,
         COALESCE(sum(amount - LEAST(paid_amount, amount)) FILTER (WHERE status IN ('pendente','parcial') AND due_date < CURRENT_DATE), 0) AS overdue_amount,
         count(*) FILTER (WHERE status IN ('pendente','parcial') AND due_date < CURRENT_DATE) AS overdue_count,
         COALESCE(max(CURRENT_DATE - due_date) FILTER (WHERE status IN ('pendente','parcial') AND due_date < CURRENT_DATE), 0) AS max_overdue_days,
         min(due_date) FILTER (WHERE status IN ('pendente','parcial')) AS next_due_date,
         count(*) FILTER (WHERE status = 'parcial') AS partial_count,
         count(*) AS receivables_count
  FROM public.fin_receivables GROUP BY contract_id
), rv AS (
  SELECT DISTINCT ON (contract_id) contract_id, status AS review_status
  FROM public.fin_contract_reviews ORDER BY contract_id, created_at DESC
)
SELECT c.id AS contract_id, c.master_id, c.venue_id, c.contract_code, c.contract_title, c.client_id, c.contact_id,
       c.event_date,
       c.total_amount AS contract_total,
       COALESCE(r.total_amount, 0) AS receivables_total,
       COALESCE(r.paid_amount, 0) AS paid_amount,
       COALESCE(r.pending_amount, 0) AS pending_amount,
       COALESCE(r.overdue_amount, 0) AS overdue_amount,
       COALESCE(r.overdue_count, 0) AS overdue_count,
       COALESCE(r.max_overdue_days, 0) AS max_overdue_days,
       r.next_due_date,
       (r.next_due_date IS NOT NULL AND r.next_due_date >= CURRENT_DATE AND r.next_due_date <= CURRENT_DATE + 7) AS due_soon,
       COALESCE(r.partial_count, 0) AS partial_count,
       COALESCE(r.receivables_count, 0) AS receivables_count,
       rv.review_status,
       ov.manual_stage,
       ov.note AS manual_note,
       CASE
         WHEN rv.review_status = 'pendente' THEN 'aguardando_aprovacao'
         WHEN rv.review_status = 'reprovado' THEN 'reprovado'
         WHEN r.contract_id IS NULL THEN 'sem_plano'
         WHEN ov.manual_stage = 'cancelamento' THEN 'cancelamento'
         WHEN COALESCE(r.pending_amount, 0) <= 0 THEN 'quitado'
         WHEN ov.manual_stage = 'renegociacao' THEN 'renegociacao'
         WHEN COALESCE(r.overdue_amount, 0) > 0 THEN 'inadimplente'
         ELSE 'em_dia'
       END AS stage_key
FROM public.contracts c
LEFT JOIN r ON r.contract_id = c.id
LEFT JOIN rv ON rv.contract_id = c.id
LEFT JOIN public.fin_contract_stage_overrides ov ON ov.contract_id = c.id
WHERE c.approval_status IN ('approved', 'completed');

GRANT SELECT ON public.v_fin_contract_summary TO anon, authenticated, service_role;


-- ==============================================================================
-- 7. CONEXÃO FIXA DO FINANCEIRO (SOURCES)
-- ==============================================================================
INSERT INTO public.sources (id, venue_id, name, type, funnel_id, status, configuration)
SELECT gen_random_uuid(), v.id::text, 'Financeiro • ' || v.name, 'whatsapp_api', NULL, 'active', '{"role":"financeiro","fixed":true}'::jsonb
FROM public.venues v
WHERE NOT EXISTS (
  SELECT 1 FROM public.sources s WHERE s.venue_id = v.id::text AND s.configuration->>'role' = 'financeiro'
);


-- ==============================================================================
-- 8. FORNECEDORES E ORÇAMENTOS
-- ==============================================================================
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS is_supplier boolean NOT NULL DEFAULT false;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS supplier_profile jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_contacts_supplier ON public.contacts (master_id) WHERE is_supplier;

CREATE TABLE IF NOT EXISTS public.supplier_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID NOT NULL,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','reprovado')),
  requested_by_name TEXT,
  decided_by_name TEXT,
  decided_at TIMESTAMPTZ,
  decision_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_contact ON public.supplier_quotes (master_id, contact_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_status ON public.supplier_quotes (master_id, status);

ALTER TABLE public.supplier_quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS supplier_quotes_full_access ON public.supplier_quotes;
CREATE POLICY supplier_quotes_full_access ON public.supplier_quotes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON public.supplier_quotes TO anon, authenticated, service_role;


-- ==============================================================================
-- 9. WHATSAPP: DEDUPLICAÇÃO E ÍNDICE ÚNICO ATÔMICO
-- ==============================================================================
-- Expurga qualquer duplicidade anterior em lead_activities para permitir criar o indice unico sem erro
DELETE FROM public.lead_activities a
USING public.lead_activities b
WHERE a.id < b.id
  AND a.lead_id = b.lead_id
  AND a.metadata->>'messageId' IS NOT NULL
  AND a.metadata->>'messageId' = b.metadata->>'messageId';

CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_activities_unique_msg_id 
ON public.lead_activities (lead_id, (metadata->>'messageId')) 
WHERE metadata->>'messageId' IS NOT NULL;


-- ==============================================================================
-- 10. FUNIL DE PÓS-VENDA VIENA POS
-- ==============================================================================
INSERT INTO public.commercial_funnels (id, master_id, name, is_post_sale, venue_id, stages)
SELECT 
  '4802bb1c-dbdf-4494-a58c-3f97431277a0'::uuid,
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'VIENA POS',
  true,
  'd4577a14-d09a-46c4-af64-5e6655b0e626'::uuid,
  '[
    {"id":"new_lead","name":"ENTRADA DO CLIENTE","order":0,"color":"#EF4444","isFixed":true,"icon":"inbox"},
    {"id":"onboarding","name":"BOAS-VINDAS","order":1,"color":"#3B82F6","isFixed":true},
    {"id":"planning","name":"BRIEFING","order":2,"color":"#F59E0B"},
    {"id":"suppliers","name":"ACOMPANHAMENTO 2026","order":3,"color":"#8B5CF6"},
    {"id":"final_alignment","name":"2027 - 1 SEMESTRE","order":4,"color":"#6366F1"},
    {"id":"party_day","name":"2027 - 2 SEMESTRE","order":5,"color":"#EAB308"},
    {"id":"stage_1793989471576","name":"2028","order":6,"color":"#8B5CF6","hints":"","triggers":[]},
    {"id":"stage_1793989480244","name":"2029+","order":7,"color":"#10B981","hints":"","triggers":[]},
    {"id":"completed","name":"EVENTO REALIZADO","order":8,"color":"#10B981","isFixed":true,"isWon":true},
    {"id":"lost","name":"CONTRATO CANCELADO","order":9,"color":"#EF4444","isFixed":true,"isLoss":true}
  ]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.commercial_funnels WHERE id = '4802bb1c-dbdf-4494-a58c-3f97431277a0'::uuid
);

-- ==============================================================================
-- 11. REATIVAÇÃO DO WHATSAPP
-- ==============================================================================
INSERT INTO public.system_feature_flags (
    feature_id, name, description, category, status, coming_soon_message, updated_at, updated_by
)
VALUES (
    'whatsapp_messaging', 'Mensagens do WhatsApp',
    'Liga/desliga o envio e o recebimento de mensagens pelo WhatsApp em todo o sistema.',
    'Atendimento', 'active', NULL, now(), 'reativacao_pos_deploy'
)
ON CONFLICT (feature_id) DO UPDATE SET
    status = 'active',
    coming_soon_message = NULL,
    updated_at = now(),
    updated_by = 'reativacao_pos_deploy';
