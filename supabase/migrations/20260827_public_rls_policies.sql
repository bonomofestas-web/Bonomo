-- ============================================================================
-- BONOMO FESTAS - POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ============================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.venues               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborators        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_funnels   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debutantes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_tasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_participants    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benefit_catalog_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_reward_catalog_items ENABLE ROW LEVEL SECURITY;

-- VENUES
DROP POLICY IF EXISTS "venues_public_read" ON public.venues;
CREATE POLICY "venues_public_read" ON public.venues FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "venues_auth_write" ON public.venues;
CREATE POLICY "venues_auth_write" ON public.venues FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- COLLABORATORS
DROP POLICY IF EXISTS "collaborators_auth_read" ON public.collaborators;
CREATE POLICY "collaborators_auth_read" ON public.collaborators FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "collaborators_auth_write" ON public.collaborators;
CREATE POLICY "collaborators_auth_write" ON public.collaborators FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- COMMERCIAL FUNNELS
DROP POLICY IF EXISTS "funnels_auth_read" ON public.commercial_funnels;
CREATE POLICY "funnels_auth_read" ON public.commercial_funnels FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "funnels_auth_write" ON public.commercial_funnels;
CREATE POLICY "funnels_auth_write" ON public.commercial_funnels FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- DEBUTANTES (leitura e update público para funcionar via link)
DROP POLICY IF EXISTS "debutantes_public_read" ON public.debutantes;
CREATE POLICY "debutantes_public_read" ON public.debutantes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "debutantes_public_update" ON public.debutantes;
CREATE POLICY "debutantes_public_update" ON public.debutantes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "debutantes_auth_insert" ON public.debutantes;
CREATE POLICY "debutantes_auth_insert" ON public.debutantes FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "debutantes_auth_delete" ON public.debutantes;
CREATE POLICY "debutantes_auth_delete" ON public.debutantes FOR DELETE TO authenticated USING (true);

-- LEADS (sensível - apenas autenticados)
DROP POLICY IF EXISTS "leads_auth_read" ON public.leads;
CREATE POLICY "leads_auth_read" ON public.leads FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "leads_auth_write" ON public.leads;
CREATE POLICY "leads_auth_write" ON public.leads FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ADMIN TASKS
DROP POLICY IF EXISTS "admin_tasks_auth_read" ON public.admin_tasks;
CREATE POLICY "admin_tasks_auth_read" ON public.admin_tasks FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admin_tasks_auth_write" ON public.admin_tasks;
CREATE POLICY "admin_tasks_auth_write" ON public.admin_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- LEAD ACTIVITIES
DROP POLICY IF EXISTS "lead_activities_auth_read" ON public.lead_activities;
CREATE POLICY "lead_activities_auth_read" ON public.lead_activities FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "lead_activities_auth_write" ON public.lead_activities;
CREATE POLICY "lead_activities_auth_write" ON public.lead_activities FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- LEAD PARTICIPANTS
DROP POLICY IF EXISTS "lead_participants_auth_read" ON public.lead_participants;
CREATE POLICY "lead_participants_auth_read" ON public.lead_participants FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "lead_participants_auth_write" ON public.lead_participants;
CREATE POLICY "lead_participants_auth_write" ON public.lead_participants FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- REFERRALS (insert público - debutante indica amigas sem login)
DROP POLICY IF EXISTS "referrals_public_read" ON public.referrals;
CREATE POLICY "referrals_public_read" ON public.referrals FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "referrals_public_insert" ON public.referrals;
CREATE POLICY "referrals_public_insert" ON public.referrals FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "referrals_auth_write" ON public.referrals;
CREATE POLICY "referrals_auth_write" ON public.referrals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- GUESTS (insert/update público - RSVP e auto-convite)
DROP POLICY IF EXISTS "guests_public_read" ON public.guests;
CREATE POLICY "guests_public_read" ON public.guests FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "guests_public_insert" ON public.guests;
CREATE POLICY "guests_public_insert" ON public.guests FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "guests_public_update" ON public.guests;
CREATE POLICY "guests_public_update" ON public.guests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "guests_auth_delete" ON public.guests;
CREATE POLICY "guests_auth_delete" ON public.guests FOR DELETE TO authenticated USING (true);

-- APPOINTMENTS
DROP POLICY IF EXISTS "appointments_public_read" ON public.appointments;
CREATE POLICY "appointments_public_read" ON public.appointments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "appointments_auth_write" ON public.appointments;
CREATE POLICY "appointments_auth_write" ON public.appointments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- BENEFIT CATALOG ITEMS
DROP POLICY IF EXISTS "benefit_catalog_public_read" ON public.benefit_catalog_items;
CREATE POLICY "benefit_catalog_public_read" ON public.benefit_catalog_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "benefit_catalog_auth_write" ON public.benefit_catalog_items;
CREATE POLICY "benefit_catalog_auth_write" ON public.benefit_catalog_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- VIP REWARD CATALOG ITEMS
DROP POLICY IF EXISTS "vip_reward_catalog_public_read" ON public.vip_reward_catalog_items;
CREATE POLICY "vip_reward_catalog_public_read" ON public.vip_reward_catalog_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "vip_reward_catalog_auth_write" ON public.vip_reward_catalog_items;
CREATE POLICY "vip_reward_catalog_auth_write" ON public.vip_reward_catalog_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
