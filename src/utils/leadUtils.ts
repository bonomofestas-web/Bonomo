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

/**
 * Gera o Código Único Oficial do Cliente no formato 'CLI-XXXXXX'
 * Exemplo: CLI-8W3K9P
 */
export const generateClientCode = (): string => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomPart = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * alphabet.length);
    randomPart += alphabet[randomIndex];
  }
  return `CLI-${randomPart}`;
};

export const CRM_STAGE_LABELS: Record<string, string> = {
  new_lead: 'Novo Lead',
  contacted: 'Primeiro Contato',
  scheduled: 'Agendado',
  negotiation: 'Em Negociação',
  contract_signed: 'Contrato Fechado',
  deal_closed: 'Venda Fechada',
  lost: 'Perdido',
  onboarding: 'Onboarding',
  planning: 'Planejamento',
  production: 'Produção',
  final_adjustments: 'Ajustes Finais',
  party_completed: 'Festa Realizada',
  post_party: 'Pós-Festa',
  renewal: 'Renovação / Indicação',
  festa_realizada: 'Festa Realizada',
  archived: 'Arquivado',
};

export const getLeadStageLabel = (
  stage?: string,
  funnels?: Array<{ id: string; name?: string; stages?: Array<{ id: string; name: string }> }>,
  funnelId?: string
): string => {
  if (!stage) return '';
  if (funnels && funnelId) {
    const f = funnels.find(fun => fun.id === funnelId || fun.name === funnelId);
    const matched = f?.stages?.find(s => s.id === stage);
    if (matched?.name) return matched.name;
  }
  if (funnels) {
    for (const f of funnels) {
      const matched = f.stages?.find(s => s.id === stage);
      if (matched?.name) return matched.name;
    }
  }
  return CRM_STAGE_LABELS[stage] || stage.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};


