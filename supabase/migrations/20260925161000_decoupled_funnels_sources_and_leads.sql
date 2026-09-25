-- ==============================================================================
-- F5 SYSTEM • MIGRAÇÃO: FUNIS SOLTOS, ORIGENS VINCULADAS A CASAS E LEADS POR CASA
-- ==============================================================================
-- 1. Funis não precisam de casa de festa fixa obrigatória (podem ser soltos do master)
ALTER TABLE IF EXISTS public.commercial_funnels 
  ALTER COLUMN venue_id DROP NOT NULL;

-- 2. Origens pertencem à Casa de Festa, mas funnel_id passa a ser opcional
ALTER TABLE IF EXISTS public.sources 
  ALTER COLUMN funnel_id DROP NOT NULL;

-- 3. Leads pertencem à Casa de Festa, mas funnel_id passa a ser opcional
ALTER TABLE IF EXISTS public.leads 
  ALTER COLUMN funnel_id DROP NOT NULL;

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_commercial_funnels_master_id ON public.commercial_funnels(master_id);
CREATE INDEX IF NOT EXISTS idx_sources_funnel_id ON public.sources(funnel_id);
CREATE INDEX IF NOT EXISTS idx_sources_venue_id ON public.sources(venue_id);
CREATE INDEX IF NOT EXISTS idx_leads_venue_id ON public.leads(venue_id);
