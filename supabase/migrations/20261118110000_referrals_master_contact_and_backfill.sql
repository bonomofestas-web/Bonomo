-- ==============================================================================
-- F5 SYSTEM • INDICACOES: master_id + contact_id em `referrals` e backfill
-- Data: 2026-11-18
-- Depende de: 20261114200000 (contacts, generate_alphanumeric_code) e, de preferencia,
--             20261118100000 (dedupe) ja aplicada, para casar com o contato mais antigo.
--
-- Motivo: o app enviava `master_id` ao inserir em `referrals`, mas a coluna nao existia
-- (insert recusado em silencio). Agora toda indicacao fica ligada ao Master e a um CONTATO.
-- Idempotente. Nenhum registro e apagado.
-- ==============================================================================

-- 1. COLUNAS
ALTER TABLE public.referrals
    ADD COLUMN IF NOT EXISTS master_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_referrals_master_id ON public.referrals (master_id);
CREATE INDEX IF NOT EXISTS idx_referrals_contact_id ON public.referrals (contact_id);
CREATE INDEX IF NOT EXISTS idx_referrals_lead_id ON public.referrals (lead_id);

-- 2. BACKFILL DE master_id (pelo lead; senao pela unidade da debutante)
UPDATE public.referrals r
SET master_id = l.master_id
FROM public.leads l
WHERE r.master_id IS NULL AND r.lead_id = l.id AND l.master_id IS NOT NULL;

UPDATE public.referrals r
SET master_id = v.master_id
FROM public.debutantes d
JOIN public.venues v ON v.id = d.venue_id
WHERE r.master_id IS NULL AND r.debutante_id = d.id AND v.master_id IS NOT NULL;

-- 3. BACKFILL DE contact_id (a partir do lead ja vinculado)
UPDATE public.referrals r
SET contact_id = l.contact_id
FROM public.leads l
WHERE r.contact_id IS NULL AND r.lead_id = l.id AND l.contact_id IS NOT NULL;

-- 4. RECUPERA INDICACOES CUJO REGISTRO EM `referrals` FOI PERDIDO (lead de debutante sem referral)
INSERT INTO public.referrals (
    id, master_id, contact_id, debutante_id, debutante_name, lead_id,
    name, phone, age, "group", notes, status, points_granted, created_at
)
SELECT
    gen_random_uuid(), l.master_id, l.contact_id, l.debutante_id, l.debutante_name, l.id,
    l.name, l.phone, l.age, COALESCE(l."group", 'Amigos'), l.notes,
    CASE WHEN l.is_validated THEN 'validated' ELSE 'pending' END,
    COALESCE(l.points_granted, 0), COALESCE(l.created_at, now())
FROM public.leads l
WHERE l.debutante_id IS NOT NULL
  AND lower(COALESCE(l.source_name, '')) LIKE 'indica%'
  AND COALESCE(l.is_archived, FALSE) = FALSE
  AND NOT (COALESCE(l.custom_field_values, '{}'::jsonb) ? 'merged_into_lead_id')
  AND NOT EXISTS (SELECT 1 FROM public.referrals r WHERE r.lead_id = l.id);

-- 5. TODA INDICACAO VIRA CONTATO: cria/vincula o contato dos leads de indicacao sem contact_id
DO $$
DECLARE
    rec RECORD;
    v_key TEXT;
    v_contact_id UUID;
    v_linked INT := 0;
    v_created INT := 0;
BEGIN
    FOR rec IN
        SELECT l.id AS lead_id, l.master_id, l.venue_id, l.name, l.phone, l.created_at
        FROM public.leads l
        WHERE l.contact_id IS NULL
          AND l.master_id IS NOT NULL
          AND (
              EXISTS (SELECT 1 FROM public.referrals r WHERE r.lead_id = l.id)
              OR (l.debutante_id IS NOT NULL AND lower(COALESCE(l.source_name, '')) LIKE 'indica%')
          )
        ORDER BY l.created_at ASC
    LOOP
        v_key := regexp_replace(COALESCE(rec.phone, ''), '\D', '', 'g');
        IF length(v_key) >= 12 AND v_key LIKE '55%' THEN v_key := substr(v_key, 3); END IF;
        CONTINUE WHEN length(v_key) NOT IN (10, 11);

        -- contato mais antigo do mesmo Master com o mesmo telefone normalizado
        SELECT c.id INTO v_contact_id
        FROM public.contacts c
        WHERE c.master_id = rec.master_id
          AND c.deleted_at IS NULL
          AND c.primary_phone NOT ILIKE 'sem-telefone-%'
          AND (CASE
                 WHEN length(regexp_replace(c.primary_phone, '\D', '', 'g')) >= 12
                  AND regexp_replace(c.primary_phone, '\D', '', 'g') LIKE '55%'
                 THEN substr(regexp_replace(c.primary_phone, '\D', '', 'g'), 3)
                 ELSE regexp_replace(c.primary_phone, '\D', '', 'g')
               END) = v_key
        ORDER BY c.created_at ASC, c.id ASC
        LIMIT 1;

        IF v_contact_id IS NULL THEN
            INSERT INTO public.contacts (master_id, code, name, primary_phone, relationship_role, created_at, updated_at)
            VALUES (
                rec.master_id,
                public.generate_alphanumeric_code('CONT', 8),
                COALESCE(NULLIF(trim(rec.name), ''), 'Contato ' || v_key),
                '55' || v_key,
                'Indicação',
                COALESCE(rec.created_at, now()),
                COALESCE(rec.created_at, now())
            )
            RETURNING id INTO v_contact_id;
            v_created := v_created + 1;
        END IF;

        UPDATE public.leads SET contact_id = v_contact_id WHERE id = rec.lead_id;
        UPDATE public.referrals SET contact_id = v_contact_id WHERE lead_id = rec.lead_id AND contact_id IS NULL;

        IF rec.venue_id IS NOT NULL THEN
            INSERT INTO public.contact_venue_access (master_id, contact_id, venue_id, first_interaction_at, last_interaction_at)
            VALUES (rec.master_id, v_contact_id, rec.venue_id, COALESCE(rec.created_at, now()), COALESCE(rec.created_at, now()))
            ON CONFLICT (contact_id, venue_id) DO NOTHING;
        END IF;
        v_linked := v_linked + 1;
    END LOOP;

    RAISE NOTICE 'Indicacoes: leads vinculados a contato=%, contatos criados=%', v_linked, v_created;
END $$;

-- ==============================================================================
-- VALIDACAO (devem dar 0):
--   SELECT count(*) FROM referrals WHERE master_id IS NULL;
--   SELECT count(*) FROM referrals WHERE contact_id IS NULL AND lead_id IS NOT NULL;
--   SELECT count(*) FROM leads WHERE debutante_id IS NOT NULL AND lower(coalesce(source_name,'')) LIKE 'indica%' AND contact_id IS NULL;
--   (restantes por telefone invalido/ausente: SELECT id, name, phone FROM leads WHERE ... para revisao manual)
-- ==============================================================================
