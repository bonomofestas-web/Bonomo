-- ==============================================================================
-- F5 SYSTEM • FINANCEIRO (Fase 1): tabelas base do modulo financeiro gerencial
-- Ver docs/PLANO_FINANCEIRO.md.
--
-- Todas as tabelas tem master_id (isolamento no servico, como o resto do sistema).
-- SEGURANCA: o app nao usa Supabase Auth para todos os usuarios, entao a policy segue o padrao das demais
-- tabelas (acesso via anon/authenticated) e a protecao e feita em financeService + canAccessFinance.
-- Endurecer com auth.uid() exige migrar os colaboradores para o Supabase Auth (ver o documento, secao 6).
-- Idempotente: pode rodar mais de uma vez.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.fin_touch_updated_at() RETURNS trigger AS $f$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$f$ LANGUAGE plpgsql;

-- ---------- Plano de categorias ----------
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

-- ---------- Contas e maquininhas ----------
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
  -- taxa (%) por numero de parcelas: {"1": 2.1, "2": 3.4, ... "12": 11.9}
  fee_table JSONB NOT NULL DEFAULT '{}'::jsonb,
  anticipation_fee_pct NUMERIC(6,3) NOT NULL DEFAULT 0,
  settlement_days INT NOT NULL DEFAULT 30,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_card_terminals_master ON public.fin_card_terminals(master_id);

-- ---------- Revisao do financeiro (aprovacao do contrato) ----------
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

-- ---------- A receber ----------
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
  due_rule JSONB,                       -- ex.: {"base":"event_date","offset_days":30} (recalculada se a festa mudar)
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),   -- valor BRUTO
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','parcial','pago','cancelado','renegociado','estornado')),
  payment_method TEXT,
  installments INT,                     -- cartao: numero de parcelas no cartao
  terminal_id UUID REFERENCES public.fin_card_terminals(id) ON DELETE SET NULL,
  competence_date DATE,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual',  -- manual | plano_contrato | importacao
  import_key TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_fin_receivables_import_key ON public.fin_receivables(master_id, import_key) WHERE import_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fin_receivables_contract ON public.fin_receivables(contract_id);
CREATE INDEX IF NOT EXISTS idx_fin_receivables_due ON public.fin_receivables(master_id, due_date) WHERE status IN ('pendente','parcial');
CREATE INDEX IF NOT EXISTS idx_fin_receivables_venue ON public.fin_receivables(master_id, venue_id);

-- ---------- A pagar e rateio por evento ----------
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
  source TEXT NOT NULL DEFAULT 'manual',   -- manual | recorrencia | comissao | taxa_cartao
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_payables_due ON public.fin_payables(master_id, due_date) WHERE status IN ('pendente','parcial');
CREATE INDEX IF NOT EXISTS idx_fin_payables_venue ON public.fin_payables(master_id, venue_id);

-- Rateio: um custo de uma festa so = 1 linha com 100%; compra/diaria que atende 2-3 festas = varias linhas (soma 100%).
-- Sem linhas de rateio = despesa geral da casa.
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

-- ---------- Movimentos de caixa (baixas) ----------
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
  net_amount NUMERIC(14,2) GENERATED ALWAYS AS (gross_amount - fee_amount) STORED,   -- o que entra de fato na conta
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

-- Calendario de liquidacao do cartao (10x = 10 depositos liquidos previstos); concilia o LIQUIDO no extrato.
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

-- ---------- Competencia, distrato e auditoria ----------
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
  month DATE NOT NULL,                  -- primeiro dia do mes
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

-- ---------- updated_at ----------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['fin_categories','fin_accounts','fin_card_terminals','fin_receivables','fin_recurrences','fin_payables','fin_budgets'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_touch ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_touch BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at()', t, t);
  END LOOP;
END $$;

-- ---------- RLS (mesmo padrao das demais tabelas; ver aviso no topo) ----------
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

-- ---------- Categorias padrao de casa de festas (por Master; idempotente) ----------
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

-- semeia para todo Master que ja tem unidades
DO $$
DECLARE m UUID;
BEGIN
  FOR m IN SELECT DISTINCT master_id FROM public.venues WHERE master_id IS NOT NULL LOOP
    PERFORM public.fin_seed_default_categories(m);
  END LOOP;
END $$;

-- ---------- Resumo financeiro por contrato (etapa do funil calculada) ----------
CREATE OR REPLACE VIEW public.v_fin_contract_summary AS
WITH r AS (
  SELECT contract_id,
         sum(amount) FILTER (WHERE status NOT IN ('cancelado','estornado')) AS total_amount,
         sum(LEAST(paid_amount, amount)) FILTER (WHERE status NOT IN ('cancelado','estornado')) AS paid_amount,
         COALESCE(sum(amount - LEAST(paid_amount, amount)) FILTER (WHERE status IN ('pendente','parcial','renegociado')), 0) AS pending_amount,
         COALESCE(sum(amount - LEAST(paid_amount, amount)) FILTER (WHERE status IN ('pendente','parcial') AND due_date < CURRENT_DATE), 0) AS overdue_amount,
         count(*) FILTER (WHERE status IN ('pendente','parcial') AND due_date < CURRENT_DATE) AS overdue_count,
         min(due_date) FILTER (WHERE status IN ('pendente','parcial')) AS next_due_date,
         count(*) AS receivables_count
  FROM public.fin_receivables GROUP BY contract_id
), rv AS (
  SELECT DISTINCT ON (contract_id) contract_id, status AS review_status
  FROM public.fin_contract_reviews ORDER BY contract_id, created_at DESC
)
SELECT c.id AS contract_id, c.master_id, c.venue_id, c.contract_code, c.contract_title, c.client_id, c.contact_id,
       c.total_amount AS contract_total,
       COALESCE(r.total_amount, 0) AS receivables_total,
       COALESCE(r.paid_amount, 0) AS paid_amount,
       COALESCE(r.pending_amount, 0) AS pending_amount,
       COALESCE(r.overdue_amount, 0) AS overdue_amount,
       COALESCE(r.overdue_count, 0) AS overdue_count,
       r.next_due_date,
       COALESCE(r.receivables_count, 0) AS receivables_count,
       rv.review_status,
       CASE
         WHEN rv.review_status = 'pendente' THEN 'aguardando_aprovacao'
         WHEN rv.review_status = 'reprovado' THEN 'reprovado'
         WHEN r.contract_id IS NULL THEN 'sem_plano'
         WHEN COALESCE(r.pending_amount, 0) <= 0 THEN 'quitado'
         WHEN COALESCE(r.overdue_amount, 0) > 0 THEN 'inadimplente'
         WHEN r.next_due_date <= CURRENT_DATE + 7 THEN 'a_vencer'
         ELSE 'em_dia'
       END AS stage_key
FROM public.contracts c
LEFT JOIN r ON r.contract_id = c.id
LEFT JOIN rv ON rv.contract_id = c.id
WHERE c.approval_status IN ('approved', 'completed');

GRANT SELECT ON public.v_fin_contract_summary TO anon, authenticated, service_role;
