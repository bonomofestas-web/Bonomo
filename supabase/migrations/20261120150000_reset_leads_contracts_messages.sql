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
--   contacts, contact_dependents, contact_venue_access, contact_dedupe_log, venues, sources, funis,
--   equipe, metas, configuracoes, debutantes/guests, tarefas e compromissos sem lead.
--
-- SEGURANCA
--   1. TRAVA: nada e apagado enquanto v_confirm continuar 'NAO'. Mude para 'SIM' (linha marcada abaixo).
--   2. BACKUP: antes de apagar, copia as tabelas afetadas para o schema reset_backup_20261120 (mesma transacao).
--      Esse schema NAO e exposto pela API. Quando tiver certeza, remova com:
--        DROP SCHEMA reset_backup_20261120 CASCADE;
--      Os ARQUIVOS (fotos, audios, videos, documentos no Cloudflare R2) nao fazem parte do backup do banco.
--   3. Tudo roda em um unico bloco (atomico): se qualquer passo falhar, nada e apagado.
--   4. Faca TAMBEM o backup externo antes:  npm run backup:db
--
-- RECOMENDADO: pause as mensagens antes (migration 20261120140000) e publique o app/webhook novos.
-- Depois do reset, rode a dedupe de contatos (20261120160000) e a limpeza do R2 (npm run clean:r2-leads).
-- ==============================================================================

DO $$
DECLARE
    -- >>>>>>>>>> TRAVA DE CONFIRMACAO: troque 'NAO' por 'SIM' para executar de verdade <<<<<<<<<<
    v_confirm CONSTANT TEXT := 'NAO';

    v_schema  CONSTANT TEXT := 'reset_backup_20261120';
    v_tables  TEXT[] := ARRAY[
        'leads', 'lead_activities', 'lead_participants', 'lead_stage_history',
        'contracts', 'contract_funnel_placements', 'event_schedules', 'clients', 'whatsapp_media'
    ];
    t   TEXT;
    rec RECORD;
    n   BIGINT;
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

    RAISE NOTICE 'RESET CONCLUIDO. contacts permaneceu intacto. Backup em %.', v_schema;
END $$;

-- ==============================================================================
-- CONFERENCIA (rodar depois; leads/contratos/mensagens devem estar em 0, contacts inalterado)
--   SELECT 'leads' t, count(*) FROM leads UNION ALL SELECT 'lead_activities', count(*) FROM lead_activities
--   UNION ALL SELECT 'contracts', count(*) FROM contracts UNION ALL SELECT 'clients', count(*) FROM clients
--   UNION ALL SELECT 'whatsapp_media', count(*) FROM whatsapp_media UNION ALL SELECT 'contacts', count(*) FROM contacts;
--
-- REVERTER (se precisar, ANTES de apagar o schema de backup), exemplo para leads:
--   INSERT INTO public.leads SELECT * FROM reset_backup_20261120.leads;
--   (restaure na ordem inversa da exclusao: leads -> lead_participants/lead_stage_history -> lead_activities ->
--    contracts -> contract_funnel_placements/event_schedules -> clients -> whatsapp_media)
-- ==============================================================================
