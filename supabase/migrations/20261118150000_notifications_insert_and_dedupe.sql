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
