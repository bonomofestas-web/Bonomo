-- ==============================================================================
-- F5 SYSTEM • MIGRAÇÃO & LIMPEZA DA BASE LEGADA DE CLIENTES PARA CONTRATOS & CONTATOS
-- Versão: 1.3.0 • Data: 2026-11-16
-- Alinhamento: F5_SYSTEM_MASTER.md • Isolamento Master (master_id) & Multi-Venues
-- ==============================================================================

-- 1. ADIÇÃO DE COLUNAS DE RASTREIO E AUDITORIA NA TABELA LEGADA 'CLIENTS'
ALTER TABLE IF EXISTS public.clients
    ADD COLUMN IF NOT EXISTS migrated_to_contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS migrated_to_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS migrated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_clients_migrated_status ON public.clients (master_id, migrated_at);

-- 2. BLOCO PL/PGSQL IDEMPOTENTE: MIGRAÇÃO SEGURA SEM PERDA DE DADOS E SEM DUPLICIDADES
DO $$
DECLARE
    rec RECORD;
    v_clean_phone TEXT;
    v_contact_id UUID;
    v_contract_id UUID;
    v_contract_code TEXT;
    v_client_snapshot JSONB;
    v_is_completed BOOLEAN;
    v_migrated_count INT := 0;
    v_skipped_count INT := 0;
