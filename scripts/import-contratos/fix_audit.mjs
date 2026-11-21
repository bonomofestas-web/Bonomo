#!/usr/bin/env node
/**
 * Correcoes da auditoria no banco LOCAL (so toca no que estava errado; idempotente):
 *  - nome da aniversariante que faltava (titulo do contrato, card do cliente, evento da agenda e tarefa)
 *  - data do evento alterada por aditivo confirmado por CPF (contrato, cliente e agenda)
 *  - alerta de telefone compartilhado entre pessoas diferentes
 *  - tarefas refeitas com texto em portugues correto e so com o que ainda precisa de ajuda humana
 * Recusa rodar fora do banco local. Uso: node scripts/import-contratos/fix_audit.mjs [--dry-run]
 */
import { readFileSync, appendFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { buildContractTitle } from '../../src/utils/contractTitle.ts';

const DIR = 'C:\\Users\\--\\Downloads\\Contratos_catalogo';
const MASTER_ID = 'a0000000-0000-0000-0000-000000000001';
const LOG = `${DIR}\\import_log.jsonl`;
const DRY = process.argv.includes('--dry-run');
const env = Object.fromEntries(readFileSync('.env.local', 'utf-8').split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]));
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(env.VITE_SUPABASE_URL || '')) { console.error('RECUSADO: o banco nao e local.'); process.exit(1); }
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };
const log = (o) => { if (!DRY) appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), ...o }) + '\n'); };
const br = (iso) => iso.split('-').reverse().join('/');
const EVENT_LABEL = { '15_anos': '15 Anos', casamento: 'Casamento', bodas: 'Bodas', aniversario: 'Aniversário', infantil: 'Infantil', corporativo: 'Corporativo', formatura: 'Formatura' };

const set = JSON.parse(readFileSync(`${DIR}\\import_set.json`, 'utf-8'));
const contracts = must(await sb.from('contracts').select('*').eq('master_id', MASTER_ID).not('commercial_fields_snapshot->>importKey', 'is', null), 'contratos');
const byKey = new Map(contracts.map((c) => [c.commercial_fields_snapshot.importKey.replace('contratos:', ''), c]));
const venues = must(await sb.from('venues').select('id,name').eq('master_id', MASTER_ID), 'casas');
const agenda = must(await sb.from('venue_events').select('id,venue_id,event_date,client_id').eq('master_id', MASTER_ID), 'agenda');
const dayOwner = new Map(agenda.map((e) => [`${e.venue_id}|${e.event_date}`, e.client_id]));
const tasks = must(await sb.from('admin_tasks').select('id,custom_properties').eq('created_by_name', 'Importação de contratos'), 'tarefas');
const taskByContract = new Map(tasks.map((t) => [t.custom_properties?.contractId, t]));

const stats = { titulos: 0, datas: 0, agendaCriada: 0, agendaMovida: 0, tarefasRefeitas: 0, tarefasCriadas: 0, tarefasRemovidas: 0, contatosComAlerta: 0, conflitoMantido: 0, anexosAjustados: 0, ignorados: 0 };
const detalhes = [];

