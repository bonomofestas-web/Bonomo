-- ============================================================================
-- MIGRAÇÃO: TABELA DE CLIENTES PÓS-VENDA (CLIENTS) & INTEGRAÇÃO COMERCIAL
-- Data: 2026-09-11
-- Propósito: Gestão de Contratantes, Decisores, Dados Financeiros/Contratuais
--            e Separação Clara da Tabela de Aniversariantes (Debutantes / App).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    
    -- Dados do Decisor / Contratante (Pagador)
    payer_name TEXT,
    payer_relationship TEXT, -- 'mae' | 'pai' | 'responsavel' | 'noiva' | 'noivo' | 'outro'
    payer_cpf TEXT,
    payer_phone TEXT,
    payer_email TEXT,
    payer_address TEXT,
    payer_neighborhood TEXT,
    payer_city TEXT,
    
    -- Dados do Aniversariante / Homenageado
    birthday_person_name TEXT,
    birthday_person_age INT,
    birthday_person_birthdate DATE,
    
    -- Dados do Evento
    event_type TEXT DEFAULT '15_anos',
    event_date DATE,
    event_time TEXT,
    guest_count INT DEFAULT 0,
    venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
    venue_name TEXT,
    
    -- Dados Contratuais & Comerciais
    package_sold TEXT,
    deal_value NUMERIC(12, 2) DEFAULT 0,
    contract_date DATE,
    payment_terms TEXT,
    payment_status TEXT DEFAULT 'pending', -- 'pending' | 'in_progress' | 'paid_full'
    stage TEXT DEFAULT 'onboarding',       -- 'onboarding' | 'alignment' | 'tasting' | 'rehearsal' | 'production' | 'completed'
    
    -- Responsável no Pós-Venda
    assigned_success_manager_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
    assigned_success_manager_name TEXT,
    
    -- Vínculo com App da Aniversariante (Debutante / Lista de Convidados)
    debutante_id UUID REFERENCES public.debutantes(id) ON DELETE SET NULL,
    debutante_slug TEXT,
    
    -- Vínculo de Origem Comercial (Lead do Funil)
    commercial_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    commercial_lead_code TEXT,
    commercial_history JSONB DEFAULT '[]'::jsonb,
    
    -- Observações e Documentos
    notes TEXT DEFAULT '',
    documents JSONB DEFAULT '[]'::jsonb,
    activities JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices de Performance
CREATE INDEX IF NOT EXISTS idx_clients_venue_id ON public.clients(venue_id);
CREATE INDEX IF NOT EXISTS idx_clients_stage ON public.clients(stage);
CREATE INDEX IF NOT EXISTS idx_clients_commercial_lead_id ON public.clients(commercial_lead_id);
CREATE INDEX IF NOT EXISTS idx_clients_debutante_id ON public.clients(debutante_id);
CREATE INDEX IF NOT EXISTS idx_clients_code ON public.clients(code);

-- Políticas de RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_full_access" ON public.clients;
CREATE POLICY "clients_full_access" ON public.clients 
FOR ALL TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- Replicação Realtime
ALTER TABLE public.clients REPLICA IDENTITY FULL;

-- Função e Trigger para updated_at automático
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

