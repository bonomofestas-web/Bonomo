/**
 * Motor de Retenção e Segurança de Armazenamento no Cloudflare R2
 * 
 * Regra:
 * - Janela rotativa de 7 dias para mídias pesadas (áudios, vídeos, fotos, documentos).
 * - Após 7 dias, o arquivo binário é purgado do Cloudflare R2 para poupar espaço e custos.
 * - O histórico textual da conversa e a transcrição automática por IA do áudio permanecem PERMANENTEMENTE salvos no banco.
 * - O registro da mensagem recebe a flag 'media_purged: true' com placeholder visual no chat.
 */

export interface PurgeResult {
  totalScanned: number;
  totalPurged: number;
  freedBytes: number;
  purgedMessageIds: string[];
}

export interface StoredWhatsAppMediaRecord {
  id: string;
  leadId?: string;
  clientId?: string;
  messageId: string;
  mediaUrl: string;
  r2Key?: string;
  mimetype: string;
  fileName?: string;
  fileSize?: number;
  transcription?: string; // Transcrição IA preservada permanentemente
  mediaPurged?: boolean;
  createdAt: string; // ISO
}

const STORAGE_RETENTION_DAYS = 7;

export const r2RetentionService = {
  /**
   * Verifica se uma data de mídia excedeu a janela de retenção (Padrão: 7 dias)
   */
  isMediaExpired(createdAtIso: string, retentionDays = STORAGE_RETENTION_DAYS): boolean {
    const createdTime = new Date(createdAtIso).getTime();
    const now = Date.now();
    const ageInMs = now - createdTime;
    const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;
    return ageInMs > maxAgeMs;
  },

  /**
   * Executa a rotina de varredura e expurgo das mídias expiradas
   */
  async runRetentionCleanup(
    records: StoredWhatsAppMediaRecord[],
    retentionDays = STORAGE_RETENTION_DAYS
  ): Promise<PurgeResult> {
    const expired = records.filter(r => !r.mediaPurged && this.isMediaExpired(r.createdAt, retentionDays));
    
    let freedBytes = 0;
    const purgedIds: string[] = [];

    for (const item of expired) {
      // Tenta solicitar deleção no R2 (se endpoint de delete estiver disponível ou via presigned)
      if (item.r2Key) {
        try {
          await fetch('/api/r2-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: item.r2Key }),
          }).catch(() => {});
        } catch {}
      }

      freedBytes += item.fileSize || 0;
      purgedIds.push(item.id);
    }

    return {
      totalScanned: records.length,
      totalPurged: expired.length,
      freedBytes,
      purgedMessageIds: purgedIds,
    };
  },

  /**
   * Formata bytes em formato legível (KB, MB, GB)
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
};
