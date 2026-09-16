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
