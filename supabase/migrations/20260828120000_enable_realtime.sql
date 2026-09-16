-- ==============================================================================
-- MIGRAÇÃO: HABILITAÇÃO DO SUPABASE REALTIME MULTI-USUÁRIO
-- Permite que alterações em leads, indicações, convidados, tarefas e debutantes
-- sejam transmitidas instantaneamente via WebSocket para todos os clientes.
-- ==============================================================================

-- 1. Configura REPLICA IDENTITY FULL para garantir payload completo nos eventos de UPDATE
ALTER TABLE IF EXISTS public.leads REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.referrals REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.guests REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.debutantes REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.commercial_funnels REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.admin_tasks REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.appointments REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.venues REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.collaborators REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.benefit_catalog_items REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.vip_reward_catalog_items REPLICA IDENTITY FULL;

-- 2. Adiciona as tabelas na publicação supabase_realtime
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'leads',
        'referrals',
        'guests',
        'debutantes',
        'commercial_funnels',
        'admin_tasks',
        'appointments',
        'venues',
        'collaborators',
        'benefit_catalog_items',
        'vip_reward_catalog_items'
    ];
BEGIN
    -- Garante que a publicação supabase_realtime existe
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    -- Adiciona cada tabela à publicação de realtime se ainda não estiver
    FOREACH tbl IN ARRAY tables
    LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
        EXCEPTION
            WHEN duplicate_object THEN
                -- Tabela já adicionada, ignora
                NULL;
            WHEN undefined_table THEN
                -- Tabela ainda não existe no banco, ignora
                NULL;
        END;
    END LOOP;
END $$;
