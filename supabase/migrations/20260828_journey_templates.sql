-- ============================================================================
-- TABELA DE TEMPLATES DE JORNADA (METAS E BENEFÍCIOS DAS DEBUTANTES)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.journey_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    cycle_days INT DEFAULT 7,
    cycle_target INT DEFAULT 3,
    milestones JSONB DEFAULT '[]'::jsonb,
    vip_rewards JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilita RLS
ALTER TABLE public.journey_templates ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (leitura e gravação)
DROP POLICY IF EXISTS "journey_templates_public_read" ON public.journey_templates;
CREATE POLICY "journey_templates_public_read" ON public.journey_templates FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "journey_templates_all" ON public.journey_templates;
CREATE POLICY "journey_templates_all" ON public.journey_templates FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Realtime
ALTER TABLE public.journey_templates REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.journey_templates;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
END $$;
