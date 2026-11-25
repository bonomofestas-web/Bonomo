import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { cloudflareR2Service } from '../lib/cloudflareR2';

export interface WhatsappSticker {
  id: string;
  masterId: string;
  venueId: string;
  mediaUrl: string;
  createdByName?: string | null;
  createdAt: string;
}

const COLS = 'id, master_id, venue_id, media_url, created_by_name, created_at';

const mapSticker = (r: any): WhatsappSticker => ({
  id: r.id,
  masterId: r.master_id,
  venueId: r.venue_id,
  mediaUrl: r.media_url,
  createdByName: r.created_by_name,
  createdAt: r.created_at,
});

async function ensureR2StickerUrl(mediaUrl: string, masterId: string, venueId: string): Promise<string> {
  if (!mediaUrl) throw new Error('URL da figurinha inválida.');
  // Já está no Cloudflare R2: reutiliza diretamente
  if (mediaUrl.includes('.r2.dev/') || mediaUrl.includes('/whatsapp-stickers/')) {
    return mediaUrl;
  }
  const resp = await fetch(mediaUrl);
  if (!resp.ok) throw new Error('Não foi possível baixar a figurinha para salvar.');
  const blob = await resp.blob();
  const ext = blob.type.includes('png') ? 'png' : blob.type.includes('gif') ? 'gif' : 'webp';
  const file = new File([blob], `sticker_${Date.now()}.${ext}`, { type: blob.type || 'image/webp' });
  return await cloudflareR2Service.uploadFile(file, `whatsapp-stickers/${masterId}/${venueId}`);
}

export const stickerService = {
  /** Lista figurinhas das unidades permitidas para o usuário (null = todas do master). */
  async listByVenues(masterId: string, venueIds: string[] | null): Promise<WhatsappSticker[]> {
    if (!isSupabaseConfigured || !masterId) return [];
    if (Array.isArray(venueIds) && venueIds.length === 0) return [];
    let q = supabase
      .from('whatsapp_stickers')
      .select(COLS)
      .eq('master_id', masterId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (Array.isArray(venueIds)) {
      q = q.in('venue_id', venueIds);
    }
    const { data, error } = await q;
    if (error) {
      if (error.code !== '42P01') console.warn('[stickerService.listByVenues]', error.message);
      return [];
    }
    return (data || []).map(mapSticker);
  },

  /** Salva uma figurinha na unidade (faz upload para R2 se necessário). */
  async saveForVenue(params: {
    masterId: string;
    venueId: string;
    mediaUrl?: string;
    file?: File;
    createdByName?: string;
  }): Promise<WhatsappSticker> {
    if (!isSupabaseConfigured) throw new Error('Banco de dados não configurado.');
    if (!params.masterId || !params.venueId) throw new Error('Unidade não identificada para salvar a figurinha.');

    let finalUrl = '';
    if (params.file) {
      finalUrl = await cloudflareR2Service.uploadFile(params.file, `whatsapp-stickers/${params.masterId}/${params.venueId}`);
    } else if (params.mediaUrl) {
      finalUrl = await ensureR2StickerUrl(params.mediaUrl, params.masterId, params.venueId);
    } else {
      throw new Error('Nenhuma mídia informada.');
    }

    const { data, error } = await supabase
      .from('whatsapp_stickers')
      .upsert(
        {
          master_id: params.masterId,
          venue_id: params.venueId,
          media_url: finalUrl,
          created_by_name: params.createdByName || null,
        },
        { onConflict: 'master_id,venue_id,media_url' }
      )
      .select(COLS)
      .single();

    if (error) throw new Error(error.message || 'Erro ao salvar figurinha.');
    return mapSticker(data);
  },

  async deleteSticker(id: string, masterId: string): Promise<boolean> {
    if (!isSupabaseConfigured || !id || !masterId) return false;
    const { error } = await supabase
      .from('whatsapp_stickers')
      .delete()
      .eq('id', id)
      .eq('master_id', masterId);
    return !error;
  },
};
