import React, { useState } from 'react';
import { 
  ArrowLeft, Crown, Gift, Users, Sparkles, CheckCircle2, 
  ExternalLink, Building2, Check,
  Share2, Award, Clock, Edit3
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import type { DebutanteAccount, Venue } from '../../types/admin';

interface AdminDebutanteDetailViewProps {
  debutante: DebutanteAccount;
  venue?: Venue;
  onBack: () => void;
  onEdit: () => void;
  onOpenLead?: (leadId: string) => void;
}

export const AdminDebutanteDetailView: React.FC<AdminDebutanteDetailViewProps> = ({
  debutante,
  venue,
  onBack,
  onEdit,
  onOpenLead,
}) => {
  const { leads } = useAdminState();
  const [activeTab, setActiveTab] = useState<'rewards' | 'referrals' | 'guests'>('rewards');
  const [copied, setCopied] = useState(false);

  const validReferralsCount = debutante.referrals?.filter(r => r.status === 'validated').length || 0;
  const totalReferrals = debutante.referrals?.length || 0;
  const wonContractsCount = debutante.convertedReferralSales || 0;

  const handleCopyLink = () => {
    const fullUrl = `${window.location.origin}/?debutante=${encodeURIComponent(debutante.slug)}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenApp = () => {
    window.open(`/?debutante=${encodeURIComponent(debutante.slug)}`, '_blank');
  };

  // Helper to map stage to readable Portuguese label & badge colors
  const getStageBadge = (stage?: string) => {
    switch (stage) {
      case 'new_lead':
        return { label: 'Novo Lead', bg: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA', border: 'rgba(59, 130, 246, 0.3)' };
      case 'in_analysis':
        return { label: 'Em Análise', bg: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', border: 'rgba(245, 158, 11, 0.3)' };
      case 'meeting_scheduled':
        return { label: 'Reunião Agendada', bg: 'rgba(168, 85, 247, 0.15)', color: '#C084FC', border: 'rgba(168, 85, 247, 0.3)' };
      case 'contract_signed':
        return { label: 'Venda Fechada (VIP)', bg: 'rgba(16, 185, 129, 0.15)', color: '#34D399', border: 'rgba(16, 185, 129, 0.3)' };
      case 'lost':
        return { label: 'Perdido', bg: 'rgba(239, 68, 68, 0.15)', color: '#F87171', border: 'rgba(239, 68, 68, 0.3)' };
      default:
        return { label: 'Aguardando Contato', bg: 'rgba(255, 255, 255, 0.08)', color: 'var(--adm-text-muted)', border: 'var(--adm-border)' };
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      animation: 'fadeIn 0.2s ease-out',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* Top Breadcrumb & Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '12px',
            padding: '8px 16px',
            color: 'var(--adm-text-title)',
            fontSize: '0.82rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <ArrowLeft size={16} />
          <span>Voltar para Lista de Aniversariantes</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={onEdit}
            style={{
              background: 'var(--adm-bg-card)',
              border: '1px solid var(--adm-border)',
              borderRadius: '12px',
              padding: '8px 16px',
              color: 'var(--adm-text-title)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Edit3 size={15} />
            <span>Editar Cadastro</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            style={{
              background: copied ? 'var(--adm-green)' : 'var(--adm-bg-card)',
              border: `1px solid ${copied ? 'var(--adm-green)' : 'var(--adm-border)'}`,
              color: copied ? '#FFF' : 'var(--adm-text-title)',
              borderRadius: '12px',
              padding: '8px 16px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {copied ? <Check size={15} /> : <Share2 size={15} />}
            <span>{copied ? 'Link Copiado!' : 'Copiar Link Exclusivo'}</span>
          </button>

          <button
            type="button"
            onClick={() => window.open(`/?convite=${encodeURIComponent(debutante.slug)}`, '_blank')}
            style={{
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.08) 100%)',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              color: '#D4AF37',
              borderRadius: '12px',
              padding: '8px 16px',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Sparkles size={15} />
            <span>Ver Convite</span>
          </button>

          <button
            type="button"
            onClick={handleOpenApp}
            className="adm-btn-primary"
            style={{
              padding: '8px 18px',
              borderRadius: '12px',
              fontSize: '0.82rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ExternalLink size={15} />
            <span>Visualizar Aplicativo</span>
          </button>
        </div>
      </div>

      {/* Main Profile Header Card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(212,175,55,0.14) 0%, rgba(20,17,27,0.95) 100%)',
        border: '1.5px solid var(--adm-border)',
        borderRadius: '24px',
        padding: '28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <img
            src={debutante.avatarUrl}
            alt={debutante.name}
            style={{
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3.5px solid var(--adm-accent)',
              boxShadow: '0 0 24px rgba(212,175,55,0.35)',
              flexShrink: 0,
            }}
          />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0, letterSpacing: '-0.4px' }}>
                {debutante.name}
              </h1>
              <span style={{
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                color: '#818cf8',
                borderRadius: '8px',
                padding: '3px 10px',
                fontSize: '0.74rem',
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
                  fontSize: '0.72rem',
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
                  fontSize: '0.72rem',
                  fontWeight: 700,
                }}>
                  Apenas Convidados & Agenda
                </span>
              )}
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <span>📅 Data da Festa: <strong style={{ color: 'var(--adm-text-title)' }}>{debutante.partyDate.split('-').reverse().join('/')}</strong> (<strong style={{ color: 'var(--adm-accent)' }}>{debutante.partyDaysLeft} dias restantes</strong>)</span>
              <span>📱 Telefone: <strong style={{ color: 'var(--adm-text-title)' }}>{debutante.phone}</strong></span>
              {debutante.email && <span>✉️ E-mail: <strong style={{ color: 'var(--adm-text-title)' }}>{debutante.email}</strong></span>}
            </div>
          </div>
        </div>

        {/* Big Metrics Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          borderTop: '1px solid var(--adm-border)',
          paddingTop: '18px',
        }}>
          <div style={{ background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Convidados Confirmados</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--adm-text-title)', marginTop: '4px' }}>
              {debutante.guests.filter(g => g.status === 'confirmed').length} <span style={{ fontSize: '0.9rem', color: 'var(--adm-text-muted)' }}>/ {debutante.currentGuestLimit}</span>
            </div>
          </div>

          <div style={{ background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--adm-accent)', textTransform: 'uppercase', fontWeight: 700 }}>Indicações Enviadas</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--adm-accent)', marginTop: '4px' }}>
              {totalReferrals} <span style={{ fontSize: '0.85rem', color: 'var(--adm-text-muted)' }}>({validReferralsCount} validadas)</span>
            </div>
          </div>

          <div style={{ background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--adm-green)', textTransform: 'uppercase', fontWeight: 700 }}>Contratos Fechados</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--adm-green)', marginTop: '4px' }}>
              {wonContractsCount} <span style={{ fontSize: '0.85rem', color: 'var(--adm-text-muted)' }}>vendas VIP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1.5px solid var(--adm-border)',
        gap: '24px',
        paddingLeft: '6px',
      }}>
        {[
          { id: 'rewards', label: 'Prêmios & Benefícios da Jornada', icon: <Gift size={16} /> },
          { id: 'referrals', label: `Amigas Indicadas (${totalReferrals})`, icon: <Users size={16} /> },
          { id: 'guests', label: `Lista de Convidados (${debutante.guests.length})`, icon: <CheckCircle2 size={16} /> },
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
              fontSize: '0.86rem',
              padding: '12px 4px',
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* TAB 1: REWARDS & CONQUESTS (LIST VIEW) */}
        {activeTab === 'rewards' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={20} color="var(--adm-accent)" />
                <span>Lista de Benefícios & Metas de Indicação</span>
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', margin: 0 }}>
                A aniversariante possui <strong style={{ color: 'var(--adm-accent)' }}>{validReferralsCount} pontos válidos</strong>. Conforme o time comercial valida as indicações no funil, os benefícios são liberados automaticamente.
              </p>
            </div>

            {(!debutante.milestones || debutante.milestones.length === 0) ? (
              <div className="saas-card" style={{ padding: '36px', textAlign: 'center', color: 'var(--adm-text-muted)' }}>
                Nenhum modelo de jornada vinculado a esta aniversariante.
              </div>
            ) : (
              <div style={{
                background: 'var(--adm-bg-card)',
                border: '1px solid var(--adm-border)',
                borderRadius: '16px',
                overflow: 'hidden',
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr 140px 140px',
                  padding: '12px 18px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderBottom: '1px solid var(--adm-border)',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: 'var(--adm-text-muted)',
                  textTransform: 'uppercase',
                }}>
                  <span>Meta</span>
                  <span>Benefício / Prêmio</span>
                  <span style={{ textAlign: 'center' }}>Status</span>
                  <span style={{ textAlign: 'right' }}>Situação</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {debutante.milestones.map((m, idx) => {
                    const isUnlocked = validReferralsCount >= m.requiredReferrals;
                    const diff = m.requiredReferrals - validReferralsCount;

                    return (
                      <div
                        key={m.id || idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '80px 1fr 140px 140px',
                          alignItems: 'center',
                          padding: '14px 18px',
                          borderBottom: idx < debutante.milestones.length - 1 ? '1px solid var(--adm-border)' : 'none',
                          background: isUnlocked ? 'rgba(212, 175, 55, 0.04)' : 'transparent',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {/* Meta */}
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '42px',
                          height: '32px',
                          borderRadius: '8px',
                          background: isUnlocked ? 'var(--adm-accent-bg)' : 'var(--adm-bg-input)',
                          border: `1px solid ${isUnlocked ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                          color: isUnlocked ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                          fontWeight: 900,
                          fontSize: '0.82rem',
                        }}>
                          {m.requiredReferrals} pts
                        </div>

                        {/* Title & Description */}
                        <div style={{ paddingRight: '16px' }}>
                          <div style={{ fontSize: '0.92rem', fontWeight: 800, color: isUnlocked ? 'var(--adm-text-title)' : 'var(--adm-text-body)' }}>
                            {m.rewardTitle}
                          </div>
                          {m.rewardDescription && (
                            <div style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)', marginTop: '2px', lineHeight: 1.4 }}>
                              {m.rewardDescription}
                            </div>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          {isUnlocked ? (
                            <span style={{
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#10B981',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              borderRadius: '8px',
                              padding: '4px 10px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}>
                              <Check size={12} /> Conquistado
                            </span>
                          ) : (
                            <span style={{
                              background: 'var(--adm-bg-input)',
                              color: 'var(--adm-text-muted)',
                              border: '1px solid var(--adm-border)',
                              borderRadius: '8px',
                              padding: '4px 10px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}>
                              <Clock size={12} /> Pendente
                            </span>
                          )}
                        </div>

                        {/* Situação / Progresso */}
                        <div style={{ textAlign: 'right', fontSize: '0.78rem', fontWeight: 700 }}>
                          {isUnlocked ? (
                            <span style={{ color: 'var(--adm-accent)' }}>Liberado na festa</span>
                          ) : (
                            <span style={{ color: 'var(--adm-text-muted)' }}>Faltam {diff} {diff === 1 ? 'indicação' : 'indicações'}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VIP Gifts (Only if configured) */}
            {debutante.vipRewards && debutante.vipRewards.length > 0 && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Crown size={18} color="#EC4899" />
                    <span>Presentes VIPs por Vendas Fechadas</span>
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)', margin: 0 }}>
                    Contratos fechados por amigas indicadas: <strong style={{ color: 'var(--adm-green)' }}>{wonContractsCount} vendas VIP</strong>.
                  </p>
                </div>

                <div style={{
                  background: 'var(--adm-bg-card)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '90px 1fr 140px 140px',
                    padding: '12px 18px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderBottom: '1px solid var(--adm-border)',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: 'var(--adm-text-muted)',
                    textTransform: 'uppercase',
                  }}>
                    <span>Meta</span>
                    <span>Presente VIP</span>
                    <span style={{ textAlign: 'center' }}>Status</span>
                    <span style={{ textAlign: 'right' }}>Situação</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {debutante.vipRewards.map((v, idx) => {
                      const isUnlocked = wonContractsCount >= v.requiredSales;
                      const diff = v.requiredSales - wonContractsCount;

                      return (
                        <div
                          key={v.id || idx}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '90px 1fr 140px 140px',
                            alignItems: 'center',
                            padding: '14px 18px',
                            borderBottom: idx < debutante.vipRewards.length - 1 ? '1px solid var(--adm-border)' : 'none',
                            background: isUnlocked ? 'rgba(34, 197, 94, 0.04)' : 'transparent',
                          }}
                        >
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '56px',
                            height: '32px',
                            borderRadius: '8px',
                            background: isUnlocked ? 'rgba(34, 197, 94, 0.15)' : 'var(--adm-bg-input)',
                            border: `1px solid ${isUnlocked ? 'rgba(34, 197, 94, 0.4)' : 'var(--adm-border)'}`,
                            color: isUnlocked ? '#22C55E' : 'var(--adm-text-muted)',
                            fontWeight: 900,
                            fontSize: '0.8rem',
                          }}>
                            {v.requiredSales} {v.requiredSales === 1 ? 'venda' : 'vendas'}
                          </div>

                          <div style={{ paddingRight: '16px' }}>
                            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                              {v.name}
                            </div>
                            {v.description && (
                              <div style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                                {v.description}
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            {isUnlocked ? (
                              <span style={{
                                background: 'rgba(34, 197, 94, 0.15)',
                                color: '#22C55E',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                borderRadius: '8px',
                                padding: '4px 10px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}>
                                <Check size={12} /> Liberado
                              </span>
                            ) : (
                              <span style={{
                                background: 'var(--adm-bg-input)',
                                color: 'var(--adm-text-muted)',
                                border: '1px solid var(--adm-border)',
                                borderRadius: '8px',
                                padding: '4px 10px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                              }}>
                                Pendente
                              </span>
                            )}
                          </div>

                          <div style={{ textAlign: 'right', fontSize: '0.78rem', fontWeight: 700 }}>
                            {isUnlocked ? (
                              <span style={{ color: '#22C55E' }}>Presente Ganho</span>
                            ) : (
                              <span style={{ color: 'var(--adm-text-muted)' }}>Falta {diff} {diff === 1 ? 'venda' : 'vendas'}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: REFERRALS MANAGEMENT (COMMERCIAL VIEW) */}
        {activeTab === 'referrals' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                Amigas Indicadas Pela Aniversariante ({totalReferrals})
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', margin: '4px 0 0 0' }}>
                Acompanhe o andamento das indicações no funil de CRM. A validação e o fechamento de vendas são realizados pelo time comercial.
              </p>
            </div>

            {(!debutante.referrals || debutante.referrals.length === 0) ? (
              <div className="saas-card" style={{ padding: '48px', textAlign: 'center', color: 'var(--adm-text-muted)' }}>
                <Users size={38} color="var(--adm-accent)" style={{ margin: '0 auto 10px auto', opacity: 0.6 }} />
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>Nenhuma indicação registrada</div>
                <p style={{ fontSize: '0.82rem', margin: '6px 0 0 0' }}>A aniversariante ainda não enviou contatos de amigas pelo aplicativo.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {debutante.referrals.map((ref, idx) => {
                  const isValid = ref.status === 'validated';
                  
                  // Match with CRM Lead in Admin State
                  const matchedLead = leads.find(l => 
                    (ref.id && l.id === ref.id) ||
                    (ref.phone && l.phone && l.phone.replace(/\D/g, '') === ref.phone.replace(/\D/g, '')) ||
                    (l.debutanteId === debutante.id && l.name.toLowerCase().trim() === ref.name.toLowerCase().trim())
                  );

                  const stageBadge = getStageBadge(matchedLead?.stage);
                  const closerName = matchedLead?.closerName || matchedLead?.sdrName;
                  const dealValue = matchedLead?.dealValue;

                  return (
                    <div
                      key={ref.id || idx}
                      className="saas-card"
                      style={{
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px',
                        flexWrap: 'wrap',
                        border: `1.5px solid ${isValid ? 'rgba(16, 185, 129, 0.4)' : 'var(--adm-border)'}`,
                      }}
                    >
                      {/* Left: Contact Info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '240px', flex: 1 }}>
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          background: isValid ? 'rgba(16, 185, 129, 0.15)' : 'var(--adm-bg-input)',
                          border: `1px solid ${isValid ? '#10B981' : 'var(--adm-border)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isValid ? '#10B981' : 'var(--adm-text-muted)',
                          fontWeight: 800,
                          fontSize: '0.94rem',
                          flexShrink: 0,
                        }}>
                          {ref.name.charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                              {ref.name}
                            </span>
                            {isValid ? (
                              <span style={{
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#10B981',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                borderRadius: '6px',
                                padding: '1px 6px',
                                fontSize: '0.66rem',
                                fontWeight: 800,
                              }}>
                                Validada (+1 pt)
                              </span>
                            ) : (
                              <span style={{
                                background: 'rgba(245, 158, 11, 0.15)',
                                color: '#F59E0B',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                borderRadius: '6px',
                                padding: '1px 6px',
                                fontSize: '0.66rem',
                                fontWeight: 700,
                              }}>
                                Pendente Validação
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '3px' }}>
                            <span>📱 {ref.phone}</span>
                            {ref.createdAt && <span>• Enviado em {ref.createdAt.split('T')[0].split('-').reverse().join('/')}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Middle: CRM Status & Responsible */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        {/* Etapa Comercial */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                            Etapa no Funil
                          </span>
                          <span style={{
                            background: stageBadge.bg,
                            color: stageBadge.color,
                            border: `1px solid ${stageBadge.border}`,
                            borderRadius: '8px',
                            padding: '3px 8px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                          }}>
                            {stageBadge.label}
                          </span>
                        </div>

                        {/* Atendente */}
                        {closerName && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                              Responsável
                            </span>
                            <span style={{ fontSize: '0.76rem', color: 'var(--adm-text-title)', fontWeight: 700 }}>
                              👤 {closerName}
                            </span>
                          </div>
                        )}

                        {/* Deal Value if Closed */}
                        {Boolean(dealValue && dealValue > 0) && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '0.64rem', color: 'var(--adm-green)', textTransform: 'uppercase', fontWeight: 700 }}>
                              Valor do Contrato
                            </span>
                            <span style={{ fontSize: '0.82rem', color: 'var(--adm-green)', fontWeight: 900 }}>
                              R$ {dealValue?.toLocaleString('pt-BR')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Right: Navigate to Lead Action */}
                      <div>
                        {matchedLead && onOpenLead ? (
                          <button
                            type="button"
                            onClick={() => onOpenLead(matchedLead.id)}
                            style={{
                              background: 'rgba(212, 175, 55, 0.12)',
                              border: '1px solid rgba(212, 175, 55, 0.35)',
                              color: 'var(--adm-accent)',
                              borderRadius: '10px',
                              padding: '8px 14px',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <ExternalLink size={14} />
                            <span>Acessar Lead no Funil</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
                            Lead em processamento
                          </span>
                        )}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
              Convidados Cadastrados ({debutante.guests.length} / {debutante.currentGuestLimit})
            </h3>
            {debutante.guests.length === 0 ? (
              <div className="saas-card" style={{ padding: '36px', textAlign: 'center', color: 'var(--adm-text-muted)' }}>
                Nenhum convidado adicionado ainda pela aniversariante.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {debutante.guests.map((g, idx) => (
                  <div key={g.id || idx} className="saas-card" style={{
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                      {g.name}
                    </div>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: '8px',
                      background: g.status === 'confirmed' ? 'rgba(34, 197, 94, 0.15)' : 'var(--adm-bg-input)',
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
  );
};
