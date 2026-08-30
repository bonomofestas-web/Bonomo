-- ==============================================================================
-- MIGRAÇÃO: MÓDULO DE ORIGENS E RASTREAMENTO DE LEADS (POR CASA DE FESTA)
-- Data: 2026-08-30
-- ==============================================================================

-- 1. Tabela de Origens de Entrada (Sources)
CREATE TABLE IF NOT EXISTS public.sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id TEXT NOT NULL, -- Casa de Festa obrigatória
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'whatsapp_api' | 'tracking_link' | 'form' | 'referral'
  funnel_id TEXT NOT NULL, -- 1 único funil de destino obrigatório
  whatsapp_instance_id TEXT, -- Desacoplado para futura integração da API
  status TEXT DEFAULT 'active', -- 'active' | 'inactive'
  slug TEXT UNIQUE, -- Slug único para /r/:slug e /f/:slug
  configuration JSONB DEFAULT '{}'::jsonb, -- Configurações específicas do tipo
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Registro e Auditoria de Eventos de Origem (Source Events)
CREATE TABLE IF NOT EXISTS public.source_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES public.sources(id) ON DELETE CASCADE,
  venue_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'link_click' | 'form_view' | 'form_submit' | 'lead_created'
  lead_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb, -- IP, user-agent, referrer, dados submetidos
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Adicionar coluna source_id na tabela de leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS source_id UUID;

-- 4. Habilitar RLS nas novas tabelas
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_events ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de Acesso Total e Público
DROP POLICY IF EXISTS "sources_full_access" ON public.sources;
CREATE POLICY "sources_full_access" ON public.sources 
FOR ALL TO anon, authenticated 
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "source_events_full_access" ON public.source_events;
CREATE POLICY "source_events_full_access" ON public.source_events 
FOR ALL TO anon, authenticated 
USING (true) WITH CHECK (true);

-- 6. Índices para alta performance de consulta por slug e venue
CREATE INDEX IF NOT EXISTS idx_sources_slug ON public.sources(slug);
CREATE INDEX IF NOT EXISTS idx_sources_venue_id ON public.sources(venue_id);
CREATE INDEX IF NOT EXISTS idx_source_events_source_id ON public.source_events(source_id);
CREATE INDEX IF NOT EXISTS idx_source_events_venue_id ON public.source_events(venue_id);
