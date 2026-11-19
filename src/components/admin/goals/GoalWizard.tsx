import { DateRangeField } from '../../ui';
import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Building2, CalendarRange, Check, ChevronRight, Sparkles } from 'lucide-react';
import {
  GOAL_GROUPS, GOAL_METRICS, GOAL_METRIC_LABEL, endForKind, fromISO, periodTarget, toISO, type GoalMetricDef, type GoalPeriod, type GoalPeriodKind,
} from '../../../services/goalPlanService';
import type { GoalMetricKey } from '../../../utils/goalActuals';
import type { Venue } from '../../../types/admin';
import {
  MetricChip, MetricPickerCard, Modal, Toggle, UnitBadge, eyebrow, formatMetricValue, unitSuffix,
} from './GoalUi';

export interface WizardResult {
  venueId: string;
  kind: GoalPeriodKind;
  startsOn: string;
  endsOn: string;
  isRecurring: boolean;
  activateNow: boolean;
  /** Metas escolhidas (valor > 0). Metas desmarcadas na edicao voltam para 0. */
  targets: Partial<Record<GoalMetricKey, number>>;
}

interface Props {
  venues: Venue[];
  /** Unidade ja escolhida na tela de Metas: o assistente nao pergunta de novo (fica presa). Sem ela, mostra o overview para escolher. */
  lockedVenueId?: string;
  /** Edicao: unidade e periodo ficam fixos; so as metas e a recorrencia mudam. */
  editing?: GoalPeriod;
  /** Quanto ja foi distribuido aos colaboradores (a meta da unidade nao pode ficar abaixo). */
  distributed?: Partial<Record<GoalMetricKey, number>>;
  onClose: () => void;
  onSubmit: (r: WizardResult) => Promise<void>;
}

type PresetId = 'this_month' | 'next_month' | 'quarter' | 'semester' | 'custom';

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const fmtBR = (iso: string) => fromISO(iso).toLocaleDateString('pt-BR');
const monthStart = (offset: number) => { const n = new Date(); return toISO(new Date(n.getFullYear(), n.getMonth() + offset, 1)); };

const PRESETS: { id: PresetId; title: string; kind: GoalPeriodKind; start: () => string }[] = [
  { id: 'this_month', title: 'Este mês', kind: 'monthly', start: () => monthStart(0) },
  { id: 'next_month', title: 'Próximo mês', kind: 'monthly', start: () => monthStart(1) },
  { id: 'quarter', title: 'Trimestre', kind: 'quarterly', start: () => monthStart(0) },
  { id: 'semester', title: 'Semestre', kind: 'semiannual', start: () => monthStart(0) },
  { id: 'custom', title: 'Outro período', kind: 'custom', start: () => monthStart(0) },
];

const describePeriod = (kind: GoalPeriodKind, startsOn: string, endsOn: string): string => {
  const s = fromISO(startsOn);
  if (kind === 'monthly') return `${MONTHS[s.getMonth()].replace(/^./, c => c.toUpperCase())} de ${s.getFullYear()}`;
  return `${fmtBR(startsOn)} a ${fmtBR(endsOn)}`;
};

