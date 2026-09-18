import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  ArrowRight, 
  Layers, 
  ShieldAlert, 
  Loader2, 
  CheckCircle2, 
  Radio, 
  Sparkles,
  Info
} from 'lucide-react';
import type { CommercialFunnel, Lead } from '../../types/admin';
import type { Source } from '../../types/sources';

interface AdminFunnelDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  funnelToDelete: CommercialFunnel | null;
  availableFunnels: CommercialFunnel[];
  leads: Lead[];
  sources: Source[];
  onConfirmDelete: (destinationFunnelId: string, stageMapping: Record<string, string>) => Promise<void>;
}

export const AdminFunnelDeleteModal: React.FC<AdminFunnelDeleteModalProps> = ({
  isOpen,
  onClose,
  funnelToDelete,
  availableFunnels,
  leads,
  sources,
  onConfirmDelete,
}) => {
  if (!isOpen || !funnelToDelete) return null;

  // Destination funnels (excluding the one being deleted)
  const otherFunnels = useMemo(() => {
    return availableFunnels.filter(f => f.id !== funnelToDelete.id);
  }, [availableFunnels, funnelToDelete.id]);

  const [selectedDestFunnelId, setSelectedDestFunnelId] = useState<string>(() => {
    return otherFunnels[0]?.id || 'unassigned';
  });

  const isUnassigned = selectedDestFunnelId === 'unassigned';

  const selectedDestFunnel = useMemo(() => {
    if (isUnassigned) return null;
    return otherFunnels.find(f => f.id === selectedDestFunnelId) || otherFunnels[0] || null;
  }, [otherFunnels, selectedDestFunnelId, isUnassigned]);

  // Leads belonging to this funnel
  const funnelLeads = useMemo(() => {
    return leads.filter(l => l.funnelId === funnelToDelete.id);
  }, [leads, funnelToDelete.id]);

  // Sources belonging to this funnel
  const linkedSources = useMemo(() => {
    return sources.filter(s => s.funnelId === funnelToDelete.id);
  }, [sources, funnelToDelete.id]);

  // Stage categorization of leads in the deleted funnel
  const stageStats = useMemo(() => {
    const ganho = funnelLeads.filter(l => l.stage === 'contract_signed' || (l.stage as string) === 'deal_closed');
    const perdido = funnelLeads.filter(l => l.stage === 'lost');
    const novoLead = funnelLeads.filter(l => l.stage === 'new_lead');
    
    // Intermediate custom stages
    const intermediateMap: Record<string, Lead[]> = {};
    funnelLeads.forEach(l => {
      if (l.stage !== 'contract_signed' && (l.stage as string) !== 'deal_closed' && l.stage !== 'lost' && l.stage !== 'new_lead') {
        if (!intermediateMap[l.stage]) {
          intermediateMap[l.stage] = [];
        }
        intermediateMap[l.stage].push(l);
      }
    });

    return {
      ganhoCount: ganho.length,
      perdidoCount: perdido.length,
      novoLeadCount: novoLead.length,
      intermediateMap,
      totalLeads: funnelLeads.length,
    };
  }, [funnelLeads]);

  // Stages defined in the funnel to delete (excluding standard fixed endpoints if present)
  const sourceCustomStages = useMemo(() => {
    const stages = funnelToDelete.stages || [];
    return stages.filter(s => s.id !== 'contract_signed' && s.id !== 'deal_closed' && s.id !== 'lost' && s.id !== 'new_lead');
  }, [funnelToDelete]);

  // All custom stages that either exist in config or have active leads
  const stagesToMap = useMemo(() => {
    const stageIds = new Set<string>();
    sourceCustomStages.forEach(s => stageIds.add(s.id));
    Object.keys(stageStats.intermediateMap).forEach(id => stageIds.add(id));

    return Array.from(stageIds).map(id => {
      const config = (funnelToDelete.stages || []).find(s => s.id === id);
      const leadsForStage = stageStats.intermediateMap[id] || [];
      return {
        id,
        name: config?.name || (id === 'in_analysis' ? 'Em Análise' : id === 'meeting_scheduled' ? 'Reunião Agendada' : id),
        color: config?.color || '#3B82F6',
        leadsCount: leadsForStage.length,
      };
    });
  }, [sourceCustomStages, funnelToDelete, stageStats.intermediateMap]);

  // Destination stages available for intermediate mapping
  const destinationAvailableStages = useMemo(() => {
    if (!selectedDestFunnel) return [];
    if (selectedDestFunnel.stages && selectedDestFunnel.stages.length > 0) {
      return selectedDestFunnel.stages.filter(s => s.id !== 'contract_signed' && s.id !== 'lost');
    }
    // Fallback standard stages
    return [
      { id: 'in_analysis', name: 'Em Análise', color: '#3B82F6', order: 1 },
      { id: 'meeting_scheduled', name: 'Reunião Agendada', color: '#8B5CF6', order: 2 },
    ];
  }, [selectedDestFunnel]);

  // Mapping state: [sourceStageId]: destinationStageId
  const [stageMapping, setStageMapping] = useState<Record<string, string>>({});

  // Initialize/Update mapping when destination funnel changes
  React.useEffect(() => {
    if (!selectedDestFunnel) return;
    const defaultTarget = destinationAvailableStages[0]?.id || 'in_analysis';
    const newMapping: Record<string, string> = {};

    stagesToMap.forEach(src => {
      // Try finding a matching stage name in destination
      const exactMatch = destinationAvailableStages.find(
        d => d.name.toLowerCase().trim() === src.name.toLowerCase().trim() || d.id === src.id
      );
      newMapping[src.id] = exactMatch ? exactMatch.id : defaultTarget;
    });

    setStageMapping(newMapping);
  }, [selectedDestFunnelId, stagesToMap, destinationAvailableStages, selectedDestFunnel]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStageChange = (sourceStageId: string, targetStageId: string) => {
    setStageMapping(prev => ({
      ...prev,
      [sourceStageId]: targetStageId,
    }));
  };

  const handleSubmit = async () => {
    if (!selectedDestFunnelId) {
      setErrorMsg('Por favor, selecione o destino dos leads.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onConfirmDelete(selectedDestFunnelId, stageMapping);
      onClose();
    } catch (err: any) {
      console.error('Erro ao excluir funil:', err);
      setErrorMsg(err?.message || 'Erro ao processar a exclusão e migração.');
    } finally {
      setIsSubmitting(false);
    }
  };


  // ── RENDER CASE 1: Cannot delete if only 1 funnel exists ──
  if (otherFunnels.length === 0) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.15s ease',
      }}>
        <div style={{
          background: 'var(--adm-bg-card)',
          border: '1px solid var(--adm-border)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '480px',
          padding: '28px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '16px',
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#EF4444',
          }}>
            <ShieldAlert size={28} />
          </div>

          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
              Ação Bloqueada
            </h3>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--adm-text-muted)', lineHeight: '1.5' }}>
              Este é o <strong>único funil ativo</strong> na sua conta. O sistema exige ao menos um funil comercial ativo para operação do CRM. Crie outro funil antes de excluir este.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              marginTop: '8px',
              padding: '10px 24px',
              background: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
              borderRadius: '8px',
              color: 'var(--adm-text-title)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Entendido
          </button>
        </div>
      </div>
    );
  }

  // ── RENDER CASE 2: Empty Funnel (0 Leads) ──
  if (funnelLeads.length === 0) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.15s ease',
      }}>
        <div style={{
          background: 'var(--adm-bg-card)',
          border: '1px solid var(--adm-border)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '520px',
          padding: '28px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          position: 'relative',
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'transparent',
              border: 'none',
              color: 'var(--adm-text-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EF4444',
              flexShrink: 0,
            }}>
              <Trash2 size={24} />
            </div>

            <div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                Excluir Funil de Vendas
              </h3>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--adm-text-muted)', lineHeight: '1.45' }}>
                Tem certeza que deseja excluir permanentemente o funil <strong style={{ color: 'var(--adm-text-title)' }}>{funnelToDelete.name}</strong>?
              </p>
            </div>
          </div>

          <div style={{
            background: 'var(--adm-bg-input)',
            border: '1px solid var(--adm-border)',
            borderRadius: '10px',
            padding: '14px 16px',
            marginBottom: '20px',
            fontSize: '0.84rem',
            color: 'var(--adm-text-body)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10B981', fontWeight: 600 }}>
              <CheckCircle2 size={16} />
              <span>Nenhum lead ativo no funil no momento.</span>
            </div>
            {linkedSources.length > 0 && (
              <div style={{
                marginTop: '6px',
                paddingTop: '10px',
                borderTop: '1px solid var(--adm-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#F59E0B', fontWeight: 600, fontSize: '0.8rem' }}>
                  <Radio size={14} />
                  <span>{linkedSources.length} canal(is) de origem apontam para este funil.</span>
                </div>
                <label style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', fontWeight: 600 }}>
                  Redirecionar novos leads dos canais para:
                </label>
                <select
                  value={selectedDestFunnelId}
                  onChange={(e) => setSelectedDestFunnelId(e.target.value)}
                  style={{
                    background: 'var(--adm-bg-card)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '8px',
                    color: 'var(--adm-text-title)',
                    fontSize: '0.85rem',
                    padding: '8px 12px',
                    outline: 'none',
                    fontWeight: 600,
                  }}
                >
                  {otherFunnels.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {errorMsg && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#EF4444',
              fontSize: '0.82rem',
              marginBottom: '16px',
            }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '9px 18px',
                background: 'transparent',
                border: '1px solid var(--adm-border)',
                borderRadius: '8px',
                color: 'var(--adm-text-muted)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                padding: '9px 20px',
                background: '#EF4444',
                border: 'none',
                borderRadius: '8px',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 10px rgba(239, 68, 68, 0.3)',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Excluindo...</span>
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  <span>Confirmar Exclusão</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER CASE 3: Funnel With Leads (Lead Migration & Stage Mapping) ──
  const destHasEntryStage = Boolean(selectedDestFunnel?.isEntryStageActive);
  const destFirstStageName = selectedDestFunnel?.stages?.[0]?.name || '1ª Etapa Personalizada';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      animation: 'fadeIn 0.15s ease',
    }}>
      <div style={{
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '18px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--adm-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(239, 68, 68, 0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EF4444',
            }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                Migração de Leads & Exclusão de Funil
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>
                O funil <strong style={{ color: 'var(--adm-text-title)' }}>{funnelToDelete.name}</strong> possui{' '}
                <span style={{ color: '#EF4444', fontWeight: 700 }}>{funnelLeads.length} leads</span> que serão migrados.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--adm-text-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{
          padding: '24px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '22px',
        }}>
          {/* STEP 1: Select Destination Funnel */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.82rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'var(--adm-text-muted)',
              marginBottom: '10px',
            }}>
              1. Para onde deseja enviar os leads deste funil?
            </label>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: otherFunnels.length > 0 ? 'repeat(auto-fit, minmax(260px, 1fr))' : '1fr',
              gap: '10px',
            }}>
              {otherFunnels.map(f => {
                const isSelected = f.id === selectedDestFunnelId;
                const stagesCount = f.stages?.length || f.stagesCount || 4;
                return (
                  <div
                    key={f.id}
                    onClick={() => setSelectedDestFunnelId(f.id)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid var(--adm-accent, #D4AF37)' : '1px solid var(--adm-border)',
                      background: isSelected ? 'rgba(212, 175, 55, 0.08)' : 'var(--adm-bg-input)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: isSelected ? 'var(--adm-accent, #D4AF37)' : 'rgba(255,255,255,0.06)',
                        color: isSelected ? '#000' : 'var(--adm-text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Layers size={16} />
                      </div>
                      <div>
                        <div style={{
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          color: isSelected ? 'var(--adm-text-title)' : 'var(--adm-text-body)',
                        }}>
                          {f.name}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
                          {stagesCount} etapas configuradas
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 size={18} color="var(--adm-accent, #D4AF37)" />
                    )}
                  </div>
                );
              })}

              {/* Opção Desatribuir Leads */}
              <div
                onClick={() => setSelectedDestFunnelId('unassigned')}
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: isUnassigned ? '2px solid #F59E0B' : '1px solid var(--adm-border)',
                  background: isUnassigned ? 'rgba(245, 158, 11, 0.08)' : 'var(--adm-bg-input)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: isUnassigned ? '#F59E0B' : 'rgba(255,255,255,0.06)',
                    color: isUnassigned ? '#000' : 'var(--adm-text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Radio size={16} />
                  </div>
                  <div>
                    <div style={{
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      color: isUnassigned ? 'var(--adm-text-title)' : 'var(--adm-text-body)',
                    }}>
                      Desatribuir Leads (Sem Funil)
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
                      Mantém os leads preservados na base geral
                    </div>
                  </div>
                </div>
                {isUnassigned && (
                  <CheckCircle2 size={18} color="#F59E0B" />
                )}
              </div>
            </div>
          </div>

          {/* Se Unassigned foi escolhido, mostra aviso claro */}
          {isUnassigned ? (
            <div style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: '12px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}>
              <Info size={20} color="#F59E0B" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.82rem', color: 'var(--adm-text-body)', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--adm-text-title)' }}>
                  {funnelLeads.length} leads
                </strong>{' '}
                deste funil não serão excluídos. Eles ficarão sem funil atribuído e poderão ser realocados posteriormente pelo filtro geral de leads.
              </div>
            </div>
          ) : (
            <>
              {/* STEP 2: Automatic Standard Stage Routing Rules */}
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                }}>
                  <label style={{
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: 'var(--adm-text-muted)',
                    margin: 0,
                  }}>
                    2. Roteamento Automático de Etapas Padrão
                  </label>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#10B981',
                    background: 'rgba(16, 185, 129, 0.12)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    <Sparkles size={11} /> Regra Nativa
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                }}>
                  {/* Ganho */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.82rem',
                    padding: '6px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
                      <span style={{ fontWeight: 600, color: 'var(--adm-text-title)' }}>Contrato Fechado (Ganho)</span>
                      <span style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
                        ({stageStats.ganhoCount} {stageStats.ganhoCount === 1 ? 'lead' : 'leads'})
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981', fontWeight: 600 }}>
                      <ArrowRight size={13} />
                      <span>Contrato Fechado no novo funil</span>
                    </div>
                  </div>

                  {/* Perdido */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.82rem',
                    padding: '6px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }} />
                      <span style={{ fontWeight: 600, color: 'var(--adm-text-title)' }}>Perdido / Recusado</span>
                      <span style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
                        ({stageStats.perdidoCount} {stageStats.perdidoCount === 1 ? 'lead' : 'leads'})
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#EF4444', fontWeight: 600 }}>
                      <ArrowRight size={13} />
                      <span>Perdido / Recusado no novo funil</span>
                    </div>
                  </div>

                  {/* Novo Lead (Entrada) */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.82rem',
                    padding: '6px 0',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3B82F6' }} />
                      <span style={{ fontWeight: 600, color: 'var(--adm-text-title)' }}>Novo Lead (Entrada)</span>
                      <span style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
                        ({stageStats.novoLeadCount} {stageStats.novoLeadCount === 1 ? 'lead' : 'leads'})
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3B82F6', fontWeight: 600 }}>
                      <ArrowRight size={13} />
                      <span>
                        {destHasEntryStage ? 'Novo Lead (Entrada Ativa)' : `1ª Etapa (${destFirstStageName})`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 3: Interactive Mapping for Custom Intermediate Stages */}
              {stagesToMap.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <label style={{
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: 'var(--adm-text-muted)',
                      margin: 0,
                    }}>
                      3. Mapeamento das Etapas Intermediárias
                    </label>
                    <span style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
                      Etapas com leads identificadas
                    </span>
                  </div>

                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}>
                    {stagesToMap.map(srcStage => {
                      const targetStageId = stageMapping[srcStage.id] || destinationAvailableStages[0]?.id || '';
                      return (
                        <div
                          key={srcStage.id}
                          style={{
                            background: 'var(--adm-bg-input)',
                            border: '1px solid var(--adm-border)',
                            borderRadius: '12px',
                            padding: '12px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                          }}
                        >
                          {/* Left: Source Stage & Count */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '200px' }}>
                            <span style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              background: srcStage.color,
                              flexShrink: 0,
                            }} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--adm-text-title)' }}>
                                {srcStage.name}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: srcStage.leadsCount > 0 ? 'var(--adm-accent, #D4AF37)' : 'var(--adm-text-muted)', fontWeight: srcStage.leadsCount > 0 ? 700 : 400 }}>
                                {srcStage.leadsCount} {srcStage.leadsCount === 1 ? 'lead' : 'leads'} nesta etapa
                              </div>
                            </div>
                          </div>

                          {/* Middle: Arrow */}
                          <div style={{ color: 'var(--adm-text-muted)', display: 'flex', alignItems: 'center' }}>
                            <ArrowRight size={16} />
                          </div>

                          {/* Right: Target Stage Dropdown */}
                          <div style={{ flex: 1, maxWidth: '280px' }}>
                            <select
                              value={targetStageId}
                              onChange={(e) => handleStageChange(srcStage.id, e.target.value)}
                              style={{
                                width: '100%',
                                background: 'var(--adm-bg-card)',
                                border: '1px solid var(--adm-border)',
                                borderRadius: '8px',
                                color: 'var(--adm-text-title)',
                                fontSize: '0.84rem',
                                fontWeight: 600,
                                padding: '8px 12px',
                                outline: 'none',
                              }}
                            >
                              {destinationAvailableStages.map(destStage => (
                                <option key={destStage.id} value={destStage.id}>
                                  {destStage.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}


          {/* STEP 4: Sources Rerouting Notice */}
          {linkedSources.length > 0 && (
            <div style={{
              background: 'rgba(212, 175, 55, 0.08)',
              border: '1px solid rgba(212, 175, 55, 0.25)',
              borderRadius: '12px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <Radio size={20} color="var(--adm-accent, #D4AF37)" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.82rem', color: 'var(--adm-text-body)' }}>
                <strong style={{ color: 'var(--adm-text-title)' }}>
                  {linkedSources.length} canal(is) de captação
                </strong>{' '}
                vinculados a este funil serão automaticamente redirecionados para{' '}
                <strong style={{ color: 'var(--adm-accent, #D4AF37)' }}>{selectedDestFunnel?.name}</strong>, evitando perda de novos leads futuros.
              </div>
            </div>
          )}

          {errorMsg && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#EF4444',
              fontSize: '0.82rem',
            }}>
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--adm-border)',
          background: 'var(--adm-bg-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--adm-text-muted)', fontSize: '0.78rem' }}>
            <Info size={14} />
            <span>Todos os dados e logs de migração são registrados automaticamente.</span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '9px 18px',
                background: 'transparent',
                border: '1px solid var(--adm-border)',
                borderRadius: '8px',
                color: 'var(--adm-text-muted)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                padding: '9px 20px',
                background: '#EF4444',
                border: 'none',
                borderRadius: '8px',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 10px rgba(239, 68, 68, 0.3)',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{isUnassigned ? 'Desatribuindo e Excluindo...' : 'Migrando e Excluindo...'}</span>
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  <span>{isUnassigned ? `Desatribuir ${funnelLeads.length} Leads e Excluir Funil` : `Migrar ${funnelLeads.length} Leads e Excluir Funil`}</span>
                </>
              )}

            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
