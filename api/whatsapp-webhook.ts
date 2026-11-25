import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Política de armazenamento de mídia (R2 Free: 10 GB) ───────────────────────
// Mantenha em sincronia com src/utils/mediaStoragePolicy.ts (funções serverless não importam de src/).
const MB = 1024 * 1024;
const AUTO_UPLOAD_MAX_BYTES: Record<string, number> = { image: 100 * MB, video: 200 * MB, audio: 100 * MB, document: 100 * MB, other: 100 * MB };
const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm', 'video/3gpp': '3gp',
  'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/aac': 'aac',
  'application/pdf': 'pdf', 'application/zip': 'zip', 'text/plain': 'txt',
};

function mediaKindOf(mediaType: string, mimetype?: string): string {
  const t = (mediaType || '').toLowerCase();
  const m = (mimetype || '').toLowerCase();
  if (t === 'image' || m.startsWith('image/')) return 'image';
  if (t === 'video' || m.startsWith('video/')) return 'video';
  if (t === 'audio' || m.startsWith('audio/')) return 'audio';
  if (t === 'document' || m.startsWith('application/') || m.startsWith('text/')) return 'document';
  return 'other';
}

interface WebhookMediaContext {
  activityId: string;
  leadId: string;
  masterId?: string | null;
  venueId?: string | null;
  sourceId?: string;
  instanceToken?: string;
  baseUrl?: string;
  /** ids da UAZAPI em ordem de preferência (completo owner:messageid, depois curto) */
  messageIds: string[];
  mediaType: string;
  storedText: string;
  /** false = histórico: não baixa agora (fica pendente para a tela de migração/usuário decidir) */
  ingestNow: boolean;
}

/**
 * Aplica a política de peso: mídia leve vai para o R2 imediatamente (mesmo com o navegador fechado);
 * pesada ou com falha fica "pendente" com peso/motivo. Sempre registra em whatsapp_media e nunca derruba o webhook.
 */
