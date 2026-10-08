import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Mail, Phone, Edit3, Trash2, 
  UserPlus, ShieldCheck, Plus,
  CheckCircle2, Clock, Check, ArrowLeft,
  UserX, AlertTriangle, CheckSquare, Target, X,
  Power, Lock, UserCheck, Shield, SlidersHorizontal,
  ArrowRightLeft, Search, KeyRound, List, LayoutGrid, ArrowUpDown
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { ImageUploadField } from './ImageUploadField';
import { createMonogramAvatar } from '../../utils/avatarUtils';
import { formatPhone, maskPhoneInput } from '../../utils/phoneFormatter';
import { AdminCollabInviteModal } from './AdminCollabInviteModal';
import type { Collaborator, AdminRole, LeadActivity, Lead } from '../../types/admin';

export const AdminCollaboratorsView: React.FC = () => {
  const { 
    collaborators, 
    venues, 
    deleteCollaborator, 
    addCollaborator,
    updateCollaborator,
    currentUser,
    leads,
    tasks,
    sendCollaboratorInvite,
    updateLeadData,
    showSystemAlert,
  } = useAdminState();

  const isCurrentUserManager = currentUser?.role === 'admin' || currentUser?.role === 'gerencia';

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [collaboratorToEdit, setCollaboratorToEdit] = useState<Collaborator | null>(null);
  const [collabToDelete, setCollabToDelete] = useState<Collaborator | null>(null);
  const [collabForInviteModal, setCollabForInviteModal] = useState<Collaborator | null>(null);
  const [sendingInviteEmail, setSendingInviteEmail] = useState<string | null>(null);
  const [inviteSentEmail, setInviteSentEmail] = useState<string | null>(null);

  // Modos de Exibição (Lista primária como padrão, Cards) e Ordenação (Audio 6)
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [collabSearchQuery, setCollabSearchQuery] = useState('');
  const [collabSortBy, setCollabSortBy] = useState<'name_asc' | 'name_desc' | 'created_desc' | 'created_asc' | 'role_priority'>('name_asc');

  // Estados do Formulário em Área de Conteúdo
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCustomJobTitle, setFormCustomJobTitle] = useState('');
  const [formSectors, setFormSectors] = useState<('comercial' | 'pos_venda' | 'gerencia' | 'financeiro')[]>(['comercial']);
  const [formSelectedVenueIds, setFormSelectedVenueIds] = useState<string[]>([]);
  const [formAvatarUrl, setFormAvatarUrl] = useState('');
  const [formActive, setFormActive] = useState(true);

  // Estados da Central de Super Gestão do Colaborador
  const [collabForManagement, setCollabForManagement] = useState<Collaborator | null>(null);
  const [managementTab, setManagementTab] = useState<'leads' | 'tasks'>('leads');
  const [managementSearchQuery, setManagementSearchQuery] = useState('');
  const [selectedLeadIdsForTransfer, setSelectedLeadIdsForTransfer] = useState<string[]>([]);
  const [transferTargetCollabId, setTransferTargetCollabId] = useState<string>('');
  const [transferRoleMode, setTransferRoleMode] = useState<'sdr' | 'closer' | 'all'>('all');
  const [isTransferringLeads, setIsTransferringLeads] = useState(false);
  const [transferSuccessMessage, setTransferSuccessMessage] = useState<string | null>(null);

  // Estados do Modal de Edição de Perfil do Master (Audio 1)
  const [isMasterProfileOpen, setIsMasterProfileOpen] = useState(false);
  const [masterFormName, setMasterFormName] = useState('');
  const [masterFormEmail, setMasterFormEmail] = useState('');
  const [masterFormPhone, setMasterFormPhone] = useState('');
  const [masterFormAvatarUrl, setMasterFormAvatarUrl] = useState('');
  const [masterFormPassword, setMasterFormPassword] = useState('');
  const [isSavingMasterProfile, setIsSavingMasterProfile] = useState(false);

  // Estados do Modal de Revinculação / Transferência na Exclusão
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
    let list = [...collaborators];

    if (collabSearchQuery.trim()) {
      const q = collabSearchQuery.toLowerCase().trim();
      list = list.filter(c => 
        (c.name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.customJobTitle || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q)
      );
    }

    list.sort((a, b) => {
      if (collabSortBy === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '', 'pt-BR');
      }
      if (collabSortBy === 'name_desc') {
        return (b.name || '').localeCompare(a.name || '', 'pt-BR');
      }
      if (collabSortBy === 'created_desc') {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      }
      if (collabSortBy === 'created_asc') {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeA - timeB;
      }
      // role_priority (padrão)
      const priorityA = rolePriority[a.role] || 99;
      const priorityB = rolePriority[b.role] || 99;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return (a.name || '').localeCompare(b.name || '', 'pt-BR');
    });

    return list;
  }, [collaborators, collabSearchQuery, collabSortBy]);

  const isPendingFirstAccess = (c: Collaborator): boolean => {
    if (c.role === 'master') return false;
    if (c.isFirstAccess === false) return false;
    if (c.activatedAt || c.lastLoginAt) return false;
    // Se já possui uma senha válida/real configurada no banco, o primeiro acesso já foi concluído
    if (c.password && c.password.trim().length >= 6 && !c.password.includes('••')) return false;
    return Boolean(c.isFirstAccess);
  };

  const handleSendInviteEmail = async (collab: Collaborator) => {
    setSendingInviteEmail(collab.email);
    try {
      await sendCollaboratorInvite(collab.email, collab.name, collab.role, {
        masterId: collab.masterId,
        venueId: collab.venueId,
        venueIds: collab.venueIds,
        sectors: collab.sectors,
        department: collab.department,
      });
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
    setFormSectors(['comercial']);
    setFormSelectedVenueIds(venues.map(v => v.id));
    setFormAvatarUrl('');
    setFormActive(true);
    setIsFormOpen(true);
  };

  const handleOpenCreate = handleOpenAdd;

  const handleOpenEdit = (collab: Collaborator) => {
    const isTargetManagerOrAbove = collab.role === 'admin' || collab.role === 'master' || collab.role === 'gerencia';
    const isSelf = collab.id === currentUser?.id || (currentUser?.email && collab.email.toLowerCase() === currentUser.email.toLowerCase());
    if (isCurrentUserManager && (isSelf || isTargetManagerOrAbove)) {
      showSystemAlert('Acesso restrito: gerentes não podem editar o próprio perfil nem colaboradores com função de gerência ou superior.', 'Acesso Negado');
      return;
    }

    setCollaboratorToEdit(collab);
    setFormName(collab.name || '');
    setFormEmail(collab.email || '');
    setFormPhone(collab.phone ? formatPhone(collab.phone) : '');
    setFormCustomJobTitle(collab.customJobTitle || '');
    const existingSectors: ('comercial' | 'pos_venda' | 'gerencia' | 'financeiro')[] = collab.sectors && collab.sectors.length > 0
      ? collab.sectors
      : collab.role === 'pos_venda' ? ['pos_venda', 'comercial']
      : collab.role === 'admin' || collab.role === 'master' || collab.role === 'gerencia' ? ['gerencia', 'comercial', 'pos_venda']
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
      showSystemAlert('Preencha ao menos o nome e e-mail do colaborador.', 'Campos Obrigatórios', 'warning');
      return;
    }

    const isTargetManagerOrAbove = collaboratorToEdit?.role === 'admin' || collaboratorToEdit?.role === 'master' || collaboratorToEdit?.role === 'gerencia';
    if (isCurrentUserManager && (formSectors.includes('gerencia') || isTargetManagerOrAbove)) {
      showSystemAlert('Acesso restrito: gerentes não possuem permissão para criar ou atribuir funções de gerência nem alterar perfis superiores.', 'Acesso Negado');
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
      // Gestor não define senha de cadastro; preserva a senha e o status do colaborador
      updateCollaborator(collaboratorToEdit.id, {
        ...payload,
        password: collaboratorToEdit.password,
        isFirstAccess: collaboratorToEdit.isFirstAccess,
      });
    } else {
      // Novo colaborador inicia com primeiro acesso pendente; ele próprio definirá a senha via Link Oficial
      const newId = addCollaborator({
        ...payload,
        password: '',
        isFirstAccess: true,
      });
      // Abre o modal do Link de Entrada para o Master copiar ou enviar no WhatsApp na hora
      setCollabForInviteModal({
        ...payload,
        id: newId,
        isFirstAccess: true,
        createdAt: new Date().toISOString().split('T')[0],
      } as Collaborator);
    }

    setIsFormOpen(false);
  };

  const handleOpenDelete = (collab: Collaborator) => {
    const isTargetManagerOrAbove = collab.role === 'admin' || collab.role === 'master' || collab.role === 'gerencia';
    const isSelf = collab.id === currentUser?.id || (currentUser?.email && collab.email.toLowerCase() === currentUser.email.toLowerCase());
    if (isCurrentUserManager && (isSelf || isTargetManagerOrAbove)) {
      showSystemAlert('Acesso restrito: gerentes não podem excluir o próprio perfil nem colaboradores com função de gerência ou superior.', 'Acesso Negado');
      return;
    }

    setCollabToDelete(collab);
    setReassignMode('transfer');
    const firstOther = collaborators.find(c => c.id !== collab.id && c.active && c.role !== 'dev');
    setSelectedAssigneeId(firstOther?.id || '');
  };



  const getCollabRoleTitle = (collab: Collaborator) => {
    if (collab.customJobTitle && collab.customJobTitle.trim()) {
      return collab.customJobTitle.trim();
    }
    if (collab.role === 'master') return 'Diretoria Geral';
    if (collab.isDev || collab.role === 'dev') return 'Desenvolvedor';
    if (collab.role === 'admin') return 'Administrador';
    if (collab.role === 'gerencia') return 'Gerência Geral';
    if (collab.role === 'closer') return 'Closer (Fechamento)';
    if (collab.role === 'sdr') return 'SDR (Pré-Vendas)';
    if (collab.role === 'pos_venda') return 'Pós-Venda (Sucesso do Cliente)';
    return '';
  };

  const getRoleBadge = (role: AdminRole) => {
    switch (role) {
      case 'master':
        return { label: 'Master', color: 'var(--adm-gold, #D4AF37)', bg: 'rgba(212, 175, 55, 0.15)' };
      case 'dev':
        return { label: 'Desenvolvedor', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
      case 'admin':
        return { label: 'Administrador', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' };
      case 'gerencia':
        return { label: 'Gerente', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)' };
      case 'closer':
        return { label: 'Closer', color: '#EC4899', bg: 'rgba(236, 72, 153, 0.15)' };
      case 'sdr':
        return { label: 'SDR', color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.15)' };
      case 'pos_venda':
        return { label: 'Pós-Venda', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)' };
      default:
        return { label: role, color: 'var(--adm-text-muted)', bg: 'rgba(100, 116, 139, 0.15)' };
    }
  };

  const getCollabSectors = (collab: Collaborator): ('comercial' | 'pos_venda' | 'gerencia' | 'financeiro')[] => {
    if (collab.sectors && collab.sectors.length > 0) return collab.sectors;
    if (collab.role === 'master' || collab.role === 'admin' || collab.role === 'gerencia') {
      return ['gerencia', 'comercial', 'pos_venda'];
    }
    if (collab.role === 'pos_venda') return ['pos_venda'];
    return ['comercial'];
  };

  const getCollabLeads = (collab: Collaborator) => {
    return leads.filter(l => 
      l.sdrId === collab.id || 
      l.closerId === collab.id || 
      (collab.name && l.sdrName === collab.name) ||
      (collab.name && l.closerName === collab.name) ||
      l.assignedTo === collab.name ||
      l.assignedTo === collab.id
    );
  };

  const getCollabTasks = (collab: Collaborator) => {
    return tasks.filter(t => 
      (t.assignedToIds && t.assignedToIds.includes(collab.id)) ||
      t.createdById === collab.id
    );
  };

  // Leads & Tarefas da modal de super gestão do colaborador selecionado
  const collabManagementLeads = useMemo(() => {
    if (!collabForManagement) return [];
    return getCollabLeads(collabForManagement);
  }, [leads, collabForManagement]);

  const filteredManagementLeads = useMemo(() => {
    if (!managementSearchQuery.trim()) return collabManagementLeads;
    const q = managementSearchQuery.toLowerCase();
    return collabManagementLeads.filter(l => 
      (l.name && l.name.toLowerCase().includes(q)) ||
      (l.phone && l.phone.includes(q)) ||
      (l.code && l.code.toLowerCase().includes(q)) ||
      (l.sourceName && l.sourceName.toLowerCase().includes(q))
    );
  }, [collabManagementLeads, managementSearchQuery]);

  const collabManagementTasks = useMemo(() => {
    if (!collabForManagement) return [];
    return getCollabTasks(collabForManagement);
  }, [tasks, collabForManagement]);

  const handleOpenSuperManagement = (collab: Collaborator, tab: 'leads' | 'tasks' = 'leads') => {
    setCollabForManagement(collab);
    setManagementTab(tab);
    setManagementSearchQuery('');
    setSelectedLeadIdsForTransfer([]);
    setTransferSuccessMessage(null);
    const eligibleOthers = collaborators.filter(c => c.id !== collab.id && c.active && c.role !== 'dev');
    setTransferTargetCollabId(eligibleOthers[0]?.id || '');
  };

  const handleExecuteLeadTransfer = async () => {
    if (!collabForManagement || selectedLeadIdsForTransfer.length === 0) return;
    const targetCollab = collaborators.find(c => c.id === transferTargetCollabId);
    if (!targetCollab) {
      showSystemAlert('Selecione o colaborador de destino para transferir os leads.', 'Atenção', 'warning');
      return;
    }

    setIsTransferringLeads(true);
    try {
      const now = new Date().toISOString();
      for (const leadId of selectedLeadIdsForTransfer) {
        const lead = leads.find(l => l.id === leadId);
        if (!lead) continue;

        const patch: Partial<Lead> = {};
        if (transferRoleMode === 'sdr') {
          patch.sdrId = targetCollab.id;
          patch.sdrName = targetCollab.name;
          if (!lead.closerId || lead.assignedTo === collabForManagement.name) {
            patch.assignedTo = targetCollab.name;
          }
        } else if (transferRoleMode === 'closer') {
          patch.closerId = targetCollab.id;
          patch.closerName = targetCollab.name;
          patch.assignedTo = targetCollab.name;
        } else {
          // Transferência Geral
          patch.sdrId = targetCollab.id;
          patch.sdrName = targetCollab.name;
          patch.closerId = targetCollab.id;
          patch.closerName = targetCollab.name;
          patch.assignedTo = targetCollab.name;
        }

        const auditNote: LeadActivity = {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          leadId,
          timestamp: now,
          type: 'assignment',
          title: 'Remanejamento de Responsável',
          text: `Lead transferido de ${collabForManagement.name} para ${targetCollab.name} por ${currentUser?.name || 'Administração'}.`,
          authorName: currentUser?.name || 'Administração',
          authorId: currentUser?.id,
          authorAvatarUrl: currentUser?.avatarUrl,
        };

        patch.activities = [auditNote, ...(lead.activities || [])];
        updateLeadData(leadId, patch);
      }

      setTransferSuccessMessage(`${selectedLeadIdsForTransfer.length} lead(s) remanejado(s) com sucesso para ${targetCollab.name}!`);
      setSelectedLeadIdsForTransfer([]);
      setTimeout(() => setTransferSuccessMessage(null), 4000);
    } catch (e) {
      console.warn('Erro ao transferir leads:', e);
      showSystemAlert('Erro ao remanejar leads. Tente novamente.', 'Erro ao Excluir');
    } finally {
      setIsTransferringLeads(false);
    }
  };

  const handleOpenMasterProfile = () => {
    const masterCollab = collaborators.find(c => c.role === 'master' && (c.id === currentUser?.id || c.email === currentUser?.email)) || currentUser;
    setMasterFormName(masterCollab?.name || currentUser?.name || '');
    setMasterFormEmail(masterCollab?.email || currentUser?.email || '');
    setMasterFormPhone(masterCollab?.phone ? formatPhone(masterCollab.phone) : '');
    setMasterFormAvatarUrl(masterCollab?.avatarUrl || currentUser?.avatarUrl || '');
    setMasterFormPassword('');
    setIsMasterProfileOpen(true);
  };

  const handleSaveMasterProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!masterFormName.trim() || !masterFormEmail.trim()) {
      showSystemAlert('Preencha seu nome e e-mail.', 'Campos Obrigatórios', 'warning');
      return;
    }
    setIsSavingMasterProfile(true);
    try {
      const masterId = currentUser?.id || collaborators.find(c => c.role === 'master')?.id;
      if (!masterId) return;

      const payload: Partial<Collaborator> = {
        name: masterFormName.trim(),
        email: masterFormEmail.trim().toLowerCase(),
        phone: masterFormPhone.trim() || undefined,
        avatarUrl: masterFormAvatarUrl.trim() || undefined,
      };
      if (masterFormPassword.trim()) {
        payload.password = masterFormPassword.trim();
      }

      updateCollaborator(masterId, payload);
      setIsMasterProfileOpen(false);
    } catch (err: any) {
      console.warn('Erro ao atualizar perfil do Master:', err);
      showSystemAlert('Não foi possível salvar as alterações.', 'Erro ao Salvar');
    } finally {
      setIsSavingMasterProfile(false);
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

            {/* Aviso de Primeiro Acesso por E-mail (Sem Senha Provisória) */}
            <div style={{
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <ShieldCheck size={20} color="var(--adm-accent, #3B82F6)" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', lineHeight: 1.45 }}>
                <strong style={{ color: 'var(--adm-text-title)' }}>Acesso Seguro por E-mail:</strong> Senhas provisórias foram removidas. O colaborador receberá um convite oficial por e-mail e definirá sua senha pessoal com código de segurança no primeiro acesso.
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
                    Defina os setores do colaborador. Gerentes têm acesso total com Pós-Venda e Comercial automáticos.
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* 1. Setor Comercial */}
                <div
                  onClick={() => {
                    const isSelected = formSectors.includes('comercial');
                    // Se for gerente, não desmarca comercial
                    if (formSectors.includes('gerencia')) return;
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
                    cursor: formSectors.includes('gerencia') ? 'default' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formSectors.includes('comercial')}
                    disabled={formSectors.includes('gerencia')}
                    onChange={() => {}}
                    style={{ marginTop: '3px', cursor: formSectors.includes('gerencia') ? 'default' : 'pointer', accentColor: '#10B981' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.86rem', fontWeight: 800, color: formSectors.includes('comercial') ? '#10B981' : 'var(--adm-text-title)' }}>
                        Setor Comercial
                      </span>
                      {formSectors.includes('gerencia') && (
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6', padding: '1px 6px', borderRadius: '4px' }}>
                          Incluso na Gerência
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', margin: '3px 0 0 0', lineHeight: 1.35 }}>
                      Acesso aos Funis de Vendas, Leads, WhatsApp Comercial, Oportunidades e Follow-up.
                    </p>
                  </div>
                </div>

                {/* 2. Setor de Pós-Venda */}
                <div
                  onClick={() => {
                    // Se for gerente, não desmarca pós-venda
                    if (formSectors.includes('gerencia')) return;
                    const isSelected = formSectors.includes('pos_venda');
                    if (isSelected) {
                      setFormSectors(formSectors.filter(s => s !== 'pos_venda'));
                    } else {
                      // Ao marcar Pós-Venda, garante que o Comercial em leitura também está disponível
                      setFormSectors(prev => {
                        const next: ('gerencia' | 'comercial' | 'pos_venda' | 'financeiro')[] = [...prev];
                        if (!next.includes('pos_venda')) next.push('pos_venda');
                        if (!next.includes('comercial')) next.push('comercial');
                        return next;
                      });
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: formSectors.includes('pos_venda') ? '1.5px solid #06B6D4' : '1px solid var(--adm-border)',
                    background: formSectors.includes('pos_venda') ? 'rgba(6, 182, 212, 0.08)' : 'var(--adm-bg-input)',
                    cursor: formSectors.includes('gerencia') ? 'default' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formSectors.includes('pos_venda')}
                    disabled={formSectors.includes('gerencia')}
                    onChange={() => {}}
                    style={{ marginTop: '3px', cursor: formSectors.includes('gerencia') ? 'default' : 'pointer', accentColor: '#06B6D4' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.86rem', fontWeight: 800, color: formSectors.includes('pos_venda') ? '#06B6D4' : 'var(--adm-text-title)' }}>
                        Setor de Pós-Venda
                      </span>
                      <span style={{ fontSize: '0.62rem', fontWeight: 700, background: 'rgba(6, 182, 212, 0.18)', color: '#06B6D4', padding: '1px 6px', borderRadius: '4px' }}>
                        + Comercial (Leitura)
                      </span>
                    </div>
                    <p style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', margin: '3px 0 0 0', lineHeight: 1.35 }}>
                      Acesso completo aos Clientes, Aniversariantes & App, Jornada VIP, Compromissos, mais consulta (leitura) ao setor comercial.
                    </p>
                  </div>
                </div>

                {/* 3. Setor de Gerência */}
                <div
                  onClick={() => {
                    if (isCurrentUserManager) return;
                    const isSelected = formSectors.includes('gerencia');
                    if (isSelected) {
                      setFormSectors(formSectors.filter(s => s !== 'gerencia'));
                    } else {
                      // 🌟 Regra do F5 System: Gerência marca AUTOMATICAMENTE Pós-Venda e Comercial!
                      setFormSectors(prev => {
                        const next: ('gerencia' | 'comercial' | 'pos_venda' | 'financeiro')[] = [...prev];
                        if (!next.includes('gerencia')) next.push('gerencia');
                        if (!next.includes('comercial')) next.push('comercial');
                        if (!next.includes('pos_venda')) next.push('pos_venda');
                        return next;
                      });
                    }
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
                      <span style={{ fontSize: '0.62rem', fontWeight: 700, background: 'rgba(59, 130, 246, 0.18)', color: '#3B82F6', padding: '1px 6px', borderRadius: '4px' }}>
                        Inclui Comercial & Pós-Venda
                      </span>
                      {isCurrentUserManager && (
                        <span style={{ fontSize: '0.62rem', fontWeight: 800, background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', padding: '1px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <Lock size={10} /> Apenas Master
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', margin: '3px 0 0 0', lineHeight: 1.35 }}>
                      Acesso ao Dashboard Gerencial, Metas das unidades, Qualificação ICP, Origens de Tráfego, Gestão de Colaboradores e Configurações das Casas.
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

      {/* Barra de Filtros, Ordenação e Alternador de Modos (Lista / Cards) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '14px',
        padding: '10px 14px',
      }}>
        {/* Lado Esquerdo: Campo de Busca */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--adm-bg-input)',
          border: '1px solid var(--adm-border)',
          borderRadius: '10px',
          padding: '0 12px',
          height: '38px',
          minWidth: '240px',
          maxWidth: '360px',
          flex: 1,
        }}>
          <Search size={15} color="var(--adm-text-muted)" />
          <input
            type="text"
            value={collabSearchQuery}
            onChange={(e) => setCollabSearchQuery(e.target.value)}
            placeholder="Buscar por nome, cargo, e-mail..."
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--adm-text-title)',
              fontSize: '0.82rem',
              fontWeight: 600,
              width: '100%',
            }}
          />
          {collabSearchQuery && (
            <button
              type="button"
              onClick={() => setCollabSearchQuery('')}
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
              <X size={13} />
            </button>
          )}
        </div>

        {/* Lado Direito: Seletor de Ordenação + Alternador de Visualização (Lista / Cards) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Ordenação */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--adm-bg-input)',
            border: '1px solid var(--adm-border)',
            borderRadius: '10px',
            padding: '0 10px',
            height: '38px',
          }}>
            <ArrowUpDown size={14} color="var(--adm-text-muted)" />
            <select
              value={collabSortBy}
              onChange={(e) => setCollabSortBy(e.target.value as any)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--adm-text-title)',
                fontSize: '0.80rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <option value="name_asc" style={{ background: 'var(--adm-bg-card)', color: 'var(--adm-text-title)' }}>Nome: A → Z</option>
              <option value="name_desc" style={{ background: 'var(--adm-bg-card)', color: 'var(--adm-text-title)' }}>Nome: Z → A</option>
              <option value="created_desc" style={{ background: 'var(--adm-bg-card)', color: 'var(--adm-text-title)' }}>Mais Recente</option>
              <option value="created_asc" style={{ background: 'var(--adm-bg-card)', color: 'var(--adm-text-title)' }}>Mais Antigo</option>
              <option value="role_priority" style={{ background: 'var(--adm-bg-card)', color: 'var(--adm-text-title)' }}>Hierarquia de Cargo</option>
            </select>
          </div>

          {/* Alternador Lista / Cards (Audio 6: Lista Primário) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--adm-bg-input)',
            border: '1px solid var(--adm-border)',
            borderRadius: '10px',
            padding: '3px',
            gap: '2px',
          }}>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              title="Visualização em Lista (Padrão)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'list' ? 'var(--adm-bg-card)' : 'transparent',
                color: viewMode === 'list' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                boxShadow: viewMode === 'list' ? '0 1px 4px rgba(0, 0, 0, 0.12)' : 'none',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <List size={14} />
              <span>Lista</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('card')}
              title="Visualização em Cards"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'card' ? 'var(--adm-bg-card)' : 'transparent',
                color: viewMode === 'card' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                boxShadow: viewMode === 'card' ? '0 1px 4px rgba(0, 0, 0, 0.12)' : 'none',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <LayoutGrid size={14} />
              <span>Cards</span>
            </button>
          </div>
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
      ) : sortedCollaborators.length === 0 ? (
        <div style={{
          background: 'var(--adm-bg-card)',
          border: '1px dashed var(--adm-border)',
          borderRadius: '16px',
          padding: '36px 20px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
        }}>
          <Search size={24} color="var(--adm-text-muted)" />
          <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
            Nenhum colaborador encontrado
          </h4>
          <p style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', margin: 0 }}>
            Tente buscar com outro termo ou limpe o campo de busca.
          </p>
        </div>
      ) : viewMode === 'list' ? (
        /* MODO LISTA PRIMÁRIO (Tabela elegante) */
        <div className="saas-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--adm-border)', borderRadius: '16px' }}>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '920px' }}>
              <thead>
                <tr style={{ background: 'var(--adm-bg-input)', borderBottom: '1px solid var(--adm-border)' }}>
                  <th style={{ padding: '14px 18px', fontSize: '0.70rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Colaborador & Função
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: '0.70rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Cargo Corporativo
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: '0.70rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Setores / Acesso
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: '0.70rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Unidade(s)
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: '0.70rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                    Leads & Tarefas
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: '0.70rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Status
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '0.70rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedCollaborators.map(collab => {
                  const venue = venues.find(v => v.id === collab.venueId);
                  const venueName = collab.venueId === 'all' ? 'Todas as Unidades (Rede)' : (venue?.name || 'Unidade Especificada');
                  const isSelf = collab.id === currentUser?.id || (currentUser?.email && collab.email.toLowerCase() === currentUser.email.toLowerCase());
                  const isMasterRole = collab.role === 'master';
                  const isManagerRole = isMasterRole || collab.role === 'admin' || collab.role === 'gerencia';
                  const isTargetManagerOrAbove = collab.role === 'admin' || collab.role === 'master' || collab.role === 'gerencia';
                  const canToggle = !isSelf && !isMasterRole && (!isCurrentUserManager || !isTargetManagerOrAbove);
                  const canEdit = !isSelf && (!isCurrentUserManager || !isTargetManagerOrAbove);
                  const canDelete = !isSelf && collab.role !== 'master' && (!isCurrentUserManager || !isTargetManagerOrAbove);
                  const collabLeads = getCollabLeads(collab);
                  const collabTasks = getCollabTasks(collab);
                  const collabSectors = getCollabSectors(collab);
                  const roleBadge = getRoleBadge(collab.role);
                  const roleTitle = getCollabRoleTitle(collab);
                  const isPending = isPendingFirstAccess(collab);

                  return (
                    <tr
                      key={collab.id}
                      style={{
                        borderBottom: '1px solid var(--adm-border)',
                        opacity: collab.active ? 1 : 0.65,
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--adm-bg-input)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {/* 1. Colaborador: Foto, Nome e Função abaixo */}
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img
                            src={(collab.avatarUrl && !collab.avatarUrl.includes('unsplash.com')) ? collab.avatarUrl : createMonogramAvatar(collab.name)}
                            alt={collab.name}
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: `1.5px solid ${collab.active ? (isMasterRole ? 'var(--adm-gold, #D4AF37)' : 'var(--adm-accent)') : 'rgba(100, 116, 139, 0.4)'}`,
                              flexShrink: 0,
                            }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div style={{
                              fontSize: '0.88rem',
                              fontWeight: 800,
                              color: 'var(--adm-text-title)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}>
                              {collab.name}
                            </div>
                            <div style={{
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              color: isMasterRole ? 'var(--adm-gold, #D4AF37)' : 'var(--adm-text-muted)',
                              marginTop: '1px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}>
                              {roleTitle || 'Cargo não informado'}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{collab.email}</span>
                              {collab.phone && <span>• {formatPhone(collab.phone)}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Cargo Corporativo */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '8px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          background: roleBadge.bg,
                          color: roleBadge.color,
                          border: `1px solid ${roleBadge.color}35`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap',
                        }}>
                          {isMasterRole && <ShieldCheck size={12} />}
                          {roleBadge.label}
                        </span>
                      </td>

                      {/* 3. Setores */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                          {isManagerRole ? (
                            <span style={{
                              background: 'rgba(212, 175, 55, 0.12)',
                              color: 'var(--adm-gold, #D4AF37)',
                              border: '1px solid rgba(212, 175, 55, 0.35)',
                              borderRadius: '6px',
                              padding: '2px 7px',
                              fontSize: '0.66rem',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}>
                              <ShieldCheck size={11} />
                              Gerência
                            </span>
                          ) : (
                            <>
                              {collabSectors.includes('comercial') && (
                                <span style={{
                                  background: 'rgba(20, 169, 215, 0.12)',
                                  color: '#14A9D7',
                                  border: '1px solid rgba(20, 169, 215, 0.35)',
                                  borderRadius: '6px',
                                  padding: '2px 7px',
                                  fontSize: '0.66rem',
                                  fontWeight: 800,
                                }}>
                                  Comercial
                                </span>
                              )}
                              {collabSectors.includes('pos_venda') && (
                                <span style={{
                                  background: 'rgba(6, 182, 212, 0.12)',
                                  color: '#06B6D4',
                                  border: '1px solid rgba(6, 182, 212, 0.35)',
                                  borderRadius: '6px',
                                  padding: '2px 7px',
                                  fontSize: '0.66rem',
                                  fontWeight: 800,
                                }}>
                                  Pós-Venda
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>

                      {/* 4. Unidades */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: 'var(--adm-text-title)' }}>
                          <Building2 size={13} color="var(--adm-accent)" style={{ flexShrink: 0 }} />
                          <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {venueName}
                          </span>
                        </div>
                      </td>

                      {/* 5. Leads & Tarefas */}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenSuperManagement(collab, 'leads')}
                            title="Ver leads vinculados"
                            style={{
                              padding: '4px 8px',
                              borderRadius: '8px',
                              background: 'rgba(20, 169, 215, 0.1)',
                              border: '1px solid rgba(20, 169, 215, 0.25)',
                              color: 'var(--adm-accent)',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Target size={12} />
                            <span>{collabLeads.length}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenSuperManagement(collab, 'tasks')}
                            title="Ver tarefas vinculadas"
                            style={{
                              padding: '4px 8px',
                              borderRadius: '8px',
                              background: 'rgba(139, 92, 246, 0.1)',
                              border: '1px solid rgba(139, 92, 246, 0.25)',
                              color: '#8B5CF6',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <CheckSquare size={12} />
                            <span>{collabTasks.length}</span>
                          </button>
                        </div>
                      </td>

                      {/* 6. Status */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {canToggle ? (
                            <button
                              type="button"
                              onClick={() => updateCollaborator(collab.id, { active: !collab.active })}
                              title={collab.active ? 'Ativo • Clique para desativar' : 'Inativo • Clique para reativar'}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '8px',
                                background: collab.active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                                border: `1.5px solid ${collab.active ? 'rgba(16, 185, 129, 0.5)' : 'rgba(100, 116, 139, 0.35)'}`,
                                color: collab.active ? '#10B981' : '#64748B',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                            >
                              <Power size={13} />
                            </button>
                          ) : (
                            <span style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: collab.active ? '#10B981' : '#64748B',
                              display: 'inline-block',
                            }} />
                          )}
                          <div>
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: collab.active ? '#10B981' : '#64748B',
                            }}>
                              {collab.active ? 'Ativo' : 'Inativo'}
                            </span>
                            {isPending && (
                              <span style={{ display: 'block', fontSize: '0.62rem', color: '#F59E0B', fontWeight: 700 }}>
                                Convite Pendente
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 7. Ações */}
                      <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {isPending && (
                            <button
                              type="button"
                              onClick={() => setCollabForInviteModal(collab)}
                              title="Link de Acesso"
                              style={{
                                padding: '5px 8px',
                                borderRadius: '7px',
                                background: 'rgba(245, 158, 11, 0.12)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                color: '#F59E0B',
                                fontSize: '0.70rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <KeyRound size={12} />
                              <span>Link</span>
                            </button>
                          )}

                          {(isSelf || isMasterRole) ? (
                            <button
                              type="button"
                              onClick={handleOpenMasterProfile}
                              title="Editar Meu Perfil"
                              style={{
                                padding: '5px 10px',
                                borderRadius: '7px',
                                background: 'rgba(212, 175, 55, 0.12)',
                                border: '1px solid rgba(212, 175, 55, 0.35)',
                                color: 'var(--adm-gold, #D4AF37)',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <UserCheck size={12} />
                              <span>Meu Perfil</span>
                            </button>
                          ) : canEdit ? (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(collab)}
                              title="Editar Colaborador"
                              style={{
                                padding: '5px 8px',
                                borderRadius: '7px',
                                background: 'var(--adm-bg-input)',
                                border: '1px solid var(--adm-border)',
                                color: 'var(--adm-text-title)',
                                fontSize: '0.72rem',
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
                          ) : null}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleOpenDelete(collab)}
                              title="Remover Colaborador"
                              style={{
                                padding: '5px 8px',
                                borderRadius: '7px',
                                background: 'rgba(239, 68, 68, 0.08)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                color: 'var(--adm-red)',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* MODO CARDS */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '18px',
        }}>
          {sortedCollaborators.map(collab => {
          const venue = venues.find(v => v.id === collab.venueId);
          const venueName = collab.venueId === 'all' ? 'Todas as Unidades (Rede)' : (venue?.name || 'Unidade Especificada');
          const isSelf = collab.id === currentUser?.id || (currentUser?.email && collab.email.toLowerCase() === currentUser.email.toLowerCase());
          const isMasterRole = collab.role === 'master';
          const isManagerRole = isMasterRole || collab.role === 'admin' || collab.role === 'gerencia';
          const isTargetManagerOrAbove = collab.role === 'admin' || collab.role === 'master' || collab.role === 'gerencia';
          const canToggle = !isSelf && !isMasterRole && (!isCurrentUserManager || !isTargetManagerOrAbove);
          const canEdit = !isSelf && (!isCurrentUserManager || !isTargetManagerOrAbove);
          const canDelete = !isSelf && collab.role !== 'master' && (!isCurrentUserManager || !isTargetManagerOrAbove);
          const collabLeads = getCollabLeads(collab);
          const collabTasks = getCollabTasks(collab);
          const collabSectors = getCollabSectors(collab);

          return (
            <div
              key={collab.id}
              className="saas-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                opacity: collab.active ? 1 : 0.65,
                filter: collab.active ? 'none' : 'grayscale(100%)',
                transition: 'all 0.25s ease',
              }}
            >
              {/* Profile Row: Foto + Nome + Cargo Pré-definido */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <img
                    src={(collab.avatarUrl && !collab.avatarUrl.includes('unsplash.com')) ? collab.avatarUrl : createMonogramAvatar(collab.name)}
                    alt={collab.name}
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: `1.5px solid ${collab.active ? (isMasterRole ? 'var(--adm-gold, #D4AF37)' : 'var(--adm-accent)') : 'rgba(100, 116, 139, 0.4)'}`,
                      filter: collab.active ? 'none' : 'grayscale(100%)',
                      transition: 'all 0.2s ease',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{
                      fontSize: '0.96rem',
                      fontWeight: 800,
                      color: 'var(--adm-text-title)',
                      margin: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {collab.name}
                    </h3>
                    {/* Cargo Personalizado cadastrado na empresa (Audio 1) */}
                    {getCollabRoleTitle(collab) ? (
                      <div style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: isMasterRole ? 'var(--adm-gold, #D4AF37)' : 'var(--adm-text-title)',
                        marginTop: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {getCollabRoleTitle(collab)}
                      </div>
                    ) : (
                      <div style={{
                        fontSize: '0.70rem',
                        fontWeight: 500,
                        color: 'var(--adm-text-muted)',
                        fontStyle: 'italic',
                        marginTop: '2px',
                      }}>
                        Cargo não informado
                      </div>
                    )}
                  </div>
                </div>

                {/* Botão de Power Liga/Desliga */}
                {canToggle && (
                  <button
                    type="button"
                    onClick={() => updateCollaborator(collab.id, { active: !collab.active })}
                    title={collab.active ? 'Colaborador Ativo • Clique para desativar' : 'Colaborador Desativado • Clique para reativar'}
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      background: collab.active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                      border: `1.5px solid ${collab.active ? 'rgba(16, 185, 129, 0.5)' : 'rgba(100, 116, 139, 0.35)'}`,
                      color: collab.active ? '#10B981' : '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: collab.active ? '0 0 10px rgba(16, 185, 129, 0.25)' : 'none',
                      flexShrink: 0,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    <Power size={17} />
                  </button>
                )}
              </div>

              {/* Status de Ativação / Primeiro Acesso */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                padding: '7px 12px',
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {collab.active && isPendingFirstAccess(collab) && collab.role !== 'master' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setCollabForInviteModal(collab)}
                        title="Copiar Link de Entrada ou enviar diretamente no WhatsApp do colaborador"
                        style={{
                          background: 'rgba(212, 175, 55, 0.14)',
                          border: '1px solid rgba(212, 175, 55, 0.4)',
                          color: 'var(--adm-gold, #D4AF37)',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(212, 175, 55, 0.25)';
                          e.currentTarget.style.borderColor = 'var(--adm-gold, #D4AF37)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'rgba(212, 175, 55, 0.14)';
                          e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.4)';
                        }}
                      >
                        <KeyRound size={11} />
                        <span>Link de Entrada</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendInviteEmail(collab)}
                        disabled={sendingInviteEmail === collab.email}
                        title="Disparar e-mail de convite oficial com instruções de 1º acesso"
                        style={{
                          background: 'rgba(20, 169, 215, 0.12)',
                          border: '1px solid rgba(20, 169, 215, 0.3)',
                          color: '#14A9D7',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          cursor: sendingInviteEmail === collab.email ? 'wait' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {inviteSentEmail === collab.email ? (
                          <>
                            <Check size={11} color="#10B981" />
                            <span style={{ color: '#10B981' }}>Enviado!</span>
                          </>
                        ) : (
                          <>
                            <Mail size={11} />
                            <span>{sendingInviteEmail === collab.email ? '...' : 'E-mail'}</span>
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Details: E-mail, Telefone, Casa e Último Acesso */}
              <div style={{
                background: 'var(--adm-bg-input)',
                borderRadius: '12px',
                padding: '11px 13px',
                display: 'flex',
                flexDirection: 'column',
                gap: '7px',
                fontSize: '0.75rem',
                color: 'var(--adm-text-muted)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={13} color="var(--adm-accent)" style={{ flexShrink: 0 }} />
                  <span style={{ color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{collab.email}</span>
                </div>

                {collab.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Phone size={13} color="var(--adm-accent)" style={{ flexShrink: 0 }} />
                    <span>{formatPhone(collab.phone)}</span>
                  </div>
                )}

                {/* Casa / Unidade (Audio 1: Master é soberano de tudo) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isMasterRole ? (
                    <>
                      <ShieldCheck size={13} color="var(--adm-gold, #D4AF37)" style={{ flexShrink: 0 }} />
                      <span style={{ color: 'var(--adm-gold, #D4AF37)', fontWeight: 700 }}>
                        Acesso Master (Todas as Unidades da Rede)
                      </span>
                    </>
                  ) : (
                    <>
                      <Building2 size={13} color="var(--adm-accent)" style={{ flexShrink: 0 }} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{venueName}</span>
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px dashed var(--adm-border)', paddingTop: '6px', marginTop: '2px' }}>
                  <Clock size={13} color={isPendingFirstAccess(collab) ? '#F59E0B' : '#10B981'} style={{ flexShrink: 0 }} />
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

              {/* Tags de Setores Vinculados (Audio 1: Posicionado mais abaixo) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', fontWeight: 600, marginRight: '2px' }}>
                  Setores:
                </span>
                {isManagerRole ? (
                  <span style={{
                    background: 'rgba(212, 175, 55, 0.12)',
                    color: 'var(--adm-gold, #D4AF37)',
                    border: '1px solid rgba(212, 175, 55, 0.35)',
                    borderRadius: '8px',
                    padding: '2px 8px',
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    <ShieldCheck size={11} />
                    Gerência (Acesso Global)
                  </span>
                ) : (
                  <>
                    {collabSectors.includes('comercial') && (
                      <span style={{
                        background: 'rgba(20, 169, 215, 0.12)',
                        color: '#14A9D7',
                        border: '1px solid rgba(20, 169, 215, 0.35)',
                        borderRadius: '8px',
                        padding: '2px 8px',
                        fontSize: '0.66rem',
                        fontWeight: 800,
                      }}>
                        Comercial
                      </span>
                    )}
                    {collabSectors.includes('pos_venda') && (
                      <span style={{
                        background: 'rgba(6, 182, 212, 0.12)',
                        color: '#06B6D4',
                        border: '1px solid rgba(6, 182, 212, 0.35)',
                        borderRadius: '8px',
                        padding: '2px 8px',
                        fontSize: '0.66rem',
                        fontWeight: 800,
                      }}>
                        Pós-Venda
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Mini Faixa de Super Gestão: Leads e Tarefas Vinculadas (Audio 1) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                marginTop: '2px',
              }}>
                <div 
                  onClick={() => handleOpenSuperManagement(collab, 'leads')}
                  style={{
                    padding: '7px 10px',
                    borderRadius: '10px',
                    background: 'rgba(20, 169, 215, 0.08)',
                    border: '1px solid rgba(20, 169, 215, 0.22)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="Clique para ver e remanejar os leads deste colaborador"
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--adm-accent)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(20, 169, 215, 0.22)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Target size={13} color="var(--adm-accent)" />
                    <span style={{ fontSize: '0.70rem', color: 'var(--adm-text-muted)', fontWeight: 600 }}>Leads</span>
                  </div>
                  <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                    {collabLeads.length}
                  </span>
                </div>

                <div 
                  onClick={() => handleOpenSuperManagement(collab, 'tasks')}
                  style={{
                    padding: '7px 10px',
                    borderRadius: '10px',
                    background: 'rgba(139, 92, 246, 0.08)',
                    border: '1px solid rgba(139, 92, 246, 0.22)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="Clique para ver as tarefas vinculadas a este colaborador"
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#A78BFA'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.22)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckSquare size={13} color="#A78BFA" />
                    <span style={{ fontSize: '0.70rem', color: 'var(--adm-text-muted)', fontWeight: 600 }}>Tarefas</span>
                  </div>
                  <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                    {collabTasks.length}
                  </span>
                </div>
              </div>

              {/* Actions Row: Super Gestão / Editar / Remover / Perfil Master */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid var(--adm-border)',
                paddingTop: '11px',
                gap: '8px',
              }}>
                {collab.isDev ? (
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: '#14A9D7',
                    background: 'rgba(20, 169, 215, 0.12)',
                    padding: '5px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(20, 169, 215, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}>
                    <Shield size={12} />
                    <span>Conta Desenvolvedor</span>
                  </span>
                ) : (isSelf || isMasterRole) ? (
                  <button
                    type="button"
                    onClick={handleOpenMasterProfile}
                    style={{
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      color: 'var(--adm-gold, #D4AF37)',
                      background: 'rgba(212, 175, 55, 0.12)',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: '1px solid rgba(212, 175, 55, 0.35)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(212, 175, 55, 0.22)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(212, 175, 55, 0.12)'; }}
                    title="Editar meus dados pessoais de login e contato"
                  >
                    <UserCheck size={14} />
                    <span>Editar Meu Perfil</span>
                  </button>
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenSuperManagement(collab)}
                      style={{
                        background: 'rgba(20, 169, 215, 0.12)',
                        border: '1px solid rgba(20, 169, 215, 0.35)',
                        color: '#14A9D7',
                        borderRadius: '10px',
                        padding: '6px 12px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease',
                      }}
                      title="Abrir Central de Super Gestão (Leads & Tarefas)"
                    >
                      <SlidersHorizontal size={13} />
                      <span>Super Gestão</span>
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(collab)}
                          style={{
                            background: 'var(--adm-bg-elevated)',
                            border: '1px solid var(--adm-border)',
                            color: 'var(--adm-text-title)',
                            borderRadius: '10px',
                            padding: '6px 12px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <Edit3 size={13} color="var(--adm-accent)" />
                          <span>Editar</span>
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
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
                    </div>
                  </div>
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

      {/* Modal de Edição de Perfil do Master (Audio 1) */}
      {isMasterProfileOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200,
          padding: '20px',
          animation: 'fadeIn 0.2s ease-out',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid rgba(212, 175, 55, 0.35)',
            borderRadius: '20px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            position: 'relative',
            boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
          }}>
            {/* Fechar */}
            <button
              type="button"
              onClick={() => setIsMasterProfileOpen(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'var(--adm-bg-elevated)',
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

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'rgba(212, 175, 55, 0.15)',
                border: '1px solid rgba(212, 175, 55, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--adm-gold)',
              }}>
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                  Meu Perfil Master
                </h3>
                <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--adm-text-muted)' }}>
                  Diretoria & Gestão Geral da Rede
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveMasterProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              {/* Foto de Perfil */}
              <ImageUploadField
                label="Sua Foto de Perfil"
                value={masterFormAvatarUrl}
                onChange={(url) => setMasterFormAvatarUrl(url)}
                folder="avatars"
                aspectRatio="1:1"
                previewHeight="80px"
                placeholder="Subir foto de perfil"
              />

              {/* Nome */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-title)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                  Nome Completo *
                </label>
                <div style={{ position: 'relative' }}>
                  <UserCheck size={16} color="var(--adm-accent)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type="text"
                    required
                    value={masterFormName}
                    onChange={(e) => setMasterFormName(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '10px',
                      padding: '10px 14px 10px 38px',
                      color: 'var(--adm-text-title)',
                      fontSize: '0.84rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* E-mail e Telefone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-title)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                    E-mail de Acesso *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} color="var(--adm-accent)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                    <input
                      type="email"
                      required
                      value={masterFormEmail}
                      onChange={(e) => setMasterFormEmail(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'var(--adm-bg-input)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '10px',
                        padding: '10px 14px 10px 38px',
                        color: 'var(--adm-text-title)',
                        fontSize: '0.84rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-title)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                    WhatsApp
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={16} color="var(--adm-accent)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                    <input
                      type="tel"
                      value={masterFormPhone}
                      onChange={(e) => setMasterFormPhone(maskPhoneInput(e.target.value))}
                      placeholder="(21) 99999-9999"
                      style={{
                        width: '100%',
                        background: 'var(--adm-bg-input)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '10px',
                        padding: '10px 14px 10px 38px',
                        color: 'var(--adm-text-title)',
                        fontSize: '0.84rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Senha */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-title)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                  Nova Senha de Acesso (Opcional)
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="var(--adm-accent)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type="password"
                    placeholder="Deixe em branco para manter a senha atual"
                    value={masterFormPassword}
                    onChange={(e) => setMasterFormPassword(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '10px',
                      padding: '10px 14px 10px 38px',
                      color: 'var(--adm-text-title)',
                      fontSize: '0.84rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Card de Aviso Soberano */}
              <div style={{
                padding: '12px 14px',
                borderRadius: '12px',
                background: 'rgba(212, 175, 55, 0.08)',
                border: '1px solid rgba(212, 175, 55, 0.25)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                fontSize: '0.75rem',
                color: 'var(--adm-gold)',
                lineHeight: 1.45,
              }}>
                <Shield size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  <strong>Acesso Master Soberano:</strong> Seu perfil possui permissão total e irrestrita a todas as casas de festas, funis, leads e setores do F5 System.
                </span>
              </div>

              {/* Ações */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsMasterProfileOpen(false)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '10px',
                    border: '1px solid var(--adm-border)',
                    background: 'transparent',
                    color: 'var(--adm-text-title)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingMasterProfile}
                  style={{
                    padding: '9px 22px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, var(--adm-gold) 0%, #b8860b 100%)',
                    color: '#000',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)',
                    opacity: isSavingMasterProfile ? 0.7 : 1,
                  }}
                >
                  {isSavingMasterProfile ? 'Salvando...' : 'Salvar Perfil'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal da Central de Super Gestão do Colaborador (Audio 1) */}
      {collabForManagement && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200,
          padding: '20px',
          animation: 'fadeIn 0.2s ease-out',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '20px',
            maxWidth: '860px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
          }}>
            {/* Header com dados do Colaborador */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--adm-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--adm-bg-input)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <img
                  src={(collabForManagement.avatarUrl && !collabForManagement.avatarUrl.includes('unsplash.com')) ? collabForManagement.avatarUrl : createMonogramAvatar(collabForManagement.name)}
                  alt={collabForManagement.name}
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--adm-accent)' }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                      {collabForManagement.name}
                    </h3>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: 'var(--adm-accent-bg)',
                      color: 'var(--adm-accent)',
                      border: '1px solid var(--adm-border)',
                    }}>
                      {getCollabRoleTitle(collabForManagement)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '0.76rem', color: 'var(--adm-text-muted)' }}>
                    <span>{collabForManagement.email}</span>
                    {collabForManagement.phone && <span>• {formatPhone(collabForManagement.phone)}</span>}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCollabForManagement(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--adm-text-muted)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '8px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Abas */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid var(--adm-border)',
              background: 'var(--adm-bg-card)',
              padding: '0 24px',
              gap: '12px',
            }}>
              <button
                type="button"
                onClick={() => setManagementTab('leads')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 16px',
                  border: 'none',
                  background: 'transparent',
                  borderBottom: managementTab === 'leads' ? '2px solid var(--adm-accent)' : '2px solid transparent',
                  color: managementTab === 'leads' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                  fontWeight: managementTab === 'leads' ? 800 : 600,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                <Target size={16} />
                <span>Leads Atribuídos</span>
                <span style={{
                  padding: '1px 7px',
                  borderRadius: '10px',
                  background: managementTab === 'leads' ? 'var(--adm-accent-bg)' : 'var(--adm-bg-input)',
                  fontSize: '0.72rem',
                }}>
                  {collabManagementLeads.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setManagementTab('tasks')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 16px',
                  border: 'none',
                  background: 'transparent',
                  borderBottom: managementTab === 'tasks' ? '2px solid var(--adm-accent)' : '2px solid transparent',
                  color: managementTab === 'tasks' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                  fontWeight: managementTab === 'tasks' ? 800 : 600,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                <CheckSquare size={16} />
                <span>Tarefas Vinculadas</span>
                <span style={{
                  padding: '1px 7px',
                  borderRadius: '10px',
                  background: managementTab === 'tasks' ? 'var(--adm-accent-bg)' : 'var(--adm-bg-input)',
                  fontSize: '0.72rem',
                }}>
                  {collabManagementTasks.length}
                </span>
              </button>
            </div>

            {/* Conteúdo das Abas */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {managementTab === 'leads' ? (
                <>
                  {/* Feedback de Transferência Sucesso */}
                  {transferSuccessMessage && (
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '0.82rem',
                      color: '#10B981',
                      fontWeight: 700,
                    }}>
                      <CheckCircle2 size={18} />
                      <span>{transferSuccessMessage}</span>
                    </div>
                  )}

                  {/* Barra de Pesquisa e Filtros */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                      <Search size={15} color="var(--adm-text-muted)" style={{ position: 'absolute', left: '12px', top: '11px' }} />
                      <input
                        type="text"
                        placeholder="Buscar por nome, telefone, código ou origem..."
                        value={managementSearchQuery}
                        onChange={(e) => setManagementSearchQuery(e.target.value)}
                        style={{
                          width: '100%',
                          background: 'var(--adm-bg-input)',
                          border: '1px solid var(--adm-border)',
                          borderRadius: '10px',
                          padding: '8px 12px 8px 36px',
                          color: 'var(--adm-text-title)',
                          fontSize: '0.8rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    {filteredManagementLeads.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedLeadIdsForTransfer.length === filteredManagementLeads.length) {
                              setSelectedLeadIdsForTransfer([]);
                            } else {
                              setSelectedLeadIdsForTransfer(filteredManagementLeads.map(l => l.id));
                            }
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--adm-border)',
                            background: 'var(--adm-bg-elevated)',
                            color: 'var(--adm-text-title)',
                            fontSize: '0.76rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {selectedLeadIdsForTransfer.length === filteredManagementLeads.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                        </button>
                        <span style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
                          {selectedLeadIdsForTransfer.length} selecionado(s)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Banner de Ação em Lote (Transferência) */}
                  {selectedLeadIdsForTransfer.length > 0 && (
                    <div style={{
                      padding: '16px',
                      borderRadius: '14px',
                      background: 'rgba(20, 169, 215, 0.08)',
                      border: '1px solid rgba(20, 169, 215, 0.35)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--adm-accent)', fontSize: '0.82rem', fontWeight: 800 }}>
                        <ArrowRightLeft size={16} />
                        <span>Remanejar {selectedLeadIdsForTransfer.length} lead(s) selecionado(s)</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr auto', gap: '10px', alignItems: 'center' }}>
                        {/* Seletor de Colaborador */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                            Novo Responsável
                          </label>
                          <select
                            value={transferTargetCollabId}
                            onChange={(e) => setTransferTargetCollabId(e.target.value)}
                            style={{
                              width: '100%',
                              background: 'var(--adm-bg-card)',
                              border: '1px solid var(--adm-border)',
                              borderRadius: '8px',
                              padding: '8px 10px',
                              color: 'var(--adm-text-title)',
                              fontSize: '0.8rem',
                              outline: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            <option value="">Selecione o colaborador...</option>
                            {collaborators
                              .filter(c => c.id !== collabForManagement.id && c.active && c.role !== 'dev')
                              .map(c => (
                                <option key={c.id} value={c.id}>
                                  {c.name} ({getCollabRoleTitle(c)})
                                </option>
                              ))}
                          </select>
                        </div>

                        {/* Seletor de Papel */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                            Atribuir Como
                          </label>
                          <select
                            value={transferRoleMode}
                            onChange={(e) => setTransferRoleMode(e.target.value as any)}
                            style={{
                              width: '100%',
                              background: 'var(--adm-bg-card)',
                              border: '1px solid var(--adm-border)',
                              borderRadius: '8px',
                              padding: '8px 10px',
                              color: 'var(--adm-text-title)',
                              fontSize: '0.8rem',
                              outline: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            <option value="all">Responsabilidade Completa (SDR + Closer)</option>
                            <option value="sdr">Apenas SDR / Pré-Vendas</option>
                            <option value="closer">Apenas Closer / Vendas</option>
                          </select>
                        </div>

                        {/* Botão de Transferência */}
                        <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%' }}>
                          <button
                            type="button"
                            onClick={handleExecuteLeadTransfer}
                            disabled={isTransferringLeads || !transferTargetCollabId}
                            style={{
                              padding: '9px 18px',
                              borderRadius: '8px',
                              border: 'none',
                              background: 'var(--adm-accent)',
                              color: '#fff',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              opacity: (isTransferringLeads || !transferTargetCollabId) ? 0.6 : 1,
                            }}
                          >
                            <ArrowRightLeft size={14} />
                            <span>{isTransferringLeads ? 'Transferindo...' : 'Transferir Agora'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Lista de Leads */}
                  {filteredManagementLeads.length === 0 ? (
                    <div style={{
                      padding: '36px 20px',
                      textAlign: 'center',
                      borderRadius: '12px',
                      background: 'var(--adm-bg-input)',
                      border: '1px dashed var(--adm-border)',
                      color: 'var(--adm-text-muted)',
                      fontSize: '0.84rem',
                    }}>
                      Nenhum lead encontrado para este colaborador.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {filteredManagementLeads.map((l) => {
                        const isChecked = selectedLeadIdsForTransfer.includes(l.id);
                        const isSdr = l.sdrId === collabForManagement.id || (collabForManagement.name && l.sdrName === collabForManagement.name);
                        const isCloser = l.closerId === collabForManagement.id || (collabForManagement.name && l.closerName === collabForManagement.name);

                        return (
                          <div
                            key={l.id}
                            onClick={() => {
                              setSelectedLeadIdsForTransfer(prev => 
                                prev.includes(l.id) ? prev.filter(id => id !== l.id) : [...prev, l.id]
                              );
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 14px',
                              borderRadius: '12px',
                              background: isChecked ? 'rgba(20, 169, 215, 0.08)' : 'var(--adm-bg-input)',
                              border: `1px solid ${isChecked ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}} // controlado pelo onClick da div
                                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--adm-accent)' }}
                              />
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                                    {l.name}
                                  </span>
                                  {l.code && (
                                    <span style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', background: 'var(--adm-bg-card)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--adm-border)' }}>
                                      {l.code}
                                    </span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '3px', fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
                                  {l.phone && <span>{formatPhone(l.phone)}</span>}
                                  {l.sourceName && <span>• {l.sourceName}</span>}
                                  {l.venueId && (
                                    <span>
                                      • {venues.find(v => v.id === l.venueId)?.name || 'Unidade'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                background: 'var(--adm-bg-card)',
                                border: '1px solid var(--adm-border)',
                                color: 'var(--adm-text-title)',
                              }}>
                                {isSdr && isCloser ? 'SDR & Closer' : isSdr ? 'SDR (Pré-Vendas)' : isCloser ? 'Closer (Vendas)' : 'Responsável'}
                              </span>
                              {l.stage && (
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  background: 'rgba(20, 169, 215, 0.12)',
                                  color: 'var(--adm-accent)',
                                }}>
                                  {l.stage}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                /* Aba de Tarefas */
                <>
                  {collabManagementTasks.length === 0 ? (
                    <div style={{
                      padding: '36px 20px',
                      textAlign: 'center',
                      borderRadius: '12px',
                      background: 'var(--adm-bg-input)',
                      border: '1px dashed var(--adm-border)',
                      color: 'var(--adm-text-muted)',
                      fontSize: '0.84rem',
                    }}>
                      Nenhuma tarefa vinculada a este colaborador.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {collabManagementTasks.map((t) => {
                        const isDone = t.status === 'completed';
                        return (
                          <div
                            key={t.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 14px',
                              borderRadius: '12px',
                              background: 'var(--adm-bg-input)',
                              border: '1px solid var(--adm-border)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '8px',
                                background: isDone ? 'rgba(16, 185, 129, 0.12)' : 'rgba(20, 169, 215, 0.12)',
                                color: isDone ? '#10B981' : 'var(--adm-accent)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}>
                                {isDone ? <Check size={14} /> : <Clock size={14} />}
                              </div>
                              <div>
                                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--adm-text-title)', textDecoration: isDone ? 'line-through' : 'none' }}>
                                  {t.title}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
                                  {t.dueDate && <span>Vence em: {t.dueDate}</span>}
                                  {t.priority && <span>• Prioridade: {t.priority}</span>}
                                </div>
                              </div>
                            </div>

                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: isDone ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                              color: isDone ? '#10B981' : '#F59E0B',
                            }}>
                              {isDone ? 'Concluída' : 'Pendente'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--adm-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              background: 'var(--adm-bg-input)',
            }}>
              <button
                type="button"
                onClick={() => setCollabForManagement(null)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '10px',
                  border: '1px solid var(--adm-border)',
                  background: 'var(--adm-bg-card)',
                  color: 'var(--adm-text-title)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Concluir & Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Compartilhamento / Link de Entrada do Colaborador */}
      {collabForInviteModal && (
        <AdminCollabInviteModal
          isOpen={Boolean(collabForInviteModal)}
          collaborator={collabForInviteModal}
          isNewUser={Boolean(collabForInviteModal.isFirstAccess)}
          onClose={() => setCollabForInviteModal(null)}
        />
      )}
    </div>
  );
};
