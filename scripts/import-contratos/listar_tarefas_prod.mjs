#!/usr/bin/env node
/** Somente leitura: lista as tarefas pendentes criadas pela importacao de contratos em producao, agrupadas por tipo. */
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const MASTER_ID = 'a0000000-0000-0000-0000-000000000001';
const env = Object.fromEntries(readFileSync('.env', 'utf-8').split(/\r?\n/).filter((l) => l && !l.trim().startsWith('#') && l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
if (/127\.0\.0\.1|localhost/.test(env.VITE_SUPABASE_URL || '')) { console.error('O .env aponta para o banco local.'); process.exit(1); }
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data, error } = await sb.from('admin_tasks').select('*').eq('master_id', MASTER_ID).eq('created_by_name', 'Importação de contratos');
if (error) { console.error(error.message); process.exit(1); }
console.log('tarefas:', data.length, '| colunas:', Object.keys(data[0] || {}).join(','));
const cont = {};
for (const t of data) { const k = `${t.status} | ${String(t.title).replace(/\d+/g, '#').slice(0, 70)}`; cont[k] = (cont[k] || 0) + 1; }
console.log(cont);
writeFileSync('C:\\Users\\--\\Downloads\\Contratos_catalogo\\tarefas_prod.json', JSON.stringify(data, null, 1));
console.log('exemplo:', JSON.stringify(data[0], null, 1).slice(0, 1500));
process.exit(0);
