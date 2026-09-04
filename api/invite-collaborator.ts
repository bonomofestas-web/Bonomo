import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zwozhktkapedthteckai.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3b3poa3RrYXBlZHRodGVja2FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MDc0OTAsImV4cCI6MjEwMzI4MzQ5MH0.gZiNWfTujZLwZk0EIukj57pq2LyZ1dxbUSb5ueVSzTI';

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
    const { email, name, role, invitedByName, redirectTo } = req.body || {};

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'E-mail do colaborador é obrigatório.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name && typeof name === 'string') ? name.trim() : cleanEmail.split('@')[0];
    const inviter = (invitedByName && typeof invitedByName === 'string') ? invitedByName.trim() : 'Administração F5 System';

    // Determina URL de redirecionamento para o nosso app
    const origin = req.headers.origin || req.headers.referer || 'https://bonomo-festas.vercel.app';
    const finalRedirectTo = redirectTo || `${origin}/?admin=true&type=recovery`;

    let inviteSuccess = false;
    let details = '';

    // 1. Tenta convite nativo via Admin Auth API (quando service role key estiver presente)
    try {
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(cleanEmail, {
        data: {
          name: cleanName,
          invited_by: inviter,
          role: role || 'sdr',
        },
        redirectTo: finalRedirectTo,
      });

      if (!error && data?.user) {
        inviteSuccess = true;
        details = 'Convite nativo Supabase disparado via admin.inviteUserByEmail';
      } else if (error) {
        details = `admin.inviteUserByEmail falhou: ${error.message}`;
      }
    } catch (adminErr: any) {
      details = `Exceção admin: ${adminErr?.message || adminErr}`;
    }

    // 2. Se admin.inviteUserByEmail falhou (ex: sem service role key), tenta signUp ou resetPasswordForEmail
    if (!inviteSuccess) {
      try {
        const tempPassword = 'Bonomo_' + Math.random().toString(36).slice(-8) + '!';
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: tempPassword,
          options: {
            data: {
              name: cleanName,
              invited_by: inviter,
              role: role || 'sdr',
            },
            emailRedirectTo: finalRedirectTo,
          }
        });

        const isNewUser = !signUpError && 
          signUpData?.user && 
          Array.isArray(signUpData.user.identities) && 
          signUpData.user.identities.length > 0;

        if (isNewUser) {
          inviteSuccess = true;
          details = 'Novo usuário registrado no Auth e e-mail de ativação disparado com sucesso via signUp';
        } else {
          // Se o usuário já existia no Auth (identities vazio no signUp) ou se signUp falhou, dispara resetPasswordForEmail
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
            redirectTo: finalRedirectTo,
          });

          if (!resetError) {
            inviteSuccess = true;
            details = 'Usuário já existente no Auth: e-mail de acesso enviado com sucesso via resetPasswordForEmail';
          } else {
            details += ` | signUp: ${signUpError?.message || 'identities vazias'} | reset: ${resetError?.message}`;
          }
        }
      } catch (clientErr: any) {
        details += ` | Falha fallback: ${clientErr?.message || clientErr}`;
      }
    }

    return res.status(200).json({
      success: inviteSuccess,
      email: cleanEmail,
      message: inviteSuccess 
        ? 'E-mail de convite e primeiro acesso enviado com sucesso!' 
        : 'Colaborador salvo no banco. Verifique as configurações de SMTP no Supabase.',
      details,
    });
  } catch (err: any) {
    console.error('Erro em /api/invite-collaborator:', err);
    return res.status(500).json({ error: 'Erro interno ao processar convite.', details: err?.message });
  }
}
