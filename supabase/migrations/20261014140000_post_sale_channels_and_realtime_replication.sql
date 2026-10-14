-- Migration: 20261014140000_post_sale_channels_and_realtime_replication.sql
-- Description: Adiciona suporte a canais setoriais no pós-venda, nomes customizáveis de etapas, tabela de agenda e habilita realtime de forma 100% segura.

-- 1. Criação da tabela de configurações de agenda por unidade (se não existir)
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

-- 2. Colunas em commercial_funnels para abas do pós-venda
ALTER TABLE public.commercial_funnels 
ADD COLUMN IF NOT EXISTS post_sale_channels JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS post_sale_custom_stage_names JSONB DEFAULT '{}'::jsonb;

-- 3. Colunas de setor em lead_activities
ALTER TABLE public.lead_activities 
ADD COLUMN IF NOT EXISTS channel_id TEXT,
ADD COLUMN IF NOT EXISTS channel_name TEXT,
ADD COLUMN IF NOT EXISTS instance_id TEXT;

-- 4. Habilita replicação em tempo real de forma segura e idempotente
DO $$
DECLARE
  target_table TEXT;
  target_tables TEXT[] := ARRAY[
    'appointments',
    'venue_agenda_configs',
    'commercial_funnels',
    'clients',
    'venues',
    'leads'
  ];
BEGIN
  FOREACH target_table IN ARRAY target_tables LOOP
    -- Verifica se a tabela existe no banco
    IF EXISTS (
      SELECT 1 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = target_table
    ) THEN
      -- Se a tabela existe, verifica se já não está na publicação
      IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = target_table
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', target_table);
        RAISE NOTICE 'Tabela % adicionada ao supabase_realtime.', target_table;
      ELSE
        RAISE NOTICE 'Tabela % já é membro do supabase_realtime (ignorado).', target_table;
      END IF;
    ELSE
      RAISE NOTICE 'Tabela % não existe no banco (ignorado).', target_table;
    END IF;
  END LOOP;
END $$;

-- 5. Comentários de auditoria
COMMENT ON COLUMN public.commercial_funnels.post_sale_channels IS 'Configurações de abas setoriais de WhatsApp no Pós-Venda (Decoração, Produção, etc.)';
COMMENT ON COLUMN public.commercial_funnels.post_sale_custom_stage_names IS 'Nomes customizados para etapas fixas de Ganho e Perda no Pós-Venda';
