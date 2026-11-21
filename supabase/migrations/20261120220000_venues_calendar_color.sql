-- Cor da casa nos calendarios (agenda de eventos, tarefas, compromissos, agendamentos).
-- Coluna opcional na propria venue (ja escopada por master_id); sem escolha o app usa uma cor automatica.
ALTER TABLE IF EXISTS public.venues ADD COLUMN IF NOT EXISTS calendar_color TEXT;
