/**
 * Compactação de mídia no navegador antes de subir ao Cloudflare R2 (plano gratuito: 10 GB).
 * - Imagem: reduz para no máximo 1600 px e converte para WebP.
 * - Vídeo: reencoda para no máximo 720p com bitrate limitado (via MediaRecorder; roda em tempo real).
 * Em qualquer falha ou quando não reduz o peso, devolve o arquivo ORIGINAL (nunca perde a mídia).
 */

const MB = 1024 * 1024;

export interface CompressionResult {
  blob: Blob;
  /** true quando o blob devolvido é a versão compactada */
  compressed: boolean;
}

const mimeBase = (m: string) => (m || '').split(';')[0].trim().toLowerCase();

/** Extensão do arquivo para um mimetype de saída da compactação. */
export function extensionForCompressed(mimetype: string): string | undefined {
  const m = mimeBase(mimetype);
  if (m === 'image/webp') return 'webp';
  if (m === 'video/webm') return 'webm';
  if (m === 'video/mp4') return 'mp4';
  return undefined;
}

/** Imagem estática: reduz e converte para WebP. GIF/WebP (figurinhas) e arquivos pequenos ficam como estão. */
export async function compressImageBlob(
  blob: Blob,
  opts: { maxDimension?: number; quality?: number; skipBelowBytes?: number } = {}
): Promise<CompressionResult> {
  const { maxDimension = 1600, quality = 0.8, skipBelowBytes = 120 * 1024 } = opts;
  const original: CompressionResult = { blob, compressed: false };
  const type = mimeBase(blob.type);
  if (type === 'image/gif' || type === 'image/webp' || type === 'image/svg+xml') return original;
  if (blob.size > 0 && blob.size < skipBelowBytes) return original;
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') return original;

  try {
    const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    let { width, height } = bitmap;
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) { bitmap.close?.(); return original; }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const out: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
    if (out && out.type === 'image/webp' && out.size > 0 && out.size < blob.size * 0.95) {
      return { blob: out, compressed: true };
    }
    return original;
  } catch {
    return original;
  }
}

// Reencodar vídeo é pesado e em tempo real: uma fila garante um por vez.
let videoQueue: Promise<unknown> = Promise.resolve();

export interface VideoCompressionOptions {
  maxHeight?: number;
  videoBitsPerSecond?: number;
  audioBitsPerSecond?: number;
  /** Vídeos mais longos que isso não são reencodados (ficam como estão). */
  maxDurationSec?: number;
  /** Vídeos menores que isso não valem o esforço. */
  skipBelowBytes?: number;
  onProgress?: (fraction: number) => void;
}

function pickVideoMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  return candidates.find(c => MediaRecorder.isTypeSupported(c));
}

async function compressVideoNow(blob: Blob, opts: VideoCompressionOptions): Promise<CompressionResult> {
  const original: CompressionResult = { blob, compressed: false };
  const { maxHeight = 720, videoBitsPerSecond = 1_200_000, audioBitsPerSecond = 64_000, maxDurationSec = 240, skipBelowBytes = 2.5 * MB } = opts;
  if (blob.size < skipBelowBytes) return original;
  if (typeof document === 'undefined' || typeof MediaRecorder === 'undefined') return original;
  const mime = pickVideoMime();
  if (!mime) return original;

  const url = URL.createObjectURL(blob);
  const video = document.createElement('video');
  video.src = url;
  video.playsInline = true;
  video.preload = 'auto';
  video.crossOrigin = 'anonymous';

  let audioCtx: AudioContext | undefined;
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('video_load'));
    });
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0 || duration > maxDurationSec) return original;

    const srcW = video.videoWidth || 1280;
    const srcH = video.videoHeight || 720;
    const scale = Math.min(1, maxHeight / srcH);
    const w = Math.max(2, Math.round((srcW * scale) / 2) * 2);
    const h = Math.max(2, Math.round((srcH * scale) / 2) * 2);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx || typeof canvas.captureStream !== 'function') return original;

    const stream = canvas.captureStream(30);
    // Áudio original, sem tocar no alto-falante (vai direto para o gravador)
    try {
      audioCtx = new AudioContext();
      const src = audioCtx.createMediaElementSource(video);
      const dest = audioCtx.createMediaStreamDestination();
      src.connect(dest);
      dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
      if (audioCtx.state === 'suspended') await audioCtx.resume().catch(() => {});
    } catch { /* vídeo sem áudio utilizável: segue só com imagem */ }

    const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond, audioBitsPerSecond });
    const chunks: Blob[] = [];
    recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };

    const finished = new Promise<Blob | null>(resolve => {
      let done = false;
      const finish = (ok: boolean) => {
        if (done) return;
        done = true;
        clearInterval(drawTimer);
        clearTimeout(watchdog);
        if (recorder.state !== 'inactive') {
          recorder.onstop = () => resolve(ok && chunks.length ? new Blob(chunks, { type: mimeBase(mime) }) : null);
          recorder.stop();
        } else {
          resolve(null);
        }
      };
      // Pintura dos quadros: setInterval (rAF para quando a aba está em segundo plano)
      const drawTimer = setInterval(() => {
        if (video.readyState >= 2) ctx.drawImage(video, 0, 0, w, h);
        opts.onProgress?.(Math.min(1, video.currentTime / duration));
      }, 1000 / 30);
      // Segurança: nunca prende a fila (aba em segundo plano pode desacelerar a reprodução)
      const watchdog = setTimeout(() => finish(false), duration * 2000 + 20000);
      video.onended = () => finish(true);
      video.onerror = () => finish(false);
    });

    recorder.start(1000);
    await video.play();
    const out = await finished;
    if (out && out.size > 0 && out.size < blob.size * 0.9) return { blob: out, compressed: true };
    return original;
  } catch {
    return original;
  } finally {
    try { video.pause(); } catch { /* noop */ }
    void audioCtx?.close().catch(() => {});
    URL.revokeObjectURL(url);
  }
}

/** Vídeo: reencoda para 720p com bitrate limitado. Fila de um por vez; falha => original. */
export function compressVideoBlob(blob: Blob, opts: VideoCompressionOptions = {}): Promise<CompressionResult> {
  const run = videoQueue.then(() => compressVideoNow(blob, opts), () => compressVideoNow(blob, opts));
  videoQueue = run.catch(() => undefined);
  return run;
}
