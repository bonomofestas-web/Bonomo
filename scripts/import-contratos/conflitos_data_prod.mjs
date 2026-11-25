#!/usr/bin/env node
/** Somente leitura: para contratos sem data por conflito, mostra quem ocupa o mesmo dia na casa. */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const MASTER_ID = 'a0000000-0000-0000-0000-000000000001';
const env = Object.fromEntries(readFileSync('.env', 'utf-8').split(/\r?\n/).filter((l) => l && !l.trim().startsWith('#') && l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
if (/127\.0\.0\.1|localhost/.test(env.VITE_SUPABASE_URL || '')) { console.error('O .env aponta para o banco local.'); process.exit(1); }
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const cs = (await sb.from('contracts').select('id, contract_code, venue_id, event_date, client_id, client_snapshot, approval_status, title, guest_count, total_amount, commercial_fields_snapshot').eq('master_id', MASTER_ID)).data;
const evs = (await sb.from('venue_events').select('id, venue_id, client_id, client_name, title, event_date, status, blocks_venue_day, created_by_name').eq('master_id', MASTER_ID)).data;
const alvo = ['CTR-ER20261127-2', 'CTR-ERL20270723-2', 'CTR-ERL20271119-2', 'CTR-ERL20281020-2'];
for (const code of alvo) {
  const c = cs.find((x) => x.contract_code === code);
  const d = c.commercial_fields_snapshot?.dataNoContrato || c.commercial_fields_snapshot?.dataNaPasta;
  console.log('\n==', code, c.client_snapshot?.name, '| cpf', c.client_snapshot?.cpf, '| snapshot:', JSON.stringify({ n: c.commercial_fields_snapshot?.dataNoContrato, p: c.commercial_fields_snapshot?.dataNaPasta }), '| total', c.total_amount, 'conv', c.guest_count);
  const alvoData = c.commercial_fields_snapshot?.dataNoContrato || null;
  for (const e of evs.filter((x) => x.venue_id === c.venue_id && x.event_date === alvoData)) {
    const o = cs.find((x) => x.client_id === e.client_id);
    console.log('   ocupa:', e.status, e.blocks_venue_day, e.client_name, '| contrato', o?.contract_code, o?.approval_status, '| cpf', o?.client_snapshot?.cpf, '| nome', o?.client_snapshot?.name, '| total', o?.total_amount, 'conv', o?.guest_count, '| by', e.created_by_name);
  }
}
process.exit(0);
