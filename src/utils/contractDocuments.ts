import type { Contract } from '../types/admin';

export interface ContractDocument {
  name: string;
  url: string;
  /** contrato | comprovante | aditivo | outro (vem do tipo gravado no anexo) */
  kind: string;
}

/**
 * Lista UNICA de documentos de um contrato (contrato, comprovante de sinal e anexos como aditivos).
 * Contratos e Pos-venda usam esta mesma funcao para mostrarem exatamente os mesmos documentos.
 */
export function getContractDocuments(contract?: Pick<Contract, 'contractFileUrl' | 'paymentFileUrl' | 'attachments'> | null): ContractDocument[] {
  if (!contract) return [];
  const docs: ContractDocument[] = [];
  if (contract.contractFileUrl) docs.push({ name: 'Contrato assinado', url: contract.contractFileUrl, kind: 'contrato' });
  if (contract.paymentFileUrl) docs.push({ name: 'Comprovante de sinal', url: contract.paymentFileUrl, kind: 'comprovante' });
  for (const a of contract.attachments || []) {
    if (!a?.url || docs.some(d => d.url === a.url)) continue;
    docs.push({ name: a.name || 'Documento', url: a.url, kind: (a as { type?: string }).type || 'outro' });
  }
  return docs;
}

/** Documentos alem do contrato e do comprovante principais (aditivos e extras). */
export const getExtraContractDocuments = (contract?: Pick<Contract, 'contractFileUrl' | 'paymentFileUrl' | 'attachments'> | null): ContractDocument[] =>
  getContractDocuments(contract).filter(d => d.url !== contract?.contractFileUrl && d.url !== contract?.paymentFileUrl);
