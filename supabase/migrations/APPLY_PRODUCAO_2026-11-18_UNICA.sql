-- ==============================================================================
-- F5 SYSTEM • MIGRATION UNICA DE PRODUCAO — 2026-11-18
-- ATENCAO: o SQL Editor do Supabase NAO garante transacao unica; trate esta migration como idempotente e confira o resultado ao final.
--
--  1. Schema novo + backfill  (contatos, contratos, clientes legados -> contratos, decisores -> contatos,
--     metas, midia, previa de mensagem)
--  2. Snapshot de seguranca   (tabelas bkp_20261118_* para reverter a limpeza de duplicados)
--  3. Remocao de duplicados   (contatos e leads; MANTEM O MAIS ANTIGO; nada e apagado: soft delete/arquivo)
--  4. Indicacoes              (referrals com master_id + contact_id; toda indicacao vira contato)
--  5. Verificacao final       (aborta tudo se: lead sumiu, contrato sem contato, contato duplicado ativo...)
--
-- COMO RODAR: backup antes (npm run backup:db + backup no painel). Cole ESTE arquivo inteiro no SQL Editor
-- do Supabase e execute UMA vez. Idempotente. Veja as mensagens NOTICE no final e as tabelas
-- contact_dedupe_log / lead_dedupe_log (reason = 'manual_review' = leads que exigem decisao humana).
-- ==============================================================================

BEGIN;

-- Snapshot dos ids de leads em tabela comum (o SQL Editor do Supabase nao mantem tabela temporaria entre comandos)
CREATE TABLE IF NOT EXISTS public.bkp_20261118_lead_ids AS SELECT id FROM public.leads;
ALTER TABLE public.bkp_20261118_lead_ids ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ETAPA 0 — PRE-REQUISITO: todo lead/cliente precisa de master_id (contatos e contratos exigem).
-- Registros sem master_id herdam o Master da unidade (venues.master_id). Nada e apagado.
-- ============================================================
UPDATE public.leads l SET master_id = v.master_id
FROM public.venues v
WHERE l.master_id IS NULL AND l.venue_id = v.id AND v.master_id IS NOT NULL;

UPDATE public.clients c SET master_id = v.master_id
FROM public.venues v
WHERE c.master_id IS NULL AND c.venue_id = v.id AND v.master_id IS NOT NULL;

-- ============================================================
-- ETAPA 1 — SCHEMA + BACKFILL
-- ============================================================


-- ============================================================
-- MIGRATION: 20261114200000_central_contatos_e_contratos_schema_and_backfill
-- ============================================================
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


-- ============================================================
-- MIGRATION: 20261116120000_migrate_and_archive_legacy_clients
-- ============================================================
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


-- ============================================================
-- MIGRATION: 20261116130000_event_schedules_and_venue_goals
-- ============================================================
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


-- ============================================================
-- MIGRATION: 20261116140000_contract_amounts_and_cleanup_duplicates
-- ============================================================
DO $$ 
BEGIN
    ALTER TABLE public.contracts
        ADD COLUMN IF NOT EXISTS entry_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00;
    ALTER TABLE public.contracts
        ADD COLUMN IF NOT EXISTS balance_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00;
    ALTER TABLE public.contracts
        ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;
END $$;


-- ============================================================
-- MIGRATION: 20261116160000_add_contract_title_and_attachments
-- ============================================================
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


-- ============================================================
-- MIGRATION: 20261117100000_sync_contract_decisors_to_contacts
-- ============================================================
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


-- ============================================================
-- MIGRATION: 20261117120000_add_contacts_avatar_refreshed_at
-- ============================================================
-- Migration: adiciona coluna avatar_refreshed_at na tabela contacts
-- Usada para controlar o TTL de 7 dias do refresh de foto de perfil do WhatsApp via UAZAPI
-- Path R2 fixo: avatars/{master_id}/picture_{contact_code}.jpg

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS avatar_refreshed_at TIMESTAMPTZ;

COMMENT ON COLUMN contacts.avatar_refreshed_at IS
  'Timestamp do último refresh da foto de perfil via UAZAPI. NULL = nunca buscado. Refresh disparado quando > 7 dias.';


-- ============================================================
-- MIGRATION: 20261117130000_leads_last_message_preview
-- ============================================================
-- Prévia persistida da última mensagem de chat por lead.
-- Motivo: a lista lateral do WhatsApp derivava a prévia de lead_activities carregadas em memória
-- (só ~5 por lead na carga leve), ficando desatualizada até abrir a conversa. Com estas colunas a
-- lista fica correta sem baixar histórico (economiza egress no plano Free do Supabase).
-- Colunas em leads (já escopada por master_id/venue_id); nenhuma tabela nova, nenhuma policy nova.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS last_message_text TEXT,
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;

-- Backfill (idempotente): só preenche leads ainda sem prévia, a partir da última mensagem de chat.
UPDATE public.leads l
SET last_message_text = left(a.text, 200),
    last_message_at = a.ts
FROM (
  SELECT DISTINCT ON (lead_id) lead_id, text, "timestamp" AS ts
  FROM public.lead_activities
  WHERE type = 'contact'
    AND coalesce(text, '') <> ''
    AND coalesce(metadata->>'isViewAudit', '') <> 'true'
  ORDER BY lead_id, "timestamp" DESC
) a
WHERE a.lead_id = l.id
  AND l.last_message_at IS NULL;


