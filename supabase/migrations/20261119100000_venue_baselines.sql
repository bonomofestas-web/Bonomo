-- Metricas base da casa: valores iniciais de referencia para clientes que entram sem historico no sistema.
-- Usadas no dashboard em "Comparar com: Base da unidade".
-- Isolamento: master_id obrigatorio; RLS restrita ao Master do usuario (NAO usa USING (true)).
-- Requer public.f5_current_master_id() (migration 20261117140000). Idempotente.

CREATE TABLE IF NOT EXISTS public.venue_baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    conversion_rate NUMERIC(6, 2),          -- lead -> contrato (%)
    qualification_rate NUMERIC(6, 2),       -- captado -> qualificado (%)
    qual_to_sched_rate NUMERIC(6, 2),       -- qualificado -> agendado (%)
    sched_to_attend_rate NUMERIC(6, 2),     -- agendado -> compareceu (%)
    attend_to_won_rate NUMERIC(6, 2),       -- compareceu -> fechou (%)
    loss_rate NUMERIC(6, 2),                -- leads perdidos (%)
    leads_per_month INT,
    appointments_per_month INT,
    contracts_per_month INT,
    avg_ticket NUMERIC(12, 2),
    monthly_revenue NUMERIC(12, 2),
    response_time_minutes INT,              -- 1a resposta
    avg_response_minutes INT,               -- media de qualquer mensagem
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_venue_baselines_venue UNIQUE (venue_id)
);

CREATE INDEX IF NOT EXISTS idx_venue_baselines_master ON public.venue_baselines(master_id);

ALTER TABLE public.venue_baselines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "venue_baselines_master_scope" ON public.venue_baselines;
CREATE POLICY "venue_baselines_master_scope" ON public.venue_baselines
    FOR ALL TO authenticated
    USING (master_id = public.f5_current_master_id())
    WITH CHECK (master_id = public.f5_current_master_id());
