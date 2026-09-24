import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

  // 1. REGRA CRÍTICA UAZAPI: Responder 200 IMEDIATAMENTE para não bloquear a fila da API
  res.status(200).json({ success: true, received: true });

  // 2. Processamento assíncrono em segundo plano
  try {
    const payload = req.body;
    if (!payload) return;

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

    // ── 2. PROCESSAMENTO DE MENSAGENS RECEBIDAS ──────────────────────────────
    if (eventType === 'messages' || eventType === 'messages.upsert' || !eventType) {
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
        const isFromMe = msg.fromMe === true || msg.key?.fromMe === true || payload.fromMe === true || payload.key?.fromMe === true;

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

        const msgType = String(msg.messageType || msg.type || payload?.messageType || '').toLowerCase();
        if (msgType === 'image') {
          mediaType = 'image';
          text = msg.text || msg.caption || '📷 Foto';
        } else if (msgType === 'video') {
          mediaType = 'video';
          text = msg.text || msg.caption || '🎥 Vídeo';
        } else if (msgType === 'audio' || msgType === 'myaudio') {
          mediaType = 'audio';
          text = '🎵 Mensagem de voz';
        } else if (msgType === 'document') {
          mediaType = 'document';
          text = msg.fileName ? `📄 Documento: ${msg.fileName}` : (msg.text || '📄 Documento');
        } else if (msgType === 'sticker') {
          mediaType = 'image';
          text = '✨ Figurinha';
        }

        if (typeof msg.text === 'string' && msg.text.trim()) {
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
          }
        }

        if (!text && !mediaUrl) continue;

        // 1. Busca a Origem associada à instância
        let matchedSource: any = null;
        const candidateToken = (instanceToken || '').trim();
        const candidateInstanceName = (instanceName || '').trim();
        const candidateOwner = (payload.owner || payload.phone || payload.connectedPhone || payload.fromMePhone || '').replace(/\D/g, '');

        if (candidateToken) {
          const { data: src } = await supabase
            .from('sources')
            .select('*')
            .or(`whatsapp_instance_id.eq.${candidateToken},configuration->>token.eq.${candidateToken},configuration->>instanceToken.eq.${candidateToken},configuration->>instanceKey.eq.${candidateToken}`)
            .maybeSingle();
          matchedSource = src;
        }

        if (!matchedSource && candidateOwner) {
          const { data: src } = await supabase
            .from('sources')
            .select('*')
            .or(`whatsapp_instance_id.eq.${candidateOwner},configuration->>connectedPhone.eq.${candidateOwner}`)
            .maybeSingle();
          matchedSource = src;
        }

        if (!matchedSource && candidateInstanceName) {
          const { data: srcs } = await supabase
            .from('sources')
            .select('*')
            .eq('type', 'whatsapp_api');
          matchedSource = (srcs || []).find((s: any) => 
            s.name?.toLowerCase().includes(candidateInstanceName.toLowerCase()) ||
            s.whatsapp_instance_id?.includes(candidateInstanceName) ||
            (s.configuration?.connectedPhone || '').includes(candidateInstanceName)
          );
        }

        // 2. Busca se já existe um Lead com esse telefone
        const { data: existingLeads } = await supabase
          .from('leads')
          .select('*')
          .ilike('phone', `%${cleanPhone.slice(-8)}%`)
          .limit(1);

        const existingLead = existingLeads?.[0];

        if (existingLead) {
          // Atualiza o Lead existente com a nova atividade de mensagem
          const isAudio = mediaType === 'audio' || text.includes('🎵');
          const newActivity = {
            id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            leadId: existingLead.id,
            timestamp: new Date().toISOString(),
            type: 'contact',
            title: isFromMe 
              ? (isAudio ? 'Mensagem de voz enviada (Celular/Web)' : 'Mensagem enviada via WhatsApp (Celular/Web)')
              : (isAudio ? 'Mensagem de voz recebida' : 'Mensagem recebida no WhatsApp'),
            text: text.trim(),
            mediaUrl,
            mediaType,
            authorName: isFromMe ? 'WhatsApp App / Web' : (senderName || 'Cliente (WhatsApp)'),
            authorId: isFromMe ? 'whatsapp_mobile' : 'lead',
            authorAvatarUrl: isFromMe ? 'whatsapp_brand' : undefined,
            status: isFromMe ? 'sent' : 'delivered',
          };

          const currentActivities = Array.isArray(existingLead.activities) ? existingLead.activities : [];
          const updatePayload: Record<string, any> = {
            activities: [...currentActivities, newActivity],
            updated_at: new Date().toISOString().split('T')[0],
          };

          if (!isFromMe) {
            updatePayload.unread_count = (existingLead.unread_count || 0) + 1;
          }

          await supabase
            .from('leads')
            .update(updatePayload)
            .eq('id', existingLead.id);
        } else if (!isFromMe) {
          // Cria um novo Lead automaticamente (apenas quando recebido do cliente)
          const leadCode = `LD-${Math.floor(1000 + Math.random() * 9000)}`;
          const cleanLeadName = (senderName && senderName !== 'Cliente (WhatsApp)') ? senderName.trim() : leadCode;
          const venueId = matchedSource?.venue_id || 'v1';
          const funnelId = matchedSource?.funnel_id || 'comercial';

          const newLead = {
            id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            code: leadCode,
            name: cleanLeadName,
            phone: cleanPhone,
            venue_id: venueId,
            funnel_id: funnelId,
            source_id: matchedSource?.id || null,
            source: 'whatsapp',
            source_name: matchedSource?.name || 'WhatsApp API',
            stage: 'new_lead',
            unread_count: 1,
            notes: `Primeira mensagem via WhatsApp: "${text.trim()}"`,
            activities: [
              {
                id: `act_${Date.now()}`,
                timestamp: new Date().toISOString(),
                type: 'creation',
                title: 'Lead captado via WhatsApp Oficial',
                text: `Primeira mensagem: "${text.trim()}"`,
                authorName: 'WhatsApp API',
                mediaUrl,
                mediaType,
              }
            ],
            created_at: new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString().split('T')[0],
          };

          await supabase.from('leads').insert([newLead]);

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
  } catch (error: any) {
    console.error('[UAZAPI Webhook Error]:', error.message);
  }
}
