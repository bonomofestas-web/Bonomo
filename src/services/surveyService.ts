import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { generateUuid } from '../utils/uuid';
import type { Survey, SurveyQuestion, SurveyResponse, SurveyStatus } from '../types/survey';

const SURVEY_COLS = 'id, master_id, venue_id, slug, title, description, status, welcome, thanks, theme, created_by_name, created_at, updated_at';
const QUESTION_COLS = 'id, survey_id, position, type, title, description, required, options, logic';
const RESPONSE_COLS = 'id, master_id, survey_id, token, lead_id, contact_id, status, answers, path, sent_by_name, sent_at, started_at, completed_at, created_at';

const mapSurvey = (r: any): Survey => ({
  id: r.id, masterId: r.master_id, venueId: r.venue_id, slug: r.slug, title: r.title, description: r.description, status: r.status as SurveyStatus,
  welcome: r.welcome || {}, thanks: r.thanks || {}, theme: r.theme || {}, createdByName: r.created_by_name, createdAt: r.created_at, updatedAt: r.updated_at,
});
const mapQuestion = (r: any): SurveyQuestion => ({
  id: r.id, surveyId: r.survey_id, position: r.position, type: r.type, title: r.title, description: r.description, required: Boolean(r.required),
  options: r.options || {}, logic: Array.isArray(r.logic) ? r.logic : [],
});
const mapResponse = (r: any): SurveyResponse => ({
  id: r.id, masterId: r.master_id, surveyId: r.survey_id, token: r.token, leadId: r.lead_id, contactId: r.contact_id, status: r.status,
  answers: r.answers || {}, path: Array.isArray(r.path) ? r.path : [], sentByName: r.sent_by_name, sentAt: r.sent_at, startedAt: r.started_at,
  completedAt: r.completed_at, createdAt: r.created_at,
});

