import { uazapiService } from './uazapiService';

export interface UazapiIncomingMessageEvent {
  instanceToken: string;
  senderPhone: string;
  senderName: string;
  profilePicUrl?: string;
  text: string;
  mediaType?: 'text' | 'image' | 'video' | 'audio' | 'document';
  mediaUrl?: string;
  timestamp: string;
  fromMe?: boolean;
  messageId?: string;
  rawPayload: any;
}

export interface UazapiPresenceEvent {
  instanceToken: string;
  phone: string;
  presence: 'composing' | 'recording' | 'paused' | 'available' | 'unavailable';
}

type MessageHandler = (event: UazapiIncomingMessageEvent) => void;
type ConnectionHandler = (instanceToken: string, status: string) => void;
type PresenceHandler = (event: UazapiPresenceEvent) => void;

/**
 * Verifica se um identificador é um LID multi-dispositivo do WhatsApp (@lid ou 14-16 dígitos)
 */
export function isLidIdentifier(id?: string): boolean {
  if (!id) return false;
  if (typeof id === 'string' && id.includes('@lid')) return true;
  const digits = String(id).replace(/\D/g, '');
  if (!digits) return false;
  if (digits.length >= 14) return true;
  if (digits.length >= 12 && !digits.startsWith('55')) return true;
  return false;
}

/**
 * Extrai o número de telefone real do WhatsApp a partir dos envelopes da UAZAPI / Baileys,
 * descartando identificadores internos @lid (LID de multi-dispositivo) e priorizando @s.whatsapp.net.
 */
export function extractRealWhatsAppPhone(msg: any, payload?: any): string {
  const candidates: any[] = [
    msg?.key?.cleanedParticipantPn,
    msg?.key?.remoteJidPn,
    msg?.key?.participantPn,
    msg?.participantPn,
    msg?.remoteJidPn,
    msg?.senderPhone,
    msg?.phone,
    msg?.userPn,
    msg?.chatId,
    payload?.phone,
    payload?.senderPhone,
    payload?.chatId,
    payload?.data?.phone,
    payload?.data?.senderPhone,
    msg?.sender_phone,
    payload?.sender_phone,
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

  // 1. Primeira prioridade: Candidato com telefone real brasileiro (10 a 13 dígitos começando com 55 ou DDD válido) e NÃO LID
  for (const c of candidates) {
    if (!c || typeof c !== 'string') continue;
    if (c.includes('@lid') || c.includes('@g.us') || c.includes('@newsletter') || c.includes('@broadcast')) continue;
    const withoutDevice = c.replace(/:\d+.*$/, '').replace(/:\d+@/, '@');
    const clean = withoutDevice.replace(/@.*$/, '').replace(/\D/g, '');
    if (clean.length >= 10 && clean.length <= 13 && !isLidIdentifier(clean)) {
      return clean;
    }
  }

  // 2. Segunda prioridade: Qualquer candidato sem @lid e que não seja classificado como LID
  for (const c of candidates) {
    if (!c || typeof c !== 'string') continue;
    if (c.includes('@lid') || c.includes('@g.us') || c.includes('@newsletter') || c.includes('@broadcast')) continue;
    const clean = c.replace(/:\d+.*$/, '').replace(/:\d+@/, '@').replace(/@.*$/, '').replace(/\D/g, '');
    if (clean.length >= 8 && clean.length <= 13 && !isLidIdentifier(clean)) {
      return clean;
    }
  }

  // 3. Fallback se apenas o LID estiver disponível (será resolvido via API ou auto-cura)
  for (const c of candidates) {
    if (!c || typeof c !== 'string') continue;
    if (c.includes('@g.us') || c.includes('@newsletter') || c.includes('@broadcast')) continue;
    const clean = c.replace(/:\d+.*$/, '').replace(/:\d+@/, '@').replace(/@.*$/, '').replace(/\D/g, '');
    if (clean.length >= 8) {
      return clean;
    }
  }

  return '';
}

/**
 * Extrai o telefone do destinatário para mensagens enviadas pelo próprio usuário (fromMe: true),
 * garantindo a remoção de sufixos de multi-dispositivo (:1, :2, etc.) que corromperiam o número.
 */
export function extractRecipientWhatsAppPhone(msg: any, payload?: any): string {
  const candidates: any[] = [
    msg?.chatid,
    msg?.chatId,
    msg?.chat,
    msg?.to,
    msg?.recipient,
    msg?.recipientPn,
    msg?.key?.cleanedParticipantPn,
    msg?.key?.remoteJidPn,
    msg?.key?.participantPn,
    msg?.key?.remoteJid,
    msg?.remoteJid,
    msg?.sender_pn,
    payload?.chatid,
    payload?.chatId,
    payload?.to,
    payload?.recipient,
    payload?.remoteJid,
    payload?.data?.chatid,
    payload?.data?.chatId,
    payload?.data?.to,
    payload?.data?.recipient,
    payload?.data?.remoteJid,
  ];

  // 1. Prioridade: Telefone válido (10 a 13 dígitos) sem LID
  for (const c of candidates) {
    if (!c || typeof c !== 'string') continue;
    if (c.includes('@lid') || c.includes('@g.us') || c.includes('@newsletter') || c.includes('@broadcast')) continue;
    const cleanWithoutDevice = c.replace(/:\d+.*$/, '').replace(/:\d+@/, '@');
    const clean = cleanWithoutDevice.replace(/@.*$/, '').replace(/\D/g, '');
    if (clean.length >= 10 && clean.length <= 13) {
      return clean;
    }
  }

  // 2. Fallback: Qualquer candidato limpo
  for (const c of candidates) {
    if (!c || typeof c !== 'string') continue;
    if (c.includes('@g.us') || c.includes('@newsletter') || c.includes('@broadcast')) continue;
    const cleanWithoutDevice = c.replace(/:\d+.*$/, '').replace(/:\d+@/, '@');
    const clean = cleanWithoutDevice.replace(/@.*$/, '').replace(/\D/g, '');
    if (clean.length >= 8 && clean.length <= 13) {
      return clean;
    }
  }

  return '';
}

/**
 * Extrai o nome de exibição do contato (pushName / notifyName / verifiedBizName).
 */
export function extractSenderName(msg: any, payload?: any): string {
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
      // Não usa como nome se for apenas dígitos ou formato de JID
      if (!/^\d+$/.test(trimmed) && !trimmed.includes('@')) {
        return trimmed;
      }
    }
  }
  return '';
}

