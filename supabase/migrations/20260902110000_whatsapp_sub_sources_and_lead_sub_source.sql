-- ==============================================================================
-- MIGRAÇÃO: SUB-ORIGENS DE WHATSAPP COM PALAVRAS-CHAVE E ATRIBUIÇÃO DE FUNIL
-- Data: 2026-09-02
-- ==============================================================================

-- 1. Adicionar colunas de sub_source e source_name na tabela de leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS sub_source TEXT,
ADD COLUMN IF NOT EXISTS source_name TEXT;

-- 2. Índice para consultas rápidas por sub_source e source_id
CREATE INDEX IF NOT EXISTS idx_leads_source_id ON public.leads(source_id);
CREATE INDEX IF NOT EXISTS idx_leads_sub_source ON public.leads(sub_source);
