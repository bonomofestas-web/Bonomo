import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, Crown, Gift, Users, Sparkles, CheckCircle2, 
  ExternalLink, Building2, Check,
  Share2, Award, Edit3, Phone,
  Calendar, Eye, Plus, Trash2, X, MapPin, Video, Play, Mail
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
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // Appointments Modal & Delete States
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [appointmentToEdit, setAppointmentToEdit] = useState<{ debutanteId: string; appointment: Appointment } | null>(null);
  const [appointmentToDelete, setAppointmentToDelete] = useState<{ appId: string; title: string } | null>(null);

  // Guests Search & Filter States
  const [guestSearch, setGuestSearch] = useState('');
  const [guestStatusFilter, setGuestStatusFilter] = useState<'all' | 'confirmed' | 'declined' | 'pending'>('all');

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
            <Mail size={15} color="var(--adm-accent)" />
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

      {/* Debutante Vertical Welcome Video Card */}
      <div style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '16px',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: debutante.welcomeVideoUrl ? 'rgba(16, 185, 129, 0.12)' : 'var(--adm-bg-input)',
            border: `1.5px solid ${debutante.welcomeVideoUrl ? '#10B981' : 'var(--adm-border)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: debutante.welcomeVideoUrl ? '#10B981' : 'var(--adm-text-muted)',
            flexShrink: 0,
          }}>
            <Video size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                Vídeo Vertical de Boas-Vindas
              </span>
              {debutante.welcomeVideoUrl ? (
                <span style={{ fontSize: '0.66rem', fontWeight: 800, padding: '2px 6px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  Configurado (R2)
                </span>
              ) : (
                <span style={{ fontSize: '0.66rem', fontWeight: 800, padding: '2px 6px', borderRadius: '6px', background: 'var(--adm-bg-input)', color: 'var(--adm-text-muted)', border: '1px solid var(--adm-border)' }}>
                  Não configurado
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginTop: '3px' }}>
              {debutante.welcomeVideoUrl 
                ? 'Vídeo vertical 9:16 ativo. A debutante assiste a esta mensagem ao iniciar a experiência.'
                : 'Nenhum vídeo vertical de boas-vindas cadastrado para esta debutante.'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {debutante.welcomeVideoUrl && (
            <button
              type="button"
              onClick={() => setIsVideoModalOpen(true)}
              style={{
                background: 'linear-gradient(135deg, #D4AF37 0%, #AA7C11 100%)',
                color: '#000',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 14px',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(212, 175, 55, 0.25)',
              }}
            >
              <Play size={13} fill="#000" />
              <span>Assistir Vídeo (9:16)</span>
            </button>
          )}

          <button
            type="button"
            onClick={onEdit}
            style={{
              background: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
              color: 'var(--adm-text-title)',
              borderRadius: '10px',
              padding: '8px 14px',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Edit3 size={13} />
            <span>{debutante.welcomeVideoUrl ? 'Trocar Vídeo' : 'Adicionar Vídeo'}</span>
          </button>
        </div>
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

        {/* TAB 3: LISTA DE CONVIDADOS COMPLETA COM TODAS AS COLUNAS */}
        {activeTab === 'guests' && (() => {
          const confirmedGuests = debutante.guests.filter(g => g.status === 'confirmed');
          const declinedGuests = debutante.guests.filter(g => g.status === 'declined');
          const pendingGuests = debutante.guests.filter(g => !g.status || g.status === 'pending');
          const totalPlusOnesConfirmed = confirmedGuests.reduce((sum, g) => sum + (g.plusOnes || 0), 0);
          const totalHeadcountConfirmed = confirmedGuests.length + totalPlusOnesConfirmed;

          const filteredGuests = debutante.guests.filter(g => {
            if (guestStatusFilter === 'confirmed' && g.status !== 'confirmed') return false;
            if (guestStatusFilter === 'declined' && g.status !== 'declined') return false;
            if (guestStatusFilter === 'pending' && (g.status === 'confirmed' || g.status === 'declined')) return false;

            if (guestSearch.trim()) {
              const q = guestSearch.toLowerCase();
              const matchesName = g.name.toLowerCase().includes(q);
              const matchesPhone = g.phone?.includes(q);
              const matchesGroup = g.group?.toLowerCase().includes(q);
              if (!matchesName && !matchesPhone && !matchesGroup) return false;
            }
            return true;
          });

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Top Guest KPI Summary Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                gap: '12px',
              }}>
                <div className="saas-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(212, 175, 55, 0.12)', color: 'var(--adm-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total na Lista</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--adm-text-title)', marginTop: '2px' }}>
                      {debutante.guests.length} <span style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>/ {debutante.currentGuestLimit} máx</span>
                    </div>
                  </div>
                </div>

                <div className="saas-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--adm-green)', textTransform: 'uppercase', fontWeight: 700 }}>Confirmados</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--adm-green)', marginTop: '2px' }}>
                      {confirmedGuests.length} <span style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>({totalHeadcountConfirmed} presentes)</span>
                    </div>
                  </div>
                </div>

                <div className="saas-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.66rem', color: '#F59E0B', textTransform: 'uppercase', fontWeight: 700 }}>Aguardando RSVP</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F59E0B', marginTop: '2px' }}>
                      {pendingGuests.length} <span style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>pendentes</span>
                    </div>
                  </div>
                </div>

                <div className="saas-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.66rem', color: '#EF4444', textTransform: 'uppercase', fontWeight: 700 }}>Recusados</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#EF4444', marginTop: '2px' }}>
                      {declinedGuests.length} <span style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>não irão</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Guest Search & Filter Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                background: 'var(--adm-bg-card)',
                border: '1px solid var(--adm-border)',
                borderRadius: '14px',
                padding: '12px 16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
                  <input
                    type="text"
                    value={guestSearch}
                    onChange={(e) => setGuestSearch(e.target.value)}
                    placeholder="Buscar convidado por nome, telefone ou grupo..."
                    style={{
                      width: '100%',
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '10px',
                      padding: '8px 14px',
                      fontSize: '0.80rem',
                      color: 'var(--adm-text-title)',
                      outline: 'none',
                    }}
                  />
                  {guestSearch && (
                    <button
                      type="button"
                      onClick={() => setGuestSearch('')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--adm-text-muted)',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'all', label: `Todos (${debutante.guests.length})` },
                    { id: 'confirmed', label: `Confirmados (${confirmedGuests.length})` },
                    { id: 'pending', label: `Pendentes (${pendingGuests.length})` },
                    { id: 'declined', label: `Recusados (${declinedGuests.length})` },
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setGuestStatusFilter(f.id as any)}
                      style={{
                        background: guestStatusFilter === f.id ? 'var(--adm-accent)' : 'var(--adm-bg-input)',
                        color: guestStatusFilter === f.id ? '#000000' : 'var(--adm-text-muted)',
                        border: `1px solid ${guestStatusFilter === f.id ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                        borderRadius: '8px',
                        padding: '5px 12px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Guest Table */}
              {filteredGuests.length === 0 ? (
                <div className="saas-card" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--adm-text-muted)' }}>
                  <Users size={36} color="var(--adm-accent)" style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
                  <div style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                    Nenhum convidado encontrado
                  </div>
                  <p style={{ fontSize: '0.78rem', margin: '4px 0 0 0' }}>
                    {guestSearch ? 'Tente ajustar os termos de pesquisa ou filtros.' : 'A aniversariante ainda não adicionou convidados.'}
                  </p>
                </div>
              ) : (
                <div className="saas-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--adm-border)' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--adm-bg-input)', borderBottom: '1.5px solid var(--adm-border)', color: 'var(--adm-text-muted)', textAlign: 'left' }}>
                          <th style={{ padding: '14px 20px', fontWeight: 800 }}>Convidado</th>
                          <th style={{ padding: '14px 18px', fontWeight: 800 }}>Grupo</th>
                          <th style={{ padding: '14px 18px', fontWeight: 800 }}>Idade</th>
                          <th style={{ padding: '14px 18px', fontWeight: 800 }}>Gênero</th>
                          <th style={{ padding: '14px 18px', fontWeight: 800 }}>Contato</th>
                          <th style={{ padding: '14px 20px', fontWeight: 800, textAlign: 'right' }}>Status RSVP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredGuests.map((g, idx) => {
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
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <td style={{ padding: '14px 20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: isConfirmed ? 'rgba(16, 185, 129, 0.15)' : 'var(--adm-bg-input)',
                                    border: `1px solid ${isConfirmed ? '#10B981' : 'var(--adm-border)'}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: isConfirmed ? '#10B981' : 'var(--adm-text-muted)',
                                    fontWeight: 800,
                                    fontSize: '0.78rem',
                                    flexShrink: 0,
                                  }}>
                                    {g.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 800, color: 'var(--adm-text-title)', fontSize: '0.88rem' }}>
                                      {g.name}
                                    </div>
                                    {g.plusOnes > 0 && (
                                      <div style={{ fontSize: '0.70rem', color: 'var(--adm-accent)', marginTop: '2px', fontWeight: 700 }}>
                                        + {g.plusOnes} acompanhante(s)
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td style={{ padding: '14px 18px' }}>
                                <span style={{
                                  fontSize: '0.70rem',
                                  fontWeight: 700,
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  background: groupBadge.bg,
                                  color: groupBadge.color,
                                  border: `1px solid ${groupBadge.border}`,
                                  display: 'inline-block',
                                }}>
                                  {g.group || 'Geral'}
                                </span>
                              </td>

                              <td style={{ padding: '14px 18px', color: 'var(--adm-text-title)', fontWeight: 600 }}>
                                {g.age ? `${g.age} anos` : '—'}
                              </td>

                              <td style={{ padding: '14px 18px', color: 'var(--adm-text-muted)', textTransform: 'capitalize', fontSize: '0.78rem' }}>
                                {g.gender ? (g.gender === 'female' ? 'Feminino' : g.gender === 'male' ? 'Masculino' : 'Outro') : '—'}
                              </td>

                              <td style={{ padding: '14px 18px', color: 'var(--adm-text-body)' }}>
                                {g.phone ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem' }}>
                                    <Phone size={12} color="var(--adm-accent)" />
                                    <span>{formatPhone(g.phone)}</span>
                                  </span>
                                ) : '—'}
                              </td>

                              <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                                <span style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  padding: '4px 10px',
                                  borderRadius: '8px',
                                  background: isConfirmed ? 'rgba(16, 185, 129, 0.15)' : isDeclined ? 'rgba(239, 68, 68, 0.15)' : 'var(--adm-bg-input)',
                                  color: isConfirmed ? 'var(--adm-green)' : isDeclined ? '#EF4444' : 'var(--adm-text-muted)',
                                  border: `1px solid ${isConfirmed ? 'rgba(16, 185, 129, 0.3)' : isDeclined ? 'rgba(239, 68, 68, 0.3)' : 'var(--adm-border)'}`,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}>
                                  <span style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    background: isConfirmed ? '#10B981' : isDeclined ? '#EF4444' : '#9CA3AF',
                                  }} />
                                  <span>{isConfirmed ? 'Confirmado' : isDeclined ? 'Recusado' : 'Pendente'}</span>
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
          );
        })()}

        {/* TAB 4: AGENDA DE COMPROMISSOS DESTA ANIVERSARIANTE */}
        {activeTab === 'appointments' && (() => {
          const appointmentsList = debutante.appointments || [];
          const confirmedApps = appointmentsList.filter(a => a.status === 'confirmed');
          const completedApps = appointmentsList.filter(a => a.status === 'completed');
          const scheduledApps = appointmentsList.filter(a => !a.status || a.status === 'scheduled');

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Top Header & Metrics */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px',
              }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={20} color="#60A5FA" />
                    <span>Compromissos e Agenda da Debutante</span>
                  </h3>
                  <p style={{ fontSize: '0.80rem', color: 'var(--adm-text-muted)', margin: '3px 0 0 0' }}>
                    Degustações de buffet, provas de vestido, ensaios e reuniões de alinhamento exclusivas para a festa de {debutante.name}.
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
                    borderRadius: '12px',
                    padding: '9px 18px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Plus size={16} />
                  <span>+ Agendar Novo Compromisso</span>
                </button>
              </div>

              {/* Appointment Stat Pills */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
              }}>
                <div className="saas-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(96, 165, 250, 0.12)', color: '#60A5FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Calendar size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Agendado</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                      {appointmentsList.length}
                    </div>
                  </div>
                </div>

                <div className="saas-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.64rem', color: '#10B981', textTransform: 'uppercase', fontWeight: 700 }}>Confirmados</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10B981' }}>
                      {confirmedApps.length}
                    </div>
                  </div>
                </div>

                <div className="saas-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.12)', color: '#A78BFA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.64rem', color: '#A78BFA', textTransform: 'uppercase', fontWeight: 700 }}>Concluídos</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#A78BFA' }}>
                      {completedApps.length}
                    </div>
                  </div>
                </div>

                <div className="saas-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.12)', color: '#22D3EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Calendar size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.64rem', color: '#22D3EE', textTransform: 'uppercase', fontWeight: 700 }}>Pendentes</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#22D3EE' }}>
                      {scheduledApps.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Appointments Grid */}
              {appointmentsList.length === 0 ? (
                <div className="saas-card" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--adm-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <Calendar size={42} color="#60A5FA" style={{ opacity: 0.4 }} />
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                    Nenhum compromisso agendado para esta debutante
                  </div>
                  <p style={{ fontSize: '0.80rem', margin: 0, maxWidth: '400px', lineHeight: 1.5 }}>
                    Cadastre degustações de cardápio, reuniões de roteiro ou provas de vestido para manter a aniversariante informada.
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
                      padding: '8px 20px',
                      fontSize: '0.80rem',
                      fontWeight: 800,
                      marginTop: '6px',
                    }}
                  >
                    <Plus size={15} />
                    <span>Criar Primeiro Compromisso</span>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                  {appointmentsList.map((app) => {
                    const statusLabel = app.status === 'confirmed' ? 'Confirmado' : app.status === 'completed' ? 'Concluído' : 'Agendado';
                    const statusColor = app.status === 'confirmed' ? '#10B981' : app.status === 'completed' ? '#8B5CF6' : '#38BDF8';

                    return (
                      <div
                        key={app.id}
                        className="saas-card"
                        style={{
                          padding: '18px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          border: '1.5px solid var(--adm-border)',
                          position: 'relative',
                        }}
                      >
                        {/* Top Category & Status */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{
                            fontSize: '0.70rem',
                            fontWeight: 800,
                            padding: '3px 8px',
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
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: `${statusColor}18`,
                            color: statusColor,
                            border: `1px solid ${statusColor}40`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: statusColor }} />
                            <span>{statusLabel}</span>
                          </span>
                        </div>

                        {/* Title & Notes */}
                        <div>
                          <div style={{ fontSize: '0.98rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>
                            {app.title}
                          </div>
                          {app.notes && (
                            <div style={{
                              fontSize: '0.76rem',
                              color: 'var(--adm-text-muted)',
                              marginTop: '6px',
                              lineHeight: 1.4,
                              background: 'var(--adm-bg-input)',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              border: '1px solid var(--adm-border)',
                            }}>
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
                              padding: '5px 12px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
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
                              padding: '5px 12px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
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
          );
        })()}
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

      {/* Modal Reprodução de Vídeo Vertical (9:16) */}
      {isVideoModalOpen && debutante.welcomeVideoUrl && (
        <div 
          onClick={() => setIsVideoModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '380px',
              aspectRatio: '9 / 16',
              background: '#000',
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(212, 175, 55, 0.2)',
              border: '1.5px solid rgba(212, 175, 55, 0.4)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <button
              type="button"
              onClick={() => setIsVideoModalOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(0, 0, 0, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10,
              }}
            >
              <X size={18} />
            </button>

            <video
              src={debutante.welcomeVideoUrl}
              controls
              autoPlay
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
