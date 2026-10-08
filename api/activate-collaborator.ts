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
    const { email, collabId, password } = req.body || {};

    const cleanEmail = (email && typeof email === 'string') ? email.trim().toLowerCase() : '';
    const cleanId = (collabId && typeof collabId === 'string') ? collabId.trim() : '';
    const cleanPassword = (password && typeof password === 'string') ? password.trim() : '';

    if (!cleanPassword || cleanPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'A senha deve conter no mínimo 6 caracteres.' });
    }

    if (!cleanEmail && !cleanId) {
      return res.status(400).json({ success: false, error: 'Identificador ou e-mail do colaborador é obrigatório.' });
    }

    // 1. Localiza o colaborador na tabela 'collaborators' (por ID ou por e-mail)
    let collabRecord: any = null;

    if (cleanEmail) {
      const { data: byEmail } = await supabase
        .from('collaborators')
        .select('*')
        .ilike('email', cleanEmail)
        .limit(1);
      if (byEmail && byEmail.length > 0) {
        collabRecord = byEmail[0];
      }
    }

    if (!collabRecord && cleanId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
      if (isUuid) {
        const { data: byId } = await supabase
          .from('collaborators')
          .select('*')
          .eq('id', cleanId)
          .limit(1);
        if (byId && byId.length > 0) {
          collabRecord = byId[0];
        }
      }
    }

    if (!collabRecord) {
      return res.status(404).json({
        success: false,
        error: 'Colaborador não encontrado na base de dados. Verifique o e-mail ou contate a gerência.'
      });
    }

    if (collabRecord.active === false) {
      return res.status(403).json({
        success: false,
        error: 'Esta conta de colaborador foi desativada pela gerência.'
      });
    }

    const effectiveEmail = (collabRecord.email || cleanEmail).trim().toLowerCase();

    // 2. Atualiza ou cria a conta no Supabase Auth com permissão administrativa (Admin API)
    let authUpdated = false;
    try {
      const { data: listData } = await supabase.auth.admin.listUsers();
      const existingAuthUser = listData?.users?.find((u: any) => u.email?.toLowerCase() === effectiveEmail);

      if (existingAuthUser) {
        // Usuário já existe no Auth: atualiza a senha e confirma o e-mail
        const { error: updateAuthErr } = await supabase.auth.admin.updateUserById(existingAuthUser.id, {
          password: cleanPassword,
          email_confirm: true,
          user_metadata: {
            name: collabRecord.name,
            role: collabRecord.role,
            master_id: collabRecord.master_id,
          }
        });
        if (!updateAuthErr) authUpdated = true;
      } else {
        // Usuário não existe no Auth: cria usuário com senha e confirmação automática
        const { error: createAuthErr } = await supabase.auth.admin.createUser({
          email: effectiveEmail,
          password: cleanPassword,
          email_confirm: true,
          user_metadata: {
            name: collabRecord.name,
            role: collabRecord.role,
            master_id: collabRecord.master_id,
          }
        });
        if (!createAuthErr) authUpdated = true;
      }
    } catch (authErr) {
      console.warn('[activate-collaborator] Aviso na sincronização do Supabase Auth:', authErr);
    }

    // 3. Atualiza o registro na tabela 'collaborators' (is_first_access = false, ativação e senha)
    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      password: cleanPassword,
      is_first_access: false,
      active: true,
      activated_at: nowIso,
      last_login_at: nowIso,
      updated_at: nowIso,
    };

    const { error: updateCollabErr } = await supabase
      .from('collaborators')
      .update(updatePayload)
      .eq('id', collabRecord.id);

    if (updateCollabErr) {
      console.error('[activate-collaborator] Erro ao atualizar colaboradores:', updateCollabErr);
      return res.status(500).json({
        success: false,
        error: 'Falha ao registrar a nova senha no banco de dados.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Conta ativada com sucesso!',
      email: effectiveEmail,
      collabId: collabRecord.id,
      name: collabRecord.name,
      role: collabRecord.role,
      authUpdated,
    });
  } catch (err: any) {
    console.error('Erro em /api/activate-collaborator:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Erro interno ao ativar colaborador.' });
  }
}
