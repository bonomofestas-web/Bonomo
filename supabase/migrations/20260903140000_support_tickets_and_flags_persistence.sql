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
