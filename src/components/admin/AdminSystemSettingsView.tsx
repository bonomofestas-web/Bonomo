import React, { useState } from 'react';
import { Building2, ShieldCheck } from 'lucide-react';
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

  // Switcher compacto renderizado no menu superior preto (à direita dos botões de ação)
  const switcher = (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      background: 'var(--adm-bg-surface, rgba(255, 255, 255, 0.04))',
      padding: '3px',
      borderRadius: '10px',
      border: '1px solid var(--adm-border, rgba(255, 255, 255, 0.08))',
      marginLeft: '4px',
    }}>
      <button
        type="button"
        onClick={() => setActiveSection('unidades')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          height: '30px',
          padding: '0 12px',
          borderRadius: '7px',
          border: activeSection === 'unidades' ? '1px solid #D4AF37' : '1px solid transparent',
          background: activeSection === 'unidades' ? 'rgba(212, 175, 55, 0.16)' : 'transparent',
          color: activeSection === 'unidades' ? '#D4AF37' : 'var(--adm-text-muted, #94A3B8)',
          fontSize: '0.76rem',
          fontWeight: 800,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <Building2 size={13} />
        <span>Unidades</span>
      </button>

      <button
        type="button"
        onClick={() => setActiveSection('colaboradores')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          height: '30px',
          padding: '0 12px',
          borderRadius: '7px',
          border: activeSection === 'colaboradores' ? '1px solid #14A9D7' : '1px solid transparent',
          background: activeSection === 'colaboradores' ? 'rgba(20, 169, 215, 0.16)' : 'transparent',
          color: activeSection === 'colaboradores' ? '#14A9D7' : 'var(--adm-text-muted, #94A3B8)',
          fontSize: '0.76rem',
          fontWeight: 800,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <ShieldCheck size={13} />
        <span>Colaboradores</span>
      </button>
    </div>
  );

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
      {/* Conteúdo da Seção Ativa (Unidades ou Colaboradores) ocupando 100% da área de trabalho */}
      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {activeSection === 'unidades' ? (
          <AdminVenuesView onNavigateToFunnel={onNavigateToFunnel} headerSwitcher={switcher} />
        ) : (
          <AdminCollaboratorsView onNavigateTab={onNavigateTab as any} headerSwitcher={switcher} />
        )}
      </div>
    </div>
  );
};
