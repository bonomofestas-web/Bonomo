#!/usr/bin/env node
/**
 * Importador de contratos NOVOS para a PRODUCAO (derivado do import_local.mjs).
 *
 * Le Contratos_catalogo\import_set_novos.json (build_import_novos.py) e cria, por contrato: contato (chave = telefone), contrato,
 * cliente de pos-venda, colocacao no funil, evento na agenda e tarefa de pendencias. Contrato CANCELADO entra como `canceled`
 * (sem colocacao no funil, sem evento na agenda, cliente arquivado), igual ao cancelContract do sistema.
 * Os documentos apontam para o R2 (contracts/<id>.pdf, ja enviados por upload_novos_r2.mjs).
 *
 * TRAVAS: recusa banco local; padrao = dry-run (grava so com --aplicar); filtra tudo por master_id; idempotente por importKey;
 * grava log para --rollback. Rode `npm run backup:db` antes.
 *
 * Uso: node scripts/import-contratos/import_prod.mjs [--aplicar] [--limit N] [--so-cancelados|--sem-cancelados] [--rollback]
 */
import { readFileSync, appendFileSync, existsSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { buildContractTitle } from '../../src/utils/contractTitle.ts';

const DIR = 'C:\\Users\\--\\Downloads\\Contratos_catalogo';
const MASTER_ID = 'a0000000-0000-0000-0000-000000000001';
const LOG = `${DIR}\\novos_import_log.jsonl`;
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const APLICAR = flag('--aplicar');
const DRY = !APLICAR;

const readEnv = (f) => Object.fromEntries(readFileSync(f, 'utf-8').split(/\r?\n/).filter((l) => l && !l.trim().startsWith('#') && l.includes('='))
  .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const env = readEnv('.env');
const envLocal = readEnv('.env.local');
const url = env.VITE_SUPABASE_URL;
if (!url || /127\.0\.0\.1|localhost/.test(url)) { console.error('RECUSADO: o .env nao aponta para a producao.'); process.exit(1); }
const R2 = (envLocal.CLOUDFLARE_R2_PUBLIC_URL || '').replace(/\/$/, '');
if (!R2.includes('pub-dfdef15994014f9c933c40b4ccde124b')) { console.error('RECUSADO: URL publica do R2 diferente da usada pelos contratos em producao.'); process.exit(1); }
console.log('Destino:', url.replace(/^(https?:\/\/[^.]{0,6})[^.]*/, '$1***'), '| master', MASTER_ID, '|', DRY ? 'DRY-RUN' : 'APLICAR');

const sb = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const log = (o) => { if (!DRY) appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), ...o }) + '\n'); };
const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };

const B36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const code = (prefix, n) => `${prefix}-${Array.from({ length: n }, () => B36[Math.floor(Math.random() * 36)]).join('')}`;
const digits = (s) => String(s || '').replace(/\D/g, '');
const phoneKey = (s) => { let d = digits(s); if (d.startsWith('55') && d.length >= 12) d = d.slice(2); return d.slice(-8); };
const EVENT_LABEL = { '15_anos': '15 Anos', casamento: 'Casamento', bodas: 'Bodas', aniversario: 'Aniversário', infantil: 'Infantil', corporativo: 'Corporativo', formatura: 'Formatura' };
const initials = (name) => String(name).split(/\s+/).filter((w) => !['de', 'da', 'do', 'das', 'dos', 'e'].includes(w.toLowerCase())).map((w) => w[0]).join('').toUpperCase();
const docUrl = (id) => `${R2}/contracts/${id}.pdf`;

