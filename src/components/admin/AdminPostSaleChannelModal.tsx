import React, { useState } from 'react';
import { 
  X, 
  Layers, 
  Palette, 
  Sparkles, 
  HeartHandshake, 
  FileText, 
  Camera, 
  Package, 
  Smartphone, 
  Users, 
  Check, 
  AlertCircle,
  Trash2
} from 'lucide-react';
import type { PostSaleChannelConfig, CommercialFunnel, Collaborator } from '../../types/admin';
import type { Source } from '../../types/sources';

interface AdminPostSaleChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeFunnel: CommercialFunnel;
  editingChannel?: PostSaleChannelConfig | null;
  sources: Source[];
  collaborators: Collaborator[];
  onSaveChannel: (channel: PostSaleChannelConfig) => void;
  onDeleteChannel?: (channelId: string) => void;
}

const AVAILABLE_ICONS = [
  { id: 'Layers', label: 'Setor Geral', icon: Layers },
  { id: 'Palette', label: 'Decoração', icon: Palette },
  { id: 'HeartHandshake', label: 'Sucesso do Cliente', icon: HeartHandshake },
  { id: 'Sparkles', label: 'Experiência', icon: Sparkles },
  { id: 'Camera', label: 'Foto & Vídeo', icon: Camera },
  { id: 'Package', label: 'Produção', icon: Package },
  { id: 'FileText', label: 'Contratos/Financeiro', icon: FileText },
];

const PRESET_COLORS = [
  '#3B82F6', // Azul
  '#EC4899', // Rosa
  '#8B5CF6', // Roxo
  '#10B981', // Verde
  '#F59E0B', // Âmbar
  '#06B6D4', // Ciano
  '#6366F1', // Índigo
  '#EF4444', // Vermelho
];

