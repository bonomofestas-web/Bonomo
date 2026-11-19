-- 1) Historico de mudancas do colaborador (cargo, setores, unidades, ativacao) e 2) ordem hierarquica dos cargos.
-- Isolamento: master_id obrigatorio e RLS por Master (nao usa USING (true)). Requer public.f5_current_master_id(). Idempotente.

-- Historico imutavel: so SELECT e INSERT (nunca altera nem apaga pelo app)
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
DROP POLICY IF EXISTS "collaborator_history_select" ON public.collaborator_history;
CREATE POLICY "collaborator_history_select" ON public.collaborator_history
    FOR SELECT TO authenticated
    USING (master_id = public.f5_current_master_id());
DROP POLICY IF EXISTS "collaborator_history_insert" ON public.collaborator_history;
CREATE POLICY "collaborator_history_insert" ON public.collaborator_history
    FOR INSERT TO authenticated
    WITH CHECK (master_id = public.f5_current_master_id());

-- Ordem dos cargos (posicao menor = aparece primeiro) dentro de cada setor, por Master
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
DROP POLICY IF EXISTS "job_role_order_master_scope" ON public.job_role_order;
CREATE POLICY "job_role_order_master_scope" ON public.job_role_order
    FOR ALL TO authenticated
    USING (master_id = public.f5_current_master_id())
    WITH CHECK (master_id = public.f5_current_master_id());
