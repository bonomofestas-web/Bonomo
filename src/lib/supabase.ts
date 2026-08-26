import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project') &&
  !supabaseAnonKey.includes('your-anon-key')
);

// Create Supabase Client with persistent authentication in localStorage
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
    },
  }
);

export const checkSupabaseConnection = async (): Promise<{ ok: boolean; message: string }> => {
  if (!isSupabaseConfigured) {
    return {
      ok: false,
      message: 'Supabase não configurado. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.',
    };
  }

  try {
    const { error } = await supabase.from('venues').select('count', { count: 'exact', head: true });
    if (error) {
      return { ok: false, message: `Erro ao conectar: ${error.message}` };
    }
    return { ok: true, message: 'Conectado ao Supabase com sucesso!' };
  } catch (err: any) {
    return { ok: false, message: `Falha de rede ou configuração: ${err?.message || 'Desconhecido'}` };
  }
};
