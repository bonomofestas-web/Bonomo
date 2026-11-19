-- ==============================================================================
-- F5 SYSTEM • REMOCAO DE CONTATOS DUPLICADOS — MANTEM O REGISTRO MAIS ANTIGO
-- Data: 2026-11-20
-- Depende de: 20261114200000 (contacts) e, de preferencia, roda DEPOIS do reset (20261120150000),
--             quando nenhum lead/contrato aponta mais para contatos (mescla simples e sem risco).
--
-- REGRAS
--  * Isolamento: toda comparacao e feita DENTRO do mesmo master_id.
--  * Duplicado = mesmo TELEFONE normalizado (so digitos, sem DDI 55; celular de 10 digitos DDD+8 recebe o 9o digito
--    para casar com DDD+9+8) ou mesmo CPF (11 digitos). Chave NUNCA usa: 'sem-telefone-*', numeros com menos de
--    10 digitos, nem formato LID (14+ digitos).
--  * Mantem sempre o mais antigo (created_at ASC, id ASC). O perdedor NUNCA e apagado: recebe deleted_at
--    (as listas e a busca ja ignoram deleted_at) e fica registrado em contact_dedupe_log. Reversivel:
--      UPDATE public.contacts SET deleted_at = NULL WHERE id = '<removed_id>';
--  * Mesmo telefone com NOMES incompativeis (ex.: mae e filha) NAO e mesclado: vai ao log com
--    reason = 'manual_review' (applied = false) para decisao humana.
--  * Dados do mantido so sao COMPLETADOS (campos vazios); nada e sobrescrito. primary_phone nao e reescrito.
--  * Contratos: contact_id e so o ponteiro; o snapshot do contrato nao e alterado.
--
-- ENSAIO: mude v_apply para FALSE abaixo para so registrar no log (sem alterar contatos).
-- Idempotente: reexecutar nao encontra novos duplicados.
-- ==============================================================================

-- 1. TABELA DE AUDITORIA (RLS ligado, sem policy: so service role / SQL Editor le e grava)
CREATE TABLE IF NOT EXISTS public.contact_dedupe_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL,
    keeper_id UUID NOT NULL,
    removed_id UUID NOT NULL,
    reason TEXT NOT NULL,
    match_key TEXT,
    applied BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.contact_dedupe_log ENABLE ROW LEVEL SECURITY;

-- 2. FUNCOES AUXILIARES (removidas no fim)
CREATE OR REPLACE FUNCTION public._dc_phone_key(p_phone TEXT)
RETURNS TEXT AS $$
DECLARE
    d TEXT;
BEGIN
    IF p_phone IS NULL OR p_phone ILIKE 'sem-telefone-%' THEN RETURN NULL; END IF;
    d := regexp_replace(p_phone, '\D', '', 'g');
    IF length(d) >= 12 AND d LIKE '55%' THEN d := substr(d, 3); END IF;
    -- celular antigo sem o 9o digito: DDD (2) + 8 digitos comecando em 6-9 -> acrescenta o 9
    IF length(d) = 10 AND substr(d, 3, 1) IN ('6', '7', '8', '9') THEN
        d := substr(d, 1, 2) || '9' || substr(d, 3);
    END IF;
    -- so numeros brasileiros completos (DDD + numero); descarta LID (14+), curtos e demais formatos
    IF length(d) NOT IN (10, 11) THEN RETURN NULL; END IF;
    RETURN d;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public._dc_cpf_key(p_cpf TEXT)
RETURNS TEXT AS $$
DECLARE
    d TEXT;
BEGIN
    IF p_cpf IS NULL THEN RETURN NULL; END IF;
    d := regexp_replace(p_cpf, '\D', '', 'g');
    IF length(d) <> 11 THEN RETURN NULL; END IF;
    RETURN d;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Reaponta uma coluna FK de uma tabela (se a tabela/coluna existir neste banco)
CREATE OR REPLACE FUNCTION public._dc_repoint(p_table TEXT, p_col TEXT, p_from UUID, p_to UUID)
RETURNS VOID AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = p_table AND column_name = p_col
    ) THEN
        BEGIN
            EXECUTE format('UPDATE public.%I SET %I = $1 WHERE %I = $2', p_table, p_col, p_col)
            USING p_to, p_from;
        EXCEPTION WHEN unique_violation THEN
            RAISE NOTICE 'dedupe: conflito de unique em %.% (de % para %); mantido no registro antigo', p_table, p_col, p_from, p_to;
        END;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Compatibilidade de nomes: evita unir pessoas diferentes que dividem o mesmo telefone (mae/filha).
