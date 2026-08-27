import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://zwozhktkapedthteckai.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3b3poa3RrYXBlZHRodGVja2FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MDc0OTAsImV4cCI6MjEwMzI4MzQ5MH0.gZiNWfTujZLwZk0EIukj57pq2LyZ1dxbUSb5ueVSzTI';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

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
