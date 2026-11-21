/** Tipos do modulo financeiro (ver docs/PLANO_FINANCEIRO.md). */

export type FinStageKey = 'aguardando_aprovacao' | 'reprovado' | 'sem_plano' | 'em_dia' | 'inadimplente' | 'renegociacao' | 'quitado' | 'cancelamento';

export const FIN_STAGE_LABEL: Record<FinStageKey, string> = {
  aguardando_aprovacao: 'Aguardando aprovação',
  reprovado: 'Reprovado',
  sem_plano: 'Sem plano de pagamento',
  em_dia: 'Em dia',
  inadimplente: 'Inadimplente',
  renegociacao: 'Renegociação',
  quitado: 'Quitado',
  cancelamento: 'Cancelamento',
};

/** Etapas manuais: o financeiro move o card para elas (as demais sao calculadas pelas parcelas). */
export type FinManualStage = 'renegociacao' | 'cancelamento';

/** Linha de v_fin_contract_summary: situacao financeira de um contrato aprovado. */
export interface FinContractSummary {
  contractId: string;
  masterId: string;
  venueId: string;
  contractCode: string;
  contractTitle: string;
  clientId?: string | null;
  contactId?: string | null;
  contractTotal: number;
  receivablesTotal: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  overdueCount: number;
  nextDueDate?: string | null;
  eventDate?: string | null;
  dueSoon: boolean;
  maxOverdueDays: number;
  partialCount: number;
  manualStage?: FinManualStage | null;
  manualNote?: string | null;
  receivablesCount: number;
  reviewStatus?: 'pendente' | 'aprovado' | 'reprovado' | null;
  stageKey: FinStageKey;
}

export type FinReviewStatus = 'pendente' | 'aprovado' | 'reprovado';

export interface FinReview {
  id: string;
  contractId: string;
  status: FinReviewStatus;
  plan: import('../utils/paymentPlan').PaymentPlan | null;
  reviewerName?: string | null;
  reason?: string | null;
  submittedAt: string;
  reviewedAt?: string | null;
}

export type FinReceivableStatus = 'pendente' | 'parcial' | 'pago' | 'cancelado' | 'renegociado' | 'estornado';

export interface FinReceivable {
  id: string;
  contractId: string;
  kind: 'sinal' | 'entrada' | 'parcela' | 'saldo' | 'cartao' | 'pos_evento';
  seq: number;
  totalSeq: number;
  dueDate?: string | null;
  dueRule?: { base: 'event_date'; offset_days: number } | null;
  amount: number;
  paidAmount: number;
  status: FinReceivableStatus;
  paymentMethod?: string | null;
  installments?: number | null;
  terminalId?: string | null;
}
