-- ==============================================================================
-- F5 SYSTEM • PRODUCAO — SEGUNDA LEVA (2026-11-19)
-- Continua o arquivo APPLY_PRODUCAO_2026-11-18_UNICA.sql (que vai ate a migration 20261117150000
-- e inclui a limpeza de duplicados e as indicacoes). Aqui entram TODAS as migrations seguintes, em ordem.
--
-- COMO RODAR
--   1. Backup antes (npm run backup:db + backup no painel do Supabase).
--   2. Cole ESTE arquivo inteiro no SQL Editor do Supabase e execute UMA vez. E idempotente: rodar de novo nao duplica nada.
--   3. Ao final, rode o bloco "CONFERENCIA" (comentado no fim do arquivo).
--
-- CONTEUDO (em ordem)
--   - 20261118120000_realtime_contracts
--   - 20261118130000_lead_stage_history
--   - 20261118140000_notifications
--   - 20261118150000_notifications_insert_and_dedupe
--   - 20261118160000_notifications_delivery_status
--   - 20261118170000_rls_identity_by_email
--   - 20261118171000_guests_is_referred
--   - 20261118180000_sources_send_enabled
--   - 20261118190000_find_leads_by_phone
--   - 20261118200000_contracts_source_id
--   - 20261118210000_sources_master_and_unique_instance
--   - 20261119100000_venue_baselines
--   - 20261119110000_mql_profiles_and_lead_snapshot
--   - 20261119120000_goal_periods_and_results
--   - 20261119130000_goal_metrics_commercial
--   - 20261119140000_job_roles_catalog
--   - 20261120100000_collaborator_presence
--   - 20261120110000_job_role_labels
--   - 20261120120000_backfill_first_whatsapp_message_activity
--
-- OBSERVACOES
--   - 20261120120000 cria a mensagem de chat que faltava nos leads criados ate 15/11 (a lista mostrava a mensagem e o chat abria vazio).
--   - 20261120100000 (presenca ao vivo) cria a tabela collaborator_presence; a funcionalidade tem chave remota (team_presence) para desligar.
--   - Nenhuma destas migrations apaga dados existentes.
-- ==============================================================================

-- ============================================================
-- MIGRATION: 20261118120000_realtime_contracts
-- ============================================================
-- Tempo real de contratos: inclui contracts, contract_funnel_placements e venue_goals na publicacao Realtime.
-- Idempotente. Nenhuma policy nova (isolamento por master_id segue nos servicos).
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['contracts', 'contract_funnel_placements', 'venue_goals']
    LOOP
        IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
           AND NOT EXISTS (
               SELECT 1 FROM pg_publication_tables
               WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
           ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
    END LOOP;
END $$;

-- ============================================================
-- MIGRATION: 20261118130000_lead_stage_history
-- ============================================================
    -- Historico de etapas do lead (jornada): cada passagem por uma etapa do funil, com entrada e saida.
    -- Base para "tempo em cada etapa", "tempo ate o fechamento" e para o snapshot do contrato.
    -- Isolamento: master_id obrigatorio; RLS restrita ao Master do usuario (NAO usa USING (true)).
    -- Requer a funcao public.f5_current_master_id() (migration 20261117140000). Idempotente.

    CREATE TABLE IF NOT EXISTS public.lead_stage_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
        lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
        funnel_id UUID,
        stage_id TEXT NOT NULL,
        stage_name TEXT,
        entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        left_at TIMESTAMPTZ,
        moved_by_id UUID,
        moved_by_name TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_lead_stage_history_lead ON public.lead_stage_history (lead_id, entered_at);
    CREATE INDEX IF NOT EXISTS idx_lead_stage_history_master ON public.lead_stage_history (master_id);

    ALTER TABLE public.lead_stage_history ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "lead_stage_history_master_scope" ON public.lead_stage_history;
    CREATE POLICY "lead_stage_history_master_scope" ON public.lead_stage_history
        FOR ALL TO authenticated
        USING (master_id = public.f5_current_master_id())
        WITH CHECK (master_id = public.f5_current_master_id());

    -- Backfill minimo: uma linha de entrada na etapa atual para leads que ainda nao tem historico
    INSERT INTO public.lead_stage_history (master_id, lead_id, funnel_id, stage_id, entered_at)
    SELECT l.master_id, l.id,
        CASE WHEN l.funnel_id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN l.funnel_id::text::uuid END,
        l.stage, COALESCE(l.created_at, now())
    FROM public.leads l
    WHERE l.master_id IS NOT NULL
    AND l.stage IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.lead_stage_history h WHERE h.lead_id = l.id);

-- ============================================================
-- MIGRATION: 20261118140000_notifications
-- ============================================================
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

