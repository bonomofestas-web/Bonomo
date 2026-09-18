-- ==============================================================================
-- F5 SYSTEM • HIGIENIZAÇÃO DE FOTOS: EXPURGO DE BASE64 E PROTEÇÃO DEFINITIVA
-- ==============================================================================
-- 1. Limpa retroativamente qualquer foto salva como Base64 (data:image%)
-- 2. Cria triggers para anular automaticamente qualquer tentativa de gravar
--    fotos diretamente no banco em vez de usar o Cloudflare R2
-- ==============================================================================

-- 1. EXPURGO RETROATIVO NAS TABELAS
UPDATE public.collaborators
SET avatar_url = NULL
WHERE avatar_url LIKE 'data:image%';

UPDATE public.debutantes
SET avatar_url = NULL
WHERE avatar_url LIKE 'data:image%';

UPDATE public.debutantes
SET custom_invite_photo_url = NULL
WHERE custom_invite_photo_url LIKE 'data:image%';

UPDATE public.venues
SET logo_url = NULL
WHERE logo_url LIKE 'data:image%';

UPDATE public.venues
SET ballroom_image_url = NULL
WHERE ballroom_image_url LIKE 'data:image%';

UPDATE public.venues
SET banner_image_url = NULL
WHERE banner_image_url LIKE 'data:image%';

UPDATE public.commercial_funnels
SET custom_image_url = NULL
WHERE custom_image_url LIKE 'data:image%';

UPDATE public.lead_activities
SET author_avatar_url = NULL
WHERE author_avatar_url LIKE 'data:image%';

UPDATE public.lead_participants
SET collaborator_avatar_url = NULL
WHERE collaborator_avatar_url LIKE 'data:image%';

UPDATE public.task_comments
SET author_avatar = NULL
WHERE author_avatar LIKE 'data:image%';

UPDATE public.support_tickets
SET image_url = NULL
WHERE image_url LIKE 'data:image%';

-- 2. FUNÇÃO E TRIGGERS PARA BLOQUEIO AUTOMÁTICO DE BASE64
CREATE OR REPLACE FUNCTION public.fn_enforce_r2_no_base64()
RETURNS trigger AS $$
BEGIN
  -- Collaborators
  IF TG_TABLE_NAME = 'collaborators' THEN
    IF NEW.avatar_url LIKE 'data:image%' THEN
      NEW.avatar_url := NULL;
    END IF;
  END IF;

  -- Debutantes
  IF TG_TABLE_NAME = 'debutantes' THEN
    IF NEW.avatar_url LIKE 'data:image%' THEN
      NEW.avatar_url := NULL;
    END IF;
    IF NEW.custom_invite_photo_url LIKE 'data:image%' THEN
      NEW.custom_invite_photo_url := NULL;
    END IF;
  END IF;

  -- Venues
  IF TG_TABLE_NAME = 'venues' THEN
    IF NEW.logo_url LIKE 'data:image%' THEN
      NEW.logo_url := NULL;
    END IF;
    IF NEW.ballroom_image_url LIKE 'data:image%' THEN
      NEW.ballroom_image_url := NULL;
    END IF;
    IF NEW.banner_image_url LIKE 'data:image%' THEN
      NEW.banner_image_url := NULL;
    END IF;
  END IF;

  -- Commercial Funnels
  IF TG_TABLE_NAME = 'commercial_funnels' THEN
    IF NEW.custom_image_url LIKE 'data:image%' THEN
      NEW.custom_image_url := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers BEFORE INSERT OR UPDATE
DROP TRIGGER IF EXISTS trg_collaborators_no_base64 ON public.collaborators;
CREATE TRIGGER trg_collaborators_no_base64
  BEFORE INSERT OR UPDATE ON public.collaborators
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_enforce_r2_no_base64();

DROP TRIGGER IF EXISTS trg_debutantes_no_base64 ON public.debutantes;
CREATE TRIGGER trg_debutantes_no_base64
  BEFORE INSERT OR UPDATE ON public.debutantes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_enforce_r2_no_base64();

DROP TRIGGER IF EXISTS trg_venues_no_base64 ON public.venues;
CREATE TRIGGER trg_venues_no_base64
  BEFORE INSERT OR UPDATE ON public.venues
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_enforce_r2_no_base64();

DROP TRIGGER IF EXISTS trg_commercial_funnels_no_base64 ON public.commercial_funnels;
CREATE TRIGGER trg_commercial_funnels_no_base64
  BEFORE INSERT OR UPDATE ON public.commercial_funnels
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_enforce_r2_no_base64();

-- 3. FUNÇÃO RPC PARA VARREDURA MANUAL OU AUTOMATIZADA
CREATE OR REPLACE FUNCTION public.purge_all_base64_photos()
RETURNS jsonb AS $$
DECLARE
  v_collab_count int := 0;
  v_debut_count int := 0;
  v_venue_count int := 0;
  v_funnel_count int := 0;
BEGIN
  WITH deleted AS (
    UPDATE public.collaborators SET avatar_url = NULL WHERE avatar_url LIKE 'data:image%' RETURNING 1
  ) SELECT count(*) INTO v_collab_count FROM deleted;

  WITH deleted AS (
    UPDATE public.debutantes SET avatar_url = NULL, custom_invite_photo_url = NULL
    WHERE avatar_url LIKE 'data:image%' OR custom_invite_photo_url LIKE 'data:image%' RETURNING 1
  ) SELECT count(*) INTO v_debut_count FROM deleted;

  WITH deleted AS (
    UPDATE public.venues SET logo_url = NULL, ballroom_image_url = NULL, banner_image_url = NULL
    WHERE logo_url LIKE 'data:image%' OR ballroom_image_url LIKE 'data:image%' OR banner_image_url LIKE 'data:image%' RETURNING 1
  ) SELECT count(*) INTO v_venue_count FROM deleted;

  WITH deleted AS (
    UPDATE public.commercial_funnels SET custom_image_url = NULL WHERE custom_image_url LIKE 'data:image%' RETURNING 1
  ) SELECT count(*) INTO v_funnel_count FROM deleted;

  RETURN jsonb_build_object(
    'purged_collaborators', v_collab_count,
    'purged_debutantes', v_debut_count,
    'purged_venues', v_venue_count,
    'purged_funnels', v_funnel_count,
    'total_purged', v_collab_count + v_debut_count + v_venue_count + v_funnel_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
