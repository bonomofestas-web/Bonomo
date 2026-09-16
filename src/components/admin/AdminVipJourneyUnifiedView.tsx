import React, { useState, useMemo } from 'react';
import { 
  Crown, Gift, Target, Sparkles, ExternalLink, ArrowLeft,
  Users, Award, Check, Share2, UserPlus, TrendingUp
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { AdminBenefitsCatalogView } from './AdminBenefitsCatalogView';
import { AdminJourneysConfigView } from './AdminJourneysConfigView';
import { formatPhone } from '../../utils/phoneFormatter';
import type { DebutanteAccount } from '../../types/admin';

interface AdminVipJourneyUnifiedViewProps {
  onOpenDebutanteApp?: (slug: string) => void;
  onOpenDebutanteModal?: (deb: DebutanteAccount) => void;
  onOpenLead?: (leadId: string) => void;
}

export const AdminVipJourneyUnifiedView: React.FC<AdminVipJourneyUnifiedViewProps> = ({
  onOpenDebutanteApp,
  onOpenLead,
}) => {
  const { debutantes, venues, activeVenueId, leads, collaborators, templates } = useAdminState();
  const [activeTab, setActiveTab] = useState<'debutantes_15' | 'rewards_catalog' | 'journeys_config'>('debutantes_15');
  const [selectedDebId, setSelectedDebId] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Filtrar exclusivamente debutantes de 15 anos que têm Jornada VIP ativada
  const vipDebutantes = useMemo<DebutanteAccount[]>(() => {
    return debutantes.filter((d: DebutanteAccount) => {
      if (activeVenueId && activeVenueId !== 'all' && d.venueId !== activeVenueId) return false;
      const is15 = !d.eventType || d.eventType === 'debutante_15';
      return is15 && d.hasJourneyEnabled && d.status !== 'inactive';
    });
  }, [debutantes, activeVenueId]);

  // Debutante selecionada para inspeção detalhada
  const selectedDebutante = useMemo<DebutanteAccount | null>(() => {
    if (!selectedDebId) return null;
    return debutantes.find((d: DebutanteAccount) => d.id === selectedDebId) || null;
  }, [debutantes, selectedDebId]);

  // Métricas agregadas do programa de indicação VIP
  const overallStats = useMemo(() => {
    let totalRefs = 0;
    let validRefs = 0;
    let wonSales = 0;
    let totalMilestonesUnlocked = 0;

    vipDebutantes.forEach(deb => {
      const vRefs = deb.referrals?.filter(r => r.status === 'validated').length || deb.validReferrals || 0;
      totalRefs += deb.referrals?.length || 0;
      validRefs += vRefs;
      wonSales += deb.convertedReferralSales || 0;
      const unlocked = (deb.milestones || []).filter(m => vRefs >= m.requiredReferrals).length;
      totalMilestonesUnlocked += unlocked;
    });

    return { totalRefs, validRefs, wonSales, totalMilestonesUnlocked };
  }, [vipDebutantes]);

  const handleCopyLink = (deb: DebutanteAccount) => {
    const fullUrl = `${window.location.origin}/?debutante=${encodeURIComponent(deb.slug)}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(deb.slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  // Helper de badges CRM
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
      padding: '24px 24px 60px 24px',
      width: '100%',
      maxWidth: '1440px',
      margin: '0 auto',
      boxSizing: 'border-box',
      animation: 'fadeIn 0.2s ease-out',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Header com Navegação de Abas Unificadas */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        borderBottom: '1.5px solid var(--adm-border)',
        paddingBottom: '18px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'var(--adm-gold-bg)',
            border: '1.5px solid var(--adm-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 18px rgba(212,175,55,0.3)',
            flexShrink: 0,
          }}>
            <Crown size={24} color="var(--adm-accent)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0, letterSpacing: '-0.3px' }}>
                Jornada VIP • Programa de Indicação
              </h1>
              <span style={{
                background: 'rgba(212, 175, 55, 0.15)',
                color: 'var(--adm-accent)',
                border: '1px solid rgba(212, 175, 55, 0.4)',
                borderRadius: '8px',
                padding: '2px 8px',
                fontSize: '0.68rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                <Sparkles size={11} />
                EXCLUSIVO 15 ANOS
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)', margin: '4px 0 0 0' }}>
              Gestão centralizada das debutantes com aplicativo VIP, acompanhamento de metas, prêmios e leads de amigas indicadas.
            </p>
          </div>
        </div>

        {/* 3 Abas Principais */}
        <div style={{
          display: 'flex',
          background: 'var(--adm-bg-card)',
          borderRadius: '12px',
          padding: '4px',
          border: '1px solid var(--adm-border)',
          gap: '4px',
        }}>
          <button
            type="button"
            onClick={() => {
              setActiveTab('debutantes_15');
              setSelectedDebId(null);
            }}
            style={{
              background: activeTab === 'debutantes_15' ? 'var(--adm-accent)' : 'transparent',
              color: activeTab === 'debutantes_15' ? '#000000' : 'var(--adm-text-muted)',
              border: 'none',
              borderRadius: '9px',
              padding: '8px 16px',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <UserPlus size={14} />
            <span>Debutantes VIP</span>
            <span style={{
              background: activeTab === 'debutantes_15' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)',
              padding: '1px 6px',
              borderRadius: '10px',
              fontSize: '0.66rem',
            }}>
              {vipDebutantes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('rewards_catalog');
              setSelectedDebId(null);
            }}
            style={{
              background: activeTab === 'rewards_catalog' ? 'var(--adm-accent)' : 'transparent',
              color: activeTab === 'rewards_catalog' ? '#000000' : 'var(--adm-text-muted)',
              border: 'none',
              borderRadius: '9px',
              padding: '8px 16px',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <Gift size={14} />
            <span>Catálogo de Prêmios</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('journeys_config');
              setSelectedDebId(null);
            }}
            style={{
              background: activeTab === 'journeys_config' ? 'var(--adm-accent)' : 'transparent',
              color: activeTab === 'journeys_config' ? '#000000' : 'var(--adm-text-muted)',
              border: 'none',
              borderRadius: '9px',
              padding: '8px 16px',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <Target size={14} />
            <span>Jornadas & Metas</span>
          </button>
        </div>
      </div>

      {/* Render Conteúdo da Aba 1: Debutantes VIP */}
      {activeTab === 'debutantes_15' && (
        selectedDebutante ? (
          /* ── DETALHES COMPLETOS DA JORNADA VIP DA DEBUTANTE SELECIONADA ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.2s ease-out' }}>
            {/* Top Back Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setSelectedDebId(null)}
                style={{
                  background: 'var(--adm-bg-card)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '12px',
                  padding: '8px 16px',
                  color: 'var(--adm-text-title)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                }}
              >
                <ArrowLeft size={16} />
                <span>Voltar para Lista de Debutantes VIP</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => handleCopyLink(selectedDebutante)}
                  style={{
                    background: copiedSlug === selectedDebutante.slug ? 'var(--adm-green)' : 'var(--adm-bg-card)',
                    border: `1px solid ${copiedSlug === selectedDebutante.slug ? 'var(--adm-green)' : 'var(--adm-border)'}`,
                    color: copiedSlug === selectedDebutante.slug ? '#FFF' : 'var(--adm-text-title)',
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
                  {copiedSlug === selectedDebutante.slug ? <Check size={15} /> : <Share2 size={15} />}
                  <span>{copiedSlug === selectedDebutante.slug ? 'Link Copiado!' : 'Copiar Link Exclusivo'}</span>
                </button>

                {onOpenDebutanteApp && selectedDebutante.slug && (
                  <button
                    type="button"
                    onClick={() => onOpenDebutanteApp(selectedDebutante.slug)}
                    className="adm-btn-primary"
                    style={{
                      borderRadius: '12px',
                      padding: '8px 16px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <ExternalLink size={15} />
                    <span>Abrir App da Debutante</span>
                  </button>
                )}
              </div>
            </div>

            {/* Profile Hero Card */}
            {(() => {
              const venue = venues.find(v => v.id === selectedDebutante.venueId);
              const validRefsCount = selectedDebutante.referrals?.filter(r => r.status === 'validated').length || selectedDebutante.validReferrals || 0;
              const totalRefsCount = selectedDebutante.referrals?.length || 0;
              const wonContractsCount = selectedDebutante.convertedReferralSales || 0;
              const linkedTemplate = selectedDebutante.journeyTemplateId 
                ? templates.find(t => t.id === selectedDebutante.journeyTemplateId)
                : templates[0] || null;

              const milestonesList = selectedDebutante.milestones || linkedTemplate?.milestones || [];
              const vipRewardsList = selectedDebutante.vipRewards || linkedTemplate?.vipRewards || [];

              const conqueredMilestones = milestonesList.filter(m => validRefsCount >= m.requiredReferrals);
              const pendingMilestones = milestonesList.filter(m => validRefsCount < m.requiredReferrals);
              const conqueredVipRewards = vipRewardsList.filter(v => wonContractsCount >= v.requiredSales);

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Hero Header */}
                  <div className="saas-card" style={{
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    border: '1.5px solid rgba(212, 175, 55, 0.4)',
                    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.06) 0%, rgba(20, 16, 30, 0.6) 100%)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                        <div style={{ position: 'relative' }}>
                          <img
                            src={selectedDebutante.avatarUrl}
                            alt={selectedDebutante.name}
                            style={{
                              width: '74px',
                              height: '74px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '2.5px solid var(--adm-accent)',
                              boxShadow: '0 0 20px rgba(212, 175, 55, 0.4)',
                            }}
                          />
                          <div style={{
                            position: 'absolute',
                            top: -6,
                            right: -6,
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: 'var(--adm-accent)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#000',
                          }}>
                            <Crown size={14} />
                          </div>
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0 }}>
                              {selectedDebutante.name}
                            </h2>
                            <span style={{
                              background: 'rgba(212, 175, 55, 0.15)',
                              color: 'var(--adm-accent)',
                              border: '1px solid rgba(212, 175, 55, 0.4)',
                              borderRadius: '8px',
                              padding: '2px 8px',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                            }}>
                              VIP ATIVA
                            </span>
                          </div>

                          <div style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px', flexWrap: 'wrap' }}>
                            <span>📍 <strong>{venue?.name || 'Unidade'}</strong></span>
                            <span>📅 Festa: <strong>{new Date(selectedDebutante.partyDate + 'T12:00:00').toLocaleDateString('pt-BR')}</strong></span>
                            {selectedDebutante.phone && <span>📞 {formatPhone(selectedDebutante.phone)}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Progresso Card */}
                      <div style={{
                        background: 'rgba(0,0,0,0.35)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '16px',
                        padding: '14px 20px',
                        minWidth: '220px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                          <span style={{ color: 'var(--adm-text-muted)', fontWeight: 700 }}>Progresso da Jornada</span>
                          <strong style={{ color: 'var(--adm-accent)', fontSize: '0.96rem' }}>{selectedDebutante.journeyProgressPercentage || 0}%</strong>
                        </div>
                        <div style={{
                          height: '7px',
                          background: 'rgba(255,255,255,0.08)',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          marginTop: '6px',
                        }}>
                          <div style={{
                            width: `${Math.min(100, selectedDebutante.journeyProgressPercentage || 0)}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #D4AF37, #F3E5AB)',
                          }} />
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', marginTop: '6px', textAlign: 'center' }}>
                          {conqueredMilestones.length} de {milestonesList.length} metas alcançadas
                        </div>
                      </div>
                    </div>

                    {/* KPI Cards Row */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '12px',
                      borderTop: '1px solid var(--adm-border)',
                      paddingTop: '16px',
                    }}>
                      <div style={{ background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', borderRadius: '12px', padding: '12px 16px' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--adm-accent)', textTransform: 'uppercase', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <UserPlus size={13} /> Amigas Indicadas
                        </div>
                        <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--adm-text-title)', marginTop: '4px' }}>
                          {validRefsCount} <span style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>validadas ({totalRefsCount} total)</span>
                        </div>
                      </div>

                      <div style={{ background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', borderRadius: '12px', padding: '12px 16px' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--adm-green)', textTransform: 'uppercase', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <TrendingUp size={13} /> Vendas VIP Fechadas
                        </div>
                        <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--adm-green)', marginTop: '4px' }}>
                          {wonContractsCount} <span style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>contratos assinados</span>
                        </div>
                      </div>

                      <div style={{ background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', borderRadius: '12px', padding: '12px 16px' }}>
                        <div style={{ fontSize: '0.68rem', color: '#EC4899', textTransform: 'uppercase', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Gift size={13} /> Prêmios Conquistados
                        </div>
                        <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#EC4899', marginTop: '4px' }}>
                          {conqueredMilestones.length + conqueredVipRewards.length} <span style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>desbloqueados</span>
                        </div>
                      </div>

                      <div style={{ background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', borderRadius: '12px', padding: '12px 16px' }}>
                        <div style={{ fontSize: '0.68rem', color: '#60A5FA', textTransform: 'uppercase', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Target size={13} /> Modelo Vinculado
                        </div>
                        <div style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--adm-text-title)', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {linkedTemplate?.name || 'Jornada Padrão'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seção 1: Prêmios e Metas da Jornada */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Award size={20} color="var(--adm-accent)" />
                          <span>Metas e Prêmios da Jornada VIP</span>
                        </h3>
                        <p style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', margin: '3px 0 0 0' }}>
                          Acompanhe os prêmios liberados pelas metas de indicações e pelas vendas VIP geradas.
                        </p>
                      </div>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                      gap: '14px',
                    }}>
                      {/* Metas Desbloqueadas */}
                      {conqueredMilestones.map((m, idx) => (
                        <div key={m.id || idx} className="saas-card" style={{
                          padding: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          border: '1.5px solid rgba(212, 175, 55, 0.5)',
                          background: 'rgba(212, 175, 55, 0.05)',
                        }}>
                          {m.rewardImageUrl ? (
                            <img src={m.rewardImageUrl} alt={m.rewardTitle} style={{ width: '52px', height: '52px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'var(--adm-accent-bg)', color: 'var(--adm-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Gift size={24} />
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                                {m.rewardTitle}
                              </span>
                              <span style={{ fontSize: '0.66rem', color: '#10B981', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 6px', borderRadius: '6px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <Check size={11} /> Conquistado
                              </span>
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginTop: '3px' }}>
                              {m.rewardDescription || `Meta de ${m.requiredReferrals} indicações validadas`}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Próximas Metas a Desbloquear */}
                      {pendingMilestones.map((m, idx) => (
                        <div key={m.id || idx} className="saas-card" style={{
                          padding: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          border: '1px dashed var(--adm-border)',
                          opacity: 0.85,
                        }}>
                          {m.rewardImageUrl ? (
                            <img src={m.rewardImageUrl} alt={m.rewardTitle} style={{ width: '52px', height: '52px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0, filter: 'grayscale(60%)' }} />
                          ) : (
                            <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'var(--adm-bg-input)', color: 'var(--adm-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Gift size={24} />
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                              <span style={{ fontSize: '0.90rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                                {m.rewardTitle}
                              </span>
                              <span style={{ fontSize: '0.66rem', color: 'var(--adm-accent)', background: 'var(--adm-accent-bg)', padding: '2px 6px', borderRadius: '6px', fontWeight: 700 }}>
                                Faltam {m.requiredReferrals - validRefsCount}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginTop: '3px' }}>
                              Meta: {m.requiredReferrals} amigas validadas ({validRefsCount}/{m.requiredReferrals})
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Presentes VIPs Liberados por Vendas */}
                      {conqueredVipRewards.map((v, idx) => (
                        <div key={v.id || idx} className="saas-card" style={{
                          padding: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          border: '1.5px solid rgba(236, 72, 153, 0.4)',
                          background: 'rgba(236, 72, 153, 0.04)',
                        }}>
                          {v.imageUrl ? (
                            <img src={v.imageUrl} alt={v.name} style={{ width: '52px', height: '52px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'rgba(236, 72, 153, 0.15)', color: '#EC4899', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Crown size={24} />
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                                {v.name}
                              </span>
                              <span style={{ fontSize: '0.66rem', color: '#10B981', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 6px', borderRadius: '6px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <Check size={11} /> Venda Fechada
                              </span>
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginTop: '3px' }}>
                              {v.description || `${v.requiredSales} contrato(s) fechado(s)`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Seção 2: Amigas Indicadas & Status no CRM */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={20} color="var(--adm-accent)" />
                        <span>Amigas Indicadas pela Debutante ({totalRefsCount})</span>
                      </h3>
                      <p style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', margin: '3px 0 0 0' }}>
                        Acompanhe o status comercial de cada indicação no funil de CRM e o responsável pelo atendimento.
                      </p>
                    </div>

                    {(!selectedDebutante.referrals || selectedDebutante.referrals.length === 0) ? (
                      <div className="saas-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--adm-text-muted)' }}>
                        <Users size={36} color="var(--adm-accent)" style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                        <div style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>Nenhuma indicação cadastrada</div>
                        <p style={{ fontSize: '0.78rem', margin: '4px 0 0 0' }}>A debutante ainda não enviou amigas pelo app.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {selectedDebutante.referrals.map((ref, idx) => {
                          const isValid = ref.status === 'validated';
                          const matchedLead = leads.find(l => 
                            (ref.id && l.id === ref.id) ||
                            (ref.phone && l.phone && l.phone.replace(/\D/g, '') === ref.phone.replace(/\D/g, '')) ||
                            (l.debutanteId === selectedDebutante.id && l.name.toLowerCase().trim() === ref.name.toLowerCase().trim())
                          );

                          const stageBadge = getStageBadge(matchedLead?.stage);
                          const closerName = matchedLead?.closerName || matchedLead?.sdrName || matchedLead?.assignedTo;
                          const assignedCollab = collaborators.find(c => 
                            (closerName && c.name.toLowerCase() === closerName.toLowerCase()) || 
                            c.id === matchedLead?.sdrId || 
                            c.id === matchedLead?.closerId
                          );

                          return (
                            <div
                              key={ref.id || idx}
                              className="saas-card"
                              style={{
                                padding: '14px 18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '16px',
                                flexWrap: 'wrap',
                                border: `1.5px solid ${isValid ? 'rgba(16, 185, 129, 0.4)' : 'var(--adm-border)'}`,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px', flex: 1 }}>
                                <div style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '50%',
                                  background: isValid ? 'rgba(16, 185, 129, 0.15)' : 'var(--adm-bg-input)',
                                  border: `1px solid ${isValid ? '#10B981' : 'var(--adm-border)'}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: isValid ? '#10B981' : 'var(--adm-text-muted)',
                                  fontWeight: 800,
                                  fontSize: '0.90rem',
                                  flexShrink: 0,
                                }}>
                                  {ref.name.charAt(0).toUpperCase()}
                                </div>

                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                                      {ref.name}
                                    </span>
                                    {isValid ? (
                                      <span style={{
                                        background: 'rgba(16, 185, 129, 0.15)',
                                        color: '#10B981',
                                        border: '1px solid rgba(16, 185, 129, 0.3)',
                                        borderRadius: '6px',
                                        padding: '1px 6px',
                                        fontSize: '0.64rem',
                                        fontWeight: 800,
                                      }}>
                                        Validada (+1)
                                      </span>
                                    ) : (
                                      <span style={{
                                        background: 'rgba(245, 158, 11, 0.15)',
                                        color: '#F59E0B',
                                        border: '1px solid rgba(245, 158, 11, 0.3)',
                                        borderRadius: '6px',
                                        padding: '1px 6px',
                                        fontSize: '0.64rem',
                                        fontWeight: 700,
                                      }}>
                                        Pendente
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
                                    <span>📞 {formatPhone(ref.phone)}</span>
                                    {ref.createdAt && <span>• {ref.createdAt.split('T')[0].split('-').reverse().join('/')}</span>}
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontSize: '0.62rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                                    Etapa Funil
                                  </span>
                                  <span style={{
                                    background: stageBadge.bg,
                                    color: stageBadge.color,
                                    border: `1px solid ${stageBadge.border}`,
                                    borderRadius: '8px',
                                    padding: '2px 8px',
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                  }}>
                                    {stageBadge.label}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontSize: '0.62rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                                    Responsável
                                  </span>
                                  {closerName ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                      {assignedCollab?.avatarUrl ? (
                                        <img
                                          src={assignedCollab.avatarUrl}
                                          alt={assignedCollab.name}
                                          style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }}
                                        />
                                      ) : null}
                                      <span style={{ fontSize: '0.76rem', color: 'var(--adm-text-title)', fontWeight: 700 }}>
                                        {assignedCollab?.name || closerName}
                                      </span>
                                    </div>
                                  ) : (
                                    <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
                                      Não atribuído
                                    </span>
                                  )}
                                </div>

                                {matchedLead && onOpenLead && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenLead(matchedLead.id)}
                                    style={{
                                      background: 'rgba(212, 175, 55, 0.12)',
                                      border: '1px solid rgba(212, 175, 55, 0.35)',
                                      color: 'var(--adm-accent)',
                                      borderRadius: '8px',
                                      padding: '6px 12px',
                                      fontSize: '0.74rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                  >
                                    <ExternalLink size={12} />
                                    <span>Ver Lead</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          /* ── VISÃO GERAL: GRID DE DEBUTANTES VIP (SEM MOLDURA DE PREVIEW) ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* KPI Summary Cards Bar */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
            }}>
              <div className="saas-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--adm-accent-bg)', color: 'var(--adm-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Crown size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '0.70rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Debutantes VIP Ativas</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--adm-text-title)', marginTop: '2px' }}>
                    {vipDebutantes.length}
                  </div>
                </div>
              </div>

              <div className="saas-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.12)', color: '#60A5FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserPlus size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '0.70rem', color: '#60A5FA', textTransform: 'uppercase', fontWeight: 700 }}>Amigas Indicadas</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--adm-text-title)', marginTop: '2px' }}>
                    {overallStats.validRefs} <span style={{ fontSize: '0.85rem', color: 'var(--adm-text-muted)' }}>validadas ({overallStats.totalRefs} total)</span>
                  </div>
                </div>
              </div>

              <div className="saas-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '0.70rem', color: 'var(--adm-green)', textTransform: 'uppercase', fontWeight: 700 }}>Vendas Fechadas (VIP)</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--adm-green)', marginTop: '2px' }}>
                    {overallStats.wonSales} <span style={{ fontSize: '0.85rem', color: 'var(--adm-text-muted)' }}>contratos assinados</span>
                  </div>
                </div>
              </div>

              <div className="saas-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(236, 72, 153, 0.12)', color: '#EC4899', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Gift size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '0.70rem', color: '#EC4899', textTransform: 'uppercase', fontWeight: 700 }}>Metas Desbloqueadas</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--adm-text-title)', marginTop: '2px' }}>
                    {overallStats.totalMilestonesUnlocked} <span style={{ fontSize: '0.85rem', color: 'var(--adm-text-muted)' }}>prêmios</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Lista / Grid de Cards das Debutantes VIP */}
            {vipDebutantes.length === 0 ? (
              <div style={{
                background: 'var(--adm-bg-card)',
                border: '1px dashed var(--adm-border)',
                borderRadius: '16px',
                padding: '48px 20px',
                textAlign: 'center',
                color: 'var(--adm-text-muted)',
                fontSize: '0.86rem',
              }}>
                Nenhuma debutante com Jornada VIP ativa encontrada para a unidade selecionada.
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '16px',
              }}>
                {vipDebutantes.map((deb: DebutanteAccount) => {
                  const venue = venues.find(v => v.id === deb.venueId);
                  const validRefs = deb.referrals?.filter(r => r.status === 'validated').length || deb.validReferrals || 0;
                  const totalRefs = deb.referrals?.length || 0;
                  const wonSales = deb.convertedReferralSales || 0;

                  return (
                    <div
                      key={deb.id}
                      className="saas-card"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                        padding: '18px',
                        border: '1.5px solid var(--adm-border)',
                        background: 'var(--adm-bg-card)',
                        transition: 'all 0.18s ease',
                      }}
                    >
                      {/* Header do Card */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                          <div style={{ position: 'relative' }}>
                            <img
                              src={deb.avatarUrl}
                              alt={deb.name}
                              style={{
                                width: '46px',
                                height: '46px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '2px solid var(--adm-accent)',
                                flexShrink: 0,
                              }}
                            />
                            <div style={{
                              position: 'absolute',
                              top: -4,
                              right: -4,
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              background: 'var(--adm-accent)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#000',
                            }}>
                              <Crown size={10} />
                            </div>
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <h3 style={{ fontSize: '0.96rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {deb.name}
                            </h3>
                            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                              {venue?.name || 'Unidade'} • {new Date(deb.partyDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                        </div>

                        <span style={{
                          background: 'rgba(212, 175, 55, 0.15)',
                          color: 'var(--adm-accent)',
                          border: '1px solid rgba(212, 175, 55, 0.4)',
                          borderRadius: '8px',
                          padding: '2px 8px',
                          fontSize: '0.62rem',
                          fontWeight: 900,
                          flexShrink: 0,
                        }}>
                          VIP ATIVA
                        </span>
                      </div>

                      {/* Progresso & Métricas Rápidas */}
                      <div style={{
                        background: 'var(--adm-bg-input)',
                        borderRadius: '12px',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                          <span style={{ color: 'var(--adm-text-muted)', fontWeight: 700 }}>Progresso</span>
                          <strong style={{ color: 'var(--adm-accent)' }}>{deb.journeyProgressPercentage || 0}%</strong>
                        </div>
                        <div style={{
                          height: '5px',
                          background: 'rgba(255,255,255,0.08)',
                          borderRadius: '10px',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${Math.min(100, deb.journeyProgressPercentage || 0)}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #D4AF37, #F3E5AB)',
                          }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                          <span style={{ color: 'var(--adm-text-title)', fontWeight: 700 }}>
                            {validRefs} amigas ({totalRefs} envios)
                          </span>
                          <span style={{ color: 'var(--adm-green)', fontWeight: 700 }}>
                            {wonSales} vendas VIP
                          </span>
                        </div>
                      </div>

                      {/* Botões de Ação */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 'auto', paddingTop: '4px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedDebId(deb.id)}
                          style={{
                            flex: 1,
                            background: 'rgba(212, 175, 55, 0.12)',
                            border: '1px solid rgba(212, 175, 55, 0.4)',
                            color: 'var(--adm-accent)',
                            borderRadius: '10px',
                            padding: '8px 12px',
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <Crown size={13} />
                          <span>Ver Jornada VIP</span>
                        </button>

                        {onOpenDebutanteApp && deb.slug && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenDebutanteApp(deb.slug);
                            }}
                            style={{
                              background: 'var(--adm-bg-input)',
                              border: '1px solid var(--adm-border)',
                              color: 'var(--adm-text-title)',
                              borderRadius: '10px',
                              padding: '8px 12px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <ExternalLink size={13} color="var(--adm-accent)" />
                            <span>App</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )
      )}

      {activeTab === 'rewards_catalog' && (
        <AdminBenefitsCatalogView />
      )}

      {activeTab === 'journeys_config' && (
        <AdminJourneysConfigView />
      )}
    </div>
  );
};