-- ============================================================
-- MIGRATION: 20261118150000_notifications_insert_and_dedupe
-- ============================================================
    -- Complemento de notifications (20261118140000):
    -- 1) indice unico NAO parcial em (recipient_id, dedupe_key) para permitir upsert ignorando duplicadas (varios clientes geram o mesmo evento);
    -- 2) INSERT permitido a colaboradores autenticados, SOMENTE para destinatarios do proprio Master (isolamento por tenant).
    -- Idempotente.

    DROP INDEX IF EXISTS public.uq_notifications_recipient_dedupe;
    CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_recipient_dedupe_key
        ON public.notifications (recipient_id, dedupe_key);

    -- A tabela collaborators tem RLS propria; a checagem de pertencimento precisa ser SECURITY DEFINER.
    CREATE OR REPLACE FUNCTION public.f5_is_master_member(p_collaborator UUID, p_master UUID) RETURNS BOOLEAN
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
    AS $$
        SELECT EXISTS (
            SELECT 1 FROM public.collaborators c
            WHERE c.id = p_collaborator AND COALESCE(c.master_id, c.id) = p_master
        );
    $$;

    DROP POLICY IF EXISTS "notifications_master_insert" ON public.notifications;
    CREATE POLICY "notifications_master_insert" ON public.notifications
        FOR INSERT TO authenticated
        WITH CHECK (
            master_id = public.f5_current_master_id()
            AND public.f5_is_master_member(recipient_id, master_id)
        );

-- ============================================================
-- MIGRATION: 20261118160000_notifications_delivery_status
-- ============================================================
-- Toda notificacao fica guardada (historico de entrega e de leitura).
-- delivery_status: 'pending' ao cair no banco; 'delivered' quando o pop-up/aviso foi exibido ao destinatario.
-- read_at (ja existente): visualizada (clique no pop-up ou na notificacao, ou "marcar como lida").
-- cleared_at: "Limpar" apenas oculta da central; a linha NUNCA e apagada.
-- Idempotente.

ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cleared_at TIMESTAMPTZ;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'notifications_delivery_status_check' AND conrelid = 'public.notifications'::regclass
    ) THEN
        ALTER TABLE public.notifications
            ADD CONSTRAINT notifications_delivery_status_check CHECK (delivery_status IN ('pending', 'delivered'));
    END IF;
END $$;

-- Notificacoes anteriores a este ajuste ja foram exibidas ao usuario: nao tratar como pendentes
UPDATE public.notifications
SET delivery_status = 'delivered', delivered_at = COALESCE(delivered_at, created_at)
WHERE delivery_status = 'pending' AND created_at < now();

CREATE INDEX IF NOT EXISTS idx_notifications_pending
    ON public.notifications (recipient_id) WHERE delivery_status = 'pending';

-- Historico e imutavel: o destinatario nao apaga notificacoes (limpar = preencher cleared_at)
DROP POLICY IF EXISTS "notifications_recipient_delete" ON public.notifications;

-- ============================================================
-- MIGRATION: 20261118170000_rls_identity_by_email
-- ============================================================
-- Identidade do usuario logado nas policies (RLS).
-- Problema: nem sempre collaborators.id = auth.uid(). O trigger de criacao do usuario de login faz
-- ON CONFLICT (email) e MANTEM o id do colaborador criado antes; nesses casos f5_current_master_id()
-- retornava NULL e toda policy baseada nele negava (ex.: "violates row-level security policy for table notifications").
-- Solucao: identificar o colaborador por id = auth.uid() OU pelo e-mail do JWT (assinado, confiavel).
-- Corrige tambem as tabelas que ja usam f5_current_master_id (whatsapp_media, lead_stage_history). Idempotente.

CREATE OR REPLACE FUNCTION public.f5_current_collaborator_id() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT c.id
    FROM public.collaborators c
    WHERE c.id = auth.uid()
       OR (nullif(auth.jwt() ->> 'email', '') IS NOT NULL AND lower(c.email) = lower(auth.jwt() ->> 'email'))
    ORDER BY (c.id = auth.uid()) DESC
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.f5_current_master_id() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT COALESCE(c.master_id, c.id)
    FROM public.collaborators c
    WHERE c.id = public.f5_current_collaborator_id()
    LIMIT 1;
$$;

-- notifications: destinatario = colaborador logado (por id ou e-mail)
DROP POLICY IF EXISTS "notifications_recipient_select" ON public.notifications;
CREATE POLICY "notifications_recipient_select" ON public.notifications
    FOR SELECT TO authenticated
    USING (master_id = public.f5_current_master_id() AND recipient_id = public.f5_current_collaborator_id());

DROP POLICY IF EXISTS "notifications_recipient_update" ON public.notifications;
CREATE POLICY "notifications_recipient_update" ON public.notifications
    FOR UPDATE TO authenticated
    USING (master_id = public.f5_current_master_id() AND recipient_id = public.f5_current_collaborator_id())
    WITH CHECK (master_id = public.f5_current_master_id() AND recipient_id = public.f5_current_collaborator_id());

DROP POLICY IF EXISTS "notifications_master_insert" ON public.notifications;
CREATE POLICY "notifications_master_insert" ON public.notifications
    FOR INSERT TO authenticated
    WITH CHECK (
        master_id = public.f5_current_master_id()
        AND public.f5_is_master_member(recipient_id, master_id)
    );

DROP POLICY IF EXISTS "notifications_recipient_delete" ON public.notifications;

DROP POLICY IF EXISTS "notification_prefs_owner" ON public.notification_prefs;
CREATE POLICY "notification_prefs_owner" ON public.notification_prefs
    FOR ALL TO authenticated
    USING (master_id = public.f5_current_master_id() AND collaborator_id = public.f5_current_collaborator_id())
    WITH CHECK (master_id = public.f5_current_master_id() AND collaborator_id = public.f5_current_collaborator_id());