for (const e of set) {
  const c = byKey.get(e.key);
  if (!c) { stats.ignorados++; continue; }
  const venue = venues.find((v) => v.id === c.venue_id);
  const clientId = c.client_id;
  const snap = c.commercial_fields_snapshot || {};
  const conflict = Boolean(snap.dataEmConflito);

  // 1. titulo / aniversariante
  const title = (buildContractTitle({ contractors: [e.name], protagonists: e.honoree ? [e.honoree] : [], eventType: e.event_type, contractCode: c.contract_code }) || e.pasta).trim();
  if (title !== c.contract_title) {
    detalhes.push(`titulo: "${c.contract_title}" -> "${title}"`);
    if (!DRY) {
      const cs = { ...(c.client_snapshot || {}), birthdayPersonName: e.honoree || null };
      must(await sb.from('contracts').update({ contract_title: title, event_title: title, title, client_snapshot: cs, updated_at: new Date().toISOString() }).eq('id', c.id), 'titulo contrato');
      must(await sb.from('clients').update({ name: e.honoree || title, contract_title: title, birthday_person_name: e.honoree || null, updated_at: new Date().toISOString() }).eq('id', clientId), 'cliente');
      must(await sb.from('venue_events').update({ title }).eq('client_id', clientId), 'agenda titulo');
    }
    c.contract_title = title;
    stats.titulos++;
  }

  // 2. data por aditivo (ou conflito resolvido)
  let dateConflictNow = conflict;
  if (e.date_fix && c.event_date !== e.event_date) {
    const dayKey = `${c.venue_id}|${e.event_date}`;
    const owner = dayOwner.get(dayKey);
    const free = !owner || owner === clientId;
    detalhes.push(`data ${e.pasta.slice(0, 30)}: ${c.event_date ? br(c.event_date) : 'sem data'} -> ${br(e.event_date)} (aditivo)${free ? '' : ' [dia ocupado na agenda]'}`);
    if (!DRY) {
      const newSnap = { ...snap, dataNoContrato: e.date_fix.de, dataAposAditivo: e.event_date, dataEmConflito: false };
      must(await sb.from('contracts').update({ event_date: e.event_date, commercial_fields_snapshot: newSnap, updated_at: new Date().toISOString() }).eq('id', c.id), 'data contrato');
      must(await sb.from('clients').update({ event_date: e.event_date, updated_at: new Date().toISOString() }).eq('id', clientId), 'data cliente');
      if (free) {
        const existing = agenda.find((a) => a.client_id === clientId);
        if (existing) { must(await sb.from('venue_events').update({ event_date: e.event_date }).eq('id', existing.id), 'agenda data'); stats.agendaMovida++; }
        else {
          const evId = randomUUID();
          must(await sb.from('venue_events').insert({ id: evId, master_id: MASTER_ID, venue_id: c.venue_id, client_id: clientId, client_name: e.name, title: c.contract_title,
            event_type: EVENT_LABEL[e.event_type] || '15 Anos', event_date: e.event_date, guest_count: e.guests || null, status: 'scheduled', blocks_venue_day: true, created_by_name: 'Importação de contratos' }), 'agenda criar');
          log({ kind: 'venue_event', id: evId });
          stats.agendaCriada++;
        }
        dayOwner.set(dayKey, clientId);
      }
    }
    c.event_date = e.event_date;
    dateConflictNow = false;
    stats.datas++;
  } else if (conflict) stats.conflitoMantido++;

  // 3. alerta de telefone compartilhado no contato
  if (e.alerts.includes('telefone_compartilhado')) {
    const ct = must(await sb.from('contacts').select('id,custom_fields').eq('id', c.contact_id).single(), 'contato');
    const cf = { ...(ct.custom_fields || {}) };
    const list = Array.isArray(cf.dataAlerts) ? cf.dataAlerts : [];
    if (!list.some((a) => a.type === 'telefone_compartilhado')) {
      cf.dataAlerts = [...list, { type: 'telefone_compartilhado', label: 'Telefone compartilhado', value: e.phone, source: 'importacao_contratos', createdAt: new Date().toISOString() }];
      if (!DRY) must(await sb.from('contacts').update({ custom_fields: cf }).eq('id', ct.id), 'alerta contato');
      stats.contatosComAlerta++;
    }
  }

  // 3b. documentos: so o contrato assinado + aditivos/extras confirmados por CPF (contrato base/copia nao entra)
  const wantAtt = e.docs.map((d) => ({ name: d.name, url: `/local-docs/${d.id}.pdf`, type: d.kind }));
  const haveAtt = Array.isArray(c.attachments) ? c.attachments : [];
  if (JSON.stringify(wantAtt) !== JSON.stringify(haveAtt)) {
    detalhes.push(`anexos ${e.pasta.slice(0, 30)}: ${haveAtt.length} -> ${wantAtt.length}`);
    if (!DRY) must(await sb.from('contracts').update({ attachments: wantAtt, updated_at: new Date().toISOString() }).eq('id', c.id), 'anexos');
    stats.anexosAjustados++;
  }

  // 4. tarefa: refaz o texto com o que ainda precisa de ajuda humana
  const items = [...(e.pendencias || [])];
  for (const a of e.alerts) {
    if (a === 'cpf_invalido') items.push(`CPF com erro no contrato (${e.cpf}). Confirmar o CPF correto e ajustar no contato.`);
    if (a === 'cpf_ausente') items.push('CPF não encontrado no contrato. Preencher no contato.');
    if (a === 'telefone_invalido') items.push(`Telefone inválido no contrato (${e.phone || 'ausente'}). O WhatsApp é a referência: confirmar o número e ajustar o contato.`);
  }
  if (dateConflictNow) items.unshift(`DATA INDEFINIDA: o contrato diz ${br(e.event_date)}, mas esse dia já está ocupado em ${venue?.name || 'a casa'}${e.date_in_folder && e.date_in_folder !== e.event_date ? ` e o nome da pasta diz ${br(e.date_in_folder)}` : ''}. Descobrir a data correta e preencher no cliente e na agenda.`);
  const handover = [
    [e.package && `Pacote ${e.package}`, e.guests && `${e.guests} convidados`, e.total != null && `valor ${(e.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`].filter(Boolean).join(' · '),
    ...(e.particularidades || []).slice(0, 2).map((p) => String(p).replace(/\s+/g, ' ').slice(0, 220)),
    e.aditivos ? `Possui ${e.aditivos} ${e.aditivos === 1 ? 'aditivo' : 'aditivos'}: conferir o que ${e.aditivos === 1 ? 'ele alterou' : 'eles alteraram'}.` : '',
  ].filter(Boolean).join(String.fromCharCode(10));
  if (!DRY && handover !== c.handover_notes) must(await sb.from('contracts').update({ handover_notes: handover }).eq('id', c.id), 'bastao');

  const existing = taskByContract.get(c.id);
  const desc = items.map((p) => `- ${p}`).join(String.fromCharCode(10));
  if (items.length && existing) {
    if (!DRY) must(await sb.from('admin_tasks').update({ title: `Ajustar cadastro importado: ${c.contract_title}`, description: desc, priority: dateConflictNow ? 'high' : 'medium', due_date: null, due_time: null,
      custom_properties: { ...(existing.custom_properties || {}), leadName: c.contract_title, clientName: c.contract_title } }).eq('id', existing.id), 'tarefa');
    stats.tarefasRefeitas++;
  } else if (items.length && !existing) {
    const id = randomUUID();
    if (!DRY) {
      must(await sb.from('admin_tasks').insert({ id, master_id: MASTER_ID, venue_id: c.venue_id, database_id: 'default_collabs', title: `Ajustar cadastro importado: ${c.contract_title}`, description: desc,
        status: 'todo', custom_status_id: 'st_todo', priority: dateConflictNow ? 'high' : 'medium', type: 'general', custom_type: 'Geral / Operacional', assigned_to_ids: [], created_by_name: 'Importação de contratos', due_date: null, due_time: null,
        custom_properties: { masterId: MASTER_ID, clientId, contractId: c.id, contactId: c.contact_id, leadName: c.contract_title, clientName: c.contract_title, origem: 'importacao_contratos', semResponsavel: true } }), 'tarefa nova');
      log({ kind: 'task', id });
    }
    stats.tarefasCriadas++;
  } else if (!items.length && existing) {
    if (!DRY) must(await sb.from('admin_tasks').delete().eq('id', existing.id), 'tarefa remover');
    stats.tarefasRemovidas++;
  }
}

console.log(DRY ? '--- SIMULACAO ---' : '--- CORRECOES APLICADAS ---');
console.log(stats);
detalhes.slice(0, 60).forEach((d) => console.log(' -', d));
