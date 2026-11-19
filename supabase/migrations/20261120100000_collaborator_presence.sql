-- Presenca ao vivo da equipe: UMA linha por colaborador, atualizada no lugar (o banco nao cresce).
-- NAO entra na publicacao supabase_realtime (zero mensagens Realtime): a tela le por polling curto, so quando aberta.
-- Guarda apenas tela e entidade aberta (tipo, id, rotulo curto), nunca conteudo de mensagem.
-- Isolamento: master_id obrigatorio e RLS por Master (nao usa USING (true)). Requer public.f5_current_master_id(). Idempotente.

CREATE TABLE IF NOT EXISTS public.collaborator_presence (
    collaborator_id UUID PRIMARY KEY REFERENCES public.collaborators(id) ON DELETE CASCADE,
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    venue_id UUID,
    view TEXT,
    entity_type TEXT NOT NULL DEFAULT 'none' CHECK (entity_type IN ('lead', 'client', 'task', 'appointment', 'none')),
    entity_id TEXT,
    entity_label TEXT CHECK (entity_label IS NULL OR char_length(entity_label) <= 60),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_collaborator_presence_master ON public.collaborator_presence(master_id, last_seen_at DESC);

ALTER TABLE public.collaborator_presence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "collaborator_presence_master_scope" ON public.collaborator_presence;
CREATE POLICY "collaborator_presence_master_scope" ON public.collaborator_presence
    FOR ALL TO authenticated
    USING (master_id = public.f5_current_master_id())
    WITH CHECK (master_id = public.f5_current_master_id());
