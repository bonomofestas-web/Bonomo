-- Tempo real de contratos: inclui contracts, contract_funnel_placements e venue_goals na publicacao Realtime.
-- Idempotente. Nenhuma policy nova (isolamento por master_id segue nos servicos).
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['contracts', 'contract_funnel_placements', 'venue_goals']
    LOOP
        IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
           AND NOT EXISTS (
               SELECT 1 FROM pg_publication_tables
               WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
           ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
    END LOOP;
END $$;
