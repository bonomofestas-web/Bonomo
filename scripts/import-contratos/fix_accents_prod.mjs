#!/usr/bin/env node
/**
 * Corrige no banco de PRODUCAO o rotulo "Importa????o de contratos" (acentos trocados por "?" na importacao).
 * So mexe em contracts.approved_by_name que casa exatamente com o rotulo quebrado, dentro do master informado.
 * Idempotente. Padrao = dry-run; grava so com --aplicar. Grava por supabase-js (UTF-8), nunca por psql -c no PowerShell.
 *
 * Uso: node scripts/import-contratos/fix_accents_prod.mjs [--aplicar]
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const APLICAR = process.argv.includes('--aplicar');
const MASTER_ID = 'a0000000-0000-0000-0000-000000000001';
const CERTO = 'Importação de contratos';

const env = Object.fromEntries(readFileSync('.env', 'utf-8').split(/\r?\n/)
  .filter((l) => l && !l.trim().startsWith('#') && l.includes('='))
  .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) { console.error('Faltam VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no .env'); process.exit(1); }
if (/127\.0\.0\.1|localhost/.test(env.VITE_SUPABASE_URL)) { console.error('RECUSADO: o .env aponta para o banco local; este script e da producao.'); process.exit(1); }
console.log('Destino:', env.VITE_SUPABASE_URL.replace(/^(https?:\/\/[^.]{0,6})[^.]*/, '$1***'), '| master', MASTER_ID, '|', APLICAR ? 'APLICAR' : 'dry-run');

const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const quebrado = (s) => typeof s === 'string' && /^Importa\?+o de contratos$/.test(s.trim());

const { data, error } = await sb.from('contracts').select('id, approved_by_name').eq('master_id', MASTER_ID).like('approved_by_name', 'Importa%');
if (error) { console.error(error.message); process.exit(1); }
const alvo = data.filter((r) => quebrado(r.approved_by_name));
console.log(`Contratos com o rotulo quebrado: ${alvo.length} (de ${data.length} com "Importa...")`);
if (!APLICAR || alvo.length === 0) process.exit(0);

let ok = 0;
for (let i = 0; i < alvo.length; i += 50) {
  const ids = alvo.slice(i, i + 50).map((r) => r.id);
  const { error: e } = await sb.from('contracts').update({ approved_by_name: CERTO }).eq('master_id', MASTER_ID).in('id', ids);
  if (e) { console.error('Falha no lote', i, e.message); process.exit(1); }
  ok += ids.length;
}
const { data: chk } = await sb.from('contracts').select('approved_by_name').eq('master_id', MASTER_ID).eq('approved_by_name', CERTO);
console.log(`Atualizados: ${ok}. Conferencia: ${chk?.length ?? 0} contratos com "${CERTO}".`);
