import type { LeadMqlLevel, MqlOption, MqlSnapshot, MqlSnapshotQuestion } from '../types/admin';

/** Abaixo deste % de MQL o lead e desqualificado por natureza. */
export const MQL_QUALIFIED_MIN = 10;
/** Abaixo: vermelho. De 30% a 59%: amarelo. De 60% para cima: verde. */
export const MQL_YELLOW_MIN = 30;
export const MQL_GREEN_MIN = 60;

/** A partir deste %, o MQL e "Incrivel". */
export const MQL_TOP_MIN = 80;

/** Notas do MQL: Indefinido (sem resposta), Ruim, Bom, Muito bom e Incrivel. */
export type MqlBand = 'undefined' | 'disqualified' | 'red' | 'yellow' | 'green' | 'top';

export const MQL_BAND_STYLE: Record<MqlBand, { color: string; label: string }> = {
  undefined: { color: '#94A3B8', label: 'Indefinido' },
  disqualified: { color: '#EF4444', label: 'Ruim · desqualificado' },
  red: { color: '#EF4444', label: 'Ruim' },
  yellow: { color: '#F59E0B', label: 'Bom' },
  green: { color: '#10B981', label: 'Muito bom' },
  top: { color: '#14B8A6', label: 'Incrível' },
};

/** Sem resposta (score undefined/null) = Indefinido, nunca zero. */
export const mqlBand = (score: number | null | undefined): MqlBand => {
  if (typeof score !== 'number' || !Number.isFinite(score)) return 'undefined';
  if (score < MQL_QUALIFIED_MIN) return 'disqualified';
  if (score < MQL_YELLOW_MIN) return 'red';
  if (score < MQL_GREEN_MIN) return 'yellow';
  if (score < MQL_TOP_MIN) return 'green';
  return 'top';
};

/** Estilo de selo (rotulo curto, cor, fundo e borda) para listas e cabecalhos. */
export const mqlBadge = (score: number | null | undefined, answers?: Record<string, string> | null) => {
  const answered = !!answers && Object.values(answers).some(Boolean);
  const band = mqlBand(answered ? score : undefined);
  const { color, label } = MQL_BAND_STYLE[band];
  return {
    band,
    isUndefined: band === 'undefined',
    label: label.split(' · ')[0],
    color,
    bg: `${color}1F`,
    border: `${color}59`,
  };
};

/** O lead tem MQL respondido? O banco guarda mql_score 0 por padrao, entao so as respostas valem. */
export const hasMqlAnswers = (answers?: Record<string, string> | null): boolean =>
  !!answers && Object.values(answers).some(Boolean);

/** Nivel legado do lead (top/qualified/cold) derivado das mesmas faixas. */
export const mqlLevelFromScore = (score: number): LeadMqlLevel => {
  if (score >= MQL_GREEN_MIN) return 'top';
  if (score >= MQL_YELLOW_MIN) return 'qualified';
  return 'cold';
};

interface ScorableQuestion { id: string; options: Pick<MqlOption, 'id' | 'points'>[] }

/** Nota 0-100: pontos ganhos / soma do maximo de cada pergunta (todas as perguntas do formulario contam). */
export const computeMqlScore = (
  questions: ScorableQuestion[],
  answers: Record<string, string>,
): { score: number; level: LeadMqlLevel } | null => {
  const answered = Object.keys(answers).filter(k => Boolean(answers[k]));
  if (questions.length === 0 || answered.length === 0) return null;
  let totalMax = 0;
  let earned = 0;
  questions.forEach(q => {
    totalMax += q.options.length > 0 ? Math.max(...q.options.map(o => o.points)) : 100;
    const opt = q.options.find(o => o.id === answers[q.id]);
    if (opt) earned += opt.points;
  });
  const score = totalMax > 0 ? Math.round((earned / totalMax) * 100) : 0;
  return { score, level: mqlLevelFromScore(score) };
};

/** Congela as perguntas atuais para gravar no lead junto com as respostas. */
export const buildMqlSnapshot = (
  questions: { id: string; title: string; description?: string; options: MqlOption[] }[],
  profile?: { id?: string; name?: string },
): MqlSnapshot => ({
  profileId: profile?.id,
  profileName: profile?.name,
  capturedAt: new Date().toISOString(),
  questions: questions.map<MqlSnapshotQuestion>(q => ({
    id: q.id,
    title: q.title,
    description: q.description,
    options: q.options.map(o => ({ id: o.id, label: o.label, points: o.points, situation: o.situation })),
  })),
});
