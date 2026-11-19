-- Metas comerciais v2: o catalogo passa a ser so comercial.
-- Sai: leads captados e conversao lead->contrato (marketing). Entram: taxa de agendamento (qualificado->agendado)
-- e taxa de fechamento (fechados sobre quem compareceu). Idempotente. Nao altera migrations ja aplicadas.

-- 1. Novas metas de taxa na meta da unidade
ALTER TABLE public.goal_periods
    ADD COLUMN IF NOT EXISTS scheduling_rate_target NUMERIC(5, 2) NOT NULL DEFAULT 0
        CHECK (scheduling_rate_target >= 0 AND scheduling_rate_target <= 100),
    ADD COLUMN IF NOT EXISTS closing_rate_target NUMERIC(5, 2) NOT NULL DEFAULT 0
        CHECK (closing_rate_target >= 0 AND closing_rate_target <= 100);

-- 2. Metas de marketing deixam de existir (catalogo ainda nao tinha sido usado em producao)
DELETE FROM public.collaborator_goals WHERE metric IN ('leads', 'conversion_rate');
ALTER TABLE public.goal_periods
    DROP COLUMN IF EXISTS leads_target,
    DROP COLUMN IF EXISTS conversion_rate_target;

-- 3. CHECK de metric com o catalogo novo (goal_results e historico imutavel: NOT VALID nao revalida linhas antigas)
DO $$
DECLARE
    t TEXT;
    c RECORD;
BEGIN
    FOREACH t IN ARRAY ARRAY['collaborator_goals', 'goal_results'] LOOP
        FOR c IN
            SELECT conname FROM pg_constraint
            WHERE conrelid = ('public.' || t)::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%metric%'
        LOOP
            EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', t, c.conname);
        END LOOP;
        EXECUTE format(
            'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (metric IN (%L, %L, %L, %L, %L, %L, %L, %L)) NOT VALID',
            t, 'chk_' || t || '_metric',
            'revenue', 'closings', 'appointments', 'scheduling_rate', 'attendance_rate', 'closing_rate', 'response_time', 'avg_response_time'
        );
    END LOOP;
END $$;

-- 4. Teto: so as metas de volume somam entre colaboradores (faturamento, contratos, agendamentos)
CREATE OR REPLACE FUNCTION public.f5_check_collaborator_goal_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    venue_cap NUMERIC;
    used NUMERIC;
BEGIN
    IF NEW.metric NOT IN ('revenue', 'closings', 'appointments') THEN
        RETURN NEW;
    END IF;

    SELECT CASE NEW.metric
               WHEN 'revenue' THEN revenue_target
               WHEN 'closings' THEN closings_target
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
       AND collaborator_id <> NEW.collaborator_id;

    IF used + NEW.target_value > COALESCE(venue_cap, 0) THEN
        RAISE EXCEPTION 'goal_cap_exceeded' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
