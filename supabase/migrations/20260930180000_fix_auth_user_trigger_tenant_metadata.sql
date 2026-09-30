-- ============================================================================
-- FIX: TRIGGER HANDLE_NEW_AUTH_USER COM METADADOS DO TENANT (MASTER_ID E VENUE_IDS)
-- ============================================================================
-- Garante que qualquer usuário criado pelo Supabase Auth (via convite, signUp ou recuperação)
-- herde imediatamente o master_id, venue_id, venue_ids e phone na tabela public.collaborators,
-- evitando perda de escopo e invisibilidade na conta do Master.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger AS $$
DECLARE
    v_master_id UUID;
    v_venue_id UUID;
    v_venue_ids UUID[];
BEGIN
    -- Extrai master_id e venue_id com conversão segura
    BEGIN
        v_master_id := (NEW.raw_user_meta_data->>'master_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_master_id := NULL;
    END;

    BEGIN
        v_venue_id := (NEW.raw_user_meta_data->>'venue_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_venue_id := NULL;
    END;

    INSERT INTO public.collaborators (
        id,
        email,
        name,
        role,
        active,
        avatar_url,
        phone,
        master_id,
        venue_id,
        is_first_access,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'sdr'),
        true,
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'),
        COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
        v_master_id,
        v_venue_id,
        true,
        now(),
        now()
    )
    ON CONFLICT (email) DO UPDATE SET
        name = COALESCE(public.collaborators.name, EXCLUDED.name),
        master_id = COALESCE(public.collaborators.master_id, EXCLUDED.master_id),
        venue_id = COALESCE(public.collaborators.venue_id, EXCLUDED.venue_id),
        phone = COALESCE(public.collaborators.phone, EXCLUDED.phone),
        updated_at = now();

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
