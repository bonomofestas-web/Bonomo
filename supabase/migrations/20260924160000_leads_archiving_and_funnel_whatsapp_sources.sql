-- ==============================================================================
-- MIGRAÇÃO: PERSISTÊNCIA DE ARQUIVAMENTO DE LEADS E FONTES DE WHATSAPP NOS FUNIS
-- Data: 2026-09-24
-- ==============================================================================

-- 1. Campos de persistência na tabela commercial_funnels
ALTER TABLE IF EXISTS public.commercial_funnels
ADD COLUMN IF NOT EXISTS whatsapp_sources JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS post_sale_entry_stage_id TEXT,
ADD COLUMN IF NOT EXISTS priority_whatsapp_per_venue JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS default_whatsapp_source_id TEXT,
ADD COLUMN IF NOT EXISTS venue_distribution_config JSONB DEFAULT '{}'::jsonb;

-- 2. Campos de persistência na tabela leads
ALTER TABLE IF EXISTS public.leads
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- 3. Índices para performance de busca e listagem
CREATE INDEX IF NOT EXISTS idx_leads_is_archived ON public.leads(is_archived);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
