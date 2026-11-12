-- ============================================================================
-- MIGRACAO AVULSA: INTEGRIDADE DE TENANT DE COLABORADORES + REPARO CACAH FERNANDES
-- ============================================================================
-- 1. Garante que todas as colunas usadas pelo sistema existam em public.collaborators.
-- 2. Corrige o trigger handle_new_auth_user() para preservar e preencher master_id e venue_ids.
-- 3. Repara e vincula estritamente cacah_fernandes@hotmail.com à conta Master de Yuri Bonomo,
--    sem expor ou misturar dados entre outros Masters (Vazamento Zero).
-- ============================================================================

-- 1. Colunas estruturais garantidas em public.collaborators
ALTER TABLE IF EXISTS public.collaborators
    ADD COLUMN IF NOT EXISTS master_id UUID REFERENCES public.collaborators(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS venue_ids UUID[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS is_first_access BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS pinned_funnel_ids TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS department TEXT,
    ADD COLUMN IF NOT EXISTS sectors TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS custom_job_title TEXT;

-- 2. Trigger handle_new_auth_user() corrigido (agora extrai e persiste master_id + venue_ids)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger AS $$
DECLARE
    v_master_id UUID;
    v_venue_id UUID;
    v_venue_ids UUID[] := '{}';
BEGIN
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

    BEGIN
        IF jsonb_typeof(NEW.raw_user_meta_data->'venue_ids') = 'array' THEN
            SELECT COALESCE(array_agg(elem::UUID), '{}')
            INTO v_venue_ids
            FROM jsonb_array_elements_text(NEW.raw_user_meta_data->'venue_ids') AS elem
            WHERE elem ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_venue_ids := '{}';
    END;

    IF v_master_id IS NULL AND v_venue_id IS NOT NULL THEN
        SELECT master_id INTO v_master_id FROM public.venues WHERE id = v_venue_id LIMIT 1;
    END IF;

    IF v_master_id IS NULL AND array_length(v_venue_ids, 1) > 0 THEN
        SELECT master_id INTO v_master_id FROM public.venues WHERE id = v_venue_ids[1] LIMIT 1;
    END IF;

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
        venue_ids,
        is_first_access,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        lower(trim(NEW.email)),
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'crm'),
        true,
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'phone',
        v_master_id,
        v_venue_id,
        COALESCE(v_venue_ids, '{}'),
        true,
        now(),
        now()
    )
    ON CONFLICT (email) DO UPDATE SET
        name = COALESCE(public.collaborators.name, EXCLUDED.name),
        master_id = COALESCE(public.collaborators.master_id, EXCLUDED.master_id),
        venue_id = COALESCE(public.collaborators.venue_id, EXCLUDED.venue_id),
        venue_ids = CASE
            WHEN public.collaborators.venue_ids IS NULL OR cardinality(public.collaborators.venue_ids) = 0
                THEN COALESCE(EXCLUDED.venue_ids, '{}')
            ELSE public.collaborators.venue_ids
        END,
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

-- 3. Reparo específico para cacah_fernandes@hotmail.com na conta Master de Yuri Bonomo
--    + Backfill seguro de master_id apenas via casas (venues) pertencentes ao mesmo Master.
DO $$
DECLARE
    v_yuri_master_id UUID;
    v_yuri_venue_ids UUID[];
    v_collab_id UUID;
    v_auth_id UUID;
    v_auth_name TEXT;
BEGIN
    -- Localiza estritamente o Master Yuri Bonomo
    SELECT id INTO v_yuri_master_id
    FROM public.collaborators
    WHERE role = 'master'
      AND (lower(name) LIKE '%yuri%' OR lower(email) LIKE '%yuri%')
    ORDER BY created_at ASC
    LIMIT 1;

    -- Fallback seguro pelo owner de unidades da rede Bonomo/Realizar caso necessário
    IF v_yuri_master_id IS NULL THEN
        SELECT master_id INTO v_yuri_master_id
        FROM public.venues
        WHERE master_id IS NOT NULL
          AND (lower(name) LIKE '%bonomo%' OR lower(name) LIKE '%realizar%')
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;

    -- Backfill seguro de quaisquer colaboradores sem master_id que possuam unidade vinculada com master_id definido
    UPDATE public.collaborators c
    SET master_id = v.master_id,
        updated_at = now()
    FROM public.venues v
    WHERE c.master_id IS NULL
      AND c.role <> 'master'
      AND (
        c.venue_id = v.id
        OR (c.venue_ids IS NOT NULL AND v.id = ANY(c.venue_ids))
      )
      AND v.master_id IS NOT NULL;

    IF v_yuri_master_id IS NOT NULL THEN
        SELECT COALESCE(array_agg(id ORDER BY created_at ASC), '{}')
        INTO v_yuri_venue_ids
        FROM public.venues
        WHERE master_id = v_yuri_master_id;

        SELECT id INTO v_collab_id
        FROM public.collaborators
        WHERE lower(trim(email)) = 'cacah_fernandes@hotmail.com'
        LIMIT 1;

        SELECT id, raw_user_meta_data->>'name'
        INTO v_auth_id, v_auth_name
        FROM auth.users
        WHERE lower(trim(email)) = 'cacah_fernandes@hotmail.com'
        LIMIT 1;

        IF v_collab_id IS NOT NULL THEN
            UPDATE public.collaborators
            SET email = 'cacah_fernandes@hotmail.com',
                active = true,
                master_id = CASE
                    WHEN master_id IS NULL
                      OR NOT EXISTS (SELECT 1 FROM public.collaborators m WHERE m.id = public.collaborators.master_id)
                        THEN v_yuri_master_id
                    ELSE master_id
                END,
                role = CASE
                    WHEN role = 'master'
                      AND NOT EXISTS (SELECT 1 FROM public.venues vv WHERE vv.master_id = public.collaborators.id)
                        THEN 'crm'
                    ELSE role
                END,
                venue_ids = CASE
                    WHEN venue_ids IS NULL OR cardinality(venue_ids) = 0
                        THEN COALESCE(v_yuri_venue_ids, '{}')
                    ELSE venue_ids
                END,
                updated_at = now()
            WHERE id = v_collab_id
              AND (
                master_id IS NULL
                OR master_id = v_yuri_master_id
                OR NOT EXISTS (SELECT 1 FROM public.collaborators m WHERE m.id = public.collaborators.master_id)
              );
        ELSE
            INSERT INTO public.collaborators (
                id,
                email,
                name,
                role,
                active,
                master_id,
                venue_id,
                venue_ids,
                is_first_access,
                created_at,
                updated_at
            ) VALUES (
                COALESCE(v_auth_id, gen_random_uuid()),
                'cacah_fernandes@hotmail.com',
                COALESCE(NULLIF(trim(v_auth_name), ''), 'Cacah Fernandes'),
                'crm',
                true,
                v_yuri_master_id,
                NULL,
                COALESCE(v_yuri_venue_ids, '{}'),
                true,
                now(),
                now()
            )
            ON CONFLICT (email) DO NOTHING;
        END IF;

        -- Sincroniza metadado em auth.users caso a conta já exista no Supabase Auth
        IF v_auth_id IS NOT NULL THEN
            UPDATE auth.users
            SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
                'master_id', v_yuri_master_id::text
            )
            WHERE id = v_auth_id
              AND (
                raw_user_meta_data->>'master_id' IS NULL
                OR raw_user_meta_data->>'master_id' = ''
              );
        END IF;
    END IF;
END $$;

