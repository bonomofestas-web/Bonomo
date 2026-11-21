import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Wallet, Search, ShieldAlert, XCircle, CheckCircle2, LayoutGrid, List } from 'lucide-react';
import { toast } from 'sonner';
import { Select } from '../../ui';
import { useAdminState } from '../../../context/AdminStateContext';
import { financeService, isImportedContract } from '../../../services/financeService';
import { contractService } from '../../../services/contractService';
import { type FinContractSummary, type FinReview } from '../../../types/finance';
import { parsePlan, validatePlan } from '../../../utils/paymentPlan';
import { buildVenueAccentMap } from '../../../utils/venueColors';
import { FinanceContractModal } from './FinanceContractModal';
import { FinanceReceivablesModal } from './FinanceReceivablesModal';
import { FinanceFunnelBoard } from './FinanceFunnelBoard';
import { ContractSideList, type SideItem } from './ContractSideList';
import { ContractBoard, type BoardCard } from '../contracts/ContractBoard';
import { ContractClosingWorkspace } from '../contracts/ContractClosingWorkspace';
import type { Contract } from '../../../types/admin';

const money = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = (d?: string | null) => { if (!d) return 'sem data'; const [y, m, day] = d.split('T')[0].split('-'); return `${day}/${m}/${y}`; };

type Row = FinReview & { contract: any };


/**
 * Financeiro: Aprovação (fila de planos de pagamento) e Visão geral (funil financeiro dos contratos aprovados).
 * Contas a pagar, fluxo de caixa, DRE e configurações seguem docs/PLANO_FINANCEIRO.md.
 */
