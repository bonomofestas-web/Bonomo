import fs from 'fs';
import path from 'path';
import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

// Carrega .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = Object.fromEntries(
  envContent
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const accountId = env.CLOUDFLARE_R2_ACCOUNT_ID;
const accessKeyId = env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const bucketName = env.CLOUDFLARE_R2_BUCKET_NAME || '001';
const publicUrl = (env.CLOUDFLARE_R2_PUBLIC_URL || '').replace(/\/$/, '');

if (!accountId || !accessKeyId || !secretAccessKey || !publicUrl) {
  console.error('Credenciais do Cloudflare R2 nao configuradas em .env.local.');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

const manifestPath = env.LOCAL_DOCS_MANIFEST || 'C:\\Users\\--\\Downloads\\Contratos_catalogo\\local_files.json';
if (!fs.existsSync(manifestPath)) {
  console.error(`Manifesto de arquivos nao encontrado em: ${manifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
const entries = Object.entries(manifest);
console.log(`[R2 Upload] Encontrados ${entries.length} arquivos no manifesto.`);

async function uploadToR2() {
  let uploaded = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < entries.length; i++) {
    const [id, localPath] = entries[i];
    const key = `contracts/${id}.pdf`;

    if (!fs.existsSync(localPath)) {
      console.warn(`[${i + 1}/${entries.length}] Arquivo local inexistente: ${localPath}`);
      errors++;
      continue;
    }

    try {
      // Verifica se o objeto ja existe no R2
      await s3.send(new HeadObjectCommand({ Bucket: bucketName, Key: key }));
      skipped++;
      if (skipped % 25 === 0 || skipped === entries.length) {
        console.log(`[Progresso] ${i + 1}/${entries.length} - ${skipped} ja existiam no R2...`);
      }
    } catch (headErr) {
      if (headErr.name === 'NotFound' || headErr.$metadata?.httpStatusCode === 404) {
        try {
          const fileBuffer = fs.readFileSync(localPath);
          await s3.send(
            new PutObjectCommand({
              Bucket: bucketName,
              Key: key,
              Body: fileBuffer,
              ContentType: 'application/pdf',
              CacheControl: 'public, max-age=31536000, immutable',
            })
          );
          uploaded++;
          console.log(`[${i + 1}/${entries.length}] Enviado para R2: ${key} (${(fileBuffer.length / 1024).toFixed(1)} KB)`);
        } catch (uploadErr) {
          console.error(`Erro ao subir ${key}:`, uploadErr.message);
          errors++;
        }
      } else {
        console.error(`Erro no HeadObject para ${key}:`, headErr.message);
        errors++;
      }
    }
  }

  console.log(`\n--- RESUMO DO UPLOAD R2 ---`);
  console.log(`Total mapeados: ${entries.length}`);
  console.log(`Ja existiam: ${skipped}`);
  console.log(`Novos enviados: ${uploaded}`);
  console.log(`Erros/Nao encontrados: ${errors}`);
}

async function updateLocalDatabase() {
  console.log(`\n[Database Update] Conectando ao banco local Supabase...`);
  const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: contracts, error } = await sb.from('contracts').select('id, contract_file_url, attachments');
  if (error) {
    console.error('Erro ao buscar contratos no banco:', error);
    return;
  }

  const targetPrefix = `${publicUrl}/contracts/`;
  let updatedContracts = 0;

  for (const c of contracts) {
    let changed = false;
    let newUrl = c.contract_file_url;
    let newAttachments = c.attachments;

    if (newUrl && newUrl.includes('/local-docs/')) {
      newUrl = newUrl.replace(/\/local-docs\//g, targetPrefix);
      changed = true;
    }

    if (Array.isArray(newAttachments)) {
      const updatedList = newAttachments.map((att) => {
        if (att.url && att.url.includes('/local-docs/')) {
          changed = true;
          return {
            ...att,
            url: att.url.replace(/\/local-docs\//g, targetPrefix),
          };
        }
        return att;
      });
      if (changed) {
        newAttachments = updatedList;
      }
    }

    if (changed) {
      const { error: updErr } = await sb
        .from('contracts')
        .update({
          contract_file_url: newUrl,
          attachments: newAttachments,
        })
        .eq('id', c.id);

      if (updErr) {
        console.error(`Erro ao atualizar contrato ${c.id}:`, updErr.message);
      } else {
        updatedContracts++;
      }
    }
  }

  console.log(`[Database Update] Contratos atualizados com links R2: ${updatedContracts}/${contracts.length}`);

  // Conferencia
  const { data: checkData } = await sb.from('contracts').select('id, contract_file_url, attachments');
  const remaining = checkData.filter(
    (c) =>
      (c.contract_file_url && c.contract_file_url.includes('/local-docs/')) ||
      (Array.isArray(c.attachments) && c.attachments.some((a) => a.url && a.url.includes('/local-docs/')))
  ).length;

  console.log(`[Database Update] Verificacao final: contratos ainda com /local-docs/ = ${remaining}`);
}

async function main() {
  await uploadToR2();
  await updateLocalDatabase();
}

main().catch(console.error);
