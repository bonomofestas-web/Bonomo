-- Metas por unidade e por colaborador com periodo, recorrencia e historico imutavel.
-- - goal_periods: meta da unidade em um periodo (mensal, bimestral, trimestral, semestral ou personalizado).
-- - collaborator_goals: metas individuais dentro de um periodo; a soma nao pode passar da meta da unidade (trigger).
-- - goal_results: resultado de cada meta ao fim do periodo (so INSERT/SELECT: nunca e alterado nem apagado pelo app).
-- - goal_audit: trilha de edicoes (quem, quando, valor anterior).
-- Isolamento: master_id obrigatorio e RLS por Master (NAO usa USING (true)).
-- Requer public.f5_current_master_id() (migration 20261117140000). Idempotente.
-- As tabelas antigas (venue_goals, team_goals, collaborators.goals) NAO sao alteradas nem removidas.

CREATE TABLE IF NOT EXISTS public.goal_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    kind TEXT NOT NULL DEFAULT 'monthly' CHECK (kind IN ('monthly', 'bimonthly', 'quarterly', 'semiannual', 'custom')),
    starts_on DATE NOT NULL,
    ends_on DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'closed')),
    is_recurring BOOLEAN NOT NULL DEFAULT false,
    revenue_target NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (revenue_target >= 0),
    closings_target INT NOT NULL DEFAULT 0 CHECK (closings_target >= 0),
    leads_target INT NOT NULL DEFAULT 0 CHECK (leads_target >= 0),
    appointments_target INT NOT NULL DEFAULT 0 CHECK (appointments_target >= 0),
    attendance_rate_target NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (attendance_rate_target >= 0 AND attendance_rate_target <= 100),
    conversion_rate_target NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (conversion_rate_target >= 0 AND conversion_rate_target <= 100),
    response_time_target_minutes INT NOT NULL DEFAULT 0 CHECK (response_time_target_minutes >= 0), -- 1a resposta
    avg_response_target_minutes INT NOT NULL DEFAULT 0 CHECK (avg_response_target_minutes >= 0),   -- media de qualquer mensagem
    created_by_id UUID,
    created_by_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_goal_periods_dates CHECK (ends_on >= starts_on),
    -- Um periodo por unidade e janela de datas: garante virada idempotente (nunca duplica o proximo periodo)
    CONSTRAINT uq_goal_periods_venue_window UNIQUE (venue_id, starts_on, ends_on)
);
CREATE INDEX IF NOT EXISTS idx_goal_periods_master_venue ON public.goal_periods(master_id, venue_id);
CREATE INDEX IF NOT EXISTS idx_goal_periods_status_end ON public.goal_periods(status, ends_on);

CREATE TABLE IF NOT EXISTS public.collaborator_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    period_id UUID NOT NULL REFERENCES public.goal_periods(id) ON DELETE CASCADE,
    collaborator_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    metric TEXT NOT NULL CHECK (metric IN ('revenue', 'closings', 'leads', 'appointments', 'attendance_rate', 'conversion_rate', 'response_time', 'avg_response_time')),
    target_value NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (target_value >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'closed')),
    is_recurring BOOLEAN NOT NULL DEFAULT true,
    created_by_id UUID,
    created_by_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_collaborator_goals_scope UNIQUE (period_id, collaborator_id, metric)
);
CREATE INDEX IF NOT EXISTS idx_collaborator_goals_master_venue ON public.collaborator_goals(master_id, venue_id);
CREATE INDEX IF NOT EXISTS idx_collaborator_goals_collab ON public.collaborator_goals(collaborator_id);

-- Resultado de cada meta ao fim do periodo. Imutavel: so existem policies de SELECT e INSERT.
CREATE TABLE IF NOT EXISTS public.goal_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    period_id UUID,
    scope TEXT NOT NULL CHECK (scope IN ('venue', 'collaborator')),
    collaborator_id UUID,
    collaborator_name TEXT,
    metric TEXT NOT NULL CHECK (metric IN ('revenue', 'closings', 'leads', 'appointments', 'attendance_rate', 'conversion_rate', 'response_time', 'avg_response_time')),
    starts_on DATE NOT NULL,
    ends_on DATE NOT NULL,
    target_value NUMERIC(14, 2) NOT NULL,
    actual_value NUMERIC(14, 2) NOT NULL,
    pct NUMERIC(8, 2),
    outcome TEXT NOT NULL CHECK (outcome IN ('met', 'missed')),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_goal_results_master_venue ON public.goal_results(master_id, venue_id, ends_on DESC);
