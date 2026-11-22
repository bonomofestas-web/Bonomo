-- Repara nomes de setores oficiais gravados com a codificacao quebrada (ex.: "PÃ³S-VENDA").
-- Escapes Unicode (U&'...') para nao depender da codificacao de quem aplica o arquivo. Idempotente.
UPDATE public.job_sectors SET name = U&'P\00F3s-Venda'
 WHERE sector_id = 'pos_venda' AND (name LIKE U&'%\00C3%' OR name LIKE U&'%\00C2%');
UPDATE public.job_sectors SET name = 'Diretoria'
 WHERE sector_id = 'diretoria' AND (name LIKE U&'%\00C3%' OR name LIKE U&'%\00C2%');
UPDATE public.job_sectors SET name = 'Marketing e Tecnologia'
 WHERE sector_id = 'marketing_tecnologia' AND (name LIKE U&'%\00C3%' OR name LIKE U&'%\00C2%');
