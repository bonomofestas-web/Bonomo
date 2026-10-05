-- ============================================================================
-- MIGRAÇÃO: ADIÇÃO DE FUNNEL_ID À TABELA PUBLIC.CLIENTS (PÓS-VENDA)
-- Data: 2026-10-05
-- Propósito: Permitir vinculação direta de clientes a funis específicos de pós-venda
-- ============================================================================

ALTER TABLE IF EXISTS public.clients 
ADD COLUMN IF NOT EXISTS funnel_id UUID REFERENCES public.commercial_funnels(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_funnel_id ON public.clients(funnel_id);
