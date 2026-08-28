/**
 * Cloudflare R2 Storage Client (Secure Client Layer)
 * Communicates with the secure backend endpoint `/api/upload`.
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
   * Upload an image or video file securely with real-time upload progress tracking
   * @param file File object or Blob
   * @param folder Destination folder, e.g. 'venues', 'debutantes', 'funnels', 'videos'
   * @param onProgress Callback receiving progress details
   */
  async uploadFile(
    file: File | Blob,
    folder = 'uploads',
    onProgress?: (progress: R2UploadProgress) => void,
    customKey?: string
  ): Promise<string> {
    try {
      // Convert File/Blob to Base64
      const base64Data: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });

      const payload = JSON.stringify({
        fileBase64: base64Data,
        fileName: (file as File).name || 'upload.bin',
        contentType: file.type || 'application/octet-stream',
        folder,
        customKey,
      });

      return new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload');
        xhr.setRequestHeader('Content-Type', 'application/json');

        if (xhr.upload && onProgress) {
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percentage = Math.min(99, Math.round((event.loaded / event.total) * 100));
              const loadedMB = (event.loaded / (1024 * 1024)).toFixed(1);
              const totalMB = (event.total / (1024 * 1024)).toFixed(1);
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
            try {
              const res = JSON.parse(xhr.responseText);
              if (res.url && res.url.startsWith('http')) {
                onProgress?.({
                  percentage: 100,
                  loadedBytes: payload.length,
                  totalBytes: payload.length,
                  formattedProgress: '100% (Concluído)',
                });
                resolve(res.url);
                return;
              }
              reject(new Error(res.error || 'R2 não retornou uma URL válida'));
            } catch (parseErr) {
              reject(new Error(`Resposta inválida do servidor de upload: ${xhr.responseText?.slice(0, 100)}`));
            }
          } else {
            let errMsg = `Erro HTTP ${xhr.status} no upload`;
            try {
              const errJson = JSON.parse(xhr.responseText);
              if (errJson?.error) errMsg = errJson.error;
            } catch {}
            reject(new Error(errMsg));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Falha de rede ao enviar vídeo para o servidor de upload. Verifique sua conexão.'));
        };

        xhr.ontimeout = () => {
          reject(new Error('Tempo esgotado no upload. O vídeo pode ser grande demais ou a conexão está lenta.'));
        };

        xhr.timeout = 300000; // 5 minutos


        xhr.send(payload);
      });
    } catch (err) {
      throw new Error(`Falha ao preparar arquivo para upload: ${(err as Error)?.message || err}`);
    }
  },
};

export const isCloudflareR2Configured = true;
