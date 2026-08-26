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
CREATE POLICY IF NOT EXISTS "Public Read Access" 
ON storage.objects FOR SELECT 
USING (bucket_id IN ('venues', 'debutantes', 'funnels', 'invites', 'benefits'));

CREATE POLICY IF NOT EXISTS "Authenticated Upload Access" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id IN ('venues', 'debutantes', 'funnels', 'invites', 'benefits'));

-- ============================================================================
-- SEED INICIAL (CASAS DE FESTAS, FUNIS PADRÃO & CONTA DEMO)
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

-- Inserir Colaborador Master Inicial
INSERT INTO public.collaborators (
    id, email, name, role, venue_id, venue_ids, active
) VALUES (
    'c1111111-1111-1111-1111-111111111111',
    'admin@bonomofestas.com.br',
    'Gestor Master Bonomo',
    'master',
    'a1111111-1111-1111-1111-111111111111',
    ARRAY['a1111111-1111-1111-1111-111111111111'::uuid, 'b2222222-2222-2222-2222-222222222222'::uuid],
    true
) ON CONFLICT (id) DO NOTHING;
