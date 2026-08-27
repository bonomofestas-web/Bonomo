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
}

export const AdminDebutanteDetailView: React.FC<AdminDebutanteDetailViewProps> = ({
  debutante,
  venue,
  onBack,
  onEdit,
}) => {
  const { updateDebutanteAccount } = useAdminState();
  const [activeTab, setActiveTab] = useState<'rewards' | 'referrals' | 'guests'>('rewards');
  const [copied, setCopied] = useState(false);

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
        {/* TAB 1: REWARDS & CONQUESTS */}
        {activeTab === 'rewards' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={20} color="var(--adm-accent)" />
                <span>Metas & Prêmios por Pontos de Indicação</span>
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', margin: 0 }}>
                A aniversariante acumulou <strong style={{ color: 'var(--adm-accent)' }}>{validReferralsCount} pontos válidos</strong>. Conforme você valida as indicações na aba ao lado, os prêmios são liberados automaticamente.
              </p>
            </div>

            {(!debutante.milestones || debutante.milestones.length === 0) ? (
              <div className="saas-card" style={{ padding: '36px', textAlign: 'center', color: 'var(--adm-text-muted)' }}>
                Nenhum modelo de jornada vinculado a esta aniversariante.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {debutante.milestones.map((m, idx) => {
                  const isUnlocked = validReferralsCount >= m.requiredReferrals;
                  return (
                    <div
                      key={m.id || idx}
                      style={{
                        background: isUnlocked ? 'rgba(212, 175, 55, 0.08)' : 'var(--adm-bg-card)',
                        border: `1.5px solid ${isUnlocked ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                        borderRadius: '18px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        position: 'relative',
                        boxShadow: isUnlocked ? '0 8px 24px rgba(212, 175, 55, 0.15)' : 'none',
                      }}
                    >
                      {isUnlocked && (
                        <span style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          background: 'var(--adm-accent)',
                          color: '#000',
                          fontWeight: 900,
                          fontSize: '0.66rem',
                          padding: '3px 10px',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: '0 2px 8px rgba(212,175,55,0.4)',
                        }}>
                          <Check size={12} /> CONQUISTADO
                        </span>
                      )}

                      {m.rewardImageUrl && (
                        <img
                          src={m.rewardImageUrl}
                          alt={m.rewardTitle}
                          style={{
                            width: '100%',
                            height: '140px',
                            borderRadius: '12px',
                            objectFit: 'cover',
                            opacity: isUnlocked ? 1 : 0.65,
                          }}
                        />
                      )}

                      <div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: isUnlocked ? 'var(--adm-accent)' : 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
                          {m.requiredReferrals} Pontos Exigidos
                        </span>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: '4px 0 6px 0' }}>
                          {m.rewardTitle}
                        </h4>
                        <p style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', margin: 0, lineHeight: 1.5 }}>
                          {m.rewardDescription}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* VIP Gifts for Sales */}
            <div style={{ marginTop: '14px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Crown size={20} color="#EC4899" />
                <span>Presentes VIPs por Contratos de Festas Fechados</span>
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', margin: 0 }}>
                A debutante fechou <strong style={{ color: 'var(--adm-green)' }}>{wonContractsCount} contratos</strong> de festas através de suas indicações.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' }}>
                {(debutante.vipRewards || []).map((v, idx) => {
                  const isUnlocked = wonContractsCount >= v.requiredSales;
                  return (
                    <div
                      key={v.id || idx}
                      style={{
                        background: isUnlocked ? 'rgba(34, 197, 94, 0.08)' : 'var(--adm-bg-card)',
                        border: `1.5px solid ${isUnlocked ? 'var(--adm-green)' : 'var(--adm-border)'}`,
                        borderRadius: '18px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        position: 'relative',
                        boxShadow: isUnlocked ? '0 8px 24px rgba(34, 197, 94, 0.15)' : 'none',
                      }}
                    >
                      {isUnlocked && (
                        <span style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          background: 'var(--adm-green)',
                          color: '#FFF',
                          fontWeight: 900,
                          fontSize: '0.66rem',
                          padding: '3px 10px',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}>
                          <Check size={12} /> LIBERADO
                        </span>
                      )}

                      {v.imageUrl && (
                        <img
                          src={v.imageUrl}
                          alt={v.name}
                          style={{
                            width: '100%',
                            height: '140px',
                            borderRadius: '12px',
                            objectFit: 'cover',
                            opacity: isUnlocked ? 1 : 0.65,
                          }}
                        />
                      )}

                      <div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: isUnlocked ? 'var(--adm-green)' : 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
                          {v.requiredSales} {v.requiredSales === 1 ? 'Venda Exigida' : 'Vendas Exigidas'}
                        </span>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: '4px 0 6px 0' }}>
                          {v.name}
                        </h4>
                        <p style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', margin: 0, lineHeight: 1.5 }}>
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
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                Amigas Indicadas Pela Aniversariante
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', margin: '4px 0 0 0' }}>
                Valide as indicações para liberar os pontos de benefícios da aniversariante em tempo real.
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

                  return (
                    <div
                      key={ref.id || idx}
                      className="saas-card"
                      style={{
                        padding: '14px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '14px',
                        border: `1.5px solid ${isValid ? 'rgba(34, 197, 94, 0.4)' : 'var(--adm-border)'}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: isValid ? 'rgba(34, 197, 94, 0.15)' : 'var(--adm-bg-input)',
                          border: `1px solid ${isValid ? 'var(--adm-green)' : 'var(--adm-border)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isValid ? 'var(--adm-green)' : 'var(--adm-text-muted)',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                        }}>
                          {ref.name.charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <div style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                            {ref.name}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
                            <span>📱 {ref.phone}</span>
                            {ref.createdAt && <span>• Enviado em {ref.createdAt.split('T')[0].split('-').reverse().join('/')}</span>}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleReferralStatus(idx)}
                        style={{
                          background: isValid ? 'var(--adm-green)' : 'var(--adm-bg-elevated)',
                          border: `1px solid ${isValid ? 'var(--adm-green)' : 'var(--adm-border)'}`,
                          color: isValid ? '#FFF' : 'var(--adm-text-title)',
                          borderRadius: '10px',
                          padding: '7px 14px',
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                          boxShadow: isValid ? '0 2px 10px rgba(34,197,94,0.3)' : 'none',
                        }}
                      >
                        {isValid ? <Check size={14} /> : <Clock size={14} />}
                        <span>{isValid ? 'Indicação Validada (+1 pt)' : 'Pendente (Clique p/ Validar)'}</span>
                      </button>
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