-- ============================================================
-- MIGRATION: 20261117140000_whatsapp_media_control
-- ============================================================
-- Controle de mídia do WhatsApp no Cloudflare R2 (plano gratuito: 10 GB).
-- Registra cada mídia (salva, pendente, expurgada ou indisponível) para: política de peso,
-- botão "Fixar", medidor de uso e limpeza sazonal (api/r2-cleanup.ts).
-- Isolamento: toda linha tem master_id; RLS restringe ao Master do usuário logado
-- (NÃO usa o padrão permissivo USING (true)). O service role (serverless) ignora RLS.

-- Master do usuário logado: collaborators.id = auth.uid(); master_id aponta para o Master (o próprio Master tem master_id nulo).
CREATE OR REPLACE FUNCTION public.f5_current_master_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(c.master_id, c.id) FROM public.collaborators c WHERE c.id = auth.uid() LIMIT 1;
$$;

CREATE TABLE IF NOT EXISTS public.whatsapp_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
    source_id UUID,
    lead_id UUID,
    activity_id UUID,
    message_id TEXT,
    kind TEXT NOT NULL DEFAULT 'other' CHECK (kind IN ('image', 'video', 'audio', 'document', 'other')),
    mimetype TEXT,
    file_name TEXT,
    size_bytes BIGINT,
    r2_key TEXT,
    public_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('stored', 'pending', 'purged', 'unavailable')),
    pinned BOOLEAN NOT NULL DEFAULT false,
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    purged_at TIMESTAMPTZ
);

-- Uma linha por mensagem dentro do Master (permite upsert idempotente)
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_media_master_message_uidx
    ON public.whatsapp_media (master_id, message_id)
    WHERE message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS whatsapp_media_cleanup_idx
    ON public.whatsapp_media (master_id, status, kind, last_accessed_at);

CREATE INDEX IF NOT EXISTS whatsapp_media_lead_idx
    ON public.whatsapp_media (lead_id);

ALTER TABLE public.whatsapp_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_media_master_scope" ON public.whatsapp_media;
CREATE POLICY "whatsapp_media_master_scope" ON public.whatsapp_media
    FOR ALL TO authenticated
    USING (master_id = public.f5_current_master_id())
    WITH CHECK (master_id = public.f5_current_master_id());


-- ============================================================
-- MIGRATION: 20261117150000_team_and_collaborator_goals
-- ============================================================
-- Metas: agendamentos na unidade, metas por equipe (SDR/Closer) e metas individuais do colaborador.
-- Idempotente. Isolamento por master_id aplicado nos servicos (RLS segue o padrao permissivo atual).

-- 1. Meta de agendamentos na meta da unidade
ALTER TABLE public.venue_goals
    ADD COLUMN IF NOT EXISTS appointments_target INT NOT NULL DEFAULT 0;

-- 2. Metas por equipe (papel) dentro da unidade
CREATE TABLE IF NOT EXISTS public.team_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('sdr', 'closer')),
    period TEXT NOT NULL DEFAULT 'monthly',
    month INT NOT NULL DEFAULT 0,
    year INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT,
    revenue_target NUMERIC(12, 2) NOT NULL DEFAULT 0,
    appointments_target INT NOT NULL DEFAULT 0,
    closings_target INT NOT NULL DEFAULT 0,
    response_time_target_minutes INT NOT NULL DEFAULT 15,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_team_goals_scope UNIQUE (master_id, venue_id, role, period, month, year)
);

CREATE INDEX IF NOT EXISTS idx_team_goals_master_venue ON public.team_goals(master_id, venue_id);

ALTER TABLE public.team_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team_goals_full_access" ON public.team_goals;
CREATE POLICY "team_goals_full_access" ON public.team_goals
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
ALTER TABLE public.team_goals REPLICA IDENTITY FULL;

-- 3. Meta individual do colaborador
ALTER TABLE public.collaborators
    ADD COLUMN IF NOT EXISTS goals JSONB;


-- ============================================================
-- ETAPA 2 — SNAPSHOT DE SEGURANCA (RLS ligado, sem policy: ninguem le pela API publica)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bkp_20261118_contacts AS SELECT * FROM public.contacts;
CREATE TABLE IF NOT EXISTS public.bkp_20261118_contact_venue_access AS SELECT * FROM public.contact_venue_access;
CREATE TABLE IF NOT EXISTS public.bkp_20261118_contact_dependents AS SELECT * FROM public.contact_dependents;
CREATE TABLE IF NOT EXISTS public.bkp_20261118_referrals AS SELECT * FROM public.referrals;
CREATE TABLE IF NOT EXISTS public.bkp_20261118_leads_link AS
    SELECT id, contact_id, is_archived, archived_at, custom_field_values FROM public.leads;
