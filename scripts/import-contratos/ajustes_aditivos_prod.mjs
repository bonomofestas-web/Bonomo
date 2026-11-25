#!/usr/bin/env node
/**
 * Ajusta na PRODUCAO os contratos que ja existem, conforme os aditivos lidos (ajustes_prod.json, gerado por build_import_novos.py):
 *  - anexa os aditivos (CPF confere) em contracts.attachments (sem duplicar por nome);
 *  - se o aditivo muda a data da festa: atualiza contrato, cliente e agenda (cria o evento se nao existir), exceto se o dia ja
 *    estiver ocupado na casa (nesse caso so avisa).
 * Padrao = dry-run. Log para desfazer em ajustes_prod_log.jsonl (valores anteriores). Uso: node ... [--aplicar] [--rollback]
 */
import { readFileSync, appendFileSync, existsSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const DIR = 'C:\\Users\\--\\Downloads\\Contratos_catalogo';
const LOG = `${DIR}\\ajustes_prod_log.jsonl`;
const MASTER_ID = 'a0000000-0000-0000-0000-000000000001';
const args = process.argv.slice(2);
const APLICAR = args.includes('--aplicar');
const env = Object.fromEntries(readFileSync('.env', 'utf-8').split(/\r?\n/).filter((l) => l && !l.trim().startsWith('#') && l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const envLocal = Object.fromEntries(readFileSync('.env.local', 'utf-8').split(/\r?\n/).filter((l) => l && !l.trim().startsWith('#') && l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
if (!env.VITE_SUPABASE_URL || /127\.0\.0\.1|localhost/.test(env.VITE_SUPABASE_URL)) { console.error('RECUSADO: o .env nao aponta para a producao.'); process.exit(1); }
const R2 = (envLocal.CLOUDFLARE_R2_PUBLIC_URL || '').replace(/\/$/, '');
if (!R2.includes('pub-dfdef15994014f9c933c40b4ccde124b')) { console.error('RECUSADO: R2 diferente do de producao.'); process.exit(1); }
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };
const log = (o) => { if (APLICAR) appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), ...o }) + '\n'); };
const br = (iso) => (iso ? iso.split('-').reverse().join('/') : 'sem data');

if (args.includes('--rollback')) {
  const rows = existsSync(LOG) ? readFileSync(LOG, 'utf-8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)).reverse() : [];
  console.log(`Rollback de ${rows.length} registros`, APLICAR ? '' : '(dry-run)');
  if (APLICAR) {
    for (const r of rows) {
      if (r.kind === 'contract') await sb.from('contracts').update(r.previous).eq('id', r.id).eq('master_id', MASTER_ID);
      if (r.kind === 'client') await sb.from('clients').update(r.previous).eq('id', r.id).eq('master_id', MASTER_ID);
      if (r.kind === 'event_updated') await sb.from('venue_events').update(r.previous).eq('id', r.id).eq('master_id', MASTER_ID);
      if (r.kind === 'event_created') await sb.from('venue_events').delete().eq('id', r.id).eq('master_id', MASTER_ID);
    }
    writeFileSync(LOG, '');
  }
  process.exit(0);
}

const ajustes = JSON.parse(readFileSync(`${DIR}\\ajustes_prod.json`, 'utf-8'));
const agenda = must(await sb.from('venue_events').select('id, venue_id, client_id, event_date').eq('master_id', MASTER_ID), 'agenda');
console.log(`${ajustes.length} contratos a ajustar. ${APLICAR ? 'APLICAR' : 'dry-run'}`);
let datas = 0, anexados = 0, ignorados = 0;
for (const a of ajustes) {
  const c = must(await sb.from('contracts').select('*').eq('id', a.contract_id).eq('master_id', MASTER_ID).maybeSingle(), 'contrato');
  if (!c) { console.warn('Contrato nao encontrado:', a.contract_code); continue; }
  const patch = {};
  const notas = [];
  // 1. anexos
  const jaTem = new Set((c.attachments || []).map((x) => x.name));
  const novos = a.anexar.filter((x) => !jaTem.has(x.name)).map((x) => ({ name: x.name, url: `${R2}/contracts/${x.id}.pdf`, type: 'aditivo' }));
  if (novos.length) { patch.attachments = [...(c.attachments || []), ...novos]; anexados += novos.length; notas.push(`${novos.length} aditivo(s) anexado(s)`); }
  // 2. data
  let dataMsg = '';
  if (a.mudar_data) {
    const nova = a.data_final;
    const ocupado = agenda.find((e) => e.venue_id === c.venue_id && e.event_date === nova && e.client_id !== c.client_id);
    if (ocupado) { dataMsg = `NAO alterada: ${br(nova)} ja esta ocupado na casa`; ignorados++; }
    else {
      patch.event_date = nova;
      patch.commercial_fields_snapshot = { ...(c.commercial_fields_snapshot || {}), dataEmConflito: false, dataPorAditivo: { de: a.data_atual, para: nova, origem: 'aditivo confirmado por CPF' } };
      patch.notes = `${c.notes ? c.notes + '\n' : ''}[Ajuste por aditivo em ${new Date().toLocaleDateString('pt-BR')}] Data da festa alterada de ${br(a.data_atual)} para ${br(nova)} conforme o aditivo anexado.`;
      dataMsg = `data ${br(a.data_atual)} -> ${br(nova)}`;
      datas++;
    }
  }
  console.log(`${a.contract_code}: ${[dataMsg, notas.join(', ')].filter(Boolean).join(' | ') || 'nada a fazer'}`);
  if (!APLICAR || !Object.keys(patch).length) continue;

  const previous = Object.fromEntries(Object.keys(patch).map((k) => [k, c[k] ?? null]));
  must(await sb.from('contracts').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', c.id).eq('master_id', MASTER_ID), 'atualizar contrato');
  log({ kind: 'contract', id: c.id, previous });
  if (patch.event_date) {
    if (c.client_id) {
      const cl = must(await sb.from('clients').select('event_date').eq('id', c.client_id).eq('master_id', MASTER_ID).maybeSingle(), 'cliente');
      must(await sb.from('clients').update({ event_date: patch.event_date }).eq('id', c.client_id).eq('master_id', MASTER_ID), 'atualizar cliente');
      log({ kind: 'client', id: c.client_id, previous: { event_date: cl?.event_date ?? null } });
      const ev = agenda.find((e) => e.client_id === c.client_id);
      if (ev) {
        must(await sb.from('venue_events').update({ event_date: patch.event_date }).eq('id', ev.id).eq('master_id', MASTER_ID), 'atualizar agenda');
        log({ kind: 'event_updated', id: ev.id, previous: { event_date: ev.event_date } });
        ev.event_date = patch.event_date;
      } else {
        const evId = randomUUID();
        must(await sb.from('venue_events').insert({
          id: evId, master_id: MASTER_ID, venue_id: c.venue_id, client_id: c.client_id, client_name: (c.client_snapshot || {}).name || c.title, title: c.title,
          event_type: '15 Anos', event_date: patch.event_date, guest_count: c.guest_count || null, status: 'scheduled', blocks_venue_day: true, created_by_name: 'Importação de contratos',
        }), 'criar evento');
        log({ kind: 'event_created', id: evId });
        agenda.push({ id: evId, venue_id: c.venue_id, client_id: c.client_id, event_date: patch.event_date });
      }
    }
  }
}
console.log(`Resumo: datas alteradas ${datas} | aditivos anexados ${anexados} | datas nao alteradas por conflito ${ignorados}`);
process.exit(0);
