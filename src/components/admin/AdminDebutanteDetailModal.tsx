import React, { useState } from 'react';
import { 
  X, Crown, Gift, Users, Sparkles, CheckCircle2, 
  ExternalLink, Building2, Check,
  Share2, Award, Clock, Edit3
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import type { DebutanteAccount, Venue } from '../../types/admin';

interface AdminDebutanteDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  debutante: DebutanteAccount | null;
  venue?: Venue;
  onEdit?: () => void;
}

export const AdminDebutanteDetailModal: React.FC<AdminDebutanteDetailModalProps> = ({
  isOpen,
  onClose,
  debutante,
  venue,
  onEdit,
}) => {
  const { updateDebutanteAccount } = useAdminState();
  const [activeTab, setActiveTab] = useState<'rewards' | 'referrals' | 'guests'>('rewards');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !debutante) return null;

  const validReferralsCount = debutante.referrals?.filter(r => r.status === 'validated').length || 0;
  const totalReferrals = debutante.referrals?.length || 0;
  const wonContractsCount = debutante.convertedReferralSales || 0;

  const handleCopyLink = () => {
    const fullUrl = `${window.location.origin}/${debutante.slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenApp = () => {
    window.open(`/${debutante.slug}`, '_blank');
  };

  // Toggle referral status (Pendente <-> Validada)
  const handleToggleReferralStatus = (refIndex: number) => {
    const updatedReferrals = [...(debutante.referrals || [])];
    const current = updatedReferrals[refIndex];
    if (!current) return;

    const nextStatus = current.status === 'validated' ? 'pending' : 'validated';
    updatedReferrals[refIndex] = { ...current, status: nextStatus };
    
    // Recount valid referrals
    const newValidCount = updatedReferrals.filter(r => r.status === 'validated').length;

    updateDebutanteAccount(debutante.id, {
      referrals: updatedReferrals,
      validReferrals: newValidCount,
    });
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1200,
      padding: '20px',
      animation: 'fadeIn 0.2s ease-out',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{
        background: 'var(--adm-bg-card)',
        border: '1.5px solid var(--adm-border)',
        borderRadius: '24px',
        maxWidth: '860px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative',
        boxShadow: '0 30px 80px rgba(0,0,0,0.8), 0 0 30px rgba(212,175,55,0.15)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header Cover & Profile */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(212,175,55,0.2) 0%, rgba(20,17,27,0.95) 100%)',
          borderBottom: '1px solid var(--adm-border)',
          padding: '28px 28px 20px 28px',
          position: 'relative',
        }}>
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'var(--adm-bg-elevated)',
              border: '1px solid var(--adm-border)',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--adm-text-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <img
              src={debutante.avatarUrl}
              alt={debutante.name}
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid var(--adm-accent)',
                boxShadow: '0 0 20px rgba(212,175,55,0.3)',
              }}
            />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0, letterSpacing: '-0.3px' }}>
                  {debutante.name}
                </h2>
                <span style={{
                  background: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid rgba(99, 102, 241, 0.35)',
                  color: '#818cf8',
                  borderRadius: '8px',
                  padding: '3px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  <Building2 size={13} /> {venue?.name || 'Casa não vinculada'}
                </span>
                {debutante.hasJourneyEnabled ? (
                  <span style={{
                    background: 'var(--adm-accent-bg)',
                    border: '1px solid var(--adm-accent)',
                    color: 'var(--adm-accent)',
                    borderRadius: '12px',
                    padding: '3px 10px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    <Sparkles size={12} /> Jornada VIP Ativa
                  </span>
                ) : (
                  <span style={{
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    color: 'var(--adm-text-muted)',
                    borderRadius: '12px',
                    padding: '3px 10px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                  }}>
                    Apenas Convidados & Agenda
                  </span>
                )}
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <span>📅 Festa: <strong>{debutante.partyDate.split('-').reverse().join('/')}</strong> ({debutante.partyDaysLeft} dias restantes)</span>
                <span>📱 {debutante.phone}</span>
                {debutante.email && <span>✉️ {debutante.email}</span>}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleOpenApp}
                className="adm-btn-primary"
                style={{
                  padding: '8px 16px',
                  borderRadius: '12px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <ExternalLink size={14} />
                <span>Visualizar App</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                style={{
                  background: copied ? 'var(--adm-green)' : 'var(--adm-bg-input)',
                  border: `1px solid ${copied ? 'var(--adm-green)' : 'var(--adm-border)'}`,
                  color: copied ? '#FFF' : 'var(--adm-text-title)',
                  borderRadius: '12px',
                  padding: '8px 14px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {copied ? <Check size={14} /> : <Share2 size={14} />}
                <span>{copied ? 'Copiado!' : 'Copiar Link'}</span>
              </button>

              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  style={{
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    color: 'var(--adm-text-title)',
                    borderRadius: '12px',
                    padding: '8px 14px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Edit3 size={14} />
                  <span>Editar</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '10px',
            marginTop: '20px',
          }}>
            <div style={{ background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '12px', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Convidados Confirmados</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>
                {debutante.guests.filter(g => g.status === 'confirmed').length} / {debutante.currentGuestLimit}
              </div>
            </div>

            <div style={{ background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '12px', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.66rem', color: 'var(--adm-accent)', textTransform: 'uppercase', fontWeight: 700 }}>Total de Indicações</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--adm-accent)' }}>
                {totalReferrals} ({validReferralsCount} válidas)
              </div>
            </div>

            <div style={{ background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '12px', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.66rem', color: 'var(--adm-green)', textTransform: 'uppercase', fontWeight: 700 }}>Contratos Fechados</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--adm-green)' }}>
                {wonContractsCount} vendas VIP
              </div>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--adm-border)',
          padding: '0 28px',
          background: 'var(--adm-bg-elevated)',
          gap: '20px',
        }}>
          {[
            { id: 'rewards', label: 'Prêmios & Conquistas', icon: <Gift size={15} /> },
            { id: 'referrals', label: `Amigas Indicadas (${totalReferrals})`, icon: <Users size={15} /> },
            { id: 'guests', label: `Lista de Convidados (${debutante.guests.length})`, icon: <CheckCircle2 size={15} /> },
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === t.id ? '2.5px solid var(--adm-accent)' : '2.5px solid transparent',
                color: activeTab === t.id ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                fontWeight: activeTab === t.id ? 800 : 600,
                fontSize: '0.82rem',
                padding: '14px 4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ padding: '24px 28px', flex: 1, overflowY: 'auto' }}>
          {/* TAB 1: REWARDS & CONQUESTS */}
          {activeTab === 'rewards' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={18} color="var(--adm-accent)" />
                  <span>Benefícios da Jornada por Pontos de Indicação</span>
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', margin: 0 }}>
                  A debutante acumulou {validReferralsCount} pontos válidos até o momento.
                </p>
              </div>

              {(!debutante.milestones || debutante.milestones.length === 0) ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--adm-text-muted)', background: 'var(--adm-bg-input)', borderRadius: '14px' }}>
                  Nenhum modelo de jornada vinculado a esta aniversariante.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
                  {debutante.milestones.map((m, idx) => {
                    const isUnlocked = validReferralsCount >= m.requiredReferrals;
                    return (
                      <div
                        key={m.id || idx}
                        style={{
                          background: isUnlocked ? 'rgba(212, 175, 55, 0.08)' : 'var(--adm-bg-input)',
                          border: `1.5px solid ${isUnlocked ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                          borderRadius: '16px',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          position: 'relative',
                        }}
                      >
                        {isUnlocked && (
                          <span style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            background: 'var(--adm-accent)',
                            color: '#000',
                            fontWeight: 900,
                            fontSize: '0.64rem',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}>
                            <Check size={11} /> CONQUISTADO
                          </span>
                        )}

                        {m.rewardImageUrl && (
                          <img
                            src={m.rewardImageUrl}
                            alt={m.rewardTitle}
                            style={{
                              width: '100%',
                              height: '110px',
                              borderRadius: '10px',
                              objectFit: 'cover',
                              opacity: isUnlocked ? 1 : 0.6,
                            }}
                          />
                        )}

                        <div>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: isUnlocked ? 'var(--adm-accent)' : 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
                            {m.requiredReferrals} Pontos Exigidos
                          </span>
                          <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: '2px 0 4px 0' }}>
                            {m.rewardTitle}
                          </h4>
                          <p style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', margin: 0, lineHeight: 1.4 }}>
                            {m.rewardDescription}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* VIP Gifts for Sales */}
              <div style={{ marginTop: '10px' }}>
                <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Crown size={18} color="#EC4899" />
                  <span>Presentes VIPs por Contratos Fechados</span>
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', margin: 0 }}>
                  A aniversariante fechou {wonContractsCount} contratos através de suas indicações.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px', marginTop: '14px' }}>
                  {(debutante.vipRewards || []).map((v, idx) => {
                    const isUnlocked = wonContractsCount >= v.requiredSales;
                    return (
                      <div
                        key={v.id || idx}
                        style={{
                          background: isUnlocked ? 'rgba(34, 197, 94, 0.08)' : 'var(--adm-bg-input)',
                          border: `1.5px solid ${isUnlocked ? 'var(--adm-green)' : 'var(--adm-border)'}`,
                          borderRadius: '16px',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          position: 'relative',
                        }}
                      >
                        {isUnlocked && (
                          <span style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            background: 'var(--adm-green)',
                            color: '#FFF',
                            fontWeight: 900,
                            fontSize: '0.64rem',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}>
                            <Check size={11} /> LIBERADO
                          </span>
                        )}

                        {v.imageUrl && (
                          <img
                            src={v.imageUrl}
                            alt={v.name}
                            style={{
                              width: '100%',
                              height: '110px',
                              borderRadius: '10px',
                              objectFit: 'cover',
                              opacity: isUnlocked ? 1 : 0.6,
                            }}
                          />
                        )}

                        <div>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: isUnlocked ? 'var(--adm-green)' : 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
                            {v.requiredSales} {v.requiredSales === 1 ? 'Venda Exigida' : 'Vendas Exigidas'}
                          </span>
                          <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: '2px 0 4px 0' }}>
                            {v.name}
                          </h4>
                          <p style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', margin: 0, lineHeight: 1.4 }}>
                            {v.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REFERRALS MANAGEMENT */}
          {activeTab === 'referrals' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                    Amigas Indicadas Pela Aniversariante
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)', margin: '2px 0 0 0' }}>
                    Valide as indicações para liberar os pontos de benefícios da debutante no sistema.
                  </p>
                </div>
              </div>

              {(!debutante.referrals || debutante.referrals.length === 0) ? (
                <div style={{ padding: '36px', textAlign: 'center', color: 'var(--adm-text-muted)', background: 'var(--adm-bg-input)', borderRadius: '16px' }}>
                  <Users size={36} color="var(--adm-accent)" style={{ margin: '0 auto 8px auto', opacity: 0.6 }} />
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>Nenhuma indicação registrada</div>
                  <p style={{ fontSize: '0.78rem', margin: '4px 0 0 0' }}>A debutante ainda não enviou contatos de amigas pelo aplicativo.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {debutante.referrals.map((ref, idx) => {
                    const isValid = ref.status === 'validated';

                    return (
                      <div
                        key={ref.id || idx}
                        style={{
                          background: 'var(--adm-bg-input)',
                          border: `1px solid ${isValid ? 'rgba(34, 197, 94, 0.3)' : 'var(--adm-border)'}`,
                          borderRadius: '12px',
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: isValid ? 'rgba(34, 197, 94, 0.15)' : 'var(--adm-bg-card)',
                            border: `1px solid ${isValid ? 'var(--adm-green)' : 'var(--adm-border)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isValid ? 'var(--adm-green)' : 'var(--adm-text-muted)',
                            fontWeight: 800,
                            fontSize: '0.82rem',
                          }}>
                            {ref.name.charAt(0).toUpperCase()}
                          </div>

                          <div>
                            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                              {ref.name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>📱 {ref.phone}</span>
                              {ref.createdAt && <span>• Enviado em {ref.createdAt.split('T')[0].split('-').reverse().join('/')}</span>}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleReferralStatus(idx)}
                            style={{
                              background: isValid ? 'var(--adm-green)' : 'var(--adm-bg-elevated)',
                              border: `1px solid ${isValid ? 'var(--adm-green)' : 'var(--adm-border)'}`,
                              color: isValid ? '#FFF' : 'var(--adm-text-muted)',
                              borderRadius: '10px',
                              padding: '6px 12px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {isValid ? <Check size={13} /> : <Clock size={13} />}
                            <span>{isValid ? 'Indicação Validada (+1 pt)' : 'Pendente (Clique p/ Validar)'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GUESTS LIST */}
          {activeTab === 'guests' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                Convidados Cadastrados ({debutante.guests.length} / {debutante.currentGuestLimit})
              </h3>
              {debutante.guests.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--adm-text-muted)', background: 'var(--adm-bg-input)', borderRadius: '14px' }}>
                  Nenhum convidado adicionado ainda pela debutante.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {debutante.guests.map((g, idx) => (
                    <div key={g.id || idx} style={{
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                        {g.name}
                      </div>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: g.status === 'confirmed' ? 'rgba(34, 197, 94, 0.15)' : 'var(--adm-bg-card)',
                        color: g.status === 'confirmed' ? 'var(--adm-green)' : 'var(--adm-text-muted)',
                      }}>
                        {g.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
