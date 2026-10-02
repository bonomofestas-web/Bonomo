import React from 'react';
import { useAdminState } from '../../context/AdminStateContext';
import { AdminLeadInspector } from './AdminLeadInspector';
import type { Lead, CrmStage } from '../../types/admin';

interface AdminLeadDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  highlightMissingFields?: boolean;
}

export const AdminLeadDetailModal: React.FC<AdminLeadDetailModalProps> = ({
  isOpen,
  onClose,
  lead,
  highlightMissingFields = false,
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
        {/* Lead Inspector Component (Full 3 Tabs: Principal | Origem | MQL) */}
        <div style={{ flex: 1, overflowY: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <AdminLeadInspector
            lead={lead}
            onStageChange={(newStage: CrmStage) => updateLeadStage(lead.id, newStage)}
            onClose={onClose}
            isModal={true}
            highlightMissingFields={highlightMissingFields}
          />
        </div>
      </div>
    </div>
  );
};
