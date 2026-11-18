import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Building2, Save, Sigma } from 'lucide-react';
import { goalsService } from '../../services/goalsService';
import { metricsService } from '../../services/metricsService';
import { getGoalStatus, goalPercent } from '../../utils/goalStatus';
import { useAdminState } from '../../context/AdminStateContext';

type Field = 'revenueTarget' | 'salesTarget' | 'leadsTarget' | 'appointmentsTarget' | 'responseTimeTargetMinutes';
type Draft = Record<Field, number>;

const EMPTY: Draft = { revenueTarget: 0, salesTarget: 0, leadsTarget: 0, appointmentsTarget: 0, responseTimeTargetMinutes: 0 };

const COLUMNS: { key: Field; label: string; money?: boolean }[] = [
  { key: 'revenueTarget', label: 'Faturamento', money: true },
  { key: 'salesTarget', label: 'Contratos' },
  { key: 'leadsTarget', label: 'Leads' },
  { key: 'appointmentsTarget', label: 'Agendamentos' },
  { key: 'responseTimeTargetMinutes', label: 'Resposta (min)' },
];

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const th: React.CSSProperties = {
  textAlign: 'right', padding: '8px 10px', fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase',
  letterSpacing: '0.04em', color: 'var(--adm-text-muted)', borderBottom: '1px solid var(--adm-border)', whiteSpace: 'nowrap',
};
const td: React.CSSProperties = {
  padding: '8px 10px', borderBottom: '1px solid var(--adm-border)', fontVariantNumeric: 'tabular-nums',
  fontSize: '0.8rem', color: 'var(--adm-text-title)', textAlign: 'right', whiteSpace: 'nowrap',
};
const input: React.CSSProperties = {
  width: '108px', padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--adm-border)',
  background: 'var(--adm-bg-input)', color: 'var(--adm-text-title)', textAlign: 'right',
  fontVariantNumeric: 'tabular-nums', fontSize: '0.8rem',
};

/**
 * Metas por unidade do mes corrente (venue_goals). A meta total da rede e a soma
 * das metas das unidades: nao existe campo proprio, entao nunca diverge das unidades.
 */
