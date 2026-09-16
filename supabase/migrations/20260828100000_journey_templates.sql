-- ============================================================================
-- MIGRAÇÃO DEFINITIVA: TEMPLATES DE JORNADA, CAMPOS DE DEBUTANTE E LEADS
-- ============================================================================

-- 1. Garante colunas de jornada na tabela de templates
CREATE TABLE IF NOT EXISTS public.journey_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    season_or_period TEXT,
    cycle_days INT DEFAULT 7,
    cycle_target INT DEFAULT 3,
    milestones JSONB DEFAULT '[]'::jsonb,
    vip_rewards JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Adiciona season_or_period caso a tabela já existisse sem ela
ALTER TABLE public.journey_templates 
ADD COLUMN IF NOT EXISTS season_or_period TEXT,
ADD COLUMN IF NOT EXISTS milestones JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS vip_rewards JSONB DEFAULT '[]'::jsonb;

-- 2. Garante colunas de jornada na tabela de debutantes
ALTER TABLE public.debutantes
ADD COLUMN IF NOT EXISTS milestones JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS vip_rewards JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS journey_cycle JSONB DEFAULT '{"journeyStatus": "active", "currentCycleStartDate": "", "currentCycleEndDate": "", "cycleRenewalProgress": 0}'::jsonb,
ADD COLUMN IF NOT EXISTS referrals JSONB DEFAULT '[]'::jsonb;

-- 3. Habilita RLS e permissões públicas completas para Realtime
ALTER TABLE public.journey_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debutantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "journey_templates_all_access" ON public.journey_templates;
CREATE POLICY "journey_templates_all_access" ON public.journey_templates FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "leads_public_insert_and_manage" ON public.leads;
CREATE POLICY "leads_public_insert_and_manage" ON public.leads FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "debutantes_public_manage" ON public.debutantes;
CREATE POLICY "debutantes_public_manage" ON public.debutantes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "referrals_public_manage" ON public.referrals;
CREATE POLICY "referrals_public_manage" ON public.referrals FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. Garante Realtime ativo em todas as tabelas comerciais
ALTER TABLE public.journey_templates REPLICA IDENTITY FULL;
ALTER TABLE public.debutantes REPLICA IDENTITY FULL;
ALTER TABLE public.leads REPLICA IDENTITY FULL;
ALTER TABLE public.referrals REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.journey_templates;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.debutantes;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.referrals;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;
