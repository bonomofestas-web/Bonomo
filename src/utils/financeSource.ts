import type { Source } from '../types/sources';

export const FINANCE_SOURCE_PREFIX = 'Financeiro • ';

/** Conexao fixa de WhatsApp do Financeiro: uma por casa, sem funil, usada so dentro do Financeiro. */
export const isFinanceSource = (s?: Pick<Source, 'name' | 'configuration'> | null): boolean =>
  Boolean(s && ((s.configuration as any)?.role === 'financeiro' || (s.name || '').startsWith(FINANCE_SOURCE_PREFIX)));

export const getFinanceSource = (sources: Source[], venueId?: string | null): Source | null =>
  (venueId && sources.find(s => s.venueId === venueId && isFinanceSource(s))) || null;
