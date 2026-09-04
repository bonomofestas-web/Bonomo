-- ==============================================================================
-- MIGRAÇÃO: HABILITAÇÃO COMPLETA DE REALTIME PARA SUPORTE, FLAGS E ANÚNCIOS
-- Garante sincronização instantânea de tickets de suporte, mensagens do chat,
-- feature flags corporativas, anúncios, origens e colaboradores desativados.
-- ==============================================================================

-- 1. Configurar REPLICA IDENTITY FULL nas tabelas críticas
ALTER TABLE IF EXISTS public.support_tickets REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.support_ticket_messages REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.system_feature_flags REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.system_broadcast_announcements REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.sources REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.source_events REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.collaborators REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.leads REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.debutantes REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.guests REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.referrals REPLICA IDENTITY FULL;

-- 2. Adicionar as tabelas na publicação supabase_realtime
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'support_tickets',
        'support_ticket_messages',
        'system_feature_flags',
        'system_broadcast_announcements',
        'sources',
        'source_events',
        'collaborators',
        'leads',
        'debutantes',
        'guests',
        'referrals',
        'admin_tasks'
    ];
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    FOREACH tbl IN ARRAY tables
    LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
        EXCEPTION
            WHEN duplicate_object THEN
                NULL;
            WHEN undefined_table THEN
                NULL;
        END;
    END LOOP;
END $$;
