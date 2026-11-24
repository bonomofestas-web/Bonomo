-- ==============================================================================
-- F5 SYSTEM • PROPOSTAS COMERCIAIS
-- A proposta e um ativo documental do comercial, gerado na degustacao/orcamento. Fica vinculada ao lead (e, por ele, ao
-- contato) e nasce como primeira etapa do quadro de contratos ("Proposta"). Proposta NAO conta como contrato fechado:
-- o contrato so existe quando ela evolui (status 'converted', converted_contract_id preenchido). Cada proposta vira no maximo
-- um contrato; ao converter, a proposta deixa de ficar ativa.
-- Idempotente; toda tabela nova tem master_id e isolamento por Master (public.f5_current_master_id()).
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID NOT NULL,
  proposal_code TEXT NOT NULL,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT '15_anos',
  event_date DATE,
  guest_count INTEGER,
  package_name TEXT,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  payment_summary TEXT,
  client_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  file_url TEXT,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','converted','lost')),
  lost_reason TEXT,
  converted_contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'manual',
  proposal_date DATE,
  created_by_id TEXT,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_proposals_master_code ON public.proposals (master_id, proposal_code);
CREATE INDEX IF NOT EXISTS idx_proposals_master_status ON public.proposals (master_id, status);
CREATE INDEX IF NOT EXISTS idx_proposals_lead ON public.proposals (master_id, lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proposals_contact ON public.proposals (master_id, contact_id) WHERE contact_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_proposals_converted_contract ON public.proposals (converted_contract_id) WHERE converted_contract_id IS NOT NULL;

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS proposals_full_access ON public.proposals;
DROP POLICY IF EXISTS proposals_master_isolation ON public.proposals;
CREATE POLICY proposals_master_isolation ON public.proposals FOR ALL TO authenticated
  USING (master_id = public.f5_current_master_id()) WITH CHECK (master_id = public.f5_current_master_id());
REVOKE ALL ON public.proposals FROM anon;
GRANT ALL ON public.proposals TO authenticated, service_role;