class UazapiSseManager {
  private activeStreams: Map<string, EventSource> = new Map();
  private reconnectTimers: Map<string, any> = new Map();
  private messageListeners: Set<MessageHandler> = new Set();
  private connectionListeners: Set<ConnectionHandler> = new Set();
  private presenceListeners: Set<PresenceHandler> = new Set();
  private processedMessageIds: Set<string> = new Set();
  private isWindowListenerBound = false;

  constructor() {
    if (typeof window !== 'undefined' && !this.isWindowListenerBound) {
      this.isWindowListenerBound = true;
      window.addEventListener('online', () => this.reconnectAll());
      window.addEventListener('focus', () => this.checkStreamsHealth());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.checkStreamsHealth();
        }
      });
    }
  }

  /**
   * Verifica a saúde de todos os streams e reconecta os que caíram
   */
  private checkStreamsHealth() {
    for (const [token, stream] of this.activeStreams.entries()) {
      if (stream.readyState === EventSource.CLOSED) {
        console.log(`[UAZAPI SSE] Stream da instância ${token.substring(0, 8)}... estava fechado. Reconectando...`);
        this.disconnect(token);
        this.connect(token);
      }
    }
  }

  private reconnectAll() {
    const tokens = Array.from(this.activeStreams.keys());
    for (const token of tokens) {
      this.disconnect(token);
      this.connect(token);
    }
  }

  /**
   * Registra um listener para mensagens recebidas
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageListeners.add(handler);
    return () => {
      this.messageListeners.delete(handler);
    };
  }

  /**
   * Registra um listener para mudanças de conexão
   */
  onConnectionChange(handler: ConnectionHandler): () => void {
    this.connectionListeners.add(handler);
    return () => {
      this.connectionListeners.delete(handler);
    };
  }

  /**
   * Registra um listener para status de presença (ex: cliente digitando/gravando áudio)
   */
  onPresence(handler: PresenceHandler): () => void {
    this.presenceListeners.add(handler);
    return () => {
      this.presenceListeners.delete(handler);
    };
  }

  /**
   * Conecta o SSE para uma instância do WhatsApp
   */
  connect(instanceToken: string) {
    if (!instanceToken) return;

    // Se já existe e está aberto, não precisa recriar
    const existingStream = this.activeStreams.get(instanceToken);
    if (existingStream && existingStream.readyState === EventSource.OPEN) {
      return;
    }

    // Se já havia um stream anterior (fechado ou conectando), fecha antes de criar um novo
    if (existingStream) {
      try { existingStream.close(); } catch {}
      this.activeStreams.delete(instanceToken);
    }

    if (this.reconnectTimers.has(instanceToken)) {
      clearTimeout(this.reconnectTimers.get(instanceToken));
      this.reconnectTimers.delete(instanceToken);
    }

    const baseUrl = uazapiService.getServerUrl();
    if (!baseUrl) return;

    try {
      const params = new URLSearchParams({
        token: instanceToken,
        events: 'chats,messages,messages_update,connection,history,presence,sender',
      });

      const sseUrl = `${baseUrl}/sse?${params.toString()}`;
      const eventSource = new EventSource(sseUrl);

      eventSource.onopen = () => {
        console.log(`[UAZAPI SSE] Conectado e ativo na instância ${instanceToken.substring(0, 8)}...`);
        this.connectionListeners.forEach(fn => fn(instanceToken, 'connected'));
      };

      eventSource.onmessage = (event) => {
        try {
          if (!event.data) return;
          const data = JSON.parse(event.data);
          this.handleEventPayload(instanceToken, data);
        } catch (err) {
          console.warn('[UAZAPI SSE Parse Error]:', err);
        }
      };

      eventSource.onerror = (err) => {
        console.warn(`[UAZAPI SSE Error on ${instanceToken.substring(0, 8)}...]:`, err);
        
        // Fecha e remove a conexão morta
        try { eventSource.close(); } catch {}
        this.activeStreams.delete(instanceToken);
        this.connectionListeners.forEach(fn => fn(instanceToken, 'disconnected'));

        // Agenda reconexão automática em 2.5s
        if (!this.reconnectTimers.has(instanceToken)) {
          const timer = setTimeout(() => {
            this.reconnectTimers.delete(instanceToken);
            console.log(`[UAZAPI SSE] Tentando reconectar instância ${instanceToken.substring(0, 8)}...`);
            this.connect(instanceToken);
          }, 2500);
          this.reconnectTimers.set(instanceToken, timer);
        }
      };

      this.activeStreams.set(instanceToken, eventSource);
    } catch (err) {
      console.warn('[UAZAPI SSE Connect Error]:', err);
    }
  }

  /**
   * Desconecta o SSE de uma instância
   */
  disconnect(instanceToken: string) {
    if (this.reconnectTimers.has(instanceToken)) {
      clearTimeout(this.reconnectTimers.get(instanceToken));
      this.reconnectTimers.delete(instanceToken);
    }
    const stream = this.activeStreams.get(instanceToken);
    if (stream) {
      try { stream.close(); } catch {}
      this.activeStreams.delete(instanceToken);
    }
  }

  /**
   * Sincroniza instâncias ativas
   */
  syncActiveInstances(instanceTokens: string[]) {
    const desired = new Set(instanceTokens.filter(Boolean));
    
    // Fecha as que não são mais necessárias
    for (const [token, stream] of this.activeStreams.entries()) {
      if (!desired.has(token)) {
        stream.close();
        this.activeStreams.delete(token);
      }
    }

    // Abre novas
    for (const token of desired) {
      if (!this.activeStreams.has(token)) {
        this.connect(token);
      }
    }
  }

  /**
   * Trata o payload bruto de evento recebido do SSE
   */
  private handleEventPayload(instanceToken: string, payload: any) {
    if (!payload) return;

    const eventType = String(payload.EventType || payload.event || payload.type || payload.event_type || '').toLowerCase();

    // 1. Trata evento de conexão
    if (eventType === 'connection' || eventType.includes('connection')) {
      const status = payload.status || payload.state || 'connected';
      this.connectionListeners.forEach(fn => fn(instanceToken, status));
      return;
    }

    // 2. Trata evento de presença em tempo real (contato digitando / gravando áudio)
    const isPresenceEvent =
      eventType === 'presence' ||
      eventType === 'presence.update' ||
      eventType.includes('presence') ||
      eventType === 'chats.update' ||
      eventType === 'user.presence' ||
      Boolean(payload.presences) ||
      Boolean(payload.data?.presences) ||
      (Boolean(payload.presence) && !payload.message && !payload.messages) ||
      (Boolean(payload.data?.presence) && !payload.data?.message && !payload.data?.messages);

    if (isPresenceEvent) {
      const data = payload.data || payload;
      const jid = data.id || data.jid || data.from || data.remoteJid || payload.id || payload.jid || payload.from || payload.remoteJid || '';
      let cleanPhone = String(jid).replace(/:\d+.*$/, '').replace(/@.*$/, '').replace(/\D/g, '');
      
      let presenceType: 'composing' | 'recording' | 'paused' | 'available' | 'unavailable' = 'paused';
      const rawPresences = data.presences || payload.presences;
      if (rawPresences && typeof rawPresences === 'object') {
        const firstKey = Object.keys(rawPresences)[0];
        if (!cleanPhone && firstKey) {
          cleanPhone = String(firstKey).replace(/:\d+.*$/, '').replace(/@.*$/, '').replace(/\D/g, '');
        }
        const presObj = rawPresences[firstKey];
        presenceType = presObj?.lastKnownPresence || presObj?.presence || presObj || 'paused';
      } else if (data.presence || payload.presence || data.status || payload.status) {
        presenceType = data.presence || payload.presence || data.status || payload.status || 'paused';
      }

      if (cleanPhone) {
        // Normaliza presenceType
        const rawLower = String(presenceType).toLowerCase();
        const normalizedPresence = 
          rawLower === 'composing' || rawLower === 'typing' ? 'composing' :
          rawLower === 'recording' || rawLower === 'audio' ? 'recording' :
          rawLower === 'available' || rawLower === 'online' ? 'available' :
          'paused';

        this.presenceListeners.forEach(fn => fn({
          instanceToken,
          phone: cleanPhone,
          presence: normalizedPresence,
        }));
      }
      return;
    }

    // 3. Trata evento de mensagens e histórico de reconexão (history)
    const isMessageEvent = 
      !eventType ||
      eventType === 'messages' ||
      eventType === 'messages.upsert' ||
      eventType === 'message' ||
      eventType === 'history' ||
      eventType.includes('message') ||
      eventType.includes('send') ||
      eventType.includes('upsert') ||
      Array.isArray(payload.messages) ||
      Array.isArray(payload.data) ||
      Boolean(payload.message);

    if (isMessageEvent) {
      const messagesList = Array.isArray(payload.messages) 
        ? payload.messages 
        : Array.isArray(payload.data) 
          ? payload.data 
          : [payload.message || payload.data || payload];

      for (const msg of messagesList) {
        if (!msg) continue;

        // Deduplicação por ID de mensagem
        const msgId = msg.id || msg.key?.id;
        if (msgId) {
          if (this.processedMessageIds.has(msgId)) continue;
          this.processedMessageIds.add(msgId);
          // Limita cache a 500 mensagens
          if (this.processedMessageIds.size > 500) {
            const [first] = this.processedMessageIds;
            this.processedMessageIds.delete(first);
          }
        }

        // Verifica se foi enviado externamente pelo celular/WhatsApp Web (fromMe: true)
        const isFromMe = msg.fromMe === true || msg.key?.fromMe === true || payload.fromMe === true || payload.key?.fromMe === true;

        // REGRA DE OURO: Ignora mensagens originadas pelo próprio sistema (API) para evitar duplicatas na UI
        if (msg.wasSentByApi === true || payload.wasSentByApi === true) continue;

        // REGRA CRÍTICA: Ignora mensagens de grupos (@g.us), canais (@newsletter) e status broadcast
        const remoteJid = msg.key?.remoteJid || msg.remoteJid || msg.from || msg.to || msg.chat || '';
        const isGroup = msg.isGroup === true || payload.isGroup === true || remoteJid.includes('@g.us') || remoteJid.includes('@newsletter') || remoteJid.includes('@broadcast') || remoteJid === 'status@broadcast';
        if (isGroup) continue;

        // Extrai telefone do cliente:
        // - Se fromMe=true (enviado pelo celular da atendente), o telefone é o destinatário (to ou remoteJid)
        // - Se fromMe=false (enviado pelo cliente), o telefone é o remetente (from ou extractRealWhatsAppPhone)
        let cleanPhone = '';
        if (isFromMe) {
          cleanPhone = extractRecipientWhatsAppPhone(msg, payload);
          if (!cleanPhone && remoteJid) {
            cleanPhone = remoteJid.replace(/:\d+.*$/, '').replace(/:\d+@/, '@').replace(/@.*$/, '').replace(/\D/g, '');
          }
        } else {
          cleanPhone = extractRealWhatsAppPhone(msg, payload);
          if (!cleanPhone && remoteJid) {
            cleanPhone = remoteJid.replace(/:\d+.*$/, '').replace(/:\d+@/, '@').replace(/@.*$/, '').replace(/\D/g, '');
          }
        }

        if (!cleanPhone || cleanPhone.length < 8) continue;

        // Extrai nome do remetente
        const senderName = isFromMe ? 'WhatsApp App / Web' : (extractSenderName(msg, payload) || 'Cliente (WhatsApp)');

        // Extrai foto de perfil se disponível no payload
        const profilePicUrl = msg.profilePicUrl || msg.profilePictureUrl || payload?.profilePicUrl || payload?.profilePictureUrl || undefined;

        // Extrai conteúdo do texto e mídias da UAZAPI
        let text = '';
        let mediaType: UazapiIncomingMessageEvent['mediaType'] = 'text';
        let mediaUrl = msg.fileURL || msg.mediaUrl || msg.file || msg.url || payload?.fileURL || payload?.mediaUrl || payload?.file || payload?.url || payload?.data?.fileURL || payload?.data?.mediaUrl || payload?.data?.url || undefined;
        const msgType = String(msg.messageType || msg.type || payload?.messageType || payload?.type || '').toLowerCase();

        // 1. Detecta tipo da mensagem pelo type/messageType
        if (msgType.includes('image')) {
          mediaType = 'image';
          text = msg.text || msg.caption || '📷 Foto';
        } else if (msgType.includes('video') || msgType.includes('ptv')) {
          mediaType = 'video';
          text = msg.text || msg.caption || '🎥 Vídeo';
        } else if (msgType.includes('audio') || msgType.includes('ptt') || msgType.includes('voice')) {
          mediaType = 'audio';
          text = '🎵 Mensagem de voz';
        } else if (msgType.includes('document')) {
          mediaType = 'document';
          text = msg.fileName ? `📄 Documento: ${msg.fileName}` : (msg.text || '📄 Documento');
        } else if (msgType.includes('sticker')) {
          mediaType = 'image';
          text = '✨ Figurinha';
        }

        // 2. Extrai de msg.text, msg.body, msg.content, msg.caption
        if (typeof msg.text === 'string' && msg.text.trim()) {
          text = msg.text;
        } else if (typeof msg.body === 'string' && msg.body.trim()) {
          text = msg.body;
        } else if (typeof msg.content === 'string' && msg.content.trim()) {
          text = msg.content;
        } else if (typeof msg.caption === 'string' && msg.caption.trim()) {
          text = msg.caption;
        } else if (typeof msg.conversation === 'string' && msg.conversation.trim()) {
          text = msg.conversation;
        }

        // 3. Extrai da árvore aninhada msg.message (Baileys / UAZAPI standard)
        if (msg.message) {
          const rawM = msg.message;
          // Desembrulha viewOnce, ephemeral e documentWithCaption se existirem
          const m = rawM.viewOnceMessage?.message || 
                    rawM.viewOnceMessageV2?.message || 
                    rawM.ephemeralMessage?.message || 
                    rawM.documentWithCaptionMessage?.message || 
                    rawM;

          if (typeof m === 'string') {
            text = m;
          } else if (m.conversation) {
            text = m.conversation;
          } else if (m.extendedTextMessage?.text) {
            text = m.extendedTextMessage.text;
          } else if (m.imageMessage) {
            mediaType = 'image';
            text = m.imageMessage.caption || text || '📷 Foto';
            mediaUrl = mediaUrl || m.imageMessage.url || m.imageMessage.directPath;
          } else if (m.videoMessage) {
            mediaType = 'video';
            const isGif = m.videoMessage.gifPlayback === true;
            text = m.videoMessage.caption || text || (isGif ? '🎬 GIF' : '🎥 Vídeo');
            mediaUrl = mediaUrl || m.videoMessage.url || m.videoMessage.directPath;
          } else if (m.ptvMessage) {
            mediaType = 'video';
            text = text || '🎥 Vídeo rápido';
            mediaUrl = mediaUrl || m.ptvMessage.url || m.ptvMessage.directPath;
          } else if (m.audioMessage) {
            mediaType = 'audio';
            text = text || '🎵 Mensagem de voz';
            mediaUrl = mediaUrl || m.audioMessage.url || m.audioMessage.directPath;
          } else if (m.documentMessage) {
            mediaType = 'document';
            text = m.documentMessage.fileName ? `📄 Documento: ${m.documentMessage.fileName}` : (text || '📄 Documento');
            mediaUrl = mediaUrl || m.documentMessage.url || m.documentMessage.directPath;
          } else if (m.stickerMessage) {
            mediaType = 'image';
            text = text || '✨ Figurinha';
            mediaUrl = mediaUrl || m.stickerMessage.url || m.stickerMessage.directPath;
          }
        }

        // Garante texto padrão caso seja mídia e o texto esteja em branco
        if (!text) {
          if (mediaType === 'audio') text = '🎵 Mensagem de voz';
          else if (mediaType === 'image') text = '📷 Foto';
          else if (mediaType === 'video') text = '🎥 Vídeo';
          else if (mediaType === 'document') text = '📄 Documento';
        }

        if (!text && !mediaUrl) continue;

        let timestampIso = new Date().toISOString();
        let rawTs = msg.messageTimestamp ?? msg.timestamp ?? payload?.timestamp ?? msg.key?.timestamp;
        if (typeof rawTs === 'object' && rawTs !== null && 'low' in rawTs) {
          rawTs = rawTs.low;
        }
        if (typeof rawTs === 'string' && /^\d+$/.test(rawTs)) {
          rawTs = Number(rawTs);
        }
        if (typeof rawTs === 'number') {
          const ms = rawTs > 1e11 ? rawTs : rawTs * 1000;
          if (!isNaN(ms) && ms > 0) {
            timestampIso = new Date(ms).toISOString();
          }
        } else if (typeof rawTs === 'string' && rawTs.includes('T')) {
          timestampIso = new Date(rawTs).toISOString();
        }

        const eventData: UazapiIncomingMessageEvent = {
          instanceToken,
          senderPhone: cleanPhone,
          senderName,
          profilePicUrl,
          text: text.trim(),
          mediaType,
          mediaUrl,
          timestamp: timestampIso,
          fromMe: isFromMe,
          messageId: msgId,
          rawPayload: msg,
        };

        console.log(`[UAZAPI SSE] Mensagem ${isFromMe ? 'enviada externamente (celular/web) para' : 'recebida de'} ${cleanPhone}: "${text}"`);
        this.messageListeners.forEach(fn => fn(eventData));
      }
      return;
    }
  }
}

export const uazapiSseService = new UazapiSseManager();
