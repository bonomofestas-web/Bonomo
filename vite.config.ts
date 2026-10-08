import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function r2DevUploadPlugin() {
  return {
    name: 'r2-dev-upload-middleware',
    configureServer(server: any) {
      // 1. Endpoint /api/presign para desenvolvimento local com isolamento local_dev/
      server.middlewares.use('/api/presign', async (req: any, res: any) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        const env = loadEnv('development', process.cwd(), '');
        const accountId = env.CLOUDFLARE_R2_ACCOUNT_ID || process.env.CLOUDFLARE_R2_ACCOUNT_ID || 'b8a90a4ce83cb7dd913c07ff99596735';
        const accessKeyId = env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '893798c95ffa5b892697319a440f3817';
        const secretAccessKey = env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '168b5fc0ecd81cbb115539bc8b582e85826b5b390c835d04343d18d0026da86b';
        const bucketName = env.CLOUDFLARE_R2_BUCKET_NAME || process.env.CLOUDFLARE_R2_BUCKET_NAME || '001';
        const publicUrl = (env.CLOUDFLARE_R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev').replace(/\/$/, '');

        let body = '';
        req.on('data', (chunk: any) => { body += chunk; });
        req.on('end', async () => {
          try {
            const { fileName, contentType, folder = 'videos', customKey } = JSON.parse(body || '{}');
            if (!contentType) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'contentType não fornecido' }));
              return;
            }

            const ext = fileName ? fileName.split('.').pop() : (contentType ? contentType.split('/')[1] : 'bin');
            const timestamp = Date.now();
            const randomHex = Math.random().toString(36).substring(2, 8);
            // Regra 5 do AGENTS.md: Todo upload local é isolado sob o prefixo local_dev/
            const cleanFolder = (folder || 'uploads').replace(/^\/+|\/+$/g, '');
            const devFolder = `local_dev/${cleanFolder}`;
            const key = customKey ? `${devFolder}/${customKey}` : `${devFolder}/${timestamp}_${randomHex}.${ext}`;

            const s3Client = new S3Client({
              region: 'auto',
              endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
              credentials: {
                accessKeyId,
                secretAccessKey,
              },
            });

            const presignedUrl = await getSignedUrl(
              s3Client,
              new PutObjectCommand({
                Bucket: bucketName,
                Key: key,
                ContentType: contentType,
                CacheControl: 'public, max-age=31536000, immutable',
              }),
              { expiresIn: 900 }
            );

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({
              success: true,
              presignedUrl,
              publicUrl: `${publicUrl}/${key}`,
              key,
            }));
          } catch (err: any) {
            console.error('[R2 Dev Presign Error]:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Falha ao gerar presigned URL' }));
          }
        });
      });

      // 2. Endpoint legado /api/upload caso ocorra fallback
      server.middlewares.use('/api/upload', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        const env = loadEnv('development', process.cwd(), '');
        const accountId = env.CLOUDFLARE_R2_ACCOUNT_ID || process.env.CLOUDFLARE_R2_ACCOUNT_ID || 'b8a90a4ce83cb7dd913c07ff99596735';
        const accessKeyId = env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '893798c95ffa5b892697319a440f3817';
        const secretAccessKey = env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '168b5fc0ecd81cbb115539bc8b582e85826b5b390c835d04343d18d0026da86b';
        const bucketName = env.CLOUDFLARE_R2_BUCKET_NAME || process.env.CLOUDFLARE_R2_BUCKET_NAME || '001';
        const publicUrl = (env.CLOUDFLARE_R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev').replace(/\/$/, '');

        let body = '';
        req.on('data', (chunk: any) => { body += chunk; });
        req.on('end', async () => {
          try {
            const { fileBase64, fileName, contentType, folder = 'uploads', customKey } = JSON.parse(body || '{}');
            if (!fileBase64) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing fileBase64' }));
              return;
            }

            if (!accountId || !accessKeyId || !secretAccessKey) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'R2 credentials not configured' }));
              return;
            }

            const base64Data = fileBase64.replace(/^data:([A-Za-z-+/]+);base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const ext = fileName ? fileName.split('.').pop() : (contentType ? contentType.split('/')[1] : 'bin');
            const timestamp = Date.now();
            const randomHex = Math.random().toString(36).substring(2, 8);
            // Isolamento de Desenvolvimento: uploads locais são salvos exclusivamente em local_dev/
            const cleanFolder = (folder || 'uploads').replace(/^\/+|\/+$/g, '');
            const devFolder = `local_dev/${cleanFolder}`;
            const key = customKey ? `${devFolder}/${customKey}` : `${devFolder}/${timestamp}_${randomHex}.${ext}`;

            const s3Client = new S3Client({
              region: 'auto',
              endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
              credentials: {
                accessKeyId,
                secretAccessKey,
              },
            });

            await s3Client.send(
              new PutObjectCommand({
                Bucket: bucketName,
                Key: key,
                Body: buffer,
                ContentType: contentType || 'application/octet-stream',
                CacheControl: 'public, max-age=31536000, immutable',
              })
            );

            const finalUrl = `${publicUrl}/${key}`;
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, url: finalUrl, key }));
          } catch (err: any) {
            console.error('[R2 Dev Server Upload Error]:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Upload failed' }));
          }
        });
      });
    }
  };
}

