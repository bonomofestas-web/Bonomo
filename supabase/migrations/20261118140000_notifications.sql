-- Central de notificacoes: uma linha por destinatario (collaborators.id) dentro de um Master.
-- Isolamento: master_id obrigatorio + leitura/edicao somente pelo proprio destinatario (NAO usa USING (true)).
-- Insercao: apenas service role (api/) ou funcoes SECURITY DEFINER; nao ha policy de INSERT para authenticated.
-- Requer public.f5_current_master_id() (migration 20261117140000). Idempotente.

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    venue_id TEXT,
    recipient_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'new_opportunity', 'message', 'task', 'contract', 'post_sale',
        'appointment', 'visit_tasting', 'support', 'announcement'
    )),
    title TEXT NOT NULL,
    body TEXT,
    entity_type TEXT CHECK (entity_type IS NULL OR entity_type IN (
        'lead', 'contract', 'task', 'appointment', 'placement', 'ticket', 'announcement'
    )),
    entity_id TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    dedupe_key TEXT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Um mesmo evento gera 1 linha por destinatario; dedupe_key evita repeticao (ex.: lembrete, agrupamento de mensagens)
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_recipient_dedupe
    ON public.notifications (recipient_id, dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_inbox
    ON public.notifications (recipient_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_master ON public.notifications (master_id);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON public.notifications (entity_type, entity_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_recipient_select" ON public.notifications;
CREATE POLICY "notifications_recipient_select" ON public.notifications
    FOR SELECT TO authenticated
    USING (master_id = public.f5_current_master_id() AND recipient_id = auth.uid());

DROP POLICY IF EXISTS "notifications_recipient_update" ON public.notifications;
CREATE POLICY "notifications_recipient_update" ON public.notifications
    FOR UPDATE TO authenticated
    USING (master_id = public.f5_current_master_id() AND recipient_id = auth.uid())
    WITH CHECK (master_id = public.f5_current_master_id() AND recipient_id = auth.uid());

DROP POLICY IF EXISTS "notifications_recipient_delete" ON public.notifications;
CREATE POLICY "notifications_recipient_delete" ON public.notifications
    FOR DELETE TO authenticated
    USING (master_id = public.f5_current_master_id() AND recipient_id = auth.uid());

-- Preferencias por colaborador (tipos silenciados, som, push do navegador)
CREATE TABLE IF NOT EXISTS public.notification_prefs (
    collaborator_id UUID PRIMARY KEY REFERENCES public.collaborators(id) ON DELETE CASCADE,
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    muted_types TEXT[] NOT NULL DEFAULT '{}',
    sound_enabled BOOLEAN NOT NULL DEFAULT true,
    push_enabled BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_master ON public.notification_prefs (master_id);

ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_prefs_owner" ON public.notification_prefs;
CREATE POLICY "notification_prefs_owner" ON public.notification_prefs
    FOR ALL TO authenticated
    USING (master_id = public.f5_current_master_id() AND collaborator_id = auth.uid())
    WITH CHECK (master_id = public.f5_current_master_id() AND collaborator_id = auth.uid());

-- Realtime: so a tabela de notificacoes (o cliente filtra por recipient_id)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
       AND NOT EXISTS (
           SELECT 1 FROM pg_publication_tables
           WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
       ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
END $$;
