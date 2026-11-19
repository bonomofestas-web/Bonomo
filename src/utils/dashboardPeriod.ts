export type PeriodPreset = 'today' | '7d' | 'this_month' | '30d' | 'this_year' | 'custom';
export type CompareMode = 'auto' | 'custom' | 'baseline';

export interface DateRange {
  start: Date; // 00:00:00.000 do primeiro dia
  end: Date;   // 23:59:59.999 do ultimo dia
}

export interface PeriodSelection {
  preset: PeriodPreset;
  customStart?: string;  // YYYY-MM-DD (preset 'custom')
  customEnd?: string;
  compareMode: CompareMode;
  compareStart?: string; // YYYY-MM-DD (compareMode 'custom')
  compareEnd?: string;
}

export interface ResolvedPeriod {
  current: DateRange;
  compared: DateRange;
  /** Janela usada para metas/ritmo (mes inteiro em "Este Mes"; o proprio periodo nos demais). */
  goalRange: DateRange;
  /** Fracao (0-1) da janela de metas ja decorrida ate hoje. */
  elapsedFraction: number;
  currentLabel: string;
  comparedLabel: string;
}

export type Granularity = 'day' | 'week' | 'month';

export const DEFAULT_PERIOD: PeriodSelection = { preset: 'this_month', compareMode: 'auto' };

export const PERIOD_PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: 'today', label: 'Hoje' },
  { id: '7d', label: 'Últimos 7 dias' },
  { id: 'this_month', label: 'Este Mês' },
  { id: '30d', label: 'Últimos 30 dias' },
  { id: 'this_year', label: 'Este Ano' },
  { id: 'custom', label: 'Personalizado' },
];

const MS_DAY = 86_400_000;

export const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
export const endOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const addDays = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const parseISODate = (iso?: string): Date | null => {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

export const toISODate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const rangeDays = (r: DateRange): number =>
  Math.round((startOfDay(r.end).getTime() - startOfDay(r.start).getTime()) / MS_DAY) + 1;

const fmt = (d: Date): string => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtMonth = (d: Date): string => d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

const labelOf = (r: DateRange): string => {
  const days = rangeDays(r);
  if (days === 1) return fmt(r.start);
  return `${fmt(r.start)} – ${fmt(r.end)}`;
};

/** Resolve o periodo ativo e o periodo comparado (automatico ou personalizado). */
export const resolvePeriod = (sel: PeriodSelection, now: Date = new Date()): ResolvedPeriod => {
  const today = startOfDay(now);
  let current: DateRange;

  switch (sel.preset) {
    case 'today':
      current = { start: today, end: endOfDay(today) };
      break;
    case '7d':
      current = { start: addDays(today, -6), end: endOfDay(today) };
      break;
    case '30d':
      current = { start: addDays(today, -29), end: endOfDay(today) };
      break;
    case 'this_year':
      current = { start: new Date(today.getFullYear(), 0, 1), end: endOfDay(today) };
      break;
    case 'custom': {
      const s = parseISODate(sel.customStart) || addDays(today, -29);
      const e = parseISODate(sel.customEnd) || today;
      current = s <= e ? { start: s, end: endOfDay(e) } : { start: e, end: endOfDay(s) };
      break;
    }
    case 'this_month':
    default:
      current = { start: new Date(today.getFullYear(), today.getMonth(), 1), end: endOfDay(today) };
  }

  let compared: DateRange;
  const customCmpStart = parseISODate(sel.compareStart);
  const customCmpEnd = parseISODate(sel.compareEnd);

  if (sel.compareMode === 'custom' && customCmpStart && customCmpEnd) {
    compared = customCmpStart <= customCmpEnd
      ? { start: customCmpStart, end: endOfDay(customCmpEnd) }
      : { start: customCmpEnd, end: endOfDay(customCmpStart) };
  } else if (sel.preset === 'this_month') {
    // Mes passado, mesma quantidade de dias decorridos (comparacao justa)
    const prevStart = new Date(current.start.getFullYear(), current.start.getMonth() - 1, 1);
    const prevMonthDays = new Date(prevStart.getFullYear(), prevStart.getMonth() + 1, 0).getDate();
    const days = Math.min(rangeDays(current), prevMonthDays);
    compared = { start: prevStart, end: endOfDay(addDays(prevStart, days - 1)) };
  } else if (sel.preset === 'this_year') {
    // Ano passado, mesma janela (1/jan ate o mesmo dia/mes)
    const y = current.start.getFullYear() - 1;
    const endDay = new Date(y, current.end.getMonth(), Math.min(current.end.getDate(), new Date(y, current.end.getMonth() + 1, 0).getDate()));
    compared = { start: new Date(y, 0, 1), end: endOfDay(endDay) };
  } else {
    // Periodo imediatamente anterior, mesma duracao
    const days = rangeDays(current);
    const prevEnd = addDays(current.start, -1);
    compared = { start: addDays(prevEnd, -(days - 1)), end: endOfDay(prevEnd) };
  }

  const goalRange: DateRange = sel.preset === 'this_month'
    ? { start: current.start, end: endOfDay(new Date(current.start.getFullYear(), current.start.getMonth() + 1, 0)) }
    : current;

  const totalGoalDays = rangeDays(goalRange);
  const elapsedDays = Math.max(
    0,
    Math.min(totalGoalDays, Math.round((today.getTime() - startOfDay(goalRange.start).getTime()) / MS_DAY) + 1)
  );

  return {
    current,
    compared,
    goalRange,
    elapsedFraction: totalGoalDays > 0 ? elapsedDays / totalGoalDays : 1,
    currentLabel: sel.preset === 'this_month' ? fmtMonth(current.start) : labelOf(current),
    comparedLabel: sel.compareMode === 'baseline'
      ? 'base da unidade'
      : sel.compareMode === 'custom' || sel.preset !== 'this_month' ? labelOf(compared) : fmtMonth(compared.start),
  };
};

export const inRange = (iso: string | undefined | null, range: DateRange): boolean => {
  if (!iso) return false;
  const t = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).getTime();
  return !Number.isNaN(t) && t >= range.start.getTime() && t <= range.end.getTime();
};

