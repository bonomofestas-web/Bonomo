import React from 'react';
import { Building2 } from 'lucide-react';
import type { Collaborator, Venue } from '../../../types/admin';
import type { AssetSummary, CollabSectorKey, ProfileKind } from '../../../utils/collaboratorAssets';
import { isManagerKind } from '../../../utils/collaboratorAssets';

/** Identidade visual e tipos compartilhados do Time (lista, perfil, edicao). */

export const SECTOR_ORDER: CollabSectorKey[] = ['gerencia', 'comercial', 'pos_venda', 'marketing', 'financeiro'];

export const SECTOR_META: Record<CollabSectorKey, { label: string; plural: string; color: string }> = {
  gerencia: { label: 'Gerência', plural: 'Gerência', color: '#D4AF37' },
  comercial: { label: 'Comercial', plural: 'Comercial', color: '#14A9D7' },
  pos_venda: { label: 'Pós-Venda', plural: 'Pós-Venda', color: '#06B6D4' },
  marketing: { label: 'Marketing', plural: 'Marketing', color: '#EC4899' },
  financeiro: { label: 'Financeiro', plural: 'Financeiro', color: '#10B981' },
};

/** O que o usuario logado pode fazer com cada pessoa (regras de protecao do sistema). */
export interface CollabPerms {
  isSelf: boolean;
  isMaster: boolean;
  isPending: boolean;
  canToggle: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface TeamActions {
  onOpen: (c: Collaborator) => void;
  onEdit: (c: Collaborator) => void;
  onToggleActive: (c: Collaborator) => void;
  onDelete: (c: Collaborator) => void;
  onGoals: (c: Collaborator) => void;
  onTransfer: (c: Collaborator) => void;
  onInviteLink: (c: Collaborator) => void;
  onInviteEmail: (c: Collaborator) => void;
  onOpenMasterProfile: () => void;
}

export interface TeamDataBundle {
  venues: Venue[];
  assets: Map<string, AssetSummary>;
  kindOf: (c: Collaborator) => ProfileKind;
  permsOf: (c: Collaborator) => CollabPerms;
  jobLabelsOf: (c: Collaborator) => string[];
  /** Titulo mostrado (primeiro cargo com o nome de exibicao do Master). */
  titleOf: (c: Collaborator) => string;
}

export const kindRank = (k: ProfileKind): number => (k === 'gerente_geral' ? 0 : isManagerKind(k) ? 1 : 2);

/** Unidades da pessoa para exibicao (Master e quem cobre todas aparecem como "Rede"). */
export const getVenueDisplay = (collab: Collaborator, venues: Venue[]): { label: string; isAll: boolean; list: Venue[] } => {
  if (collab.role === 'master') return { label: 'Todas as unidades', isAll: true, list: venues };
  const ids = Array.isArray(collab.venueIds) && collab.venueIds.length > 0 ? collab.venueIds : (collab.venueId && collab.venueId !== 'all' ? [collab.venueId] : []);
  const matched = ids.map(id => venues.find(v => v.id === id)).filter((v): v is Venue => Boolean(v));
  const coversAll = (venues.length > 0 && matched.length >= venues.length) || (collab.venueId === 'all' && ids.length === 0);
  if (coversAll) return { label: 'Todas as unidades', isAll: true, list: venues };
  return { label: matched.map(v => v.name).join(', ') || 'Sem unidade', isAll: false, list: matched };
};

/** Link wa.me a partir do telefone cadastrado (assume Brasil quando vier sem DDI). */
export const whatsappLink = (phone?: string | null): string | null => {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  return `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}`;
};

/* ───────── Pecas visuais ───────── */

export const SectorChip: React.FC<{ sector: CollabSectorKey; small?: boolean }> = ({ sector, small }) => {
  const m = SECTOR_META[sector];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: small ? '1px 7px' : '3px 9px', borderRadius: '999px', whiteSpace: 'nowrap',
      fontSize: small ? '0.62rem' : '0.68rem', fontWeight: 800, color: m.color, background: `${m.color}1F`, border: `1px solid ${m.color}55`,
    }}>{m.label}</span>
  );
};

