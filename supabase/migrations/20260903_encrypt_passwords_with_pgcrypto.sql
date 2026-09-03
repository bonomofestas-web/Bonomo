-- ==============================================================================
-- F5 SYSTEM: MIGRATION - CRIPTOGRAFIA DE SENHAS COM PGCRYPTO (BCRYPT)
-- ==============================================================================

-- 1. Habilita a extensão de criptografia nativa do PostgreSQL
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Trigger Function que criptografa qualquer senha inserida ou alterada
CREATE OR REPLACE FUNCTION trg_encrypt_collaborator_password()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.password IS NOT NULL AND trim(NEW.password) <> '' THEN
    -- Se a senha ainda não estiver criptografada (não começa com o prefixo bcrypt $2a$, $2b$ ou $2y$)
    IF NOT (NEW.password ~ '^\$2[aby]\$[0-9]{2}\$') THEN
      NEW.password := crypt(NEW.password, gen_salt('bf', 10));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Aplica o trigger na tabela collaborators
DROP TRIGGER IF EXISTS trg_collaborators_encrypt_pw ON public.collaborators;
CREATE TRIGGER trg_collaborators_encrypt_pw
BEFORE INSERT OR UPDATE OF password ON public.collaborators
FOR EACH ROW
EXECUTE FUNCTION trg_encrypt_collaborator_password();

-- 4. Função segura para validação de senha (RPC)
-- Retorna true se a senha digitada corresponder ao hash criptografado
CREATE OR REPLACE FUNCTION verify_collaborator_password(email_input TEXT, password_input TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  stored_pw TEXT;
BEGIN
  SELECT password INTO stored_pw 
  FROM public.collaborators 
  WHERE lower(email) = lower(trim(email_input));

  IF stored_pw IS NULL OR stored_pw = '' THEN
    RETURN false;
  END IF;

  -- Validação se for hash bcrypt
  IF stored_pw ~ '^\$2[aby]\$[0-9]{2}\$' THEN
    RETURN stored_pw = crypt(password_input, stored_pw);
  END IF;

  -- Fallback de compatibilidade caso ainda não tenha sido convertida
  RETURN stored_pw = password_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Criptografa imediatamente todas as senhas que estiverem em texto puro
UPDATE public.collaborators
SET password = crypt(password, gen_salt('bf', 10))
WHERE password IS NOT NULL 
  AND trim(password) <> '' 
  AND NOT (password ~ '^\$2[aby]\$[0-9]{2}\$');
