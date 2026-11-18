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