function inviteDevPlugin() {
  return {
    name: 'invite-dev-middleware',
    configureServer(server: any) {
      server.middlewares.use('/api/invite-collaborator', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        const env = loadEnv('development', process.cwd(), '');
        const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
        const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

        let body = '';
        req.on('data', (chunk: any) => { body += chunk; });
        req.on('end', async () => {
          try {
            const { email, name, role, masterId, venueId, venueIds, sectors, department, invitedByName, redirectTo } = JSON.parse(body || '{}');
            if (!email) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'E-mail obrigatório' }));
              return;
            }

            if (!supabaseUrl || !supabaseKey) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Supabase credentials not found in environment' }));
              return;
            }

            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(supabaseUrl, supabaseKey, {
              auth: { autoRefreshToken: false, persistSession: false }
            });

            const cleanEmail = email.trim().toLowerCase();
            const finalRedirectTo = redirectTo || 'http://localhost:5173/?admin=true&type=recovery';
            const effectiveVenueId = (venueId && venueId !== 'all') ? venueId : null;
            const effectiveVenueIds = Array.isArray(venueIds) ? venueIds : (effectiveVenueId ? [effectiveVenueId] : []);

            let finalMasterId = masterId;
            if (!finalMasterId && effectiveVenueId) {
              try {
                const { data: vRow } = await supabase.from('venues').select('master_id').eq('id', effectiveVenueId).maybeSingle();
                if (vRow?.master_id) finalMasterId = vRow.master_id;
              } catch {}
            }

            // Tenta signUp com metadados do tenant
            const tempPassword = 'Bonomo_' + Math.random().toString(36).slice(-8) + '!';
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email: cleanEmail,
              password: tempPassword,
              options: {
                data: { 
                  name, 
                  invited_by: invitedByName, 
                  role: role || 'sdr',
                  master_id: finalMasterId,
                  venue_id: effectiveVenueId,
                  venue_ids: effectiveVenueIds,
                  sectors,
                  department,
                },
                emailRedirectTo: finalRedirectTo,
              }
            });

            // Persiste na tabela collaborators com master_id garantido
            try {
              const { data: existingRows } = await supabase
                .from('collaborators')
                .select('id')
                .eq('email', cleanEmail)
                .limit(1);

              const targetId = existingRows && existingRows.length > 0 ? existingRows[0].id : signUpData?.user?.id;
              const payload: Record<string, any> = {
                name: name || cleanEmail.split('@')[0],
                email: cleanEmail,
                role: role || 'sdr',
                active: true,
                is_first_access: true,
                updated_at: new Date().toISOString(),
              };
              if (finalMasterId) payload.master_id = finalMasterId;
              if (effectiveVenueId !== undefined) payload.venue_id = effectiveVenueId;
              if (effectiveVenueIds.length > 0) payload.venue_ids = effectiveVenueIds;
              if (sectors) payload.sectors = sectors;
              if (department) payload.department = department;

              if (targetId) {
                await supabase.from('collaborators').update(payload).eq('id', targetId);
              } else {
                await supabase.from('collaborators').insert(payload);
              }
            } catch (cErr) {
              console.warn('[vite-invite] Erro ao sincronizar collaborators:', cErr);
            }

            const isNewUser = !signUpError && 
              signUpData?.user && 
              Array.isArray(signUpData.user.identities) && 
              signUpData.user.identities.length > 0;

            if (isNewUser) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                email: cleanEmail,
                message: 'E-mail de ativação disparado com sucesso via signUp!',
              }));
              return;
            }

            // Fallback para usuário já existente no Auth
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
              redirectTo: finalRedirectTo,
            });

            if (!resetError) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                email: cleanEmail,
                message: 'Usuário já existente: e-mail de acesso enviado via resetPasswordForEmail!',
              }));
            } else {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: false,
                email: cleanEmail,
                message: resetError.message,
              }));
            }
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Erro interno' }));
          }
        });
      });
    }
  };
}