export const AdminPostSaleChannelModal: React.FC<AdminPostSaleChannelModalProps> = ({
  isOpen,
  onClose,
  activeFunnel,
  editingChannel,
  sources,
  collaborators,
  onSaveChannel,
  onDeleteChannel,
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState(editingChannel?.name || '');
  const [color, setColor] = useState(editingChannel?.color || '#8B5CF6');
  const [icon, setIcon] = useState(editingChannel?.icon || 'Palette');
  const [instanceId, setInstanceId] = useState(editingChannel?.instanceId || '');
  const [allowedCollaboratorIds, setAllowedCollaboratorIds] = useState<string[]>(
    editingChannel?.allowedCollaboratorIds || []
  );
  const [error, setError] = useState<string | null>(null);

  // Instâncias já em uso por outros canais do mesmo funil (exclusividade estrita)
  const existingChannels = activeFunnel.postSaleChannels || [];
  const instancesInOtherChannels = new Set(
    existingChannels
      .filter(c => c.id !== editingChannel?.id)
      .map(c => c.instanceId)
      .filter(Boolean)
  );

  // Instâncias de WhatsApp conectadas / disponíveis
  const availableWhatsAppSources = (sources || []).filter(s => {
    if (s.type !== 'whatsapp_api') return false;
    // Se o funil possui unidades vinculadas, filtrar pelas unidades do funil
    const funnelVenues = Array.isArray(activeFunnel.sharedVenueIds) && activeFunnel.sharedVenueIds.length > 0
      ? activeFunnel.sharedVenueIds
      : (activeFunnel.venueId && activeFunnel.venueId !== 'all' ? [activeFunnel.venueId] : []);
    
    if (funnelVenues.length > 0 && s.venueId && !funnelVenues.includes(s.venueId)) {
      return false;
    }
    return true;
  });

  const toggleCollaborator = (collabId: string) => {
    setAllowedCollaboratorIds(prev =>
      prev.includes(collabId) ? prev.filter(id => id !== collabId) : [...prev, collabId]
    );
  };

  const handleSelectAllCollaborators = () => {
    if (allowedCollaboratorIds.length === collaborators.length) {
      setAllowedCollaboratorIds([]);
    } else {
      setAllowedCollaboratorIds(collaborators.map(c => c.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Por favor, informe o nome do canal/setor.');
      return;
    }

    if (instanceId && instancesInOtherChannels.has(instanceId)) {
      setError('Este número/instância de WhatsApp já está vinculado a outro canal deste funil.');
      return;
    }

    const channelPayload: PostSaleChannelConfig = {
      id: editingChannel?.id || `ps_ch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: trimmedName,
      color,
      icon,
      instanceId: instanceId || undefined,
      allowedCollaboratorIds,
    };

    onSaveChannel(channelPayload);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px',
    }}>
      <div style={{
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '540px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--adm-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--adm-bg-input)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--adm-accent-bg)',
              color: 'var(--adm-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Layers size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                {editingChannel ? 'Editar Aba Setorial' : 'Nova Aba Setorial de WhatsApp'}
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>
                Canal exclusivo para comunicação do pós-venda ({activeFunnel.name})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--adm-text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#EF4444',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Nome do Canal */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--adm-text-title)', marginBottom: '6px' }}>
              Nome do Setor / Canal *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Decoração, Sucesso do Cliente, Produção, Financeiro"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--adm-border)',
                background: 'var(--adm-bg-input)',
                color: 'var(--adm-text-title)',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Cor e Ícone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--adm-text-title)', marginBottom: '8px' }}>
                Cor da Aba
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: c,
                      border: color === c ? '2.5px solid var(--adm-text-title)' : '2px solid transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    }}
                  >
                    {color === c && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--adm-text-title)', marginBottom: '8px' }}>
                Ícone do Setor
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {AVAILABLE_ICONS.map(item => {
                  const IconComp = item.icon;
                  const isSelected = icon === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setIcon(item.id)}
                      title={item.label}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: isSelected ? 'var(--adm-accent-bg)' : 'var(--adm-bg-input)',
                        border: `1.5px solid ${isSelected ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                        color: isSelected ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <IconComp size={16} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Instância Exclusiva de WhatsApp */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--adm-text-title)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Smartphone size={15} color="var(--adm-accent)" />
                Número / Instância WhatsApp Exclusiva
              </label>
              <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
                Opcional (se vazio, usa o chip padrão)
              </span>
            </div>
            <select
              value={instanceId}
              onChange={e => setInstanceId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--adm-border)',
                background: 'var(--adm-bg-input)',
                color: 'var(--adm-text-title)',
                fontSize: '0.86rem',
                outline: 'none',
              }}
            >
              <option value="">Usar WhatsApp Padrão do Funil</option>
              {availableWhatsAppSources.map(src => {
                const isTaken = instancesInOtherChannels.has(src.id);
                const phoneStr = (src.configuration as any)?.connectedPhone || (src.configuration as any)?.whatsappNumber || '';
                return (
                  <option 
                    key={src.id} 
                    value={src.id}
                    disabled={isTaken}
                  >
                    {src.name} {phoneStr ? `(${phoneStr})` : ''} {isTaken ? '• [Já vinculado a outro setor]' : ''}
                  </option>
                );
              })}
            </select>
            <p style={{ margin: '5px 0 0 0', fontSize: '0.73rem', color: 'var(--adm-text-muted)' }}>
              Todas as mensagens enviadas nesta aba serão disparadas pelo chip exclusivo selecionado.
            </p>
          </div>

          {/* Permissões: Colaboradores Autorizados */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--adm-text-title)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={15} color="var(--adm-accent)" />
                Colaboradores com Acesso a este Canal
              </label>
              <button
                type="button"
                onClick={handleSelectAllCollaborators}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--adm-accent)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {allowedCollaboratorIds.length === collaborators.length ? 'Desmarcar Todos' : 'Marcar Todos'}
              </button>
            </div>

            <div style={{
              maxHeight: '160px',
              overflowY: 'auto',
              border: '1px solid var(--adm-border)',
              borderRadius: '8px',
              padding: '8px',
              background: 'var(--adm-bg-input)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}>
              {collaborators.map(c => {
                const isSelected = allowedCollaboratorIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    onClick={() => toggleCollaborator(c.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      background: isSelected ? 'var(--adm-accent-bg)' : 'transparent',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      color: isSelected ? 'var(--adm-accent)' : 'var(--adm-text-title)',
                      transition: 'all 0.1s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      style={{ accentColor: 'var(--adm-accent)', cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: isSelected ? 600 : 400 }}>{c.name}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', marginLeft: 'auto' }}>
                      {c.role}
                    </span>
                  </label>
                );
              })}
              {collaborators.length === 0 && (
                <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>
                  Nenhum colaborador encontrado.
                </div>
              )}
            </div>
            <p style={{ margin: '5px 0 0 0', fontSize: '0.73rem', color: 'var(--adm-text-muted)' }}>
              Administradores Master e Gerentes visualizam todos os setores automaticamente.
            </p>
          </div>

          {/* Footer Actions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: editingChannel && onDeleteChannel ? 'space-between' : 'flex-end',
            paddingTop: '16px',
            borderTop: '1px solid var(--adm-border)',
            gap: '10px',
          }}>
            {editingChannel && onDeleteChannel && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Deseja excluir a aba setorial "${editingChannel.name}"? As mensagens anteriores permanecerão no histórico.`)) {
                    onDeleteChannel(editingChannel.id);
                    onClose();
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 14px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#EF4444',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={15} />
                <span>Excluir Aba</span>
              </button>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: '1px solid var(--adm-border)',
                  color: 'var(--adm-text-title)',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  background: 'var(--adm-accent)',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                }}
              >
                Salvar Aba Setorial
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
