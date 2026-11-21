-- ==============================================================================
-- F5 SYSTEM • RESET: APAGA TODOS OS LEADS, MENSAGENS, CONTRATOS E CLIENTES DO POS-VENDA
-- Data: 2026-11-20
--
-- !!! OPERACAO IRREVERSIVEL (com copia de seguranca dentro do banco, ver abaixo) !!!
--
-- O QUE APAGA (todos os Masters; decisao do usuario: so existe o Master da Bonomo)
--   * Mensagens/conversas:   lead_activities, whatsapp_media
--   * Leads:                 leads  (+ por cascata: lead_participants, lead_stage_history)
--                            admin_tasks e appointments QUE TENHAM lead_id (tarefas/compromissos avulsos ficam)
--   * Contratos:             contract_funnel_placements, event_schedules, contracts
--   * Pos-venda legado:      clients  (inclui activities/documents em JSON = mensagens e anexos do cliente)
--   * Residuos:              notifications ligadas a lead/contrato/placement e dos tipos
--                            message/new_opportunity/contract/post_sale, lead_dedupe_log
--   * Solta vinculo (NULL):  source_events.lead_id, referrals.lead_id
--
-- O QUE NAO TOCA
--   contacts (so recebem deleted_at os DUPLICADOS na dedupe), contact_dependents, contact_venue_access,
--   contact_dedupe_log, venues, sources, funis, equipe, metas, configuracoes, debutantes/guests,
--   tarefas e compromissos sem lead.
--
-- SEGURANCA
--   1. TRAVA: nada e apagado enquanto v_confirm for 'NAO'. NESTA COPIA ESTA 'SIM' (pronto para executar).
--   2. BACKUP: antes de apagar, copia as tabelas afetadas para o schema reset_backup_20261120 (mesma transacao).
--      Esse schema NAO e exposto pela API. Quando tiver certeza, remova com:
--        DROP SCHEMA reset_backup_20261120 CASCADE;
--      Os ARQUIVOS (fotos, audios, videos, documentos no Cloudflare R2) nao fazem parte do backup do banco.
--   3. Tudo roda em um unico bloco (atomico): se qualquer passo falhar, nada e apagado.
--   4. Faca TAMBEM o backup externo antes:  npm run backup:db
--
-- INCLUI A DEDUPE DE CONTATOS (no mesmo bloco, depois do reset): mesmo telefone normalizado ou mesmo CPF,
-- dentro do mesmo master_id. Mantem o contato MAIS ANTIGO; o duplicado NAO e apagado: recebe deleted_at e fica em
-- contact_dedupe_log (reversivel: UPDATE contacts SET deleted_at = NULL WHERE id = '<removed_id>').
-- Mesmo telefone com nomes incompativeis (mae/filha) NAO e mesclado: vai ao log como 'manual_review'.
-- Para fazer so o reset sem dedupe, troque v_dedupe por FALSE (linha marcada abaixo).
--
-- RECOMENDADO: pause as mensagens antes (migration 20261120140000) e publique o app/webhook novos.
-- Depois: limpeza do R2 (npm run clean:r2-leads). A migration 20261120160000 (dedupe isolada) passa a ser opcional.
-- ==============================================================================

-- ---- Auditoria e funcoes auxiliares da dedupe (as funcoes sao removidas no fim do arquivo) ----
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

CREATE OR REPLACE FUNCTION public._dc_phone_key(p_phone TEXT)
RETURNS TEXT AS $f$
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
$f$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public._dc_cpf_key(p_cpf TEXT)
RETURNS TEXT AS $f$
DECLARE
    d TEXT;
BEGIN
    IF p_cpf IS NULL THEN RETURN NULL; END IF;
    d := regexp_replace(p_cpf, '\D', '', 'g');
    IF length(d) <> 11 THEN RETURN NULL; END IF;
    RETURN d;
END;
$f$ LANGUAGE plpgsql IMMUTABLE;

