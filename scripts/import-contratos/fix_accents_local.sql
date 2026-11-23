-- Corrige acentos trocados por "?" nos contratos importados (BANCO LOCAL). Idempotente: pode rodar mais de uma vez.
--
-- Como rodar (nunca por pipe no PowerShell: o console converte os bytes acentuados em "?" e recria o problema):
--   docker cp scripts/import-contratos/fix_accents_local.sql supabase_db_Bonomo_Festas_2:/tmp/fix_accents_local.sql
--   docker exec supabase_db_Bonomo_Festas_2 psql -U postgres -v ON_ERROR_STOP=1 -f /tmp/fix_accents_local.sql
--
-- Regra para qualquer importador novo: gravar por supabase-js ou por `psql -f arquivo.sql` (UTF-8), nunca com `-c "texto"` vindo do PowerShell.

BEGIN;

-- 1. Rótulo exato conhecido: "Importa????o de contratos" -> "Importação de contratos"
UPDATE contracts
SET approved_by_name = 'Importação de contratos'
WHERE approved_by_name ~ '^Importa\?+o de contratos$';

COMMIT;

-- 2. Somente leitura: endereços e textos do cadastro do cliente que ainda têm "?" no meio das palavras.
--    A letra original (í, é, ã, ç...) não dá para adivinhar; revisar a mão com o PDF do contrato.
SELECT contract_code,
       client_snapshot->>'name'    AS contratante,
       client_snapshot->>'address' AS endereco
FROM contracts
WHERE client_snapshot::text ~ '[A-Za-zÀ-ÿ]\?{2,}[A-Za-zÀ-ÿ]'
ORDER BY contract_code;

-- 3. Conferência
SELECT coalesce(approved_by_name, '(nulo)') AS homologado_por, count(*)
FROM contracts
GROUP BY 1
ORDER BY 2 DESC;
