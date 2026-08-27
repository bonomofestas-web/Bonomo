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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), r2DevUploadPlugin()],
});
