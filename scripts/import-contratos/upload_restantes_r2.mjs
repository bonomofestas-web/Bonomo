#!/usr/bin/env node
/**
 * Sobe para o R2 os demais arquivos (imagens, PDFs e Word convertido) das pastas dos contratos que ja estao no sistema, ainda sem vinculo
 * com o contrato. Plano: Contratos_catalogo\restantes_r2_plano.json (plan_restantes.py). Chaves opacas: contracts_pending/<hash>.<ext>.
 * Planilhas (.xlsx) NAO sobem: sao balancos internos, nao documentos do cliente. Padrao = dry-run.
 * Uso: node scripts/import-contratos/upload_restantes_r2.mjs [--aplicar] [--rollback]
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { S3Client, HeadObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const DIR = 'C:\\Users\\--\\Downloads\\Contratos_catalogo';
const PLANO = `${DIR}\\restantes_r2_plano.json`;
const INDICE = `${DIR}\\restantes_r2_indice.csv`;
const LOG = `${DIR}\\restantes_r2_log.jsonl`;
const HOST_ESPERADO = 'pub-dfdef15994014f9c933c40b4ccde124b';
const args = process.argv.slice(2);
const APLICAR = args.includes('--aplicar');

const env = Object.fromEntries(readFileSync('.env.local', 'utf-8').split(/\r?\n/).filter((l) => l && !l.trim().startsWith('#') && l.includes('='))
  .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const bucket = env.CLOUDFLARE_R2_BUCKET_NAME || '001';
const publicUrl = (env.CLOUDFLARE_R2_PUBLIC_URL || '').replace(/\/$/, '');
if (!env.CLOUDFLARE_R2_ACCOUNT_ID || !env.CLOUDFLARE_R2_ACCESS_KEY_ID || !env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || !publicUrl) { console.error('Credenciais do R2 ausentes.'); process.exit(1); }
if (!publicUrl.includes(HOST_ESPERADO)) { console.error('RECUSADO: bucket diferente do de producao.'); process.exit(1); }
const s3 = new S3Client({ region: 'auto', endpoint: `https://${env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID, secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY } });

if (args.includes('--rollback')) {
  const keys = existsSync(LOG) ? readFileSync(LOG, 'utf-8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l).key) : [];
  console.log(`Rollback: ${keys.length} objetos`, APLICAR ? '' : '(dry-run)');
  if (APLICAR) for (const Key of keys) await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key }));
  process.exit(0);
}

const plano = JSON.parse(readFileSync(PLANO, 'utf-8')).filter((x) => x.tipo !== 'planilha');
console.log(`Plano: ${plano.length} arquivos (${(plano.reduce((a, x) => a + x.tamanho, 0) / 1e6).toFixed(0)} MB). ${APLICAR ? 'APLICAR' : 'dry-run'}`);
const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const linhas = [['chave_r2', 'url', 'pasta', 'arquivo_original', 'tipo', 'contrato_no_sistema', 'contrato_cancelado', 'situacao'].join(';')];
let enviados = 0, existiam = 0, erros = 0;
for (let i = 0; i < plano.length; i++) {
  const x = plano[i];
  const Key = `contracts_pending/${x.id}${x.ext}`;
  linhas.push([Key, `${publicUrl}/${Key}`, x.pasta, x.arquivo, x.tipo, x.contrato, x.cancelado ? 'sim' : 'não', 'Sem vínculo confirmado com o contrato (documento sem CPF para conferir)'].map(q).join(';'));
  if (!APLICAR) continue;
  try { await s3.send(new HeadObjectCommand({ Bucket: bucket, Key })); existiam++; }
  catch (e) {
    if (e.name !== 'NotFound' && e.$metadata?.httpStatusCode !== 404) { erros++; console.error('HEAD', Key, e.message); continue; }
    try {
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key, Body: readFileSync(x.origem_path), ContentType: x.content_type, CacheControl: 'public, max-age=31536000, immutable' }));
      appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), key: Key }) + '\n'); enviados++;
    } catch (e2) { erros++; console.error('PUT', Key, e2.message); }
  }
  if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${plano.length} (enviados ${enviados}, ja existiam ${existiam}, erros ${erros})`);
}
writeFileSync(INDICE, '\ufeff' + linhas.join('\n'), 'utf-8');
console.log(`Concluido: enviados ${enviados} | ja existiam ${existiam} | erros ${erros}. Indice: ${INDICE}`);
