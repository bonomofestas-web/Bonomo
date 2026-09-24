import { cloudflareR2Service } from '../lib/cloudflareR2';
import { uazapiService } from './uazapiService';

export interface IngestMediaOptions {
  instanceToken: string;
  messageId: string;
  instanceId?: string;
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

    // 1. Solicita a URL de download na UAZAPI
    const downloadRes = await uazapiService.downloadMedia(instanceToken, {
      id: messageId,
      transcribe: transcribeAudio,
      generate_mp3: true,
    });

    if (!downloadRes.fileURL && !downloadRes.base64) {
      throw new Error('UAZAPI não retornou URL ou dados binários para o arquivo da mensagem.');
    }

    let fileBlob: Blob;
    const mimetype = downloadRes.mimetype || 'application/octet-stream';
    const ext = mimetype.split('/')[1]?.split(';')[0] || 'bin';
    const fileName = downloadRes.fileName || `whatsapp_media_${messageId}.${ext}`;

    if (downloadRes.fileURL) {
      // 2. Faz o download do CDN temporário da UAZAPI
      const mediaResponse = await fetch(downloadRes.fileURL);
      if (!mediaResponse.ok) {
        throw new Error(`Falha ao obter arquivo temporário da UAZAPI (HTTP ${mediaResponse.status})`);
      }
      fileBlob = await mediaResponse.blob();
    } else {
      // Fallback base64
      const byteCharacters = atob(downloadRes.base64!);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      fileBlob = new Blob([byteArray], { type: mimetype });
    }

    // 3. Define a pasta e chave isolada no Cloudflare R2
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Regra Mestre F5: Local Dev isolado sob local_dev/
    const folder = IS_LOCAL_DEV
      ? `local_dev/whatsapp/${instanceId}/${yearMonth}`
      : `whatsapp/${instanceId}/${yearMonth}`;

    const customKey = `${messageId}_${Date.now()}.${ext}`;

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
  async syncMediaUrlToR2(url: string, mediaType: string = 'audio', phone: string = 'chat'): Promise<string> {
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
      const ext = blob.type.split('/')[1]?.split(';')[0] || (mediaType === 'audio' ? 'ogg' : 'bin');
      const customKey = `${mediaType}_${Date.now()}.${ext}`;

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