/** Granularidade do eixo X conforme a duracao da janela. */
export const pickGranularity = (days: number): Granularity => (days <= 62 ? 'day' : days <= 210 ? 'week' : 'month');

export const bucketCount = (range: DateRange, gran: Granularity): number => {
  const days = rangeDays(range);
  if (gran === 'day') return days;
  if (gran === 'week') return Math.ceil(days / 7);
  const s = range.start;
  const e = range.end;
  return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
};

/** Indice do bucket (0-based) de uma data dentro da janela; -1 se fora. Alinha periodos pelo indice. */
export const bucketIndex = (iso: string | undefined | null, range: DateRange, gran: Granularity): number => {
  if (!inRange(iso, range)) return -1;
  const d = new Date((iso as string).length === 10 ? `${iso}T12:00:00` : (iso as string));
  if (gran === 'month') {
    return (d.getFullYear() - range.start.getFullYear()) * 12 + (d.getMonth() - range.start.getMonth());
  }
  const dayOffset = Math.round((startOfDay(d).getTime() - startOfDay(range.start).getTime()) / MS_DAY);
  return gran === 'day' ? dayOffset : Math.floor(dayOffset / 7);
};

export const bucketLabel = (index: number, range: DateRange, gran: Granularity): string => {
  if (gran === 'month') {
    const d = new Date(range.start.getFullYear(), range.start.getMonth() + index, 1);
    return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
  }
  const d = addDays(range.start, gran === 'day' ? index : index * 7);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

/** Variacao percentual atual vs comparado. null quando nao ha base de comparacao. */
export const pctDelta = (current: number, previous: number): number | null => {
  if (!previous) return current ? null : 0;
  return ((current - previous) / previous) * 100;
};
