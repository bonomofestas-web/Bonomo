import React, { useState } from 'react';
import { X, Check, Building2 } from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { FunnelIconPicker, renderFunnelOrStageIcon } from '../../utils/funnelIconLibrary';
import type { FunnelStageConfig } from '../../types/admin';

interface AdminCreatePostSaleFunnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFunnelCreated?: (funnelId: string) => void;
  onCreated?: (funnelId: string) => void;
}

const DEFAULT_POST_SALE_STAGES: FunnelStageConfig[] = [
  { id: 'onboarding', name: 'ONBOARDING & BOAS-VINDAS', color: '#3B82F6', isFixed: true, order: 0 },
  { id: 'planning', name: 'PLANEJAMENTO & CRONOGRAMA', color: '#F59E0B', order: 1 },
  { id: 'suppliers', name: 'DEFINIÇÃO DE FORNECEDORES', color: '#8B5CF6', order: 2 },
  { id: 'final_alignment', name: 'ALINHAMENTO FINAL (RETA FINAL)', color: '#6366F1', order: 3 },
  { id: 'party_day', name: 'SEMANA DA FESTA / EVENTO', color: '#EAB308', order: 4 },
  { id: 'completed', name: 'FESTA REALIZADA', color: '#10B981', isFixed: true, isWon: true, order: 5 },
  { id: 'lost', name: 'CONTRATO CANCELADO', color: '#EF4444', isFixed: true, isLoss: true, order: 6 },
];

const PRESET_COLORS = [
  '#06B6D4', // Cyan (Default Post-Sale)
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#D4AF37', // Gold
  '#EF4444', // Red
];

