#!/usr/bin/env node
/**
 * Importa para a PRODUCAO as propostas historicas viaveis (propostas_historicas.json, gerado por build_propostas_historicas.py)
 * na tabela proposals (primeira etapa do quadro de contratos). O PDF de cada proposta vai para o R2 em proposals/<hash>.pdf.
 * Nao cria contrato, lead nem contato; so liga a um contato que ja exista com o mesmo telefone.
 * Exige a migracao 20261123130000_proposals.sql aplicada. Padrao = dry-run. Log para --rollback.
 * Uso: node scripts/import-contratos/import_propostas_prod.mjs [--aplicar] [--rollback]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { S3Client, HeadObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

const DIR = 'C:/Users/--/Downloads/Contratos_catalogo';
const LOG = `${DIR}/propostas_import_log.json`;
const MASTER_ID = 'a0000000-0000-0000-0000-000000000001';
const APLICAR = process.argv.includes('--aplicar');
const readEnv = (f) => Object.fromEntries(readFileSync(f, 'utf-8').split(/\r?\n/).filter((l) => l && !l.trim().startsWith('#') && l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const env = readEnv('.env');
const envLocal = readEnv('.env.local');
if (!env.VITE_SUPABASE_URL || /127\.0\.0\.1|localhost/.test(env.VITE_SUPABASE_URL)) { console.error('RECUSADO: o .env nao aponta para a producao.'); process.exit(1); }
const R2 = (envLocal.CLOUDFLARE_R2_PUBLIC_URL || '').replace(/\/$/, '');
if (!R2.includes('pub-dfdef15994014f9c933c40b4ccde124b')) { console.error('RECUSADO: R2 diferente do de producao.'); process.exit(1); }
const bucket = envLocal.CLOUDFLARE_R2_BUCKET_NAME || '001';
const s3 = new S3Client({ region: 'auto', endpoint: `https://${envLocal.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: envLocal.CLOUDFLARE_R2_ACCESS_KEY_ID, secretAccessKey: envLocal.CLOUDFLARE_R2_SECRET_ACCESS_KEY } });
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = (r, w) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data; };

if (process.argv.includes('--rollback')) {
  const l = existsSync(LOG) ? JSON.parse(readFileSync(LOG, 'utf-8')) : { ids: [], keys: [] };
  console.log(`Rollback: ${l.ids.length} propostas, ${l.keys.length} arquivos`, APLICAR ? '' : '(dry-run)');
  if (APLICAR) {
    for (const id of l.ids) must(await sb.from('proposals').delete().eq('id', id).eq('master_id', MASTER_ID), 'apagar proposta');
    for (const Key of l.keys) await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key }));
  }
  process.exit(0);
}

const probe = await sb.from('proposals').select('id').eq('master_id', MASTER_ID).limit(1);
if (probe.error) { console.error('A tabela proposals nao existe em producao. Aplique a migracao 20261123130000_proposals.sql antes.', probe.error.message); process.exit(1); }

const lista = JSON.parse(readFileSync(`${DIR}/propostas_historicas.json`, 'utf-8'));
const venues = must(await sb.from('venues').select('id, name').eq('master_id', MASTER_ID), 'unidades');
const contatos = must(await sb.from('contacts').select('id, primary_phone').eq('master_id', MASTER_ID).is('deleted_at', null), 'contatos');
const existentes = must(await sb.from('proposals').select('client_snapshot').eq('master_id', MASTER_ID), 'propostas');
const jaTem = new Set(existentes.map((p) => p.client_snapshot?.importKey).filter(Boolean));
const key8 = (s) => String(s || '').replace(/\D/g, '').slice(-8);
const porFone = new Map(contatos.filter((c) => key8(c.primary_phone).length === 8).map((c) => [key8(c.primary_phone), c.id]));
const code = () => `PROP-${Array.from({ length: 8 }, () => '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 36)]).join('')}`;
const log = { ids: [], keys: [] };
let criadas = 0, puladas = 0;
console.log(`${APLICAR ? 'APLICAR' : 'dry-run'} | ${lista.length} propostas candidatas`);
for (const p of lista) {
  const importKey = createHash('sha1').update(p.pasta).digest('hex').slice(0, 12);
  if (jaTem.has(importKey)) { puladas++; continue; }
  const venue = venues.find((v) => v.name === p.venue);
  if (!venue) { console.warn('unidade nao encontrada:', p.venue, '-', p.pasta); puladas++; continue; }
  const contactId = porFone.get(key8(p.telefone)) || null;
  const Key = `proposals/${p.arquivo_id}.pdf`;
  console.log(`${p.data_evento} | ${p.contratante} | R$ ${p.valor} | contato ${contactId ? 'existente' : 'nao encontrado'}`);
  if (!APLICAR) continue;
  let existe = true;
  try { await s3.send(new HeadObjectCommand({ Bucket: bucket, Key })); } catch { existe = false; }
  if (!existe) { await s3.send(new PutObjectCommand({ Bucket: bucket, Key, Body: readFileSync(p.arquivo_origem), ContentType: 'application/pdf', CacheControl: 'public, max-age=31536000, immutable' })); log.keys.push(Key); }
  const row = must(await sb.from('proposals').insert({
    master_id: MASTER_ID, proposal_code: code(), venue_id: venue.id, contact_id: contactId, title: p.titulo, event_type: p.tipo, event_date: p.data_evento,
    guest_count: p.convidados || null, package_name: p.pacote || null, total_amount: p.valor,
    client_snapshot: { name: p.contratante, payerName: p.contratante, phone: p.telefone, cpf: p.cpf || undefined, email: p.email || undefined, address: p.endereco || undefined, importKey, pasta: p.pasta },
    file_url: `${R2}/${Key}`, notes: `Proposta histórica importada do Drive (pasta "${p.pasta}"). Sem lead vinculado.`, source: 'importacao', proposal_date: p.data_proposta,
    created_by_name: 'Importação de propostas',
  }).select('id').single(), 'inserir proposta');
  log.ids.push(row.id); criadas++;
}
if (APLICAR) writeFileSync(LOG, JSON.stringify(log, null, 1));
console.log(`${APLICAR ? 'Criadas' : 'Seriam criadas'}: ${APLICAR ? criadas : lista.length - puladas} | puladas: ${puladas}`);
process.exit(0);
