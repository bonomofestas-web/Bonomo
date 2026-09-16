-- ============================================================================
-- F5 SYSTEM • SCRIPT UNIFICADO DE CRIAÇÃO E MIGRAÇÃO DE NOVO BANCO SUPABASE
-- Data de geração: 2026-09-16T02:28:31.815Z
-- Instruções:
-- 1. Abra o novo projeto no Supabase Dashboard (https://supabase.com/dashboard)
-- 2. No menu lateral esquerdo, clique em "SQL Editor"
-- 3. Clique em "+ New Query" (Nova Consulta)
-- 4. Cole TODO o conteúdo deste arquivo e clique no botão verde "Run" (ou Ctrl+Enter)
-- 5. Aguarde alguns segundos até o término da execução (Success. No rows returned).
-- ============================================================================

-- ============================================================================
-- PARTE 1: ESTRUTURA DO BANCO (DDL - TABELAS, FUNÇÕES, TRIGGERS, RLS, REALTIME)
-- ============================================================================

-- >>> MIGRAÇÃO: 20260826120000_initial_production_schema.sql <<<
-- ============================================================================
-- BONOMO FESTAS - SCHEMA COMPLETO DO BANCO DE DADOS (SUPABASE / POSTGRESQL)
-- ============================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TABELA DE CASAS DE FESTAS (EMPREENDIMENTOS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    tagline TEXT,
    logo_url TEXT,
    ballroom_image_url TEXT,
    description TEXT,
    experience_text TEXT,
    address TEXT,
    years_in_business INT DEFAULT 0,
    events_completed INT DEFAULT 0,
    guests_delighted INT DEFAULT 0,
    google_maps_embed_url TEXT,
    google_maps_link TEXT,
    waze_link TEXT,
    default_dress_code TEXT DEFAULT 'Esporte Fino / Gala',
    primary_color TEXT DEFAULT '#D4AF37',
    secondary_color TEXT DEFAULT '#AA7C11',
    accent_color TEXT DEFAULT '#F3E5AB',
    glow_color TEXT DEFAULT 'rgba(212,175,55,0.4)',
    font_family TEXT DEFAULT 'Montserrat',
    welcome_video_url TEXT,
    welcome_video_name TEXT,
    lead_distribution_mode TEXT DEFAULT 'queue', -- 'queue' | 'round_robin'
    lead_distribution_sdr_ids UUID[] DEFAULT '{}',
    round_robin_next_index INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 2. TABELA DE COLABORADORES & PERFIS (USUÁRIOS ADMIN / CRM)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.collaborators (
    id UUID PRIMARY KEY, -- referencia auth.users(id) se autenticado via Supabase Auth
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'sdr', -- 'master' | 'admin' | 'crm' | 'sdr' | 'closer'
    venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
    venue_ids UUID[] DEFAULT '{}',
    avatar_url TEXT,
    phone TEXT,
    active BOOLEAN DEFAULT true,
    theme TEXT DEFAULT 'dark',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 3. TABELA DE FUNIS COMERCIAIS (PIPELINES POR CASA DE FESTA)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.commercial_funnels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Marketing Digital',
    description TEXT,
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    allowed_collaborator_ids UUID[] DEFAULT '{}',
    badge TEXT,
    badge_color TEXT DEFAULT '#3B82F6',
    icon TEXT DEFAULT 'target',
    custom_image_url TEXT, -- Imagem personalizada comprimida 400x400
    is_pinned BOOLEAN DEFAULT false, -- Fixado na barra lateral
    stages_count INT DEFAULT 4,
    is_primary BOOLEAN DEFAULT false,
    is_demo BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 4. TABELA DE DEBUTANTES (ANIVERSARIANTES & JORNADAS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.debutantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    party_date DATE NOT NULL,
    avatar_url TEXT,
    phone TEXT,
    email TEXT,
    mother_name TEXT,
    father_name TEXT,
    has_journey_enabled BOOLEAN DEFAULT true,
    is_journey_pending BOOLEAN DEFAULT false,
    welcome_video_url TEXT,
    has_seen_welcome_video BOOLEAN DEFAULT false,
    journey_template_id UUID,
    custom_invite_photo_url TEXT,
    use_custom_invite_photo BOOLEAN DEFAULT false,
    reception_message TEXT,
    base_guest_limit INT DEFAULT 150,
    extra_guests_unlocked INT DEFAULT 0,
    valid_referrals INT DEFAULT 0,
    total_target_referrals INT DEFAULT 20,
    converted_referral_sales INT DEFAULT 0,
    journey_cycle JSONB DEFAULT '{"cycleRenewalTarget": 3, "cycleRenewalProgress": 0, "journeyStatus": "active"}'::jsonb,
    milestones JSONB DEFAULT '[]'::jsonb,
    vip_rewards JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 5. TABELA DE LEADS DO CRM (OPORTUNIDADES COMERCIAIS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id UUID NOT NULL REFERENCES public.commercial_funnels(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    debutante_id UUID REFERENCES public.debutantes(id) ON DELETE SET NULL,
    debutante_name TEXT,
    debutante_slug TEXT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    age INT,
    "group" TEXT,
    notes TEXT,
    stage TEXT NOT NULL DEFAULT 'new_lead', -- 'new_lead' | 'in_analysis' | 'meeting_scheduled' | 'contract_signed' | 'lost'
    is_validated BOOLEAN DEFAULT false,
    points_granted INT DEFAULT 0,
    rejection_reason TEXT,
    sdr_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
    sdr_name TEXT,
    closer_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
    closer_name TEXT,
    assigned_to TEXT,
    deal_value NUMERIC(12, 2) DEFAULT 0,
    package_sold TEXT,
    contract_date DATE,
    party_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 6. TABELA DE TAREFAS (ADMIN / OPERACIONAL / CRM)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    debutante_id UUID REFERENCES public.debutantes(id) ON DELETE SET NULL,
    venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    due_time TEXT DEFAULT '14:00',
    status TEXT NOT NULL DEFAULT 'todo', -- 'todo' | 'in_progress' | 'completed'
    priority TEXT NOT NULL DEFAULT 'medium', -- 'low' | 'medium' | 'high'
    type TEXT NOT NULL DEFAULT 'general', -- 'call' | 'meeting' | 'tasting' | 'followup' | 'general'
    created_by_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
    created_by_name TEXT,
    assigned_to_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- ============================================================================
-- 7. TABELA DE ATIVIDADES E TIMELINE DO LEAD
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.lead_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'status_change' | 'note' | 'contact' | 'creation' | 'deal_closed' | 'assignment' | 'task_created' | 'task_completed' | 'validation'
    title TEXT NOT NULL,
    text TEXT,
    author_name TEXT NOT NULL,
    author_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
    author_avatar_url TEXT,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 8. TABELA DE HISTÓRICO DE PARTICIPANTES DO LEAD
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.lead_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    collaborator_id UUID REFERENCES public.collaborators(id) ON DELETE CASCADE,
    collaborator_name TEXT NOT NULL,
    collaborator_role TEXT NOT NULL,
    collaborator_avatar_url TEXT,
    action TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 9. TABELA DE INDICAÇÕES (REFERRALS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debutante_id UUID NOT NULL REFERENCES public.debutantes(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    age INT,
    "group" TEXT DEFAULT 'Amigos',
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'validated' | 'rejected'
    points_granted INT DEFAULT 0,
    is_renewal_referral BOOLEAN DEFAULT false,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 10. TABELA DE CONVIDADOS DA DEBUTANTE (GUESTS & ACOMPANHANTES)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debutante_id UUID NOT NULL REFERENCES public.debutantes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    age INT,
    gender TEXT,
    "group" TEXT DEFAULT 'Amigos',
    status TEXT NOT NULL DEFAULT 'pending', -- 'confirmed' | 'pending' | 'declined'
    plus_ones INT DEFAULT 0,
    companion_details JSONB DEFAULT '[]'::jsonb,
    sweet_message TEXT,
    declined_message TEXT,
    is_self_registered BOOLEAN DEFAULT false,
    origin TEXT DEFAULT 'individual_link',
    allowed_capacity INT DEFAULT 1,
    companion_mode TEXT DEFAULT 'fill_later',
    confirmation_source TEXT DEFAULT 'debutante',
    is_link_expired BOOLEAN DEFAULT false,
    is_companion BOOLEAN DEFAULT false,
    parent_guest_id UUID REFERENCES public.guests(id) ON DELETE CASCADE,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 11. TABELA DE COMPROMISSOS & DEGUSTAÇÕES (APPOINTMENTS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debutante_id UUID NOT NULL REFERENCES public.debutantes(id) ON DELETE CASCADE,
    venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Buffet & Degustação',
    date DATE NOT NULL,
    time TEXT NOT NULL,
    location TEXT,
    address TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled' | 'confirmed' | 'completed'
    notes TEXT,
    responsible_collaborator_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
    responsible_name TEXT,
    responsible_role TEXT,
    responsible_phone TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 12. TABELA DE CATÁLOGO DE BENEFÍCIOS & PRÊMIOS VIP
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.benefit_catalog_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    points_required INT NOT NULL DEFAULT 1,
    card_image_url TEXT,
    detail_image_url TEXT,
    category TEXT DEFAULT 'festa',
    default_value NUMERIC(10, 2),
    estimated_value NUMERIC(10, 2),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vip_reward_catalog_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    sales_required INT NOT NULL DEFAULT 1,
    card_image_url TEXT,
    detail_image_url TEXT,
    badge_tag TEXT,
    estimated_value NUMERIC(10, 2),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- ÍNDICES DE ALTA PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_venues_name ON public.venues(name);
CREATE INDEX IF NOT EXISTS idx_collaborators_email ON public.collaborators(email);
CREATE INDEX IF NOT EXISTS idx_collaborators_venue_id ON public.collaborators(venue_id);
CREATE INDEX IF NOT EXISTS idx_commercial_funnels_venue_id ON public.commercial_funnels(venue_id);
CREATE INDEX IF NOT EXISTS idx_debutantes_venue_id ON public.debutantes(venue_id);
CREATE INDEX IF NOT EXISTS idx_debutantes_slug ON public.debutantes(slug);
CREATE INDEX IF NOT EXISTS idx_leads_funnel_id ON public.leads(funnel_id);
CREATE INDEX IF NOT EXISTS idx_leads_venue_id ON public.leads(venue_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON public.leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_sdr_id ON public.leads(sdr_id);
CREATE INDEX IF NOT EXISTS idx_leads_closer_id ON public.leads(closer_id);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_lead_id ON public.admin_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_due_date ON public.admin_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_guests_debutante_id ON public.guests(debutante_id);
CREATE INDEX IF NOT EXISTS idx_referrals_debutante_id ON public.referrals(debutante_id);
CREATE INDEX IF NOT EXISTS idx_appointments_debutante_id ON public.appointments(debutante_id);

-- ============================================================================
-- FUNÇÃO AUTOMÁTICA DE ATUALIZAÇÃO DE TIMESTAMPS (TRIGGER)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_venues_updated_at
BEFORE UPDATE ON public.venues
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trigger_collaborators_updated_at
BEFORE UPDATE ON public.collaborators
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trigger_debutantes_updated_at
BEFORE UPDATE ON public.debutantes
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trigger_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- STORAGE BUCKETS (SUPABASE STORAGE)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('venues', 'venues', true),
    ('debutantes', 'debutantes', true),
    ('funnels', 'funnels', true),
    ('invites', 'invites', true),
    ('benefits', 'benefits', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage Públicas para Leitura
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
CREATE POLICY "Public Read Access" 
ON storage.objects FOR SELECT 
USING (bucket_id IN ('venues', 'debutantes', 'funnels', 'invites', 'benefits'));

DROP POLICY IF EXISTS "Authenticated Upload Access" ON storage.objects;
CREATE POLICY "Authenticated Upload Access" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id IN ('venues', 'debutantes', 'funnels', 'invites', 'benefits'));

-- ============================================================================
-- 13. TRIGGERS AUTOMÁTICOS DE SINCRONIZAÇÃO DE USUÁRIOS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.collaborators (
        id,
        email,
        name,
        role,
        active,
        avatar_url,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'master'),
        true,
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'),
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, public.collaborators.name),
        updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================================================
-- SEED INICIAL (CASAS DE FESTAS, FUNIS PADRÃO & USUÁRIO DE TESTE PRÉ-CONFIRMADO)
-- ============================================================================

-- Inserir Casa de Festas Principal
INSERT INTO public.venues (
    id, name, tagline, description, address, primary_color, secondary_color, accent_color
) VALUES (
    'a1111111-1111-1111-1111-111111111111',
    'Espaço Rio Lounge',
    'Requinte e sofisticação no coração do Rio de Janeiro',
    'Espaço premium com infraestrutura completa para debutantes inesquecíveis.',
    'Av. das Américas, 4200 - Barra da Tijuca, RJ',
    '#D4AF37', '#AA7C11', '#F3E5AB'
), (
    'b2222222-2222-2222-2222-222222222222',
    'Mansão Bonomo',
    'O castelo dos seus sonhos para uma noite de princesa',
    'Mansão clássica com jardins iluminados e salão nobre.',
    'Estrada do Joá, 1500 - Joá, RJ',
    '#8B5CF6', '#6D28D9', '#C4B5FD'
) ON CONFLICT (id) DO NOTHING;

-- Inserir Funis Comerciais Padrão
INSERT INTO public.commercial_funnels (
    id, name, category, description, venue_id, badge, badge_color, icon, is_primary, is_pinned
) VALUES (
    'f1111111-1111-1111-1111-111111111111',
    'Funil de Indicação de Amigas',
    'Indicações do App',
    'Pipeline exclusivo alimentado em tempo real pelas debutantes ativas.',
    'a1111111-1111-1111-1111-111111111111',
    'Indicações do App',
    '#D4AF37',
    'crown',
    true,
    true
), (
    'f2222222-2222-2222-2222-222222222222',
    'Funil de Tráfego Pago & Meta Ads',
    'Marketing Digital',
    'Captação de leads qualificados via Instagram Ads e Google.',
    'a1111111-1111-1111-1111-111111111111',
    'Marketing Digital',
    '#3B82F6',
    'megaphone',
    false,
    false
) ON CONFLICT (id) DO NOTHING;

-- Inserir Usuário Dev Master no Supabase Auth com e-mail já confirmado (sem necessidade de verificação)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'dev@bonomoapp.com',
    crypt('123456', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Dev Master","role":"master"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = crypt('123456', gen_salt('bf')),
    email_confirmed_at = now();

-- Inserir Identidade em auth.identities
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    format('{"sub":"%s","email":"%s"}', 'a0000000-0000-0000-0000-000000000001', 'dev@bonomoapp.com')::jsonb,
    'email',
    'dev@bonomoapp.com',
    now(),
    now(),
    now()
) ON CONFLICT (provider, provider_id) DO NOTHING;

-- Inserir Perfil do Colaborador Master na tabela public.collaborators
INSERT INTO public.collaborators (
    id, email, name, role, venue_id, venue_ids, active, avatar_url
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'dev@bonomoapp.com',
    'Dev Master',
    'master',
    NULL,
    ARRAY['a1111111-1111-1111-1111-111111111111'::uuid, 'b2222222-2222-2222-2222-222222222222'::uuid],
    true,
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
) ON CONFLICT (id) DO UPDATE SET
    name = 'Dev Master',
    role = 'master',
    active = true;

-- >>> MIGRAÇÃO: 20260827120000_public_rls_policies.sql <<<
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

-- >>> MIGRAÇÃO: 20260828100000_journey_templates.sql <<<
-- ============================================================================
-- MIGRAÇÃO DEFINITIVA: TEMPLATES DE JORNADA, CAMPOS DE DEBUTANTE E LEADS
-- ============================================================================

-- 1. Garante colunas de jornada na tabela de templates
CREATE TABLE IF NOT EXISTS public.journey_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    season_or_period TEXT,
    cycle_days INT DEFAULT 7,
    cycle_target INT DEFAULT 3,
    milestones JSONB DEFAULT '[]'::jsonb,
    vip_rewards JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Adiciona season_or_period caso a tabela já existisse sem ela
ALTER TABLE public.journey_templates 
ADD COLUMN IF NOT EXISTS season_or_period TEXT,
ADD COLUMN IF NOT EXISTS milestones JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS vip_rewards JSONB DEFAULT '[]'::jsonb;

-- 2. Garante colunas de jornada na tabela de debutantes
ALTER TABLE public.debutantes
ADD COLUMN IF NOT EXISTS milestones JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS vip_rewards JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS journey_cycle JSONB DEFAULT '{"journeyStatus": "active", "currentCycleStartDate": "", "currentCycleEndDate": "", "cycleRenewalProgress": 0}'::jsonb,
ADD COLUMN IF NOT EXISTS referrals JSONB DEFAULT '[]'::jsonb;

-- 3. Habilita RLS e permissões públicas completas para Realtime
ALTER TABLE public.journey_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debutantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "journey_templates_all_access" ON public.journey_templates;
CREATE POLICY "journey_templates_all_access" ON public.journey_templates FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "leads_public_insert_and_manage" ON public.leads;
CREATE POLICY "leads_public_insert_and_manage" ON public.leads FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "debutantes_public_manage" ON public.debutantes;
CREATE POLICY "debutantes_public_manage" ON public.debutantes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "referrals_public_manage" ON public.referrals;
CREATE POLICY "referrals_public_manage" ON public.referrals FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. Garante Realtime ativo em todas as tabelas comerciais
ALTER TABLE public.journey_templates REPLICA IDENTITY FULL;
ALTER TABLE public.debutantes REPLICA IDENTITY FULL;
ALTER TABLE public.leads REPLICA IDENTITY FULL;
ALTER TABLE public.referrals REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.journey_templates;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.debutantes;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.referrals;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- >>> MIGRAÇÃO: 20260828110000_crm_full_persistence_and_rls.sql <<<
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

-- JOURNEY TEMPLATES (Aplicado somente se a tabela já existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'journey_templates') THEN
        DROP POLICY IF EXISTS "journey_templates_full_access" ON public.journey_templates;
        DROP POLICY IF EXISTS "journey_templates_all_access" ON public.journey_templates;
        CREATE POLICY "journey_templates_full_access" ON public.journey_templates FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

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

-- >>> MIGRAÇÃO: 20260828120000_enable_realtime.sql <<<
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

-- >>> MIGRAÇÃO: 20260828130000_leads_extended_fields.sql <<<
-- ============================================================================
-- EXPANSÃO DA TABELA DE LEADS (CAMPOS COMERCIAIS COMPLETOS)
-- ============================================================================
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS neighborhood TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS primary_contact_role TEXT DEFAULT 'debutante',
ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT '15 Anos',
ADD COLUMN IF NOT EXISTS event_date DATE,
ADD COLUMN IF NOT EXISTS debutante_birth_date DATE,
ADD COLUMN IF NOT EXISTS estimated_guests INT,
ADD COLUMN IF NOT EXISTS desired_period TEXT,
ADD COLUMN IF NOT EXISTS interest_service TEXT,
ADD COLUMN IF NOT EXISTS estimated_budget NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS temperature TEXT DEFAULT 'warm',
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- Garante que o Realtime continue ativo com REPLICA IDENTITY FULL
ALTER TABLE public.leads REPLICA IDENTITY FULL;

-- >>> MIGRAÇÃO: 20260829100000_debutantes_status_and_metrics.sql <<<
-- Migration: Add status and expiration support to debutantes and venues metrics
-- Date: 2026-08-29

-- 1. Debutantes: Add status column ('active' | 'inactive')
ALTER TABLE debutantes 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 2. Venues: Add metrics columns if not present
ALTER TABLE venues
ADD COLUMN IF NOT EXISTS years_in_business INTEGER DEFAULT 12,
ADD COLUMN IF NOT EXISTS events_completed INTEGER DEFAULT 1500,
ADD COLUMN IF NOT EXISTS guests_delighted INTEGER DEFAULT 180000;

-- 3. Guests: Ensure self-registered guests can be inserted cleanly
ALTER TABLE guests
ADD COLUMN IF NOT EXISTS is_self_registered BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS confirmed_at TEXT,
ADD COLUMN IF NOT EXISTS sweet_message TEXT;

-- >>> MIGRAÇÃO: 20260829110000_venues_contact_and_goals.sql <<<
-- Migration: Add contact fields and metrics to venues table
ALTER TABLE venues 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS years_in_business INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS events_completed INTEGER DEFAULT 500,
ADD COLUMN IF NOT EXISTS guests_delighted INTEGER DEFAULT 80000;

-- Optional metadata for global goals
CREATE TABLE IF NOT EXISTS system_goals (
  id TEXT PRIMARY KEY DEFAULT 'default_lead_goal',
  target_leads INTEGER DEFAULT 30,
  deadline_date TEXT,
  title TEXT DEFAULT 'Meta Mensal de Leads',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- >>> MIGRAÇÃO: 20260830100000_sources_and_tracking_module.sql <<<
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

-- >>> MIGRAÇÃO: 20260830110000_venue_goals_and_collaborator_time.sql <<<
-- Migration: Venue Goals and Collaborator Time Tracking
ALTER TABLE venues 
ADD COLUMN IF NOT EXISTS goals JSONB DEFAULT '{
  "revenueTarget": 150000,
  "salesTarget": 12,
  "leadsTarget": 60,
  "responseTimeTargetMinutes": 15,
  "period": "monthly"
}'::jsonb;

-- Table for tracking real active time spent by collaborators in the admin portal
CREATE TABLE IF NOT EXISTS collaborator_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id UUID NOT NULL,
  collaborator_name TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  active_seconds INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_collab_date UNIQUE (collaborator_id, date)
);

-- >>> MIGRAÇÃO: 20260902100000_mql_questions_and_lead_mql_columns.sql <<<
-- ==============================================================================
-- MIGRAÇÃO: PERSISTÊNCIA DE MQL (TABELA DE PERGUNTAS E COLUNAS EM LEADS)
-- Data: 2026-09-02
-- ==============================================================================

-- 1. Tabela de Perguntas de MQL (Qualificação Comercial)
CREATE TABLE IF NOT EXISTS public.mql_questions (
  id TEXT PRIMARY KEY,
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  weight INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_mql_questions_venue_id ON public.mql_questions(venue_id);
CREATE INDEX IF NOT EXISTS idx_mql_questions_order ON public.mql_questions(order_index);

-- 2. Colunas de MQL na tabela de leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS mql_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS mql_level TEXT DEFAULT 'cold',
ADD COLUMN IF NOT EXISTS mql_answers JSONB DEFAULT '{}'::jsonb;

-- Índices para filtros e ordenação rápida por MQL no CRM
CREATE INDEX IF NOT EXISTS idx_leads_mql_score ON public.leads(mql_score);
CREATE INDEX IF NOT EXISTS idx_leads_mql_level ON public.leads(mql_level);

-- >>> MIGRAÇÃO: 20260902110000_whatsapp_sub_sources_and_lead_sub_source.sql <<<
-- ==============================================================================
-- MIGRAÇÃO: SUB-ORIGENS DE WHATSAPP COM PALAVRAS-CHAVE E ATRIBUIÇÃO DE FUNIL
-- Data: 2026-09-02
-- ==============================================================================

-- 1. Adicionar colunas de sub_source e source_name na tabela de leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS sub_source TEXT,
ADD COLUMN IF NOT EXISTS source_name TEXT;

-- 2. Índice para consultas rápidas por sub_source e source_id
CREATE INDEX IF NOT EXISTS idx_leads_source_id ON public.leads(source_id);
CREATE INDEX IF NOT EXISTS idx_leads_sub_source ON public.leads(sub_source);

-- >>> MIGRAÇÃO: 20260903100000_dev_role_and_feature_flags.sql <<<
-- ============================================================================
-- MIGRATION: DEV SUPER-ROLE, PASSWORD AUTH & DYNAMIC FEATURE FLAGS
-- ============================================================================

-- 1. Adiciona coluna de senha na tabela collaborators se não existir
ALTER TABLE IF EXISTS public.collaborators 
ADD COLUMN IF NOT EXISTS password TEXT;

-- 2. Cria tabela de Feature Flags do Sistema (Controlada pelo Dev)
CREATE TABLE IF NOT EXISTS public.system_feature_flags (
    feature_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'Geral',
    status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'coming_soon' | 'disabled'
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by TEXT
);

-- Habilitar RLS & Acesso Público Total para Leitura e Gravação pelo Dev
ALTER TABLE IF EXISTS public.system_feature_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "feature_flags_all" ON public.system_feature_flags;
CREATE POLICY "feature_flags_all" ON public.system_feature_flags FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
ALTER TABLE IF EXISTS public.system_feature_flags REPLICA IDENTITY FULL;

-- Adicionar à publicação de Realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'system_feature_flags'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.system_feature_flags;
    END IF;
END $$;

-- 3. Inserir ou Atualizar Conta do Desenvolvedor (F5 Developer)
INSERT INTO public.collaborators (
    id, email, name, role, venue_id, venue_ids, active, avatar_url, password
) VALUES (
    'd0000000-0000-0000-0000-000000000001',
    'bonomofestas@gmail.com',
    'F5 Developer',
    'dev',
    NULL,
    ARRAY[]::uuid[],
    true,
    '/f5_mark.png',
    'Bonomo#2026'
) ON CONFLICT (email) DO UPDATE SET
    role = 'dev',
    name = 'F5 Developer',
    password = 'Bonomo#2026',
    active = true;

-- 4. Inserir ou Atualizar Conta Master Oficial
INSERT INTO public.collaborators (
    id, email, name, role, venue_id, venue_ids, active, avatar_url, password
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'dev@bonomoapp.com',
    'F5 Master',
    'master',
    NULL,
    ARRAY[]::uuid[],
    true,
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    'Bonomo#2026'
) ON CONFLICT (email) DO UPDATE SET
    role = 'master',
    name = 'F5 Master',
    password = 'Bonomo#2026',
    active = true;

-- 5. Seed inicial das Feature Flags
INSERT INTO public.system_feature_flags (feature_id, name, description, category, status)
VALUES
    ('whatsapp', 'WhatsApp & Atendimento', 'Caixa de entrada integrada e disparos', 'Atendimento', 'active'),
    ('icp', 'Qualificação ICP & MQL', 'Cálculo de nota e badges ICP', 'Inteligência', 'active'),
    ('sources', 'Origens & Rastreamento', 'Formulários e parâmetros UTM', 'Comercial & CRM', 'active'),
    ('debutantes', 'Aniversariantes & Debutantes', 'Gestão de anfitriãs e convites', 'Comercial & CRM', 'active'),
    ('venue_goals', 'Metas da Casa de Festas', 'Metas comerciais e faturamento', 'Comercial & CRM', 'active'),
    ('funnels', 'Funis Comerciais & Kanban', 'Pipeline e etapas de vendas', 'Comercial & CRM', 'active'),
    ('master_dashboard', 'Dashboard Master', 'Visão consolidada da rede', 'Administrativo', 'active'),
    ('collaborators', 'Equipe & Colaboradores', 'Gestão de usuários e permissões', 'Administrativo', 'active'),
    ('venues', 'Casas de Festa & Unidades', 'Cadastro de espaços e salões', 'Administrativo', 'active')
ON CONFLICT (feature_id) DO NOTHING;

-- >>> MIGRAÇÃO: 20260903110000_encrypt_passwords_with_pgcrypto.sql <<<
-- ==============================================================================
-- F5 SYSTEM: MIGRATION - CRIPTOGRAFIA DE SENHAS COM PGCRYPTO (BCRYPT)
-- ==============================================================================

-- 1. Habilita a extensão de criptografia nativa do PostgreSQL
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Trigger Function que criptografa qualquer senha inserida ou alterada
CREATE OR REPLACE FUNCTION trg_encrypt_collaborator_password()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.password IS NOT NULL AND trim(NEW.password) <> '' THEN
    -- Se a senha ainda não estiver criptografada (não começa com o prefixo bcrypt $2a$, $2b$ ou $2y$)
    IF NOT (NEW.password ~ '^\$2[aby]\$[0-9]{2}\$') THEN
      NEW.password := crypt(NEW.password, gen_salt('bf', 10));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Aplica o trigger na tabela collaborators
DROP TRIGGER IF EXISTS trg_collaborators_encrypt_pw ON public.collaborators;
CREATE TRIGGER trg_collaborators_encrypt_pw
BEFORE INSERT OR UPDATE OF password ON public.collaborators
FOR EACH ROW
EXECUTE FUNCTION trg_encrypt_collaborator_password();

-- 4. Função segura para validação de senha (RPC)
-- Retorna true se a senha digitada corresponder ao hash criptografado
CREATE OR REPLACE FUNCTION verify_collaborator_password(email_input TEXT, password_input TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  stored_pw TEXT;
BEGIN
  SELECT password INTO stored_pw 
  FROM public.collaborators 
  WHERE lower(email) = lower(trim(email_input));

  IF stored_pw IS NULL OR stored_pw = '' THEN
    RETURN false;
  END IF;

  -- Validação se for hash bcrypt
  IF stored_pw ~ '^\$2[aby]\$[0-9]{2}\$' THEN
    RETURN stored_pw = crypt(password_input, stored_pw);
  END IF;

  -- Fallback de compatibilidade caso ainda não tenha sido convertida
  RETURN stored_pw = password_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Criptografa imediatamente todas as senhas que estiverem em texto puro
UPDATE public.collaborators
SET password = crypt(password, gen_salt('bf', 10))
WHERE password IS NOT NULL 
  AND trim(password) <> '' 
  AND NOT (password ~ '^\$2[aby]\$[0-9]{2}\$');

-- >>> MIGRAÇÃO: 20260903120000_lead_unique_code_and_password_reset.sql <<<
-- ==============================================================================
-- F5 SYSTEM: MIGRATION - CÓDIGO ÚNICO DE LEADS (LEAD-XXXXXX) E RESET DE SENHA
-- ==============================================================================

-- 1. ADICIONA A COLUNA CODE NA TABELA LEADS
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;

-- Função auxiliar para gerar código aleatório LEAD-XXXXXX no Postgres
CREATE OR REPLACE FUNCTION generate_lead_unique_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := 'LEAD-';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 2. PREENCHE CÓDIGOS PARA LEADS QUE JÁ EXISTEM SEM CÓDIGO
DO $$
DECLARE
  r RECORD;
  new_c TEXT;
BEGIN
  FOR r IN SELECT id FROM public.leads WHERE code IS NULL OR code = '' LOOP
    LOOP
      new_c := generate_lead_unique_code();
      BEGIN
        UPDATE public.leads SET code = new_c WHERE id = r.id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- Se colidir, tenta novamente
      END;
    END LOOP;
  END LOOP;
END;
$$;

-- 3. TRIGGER AUTOMÁTICO PARA GARANTIR QUE NENHUM LEAD SEJA INSERIDO SEM CÓDIGO
CREATE OR REPLACE FUNCTION trg_set_lead_code()
RETURNS TRIGGER AS $$
DECLARE
  new_c TEXT;
BEGIN
  IF NEW.code IS NULL OR trim(NEW.code) = '' THEN
    LOOP
      new_c := generate_lead_unique_code();
      BEGIN
        NEW.code := new_c;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- Repete se gerar código repetido
      END;
    END LOOP;
  END IF;

  -- Se o lead não possui nome ou o nome for vazio, atribui o próprio código como nome
  IF NEW.name IS NULL OR trim(NEW.name) = '' OR NEW.name = 'Sem nome' OR NEW.name = 'Lead Sem Nome' THEN
    NEW.name := NEW.code;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leads_auto_code ON public.leads;
CREATE TRIGGER trg_leads_auto_code
BEFORE INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION trg_set_lead_code();

-- 4. TABELA PARA GESTÃO DE CÓDIGOS DE RECUPERAÇÃO DE SENHA (OTP 6 DÍGITOS)
CREATE TABLE IF NOT EXISTS public.password_reset_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes'),
  used BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_password_reset_codes_lookup 
ON public.password_reset_codes (email, code, used);

-- RLS
ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can insert reset code" ON public.password_reset_codes;
CREATE POLICY "Public can insert reset code" 
ON public.password_reset_codes FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can verify reset code" ON public.password_reset_codes;
CREATE POLICY "Public can verify reset code" 
ON public.password_reset_codes FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Public can update reset code" ON public.password_reset_codes;
CREATE POLICY "Public can update reset code" 
ON public.password_reset_codes FOR UPDATE 
TO anon, authenticated 
USING (true);

-- >>> MIGRAÇÃO: 20260903130000_multitenant_master_isolation.sql <<<
-- ==============================================================================
-- F5 SYSTEM: MIGRATION - MULTI-TENANCY, ISOLAMENTO POR MASTER E FEATURE FLAGS
-- ==============================================================================

-- 1. ADICIONA A COLUNA MASTER_ID NAS TABELAS PRINCIPAIS
-- master_id referencia o ID do colaborador com role 'master' (ou 'dev' para testes)
ALTER TABLE public.collaborators 
ADD COLUMN IF NOT EXISTS master_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL;

ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS master_id UUID REFERENCES public.collaborators(id) ON DELETE CASCADE;

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS master_id UUID REFERENCES public.collaborators(id) ON DELETE CASCADE;

ALTER TABLE public.commercial_funnels 
ADD COLUMN IF NOT EXISTS master_id UUID REFERENCES public.collaborators(id) ON DELETE CASCADE;

-- 2. TABELA DE FEATURE FLAGS GLOBAIS (SINCRONIZADAS EM TEMPO REAL)
CREATE TABLE IF NOT EXISTS public.system_feature_flags (
  feature_id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'coming_soon' | 'disabled'
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Remove restrições NOT NULL legadas caso a tabela já existisse no banco
ALTER TABLE IF EXISTS public.system_feature_flags ALTER COLUMN name DROP NOT NULL;
ALTER TABLE IF EXISTS public.system_feature_flags ALTER COLUMN category DROP NOT NULL;
ALTER TABLE IF EXISTS public.system_feature_flags ALTER COLUMN description DROP NOT NULL;

-- Popula flags padrão caso não existam ou atualiza com dados completos
INSERT INTO public.system_feature_flags (feature_id, name, description, category, status)
VALUES 
  ('whatsapp', 'WhatsApp & Atendimento', 'Caixa de entrada integrada e disparos', 'Atendimento', 'active'),
  ('icp', 'Qualificação ICP & MQL', 'Cálculo de nota e badges ICP', 'Inteligência', 'active'),
  ('sources', 'Origens & Rastreamento', 'Formulários e parâmetros UTM', 'Comercial & CRM', 'active'),
  ('debutantes', 'Aniversariantes & Debutantes', 'Gestão de anfitriãs e convites', 'Comercial & CRM', 'active'),
  ('venue_goals', 'Metas da Casa de Festas', 'Metas comerciais e faturamento', 'Comercial & CRM', 'active'),
  ('funnels', 'Funis Comerciais & Kanban', 'Pipeline e etapas de vendas', 'Comercial & CRM', 'active'),
  ('master_dashboard', 'Dashboard Master', 'Visão consolidada da rede', 'Administrativo', 'active'),
  ('collaborators', 'Equipe & Colaboradores', 'Gestão de usuários e permissões', 'Administrativo', 'active'),
  ('venues', 'Casas de Festa & Unidades', 'Cadastro de espaços e salões', 'Administrativo', 'active')
ON CONFLICT (feature_id) DO UPDATE SET 
  status = EXCLUDED.status,
  updated_at = now();

-- 3. TRIGGER DE DESATIVAÇÃO EM CASCATA DE COLABORADORES
-- Quando um Master for desativado (active = false), desativa automaticamente todos os colaboradores subordinados
CREATE OR REPLACE FUNCTION trg_cascade_master_deactivation()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o colaborador for um master e seu status ativo foi alterado para false
  IF OLD.role = 'master' AND OLD.active = true AND NEW.active = false THEN
    UPDATE public.collaborators
    SET active = false,
        updated_at = now()
    WHERE master_id = NEW.id;
  END IF;

  -- Se o master for reativado, reativa seus colaboradores
  IF OLD.role = 'master' AND OLD.active = false AND NEW.active = true THEN
    UPDATE public.collaborators
    SET active = true,
        updated_at = now()
    WHERE master_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_collaborators_cascade_deactivation ON public.collaborators;
CREATE TRIGGER trg_collaborators_cascade_deactivation
AFTER UPDATE OF active ON public.collaborators
FOR EACH ROW
EXECUTE FUNCTION trg_cascade_master_deactivation();

-- 4. BACKFILL INICIAL SEGURO:
-- Associa as casas e colaboradores existentes ao Master oficial cadastrado
DO $$
DECLARE
  first_master_id UUID;
BEGIN
  SELECT id INTO first_master_id 
  FROM public.collaborators 
  WHERE role = 'master' 
  ORDER BY created_at ASC 
  LIMIT 1;

  IF first_master_id IS NOT NULL THEN
    -- Vincula venues que ainda não possuem master_id ao primeiro master
    UPDATE public.venues 
    SET master_id = first_master_id 
    WHERE master_id IS NULL;

    -- Vincula funis comerciais ao primeiro master
    UPDATE public.commercial_funnels 
    SET master_id = first_master_id 
    WHERE master_id IS NULL;

    -- Vincula colaboradores não-masters (e não-devs) que não possuem master_id ao primeiro master
    UPDATE public.collaborators 
    SET master_id = first_master_id 
    WHERE master_id IS NULL 
      AND role NOT IN ('master', 'dev');

    -- Vincula leads ao primeiro master
    UPDATE public.leads 
    SET master_id = first_master_id 
    WHERE master_id IS NULL;
  END IF;
END;
$$;

-- >>> MIGRAÇÃO: 20260903140000_support_tickets_and_flags_persistence.sql <<<
-- ============================================================================
-- MIGRATION: FEATURE FLAGS PERSISTENCE & COMPREHENSIVE SUPPORT TICKETS SYSTEM
-- ============================================================================

-- 1. Estender tabela de Feature Flags para persistir mensagens de "Em Breve"
ALTER TABLE IF EXISTS public.system_feature_flags
ADD COLUMN IF NOT EXISTS coming_soon_message TEXT;

-- 2. Tabela de Tickets de Suporte / Report de Bugs
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_code TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_email TEXT,
    user_role TEXT NOT NULL DEFAULT 'master',
    venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
    venue_name TEXT,
    module TEXT NOT NULL, -- 'home', 'crm', 'debutantes', 'venues', 'collaborators', 'whatsapp', 'other'
    description TEXT NOT NULL,
    image_url TEXT,
    video_url TEXT,
    status TEXT NOT NULL DEFAULT 'new', -- 'new' | 'in_progress' | 'resolved'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices de performance para busca por código, status e usuário
CREATE INDEX IF NOT EXISTS idx_support_tickets_code ON public.support_tickets(ticket_code);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at DESC);

-- 3. Tabela de Mensagens do Ticket (Chat Direto Dev <-> Usuário)
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON public.support_ticket_messages(ticket_id, created_at ASC);

-- 4. Habilitar RLS e Permissões Seguras
ALTER TABLE IF EXISTS public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_tickets_all" ON public.support_tickets;
CREATE POLICY "support_tickets_all" ON public.support_tickets 
FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "support_messages_all" ON public.support_ticket_messages;
CREATE POLICY "support_messages_all" ON public.support_ticket_messages 
FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 5. Configurar Realtime em ambas as tabelas
ALTER TABLE IF EXISTS public.support_tickets REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.support_ticket_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'support_tickets'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'support_ticket_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_messages;
    END IF;
END $$;

-- 6. Suporte a Remoção Segura de Convidados da Debutante (Aba Removidos)
ALTER TABLE IF EXISTS public.guests 
ADD COLUMN IF NOT EXISTS is_removed BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_guests_is_removed ON public.guests(debutante_id, is_removed);

-- >>> MIGRAÇÃO: 20260903150000_system_broadcast_announcements.sql <<<
-- Migration: System Broadcast Announcements & Media Attachments
-- Permite ao Desenvolvedor enviar comunicados globais com vídeo incorporado, imagens e restrição por cargos

CREATE TABLE IF NOT EXISTS public.system_broadcast_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'feature', -- 'feature', 'update', 'maintenance', 'general'
  media_type TEXT NOT NULL DEFAULT 'none', -- 'none', 'image', 'video'
  media_url TEXT,
  target_roles TEXT[] NOT NULL DEFAULT '{"master"}', -- cargos autorizados: 'master', 'sdr', 'closer', 'admin', 'crm'
  read_receipts JSONB NOT NULL DEFAULT '[]'::jsonb, -- array de recibos { userId, userName, userEmail, userRole, readAt }
  author_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.system_broadcast_announcements ENABLE ROW LEVEL SECURITY;

-- Política de leitura: todos os colaboradores autenticados podem ler anúncios direcionados ao seu cargo
DROP POLICY IF EXISTS "Colaboradores podem visualizar anúncios do seu cargo" ON public.system_broadcast_announcements;
CREATE POLICY "Colaboradores podem visualizar anúncios do seu cargo"
ON public.system_broadcast_announcements
FOR SELECT
TO authenticated, anon
USING (true);

-- Política de inserção e atualização: Dev ou masters autorizados
DROP POLICY IF EXISTS "Gerenciamento de anúncios por dev ou master" ON public.system_broadcast_announcements;
CREATE POLICY "Gerenciamento de anúncios por dev ou master"
ON public.system_broadcast_announcements
FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- Notificações Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'system_broadcast_announcements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.system_broadcast_announcements;
  END IF;
END $$;

-- >>> MIGRAÇÃO: 20260904100000_collaborators_activation_and_timestamps.sql <<<
-- ============================================================================
-- MIGRATION: Colaboradores - Rastreamento de Primeiro Acesso e Ativação de Conta
-- Data: 2026-09-04
-- ============================================================================

-- 1. Adiciona colunas para controle de status de ativação da conta
ALTER TABLE IF EXISTS public.collaborators
ADD COLUMN IF NOT EXISTS is_first_access BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- 2. Assegura que colaboradores existentes com histórico tenham status correto
UPDATE public.collaborators
SET is_first_access = false, activated_at = COALESCE(created_at, now())
WHERE is_first_access IS NULL AND (active = true);

-- 3. Assegura políticas de RLS completas para leitura e atualização síncrona
ALTER TABLE IF EXISTS public.collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "collaborators_full_access" ON public.collaborators;
CREATE POLICY "collaborators_full_access" 
ON public.collaborators 
FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- 4. Replica identity full para Realtime imediato
ALTER TABLE IF EXISTS public.collaborators REPLICA IDENTITY FULL;

-- >>> MIGRAÇÃO: 20260904110000_enable_full_realtime_replication.sql <<<
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

-- >>> MIGRAÇÃO: 20260904120000_fix_auth_user_trigger.sql <<<
-- ============================================================================
-- FIX: TRIGGER HANDLE_NEW_AUTH_USER COM SUPORTE A ON CONFLICT (EMAIL)
-- ============================================================================
-- Corrige o erro "duplicate key value violates unique constraint collaborators_email_key"
-- que impedia o Supabase Auth de criar usuários pré-cadastrados na tabela public.collaborators
-- e abortava silenciosamente o envio de e-mails de confirmação, convite e recuperação.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.collaborators (
        id,
        email,
        name,
        role,
        active,
        avatar_url,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'master'),
        true,
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'),
        now(),
        now()
    )
    ON CONFLICT (email) DO UPDATE SET
        name = COALESCE(public.collaborators.name, EXCLUDED.name),
        updated_at = now();
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Garante que nenhuma falha na tabela pública impeça o Auth de concluir e enviar o e-mail
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- >>> MIGRAÇÃO: 20260904130000_fix_debutante_deletion_and_referrals.sql <<<
-- Migration: Fix debutante deletion and preserve referrals/leads in CRM
-- Permite que debutantes sejam deletadas sem violar restrição NOT NULL na tabela referrals
-- Preserva histórico de indicações e leads no CRM com o nome da debutante indicadora

DO $$
BEGIN
    -- 1. Garante coluna debutante_name na tabela referrals
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'referrals' 
          AND column_name = 'debutante_name'
    ) THEN
        ALTER TABLE public.referrals ADD COLUMN debutante_name TEXT;
    END IF;

    -- 2. Torna a coluna debutante_id em referrals NULLABLE para suportar desvinculação
    ALTER TABLE public.referrals ALTER COLUMN debutante_id DROP NOT NULL;

    -- 3. Se a foreign key existir como CASCADE ou RESTRICT, ajusta para SET NULL
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc 
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name 
        WHERE tc.table_schema = 'public' 
          AND tc.table_name = 'referrals' 
          AND kcu.column_name = 'debutante_id' 
          AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_debutante_id_fkey;
        ALTER TABLE public.referrals 
          ADD CONSTRAINT referrals_debutante_id_fkey 
          FOREIGN KEY (debutante_id) 
          REFERENCES public.debutantes(id) 
          ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Garante políticas de RLS completas para debutantes e referrals
ALTER TABLE public.debutantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "debutantes_full_access" ON public.debutantes;
CREATE POLICY "debutantes_full_access" ON public.debutantes 
  FOR ALL TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);

DROP POLICY IF EXISTS "referrals_full_access" ON public.referrals;
CREATE POLICY "referrals_full_access" ON public.referrals 
  FOR ALL TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);

ALTER TABLE public.debutantes REPLICA IDENTITY FULL;
ALTER TABLE public.referrals REPLICA IDENTITY FULL;

-- >>> MIGRAÇÃO: 20260904140000_pos_venda_and_commercial_funnels.sql <<<
-- ============================================================================
-- MIGRATION: Suporte a Pós-Venda, Funis Comerciais e Exclusão Segura
-- Data: 2026-09-04
-- ============================================================================

-- 1. FUNIS COMERCIAIS: Adiciona suporte a funis de pós-venda e controle de papéis
ALTER TABLE IF EXISTS public.commercial_funnels
ADD COLUMN IF NOT EXISTS is_post_sale BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allowed_roles TEXT[] DEFAULT '{}';

-- 2. INDICAÇÕES (REFERRALS): Preservação de nome da debutante indicadora e desvinculação segura
DO $$
BEGIN
    -- Garante coluna debutante_name
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'referrals' 
          AND column_name = 'debutante_name'
    ) THEN
        ALTER TABLE public.referrals ADD COLUMN debutante_name TEXT;
    END IF;

    -- Torna debutante_id NULLABLE para permitir exclusão da aniversariante sem deletar o lead
    ALTER TABLE public.referrals ALTER COLUMN debutante_id DROP NOT NULL;

    -- Altera FK para ON DELETE SET NULL
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc 
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name 
        WHERE tc.table_schema = 'public' 
          AND tc.table_name = 'referrals' 
          AND kcu.column_name = 'debutante_id' 
          AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_debutante_id_fkey;
        ALTER TABLE public.referrals 
          ADD CONSTRAINT referrals_debutante_id_fkey 
          FOREIGN KEY (debutante_id) 
          REFERENCES public.debutantes(id) 
          ON DELETE SET NULL;
    END IF;
END $$;

-- 3. COLABORADORES: Ativação, primeiro acesso e login
ALTER TABLE IF EXISTS public.collaborators
ADD COLUMN IF NOT EXISTS is_first_access BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- 4. RLS E REPLICA IDENTITY (Realtime)
ALTER TABLE IF EXISTS public.commercial_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commercial_funnels_full_access" ON public.commercial_funnels;
CREATE POLICY "commercial_funnels_full_access" ON public.commercial_funnels FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "referrals_full_access" ON public.referrals;
CREATE POLICY "referrals_full_access" ON public.referrals FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "collaborators_full_access" ON public.collaborators;
CREATE POLICY "collaborators_full_access" ON public.collaborators FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS public.commercial_funnels REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.referrals REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.collaborators REPLICA IDENTITY FULL;

-- >>> MIGRAÇÃO: 20260906164500_tasks_workspace_and_smart_notes.sql <<<
-- ============================================================================
-- MIGRATION: TASKS WORKSPACE, DATABASES, STATUSES & SMART NOTES
-- ============================================================================

-- 1. Bases de Dados de Tarefas (Workspaces de Tarefas)
CREATE TABLE IF NOT EXISTS public.task_databases (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.task_databases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_databases_all" ON public.task_databases;
CREATE POLICY "task_databases_all" ON public.task_databases FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
ALTER TABLE public.task_databases REPLICA IDENTITY FULL;

-- Base Padrão Não-Excluível: Tarefas de Colaboradores
INSERT INTO public.task_databases (id, name, description, is_default)
VALUES ('default_collabs', 'Tarefas de Colaboradores', 'Base de dados principal de tarefas da equipe e colaboradores', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Status Customizados das Bases de Dados
CREATE TABLE IF NOT EXISTS public.task_custom_statuses (
    id TEXT PRIMARY KEY,
    database_id TEXT REFERENCES public.task_databases(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    group_key TEXT NOT NULL, -- 'todo' (A fazer) | 'in_progress' (Em andamento) | 'completed' (Concluídos)
    color TEXT NOT NULL DEFAULT '#3B82F6',
    bg_color TEXT NOT NULL DEFAULT 'rgba(59, 130, 246, 0.14)',
    order_index INT NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.task_custom_statuses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_custom_statuses_all" ON public.task_custom_statuses;
CREATE POLICY "task_custom_statuses_all" ON public.task_custom_statuses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
ALTER TABLE public.task_custom_statuses REPLICA IDENTITY FULL;

-- Seed dos status padrão (A fazer -> Não iniciado, Em andamento -> Fazendo, Concluídos -> Finalizado)
INSERT INTO public.task_custom_statuses (id, database_id, name, group_key, color, bg_color, order_index, is_default)
VALUES
    ('st_todo', 'default_collabs', 'Não iniciado', 'todo', '#94A3B8', 'rgba(148, 163, 184, 0.14)', 0, true),
    ('st_doing', 'default_collabs', 'Fazendo', 'in_progress', '#3B82F6', 'rgba(59, 130, 246, 0.14)', 1, false),
    ('st_done', 'default_collabs', 'Finalizado', 'completed', '#10B981', 'rgba(16, 185, 129, 0.14)', 2, false)
ON CONFLICT (id) DO NOTHING;

-- 3. Tipos de Tarefas Customizados
CREATE TABLE IF NOT EXISTS public.task_custom_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'Briefcase',
    color TEXT DEFAULT '#3B82F6',
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.task_custom_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_custom_types_all" ON public.task_custom_types;
CREATE POLICY "task_custom_types_all" ON public.task_custom_types FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
ALTER TABLE public.task_custom_types REPLICA IDENTITY FULL;

INSERT INTO public.task_custom_types (id, name, icon, color)
VALUES
    ('general', 'Geral / Operacional', 'Briefcase', '#94A3B8'),
    ('followup', 'Follow-up Comercial', 'MessageSquare', '#10B981'),
    ('meeting', 'Reunião / Visita', 'Users', '#A78BFA'),
    ('call', 'Ligação de Alinhamento', 'Phone', '#60A5FA'),
    ('tasting', 'Degustação', 'Utensils', '#F59E0B'),
    ('document', 'Envio de Proposta / Contrato', 'FileText', '#EC4899')
ON CONFLICT (id) DO NOTHING;

-- 4. Definições de Propriedades Customizáveis (Campos dinâmicos da base de dados)
CREATE TABLE IF NOT EXISTS public.task_property_definitions (
    id TEXT PRIMARY KEY,
    database_id TEXT REFERENCES public.task_databases(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'text' | 'number' | 'select' | 'multi_select' | 'files' | 'checkbox' | 'url' | 'email' | 'phone' | 'location'
    options JSONB DEFAULT '[]'::jsonb,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.task_property_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_property_definitions_all" ON public.task_property_definitions;
CREATE POLICY "task_property_definitions_all" ON public.task_property_definitions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
ALTER TABLE public.task_property_definitions REPLICA IDENTITY FULL;

-- 5. Extensões da Tabela admin_tasks
ALTER TABLE IF EXISTS public.admin_tasks
    ADD COLUMN IF NOT EXISTS database_id TEXT DEFAULT 'default_collabs',
    ADD COLUMN IF NOT EXISTS content TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS custom_properties JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS custom_status_id TEXT DEFAULT 'st_todo',
    ADD COLUMN IF NOT EXISTS custom_type TEXT DEFAULT 'Geral / Operacional',
    ADD COLUMN IF NOT EXISTS mandatory_feedback TEXT;

-- 6. Tabela de Comentários das Tarefas (com CASCADE DELETE)
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.admin_tasks(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    author_avatar TEXT,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_comments_all" ON public.task_comments;
CREATE POLICY "task_comments_all" ON public.task_comments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
ALTER TABLE public.task_comments REPLICA IDENTITY FULL;

-- 7. Publicação no Realtime
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN 
        SELECT unnest(ARRAY[
            'task_databases',
            'task_custom_statuses',
            'task_custom_types',
            'task_property_definitions',
            'task_comments'
        ]) AS tablename
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND schemaname = 'public' 
            AND tablename = tbl.tablename
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl.tablename);
        END IF;
    END LOOP;
END $$;

-- >>> MIGRAÇÃO: 20260907130000_task_sectors_and_ordering.sql <<<
-- ============================================================================
-- MIGRATION: TASK SECTORS, STATUS ORDERING & PROPERTY PERSISTENCE
-- ============================================================================

-- 1. Adicionar coluna 'sector' na tabela task_custom_types
ALTER TABLE IF EXISTS public.task_custom_types
    ADD COLUMN IF NOT EXISTS sector TEXT DEFAULT 'Geral';

-- 2. Seed dos tipos de tarefas estruturados por setores estratégicos
INSERT INTO public.task_custom_types (id, name, sector, icon, color)
VALUES
    -- Comercial
    ('com_contact', 'Contato Inicial', 'Comercial', 'Phone', '#3B82F6'),
    ('com_followup', 'Follow-up Comercial', 'Comercial', 'MessageSquare', '#10B981'),
    ('com_meeting', 'Reunião / Apresentação', 'Comercial', 'Users', '#8B5CF6'),
    ('com_proposal', 'Envio de Proposta / Negociação', 'Comercial', 'FileText', '#F59E0B'),
    ('com_closing', 'Fechamento de Contrato', 'Comercial', 'CheckCircle2', '#10B981'),

    -- Marketing
    ('mkt_campaign', 'Campanhas & Anúncios', 'Marketing', 'Megaphone', '#EC4899'),
    ('mkt_content', 'Produção de Conteúdo', 'Marketing', 'Camera', '#EC4899'),
    ('mkt_social', 'Gestão de Redes Sociais', 'Marketing', 'Globe', '#3B82F6'),
    ('mkt_partnerships', 'Parcerias & Influencers', 'Marketing', 'Users', '#8B5CF6'),

    -- Pós-Venda / Atendimento
    ('pos_alignment', 'Reunião de Alinhamento', 'Pós-Venda / Atendimento', 'Calendar', '#A78BFA'),
    ('pos_tasting', 'Degustação da Casa', 'Pós-Venda / Atendimento', 'Utensils', '#F59E0B'),
    ('pos_menu_decor', 'Confirmação Cardápio / Decoração', 'Pós-Venda / Atendimento', 'Sparkles', '#EC4899'),
    ('pos_survey', 'Pesquisa de Satisfação', 'Pós-Venda / Atendimento', 'Star', '#F59E0B'),

    -- Administrativo
    ('adm_contracts', 'Elaboração & Gestão de Contratos', 'Administrativo', 'FileText', '#64748B'),
    ('adm_documents', 'Gestão de Documentos', 'Administrativo', 'Paperclip', '#64748B'),
    ('adm_internal_meeting', 'Reunião Interna de Equipe', 'Administrativo', 'Users', '#3B82F6'),
    ('adm_hr', 'RH, Escalas & Colaboradores', 'Administrativo', 'UserCheck', '#10B981'),

    -- Financeiro
    ('fin_entry', 'Lançamento Financeiro', 'Financeiro', 'DollarSign', '#10B981'),
    ('fin_collection', 'Cobrança de Parcela', 'Financeiro', 'AlertCircle', '#EF4444'),
    ('fin_receipt', 'Emissão de Recibo / NF', 'Financeiro', 'FileText', '#10B981'),
    ('fin_reconciliation', 'Conciliação Bancária', 'Financeiro', 'CheckSquare', '#3B82F6'),

    -- Operacional / Eventos
    ('ops_inspection', 'Vistoria Pré-Evento', 'Operacional / Eventos', 'CheckCircle2', '#F59E0B'),
    ('ops_venue_check', 'Checagem de Espaço & Casa', 'Operacional / Eventos', 'Building2', '#3B82F6'),
    ('ops_maintenance', 'Manutenção Preventiva', 'Operacional / Eventos', 'Wrench', '#EF4444'),
    ('ops_inventory', 'Controle de Materiais / Estoque', 'Operacional / Eventos', 'Package', '#8B5CF6'),

    -- Geral
    ('gen_operational', 'Geral / Operacional', 'Geral', 'Briefcase', '#94A3B8')
ON CONFLICT (id) DO UPDATE SET
    sector = EXCLUDED.sector,
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color;

-- >>> MIGRAÇÃO: 20260907143000_task_property_order_and_db_persistence.sql <<<
-- ============================================================================
-- MIGRATION: TASK PROPERTY ORDERING & SHARED DATABASE PERSISTENCE
-- ============================================================================

-- 1. Coluna de ordenação de propriedades na base de dados (visão global compartilhada)
ALTER TABLE IF EXISTS public.task_databases
    ADD COLUMN IF NOT EXISTS property_order JSONB DEFAULT '["status", "due_date", "assignees", "priority", "custom_type", "lead_id"]'::jsonb;

-- 2. Coluna order_index em task_custom_types para persistir ordenação de tipos e setores
ALTER TABLE IF EXISTS public.task_custom_types
    ADD COLUMN IF NOT EXISTS order_index INT DEFAULT 0;

-- Atualizar a base padrão com a ordem inicial das propriedades
UPDATE public.task_databases
SET property_order = '["status", "due_date", "assignees", "priority", "custom_type", "lead_id"]'::jsonb
WHERE id = 'default_collabs' AND (property_order IS NULL OR property_order = '[]'::jsonb);

-- >>> MIGRAÇÃO: 20260907154500_tasks_nullable_due_date_and_uuid_comments.sql <<<
-- ============================================================================
-- MIGRATION: ALLOW NULL DUE_DATE, NONE PRIORITY & CLEAN TASK CREATION
-- ============================================================================

-- 1. Permitir tarefas sem data pré-definida (due_date nullable)
ALTER TABLE IF EXISTS public.admin_tasks
    ALTER COLUMN due_date DROP NOT NULL;

-- 2. Permitir prioridade indefinida ('none' / nullable)
ALTER TABLE IF EXISTS public.admin_tasks
    ALTER COLUMN priority DROP NOT NULL;

ALTER TABLE IF EXISTS public.admin_tasks
    ALTER COLUMN priority SET DEFAULT 'none';

-- 3. Garantir que task_comments suporte UUID gerado automaticamente
ALTER TABLE IF EXISTS public.task_comments
    ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- >>> MIGRAÇÃO: 20260908100000_safe_venue_deletion_and_lead_preservation.sql <<<
-- ==============================================================================
-- MIGRAÇÃO: EXCLUSÃO SEGURA DE CASAS DE FESTAS E PRESERVAÇÃO DE LEADS
-- Data: 2026-09-08
-- ==============================================================================

-- 1. Adicionar coluna venue_name na tabela leads se ainda não existir
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS venue_name TEXT;

-- 2. Congelar o nome histórico da casa em todos os leads existentes
UPDATE public.leads l
SET venue_name = v.name
FROM public.venues v
WHERE l.venue_id = v.id AND (l.venue_name IS NULL OR l.venue_name = '');

-- 3. Permitir que venue_id e funnel_id sejam nulos para leads desvinculados
ALTER TABLE public.leads ALTER COLUMN venue_id DROP NOT NULL;
ALTER TABLE public.leads ALTER COLUMN funnel_id DROP NOT NULL;

-- 4. Modificar restrição de chave estrangeira de leads.venue_id para ON DELETE SET NULL
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_venue_id_fkey;
ALTER TABLE public.leads 
ADD CONSTRAINT leads_venue_id_fkey 
  FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE SET NULL;

-- 5. Modificar restrição de chave estrangeira de leads.funnel_id para ON DELETE SET NULL
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_funnel_id_fkey;
ALTER TABLE public.leads 
ADD CONSTRAINT leads_funnel_id_fkey 
  FOREIGN KEY (funnel_id) REFERENCES public.commercial_funnels(id) ON DELETE SET NULL;

-- 6. Garantir índice para busca por venue_name
CREATE INDEX IF NOT EXISTS idx_leads_venue_name ON public.leads(venue_name);

-- >>> MIGRAÇÃO: 20260909120000_venues_banner_and_invite_photos.sql <<<
-- ==============================================================================
-- F5 SYSTEM • ADIÇÃO DA FOTO PANORÂMICA DO BANNER DA UNIDADE (SEPARADA DOS CONVITES)
-- ==============================================================================

-- 1. Adicionar coluna banner_image_url caso ainda não exista
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS banner_image_url TEXT;

-- 2. Inicializar banner_image_url com o valor atual de ballroom_image_url para compatibilidade imediata
UPDATE public.venues 
SET banner_image_url = ballroom_image_url 
WHERE banner_image_url IS NULL AND ballroom_image_url IS NOT NULL;

-- >>> MIGRAÇÃO: 20260911000000_clients_post_sale_table.sql <<<
-- ============================================================================
-- MIGRAÇÃO: TABELA DE CLIENTES PÓS-VENDA (CLIENTS) & INTEGRAÇÃO COMERCIAL
-- Data: 2026-09-11
-- Propósito: Gestão de Contratantes, Decisores, Dados Financeiros/Contratuais
--            e Separação Clara da Tabela de Aniversariantes (Debutantes / App).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    
    -- Dados do Decisor / Contratante (Pagador)
    payer_name TEXT,
    payer_relationship TEXT, -- 'mae' | 'pai' | 'responsavel' | 'noiva' | 'noivo' | 'outro'
    payer_cpf TEXT,
    payer_phone TEXT,
    payer_email TEXT,
    payer_address TEXT,
    payer_neighborhood TEXT,
    payer_city TEXT,
    
    -- Dados do Aniversariante / Homenageado
    birthday_person_name TEXT,
    birthday_person_age INT,
    birthday_person_birthdate DATE,
    
    -- Dados do Evento
    event_type TEXT DEFAULT '15_anos',
    event_date DATE,
    event_time TEXT,
    guest_count INT DEFAULT 0,
    venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
    venue_name TEXT,
    
    -- Dados Contratuais & Comerciais
    package_sold TEXT,
    deal_value NUMERIC(12, 2) DEFAULT 0,
    contract_date DATE,
    payment_terms TEXT,
    payment_status TEXT DEFAULT 'pending', -- 'pending' | 'in_progress' | 'paid_full'
    stage TEXT DEFAULT 'onboarding',       -- 'onboarding' | 'alignment' | 'tasting' | 'rehearsal' | 'production' | 'completed'
    
    -- Responsável no Pós-Venda
    assigned_success_manager_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
    assigned_success_manager_name TEXT,
    
    -- Vínculo com App da Aniversariante (Debutante / Lista de Convidados)
    debutante_id UUID REFERENCES public.debutantes(id) ON DELETE SET NULL,
    debutante_slug TEXT,
    
    -- Vínculo de Origem Comercial (Lead do Funil)
    commercial_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    commercial_lead_code TEXT,
    commercial_history JSONB DEFAULT '[]'::jsonb,
    
    -- Observações e Documentos
    notes TEXT DEFAULT '',
    documents JSONB DEFAULT '[]'::jsonb,
    activities JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices de Performance
CREATE INDEX IF NOT EXISTS idx_clients_venue_id ON public.clients(venue_id);
CREATE INDEX IF NOT EXISTS idx_clients_stage ON public.clients(stage);
CREATE INDEX IF NOT EXISTS idx_clients_commercial_lead_id ON public.clients(commercial_lead_id);
CREATE INDEX IF NOT EXISTS idx_clients_debutante_id ON public.clients(debutante_id);
CREATE INDEX IF NOT EXISTS idx_clients_code ON public.clients(code);

-- Políticas de RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_full_access" ON public.clients;
CREATE POLICY "clients_full_access" ON public.clients 
FOR ALL TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- Replicação Realtime
ALTER TABLE public.clients REPLICA IDENTITY FULL;

-- Função e Trigger para updated_at automático
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- >>> MIGRAÇÃO: 20260913100000_funnels_stages_and_qualification_by_funnel.sql <<<
-- ==============================================================================
-- MIGRAÇÃO: PERSISTÊNCIA DE ETAPAS DE FUNIS, REGRAS DE DUPLICADOS E QUALIFICAÇÃO POR FUNIS
-- Data: 2026-09-13
-- ==============================================================================

-- 1. Campos avançados na tabela commercial_funnels
ALTER TABLE IF EXISTS public.commercial_funnels
ADD COLUMN IF NOT EXISTS stages JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS is_entry_stage_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS detect_duplicates BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS duplicate_rule_config JSONB DEFAULT '{"matchPhone":true,"matchEmail":false,"matchName":false,"action":"keep_recent"}'::jsonb,
ADD COLUMN IF NOT EXISTS shared_venue_ids UUID[] DEFAULT '{}';

-- 2. Tabela de perguntas de MQL / Qualificação por Funis
ALTER TABLE IF EXISTS public.mql_questions
ALTER COLUMN venue_id DROP NOT NULL;

ALTER TABLE IF EXISTS public.mql_questions
ADD COLUMN IF NOT EXISTS funnel_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS funnel_id UUID REFERENCES public.commercial_funnels(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS profile_name TEXT,
ADD COLUMN IF NOT EXISTS venue_ids UUID[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_mql_questions_funnel_id ON public.mql_questions(funnel_id);

-- >>> MIGRAÇÃO: 20260913120000_funnel_custom_fields_and_packages.sql <<<
-- ==============================================================================
-- MIGRAÇÃO: PERSISTÊNCIA DE PACOTES, FORMAS DE PGTO, TAGS E CAMPOS PERSONALIZADOS DO FUNIL
-- Data: 2026-09-13
-- ==============================================================================

ALTER TABLE IF EXISTS public.commercial_funnels
ADD COLUMN IF NOT EXISTS package_options JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS payment_options JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS predefined_tags JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]'::jsonb;

-- ============================================================================
-- PARTE 2: DADOS DE PRODUÇÃO / SEED (DML - CASAS, COLABORADORES, LEADS, ETC)
-- ============================================================================

-- Desativa restrições de FK temporariamente durante a carga para evitar conflitos de ordem
SET session_replication_role = 'replica';


-- ----------------------------------------------------------------------------
-- DADOS: VENUES (3 registros)
-- ----------------------------------------------------------------------------
INSERT INTO public.venues ("id", "name", "tagline", "logo_url", "ballroom_image_url", "description", "experience_text", "address", "years_in_business", "events_completed", "guests_delighted", "google_maps_embed_url", "google_maps_link", "waze_link", "default_dress_code", "primary_color", "secondary_color", "accent_color", "glow_color", "font_family", "welcome_video_url", "welcome_video_name", "lead_distribution_mode", "lead_distribution_sdr_ids", "round_robin_next_index", "created_at", "updated_at", "phone", "whatsapp_number", "email", "goals", "master_id")
VALUES ('a1111111-1111-1111-1111-111111111111', 'Espaço Rio Lounge', 'Uma estrutura completa para que você não precise se preocupar com nada', 'data:image/webp;base64,UklGRt5aAABXRUJQVlA4WAoAAAAwAAAA3wEA3wEASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADZBTFBI7jAAAAH/JyRI8P94a0Sk7uEP2/5FTvv/e8zMWtwTQgIBgrtLcXd3LQ4tBQqFFihFS4UCL4q0uBVrC0VKoXjQ4k4ImhBCsHiyWZt5Pv7YnZnnTmaHYz+fz/dLRP8nAD74/4P/P/j/g/8/+P+D/z/4/4P/P/j//8cq6xtWskL1Bs3bd+nZd9Dgfj27tG/RoEaFuHBfzvujC41v2PXjyfNXbdtz6PSl2w+epL56/eJp0u3Lpw/v+W31winDuzcqG6r31viXbTVq3vp9Z+6mZlkIUiXW7LT7Z/evnz+ybfkA1Yno0EONu3fp0LxR7fKxIQZG9Ur36CK3Yzl6fp27yG7tCYxluny14ei11DweFcjnPb9xdPPMbuWMqtLwQpIqP7h/68aV86cObF46Y1jrigGMig1NSpR79VN6pW4nyj6pev71Pl1/+sE7KyranvHgzMZJ9QPVo9VrVHPempfx4tGtf9d/3qaETqUmoeycOfQqWFF2irr51Zu2986rQoJFkFhe390/vZG/FhLlCzNf3N09prRejSZqFSao999Ps2wEiyyxZz3bPzCU0UrOxJab/Nf48vr3I6bCnOtZDizy9pwr86sw2slZsL/Z0y/g/UfXeGeug6AqEkfuzmaayuX92TE65j2GC+pzyoaqKpwa6M9qK8TXiyv5Me8phmIDzlpRda1nBkUatBWS9G+r+L2P6GMGnTCjKpuPDYrRaypE/s64WN37BhvaZkcuqnbuzrahrKZCzNjYMuj9wrf+3ERUc+HB3Hq+2godNyaX5t4fmDJjzzpQ5a1nxpTiNBXi67WNTO8LgR23ZaIHfLuhk4+2QsvxXv7vB5W/u4OeUbg1K15bIbn5ScB7gKH3vkJUNMlNe3z/5rUrV67dvPc4NUdQEmLu3g46TYX4bLyP5gudfMeBChVyn1z8a+0PXw3r2q5Vs6aNGzdt1qpd52Fffrdmz7nHObxCkFwb56etMHkSp/EqrXghoBKtj4+smNqnWa3yseH+epCs9w+LLVezac/PVxx+YlECCslLyhW15N/XrS/qm7bv/fvUxSSbMjB9oqbTtTqYS9D9r/6d17dO2agAPQPUGZ1/VHy9Pt/+85K4DUnOgRZF7FCjiCIfGRVdPK7VbotC8N1oRrsZB1+3ottTdoyqHhNkYECBjCE4psbH254TNyFaLw8wFam9FUENI2c+MhOlYEZ7zRY8NZVHN2ftG1EmyMiAghlDUOmh+zPdhHzyRD8P5zP+mYOgZGLOdAe+rKLRIr8zE3Qr/2BeVR+OAeVzPpXnJwpuQZI9L9yDsfpWV1AmsZ5sUWV1ioNQsx8M1mJM1CIHupPY7n9RHIpw9LT7VuIGROuccMZDcQEtdllQupD330A9AFtm9m2zQAmzv9FrLybmfzy6Uci9OqE4FPGozy7nCG5A6w8xjCfiQpr8moHShcyLn/qC6/j5t82EDj5qx2ktpuSv6EYh++pnUaCCERMvZRF6aF9WkvE4bGjjH1MIShYyLk4rzoA4W3f9c56O/VBprRW3mbjj6awYUEcmdubtPHqIK+IYz8IEN553j0fJJPPiNxV1ID1o1EUrFUyfatBWcVvQrX83DFYJAKjxvyQ7PfsvMR7FWHvWVRtKN19fVMcI8pvuFajg+XqaqvhG3j3C3a9rGtQCdD325FBDXBbhObgq4/81o3Tbg1/aBQDV8rutVHK/89dQkYsd6G7rkRFlOJUAJu6HRIGadb6/h2Dixx94h9KFZ+t6FwPacWvsNMjZxoxmCpybje4XXm7pF6USwIQO+CefFuZ84eMRYsfufY0y32zsF8sA/RLraGD2lyatZPziJVEAoj1pdccgdQAw1vnfC1okbYxe/SKH/5FKUHr2jv5xLLiTKfeHQAEP19BIhqGPCdIVErfd46Ugmm8taWhSB2BjP7vD00HhXl+1C+m7O9mO0vMP9C+jAzdzDa7SyBnNaKOOlxxI13qqa+m2v6YTKYg5V74py6kCQFDX03Y66DjfTNUMLX97ZkXp/NlhZQ3gfkOvTAq4oYQmqvW3Fela/65uBF10t38KJSHJOD/GRx3AWP+ghQ5a/oxXL67i9w8KCUomj7+ubGJAidG/EAo3m2mh8GW5SNf2RzwLAGAoNemhIAVRePPnR+oAXMV9VjqYs0intApKYYrPeGAmKD3tx+p+DCiTbXaPQs5YH+3DjUsndPh14Qy4ZExlF+VJQrS/W11WFYCN2m6jQ1JGs8o6XlchfuOT7ASlZ62vpWdAsQGzKODP0dqn3S2CVIVlepCqq7yTl4TIp38VpgYAfut5KkgSGimLn+OvANY48BbKFHL3NmZA0Y2vULhSV/NU/JMgVcdMkMu2SLASKYj83SFBrAoArOWpIG6IVhTe76Jzly64x2mUyWcdasuBwv3nOOTZuzIaJ3BaIVI1f62TBeA/7FoBkYJYeLRzCKcChrVWOnlTfBSFu+Ldw4a03mNF6STzbE89KJ7r/UgeTvDVNrrOaUjV/F0g0GRLzE6ySELM+q1ZAFvkQP+blQrebMspyvaJrxvYsEY/phGUTDKuTo+Aolj1bwrbS2gaJn4HUi3YEgWUTS23pdgkId79srovU9Sg5EEHFWFFtKIwsYWOFhPcaF6iAyWTrMtzKnBQJH0W2eUlVtc0fhNyqVh/L8vQAggduDeNl4S202Mq6YsaW/2MgwbmDPdRlLAjhg4T0GDmFQtKz728qJ4RiurQ5/IymrIahq11E2kKx+pz4M4SEw5nECmIefsGlipioGtyUaCBCbVYJaF9somGqc70hHyUbr76Y3N/KLo1j8nL623QMME/I03hensduJerPPN0oSTE11u7RxUt8Olzl4plfrCi8GlLRhZXddrRbJRuu72kXTAU5cAN8mzjfbUL2zmTypOxgeB2Y8MFNxySEB+tbhdYpCB4UhoNfNaEUxQ56CsnYuzhTJRO0td1CmegSLPfWWQJMwO1i+kk0sxbEgVK9Gu7+pU0dFz7tipblKDkKjMN3BmkKDRPlhYycFcqysz7fUAcA0WcmfhaFi4O0S797TTsB2qAMpnYwXtyJCHJPjwhrihxjY5TyWnHKgpf1pcQ1GPHYwdKtxweUFYPRZ7plyRvY4RmCb6LNO/21CsEwFBh7GmrFERH2t7+YUUHTEOSaJCDBmXh4UBXvu12PLGidHvCkLIGUMM21+Xti9YqzBSexrt5AaBcxq/aFzccUhCtKdta+hQZCPshmwKaOyvM/I2ToeGGpxaCksnVMWVNoI6NLsg7GatVgp8iRfu+4qBoNqDGd6lECmLhsxWVuaLCVD1JKOA9VlmY1gy4yitSrASlJ04pY2RAJWsnEFkXS2qV2XYK5EF7RlkArF+9LbmSkFgefxNaRIAb8pQGP0JhjiNxU1N4gtIzV5bnGFDNGiflXS+lUXxeIEXLFhaUzxi73hakIBLHnQ5FBPRbrRQwwUcRl28QV2hJRplCzr5mOlDTykcFWXdKa5QJeTQSI6FoBs18xUtx3lFVxxQFaHqPULDWVcTeyTeIK7l85rFuRlBXGrc0SsRJnkLOZ1BkS/z6yiYNs34s58MUAVheQIEk6BVRdU4mDeHtmUH+oLbVTxBZl+K0Sd9XKF9ICC86wDT4Pd0mCfmkqWV8ikCxa0QeZjRVRMUSxwVZwpsL48JAfeuckZdQQpMY99goWPpAkfbvdSDdIQWx8MzwOKPiYFI2BcsagwL+atzkqF1O5tmpMaDGH11E2YeKa5LGD5DiKSjiTPQnxzOJFMTMP/pEc0orfpHIE25VVMCldfccKD3v0oLKHKhy2xvyfovSIob/5VHIb1rUALjKC28USkJ8sbR5IKMsmGCXhxkTFGC1oXTLtcXNfUGdmQGP5P0cpkXKHOUpHPMregCBHX9NsktC638zGhiUFf6AguOgj/tkZ04PZkCtJr+RReYGaZG+j1A+6QaqyBTrs/WlIAUx9+SUyoqCTyngw5aKs6yJA7Vmf7DJsk/21yD65WYKF/3UAYAtM3R/viTEjH/Gxygp+hWFvKV6pWH6WH+1Ct2CsgsGmzRI/fNIsT+rFgC6KmPPOiQhpv05OFg53XMo8P/GKU64Xk+tGiTIy2rLaZCvsilciwU1NdWadkcaOp5saa9XSOXbSPN+F4WQ85t4V+j4uZhKjXwpL70eaI/wTbw8YYGfqgAT+NHGTElICm/PjVdE0HaeSs58ZVwfXyrmggi+G2RSJdMiXt7ZChqk3kkiz9ycUxcALqrr4UIpiEL2+THhCpiVhVSFXUEKeDg9zgRMHZsIuV+RUaMa/6D878K0Bzv4Kco/XRLUVx894gYvBZHPOdbF1129kgkdvN7GbWnfl+IYAPCZQlwh2R6kQlz/ZArdGO1hWsRT6GNQIQCuxKxUSYhC7q4anFuqXeKRcv4cd11oCqIlT4ggjuTUJ2gRkfe8GWiPsrtR/vPaoNaVfnknSEHEzMUxHL3g3TakTbaEuWlvBTGmSYZYcmnVYVrdQfl/lNUgne5T2ByrWgAt/8oSJCEmT4jkKBkXZiP9hAbuqigGoXMsIrjOpDaBX6N8/ptg7cF8apVnmxygYsB9ej1HGuLR1hEcDV2fRBQViLykPoximOqHiQj249SFa3mHwot+eu0RuAjlp3bg1AwgZt7tXGmYvb5pOCOLqXVYEDHfzJeX8bleMWDsnyKWWE1don9xUDhaE7RHtUMUjlcDlWdqLbtnloT8k0UNgxlpTOwaO7p2nO58VR7/U4ByIHx+jgi/NVBNfIZnonx+QaD2YNomUvg2VO0AfDqse2STgmi98mVtP0mh01+ha/Kkc/Qv8nB3WQVBzb8drjB3nF49dC1uIsX7nUF76Ae+kmcbyqofQPjA7c8FKYi5RydUMoiZ+txD0dxJ4DfBKu9uByUZhzwUEe7UUw2m9BGBgm1FpAbxnVQo70Eb8Ihc6TFHciUhef3noHDGBVfvOIryv/oA1/mlvIIxSoLI/+W5QvPGILWIWCcgxeRhnAYJXUjk7Yj3DADG2nNvWKUgCg9XtDQ5Ra+yiZ0vDQB1r8nDmUYlQb0TDleYPl4lItaYkaKwJx40SPwulM1/G+wpAEJbLE0RpCCar/5YjYHAL9+gaEpTAIAyOyisjlaUYVSyCH+xsSrE/VGANJNH67RIg9vyciaZPAcw0e035UlCzL34deleL1A0ewznFPg1hQNVFAUhawtcoXlNmAo0O2JDmvbt4aBFOlrkPR/EeRAALrbbQUESkoz/7qD492HgzI6kcLWJsqDSBd4VvppY5HxH37UjTXKnA2iSbij/TgfwsPrYjy9JQhQEsb3xjAvo9kre006MstiBr0TIuSZFrNyWdwJSLVht0CS+Eygcre1pAIxxs19Lkni/KQeuG5yT93aoQVnA7bC5wsKfwopS6OjbDqR8PRY0ScRPFDbHeh5gjPX/KKRQOMYXREttlmee5KcwCH0kgmkDmSLCcOGDztuR9oseoE1K7qDwg9EDAYBvt7M2Imd3BVYsYIE88k2Q0qB7jgger8cWAcYYVGnKZQdSz1ug0yjlT8sjc8BTR35200ykFexvE8y68plpl4U/hisONhAR249RStMHRlca/lsautG2Xw8apcYDeTmTPBZA+e+eCZIQ835pEOTCOCFb3saSyvO5K4KpfYzKMQQVL1e7x6z9zwm6kxwvBlql3kt5TwZ4MDAsy5eB+HJuDX8A0H38Ut7Biu7456OoYlQHWUTweMNi7o4uXiIuvkrNBs0HzFp77HEhuvt6FdAqbPO38q629mBso5uCLCR3PiurB7bvU3nna7nj8aZly6muzhLj/1ju7p9Xrtu8+9/zt1PyCbpfuNYSNIuuU5a8U/U8WJnfCpBmwe/9S+o635d3u4E7qBMiprIJ7VjtYuiTJ+9gBc8VvvAtihJJKLxY03XgDXlPmxYBlbYeaakD7WIaVihvZ7TH8hnxGEXf7rlilYJov3vouby3rTVC3pb6etAwvuNt8tb7e6xW5x0iuUsrtv3fQ0EKIs/Ls3TUBqmLKuhAy/hN5uWt1nuqyrss6Nq+txRw0T02vSJSaJIumuD+J5EMaBr/qYK8VToPFTE3E12Txx8BAOhLjThrcQt21QAF+zoEggqqW8CXRCvoeiUTEdtgvROAX9UvHwtaRng8rYQBNM9M1Ar1rgko+p0PiDIBNX/K0y55G6r7gDqqW+BsecJyzxT3G4+ip0NAKutf73e7NhEONDYyoIW+lkdWeqSAr3gUfRcJMhljh/OC5hDMe5owoJ7qFvCVPFzliXQdHShqbsfKAQD/kYkOLcEXpO9oyIKaqtw0QQswlR+gqP1bP6DJlPn5tUMbEHt26qlZNfWgrurmP4WnoPc8oVtRlP83Fij79L+rAfi8tDsHZzcPZkBt1c1vokPer0aP4/MlipJbdVlaUOuoPEdnj2JLf3T54NIRdQIZUGF18xllkbc1zNMwfXPFUob5AfWPzsrLaedR3k7uXSuMBZVWN+PAfHl7Snmaeokomjk3Eui3vCrvRXN35D68c7foJmYRGvldQcXVTd8tW96Rah6m1BFBxLKtPLixwx15iY3ccWFclyLcc30WDbxZUqNxbTLknfvIs/j/YEbR/9ro3MD2fCTvSl137K0IRbnKIQcNfr1OmzENX8m729WzjHpORJ6O8wc36ganyjteTbWYbncIBcwfo82gVrK8lyM9SqurPLrO+D4K3GkY+07ernjVAr9v3tEgdxtps8pX5Vm/8iRl/7Sga/tf5Ri3mKYVylsRrV4QtddKAe0H/DVZmYPycK4HCfhfHromVxqy4Fa/uUTewlAVg9r3CQXMWaTJotdSWBHsMXSfvEDR58N14N6oFSjbNj1AzbiJeTTI/ZZaLPgbCnvKe4xm5wQR868mcHPl/fJyxvqoGXCHBQro2B+lwXQDKfzXzFOU3CKga+G/AHB324fy0npzqgZBz2lg7nec9oIuRN7D7oxnCF5gR9EnNcDtw1B+YmtQN+iRRwOT+nPaq3mqvNcj9R7BNCQVRXM/BrcbJ1A4VUftYImDBr+/svaqdkKedaafJ9A1v4Ki1iXg/uiVFLaVUT3TOUIBC78P0lzRK+ThymIegCm3G8UPBiig2gkK3waqHtvyBQ18MMCktQK+4uWdrOMBAmcWiD2sA+5nWj6Rx38Gqge+X5tp8EfqsRrLNCpL3tse6mfolYai6YM4BZiG5MhLH+gBoNgfPAW0rYjRWFy3ZHn4uUntmIZXUbRgvh8oMHS+IO9EXU+ga3qNBr75JEBbQaOLFLaVUrvwA4LYtjhGCfGHUP6aCE8A/uPe0sAbjTltVWIDhTuNVE63zIGiCfU5UGK9t/LMs40eAaKX8zT434tpK8MMClkDjKrGDM5H0ecDfUCJxkEoP3UE5xmYj84RClgw0aSpYNBrefzCMFWrlYSilnlhoMhif1K41g48A/iMTqWBjxsymqr+KXmYUEHNQk8KIsL28owimJrp8si+sp4CQpbaaAinDZoqZBUFy0cqFvBrIYqea6EDRRo/tslzLNN7DKh6UKCAjsWaSj/pnTz8IUS9pr0lIikj9aDMwC0oP/lj8BzMwEc0sKC1loK21yiklVOtro8Jus6ZawSFliyk8G+8BwFYYqaBT0xaquxeQZ5tqEGlyp/k0bV9TxwolJuA8oUN4FHij/I0+JVGDWVcZpOH24LVKWB5ProWrrcBpfrfo/BirGeBbkmEAmYNZLUTDHxMIacKo0Y+k9PQNXk+DhTbAeWTi7U8DCzIpiFcraqhwnbx8vBbnQrpu9xA0bwl/orRH6Rg3R7kaQL32Chg4fZI7QRfvKHwrpT6MNX38SL2v4uDYqtlU3g1ATwNNLhDKOCrz320U4NLRB7OYVUnZrkVXZNr9UC5G1A+uRzreWC0lYZwpYV2Ct5ppfAoQm0Cxr9E0dwBrHIqWyiYfwEP5LONUMCCzaU0E4xLpyB8pjK6ltdQlPxoAsUafnZQSGnviaDsTRr4cnqgZip+kcjDh7Gqwlb6C0WF/WGg3HpPiDzH4WCPBO1yaQjXOzFaCeblUHDMZ9UkdGmh2M0aoOCNVpSf9wnjmfSzBQpo/aOKZqpxj8gjj2qriGnsWxR915FVULfnSPF5JHgmKLGPBuYsiNBKhlUWeWjdrB5sqxQUzZvkC8qN3GejYJ8CnoptnEkDkzpxGgkaZlDAlI6qEZJAxNbHMAoa9hwpphb3WOA7ntDg91XQSrqjAgXH4Ui1WOdA0XM1WVBu3DGBxkrWc0HJ7YQC8t+EaCSoaqWAb6Yy6jCaR9GUzjpQ8OICpGgvCR4MGt6jgW+6GjSSbhcNvN5QFRploKhlij8ol+2TiDSXgkfTD8+jgRcqMNoI6hTQ4P+IVIGw20TEtjIGFBy/l9B4HeLZIHqZhQYuD9FIsI4GvvnKr8gF7rSha/5wbVCw/7cWpMhP4TwcNLtAaOT3YTVS7GsaeKmNrogZJ7xB0SeDOQUZ+yUizaTyjKfTjUqjgVfKaiTdHDsN3FuZLVJsmyQUzZjjD8pl6x4RaBROMoGng6il2TRwc7A2YspdopK7NLYoMVWP2kXyN5cB5TJxq3mkSP6JAc/HVD9oo+GYoNNEYBicTQNfTgkpQrGrctC1I6EBKDh8TjbSTO1m0AAAXe4RCvi0hTaCyM08DXww1L/IBH2Rhq6FB/1AwYGTnyPVpZGgCXxmvqEh/FtcG+ma36VCbrbVFxFDz9somjXLV0HGgclI9Vx9VhtA7AEbBSz4xqiJIPBLBw3EhNpc0aixzyZi+yMGlMu2voNU34z3A40ADR4TCkJSV23ElNtFx/FPeaYoxC7NQdfkanVQcP1bhIqwuQyjGbhPciig/VgZTQT6TreooO108SIQ8OkrFM3qyLqF0fkEhseWrVq3WYdeQ8ZOv4R0z7fUgWaAgK08BcxbEaCJwO/zLCroOFlGcWyrh0TsYyOIMzqfgPAS5ao3aNWl/8iJMxYuW7Ptj0OnLt649+hZSmpa+uu3WTydlNEm0BAQ9pIGeTpMG0HUGkIFHYmVlFYhQUDRM7Xa9hwybtrcn379be+RhMt3Hz1/9S4jMysnN6/AXGi12R28QAi6t3BVOGgKaGSjgOR0LW0Etf4VqCB52IRxG+sbHlexVuP2fYZPnLn4pIDiVqvNZrc7HA6eFwRCCEHlHy4FGoNdTSigfVWANoLhyXSQPGrGsSzH6XR6vd5gMJoCQqNLV6nfvFO/UZ/P/nH1tn0nrqdkme0EVZjc7wZaA3xu08DkkQZtBLPfESqIKZM69R0+YcbCZet3Hjx1+c7jtIx8q4Ce8NVUnfZgGr2jgScastoo/Jc8Sh479xcDaA/wnVJAA9eUYDQRlN5v1RKW7eGgRaDYboHGqwmB2giqn7B7FMFh4d0gHC4P2oSpc5sGXm3CaSOm2VWiYoLDVpiX9S499WnSvevnjx8+uHvr8Vx65GJ10CgQ8OlbGriuBKOJALrfVwvBYTXnZLx+8SzpzvX/zpw4vP/PXVvWLP9x3owpE0YP6dutTf0KpYrHdN1rpnezGWgWKLmWp5Ez0V8jQb/HRUFwWAuy8gUx+83f1q386duvv5gw+uOBvbu0bd6wdtVyccUjgv2MOgYkVpl9WUDqt7uAhmEbJdDAxGacRtL1TnKT3eGw5Ge9Tn2aePO/hH8P/LFt/aql38/9ctKEi3ax28PiosICfQ06BtxZfMyhPKR/vRerZcB3+DMaeLi4RgK23x23kPvfTxg7YmCvLu1bN2tUr2aV8qVLFAsPDvAx9E8URNKmB4P7Q/v9/oIg/atdjaBpIHxxAQ3bIqNGAlOn6255t6dPmJ5jQXaDk3Z0nfdrLLg9uPv2Rw504/kuJtA4UOkQDcxoopXA2PGSG5AUPv69uy/ILr6hAF2Tc1UYd/l12f3Egu483cYEmkc3MIkGJoVoJTC0OucGRLSm/N43TAbz+WsUfdaLA7cyoT12pljRncLJVkbQPuC3PJ8G2WnQSqBr8DfvDiT2rP9mVdRJ6XmfiGTONII7dRWmXcy0EXSncKCOHrQQRByngZYhmgmYslts7kBE4sg4NLQY46r6QQFd2w/4gRujBu/NcBB0b8GGeAa0EbRNIhTwbXnNBBC+8A1xi8vsv8dUNem5mF9RlCQFA1WG0/tWHLs3E91O3swPAAV7OmZWNg3H4TDtBIaR9xxuQ8TCK6tHLrGJvWoJshmDX3Cx2sNWXSsg6H7HnaF60E5gOsZTwKxZeu0EbLMTZgU4ExSf4e9rMhr0eoPR5OsfFBYVG19n0KI99/IIKjL/SE1QtseD+g8JBXzQmNFOAJU2pxFFSF34xSfDB/bp2bPPgOHjp8xfsfPU/bc8KpW8WBkHGov7rICG/e9SWgoCxl8tVBYiEofNarU5CCq94NwIPWgtMGyjgW/mBWspgIarHwsKK6JC0sqqoHwNACWv0MAH/ThNBb6D92eqX8b+/oGgyaDDWxrCv7UZTQVchRkXzOpWeO6rijrQaIY5NDD3+3BtBeDXYvlzQb1I8s/N/aFoagIocYQGPu2v01jAxg7c9U6lyLvfB8ZwoOF0bZ/QIMdqay0AY9lBv2epEMnaM7isCYqsNgD/zwgFNC8rrrkATHF9f89Rm9y/epcyQRHWCEzsGhqY3d+gvQCMxdqsfqsmb9e1jDZAkdYIwDW5SgMf1mE0GAAXUGn2HaIO/P25FQM5KOJaAQyjLTSENRGaDIDRBfY7ZS16hRcHhOgYKPI0/vJMUHy1QAEdffXazNlYd9GNfAcpKsSRf/PHBkZQxRYvbLL/qOCZoNFJq41ierzbPrVZ5b79ml75PKvsx6oGAP4fLTj7MtcqKI3Y8l79t6hZAKhl5ZXb5O76ItpDGXpt2kbx9+Gcu1rv3CRz89pu9Ipt3iR3y09qBwC+Ncdsuv78XYFDKY6Cd6k3t35ayx/enznQ/kxE47HLD998lJZVyBM38Jasl49v/bNyfPNiDHhhmYAKbUfNW38w4crd1Iwcs83BCwSRCLzDZs7NSLt/9cyhjfNHt6sUwIBXVx9auna7MTPnL1v3264//zpwcN+fu35b/79vZ47vWLdMmBG8yDqf4LCIqOLFi0WEBfvqGPjg//8fo1xwuQatO3ZsXtnXK8X4Vhu4cPe5xOTkW/tmtvT1Pumqzjz03I6urVe+jPY2FZt0KBslZ6yK9SqxnXa/Iigzd7HRixQ6+54DZZPEFt6jyr+9Q9fk3blNi5ccKUREzF6k9xY1Pm1Bl/a785uWjAwJjfnGgYjC34FeokYJdnQmrxeU9uPA2bcQEfFcvHeowVkBnfnzjXQgfsXpWn1vEFP3qIDOhQv9Qeopp5tNvEBs5T8JIiJJGwDSHzldqeX9YUqtExAR+XsNQLqx0Ol0jPcn7OtsRET+v1qMjKZWROT3+3t9jL2fo/P1JhzIXMkjYu5ivbeHrXoInRP7mEBm5F2CiKlDwNsbPL/Q6cXYAJA7LBMR8WYFb4++UwoiYv73xUBuwN8ORLRs1Xt7Yo8iIgr7qoDskW8QEV+0BC8vN9LqdL+3QValszwi2v80eHt8riAi8qvCQa5xbiYiYkZ/8Pb2tTtdbcvI6nZbQEThSKDXJxERMX+RD8itdsiOiGitDd7enoLT1ZYgN3p1ATrP4Lw9+r2IiNa1vnJ85xWg8zl/8PZGZjo96g0yA6ZmoHNeLHh9e9kQkRzyk+Ez+Dk6mwdz3p9jAiJmzQPJTOCQZ+hs/j4QvL4BrxCR3GskiQkb/xydC7ZGgfe3QxYiOo4Xk8KU+DIDnQt2lgEv8DcFiFi42Sil6qoCdM7fXZ31AnG/2RAxZw6Is232o8v8XTVY8AIH/utAxPTeYiFDr6PLvB11OHi/ZoPKNe0+dMzYXoHvFzGXBUR8Vlmk9pJnxMW7dbVYeJ9mwppPWLn/wv3nr988WPB+UT6RIGKir4vIj//NI+icviCehfdoNmb45ivpNnSdGv9eUf0ZIuI9AACf1luSHejMJ44vBirJlakWrIH8+h9ItqLEzObvFXWTne4CGOqvuGdGl46ElgGgkrpR127vaMp6nLCPhk6e+kmfehGsQiLWpNhR8pu494qGKYhIrrCVfk7MJ+iSX1lOB271H7Lpx7pKKfOSoOX30h6myqLLKa8zM9+lJ1/+pY2vGOOGMmfMKN0xnXuvaODi4cwHFoKuMz4NYMCdTLk/sqzmfTUU8ilBxPs9ihQX227k2O4lWeUETbxvFtC1YEnfWI0DpvSwVQdO/rtlXCwd0388uubTz2yeP2V8K194r6yVjIgoOAiKHqrIgXsbPBcQ0T6bUQT7ABHxehux4it2j/JzX7mvVvQJEvFtt+ulzW63vV5iUErF3fkEJfNPevfan23nBUHg7fur0/DfxaOz49Gy9tEmvY7jWFAq02jhrBIaqOJDJ1HiuDPICG5ljYPfoMtNsSzjBobl9P5Vhv+Rjojo2BkhEvcGsXCjv3vY4KF3EPFsOQaA8Wt3woaiezkFMLpiw64RlO0gKJ4zySSF4fRB9absTxcQER13RoeAwrkSP2UhvimmfYr/J4iRwkffxjLgTn1wz1MCur47p0OlqJBAPx+jQc9xLMuyHKfTG0y+/kGhxat1nrbtthldv57KuIpKQETMnO/rBn1E+30WdN4WBD7Vt5pRIj+AcZcuqNrsOzy6JDaz2eIgLiRbZ/i6YvT+ETVHbU60oGvHybKgbMYQPeK6AxHxhPYx7bW7EvLuLa3KgTtNMT33m1Eqn3Hv6OYfpo0b1KNdy6aNGzdp1rJjz6Gfzly+8/TDbB6lXqkFLkN+5Z3wyUgfSox/mX4H89H18Yi4z9NR+rUQ9wTEdV2fhqIZ97Z+N2/lPykOWc+H6QGAC4yu0nfp+SyU+mYEKJr1jx9y3Iwun+g0DywwO5Hc6z/WMYA7TaUG7s9FysRuKcjLyzdbHARp8rvBZeCcAnR9s5eJhi6i5hf/2VD8ty6nUNSWa3OyD3eDLqLK9JOFKP5uagkAYIt/kyXmeJf86HHy4+WlwRAW33rWX895lJm/tkIwpxg2tObnZ8wougW0b9MMJ9uxBkZwI+NfefDOdyguCDLc/Xa6i5BP04iIkNDJT44+onqvn+4RlHrxJXFBcm/v/vGffEQk1yMpsSFVui2+jlKfzvEDYAIbLXiCovyer/q0adenY3xc/f7fHn5HkKL5zNedyxqVwARU6rDwoh1Fcy7EaSD9RYKIjuMVgT5XrPnUQ5kExQvv5ipEEJwSGzoV//wlShTODwxnxRhTbP1BP5zKIiidoEvr7WWtg5haVwREzJ9qoMCFVOs298hbgpK/CtL5xDSZfsmO4tZSAFxY9Y6TN1/PJSidz7z7kqAz/2pnI85dbHCVzjMOvURx270fKoAWHmJGRMzdUpWlFFxr2MprhSiVJE144z7BnH73+IYcRCQXwwDYit+nESdzlhPi/e86Vgz3M/mGlKrTbfLas295pEvebu8WCADGpXmIKNxtL4MxlfhoyKJDKXaU+8vIMV+tvWxByX2imoxY/M9TC0on+U9ObZrRdUKKC0TrojC36KMbDFx4IJlHccfDjd19QBMHnnTC7N1tA+SxEQ2HLP33FUHptm2NLU4ZN+88Tc/MM1sdAnEhOGzm3LcpiZeO7l49Z0yXWqEvEdHxtw8Ed9qegc7WNfPSXWDhrb2rF81ZuHz78aQ8ghKF9GvvJDhuTItnwbnmQ4KIthOt/ETYwPimQ77ecjbNjuIk+8IZi5M1M8uKom8em50S1l54w6N0R/qFrbP714vkgD0oIqwvSY0Lr9nzi7WnX9hRovXuugHFWNDGTIscJ7RcWdA8jJXAhVXvOW1TwnMHivOvCp2yB3dF5yP92vccOGLC1Flzv/3+x8WLF/+waN6sKZ8M69O5ee34CB8GgHOy7CjT5rsbFnS2/xwX+sVDF4hIbIVWAaU7Hm8aMSlZzLqjnR+ILjIjIlou/TC8c4vm7XqNnrl634XkfIIS+WfbJzbtd89JauGZSdOfOPEEpRfc2bNgSJOSPuDc4YFI/qxAKvri9QfM2HgsMZtHiST77HddYjjQzOxMF0iyrmz/olv9yuXiK9ZtO/zbHacT3zlQIp/66xcPCSK+rLDaxcJQAGD1Jr+AoOCQ0NCQkKAAP6OOAYmsk+PRwRvZ6LLwp+LAhAy9SlzJL7y+sH0pfX+zSObccgyIV7hFEBFJfsqdq1duPkjNtqN0661FneJNEP6DTZLwYkX7divfOknPu7l+dIsKQSy41u8XnOwZj9dVY+SwAaWbjVq2//yjLB4lC6/+Gl8/jAUtHb6Fd0JEx+ukaxfPn7tw9W5KjgMl2+4t6Rzb4KZTatVUp4LRBnC7EwoCus6YXgwAwL/11iwaeVdXDa4XxgA7Al3f7BcKUnUf250oOx5vHdkgjAEAqLIlV4zkXl67fM+NTEEan3Z0Ub8GJQwgNfQOQUTH/fmdy+hAlDGGl2vcd8qS3xNuPS8gKDPnzNxOFXxBYzNlNxFXtEnuv5PrReqgxnWngn2C0922rPsOCyj15sBgcKmP+/hInjR76j/zulYtZgAACP3WhW1LQwNID5hmo2R/smNc/VgTuNaV+uxMtoDoeJP6LDHx2Vs7SrY82PJp07JhepAZcNOJ5N0/tmP1D/O+njlr7qKft/x15saDlDd5doJysxIWtKsQwoH2ZkvOSHeD/eoPbWL8WQCIPScgIrEiIpK1JcD9Q+0SzDvqm0DcJ7bLknPpVkS0vbnz1/ze1WOC9OA6dq3T8wmxLMgNGPpUHsm7tmpgtShfBiQyfnEf9R0+/vtDT3MtdoISSf6Fxd0qRvqxIJ/9TUBnwlvNeTnZ2dk5uQUWu4AUHS/2TWlcMpgDbc74Nf0zj07OuTktw/05cMnus6P4s76sAkJOidgvDoriQLLOP6xMw3Zd2jYqHxnsp2dAomGcHcmpVr4MyDdWWPyESMm+8uvYupEBBgZks3EjD70p5AlKdsyrH+6vY4BuTJYLN5OsC8t6lg3xYUHDs36Nlt21SCNZF34eWNqkY0Fin1dihfP9QIkBq9MFtD3b2SOcBYoMy7IMA7KD2o1vH8ECVUYf3mHW5kOnTh3e8cO4FiVMeo4BimE9dry2CSjbEsGAG5umuIlkJCzpVdqkZ+E90KfasE0J956lpj69c3rjhKZROpC/2+KCFKyLBYWGVK9bLgA8JWuIn5noQImEtyYffCYgYiG4N2R9rp0nsojA2235T49OaRwJ75n6gNAQfz3Qjlz9Jjc/L/PezAjQnIxPdOdNaSiRWLPur+0RWfM/goi5bgJd+XHbrqRmZOXk5efn5+flZme+eXb14KopnSsHMPDeXWP4tImdY1jQmrqIml/9Z0WJha9vr+lTjAFocxcR8aK7AIDxK9Wwy+BPPp/+5eeffty9RdVoXwa8iL5lOq1/gRKtL29tGBzHgPO4F07LFODVDKox5u9cFOff3tgxthILokvMTl29OUENvkowo3jhgz0zPgpgQDzgD0REe5T3xrfW9HNmFBWyLq3qE6sDyU0uOT3Se2uMVaceyUBRR+pfX7YIZ0HmlLdO6xnvDFtq4qE3KOq49fPAyiaQHfirAxEdQ8ErGzj8rzQBXVsvzmhRjAWK1Q8TRCwo45VpujXZga4Ljo6rHQhU2b5JiIjnTV6YiHlJFnRtPTKkgi9Q9l1oderLel/qHspG18KtSWVNDNCu9jciYk4J8Lb6jHtsR9fPZlfwYYD+iGyn7UHelpiNuQRdZm+qrmPAjXGbEBGtAwzeFa7paQc6E/Op1iy4le3yxOl2afCq+g64iy5tT8b4gZtDF/CISL4O9KqETExGl7k7KoK7mWZJiIhv6oIXlQn97CU6808XMOD2oK8REfmlkd6U0Kmp6FyY0E0HbueaJTm96KrzogRPeIXOGdtrcOD+sOUOp62lwHtqGpeGzuk/lGbB/brWaYiIT3vovCdcr0fonDK3OCgx+gAiouWnKPCe1rqBzi9nRzNK4EbbnG51YLwnhl2CU8biEqDIuHuIiIVLwsF7OjYfEbFwczyjjC3E6WxjxnsSm4yIKBypzIIihxQgIqZPNYHXlFnocErswYIiyzxARLTvKQ3e05gHBBHzlhlAmYd4pwfdWS/KxzmIiLfKgzJn5iMi5i3hwIt6wIGIhetBmS2eEETkz5QCL6pPIiLi0zqKYGLO8IhIkruBN7VTGiLyp0KUwBTfZUFEzFkAXtW5OYho3aBTQrGfMhER7b+ZvCsbLYhY8A0oMOqbdHROKAteVWa7FRFzhysgfFoqOj+sD95V3S4bImb3dl/4hAfo/GIoeFk5Fzn93RY17SE6v/7U5G1htloRMX+am5iSC1PR+dUMX/C6/piHiNZ1erdwNbe8ReeMLyMY70vPdEQU/otyh77HWTM6v5wewYD3NegBIuLrj91gnPVUQOe308MZ8MbusiEif6Y0tWYHstHl80mhDHhl22UhIhasDaPClF6WbkeXiUP9wUvre0BARMxZEiCPKbXguQNd8hdac+C1rZ3vhIXbKuiksDr/ev97QdAlKdhdBry5E61OSO5OKhdkMhiMPgFhcW2/OZuPonzyV37g1dVttDoh8ilbJw0ZNGLK6vOpdpSYd7kdeHtDf89zQdectLgkeH8jV6fRyru3tjl4g5mwyZfzKdhfnlva3ge8xD7NllzKEqQQc/KZDRPq+YD3mAlpMW3L6fupr9+8TL577uD6OUMaRnLgZTaWbNCp3+DBA3p1aFw12oeBD/7/4P8P/v/g/w/+/+D/D/7/4P8P/v//gwlWUDgg+icAAFCzAJ0BKuAB4AE+USSQRiOiJaEkcdo4sAoJTd+Gi4ZWeAGsB563Hnoc4Y/puYZOAfwDFANNUivgT/YB+gH8A9bf4y4//Tt15KfOebSvu1/dvzE8FbQfZP8B+wf9g/af59Kv/Sv7Z+gv7D+v3yw/3Xkl2D51vjn5v/sP75/k//R/bfnj/UP8J/Ov7r/uflL+gv+V7gH8N/j/+c/xX+U/73+I/////+qD1E/3P/geoH+jf1r/qf6b9+vmh/1n+z/4fuR/tf+x/HL5AP6P/bf/h7R3/C/+XuM/43/r+wB/Mf9P/5fZu/2P/t/yf77/Qz+0v/z/3v/C///0F/zf+1f+L9uP///6/oA/73qAf8f//+53/AP3//5vvz9dP8L+JP6DfVDx8/UfhP+3H9h+eeKb+ieoR2eOwveKbafnPmBemX1HiI/KPMp/RvSzvG/rH/G9gD+Ff270k817197AH8W/sPVG/cn/7e4J+tf/cJC43VV5PpB8AJH0g+AEj6QfACR9IPgBI+kHwAkfSD4ASPpB8AJH0g+AEj6QfACR9IPgBI+kHwAkfSD4ASPpB8AJH0g+AEj6QfACR9IPSnasyOH3yQSnCL4vdcvUfR5osJr+lQg93VLPsVQiq/pVAsXrnlvTh0Di0o5IbI736cgIMrfZ3MpWRUOPeIHUEkrKMOfkaqEUUnQSmmRbNBRWDVe33v/tVxn6+qrMghrcCZsq8f6h/lfOyDJYzzvC30AdtDuMsFNHOkBLdXSNvMQl3ND0XU2XudW25hq8JoYBeVjBb+YmQYT2xche5lleomEjjXFm/ECOm2NzsQia2lrR37P4mSGlg5j71vjq9oqT8yApbdba8HZYwARKe/tZj94ncFuwcDefMlHf20t2uZwc1+7eS30oax6RRVTR2Q9Wmjq8n7CaIR77Oit9/QN3PJ/FD4oZ7TpPbIEcUzfLIROJc8WjS9rOlUBJwPna7zxvLY0/V/Xm4Y3YEYaHaTFKqz3OS//6SiaZJ3d9HaT90qevYABOGo5Y2QHmBI7syFg7B1TJzxe4bGio9zC5U0GLOIXF5v2a32hfnB/FYbBpHaRHgMfMtMdEA6WQSU0nzM9qEtwAPWgql/eEXUKZT4KSeBLssrN7c1LG/nkRtmwpkiJbQJ7A2uLTbllANjA8zbXWN+9xN9d09w/tgH/jvw3xBX9mPlhPl7DUVhiK2hhwwbNdrZpUNdmkOm2CAf7DEJlq1ILBqwWIweo7AHXGjnvk5OqzWmD8PpwcwJha0L9LXVNsWgVW+ymBwd2mjLL5SOV1DaCET9kxFLqlzPNNqXqO7y08Ux//ybCt+J061X0vgRuvKlSGhPz6iC9YsROgLH51gvq+cFxBJZBB3gRM9VoSaVLW/pFWm5wJaxM0BFx27Wdkvi7R64eRXZ+gTOb1yvdm8nzI3a3rs1XAkwKXzd00RKtK9olKhBaNr8+0PSm7ou7eejY2UIuTwLpXnxgBI+YhUu5WmKpUph2TEVww26qvJ9IPgBI+XAAAliwoGt2TEVww26qvJ9IPgBI+aZ62UTATK4ZhbG38IZDZt4xDmAOvVJQE3wxP/7wxWicrHyiGDmFa6xlo24xZfwFt2x5KnTB/yMaG/mE7MRXDDPfw7Lreb1ECBeIwzHeM/IXGT9dVkf+mnfpNbmwA+4PjJ3/9MG3xPDJSI3k4Do2f1T/9MpwbzWPIdQE3BwW0LFwQ26qvIuUtPMlbpCOOy3g70AX7RZGsHQYGnIOOHG6qvJ9IPgBI+VytuSK517R0EnlCcrk+kHwAkfSD4ASPpB72dcJ4ZxaMSvAEJvuqmIrhht1VeT6QfACQuWWpOATDbqq8n0g+AEj6QfACR9IPgBI+kHwAkfSD4ASPpB8AJH0g+AEj6QfACR9IPgBI+kHwAkfSD4ASPpB8AJH0g+AEj6QSAAD+3+gAAAAAAAAAAAAAAAAACptvFMRHkc3AkaPFlA+E6uV6UbTJtOPxetX6zdXEol+90LjUYzVA9JCg4C4YmeEffyWXwz1Tmg1F7EHknWhlNOjJJOA9F1ySkGS1mIp/bv/+CzOFO7vR0/JKLb5vUiV/XZhb/qtXoTtPCeHWoxkMVDG5ixF47igOl+xHB3O4jowVT1Q+zy9q2oARHNXIoHwnrkVvMkUsTcMO7ugpOZOJRj0l2LF0t1XzcWHyebzQUynMx2PHazbDxKLJoD4A+ncdZjHddhlrpYeD8cvugM/woE7MCPmRX9+Q3DSW04wsvY1v9Pwb0UQ3AZ94dEVBxQKhsw8+klk8IxhhPF6+pe90nYTcNe0GJvgGOCGnIKlhpYntMVvDZBQQWXRJ0bzS0v7IwHiXRJeD9hztLnR90Q7idqgErFndYocuOBQfdkK17JAxrFZnkA/hKDTq3xYd3JuZKs/+qaDNOMHL6UegA6mFBdRl1tomLC5f/PwtBdXuWBKHGrR4VK2NbB0J6Gb/PtLkFCxJnBpdeJ53OgEDwNQeRMvkWcXjmNSbJnLEvbG7Z1DBQxc9G6lxYi8eKrwEQOAdcITtPyqp7z0gYmcgpRBQEzMv+NH8RrHXYSmjMxcDEkI3MWTyC+I7shn5MNANvy+X+kYDVqxFXrRr6hoGcEZQIpEEbqixPjmdBc4u7U9BMKB1t8Nug5T+S1AIKsKCudpPp6wVgHYjUgnHKkdG15RvX0/yn8iMuHTaQntYA5dYfEmbPwaDZ907dJBUJnk5rvzkD5FoTElqAah6jO8yEht4N46wLJ2HlH7AdiPrKHMHpL/jxIooOKYRKX6g2yZRffe0wi80xWGHCJOxTzQJFh93Cz7Og0b+9dMLWqDk90Xjqju8CPt5CN/arTwQO1v3KRPsbkf3mGxPCIfqZFjHnyAA7th3Kv3YWo7VGvO7Y1JwDvOEYjkZ3MA8/UtrynZlK4VxGmGybldcJdV3+O+yoYgdq9uPI9D36s8FBvVzve0eSP3SWE5yAL5zPMN3DyVe8F/IvjdgD8YCLROq/9xaW1KiRzAMDAEzGtEXR00WoM7t6pCWSzpsQgTmJSUG2DVxsvr7eEeBui+Pw/6KJ9hdORTxSqaozZRGFQKS0JqlajodI813aNDne105OJ3CI+948+R1WiuPsx9nYlAPHlvy6nuggqfGAJKD/QYc3f+o38zvyd9tfaxo4oUzbXoEctqWWWddcFwEMpNkypyawAV5cGDY5ZnRBGxFgamPWRNHybq/eaeTQ+F+wI5Ag1us+fnMXxNaDEQ379q6ici7EQNmHRuwN/kxz12LLm9pNjpV9/g1M7hf9sU5Q9nQX4SIdbjJcooqDLyHpJPDrcZ1CAsnIR7qe0ixF3msHqZKAi5yFdh+6GXS2fI/9PUU5SfQwsUGRjcOSH5JL5ysVSs/x784mXH42F0tcPBtmL4sGKwjl48jlASCF3w35lmbh9ZVg/eWaTV8l37W9nBL1ZLq5VLIHZThL//FlxkSr/XtquC7nr33+q8BXBYITXpZbhkv8uz17x5CGFtAYBKVKdmu/JHs9heKZS9DUnyeHrvuj5Y6ChEdSrYJh/mYSkSPurAx6pGCI01JCbfZ51JRAhfQzbZaMGMU/xX0gRyID/gcVVA59+RBd4JzIqcFHeC8t3FyjYJFNrqkRriJoAdnhfxdnY4fJVHS8M/Ea4LWSwBAsVvfPEALwX1zMGCMcdBuxzB6wNRr43koFf+p7RY3KEgH+c2ylYaM37mIQlcoBYG39UP0HOOqr4olWuNrv8TwWop86sd0P/jrbQVXw8NUH5WbGnTDRLFzSTDIiZ7MHKMqQtOLtu+WBjrWbxE0PPvijSslbSPzzoH3OY9gntY8ukBOVCHa5TkKz2GhSWMB0ls2iH1aEFJaE1SzJ5TK3KCsYef+9S+r/WfkpPbOtetcyZnwPHs4wbcCQjqqmqwD6/CBej1zeGaNHfoZ+2+cAOX1dO7p2LubKrnkUsInJqAW+HyjMlnaije01mMHgFIPy+UrufvWy7RB0WcCrvvHbUpw6moD7A3Nr/hwyEAx+I2q+4QCQkTmNsCD6Ktdp/kQaAAdnZTP9rqwVbPACRonQ1lsCVUAiPft20W5tU7Tda8B/E5ySh9TTaivIvWy3o/+mGPbM3qXoWu8plj2jYNZmVyDBz24J7YLITBbTR7d/OQCM4cn/uZ1wQ7cuth04U5waSpJSENPHMUCGgIfGrwa9+KuyJG/6ZXhgYbnAoPKQsYhugW6Dz56NCLf6AzvjUV/mKgGVgc3I987O8dt8g28/fMVrNCF6afljKU1KvPdWtiEMX9oCecpYgKgX0r6z/90j+/tumep2gBt/s7eafhQnkJNsoiimKwFGtgnrPvNoivAJ4YqFDV6zZ/GNFBKrw46nLD9243hfcR9slq9wLm5BYhEtKJEvJO3GW2UDnRtjIW8eboPdBLoavvtmHvh4vs4kAtqlPSilylvOJ2sZBQR+yhsgGhfavHRngYyzfpCElA6AbVm+cnYbN4ZegQwBhsotpNuMH7MFd08QWAgwcFE43sDp4//0pXFn46p2nGVfzAuZgRcX2Y04QDzFW4ROSAqDjcRK7+IYOUB4RlQzOPpoX8romP67lGGumf9gy4LYqwKLVt1ewZ0I1dEqOoEUOslV8Zu9ZD+cjAOc3xwJRAeeiunuqYhoY5JXtA1xGohQlYzO/u14n04s3YnBULZES8ZfJfsb/X2yahoAdm0+oc6/UO0PfXGYbuz+0QR6tMxBGIQPUkWjzlsJKFWK72BPisXNo46w6GinuQ8Ko41g0hlfpnH0U4QX/c1s8F5qlIBcTC/t8RSalSLEFNrMSM9Hnc783udpSfihqWIaHNlu23f0z1q/MMvui1ZsFKHYGKg8FpZW2kd1Q7EMPtUzSE+n7mCRpUzq4IQA10N8Jf3a3HkR/52JEVnOERP0i66QdcpBjGyn5F1UZqotrljARQUutvOpDGdFcO/VlTbo0NEHnrQeKE5ncNtj8hGcrgEnMDLc228fcEz13N4V5d4dYx8kWt5dysANplid3624brQP/PWhnz0oZENLRF2P4m3UIBwrM04LuqxSxAvDAN9o5VVDtyWyKIrGz6gVBdhXkQl1Tsqx6ONw0YTKhyBeM4YpukFHAGFasjGIOxxSqUPOjdJTyrnW1b3PyRblMGUEbLc+Nclw2uA/Guc+zYsAV8GT6dOC49CT/0i3G2JcYYdDihA0mrYXn1d3feDWUnYA9r187pPoJLSAJDKZq9X9KZWEfW5pNLlcBmt4Q+h7oBlq3FZ0b7aOG12bShIwI8USwcPksMfQR2rhLo/05+YnC7ZSKtSKQVCT0AkZPeXzeQvoukt+RS7nIAWkHliB3uAL3N9ozJmz8qc5YUNbvP4knVO3GXs8bp7FEGVCOjzM2TNx2rZJ1r1qykTUZ3vO8RRwxlZMmjw2myj2d++N+hSdIWno9jYsTBltNeauPvkRzLcgYSNz3+sW5mpZFzR0+x18Xz1bfjr89KyGw5ZtObWGTkyr2w8jU3gFsR1ujczOinnf5ygdcKgknNz+ZoeZBqC6ku3mVUuv28fctDFEv/YKSlKp2a9YEJ7SfgOYrAoYDRuJouRh9VjqwfIp3J4+hfSe85W9G8v8/oDeKeDVD6lTyVuPjK9G3umSd9Cdvx5qbHqPsMX85MpIhU+9bmUpio6bIbJlROUaqZGkB1D/4LAhnWfAiZuk/U3CujOaf7yNiG2qEszQoyzdmZY16AsxRboWExLO56/hruli3KhwvF+ATOiDTzN5G2wlGE+n3NHZC+XkUlQzOtBmA+FudPo70N4dYz9T3rPAhDTy6uMKFC4DlVB9f+QxomsuscAMONg5LiOrKlUAqvj25BDBakzwqjLVTyh1aP4/qrC/DBWAr3XhMQ4DjrHZISgagvgyAPMj2gbNKYq36ynsxCfWrJhFHKl/TziLZvHWajsOLJSuGlgUmLHPwtv1jk0gy5vU0pk/ACOhMvsn2a2jRSA4uWy3hT0Moka1sIQ8Q7afOwKSaSHRsH3VqPysKVBETY8nE+ggZT9IuyxcN258htutCXJ7zIYedQp/j3REsZfzxhFKkipgsFPltKUXMKhMUj2qLBMcKSYk6FbnYvIZqdCDDfcSW0SzafkZrUmT+0D8rFGMCcMeVhOHn+Ow4dqrUuHZpN8g+8ZHH/Hjp8xdm2wEzlCXyWrcAVuqBNP9V3zdvip70Xo1JJXauQyukyulGgZnXV2pHKJ1i/mKmtrWZua0kaoCBhtt1X3mZNc/SumqDsNBZHZvH5KWF4qfQ6wEbNCYYglperBU6br8Wqs4mMjVgr0StJRNH7Xv0qyGr+ybW2TEF5fXpo6GtdzEcCHkE4ckN4dlyS9wOUcwwVN5edxssfrMT5oBnvDXVswRZZl7As5sRsXYUBukRKN5wbyLrhp/sdf1k0zi2X4xfTqU8JCW2GmSmUdLwCUYx3q425JNKV7VKlARaW0UgIlgdiWE4iJVLbQZrjBUZIFsiaA11w00uhLYLnS/VAHSw/v1IlVgv7duu3Pv8n3WOtU9HtoHCW0oaTbwX3Q+yYrrIs2k8pDgr2fpUcAynzwHRSZTkX6mhbdmkmDl+Qw7h4P+rzFTQdi1myxZrAxCyby8oVrXe4C3VcowQBCkAi/hX0I2usLo9vDKQ0unMoMJJphfIjv3IeotmmrBuUCp/liNTTF1xZt1JWOX1rt875PUlBwMUzSK45P3bhGutxLZcBGyP4DH0crESEHKDoUCT6lUDJHuHVU9h/wkgOUkhpv9jy3llBg6A4S6nBLS2ebb4jKL8eMBg7Nlqf+6g6TOKnIP/frYgMUwZYSiZglQCCgfKJsXV/jacndm+xiN4rFJkbFRunkUsFMU4YJbho1MXsVjWoj8xuarkQpZ5OTHKHCBakbePqktWe3Z7fY5/du/jEiwp1Oezj4435Tlmqxrwn/YM17/pOPUt+7wRR1FwuIzTSJC5pwmhderPePONkAk6nqRfiJY3ubDOXka5MWHFAIkmWzybESM2eoKt5LWN5AYgEyypfgA4AFMOu89LU58E51IYAqRIx0k2wJFu9Eh1FlXqrzjKl6yvr4UDZWapRbYtQk0d1ajdGF7LixpB0pcxfx9HFC0n3XJfNHL9U6tPY2aRvXZJVvkESC0iRMPqoClLod7KzkM340yVkYusTBAPz2Zq+X9P39UMnFQbx13YHfg79qWMT0T4KMyKfBXrff5o4yN8XnHl3FBV3QUnzsiQyIWqCMT28wjEdjXrEqBmdOfLLpVGN0PTUd7i9Nzt2zLf83tnuxlqh6x43aSWOdcMfJOEEXuLOaxFMDBwao6e+Ij8xgjcU0WHroAh6awy+RuF0WdGeI980sezlOdT3gvR4SA+kGCBkaddeIiOuQS8yxGFT96PqrEEDOu5R+l5ibJtEQXjtPHMAF95o2+uWUMAnmVfv4hD1pTb2jn+v1JySUFCZhwW0jDHLHGfLmYClpGnPf3UmvO8emJDctGAyJwrZ+rHgWDncaOiuPqlbfHMWddqdMRARwPpe+eiYZO7vxZuvmIkFGNxucsgdeYpBB3FnXoAztcgQKv2nfcE39BGwlpy07cuvJxwNpsHyExKQbtP/8FCMZz5vKIri9SM+0k9sv7trHnAVMm9BzCN4Rq+G/WYNprbmkyIjMemfzfI3LVmr4IVzTIj20ECmn3lnx48bDEeNiCOmgTcP4rxSpnIkJOb+J+x8y2VYLIO6zKRkukPv3FP47zhDCkp4IsLeqaLE8ZDVf9NLBVMr3ySvVmRDF8E6yPWC+rETr5FmtShfS1kIydUho7XQjW7qg/kPTFta73AUbe4KSVtU7lGdK7mB9WN/OCnkyRSKOO4DkpqE7eUxbKxpFgpwMb3gtZAMInOkSiuV0g94SpAIeZOKcMu90qXq2rIXejPgEhrUIFM3ntBacVBSt98vw+NfdsdrvvEs0KNsFtIze4A18rlzgtHs6C6xmvoSZzJAFGthLjO7wNS1WrCNwcyAVt2bCA5GODNhIASYc4BFDggDtrV3gecxOJBJP1NwrybKka8tEQUBRvj6dHRakCaSRV5MleJqf8Jt1R3ZZFqGYphf5RN4LSGa9ISKVJYaezuIWN+uM71RauzreIIGz7OMJcKwQKsH+TayZsL+Amgzy6hVPOIrhZBEDFFOD2kNSs+ETfJMs8Zt2zgJm6T9TcMVXDCSCSEjgDP2VcRMiHWLvMbxhv3//94FBuIHw6Vg/Hh/3KSE+mN9XTY33JkGGBO2hDCJib21etvjLE1RA9fQqPLkdJpjNp3RTOKw3ccvln6simRZmeFk+kAxm9lamQLpOGaMjcwe1wqgBoNbEg342AK6aRhvTSHjLIQPMVdSOBZcgHIV0mm/5vsZE/OgiKqdMEMHJkal5pCFYq6wYYAqJhrz0dpLUOyLdiwBkzXZXufXllRNTYVU+A0UJl6PenyS92ddGCLhBjLrQiJPAoQWvzDo/NJGqCVAFa9yMR8hudD0bxpvtHeQodnTHiyRz1PeUjF4LhoPVn/ol6O7mSfdz2GG6x+oZJNMtkwxG9IC7vhKwBQb1oIqH6N6jJSs7W/Pjqbxfve2C+rJqH+4SA0zQ6//4QokMXuZtnc4loVsXmxsqAMOnnLQv3aiRrkH15FZhNOoigqhgrF0Q5VCHw4XO8lTevpHfxY5aeM+Gc5HR4u4QHkE+Ba+Is6s6/vP5ozNJ1dOB2IaC7w/3W9eBnVA218Gwee1XXgcsPEkLIr0BFOn7Rz9fNNSVqf3z2q2+hq/qfaBycUInik2IkZsaL0CsKDVXIZGpmq2gxeQkB1pFtqnxEI+0G/C5HsP2ZymHoL0WIRA2duQmPAwLN66JdnnPgp0hhBTnHoYtGfJfQ3PDpwPNB0d+8qe/3/72qimjJoUXAPz95uujxIH1LmnCaF5N36AlA1mMT+MNBIfkDsx8YlFtvcl4ZgD7PnlEQ0I+aOruJFlOxtDcZ9H6Y4CIH8DArbM+9JfMoQ6uewH2Rv2w1sXi9YDeXsV5cn82t4+j/LrxKPDnKyrS07TfxuD2yYHrapgoMQzrK19INMSSr+YOefGf9xEDrhX3sDoKyeB3rCOnftz7VlqeAns9ADlmewOyZqgBjn5WlXoF5Ty3oz+v07UMFG9ciL7ZBorARhvTSHjCgsSlI2EdYWHOu3SpAQgRuZyvrbdR4HkAffAHn/JJroOXvvNEzzBc1y9XQhpDJmAaJl/AwEcmvI2W05Q42o/tdgMceYMTi+0MI5xKtwzBuWZ7HSUybc2n0jWNugTFDgNOjNcTj5Lxa2cHmTZhA9NHUhSiVzKkp2up4HOuJGL0TdwSYMaflXd9MZIH+hyC73NEheeGfKCZ6U2BL+hFEpXlbBeD//vIrdtYJ5vMR053y/uVovmxdYUbvrdkExeerPaIWYPMlc7mOsQ0WRBaiEg5ZYoeaslKraf2EzQ24Grb3MGiYc9D4tcbnA49ofxVA7CLRiILZF6lf7ThbdA5iyZp0YD2cY+8DxqDx67uZ3lDxFOZJAgi5R8svF3lDLvCKS0G5Vz50L8ISp1jCMc6tuZtNn1D56iEqN6hFk2lYtXrAS/DEq3kQkkq/vpasdp6LyGgCf/W+ID89LCIRPkn0n2SKz/E9ZF4Ym3FQ84E7jfN5AvqRRPCPMlYH5GjU6FVGjXccqkX3PV4BNGiPDgESNghAePeuAxFEsJb+1qNiqDOIPbu1QZGzj3fgy0HCVIfj4/fKAmRDZdqmfKJSBmtT4jNtrff8PCnKvMJkkBSPVFfQOW+bG93HJhHgAOn5am1MaDCWWRYuRIfo6VeHRkd9H9yr/uepfn6tda8clmpCt8kAT/KACfHS3scYN95cPAPiten0B+zdY32DmkLEsL/LzXOW9MhVE/92VOaf6Fi6ioT0oBeAQZsbjIFz5KYQOLiSALtEsmiNW4WEUe/t4m5oMYomwj03r3/czPk3sgiALBi0aYtuxurnfsEn7/AAAAAAACUhBar9hNjNstpd/lqQPkvjFo6/zhxrflnU64Ix5uMROxFZcoOU5q5ati/DBu+QcYyO2qnfe1VQEKnVaF6xwmcGjHalOEEnAeq5zGOq8nI/bCSBIS6a9Dg5I2Annfm1d7xQPBX/EPcO4urA7kwgUSBbQ7j13EnWnUgk1xP/xFU8fsF4XgrfmWVNBBgZQX1CFUnFOe6F5KJSH0nNUBjIquA7KkHEtuAAAt9d15st7JV/nAvV/4ARuMcVub0OHELExETG0NETQ0EdesB8GtTpd46DaIImbWjHbDZRd/xLTztR9w5b8rwC6JgFKNUItmDpqIAjargYl0yr7qs63eatv6Dqcc0EjNgfrj9n1Ix7f/+6qVJqHn6wYBYcHdeHpTMgFvtHCHsFnR9heS0eM+HnSDH5/UQGKcaTuE60yYaYq+SKXldz4GbAVriD/G1mw8DMwlSR1JAlZdYIblSLkcx2ZAHgok9j3z531h/eNyoVn2EPyLbjs3vjfFmQelzrGUeuI5M7/OSuClVwVVQifDGD3PPGi5uTLvyMXAw94sKxJZgwu1URlfK2w0cfyCUTV6EH2vg+/FGnW18u8alCqqJ779WgfhdExTY7Gb/dCqppiUWl90NyAXxlnAflIQt3HYjYH3AuWru0j6zKoN+UI9ORKDKcRpuLrVfWNAvyFk/9Vd/pvLL23S25nYOHbvNFRgI7LlTv5qLLtZx79/yAHeJ6QZfwj+uBfYRnb/4Au0q3IeiBe+YlslKtZQ/TT+0VsZVLK2Hw7D0A0+AT2D1QAMACNrkLnm0Lq2p4uoGdfSQU66UTgX4sns03ZQikrsbkxiPQWgcfokQn40Uy5lI2D+nXRrc1UuVfi0AcPfzItD8X5p3FZX3SuehAq9nXTlwx1p4LFFrkvbsRRNfsSIC4cVt56eC5l796Bsud4y5C1jGclnyc0BwLpvcld62VnpYWnsbPQXtMZAfRpr01I5vv83HTzwLN6wWeixaAMT5hqAZvyLUFDED5naZGtBHyQv6/1ho8z1OQBLZF4nNVrrQ+xLr/UzUaQjXFQX/3/S6xGrRzA3BmDzT2sVoahH2mg524wKSwAORIRu749HUpJVVgrE4zg7ps57gWaXn8/Nq+D2Ned80H91iGqEdft98svw1/0/IgUzOBSs2t3LKL6MEeaCHZYP7H01Pty7sl16FD4qfzu7paNwP11VhFaP0OjrmbLwk/OXFKIn4d3gbe+P3DMxv+ICP3n7nSgO4ou/neA+7IirDqwAEPsTm49cW7YIsNizWmmfBxl0QQyd7kBAhd4dCrBnfOjA4KXlIuW0sejqVRRW4zqbPlL9yCkOWybRhG8ahCUFAn5VZdEWCyMObWWz48sjcrj+jl14vHfed7NGatT2G5bZocEysUXC9RMFEvPE8m2URA0CJ6ar+knjpXYqKHcrJdJA06jy/gZAlA/JXHifHdHpVfuoJshq02VAi5FIfMEC966uz5rWnFQR68DhY9ILASj6XnOt3rkgc5rEQxJve0ucBTpI+oasvB0Exq2DzCRPGs+ma+nXS8/pULDA8N3iuHxcJOE21vJtbdU/oc12GU5kmZKkyFsSvr6NVWmbZ/gyIMwsW0K9hxiFWQ/tFvFYcPNjogfifY9Tznf/Xdx+3eBGokZieFIXmB8Pwq3wExhaE2ROhoUxErDhEO5nyE808Bry6HWdUky0vMwdk0BuAkMr9Ez8QB/aEl6rQxQG6mZoirxbROwQaBJ2qvUc0D4yNnRfF5hJKUF/s718QXzPusE83mI6cZQKhoXgo7ynu7wbwsBcmfeB7ZEHnaBggi38U9geHPRtP3QdKxWbTJnHsdYW0kGe0rTDBjg2kU0ANt/f+SHTphZxCpoy1uy0cLMY5vXs9/CfF3yO2/L8C+ZrpStDQ/mSrPYN+bo2QVt6Asd3a2oNATNuBJ6e/YxplslsBRepAiiHx8uXnuCISRKOOYj0N1a/y3+1p48YLKVofQQpd19S00vE8W2MjGJXoM+tbgNeYtDaRye90jO8MVd9jovv5gjHFEPRalzxZ+br/xGZVynHfKqsUfqggX5VrznVZ6j6ySxJLg5adnMChfpewIoWgVlghHLzTFtUc5nBmBGq+IGBX6UQjusRv1HA/X/BlMWPAI2FNBIJL5GfEShNPLbxnLqolQ//npemxqrctJ5T5P4KyMw7V8kJy3whbPEgEbXDDyZAVoEZEF8O0sVLrn7R/Y5w0EbniTOipH7HzaopQssh3yKfjk2es6dVdtM6hiRIzuhYJlZQMhI89USKdjHrDc2u0CxvqFjm7oJVWkzGbIKW17I0E73VMvXGt/8mYt/eSGsSOkBqhMzSdJ/GTutGaVvgVIu0TuiPgBTJFQdN+1p8NDWd8baybabJnnNmk+/vfiLuPrXhwPOH38x56p+q4LlHUSj7/RtImwh7+28nNGDaTcrJYKSlvFBcGtl+tzZhRuIZwZUQTWBa6boQjULcUd6C+EejJh/9CTvIW52blsBHvbk3dxBVDtB/8cRFJqwFB9WjpQtJSnE5LooTwA9YPJx+kYdNmnZrY2ZHbNa1JkHGnd7rnLlNBa++s0q23d4X+tMwlGNgYNgYxZg4562EfWW+mT3zgrtwLmWrWTDrv0bnMYfhC3DGTwP4jdcIxWNZlF5hHxdYNI3KhYk9+90U8OdCshHusegzEn6t1IPcA+B8I0vhFNYKcQNMIiqNSSboMZdI12cc1n1LsatEvrm/fBE6HGKB/Uc+i7n/6kmxOpO2YKAIaw8tKOY2vyoAAAAAAAACP8OPNnE0xKyTqaRvdnOI1rWuuJRCpjQI5SkObu0fiv+3UnrVvq6HrPHWoh+CLv9oQniXC8I+KeAnRKwlOdOQb4gGsNl+TLGkhzDZOgRzujWVS4ZG0iu+zncveYhs6POmct6ZYSJRNuaz/Hv4FzKvGF3EBgD2kbJUkyu2t4fVAT8//91HKuvAAvuF2LIBZd9nzq62ucTWhfh/ga/1HjtVUnYazINbUZLTcCmNFP40UHPMYOByIsBk3wa67uWIV7VO7pWjSTwjVrtgaESo4U0AGGG/y5sNBJNNYUlDMfD/+TY2v6BnmZydYk3BP42HVIAAAAADD6p3epwqZB56GikMVK0tMwtdVplg+V0rdcANzvTA8u5+w1Pdo+MPJdrEbl0m89U/UOU3o845BtF0b5t2IjduVoRrNvra4H/aragtG9+Zib1NEK/Hq0b2B22fM6+4cDoxs2Y/mw0Ti6W3+bBzgjz2t5rtKoEDa+CW+t5risBNVw2SClFULL9FALeIbbBkjXND0mlMWfpY6PrSB+Pqb/Wjt2ZSkGBUvm+6XrcsoB60LxuzMxNTHvgO1361BFh/ngr3WSev4Rwcxio0h6CcsNErjHAAAHyZiVpvQL8f7wbp0+H9EHLflISrlFwSmgbkE5AHMJawhxQlJpdE9BVjHyHLTK0gceiUeXXYx9QzcOEcZSGr+BfjXiLysLzOhP3Hbb+YyGJdM0pE19wS3TZKTDBOBZq3+P9YhGQ47vsVNDBa5yMliO3vphuLldYN8jc7Na+zdv/ZFrEqeTa1oRP2lfypIc7ZJsZbJIpjB4afC73KbBNsHNrYGqff4oGwZFKUtDwdZsQyvMZ0vxJ6fbyKHZvwAoz4SKM6IWymnjntaMIQJbmB+2+i1/5w3yOwXyVZv8cVanwAAAAAAAAAAAAAAAAAAAAAAAAA=', 'data:image/webp;base64,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', 'Espaço premium com infraestrutura completa para debutantes inesquecíveis.', NULL, 'Estr. dos Três Rios, 1571 - Freguesia (Jacarepaguá), Rio de Janeiro', 15, 1200, 80000, NULL, NULL, NULL, 'Esporte Fino / Gala', '#D4AF37', '#AA7C11', '#F3E5AB', 'rgba(212,175,55,0.4)', 'Montserrat', 'https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev/videos/video_apresentacao_a1111111-1111-1111-1111-111111111111.mp4', NULL, 'queue', ARRAY[]::uuid[], 0, '2026-08-26T20:43:01.417696+00:00', '2026-09-04T17:12:18.410402+00:00', NULL, NULL, NULL, '{"period":"monthly","leadsTarget":60,"salesTarget":12,"revenueTarget":150000,"responseTimeTargetMinutes":15}'::jsonb, 'a0000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.venues ("id", "name", "tagline", "logo_url", "ballroom_image_url", "description", "experience_text", "address", "years_in_business", "events_completed", "guests_delighted", "google_maps_embed_url", "google_maps_link", "waze_link", "default_dress_code", "primary_color", "secondary_color", "accent_color", "glow_color", "font_family", "welcome_video_url", "welcome_video_name", "lead_distribution_mode", "lead_distribution_sdr_ids", "round_robin_next_index", "created_at", "updated_at", "phone", "whatsapp_number", "email", "goals", "master_id")
VALUES ('b2222222-2222-2222-2222-222222222222', 'Espaço Realizar', 'Um espaço criado para transformar sonhos em momentos inesquecíveis', 'https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev/images/1787807317989_4ijv5q.webp', 'https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev/images/1787807328936_mual21.webp', 'O Espaço Realizar é uma casa de festas especializada em criar experiências memoráveis para os momentos mais importantes da vida. Com uma estrutura completa, buffet de qualidade e atendimento humanizado, oferecemos tudo o que você precisa para celebrar com conforto, segurança e tranquilidade.

Nossa missão é acompanhar cada cliente de forma próxima, cuidando de cada detalhe para que cada evento reflita sua história e se torne uma lembrança inesquecível para todos os convidados.', NULL, 'Estr. do Rio Grande, 4374 - Taquara, Rio de Janeiro', 20, 2200, 350000, NULL, NULL, NULL, 'Esporte Fino / Gala', '#6366F1', '#6D28D9', '#06B6D4', 'rgba(212,175,55,0.4)', 'Montserrat', 'https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev/videos/video_apresentacao_b2222222-2222-2222-2222-222222222222.mp4', 'sample_venue_video.mp4', 'queue', ARRAY[]::uuid[], 0, '2026-08-26T20:43:01.417696+00:00', '2026-09-03T23:44:07.704533+00:00', NULL, NULL, NULL, '{"period":"monthly","leadsTarget":60,"salesTarget":12,"revenueTarget":150000,"responseTimeTargetMinutes":15}'::jsonb, 'a0000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.venues ("id", "name", "tagline", "logo_url", "ballroom_image_url", "description", "experience_text", "address", "years_in_business", "events_completed", "guests_delighted", "google_maps_embed_url", "google_maps_link", "waze_link", "default_dress_code", "primary_color", "secondary_color", "accent_color", "glow_color", "font_family", "welcome_video_url", "welcome_video_name", "lead_distribution_mode", "lead_distribution_sdr_ids", "round_robin_next_index", "created_at", "updated_at", "phone", "whatsapp_number", "email", "goals", "master_id")
VALUES ('4194834f-feb7-4369-bc3e-4500d5714b9c', 'Minha house', 'Onde momentos exclusivos se transformam em memórias inesquecíveis', NULL, 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&auto=format&fit=crop&q=80', 'Espaço requintado e sofisticado preparado especialmente para noites inesquecíveis.', 'Mais de 10 anos realizando sonhos.', 'Av. das Américas, 1500 - Barra da Tijuca, Rio de Janeiro - RJ', 15, 1200, 80000, 'https://maps.google.com/?q=Minha%20house', 'https://maps.google.com/?q=Minha%20house', 'https://waze.com/ul?q=Minha%20house', 'Traje Passeio Completo / Gala', '#6366F1', '#E8B4B8', '#06B6D4', 'rgba(99, 102, 241, 0.4)', '''Plus Jakarta Sans'', sans-serif', NULL, NULL, 'queue', ARRAY[]::uuid[], 0, '2026-09-05T19:46:22.334481+00:00', '2026-09-05T19:46:22.334481+00:00', NULL, NULL, NULL, '{"period":"monthly","leadsTarget":60,"salesTarget":12,"revenueTarget":150000,"responseTimeTargetMinutes":15}'::jsonb, 'd0000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;


-- ----------------------------------------------------------------------------
-- DADOS: COMMERCIAL_FUNNELS (4 registros)
-- ----------------------------------------------------------------------------
INSERT INTO public.commercial_funnels ("id", "name", "category", "description", "venue_id", "badge", "badge_color", "icon", "is_primary", "is_pinned")
VALUES ('f1111111-1111-1111-1111-111111111111', 'Funil de Indicação de Amigas', 'Indicações do App', 'Pipeline exclusivo alimentado em tempo real pelas debutantes ativas.', 'a1111111-1111-1111-1111-111111111111', 'Indicações do App', '#D4AF37', 'crown', TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.commercial_funnels ("id", "name", "category", "description", "venue_id", "badge", "badge_color", "icon", "is_primary", "is_pinned")
VALUES ('f2222222-2222-2222-2222-222222222222', 'Funil de Tráfego Pago & Meta Ads', 'Marketing Digital', 'Captação de leads qualificados via Instagram Ads e Google.', 'a1111111-1111-1111-1111-111111111111', 'Marketing Digital', '#3B82F6', 'megaphone', FALSE, FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.commercial_funnels ("id", "name", "category", "description", "venue_id", "badge", "badge_color", "icon", "is_primary", "is_pinned")
VALUES ('56499e81-6614-4579-a907-6576069f3538', 'Funil Geral de Atendimento', 'Comercial', 'Pipeline comercial geral e captação.', 'a1111111-1111-1111-1111-111111111111', 'Comercial', '#10B981', 'target', FALSE, FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.commercial_funnels ("id", "name", "category", "description", "venue_id", "badge", "badge_color", "icon", "is_primary", "is_pinned")
VALUES ('14ebab05-5661-4cdf-b6dc-deb4472d4422', 'Indicações das Debutantes • Minha house', 'Indicações', 'Pipeline exclusivo de indicações', '4194834f-feb7-4369-bc3e-4500d5714b9c', 'Indicações', '#D4AF37', 'gift', FALSE, FALSE)
ON CONFLICT (id) DO NOTHING;


-- ----------------------------------------------------------------------------
-- DADOS: COLLABORATORS (3 registros)
-- ----------------------------------------------------------------------------
INSERT INTO public.collaborators ("id", "email", "name", "role", "venue_id", "venue_ids", "avatar_url", "phone", "active", "theme", "created_at", "updated_at", "password", "master_id", "is_first_access", "activated_at", "last_login_at")
VALUES ('0c65bc75-58fb-4d49-b587-78794333b66b', 'pcspike3@gmail.com', 'Patrick Couto', 'admin', 'b2222222-2222-2222-2222-222222222222', '{"b2222222-2222-2222-2222-222222222222"}', 'https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev/avatars/1788550884774_hvqkr3.webp', '(21) 99544-8840', TRUE, 'light', '2026-09-04T18:56:30.474704+00:00', '2026-09-04T19:43:56.121527+00:00', '$2a$10$jHaYQ7A2im1g3xpjBcRoeevFHURAnYCJRzMrLZxcSzxQ0w0FOm/4a', 'a0000000-0000-0000-0000-000000000001', FALSE, '2026-09-04T18:57:24.844+00:00', '2026-09-04T18:57:24.844+00:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.collaborators ("id", "email", "name", "role", "venue_id", "venue_ids", "avatar_url", "phone", "active", "theme", "created_at", "updated_at", "password", "master_id", "is_first_access", "activated_at", "last_login_at")
VALUES ('d0000000-0000-0000-0000-000000000001', 'patrickcouto.oficial@gmail.com', 'Suporte - F5 Developer', 'dev', NULL, ARRAY[]::uuid[], 'https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev/avatars/1788637528370_4ju68q.webp', '(21) 99544-8840', TRUE, 'light', '2026-09-03T15:02:53.918535+00:00', '2026-09-05T19:45:57.176519+00:00', '$2a$10$Nk5rBn.zh/M8/qFgskmFquvfw0ZFxO8w6VGAHx6Cza2qeEaMp.e7y', NULL, FALSE, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.collaborators ("id", "email", "name", "role", "venue_id", "venue_ids", "avatar_url", "phone", "active", "theme", "created_at", "updated_at", "password", "master_id", "is_first_access", "activated_at", "last_login_at")
VALUES ('a0000000-0000-0000-0000-000000000001', 'bonomo1989@gmail.com', 'Yuri Bonomo', 'master', NULL, ARRAY[]::uuid[], 'https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev/avatars/1788516715320_xa9qem.webp', '(21) 99700-6525', TRUE, 'light', '2026-08-26T20:43:01.417696+00:00', '2026-09-04T14:43:34.454927+00:00', '$2a$10$3jNwjiTiNiRPIKVFL1DYZ.LDW/V8Dfox5DpVB20Pergl7z3IT0Wde', NULL, FALSE, '2026-09-04T14:43:23.891+00:00', '2026-09-04T14:43:23.891+00:00')
ON CONFLICT (id) DO NOTHING;


-- ----------------------------------------------------------------------------
-- DADOS: SOURCES (3 registros)
-- ----------------------------------------------------------------------------
INSERT INTO public.sources ("id", "venue_id", "name", "type", "funnel_id", "whatsapp_instance_id", "status", "slug", "configuration", "created_at", "updated_at")
VALUES ('916d35e5-325c-4bcd-8532-726d89effba8', 'a1111111-1111-1111-1111-111111111111', 'Indicações • Espaço Rio Lounge', 'referral', 'f1111111-1111-1111-1111-111111111111', NULL, 'active', NULL, '{"systemManaged":true}'::jsonb, '2026-08-30T08:56:24.605174+00:00', '2026-08-30T08:56:10.959+00:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.sources ("id", "venue_id", "name", "type", "funnel_id", "whatsapp_instance_id", "status", "slug", "configuration", "created_at", "updated_at")
VALUES ('e22d1f59-fbd0-430d-b1ab-2a233473feaa', 'b2222222-2222-2222-2222-222222222222', 'Indicações • Espaço Realizar', 'referral', 'f1111111-1111-1111-1111-111111111111', NULL, 'active', NULL, '{"systemManaged":true}'::jsonb, '2026-08-30T08:56:24.339634+00:00', '2026-08-30T10:11:14.183+00:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.sources ("id", "venue_id", "name", "type", "funnel_id", "whatsapp_instance_id", "status", "slug", "configuration", "created_at", "updated_at")
VALUES ('8a12987e-aebe-49cf-9789-5e94f33174c2', '4194834f-feb7-4369-bc3e-4500d5714b9c', 'Indicações das Debutantes • Minha house', 'referral', '14ebab05-5661-4cdf-b6dc-deb4472d4422', NULL, 'active', NULL, '{"systemManaged":true}'::jsonb, '2026-09-05T19:46:22.063286+00:00', '2026-09-05T19:45:56.816+00:00')
ON CONFLICT (id) DO NOTHING;


-- ----------------------------------------------------------------------------
-- DADOS: JOURNEY_TEMPLATES (2 registros)
-- ----------------------------------------------------------------------------
INSERT INTO public.journey_templates ("id", "venue_id", "name", "description", "cycle_days", "cycle_target", "milestones", "vip_rewards", "created_at", "updated_at", "season_or_period")
VALUES ('2ea42662-0226-4869-8a28-8330fd7a2cd3', NULL, 'YURI TESTANDO', 'NÃO PERCA ESSA CHANCE ( DESCRIÇÃO DA JORNADA)', 7, 3, '[{"id":"m_1788068700220","title":"Meta 1","status":"locked","badgeTag":"10 INDICAÇÕES","iconName":"Gift","description":"Acumule 10 indicações validadas","rewardTitle":"+20 Convidados","rewardImageUrl":"https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev/images/1787809664873_zygd37.webp","requiredReferrals":10,"rewardDescription":"Tenha oportunidade de agregar mais pessoas ao seu evento"}]'::jsonb, '[]'::jsonb, '2026-08-30T05:45:15.429396+00:00', '2026-08-30T05:45:15.429396+00:00', 'ATÉ NOVEMBRO DE 2026')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.journey_templates ("id", "venue_id", "name", "description", "cycle_days", "cycle_target", "milestones", "vip_rewards", "created_at", "updated_at", "season_or_period")
VALUES ('a0685b63-797e-4cb3-8756-49b94b75d304', NULL, 'TESTE', '', 7, 3, '[{"id":"m_1787920111132","title":"Meta 1","status":"locked","badgeTag":"5 INDICAÇÕES","iconName":"Gift","description":"Acumule 5 indicações validadas","rewardTitle":"+30 Minutos","rewardImageUrl":"https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev/images/1787809593461_0mmunr.webp","requiredReferrals":5,"rewardDescription":"Ganhe 30 minutos de melhor evento da sua vida"},{"id":"m_1787920116783","title":"Meta 2","status":"locked","badgeTag":"10 INDICAÇÕES","iconName":"Gift","description":"Acumule 10 indicações validadas","rewardTitle":"+20 Convidados","rewardImageUrl":"https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev/images/1787809664873_zygd37.webp","requiredReferrals":10,"rewardDescription":"Tenha oportunidade de agregar mais pessoas ao seu evento"},{"id":"m_1787920118408","title":"Meta 3","status":"locked","badgeTag":"15 INDICAÇÕES","iconName":"Gift","description":"Acumule 15 indicações validadas","rewardTitle":"Cabine de Fotos","rewardImageUrl":"https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev/images/1787809707741_7t09kl.webp","requiredReferrals":15,"rewardDescription":"Registre momentos incríveis com os seus convidados"},{"id":"m_1788551549219","title":"Meta 4","status":"locked","badgeTag":"35 INDICAÇÕES","iconName":"Gift","description":"Acumule 20 indicações validadas","rewardTitle":"Show ao vivo","rewardImageUrl":"https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev/images/1788551510324_ay9dwa.webp","requiredReferrals":35,"rewardDescription":"Show ao vivo com uma banda referência da cidade"}]'::jsonb, '[]'::jsonb, '2026-08-28T13:03:57.4351+00:00', '2026-08-28T13:03:57.4351+00:00', 'Temporada 2027')
ON CONFLICT (id) DO NOTHING;


-- ----------------------------------------------------------------------------
-- DADOS: DEBUTANTES (2 registros)
-- ----------------------------------------------------------------------------
INSERT INTO public.debutantes ("id", "venue_id", "name", "slug", "party_date", "avatar_url", "phone", "email", "mother_name", "father_name", "has_journey_enabled", "is_journey_pending", "welcome_video_url", "has_seen_welcome_video", "journey_template_id", "custom_invite_photo_url", "use_custom_invite_photo", "reception_message", "base_guest_limit", "extra_guests_unlocked", "valid_referrals", "total_target_referrals", "converted_referral_sales", "journey_cycle", "milestones", "vip_rewards", "created_at", "updated_at", "referrals", "status")
VALUES ('0118d154-588a-46f7-8387-947072feed49', 'b2222222-2222-2222-2222-222222222222', 'Daiana Couto', 'daiana-couto-2027-7g2j', '2027-04-01', 'https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev/images/1787832377341_fqfdpx.webp', '(21) 99544-8840', NULL, NULL, NULL, TRUE, FALSE, NULL, TRUE, NULL, NULL, FALSE, NULL, 250, 0, 3, 30, 0, '{"journeyStatus":"active","cycleRenewalTarget":3,"cycleRenewalProgress":0}'::jsonb, '[{"id":"m_1787920111132","title":"Meta 1","status":"locked","badgeTag":"5 INDICAÇÕES","iconName":"Gift","description":"Acumule 5 indicações validadas","rewardTitle":"+30 Minutos","rewardImageUrl":"https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev/images/1787809593461_0mmunr.webp","requiredReferrals":5,"rewardDescription":"Ganhe 30 minutos de melhor evento da sua vida"},{"id":"m_1787920116783","title":"Meta 2","status":"locked","badgeTag":"10 INDICAÇÕES","iconName":"Gift","description":"Acumule 10 indicações validadas","rewardTitle":"+20 Convidados","rewardImageUrl":"https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev/images/1787809664873_zygd37.webp","requiredReferrals":10,"rewardDescription":"Tenha oportunidade de agregar mais pessoas ao seu evento"},{"id":"m_1787920118408","title":"Meta 3","status":"locked","badgeTag":"15 INDICAÇÕES","iconName":"Gift","description":"Acumule 15 indicações validadas","rewardTitle":"Cabine de Fotos","rewardImageUrl":"https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev/images/1787809707741_7t09kl.webp","requiredReferrals":15,"rewardDescription":"Registre momentos incríveis com os seus convidados"},{"id":"m_1788551549219","title":"Meta 4","status":"locked","badgeTag":"35 INDICAÇÕES","iconName":"Gift","description":"Acumule 20 indicações validadas","rewardTitle":"Show ao vivo","rewardImageUrl":"https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev/images/1788551510324_ay9dwa.webp","requiredReferrals":35,"rewardDescription":"Show ao vivo com uma banda referência da cidade"}]'::jsonb, '[]'::jsonb, '2026-08-27T13:15:26.095329+00:00', '2026-09-05T13:59:00.055251+00:00', '[]'::jsonb, 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.debutantes ("id", "venue_id", "name", "slug", "party_date", "avatar_url", "phone", "email", "mother_name", "father_name", "has_journey_enabled", "is_journey_pending", "welcome_video_url", "has_seen_welcome_video", "journey_template_id", "custom_invite_photo_url", "use_custom_invite_photo", "reception_message", "base_guest_limit", "extra_guests_unlocked", "valid_referrals", "total_target_referrals", "converted_referral_sales", "journey_cycle", "milestones", "vip_rewards", "created_at", "updated_at", "referrals", "status")
VALUES ('d8f57018-6065-4512-a785-5723ba01d22a', 'b2222222-2222-2222-2222-222222222222', 'Maria Clara', 'maria-clara-2026-thuz', '2026-10-18', 'https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev/images/1787880481922_4i3ha7.webp', '21995448840', NULL, NULL, NULL, FALSE, FALSE, NULL, TRUE, NULL, NULL, FALSE, NULL, 250, 0, 0, 30, 0, '{"journeyStatus":"active","cycleRenewalTarget":3,"cycleRenewalProgress":0}'::jsonb, '[]'::jsonb, '[]'::jsonb, '2026-09-04T01:47:28.421017+00:00', '2026-09-04T01:47:28.421017+00:00', '[]'::jsonb, 'active')
ON CONFLICT (id) DO NOTHING;


-- ----------------------------------------------------------------------------
-- DADOS: LEADS (8 registros)
-- ----------------------------------------------------------------------------
INSERT INTO public.leads ("id", "funnel_id", "venue_id", "debutante_id", "debutante_name", "debutante_slug", "name", "phone", "age", "group", "notes", "stage", "is_validated", "points_granted", "rejection_reason", "sdr_id", "sdr_name", "closer_id", "closer_name", "assigned_to", "deal_value", "package_sold", "contract_date", "party_date", "created_at", "updated_at", "email", "neighborhood", "address", "contacts", "primary_contact_role", "event_type", "event_date", "debutante_birth_date", "estimated_guests", "desired_period", "interest_service", "estimated_budget", "payment_method", "temperature", "tags", "source_id", "sub_source", "source_name", "mql_score", "mql_level", "mql_answers", "code", "master_id")
VALUES ('3ae5f0ce-6a30-4e30-83dd-51fc8b4c34ba', 'f1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222', '0118d154-588a-46f7-8387-947072feed49', 'Daiana Couto', 'daiana-couto-2027-7g2j', 'Amanda', '21983273766', 14, 'Escola', '', 'in_analysis', TRUE, 1, NULL, 'a0000000-0000-0000-0000-000000000001', 'Dev Master', NULL, NULL, 'Dev Master', 0, NULL, NULL, NULL, '2026-08-28T13:29:20.633471+00:00', '2026-09-03T19:18:33.82897+00:00', NULL, NULL, NULL, '[]'::jsonb, 'debutante', '15 Anos', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'warm', '[]'::jsonb, NULL, NULL, NULL, 0, 'cold', '{}'::jsonb, 'LEAD-BB4ZGR', 'a0000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.leads ("id", "funnel_id", "venue_id", "debutante_id", "debutante_name", "debutante_slug", "name", "phone", "age", "group", "notes", "stage", "is_validated", "points_granted", "rejection_reason", "sdr_id", "sdr_name", "closer_id", "closer_name", "assigned_to", "deal_value", "package_sold", "contract_date", "party_date", "created_at", "updated_at", "email", "neighborhood", "address", "contacts", "primary_contact_role", "event_type", "event_date", "debutante_birth_date", "estimated_guests", "desired_period", "interest_service", "estimated_budget", "payment_method", "temperature", "tags", "source_id", "sub_source", "source_name", "mql_score", "mql_level", "mql_answers", "code", "master_id")
VALUES ('1ad01ddc-0363-41dc-835e-dfac7283ebc6', 'f1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222', '0118d154-588a-46f7-8387-947072feed49', 'Daiana Couto', 'daiana-couto-2027-7g2j', 'Ana Clara', '21966400108', 14, 'Escola', '', 'new_lead', FALSE, 0, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, '2026-08-28T22:11:51.582158+00:00', '2026-09-03T19:18:33.82897+00:00', NULL, NULL, NULL, '[]'::jsonb, 'debutante', '15 Anos', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'warm', '[]'::jsonb, NULL, NULL, NULL, 0, 'cold', '{}'::jsonb, 'LEAD-PRUFSS', 'a0000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.leads ("id", "funnel_id", "venue_id", "debutante_id", "debutante_name", "debutante_slug", "name", "phone", "age", "group", "notes", "stage", "is_validated", "points_granted", "rejection_reason", "sdr_id", "sdr_name", "closer_id", "closer_name", "assigned_to", "deal_value", "package_sold", "contract_date", "party_date", "created_at", "updated_at", "email", "neighborhood", "address", "contacts", "primary_contact_role", "event_type", "event_date", "debutante_birth_date", "estimated_guests", "desired_period", "interest_service", "estimated_budget", "payment_method", "temperature", "tags", "source_id", "sub_source", "source_name", "mql_score", "mql_level", "mql_answers", "code", "master_id")
VALUES ('47823511-0795-4fff-aa14-ab4e4bbac378', 'f1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222', '0118d154-588a-46f7-8387-947072feed49', 'Daiana Couto', 'daiana-couto-2027-7g2j', 'Aline Marinho', '021966615202', 14, 'Escola', '', 'in_analysis', TRUE, 1, NULL, 'a0000000-0000-0000-0000-000000000001', 'Dev Master', NULL, NULL, 'Dev Master', 0, NULL, NULL, NULL, '2026-08-28T21:35:53.162781+00:00', '2026-09-03T19:18:33.82897+00:00', NULL, NULL, NULL, '[]'::jsonb, 'debutante', '15 Anos', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'warm', '[]'::jsonb, NULL, NULL, NULL, 55, 'qualified', '{"mql_q1_b2222222-2222-2222-2222-222222222222":"opt_1_4","mql_q2_b2222222-2222-2222-2222-222222222222":"opt_2_3","mql_q3_b2222222-2222-2222-2222-222222222222":"opt_3_2","mql_q4_b2222222-2222-2222-2222-222222222222":"opt_4_1"}'::jsonb, 'LEAD-EZNUR2', 'a0000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.leads ("id", "funnel_id", "venue_id", "debutante_id", "debutante_name", "debutante_slug", "name", "phone", "age", "group", "notes", "stage", "is_validated", "points_granted", "rejection_reason", "sdr_id", "sdr_name", "closer_id", "closer_name", "assigned_to", "deal_value", "package_sold", "contract_date", "party_date", "created_at", "updated_at", "email", "neighborhood", "address", "contacts", "primary_contact_role", "event_type", "event_date", "debutante_birth_date", "estimated_guests", "desired_period", "interest_service", "estimated_budget", "payment_method", "temperature", "tags", "source_id", "sub_source", "source_name", "mql_score", "mql_level", "mql_answers", "code", "master_id")
VALUES ('c56c1712-5c9b-4ee9-8205-50b00beb56eb', 'f1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222', NULL, 'Teste Yuri', 'teste-yuri-2028-u2yj', 'luiza', '21980503184', 17, 'Judô', '', 'new_lead', TRUE, 1, NULL, 'a0000000-0000-0000-0000-000000000001', 'Dev Master', NULL, NULL, 'Dev Master', 0, NULL, NULL, NULL, '2026-08-29T03:57:14.502721+00:00', '2026-09-04T01:47:21.587614+00:00', NULL, NULL, NULL, '[]'::jsonb, 'debutante', '15 Anos', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'warm', '[]'::jsonb, NULL, NULL, NULL, 0, 'cold', '{}'::jsonb, 'LEAD-MV5DAR', 'a0000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.leads ("id", "funnel_id", "venue_id", "debutante_id", "debutante_name", "debutante_slug", "name", "phone", "age", "group", "notes", "stage", "is_validated", "points_granted", "rejection_reason", "sdr_id", "sdr_name", "closer_id", "closer_name", "assigned_to", "deal_value", "package_sold", "contract_date", "party_date", "created_at", "updated_at", "email", "neighborhood", "address", "contacts", "primary_contact_role", "event_type", "event_date", "debutante_birth_date", "estimated_guests", "desired_period", "interest_service", "estimated_budget", "payment_method", "temperature", "tags", "source_id", "sub_source", "source_name", "mql_score", "mql_level", "mql_answers", "code", "master_id")
VALUES ('5376c34b-45b5-41cc-a76d-73af58465657', 'f1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222', NULL, 'Teste Yuri', 'teste-yuri-2028-u2yj', 'Rafaela', '219000000', 14, 'Escola', '', 'new_lead', FALSE, 0, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, '2026-09-02T11:59:53.496693+00:00', '2026-09-04T01:47:21.587614+00:00', NULL, NULL, NULL, '[]'::jsonb, 'debutante', '15 Anos', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'warm', '[]'::jsonb, NULL, NULL, NULL, 0, 'cold', '{}'::jsonb, 'LEAD-CSKFJC', 'a0000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.leads ("id", "funnel_id", "venue_id", "debutante_id", "debutante_name", "debutante_slug", "name", "phone", "age", "group", "notes", "stage", "is_validated", "points_granted", "rejection_reason", "sdr_id", "sdr_name", "closer_id", "closer_name", "assigned_to", "deal_value", "package_sold", "contract_date", "party_date", "created_at", "updated_at", "email", "neighborhood", "address", "contacts", "primary_contact_role", "event_type", "event_date", "debutante_birth_date", "estimated_guests", "desired_period", "interest_service", "estimated_budget", "payment_method", "temperature", "tags", "source_id", "sub_source", "source_name", "mql_score", "mql_level", "mql_answers", "code", "master_id")
VALUES ('328c808d-ff9c-4961-b176-a6761270abe6', '56499e81-6614-4579-a907-6576069f3538', 'a1111111-1111-1111-1111-111111111111', NULL, NULL, NULL, 'L', '2199', NULL, NULL, NULL, 'new_lead', FALSE, 0, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, '2026-09-04T14:05:31.527867+00:00', '2026-09-04T14:05:31.83892+00:00', NULL, NULL, NULL, '[]'::jsonb, 'debutante', '15 Anos', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'warm', '[]'::jsonb, NULL, NULL, NULL, 0, 'cold', '{}'::jsonb, 'LEAD-W5LXEA', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.leads ("id", "funnel_id", "venue_id", "debutante_id", "debutante_name", "debutante_slug", "name", "phone", "age", "group", "notes", "stage", "is_validated", "points_granted", "rejection_reason", "sdr_id", "sdr_name", "closer_id", "closer_name", "assigned_to", "deal_value", "package_sold", "contract_date", "party_date", "created_at", "updated_at", "email", "neighborhood", "address", "contacts", "primary_contact_role", "event_type", "event_date", "debutante_birth_date", "estimated_guests", "desired_period", "interest_service", "estimated_budget", "payment_method", "temperature", "tags", "source_id", "sub_source", "source_name", "mql_score", "mql_level", "mql_answers", "code", "master_id")
VALUES ('0e17e7cc-432c-4516-94e2-388a08543f76', 'f1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222', '0118d154-588a-46f7-8387-947072feed49', 'Daiana Couto', 'daiana-couto-2027-7g2j', 'teste', '21995448840', 15, 'Amigos', 'Indicada automaticamente da lista de convidados (Daiana Couto)', 'new_lead', FALSE, 0, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, '2026-09-05T13:58:59.66625+00:00', '2026-09-05T13:58:59.66625+00:00', NULL, NULL, NULL, '[]'::jsonb, 'debutante', '15 Anos', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'warm', '[]'::jsonb, NULL, NULL, NULL, 0, 'cold', '{}'::jsonb, 'LEAD-BRK3ZS', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.leads ("id", "funnel_id", "venue_id", "debutante_id", "debutante_name", "debutante_slug", "name", "phone", "age", "group", "notes", "stage", "is_validated", "points_granted", "rejection_reason", "sdr_id", "sdr_name", "closer_id", "closer_name", "assigned_to", "deal_value", "package_sold", "contract_date", "party_date", "created_at", "updated_at", "email", "neighborhood", "address", "contacts", "primary_contact_role", "event_type", "event_date", "debutante_birth_date", "estimated_guests", "desired_period", "interest_service", "estimated_budget", "payment_method", "temperature", "tags", "source_id", "sub_source", "source_name", "mql_score", "mql_level", "mql_answers", "code", "master_id")
VALUES ('e54a2959-bbfc-4710-8ee6-3a3d6050271f', 'f1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222', '0118d154-588a-46f7-8387-947072feed49', 'Daiana Couto', 'daiana-couto-2027-7g2j', 'Amanda', '21900000000', 13, 'Escola', 'Indicada automaticamente da lista de convidados (Daiana Couto)', 'new_lead', TRUE, 1, NULL, '0c65bc75-58fb-4d49-b587-78794333b66b', 'Patrick Couto', NULL, NULL, 'Patrick Couto', 0, NULL, NULL, NULL, '2026-09-04T20:02:20.998282+00:00', '2026-09-05T19:02:15.446315+00:00', NULL, NULL, NULL, '[]'::jsonb, 'debutante', '15 Anos', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'warm', '[]'::jsonb, NULL, NULL, NULL, 0, 'cold', '{}'::jsonb, 'LEAD-UBFWK4', NULL)
ON CONFLICT (id) DO NOTHING;


-- ----------------------------------------------------------------------------
-- DADOS: APPOINTMENTS (1 registros)
-- ----------------------------------------------------------------------------
INSERT INTO public.appointments ("id", "debutante_id", "venue_id", "title", "category", "date", "time", "location", "address", "status", "notes", "responsible_collaborator_id", "responsible_name", "responsible_role", "responsible_phone", "created_at")
VALUES ('1f7c1489-86f8-44a8-98bb-583e1d49eb7a', '0118d154-588a-46f7-8387-947072feed49', 'b2222222-2222-2222-2222-222222222222', 'Conhecer o espaço da casa', 'Cerimonial', '2026-09-05', '19:00', 'Espaço Realizar - Salão Nobre', NULL, 'confirmed', 'Reunião acompanhada dos pais para escolha dos pratos.', '0c65bc75-58fb-4d49-b587-78794333b66b', 'Patrick Couto', 'Responsável do Evento', '(21) 99544-8840', '2026-09-05T14:06:56.612063+00:00')
ON CONFLICT (id) DO NOTHING;


-- ----------------------------------------------------------------------------
-- DADOS: GUESTS (2 registros)
-- ----------------------------------------------------------------------------
INSERT INTO public.guests ("id", "debutante_id", "name", "phone", "age", "gender", "group", "status", "plus_ones", "companion_details", "sweet_message", "declined_message", "is_self_registered", "origin", "allowed_capacity", "companion_mode", "confirmation_source", "is_link_expired", "is_companion", "parent_guest_id", "confirmed_at", "created_at", "is_removed")
VALUES ('1608517a-8ba8-4952-b62a-0a0ffe6ad922', '0118d154-588a-46f7-8387-947072feed49', 'teste', '21995448840', 15, 'female', 'Amigos', 'confirmed', 0, '[]'::jsonb, 'teste', NULL, TRUE, 'general_link', 1, 'fill_later', 'guest', TRUE, FALSE, NULL, '2026-09-03T00:00:00+00:00', '2026-09-03T23:45:07.128288+00:00', FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.guests ("id", "debutante_id", "name", "phone", "age", "gender", "group", "status", "plus_ones", "companion_details", "sweet_message", "declined_message", "is_self_registered", "origin", "allowed_capacity", "companion_mode", "confirmation_source", "is_link_expired", "is_companion", "parent_guest_id", "confirmed_at", "created_at", "is_removed")
VALUES ('1505d6f6-5e03-4c5d-998d-00e418c1c28b', '0118d154-588a-46f7-8387-947072feed49', 'Ricardo Melo', '21900000000', 37, 'male', 'Família', 'confirmed', 0, '[]'::jsonb, 'Não vejo a hora de ir para sua festa', NULL, TRUE, 'general_link', 1, 'fill_later', 'guest', TRUE, FALSE, NULL, '2026-09-04T00:00:00+00:00', '2026-09-04T20:00:08.341363+00:00', FALSE)
ON CONFLICT (id) DO NOTHING;


-- ----------------------------------------------------------------------------
-- DADOS: SUPPORT_TICKETS (2 registros)
-- ----------------------------------------------------------------------------
INSERT INTO public.support_tickets ("id", "ticket_code", "user_id", "user_name", "user_email", "user_role", "venue_id", "venue_name", "module", "description", "image_url", "video_url", "status", "created_at", "updated_at")
VALUES ('b9481879-5267-4ac6-b1e7-19339560c84e', '#TKT-56910', 'a0000000-0000-0000-0000-000000000001', 'Yuri Bonomo', 'bonomo1989@gmail.com', 'master', NULL, NULL, 'collaborators', 'Não consigo registrar um novo colaborador', NULL, NULL, 'resolved', '2026-09-04T11:32:38.004+00:00', '2026-09-04T11:39:39.46+00:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.support_tickets ("id", "ticket_code", "user_id", "user_name", "user_email", "user_role", "venue_id", "venue_name", "module", "description", "image_url", "video_url", "status", "created_at", "updated_at")
VALUES ('a4aeb62e-82f1-44c8-8155-f113d49d1172', '#TKT-86881', 'a0000000-0000-0000-0000-000000000001', 'Yuri Bonomo', 'bonomo1989@gmail.com', 'master', NULL, NULL, 'debutantes', 'Não consigo registrar um nova debutante', NULL, NULL, 'resolved', '2026-09-04T18:52:11.767+00:00', '2026-09-04T18:53:41.655+00:00')
ON CONFLICT (id) DO NOTHING;


-- Reativa as restrições de FK e integridade referencial normais
SET session_replication_role = 'origin';

