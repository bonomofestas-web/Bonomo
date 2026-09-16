-- ==============================================================================
-- F5 SYSTEM • ADIÇÃO DA FOTO PANORÂMICA DO BANNER DA UNIDADE (SEPARADA DOS CONVITES)
-- ==============================================================================

-- 1. Adicionar coluna banner_image_url caso ainda não exista
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS banner_image_url TEXT;

-- 2. Inicializar banner_image_url com o valor atual de ballroom_image_url para compatibilidade imediata
UPDATE public.venues 
SET banner_image_url = ballroom_image_url 
WHERE banner_image_url IS NULL AND ballroom_image_url IS NOT NULL;
