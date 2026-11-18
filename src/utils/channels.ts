import type { Source } from '../types/sources';

// Canais de comunicacao conectados ao sistema. Hoje so o WhatsApp esta ligado; Instagram, Facebook e Telegram ja tem
// identidade visual reservada para quando forem conectados (basta a origem declarar o tipo correspondente).

export type ChannelKey = 'whatsapp' | 'instagram' | 'facebook' | 'telegram';

export const CHANNELS: Record<ChannelKey, { label: string; color: string }> = {
  whatsapp: { label: 'WhatsApp', color: '#25D366' },
  instagram: { label: 'Instagram', color: '#E1306C' },
  facebook: { label: 'Facebook', color: '#1877F2' },
  telegram: { label: 'Telegram', color: '#229ED9' },
};

/** Tipo da origem -> canal de mensagens. Formularios, links e indicacoes nao sao canais de conversa (sem selo). */
const TYPE_TO_CHANNEL: Record<string, ChannelKey> = {
  whatsapp_api: 'whatsapp',
  whatsapp: 'whatsapp',
  instagram: 'instagram',
  instagram_dm: 'instagram',
  facebook: 'facebook',
  messenger: 'facebook',
  telegram: 'telegram',
};

export const channelOfSource = (source?: Pick<Source, 'type'> | null): ChannelKey | undefined =>
  source ? TYPE_TO_CHANNEL[String(source.type)] : undefined;

/**
 * Canal da conversa de um lead na caixa de entrada: o da origem que o trouxe.
 * Sem origem conhecida, assume WhatsApp (unico canal conectado hoje).
 */
export const channelOfLead = (lead: { sourceId?: string }, sources: Source[]): ChannelKey => {
  const src = lead.sourceId ? sources.find(s => s.id === lead.sourceId) : undefined;
  return channelOfSource(src) || 'whatsapp';
};
