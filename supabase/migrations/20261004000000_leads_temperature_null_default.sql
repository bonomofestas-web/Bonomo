-- F5 System • Correção de Temperatura de Entrada dos Leads
-- Novos leads devem entrar sempre com temperatura em branco (null), sem valor pré-preenchido.

-- 1. Remove qualquer DEFAULT pré-existente na coluna temperature
ALTER TABLE IF EXISTS public.leads 
  ALTER COLUMN temperature DROP DEFAULT;

-- 2. Limpa temperatura de leads recentes que receberam o default 'warm' involuntariamente
UPDATE public.leads 
SET temperature = NULL 
WHERE temperature = 'warm' 
  AND (created_at >= NOW() - INTERVAL '30 days');
