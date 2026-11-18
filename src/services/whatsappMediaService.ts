import { cloudflareR2Service } from '../lib/cloudflareR2';
import { uazapiService } from './uazapiService';
import { classifyMediaKind, decideMediaStorage } from '../utils/mediaStoragePolicy';

export type MediaFailureKind = 'not_found' | 'no_media' | 'server' | 'network' | 'phone';

/** Etapas do download híbrido, para a interface mostrar o que está acontecendo. */
export type MediaFetchStage = 'api' | 'phone' | 'retry';

export interface PhoneFallbackHooks {
  onStage?: (stage: MediaFetchStage) => void;
  /** Mensagem vizinha mais nova do mesmo chat, usada como âncora no history-sync (que busca mensagens ANTERIORES a ela). */
  anchor?: { number: string; messageid?: string; timestamp?: number; fromMe?: boolean };
}

/** Falha de download classificada, para mostrar um motivo claro ao usuário (em vez de um toast genérico). */
export class MediaDownloadError extends Error {
  kind: MediaFailureKind;
  constructor(kind: MediaFailureKind, message: string) {
    super(message);
    this.name = 'MediaDownloadError';
    this.kind = kind;
  }
}

/** A mídia é pesada demais para subir automaticamente: fica pendente até o usuário escolher salvar. */
export class MediaPendingError extends Error {
  sizeBytes?: number;
  constructor(message: string, sizeBytes?: number) {
    super(message);
    this.name = 'MediaPendingError';
    this.sizeBytes = sizeBytes;
  }
}

/** Descobre o peso do arquivo sem baixá-lo (HEAD). Retorna undefined se o servidor não informar. */
async function probeRemoteSize(url: string): Promise<number | undefined> {
  try {
    const head = await fetch(url, { method: 'HEAD' });
    const len = Number(head.headers.get('content-length'));
    return Number.isFinite(len) && len > 0 ? len : undefined;
  } catch {
    return undefined;
  }
}

export function describeMediaFailure(kind: MediaFailureKind): string {
  switch (kind) {
    case 'not_found':
      return 'A mensagem não está mais disponível na UAZAPI (a janela de retenção é de cerca de 7 dias). Peça o histórico ao celular e tente de novo.';
    case 'no_media':
      return 'A UAZAPI não encontrou arquivo nesta mensagem.';
    case 'phone':
      return 'Não foi possível puxar a mídia nem pelo celular. Abra o WhatsApp no celular deste chip e deixe-o aberto (ou em segundo plano) com internet; depois tente novamente.';
    case 'server':
      return 'A UAZAPI não conseguiu baixar o arquivo agora. Tente novamente em instantes.';
    default:
      return 'Falha de conexão ao baixar o arquivo. Verifique a internet e tente novamente.';
  }
}

/**
 * Lista, em ordem de preferência, os identificadores possíveis de uma mensagem na UAZAPI.
 * Formatos vistos: `owner:messageid` (completo, vindo de /message/find e do histórico) e `messageid` (curto).
 * Nunca usa o id interno da atividade (UUID gerado pelo F5), que não existe na UAZAPI.
 */
export function resolveMediaMessageIds(metadata: any): string[] {
  const raw = metadata?.rawPayload;
  const candidates = [
    metadata?.waId,
    raw?.id,
    metadata?.messageId,
    raw?.messageid,
    raw?.messageId,
    metadata?.messageid,
    metadata?.id,
    metadata?.key?.id,
    raw?.key?.id,
  ];
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const c of candidates) {
    const v = typeof c === 'string' ? c.trim() : '';
    if (v && !seen.has(v)) {
      seen.add(v);
      ids.push(v);
    }
  }
  return ids;
}

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm', 'video/3gpp': '3gp',
  'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/webm': 'webm',
  'application/pdf': 'pdf', 'application/zip': 'zip', 'text/plain': 'txt',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
};

