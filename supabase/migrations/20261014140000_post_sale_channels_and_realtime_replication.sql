-- Migration: 20261014140000_post_sale_channels_and_realtime_replication.sql
-- Description: Adiciona suporte a canais setoriais no pós-venda, nomes customizáveis de etapas e habilita realtime nas tabelas necessárias.

-- 1. Colunas em commercial_funnels para pós-venda
ALTER TABLE public.commercial_funnels 
ADD COLUMN IF NOT EXISTS post_sale_channels JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS post_sale_custom_stage_names JSONB DEFAULT '{}'::jsonb;

-- 2. Colunas de canal em lead_activities e client_activities
ALTER TABLE public.lead_activities 
ADD COLUMN IF NOT EXISTS channel_id TEXT,
ADD COLUMN IF NOT EXISTS channel_name TEXT,
ADD COLUMN IF NOT EXISTS instance_id TEXT;

-- 3. Assegurar replicação completa em realtime para as tabelas críticas
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.venue_agenda_configs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.commercial_funnels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.venues;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;

-- 4. Comentários de auditoria
COMMENT ON COLUMN public.commercial_funnels.post_sale_channels IS 'Configurações de abas setoriais de WhatsApp no Pós-Venda (Decoração, Produção, etc.)';
COMMENT ON COLUMN public.commercial_funnels.post_sale_custom_stage_names IS 'Nomes customizados para etapas fixas de Ganho e Perda no Pós-Venda';
