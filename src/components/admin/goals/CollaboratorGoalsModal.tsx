import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Check, Search, Sparkles } from 'lucide-react';
import { GOAL_GROUPS, GOAL_METRICS, periodTarget, suggestedMetrics, type CollaboratorGoal, type GoalPeriod } from '../../../services/goalPlanService';
import type { GoalMetricKey } from '../../../utils/goalActuals';
import type { Collaborator, Venue } from '../../../types/admin';
import type { FunnelMemberRoles } from '../../../utils/funnelResponsibility';
import { MetricChip, Modal, Toggle, UnitBadge, eyebrow, formatMetricValue, unitSuffix, METRIC_COLOR } from './GoalUi';

interface Props {
  venue?: Venue;
  collaborators: Collaborator[];
  rolesById: Record<string, FunnelMemberRoles>;
  period: GoalPeriod;
  goals: CollaboratorGoal[];
  initialCollaboratorId?: string;
  onClose: () => void;
  onSave: (collaboratorId: string, rows: { metric: GoalMetricKey; value: number }[], isRecurring: boolean, activateNow: boolean) => Promise<void>;
}

interface Row { checked: boolean; value: string }
const emptyRows = (): Record<GoalMetricKey, Row> => Object.fromEntries(GOAL_METRICS.map(m => [m.key, { checked: false, value: '' }])) as Record<GoalMetricKey, Row>;

const roleLabel = (r?: FunnelMemberRoles) => (r?.sdr && r?.closer ? 'SDR e Closer' : r?.closer ? 'Closer' : 'SDR');

