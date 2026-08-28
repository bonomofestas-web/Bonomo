import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zwozhktkapedthteckai.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3b3poa3RrYXBlZHRodGVja2FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MDc0OTAsImV4cCI6MjEwMzI4MzQ5MH0.gZiNWfTujZLwZk0EIukj57pq2LyZ1dxbUSb5ueVSzTI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'DELETE') {
      const { id } = req.query || req.body || {};
      if (!id) {
        return res.status(400).json({ error: 'ID ou Slug da debutante é obrigatório.' });
      }

      // 1. Resolve exact UUID if a slug or partial ID was passed
      let targetId = String(id).trim();
      let debutanteName = '';
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
      
      const { data: found } = await supabase
        .from('debutantes')
        .select('id, name')
        .or(`slug.eq.${targetId},id.eq.${targetId}`)
        .maybeSingle();

      if (found?.id) {
        targetId = found.id;
        debutanteName = found.name || '';
      }

      const todayStr = new Date().toISOString().split('T')[0];

      // 2. PRESERVAÇÃO COMERCIAL:
      // - LEADS e INDICAÇÕES NUNCA são deletados.
      // - Garantimos que os leads e indicações tenham o nome de quem indicou salvo como histórico
      if (debutanteName) {
        await supabase
          .from('leads')
          .update({ debutante_name: debutanteName })
          .eq('debutante_id', targetId);

        await supabase
          .from('referrals')
          .update({ debutante_name: debutanteName })
          .eq('debutante_id', targetId);
      }

      // Desvincula foreign key se necessário para permitir exclusão da debutante sem cascatear os leads
      await supabase
        .from('referrals')
        .update({ debutante_id: null })
        .eq('debutante_id', targetId);

      await supabase
        .from('leads')
        .update({ debutante_id: null })
        .eq('debutante_id', targetId);

      // 3. Remove apenas a lista de convidados (estritamente da festa dela)
      await supabase.from('guests').delete().eq('debutante_id', targetId);

      // 4. Remove apenas compromissos FUTUROS / PENDENTES (compromissos passados/realizados permanecem no histórico)
      await supabase
        .from('appointments')
        .delete()
        .eq('debutante_id', targetId)
        .gte('date', todayStr)
        .in('status', ['scheduled', 'pending']);

      // 5. Remove apenas tarefas FUTURAS / PENDENTES (tarefas concluídas/histórico permanecem)
      await supabase
        .from('admin_tasks')
        .delete()
        .eq('debutante_id', targetId)
        .in('status', ['todo', 'in_progress']);

      // 6. Delete debutante record
      const { error: debErr } = await supabase
        .from('debutantes')
        .delete()
        .or(`id.eq.${targetId},slug.eq.${id}`);

      if (debErr) {
        console.error('[API Save Debutante] Erro ao deletar debutante:', debErr);
        return res.status(500).json({ error: debErr.message });
      }

      return res.status(200).json({ success: true, deletedId: targetId });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método não permitido.' });
    }

    const payload = req.body;
    if (!payload || !payload.name) {
      return res.status(400).json({ error: 'Dados da debutante inválidos.' });
    }

    // Check if venue_id is a valid UUID, otherwise find or set valid venue
    const isUuid = (str?: string) => Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));
    
    let venueId = payload.venue_id || payload.venueId;
    if (!isUuid(venueId)) {
      const { data: vList } = await supabase.from('venues').select('id').limit(1);
      venueId = vList?.[0]?.id || 'a1111111-1111-1111-1111-111111111111';
    }

    const dbRow: any = {
      name: payload.name.trim(),
      slug: payload.slug?.trim(),
      party_date: payload.party_date || payload.partyDate || '2027-11-15',
      avatar_url: payload.avatar_url || payload.avatarUrl || null,
      phone: payload.phone || null,
      email: payload.email || null,
      has_journey_enabled: payload.has_journey_enabled ?? payload.hasJourneyEnabled ?? true,
      is_journey_pending: payload.is_journey_pending ?? payload.isJourneyPending ?? false,
      welcome_video_url: payload.welcome_video_url || payload.welcomeVideoUrl || null,
      has_seen_welcome_video: payload.has_seen_welcome_video ?? payload.hasSeenWelcomeVideo ?? false,
      base_guest_limit: Number(payload.base_guest_limit || payload.baseGuestLimit || 250),
      extra_guests_unlocked: Number(payload.extra_guests_unlocked || payload.extraGuestsUnlocked || 0),
      valid_referrals: Number(payload.valid_referrals || payload.validReferrals || 0),
      total_target_referrals: Number(payload.total_target_referrals || payload.totalTargetReferrals || 30),
      converted_referral_sales: Number(payload.converted_referral_sales || payload.convertedReferralSales || 0),
      journey_cycle: payload.journey_cycle || payload.journeyCycle || { cycleRenewalTarget: 3, cycleRenewalProgress: 0, journeyStatus: 'active' },
      milestones: payload.milestones || [],
      vip_rewards: payload.vip_rewards || payload.vipRewards || [],
      venue_id: venueId,
    };

    if (payload.id && isUuid(payload.id)) {
      dbRow.id = payload.id;
    }

    if (payload.journey_template_id && isUuid(payload.journey_template_id)) {
      dbRow.journey_template_id = payload.journey_template_id;
    }

    // Check if record already exists by ID or by Slug
    let existingId: string | null = null;
    if (dbRow.id) {
      const { data: byId } = await supabase.from('debutantes').select('id').eq('id', dbRow.id).maybeSingle();
      if (byId?.id) existingId = byId.id;
    }

    if (!existingId && dbRow.slug) {
      const { data: bySlug } = await supabase.from('debutantes').select('id').eq('slug', dbRow.slug).maybeSingle();
      if (bySlug?.id) existingId = bySlug.id;
    }

    let savedData = null;
    if (existingId) {
      const { data, error } = await supabase
        .from('debutantes')
        .update(dbRow)
        .eq('id', existingId)
        .select('*')
        .maybeSingle();

      if (error) throw error;
      savedData = data;
    } else {
      const { data, error } = await supabase
        .from('debutantes')
        .insert(dbRow)
        .select('*')
        .maybeSingle();

      if (error) throw error;
      savedData = data;
    }

    return res.status(200).json({
      success: true,
      debutante: savedData,
    });
  } catch (err: any) {
    console.error('[API Save Debutante] Erro:', err);
    return res.status(500).json({ error: err?.message || 'Erro ao salvar debutante.' });
  }
}