export const AdminCreatePostSaleFunnelModal: React.FC<AdminCreatePostSaleFunnelModalProps> = ({
  isOpen,
  onClose,
  onFunnelCreated,
  onCreated,
}) => {
  const { venues, addFunnel } = useAdminState();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('#06B6D4');
  const [selectedIcon, setSelectedIcon] = useState('shield-check');
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [selectedVenueIds, setSelectedVenueIds] = useState<string[]>([]);
  const [isAllVenues, setIsAllVenues] = useState(true);

  if (!isOpen) return null;

  const activeVenues = venues.filter(v => v.active !== false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Por favor, informe o nome do funil.');
      return;
    }

    const effectiveVenueIds = isAllVenues ? [] : selectedVenueIds;
    const primaryVenue = effectiveVenueIds.length > 0 ? effectiveVenueIds[0] : 'all';

    const newId = addFunnel({
      name: name.trim(),
      category: 'Pós-Venda',
      description: description.trim(),
      isPostSale: true,
      venueId: primaryVenue,
      sharedVenueIds: effectiveVenueIds,
      icon: selectedIcon,
      badgeColor: selectedColor,
      stages: DEFAULT_POST_SALE_STAGES,
      stagesCount: DEFAULT_POST_SALE_STAGES.length,
      isWonStageEnabled: true,
      isEntryStageActive: false,
      allowedRoles: ['pos_venda', 'master', 'admin'],
    });

    if (onFunnelCreated) onFunnelCreated(newId);
    if (onCreated) onCreated(newId);
    onClose();
  };

  const toggleVenue = (venueId: string) => {
    setIsAllVenues(false);
    setSelectedVenueIds(prev => {
      if (prev.includes(venueId)) {
        const next = prev.filter(id => id !== venueId);
        if (next.length === 0) {
          setIsAllVenues(true);
        }
        return next;
      } else {
        return [...prev, venueId];
      }
    });
  };

  const handleSelectAllVenues = () => {
    setIsAllVenues(true);
    setSelectedVenueIds([]);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.72)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{
        backgroundColor: 'var(--adm-bg-card, #1E293B)',
        border: '1px solid var(--adm-border, rgba(255, 255, 255, 0.12))',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '560px',
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.45)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid var(--adm-border, rgba(255, 255, 255, 0.1))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: `${selectedColor}1A`,
              border: `1px solid ${selectedColor}4D`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: selectedColor,
            }}>
              {renderFunnelOrStageIcon(selectedIcon, 18, selectedColor)}
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title, #FFFFFF)', margin: 0 }}>
                Novo Funil de Pós-Venda
              </h2>
              <p style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted, #94A3B8)', margin: '2px 0 0 0' }}>
                Crie uma esteira personalizada para o acompanhamento dos clientes contratados.
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
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '18px', maxHeight: '78vh', overflowY: 'auto' }}>
          
          {/* Nome e Ícone */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--adm-text-title, #FFFFFF)', marginBottom: '6px', textTransform: 'uppercase' }}>
              Nome do Funil *
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Botão de Ícone */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setIsIconPickerOpen(!isIconPickerOpen)}
                  title="Alterar ícone do funil"
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    backgroundColor: `${selectedColor}22`,
                    border: `1.5px solid ${selectedColor}55`,
                    color: selectedColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {renderFunnelOrStageIcon(selectedIcon, 20, selectedColor)}
                </button>

                {isIconPickerOpen && (
                  <FunnelIconPicker
                    selectedIcon={selectedIcon}
                    onSelectIcon={(iconId) => {
                      setSelectedIcon(iconId);
                      setIsIconPickerOpen(false);
                    }}
                    onClose={() => setIsIconPickerOpen(false)}
                    accentColor={selectedColor}
                    title="Ícone do Funil"
                  />
                )}
              </div>

              {/* Input de Nome */}
              <input
                type="text"
                required
                placeholder="Ex: Sucesso do Cliente • Festas 15 Anos"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  flex: 1,
                  background: 'var(--adm-bg-input, #0F172A)',
                  border: '1px solid var(--adm-border, rgba(255, 255, 255, 0.12))',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  color: 'var(--adm-text-title, #FFFFFF)',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Seletor de Cores */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted, #94A3B8)', marginBottom: '6px', textTransform: 'uppercase' }}>
              Cor de Destaque
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: color,
                    border: selectedColor === color ? '2.5px solid #FFFFFF' : '1px solid rgba(255,255,255,0.2)',
                    boxShadow: selectedColor === color ? `0 0 10px ${color}` : 'none',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'transform 0.12s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                />
              ))}
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted, #94A3B8)', marginBottom: '6px', textTransform: 'uppercase' }}>
              Descrição / Objetivo (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Gestão de cronograma, fornecedores e pós-venda para formaturas e 15 anos"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--adm-bg-input, #0F172A)',
                border: '1px solid var(--adm-border, rgba(255, 255, 255, 0.12))',
                borderRadius: '10px',
                padding: '9px 12px',
                fontSize: '0.80rem',
                color: 'var(--adm-text-title, #FFFFFF)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Casas de Festas Vinculadas (Vínculo Manual Multi-Casas) */}
          <div style={{
            background: 'var(--adm-bg-input, #0F172A)',
            border: '1px solid var(--adm-border, rgba(255, 255, 255, 0.12))',
            borderRadius: '12px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={16} color={selectedColor} />
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title, #FFFFFF)', textTransform: 'uppercase' }}>
                  Casas de Festas Atendidas (Multi-Casas)
                </span>
              </div>
              <span style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted, #94A3B8)', fontWeight: 700 }}>
                {isAllVenues ? 'Todas as Casas' : `${selectedVenueIds.length} selecionada(s)`}
              </span>
            </div>

            <p style={{ fontSize: '0.70rem', color: 'var(--adm-text-muted, #94A3B8)', margin: 0, lineHeight: 1.4 }}>
              Selecione quais casas de festas este funil atende. Clientes cadastrados nessas unidades físicas serão exibidos neste pipeline.
            </p>

            {/* Opção Geral: Todas as Casas */}
            <button
              type="button"
              onClick={handleSelectAllVenues}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '8px',
                background: isAllVenues ? `${selectedColor}22` : 'var(--adm-bg-card, #1E293B)',
                border: `1.5px solid ${isAllVenues ? selectedColor : 'var(--adm-border, rgba(255,255,255,0.1))'}`,
                color: isAllVenues ? selectedColor : 'var(--adm-text-title, #FFFFFF)',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={14} />
                <span>Todas as Casas da Rede (Geral)</span>
              </div>
              {isAllVenues && <Check size={14} />}
            </button>

            {/* Lista de Casas Individuais */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {activeVenues.map(venue => {
                const isSelected = !isAllVenues && selectedVenueIds.includes(venue.id);
                return (
                  <button
                    key={venue.id}
                    type="button"
                    onClick={() => toggleVenue(venue.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: isSelected ? `${selectedColor}22` : 'var(--adm-bg-card, #1E293B)',
                      border: `1.5px solid ${isSelected ? selectedColor : 'var(--adm-border, rgba(255,255,255,0.1))'}`,
                      color: isSelected ? selectedColor : 'var(--adm-text-title, #FFFFFF)',
                      fontSize: '0.76rem',
                      fontWeight: isSelected ? 800 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <Building2 size={14} color={isSelected ? selectedColor : 'var(--adm-text-muted, #94A3B8)'} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {venue.name}
                      </span>
                    </div>
                    {isSelected && <Check size={14} color={selectedColor} style={{ flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--adm-border, rgba(255, 255, 255, 0.1))' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--adm-text-muted, #94A3B8)',
                padding: '9px 16px',
                fontSize: '0.80rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              style={{
                background: selectedColor,
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 22px',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: `0 4px 14px ${selectedColor}4D`,
                transition: 'all 0.15s ease',
              }}
            >
              <Check size={15} />
              <span>Criar Funil de Pós-Venda</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
