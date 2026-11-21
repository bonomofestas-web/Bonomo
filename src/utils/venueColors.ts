import type { Venue } from '../types/admin';

/** Cores sugeridas para as casas nos calendarios (o usuario tambem pode escolher qualquer outra). */
export const VENUE_CALENDAR_PALETTE = ['#2563EB', '#059669', '#EA580C', '#9333EA', '#DB2777', '#0891B2', '#CA8A04', '#DC2626'];

export interface VenueAccent { color: string; label: string }

/**
 * Cor de cada casa nos calendarios: a escolhida na configuracao da casa (calendarColor) ou, se nao houver,
 * uma cor automatica pela ordem alfabetica (estavel: nao muda de um dia para o outro).
 */
export function buildVenueAccentMap(venues: Array<Pick<Venue, 'id' | 'name' | 'calendarColor'>>): Map<string, VenueAccent> {
  const sorted = [...venues].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const used = new Set(sorted.map(v => v.calendarColor?.toLowerCase()).filter(Boolean) as string[]);
  const free = VENUE_CALENDAR_PALETTE.filter(c => !used.has(c.toLowerCase()));
  let n = 0;
  const map = new Map<string, VenueAccent>();
  for (const v of sorted) {
    const color = v.calendarColor || free[n++ % Math.max(1, free.length)] || VENUE_CALENDAR_PALETTE[0];
    map.set(v.id, { color, label: v.name });
  }
  return map;
}
