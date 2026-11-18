DO $$ 
BEGIN
    ALTER TABLE public.contracts
        ADD COLUMN IF NOT EXISTS entry_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00;
    ALTER TABLE public.contracts
        ADD COLUMN IF NOT EXISTS balance_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00;
    ALTER TABLE public.contracts
        ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;
END $$;
