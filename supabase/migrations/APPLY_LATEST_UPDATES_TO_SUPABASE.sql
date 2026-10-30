-- ==============================================================================
-- F5 SYSTEM • SCRIPT CONSOLIDADO DE ATUALIZAÇÕES RECENTES PARA O SUPABASE
-- Data: Outubro / 2026
-- Execute este script completo no SQL Editor do Supabase Dashboard.
-- Todas as instruções são 100% IDEMPOTENTES (podem ser executadas com segurança).
-- ==============================================================================

-- 1. TABELA DE MENSAGENS RÁPIDAS (ATALHOS '/' DO WHATSAPP)
CREATE TABLE IF NOT EXISTS public.quick_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID REFERENCES public.collaborators(id) ON DELETE CASCADE,
    venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
    keyword TEXT NOT NULL,
    message TEXT NOT NULL,
    created_by TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE IF EXISTS public.quick_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quick_messages_full_access" ON public.quick_messages;
CREATE POLICY "quick_messages_full_access" ON public.quick_messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
ALTER TABLE IF EXISTS public.quick_messages REPLICA IDENTITY FULL;

CREATE INDEX IF NOT EXISTS idx_quick_messages_master_keyword ON public.quick_messages(master_id, keyword);
CREATE INDEX IF NOT EXISTS idx_quick_messages_active ON public.quick_messages(is_active);

-- 2. TABELA DE CONFIGURAÇÃO DE AGENDA POR UNIDADE (VISITAS E DEGUSTAÇÕES)
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

ALTER TABLE IF EXISTS public.venue_agenda_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "venue_agenda_configs_full_access" ON public.venue_agenda_configs;
CREATE POLICY "venue_agenda_configs_full_access" ON public.venue_agenda_configs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
ALTER TABLE IF EXISTS public.venue_agenda_configs REPLICA IDENTITY FULL;

-- 3. COLUNA FUNNEL_ID NA TABELA DE CLIENTES (PÓS-VENDA)
ALTER TABLE IF EXISTS public.clients 
ADD COLUMN IF NOT EXISTS funnel_id UUID REFERENCES public.commercial_funnels(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_clients_funnel_id ON public.clients(funnel_id);

-- 4. COLUNAS DE CANAIS SETORIAIS E NOMES CUSTOMIZADOS DE ETAPAS EM COMMERCIAL_FUNNELS
ALTER TABLE IF EXISTS public.commercial_funnels 
ADD COLUMN IF NOT EXISTS post_sale_channels JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS post_sale_custom_stage_names JSONB DEFAULT '{}'::jsonb;

-- 5. COLUNAS DE CANAL / SETOR EM LEAD_ACTIVITIES
ALTER TABLE IF EXISTS public.lead_activities 
ADD COLUMN IF NOT EXISTS channel_id TEXT,
ADD COLUMN IF NOT EXISTS channel_name TEXT,
ADD COLUMN IF NOT EXISTS instance_id TEXT;

-- 6. HABILITAÇÃO DO REALTIME NAS TABELAS RECENTES (IDEMPOTENTE)
DO $$
DECLARE
  target_table TEXT;
  target_tables TEXT[] := ARRAY[
    'quick_messages',
    'venue_agenda_configs',
    'commercial_funnels',
    'clients',
    'venues',
    'leads',
    'appointments'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH target_table IN ARRAY target_tables LOOP
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = target_table
      ) THEN
        IF NOT EXISTS (
          SELECT 1 FROM pg_publication_tables 
          WHERE pubname = 'supabase_realtime' 
            AND schemaname = 'public' 
            AND tablename = target_table
        ) THEN
          EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', target_table);
          RAISE NOTICE 'Tabela % adicionada ao supabase_realtime.', target_table;
        END IF;
      END IF;
    END LOOP;
  END IF;
END $$;

-- 7. BLINDAGEM DE EGRESS: EXPURGO DE EVENTOS DO REALTIME E CRIAÇÃO DE ÍNDICES ESTRATÉGICOS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'source_events') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.source_events;
    RAISE NOTICE 'Tabela source_events removida do supabase_realtime para blindagem de Egress.';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'whatsapp_webhook_logs') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.whatsapp_webhook_logs;
    RAISE NOTICE 'Tabela whatsapp_webhook_logs removida do supabase_realtime para blindagem de Egress.';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_leads_debutante_filter ON public.leads(debutante_id) WHERE debutante_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_debutante_slug_filter ON public.leads(debutante_slug) WHERE debutante_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lead_activities_type_timestamp ON public.lead_activities(type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_timestamp ON public.lead_activities(lead_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_source_events_recent ON public.source_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_created ON public.task_comments(task_id, created_at DESC);

-- 8. FLEXIBILIZAÇÃO E PERSISTÊNCIA COMPLETA DE FUNIS MULTIUNIDADES (COMMERCIAL_FUNNELS)
DO $$
BEGIN
  -- Permite que venue_id seja NULL para funis multiunidades/globais da rede Master
  ALTER TABLE IF EXISTS public.commercial_funnels ALTER COLUMN venue_id DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE IF EXISTS public.commercial_funnels
ADD COLUMN IF NOT EXISTS shared_venue_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS disabled_venue_ids TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS allowed_collaborator_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS stages JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS stages_count INT DEFAULT 4,
ADD COLUMN IF NOT EXISTS is_entry_stage_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS detect_duplicates BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS duplicate_rule_config JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS is_won_stage_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS distribution_mode TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS assigned_sdr_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS venue_distribution_config JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS package_options JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS payment_options JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS predefined_tags JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS allow_collaborators_create_tags BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS default_whatsapp_source_id UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS priority_whatsapp_per_venue JSONB DEFAULT '{}'::jsonb;