BEGIN
    RAISE NOTICE 'Iniciando migração de clientes legados para a Central de Contatos e Contratos...';

    FOR rec IN
        SELECT 
            c.id AS client_id,
            c.master_id,
            c.code AS client_code,
            c.commercial_lead_id,
            c.venue_id,
            c.funnel_id,
            c.stage,
            c.name AS client_name,
            COALESCE(NULLIF(c.payer_name, ''), c.name) AS contact_name,
            c.payer_phone AS contact_phone,
            c.payer_email AS contact_email,
            c.payer_cpf,
            c.payer_address,
            c.payer_neighborhood,
            c.payer_city,
            c.birthday_person_name,
            c.event_type,
            c.event_date,
            c.event_time,
            c.guest_count,
            c.package_sold,
            c.deal_value,
            c.notes,
            c.documents,
            c.created_at,
            c.migrated_at,
            c.migrated_to_contract_id
        FROM public.clients c
        WHERE c.master_id IS NOT NULL
    LOOP
        -- Normaliza telefone
        v_clean_phone := REGEXP_REPLACE(COALESCE(rec.contact_phone, ''), '\D', '', 'g');
        IF v_clean_phone = '' THEN
            v_clean_phone := 'sem-telefone-' || substr(rec.client_id::text, 1, 8);
        END IF;

        -- 1. Deduplicação e Vínculo com a Central de Contatos (contacts)
        v_contact_id := NULL;
        SELECT id INTO v_contact_id 
        FROM public.contacts 
        WHERE master_id = rec.master_id 
          AND (
            primary_phone = v_clean_phone 
            OR (LENGTH(v_clean_phone) >= 8 AND primary_phone ILIKE '%' || RIGHT(v_clean_phone, 8))
            OR (rec.payer_cpf IS NOT NULL AND cpf = rec.payer_cpf)
          )
          AND deleted_at IS NULL
        LIMIT 1;

        -- Se não existir contato, cria automaticamente com Base36
        IF v_contact_id IS NULL THEN
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
                public.generate_alphanumeric_code('CONT', 8),
                COALESCE(NULLIF(rec.contact_name, ''), NULLIF(rec.client_name, ''), 'Cliente ' || COALESCE(rec.client_code, '')),
                v_clean_phone,
                rec.contact_email,
                rec.payer_cpf,
                rec.payer_address,
                rec.payer_neighborhood,
                rec.payer_city,
                'Contratante',
                COALESCE(rec.created_at, now()),
                COALESCE(rec.created_at, now())
            )
            RETURNING id INTO v_contact_id;
        END IF;

        -- Vincula acesso à Casa de Festas (contact_venue_access)
        IF rec.venue_id IS NOT NULL AND v_contact_id IS NOT NULL THEN
            INSERT INTO public.contact_venue_access (
                master_id,
                contact_id,
                venue_id,
                first_interaction_at,
                last_interaction_at
            ) VALUES (
                rec.master_id,
                v_contact_id,
                rec.venue_id,
                COALESCE(rec.created_at, now()),
                now()
            )
            ON CONFLICT (contact_id, venue_id) DO NOTHING;
        END IF;

        -- 2. Migração para Contrato Formal (contracts)
        v_contract_id := NULL;
        IF rec.venue_id IS NOT NULL AND v_contact_id IS NOT NULL THEN
            -- Verifica se já existe contrato com este origin_lead_id ou contract_code
            SELECT id INTO v_contract_id
            FROM public.contracts
            WHERE master_id = rec.master_id
              AND (
                (rec.commercial_lead_id IS NOT NULL AND origin_lead_id = rec.commercial_lead_id)
                OR (rec.client_code IS NOT NULL AND contract_code = rec.client_code)
              )
            LIMIT 1;

            IF v_contract_id IS NULL THEN
                v_contract_code := COALESCE(
                    NULLIF(rec.client_code, ''),
                    public.generate_alphanumeric_code('CTR-' || to_char(COALESCE(rec.event_date, rec.created_at::date, now()::date), 'YYYY'), 6)
                );

                v_is_completed := (rec.stage IN ('completed', 'festa_realizada', 'concluido'));

                -- Constrói snapshot unilateral imutável
                v_client_snapshot := jsonb_build_object(
                    'name', COALESCE(rec.contact_name, rec.client_name),
                    'phone', v_clean_phone,
                    'email', rec.contact_email,
                    'cpf', rec.payer_cpf,
                    'address', rec.payer_address,
                    'neighborhood', rec.payer_neighborhood,
                    'city', rec.payer_city,
                    'birthday_person_name', rec.birthday_person_name,
                    'captured_at', COALESCE(rec.created_at, now())
                );

                INSERT INTO public.contracts (
                    master_id,
                    contract_code,
                    contact_id,
                    origin_lead_id,
                    origin_funnel_id,
                    venue_id,
                    event_type,
                    event_title,
                    event_date,
                    event_time,
                    guest_count,
                    package_name,
                    client_snapshot,
                    commercial_fields_snapshot,
                    total_amount,
                    sdr_name,
                    closer_name,
                    approval_status,
                    approved_at,
                    approved_by_name,
                    approved_by_role,
                    target_pos_sale_funnel_ids,
                    notes,
                    attachments,
                    created_at,
                    updated_at
                ) VALUES (
                    rec.master_id,
                    v_contract_code,
                    v_contact_id,
                    rec.commercial_lead_id,
                    rec.funnel_id,
                    rec.venue_id,
                    COALESCE(rec.event_type, '15_anos'),
                    COALESCE(rec.birthday_person_name, COALESCE(rec.contact_name, rec.client_name) || ' - Evento'),
                    rec.event_date,
                    rec.event_time,
                    COALESCE(rec.guest_count, 0),
                    rec.package_sold,
                    v_client_snapshot,
                    '{}'::jsonb,
                    COALESCE(rec.deal_value, 0.00),
                    'Equipe Comercial',
                    'Closer Responsável',
                    CASE WHEN v_is_completed THEN 'completed' ELSE 'approved' END,
                    COALESCE(rec.created_at, now()),
                    'Sistema (Migração Automática)',
                    'master',
                    CASE WHEN rec.funnel_id IS NOT NULL THEN ARRAY[rec.funnel_id] ELSE '{}'::uuid[] END,
                    COALESCE(rec.notes, ''),
                    COALESCE(rec.documents, '[]'::jsonb),
                    COALESCE(rec.created_at, now()),
                    now()
                )
                RETURNING id INTO v_contract_id;

                v_migrated_count := v_migrated_count + 1;

                -- Cria colocação no funil de pós-venda se houver funnel_id
                IF rec.funnel_id IS NOT NULL AND v_contract_id IS NOT NULL THEN
                    INSERT INTO public.contract_funnel_placements (
                        master_id,
                        contract_id,
                        funnel_id,
                        stage_id,
                        status,
                        completed_at,
                        created_at,
                        updated_at
                    ) VALUES (
                        rec.master_id,
                        v_contract_id,
                        rec.funnel_id,
                        COALESCE(rec.stage, 'onboarding'),
                        CASE WHEN v_is_completed THEN 'completed' ELSE 'in_progress' END,
                        CASE WHEN v_is_completed THEN COALESCE(rec.created_at, now()) ELSE NULL END,
                        COALESCE(rec.created_at, now()),
                        now()
                    )
                    ON CONFLICT (contract_id, funnel_id) DO NOTHING;
                END IF;
            ELSE
                v_skipped_count := v_skipped_count + 1;
            END IF;

            -- 3. Atualiza o registro em clients como migrado
            UPDATE public.clients
            SET 
                migrated_to_contract_id = v_contract_id,
                migrated_to_contact_id = v_contact_id,
                migrated_at = now()
            WHERE id = rec.client_id;
        END IF;
    END LOOP;

    RAISE NOTICE 'Migração finalizada com sucesso! Novos contratos criados: %, Contratos já existentes: %', v_migrated_count, v_skipped_count;