function extensionFromMime(mimetype: string): string {
  const base = (mimetype || '').split(';')[0].trim().toLowerCase();
  if (MIME_EXTENSIONS[base]) return MIME_EXTENSIONS[base];
  const sub = base.split('/')[1] || 'bin';
  return /^[a-z0-9]{1,5}$/.test(sub) ? sub : 'bin';
}

function classifyDownloadError(err: any): MediaDownloadError {
  const status = Number(err?.status);
  const msg = String(err?.message || '');
  if (status === 404 || /message not found/i.test(msg)) return new MediaDownloadError('not_found', msg);
  if (status === 400 || /no media found|unsupported media/i.test(msg)) return new MediaDownloadError('no_media', msg);
  if (status >= 500) return new MediaDownloadError('server', msg);
  return new MediaDownloadError('network', msg || 'Falha de rede');
}

export interface IngestMediaOptions {
  instanceToken: string;
  messageId: string;
  /** Ids alternativos tentados (em ordem) se o principal não for encontrado pela UAZAPI */
  fallbackMessageIds?: string[];
  /** Pasta de armazenamento no R2 (use o id da origem/source; NUNCA o token da instância) */
  instanceId?: string;
  /**
   * Quando definido, aplica a política de peso (MEDIA_STORAGE_POLICY) ANTES de baixar/subir:
   * mídia pesada lança MediaPendingError em vez de ocupar o R2. Omita no clique manual "Salvar" (decisão do usuário).
   */
  enforcePolicy?: { mediaType?: string };
  transcribeAudio?: boolean;
  onProgress?: (percentage: number) => void;
}

export interface IngestMediaResult {
  permanentR2Url: string;
  mimetype: string;
  fileName: string;
  fileSize: number;
  transcription?: string;
  r2Key?: string;
}

const IS_LOCAL_DEV = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.includes('192.168.')
);

