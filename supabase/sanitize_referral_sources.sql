DO $$
BEGIN
  UPDATE public.sources 
  SET name = 'Indicações • Espaço F5 System' 
  WHERE venue_id = '0d62608e-63b1-4150-82e9-c963a6e7c438' AND type = 'referral';

  UPDATE public.sources 
  SET name = 'Indicações • Minha house' 
  WHERE venue_id = '4194834f-feb7-4369-bc3e-4500d5714b9c' AND type = 'referral';

  DELETE FROM public.sources 
  WHERE name = 'Indicações • Mansão Bonomo' AND type = 'referral';

  DELETE FROM public.sources 
  WHERE id IN (
    SELECT id FROM public.sources 
    WHERE venue_id = 'a1111111-1111-1111-1111-111111111111' AND type = 'referral'
    ORDER BY created_at ASC
    LIMIT 1
  );

  DELETE FROM public.sources 
  WHERE venue_id NOT IN (SELECT id::text FROM public.venues);
END $$;
