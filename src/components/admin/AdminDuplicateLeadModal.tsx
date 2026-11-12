import React, { useState, useMemo } from 'react';
import {
  X, Copy, GitMerge, History, Sparkles, Trash2,
  Calendar, Building2, Layers, MessageSquare,
  AlertTriangle, ArrowRight
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { formatPhone } from '../../utils/phoneFormatter';
import { isPhoneMatch } from '../../services/leadService';
import type { Lead, DuplicateResolutionAction } from '../../types/admin';

interface AdminDuplicateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onResolved?: () => void;
}

export const AdminDuplicateLeadModal: React.FC<AdminDuplicateLeadModalProps> = ({
  isOpen,
  onClose,
  lead,
  onResolved,
}) => {
  const { leads, funnels, venues, resolveDuplicateLeads } = useAdminState();
  const [selectedAction, setSelectedAction] = useState<DuplicateResolutionAction>('merge_keep_oldest');
  const [isResolving, setIsResolving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Localiza todos os leads duplicados que batem com o telefone do lead atual
  const duplicateCandidates = useMemo(() => {
    if (!lead || !lead.phone) return [];
    const cleanCurrent = lead.phone.replace(/\D/g, '');
    if (cleanCurrent.length < 8) return [];
    const isTargetClient = Boolean(lead.isClient || lead.group === 'Pós-Venda');

    return leads.filter(l => {
      if (l.id === lead.id) return false;
      const isLClient = Boolean(l.isClient || l.group === 'Pós-Venda');
      if (isTargetClient !== isLClient) return false;
      return isPhoneMatch(l.phone, lead.phone);
    });
  }, [lead, leads]);

  const otherLead = duplicateCandidates[0] || null;

  // Determina qual é o mais antigo e qual é o mais novo cronologicamente
  const isCurrentOlder = useMemo(() => {
    if (!lead || !otherLead) return true;
    const currTime = new Date(lead.createdAt || 0).getTime();
    const otherTime = new Date(otherLead.createdAt || 0).getTime();
    return currTime <= otherTime;
  }, [lead, otherLead]);

  if (!isOpen || !lead || !otherLead) return null;

  const getVenueName = (venueId?: string, fallback?: string) => {
    const v = venues.find(item => item.id === venueId);
    return v?.name || fallback || 'Unidade Principal';
  };

  const getFunnelName = (funnelId?: string) => {
    const f = funnels.find(item => item.id === funnelId);
    return f?.name || 'Comercial Padrão';
  };

  const getStageName = (funnelId?: string, stageId?: string) => {
    const f = funnels.find(item => item.id === funnelId);
    const s = f?.stages?.find(item => item.id === stageId);
    return s?.name || stageId || 'Novo Lead';
  };

  const handleConfirmResolution = async () => {
    if (!otherLead) return;
    setIsResolving(true);
    setErrorMsg('');
    try {
      const ok = await resolveDuplicateLeads(selectedAction, lead.id, otherLead.id);
      if (ok) {
        if (onResolved) onResolved();
        onClose();
      } else {
        setErrorMsg('Não foi possível concluir a ação. Verifique os dados e tente novamente.');
      }
    } catch (err: any) {
      console.error('Erro ao resolver lead duplicado:', err);
      setErrorMsg(err?.message || 'Erro inesperado ao resolver lead duplicado.');
    } finally {
      setIsResolving(false);
    }
  };

  const resolutionOptions: Array<{
    id: DuplicateResolutionAction;
    title: string;
    description: string;
    icon: React.ReactNode;
    badge?: string;
    danger?: boolean;
  }> = [
    {
      id: 'merge_keep_oldest',
      title: 'Mesclar e manter o mais antigo',
      description: 'Unifica mensagens, tarefas e anotações. Prevalecem os dados do lead mais antigo; campos que estavam vazios são preenchidos com os dados do mais novo.',
      icon: <GitMerge size={16} color="#10B981" />,
      badge: 'Recomendado',
    },
    {
      id: 'merge_keep_newest',
      title: 'Mesclar e manter o mais novo',
      description: 'Unifica mensagens, tarefas e anotações. Prevalecem os dados do lead mais novo; campos que estavam vazios são preenchidos com os dados do mais antigo.',
      icon: <GitMerge size={16} color="#3B82F6" />,
    },
    {
      id: 'keep_oldest',
      title: 'Manter mais antigo',
      description: 'Mantém apenas o card mais antigo no sistema e exclui o mais novo (sem mesclar mensagens e histórico).',
      icon: <History size={16} color="#F59E0B" />,
    },
    {
      id: 'keep_newest',
      title: 'Manter o mais novo',
      description: 'Mantém apenas o card mais recente no sistema e exclui o mais antigo (sem mesclar mensagens e histórico).',
      icon: <Sparkles size={16} color="#8B5CF6" />,
    },
    {
      id: 'delete_current',
      title: `Excluir esse e manter o outro`,
      description: `Exclui este card que você está visualizando (${lead.name}) e preserva o outro card (${otherLead.name}) intacto.`,
      icon: <Trash2 size={16} color="#EF4444" />,
      danger: true,
    },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(5px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isResolving) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          backgroundColor: 'var(--adm-bg-surface, #1E293B)',
          border: '1px solid var(--adm-border, #334155)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)',
          overflow: 'hidden',
        }}
      >
        {/* Cabeçalho */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--adm-border, #334155)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(217, 119, 6, 0.05))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#F59E0B',
              }}
            >
              <Copy size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title, #FFFFFF)' }}>
                Resolução de Lead Duplicado
              </h2>
              <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--adm-text-muted, #94A3B8)' }}>
                Telefone em comum: <strong style={{ color: 'var(--adm-text-title, #FFFFFF)' }}>{formatPhone(lead.phone)}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isResolving}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--adm-text-muted, #94A3B8)',
              cursor: isResolving ? 'not-allowed' : 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {errorMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#EF4444',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Comparativo dos Leads lado a lado */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* Lead 1 (Atual) */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                backgroundColor: 'var(--adm-bg-input, #0F172A)',
                border: '1px solid var(--adm-border, #334155)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: 'rgba(59, 130, 246, 0.2)',
                    color: '#60A5FA',
                    border: '1px solid rgba(59, 130, 246, 0.35)',
                  }}
                >
                  Card Atual
                </span>
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: isCurrentOlder ? 'rgba(16, 185, 129, 0.18)' : 'rgba(139, 92, 246, 0.18)',
                    color: isCurrentOlder ? '#10B981' : '#A78BFA',
                    border: isCurrentOlder ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(139, 92, 246, 0.35)',
                  }}
                >
                  {isCurrentOlder ? 'Mais Antigo' : 'Mais Novo'}
                </span>
              </div>

              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--adm-text-title, #FFFFFF)' }}>
                  {lead.name}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted, #94A3B8)', marginTop: '2px' }}>
                  {lead.code || 'Sem código'}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.72rem', color: 'var(--adm-text-muted, #94A3B8)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={12} color="var(--adm-accent, #6366F1)" />
                  <span style={{ color: 'var(--adm-text-title, #FFFFFF)' }}>{getVenueName(lead.venueId, lead.venueName)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={12} color="var(--adm-accent, #6366F1)" />
                  <span>{getFunnelName(lead.funnelId)} • {getStageName(lead.funnelId, lead.stage)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={12} />
                  <span>Criado em: {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('pt-BR') : 'Sem data'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <MessageSquare size={11} /> {lead.activities?.length || 0} msgs
                  </span>
                </div>
              </div>
            </div>

            {/* Lead 2 (Duplicado Encontrado) */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                backgroundColor: 'var(--adm-bg-input, #0F172A)',
                border: '1px solid var(--adm-border, #334155)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: 'rgba(245, 158, 11, 0.2)',
                    color: '#F59E0B',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                  }}
                >
                  Card Duplicado
                </span>
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: !isCurrentOlder ? 'rgba(16, 185, 129, 0.18)' : 'rgba(139, 92, 246, 0.18)',
                    color: !isCurrentOlder ? '#10B981' : '#A78BFA',
                    border: !isCurrentOlder ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(139, 92, 246, 0.35)',
                  }}
                >
                  {!isCurrentOlder ? 'Mais Antigo' : 'Mais Novo'}
                </span>
              </div>

              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--adm-text-title, #FFFFFF)' }}>
                  {otherLead.name}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted, #94A3B8)', marginTop: '2px' }}>
                  {otherLead.code || 'Sem código'}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.72rem', color: 'var(--adm-text-muted, #94A3B8)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={12} color="var(--adm-accent, #6366F1)" />
                  <span style={{ color: 'var(--adm-text-title, #FFFFFF)' }}>{getVenueName(otherLead.venueId, otherLead.venueName)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={12} color="var(--adm-accent, #6366F1)" />
                  <span>{getFunnelName(otherLead.funnelId)} • {getStageName(otherLead.funnelId, otherLead.stage)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={12} />
                  <span>Criado em: {otherLead.createdAt ? new Date(otherLead.createdAt).toLocaleDateString('pt-BR') : 'Sem data'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <MessageSquare size={11} /> {otherLead.activities?.length || 0} msgs
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Opções de Resolução */}
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-title, #FFFFFF)', marginBottom: '8px' }}>
              Selecione a ação desejada:
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {resolutionOptions.map(opt => {
                const isSelected = selectedAction === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setSelectedAction(opt.id)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      backgroundColor: isSelected
                        ? (opt.danger ? 'rgba(239, 68, 68, 0.12)' : 'rgba(99, 102, 241, 0.14)')
                        : 'var(--adm-bg-input, #0F172A)',
                      border: isSelected
                        ? (opt.danger ? '1.5px solid #EF4444' : '1.5px solid #6366F1')
                        : '1px solid var(--adm-border, #334155)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: isSelected
                          ? (opt.danger ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.25)')
                          : 'rgba(255, 255, 255, 0.04)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {opt.icon}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <span
                          style={{
                            fontSize: '0.80rem',
                            fontWeight: 800,
                            color: isSelected
                              ? (opt.danger ? '#EF4444' : '#818CF8')
                              : 'var(--adm-text-title, #FFFFFF)',
                          }}
                        >
                          {opt.title}
                        </span>
                        {opt.badge && (
                          <span
                            style={{
                              fontSize: '0.60rem',
                              fontWeight: 800,
                              padding: '1px 6px',
                              borderRadius: '999px',
                              backgroundColor: 'rgba(16, 185, 129, 0.2)',
                              color: '#10B981',
                              border: '1px solid rgba(16, 185, 129, 0.35)',
                            }}
                          >
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--adm-text-muted, #94A3B8)', lineHeight: '1.4' }}>
                        {opt.description}
                      </p>
                    </div>

                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: isSelected ? '5px solid #6366F1' : '2px solid var(--adm-border, #475569)',
                        backgroundColor: isSelected ? '#FFFFFF' : 'transparent',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--adm-border, #334155)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.15)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isResolving}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--adm-border, #334155)',
              background: 'transparent',
              color: 'var(--adm-text-muted, #94A3B8)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: isResolving ? 'not-allowed' : 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmResolution}
            disabled={isResolving}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              background: selectedAction === 'delete_current'
                ? '#EF4444'
                : 'linear-gradient(135deg, #4F46E5, #6366F1)',
              color: '#FFFFFF',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: isResolving ? 'not-allowed' : 'pointer',
              opacity: isResolving ? 0.6 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>{isResolving ? 'Resolvendo...' : 'Confirmar e Executar'}</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

