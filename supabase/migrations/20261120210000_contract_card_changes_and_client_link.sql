-- ==============================================================================
-- F5 SYSTEM • POS-VENDA POR CONTRATO: historico de alteracoes do card e vinculo 1:1 contrato -> card
-- Data: 2026-11-20
--
-- 1) contract_card_changes: historico imutavel (so SELECT e INSERT) de mudancas operacionais do card de cliente
--    (convidados, data do evento, tipo do evento) com quem, quando, valor anterior -> novo e motivo.
-- 2) Indice unico em contracts.client_id: um contrato tem no maximo UM card de cliente.
-- Isolamento: master_id obrigatorio e RLS por Master (nao usa USING (true)). Requer public.f5_current_master_id().
-- Idempotente.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.contract_card_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
    client_id UUID,
    field TEXT NOT NULL CHECK (field IN ('guest_count', 'event_date', 'event_type', 'contract_title')),
    old_value TEXT,
    new_value TEXT,
    reason TEXT CHECK (reason IS NULL OR char_length(reason) <= 500),
    author_id UUID,
    author_name TEXT,
    author_role TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_contract_card_changes_contract ON public.contract_card_changes(contract_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contract_card_changes_client ON public.contract_card_changes(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contract_card_changes_master ON public.contract_card_changes(master_id);

ALTER TABLE public.contract_card_changes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contract_card_changes_select" ON public.contract_card_changes;
CREATE POLICY "contract_card_changes_select" ON public.contract_card_changes
    FOR SELECT TO authenticated
    USING (master_id = public.f5_current_master_id());
DROP POLICY IF EXISTS "contract_card_changes_insert" ON public.contract_card_changes;
CREATE POLICY "contract_card_changes_insert" ON public.contract_card_changes
    FOR INSERT TO authenticated
    WITH CHECK (master_id = public.f5_current_master_id());

-- Um contrato = no maximo um card de cliente (so cria se nao houver card repetido hoje)
DO $$
DECLARE dup INT;
BEGIN
    SELECT count(*) INTO dup FROM (
        SELECT 1 FROM public.contracts WHERE client_id IS NOT NULL GROUP BY client_id HAVING count(*) > 1
    ) t;
    IF dup = 0 THEN
        CREATE UNIQUE INDEX IF NOT EXISTS uq_contracts_client_id ON public.contracts (client_id) WHERE client_id IS NOT NULL;
    ELSE
        RAISE NOTICE 'Indice uq_contracts_client_id NAO criado: % cards ligados a mais de um contrato.', dup;
    END IF;
END $$;
