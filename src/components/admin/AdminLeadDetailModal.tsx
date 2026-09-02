import React from 'react';
import { X } from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { AdminLeadInspector } from './AdminLeadInspector';
import type { Lead, CrmStage } from '../../types/admin';

interface AdminLeadDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
}

export const AdminLeadDetailModal: React.FC<AdminLeadDetailModalProps> = ({
  isOpen,
  onClose,
  lead,
}) => {
  const { updateLeadStage } = useAdminState();

  if (!isOpen || !lead) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.88)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1200,
      padding: '20px',
      animation: 'fadeIn 0.2s ease-out',
    }}>
      <div style={{
        background: '#120F16',
        border: '1.5px solid rgba(212, 175, 55, 0.4)',
        borderRadius: '24px',
        maxWidth: '560px',
        width: '100%',
        height: '90vh',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.9), 0 0 30px rgba(212, 175, 55, 0.15)',
        position: 'relative',
      }}>
        {/* Modal Close Floating Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFF',
            cursor: 'pointer',
            zIndex: 100,
            transition: 'all 0.15s ease',
          }}
          title="Fechar Ficha do Lead"
        >
          <X size={15} />
        </button>

        {/* Lead Inspector Component (Full 3 Tabs: Principal | Origem | MQL) */}
        <div style={{ flex: 1, overflowY: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <AdminLeadInspector
            lead={lead}
            onStageChange={(newStage: CrmStage) => updateLeadStage(lead.id, newStage)}
            onToggleCollapse={onClose}
          />
        </div>
      </div>
    </div>
  );
};
