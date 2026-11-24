import type { SurveyAnswerValue, SurveyLogicRule, SurveyQuestion } from '../types/survey';

/**
 * Regras da pesquisa: resposta preenchida, validacao por tipo e proxima pergunta (logica condicional).
 * ATENCAO: api/survey.ts (servidor) repete estas regras sem importar este arquivo; mantenha os dois iguais.
 */

export const OTHER_PREFIX = 'other:';

export const isAnswered = (q: SurveyQuestion, v: SurveyAnswerValue | undefined | null): boolean => {
  if (q.type === 'statement') return true;
  if (v === undefined || v === null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'number') return Number.isFinite(v);
  return String(v).trim() !== '';
};

const numeric = (v: SurveyAnswerValue | undefined | null): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  return null;
};

const ruleMatches = (rule: SurveyLogicRule, answer: SurveyAnswerValue | undefined | null): boolean => {
  const asText = (x: SurveyAnswerValue | undefined | null) => (typeof x === 'string' ? x : x == null ? '' : String(x));
  switch (rule.op) {
    case 'is': {
      const n = numeric(answer); const rv = numeric(rule.value as any);
      if (n !== null && rv !== null && typeof rule.value !== 'string') return n === rv;
      return asText(answer) === asText(rule.value as any);
    }
    case 'is_not': {
      const n = numeric(answer); const rv = numeric(rule.value as any);
      if (n !== null && rv !== null && typeof rule.value !== 'string') return n !== rv;
      return asText(answer) !== asText(rule.value as any);
    }
    case 'any_of': return Array.isArray(rule.value) && rule.value.includes(asText(answer));
    case 'gt': { const n = numeric(answer); const rv = numeric(rule.value as any); return n !== null && rv !== null && n > rv; }
    case 'lt': { const n = numeric(answer); const rv = numeric(rule.value as any); return n !== null && rv !== null && n < rv; }
    case 'between': { const n = numeric(answer); const a = numeric(rule.value as any); const b = rule.value2 ?? null; return n !== null && a !== null && b !== null && n >= a && n <= b; }
    default: return false;
  }
};

/**
 * Proxima pergunta depois de responder `q`: a primeira regra que bater; sem regra, a proxima da lista.
 * Retorna null quando a pesquisa termina. So pula PARA FRENTE (evita laco): destino anterior ou inexistente e ignorado.
 */
export const nextQuestionId = (q: SurveyQuestion, answer: SurveyAnswerValue | undefined | null, ordered: SurveyQuestion[]): string | null => {
  const idx = ordered.findIndex(x => x.id === q.id);
  for (const rule of q.logic || []) {
    if (!ruleMatches(rule, answer)) continue;
    if (rule.goto === 'end') return null;
    const target = ordered.findIndex(x => x.id === rule.goto);
    if (target > idx) return ordered[target].id;
  }
  return idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1].id : null;
};

/** Caminho percorrido (ids das perguntas vistas) seguindo a logica a partir das respostas dadas */
export const buildPath = (ordered: SurveyQuestion[], answers: Record<string, SurveyAnswerValue>): string[] => {
  const path: string[] = [];
  let current: string | null = ordered[0]?.id ?? null;
  const guard = ordered.length + 2;
  while (current && path.length < guard) {
    path.push(current);
    const q = ordered.find(x => x.id === current)!;
    const next = nextQuestionId(q, answers[q.id], ordered);
    current = next;
  }
  return path;
};

/** Mensagem de erro de validacao (null = valida). Resposta vazia so e erro se a pergunta e obrigatoria. */
export const validateAnswer = (q: SurveyQuestion, v: SurveyAnswerValue | undefined | null): string | null => {
  if (q.type === 'statement') return null;
  if (!isAnswered(q, v)) return q.required ? 'Responda esta pergunta para continuar.' : null;
  switch (q.type) {
    case 'email': return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim()) ? null : 'Informe um e-mail válido.';
    case 'phone': { const d = String(v).replace(/\D/g, ''); return d.length >= 10 && d.length <= 13 ? null : 'Informe o telefone com DDD.'; }
    case 'number': return numeric(v) !== null ? null : 'Informe um número.';
    case 'date': return /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? null : 'Informe uma data válida.';
    case 'scale': case 'rating': {
      const n = numeric(v); const min = q.options.scaleMin ?? (q.type === 'scale' ? 0 : 1); const max = q.options.scaleMax ?? (q.type === 'scale' ? 10 : 5);
      return n !== null && Number.isInteger(n) && n >= min && n <= max ? null : 'Escolha uma nota.';
    }
    case 'yes_no': return v === 'yes' || v === 'no' ? null : 'Escolha sim ou não.';
    case 'single_choice': case 'dropdown': {
      const s = String(v);
      if (s.startsWith(OTHER_PREFIX)) return q.options.allowOther && s.slice(OTHER_PREFIX.length).trim() ? null : 'Escreva a sua opção.';
      return (q.options.choices || []).some(c => c.id === s) ? null : 'Escolha uma das opções.';
    }
    case 'multi_choice': {
      const arr = Array.isArray(v) ? v : [];
      const ids = new Set((q.options.choices || []).map(c => c.id));
      const ok = arr.every(s => ids.has(s) || (q.options.allowOther && s.startsWith(OTHER_PREFIX) && s.slice(OTHER_PREFIX.length).trim()));
      if (!ok) return 'Escolha entre as opções.';
      if (q.options.maxSelections && arr.length > q.options.maxSelections) return `Escolha no máximo ${q.options.maxSelections}.`;
      return null;
    }
    default: return String(v).length <= 5000 ? null : 'Texto muito longo.';
  }
};

/** Texto legivel da resposta (para fichas, listas e exportacao) */
export const answerLabel = (q: SurveyQuestion, v: SurveyAnswerValue | undefined | null): string => {
  if (!isAnswered(q, v) || q.type === 'statement') return '';
  const choice = (id: string) => id.startsWith(OTHER_PREFIX) ? `Outro: ${id.slice(OTHER_PREFIX.length)}` : (q.options.choices || []).find(c => c.id === id)?.label || id;
  if (q.type === 'yes_no') return v === 'yes' ? 'Sim' : 'Não';
  if (q.type === 'single_choice' || q.type === 'dropdown') return choice(String(v));
  if (q.type === 'multi_choice') return (Array.isArray(v) ? v : []).map(choice).join(', ');
  if (q.type === 'date') { const [y, m, d] = String(v).split('-'); return `${d}/${m}/${y}`; }
  return String(v);
};
