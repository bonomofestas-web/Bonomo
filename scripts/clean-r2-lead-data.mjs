/**
 * F5 SYSTEM • LIMPEZA DO CLOUDFLARE R2 — ARQUIVOS DE LEADS, CONVERSAS E CONTRATOS
 *
 * Apaga SOMENTE os prefixos da lista branca abaixo (mídias de conversas e anexos de cliente/contrato).
 * NUNCA toca 'avatars/' (fotos de contatos, colaboradores e debutantes), 'venues/', 'invites/', 'broadcasts/',
 * 'support*', 'brand/', 'videos/' nem qualquer outra pasta.
 *
 * SEGURANÇA
 *  - DRY-RUN por padrão: só lista (arquivos e GB por prefixo) e grava o manifesto das chaves.
 *  - Só apaga com `--apply` E digitando o nome do bucket quando o script pedir.
 *  - Antes de apagar, confere (somente leitura) as tabelas que PERMANECEM (contacts, collaborators, venues,
 *    debutantes, sources) e PULA qualquer arquivo que ainda seja referenciado por elas.
 *  - O manifesto (lista de chaves, sem conteúdo) é salvo FORA do repositório (pasta do usuário).
 *  - Irreversível: o R2 não tem lixeira. Rode DEPOIS do reset do banco e da pausa de mensagens.
 *
 * Uso:
 *   npm run clean:r2-leads                 (dry-run)
 *   npm run clean:r2-leads -- --apply      (apaga, com confirmação digitada)
 *   Opções: --skip-db-check  (NÃO recomendado: pula a conferência das tabelas que permanecem)
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lista branca: ÚNICOS prefixos que este script pode apagar.
const PREFIXES = [
  'whatsapp/',
  'client_documents/',
  'local_dev/whatsapp/',
  'local_dev/client_documents/',
];

// Tabelas que PERMANECEM e podem referenciar arquivos do R2 (só leitura).
const KEPT_TABLES = ['contacts', 'collaborators', 'venues', 'debutantes', 'sources'];

const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');
const SKIP_DB_CHECK = args.has('--skip-db-check');

// ── .env ──────────────────────────────────────────────────────────────────────
const envVars = {};
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let val = (match[2] || '').trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      envVars[match[1]] = val;
    }
  });
}
const env = (k) => envVars[k] || process.env[k];

const accountId = env('CLOUDFLARE_R2_ACCOUNT_ID');
const accessKeyId = env('CLOUDFLARE_R2_ACCESS_KEY_ID');
const secretAccessKey = env('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
const bucketName = env('CLOUDFLARE_R2_BUCKET_NAME') || '001';

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.error('Credenciais do Cloudflare R2 ausentes no .env (CLOUDFLARE_R2_ACCOUNT_ID / ACCESS_KEY_ID / SECRET_ACCESS_KEY).');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

const isAllowedKey = (key) => PREFIXES.some((p) => key.startsWith(p));

async function listPrefix(prefix) {
  const out = [];
  let token;
  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: bucketName, Prefix: prefix, ContinuationToken: token }));
    for (const obj of res.Contents || []) out.push({ key: obj.Key, size: obj.Size || 0 });
    token = res.NextContinuationToken;
  } while (token);
  return out;
}

/** Chaves do R2 ainda referenciadas por tabelas que permanecem (somente leitura). */
async function findReferencedKeys() {
  const url = env('VITE_SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY') || env('VITE_SUPABASE_ANON_KEY');
  if (!url || !key) throw new Error('Supabase não configurado no .env (necessário para a conferência de referências).');
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const referenced = new Set();
  const regex = /(?:local_dev\/)?(?:whatsapp|client_documents)\/[^"'\s)\\<>?#]+/g;
  const PAGE = 1000;

  for (const table of KEPT_TABLES) {
    let from = 0;
    for (;;) {
      const { data, error } = await supabase.from(table).select('*').range(from, from + PAGE - 1);
      if (error) {
        if (/does not exist|not find the table|relation/i.test(error.message || '')) break; // tabela inexistente neste banco
        throw new Error(`Falha ao ler ${table}: ${error.message}`);
      }
      if (!data || data.length === 0) break;
      for (const row of data) {
        const text = JSON.stringify(row);
        for (const m of text.matchAll(regex)) {
          let k = m[0];
          try { k = decodeURIComponent(k); } catch { /* mantém */ }
          referenced.add(k);
        }
      }
      if (data.length < PAGE) break;
      from += PAGE;
    }
  }
  return referenced;
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a.trim()); }));
}

