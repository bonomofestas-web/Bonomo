#!/usr/bin/env node
/** Somente leitura: procura telefone em contatos/leads por e-mail e verifica se um CPF ja existe nos contratos. */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const MASTER_ID = 'a0000000-0000-0000-0000-000000000001';
const env = Object.fromEntries(readFileSync('.env', 'utf-8').split(/\r?\n/).filter((l) => l && !l.trim().startsWith('#') && l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
if (/127\.0\.0\.1|localhost/.test(env.VITE_SUPABASE_URL || '')) { console.error('O .env aponta para o banco local.'); process.exit(1); }
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
for (const em of ['dr.origerafael@gmail.com', 'millamansobarbosa@gmail.com']) {
  const c = await sb.from('contacts').select('id, name, primary_phone, email').eq('master_id', MASTER_ID).ilike('email', em);
  const l = await sb.from('leads').select('id, name, phone, email').eq('master_id', MASTER_ID).ilike('email', em);
  console.log(em, '| contatos:', JSON.stringify(c.data || c.error?.message), '| leads:', JSON.stringify(l.data || l.error?.message));
}
const k = await sb.from('contracts').select('contract_code, client_snapshot, event_date').eq('master_id', MASTER_ID);
console.log('Angelo/037.482.847-48:', JSON.stringify(k.data.filter((x) => String(x.client_snapshot?.cpf || '').replace(/\D/g, '') === '03748284748' || /angelo marinho/i.test(x.client_snapshot?.name || '')).map((x) => [x.contract_code, x.event_date])));
process.exit(0);
