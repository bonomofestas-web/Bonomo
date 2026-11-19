/**
 * Política de armazenamento de mídia no Cloudflare R2 (plano gratuito: 10 GB).
 *
 * Regras (decididas com o usuário):
 * - Texto: sempre no banco, nunca expira.
 * - Áudio/voz: sobe sempre (limite de segurança), nunca expira.
 * - Documento: sobe automaticamente até 5 MB; nunca expira.
 * - Foto: expira após 90 dias sem abrir, salvo fixada.
 * - Vídeo: expira após 30 dias sem abrir, salvo fixado.
 * - TEMPORÁRIO (decisão do usuário): salva TUDO automaticamente, sem compactar. Os tetos abaixo são só uma trava
 *   de segurança altíssima; sem compactação, voltar a limites menores quando o R2 apertar.
 *
 * ATENÇÃO: `api/whatsapp-webhook.ts` e `api/r2-cleanup.ts` mantêm uma cópia destes números
 * (funções serverless não importam de src/). Ao mudar aqui, atualize lá também.
 */

export type MediaKind = 'image' | 'video' | 'audio' | 'document' | 'other';

const MB = 1024 * 1024;

export const MEDIA_STORAGE_POLICY = {
  /** Até este tamanho (bytes) a mídia sobe sozinha para o R2; acima fica pendente (sob demanda). */
  autoUploadMaxBytes: {
    image: 100 * MB,
    video: 200 * MB,
    audio: 100 * MB,
    document: 100 * MB,
    other: 100 * MB,
  } as Record<MediaKind, number>,
  /** Dias sem abrir até a limpeza (null = nunca expira). Mídia fixada nunca expira. */
  expireAfterDays: {
    image: 90,
    video: 30,
    audio: null,
    document: null,
    other: null,
  } as Record<MediaKind, number | null>,
  /** Janela de retenção da UAZAPI: depois disso a mídia não pode mais ser baixada de lá. */
  uazapiRetentionDays: 7,
} as const;

export function classifyMediaKind(mediaType?: string | null, mimetype?: string | null): MediaKind {
  const t = (mediaType || '').toLowerCase();
  const m = (mimetype || '').toLowerCase();
  if (t === 'image' || t === 'sticker' || m.startsWith('image/')) return 'image';
  if (t === 'video' || t === 'ptv' || m.startsWith('video/')) return 'video';
  if (t === 'audio' || t === 'ptt' || t === 'myaudio' || m.startsWith('audio/')) return 'audio';
  if (t === 'document' || m.startsWith('application/') || m.startsWith('text/')) return 'document';
  return 'other';
}

export interface StorageDecision {
  action: 'auto' | 'pending';
  /** Motivo legível quando fica pendente */
  reason?: string;
}

/** Decide se uma mídia sobe sozinha ou fica pendente, dado o tipo e o peso (bytes; desconhecido = pendente para pesados). */
export function decideMediaStorage(kind: MediaKind, sizeBytes?: number | null): StorageDecision {
  const limit = MEDIA_STORAGE_POLICY.autoUploadMaxBytes[kind];
  if (sizeBytes === undefined || sizeBytes === null || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    // Peso desconhecido: salva mesmo assim (salva tudo, sem compactar)
    return { action: 'auto' };
  }
  if (sizeBytes <= limit) return { action: 'auto' };
  return { action: 'pending', reason: `Acima de ${formatMediaBytes(limit)} (política de armazenamento)` };
}

export function formatMediaBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1))} ${sizes[i]}`;
}

/** Texto curto para o card de mídia pendente (peso e motivo, quando conhecidos). */
export function describePendingMedia(metadata: any): string {
  const size = Number(metadata?.mediaSizeBytes);
  const sizeLabel = Number.isFinite(size) && size > 0 ? formatMediaBytes(size) : '';
  const reason: Record<string, string> = {
    purged: 'removida para liberar espaço (sem uso)',
    not_found: 'fora da janela da UAZAPI',
    no_media: 'arquivo indisponível',
    server: 'falha do servidor, tente de novo',
    network: 'falha de conexão, tente de novo',
  };
  const err = metadata?.mediaError ? reason[String(metadata.mediaError)] : '';
  if (sizeLabel && err) return `${sizeLabel} - ${err}`;
  if (sizeLabel) return `${sizeLabel} - toque para salvar`;
  if (err) return err;
  return 'Toque para salvar';
}
