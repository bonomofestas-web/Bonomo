-- ==============================================================================
-- F5 SYSTEM • FORNECEDORES
-- Qualquer contato (comercial ou pos-venda) pode ser marcado como fornecedor. A ficha guarda segmento, o que vende,
-- dados empresariais, PIX e endereco; os "ativos" do fornecedor sao os ORCAMENTOS (aprovados ou nao).
-- Idempotente; toda tabela nova tem master_id.
-- ==============================================================================
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS is_supplier boolean NOT NULL DEFAULT false;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS supplier_profile jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_contacts_supplier ON public.contacts (master_id) WHERE is_supplier;

CREATE TABLE IF NOT EXISTS public.supplier_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID NOT NULL,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,   -- festa a que o orcamento se refere (opcional)
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','reprovado')),
  requested_by_name TEXT,
  decided_by_name TEXT,
  decided_at TIMESTAMPTZ,
  decision_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_contact ON public.supplier_quotes (master_id, contact_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_status ON public.supplier_quotes (master_id, status);

ALTER TABLE public.supplier_quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS supplier_quotes_full_access ON public.supplier_quotes;
-- ATENCAO: segue o padrao aberto das demais tabelas (ver docs/PLANO_FINANCEIRO.md, secao 6); o isolamento por master_id e do aplicativo.
CREATE POLICY supplier_quotes_full_access ON public.supplier_quotes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON public.supplier_quotes TO anon, authenticated, service_role;
