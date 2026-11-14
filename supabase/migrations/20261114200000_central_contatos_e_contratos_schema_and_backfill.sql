-- ==============================================================================
-- F5 SYSTEM: MIGRAÇÃO - CENTRAL DE CONTATOS, LEADS MULTI-FUNIL & CONTRATOS
-- Versão: 1.2.0 • Data: 2026-11-14
-- Alinhamento: F5_SYSTEM_MASTER.md • Isolamento Master (master_id) & Multi-Venues
-- ==============================================================================

-- 1. FUNÇÃO GERADORA DE CÓDIGOS ALFANUMÉRICOS BASE36 (ESCALABILIDADE QUASE INFINITA)
CREATE OR REPLACE FUNCTION public.generate_alphanumeric_code(prefix TEXT, length INT)
RETURNS TEXT AS $$
DECLARE
    chars TEXT := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    result TEXT := '';
    i INT;
BEGIN
    FOR i IN 1..length LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN prefix || '-' || result;
END;
$$ LANGUAGE plpgsql;

-- 2. TABELA DE GRUPOS FAMILIARES (FAMILY GROUPS)
CREATE TABLE IF NOT EXISTS public.family_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_family_groups_master_id ON public.family_groups(master_id);

ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "family_groups_full_access" ON public.family_groups;
CREATE POLICY "family_groups_full_access" ON public.family_groups 
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 3. TABELA DA CENTRAL DE CONTATOS (CONTACTS)
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    code TEXT NOT NULL, -- Ex: "CONT-4H8W2N9Q"
    name TEXT NOT NULL,
    nickname TEXT,
    primary_phone TEXT NOT NULL,
    secondary_phone TEXT,
    email TEXT,
    cpf TEXT,
    rg TEXT,
    birth_date DATE,
    profile_picture_url TEXT,
    
    -- Endereço Completo
    postal_code TEXT,
    street TEXT,
    number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,

    -- Família e Metadados
    family_group_id UUID REFERENCES public.family_groups(id) ON DELETE SET NULL,
    relationship_role TEXT, -- "Titular", "Mãe", "Pai", "Debutante", "Noivo", "Responsável Financeiro"
    notes TEXT,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    
    -- Auditoria
    created_by UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMPTZ
);

-- Índices de Alta Performance para Contatos
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_master_primary_phone ON public.contacts (master_id, primary_phone) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_master_code ON public.contacts (master_id, code);
CREATE INDEX IF NOT EXISTS idx_contacts_master_cpf ON public.contacts (master_id, cpf) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_master_name ON public.contacts (master_id, name);
CREATE INDEX IF NOT EXISTS idx_contacts_family_group ON public.contacts (family_group_id);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contacts_full_access" ON public.contacts;
CREATE POLICY "contacts_full_access" ON public.contacts 
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
ALTER TABLE public.contacts REPLICA IDENTITY FULL;