const slugify = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'pesquisa';
const randomChars = (n: number) => Array.from({ length: n }, () => 'abcdefghjkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 31)]).join('');
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const friendlySurveyError = async (err: any, fallback: string, expectedMasterId?: string): Promise<string> => {
  const msg = String(err?.message || '');
  if (err?.code === '42501' || msg.toLowerCase().includes('row-level security') || msg.toLowerCase().includes('permission denied')) {
    try {
      const [authRes, rpcRes] = await Promise.all([
        supabase.auth.getUser(),
        supabase.rpc('f5_current_master_id'),
      ]);
      const authUser = authRes?.data?.user;
      const authEmail = authUser?.email || 'nenhum (anônimo)';
      const dbMaster = rpcRes?.data as string | null;
      const rpcErr = rpcRes?.error?.message;
      if (!authUser) {
        return 'Sessão de autenticação expirada ou ausente. Saia e entre novamente no sistema para criar pesquisas.';
      }
      if (expectedMasterId && dbMaster && dbMaster !== expectedMasterId) {
        return `Sessão autenticada (${authEmail}) pertence a outra conta master (${dbMaster} != ${expectedMasterId}). Saia e entre novamente com seu e-mail atual.`;
      }
      if (!dbMaster) {
        return `E-mail autenticado (${authEmail}) sem master_id ativo no banco${rpcErr ? ` (${rpcErr})` : ''}. Saia e entre novamente.`;
      }
      return `Permissão negada pelo banco para ${authEmail} (master ${dbMaster}). Detalhe: ${msg || err?.code}`;
    } catch (diagErr: any) {
      return `Sessão sem permissão no banco (${diagErr?.message || msg || 'erro de diagnóstico'}). Saia e entre novamente.`;
    }
  }
  return msg || fallback;
};

/** Link publico direto da pesquisa */
export const surveyPublicUrl = (slug: string, token?: string | null): string => {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/p/${slug}${token ? `?t=${token}` : ''}`;
};

export interface SurveyListItem extends Survey { totalResponses: number; completed: number; questionCount: number }

/** Pesquisas (formularios de pesquisa) da gerencia. Todo acesso e escopado por master_id. */
export const surveyService = {
  async list(masterId: string): Promise<SurveyListItem[]> {
    if (!isSupabaseConfigured || !masterId) return [];
    const { data, error } = await supabase.from('surveys').select(SURVEY_COLS).eq('master_id', masterId).order('created_at', { ascending: false });
    if (error) { console.error('[surveyService.list]', error); return []; }
    const [resp, qs] = await Promise.all([
      supabase.from('survey_responses').select('survey_id, status').eq('master_id', masterId).neq('status', 'sent').limit(20000),
      supabase.from('survey_questions').select('survey_id').eq('master_id', masterId).limit(5000),
    ]);
    const total = new Map<string, number>(); const done = new Map<string, number>(); const qc = new Map<string, number>();
    (resp.data || []).forEach((r: any) => { total.set(r.survey_id, (total.get(r.survey_id) || 0) + 1); if (r.status === 'completed') done.set(r.survey_id, (done.get(r.survey_id) || 0) + 1); });
    (qs.data || []).forEach((r: any) => qc.set(r.survey_id, (qc.get(r.survey_id) || 0) + 1));
    return (data || []).map(r => ({ ...mapSurvey(r), totalResponses: total.get(r.id) || 0, completed: done.get(r.id) || 0, questionCount: qc.get(r.id) || 0 }));
  },

  async get(id: string, masterId: string): Promise<{ survey: Survey; questions: SurveyQuestion[] } | null> {
    const { data } = await supabase.from('surveys').select(SURVEY_COLS).eq('id', id).eq('master_id', masterId).maybeSingle();
    if (!data) return null;
    const { data: qs } = await supabase.from('survey_questions').select(QUESTION_COLS).eq('survey_id', id).eq('master_id', masterId).order('position', { ascending: true });
    return { survey: mapSurvey(data), questions: (qs || []).map(mapQuestion) };
  },

  async create(params: { masterId: string; title: string; venueId?: string | null; createdByName?: string; createdById?: string }): Promise<Survey> {
    if (!params.masterId || !UUID_RE.test(params.masterId)) {
      throw new Error('Identificação da conta (master_id) inválida. Recarregue a página ou faça login novamente.');
    }
    const cleanVenueId = params.venueId && UUID_RE.test(params.venueId) ? params.venueId : null;
    let lastError: any = null;
    for (let i = 0; i < 5; i++) {
      const { data, error } = await supabase.from('surveys').insert({
        master_id: params.masterId,
        venue_id: cleanVenueId,
        slug: `${slugify(params.title)}-${randomChars(5)}`,
        title: params.title,
        welcome: { title: params.title, buttonLabel: 'Começar', layout: 'centered' },
        thanks: { title: 'Obrigado!', text: 'Sua resposta foi enviada.' },
        theme: { color: '#0284C7', backgroundColor: '#F8FAFC', textColor: '#0F172A', fontFamily: 'Inter', buttonRadius: 'rounded' },
        created_by_name: params.createdByName || null,
        created_by_id: params.createdById || null,
      }).select(SURVEY_COLS).single();
      if (!error && data) return mapSurvey(data);
      lastError = error;
      if (error?.code !== '23505') break;
    }
    throw new Error(await friendlySurveyError(lastError, 'Não foi possível criar a pesquisa.', params.masterId));
  },

  async update(id: string, masterId: string, patch: Partial<Pick<Survey, 'title' | 'description' | 'venueId' | 'welcome' | 'thanks' | 'theme' | 'status'>>): Promise<void> {
    const row: Record<string, any> = { updated_at: new Date().toISOString() };
    if (patch.title !== undefined) row.title = patch.title;
    if (patch.description !== undefined) row.description = patch.description || null;
    if (patch.venueId !== undefined) row.venue_id = (patch.venueId && UUID_RE.test(patch.venueId)) ? patch.venueId : null;
    if (patch.welcome !== undefined) row.welcome = patch.welcome;
    if (patch.thanks !== undefined) row.thanks = patch.thanks;
    if (patch.theme !== undefined) row.theme = patch.theme;
    if (patch.status !== undefined) row.status = patch.status;
    const { error } = await supabase.from('surveys').update(row).eq('id', id).eq('master_id', masterId);
    if (error) throw new Error(await friendlySurveyError(error, 'Não foi possível salvar a pesquisa.', masterId));
  },

  /** Grava a lista inteira de perguntas (ordem, edicao e remocao). Perguntas ja respondidas podem ser editadas, nao apagadas se houver resposta. */
  async saveQuestions(surveyId: string, masterId: string, questions: SurveyQuestion[]): Promise<void> {
    const rows = questions.map((q, i) => ({
      id: q.id, master_id: masterId, survey_id: surveyId, position: i, type: q.type, title: q.title, description: q.description || null,
      required: q.required, options: q.options || {}, logic: q.logic || [], updated_at: new Date().toISOString(),
    }));
    const { data: existing } = await supabase.from('survey_questions').select('id').eq('survey_id', surveyId).eq('master_id', masterId);
    const keep = new Set(rows.map(r => r.id));
    const removed = (existing || []).map((r: any) => r.id).filter((id: string) => !keep.has(id));
    if (removed.length) {
      const { error } = await supabase.from('survey_questions').delete().in('id', removed).eq('master_id', masterId);
      if (error) throw new Error(error.message);
    }
    if (rows.length) {
      const { error } = await supabase.from('survey_questions').upsert(rows);
      if (error) throw new Error(error.message);
    }
  },

  async duplicate(id: string, masterId: string, by?: { id?: string; name?: string }): Promise<Survey> {
    const src = await this.get(id, masterId);
    if (!src) throw new Error('Pesquisa não encontrada.');
    const copy = await this.create({ masterId, title: `${src.survey.title} (cópia)`, venueId: src.survey.venueId, createdByName: by?.name, createdById: by?.id });
    await this.update(copy.id, masterId, { description: src.survey.description, welcome: src.survey.welcome, thanks: src.survey.thanks, theme: src.survey.theme });
    // ids novos nas perguntas e nas regras de logica
    const idMap = new Map(src.questions.map(q => [q.id, generateUuid()]));
    await this.saveQuestions(copy.id, masterId, src.questions.map(q => ({
      ...q, id: idMap.get(q.id)!, surveyId: copy.id, logic: q.logic.map(r => ({ ...r, goto: r.goto === 'end' ? 'end' : (idMap.get(r.goto) || 'end') })),
    })));
    return copy;
  },

  async remove(id: string, masterId: string): Promise<void> {
    const { error } = await supabase.from('surveys').delete().eq('id', id).eq('master_id', masterId);
    if (error) throw new Error(error.message);
  },

  async listResponses(surveyId: string, masterId: string): Promise<SurveyResponse[]> {
    const { data, error } = await supabase.from('survey_responses').select(RESPONSE_COLS).eq('survey_id', surveyId).eq('master_id', masterId)
      .order('created_at', { ascending: false }).limit(5000);
    if (error) { console.error('[surveyService.listResponses]', error); return []; }
    return (data || []).map(mapResponse);
  },

  async listForLead(leadId: string, masterId: string): Promise<Array<SurveyResponse & { surveyTitle: string; surveySlug: string }>> {
    const { data, error } = await supabase.from('survey_responses').select(`${RESPONSE_COLS}, survey:surveys(title, slug)`).eq('lead_id', leadId).eq('master_id', masterId).order('created_at', { ascending: false });
    if (error) { console.error('[surveyService.listForLead]', error); return []; }
    return (data || []).map((r: any) => ({ ...mapResponse(r), surveyTitle: r.survey?.title || 'Pesquisa', surveySlug: r.survey?.slug || '' }));
  },

  /** Link pessoal do lead: reaproveita o convite aberto (enviado/em andamento) da mesma pesquisa; senao cria um token novo. */
  async createInvite(params: { surveyId: string; masterId: string; leadId: string; contactId?: string | null; sentByName?: string }): Promise<SurveyResponse> {
    const { data: open } = await supabase.from('survey_responses').select(RESPONSE_COLS).eq('survey_id', params.surveyId).eq('master_id', params.masterId)
      .eq('lead_id', params.leadId).in('status', ['sent', 'started']).limit(1).maybeSingle();
    if (open) return mapResponse(open);
    const { data, error } = await supabase.from('survey_responses').insert({
      master_id: params.masterId, survey_id: params.surveyId, lead_id: params.leadId, contact_id: params.contactId || null,
      token: `${randomChars(10)}${randomChars(10)}`, status: 'sent', sent_by_name: params.sentByName || null, sent_at: new Date().toISOString(),
    }).select(RESPONSE_COLS).single();
    if (error || !data) throw new Error(error?.message || 'Não foi possível gerar o link.');
    return mapResponse(data);
  },
};
