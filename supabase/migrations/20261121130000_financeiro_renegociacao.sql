-- ==============================================================================
-- F5 SYSTEM • FINANCEIRO: "Negociacao" vira "Renegociacao" (a divida ja negociada que volta a ser negociada)
-- A etapa manual e definida na ficha do contrato (nao por arrastar). Idempotente.
-- ==============================================================================
ALTER TABLE public.fin_contract_stage_overrides DROP CONSTRAINT IF EXISTS fin_contract_stage_overrides_manual_stage_check;
UPDATE public.fin_contract_stage_overrides SET manual_stage = 'renegociacao' WHERE manual_stage = 'negociacao';
ALTER TABLE public.fin_contract_stage_overrides
  ADD CONSTRAINT fin_contract_stage_overrides_manual_stage_check CHECK (manual_stage IN ('renegociacao','cancelamento'));

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
