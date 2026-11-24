import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

/**
 * /api/survey — lado PUBLICO das pesquisas (formulario estilo Typeform).
 *  GET  ?slug=...[&t=token]  -> pesquisa publicada (perguntas, boas-vindas, tema) e o progresso do link pessoal
 *  POST { slug, token?, resume?, responseId?, action: 'save' | 'submit', answers }
 * Usa a service role: o Master, a pesquisa e o lead vem SEMPRE do banco (nunca do cliente). Valida cada resposta pelo tipo,
 * recalcula o caminho pela logica condicional e so grava pesquisa PUBLICADA. As regras de validacao e de proxima pergunta
 * repetem as de src/utils/surveyLogic.ts (mantenha as duas iguais).
 */

type Q = { id: string; type: string; title: string; description: string | null; required: boolean; options: any; logic: any[]; position: number };
type Answers = Record<string, string | number | string[]>;

const OTHER = 'other:';
const IP_WINDOW_MS = 10 * 60 * 1000;
const IP_MAX = 120;
const ipHits = new Map<string, number[]>();

const clientIp = (req: VercelRequest): string => {
  const fwd = req.headers?.['x-forwarded-for'];
  const first = (Array.isArray(fwd) ? fwd[0] : fwd || '').split(',')[0].trim();
  return first || String(req.socket?.remoteAddress || 'unknown');
};
const ipLimited = (ip: string): boolean => {
  const now = Date.now();
  const hits = (ipHits.get(ip) || []).filter(t => now - t < IP_WINDOW_MS);
  hits.push(now);
  ipHits.set(ip, hits);
  return hits.length > IP_MAX;
};

const isAnswered = (q: Q, v: any): boolean => {
  if (q.type === 'statement') return true;
  if (v === undefined || v === null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'number') return Number.isFinite(v);
  return String(v).trim() !== '';
};
const num = (v: any): number | null => (typeof v === 'number' ? (Number.isFinite(v) ? v : null) : (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v)) ? Number(v) : null));

const validate = (q: Q, v: any): string | null => {
  if (q.type === 'statement') return null;
  if (!isAnswered(q, v)) return q.required ? 'Responda esta pergunta.' : null;
  const o = q.options || {};
  switch (q.type) {
    case 'email': return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim()) && String(v).length <= 200 ? null : 'E-mail inválido.';
    case 'phone': { const d = String(v).replace(/\D/g, ''); return d.length >= 10 && d.length <= 13 ? null : 'Telefone inválido.'; }
    case 'number': return num(v) !== null ? null : 'Número inválido.';
    case 'date': return /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? null : 'Data inválida.';
    case 'scale': case 'rating': { const n = num(v); const min = o.scaleMin ?? (q.type === 'scale' ? 0 : 1); const max = o.scaleMax ?? (q.type === 'scale' ? 10 : 5); return n !== null && Number.isInteger(n) && n >= min && n <= max ? null : 'Nota inválida.'; }
    case 'yes_no': return v === 'yes' || v === 'no' ? null : 'Resposta inválida.';
    case 'single_choice': case 'dropdown': {
      const s = String(v);
      if (s.startsWith(OTHER)) return o.allowOther && s.slice(OTHER.length).trim() && s.length <= 300 ? null : 'Opção inválida.';
      return (o.choices || []).some((c: any) => c.id === s) ? null : 'Opção inválida.';
    }
    case 'multi_choice': {
      const arr = Array.isArray(v) ? v : [];
      const ids = new Set((o.choices || []).map((c: any) => c.id));
      const ok = arr.every((s: any) => typeof s === 'string' && (ids.has(s) || (o.allowOther && s.startsWith(OTHER) && s.slice(OTHER.length).trim() && s.length <= 300)));
      if (!ok) return 'Opção inválida.';
      return o.maxSelections && arr.length > o.maxSelections ? 'Escolhas demais.' : null;
    }
    default: return String(v).length <= 5000 ? null : 'Texto muito longo.';
  }
};

const ruleMatches = (rule: any, answer: any): boolean => {
  const txt = (x: any) => (typeof x === 'string' ? x : x == null ? '' : String(x));
  switch (rule?.op) {
    case 'is': { const n = num(answer); const r = num(rule.value); return n !== null && r !== null && typeof rule.value !== 'string' ? n === r : txt(answer) === txt(rule.value); }
    case 'is_not': { const n = num(answer); const r = num(rule.value); return n !== null && r !== null && typeof rule.value !== 'string' ? n !== r : txt(answer) !== txt(rule.value); }
    case 'any_of': return Array.isArray(rule.value) && rule.value.includes(txt(answer));
    case 'gt': { const n = num(answer); const r = num(rule.value); return n !== null && r !== null && n > r; }
    case 'lt': { const n = num(answer); const r = num(rule.value); return n !== null && r !== null && n < r; }
    case 'between': { const n = num(answer); const a = num(rule.value); const b = rule.value2 ?? null; return n !== null && a !== null && b !== null && n >= a && n <= b; }
    default: return false;
  }
};
const nextId = (q: Q, answer: any, ordered: Q[]): string | null => {
  const idx = ordered.findIndex(x => x.id === q.id);
  for (const rule of q.logic || []) {
    if (!ruleMatches(rule, answer)) continue;
    if (rule.goto === 'end') return null;
    const t = ordered.findIndex(x => x.id === rule.goto);
    if (t > idx) return ordered[t].id;
  }
  return idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1].id : null;
};
const buildPath = (ordered: Q[], answers: Answers): string[] => {
  const path: string[] = [];
  let cur: string | null = ordered[0]?.id ?? null;
  while (cur && path.length < ordered.length + 2) {
    path.push(cur);
    const q = ordered.find(x => x.id === cur)!;
    cur = nextId(q, answers[q.id], ordered);
  }
  return path;
};

