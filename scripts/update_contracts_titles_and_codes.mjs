import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf-8')
    .split(/\r?\n/)
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()])
);

const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const PREP = new Set(['de', 'da', 'do', 'dos', 'das', 'e', 'em', 'para', 'com']);
const PACKAGES = /\b(black|gold|silver|turbo|bronze|vip|premium|clicksign|docx)\b/gi;

function clean(s) {
  return (s || '').replace(/\s+/g, ' ').trim();
}

function stripAccents(s) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function titleCase(s) {
  return clean(s)
    .toLowerCase()
    .split(' ')
    .map((w, i) => (i > 0 && PREP.has(stripAccents(w)) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

function firstName(s) {
  const t = clean(s).replace(PACKAGES, '').split(' ').filter(Boolean);
  return t.length > 0 ? titleCase(t[0]) : '';
}

function firstAndLastName(fullName) {
  if (!fullName) return '';
  const tokens = clean(fullName)
    .replace(PACKAGES, '')
    .split(' ')
    .filter(t => !PREP.has(stripAccents(t.toLowerCase())));
  if (tokens.length === 0) return '';
  if (tokens.length === 1) return titleCase(tokens[0]);
  return `${titleCase(tokens[0])} ${titleCase(tokens[tokens.length - 1])}`;
}

export function getVenueInitials(venueName) {
  if (!venueName) return 'VEN';
  const cleanStr = stripAccents(venueName);
  const words = cleanStr.split(/\s+/).filter(w => !PREP.has(w.toLowerCase()));
  const inits = words.map(w => w[0].toUpperCase()).slice(0, 3).join('');
  return inits || 'VEN';
}

export function formatContractTitle(entry) {
  const eventType = (entry.event_type || '').toLowerCase();
  const pasta = (entry.pasta || '').replace(/[_\-]+/g, ' ');
  const honoree = entry.honoree ? clean(entry.honoree) : '';
  const clientName = entry.name ? clean(entry.name) : '';

  // 1. CASAMENTO: [Noivo] e [Noiva] - Casamento (somente primeiro nome de cada)
  if (eventType === 'casamento' || /casamento|cas\./i.test(pasta)) {
    // Procura padrão "CASAMENTO NOIVO E NOIVA" ou "CAS. NOIVO E NOIVA"
    const cleanedPasta = pasta.replace(PACKAGES, '');
    const m = cleanedPasta.match(/cas(?:amento|\.)?\s+([^/()\-–—]+?)\s+[eE&]\s+([^/()\-–—]+?)(?:\s*\(|\s*$)/i);
    if (m) {
      const p1 = firstName(m[1]);
      const p2 = firstName(m[2]);
      if (p1 && p2) {
        return `${p1} e ${p2} - Casamento`;
      }
    }
    const fName = firstName(clientName);
    return fName ? `${fName} - Casamento` : 'Casamento';
  }

  // 2. 15 ANOS: [Nome] [Sobrenome] 15 anos
  if (eventType === '15_anos' || /\b15\s*a(?:nos)?\b/i.test(pasta)) {
    let deb = honoree;
    if (!deb) {
      const m = pasta.match(/15\s*(?:anos?|a)\s+([^/()\-–—]+)/i);
      if (m) deb = m[1].replace(PACKAGES, '').trim();
    }

    if (deb) {
      const debTokens = clean(deb).replace(PACKAGES, '').split(' ').filter(t => !PREP.has(stripAccents(t.toLowerCase())));
      if (debTokens.length >= 2) {
        return `${firstAndLastName(deb)} 15 anos`;
      }
      const debFirst = titleCase(debTokens[0]);
      // Pega último sobrenome do contratante
      const clientTokens = clean(clientName).split(' ').filter(t => !PREP.has(stripAccents(t.toLowerCase())));
      const clientLastName = clientTokens.length > 1 ? titleCase(clientTokens[clientTokens.length - 1]) : '';
      if (clientLastName && stripAccents(clientLastName.toLowerCase()) !== stripAccents(debFirst.toLowerCase())) {
        return `${debFirst} ${clientLastName} 15 anos`;
      }
      return `${debFirst} 15 anos`;
    }

    const cName = firstAndLastName(clientName);
    return cName ? `${cName} 15 anos` : '15 anos';
  }

  // 3. ANIVERSÁRIO
  if (eventType === 'aniversario' || /\b\d+\s*a(?:nos)?\b/i.test(pasta)) {
    const ageMatch = pasta.match(/(\d+)\s*a(?:nos)?\s+([^/()\-–—]+)/i);
    if (ageMatch) {
      const age = ageMatch[1];
      const person = firstAndLastName(ageMatch[2]) || firstAndLastName(clientName);
      return `${person} - ${age} Anos`;
    }
    const who = firstAndLastName(honoree) || firstAndLastName(clientName);
    return who ? `${who} - Aniversário` : 'Aniversário';
  }

  // 4. INFANTIL
  if (eventType === 'infantil') {
    const who = firstAndLastName(honoree) || firstAndLastName(clientName);
    return who ? `${who} - Infantil` : 'Infantil';
  }

  // 5. CORPORATIVO / OUTRO
  const who = firstAndLastName(honoree) || firstAndLastName(clientName);
  const label = eventType === 'corporativo' ? 'Corporativo' : 'Evento';
  return who ? `${who} - ${label}` : label;
}

async function main() {
  console.log('--- Lendo import_set.json ---');
  const importSet = JSON.parse(
    readFileSync('C:\\Users\\--\\Downloads\\Contratos_catalogo\\import_set.json', 'utf-8')
  );
  console.log(`Lidos ${importSet.length} contratos do catálogo oficial.`);

  const { data: venues } = await sb.from('venues').select('id, name');
  const venueMap = new Map();
  venues.forEach(v => {
    venueMap.set(v.id, v.name);
    venueMap.set(v.name.toLowerCase().replace(/ de festas?$/, ''), v);
  });

  const { data: dbContracts } = await sb
    .from('contracts')
    .select('id, commercial_fields_snapshot, event_date, venue_id, client_snapshot')
    .order('event_date', { ascending: true });

  console.log(`Contratos no banco local: ${dbContracts.length}`);

  // Mapeia por importKey
  const contractByImportKey = new Map();
  dbContracts.forEach(c => {
    const k = c.commercial_fields_snapshot?.importKey;
    if (k) contractByImportKey.set(k, c);
  });

  // Contador de códigos por base: `CTR-${inits}${dateStr}`
  const codeCounts = new Map();
  const updates = [];

  for (const entry of importSet) {
    const importKey = `contratos:${entry.key}`;
    const dbC = contractByImportKey.get(importKey);
    if (!dbC) {
      console.warn(`Contrato não encontrado no banco para importKey: ${importKey}`);
      continue;
    }

    const venue = venues.find(v => 
      v.id === dbC.venue_id || 
      v.name.toLowerCase().replace(/ de festas?$/, '') === entry.venue.toLowerCase().replace(/ de festas?$/, '')
    );
    const venueName = venue ? venue.name : entry.venue;
    const inits = getVenueInitials(venueName);

    const eventDate = dbC.event_date || entry.event_date;
    const dateStr = eventDate ? eventDate.replace(/-/g, '') : 'SEMDATA';
    const baseCode = `CTR-${inits}${dateStr}`;

    const seq = (codeCounts.get(baseCode) || 0) + 1;
    codeCounts.set(baseCode, seq);
    const finalCode = seq === 1 ? baseCode : `${baseCode}-${seq}`;

    const newTitle = formatContractTitle(entry);

    updates.push({
      id: dbC.id,
      contract_code: finalCode,
      contract_title: newTitle,
      title: newTitle,
    });
  }

  console.log(`Total de contratos formatados: ${updates.length}`);
  console.log('Exemplos de contratos formatados:');
  updates.slice(0, 15).forEach((u, i) => {
    console.log(`${i + 1}. [${u.contract_code}] ${u.contract_title}`);
  });

  // Executa localmente no Supabase local
  console.log('\n--- Atualizando banco LOCAL ---');
  for (const u of updates) {
    const { error } = await sb
      .from('contracts')
      .update({
        contract_code: u.contract_code,
        contract_title: u.contract_title,
        title: u.title,
      })
      .eq('id', u.id);
    if (error) {
      console.error(`Erro ao atualizar ${u.id}:`, error);
    }
  }
  console.log('Banco local atualizado com sucesso!');

  // Gera o script SQL definitivo para PRODUÇÃO
  const sqlParts = [
    `-- ==============================================================================`,
    `-- F5 SYSTEM • LIMPEZA DE LEGADOS E PADRONIZAÇÃO DE NOMES E CÓDIGOS DE CONTRATOS`,
    `-- Regras aplicadas:`,
    `--   - Nome: [Homenageados] [Evento] (Casamento: Noivo e Noiva / 15 anos: Nome Sobrenome 15 anos)`,
    `--   - Código: CTR-[INICIAIS DA CASA][ANO][MES][DIA] (ex: CTR-ERL20291201)`,
    `--   - Deixa SOMENTE os 218 contratos reais (remove os 234 legados/vazios)`,
    `-- ==============================================================================`,
    `SET session_replication_role = 'replica';`,
    ``,
    `-- 1. LIMPEZA DOS CONTRATOS LEGADOS (DEIXA APENAS OS 218 REAIS)`,
    `DELETE FROM public.contracts `,
    `WHERE commercial_fields_snapshot->>'origem' IS NULL `,
    `   OR commercial_fields_snapshot->>'origem' != 'importacao_contratos';`,
    ``,
    `-- 2. ATUALIZAÇÃO DOS 218 CONTRATOS REAIS COM OS NOVOS TÍTULOS E CÓDIGOS`,
  ];

  for (const u of updates) {
    const escapedTitle = u.contract_title.replace(/'/g, "''");
    sqlParts.push(
      `UPDATE public.contracts SET ` +
      `contract_code = '${u.contract_code}', ` +
      `contract_title = '${escapedTitle}', ` +
      `title = '${escapedTitle}' ` +
      `WHERE id = '${u.id}';`
    );
  }

  sqlParts.push(``);
  sqlParts.push(`SET session_replication_role = 'origin';`);
  sqlParts.push(``);
  sqlParts.push(`-- VERIFICAÇÃO FINAL:`);
  sqlParts.push(`SELECT `);
  sqlParts.push(`  count(*) as total_contratos_producao,`);
  sqlParts.push(`  count(*) FILTER (WHERE total_amount > 0) as com_valor,`);
  sqlParts.push(`  count(*) FILTER (WHERE contract_file_url IS NOT NULL) as com_pdf_r2`);
  sqlParts.push(`FROM public.contracts;`);

  const targetPath = 'supabase/manual/04_APLICAR_NOVOS_PADROES_E_LIMPAR_LEGADOS.sql';
  writeFileSync(targetPath, sqlParts.join('\n'), 'utf-8');
  console.log(`\nScript gerado com sucesso em: ${targetPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
