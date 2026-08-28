import React, { useState } from 'react';
import { UserPlus, CheckCircle2, Clock, Filter, Phone, Tag, AlertCircle, Users } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { ReferralFormModal } from './ReferralFormModal';

export const ReferralList: React.FC = () => {
  const { 
    referrals, 
    setIsReferralModalOpen,
    isReferralModalOpen,
    debutante 
  } = useAppState();

  const [selectedGroup, setSelectedGroup] = useState<string>('Todos');

  const groups = ['Todos', 'Escola', 'Família', 'Judô', 'Faculdade', 'Amigos', 'Academia', 'Outros'];

  const filteredReferrals = selectedGroup === 'Todos'
    ? referrals
    : referrals.filter(r => r.group === selectedGroup);

  const consideredSentCount = referrals.length;
  const validatedCount = referrals.filter(r => r.status === 'validated').length;
  const pendingCount = referrals.filter(r => r.status === 'pending').length;
  const rejectedCount = referrals.filter(r => r.status === 'rejected').length;

  const isPaused = debutante.journeyCycle.journeyStatus === 'paused';

  return (
    <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
      {/* Paused Banner if journey is paused */}
      {isPaused && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(26, 12, 22, 0.98) 100%)',
          border: '1.5px solid rgba(255, 92, 154, 0.6)',
          borderRadius: '18px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 8px 24px rgba(255, 92, 154, 0.25)',
        }}>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#FF5C9A', fontFamily: 'Poppins, sans-serif' }}>
              ⏸️ JORNADA PAUSADA — INDICAÇÕES PARA DESBLOQUEIO
            </div>
            <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.85)', fontFamily: 'Poppins, sans-serif', marginTop: '2px' }}>
              Suas novas indicações serão contabilizadas para desbloquear mais +7 dias de jornada ({debutante.journeyCycle.cycleRenewalProgress}/3).
            </div>
          </div>
          <button
            onClick={() => setIsReferralModalOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #FFD700 0%, #FFB703 50%, #FB8500 100%)',
              color: '#1A0E00',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              padding: '8px 18px',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 0 14px rgba(255, 183, 3, 0.45)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <UserPlus size={14} color="#1A0E00" strokeWidth={2.5} />
            <span>+ Indicar Amigos</span>
          </button>
        </div>
      )}

      {/* ── 1. Universal Top Header (Icon + Title + Subtitle) ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '20px',
      }}>
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          aspectRatio: '1 / 1',
          flexShrink: 0,
          background: 'rgba(255, 92, 154, 0.15)',
          border: '1.5px solid rgba(255, 92, 154, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 16px rgba(255, 92, 154, 0.25)',
        }}>
          <Users size={24} color="#FF5C9A" />
        </div>

        <div>
          <h1 style={{
            fontSize: 'clamp(1.4rem, 4vw, 1.9rem)',
            fontWeight: 800,
            color: '#FFFFFF',
            margin: '0 0 4px 0',
            fontFamily: 'Poppins, sans-serif',
            letterSpacing: '-0.3px',
          }}>
            Minhas Indicações
          </h1>
          <p style={{
            color: '#B5AFA4',
            fontSize: '0.84rem',
            margin: 0,
            fontFamily: "'Montserrat', sans-serif",
            lineHeight: 1.35,
          }}>
            Gerencie as amigas indicadas e acompanhe a validação de pontos
          </p>
        </div>
      </div>

      {/* ── 2. KPI Cards Grid (4 Quadrants 2x2 on mobile, 4 columns on desktop) ── */}
      <div className="referral-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '10px', marginBottom: '22px' }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '12px 14px'
        }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            ENVIADAS CONSIDERADAS
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFF' }}>
            {consideredSentCount}
          </div>
        </div>

        <div style={{
          background: 'rgba(255, 215, 0, 0.08)',
          border: '1px solid rgba(255, 215, 0, 0.35)',
          borderRadius: '16px',
          padding: '12px 14px'
        }}>
          <div style={{ fontSize: '0.68rem', color: '#FFD700', fontWeight: 700, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <CheckCircle2 size={11} /> VALIDADAS (+1)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFD700' }}>
            {validatedCount}
          </div>
        </div>

        <div style={{
          background: 'rgba(255, 92, 154, 0.08)',
          border: '1px solid rgba(255, 92, 154, 0.35)',
          borderRadius: '16px',
          padding: '12px 14px'
        }}>
          <div style={{ fontSize: '0.68rem', color: '#FF5C9A', fontWeight: 700, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <Clock size={11} /> EM ANÁLISE
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FF5C9A' }}>
            {pendingCount}
          </div>
        </div>

        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '16px',
          padding: '12px 14px'
        }}>
          <div style={{ fontSize: '0.68rem', color: '#EF4444', fontWeight: 700, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <span>✕</span> RECUSADAS
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#EF4444' }}>
            {rejectedCount}
          </div>
        </div>
      </div>

      {/* ── 3. Filter Tabs (High Contrast, Clean & Solid with no scrollbar) ── */}
      <div className="hide-scrollbar" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', overflowX: 'auto', width: '100%', padding: '4px 0 6px 0', WebkitOverflowScrolling: 'touch' }}>
        <Filter size={15} color="#FFD700" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.78rem', color: '#FFD700', fontWeight: 800, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Grupo:</span>
        {groups.map(g => {
          const isSelected = selectedGroup === g;
          return (
            <button
              key={g}
              onClick={() => setSelectedGroup(g)}
              style={{
                background: isSelected ? '#FF5C9A' : '#2A1836',
                color: '#FFFFFF',
                border: isSelected ? '1.5px solid #FFFFFF' : '1.5px solid rgba(255, 255, 255, 0.25)',
                padding: '6px 16px',
                borderRadius: '20px',
                fontWeight: isSelected ? 800 : 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: isSelected ? '0 2px 8px rgba(255, 92, 154, 0.45)' : 'none',
                transition: 'background 0.2s ease, border-color 0.2s ease',
                flexShrink: 0,
                lineHeight: 1.2
              }}
            >
              {g}
            </button>
          );
        })}
      </div>

      {/* ── 4. Referral Cards List ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {referrals.length === 0 ? (
          <div style={{
            background: 'linear-gradient(135deg, rgba(26, 14, 34, 0.95) 0%, rgba(16, 9, 22, 0.98) 100%)',
            borderRadius: '24px',
            padding: '48px 24px',
            textAlign: 'center',
            border: '1.5px dashed rgba(255, 215, 0, 0.3)',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5)',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(255, 215, 0, 0.12)',
              border: '1.5px dashed rgba(255, 215, 0, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: '#FFD700',
            }}>
              <UserPlus size={28} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFF', marginBottom: '8px' }}>
              Você ainda não possui indicações registradas
            </h3>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '420px', margin: '0 auto 24px auto', lineHeight: 1.5 }}>
              Compartilhe o Espaço Rio Lounge com suas amigas e familiares. Cada indicação válida ajuda você a conquistar benefícios e presentes incríveis para a sua festa!
            </p>

            <button
              onClick={() => setIsReferralModalOpen(true)}
              style={{
                background: 'linear-gradient(135deg, #FFD700 0%, #FFB703 50%, #FB8500 100%)',
                color: '#1A0E00',
                border: 'none',
                padding: '12px 28px',
                borderRadius: '24px',
                fontSize: '0.9rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 20px rgba(255, 183, 3, 0.45)',
                transition: 'transform 0.2s ease',
              }}
            >
              <UserPlus size={18} color="#1A0E00" strokeWidth={2.5} />
              <span>Indique Agora</span>
            </button>
          </div>
        ) : filteredReferrals.length === 0 ? (
          <div className="glass-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Nenhuma indicação encontrada no grupo <strong>{selectedGroup}</strong>.
          </div>
        ) : (
          filteredReferrals.map(ref => {
            const isValidated = ref.status === 'validated';
            const isPending = ref.status === 'pending';
            const isRejected = ref.status === 'rejected';
            const isRenewal = ref.isRenewalReferral;

            return (
              <div 
                key={ref.id} 
                className="glass-card" 
                style={{ 
                  padding: '16px 18px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  flexWrap: 'wrap', 
                  gap: '14px',
                  borderLeft: isRenewal 
                    ? '4px solid #FF5C9A' 
                    : isValidated 
                      ? '4px solid #FFD700' 
                      : isPending 
                        ? '4px solid #FF5C9A' 
                        : '4px solid #EF4444',
                  opacity: isRejected ? 0.8 : 1
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: '240px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: isRenewal ? 'rgba(255, 92, 154, 0.2)' : isValidated ? 'rgba(255, 215, 0, 0.15)' : isPending ? 'rgba(255, 92, 154, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isRenewal ? '#FF5C9A' : isValidated ? '#FFD700' : isPending ? '#FF5C9A' : '#EF4444',
                    flexShrink: 0
                  }}>
                    {isValidated ? <CheckCircle2 size={18} /> : isPending ? <Clock size={18} /> : <Tag size={18} />}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, textDecoration: isRejected ? 'line-through' : 'none', color: '#FFF' }}>
                        {ref.name}
                      </h3>
                      
                      {isRenewal && (
                        <span className="badge" style={{
                          background: 'linear-gradient(135deg, rgba(255,92,154,0.3) 0%, rgba(255,20,147,0.3) 100%)',
                          color: '#FFB0C8',
                          border: '1px solid rgba(255,92,154,0.6)',
                          fontSize: '0.66rem',
                          fontWeight: 800,
                          letterSpacing: '0.3px',
                        }}>
                          ⚡ DESBLOQUEIO DE JORNADA
                        </span>
                      )}

                      <span className="badge" style={{
                        background: 'rgba(255,255,255,0.08)',
                        color: 'var(--primary-light)',
                        fontSize: '0.66rem'
                      }}>
                        <Tag size={9} /> {ref.group} • {ref.age} anos
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '3px', fontSize: '0.76rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={11} /> {ref.phone}
                      </span>
                      <span>Enviado: {ref.createdAt}</span>
                    </div>

                    {ref.notes && (
                      <p style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.6)', marginTop: '3px', fontStyle: 'italic', margin: '4px 0 0 0' }}>
                        "{ref.notes}"
                      </p>
                    )}

                    {/* Exibição do Motivo da Recusa quando recusado */}
                    {isRejected && ref.rejectionReason && (
                      <div style={{
                        marginTop: '8px',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '10px',
                        padding: '7px 10px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '6px',
                      }}>
                        <AlertCircle size={13} color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Motivo da Recusa:
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#FFB0B0', marginTop: '1px', lineHeight: 1.35 }}>
                            {ref.rejectionReason}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Badge & Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {isValidated && (
                    <span className="badge badge-claimed" style={{ fontSize: '0.7rem' }}>
                      ✓ Validado {isRenewal ? '(Desbloqueio)' : '(+1 Ponto)'}
                    </span>
                  )}

                  {isRejected && (
                    <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.4)', fontSize: '0.7rem' }}>
                      ✕ Recusada
                    </span>
                  )}

                  {isPending && (
                    <span className="badge badge-in_progress" style={{ fontSize: '0.74rem' }}>
                      ⏳ Em Análise da Equipe
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <ReferralFormModal
        isOpen={isReferralModalOpen}
        onClose={() => setIsReferralModalOpen(false)}
      />
    </div>
  );
};
