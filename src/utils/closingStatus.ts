/**
 * Status automático do lead dentro do Ganho, conforme o contrato avança (gravado em leads.custom_field_values.closingStatus):
 *   moveu para venda            -> Em fechamento
 *   enviado ao financeiro       -> Financeiro
 *   financeiro aprovou          -> Ganho
 */
export type ClosingStatus = 'em_fechamento' | 'financeiro' | 'ganho';

export const CLOSING_STATUS_META: Record<ClosingStatus, { label: string; color: string; bg: string }> = {
  em_fechamento: { label: 'Em fechamento', color: '#B45309', bg: 'rgba(245,158,11,0.15)' },
  financeiro: { label: 'Financeiro', color: '#0369A1', bg: 'rgba(2,132,199,0.15)' },
  ganho: { label: 'Ganho', color: '#047857', bg: 'rgba(16,185,129,0.15)' },
};

export function getClosingStatus(lead: { customFieldValues?: Record<string, any> } | null | undefined): ClosingStatus | null {
  const v = lead?.customFieldValues?.closingStatus;
  return v === 'em_fechamento' || v === 'financeiro' || v === 'ganho' ? v : null;
}
