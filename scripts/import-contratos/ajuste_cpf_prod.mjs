#!/usr/bin/env node
/**
 * CPF vale o que esta escrito no contrato (mesmo sem passar no digito verificador). Ajusta producao:
 *  - da baixa nas tarefas "CPF com erro" cujo CPF do cadastro e o do contrato;
 *  - preenche o CPF do CTR-ER20261205 (602.152.657-15, como no contrato) e volta o do CTR-ERL20270305 ao que o contrato traz.
 * Padrao = dry-run. Log com valores anteriores em ajuste_cpf_log.json. Uso: node ... [--aplicar]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const MASTER_ID = 'a0000000-0000-0000-0000-000000000001';
const APLICAR = process.argv.includes('--aplicar');
const env = Object.fromEntries(readFileSync('.env', 'utf-8').split(/\r?\n/).filter((l) => l && !l.trim().startsWith('#') && l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
if (!env.VITE_SUPABASE_URL || /127\.0\.0\.1|localhost/.test(env.VITE_SUPABASE_URL)) { console.error('RECUSADO: o .env nao aponta para a producao.'); process.exit(1); }
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = (r, w) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data; };
const log = [];
const NL = String.fromCharCode(10);
const DEFINIR = { 'CTR-ER20261205': '602.152.657-15', 'CTR-ERL20270305': '984.782.157-94' };
const cs = must(await sb.from('contracts').select('id, contract_code, client_id, contact_id, client_snapshot').eq('master_id', MASTER_ID), 'contratos');
for (const [code, cpf] of Object.entries(DEFINIR)) {
  const c = cs.find((x) => x.contract_code === code);
  console.log(`CPF de ${code}: ${c.client_snapshot?.cpf ?? 'vazio'} -> ${cpf}`);
  if (!APLICAR) continue;
  const cl = c.client_id ? must(await sb.from('clients').select('id, payer_cpf').eq('id', c.client_id).eq('master_id', MASTER_ID).maybeSingle(), 'cliente') : null;
  const ct = c.contact_id ? must(await sb.from('contacts').select('id, cpf, custom_fields').eq('id', c.contact_id).eq('master_id', MASTER_ID).maybeSingle(), 'contato') : null;
  log.push({ code, contract: { id: c.id, client_snapshot: c.client_snapshot }, client: cl, contact: ct });
  must(await sb.from('contracts').update({ client_snapshot: { ...c.client_snapshot, cpf } }).eq('id', c.id).eq('master_id', MASTER_ID), 'contrato');
  if (cl) must(await sb.from('clients').update({ payer_cpf: cpf }).eq('id', cl.id).eq('master_id', MASTER_ID), 'cliente');
  if (ct) { const cf = { ...(ct.custom_fields || {}) }; if (Array.isArray(cf.dataAlerts)) cf.dataAlerts = cf.dataAlerts.filter((a) => !/cpf/.test(a.type)); must(await sb.from('contacts').update({ cpf, custom_fields: cf }).eq('id', ct.id).eq('master_id', MASTER_ID), 'contato'); }
}
// tarefas: so as linhas de CPF (a do CTR-VCF20270121 fica: o CPF la tem digitos a mais)
const tarefas = must(await sb.from('admin_tasks').select('*').eq('master_id', MASTER_ID).eq('created_by_name', 'Importação de contratos').neq('status', 'completed'), 'tarefas');
const ficam = new Set(cs.filter((c) => c.contract_code === 'CTR-VCF20270121').map((c) => c.id));
const hoje = new Date().toLocaleDateString('pt-BR');
const ehCpf = (l) => l.startsWith('- ') && /CPF (escrito no contrato|com erro no contrato)/.test(l);
for (const t of tarefas) {
  if (ficam.has(t.custom_properties?.contractId)) continue;
  const linhas = String(t.description || '').split(NL);
  if (!linhas.some(ehCpf)) continue;
  const resto = linhas.filter((l) => !ehCpf(l));
  const patch = { description: `${resto.join(NL).trim()}${NL}${NL}Conferido em ${hoje}: o CPF do cadastro é o mesmo escrito no contrato (vale o que está no contrato).`.trim() };
  if (!resto.some((l) => l.startsWith('- '))) { patch.status = 'completed'; patch.completed_at = new Date().toISOString(); }
  console.log(`tarefa "${t.title}": ${patch.status === 'completed' ? 'concluída' : 'linha de CPF resolvida'}`);
  if (APLICAR) { log.push({ task: t }); must(await sb.from('admin_tasks').update(patch).eq('id', t.id).eq('master_id', MASTER_ID), 'tarefa'); }
}
if (APLICAR) writeFileSync('C:/Users/--/Downloads/Contratos_catalogo/ajuste_cpf_log.json', JSON.stringify(log, null, 1));
process.exit(0);