async function handleWebhookMedia(ctx: WebhookMediaContext): Promise<void> {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID || '';
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '';
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || '';
  const publicUrl = (process.env.CLOUDFLARE_R2_PUBLIC_URL || '').replace(/\/$/, '');

  let status: 'stored' | 'pending' | 'unavailable' = 'pending';
  let failureReason: string | undefined;
  let sizeBytes: number | undefined;
  let mimetype: string | undefined;
  let fileName: string | undefined;
  let r2Key: string | undefined;
  let finalUrl: string | undefined;

  try {
    const ready = ctx.ingestNow && ctx.instanceToken && ctx.baseUrl && ctx.messageIds.length > 0 && accountId && accessKeyId && secretAccessKey && bucketName && publicUrl;
    if (!ready) {
      failureReason = ctx.ingestNow ? 'config' : 'history_pending';
    } else {
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), 7000);
      try {
        let fileURL = '';
        for (const id of ctx.messageIds) {
          const dl = await fetch(`${ctx.baseUrl}/message/download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', token: ctx.instanceToken! },
            body: JSON.stringify({ id, generate_mp3: true }),
            signal: abort.signal,
          });
          if (dl.ok) {
            const body: any = await dl.json();
            fileURL = body.fileURL || '';
            mimetype = body.mimetype;
            fileName = body.fileName;
            break;
          }
          if (dl.status !== 404 && dl.status !== 400) { failureReason = dl.status >= 500 ? 'server' : 'unknown'; break; }
          failureReason = dl.status === 404 ? 'not_found' : 'no_media';
        }

        if (fileURL) {
          const kind = mediaKindOf(ctx.mediaType, mimetype);
          const head = await fetch(fileURL, { method: 'HEAD', signal: abort.signal }).catch(() => null);
          const len = Number(head?.headers.get('content-length'));
          sizeBytes = Number.isFinite(len) && len > 0 ? len : undefined;
          const limit = AUTO_UPLOAD_MAX_BYTES[kind] ?? AUTO_UPLOAD_MAX_BYTES.other;
          // Peso desconhecido: áudio/documento passam (limite duro abaixo); foto/vídeo esperam decisão
          const unknownHeavy = false; // salva tudo (temporário): peso desconhecido também sobe

          if (unknownHeavy || (sizeBytes !== undefined && sizeBytes > limit)) {
            failureReason = 'heavy';
          } else {
            const file = await fetch(fileURL, { signal: abort.signal });
            if (!file.ok) throw new Error(`HTTP ${file.status}`);
            const buf = Buffer.from(await file.arrayBuffer());
            if (buf.length > limit) {
              sizeBytes = buf.length;
              failureReason = 'heavy';
            } else {
              sizeBytes = buf.length;
              const ext = MIME_EXT[(mimetype || '').split(';')[0].toLowerCase()] || 'bin';
              const safeId = ctx.messageIds[0].replace(/[^A-Za-z0-9_-]/g, '_');
              const ym = new Date().toISOString().slice(0, 7);
              r2Key = `whatsapp/${ctx.sourceId || 'default'}/${ym}/${safeId}_${Date.now()}.${ext}`;
              const s3 = new S3Client({
                region: 'auto',
                endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
                credentials: { accessKeyId, secretAccessKey },
              });
              await s3.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: r2Key,
                Body: buf,
                ContentType: mimetype || 'application/octet-stream',
              }));
              finalUrl = `${publicUrl}/${r2Key}`;
              status = 'stored';
            }
          }
        } else if (!failureReason) {
          failureReason = 'no_media';
        }
      } finally {
        clearTimeout(timer);
      }
    }
  } catch (err: any) {
    failureReason = err?.name === 'AbortError' ? 'timeout' : 'network';
    console.warn('[Webhook][media] falha ao ingerir mídia:', err?.message || err);
  }

  // Atualiza a atividade: R2 substitui o link temporário; senão fica marcada para download manual com peso/motivo
  try {
    const { data: row } = await supabase.from('lead_activities').select('metadata, text').eq('id', ctx.activityId).maybeSingle();
    const meta = { ...((row?.metadata as any) || {}) };
    let text = row?.text ?? ctx.storedText;
    if (status === 'stored' && finalUrl) {
      text = String(text).replace(/^\[media:[^\]]*\]/, `[media:${finalUrl}|${ctx.mediaType}]`);
      meta.needsManualDownload = false;
      meta.permanentR2Url = finalUrl;
    } else {
      meta.needsManualDownload = true;
      if (sizeBytes) meta.mediaSizeBytes = sizeBytes;
      if (failureReason && failureReason !== 'heavy' && failureReason !== 'history_pending') meta.mediaError = failureReason;
    }
    meta.mediaSizeBytes = sizeBytes ?? meta.mediaSizeBytes;
    await supabase.from('lead_activities').update({ metadata: meta, text }).eq('id', ctx.activityId);
  } catch (err) {
    console.warn('[Webhook][media] falha ao atualizar atividade:', err);
  }

  // Registro de controle (whatsapp_media): base do medidor de uso e da limpeza sazonal
  if (ctx.masterId) {
    try {
      const row = {
        master_id: ctx.masterId,
        venue_id: ctx.venueId && /^[0-9a-f-]{36}$/i.test(ctx.venueId) ? ctx.venueId : null,
        source_id: ctx.sourceId || null,
        lead_id: ctx.leadId,
        activity_id: ctx.activityId,
        message_id: ctx.messageIds[ctx.messageIds.length - 1] || null,
        kind: mediaKindOf(ctx.mediaType, mimetype),
        mimetype: mimetype || null,
        file_name: fileName || null,
        size_bytes: sizeBytes ?? null,
        r2_key: r2Key || null,
        public_url: finalUrl || null,
        status,
        failure_reason: status === 'stored' ? null : (failureReason || null),
      };
      const { data: existing } = row.message_id
        ? await supabase.from('whatsapp_media').select('id').eq('master_id', ctx.masterId).eq('message_id', row.message_id).maybeSingle()
        : { data: null as any };
      if (existing?.id) await supabase.from('whatsapp_media').update(row).eq('id', existing.id);
      else await supabase.from('whatsapp_media').insert([row]);
    } catch (err) {
      console.warn('[Webhook][media] falha ao registrar whatsapp_media:', err);
    }
  }
}

function isLidIdentifier(id?: string): boolean {
  if (!id) return false;
  if (typeof id === 'string' && id.includes('@lid')) return true;
  const digits = String(id).replace(/\D/g, '');
  if (!digits) return false;
  if (digits.length >= 14) return true;
  if (digits.length >= 12 && !digits.startsWith('55')) return true;
  return false;
}

function extractRealWhatsAppPhone(msg: any, payload?: any): string {
  const candidates: any[] = [
    msg?.chatid,
    msg?.wa_chatid,
    msg?.chatId,
    msg?.chat,
    payload?.chatid,
    payload?.wa_chatid,
    payload?.chatId,
    msg?.key?.participantPn,
    msg?.key?.remoteJidPn,
    msg?.participantPn,
    msg?.remoteJidPn,
    msg?.senderPhone,
    msg?.phone,
    payload?.phone,
    payload?.senderPhone,
    payload?.sender_phone,
    msg?.sender_phone,
    msg?.sender,
    msg?.from,
    msg?.key?.participant,
    msg?.participant,
    msg?.author,
    payload?.sender,
    payload?.from,
    msg?.key?.remoteJid,
    msg?.remoteJid,
  ];

  for (const c of candidates) {
    if (!c || typeof c !== 'string') continue;
    if (c.includes('@lid')) continue;
    const withoutDevice = c.replace(/:\d+@/, '@');
    const clean = withoutDevice.replace(/@.*$/, '').replace(/\D/g, '');
    if (clean.length >= 10 && clean.length <= 13 && !isLidIdentifier(clean)) {
      return clean;
    }
  }

  for (const c of candidates) {
    if (!c || typeof c !== 'string') continue;
    if (c.includes('@lid')) continue;
    const clean = c.replace(/:\d+@/, '@').replace(/@.*$/, '').replace(/\D/g, '');
    if (clean.length >= 8 && clean.length <= 14 && !isLidIdentifier(clean)) {
      return clean;
    }
  }

  for (const c of candidates) {
    if (!c || typeof c !== 'string') continue;
    const clean = c.replace(/:\d+@/, '@').replace(/@.*$/, '').replace(/\D/g, '');
    if (clean.length >= 8) {
      return clean;
    }
  }

  return '';
}

function extractSenderName(msg: any, payload?: any): string {
  const candidates = [
    msg?.pushName,
    msg?.notifyName,
    msg?.verifiedBizName,
    msg?.senderName,
    msg?.name,
    payload?.pushName,
    payload?.notifyName,
    payload?.verifiedBizName,
    payload?.senderName,
    payload?.name,
    msg?.key?.pushName,
    msg?.authorName,
  ];

  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) {
      const trimmed = c.trim();
      if (!/^\d+$/.test(trimmed) && !trimmed.includes('@')) {
        return trimmed;
      }
    }
  }
  return '';
}

// Prévia curta da última mensagem para a lista lateral (mídia vira marcador legível pelo front)
function lastMessagePreview(text: string, mediaUrl?: string, mediaType?: string): string {
  const label: Record<string, string> = { image: '[Foto]', video: '[Vídeo]', audio: '[Áudio]', document: '[Documento]', vcard: '[Contato]' };
  const base = (text || '').trim();
  const prefix = mediaUrl ? (label[mediaType || ''] || '[Documento]') : (mediaType === 'vcard' ? '[Contato]' : '');
  return `${prefix} ${base}`.trim().slice(0, 200);
}

// ── Pausa geral de mensagens (chave remota `whatsapp_messaging` em system_feature_flags) ──
// Cache curto em memoria para nao consultar o banco a cada evento (cota do Supabase).
let pauseCache = { paused: false, at: 0 };
async function isMessagingPausedServer(): Promise<boolean> {
  if (Date.now() - pauseCache.at < 15_000) return pauseCache.paused;
  try {
    const { data, error } = await supabase
      .from('system_feature_flags')
      .select('status')
      .eq('feature_id', 'whatsapp_messaging')
      .maybeSingle();
    if (!error) pauseCache = { paused: data?.status === 'disabled' || data?.status === 'coming_soon', at: Date.now() };
    else pauseCache = { ...pauseCache, at: Date.now() };
  } catch {
    pauseCache = { ...pauseCache, at: Date.now() };
  }
  return pauseCache.paused;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, token, admintoken');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ status: 'active', message: 'F5 System UAZAPI Webhook Endpoint' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  // 2. Processamento assíncrono antes de encerrar a resposta no serverless
  try {
    const payload = req.body;
    if (!payload) {
      return res.status(200).json({ success: true, empty: true });
    }

    const eventType = (payload.EventType || payload.event || payload.type || '').toString().toLowerCase();
    const instanceToken = payload.token || (req.headers['token'] as string);
    const instanceName = payload.instanceName || payload.instance;

    console.log(`[UAZAPI Webhook] Evento recebido: ${eventType} | Instância: ${instanceName || instanceToken?.substring(0, 8)}`);

    // ── 1. TRATAMENTO DE STATUS DE CONEXÃO (100% REATIVO VIA PUSH - ZERO POLLING) ───
    if (
      eventType === 'connection' || 
      eventType === 'connection.update' || 
      eventType === 'status' || 
      eventType === 'instance.status' ||
      eventType.includes('connection')
    ) {
      const rawStatus = (
        payload.status || 
        payload.state || 
        payload.data?.status || 
        payload.data?.state || 
        payload.event?.state || 
        (payload.connected === true ? 'connected' : payload.connected === false ? 'disconnected' : '')
      );

      const statusNormalized = typeof rawStatus === 'string' ? rawStatus.toLowerCase() : '';
      const isConnected = statusNormalized === 'connected' || statusNormalized === 'open';
      const isDisconnected = statusNormalized === 'disconnected' || statusNormalized === 'close' || statusNormalized === 'hibernated';

      console.log(`[UAZAPI Webhook Connection] Token: ${instanceToken} | Status bruto: ${rawStatus} (Conectado: ${isConnected})`);

      if (instanceToken || instanceName) {
        let query = supabase.from('sources').select('id, configuration, status');
        if (instanceToken) {
          query = query.or(`whatsapp_instance_id.eq.${instanceToken},configuration->>token.eq.${instanceToken},configuration->>instanceToken.eq.${instanceToken}`);
        } else if (instanceName) {
          query = query.eq('name', instanceName);
        }

        const { data: matchedSources, error: findErr } = await query;
        if (!findErr && matchedSources && matchedSources.length > 0) {
          for (const src of matchedSources) {
            const currentConfig = (src.configuration as any) || {};
            const phone = payload.phone || payload.owner || payload.data?.phone || currentConfig.connectedPhone;
            const profileName = payload.profileName || payload.data?.profileName || currentConfig.connectedProfileName;
            const avatar = payload.profilePicUrl || payload.avatar || payload.data?.profilePicUrl || currentConfig.connectedAvatar;

            const updatedConfig = {
              ...currentConfig,
              connectionStatus: isConnected ? 'connected' : (isDisconnected ? 'disconnected' : currentConfig.connectionStatus),
              isConnected: isConnected ? true : (isDisconnected ? false : currentConfig.isConnected),
              ...(phone ? { connectedPhone: String(phone).replace(/\D/g, '') } : {}),
              ...(profileName ? { connectedProfileName: profileName } : {}),
              ...(avatar ? { connectedAvatar: avatar } : {}),
            };

            await supabase
              .from('sources')
              .update({
                configuration: updatedConfig,
                status: isConnected ? 'active' : src.status,
                updated_at: new Date().toISOString(),
              })
              .eq('id', src.id);

            console.log(`[UAZAPI Webhook] Origem ${src.id} atualizada com status: ${updatedConfig.connectionStatus}`);
          }
        }
      }
      return;
    }

    // ── PAUSA GERAL DE MENSAGENS (chave remota whatsapp_messaging) ────────────
    // Conexao/status (acima) continua funcionando; qualquer mensagem e descartada com 200 (nada e gravado).
    if (await isMessagingPausedServer()) {
      console.log(`[UAZAPI Webhook] Mensagens pausadas (whatsapp_messaging). Evento ${eventType} descartado.`);
      return res.status(200).json({ success: true, paused: true });
    }

    // ── 1.5 HISTÓRICO (sincronização de pareamento / history-sync) ───────────
    // Só mensagens (`event: "messages"`) são importadas; lotes de chats/status apenas registram progresso.
    const isHistory = eventType === 'history';
    if (isHistory && String(payload.event || '').toLowerCase() !== 'messages') {
      console.log(`[Webhook][history] lote ${payload.batchNumber ?? '?'}/${payload.batchTotal ?? '?'} evento=${payload.event} status=${payload.batchHistoryStatus ?? '-'} request=${payload.request_id ?? '-'}`);
      return res.status(200).json({ success: true, history: payload.event || 'ignored' });
    }

    // ── 2. PROCESSAMENTO DE MENSAGENS RECEBIDAS ──────────────────────────────
    if (eventType === 'messages' || eventType === 'messages.upsert' || !eventType || isHistory) {
      const messagesList = Array.isArray(payload.messages)
        ? payload.messages 
        : Array.isArray(payload.data) 
          ? payload.data 
          : [payload.message || payload];

      for (const msg of messagesList) {
        if (!msg) continue;

        // REGRA DE OURO: Ignora mensagens originadas pela própria API para não duplicar
        if (msg.wasSentByApi === true || payload.wasSentByApi === true) continue;

        // Verifica se foi enviado externamente pelo celular/WhatsApp Web (fromMe: true)
        const isFromMe = Boolean(
          msg.fromMe === true || msg.fromMe === 'true' || msg.fromMe === 1 ||
          msg.key?.fromMe === true || msg.key?.fromMe === 'true' || msg.key?.fromMe === 1 ||
          payload.fromMe === true || payload.fromMe === 'true' || payload.fromMe === 1 ||
          payload.key?.fromMe === true || payload.key?.fromMe === 'true' || payload.key?.fromMe === 1 ||
          msg.direction === 'outgoing' || msg.direction === 'outbound' ||
          payload.direction === 'outgoing' || payload.direction === 'outbound' ||
          msg.sender === 'me' || msg.source === 'fromMe' ||
          payload.event === 'message.sent' || payload.event === 'messages.sent'
        );

        // Detecta se a mensagem foi encaminhada (mensagem de terceiro repassada pelo contato)
        const isForwarded = Boolean(
          msg.isForwarded === true || msg.isForwarded === 'true' ||
          msg.contextInfo?.isForwarded === true || msg.contextInfo?.isForwarded === 'true' ||
          msg.content?.contextInfo?.isForwarded === true || msg.content?.contextInfo?.isForwarded === 'true' ||
          msg.message?.extendedTextMessage?.contextInfo?.isForwarded === true ||
          msg.message?.imageMessage?.contextInfo?.isForwarded === true ||
          msg.message?.videoMessage?.contextInfo?.isForwarded === true ||
          msg.message?.documentMessage?.contextInfo?.isForwarded === true
        );

        // REGRA CRÍTICA: Ignora mensagens de grupos (@g.us), canais (@newsletter) e status broadcast
        const remoteJid = msg.key?.remoteJid || msg.remoteJid || msg.from || msg.to || msg.chat || msg.chatid || '';
        const isGroup = msg.isGroup === true || payload.isGroup === true || remoteJid.includes('@g.us') || remoteJid.includes('@newsletter') || remoteJid.includes('@broadcast') || remoteJid === 'status@broadcast';
        if (isGroup) continue;

        // Extrai telefone: se fromMe=true pega destinatário (chatid/to), se false pega remetente
        let cleanPhone = '';
        if (isFromMe) {
          const rawChat = msg.chatid || msg.chatId || msg.to || msg.recipient || remoteJid || '';
          cleanPhone = rawChat.replace(/:\d+.*$/, '').replace(/:\d+@/, '@').replace(/@.*$/, '').replace(/\D/g, '');
        } else {
          cleanPhone = extractRealWhatsAppPhone(msg, payload);
          if (!cleanPhone && remoteJid) {
            cleanPhone = remoteJid.replace(/:\d+.*$/, '').replace(/:\d+@/, '@').replace(/@.*$/, '').replace(/\D/g, '');
          }
        }

        if (!cleanPhone || cleanPhone.length < 8) continue;

        const senderName = isFromMe ? 'WhatsApp App / Web' : (extractSenderName(msg, payload) || 'Cliente (WhatsApp)');

        // Extrai conteúdo do texto e mídias
        let text = '';
        let mediaUrl = msg.fileURL || msg.mediaUrl || msg.file || payload?.fileURL || payload?.mediaUrl || undefined;
        let mediaType = 'text';
        let vcardData: { contactName: string; contactPhone: string; vcard?: string } | null = null;

        const rawMime = String(msg.mimetype || msg.mime || payload?.mimetype || payload?.mime || '').toLowerCase();
        const msgType = String(msg.messageType || msg.type || payload?.messageType || '').toLowerCase();
        if (msgType.includes('image') || rawMime.startsWith('image/')) {
          mediaType = 'image';
          text = msg.text || msg.caption || '📷 Foto';
        } else if (msgType.includes('video') || msgType.includes('ptv') || rawMime.startsWith('video/')) {
          mediaType = 'video';
          text = msg.text || msg.caption || '🎥 Vídeo';
        } else if (msgType.includes('audio') || msgType.includes('myaudio') || msgType.includes('ptt') || msgType.includes('voice') || rawMime.startsWith('audio/')) {
          mediaType = 'audio';
          text = '🎵 Mensagem de voz';
        } else if (msgType.includes('document') || rawMime.startsWith('application/') || rawMime.startsWith('text/')) {
          mediaType = 'document';
          text = msg.fileName ? `📄 Documento: ${msg.fileName}` : (msg.text || '📄 Documento');
        } else if (msgType.includes('sticker')) {
          mediaType = 'image';
          text = '✨ Figurinha';
        } else if (
          msgType.includes('contact') || msgType.includes('vcard') ||
          Boolean(msg.content?.displayName || msg.content?.vcard || msg.message?.contactMessage || msg.message?.contactsArrayMessage) ||
          (typeof msg.text === 'string' && (msg.text.includes('BEGIN:VCARD') || /(?:^|\n)(?:Phone|Telefone|Tel|Celular)(?:\s*\([^)]*\))?\s*:\s*\+?\d+/i.test(msg.text)))
        ) {
          mediaType = 'vcard';
          const cm = msg.content || msg.message?.contactMessage || msg.message?.contactsArrayMessage?.contacts?.[0] || msg;
          const rawVcard = cm?.vcard || msg.vcard || (typeof msg.text === 'string' && msg.text.includes('BEGIN:VCARD') ? msg.text : '');
          let cName = cm?.displayName || cm?.name || msg.contactName || '';
          let cPhone = (cm?.phone || cm?.phoneNumber || msg.contactPhone || msg.phone || '').replace(/\D/g, '');

          if (rawVcard) {
            if (!cName) cName = rawVcard.match(/FN:(.+)/i)?.[1]?.trim() || '';
            if (!cPhone) {
              const waid = rawVcard.match(/waid=(\d+)/i)?.[1];
              const tel = rawVcard.match(/TEL[^:]*:(.+)/i)?.[1]?.replace(/\D/g, '');
              cPhone = waid || tel || '';
            }
          }

          if (!cName || !cPhone) {
            const rawT = typeof msg.text === 'string' ? msg.text : '';
            const phoneLabelRegex = /(?:^|\n)(?:Phone|Telefone|Tel|Celular)(?:\s*\([^)]*\))?\s*:\s*(\+?\d[\d\s-]*\d|\d+)/i;
            const pMatch = rawT.match(phoneLabelRegex);
            if (pMatch && !cPhone) cPhone = pMatch[1].replace(/\D/g, '');
            if (!cName && rawT) {
              const lines = rawT.split('\n').map((l: string) => l.trim()).filter(Boolean);
              cName = lines.find((l: string) => !phoneLabelRegex.test(l) && !l.toLowerCase().startsWith('phone') && !l.toLowerCase().startsWith('tel')) || '';
            }
          }

          cName = cName || 'Contato';
          text = `Contato: ${cName}${cPhone ? ` (${cPhone})` : ''}`;
          vcardData = { contactName: cName, contactPhone: cPhone, vcard: rawVcard };
        }

        // Se o texto vier como JSON em string contendo URL/caption da UAZAPI
        const candidateRaw = typeof msg.text === 'string' ? msg.text : typeof msg.body === 'string' ? msg.body : typeof msg.content === 'string' ? msg.content : '';
        if (candidateRaw && candidateRaw.startsWith('{') && (candidateRaw.includes('URL') || candidateRaw.includes('mimetype') || candidateRaw.includes('caption'))) {
          try {
            const parsed = JSON.parse(candidateRaw);
            const foundUrl = parsed.URL || parsed.url || parsed.fileURL || parsed.mediaUrl;
            if (foundUrl) mediaUrl = foundUrl;
            const parsedMime = String(parsed.mimetype || parsed.mime || '').toLowerCase();
            if (parsedMime.includes('image') || candidateRaw.includes('imageMessage')) mediaType = 'image';
            else if (parsedMime.includes('video') || candidateRaw.includes('videoMessage')) mediaType = 'video';
            else if (parsedMime.includes('audio') || candidateRaw.includes('audioMessage')) mediaType = 'audio';
            else if (parsedMime.includes('document') || candidateRaw.includes('documentMessage')) mediaType = 'document';
            if (parsed.caption) text = parsed.caption;
            else if (parsed.text) text = parsed.text;
          } catch {
            // mantém candidateRaw se não for JSON válido
          }
        }

        if (typeof msg.text === 'string' && msg.text.trim() && mediaType !== 'vcard') {
          text = msg.text;
        } else if (typeof msg.body === 'string' && msg.body.trim()) {
          text = msg.body;
        } else if (typeof msg.content === 'string' && msg.content.trim()) {
          text = msg.content;
        } else if (typeof msg.conversation === 'string' && msg.conversation.trim()) {
          text = msg.conversation;
        } else if (msg.message) {
          const m = msg.message;
          if (typeof m === 'string') text = m;
          else if (m.conversation) text = m.conversation;
          else if (m.extendedTextMessage?.text) text = m.extendedTextMessage.text;
          else if (m.imageMessage) {
            mediaType = 'image';
            text = m.imageMessage.caption || text || '📷 Foto';
            mediaUrl = mediaUrl || m.imageMessage.url;
          } else if (m.videoMessage) {
            mediaType = 'video';
            const isGif = m.videoMessage.gifPlayback === true;
            text = m.videoMessage.caption || text || (isGif ? '🎬 GIF' : '🎥 Vídeo');
            mediaUrl = mediaUrl || m.videoMessage.url;
          } else if (m.audioMessage) {
            mediaType = 'audio';
            text = text || '🎵 Mensagem de voz';
            mediaUrl = mediaUrl || m.audioMessage.url;
          } else if (m.documentMessage) {
            mediaType = 'document';
            text = m.documentMessage.fileName ? `📄 Documento: ${m.documentMessage.fileName}` : (text || '📄 Documento');
            mediaUrl = mediaUrl || m.documentMessage.url;
          } else if (m.stickerMessage) {
            mediaType = 'image';
            text = text || '✨ Figurinha';
            mediaUrl = mediaUrl || m.stickerMessage.url;
          } else if (m.contactMessage) {
            mediaType = 'vcard';
            const v = m.contactMessage;
            const cName = v.displayName || v.vcard?.match(/FN:(.+)/i)?.[1]?.trim() || 'Contato';
            const cPhone = v.vcard?.match(/waid=(\d+)/i)?.[1] || v.vcard?.match(/TEL[^:]*:(.+)/i)?.[1]?.replace(/\D/g, '') || '';
            text = `👤 Contato: ${cName}${cPhone ? ` (${cPhone})` : ''}`;
            vcardData = { contactName: cName, contactPhone: cPhone, vcard: v.vcard };
          } else if (m.contactsArrayMessage) {
            mediaType = 'vcard';
            const first = m.contactsArrayMessage.contacts?.[0];
            const cName = first?.displayName || first?.vcard?.match(/FN:(.+)/i)?.[1]?.trim() || 'Contato';
            const cPhone = first?.vcard?.match(/waid=(\d+)/i)?.[1] || first?.vcard?.match(/TEL[^:]*:(.+)/i)?.[1]?.replace(/\D/g, '') || '';
            text = `👤 Contato: ${cName}${cPhone ? ` (${cPhone})` : ''}`;
            vcardData = { contactName: cName, contactPhone: cPhone, vcard: first?.vcard };
          } else if (m.viewOnceMessage?.message) {
            const vo = m.viewOnceMessage.message;
            if (vo.imageMessage) {
              mediaType = 'image';
              text = vo.imageMessage.caption || text || '📷 Foto';
              mediaUrl = mediaUrl || vo.imageMessage.url;
            } else if (vo.videoMessage) {
              mediaType = 'video';
              text = vo.videoMessage.caption || text || '🎥 Vídeo';
              mediaUrl = mediaUrl || vo.videoMessage.url;
            }
          } else if (m.viewOnceMessageV2?.message) {
            const vo = m.viewOnceMessageV2.message;
            if (vo.imageMessage) {
              mediaType = 'image';
              text = vo.imageMessage.caption || text || '📷 Foto';
              mediaUrl = mediaUrl || vo.imageMessage.url;
            } else if (vo.videoMessage) {
              mediaType = 'video';
              text = vo.videoMessage.caption || text || '🎥 Vídeo';
              mediaUrl = mediaUrl || vo.videoMessage.url;
            }
          } else if (m.ephemeralMessage?.message) {
            const eph = m.ephemeralMessage.message;
            if (eph.conversation) text = eph.conversation;
            else if (eph.extendedTextMessage?.text) text = eph.extendedTextMessage.text;
          }
        }

        // Se ainda não tiver texto, verifica nos campos de nível superior do payload
        if (!text) {
          if (typeof payload?.text === 'string' && payload.text.trim()) text = payload.text;
          else if (typeof payload?.body === 'string' && payload.body.trim()) text = payload.body;
          else if (typeof payload?.content === 'string' && payload.content.trim()) text = payload.content;
          else if (typeof payload?.data?.text === 'string' && payload.data.text.trim()) text = payload.data.text;
          else if (typeof payload?.data?.body === 'string' && payload.data.body.trim()) text = payload.data.body;
          else if (typeof payload?.data?.content === 'string' && payload.data.content.trim()) text = payload.data.content;
          else if (typeof payload?.data?.message?.conversation === 'string') text = payload.data.message.conversation;
          else if (typeof payload?.data?.message?.extendedTextMessage?.text === 'string') text = payload.data.message.extendedTextMessage.text;
        }

        if (!vcardData && (payload.contact || msg.contact || payload.type === 'contact')) {
          const c = payload.contact || msg.contact || payload;
          const cName = c.name || c.contactName || c.displayName || 'Contato';
          const cPhone = (c.phone || c.phoneNumber || c.contactPhone || '').replace(/\D/g, '');
          if (cName || cPhone) {
            mediaType = 'vcard';
            text = `👤 Contato: ${cName}${cPhone ? ` (${cPhone})` : ''}`;
            vcardData = { contactName: cName, contactPhone: cPhone, vcard: c.vcard };
          }
        }

        // Se tiver mídia mas o tipo for texto, resolve por extensão da URL
        if (mediaUrl && mediaType === 'text') {
          const lowerUrl = mediaUrl.toLowerCase();
          if (/\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(lowerUrl)) {
            mediaType = 'image';
          } else if (/\.(mp4|mov|avi|webm)(\?.*)?$/i.test(lowerUrl)) {
            mediaType = 'video';
          } else if (/\.(pdf|docx?|xlsx?|pptx?|txt|zip)(\?.*)?$/i.test(lowerUrl)) {
            mediaType = 'document';
          } else if (/\.(ogg|mp3|opus|wav|m4a|aac)(\?.*)?$/i.test(lowerUrl)) {
            mediaType = 'audio';
          }
        }

        // Se tiver mídia mas nenhum texto foi extraído, define rótulo descritivo
        if (!text && mediaUrl) {
          if (mediaType === 'audio') text = '🎵 Mensagem de voz';
          else if (mediaType === 'image') text = '📷 Foto';
          else if (mediaType === 'video') text = '🎥 Vídeo';
          else if (mediaType === 'document') text = '📄 Documento';
          else text = '📎 Arquivo de mídia';
        }

        if (!text && !mediaUrl) continue;

        // 1. Busca a Origem associada à instância
        let matchedSource: any = null;
        const candidateToken = (instanceToken || '').trim();
        const candidateInstanceName = (instanceName || '').trim();
        const candidateOwner = (payload.owner || payload.phone || payload.connectedPhone || payload.fromMePhone || '').replace(/\D/g, '');

        if (candidateToken) {
          const { data: srcs } = await supabase
            .from('sources')
            .select('*')
            .or(`whatsapp_instance_id.eq.${candidateToken},configuration->>token.eq.${candidateToken},configuration->>instanceToken.eq.${candidateToken},configuration->>instanceKey.eq.${candidateToken}`)
            .order('created_at', { ascending: true })
            .limit(10);
          // Prioridade: token canônico (whatsapp_instance_id, gravado ao conectar) > origem ativa > mais antiga.
          // Token velho esquecido em `configuration` de outra origem não pode desviar a mensagem para outro funil.
          const list = srcs || [];
          matchedSource =
            list.find((s: any) => s.whatsapp_instance_id === candidateToken && s.status === 'active') ||
            list.find((s: any) => s.whatsapp_instance_id === candidateToken) ||
            list.find((s: any) => s.status === 'active') ||
            list[0] || null;
          if (list.length > 1) {
            console.warn(`[Webhook] ${list.length} origens com o mesmo token (***${candidateToken.slice(-4)}): ${list.map((s: any) => s.id).join(', ')}. Usando ${matchedSource?.id}.`);
          }
        }

        if (!matchedSource && candidateOwner) {
          const { data: srcs } = await supabase
            .from('sources')
            .select('*')
            .or(`whatsapp_instance_id.eq.${candidateOwner},configuration->>connectedPhone.eq.${candidateOwner}`)
            .order('created_at', { ascending: true })
            .limit(1);
          matchedSource = srcs?.[0] || null;
        }

        if (!matchedSource && candidateInstanceName) {
          const { data: srcs } = await supabase
            .from('sources')
            .select('*')
            .eq('type', 'whatsapp_api')
            .order('created_at', { ascending: true });
          const normName = candidateInstanceName.toLowerCase().trim();
          const nameMatches = (srcs || []).filter((s: any) =>
            s.whatsapp_instance_id === candidateInstanceName ||
            (s.configuration?.instanceName && String(s.configuration.instanceName).toLowerCase().trim() === normName) ||
            (s.name && String(s.name).toLowerCase().trim() === normName) ||
            (s.whatsapp_instance_id && s.whatsapp_instance_id.toLowerCase().trim() === normName) ||
            (candidateOwner && (s.configuration?.connectedPhone || '').replace(/\D/g, '') === candidateOwner)
          );
          // Isolamento: nome que casa com origens de Masters DIFERENTES nao roteia. Mesmo Master (varias casas): mantem o comportamento anterior (primeira origem).
          if (nameMatches.length === 1) {
            matchedSource = nameMatches[0];
          } else if (nameMatches.length > 1) {
            const venueIds = Array.from(new Set(nameMatches.map((s: any) => s.venue_id).filter(Boolean)));
            const { data: vRows } = venueIds.length
              ? await supabase.from('venues').select('id, master_id').in('id', venueIds)
              : { data: [] as any[] };
            const masters = new Set((vRows || []).map((v: any) => v.master_id).filter(Boolean));
            if (masters.size <= 1) {
              matchedSource = nameMatches[0];
            } else {
              console.warn(`[Webhook] instanceName "${candidateInstanceName}" casa com origens de ${masters.size} Masters. Ignorado por seguranca.`);
            }
          }
        }

        // Instância sem origem cadastrada: ignora. Nunca busca nem cria lead "no sistema inteiro" (isolamento por Master).
        if (!matchedSource) {
          console.warn(`[Webhook] Mensagem de instância sem origem cadastrada (token ${candidateToken ? '***' + candidateToken.slice(-4) : 'ausente'}, instanceName "${candidateInstanceName}"). Ignorada.`);
          continue;
        }

        // DEDUPLICAÇÃO DE MENSAGEM: o mesmo wamid só é duplicata se já foi gravado POR ESTA MESMA ORIGEM/INSTÂNCIA.
        // Nunca descarta mensagem só porque o contato é lead em outro funil.
        const waMessageId = msg.key?.id || msg.id || msg.messageid || payload?.messageId || payload?.id;
        if (waMessageId) {
          const { data: dupRows } = await supabase
            .from('lead_activities')
            .select('id, lead_id, metadata')
            .or(`metadata->>messageId.eq.${waMessageId},metadata->>message_id.eq.${waMessageId}`)
            .limit(5);
          const isDup = (dupRows || []).some((r: any) => {
            const srcId = r?.metadata?.senderSourceId;
            return !matchedSource?.id || !srcId || srcId === matchedSource.id;
          });
          if (isDup) {
            console.log(`[Webhook Deduplicação] Mensagem ${waMessageId} já gravada para esta origem. Ignorando duplicata.`);
            continue;
          }
        }

        // 2. Identificação do Funil Alvo da Origem (targetFunnelId)
        let targetFunnelId = matchedSource?.funnel_id;
        if (!targetFunnelId && matchedSource?.id) {
          const { data: psFunnels } = await supabase
            .from('commercial_funnels')
            .select('id, post_sale_channels')
            .eq('is_post_sale', true);
          const foundF = (psFunnels || []).find((f: any) =>
            Array.isArray(f.post_sale_channels) && f.post_sale_channels.some((ch: any) => ch.instanceId === matchedSource.id)
          );
          if (foundF) targetFunnelId = foundF.id;
        }

        if (!targetFunnelId) {
          console.warn(`[Webhook] Origem ${matchedSource.name || matchedSource.id} não possui funil associado. Ignorando.`);
          continue;
        }

        const { data: targetFunnelRow } = await supabase
          .from('commercial_funnels')
          .select('id, name, is_post_sale, category, stages, is_entry_stage_active, venue_id, master_id')
          .eq('id', targetFunnelId)
          .maybeSingle();

        const isPostSaleTarget = Boolean(
          targetFunnelRow?.is_post_sale || 
          targetFunnelRow?.category === 'Pós-Venda' || 
          targetFunnelRow?.category === 'pos_venda' || 
          targetFunnelRow?.name?.toLowerCase().includes('pós-venda')
        );

        const targetVenueId = matchedSource?.venue_id || targetFunnelRow?.venue_id;

        // Identifica o tenant (master_id e todas as unidades da rede)
        let tenantMasterId: string | null = null;
        let tenantVenueIds: string[] = targetVenueId ? [targetVenueId] : [];
        if (targetVenueId) {
          const { data: vRow } = await supabase.from('venues').select('master_id').eq('id', targetVenueId).maybeSingle();
          if (vRow?.master_id) {
            tenantMasterId = vRow.master_id;
            const { data: allTenantVenues } = await supabase.from('venues').select('id').eq('master_id', vRow.master_id);
            if (allTenantVenues && allTenantVenues.length > 0) {
              tenantVenueIds = Array.from(new Set([...tenantVenueIds, ...allTenantVenues.map((v: any) => v.id)]));
            }
          }
        }
        if (!tenantMasterId && targetFunnelRow?.master_id) {
          tenantMasterId = targetFunnelRow.master_id;
        }

        // 3. Extração do identificador de telefone / LID
        const isLid = isLidIdentifier(cleanPhone) || cleanPhone.length >= 14 || remoteJid.includes('@lid');
        let existingLead: any = null;
        let resolvedPhone = (!isLid && cleanPhone.length <= 13) ? cleanPhone : '';

        // Se for LID, tenta extrair o telefone real dos campos do payload ou UAZAPI
        if (isLid) {
          if (remoteJid && remoteJid.includes('@s.whatsapp.net')) {
            const p = remoteJid.replace(/:\d+@/, '@').replace(/@.*$/, '').replace(/\D/g, '');
            if (p && p.length >= 10 && p.length <= 13 && !isLidIdentifier(p)) {
              resolvedPhone = p;
            }
          }

          if (!resolvedPhone) {
            const rawExtracted = extractRealWhatsAppPhone(msg, payload);
            if (rawExtracted && !isLidIdentifier(rawExtracted) && rawExtracted.length >= 10 && rawExtracted.length <= 13) {
              resolvedPhone = rawExtracted;
            }
          }

          if (!resolvedPhone) {
            const uazapiUrl = payload.BaseUrl || 'https://f5system.uazapi.com';
            const effectiveToken = candidateToken || matchedSource?.whatsapp_instance_id || (matchedSource?.configuration as any)?.token;
            if (effectiveToken) {
              try {
                const detailsRes = await fetch(`${uazapiUrl}/chat/details`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', token: effectiveToken },
                  body: JSON.stringify({ number: cleanPhone }),
                });
                if (detailsRes.ok) {
                  const dData = await detailsRes.json();
                  const p = dData?.phone || dData?.wa_phone || dData?.number;
                  if (p && !isLidIdentifier(p)) {
                    const cleanP = String(p).replace(/\D/g, '');
                    if (cleanP.length >= 10 && cleanP.length <= 13) {
                      resolvedPhone = cleanP;
                    }
                  }
                }
              } catch (uazErr) {
                console.warn('Erro ao consultar /chat/details na UAZAPI:', uazErr);
              }
            }
          }
        }

        const targetSearchPhone = resolvedPhone || cleanPhone;
        const searchDigits = targetSearchPhone.replace(/\D/g, '');
        const last8 = searchDigits.length >= 8 ? searchDigits.slice(-8) : '';
        const part1 = last8 ? last8.slice(0, 4) : '';
        const part2 = last8 ? last8.slice(4) : '';

        // REGRA DE OURO DO CRM: A existência do contato é verificada ESTRITAMENTE DENTRO DO FUNIL DA ORIGEM!
        // Não busca em outros funis, não reaproveita cards de esteiras diferentes.
        // Se o número não existir NESTE funil, cria-se um lead novo neste funil.

        // 3a. Se for Funil de Pós-Venda, busca primeiro se o cliente já existe NESTE FUNIL
        if (isPostSaleTarget && last8) {
          const { data: matchedClients } = await supabase
            .from('clients')
            .select('id, name, payer_name, payer_phone, stage, venue_id, funnel_id, master_id')
            .eq('funnel_id', targetFunnelId)
            .or(`payer_phone.ilike.%${last8}%,payer_phone.ilike.%${part1}%${part2}%`)
            .limit(1);

          if (matchedClients && matchedClients.length > 0) {
            existingLead = {
              id: matchedClients[0].id,
              name: matchedClients[0].payer_name || matchedClients[0].name || 'Cliente',
              phone: matchedClients[0].payer_phone,
              venue_id: matchedClients[0].venue_id,
              funnel_id: matchedClients[0].funnel_id,
              master_id: matchedClients[0].master_id,
              is_client: true,
            };
          }
        }

        // 3b. Busca na tabela 'leads' ESTRITAMENTE DENTRO DO FUNIL DA ORIGEM
        if (!existingLead && (last8 || isLid)) {
          const leadSelect = 'id, name, phone, unread_count, venue_id, funnel_id, custom_field_values, master_id, is_client, last_message_at, source_id';
          let query = supabase
            .from('leads')
            .select(leadSelect)
            .eq('funnel_id', targetFunnelId);

          if (last8 && isLid) {
            query = query.or(`phone.ilike.%${last8}%,phone.ilike.%${part1}%${part2}%,custom_field_values->>whatsappLid.eq.${cleanPhone},custom_field_values->>whatsapp_lid.eq.${cleanPhone}`);
          } else if (last8) {
            query = query.or(`phone.ilike.%${last8}%,phone.ilike.%${part1}%${part2}%`);
          } else if (isLid) {
            query = query.or(`custom_field_values->>whatsappLid.eq.${cleanPhone},custom_field_values->>whatsapp_lid.eq.${cleanPhone}`);
          }

          const { data: matchedLeads } = await query
            .order('last_interaction_at', { ascending: false, nullsFirst: false })
            .limit(1);

          if (matchedLeads && matchedLeads.length > 0) {
            existingLead = matchedLeads[0];

            // Vincula o LID ao lead encontrado para que as próximas mensagens batam de primeira
            if (isLid && existingLead) {
              const updatedCustom = {
                ...(existingLead.custom_field_values || {}),
                whatsappLid: cleanPhone,
                whatsapp_lid: cleanPhone,
              };
              await supabase.from('leads').update({ custom_field_values: updatedCustom }).eq('id', existingLead.id);
            }
          }
        }

        // 3c. Lead que saiu do funil desta origem para um funil SEM WhatsApp próprio (ex.: follow-up) e continua
        // conversando por esta instância: a mensagem segue o card onde a conversa está, em vez de abrir lead novo.
        // Funil com origem própria continua estrito (mesmo número em funis com origens diferentes não é duplicidade).
        if (!existingLead && tenantMasterId && (last8 || isLid) && matchedSource?.id) {
          let carrierQuery = supabase
            .from('leads')
            .select('id, name, phone, unread_count, venue_id, funnel_id, custom_field_values, master_id, is_client, last_message_at, source_id')
            .eq('master_id', tenantMasterId)
            .neq('funnel_id', targetFunnelId);
          if (last8 && isLid) {
            carrierQuery = carrierQuery.or(`phone.ilike.%${last8}%,custom_field_values->>whatsappLid.eq.${cleanPhone},custom_field_values->>whatsapp_lid.eq.${cleanPhone}`);
          } else if (last8) {
            carrierQuery = carrierQuery.or(`phone.ilike.%${last8}%`);
          } else {
            carrierQuery = carrierQuery.or(`custom_field_values->>whatsappLid.eq.${cleanPhone},custom_field_values->>whatsapp_lid.eq.${cleanPhone}`);
          }
          const { data: carrierCandidates } = await carrierQuery
            .order('last_interaction_at', { ascending: false, nullsFirst: false })
            .limit(20);

          const withFunnel = (carrierCandidates || []).filter((l: any) => l.funnel_id);
          if (withFunnel.length > 0) {
            const candFunnelIds = Array.from(new Set(withFunnel.map((l: any) => l.funnel_id)));
            const { data: originRows } = await supabase
              .from('sources')
              .select('funnel_id')
              .eq('type', 'whatsapp_api')
              .in('funnel_id', candFunnelIds);
            const funnelsWithOrigin = new Set((originRows || []).map((r: any) => r.funnel_id));
            const originless = withFunnel.filter((l: any) => !funnelsWithOrigin.has(l.funnel_id));

            let carrier: any = originless.find((l: any) => l.source_id === matchedSource.id) || null;
            if (!carrier && originless.length > 0) {
              const { data: usedRows } = await supabase
                .from('lead_activities')
                .select('lead_id')
                .in('lead_id', originless.map((l: any) => l.id))
                .or(`metadata->>senderSourceId.eq.${matchedSource.id},metadata->>instanceId.eq.${matchedSource.id},metadata->>sourceId.eq.${matchedSource.id}`)
                .limit(20);
              const usedIds = new Set((usedRows || []).map((r: any) => r.lead_id));
              carrier = originless.find((l: any) => usedIds.has(l.id)) || null;
            }
            if (carrier) {
              existingLead = carrier;
              console.log(`[Webhook] Mensagem roteada para o card ${carrier.id} (funil sem WhatsApp próprio que já conversa por esta origem).`);
            }
          }
        }

        const isAudio = mediaType === 'audio' || (typeof text === 'string' && text.includes('🎵'));

        // SEMPRE a hora REAL da mensagem (ms ou s). So cai no instante do recebimento se a mensagem nao trouxer hora
        // valida (ou vier no futuro). Assim mensagem atrasada/reentregue nao vira "agora" e a conversa nao ganha falsa urgencia.
        const rawMsgTs = Number(msg.messageTimestamp || msg.timestamp || 0);
        const msgTsMs = rawMsgTs > 0 ? (rawMsgTs > 1e11 ? rawMsgTs : rawMsgTs * 1000) : 0;
        const activityIso = (msgTsMs > 0 && msgTsMs <= Date.now() + 5 * 60 * 1000)
          ? new Date(msgTsMs).toISOString()
          : new Date().toISOString();
        // Ids para baixar a mídia depois (completo owner:messageid e curto) e origem do chip (nunca o token)
        const fullWaId = typeof msg.id === 'string' ? msg.id : undefined;
        const shortWaId = msg.messageid || (fullWaId && fullWaId.includes(':') ? fullWaId.split(':').pop() : undefined);
        const waIdsMeta = { waId: fullWaId, shortId: shortWaId, sourceId: matchedSource?.id };
        const mediaMessageIds = [fullWaId, shortWaId, waMessageId].filter((v, i, a) => !!v && a.indexOf(v) === i) as string[];
        const hasMedia = mediaType !== 'text';
        const mediaBaseUrl = String(payload.BaseUrl || process.env.UAZAPI_SERVER_URL || process.env.VITE_UAZAPI_SERVER_URL || '').replace(/\/$/, '');

        if (existingLead) {
          // Atualiza o Lead existente com a nova atividade de mensagem na tabela lead_activities
          let storedText = text.trim();
          if (mediaUrl && !storedText.startsWith('[media:')) {
            storedText = `[media:${mediaUrl}|${mediaType !== 'text' ? mediaType : 'document'}] ${storedText}`.trim();
          }

          // DEDUPLICAÇÃO ESTRITA: Checa por ID único da mensagem do WhatsApp (wamid)
          if (waMessageId) {
            const { data: existingByMsgId } = await supabase
              .from('lead_activities')
              .select('id')
              .eq('lead_id', existingLead.id)
              .or(`metadata->>messageId.eq.${waMessageId},metadata->>message_id.eq.${waMessageId}`)
              .limit(1);

            if (existingByMsgId && existingByMsgId.length > 0) {
              console.log(`[Webhook] Mensagem com messageId ${waMessageId} já gravada no lead ${existingLead.id}, ignorando duplicata.`);
              // A atividade já existe (ex.: gravada pelo navegador antes do eco do webhook), mas o lead
              // ainda precisa refletir hora/direção/prévia da última mensagem.
              const dupPreview = lastMessagePreview(text, mediaUrl, mediaType);
              if (dupPreview && !isHistory) {
                // Eco do webhook: hora REAL da mensagem, e so avanca se for a mais nova
                const dupIso = activityIso;
                if (new Date(dupIso).getTime() >= (new Date(existingLead.last_message_at || 0).getTime() || 0)) {
                  await supabase
                    .from('leads')
                    .update({
                      last_interaction_at: dupIso,
                      last_message_direction: isFromMe ? 'outgoing' : 'incoming',
                      last_message_text: dupPreview,
                      last_message_at: dupIso,
                    })
                    .eq('id', existingLead.id);
                }
              }
              continue;
            }
          } else {
            // Apenas para payloads raros sem waMessageId: deduplicação defensiva rápida
            if (isAudio) {
              const fifteenSecsAgo = new Date(Date.now() - 15000).toISOString();
              const { data: recentAudio } = await supabase
                .from('lead_activities')
                .select('id')
                .eq('lead_id', existingLead.id)
                .gte('timestamp', fifteenSecsAgo)
                .ilike('text', '%🎵%')
                .limit(1);

              if (recentAudio && recentAudio.length > 0) {
                console.log(`[Webhook] Áudio recente sem ID já registrado no lead ${existingLead.id}, ignorando duplicata.`);
                continue;
              }
            }
          }

          const activityId = crypto.randomUUID();
          const previewText = lastMessagePreview(text, mediaUrl, mediaType);
          const newActivityRecord = {
            id: activityId,
            lead_id: existingLead.id,
            timestamp: activityIso,
            type: 'contact',
            title: isFromMe 
              ? (isAudio ? 'Mensagem de voz enviada (Celular/Web)' : mediaType === 'vcard' ? 'Contato enviado (Celular/Web)' : mediaType === 'image' ? 'Foto enviada (Celular/Web)' : mediaType === 'video' ? 'Vídeo enviado (Celular/Web)' : mediaType === 'document' ? 'Documento enviado (Celular/Web)' : 'Mensagem enviada via WhatsApp (Celular/Web)')
              : (isAudio ? 'Mensagem de voz recebida' : mediaType === 'vcard' ? 'Contato compartilhado' : mediaType === 'image' ? 'Foto recebida' : mediaType === 'video' ? 'Vídeo recebido' : mediaType === 'document' ? 'Documento recebido' : 'Mensagem recebida no WhatsApp'),
            text: storedText,
            author_name: isFromMe ? 'WhatsApp App / Web' : (senderName || 'Cliente (WhatsApp)'),
            author_id: null,
            author_avatar_url: isFromMe ? 'whatsapp_brand' : '',
            status: isFromMe ? 'sent' : 'delivered',
            metadata: {
              messageId: waMessageId || undefined,
              ...waIdsMeta,
              senderSourceId: matchedSource?.id,
              fromPhone: resolvedPhone || cleanPhone,
              senderSourceName: matchedSource?.name,
              senderPhone: (matchedSource?.configuration as any)?.connectedPhone || (matchedSource?.configuration as any)?.whatsappNumber,
              senderAvatar: (matchedSource?.configuration as any)?.connectedAvatar || (matchedSource?.configuration as any)?.profilePicUrl,
              ...(isForwarded ? { isForwarded: true } : {}),
              ...(vcardData ? {
                isContactCard: true,
                contactName: vcardData.contactName,
                contactPhone: vcardData.contactPhone,
                vcard: vcardData.vcard,
              } : {}),
              // Preserva o nome original do arquivo de documentos para renderização no frontend
              ...(mediaType === 'document' && (msg.fileName || msg.message?.documentMessage?.fileName) ? {
                fileName: msg.fileName || msg.message?.documentMessage?.fileName,
              } : {}),
            },
          };

          const { error: actErr } = await supabase.from('lead_activities').insert([newActivityRecord]);
          if (actErr) {
            if (actErr.code === '23505' || actErr.message?.includes('duplicate key') || actErr.message?.includes('idx_lead_activities_unique_msg_id')) {
              console.log('[Webhook] Mensagem já processada anteriormente (dedup atômico):', waMessageId || activityId);
            } else {
              console.error('[Webhook] Erro ao inserir lead_activity para lead existente:', actErr);
            }
          } else if (hasMedia) {
            await handleWebhookMedia({
              activityId, leadId: existingLead.id, masterId: existingLead.master_id || tenantMasterId, venueId: existingLead.venue_id,
              sourceId: matchedSource?.id, instanceToken, baseUrl: mediaBaseUrl, messageIds: mediaMessageIds,
              mediaType, storedText, ingestNow: !isHistory,
            });
          }

          // Histórico antigo só grava a mensagem: não mexe em não-lidas, prévia nem horário do lead
          if (isHistory) continue;

          const updatePayload: Record<string, any> = {
            updated_at: new Date().toISOString(),
          };

          // Hora/previa/direcao da conversa so AVANCAM se esta mensagem for a mais nova (hora real da mensagem)
          const prevLastMs = new Date(existingLead.last_message_at || 0).getTime() || 0;
          if (new Date(activityIso).getTime() >= prevLastMs) {
            updatePayload.last_interaction_at = activityIso;
            updatePayload.last_message_direction = isFromMe ? 'outgoing' : 'incoming';
            if (previewText) {
              updatePayload.last_message_text = previewText;
              updatePayload.last_message_at = activityIso;
            }
          }

          if (!isFromMe) {
            updatePayload.unread_count = (existingLead.unread_count || 0) + 1;
          }

          if (matchedSource?.id && !existingLead.source_id) {
            updatePayload.source_id = matchedSource.id;
            updatePayload.source_name = matchedSource.name || 'WhatsApp Oficial';
          }

          if (existingLead.is_client) {
            await supabase
              .from('clients')
              .update({
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingLead.id);
          } else {
            await supabase
              .from('leads')
              .update(updatePayload)
              .eq('id', existingLead.id);
          }
        } else {
          // Histórico de conversas desconhecidas só cria lead quando a origem está em modo migração (configuration.historyImport);
          // caso contrário um pareamento criaria leads de todo o passado sem o usuário revisar.
          if (isHistory && !(matchedSource?.configuration as any)?.historyImport) continue;

          // Cria um novo Lead automaticamente com telefone real na casa da instância do WhatsApp
          const finalPhone = resolvedPhone || cleanPhone;
          const searchDigits = (finalPhone || cleanPhone).replace(/\D/g, '');

          // Dupla checagem defensiva contra concorrência: verifica se algum processo acabou de criar o lead
          if (searchDigits.length >= 8) {
            const last8 = searchDigits.slice(-8);
            let doubleCheckQuery = supabase
              .from('leads')
              .select('id, name, phone, unread_count, venue_id, funnel_id, master_id')
              .or(`phone.ilike.%${last8}%,custom_field_values->>whatsappLid.eq.${searchDigits}`);
            // Concorrência só conta se for no MESMO funil da origem
            if (targetFunnelId) doubleCheckQuery = doubleCheckQuery.eq('funnel_id', targetFunnelId);
            const { data: doubleCheck } = await doubleCheckQuery
              .order('created_at', { ascending: false })
              .limit(1);

            if (doubleCheck && doubleCheck.length > 0) {
              const matchedLead = doubleCheck[0];
              if (!tenantMasterId || !matchedLead.master_id || matchedLead.master_id === tenantMasterId) {
                console.log(`[Webhook] Lead concorrente detectado (${matchedLead.id} - ${matchedLead.name}), vinculando mensagem a ele.`);
                const activityId = crypto.randomUUID();
                // `storedText` só existe no ramo de lead existente: aqui o texto armazenado é montado novamente
                let concStoredText = text.trim();
                if (mediaUrl && !concStoredText.startsWith('[media:')) {
                  concStoredText = `[media:${mediaUrl}|${mediaType !== 'text' ? mediaType : 'document'}] ${concStoredText}`.trim();
                }
                const newActivityRecord = {
                  id: activityId,
                  lead_id: matchedLead.id,
                  timestamp: activityIso,
                  type: 'contact',
                  title: isFromMe 
                    ? (isAudio ? 'Mensagem de voz enviada (Celular/Web)' : mediaType === 'image' ? 'Foto enviada (Celular/Web)' : mediaType === 'video' ? 'Vídeo enviado (Celular/Web)' : mediaType === 'document' ? 'Documento enviado (Celular/Web)' : 'Mensagem enviada via WhatsApp (Celular/Web)')
                    : (isAudio ? 'Mensagem de voz recebida' : mediaType === 'image' ? 'Foto recebida' : mediaType === 'video' ? 'Vídeo recebido' : mediaType === 'document' ? 'Documento recebido' : 'Mensagem recebida no WhatsApp'),
                  text: concStoredText,
                  author_name: isFromMe ? 'WhatsApp App / Web' : (senderName || 'Cliente (WhatsApp)'),
                  author_id: null,
                  author_avatar_url: isFromMe ? 'whatsapp_brand' : '',
                  status: isFromMe ? 'sent' : 'delivered',
                  metadata: {
                    messageId: waMessageId || undefined,
                    ...waIdsMeta,
                    senderSourceId: matchedSource?.id,
                    senderSourceName: matchedSource?.name,
                    senderPhone: (matchedSource?.configuration as any)?.connectedPhone || (matchedSource?.configuration as any)?.whatsappNumber,
                    senderAvatar: (matchedSource?.configuration as any)?.connectedAvatar || (matchedSource?.configuration as any)?.profilePicUrl,
                    ...(isForwarded ? { isForwarded: true } : {}),
                    // Preserva o nome original do arquivo de documentos para renderização no frontend
                    ...(mediaType === 'document' && (msg.fileName || msg.message?.documentMessage?.fileName) ? {
                      fileName: msg.fileName || msg.message?.documentMessage?.fileName,
                    } : {}),
                  },
                };
                const { error: concActErr } = await supabase.from('lead_activities').insert([newActivityRecord]);
                if (concActErr) {
                  if (concActErr.code === '23505' || concActErr.message?.includes('duplicate key') || concActErr.message?.includes('idx_lead_activities_unique_msg_id')) {
                    console.log('[Webhook] Mensagem concorrente já inserida (dedup atômico):', waMessageId || activityId);
                  } else {
                    console.error('[Webhook] Erro ao inserir lead_activity concorrente:', concActErr);
                  }
                } else if (hasMedia) {
                  await handleWebhookMedia({
                    activityId, leadId: matchedLead.id, masterId: matchedLead.master_id || tenantMasterId, venueId: matchedLead.venue_id,
                    sourceId: matchedSource?.id, instanceToken, baseUrl: mediaBaseUrl, messageIds: mediaMessageIds,
                    mediaType, storedText: concStoredText, ingestNow: !isHistory,
                  });
                }
                if (!isHistory) {
                  await supabase.from('leads').update({
                    updated_at: new Date().toISOString(),
                    last_interaction_at: activityIso,
                    last_message_at: activityIso,
                    last_message_direction: isFromMe ? 'outgoing' : 'incoming',
                    last_message_text: lastMessagePreview(text, mediaUrl, mediaType) || null,
                    unread_count: isFromMe ? (matchedLead.unread_count || 0) : (matchedLead.unread_count || 0) + 1,
                  }).eq('id', matchedLead.id);
                }
                continue;
              }
            }
          }

          // Numero fixo do Financeiro nunca abre oportunidade: so conversa com quem ja e cliente/lead conhecido
          if ((matchedSource?.configuration as any)?.role === 'financeiro') continue;

          const leadId = crypto.randomUUID();
          const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
          let randomPart = '';
          for (let i = 0; i < 6; i++) {
            randomPart += alphabet[Math.floor(Math.random() * alphabet.length)];
          }
          const leadCode = `LEAD-${randomPart}`;
          const cleanLeadName = (senderName && senderName !== 'Cliente (WhatsApp)' && senderName !== 'WhatsApp App / Web') ? senderName.trim() : leadCode;
          let venueId = targetVenueId || 'v1';
          let funnelId = targetFunnelId;

          // Localiza o masterId da casa para garantir isolamento por tenant no banco
          let venueMasterId: string | null = tenantMasterId;
          if (!venueMasterId && venueId) {
            const { data: vRow } = await supabase.from('venues').select('master_id').eq('id', venueId).maybeSingle();
            if (vRow?.master_id) venueMasterId = vRow.master_id;
          }

          let creationStoredText = text.trim();
          if (mediaUrl && !creationStoredText.startsWith('[media:')) {
            creationStoredText = `[media:${mediaUrl}|${mediaType !== 'text' ? mediaType : 'document'}] ${creationStoredText}`.trim();
          }
          if (!creationStoredText) {
            creationStoredText = isAudio ? '🎵 Mensagem de voz' : mediaType === 'image' ? '📷 Foto' : mediaType === 'video' ? '🎥 Vídeo' : mediaType === 'document' ? '📄 Documento' : 'Mensagem recebida no WhatsApp';
          }

          const initialNoteText = text.trim() || (isAudio ? 'Mensagem de voz' : 'Mensagem no WhatsApp');

          let targetStage = 'new_lead';
          let isPostSaleTarget = false;
          if (funnelId && funnelId !== 'comercial') {
            const { data: fRow } = await supabase.from('commercial_funnels').select('stages, is_post_sale, category, name, is_entry_stage_active').eq('id', funnelId).maybeSingle();
            if (fRow) {
              isPostSaleTarget = Boolean(
                fRow.is_post_sale || 
                fRow.category === 'Pós-Venda' || 
                fRow.category === 'pos_venda' || 
                fRow.name?.toLowerCase().includes('pós-venda')
              );
              const isEntryActive = fRow.is_entry_stage_active !== false;
              if (fRow.stages && Array.isArray(fRow.stages) && fRow.stages.length > 0) {
                if (isEntryActive) {
                  const hasNewLead = fRow.stages.some((s: any) => s.id === 'new_lead');
                  targetStage = hasNewLead ? 'new_lead' : (fRow.stages[0]?.id || 'in_negotiation');
                } else {
                  // Caixa de Entrada desativada: O lead entra DIRETAMENTE na 1ª etapa disponível
                  const nonEntry = fRow.stages.filter((s: any) => s.id !== 'new_lead' && !String(s.name || '').toLowerCase().includes('entrada'));
                  targetStage = nonEntry[0]?.id || fRow.stages[0]?.id || 'in_negotiation';
                }
              }
            }
          }

          // HERANÇA AUTOMÁTICA DE CONTRATO ENTRE FUNIS:
          // Se o telefone recebido pertence aos contatos/família de um contrato existente no tenant (master):
          // O novo lead herda automaticamente o contrato vinculado e tags de contrato!
          let autoContractId: string | null = null;
          let autoContractTitle: string | null = null;
          let autoContractCode: string | null = null;
          if (finalPhone && venueMasterId) {
            const digits = finalPhone.replace(/\D/g, '').slice(-8);
            if (digits.length >= 8) {
              try {
                const { data: matchedContracts } = await supabase
                  .from('contracts')
                  .select('id, contract_code, contract_title, title, client_snapshot, contacts')
                  .eq('master_id', venueMasterId)
                  .order('created_at', { ascending: false })
                  .limit(200);

                if (matchedContracts && matchedContracts.length > 0) {
                  const found = matchedContracts.find((c: any) => {
                    const snap = c.client_snapshot as any;
                    const snapPhone = (snap?.phone || '').replace(/\D/g, '').slice(-8);
                    if (snapPhone === digits) return true;
                    const cts = c.contacts as any;
                    if (Array.isArray(cts) && cts.some((ct: any) => (ct?.phone || '').replace(/\D/g, '').slice(-8) === digits)) {
                      return true;
                    }
                    return false;
                  });
                  if (found) {
                    autoContractId = found.id;
                    autoContractTitle = found.contract_title || found.title;
                    autoContractCode = found.contract_code;
                  }
                }
              } catch (contractErr: any) {
                console.warn('[Webhook] Erro ao buscar herança de contrato:', contractErr.message);
              }
            }
          }

          // Distribuição Automática (Roleta / Round Robin) do funil comercial na criação pelo webhook
          let assignedSdrId: string | null = null;
          let assignedSdrName: string | null = null;
          let assignedParticipants: any[] = [];
          if (!isPostSaleTarget && funnelId) {
            try {
              const { data: fRow } = await supabase
                .from('commercial_funnels')
                .select('id, distribution_mode, assigned_sdr_ids, round_robin_next_index, venue_distribution_config, duplicate_rule_config')
                .eq('id', funnelId)
                .maybeSingle();
              if (fRow) {
                const venueDistMap = fRow.venue_distribution_config || (fRow.duplicate_rule_config as any)?._venueDistributionConfig || {};
                const venueCfg = venueId ? venueDistMap?.[venueId] : undefined;
                let targetSdrIds: string[] = [];
                let isRoundRobinActive = false;

                if (venueCfg) {
                  if (venueCfg.distributionMode === 'round_robin' && Array.isArray(venueCfg.assignedSdrIds) && venueCfg.assignedSdrIds.length > 0) {
                    targetSdrIds = venueCfg.assignedSdrIds;
                    isRoundRobinActive = true;
                  } else if (venueCfg.distributionMode === 'manual') {
                    isRoundRobinActive = false;
                  }
                }

                if (!isRoundRobinActive && (!venueCfg || venueCfg.distributionMode === 'inherit') && fRow.distribution_mode === 'round_robin' && Array.isArray(fRow.assigned_sdr_ids) && fRow.assigned_sdr_ids.length > 0) {
                  targetSdrIds = fRow.assigned_sdr_ids;
                  isRoundRobinActive = true;
                }

                if (isRoundRobinActive && targetSdrIds.length > 0) {
                  const { data: collabRows } = await supabase
                    .from('collaborators')
                    .select('id, name, role, avatar_url, active')
                    .in('id', targetSdrIds);
                  const activeById = new Map((collabRows || []).filter((c: any) => c.active !== false).map((c: any) => [c.id, c]));
                  const eligibleSdrs = targetSdrIds.map(id => activeById.get(id)).filter(Boolean) as any[];
                  if (eligibleSdrs.length > 0) {
                    const currentIndex = typeof fRow.round_robin_next_index === 'number' ? fRow.round_robin_next_index : 0;
                    const chosen = eligibleSdrs[currentIndex % eligibleSdrs.length];
                    const nextIndex = (currentIndex + 1) % eligibleSdrs.length;
                    assignedSdrId = chosen.id;
                    assignedSdrName = chosen.name;
                    assignedParticipants = [{
                      id: crypto.randomUUID(),
                      collaboratorId: chosen.id,
                      collaboratorName: chosen.name,
                      collaboratorRole: chosen.role || 'sdr',
                      collaboratorAvatarUrl: chosen.avatar_url || undefined,
                      action: 'round_robin',
                      timestamp: new Date().toISOString(),
                    }];
                    await supabase.from('commercial_funnels').update({ round_robin_next_index: nextIndex }).eq('id', fRow.id);
                  }
                }
              }
            } catch (rrErr: any) {
              console.warn('[Webhook] Erro na roleta automática de SDR:', rrErr?.message);
            }
          }

          const newLead: any = {
            id: leadId,
            code: isPostSaleTarget ? `CLI-${randomPart}` : leadCode,
            name: cleanLeadName,
            phone: finalPhone,
            venue_id: venueId,
            funnel_id: funnelId,
            master_id: venueMasterId,
            source_id: matchedSource?.id || null,
            source_name: matchedSource?.name || 'WhatsApp Oficial',
            stage: targetStage,
            group: isPostSaleTarget ? 'Pós-Venda' : 'WhatsApp',
            is_client: isPostSaleTarget,
            ...(assignedSdrId ? {
              sdr_id: assignedSdrId,
              sdr_name: assignedSdrName,
              assigned_to: assignedSdrName,
              participants: assignedParticipants,
            } : {}),
            tags: [
              ...(isPostSaleTarget ? ['Cliente'] : []),
              ...(autoContractId ? ['Contrato Vinculado'] : []),
            ],
            unread_count: (isFromMe || isHistory) ? 0 : 1,
            notes: isFromMe ? `Conversa iniciada via WhatsApp: "${initialNoteText}"` : `Primeira mensagem via WhatsApp: "${initialNoteText}"`,
            // Data de ENTRADA: a da mensagem real (historico nunca entra "hoje"); ao vivo e praticamente o mesmo instante
            created_at: activityIso,
            updated_at: new Date().toISOString(),
            last_interaction_at: activityIso,
            last_message_direction: isFromMe ? 'outgoing' : 'incoming',
            last_message_text: lastMessagePreview(text, mediaUrl, mediaType) || null,
            last_message_at: activityIso,
            migrated_to_contract_id: autoContractId,
            custom_field_values: {
              ...(isLid ? { whatsappLid: cleanPhone, whatsapp_lid: cleanPhone } : {}),
              ...(autoContractId ? {
                contractId: autoContractId,
                contractTitle: autoContractTitle,
                contractCode: autoContractCode,
                associated_contract_id: autoContractId,
              } : {}),
            },
          };

          const { error: leadErr } = await supabase.from('leads').insert([newLead]);
          if (leadErr) {
            console.error('[Webhook] Erro ao inserir novo lead:', leadErr);
          }

          const newLeadActivityId = crypto.randomUUID();
          const { error: actErr } = await supabase.from('lead_activities').insert([{
            id: newLeadActivityId,
            lead_id: leadId,
            timestamp: activityIso,
            type: 'contact',
            title: isFromMe 
              ? (isAudio ? 'Mensagem de voz enviada (Celular/Web)' : mediaType === 'vcard' ? 'Contato enviado (Celular/Web)' : mediaType === 'image' ? 'Foto enviada (Celular/Web)' : mediaType === 'video' ? 'Vídeo enviado (Celular/Web)' : mediaType === 'document' ? 'Documento enviado (Celular/Web)' : 'Mensagem enviada via WhatsApp (Celular/Web)') 
              : (isAudio ? 'Mensagem de voz recebida' : mediaType === 'vcard' ? 'Contato compartilhado' : mediaType === 'image' ? 'Foto recebida' : mediaType === 'video' ? 'Vídeo recebido' : mediaType === 'document' ? 'Documento recebido' : 'Mensagem recebida no WhatsApp'),
            text: creationStoredText,
            author_name: isFromMe ? 'WhatsApp App / Web' : (senderName || 'Cliente (WhatsApp)'),
            status: isFromMe ? 'sent' : 'delivered',
            metadata: {
              messageId: waMessageId || undefined,
              ...waIdsMeta,
              senderSourceId: matchedSource?.id,
              senderSourceName: matchedSource?.name,
              senderPhone: (matchedSource?.configuration as any)?.connectedPhone || (matchedSource?.configuration as any)?.whatsappNumber,
              senderAvatar: (matchedSource?.configuration as any)?.connectedAvatar || (matchedSource?.configuration as any)?.profilePicUrl,
              ...(isForwarded ? { isForwarded: true } : {}),
              ...(vcardData ? {
                isContactCard: true,
                contactName: vcardData.contactName,
                contactPhone: vcardData.contactPhone,
                vcard: vcardData.vcard,
              } : {}),
              // Preserva o nome original do arquivo de documentos para renderização no frontend
              ...(mediaType === 'document' && (msg.fileName || msg.message?.documentMessage?.fileName) ? {
                fileName: msg.fileName || msg.message?.documentMessage?.fileName,
              } : {}),
            },
          }]);
          if (actErr) {
            if (actErr.code === '23505' || actErr.message?.includes('duplicate key') || actErr.message?.includes('idx_lead_activities_unique_msg_id')) {
              console.log('[Webhook] Atividade de novo lead já inserida (dedup atômico):', waMessageId || newLeadActivityId);
            } else {
              console.error('[Webhook] Erro ao inserir lead_activity para novo lead:', actErr);
            }
          }
          if (actErr) {
            console.error('[Webhook] Erro ao inserir lead_activity para novo lead:', actErr);
          } else if (hasMedia) {
            await handleWebhookMedia({
              activityId: newLeadActivityId, leadId, masterId: venueMasterId, venueId,
              sourceId: matchedSource?.id, instanceToken, baseUrl: mediaBaseUrl, messageIds: mediaMessageIds,
              mediaType, storedText: creationStoredText, ingestNow: !isHistory,
            });
          }

          if (matchedSource?.id) {
            const currentTotal = Number(matchedSource.total_leads || 0) + 1;
            await supabase
              .from('sources')
              .update({ total_leads: currentTotal })
              .eq('id', matchedSource.id);
          }
        }
      }
    }

    return res.status(200).json({ success: true, processed: true });
  } catch (error: any) {
    console.error('[UAZAPI Webhook Error]:', error.message);
    return res.status(200).json({ success: false, error: error.message });
  }
}