-- Reaponta uma coluna FK (so se a tabela/coluna existir neste banco)
CREATE OR REPLACE FUNCTION public._dc_repoint(p_table TEXT, p_col TEXT, p_from UUID, p_to UUID)
RETURNS VOID AS $f$
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
$f$ LANGUAGE plpgsql;

-- Evita unir pessoas diferentes que dividem o mesmo telefone (mae/filha).
CREATE OR REPLACE FUNCTION public._dc_names_compatible(a TEXT, b TEXT)
RETURNS BOOLEAN AS $f$
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
$f$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public._dc_merge_contact(
    p_keeper UUID, p_loser UUID, p_master UUID, p_reason TEXT, p_key TEXT, p_apply BOOLEAN
) RETURNS VOID AS $f$
BEGIN
    INSERT INTO public.contact_dedupe_log (master_id, keeper_id, removed_id, reason, match_key, applied)
    VALUES (p_master, p_keeper, p_loser, p_reason, p_key, p_apply);
    IF NOT p_apply THEN RETURN; END IF;

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

    -- Dependentes: evita auto-referencia e pares repetidos
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
$f$ LANGUAGE plpgsql;

DO $$
DECLARE
    -- >>>>>>>>>> TRAVA DE CONFIRMACAO: 'SIM' = executa de verdade; 'NAO' = nada e alterado <<<<<<<<<<
    v_confirm CONSTANT TEXT := 'SIM';
    -- >>>>>>>>>> DEDUPE DE CONTATOS depois do reset: TRUE = aplica; FALSE = so o reset <<<<<<<<<<
    v_dedupe  CONSTANT BOOLEAN := TRUE;

    v_schema  CONSTANT TEXT := 'reset_backup_20261120';
    v_tables  TEXT[] := ARRAY[
        'leads', 'lead_activities', 'lead_participants', 'lead_stage_history',
        'contracts', 'contract_funnel_placements', 'event_schedules', 'clients', 'whatsapp_media'
    ];
    t   TEXT;
    rec RECORD;
    n   BIGINT;
    v_merged INT := 0;
    v_review INT := 0;