async function rollback() {
  if (!existsSync(LOG)) { console.log('Sem log para desfazer.'); return; }
  const rows = readFileSync(LOG, 'utf-8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)).reverse();
  console.log(`Rollback de ${rows.length} registros`, DRY ? '(dry-run; use --aplicar)' : '');
  if (DRY) return;
  for (const r of rows) {
    if (r.kind === 'task') await sb.from('admin_tasks').delete().eq('id', r.id).eq('master_id', MASTER_ID);
    if (r.kind === 'venue_event') await sb.from('venue_events').delete().eq('id', r.id).eq('master_id', MASTER_ID);
    if (r.kind === 'placement') await sb.from('contract_funnel_placements').delete().eq('contract_id', r.contractId).eq('master_id', MASTER_ID);
    if (r.kind === 'contract') await sb.from('contracts').delete().eq('id', r.id).eq('master_id', MASTER_ID);
    if (r.kind === 'client') await sb.from('clients').delete().eq('id', r.id).eq('master_id', MASTER_ID);
    if (r.kind === 'contact_created') await sb.from('contacts').delete().eq('id', r.id).eq('master_id', MASTER_ID);
    if (r.kind === 'contact_updated') await sb.from('contacts').update(r.previous).eq('id', r.id).eq('master_id', MASTER_ID);
  }
  writeFileSync(LOG, '');
  console.log('Desfeito.');
}

async function main() {
  if (flag('--rollback')) return rollback();
  let set = JSON.parse(readFileSync(`${DIR}\\import_set_novos.json`, 'utf-8'));
  if (flag('--so-cancelados')) set = set.filter((e) => e.cancelado);
  if (flag('--sem-cancelados')) set = set.filter((e) => !e.cancelado);
  if (opt('--limit')) set = set.slice(0, Number(opt('--limit')));

  const venues = must(await sb.from('venues').select('id,name').eq('master_id', MASTER_ID), 'venues');
  const norm = (n) => String(n).toLowerCase().replace(/ de festas?$/, '');
  const findVenue = (n) => venues.find((v) => norm(v.name) === norm(n));
  const funnels = must(await sb.from('commercial_funnels').select('id,venue_id,stages,created_at').eq('master_id', MASTER_ID).eq('is_post_sale', true).order('created_at'), 'funis');
  const posFunnel = (venueId) => funnels.find((f) => f.venue_id === venueId);
  const contacts = must(await sb.from('contacts').select('*').eq('master_id', MASTER_ID).is('deleted_at', null), 'contatos');
  const byKey = new Map();
  for (const c of contacts) for (const p of [c.primary_phone, c.secondary_phone]) { const k = phoneKey(p); if (k.length === 8 && !byKey.has(k)) byKey.set(k, c); }
  const existing = must(await sb.from('contracts').select('contract_code, commercial_fields_snapshot').eq('master_id', MASTER_ID), 'contratos');
  const done = new Set(existing.map((r) => r.commercial_fields_snapshot?.importKey).filter(Boolean));
  const codes = new Set(existing.map((r) => r.contract_code));
  const dayTaken = new Set(must(await sb.from('venue_events').select('venue_id,event_date').eq('master_id', MASTER_ID), 'agenda').map((e) => `${e.venue_id}|${e.event_date}`));

  const stats = { criados: 0, cancelados: 0, jaExistiam: 0, contatoNovo: 0, contatoAtualizado: 0, agendaConflito: 0, tarefas: 0, erros: 0, semFunil: 0 };
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

      // 1. CONTATO: o telefone e a chave; o resto vem do contrato
      const alerts = [];
      if (e.alerts.includes('cpf_invalido')) alerts.push({ type: 'cpf_invalido', label: 'CPF com erro', value: e.cpf, source: 'importacao_contratos' });
      if (e.alerts.includes('telefone_invalido')) alerts.push({ type: 'telefone_invalido', label: 'Telefone inválido', value: e.phone, source: 'importacao_contratos' });
      if (e.alerts.includes('cpf_ausente')) alerts.push({ type: 'cpf_ausente', label: 'CPF não informado', source: 'importacao_contratos' });
      const fromContract = { name: e.name, email: e.email || null, cpf: e.cpf || null, street: e.address || null, postal_code: e.cep || null, city: 'Rio de Janeiro', state: 'RJ', relationship_role: 'Titular' };
      const badPhone = e.alerts.includes('telefone_invalido');
      const cpfD = digits(e.cpf);
      let contact = badPhone ? (cpfD.length === 11 ? contacts.find((c) => c.cpf_digits === cpfD) : undefined) : byKey.get(phoneKey(e.phone));
      let contactId;
      if (contact) {
        const previous = Object.fromEntries(Object.keys(fromContract).concat(['custom_fields']).map((k) => [k, contact[k] ?? null]));
        const cf = { ...(contact.custom_fields || {}) };
        const existingAlerts = Array.isArray(cf.dataAlerts) ? cf.dataAlerts.filter((a) => !alerts.some((n) => n.type === a.type)) : [];
        if (alerts.length) cf.dataAlerts = [...existingAlerts, ...alerts.map((a) => ({ ...a, createdAt: new Date().toISOString() }))];
        if (!DRY) { must(await sb.from('contacts').update({ ...fromContract, custom_fields: cf, updated_at: new Date().toISOString() }).eq('id', contact.id).eq('master_id', MASTER_ID), 'atualizar contato'); log({ kind: 'contact_updated', id: contact.id, previous }); }
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

      // Data: contrato ativo com dia ja ocupado na casa entra SEM data (vira tarefa); cancelado nao ocupa o dia
      const dayKey = `${venue.id}|${e.event_date}`;
      const dateConflict = !e.cancelado && dayTaken.has(dayKey);
      const eventDate = dateConflict ? null : e.event_date;
      const pendencias = [...(e.pendencias || [])];
      for (const a of alerts) {
        const txt = a.type === 'cpf_invalido' ? `CPF com erro no contrato (${a.value}). Confirmar o CPF correto e ajustar no contato.`
          : a.type === 'cpf_ausente' ? 'CPF não encontrado no contrato. Preencher no contato.'
          : `Telefone inválido no contrato (${a.value || 'ausente'}). O WhatsApp é a referência: confirmar o número e ajustar o contato.`;
        pendencias.push(txt);
      }
      if (dateConflict) { stats.agendaConflito++; pendencias.unshift(`DATA INDEFINIDA: o contrato diz ${e.event_date.split('-').reverse().join('/')}, mas esse dia já está ocupado em ${venue.name}. Descobrir a data correta e preencher no cliente e na agenda.`); }

      // 2. CONTRATO
      const base = e.event_date ? `CTR-${initials(venue.name)}${e.event_date.replace(/-/g, '')}` : `CTR-${initials(venue.name)}-${code('X', 5).slice(2)}`;
      let contractCode = base; for (let n = 2; codes.has(contractCode); n++) contractCode = `${base}-${n}`;
      codes.add(contractCode);
      const title = (buildContractTitle({ contractors: [e.name], protagonists: e.honoree ? [e.honoree] : [], eventType: e.event_type, contractCode }) || e.pasta).trim();
      const money = (n) => (n == null ? null : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
      const handover = [
        [e.package && `Pacote ${e.package}`, e.guests && `${e.guests} convidados`, e.total != null && `valor ${money(e.total)}`].filter(Boolean).join(' · '),
        ...(e.particularidades || []).slice(0, 2).map((p) => String(p).replace(/\s+/g, ' ').slice(0, 220)),
        e.aditivos ? `Possui ${e.aditivos} ${e.aditivos === 1 ? 'aditivo anexado' : 'aditivos anexados'}.` : '',
      ].filter(Boolean).join('\n');
      const attachments = e.docs.map((d) => ({ name: d.name, url: docUrl(d.id), type: d.kind }));
      const contractId = randomUUID();
      const entry = e.entry ?? 0; const signal = e.signal ?? 0;
      const agora = new Date().toISOString();
      const contractRow = {
        id: contractId, master_id: MASTER_ID, contract_code: contractCode, contact_id: contactId, venue_id: venue.id,
        event_type: e.event_type, event_title: title, contract_title: title, title,
        event_date: eventDate, guest_count: e.guests || 0, package_name: e.package || null,
        client_snapshot: { name: e.name, payerName: e.name, phone: e.phone, email: e.email, cpf: e.cpf, address: e.address, birthdayPersonName: e.honoree || null },
        commercial_fields_snapshot: { importKey, origem: 'importacao_contratos', pasta: e.pasta, valorDe: e.value_from, dataNoContrato: e.date_fix ? e.date_fix.de : e.event_date, dataNaPasta: e.date_in_folder, dataEmConflito: dateConflict,
          ...(e.date_fix ? { dataPorAditivo: e.date_fix } : {}), ...(e.cancelado ? { cancelado: true } : {}) },
        total_amount: e.total ?? 0, signal_amount: signal, entry_amount: entry, balance_amount: Math.max(0, (e.total ?? 0) - entry - signal),
        payment_summary: e.payment_summary || null, fill_stage: 'preenchido', payment_terms: {}, sdr_name: '', closer_name: '',
        approval_status: e.cancelado ? 'canceled' : 'approved', approved_by_name: 'Importação de contratos', approved_by_role: 'sistema', approved_at: agora,
        target_pos_sale_funnel_ids: e.cancelado ? [] : [funnel.id], handover_notes: handover || null,
        contract_file_url: e.main_id ? docUrl(e.main_id) : null, attachments, notes: e.cancelado ? `[Cancelado na importação em ${new Date().toLocaleString('pt-BR')}] Pasta marcada como CANCELADA no Drive.` : '',
        ...(e.cancelado ? { rejection_reason: 'Pasta marcada como CANCELADA no Drive (importação)' } : {}),
      };
      if (!DRY) { must(await sb.from('contracts').insert(contractRow), 'criar contrato'); log({ kind: 'contract', id: contractId }); }

      // 3. CLIENTE (+ colocacao no funil, so se ativo)
      const clientId = randomUUID();
      if (!DRY) {
        if (!e.cancelado) {
          must(await sb.from('contract_funnel_placements').upsert({ master_id: MASTER_ID, contract_id: contractId, funnel_id: funnel.id, stage_id: stageId, status: 'in_progress' }, { onConflict: 'contract_id,funnel_id' }), 'colocacao');
          log({ kind: 'placement', contractId });
        }
        must(await sb.from('clients').insert({
          id: clientId, master_id: MASTER_ID, code: code('CLI', 8), name: e.honoree || title, contract_title: title,
          payer_name: e.name, payer_phone: e.phone, payer_email: e.email, payer_cpf: e.cpf, payer_address: e.address,
          birthday_person_name: e.honoree || null, event_type: e.event_type, event_date: eventDate, guest_count: e.guests || 0,
          venue_id: venue.id, venue_name: venue.name, package_sold: e.package || null, deal_value: e.total ?? 0,
          funnel_id: funnel.id, stage: e.cancelado ? 'archived' : stageId,
        }), 'criar cliente');
        log({ kind: 'client', id: clientId });
        must(await sb.from('contracts').update({ client_id: clientId }).eq('id', contractId).eq('master_id', MASTER_ID), 'ligar cliente');
      }

      // 4. AGENDA (so contrato ativo com data)
      if (!e.cancelado && !dateConflict) {
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

      // 5. TAREFA de pendencias (so contrato ativo)
      if (!e.cancelado && pendencias.length) {
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
      stats.criados++; if (e.cancelado) stats.cancelados++;
    } catch (err) {
      stats.erros++; problems.push(`${e.pasta}: ${err.message}`);
    }
  }
  console.log(DRY ? '--- SIMULACAO (nada gravado) ---' : '--- IMPORTADO NA PRODUCAO ---');
  console.log(stats);
  if (problems.length) { console.log('Ocorrencias:'); problems.slice(0, 40).forEach((p) => console.log(' -', p)); if (problems.length > 40) console.log(` ... e mais ${problems.length - 40}`); }
}

main().catch((err) => { console.error(err); process.exit(1); });
