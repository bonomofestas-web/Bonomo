import React, { useMemo, useState } from 'react';
import {
  ArrowRightLeft, Briefcase, CalendarClock, Eye, KeyRound, LayoutGrid, List, Pencil, Power, Search, Send, Target, Trash2, Users,
} from 'lucide-react';
import type { Collaborator } from '../../../types/admin';
import { isManagerKind, primarySectorOf, summarizeAssetsTotal, type CollabSectorKey } from '../../../utils/collaboratorAssets';
import { DropdownMenu, Select, type DropdownMenuItem } from '../../ui';
import { SafeAvatar } from '../SafeAvatar';
import {
  AssetChips, RoleChip, SECTOR_META, SECTOR_ORDER, SectorChip, StatusChip, VenueLogos, getVenueDisplay, kindRank,
  type PresenceView, type TeamActions, type TeamDataBundle,
} from './teamShared';

interface Props {
  collaborators: Collaborator[];
  data: TeamDataBundle;
  actions: TeamActions;
  presence?: Map<string, PresenceView>;
  sendingInviteEmail: string | null;
  inviteSentEmail: string | null;
  currentUserEmail?: string;
}

const card: React.CSSProperties = { background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '16px' };
const eyebrow: React.CSSProperties = { fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--adm-text-muted)' };