BEGIN
    IF v_confirm <> 'SIM' THEN
        RAISE NOTICE 'RESET NAO EXECUTADO: v_confirm = % (mude para SIM para apagar). Nada foi alterado.', v_confirm;
        RETURN;
    END IF;

    -- ------------------------------------------------------------------
    -- 1. BACKUP DENTRO DO BANCO
    -- ------------------------------------------------------------------
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', v_schema);

    FOREACH t IN ARRAY v_tables LOOP
        IF to_regclass('public.' || t) IS NOT NULL THEN
            EXECUTE format('DROP TABLE IF EXISTS %I.%I', v_schema, t);
            EXECUTE format('CREATE TABLE %I.%I AS TABLE public.%I', v_schema, t, t);
        END IF;
    END LOOP;

    -- Tarefas e compromissos so os que tem lead_id (os avulsos nao serao apagados)
    FOREACH t IN ARRAY ARRAY['admin_tasks', 'appointments'] LOOP
        IF to_regclass('public.' || t) IS NOT NULL
           AND EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = 'public' AND table_name = t AND column_name = 'lead_id') THEN
            EXECUTE format('DROP TABLE IF EXISTS %I.%I', v_schema, t);
            EXECUTE format('CREATE TABLE %I.%I AS SELECT * FROM public.%I WHERE lead_id IS NOT NULL', v_schema, t, t);
        END IF;
    END LOOP;

    IF to_regclass('public.notifications') IS NOT NULL THEN
        EXECUTE format('DROP TABLE IF EXISTS %I.notifications', v_schema);
        EXECUTE format($q$CREATE TABLE %I.notifications AS
            SELECT * FROM public.notifications
            WHERE entity_type IN ('lead', 'contract', 'placement')
               OR type IN ('message', 'new_opportunity', 'contract', 'post_sale')$q$, v_schema);
    END IF;

    RAISE NOTICE 'Backup criado no schema %. Remova depois com: DROP SCHEMA % CASCADE;', v_schema, v_schema;

    -- ------------------------------------------------------------------
    -- 2. CONTAGENS ANTES
    -- ------------------------------------------------------------------
    FOREACH t IN ARRAY (v_tables || ARRAY['admin_tasks', 'appointments', 'notifications', 'contacts']) LOOP
        IF to_regclass('public.' || t) IS NOT NULL THEN
            EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
            RAISE NOTICE 'ANTES  | % = %', rpad(t, 28), n;
        END IF;
    END LOOP;

    -- ------------------------------------------------------------------
    -- 3. EXCLUSAO (ordem respeita as FKs; contracts/leads -> contacts sao RESTRICT, entao filhos primeiro)
    -- ------------------------------------------------------------------
    FOR rec IN
        SELECT * FROM (VALUES
            (1,  'whatsapp_media',              'true',                                                              NULL::TEXT),
            (2,  'lead_activities',             'true',                                                              NULL),
            (3,  'admin_tasks',                 'lead_id IS NOT NULL',                                               'lead_id'),
            (4,  'appointments',                'lead_id IS NOT NULL',                                               'lead_id'),
            (5,  'notifications',               $c$entity_type IN ('lead','contract','placement') OR type IN ('message','new_opportunity','contract','post_sale')$c$, 'entity_type'),
            (6,  'contract_funnel_placements',  'true',                                                              NULL),
            (7,  'event_schedules',             'true',                                                              NULL),
            (8,  'contracts',                   'true',                                                              NULL),
            (9,  'clients',                     'true',                                                              NULL),
            (10, 'lead_participants',           'true',                                                              NULL),
            (11, 'lead_stage_history',          'true',                                                              NULL),
            (12, 'leads',                       'true',                                                              NULL),
            (13, 'lead_dedupe_log',             'true',                                                              NULL)
        ) AS v(ord, tbl, cond, req_col)
        ORDER BY ord
    LOOP
        IF to_regclass('public.' || rec.tbl) IS NULL THEN
            CONTINUE;
        END IF;
        IF rec.req_col IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = rec.tbl AND column_name = rec.req_col
        ) THEN
            RAISE NOTICE 'IGNORADO | % (coluna % inexistente)', rec.tbl, rec.req_col;
            CONTINUE;
        END IF;
        EXECUTE format('DELETE FROM public.%I WHERE %s', rec.tbl, rec.cond);
        GET DIAGNOSTICS n = ROW_COUNT;
        RAISE NOTICE 'APAGADO | % = % linha(s)', rpad(rec.tbl, 28), n;
    END LOOP;

    -- Solta o vinculo (mantem o historico de origem e de indicacoes)
    FOREACH t IN ARRAY ARRAY['source_events', 'referrals'] LOOP
        IF to_regclass('public.' || t) IS NOT NULL
           AND EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = 'public' AND table_name = t AND column_name = 'lead_id') THEN
            EXECUTE format('UPDATE public.%I SET lead_id = NULL WHERE lead_id IS NOT NULL', t);
            GET DIAGNOSTICS n = ROW_COUNT;
            RAISE NOTICE 'DESVINCULADO | %.lead_id = NULL em % linha(s)', t, n;
        END IF;
    END LOOP;

    -- ------------------------------------------------------------------
    -- 4. CONTAGENS DEPOIS
    -- ------------------------------------------------------------------
    FOREACH t IN ARRAY (v_tables || ARRAY['admin_tasks', 'appointments', 'notifications', 'contacts']) LOOP
        IF to_regclass('public.' || t) IS NOT NULL THEN
            EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
            RAISE NOTICE 'DEPOIS | % = %', rpad(t, 28), n;
        END IF;
    END LOOP;

    RAISE NOTICE 'RESET CONCLUIDO. Backup em %.', v_schema;

    -- ------------------------------------------------------------------
    -- 5. DEDUPE DE CONTATOS (depois do reset: sem leads/contratos apontando para contatos)
    -- ------------------------------------------------------------------
    IF v_dedupe THEN
        -- limpa so o que ficou pendente de revisao em execucoes anteriores
        DELETE FROM public.contact_dedupe_log WHERE applied = FALSE;

        -- 5.1 Duplicados por telefone normalizado (mantem o mais antigo)
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
            CONTINUE WHEN NOT EXISTS (SELECT 1 FROM public.contacts WHERE id = rec.loser_id AND deleted_at IS NULL);
            -- mesmo telefone, nomes diferentes (mae/filha): NAO mescla, vai para revisao manual
            IF NOT public._dc_names_compatible(rec.loser_name, rec.keeper_name) THEN
                INSERT INTO public.contact_dedupe_log (master_id, keeper_id, removed_id, reason, match_key, applied)
                VALUES (rec.master_id, rec.keeper_id, rec.loser_id, 'manual_review', rec.k, FALSE);
                v_review := v_review + 1;
                CONTINUE;
            END IF;
            PERFORM public._dc_merge_contact(rec.keeper_id, rec.loser_id, rec.master_id, 'same_phone', rec.k, TRUE);
            v_merged := v_merged + 1;
        END LOOP;

        -- 5.2 Duplicados por CPF (entre os que ainda estao ativos)
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
            PERFORM public._dc_merge_contact(rec.keeper_id, rec.loser_id, rec.master_id, 'same_cpf', rec.k, TRUE);
            v_merged := v_merged + 1;
        END LOOP;

        SELECT count(*) INTO n FROM public.contacts WHERE deleted_at IS NULL;
        RAISE NOTICE 'DEDUPE | contatos mesclados = %, para revisao manual (mesmo telefone, nomes diferentes) = %, contatos ativos agora = %',
            v_merged, v_review, n;
    ELSE
        RAISE NOTICE 'DEDUPE PULADA (v_dedupe = FALSE). contacts permaneceu intacto.';
    END IF;