CREATE TABLE IF NOT EXISTS public.bkp_20261118_contracts_link AS SELECT id, contact_id FROM public.contracts;
ALTER TABLE public.bkp_20261118_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bkp_20261118_contact_venue_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bkp_20261118_contact_dependents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bkp_20261118_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bkp_20261118_leads_link ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bkp_20261118_contracts_link ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ETAPA 3 — REMOCAO DE DUPLICADOS (mantem o mais antigo)
-- ============================================================
-- ==============================================================================
-- F5 SYSTEM • REMOCAO DE DUPLICADOS (CONTATOS E LEADS) — MANTEM O REGISTRO MAIS ANTIGO
-- Data: 2026-11-18
-- Depende de: 20261114200000, 20261116120000, 20261116140000, 20261117100000
--
-- REGRAS
--  * Isolamento: toda comparacao e feita DENTRO do mesmo master_id.
--  * Contatos: duplicado = mesmo telefone normalizado (so digitos, sem DDI 55) ou mesmo CPF.
--    Telefones 'sem-telefone-*' nunca sao usados como chave.
--  * Leads: duplicado = mesmo master + unidade + funil + contato. Um contato com leads em
--    unidades/funis diferentes NAO e duplicado (modelo 1 contato : N leads).
--  * Mantem sempre o mais antigo (created_at ASC, id ASC). O perdedor NUNCA e apagado:
--    contatos recebem deleted_at; leads recebem is_archived. Tudo fica registrado nas tabelas
--    contact_dedupe_log / lead_dedupe_log e pode ser revertido.
--  * Mesmo telefone com NOMES diferentes (mae/filha) nao e mesclado: vai para contact_dedupe_log
--    com reason = 'manual_review' (applied = false) para decisao humana.
--  * Contratos: contact_id e apenas o ponteiro; o snapshot do contrato (client_snapshot) nao e alterado.
--  * Leads perdedores que sejam 'contract_signed' ou tenham contrato/cliente ligado NAO sao
--    mesclados: vao para o log com reason = 'manual_review' (applied = false).
--  * primary_phone NAO e reescrito (o webhook compara o formato armazenado).
--
-- ENSAIO: mude v_apply para FALSE abaixo para so registrar no log, sem alterar nada.
-- Idempotente: reexecutar nao encontra novos duplicados.
-- ==============================================================================

-- 1. TABELAS DE AUDITORIA (RLS ligado, sem policy: so service role / SQL Editor le e grava)
CREATE TABLE IF NOT EXISTS public.contact_dedupe_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL,
    keeper_id UUID NOT NULL,
    removed_id UUID NOT NULL,
    reason TEXT NOT NULL,
    match_key TEXT,
    applied BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.lead_dedupe_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL,
    keeper_id UUID NOT NULL,
    removed_id UUID NOT NULL,
    reason TEXT NOT NULL,
    applied BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.contact_dedupe_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_dedupe_log ENABLE ROW LEVEL SECURITY;

-- 2. FUNCOES AUXILIARES (removidas no fim)
CREATE OR REPLACE FUNCTION public._dd_phone_key(p_phone TEXT)
RETURNS TEXT AS $$
DECLARE
    d TEXT;
BEGIN
    IF p_phone IS NULL OR p_phone ILIKE 'sem-telefone-%' THEN RETURN NULL; END IF;
    d := regexp_replace(p_phone, '\D', '', 'g');
    IF length(d) >= 12 AND d LIKE '55%' THEN d := substr(d, 3); END IF;
    IF length(d) < 8 THEN RETURN NULL; END IF;
    RETURN d;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public._dd_cpf_key(p_cpf TEXT)
RETURNS TEXT AS $$
DECLARE
    d TEXT;
BEGIN
    IF p_cpf IS NULL THEN RETURN NULL; END IF;
    d := regexp_replace(p_cpf, '\D', '', 'g');
    IF length(d) <> 11 THEN RETURN NULL; END IF;
    RETURN d;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Reaponta uma coluna FK de uma tabela (se a tabela/coluna existir neste banco)
CREATE OR REPLACE FUNCTION public._dd_repoint(p_table TEXT, p_col TEXT, p_from UUID, p_to UUID)
RETURNS VOID AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = p_table AND column_name = p_col
    ) THEN
        BEGIN
            EXECUTE format('UPDATE public.%I SET %I = $1 WHERE %I = $2', p_table, p_col, p_col)
            USING p_to, p_from;
        EXCEPTION WHEN unique_violation THEN
            -- Conflito de UNIQUE: a linha permanece apontando para o registro arquivado (sem perda de dado)
            RAISE NOTICE 'dedupe: conflito de unique em %.% (de % para %); mantido no registro antigo', p_table, p_col, p_from, p_to;
        END;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Compatibilidade de nomes: evita unir pessoas diferentes que dividem o mesmo telefone (mae/filha).
