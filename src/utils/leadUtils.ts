/**
 * Utilitários para gestão de Leads no F5 System
 */

/**
 * Gera o Código Único Oficial do Lead no formato 'LEAD-XXXXXX'
 * Exemplo: LEAD-7K9F2A
 */
export const generateLeadCode = (): string => {
  // Caracteres limpos e de fácil leitura (sem 0, O, 1, I para evitar ambiguidade)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomPart = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * alphabet.length);
    randomPart += alphabet[randomIndex];
  }
  return `LEAD-${randomPart}`;
};
