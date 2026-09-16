-- ==============================================================================
-- MIGRAÇÃO: PERSISTÊNCIA DE PACOTES, FORMAS DE PGTO, TAGS E CAMPOS PERSONALIZADOS DO FUNIL
-- Data: 2026-09-13
-- ==============================================================================

ALTER TABLE IF EXISTS public.commercial_funnels
ADD COLUMN IF NOT EXISTS package_options JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS payment_options JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS predefined_tags JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]'::jsonb;
