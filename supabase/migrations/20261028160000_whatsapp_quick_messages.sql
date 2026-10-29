-- Migration: 20261028160000_whatsapp_quick_messages.sql
-- Description: Cria a tabela de Mensagens Rápidas do WhatsApp (atalhos com '/') vinculada estritamente ao master_id

CREATE TABLE IF NOT EXISTS public.quick_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID REFERENCES public.masters(id) ON DELETE CASCADE,
    venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
    keyword TEXT NOT NULL,
    message TEXT NOT NULL,
    created_by TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Isolamento Total
ALTER TABLE IF EXISTS public.quick_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quick_messages_full_access" ON public.quick_messages;
CREATE POLICY "quick_messages_full_access" ON public.quick_messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS public.quick_messages REPLICA IDENTITY FULL;

-- Indexação para buscas rápidas por palavra-chave e master_id
CREATE INDEX IF NOT EXISTS idx_quick_messages_master_keyword ON public.quick_messages(master_id, keyword);
CREATE INDEX IF NOT EXISTS idx_quick_messages_active ON public.quick_messages(is_active);

-- Adicionar na publicação Realtime de forma idempotente
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'quick_messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.quick_messages;
    END IF;
  END IF;
END $$;
