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

        // 2. Busca se já existe um Lead com esse telefone ou LID (ESTRITAMENTE escopado à Casa de Festa da Origem)
        const isLid = isLidIdentifier(cleanPhone) || cleanPhone.length >= 14 || remoteJid.includes('@lid');
        let existingLead: any = null;
        let resolvedPhone = (!isLid && cleanPhone.length <= 13) ? cleanPhone : '';
        const targetVenueId = matchedSource?.venue_id;

        // 2a. Se for LID, procura primeiro por correspondência de whatsappLid salva em custom_field_values
        if (isLid) {
          let lidQuery = supabase
            .from('leads')
            .select('id, name, phone, unread_count, venue_id, funnel_id, custom_field_values, master_id')
            .or(`custom_field_values->>whatsappLid.eq.${cleanPhone},custom_field_values->>whatsapp_lid.eq.${cleanPhone}`);
          
          if (targetVenueId) {
            lidQuery = lidQuery.eq('venue_id', targetVenueId);
          }

          const { data: lidMatches } = await lidQuery.limit(1);

          if (lidMatches && lidMatches.length > 0) {
            existingLead = lidMatches[0];
          }

          // Se não encontrou por LID gravado, tenta extrair o telefone real dos campos do payload ou UAZAPI
          if (!existingLead) {
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

            // Se ainda não tiver telefone real, consulta /chat/details na UAZAPI
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
        }

        // 2b. Busca por telefone real se ainda não encontrou o lead (Estritamente escopado à casa do WhatsApp conectado)
        const targetSearchPhone = resolvedPhone || (!isLid ? cleanPhone : '');
        if (!existingLead && targetSearchPhone && targetSearchPhone.length >= 8) {
          const last8 = targetSearchPhone.slice(-8);
          let phoneQuery = supabase
            .from('leads')
            .select('id, name, phone, unread_count, venue_id, funnel_id, custom_field_values, master_id')
            .ilike('phone', `%${last8}%`);

          if (targetVenueId) {
            phoneQuery = phoneQuery.eq('venue_id', targetVenueId);
          }

          const { data: phoneLeads } = await phoneQuery.limit(1);

          if (phoneLeads && phoneLeads.length > 0) {
            existingLead = phoneLeads[0];
            // Vincula o LID ao lead encontrado para que as próximas mensagens batam de primeira!
            if (isLid) {
              const updatedCustom = {
                ...(existingLead.custom_field_values || {}),
                whatsappLid: cleanPhone,
                whatsapp_lid: cleanPhone,
              };
              await supabase.from('leads').update({ custom_field_values: updatedCustom }).eq('id', existingLead.id);
            }
          }
        }

        if (existingLead) {
          // Atualiza o Lead existente com a nova atividade de mensagem na tabela lead_activities
          const isAudio = mediaType === 'audio' || text.includes('🎵');
          let storedText = text.trim();
          if (mediaUrl && !storedText.startsWith('[media:')) {
            storedText = `[media:${mediaUrl}|${mediaType || 'audio'}] ${storedText}`.trim();
          }

          const waMessageId = msg.key?.id || msg.id;

          // DEDUPLICAÇÃO: Checa se uma mensagem com texto idêntico foi gravada nos últimos 30 segundos
          if (storedText) {
            const thirtySecsAgo = new Date(Date.now() - 30000).toISOString();
            const { data: recentIdentical } = await supabase
              .from('lead_activities')
              .select('id')
              .eq('lead_id', existingLead.id)
              .eq('text', storedText)
              .gte('timestamp', thirtySecsAgo)
              .limit(1);

            if (recentIdentical && recentIdentical.length > 0) {
              console.log(`[Webhook] Mensagem idêntica recente ignorada no lead ${existingLead.id}: "${storedText.slice(0, 30)}..."`);
              continue;
            }
          }

          const activityId = crypto.randomUUID();
          const newActivityRecord = {
            id: activityId,
            lead_id: existingLead.id,
            timestamp: new Date().toISOString(),
            type: 'contact',
            title: isFromMe 
              ? (isAudio ? 'Mensagem de voz enviada (Celular/Web)' : 'Mensagem enviada via WhatsApp (Celular/Web)')
              : (isAudio ? 'Mensagem de voz recebida' : 'Mensagem recebida no WhatsApp'),
            text: storedText,
            author_name: isFromMe ? 'WhatsApp App / Web' : (senderName || 'Cliente (WhatsApp)'),
            author_id: null,
            author_avatar_url: isFromMe ? 'whatsapp_brand' : '',
            status: isFromMe ? 'sent' : 'delivered',
          };

          await supabase.from('lead_activities').insert([newActivityRecord]);

          const updatePayload: Record<string, any> = {
            updated_at: new Date().toISOString(),
            last_interaction_at: new Date().toISOString(),
            last_message_direction: isFromMe ? 'outgoing' : 'incoming',
          };

          if (!isFromMe) {
            updatePayload.unread_count = (existingLead.unread_count || 0) + 1;
          }

          await supabase
            .from('leads')
            .update(updatePayload)
            .eq('id', existingLead.id);
        } else {
          // Cria um novo Lead automaticamente com telefone real na casa da instância do WhatsApp
          const finalPhone = resolvedPhone || cleanPhone;
          const leadId = crypto.randomUUID();
          const leadCode = `LD-${Math.floor(1000 + Math.random() * 9000)}`;
          const cleanLeadName = (senderName && senderName !== 'Cliente (WhatsApp)' && senderName !== 'WhatsApp App / Web') ? senderName.trim() : leadCode;
          const venueId = matchedSource?.venue_id || 'v1';
          const funnelId = matchedSource?.funnel_id || 'comercial';

          // Localiza o masterId da casa para garantir isolamento por tenant no banco
          let venueMasterId: string | null = null;
          if (venueId) {
            const { data: vRow } = await supabase.from('venues').select('master_id').eq('id', venueId).maybeSingle();
            if (vRow?.master_id) venueMasterId = vRow.master_id;
          }

          const newLead = {
            id: leadId,
            code: leadCode,
            name: cleanLeadName,
            phone: finalPhone,
            venue_id: venueId,
            funnel_id: funnelId,
            master_id: venueMasterId,
            source_id: matchedSource?.id || null,
            source_name: matchedSource?.name || 'WhatsApp Oficial',
            stage: 'new_lead',
            unread_count: isFromMe ? 0 : 1,
            notes: isFromMe ? `Conversa iniciada via WhatsApp: "${text.trim()}"` : `Primeira mensagem via WhatsApp: "${text.trim()}"`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_interaction_at: new Date().toISOString(),
            last_message_direction: isFromMe ? 'outgoing' : 'incoming',
            custom_field_values: isLid ? { whatsappLid: cleanPhone, whatsapp_lid: cleanPhone } : {},
          };

          await supabase.from('leads').insert([newLead]);

          let creationStoredText = text.trim();
          if (mediaUrl && !creationStoredText.startsWith('[media:')) {
            creationStoredText = `[media:${mediaUrl}|${mediaType || 'audio'}] ${creationStoredText}`.trim();
          }

          const waMessageId = msg.key?.id || msg.id;

          await supabase.from('lead_activities').insert([{
            id: crypto.randomUUID(),
            lead_id: leadId,
            timestamp: new Date().toISOString(),
            type: 'contact',
            title: isFromMe 
              ? (isAudio ? 'Mensagem de voz enviada (Celular/Web)' : 'Mensagem enviada via WhatsApp (Celular/Web)') 
              : (isAudio ? 'Mensagem de voz recebida' : 'Mensagem recebida no WhatsApp'),
            text: creationStoredText,
            author_name: isFromMe ? 'WhatsApp App / Web' : (senderName || 'Cliente (WhatsApp)'),
            status: isFromMe ? 'sent' : 'delivered',
          }]);

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
