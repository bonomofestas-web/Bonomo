import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Pencil, QrCode, History, X, Copy, Check, Code, Power, Users, MessageCircle, FileSignature, Target,
  Compass, FileText, Gift, AlertTriangle,
} from 'lucide-react';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAdminState } from '../../context/AdminStateContext';
import { sourceService } from '../../services/sourceService';
import { SmartVenueLogo } from '../common/SmartVenueLogo';
import { ChannelAvatar } from './ChannelBadge';
import { FunnelKindIcon } from './FunnelKindIcon';
import { channelOfSource } from '../../utils/channels';
import { formatPhone } from '../../utils/phoneFormatter';
import { getSendDisabledIds } from '../../utils/senderResolver';
import {
  cardsByFunnel, contactsOfSource, countByDay, dayLabel, getSourceConnection, lastNDays, leadsOfSource,
  type LiveSourceStatus,
} from '../../utils/sourceMetrics';
import type { Source } from '../../types/sources';

interface Props {
  source: Source;
  live?: LiveSourceStatus;
  copied: boolean;
  isDisconnecting: boolean;
  onBack: () => void;
  onEdit: () => void;
  onConnect: () => void;
  onSync: () => void;
  onDisconnect: () => void;
  onCopyLink: () => void;
  onEmbed: () => void;
  onToggleStatus: (active: boolean) => void;
}

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0);

const card: React.CSSProperties = {
  background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '16px', padding: '18px',
};

const sectionTitle = (text: string, hint?: string) => (
  <div style={{ marginBottom: '12px' }}>
    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>{text}</div>
    {hint && <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>{hint}</div>}
  </div>
);

/**
 * Detalhe da origem, somente leitura: de onde vem o movimento e para onde ele vai. Nada aqui edita a origem;
 * para alterar, o usuario clica em "Editar origem".
 */
