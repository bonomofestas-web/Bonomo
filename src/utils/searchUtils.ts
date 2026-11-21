/**
 * Utilitários de busca para PostgREST / Supabase
 * F5 System
 */

/**
 * Gera variantes de busca para Postgres ILIKE insensíveis a acentos (accent-insensitive)
 * e tolerantes a buscas parciais e nomes compostos.
 *
 * Como o ILIKE padrão do PostgreSQL é sensível a acentos (ex: 'Vitoria' não casa 'Vitória'),
 * esta função gera:
 * 1. O termo original limpo
 * 2. O termo desprovido de acentos (NFD)
 * 3. Palavras isoladas (se busca por frase/nome composto)
 * 4. Versões com o curinga '_' substituindo vogais/cedilha para casar qualquer acentuação na base.
 */
export function generateSearchTermVariants(raw?: string): string[] {
  if (!raw) return [];
  const clean = raw.replace(/[,()"\\%_]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return [];

  const variants = new Set<string>();
  variants.add(clean);

  // Sem acento
  const unaccented = clean.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  variants.add(unaccented);

  // Palavras individuais se o usuário digitou nome composto (ex: Carla Vitoria)
  const words = clean.split(/\s+/).filter(w => w.length >= 2);
  for (const w of words) {
    variants.add(w);
    const unacc = w.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    variants.add(unacc);

    // Substituição pontual de cada vogal ou 'c' por '_'
    for (let i = 0; i < unacc.length; i++) {
      const ch = unacc[i].toLowerCase();
      if ('aeiouc'.includes(ch)) {
        variants.add(unacc.slice(0, i) + '_' + unacc.slice(i + 1));
      }
    }
  }

  // Se o termo como um todo não tem espaços
  if (!clean.includes(' ')) {
    for (let i = 0; i < unaccented.length; i++) {
      const ch = unaccented[i].toLowerCase();
      if ('aeiouc'.includes(ch)) {
        variants.add(unaccented.slice(0, i) + '_' + unaccented.slice(i + 1));
      }
    }
  }

  return Array.from(variants).filter(v => v.length >= 2);
}
