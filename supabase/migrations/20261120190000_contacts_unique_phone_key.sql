-- ==============================================================================
-- F5 SYSTEM • TRAVA DE CONTATOS: telefone e CPF unicos por Master
-- Data: 2026-11-20
--
-- Motivo: contato duplicado quebra o vinculo das mensagens. O app passa a usar uma unica porta de entrada
-- (contactService.findOrCreateContact) e o banco garante: mesmo telefone normalizado (sem 55, 9o digito
-- padronizado) ou mesmo CPF = mesmo contato, dentro do mesmo Master (master_id).
--
-- Idempotente. Nao apaga nem altera dados. Se ja existirem duplicados, o indice NAO e criado e um aviso
-- (NOTICE) lista a quantidade: limpe e rode de novo.
-- ==============================================================================

-- Chave de telefone: so digitos, sem DDI 55, sem o 9 extra do celular. NULL quando nao e um numero BR valido
-- (ex.: 'sem-telefone-123', 'Nao informado').
CREATE OR REPLACE FUNCTION public.phone_match_key(p TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
    SELECT CASE
        WHEN length(d2) = 10 THEN d2
        ELSE NULL
    END
    FROM (
        SELECT CASE
            WHEN length(d1) = 11 AND substr(d1, 3, 1) = '9' THEN substr(d1, 1, 2) || substr(d1, 4)
            ELSE d1
        END AS d2
        FROM (
            SELECT CASE
                WHEN length(d0) IN (12, 13) AND left(d0, 2) = '55' THEN substr(d0, 3)
                ELSE d0
            END AS d1
            FROM (SELECT regexp_replace(COALESCE(p, ''), '\D', '', 'g') AS d0) a
        ) b
    ) c
$$;

ALTER TABLE public.contacts
    ADD COLUMN IF NOT EXISTS primary_phone_key TEXT GENERATED ALWAYS AS (public.phone_match_key(primary_phone)) STORED;

DO $$
DECLARE
    dup_phone INT;
    dup_cpf INT;
BEGIN
    SELECT count(*) INTO dup_phone FROM (
        SELECT 1 FROM public.contacts
        WHERE deleted_at IS NULL AND primary_phone_key IS NOT NULL
        GROUP BY master_id, primary_phone_key HAVING count(*) > 1
    ) t;

    IF dup_phone = 0 THEN
        CREATE UNIQUE INDEX IF NOT EXISTS uq_contacts_master_phone_key
            ON public.contacts (master_id, primary_phone_key)
            WHERE deleted_at IS NULL AND primary_phone_key IS NOT NULL;
    ELSE
        RAISE NOTICE 'Indice de telefone NAO criado: % grupos de contatos com telefone repetido. Limpe e rode de novo.', dup_phone;
    END IF;

    SELECT count(*) INTO dup_cpf FROM (
        SELECT 1 FROM public.contacts
        WHERE deleted_at IS NULL AND length(cpf_digits) = 11
        GROUP BY master_id, cpf_digits HAVING count(*) > 1
    ) t;

    IF dup_cpf = 0 THEN
        CREATE UNIQUE INDEX IF NOT EXISTS uq_contacts_master_cpf_digits
            ON public.contacts (master_id, cpf_digits)
            WHERE deleted_at IS NULL AND length(cpf_digits) = 11;
    ELSE
        RAISE NOTICE 'Indice de CPF NAO criado: % grupos de contatos com CPF repetido. Limpe e rode de novo.', dup_cpf;
    END IF;
END $$;
