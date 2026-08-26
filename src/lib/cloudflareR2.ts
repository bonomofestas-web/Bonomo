/**
 * Cloudflare R2 Storage Service
 * Handles uploading and streaming images and videos directly to Cloudflare R2.
 */

export interface R2UploadResult {
  url: string;
  key: string;
  size: number;
  type: string;
}

export const isCloudflareR2Configured = Boolean(
  import.meta.env.VITE_CLOUDFLARE_R2_PUBLIC_URL &&
  import.meta.env.VITE_CLOUDFLARE_R2_BUCKET_NAME
);

export const cloudflareR2Service = {
  /**
   * Upload an image or video file to Cloudflare R2
   * @param file File object or Blob
   * @param folder Folder prefix, e.g., 'venues', 'debutantes', 'funnels', 'videos'
   */
  async uploadFile(file: File | Blob, folder = 'uploads'): Promise<string> {
    const publicBaseUrl = import.meta.env.VITE_CLOUDFLARE_R2_PUBLIC_URL || '';

    // Generate unique key
    const ext = file.type.split('/')[1] || 'bin';
    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 8);
    const key = `${folder}/${timestamp}_${randomHex}.${ext}`;

    // If direct R2 worker or endpoint is provided
    const uploadEndpoint = import.meta.env.VITE_CLOUDFLARE_R2_UPLOAD_ENDPOINT;

    if (uploadEndpoint) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('key', key);

        const response = await fetch(uploadEndpoint, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          return result.url || `${publicBaseUrl}/${key}`;
        }
      } catch (err) {
        console.warn('Erro no upload Cloudflare R2 endpoint, fallback ativo:', err);
      }
    }

    // Direct public URL construction if publicBaseUrl is available
    if (publicBaseUrl) {
      return `${publicBaseUrl.replace(/\/$/, '')}/${key}`;
    }

    // Fallback to local Base64 for local dev preview
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  }
};
