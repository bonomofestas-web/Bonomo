-- ==============================================================================
-- F5 SYSTEM • FINANCEIRO (Fase 3): funil financeiro
-- Etapas automaticas pelas parcelas (Em dia, Inadimplente, Quitado) + etapas MANUAIS (Negociacao, Cancelamento)
-- guardadas em fin_contract_stage_overrides. "A vencer" deixa de ser etapa e vira TAG (due_soon).
-- Mesmo padrao de acesso das demais tabelas (ver docs/PLANO_FINANCEIRO.md, secao 6). Idempotente.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.fin_contract_stage_overrides (
  contract_id UUID PRIMARY KEY REFERENCES public.contracts(id) ON DELETE CASCADE,
  master_id UUID NOT NULL,
  manual_stage TEXT NOT NULL CHECK (manual_stage IN ('negociacao','cancelamento')),
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

DROP VIEW IF EXISTS public.v_fin_contract_summary;
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
         WHEN ov.manual_stage = 'negociacao' THEN 'negociacao'
         WHEN COALESCE(r.overdue_amount, 0) > 0 THEN 'inadimplente'
         ELSE 'em_dia'
       END AS stage_key
FROM public.contracts c
LEFT JOIN r ON r.contract_id = c.id
LEFT JOIN rv ON rv.contract_id = c.id
LEFT JOIN public.fin_contract_stage_overrides ov ON ov.contract_id = c.id
WHERE c.approval_status IN ('approved', 'completed');

GRANT SELECT ON public.v_fin_contract_summary TO anon, authenticated, service_role;
