import type { VenueEvent } from '../types/admin';

// Regra de negocio: UMA festa por dia por unidade. A festa bloqueia apenas outra festa;
// visitas, degustacoes e compromissos continuam liberados no mesmo dia (com aviso na hora de agendar).

/** Festas ativas (nao canceladas) da unidade na data. Sem venueId (ou 'all'), considera todas as unidades. */
export function eventsOnDay(
  events: VenueEvent[],
  venueId: string | undefined,
  dateStr: string,
  excludeEventId?: string,
): VenueEvent[] {
  if (!dateStr) return [];
  return events.filter(ev =>
    ev.status !== 'cancelled' &&
    ev.eventDate === dateStr &&
    ev.id !== excludeEventId &&
    (!venueId || venueId === 'all' || ev.venueId === venueId),
  );
}

export const VENUE_DAY_TAKEN = 'VENUE_DAY_TAKEN';

/** Mensagem amigavel para o conflito (erro lancado pelo contexto: `VENUE_DAY_TAKEN:<titulo>`). */
export const venueDayTakenMessage = (title: string) =>
  `Já existe uma festa neste dia nesta unidade (${title}). É permitida apenas uma festa por dia.`;

/** Texto do aviso exibido ao agendar visita/degustacao/compromisso em dia com festa. */
export function venueEventWarning(dayEvents: VenueEvent[]): string {
  const first = dayEvents[0];
  if (!first) return '';
  const who = first.clientName || first.title;
  const when = first.startTime ? ` (a partir das ${first.startTime})` : '';
  const extra = dayEvents.length > 1 ? ` e mais ${dayEvents.length - 1}` : '';
  return `Atenção: neste dia está marcada a festa de ${who}${when}${extra}. Confirme o horário para não conflitar com a montagem e o evento.`;
}
