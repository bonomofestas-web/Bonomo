import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
let supabaseUrl = '', supabaseAnonKey = '';
envContent.split('\n').forEach(line => {
  const m = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
  if (m) {
    let val = (m[2] || '').trim().replace(/^['"]|['"]$/g, '');
    if (m[1] === 'VITE_SUPABASE_URL') supabaseUrl = val;
    if (m[1] === 'VITE_SUPABASE_ANON_KEY') supabaseAnonKey = val;
  }
});
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TESTES_DO_YURI_VENUE_ID = '065cb6f1-f4d9-4a76-a0e3-47d75bebac1f';
const FUNNEL_7666_ID = '2edfcbb9-130a-41a2-aae4-b855aeb312f5';
const SOURCE_7666_ID = '7c65ad4e-95ef-4917-b19f-5bdce0861b11';

async function migrate() {
  console.log('1. Atualizando Funil BONOMO 7666 para a casa Testes do Yuri...');
  const { error: funnelErr } = await supabase
    .from('commercial_funnels')
    .update({
      venue_id: TESTES_DO_YURI_VENUE_ID,
      shared_venue_ids: [TESTES_DO_YURI_VENUE_ID]
    })
    .eq('id', FUNNEL_7666_ID);

  if (funnelErr) console.error('Erro ao atualizar funil:', funnelErr);
  else console.log('✅ Funil BONOMO 7666 atualizado com sucesso para Testes do Yuri!');

  console.log('2. Atualizando Leads de 7666 para Testes do Yuri...');
  // Buscar todos os leads da origem 7666 ou do funil 7666
  const { data: leadsToUpdate } = await supabase
    .from('leads')
    .select('id, name, venue_id, source_name, funnel_id')
    .or(`source_id.eq.${SOURCE_7666_ID},funnel_id.eq.${FUNNEL_7666_ID},source_name.ilike.%7666%`);

  console.log(`Encontrados ${leadsToUpdate?.length || 0} leads para migrar:`);
  for (const l of (leadsToUpdate || [])) {
    console.log(` - Migrando lead: ${l.name} (${l.id}) de venue ${l.venue_id} -> ${TESTES_DO_YURI_VENUE_ID}`);
    const { error: leadUpErr } = await supabase
      .from('leads')
      .update({
        venue_id: TESTES_DO_YURI_VENUE_ID,
        venue_name: 'Testes do Yuri'
      })
      .eq('id', l.id);
    if (leadUpErr) console.error(`   Erro ao migrar lead ${l.id}:`, leadUpErr);
  }

  console.log('✅ Migração concluída com sucesso!');
}

migrate();
