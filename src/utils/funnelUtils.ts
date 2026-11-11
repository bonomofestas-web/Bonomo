import type { Client, CommercialFunnel, Lead } from '../types/admin';
import { isPhoneMatch } from '../services/leadService';

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
 * (seja por ID, `commercialLeadId` ou telefone coincidente quando o lead está sem funil ou no mesmo funil).
 */
export function filterExtraPostSaleLeads(leads: Lead[], clients: Client[]): Lead[] {
  const existingClientIds = new Set<string>();
  (clients || []).forEach(c => {
    existingClientIds.add(c.id);
    if (c.commercialLeadId) existingClientIds.add(c.commercialLeadId);
  });

  const getClientPhones = (c: Client): string[] => {
    const phones: string[] = [];
    if (c.payerPhone) phones.push(c.payerPhone);
    if (Array.isArray(c.contacts)) {
      c.contacts.forEach(ct => {
        if (ct?.phone) phones.push(ct.phone);
      });
    }
    return phones;
  };

  return (leads || []).filter(l => {
    if (existingClientIds.has(l.id)) return false;
    if ((l as any).isRemovedFromFunnel) return false;

    const isLeadCode = Boolean(l.code && l.code.startsWith('LEAD-'));
    const isRealClient = Boolean(
      l.isClient === true ||
      l.group === 'Pós-Venda' ||
      (l.code && l.code.startsWith('CLI-')) ||
      (Array.isArray(l.tags) && l.tags.some(t => t.toLowerCase() === 'cliente'))
    );
    if (!isRealClient || isLeadCode) return false;

    if (l.phone) {
      const normalizedLeadFunnel = (l.funnelId || '').trim();
      const duplicateByPhone = (clients || []).find(c =>
        getClientPhones(c).some(cp => isPhoneMatch(cp, l.phone))
      );
      if (duplicateByPhone) {
        const isUnlinkedOrSameFunnel =
          !normalizedLeadFunnel ||
          normalizedLeadFunnel === 'post_sale_default' ||
          normalizedLeadFunnel === duplicateByPhone.funnelId;
        if (isUnlinkedOrSameFunnel) {
          return false;
        }
      }
    }

    return true;
  });
}