-- ============================================================
-- MIGRATION: 20261118171000_guests_is_referred
-- ============================================================
            -- A coluna guests.is_referred e lida e gravada pelo app (debutanteService/guestService) mas nunca teve migration:
            -- no banco de producao a consulta de convidados retorna 400 ("column guests.is_referred does not exist"). Idempotente.
            ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS is_referred BOOLEAN NOT NULL DEFAULT false;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        

-- ============================================================
-- MIGRATION: 20261118180000_sources_send_enabled
-- ============================================================
-- Instancia (origem WhatsApp) com check "enviar mensagens" dentro do funil.
-- Toda instancia entra ATIVADA; desativada = so recebe (mensagens que chegam nela continuam entrando no funil,
-- mas ela nao aparece para responder o cliente). Idempotente.
ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS send_enabled BOOLEAN NOT NULL DEFAULT true;

-- ============================================================
-- MIGRATION: 20261118190000_find_leads_by_phone
-- ============================================================
-- Busca de lead por telefone para o webhook: telefone principal E contatos do lead (2o/3o numero, mae, pai).
-- Antes o webhook so olhava leads.phone; mensagem do 2o numero criava um lead duplicado.
-- Isolada por Master (ou pelas casas do Master). Usa to_jsonb(l) para nao depender de a coluna `contacts` existir. Idempotente.
CREATE OR REPLACE FUNCTION public.f5_find_lead_ids_by_phone(p_master UUID, p_venues TEXT[], p_tail TEXT)
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT l.id
    FROM public.leads l
    WHERE length(regexp_replace(COALESCE(p_tail, ''), '\D', '', 'g')) >= 8
      AND (l.master_id = p_master OR l.venue_id::text = ANY(COALESCE(p_venues, ARRAY[]::TEXT[])))
      AND (
            right(regexp_replace(COALESCE(l.phone, ''), '\D', '', 'g'), length(p_tail)) = p_tail
         OR right(regexp_replace(COALESCE(to_jsonb(l) ->> 'mother_phone', ''), '\D', '', 'g'), length(p_tail)) = p_tail
         OR right(regexp_replace(COALESCE(to_jsonb(l) ->> 'father_phone', ''), '\D', '', 'g'), length(p_tail)) = p_tail
         OR EXISTS (
              SELECT 1
              FROM jsonb_array_elements(
                     CASE WHEN jsonb_typeof(to_jsonb(l) -> 'contacts') = 'array' THEN to_jsonb(l) -> 'contacts' ELSE '[]'::jsonb END
                   ) c
              WHERE right(regexp_replace(COALESCE(c ->> 'phone', ''), '\D', '', 'g'), length(p_tail)) = p_tail
            )
         OR EXISTS (
              SELECT 1
              FROM jsonb_array_elements(
                     CASE WHEN jsonb_typeof(l.custom_field_values -> 'contacts') = 'array' THEN l.custom_field_values -> 'contacts' ELSE '[]'::jsonb END
                   ) c
              WHERE right(regexp_replace(COALESCE(c ->> 'phone', ''), '\D', '', 'g'), length(p_tail)) = p_tail
            )
      )
    ORDER BY l.last_interaction_at DESC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.f5_find_lead_ids_by_phone(UUID, TEXT[], TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.f5_find_lead_ids_by_phone(UUID, TEXT[], TEXT) TO service_role;

-- ============================================================
-- MIGRATION: 20261118200000_contracts_source_id
-- ============================================================
-- Contrato guarda a origem (origem/instancia WhatsApp do lead que o gerou).
-- Alimenta a escolha do chip de resposta do contrato/cliente (origem do contrato respeitada quando for do funil atual).
-- Backfill a partir do lead de origem, sempre dentro do mesmo Master. Idempotente.
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS source_id TEXT;

UPDATE public.contracts c
SET source_id = l.source_id::text
FROM public.leads l
WHERE c.source_id IS NULL
  AND c.origin_lead_id::text = l.id::text
  AND l.source_id IS NOT NULL
  AND c.master_id = l.master_id;

-- ============================================================
-- MIGRATION: 20261118210000_sources_master_and_unique_instance
-- ============================================================
-- Endurece a tabela sources sem alterar a RLS (formularios publicos /f/:slug e links /r/:slug dependem de leitura anonima):
-- 1) master_id (preenchido a partir da casa) para auditoria e filtros por Master;
-- 2) indice unico em whatsapp_instance_id: uma instancia pertence a UMA origem (logo, a um unico funil).
-- O indice so e criado se nao houver duplicados; se houver, a migration avisa e deve ser rodada de novo depois de limpar. Idempotente.
ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS master_id UUID;

UPDATE public.sources s
SET master_id = v.master_id
FROM public.venues v
WHERE s.master_id IS NULL AND v.master_id IS NOT NULL AND s.venue_id::text = v.id::text;

CREATE INDEX IF NOT EXISTS idx_sources_master_id ON public.sources (master_id);

