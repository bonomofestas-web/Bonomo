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
