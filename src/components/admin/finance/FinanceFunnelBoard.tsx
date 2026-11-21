import React, { useMemo, useState } from 'react';
import { LayoutGrid, List, Search, AlertTriangle, CheckCircle2, Handshake, Ban, Smile } from 'lucide-react';
import { Select } from '../../ui';
import { useAdminState } from '../../../context/AdminStateContext';
import { buildVenueAccentMap } from '../../../utils/venueColors';
import { FIN_STAGE_LABEL, type FinContractSummary, type FinStageKey } from '../../../types/finance';

const money = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0);
const moneyFull = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = (d?: string | null) => { if (!d) return 'sem data'; const [y, m, day] = d.split('T')[0].split('-'); return `${day}/${m}/${y}`; };
const todayIso = () => new Date().toLocaleDateString('en-CA');
const daysUntil = (iso: string) => Math.round((new Date(`${iso}T12:00:00`).getTime() - new Date(`${todayIso()}T12:00:00`).getTime()) / 86400000);

/**
 * Etapas do funil financeiro. Nada e arrastado: Em dia, Inadimplente e Quitado sao calculadas pelas parcelas;
 * Renegociacao e Cancelamento sao definidas dentro da ficha do contrato.
 */
const COLUMNS: Array<{ key: FinStageKey; color: string; Icon: React.ElementType; note: string; hint: string }> = [
  { key: 'em_dia', color: '#10B981', Icon: Smile, note: 'automática', hint: 'Plano de pagamento em dia: nenhuma parcela vencida e não paga' },
  { key: 'inadimplente', color: '#EF4444', Icon: AlertTriangle, note: 'automática', hint: 'Tem parcela vencida e não paga (calculado pelas parcelas)' },
  { key: 'renegociacao', color: '#F59E0B', Icon: Handshake, note: 'definida na ficha', hint: 'A dívida já negociada voltou a ser negociada: definida na ficha do contrato' },
  { key: 'quitado', color: '#059669', Icon: CheckCircle2, note: 'automática', hint: 'Todas as parcelas pagas: financeiro fechado' },
  { key: 'cancelamento', color: '#64748B', Icon: Ban, note: 'definida na ficha', hint: 'Contrato cancelado: definida na ficha do contrato, com motivo' },
];

type TagFilter = 'all' | 'today' | 'soon' | 'overdue' | 'overdue30' | 'partial';
const TAG_FILTERS: Array<{ key: TagFilter; label: string }> = [
  { key: 'all', label: 'Todos' }, { key: 'today', label: 'Vence hoje' }, { key: 'soon', label: 'Vence em 7 dias' },
  { key: 'overdue', label: 'Em atraso' }, { key: 'overdue30', label: 'Atraso +30 dias' }, { key: 'partial', label: 'Pagamento parcial' },
];

/** Etiquetas automaticas do card, calculadas pelas parcelas. */
const tagsOf = (s: FinContractSummary): Array<{ label: string; color: string }> => {
  const t: Array<{ label: string; color: string }> = [];
  if (s.stageKey === 'cancelamento') return t;
  if (s.maxOverdueDays > 0) t.push({ label: `${s.maxOverdueDays} ${s.maxOverdueDays === 1 ? 'dia' : 'dias'} em atraso`, color: s.maxOverdueDays > 30 ? '#B91C1C' : '#EF4444' });
  if (s.nextDueDate && s.stageKey !== 'quitado') {
    const d = daysUntil(s.nextDueDate);
    if (d === 0) t.push({ label: 'Vence hoje', color: '#0284C7' });
    else if (d > 0 && d <= 7) t.push({ label: `Vence em ${d} ${d === 1 ? 'dia' : 'dias'}`, color: '#0284C7' });
  }
  if (s.partialCount > 0) t.push({ label: 'Pagamento parcial', color: '#7C3AED' });
  return t;
};

const matchesTag = (s: FinContractSummary, f: TagFilter): boolean => {
  if (f === 'all') return true;
  if (f === 'today') return s.nextDueDate === todayIso() && s.stageKey !== 'quitado';
  if (f === 'soon') return s.dueSoon && s.stageKey !== 'quitado';
  if (f === 'overdue') return s.maxOverdueDays > 0 && s.stageKey !== 'cancelamento';
  if (f === 'overdue30') return s.maxOverdueDays > 30 && s.stageKey !== 'cancelamento';
  return s.partialCount > 0 && s.stageKey !== 'cancelamento';
};

