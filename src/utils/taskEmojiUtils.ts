/**
 * Utilitário estrito para sanitização e eliminação de emojis na interface do F5 System.
 * Conforme Regra Fundamental 8 e Diretrizes do Sistema:
 * É terminantemente proibido o uso de emojis na interface visual.
 * Utilizamos exclusivamente ícones modernos da biblioteca lucide-react.
 */

// Regex para detectar e remover emojis Unicode, símbolos estendidos e variações pictográficas
export const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F251}]/gu;

/**
 * Remove qualquer emoji Unicode de uma string, limpando espaços duplos remanescentes.
 */
export function stripEmojis(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(EMOJI_REGEX, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Sanitiza o título de uma tarefa removendo emojis como 🏛️, 🎉, etc.
 * Mantém os prefixos formais limpos como "Visita Comercial:", "Degustação:", "Follow-up:".
 */
export function sanitizeTaskTitle(title: string | null | undefined): string {
  if (!title) return '';
  const cleaned = stripEmojis(title);
  // Remove caracteres decorativos órfãos como : ou - no início
  return cleaned.replace(/^[:\-–—\s]+/, '').trim();
}
