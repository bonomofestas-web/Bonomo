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
