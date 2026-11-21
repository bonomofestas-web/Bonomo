import type { Client, CommercialFunnel, Lead } from '../types/admin';

/**
 * Resolve de forma determinística o ID do funil principal/legado de Pós-Venda,
 * evitando que funis secundários recém-criados ou em ordem alfabética (ex: "Realizar DM")
 * herdem clientes/leads sem funnelId explícito.
 */
export function getDefaultPostSaleFunnelId(postSaleFunnels: CommercialFunnel[]): string {
  if (!postSaleFunnels || postSaleFunnels.length === 0) return 'post_sale_default';

  const primary = postSaleFunnels.find(f => f.isPrimary);
  if (primary?.id) return primary.id;

  const exactDefault = postSaleFunnels.find(f => f.id === 'post_sale_default');
  if (exactDefault?.id) return exactDefault.id;

  const nonCopy = postSaleFunnels.filter(f => !(f.name || '').toLowerCase().includes('(cópia)'));
  const pool = nonCopy.length > 0 ? nonCopy : postSaleFunnels;

  // Prioriza o funil cujo nome remete explicitamente ao Pós-Venda / Sucesso padrão (ordenado do mais antigo ao mais novo)
  const sortOldestFirst = (list: CommercialFunnel[]) =>
    [...list].sort((a, b) => {
      const ca = a.createdAt || '';
      const cb = b.createdAt || '';
      if (ca !== cb) return ca.localeCompare(cb);
      return (a.id || '').localeCompare(b.id || '');
    });

  const namedPostSale = sortOldestFirst(
    pool.filter(f => {
      const n = (f.name || '').toLowerCase();
      return n.includes('pós') || n.includes('pos ') || n.includes('sucesso') || n.includes('padrão') || n.includes('padrao');
    })
  );
  if (namedPostSale[0]?.id) return namedPostSale[0].id;

  const oldest = sortOldestFirst(pool);
  return oldest[0]?.id || 'post_sale_default';
}

/**
 * Verifica de forma estrita se um item (client ou lead) pertence ao funil alvo.
 */
export function matchesFunnelStrict(
  itemFunnelId: string | undefined,
  funnel: CommercialFunnel,
  defaultPostSaleId: string,
  allowLegacyFallback: boolean
): boolean {
  if (itemFunnelId && itemFunnelId.trim()) {
    const normalizedItem = itemFunnelId.trim().toLowerCase();
    if (itemFunnelId === funnel.id) return true;
    if (normalizedItem === (funnel.name || '').trim().toLowerCase()) return true;
    if (normalizedItem === 'post_sale_default') {
      return allowLegacyFallback && (funnel.id === 'post_sale_default' || funnel.id === defaultPostSaleId);
    }
    return false;
  }
  return allowLegacyFallback && funnel.id === defaultPostSaleId;
}

/**
 * Retorna apenas leads marcados como Pós-Venda que NÃO duplicam um registro já existente em `clients`
 * e que NÃO estejam vinculados a nenhum contrato (seja como titular, dependente ou contato da família).
 */
export function filterExtraPostSaleLeads(leads: Lead[], clients: Client[], options?: { forKanbanOnly?: boolean }): Lead[] {
  const forKanban = options?.forKanbanOnly !== false; // Padrão: true (modo Kanban)
  const existingClientIds = new Set<string>();
  const clientFamilyPhones = new Set<string>();
  const linkedContractIds = new Set<string>();

  (clients || []).forEach(c => {
    if (c.id) existingClientIds.add(c.id);
    if ((c as any).commercialLeadId) existingClientIds.add((c as any).commercialLeadId);
    if ((c as any).contractId) linkedContractIds.add((c as any).contractId);
    if ((c as any).contract_id) linkedContractIds.add((c as any).contract_id);

    if (c.payerPhone) {
      const d = c.payerPhone.replace(/\D/g, '');
      if (d.length >= 8) clientFamilyPhones.add(d.slice(-8));
    }
    // Coleta todos os telefones de familiares e contatos vinculados aos contratos
    if (Array.isArray(c.contacts)) {
      c.contacts.forEach((ct: any) => {
        if (ct?.phone) {
          const cd = ct.phone.replace(/\D/g, '');
          if (cd.length >= 8) clientFamilyPhones.add(cd.slice(-8));
        }
      });
    }
  });

  return (leads || []).filter(l => {
    // 1. Se o lead tem exatamente o mesmo ID de um client oficial (ou commercialLeadId), já é renderizado pelo card oficial
    if (existingClientIds.has(l.id)) return false;

    // 2. Se o lead possui vínculo explícito com um contrato existente
    const assocContractId = (l as any).associated_contract_id || (l as any).associatedContractId || (l as any).custom_field_values?.associatedContractId;
    if (assocContractId && (linkedContractIds.has(assocContractId) || existingClientIds.has(assocContractId))) {
      return false;
    }

    if ((l as any).isRemovedFromFunnel) return false;

    const isLeadCode = Boolean(l.code && l.code.startsWith('LEAD-'));
    const isRealClient = Boolean(
      l.isClient === true ||
      l.group === 'Pós-Venda' ||
      (l.code && l.code.startsWith('CLI-')) ||
      (Array.isArray(l.tags) && l.tags.some(t => t.toLowerCase() === 'cliente'))
    );
    if (!isRealClient || isLeadCode) return false;

    // 3. REGRA SUPREMA DO KANBAN:
    // Se o telefone deste lead (ou qualquer contato dele) já estiver vinculado como titular OU membro de família
    // de um contrato oficial já presente no Kanban, este lead NÃO deve aparecer como um card solto avulso no Kanban!
    // Ele já está representado dentro do card de contrato oficial (ex: "mãe: Carla", "debutante: Vitória", etc.).
    // (Na Caixa de Entrada e Mensagens com forKanban = false, ele continua aparecendo normalmente para atendimento).
    if (forKanban) {
      if (l.phone) {
        const lDigits = l.phone.replace(/\D/g, '').slice(-8);
        if (lDigits.length >= 8 && clientFamilyPhones.has(lDigits)) {
          return false;
        }
      }

      if (Array.isArray(l.contacts)) {
        const hasLinkedFamilyContact = l.contacts.some((ct: any) => {
          if (!ct?.phone) return false;
          const d = ct.phone.replace(/\D/g, '').slice(-8);
          return d.length >= 8 && clientFamilyPhones.has(d);
        });
        if (hasLinkedFamilyContact) return false;
      }
    }

    return true;
  });
}
