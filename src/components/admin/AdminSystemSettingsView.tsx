import React, { useState } from 'react';
import { Building2, ShieldCheck, Settings } from 'lucide-react';
import { AdminVenuesView } from './AdminVenuesView';
import { AdminCollaboratorsView } from './AdminCollaboratorsView';

interface AdminSystemSettingsViewProps {
  initialSection?: 'unidades' | 'colaboradores';
  onNavigateTab?: (tab: string) => void;
  onNavigateToFunnel?: (funnelId: string) => void;
}

export const AdminSystemSettingsView: React.FC<AdminSystemSettingsViewProps> = ({
  initialSection = 'unidades',
  onNavigateTab,
  onNavigateToFunnel,
}) => {
  const [activeSection, setActiveSection] = useState<'unidades' | 'colaboradores'>(initialSection);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: 0,
      width: '100%',
      background: 'var(--adm-bg-app, #0F172A)',
      overflow: 'hidden',
    }}>
      {/* Header com Navegação de Abas da Configuração */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--adm-border, rgba(255, 255, 255, 0.08))',
        background: 'var(--adm-bg-card, #141118)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(212, 175, 55, 0.12)',
            border: '1.5px solid rgba(212, 175, 55, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#D4AF37',
          }}>
            <Settings size={18} />
          </div>
          <div>
            <div style={{
              fontSize: '0.66rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              color: '#D4AF37',
              letterSpacing: '0.8px',
            }}>
              Configurações do Sistema
            </div>
            <div style={{
              fontSize: '1.05rem',
              fontWeight: 800,
              color: 'var(--adm-text-title, #FFFFFF)',
            }}>
              Unidades e Colaboradores
            </div>
          </div>
        </div>

        {/* Abas Superiores: Unidade e Colaborador */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'var(--adm-bg-surface, rgba(255, 255, 255, 0.04))',
          padding: '4px',
          borderRadius: '12px',
          border: '1px solid var(--adm-border, rgba(255, 255, 255, 0.08))',
        }}>
          <button
            type="button"
            onClick={() => setActiveSection('unidades')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '9px',
              border: activeSection === 'unidades' ? '1px solid #D4AF37' : '1px solid transparent',
              background: activeSection === 'unidades' ? 'rgba(212, 175, 55, 0.16)' : 'transparent',
              color: activeSection === 'unidades' ? '#D4AF37' : 'var(--adm-text-muted, #94A3B8)',
              fontSize: '0.80rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Building2 size={15} />
            <span>Unidades</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('colaboradores')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '9px',
              border: activeSection === 'colaboradores' ? '1px solid #14A9D7' : '1px solid transparent',
              background: activeSection === 'colaboradores' ? 'rgba(20, 169, 215, 0.16)' : 'transparent',
              color: activeSection === 'colaboradores' ? '#14A9D7' : 'var(--adm-text-muted, #94A3B8)',
              fontSize: '0.80rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <ShieldCheck size={15} />
            <span>Colaboradores</span>
          </button>
        </div>
      </div>

      {/* Conteúdo da Seção Ativa */}
      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {activeSection === 'unidades' ? (
          <AdminVenuesView onNavigateToFunnel={onNavigateToFunnel} />
        ) : (
          <AdminCollaboratorsView onNavigateTab={onNavigateTab} />
        )}
      </div>
    </div>
  );
};
