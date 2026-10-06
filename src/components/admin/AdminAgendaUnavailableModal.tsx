import React from 'react';
import { AlertCircle, CalendarRange, X } from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';

interface AdminAgendaUnavailableModalProps {
  isOpen: boolean;
  type: 'visit' | 'tasting';
  venueId?: string;
  venueName?: string;
  onClose: () => void;
  onOpenPlanning?: (venueId?: string, type?: 'visit' | 'tasting') => void;
}

export const AdminAgendaUnavailableModal: React.FC<AdminAgendaUnavailableModalProps> = ({
  isOpen,
  type,
  venueId,
  venueName,
  onClose,
  onOpenPlanning,
}) => {
  const { currentUser } = useAdminState();

  if (!isOpen) return null;

  const isManagerOrAdmin = 
    currentUser?.role === 'master' || 
    currentUser?.role === 'admin' || 
    currentUser?.role === 'gerencia';

  const typeLabel = type === 'visit' ? 'Visita Comercial' : 'Degustação Gastronômica';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '18px',
        maxWidth: '460px',
        width: '100%',
        padding: '26px 24px',
        boxShadow: '0 25px 60px -15px rgba(0,0,0,0.3)',
        border: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        position: 'relative',
        animation: 'fadeIn 0.18s ease-out',
      }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Fechar"
        >
          <X size={18} />
        </button>

        {/* Ícone de Alerta */}
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'rgba(239, 68, 68, 0.10)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#DC2626',
          marginBottom: '16px',
        }}>
          <AlertCircle size={28} />
        </div>

        {/* Título */}
        <h3 style={{
          margin: '0 0 6px 0',
          fontSize: '1.12rem',
          fontWeight: 900,
          color: '#0F172A',
        }}>
          Agendamento de {typeLabel} Indisponível
        </h3>

        {venueName && (
          <div style={{
            fontSize: '0.78rem',
            fontWeight: 800,
            color: '#64748B',
            marginBottom: '12px',
          }}>
            Unidade: <strong>{venueName}</strong>
          </div>
        )}

        {/* Mensagem Padrão solicitada */}
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: '12px',
          padding: '14px 16px',
          color: '#991B1B',
          fontSize: '0.86rem',
          fontWeight: 700,
          lineHeight: 1.5,
          marginBottom: '20px',
        }}>
          Não é possível fazer agendamento pois não há datas e nem horários disponíveis. Acesse a central de planejamento ou fale com seu gestor.
        </div>

        {/* Botões de Ação */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          width: '100%',
        }}>
          {isManagerOrAdmin && onOpenPlanning ? (
            <>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#475569',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPlanning(venueId, type);
                }}
                style={{
                  flex: 1.5,
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#10B981',
                  color: '#FFFFFF',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                }}
              >
                <CalendarRange size={15} />
                <span>Planejar Agenda</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              style={{
                width: '100%',
                padding: '11px 16px',
                borderRadius: '10px',
                border: 'none',
                background: '#0F172A',
                color: '#FFFFFF',
                fontSize: '0.84rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Entendido
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
