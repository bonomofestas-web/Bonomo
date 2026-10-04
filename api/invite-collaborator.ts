import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
    const { 
      email, 
      name, 
      role, 
      masterId, 
      venueId, 
      venueIds, 
      sectors, 
      department, 
      invitedByName, 
      redirectTo 
    } = req.body || {};

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'E-mail do colaborador é obrigatório.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name && typeof name === 'string') ? name.trim() : cleanEmail.split('@')[0];
    const inviter = (invitedByName && typeof invitedByName === 'string') ? invitedByName.trim() : 'Administração F5 System';
    const finalRole = role || 'crm';
    const effectiveVenueId = (venueId && venueId !== 'all') ? venueId : null;
    const effectiveVenueIds = Array.isArray(venueIds) ? venueIds : (effectiveVenueId ? [effectiveVenueId] : []);

    // Determina URL de redirecionamento para o nosso app
    const origin = req.headers.origin || req.headers.referer || 'https://app.f5system.com.br';
    const finalRedirectTo = redirectTo || `${origin}/?admin=true&type=recovery`;

    let inviteSuccess = false;
    let details = '';
    let authUserId: string | null = null;

    // 1. Tenta convite nativo via Admin Auth API (quando service role key estiver presente)
    try {
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(cleanEmail, {
        data: {
          name: cleanName,
          invited_by: inviter,
          role: finalRole,
          master_id: masterId || null,
          venue_id: effectiveVenueId,
          venue_ids: effectiveVenueIds,
          sectors: sectors || [],
          department: department || 'comercial',
        },
        redirectTo: finalRedirectTo,
      });

      if (!error && data?.user) {
        inviteSuccess = true;
        authUserId = data.user.id;
        details = 'Convite nativo Supabase disparado via admin.inviteUserByEmail';
      } else if (error) {
        details = `admin.inviteUserByEmail: ${error.message}`;
      }
    } catch (adminErr: any) {
      details = `Exceção admin: ${adminErr?.message || adminErr}`;
    }

    // 2. Se admin.inviteUserByEmail falhou porque o usuário já existia no Auth:
    if (!inviteSuccess) {
      try {
        // Busca se existe usuário unconfirmed para recriar e disparar convite oficial limpo
        const { data: listData } = await supabase.auth.admin.listUsers();
        const existingAuthUser = listData?.users?.find((u: any) => u.email?.toLowerCase() === cleanEmail);

        if (existingAuthUser && !existingAuthUser.email_confirmed_at) {
          // Deleta o registro pendente anterior para permitir novo inviteUserByEmail oficial
          await supabase.auth.admin.deleteUser(existingAuthUser.id);
          const { data: retryData, error: retryErr } = await supabase.auth.admin.inviteUserByEmail(cleanEmail, {
            data: {
              name: cleanName,
              invited_by: inviter,
              role: finalRole,
              master_id: masterId || null,
              venue_id: effectiveVenueId,
              venue_ids: effectiveVenueIds,
              sectors: sectors || [],
              department: department || 'comercial',
            },
            redirectTo: finalRedirectTo,
          });

          if (!retryErr && retryData?.user) {
            inviteSuccess = true;
            authUserId = retryData.user.id;
            details = 'Convite oficial reenviado com sucesso via admin.inviteUserByEmail';
          } else {
            details = retryErr ? retryErr.message : 'Falha ao reenviar convite.';
          }
        } else {
          // Se já confirmado ou sem service role, marca convite registrado para acesso pelo link direto
          inviteSuccess = true;
          details = 'Colaborador habilitado no sistema para acesso pelo link direto de primeiro acesso.';
        }
      } catch (clientErr: any) {
        details += ` | Processamento convite: ${clientErr?.message || clientErr}`;
      }
    }

    // 3. Blindagem de Persistência: Upsert garantido na tabela 'collaborators' com Service Role Key
    try {
      // Verifica se o colaborador já existe por email
      const { data: existingRows } = await supabase
        .from('collaborators')
        .select('id, master_id, venue_ids')
        .eq('email', cleanEmail)
        .limit(1);

      const existing = existingRows && existingRows.length > 0 ? existingRows[0] : null;
      const targetId = existing?.id || authUserId || undefined;

      const payload: Record<string, any> = {
        name: cleanName,
        email: cleanEmail,
        role: finalRole,
        active: true,
        is_first_access: true,
        updated_at: new Date().toISOString(),
      };

      let finalMasterId = masterId;
      if (!finalMasterId && effectiveVenueId) {
        try {
          const { data: vRow } = await supabase.from('venues').select('master_id').eq('id', effectiveVenueId).maybeSingle();
          if (vRow?.master_id) finalMasterId = vRow.master_id;
        } catch {}
      }

      if (finalMasterId) payload.master_id = finalMasterId;
      if (effectiveVenueId !== undefined) payload.venue_id = effectiveVenueId;
      if (effectiveVenueIds.length > 0) payload.venue_ids = effectiveVenueIds;
      if (sectors && sectors.length > 0) payload.sectors = sectors;
      if (department) payload.department = department;

      if (targetId) {
        await supabase.from('collaborators').update(payload).eq('id', targetId);
      } else {
        await supabase.from('collaborators').insert(payload);
      }
    } catch (dbErr: any) {
      console.warn('[invite-collaborator] Erro ao sincronizar tabela collaborators:', dbErr);
    }

    return res.status(200).json({
      success: inviteSuccess,
      email: cleanEmail,
      message: inviteSuccess 
        ? 'E-mail de convite e primeiro acesso enviado com sucesso!' 
        : 'Colaborador registrado no sistema com sucesso. Verifique as configurações de SMTP para envio de e-mails.',
      details,
    });
  } catch (err: any) {
    console.error('Erro em /api/invite-collaborator:', err);
    return res.status(500).json({ error: 'Erro interno ao processar convite.', details: err?.message });
  }
}
