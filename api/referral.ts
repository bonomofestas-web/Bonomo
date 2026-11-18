import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

/**
 * POST /api/referral — registra a indicacao de uma debutante no servidor.
 *
 * Garante, na ordem: debutante valida -> unidade e Master vindos do BANCO (nunca do cliente) ->
 * contato (acha pelo telefone dentro do Master ou cria) -> lead no funil de indicacao (ou reaproveita
 * o lead ativo do contato na unidade) -> registro em `referrals`. Qualquer falha devolve erro:
 * o app nunca mostra sucesso sem gravacao.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODE_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const VALID_GROUPS = new Set(['Escola', 'Família', 'Judô', 'Faculdade', 'Amigos', 'Academia', 'Outros']);

const code = (prefix: string): string => {
  let out = '';
  for (let i = 0; i < 8; i++) out += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  return `${prefix}-${out}`;
};

/** Chave de comparacao: so digitos, sem DDI 55. Retorna null se nao parecer telefone BR (10 ou 11 digitos). */
const phoneKey = (raw: unknown): string | null => {
  let d = String(raw ?? '').replace(/\D/g, '');
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2);
  return d.length === 10 || d.length === 11 ? d : null;
};

const looseKey = (raw: unknown): string => {
  let d = String(raw ?? '').replace(/\D/g, '');
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2);
  return d;
};

// Limites anti-abuso (endpoint publico). Por IP e best-effort (memoria da instancia serverless);
// por debutante e garantido pelo banco.
const IP_WINDOW_MS = 10 * 60 * 1000;
const IP_MAX = 30;
const DEB_HOURLY_MAX = 20;
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
  if (ipHits.size > 5000) {
    for (const [k, v] of ipHits) if (!v.some(t => now - t < IP_WINDOW_MS)) ipHits.delete(k);
  }
  return hits.length > IP_MAX;
};