async function main() {
  console.log('============================================================');
  console.log(' LIMPEZA DO R2 — ARQUIVOS DE LEADS / CONVERSAS / CONTRATOS');
  console.log(` Bucket: ${bucketName} | Modo: ${APPLY ? 'APLICAR (apaga de verdade)' : 'DRY-RUN (só lista)'}`);
  console.log('============================================================\n');

  // 1. Lista os prefixos permitidos
  const all = [];
  for (const prefix of PREFIXES) {
    const items = await listPrefix(prefix);
    const bytes = items.reduce((s, i) => s + i.size, 0);
    console.log(`  ${prefix.padEnd(30)} ${String(items.length).padStart(7)} arquivo(s) | ${formatBytes(bytes).padStart(10)}`);
    all.push(...items);
  }
  const totalBytes = all.reduce((s, i) => s + i.size, 0);
  console.log(`\n  TOTAL NOS PREFIXOS: ${all.length} arquivo(s) | ${formatBytes(totalBytes)}`);

  // Trava de integridade: nada fora da lista branca pode entrar
  const outsider = all.find((i) => !isAllowedKey(i.key));
  if (outsider) {
    console.error(`ABORTADO: chave fora da lista branca detectada (${outsider.key}).`);
    process.exit(1);
  }
  if (all.length === 0) {
    console.log('\nNada para apagar.');
    return;
  }

  // 2. Referências em tabelas que permanecem
  let skipped = [];
  let toDelete = all;
  if (SKIP_DB_CHECK) {
    console.log('\nATENÇÃO: conferência de referências PULADA (--skip-db-check).');
  } else {
    console.log('\nConferindo (somente leitura) se algo ainda é usado por:', KEPT_TABLES.join(', '), '...');
    const referenced = await findReferencedKeys();
    skipped = all.filter((i) => referenced.has(i.key));
    toDelete = all.filter((i) => !referenced.has(i.key));
    console.log(`  Referenciados (serão PULADOS): ${skipped.length}`);
    skipped.slice(0, 20).forEach((i) => console.log(`    - ${i.key}`));
    if (skipped.length > 20) console.log(`    ... e mais ${skipped.length - 20}`);
  }

  const delBytes = toDelete.reduce((s, i) => s + i.size, 0);
  console.log(`\n  A APAGAR: ${toDelete.length} arquivo(s) | ${formatBytes(delBytes)} liberados`);

  // 3. Manifesto (fora do repositório)
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const manifestPath = path.join(os.homedir(), `f5-r2-clean-manifest-${stamp}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify({
    bucket: bucketName, mode: APPLY ? 'apply' : 'dry-run', generatedAt: new Date().toISOString(),
    prefixes: PREFIXES, toDelete, skippedReferenced: skipped.map((i) => i.key),
  }, null, 2));
  console.log(`  Manifesto salvo em: ${manifestPath}`);

  if (!APPLY) {
    console.log('\nDRY-RUN: nada foi apagado. Para apagar: npm run clean:r2-leads -- --apply');
    return;
  }

  // 4. Confirmação digitada
  console.log('\n!!! IRREVERSÍVEL: o R2 não tem lixeira. Faça isso só depois do reset do banco.');
  const typed = await ask(`Digite o nome do bucket (${bucketName}) para confirmar: `);
  if (typed !== bucketName) {
    console.log('Confirmação incorreta. Nada foi apagado.');
    return;
  }

  // 5. Apaga em lotes de 1000
  let deleted = 0;
  let failed = 0;
  for (let i = 0; i < toDelete.length; i += 1000) {
    const batch = toDelete.slice(i, i + 1000).filter((o) => isAllowedKey(o.key));
    const res = await s3.send(new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: { Objects: batch.map((o) => ({ Key: o.key })), Quiet: true },
    }));
    const errs = res.Errors || [];
    failed += errs.length;
    deleted += batch.length - errs.length;
    errs.slice(0, 5).forEach((e) => console.warn(`  Falha: ${e.Key} (${e.Code})`));
    console.log(`  Lote ${Math.floor(i / 1000) + 1}: ${batch.length - errs.length} apagado(s), ${errs.length} falha(s)`);
  }
  console.log(`\nCONCLUÍDO: ${deleted} arquivo(s) apagado(s), ${failed} falha(s). Rode 'node scripts/audit-r2-storage.mjs' para conferir o total.`);
}

main().catch((err) => {
  console.error('Erro:', err?.message || err);
  process.exit(1);
});
