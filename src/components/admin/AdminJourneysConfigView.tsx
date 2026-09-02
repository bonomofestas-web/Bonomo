import React, { useState } from 'react';
import { 
  Plus, Gift, Crown, 
  Edit3, Trash2, CheckCircle2, Layers, Share2, Building2 
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { AdminTemplateModal } from './AdminTemplateModal';
import { AdminConfirmModal } from './AdminConfirmModal';
import type { JourneyTemplate } from '../../types/admin';

export const AdminJourneysConfigView: React.FC = () => {
  const { 
    templates, 
    debutantes, 
    venues,
    deleteTemplate, 
    applyTemplateToDebutante,
    shareJourneyTemplateToVenue
  } = useAdminState();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<JourneyTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<JourneyTemplate | null>(null);
  const [applyingTemplate, setApplyingTemplate] = useState<JourneyTemplate | null>(null);
  const [sharingTemplate, setSharingTemplate] = useState<JourneyTemplate | null>(null);
  const [targetVenueId, setTargetVenueId] = useState<string>(venues[0]?.id || '');
  const [selectedDebutanteId, setSelectedDebutanteId] = useState<string>(debutantes[0]?.id || '');
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [sharedSuccess, setSharedSuccess] = useState(false);

  const handleOpenCreate = () => {
    setTemplateToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: JourneyTemplate) => {
    setTemplateToEdit(t);
    setIsModalOpen(true);
  };

  const handleDelete = (t: JourneyTemplate) => {
    setTemplateToDelete(t);
  };

  const handleApply = () => {
    if (!applyingTemplate || !selectedDebutanteId) return;
    applyTemplateToDebutante(selectedDebutanteId, applyingTemplate.id);
    setAppliedSuccess(true);
    setTimeout(() => {
      setAppliedSuccess(false);
      setApplyingTemplate(null);
    }, 1200);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      padding: '24px 32px 60px 32px',
      width: '100%',
      boxSizing: 'border-box',
      animation: 'fadeIn 0.25s ease-out',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{
            fontSize: '1.45rem',
            fontWeight: 800,
            color: 'var(--adm-text-title)',
            letterSpacing: '-0.4px',
            margin: '0 0 4px 0',
          }}>
            Modelos de Jornada & Metas
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)', margin: 0 }}>
            Crie templates padronizados de metas e presentes VIPs para vincular instantaneamente às aniversariantes.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="adm-btn-primary"
          style={{
            padding: '8px 18px',
            borderRadius: '12px',
            fontWeight: 800,
            fontSize: '0.82rem',
          }}
        >
          <Plus size={16} />
          <span>Criar Novo Modelo</span>
        </button>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div className="saas-card" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--adm-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Layers size={42} color="var(--adm-accent)" style={{ opacity: 0.6, marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: '0 0 6px 0' }}>
            Nenhum Modelo de Jornada Cadastrado
          </h3>
          <p style={{ fontSize: '0.8rem', maxWidth: '380px', margin: '0 auto 18px auto', lineHeight: 1.5 }}>
            Crie templates padronizados de metas e presentes VIPs para vincular instantaneamente às aniversariantes.
          </p>
          <button
            onClick={handleOpenCreate}
            className="adm-btn-primary"
            style={{ padding: '8px 18px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 800 }}
          >
            <Plus size={15} /> Criar Primeiro Modelo
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '20px',
        }}>
          {templates.map(tmpl => {
            const debutantesUsingCount = debutantes.filter(d => d.journeyTemplateId === tmpl.id).length;

            return (
              <div
                key={tmpl.id}
                className="saas-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0, letterSpacing: '-0.3px' }}>
                      {tmpl.name}
                    </h3>
                    <span style={{
                      display: 'inline-block',
                      marginTop: '6px',
                      background: 'var(--adm-accent-bg)',
                      color: 'var(--adm-accent)',
                      borderRadius: '8px',
                      padding: '2px 8px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                    }}>
                      {tmpl.seasonOrPeriod || 'Padrão'}
                    </span>
                  </div>

                  <span style={{
                    fontSize: '0.72rem',
                    color: 'var(--adm-green)',
                    background: 'var(--adm-green-bg)',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontWeight: 700,
                  }}>
                    {debutantesUsingCount} debutante{debutantesUsingCount !== 1 ? 's' : ''}
                  </span>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)', margin: 0, lineHeight: 1.5 }}>
                  {tmpl.description}
                </p>

                {/* Milestones Preview */}
                <div style={{ background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', borderRadius: '12px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--adm-accent)', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Gift size={13} />
                    <span>{tmpl.milestones.length} Metas da Jornada:</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {tmpl.milestones.map((m, i) => (
                      <div key={i} style={{ fontSize: '0.76rem', color: 'var(--adm-text-body)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--adm-text-title)', fontWeight: 500 }}>{m.rewardTitle}</span>
                        <strong style={{ color: 'var(--adm-accent)', fontWeight: 700 }}>{m.requiredReferrals} refs</strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* VIP Gifts Preview */}
                <div style={{ background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', borderRadius: '12px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#EC4899', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Crown size={13} />
                    <span>{tmpl.vipRewards.length} Presentes VIPs:</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {tmpl.vipRewards.map((v, i) => (
                      <div key={i} style={{ fontSize: '0.76rem', color: 'var(--adm-text-body)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--adm-text-title)', fontWeight: 500 }}>{v.name}</span>
                        <strong style={{ color: 'var(--adm-green)', fontWeight: 700 }}>{v.requiredSales} venda{v.requiredSales > 1 ? 's' : ''}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions Row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--adm-border)',
                  paddingTop: '14px',
                  marginTop: 'auto',
                  gap: '8px',
                }}>
                  <button
                    onClick={() => setApplyingTemplate(tmpl)}
                    style={{
                      background: 'var(--adm-accent-bg)',
                      border: '1px solid var(--adm-border-hover)',
                      color: 'var(--adm-accent)',
                      borderRadius: '10px',
                      padding: '6px 14px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Layers size={13} />
                    <span>Vincular a Debutante</span>
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={() => setSharingTemplate(tmpl)}
                      title="Compartilhar com outra Casa de Festas"
                      style={{
                        background: 'var(--adm-bg-elevated)',
                        border: '1px solid var(--adm-border)',
                        color: 'var(--adm-text-title)',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Share2 size={13} color="var(--adm-accent)" />
                      <span>Compartilhar</span>
                    </button>

                    <button
                      onClick={() => handleOpenEdit(tmpl)}
                      style={{
                        background: 'var(--adm-bg-elevated)',
                        border: '1px solid var(--adm-border)',
                        color: 'var(--adm-text-title)',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Edit3 size={13} color="var(--adm-accent)" />
                    </button>

                    <button
                      onClick={() => handleDelete(tmpl)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--adm-red)',
                        padding: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Apply Template Modal */}
      {applyingTemplate && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px',
        }}>
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '20px',
            maxWidth: '440px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: '0 0 6px 0' }}>
              Vincular Modelo à Debutante
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)', marginBottom: '16px' }}>
              Ao aplicar, as metas e presentes VIPs de <strong>{applyingTemplate.name}</strong> serão copiados para a debutante selecionada.
            </p>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--adm-text-title)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
                Selecione a Debutante:
              </label>
              <select
                value={selectedDebutanteId}
                onChange={(e) => setSelectedDebutanteId(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: 'var(--adm-text-title)',
                  fontSize: '0.84rem',
                  outline: 'none',
                }}
              >
                {debutantes.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.partyDate.split('-').reverse().join('/')})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setApplyingTemplate(null)}
                className="adm-btn-secondary"
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleApply}
                className="adm-btn-primary"
                style={{
                  flex: 1.5,
                  padding: '10px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                }}
              >
                {appliedSuccess ? (
                  <>
                    <CheckCircle2 size={15} /> Aplicado com Sucesso!
                  </>
                ) : (
                  'Confirmar Vinculação'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Template Modal */}
      {sharingTemplate && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px',
        }}>
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '20px',
            maxWidth: '440px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Building2 size={18} color="var(--adm-accent)" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                Compartilhar com outra Casa
              </h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)', marginBottom: '16px' }}>
              Deseja duplicar e aprovar o modelo <strong>{sharingTemplate.name}</strong> para qual Casa de Festas?
            </p>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--adm-text-title)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
                Casa de Festa de Destino:
              </label>
              <select
                value={targetVenueId}
                onChange={(e) => setTargetVenueId(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: 'var(--adm-text-title)',
                  fontSize: '0.84rem',
                  outline: 'none',
                }}
              >
                {venues.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setSharingTemplate(null)}
                className="adm-btn-secondary"
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  if (sharingTemplate && targetVenueId) {
                    shareJourneyTemplateToVenue(sharingTemplate.id, targetVenueId);
                    setSharedSuccess(true);
                    setTimeout(() => {
                      setSharedSuccess(false);
                      setSharingTemplate(null);
                    }, 1200);
                  }
                }}
                className="adm-btn-primary"
                style={{
                  flex: 1.5,
                  padding: '10px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                }}
              >
                {sharedSuccess ? (
                  <>
                    <CheckCircle2 size={15} /> Compartilhado!
                  </>
                ) : (
                  'Confirmar Compartilhamento'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Modal */}
      <AdminTemplateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        templateToEdit={templateToEdit}
      />

      {/* Confirm Modal */}
      <AdminConfirmModal
        isOpen={!!templateToDelete}
        onClose={() => setTemplateToDelete(null)}
        onConfirm={() => {
          if (templateToDelete) {
            deleteTemplate(templateToDelete.id);
            setTemplateToDelete(null);
          }
        }}
        title="Remover Modelo de Jornada"
        itemName={templateToDelete?.name}
        message={templateToDelete ? `Tem certeza que deseja remover o modelo de jornada "${templateToDelete.name}"?` : undefined}
      />
    </div>
  );
};
