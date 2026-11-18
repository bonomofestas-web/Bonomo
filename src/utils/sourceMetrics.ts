import type { Lead } from '../types/admin';
import type { Source } from '../types/sources';

// Metricas de uma origem a partir dos leads ja carregados (sem consulta ao banco).

/** Leads captados por uma origem: vinculo por id da origem e, no WhatsApp, por telefone/sub-origem/instancia. */
export function leadsOfSource(src: Source, leads: Lead[]): Lead[] {
  const config = (src.configuration as any) || {};
  const rawConnectedPhone = String(config.connectedPhone || src.whatsappInstanceId || '').replace(/\D/g, '');
  const cleanToken = String(src.whatsappInstanceId || config.token || config.instanceToken || '').trim();

  return (leads || []).filter(l => {
    if (l.sourceId === src.id) return true;
    if (src.type === 'whatsapp_api') {
      const sub = (l.subSource || '').replace(/\D/g, '');
      if (rawConnectedPhone && sub && sub === rawConnectedPhone) return true;
      const waSender = String((l as any).whatsappSenderPhone || '').replace(/\D/g, '');
      if (rawConnectedPhone && waSender && waSender === rawConnectedPhone) return true;
      if (cleanToken && (l.activities || []).some(a => (a as any).instanceToken === cleanToken)) return true;
    }
    return false;
  });
}

/** Total exibido na lista: o maior entre os leads encontrados e o contador de eventos da origem (mesma regra de antes). */
export const sourceLeadTotal = (src: Source, leads: Lead[]): number =>
  Math.max(leadsOfSource(src, leads).length, src.totalLeads || 0);

const pad = (n: number) => String(n).padStart(2, '0');
export const localDayKey = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Ultimos n dias (do mais antigo ao de hoje) como 'YYYY-MM-DD' no fuso local. */
export function lastNDays(n: number): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    out.push(localDayKey(d));
  }
  return out;
}

/** Conta ocorrencias por dia (datas ISO ou 'YYYY-MM-DD') nos ultimos n dias; fora da janela e ignorado. */
export function countByDay(dates: (string | undefined)[], n: number): number[] {
  const keys = lastNDays(n);
  const index = new Map(keys.map((k, i) => [k, i] as const));
  const counts = new Array(n).fill(0) as number[];
  for (const raw of dates) {
    if (!raw) continue;
    const key = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : localDayKey(new Date(raw));
    const i = index.get(key);
    if (i !== undefined) counts[i] += 1;
  }
  return counts;
}

/** 'YYYY-MM-DD' -> 'dd/mm' */
export const dayLabel = (key: string): string => `${key.slice(8, 10)}/${key.slice(5, 7)}`;


// ── Contatos x leads ─────────────────────────────────────────────────────────
// Uma mesma pessoa (contato) pode ser lead em varios funis e ainda virar cliente/contrato. A origem gera CONTATOS;
// leads, clientes e contratos sao o que acontece com eles depois. Por isso a contagem de pessoas e separada.

const phoneTail = (p?: string) => (p || '').replace(/\D/g, '').slice(-9);

/** Chave estavel da pessoa: contato cadastrado; senao os ultimos 9 digitos do telefone; senao o proprio card. */
export const personKey = (l: Pick<Lead, 'id' | 'phone'> & { contactId?: string }): string =>
  l.contactId ? `c:${l.contactId}` : (phoneTail(l.phone) ? `p:${phoneTail(l.phone)}` : `l:${l.id}`);

export interface SourceContacts {
  /** Pessoas distintas e o dia em que apareceram pela primeira vez (ISO/AAAA-MM-DD) */
  people: { key: string; firstAt?: string }[];
  commercialLeads: number;
  clients: number;
}

/** Pessoas, leads comerciais e clientes (pos-venda) captados pela origem; contatos de contratos entram como pessoas tambem. */
export function contactsOfSource(sourceLeads: Lead[], contractContactIds: (string | undefined)[] = []): SourceContacts {
  const first = new Map<string, string | undefined>();
  let commercialLeads = 0;
  let clients = 0;
  for (const l of sourceLeads) {
    if (l.isClient) clients += 1; else commercialLeads += 1;
    const key = personKey(l as any);
    const at = l.createdAt as string | undefined;
    const prev = first.get(key);
    if (!first.has(key) || (at && (!prev || at < prev))) first.set(key, at);
  }
  for (const cid of contractContactIds) {
    if (cid && !first.has(`c:${cid}`)) first.set(`c:${cid}`, undefined);
  }
  return { people: Array.from(first, ([key, firstAt]) => ({ key, firstAt })), commercialLeads, clients };
}

/** Quantos leads/clientes da origem estao em cada funil (um contato pode aparecer em varios). */
export function cardsByFunnel(sourceLeads: Lead[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const l of sourceLeads) {
    const k = l.funnelId || '__sem_funil__';
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

// ── Situacao da origem (compartilhada entre a lista e o detalhe) ─────────────

export interface LiveSourceStatus {
  status: 'connected' | 'disconnected' | 'checking';
  phone?: string;
  profileName?: string;
  avatar?: string;
}

export interface SourceConnection {
  rawPhone: string;
  avatar?: string;
  profileName?: string;
  isChecking: boolean;
  isConnected: boolean;
  isDisconnected: boolean;
  hasNeverConnected: boolean;
  /** Ativa e (se WhatsApp) conectada */
  isFullyActive: boolean;
}

export function getSourceConnection(source: Source, live?: LiveSourceStatus): SourceConnection {
  const config = (source.configuration as any) || {};
  const rawPhone = live?.phone || config.connectedPhone || source.whatsappInstanceId || '';
  const isExplicitlyDisconnected = config.isConnected === false || source.status === 'inactive' || config.connectionStatus === 'disconnected';
  const effectiveStatus = live ? live.status : (isExplicitlyDisconnected ? 'disconnected' : (config.connectedPhone ? 'connected' : 'disconnected'));
  const isConnected = effectiveStatus === 'connected' && source.status === 'active';
  const isChecking = effectiveStatus === 'checking';
  return {
    rawPhone,
    avatar: live?.avatar || config.connectedAvatar,
    profileName: live?.profileName || config.connectedProfileName,
    isChecking,
    isConnected,
    isDisconnected: effectiveStatus === 'disconnected' || !isConnected,
    hasNeverConnected: !config.connectedPhone && !source.whatsappInstanceId && !isConnected,
    isFullyActive: source.status === 'active' && (source.type !== 'whatsapp_api' || isConnected),
  };
}
