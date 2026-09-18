-- ==============================================================================
-- MIGRAÇÃO: PERSISTÊNCIA COMPLETA DE FUNIS, COMPROMISSOS COMERCIAIS (PAX),
--           AJUSTES DE CLIENTES E DISPONIBILIDADE DE AGENDA
-- Data: 2026-09-17
-- ==============================================================================

-- 1. EXPANSÃO DE COMMERCIAL_FUNNELS:
-- Suporte a funil sem ganho (passagem), modo de distribuição (roleta/round-robin),
-- índices de revezamento de SDRs, ordenação cronológica de fixação e ordem de exibição
ALTER TABLE IF EXISTS public.commercial_funnels
ADD COLUMN IF NOT EXISTS is_won_stage_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS distribution_mode TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS assigned_sdr_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS round_robin_next_index INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "order" INT DEFAULT 0;

-- 2. EXPANSÃO DE LEADS:
-- Suporte a compromissos comerciais eternos (Visita e Degustação com PAX),
-- campos customizados definidos pelos funis, registro de colaborador criador (manual),
-- aniversário e CPF contratual
ALTER TABLE IF EXISTS public.leads
ADD COLUMN IF NOT EXISTS visit_commitment JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tasting_commitment JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS custom_field_values JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS funnel_entered_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS created_by_name TEXT,
ADD COLUMN IF NOT EXISTS created_by_avatar TEXT,
ADD COLUMN IF NOT EXISTS birthday TEXT,
ADD COLUMN IF NOT EXISTS cpf TEXT;

-- 3. AJUSTE DE APPOINTMENTS (COMPROMISSOS):
-- Permitir debutante_id NULLABLE (para compromissos de leads comerciais em prospecção)
-- e associar diretamente a leads com controle de PAX
DO $$
BEGIN
    ALTER TABLE public.appointments ALTER COLUMN debutante_id DROP NOT NULL;
EXCEPTION
    WHEN others THEN NULL;
END $$;

ALTER TABLE IF EXISTS public.appointments
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS lead_name TEXT,
ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT 'client',
ADD COLUMN IF NOT EXISTS pax INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS commitment_type TEXT;

CREATE INDEX IF NOT EXISTS idx_appointments_lead_id ON public.appointments(lead_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(date);

-- 4. EXPANSÃO DE CLIENTS (PÓS-VENDA):
-- Garantir persistência de dados contratuais e financeiros
ALTER TABLE IF EXISTS public.clients
ADD COLUMN IF NOT EXISTS contract_status TEXT DEFAULT 'aguardando_sinal',
ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS signal_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS signal_value NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS signal_paid_at TIMESTAMPTZ;

-- 5. TABELA DE DISPONIBILIDADE DE AGENDA (SLOTS & CAPACIDADE POR UNIDADE):
CREATE TABLE IF NOT EXISTS public.venue_agenda_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
    visits_rule JSONB NOT NULL DEFAULT '{"enabledDays":[1,2,3,4,5,6],"timeSlots":["10:00","14:00","16:00","18:00"],"durationMinutes":45,"maxConcurrentPerSlot":2}'::jsonb,
    tastings_rule JSONB NOT NULL DEFAULT '{"enabledDays":[3],"timeSlots":["19:30"],"durationMinutes":90,"maxConcurrentPerSlot":4,"maxPaxPerSlot":20}'::jsonb,
    blackout_dates JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_venue_agenda UNIQUE (venue_id)
);

-- RLS & Realtime
ALTER TABLE IF EXISTS public.venue_agenda_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "venue_agenda_configs_full_access" ON public.venue_agenda_configs;
CREATE POLICY "venue_agenda_configs_full_access" ON public.venue_agenda_configs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
ALTER TABLE IF EXISTS public.venue_agenda_configs REPLICA IDENTITY FULL;

-- Garante replicação realtime para todas as tabelas afetadas
ALTER TABLE IF EXISTS public.commercial_funnels REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.leads REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.appointments REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.clients REPLICA IDENTITY FULL;
