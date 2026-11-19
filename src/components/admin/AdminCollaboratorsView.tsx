import { Select } from '../ui';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { HeaderActions } from './HeaderActions';
import { 
  Building2, 
  Mail, Phone, Trash2, 
  UserPlus, ShieldCheck,
  CheckCircle2, Clock, Check, ArrowLeft,
  UserX, AlertTriangle, CheckSquare, Target, X,
  Lock, UserCheck, Shield,
  ArrowRightLeft, Search
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { ImageUploadField } from './ImageUploadField';
import { createMonogramAvatar } from '../../utils/avatarUtils';
import { formatPhone, maskPhoneInput } from '../../utils/phoneFormatter';
import { AdminCollabInviteModal } from './AdminCollabInviteModal';
import type { Collaborator, AdminRole, LeadActivity, Lead } from '../../types/admin';
import type { AdminTabType } from './AdminSidebar';
import { GOALS_COLLAB_KEY } from './AdminVenueGoalsView';
import { JOB_ROLE_OPTIONS, JOB_SECTORS, jobRoleLabel, slugifyRole, type CustomJobRole, type JobSector } from '../../utils/jobRoles';
import { jobRoleService } from '../../services/jobRoleService';
import { useJobRoleCatalog } from '../../hooks/useJobRoleCatalog';
import { AdminJobRolesModal } from './AdminJobRolesModal';
import { toast } from 'sonner';
import { TeamDirectory } from './team/TeamDirectory';
import { useCollaboratorPresence } from '../../hooks/usePresence';
import { presenceService, type PresenceRow } from '../../services/presenceService';
import type { PresenceView } from './team/teamShared';
import { CollaboratorProfile } from './team/CollaboratorProfile';
import type { CollabPerms, TeamActions, TeamDataBundle } from './team/teamShared';
import { jobRoleLabels, resolveProfileKind, summarizeAssets } from '../../utils/collaboratorAssets';


const VIEW_LABEL: Record<string, string> = {
  home: 'no Início', tasks: 'na Central de Tarefas', dashboard: 'no Dashboard', crm: 'no Funil Comercial', contacts: 'em Contatos',
  leads: 'em Leads', contracts: 'em Contratos', followups: 'em Follow-ups', whatsapp: 'em Mensagens', 'quick-messages': 'em Mensagens Rápidas',
  'post-sale-crm': 'no Funil de Pós-Venda', 'post-sale-clients': 'em Clientes do Pós-Venda', sources: 'em Origens', 'venue-goals': 'em Metas',
  collaborators: 'em Colaboradores', calendar: 'na Agenda',
};

const describePresence = (r: PresenceRow): PresenceView => {
  const label = r.entityLabel ? r.entityLabel : '';
  let activity: string;
  if (r.entityType === 'lead' && label) activity = `atendendo o lead ${label}`;
  else if (r.entityType === 'client' && label) activity = `no contrato de ${label}`;
  else if (r.entityType === 'task' && label) activity = `na tarefa ${label}`;
  else if (r.entityType === 'appointment' && label) activity = `no compromisso ${label}`;
  else activity = r.view ? (VIEW_LABEL[r.view] || 'navegando no sistema') : 'online';
  return { online: Date.now() - r.lastSeenAt < presenceService.ONLINE_WINDOW_MS, activity, entityType: r.entityType, entityId: r.entityId || undefined };
};

interface AdminCollaboratorsViewProps {
  onNavigateTab?: (tab: AdminTabType) => void;
}

export const AdminCollaboratorsView: React.FC<AdminCollaboratorsViewProps> = ({ onNavigateTab }) => {
  const { 
    collaborators, 
    venues, 
    clients,
    appointments,
    funnels,
    deleteCollaborator, 
    addCollaborator,
    updateCollaborator,
    currentUser,
    leads,
    tasks,
    sendCollaboratorInvite,
    updateLeadData,
    showSystemAlert,
    featureFlags,
  } = useAdminState();

  const isCurrentUserManager = currentUser?.role === 'admin' || currentUser?.role === 'gerencia';

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [collaboratorToEdit, setCollaboratorToEdit] = useState<Collaborator | null>(null);
  const [collabToDelete, setCollabToDelete] = useState<Collaborator | null>(null);
  const [collabForInviteModal, setCollabForInviteModal] = useState<Collaborator | null>(null);

  const [sendingInviteEmail, setSendingInviteEmail] = useState<string | null>(null);
  const [inviteSentEmail, setInviteSentEmail] = useState<string | null>(null);

  // Modos de Exibição (Lista primária como padrão, Cards) e Ordenação (Audio 6)

  // Estados do Formulário em Área de Conteúdo
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCustomJobTitle, setFormCustomJobTitle] = useState('');
  const [formJobRoles, setFormJobRoles] = useState<string[]>([]);

  // Catalogo de cargos personalizados ("Outro"), por setor e por Master
  const masterId = currentUser?.masterId || currentUser?.id || '';
  const canManageRoles = currentUser?.role === 'master' || currentUser?.role === 'admin' || currentUser?.role === 'gerencia';
  const [customRoles, setCustomRoles] = useState<CustomJobRole[]>([]);
  const [isRolesModalOpen, setIsRolesModalOpen] = useState(false);
  const [profileCollabId, setProfileCollabId] = useState<string | null>(null);
  const [addingRoleSector, setAddingRoleSector] = useState<JobSector | null>(null);
  const [addingRoleName, setAddingRoleName] = useState('');
  const reloadRoles = useCallback(async () => { if (masterId) setCustomRoles(await jobRoleService.list(masterId)); }, [masterId]);
  useEffect(() => { void reloadRoles(); }, [reloadRoles]);
  const { aliases: roleAliases, titleOf: roleTitleOf, reload: reloadRoleCatalog } = useJobRoleCatalog(masterId || undefined);
  const setRoleAlias = async (roleId: string, name: string): Promise<boolean> => {
    const r = await jobRoleService.setLabel(masterId, roleId, name);
    if (r === 'ok') { await reloadRoleCatalog(); toast.success(name.trim() ? 'Nome de exibição atualizado.' : 'Nome padrão restaurado.'); return true; }
    toast.error(r === 'forbidden' ? 'Sem permissão para alterar os nomes dos cargos.' : r === 'missing_table' ? 'Recurso ainda não disponível neste banco.' : r === 'invalid' ? 'Use de 2 a 60 caracteres.' : 'Não foi possível salvar o nome.');
    return false;
  };

  const createRole = async (sector: JobSector, name: string): Promise<CustomJobRole | null> => {
    const res = await jobRoleService.create(masterId, sector, name, { id: currentUser?.id, name: currentUser?.name });
    if (!res.ok) {
      toast.error(
        res.reason === 'invalid' ? 'Digite um nome de cargo entre 2 e 60 letras.'
          : res.reason === 'missing_table' ? 'A tabela de cargos ainda não existe no banco. Aplique as migrations.'
            : res.reason === 'forbidden' ? 'O banco recusou a gravação (sessão expirada ou sem permissão). Saia do sistema e entre de novo.'
              : 'Não foi possível criar o cargo.',
      );
      return null;
    }
    await reloadRoles();
    return res.role;
  };

  const deleteRole = async (role: CustomJobRole) => {
    const holders = collaborators.filter(c => c.jobRoles?.includes(role.id));
    const msg = holders.length > 0
      ? `Excluir o cargo "${role.name}"? Ele será removido de ${holders.length} ${holders.length === 1 ? 'pessoa' : 'pessoas'}.`
      : `Excluir o cargo "${role.name}"?`;
    if (!window.confirm(msg)) return;
    if (!(await jobRoleService.remove(masterId, role.sector, role.slug))) { toast.error('Não foi possível excluir o cargo.'); return; }
    holders.forEach(c => updateCollaborator(c.id, { jobRoles: (c.jobRoles || []).filter(r => r !== role.id) }));
    setFormJobRoles(prev => prev.filter(r => r !== role.id));
    await reloadRoles();
    toast.success('Cargo excluído.');
  };

  const roleUsage = useMemo(() => {
    const out: Record<string, number> = {};
    collaborators.forEach(c => (c.jobRoles || []).forEach(r => { out[r] = (out[r] || 0) + 1; }));
    return out;
  }, [collaborators]);

  const rolesModal = isRolesModalOpen ? (
    <AdminJobRolesModal
      customRoles={customRoles} aliases={roleAliases} onSetAlias={setRoleAlias} usage={roleUsage} canEdit={canManageRoles}
      onCreate={async (sector, name) => Boolean(await createRole(sector, name))}
      onDelete={deleteRole}
      onClose={() => setIsRolesModalOpen(false)}
    />
  ) : null;
  const [formSectors, setFormSectors] = useState<('comercial' | 'pos_venda' | 'gerencia' | 'financeiro' | 'marketing')[]>(['comercial']);
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

  // Contratos, vendas adicionais e compromissos tambem sao reatribuidos ao excluir
  const affectedPostSale = useMemo(() => {
    if (!collabToDelete) return { contracts: 0, upsells: 0, appointments: 0 };
    return {
      contracts: clients.filter(c => c.assignedSuccessManagerId === collabToDelete.id).length,
      upsells: clients.reduce((n, c) => n + (c.upsellSales || []).filter(u => u.responsibleId === collabToDelete.id).length, 0),
      appointments: appointments.filter(a => a.responsibleCollaboratorId === collabToDelete.id).length,
    };
  }, [clients, appointments, collabToDelete]);
  const affectedOthers = affectedPostSale.contracts + affectedPostSale.upsells + affectedPostSale.appointments;



  const isPendingFirstAccess = (c: Collaborator): boolean => {
    if (c.role === 'master') return false;
    if (c.isFirstAccess === false) return false;
    if (c.activatedAt || c.lastLoginAt) return false;
    // Se já possui uma senha válida/real configurada no banco, o primeiro acesso já foi concluído
    if (c.password && c.password.trim().length >= 6 && !c.password.includes('••')) return false;
    return Boolean(c.isFirstAccess);
  };

  const handleOpenSuperManagement = (collab: Collaborator, tab: 'leads' | 'tasks' = 'leads') => {
    setCollabForManagement(collab);
    setManagementTab(tab);
    setManagementSearchQuery('');
    setSelectedLeadIdsForTransfer([]);
    setTransferSuccessMessage(null);
    const eligibleOthers = collaborators.filter(c => c.id !== collab.id && c.active && c.role !== 'dev');
    setTransferTargetCollabId(eligibleOthers[0]?.id || '');
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
    setFormJobRoles([]);
    setFormSectors(['comercial']);
    setFormSelectedVenueIds(venues.map(v => v.id));
    setFormAvatarUrl('');
    setFormActive(true);
    setIsFormOpen(true);
  };

  const handleOpenCreate = handleOpenAdd;

  // Atalho: abre Metas > Equipe ja com o modal de metas deste colaborador
  const openGoals = (collaboratorId: string) => {
    try { sessionStorage.setItem(GOALS_COLLAB_KEY, collaboratorId); } catch { /* sem sessionStorage */ }
    onNavigateTab?.('venue-goals');
  };

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
    setFormJobRoles(collab.jobRoles || []);
    const existingSectors: ('comercial' | 'pos_venda' | 'gerencia' | 'financeiro' | 'marketing')[] = collab.sectors && collab.sectors.length > 0
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

    const isAllVenuesSelected = venues.length > 0 && formSelectedVenueIds.length >= venues.length;
    const primaryVenueId = isAllVenuesSelected
      ? 'all'
      : (formSelectedVenueIds[0] || 'all');

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
      // Cargo so vale para setores marcados (acesso x cargo)
      jobRoles: formJobRoles.filter(r => formSectors.includes(r.split(':')[0] as JobSector)),
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
    const shownTitle = roleTitleOf(collab);
    if (shownTitle) return shownTitle;
    if (collab.role === 'master') return 'Diretoria Geral';
    if (collab.isDev || collab.role === 'dev') return 'Desenvolvedor';
    if (collab.role === 'admin') return 'Administrador';
    if (collab.role === 'gerencia') return 'Gerência Geral';
    if (collab.role === 'closer') return 'Closer (Fechamento)';
    if (collab.role === 'sdr') return 'SDR (Pré-Vendas)';
    if (collab.role === 'pos_venda') return 'Pós-Venda (Sucesso do Cliente)';
    return '';
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

  /* ───── Dados do Time (ativos em memoria, sem consulta nova ao banco) ───── */
  const todayISO = new Date().toISOString().slice(0, 10);
  const assetMap = useMemo(
    () => summarizeAssets({ leads, clients, tasks, appointments, funnels, todayISO }),
    [leads, clients, tasks, appointments, funnels, todayISO],
  );
  const kindMap = useMemo(() => {
    const m = new Map<string, ReturnType<typeof resolveProfileKind>>();
    collaborators.forEach(c => {
      const ids = Array.isArray(c.venueIds) && c.venueIds.length > 0 ? c.venueIds : (c.venueId && c.venueId !== 'all' ? [c.venueId] : venues.map(v => v.id));
      m.set(c.id, resolveProfileKind(c, funnels, ids));
    });
    return m;
  }, [collaborators, funnels, venues]);

  const permsOf = (c: Collaborator): CollabPerms => {
    const isSelf = Boolean(c.id === currentUser?.id || (currentUser?.email && c.email.toLowerCase() === currentUser.email.toLowerCase()));
    const isMaster = c.role === 'master';
    const targetManagerOrAbove = c.role === 'admin' || c.role === 'master' || c.role === 'gerencia';
    return {
      isSelf, isMaster, isPending: isPendingFirstAccess(c),
      canToggle: !isSelf && !isMaster && (!isCurrentUserManager || !targetManagerOrAbove),
      canEdit: !isSelf && (!isCurrentUserManager || !targetManagerOrAbove),
      canDelete: !isSelf && !isMaster && (!isCurrentUserManager || !targetManagerOrAbove),
    };
  };

  const teamData: TeamDataBundle = {
    venues,
    assets: assetMap,
    kindOf: c => kindMap.get(c.id) || 'outro',
    permsOf,
    jobLabelsOf: c => jobRoleLabels(c, customRoles, roleAliases),
    titleOf: c => roleTitleOf(c),
  };

  // Presenca ao vivo: so Master/Gerencia veem, so com a chave ligada, e so enquanto esta tela esta aberta
  const canSeePresence = (currentUser?.role === 'master' || currentUser?.role === 'admin' || currentUser?.role === 'gerencia')
    && featureFlags.team_presence !== 'disabled' && featureFlags.team_presence !== 'coming_soon';
  // So le a presenca quando o perfil de alguem esta aberto, e so mostra se a pessoa estiver online
  const presenceRow = useCollaboratorPresence({ enabled: canSeePresence && Boolean(profileCollabId), masterId: masterId || undefined, collaboratorId: profileCollabId });
  const profilePresence: PresenceView | undefined = presenceRow ? describePresence(presenceRow) : undefined;

  // Editor: alteracoes nao salvas e validacao inline
  const [editorBaseline, setEditorBaseline] = useState('');
  const editorSnapshot = JSON.stringify([formName, formEmail, formPhone, formCustomJobTitle, formJobRoles, formSectors, formSelectedVenueIds, formAvatarUrl, formActive]);
  useEffect(() => { if (isFormOpen) { const t = setTimeout(() => setEditorBaseline(editorSnapshot), 120); return () => clearTimeout(t); } setEditorBaseline(''); }, [isFormOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  const editorDirty = isFormOpen && editorBaseline !== '' && editorSnapshot !== editorBaseline;
  const nameError = formName.trim().length === 0 ? 'Informe o nome completo.' : '';
  const emailError = formEmail.trim().length === 0 ? 'Informe o e-mail.' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail.trim()) ? 'E-mail inválido.' : '';
  const venueError = formSelectedVenueIds.length === 0 ? 'Selecione ao menos uma unidade.' : '';
  const editorInvalid = Boolean(nameError || emailError);
  const closeEditor = () => {
    if (editorDirty && !window.confirm('Descartar as alterações não salvas?')) return;
    setIsFormOpen(false);
  };
  const scrollToSection = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const profileCollab = profileCollabId ? collaborators.find(x => x.id === profileCollabId) || null : null;

  const teamActions: TeamActions = {
    onOpen: c => setProfileCollabId(c.id),
    onEdit: handleOpenEdit,
    onToggleActive: c => updateCollaborator(c.id, { active: !c.active }),
    onDelete: handleOpenDelete,
    onGoals: c => openGoals(c.id),
    onTransfer: c => handleOpenSuperManagement(c),
    onInviteLink: c => setCollabForInviteModal(c),
    onInviteEmail: c => { void handleSendInviteEmail(c); },
    onOpenMasterProfile: () => handleOpenMasterProfile(),
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
        {/* Barra fixa: voltar, titulo, estado e salvar */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 30, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px',
          padding: '12px 16px', borderRadius: '14px', background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <button type="button" onClick={closeEditor} className="adm-btn adm-btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ArrowLeft size={16} /><span>Voltar</span>
            </button>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--adm-text-title)', letterSpacing: '-0.3px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {collaboratorToEdit ? `Editar: ${collaboratorToEdit.name}` : 'Novo colaborador'}
              </h1>
              <p style={{ fontSize: '0.72rem', color: editorDirty ? '#F59E0B' : 'var(--adm-text-muted)', margin: '2px 0 0 0', fontWeight: editorDirty ? 700 : 500 }}>
                {editorDirty ? 'Alterações não salvas' : 'Nenhuma alteração'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button type="button" onClick={closeEditor} className="adm-btn adm-btn-secondary">Cancelar</button>
            <button type="button" onClick={() => handleSaveCollaborator()} disabled={editorInvalid} className="adm-btn-primary"
              style={{ borderRadius: '12px', padding: '9px 22px', fontSize: '0.84rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', opacity: editorInvalid ? 0.5 : 1, cursor: editorInvalid ? 'not-allowed' : 'pointer' }}>
              <Check size={16} /><span>{collaboratorToEdit ? 'Salvar alterações' : 'Criar colaborador'}</span>
            </button>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <style>{`@media (max-width: 960px) { .team-editor-layout { grid-template-columns: minmax(0, 1fr) !important; } .team-editor-side { position: static !important; } }`}</style>
        <div className="team-editor-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 230px) minmax(0, 1fr)', gap: '20px', alignItems: 'start' }}>
          <aside className="team-editor-side" style={{ position: 'sticky', top: 92, display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                { id: 'ed-dados', label: 'Dados', bad: Boolean(nameError || emailError) },
                { id: 'ed-acesso', label: 'Acesso e unidades', bad: Boolean(venueError) },
                { id: 'ed-cargo', label: 'Cargo', bad: false },
                { id: 'ed-metas', label: 'Metas e regras', bad: false },
                { id: 'ed-status', label: 'Status', bad: false },
              ].map(i => (
                <button key={i.id} type="button" onClick={() => scrollToSection(i.id)} style={{
                  textAlign: 'left', padding: '9px 12px', borderRadius: '10px', border: '1px solid transparent', background: 'transparent', cursor: 'pointer',
                  fontSize: '0.82rem', fontWeight: 700, color: i.bad ? '#EF4444' : 'var(--adm-text-title)', display: 'flex', justifyContent: 'space-between',
                }}>{i.label}{i.bad && <span aria-hidden>!</span>}</button>
              ))}
            </nav>
            <div className="saas-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--adm-text-muted)' }}>O que essa pessoa vê</div>
              {formSectors.length === 0 && <div style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)' }}>Selecione um setor para definir o acesso.</div>}
              {formSectors.map(sec => (
                <div key={sec} style={{ fontSize: '0.76rem', color: 'var(--adm-text-title)' }}>
                  <strong>{({ gerencia: 'Gerência', comercial: 'Comercial', pos_venda: 'Pós-Venda', marketing: 'Marketing', financeiro: 'Financeiro' } as Record<string, string>)[sec]}</strong>
                  <div style={{ color: 'var(--adm-text-muted)' }}>{({
                    gerencia: 'Dashboard executivo, tarefas, origens, metas e equipe.',
                    comercial: 'Funil comercial, mensagens, visitas e dashboard.',
                    pos_venda: 'Funis de pós-venda, contratos e compromissos.',
                    marketing: 'Visão do comercial para acompanhar resultados.',
                    financeiro: 'Área financeira.',
                  } as Record<string, string>)[sec]}</div>
                </div>
              ))}
              <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', borderTop: '1px solid var(--adm-border)', paddingTop: 8 }}>
                {formSelectedVenueIds.length >= venues.length && venues.length > 0 ? 'Todas as unidades' : `${formSelectedVenueIds.length} unidade(s)`}
              </div>
            </div>
          </aside>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          {/* Card 1: Identificação & Cargo */}
          <div id="ed-dados" className="saas-card" style={{ scrollMarginTop: 96, padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                aria-invalid={Boolean(nameError)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'var(--adm-bg-input)',
                  border: `1px solid ${nameError ? '#EF4444' : 'var(--adm-border)'}`,
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: 'var(--adm-text-title)',
                  fontSize: '0.86rem',
                  outline: 'none',
                }}
              />
              {nameError && <div role="alert" style={{ marginTop: 4, fontSize: '0.72rem', fontWeight: 700, color: '#EF4444' }}>{nameError}</div>}
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
                aria-invalid={Boolean(emailError)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'var(--adm-bg-input)',
                  border: `1px solid ${emailError ? '#EF4444' : 'var(--adm-border)'}`,
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: 'var(--adm-text-title)',
                  fontSize: '0.86rem',
                  outline: 'none',
                }}
              />
              {emailError && <div role="alert" style={{ marginTop: 4, fontSize: '0.72rem', fontWeight: 700, color: '#EF4444' }}>{emailError}</div>}
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
            <div id="ed-acesso" className="saas-card" style={{ scrollMarginTop: 96, padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                        const next: ('gerencia' | 'comercial' | 'pos_venda' | 'financeiro' | 'marketing')[] = [...prev];
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
                      // Regra do F5 System: Gerência marca AUTOMATICAMENTE Pós-Venda e Comercial!
                      setFormSectors(prev => {
                        const next: ('gerencia' | 'comercial' | 'pos_venda' | 'financeiro' | 'marketing')[] = [...prev];
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

                {/* Setor de Marketing */}
                <div
                  onClick={() => {
                    const isSelected = formSectors.includes('marketing');
                    if (isSelected) {
                      setFormSectors(formSectors.filter(s => s !== 'marketing'));
                    } else {
                      // Marketing enxerga o Comercial (consulta); o modulo proprio de marketing ainda sera desenvolvido
                      setFormSectors(prev => {
                        const next: ('gerencia' | 'comercial' | 'pos_venda' | 'financeiro' | 'marketing')[] = [...prev];
                        if (!next.includes('marketing')) next.push('marketing');
                        if (!next.includes('comercial')) next.push('comercial');
                        return next;
                      });
                    }
                  }}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 14px', borderRadius: '12px', cursor: 'pointer',
                    border: formSectors.includes('marketing') ? '1.5px solid #EC4899' : '1px solid var(--adm-border)',
                    background: formSectors.includes('marketing') ? 'rgba(236, 72, 153, 0.08)' : 'var(--adm-bg-input)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input type="checkbox" checked={formSectors.includes('marketing')} onChange={() => {}} style={{ marginTop: '3px', cursor: 'pointer', accentColor: '#EC4899' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.86rem', fontWeight: 800, color: formSectors.includes('marketing') ? '#EC4899' : 'var(--adm-text-title)' }}>Setor de Marketing</span>
                      <span style={{ fontSize: '0.62rem', fontWeight: 700, background: 'rgba(236, 72, 153, 0.18)', color: '#EC4899', padding: '1px 6px', borderRadius: '4px' }}>+ Comercial (Leitura)</span>
                      <span style={{ fontSize: '0.6rem', fontWeight: 800, background: 'rgba(255, 255, 255, 0.08)', color: 'var(--adm-text-muted)', padding: '1px 5px', borderRadius: '4px' }}>Módulo em breve</span>
                    </div>
                    <p style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', margin: '3px 0 0 0', lineHeight: 1.35 }}>
                      Campanhas, gestão de tráfego e metas de marketing (em desenvolvimento), com consulta ao setor comercial.
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

            {/* Cargo (filtro de quem e SDR, Closer, gerente...): separado do acesso */}
            <div id="ed-cargo" className="saas-card" style={{ scrollMarginTop: 96, padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', borderBottom: '1px solid var(--adm-border)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserCheck size={18} color="var(--adm-accent)" />
                  <div>
                    <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>3. Cargo</h2>
                    <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
                      O acesso define o que a pessoa vê. O cargo define o que ela é: filtra SDR, Closer, metas, gestores.
                    </span>
                  </div>
                </div>
                {canManageRoles && (
                  <button type="button" onClick={() => setIsRolesModalOpen(true)} style={{ background: 'transparent', border: 'none', color: 'var(--adm-accent)', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Gerenciar cargos
                  </button>
                )}
              </div>

              {JOB_SECTORS.filter(g => formSectors.includes(g.id)).map(g => {
                const fixed = JOB_ROLE_OPTIONS[g.id];
                const custom = customRoles.filter(r => r.sector === g.id);
                const options = [
                  ...fixed.map(o => ({ id: o.id, label: roleAliases[o.id] || o.label, description: o.description })),
                  ...custom.map(o => ({ id: o.id, label: roleAliases[o.id] || o.name, description: 'Cargo personalizado' })),
                  // Cargo ainda selecionado mas ja excluido do catalogo: continua visivel ate salvar
                  ...formJobRoles.filter(id => id.startsWith(`${g.id}:`) && !fixed.some(o => o.id === id) && !custom.some(o => o.id === id))
                    .map(id => ({ id, label: jobRoleLabel(id, customRoles, roleAliases), description: '' })),
                ];
                const isAdding = addingRoleSector === g.id;
                return (
                  <div key={g.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: g.color }}>{g.label}</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {options.map(opt => {
                        const active = formJobRoles.includes(opt.id);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            aria-pressed={active}
                            title={opt.description}
                            onClick={() => setFormJobRoles(active ? formJobRoles.filter(r => r !== opt.id) : [...formJobRoles, opt.id])}
                            style={{
                              padding: '8px 14px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
                              border: `1.5px solid ${active ? g.color : 'var(--adm-border)'}`,
                              background: active ? `${g.color}1F` : 'var(--adm-bg-input)',
                              color: active ? g.color : 'var(--adm-text-title)',
                            }}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                      {!isAdding && (
                        <button type="button" onClick={() => { setAddingRoleSector(g.id); setAddingRoleName(''); }}
                          style={{ padding: '8px 14px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', border: '1.5px dashed var(--adm-border)', background: 'transparent', color: 'var(--adm-text-muted)' }}>
                          + Outro
                        </button>
                      )}
                    </div>
                    {isAdding && (
                      <form
                        onSubmit={async e => {
                          e.preventDefault();
                          const role = await createRole(g.id, addingRoleName);
                          if (role) {
                            setFormJobRoles(prev => (prev.includes(role.id) ? prev : [...prev, role.id]));
                            setAddingRoleSector(null);
                            setAddingRoleName('');
                          }
                        }}
                        style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
                      >
                        <input
                          autoFocus className="adm-input" maxLength={60} value={addingRoleName} onChange={e => setAddingRoleName(e.target.value)}
                          placeholder={`Digite o cargo em ${g.label} (ex.: ${g.id === 'marketing' ? 'Gestor de tráfego' : g.id === 'gerencia' ? 'Coordenador' : 'Analista'})`}
                          style={{ flex: 1, height: '38px', borderRadius: '10px', padding: '0 12px', fontSize: '0.8rem' }}
                        />
                        <button type="submit" disabled={slugifyRole(addingRoleName).length === 0} className="adm-btn-primary" style={{ height: '38px', padding: '0 16px', borderRadius: '10px', fontWeight: 800, fontSize: '0.76rem' }}>Adicionar</button>
                        <button type="button" onClick={() => setAddingRoleSector(null)} className="adm-btn-secondary" style={{ height: '38px', padding: '0 14px', borderRadius: '10px', fontWeight: 700, fontSize: '0.76rem' }}>Cancelar</button>
                      </form>
                    )}
                    {g.id === 'comercial' && !formJobRoles.some(r => r.startsWith('comercial:')) && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)' }}>
                        Sem cargo definido: o sistema usa a equipe configurada em cada funil. SDR e Closer podem ser marcados juntos.
                      </span>
                    )}
                  </div>
                );
              })}

              {formSectors.length === 0 && (
                <span style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>Marque ao menos um setor em "Nível de Acesso" para escolher o cargo.</span>
              )}
              {rolesModal}
            </div>

            {/* Casas de Festas Vinculadas */}
            <div id="ed-metas" className="saas-card" style={{ scrollMarginTop: 96, padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--adm-border)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={18} color="var(--adm-accent)" />
                  <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                    4. Casas de Festas Vinculadas
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
            <div id="ed-status" className="saas-card" style={{ scrollMarginTop: 96, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
      {/* Título no breadcrumb; ação primária no menu superior */}
      <HeaderActions>
        {canManageRoles && (
          <button type="button" onClick={() => setIsRolesModalOpen(true)} className="adm-btn-secondary"
            style={{ padding: '8px 16px', borderRadius: '12px', fontWeight: 800, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UserCheck size={15} /> <span>Cargos</span>
          </button>
        )}
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
      </HeaderActions>
      {rolesModal}

      {/* Time: faixa de resumo, filtros e lista agrupada por setor */}
      {profileCollab ? (
        <CollaboratorProfile
          collaborator={profileCollab}
          collaborators={collaborators}
          kind={teamData.kindOf(profileCollab)}
          perms={permsOf(profileCollab)}
          jobLabels={teamData.jobLabelsOf(profileCollab)}
          venues={venues}
          leads={leads}
          clients={clients}
          tasks={tasks}
          appointments={appointments}
          funnels={funnels}
          assets={assetMap}
          presence={profilePresence}
          kindOf={teamData.kindOf}
          actions={teamActions}
          sendingInviteEmail={sendingInviteEmail === profileCollab.email}
          onBack={() => setProfileCollabId(null)}
        />
      ) : (
        <TeamDirectory
          collaborators={collaborators}
          data={teamData}
          actions={teamActions}
          sendingInviteEmail={sendingInviteEmail}
          inviteSentEmail={inviteSentEmail}
        />
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

              {affectedOthers > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {[
                    { label: 'Contratos', value: affectedPostSale.contracts },
                    { label: 'Vendas adicionais', value: affectedPostSale.upsells },
                    { label: 'Compromissos', value: affectedPostSale.appointments },
                  ].map(i => (
                    <div key={i.label} style={{ padding: '10px 12px', borderRadius: '12px', background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)' }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>{i.label}</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>{i.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reatribuição Options */}
              {affectedLeads.length > 0 || affectedTasks.length > 0 || affectedOthers > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                    O que fazer com os leads, contratos, compromissos e tarefas em andamento?
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
                          <Select
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
                          </Select>
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
                          <Select
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
                          </Select>
                        </div>

                        {/* Seletor de Papel */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                            Atribuir Como
                          </label>
                          <Select
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
                          </Select>
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
