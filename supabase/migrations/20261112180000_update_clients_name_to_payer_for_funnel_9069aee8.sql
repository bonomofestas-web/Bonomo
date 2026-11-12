-- ==============================================================================
-- F5 SYSTEM • MIGRAÇÃO ISOLADA: ATUALIZAÇÃO DO NOME DA FICHA PARA DECISOR PAGANTE
-- Funil Alvo ID: 9069aee8 (Prefixo / UUID)
-- Data: 2026-11-12
-- Propósito: Alterar o nome da ficha (name e birthday_person_name) de todos os clientes 
--            pertencentes ao funil isolado '9069aee8' para o nome do decisor pagante (payer_name).
-- ==============================================================================

DO $$
DECLARE
    target_funnel_id UUID;
    updated_count INT := 0;
BEGIN
    -- 1. Identificar o ID completo do funil pelo prefixo '9069aee8'
    SELECT id INTO target_funnel_id
    FROM public.commercial_funnels
    WHERE id::text ILIKE '9069aee8%'
    LIMIT 1;

    IF target_funnel_id IS NOT NULL THEN
        RAISE NOTICE 'Funil alvo localizado com sucesso: %', target_funnel_id;
    ELSE
        RAISE NOTICE 'Funil com prefixo 9069aee8 não encontrado em commercial_funnels. Buscando diretamente na coluna clients.funnel_id...';
    END IF;

    -- 2. Atualizar todos os clientes desse funil que possuam payer_name ou commercial_history->>'payerName'
    WITH updated AS (
        UPDATE public.clients
        SET 
            name = COALESCE(
                NULLIF(TRIM(payer_name), ''), 
                NULLIF(TRIM(commercial_history->>'payerName'), ''), 
                name
            ),
            birthday_person_name = COALESCE(
                NULLIF(TRIM(payer_name), ''), 
                NULLIF(TRIM(commercial_history->>'payerName'), ''), 
                birthday_person_name,
                name
            ),
            updated_at = NOW()
        WHERE 
            (
                (target_funnel_id IS NOT NULL AND funnel_id = target_funnel_id)
                OR funnel_id::text ILIKE '9069aee8%'
            )
            AND (
                (payer_name IS NOT NULL AND TRIM(payer_name) <> '')
                OR (commercial_history->>'payerName' IS NOT NULL AND TRIM(commercial_history->>'payerName') <> '')
            )
        RETURNING id
    )
    SELECT COUNT(*) INTO updated_count FROM updated;

    RAISE NOTICE 'Total de clientes atualizados com o nome do pagante: %', updated_count;

    -- 3. Caso existam registros neste funil onde payer_name estava em branco mas name continha o nome, sincroniza payer_name
    UPDATE public.clients
    SET 
        payer_name = TRIM(name),
        updated_at = NOW()
    WHERE 
        (
            (target_funnel_id IS NOT NULL AND funnel_id = target_funnel_id)
            OR funnel_id::text ILIKE '9069aee8%'
        )
        AND (payer_name IS NULL OR TRIM(payer_name) = '')
        AND (name IS NOT NULL AND TRIM(name) <> '');

END $$;