-- Origem nova herda o Master da casa automaticamente (o app nao precisa informar)
CREATE OR REPLACE FUNCTION public.f5_sources_set_master() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    IF NEW.master_id IS NULL THEN
        SELECT v.master_id INTO NEW.master_id FROM public.venues v WHERE v.id::text = NEW.venue_id::text LIMIT 1;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sources_set_master ON public.sources;
CREATE TRIGGER trg_sources_set_master
    BEFORE INSERT OR UPDATE OF venue_id ON public.sources
    FOR EACH ROW EXECUTE FUNCTION public.f5_sources_set_master();

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.sources WHERE whatsapp_instance_id IS NOT NULL
        GROUP BY whatsapp_instance_id HAVING count(*) > 1
    ) THEN
        RAISE NOTICE 'Instancias duplicadas em sources: indice unico NAO criado. Resolva as duplicadas e rode esta migration de novo.';
    ELSE
        CREATE UNIQUE INDEX IF NOT EXISTS uq_sources_whatsapp_instance
            ON public.sources (whatsapp_instance_id) WHERE whatsapp_instance_id IS NOT NULL;
    END IF;
END $$;

-- ============================================================
-- MIGRATION: 20261119100000_venue_baselines
-- ============================================================
-- Metricas base da casa: valores iniciais de referencia para clientes que entram sem historico no sistema.
-- Usadas no dashboard em "Comparar com: Base da unidade".
-- Isolamento: master_id obrigatorio; RLS restrita ao Master do usuario (NAO usa USING (true)).
-- Requer public.f5_current_master_id() (migration 20261117140000). Idempotente.

CREATE TABLE IF NOT EXISTS public.venue_baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    conversion_rate NUMERIC(6, 2),          -- lead -> contrato (%)
    qualification_rate NUMERIC(6, 2),       -- captado -> qualificado (%)
    qual_to_sched_rate NUMERIC(6, 2),       -- qualificado -> agendado (%)
    sched_to_attend_rate NUMERIC(6, 2),     -- agendado -> compareceu (%)
    attend_to_won_rate NUMERIC(6, 2),       -- compareceu -> fechou (%)
    loss_rate NUMERIC(6, 2),                -- leads perdidos (%)
    leads_per_month INT,
    appointments_per_month INT,
    contracts_per_month INT,
    avg_ticket NUMERIC(12, 2),
    monthly_revenue NUMERIC(12, 2),
    response_time_minutes INT,              -- 1a resposta
    avg_response_minutes INT,               -- media de qualquer mensagem
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_venue_baselines_venue UNIQUE (venue_id)
);

CREATE INDEX IF NOT EXISTS idx_venue_baselines_master ON public.venue_baselines(master_id);

ALTER TABLE public.venue_baselines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "venue_baselines_master_scope" ON public.venue_baselines;
CREATE POLICY "venue_baselines_master_scope" ON public.venue_baselines
    FOR ALL TO authenticated
    USING (master_id = public.f5_current_master_id())
    WITH CHECK (master_id = public.f5_current_master_id());

-- ============================================================
-- MIGRATION: 20261119110000_mql_profiles_and_lead_snapshot
-- ============================================================
-- MQL confiavel: perfis com autor/data, 1 funil = 1 MQL no banco, e snapshot do MQL no lead.
-- - mql_profiles: perfil de qualificacao (nome, autor, data, ativo). Exclusao e logica (is_active).
-- - mql_profile_funnels: vinculo perfil <-> funil com UNIQUE(funnel_id) (regra "1 funil = 1 MQL").
-- - mql_questions.profile_id / master_id / is_active: perguntas pertencem a um perfil e a um Master.
-- - leads.mql_snapshot: copia das perguntas/alternativas da epoca em que o lead foi respondido
--   (editar ou apagar o MQL nao altera leads ja respondidos).
-- Requer public.f5_current_master_id() (migration 20261117140000). Idempotente.

-- 1. Perfis de MQL
CREATE TABLE IF NOT EXISTS public.mql_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by_id UUID,
    created_by_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_mql_profiles_master ON public.mql_profiles(master_id);

-- 2. Vinculo perfil <-> funil: um funil so pode estar em um perfil
CREATE TABLE IF NOT EXISTS public.mql_profile_funnels (
    profile_id UUID NOT NULL REFERENCES public.mql_profiles(id) ON DELETE CASCADE,
    funnel_id UUID NOT NULL REFERENCES public.commercial_funnels(id) ON DELETE CASCADE,
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (profile_id, funnel_id),
    CONSTRAINT uq_mql_profile_funnels_funnel UNIQUE (funnel_id)
);
CREATE INDEX IF NOT EXISTS idx_mql_profile_funnels_master ON public.mql_profile_funnels(master_id);

ALTER TABLE public.mql_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mql_profiles_master_scope" ON public.mql_profiles;
CREATE POLICY "mql_profiles_master_scope" ON public.mql_profiles
    FOR ALL TO authenticated
    USING (master_id = public.f5_current_master_id())
    WITH CHECK (master_id = public.f5_current_master_id());

ALTER TABLE public.mql_profile_funnels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mql_profile_funnels_master_scope" ON public.mql_profile_funnels;
CREATE POLICY "mql_profile_funnels_master_scope" ON public.mql_profile_funnels
    FOR ALL TO authenticated
    USING (master_id = public.f5_current_master_id())
    WITH CHECK (master_id = public.f5_current_master_id());

