-- ============================================================================
-- FIX: TRIGGER HANDLE_NEW_AUTH_USER COM SUPORTE A ON CONFLICT (EMAIL)
-- ============================================================================
-- Corrige o erro "duplicate key value violates unique constraint collaborators_email_key"
-- que impedia o Supabase Auth de criar usuários pré-cadastrados na tabela public.collaborators
-- e abortava silenciosamente o envio de e-mails de confirmação, convite e recuperação.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.collaborators (
        id,
        email,
        name,
        role,
        active,
        avatar_url,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'master'),
        true,
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'),
        now(),
        now()
    )
    ON CONFLICT (email) DO UPDATE SET
        name = COALESCE(public.collaborators.name, EXCLUDED.name),
        updated_at = now();
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Garante que nenhuma falha na tabela pública impeça o Auth de concluir e enviar o e-mail
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
