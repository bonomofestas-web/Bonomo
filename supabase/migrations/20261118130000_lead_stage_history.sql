-- Historico de etapas do lead (jornada): cada passagem por uma etapa do funil, com entrada e saida.
-- Base para "tempo em cada etapa", "tempo ate o fechamento" e para o snapshot do contrato.
-- Isolamento: master_id obrigatorio; RLS restrita ao Master do usuario (NAO usa USING (true)).
-- Requer a funcao public.f5_current_master_id() (migration 20261117140000). Idempotente.

CREATE TABLE IF NOT EXISTS public.lead_stage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    funnel_id UUID,
    stage_id TEXT NOT NULL,
    stage_name TEXT,
    entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    left_at TIMESTAMPTZ,
    moved_by_id UUID,
    moved_by_name TEXT
);

CREATE INDEX IF NOT EXISTS idx_lead_stage_history_lead ON public.lead_stage_history (lead_id, entered_at);
CREATE INDEX IF NOT EXISTS idx_lead_stage_history_master ON public.lead_stage_history (master_id);

ALTER TABLE public.lead_stage_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_stage_history_master_scope" ON public.lead_stage_history;
CREATE POLICY "lead_stage_history_master_scope" ON public.lead_stage_history
    FOR ALL TO authenticated
    USING (master_id = public.f5_current_master_id())
    WITH CHECK (master_id = public.f5_current_master_id());

-- Backfill minimo: uma linha de entrada na etapa atual para leads que ainda nao tem historico
INSERT INTO public.lead_stage_history (master_id, lead_id, funnel_id, stage_id, entered_at)
SELECT l.master_id, l.id,
       CASE WHEN l.funnel_id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN l.funnel_id::text::uuid END,
       l.stage, COALESCE(l.created_at, now())
FROM public.leads l
WHERE l.master_id IS NOT NULL
  AND l.stage IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.lead_stage_history h WHERE h.lead_id = l.id);
