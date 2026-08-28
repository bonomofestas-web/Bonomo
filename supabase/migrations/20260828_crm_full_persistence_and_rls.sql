-- ==============================================================================
-- MIGRAÇÃO DEFINITIVA: PERSISTÊNCIA 100% E RLS PÚBLICO/ANON PARA O CRM & DEBUTANTES
-- Garante que leads, atividades, participantes, tarefas, indicações e templates
-- sejam gravados e lidos sem bloqueio de RLS pelo cliente anon e authenticated.
-- ==============================================================================

-- 1. Habilita RLS em todas as tabelas do CRM
ALTER TABLE IF EXISTS public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lead_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.debutantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.commercial_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.journey_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.benefit_catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vip_reward_catalog_items ENABLE ROW LEVEL SECURITY;

-- 2. Políticas de Acesso Total (Leitura, Inserção, Atualização, Exclusão) para anon e authenticated

-- LEADS
DROP POLICY IF EXISTS "leads_full_access" ON public.leads;
DROP POLICY IF EXISTS "leads_auth_read" ON public.leads;
DROP POLICY IF EXISTS "leads_auth_write" ON public.leads;
DROP POLICY IF EXISTS "leads_public_insert_and_manage" ON public.leads;
CREATE POLICY "leads_full_access" ON public.leads FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- LEAD ACTIVITIES (Histórico do CRM, Notas, Mudanças de Fase, Gravação de Áudio)
DROP POLICY IF EXISTS "lead_activities_full_access" ON public.lead_activities;
DROP POLICY IF EXISTS "lead_activities_auth_read" ON public.lead_activities;
DROP POLICY IF EXISTS "lead_activities_auth_write" ON public.lead_activities;
CREATE POLICY "lead_activities_full_access" ON public.lead_activities FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- LEAD PARTICIPANTS (Colaboradores vinculados ao Lead, SDRs, Closers)
DROP POLICY IF EXISTS "lead_participants_full_access" ON public.lead_participants;
DROP POLICY IF EXISTS "lead_participants_auth_read" ON public.lead_participants;
DROP POLICY IF EXISTS "lead_participants_auth_write" ON public.lead_participants;
CREATE POLICY "lead_participants_full_access" ON public.lead_participants FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ADMIN TASKS (Tarefas do CRM e Operacionais)
DROP POLICY IF EXISTS "admin_tasks_full_access" ON public.admin_tasks;
DROP POLICY IF EXISTS "admin_tasks_auth_read" ON public.admin_tasks;
DROP POLICY IF EXISTS "admin_tasks_auth_write" ON public.admin_tasks;
CREATE POLICY "admin_tasks_full_access" ON public.admin_tasks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- REFERRALS (Indicações de Debutantes)
DROP POLICY IF EXISTS "referrals_full_access" ON public.referrals;
DROP POLICY IF EXISTS "referrals_public_read" ON public.referrals;
DROP POLICY IF EXISTS "referrals_public_insert" ON public.referrals;
DROP POLICY IF EXISTS "referrals_auth_write" ON public.referrals;
DROP POLICY IF EXISTS "referrals_public_manage" ON public.referrals;
CREATE POLICY "referrals_full_access" ON public.referrals FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- DEBUTANTES
DROP POLICY IF EXISTS "debutantes_full_access" ON public.debutantes;
DROP POLICY IF EXISTS "debutantes_public_read" ON public.debutantes;
DROP POLICY IF EXISTS "debutantes_auth_write" ON public.debutantes;
DROP POLICY IF EXISTS "debutantes_public_manage" ON public.debutantes;
CREATE POLICY "debutantes_full_access" ON public.debutantes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- COLLABORATORS
DROP POLICY IF EXISTS "collaborators_full_access" ON public.collaborators;
DROP POLICY IF EXISTS "collaborators_public_read" ON public.collaborators;
DROP POLICY IF EXISTS "collaborators_auth_write" ON public.collaborators;
CREATE POLICY "collaborators_full_access" ON public.collaborators FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- VENUES
DROP POLICY IF EXISTS "venues_full_access" ON public.venues;
DROP POLICY IF EXISTS "venues_public_read" ON public.venues;
DROP POLICY IF EXISTS "venues_auth_write" ON public.venues;
CREATE POLICY "venues_full_access" ON public.venues FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- COMMERCIAL FUNNELS
DROP POLICY IF EXISTS "commercial_funnels_full_access" ON public.commercial_funnels;
DROP POLICY IF EXISTS "commercial_funnels_public_read" ON public.commercial_funnels;
DROP POLICY IF EXISTS "commercial_funnels_auth_write" ON public.commercial_funnels;
CREATE POLICY "commercial_funnels_full_access" ON public.commercial_funnels FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- JOURNEY TEMPLATES
DROP POLICY IF EXISTS "journey_templates_full_access" ON public.journey_templates;
DROP POLICY IF EXISTS "journey_templates_all_access" ON public.journey_templates;
CREATE POLICY "journey_templates_full_access" ON public.journey_templates FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- GUESTS & APPOINTMENTS
DROP POLICY IF EXISTS "guests_full_access" ON public.guests;
CREATE POLICY "guests_full_access" ON public.guests FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "appointments_full_access" ON public.appointments;
CREATE POLICY "appointments_full_access" ON public.appointments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 3. Configura REPLICA IDENTITY FULL para suporte a WebSockets em tempo real
ALTER TABLE IF EXISTS public.leads REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.lead_activities REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.lead_participants REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.admin_tasks REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.referrals REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.debutantes REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.commercial_funnels REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.venues REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.collaborators REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.journey_templates REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.guests REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.appointments REPLICA IDENTITY FULL;

-- 4. Adiciona tabelas à publicação supabase_realtime
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'leads',
        'lead_activities',
        'lead_participants',
        'admin_tasks',
        'referrals',
        'debutantes',
        'commercial_funnels',
        'venues',
        'collaborators',
        'journey_templates',
        'guests',
        'appointments'
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
