import React, { useState } from 'react';
import { X, Target, Check } from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';

interface AdminLeadGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminLeadGoalModal: React.FC<AdminLeadGoalModalProps> = ({ isOpen, onClose }) => {
  const { leadGoal, setLeadGoal } = useAdminState();

  const [target, setTarget] = useState<number>(leadGoal?.target || 30);
  const [deadline, setDeadline] = useState<string>(
    leadGoal?.deadline || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  );
  const [title, setTitle] = useState<string>(leadGoal?.title || 'Meta de Leads & Indicações no Funil');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!target || target <= 0) return;

    setLeadGoal({
      target: Number(target),
      deadline: deadline || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
      title: title.trim() || 'Meta de Leads no Funil',
    });

    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
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
        borderRadius: '20px',
        width: '100%',
        maxWidth: '440px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 24px rgba(212,175,55,0.15)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid var(--adm-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(212,175,55,0.1) 0%, var(--adm-bg-card) 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--adm-accent-bg)',
              border: '1px solid var(--adm-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--adm-accent)',
            }}>
              <Target size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                Configurar Meta do Funil
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', margin: '2px 0 0 0' }}>
                Defina o objetivo e prazo para a equipe
              </p>
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

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-title)', marginBottom: '6px' }}>
              Título da Meta
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Meta Mensal de Leads no Funil"
              className="adm-input"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                fontSize: '0.84rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-title)', marginBottom: '6px' }}>
                Quantidade de Leads
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  min={1}
                  max={5000}
                  value={target}
                  onChange={(e) => setTarget(Number(e.target.value))}
                  className="adm-input"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '0.94rem',
                    fontWeight: 800,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-title)', marginBottom: '6px' }}>
                Prazo / Data Limite
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="adm-input"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '0.84rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Quick presets */}
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Atalhos Rápidos
            </span>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              {[20, 30, 50, 100].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTarget(preset)}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    borderRadius: '8px',
                    background: target === preset ? 'var(--adm-accent-bg)' : 'var(--adm-bg-input)',
                    border: `1px solid ${target === preset ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                    color: target === preset ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {preset} leads
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="adm-btn-secondary"
              style={{ padding: '9px 18px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 700 }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="adm-btn-primary"
              style={{
                padding: '9px 20px',
                borderRadius: '10px',
                fontSize: '0.82rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Check size={16} />
              <span>Salvar Meta</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
