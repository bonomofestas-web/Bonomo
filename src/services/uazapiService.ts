import { isLidIdentifier } from './uazapiSseService';
import { normalizeWhatsAppNumber } from '../utils/phoneFormatter';
import type {
  UazapiConnectOptions,
  UazapiConnectResponse,
  UazapiInstanceStatusResponse,
  UazapiInstance,
  UazapiSendTextPayload,
  UazapiSendMediaPayload,
  UazapiSendMessageResponse,
  UazapiDownloadMediaPayload,
  UazapiDownloadMediaResponse,
  UazapiReactPayload,
  UazapiWebhookConfig,
  UazapiGlobalWebhookConfig,
} from '../types/uazapi';

const STORAGE_KEYS = {
  SERVER_URL: 'f5_uazapi_server_url',
  ADMIN_TOKEN: 'f5_uazapi_admin_token',
};

export const uazapiService = {
  /**
   * Resolve o número de telefone real, nome e foto de perfil de um contato a partir de seu LID ou identificador.
   * Garante que contatos novos criados a partir do WhatsApp venham com o número de telefone real e não o @lid.
   */
  async resolveContactPhoneAndProfile(
    instanceToken: string,
    candidate: string,
    rawPayload?: any
  ): Promise<{ phone: string; name?: string; avatarUrl?: string }> {
    const rawClean = candidate.replace(/\D/g, '');
    const isLid = isLidIdentifier(candidate) || (rawPayload?.key?.remoteJid && isLidIdentifier(rawPayload.key.remoteJid));

    // 1. Se já não for LID e tiver tamanho de telefone brasileiro/internacional (10 a 13 dígitos), tenta extrair nome do payload
    if (!isLid && rawClean.length >= 10 && rawClean.length <= 13) {
      return {
        phone: rawClean,
        name: rawPayload?.pushName || rawPayload?.notifyName || rawPayload?.name,
        avatarUrl: rawPayload?.profilePicUrl,
      };
    }

    // 2. Tenta extrair telefone real diretamente de campos alternativos do rawPayload
    if (rawPayload) {
      const candidates = [
        rawPayload?.key?.cleanedParticipantPn,
        rawPayload?.key?.remoteJidPn,
        rawPayload?.key?.participantPn,
        rawPayload?.participantPn,
        rawPayload?.remoteJidPn,
        rawPayload?.senderPhone,
        rawPayload?.phone,
        rawPayload?.userPn,
        rawPayload?.chatId,
        rawPayload?.data?.phone,
        rawPayload?.data?.senderPhone,
      ];
      for (const c of candidates) {
        if (!c || typeof c !== 'string') continue;
        if (c.includes('@lid')) continue;
        const clean = c.replace(/:\d+@/, '@').replace(/@.*$/, '').replace(/\D/g, '');
        if (clean.length >= 10 && clean.length <= 13 && !isLidIdentifier(clean)) {
          return {
            phone: clean,
            name: rawPayload?.pushName || rawPayload?.notifyName || rawPayload?.name,
            avatarUrl: rawPayload?.profilePicUrl,
          };
        }
      }
    }

    // 3. Consulta a API da UAZAPI via POST /chat/find (busca por wa_chatlid ou wa_chatid)
    if (instanceToken) {
      try {
        const info = await this.fetchChatContactInfo(instanceToken, rawClean);
        if (info.realPhone && !isLidIdentifier(info.realPhone) && info.realPhone.length >= 10 && info.realPhone.length <= 13) {
          return {
            phone: info.realPhone,
            name: info.contactName || rawPayload?.pushName || rawPayload?.notifyName,
            avatarUrl: info.profilePicUrl || undefined,
          };
        }
      } catch (err) {
        console.warn('[UAZAPI resolveContact fetchChatContactInfo Warning]:', err);
      }

      // 4. Consulta a API da UAZAPI via POST /chat/details
      try {
        const details = await this.fetchChatDetails(instanceToken, rawClean);
        if (details?.phone && !isLidIdentifier(details.phone) && details.phone.length >= 10 && details.phone.length <= 13) {
          return {
            phone: details.phone,
            name: details.name || details.wa_name || details.wa_contactName || rawPayload?.pushName || rawPayload?.notifyName,
            avatarUrl: details.image || details.imagePreview || undefined,
          };
        }
      } catch (err) {
        console.warn('[UAZAPI resolveContact fetchChatDetails Warning]:', err);
      }
    }

    // Fallback final: se mesmo após todas as tentativas a API não retornar o número, retorna o limpo
    return {
      phone: rawClean,
      name: rawPayload?.pushName || rawPayload?.notifyName || rawPayload?.name,
      avatarUrl: rawPayload?.profilePicUrl,
    };
  },
  /**
   * Obtém a Server URL configurada (Prioridade: LocalStorage > .env > default)
   */
  getServerUrl(): string {
    const fromStorage = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.SERVER_URL) : null;
    const fromEnv = (import.meta as any).env?.VITE_UAZAPI_SERVER_URL;
    const url = (fromStorage || fromEnv || '').trim();
    return url.replace(/\/$/, '');
  },

  /**
   * Obtém o Admin Token configurado (Prioridade: LocalStorage > .env)
   */
  getAdminToken(): string {
    const fromStorage = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN) : null;
    const fromEnv = (import.meta as any).env?.UAZAPI_ADMIN_TOKEN || (import.meta as any).env?.VITE_UAZAPI_ADMIN_TOKEN;
    return (fromStorage || fromEnv || '').trim();
  },

  /**
   * Salva configurações de servidor e token localmente para testes rápidos no navegador
   */
  saveConfig(serverUrl: string, adminToken?: string) {
    if (typeof window !== 'undefined') {
      if (serverUrl) localStorage.setItem(STORAGE_KEYS.SERVER_URL, serverUrl.trim().replace(/\/$/, ''));
      else localStorage.removeItem(STORAGE_KEYS.SERVER_URL);

      if (adminToken !== undefined) {
        if (adminToken) localStorage.setItem(STORAGE_KEYS.ADMIN_TOKEN, adminToken.trim());
        else localStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
      }
    }
  },

  /**
   * Verifica se o serviço está com a URL do servidor configurada
   */
  isConfigured(): boolean {
    return Boolean(this.getServerUrl());
  },

  /**
   * Testa conectividade com o servidor UAZAPI
   */
  async pingServer(): Promise<{ ok: boolean; message: string }> {
    const baseUrl = this.getServerUrl();
    const adminToken = this.getAdminToken();
    if (!baseUrl) {
      return { ok: false, message: 'URL do servidor UAZAPI não configurada.' };
    }
    try {
      if (adminToken) {
        const res = await fetch(`${baseUrl}/instance/all`, {
          method: 'GET',
          headers: { admintoken: adminToken }
        });
        if (res.ok) {
          const instances = await res.json().catch(() => []);
          const count = Array.isArray(instances) ? instances.length : 0;
          return { ok: true, message: `Conectado à Uazapi! (${count} instâncias encontradas)` };
        }
      }
      const res = await fetch(`${baseUrl}/`, { method: 'GET' });
      return { ok: res.status < 500, message: `Servidor acessível (HTTP ${res.status})` };
    } catch (err: any) {
      return { ok: false, message: err.message || 'Falha de conexão com o servidor.' };
    }
  },

  /**
   * Lista todas as instâncias existentes no servidor UAZAPI (Requer Admin Token)
   */
  async listInstances(): Promise<UazapiInstance[]> {
    const baseUrl = this.getServerUrl();
    const adminToken = this.getAdminToken();
    if (!baseUrl || !adminToken) return [];

    try {
      const res = await fetch(`${baseUrl}/instance/all`, {
        method: 'GET',
        headers: { admintoken: adminToken }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  /**
   * Cria uma nova instância no servidor UAZAPI (Requer Admin Token)
   */
  async createInstance(name: string): Promise<{ success: boolean; token?: string; error?: string }> {
    const baseUrl = this.getServerUrl();
    const adminToken = this.getAdminToken();

    if (!baseUrl) throw new Error('URL do servidor UAZAPI não configurada.');
    if (!adminToken) throw new Error('Admin Token da UAZAPI não configurado.');

    const res = await fetch(`${baseUrl}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'admintoken': adminToken,
      },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || `Erro HTTP ${res.status} ao criar instância.`);
    }

    const data = await res.json();
    return {
      success: true,
      token: data.token || data.instance?.token || data.key || data.id,
    };
  },

  /**
   * Obtém um token de instância existente ou cria uma nova com recuperação inteligente de limites
   */
  async getOrCreateInstance(name: string, preferredToken?: string): Promise<{ token: string; isNew: boolean }> {
    if (preferredToken && preferredToken.trim()) {
      return { token: preferredToken.trim(), isNew: false };
    }

    const adminToken = this.getAdminToken();
    if (!adminToken) {
      const fallbackToken = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return { token: fallbackToken, isNew: true };
    }

    // 1. Consulta instâncias existentes
    const existing = await this.listInstances();

    // 2. Se encontrar uma instância desconectada, reutiliza-a
    const disconnected = existing.find(i => i.status === 'disconnected' && i.token);
    if (disconnected && disconnected.token) {
      return { token: disconnected.token, isNew: false };
    }

    // 3. Tenta criar uma nova
    try {
      const instanceName = `f5_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
      const created = await this.createInstance(instanceName);
      if (created.token) {
        return { token: created.token, isNew: true };
      }
    } catch (err: any) {
      // Se estourou limite de instâncias (429), reutiliza a primeira instância disponível
      if (existing.length > 0 && existing[0].token) {
        return { token: existing[0].token, isNew: false };
      }
      throw err;
    }

    const fallbackToken = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return { token: fallbackToken, isNew: true };
  },

  /**
   * Inicia o fluxo de conexão do WhatsApp (Gera QR Code ou Código de Pareamento)
   */
  async connectInstance(
    instanceToken: string, 
    options?: string | UazapiConnectOptions
  ): Promise<UazapiConnectResponse> {
    const baseUrl = this.getServerUrl();
    if (!baseUrl) throw new Error('URL do servidor UAZAPI não configurada.');
    if (!instanceToken) throw new Error('Token da instância não fornecido.');

    const body: Record<string, any> = {
      browser: 'auto',
    };

    if (typeof options === 'string') {
      const clean = options.replace(/\D/g, '');
      if (clean) body.phone = clean;
    } else if (options && typeof options === 'object') {
      if (options.phone) {
        const clean = options.phone.replace(/\D/g, '');
        if (clean) body.phone = clean;
      }
      if (options.browser) body.browser = options.browser;
      if (options.systemName) body.systemName = options.systemName;
      if (options.proxy_managed_country) body.proxy_managed_country = options.proxy_managed_country;
      if (options.proxy_managed_state) body.proxy_managed_state = options.proxy_managed_state;
      if (options.proxy_managed_city) body.proxy_managed_city = options.proxy_managed_city;
    }

    const res = await fetch(`${baseUrl}/instance/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': instanceToken,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      // Caso 409 (Já existe fluxo de conexão em andamento), tenta consultar status atual
      if (res.status === 409) {
        try {
          const statusRes = await this.getInstanceStatus(instanceToken);
          return {
            status: statusRes.status || 'connecting',
            qrcode: statusRes.instance?.qrcode,
            pairingCode: statusRes.instance?.paircode,
            loggedIn: statusRes.loggedIn,
            connected: statusRes.connected,
            instance: statusRes.instance,
          };
        } catch {
          // Continua para erro padrão se falhar
        }
      }

      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || `Erro HTTP ${res.status} ao iniciar conexão.`);
    }

    const data = await res.json();
    const inst = data.instance || {};

    const qrcode = inst.qrcode || data.qrcode || data.base64 || data.qr || undefined;
    const pairingCode = inst.paircode || data.pairingCode || data.paircode || data.code || undefined;
    const isConnected = data.connected ?? (data.status === 'connected' || inst.status === 'connected' || false);
    const isLoggedIn = data.loggedIn ?? (isConnected || data.status === 'connected' || inst.status === 'connected' || false);

    return {
      connected: isConnected,
      loggedIn: isLoggedIn,
      jid: data.jid || null,
      status: data.status || inst.status || (isLoggedIn ? 'connected' : 'connecting'),
      qrcode,
      pairingCode,
      instance: data.instance || {
        token: instanceToken,
        status: data.status || 'connecting',
        qrcode,
        paircode: pairingCode,
      },
      count: data.count,
    };
  },

  /**
   * Consulta o status da instância (disconnected, connecting, connected, hibernated)
   */
  async getInstanceStatus(instanceToken: string): Promise<UazapiInstanceStatusResponse> {
    const baseUrl = this.getServerUrl();
    if (!baseUrl) throw new Error('URL do servidor UAZAPI não configurada.');
    if (!instanceToken) throw new Error('Token da instância não fornecido.');

    const res = await fetch(`${baseUrl}/instance/status`, {
      method: 'GET',
      headers: {
        'token': instanceToken,
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        return { status: 'disconnected', loggedIn: false, connected: false };
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || `Erro HTTP ${res.status} ao consultar status.`);
    }

    const data = await res.json();
    const inst = data.instance || {};
    const statusObj = data.status || {};

    const isConnected = typeof statusObj === 'object' && typeof statusObj.connected === 'boolean'
      ? statusObj.connected
      : (data.connected === true || inst.status === 'connected' || statusObj === 'connected' || false);

    const isLoggedIn = typeof statusObj === 'object' && typeof statusObj.loggedIn === 'boolean'
      ? statusObj.loggedIn
      : (isConnected || inst.loggedIn === true);

    const rawPhone = (typeof statusObj === 'object' && statusObj?.jid?.user) || data.phone || inst.owner || inst.phone || '';
    const phone = rawPhone ? String(rawPhone).replace(/@.*$/, '').replace(/\D/g, '') : '';

    const effectiveStatus: string = inst.status || (typeof statusObj === 'string' ? statusObj : (isConnected ? 'connected' : 'disconnected'));

    // Ignora códigos técnicos internos como 'f5_teste_...' para o nome de exibição
    const candidateName = inst.profileName || data.profileName || inst.name || data.name || '';
    const isTechnicalName = candidateName.toLowerCase().startsWith('f5_') || candidateName.toLowerCase().startsWith('inst_');
    const profileName = isTechnicalName ? '' : candidateName;

    let profilePictureUrl = inst.profilePicUrl || inst.profilePictureUrl || data.profilePicUrl || data.profilePictureUrl || inst.avatar || '';

    // Se estiver conectado mas sem foto, tenta buscar a foto do perfil ativamente
    if (isLoggedIn && phone && !profilePictureUrl) {
      try {
        const fetchedPic = await this.fetchProfilePicture(instanceToken, phone);
        if (fetchedPic) profilePictureUrl = fetchedPic;
      } catch {
        // Ignora falha de busca de foto
      }
    }

    return {
      status: effectiveStatus as any,
      phone,
      profileName,
      profilePictureUrl,
      loggedIn: isLoggedIn,
      connected: isConnected,
      instance: {
        ...inst,
        owner: phone || inst.owner,
        profileName,
        profilePicUrl: profilePictureUrl,
        status: effectiveStatus,
      },
    };
  },

  /**
   * Desconecta a sessão do WhatsApp
   */
  async disconnectInstance(instanceToken: string): Promise<boolean> {
    const baseUrl = this.getServerUrl();
    if (!baseUrl) throw new Error('URL do servidor UAZAPI não configurada.');
    if (!instanceToken) return false;

    const res = await fetch(`${baseUrl}/instance/disconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': instanceToken,
      },
      body: JSON.stringify({}),
    });

    return res.ok;
  },

  /**
   * Envia uma mensagem de texto pelo WhatsApp
   */
  async sendText(instanceToken: string, payload: UazapiSendTextPayload): Promise<UazapiSendMessageResponse> {
    const baseUrl = this.getServerUrl();
    if (!baseUrl) throw new Error('URL do servidor UAZAPI não configurada.');
    if (!instanceToken) throw new Error('Token da instância não fornecido.');

    let finalNumber = payload.number.trim();
    const cleanDigits = finalNumber.replace(/@.*$/, '').replace(/\D/g, '');

    if (finalNumber.includes('@lid') || (cleanDigits.length >= 14 && cleanDigits.startsWith('15'))) {
      const contact = await this.fetchChatContactInfo(instanceToken, cleanDigits);
      if (contact.realPhone && contact.realPhone.length <= 13) {
        finalNumber = normalizeWhatsAppNumber(contact.realPhone);
      } else {
        finalNumber = `${cleanDigits}@lid`;
      }
    } else {
      finalNumber = normalizeWhatsAppNumber(cleanDigits);
    }

    const body: Record<string, any> = {
      number: finalNumber,
      text: payload.text,
    };
    if (payload.linkPreview !== undefined) body.linkPreview = payload.linkPreview;
    if (payload.readchat !== undefined) body.readchat = payload.readchat;
    if (payload.delay && payload.delay > 0) body.delay = payload.delay;
    if (payload.async !== undefined) body.async = payload.async;
    if (payload.replyid) body.replyid = payload.replyid;
    if (payload.track_source) body.track_source = payload.track_source;
    if (payload.track_id) body.track_id = payload.track_id;

    const res = await fetch(`${baseUrl}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': instanceToken,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const ptbrMsg = err.message_ptbr || err.provider_message_ptbr;
      const codePrefix = err.provider_code ? `[Erro ${err.provider_code}] ` : (err.error_key ? `[${err.error_key}] ` : '');
      const finalMsg = ptbrMsg 
        ? `${codePrefix}${ptbrMsg}`
        : (err.error || err.message || `Falha ao enviar mensagem (HTTP ${res.status})`);
      throw new Error(finalMsg);
    }

    return await res.json();
  },

  /**
   * Envia uma mídia (imagem, vídeo, áudio/voz PTT, documento)
   */
  async sendMedia(instanceToken: string, payload: UazapiSendMediaPayload): Promise<UazapiSendMessageResponse> {
    const baseUrl = this.getServerUrl();
    if (!baseUrl) throw new Error('URL do servidor UAZAPI não configurada.');
    if (!instanceToken) throw new Error('Token da instância não fornecido.');

    let finalNumber = payload.number.trim();
    const cleanDigits = finalNumber.replace(/@.*$/, '').replace(/\D/g, '');

    if (finalNumber.includes('@lid') || (cleanDigits.length >= 14 && cleanDigits.startsWith('15'))) {
      const contact = await this.fetchChatContactInfo(instanceToken, cleanDigits);
      if (contact.realPhone && contact.realPhone.length <= 13) {
        finalNumber = normalizeWhatsAppNumber(contact.realPhone);
      } else {
        finalNumber = `${cleanDigits}@lid`;
      }
    } else {
      finalNumber = normalizeWhatsAppNumber(cleanDigits);
    }

    const res = await fetch(`${baseUrl}/send/media`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': instanceToken,
      },
      body: JSON.stringify({
        ...payload,
        number: finalNumber,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const ptbrMsg = err.message_ptbr || err.provider_message_ptbr;
      const codePrefix = err.provider_code ? `[Erro ${err.provider_code}] ` : (err.error_key ? `[${err.error_key}] ` : '');
      const finalMsg = ptbrMsg 
        ? `${codePrefix}${ptbrMsg}`
        : (err.error || err.message || `Falha ao enviar mídia (HTTP ${res.status})`);
      throw new Error(finalMsg);
    }

    return await res.json();
  },

  /**
   * Envia uma figurinha / sticker para o WhatsApp
   */
  async sendSticker(instanceToken: string, payload: { number: string; file: string; delay?: number }): Promise<UazapiSendMessageResponse> {
    const baseUrl = this.getServerUrl();
    if (!baseUrl) throw new Error('URL do servidor UAZAPI não configurada.');
    if (!instanceToken) throw new Error('Token da instância não fornecido.');

    let finalNumber = normalizeWhatsAppNumber(payload.number.trim());

    try {
      // 1. Tenta rota dedicada /send/sticker
      const res = await fetch(`${baseUrl}/send/sticker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': instanceToken,
        },
        body: JSON.stringify({
          number: finalNumber,
          file: payload.file,
          delay: payload.delay,
        }),
      });

      if (res.ok) {
        return await res.json();
      }
    } catch {}

    // 2. Fallback para /send/media com type: 'sticker'
    return this.sendMedia(instanceToken, {
      number: finalNumber,
      file: payload.file,
      type: 'sticker' as any,
      delay: payload.delay,
    });
  },

  /**
   * Baixa a mídia transitória do CDN da UAZAPI e transcreve áudio se solicitado
   */
  async downloadMedia(instanceToken: string, payload: UazapiDownloadMediaPayload): Promise<UazapiDownloadMediaResponse> {
    const baseUrl = this.getServerUrl();
    if (!baseUrl) throw new Error('URL do servidor UAZAPI não configurada.');
    if (!instanceToken) throw new Error('Token da instância não fornecido.');

    const res = await fetch(`${baseUrl}/message/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': instanceToken,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || `Falha no download da mídia (HTTP ${res.status})`);
    }

    return await res.json();
  },

  /**
   * Reage a uma mensagem existente com emoji
   */
  async reactMessage(instanceToken: string, payload: UazapiReactPayload): Promise<boolean> {
    const baseUrl = this.getServerUrl();
    if (!baseUrl) return false;

    const res = await fetch(`${baseUrl}/message/react`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': instanceToken,
      },
      body: JSON.stringify(payload),
    });

    return res.ok;
  },

  /**
   * Envia uma atualização de presença em tempo real para o WhatsApp (digitando, gravando áudio ou pausado)
   * Suporta POST /send/presence e POST /message/presence
   */
  async sendPresence(
    instanceToken: string,
    payload: {
      number: string;
      presence: 'composing' | 'recording' | 'paused';
      delay?: number;
    }
  ): Promise<boolean> {
    const baseUrl = this.getServerUrl();
    if (!baseUrl || !instanceToken) return false;
    const cleanNumber = normalizeWhatsAppNumber(payload.number);
    if (!cleanNumber || cleanNumber.length < 8) return false;

    const body: Record<string, any> = {
      number: cleanNumber,
      phone: cleanNumber,
      remoteJid: `${cleanNumber}@s.whatsapp.net`,
      presence: payload.presence,
    };
    if (typeof payload.delay === 'number' && payload.delay > 0) {
      body.delay = payload.delay > 300 ? Math.min(300, Math.round(payload.delay / 1000)) : Math.min(300, Math.round(payload.delay));
    }

    try {
      // 1. Tenta /send/presence (padrão oficial de rotas de envio da UAZAPI)
      let res = await fetch(`${baseUrl}/send/presence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': instanceToken,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        // 2. Fallback para /message/presence
        res = await fetch(`${baseUrl}/message/presence`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'token': instanceToken,
          },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        // 3. Fallback para /chat/sendPresence
        res = await fetch(`${baseUrl}/chat/sendPresence`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'token': instanceToken,
          },
          body: JSON.stringify(body),
        });
      }

      return res.ok;
    } catch (err) {
      console.warn('[UAZAPI Presence Warning]:', err);
      return false;
    }
  },

  /**
   * Configura webhook na instância
   */
  async setWebhook(instanceToken: string, config: UazapiWebhookConfig): Promise<boolean> {
    const baseUrl = this.getServerUrl();
    if (!baseUrl) return false;

    const res = await fetch(`${baseUrl}/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': instanceToken,
      },
      body: JSON.stringify(config),
    });

    return res.ok;
  },

  /**
   * Configura webhook global no servidor UAZAPI (Requer Admin Token)
   */
  async setGlobalWebhook(config: UazapiGlobalWebhookConfig): Promise<{ success: boolean; data?: any; error?: string }> {
    const baseUrl = this.getServerUrl();
    const adminToken = this.getAdminToken();
    if (!baseUrl) throw new Error('URL do servidor UAZAPI não configurada.');
    if (!adminToken) throw new Error('Admin Token da UAZAPI não configurado.');

    const res = await fetch(`${baseUrl}/globalwebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'admintoken': adminToken,
      },
      body: JSON.stringify({
        url: config.url,
        events: config.events || ['messages', 'connection', 'messages_update'],
        excludeMessages: config.excludeMessages || ['wasSentByApi'],
        addUrlEvents: config.addUrlEvents ?? false,
        addUrlTypesMessages: config.addUrlTypesMessages ?? false,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || `Erro HTTP ${res.status} ao configurar webhook global.`);
    }

    const data = await res.json();
    return { success: true, data };
  },

  /**
   * Obtém informações completas de contato e foto do chat na UAZAPI
   */
  async fetchChatContactInfo(instanceToken: string, identifier: string): Promise<{ profilePicUrl: string | null; realPhone?: string; contactName?: string }> {
    const baseUrl = this.getServerUrl();
    if (!baseUrl || !instanceToken) return { profilePicUrl: null };
    const cleanNumber = identifier.replace(/\D/g, '');
    if (!cleanNumber || cleanNumber.length < 8) return { profilePicUrl: null };

    const queryBodies = [
      cleanNumber.length >= 14 || cleanNumber.startsWith('15') ? { wa_chatlid: `${cleanNumber}@lid` } : { wa_chatid: `${cleanNumber}@s.whatsapp.net` },
      { wa_chatid: `${cleanNumber}@s.whatsapp.net` },
      { wa_chatlid: `${cleanNumber}@lid` },
      { phone: cleanNumber },
    ];

    for (const body of queryBodies) {
      try {
        const res = await fetch(`${baseUrl}/chat/find`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'token': instanceToken,
          },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          const data = await res.json();
          const chat = data.chats?.[0];
          if (chat) {
            const pic = chat.image || chat.imagePreview || chat.profilePictureUrl || chat.avatar || null;
            const realPhone = chat.wa_chatid ? chat.wa_chatid.replace(/@.*$/, '').replace(/\D/g, '') : (chat.phone ? chat.phone.replace(/\D/g, '') : undefined);
            const contactName = chat.wa_name || chat.wa_contactName || chat.name || undefined;
            return {
              profilePicUrl: typeof pic === 'string' && pic.startsWith('http') ? pic : null,
              realPhone,
              contactName,
            };
          }
        }
      } catch {
        // Continua
      }
    }

    return { profilePicUrl: null };
  },

  /**
   * Consulta os detalhes completos de um chat/contato (POST /chat/details)
   */
  async fetchChatDetails(instanceToken: string, number: string, preview = false): Promise<{
    name?: string;
    wa_name?: string;
    wa_contactName?: string;
    phone?: string;
    image?: string;
    imagePreview?: string;
    wa_unreadCount?: number;
    raw?: any;
  } | null> {
    const baseUrl = this.getServerUrl();
    if (!baseUrl || !instanceToken) return null;
    const cleanNumber = number.replace(/\D/g, '');
    if (!cleanNumber || cleanNumber.length < 8) return null;

    try {
      const res = await fetch(`${baseUrl}/chat/details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': instanceToken,
        },
        body: JSON.stringify({
          number: cleanNumber,
          preview,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawJid = data.jid || data.id || data.wa_jid || data.wa_id || '';
        let realPhone = '';
        if (data.phone) {
          const p = String(data.phone).replace(/\D/g, '');
          if (p.length >= 10 && p.length <= 13) realPhone = p;
        }
        if (!realPhone && typeof rawJid === 'string' && rawJid.includes('@s.whatsapp.net')) {
          const p = rawJid.replace(/@.*$/, '').replace(/\D/g, '');
          if (p.length >= 10 && p.length <= 13) realPhone = p;
        }

        return {
          name: data.name || data.lead_name || data.lead_fullName || data.wa_name || data.wa_contactName,
          wa_name: data.wa_name,
          wa_contactName: data.wa_contactName,
          phone: realPhone || data.phone || cleanNumber,
          image: data.image || data.profilePicUrl,
          imagePreview: data.imagePreview,
          wa_unreadCount: data.wa_unreadCount,
          raw: data,
        };
      }
    } catch (err) {
      console.warn('Erro em fetchChatDetails:', err);
    }
    return null;
  },

  /**
   * Obtém a foto de perfil atualizada de um contato no WhatsApp
   */
  async fetchProfilePicture(instanceToken: string, phone: string): Promise<string | null> {
    const details = await this.fetchChatDetails(instanceToken, phone);
    if (details?.image) return details.image;
    const info = await this.fetchChatContactInfo(instanceToken, phone);
    return info.profilePicUrl;
  },

  /**
   * Lista conversas recentes ativas na instância do WhatsApp
   */
  async listRecentChats(instanceToken: string, limit = 100): Promise<any[]> {
    const baseUrl = this.getServerUrl();
    if (!baseUrl || !instanceToken) return [];

    const queryBodies = [
      { limit, sort: '-updatedAt' },
      { limit },
      {},
    ];

    for (const body of queryBodies) {
      try {
        const res = await fetch(`${baseUrl}/chat/find`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'token': instanceToken,
          },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          const data = await res.json();
          const chats = Array.isArray(data) ? data : (data.chats || data.data || []);
          if (Array.isArray(chats) && chats.length > 0) {
            return chats;
          }
        }
      } catch {
        // Tenta próximo formato
      }
    }
    return [];
  },

  /**
   * Busca histórico de mensagens de uma conversa específica
   */
  async fetchChatMessages(instanceToken: string, phoneOrChatId: string, limit = 50): Promise<any[]> {
    const baseUrl = this.getServerUrl();
    if (!baseUrl || !instanceToken) return [];
    const cleanPhone = phoneOrChatId.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 8) return [];

    const possibleChatIds = [
      cleanPhone.length >= 14 || cleanPhone.startsWith('15') ? `${cleanPhone}@lid` : `${cleanPhone}@s.whatsapp.net`,
      `${cleanPhone}@s.whatsapp.net`,
      cleanPhone,
    ];

    for (const chatId of possibleChatIds) {
      try {
        const res = await fetch(`${baseUrl}/chat/findMessages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'token': instanceToken,
          },
          body: JSON.stringify({
            chatid: chatId,
            limit,
            order: 'asc',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const messages = Array.isArray(data) ? data : (data.messages || data.data || []);
          if (Array.isArray(messages) && messages.length > 0) {
            return messages;
          }
        }
      } catch {
        // Tenta próximo
      }
    }
    return [];
  },

  /**
   * Recupera mensagens recebidas e enviadas dentro de um intervalo de tempo (Gap Recovery)
   * Útil para sincronizar mensagens perdidas durante período de desconexão ou queda de internet.
   */
  async recoverMessagesInInterval(instanceToken: string, options: {
    startTimestamp: number;
    endTimestamp?: number;
    limitPerChat?: number;
  }): Promise<Array<{
    instanceToken: string;
    senderPhone: string;
    senderName: string;
    profilePicUrl?: string;
    text: string;
    mediaType?: 'text' | 'image' | 'video' | 'audio' | 'document';
    mediaUrl?: string;
    timestamp: string;
    fromMe?: boolean;
    rawPayload: any;
  }>> {
    const { startTimestamp, endTimestamp = Date.now(), limitPerChat = 50 } = options;
    const chats = await this.listRecentChats(instanceToken, 100);
    if (!chats || chats.length === 0) return [];

    const recoveredMessages: Array<any> = [];
    const seenMsgIds = new Set<string>();

    for (const chat of chats) {
      const rawJid = chat.wa_chatid || chat.id || chat.jid || '';
      if (rawJid.includes('@g.us') || rawJid.includes('@newsletter') || rawJid.includes('@broadcast') || rawJid === 'status@broadcast') {
        continue;
      }

      const phone = chat.phone ? chat.phone.replace(/\D/g, '') : (rawJid ? rawJid.replace(/:\d+.*$/, '').replace(/:\d+@/, '@').replace(/@.*$/, '').replace(/\D/g, '') : '');
      if (!phone || phone.length < 8) continue;

      const chatName = chat.wa_name || chat.name || chat.wa_contactName || '';
      const chatImage = chat.image || chat.imagePreview || chat.profilePictureUrl || undefined;

      // 1. Tenta buscar mensagens detalhadas do chat via findMessages
      const messages = await this.fetchChatMessages(instanceToken, phone, limitPerChat);

      if (messages.length > 0) {
        for (const msg of messages) {
          const msgId = msg.id || msg.key?.id;
          if (msgId && seenMsgIds.has(msgId)) continue;
          if (msgId) seenMsgIds.add(msgId);

          let msgTime = 0;
          if (typeof msg.messageTimestamp === 'number') {
            msgTime = msg.messageTimestamp > 1e11 ? msg.messageTimestamp : msg.messageTimestamp * 1000;
          } else if (msg.timestamp) {
            msgTime = new Date(msg.timestamp).getTime();
          } else if (msg.createdAt) {
            msgTime = new Date(msg.createdAt).getTime();
          }

          // Filtra pelo intervalo de tempo especificado
          if (msgTime > 0 && (msgTime < startTimestamp || msgTime > endTimestamp)) {
            continue;
          }

          if (msg.wasSentByApi === true) continue;

          const isFromMe = msg.fromMe === true || msg.key?.fromMe === true;
          let text = '';
          if (typeof msg.message === 'string') text = msg.message;
          else if (typeof msg.text === 'string') text = msg.text;
          else if (msg.message?.conversation) text = msg.message.conversation;
          else if (msg.message?.extendedTextMessage?.text) text = msg.message.extendedTextMessage.text;
          else if (msg.message?.imageMessage?.caption) text = msg.message.imageMessage.caption;
          else if (msg.message?.videoMessage?.caption) text = msg.message.videoMessage.caption;
          else if (msg.message?.documentMessage?.caption) text = msg.message.documentMessage.caption;
          else if (msg.caption) text = msg.caption;

          // Detecção precisa de tipo de mídia
          let detectedMediaType: 'text' | 'image' | 'video' | 'audio' | 'document' = 'text';
          const msgType = String(msg.messageType || msg.type || '').toLowerCase();
          const hasImage = Boolean(msg.message?.imageMessage || msgType.includes('image'));
          const hasVideo = Boolean(msg.message?.videoMessage || msgType.includes('video') || msgType.includes('ptv'));
          const hasAudio = Boolean(msg.message?.audioMessage || msg.message?.voiceMessage || msgType.includes('audio') || msgType.includes('ptt') || msgType.includes('voice'));
          const hasDocument = Boolean(msg.message?.documentMessage || msgType.includes('document'));

          if (hasImage) detectedMediaType = 'image';
          else if (hasVideo) detectedMediaType = 'video';
          else if (hasAudio) detectedMediaType = 'audio';
          else if (hasDocument) detectedMediaType = 'document';

          // Extração completa de URL de mídia da UAZAPI
          const mediaUrl = msg.mediaUrl || msg.fileURL || msg.url || msg.file || 
            msg.data?.mediaUrl || msg.data?.fileURL || msg.data?.url ||
            msg.message?.imageMessage?.url || msg.message?.videoMessage?.url || 
            msg.message?.audioMessage?.url || msg.message?.documentMessage?.url || undefined;

          // Texto amigável de fallback para mídias sem legenda
          if (!text) {
            if (hasAudio) text = '🎵 Mensagem de voz';
            else if (hasImage) text = '📷 Foto';
            else if (hasVideo) text = '🎥 Vídeo';
            else if (hasDocument) text = msg.fileName ? `📄 Documento: ${msg.fileName}` : '📄 Documento';
          }

          if (!text && !mediaUrl) continue;

          recoveredMessages.push({
            instanceToken,
            senderPhone: phone,
            senderName: isFromMe ? 'WhatsApp App / Web' : (chatName || 'Cliente (WhatsApp)'),
            profilePicUrl: chatImage,
            text: text || '[Mensagem]',
            mediaType: detectedMediaType,
            mediaUrl,
            timestamp: new Date(msgTime || Date.now()).toISOString(),
            fromMe: isFromMe,
            rawPayload: msg,
          });
        }
      } else if (chat.wa_lastMessage && chat.wa_lastMessageTimestamp) {
        // Fallback: Usa o lastMessage do chat se caiu no intervalo
        let lastTime = 0;
        if (typeof chat.wa_lastMessageTimestamp === 'number') {
          lastTime = chat.wa_lastMessageTimestamp > 1e11 ? chat.wa_lastMessageTimestamp : chat.wa_lastMessageTimestamp * 1000;
        } else {
          lastTime = new Date(chat.wa_lastMessageTimestamp).getTime();
        }

        if (lastTime >= startTimestamp && lastTime <= endTimestamp) {
          const isFromMe = chat.wa_lastMessageFromMe === true;
          recoveredMessages.push({
            instanceToken,
            senderPhone: phone,
            senderName: isFromMe ? 'WhatsApp App / Web' : (chatName || 'Cliente (WhatsApp)'),
            profilePicUrl: chatImage,
            text: typeof chat.wa_lastMessage === 'string' ? chat.wa_lastMessage : '[Mensagem]',
            timestamp: new Date(lastTime).toISOString(),
            fromMe: isFromMe,
            rawPayload: chat,
          });
        }
      }
    }

    // Ordena todas as mensagens recuperadas por timestamp ascendente
    recoveredMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return recoveredMessages;
  },

  /**
   * Configura o Webhook da Instância WhatsApp na UAZAPI
   * Endpoint: POST /webhook
   * Header: token: $INSTANCE_TOKEN
   */
  async configureWebhook(
    instanceToken: string,
    options: {
      url: string;
      enabled?: boolean;
      events?: string[];
      excludeMessages?: string[];
      addUrlEvents?: boolean;
      addUrlTypesMessages?: boolean;
    }
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const baseUrl = this.getServerUrl();
    if (!baseUrl || !instanceToken) {
      return { success: false, error: 'Server URL ou Instance Token não configurados.' };
    }

    try {
      const payload = {
        enabled: options.enabled ?? true,
        url: options.url,
        events: options.events || ['messages', 'messages_update', 'connection', 'presence'],
        excludeMessages: options.excludeMessages || ['wasSentByApi'],
        addUrlEvents: options.addUrlEvents ?? false,
        addUrlTypesMessages: options.addUrlTypesMessages ?? false,
      };

      const res = await fetch(`${baseUrl}/webhook`, {
        method: 'POST',
        headers: {
          token: instanceToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, error: `Erro HTTP ${res.status}: ${errText}` };
      }

      const data = await res.json().catch(() => ({}));
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message || 'Falha ao configurar webhook na UAZAPI.' };
    }
  },

  /**
   * Consulta a configuração atual do Webhook da Instância
   * Endpoint: GET /webhook
   * Header: token: $INSTANCE_TOKEN
   */
  async getWebhook(instanceToken: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const baseUrl = this.getServerUrl();
    if (!baseUrl || !instanceToken) {
      return { success: false, error: 'Server URL ou Instance Token não configurados.' };
    }

    try {
      const res = await fetch(`${baseUrl}/webhook`, {
        method: 'GET',
        headers: {
          token: instanceToken,
        },
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, error: `Erro HTTP ${res.status}: ${errText}` };
      }

      const data = await res.json();
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message || 'Falha ao consultar webhook da UAZAPI.' };
    }
  },

  /**
   * Remove ou desativa o Webhook da Instância
   * Endpoint: DELETE /webhook ou POST /webhook com enabled: false
   */
  async deleteWebhook(instanceToken: string): Promise<{ success: boolean; error?: string }> {
    const baseUrl = this.getServerUrl();
    if (!baseUrl || !instanceToken) {
      return { success: false, error: 'Server URL ou Instance Token não configurados.' };
    }

    try {
      // Tenta DELETE primeiro
      const res = await fetch(`${baseUrl}/webhook`, {
        method: 'DELETE',
        headers: {
          token: instanceToken,
        },
      });

      if (res.ok) return { success: true };

      // Fallback: POST com enabled: false
      return await this.configureWebhook(instanceToken, {
        url: '',
        enabled: false,
      });
    } catch (err: any) {
      return { success: false, error: err.message || 'Falha ao remover webhook.' };
    }
  },

  /**
   * Configura o Webhook Global da UAZAPI (para todas as instâncias de uma só vez)
   * Endpoint: POST /globalwebhook
   * Header: admintoken: $ADMIN_TOKEN
   */
  async configureGlobalWebhook(options: {
    url: string;
    enabled?: boolean;
    events?: string[];
    excludeMessages?: string[];
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const baseUrl = this.getServerUrl();
    const adminToken = this.getAdminToken();
    if (!baseUrl || !adminToken) {
      return { success: false, error: 'Server URL ou Admin Token não configurados.' };
    }

    try {
      const payload = {
        enabled: options.enabled ?? true,
        url: options.url,
        events: options.events || ['messages', 'messages_update', 'connection', 'presence'],
        excludeMessages: options.excludeMessages || ['wasSentByApi'],
      };

      const res = await fetch(`${baseUrl}/globalwebhook`, {
        method: 'POST',
        headers: {
          admintoken: adminToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, error: `Erro HTTP ${res.status}: ${errText}` };
      }

      const data = await res.json().catch(() => ({}));
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message || 'Falha ao configurar webhook global.' };
    }
  },

  /**
   * Consulta o Webhook Global da UAZAPI
   * Endpoint: GET /globalwebhook
   * Header: admintoken: $ADMIN_TOKEN
   */
  async getGlobalWebhook(): Promise<{ success: boolean; data?: any; error?: string }> {
    const baseUrl = this.getServerUrl();
    const adminToken = this.getAdminToken();
    if (!baseUrl || !adminToken) {
      return { success: false, error: 'Server URL ou Admin Token não configurados.' };
    }

    try {
      const res = await fetch(`${baseUrl}/globalwebhook`, {
        method: 'GET',
        headers: {
          admintoken: adminToken,
        },
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, error: `Erro HTTP ${res.status}: ${errText}` };
      }

      const data = await res.json();
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message || 'Falha ao consultar webhook global.' };
    }
  },
};