END $$;

-- 3. TRIGGER AUTOMÁTICO DE CONCLUSÃO GLOBAL DE CONTRATOS MULTI-FUNIL
-- Regra Arquitetural: O contrato só transita para 'completed' quando todos os funis setoriais ativos tiverem suas etapas finalizadas.
CREATE OR REPLACE FUNCTION public.trg_sync_contract_completion_from_placements()
RETURNS TRIGGER AS $$
DECLARE
    v_total_placements INT;
    v_uncompleted_placements INT;
    v_target_contract_id UUID;
    v_target_master_id UUID;
    v_current_status TEXT;
BEGIN
    v_target_contract_id := COALESCE(NEW.contract_id, OLD.contract_id);
    v_target_master_id := COALESCE(NEW.master_id, OLD.master_id);

    IF v_target_contract_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Busca status do contrato
    SELECT approval_status INTO v_current_status
    FROM public.contracts
    WHERE id = v_target_contract_id AND master_id = v_target_master_id;

    -- Não altera contratos cancelados, rejeitados ou aguardando aprovação
    IF v_current_status IN ('canceled', 'rejected', 'pending_approval') THEN
        RETURN NEW;
    END IF;

    -- Conta colocações totais e não concluídas
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status != 'completed')
    INTO v_total_placements, v_uncompleted_placements
    FROM public.contract_funnel_placements
    WHERE contract_id = v_target_contract_id AND master_id = v_target_master_id;

    IF v_total_placements > 0 AND v_uncompleted_placements = 0 THEN
        -- Todas as colocações setoriais estão concluídas!
        IF v_current_status != 'completed' THEN
            UPDATE public.contracts
            SET approval_status = 'completed', updated_at = now()
            WHERE id = v_target_contract_id AND master_id = v_target_master_id;
        END IF;
    ELSIF v_uncompleted_placements > 0 THEN
        -- Há colocações pendentes: se estava como completed, reverte para approved
        IF v_current_status = 'completed' THEN
            UPDATE public.contracts
            SET approval_status = 'approved', updated_at = now()
            WHERE id = v_target_contract_id AND master_id = v_target_master_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contract_placements_completion_sync ON public.contract_funnel_placements;
CREATE TRIGGER trg_contract_placements_completion_sync
    AFTER INSERT OR UPDATE OF status, stage_id ON public.contract_funnel_placements
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_sync_contract_completion_from_placements();
