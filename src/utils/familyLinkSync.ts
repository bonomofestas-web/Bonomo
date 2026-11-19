import { contactService } from '../services/contactService';
import type { LeadContact } from '../types/admin';

/**
 * Dependente cadastrado numa ficha (comercial ou pos-venda):
 * 1) vira contato (ou reconhece o contato que ja existe, por telefone/CPF) e entra no grupo familiar do titular, nos DOIS sentidos;
 * 2) quando a ficha e do comercial, o mesmo dependente aparece nas fichas de pos-venda geradas dela, e vice-versa
 *    (a propagacao entre fichas e feita por quem chama, com as funcoes do contexto).
 */
export type FamilyLinkOutcome = 'created' | 'existing' | 'skipped';

export const isDependentRole = (role?: string): boolean => {
  const r = (role || '').toLowerCase();
  return r === 'dependent' || r === 'dependente';
};

export async function linkDependentFromFicha(params: {
  masterId?: string;
  parentContactId?: string;
  parentPhone?: string;
  member: Pick<LeadContact, 'name' | 'phone' | 'cpf' | 'email'>;
  venueId?: string;
}): Promise<FamilyLinkOutcome> {
  const { masterId, member } = params;
  if (!masterId || !member.name?.trim() || !(member.phone || '').replace(/\D/g, '')) return 'skipped';

  let parentId = params.parentContactId;
  if (!parentId && params.parentPhone) {
    const digits = params.parentPhone.replace(/\D/g, '');
    if (digits.length >= 8) {
      const found = await contactService.findByPhones(masterId, [digits]);
      parentId = (found.get(digits) || Array.from(found.values())[0])?.id;
    }
  }
  if (!parentId) return 'skipped';

  const res = await contactService.linkFamilyMember({
    masterId,
    parentContactId: parentId,
    name: member.name,
    phone: member.phone,
    cpf: member.cpf,
    email: member.email,
    kinship: 'Dependente',
    venueId: params.venueId,
  });
  if (!res) return 'skipped';
  return res.created ? 'created' : 'existing';
}
