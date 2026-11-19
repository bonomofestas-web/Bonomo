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
