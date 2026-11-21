/**
 * Utilitários de data locais (sem fuso horário UTC).
 * Evita o bug de virada de dia após as 21:00 no Brasil (UTC-3), onde toISOString() salta para o dia seguinte.
 */

/**
 * Converte um objeto Date para string 'YYYY-MM-DD' respeitando o horário local do navegador.
 */
export const toLocalDateStr = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Retorna a data de 'hoje' no formato 'YYYY-MM-DD' usando o calendário local.
 */
export const getTodayLocalStr = (): string => toLocalDateStr(new Date());

/**
 * Converte string 'YYYY-MM-DD' para objeto Date local (à meia-noite local).
 */
export const fromLocalDateStr = (s: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