-- 3. Perguntas: perfil, Master e situacao
ALTER TABLE public.mql_questions
    ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.mql_profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS master_id UUID REFERENCES public.collaborators(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_mql_questions_profile ON public.mql_questions(profile_id);
CREATE INDEX IF NOT EXISTS idx_mql_questions_master ON public.mql_questions(master_id);

-- 4. Snapshot do MQL no lead
ALTER TABLE public.leads
    ADD COLUMN IF NOT EXISTS mql_snapshot JSONB;

-- 5. Backfill: cria um perfil para cada grupo existente de perguntas (mesmo nome de perfil ou mesmos funis)
DO $$
DECLARE
    g RECORD;
    pid UUID;
BEGIN
    CREATE TEMP TABLE _mql_q_groups ON COMMIT DROP AS
    SELECT
        q.id AS qid,
        q.created_at AS q_created_at,
        COALESCE(
            NULLIF(q.profile_name, ''),
            CASE WHEN COALESCE(array_length(q.funnel_ids, 1), 0) > 0
                 THEN (SELECT string_agg(x::text, '_' ORDER BY x::text) FROM unnest(q.funnel_ids) x)
                 ELSE q.id END
        ) AS gkey,
        COALESCE(NULLIF(q.profile_name, ''), 'Formato de Qualificação') AS gname,
        COALESCE(
            q.master_id,
            (SELECT f.master_id FROM public.commercial_funnels f WHERE f.id = ANY(COALESCE(q.funnel_ids, '{}'::uuid[])) LIMIT 1),
            (SELECT v.master_id FROM public.venues v WHERE v.id = q.venue_id)
        ) AS gmaster
    FROM public.mql_questions q
    WHERE q.profile_id IS NULL;

    FOR g IN
        SELECT gkey, gmaster, MAX(gname) AS gname, MIN(q_created_at) AS first_at
        FROM _mql_q_groups
        WHERE gmaster IS NOT NULL
        GROUP BY gkey, gmaster
    LOOP
        INSERT INTO public.mql_profiles (master_id, name, created_at)
        VALUES (g.gmaster, g.gname, g.first_at)
        RETURNING id INTO pid;

        UPDATE public.mql_questions q
        SET profile_id = pid, master_id = g.gmaster
        FROM _mql_q_groups t
        WHERE t.qid = q.id AND t.gkey = g.gkey AND t.gmaster = g.gmaster;

        INSERT INTO public.mql_profile_funnels (profile_id, funnel_id, master_id)
        SELECT DISTINCT pid, fid, g.gmaster
        FROM public.mql_questions q
        CROSS JOIN LATERAL unnest(COALESCE(q.funnel_ids, '{}'::uuid[])) AS fid
        WHERE q.profile_id = pid
          AND EXISTS (SELECT 1 FROM public.commercial_funnels cf WHERE cf.id = fid)
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- ============================================================
-- MIGRATION: 20261119120000_goal_periods_and_results
-- ============================================================
-- Metas por unidade e por colaborador com periodo, recorrencia e historico imutavel.
-- - goal_periods: meta da unidade em um periodo (mensal, bimestral, trimestral, semestral ou personalizado).
-- - collaborator_goals: metas individuais dentro de um periodo; a soma nao pode passar da meta da unidade (trigger).
-- - goal_results: resultado de cada meta ao fim do periodo (so INSERT/SELECT: nunca e alterado nem apagado pelo app).
-- - goal_audit: trilha de edicoes (quem, quando, valor anterior).
-- Isolamento: master_id obrigatorio e RLS por Master (NAO usa USING (true)).
-- Requer public.f5_current_master_id() (migration 20261117140000). Idempotente.
-- As tabelas antigas (venue_goals, team_goals, collaborators.goals) NAO sao alteradas nem removidas.

CREATE TABLE IF NOT EXISTS public.goal_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    kind TEXT NOT NULL DEFAULT 'monthly' CHECK (kind IN ('monthly', 'bimonthly', 'quarterly', 'semiannual', 'custom')),
    starts_on DATE NOT NULL,
    ends_on DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'closed')),
    is_recurring BOOLEAN NOT NULL DEFAULT false,
    revenue_target NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (revenue_target >= 0),
    closings_target INT NOT NULL DEFAULT 0 CHECK (closings_target >= 0),
    leads_target INT NOT NULL DEFAULT 0 CHECK (leads_target >= 0),
    appointments_target INT NOT NULL DEFAULT 0 CHECK (appointments_target >= 0),
    attendance_rate_target NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (attendance_rate_target >= 0 AND attendance_rate_target <= 100),
    conversion_rate_target NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (conversion_rate_target >= 0 AND conversion_rate_target <= 100),
    response_time_target_minutes INT NOT NULL DEFAULT 0 CHECK (response_time_target_minutes >= 0), -- 1a resposta
    avg_response_target_minutes INT NOT NULL DEFAULT 0 CHECK (avg_response_target_minutes >= 0),   -- media de qualquer mensagem
    created_by_id UUID,
    created_by_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_goal_periods_dates CHECK (ends_on >= starts_on),
    -- Um periodo por unidade e janela de datas: garante virada idempotente (nunca duplica o proximo periodo)
    CONSTRAINT uq_goal_periods_venue_window UNIQUE (venue_id, starts_on, ends_on)
);
CREATE INDEX IF NOT EXISTS idx_goal_periods_master_venue ON public.goal_periods(master_id, venue_id);
CREATE INDEX IF NOT EXISTS idx_goal_periods_status_end ON public.goal_periods(status, ends_on);

