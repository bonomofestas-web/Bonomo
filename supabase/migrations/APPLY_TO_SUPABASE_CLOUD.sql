-- ==============================================================================
-- F5 SYSTEM • SCRIPT CONSOLIDADO PARA O SUPABASE CLOUD
-- Projeto: isclgcnxzkzdztrwfxng.supabase.co
-- Instruções: Copie todo este script e cole no SQL Editor do Supabase Dashboard
-- ==============================================================================

-- 1. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. AJUSTES NA TABELA DE COLABORADORES
ALTER TABLE IF EXISTS public.collaborators 
ADD COLUMN IF NOT EXISTS is_dev BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS password TEXT,
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS venues JSONB DEFAULT '[]'::jsonb;

-- Atualizar conta de desenvolvedor oficial
UPDATE public.collaborators 
SET role = 'dev', is_dev = true, active = true
WHERE email = 'patrickcouto.oficial@gmail.com';

INSERT INTO public.collaborators (
    id,
    name,
    email,
    role,
    is_dev,
    active,
    created_at,
    updated_at
) VALUES (
    'd0000000-0000-0000-0000-000000000002',
    'Patrick Couto (F5 Dev)',
    'patrickcouto.oficial@gmail.com',
    'dev',
    true,
    true,
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
)
ON CONFLICT (email) DO UPDATE SET
    role = 'dev',
    is_dev = true,
    active = true,
    updated_at = timezone('utc'::text, now());

-- 3. AJUSTES NA TABELA DE FUNIS COMERCIAIS
ALTER TABLE IF EXISTS public.commercial_funnels 
ADD COLUMN IF NOT EXISTS allow_collaborators_create_tags BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_post_sale BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS predefined_tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS stages JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS duplicate_rule_config JSONB DEFAULT '{}'::jsonb;

-- 4. AJUSTES NA TABELA DE LEADS
ALTER TABLE IF EXISTS public.leads
ADD COLUMN IF NOT EXISTS is_client BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS post_sale_step TEXT,
ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deal_value NUMERIC,
ADD COLUMN IF NOT EXISTS down_payment NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS installments INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS installment_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_message_direction TEXT,
ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS sub_source TEXT;

-- 5. AJUSTES NA TABELA DE ATIVIDADES DE LEADS
ALTER TABLE IF EXISTS public.lead_activities
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent',
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 6. TABELA DE INSTÂNCIAS DO WHATSAPP (UAZAPI)
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id TEXT,
    name TEXT NOT NULL,
    instance_name TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    phone TEXT,
    profile_pic_url TEXT,
    status TEXT NOT NULL DEFAULT 'disconnected',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_token ON public.whatsapp_instances(token);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_venue_id ON public.whatsapp_instances(venue_id);

ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público ou autenticado a whatsapp_instances"
ON public.whatsapp_instances FOR ALL TO public USING (true) WITH CHECK (true);

-- 7. TABELA DE LOGS DE WEBHOOK (UAZAPI)
CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_token TEXT,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    processed BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_token ON public.whatsapp_webhook_logs(instance_token);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event ON public.whatsapp_webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON public.whatsapp_webhook_logs(created_at DESC);

ALTER TABLE public.whatsapp_webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público ou autenticado a whatsapp_webhook_logs"
ON public.whatsapp_webhook_logs FOR ALL TO public USING (true) WITH CHECK (true);

-- 8. TABELA DE CÓDIGOS DE REDEFINIÇÃO DE SENHA (OTP)
CREATE TABLE IF NOT EXISTS public.password_reset_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_reset_codes_email_code ON public.password_reset_codes(email, code);

ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso a password_reset_codes"
ON public.password_reset_codes FOR ALL TO public USING (true) WITH CHECK (true);

-- 9. TABELA DE CLIENTES PÓS-VENDA (Compatibilidade com clients_post_sale / clients)
CREATE TABLE IF NOT EXISTS public.clients_post_sale (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    venue_id TEXT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    party_date DATE,
    package_name TEXT,
    total_value NUMERIC DEFAULT 0,
    paid_value NUMERIC DEFAULT 0,
    contract_signed BOOLEAN DEFAULT FALSE,
    step TEXT DEFAULT 'onboarding',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.clients_post_sale ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso a clients_post_sale"
ON public.clients_post_sale FOR ALL TO public USING (true) WITH CHECK (true);

-- 10. HABILITAR REALTIME COMPLETO
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.collaborators;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_activities;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.commercial_funnels;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_tasks;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_instances;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_webhook_logs;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 11. CONFIRMAÇÃO DE SUCESSO
SELECT 'MIGRAÇÃO F5 SYSTEM APLICADA COM SUCESSO NO SUPABASE CLOUD!' AS status;
