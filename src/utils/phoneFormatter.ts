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

  // Remove todos os caracteres não numéricos
  const numbers = phone.replace(/\D/g, '');
  
  if (!numbers) return '';

  // Se já tiver DDI do Brasil (55), remove para padronizar
  const clean = numbers.startsWith('55') && numbers.length > 11 
    ? numbers.substring(2) 
    : numbers;

  // Celular com 11 dígitos: (XX) 9XXXX-XXXX
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }
  
  // Fixo com 10 dígitos: (XX) XXXX-XXXX
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }

  // Menor que 10 dígitos: formata progressivo
  if (clean.length > 6) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, clean.length - 4)}-${clean.slice(clean.length - 4)}`;
  }
  if (clean.length > 2) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
  }

  return clean;
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

