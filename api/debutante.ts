import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zwozhktkapedthteckai.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3b3poa3RrYXBlZHRodGVja2FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MDc0OTAsImV4cCI6MjEwMzI4MzQ5MH0.gZiNWfTujZLwZk0EIukj57pq2LyZ1dxbUSb5ueVSzTI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS for all public visitors
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const slugParam = (req.query.slug || req.query.d || req.query.id) as string;
  if (!slugParam) {
    return res.status(400).json({ error: 'Parâmetro slug ou id é obrigatório.' });
  }

  try {
    const clean = decodeURIComponent(slugParam).trim().toLowerCase();

    // Query debutante by slug or id
    const { data: row, error } = await supabase
      .from('debutantes')
      .select('*')
      .or(`slug.ilike.${clean},id.eq.${clean}`)
      .maybeSingle();

    if (error) {
      console.error('[API Debutante] Erro ao buscar:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!row) {
      return res.status(404).json({ error: 'Debutante não encontrada.' });
    }

    // Fetch related venue
    let venueData = null;
    if (row.venue_id) {
      const { data: v } = await supabase.from('venues').select('*').eq('id', row.venue_id).maybeSingle();
      if (v) venueData = v;
    }

    // Fetch guests, referrals, appointments
    const [guestsRes, referralsRes, appointmentsRes] = await Promise.all([
      supabase.from('guests').select('*').eq('debutante_id', row.id),
      supabase.from('referrals').select('*').eq('debutante_id', row.id),
      supabase.from('appointments').select('*').eq('debutante_id', row.id),
    ]);

    return res.status(200).json({
      success: true,
      debutante: row,
      venue: venueData,
      guests: guestsRes.data || [],
      referrals: referralsRes.data || [],
      appointments: appointmentsRes.data || [],
    });
  } catch (err: any) {
    console.error('[API Debutante] Falha geral:', err);
    return res.status(500).json({ error: err?.message || 'Erro interno do servidor.' });
  }
}