-- Compativel = primeiro nome igual, um nome contem o outro, ou algum nome e generico ("Contato ...").
CREATE OR REPLACE FUNCTION public._dc_names_compatible(a TEXT, b TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    na TEXT;
    nb TEXT;
BEGIN
    na := trim(regexp_replace(translate(lower(COALESCE(a, '')), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn'), '[^a-z ]', '', 'g'));
    nb := trim(regexp_replace(translate(lower(COALESCE(b, '')), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn'), '[^a-z ]', '', 'g'));
    IF na = '' OR nb = '' THEN RETURN TRUE; END IF;
    IF na LIKE 'contato%' OR nb LIKE 'contato%' OR na LIKE 'cliente%' OR nb LIKE 'cliente%'
       OR na LIKE 'sem nome%' OR nb LIKE 'sem nome%' THEN RETURN TRUE; END IF;
    RETURN split_part(na, ' ', 1) = split_part(nb, ' ', 1)
        OR position(na IN nb) > 0 OR position(nb IN na) > 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public._dc_merge_contact(
    p_keeper UUID, p_loser UUID, p_master UUID, p_reason TEXT, p_key TEXT, p_apply BOOLEAN
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.contact_dedupe_log (master_id, keeper_id, removed_id, reason, match_key, applied)
    VALUES (p_master, p_keeper, p_loser, p_reason, p_key, p_apply);
    IF NOT p_apply THEN RETURN; END IF;

    -- Ponteiros (se ainda houver leads/contratos/etc. ligados ao duplicado)
    PERFORM public._dc_repoint('leads', 'contact_id', p_loser, p_keeper);
    PERFORM public._dc_repoint('contracts', 'contact_id', p_loser, p_keeper);
    PERFORM public._dc_repoint('clients', 'migrated_to_contact_id', p_loser, p_keeper);
    PERFORM public._dc_repoint('event_schedules', 'contact_id', p_loser, p_keeper);
    PERFORM public._dc_repoint('referrals', 'contact_id', p_loser, p_keeper);

    -- Acesso por unidade: soma no mantido (UNIQUE contact_id + venue_id)
    INSERT INTO public.contact_venue_access
        (master_id, contact_id, venue_id, first_interaction_at, last_interaction_at, origin_source_id)
    SELECT master_id, p_keeper, venue_id, first_interaction_at, last_interaction_at, origin_source_id
    FROM public.contact_venue_access WHERE contact_id = p_loser
    ON CONFLICT (contact_id, venue_id) DO UPDATE SET
        first_interaction_at = LEAST(public.contact_venue_access.first_interaction_at, EXCLUDED.first_interaction_at),
        last_interaction_at  = GREATEST(public.contact_venue_access.last_interaction_at, EXCLUDED.last_interaction_at);
    DELETE FROM public.contact_venue_access WHERE contact_id = p_loser;

    -- Dependentes: evita auto-referencia e pares repetidos (UNIQUE parent + dependent)
    DELETE FROM public.contact_dependents
    WHERE (parent_contact_id = p_loser AND dependent_contact_id = p_keeper)
       OR (parent_contact_id = p_keeper AND dependent_contact_id = p_loser);
    UPDATE public.contact_dependents d SET parent_contact_id = p_keeper
    WHERE d.parent_contact_id = p_loser
      AND NOT EXISTS (SELECT 1 FROM public.contact_dependents x
                      WHERE x.parent_contact_id = p_keeper AND x.dependent_contact_id = d.dependent_contact_id);
    UPDATE public.contact_dependents d SET dependent_contact_id = p_keeper
    WHERE d.dependent_contact_id = p_loser
      AND NOT EXISTS (SELECT 1 FROM public.contact_dependents x
                      WHERE x.dependent_contact_id = p_keeper AND x.parent_contact_id = d.parent_contact_id);
    DELETE FROM public.contact_dependents WHERE parent_contact_id = p_loser OR dependent_contact_id = p_loser;

    -- Completa so os campos vazios do mantido com os do duplicado
    UPDATE public.contacts k SET
        secondary_phone     = COALESCE(NULLIF(k.secondary_phone, ''), l.secondary_phone),
        email               = COALESCE(NULLIF(k.email, ''), l.email),
        cpf                 = COALESCE(NULLIF(k.cpf, ''), l.cpf),
        rg                  = COALESCE(NULLIF(k.rg, ''), l.rg),
        birth_date          = COALESCE(k.birth_date, l.birth_date),
        profile_picture_url = COALESCE(NULLIF(k.profile_picture_url, ''), l.profile_picture_url),
        postal_code         = COALESCE(NULLIF(k.postal_code, ''), l.postal_code),
        street              = COALESCE(NULLIF(k.street, ''), l.street),
        number              = COALESCE(NULLIF(k.number, ''), l.number),
        complement          = COALESCE(NULLIF(k.complement, ''), l.complement),
        neighborhood        = COALESCE(NULLIF(k.neighborhood, ''), l.neighborhood),
        city                = COALESCE(NULLIF(k.city, ''), l.city),
        state               = COALESCE(NULLIF(k.state, ''), l.state),
        family_group_id     = COALESCE(k.family_group_id, l.family_group_id),
        updated_at          = timezone('utc'::text, now())
    FROM public.contacts l
    WHERE k.id = p_keeper AND l.id = p_loser;

    UPDATE public.contacts
    SET deleted_at = timezone('utc'::text, now()), updated_at = timezone('utc'::text, now())
    WHERE id = p_loser;
END;
$$ LANGUAGE plpgsql;

-- 3. EXECUCAO
DO $$
DECLARE
    -- >>>>>>>>>> ENSAIO: FALSE = so registra no contact_dedupe_log, sem alterar contatos <<<<<<<<<<
    v_apply BOOLEAN := TRUE;
    rec RECORD;
    v_merged INT := 0;
    v_review INT := 0;
BEGIN
    -- limpa so o que ficou pendente de revisao/ensaio em execucoes anteriores
    DELETE FROM public.contact_dedupe_log WHERE applied = FALSE;

    -- 3.1 Duplicados por telefone normalizado (mantem o mais antigo)
    FOR rec IN
        WITH keyed AS (
            SELECT id, name, master_id, created_at, public._dc_phone_key(primary_phone) AS k
            FROM public.contacts WHERE deleted_at IS NULL
        ), ranked AS (
            SELECT *,
                   first_value(id)   OVER (PARTITION BY master_id, k ORDER BY created_at ASC, id ASC) AS keeper_id,
                   first_value(name) OVER (PARTITION BY master_id, k ORDER BY created_at ASC, id ASC) AS keeper_name
            FROM keyed WHERE k IS NOT NULL
        )
        SELECT id AS loser_id, name AS loser_name, keeper_id, keeper_name, master_id, k
        FROM ranked WHERE id <> keeper_id
        ORDER BY master_id, k, loser_id
    LOOP
        -- pode ja ter sido mesclado nesta mesma passada
        CONTINUE WHEN NOT EXISTS (SELECT 1 FROM public.contacts WHERE id = rec.loser_id AND deleted_at IS NULL);
        -- mesmo telefone, nomes diferentes (mae/filha): NAO mescla
        IF NOT public._dc_names_compatible(rec.loser_name, rec.keeper_name) THEN
            INSERT INTO public.contact_dedupe_log (master_id, keeper_id, removed_id, reason, match_key, applied)
            VALUES (rec.master_id, rec.keeper_id, rec.loser_id, 'manual_review', rec.k, FALSE);
            v_review := v_review + 1;
            CONTINUE;
        END IF;
        PERFORM public._dc_merge_contact(rec.keeper_id, rec.loser_id, rec.master_id, 'same_phone', rec.k, v_apply);
        v_merged := v_merged + 1;
    END LOOP;

    -- 3.2 Duplicados por CPF (so se aplicando: depois da passada de telefone, os ativos ja refletem as mesclas)
    IF v_apply THEN
        FOR rec IN
            WITH keyed AS (
                SELECT id, master_id, created_at, public._dc_cpf_key(cpf) AS k
                FROM public.contacts WHERE deleted_at IS NULL
            ), ranked AS (
                SELECT *, first_value(id) OVER (PARTITION BY master_id, k ORDER BY created_at ASC, id ASC) AS keeper_id
                FROM keyed WHERE k IS NOT NULL
            )
            SELECT id AS loser_id, keeper_id, master_id, k FROM ranked WHERE id <> keeper_id
            ORDER BY master_id, k, loser_id
        LOOP
            PERFORM public._dc_merge_contact(rec.keeper_id, rec.loser_id, rec.master_id, 'same_cpf', rec.k, v_apply);
            v_merged := v_merged + 1;
        END LOOP;
    END IF;

    RAISE NOTICE 'Dedupe de contatos (apply=%): mesclados=%, para revisao manual (nomes diferentes no mesmo telefone)=%',
        v_apply, v_merged, v_review;
END $$;

-- 4. LIMPEZA DAS FUNCOES AUXILIARES
DROP FUNCTION IF EXISTS public._dc_merge_contact(UUID, UUID, UUID, TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public._dc_repoint(TEXT, TEXT, UUID, UUID);
DROP FUNCTION IF EXISTS public._dc_names_compatible(TEXT, TEXT);
DROP FUNCTION IF EXISTS public._dc_cpf_key(TEXT);
DROP FUNCTION IF EXISTS public._dc_phone_key(TEXT);

-- ==============================================================================
-- VALIDACAO (rodar depois; os dois primeiros devem retornar 0 linhas)
--   -- contatos ativos ainda duplicados por telefone (dentro do mesmo master)
--   SELECT master_id, regexp_replace(primary_phone,'\D','','g') AS fone, count(*)
--   FROM contacts WHERE deleted_at IS NULL AND primary_phone NOT ILIKE 'sem-telefone-%'
--   GROUP BY 1,2 HAVING count(*) > 1;
--   -- contatos ativos ainda duplicados por CPF
--   SELECT master_id, regexp_replace(cpf,'\D','','g') AS cpf, count(*) FROM contacts
--   WHERE deleted_at IS NULL AND length(regexp_replace(coalesce(cpf,''),'\D','','g')) = 11 GROUP BY 1,2 HAVING count(*) > 1;
--   -- grupos que ficaram para revisao manual (mesmo telefone, nomes diferentes)
--   SELECT * FROM contact_dedupe_log WHERE reason = 'manual_review' ORDER BY created_at DESC;
--   -- reversao de um contato: UPDATE contacts SET deleted_at = NULL WHERE id = '<removed_id>';
-- ==============================================================================