export const AdminSourceDetailView: React.FC<Props> = ({
  source, live, copied, isDisconnecting, onBack, onEdit, onConnect, onSync, onDisconnect, onCopyLink, onEmbed, onToggleStatus,
}) => {
  const { leads, funnels, venues, currentUser } = useAdminState();
  const masterId = currentUser?.masterId || currentUser?.id || '';
  const conn = getSourceConnection(source, live);
  const isWhatsApp = source.type === 'whatsapp_api';
  const venue = venues.find(v => v.id === source.venueId);
  const originFunnel = funnels.find(f => f.id === source.funnelId);

  // Consultas pontuais (so ao abrir): mensagens recebidas em 7 dias e contratos desta origem
  const [messageTimes, setMessageTimes] = useState<string[] | null>(null);
  const [contracts, setContracts] = useState<{ id: string; contactId?: string; status: string; total: number; createdAt: string }[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    setMessageTimes(null);
    setContracts(null);
    if (isWhatsApp) sourceService.getReceivedMessageTimes(source.id, 7).then(r => { if (!cancelled) setMessageTimes(r); });
    else setMessageTimes([]);
    sourceService.getContractsBySource(source.id, masterId).then(r => { if (!cancelled) setContracts(r); });
    return () => { cancelled = true; };
  }, [source.id, isWhatsApp, masterId]);

  const sourceLeads = useMemo(() => leadsOfSource(source, leads), [source, leads]);
  const people = useMemo(() => contactsOfSource(sourceLeads, (contracts || []).map(c => c.contactId)), [sourceLeads, contracts]);
  const byFunnel = useMemo(() => cardsByFunnel(sourceLeads), [sourceLeads]);

  const days = useMemo(() => lastNDays(7), []);
  const newPeoplePerDay = useMemo(() => countByDay(people.people.map(p => p.firstAt), 7), [people]);
  const messagesPerDay = useMemo(() => countByDay(messageTimes || [], 7), [messageTimes]);
  const newPeople7 = newPeoplePerDay.reduce((a, b) => a + b, 0);
  const newPeople30 = useMemo(() => countByDay(people.people.map(p => p.firstAt), 30).reduce((a, b) => a + b, 0), [people]);
  const messages7 = messagesPerDay.reduce((a, b) => a + b, 0);
  const chartData = days.map((d, i) => ({ dia: dayLabel(d), contatos: newPeoplePerDay[i], mensagens: messagesPerDay[i] }));

  const contractsTotal = (contracts || []).reduce((acc, c) => acc + c.total, 0);
  const isPostSaleOrigin = Boolean(originFunnel?.isPostSale);

  // Funis em que o numero participa (origem + enviar) e se esta habilitado para envio
  const participation = useMemo(() => {
    const ids = [source.funnelId].filter(Boolean) as string[];
    return Array.from(new Set(ids)).map(id => {
      const f = funnels.find(x => x.id === id);
      return { id, name: f?.name || 'Funil removido', isOrigin: id === source.funnelId, sends: f ? !getSendDisabledIds(f).includes(source.id) : false };
    });
  }, [source, funnels]);

  const funnelRows = useMemo(() => {
    const total = Object.values(byFunnel).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(byFunnel)
      .map(([id, count]) => ({ id, count, pct: Math.round((count / total) * 100), name: id === '__sem_funil__' ? 'Sem funil' : (funnels.find(f => f.id === id)?.name || 'Funil removido') }))
      .sort((a, b) => b.count - a.count);
  }, [byFunnel, funnels]);

  const subSources = ((source.configuration as any)?.subSources || []) as { id: string; name: string; keyword: string }[];
  const recentLeads = useMemo(
    () => [...sourceLeads].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, 5),
    [sourceLeads],
  );

  const statusPill = (() => {
    if (!isWhatsApp) return source.status === 'active' ? { text: 'Ativa', color: '#10B981' } : { text: 'Pausada', color: '#64748B' };
    if (conn.isChecking) return { text: 'Verificando...', color: '#F59E0B' };
    return conn.isConnected ? { text: 'Conectado', color: '#10B981' } : { text: 'Desconectado', color: '#EF4444' };
  })();

  const typeLabel = isWhatsApp ? 'WhatsApp' : source.type === 'form' ? 'Formulário' : source.type === 'referral' ? 'Indicação no app' : 'Link rastreável';
  const subtitle = isWhatsApp ? (conn.rawPhone ? formatPhone(conn.rawPhone) || conn.rawPhone : 'Sem número conectado') : (source.slug ? `/f/${source.slug}` : typeLabel);

  const kpi = (icon: React.ReactNode, label: string, value: React.ReactNode, hint?: string, color = 'var(--adm-text-title)') => (
    <div style={{ ...card, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
        {icon}{label}
      </div>
      <div style={{ fontSize: '1.6rem', fontWeight: 900, color, marginTop: '4px', lineHeight: 1.1 }}>{value}</div>
      {hint && <div style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', marginTop: '4px' }}>{hint}</div>}
    </div>
  );

  const actionBtn = (label: string, icon: React.ReactNode, onClick: () => void, tone: 'primary' | 'neutral' | 'danger' = 'neutral', disabled = false) => {
    const colors = tone === 'primary'
      ? { bg: '#10B981', fg: '#fff', br: '#10B981' }
      : tone === 'danger'
        ? { bg: 'rgba(239,68,68,0.08)', fg: '#EF4444', br: 'rgba(239,68,68,0.3)' }
        : { bg: 'var(--adm-bg-input)', fg: 'var(--adm-text-title)', br: 'var(--adm-border)' };
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', cursor: disabled ? 'wait' : 'pointer', fontSize: '0.78rem', fontWeight: 700, background: colors.bg, color: colors.fg, border: `1px solid ${colors.br}` }}
      >
        {icon}{label}
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', padding: '24px 32px 60px 32px', width: '100%', boxSizing: 'border-box', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Cabecalho */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button type="button" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--adm-text-muted)', fontSize: '0.8rem', fontWeight: 700 }}>
          <ArrowLeft size={16} /> Origens
        </button>
      </div>

      <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
          <ChannelAvatar size={52} channel={channelOfSource(source)}>
            {conn.avatar ? (
              <img src={conn.avatar} alt="" style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--adm-bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isWhatsApp ? <Compass size={22} color="var(--adm-text-muted)" /> : source.type === 'form' ? <FileText size={22} color="var(--adm-accent)" /> : source.type === 'referral' ? <Gift size={22} color="#8B5CF6" /> : <Compass size={22} />}
              </div>
            )}
          </ChannelAvatar>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{source.name}</div>
            <div style={{ fontSize: '0.84rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>{subtitle}</div>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 800, color: statusPill.color, background: `${statusPill.color}1F`, border: `1px solid ${statusPill.color}55` }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: statusPill.color }} /> {statusPill.text}
              </span>
              {!isWhatsApp && <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>{typeLabel}</span>}
              {venue && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>
                  <SmartVenueLogo src={venue.logoUrl || (venue as any).logo_url} alt={venue.name} size={18} borderRadius={5} /> {venue.name}
                </span>
              )}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.74rem', fontWeight: 700, color: originFunnel ? 'var(--adm-text-title)' : '#F59E0B' }}>
                <FunnelKindIcon postSale={Boolean(originFunnel?.isPostSale)} size={13} /> {originFunnel ? `Origem: ${originFunnel.name}` : 'Sem funil de origem'}
              </span>
            </div>
          </div>
        </div>
        <button type="button" onClick={onEdit} className="adm-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 800 }}>
          <Pencil size={15} /> Editar origem
        </button>
      </div>

      {/* Cartoes */}
      {isWhatsApp || source.type === 'referral' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px' }}>
          {kpi(<Users size={13} />, 'Contatos', people.people.length, `7 dias: +${newPeople7} · 30 dias: +${newPeople30}`, 'var(--adm-accent)')}
          {kpi(<Target size={13} />, 'Leads comerciais', people.commercialLeads, 'Cards em funis comerciais')}
          {(isPostSaleOrigin || people.clients > 0) && kpi(<FunnelKindIcon postSale size={13} />, 'Clientes', people.clients, 'Atendimento de pós-venda')}
          {kpi(<FileSignature size={13} />, 'Contratos', contracts === null ? '...' : contracts.length, contracts === null ? undefined : brl(contractsTotal), '#8B5CF6')}
          {isWhatsApp && kpi(<MessageCircle size={13} />, 'Mensagens (7 dias)', messageTimes === null ? '...' : messages7, 'Recebidas por este número', '#10B981')}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px' }}>
          {kpi(<Users size={13} />, 'Contatos', people.people.length, `7 dias: +${newPeople7} · 30 dias: +${newPeople30}`, 'var(--adm-accent)')}
          {kpi(<FileText size={13} />, 'Visualizações', source.totalViews || 0, 'Últimos 60 dias')}
          {kpi(<Check size={13} />, 'Envios', source.totalSubmits || 0, (source.totalViews || 0) > 0 ? `Conversão ${Math.round(((source.totalSubmits || 0) / (source.totalViews || 1)) * 100)}%` : undefined, '#10B981')}
          {kpi(<FileSignature size={13} />, 'Contratos', contracts === null ? '...' : contracts.length, contracts === null ? undefined : brl(contractsTotal), '#8B5CF6')}
        </div>
      )}

      {/* Grafico 7 dias */}
      <div style={card}>
        {sectionTitle('Movimento dos últimos 7 dias', isWhatsApp ? 'Barras: contatos novos. Linha: mensagens recebidas.' : 'Contatos novos por dia.')}
        {people.people.length === 0 && (messageTimes || []).length === 0 ? (
          <div style={{ padding: '28px 0', textAlign: 'center', fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>Ainda sem movimento nos últimos 7 dias.</div>
        ) : (
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--adm-border)" vertical={false} />
                <XAxis dataKey="dia" tick={{ fontSize: 11, fill: 'var(--adm-text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--adm-text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="contatos" name="Contatos novos" fill="var(--adm-accent, #3B82F6)" radius={[4, 4, 0, 0]} />
                {isWhatsApp && <Line type="monotone" dataKey="mensagens" name="Mensagens recebidas" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {/* Funis */}
        <div style={card}>
          {sectionTitle('Onde esse movimento está', 'Um mesmo contato pode estar em mais de um funil, por isso os números de cards podem passar do total de contatos.')}
          {funnelRows.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>Nenhum card criado por esta origem ainda.</div>
          ) : funnelRows.map(r => (
            <div key={r.id} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                <span>{r.name}</span><span>{r.count} {r.count === 1 ? 'card' : 'cards'}</span>
              </div>
              <div style={{ height: '6px', borderRadius: '3px', background: 'var(--adm-border)', marginTop: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${r.pct}%`, height: '100%', background: 'var(--adm-accent)' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Participacao */}
        {isWhatsApp && (
          <div style={card}>
            {sectionTitle('Funis em que este número participa', 'O funil de origem recebe as mensagens. Os demais podem responder por este número.')}
            {participation.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>Nenhum funil vinculado.</div>
            ) : participation.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--adm-border)', fontSize: '0.8rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--adm-text-title)' }}>{p.name}{p.isOrigin ? ' (origem)' : ''}</span>
                <span style={{ fontWeight: 800, color: p.sends ? '#10B981' : '#F59E0B' }}>{p.sends ? 'Envia mensagens' : 'Somente recebe'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {isWhatsApp && subSources.length > 0 && (
        <div style={card}>
          {sectionTitle('Sub-origens', 'Identificadas pela palavra-chave da primeira mensagem.')}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {subSources.map(sub => (
              <span key={sub.id} style={{ padding: '5px 12px', borderRadius: '999px', fontSize: '0.76rem', fontWeight: 700, background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', color: 'var(--adm-text-title)' }}>
                {sub.name} <span style={{ color: 'var(--adm-text-muted)', fontWeight: 600 }}>· "{sub.keyword}" · {sourceLeads.filter(l => l.subSource === sub.name).length}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Ultimos */}
      <div style={card}>
        {sectionTitle('Últimas entradas')}
        {recentLeads.length === 0 ? (
          <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>Nenhuma entrada registrada.</div>
        ) : recentLeads.map(l => (
          <div
            key={l.id}
            onClick={() => window.dispatchEvent(new CustomEvent('admin_open_lead', { detail: { leadId: l.id, funnelId: l.funnelId } }))}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '9px 0', borderBottom: '1px solid var(--adm-border)', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            <span style={{ fontWeight: 700, color: 'var(--adm-text-title)' }}>{l.name}</span>
            <span style={{ color: 'var(--adm-text-muted)' }}>
              {funnels.find(f => f.id === l.funnelId)?.name || 'Sem funil'}{l.createdAt ? ` · ${new Date(l.createdAt).toLocaleDateString('pt-BR')}` : ''}
            </span>
          </div>
        ))}
      </div>

      {/* Acoes */}
      <div style={card}>
        {sectionTitle('Ações')}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {isWhatsApp && conn.hasNeverConnected && actionBtn('Conectar WhatsApp', <QrCode size={14} />, onConnect, 'primary')}
          {isWhatsApp && !conn.hasNeverConnected && conn.isDisconnected && actionBtn('Reconectar WhatsApp', <AlertTriangle size={14} />, onConnect, 'danger')}
          {isWhatsApp && conn.isConnected && actionBtn('Sincronizar histórico', <History size={14} />, onSync)}
          {isWhatsApp && conn.isConnected && actionBtn(isDisconnecting ? 'Desconectando...' : 'Desconectar', <X size={14} />, onDisconnect, 'danger', isDisconnecting)}
          {source.type === 'form' && actionBtn(copied ? 'Link copiado' : 'Copiar link', copied ? <Check size={14} /> : <Copy size={14} />, onCopyLink)}
          {source.type === 'form' && actionBtn('Código para incorporar', <Code size={14} />, onEmbed)}
          {actionBtn(source.status === 'active' ? 'Pausar origem' : 'Ativar origem', <Power size={14} />, () => onToggleStatus(source.status !== 'active'))}
        </div>
      </div>
    </div>
  );
};
