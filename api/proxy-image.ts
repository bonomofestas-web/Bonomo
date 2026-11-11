import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const targetUrl = typeof req.query.url === 'string' ? req.query.url : '';
    if (!targetUrl || (!targetUrl.startsWith('https://') && !targetUrl.startsWith('http://'))) {
      return res.status(400).json({ error: 'Invalid or missing url parameter' });
    }

    const remoteRes = await fetch(targetUrl);
    if (!remoteRes.ok) {
      return res.status(remoteRes.status).json({ error: 'Remote image fetch failed' });
    }

    const contentType = remoteRes.headers.get('content-type') || 'image/png';
    const arrayBuffer = await remoteRes.arrayBuffer();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    console.error('[Proxy Image Error]:', err);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ error: err?.message || 'Proxy error' });
  }
}

