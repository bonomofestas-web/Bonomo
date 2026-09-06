import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronDown, X, Plus, Trash2, Zap, Copy
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import type { FunnelStageConfig, FunnelStageTrigger } from '../../types/admin';

interface AdminFunnelSettingsViewProps {
  initialFunnelId?: string;
  onClose: () => void;
  onSaved?: () => void;
}

export const AdminFunnelSettingsView: React.FC<AdminFunnelSettingsViewProps> = ({
  initialFunnelId,
  onClose,
  onSaved,
}) => {
  const { 
    funnels, 
    venues, 
    sources, 
    updateFunnel, 
    duplicateFunnel
  } = useAdminState();

  const [selectedFunnelId, setSelectedFunnelId] = useState<string>(() => {
    return initialFunnelId || funnels[0]?.id || '';
  });

  const activeFunnel = useMemo(() => {
    return funnels.find(f => f.id === selectedFunnelId) || funnels[0];
  }, [funnels, selectedFunnelId]);

  // Form states
  const [funnelName, setFunnelName] = useState('');
  const [isEntryStageActive, setIsEntryStageActive] = useState(false);
  const [detectDuplicates, setDetectDuplicates] = useState(true);
  const [phoneWidgetEnabled, setPhoneWidgetEnabled] = useState(true);
  const [primaryVenueId, setPrimaryVenueId] = useState('all');
  const [sharedVenueIds, setSharedVenueIds] = useState<string[]>([]);
  const [stages, setStages] = useState<FunnelStageConfig[]>([]);
  const [activeEditingHintStageId, setActiveEditingHintStageId] = useState<string | null>(null);
  const [activeAddingTriggerStageId, setActiveAddingTriggerStageId] = useState<string | null>(null);
  const [newTriggerType, setNewTriggerType] = useState<'notify_closer' | 'move_copy_to_funnel' | 'send_whatsapp'>('move_copy_to_funnel');
  const [newTriggerTargetFunnel, setNewTriggerTargetFunnel] = useState('');

  // Default initial stages if funnel has none
  const defaultStages: FunnelStageConfig[] = useMemo(() => [
    { id: 'new_lead', name: 'Etapa de Leads de Entrada', color: '#3B82F6', isFixed: true, order: 0 },
    { id: 'in_negotiation', name: 'Em Negociação', color: '#60A5FA', order: 1 },
    { id: 'discussions', name: 'Discussões / Proposta', color: '#F59E0B', order: 2 },
    { id: 'decision', name: 'Tomada de Decisão', color: '#EC4899', order: 3 },
    { id: 'deal_closed', name: 'Contrato Fechado', color: '#10B981', isFixed: true, isWon: true, order: 4 },
    { id: 'lost', name: 'Perdido / Desistência', color: '#EF4444', isFixed: true, isLoss: true, order: 5 },
  ], []);

  // Sync state when selectedFunnel changes
  useEffect(() => {
    if (!activeFunnel) return;
    setFunnelName(activeFunnel.name || '');
    setIsEntryStageActive(Boolean(activeFunnel.isEntryStageActive));
    setDetectDuplicates(activeFunnel.detectDuplicates !== false);
    setPhoneWidgetEnabled(activeFunnel.phoneWidgetEnabled !== false);
    setPrimaryVenueId(activeFunnel.venueId || 'all');
    setSharedVenueIds(activeFunnel.sharedVenueIds || []);
    setStages(activeFunnel.stages && activeFunnel.stages.length > 0 ? activeFunnel.stages : defaultStages);
  }, [activeFunnel, defaultStages]);

  // Sources linked to this funnel
  const linkedSources = useMemo(() => {
    if (!activeFunnel) return [];
    return sources.filter(s => s.funnelId === activeFunnel.id);
  }, [sources, activeFunnel]);

  const handleSave = () => {
    if (!activeFunnel) return;
    updateFunnel(activeFunnel.id, {
      name: funnelName.trim() || activeFunnel.name,
      isEntryStageActive,
      detectDuplicates,
      phoneWidgetEnabled,
      venueId: primaryVenueId,
      sharedVenueIds,
      stages,
      stagesCount: stages.length,
    });

    if (onSaved) onSaved();
    onClose();
  };

  const handleDuplicate = () => {
    if (!activeFunnel) return;
    const newId = duplicateFunnel(activeFunnel.id);
    if (newId) {
      alert(`Funil duplicado com sucesso! O novo funil "${activeFunnel.name} (Cópia)" já está disponível.`);
      setSelectedFunnelId(newId);
    }
  };

  const handleAddStage = () => {
    const newStageName = prompt('Nome da nova etapa intermediária:');
    if (!newStageName?.trim()) return;

    // Insert before the last two fixed stages ('deal_closed' and 'lost')
    const wonIndex = stages.findIndex(s => s.isWon || s.id === 'deal_closed');
    const insertIndex = wonIndex > -1 ? wonIndex : stages.length;

    const newStage: FunnelStageConfig = {
      id: `stage_${Date.now()}`,
      name: newStageName.trim(),
      color: '#A855F7',
      order: insertIndex,
      hints: '',
      triggers: [],
    };

    const nextStages = [...stages];
    nextStages.splice(insertIndex, 0, newStage);
    setStages(nextStages);
  };

  const handleDeleteStage = (stageId: string) => {
    const target = stages.find(s => s.id === stageId);
    if (target?.isFixed) {
      alert('Esta é uma etapa padrão essencial do funil e não pode ser excluída.');
      return;
    }
    setStages(prev => prev.filter(s => s.id !== stageId));
  };

  const handleSaveHint = (stageId: string, hint: string) => {
    setStages(prev => prev.map(s => s.id === stageId ? { ...s, hints: hint } : s));
    setActiveEditingHintStageId(null);
  };

  const handleAddTrigger = (stageId: string) => {
    let label = '';
    if (newTriggerType === 'move_copy_to_funnel') {
      const destFunnel = funnels.find(f => f.id === newTriggerTargetFunnel);
      label = `Exibir lead simultaneamente no funil: ${destFunnel?.name || 'Vendas'}`;
    } else if (newTriggerType === 'notify_closer') {
      label = 'Notificar Closer responsável para atendimento urgente';
    } else {
      label = 'Disparar mensagem automática no WhatsApp do lead';
    }

    const trigger: FunnelStageTrigger = {
      id: `trig_${Date.now()}`,
      type: newTriggerType,
      label,
      targetFunnelId: newTriggerTargetFunnel,
      description: label,
    };

    setStages(prev => prev.map(s => {
      if (s.id !== stageId) return s;
      return {
        ...s,
        triggers: [...(s.triggers || []), trigger],
      };
    }));

    setActiveAddingTriggerStageId(null);
  };

  const handleRemoveTrigger = (stageId: string, triggerId: string) => {
    setStages(prev => prev.map(s => {
      if (s.id !== stageId) return s;
      return {
        ...s,
        triggers: (s.triggers || []).filter(t => t.id !== triggerId),
      };
    }));
  };

  const toggleSharedVenue = (venueId: string) => {
    setSharedVenueIds(prev => 
      prev.includes(venueId) ? prev.filter(id => id !== venueId) : [...prev, venueId]
    );
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'var(--adm-bg-main, #0D0B0E)',
      zIndex: 1050,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Inter', sans-serif",
      color: 'var(--adm-text-body)',
      overflow: 'hidden',
    }}>
      {/* Top Bar (Como CRM Style) */}
      <div style={{
        height: '60px',
        borderBottom: '1px solid var(--adm-border)',
        background: 'var(--adm-bg-card)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        {/* Left: Funnel Selector Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <select
              value={selectedFunnelId}
              onChange={(e) => setSelectedFunnelId(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--adm-text-title)',
                fontSize: '1.05rem',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                cursor: 'pointer',
                outline: 'none',
                fontFamily: "'Inter', sans-serif",
                paddingRight: '24px',
              }}
            >
              {funnels.map(f => (
                <option key={f.id} value={f.id} style={{ background: '#1A181C', color: '#FFF' }}>
                  {f.name}
                </option>
              ))}
            </select>
            <ChevronDown size={16} color="var(--adm-text-muted)" style={{ position: 'absolute', right: '4px', pointerEvents: 'none' }} />
          </div>

          <button
            type="button"
            onClick={handleDuplicate}
            title="Duplicar estrutura deste funil para outra unidade"
            style={{
              background: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
              color: 'var(--adm-text-muted)',
              borderRadius: '8px',
              padding: '5px 10px',
              fontSize: '0.74rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            <Copy size={13} />
            <span>Duplicar Funil</span>
          </button>
        </div>

        {/* Right: Cancel & Save Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--adm-text-muted)',
              fontSize: '0.84rem',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '8px 14px',
            }}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            style={{
              background: '#3B82F6',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 22px',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
            }}
          >
            Salvar
          </button>
        </div>
      </div>

      {/* Main Layout: Left Rules Sidebar + Right Stages Grid */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Sidebar: Rules, Leads, Sources, Distribution */}
        <div style={{
          width: '320px',
          borderRight: '1px solid var(--adm-border)',
          background: 'var(--adm-bg-card)',
          overflowY: 'auto',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          flexShrink: 0,
        }}>
          {/* Section: Funnel Name Edit */}
          <div>
            <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Nome do Funil
            </label>
            <input
              type="text"
              value={funnelName}
              onChange={(e) => setFunnelName(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--adm-bg-input)',
                border: '1px solid var(--adm-border)',
                borderRadius: '8px',
                padding: '8px 10px',
                marginTop: '6px',
                fontSize: '0.86rem',
                color: 'var(--adm-text-title)',
                outline: 'none',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
              }}
            />
          </div>

          {/* Section: Etapa de leads de entrada Toggle */}
          <div style={{
            borderTop: '1px solid var(--adm-border)',
            paddingTop: '18px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px',
          }}>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                Etapa de leads de entrada
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginTop: '3px', lineHeight: 1.4 }}>
                Adiciona uma etapa pré-funil para aceitar ou recusar novos leads antes do atendimento.
              </div>
            </div>
            <input
              type="checkbox"
              checked={isEntryStageActive}
              onChange={(e) => setIsEntryStageActive(e.target.checked)}
              style={{ cursor: 'pointer', width: '16px', height: '16px', marginTop: '2px' }}
            />
          </div>

          {/* Section: Lead duplicado */}
          <div style={{
            borderTop: '1px solid var(--adm-border)',
            paddingTop: '18px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px',
          }}>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                Detectar lead duplicado
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginTop: '3px', lineHeight: 1.4 }}>
                O sistema identifica leads com mesmo telefone ou nome e avisa os SDRs.
              </div>
            </div>
            <input
              type="checkbox"
              checked={detectDuplicates}
              onChange={(e) => setDetectDuplicates(e.target.checked)}
              style={{ cursor: 'pointer', width: '16px', height: '16px', marginTop: '2px' }}
            />
          </div>

          {/* Section: Telefone / Widget WhatsApp */}
          <div style={{
            borderTop: '1px solid var(--adm-border)',
            paddingTop: '18px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px',
          }}>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                Widget de Atendimento
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginTop: '3px', lineHeight: 1.4 }}>
                Habilita botão de WhatsApp Web e discagem rápida em todos os leads do funil.
              </div>
            </div>
            <input
              type="checkbox"
              checked={phoneWidgetEnabled}
              onChange={(e) => setPhoneWidgetEnabled(e.target.checked)}
              style={{ cursor: 'pointer', width: '16px', height: '16px', marginTop: '2px' }}
            />
          </div>

          {/* Section: Origens Vinculadas */}
          <div style={{ borderTop: '1px solid var(--adm-border)', paddingTop: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                Origens Vinculadas
              </div>
              <span style={{ fontSize: '0.68rem', background: 'var(--adm-bg-input)', padding: '2px 6px', borderRadius: '4px', color: 'var(--adm-text-muted)' }}>
                {linkedSources.length} canais
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginTop: '3px' }}>
              Canais que direcionam leads diretamente para este funil:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
              {linkedSources.length === 0 ? (
                <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                  Nenhuma fonte vinculada exclusivamente a este funil.
                </div>
              ) : (
                linkedSources.map(s => (
                  <div key={s.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    background: 'var(--adm-bg-input)',
                    borderRadius: '6px',
                    fontSize: '0.76rem',
                  }}>
                    <span>{s.name}</span>
                    <span style={{ fontSize: '0.66rem', color: '#10B981', fontWeight: 700 }}>Ativo</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section: Unidades / Casas Compartilhadas */}
          <div style={{ borderTop: '1px solid var(--adm-border)', paddingTop: '18px' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
              Casas de Festa (Compartilhamento)
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginTop: '3px', lineHeight: 1.4 }}>
              Defina as unidades onde a estrutura deste funil fica visível:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
              {venues.map(v => {
                const isChecked = primaryVenueId === v.id || sharedVenueIds.includes(v.id);
                return (
                  <label key={v.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    color: 'var(--adm-text-body)',
                  }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSharedVenue(v.id)}
                    />
                    <span>{v.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Main Stage Pipeline Columns (Como CRM Grid) */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--adm-bg-main)',
          overflowX: 'auto',
          overflowY: 'hidden',
        }}>
          {/* Top Progress Line Connecting Stages */}
          <div style={{
            display: 'flex',
            height: '4px',
            background: 'rgba(148, 163, 184, 0.15)',
            width: '100%',
            minWidth: `${stages.length * 280}px`,
          }}>
            {stages.map((st, idx) => (
              <div 
                key={st.id} 
                style={{
                  flex: 1,
                  background: st.color || (idx === 0 ? '#3B82F6' : idx === stages.length - 1 ? '#EF4444' : '#F59E0B'),
                  opacity: 0.85,
                }} 
              />
            ))}
          </div>

          {/* Stage Columns Container */}
          <div style={{
            display: 'flex',
            gap: '16px',
            padding: '24px',
            flex: 1,
            overflowX: 'auto',
            minWidth: `${stages.length * 280 + 100}px`,
          }}>
            {stages.map((stage) => {
              const isWon = stage.isWon || stage.id === 'deal_closed';
              const isLoss = stage.isLoss || stage.id === 'lost';

              return (
                <div
                  key={stage.id}
                  style={{
                    width: '280px',
                    background: 'var(--adm-bg-card)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '16px',
                    gap: '14px',
                    flexShrink: 0,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                  }}
                >
                  {/* Stage Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: stage.color || '#3B82F6',
                        flexShrink: 0,
                      }} />
                      <input
                        type="text"
                        value={stage.name}
                        disabled={stage.isFixed}
                        onChange={(e) => {
                          const newName = e.target.value;
                          setStages(prev => prev.map(s => s.id === stage.id ? { ...s, name: newName } : s));
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--adm-text-title)',
                          fontSize: '0.86rem',
                          fontWeight: 800,
                          outline: 'none',
                          fontFamily: "'Inter', sans-serif",
                          width: '100%',
                          cursor: stage.isFixed ? 'default' : 'text',
                        }}
                      />
                    </div>

                    {isWon && (
                      <span style={{ fontSize: '0.62rem', color: '#10B981', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)' }}>
                        Ganho
                      </span>
                    )}

                    {isLoss && (
                      <span style={{ fontSize: '0.62rem', color: '#EF4444', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)' }}>
                        Perda
                      </span>
                    )}

                    {!stage.isFixed && (
                      <button
                        type="button"
                        onClick={() => handleDeleteStage(stage.id)}
                        title="Excluir etapa"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--adm-text-muted)',
                          cursor: 'pointer',
                          padding: '3px',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--adm-text-muted)'}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  {/* Stage Hints / Script Section */}
                  <div style={{
                    background: 'var(--adm-bg-input)',
                    borderRadius: '8px',
                    padding: '10px',
                    border: '1px solid var(--adm-border)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
                        Dicas de Negociação
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (activeEditingHintStageId === stage.id) {
                            setActiveEditingHintStageId(null);
                          } else {
                            setActiveEditingHintStageId(stage.id);
                          }
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--adm-accent)',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {stage.hints ? 'Editar' : '+ Adicionar dicas'}
                      </button>
                    </div>

                    {activeEditingHintStageId === stage.id ? (
                      <div>
                        <textarea
                          defaultValue={stage.hints || ''}
                          placeholder="Ex: Verificar interesse em buffet adicional; Enviar vídeo da recepção..."
                          rows={3}
                          onBlur={(e) => handleSaveHint(stage.id, e.target.value)}
                          style={{
                            width: '100%',
                            background: 'var(--adm-bg-card)',
                            border: '1px solid var(--adm-accent)',
                            borderRadius: '6px',
                            padding: '6px',
                            fontSize: '0.74rem',
                            color: 'var(--adm-text-body)',
                            outline: 'none',
                            fontFamily: "'Inter', sans-serif",
                          }}
                        />
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.74rem', color: stage.hints ? 'var(--adm-text-body)' : 'var(--adm-text-muted)', fontStyle: stage.hints ? 'normal' : 'italic', lineHeight: 1.4 }}>
                        {stage.hints || 'Nenhuma dica adicionada para esta etapa.'}
                      </div>
                    )}
                  </div>

                  {/* Automation Triggers Section */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    flex: 1,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
                        Gatilhos e Ações
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveAddingTriggerStageId(stage.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#3B82F6',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        + Adicionar gatilho
                      </button>
                    </div>

                    {/* Active triggers list */}
                    {stage.triggers && stage.triggers.length > 0 ? (
                      stage.triggers.map(trig => (
                        <div
                          key={trig.id}
                          style={{
                            background: 'rgba(59, 130, 246, 0.08)',
                            border: '1px solid rgba(59, 130, 246, 0.25)',
                            borderRadius: '8px',
                            padding: '8px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--adm-text-title)' }}>
                            <Zap size={12} color="#3B82F6" />
                            <span>{trig.label}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveTrigger(stage.id, trig.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--adm-text-muted)',
                              cursor: 'pointer',
                              padding: '2px',
                            }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div style={{
                        border: '1px dashed var(--adm-border)',
                        borderRadius: '8px',
                        padding: '16px 12px',
                        textAlign: 'center',
                        color: 'var(--adm-text-muted)',
                        fontSize: '0.72rem',
                      }}>
                        Sem gatilhos ativos
                      </div>
                    )}

                    {/* Trigger creation box */}
                    {activeAddingTriggerStageId === stage.id && (
                      <div style={{
                        background: 'var(--adm-bg-input)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '8px',
                        padding: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        marginTop: '4px',
                      }}>
                        <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>
                          Ação ao entrar nesta etapa:
                        </label>
                        <select
                          value={newTriggerType}
                          onChange={(e) => setNewTriggerType(e.target.value as any)}
                          style={{
                            background: 'var(--adm-bg-card)',
                            border: '1px solid var(--adm-border)',
                            color: 'var(--adm-text-body)',
                            borderRadius: '6px',
                            padding: '4px 6px',
                            fontSize: '0.74rem',
                            outline: 'none',
                          }}
                        >
                          <option value="move_copy_to_funnel">Exibir simultaneamente em outro funil</option>
                          <option value="notify_closer">Notificar Closer para fechamento</option>
                          <option value="send_whatsapp">Enviar mensagem WhatsApp</option>
                        </select>

                        {newTriggerType === 'move_copy_to_funnel' && (
                          <select
                            value={newTriggerTargetFunnel}
                            onChange={(e) => setNewTriggerTargetFunnel(e.target.value)}
                            style={{
                              background: 'var(--adm-bg-card)',
                              border: '1px solid var(--adm-border)',
                              color: 'var(--adm-text-body)',
                              borderRadius: '6px',
                              padding: '4px 6px',
                              fontSize: '0.74rem',
                              outline: 'none',
                            }}
                          >
                            <option value="">Selecione o funil de destino...</option>
                            {funnels.filter(f => f.id !== activeFunnel?.id).map(f => (
                              <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                          </select>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
                          <button
                            type="button"
                            onClick={() => setActiveAddingTriggerStageId(null)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--adm-text-muted)',
                              fontSize: '0.7rem',
                              cursor: 'pointer',
                              padding: '4px',
                            }}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddTrigger(stage.id)}
                            style={{
                              background: '#3B82F6',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '4px 10px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Adicionar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* + Adicionar Etapa Button */}
            <div style={{ width: '220px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleAddStage}
                style={{
                  width: '100%',
                  height: '100px',
                  border: '1.5px dashed var(--adm-border)',
                  background: 'transparent',
                  color: 'var(--adm-text-muted)',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#3B82F6';
                  e.currentTarget.style.color = '#3B82F6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--adm-border)';
                  e.currentTarget.style.color = 'var(--adm-text-muted)';
                }}
              >
                <Plus size={18} />
                <span>+ Nova Etapa</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