export const TeamDirectory: React.FC<Props> = ({ collaborators, data, actions, presence, sendingInviteEmail, inviteSentEmail }) => {
  const [query, setQuery] = useState('');
  const [sector, setSector] = useState<'all' | 'inactive' | CollabSectorKey>('all');
  const [venueFilter, setVenueFilter] = useState('all');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');

  const { venues, assets, kindOf, permsOf, jobLabelsOf } = data;

  /* ───── Resumo do time (faixa) ───── */
  const summary = useMemo(() => {
    const perSector = new Map<CollabSectorKey, number>();
    let active = 0;
    let pending = 0;
    let inactive = 0;
    collaborators.forEach(c => {
      if (!c.active) { inactive += 1; return; }
      active += 1;
      if (permsOf(c).isPending) pending += 1;
      const s = primarySectorOf(c);
      perSector.set(s, (perSector.get(s) || 0) + 1);
    });
    const totals = summarizeAssetsTotal(collaborators.filter(c => c.active).map(c => assets.get(c.id)));
    const online = presence ? collaborators.filter(c => presence.get(c.id)?.online).length : null;
    return { active, pending, inactive, perSector, totals, online };
  }, [collaborators, assets, permsOf, presence]);

  /* ───── Filtros + agrupamento por setor ───── */
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = collaborators.filter(c => {
      if (q) {
        const hay = `${c.name} ${c.email} ${c.phone || ''} ${c.customJobTitle || ''} ${jobLabelsOf(c).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (sector === 'inactive' && c.active) return false;
      if (sector !== 'all' && sector !== 'inactive' && (!c.active || primarySectorOf(c) !== sector)) return false;
      if (venueFilter !== 'all') {
        const d = getVenueDisplay(c, venues);
        if (!d.isAll && !d.list.some(v => v.id === venueFilter)) return false;
      }
      const p = permsOf(c);
      if (status === 'active' && !(c.active && !p.isPending)) return false;
      if (status === 'inactive' && c.active) return false;
      if (status === 'pending' && !p.isPending) return false;
      return true;
    });
    const bySector = new Map<CollabSectorKey, Collaborator[]>();
    list.filter(c => c.active).forEach(c => {
      const s = primarySectorOf(c);
      bySector.set(s, [...(bySector.get(s) || []), c]);
    });
    const sectors = SECTOR_ORDER.filter(s => bySector.has(s)).map(s => ({
      sector: s,
      people: (bySector.get(s) as Collaborator[]).sort((a, b) => kindRank(kindOf(a)) - kindRank(kindOf(b)) || a.name.localeCompare(b.name, 'pt-BR')),
    }));
    // Inativos ficam numa secao propria, independente de setor e cargo
    const inactivePeople = list.filter(c => !c.active).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    return { sectors, inactivePeople };
  }, [collaborators, query, sector, venueFilter, status, venues, permsOf, kindOf, jobLabelsOf]);

  const menuItems = (c: Collaborator): DropdownMenuItem[] => {
    const p = permsOf(c);
    const isCommercial = ['sdr', 'closer', 'sdr_closer'].includes(kindOf(c));
    return [
      { id: 'view', label: 'Ver perfil', icon: <Eye size={14} />, onSelect: () => actions.onOpen(c) },
      p.isMaster && p.isSelf
        ? { id: 'master', label: 'Editar meu perfil', icon: <Pencil size={14} />, onSelect: actions.onOpenMasterProfile }
        : { id: 'edit', label: 'Editar', icon: <Pencil size={14} />, onSelect: () => actions.onEdit(c), disabled: !p.canEdit, disabledReason: 'Sem permissão para editar esta pessoa' },
      { id: 'transfer', label: 'Transferir ativos', icon: <ArrowRightLeft size={14} />, onSelect: () => actions.onTransfer(c), hidden: !p.canEdit || isManagerKind(kindOf(c)) },
      { id: 'goals', label: 'Metas', icon: <Target size={14} />, onSelect: () => actions.onGoals(c), hidden: !isCommercial },
      { id: 'link', label: 'Copiar link de entrada', icon: <KeyRound size={14} />, onSelect: () => actions.onInviteLink(c), hidden: !p.isPending, separatorBefore: true },
      { id: 'email', label: sendingInviteEmail === c.email ? 'Enviando...' : inviteSentEmail === c.email ? 'Convite enviado' : 'Enviar convite por e-mail', icon: <Send size={14} />, onSelect: () => actions.onInviteEmail(c), hidden: !p.isPending },
      { id: 'toggle', label: c.active ? 'Desativar acesso' : 'Ativar acesso', icon: <Power size={14} />, onSelect: () => actions.onToggleActive(c), hidden: !p.canToggle, separatorBefore: true },
      { id: 'delete', label: 'Remover', icon: <Trash2 size={14} />, danger: true, onSelect: () => actions.onDelete(c), disabled: !p.canDelete, disabledReason: 'Esta pessoa não pode ser removida', hidden: p.isSelf },
    ];
  };

  const renderPerson = (c: Collaborator, index: number) => {
    const p = permsOf(c);
    const kind = kindOf(c);
    const venue = getVenueDisplay(c, venues);
    const live = presence?.get(c.id);
    const roles = jobLabelsOf(c);
    const nameBlock = (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <span style={{ position: 'relative', flexShrink: 0 }}>
          <SafeAvatar src={c.avatarUrl} name={c.name} size={44} />
          {live?.online && <span title="Online agora" style={{ position: 'absolute', right: 0, bottom: 0, width: '12px', height: '12px', borderRadius: '50%', background: '#10B981', border: '2px solid var(--adm-bg-card)' }} />}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {c.name}{p.isSelf && <span style={{ marginLeft: 6, fontSize: '0.6rem', fontWeight: 800, color: 'var(--adm-accent)' }}>VOCÊ</span>}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.email}</div>
        </div>
      </div>
    );
    const chips = (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
        {roles.slice(0, 3).map(r => <RoleChip key={r} label={r} />)}
        {roles.length > 3 && <RoleChip label={`+${roles.length - 3}`} />}
        {roles.length === 0 && <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>Sem cargo definido</span>}
      </div>
    );
    const liveLine = live?.online ? (
      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#10B981', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        Online{live.activity ? ` · ${live.activity}` : ''}
      </div>
    ) : null;

    if (viewMode === 'card') {
      return (
        <div key={c.id} onClick={() => actions.onOpen(c)} style={{ ...card, padding: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', opacity: c.active ? 1 : 0.7 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
            {nameBlock}
            <span onClick={e => e.stopPropagation()}><DropdownMenu items={menuItems(c)} aria-label={`Ações de ${c.name}`} /></span>
          </div>
          {liveLine}
          {chips}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <AssetChips kind={kind} summary={assets.get(c.id)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', borderTop: '1px solid var(--adm-border)', paddingTop: '10px' }}>
            <VenueLogos venues={venue.list} />
            <StatusChip active={c.active} pending={p.isPending} />
          </div>
        </div>
      );
    }

    return (
      <div
        key={c.id}
        onClick={() => actions.onOpen(c)}
        style={{
          display: 'grid', gridTemplateColumns: 'minmax(250px, 2.2fr) minmax(170px, 1.4fr) minmax(120px, 0.9fr) minmax(190px, 1.4fr) 150px 40px', gap: '16px', alignItems: 'center',
          padding: '12px 18px', cursor: 'pointer', borderTop: index === 0 ? 'none' : '1px solid var(--adm-border)', opacity: c.active ? 1 : 0.7, transition: 'background 0.12s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--adm-bg-input)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        <div style={{ minWidth: 0 }}>{nameBlock}{liveLine && <div style={{ marginLeft: '56px', marginTop: '2px' }}>{liveLine}</div>}</div>
        {chips}
        <div title={venue.label} style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
          <VenueLogos venues={venue.list} />
          <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{venue.label}</span>
        </div>
        <AssetChips kind={kind} summary={assets.get(c.id)} />
        <StatusChip active={c.active} pending={p.isPending} />
        <span onClick={e => e.stopPropagation()} style={{ justifySelf: 'end' }}><DropdownMenu items={menuItems(c)} aria-label={`Ações de ${c.name}`} /></span>
      </div>
    );
  };

  const tile = (label: string, value: React.ReactNode, hint?: string, accent?: string) => (
    <div style={{ ...card, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
      <span style={eyebrow}>{label}</span>
      <span style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.1, color: accent || 'var(--adm-text-title)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      {hint && <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>{hint}</span>}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Faixa de resumo do time */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
        {tile('Pessoas ativas', <>{summary.active}<span style={{ fontSize: '0.9rem', color: 'var(--adm-text-muted)', fontWeight: 700 }}> / {collaborators.length}</span></>)}
        {tile('Convites pendentes', summary.pending, summary.pending > 0 ? 'Ainda não fizeram o 1º acesso' : 'Todos já acessaram', summary.pending > 0 ? '#F59E0B' : undefined)}
        {tile('Leads em aberto', summary.totals.leads, 'Comercial, no time todo')}
        {tile('Contratos administrados', summary.totals.contracts, 'Pós-venda, em andamento')}
        {summary.online !== null && tile('Online agora', summary.online, 'Atualiza a cada ~30 s', summary.online > 0 ? '#10B981' : undefined)}
      </div>

      {/* Setores (filtro rapido) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <button type="button" onClick={() => setSector('all')} aria-pressed={sector === 'all'} style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '999px', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer',
          border: `1px solid ${sector === 'all' ? 'var(--adm-accent)' : 'var(--adm-border)'}`, background: sector === 'all' ? 'var(--adm-accent)' : 'var(--adm-bg-card)', color: sector === 'all' ? '#0B111A' : 'var(--adm-text-title)',
        }}><Users size={13} /> Todos ({collaborators.length})</button>
        {SECTOR_ORDER.filter(s => summary.perSector.has(s)).map(s => {
          const m = SECTOR_META[s];
          const active = sector === s;
          return (
            <button key={s} type="button" onClick={() => setSector(active ? 'all' : s)} aria-pressed={active} style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '999px', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer',
              border: `1px solid ${active ? m.color : 'var(--adm-border)'}`, background: active ? `${m.color}26` : 'var(--adm-bg-card)', color: active ? m.color : 'var(--adm-text-title)',
            }}><Briefcase size={13} /> {m.label} ({summary.perSector.get(s)})</button>
          );
        })}
        {summary.inactive > 0 && (
          <button type="button" onClick={() => setSector(sector === 'inactive' ? 'all' : 'inactive')} aria-pressed={sector === 'inactive'} style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '999px', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer',
            border: `1px solid ${sector === 'inactive' ? '#94A3B8' : 'var(--adm-border)'}`, background: sector === 'inactive' ? 'rgba(148,163,184,0.2)' : 'var(--adm-bg-card)', color: sector === 'inactive' ? '#94A3B8' : 'var(--adm-text-muted)',
          }}><Power size={13} /> Inativos ({summary.inactive})</button>
        )}
      </div>

      {/* Busca, filtros e modo de exibicao */}
      <div style={{ ...card, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--adm-text-muted)' }} />
          <input className="adm-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por nome, e-mail, cargo ou telefone"
            style={{ width: '100%', height: '38px', borderRadius: '10px', paddingLeft: '34px', fontSize: '0.8rem' }} />
        </div>
        <Select className="adm-input" value={venueFilter} onChange={e => setVenueFilter(e.target.value)} aria-label="Filtrar por unidade" style={{ height: '38px', borderRadius: '10px', minWidth: '190px' }}>
          <option value="all">Todas as unidades</option>
          {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </Select>
        <Select className="adm-input" value={status} onChange={e => setStatus(e.target.value as typeof status)} aria-label="Filtrar por status" style={{ height: '38px', borderRadius: '10px', minWidth: '170px' }}>
          <option value="all">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="pending">Convite pendente</option>
          <option value="inactive">Inativos</option>
        </Select>
        <div style={{ display: 'inline-flex', padding: '3px', borderRadius: '10px', background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)' }}>
          {([['list', 'Lista', List], ['card', 'Cards', LayoutGrid]] as const).map(([id, label, Icon]) => (
            <button key={id} type="button" onClick={() => setViewMode(id)} aria-pressed={viewMode === id} style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.74rem', fontWeight: 800,
              background: viewMode === id ? 'var(--adm-bg-card)' : 'transparent', color: viewMode === id ? 'var(--adm-text-title)' : 'var(--adm-text-muted)',
            }}><Icon size={13} /> {label}</button>
          ))}
        </div>
      </div>

      {/* Secoes por setor */}
      {groups.sectors.length === 0 && groups.inactivePeople.length === 0 ? (
        <div style={{ ...card, padding: '40px 20px', textAlign: 'center', color: 'var(--adm-text-muted)', fontSize: '0.85rem' }}>
          <CalendarClock size={26} style={{ marginBottom: 8 }} />
          <div style={{ fontWeight: 800, color: 'var(--adm-text-title)' }}>Nenhuma pessoa encontrada</div>
          <div>Ajuste a busca ou os filtros.</div>
        </div>
      ) : groups.sectors.map(g => (
        <section key={g.sector} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: '4px', height: '18px', borderRadius: '2px', background: SECTOR_META[g.sector].color }} />
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>{SECTOR_META[g.sector].plural}</h3>
            <SectorChip sector={g.sector} small />
            <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>{g.people.length} {g.people.length === 1 ? 'pessoa' : 'pessoas'}</span>
          </div>
          {viewMode === 'list' ? (
            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 2.2fr) minmax(170px, 1.4fr) minmax(120px, 0.9fr) minmax(190px, 1.4fr) 150px 40px', gap: '16px', padding: '10px 18px', background: 'var(--adm-bg-input)', borderBottom: '1px solid var(--adm-border)' }}>
                {['Pessoa', 'Cargo', 'Unidades', 'Em aberto', 'Status', ''].map(h => <span key={h} style={eyebrow}>{h}</span>)}
              </div>
              {g.people.map((c, i) => renderPerson(c, i))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '14px' }}>
              {g.people.map((c, i) => renderPerson(c, i))}
            </div>
          )}
        </section>
      ))}

      {/* Inativos: secao propria, fora do quadro de colaboradores */}
      {groups.inactivePeople.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: '4px', height: '18px', borderRadius: '2px', background: '#94A3B8' }} />
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--adm-text-muted)' }}>Inativos</h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>{groups.inactivePeople.length} {groups.inactivePeople.length === 1 ? 'pessoa' : 'pessoas'}</span>
          </div>
          {viewMode === 'list' ? (
            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 2.2fr) minmax(170px, 1.4fr) minmax(120px, 0.9fr) minmax(190px, 1.4fr) 150px 40px', gap: '16px', padding: '10px 18px', background: 'var(--adm-bg-input)', borderBottom: '1px solid var(--adm-border)' }}>
                {['Pessoa', 'Cargo', 'Unidades', 'Em aberto', 'Status', ''].map(h => <span key={h} style={eyebrow}>{h}</span>)}
              </div>
              {groups.inactivePeople.map((c, i) => renderPerson(c, i))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '14px' }}>
              {groups.inactivePeople.map((c, i) => renderPerson(c, i))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
