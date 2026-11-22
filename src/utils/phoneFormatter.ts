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

/**
 * Sanitiza entrada de telefone brasileiro removendo DDI 55 redundante, espaços, parênteses e caracteres extras.
 * Retorna os dígitos nacionais limpos (DDD + número, até 11 dígitos, ex: 21996803826).
 */
export const sanitizeBrazilianPhone = (value?: string | null): string => {
  if (!value) return '';
  const raw = String(value).trim();
  if (isLidIdentifier(raw)) return raw;

  let digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  // Se o número começa com +55 ou foi colado com 55 no início e tem 12 ou 13 dígitos (+55 XX 9XXXX-XXXX ou 55XXXXXXXXXXX)
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  } else if (raw.startsWith('+55') && digits.startsWith('55')) {
    digits = digits.slice(2);
  }

  // Limita ao tamanho máximo nacional de 11 dígitos (DDD + 9 dígitos)
  return digits.slice(0, 11);
};

export const formatPhone = (phone?: string | null): string => {
  if (!phone) return '';
  
  // Se for LID do WhatsApp, não exibe string crua de dispositivo na interface
  if (isLidIdentifier(phone)) return '';

  const cleanDigits = sanitizeBrazilianPhone(phone);
  if (!cleanDigits) return '';

  // 1. Celular nacional com 11 dígitos: (XX) 9XXXX-XXXX
  if (cleanDigits.length === 11) {
    const ddd = cleanDigits.slice(0, 2);
    const part1 = cleanDigits.slice(2, 7);
    const part2 = cleanDigits.slice(7);
    return `(${ddd}) ${part1}-${part2}`;
  }
  
  // 2. Fixo nacional com 10 dígitos: (XX) XXXX-XXXX
  if (cleanDigits.length === 10) {
    const ddd = cleanDigits.slice(0, 2);
    const part1 = cleanDigits.slice(2, 6);
    const part2 = cleanDigits.slice(6);
    return `(${ddd}) ${part1}-${part2}`;
  }

  // 3. Menor que 10 dígitos: formatação progressiva
  if (cleanDigits.length > 6) {
    return `(${cleanDigits.slice(0, 2)}) ${cleanDigits.slice(2, cleanDigits.length - 4)}-${cleanDigits.slice(cleanDigits.length - 4)}`;
  }
  if (cleanDigits.length > 2) {
    return `(${cleanDigits.slice(0, 2)}) ${cleanDigits.slice(2)}`;
  }

  return cleanDigits;
};

export const maskPhoneInput = (value: string): string => {
  if (!value) return '';
  const digits = sanitizeBrazilianPhone(value);
  if (!digits) return '';

  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  // 11 dígitos (celular moderno com 9)
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
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
