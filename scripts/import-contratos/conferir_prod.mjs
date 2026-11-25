#!/usr/bin/env node
/** Conferencia somente leitura da producao: contagens por status, contratos importados sem arquivo/sem cliente e acentos. */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const MASTER_ID = 'a0000000-0000-0000-0000-000000000001';
const env = Object.fromEntries(readFileSync('.env', 'utf-8').split(/\r?\n/).filter((l) => l && !l.trim().startsWith('#') && l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
if (/127\.0\.0\.1|localhost/.test(env.VITE_SUPABASE_URL || '')) { console.error('O .env aponta para o banco local.'); process.exit(1); }
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: cs, error } = await sb.from('contracts').select('id, contract_code, approval_status, fill_stage, event_date, client_id, contract_file_url, attachments, approved_by_name, commercial_fields_snapshot').eq('master_id', MASTER_ID);
if (error) { console.error(error.message); process.exit(1); }
const cont = (arr, f) => arr.reduce((m, x) => { const k = f(x); m[k] = (m[k] || 0) + 1; return m; }, {});
console.log('contratos:', cs.length, cont(cs, (c) => c.approval_status));
console.log('aprovado_por:', cont(cs, (c) => c.approved_by_name));
console.log('sem arquivo:', cs.filter((c) => !c.contract_file_url).length, '| sem cliente:', cs.filter((c) => !c.client_id).length, '| sem data:', cs.filter((c) => !c.event_date).length);
console.log('com anexos:', cs.filter((c) => (c.attachments || []).length).length, '| anexos total:', cs.reduce((a, c) => a + (c.attachments || []).length, 0));
console.log('codigos duplicados:', cs.length - new Set(cs.map((c) => c.contract_code)).size);
const { count: tasks } = await sb.from('admin_tasks').select('id', { count: 'exact', head: true }).eq('master_id', MASTER_ID).eq('created_by_name', 'Importação de contratos');
const { count: evs } = await sb.from('venue_events').select('id', { count: 'exact', head: true }).eq('master_id', MASTER_ID).eq('created_by_name', 'Importação de contratos');
console.log('tarefas da importacao:', tasks, '| eventos na agenda da importacao:', evs);
const urls = cs.map((c) => c.contract_file_url).filter(Boolean);
const amostra = urls.filter((_, i) => i % Math.max(1, Math.floor(urls.length / 6)) === 0).slice(0, 6);
for (const u of amostra) { const r = await fetch(u, { method: 'HEAD' }); console.log('R2', r.status, u.split('/').pop()); }
process.exit(0);
