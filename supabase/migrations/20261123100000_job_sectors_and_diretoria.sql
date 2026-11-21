-- ==============================================================================
-- F5 SYSTEM • SETORES E CARGOS DINÂMICOS, DIRETORIA E MARKETING & TECNOLOGIA
-- Permite reordenar setores, criar novos setores dinamicamente e cadastra Diretoria
-- ==============================================================================

-- 1. Remove restrições engessadas de setores para permitir setores dinâmicos
ALTER TABLE public.job_roles DROP CONSTRAINT IF EXISTS job_roles_sector_check;
ALTER TABLE public.job_role_order DROP CONSTRAINT IF EXISTS job_role_order_sector_check;

-- 2. Tabela de setores personalizados e ordenáveis por Master
CREATE TABLE IF NOT EXISTS public.job_sectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL,
    sector_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#14A9D7',
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_job_sectors_master_sector UNIQUE (master_id, sector_id)
);

CREATE INDEX IF NOT EXISTS idx_job_sectors_master ON public.job_sectors(master_id, position);

ALTER TABLE public.job_sectors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_sectors_master_scope" ON public.job_sectors;
CREATE POLICY "job_sectors_master_scope" ON public.job_sectors
    FOR ALL TO authenticated
    USING (master_id = public.f5_current_master_id())
    WITH CHECK (master_id = public.f5_current_master_id());

-- 3. Migra eventuais cargos antigos de marketing para marketing_tecnologia
UPDATE public.job_roles SET sector = 'marketing_tecnologia' WHERE sector = 'marketing';
UPDATE public.job_role_order SET sector = 'marketing_tecnologia' WHERE sector = 'marketing';

-- 4. Seed inicial dos setores oficiais para os masters existentes
INSERT INTO public.job_sectors (master_id, sector_id, name, color, position)
SELECT DISTINCT c.master_id, s.sector_id, s.name, s.color, s.position
FROM public.collaborators c
CROSS JOIN (
    VALUES 
        ('diretoria', 'Diretoria', '#D4AF37', 0),
        ('comercial', 'Comercial', '#10B981', 1),
        ('pos_venda', 'Pós-Venda', '#06B6D4', 2),
        ('financeiro', 'Financeiro', '#F59E0B', 3),
        ('marketing_tecnologia', 'Marketing e Tecnologia', '#EC4899', 4)
) AS s(sector_id, name, color, position)
WHERE c.master_id IS NOT NULL
ON CONFLICT (master_id, sector_id) DO NOTHING;
