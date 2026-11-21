import type { AdminTask, Collaborator } from '../types/admin';

export type TaskSector = 'comercial' | 'pos_venda' | 'financeiro' | 'marketing';

/** Tipos de tarefa que cada setor pode escolher. Quem enxerga todos os setores vê a união. */
export const TASK_TYPES_BY_SECTOR: Record<TaskSector, string[]> = {
  comercial: ['Follow-up WhatsApp', 'Follow-up Ligação', 'Envio de Proposta', 'Reunião Comercial', 'Negociação', 'Visita', 'Degustação', 'Acompanhar', 'Geral'],
  pos_venda: ['Visita', 'Degustação', 'Visita Técnica', 'Maquiagem', 'Decoração', 'Reunião Geral', 'Ensaio', 'Alinhamento com Cerimonial', 'Ajuste de cadastro', 'Acompanhar', 'Geral'],
  financeiro: ['Análise financeira', 'Conferir comprovante', 'Dar baixa', 'Cobrança', 'Renegociação', 'Conciliação', 'Acompanhar', 'Geral'],
  marketing: ['Campanha', 'Conteúdo', 'Tráfego pago', 'Relatório de marketing', 'Acompanhar', 'Geral'],
};

const ALL: TaskSector[] = ['comercial', 'pos_venda', 'financeiro', 'marketing'];

/** Setor da tarefa: o gravado em customProperties.sector ou, nas antigas, deduzido da origem. Sem setor = visível a todos. */
export function getTaskSector(task: Pick<AdminTask, 'customProperties'> | null | undefined): TaskSector | null {
  const cp: any = task?.customProperties || {};
  if (ALL.includes(cp.sector)) return cp.sector as TaskSector;
  const origem = String(cp.origem || '');
  if (origem.startsWith('importacao')) return 'pos_venda';
  if (origem.startsWith('financeiro')) return 'financeiro';
  if (cp.source === 'finance_plan_rejection') return 'comercial';
  return null;
}

/** Setores do usuário. Gerência, master e dev enxergam todos. */
export function getUserTaskSectors(user?: Partial<Collaborator> | null): TaskSector[] {
  if (!user) return [];
  const role = String(user.role || '').toLowerCase();
  const sectors = (user.sectors || []) as string[];
  if ((user as any).isDev || ['master', 'admin', 'dev', 'gerencia'].includes(role) || sectors.includes('gerencia')) return ALL;
  const out = new Set<TaskSector>();
  for (const s of sectors) if (ALL.includes(s as TaskSector)) out.add(s as TaskSector);
  if (out.size === 0) {
    if (role === 'pos_venda') out.add('pos_venda');
    else if (role === 'financeiro') out.add('financeiro');
    else if (role === 'marketing') out.add('marketing');
    else out.add('comercial');
  }
  return Array.from(out);
}

export function canSeeTask(user: Partial<Collaborator> | null | undefined, task: Pick<AdminTask, 'customProperties'>): boolean {
  const sector = getTaskSector(task);
  if (!sector) return true;
  return getUserTaskSectors(user).includes(sector);
}

/** Tipos disponíveis na criação de tarefa para este usuário (união dos seus setores, sem repetir). */
export function taskTypesForUser(user?: Partial<Collaborator> | null): string[] {
  const set = new Set<string>();
  for (const s of getUserTaskSectors(user)) TASK_TYPES_BY_SECTOR[s].forEach(t => set.add(t));
  return Array.from(set);
}

/** Tarefa ligada a um cliente de pos-venda (ex.: ajustar contrato importado) abre direto a ficha do cliente. */
export function openClientFromTask(task: any, clients: any[]): boolean {
  const clientId = task?.clientId || task?.customProperties?.clientId;
  if (!clientId) return false;
  const client = clients.find(c => c.id === clientId);
  if (!client) return false;
  window.dispatchEvent(new CustomEvent('admin_switch_tab', { detail: { tab: 'post-sale-crm', funnelId: client.funnelId, clientId } }));
  return true;
}