const publicSurvey = (s: any, qs: Q[]) => ({
  title: s.title, description: s.description, welcome: s.welcome || {}, thanks: s.thanks || {}, theme: s.theme || {},
  questions: qs.map(q => ({ id: q.id, type: q.type, title: q.title, description: q.description, required: q.required, options: q.options || {}, logic: q.logic || [] })),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(500).json({ ok: false, error: 'Serviço indisponível.' });
  if (ipLimited(clientIp(req))) return res.status(429).json({ ok: false, error: 'Muitas tentativas. Tente de novo em alguns minutos.' });
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const body: any = req.method === 'POST' ? (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}) : {};
  const slug = String((req.method === 'GET' ? (req.query as any)?.slug : body.slug) || '').trim().toLowerCase();
  const token = String((req.method === 'GET' ? (req.query as any)?.t : body.token) || '').trim();
  if (!slug || slug.length > 80) return res.status(400).json({ ok: false, error: 'Pesquisa não encontrada.' });

  const { data: survey } = await sb.from('surveys').select('id, master_id, title, description, status, welcome, thanks, theme').eq('slug', slug).maybeSingle();
  if (!survey || survey.status === 'draft') return res.status(404).json({ ok: false, error: 'Pesquisa não encontrada.' });
  if (survey.status === 'closed') return res.status(200).json({ ok: true, closed: true, survey: { title: survey.title, theme: survey.theme || {}, thanks: survey.thanks || {} } });
  const { data: qrows } = await sb.from('survey_questions').select('id, type, title, description, required, options, logic, position').eq('survey_id', survey.id).eq('master_id', survey.master_id).order('position', { ascending: true });
  const questions = (qrows || []) as Q[];

  // Link pessoal: o token identifica o lead (sempre da mesma pesquisa e do mesmo Master)
  let response: any = null;
  if (token) {
    const { data } = await sb.from('survey_responses').select('id, status, answers, lead_id, meta, started_at').eq('token', token).eq('survey_id', survey.id).eq('master_id', survey.master_id).maybeSingle();
    if (!data) return res.status(404).json({ ok: false, error: 'Link inválido.' });
    response = data;
  }

  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, survey: publicSurvey(survey, questions), progress: response ? { status: response.status, answers: response.status === 'completed' ? {} : response.answers || {} } : null });
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método não permitido.' });

  const action = body.action === 'submit' ? 'submit' : 'save';
  const raw = body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers) ? body.answers : {};
  if (JSON.stringify(raw).length > 60000) return res.status(413).json({ ok: false, error: 'Resposta grande demais.' });
  if (response?.status === 'completed') return res.status(409).json({ ok: false, error: 'Esta pesquisa já foi respondida.' });

  // Resposta anonima (link geral): continua pelo responseId + segredo devolvido na criacao
  if (!response && body.responseId) {
    const { data } = await sb.from('survey_responses').select('id, status, answers, lead_id, meta, started_at').eq('id', String(body.responseId)).eq('survey_id', survey.id).eq('master_id', survey.master_id).maybeSingle();
    if (!data || !data.meta?.resume || data.meta.resume !== String(body.resume || '')) return res.status(403).json({ ok: false, error: 'Sessão inválida.' });
    if (data.status === 'completed') return res.status(409).json({ ok: false, error: 'Esta pesquisa já foi respondida.' });
    response = data;
  }

  // So guarda respostas de perguntas que existem e sao validas (parcial: as ja dadas; final: tudo que o caminho exige)
  const byId = new Map(questions.map(q => [q.id, q]));
  const clean: Answers = {};
  for (const [qid, val] of Object.entries(raw)) {
    const q = byId.get(qid);
    if (!q || q.type === 'statement' || !isAnswered(q, val as any)) continue;
    const err = validate({ ...q, required: false }, val);
    if (err) return res.status(400).json({ ok: false, error: err, questionId: qid });
    clean[qid] = val as any;
  }
  const merged: Answers = { ...(response?.answers || {}), ...clean };
  let path = buildPath(questions, merged);
  let status: 'started' | 'completed' = 'started';
  const finalAnswers: Answers = {};
  for (const qid of path) if (merged[qid] !== undefined) finalAnswers[qid] = merged[qid];
  if (action === 'submit') {
    for (const qid of path) {
      const q = byId.get(qid)!;
      const err = validate(q, finalAnswers[qid]);
      if (err) return res.status(400).json({ ok: false, error: err, questionId: qid });
    }
    status = 'completed';
  } else {
    path = path.filter(id => merged[id] !== undefined || id === path[path.length - 1]);
  }

  const now = new Date().toISOString();
  const patch: any = { answers: action === 'submit' ? finalAnswers : merged, path, status, updated_at: now };
  if (!response?.started_at) patch.started_at = now;
  if (status === 'completed') patch.completed_at = now;

  if (response) {
    const { error } = await sb.from('survey_responses').update(patch).eq('id', response.id).eq('master_id', survey.master_id);
    if (error) return res.status(500).json({ ok: false, error: 'Não foi possível salvar. Tente de novo.' });
    return res.status(200).json({ ok: true, status, responseId: response.id });
  }
  const resume = randomBytes(12).toString('hex');
  const { data: created, error } = await sb.from('survey_responses').insert({
    master_id: survey.master_id, survey_id: survey.id, ...patch, meta: { origem: 'link_publico', resume, userAgent: String(req.headers?.['user-agent'] || '').slice(0, 200) },
  }).select('id').single();
  if (error || !created) return res.status(500).json({ ok: false, error: 'Não foi possível salvar. Tente de novo.' });
  return res.status(200).json({ ok: true, status, responseId: created.id, resume });
}
