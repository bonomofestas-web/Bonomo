-- ==============================================================================
-- MIGRAÇÃO: PERSISTÊNCIA DE PRIORIDADE DE WHATSAPP POR UNIDADE NOS FUNIS
-- Data: 2026-09-23
-- ==============================================================================

ALTER TABLE IF EXISTS public.commercial_funnels
ADD COLUMN IF NOT EXISTS priority_whatsapp_per_venue JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS default_whatsapp_source_id TEXT,
ADD COLUMN IF NOT EXISTS venue_distribution_config JSONB DEFAULT '{}'::jsonb;
