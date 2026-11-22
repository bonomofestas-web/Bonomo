-- ==============================================================================
-- F5 SYSTEM • TRANSICAO 2026-11 (NAO PERDER / NAO APAGAR ESTE ARQUIVO)
-- ------------------------------------------------------------------------------
-- Esta e a migracao da GRANDE MUDANCA de novembro/2026: Central de Contatos,
-- Contratos, Pos-Venda, Agenda de Eventos, Metas de Unidade e foto de perfil.
-- Quem ja usa o sistema em producao ainda esta no schema ANTIGO. Este script leva
-- a base antiga para o schema novo, preservando dados (backfill + arquivamento).
--
-- ANTES: faca backup do banco (Supabase Dashboard > Database > Backups).
-- COMO: SQL Editor do Supabase, colar e executar UMA vez, em ordem.
-- FONTE DA VERDADE: os arquivos individuais 20261114200000 .. 20261117120000.
-- Este arquivo e apenas a concatenacao ordenada deles (gerada em 2026-11-17).
-- Detalhes e validacao: 00_LEIA-ME_TRANSICAO_2026-11.md
-- ==============================================================================

-- ##### INICIO: 20261114200000_central_contatos_e_contratos_schema_and_backfill.sql #####
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
            COALESCE(c.payer_phone, '') AS contact_phone,
            COALESCE(c.payer_email, '') AS contact_email,
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

-- ##### FIM: 20261114200000_central_contatos_e_contratos_schema_and_backfill.sql #####

-- ##### INICIO: 20261116120000_migrate_and_archive_legacy_clients.sql #####
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

-- ##### FIM: 20261116120000_migrate_and_archive_legacy_clients.sql #####

-- ##### INICIO: 20261116130000_event_schedules_and_venue_goals.sql #####
-- ==============================================================================
-- F5 SYSTEM • MIGRAÇÃO: AGENDA DE EVENTOS COM BLOQUEIO DE DATAS & METAS DA UNIDADE
-- Versão: 1.4.0 • Data: 2026-11-16
-- Alinhamento: F5_SYSTEM_MASTER.md • Isolamento Master (master_id) & Multi-Venues
-- ==============================================================================

-- 1. TABELA DE AGENDA DE EVENTOS (EVENT SCHEDULES)
CREATE TABLE IF NOT EXISTS public.event_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    event_type TEXT DEFAULT '15_anos',
    event_date DATE NOT NULL,
    shift TEXT NOT NULL DEFAULT 'noite', -- 'manha' | 'tarde' | 'noite' | 'dia_inteiro'
    start_time TEXT DEFAULT '20:00',
    end_time TEXT DEFAULT '02:00',
    guest_count INT DEFAULT 150,
    status TEXT NOT NULL DEFAULT 'pre_reserva', -- 'pre_reserva' | 'confirmado' | 'em_andamento' | 'concluido' | 'cancelado'
    blocks_venue_day BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_by_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
    created_by_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_event_schedules_master_venue_date ON public.event_schedules(master_id, venue_id, event_date);
CREATE INDEX IF NOT EXISTS idx_event_schedules_contract ON public.event_schedules(contract_id);
CREATE INDEX IF NOT EXISTS idx_event_schedules_contact ON public.event_schedules(contact_id);
CREATE INDEX IF NOT EXISTS idx_event_schedules_status ON public.event_schedules(master_id, status);

-- RLS e Realtime
ALTER TABLE public.event_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "event_schedules_full_access" ON public.event_schedules;
CREATE POLICY "event_schedules_full_access" ON public.event_schedules
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
ALTER TABLE public.event_schedules REPLICA IDENTITY FULL;

-- 2. TRIGGER DE BLOQUEIO ESTRITO DE DATAS (SOBREPOSIÇÃO DE EVENTOS CONFIRMADOS)
CREATE OR REPLACE FUNCTION public.trg_check_event_schedule_overlap()
RETURNS TRIGGER AS $$
DECLARE
    v_conflict_count INT;
BEGIN
    -- Validação ativa apenas para eventos com status 'confirmado' ou 'em_andamento'
    IF NEW.status IN ('confirmado', 'em_andamento') THEN
        SELECT COUNT(*)
        INTO v_conflict_count
        FROM public.event_schedules
        WHERE venue_id = NEW.venue_id
          AND master_id = NEW.master_id
          AND event_date = NEW.event_date
          AND status IN ('confirmado', 'em_andamento')
          AND id != NEW.id
          AND (
            NEW.shift = 'dia_inteiro'
            OR shift = 'dia_inteiro'
            OR shift = NEW.shift
          );

        IF v_conflict_count > 0 THEN
            RAISE EXCEPTION 'Conflito de Agenda: Já existe um evento confirmado ou em andamento para esta Casa de Festas na mesma data e turno.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_event_schedules_overlap_guard ON public.event_schedules;
CREATE TRIGGER trg_event_schedules_overlap_guard
    BEFORE INSERT OR UPDATE OF status, event_date, shift, venue_id ON public.event_schedules
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_check_event_schedule_overlap();

-- 3. TABELA DE METAS DA UNIDADE (VENUE GOALS)
CREATE TABLE IF NOT EXISTS public.venue_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    revenue_target NUMERIC(12, 2) NOT NULL DEFAULT 150000.00,
    sales_target INT NOT NULL DEFAULT 12,
    leads_target INT NOT NULL DEFAULT 60,
    response_time_target_minutes INT NOT NULL DEFAULT 15,
    period TEXT NOT NULL DEFAULT 'monthly', -- 'monthly' | 'quarterly' | 'yearly'
    month INT,                             -- 1 a 12 (opcional para mensal)
    year INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_venue_goals_scope UNIQUE (master_id, venue_id, period, month, year)
);