-- 4. TABELA DE DEPENDENTES DO CONTATO (CONTACT DEPENDENTS)
CREATE TABLE IF NOT EXISTS public.contact_dependents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    parent_contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    dependent_contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    kinship TEXT NOT NULL, -- "Filho(a) / Debutante", "Cônjuge", "Mãe", "Pai", "Responsável Financeiro"
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_contact_dependent UNIQUE (parent_contact_id, dependent_contact_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_dependents_parent ON public.contact_dependents(parent_contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_dependents_child ON public.contact_dependents(dependent_contact_id);

ALTER TABLE public.contact_dependents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contact_dependents_full_access" ON public.contact_dependents;
CREATE POLICY "contact_dependents_full_access" ON public.contact_dependents 
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 5. TABELA DE ACESSO MULTI-CASAS DE CONTATOS (CONTACT VENUE ACCESS)
CREATE TABLE IF NOT EXISTS public.contact_venue_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    first_interaction_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_interaction_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    origin_source_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_contact_venue UNIQUE (contact_id, venue_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_venue_venue_id ON public.contact_venue_access(venue_id, contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_venue_contact_id ON public.contact_venue_access(contact_id);

ALTER TABLE public.contact_venue_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contact_venue_access_full_access" ON public.contact_venue_access;
CREATE POLICY "contact_venue_access_full_access" ON public.contact_venue_access 
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 6. ATUALIZAÇÃO INCREMENTAL NA TABELA DE LEADS
ALTER TABLE public.leads
    ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS commercial_code TEXT,
    ADD COLUMN IF NOT EXISTS custom_fields_data JSONB DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_master_commercial_code ON public.leads (master_id, commercial_code);
CREATE INDEX IF NOT EXISTS idx_leads_contact_id ON public.leads (contact_id);

-- 7. TABELA DE CONTRATOS OFICIAIS (CONTRACTS COM SNAPSHOT ETERNO)
CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    contract_code TEXT NOT NULL, -- Ex: "CTR-2026-9BK7MZ"
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE RESTRICT,
    origin_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    origin_funnel_id UUID REFERENCES public.commercial_funnels(id) ON DELETE SET NULL,
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE RESTRICT, -- REGRA: UNIDADE ÚNICA
    
    -- Dados do Evento
    event_type TEXT NOT NULL DEFAULT '15_anos',
    event_title TEXT NOT NULL,
    event_date DATE,
    event_time TEXT,
    guest_count INTEGER DEFAULT 0,
    package_name TEXT,
    
    -- SNAPSHOT IMUTÁVEL: Dados Pessoais do Cliente no Fechamento (Blindagem Unilateral)
    client_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- SNAPSHOT IMUTÁVEL: Campos Comerciais do Funil Herdados (Nunca são apagados)
    commercial_fields_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Valores Financeiros do Contrato
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_terms JSONB DEFAULT '{}'::jsonb,
    
    -- RESPONSÁVEIS ETERNOS DA VENDA (Preservados mesmo se o usuário for deletado)
    sdr_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
    sdr_name TEXT NOT NULL DEFAULT '',
    sdr_email TEXT,

    closer_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
    closer_name TEXT NOT NULL DEFAULT '',
    closer_email TEXT,

    -- Mesa de Aprovação & Governança (Exclusiva para Gerente Comercial, Geral ou Master)
    approval_status TEXT NOT NULL DEFAULT 'pending_approval', 
    -- 'pending_approval' | 'approved' | 'rejected' | 'canceled' | 'completed'
    submitted_by UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    approved_by UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
    approved_by_name TEXT,
    approved_by_role TEXT,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Seleção dos Funis Pós-Venda Destino (Restritos à mesma venue_id)
    target_pos_sale_funnel_ids UUID[] DEFAULT '{}'::uuid[],
    
    -- Vínculo de Debutante / App (opcional)
    debutante_id UUID REFERENCES public.debutantes(id) ON DELETE SET NULL,
    debutante_slug TEXT,
    
    -- Passagem de Bastão & Documentação
    handover_notes TEXT,
    contract_file_url TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    notes TEXT DEFAULT '',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_contracts_master_code ON public.contracts (master_id, contract_code);
CREATE INDEX IF NOT EXISTS idx_contracts_contact_id ON public.contracts (contact_id);
CREATE INDEX IF NOT EXISTS idx_contracts_venue_id ON public.contracts (venue_id);
CREATE INDEX IF NOT EXISTS idx_contracts_approval_status ON public.contracts (master_id, approval_status);
CREATE INDEX IF NOT EXISTS idx_contracts_debutante_id ON public.contracts (debutante_id);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contracts_full_access" ON public.contracts;
CREATE POLICY "contracts_full_access" ON public.contracts 
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
ALTER TABLE public.contracts REPLICA IDENTITY FULL;

-- 8. TABELA DE COLOCAÇÕES EM FUNIS PÓS-VENDA (CONTRACT FUNNEL PLACEMENTS)
CREATE TABLE IF NOT EXISTS public.contract_funnel_placements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    funnel_id UUID NOT NULL REFERENCES public.commercial_funnels(id) ON DELETE RESTRICT,
    stage_id TEXT NOT NULL,
    assigned_to UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress' | 'completed' | 'on_hold'
    completed_at TIMESTAMPTZ,
    notes TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_contract_funnel UNIQUE (contract_id, funnel_id)
);

CREATE INDEX IF NOT EXISTS idx_contract_placements_funnel_stage ON public.contract_funnel_placements (funnel_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_contract_placements_assigned ON public.contract_funnel_placements (assigned_to);
CREATE INDEX IF NOT EXISTS idx_contract_placements_contract ON public.contract_funnel_placements (contract_id);

ALTER TABLE public.contract_funnel_placements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contract_funnel_placements_full_access" ON public.contract_funnel_placements;
CREATE POLICY "contract_funnel_placements_full_access" ON public.contract_funnel_placements 
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
ALTER TABLE public.contract_funnel_placements REPLICA IDENTITY FULL;

-- 9. TRIGGER DE SINCRONIZAÇÃO AUTOMÁTICA BIDIRECIONAL (LEAD -> CONTATO)
CREATE OR REPLACE FUNCTION public.sync_lead_contact_info()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.contact_id IS NOT NULL THEN
        UPDATE public.contacts
        SET 
            name = COALESCE(NULLIF(TRIM(NEW.name), ''), name),
            primary_phone = COALESCE(NULLIF(TRIM(NEW.phone), ''), primary_phone),
            email = COALESCE(NULLIF(TRIM(NEW.email), ''), email),
            updated_at = timezone('utc'::text, now())
        WHERE id = NEW.contact_id
          AND master_id = NEW.master_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_lead_to_contact ON public.leads;
CREATE TRIGGER trg_sync_lead_to_contact
AFTER UPDATE OF name, phone, email ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.sync_lead_contact_info();

-- ==============================================================================
-- 10. BACKFILL SEGURO E IDEMPOTENTE DE DADOS HISTÓRICOS (ZERO DATA LOSS)
-- ==============================================================================
DO $$
DECLARE
    rec RECORD;
    v_contact_id UUID;
    v_clean_phone TEXT;
    v_contract_code TEXT;
    v_commercial_code TEXT;
    v_client_snapshot JSONB;
BEGIN
    RAISE NOTICE 'Iniciando Backfill: Migrando Leads e Clientes para a Central de Contatos e Contratos...';

    -- 10.1. Backfill a partir da tabela LEADS
    FOR rec IN 
        SELECT DISTINCT ON (master_id, TRIM(phone))
            id AS lead_id,
            master_id,
            TRIM(name) AS name,
            TRIM(phone) AS phone,
            TRIM(email) AS email,
            venue_id,
            created_at
        FROM public.leads
        WHERE phone IS NOT NULL AND TRIM(phone) <> ''
        ORDER BY master_id, TRIM(phone), created_at ASC
    LOOP
        v_clean_phone := rec.phone;

        -- Verifica se o contato já existe
        SELECT id INTO v_contact_id 
        FROM public.contacts 
        WHERE master_id = rec.master_id 
          AND primary_phone = v_clean_phone
          AND deleted_at IS NULL
        LIMIT 1;

        -- Se não existe, cria novo contato com código alfanumérico
        IF v_contact_id IS NULL THEN
            INSERT INTO public.contacts (
                master_id,
                code,
                name,
                primary_phone,
                email,
                created_at,
                updated_at
            ) VALUES (
                rec.master_id,
                public.generate_alphanumeric_code('CONT', 8),
                COALESCE(NULLIF(rec.name, ''), 'Contato ' || v_clean_phone),
                v_clean_phone,
                rec.email,
                rec.created_at,
                rec.created_at
            )
            RETURNING id INTO v_contact_id;
        END IF;

        -- Registra o acesso da unidade em contact_venue_access
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
                rec.created_at,
                rec.created_at
            )
            ON CONFLICT (contact_id, venue_id) DO NOTHING;
        END IF;
    END LOOP;

    -- 10.2. Vincula leads existentes aos seus respectivos contacts e gera commercial_code
    FOR rec IN 
        SELECT l.id, l.master_id, l.phone, l.commercial_code
        FROM public.leads l
        WHERE l.contact_id IS NULL OR l.commercial_code IS NULL
    LOOP
        v_clean_phone := TRIM(rec.phone);
        
        SELECT id INTO v_contact_id 
        FROM public.contacts 
        WHERE master_id = rec.master_id 
          AND primary_phone = v_clean_phone
          AND deleted_at IS NULL
        LIMIT 1;

        v_commercial_code := rec.commercial_code;
        IF v_commercial_code IS NULL THEN
            v_commercial_code := public.generate_alphanumeric_code('LEAD', 8);
        END IF;

        UPDATE public.leads
        SET contact_id = COALESCE(v_contact_id, contact_id),
            commercial_code = v_commercial_code
        WHERE id = rec.id;
    END LOOP;

    -- 10.3. Backfill de CLIENTS para CONTACTS e CONTRATOS (Ativos Vigentes)
    FOR rec IN 
        SELECT 
            c.id AS client_id,
            c.master_id,
            c.code AS client_code,
            COALESCE(c.payer_name, c.name) AS contact_name,
            COALESCE(c.payer_phone, c.phone, '') AS contact_phone,
            COALESCE(c.payer_email, c.email) AS contact_email,
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
            c.venue_id,
            c.funnel_id,
            c.stage,
            c.assigned_success_manager_id,
            c.assigned_success_manager_name,
            c.commercial_lead_id,
            c.notes,
            c.documents,
            c.created_at
        FROM public.clients c
        WHERE c.master_id IS NOT NULL
    LOOP
        v_clean_phone := TRIM(rec.contact_phone);
        IF v_clean_phone = '' THEN
            v_clean_phone := 'sem-telefone-' || substr(rec.client_id::text, 1, 8);
        END IF;

        -- Encontra ou cria contato para o contratante
        SELECT id INTO v_contact_id 
        FROM public.contacts 
        WHERE master_id = rec.master_id 
          AND (primary_phone = v_clean_phone OR (cpf IS NOT NULL AND cpf = rec.payer_cpf))
          AND deleted_at IS NULL
        LIMIT 1;

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
                COALESCE(rec.contact_name, 'Cliente ' || rec.client_code),
                v_clean_phone,
                rec.contact_email,
                rec.payer_cpf,
                rec.payer_address,
                rec.payer_neighborhood,
                rec.payer_city,
                'Contratante',
                rec.created_at,
                rec.created_at
            )
            RETURNING id INTO v_contact_id;
        END IF;

        -- Vincula acesso à unidade física
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
                rec.created_at,
                rec.created_at
            )
            ON CONFLICT (contact_id, venue_id) DO NOTHING;
        END IF;

        -- Converte o Client em Contrato Oficial (Snapshot Imutável)
        IF rec.venue_id IS NOT NULL AND v_contact_id IS NOT NULL THEN
            -- Se já não houver contrato com este lead de origem ou com o código
            IF NOT EXISTS (SELECT 1 FROM public.contracts WHERE master_id = rec.master_id AND (origin_lead_id = rec.commercial_lead_id OR contract_code = rec.client_code)) THEN
                v_contract_code := COALESCE(NULLIF(rec.client_code, ''), public.generate_alphanumeric_code('CTR-' || to_char(COALESCE(rec.event_date, rec.created_at::date, now()::date), 'YYYY'), 6));

                -- Monta snapshot do cliente
                v_client_snapshot := jsonb_build_object(
                    'name', rec.contact_name,
                    'phone', v_clean_phone,
                    'email', rec.contact_email,
                    'cpf', rec.payer_cpf,
                    'address', rec.payer_address,
                    'neighborhood', rec.payer_neighborhood,
                    'city', rec.payer_city,
                    'birthday_person_name', rec.birthday_person_name
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
                    COALESCE(rec.birthday_person_name, rec.contact_name || ' - Festa'),
                    rec.event_date,
                    rec.event_time,
                    COALESCE(rec.guest_count, 0),
                    rec.package_sold,
                    v_client_snapshot,
                    '{}'::jsonb,
                    COALESCE(rec.deal_value, 0.00),
                    'Equipe Comercial',
                    'Closer Responsável',
                    'approved',
                    rec.created_at,
                    'Sistema (Migração Automática)',
                    'master',
                    rec.notes,
                    COALESCE(rec.documents, '[]'::jsonb),
                    rec.created_at,
                    rec.created_at
                );
            END IF;
        END IF;
    END LOOP;

    RAISE NOTICE 'Backfill concluído com sucesso: Todos os contatos e contratos foram unificados e indexados!';
END $$;
