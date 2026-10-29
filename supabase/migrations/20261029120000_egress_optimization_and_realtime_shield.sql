-- ==============================================================================
-- F5 SYSTEM • OTIMIZAÇÃO CRÍTICA DE EGRESS E BLINDAGEM SUPREMA DO SUPABASE
-- ==============================================================================
-- 1. Remove tabelas de eventos de alta frequência da publicação supabase_realtime
--    (Elimina replicação massiva de WebSocket a cada clique/visualização de anúncio)
-- 2. Cria índices estratégicos para acelerar consultas filtradas e reduzir Egress
-- ==============================================================================

-- 1. REMOVER TABELAS DE TELEMETRIA/EVENTOS DO REALTIME
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'source_events'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.source_events;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'whatsapp_webhook_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.whatsapp_webhook_logs;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 2. ÍNDICES ESTRATÉGICOS PARA CONSULTAS LEVES E PROJEÇÕES RESTRITAS
CREATE INDEX IF NOT EXISTS idx_leads_debutante_filter 
  ON public.leads(debutante_id) 
  WHERE debutante_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_debutante_slug_filter 
  ON public.leads(debutante_slug) 
  WHERE debutante_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lead_activities_type_timestamp 
  ON public.lead_activities(type, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_timestamp 
  ON public.lead_activities(lead_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_source_events_recent 
  ON public.source_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_created 
  ON public.task_comments(task_id, created_at DESC);