export const AdminGoalsNetworkPanel: React.FC<{ onSaved?: () => void }> = ({ onSaved }) => {
  const { venues, leads, updateVenue, currentUser } = useAdminState();
  const masterId = currentUser?.masterId || currentUser?.id || '';
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [saved, setSaved] = useState<Record<string, Draft>>({});
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!masterId) { setLoading(false); return; }
    const rows = await goalsService.listVenueGoals(masterId, { year, month });
    const next: Record<string, Draft> = {};
    venues.forEach(v => {
      const r = rows.find(x => x.venueId === v.id && x.period === 'monthly');
      next[v.id] = r
        ? {
            revenueTarget: r.revenueTarget, salesTarget: r.salesTarget, leadsTarget: r.leadsTarget,
            appointmentsTarget: r.appointmentsTarget || 0, responseTimeTargetMinutes: r.responseTimeTargetMinutes,
          }
        : { ...EMPTY };
    });
    setSaved(next);
    setDrafts(next);
    setLoading(false);
  }, [masterId, venues, year, month]);

  useEffect(() => { load(); }, [load]);

  const isDirty = (id: string) => COLUMNS.some(c => (drafts[id]?.[c.key] ?? 0) !== (saved[id]?.[c.key] ?? 0));

  const setValue = (id: string, key: Field, raw: string) => {
    const value = Math.max(0, Number(raw.replace(',', '.')) || 0);
    setDrafts(prev => ({ ...prev, [id]: { ...(prev[id] || EMPTY), [key]: value } }));
  };

  const saveVenue = async (id: string): Promise<boolean> => {
    const d = drafts[id];
    if (!d) return false;
    const ok = await metricsService.upsertVenueGoal({
      masterId, venueId: id,
      revenueTarget: d.revenueTarget, salesTarget: d.salesTarget, leadsTarget: d.leadsTarget,
      appointmentsTarget: d.appointmentsTarget, responseTimeTargetMinutes: d.responseTimeTargetMinutes,
      period: 'monthly', month, year,
    });
    if (!ok) return false;
    updateVenue(id, {
      goals: {
        ...d, period: 'monthly',
        deadlineDate: new Date(year, month, 0).toISOString().split('T')[0],
      },
    });
    setSaved(prev => ({ ...prev, [id]: { ...d } }));
    return true;
  };

  const handleSave = async (id: string) => {
    setSavingId(id);
    const ok = await saveVenue(id);
    setSavingId(null);
    if (ok) { toast.success('Meta da unidade salva.'); onSaved?.(); } else toast.error('Erro ao salvar a meta da unidade.');
  };

  const handleSaveAll = async () => {
    const dirty = venues.filter(v => isDirty(v.id));
    if (dirty.length === 0) return;
    setSavingId('all');
    let failed = 0;
    for (const v of dirty) { if (!(await saveVenue(v.id))) failed += 1; }
    setSavingId(null);
    if (failed) toast.error(`${failed} unidade(s) não foram salvas.`);
    else toast.success('Metas das unidades salvas.');
    onSaved?.();
  };

  // Meta total da rede = soma dos rascunhos (reflete o que esta na tela)
  const total = useMemo<Draft>(() => {
    const t = { ...EMPTY };
    let respSum = 0;
    let respCount = 0;
    venues.forEach(v => {
      const d = drafts[v.id];
      if (!d) return;
      t.revenueTarget += d.revenueTarget;
      t.salesTarget += d.salesTarget;
      t.leadsTarget += d.leadsTarget;
      t.appointmentsTarget += d.appointmentsTarget;
      if (d.responseTimeTargetMinutes > 0) { respSum += d.responseTimeTargetMinutes; respCount += 1; }
    });
    t.responseTimeTargetMinutes = respCount ? Math.round(respSum / respCount) : 0;
    return t;
  }, [drafts, venues]);

  // Realizado no mes por unidade (faturamento e contratos)
  const realized = useMemo(() => {
    const map: Record<string, { revenue: number; closings: number }> = {};
    venues.forEach(v => { map[v.id] = { revenue: 0, closings: 0 }; });
    leads.forEach(l => {
      if (l.stage !== 'contract_signed' || !map[l.venueId]) return;
      const d = new Date(l.contractDate || l.createdAt || '');
      if (Number.isNaN(d.getTime()) || d.getFullYear() !== year || d.getMonth() + 1 !== month) return;
      map[l.venueId].revenue += l.dealValue || 0;
      map[l.venueId].closings += 1;
    });
    return map;
  }, [leads, venues, year, month]);

  const totalRealized = useMemo(
    () => Object.values(realized).reduce((a, r) => ({ revenue: a.revenue + r.revenue, closings: a.closings + r.closings }), { revenue: 0, closings: 0 }),
    [realized],
  );
  const totalPct = goalPercent(totalRealized.revenue, total.revenueTarget);
  const totalStatus = getGoalStatus(totalPct);
  const anyDirty = venues.some(v => isDirty(v.id));

  if (venues.length === 0) return null;

  return (
    <div style={{
      background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '18px',
      padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 900, color: 'var(--adm-text-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={18} /> Metas por unidade e meta total
          </h3>
          <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: 'var(--adm-text-muted)' }}>
            {now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} · a meta total é a soma das metas das unidades
          </p>
        </div>
        <button
          type="button" onClick={handleSaveAll} disabled={!anyDirty || savingId !== null} className="adm-btn-primary"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px',
            fontSize: '0.8rem', fontWeight: 800, opacity: anyDirty && savingId === null ? 1 : 0.5,
          }}
        >
          <Save size={14} /> {savingId === 'all' ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>

      {/* Meta total (soma) */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap', padding: '14px 16px', borderRadius: '14px',
        background: 'var(--adm-bg-input)', border: `1px solid ${totalStatus.color}55`,
      }}>
        <Sigma size={22} color={totalStatus.color} />
        <div style={{ flex: '1 1 220px' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--adm-text-muted)' }}>
            Meta total de faturamento
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--adm-text-title)', fontVariantNumeric: 'tabular-nums' }}>
            {brl(total.revenueTarget)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
            Realizado {brl(totalRealized.revenue)} · {totalRealized.closings} de {total.salesTarget} contratos
          </div>
        </div>
        <div style={{ flex: '1 1 240px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 800, color: totalStatus.color }}>
            <span>{totalStatus.label}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{totalPct === null ? '—' : `${totalPct}%`}</span>
          </div>
          <div style={{ height: '10px', borderRadius: '5px', background: 'rgba(148,163,184,0.2)', marginTop: '6px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, totalPct ?? 0)}%`, height: '100%', background: totalStatus.color, borderRadius: '5px', transition: 'width 0.4s ease' }} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse" style={{ height: '120px', borderRadius: '12px', background: 'var(--adm-bg-input)' }} />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px' }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: 'left' }}>Unidade</th>
                {COLUMNS.map(c => <th key={c.key} style={th}>{c.label}</th>)}
                <th style={th}>Realizado</th>
                <th style={th} />
              </tr>
            </thead>
            <tbody>
              {venues.map(v => {
                const d = drafts[v.id] || EMPTY;
                const r = realized[v.id] || { revenue: 0, closings: 0 };
                const pct = goalPercent(r.revenue, d.revenueTarget);
                const st = getGoalStatus(pct);
                const dirty = isDirty(v.id);
                return (
                  <tr key={v.id}>
                    <td style={{ ...td, textAlign: 'left', fontWeight: 800 }}>{v.name}</td>
                    {COLUMNS.map(c => (
                      <td key={c.key} style={td}>
                        <input
                          type="number" min={0} inputMode="decimal" value={d[c.key] || ''} placeholder="0"
                          onChange={e => setValue(v.id, c.key, e.target.value)} style={input}
                          aria-label={`${c.label} de ${v.name}`}
                        />
                      </td>
                    ))}
                    <td style={{ ...td, color: st.color, fontWeight: 800 }}>
                      {pct === null ? '—' : `${pct}%`}
                      <div style={{ fontSize: '0.64rem', fontWeight: 600, color: 'var(--adm-text-muted)' }}>{brl(r.revenue)}</div>
                    </td>
                    <td style={td}>
                      <button
                        type="button" onClick={() => handleSave(v.id)} disabled={!dirty || savingId !== null}
                        className="adm-btn-secondary"
                        style={{ padding: '5px 10px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700, opacity: dirty ? 1 : 0.45 }}
                      >
                        {savingId === v.id ? 'Salvando...' : 'Salvar'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ ...td, textAlign: 'left', fontWeight: 900 }}>Total da rede</td>
                {COLUMNS.map(c => (
                  <td key={c.key} style={{ ...td, fontWeight: 900 }}>
                    {c.key === 'revenueTarget' ? brl(total[c.key]) : total[c.key].toLocaleString('pt-BR')}
                    {c.key === 'responseTimeTargetMinutes' && <div style={{ fontSize: '0.62rem', fontWeight: 600, color: 'var(--adm-text-muted)' }}>média</div>}
                  </td>
                ))}
                <td style={{ ...td, fontWeight: 900, color: totalStatus.color }}>{totalPct === null ? '—' : `${totalPct}%`}</td>
                <td style={td} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};