export const whatsappMediaService = {
  /**
   * Baixa a mídia da UAZAPI (que expira em 2 dias) e persiste no Cloudflare R2 permanentemente
   */
  async ingestTransientMedia(options: IngestMediaOptions): Promise<IngestMediaResult> {
    const { instanceToken, messageId, instanceId = 'default', transcribeAudio = true, onProgress } = options;

    // 1. Solicita a URL de download na UAZAPI, tentando cada formato de id (completo e curto) até um funcionar
    const idsToTry = [messageId, ...(options.fallbackMessageIds || [])].filter((v, i, a) => !!v && a.indexOf(v) === i);
    if (idsToTry.length === 0) {
      throw new MediaDownloadError('not_found', 'Mensagem sem identificador da UAZAPI.');
    }

    let downloadRes: Awaited<ReturnType<typeof uazapiService.downloadMedia>> | null = null;
    let lastError: MediaDownloadError | null = null;
    for (const candidateId of idsToTry) {
      try {
        downloadRes = await uazapiService.downloadMedia(instanceToken, {
          id: candidateId,
          transcribe: transcribeAudio,
          generate_mp3: true,
        });
        break;
      } catch (err: any) {
        lastError = classifyDownloadError(err);
        // Só vale tentar outro formato de id quando a mensagem não foi encontrada / sem mídia
        if (lastError.kind !== 'not_found' && lastError.kind !== 'no_media') throw lastError;
      }
    }
    if (!downloadRes) throw lastError || new MediaDownloadError('not_found', 'Mídia não encontrada.');

    if (!downloadRes.fileURL && !downloadRes.base64) {
      throw new MediaDownloadError('no_media', 'UAZAPI não retornou URL ou dados binários para o arquivo da mensagem.');
    }

    let fileBlob: Blob;
    const mimetype = downloadRes.mimetype || 'application/octet-stream';
    const ext = extensionFromMime(mimetype);
    const safeId = messageId.replace(/[^A-Za-z0-9_-]/g, '_');
    const fileName = downloadRes.fileName || `whatsapp_media_${safeId}.${ext}`;

    // Política de armazenamento: decide pelo peso antes de transferir qualquer byte para o R2
    if (options.enforcePolicy) {
      const kind = classifyMediaKind(options.enforcePolicy.mediaType, mimetype);
      const knownSize = downloadRes.fileURL
        ? await probeRemoteSize(downloadRes.fileURL)
        : downloadRes.base64 ? Math.floor(downloadRes.base64.length * 0.75) : undefined;
      const decision = decideMediaStorage(kind, knownSize);
      if (decision.action === 'pending') {
        throw new MediaPendingError(decision.reason || 'Mídia pesada: aguardando decisão do usuário', knownSize);
      }
    }

    if (downloadRes.fileURL) {
      // 2. Faz o download do CDN temporário da UAZAPI
      let mediaResponse: Response;
      try {
        mediaResponse = await fetch(downloadRes.fileURL);
      } catch (err: any) {
        throw new MediaDownloadError('network', err?.message || 'Falha de rede ao obter o arquivo temporário.');
      }
      if (!mediaResponse.ok) {
        throw new MediaDownloadError(
          mediaResponse.status >= 500 ? 'server' : 'not_found',
          `Falha ao obter arquivo temporário da UAZAPI (HTTP ${mediaResponse.status})`
        );
      }
      fileBlob = await mediaResponse.blob();
    } else {
      // Fallback base64
      const byteCharacters = atob(downloadRes.base64!);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
      }
      fileBlob = new Blob([byteArray], { type: mimetype });
    }

    // 3. Define a pasta e chave isolada no Cloudflare R2
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Regra Mestre F5: Local Dev isolado sob local_dev/
    const folder = IS_LOCAL_DEV
      ? `local_dev/whatsapp/${instanceId}/${yearMonth}`
      : `whatsapp/${instanceId}/${yearMonth}`;

    const customKey = `${safeId}_${Date.now()}.${ext}`;

    // 4. Upload para o Cloudflare R2 via presigned URL
    const permanentR2Url = await cloudflareR2Service.uploadFile(
      fileBlob,
      folder,
      (progress) => {
        onProgress?.(progress.percentage);
      },
      customKey
    );

    return {
      permanentR2Url,
      mimetype,
      fileName,
      fileSize: fileBlob.size,
      transcription: downloadRes.transcription,
      r2Key: `${folder}/${customKey}`,
    };
  },

  /**
   * Download híbrido e automático: 1) tenta pela UAZAPI; 2) se a mensagem/mídia não está lá, pede ao CELULAR
   * (/message/reload e, se preciso, /message/history-sync) e tenta baixar de novo por alguns segundos;
   * 3) se nada funcionar, lança MediaDownloadError('phone') para a interface orientar o usuário.
   */
  async ingestWithPhoneFallback(options: IngestMediaOptions, hooks: PhoneFallbackHooks = {}): Promise<IngestMediaResult> {
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    const isMissing = (e: unknown) => e instanceof MediaDownloadError && (e.kind === 'not_found' || e.kind === 'no_media');

    hooks.onStage?.('api');
    try {
      return await this.ingestTransientMedia(options);
    } catch (err) {
      if (!isMissing(err)) throw err;
    }

    // Não está disponível na UAZAPI: pede ao aparelho
    hooks.onStage?.('phone');
    const ids = [options.messageId, ...(options.fallbackMessageIds || [])].filter(Boolean);
    let asked = false;
    for (const id of ids) {
      const r = await uazapiService.reloadMessage(options.instanceToken, id);
      if (r.ok) { asked = true; break; }
      if (r.status === 500) break; // sem sessão ativa: tentar outro id não resolve
    }
    if (!asked && hooks.anchor) {
      const r = await uazapiService.requestHistorySync(options.instanceToken, { ...hooks.anchor, count: 50 });
      asked = r.ok && r.status !== 'blocked';
    }
    if (!asked) {
      throw new MediaDownloadError('phone', 'O celular não respondeu ao pedido de sincronização.');
    }

    // A cópia chega por webhook/SSE: tenta baixar de novo por até ~18 s
    hooks.onStage?.('retry');
    for (let attempt = 0; attempt < 6; attempt++) {
      await sleep(3000);
      try {
        return await this.ingestTransientMedia(options);
      } catch (err) {
        if (!isMissing(err)) throw err;
      }
    }
    throw new MediaDownloadError('phone', 'O celular não enviou a mídia no prazo.');
  },

  /**
   * Upload direto de uma mídia local (imagem, áudio gravado, PDF) para o R2 antes do envio
   */
  async uploadOutboundMedia(
    file: File | Blob,
    instanceId = 'default',
    onProgress?: (percentage: number) => void
  ): Promise<{ publicUrl: string; key: string }> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const folder = IS_LOCAL_DEV
      ? `local_dev/whatsapp/${instanceId}/${yearMonth}`
      : `whatsapp/${instanceId}/${yearMonth}`;

    const publicUrl = await cloudflareR2Service.uploadFile(
      file,
      folder,
      (progress) => {
        onProgress?.(progress.percentage);
      }
    );

    return {
      publicUrl,
      key: folder,
    };
  },

  /**
   * Sincroniza a foto de perfil de um contato do WhatsApp no R2 e atualiza o Supabase.
   * - Path fixo: avatars/{master_id}/picture_{contact_code}.jpg (PUT/sobrescreve)
   * - Trigger: quando o lead é aberto e avatar_refreshed_at > 7 dias ou null
   * - Se UAZAPI não retornar foto, mantém a última foto conhecida (nunca apaga)
   */
  async syncContactAvatar(
    contact: { phone?: string | null },
    instanceToken: string,
    masterId: string
  ): Promise<{ updated: boolean; avatarUrl: string | null }> {
    const { supabase } = await import('../lib/supabase');

    const phone = (contact.phone || '').replace(/\D/g, '');
    if (phone.length < 8) return { updated: false, avatarUrl: null };
    const tail = phone.slice(-9);

    // Resolve o contato real na central (isolado por master_id)
    const { data: row } = await supabase
      .from('contacts')
      .select('id, code, profile_picture_url, avatar_refreshed_at')
      .eq('master_id', masterId)
      .is('deleted_at', null)
      .or(`primary_phone.ilike.%${tail}%,secondary_phone.ilike.%${tail}%`)
      .limit(1)
      .maybeSingle();
    if (!row?.id || !row.code) return { updated: false, avatarUrl: null };

    const current: string | null = row.profile_picture_url || null;

    // TTL de 7 dias
    const lastRefresh = row.avatar_refreshed_at ? new Date(row.avatar_refreshed_at).getTime() : 0;
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    if (lastRefresh && Date.now() - lastRefresh < SEVEN_DAYS_MS) {
      return { updated: false, avatarUrl: current };
    }

    const touch = () =>
      supabase.from('contacts').update({ avatar_refreshed_at: new Date().toISOString() }).eq('id', row.id).eq('master_id', masterId);

    // Sem foto nova (privacidade/sem foto): mantém a última e só adia a próxima tentativa
    const freshUrl = await uazapiService.getProfilePicture(instanceToken, phone);
    if (!freshUrl) {
      await touch();
      return { updated: false, avatarUrl: current };
    }

    try {
      const res = await fetch(freshUrl);
      if (!res.ok) {
        await touch();
        return { updated: false, avatarUrl: current };
      }
      const blob = await res.blob();

      // Path fixo por contato: sobrescreve a anterior (1 foto por contato)
      const folder = IS_LOCAL_DEV ? `local_dev/avatars/${masterId}` : `avatars/${masterId}`;
      const permanentUrl = await cloudflareR2Service.uploadFile(blob, folder, undefined, `picture_${row.code}.jpg`);
      // Cache-bust para o navegador não servir a foto antiga do mesmo path
      const versionedUrl = `${permanentUrl.split('?')[0]}?v=${Date.now()}`;

      await supabase
        .from('contacts')
        .update({ profile_picture_url: versionedUrl, avatar_refreshed_at: new Date().toISOString() })
        .eq('id', row.id)
        .eq('master_id', masterId);

      return { updated: true, avatarUrl: versionedUrl };
    } catch {
      return { updated: false, avatarUrl: current };
    }
  },

  /**
   * Remove a foto de perfil do R2 ao excluir um contato (cascade).
   * Path: avatars/{master_id}/picture_{contact_code}.jpg
   */
  async deleteContactAvatar(masterId: string, contactCode: string): Promise<void> {
    try {
      const folder = IS_LOCAL_DEV ? `local_dev/avatars/${masterId}` : `avatars/${masterId}`;
      const key = `${folder}/picture_${contactCode}.jpg`;
      await cloudflareR2Service.deleteFile(key);
    } catch {
      // Falha silenciosa — foto órfã não é crítico
    }
  },

  /**
   * Baixa a foto de perfil do WhatsApp e salva no Cloudflare R2 para preservação permanente
   */
  async syncWhatsAppAvatarToR2(phone: string, rawAvatarUrl: string): Promise<string> {
    if (!rawAvatarUrl || !phone) return rawAvatarUrl;
    const cleanNumber = phone.replace(/\D/g, '');
    const folder = IS_LOCAL_DEV ? 'local_dev/avatars' : 'avatars';
    const customKey = `${cleanNumber}.jpg`;

    try {
      const res = await fetch(rawAvatarUrl);
      if (!res.ok) return rawAvatarUrl;
      const blob = await res.blob();

      const permanentUrl = await cloudflareR2Service.uploadFile(
        blob,
        folder,
        undefined,
        customKey
      );
      return permanentUrl;
    } catch {
      return rawAvatarUrl;
    }
  },

  /**
   * Sincroniza em background uma mídia recebida via UAZAPI (temporária) para o Cloudflare R2
   * permitindo que todos os operadores futuros tenham acesso permanente à mídia.
   */
  async syncMediaUrlToR2(url: string, mediaType: string = 'media', phone: string = 'chat', originalFileName?: string): Promise<string> {
    if (!url || url.includes('r2.cloudflarestorage.com') || url.includes('r2.dev') || url.startsWith('blob:')) {
      return url;
    }
    const cleanNumber = phone.replace(/\D/g, '') || 'general';
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const folder = IS_LOCAL_DEV ? `local_dev/whatsapp/${cleanNumber}/${yearMonth}` : `whatsapp/${cleanNumber}/${yearMonth}`;
    
    try {
      const res = await fetch(url);
      if (!res.ok) return url;
      const blob = await res.blob();
      const mime = (blob.type || '').toLowerCase();
      let resolvedType = mediaType !== 'media' ? mediaType : 'document';
      if (mime.startsWith('image/')) resolvedType = 'image';
      else if (mime.startsWith('video/')) resolvedType = 'video';
      else if (mime.startsWith('audio/')) resolvedType = 'audio';
      else if (mime.includes('pdf') || mime.startsWith('application/')) resolvedType = 'document';

      const ext = mime.split('/')[1]?.split(';')[0] || (resolvedType === 'audio' ? 'ogg' : resolvedType === 'image' ? 'jpg' : 'bin');
      // Preserva o nome original do arquivo para documentos; garante que seja legível no R2
      const sanitizedOriginalName = originalFileName
        ? originalFileName.replace(/[^a-zA-Z0-9._\-]/g, '_').slice(0, 100)
        : null;
      const customKey = sanitizedOriginalName && resolvedType === 'document'
        ? `${resolvedType}_${Date.now()}_${sanitizedOriginalName}`
        : `${resolvedType}_${Date.now()}.${ext}`;

      const permanentUrl = await cloudflareR2Service.uploadFile(
        blob,
        folder,
        undefined,
        customKey
      );
      return permanentUrl;
    } catch (err) {
      console.warn('[Sync Media to R2 Warning]:', err);
      return url;
    }
  },
};


