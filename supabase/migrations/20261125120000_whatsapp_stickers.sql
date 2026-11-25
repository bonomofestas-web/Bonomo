-- ==============================================================================
-- F5 SYSTEM • Figurinhas (Stickers) do WhatsApp por Unidade (Casa de Festa)
-- Cada figurinha pertence ao Master + Unidade (venue_id), armazenada no R2.
-- Todos os colaboradores com acesso àquela unidade visualizam e usam as figurinhas.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID NOT NULL,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_stickers_unique_url
  ON public.whatsapp_stickers (master_id, venue_id, media_url);

CREATE INDEX IF NOT EXISTS idx_whatsapp_stickers_master_venue
  ON public.whatsapp_stickers (master_id, venue_id, created_at DESC);

ALTER TABLE public.whatsapp_stickers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_stickers_master_isolation" ON public.whatsapp_stickers;
CREATE POLICY "whatsapp_stickers_master_isolation"
  ON public.whatsapp_stickers
  FOR ALL
  TO authenticated
  USING (master_id = public.f5_current_master_id())
  WITH CHECK (master_id = public.f5_current_master_id());

REVOKE ALL ON public.whatsapp_stickers FROM anon;
GRANT ALL ON public.whatsapp_stickers TO authenticated, service_role;
