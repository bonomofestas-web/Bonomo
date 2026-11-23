// Texto que chegou ao banco com acentos trocados por "?" (cada letra acentuada de 2 bytes virou "??").
// A letra original não dá para adivinhar em texto livre; só rótulos conhecidos são restaurados exatamente.

const KNOWN_LABELS: Array<[RegExp, string]> = [
  [/^Importa\?+o de contratos$/i, 'Importação de contratos'],
  [/^Importa\?+o$/i, 'Importação'],
  [/^Ger\?+ncia$/i, 'Gerência'],
  [/^Sistema \(Migra\?+o Autom\?+tica\)$/i, 'Sistema (Migração Automática)'],
];

/** Restaura rótulos conhecidos e, no restante, remove os "?" colados entre letras para o texto não aparecer quebrado. */
export function repairBrokenAccents<T extends string | null | undefined>(text: T): T {
  if (typeof text !== 'string' || !text.includes('?')) return text;
  const trimmed = text.trim();
  for (const [pattern, fixed] of KNOWN_LABELS) {
    if (pattern.test(trimmed)) return fixed as T;
  }
  // "MAUR??CIO" -> "MAURCIO" não é o ideal, mas evita mostrar lixo; só mexe em "?" entre letras.
  return text.replace(/(?<=[A-Za-zÀ-ÿ])\?{2,}(?=[A-Za-zÀ-ÿ])/g, '') as T;
}