CREATE TABLE IF NOT EXISTS public.collaborator_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    period_id UUID NOT NULL REFERENCES public.goal_periods(id) ON DELETE CASCADE,
    collaborator_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    metric TEXT NOT NULL CHECK (metric IN ('revenue', 'closings', 'leads', 'appointments', 'attendance_rate', 'conversion_rate', 'response_time', 'avg_response_time')),
    target_value NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (target_value >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'closed')),
    is_recurring BOOLEAN NOT NULL DEFAULT true,
    created_by_id UUID,
    created_by_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_collaborator_goals_scope UNIQUE (period_id, collaborator_id, metric)
);
CREATE INDEX IF NOT EXISTS idx_collaborator_goals_master_venue ON public.collaborator_goals(master_id, venue_id);
CREATE INDEX IF NOT EXISTS idx_collaborator_goals_collab ON public.collaborator_goals(collaborator_id);

-- Resultado de cada meta ao fim do periodo. Imutavel: so existem policies de SELECT e INSERT.
CREATE TABLE IF NOT EXISTS public.goal_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    period_id UUID,
    scope TEXT NOT NULL CHECK (scope IN ('venue', 'collaborator')),
    collaborator_id UUID,
    collaborator_name TEXT,
    metric TEXT NOT NULL CHECK (metric IN ('revenue', 'closings', 'leads', 'appointments', 'attendance_rate', 'conversion_rate', 'response_time', 'avg_response_time')),
    starts_on DATE NOT NULL,
    ends_on DATE NOT NULL,
    target_value NUMERIC(14, 2) NOT NULL,
    actual_value NUMERIC(14, 2) NOT NULL,
    pct NUMERIC(8, 2),
    outcome TEXT NOT NULL CHECK (outcome IN ('met', 'missed')),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_goal_results_master_venue ON public.goal_results(master_id, venue_id, ends_on DESC);
CREATE INDEX IF NOT EXISTS idx_goal_results_collab ON public.goal_results(collaborator_id);
-- Evita gravar duas vezes o resultado da mesma meta no mesmo periodo (virada idempotente)
CREATE UNIQUE INDEX IF NOT EXISTS uq_goal_results_once
    ON public.goal_results (period_id, scope, COALESCE(collaborator_id, '00000000-0000-0000-0000-000000000000'::uuid), metric)
    WHERE period_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.goal_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    venue_id UUID,
    period_id UUID,
    collaborator_id UUID,
    metric TEXT,
    field TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by_id UUID,
    changed_by_name TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_goal_audit_master_period ON public.goal_audit(master_id, period_id, changed_at DESC);

-- Teto: a soma das metas dos colaboradores (por metrica) nao passa da meta da unidade no periodo.
CREATE OR REPLACE FUNCTION public.f5_check_collaborator_goal_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    venue_cap NUMERIC;
    used NUMERIC;
BEGIN
    -- Taxas e tempos de resposta sao individuais: so as metas de volume (somaveis) tem teto
    IF NEW.metric NOT IN ('revenue', 'closings', 'leads', 'appointments') THEN
        RETURN NEW;
    END IF;

    SELECT CASE NEW.metric
               WHEN 'revenue' THEN revenue_target
               WHEN 'closings' THEN closings_target
               WHEN 'leads' THEN leads_target
               WHEN 'appointments' THEN appointments_target
           END
      INTO venue_cap
      FROM public.goal_periods
     WHERE id = NEW.period_id;

    SELECT COALESCE(SUM(target_value), 0)
      INTO used
      FROM public.collaborator_goals
     WHERE period_id = NEW.period_id
       AND metric = NEW.metric
       -- exclui a propria meta do colaborador (a linha que esta sendo inserida/atualizada via upsert)
       AND collaborator_id <> NEW.collaborator_id;

    IF used + NEW.target_value > COALESCE(venue_cap, 0) THEN
        RAISE EXCEPTION 'goal_cap_exceeded' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_collaborator_goals_cap ON public.collaborator_goals;
CREATE TRIGGER trg_collaborator_goals_cap
    BEFORE INSERT OR UPDATE OF target_value, metric, period_id ON public.collaborator_goals
    FOR EACH ROW EXECUTE FUNCTION public.f5_check_collaborator_goal_cap();

-- RLS por Master
ALTER TABLE public.goal_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "goal_periods_master_scope" ON public.goal_periods;
CREATE POLICY "goal_periods_master_scope" ON public.goal_periods
    FOR ALL TO authenticated
    USING (master_id = public.f5_current_master_id())
    WITH CHECK (master_id = public.f5_current_master_id());

ALTER TABLE public.collaborator_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "collaborator_goals_master_scope" ON public.collaborator_goals;
CREATE POLICY "collaborator_goals_master_scope" ON public.collaborator_goals
    FOR ALL TO authenticated
    USING (master_id = public.f5_current_master_id())
    WITH CHECK (master_id = public.f5_current_master_id());

