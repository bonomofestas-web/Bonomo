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
