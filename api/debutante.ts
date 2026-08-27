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

    const clean = decodeURIComponent(slugParam).trim().toLowerCase();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);

    let row = null;

    if (isUuid) {
      const { data } = await supabase.from('debutantes').select('*').eq('id', clean).maybeSingle();
      if (data) row = data;
    }

    // 1. Exact slug match
    if (!row) {
      const { data } = await supabase.from('debutantes').select('*').ilike('slug', clean).maybeSingle();
      if (data) row = data;
    }

    // 2. Base slug match (ignores 4-character random suffix variations)
    const baseSlug = clean.replace(/-[a-z0-9]{4}$/, '');
    if (!row && baseSlug) {
      const { data: rows } = await supabase.from('debutantes').select('*').ilike('slug', `${baseSlug}%`);
      if (rows && rows.length > 0) row = rows[0];
    }

    // 3. Name prefix match
    if (!row) {
      const nameGuess = clean.replace(/-\d{4}.*$/, '').replace(/-/g, ' ').trim();
      if (nameGuess.length >= 3) {
        const { data: rows } = await supabase.from('debutantes').select('*').ilike('name', `%${nameGuess}%`);
        if (rows && rows.length > 0) row = rows[0];
      }
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
