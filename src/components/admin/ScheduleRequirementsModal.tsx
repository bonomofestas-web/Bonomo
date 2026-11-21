import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Select } from '../ui';
import type { Lead } from '../../types/admin';
import { SCHEDULE_FIELD_LABELS, type ScheduleFieldKey } from '../../utils/scheduleRequirements';

interface Props {
  lead: Lead;
  missing: ScheduleFieldKey[];
  type: 'visit' | 'tasting';
  onClose: () => void;
  onSave: (patch: Partial<Lead>) => void;
}

const EVENT_TYPES = ['15 Anos', 'Casamento', 'Infantil', 'Formatura', 'Corporativo', 'Outro'];

/** Pede só os dados obrigatórios que faltam antes de abrir o agendamento (visita ou degustação). */
export const ScheduleRequirementsModal: React.FC<Props> = ({ lead, missing, type, onClose, onSave }) => {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const set = (k: string, v: string) => { setVals(p => ({ ...p, [k]: v })); setError(''); };

  const submit = () => {
    for (const k of missing) {
      if (!String(vals[k] || '').trim()) { setError(`Preencha: ${SCHEDULE_FIELD_LABELS[k]}.`); return; }
    }
    const patch: Record<string, any> = {};
    if (vals.eventType) patch.eventType = vals.eventType;
    if (vals.estimatedGuests) patch.estimatedGuests = Number(vals.estimatedGuests);
    if (vals.desiredPeriod) patch.desiredPeriod = vals.desiredPeriod.trim();
    if (vals.eventYear) patch.eventYear = vals.eventYear.trim();
    if (vals.decisionMakers) patch.decisionMakers = vals.decisionMakers.trim();
    if (vals.debutanteName) patch.debutanteName = vals.debutanteName.trim();
    onSave(patch as Partial<Lead>);
  };

  const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--adm-border)', background: 'var(--adm-bg-input)', color: 'var(--adm-text-title)', fontSize: '0.82rem' };
  const label: React.CSSProperties = { display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--adm-text-title)', marginBottom: 5 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: 16, width: '100%', maxWidth: 460, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>Dados para agendar {type === 'visit' ? 'a visita' : 'a degustação'}</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginTop: 2 }}>Sem estes dados não dá para marcar. O resto é opcional.</div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--adm-text-muted)' }}><X size={16} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: '0.74rem' }}>
          <div><span style={label}>Código</span><strong>{(lead as any).code || '-'}</strong></div>
          <div><span style={label}>Nome</span><strong>{lead.name}</strong></div>
          <div><span style={label}>Telefone</span><strong>{lead.phone}</strong></div>
        </div>
        {missing.map(k => (
          <div key={k}>
            <label style={label}>{SCHEDULE_FIELD_LABELS[k]} *</label>
            {k === 'eventType' ? (
              <Select value={vals.eventType || ''} onChange={e => set('eventType', e.target.value)} style={input}>
                <option value="">Selecione</option>
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            ) : (
              <input style={input} type={k === 'estimatedGuests' ? 'number' : 'text'} value={vals[k] || ''} onChange={e => set(k, e.target.value)}
                placeholder={k === 'eventYear' ? 'Ex: 2027' : k === 'desiredPeriod' ? 'Ex: segundo semestre, sábado à noite' : k === 'decisionMakers' ? 'Ex: mãe e pai' : ''} />
            )}
          </div>
        ))}
        {error && <div style={{ fontSize: '0.76rem', color: '#E11D48', fontWeight: 700 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--adm-border)', background: 'transparent', color: 'var(--adm-text-title)', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
          <button type="button" onClick={submit} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--adm-accent)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>Salvar e continuar</button>
        </div>
      </div>
    </div>
  );
};