export const GoalWizard: React.FC<Props> = ({ venues, lockedVenueId, editing, distributed = {}, onClose, onSubmit }) => {
  const isEdit = Boolean(editing);
  const [step, setStep] = useState<1 | 2 | 3>(isEdit ? 2 : 1);
  const [venueId, setVenueId] = useState(editing?.venueId || lockedVenueId || '');
  const isLocked = Boolean(editing || lockedVenueId);
  const [preset, setPreset] = useState<PresetId>('this_month');
  const [customStart, setCustomStart] = useState(monthStart(0));
  const [customEnd, setCustomEnd] = useState(endForKind(monthStart(0), 'monthly'));
  const [selected, setSelected] = useState<Set<GoalMetricKey>>(() => new Set(
    editing ? GOAL_METRICS.filter(m => periodTarget(editing, m.key) > 0).map(m => m.key) : [],
  ));
  const [values, setValues] = useState<Partial<Record<GoalMetricKey, string>>>(() => {
    const init: Partial<Record<GoalMetricKey, string>> = {};
    if (editing) GOAL_METRICS.forEach(m => { const t = periodTarget(editing, m.key); if (t > 0) init[m.key] = String(t); });
    return init;
  });
  const [isRecurring, setIsRecurring] = useState(editing ? editing.isRecurring : true);
  const [activateNow, setActivateNow] = useState(true);
  const [saving, setSaving] = useState(false);

  const venue = venues.find(v => v.id === venueId);

  const period = useMemo(() => {
    if (editing) return { kind: editing.kind, startsOn: editing.startsOn, endsOn: editing.endsOn };
    const def = PRESETS.find(p => p.id === preset) as (typeof PRESETS)[number];
    if (def.kind === 'custom') return { kind: 'custom' as GoalPeriodKind, startsOn: customStart, endsOn: customEnd };
    const startsOn = def.start();
    return { kind: def.kind, startsOn, endsOn: endForKind(startsOn, def.kind) };
  }, [editing, preset, customStart, customEnd]);

  const toggle = (key: GoalMetricKey) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const allSelected = selected.size === GOAL_METRICS.length;

  const goNext = () => {
    if (step === 1) {
      if (!venueId) { toast.warning('Escolha a unidade para continuar.'); return; }
      if (period.endsOn < period.startsOn) { toast.warning('Confira as datas: o fim não pode ser antes do início.'); return; }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (selected.size === 0 && !isEdit) { toast.warning('Escolha ao menos uma meta.'); return; }
      setStep(3);
    }
  };

  const submit = async () => {
    const targets: Partial<Record<GoalMetricKey, number>> = {};
    for (const m of GOAL_METRICS) {
      if (!selected.has(m.key)) {
        // Meta desmarcada na edicao volta para 0, mas nao pode ter saldo ja distribuido
        if (isEdit && (distributed[m.key] || 0) > 0) {
          toast.error(`${GOAL_METRIC_LABEL[m.key]}: já existe valor distribuído aos colaboradores. Remova as metas individuais antes.`);
          return;
        }
        continue;
      }
      const v = Number(values[m.key]);
      if (!Number.isFinite(v) || v <= 0) { toast.warning(`${m.label}: informe um valor maior que zero.`); return; }
      if (m.unit === 'percent' && v > 100) { toast.warning(`${m.label}: a taxa não pode passar de 100%.`); return; }
      if (m.additive && v < (distributed[m.key] || 0)) {
        toast.error(`${m.label}: a meta da unidade não pode ficar abaixo do que já foi distribuído (${formatMetricValue(m.key, distributed[m.key] || 0)}).`);
        return;
      }
      targets[m.key] = v;
    }
    setSaving(true);
    await onSubmit({ venueId, kind: period.kind, startsOn: period.startsOn, endsOn: period.endsOn, isRecurring, activateNow, targets });
    setSaving(false);
  };

  const steps = isEdit ? [{ n: 2, label: 'Metas' }, { n: 3, label: 'Valores' }] : [{ n: 1, label: isLocked ? 'Período' : 'Unidade e período' }, { n: 2, label: 'Quais metas' }, { n: 3, label: 'Valores' }];

  const header = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <UnitBadge venue={venue} subtitle={step > 1 || isEdit ? describePeriod(period.kind, period.startsOn, period.endsOn) : 'Defina a unidade e o período'} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {steps.map((s, i) => {
          const done = s.n < step;
          const active = s.n === step;
          return (
            <React.Fragment key={s.n}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                <span style={{
                  width: '22px', height: '22px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800,
                  background: active || done ? 'var(--adm-accent)' : 'var(--adm-bg-input)', color: active || done ? '#0B111A' : 'var(--adm-text-muted)',
                  border: `1px solid ${active || done ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                }}>{done ? <Check size={12} strokeWidth={3} /> : i + 1}</span>
                <span style={{ fontSize: '0.74rem', fontWeight: active ? 800 : 600, color: active ? 'var(--adm-text-title)' : 'var(--adm-text-muted)' }}>{s.label}</span>
              </span>
              {i < steps.length - 1 && <ChevronRight size={14} color="var(--adm-text-muted)" />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );

  const selectedDefs: GoalMetricDef[] = GOAL_METRICS.filter(m => selected.has(m.key));

  return (
    <Modal
      title={isEdit ? 'Editar metas da unidade' : 'Nova meta da unidade'}
      header={header}
      onClose={onClose}
      width={640}
      footer={
        <>
          <button
            type="button" className="adm-btn-secondary" style={{ padding: '9px 16px', borderRadius: '10px', fontWeight: 700 }}
            onClick={() => (step === 1 || (isEdit && step === 2) ? onClose() : setStep((step - 1) as 1 | 2))}
          >
            {step === 1 || (isEdit && step === 2) ? 'Cancelar' : 'Voltar'}
          </button>
          {step < 3 ? (
            <button type="button" className="adm-btn-primary" onClick={goNext} style={{ padding: '9px 22px', borderRadius: '10px', fontWeight: 800 }}>Continuar</button>
          ) : (
            <button type="button" className="adm-btn-primary" onClick={submit} disabled={saving} style={{ padding: '9px 22px', borderRadius: '10px', fontWeight: 800, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Salvando...' : isEdit ? 'Salvar metas' : 'Criar metas'}
            </button>
          )}
        </>
      }
    >
      {step === 1 && (
        <>
          {!isLocked && (
            <div>
              <span style={eyebrow}>Unidade</span>
              {venueId ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginTop: '8px', padding: '10px 12px', borderRadius: '12px', border: '1.5px solid var(--adm-accent)', background: 'var(--adm-accent-bg)' }}>
                  <UnitBadge venue={venue} subtitle="Unidade escolhida" />
                  <button type="button" onClick={() => setVenueId('')} style={{ background: 'transparent', border: 'none', color: 'var(--adm-accent)', fontWeight: 800, fontSize: '0.74rem', cursor: 'pointer' }}>Trocar</button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginTop: '8px' }}>
                  {venues.map(v => (
                    <button key={v.id} type="button" onClick={() => setVenueId(v.id)} style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
                      border: '1.5px solid var(--adm-border)', background: 'var(--adm-bg-input)',
                    }}>
                      <UnitBadge venue={v} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <span style={eyebrow}>Período</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px', marginTop: '8px' }}>
              {PRESETS.map(p => {
                const start = p.id === 'custom' ? customStart : p.start();
                const end = p.id === 'custom' ? customEnd : endForKind(start, p.kind as Exclude<GoalPeriodKind, 'custom'>);
                const active = preset === p.id;
                return (
                  <button key={p.id} type="button" onClick={() => setPreset(p.id)} aria-pressed={active} style={{
                    display: 'flex', flexDirection: 'column', gap: '3px', textAlign: 'left', padding: '12px 14px', borderRadius: '12px', cursor: 'pointer',
                    border: `1.5px solid ${active ? 'var(--adm-accent)' : 'var(--adm-border)'}`, background: active ? 'var(--adm-accent-bg)' : 'var(--adm-bg-input)',
                  }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '0.86rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                      <CalendarRange size={14} color="var(--adm-accent)" /> {p.title}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)' }}>{p.id === 'custom' ? 'Você escolhe as datas' : describePeriod(p.kind, start, end)}</span>
                  </button>
                );
              })}
            </div>
            {preset === 'custom' && (
              <div style={{ marginTop: '10px' }}>
                <DateRangeField
                  className="adm-input" style={{ height: '40px', borderRadius: '10px', width: '100%' }}
                  start={customStart} end={customEnd} aria-label="Período personalizado"
                  onChange={(a, b) => { setCustomStart(a); setCustomEnd(b); }}
                />
              </div>
            )}
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>Escolha só o que faz sentido. Dá para criar apenas a meta de faturamento.</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={() => setSelected(new Set(allSelected ? [] : GOAL_METRICS.map(m => m.key)))} style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '999px', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer',
                border: '1px solid var(--adm-accent)', background: allSelected ? 'var(--adm-accent)' : 'var(--adm-accent-bg)', color: allSelected ? '#0B111A' : 'var(--adm-text-title)',
              }}>
                <Sparkles size={13} /> {allSelected ? 'Limpar' : 'Todas as metas'}
              </button>
            </div>
          </div>
          {GOAL_GROUPS.map(g => (
            <div key={g.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={eyebrow}>{g.label}</span>
                <span style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>{g.hint}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                {GOAL_METRICS.filter(m => m.group === g.id).map(m => (
                  <MetricPickerCard key={m.key} def={m} selected={selected.has(m.key)} onToggle={() => toggle(m.key)} />
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {step === 3 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '12px', background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', fontSize: '0.78rem', color: 'var(--adm-text-title)' }}>
            <Building2 size={15} color="var(--adm-accent)" />
            <span><strong>{venue?.name}</strong> · {describePeriod(period.kind, period.startsOn, period.endsOn)} · {selectedDefs.length} {selectedDefs.length === 1 ? 'meta' : 'metas'}</span>
          </div>

          {selectedDefs.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>Nenhuma meta selecionada: as metas atuais da unidade serão zeradas.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {selectedDefs.map(m => {
                const dist = distributed[m.key] || 0;
                return (
                  <label key={m.key} style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '12px',
                    border: '1px solid var(--adm-border)', background: 'var(--adm-bg-input)',
                  }}>
                    <MetricChip metric={m.key} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>{m.label}</span>
                      <span style={{ display: 'block', fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>
                        {m.lowerIsBetter ? 'Menor é melhor. Defina o tempo máximo.' : m.additive ? 'Soma das metas dos colaboradores não passa daqui.' : 'Meta de taxa, individual por colaborador.'}
                        {isEdit && dist > 0 ? ` Já distribuído: ${formatMetricValue(m.key, dist)}.` : ''}
                      </span>
                    </span>
                    <span style={{ position: 'relative', width: '150px', flexShrink: 0 }}>
                      <input
                        className="adm-input" type="number" min={0} step="any" inputMode="decimal"
                        value={values[m.key] ?? ''} onChange={e => setValues(prev => ({ ...prev, [m.key]: e.target.value }))}
                        style={{ width: '100%', boxSizing: 'border-box', height: '38px', borderRadius: '10px', paddingRight: '44px' }}
                      />
                      <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--adm-text-muted)', pointerEvents: 'none' }}>
                        {unitSuffix(m.unit)}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          <Toggle checked={isRecurring} onChange={setIsRecurring} label="Repetir todo período"
            hint="Na virada o resultado é salvo e o próximo período começa com as mesmas metas. Desligado, o próximo fica pendente para você reconfigurar." />
          {!isEdit && <Toggle checked={activateNow} onChange={setActivateNow} label="Ativar agora" hint="Desligado, as metas ficam pendentes até você ativar." />}
        </>
      )}
    </Modal>
  );
};
