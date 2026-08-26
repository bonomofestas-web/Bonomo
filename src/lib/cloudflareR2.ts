/**
 * Cloudflare R2 Storage Client (Secure Client Layer)
 * Communicates with the secure backend endpoint `/api/upload`.
 * ZERO secret keys are exposed to the client-side bundle.
 */

export interface R2UploadResult {
  url: string;
  key: string;
}

export const cloudflareR2Service = {
  /**
   * Upload an image or video file securely through the backend serverless route
   * @param file File object or Blob
   * @param folder Destination folder, e.g. 'venues', 'debutantes', 'funnels', 'videos'
   */
  async uploadFile(file: File | Blob, folder = 'uploads'): Promise<string> {
    try {
      // Convert File/Blob to Base64 for safe JSON transport to /api/upload
      const base64Data: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileBase64: base64Data,
          fileName: (file as File).name || 'upload.bin',
          contentType: file.type || 'application/octet-stream',
          folder,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          return data.url;
        }
      }

      // If /api/upload is not available (e.g. offline dev server), fallback to base64
      return base64Data;
    } catch (err) {
      console.warn('[R2 Upload Client] Fallback local ativo:', err);
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });
    }
  },
};

export const isCloudflareR2Configured = true;