export const RoleChip: React.FC<{ label: string }> = ({ label }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: '6px', fontSize: '0.64rem', fontWeight: 800, whiteSpace: 'nowrap',
    color: 'var(--adm-text-title)', background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)',
  }}>{label}</span>
);

export const StatusChip: React.FC<{ active: boolean; pending: boolean }> = ({ active, pending }) => {
  const cfg = pending ? { label: 'Convite pendente', color: '#F59E0B' } : active ? { label: 'Ativo', color: '#10B981' } : { label: 'Inativo', color: '#94A3B8' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 800, whiteSpace: 'nowrap',
      color: cfg.color, background: `${cfg.color}1A`, border: `1px solid ${cfg.color}55`,
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.color }} />{cfg.label}
    </span>
  );
};

export const VenueLogos: React.FC<{ venues: Venue[]; max?: number; size?: number }> = ({ venues, max = 3, size = 22 }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
    {venues.slice(0, max).map((v, i) => (
      <span key={v.id} title={v.name} style={{
        width: size, height: size, borderRadius: '50%', overflow: 'hidden', marginLeft: i === 0 ? 0 : -6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: '#0B0B10', border: '1.5px solid var(--adm-bg-card)', color: '#D4AF37',
      }}>
        {v.logoUrl ? <img src={v.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Building2 size={size * 0.55} />}
      </span>
    ))}
    {venues.length > max && <span style={{ marginLeft: 6, fontSize: '0.66rem', fontWeight: 800, color: 'var(--adm-text-muted)' }}>+{venues.length - max}</span>}
  </span>
);

/** Ativos em aberto de forma compacta, conforme o perfil (gerentes nao tem ativos). */
export const AssetChips: React.FC<{ kind: ProfileKind; summary?: AssetSummary }> = ({ kind, summary }) => {
  const s = summary || { leads: 0, contracts: 0, tasks: 0, overdueTasks: 0, appointments: 0 };
  const items: { label: string; value: number; warn?: boolean }[] = [];
  if (isManagerKind(kind)) return <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>Gestão: ver resultado no perfil</span>;
  if (kind === 'pos_venda') items.push({ label: s.contracts === 1 ? 'contrato' : 'contratos', value: s.contracts });
  else if (kind === 'marketing') return <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>Campanhas: em breve{s.tasks > 0 ? ` · ${s.tasks} ${s.tasks === 1 ? 'tarefa' : 'tarefas'}` : ''}</span>;
  else if (kind !== 'financeiro' && kind !== 'outro') items.push({ label: s.leads === 1 ? 'lead' : 'leads', value: s.leads });
  items.push({ label: s.tasks === 1 ? 'tarefa' : 'tarefas', value: s.tasks, warn: s.overdueTasks > 0 });
  items.push({ label: s.appointments === 1 ? 'compromisso' : 'compromissos', value: s.appointments });
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '4px 12px', fontSize: '0.74rem', fontVariantNumeric: 'tabular-nums' }}>
      {items.map(i => (
        <span key={i.label} style={{ color: i.warn ? '#EF4444' : 'var(--adm-text-muted)' }}>
          <strong style={{ color: i.warn ? '#EF4444' : 'var(--adm-text-title)' }}>{i.value}</strong> {i.label}
        </span>
      ))}
    </span>
  );
};

/** Presenca ao vivo (quase tempo real) de uma pessoa, quando permitido e disponivel. */
export interface PresenceView {
  online: boolean;
  /** Frase pronta: "atendendo o lead Mary" / "no contrato X" / "na tela Funil Comercial". */
  activity?: string;
  entityType?: 'lead' | 'client' | 'task' | 'appointment' | 'none';
  entityId?: string;
}
