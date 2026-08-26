import React, { useState } from 'react';
import { 
  X, Send, User, 
  CheckCircle2, MessageSquare, 
  Clock 
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
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
  const { 
    updateLeadStage, 
    addLeadNote, 
    rejectLead, 
    assignLeadSdr,
    assignLeadCloser,
    collaborators,
    venues 
  } = useAdminState();

  const [noteInput, setNoteInput] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('Contato não tem interesse no momento.');

  if (!isOpen || !lead) return null;

  const venue = venues.find(v => v.id === lead.venueId);

  const stageOptions: { id: CrmStage; label: string; color: string }[] = [
    { id: 'new_lead', label: 'Novo Lead', color: '#60A5FA' },
    { id: 'in_analysis', label: 'Em Análise', color: '#FBBF24' },
    { id: 'meeting_scheduled', label: 'Reunião Agendada', color: '#A78BFA' },
    { id: 'contract_signed', label: 'Contrato Fechado (Venda VIP)', color: '#FFD700' },
    { id: 'lost', label: 'Perdido / Recusado', color: '#EF4444' },
  ];

  const handleStageChange = (newStage: CrmStage) => {
    if (newStage === 'lost') {
      setIsRejecting(true);
    } else {
      updateLeadStage(lead.id, newStage);
    }
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim()) return;
    addLeadNote(lead.id, noteInput.trim());
    setNoteInput('');
  };

  const handleConfirmReject = () => {
    rejectLead(lead.id, rejectionReason.trim());
    setIsRejecting(false);
  };

  const handleWhatsApp = () => {
    const cleanPhone = lead.phone.replace(/\D/g, '');
    const text = `Olá, ${lead.name}! Tudo bem?\nRecebemos sua indicação através da debutante ${lead.debutanteName} para conhecer os pacotes especiais de 15 Anos da Bonomo Festas! 👑✨\nPodemos agendar uma visita/degustação?`;
    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

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
        maxWidth: '960px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.9), 0 0 30px rgba(212, 175, 55, 0.15)',
        position: 'relative',
      }}>
        {/* Header Bar */}
        <div style={{
          background: '#09070C',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(212, 175, 55, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <User size={20} color="#D4AF37" />
            </div>

            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFF', margin: 0 }}>
                {lead.name}
              </h2>
              <div style={{ fontSize: '0.74rem', color: '#9E988D', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>ID: {lead.id}</span>
                <span>•</span>
                <span>Indicada por <strong style={{ color: '#D4AF37' }}>{lead.debutanteName}</strong></span>
                <span>•</span>
                <span>{venue?.name || 'Espaço Rio Lounge'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Split View Body */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1fr) minmax(360px, 1.2fr)',
          flex: 1,
          overflowY: 'auto',
        }} className="crm-split-container">
          
          {/* Left Column: Lead Profile & Quick Actions */}
          <div style={{
            padding: '24px',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            background: '#100D14',
          }}>
            {/* WhatsApp Quick Action */}
            <button
              onClick={handleWhatsApp}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                color: '#FFF',
                border: 'none',
                borderRadius: '16px',
                padding: '12px 18px',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(37, 211, 102, 0.3)',
              }}
            >
              <Send size={16} />
              <span>Abrir Conversa no WhatsApp</span>
            </button>

            {/* Stage Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                Etapa do Funil Comercial
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {stageOptions.map(opt => {
                  const isCurrent = lead.stage === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleStageChange(opt.id)}
                      style={{
                        width: '100%',
                        background: isCurrent ? 'rgba(212, 175, 55, 0.2)' : '#09070C',
                        border: isCurrent ? '1.5px solid #D4AF37' : '1px solid rgba(255, 255, 255, 0.08)',
                        color: isCurrent ? '#FFF' : '#AAA',
                        borderRadius: '12px',
                        padding: '10px 14px',
                        fontSize: '0.82rem',
                        fontWeight: isCurrent ? 800 : 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ color: opt.color }}>{opt.label}</span>
                      {isCurrent && <CheckCircle2 size={15} color="#D4AF37" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Details Box */}
            <div style={{
              background: '#09070C',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              fontSize: '0.8rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Telefone:</span>
                <strong style={{ color: '#FFF' }}>{lead.phone}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Idade:</span>
                <strong style={{ color: '#FFF' }}>{lead.age} anos</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Grupo / Origem:</span>
                <span style={{ background: 'rgba(212, 175, 55, 0.15)', color: '#E8C98D', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 }}>
                  {lead.group}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: '#888', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>SDR (Pré-Venda):</span>
                <select
                  value={lead.sdrId || ''}
                  onChange={(e) => {
                    if (e.target.value) assignLeadSdr(lead.id, e.target.value);
                  }}
                  style={{
                    width: '100%',
                    background: '#16131C',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    color: '#FFF',
                    fontSize: '0.76rem',
                    outline: 'none',
                  }}
                >
                  <option value="">Selecionar SDR...</option>
                  {collaborators.filter(c => c.active && c.role === 'sdr').map(c => (
                    <option key={c.id} value={c.id}>{c.name} (SDR)</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: '#888', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>Closer (Fechamento):</span>
                <select
                  value={lead.closerId || ''}
                  onChange={(e) => {
                    if (e.target.value) assignLeadCloser(lead.id, e.target.value);
                  }}
                  style={{
                    width: '100%',
                    background: '#16131C',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    color: '#FFF',
                    fontSize: '0.76rem',
                    outline: 'none',
                  }}
                >
                  <option value="">Selecionar Closer...</option>
                  {collaborators.filter(c => c.active && c.role === 'closer').map(c => (
                    <option key={c.id} value={c.id}>{c.name} (Closer)</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Data de Cadastro:</span>
                <span style={{ color: '#AAA' }}>{lead.createdAt.split('-').reverse().join('/')}</span>
              </div>
            </div>

            {/* Rejection notice if lost */}
            {lead.rejectionReason && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '12px',
                padding: '10px 14px',
                fontSize: '0.78rem',
                color: '#F87171',
              }}>
                <strong>Motivo da perda / recusa:</strong> {lead.rejectionReason}
              </div>
            )}
          </div>

          {/* Right Column: Timeline, Activities & Notes Feed (Kommo Style) */}
          <div style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            background: '#120F16',
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFF', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="#D4AF37" />
              <span>Linha do Tempo & Histórico do Lead</span>
            </h3>

            {/* Note Composer Box */}
            <form onSubmit={handleAddNote} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <textarea
                rows={3}
                placeholder="Escreva uma observação interna da equipe sobre o contato com a cliente..."
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                style={{
                  width: '100%',
                  background: '#09070C',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  borderRadius: '12px',
                  padding: '12px',
                  color: '#FFF',
                  fontSize: '0.84rem',
                  outline: 'none',
                  resize: 'none',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={!noteInput.trim()}
                  style={{
                    background: noteInput.trim() ? '#D4AF37' : 'rgba(255, 255, 255, 0.1)',
                    color: noteInput.trim() ? '#000' : '#888',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '6px 16px',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: noteInput.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <MessageSquare size={13} />
                  <span>Registrar Observação</span>
                </button>
              </div>
            </form>

            {/* Timeline Feed */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              flex: 1,
              overflowY: 'auto',
              maxHeight: '380px',
              paddingRight: '6px',
            }}>
              {lead.activities && lead.activities.length > 0 ? (
                lead.activities.map(act => (
                  <div
                    key={act.id}
                    style={{
                      background: '#09070C',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: act.type === 'status_change' ? '#E8C98D' : '#60A5FA' }}>
                        {act.title}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: '#777' }}>
                        {new Date(act.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {act.text && (
                      <p style={{ fontSize: '0.78rem', color: '#DDD', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                        {act.text}
                      </p>
                    )}

                    <div style={{ fontSize: '0.66rem', color: '#888', marginTop: '2px' }}>
                      Por: {act.authorName}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#777', fontSize: '0.8rem' }}>
                  Nenhuma atividade registrada ainda.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reject Modal Confirmation Overlay */}
        {isRejecting && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.92)',
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}>
            <div style={{
              background: '#16111D',
              border: '1.5px solid rgba(239, 68, 68, 0.5)',
              borderRadius: '20px',
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFF', margin: '0 0 8px 0' }}>
                Marcar Lead como Perdido / Recusado
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#AAA', marginBottom: '14px' }}>
                Informe a justificativa da perda para registro no histórico da debutante:
              </p>

              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                style={{
                  width: '100%',
                  background: '#09070C',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  padding: '10px',
                  color: '#FFF',
                  fontSize: '0.82rem',
                  outline: 'none',
                  marginBottom: '16px',
                }}
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setIsRejecting(false)}
                  style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#FFF',
                    borderRadius: '20px',
                    padding: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>

                <button
                  onClick={handleConfirmReject}
                  style={{
                    flex: 1,
                    background: '#EF4444',
                    border: 'none',
                    color: '#FFF',
                    borderRadius: '20px',
                    padding: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Confirmar Perda
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      <style>{`
        @media (max-width: 768px) {
          .crm-split-container {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
