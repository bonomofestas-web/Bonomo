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

async function testSaveVideo() {
  const { data: venues } = await supabase.from('venues').select('*').limit(1);
  if (!venues || venues.length === 0) {
    console.error('Nenhuma casa encontrada.');
    return;
  }

  const venue = venues[0];
  const testR2VideoUrl = 'https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev/videos/sample_venue_video.mp4';
  
  console.log(`Atualizando casa "${venue.name}" (${venue.id}) com vídeo R2:`, testR2VideoUrl);

  const { error } = await supabase.from('venues').update({
    welcome_video_url: testR2VideoUrl,
    welcome_video_name: 'sample_venue_video.mp4'
  }).eq('id', venue.id);

  if (error) {
    console.error('❌ Erro ao atualizar welcome_video_url:', error);
  } else {
    console.log('✅ Sucesso ao salvar welcome_video_url no Supabase!');
    const { data: updated } = await supabase.from('venues').select('id, name, welcome_video_url').eq('id', venue.id).single();
    console.log('Casa atualizada no banco:', updated);
  }
}

testSaveVideo();
