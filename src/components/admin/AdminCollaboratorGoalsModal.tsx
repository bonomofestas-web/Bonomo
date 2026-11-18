import React, { useState } from 'react';
import { Target, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminState } from '../../context/AdminStateContext';
import { goalsService } from '../../services/goalsService';
import type { Collaborator, CollaboratorGoals } from '../../types/admin';

interface Props {
  collaborator: Collaborator;
  onClose: () => void;
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.72rem',
  fontWeight: 800,
  color: 'var(--adm-text-title)',
  marginBottom: '6px',
};

const inputStyle: React.CSSProperties = { width: '100%', height: '40px', borderRadius: '10px', fontSize: '0.84rem' };

export const AdminCollaboratorGoalsModal: React.FC<Props> = ({ collaborator, onClose }) => {
  const { currentUser, updateCollaborator } = useAdminState();
  const masterId = currentUser?.masterId || currentUser?.id || '';
  const g = collaborator.goals;

  const [cycle, setCycle] = useState<'monthly' | 'weekly'>(g?.cycle || 'monthly');
  const [revenue, setRevenue] = useState(String(g?.revenueTarget ?? ''));
  const [leads, setLeads] = useState(String(g?.leadsTarget ?? ''));
  const [closings, setClosings] = useState(String(g?.closingsTarget ?? ''));
  const [response, setResponse] = useState(String(g?.responseTimeTargetMinutes ?? ''));
  const [validFrom, setValidFrom] = useState(g?.validFrom || '');
  const [validUntil, setValidUntil] = useState(g?.validUntil || '');
  const [saving, setSaving] = useState(false);

  const toNum = (v: string) => (v.trim() === '' ? undefined : Number(v));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const nums = [toNum(revenue), toNum(leads), toNum(closings), toNum(response)];
    if (nums.some(n => n !== undefined && (!Number.isFinite(n) || n < 0))) {
      toast.warning('Use apenas valores numéricos iguais ou maiores que zero.');
      return;
    }
    if (validFrom && validUntil && validUntil < validFrom) {
      toast.warning('A data final deve ser igual ou posterior à data inicial.');
      return;
    }
    if (!masterId) {
      toast.error('Não foi possível identificar a conta Master.');
      return;
    }

    const goals: CollaboratorGoals = {
      cycle,
      revenueTarget: nums[0],
      leadsTarget: nums[1],
      closingsTarget: nums[2],
      responseTimeTargetMinutes: nums[3],
      validFrom: validFrom || undefined,
      validUntil: validUntil || undefined,
    };

    setSaving(true);
    const ok = await goalsService.saveCollaboratorGoals(masterId, collaborator.id, goals);
    setSaving(false);

    if (!ok) {
      toast.error('Erro ao salvar a meta individual. Verifique se a migration de metas foi aplicada.');
      return;
    }
    updateCollaborator(collaborator.id, { goals });
    toast.success(`Meta de ${collaborator.name} salva.`);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px',
    }}>
      <form onSubmit={handleSave} style={{
        background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '18px',
        maxWidth: '520px', width: '100%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={18} color="var(--adm-accent)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
              Meta individual — {collaborator.name}
            </h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar"
            style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div>
          <label style={labelStyle}>Ciclo</label>
          <select value={cycle} onChange={e => setCycle(e.target.value as 'monthly' | 'weekly')} className="adm-input" style={inputStyle}>
            <option value="monthly">Mensal</option>
            <option value="weekly">Semanal</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Faturamento (R$)</label>
            <input type="number" min="0" value={revenue} onChange={e => setRevenue(e.target.value)} className="adm-input" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Leads / agendamentos</label>
            <input type="number" min="0" value={leads} onChange={e => setLeads(e.target.value)} className="adm-input" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Fechamentos</label>
            <input type="number" min="0" value={closings} onChange={e => setClosings(e.target.value)} className="adm-input" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>1ª resposta máx. (min)</label>
            <input type="number" min="0" value={response} onChange={e => setResponse(e.target.value)} className="adm-input" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Válida a partir de</label>
            <input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} className="adm-input" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Válida até</label>
            <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="adm-input" style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" onClick={onClose} className="adm-btn-secondary"
            style={{ padding: '9px 16px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700 }}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="adm-btn-primary"
            style={{ padding: '9px 20px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 800, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Salvando...' : 'Salvar meta'}
          </button>
        </div>
      </form>
    </div>
  );
};
