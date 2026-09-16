import React, { useState } from 'react';
import { 
  ArrowLeft, X, Settings2, Info, Plus, ChevronRight, 
  Trash2, Flag, Layers, ArrowUp, ArrowDown, Check, GripVertical 
} from 'lucide-react';
import type { TaskCustomStatus } from '../../types/admin';
import { taskService } from '../../services/taskService';

interface AdminTaskStatusDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  databaseId: string;
  statuses: TaskCustomStatus[];
  onUpdateStatuses: (statuses: TaskCustomStatus[]) => void;
  onSelectStatus?: (status: TaskCustomStatus) => void;
}

const COLOR_PALETTE = [
  { label: 'Padrão', hex: '#94A3B8' },
  { label: 'Cinza', hex: '#64748B' },
  { label: 'Marrom', hex: '#92400E' },
  { label: 'Laranja', hex: '#EA580C' },
  { label: 'Amarelo', hex: '#D97706' },
  { label: 'Verde', hex: '#16A34A' },
  { label: 'Azul', hex: '#2563EB' },
  { label: 'Roxo', hex: '#9333EA' },
  { label: 'Rosa', hex: '#DB2777' },
  { label: 'Vermelho', hex: '#DC2626' },
];

export const AdminTaskStatusDrawer: React.FC<AdminTaskStatusDrawerProps> = ({
  isOpen,
  onClose,
  databaseId,
  statuses,
  onUpdateStatuses,
}) => {
  // Editing state for Image 2 submenu
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [statusNameEdit, setStatusNameEdit] = useState('');
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [isAddingInGroup, setIsAddingInGroup] = useState<'todo' | 'in_progress' | 'completed' | null>(null);
  const [newStatusInput, setNewStatusInput] = useState('');

  if (!isOpen) return null;

  const editingStatus = statuses.find(s => s.id === editingStatusId) || null;

  const handleOpenEditSubmenu = (status: TaskCustomStatus) => {
    setEditingStatusId(status.id);
    setStatusNameEdit(status.name);
    setShowGroupSelector(false);
  };

  const handleCloseEditSubmenu = () => {
    setEditingStatusId(null);
    setStatusNameEdit('');
    setShowGroupSelector(false);
  };

  // Renaming status
  const handleSaveStatusName = async () => {
    if (!editingStatus || !statusNameEdit.trim() || statusNameEdit.trim() === editingStatus.name) return;
    const newName = statusNameEdit.trim();
    const updated = statuses.map(s => s.id === editingStatus.id ? { ...s, name: newName } : s);
    onUpdateStatuses(updated);
    await taskService.updateCustomStatus(editingStatus.id, { name: newName });
  };

  // Changing status color
  const handleChangeColor = async (hex: string) => {
    if (!editingStatus) return;
    const updated = statuses.map(s => s.id === editingStatus.id ? { ...s, color: hex, bgColor: `${hex}22` } : s);
    onUpdateStatuses(updated);
    await taskService.updateCustomStatus(editingStatus.id, { color: hex, bgColor: `${hex}22` });
  };

  // Setting default status
  const handleSetDefault = async () => {
    if (!editingStatus) return;
    const updated = statuses.map(s => ({
      ...s,
      isDefault: s.id === editingStatus.id,
    }));
    onUpdateStatuses(updated);
    await taskService.reorderCustomStatuses(databaseId, updated);
  };

  // Moving between groups (Agrupar)
  const handleChangeGroup = async (newGroup: 'todo' | 'in_progress' | 'completed') => {
    if (!editingStatus || editingStatus.groupKey === newGroup) return;
    
    // Guard: Do not leave previous group empty if it had only 1 status
    const previousGroupCount = statuses.filter(s => s.groupKey === editingStatus.groupKey).length;
    if (previousGroupCount <= 1) {
      alert('Não é possível mover este status: cada categoria deve manter pelo menos 1 status.');
      return;
    }

    const updated = statuses.map(s => s.id === editingStatus.id ? { ...s, groupKey: newGroup } : s);
    onUpdateStatuses(updated);
    setShowGroupSelector(false);
    await taskService.updateCustomStatus(editingStatus.id, { groupKey: newGroup });
  };

  // Reordering up/down within group
  const handleMoveStatus = async (direction: 'up' | 'down') => {
    if (!editingStatus) return;
    const groupStatuses = statuses.filter(s => s.groupKey === editingStatus.groupKey);
    const currentIndex = groupStatuses.findIndex(s => s.id === editingStatus.id);
    if (direction === 'up' && currentIndex <= 0) return;
    if (direction === 'down' && currentIndex >= groupStatuses.length - 1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const reorderedGroup = [...groupStatuses];
    const [moved] = reorderedGroup.splice(currentIndex, 1);
    reorderedGroup.splice(targetIndex, 0, moved);

    // Merge reordered group with other statuses
    const otherStatuses = statuses.filter(s => s.groupKey !== editingStatus.groupKey);
    const finalStatuses = [...otherStatuses, ...reorderedGroup];
    onUpdateStatuses(finalStatuses);
    await taskService.reorderCustomStatuses(databaseId, finalStatuses);
  };

  // Deleting status (guarded: min 1 per group)
  const handleDeleteStatus = async () => {
    if (!editingStatus) return;
    const groupCount = statuses.filter(s => s.groupKey === editingStatus.groupKey).length;
    if (groupCount <= 1) {
      alert('Cada categoria (A fazer, Em andamento, Concluídos) deve conter pelo menos 1 status.');
      return;
    }

    const confirmed = window.confirm(`Deseja realmente excluir o status "${editingStatus.name}"?`);
    if (!confirmed) return;

    const remaining = statuses.filter(s => s.id !== editingStatus.id);
    onUpdateStatuses(remaining);
    handleCloseEditSubmenu();
    await taskService.deleteCustomStatus(editingStatus.id);
  };

  // Adding new status directly in group
  const handleAddNewStatus = async (group: 'todo' | 'in_progress' | 'completed') => {
    if (!newStatusInput.trim()) {
      setIsAddingInGroup(null);
      return;
    }

    const defaultColor = group === 'completed' ? '#16A34A' : group === 'in_progress' ? '#2563EB' : '#94A3B8';
    const created = await taskService.addCustomStatus({
      databaseId,
      name: newStatusInput.trim(),
      groupKey: group,
      color: defaultColor,
      bgColor: `${defaultColor}22`,
      orderIndex: statuses.length,
      isDefault: false,
    });

    if (created) {
      onUpdateStatuses([...statuses, created]);
    }
    setNewStatusInput('');
    setIsAddingInGroup(null);
  };

  const todoStatuses = statuses.filter(s => s.groupKey === 'todo');
  const inProgressStatuses = statuses.filter(s => s.groupKey === 'in_progress');
  const completedStatuses = statuses.filter(s => s.groupKey === 'completed');

  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        zIndex: 1300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--adm-bg-card)',
          border: '1px solid var(--adm-border)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '420px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* ── HEADER (Image 1) ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid var(--adm-border)',
          background: 'var(--adm-bg-input)',
        }}>
          <button
            type="button"
            onClick={editingStatusId ? handleCloseEditSubmenu : onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--adm-text-title)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '6px',
            }}
          >
            <ArrowLeft size={18} />
          </button>

          <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
            {editingStatusId ? 'Editar status' : 'Editar propriedade'}
          </span>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--adm-text-muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── CONTENT AREA ── */}
        <div style={{ padding: '16px 18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {editingStatus ? (
            /* ── SUBMENU VIEW (Image 2) ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Status Name Input */}
              <div>
                <input
                  type="text"
                  value={statusNameEdit}
                  onChange={(e) => setStatusNameEdit(e.target.value)}
                  onBlur={handleSaveStatusName}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveStatusName()}
                  placeholder="Nome do status"
                  style={{
                    width: '100%',
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    color: 'var(--adm-text-title)',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Action List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderBottom: '1px solid var(--adm-border)', paddingBottom: '12px' }}>
                {/* Excluir */}
                <button
                  type="button"
                  onClick={handleDeleteStatus}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '8px 10px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#EF4444',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    textAlign: 'left',
                  }}
                >
                  <Trash2 size={16} color="#EF4444" />
                  <span>Excluir</span>
                </button>

                {/* Definir como padrão */}
                <button
                  type="button"
                  onClick={handleSetDefault}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '8px 10px',
                    background: editingStatus.isDefault ? 'rgba(255,255,255,0.06)' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'var(--adm-text-title)',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 500,
                    textAlign: 'left',
                  }}
                >
                  <Flag size={16} color={editingStatus.isDefault ? 'var(--adm-accent)' : 'var(--adm-text-muted)'} />
                  <span>{editingStatus.isDefault ? 'Status padrão ativo' : 'Definir como padrão'}</span>
                  {editingStatus.isDefault && <Check size={14} style={{ marginLeft: 'auto' }} color="var(--adm-accent)" />}
                </button>

                {/* Agrupar */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setShowGroupSelector(!showGroupSelector)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '8px 10px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'var(--adm-text-title)',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: 500,
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Layers size={16} color="var(--adm-text-muted)" />
                      <span>Agrupar</span>
                    </div>
                    <span style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', textTransform: 'capitalize' }}>
                      {editingStatus.groupKey === 'todo' ? 'A fazer' : editingStatus.groupKey === 'in_progress' ? 'Em andamento' : 'Concluídos'} &gt;
                    </span>
                  </button>

                  {showGroupSelector && (
                    <div style={{
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '8px',
                      padding: '4px',
                      margin: '4px 0 8px 26px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}>
                      {[
                        { key: 'todo' as const, label: 'A fazer' },
                        { key: 'in_progress' as const, label: 'Em andamento' },
                        { key: 'completed' as const, label: 'Concluídos' },
                      ].map(g => (
                        <button
                          key={g.key}
                          type="button"
                          onClick={() => handleChangeGroup(g.key)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: editingStatus.groupKey === g.key ? 'rgba(255,255,255,0.08)' : 'transparent',
                            color: 'var(--adm-text-title)',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <span>{g.label}</span>
                          {editingStatus.groupKey === g.key && <Check size={13} color="var(--adm-accent)" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reordenar (Mover para cima / baixo) */}
                <div style={{ display: 'flex', gap: '8px', padding: '4px 10px' }}>
                  <button
                    type="button"
                    onClick={() => handleMoveStatus('up')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '6px',
                      padding: '5px 10px',
                      fontSize: '0.74rem',
                      color: 'var(--adm-text-title)',
                      cursor: 'pointer',
                    }}
                  >
                    <ArrowUp size={13} />
                    <span>Mover p/ cima</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveStatus('down')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '6px',
                      padding: '5px 10px',
                      fontSize: '0.74rem',
                      color: 'var(--adm-text-title)',
                      cursor: 'pointer',
                    }}
                  >
                    <ArrowDown size={13} />
                    <span>Mover p/ baixo</span>
                  </button>
                </div>
              </div>

              {/* ── 10-Color Palette (Image 2) ── */}
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Cor da tag
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {COLOR_PALETTE.map(c => {
                    const isSelected = editingStatus.color.toLowerCase() === c.hex.toLowerCase();
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => handleChangeColor(c.hex)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          background: isSelected ? 'rgba(255,255,255,0.06)' : 'transparent',
                          cursor: 'pointer',
                          width: '100%',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: c.hex }} />
                          <span style={{ fontSize: '0.8rem', color: 'var(--adm-text-title)', fontWeight: 500 }}>{c.label}</span>
                        </div>
                        {isSelected && <Check size={14} color="var(--adm-text-title)" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* ── MAIN DRAWER VIEW (Image 1) ── */
            <>
              {/* Property Header Row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'var(--adm-bg-input)',
                borderRadius: '8px',
                border: '1px solid var(--adm-border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Settings2 size={16} color="var(--adm-text-muted)" />
                  <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--adm-text-title)' }}>Status</span>
                </div>
                <Info size={15} color="var(--adm-text-muted)" />
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.78rem',
                color: 'var(--adm-text-muted)',
                padding: '0 4px',
              }}>
                <span>Tipo</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--adm-text-title)', fontWeight: 600 }}>
                  Status <ChevronRight size={14} />
                </span>
              </div>

              <div style={{ height: '1px', background: 'var(--adm-border)', margin: '2px 0' }} />

              {/* ── GROUP 1: A FAZER ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 4px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    A fazer ({todoStatuses.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingInGroup('todo');
                      setNewStatusInput('');
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--adm-text-muted)',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Plus size={15} />
                  </button>
                </div>

                {isAddingInGroup === 'todo' && (
                  <div style={{ display: 'flex', gap: '6px', padding: '4px 0' }}>
                    <input
                      type="text"
                      value={newStatusInput}
                      onChange={(e) => setNewStatusInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddNewStatus('todo')}
                      placeholder="Novo status..."
                      autoFocus
                      style={{
                        flex: 1,
                        background: 'var(--adm-bg-input)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.78rem',
                        color: 'var(--adm-text-title)',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddNewStatus('todo')}
                      style={{
                        background: 'var(--adm-accent)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Salvar
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {todoStatuses.map(s => (
                    <div
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid transparent',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.borderColor = 'var(--adm-border)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <GripVertical size={14} color="var(--adm-text-muted)" style={{ cursor: 'grab' }} />
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
                        <span style={{
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background: s.bgColor,
                          color: s.color,
                          padding: '2px 8px',
                          borderRadius: '12px',
                        }}>
                          {s.name}
                        </span>
                        {s.isDefault && (
                          <span style={{
                            fontSize: '0.64rem',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            background: 'rgba(255,255,255,0.08)',
                            color: 'var(--adm-text-muted)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}>
                            PADRÃO
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenEditSubmenu(s)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--adm-text-muted)',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── GROUP 2: EM ANDAMENTO ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 4px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Em andamento ({inProgressStatuses.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingInGroup('in_progress');
                      setNewStatusInput('');
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--adm-text-muted)',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Plus size={15} />
                  </button>
                </div>

                {isAddingInGroup === 'in_progress' && (
                  <div style={{ display: 'flex', gap: '6px', padding: '4px 0' }}>
                    <input
                      type="text"
                      value={newStatusInput}
                      onChange={(e) => setNewStatusInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddNewStatus('in_progress')}
                      placeholder="Novo status..."
                      autoFocus
                      style={{
                        flex: 1,
                        background: 'var(--adm-bg-input)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.78rem',
                        color: 'var(--adm-text-title)',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddNewStatus('in_progress')}
                      style={{
                        background: 'var(--adm-accent)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Salvar
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {inProgressStatuses.map(s => (
                    <div
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid transparent',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.borderColor = 'var(--adm-border)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <GripVertical size={14} color="var(--adm-text-muted)" style={{ cursor: 'grab' }} />
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
                        <span style={{
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background: s.bgColor,
                          color: s.color,
                          padding: '2px 8px',
                          borderRadius: '12px',
                        }}>
                          {s.name}
                        </span>
                        {s.isDefault && (
                          <span style={{
                            fontSize: '0.64rem',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            background: 'rgba(255,255,255,0.08)',
                            color: 'var(--adm-text-muted)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}>
                            PADRÃO
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenEditSubmenu(s)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--adm-text-muted)',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── GROUP 3: CONCLUÍDOS ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 4px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Concluídos ({completedStatuses.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingInGroup('completed');
                      setNewStatusInput('');
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--adm-text-muted)',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Plus size={15} />
                  </button>
                </div>

                {isAddingInGroup === 'completed' && (
                  <div style={{ display: 'flex', gap: '6px', padding: '4px 0' }}>
                    <input
                      type="text"
                      value={newStatusInput}
                      onChange={(e) => setNewStatusInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddNewStatus('completed')}
                      placeholder="Novo status..."
                      autoFocus
                      style={{
                        flex: 1,
                        background: 'var(--adm-bg-input)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.78rem',
                        color: 'var(--adm-text-title)',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddNewStatus('completed')}
                      style={{
                        background: 'var(--adm-accent)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Salvar
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {completedStatuses.map(s => (
                    <div
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid transparent',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.borderColor = 'var(--adm-border)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <GripVertical size={14} color="var(--adm-text-muted)" style={{ cursor: 'grab' }} />
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
                        <span style={{
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background: s.bgColor,
                          color: s.color,
                          padding: '2px 8px',
                          borderRadius: '12px',
                        }}>
                          {s.name}
                        </span>
                        {s.isDefault && (
                          <span style={{
                            fontSize: '0.64rem',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            background: 'rgba(255,255,255,0.08)',
                            color: 'var(--adm-text-muted)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}>
                            PADRÃO
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenEditSubmenu(s)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--adm-text-muted)',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