ALTER TABLE public.goal_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "goal_results_select" ON public.goal_results;
CREATE POLICY "goal_results_select" ON public.goal_results
    FOR SELECT TO authenticated
    USING (master_id = public.f5_current_master_id());
DROP POLICY IF EXISTS "goal_results_insert" ON public.goal_results;
CREATE POLICY "goal_results_insert" ON public.goal_results
    FOR INSERT TO authenticated
    WITH CHECK (master_id = public.f5_current_master_id());

ALTER TABLE public.goal_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "goal_audit_select" ON public.goal_audit;
CREATE POLICY "goal_audit_select" ON public.goal_audit
    FOR SELECT TO authenticated
    USING (master_id = public.f5_current_master_id());
DROP POLICY IF EXISTS "goal_audit_insert" ON public.goal_audit;
CREATE POLICY "goal_audit_insert" ON public.goal_audit
    FOR INSERT TO authenticated
    WITH CHECK (master_id = public.f5_current_master_id());

-- ============================================================
-- MIGRATION: 20261119130000_goal_metrics_commercial
-- ============================================================
-- Metas comerciais v2: o catalogo passa a ser so comercial.
-- Sai: leads captados e conversao lead->contrato (marketing). Entram: taxa de agendamento (qualificado->agendado)
-- e taxa de fechamento (fechados sobre quem compareceu). Idempotente. Nao altera migrations ja aplicadas.

-- 1. Novas metas de taxa na meta da unidade
ALTER TABLE public.goal_periods
    ADD COLUMN IF NOT EXISTS scheduling_rate_target NUMERIC(5, 2) NOT NULL DEFAULT 0
        CHECK (scheduling_rate_target >= 0 AND scheduling_rate_target <= 100),
    ADD COLUMN IF NOT EXISTS closing_rate_target NUMERIC(5, 2) NOT NULL DEFAULT 0
        CHECK (closing_rate_target >= 0 AND closing_rate_target <= 100);

-- 2. Metas de marketing deixam de existir (catalogo ainda nao tinha sido usado em producao)
DELETE FROM public.collaborator_goals WHERE metric IN ('leads', 'conversion_rate');
ALTER TABLE public.goal_periods
    DROP COLUMN IF EXISTS leads_target,
    DROP COLUMN IF EXISTS conversion_rate_target;

-- 3. CHECK de metric com o catalogo novo (goal_results e historico imutavel: NOT VALID nao revalida linhas antigas)
DO $$
DECLARE
    t TEXT;
    c RECORD;
BEGIN
    FOREACH t IN ARRAY ARRAY['collaborator_goals', 'goal_results'] LOOP
        FOR c IN
            SELECT conname FROM pg_constraint
            WHERE conrelid = ('public.' || t)::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%metric%'
        LOOP
            EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', t, c.conname);
        END LOOP;
        EXECUTE format(
            'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (metric IN (%L, %L, %L, %L, %L, %L, %L, %L)) NOT VALID',
            t, 'chk_' || t || '_metric',
            'revenue', 'closings', 'appointments', 'scheduling_rate', 'attendance_rate', 'closing_rate', 'response_time', 'avg_response_time'
        );
    END LOOP;
END $$;

-- 4. Teto: so as metas de volume somam entre colaboradores (faturamento, contratos, agendamentos)
CREATE OR REPLACE FUNCTION public.f5_check_collaborator_goal_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    venue_cap NUMERIC;
    used NUMERIC;
BEGIN
    IF NEW.metric NOT IN ('revenue', 'closings', 'appointments') THEN
        RETURN NEW;
    END IF;

    SELECT CASE NEW.metric
               WHEN 'revenue' THEN revenue_target
               WHEN 'closings' THEN closings_target
               WHEN 'appointments' THEN appointments_target
           END
      INTO venue_cap
      FROM public.goal_periods
     WHERE id = NEW.period_id;

    SELECT COALESCE(SUM(target_value), 0)
      INTO used
      FROM public.collaborator_goals
     WHERE period_id = NEW.period_id
       AND metric = NEW.metric
       AND collaborator_id <> NEW.collaborator_id;

    IF used + NEW.target_value > COALESCE(venue_cap, 0) THEN
        RAISE EXCEPTION 'goal_cap_exceeded' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

-- ============================================================
-- MIGRATION: 20261119140000_job_roles_catalog
-- ============================================================
-- Catalogo de cargos personalizados por setor (acesso x cargo).
-- O cargo "fixo" de cada setor vem do codigo (SDR, Closer, Gerente comercial, Gerente geral, Gestor de marketing...).
-- Aqui ficam os cargos digitados pelo usuario ("Outro"): entram no banco, aparecem para todos do Master e
-- podem ser excluidos na configuracao de cargos.
-- Isolamento: master_id obrigatorio e RLS por Master (nao usa USING (true)).
-- Requer public.f5_current_master_id(). Idempotente.

CREATE TABLE IF NOT EXISTS public.job_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    sector TEXT NOT NULL CHECK (sector IN ('comercial', 'pos_venda', 'gerencia', 'financeiro', 'marketing')),
    name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 60),
    slug TEXT NOT NULL,
    created_by_id UUID,
    created_by_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    -- O mesmo cargo nao se repete no mesmo setor do mesmo Master
    CONSTRAINT uq_job_roles_master_sector_slug UNIQUE (master_id, sector, slug)
);
CREATE INDEX IF NOT EXISTS idx_job_roles_master ON public.job_roles(master_id, sector);

