import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let val = (match[2] || '').trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    env[key] = val;
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function testPartialUpsert() {
  const venueId = 'b2222222-2222-2222-2222-222222222222';
  
  // Test partial payload like what frontend sends
  const partialPayload = {
    id: venueId,
    name: 'Mansão Bonomo',
    tagline: 'Onde momentos exclusivos se transformam em memórias inesquecíveis',
    description: 'Espaço requintado preparado especialmente para noites inesquecíveis.',
    address: 'Estr. dos Três Rios, 1571 - Freguesia, RJ',
    ballroom_image_url: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&auto=format&fit=crop&q=80',
    welcome_video_url: 'https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev/videos/sample_venue_video.mp4',
    primary_color: '#6366F1',
    accent_color: '#06B6D4',
  };

  console.log('Testando supabase.from("venues").upsert com partial payload...');
  const { data, error } = await supabase.from('venues').upsert(partialPayload).select();
  if (error) {
    console.error('❌ Erro no upsert:', error);
  } else {
    console.log('✅ Sucesso no upsert! Retorno:', data);
  }
}

testPartialUpsert();
