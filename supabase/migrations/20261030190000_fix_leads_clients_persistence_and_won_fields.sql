-- ============================================================================
-- MIGRAÇÃO: PERSISTÊNCIA COMPLETA DE LEADS & CLIENTS (FECHAMENTO / GANHO)
-- Data: 2026-10-30
-- Propósito: Garantir que todos os campos da ficha (profissão, cartão, decisores,
--            período, parcelas) e isolamento multi-tenant (master_id, funnel_id)
--            persistam diretamente no PostgreSQL sem perda ou fallback silencioso.
-- ============================================================================

-- 1. EXPANSÃO DA TABELA DE LEADS
ALTER TABLE IF EXISTS public.leads
ADD COLUMN IF NOT EXISTS has_credit_card BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS profession TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS event_year TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS down_payment NUMERIC(12, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS installments INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS installment_value NUMERIC(12, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS decision_makers TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS desired_period TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '[]'::jsonb;

-- 2. EXPANSÃO DA TABELA DE CLIENTES (PÓS-VENDA)
ALTER TABLE IF EXISTS public.clients
ADD COLUMN IF NOT EXISTS master_id UUID REFERENCES public.collaborators(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS funnel_id UUID REFERENCES public.commercial_funnels(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS has_credit_card BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS profession TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS event_year TEXT DEFAULT NULL;

-- 3. ÍNDICES DE DESEMPENHO E ISOLAMENTO MULTI-TENANT
CREATE INDEX IF NOT EXISTS idx_clients_master_id ON public.clients(master_id);
CREATE INDEX IF NOT EXISTS idx_clients_funnel_id ON public.clients(funnel_id);
CREATE INDEX IF NOT EXISTS idx_leads_master_id ON public.leads(master_id);

-- 4. REALTIME GARANTIDO PARA AMBAS AS TABELAS
ALTER TABLE IF EXISTS public.leads REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.clients REPLICA IDENTITY FULL;

