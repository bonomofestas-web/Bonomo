/**
 * Padrão único do nome do contrato / card de pós-venda:
 *   `Contratante • Título do evento`  (título = protagonista(s) + tipo do evento)
 * Função pura: não acessa banco nem estado. Usada na criação/aprovação/importação,
 * na troca de tipo de evento e na exibição.
 */

export type EventKind = 'quinze_anos' | 'casamento' | 'infantil' | 'corporativo' | 'outro';

export interface BuildContractTitleInput {
  /** Contratante(s). Dois ou mais (casal) => usa só o título. Empresa = nome fantasia. */
  contractors?: Array<string | null | undefined> | string | null;
  /** Protagonista(s): aniversariante, noivos, empresa. Casamento: na ordem informada na ficha. */
  protagonists?: Array<string | null | undefined> | string | null;
  eventType?: string | null;
  /** Idade (infantil/15 anos). */
  age?: number | string | null;
  /** payerRelationship === 'self' => contratante é o próprio protagonista. */
  contractorIsProtagonist?: boolean;
  /** Rótulo livre quando o tipo é "outro". */
  customEventLabel?: string | null;
  /** Último recurso quando não há nada. */
  contractCode?: string | null;
}

const PARTICLES = new Set(['de', 'da', 'do', 'dos', 'das', 'e']);

const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

const clean = (s?: string | null) => (s || '').replace(/\s+/g, ' ').trim();

const toList = (v: BuildContractTitleInput['contractors']): string[] =>
  (Array.isArray(v) ? v : [v]).map((x) => clean(x)).filter(Boolean);

/** Chave de comparação: sem acento, minúscula, sem partículas. */
const nameKey = (s: string) =>
  stripAccents(s)
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t && !PARTICLES.has(t))
    .join(' ');

const titleCase = (s: string) =>
  clean(s)
    .toLowerCase()
    .split(' ')
    .map((w, i) => (i > 0 && PARTICLES.has(stripAccents(w)) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');

/** "Maria da Silva e Souza" -> "Maria Souza" (primeiro nome + último sobrenome). */
const shortPersonName = (s: string) => {
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

const joinCouple = (names: string[]) => (names.length <= 1 ? names[0] || '' : `${names[0]} e ${names[1]}`);

const removeRepeatedLabel = (title: string, label: string) => {
  const l = stripAccents(label).toLowerCase();
  const words = title.split(' ');
  const labelWords = label.split(' ').length;
  // "Isabela 15 anos 15 anos" -> "Isabela 15 anos"
  while (words.length >= labelWords * 2) {
    const tail = stripAccents(words.slice(-labelWords).join(' ')).toLowerCase();
    const prev = stripAccents(words.slice(-labelWords * 2, -labelWords).join(' ')).toLowerCase();
    if (tail === l && prev === l) words.splice(-labelWords, labelWords);
    else break;
  }
  return words.join(' ');
};

export function buildContractTitle(input: BuildContractTitleInput): string {
  const kind = normalizeEventKind(input.eventType);
  const contractors = toList(input.contractors);
  // Tira do nome o tipo do evento digitado junto ("Isabela 15 anos" -> "Isabela"), para nao repetir o rotulo
  const protagonistsRaw = toList(input.protagonists)
    .map((p) => p.replace(/\s*(15\s*anos|casamento|infantil|corporativo)\s*$/i, '').trim())
    .filter(Boolean);
  const age = Number(input.age);
  const hasAge = Number.isFinite(age) && age > 0;
  const customLabel = clean(input.customEventLabel);

  // Contratante: nome e sobrenome. Empresa (corporativo) = nome fantasia como veio.
  const isCompany = kind === 'corporativo';
  const protagonists = protagonistsRaw.map((p) => (isCompany ? titleCase(p) : shortPersonName(p)));

  // Rótulo do tipo
  let label: string;
  if (kind === 'infantil' && hasAge) label = `${age} anos`;
  else if (kind === 'outro' && customLabel) label = titleCase(customLabel);
  else if (kind === 'outro' && clean(input.eventType) && !/^outro$/i.test(clean(input.eventType)))
    label = titleCase(clean(input.eventType).replace(/[_-]+/g, ' '));
  else label = EVENT_KIND_LABEL[kind];

  // Título = protagonista(s) + tipo
  let who = '';
  if (kind === 'casamento') who = joinCouple(protagonists.slice(0, 2));
  else who = protagonists[0] || '';

  let title = who ? `${who} ${label}` : label;
  title = removeRepeatedLabel(clean(title), label);
  // Sem protagonista: o título é só o tipo; "Evento" genérico não agrega nada
  if (!who && kind === 'outro' && !customLabel && !clean(input.eventType)) title = '';

  // Contratante
  const contractorShort = contractors.map((c) => (isCompany ? titleCase(c) : shortPersonName(c)));
  const protagonistKeys = protagonistsRaw.map(nameKey);
  const contractorIsOne =
    Boolean(input.contractorIsProtagonist) ||
    contractors.some((c) => {
      const k = nameKey(c);
      const kShort = nameKey(shortPersonName(c));
      return protagonistKeys.some((pk) => pk === k || nameKey(shortPersonName(pk)) === kShort);
    });
  const coupleContracting = contractors.length >= 2;

  const prefix = contractorIsOne || coupleContracting ? '' : contractorShort[0] || '';

  if (prefix && title) return `${prefix} • ${title}`;
  if (title) return title;
  if (prefix) return prefix;
  return clean(input.contractCode) || 'Contrato';
}
