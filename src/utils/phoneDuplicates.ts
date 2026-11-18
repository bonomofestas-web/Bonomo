import { relationshipLabel } from './roleLabels';

// Telefone repetido DENTRO do mesmo lead / contrato / cliente / contato.
// Regra: cada pessoa vinculada precisa de um numero proprio. Dois cadastros com o mesmo numero (ex.: decisor e debutante)
// confundem para quem a conversa vai e de quem a mensagem chega. O cadastro e bloqueado, sem opcao de salvar.

export const phoneDigits = (p?: string | null): string => String(p || '').replace(/\D/g, '');

/** Mesmo numero? Compara os ultimos 8 digitos (ignora DDI, DDD e o 9 extra), exigindo ao menos 8 digitos nos dois. */
export const samePhone = (a?: string | null, b?: string | null): boolean => {
  const x = phoneDigits(a);
  const y = phoneDigits(b);
  return x.length >= 8 && y.length >= 8 && x.slice(-8) === y.slice(-8);
};

export interface PhoneHolder {
  /** Quem ja usa o numero, para a mensagem ao usuario (ex.: "Maria (Mãe)") */
  label: string;
  phone?: string | null;
  /** id do contato, para ignorar a propria pessoa ao editar */
  id?: string;
}

const named = (name: string | undefined, role: string) => (name && name.trim() ? `${name.trim()} (${role})` : role);

/**
 * Todos os numeros ja cadastrados em um registro: lead, cliente ou contrato (campos do contratante, homenageada, mae, pai)
 * e a lista de contatos vinculados.
 */
export function collectPhoneHolders(rec: any): PhoneHolder[] {
  if (!rec) return [];
  const holders: PhoneHolder[] = [
    { label: named(rec.payerName || rec.name, 'Contratante'), phone: rec.phone || rec.payerPhone },
    { label: named(rec.payerName, 'Contratante'), phone: rec.payerPhone },
    { label: named(rec.birthdayPersonName || rec.debutanteName, 'Homenageada'), phone: rec.birthdayPersonPhone || rec.debutantePhone },
    { label: named(rec.motherName, 'Mãe'), phone: rec.motherPhone },
    { label: named(rec.fatherName, 'Pai'), phone: rec.fatherPhone },
  ];
  for (const c of (rec.contacts || []) as any[]) {
    holders.push({ id: c.id, label: named(c.name, relationshipLabel(c.role, 'Contato')), phone: c.phone });
  }
  return holders;
}

/** Quem ja usa este numero? (ignora o proprio contato em edicao pelo id) */
export function findPhoneConflict(phone: string | undefined | null, holders: PhoneHolder[], excludeId?: string): PhoneHolder | undefined {
  if (phoneDigits(phone).length < 8) return undefined;
  return holders.find(h => (!excludeId || h.id !== excludeId) && samePhone(h.phone, phone));
}

export const duplicatePhoneMessage = (h: PhoneHolder, scope: 'lead' | 'contrato' | 'cliente' | 'contato' = 'lead') =>
  `Este número já está cadastrado em ${h.label} neste ${scope}. Cada pessoa precisa de um número próprio, então não é possível salvar.`;
