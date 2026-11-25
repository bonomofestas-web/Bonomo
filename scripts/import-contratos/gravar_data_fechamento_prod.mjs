#!/usr/bin/env node
/**
 * Grava em PRODUCAO contracts.closed_at (data de fechamento da venda) nos contratos que ainda nao tem, com a data escrita no
 * proprio contrato (data_contrato_pdf.json, lida da linha "Rio de Janeiro, DD de mes de AAAA" do PDF). So preenche vazios.
 * Padrao = dry-run. Log para --rollback. Uso: node ... [--aplicar] [--rollback]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const DIR = 'C:/Users/--/Downloads/Contratos_catalogo';
const LOG = `${DIR}/data_fechamento_log.json`;
const MASTER_ID = 'a0000000-0000-0000-0000-000000000001';
const APLICAR = process.argv.includes('--aplicar');
const env = Object.fromEntries(readFileSync('.env', 'utf-8').split(/\r?\n/).filter((l) => l && !l.trim().startsWith('#') && l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
if (!env.VITE_SUPABASE_URL || /127\.0\.0\.1|localhost/.test(env.VITE_SUPABASE_URL)) { console.error('RECUSADO: o .env nao aponta para a producao.'); process.exit(1); }
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = (r, w) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data; };
if (process.argv.includes('--rollback')) {
  const ids = existsSync(LOG) ? JSON.parse(readFileSync(LOG, 'utf-8')) : [];
  console.log(`Rollback: ${ids.length} contratos`, APLICAR ? '' : '(dry-run)');
  if (APLICAR) for (const id of ids) must(await sb.from('contracts').update({ closed_at: null }).eq('id', id).eq('master_id', MASTER_ID), 'desfazer');
  process.exit(0);
}
const datas = JSON.parse(readFileSync(`${DIR}/data_contrato_pdf.json`, 'utf-8'));
const hoje = new Date().toLocaleDateString('en-CA');
const cs = must(await sb.from('contracts').select('id, contract_code, closed_at, event_date').eq('master_id', MASTER_ID).is('closed_at', null), 'contratos');
const feitos = []; let semData = 0, suspeitas = [];
for (const c of cs) {
  const d = datas[c.contract_code];
  if (!d) { semData++; continue; }
  if (d > hoje || d < '2020-01-01') { suspeitas.push(`${c.contract_code} ${d}`); continue; }
  feitos.push({ id: c.id, code: c.contract_code, d });
}
console.log(`${APLICAR ? 'APLICAR' : 'dry-run'}: sem data de fechamento no sistema ${cs.length} | a gravar ${feitos.length} | sem data no PDF ${semData} | datas suspeitas ${suspeitas.length}`, suspeitas);
if (APLICAR) {
  for (const f of feitos) must(await sb.from('contracts').update({ closed_at: f.d }).eq('id', f.id).eq('master_id', MASTER_ID).is('closed_at', null), 'gravar');
  writeFileSync(LOG, JSON.stringify(feitos.map((f) => f.id)));
}
process.exit(0);