export const AdminFinanceView: React.FC<{ section?: 'aprovacao' | 'geral' | 'soon'; soonTitle?: string; soonText?: string }> = ({ section = 'geral', soonTitle, soonText }) => {
  const { currentUser, venues } = useAdminState();
  const masterId = currentUser?.masterId || currentUser?.id || '';
  const [summaries, setSummaries] = useState<FinContractSummary[]>([]);
  const [pending, setPending] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [venueFilter, setVenueFilter] = useState('all');
  const [view, setView] = useState<'cards' | 'list'>('cards');
  const [openRow, setOpenRow] = useState<Row | null>(null);
  const [openSummary, setOpenSummary] = useState<FinContractSummary | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [listCollapsed, setListCollapsed] = useState(false);
  const [early, setEarly] = useState<Contract[]>([]);
  const [openEarlyId, setOpenEarlyId] = useState<string | null>(null);
  // Ao abrir um contrato, a lista recua para a ficha ocupar a area
  useEffect(() => { if (openRow || openSummary) setListCollapsed(true); }, [openRow?.id, openSummary?.contractId]); // eslint-disable-line react-hooks/exhaustive-deps
  const accents = useMemo(() => buildVenueAccentMap(venues), [venues]);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, p] = await Promise.all([financeService.getContractSummaries(masterId), financeService.getPendingReviews(masterId)]);
    setSummaries(s);
    setPending(p);
    const ctr = await contractService.getContracts({ masterId, approvalStatus: 'pending_approval', limit: 500 });
    setEarly(ctr.filter(c => (c.fillStage || 'pendente') !== 'preenchido'));
    setLoading(false);
  }, [masterId]);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pending.filter(r => {
      if (venueFilter !== 'all' && r.contract.venue_id !== venueFilter) return false;
      if (!q) return true;
      const snap = r.contract.client_snapshot || {};
      return `${r.contract.contract_title} ${r.contract.contract_code} ${snap.payerName || snap.name || ''}`.toLowerCase().includes(q);
    });
  }, [pending, search, venueFilter]);

  const quickApprove = async (r: Row) => {
    setBusyId(r.id);
    const res = await financeService.approveReview({ masterId, reviewId: r.id, contractId: r.contractId, plan: parsePlan(r.plan) || { version: 1, items: [] }, reviewer: { id: currentUser?.id, name: currentUser?.name } });
    setBusyId(null);
    if (!res.success) { toast.error(res.message || 'Abra a ficha para completar o plano.'); return; }
    await contractService.approveContract({ contractId: r.contractId, masterId, approverUser: { id: currentUser?.id || '', name: currentUser?.name || 'Financeiro', role: 'financeiro' }, fromFinance: true });
    toast.success(`Aprovado: ${res.receivables} parcelas criadas.`);
    void load();
  };

  if (section === 'soon') {
    return (
      <div style={{ padding: 24, maxWidth: 900 }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: 6 }}>{soonTitle}</div>
        <div style={{ border: '1px dashed var(--adm-border)', borderRadius: 12, padding: 20, fontSize: '0.82rem', color: 'var(--adm-text-muted)', lineHeight: 1.5 }}>
          Em construção. {soonText}
        </div>
      </div>
    );
  }

  const header = (title: string, sub: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(2,132,199,0.12)', color: '#0284C7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Wallet size={20} /></span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>{title}</div>
        <div style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)' }}>{sub}</div>
      </div>
    </div>
  );

  const WS_HEIGHT = 'calc(100vh - 64px)';

  if (section === 'geral' && openSummary) {
    const items: SideItem[] = summaries.filter(x => !['aguardando_aprovacao', 'reprovado', 'sem_plano'].includes(x.stageKey)).map(x => ({
      id: x.contractId, title: x.contractTitle || x.contractCode, sub: `${x.contractCode} · festa ${fmtDate(x.eventDate)}`, right: money(x.contractTotal), color: accents.get(x.venueId)?.color,
    }));
    return (
      <div style={{ display: 'flex', height: WS_HEIGHT, width: '100%', minHeight: 0 }}>
        <ContractSideList items={items} selectedId={openSummary.contractId} collapsed={listCollapsed} onToggle={() => setListCollapsed(v => !v)}
          onSelect={id => { const n = summaries.find(x => x.contractId === id); if (n) setOpenSummary(n); }} />
        <div style={{ flex: 1, minWidth: 0, padding: 10 }}>
          <FinanceReceivablesModal key={openSummary.contractId} embedded summary={openSummary} onClose={() => setOpenSummary(null)} onChanged={() => void load()} />
        </div>
      </div>
    );
  }

  if (section === 'aprovacao' && openEarlyId && early.some(c => c.id === openEarlyId)) {
    return (
      <ContractClosingWorkspace contracts={early} masterId={masterId} canEdit={false} canViewDocs selectedId={openEarlyId}
        onSelect={setOpenEarlyId} onBack={() => setOpenEarlyId(null)} onChanged={() => void load()} />
    );
  }

  if (section === 'aprovacao' && openRow) {
    const items: SideItem[] = pending.map(r => ({
      id: r.id, title: r.contract.contract_title, sub: `${r.contract.contract_code} · festa ${fmtDate(r.contract.event_date)}`, right: money(Number(r.contract.total_amount || 0)), color: accents.get(r.contract.venue_id)?.color,
    }));
    return (
      <div style={{ display: 'flex', height: WS_HEIGHT, width: '100%', minHeight: 0 }}>
        <ContractSideList items={items} selectedId={openRow.id} collapsed={listCollapsed} onToggle={() => setListCollapsed(v => !v)}
          onSelect={id => { const n = pending.find(r => r.id === id); if (n) setOpenRow(n); }} />
        <div style={{ flex: 1, minWidth: 0, padding: 10 }}>
          <FinanceContractModal key={openRow.id} embedded review={openRow} onClose={() => setOpenRow(null)} onChanged={() => void load()} />
        </div>
      </div>
    );
  }

  if (section === 'geral') {
    const inFunnel = summaries.filter(s => !['aguardando_aprovacao', 'reprovado', 'sem_plano'].includes(s.stageKey)).length;
    return (
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, width: '100%', boxSizing: 'border-box' }}>
        {header('Funil financeiro', loading ? 'Carregando...' : `${inFunnel} contratos no funil: acompanhe quem está em dia, inadimplente, em negociação, quitado ou cancelado`)}
        <FinanceFunnelBoard summaries={summaries} onOpen={setOpenSummary} />
      </div>
    );
  }

  // ---- Aprovação ----
  const planState = (r: Row) => {
    const c = r.contract;
    const plan = parsePlan(r.plan);
    const v = validatePlan(plan, Number(c.total_amount || 0), { requireDates: true, hasEventDate: Boolean(c.event_date) });
    return { ok: v.ok, label: v.ok ? 'Plano completo' : (plan && plan.items.length ? 'Plano a completar' : 'Sem plano') };
  };

  const actions = (r: Row) => {
    const imported = isImportedContract(r.contract.commercial_fields_snapshot);
    const ok = planState(r).ok;
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
        {imported && <span title="Contrato importado: não pode ser reprovado" style={{ display: 'inline-flex', color: '#D97706' }}><ShieldAlert size={16} /></span>}
        {!imported && (
          <button type="button" onClick={() => setOpenRow(r)} title="Abrir para reprovar com motivo" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8, border: '1px solid #E11D48', background: 'transparent', color: '#E11D48', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer' }}><XCircle size={13} /> Reprovar</button>
        )}
        <button type="button" disabled={busyId === r.id} onClick={() => (ok ? quickApprove(r) : setOpenRow(r))}
          title={ok ? 'Aprovar e criar as parcelas' : 'Abrir a ficha para completar o plano'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: 'none', background: ok ? '#059669' : '#64748B', color: '#fff', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer', opacity: busyId === r.id ? 0.6 : 1 }}>
          <CheckCircle2 size={13} /> {ok ? 'Aprovar' : 'Abrir'}
        </button>
      </div>
    );
  };

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, width: '100%', boxSizing: 'border-box' }}>
      {header(`Aprovação do plano de pagamento (${pending.length})`, loading ? 'Carregando...' : 'Confira o contrato, ajuste o plano de pagamento e aprove. Ao aprovar, as parcelas nascem e o contrato entra no funil financeiro.')}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 380 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--adm-text-muted)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por contrato, código ou cliente"
            style={{ width: '100%', boxSizing: 'border-box', height: 36, padding: '0 12px 0 32px', borderRadius: 8, border: '1px solid var(--adm-border)', background: 'var(--adm-bg-input, #fff)', color: 'var(--adm-text-title)', fontSize: '0.8rem', outline: 'none' }} />
        </div>
        <Select className="adm-input" value={venueFilter} onChange={e => setVenueFilter(e.target.value)} style={{ width: 220 }}>
          <option value="all">Todas as unidades</option>
          {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </Select>
        <span style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>{filtered.length} aguardando</span>
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {([['cards', 'Quadro', LayoutGrid], ['list', 'Lista', List]] as const).map(([k, label, Icon]) => (
            <button key={k} type="button" onClick={() => setView(k)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 800, background: view === k ? 'rgba(2,132,199,0.14)' : 'transparent', color: view === k ? '#0284C7' : 'var(--adm-text-muted)' }}><Icon size={14} /> {label}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ border: '1px dashed var(--adm-border)', borderRadius: 12, padding: 28, textAlign: 'center', fontSize: '0.82rem', color: 'var(--adm-text-muted)' }}>
          {loading ? 'Carregando...' : 'Nenhum plano de pagamento aguardando aprovação.'}
        </div>
      ) : view === 'list' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(r => {
            const c = r.contract; const snap = c.client_snapshot || {}; const ps = planState(r); const acc = accents.get(c.venue_id);
            return (
              <div key={r.id} onClick={() => setOpenRow(r)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 12, border: '1px solid var(--adm-border)', borderLeft: `4px solid ${acc?.color || '#F59E0B'}`, background: 'var(--adm-bg-card, #fff)', cursor: 'pointer' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--adm-text-title)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.contract_title}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>{snap.payerName || snap.name} · {acc?.label} · festa {fmtDate(c.event_date)} · {c.contract_code}</div>
                </div>
                <div style={{ textAlign: 'right', minWidth: 120 }}>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>{money(Number(c.total_amount || 0))}</div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: ps.ok ? '#059669' : '#B45309' }}>{ps.label}</div>
                </div>
                {actions(r)}
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          <ContractBoard height="calc(100vh - 240px)"
            onOpen={id => { const r = pending.find(x => x.id === id); if (r) setOpenRow(r); else setOpenEarlyId(id); }}
            cards={[
              ...early.filter(c => (venueFilter === 'all' || c.venueId === venueFilter) && (!search.trim() || `${c.contractTitle} ${c.contractCode} ${c.clientSnapshot?.name || ''}`.toLowerCase().includes(search.trim().toLowerCase()))).map<BoardCard>(c => ({
                id: c.id, stage: c.fillStage || 'pendente', title: c.contractTitle || c.title || c.contractCode, payer: c.clientSnapshot?.payerName || c.clientSnapshot?.name,
                venueId: c.venueId, total: c.totalAmount || 0, eventDate: c.eventDate, signal: c.signalAmount, entry: c.entryAmount, closer: c.closerName, tag: 'Só leitura',
              })),
              ...filtered.map<BoardCard>(r => ({
                id: r.id, stage: 'preenchido', title: r.contract.contract_title, payer: (r.contract.client_snapshot || {}).payerName || (r.contract.client_snapshot || {}).name,
                venueId: r.contract.venue_id, total: Number(r.contract.total_amount || 0), eventDate: r.contract.event_date,
                imported: isImportedContract(r.contract.commercial_fields_snapshot), tag: planState(r).label,
              })),
            ]}
          />
        </div>
      )}

    </div>
  );
};
