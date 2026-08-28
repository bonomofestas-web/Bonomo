-- ============================================================================
-- LIBERAÇÃO DE POLÍTICAS RLS PÚBLICAS PARA LINKS DE DEBUTANTES & CONVIDADOS
-- ============================================================================

-- 1. Habilitar RLS nas tabelas públicas
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debutantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 2. Permitir leitura pública (anônima) para qualquer visitante com o link
DROP POLICY IF EXISTS "Allow public read on venues" ON public.venues;
CREATE POLICY "Allow public read on venues" 
ON public.venues FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow public read on debutantes" ON public.debutantes;
CREATE POLICY "Allow public read on debutantes" 
ON public.debutantes FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow public read on guests" ON public.guests;
CREATE POLICY "Allow public read on guests" 
ON public.guests FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow public read on referrals" ON public.referrals;
CREATE POLICY "Allow public read on referrals" 
ON public.referrals FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow public read on appointments" ON public.appointments;
CREATE POLICY "Allow public read on appointments" 
ON public.appointments FOR SELECT 
TO anon, authenticated 
USING (true);

-- 3. Permitir confirmação de presença (RSVP) e auto-convite por convidados
DROP POLICY IF EXISTS "Allow public insert on guests" ON public.guests;
CREATE POLICY "Allow public insert on guests" 
ON public.guests FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on guests" ON public.guests;
CREATE POLICY "Allow public update on guests" 
ON public.guests FOR UPDATE 
TO anon, authenticated 
USING (true);

-- 4. Permitir envio de indicações pela debutante
DROP POLICY IF EXISTS "Allow public insert on referrals" ON public.referrals;
CREATE POLICY "Allow public insert on referrals" 
ON public.referrals FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on debutantes" ON public.debutantes;
CREATE POLICY "Allow public update on debutantes" 
ON public.debutantes FOR UPDATE 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow public insert on debutantes" ON public.debutantes;
CREATE POLICY "Allow public insert on debutantes" 
ON public.debutantes FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete on debutantes" ON public.debutantes;
CREATE POLICY "Allow public delete on debutantes" 
ON public.debutantes FOR DELETE 
TO anon, authenticated 
USING (true);