END $$;

-- Limpeza das funcoes auxiliares da dedupe
DROP FUNCTION IF EXISTS public._dc_merge_contact(UUID, UUID, UUID, TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public._dc_repoint(TEXT, TEXT, UUID, UUID);
DROP FUNCTION IF EXISTS public._dc_names_compatible(TEXT, TEXT);
DROP FUNCTION IF EXISTS public._dc_cpf_key(TEXT);
DROP FUNCTION IF EXISTS public._dc_phone_key(TEXT);

-- ==============================================================================
-- CONFERENCIA (rodar depois; leads/contratos/mensagens em 0; contacts = total antes menos os mesclados, via deleted_at)
--   -- contatos ativos ainda duplicados por telefone (deve dar 0 linhas)
--   SELECT master_id, regexp_replace(primary_phone,'\D','','g') AS fone, count(*) FROM contacts
--   WHERE deleted_at IS NULL AND primary_phone NOT ILIKE 'sem-telefone-%' GROUP BY 1,2 HAVING count(*) > 1;
--   -- para revisao manual (mesmo telefone, nomes diferentes)
--   SELECT * FROM contact_dedupe_log WHERE reason = 'manual_review' ORDER BY created_at DESC;
--   SELECT 'leads' t, count(*) FROM leads UNION ALL SELECT 'lead_activities', count(*) FROM lead_activities
--   UNION ALL SELECT 'contracts', count(*) FROM contracts UNION ALL SELECT 'clients', count(*) FROM clients
--   UNION ALL SELECT 'whatsapp_media', count(*) FROM whatsapp_media UNION ALL SELECT 'contacts', count(*) FROM contacts;
--
-- REVERTER (se precisar, ANTES de apagar o schema de backup), exemplo para leads:
--   INSERT INTO public.leads SELECT * FROM reset_backup_20261120.leads;
--   (restaure na ordem inversa da exclusao: leads -> lead_participants/lead_stage_history -> lead_activities ->
--    contracts -> contract_funnel_placements/event_schedules -> clients -> whatsapp_media)
-- ==============================================================================