CREATE INDEX IF NOT EXISTS idx_venue_goals_master_venue ON public.venue_goals(master_id, venue_id);

ALTER TABLE public.venue_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "venue_goals_full_access" ON public.venue_goals;
CREATE POLICY "venue_goals_full_access" ON public.venue_goals
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
ALTER TABLE public.venue_goals REPLICA IDENTITY FULL;

-- 4. BACKFILL INICIAL DE METAS A PARTIR DE VENUES.GOALS
DO $$
DECLARE
    v_rec RECORD;
    v_curr_year INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
    v_curr_month INT := EXTRACT(MONTH FROM CURRENT_DATE)::INT;
BEGIN
    FOR v_rec IN
        SELECT id AS venue_id, master_id, goals
        FROM public.venues
        WHERE master_id IS NOT NULL AND goals IS NOT NULL
    LOOP
        INSERT INTO public.venue_goals (
            master_id,
            venue_id,
            revenue_target,
            sales_target,
            leads_target,
            response_time_target_minutes,
            period,
            month,
            year
        ) VALUES (
            v_rec.master_id,
            v_rec.venue_id,
            COALESCE((v_rec.goals->>'revenueTarget')::NUMERIC, 150000.00),
            COALESCE((v_rec.goals->>'salesTarget')::INT, 12),
            COALESCE((v_rec.goals->>'leadsTarget')::INT, 60),
            COALESCE((v_rec.goals->>'responseTimeTargetMinutes')::INT, 15),
            COALESCE(v_rec.goals->>'period', 'monthly'),
            v_curr_month,
            v_curr_year
        )
        ON CONFLICT (master_id, venue_id, period, month, year) DO NOTHING;
    END LOOP;
END $$;

-- ##### FIM: 20261116130000_event_schedules_and_venue_goals.sql #####

-- ##### INICIO: 20261116140000_contract_amounts_and_cleanup_duplicates.sql #####
DO $$ 
BEGIN
    ALTER TABLE public.contracts
        ADD COLUMN IF NOT EXISTS entry_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00;
    ALTER TABLE public.contracts
        ADD COLUMN IF NOT EXISTS balance_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00;
    ALTER TABLE public.contracts
        ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;
END $$;

-- ##### FIM: 20261116140000_contract_amounts_and_cleanup_duplicates.sql #####

-- ##### INICIO: 20261116160000_add_contract_title_and_attachments.sql #####
-- Migration: Adicionar client_id, contract_title e payment_file_url em contracts e clients
-- Data: 2026-11-16
-- Autor: Barney Stinson

DO $$
BEGIN
  -- 1. Colunas em public.contracts
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE public.contracts ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'contract_title'
  ) THEN
    ALTER TABLE public.contracts ADD COLUMN contract_title TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'title'
  ) THEN
    ALTER TABLE public.contracts ADD COLUMN title TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'payment_file_url'
  ) THEN
    ALTER TABLE public.contracts ADD COLUMN payment_file_url TEXT;
  END IF;

  -- 2. Coluna em public.clients
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'contract_title'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN contract_title TEXT;
  END IF;

  -- 3. Índices de performance
  CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON public.contracts(client_id);
  CREATE INDEX IF NOT EXISTS idx_contracts_contract_title ON public.contracts(contract_title);
  CREATE INDEX IF NOT EXISTS idx_clients_contract_title ON public.clients(contract_title);

  -- 4. Preenchimento de dados existentes (Backfill inteligente)
  UPDATE public.contracts 
  SET contract_title = COALESCE(contract_title, event_title),
      title = COALESCE(title, event_title)
  WHERE contract_title IS NULL OR title IS NULL;

  -- Vincular contratos existentes aos seus clientes pelo commercial_lead_id
  UPDATE public.contracts ctr
  SET client_id = cli.id
  FROM public.clients cli
  WHERE ctr.client_id IS NULL
    AND (
      (ctr.origin_lead_id IS NOT NULL AND cli.commercial_lead_id = ctr.origin_lead_id)
      OR (ctr.lead_id IS NOT NULL AND cli.commercial_lead_id = ctr.lead_id)
    );

  -- Vincular contract_title dos clientes a partir dos contratos
  UPDATE public.clients cli
  SET contract_title = ctr.contract_title
  FROM public.contracts ctr
  WHERE cli.contract_title IS NULL
    AND ctr.client_id = cli.id
    AND ctr.contract_title IS NOT NULL;

  -- Recarregar cache do PostgREST
  PERFORM pg_notify('pgrst', 'reload schema');
END $$;

-- ##### FIM: 20261116160000_add_contract_title_and_attachments.sql #####

-- ##### INICIO: 20261117100000_sync_contract_decisors_to_contacts.sql #####
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

-- ##### FIM: 20261117100000_sync_contract_decisors_to_contacts.sql #####

-- ##### INICIO: 20261117120000_add_contacts_avatar_refreshed_at.sql #####
-- Migration: adiciona coluna avatar_refreshed_at na tabela contacts
-- Usada para controlar o TTL de 7 dias do refresh de foto de perfil do WhatsApp via UAZAPI
-- Path R2 fixo: avatars/{master_id}/picture_{contact_code}.jpg

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS avatar_refreshed_at TIMESTAMPTZ;

COMMENT ON COLUMN contacts.avatar_refreshed_at IS
  'Timestamp do último refresh da foto de perfil via UAZAPI. NULL = nunca buscado. Refresh disparado quando > 7 dias.';

-- ##### FIM: 20261117120000_add_contacts_avatar_refreshed_at.sql #####
