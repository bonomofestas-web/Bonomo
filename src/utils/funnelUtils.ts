import type { CommercialFunnel } from '../types/admin';

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