interface Props {
  summaries: FinContractSummary[];
  onOpen: (s: FinContractSummary) => void;
}

export const FinanceFunnelBoard: React.FC<Props> = ({ summaries, onOpen }) => {
  const { venues } = useAdminState();
  const accents = useMemo(() => buildVenueAccentMap(venues), [venues]);
  const [view, setView] = useState<'board' | 'list'>('board');
  const [search, setSearch] = useState('');
  const [venueFilter, setVenueFilter] = useState('all');
  const [tag, setTag] = useState<TagFilter>('all');

  const inFunnel = summaries.filter(s => COLUMNS.some(c => c.key === s.stageKey));
  const waiting = summaries.length - inFunnel.length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inFunnel.filter(s => {
      if (venueFilter !== 'all' && s.venueId !== venueFilter) return false;
      if (!matchesTag(s, tag)) return false;
      return !q || `${s.contractTitle} ${s.contractCode}`.toLowerCase().includes(q);
    });
  }, [inFunnel, search, venueFilter, tag]);

  const columnItems = (key: FinStageKey) => filtered.filter(s => s.stageKey === key).sort((a, b) =>
    key === 'inadimplente' ? b.maxOverdueDays - a.maxOverdueDays : (a.nextDueDate || '9999').localeCompare(b.nextDueDate || '9999'));

  const kpi = useMemo(() => ({
    pending: inFunnel.filter(s => s.stageKey !== 'cancelamento').reduce((a, s) => a + s.pendingAmount, 0),
    overdue: inFunnel.filter(s => s.stageKey !== 'cancelamento').reduce((a, s) => a + s.overdueAmount, 0),
    overdueN: inFunnel.filter(s => s.maxOverdueDays > 0 && s.stageKey !== 'cancelamento').length,
    soonN: inFunnel.filter(s => s.dueSoon && s.stageKey !== 'quitado' && s.stageKey !== 'cancelamento').length,
    paid: inFunnel.reduce((a, s) => a + s.paidAmount, 0),
  }), [inFunnel]);

  const card = (s: FinContractSummary) => {
    const accent = accents.get(s.venueId);
    const tags = tagsOf(s);
    return (
      <div key={s.contractId} onClick={() => onOpen(s)}
        style={{ background: 'var(--adm-bg-card, #fff)', border: '1px solid var(--adm-border)', borderLeft: `4px solid ${accent?.color || '#64748B'}`, borderRadius: 10, padding: '10px 12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--adm-text-title)', lineHeight: 1.25 }}>{s.contractTitle}</div>
        <div style={{ fontSize: '0.66rem', fontWeight: 800, color: accent?.color, textTransform: 'uppercase' }}>{accent?.label}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
          <span>Pago <strong style={{ color: '#059669' }}>{money(s.paidAmount)}</strong></span>
          <span>Pendente <strong style={{ color: 'var(--adm-text-title)' }}>{money(s.pendingAmount)}</strong></span>
        </div>
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {tags.map(t => <span key={t.label} style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 7px', borderRadius: 999, color: t.color, background: `${t.color}1A`, border: `1px solid ${t.color}55` }}>{t.label}</span>)}
          </div>
        )}
        {s.stageKey !== 'quitado' && s.stageKey !== 'cancelamento' && s.nextDueDate && (
          <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>Próximo vencimento: {fmtDate(s.nextDueDate)}</div>
        )}
        {s.manualNote && <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>Obs.: {s.manualNote}</div>}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
      {/* Indicadores */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {[
          { label: 'A receber', value: money(kpi.pending), sub: `${inFunnel.length} contratos no funil`, color: '#0284C7' },
          { label: 'Em atraso', value: money(kpi.overdue), sub: `${kpi.overdueN} contratos inadimplentes`, color: '#EF4444' },
          { label: 'Vencem em 7 dias', value: String(kpi.soonN), sub: 'contratos com parcela próxima', color: '#F59E0B' },
          { label: 'Já recebido', value: money(kpi.paid), sub: 'parcelas pagas', color: '#059669' },
        ].map(k => (
          <div key={k.label} style={{ border: '1px solid var(--adm-border)', borderLeft: `4px solid ${k.color}`, borderRadius: 12, padding: '12px 14px', background: 'var(--adm-bg-card, #fff)' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: k.color, textTransform: 'uppercase' }}>{k.label}</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--adm-text-title)', marginTop: 2 }}>{k.value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--adm-text-muted)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar contrato ou cliente"
            style={{ width: '100%', boxSizing: 'border-box', height: 36, padding: '0 12px 0 32px', borderRadius: 8, border: '1px solid var(--adm-border)', background: 'var(--adm-bg-input, #fff)', color: 'var(--adm-text-title)', fontSize: '0.8rem', outline: 'none' }} />
        </div>
        <Select className="adm-input" value={venueFilter} onChange={e => setVenueFilter(e.target.value)} style={{ width: 210 }}>
          <option value="all">Todas as unidades</option>
          {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </Select>
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {([['board', 'Funil', LayoutGrid], ['list', 'Lista', List]] as const).map(([k, label, Icon]) => (
            <button key={k} type="button" onClick={() => setView(k)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 800, background: view === k ? 'rgba(2,132,199,0.14)' : 'transparent', color: view === k ? '#0284C7' : 'var(--adm-text-muted)' }}><Icon size={14} /> {label}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {TAG_FILTERS.map(f => (
          <button key={f.key} type="button" onClick={() => setTag(f.key)} style={{ padding: '5px 12px', borderRadius: 999, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 800, border: tag === f.key ? '1px solid #0284C7' : '1px solid var(--adm-border)', background: tag === f.key ? 'rgba(2,132,199,0.12)' : 'transparent', color: tag === f.key ? '#0284C7' : 'var(--adm-text-title)' }}>{f.label}</button>
        ))}
        {waiting > 0 && <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>{waiting} contratos ainda aguardam aprovação (menu Aprovação)</span>}
      </div>

      {view === 'board' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(250px, 1fr))', gap: 12, alignItems: 'start', overflowX: 'auto', paddingBottom: 12 }}>
          {COLUMNS.map(col => {
            const items = columnItems(col.key);
            const total = items.reduce((a, s) => a + (col.key === 'quitado' ? s.paidAmount : s.pendingAmount), 0);
            return (
              <div key={col.key} style={{ background: 'var(--adm-bg-surface, #F8FAFC)', border: '1px solid var(--adm-border)', borderRadius: 12, display: 'flex', flexDirection: 'column', minHeight: 320, maxHeight: 'calc(100vh - 360px)' }}>
                <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--adm-border)', borderTop: `3px solid ${col.color}`, borderRadius: '12px 12px 0 0' }} title={col.hint}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', fontWeight: 800, color: col.color, textTransform: 'uppercase' }}><col.Icon size={14} /> {FIN_STAGE_LABEL[col.key]}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>{items.length}</span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', marginTop: 2 }}>{col.key === 'quitado' ? 'recebido ' : 'a receber '}{money(total)} · {col.note}</div>
                </div>
                <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
                  {items.map(card)}
                  {items.length === 0 && <div style={{ padding: 16, textAlign: 'center', fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>Nenhum contrato.</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[...filtered].sort((a, b) => b.maxOverdueDays - a.maxOverdueDays || (a.nextDueDate || '9999').localeCompare(b.nextDueDate || '9999')).map(s => {
            const col = COLUMNS.find(c => c.key === s.stageKey)!;
            return (
              <div key={s.contractId} onClick={() => onOpen(s)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--adm-border)', borderLeft: `4px solid ${col.color}`, background: 'var(--adm-bg-card, #fff)', cursor: 'pointer' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--adm-text-title)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.contractTitle}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>{accents.get(s.venueId)?.label} · {s.contractCode}</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>{tagsOf(s).map(t => <span key={t.label} style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 7px', borderRadius: 999, color: t.color, background: `${t.color}1A` }}>{t.label}</span>)}</div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: col.color, minWidth: 92, textAlign: 'center' }}>{FIN_STAGE_LABEL[s.stageKey]}</span>
                <div style={{ textAlign: 'right', minWidth: 120 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800 }}>{moneyFull(s.pendingAmount)}</div>
                  <div style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)' }}>pendente · pago {money(s.paidAmount)}</div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div style={{ padding: 24, textAlign: 'center', fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>Nenhum contrato com esses filtros.</div>}
        </div>
      )}

      {inFunnel.length === 0 && (
        <div style={{ border: '1px dashed var(--adm-border)', borderRadius: 12, padding: 20, fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>
          Os contratos entram aqui quando o financeiro aprova o plano de pagamento (menu Aprovação).
        </div>
      )}
    </div>
  );
};
