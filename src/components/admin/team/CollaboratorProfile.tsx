import React, { useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRightLeft, Building2, CalendarClock, Copy, Mail, MessageCircle, Pencil, Phone, Power, Send, Target, Trash2, TrendingUp, Users,
} from 'lucide-react';
import type { Appointment } from '../../../types';
import type { AdminTask, Client, Collaborator, CommercialFunnel, Lead, Venue } from '../../../types/admin';
import {
  PROFILE_KIND_LABEL, appointmentsOf, buildLeadClassifier, collaboratorSectors, contractValue, contractsOf, isManagerKind,
  isOverdueTask, leadsOf, primarySectorOf, tasksOf, upsellSalesOf, type AssetSummary, type ProfileKind,
} from '../../../utils/collaboratorAssets';
import { computeManagerResults, managerRange, type ManagerPeriod } from '../../../utils/managerResults';
import { formatPhone } from '../../../utils/phoneFormatter';
import { Select } from '../../ui';
import { SafeAvatar } from '../SafeAvatar';
import {
  RoleChip, SECTOR_META, SectorChip, StatusChip, VenueLogos, getVenueDisplay, whatsappLink,
  type CollabPerms, type PresenceView, type TeamActions,
} from './teamShared';

interface Props {
  collaborator: Collaborator;
  collaborators: Collaborator[];
  kind: ProfileKind;
  perms: CollabPerms;
  jobLabels: string[];
  title: string;
  venues: Venue[];
  leads: Lead[];
  clients: Client[];
  tasks: AdminTask[];
  appointments: Appointment[];
  funnels: CommercialFunnel[];
  assets: Map<string, AssetSummary>;
  kindOf: (c: Collaborator) => ProfileKind;
  actions: TeamActions;
  presence?: PresenceView;
  sendingInviteEmail: boolean;
  onBack: () => void;
}

type Tab = 'overview' | 'assets' | 'performance' | 'access';

const card: React.CSSProperties = { background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '16px', padding: '18px' };
const eyebrow: React.CSSProperties = { fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--adm-text-muted)' };
const money = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const pct = (v: number | null) => (v === null || Number.isNaN(v) ? 'Indefinido' : `${Math.round(v * 100)}%`);
const dateBR = (iso?: string) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '-');
const todayISO = () => new Date().toISOString().slice(0, 10);

const Stat: React.FC<{ label: string; value: React.ReactNode; warn?: boolean }> = ({ label, value, warn }) => (
  <div style={{ ...card, padding: '14px 16px' }}>
    <div style={eyebrow}>{label}</div>
    <div style={{ fontSize: '1.5rem', fontWeight: 900, marginTop: 4, color: warn ? '#EF4444' : 'var(--adm-text-title)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
  </div>
);

const Empty: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ padding: '20px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--adm-text-muted)' }}>{text}</div>
);

const Row: React.FC<{ title: string; meta?: string; right?: string; warn?: boolean }> = ({ title, meta, right, warn }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderTop: '1px solid var(--adm-border)' }}>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--adm-text-title)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
      {meta && <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>{meta}</div>}
    </div>
    {right && <div style={{ fontSize: '0.76rem', fontWeight: 800, color: warn ? '#EF4444' : 'var(--adm-text-muted)', whiteSpace: 'nowrap' }}>{right}</div>}
  </div>
);

const Section: React.FC<{ title: string; count?: number; children: React.ReactNode }> = ({ title, count, children }) => (
  <div style={card}>
    <div style={{ ...eyebrow, marginBottom: 6 }}>{title}{count !== undefined ? ` · ${count}` : ''}</div>
    {children}
  </div>
);