-- Compativel = primeiro nome igual, um nome contem o outro, ou algum nome e generico ("Contato ...").
CREATE OR REPLACE FUNCTION public._dd_names_compatible(a TEXT, b TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    na TEXT;
    nb TEXT;
BEGIN
    na := trim(regexp_replace(translate(lower(COALESCE(a, '')), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn'), '[^a-z ]', '', 'g'));
    nb := trim(regexp_replace(translate(lower(COALESCE(b, '')), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn'), '[^a-z ]', '', 'g'));
    IF na = '' OR nb = '' THEN RETURN TRUE; END IF;
    IF na LIKE 'contato%' OR nb LIKE 'contato%' OR na LIKE 'cliente%' OR nb LIKE 'cliente%'
       OR na LIKE 'sem nome%' OR nb LIKE 'sem nome%' THEN RETURN TRUE; END IF;
    RETURN split_part(na, ' ', 1) = split_part(nb, ' ', 1)
        OR position(na IN nb) > 0 OR position(nb IN na) > 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public._dd_merge_contact(
    p_keeper UUID, p_loser UUID, p_master UUID, p_reason TEXT, p_key TEXT, p_apply BOOLEAN
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.contact_dedupe_log (master_id, keeper_id, removed_id, reason, match_key, applied)
    VALUES (p_master, p_keeper, p_loser, p_reason, p_key, p_apply);
    IF NOT p_apply THEN RETURN; END IF;

    PERFORM public._dd_repoint('leads', 'contact_id', p_loser, p_keeper);
    PERFORM public._dd_repoint('contracts', 'contact_id', p_loser, p_keeper);
    PERFORM public._dd_repoint('clients', 'migrated_to_contact_id', p_loser, p_keeper);
    PERFORM public._dd_repoint('event_schedules', 'contact_id', p_loser, p_keeper);
    PERFORM public._dd_repoint('referrals', 'contact_id', p_loser, p_keeper);

    -- Acesso por unidade: soma no mantido (UNIQUE contact_id + venue_id)
    INSERT INTO public.contact_venue_access
        (master_id, contact_id, venue_id, first_interaction_at, last_interaction_at, origin_source_id)
    SELECT master_id, p_keeper, venue_id, first_interaction_at, last_interaction_at, origin_source_id
    FROM public.contact_venue_access WHERE contact_id = p_loser
    ON CONFLICT (contact_id, venue_id) DO UPDATE SET
        first_interaction_at = LEAST(public.contact_venue_access.first_interaction_at, EXCLUDED.first_interaction_at),
        last_interaction_at  = GREATEST(public.contact_venue_access.last_interaction_at, EXCLUDED.last_interaction_at);
    DELETE FROM public.contact_venue_access WHERE contact_id = p_loser;

    -- Dependentes: evita auto-referencia e pares repetidos (UNIQUE parent + dependent)
    DELETE FROM public.contact_dependents
    WHERE (parent_contact_id = p_loser AND dependent_contact_id = p_keeper)
       OR (parent_contact_id = p_keeper AND dependent_contact_id = p_loser);
    UPDATE public.contact_dependents d SET parent_contact_id = p_keeper
    WHERE d.parent_contact_id = p_loser
      AND NOT EXISTS (SELECT 1 FROM public.contact_dependents x
                      WHERE x.parent_contact_id = p_keeper AND x.dependent_contact_id = d.dependent_contact_id);
    UPDATE public.contact_dependents d SET dependent_contact_id = p_keeper
    WHERE d.dependent_contact_id = p_loser
      AND NOT EXISTS (SELECT 1 FROM public.contact_dependents x
                      WHERE x.dependent_contact_id = p_keeper AND x.parent_contact_id = d.parent_contact_id);
    DELETE FROM public.contact_dependents WHERE parent_contact_id = p_loser OR dependent_contact_id = p_loser;

    -- Completa so os campos vazios do mantido com os do duplicado
    UPDATE public.contacts k SET
        secondary_phone     = COALESCE(NULLIF(k.secondary_phone, ''), l.secondary_phone),
        email               = COALESCE(NULLIF(k.email, ''), l.email),
        cpf                 = COALESCE(NULLIF(k.cpf, ''), l.cpf),
        rg                  = COALESCE(NULLIF(k.rg, ''), l.rg),
        birth_date          = COALESCE(k.birth_date, l.birth_date),
        profile_picture_url = COALESCE(NULLIF(k.profile_picture_url, ''), l.profile_picture_url),
        postal_code         = COALESCE(NULLIF(k.postal_code, ''), l.postal_code),
        street              = COALESCE(NULLIF(k.street, ''), l.street),
        number              = COALESCE(NULLIF(k.number, ''), l.number),
        complement          = COALESCE(NULLIF(k.complement, ''), l.complement),
        neighborhood        = COALESCE(NULLIF(k.neighborhood, ''), l.neighborhood),
        city                = COALESCE(NULLIF(k.city, ''), l.city),
        state               = COALESCE(NULLIF(k.state, ''), l.state),
        family_group_id     = COALESCE(k.family_group_id, l.family_group_id),
        updated_at          = timezone('utc'::text, now())
    FROM public.contacts l
    WHERE k.id = p_keeper AND l.id = p_loser;

    UPDATE public.contacts
    SET deleted_at = timezone('utc'::text, now()), updated_at = timezone('utc'::text, now())
    WHERE id = p_loser;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public._dd_merge_lead(
    p_keeper UUID, p_loser UUID, p_master UUID, p_apply BOOLEAN
) RETURNS VOID AS $$
DECLARE
    v_protected BOOLEAN;
BEGIN
    SELECT (
        EXISTS (SELECT 1 FROM public.leads WHERE id = p_loser AND stage = 'contract_signed')
        OR EXISTS (SELECT 1 FROM public.contracts WHERE lead_id = p_loser OR origin_lead_id = p_loser)
        OR EXISTS (SELECT 1 FROM public.clients WHERE commercial_lead_id = p_loser)
    ) INTO v_protected;

    IF v_protected THEN
        INSERT INTO public.lead_dedupe_log (master_id, keeper_id, removed_id, reason, applied)
        VALUES (p_master, p_keeper, p_loser, 'manual_review', FALSE);
        RETURN;
    END IF;

    INSERT INTO public.lead_dedupe_log (master_id, keeper_id, removed_id, reason, applied)
    VALUES (p_master, p_keeper, p_loser, 'same_contact_venue_funnel', p_apply);
    IF NOT p_apply THEN RETURN; END IF;

    PERFORM public._dd_repoint('lead_activities', 'lead_id', p_loser, p_keeper);
    PERFORM public._dd_repoint('lead_participants', 'lead_id', p_loser, p_keeper);
    PERFORM public._dd_repoint('admin_tasks', 'lead_id', p_loser, p_keeper);
    PERFORM public._dd_repoint('appointments', 'lead_id', p_loser, p_keeper);
    PERFORM public._dd_repoint('referrals', 'lead_id', p_loser, p_keeper);
    PERFORM public._dd_repoint('whatsapp_media', 'lead_id', p_loser, p_keeper);

    UPDATE public.leads SET
        is_archived = TRUE,
        archived_at = timezone('utc'::text, now()),
        custom_field_values = COALESCE(custom_field_values, '{}'::jsonb)
            || jsonb_build_object('merged_into_lead_id', p_keeper, 'dedupe_merged_at', now())
    WHERE id = p_loser;
END;
$$ LANGUAGE plpgsql;

-- 3. EXECUCAO
DO $$
DECLARE
    v_apply BOOLEAN := TRUE;   -- FALSE = ensaio (apenas registra no log)
    rec RECORD;
    v_contacts_merged INT := 0;
    v_leads_merged INT := 0;
    v_leads_review INT := 0;
    v_leads_no_contact INT := 0;
BEGIN
    DELETE FROM public.contact_dedupe_log WHERE applied = FALSE;
    DELETE FROM public.lead_dedupe_log WHERE applied = FALSE;

    -- 3.1 Contatos duplicados por telefone normalizado (mantem o mais antigo)
    FOR rec IN
        WITH keyed AS (
            SELECT id, name, master_id, created_at, public._dd_phone_key(primary_phone) AS k
            FROM public.contacts WHERE deleted_at IS NULL
        ), ranked AS (
            SELECT *,
                   first_value(id) OVER (PARTITION BY master_id, k ORDER BY created_at ASC, id ASC) AS keeper_id,
                   first_value(name) OVER (PARTITION BY master_id, k ORDER BY created_at ASC, id ASC) AS keeper_name
            FROM keyed WHERE k IS NOT NULL
        )
        SELECT id AS loser_id, name AS loser_name, keeper_id, keeper_name, master_id, k FROM ranked WHERE id <> keeper_id
        ORDER BY master_id, k, loser_id
    LOOP
        -- Pode ja ter sido mesclado em iteracao anterior desta mesma passada
        CONTINUE WHEN NOT EXISTS (SELECT 1 FROM public.contacts WHERE id = rec.loser_id AND deleted_at IS NULL);
        -- Mesmo telefone, mas nomes diferentes (ex.: mae e filha): NAO mescla, vai para revisao manual
        IF NOT public._dd_names_compatible(rec.loser_name, rec.keeper_name) THEN
            INSERT INTO public.contact_dedupe_log (master_id, keeper_id, removed_id, reason, match_key, applied)
            VALUES (rec.master_id, rec.keeper_id, rec.loser_id, 'manual_review', rec.k, FALSE);
            CONTINUE;
        END IF;
        PERFORM public._dd_merge_contact(rec.keeper_id, rec.loser_id, rec.master_id, 'same_phone', rec.k, v_apply);
        v_contacts_merged := v_contacts_merged + 1;
    END LOOP;

    -- 3.2 Contatos duplicados por CPF (so se ainda ativos apos a passada de telefone)
    IF v_apply THEN
        FOR rec IN
            WITH keyed AS (
                SELECT id, master_id, created_at, public._dd_cpf_key(cpf) AS k
                FROM public.contacts WHERE deleted_at IS NULL
            ), ranked AS (
                SELECT *, first_value(id) OVER (PARTITION BY master_id, k ORDER BY created_at ASC, id ASC) AS keeper_id
                FROM keyed WHERE k IS NOT NULL
            )
            SELECT id AS loser_id, keeper_id, master_id, k FROM ranked WHERE id <> keeper_id
            ORDER BY master_id, k, loser_id
        LOOP
            PERFORM public._dd_merge_contact(rec.keeper_id, rec.loser_id, rec.master_id, 'same_cpf', rec.k, v_apply);
            v_contacts_merged := v_contacts_merged + 1;
        END LOOP;
    END IF;

    -- 3.3 Leads duplicados: mesmo master + unidade + funil + contato (mantem o mais antigo)
    FOR rec IN
        WITH ranked AS (
            SELECT id, master_id, created_at,
                   first_value(id) OVER (
                       PARTITION BY master_id, venue_id, funnel_id, contact_id ORDER BY created_at ASC, id ASC
                   ) AS keeper_id
            FROM public.leads
            WHERE contact_id IS NOT NULL AND COALESCE(is_archived, FALSE) = FALSE
        )
        SELECT id AS loser_id, keeper_id, master_id FROM ranked WHERE id <> keeper_id
        ORDER BY master_id, loser_id
    LOOP
        PERFORM public._dd_merge_lead(rec.keeper_id, rec.loser_id, rec.master_id, v_apply);
    END LOOP;

    SELECT count(*) INTO v_leads_merged FROM public.lead_dedupe_log WHERE reason = 'same_contact_venue_funnel' AND applied = v_apply AND created_at >= now() - interval '1 hour';
    SELECT count(*) INTO v_leads_review FROM public.lead_dedupe_log WHERE reason = 'manual_review' AND applied = FALSE;
    SELECT count(*) INTO v_leads_no_contact FROM public.leads WHERE contact_id IS NULL;

    RAISE NOTICE 'Dedupe (apply=%): contatos mesclados=%, leads mesclados=%, leads para revisao manual=%, leads SEM contato=%',
        v_apply, v_contacts_merged, v_leads_merged, v_leads_review, v_leads_no_contact;
END $$;

-- 4. LIMPEZA DAS FUNCOES AUXILIARES
DROP FUNCTION IF EXISTS public._dd_merge_lead(UUID, UUID, UUID, BOOLEAN);
DROP FUNCTION IF EXISTS public._dd_merge_contact(UUID, UUID, UUID, TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public._dd_repoint(TEXT, TEXT, UUID, UUID);
DROP FUNCTION IF EXISTS public._dd_names_compatible(TEXT, TEXT);
DROP FUNCTION IF EXISTS public._dd_cpf_key(TEXT);
DROP FUNCTION IF EXISTS public._dd_phone_key(TEXT);

-- ==============================================================================
-- VALIDACAO (rodar depois; todos devem dar 0 / conferir):
--   -- contatos ativos ainda duplicados por telefone normalizado
--   SELECT master_id, regexp_replace(primary_phone,'\D','','g') k, count(*) FROM contacts
--    WHERE deleted_at IS NULL AND primary_phone NOT ILIKE 'sem-telefone-%' GROUP BY 1,2 HAVING count(*) > 1;
--   -- contratos/leads apontando para contato removido
--   SELECT count(*) FROM contracts c JOIN contacts k ON k.id = c.contact_id WHERE k.deleted_at IS NOT NULL;
--   SELECT count(*) FROM leads l JOIN contacts k ON k.id = l.contact_id WHERE k.deleted_at IS NOT NULL;
--   -- grupos de leads que ficaram para revisao manual
--   SELECT * FROM lead_dedupe_log WHERE reason = 'manual_review';
--   -- reversao de um contato: UPDATE contacts SET deleted_at = NULL WHERE id = '<removed_id>';
-- ==============================================================================


-- ============================================================
-- ETAPA 4 — INDICACOES
-- ============================================================
-- ==============================================================================
-- F5 SYSTEM • INDICACOES: master_id + contact_id em `referrals` e backfill
-- Data: 2026-11-18
-- Depende de: 20261114200000 (contacts, generate_alphanumeric_code) e, de preferencia,
--             20261118100000 (dedupe) ja aplicada, para casar com o contato mais antigo.
--
-- Motivo: o app enviava `master_id` ao inserir em `referrals`, mas a coluna nao existia
-- (insert recusado em silencio). Agora toda indicacao fica ligada ao Master e a um CONTATO.
-- Idempotente. Nenhum registro e apagado.
-- ==============================================================================

-- 1. COLUNAS
ALTER TABLE public.referrals
    ADD COLUMN IF NOT EXISTS master_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_referrals_master_id ON public.referrals (master_id);
CREATE INDEX IF NOT EXISTS idx_referrals_contact_id ON public.referrals (contact_id);
CREATE INDEX IF NOT EXISTS idx_referrals_lead_id ON public.referrals (lead_id);

-- 2. BACKFILL DE master_id (pelo lead; senao pela unidade da debutante)
UPDATE public.referrals r
SET master_id = l.master_id
FROM public.leads l
WHERE r.master_id IS NULL AND r.lead_id = l.id AND l.master_id IS NOT NULL;

UPDATE public.referrals r
SET master_id = v.master_id
FROM public.debutantes d
JOIN public.venues v ON v.id = d.venue_id
WHERE r.master_id IS NULL AND r.debutante_id = d.id AND v.master_id IS NOT NULL;

-- 3. BACKFILL DE contact_id (a partir do lead ja vinculado)
UPDATE public.referrals r
SET contact_id = l.contact_id
FROM public.leads l
WHERE r.contact_id IS NULL AND r.lead_id = l.id AND l.contact_id IS NOT NULL;

-- 4. RECUPERA INDICACOES CUJO REGISTRO EM `referrals` FOI PERDIDO (lead de debutante sem referral)
INSERT INTO public.referrals (
    id, master_id, contact_id, debutante_id, debutante_name, lead_id,
    name, phone, age, "group", notes, status, points_granted, created_at
)
SELECT
    gen_random_uuid(), l.master_id, l.contact_id, l.debutante_id, l.debutante_name, l.id,
    l.name, l.phone, l.age, COALESCE(l."group", 'Amigos'), l.notes,
    CASE WHEN l.is_validated THEN 'validated' ELSE 'pending' END,
    COALESCE(l.points_granted, 0), COALESCE(l.created_at, now())
FROM public.leads l
WHERE l.debutante_id IS NOT NULL
  AND lower(COALESCE(l.source_name, '')) LIKE 'indica%'
  AND COALESCE(l.is_archived, FALSE) = FALSE
  AND NOT (COALESCE(l.custom_field_values, '{}'::jsonb) ? 'merged_into_lead_id')
  AND NOT EXISTS (SELECT 1 FROM public.referrals r WHERE r.lead_id = l.id);

-- 5. TODA INDICACAO VIRA CONTATO: cria/vincula o contato dos leads de indicacao sem contact_id
DO $$
DECLARE
    rec RECORD;
    v_key TEXT;
    v_contact_id UUID;
    v_linked INT := 0;
    v_created INT := 0;
BEGIN
    FOR rec IN
        SELECT l.id AS lead_id, l.master_id, l.venue_id, l.name, l.phone, l.created_at
        FROM public.leads l
        WHERE l.contact_id IS NULL
          AND l.master_id IS NOT NULL
          AND (
              EXISTS (SELECT 1 FROM public.referrals r WHERE r.lead_id = l.id)
              OR (l.debutante_id IS NOT NULL AND lower(COALESCE(l.source_name, '')) LIKE 'indica%')
          )
        ORDER BY l.created_at ASC
    LOOP
        v_key := regexp_replace(COALESCE(rec.phone, ''), '\D', '', 'g');
        IF length(v_key) >= 12 AND v_key LIKE '55%' THEN v_key := substr(v_key, 3); END IF;
        CONTINUE WHEN length(v_key) NOT IN (10, 11);

        -- contato mais antigo do mesmo Master com o mesmo telefone normalizado
        SELECT c.id INTO v_contact_id
        FROM public.contacts c
        WHERE c.master_id = rec.master_id
          AND c.deleted_at IS NULL
          AND c.primary_phone NOT ILIKE 'sem-telefone-%'
          AND (CASE
                 WHEN length(regexp_replace(c.primary_phone, '\D', '', 'g')) >= 12
                  AND regexp_replace(c.primary_phone, '\D', '', 'g') LIKE '55%'
                 THEN substr(regexp_replace(c.primary_phone, '\D', '', 'g'), 3)
                 ELSE regexp_replace(c.primary_phone, '\D', '', 'g')
               END) = v_key
        ORDER BY c.created_at ASC, c.id ASC
        LIMIT 1;

        IF v_contact_id IS NULL THEN
            INSERT INTO public.contacts (master_id, code, name, primary_phone, relationship_role, created_at, updated_at)
            VALUES (
                rec.master_id,
                public.generate_alphanumeric_code('CONT', 8),
                COALESCE(NULLIF(trim(rec.name), ''), 'Contato ' || v_key),
                '55' || v_key,
                'Indicação',
                COALESCE(rec.created_at, now()),
                COALESCE(rec.created_at, now())
            )
            RETURNING id INTO v_contact_id;
            v_created := v_created + 1;
        END IF;

        UPDATE public.leads SET contact_id = v_contact_id WHERE id = rec.lead_id;
        UPDATE public.referrals SET contact_id = v_contact_id WHERE lead_id = rec.lead_id AND contact_id IS NULL;

        IF rec.venue_id IS NOT NULL THEN
            INSERT INTO public.contact_venue_access (master_id, contact_id, venue_id, first_interaction_at, last_interaction_at)
            VALUES (rec.master_id, v_contact_id, rec.venue_id, COALESCE(rec.created_at, now()), COALESCE(rec.created_at, now()))
            ON CONFLICT (contact_id, venue_id) DO NOTHING;
        END IF;
        v_linked := v_linked + 1;
    END LOOP;

    RAISE NOTICE 'Indicacoes: leads vinculados a contato=%, contatos criados=%', v_linked, v_created;
END $$;

-- ==============================================================================
-- VALIDACAO (devem dar 0):
--   SELECT count(*) FROM referrals WHERE master_id IS NULL;
--   SELECT count(*) FROM referrals WHERE contact_id IS NULL AND lead_id IS NOT NULL;
--   SELECT count(*) FROM leads WHERE debutante_id IS NOT NULL AND lower(coalesce(source_name,'')) LIKE 'indica%' AND contact_id IS NULL;
--   (restantes por telefone invalido/ausente: SELECT id, name, phone FROM leads WHERE ... para revisao manual)
-- ==============================================================================


-- ============================================================
-- ETAPA 5 — VERIFICACAO FINAL (qualquer falha desfaz TUDO)
-- ============================================================
DO $$
DECLARE
    v_leads_missing BIGINT;
    v_leads_total BIGINT;
    v_manual_contacts BIGINT;
    v_no_contact BIGINT;
    v_to_deleted_contract BIGINT;
    v_to_deleted_lead BIGINT;
    v_dup_phones BIGINT;
    v_review BIGINT;
    v_clients_unmigrated BIGINT;
    v_leads_no_contact BIGINT;
    v_refs_no_master BIGINT;
BEGIN
    -- Nenhum lead que existia antes pode ter desaparecido (leads novos criados durante a execucao sao ignorados)
    SELECT count(*) INTO v_leads_missing FROM public.bkp_20261118_lead_ids p WHERE NOT EXISTS (SELECT 1 FROM public.leads l WHERE l.id = p.id);
    IF v_leads_missing > 0 THEN
        RAISE EXCEPTION 'ABORTADO: % lead(s) existentes antes da migration nao existem mais. Nenhuma alteracao foi mantida.', v_leads_missing;
    END IF;
    SELECT count(*) INTO v_leads_total FROM public.leads;

    SELECT count(*) INTO v_no_contact FROM public.contracts WHERE contact_id IS NULL;
    IF v_no_contact > 0 THEN
        RAISE EXCEPTION 'ABORTADO: % contrato(s) sem contato. Nenhuma alteracao foi mantida.', v_no_contact;
    END IF;

    SELECT count(*) INTO v_to_deleted_contract
    FROM public.contracts c JOIN public.contacts k ON k.id = c.contact_id WHERE k.deleted_at IS NOT NULL;
    SELECT count(*) INTO v_to_deleted_lead
    FROM public.leads l JOIN public.contacts k ON k.id = l.contact_id WHERE k.deleted_at IS NOT NULL;
    IF v_to_deleted_contract > 0 OR v_to_deleted_lead > 0 THEN
        RAISE EXCEPTION 'ABORTADO: contratos (%) ou leads (%) apontam para contato removido.', v_to_deleted_contract, v_to_deleted_lead;
    END IF;

    SELECT count(*) INTO v_dup_phones FROM (
        SELECT master_id, k FROM (
            SELECT master_id,
                   CASE WHEN length(d) >= 12 AND d LIKE '55%' THEN substr(d, 3) ELSE d END AS k
            FROM (
                SELECT master_id, regexp_replace(primary_phone, '\D', '', 'g') AS d
                FROM public.contacts
                WHERE deleted_at IS NULL AND primary_phone NOT ILIKE 'sem-telefone-%'
                  AND id NOT IN (SELECT removed_id FROM public.contact_dedupe_log WHERE reason = 'manual_review')
            ) x
        ) y
        WHERE length(k) >= 8
        GROUP BY master_id, k HAVING count(*) > 1
    ) z;
    IF v_dup_phones > 0 THEN
        RAISE EXCEPTION 'ABORTADO: ainda existem % grupo(s) de contatos ativos duplicados por telefone.', v_dup_phones;
    END IF;

    -- Informativos (nao abortam)
    SELECT count(*) INTO v_review FROM public.lead_dedupe_log WHERE reason = 'manual_review';
    SELECT count(*) INTO v_manual_contacts FROM public.contact_dedupe_log WHERE reason = 'manual_review';
    SELECT count(*) INTO v_clients_unmigrated FROM public.clients WHERE master_id IS NOT NULL AND migrated_to_contract_id IS NULL;
    SELECT count(*) INTO v_leads_no_contact FROM public.leads WHERE contact_id IS NULL;
    SELECT count(*) INTO v_refs_no_master FROM public.referrals WHERE master_id IS NULL;

    RAISE NOTICE '=== VERIFICACAO OK ===';
    RAISE NOTICE 'Leads: % (nenhum dos existentes foi perdido). Contratos sem contato: 0. Contatos duplicados por telefone (mesmo nome): 0.', v_leads_total;
    RAISE NOTICE 'Contatos com MESMO telefone e NOMES diferentes (nao mesclados; decidir manualmente): %', v_manual_contacts;
    RAISE NOTICE 'Leads para revisao manual (duplicados ligados a contrato/venda): %', v_review;
    RAISE NOTICE 'Clientes legados ainda nao migrados para contrato: %', v_clients_unmigrated;
    RAISE NOTICE 'Leads ainda sem contato (telefone ausente/invalido): %', v_leads_no_contact;
    RAISE NOTICE 'Indicacoes sem master_id: %', v_refs_no_master;
END $$;

COMMIT;

-- ==============================================================================
-- REVERTER A LIMPEZA E AS INDICACOES (rode IMEDIATAMENTE apos a migration; depois disso o app ja gravou dados novos):
--   UPDATE contacts c SET deleted_at = b.deleted_at FROM bkp_20261118_contacts b WHERE b.id = c.id;
--   UPDATE leads l SET contact_id = b.contact_id, is_archived = b.is_archived, archived_at = b.archived_at,
--          custom_field_values = b.custom_field_values FROM bkp_20261118_leads_link b WHERE b.id = l.id;
--   UPDATE contracts c SET contact_id = b.contact_id FROM bkp_20261118_contracts_link b WHERE b.id = c.id;
--   INSERT INTO contact_venue_access SELECT * FROM bkp_20261118_contact_venue_access ON CONFLICT DO NOTHING;
--   INSERT INTO contact_dependents SELECT * FROM bkp_20261118_contact_dependents ON CONFLICT DO NOTHING;
--   -- referrals (so se nenhuma indicacao nova entrou desde a migration):
--   DELETE FROM referrals WHERE id NOT IN (SELECT id FROM bkp_20261118_referrals);
--   UPDATE referrals r SET lead_id = b.lead_id, contact_id = b.contact_id FROM bkp_20261118_referrals b WHERE b.id = r.id;
-- Depois de validado em producao, as tabelas bkp_* podem ser apagadas (DROP TABLE).
-- ==============================================================================
