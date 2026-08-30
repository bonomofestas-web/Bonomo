import React, { useState, useEffect } from 'react';
import { X, Target, DollarSign, Award, Users, Clock, Check, Building2 } from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import type { Venue, VenueGoals } from '../../types/admin';

interface AdminVenueGoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  venue: Venue | null;
}

export const AdminVenueGoalsModal: React.FC<AdminVenueGoalsModalProps> = ({
  isOpen,
  onClose,
  venue,
}) => {
  const { updateVenue } = useAdminState();

  const [revenueTarget, setRevenueTarget] = useState<number>(150000);
  const [salesTarget, setSalesTarget] = useState<number>(12);
  const [leadsTarget, setLeadsTarget] = useState<number>(60);
  const [responseTimeTargetMinutes, setResponseTimeTargetMinutes] = useState<number>(15);
  const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [deadlineDate, setDeadlineDate] = useState<string>('');

  useEffect(() => {
    if (venue) {
      const g = venue.goals;
      setRevenueTarget(g?.revenueTarget ?? 150000);
      setSalesTarget(g?.salesTarget ?? 12);
      setLeadsTarget(g?.leadsTarget ?? 60);
      setResponseTimeTargetMinutes(g?.responseTimeTargetMinutes ?? 15);
      setPeriod(g?.period ?? 'monthly');
      setDeadlineDate(g?.deadlineDate ?? new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]);
    }
  }, [venue, isOpen]);

  if (!isOpen || !venue) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedGoals: VenueGoals = {
      revenueTarget: Number(revenueTarget) || 150000,
      salesTarget: Number(salesTarget) || 12,
      leadsTarget: Number(leadsTarget) || 60,
      responseTimeTargetMinutes: Number(responseTimeTargetMinutes) || 15,
      period,
      deadlineDate: deadlineDate || undefined,
    };

    updateVenue(venue.id, {
      goals: updatedGoals,
    });

    onClose();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--adm-bg-input)',
    border: '1px solid var(--adm-border)',
    borderRadius: '10px',
    padding: '10px 14px',
    color: 'var(--adm-text-title)',
    fontSize: '0.9rem',
    fontWeight: 700,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.74rem',
    color: 'var(--adm-text-title)',
    fontWeight: 700,
    marginBottom: '6px',
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.78)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '20px',
      animation: 'fadeIn 0.15s ease-out',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <div style={{
        background: 'var(--adm-bg-card)',
        border: '1.5px solid var(--adm-border)',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '520px',
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.8), 0 0 24px rgba(212,175,55,0.15)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--adm-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, var(--adm-bg-card) 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'var(--adm-accent-bg)',
              border: '1px solid var(--adm-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--adm-accent)',
            }}>
              <Target size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building2 size={13} color="var(--adm-accent)" />
                <span style={{ fontSize: '0.72rem', color: 'var(--adm-accent)', fontWeight: 800, textTransform: 'uppercase' }}>
                  {venue.name}
                </span>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: '2px 0 0 0' }}>
                Configuração de Metas da Casa
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--adm-text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Grid 2x2: As 4 Metas Estratégicas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            
            {/* Meta 1: Faturamento */}
            <div style={{
              background: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
              borderRadius: '14px',
              padding: '12px',
            }}>
              <label style={labelStyle}>
                <DollarSign size={15} color="#10B981" />
                <span>Meta de Faturamento (R$)</span>
              </label>
              <input
                type="number"
                min={0}
                step={5000}
                value={revenueTarget}
                onChange={(e) => setRevenueTarget(Number(e.target.value))}
                style={{ ...inputStyle, background: 'var(--adm-bg-card)' }}
              />
              <span style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', display: 'block', marginTop: '4px' }}>
                Faturamento total em contratos
              </span>
            </div>

            {/* Meta 2: Vendas Fechadas */}
            <div style={{
              background: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
              borderRadius: '14px',
              padding: '12px',
            }}>
              <label style={labelStyle}>
                <Award size={15} color="var(--adm-accent)" />
                <span>Meta de Vendas (Contratos)</span>
              </label>
              <input
                type="number"
                min={1}
                value={salesTarget}
                onChange={(e) => setSalesTarget(Number(e.target.value))}
                style={{ ...inputStyle, background: 'var(--adm-bg-card)' }}
              />
              <span style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', display: 'block', marginTop: '4px' }}>
                Total de contratos fechados
              </span>
            </div>

            {/* Meta 3: Leads no Funil */}
            <div style={{
              background: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
              borderRadius: '14px',
              padding: '12px',
            }}>
              <label style={labelStyle}>
                <Users size={15} color="#3B82F6" />
                <span>Meta de Leads / Captação</span>
              </label>
              <input
                type="number"
                min={1}
                value={leadsTarget}
                onChange={(e) => setLeadsTarget(Number(e.target.value))}
                style={{ ...inputStyle, background: 'var(--adm-bg-card)' }}
              />
              <span style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', display: 'block', marginTop: '4px' }}>
                Indicações e novos leads
              </span>
            </div>

            {/* Meta 4: Tempo de Resposta (TMA) */}
            <div style={{
              background: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
              borderRadius: '14px',
              padding: '12px',
            }}>
              <label style={labelStyle}>
                <Clock size={15} color="#F59E0B" />
                <span>Tempo Máximo de Resposta</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={responseTimeTargetMinutes}
                  onChange={(e) => setResponseTimeTargetMinutes(Number(e.target.value))}
                  style={{ ...inputStyle, background: 'var(--adm-bg-card)', flex: 1 }}
                />
                <span style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', fontWeight: 700 }}>min</span>
              </div>
              <span style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', display: 'block', marginTop: '4px' }}>
                Tempo médio do 1º contato
              </span>
            </div>
          </div>

          {/* Periodicidade e Data Limite */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>
                <span>Ciclo / Periodicidade</span>
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as any)}
                style={{ ...inputStyle, fontWeight: 600, fontSize: '0.84rem' }}
              >
                <option value="monthly">Mensal (Padrão)</option>
                <option value="quarterly">Trimestral</option>
                <option value="yearly">Anual</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>
                <span>Data Limite / Fechamento</span>
              </label>
              <input
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                style={{ ...inputStyle, fontSize: '0.84rem' }}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              className="adm-btn-secondary"
              style={{ padding: '10px 18px', borderRadius: '10px', fontSize: '0.84rem', fontWeight: 700 }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="adm-btn-primary"
              style={{
                padding: '10px 22px',
                borderRadius: '10px',
                fontSize: '0.84rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Check size={16} />
              <span>Salvar Metas da Casa</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
