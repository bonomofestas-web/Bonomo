import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, 
  ArrowRightLeft, 
  AlertTriangle, 
  AlertCircle,
  CheckCircle2, 
  User, 
  X, 
  ShieldAlert, 
  Check, 
  ChevronDown,
  GitBranch
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { canChangeLeadVenue, formatAccessRoleLabel } from '../../utils/accessPermissions';
import { SafeAvatar } from './SafeAvatar';
import { generateUuid } from '../../utils/uuid';
import type { Lead } from '../../types/admin';

interface AdminTransferLeadVenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSuccess?: (updatedLead: Lead) => void;
}

export const AdminTransferLeadVenueModal: React.FC<AdminTransferLeadVenueModalProps> = ({
  isOpen,
  onClose,
  lead,
  onSuccess,
}) => {
  const { 
    currentUser, 
    venues, 
    funnels,
    allFunnels,
    collaborators, 
    updateLeadData,
    showSystemAlert 
  } = useAdminState();

  const [selectedVenueId, setSelectedVenueId] = useState<string>('');
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>('');
  const [keepCurrentFunnel, setKeepCurrentFunnel] = useState<boolean>(true);
  const [transferReason, setTransferReason] = useState<string>('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  const [isVenueDropdownOpen, setIsVenueDropdownOpen] = useState(false);
  const [isFunnelDropdownOpen, setIsFunnelDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pool completo de funis
  const funnelsPool = useMemo(() => {
    return (allFunnels && allFunnels.length > 0) ? allFunnels : funnels;
  }, [allFunnels, funnels]);

  // Casa atual do lead
  const currentVenue = useMemo(() => {
    if (!lead) return null;
    return venues.find(v => v.id === lead.venueId) || null;
  }, [lead, venues]);

  // Funil atual do lead
  const currentLeadFunnel = useMemo(() => {
    if (!lead?.funnelId) return null;
    return funnelsPool.find(f => f.id === lead.funnelId || f.name === lead.funnelId) || null;
  }, [lead?.funnelId, funnelsPool]);

  // Casa de destino selecionada
  const targetVenue = useMemo(() => {
    return venues.find(v => v.id === selectedVenueId) || null;
  }, [venues, selectedVenueId]);

  // Funis comerciais da casa de destino selecionada
  const eligibleFunnelsForTargetVenue = useMemo(() => {
    if (!selectedVenueId) return [];
    return funnelsPool.filter(f => {
      if (f.isPostSale) return false;
      if (f.venueId === 'all') return true;
      if (f.venueId === selectedVenueId) return true;
      if (Array.isArray(f.sharedVenueIds) && f.sharedVenueIds.includes(selectedVenueId)) return true;
      return false;
    });
  }, [funnelsPool, selectedVenueId]);

  // O funil atual do lead tem vínculo com a nova casa selecionada?
  const currentFunnelHasLinkWithTargetVenue = useMemo(() => {
    if (!currentLeadFunnel || !selectedVenueId) return false;
    if (currentLeadFunnel.venueId === 'all') return true;
    if (currentLeadFunnel.venueId === selectedVenueId) return true;
    if (Array.isArray(currentLeadFunnel.sharedVenueIds) && currentLeadFunnel.sharedVenueIds.includes(selectedVenueId)) return true;
    return false;
  }, [currentLeadFunnel, selectedVenueId]);

  // Funil oficial de esteira de entrada da casa de destino (procura funil com esteira de entrada ativa)
  const defaultEntryFunnelForTarget = useMemo(() => {
    if (eligibleFunnelsForTargetVenue.length === 0) return null;
    const entryActive = eligibleFunnelsForTargetVenue.find(f => f.isEntryStageActive);
    if (entryActive) return entryActive;
    const primary = eligibleFunnelsForTargetVenue.find(f => f.isPrimary);
    if (primary) return primary;
    const namedEntry = eligibleFunnelsForTargetVenue.find(f => 
      f.name.toLowerCase().includes('entrada') || f.name.toLowerCase().includes('comercial')
    );
    if (namedEntry) return namedEntry;
    return null; // Não assume cegamente se não houver esteira de entrada configurada
  }, [eligibleFunnelsForTargetVenue]);

  // A casa de destino possui funil com esteira de entrada ativa configurada?
  const targetVenueHasEntryFunnel = Boolean(defaultEntryFunnelForTarget);

  // Inicialização inteligente ao abrir o modal ou mudar o lead
  useEffect(() => {
    if (lead && isOpen) {
      const otherVenue = venues.find(v => v.id !== lead.venueId);
      const initialTargetId = otherVenue?.id || venues[0]?.id || '';
      setSelectedVenueId(initialTargetId);
      setTransferReason('');
      setReasonError(null);
      setIsVenueDropdownOpen(false);
      setIsFunnelDropdownOpen(false);
    }
  }, [lead, isOpen, venues]);

  // Atualiza funil de destino quando muda a unidade
  useEffect(() => {
    if (!selectedVenueId) return;

    if (currentFunnelHasLinkWithTargetVenue && currentLeadFunnel) {
      setKeepCurrentFunnel(true);
      setSelectedFunnelId(currentLeadFunnel.id);
    } else {
      setKeepCurrentFunnel(false);
      setSelectedFunnelId(defaultEntryFunnelForTarget?.id || '');
    }
  }, [selectedVenueId, currentFunnelHasLinkWithTargetVenue, currentLeadFunnel, defaultEntryFunnelForTarget]);

  // Funil de destino efetivo
  const destinationFunnel = useMemo(() => {
    if (keepCurrentFunnel && currentLeadFunnel && currentFunnelHasLinkWithTargetVenue) {
      return currentLeadFunnel;
    }
    if (selectedFunnelId) {
      const match = funnelsPool.find(f => f.id === selectedFunnelId);
      if (match) return match;
    }
    return defaultEntryFunnelForTarget;
  }, [keepCurrentFunnel, currentLeadFunnel, currentFunnelHasLinkWithTargetVenue, funnelsPool, selectedFunnelId, defaultEntryFunnelForTarget]);

  // Colaborador responsável atual pelo lead
  const assignedCollab = useMemo(() => {
    if (!lead) return null;
    const targetName = (lead.assignedTo || lead.sdrName || lead.closerName || '').trim().toLowerCase();
    const targetId = lead.sdrId || lead.closerId;

    return collaborators.find(c => {
      if (targetId && c.id === targetId) return true;
      if (targetName && c.name.trim().toLowerCase() === targetName) return true;
      return false;
    }) || null;
  }, [lead, collaborators]);

  const assignedDisplayName = lead?.assignedTo || lead?.sdrName || lead?.closerName || assignedCollab?.name;

  // Verificação de permissão do responsável na nova unidade
  const assigneeAccessStatus = useMemo((): 'no_assignee' | 'has_access' | 'lacks_access' => {
    if (!assignedDisplayName && !assignedCollab) return 'no_assignee';
    if (!assignedCollab) return 'lacks_access';

    if (assignedCollab.role === 'master' || assignedCollab.role === 'dev') return 'has_access';
    if (assignedCollab.venueId === 'all') return 'has_access';
    if (assignedCollab.venueId === selectedVenueId) return 'has_access';
    if (assignedCollab.venueIds && assignedCollab.venueIds.includes(selectedVenueId)) return 'has_access';

    return 'lacks_access';
  }, [assignedDisplayName, assignedCollab, selectedVenueId]);

  if (!isOpen || !lead) return null;

  // Validação estrita de segurança: Somente Gerência e Master podem mudar a unidade de um lead
  if (!canChangeLeadVenue(currentUser)) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000,
        padding: '20px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        <div style={{
          background: 'var(--adm-bg-card, #1A1D24)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '18px',
          maxWidth: '460px',
          width: '100%',
          padding: '28px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'rgba(239, 68, 68, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: '#EF4444',
          }}>
            <ShieldAlert size={26} />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--adm-text-title, #fff)', marginBottom: '8px' }}>
            Acesso Restrito
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--adm-text-muted, #94A3B8)', lineHeight: 1.5, marginBottom: '20px' }}>
            Somente usuários com nível de <strong>Gerência</strong> ou <strong>Master</strong> possuem autorização para alterar a unidade de um lead.
          </p>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              background: 'var(--adm-accent, #14A9D7)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.86rem',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Entendido
          </button>
        </div>
      </div>
    );
  }

  const handleConfirmTransfer = async () => {
    if (!selectedVenueId || selectedVenueId === lead.venueId) {
      showSystemAlert('Selecione uma unidade diferente da atual para transferir o lead.', 'Atenção', 'warning');
      return;
    }

    if (!targetVenue) {
      showSystemAlert('Unidade de destino não encontrada.', 'Erro', 'error');
      return;
    }

    if (eligibleFunnelsForTargetVenue.length === 0) {
      showSystemAlert(
        `Não é possível transferir este lead no momento porque não há nenhum funil comercial vinculado ou cadastrado para a unidade "${targetVenue.name}".`,
        'Transferência Indisponível',
        'warning'
      );
      return;
    }

    if (!destinationFunnel) {
      showSystemAlert(
        'Não é possível transferir este lead no momento porque não há nenhum funil atrelado à unidade de transferência com caixa de entrada disponível.',
        'Transferência Indisponível',
        'warning'
      );
      return;
    }

    if (!transferReason.trim() || transferReason.trim().length < 5) {
      setReasonError('Informe o motivo da transferência detalhado (mínimo de 5 caracteres) para o histórico.');
      return;
    }

    setIsSubmitting(true);
    setReasonError(null);

    try {
      const currentVenueName = currentVenue?.name || lead.venueName || 'Unidade Anterior';
      const authorName = currentUser?.name || 'Gestão';
      const existingTags = (lead.tags || []).filter(t => t.toLowerCase() !== 'transferência');
      const updatedTags = [...existingTags, 'Transferência'];

      const isFunnelChanging = destinationFunnel.id !== lead.funnelId;
      const initialStageId = destinationFunnel.stages?.[0]?.id || 'new_lead';

      const unassignedDueToAccess = assigneeAccessStatus === 'lacks_access';

      const auditLines: string[] = [
        `Transferência de unidade realizada por ${authorName}.`,
        `De: "${currentVenueName}" ➔ Para: "${targetVenue.name}".`,
        isFunnelChanging 
          ? `Funil: "${destinationFunnel.name}" (Etapa de entrada: ${destinationFunnel.stages?.[0]?.name || 'Novo Lead'}).`
          : `Funil: "${destinationFunnel.name}" (Funil mantido).`,
      ];

      if (unassignedDueToAccess) {
        auditLines.push(`O responsável anterior (${assignedDisplayName || 'Colaborador'}) foi desvinculado por não ter acesso à nova casa. Lead colocado Em Aberto.`);
      }

      auditLines.push(`Motivo da Transferência: "${transferReason.trim()}"`);

      const auditActivity = {
        id: generateUuid(),
        leadId: lead.id,
        timestamp: new Date().toISOString(),
        type: 'note' as const,
        title: 'Transferência de Unidade & Funil',
        text: auditLines.join('\n'),
        authorName,
        authorId: currentUser?.id,
        authorAvatarUrl: currentUser?.avatarUrl,
      };

      const updates: Partial<Lead> = {
        venueId: targetVenue.id,
        venueName: targetVenue.name,
        funnelId: destinationFunnel.id,
        tags: updatedTags,
        activities: [...(lead.activities || []), auditActivity],
      };

      if (isFunnelChanging) {
        updates.stage = initialStageId as any;
      }

      if (unassignedDueToAccess) {
        updates.assignedTo = undefined;
        updates.sdrId = undefined;
        updates.sdrName = undefined;
        updates.closerId = undefined;
        updates.closerName = undefined;
      }

      // Executa atualização no contexto e Supabase
      updateLeadData(lead.id, updates);

      const updatedLead: Lead = {
        ...lead,
        ...updates,
      };

      if (onSuccess) {
        onSuccess(updatedLead);
      }

      showSystemAlert(`Lead "${lead.name}" transferido com sucesso para a unidade "${targetVenue.name}".`, 'Transferência Concluída', 'success');
      onClose();
    } catch (err: any) {
      console.error('Erro ao transferir lead de unidade:', err);
      const msg = err?.message || 'Ocorreu um erro ao comunicar com o servidor. A justificativa e opções foram preservadas. Tente novamente.';
      setReasonError(msg);
      showSystemAlert(`Falha ao transferir lead: ${msg}`, 'Erro na Transferência', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.82)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2600,
      padding: '20px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      animation: 'fadeIn 0.15s ease-out',
    }}>
      <div style={{
        background: 'var(--adm-bg-card, #1A1D24)',
        border: '1.5px solid var(--adm-border, rgba(255, 255, 255, 0.1))',
        borderRadius: '20px',
        maxWidth: '560px',
        width: '100%',
        maxHeight: '90vh',
        boxShadow: '0 24px 64px rgba(0, 0, 0, 0.85), 0 0 24px rgba(20, 169, 215, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'scaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {/* Cabeçalho */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--adm-border, rgba(255, 255, 255, 0.08))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(20, 169, 215, 0.12)',
              border: '1px solid rgba(20, 169, 215, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--adm-accent, #14A9D7)',
            }}>
              <ArrowRightLeft size={20} />
            </div>
            <div>
              <h3 style={{
                fontSize: '1.05rem',
                fontWeight: 800,
                color: 'var(--adm-text-title, #fff)',
                margin: 0,
                letterSpacing: '-0.3px',
              }}>
                Transferir Casa de Festas & Funil
              </h3>
              <p style={{
                fontSize: '0.74rem',
                color: 'var(--adm-text-muted, #94A3B8)',
                margin: '2px 0 0 0',
              }}>
                Alterar a unidade física vinculada e esteira comercial do lead
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--adm-text-muted, #94A3B8)',
              cursor: 'pointer',
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

        {/* Corpo do Modal (Scrollável) */}
        <div style={{
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          overflowY: 'auto',
          flex: 1,
        }}>
          {/* Card Resumo do Lead */}
          <div style={{
            background: 'var(--adm-bg-input, rgba(255, 255, 255, 0.03))',
            border: '1px solid var(--adm-border, rgba(255, 255, 255, 0.08))',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--adm-text-title, #fff)' }}>
                {lead.name}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted, #94A3B8)', marginTop: '2px' }}>
                {lead.phone} {lead.code ? `• Cód: ${lead.code}` : ''}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: '0.70rem',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(20, 169, 215, 0.12)',
                color: 'var(--adm-accent, #14A9D7)',
                border: '1px solid rgba(20, 169, 215, 0.25)',
                display: 'inline-block',
                marginBottom: '3px',
              }}>
                {currentVenue?.name || lead.venueName || 'Sem Unidade'}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted, #94A3B8)' }}>
                Funil atual: <strong>{currentLeadFunnel?.name || 'Comercial'}</strong>
              </div>
            </div>
          </div>

          {/* 1. Seleção da Nova Casa de Festas */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--adm-text-title, #fff)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '6px',
            }}>
              1. Nova Casa de Festas (Destino) *
            </label>

            <div style={{ position: 'relative' }}>
              <div
                onClick={() => {
                  setIsVenueDropdownOpen(!isVenueDropdownOpen);
                  setIsFunnelDropdownOpen(false);
                }}
                style={{
                  background: 'var(--adm-bg-input, rgba(255, 255, 255, 0.04))',
                  border: isVenueDropdownOpen ? '1.5px solid var(--adm-accent, #14A9D7)' : '1px solid var(--adm-border, rgba(255, 255, 255, 0.12))',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(20, 169, 215, 0.15)',
                    border: '1px solid rgba(20, 169, 215, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--adm-accent, #14A9D7)',
                    overflow: 'hidden',
                  }}>
                    {targetVenue?.ballroomImageUrl || targetVenue?.ballroomImageUrl ? (
                      <img src={targetVenue.ballroomImageUrl} alt={targetVenue.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Building2 size={16} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--adm-text-title, #fff)' }}>
                      {targetVenue?.name || 'Selecione uma casa de festas'}
                    </div>
                    {targetVenue?.address && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted, #94A3B8)' }}>
                        {targetVenue.address}
                      </div>
                    )}
                  </div>
                </div>

                <ChevronDown size={18} color="var(--adm-text-muted, #94A3B8)" style={{
                  transform: isVenueDropdownOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease',
                }} />
              </div>

              {isVenueDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  right: 0,
                  background: 'var(--adm-bg-card, #1E222B)',
                  border: '1px solid var(--adm-border, rgba(255, 255, 255, 0.12))',
                  borderRadius: '12px',
                  boxShadow: '0 12px 36px rgba(0, 0, 0, 0.65)',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: 30,
                  padding: '6px',
                }}>
                  {venues.map(v => {
                    const isCurrent = v.id === lead.venueId;
                    const isSelected = v.id === selectedVenueId;
                    return (
                      <div
                        key={v.id}
                        onClick={() => {
                          if (isCurrent) return;
                          setSelectedVenueId(v.id);
                          setIsVenueDropdownOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          background: isSelected ? 'rgba(20, 169, 215, 0.12)' : 'transparent',
                          cursor: isCurrent ? 'not-allowed' : 'pointer',
                          opacity: isCurrent ? 0.45 : 1,
                          transition: 'background 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--adm-accent, #14A9D7)',
                            overflow: 'hidden',
                          }}>
                            <Building2 size={14} />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: isSelected ? 800 : 600, color: 'var(--adm-text-title, #fff)' }}>
                              {v.name} {isCurrent && '(Atual)'}
                            </div>
                            {v.address && (
                              <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted, #94A3B8)' }}>
                                {v.address}
                              </div>
                            )}
                          </div>
                        </div>

                        {isSelected && <Check size={16} color="var(--adm-accent, #14A9D7)" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 2. Destino do Funil Comercial (Regra de Vínculo do Áudio) */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--adm-text-title, #fff)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '6px',
            }}>
              2. Funil Comercial de Destino *
            </label>

            {eligibleFunnelsForTargetVenue.length === 0 ? (
              /* Cenário 0: A unidade de destino não possui nenhum funil cadastrado */
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1.5px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '12px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}>
                <AlertCircle size={20} color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#EF4444', marginBottom: '2px' }}>
                    Unidade sem Funil Comercial Cadastrado
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-title, #fff)', lineHeight: 1.45 }}>
                    A unidade selecionada (<strong>"{targetVenue?.name}"</strong>) não possui nenhum funil de vendas ativo ou compartilhado. Não é possível transferir leads para uma unidade sem funis.
                  </div>
                </div>
              </div>
            ) : currentFunnelHasLinkWithTargetVenue ? (
              /* Cenário A: O funil atual possui vínculo com a nova casa */
              <div style={{
                background: 'var(--adm-bg-input, rgba(255, 255, 255, 0.03))',
                border: '1px solid var(--adm-border, rgba(255, 255, 255, 0.1))',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} color="#10B981" />
                  <span style={{ fontSize: '0.78rem', color: '#10B981', fontWeight: 700 }}>
                    O funil atual "{currentLeadFunnel?.name}" possui vínculo ativo com {targetVenue?.name}.
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '2px' }}>
                  {/* Opção 1: Manter no funil atual */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: keepCurrentFunnel ? 'rgba(20, 169, 215, 0.12)' : 'transparent',
                      border: keepCurrentFunnel ? '1px solid var(--adm-accent, #14A9D7)' : '1px solid var(--adm-border, rgba(255, 255, 255, 0.06))',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="funnel_choice"
                      checked={keepCurrentFunnel}
                      onChange={() => setKeepCurrentFunnel(true)}
                      style={{ accentColor: '#14A9D7', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--adm-text-title, #fff)' }}>
                        Manter no mesmo funil ({currentLeadFunnel?.name})
                      </span>
                      <div style={{ fontSize: '0.70rem', color: 'var(--adm-text-muted, #94A3B8)' }}>
                        Preserva a etapa atual do lead no funil compartilhado.
                      </div>
                    </div>
                  </label>

                  {/* Opção 2: Mover para outro funil da nova unidade */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: !keepCurrentFunnel ? 'rgba(20, 169, 215, 0.12)' : 'transparent',
                      border: !keepCurrentFunnel ? '1px solid var(--adm-accent, #14A9D7)' : '1px solid var(--adm-border, rgba(255, 255, 255, 0.06))',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="funnel_choice"
                      checked={!keepCurrentFunnel}
                      onChange={() => {
                        setKeepCurrentFunnel(false);
                        if (!selectedFunnelId || selectedFunnelId === currentLeadFunnel?.id) {
                          const other = eligibleFunnelsForTargetVenue.find(f => f.id !== currentLeadFunnel?.id) || defaultEntryFunnelForTarget || eligibleFunnelsForTargetVenue[0];
                          if (other) setSelectedFunnelId(other.id);
                        }
                      }}
                      style={{ accentColor: '#14A9D7', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--adm-text-title, #fff)' }}>
                        Mover para outro funil de {targetVenue?.name}
                      </span>
                      <div style={{ fontSize: '0.70rem', color: 'var(--adm-text-muted, #94A3B8)' }}>
                        Encaminha o lead para uma esteira comercial específica da casa de destino.
                      </div>
                    </div>
                  </label>
                </div>

                {!keepCurrentFunnel && (
                  <div style={{ marginTop: '4px' }}>
                    {renderFunnelDropdown()}
                  </div>
                )}
              </div>
            ) : targetVenueHasEntryFunnel ? (
              /* Cenário B1: O funil atual NÃO possui vínculo, mas a nova casa possui Esteira de Entrada Oficial */
              <div style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1.5px solid rgba(245, 158, 11, 0.35)',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <AlertTriangle size={18} color="#F59E0B" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-title, #fff)', lineHeight: 1.45 }}>
                    O funil atual <strong>"{currentLeadFunnel?.name || 'Origem'}"</strong> não possui vínculo com <strong>{targetVenue?.name}</strong>.
                    <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted, #94A3B8)', marginTop: '2px' }}>
                      O lead deve ser encaminhado para um funil da nova unidade (o funil com esteira de entrada <strong>"{defaultEntryFunnelForTarget?.name}"</strong> foi selecionado automaticamente).
                    </div>
                  </div>
                </div>

                {renderFunnelDropdown()}
              </div>
            ) : (
              /* Cenário B2: O funil atual NÃO possui vínculo e a nova casa NÃO possui Funil com Esteira de Entrada Ativa */
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1.5px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <AlertCircle size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-title, #fff)', lineHeight: 1.45 }}>
                    A unidade <strong>"{targetVenue?.name}"</strong> não possui nenhum funil com <strong>esteira de entrada (caixa de entrada)</strong> ativa disponível.
                    <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted, #94A3B8)', marginTop: '2px' }}>
                      Como o funil atual não tem vínculo com a nova casa, selecione manualmente abaixo um dos outros funis disponíveis para direcionar o lead.
                    </div>
                  </div>
                </div>

                {renderFunnelDropdown()}
              </div>
            )}
          </div>

          {/* 3. Análise de Responsável & Acesso na Nova Unidade */}
          <div style={{
            borderRadius: '12px',
            padding: '12px 14px',
            border: assigneeAccessStatus === 'lacks_access'
              ? '1.5px solid rgba(245, 158, 11, 0.4)'
              : assigneeAccessStatus === 'has_access'
              ? '1px solid rgba(16, 185, 129, 0.3)'
              : '1px solid var(--adm-border, rgba(255, 255, 255, 0.08))',
            background: assigneeAccessStatus === 'lacks_access'
              ? 'rgba(245, 158, 11, 0.08)'
              : assigneeAccessStatus === 'has_access'
              ? 'rgba(16, 185, 129, 0.06)'
              : 'var(--adm-bg-input, rgba(255, 255, 255, 0.02))',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ marginTop: '2px', flexShrink: 0 }}>
                {assigneeAccessStatus === 'lacks_access' ? (
                  <AlertTriangle size={18} color="#F59E0B" />
                ) : assigneeAccessStatus === 'has_access' ? (
                  <CheckCircle2 size={18} color="#10B981" />
                ) : (
                  <User size={18} color="var(--adm-text-muted, #94A3B8)" />
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: assigneeAccessStatus === 'lacks_access'
                    ? '#F59E0B'
                    : assigneeAccessStatus === 'has_access'
                    ? '#10B981'
                    : 'var(--adm-text-title, #fff)',
                  marginBottom: '2px',
                }}>
                  {assigneeAccessStatus === 'lacks_access'
                    ? 'Atenção: Quebra de Vínculo de Atendimento'
                    : assigneeAccessStatus === 'has_access'
                    ? 'Vínculo Preservado na Nova Unidade'
                    : 'Lead Sem Responsável Vinculado'}
                </div>

                <p style={{
                  fontSize: '0.74rem',
                  color: 'var(--adm-text-muted, #94A3B8)',
                  lineHeight: 1.45,
                  margin: 0,
                }}>
                  {assigneeAccessStatus === 'lacks_access' ? (
                    <>
                      O colaborador <strong>"{assignedDisplayName}"</strong> não possui acesso à unidade <strong>"{targetVenue?.name}"</strong>.
                      Ao transferir, o lead será desvinculado e passará para <strong>"Em Aberto"</strong> para a equipe da nova casa assumir.
                    </>
                  ) : assigneeAccessStatus === 'has_access' ? (
                    <>
                      O colaborador <strong>"{assignedDisplayName}"</strong> possui acesso a <strong>"{targetVenue?.name}"</strong> e continuará atendendo este lead.
                    </>
                  ) : (
                    <>
                      O lead entrará na unidade <strong>"{targetVenue?.name}"</strong> com status <strong>"Em Aberto"</strong> na esteira de entrada.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* 4. Motivo da Transferência (Histórico Oficial com Foto da Gerente) */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--adm-text-title, #fff)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '6px',
            }}>
              3. Motivo da Transferência (Histórico Oficial) *
            </label>

            <textarea
              rows={3}
              value={transferReason}
              onChange={(e) => {
                setTransferReason(e.target.value);
                if (reasonError) setReasonError(null);
              }}
              placeholder="Descreva o motivo da transferência para a equipe de destino (ex: cliente solicitou alteração de unidade para facilitar a logística dos convidados, reagendamento de visita...)"
              style={{
                width: '100%',
                background: 'var(--adm-bg-input, rgba(255, 255, 255, 0.04))',
                border: reasonError ? '1.5px solid #EF4444' : '1px solid var(--adm-border, rgba(255, 255, 255, 0.12))',
                borderRadius: '12px',
                padding: '10px 14px',
                color: 'var(--adm-text-title, #fff)',
                fontSize: '0.82rem',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'none',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                lineHeight: 1.45,
              }}
            />

            {reasonError && (
              <div style={{ fontSize: '0.72rem', color: '#EF4444', fontWeight: 700, marginTop: '4px' }}>
                {reasonError}
              </div>
            )}

            {/* Identificação de quem está registrando */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginTop: '8px',
              padding: '8px 12px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--adm-border, rgba(255, 255, 255, 0.06))',
              borderRadius: '10px',
            }}>
              <SafeAvatar
                name={currentUser?.name || 'Gestora'}
                src={currentUser?.avatarUrl}
                size={28}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-title, #fff)' }}>
                  {currentUser?.name || 'Gestão Master'}
                  <span style={{ fontSize: '0.66rem', fontWeight: 600, color: 'var(--adm-accent, #14A9D7)', marginLeft: '6px' }}>
                    ({formatAccessRoleLabel(currentUser?.role)})
                  </span>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted, #94A3B8)' }}>
                  A foto e justificativa serão fixadas na linha do tempo do lead.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé / Ações */}
        <div style={{
          padding: '16px 24px 20px',
          borderTop: '1px solid var(--adm-border, rgba(255, 255, 255, 0.08))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '12px',
          flexShrink: 0,
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: '1px solid var(--adm-border, rgba(255, 255, 255, 0.12))',
              background: 'transparent',
              color: 'var(--adm-text-muted, #94A3B8)',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirmTransfer}
            disabled={isSubmitting || !selectedVenueId || selectedVenueId === lead.venueId || eligibleFunnelsForTargetVenue.length === 0 || !destinationFunnel}
            style={{
              padding: '10px 22px',
              borderRadius: '10px',
              border: 'none',
              background: 'var(--adm-accent, #14A9D7)',
              color: '#fff',
              fontSize: '0.84rem',
              fontWeight: 800,
              cursor: (isSubmitting || !selectedVenueId || selectedVenueId === lead.venueId) ? 'not-allowed' : 'pointer',
              opacity: (isSubmitting || !selectedVenueId || selectedVenueId === lead.venueId) ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(20, 169, 215, 0.35)',
            }}
          >
            {isSubmitting ? (
              'Transferindo...'
            ) : (
              <>
                <ArrowRightLeft size={16} />
                Confirmar Transferência
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  function renderFunnelDropdown() {
    return (
      <div style={{ position: 'relative' }}>
        <div
          onClick={() => {
            setIsFunnelDropdownOpen(!isFunnelDropdownOpen);
            setIsVenueDropdownOpen(false);
          }}
          style={{
            background: 'var(--adm-bg-input, rgba(255, 255, 255, 0.04))',
            border: isFunnelDropdownOpen ? '1.5px solid var(--adm-accent, #14A9D7)' : '1px solid var(--adm-border, rgba(255, 255, 255, 0.12))',
            borderRadius: '10px',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GitBranch size={16} color="var(--adm-accent, #14A9D7)" />
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title, #fff)' }}>
                {destinationFunnel?.name || 'Selecione um funil'}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted, #94A3B8)' }}>
                {destinationFunnel?.isEntryStageActive ? 'Esteira de entrada oficial' : 'Funil comercial de atendimento'}
              </div>
            </div>
          </div>

          <ChevronDown size={16} color="var(--adm-text-muted, #94A3B8)" style={{
            transform: isFunnelDropdownOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease',
          }} />
        </div>

        {isFunnelDropdownOpen && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--adm-bg-card, #1E222B)',
            border: '1px solid var(--adm-border, rgba(255, 255, 255, 0.12))',
            borderRadius: '10px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.65)',
            maxHeight: '180px',
            overflowY: 'auto',
            zIndex: 40,
            padding: '6px',
          }}>
            {eligibleFunnelsForTargetVenue.map(f => {
              const isSelected = f.id === destinationFunnel?.id;
              const isEntry = Boolean(f.isEntryStageActive || f.isPrimary);

              return (
                <div
                  key={f.id}
                  onClick={() => {
                    setSelectedFunnelId(f.id);
                    setIsFunnelDropdownOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: isSelected ? 'rgba(20, 169, 215, 0.12)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <GitBranch size={14} color={isSelected ? 'var(--adm-accent, #14A9D7)' : 'var(--adm-text-muted)'} />
                    <div>
                      <div style={{ fontSize: '0.80rem', fontWeight: isSelected ? 800 : 600, color: 'var(--adm-text-title, #fff)' }}>
                        {f.name}
                      </div>
                      {isEntry && (
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#10B981',
                        }}>
                          Esteira de Entrada
                        </span>
                      )}
                    </div>
                  </div>

                  {isSelected && <Check size={14} color="var(--adm-accent, #14A9D7)" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
};