export const CollaboratorGoalsModal: React.FC<Props> = ({ venue, collaborators, rolesById, period, goals, initialCollaboratorId, onClose, onSave }) => {
  const [collabId, setCollabId] = useState<string | null>(initialCollaboratorId || null);
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<Record<GoalMetricKey, Row>>(emptyRows);
  const [isRecurring, setIsRecurring] = useState(true);
  const [activateNow, setActivateNow] = useState(true);
  const [saving, setSaving] = useState(false);

  const collab = collaborators.find(c => c.id === collabId) || null;

  // Ao escolher a pessoa, carrega o que ela ja tem; sem metas, sugere pelo papel
  useEffect(() => {
    if (!collab) return;
    const mine = goals.filter(g => g.collaboratorId === collab.id && g.periodId === period.id);
    const next = emptyRows();
    mine.forEach(g => { next[g.metric] = { checked: true, value: String(g.targetValue) }; });
    if (mine.length === 0) suggestedMetrics(rolesById[collab.id] || {}).forEach(k => { next[k].checked = true; });
    else setIsRecurring(mine.every(g => g.isRecurring));
    setRows(next);
  }, [collab, goals, period.id, rolesById]);

  /** Saldo da unidade para uma meta de volume (null = metas de taxa e tempo, sem teto). */
  const available = (key: GoalMetricKey): number | null => {
    const def = GOAL_METRICS.find(m => m.key === key);
    if (!def?.additive || !collab) return null;
    const others = goals
      .filter(g => g.periodId === period.id && g.metric === key && g.collaboratorId !== collab.id && g.status !== 'closed')
      .reduce((s, g) => s + g.targetValue, 0);
    return Math.max(0, periodTarget(period, key) - others);
  };

  const filtered = useMemo(() => collaborators.filter(c => c.name.toLowerCase().includes(query.trim().toLowerCase())), [collaborators, query]);
  const checkedCount = GOAL_METRICS.filter(m => rows[m.key].checked).length;
  const allChecked = checkedCount === GOAL_METRICS.length;

  const submit = async () => {
    if (!collab) return;
    const out: { metric: GoalMetricKey; value: number }[] = [];
    for (const m of GOAL_METRICS) {
      if (!rows[m.key].checked) continue;
      const v = Number(rows[m.key].value);
      if (!Number.isFinite(v) || v <= 0) { toast.warning(`${m.label}: informe um valor maior que zero.`); return; }
      if (m.unit === 'percent' && v > 100) { toast.warning(`${m.label}: a taxa não pode passar de 100%.`); return; }
      const cap = available(m.key);
      if (cap !== null && v > cap) {
        toast.error(`${m.label}: o máximo disponível é ${formatMetricValue(m.key, cap)} (meta da unidade menos o já distribuído).`);
        return;
      }
      out.push({ metric: m.key, value: v });
    }
    setSaving(true);
    await onSave(collab.id, out, isRecurring, activateNow);
    setSaving(false);
  };

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
      <UnitBadge venue={venue} subtitle={`${new Date(`${period.startsOn}T12:00:00`).toLocaleDateString('pt-BR')} a ${new Date(`${period.endsOn}T12:00:00`).toLocaleDateString('pt-BR')}`} />
      {collab && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
          {collab.name} <span style={eyebrow}>{roleLabel(rolesById[collab.id])}</span>
        </span>
      )}
    </div>
  );

  return (
    <Modal
      title={collab ? 'Metas do colaborador' : 'Escolher colaborador'}
      header={header}
      onClose={onClose}
      width={680}
      footer={collab ? (
        <>
          {initialCollaboratorId
            ? <button type="button" onClick={onClose} className="adm-btn-secondary" style={{ padding: '9px 16px', borderRadius: '10px', fontWeight: 700 }}>Cancelar</button>
            : <button type="button" onClick={() => setCollabId(null)} className="adm-btn-secondary" style={{ padding: '9px 16px', borderRadius: '10px', fontWeight: 700 }}>Voltar</button>}
          <button type="button" onClick={submit} disabled={saving} className="adm-btn-primary" style={{ padding: '9px 22px', borderRadius: '10px', fontWeight: 800, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Salvando...' : 'Salvar metas'}
          </button>
        </>
      ) : <button type="button" onClick={onClose} className="adm-btn-secondary" style={{ padding: '9px 16px', borderRadius: '10px', fontWeight: 700 }}>Fechar</button>}
    >
      {!collab ? (
        <>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--adm-text-muted)' }} />
            <input className="adm-input" placeholder="Buscar colaborador" value={query} onChange={e => setQuery(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', height: '38px', borderRadius: '10px', paddingLeft: '34px' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {filtered.length === 0 && <span style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>Nenhum SDR ou Closer encontrado nesta unidade.</span>}
            {filtered.map(c => {
              const has = goals.filter(g => g.collaboratorId === c.id && g.periodId === period.id).length;
              return (
                <button key={c.id} type="button" onClick={() => setCollabId(c.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
                  border: '1px solid var(--adm-border)', background: 'var(--adm-bg-input)',
                }}>
                  <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--adm-accent-bg)', color: 'var(--adm-accent)', fontWeight: 800, fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {c.avatarUrl ? <img src={c.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : c.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span style={{ flex: 1, fontSize: '0.84rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>{c.name}</span>
                  <span style={eyebrow}>{roleLabel(rolesById[c.id])}</span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: has ? '#10B981' : 'var(--adm-text-muted)' }}>{has ? `${has} ${has === 1 ? 'meta' : 'metas'}` : 'Sem metas'}</span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>Marque só as metas que quer para {collab.name.split(' ')[0]}.</span>
            <button type="button" onClick={() => setRows(prev => Object.fromEntries(GOAL_METRICS.map(m => [m.key, { ...prev[m.key], checked: !allChecked }])) as Record<GoalMetricKey, Row>)} style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '999px', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer',
              border: '1px solid var(--adm-accent)', background: allChecked ? 'var(--adm-accent)' : 'var(--adm-accent-bg)', color: allChecked ? '#0B111A' : 'var(--adm-text-title)',
            }}>
              <Sparkles size={13} /> {allChecked ? 'Limpar' : 'Todas as metas'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {GOAL_GROUPS.map(g => (
              <React.Fragment key={g.id}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
                  <span style={eyebrow}>{g.label}</span>
                  <span style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>{g.hint}</span>
                </div>
                {GOAL_METRICS.filter(m => m.group === g.id).map(m => {
              const row = rows[m.key];
              const cap = available(m.key);
              const unitTarget = periodTarget(period, m.key);
              const blocked = m.additive && unitTarget <= 0;
              const color = METRIC_COLOR[m.key];
              return (
                <div key={m.key} style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '14px', opacity: blocked ? 0.55 : 1,
                  border: `1.5px solid ${row.checked ? color : 'var(--adm-border)'}`, background: row.checked ? `${color}12` : 'var(--adm-bg-input)',
                }}>
                  <button type="button" disabled={blocked} aria-pressed={row.checked} aria-label={m.label}
                    onClick={() => setRows(r => ({ ...r, [m.key]: { ...r[m.key], checked: !r[m.key].checked } }))}
                    style={{
                      width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0, cursor: blocked ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      border: `2px solid ${row.checked ? color : 'var(--adm-border)'}`, background: row.checked ? color : 'transparent',
                    }}>
                    {row.checked && <Check size={12} color="#fff" strokeWidth={3} />}
                  </button>
                  <MetricChip metric={m.key} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>{m.label}</div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>
                      {blocked
                        ? 'Defina antes a meta da unidade para esta métrica'
                        : cap !== null
                          ? `Disponível na unidade: ${formatMetricValue(m.key, cap)}`
                          : unitTarget > 0
                            ? `Meta da unidade: ${formatMetricValue(m.key, unitTarget)}`
                            : m.lowerIsBetter ? 'Menor é melhor' : 'Meta individual'}
                    </div>
                  </div>
                  {row.checked && (
                    <span style={{ position: 'relative', width: '140px', flexShrink: 0 }}>
                      <input className="adm-input" type="number" min={0} step="any" inputMode="decimal" autoFocus={false}
                        value={row.value} onChange={e => setRows(r => ({ ...r, [m.key]: { ...r[m.key], value: e.target.value } }))}
                        style={{ width: '100%', boxSizing: 'border-box', height: '36px', borderRadius: '10px', paddingRight: '42px' }} />
                      <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.68rem', fontWeight: 700, color: 'var(--adm-text-muted)', pointerEvents: 'none' }}>{unitSuffix(m.unit)}</span>
                    </span>
                  )}
                </div>
              );
                })}
              </React.Fragment>
            ))}
          </div>

          <Toggle checked={isRecurring} onChange={setIsRecurring} label="Repetir todo período"
            hint="Na virada o resultado é salvo e a meta continua ativa. Desligado, ela fica pendente para você reconfigurar." />
          <Toggle checked={activateNow} onChange={setActivateNow} label="Ativar agora" hint="Desligado, as metas ficam pendentes até você ativar." />
        </>
      )}
    </Modal>
  );
};
