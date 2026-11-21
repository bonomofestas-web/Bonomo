/**
 * Padrão único do nome do contrato / card de pós-venda:
 *   `[Homenageados] [Evento]`
 *   - Casamento: noivo e noiva somente primeiro nome: `[Noivo] e [Noiva] - Casamento` (ex: Xavier e Paula - Casamento)
 *   - 15 anos: `[Nome Sobrenome] 15 anos` (ex: Camila Ferreira 15 anos)
 *   - Demais eventos: `[Nome Sobrenome] - [Evento]`
 *
 * Código do contrato:
 *   `CTR-[INICIAIS DA CASA][ANO][MES][DIA]` (ex: CTR-ERL20291201)
 */

export type EventKind = 'quinze_anos' | 'casamento' | 'infantil' | 'corporativo' | 'outro';

export interface BuildContractTitleInput {
  /** Contratante(s) (usado como fallback se não houver homenageado) */
  contractors?: Array<string | null | undefined> | string | null;
  /** Protagonista(s): aniversariante, noivos, debutante, empresa */
  protagonists?: Array<string | null | undefined> | string | null;
  eventType?: string | null;
  /** Idade (infantil/15 anos/aniversário). */
  age?: number | string | null;
  contractorIsProtagonist?: boolean;
  customEventLabel?: string | null;
  contractCode?: string | null;
}

const PARTICLES = new Set(['de', 'da', 'do', 'dos', 'das', 'e', 'em', 'para', 'com']);

const stripAccents = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const clean = (s?: string | null) => (s || '').replace(/\s+/g, ' ').trim();

const toList = (v: BuildContractTitleInput['contractors']): string[] =>
  (Array.isArray(v) ? v : [v]).map((x) => clean(x)).filter(Boolean);