function r2ImageProxyPlugin() {
  return {
    name: 'r2-image-proxy-middleware',
    configureServer(server: any) {
      server.middlewares.use('/api/proxy-image', async (req: any, res: any) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');
          res.end();
          return;
        }

        try {
          const urlObj = new URL(req.url, 'http://localhost');
          const targetUrl = urlObj.searchParams.get('url');
          if (!targetUrl) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Missing url parameter' }));
            return;
          }

          const remoteRes = await fetch(targetUrl);
          if (!remoteRes.ok) {
            res.statusCode = remoteRes.status;
            res.end('Remote fetch failed');
            return;
          }

          const contentType = remoteRes.headers.get('content-type') || 'image/png';
          const arrayBuffer = await remoteRes.arrayBuffer();

          res.statusCode = 200;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=86400');
          res.end(Buffer.from(arrayBuffer));
        } catch (err: any) {
          console.error('[R2 Proxy Error]:', err);
          res.statusCode = 500;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(err.message || 'Proxy error');
        }
      });
    }
  };
}

function activateDevPlugin() {
  return {
    name: 'activate-dev-middleware',
    configureServer(server: any) {
      server.middlewares.use('/api/activate-collaborator', async (req: any, res: any) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        const env = loadEnv('development', process.cwd(), '');
        const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
        const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

        let body = '';
        req.on('data', (chunk: any) => { body += chunk; });
        req.on('end', async () => {
          try {
            const { email, collabId, password } = JSON.parse(body || '{}');
            const cleanEmail = (email && typeof email === 'string') ? email.trim().toLowerCase() : '';
            const cleanId = (collabId && typeof collabId === 'string') ? collabId.trim() : '';
            const cleanPassword = (password && typeof password === 'string') ? password.trim() : '';

            if (!cleanPassword || cleanPassword.length < 6) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'A senha deve conter no mínimo 6 caracteres.' }));
              return;
            }

            if (!cleanEmail && !cleanId) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'Identificador ou e-mail do colaborador é obrigatório.' }));
              return;
            }

            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(supabaseUrl, supabaseKey, {
              auth: { autoRefreshToken: false, persistSession: false }
            });

            // 1. Localiza colaborador por e-mail ou por ID
            let collabRecord: any = null;
            if (cleanEmail) {
              const { data: byEmail } = await supabase
                .from('collaborators')
                .select('*')
                .ilike('email', cleanEmail)
                .limit(1);
              if (byEmail && byEmail.length > 0) collabRecord = byEmail[0];
            }

            if (!collabRecord && cleanId) {
              const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
              if (isUuid) {
                const { data: byId } = await supabase
                  .from('collaborators')
                  .select('*')
                  .eq('id', cleanId)
                  .limit(1);
                if (byId && byId.length > 0) collabRecord = byId[0];
              }
            }

            if (!collabRecord) {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'Colaborador não encontrado na base de dados.' }));
              return;
            }

            if (collabRecord.active === false) {
              res.statusCode = 403;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'Esta conta de colaborador foi desativada pela gerência.' }));
              return;
            }

            const effectiveEmail = (collabRecord.email || cleanEmail).trim().toLowerCase();

            // 2. Atualiza ou cria usuário no Auth
            try {
              const { data: listData } = await supabase.auth.admin.listUsers();
              const existingAuthUser = listData?.users?.find((u: any) => u.email?.toLowerCase() === effectiveEmail);
              if (existingAuthUser) {
                await supabase.auth.admin.updateUserById(existingAuthUser.id, {
                  password: cleanPassword,
                  email_confirm: true,
                  user_metadata: {
                    name: collabRecord.name,
                    role: collabRecord.role,
                    master_id: collabRecord.master_id,
                  }
                });
              } else {
                await supabase.auth.admin.createUser({
                  email: effectiveEmail,
                  password: cleanPassword,
                  email_confirm: true,
                  user_metadata: {
                    name: collabRecord.name,
                    role: collabRecord.role,
                    master_id: collabRecord.master_id,
                  }
                });
              }
            } catch (authErr) {
              console.warn('[vite-activate] Erro auth:', authErr);
            }

            // 3. Atualiza tabela collaborators
            const nowIso = new Date().toISOString();
            await supabase.from('collaborators').update({
              password: cleanPassword,
              is_first_access: false,
              active: true,
              activated_at: nowIso,
              last_login_at: nowIso,
              updated_at: nowIso,
            }).eq('id', collabRecord.id);

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({
              success: true,
              message: 'Conta ativada com sucesso!',
              email: effectiveEmail,
              collabId: collabRecord.id,
              name: collabRecord.name,
              role: collabRecord.role,
            }));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err.message || 'Erro interno' }));
          }
        });
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), r2DevUploadPlugin(), inviteDevPlugin(), r2ImageProxyPlugin(), activateDevPlugin()],
});
