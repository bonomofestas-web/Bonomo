-- Endurece a tabela sources sem alterar a RLS (formularios publicos /f/:slug e links /r/:slug dependem de leitura anonima):
-- 1) master_id (preenchido a partir da casa) para auditoria e filtros por Master;
-- 2) indice unico em whatsapp_instance_id: uma instancia pertence a UMA origem (logo, a um unico funil).
-- O indice so e criado se nao houver duplicados; se houver, a migration avisa e deve ser rodada de novo depois de limpar. Idempotente.
ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS master_id UUID;

UPDATE public.sources s
SET master_id = v.master_id
FROM public.venues v
WHERE s.master_id IS NULL AND v.master_id IS NOT NULL AND s.venue_id::text = v.id::text;

CREATE INDEX IF NOT EXISTS idx_sources_master_id ON public.sources (master_id);

-- Origem nova herda o Master da casa automaticamente (o app nao precisa informar)
CREATE OR REPLACE FUNCTION public.f5_sources_set_master() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    IF NEW.master_id IS NULL THEN
        SELECT v.master_id INTO NEW.master_id FROM public.venues v WHERE v.id::text = NEW.venue_id::text LIMIT 1;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sources_set_master ON public.sources;
CREATE TRIGGER trg_sources_set_master
    BEFORE INSERT OR UPDATE OF venue_id ON public.sources
    FOR EACH ROW EXECUTE FUNCTION public.f5_sources_set_master();

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.sources WHERE whatsapp_instance_id IS NOT NULL
        GROUP BY whatsapp_instance_id HAVING count(*) > 1
    ) THEN
        RAISE NOTICE 'Instancias duplicadas em sources: indice unico NAO criado. Resolva as duplicadas e rode esta migration de novo.';
    ELSE
        CREATE UNIQUE INDEX IF NOT EXISTS uq_sources_whatsapp_instance
            ON public.sources (whatsapp_instance_id) WHERE whatsapp_instance_id IS NOT NULL;
    END IF;
END $$;
