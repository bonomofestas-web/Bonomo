-- ==============================================================================
-- F5 SYSTEM • PRE-CARGA DAS ULTIMAS MENSAGENS DAS CONVERSAS (WhatsApp fluido)
-- Data: 2026-11-20
--
-- Funcao: devolve, em UMA chamada, as ultimas N atividades (mensagens/notas) de CADA lead informado
-- (ate 100 leads por chamada), sem os recibos de "Mensagem Visualizada". Usa o indice existente
-- idx_lead_activities_lead_timestamp (lead_id, timestamp DESC) via LATERAL: custo por lead ~ N linhas.
--
--   p_lead_ids : leads (o app envia so os do escopo do usuario)
--   p_per_lead : quantas por lead (padrao 20, maximo 200)
--   p_since    : se informado, so atividades MAIS NOVAS que esse instante (atualizacao por delta do cache local)
--
-- SECURITY INVOKER (padrao): as politicas da tabela continuam valendo. Nao altera nem apaga dados. Idempotente.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_recent_lead_activities(
    p_lead_ids UUID[],
    p_per_lead INT DEFAULT 20,
    p_since TIMESTAMPTZ DEFAULT NULL
)
RETURNS SETOF public.lead_activities
LANGUAGE sql
STABLE
AS $$
    SELECT a.*
    FROM unnest((SELECT COALESCE(p_lead_ids[1:100], ARRAY[]::uuid[]))) AS l(id)
    CROSS JOIN LATERAL (
        SELECT x.*
        FROM public.lead_activities x
        WHERE x.lead_id = l.id
          AND x.title IS DISTINCT FROM 'Mensagem Visualizada'
          AND (p_since IS NULL OR x."timestamp" > p_since)
        ORDER BY x."timestamp" DESC
        LIMIT GREATEST(1, LEAST(COALESCE(p_per_lead, 20), 200))
    ) a;
$$;

GRANT EXECUTE ON FUNCTION public.get_recent_lead_activities(UUID[], INT, TIMESTAMPTZ) TO anon, authenticated;
