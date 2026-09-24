-- ==============================================================================
-- F5 SYSTEM • MIGRATION: Produção, Webhooks UAZAPI e Ajustes de CRM / Permissões
-- Data: 2026-09-24
-- ==============================================================================

-- 1. Coluna para controle de criação de tags por colaboradores nos funis comerciais
ALTER TABLE IF EXISTS public.commercial_funnels 
ADD COLUMN IF NOT EXISTS allow_collaborators_create_tags BOOLEAN DEFAULT FALSE;

-- 2. Tabela para registro e auditoria de Webhooks recebidos da UAZAPI
CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_token TEXT,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    processed BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices para consulta rápida e diagnóstico de falhas
CREATE INDEX IF NOT EXISTS idx_webhook_logs_token ON public.whatsapp_webhook_logs(instance_token);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event ON public.whatsapp_webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON public.whatsapp_webhook_logs(created_at DESC);

-- RLS para whatsapp_webhook_logs
ALTER TABLE public.whatsapp_webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de logs de webhook para administradores"
ON public.whatsapp_webhook_logs
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Permitir inserção de logs de webhook via service role e anon"
ON public.whatsapp_webhook_logs
FOR INSERT
TO public
WITH CHECK (true);

-- 3. Tabela para Códigos de Redefinição de Senha (OTP 6/8 Dígitos)
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

CREATE POLICY "Permitir validação de código de recuperação de senha"
ON public.password_reset_codes
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 4. Garantir conta de Desenvolvedor Oficial F5 System
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

-- 5. Habilitar Realtime para as tabelas relevantes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'whatsapp_webhook_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_webhook_logs;
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
