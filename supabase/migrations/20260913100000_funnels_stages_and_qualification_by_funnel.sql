-- ==============================================================================
-- MIGRAÇÃO: PERSISTÊNCIA DE ETAPAS DE FUNIS, REGRAS DE DUPLICADOS E QUALIFICAÇÃO POR FUNIS
-- Data: 2026-09-13
-- ==============================================================================

-- 1. Campos avançados na tabela commercial_funnels
ALTER TABLE IF EXISTS public.commercial_funnels
ADD COLUMN IF NOT EXISTS stages JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS is_entry_stage_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS detect_duplicates BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS duplicate_rule_config JSONB DEFAULT '{"matchPhone":true,"matchEmail":false,"matchName":false,"action":"keep_recent"}'::jsonb,
ADD COLUMN IF NOT EXISTS shared_venue_ids UUID[] DEFAULT '{}';

-- 2. Tabela de perguntas de MQL / Qualificação por Funis
ALTER TABLE IF EXISTS public.mql_questions
ALTER COLUMN venue_id DROP NOT NULL;

ALTER TABLE IF EXISTS public.mql_questions
ADD COLUMN IF NOT EXISTS funnel_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS funnel_id UUID REFERENCES public.commercial_funnels(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS profile_name TEXT,
ADD COLUMN IF NOT EXISTS venue_ids UUID[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_mql_questions_funnel_id ON public.mql_questions(funnel_id);