export const CollaboratorProfile: React.FC<Props> = ({
  collaborator: c, collaborators, kind, perms, jobLabels, title, venues, leads, clients, tasks, appointments, funnels, assets, kindOf, actions,
  presence, sendingInviteEmail, onBack,
}) => {
  const manager = isManagerKind(kind);
  const [tab, setTab] = useState<Tab>('overview');
  const [period, setPeriod] = useState<ManagerPeriod>('this_month');
  const [venueFilter, setVenueFilter] = useState('all');
  const today = todayISO();

  const venueInfo = getVenueDisplay(c, venues);
  const wa = whatsappLink(c.phone);
  const sector = primarySectorOf(c);
  const sectorList = collaboratorSectors(c);
  const cls = useMemo(() => buildLeadClassifier(funnels), [funnels]);

  const myLeads = useMemo(() => (manager || kind === 'pos_venda' ? [] : leadsOf(c.id, leads, cls)), [manager, kind, c.id, leads, cls]);
  const myContracts = useMemo(() => contractsOf(c.id, clients), [c.id, clients]);
  const myTasks = useMemo(() => tasksOf(c.id, tasks), [c.id, tasks]);
  const myAppts = useMemo(() => appointmentsOf(c.id, appointments, today), [c.id, appointments, today]);
  const myUpsells = useMemo(() => upsellSalesOf(c.id, clients, managerRange(period).startsOn, managerRange(period).endsOn), [c.id, clients, period]);
  const venueName = (id?: string) => venues.find(v => v.id === id)?.name || '';

  const mgmt = useMemo(() => {
    if (!manager) return null;
    const scoped = venueFilter === 'all' ? venueInfo.list : venueInfo.list.filter(v => v.id === venueFilter);
    const ids = new Set(scoped.map(v => v.id));
    const comm = new Set<string>();
    const post = new Set<string>();
    collaborators.forEach(p => {
      const pids = getVenueDisplay(p, venues).list;
      if (!pids.some(v => ids.has(v.id))) return;
      const k = kindOf(p);
      if (k === 'sdr' || k === 'closer' || k === 'sdr_closer') comm.add(p.id);
      if (k === 'pos_venda') post.add(p.id);
    });
    return computeManagerResults({
      kind, venues: scoped.map(v => ({ id: v.id, name: v.name })), period, leads, clients, funnels, collaborators, assets,
      commercialTeamIds: comm, postSaleTeamIds: post,
    });
  }, [manager, kind, venueInfo.list, venueFilter, period, leads, clients, funnels, collaborators, assets, kindOf, venues]);

  const mine = assets.get(c.id) || { leads: 0, contracts: 0, tasks: 0, overdueTasks: 0, appointments: 0 };
  const showLeads = !manager && kind !== 'pos_venda' && kind !== 'marketing' && kind !== 'financeiro' && kind !== 'outro';
  const showContracts = kind === 'pos_venda';

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Visão geral' },
    { id: 'assets', label: manager ? 'Visão de gestão' : 'Ativos' },
    { id: 'performance', label: 'Desempenho e metas' },
    { id: 'access', label: 'Acesso e cargo' },
  ];

  const stageLabel = (stage: string) => funnels.flatMap(f => f.stages || []).find(s => s.id === stage)?.name || stage;

  const tasksList = (
    <Section title="Tarefas em aberto" count={myTasks.length}>
      {myTasks.length === 0 ? <Empty text="Nenhuma tarefa em aberto." /> : myTasks.slice(0, 12).map(t => (
        <Row key={t.id} title={t.title} meta={t.dueDate ? `Prazo ${dateBR(t.dueDate)}` : 'Sem prazo'} right={isOverdueTask(t, today) ? 'Atrasada' : undefined} warn />
      ))}
    </Section>
  );
  const apptList = (
    <Section title="Próximos compromissos" count={myAppts.length}>
      {myAppts.length === 0 ? <Empty text="Nenhum compromisso agendado." /> : [...myAppts].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).slice(0, 12).map(a => (
        <Row key={a.id} title={a.title} meta={a.leadName || a.location} right={`${dateBR(a.date)} ${a.time || ''}`.trim()} />
      ))}
    </Section>
  );
  const leadsList = (
    <Section title="Leads em aberto" count={myLeads.length}>
      {myLeads.length === 0 ? <Empty text="Nenhum lead em aberto." /> : myLeads.slice(0, 40).map(l => (
        <Row key={l.id} title={l.debutanteName || 'Lead'} meta={`${venueName(l.venueId)} · ${stageLabel(String(l.stage))}`} />
      ))}
    </Section>
  );
  const contractsList = (
    <Section title="Contratos administrados" count={myContracts.length}>
      {myContracts.length === 0 ? <Empty text="Nenhum contrato administrado no momento." /> : myContracts.slice(0, 40).map(k => (
        <Row key={k.id} title={k.name} meta={`${venueName(k.venueId)} · Festa em ${dateBR(k.eventDate)}`} right={money(contractValue(k))} />
      ))}
    </Section>
  );

  const renderManagement = () => {
    if (!mgmt) return null;
    return (
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Select className="adm-input" value={period} onChange={e => setPeriod(e.target.value as ManagerPeriod)} style={{ width: 180 }}>
            <option value="this_month">Este mês</option>
            <option value="last_month">Mês anterior</option>
          </Select>
          {venueInfo.list.length > 1 && (
            <Select className="adm-input" value={venueFilter} onChange={e => setVenueFilter(e.target.value)} style={{ width: 220 }}>
              <option value="all">Todas as unidades</option>
              {venueInfo.list.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
          )}
          <span style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>{mgmt.period.label}</span>
        </div>
        {mgmt.showCommercial && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
              <Stat label="Faturamento" value={money(mgmt.totals.revenue)} />
              <Stat label="Contratos fechados" value={mgmt.totals.closings} />
              <Stat label="Agendamentos" value={mgmt.totals.appointments} />
              <Stat label="Taxa de fechamento" value={pct(mgmt.totals.closingRate)} />
            </div>
            {mgmt.venues.length > 1 && (
              <Section title="Resultado por casa">
                {mgmt.venues.map(v => <Row key={v.venueId} title={v.name} meta={`${v.closings} contratos · ${v.appointments} agendamentos`} right={money(v.revenue)} />)}
              </Section>
            )}
            <Section title="Entrega da equipe comercial" count={mgmt.team.length}>
              {mgmt.team.length === 0 ? <Empty text="Sem entregas no período." /> : mgmt.team.map(t => (
                <Row key={t.id} title={t.name} meta={`${t.closings} contratos · ${t.appointments} agendamentos`} right={money(t.revenue)} />
              ))}
            </Section>
          </>
        )}
        {mgmt.showPostSale && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
              <Stat label="Contratos ativos" value={mgmt.postSale.activeContracts} />
              <Stat label="Valor em carteira" value={money(mgmt.postSale.contractsValue)} />
              <Stat label="Vendas adicionais" value={`${mgmt.postSale.upsellCount} · ${money(mgmt.postSale.upsellRevenue)}`} />
              <Stat label="Tarefas do pós-venda" value={mgmt.postSale.openTasks} />
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>Visão do pós-venda em evolução: mais indicadores serão adicionados.</div>
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <button type="button" onClick={onBack} className="adm-btn adm-btn-secondary" style={{ justifySelf: 'start', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <ArrowLeft size={14} /> Time
      </button>

      {/* Cabeçalho */}
      <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10, padding: '26px 18px' }}>
        <div style={{ position: 'relative' }}>
          <SafeAvatar src={c.avatarUrl} name={c.name} size={96} />
          {presence?.online && <span title="Online agora" style={{ position: 'absolute', right: 4, bottom: 4, width: 16, height: 16, borderRadius: '50%', background: '#10B981', border: '3px solid var(--adm-bg-card)' }} />}
        </div>
        <div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>{c.name}</div>
          <div style={{ fontSize: '0.84rem', color: 'var(--adm-text-muted)' }}>{title || PROFILE_KIND_LABEL[kind]}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          <SectorChip sector={sector} />
          {jobLabels.map(l => <RoleChip key={l} label={l} />)}
          <StatusChip active={c.active} pending={perms.isPending} />
        </div>
        {presence?.online && presence.activity && <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10B981' }}>Online agora · {presence.activity}</div>}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', fontSize: '0.82rem', color: 'var(--adm-text-muted)' }}>
          {wa ? (
            <a href={wa} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#10B981', fontWeight: 800, textDecoration: 'none' }}>
              <MessageCircle size={14} /> {formatPhone(c.phone || '')}
            </a>
          ) : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Phone size={14} /> Sem WhatsApp</span>}
          <a href={`mailto:${c.email}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'inherit', textDecoration: 'none' }}><Mail size={14} /> {c.email}</a>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {venueInfo.list.length > 0 ? <VenueLogos venues={venueInfo.list} /> : <Building2 size={14} />} {venueInfo.label}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
          {perms.isSelf
            ? <button type="button" className="adm-btn adm-btn-secondary" onClick={() => (perms.isMaster ? actions.onOpenMasterProfile() : actions.onEdit(c))}><Pencil size={14} /> Editar meu perfil</button>
            : <button type="button" className="adm-btn adm-btn-secondary" disabled={!perms.canEdit} onClick={() => actions.onEdit(c)}><Pencil size={14} /> Editar</button>}
          {(kind === 'sdr' || kind === 'closer' || kind === 'sdr_closer') && <button type="button" className="adm-btn adm-btn-secondary" onClick={() => actions.onGoals(c)}><Target size={14} /> Metas</button>}
          {perms.isPending && !perms.isSelf && (
            <>
              <button type="button" className="adm-btn adm-btn-secondary" onClick={() => actions.onInviteLink(c)}><Copy size={14} /> Link de convite</button>
              <button type="button" className="adm-btn adm-btn-secondary" disabled={sendingInviteEmail} onClick={() => actions.onInviteEmail(c)}><Send size={14} /> {sendingInviteEmail ? 'Enviando...' : 'Enviar por e-mail'}</button>
            </>
          )}
          {!manager && kind !== 'marketing' && perms.canEdit && <button type="button" className="adm-btn adm-btn-secondary" onClick={() => actions.onTransfer(c)}><ArrowRightLeft size={14} /> Transferir ativos</button>}
          {perms.canToggle && <button type="button" className="adm-btn adm-btn-secondary" onClick={() => actions.onToggleActive(c)}><Power size={14} /> {c.active ? 'Desativar' : 'Ativar'}</button>}
          {perms.canDelete && <button type="button" className="adm-btn adm-btn-secondary" style={{ color: '#EF4444' }} onClick={() => actions.onDelete(c)}><Trash2 size={14} /> Remover</button>}
        </div>
      </div>

      {/* Abas */}
      <div role="tablist" style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--adm-border)', overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} type="button" onClick={() => setTab(t.id)} style={{
            padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.84rem', fontWeight: 800,
            color: tab === t.id ? 'var(--adm-accent)' : 'var(--adm-text-muted)', borderBottom: `2px solid ${tab === t.id ? 'var(--adm-accent)' : 'transparent'}`,
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div style={{ display: 'grid', gap: 14 }}>
          {manager ? (
            <>
              <div style={{ ...card, display: 'flex', gap: 10, alignItems: 'center', fontSize: '0.84rem', color: 'var(--adm-text-muted)' }}>
                <TrendingUp size={16} /> Gerentes não têm ativos próprios. Veja o resultado da gestão na aba "Visão de gestão".
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
                <Stat label="Tarefas em aberto" value={mine.tasks} warn={mine.overdueTasks > 0} />
                <Stat label="Compromissos" value={mine.appointments} />
              </div>
            </>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
              {showLeads && <Stat label="Leads em aberto" value={mine.leads} />}
              {showContracts && <Stat label="Contratos administrados" value={mine.contracts} />}
              <Stat label="Tarefas em aberto" value={mine.tasks} warn={mine.overdueTasks > 0} />
              <Stat label="Atrasadas" value={mine.overdueTasks} warn={mine.overdueTasks > 0} />
              <Stat label="Compromissos" value={mine.appointments} />
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 14 }}>
            {tasksList}
            {apptList}
          </div>
        </div>
      )}

      {tab === 'assets' && (manager ? renderManagement() : (
        <div style={{ display: 'grid', gap: 14 }}>
          {kind === 'marketing' && <div style={{ ...card, display: 'flex', gap: 10, alignItems: 'center', color: 'var(--adm-text-muted)', fontSize: '0.84rem' }}><Users size={16} /> Campanhas: em breve. Por enquanto, aparecem aqui as tarefas e os compromissos.</div>}
          {showLeads && leadsList}
          {showContracts && contractsList}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 14 }}>{tasksList}{apptList}</div>
        </div>
      ))}

      {tab === 'performance' && (
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Select className="adm-input" value={period} onChange={e => setPeriod(e.target.value as ManagerPeriod)} style={{ width: 180 }}>
              <option value="this_month">Este mês</option>
              <option value="last_month">Mês anterior</option>
            </Select>
            {(kind === 'sdr' || kind === 'closer' || kind === 'sdr_closer') && (
              <button type="button" className="adm-btn adm-btn-secondary" onClick={() => actions.onGoals(c)}><Target size={14} /> Ver metas e progresso</button>
            )}
          </div>
          {kind === 'pos_venda' || myUpsells.length > 0 ? (
            <Section title="Vendas adicionais no período" count={myUpsells.length}>
              {myUpsells.length === 0 ? <Empty text="Nenhuma venda adicional no período." /> : myUpsells.map(({ client, sale }, i) => (
                <Row key={`${client.id}-${i}`} title={client.name} meta={dateBR(sale.saleDate)} right={money(Number(sale.value || 0))} />
              ))}
            </Section>
          ) : (
            <div style={{ ...card, display: 'flex', gap: 10, alignItems: 'center', color: 'var(--adm-text-muted)', fontSize: '0.84rem' }}>
              <CalendarClock size={16} /> As metas e entregas individuais ficam em "Metas" no menu. Aqui aparecem as vendas adicionais, quando houver.
            </div>
          )}
        </div>
      )}

      {tab === 'access' && (
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))' }}>
          <Section title="Setores de acesso">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 6 }}>{sectorList.map(s => <SectorChip key={s} sector={s} />)}</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginTop: 10 }}>O setor define o que a pessoa enxerga no sistema.</div>
          </Section>
          <Section title="Cargo">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 6 }}>
              {jobLabels.length ? jobLabels.map(l => <RoleChip key={l} label={l} />) : <span style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)' }}>Sem cargo definido ({PROFILE_KIND_LABEL[kind]}).</span>}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginTop: 10 }}>O cargo define o papel nos funis (SDR, Closer, Gerente).</div>
          </Section>
          <Section title="Unidades">
            {venueInfo.list.map(v => <Row key={v.id} title={v.name} />)}
          </Section>
          <Section title="Conta">
            <Row title="Criado em" right={dateBR(c.createdAt)} />
            <Row title="Último acesso" right={c.lastLoginAt ? dateBR(c.lastLoginAt) : 'Nunca'} />
            <Row title="Acesso" right={SECTOR_META[sector].label} />
          </Section>
        </div>
      )}
    </div>
  );
};
