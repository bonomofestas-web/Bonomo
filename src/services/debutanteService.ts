import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { DebutanteAccount, AdminTask } from '../types/admin';
import type { Referral, Guest, Appointment } from '../types/index';

export const debutanteService = {
  async getAll(): Promise<DebutanteAccount[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data: debData, error: debError } = await supabase
        .from('debutantes')
        .select('*')
        .order('name');

      if (debError) {
        console.error('Erro ao buscar debutantes:', debError);
        return [];
      }

      // Fetch related guests, referrals, and appointments
      const { data: guestsData } = await supabase.from('guests').select('*');
      const { data: referralsData } = await supabase.from('referrals').select('*');
      const { data: appointmentsData } = await supabase.from('appointments').select('*');

      return (debData || []).map(row => {
        const debGuests: Guest[] = (guestsData || [])
          .filter(g => g.debutante_id === row.id)
          .map(g => ({
            id: g.id,
            name: g.name,
            phone: g.phone || '',
            age: g.age || 15,
            gender: g.gender,
            group: g.group || 'Amigos',
            status: g.status || 'pending',
            plusOnes: g.plus_ones || 0,
            companionDetails: g.companion_details || [],
            sweetMessage: g.sweet_message,
            declinedMessage: g.declined_message,
            isSelfRegistered: g.is_self_registered || false,
            origin: g.origin || 'individual_link',
            allowedCapacity: g.allowed_capacity || 1,
            companionMode: g.companion_mode || 'fill_later',
            confirmationSource: g.confirmation_source || 'debutante',
            isLinkExpired: g.is_link_expired || false,
            isCompanion: g.is_companion || false,
            parentGuestId: g.parent_guest_id,
            confirmedAt: g.confirmed_at,
          }));

        const debReferrals: Referral[] = (referralsData || [])
          .filter(r => r.debutante_id === row.id)
          .map(r => ({
            id: r.id,
            name: r.name,
            phone: r.phone,
            age: r.age || 14,
            group: r.group || 'Amigos',
            notes: r.notes,
            createdAt: r.created_at || new Date().toISOString(),
            status: r.status || 'pending',
            pointsGranted: r.points_granted || 0,
            isRenewalReferral: r.is_renewal_referral || false,
            rejectionReason: r.rejection_reason,
          }));

        const debAppointments: Appointment[] = (appointmentsData || [])
          .filter(a => a.debutante_id === row.id)
          .map(a => ({
            id: a.id,
            title: a.title,
            category: a.category,
            date: a.date,
            time: a.time,
            location: a.location || '',
            address: a.address,
            status: a.status || 'scheduled',
            notes: a.notes,
            responsibleCollaboratorId: a.responsible_collaborator_id,
            responsibleName: a.responsible_name,
            responsibleRole: a.responsible_role,
            responsiblePhone: a.responsible_phone,
            venueId: a.venue_id,
          }));

        const partyDate = row.party_date;
        let partyDaysLeft = 0;
        try {
          const pD = new Date(partyDate).getTime();
          const nD = new Date().getTime();
          partyDaysLeft = Math.max(0, Math.ceil((pD - nD) / (1000 * 60 * 60 * 24)));
        } catch {
          partyDaysLeft = 180;
        }

        return {
          id: row.id,
          venueId: row.venue_id,
          name: row.name,
          slug: row.slug,
          partyDate: row.party_date,
          partyDaysLeft,
          avatarUrl: row.avatar_url || '',
          phone: row.phone || '',
          email: row.email,
          motherName: row.mother_name,
          fatherName: row.father_name,
          hasJourneyEnabled: row.has_journey_enabled ?? true,
          isJourneyPending: row.is_journey_pending ?? false,
          welcomeVideoUrl: row.welcome_video_url,
          hasSeenWelcomeVideo: row.has_seen_welcome_video ?? false,
          journeyTemplateId: row.journey_template_id,
          customInvitePhotoUrl: row.custom_invite_photo_url,
          useCustomInvitePhoto: row.use_custom_invite_photo ?? false,
          receptionMessage: row.reception_message,
          baseGuestLimit: row.base_guest_limit || 150,
          extraGuestsUnlocked: row.extra_guests_unlocked || 0,
          currentGuestLimit: (row.base_guest_limit || 150) + (row.extra_guests_unlocked || 0),
          validReferrals: row.valid_referrals || 0,
          totalTargetReferrals: row.total_target_referrals || 20,
          journeyProgressPercentage: Math.round(((row.valid_referrals || 0) / (row.total_target_referrals || 20)) * 100),
          convertedReferralSales: row.converted_referral_sales || 0,
          journeyCycle: row.journey_cycle || {
            journeyStartDate: new Date().toISOString(),
            journeyMaximumEndDate: new Date(Date.now() + 180 * 86400000).toISOString(),
            currentCycleStartDate: new Date().toISOString(),
            currentCycleEndDate: new Date(Date.now() + 7 * 86400000).toISOString(),
            cycleRenewalTarget: 3,
            cycleRenewalProgress: 0,
            journeyStatus: 'active',
          },
          milestones: row.milestones || [],
          vipRewards: row.vip_rewards || [],
          guests: debGuests,
          referrals: debReferrals,
          appointments: debAppointments,
          createdAt: row.created_at || new Date().toISOString(),
          updatedAt: row.updated_at || new Date().toISOString(),
        };
      });
    } catch (err) {
      console.error('Falha em debutanteService.getAll:', err);
      return [];
    }
  },

  mapDebutanteRow(row: any, guestsData: any[] = [], referralsData: any[] = [], appointmentsData: any[] = []): DebutanteAccount {
    const debGuests: Guest[] = (guestsData || []).map(g => ({
      id: g.id,
      name: g.name,
      phone: g.phone || '',
      age: g.age || 15,
      gender: g.gender,
      group: g.group || 'Amigos',
      status: g.status || 'pending',
      plusOnes: g.plus_ones || 0,
      companionDetails: g.companion_details || [],
      sweetMessage: g.sweet_message,
      declinedMessage: g.declined_message,
      isSelfRegistered: g.is_self_registered || false,
      origin: g.origin || 'individual_link',
      allowedCapacity: g.allowed_capacity || 1,
      companionMode: g.companion_mode || 'fill_later',
      confirmationSource: g.confirmation_source || 'debutante',
      isLinkExpired: g.is_link_expired || false,
      isCompanion: g.is_companion || false,
      parentGuestId: g.parent_guest_id,
      confirmedAt: g.confirmed_at,
    }));

    const debReferrals: Referral[] = (referralsData || []).map(r => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      age: r.age || 14,
      group: r.group || 'Amigos',
      notes: r.notes,
      createdAt: r.created_at || new Date().toISOString(),
      status: r.status || 'pending',
      pointsGranted: r.points_granted || 0,
      isRenewalReferral: r.is_renewal_referral || false,
      rejectionReason: r.rejection_reason,
    }));

    const debAppointments: Appointment[] = (appointmentsData || []).map(a => ({
      id: a.id,
      title: a.title,
      category: a.category,
      date: a.date,
      time: a.time,
      location: a.location || '',
      address: a.address,
      status: a.status || 'scheduled',
      notes: a.notes,
      responsibleCollaboratorId: a.responsible_collaborator_id,
      responsibleName: a.responsible_name,
      responsibleRole: a.responsible_role,
      responsiblePhone: a.responsible_phone,
      venueId: a.venue_id,
    }));

    let partyDaysLeft = 180;
    try {
      const pD = new Date(row.party_date).getTime();
      const nD = new Date().getTime();
      partyDaysLeft = Math.max(0, Math.ceil((pD - nD) / (1000 * 60 * 60 * 24)));
    } catch {
      partyDaysLeft = 180;
    }

    return {
      id: row.id,
      venueId: row.venue_id,
      name: row.name,
      slug: row.slug,
      partyDate: row.party_date,
      partyDaysLeft,
      avatarUrl: row.avatar_url || '',
      phone: row.phone || '',
      email: row.email,
      motherName: row.mother_name,
      fatherName: row.father_name,
      hasJourneyEnabled: row.has_journey_enabled ?? true,
      isJourneyPending: row.is_journey_pending ?? false,
      welcomeVideoUrl: row.welcome_video_url,
      hasSeenWelcomeVideo: row.has_seen_welcome_video ?? false,
      journeyTemplateId: row.journey_template_id,
      customInvitePhotoUrl: row.custom_invite_photo_url,
      useCustomInvitePhoto: row.use_custom_invite_photo ?? false,
      receptionMessage: row.reception_message,
      baseGuestLimit: row.base_guest_limit || 150,
      extraGuestsUnlocked: row.extra_guests_unlocked || 0,
      currentGuestLimit: (row.base_guest_limit || 150) + (row.extra_guests_unlocked || 0),
      validReferrals: row.valid_referrals || 0,
      totalTargetReferrals: row.total_target_referrals || 20,
      journeyProgressPercentage: Math.round(((row.valid_referrals || 0) / (row.total_target_referrals || 20)) * 100),
      convertedReferralSales: row.converted_referral_sales || 0,
      journeyCycle: row.journey_cycle || {
        journeyStartDate: new Date().toISOString(),
        journeyMaximumEndDate: new Date(Date.now() + 180 * 86400000).toISOString(),
        currentCycleStartDate: new Date().toISOString(),
        currentCycleEndDate: new Date(Date.now() + 7 * 86400000).toISOString(),
        cycleRenewalTarget: 3,
        cycleRenewalProgress: 0,
        journeyStatus: 'active',
      },
      milestones: row.milestones || [],
      vipRewards: row.vip_rewards || [],
      guests: debGuests,
      referrals: debReferrals,
      appointments: debAppointments,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  },

  async getBySlug(slug: string): Promise<DebutanteAccount | null> {
    if (!slug) return null;
    const clean = decodeURIComponent(slug).toLowerCase().trim();

    // 1. Try Serverless API first (bypasses unauthenticated client-side RLS)
    try {
      const apiRes = await fetch(`/api/debutante?slug=${encodeURIComponent(clean)}`);
      if (apiRes.ok) {
        const json = await apiRes.json();
        if (json?.success && json.debutante) {
          return this.mapDebutanteRow(
            json.debutante,
            json.guests || [],
            json.referrals || [],
            json.appointments || []
          );
        }
      }
    } catch {
      // Fall through to direct Supabase client
    }

    // 2. Direct Supabase Client fallback
    if (!isSupabaseConfigured) return null;
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);
      let row = null;

      if (isUuid) {
        const { data } = await supabase.from('debutantes').select('*').eq('id', clean).maybeSingle();
        if (data) row = data;
      }

      if (!row) {
        const { data } = await supabase.from('debutantes').select('*').ilike('slug', clean).maybeSingle();
        if (data) row = data;
      }

      const baseSlug = clean.replace(/-[a-z0-9]{4}$/, '');
      if (!row && baseSlug) {
        const { data: rows } = await supabase.from('debutantes').select('*').ilike('slug', `${baseSlug}%`);
        if (rows && rows.length > 0) row = rows[0];
      }

      if (!row) {
        const nameGuess = clean.replace(/-\d{4}.*$/, '').replace(/-/g, ' ').trim();
        if (nameGuess.length >= 3) {
          const { data: rows } = await supabase.from('debutantes').select('*').ilike('name', `%${nameGuess}%`);
          if (rows && rows.length > 0) row = rows[0];
        }
      }

      if (!row) return null;

      const [guestsRes, referralsRes, appointmentsRes] = await Promise.all([
        supabase.from('guests').select('*').eq('debutante_id', row.id),
        supabase.from('referrals').select('*').eq('debutante_id', row.id),
        supabase.from('appointments').select('*').eq('debutante_id', row.id),
      ]);

      return this.mapDebutanteRow(
        row,
        guestsRes.data || [],
        referralsRes.data || [],
        appointmentsRes.data || []
      );
    } catch (err) {
      console.error('Falha em debutanteService.getBySlug:', err);
      return null;
    }
  },

  async upsert(deb: Partial<DebutanteAccount> & { id: string }): Promise<boolean> {
    // 1. Try Serverless Backend API (bypasses RLS restrictions)
    try {
      const res = await fetch('/api/save-debutante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deb),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.success) return true;
      }
    } catch {
      // Fall through to direct Supabase client
    }

    if (!isSupabaseConfigured) return false;
    try {
      const isUuidPattern = (str?: string) => Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));
      const isUuid = isUuidPattern(deb.id);
      
      const payload: any = {};
      if (deb.venueId !== undefined) {
        payload.venue_id = isUuidPattern(deb.venueId) ? deb.venueId : 'a1111111-1111-1111-1111-111111111111';
      }
      if (deb.journeyTemplateId !== undefined) {
        payload.journey_template_id = isUuidPattern(deb.journeyTemplateId) ? deb.journeyTemplateId : null;
      }
      if (deb.name !== undefined) payload.name = deb.name;
      if (deb.slug !== undefined) payload.slug = deb.slug;
      if (deb.partyDate !== undefined) payload.party_date = deb.partyDate;
      if (deb.avatarUrl !== undefined) payload.avatar_url = deb.avatarUrl;
      if (deb.phone !== undefined) payload.phone = deb.phone;
      if (deb.email !== undefined) payload.email = deb.email;
      if (deb.motherName !== undefined) payload.mother_name = deb.motherName;
      if (deb.fatherName !== undefined) payload.father_name = deb.fatherName;
      if (deb.hasJourneyEnabled !== undefined) payload.has_journey_enabled = deb.hasJourneyEnabled;
      if (deb.isJourneyPending !== undefined) payload.is_journey_pending = deb.isJourneyPending;
      if (deb.welcomeVideoUrl !== undefined) payload.welcome_video_url = deb.welcomeVideoUrl;
      if (deb.hasSeenWelcomeVideo !== undefined) payload.has_seen_welcome_video = deb.hasSeenWelcomeVideo;
      if (deb.customInvitePhotoUrl !== undefined) payload.custom_invite_photo_url = deb.customInvitePhotoUrl;
      if (deb.useCustomInvitePhoto !== undefined) payload.use_custom_invite_photo = deb.useCustomInvitePhoto;
      if (deb.receptionMessage !== undefined) payload.reception_message = deb.receptionMessage;
      if (deb.baseGuestLimit !== undefined) payload.base_guest_limit = deb.baseGuestLimit;
      if (deb.extraGuestsUnlocked !== undefined) payload.extra_guests_unlocked = deb.extraGuestsUnlocked;
      if (deb.validReferrals !== undefined) payload.valid_referrals = deb.validReferrals;
      if (deb.totalTargetReferrals !== undefined) payload.total_target_referrals = deb.totalTargetReferrals;
      if (deb.convertedReferralSales !== undefined) payload.converted_referral_sales = deb.convertedReferralSales;
      if (deb.journeyCycle !== undefined) payload.journey_cycle = deb.journeyCycle;
      if (deb.milestones !== undefined) payload.milestones = deb.milestones;
      if (deb.vipRewards !== undefined) payload.vip_rewards = deb.vipRewards;

      if (isUuid) {
        const { data: updated, error: updateErr } = await supabase
          .from('debutantes')
          .update(payload)
          .eq('id', deb.id)
          .select('id');

        if (!updateErr && updated && updated.length > 0) {
          return true;
        }

        payload.id = deb.id;
        const { error: insertErr } = await supabase.from('debutantes').insert(payload);
        if (insertErr) {
          console.error('Erro ao inserir debutante por UUID:', insertErr);
          return false;
        }
        return true;
      } else if (deb.slug) {
        const { data: existing } = await supabase.from('debutantes').select('id').eq('slug', deb.slug).maybeSingle();
        if (existing?.id) {
          const { error: updErr } = await supabase.from('debutantes').update(payload).eq('id', existing.id);
          if (updErr) console.error('Erro ao atualizar debutante por slug:', updErr);
        } else {
          const { error: insErr } = await supabase.from('debutantes').insert(payload);
          if (insErr) console.error('Erro ao inserir debutante por slug:', insErr);
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('Falha em debutanteService.upsert:', err);
      return false;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      await fetch(`/api/save-debutante?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch {}

    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase.from('debutantes').delete().eq('id', id);
      if (error) {
        console.error('Erro ao deletar debutante:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Falha em debutanteService.delete:', err);
      return false;
    }
  }
};

export const taskService = {
  async getAll(): Promise<AdminTask[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('admin_tasks')
        .select('*')
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Erro ao buscar tarefas:', error);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        leadId: row.lead_id,
        debutanteId: row.debutante_id,
        venueId: row.venue_id,
        title: row.title,
        description: row.description,
        dueDate: row.due_date,
        dueTime: row.due_time || '14:00',
        status: row.status || 'todo',
        priority: row.priority || 'medium',
        type: row.type || 'general',
        createdById: row.created_by_id,
        createdByName: row.created_by_name || 'Sistema',
        assignedToIds: row.assigned_to_ids || [],
        createdAt: row.created_at || new Date().toISOString(),
        completedAt: row.completed_at,
      }));
    } catch (err) {
      console.error('Falha em taskService.getAll:', err);
      return [];
    }
  },

  async upsert(task: Partial<AdminTask> & { id: string }): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const payload: any = {
        id: task.id,
        lead_id: task.leadId || null,
        debutante_id: task.debutanteId || null,
        venue_id: task.venueId || null,
        title: task.title,
        description: task.description,
        due_date: task.dueDate,
        due_time: task.dueTime,
        status: task.status,
        priority: task.priority,
        type: task.type,
        created_by_id: task.createdById || null,
        created_by_name: task.createdByName,
        assigned_to_ids: task.assignedToIds || [],
        completed_at: task.completedAt || null,
      };

      const { error } = await supabase.from('admin_tasks').upsert(payload);
      if (error) {
        console.error('Erro ao salvar tarefa no Supabase:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Falha em taskService.upsert:', err);
      return false;
    }
  },

  async delete(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase.from('admin_tasks').delete().eq('id', id);
      if (error) {
        console.error('Erro ao deletar tarefa:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Falha em taskService.delete:', err);
      return false;
    }
  }
};
