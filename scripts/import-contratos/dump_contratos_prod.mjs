#!/usr/bin/env node
/** Somente leitura: grava em Contratos_catalogo\contratos_prod.json os contratos e clientes de producao (para auditoria). */
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const MASTER_ID = 'a0000000-0000-0000-0000-000000000001';
const env = Object.fromEntries(readFileSync('.env', 'utf-8').split(/\r?\n/).filter((l) => l && !l.trim().startsWith('#') && l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
if (/127\.0\.0\.1|localhost/.test(env.VITE_SUPABASE_URL || '')) { console.error('O .env aponta para o banco local.'); process.exit(1); }
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const r = await sb.from('contracts').select('*').eq('master_id', MASTER_ID);
if (r.error) { console.error(r.error.message); process.exit(1); }
writeFileSync('C:/Users/--/Downloads/Contratos_catalogo/contratos_prod.json', JSON.stringify(r.data, null, 1));
console.log('contratos:', r.data.length, '| colunas:', Object.keys(r.data[0]).join(','));
process.exit(0);
