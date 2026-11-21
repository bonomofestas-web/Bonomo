#!/usr/bin/env node
/**
 * Importador de contratos - ENSAIO NO BANCO LOCAL (Docker).
 *
 * Le C:\Users\--\Downloads\Contratos_catalogo\import_set.json (gerado por build_import_set.py) e cria, por contrato:
 * contato (chave = telefone), contrato aprovado, cliente de pos-venda, colocacao no funil e evento na agenda.
 * Os documentos apontam para /local-docs/<id> (servidor de dev lendo os PDFs do proprio PC; simula o R2).
 *
 * TRAVAS: recusa rodar se a URL do Supabase nao for local; --dry-run nao grava; idempotente por importKey;
 * grava import_log.jsonl para desfazer (--rollback).
 *
 * Uso: node scripts/import-contratos/import_local.mjs [--dry-run] [--limit N] [--venue "Nome"] [--rollback]
 */
import { readFileSync, appendFileSync, existsSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { buildContractTitle } from '../../src/utils/contractTitle.ts';

const DIR = 'C:\\Users\\--\\Downloads\\Contratos_catalogo';
const MASTER_ID = 'a0000000-0000-0000-0000-000000000001';
const LOG = `${DIR}\\import_log.jsonl`;
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const DRY = flag('--dry-run');

const env = Object.fromEntries(readFileSync('.env.local', 'utf-8').split(/\r?\n/)
  .filter((l) => l && !l.startsWith('#') && l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]));
const url = env.VITE_SUPABASE_URL;
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(url || '')) {
  console.error(`RECUSADO: VITE_SUPABASE_URL (${url}) nao e local. Este importador so roda no banco local.`);
  process.exit(1);
}
const sb = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const log = (o) => { if (!DRY) appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), ...o }) + '\n'); };
const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };

const B36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const code = (prefix, n) => `${prefix}-${Array.from({ length: n }, () => B36[Math.floor(Math.random() * 36)]).join('')}`;
const digits = (s) => String(s || '').replace(/\D/g, '');
const phoneKey = (s) => { let d = digits(s); if (d.startsWith('55') && d.length >= 12) d = d.slice(2); return d.slice(-8); };
const EVENT_LABEL = { '15_anos': '15 Anos', casamento: 'Casamento', bodas: 'Bodas', aniversario: 'Aniversário', infantil: 'Infantil', corporativo: 'Corporativo', formatura: 'Formatura' };

