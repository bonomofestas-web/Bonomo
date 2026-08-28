/**
 * Cloudflare R2 Storage Client (Presigned URL approach)
 * 
 * Flow:
 *   1. Client calls /api/presign → gets a temporary presigned PUT URL
 *   2. Client uploads file DIRECTLY to R2 via XHR PUT (no size limit via Vercel)
 *   3. Returns the permanent public URL
 *
 * ZERO secret keys are exposed to the client-side bundle.
 */

export interface R2UploadProgress {
  percentage: number;
  loadedBytes: number;
  totalBytes: number;
  formattedProgress: string;
}

export const cloudflareR2Service = {
  /**
   * Upload a file directly to Cloudflare R2 using a presigned URL.
   * The file goes browser → R2 directly (bypasses Vercel body size limits).
   */
  async uploadFile(
    file: File | Blob,
    folder = 'uploads',
    onProgress?: (progress: R2UploadProgress) => void,
    customKey?: string
  ): Promise<string> {
    const fileName    = (file as File).name || 'upload.bin';
    const contentType = file.type || 'application/octet-stream';

    // Step 1: Ask the server for a presigned PUT URL
    const presignRes = await fetch('/api/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, contentType, folder, customKey }),
    });

    if (!presignRes.ok) {
      let errMsg = `Erro HTTP ${presignRes.status} ao solicitar URL de upload`;
      try {
        const errJson = await presignRes.json();
        if (errJson?.error) errMsg = errJson.error;
      } catch {}
      throw new Error(errMsg);
    }

    const { presignedUrl, publicUrl } = await presignRes.json();

    if (!presignedUrl || !publicUrl) {
      throw new Error('Servidor não retornou URL de upload válida.');
    }

    // Step 2: Upload the file DIRECTLY to R2 via XHR PUT (with progress tracking)
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', contentType);

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentage = Math.min(99, Math.round((event.loaded / event.total) * 100));
            const loadedMB   = (event.loaded / (1024 * 1024)).toFixed(1);
            const totalMB    = (event.total  / (1024 * 1024)).toFixed(1);
            onProgress({
              percentage,
              loadedBytes: event.loaded,
              totalBytes: event.total,
              formattedProgress: `${loadedMB} MB / ${totalMB} MB (${percentage}%)`,
            });
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress?.({
            percentage: 100,
            loadedBytes: file.size,
            totalBytes: file.size,
            formattedProgress: '100% (Concluído)',
          });
          resolve();
        } else {
          reject(new Error(`Falha ao enviar para o R2: HTTP ${xhr.status}. Tente novamente.`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Falha de rede ao enviar o arquivo. Verifique sua conexão e tente novamente.'));
      };

      xhr.ontimeout = () => {
        reject(new Error('Tempo esgotado no upload. O arquivo pode ser muito grande ou a conexão está lenta.'));
      };

      xhr.timeout = 600000; // 10 minutos para arquivos grandes

      xhr.send(file);
    });

    // Step 3: Return the permanent public URL
    return publicUrl;
  },
};

export const isCloudflareR2Configured = true;