CREATE INDEX IF NOT EXISTS idx_goal_results_collab ON public.goal_results(collaborator_id);
-- Evita gravar duas vezes o resultado da mesma meta no mesmo periodo (virada idempotente)
CREATE UNIQUE INDEX IF NOT EXISTS uq_goal_results_once
    ON public.goal_results (period_id, scope, COALESCE(collaborator_id, '00000000-0000-0000-0000-000000000000'::uuid), metric)
    WHERE period_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.goal_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    venue_id UUID,
    period_id UUID,
    collaborator_id UUID,
    metric TEXT,
    field TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by_id UUID,
    changed_by_name TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_goal_audit_master_period ON public.goal_audit(master_id, period_id, changed_at DESC);

-- Teto: a soma das metas dos colaboradores (por metrica) nao passa da meta da unidade no periodo.
CREATE OR REPLACE FUNCTION public.f5_check_collaborator_goal_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    venue_cap NUMERIC;
    used NUMERIC;
BEGIN
    -- Taxas e tempos de resposta sao individuais: so as metas de volume (somaveis) tem teto
    IF NEW.metric NOT IN ('revenue', 'closings', 'leads', 'appointments') THEN
        RETURN NEW;
    END IF;

    SELECT CASE NEW.metric
               WHEN 'revenue' THEN revenue_target
               WHEN 'closings' THEN closings_target
               WHEN 'leads' THEN leads_target
               WHEN 'appointments' THEN appointments_target
           END
      INTO venue_cap
      FROM public.goal_periods
     WHERE id = NEW.period_id;

    SELECT COALESCE(SUM(target_value), 0)
      INTO used
      FROM public.collaborator_goals
     WHERE period_id = NEW.period_id
       AND metric = NEW.metric
       -- exclui a propria meta do colaborador (a linha que esta sendo inserida/atualizada via upsert)
       AND collaborator_id <> NEW.collaborator_id;

    IF used + NEW.target_value > COALESCE(venue_cap, 0) THEN
        RAISE EXCEPTION 'goal_cap_exceeded' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_collaborator_goals_cap ON public.collaborator_goals;
CREATE TRIGGER trg_collaborator_goals_cap
    BEFORE INSERT OR UPDATE OF target_value, metric, period_id ON public.collaborator_goals
    FOR EACH ROW EXECUTE FUNCTION public.f5_check_collaborator_goal_cap();

-- RLS por Master
ALTER TABLE public.goal_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "goal_periods_master_scope" ON public.goal_periods;
CREATE POLICY "goal_periods_master_scope" ON public.goal_periods
    FOR ALL TO authenticated
    USING (master_id = public.f5_current_master_id())
    WITH CHECK (master_id = public.f5_current_master_id());

ALTER TABLE public.collaborator_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "collaborator_goals_master_scope" ON public.collaborator_goals;
CREATE POLICY "collaborator_goals_master_scope" ON public.collaborator_goals
    FOR ALL TO authenticated
    USING (master_id = public.f5_current_master_id())
    WITH CHECK (master_id = public.f5_current_master_id());

ALTER TABLE public.goal_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "goal_results_select" ON public.goal_results;
CREATE POLICY "goal_results_select" ON public.goal_results
    FOR SELECT TO authenticated
    USING (master_id = public.f5_current_master_id());
DROP POLICY IF EXISTS "goal_results_insert" ON public.goal_results;
CREATE POLICY "goal_results_insert" ON public.goal_results
    FOR INSERT TO authenticated
    WITH CHECK (master_id = public.f5_current_master_id());

ALTER TABLE public.goal_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "goal_audit_select" ON public.goal_audit;
CREATE POLICY "goal_audit_select" ON public.goal_audit
    FOR SELECT TO authenticated
    USING (master_id = public.f5_current_master_id());
DROP POLICY IF EXISTS "goal_audit_insert" ON public.goal_audit;
CREATE POLICY "goal_audit_insert" ON public.goal_audit
    FOR INSERT TO authenticated
    WITH CHECK (master_id = public.f5_current_master_id());
