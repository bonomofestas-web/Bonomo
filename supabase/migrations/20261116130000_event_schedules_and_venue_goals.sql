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