const titleCase = (s: string) =>
  clean(s)
    .toLowerCase()
    .split(' ')
    .map((w, i) => (i > 0 && PARTICLES.has(stripAccents(w)) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');

/** Primeiro nome de uma pessoa. Ex: "Paula Maria" -> "Paula" */
export const getFirstName = (s: string) => {
  const tokens = clean(s).split(' ').filter(Boolean);
  return tokens.length > 0 ? titleCase(tokens[0]) : '';
};

/** Primeiro nome + último sobrenome. Ex: "Camila dos Santos Ferreira" -> "Camila Ferreira" */
export const shortPersonName = (s: string) => {
  const tokens = titleCase(s)
    .split(' ')
    .filter((t) => t && !PARTICLES.has(stripAccents(t.toLowerCase())));
  if (tokens.length <= 2) return tokens.join(' ');
  return `${tokens[0]} ${tokens[tokens.length - 1]}`;
};

export const normalizeEventKind = (raw?: string | null): EventKind => {
  const t = stripAccents(clean(raw)).toLowerCase().replace(/[_-]+/g, ' ');
  if (/\b15\b|quinze|debut/.test(t)) return 'quinze_anos';
  if (/casament|noiv/.test(t)) return 'casamento';
  if (/infantil|crianca/.test(t)) return 'infantil';
  if (/corporat|empresa|formatura/.test(t)) return 'corporativo';
  return 'outro';
};

export const EVENT_KIND_LABEL: Record<EventKind, string> = {
  quinze_anos: '15 anos',
  casamento: 'Casamento',
  infantil: 'Infantil',
  corporativo: 'Corporativo',
  outro: 'Evento',
};

/**
 * Gera as iniciais da unidade por palavra, sem contar preposições essenciais, com no máximo 3 letras.
 * Ex: "Espaço Rio Lounge" -> "ERL"
 *     "Espaço Realizar" -> "ER"
 *     "Viena Casa De Festa" -> "VCF"
 */
export function getVenueInitials(venueName?: string | null): string {
  if (!venueName) return 'VEN';
  const cleanStr = stripAccents(clean(venueName));
  const words = cleanStr.split(/\s+/).filter((w) => !PARTICLES.has(w.toLowerCase()));
  const inits = words.map((w) => w[0].toUpperCase()).slice(0, 3).join('');
  return inits || 'VEN';
}

/**
 * Gera o código do contrato no formato oficial:
 * `CTR-[INICIAIS DA CASA][ANO][MES][DIA]`
 * Exemplo: `CTR-ERL20291201`
 */
export function generateContractCode(venueName?: string | null, eventDate?: string | null): string {
  const inits = getVenueInitials(venueName);
  const dateStr = eventDate ? eventDate.replace(/\D/g, '').slice(0, 8) : 'SEMDATA';
  return `CTR-${inits}${dateStr}`;
}

export function buildContractTitle(input: BuildContractTitleInput): string {
  const kind = normalizeEventKind(input.eventType);
  const contractors = toList(input.contractors);
  const protagonistsRaw = toList(input.protagonists)
    .map((p) => p.replace(/\s*(15\s*anos|casamento|infantil|corporativo)\s*$/i, '').trim())
    .filter(Boolean);

  const age = Number(input.age);
  const hasAge = Number.isFinite(age) && age > 0;
  const customLabel = clean(input.customEventLabel);
  const isCompany = kind === 'corporativo';

  // 1. CASAMENTO: Noivo e Noiva (somente primeiro nome de cada)
  if (kind === 'casamento') {
    let groomAndBride: string[] = [];
    if (protagonistsRaw.length >= 2) {
      groomAndBride = [getFirstName(protagonistsRaw[0]), getFirstName(protagonistsRaw[1])];
    } else if (protagonistsRaw.length === 1 && protagonistsRaw[0].includes(' e ')) {
      const parts = protagonistsRaw[0].split(/\s+e\s+/i);
      groomAndBride = [getFirstName(parts[0]), getFirstName(parts[1])];
    } else if (contractors.length >= 2) {
      groomAndBride = [getFirstName(contractors[0]), getFirstName(contractors[1])];
    } else if (protagonistsRaw.length === 1) {
      groomAndBride = [getFirstName(protagonistsRaw[0])];
    } else if (contractors.length === 1) {
      groomAndBride = [getFirstName(contractors[0])];
    }

    if (groomAndBride.length >= 2 && groomAndBride[0] && groomAndBride[1]) {
      return `${groomAndBride[0]} e ${groomAndBride[1]} - Casamento`;
    }
    if (groomAndBride.length === 1 && groomAndBride[0]) {
      return `${groomAndBride[0]} - Casamento`;
    }
    return 'Casamento';
  }

  // 2. 15 ANOS: Nome e Sobrenome 15 anos
  if (kind === 'quinze_anos') {
    const rawHonoree = protagonistsRaw[0] || '';
    if (rawHonoree) {
      const tokens = clean(rawHonoree).split(' ').filter((t) => !PARTICLES.has(stripAccents(t.toLowerCase())));
      if (tokens.length >= 2) {
        return `${shortPersonName(rawHonoree)} 15 anos`;
      }
      const debFirst = titleCase(tokens[0]);
      const clientName = contractors[0] || '';
      const clientTokens = clean(clientName).split(' ').filter((t) => !PARTICLES.has(stripAccents(t.toLowerCase())));
      const clientLast = clientTokens.length > 1 ? titleCase(clientTokens[clientTokens.length - 1]) : '';
      if (clientLast && stripAccents(clientLast.toLowerCase()) !== stripAccents(debFirst.toLowerCase())) {
        return `${debFirst} ${clientLast} 15 anos`;
      }
      return `${debFirst} 15 anos`;
    }
    const fallback = contractors[0] ? shortPersonName(contractors[0]) : '';
    return fallback ? `${fallback} 15 anos` : '15 anos';
  }

  // 3. ANIVERSÁRIO COM IDADE
  if (hasAge) {
    const who = protagonistsRaw[0] ? (isCompany ? titleCase(protagonistsRaw[0]) : shortPersonName(protagonistsRaw[0]))
      : (contractors[0] ? (isCompany ? titleCase(contractors[0]) : shortPersonName(contractors[0])) : '');
    return who ? `${who} - ${age} Anos` : `${age} Anos`;
  }

  // 4. DEMAIS EVENTOS (Corporativo, Infantil, Outro)
  const who = protagonistsRaw[0] ? (isCompany ? titleCase(protagonistsRaw[0]) : shortPersonName(protagonistsRaw[0]))
    : (contractors[0] ? (isCompany ? titleCase(contractors[0]) : shortPersonName(contractors[0])) : '');

  let label = EVENT_KIND_LABEL[kind];
  if (kind === 'outro' && customLabel) label = titleCase(customLabel);

  if (who) {
    return `${who} - ${label}`;
  }
  return label;
}
