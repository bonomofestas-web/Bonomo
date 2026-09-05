import React, { useEffect } from 'react';
import { Bell, Award, Crown, CheckCircle2, Sparkles, Clock, Users, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

interface DebutanteNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DebutanteNotificationsModal: React.FC<DebutanteNotificationsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { debutante, referrals, milestones, vipRewards, guests, setActiveTab, markNotificationsAsRead } = useAppState();

  // Clear unread badge counter immediately upon opening notifications
  useEffect(() => {
    if (isOpen) {
      markNotificationsAsRead();
    }
  }, [isOpen, markNotificationsAsRead]);

  if (!isOpen) return null;

  // Build real notifications log with timestamps for reverse-chronological sorting
  const notifications: Array<{
    id: string;
    type: 'referral_validated' | 'referral_pending' | 'milestone_unlocked' | 'vip_reward' | 'guest_registered';
    title: string;
    description: string;
    time?: string;
    timestamp: number;
    icon: React.ReactNode;
    action?: () => void;
  }> = [];

  // 1. Validated Referrals
  referrals.filter(r => r.status === 'validated').forEach((r) => {
    const ts = r.createdAt ? new Date(r.createdAt).getTime() : Date.now();
    notifications.push({
      id: `val_${r.id}`,
      type: 'referral_validated',
      title: 'Indicação Validada pela Gerência!',
      description: `A indicação da sua amiga ${r.name} foi validada com sucesso. Você ganhou +1 ponto na sua jornada!`,
      time: r.createdAt ? `Validado em ${r.createdAt.split('T')[0].split('-').reverse().join('/')}` : 'Recentemente',
      timestamp: ts,
      icon: <CheckCircle2 size={18} color="#22C55E" />,
      action: () => {
        setActiveTab('benefits');
        onClose();
      }
    });
  });

  // 2. Convidado Preencheu Lista pelo Link de Convite
  guests.filter(g => g.isSelfRegistered || g.origin === 'general_link' || g.status === 'confirmed').forEach((g) => {
    const ts = g.confirmedAt ? new Date(g.confirmedAt).getTime() : (Date.now() - 3600000);
    notifications.push({
      id: `guest_reg_${g.id}`,
      type: 'guest_registered',
      title: `${g.name} confirmou presença!`,
      description: `${g.name} confirmou presença no seu aniversário (${g.group || 'Amigos'}${g.plusOnes > 0 ? ` + ${g.plusOnes} acompanhante(s)` : ''}).`,
      time: g.confirmedAt ? `Confirmado em ${new Date(g.confirmedAt).toLocaleDateString('pt-BR')}` : 'Lista de convidados',
      timestamp: ts,
      icon: <Users size={18} color="#10B981" />,
      action: () => {
        setActiveTab('guests');
        onClose();
      }
    });
  });

  // 3. Pending Referrals
  referrals.filter(r => r.status === 'pending').forEach((r) => {
    const ts = r.createdAt ? new Date(r.createdAt).getTime() : (Date.now() - 7200000);
    notifications.push({
      id: `pend_${r.id}`,
      type: 'referral_pending',
      title: 'Indicação em Análise',
      description: `O contato de ${r.name} foi recebido e está sendo verificado pela nossa equipe comercial.`,
      time: r.createdAt ? `Enviado em ${r.createdAt.split('T')[0].split('-').reverse().join('/')}` : 'Aguardando',
      timestamp: ts,
      icon: <Clock size={18} color="#D4AF37" />,
      action: () => {
        setActiveTab('benefits');
        onClose();
      }
    });
  });

  // 4. Unlocked Milestones
  const validCount = referrals.filter(r => r.status === 'validated').length;
  milestones.filter(m => validCount >= m.requiredReferrals).forEach((m, idx) => {
    notifications.push({
      id: `mile_${m.id}`,
      type: 'milestone_unlocked',
      title: `Benefício Desbloqueado: ${m.rewardTitle}`,
      description: `Parabéns! Você atingiu a meta de ${m.requiredReferrals} indicações e conquistou este benefício exclusivo!`,
      time: 'Conquista Ativa',
      timestamp: Date.now() - (idx * 60000),
      icon: <Award size={18} color="#D4AF37" />,
      action: () => {
        setActiveTab('benefits');
        onClose();
      }
    });
  });

  // 5. VIP Rewards
  const vipSales = debutante.convertedReferralSales || 0;
  vipRewards.filter(v => vipSales >= v.requiredSales).forEach((v, idx) => {
    notifications.push({
      id: `vip_${v.id}`,
      type: 'vip_reward',
      title: `Presente VIP Liberado: ${v.name}`,
      description: `Um contrato de festa foi fechado através de suas indicações! Seu presente VIP está garantido.`,
      time: 'Presente VIP',
      timestamp: Date.now() - (idx * 30000),
      icon: <Crown size={18} color="#EC4899" />,
      action: () => {
        setActiveTab('benefits');
        onClose();
      }
    });
  });

  // Sort newest first as mandated by Audio 8
  notifications.sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#0B0813',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      paddingTop: 'max(52px, env(safe-area-inset-top, 52px))',
      fontFamily: "'Inter', sans-serif",
      animation: 'fadeIn 0.2s ease-out',
    }}>
      {/* Top Header with Back button as mandated by Audio 8 */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(18, 13, 26, 0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.88rem',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '6px 0',
          }}
        >
          <ArrowLeft size={20} color="var(--adm-accent, #D4AF37)" />
          <span>Voltar para o Aplicativo</span>
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--adm-accent, #D4AF37)',
          fontSize: '0.82rem',
          fontWeight: 700,
        }}>
          <Bell size={16} />
          <span>Notificações</span>
        </div>
      </div>

      {/* Main List Container */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 16px 40px 16px',
        maxWidth: '620px',
        width: '100%',
        margin: '0 auto',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        <div style={{ marginBottom: '4px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px 0' }}>
            Minhas Notificações
          </h2>
          <p style={{ fontSize: '0.78rem', color: '#A0988A', margin: 0 }}>
            Histórico das suas conquistas, convidados e status das suas indicações.
          </p>
        </div>

        {notifications.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#A0988A' }}>
            <Sparkles size={36} color="#D4AF37" style={{ margin: '0 auto 10px auto', opacity: 0.6 }} />
            <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#FFF' }}>Nenhuma notificação no momento</div>
            <p style={{ fontSize: '0.8rem', margin: '6px 0 0 0' }}>
              Conforme você enviar indicações e conquistar metas, os avisos aparecerão aqui em tempo real!
            </p>
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
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
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
                padding: '10px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.06)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {n.icon}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFF', margin: 0 }}>
                    {n.title}
                  </h4>
                  {n.time && (
                    <span style={{ fontSize: '0.66rem', color: '#D4AF37', fontWeight: 600 }}>
                      {n.time}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.78rem', color: '#C5BDAD', margin: '4px 0 0 0', lineHeight: 1.45 }}>
                  {n.description}
                </p>
                {n.action && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#D4AF37', fontWeight: 700, marginTop: '8px' }}>
                    Ver detalhes <ArrowRight size={12} />
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
