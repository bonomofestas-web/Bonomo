import type { SurveyAnswerValue, SurveyQuestion, SurveyResponse } from '../types/survey';
import { OTHER_PREFIX, isAnswered, answerLabel } from './surveyLogic';

export interface SurveySlice { key: string; label: string; count: number; pct: number }

export interface QuestionSummary {
  questionId: string;
  type: SurveyQuestion['type'];
  /** Quantas pessoas responderam esta pergunta (a base dos percentuais) */
  n: number;
  /** Quantas pessoas chegaram a ver a pergunta (a logica pode pular) */
  seen: number;
  kind: 'choice' | 'scale' | 'text' | 'number' | 'none';
  slices: SurveySlice[];
  average?: number;
  /** Escala 0 a 10: NPS = % promotores (9-10) - % detratores (0-6) */
  nps?: { score: number; promoters: number; passives: number; detractors: number };
  numberStats?: { min: number; max: number; average: number };
  texts: Array<{ responseId: string; text: string }>;
}

const round1 = (x: number) => Math.round(x * 10) / 10;

/** Resumo por pergunta para os graficos. `responses` ja vem filtrado (periodo, so concluidas...). */
export const summarizeSurvey = (questions: SurveyQuestion[], responses: SurveyResponse[]): QuestionSummary[] => {
  return questions.map(q => {
    const given = responses.filter(r => isAnswered(q, r.answers[q.id]) && q.type !== 'statement');
    const seen = responses.filter(r => (r.path?.length ? r.path.includes(q.id) : r.answers[q.id] !== undefined)).length;
    const n = given.length;
    const base: QuestionSummary = { questionId: q.id, type: q.type, n, seen: Math.max(seen, n), kind: 'none', slices: [], texts: [] };
    const pct = (c: number) => (n ? Math.round((c / n) * 1000) / 10 : 0);

    if (q.type === 'single_choice' || q.type === 'dropdown' || q.type === 'multi_choice' || q.type === 'yes_no') {
      const counts = new Map<string, { label: string; count: number }>();
      const bump = (key: string, label: string) => counts.set(key, { label, count: (counts.get(key)?.count || 0) + 1 });
      for (const r of given) {
        const v = r.answers[q.id] as SurveyAnswerValue;
        const list = Array.isArray(v) ? v : [String(v)];
        for (const item of list) {
          const isOther = item.startsWith(OTHER_PREFIX);
          const key = isOther ? 'other' : item;
          bump(key, isOther ? 'Outro' : answerLabel(q, q.type === 'multi_choice' ? [item] : item));
        }
      }
      // mantem a ordem das alternativas, com zeros, para o grafico mostrar tudo
      const order: Array<{ key: string; label: string }> = q.type === 'yes_no'
        ? [{ key: 'yes', label: 'Sim' }, { key: 'no', label: 'Não' }]
        : [...(q.options.choices || []).map(c => ({ key: c.id, label: c.label })), ...(q.options.allowOther ? [{ key: 'other', label: 'Outro' }] : [])];
      base.slices = order.map(o => ({ key: o.key, label: o.label, count: counts.get(o.key)?.count || 0, pct: pct(counts.get(o.key)?.count || 0) }));
      base.kind = 'choice';
      if (q.options.allowOther) {
        base.texts = given.flatMap(r => {
          const v = r.answers[q.id] as SurveyAnswerValue; const list = Array.isArray(v) ? v : [String(v)];
          return list.filter(i => i.startsWith(OTHER_PREFIX)).map(i => ({ responseId: r.id, text: i.slice(OTHER_PREFIX.length) }));
        });
      }
    } else if (q.type === 'scale' || q.type === 'rating') {
      const min = q.options.scaleMin ?? (q.type === 'scale' ? 0 : 1);
      const max = q.options.scaleMax ?? (q.type === 'scale' ? 10 : 5);
      const values = given.map(r => Number(r.answers[q.id]));
      base.slices = Array.from({ length: max - min + 1 }, (_, i) => {
        const val = min + i; const count = values.filter(v => v === val).length;
        return { key: String(val), label: String(val), count, pct: pct(count) };
      });
      base.kind = 'scale';
      base.average = n ? round1(values.reduce((a, b) => a + b, 0) / n) : 0;
      if (q.type === 'scale' && min === 0 && max === 10 && n) {
        const promoters = values.filter(v => v >= 9).length; const detractors = values.filter(v => v <= 6).length;
        base.nps = { score: Math.round(((promoters - detractors) / n) * 100), promoters, passives: n - promoters - detractors, detractors };
      }
    } else if (q.type === 'number') {
      const values = given.map(r => Number(r.answers[q.id])).filter(Number.isFinite);
      base.kind = 'number';
      if (values.length) base.numberStats = { min: Math.min(...values), max: Math.max(...values), average: round1(values.reduce((a, b) => a + b, 0) / values.length) };
    } else if (q.type !== 'statement') {
      base.kind = 'text';
      base.texts = given.map(r => ({ responseId: r.id, text: answerLabel(q, r.answers[q.id]) }));
    }
    return base;
  });
};

/** Linha de CSV (separador ;) com BOM para abrir certo no Excel */
export const surveyToCsv = (questions: SurveyQuestion[], responses: Array<SurveyResponse & { leadName?: string; leadPhone?: string }>): string => {
  const esc = (s: unknown) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const real = questions.filter(q => q.type !== 'statement');
  const header = ['Resposta', 'Situação', 'Nome', 'Telefone', 'Enviada em', 'Concluída em', ...real.map(q => q.title)];
  const rows = responses.map(r => [
    r.id.slice(0, 8), r.status === 'completed' ? 'Concluída' : r.status === 'started' ? 'Em andamento' : 'Enviada', r.leadName || '', r.leadPhone || '',
    r.sentAt || r.createdAt, r.completedAt || '', ...real.map(q => answerLabel(q, r.answers[q.id])),
  ]);
  return '﻿' + [header, ...rows].map(l => l.map(esc).join(';')).join('\n');
};
