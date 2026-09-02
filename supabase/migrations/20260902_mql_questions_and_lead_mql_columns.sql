-- ==============================================================================
-- MIGRAÇÃO: PERSISTÊNCIA DE MQL (TABELA DE PERGUNTAS E COLUNAS EM LEADS)
-- Data: 2026-09-02
-- ==============================================================================

-- 1. Tabela de Perguntas de MQL (Qualificação Comercial)
CREATE TABLE IF NOT EXISTS public.mql_questions (
  id TEXT PRIMARY KEY,
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  weight INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_mql_questions_venue_id ON public.mql_questions(venue_id);
CREATE INDEX IF NOT EXISTS idx_mql_questions_order ON public.mql_questions(order_index);

-- 2. Colunas de MQL na tabela de leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS mql_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS mql_level TEXT DEFAULT 'cold',
ADD COLUMN IF NOT EXISTS mql_answers JSONB DEFAULT '{}'::jsonb;

-- Índices para filtros e ordenação rápida por MQL no CRM
CREATE INDEX IF NOT EXISTS idx_leads_mql_score ON public.leads(mql_score);
CREATE INDEX IF NOT EXISTS idx_leads_mql_level ON public.leads(mql_level);
