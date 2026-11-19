-- Nome de exibicao dos cargos, por Master.
-- O cargo (SDR, Closer, Gerente geral...) continua o mesmo para o sistema; so o nome mostrado muda
-- (ex.: SDR aparece como "Especialista"). Vale para cargos padrao e personalizados.
-- Isolamento: master_id obrigatorio e RLS por Master (nao usa USING (true)). Requer public.f5_current_master_id(). Idempotente.

CREATE TABLE IF NOT EXISTS public.job_role_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    role_id TEXT NOT NULL CHECK (char_length(role_id) BETWEEN 3 AND 120),
    display_name TEXT NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 2 AND 60),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_job_role_labels_master_role UNIQUE (master_id, role_id)
);
CREATE INDEX IF NOT EXISTS idx_job_role_labels_master ON public.job_role_labels(master_id);

ALTER TABLE public.job_role_labels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "job_role_labels_master_scope" ON public.job_role_labels;
CREATE POLICY "job_role_labels_master_scope" ON public.job_role_labels
    FOR ALL TO authenticated
    USING (master_id = public.f5_current_master_id())
    WITH CHECK (master_id = public.f5_current_master_id());
