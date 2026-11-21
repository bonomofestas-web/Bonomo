import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, ArrowDownCircle, ArrowUpCircle, Scale } from 'lucide-react';
import { Select, MonthYearSwitcher } from '../../ui';
import { useAdminState } from '../../../context/AdminStateContext';
import { financeService, type CashCalendarData } from '../../../services/financeService';
import { FinanceReceivablesModal } from './FinanceReceivablesModal';
import type { FinContractSummary } from '../../../types/finance';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const money = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0);
const money2 = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const KIND: Record<string, string> = { sinal: 'Sinal', entrada: 'Entrada', parcela: 'Parcela', saldo: 'Saldo final', cartao: 'Cartão', pos_evento: 'Pós-evento' };

/**
 * Calendario do financeiro: so duas coisas, o que ENTRA e o que SAI em cada dia, com o acumulado do mes.
 * Entradas = parcelas a receber dos contratos (pelo vencimento). Saidas = contas a pagar (ainda nao ha lancamentos).
 */
export const FinanceCalendarView: React.FC = () => {
  const { currentUser, venues } = useAdminState();
  const masterId = currentUser?.masterId || currentUser?.id || '';
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [venueFilter, setVenueFilter] = useState('all');
  const [data, setData] = useState<CashCalendarData>({ inflows: [], outflows: [] });
  const [loading, setLoading] = useState(true);
  const [openSummary, setOpenSummary] = useState<FinContractSummary | null>(null);
  const [selected, setSelected] = useState<string | null>(iso(now.getFullYear(), now.getMonth(), now.getDate()));

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();

  const load = useCallback(async () => {
    setLoading(true);
    const venueIds = venueFilter === 'all' ? venues.map(v => v.id) : [venueFilter];
    setData(await financeService.getCashCalendar(masterId, iso(year, month, 1), iso(year, month, daysInMonth), venueIds));
    setLoading(false);
  }, [masterId, year, month, daysInMonth, venueFilter, venues]);
  useEffect(() => { void load(); }, [load]);

  // totais por dia e acumulado desde o inicio do mes
  const byDay = useMemo(() => {
    const map = new Map<string, { in: number; out: number }>();
    data.inflows.forEach(i => { const e = map.get(i.date) || { in: 0, out: 0 }; e.in += i.amount; map.set(i.date, e); });
    data.outflows.forEach(o => { const e = map.get(o.date) || { in: 0, out: 0 }; e.out += o.amount; map.set(o.date, e); });
    let acc = 0;
    const out = new Map<string, { in: number; out: number; acc: number }>();
    for (let d = 1; d <= daysInMonth; d++) {
      const k = iso(year, month, d);
      const e = map.get(k) || { in: 0, out: 0 };
      acc += e.in - e.out;
      out.set(k, { ...e, acc });
    }
    return out;
  }, [data, daysInMonth, year, month]);

  const totalIn = data.inflows.reduce((a, i) => a + i.amount, 0);
  const totalOut = data.outflows.reduce((a, o) => a + o.amount, 0);
  const goMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear()); setMonth(d.getMonth()); setSelected(null);
  };

  const openContract = async (contractId: string) => {
    const all = await financeService.getContractSummaries(masterId);
    const found = all.find(x => x.contractId === contractId);
    if (found) setOpenSummary(found);
  };

  const dayInflows = selected ? data.inflows.filter(i => i.date === selected) : [];
  const dayOutflows = selected ? data.outflows.filter(o => o.date === selected) : [];
  const today = iso(now.getFullYear(), now.getMonth(), now.getDate());

  const cells: Array<number | null> = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length < 42) cells.push(null); // sempre 6 semanas

  const kpi = (label: string, value: number, color: string, Icon: React.ElementType) => (
    <div style={{ flex: '1 1 170px', border: '1px solid var(--adm-border)', borderRadius: 12, padding: '10px 14px', background: 'var(--adm-bg-card, #fff)', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--adm-text-muted)' }}><Icon size={13} color={color} /> {label}</span>
      <strong style={{ fontSize: '1.25rem', color }}>{money2(value)}</strong>
    </div>
  );

  if (openSummary) {
    return (
      <div style={{ height: 'calc(100vh - 64px)', padding: 10, boxSizing: 'border-box' }}>
        <FinanceReceivablesModal key={openSummary.contractId} embedded summary={openSummary} onClose={() => setOpenSummary(null)} onChanged={() => void load()} />
      </div>
    );
  }

  return (
    <div style={{ height: 'calc(100vh - 64px)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', flexShrink: 0 }}>
        <span style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(2,132,199,0.12)', color: '#0284C7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><CalendarDays size={20} /></span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>Calendário financeiro</div>
          <div style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)' }}>{loading ? 'Carregando...' : 'O que entra e o que sai em cada dia, com o valor acumulado do mês.'}</div>
        </div>
        {venues.length > 1 && (
          <Select className="adm-input" value={venueFilter} onChange={e => setVenueFilter(e.target.value)} style={{ width: 220 }}>
            <option value="all">Todas as unidades</option>
            {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </Select>
        )}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <button type="button" onClick={() => goMonth(-1)} aria-label="Mês anterior" style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--adm-border)', background: 'transparent', cursor: 'pointer', color: 'var(--adm-text-title)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={16} /></button>
          <MonthYearSwitcher year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); setSelected(null); }} style={{ minWidth: 150, fontSize: '0.92rem', color: 'var(--adm-text-title)' }} />
          <button type="button" onClick={() => goMonth(1)} aria-label="Próximo mês" style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--adm-border)', background: 'transparent', cursor: 'pointer', color: 'var(--adm-text-title)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={16} /></button>
          <button type="button" onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); setSelected(today); }} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--adm-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>Hoje</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
        {kpi('Entra no mês', totalIn, '#059669', ArrowDownCircle)}
        {kpi('Sai no mês', totalOut, '#E11D48', ArrowUpCircle)}
        {kpi('Saldo do mês', totalIn - totalOut, totalIn - totalOut >= 0 ? '#0369A1' : '#E11D48', Scale)}
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 14 }}>
        <div style={{ minHeight: 0, display: 'flex', flexDirection: 'column', border: '1px solid var(--adm-border)', borderRadius: 12, overflow: 'hidden', background: 'var(--adm-bg-card, #fff)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'rgba(100,116,139,0.08)', flexShrink: 0 }}>
            {WEEKDAYS.map(w => <div key={w} style={{ padding: '8px 6px', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center', color: 'var(--adm-text-muted)' }}>{w}</div>)}
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: `repeat(${cells.length / 7}, minmax(0, 1fr))` }}>
            {cells.map((d, idx) => {
              if (d === null) return <div key={idx} style={{ minHeight: 0, overflow: 'hidden', borderTop: '1px solid var(--adm-border)', borderLeft: idx % 7 ? '1px solid var(--adm-border)' : 'none', background: 'rgba(100,116,139,0.04)' }} />;
              const k = iso(year, month, d);
              const e = byDay.get(k)!;
              const isSel = selected === k;
              const has = e.in > 0 || e.out > 0 || e.acc !== 0;
              return (
                <div key={idx} onClick={() => setSelected(k)}
                  style={{ minHeight: 0, overflow: 'hidden', padding: '6px 8px', borderTop: '1px solid var(--adm-border)', borderLeft: idx % 7 ? '1px solid var(--adm-border)' : 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2, background: isSel ? 'rgba(2,132,199,0.10)' : 'transparent', outline: isSel ? '2px solid #0284C7' : 'none', outlineOffset: -2 }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: k === today ? '#fff' : 'var(--adm-text-title)', background: k === today ? '#0284C7' : 'transparent', borderRadius: 999, width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{d}</span>
                  {e.in > 0 && <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#059669' }}>+ {money(e.in)}</span>}
                  {e.out > 0 && <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#E11D48' }}>− {money(e.out)}</span>}
                  {has && <span style={{ marginTop: 'auto', fontSize: '0.62rem', color: 'var(--adm-text-muted)' }}>acum. {money(e.acc)}</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Dia selecionado */}
        <div style={{ minHeight: 0, overflowY: 'auto', border: '1px solid var(--adm-border)', borderRadius: 12, padding: 14, background: 'var(--adm-bg-card, #fff)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!selected ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>Clique em um dia para ver o que entra e o que sai.</div>
          ) : (
            <>
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                  {(() => { const t = new Date(`${selected}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }); return t.charAt(0).toUpperCase() + t.slice(1); })()}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)' }}>{selected.split('-').reverse().join('/')}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {([['Entra', byDay.get(selected)?.in || 0, '#059669', 'rgba(5,150,105,0.10)'], ['Sai', byDay.get(selected)?.out || 0, '#E11D48', 'rgba(225,29,72,0.09)'], ['Acumulado', byDay.get(selected)?.acc || 0, (byDay.get(selected)?.acc || 0) < 0 ? '#E11D48' : '#0369A1', 'rgba(2,132,199,0.09)']] as Array<[string, number, string, string]>).map(([l, v, c, bg]) => (
                  <div key={l} style={{ background: bg, borderRadius: 10, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--adm-text-muted)' }}>{l}</span>
                    <strong style={{ fontSize: '0.8rem', color: c, whiteSpace: 'nowrap' }}>{money(v)}</strong>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#059669', marginBottom: 4 }}>Entradas ({dayInflows.length})</div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {dayInflows.map(i => (
                      <div key={i.id} onClick={() => void openContract(i.contractId)} title="Abrir contrato"
                        style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '7px 8px', borderBottom: '1px dashed var(--adm-border)', fontSize: '0.78rem', cursor: 'pointer', borderRadius: 6 }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(2,132,199,0.07)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: 'block', fontWeight: 700, color: '#0369A1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.title}</span>
                          <span style={{ color: 'var(--adm-text-muted)', fontSize: '0.68rem' }}>{KIND[i.kind] || i.kind}{i.totalSeq > 1 ? ` ${i.seq}/${i.totalSeq}` : ''}{i.paid >= i.amount ? ' · paga' : i.paid > 0 ? ` · recebido ${money2(i.paid)}` : ' · em aberto'}</span>
                        </span>
                        <strong style={{ color: '#059669', whiteSpace: 'nowrap' }}>{money2(i.amount)}</strong>
                      </div>
                    ))}
                    {dayInflows.length === 0 && <span style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)' }}>Nada a receber neste dia.</span>}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#E11D48', marginBottom: 4 }}>Saídas ({dayOutflows.length})</div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {dayOutflows.map(o => (
                      <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '7px 8px', borderBottom: '1px dashed var(--adm-border)', fontSize: '0.78rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--adm-text-title)' }}>{o.description}</span>
                        <strong style={{ color: '#E11D48' }}>{money2(o.amount)}</strong>
                      </div>
                    ))}
                    {dayOutflows.length === 0 && <span style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)' }}>Nenhuma saída lançada neste dia.</span>}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
