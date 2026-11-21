-- ==============================================================================
-- F5 SYSTEM • CONTATO VIRA COLABORADOR
-- Marca o contato que foi transformado em colaborador (so permitido sem contrato ativo; os ativos de funil sao encerrados
-- como perdidos). collaborator_id guarda o vinculo quando o cadastro do colaborador for concluido. Idempotente.
-- ==============================================================================
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS is_collaborator boolean NOT NULL DEFAULT false;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS collaborator_id uuid REFERENCES public.collaborators(id) ON DELETE SET NULL;
