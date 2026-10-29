/**
 * Utilitário Universal de Formatação e Máscara de Telefone
 * Formata números brasileiros no padrão (XX) 9XXXX-XXXX ou (XX) XXXX-XXXX
 */

/**
 * Verifica se um identificador é um LID multi-dispositivo do WhatsApp (@lid ou 14-16 dígitos)
 */
export const isLidIdentifier = (id?: string | null): boolean => {
  if (!id) return false;
  if (typeof id === 'string' && id.includes('@lid')) return true;
  const digits = String(id).replace(/\D/g, '');
  if (!digits) return false;
  if (digits.length >= 14) return true;
  if (digits.length >= 12 && !digits.startsWith('55')) return true;
  return false;
};

export const formatPhone = (phone?: string | null): string => {
  if (!phone) return '';
  
  // Se for LID do WhatsApp, não exibe string crua de dispositivo na interface
  if (isLidIdentifier(phone)) return '';

  const trimmed = String(phone).trim();

  const hasPlus = trimmed.startsWith('+');

  // Remove caracteres não numéricos
  const numbers = trimmed.replace(/\D/g, '');
  if (!numbers) return '';

  // 1. Número com DDI 55 (Brasil): 13 dígitos (+55 XX 9XXXX-XXXX)
  if (numbers.length === 13 && numbers.startsWith('55')) {
    const ddd = numbers.slice(2, 4);
    const part1 = numbers.slice(4, 9);
    const part2 = numbers.slice(9);
    return `+55 (${ddd}) ${part1}-${part2}`;
  }

  // 2. Número com DDI 55 (Brasil) sem o 9 (fixo ou antigo): 12 dígitos (+55 XX XXXX-XXXX)
  if (numbers.length === 12 && numbers.startsWith('55')) {
    const ddd = numbers.slice(2, 4);
    const part1 = numbers.slice(4, 8);
    const part2 = numbers.slice(8);
    return `+55 (${ddd}) ${part1}-${part2}`;
  }

  // 3. Celular nacional com 11 dígitos: (XX) 9XXXX-XXXX
  if (numbers.length === 11) {
    const ddd = numbers.slice(0, 2);
    const part1 = numbers.slice(2, 7);
    const part2 = numbers.slice(7);
    return `${hasPlus ? '+55 ' : ''}(${ddd}) ${part1}-${part2}`;
  }
  
  // 4. Fixo nacional com 10 dígitos: (XX) XXXX-XXXX
  if (numbers.length === 10) {
    const ddd = numbers.slice(0, 2);
    const part1 = numbers.slice(2, 6);
    const part2 = numbers.slice(6);
    return `${hasPlus ? '+55 ' : ''}(${ddd}) ${part1}-${part2}`;
  }

  // 5. Número internacional ou fora do padrão comum
  if (hasPlus || numbers.length > 13) {
    return hasPlus ? trimmed : `+${numbers}`;
  }

  // Menor que 10 dígitos: formatação progressiva
  if (numbers.length > 6) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, numbers.length - 4)}-${numbers.slice(numbers.length - 4)}`;
  }
  if (numbers.length > 2) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  }

  return numbers;
};

export const maskPhoneInput = (value: string): string => {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  
  if (numbers.length === 0) return '';
  if (numbers.length <= 2) return `(${numbers}`;
  if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  }
  // 11 dígitos (celular moderno com 9)
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
};

/**
 * Normaliza número para envio oficial via WhatsApp / UAZAPI
 * Garante o DDI 55 em números nacionais com 10 ou 11 dígitos, preservando @lid e números internacionais.
 */
export const normalizeWhatsAppNumber = (phone?: string | null): string => {
  if (!phone) return '';
  const trimmed = phone.trim();
  if (trimmed.includes('@lid')) return trimmed;
  
  const clean = trimmed.replace(/@.*$/, '').replace(/\D/g, '');
  if (!clean) return '';
  
  // LID numérico longo (ex: 155555555555555)
  if (clean.length >= 14 && clean.startsWith('15')) {
    return `${clean}@lid`;
  }
  
  // Número brasileiro com 10 ou 11 dígitos (DDD + número, sem 55) -> adiciona 55
  if ((clean.length === 10 || clean.length === 11) && !clean.startsWith('55')) {
    return `55${clean}`;
  }
  
  return clean;
};

