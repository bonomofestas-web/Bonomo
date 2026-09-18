import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Mail, Phone, Edit3, Trash2, 
  UserPlus, Shield, ShieldCheck, Plus,
  CheckCircle2, Clock, Check, ArrowLeft,
  UserX, AlertTriangle, CheckSquare, Target, X,
  Power, Lock
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { ImageUploadField } from './ImageUploadField';
import { createMonogramAvatar } from '../../utils/avatarUtils';
import { formatPhone, maskPhoneInput } from '../../utils/phoneFormatter';
import type { Collaborator, AdminRole } from '../../types/admin';

export const AdminCollaboratorsView: React.FC = () => {
  const { 
    collaborators, 
    venues, 
    deleteCollaborator, 
    addCollaborator,
    updateCollaborator,
    switchUserRoleDemo,
    currentUser,
    leads,
    tasks,
    sendCollaboratorInvite,
  } = useAdminState();

  const isCurrentUserManager = currentUser?.role === 'admin' || currentUser?.role === 'gerencia';

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [collaboratorToEdit, setCollaboratorToEdit] = useState<Collaborator | null>(null);
  const [collabToDelete, setCollabToDelete] = useState<Collaborator | null>(null);
  const [sendingInviteEmail, setSendingInviteEmail] = useState<string | null>(null);
  const [inviteSentEmail, setInviteSentEmail] = useState<string | null>(null);

  // Estados do Formulário em Área de Conteúdo
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCustomJobTitle, setFormCustomJobTitle] = useState('');
  const [formPassword, setFormPassword] = useState('123456');
  const [formSectors, setFormSectors] = useState<('comercial' | 'pos_venda' | 'gerencia' | 'financeiro')[]>(['comercial']);
  const [formSelectedVenueIds, setFormSelectedVenueIds] = useState<string[]>([]);
  const [formAvatarUrl, setFormAvatarUrl] = useState('');
  const [formActive, setFormActive] = useState(true);

  // Estados do Modal de Revinculação / Transferência
  const [reassignMode, setReassignMode] = useState<'transfer' | 'open'>('transfer');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('');

  // Colaboradores elegíveis para receber os leads (exclui quem está sendo deletado e root dev)
  const availableAssignees = useMemo(() => {
    if (!collabToDelete) return [];
    return collaborators.filter(c => c.id !== collabToDelete.id && c.active && c.role !== 'dev');
  }, [collaborators, collabToDelete]);

  // Leads atribuídos a este colaborador (para alerta no modal de exclusão)
  const affectedLeads = useMemo(() => {
    if (!collabToDelete) return [];
    return leads.filter(l => 
      l.sdrId === collabToDelete.id || 
      l.closerId === collabToDelete.id || 
      (collabToDelete.name && l.sdrName === collabToDelete.name) ||
      (collabToDelete.name && l.closerName === collabToDelete.name) ||
      l.assignedTo === collabToDelete.name ||
      l.assignedTo === collabToDelete.id
    );
  }, [leads, collabToDelete]);

  // Tarefas com lead ou compartilhadas que envolvem este colaborador
  const affectedTasks = useMemo(() => {
    if (!collabToDelete) return [];
    return tasks.filter(t => 
      (t.assignedToIds && t.assignedToIds.includes(collabToDelete.id)) ||
      (t.createdById === collabToDelete.id && (t.leadId || t.debutanteId))
    );
  }, [tasks, collabToDelete]);

  const rolePriority: Record<string, number> = {
    master: 1,
    dev: 2,
    admin: 3,
    closer: 4,
    sdr: 5,
    pos_venda: 6,
    crm: 7,
  };

  const sortedCollaborators = useMemo(() => {
    return [...collaborators].sort((a, b) => {
      const priorityA = rolePriority[a.role] || 99;
      const priorityB = rolePriority[b.role] || 99;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return a.name.localeCompare(b.name);
    });
  }, [collaborators]);

  const isPendingFirstAccess = (c: Collaborator): boolean => {
    if (c.role === 'master' || c.role === 'dev') return false;
    return Boolean(c.isFirstAccess);
  };

  const handleSendInviteEmail = async (collab: Collaborator) => {
    setSendingInviteEmail(collab.email);
    try {
      await sendCollaboratorInvite(collab.email, collab.name, collab.role);
      setInviteSentEmail(collab.email);
      setTimeout(() => setInviteSentEmail(null), 3000);
    } catch (e) {
      console.warn('Erro ao reenviar convite:', e);
    } finally {
      setSendingInviteEmail(null);
    }
  };

  const handleOpenAdd = () => {
    setCollaboratorToEdit(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormCustomJobTitle('');
    setFormPassword('123456');
    setFormSectors(['comercial']);
    setFormSelectedVenueIds(venues.map(v => v.id));
    setFormAvatarUrl('');
    setFormActive(true);
    setIsFormOpen(true);
  };

  const handleOpenCreate = handleOpenAdd;

  const handleOpenEdit = (collab: Collaborator) => {
    const isTargetManagerOrAbove = collab.role === 'admin' || collab.role === 'master' || collab.role === 'dev' || collab.role === 'gerencia';
    const isSelf = collab.id === currentUser?.id || (currentUser?.email && collab.email.toLowerCase() === currentUser.email.toLowerCase());
    if (isCurrentUserManager && (isSelf || isTargetManagerOrAbove)) {
      alert('Acesso restrito: gerentes não podem editar o próprio perfil nem colaboradores com função de gerência ou superior.');
      return;
    }

    setCollaboratorToEdit(collab);
    setFormName(collab.name || '');
    setFormEmail(collab.email || '');
    setFormPhone(collab.phone ? formatPhone(collab.phone) : '');
    setFormCustomJobTitle(collab.customJobTitle || '');
    setFormPassword(collab.password || '••••••••');
    const existingSectors: ('comercial' | 'pos_venda' | 'gerencia' | 'financeiro')[] = collab.sectors && collab.sectors.length > 0
      ? collab.sectors
      : collab.role === 'pos_venda' ? ['pos_venda']
      : collab.role === 'admin' || collab.role === 'master' ? ['gerencia', 'comercial', 'pos_venda']
      : ['comercial'];
    setFormSectors(existingSectors);
    const vIds = collab.venueIds && collab.venueIds.length > 0 ? collab.venueIds : (collab.venueId && collab.venueId !== 'all' ? [collab.venueId] : venues.map(v => v.id));
    setFormSelectedVenueIds(vIds);
    setFormAvatarUrl(collab.avatarUrl || '');
    setFormActive(collab.active ?? true);
    setIsFormOpen(true);
  };

  const handleSaveCollaborator = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      alert('Preencha ao menos o nome e e-mail do colaborador.');
      return;
    }

    const isTargetManagerOrAbove = collaboratorToEdit?.role === 'admin' || collaboratorToEdit?.role === 'master' || collaboratorToEdit?.role === 'dev' || collaboratorToEdit?.role === 'gerencia';
    if (isCurrentUserManager && (formSectors.includes('gerencia') || isTargetManagerOrAbove)) {
      alert('Acesso restrito: gerentes não possuem permissão para criar ou atribuir funções de gerência nem alterar perfis superiores.');
      return;
    }

    const primaryVenueId = formSelectedVenueIds.length === 1 ? formSelectedVenueIds[0] : 'all';

    // Computa a role base para compatibilidade
    let computedRole: AdminRole = 'crm';
    if (formSectors.includes('gerencia')) {
      computedRole = collaboratorToEdit?.role === 'master' ? 'master' : 'admin';
    } else if (formSectors.includes('pos_venda') && !formSectors.includes('comercial')) {
      computedRole = 'pos_venda';
    } else if (formSectors.includes('comercial')) {
      computedRole = collaboratorToEdit?.role === 'closer' ? 'closer' : collaboratorToEdit?.role === 'sdr' ? 'sdr' : 'crm';
    }

    const payload = {
      name: formName.trim(),
      email: formEmail.trim().toLowerCase(),
      phone: formPhone.trim() || undefined,
      customJobTitle: formCustomJobTitle.trim() || undefined,
      sectors: formSectors,
      role: computedRole,
      department: formSectors[0] || 'comercial',
      venueId: computedRole === 'master' ? 'all' : primaryVenueId,
      venueIds: computedRole === 'master' ? venues.map(v => v.id) : formSelectedVenueIds,
      avatarUrl: formAvatarUrl.trim() || undefined,
      active: formActive,
    };

    if (collaboratorToEdit) {
      updateCollaborator(collaboratorToEdit.id, {
        ...payload,
        password: formPassword !== '••••••••' ? formPassword : collaboratorToEdit.password,
      });
    } else {
      addCollaborator({
        ...payload,
        password: formPassword,
        isFirstAccess: true,
      });
    }

    setIsFormOpen(false);
  };

  const handleOpenDelete = (collab: Collaborator) => {
    const isTargetManagerOrAbove = collab.role === 'admin' || collab.role === 'master' || collab.role === 'dev' || collab.role === 'gerencia';
    const isSelf = collab.id === currentUser?.id || (currentUser?.email && collab.email.toLowerCase() === currentUser.email.toLowerCase());
    if (isCurrentUserManager && (isSelf || isTargetManagerOrAbove)) {
      alert('Acesso restrito: gerentes não podem excluir o próprio perfil nem colaboradores com função de gerência ou superior.');
      return;
    }

    setCollabToDelete(collab);
    setReassignMode('transfer');
    const firstOther = collaborators.find(c => c.id !== collab.id && c.active && c.role !== 'dev');
    setSelectedAssigneeId(firstOther?.id || '');
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'dev':
        return {
          label: 'Desenvolvedor (Root)',
          bg: 'rgba(20, 169, 215, 0.15)',
          color: '#14A9D7',
          border: '1px solid rgba(20, 169, 215, 0.4)',
        };
      case 'master':
        return {
          label: 'Master (Diretoria)',
          bg: 'var(--adm-gold-bg)',
          color: 'var(--adm-gold)',
          border: '1px solid rgba(20, 169, 215, 0.4)',
        };
      case 'admin':
        return {
          label: 'Gerente da Casa',
          bg: 'rgba(59, 130, 246, 0.15)',
          color: '#60A5FA',
          border: '1px solid rgba(59, 130, 246, 0.35)',
        };
      case 'sdr':
      case 'crm':
        return {
          label: 'SDR / Pré-Vendas',
          bg: 'rgba(139, 92, 246, 0.15)',
          color: '#A78BFA',
          border: '1px solid rgba(139, 92, 246, 0.35)',
        };
      case 'closer':
        return {
          label: 'Closer / Vendas',
          bg: 'rgba(249, 115, 22, 0.15)',
          color: '#FB923C',
          border: '1px solid rgba(249, 115, 22, 0.35)',
        };
      case 'pos_venda':
        return {
          label: 'Pós-Venda',
          bg: 'rgba(6, 182, 212, 0.15)',
          color: '#06B6D4',
          border: '1px solid rgba(6, 182, 212, 0.35)',
        };
      default:
        return {
          label: role,
          bg: 'var(--adm-bg-elevated)',
          color: 'var(--adm-text-body)',
          border: '1px solid var(--adm-border)',
        };
    }
  };

  if (isFormOpen) {
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
        {/* Header with Back and Save actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--adm-border)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              style={{
                background: 'var(--adm-bg-card)',
                border: '1px solid var(--adm-border)',
                borderRadius: '10px',
                padding: '8px 14px',
                color: 'var(--adm-text-title)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.80rem',
                fontWeight: 700,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--adm-accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--adm-border)'; }}
            >
              <ArrowLeft size={16} />
              <span>Voltar</span>
            </button>
            <div>
              <h1 style={{
                fontSize: '1.45rem',
                fontWeight: 800,
                color: 'var(--adm-text-title)',
                letterSpacing: '-0.4px',
                margin: 0,
              }}>
                {collaboratorToEdit ? `Editar Colaborador: ${collaboratorToEdit.name}` : 'Cadastrar Novo Colaborador'}
              </h1>
              <p style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', margin: '2px 0 0 0' }}>
                Configure os dados, cargo executivo e o nível de acesso por setores no F5 System.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              style={{
                background: 'transparent',
                border: '1px solid var(--adm-border)',
                color: 'var(--adm-text-muted)',
                borderRadius: '12px',
                padding: '9px 18px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => handleSaveCollaborator()}
              className="adm-btn-primary"
              style={{
                borderRadius: '12px',
                padding: '9px 22px',
                fontSize: '0.84rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Check size={16} />
              <span>{collaboratorToEdit ? 'Salvar Alterações' : 'Criar Colaborador'}</span>
            </button>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
          {/* Card 1: Identificação & Cargo */}
          <div className="saas-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--adm-border)', paddingBottom: '12px' }}>
              <UserPlus size={18} color="var(--adm-accent)" />
              <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                1. Dados de Identificação & Cargo
              </h2>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '6px' }}>
                Nome Completo *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Amanda Silveira"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: 'var(--adm-text-title)',
                  fontSize: '0.86rem',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '6px' }}>
                E-mail Corporativo *
              </label>
              <input
                type="email"
                required
                placeholder="amanda@bonomofestas.com.br"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: 'var(--adm-text-title)',
                  fontSize: '0.86rem',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '6px' }}>
                  WhatsApp / Telefone
                </label>
                <input
                  type="text"
                  placeholder="(21) 99999-9999"
                  value={formPhone}
                  onChange={(e) => setFormPhone(maskPhoneInput(e.target.value))}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    color: 'var(--adm-text-title)',
                    fontSize: '0.86rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '6px' }}>
                  Senha Provisória
                </label>
                <input
                  type="text"
                  placeholder="123456"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    color: 'var(--adm-text-title)',
                    fontSize: '0.86rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Cargo do Colaborador (Texto Livre) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-title)', marginBottom: '6px' }}>
                Cargo do Colaborador
              </label>
              <input
                type="text"
                placeholder="Ex: Consultor Comercial, Coordenador de Pós-Venda, Líder de Atendimento..."
                value={formCustomJobTitle}
                onChange={(e) => setFormCustomJobTitle(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: 'var(--adm-text-title)',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '0.70rem', color: 'var(--adm-text-muted)', display: 'block', marginTop: '4px' }}>
                Este cargo será exibido nas fichas de atendimento, tarefas e identificação da equipe.
              </span>
            </div>

            {/* Foto de Perfil */}
            <div>
              <ImageUploadField
                label="Foto de Perfil / Avatar (Opcional)"
                value={formAvatarUrl}
                onChange={setFormAvatarUrl}
                folder="avatars"
              />
            </div>
          </div>

          {/* Card 2: Nível de Acesso por Setores & Casas de Festa */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Setores */}
            <div className="saas-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--adm-border)', paddingBottom: '12px' }}>
                <ShieldCheck size={18} color="var(--adm-accent)" />
                <div>
                  <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                    2. Nível de Acesso por Setores
                  </h2>
                  <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
                    Selecione um ou mais setores. O colaborador terá liberdade de atuação em todos os blocos marcados.
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* 1. Setor Comercial */}
                <div
                  onClick={() => {
                    const isSelected = formSectors.includes('comercial');
                    setFormSectors(isSelected ? formSectors.filter(s => s !== 'comercial') : [...formSectors, 'comercial']);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: formSectors.includes('comercial') ? '1.5px solid #10B981' : '1px solid var(--adm-border)',
                    background: formSectors.includes('comercial') ? 'rgba(16, 185, 129, 0.08)' : 'var(--adm-bg-input)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formSectors.includes('comercial')}
                    onChange={() => {}}
                    style={{ marginTop: '3px', cursor: 'pointer', accentColor: '#10B981' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.86rem', fontWeight: 800, color: formSectors.includes('comercial') ? '#10B981' : 'var(--adm-text-title)' }}>
                        Setor Comercial
                      </span>
                      <span style={{ fontSize: '0.62rem', fontWeight: 700, background: 'rgba(16, 185, 129, 0.18)', color: '#10B981', padding: '1px 6px', borderRadius: '4px' }}>
                        + Visitas & Degustação
                      </span>
                    </div>
                    <p style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', margin: '3px 0 0 0', lineHeight: 1.35 }}>
                      Acesso aos Funis de Vendas, Leads, Oportunidades, WhatsApp e Follow-up. Recebe automaticamente permissão para gerenciar a agenda de <strong>Visitas & Degustação</strong>.
                    </p>
                  </div>
                </div>

                {/* 2. Setor de Pós-Venda */}
                <div
                  onClick={() => {
                    const isSelected = formSectors.includes('pos_venda');
                    setFormSectors(isSelected ? formSectors.filter(s => s !== 'pos_venda') : [...formSectors, 'pos_venda']);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: formSectors.includes('pos_venda') ? '1.5px solid #06B6D4' : '1px solid var(--adm-border)',
                    background: formSectors.includes('pos_venda') ? 'rgba(6, 182, 212, 0.08)' : 'var(--adm-bg-input)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formSectors.includes('pos_venda')}
                    onChange={() => {}}
                    style={{ marginTop: '3px', cursor: 'pointer', accentColor: '#06B6D4' }}
                  />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 800, color: formSectors.includes('pos_venda') ? '#06B6D4' : 'var(--adm-text-title)' }}>
                      Setor de Pós-Venda
                    </span>
                    <p style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', margin: '3px 0 0 0', lineHeight: 1.35 }}>
                      Acesso aos Clientes fechados, gestão de Aniversariantes & Aplicativo, Jornada VIP de indicações, Compromissos e Visitas & Degustação.
                    </p>
                  </div>
                </div>

                {/* 3. Setor de Gerência */}
                <div
                  onClick={() => {
                    if (isCurrentUserManager) return;
                    const isSelected = formSectors.includes('gerencia');
                    setFormSectors(isSelected ? formSectors.filter(s => s !== 'gerencia') : [...formSectors, 'gerencia']);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: isCurrentUserManager 
                      ? '1px dashed var(--adm-border)'
                      : formSectors.includes('gerencia') ? '1.5px solid #3B82F6' : '1px solid var(--adm-border)',
                    background: isCurrentUserManager
                      ? 'var(--adm-bg-card)'
                      : formSectors.includes('gerencia') ? 'rgba(59, 130, 246, 0.08)' : 'var(--adm-bg-input)',
                    cursor: isCurrentUserManager ? 'not-allowed' : 'pointer',
                    opacity: isCurrentUserManager ? 0.6 : 1,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!isCurrentUserManager && formSectors.includes('gerencia')}
                    disabled={isCurrentUserManager}
                    onChange={() => {}}
                    style={{ marginTop: '3px', cursor: isCurrentUserManager ? 'not-allowed' : 'pointer', accentColor: '#3B82F6' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.86rem', fontWeight: 800, color: formSectors.includes('gerencia') && !isCurrentUserManager ? '#3B82F6' : 'var(--adm-text-title)' }}>
                        Setor de Gerência
                      </span>
                      {isCurrentUserManager && (
                        <span style={{ fontSize: '0.62rem', fontWeight: 800, background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', padding: '1px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <Lock size={10} /> Apenas Master
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', margin: '3px 0 0 0', lineHeight: 1.35 }}>
                      {isCurrentUserManager
                        ? 'Gerentes não possuem permissão para conceder acesso de gerência a outros usuários.'
                        : 'Acesso ao Dashboard Gerencial, Metas das unidades, Qualificação ICP, Origens de Tráfego, Gestão de Colaboradores e Configurações das Casas.'}
                    </p>
                  </div>
                </div>

                {/* 4. Setor Financeiro (Em Breve) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px dashed var(--adm-border)',
                    background: 'var(--adm-bg-card)',
                    opacity: 0.6,
                    cursor: 'not-allowed',
                  }}
                >
                  <input type="checkbox" disabled checked={false} style={{ marginTop: '3px' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>
                        Setor Financeiro
                      </span>
                      <span style={{ fontSize: '0.60rem', fontWeight: 800, background: 'rgba(255, 255, 255, 0.08)', color: 'var(--adm-text-muted)', padding: '1px 5px', borderRadius: '4px' }}>
                        Em Breve
                      </span>
                    </div>
                    <p style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', margin: '3px 0 0 0', lineHeight: 1.35 }}>
                      Módulo de conciliação bancária, fluxo de caixa, comissões de fechamento e emissão de cobranças.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Casas de Festas Vinculadas */}
            <div className="saas-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--adm-border)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={18} color="var(--adm-accent)" />
                  <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                    3. Casas de Festas Vinculadas
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (formSelectedVenueIds.length === venues.length) {
                      setFormSelectedVenueIds([]);
                    } else {
                      setFormSelectedVenueIds(venues.map(v => v.id));
                    }
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--adm-accent)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {formSelectedVenueIds.length === venues.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                {venues.map(venue => {
                  const isChecked = formSelectedVenueIds.includes(venue.id);
                  return (
                    <div
                      key={venue.id}
                      onClick={() => {
                        setFormSelectedVenueIds(prev => 
                          isChecked ? prev.filter(id => id !== venue.id) : [...prev, venue.id]
                        );
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: isChecked ? '1.5px solid var(--adm-accent)' : '1px solid var(--adm-border)',
                        background: isChecked ? 'var(--adm-accent-bg)' : 'var(--adm-bg-input)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        style={{ cursor: 'pointer', accentColor: 'var(--adm-accent)' }}
                      />
                      <span style={{ fontSize: '0.80rem', fontWeight: isChecked ? 800 : 500, color: 'var(--adm-text-title)' }}>
                        {venue.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status Ativo */}
            <div className="saas-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                  Acesso Ativo no Sistema
                </span>
                <p style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', margin: '2px 0 0 0' }}>
                  Quando ativo, o colaborador pode efetuar login e receber atribuições.
                </p>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#10B981', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.80rem', fontWeight: 700, color: formActive ? '#10B981' : '#EF4444' }}>
                  {formActive ? 'Ativo' : 'Inativo'}
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            Controle de Colaboradores & Acessos (Equipe)
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)', margin: 0 }}>
            Gerencie SDRs, Closers e Gerentes de cada unidade com controle de visibilidade.
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
          <UserPlus size={16} />
          <span>Novo Colaborador</span>
        </button>
      </div>

      {/* Role Test Simulator Bar */}
      <div style={{
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '16px',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={16} color="var(--adm-accent)" />
          <span style={{ fontSize: '0.76rem', color: 'var(--adm-text-title)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Simular Visão por Perfil:
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => switchUserRoleDemo('master')}
            style={{
              background: currentUser?.role === 'master' ? '#D4AF37' : 'var(--adm-bg-input)',
              color: currentUser?.role === 'master' ? '#000' : 'var(--adm-text-muted)',
              border: '1px solid var(--adm-border)',
              borderRadius: '20px',
              padding: '4px 14px',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Master (Diretoria)
          </button>

          <button
            onClick={() => switchUserRoleDemo('admin')}
            style={{
              background: currentUser?.role === 'admin' ? '#3B82F6' : 'var(--adm-bg-input)',
              color: currentUser?.role === 'admin' ? '#FFF' : 'var(--adm-text-muted)',
              border: '1px solid var(--adm-border)',
              borderRadius: '20px',
              padding: '4px 14px',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Gerente de Unidade
          </button>

          <button
            onClick={() => switchUserRoleDemo('sdr')}
            style={{
              background: currentUser?.role === 'sdr' ? '#8B5CF6' : 'var(--adm-bg-input)',
              color: currentUser?.role === 'sdr' ? '#FFF' : 'var(--adm-text-muted)',
              border: '1px solid var(--adm-border)',
              borderRadius: '20px',
              padding: '4px 14px',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            SDR (Pré-Vendas)
          </button>

          <button
            onClick={() => switchUserRoleDemo('closer')}
            style={{
              background: currentUser?.role === 'closer' ? '#F97316' : 'var(--adm-bg-input)',
              color: currentUser?.role === 'closer' ? '#FFF' : 'var(--adm-text-muted)',
              border: '1px solid var(--adm-border)',
              borderRadius: '20px',
              padding: '4px 14px',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Closer (Vendas)
          </button>

          <button
            onClick={() => switchUserRoleDemo('pos_venda')}
            style={{
              background: currentUser?.role === 'pos_venda' ? '#06B6D4' : 'var(--adm-bg-input)',
              color: currentUser?.role === 'pos_venda' ? '#FFF' : 'var(--adm-text-muted)',
              border: '1px solid var(--adm-border)',
              borderRadius: '20px',
              padding: '4px 14px',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Pós-Venda
          </button>
        </div>
      </div>

      {/* Collaborators List */}
      {collaborators.length === 0 ? (
        <div style={{
          background: 'var(--adm-bg-card)',
          border: '1px dashed var(--adm-border)',
          borderRadius: '16px',
          padding: '48px 24px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
        }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            background: 'var(--adm-accent-bg)',
            color: 'var(--adm-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <ShieldCheck size={28} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: '0 0 6px 0' }}>
              Nenhum Colaborador Cadastrado
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', margin: 0, maxWidth: '420px', lineHeight: 1.5 }}>
              Cadastre membros da sua equipe comercial (SDR, Closer, Gerente) para atender leads e distribuir atendimentos.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            style={{
              background: 'var(--adm-accent)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 20px',
              fontSize: '0.84rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(20, 169, 215, 0.3)',
            }}
          >
            <Plus size={16} />
            <span>Cadastrar Primeiro Colaborador</span>
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '18px',
        }}>
          {sortedCollaborators.map(collab => {
          const badge = getRoleBadge(collab.role);
          const venue = venues.find(v => v.id === collab.venueId);
          const venueName = collab.venueId === 'all' ? 'Todas as Unidades (Rede)' : (venue?.name || 'Unidade Especificada');
          const isSelf = collab.id === currentUser?.id || (currentUser?.email && collab.email.toLowerCase() === currentUser.email.toLowerCase());
          const isMasterRole = collab.role === 'master';
          const isTargetManagerOrAbove = collab.role === 'admin' || collab.role === 'master' || collab.role === 'dev' || collab.role === 'gerencia';
          const canToggle = !isSelf && !isMasterRole && (!isCurrentUserManager || !isTargetManagerOrAbove);
          const canEdit = !isSelf && (!isCurrentUserManager || !isTargetManagerOrAbove);
          const canDelete = !isSelf && collab.role !== 'master' && (!isCurrentUserManager || !isTargetManagerOrAbove);

          return (
            <div
              key={collab.id}
              className="saas-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                opacity: collab.active ? 1 : 0.65,
                filter: collab.active ? 'none' : 'grayscale(100%)',
                transition: 'all 0.25s ease',
              }}
            >
              {/* Profile Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src={(collab.avatarUrl && !collab.avatarUrl.includes('unsplash.com')) ? collab.avatarUrl : createMonogramAvatar(collab.name)}
                    alt={collab.name}
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: `1.5px solid ${collab.active ? 'var(--adm-accent)' : 'rgba(100, 116, 139, 0.4)'}`,
                      filter: collab.active ? 'none' : 'grayscale(100%)',
                      transition: 'all 0.2s ease',
                    }}
                  />
                  <div>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                      {collab.name}
                    </h3>
                    {collab.customJobTitle && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--adm-accent)', fontWeight: 700, marginTop: '2px' }}>
                        {collab.customJobTitle}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                      <span style={{
                        background: badge.bg,
                        color: badge.color,
                        border: badge.border,
                        borderRadius: '8px',
                        padding: '2px 8px',
                        fontSize: '0.66rem',
                        fontWeight: 800,
                      }}>
                        {badge.label}
                      </span>
                      {collab.department && (
                        <span style={{
                          background: 'rgba(99, 102, 241, 0.1)',
                          color: '#818cf8',
                          border: '1px solid rgba(99, 102, 241, 0.25)',
                          borderRadius: '8px',
                          padding: '2px 7px',
                          fontSize: '0.64rem',
                          fontWeight: 700,
                        }}>
                          {collab.department}
                        </span>
                      )}
                      {isPendingFirstAccess(collab) && (
                        <span style={{
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: '#F59E0B',
                          border: '1px solid rgba(245, 158, 11, 0.4)',
                          borderRadius: '8px',
                          padding: '2px 8px',
                          fontSize: '0.66rem',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}>
                          <Clock size={10} />
                          Aguardando 1º Acesso
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botão de Power Liga/Desliga — Exibido APENAS quando o usuário tem permissão para gerenciar este perfil */}
                {canToggle && (
                  <button
                    type="button"
                    onClick={() => updateCollaborator(collab.id, { active: !collab.active })}
                    title={collab.active ? 'Colaborador Ativo • Clique para desativar' : 'Colaborador Desativado • Clique para reativar'}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: collab.active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                      border: `1.5px solid ${collab.active ? 'rgba(16, 185, 129, 0.5)' : 'rgba(100, 116, 139, 0.35)'}`,
                      color: collab.active ? '#10B981' : '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: collab.active ? '0 0 12px rgba(16, 185, 129, 0.3)' : 'none',
                      flexShrink: 0,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'scale(1.08)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <Power size={18} />
                  </button>
                )}
              </div>

              {/* Status de Ativação / Primeiro Acesso */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '10px',
                background: !collab.active 
                  ? 'rgba(239, 68, 68, 0.08)'
                  : isPendingFirstAccess(collab)
                    ? 'rgba(245, 158, 11, 0.1)'
                    : 'rgba(16, 185, 129, 0.08)',
                border: `1px solid ${
                  !collab.active 
                    ? 'rgba(239, 68, 68, 0.25)' 
                    : isPendingFirstAccess(collab) 
                      ? 'rgba(245, 158, 11, 0.35)' 
                      : 'rgba(16, 185, 129, 0.25)'
                }`,
                fontSize: '0.72rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {!collab.active ? (
                    <>
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#EF4444' }} />
                      <span style={{ color: '#EF4444', fontWeight: 700 }}>Acesso Desativado</span>
                    </>
                  ) : isPendingFirstAccess(collab) ? (
                    <>
                      <Clock size={13} color="#F59E0B" />
                      <span style={{ color: '#F59E0B', fontWeight: 700 }}>Aguardando 1º Acesso</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={13} color="#10B981" />
                      <span style={{ color: '#10B981', fontWeight: 700 }}>
                        {collab.activatedAt ? `Ativado em ${new Date(collab.activatedAt).toLocaleDateString('pt-BR')}` : 'Conta Ativa & Operante'}
                      </span>
                    </>
                  )}
                </div>

                {collab.active && isPendingFirstAccess(collab) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleSendInviteEmail(collab)}
                      disabled={sendingInviteEmail === collab.email}
                      title="Disparar e-mail de convite oficial com instruções de 1º acesso"
                      style={{
                        background: 'rgba(20, 169, 215, 0.15)',
                        border: '1px solid rgba(20, 169, 215, 0.35)',
                        color: '#14A9D7',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: sendingInviteEmail === collab.email ? 'wait' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {inviteSentEmail === collab.email ? (
                        <>
                          <Check size={12} color="#10B981" />
                          <span style={{ color: '#10B981' }}>E-mail Enviado!</span>
                        </>
                      ) : (
                        <>
                          <Mail size={12} />
                          <span>{sendingInviteEmail === collab.email ? 'Enviando...' : 'Reenviar Convite'}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {collab.active && !isPendingFirstAccess(collab) && collab.role !== 'master' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleSendInviteEmail(collab)}
                      disabled={sendingInviteEmail === collab.email}
                      title="Disparar e-mail de redefinição de senha para este colaborador"
                      style={{
                        background: 'rgba(20, 169, 215, 0.12)',
                        border: '1px solid rgba(20, 169, 215, 0.3)',
                        color: '#14A9D7',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: sendingInviteEmail === collab.email ? 'wait' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {inviteSentEmail === collab.email ? (
                        <>
                          <Check size={12} color="#10B981" />
                          <span style={{ color: '#10B981' }}>Enviado!</span>
                        </>
                      ) : (
                        <>
                          <Mail size={12} />
                          <span>{sendingInviteEmail === collab.email ? 'Enviando...' : 'E-mail Senha'}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Details */}
              <div style={{
                background: 'var(--adm-bg-input)',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '0.76rem',
                color: 'var(--adm-text-muted)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={13} color="var(--adm-accent)" />
                  <span style={{ color: 'var(--adm-text-title)' }}>{collab.email}</span>
                </div>

                {collab.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Phone size={13} color="var(--adm-accent)" />
                    <span>{formatPhone(collab.phone)}</span>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={13} color="var(--adm-accent)" />
                  <span>{venueName}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px dashed var(--adm-border)', paddingTop: '6px', marginTop: '2px' }}>
                  <Clock size={13} color={isPendingFirstAccess(collab) ? '#F59E0B' : '#10B981'} />
                  <span>
                    <strong style={{ color: 'var(--adm-text-title)' }}>Último Acesso:</strong>{' '}
                    <span style={{ color: isPendingFirstAccess(collab) ? '#F59E0B' : 'var(--adm-text-body)', fontWeight: isPendingFirstAccess(collab) ? 700 : 500 }}>
                      {isPendingFirstAccess(collab)
                        ? 'Nunca acessou o sistema'
                        : collab.lastLoginAt
                          ? `${new Date(collab.lastLoginAt).toLocaleDateString('pt-BR')} às ${new Date(collab.lastLoginAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                          : collab.activatedAt
                            ? `Ativado em ${new Date(collab.activatedAt).toLocaleDateString('pt-BR')}`
                            : 'Nunca acessou o sistema'}
                    </span>
                  </span>
                </div>
              </div>

              {/* Actions Row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid var(--adm-border)',
                paddingTop: '12px',
              }}>
                {collab.role === 'dev' ? (
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: '#14A9D7',
                    background: 'rgba(20, 169, 215, 0.12)',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(20, 169, 215, 0.3)',
                  }}>
                    🛡️ Conta Desenvolvedor
                  </span>
                ) : isSelf ? (
                  <span style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: 'var(--adm-accent)',
                    background: 'rgba(212, 175, 55, 0.1)',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(212, 175, 55, 0.25)',
                  }}>
                    👤 Seu Perfil
                  </span>
                ) : isCurrentUserManager && isTargetManagerOrAbove ? (
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: 'var(--adm-text-muted)',
                    background: 'var(--adm-bg-elevated)',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    <Lock size={12} /> Perfil Gerencial Protegido
                  </span>
                ) : (
                  <>
                    {canEdit && (
                      <button
                        onClick={() => handleOpenEdit(collab)}
                        style={{
                          background: 'var(--adm-bg-elevated)',
                          border: '1px solid var(--adm-border)',
                          color: 'var(--adm-text-title)',
                          borderRadius: '10px',
                          padding: '6px 14px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Edit3 size={13} color="var(--adm-accent)" />
                        <span>Editar</span>
                      </button>
                    )}

                    {canDelete && (
                      <button
                        onClick={() => handleOpenDelete(collab)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--adm-red)',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Trash2 size={13} />
                        <span>Remover</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* ── MODAL DE REVINCULAÇÃO & EXCLUSÃO DE COLABORADOR ───────────────────── */}
      {collabToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px',
        }}>
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Header */}
            <div style={{
              padding: '20px 24px 16px 24px',
              borderBottom: '1px solid var(--adm-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#EF4444',
                }}>
                  <UserX size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                    Excluir Colaborador
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--adm-text-muted)' }}>
                    Transferência de responsabilidades e segurança comercial
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCollabToDelete(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--adm-text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Card Colaborador */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                background: 'var(--adm-bg-input)',
                borderRadius: '12px',
                border: '1px solid var(--adm-border)',
              }}>
                <img
                  src={(collabToDelete.avatarUrl && !collabToDelete.avatarUrl.includes('unsplash.com')) ? collabToDelete.avatarUrl : createMonogramAvatar(collabToDelete.name)}
                  alt={collabToDelete.name}
                  style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--adm-border)' }}
                />
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                    {collabToDelete.name}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
                    {collabToDelete.email} • <span style={{ textTransform: 'capitalize' }}>{collabToDelete.role}</span>
                  </div>
                </div>
              </div>

              {/* Impact Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'rgba(20, 169, 215, 0.08)',
                  border: '1px solid rgba(20, 169, 215, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--adm-accent)', fontWeight: 700 }}>
                    <Target size={14} />
                    <span>Leads Vinculados</span>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                    {affectedLeads.length}
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'rgba(139, 92, 246, 0.08)',
                  border: '1px solid rgba(139, 92, 246, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#A78BFA', fontWeight: 700 }}>
                    <CheckSquare size={14} />
                    <span>Tarefas Vinculadas</span>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                    {affectedTasks.length}
                  </div>
                </div>
              </div>

              {/* Reatribuição Options */}
              {affectedLeads.length > 0 || affectedTasks.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                    O que fazer com os leads e tarefas em andamento?
                  </label>

                  {/* Opção A: Reatribuir */}
                  <div 
                    onClick={() => setReassignMode('transfer')}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: `1.5px solid ${reassignMode === 'transfer' ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                      background: reassignMode === 'transfer' ? 'rgba(20, 169, 215, 0.08)' : 'var(--adm-bg-input)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="radio" 
                        name="reassignMode" 
                        checked={reassignMode === 'transfer'} 
                        onChange={() => setReassignMode('transfer')}
                        style={{ accentColor: 'var(--adm-accent)', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                        Reatribuir para outro colaborador (Recomendado)
                      </span>
                    </div>

                    {reassignMode === 'transfer' && (
                      <div style={{ paddingLeft: '22px' }}>
                        {availableAssignees.length > 0 ? (
                          <select
                            value={selectedAssigneeId}
                            onChange={(e) => setSelectedAssigneeId(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid var(--adm-border)',
                              background: 'var(--adm-bg-card)',
                              color: 'var(--adm-text-title)',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              outline: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            {availableAssignees.map(collab => (
                              <option key={collab.id} value={collab.id}>
                                {collab.name} ({collab.role.toUpperCase()})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
                            Nenhum outro colaborador ativo disponível para transferência.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Opção B: Deixar em aberto */}
                  <div 
                    onClick={() => setReassignMode('open')}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: `1.5px solid ${reassignMode === 'open' ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                      background: reassignMode === 'open' ? 'rgba(20, 169, 215, 0.08)' : 'var(--adm-bg-input)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="radio" 
                        name="reassignMode" 
                        checked={reassignMode === 'open'} 
                        onChange={() => setReassignMode('open')}
                        style={{ accentColor: 'var(--adm-accent)', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                        Deixar em aberto no CRM (Sem responsável)
                      </span>
                    </div>
                    <div style={{ paddingLeft: '22px', fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
                      Os leads aparecerão na fila geral do funil para qualquer SDR ou Closer assumir livremente.
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  fontSize: '0.76rem',
                  color: '#10B981',
                }}>
                  ✓ Este colaborador não possui leads nem tarefas pendentes no CRM.
                </div>
              )}

              {/* Security Alert */}
              <div style={{
                padding: '10px 12px',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                fontSize: '0.72rem',
                color: '#D97706',
              }}>
                <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  <strong>Nota de segurança:</strong> Apenas tarefas particulares que o colaborador criou para si mesmo serão excluídas. Histórico comercial e dados de clientes são 100% preservados.
                </span>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--adm-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              background: 'var(--adm-bg-input)',
            }}>
              <button
                type="button"
                onClick={() => setCollabToDelete(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--adm-border)',
                  background: 'transparent',
                  color: 'var(--adm-text-title)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  if (collabToDelete) {
                    const targetReassignId = reassignMode === 'transfer' && selectedAssigneeId ? selectedAssigneeId : null;
                    deleteCollaborator(collabToDelete.id, targetReassignId);
                    setCollabToDelete(null);
                  }
                }}
                style={{
                  padding: '8px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#EF4444',
                  color: '#FFFFFF',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.35)',
                }}
              >
                <Trash2 size={14} />
                <span>Confirmar Exclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
