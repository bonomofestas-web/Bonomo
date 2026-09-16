-- ==============================================================================
-- MIGRAÇÃO: EXCLUSÃO SEGURA DE CASAS DE FESTAS E PRESERVAÇÃO DE LEADS
-- Data: 2026-09-08
-- ==============================================================================

-- 1. Adicionar coluna venue_name na tabela leads se ainda não existir
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS venue_name TEXT;

-- 2. Congelar o nome histórico da casa em todos os leads existentes
UPDATE public.leads l
SET venue_name = v.name
FROM public.venues v
WHERE l.venue_id = v.id AND (l.venue_name IS NULL OR l.venue_name = '');

-- 3. Permitir que venue_id e funnel_id sejam nulos para leads desvinculados
ALTER TABLE public.leads ALTER COLUMN venue_id DROP NOT NULL;
ALTER TABLE public.leads ALTER COLUMN funnel_id DROP NOT NULL;

-- 4. Modificar restrição de chave estrangeira de leads.venue_id para ON DELETE SET NULL
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_venue_id_fkey;
ALTER TABLE public.leads 
ADD CONSTRAINT leads_venue_id_fkey 
  FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE SET NULL;

-- 5. Modificar restrição de chave estrangeira de leads.funnel_id para ON DELETE SET NULL
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_funnel_id_fkey;
ALTER TABLE public.leads 
ADD CONSTRAINT leads_funnel_id_fkey 
  FOREIGN KEY (funnel_id) REFERENCES public.commercial_funnels(id) ON DELETE SET NULL;

-- 6. Garantir índice para busca por venue_name
CREATE INDEX IF NOT EXISTS idx_leads_venue_name ON public.leads(venue_name);
