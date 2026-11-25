#!/usr/bin/env node
/**
 * Sobe para o R2 os arquivos dos contratos NOVOS e os aditivos (contracts/<id>.pdf, mesma convencao dos contratos ja em producao).
 * Manifesto: Contratos_catalogo\local_files_novos.json (id -> caminho do PDF; Word ja convertido). Padrao = dry-run.
 * Uso: node scripts/import-contratos/upload_novos_r2.mjs [--aplicar] [--rollback]
 */
import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import { S3Client, HeadObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const DIR = 'C:\\Users\\--\\Downloads\\Contratos_catalogo';
const MANIFESTO = `${DIR}\\local_files_novos.json`;
const LOG = `${DIR}\\novos_r2_log.jsonl`;
const HOST_ESPERADO = 'pub-dfdef15994014f9c933c40b4ccde124b';
const args = process.argv.slice(2);
const APLICAR = args.includes('--aplicar');

const env = Object.fromEntries(readFileSync('.env.local', 'utf-8').split(/\r?\n/)
  .filter((l) => l && !l.trim().startsWith('#') && l.includes('='))
  .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const bucket = env.CLOUDFLARE_R2_BUCKET_NAME || '001';
const publicUrl = (env.CLOUDFLARE_R2_PUBLIC_URL || '').replace(/\/$/, '');
if (!env.CLOUDFLARE_R2_ACCOUNT_ID || !env.CLOUDFLARE_R2_ACCESS_KEY_ID || !env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || !publicUrl) { console.error('Credenciais do R2 ausentes.'); process.exit(1); }
if (!publicUrl.includes(HOST_ESPERADO)) { console.error('RECUSADO: bucket diferente do usado pelos contratos em producao.'); process.exit(1); }
const s3 = new S3Client({ region: 'auto', endpoint: `https://${env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID, secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY } });

if (args.includes('--rollback')) {
  const keys = existsSync(LOG) ? readFileSync(LOG, 'utf-8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l).key) : [];
  console.log(`Rollback: ${keys.length} objetos`, APLICAR ? '' : '(dry-run)');
  if (APLICAR) for (const Key of keys) await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key }));
  process.exit(0);
}

const entries = Object.entries(JSON.parse(readFileSync(MANIFESTO, 'utf-8')));
console.log(`Manifesto: ${entries.length} arquivos. ${APLICAR ? 'APLICAR' : 'dry-run'}`);
let enviados = 0, existiam = 0, faltando = 0, erros = 0;
for (let i = 0; i < entries.length; i++) {
  const [id, path] = entries[i];
  const Key = `contracts/${id}.pdf`;
  if (!existsSync(path)) { faltando++; console.warn('Arquivo local inexistente:', path.split('\\').pop()); continue; }
  if (!APLICAR) continue;
  try { await s3.send(new HeadObjectCommand({ Bucket: bucket, Key })); existiam++; continue; }
  catch (e) { if (e.name !== 'NotFound' && e.$metadata?.httpStatusCode !== 404) { erros++; console.error('HEAD', Key, e.message); continue; } }
  try {
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key, Body: readFileSync(path), ContentType: 'application/pdf', CacheControl: 'public, max-age=31536000, immutable' }));
    appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), key: Key }) + '\n');
    enviados++;
  } catch (e) { erros++; console.error('PUT', Key, e.message); }
  if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${entries.length} (enviados ${enviados}, ja existiam ${existiam}, erros ${erros})`);
}
console.log(`Concluido: enviados ${enviados} | ja existiam ${existiam} | sem arquivo local ${faltando} | erros ${erros}`);
