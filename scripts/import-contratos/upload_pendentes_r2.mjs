#!/usr/bin/env node
/**
 * Sobe para o R2 os documentos PENDENTES dos contratos (pastas ainda nao lancadas, documentos sem vinculo confirmado e versoes
 * alternativas do contrato). NAO liga nada a contrato no banco: so guarda o arquivo e gera um indice para a equipe decidir.
 *
 * Entrada (fora do repo): Contratos_catalogo\pendentes_r2_plano.json (gerado por plan_pendentes.py)
 * Saida   (fora do repo): Contratos_catalogo\pendentes_r2_indice.csv  e  pendentes_r2_log.jsonl (para --rollback)
 * Chaves opacas (contracts_pending/<hash>.pdf), como em contracts/<id>.pdf: o nome do cliente nao aparece na URL.
 *
 * Padrao = dry-run. Uso: node scripts/import-contratos/upload_pendentes_r2.mjs [--aplicar] [--limit N] [--rollback]
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { S3Client, HeadObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const DIR = 'C:\\Users\\--\\Downloads\\Contratos_catalogo';
const PLANO = `${DIR}\\pendentes_r2_plano.json`;
const INDICE = `${DIR}\\pendentes_r2_indice.csv`;
const LOG = `${DIR}\\pendentes_r2_log.jsonl`;
const HOST_ESPERADO = 'pub-dfdef15994014f9c933c40b4ccde124b'; // mesmo host dos contratos que ja estao em producao
const args = process.argv.slice(2);
const APLICAR = args.includes('--aplicar');
const ROLLBACK = args.includes('--rollback');
const li = args.indexOf('--limit');
const LIMIT = li >= 0 ? Number(args[li + 1]) : Infinity;

const env = Object.fromEntries(readFileSync('.env.local', 'utf-8').split(/\r?\n/)
  .filter((l) => l && !l.trim().startsWith('#') && l.includes('='))
  .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const bucket = env.CLOUDFLARE_R2_BUCKET_NAME || '001';
const publicUrl = (env.CLOUDFLARE_R2_PUBLIC_URL || '').replace(/\/$/, '');
if (!env.CLOUDFLARE_R2_ACCOUNT_ID || !env.CLOUDFLARE_R2_ACCESS_KEY_ID || !env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || !publicUrl) {
  console.error('Credenciais do R2 ausentes no .env.local.'); process.exit(1);
}
if (!publicUrl.includes(HOST_ESPERADO)) {
  console.error('RECUSADO: o bucket publico configurado nao e o mesmo dos contratos de producao.'); process.exit(1);
}
const s3 = new S3Client({ region: 'auto', endpoint: `https://${env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID, secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY } });

if (ROLLBACK) {
  if (!existsSync(LOG)) { console.error('Sem log para desfazer.'); process.exit(1); }
  const keys = readFileSync(LOG, 'utf-8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l).key);
  console.log(`Rollback: ${keys.length} objetos.`, APLICAR ? '' : '(dry-run; use --aplicar)');
  if (APLICAR) for (const Key of keys) await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key }));
  process.exit(0);
}

const plano = JSON.parse(readFileSync(PLANO, 'utf-8')).slice(0, LIMIT);
const totalMB = plano.reduce((a, x) => a + x.tamanho, 0) / 1e6;
console.log(`Plano: ${plano.length} arquivos (${totalMB.toFixed(1)} MB). Bucket: ${bucket}. ${APLICAR ? 'APLICAR' : 'dry-run'}`);

const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const linhas = [['chave_r2', 'url', 'pasta', 'arquivo_original', 'origem', 'papel', 'parte_do_download', 'motivo', 'contrato_no_sistema'].join(';')];
let enviados = 0, existiam = 0, erros = 0;
for (let i = 0; i < plano.length; i++) {
  const x = plano[i];
  const key = `contracts_pending/${x.id}.pdf`;
  const url = `${publicUrl}/${key}`;
  linhas.push([key, url, x.pasta, x.arquivo, x.origem, x.papel, x.parte, x.motivo, x.contrato].map(q).join(';'));
  if (!APLICAR) continue;
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    existiam++;
  } catch (e) {
    if (e.name !== 'NotFound' && e.$metadata?.httpStatusCode !== 404) { erros++; console.error('Erro HEAD', key, e.message); continue; }
    try {
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: readFileSync(x.origem_path), ContentType: 'application/pdf', CacheControl: 'public, max-age=31536000, immutable' }));
      appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), key }) + '\n');
      enviados++;
    } catch (e2) { erros++; console.error('Erro ao enviar', key, e2.message); }
  }
  if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${plano.length} (enviados ${enviados}, ja existiam ${existiam}, erros ${erros})`);
}
writeFileSync(INDICE, '\ufeff' + linhas.join('\n'), 'utf-8');
console.log(`Concluido. enviados ${enviados} | ja existiam ${existiam} | erros ${erros}. Indice: ${INDICE}`);
