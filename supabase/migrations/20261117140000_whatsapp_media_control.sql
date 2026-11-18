-- Controle de mídia do WhatsApp no Cloudflare R2 (plano gratuito: 10 GB).
-- Registra cada mídia (salva, pendente, expurgada ou indisponível) para: política de peso,
-- botão "Fixar", medidor de uso e limpeza sazonal (api/r2-cleanup.ts).
-- Isolamento: toda linha tem master_id; RLS restringe ao Master do usuário logado
-- (NÃO usa o padrão permissivo USING (true)). O service role (serverless) ignora RLS.

-- Master do usuário logado: collaborators.id = auth.uid(); master_id aponta para o Master (o próprio Master tem master_id nulo).
CREATE OR REPLACE FUNCTION public.f5_current_master_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(c.master_id, c.id) FROM public.collaborators c WHERE c.id = auth.uid() LIMIT 1;
$$;

CREATE TABLE IF NOT EXISTS public.whatsapp_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
    source_id UUID,
    lead_id UUID,
    activity_id UUID,
    message_id TEXT,
    kind TEXT NOT NULL DEFAULT 'other' CHECK (kind IN ('image', 'video', 'audio', 'document', 'other')),
    mimetype TEXT,
    file_name TEXT,
    size_bytes BIGINT,
    r2_key TEXT,
    public_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('stored', 'pending', 'purged', 'unavailable')),
    pinned BOOLEAN NOT NULL DEFAULT false,
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    purged_at TIMESTAMPTZ
);

-- Uma linha por mensagem dentro do Master (permite upsert idempotente)
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_media_master_message_uidx
    ON public.whatsapp_media (master_id, message_id)
    WHERE message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS whatsapp_media_cleanup_idx
    ON public.whatsapp_media (master_id, status, kind, last_accessed_at);

CREATE INDEX IF NOT EXISTS whatsapp_media_lead_idx
    ON public.whatsapp_media (lead_id);

ALTER TABLE public.whatsapp_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_media_master_scope" ON public.whatsapp_media;
CREATE POLICY "whatsapp_media_master_scope" ON public.whatsapp_media
    FOR ALL TO authenticated
    USING (master_id = public.f5_current_master_id())
    WITH CHECK (master_id = public.f5_current_master_id());
