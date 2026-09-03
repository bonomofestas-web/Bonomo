-- ==============================================================================
-- F5 SYSTEM: MIGRATION - CÓDIGO ÚNICO DE LEADS (LEAD-XXXXXX) E RESET DE SENHA
-- ==============================================================================

-- 1. ADICIONA A COLUNA CODE NA TABELA LEADS
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;

-- Função auxiliar para gerar código aleatório LEAD-XXXXXX no Postgres
CREATE OR REPLACE FUNCTION generate_lead_unique_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := 'LEAD-';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 2. PREENCHE CÓDIGOS PARA LEADS QUE JÁ EXISTEM SEM CÓDIGO
DO $$
DECLARE
  r RECORD;
  new_c TEXT;
BEGIN
  FOR r IN SELECT id FROM public.leads WHERE code IS NULL OR code = '' LOOP
    LOOP
      new_c := generate_lead_unique_code();
      BEGIN
        UPDATE public.leads SET code = new_c WHERE id = r.id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- Se colidir, tenta novamente
      END;
    END LOOP;
  END LOOP;
END;
$$;

-- 3. TRIGGER AUTOMÁTICO PARA GARANTIR QUE NENHUM LEAD SEJA INSERIDO SEM CÓDIGO
CREATE OR REPLACE FUNCTION trg_set_lead_code()
RETURNS TRIGGER AS $$
DECLARE
  new_c TEXT;
BEGIN
  IF NEW.code IS NULL OR trim(NEW.code) = '' THEN
    LOOP
      new_c := generate_lead_unique_code();
      BEGIN
        NEW.code := new_c;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- Repete se gerar código repetido
      END;
    END LOOP;
  END IF;

  -- Se o lead não possui nome ou o nome for vazio, atribui o próprio código como nome
  IF NEW.name IS NULL OR trim(NEW.name) = '' OR NEW.name = 'Sem nome' OR NEW.name = 'Lead Sem Nome' THEN
    NEW.name := NEW.code;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leads_auto_code ON public.leads;
CREATE TRIGGER trg_leads_auto_code
BEFORE INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION trg_set_lead_code();

-- 4. TABELA PARA GESTÃO DE CÓDIGOS DE RECUPERAÇÃO DE SENHA (OTP 6 DÍGITOS)
CREATE TABLE IF NOT EXISTS public.password_reset_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes'),
  used BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_password_reset_codes_lookup 
ON public.password_reset_codes (email, code, used);

-- RLS
ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can insert reset code" ON public.password_reset_codes;
CREATE POLICY "Public can insert reset code" 
ON public.password_reset_codes FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can verify reset code" ON public.password_reset_codes;
CREATE POLICY "Public can verify reset code" 
ON public.password_reset_codes FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Public can update reset code" ON public.password_reset_codes;
CREATE POLICY "Public can update reset code" 
ON public.password_reset_codes FOR UPDATE 
TO anon, authenticated 
USING (true);
