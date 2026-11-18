-- Migration: Sincronização e cadastro idempotente de todos os decisores de contratos na Central de Contatos
-- Data: 2026-11-17
-- Autor: Squad F5 System (Barney Stinson & Ted Mosby)
-- Objetivo: Garantir que 100% dos decisores e contratantes de contratos (atuais e legados) existam na tabela contacts
--           com vínculos preservados por master_id e permissão de unidade em contact_venue_access.

DO $$
DECLARE
    rec RECORD;
    v_clean_phone TEXT;
    v_clean_cpf TEXT;
    v_contact_name TEXT;
    v_contact_id UUID;
    v_target_venue UUID;
    v_clean_code TEXT;
BEGIN
    -- 1. Sincronizar todos os Contratos para a Central de Contatos
    FOR rec IN 
        SELECT 
            c.id AS contract_id,
            c.master_id,
            c.venue_id,
            c.contact_id AS current_contact_id,
            c.contract_code,
            c.event_title,
            c.client_snapshot,
            cli.id AS client_id,
            cli.payer_name AS cli_payer_name,
            cli.payer_phone AS cli_payer_phone,
            cli.payer_cpf AS cli_payer_cpf,
            cli.payer_email AS cli_payer_email,
            cli.payer_address AS cli_payer_address,
            cli.payer_neighborhood AS cli_payer_neighborhood,
            cli.payer_city AS cli_payer_city,
            cli.payer_relationship AS cli_payer_relationship,
            c.created_at
        FROM public.contracts c
        LEFT JOIN public.clients cli ON cli.id = c.client_id
    LOOP
        v_target_venue := rec.venue_id;

        -- Extração e sanitização dos dados do decisor
        v_clean_phone := regexp_replace(
            COALESCE(
                NULLIF(rec.client_snapshot->>'phone', ''),
                NULLIF(rec.client_snapshot->>'payerPhone', ''),
                NULLIF(rec.cli_payer_phone, ''),
                ''
            ), 
            '\D', '', 'g'
        );

        v_clean_cpf := regexp_replace(
            COALESCE(
                NULLIF(rec.client_snapshot->>'cpf', ''),
                NULLIF(rec.client_snapshot->>'payerCpf', ''),
                NULLIF(rec.cli_payer_cpf, ''),
                ''
            ), 
            '\D', '', 'g'
        );

        v_contact_name := TRIM(COALESCE(
            NULLIF(rec.client_snapshot->>'payerName', ''),
            NULLIF(rec.client_snapshot->>'name', ''),
            NULLIF(rec.cli_payer_name, ''),
            NULLIF(rec.event_title, ''),
            'Decisor ' || rec.contract_code
        ));

        -- Limpa prefixos de códigos de lead se houver nome legível
        IF v_contact_name ~* '^LEAD-' AND (rec.client_snapshot->>'payerName' IS NOT NULL AND rec.client_snapshot->>'payerName' != '') THEN
            v_contact_name := TRIM(rec.client_snapshot->>'payerName');
        END IF;

        v_contact_id := NULL;

        -- Tenta localizar contato existente por CPF
        IF v_clean_cpf IS NOT NULL AND length(v_clean_cpf) = 11 THEN
            SELECT id INTO v_contact_id 
            FROM public.contacts 
            WHERE master_id = rec.master_id 
              AND cpf = v_clean_cpf 
              AND deleted_at IS NULL 
            LIMIT 1;
        END IF;

        -- Tenta localizar contato existente por Telefone (se não achou por CPF)
        IF v_contact_id IS NULL AND v_clean_phone IS NOT NULL AND length(v_clean_phone) >= 8 THEN
            SELECT id INTO v_contact_id 
            FROM public.contacts 
            WHERE master_id = rec.master_id 
              AND primary_phone = v_clean_phone 
              AND deleted_at IS NULL 
            LIMIT 1;
        END IF;

        -- Tenta usar o contato atual se já estiver vinculado e for válido
        IF v_contact_id IS NULL AND rec.current_contact_id IS NOT NULL THEN
            SELECT id INTO v_contact_id 
            FROM public.contacts 
            WHERE id = rec.current_contact_id 
              AND master_id = rec.master_id 
              AND deleted_at IS NULL;
        END IF;

        -- Se não existe, cria novo registro na Central de Contatos
        IF v_contact_id IS NULL THEN
            v_clean_code := public.generate_alphanumeric_code('CONT', 8);
            
            INSERT INTO public.contacts (
                master_id,
                code,
                name,
                primary_phone,
                email,
                cpf,
                street,
                neighborhood,
                city,
                relationship_role,
                created_at,
                updated_at
            ) VALUES (
                rec.master_id,
                v_clean_code,
                v_contact_name,
                COALESCE(NULLIF(v_clean_phone, ''), 'Não informado'),
                NULLIF(COALESCE(rec.client_snapshot->>'email', rec.client_snapshot->>'payerEmail', rec.cli_payer_email, ''), ''),
                NULLIF(v_clean_cpf, ''),
                COALESCE(rec.client_snapshot->>'address', rec.cli_payer_address),
                COALESCE(rec.client_snapshot->>'neighborhood', rec.cli_payer_neighborhood),
                COALESCE(rec.client_snapshot->>'city', rec.cli_payer_city),
                COALESCE(rec.client_snapshot->>'payerRelationship', rec.cli_payer_relationship, 'Contratante'),
                COALESCE(rec.created_at, now()),
                now()
            )
            RETURNING id INTO v_contact_id;
        ELSE
            -- Se o contato existente possuir nome genérico e temos um nome limpo, enriquece
            UPDATE public.contacts
            SET 
                name = CASE 
                    WHEN (name ~* '^Contato [0-9]+' OR name ~* '^LEAD-') AND v_contact_name !~* '^LEAD-' THEN v_contact_name
                    ELSE name 
                END,
                cpf = COALESCE(cpf, NULLIF(v_clean_cpf, '')),
                email = COALESCE(email, NULLIF(COALESCE(rec.client_snapshot->>'email', rec.client_snapshot->>'payerEmail', rec.cli_payer_email, ''), ''))
            WHERE id = v_contact_id;
        END IF;

        -- Garante que o contrato aponte para o contact_id correto
        UPDATE public.contracts 
        SET contact_id = v_contact_id 
        WHERE id = rec.contract_id AND (contact_id IS NULL OR contact_id != v_contact_id);

        -- Garante permissão de unidade (Multi-Venues) em contact_venue_access
        IF v_target_venue IS NOT NULL AND v_contact_id IS NOT NULL THEN
            INSERT INTO public.contact_venue_access (
                master_id,
                contact_id,
                venue_id,
                first_interaction_at,
                last_interaction_at
            ) VALUES (
                rec.master_id,
                v_contact_id,
                v_target_venue,
                COALESCE(rec.created_at, now()),
                now()
            )
            ON CONFLICT (contact_id, venue_id) DO NOTHING;
        END IF;

        -- Se houver registro em clients vinculado, atualiza migrated_to_contact_id
        IF rec.client_id IS NOT NULL THEN
            UPDATE public.clients
            SET migrated_to_contact_id = v_contact_id,
                migrated_to_contract_id = rec.contract_id,
                migrated_at = COALESCE(migrated_at, now())
            WHERE id = rec.client_id AND (migrated_to_contact_id IS NULL OR migrated_to_contact_id != v_contact_id);
        END IF;

    END LOOP;

    -- 2. Backfill para clientes remanescentes em public.clients que não possuíam contrato direto
    FOR rec IN 
        SELECT 
            cli.id AS client_id,
            cli.master_id,
            cli.venue_id,
            cli.code,
            cli.name,
            cli.payer_name,
            cli.payer_phone,
            cli.payer_cpf,
            cli.payer_email,
            cli.payer_address,
            cli.payer_neighborhood,
            cli.payer_city,
            cli.payer_relationship,
            cli.created_at
        FROM public.clients cli
        WHERE cli.migrated_to_contact_id IS NULL
          AND cli.master_id IS NOT NULL -- contatos exigem master_id (isolamento entre Masters)
    LOOP
        v_clean_phone := regexp_replace(COALESCE(rec.payer_phone, ''), '\D', '', 'g');
        v_clean_cpf := regexp_replace(COALESCE(rec.payer_cpf, ''), '\D', '', 'g');
        v_contact_name := TRIM(COALESCE(NULLIF(rec.payer_name, ''), NULLIF(rec.name, ''), 'Cliente ' || rec.code));
        v_contact_id := NULL;

        IF v_clean_cpf IS NOT NULL AND length(v_clean_cpf) = 11 THEN
            SELECT id INTO v_contact_id FROM public.contacts WHERE master_id = rec.master_id AND cpf = v_clean_cpf AND deleted_at IS NULL LIMIT 1;
        END IF;

        IF v_contact_id IS NULL AND v_clean_phone IS NOT NULL AND length(v_clean_phone) >= 8 THEN
            SELECT id INTO v_contact_id FROM public.contacts WHERE master_id = rec.master_id AND primary_phone = v_clean_phone AND deleted_at IS NULL LIMIT 1;
        END IF;

        IF v_contact_id IS NULL THEN
            v_clean_code := public.generate_alphanumeric_code('CONT', 8);
            INSERT INTO public.contacts (
                master_id, code, name, primary_phone, email, cpf, street, neighborhood, city, relationship_role, created_at, updated_at
            ) VALUES (
                rec.master_id,
                v_clean_code,
                v_contact_name,
                COALESCE(NULLIF(v_clean_phone, ''), 'Não informado'),
                rec.payer_email,
                NULLIF(v_clean_cpf, ''),
                rec.payer_address,
                rec.payer_neighborhood,
                rec.payer_city,
                COALESCE(rec.payer_relationship, 'Contratante'),
                COALESCE(rec.created_at, now()),
                now()
            ) RETURNING id INTO v_contact_id;
        END IF;

        UPDATE public.clients SET migrated_to_contact_id = v_contact_id WHERE id = rec.client_id;

        IF rec.venue_id IS NOT NULL AND v_contact_id IS NOT NULL THEN
            INSERT INTO public.contact_venue_access (master_id, contact_id, venue_id, first_interaction_at, last_interaction_at)
            VALUES (rec.master_id, v_contact_id, rec.venue_id, COALESCE(rec.created_at, now()), now())
            ON CONFLICT (contact_id, venue_id) DO NOTHING;
        END IF;
    END LOOP;

    -- 3. Recarrega cache de schema do PostgREST
    PERFORM pg_notify('pgrst', 'reload schema');
END $$;