async function rollback() {
  if (!existsSync(LOG)) { console.log('Sem log para desfazer.'); return; }
  const rows = readFileSync(LOG, 'utf-8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)).reverse();
  for (const r of rows) {
    if (r.kind === 'task') await sb.from('admin_tasks').delete().eq('id', r.id);
    if (r.kind === 'venue_event') await sb.from('venue_events').delete().eq('id', r.id);
    if (r.kind === 'placement') await sb.from('contract_funnel_placements').delete().eq('contract_id', r.contractId);
    if (r.kind === 'contract') await sb.from('contracts').delete().eq('id', r.id);
    if (r.kind === 'client') await sb.from('clients').delete().eq('id', r.id);
    if (r.kind === 'contact_created') await sb.from('contacts').delete().eq('id', r.id);
    if (r.kind === 'contact_updated') await sb.from('contacts').update(r.previous).eq('id', r.id);
  }
  writeFileSync(LOG, '');
  console.log(`Desfeito: ${rows.length} registros.`);
}

async function main() {
  if (flag('--rollback')) return rollback();
  let set = JSON.parse(readFileSync(`${DIR}\\import_set.json`, 'utf-8'));
  if (opt('--venue')) set = set.filter((e) => e.venue === opt('--venue'));
  if (opt('--limit')) set = set.slice(0, Number(opt('--limit')));

  const venues = must(await sb.from('venues').select('id,name').eq('master_id', MASTER_ID), 'venues');
  const venueByName = Object.fromEntries(venues.map((v) => [v.name.toLowerCase().replace(/ de festa$/, ' de festas'), v]));
  const findVenue = (n) => venues.find((v) => v.name.toLowerCase().replace(/ de festas?$/, '') === String(n).toLowerCase().replace(/ de festas?$/, ''));
  const funnels = must(await sb.from('commercial_funnels').select('id,venue_id,stages,created_at').eq('master_id', MASTER_ID).eq('is_post_sale', true).order('created_at'), 'funis');
  const posFunnel = (venueId) => funnels.find((f) => f.venue_id === venueId);
  const contacts = must(await sb.from('contacts').select('*').eq('master_id', MASTER_ID).is('deleted_at', null), 'contatos');
  const byKey = new Map();
  for (const c of contacts) for (const p of [c.primary_phone, c.secondary_phone]) { const k = phoneKey(p); if (k.length === 8 && !byKey.has(k)) byKey.set(k, c); }
  const done = new Set(must(await sb.from('contracts').select('commercial_fields_snapshot').eq('master_id', MASTER_ID).not('commercial_fields_snapshot->>importKey', 'is', null), 'contratos')
    .map((r) => r.commercial_fields_snapshot.importKey));
  const dayTaken = new Set(must(await sb.from('venue_events').select('venue_id,event_date').eq('master_id', MASTER_ID), 'agenda').map((e) => `${e.venue_id}|${e.event_date}`));

  // Colisao de datas (mesma casa e dia): quem tem a data do contrato DIFERENTE da pasta e o suspeito e fica sem data;
  // se nenhum for suspeito, so o primeiro mantem a data.
  const groups = new Map();
  for (const e of set) { const k = `${e.venue}|${e.event_date}`; groups.set(k, [...(groups.get(k) || []), e]); }
  const conflictKeys = new Set();
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    const suspects = g.filter((x) => x.date_in_folder && x.date_in_folder !== x.event_date);
    (suspects.length ? suspects : g.slice(1)).forEach((x) => conflictKeys.add(x.key));
  }

  const stats = { criados: 0, jaExistiam: 0, contatoNovo: 0, contatoAtualizado: 0, agendaConflito: 0, tarefas: 0, erros: 0, semFunil: 0 };
  const problems = [];

  for (const e of set) {
    const importKey = `contratos:${e.key}`;
    try {
      if (done.has(importKey)) { stats.jaExistiam++; continue; }
      const venue = findVenue(e.venue);
      if (!venue) throw new Error(`casa nao encontrada: ${e.venue}`);
      const funnel = posFunnel(venue.id);
      if (!funnel) { stats.semFunil++; throw new Error(`sem funil de pos-venda em ${venue.name}`); }
      const stageId = Array.isArray(funnel.stages) && funnel.stages.length ? funnel.stages[0].id : 'onboarding';

      // 1. CONTATO: o telefone e a unica chave; o resto vem do contrato (o antigo fica no log)
      const alerts = [];
      if (e.alerts.includes('cpf_invalido')) alerts.push({ type: 'cpf_invalido', label: 'CPF com erro', value: e.cpf, source: 'importacao_contratos' });
      if (e.alerts.includes('telefone_invalido')) alerts.push({ type: 'telefone_invalido', label: 'Telefone inválido', value: e.phone, source: 'importacao_contratos' });
      if (e.alerts.includes('cpf_ausente')) alerts.push({ type: 'cpf_ausente', label: 'CPF não informado', source: 'importacao_contratos' });
      const fromContract = {
        name: e.name, email: e.email || null, cpf: e.cpf || null, street: e.address || null, postal_code: e.cep || null,
        city: 'Rio de Janeiro', state: 'RJ', relationship_role: 'Titular',
      };
      const badPhone = e.alerts.includes('telefone_invalido');
      const cpfD = digits(e.cpf);
      // telefone invalido: nao serve de chave; tenta pelo CPF e, se nao achar, cria com o telefone como veio (ou marcador)
      let contact = badPhone ? (cpfD.length === 11 ? contacts.find((c) => c.cpf_digits === cpfD) : undefined) : byKey.get(phoneKey(e.phone));
      let contactId;
      if (contact) {
        const previous = Object.fromEntries(Object.keys(fromContract).concat(['custom_fields']).map((k) => [k, contact[k] ?? null]));
        const cf = { ...(contact.custom_fields || {}) };
        const existingAlerts = Array.isArray(cf.dataAlerts) ? cf.dataAlerts.filter((a) => !alerts.some((n) => n.type === a.type)) : [];
        if (alerts.length) cf.dataAlerts = [...existingAlerts, ...alerts.map((a) => ({ ...a, createdAt: new Date().toISOString() }))];
        if (!DRY) { must(await sb.from('contacts').update({ ...fromContract, custom_fields: cf, updated_at: new Date().toISOString() }).eq('id', contact.id), 'atualizar contato'); log({ kind: 'contact_updated', id: contact.id, previous }); }
        contactId = contact.id; stats.contatoAtualizado++;
      } else {
        contactId = randomUUID();
        const row = { id: contactId, master_id: MASTER_ID, code: code('CONT', 8), primary_phone: e.phone || `Sem telefone - ${cpfD || e.key}`, ...fromContract,
          custom_fields: alerts.length ? { dataAlerts: alerts.map((a) => ({ ...a, createdAt: new Date().toISOString() })) } : {} };
        if (!DRY) { must(await sb.from('contacts').insert(row), 'criar contato'); log({ kind: 'contact_created', id: contactId }); }
        if (!badPhone) byKey.set(phoneKey(e.phone), row); else contacts.push({ ...row, cpf_digits: cpfD });
        stats.contatoNovo++;
      }
      if (!DRY) must(await sb.from('contact_venue_access').upsert({ master_id: MASTER_ID, contact_id: contactId, venue_id: venue.id }, { onConflict: 'contact_id,venue_id' }), 'acesso a unidade');

      // Data em conflito: ja ha festa da casa nesse dia -> o contrato entra SEM data e vira tarefa para o time resolver
      const dayKey = `${venue.id}|${e.event_date}`;
      const dateConflict = conflictKeys.has(e.key) || (dayTaken.has(dayKey) && !done.has(importKey));
      const eventDate = dateConflict ? null : e.event_date;
      const pendencias = [...(e.pendencias || [])];
      for (const a of alerts) { const txt = (a.type === 'cpf_invalido' ? `CPF com erro no contrato (${a.value}). Confirmar o CPF correto e ajustar no contato.`
        : a.type === 'telefone_compartilhado' ? null
        : a.type === 'cpf_ausente' ? 'CPF não encontrado no contrato. Preencher no contato.'
        : `Telefone inválido no contrato (${a.value || 'ausente'}). O WhatsApp é a referência: confirmar o número e ajustar o contato.`);
        if (txt) pendencias.push(txt); }
      if (dateConflict) { stats.agendaConflito++; pendencias.unshift(`DATA INDEFINIDA: o contrato diz ${e.event_date.split('-').reverse().join('/')}, mas esse dia já está ocupado em ${venue.name}${e.date_in_folder && e.date_in_folder !== e.event_date ? ` e o nome da pasta diz ${e.date_in_folder.split('-').reverse().join('/')}` : ''}. Descobrir a data correta e preencher no cliente e na agenda.`); }

      // 2. CONTRATO (aprovado, com snapshot)
      const year = e.event_date.slice(0, 4);  // so para o codigo
      const contractCode = code(`CTR-${year}`, 6);
      const title = (buildContractTitle({ contractors: [e.name], protagonists: e.honoree ? [e.honoree] : [], eventType: e.event_type, contractCode }) || e.pasta).trim();
      const money = (n) => (n == null ? null : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
      const handover = [
        [e.package && `Pacote ${e.package}`, e.guests && `${e.guests} convidados`, e.total != null && `valor ${money(e.total)}`].filter(Boolean).join(' · '),
        ...(e.particularidades || []).slice(0, 2).map((p) => String(p).replace(/\s+/g, ' ').slice(0, 220)),
        e.aditivos ? `Possui ${e.aditivos} ${e.aditivos === 1 ? 'aditivo' : 'aditivos'}: conferir o que ${e.aditivos === 1 ? 'ele alterou' : 'eles alteraram'}.` : '',
      ].filter(Boolean).join('\n');
      const docUrl = (id) => `/local-docs/${id}.pdf`;
      const attachments = e.docs.map((d) => ({ name: d.name, url: docUrl(d.id), type: d.kind }));
      const contractId = randomUUID();
      const entry = e.entry ?? 0;
      const signal = e.signal ?? 0;
      const contractRow = {
        id: contractId, master_id: MASTER_ID, contract_code: contractCode, contact_id: contactId, venue_id: venue.id,
        event_type: e.event_type, event_title: title, contract_title: title, title,
        event_date: eventDate, guest_count: e.guests || 0, package_name: e.package || null,
        client_snapshot: { name: e.name, payerName: e.name, phone: e.phone, email: e.email, cpf: e.cpf, address: e.address, birthdayPersonName: e.honoree || null },
        commercial_fields_snapshot: { importKey, origem: 'importacao_contratos', pasta: e.pasta, valorDe: e.value_from, dataNoContrato: e.event_date, dataNaPasta: e.date_in_folder, dataEmConflito: dateConflict },
        total_amount: e.total ?? 0, signal_amount: signal, entry_amount: entry, balance_amount: Math.max(0, (e.total ?? 0) - entry - signal),
        payment_summary: e.payment_summary || null, fill_stage: 'preenchido',
        payment_terms: {}, sdr_name: '', closer_name: '',
        approval_status: 'approved', approved_by_name: 'Importação de contratos', approved_by_role: 'sistema', approved_at: new Date().toISOString(),
        target_pos_sale_funnel_ids: [funnel.id], handover_notes: handover || null,
        contract_file_url: e.main_id ? docUrl(e.main_id) : null, attachments, notes: '',
      };
      if (!DRY) { must(await sb.from('contracts').insert(contractRow), 'criar contrato'); log({ kind: 'contract', id: contractId }); }

      // 3. COLOCACAO + CLIENTE (card de pos-venda na primeira etapa)
      const clientId = randomUUID();
      if (!DRY) {
        must(await sb.from('contract_funnel_placements').upsert({ master_id: MASTER_ID, contract_id: contractId, funnel_id: funnel.id, stage_id: stageId, status: 'in_progress' }, { onConflict: 'contract_id,funnel_id' }), 'colocacao');
        log({ kind: 'placement', contractId });
        must(await sb.from('clients').insert({
          id: clientId, master_id: MASTER_ID, code: code('CLI', 8), name: e.honoree || title, contract_title: title,
          payer_name: e.name, payer_phone: e.phone, payer_email: e.email, payer_cpf: e.cpf, payer_address: e.address,
          birthday_person_name: e.honoree || null, event_type: e.event_type, event_date: eventDate, guest_count: e.guests || 0,
          venue_id: venue.id, venue_name: venue.name, package_sold: e.package || null, deal_value: e.total ?? 0,
          funnel_id: funnel.id, stage: stageId,
        }), 'criar cliente');
        log({ kind: 'client', id: clientId });
        must(await sb.from('contracts').update({ client_id: clientId }).eq('id', contractId).eq('master_id', MASTER_ID), 'ligar cliente');
      }

      // 4. AGENDA (uma festa por dia por casa); sem data definida nao entra na agenda
      if (!dateConflict) {
        dayTaken.add(dayKey);
        if (!DRY) {
          const evId = randomUUID();
          must(await sb.from('venue_events').insert({
            id: evId, master_id: MASTER_ID, venue_id: venue.id, client_id: clientId, client_name: e.name, title,
            event_type: EVENT_LABEL[e.event_type] || '15 Anos', event_date: e.event_date, guest_count: e.guests || null,
            status: 'scheduled', blocks_venue_day: true, created_by_name: 'Importação de contratos',
          }), 'agenda');
          log({ kind: 'venue_event', id: evId });
        }
      }

      // 5. TAREFA sem responsavel para tudo que precisa de ajuda humana (qualquer um que abrir o cliente resolve)
      if (pendencias.length) {
        const taskId = randomUUID();
        if (!DRY) {
          must(await sb.from('admin_tasks').insert({
            id: taskId, master_id: MASTER_ID, venue_id: venue.id, database_id: 'default_collabs', title: `Ajustar cadastro importado: ${title}`,
            description: pendencias.map((p) => `- ${p}`).join(String.fromCharCode(10)), status: 'todo', custom_status_id: 'st_todo',
            priority: dateConflict ? 'high' : 'medium', type: 'general', custom_type: 'Geral / Operacional', assigned_to_ids: [], due_date: null, due_time: null,
            created_by_name: 'Importação de contratos',
            custom_properties: { masterId: MASTER_ID, clientId, contractId, contactId, leadName: title, clientName: title, origem: 'importacao_contratos', sector: 'pos_venda', semResponsavel: true },
          }), 'tarefa');
          log({ kind: 'task', id: taskId });
        }
        stats.tarefas++;
      }
      stats.criados++;
    } catch (err) {
      stats.erros++; problems.push(`${e.pasta}: ${err.message}`);
    }
  }
  console.log(DRY ? '--- SIMULACAO (nada gravado) ---' : '--- IMPORTADO NO BANCO LOCAL ---');
  console.log(stats);
  if (problems.length) { console.log('Ocorrencias:'); problems.slice(0, 40).forEach((p) => console.log(' -', p)); if (problems.length > 40) console.log(` ... e mais ${problems.length - 40}`); }
}

main().catch((err) => { console.error(err); process.exit(1); });