ALTER TABLE public.job_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "job_roles_master_scope" ON public.job_roles;
CREATE POLICY "job_roles_master_scope" ON public.job_roles
    FOR ALL TO authenticated
    USING (master_id = public.f5_current_master_id())
    WITH CHECK (master_id = public.f5_current_master_id());

-- ============================================================
-- MIGRATION: 20261120100000_collaborator_presence
-- ============================================================
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

-- ============================================================
-- MIGRATION: 20261120110000_job_role_labels
-- ============================================================
-- Nome de exibicao dos cargos, por Master.
-- O cargo (SDR, Closer, Gerente geral...) continua o mesmo para o sistema; so o nome mostrado muda
-- (ex.: SDR aparece como "Especialista"). Vale para cargos padrao e personalizados.
-- Isolamento: master_id obrigatorio e RLS por Master (nao usa USING (true)). Requer public.f5_current_master_id(). Idempotente.

CREATE TABLE IF NOT EXISTS public.job_role_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    role_id TEXT NOT NULL CHECK (char_length(role_id) BETWEEN 3 AND 120),
    display_name TEXT NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 2 AND 60),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_job_role_labels_master_role UNIQUE (master_id, role_id)
);
CREATE INDEX IF NOT EXISTS idx_job_role_labels_master ON public.job_role_labels(master_id);

ALTER TABLE public.job_role_labels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "job_role_labels_master_scope" ON public.job_role_labels;
CREATE POLICY "job_role_labels_master_scope" ON public.job_role_labels
    FOR ALL TO authenticated
    USING (master_id = public.f5_current_master_id())
    WITH CHECK (master_id = public.f5_current_master_id());

-- ============================================================
-- MIGRATION: 20261120120000_backfill_first_whatsapp_message_activity
-- ============================================================
-- Reparo de dados: leads criados pelo WhatsApp ate 15/11 guardaram a primeira mensagem so em leads.notes
-- ("Primeira mensagem via WhatsApp: ..." / "Conversa iniciada via WhatsApp: ..."), sem a atividade em lead_activities.
-- Resultado: a lista de conversas mostrava a mensagem (vem de notes) e o chat abria vazio.
-- Esta migration cria a atividade de chat que faltava, UMA por lead, so para leads que nao tem nenhuma atividade de chat.
-- Idempotente: depois de rodar, o lead passa a ter atividade e nao entra de novo. Nao altera nem apaga nada existente.
-- Escopo: so leads (ja isolados por master_id); nenhuma tabela nova, nenhuma policy nova.

INSERT INTO public.lead_activities (lead_id, type, title, text, author_name, timestamp, status, metadata)
SELECT
    l.id,
    'contact',
    CASE WHEN l.notes LIKE 'Conversa iniciada via WhatsApp:%' THEN 'Mensagem enviada via WhatsApp (Celular/Web)' ELSE 'Mensagem recebida no WhatsApp' END,
    btrim(regexp_replace(regexp_replace(l.notes, '^[^:]*:\s*"?', ''), '"?\s*$', '')),
    CASE WHEN l.notes LIKE 'Conversa iniciada via WhatsApp:%' THEN 'Equipe' ELSE COALESCE(NULLIF(btrim(l.debutante_name), ''), 'Contato') END,
    COALESCE(l.last_interaction_at, l.created_at),
    'delivered',
    jsonb_build_object('backfilled_from_notes', true)
FROM public.leads l
WHERE l.notes ~ '^(Conversa iniciada via WhatsApp|Primeira mensagem via WhatsApp|Mensagem recebida via WhatsApp):'
  AND btrim(regexp_replace(regexp_replace(l.notes, '^[^:]*:\s*"?', ''), '"?\s*$', '')) <> ''
  AND NOT EXISTS (
      SELECT 1 FROM public.lead_activities a
      WHERE a.lead_id = l.id AND a.type IN ('contact', 'whatsapp')
  );


-- ============================================================
-- CONFERENCIA (rode depois; todos os valores devem ser > 0, exceto o ultimo que deve ser 0)
-- ============================================================
-- SELECT
--   (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN
--      ('collaborator_presence','job_role_labels','job_roles','venue_baselines','notifications','lead_stage_history')) AS tabelas_novas_esperado_6,
--   (SELECT count(*) FROM pg_policies WHERE tablename IN ('collaborator_presence','job_role_labels','job_roles')) AS policies_esperado_3,
--   (SELECT count(*) FROM public.lead_activities WHERE metadata->>'backfilled_from_notes'='true') AS mensagens_recuperadas,
--   (SELECT count(*) FROM public.leads l WHERE l.notes ~ '^(Conversa iniciada via WhatsApp|Primeira mensagem via WhatsApp|Mensagem recebida via WhatsApp):'
--      AND NOT EXISTS (SELECT 1 FROM public.lead_activities a WHERE a.lead_id=l.id AND a.type IN ('contact','whatsapp'))) AS leads_ainda_sem_mensagem_esperado_0;
