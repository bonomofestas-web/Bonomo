import React from 'react';
import { X, Bell, Award, Crown, CheckCircle2, Sparkles, Clock, Users, ArrowRight } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

interface DebutanteNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DebutanteNotificationsModal: React.FC<DebutanteNotificationsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { debutante, referrals, milestones, vipRewards, guests, setActiveTab } = useAppState();

  if (!isOpen) return null;

  // Build real notifications log
  const notifications: Array<{
    id: string;
    type: 'referral_validated' | 'referral_pending' | 'milestone_unlocked' | 'vip_reward' | 'guest_registered';
    title: string;
    description: string;
    time?: string;
    icon: React.ReactNode;
    action?: () => void;
  }> = [];

  // 1. Validated Referrals
  referrals.filter(r => r.status === 'validated').forEach((r) => {
    notifications.push({
      id: `val_${r.id}`,
      type: 'referral_validated',
      title: 'Indicação Validada pela Gerência!',
      description: `A indicação da sua amiga ${r.name} foi validada com sucesso. Você ganhou +1 ponto na sua jornada!`,
      time: r.createdAt ? `Validado em ${r.createdAt.split('T')[0].split('-').reverse().join('/')}` : 'Recentemente',
      icon: <CheckCircle2 size={18} color="#22C55E" />,
      action: () => {
        setActiveTab('benefits');
        onClose();
      }
    });
  });

  // 2. Convidado Preencheu Lista pelo Link de Convite
  guests.filter(g => g.isSelfRegistered || g.origin === 'general_link' || g.status === 'confirmed').forEach((g) => {
    notifications.push({
      id: `guest_reg_${g.id}`,
      type: 'guest_registered',
      title: `${g.name} entrou na lista de convidados!`,
      description: `${g.name} confirmou presença pelo seu convite digital (${g.group || 'Amigos'}${g.plusOnes > 0 ? ` + ${g.plusOnes} acompanhante(s)` : ''}).`,
      time: g.confirmedAt ? `Confirmado em ${new Date(g.confirmedAt).toLocaleDateString('pt-BR')}` : 'Lista de convidados',
      icon: <Users size={18} color="#10B981" />,
      action: () => {
        setActiveTab('guests');
        onClose();
      }
    });
  });

  // 3. Pending Referrals
  referrals.filter(r => r.status === 'pending').forEach((r) => {
    notifications.push({
      id: `pend_${r.id}`,
      type: 'referral_pending',
      title: 'Indicação em Análise',
      description: `O contato de ${r.name} foi recebido e está sendo verificado pela nossa equipe comercial.`,
      time: r.createdAt ? `Enviado em ${r.createdAt.split('T')[0].split('-').reverse().join('/')}` : 'Aguardando',
      icon: <Clock size={18} color="#D4AF37" />,
      action: () => {
        setActiveTab('benefits');
        onClose();
      }
    });
  });

  // 4. Unlocked Milestones
  const validCount = referrals.filter(r => r.status === 'validated').length;
  milestones.filter(m => validCount >= m.requiredReferrals).forEach((m) => {
    notifications.push({
      id: `mile_${m.id}`,
      type: 'milestone_unlocked',
      title: `Benefício Desbloqueado: ${m.rewardTitle}`,
      description: `Parabéns! Você acumulou ${m.requiredReferrals} pontos e conquistou este benefício exclusivo para sua festa!`,
      time: 'Conquista Ativa',
      icon: <Award size={18} color="#D4AF37" />,
      action: () => {
        setActiveTab('benefits');
        onClose();
      }
    });
  });

  // 5. VIP Rewards
  const vipSales = debutante.convertedReferralSales || 0;
  vipRewards.filter(v => vipSales >= v.requiredSales).forEach((v) => {
    notifications.push({
      id: `vip_${v.id}`,
      type: 'vip_reward',
      title: `Presente VIP Liberado: ${v.name}`,
      description: `Um contrato de festa foi fechado através de suas indicações! Seu presente VIP está garantido.`,
      time: 'Presente VIP',
      icon: <Crown size={18} color="#EC4899" />,
      action: () => {
        setActiveTab('benefits');
        onClose();
      }
    });
  });

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '20px',
      animation: 'fadeIn 0.2s ease-out',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{
        background: '#120D1A',
        border: '1.5px solid rgba(212, 175, 55, 0.35)',
        borderRadius: '24px',
        maxWidth: '460px',
        width: '100%',
        maxHeight: '85vh',
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.9), 0 0 30px rgba(212,175,55,0.2)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(18,13,26,0.95) 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              background: 'rgba(212, 175, 55, 0.18)',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Bell size={18} color="#D4AF37" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFF', margin: 0 }}>
                Minhas Notificações
              </h3>
              <p style={{ fontSize: '0.72rem', color: '#A0988A', margin: 0 }}>
                Conquistas, prêmios e status das suas indicações
              </p>
            </div>
          </div>

          <button
            type="button"
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

        {/* Notifications List */}
        <div style={{
          padding: '16px 20px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          flex: 1,
        }}>
          {notifications.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: '#A0988A' }}>
              <Sparkles size={32} color="#D4AF37" style={{ margin: '0 auto 8px auto', opacity: 0.6 }} />
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#FFF' }}>Nenhuma notificação ainda</div>
              <p style={{ fontSize: '0.76rem', margin: '4px 0 0 0' }}>Conforme você enviar indicações e conquistar pontos, os avisos aparecerão aqui!</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={n.action}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  cursor: n.action ? 'pointer' : 'default',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (n.action) {
                    e.currentTarget.style.background = 'rgba(212, 175, 55, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (n.action) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  }
                }}
              >
                <div style={{
                  padding: '8px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  flexShrink: 0,
                }}>
                  {n.icon}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <h4 style={{ fontSize: '0.84rem', fontWeight: 800, color: '#FFF', margin: 0 }}>
                      {n.title}
                    </h4>
                    {n.time && (
                      <span style={{ fontSize: '0.62rem', color: '#D4AF37', fontWeight: 700 }}>
                        {n.time}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.74rem', color: '#C5BDAD', margin: '3px 0 0 0', lineHeight: 1.4 }}>
                    {n.description}
                  </p>
                  {n.action && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: '#D4AF37', fontWeight: 700, marginTop: '6px' }}>
                      Ver detalhes <ArrowRight size={11} />
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
