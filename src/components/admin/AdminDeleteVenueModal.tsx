import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, ShieldAlert, CheckCircle2, 
  Trash2, X
} from 'lucide-react';
import type { Venue, DebutanteAccount } from '../../types/admin';

interface AdminDeleteVenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  venue: Venue | null;
  debutantes: DebutanteAccount[];
  totalLeadsCount: number;
  onConfirmDelete: (venueId: string) => Promise<{ success: boolean; message?: string; activeDebutantesCount?: number }>;
}

export const AdminDeleteVenueModal: React.FC<AdminDeleteVenueModalProps> = ({
  isOpen,
  onClose,
  venue,
  debutantes,
  totalLeadsCount,
  onConfirmDelete,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfirmText('');
      setIsDeleting(false);
      setErrorMessage(null);
    }
  }, [isOpen, venue]);

  if (!isOpen || !venue) return null;

  // Filtra debutantes com jornada ativa vinculadas a esta casa
  const activeDebutantes = debutantes.filter(d => 
    d.venueId === venue.id &&
    d.status !== 'inactive' &&
    d.hasJourneyEnabled &&
    (d.journeyCycle?.journeyStatus === 'active' || !d.journeyCycle)
  );

  const isBlocked = activeDebutantes.length > 0;
  const isNameConfirmed = confirmText.trim().toLowerCase() === venue.name.trim().toLowerCase();

  const handleExecuteDelete = async () => {
    if (isBlocked || !isNameConfirmed || isDeleting) return;

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const result = await onConfirmDelete(venue.id);
      if (!result.success) {
        setErrorMessage(result.message || 'Falha ao remover a casa de festa.');
        setIsDeleting(false);
      } else {
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Ocorreu um erro ao processar a exclusão.');
      setIsDeleting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2600,
      padding: '20px',
      animation: 'fadeIn 0.2s ease-out',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{
        background: '#120F16',
        border: isBlocked ? '1.5px solid rgba(239, 68, 68, 0.5)' : '1.5px solid rgba(212, 175, 55, 0.4)',
        borderRadius: '24px',
        maxWidth: '540px',
        width: '100%',
        boxShadow: isBlocked
          ? '0 24px 64px rgba(0,0,0,0.9), 0 0 35px rgba(239, 68, 68, 0.2)'
          : '0 24px 64px rgba(0,0,0,0.9), 0 0 35px rgba(212, 175, 55, 0.15)',
        overflow: 'hidden',
        animation: 'scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 28px 18px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: isBlocked ? 'rgba(239, 68, 68, 0.15)' : 'rgba(212, 175, 55, 0.15)',
            border: isBlocked ? '1.5px solid rgba(239, 68, 68, 0.4)' : '1.5px solid rgba(212, 175, 55, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            {isBlocked ? (
              <ShieldAlert size={24} color="#EF4444" />
            ) : (
              <Trash2 size={24} color="#D4AF37" />
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              color: isBlocked ? '#EF4444' : '#D4AF37',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              {isBlocked ? 'Ação Bloqueada pelo Sistema' : 'Exclusão de Unidade com Preservação'}
            </div>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#FFFFFF',
              margin: '0 0 6px 0',
              letterSpacing: '-0.3px',
            }}>
              {venue.name}
            </h3>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.6)' }}>
              {venue.address || 'Unidade cadastrada'}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '10px',
              transition: 'all 0.15s ease',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* CASO 1: BLOQUEADO (HÁ DEBUTANTES COM JORNADAS ATIVAS) */}
          {isBlocked ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1.5px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#EF4444', fontWeight: 800, fontSize: '0.86rem' }}>
                  <AlertTriangle size={18} />
                  <span>Não é possível excluir esta casa de festas</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#E2E8F0', lineHeight: 1.55, margin: 0 }}>
                  Existem <strong>{activeDebutantes.length} debutante(s) com jornada ativa</strong> vinculada(s) a esta unidade.
                  Excluir a casa apagaria as fotos, o logotipo, o link oficial de convites e o acesso dos convidados e das famílias.
                </p>
              </div>

              {/* Lista das Debutantes Ativas */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                padding: '14px',
                maxHeight: '160px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase' }}>
                  Debutantes Ativas Vinculadas ({activeDebutantes.length}):
                </span>
                {activeDebutantes.map(deb => (
                  <div key={deb.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    color: '#FFF',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.9rem' }}>👑</span>
                      <strong style={{ color: '#E8C98D' }}>{deb.name}</strong>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                      Festa: {deb.partyDate.split('-').reverse().join('/')}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{
                fontSize: '0.78rem',
                color: 'rgba(255, 255, 255, 0.65)',
                lineHeight: 1.5,
                background: 'rgba(212, 175, 55, 0.06)',
                border: '1px dashed rgba(212, 175, 55, 0.3)',
                padding: '12px 14px',
                borderRadius: '12px',
              }}>
                💡 <strong>Como resolver:</strong> Para excluir a unidade, o gestor deve acessar a aba <em>Debutantes</em>, desativar ou transferir as jornadas das aniversariantes acima.
              </div>
            </div>
          ) : (
            /* CASO 2: LIBERADO (SEM DEBUTANTES ATIVAS) - PRESERVAÇÃO COMERCIAL GARANTIDA */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Card Verde: Garantia de Preservação de Leads */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(20, 17, 24, 0.8) 100%)',
                border: '1.5px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10B981', fontWeight: 800, fontSize: '0.84rem' }}>
                  <CheckCircle2 size={18} />
                  <span>Preservação Perpétua de Histórico Comercial</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#E2E8F0', lineHeight: 1.5, margin: 0 }}>
                  <strong>Nenhum lead será apagado.</strong> Todos os <strong>{totalLeadsCount} leads</strong> originados nesta casa permanecerão salvos no sistema, vinculados à conta da sua rede com o nome histórico congelado: <strong>"{venue.name}"</strong>.
                </p>
                <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                  <span>✓ Leads mantidos</span>
                  <span>✓ Histórico de faturamento mantido</span>
                  <span>✓ Origens preservadas</span>
                </div>
              </div>

              {/* Aviso do que será removido */}
              <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.5 }}>
                Apenas o perfil de exibição da casa e seus funis operacionais vazios serão desativados. Os dados históricos continuam disponíveis no CRM e nos relatórios de faturamento.
              </div>

              {/* Confirmação por Digitação */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FFFFFF' }}>
                  Para confirmar a exclusão, digite o nome exato da casa: <strong style={{ color: '#D4AF37' }}>{venue.name}</strong>
                </label>
                <input
                  type="text"
                  placeholder={`Digite "${venue.name}"`}
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: isNameConfirmed ? '1.5px solid #10B981' : '1.5px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    color: '#FFF',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease',
                  }}
                />
              </div>

              {errorMessage && (
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '10px',
                  color: '#EF4444',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                }}>
                  {errorMessage}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '16px 28px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '12px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              padding: '10px 20px',
              color: '#FFFFFF',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {isBlocked ? 'Entendido / Fechar' : 'Cancelar'}
          </button>

          {!isBlocked && (
            <button
              type="button"
              onClick={handleExecuteDelete}
              disabled={!isNameConfirmed || isDeleting}
              style={{
                background: isNameConfirmed && !isDeleting ? '#EF4444' : 'rgba(239, 68, 68, 0.2)',
                border: isNameConfirmed && !isDeleting ? '1px solid #DC2626' : '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '12px',
                padding: '10px 22px',
                color: isNameConfirmed && !isDeleting ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)',
                fontSize: '0.84rem',
                fontWeight: 800,
                cursor: isNameConfirmed && !isDeleting ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: isNameConfirmed ? '0 4px 16px rgba(239, 68, 68, 0.35)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Trash2 size={15} />
              <span>{isDeleting ? 'Excluindo...' : 'Excluir Casa de Festa'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