const fail = (res: VercelResponse, status: number, error: string, extra: Record<string, unknown> = {}) =>
  res.status(status).json({ ok: false, error, ...extra });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Sem CORS aberto: o app chama o endpoint na mesma origem. Outros sites nao conseguem usa-lo pelo navegador.
  if (req.method !== 'POST') return fail(res, 405, 'Método não permitido.');
  if (ipLimited(clientIp(req))) {
    res.setHeader('Retry-After', '600');
    return fail(res, 429, 'Muitas tentativas. Aguarde alguns minutos e tente de novo.');
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !supabaseKey) return fail(res, 500, 'Servidor sem credenciais do Supabase.');
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } });

  let body: any = {};
  try {
    body = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body) || {};
  } catch {
    return fail(res, 400, 'Requisição inválida.');
  }
  const debutanteRef = String(body.debutanteId || body.slug || '').trim();
  const name = String(body.name || '').trim().slice(0, 120);
  const key = phoneKey(body.phone);
  const ageNum = Number(body.age);
  const age = Number.isFinite(ageNum) && ageNum > 0 && ageNum < 120 ? Math.round(ageNum) : null;
  const group = VALID_GROUPS.has(String(body.group)) ? String(body.group) : 'Amigos';
  const notes = body.notes ? String(body.notes).trim().slice(0, 500) : null;
  const isRenewal = Boolean(body.isRenewalReferral);

  if (!debutanteRef) return fail(res, 400, 'Debutante não informada.');
  if (name.length < 2) return fail(res, 400, 'Informe o nome da amiga.');
  if (!key) return fail(res, 400, 'Telefone inválido. Informe DDD e número (10 ou 11 dígitos).');

  try {
    // 1. Debutante -> unidade -> Master (sempre do banco)
    const debQuery = supabase.from('debutantes').select('id, name, slug, venue_id');
    const { data: deb } = UUID_RE.test(debutanteRef)
      ? await debQuery.eq('id', debutanteRef).maybeSingle()
      : await debQuery.eq('slug', debutanteRef.toLowerCase()).maybeSingle();
    if (!deb?.id || !deb.venue_id) return fail(res, 404, 'Debutante não encontrada.');

    const { data: venue } = await supabase.from('venues').select('id, master_id').eq('id', deb.venue_id).maybeSingle();
    if (!venue?.master_id) return fail(res, 422, 'Unidade da debutante sem conta Master vinculada.');
    const masterId: string = venue.master_id;
    const venueId: string = venue.id;

    // 2a. Limite por debutante (anti-spam): max. DEB_HOURLY_MAX indicacoes por hora
    const { count: lastHour } = await supabase
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('debutante_id', deb.id)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());
    if ((lastHour || 0) >= DEB_HOURLY_MAX) {
      res.setHeader('Retry-After', '3600');
      return fail(res, 429, 'Limite de indicações por hora atingido. Tente novamente mais tarde.');
    }

    // 2b. Indicacao repetida pela mesma debutante (mesmo telefone)
    const { data: prior } = await supabase
      .from('referrals')
      .select('id, phone')
      .eq('debutante_id', deb.id)
      .limit(500);
    if ((prior || []).some(r => looseKey(r.phone) === key)) {
      return fail(res, 409, 'Você já indicou essa amiga.', { duplicate: true });
    }

    // 3. Contato: acha dentro do Master (o mais antigo) ou cria
    // Padrao "%d%d%d..." casa o telefone mesmo formatado ("(11) 98765-4321"); a comparacao final e exata em looseKey.
    const likePattern = `%${key.slice(-8).split('').join('%')}`;
    const findContact = async (): Promise<string | null> => {
      const { data: candidates } = await supabase
        .from('contacts')
        .select('id, primary_phone, created_at')
        .eq('master_id', masterId)
        .is('deleted_at', null)
        .ilike('primary_phone', likePattern)
        .order('created_at', { ascending: true })
        .limit(50);
      return (candidates || []).find(c => looseKey(c.primary_phone) === key)?.id || null;
    };

    let contactId: string | null = await findContact();
    let createdContact = false;
    if (!contactId) {
      // Ate 3 tentativas: cobre colisao do codigo aleatorio e corrida com outra requisicao do mesmo telefone
      for (let attempt = 0; attempt < 3 && !contactId; attempt++) {
        const { data: newContact, error: contactErr } = await supabase
          .from('contacts')
          .insert({
            master_id: masterId,
            code: code('CONT'),
            name,
            primary_phone: `55${key}`,
            relationship_role: 'Indicação',
          })
          .select('id')
          .single();
        if (newContact?.id) {
          contactId = newContact.id;
          createdContact = true;
        } else if (contactErr) {
          contactId = await findContact(); // outra requisicao criou o mesmo contato
        }
      }
      if (!contactId) return fail(res, 500, 'Não foi possível cadastrar o contato da indicação.');
    }

    await supabase.from('contact_venue_access').upsert(
      { master_id: masterId, contact_id: contactId, venue_id: venueId, last_interaction_at: new Date().toISOString() },
      { onConflict: 'contact_id,venue_id' }
    );

    // 4. Lead: reaproveita o lead ativo do contato nesta unidade (mais antigo) ou cria no funil de indicacao
    const { data: existingLeads } = await supabase
      .from('leads')
      .select('id, created_at')
      .eq('master_id', masterId)
      .eq('venue_id', venueId)
      .eq('contact_id', contactId)
      .or('is_archived.is.null,is_archived.eq.false')
      .order('created_at', { ascending: true })
      .limit(1);

    let leadId: string | null = existingLeads?.[0]?.id || null;
    let createdLead = false;

    if (!leadId) {
      let funnelId: string | null = null;
      let sourceId: string | null = null;
      const { data: source } = await supabase
        .from('sources')
        .select('id, funnel_id')
        .eq('venue_id', venueId)
        .eq('type', 'referral')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      if (source?.id) {
        sourceId = source.id;
        funnelId = source.funnel_id || null; // origem sem funil = triagem manual (regra do sistema)
      } else {
        const { data: funnel } = await supabase
          .from('commercial_funnels')
          .select('id')
          .eq('venue_id', venueId)
          .or('is_post_sale.is.null,is_post_sale.eq.false')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        funnelId = funnel?.id || null;
      }

      let stage = 'new_lead';
      if (funnelId) {
        const { data: f } = await supabase.from('commercial_funnels').select('stages').eq('id', funnelId).maybeSingle();
        const stages = Array.isArray(f?.stages) ? [...f.stages] : [];
        stages.sort((a: any, b: any) => (a?.order ?? 0) - (b?.order ?? 0));
        const first = stages.find((s: any) => s && !s.isLoss && !s.isWon);
        if (first?.id) stage = String(first.id);
      }

      leadId = randomUUID();
      const { error: leadErr } = await supabase.from('leads').insert({
        id: leadId,
        master_id: masterId,
        venue_id: venueId,
        funnel_id: funnelId,
        source_id: sourceId,
        source_name: 'indicacao',
        name,
        phone: `55${key}`,
        age,
        group,
        notes,
        stage,
        debutante_id: deb.id,
        debutante_name: deb.name,
        debutante_slug: deb.slug,
        contact_id: contactId,
        commercial_code: code('LEAD'),
        is_validated: false,
        points_granted: 0,
        temperature: null,
      });
      if (leadErr) {
        if (createdContact && contactId) await supabase.from('contacts').delete().eq('id', contactId).eq('master_id', masterId);
        return fail(res, 500, 'Não foi possível registrar a indicação no funil.');
      }
      createdLead = true;
    }

    // 5. Indicacao
    const referralId = randomUUID();
    const { error: refErr } = await supabase.from('referrals').insert({
      id: referralId,
      master_id: masterId,
      contact_id: contactId,
      debutante_id: deb.id,
      debutante_name: deb.name,
      lead_id: leadId,
      name,
      phone: `55${key}`,
      age,
      group,
      notes,
      status: 'pending',
      points_granted: 0,
      is_renewal_referral: isRenewal,
    });
    if (refErr) {
      // Desfaz o que esta chamada criou para nao deixar lead/contato orfao
      if (createdLead && leadId) await supabase.from('leads').delete().eq('id', leadId).eq('master_id', masterId);
      if (createdContact && contactId) await supabase.from('contacts').delete().eq('id', contactId).eq('master_id', masterId);
      return fail(res, 500, 'Não foi possível registrar a indicação.');
    }

    await supabase.from('lead_activities').insert({
      lead_id: leadId,
      type: createdLead ? 'creation' : 'note',
      title: createdLead
        ? `Indicação enviada pela aniversariante ${deb.name}`
        : `Nova indicação de ${deb.name} para este contato`,
      author_name: deb.name,
    });

    return res.status(200).json({
      ok: true,
      referralId,
      leadId,
      contactId,
      createdContact,
      createdLead,
      existingLead: !createdLead,
    });
  } catch (err: any) {
    console.error('[api/referral]', err);
    return fail(res, 500, 'Erro inesperado ao registrar a indicação.');
  }
}
