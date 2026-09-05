import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, Crown, Gift, Users, Sparkles, CheckCircle2, 
  ExternalLink, Building2, Check,
  Share2, Award, Edit3, Phone,
  Calendar, Eye, Plus, Trash2, X, MapPin
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { formatPhone } from '../../utils/phoneFormatter';
import { AdminAppointmentModal } from './AdminAppointmentModal';
import { AdminConfirmModal } from './AdminConfirmModal';
import type { DebutanteAccount, Venue } from '../../types/admin';
import type { Appointment } from '../../types';

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
  const { leads, collaborators, templates, deleteAppointmentForDebutante } = useAdminState();
  const [activeTab, setActiveTab] = useState<'rewards' | 'referrals' | 'guests' | 'appointments'>('rewards');
  const [copied, setCopied] = useState(false);
  
  // Journey Preview Modal State
  const [isJourneyPreviewOpen, setIsJourneyPreviewOpen] = useState(false);

  // Appointments Modal & Delete States
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [appointmentToEdit, setAppointmentToEdit] = useState<{ debutanteId: string; appointment: Appointment } | null>(null);
  const [appointmentToDelete, setAppointmentToDelete] = useState<{ appId: string; title: string } | null>(null);

  const validReferralsCount = debutante.referrals?.filter(r => r.status === 'validated').length || 0;
  const totalReferrals = debutante.referrals?.length || 0;
  const wonContractsCount = debutante.convertedReferralSales || 0;

  // Find linked journey template
  const linkedTemplate = useMemo(() => {
    if (debutante.journeyTemplateId) {
      return templates.find(t => t.id === debutante.journeyTemplateId) || null;
    }
    if (debutante.hasJourneyEnabled) {
      return templates[0] || null;
    }
    return null;
  }, [debutante, templates]);

  // Conquered Rewards Only (Audio 10)
  const conqueredMilestones = useMemo(() => {
    return (debutante.milestones || []).filter(m => validReferralsCount >= m.requiredReferrals);
  }, [debutante.milestones, validReferralsCount]);

  const conqueredVipRewards = useMemo(() => {
    return (debutante.vipRewards || []).filter(v => wonContractsCount >= v.requiredSales);
  }, [debutante.vipRewards, wonContractsCount]);

  const handleCopyLink = () => {
    const fullUrl = `${window.location.origin}/?debutante=${encodeURIComponent(debutante.slug)}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenApp = () => {
    window.open(`/?debutante=${encodeURIComponent(debutante.slug)}`, '_blank');
  };

  const handleDeleteAppointment = () => {
    if (!appointmentToDelete) return;
    deleteAppointmentForDebutante(debutante.id, appointmentToDelete.appId);
    setAppointmentToDelete(null);
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

  const getGuestGroupBadge = (group: string) => {
    const g = group.toLowerCase();
    if (g.includes('fam')) return { bg: 'rgba(212, 175, 55, 0.12)', color: 'var(--adm-accent)', border: 'rgba(212, 175, 55, 0.3)' };
    if (g.includes('amig')) return { bg: 'rgba(59, 130, 246, 0.12)', color: '#60A5FA', border: 'rgba(59, 130, 246, 0.3)' };
    if (g.includes('esc') || g.includes('colég')) return { bg: 'rgba(139, 92, 246, 0.12)', color: '#A78BFA', border: 'rgba(139, 92, 246, 0.3)' };
    return { bg: 'var(--adm-bg-input)', color: 'var(--adm-text-muted)', border: 'var(--adm-border)' };
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      animation: 'fadeIn 0.2s ease-out',
      fontFamily: "'Inter', sans-serif",
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
            fontWeight: 700,
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
            <ExternalLink size={15} />
            <span>Ver Convite Digital</span>
          </button>

          <button
            type="button"
            onClick={handleOpenApp}
            className="adm-btn-primary"
            style={{
              borderRadius: '12px',
              padding: '8px 18px',
              fontSize: '0.8rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Sparkles size={16} />
            <span>Abrir no App</span>
          </button>
        </div>
      </div>

      {/* Main Profile Header Card */}
      <div className="saas-card" style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <img
            src={debutante.avatarUrl || (debutante as any).photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(debutante.name)}&background=D4AF37&color=1B120C`}
            alt={debutante.name}
            style={{
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid var(--adm-accent)',
              flexShrink: 0,
            }}
          />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0, letterSpacing: '-0.4px' }}>
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
          <div style={{ background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Convidados Confirmados</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--adm-text-title)', marginTop: '4px' }}>
              {debutante.guests.filter(g => g.status === 'confirmed').length} <span style={{ fontSize: '0.9rem', color: 'var(--adm-text-muted)' }}>/ {debutante.currentGuestLimit}</span>
            </div>
          </div>

          <div style={{ background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--adm-accent)', textTransform: 'uppercase', fontWeight: 700 }}>Indicações Enviadas</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--adm-accent)', marginTop: '4px' }}>
              {totalReferrals} <span style={{ fontSize: '0.85rem', color: 'var(--adm-text-muted)' }}>({validReferralsCount} validadas)</span>
            </div>
          </div>

          <div style={{ background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--adm-green)', textTransform: 'uppercase', fontWeight: 700 }}>Contratos Fechados</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--adm-green)', marginTop: '4px' }}>
              {wonContractsCount} <span style={{ fontSize: '0.85rem', color: 'var(--adm-text-muted)' }}>vendas VIP</span>
            </div>
          </div>

          <div style={{ background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: '#60A5FA', textTransform: 'uppercase', fontWeight: 700 }}>Compromissos</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#60A5FA', marginTop: '4px' }}>
              {debutante.appointments?.length || 0} <span style={{ fontSize: '0.85rem', color: 'var(--adm-text-muted)' }}>agendados</span>
            </div>
          </div>
        </div>
      </div>

      {/* Linked Journey Banner Card + Visual Preview Button (Audio 10) */}
      <div style={{
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px',
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '14px',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'var(--adm-accent-bg)',
            border: '1px solid var(--adm-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--adm-accent)',
          }}>
            <Sparkles size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
              Jornada Vinculada: {linkedTemplate ? linkedTemplate.name : (debutante.hasJourneyEnabled ? 'Jornada Padrão Bonomo' : 'Nenhuma')}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
              {linkedTemplate ? `${linkedTemplate.seasonOrPeriod || 'Temporada Oficial'} • ${linkedTemplate.milestones.length} Metas de Indicação • ${linkedTemplate.vipRewards.length} Presentes VIPs` : 'Esta aniversariante ainda não possui modelo de metas vinculado.'}
            </div>
          </div>
        </div>

        {linkedTemplate && (
          <button
            type="button"
            onClick={() => setIsJourneyPreviewOpen(true)}
            style={{
              background: 'var(--adm-accent-bg)',
              border: '1px solid var(--adm-accent)',
              color: 'var(--adm-accent)',
              borderRadius: '10px',
              padding: '7px 14px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <Eye size={14} />
            <span>Visualizar Jornada (Preview)</span>
          </button>
        )}
      </div>

      {/* Sub-Navigation Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1.5px solid var(--adm-border)',
        gap: '24px',
        paddingLeft: '6px',
        flexWrap: 'wrap',
      }}>
        {[
          { id: 'rewards', label: `Prêmios Conquistados (${conqueredMilestones.length + conqueredVipRewards.length})`, icon: <Gift size={16} /> },
          { id: 'referrals', label: `Amigas Indicadas (${totalReferrals})`, icon: <Users size={16} /> },
          { id: 'guests', label: `Lista de Convidados (${debutante.guests.length})`, icon: <CheckCircle2 size={16} /> },
          { id: 'appointments', label: `Agenda de Compromissos (${debutante.appointments?.length || 0})`, icon: <Calendar size={16} /> },
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
        
        {/* TAB 1: PRÊMIOS CONQUISTADOS (SOMENTE OS CONQUISTADOS - AUDIO 10) */}
        {activeTab === 'rewards' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={20} color="var(--adm-accent)" />
                <span>Prêmios e Benefícios Conquistados</span>
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', margin: 0 }}>
                A aniversariante possui <strong style={{ color: 'var(--adm-accent)' }}>{validReferralsCount} indicações validadas</strong> e <strong style={{ color: 'var(--adm-green)' }}>{wonContractsCount} contratos fechados</strong>. Apenas os prêmios já desbloqueados e garantidos aparecem abaixo.
              </p>
            </div>

            {conqueredMilestones.length === 0 && conqueredVipRewards.length === 0 ? (
              <div className="saas-card" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--adm-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <Award size={40} color="var(--adm-accent)" style={{ opacity: 0.4 }} />
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                  Nenhum prêmio conquistado até o momento
                </div>
                <p style={{ fontSize: '0.82rem', margin: 0, maxWidth: '420px', lineHeight: 1.5 }}>
                  Conforme a equipe comercial validar as indicações de amigas no CRM ou contratos forem assinados, os prêmios liberados aparecerão nesta lista.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Metas Conquistadas */}
                {conqueredMilestones.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--adm-accent)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Gift size={15} /> Metas da Jornada Desbloqueadas ({conqueredMilestones.length})
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                      {conqueredMilestones.map((m, idx) => (
                        <div key={m.id || idx} className="saas-card" style={{
                          padding: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          border: '1.5px solid rgba(212, 175, 55, 0.4)',
                          background: 'rgba(212, 175, 55, 0.04)',
                        }}>
                          {m.rewardImageUrl ? (
                            <img src={m.rewardImageUrl} alt={m.rewardTitle} style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'var(--adm-accent-bg)', color: 'var(--adm-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Gift size={22} />
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                                {m.rewardTitle}
                              </span>
                              <span style={{ fontSize: '0.66rem', color: '#10B981', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 6px', borderRadius: '6px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <Check size={11} /> Conquistado
                              </span>
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                              {m.rewardDescription || `Meta de ${m.requiredReferrals} indicações validadas`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Presentes VIPs Conquistados */}
                {conqueredVipRewards.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#EC4899', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Crown size={15} /> Presentes VIPs Liberados por Contratos ({conqueredVipRewards.length})
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
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
                            <img src={v.imageUrl} alt={v.name} style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(236, 72, 153, 0.15)', color: '#EC4899', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Crown size={22} />
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                                {v.name}
                              </span>
                              <span style={{ fontSize: '0.66rem', color: '#10B981', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 6px', borderRadius: '6px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <Check size={11} /> Liberado
                              </span>
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                              {v.description || `${v.requiredSales} venda(s) fechada(s)`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: REFERRALS COM FOTO DO RESPONSÁVEL (AUDIO 10) */}
        {activeTab === 'referrals' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                Amigas Indicadas Pela Aniversariante ({totalReferrals})
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', margin: '4px 0 0 0' }}>
                Acompanhe o andamento das indicações no funil de CRM e o responsável designado para cada atendimento.
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
                  
                  // Match with CRM Lead
                  const matchedLead = leads.find(l => 
                    (ref.id && l.id === ref.id) ||
                    (ref.phone && l.phone && l.phone.replace(/\D/g, '') === ref.phone.replace(/\D/g, '')) ||
                    (l.debutanteId === debutante.id && l.name.toLowerCase().trim() === ref.name.toLowerCase().trim())
                  );

                  const stageBadge = getStageBadge(matchedLead?.stage);
                  const closerName = matchedLead?.closerName || matchedLead?.sdrName || matchedLead?.assignedTo;
                  
                  // Responsible collaborator profile picture
                  const assignedCollab = collaborators.find(c => 
                    (closerName && c.name.toLowerCase() === closerName.toLowerCase()) || 
                    c.id === matchedLead?.sdrId || 
                    c.id === matchedLead?.closerId
                  );

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
                      {/* Contact Info */}
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
                                Validada (+1 indicação)
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
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Phone size={12} color="var(--adm-accent)" />
                              <span>{formatPhone(ref.phone)}</span>
                            </span>
                            {ref.createdAt && <span>• Enviado em {ref.createdAt.split('T')[0].split('-').reverse().join('/')}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Middle: CRM Status & Responsible with Photo (Audio 10) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                        {/* Etapa Comercial */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
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

                        {/* Atendente Responsável com Foto (Audio 10) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                            Responsável
                          </span>
                          {closerName ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {assignedCollab?.avatarUrl ? (
                                <img
                                  src={assignedCollab.avatarUrl}
                                  alt={assignedCollab.name}
                                  style={{
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: '1px solid var(--adm-accent)',
                                    flexShrink: 0,
                                  }}
                                />
                              ) : (
                                <div style={{
                                  width: '22px',
                                  height: '22px',
                                  borderRadius: '50%',
                                  background: 'var(--adm-accent-bg)',
                                  color: 'var(--adm-accent)',
                                  fontSize: '0.62rem',
                                  fontWeight: 800,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}>
                                  {(closerName || 'U').slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <span style={{ fontSize: '0.78rem', color: 'var(--adm-text-title)', fontWeight: 700 }}>
                                {assignedCollab?.name || closerName}
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
                              Não atribuído
                            </span>
                          )}
                        </div>

                        {/* Valor do Contrato */}
                        {Boolean(dealValue && dealValue > 0) && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ fontSize: '0.64rem', color: 'var(--adm-green)', textTransform: 'uppercase', fontWeight: 700 }}>
                              Valor do Contrato
                            </span>
                            <span style={{ fontSize: '0.84rem', color: 'var(--adm-green)', fontWeight: 900 }}>
                              R$ {dealValue?.toLocaleString('pt-BR')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Right Action */}
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
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <ExternalLink size={14} />
                            <span>Acessar Lead</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
                            Lead no CRM
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

        {/* TAB 3: LISTA DE CONVIDADOS COMPLETA COM TODAS AS COLUNAS (AUDIO 10) */}
        {activeTab === 'guests' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                  Lista de Convidados ({debutante.guests.length} / {debutante.currentGuestLimit})
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', margin: '4px 0 0 0' }}>
                  Acompanhe nomes, categorias, idades, gêneros, contatos e status de confirmação dos convidados.
                </p>
              </div>
            </div>

            {debutante.guests.length === 0 ? (
              <div className="saas-card" style={{ padding: '48px', textAlign: 'center', color: 'var(--adm-text-muted)' }}>
                Nenhum convidado adicionado ainda pela aniversariante.
              </div>
            ) : (
              <div className="saas-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--adm-bg-input)', borderBottom: '1px solid var(--adm-border)', color: 'var(--adm-text-muted)', textAlign: 'left' }}>
                        <th style={{ padding: '12px 18px', fontWeight: 700 }}>Convidado</th>
                        <th style={{ padding: '12px 18px', fontWeight: 700 }}>Grupo</th>
                        <th style={{ padding: '12px 18px', fontWeight: 700 }}>Idade</th>
                        <th style={{ padding: '12px 18px', fontWeight: 700 }}>Sexo / Gênero</th>
                        <th style={{ padding: '12px 18px', fontWeight: 700 }}>Telefone</th>
                        <th style={{ padding: '12px 18px', fontWeight: 700, textAlign: 'right' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {debutante.guests.map((g, idx) => {
                        const groupBadge = getGuestGroupBadge(g.group || 'Geral');
                        const isConfirmed = g.status === 'confirmed';
                        const isDeclined = g.status === 'declined';

                        return (
                          <tr
                            key={g.id || idx}
                            style={{
                              borderBottom: '1px solid var(--adm-border)',
                              transition: 'background 0.15s ease',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-input)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ padding: '12px 18px' }}>
                              <div style={{ fontWeight: 700, color: 'var(--adm-text-title)' }}>
                                {g.name}
                              </div>
                              {g.plusOnes > 0 && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--adm-accent)', marginTop: '2px' }}>
                                  + {g.plusOnes} acompanhante(s)
                                </div>
                              )}
                            </td>

                            <td style={{ padding: '12px 18px' }}>
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: groupBadge.bg,
                                color: groupBadge.color,
                                border: `1px solid ${groupBadge.border}`,
                                display: 'inline-block',
                              }}>
                                {g.group || 'Geral'}
                              </span>
                            </td>

                            <td style={{ padding: '12px 18px', color: 'var(--adm-text-body)' }}>
                              {g.age ? `${g.age} anos` : '-'}
                            </td>

                            <td style={{ padding: '12px 18px', color: 'var(--adm-text-body)', textTransform: 'capitalize' }}>
                              {g.gender ? (g.gender === 'female' ? 'Feminino' : g.gender === 'male' ? 'Masculino' : 'Outro') : '-'}
                            </td>

                            <td style={{ padding: '12px 18px', color: 'var(--adm-text-body)' }}>
                              {g.phone ? formatPhone(g.phone) : '-'}
                            </td>

                            <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                              <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                padding: '3px 10px',
                                borderRadius: '8px',
                                background: isConfirmed ? 'rgba(34, 197, 94, 0.15)' : isDeclined ? 'rgba(239, 68, 68, 0.15)' : 'var(--adm-bg-input)',
                                color: isConfirmed ? 'var(--adm-green)' : isDeclined ? '#EF4444' : 'var(--adm-text-muted)',
                                border: `1px solid ${isConfirmed ? 'rgba(34, 197, 94, 0.3)' : isDeclined ? 'rgba(239, 68, 68, 0.3)' : 'var(--adm-border)'}`,
                                display: 'inline-block',
                              }}>
                                {isConfirmed ? 'Confirmado' : isDeclined ? 'Recusado' : 'Pendente'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: AGENDA DE COMPROMISSOS DESTA ANIVERSARIANTE (AUDIO 10) */}
        {activeTab === 'appointments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                  Compromissos Agendados de {debutante.name} ({debutante.appointments?.length || 0})
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', margin: '4px 0 0 0' }}>
                  Degustações de buffet, provas de vestido, ensaios e reuniões de alinhamento exclusivas desta festa.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAppointmentToEdit(null);
                  setIsAppointmentModalOpen(true);
                }}
                className="adm-btn-primary"
                style={{
                  borderRadius: '10px',
                  padding: '8px 16px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Plus size={15} />
                <span>+ Novo Compromisso</span>
              </button>
            </div>

            {(!debutante.appointments || debutante.appointments.length === 0) ? (
              <div className="saas-card" style={{ padding: '48px', textAlign: 'center', color: 'var(--adm-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <Calendar size={38} color="#60A5FA" style={{ opacity: 0.5 }} />
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                  Nenhum compromisso agendado
                </div>
                <p style={{ fontSize: '0.82rem', margin: 0 }}>
                  Clique no botão acima para agendar degustações, provas de vestido ou reuniões com a debutante.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAppointmentToEdit(null);
                    setIsAppointmentModalOpen(true);
                  }}
                  className="adm-btn-primary"
                  style={{
                    borderRadius: '10px',
                    padding: '8px 18px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    marginTop: '8px',
                  }}
                >
                  <Plus size={15} />
                  <span>Criar Primeiro Compromisso</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                {debutante.appointments.map((app) => {
                  const statusLabel = app.status === 'confirmed' ? 'Confirmado' : app.status === 'completed' ? 'Concluído' : 'Agendado';
                  const statusColor = app.status === 'confirmed' ? '#10B981' : app.status === 'completed' ? '#8B5CF6' : '#06B6D4';

                  return (
                    <div
                      key={app.id}
                      className="saas-card"
                      style={{
                        padding: '16px 18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        position: 'relative',
                      }}
                    >
                      {/* Top Category & Status */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'var(--adm-accent-bg)',
                          color: 'var(--adm-accent)',
                          border: '1px solid var(--adm-accent)',
                        }}>
                          {app.category}
                        </span>

                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: `${statusColor}18`,
                          color: statusColor,
                          border: `1px solid ${statusColor}40`,
                        }}>
                          {statusLabel}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <div style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                          {app.title}
                        </div>
                        {app.notes && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', marginTop: '3px', lineHeight: 1.4 }}>
                            {app.notes}
                          </div>
                        )}
                      </div>

                      {/* Date, Time & Location */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        fontSize: '0.76rem',
                        color: 'var(--adm-text-muted)',
                        borderTop: '1px solid var(--adm-border)',
                        paddingTop: '10px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={13} color="var(--adm-accent)" />
                          <span><strong>{app.date.split('-').reverse().join('/')}</strong> às <strong>{app.time}</strong></span>
                        </div>
                        {app.location && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MapPin size={13} color="#EF4444" />
                            <span>{app.location}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions Bottom */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--adm-border)', paddingTop: '10px', marginTop: 'auto' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setAppointmentToEdit({ debutanteId: debutante.id, appointment: app });
                            setIsAppointmentModalOpen(true);
                          }}
                          style={{
                            background: 'var(--adm-bg-input)',
                            border: '1px solid var(--adm-border)',
                            color: 'var(--adm-text-title)',
                            borderRadius: '8px',
                            padding: '5px 10px',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Edit3 size={12} />
                          <span>Editar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setAppointmentToDelete({ appId: app.id, title: app.title })}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#EF4444',
                            borderRadius: '8px',
                            padding: '5px 10px',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Trash2 size={12} />
                          <span>Excluir</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MODAL PREVIEW DA JORNADA COMPLETA (AUDIO 10) ── */}
      {isJourneyPreviewOpen && linkedTemplate && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          animation: 'fadeIn 0.15s ease-out',
        }}>
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1.5px solid rgba(212, 175, 55, 0.4)',
            borderRadius: '20px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '85vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={20} color="var(--adm-accent)" />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                    {linkedTemplate.name}
                  </h3>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', marginTop: '4px' }}>
                  {linkedTemplate.seasonOrPeriod || 'Temporada Oficial'} • {linkedTemplate.description}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsJourneyPreviewOpen(false)}
                style={{
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--adm-text-muted)',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Metas da Jornada Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-accent)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Gift size={16} />
                <span>Metas da Jornada ({linkedTemplate.milestones.length})</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {linkedTemplate.milestones.map((m, idx) => (
                  <div key={idx} style={{
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '12px',
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}>
                    {m.rewardImageUrl ? (
                      <img src={m.rewardImageUrl} alt={m.rewardTitle} style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: 'var(--adm-accent-bg)', color: 'var(--adm-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Gift size={20} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                        {m.rewardTitle}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--adm-accent)', fontWeight: 700, marginTop: '2px' }}>
                        {m.requiredReferrals} {m.requiredReferrals === 1 ? 'indicação' : 'indicações'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Presentes VIPs Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#EC4899', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Crown size={16} />
                <span>Presentes VIPs ({linkedTemplate.vipRewards.length})</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {linkedTemplate.vipRewards.map((v, idx) => (
                  <div key={idx} style={{
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '12px',
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}>
                    {v.imageUrl ? (
                      <img src={v.imageUrl} alt={v.name} style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: 'rgba(236, 72, 153, 0.15)', color: '#EC4899', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Crown size={20} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                        {v.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 700, marginTop: '2px' }}>
                        {v.requiredSales} {v.requiredSales === 1 ? 'venda fechada' : 'vendas fechadas'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Close Button Bottom */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid var(--adm-border)' }}>
              <button
                type="button"
                onClick={() => setIsJourneyPreviewOpen(false)}
                style={{
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  color: 'var(--adm-text-title)',
                  borderRadius: '10px',
                  padding: '8px 20px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Modal Pre-filled for this debutante (Audio 10) */}
      <AdminAppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={() => {
          setIsAppointmentModalOpen(false);
          setAppointmentToEdit(null);
        }}
        presetDebutanteId={debutante.id}
        appointmentToEdit={appointmentToEdit}
      />

      {/* Confirm Delete Appointment Modal */}
      <AdminConfirmModal
        isOpen={Boolean(appointmentToDelete)}
        title="Excluir Compromisso"
        message={`Deseja realmente remover o compromisso "${appointmentToDelete?.title}" da agenda da debutante?`}
        confirmText="Sim, Excluir"
        danger={true}
        onConfirm={handleDeleteAppointment}
        onClose={() => setAppointmentToDelete(null)}
      />
    </div>
  );
};
