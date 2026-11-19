-- Catalogo de cargos personalizados por setor (acesso x cargo).
-- O cargo "fixo" de cada setor vem do codigo (SDR, Closer, Gerente comercial, Gerente geral, Gestor de marketing...).
-- Aqui ficam os cargos digitados pelo usuario ("Outro"): entram no banco, aparecem para todos do Master e
-- podem ser excluidos na configuracao de cargos.
-- Isolamento: master_id obrigatorio e RLS por Master (nao usa USING (true)).
-- Requer public.f5_current_master_id(). Idempotente.

CREATE TABLE IF NOT EXISTS public.job_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    sector TEXT NOT NULL CHECK (sector IN ('comercial', 'pos_venda', 'gerencia', 'financeiro', 'marketing')),
    name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 60),
    slug TEXT NOT NULL,
    created_by_id UUID,
    created_by_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    -- O mesmo cargo nao se repete no mesmo setor do mesmo Master
    CONSTRAINT uq_job_roles_master_sector_slug UNIQUE (master_id, sector, slug)
);
CREATE INDEX IF NOT EXISTS idx_job_roles_master ON public.job_roles(master_id, sector);

ALTER TABLE public.job_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "job_roles_master_scope" ON public.job_roles;
CREATE POLICY "job_roles_master_scope" ON public.job_roles
    FOR ALL TO authenticated
    USING (master_id = public.f5_current_master_id())
    WITH CHECK (master_id = public.f5_current_master_id());
