import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

function r2DevUploadPlugin() {
  return {
    name: 'r2-dev-upload-middleware',
    configureServer(server: any) {
      server.middlewares.use('/api/upload', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        const env = loadEnv('development', process.cwd(), '');
        const accountId = env.CLOUDFLARE_R2_ACCOUNT_ID || process.env.CLOUDFLARE_R2_ACCOUNT_ID;
        const accessKeyId = env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
        const secretAccessKey = env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
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
            const key = customKey ? `${folder}/${customKey}` : `${folder}/${timestamp}_${randomHex}.${ext}`;

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
            const { email, name, role, invitedByName, redirectTo } = JSON.parse(body || '{}');
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

            // Tenta signUp
            const tempPassword = 'Bonomo_' + Math.random().toString(36).slice(-8) + '!';
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email: cleanEmail,
              password: tempPassword,
              options: {
                data: { name, invited_by: invitedByName, role: role || 'sdr' },
                emailRedirectTo: finalRedirectTo,
              }
            });

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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), r2DevUploadPlugin(), inviteDevPlugin()],
});
