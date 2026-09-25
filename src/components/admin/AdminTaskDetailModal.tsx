import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  X, Calendar, Circle, Users,
  Trash2, Send,
  Maximize2, Minimize2, ChevronDown, ChevronRight,
  Printer, Layout,
  Phone, MessageSquare, FileText, AlertCircle,
  Plus, UserCheck, Check, ChevronLeft,
  Hash, ListFilter, CheckSquare, Globe, Mail, MapPin, Tag, Settings2,
  Flag, Info, Copy, GripVertical, Edit2, CheckCircle2, RotateCw,
  Target, BellRing, UserPlus, PhoneCall, Utensils, Compass, Sparkles,
  Palette, Music, Camera, Folder, DollarSign, Edit3, Handshake
} from 'lucide-react';
import type { 
  AdminTask, 
  TaskStatus, 
  TaskPriority, 
  TaskType, 
  Collaborator,
  TaskComment,
  TaskCustomStatus,
  CustomPropertyType,
  TaskPropertyDefinition
} from '../../types/admin';
import { useAdminState } from '../../context/AdminStateContext';
import { taskService } from '../../services/taskService';
import { AdminConfirmModal } from './AdminConfirmModal';
import { getLeadStageLabel } from '../../utils/leadUtils';

export const renderTaskTypeLucideIcon = (typeName: string, size = 14) => {
  const t = (typeName || '').toLowerCase();
  if (t.includes('whatsapp')) return <MessageSquare size={size} color="#0284C7" />;
  if (t.includes('liga') || t.includes('call') || t.includes('telefone')) return <PhoneCall size={size} color="#0284C7" />;
  if (t.includes('proposta') || t.includes('orçamento')) return <FileText size={size} color="#0284C7" />;
  if (t.includes('negocia')) return <Handshake size={size} color="#0284C7" />;
  if (t.includes('fechamento') || t.includes('contrato')) return <CheckCircle2 size={size} color="#0284C7" />;
  if (t.includes('degust') || t.includes('jantar')) return <Utensils size={size} color="#D97706" />;
  if (t.includes('visita técnica') || t.includes('tecnica')) return <Compass size={size} color="#7C3AED" />;
  if (t.includes('maquiagem')) return <Sparkles size={size} color="#7C3AED" />;
  if (t.includes('decora')) return <Palette size={size} color="#7C3AED" />;
  if (t.includes('ensaio') || t.includes('música') || t.includes('musica')) return <Music size={size} color="#7C3AED" />;
  if (t.includes('cerimonial')) return <FileText size={size} color="#7C3AED" />;
  if (t.includes('vestido') || t.includes('roupa')) return <Tag size={size} color="#7C3AED" />;
  if (t.includes('foto') || t.includes('vídeo') || t.includes('video')) return <Camera size={size} color="#7C3AED" />;
  if (t.includes('visita')) return <Calendar size={size} color="#059669" />;
  if (t.includes('reuni') || t.includes('meeting') || t.includes('comercial')) return <Users size={size} color="#7C3AED" />;
  if (t.includes('financeiro') || t.includes('pagamento')) return <DollarSign size={size} color="#475569" />;
  if (t.includes('administrativo')) return <Folder size={size} color="#475569" />;
  if (t.includes('opera') || t.includes('montagem')) return <Settings2 size={size} color="#475569" />;
  if (t.includes('acompanhar')) return <RotateCw size={size} color="#475569" />;
  if (t.includes('geral')) return <CheckSquare size={size} color="#475569" />;
  return <Edit3 size={size} color="var(--adm-accent)" />;
};

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

interface AdminTaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: AdminTask | null;
  onEdit?: (task: AdminTask) => void;
  onOpenLead?: (leadId: string) => void;
  initialDatabaseId?: string;
  initialStatus?: string;
  initialDueDate?: string;
  initialDueTime?: string;
  initialType?: TaskType;
  initialCustomType?: string;
  initialIsFollowUp?: boolean;
  initialLeadId?: string;
  initialClientId?: string;
  isHomeContext?: boolean;
  workspaceContext?: 'all' | 'general' | 'followup' | 'visits_tastings' | 'appointments';
}

export const AdminTaskDetailModal: React.FC<AdminTaskDetailModalProps> = ({
  isOpen,
  onClose,
  task,
  onOpenLead,
  initialDatabaseId = 'default_collabs',
  initialStatus,
  initialDueDate,
  initialDueTime,
  initialType,
  initialCustomType,
  initialIsFollowUp = false,
  initialLeadId,
  initialClientId,
  isHomeContext = false,
  workspaceContext,
}) => {
  const { 
    currentUser, 
    collaborators, 
    leads,
    clients,
    addTask,
    updateTask, 
    deleteTask
  } = useAdminState();

  const isCreateMode = task === null;
  const userRole = currentUser?.role || 'closer';
  const isManagerOrAdmin = ['master', 'admin', 'dev', 'gerencia'].includes(userRole);
  const isPostSaleRole = userRole === 'pos_venda';

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [includeTime, setIncludeTime] = useState(false);
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [customStatusId, setCustomStatusId] = useState<string>('st_todo');
  const [priority, setPriority] = useState<TaskPriority>('none');
  const [taskType, setTaskType] = useState<TaskType>('general');
  const [customType, setCustomType] = useState<string>('Acompanhar');
  const [isCustomTypeEditing, setIsCustomTypeEditing] = useState(false);
  const [observations, setObservations] = useState('');
  const [resolution, setResolution] = useState('');
  const [resolutionHighlight, setResolutionHighlight] = useState(false);
  const [allowEmptyResolution, setAllowEmptyResolution] = useState(false);
  const resolutionRef = useRef<HTMLDivElement>(null);
  const [databaseId, setDatabaseId] = useState<string>('default_collabs');
  const [assignedToIds, setAssignedToIds] = useState<string[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [linkMode, setLinkMode] = useState<'lead' | 'client'>('lead');
  const [customProperties, setCustomProperties] = useState<Record<string, any>>({});
  const [comments, setComments] = useState<TaskComment[]>([]);

  // Anchored Status Popover subviews (Image 1 & Image 2)
  const [showStatusPopover, setShowStatusPopover] = useState(false);
  const [statusPopoverMode, setStatusPopoverMode] = useState<'select' | 'edit_property' | 'edit_item'>('select');
  const [statusItemForEdit, setStatusItemForEdit] = useState<TaskCustomStatus | null>(null);
  const [statusNameEdit, setStatusNameEdit] = useState('');
  const [newStatusInGroup, setNewStatusInGroup] = useState<'todo' | 'in_progress' | 'completed' | null>(null);
  const [newStatusName, setNewStatusName] = useState('');

  // Date Popover
  const [showDatePopover, setShowDatePopover] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(() => new Date());

  // Collaborators, Leads & Clients Popovers
  const [showCollabPicker, setShowCollabPicker] = useState(false);
  const [collabSearchTerm, setCollabSearchTerm] = useState('');

  const [showLeadPicker, setShowLeadPicker] = useState(false);
  const [leadSearchTerm, setLeadSearchTerm] = useState('');

  const [showClientPicker, setShowClientPicker] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');

  // SDR Notifier & Automatic Reminders (for Visits & Tastings)
  const [sdrAssigneeId, setSdrAssigneeId] = useState<string>('');
  const [showSdrPicker, setShowSdrPicker] = useState(false);
  const [sdrSearchTerm, setSdrSearchTerm] = useState('');
  const [enableAutoReminders, setEnableAutoReminders] = useState(true);
  const [reminder1Days, setReminder1Days] = useState(7); // 7 dias antes
  const [reminder2Days, setReminder2Days] = useState(1); // 24h antes

  // Collapsible Accordion for Additional Properties
  const [isAdditionalPropsOpen, setIsAdditionalPropsOpen] = useState(false);

  // Property Options Menu (Image 2) on Grip handle :::
  const [activePropertyMenuId, setActivePropertyMenuId] = useState<string | null>(null);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [editingPropertyName, setEditingPropertyName] = useState('');

  // Add Property
  const [showAddPropertyMenu, setShowAddPropertyMenu] = useState(false);
  const [newPropModalOpen, setNewPropModalOpen] = useState(false);
  const [newPropType, setNewPropType] = useState<CustomPropertyType>('text');
  const [newPropName, setNewPropName] = useState('');

  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  const [showTypePicker, setShowTypePicker] = useState(false);
  const typePickerRef = useRef<HTMLDivElement>(null);

  // Loaded database & options
  const [availableStatuses, setAvailableStatuses] = useState<TaskCustomStatus[]>([]);
  const [propertyDefinitions, setPropertyDefinitions] = useState<TaskPropertyDefinition[]>([]);

  // Refs for outside click
  const statusPopoverRef = useRef<HTMLDivElement>(null);
  const datePopoverRef = useRef<HTMLDivElement>(null);
  const collabPickerRef = useRef<HTMLDivElement>(null);
  const sdrPickerRef = useRef<HTMLDivElement>(null);
  const leadPickerRef = useRef<HTMLDivElement>(null);
  const clientPickerRef = useRef<HTMLDivElement>(null);
  const addPropertyRef = useRef<HTMLDivElement>(null);
  const propMenuRef = useRef<HTMLDivElement>(null);

  // Dynamic context info based on active database, workspaceContext and user role
  const contextInfo = useMemo(() => {
    const dbId = task?.databaseId || databaseId || initialDatabaseId;
    const isAppointmentsDb = dbId === 'db_appointments' || workspaceContext === 'appointments';
    const isVisitsTastingsDb = dbId === 'db_visits_tastings' || workspaceContext === 'visits_tastings';
    const isFollowupDb = dbId === 'db_followup' || workspaceContext === 'followup';

    if (isAppointmentsDb) {
      return {
        key: 'appointments',
        titlePlaceholder: 'Nome do compromisso...',
        typeLabel: 'Tipo de Compromisso',
        defaultType: 'Visita Técnica',
        types: [
          'Visita Técnica',
          'Maquiagem',
          'Decoração',
          'Reunião Geral',
          'Ensaio',
          'Alinhamento com Cerimonial',
          'Prova de Vestido',
          'Foto / Vídeo',
        ],
        allowCustom: true,
        saveButtonLabel: 'Salvar Compromisso',
      };
    }

    if (isVisitsTastingsDb) {
      return {
        key: 'visits_tastings',
        titlePlaceholder: 'Nome da visita / degustação...',
        typeLabel: 'Tipo de Agendamento',
        defaultType: initialCustomType || '',
        types: ['Visita', 'Degustação'],
        allowCustom: false,
        saveButtonLabel: 'Salvar Agendamento',
      };
    }

    if (isFollowupDb) {
      return {
        key: 'followup',
        titlePlaceholder: 'Nome do follow-up...',
        typeLabel: 'Tipo de Follow-up',
        defaultType: 'Follow-up WhatsApp',
        types: [
          'Follow-up WhatsApp',
          'Follow-up Ligação',
          'Envio de Proposta',
          'Reunião Comercial',
          'Negociação',
          'Fechamento',
        ],
        allowCustom: true,
        saveButtonLabel: 'Salvar Follow-up',
      };
    }

    // Central de Tarefas Geral (default_collabs / Workspace)
    const isCommercial = ['sdr', 'closer', 'crm'].includes(userRole);
    let generalTypes: string[] = [];

    if (isManagerOrAdmin) {
      generalTypes = [
        'Acompanhar',
        'Geral',
        'Administrativo',
        'Financeiro',
        'Operação / Montagem',
        'Follow-up WhatsApp',
        'Follow-up Ligação',
        'Envio de Proposta',
        'Reunião Comercial',
        'Visita',
        'Degustação',
        'Visita Técnica',
        'Maquiagem',
        'Decoração',
        'Reunião Geral',
        'Ensaio',
        'Alinhamento com Cerimonial',
      ];
    } else if (isPostSaleRole) {
      generalTypes = [
        'Visita',
        'Degustação',
        'Visita Técnica',
        'Maquiagem',
        'Decoração',
        'Reunião Geral',
        'Ensaio',
        'Alinhamento com Cerimonial',
        'Acompanhar',
        'Geral',
      ];
    } else if (isCommercial) {
      generalTypes = [
        'Follow-up WhatsApp',
        'Follow-up Ligação',
        'Envio de Proposta',
        'Reunião Comercial',
        'Negociação',
        'Acompanhar',
        'Geral',
      ];
    } else {
      generalTypes = [
        'Acompanhar',
        'Geral',
        'Administrativo',
        'Operação / Montagem',
      ];
    }

    return {
      key: 'general',
      titlePlaceholder: 'Nome da tarefa...',
      typeLabel: 'Tipo de Tarefa',
      defaultType: isCommercial ? 'Follow-up WhatsApp' : isPostSaleRole ? 'Visita' : 'Acompanhar',
      types: generalTypes,
      allowCustom: true,
      saveButtonLabel: 'Salvar Tarefa',
    };
  }, [task?.databaseId, databaseId, initialDatabaseId, workspaceContext, initialCustomType, isManagerOrAdmin, isPostSaleRole, userRole]);

  // Load custom statuses and properties
  useEffect(() => {
    taskService.getCustomStatuses(databaseId).then(setAvailableStatuses);
    taskService.getPropertyDefinitions(databaseId).then(setPropertyDefinitions);
  }, [databaseId]);

  // Handle clicking outside of popovers
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (statusPopoverRef.current && !statusPopoverRef.current.contains(target)) {
        setShowStatusPopover(false);
        setStatusPopoverMode('select');
      }
      if (datePopoverRef.current && !datePopoverRef.current.contains(target)) setShowDatePopover(false);
      if (collabPickerRef.current && !collabPickerRef.current.contains(target)) setShowCollabPicker(false);
      if (sdrPickerRef.current && !sdrPickerRef.current.contains(target)) setShowSdrPicker(false);
      if (leadPickerRef.current && !leadPickerRef.current.contains(target)) setShowLeadPicker(false);
      if (clientPickerRef.current && !clientPickerRef.current.contains(target)) setShowClientPicker(false);
      if (typePickerRef.current && !typePickerRef.current.contains(target)) setShowTypePicker(false);
      if (addPropertyRef.current && !addPropertyRef.current.contains(target)) setShowAddPropertyMenu(false);
      if (propMenuRef.current && !propMenuRef.current.contains(target)) setActivePropertyMenuId(null);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Sync state when task changes or resets to pristine state for creation
  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setContent(task.content || task.observations || task.description || '');
      setDueDate(task.dueDate || '');
      setDueTime(task.dueTime || '');
      setEndDate(task.endDate || '');
      setEndTime(task.endTime || '');
      setHasEndDate(Boolean(task.endDate));
      setIncludeTime(Boolean(task.dueTime));
      setStatus(task.status || 'todo');
      setCustomStatusId(task.customStatusId || 'st_todo');
      setPriority(task.priority || 'none');
      setTaskType(task.type || 'general');
      setCustomType(task.customType || task.customProperties?.customType || contextInfo.defaultType);
      setObservations(task.observations || task.content || task.customProperties?.observations || '');
      setResolution(task.resolution || task.customProperties?.resolution || '');
      setDatabaseId(task.databaseId || initialDatabaseId || 'default_collabs');
      setAssignedToIds(task.assignedToIds || []);
      setSdrAssigneeId(task.customProperties?.sdrAssigneeId || '');
      setSelectedLeadId(task.leadId || '');
      setSelectedClientId(task.debutanteId || '');
      if (task.debutanteId && !task.leadId) {
        setLinkMode('client');
      } else {
        setLinkMode('lead');
      }
      setCustomProperties(task.customProperties || {});
      setComments(task.comments || []);
      setNewCommentText('');
    } else {
      // Create Mode: Start completely clean/empty ("cru")
      setTitle('');
      setContent('');
      setDueDate(initialDueDate || '');
      setDueTime(initialDueTime || '');
      setEndDate('');
      setEndTime('');
      setHasEndDate(false);
      setIncludeTime(Boolean(initialDueTime));
      setStatus((initialStatus as TaskStatus) || 'todo');
      setCustomStatusId('st_todo');
      setPriority('none');
      setTaskType(initialType || 'general');
      setCustomType(initialCustomType || contextInfo.defaultType);
      setObservations('');
      setResolution('');
      setDatabaseId(initialDatabaseId || 'default_collabs');
      // Auto-assign current user
      setAssignedToIds(currentUser?.id ? [currentUser.id] : []);
      // Pre-select SDR if current user is SDR/closer
      const defaultSdr = (['sdr', 'closer', 'crm'].includes(userRole) && currentUser?.id) ? currentUser.id : '';
      setSdrAssigneeId(defaultSdr);
      setSelectedLeadId(initialLeadId || '');
      setSelectedClientId(initialClientId || '');

      if (initialClientId) {
        setLinkMode('client');
        const matchedClient = (clients || []).find(c => c.id === initialClientId);
        if (matchedClient?.commercialLeadId && !initialLeadId) {
          setSelectedLeadId(matchedClient.commercialLeadId);
        }
      } else if (isPostSaleRole || initialDatabaseId === 'db_visits_tastings' || initialDatabaseId === 'db_appointments' || workspaceContext === 'visits_tastings' || workspaceContext === 'appointments') {
        setLinkMode('client');
      } else {
        setLinkMode('lead');
      }
      setCustomProperties({});
      setComments([]);
      setNewCommentText('');
    }
  }, [task, isOpen, initialDatabaseId, initialStatus, initialIsFollowUp, initialLeadId, initialClientId, initialDueDate, initialDueTime, initialType, initialCustomType, currentUser?.id, isPostSaleRole, workspaceContext, contextInfo.defaultType, userRole, clients]);

  // Print helper
  const handlePrint = () => {
    window.print();
  };

  // Safe Blur Handlers for existing task
  const handleTitleBlur = () => {
    if (task && title.trim() && title !== task.title) {
      updateTask(task.id, { title: title.trim() });
    }
  };

  const handleContentBlur = () => {
    if (task && content !== task.content) {
      updateTask(task.id, { 
        content, 
        description: content,
        observations: content,
        customProperties: { ...(task.customProperties || {}), observations: content }
      });
    }
  };


  const handleCustomTypeBlur = () => {
    if (task && customType !== task.customType) {
      updateTask(task.id, { 
        customType: customType.trim(),
        customProperties: { ...(task.customProperties || {}), customType: customType.trim() }
      });
    }
  };

  const handleResolutionBlur = () => {
    if (resolution.trim()) {
      setResolutionHighlight(false);
    }
    if (task && resolution !== task.resolution) {
      updateTask(task.id, { 
        resolution: resolution.trim() || undefined,
        customProperties: { ...(task.customProperties || {}), resolution: resolution.trim() || undefined }
      });
    }
  };

  const handleSelectStatus = (st: TaskCustomStatus) => {
    if (st.groupKey === 'completed' && !resolution.trim() && !allowEmptyResolution) {
      setShowStatusPopover(false);
      setStatusPopoverMode('select');
      setResolutionHighlight(true);
      resolutionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setCustomStatusId(st.id);
      setStatus('completed');
      if (task) {
        updateTask(task.id, { 
          status: 'completed',
          customStatusId: st.id,
          completedAt: new Date().toISOString()
        });
      }
      return;
    }

    setCustomStatusId(st.id);
    setStatus(st.groupKey as TaskStatus);
    setShowStatusPopover(false);
    setStatusPopoverMode('select');

    if (task) {
      updateTask(task.id, { 
        status: st.groupKey as TaskStatus,
        customStatusId: st.id,
        completedAt: st.groupKey === 'completed' ? new Date().toISOString() : undefined
      });
    }
  };

  // Anchored Status Popover Handlers (Image 1 & Image 2)
  const handleUpdateStatusColor = async (statusId: string, hex: string) => {
    const updated = availableStatuses.map(s => s.id === statusId ? { ...s, color: hex, bgColor: `${hex}22` } : s);
    setAvailableStatuses(updated);
    if (statusItemForEdit?.id === statusId) {
      setStatusItemForEdit(prev => prev ? { ...prev, color: hex, bgColor: `${hex}22` } : null);
    }
    await taskService.updateCustomStatus(statusId, { color: hex, bgColor: `${hex}22` });
  };

  const handleUpdateStatusName = async (statusId: string, newName: string) => {
    if (!newName.trim()) return;
    const updated = availableStatuses.map(s => s.id === statusId ? { ...s, name: newName.trim() } : s);
    setAvailableStatuses(updated);
    if (statusItemForEdit?.id === statusId) {
      setStatusItemForEdit(prev => prev ? { ...prev, name: newName.trim() } : null);
    }
    await taskService.updateCustomStatus(statusId, { name: newName.trim() });
  };

  const handleUpdateStatusGroup = async (statusId: string, newGroup: 'todo' | 'in_progress' | 'completed') => {
    const currentStatus = availableStatuses.find(s => s.id === statusId);
    if (!currentStatus || currentStatus.groupKey === newGroup) return;
    const groupCount = availableStatuses.filter(s => s.groupKey === currentStatus.groupKey).length;
    if (groupCount <= 1) {
      alert('Cada categoria deve manter pelo menos 1 status.');
      return;
    }
    const updated = availableStatuses.map(s => s.id === statusId ? { ...s, groupKey: newGroup } : s);
    setAvailableStatuses(updated);
    if (statusItemForEdit?.id === statusId) {
      setStatusItemForEdit(prev => prev ? { ...prev, groupKey: newGroup } : null);
    }
    await taskService.updateCustomStatus(statusId, { groupKey: newGroup });
  };

  const handleSetDefaultStatus = async (statusId: string) => {
    const updated = availableStatuses.map(s => ({ ...s, isDefault: s.id === statusId }));
    setAvailableStatuses(updated);
    if (statusItemForEdit?.id === statusId) {
      setStatusItemForEdit(prev => prev ? { ...prev, isDefault: true } : null);
    }
    await taskService.reorderCustomStatuses(databaseId, updated);
  };

  const handleDeleteCustomStatus = async (statusId: string) => {
    const toDelete = availableStatuses.find(s => s.id === statusId);
    if (!toDelete) return;
    const groupCount = availableStatuses.filter(s => s.groupKey === toDelete.groupKey).length;
    if (groupCount <= 1) {
      alert('Não é possível excluir o único status desta categoria.');
      return;
    }
    const updated = availableStatuses.filter(s => s.id !== statusId);
    setAvailableStatuses(updated);
    setStatusPopoverMode('edit_property');
    setStatusItemForEdit(null);
    await taskService.deleteCustomStatus(statusId);
  };

  const handleAddStatusToGroup = async (group: 'todo' | 'in_progress' | 'completed') => {
    if (!newStatusName.trim()) return;
    const color = group === 'completed' ? '#16A34A' : group === 'in_progress' ? '#2563EB' : '#94A3B8';
    const created = await taskService.addCustomStatus({
      databaseId,
      name: newStatusName.trim(),
      groupKey: group,
      color,
      bgColor: `${color}22`,
      orderIndex: availableStatuses.length,
      isDefault: false,
    });
    if (created) {
      setAvailableStatuses(prev => [...prev, created]);
    }
    setNewStatusName('');
    setNewStatusInGroup(null);
  };

  const handleAddCustomProperty = async () => {
    if (!newPropName.trim()) return;
    const created = await taskService.addPropertyDefinition({
      databaseId,
      name: newPropName.trim(),
      type: newPropType,
      options: [],
      orderIndex: propertyDefinitions.length,
    });
    if (created) {
      setPropertyDefinitions(prev => [...prev, created]);
      setCustomProperties(prev => ({ ...prev, [created.id]: '' }));
      if (task) {
        updateTask(task.id, { 
          customProperties: { ...(task.customProperties || {}), [created.id]: '' } 
        });
      }
    }
    setNewPropName('');
    setNewPropModalOpen(false);
  };

  const handleCustomPropertyChange = (propId: string, value: any) => {
    const updated = { ...customProperties, [propId]: value };
    setCustomProperties(updated);
    if (task) {
      updateTask(task.id, { customProperties: updated });
    }
  };

  const toggleAssignee = (collabId: string) => {
    if (!isManagerOrAdmin && currentUser?.id && collabId === currentUser.id && assignedToIds.includes(collabId)) {
      alert('Colaboradores não podem remover a si mesmos como responsáveis desta tarefa.');
      return;
    }
    const nextIds = assignedToIds.includes(collabId)
      ? assignedToIds.filter(id => id !== collabId)
      : [...assignedToIds, collabId];
    
    setAssignedToIds(nextIds);
    if (task) {
      updateTask(task.id, { assignedToIds: nextIds });
    }
  };

  const handleDeleteProperty = async (propId: string) => {
    const confirmed = window.confirm('Deseja excluir esta propriedade personalizada?');
    if (!confirmed) return;
    const remaining = propertyDefinitions.filter(p => p.id !== propId);
    setPropertyDefinitions(remaining);
    setActivePropertyMenuId(null);
    await taskService.deletePropertyDefinition(propId);
  };

  const handleDuplicateProperty = async (prop: TaskPropertyDefinition) => {
    const created = await taskService.addPropertyDefinition({
      databaseId,
      name: `${prop.name} (Cópia)`,
      type: prop.type,
      options: prop.options || [],
      orderIndex: propertyDefinitions.length,
    });
    if (created) {
      setPropertyDefinitions(prev => [...prev, created]);
    }
    setActivePropertyMenuId(null);
  };

  const handleSaveRenameProperty = async (propId: string) => {
    if (!editingPropertyName.trim()) return;
    const updated = propertyDefinitions.map(p => p.id === propId ? { ...p, name: editingPropertyName.trim() } : p);
    setPropertyDefinitions(updated);
    setEditingPropertyId(null);
    setEditingPropertyName('');
    setActivePropertyMenuId(null);
  };

  const handleSelectLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    setShowLeadPicker(false);
    const selected = leads.find(l => l.id === leadId);

    // Auto-formatting title
    if (contextInfo.key === 'visits_tastings' || contextInfo.key === 'followup') {
      const typePart = customType || (contextInfo.key === 'visits_tastings' ? 'Visita' : 'Follow-up WhatsApp');
      const autoTitle = selected?.name ? `${selected.name} / ${typePart}` : '';
      if (autoTitle && (!title || title.includes('/') || isCreateMode)) {
        setTitle(autoTitle);
      }
    }

    if (task) {
      const typePart = customType || (contextInfo.key === 'visits_tastings' ? 'Visita' : 'Follow-up');
      const autoTitle = selected?.name ? `${selected.name} / ${typePart}` : task.title;
      updateTask(task.id, { 
        leadId: leadId || undefined, 
        leadName: selected?.name || undefined,
        ...((contextInfo.key === 'visits_tastings' || contextInfo.key === 'followup') && (!task.title || task.title.includes('/')) ? { title: autoTitle } : {})
      });
    }
  };

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    setShowClientPicker(false);
    const selected = (clients || []).find(c => c.id === clientId);
    const name = selected?.name || selected?.birthdayPersonName;

    // Auto-formatting title
    if (contextInfo.key === 'appointments' || contextInfo.key === 'visits_tastings') {
      const typePart = customType || (contextInfo.key === 'appointments' ? 'Compromisso' : 'Visita');
      const autoTitle = name ? `${name} / ${typePart}` : '';
      if (autoTitle && (!title || title.includes('/') || isCreateMode)) {
        setTitle(autoTitle);
      }
    }

    if (task) {
      const typePart = customType || (contextInfo.key === 'appointments' ? 'Compromisso' : 'Visita');
      const autoTitle = name ? `${name} / ${typePart}` : task.title;
      updateTask(task.id, { 
        debutanteId: clientId || undefined,
        debutanteName: name || undefined,
        ...((contextInfo.key === 'appointments' || contextInfo.key === 'visits_tastings') && (!task.title || task.title.includes('/')) ? { title: autoTitle } : {})
      });
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !task) return;
    setIsSubmittingComment(true);

    const created = await taskService.addComment(task.id, {
      authorId: currentUser?.id,
      authorName: currentUser?.name || 'Colaborador',
      authorAvatar: currentUser?.avatarUrl,
      text: newCommentText.trim(),
    });

    if (created) {
      setComments(prev => [...prev, created]);
      updateTask(task.id, { comments: [...(task.comments || []), created] });
      setNewCommentText('');
    }
    setIsSubmittingComment(false);
  };

  const handleCreateTask = () => {
    if (!title.trim()) {
      alert(`Por favor, informe o título.`);
      return;
    }

    if (contextInfo.key === 'followup' && !selectedLeadId) {
      alert('Por favor, selecione o Lead do CRM para este Follow-up.');
      return;
    }

    if (contextInfo.key === 'visits_tastings') {
      if (!customType.trim()) {
        alert('Por favor, selecione o Tipo de Agendamento (Visita ou Degustação).');
        return;
      }
      if (!selectedLeadId && !selectedClientId) {
        alert('Por favor, vincule um Lead ou Cliente para este agendamento.');
        return;
      }
      if (!sdrAssigneeId) {
        alert('Por favor, vincule o SDR Notificador responsável pelas notificações.');
        return;
      }
    }

    if (contextInfo.key === 'appointments' && !selectedClientId && !selectedLeadId) {
      alert('Por favor, selecione a Debutante / Cliente para este Compromisso.');
      return;
    }

    if (status === 'completed' && !resolution.trim() && !allowEmptyResolution) {
      setResolutionHighlight(true);
      resolutionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    executeCreateTask();
  };

  const executeCreateTask = () => {
    const lead = leads.find(l => l.id === selectedLeadId);
    const client = (clients || []).find(c => c.id === selectedClientId);
    const sdrCollab = collaborators.find(c => c.id === sdrAssigneeId);

    const masterFallbackUuid = 'a0000000-0000-0000-0000-000000000001';
    const effectiveUserId = (currentUser?.id && currentUser.id !== 'master') ? currentUser.id : masterFallbackUuid;

    const finalAssignedIds = assignedToIds.length > 0 
      ? assignedToIds 
      : [effectiveUserId];

    const effectiveDatabaseId = 
      contextInfo.key === 'followup' ? 'db_followup' :
      contextInfo.key === 'visits_tastings' ? 'db_visits_tastings' :
      contextInfo.key === 'appointments' ? 'db_appointments' :
      (databaseId || initialDatabaseId || 'default_collabs');

    const effectiveObservations = (content || observations || '').trim();

    // 1. Criar tarefa principal
    const mainTaskId = addTask({
      databaseId: effectiveDatabaseId,
      title: title.trim(),
      description: effectiveObservations,
      content: effectiveObservations,
      dueDate: dueDate.trim() || undefined,
      dueTime: includeTime && dueTime.trim() ? dueTime.trim() : undefined,
      endDate: hasEndDate && endDate.trim() ? endDate.trim() : undefined,
      endTime: hasEndDate && includeTime && endTime.trim() ? endTime.trim() : undefined,
      status,
      customStatusId,
      priority: priority || 'none',
      type: taskType || 'general',
      customType: customType.trim() || contextInfo.defaultType,
      observations: effectiveObservations || undefined,
      resolution: resolution.trim() || undefined,
      isFollowUp: initialIsFollowUp,
      createdById: effectiveUserId,
      createdByName: currentUser?.name || 'Diretoria',
      assignedToIds: finalAssignedIds,
      leadId: selectedLeadId || undefined,
      leadName: lead?.name,
      debutanteId: selectedClientId || undefined,
      debutanteName: client?.name || client?.birthdayPersonName,
      venueId: currentUser?.venueIds?.[0] || lead?.venueId || client?.venueId || undefined,
      customProperties: {
        ...(customProperties || {}),
        observations: effectiveObservations || undefined,
        resolution: resolution.trim() || undefined,
        customType: customType.trim() || contextInfo.defaultType,
        sdrAssigneeId: sdrAssigneeId || undefined,
        sdrName: sdrCollab?.name || undefined,
        leadId: selectedLeadId || undefined,
        leadName: lead?.name || undefined,
        debutanteId: selectedClientId || undefined,
        clientId: selectedClientId || undefined,
        debutanteName: client?.name || client?.birthdayPersonName || undefined,
        clientName: client?.name || client?.birthdayPersonName || undefined,
      },
    });

    // 2. Geração automática de tarefas de notificação para o SDR (exclusivo para Visitas & Degustações)
    if (contextInfo.key === 'visits_tastings' && enableAutoReminders && sdrAssigneeId && dueDate) {
      const getSubtractedDateStr = (days: number) => {
        try {
          const target = new Date(dueDate + 'T12:00:00');
          target.setDate(target.getDate() - days);
          return target.toISOString().split('T')[0];
        } catch {
          return dueDate;
        }
      };

      const date1Str = getSubtractedDateStr(reminder1Days);
      const date2Str = getSubtractedDateStr(reminder2Days);

      // Notificação 1: Antecedência (ex: 7 dias)
      addTask({
        databaseId: 'db_followup',
        title: `Lembrete: Notificar sobre ${customType} - ${title.trim()}`,
        description: `Notificar família sobre o agendamento de ${customType} marcado para ${dueDate}. Lembrete com antecedência de ${reminder1Days} dias.`,
        content: `Notificar família sobre o agendamento de ${customType} marcado para ${dueDate}. Lembrete com antecedência de ${reminder1Days} dias.`,
        dueDate: date1Str,
        status: 'todo',
        priority: 'high',
        type: 'followup',
        customType: 'Follow-up WhatsApp',
        isFollowUp: true,
        createdById: effectiveUserId,
        createdByName: currentUser?.name || 'Diretoria',
        assignedToIds: [sdrAssigneeId],
        leadId: selectedLeadId || undefined,
        leadName: lead?.name,
        debutanteId: selectedClientId || undefined,
        debutanteName: client?.name || client?.birthdayPersonName,
        venueId: currentUser?.venueIds?.[0] || lead?.venueId || client?.venueId || undefined,
        customProperties: {
          observations: `Lembrete automático para o SDR ${sdrCollab?.name || ''} notificar o cliente ${reminder1Days} dias antes.`,
          autoGenerated: true,
          parentTaskId: mainTaskId,
          notificationNumber: 1,
          parentTaskTitle: title.trim(),
        }
      });

      // Notificação 2: Confirmação de Presença (ex: 24h antes)
      addTask({
        databaseId: 'db_followup',
        title: `Confirmar Presença: ${customType} - ${title.trim()}`,
        description: `Confirmar presença final da família para ${customType} agendada para ${dueDate}. Lembrete de 24h antes.`,
        content: `Confirmar presença final da família para ${customType} agendada para ${dueDate}. Lembrete de 24h antes.`,
        dueDate: date2Str,
        status: 'todo',
        priority: 'urgent',
        type: 'followup',
        customType: 'Follow-up WhatsApp',
        isFollowUp: true,
        createdById: effectiveUserId,
        createdByName: currentUser?.name || 'Diretoria',
        assignedToIds: [sdrAssigneeId],
        leadId: selectedLeadId || undefined,
        leadName: lead?.name,
        debutanteId: selectedClientId || undefined,
        debutanteName: client?.name || client?.birthdayPersonName,
        venueId: currentUser?.venueIds?.[0] || lead?.venueId || client?.venueId || undefined,
        customProperties: {
          observations: `Lembrete automático para o SDR ${sdrCollab?.name || ''} confirmar presença 24h antes.`,
          autoGenerated: true,
          parentTaskId: mainTaskId,
          notificationNumber: 2,
          parentTaskTitle: title.trim(),
        }
      });
    }

    onClose();
  };

  const handleDelete = () => {
    if (task) {
      deleteTask(task.id);
      setIsConfirmDeleteOpen(false);
      onClose();
    }
  };

  // Assigned collaborators list
  const assignedCollabs = useMemo<Collaborator[]>(() => {
    return assignedToIds
      .map(id => collaborators.find(c => c.id === id))
      .filter((c): c is Collaborator => Boolean(c));
  }, [assignedToIds, collaborators]);

  const sdrCollaborators = useMemo(() => {
    return collaborators.filter(c => {
      if (!c.active) return false;
      if (c.role === 'master') return true;
      if (c.sectors && c.sectors.length > 0) {
        return c.sectors.includes('comercial');
      }
      return ['comercial', 'sdr', 'closer', 'crm'].includes(c.role || '');
    });
  }, [collaborators]);

  const selectedSdr = useMemo(() => {
    return collaborators.find(c => c.id === sdrAssigneeId);
  }, [collaborators, sdrAssigneeId]);

  const selectedLead = useMemo(() => {
    return leads.find(l => l.id === selectedLeadId);
  }, [leads, selectedLeadId]);

  const selectedClient = useMemo(() => {
    return (clients || []).find(c => c.id === selectedClientId);
  }, [clients, selectedClientId]);

  // Current status badge config
  const currentStatusObj = useMemo(() => {
    return availableStatuses.find(s => s.id === customStatusId) || {
      id: 'st_todo',
      name: status === 'completed' ? 'Finalizado' : status === 'in_progress' ? 'Fazendo' : 'Não iniciado',
      groupKey: status,
      color: status === 'completed' ? '#10B981' : status === 'in_progress' ? '#3B82F6' : '#94A3B8',
      bgColor: status === 'completed' ? 'rgba(16, 185, 129, 0.14)' : status === 'in_progress' ? 'rgba(59, 130, 246, 0.14)' : 'rgba(148, 163, 184, 0.14)',
      orderIndex: 0
    };
  }, [availableStatuses, customStatusId, status]);

  // Calendar Helpers for Notion-style Date Popover
  const calendarDays = useMemo(() => {
    const pad2 = (n: number) => String(n).padStart(2, '0');
    const formatYMD = (y: number, m: number, d: number) => {
      const dt = new Date(y, m, d);
      return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
    };

    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: { day: number; dateStr: string; isCurrentMonth: boolean; isToday: boolean; isSelected: boolean }[] = [];
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const dateStr = formatYMD(year, month - 1, d);
      days.push({ day: d, dateStr, isCurrentMonth: false, isToday: dateStr === todayStr, isSelected: dateStr === dueDate });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatYMD(year, month, d);
      days.push({ day: d, dateStr, isCurrentMonth: true, isToday: dateStr === todayStr, isSelected: dateStr === dueDate });
    }

    // Next month padding to fill 42 cells (6 rows)
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const dateStr = formatYMD(year, month + 1, d);
      days.push({ day: d, dateStr, isCurrentMonth: false, isToday: dateStr === todayStr, isSelected: dateStr === dueDate });
    }

    return days;
  }, [calendarViewDate, dueDate]);

  const monthNames = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];

  if (!isOpen) return null;

  return (
    <>
      <div 
        onClick={onClose}
        className="smart-note-backdrop"
        style={isFullScreen ? {
          position: 'absolute',
          inset: 0,
          background: 'var(--adm-bg-card)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease-out',
        } : {
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'none',
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 16px',
          animation: 'fadeIn 0.15s ease-out',
        }}
      >
        <div 
          onClick={(e) => e.stopPropagation()}
          className="smart-note-container"
          style={isFullScreen ? {
            background: 'var(--adm-bg-card)',
            border: 'none',
            borderRadius: 0,
            width: '100%',
            height: '100%',
            boxShadow: 'none',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: "'Inter', sans-serif",
          } : {
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '880px',
            height: '92vh',
            boxShadow: '0 24px 70px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: "'Inter', sans-serif",
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* ── TOP HEADER: Actions & Controls ── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 20px',
            borderBottom: '1px solid var(--adm-border)',
            background: 'var(--adm-bg-input)',
            flexShrink: 0,
          }}>
            {/* Top Left: Fullscreen Toggle & Title Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsFullScreen(!isFullScreen)}
                title={isFullScreen ? 'Reduzir janela' : 'Expandir para área de conteúdo'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--adm-text-muted)',
                  cursor: 'pointer',
                  padding: '5px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>

              <span style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                background: 'rgba(20, 169, 215, 0.12)',
                color: 'var(--adm-accent)',
                padding: '2px 8px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <FileText size={12} />
                <span>Bloco de Nota Inteligente</span>
              </span>
            </div>

            {/* Top Right: Print, Delete, Close & Save */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Print Button (Página 2 do PDF) */}
              <button
                type="button"
                onClick={handlePrint}
                title="Imprimir toda a tarefa"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--adm-border)',
                  color: 'var(--adm-text-body)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  padding: '5px 10px',
                  borderRadius: '7px',
                  transition: 'all 0.15s ease',
                }}
              >
                <Printer size={14} />
                <span>Imprimir</span>
              </button>

              {isCreateMode ? (
                <button
                  type="button"
                  onClick={handleCreateTask}
                  style={{
                    background: 'var(--adm-accent)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '7px',
                    padding: '6px 14px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: 'none',
                  }}
                >
                  <Check size={14} color="#FFFFFF" />
                  <span>{contextInfo.saveButtonLabel}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsConfirmDeleteOpen(true)}
                  title="Excluir tarefa"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--adm-text-muted)',
                    cursor: 'pointer',
                    padding: '5px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--adm-text-muted)'}
                >
                  <Trash2 size={16} />
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                title="Fechar"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--adm-text-muted)',
                  cursor: 'pointer',
                  padding: '5px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* ── SCROLLABLE DOCUMENT BODY ── */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: isFullScreen ? '36px 120px' : '28px 40px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}>
            {/* Task Title (Editable Heading - Clean/Cru) */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                placeholder={contextInfo.titlePlaceholder}
                autoFocus={isCreateMode}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '1.85rem',
                  fontWeight: 800,
                  color: 'var(--adm-text-title)',
                  fontFamily: "'Inter', sans-serif",
                  letterSpacing: '-0.02em',
                  padding: 0,
                }}
              />
            </div>

            {/* ── PROPERTIES TABLE (Bloco de Nota Inteligente) ── */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '6px 0',
              borderBottom: '1px solid var(--adm-border)',
              paddingBottom: '20px',
            }}>
              {/* 1. STATUS (Página 3 do PDF: A fazer, Em andamento, Concluídos + Editar Propriedade) */}
              <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', alignItems: 'center', minHeight: '34px', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--adm-text-muted)', fontSize: '0.82rem' }}>
                  <Circle size={15} color="var(--adm-text-muted)" />
                  <span>Status</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setShowStatusPopover(!showStatusPopover)}
                    style={{
                      background: currentStatusObj.bgColor,
                      color: currentStatusObj.color,
                      border: `1px solid ${currentStatusObj.color}40`,
                      borderRadius: '16px',
                      padding: '4px 12px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: currentStatusObj.color }} />
                    <span>{currentStatusObj.name}</span>
                    <ChevronDown size={13} />
                  </button>

                  {/* Anchored Floating Status Popover (Image 1 & Image 2) */}
                  {showStatusPopover && (
                    <div
                      ref={statusPopoverRef}
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        zIndex: 120,
                        background: 'var(--adm-bg-card)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '12px',
                        boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                        width: statusPopoverMode === 'edit_property' ? '320px' : statusPopoverMode === 'edit_item' ? '300px' : '250px',
                        padding: '10px 12px',
                        marginTop: '4px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        fontFamily: "'Inter', sans-serif",
                        transition: 'width 0.15s ease',
                      }}
                    >
                      {/* VIEW 1: SELECIONAR STATUS */}
                      {statusPopoverMode === 'select' && (
                        <>
                          {/* Grupo: A fazer */}
                          <div>
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--adm-text-muted)', textTransform: 'uppercase', padding: '2px 8px' }}>
                              A fazer
                            </div>
                            {availableStatuses.filter(s => s.groupKey === 'todo').map(s => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => handleSelectStatus(s)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  width: '100%',
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  background: customStatusId === s.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                                  border: 'none',
                                  color: 'var(--adm-text-title)',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  fontSize: '0.8rem',
                                }}
                              >
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
                                <span>{s.name}</span>
                              </button>
                            ))}
                          </div>

                          {/* Grupo: Em andamento */}
                          <div>
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--adm-text-muted)', textTransform: 'uppercase', padding: '2px 8px' }}>
                              Em andamento
                            </div>
                            {availableStatuses.filter(s => s.groupKey === 'in_progress').map(s => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => handleSelectStatus(s)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  width: '100%',
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  background: customStatusId === s.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                                  border: 'none',
                                  color: 'var(--adm-text-title)',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  fontSize: '0.8rem',
                                }}
                              >
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
                                <span>{s.name}</span>
                              </button>
                            ))}
                          </div>

                          {/* Grupo: Concluídos */}
                          <div>
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--adm-text-muted)', textTransform: 'uppercase', padding: '2px 8px' }}>
                              Concluídos
                            </div>
                            {availableStatuses.filter(s => s.groupKey === 'completed').map(s => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => handleSelectStatus(s)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  width: '100%',
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  background: customStatusId === s.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                                  border: 'none',
                                  color: 'var(--adm-text-title)',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  fontSize: '0.8rem',
                                }}
                              >
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
                                <span>{s.name}</span>
                              </button>
                            ))}
                          </div>

                          {!isHomeContext && (
                            <div style={{ borderTop: '1px solid var(--adm-border)', paddingTop: '6px' }}>
                              <button
                                type="button"
                                onClick={() => setStatusPopoverMode('edit_property')}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  width: '100%',
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--adm-text-muted)',
                                  cursor: 'pointer',
                                  fontSize: '0.76rem',
                                  fontWeight: 600,
                                }}
                              >
                                <Settings2 size={13} />
                                <span>Editar propriedade</span>
                              </button>
                            </div>
                          )}
                        </>
                      )}

                      {/* VIEW 2: EDITAR PROPRIEDADE STATUS (Image 1 Reference) */}
                      {statusPopoverMode === 'edit_property' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {/* Header: Back arrow + Title + Close */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--adm-border)', paddingBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => setStatusPopoverMode('select')}
                                style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                              >
                                <ChevronLeft size={16} />
                              </button>
                              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>Status</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => { setShowStatusPopover(false); setStatusPopoverMode('select'); }}
                              style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer', padding: '2px' }}
                            >
                              <X size={14} />
                            </button>
                          </div>

                          {/* Property Name Row */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'var(--adm-bg-input)',
                            border: '1px solid var(--adm-border)',
                            borderRadius: '8px',
                            padding: '6px 10px',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Circle size={14} color="var(--adm-text-muted)" />
                              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--adm-text-title)' }}>Status</span>
                            </div>
                            <Info size={13} color="var(--adm-text-muted)" />
                          </div>

                          {/* Property Type Line */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', fontSize: '0.76rem', color: 'var(--adm-text-muted)' }}>
                            <span>Tipo</span>
                            <span style={{ fontWeight: 600, color: 'var(--adm-text-title)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              Status <ChevronRight size={13} />
                            </span>
                          </div>

                          {/* Status Groups List (A FAZER, EM ANDAMENTO, CONCLUÍDO) */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '280px', overflowY: 'auto' }}>
                            {([
                              { groupKey: 'todo', label: 'A FAZER', color: '#94A3B8' },
                              { groupKey: 'in_progress', label: 'EM ANDAMENTO', color: '#3B82F6' },
                              { groupKey: 'completed', label: 'CONCLUÍDO', color: '#10B981' }
                            ] as const).map(grp => {
                              const items = availableStatuses.filter(s => s.groupKey === grp.groupKey);
                              const isAddingHere = newStatusInGroup === grp.groupKey;

                              return (
                                <div key={grp.groupKey} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
                                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: grp.color, letterSpacing: '0.04em' }}>
                                      {grp.label}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setNewStatusInGroup(grp.groupKey);
                                        setNewStatusName('');
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
                                      title="Adicionar status nesta categoria"
                                    >
                                      <Plus size={13} />
                                    </button>
                                  </div>

                                  {items.map(s => (
                                    <div
                                      key={s.id}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '5px 8px',
                                        borderRadius: '6px',
                                        background: 'var(--adm-bg-input)',
                                        border: '1px solid var(--adm-border)',
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                        <GripVertical size={13} color="var(--adm-text-muted)" style={{ cursor: 'grab' }} />
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                                        <span style={{
                                          fontSize: '0.74rem',
                                          fontWeight: 700,
                                          color: s.color,
                                          background: `${s.color}22`,
                                          padding: '2px 8px',
                                          borderRadius: '12px',
                                          textTransform: 'uppercase',
                                          whiteSpace: 'nowrap',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                        }}>
                                          {s.name}
                                        </span>
                                        {s.isDefault && (
                                          <span style={{
                                            fontSize: '0.62rem',
                                            fontWeight: 800,
                                            color: '#60A5FA',
                                            background: 'rgba(96, 165, 250, 0.15)',
                                            padding: '1px 5px',
                                            borderRadius: '4px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                          }}>
                                            <Flag size={9} /> PADRÃO
                                          </span>
                                        )}
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setStatusItemForEdit(s);
                                          setStatusNameEdit(s.name);
                                          setStatusPopoverMode('edit_item');
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
                                        title="Editar este status"
                                      >
                                        <ChevronRight size={14} />
                                      </button>
                                    </div>
                                  ))}

                                  {/* Quick add status input */}
                                  {isAddingHere && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                      <input
                                        type="text"
                                        value={newStatusName}
                                        onChange={(e) => setNewStatusName(e.target.value)}
                                        placeholder="Nome do status..."
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleAddStatusToGroup(grp.groupKey);
                                          if (e.key === 'Escape') setNewStatusInGroup(null);
                                        }}
                                        style={{
                                          flex: 1,
                                          background: 'var(--adm-bg-input)',
                                          border: '1px solid var(--adm-border)',
                                          borderRadius: '6px',
                                          padding: '4px 8px',
                                          fontSize: '0.76rem',
                                          color: 'var(--adm-text-title)',
                                          outline: 'none',
                                        }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleAddStatusToGroup(grp.groupKey)}
                                        style={{
                                          background: 'var(--adm-accent)',
                                          border: 'none',
                                          color: '#FFFFFF',
                                          borderRadius: '6px',
                                          padding: '4px 8px',
                                          fontSize: '0.72rem',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                        }}
                                      >
                                        Criar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setNewStatusInGroup(null)}
                                        style={{
                                          background: 'transparent',
                                          border: 'none',
                                          color: 'var(--adm-text-muted)',
                                          cursor: 'pointer',
                                          padding: '4px',
                                        }}
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* VIEW 3: EDITAR STATUS INDIVIDUAL (Image 2 Reference) */}
                      {statusPopoverMode === 'edit_item' && statusItemForEdit && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {/* Header: Back + Title + Close */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--adm-border)', paddingBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => setStatusPopoverMode('edit_property')}
                                style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                              >
                                <ChevronLeft size={16} />
                              </button>
                              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>Editar status</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => { setShowStatusPopover(false); setStatusPopoverMode('select'); }}
                              style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer', padding: '2px' }}
                            >
                              <X size={14} />
                            </button>
                          </div>

                          {/* Rename Input */}
                          <div>
                            <label style={{ fontSize: '0.70rem', color: 'var(--adm-text-muted)', display: 'block', marginBottom: '3px' }}>
                              Nome
                            </label>
                            <input
                              type="text"
                              value={statusNameEdit}
                              onChange={(e) => {
                                setStatusNameEdit(e.target.value);
                                handleUpdateStatusName(statusItemForEdit.id, e.target.value);
                              }}
                              style={{
                                width: '100%',
                                background: 'var(--adm-bg-input)',
                                border: '1px solid var(--adm-border)',
                                borderRadius: '6px',
                                padding: '6px 8px',
                                fontSize: '0.78rem',
                                color: 'var(--adm-text-title)',
                                outline: 'none',
                                boxSizing: 'border-box',
                              }}
                            />
                          </div>

                          {/* Group Selector */}
                          <div>
                            <label style={{ fontSize: '0.70rem', color: 'var(--adm-text-muted)', display: 'block', marginBottom: '4px' }}>
                              Agrupar em
                            </label>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {[
                                { key: 'todo', label: 'A fazer' },
                                { key: 'in_progress', label: 'Em andamento' },
                                { key: 'completed', label: 'Concluído' }
                              ].map(grp => (
                                <button
                                  key={grp.key}
                                  type="button"
                                  onClick={() => handleUpdateStatusGroup(statusItemForEdit.id, grp.key as any)}
                                  style={{
                                    flex: 1,
                                    padding: '4px 6px',
                                    borderRadius: '6px',
                                    border: `1px solid ${statusItemForEdit.groupKey === grp.key ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                                    background: statusItemForEdit.groupKey === grp.key ? 'var(--adm-accent-bg)' : 'transparent',
                                    color: statusItemForEdit.groupKey === grp.key ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                                    fontSize: '0.70rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  {grp.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Color Palette (10 colors) */}
                          <div>
                            <label style={{ fontSize: '0.70rem', color: 'var(--adm-text-muted)', display: 'block', marginBottom: '6px' }}>
                              Cor
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                              {COLOR_PALETTE.map(col => {
                                const isSelected = (statusItemForEdit.color || '').toLowerCase() === col.hex.toLowerCase();
                                return (
                                  <button
                                    key={col.hex}
                                    type="button"
                                    onClick={() => handleUpdateStatusColor(statusItemForEdit.id, col.hex)}
                                    title={col.label}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      padding: '4px',
                                      borderRadius: '6px',
                                      background: isSelected ? 'rgba(255,255,255,0.08)' : 'transparent',
                                      border: isSelected ? '1px solid var(--adm-border)' : '1px solid transparent',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <span style={{
                                      width: '16px',
                                      height: '16px',
                                      borderRadius: '50%',
                                      background: col.hex,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}>
                                      {isSelected && <Check size={10} color="#FFFFFF" strokeWidth={3} />}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Action Buttons: Set default & Delete */}
                          <div style={{ borderTop: '1px solid var(--adm-border)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {!statusItemForEdit.isDefault && (
                              <button
                                type="button"
                                onClick={() => handleSetDefaultStatus(statusItemForEdit.id)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--adm-text-muted)',
                                  cursor: 'pointer',
                                  fontSize: '0.74rem',
                                  padding: '5px 4px',
                                }}
                              >
                                <Flag size={13} />
                                <span>Definir como padrão</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteCustomStatus(statusItemForEdit.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: 'transparent',
                                border: 'none',
                                color: '#EF4444',
                                cursor: 'pointer',
                                fontSize: '0.74rem',
                                padding: '5px 4px',
                              }}
                            >
                              <Trash2 size={13} />
                              <span>Excluir status</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. DATA (Label simplificado e limpo) */}
              <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', alignItems: 'center', minHeight: '34px', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--adm-text-muted)', fontSize: '0.82rem' }}>
                  <Calendar size={15} color="var(--adm-text-muted)" />
                  <span>Data</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setShowDatePopover(!showDatePopover)}
                    style={{
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '8px',
                      padding: '5px 12px',
                      fontSize: '0.82rem',
                      color: 'var(--adm-text-title)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>
                      {dueDate && typeof dueDate === 'string' && dueDate.includes('-') ? dueDate.split('-').reverse().join('/') : (dueDate || 'Definir data')}
                      {includeTime && dueTime ? ` ${dueTime}` : ''}
                      {hasEndDate && endDate && typeof endDate === 'string' && endDate.includes('-') ? ` → ${endDate.split('-').reverse().join('/')}` : ''}
                    </span>
                    <ChevronDown size={13} color="var(--adm-text-muted)" />
                  </button>

                  {/* Notion Style Date Popover */}
                  {showDatePopover && (
                    <div
                      ref={datePopoverRef}
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        zIndex: 120,
                        background: 'var(--adm-bg-card)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '12px',
                        boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
                        width: '270px',
                        padding: '14px',
                        marginTop: '6px',
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      {/* Month Navigation & "Hoje" */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                          {monthNames[calendarViewDate.getMonth()]} de {calendarViewDate.getFullYear()}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              const todayStr = new Date().toISOString().split('T')[0];
                              setDueDate(todayStr);
                              if (task) updateTask(task.id, { dueDate: todayStr });
                            }}
                            style={{ background: 'transparent', border: 'none', color: 'var(--adm-accent)', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', padding: '2px 6px' }}
                          >
                            Hoje
                          </button>
                          <button
                            type="button"
                            onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1))}
                            style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer', padding: '2px' }}
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1))}
                            style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer', padding: '2px' }}
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Day of week headers */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '0.66rem', color: 'var(--adm-text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                        <span>dom</span><span>seg</span><span>ter</span><span>qua</span><span>qui</span><span>sex</span><span>sab</span>
                      </div>

                      {/* Days Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center' }}>
                        {calendarDays.map((d, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setDueDate(d.dateStr);
                              if (task) updateTask(task.id, { dueDate: d.dateStr });
                            }}
                            style={{
                              background: d.isSelected ? 'var(--adm-accent)' : d.isToday ? 'rgba(20, 169, 215, 0.15)' : 'transparent',
                              color: d.isSelected ? '#FFFFFF' : d.isCurrentMonth ? 'var(--adm-text-title)' : 'var(--adm-text-muted)',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '5px 0',
                              fontSize: '0.74rem',
                              fontWeight: d.isSelected || d.isToday ? 700 : 500,
                              cursor: 'pointer',
                            }}
                          >
                            {d.day}
                          </button>
                        ))}
                      </div>

                      {/* Toggles & Options */}
                      <div style={{ borderTop: '1px solid var(--adm-border)', marginTop: '12px', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.76rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--adm-text-title)' }}>Data final</span>
                          <input 
                            type="checkbox" 
                            checked={hasEndDate} 
                            onChange={(e) => {
                              setHasEndDate(e.target.checked);
                              if (!e.target.checked && task) updateTask(task.id, { endDate: undefined });
                            }} 
                          />
                        </div>
                        {hasEndDate && (
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => {
                              setEndDate(e.target.value);
                              if (task) updateTask(task.id, { endDate: e.target.value });
                            }}
                            style={{ background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', borderRadius: '6px', padding: '4px 8px', fontSize: '0.76rem', color: 'var(--adm-text-title)' }}
                          />
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--adm-text-title)' }}>Incluir hora</span>
                          <input 
                            type="checkbox" 
                            checked={includeTime} 
                            onChange={(e) => setIncludeTime(e.target.checked)} 
                          />
                        </div>
                        {includeTime && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                              type="time"
                              value={dueTime}
                              onChange={(e) => {
                                setDueTime(e.target.value);
                                if (task) updateTask(task.id, { dueTime: e.target.value });
                              }}
                              style={{ background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', borderRadius: '6px', padding: '4px 8px', fontSize: '0.76rem', color: 'var(--adm-text-title)', width: '100%' }}
                            />
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setDueDate('');
                            setDueTime('');
                            setEndDate('');
                            if (task) updateTask(task.id, { dueDate: '', dueTime: undefined, endDate: undefined });
                            setShowDatePopover(false);
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#EF4444', textAlign: 'left', padding: '4px 0', fontSize: '0.74rem', cursor: 'pointer' }}
                        >
                          Limpar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. VÍNCULO COM LEAD OU CLIENTE (OBRIGATÓRIO NO TOPO PARA FOLLOW-UP, VISITAS/DEGUSTAÇÃO E COMPROMISSOS) */}
              {contextInfo.key !== 'general' && (
                <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', alignItems: 'center', minHeight: '34px', position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--adm-text-muted)', fontSize: '0.82rem' }}>
                    {contextInfo.key === 'followup' ? (
                      <Target size={15} color="#0284C7" />
                    ) : (
                      <Layout size={15} color={contextInfo.key === 'visits_tastings' ? '#059669' : '#7C3AED'} />
                    )}
                    <span style={{ fontWeight: 600, color: 'var(--adm-text-title)' }}>
                      {contextInfo.key === 'appointments' ? 'Cliente *' : contextInfo.key === 'followup' ? 'Lead *' : 'Vínculo (Lead ou Cliente) *'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', position: 'relative' }}>
                    {/* Abas de alternância rápida apenas para Visitas/Degustações e Geral */}
                    {(contextInfo.key === 'visits_tastings' || contextInfo.key === 'general') && (
                      <div style={{
                        display: 'inline-flex',
                        background: 'var(--adm-bg-input)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '8px',
                        padding: '2px',
                        gap: '2px',
                        flexShrink: 0
                      }}>
                        <button
                          type="button"
                          onClick={() => {
                            setLinkMode('lead');
                            setSelectedClientId('');
                          }}
                          style={{
                            border: 'none',
                            borderRadius: '6px',
                            padding: '3px 8px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: linkMode === 'lead' ? '#0284C7' : 'transparent',
                            color: linkMode === 'lead' ? '#FFFFFF' : 'var(--adm-text-muted)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          Lead
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setLinkMode('client');
                            setSelectedLeadId('');
                          }}
                          style={{
                            border: 'none',
                            borderRadius: '6px',
                            padding: '3px 8px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: linkMode === 'client' ? '#7C3AED' : 'transparent',
                            color: linkMode === 'client' ? '#FFFFFF' : 'var(--adm-text-muted)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          Cliente
                        </button>
                      </div>
                    )}

                    {(contextInfo.key === 'followup' || (contextInfo.key !== 'appointments' && linkMode === 'lead')) ? (
                      /* Seletor de Lead do CRM */
                      selectedLead ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedLeadId && onOpenLead) {
                                onOpenLead(selectedLeadId);
                                onClose();
                              }
                            }}
                            style={{
                              background: 'rgba(2, 132, 199, 0.12)',
                              color: '#0284C7',
                              border: '1px solid rgba(2, 132, 199, 0.35)',
                              borderRadius: '8px',
                              padding: '4px 10px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <Target size={13} />
                            <span>Lead: {selectedLead.name}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectLead('')}
                            style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer', fontSize: '0.72rem', textDecoration: 'underline' }}
                          >
                            (trocar)
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowLeadPicker(!showLeadPicker)}
                          style={{
                            background: 'rgba(2, 132, 199, 0.08)',
                            border: '1px dashed rgba(2, 132, 199, 0.4)',
                            borderRadius: '8px',
                            padding: '5px 12px',
                            fontSize: '0.78rem',
                            color: '#0284C7',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <Target size={13} />
                          <span>Selecionar Lead *</span>
                        </button>
                      )
                    ) : (
                      /* Seletor de Cliente do Pós-Venda */
                      selectedClient ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              background: 'rgba(124, 58, 237, 0.12)',
                              color: '#7C3AED',
                              border: '1px solid rgba(124, 58, 237, 0.35)',
                              borderRadius: '8px',
                              padding: '4px 10px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <Users size={13} />
                            <span>Cliente: {selectedClient.name || selectedClient.birthdayPersonName}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSelectClient('')}
                            style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer', fontSize: '0.72rem', textDecoration: 'underline' }}
                          >
                            (trocar)
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowClientPicker(!showClientPicker)}
                          style={{
                            background: 'rgba(124, 58, 237, 0.08)',
                            border: '1px dashed rgba(124, 58, 237, 0.4)',
                            borderRadius: '8px',
                            padding: '5px 12px',
                            fontSize: '0.78rem',
                            color: '#7C3AED',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <Users size={13} />
                          <span>Selecionar Cliente *</span>
                        </button>
                      )
                    )}

                    {/* Lead Picker Popover */}
                    {showLeadPicker && (
                      <div
                        ref={leadPickerRef}
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          zIndex: 120,
                          background: 'var(--adm-bg-card)',
                          border: '1px solid var(--adm-border)',
                          borderRadius: '12px',
                          boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
                          width: '280px',
                          padding: '8px',
                          marginTop: '4px',
                        }}
                      >
                        <input
                          type="text"
                          value={leadSearchTerm}
                          onChange={(e) => setLeadSearchTerm(e.target.value)}
                          placeholder="Buscar lead por nome..."
                          autoFocus
                          style={{
                            width: '100%',
                            background: 'var(--adm-bg-input)',
                            border: '1px solid var(--adm-border)',
                            borderRadius: '6px',
                            padding: '6px 8px',
                            fontSize: '0.76rem',
                            color: 'var(--adm-text-title)',
                            outline: 'none',
                            marginBottom: '6px',
                          }}
                        />
                        <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {leads
                            .filter(l => (l?.name || '').toLowerCase().includes(leadSearchTerm.toLowerCase()))
                            .map(l => (
                              <button
                                key={l.id}
                                type="button"
                                onClick={() => handleSelectLead(l.id)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  background: 'transparent',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '6px 8px',
                                  cursor: 'pointer',
                                  width: '100%',
                                  textAlign: 'left',
                                }}
                              >
                                <span style={{ fontSize: '0.78rem', color: 'var(--adm-text-title)', fontWeight: 600 }}>{l.name}</span>
                                <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>{getLeadStageLabel(l.stage)}</span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Client Picker Popover */}
                    {showClientPicker && (
                      <div
                        ref={clientPickerRef}
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          zIndex: 120,
                          background: 'var(--adm-bg-card)',
                          border: '1px solid var(--adm-border)',
                          borderRadius: '12px',
                          boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
                          width: '280px',
                          padding: '8px',
                          marginTop: '4px',
                        }}
                      >
                        <input
                          type="text"
                          value={clientSearchTerm}
                          onChange={(e) => setClientSearchTerm(e.target.value)}
                          placeholder="Buscar cliente por nome..."
                          autoFocus
                          style={{
                            width: '100%',
                            background: 'var(--adm-bg-input)',
                            border: '1px solid var(--adm-border)',
                            borderRadius: '6px',
                            padding: '6px 8px',
                            fontSize: '0.76rem',
                            color: 'var(--adm-text-title)',
                            outline: 'none',
                            marginBottom: '6px',
                          }}
                        />
                        <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {(clients || [])
                            .filter(c => (c?.name || c?.birthdayPersonName || c?.payerName || '').toLowerCase().includes(clientSearchTerm.toLowerCase()))
                            .map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => handleSelectClient(c.id)}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'flex-start',
                                  gap: '2px',
                                  background: 'transparent',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '6px 8px',
                                  cursor: 'pointer',
                                  width: '100%',
                                  textAlign: 'left',
                                }}
                              >
                                <span style={{ fontSize: '0.78rem', color: 'var(--adm-text-title)', fontWeight: 600 }}>{c.name || c.birthdayPersonName}</span>
                                <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>{c.payerName ? `Resp: ${c.payerName}` : ''} {c.eventDate ? `• Festa: ${c.eventDate}` : ''}</span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 4. PESSOAS / RESPONSÁVEL */}
              <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', alignItems: 'center', minHeight: '34px', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--adm-text-muted)', fontSize: '0.82rem' }}>
                  <Users size={15} color="var(--adm-text-muted)" />
                  <span>{contextInfo.key === 'visits_tastings' ? 'Responsável' : 'Pessoas'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', position: 'relative' }}>
                  {assignedCollabs.map((collab: Collaborator) => (
                    <div
                      key={collab.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'var(--adm-bg-input)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '16px',
                        padding: '3px 8px',
                        fontSize: '0.76rem',
                        color: 'var(--adm-text-title)',
                        fontWeight: 600,
                      }}
                    >
                      <img 
                        src={collab.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(collab.name || 'Colaborador')}&background=14A9D7&color=FFFFFF`}
                        alt={collab.name || 'Colaborador'}
                        style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <span>{collab.name}</span>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setShowCollabPicker(!showCollabPicker)}
                    style={{
                      background: 'transparent',
                      border: '1px dashed var(--adm-border)',
                      borderRadius: '16px',
                      padding: '3px 8px',
                      fontSize: '0.74rem',
                      color: 'var(--adm-text-muted)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Plus size={12} />
                    <span>Adicionar</span>
                  </button>

                  {/* Collaborators Picker Popover */}
                  {showCollabPicker && (
                    <div 
                      ref={collabPickerRef}
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        zIndex: 120,
                        background: 'var(--adm-bg-card)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '12px',
                        boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
                        width: '250px',
                        padding: '8px',
                        marginTop: '4px',
                      }}
                    >
                      <input
                        type="text"
                        value={collabSearchTerm}
                        onChange={(e) => setCollabSearchTerm(e.target.value)}
                        placeholder="Buscar pessoa..."
                        style={{
                          width: '100%',
                          background: 'var(--adm-bg-input)',
                          border: '1px solid var(--adm-border)',
                          borderRadius: '6px',
                          padding: '6px 8px',
                          fontSize: '0.76rem',
                          color: 'var(--adm-text-title)',
                          outline: 'none',
                          marginBottom: '6px',
                        }}
                      />
                      <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {collaborators
                          .filter(c => (c?.name || '').toLowerCase().includes(collabSearchTerm.toLowerCase()))
                          .map(c => {
                            const isAssigned = assignedToIds.includes(c.id);
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => toggleAssignee(c.id)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  background: isAssigned ? 'rgba(20, 169, 215, 0.12)' : 'transparent',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '6px 8px',
                                  cursor: 'pointer',
                                  width: '100%',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <img 
                                    src={c.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(c?.name || 'Colaborador')}&background=14A9D7&color=FFFFFF`}
                                    alt={c.name || 'Colaborador'}
                                    style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }}
                                  />
                                  <span style={{ fontSize: '0.78rem', color: 'var(--adm-text-title)', fontWeight: 600 }}>{c.name || 'Colaborador'}</span>
                                </div>
                                {isAssigned && <UserCheck size={14} color="var(--adm-accent)" />}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 5. SDR NOTIFICADOR & LEMBRETES AUTOMÁTICOS (EXCLUSIVO DE VISITAS & DEGUSTAÇÃO) */}
              {contextInfo.key === 'visits_tastings' && (
                <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', alignItems: 'flex-start', minHeight: '34px', position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--adm-text-muted)', fontSize: '0.82rem', paddingTop: '6px' }}>
                    <BellRing size={15} color="#D97706" />
                    <span style={{ fontWeight: 600, color: 'var(--adm-text-title)' }}>SDR Notificador *</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {selectedSdr ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(217, 119, 6, 0.12)', border: '1px solid rgba(217, 119, 6, 0.35)', borderRadius: '16px', padding: '3px 10px', fontSize: '0.78rem', color: '#D97706', fontWeight: 700 }}>
                          <img 
                            src={selectedSdr.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedSdr.name || 'SDR')}&background=D97706&color=FFFFFF`}
                            alt={selectedSdr.name}
                            style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <span>{selectedSdr.name} (SDR)</span>
                          <button
                            type="button"
                            onClick={() => setSdrAssigneeId('')}
                            style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer', fontSize: '0.7rem', marginLeft: '4px' }}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowSdrPicker(!showSdrPicker)}
                          style={{
                            background: 'rgba(217, 119, 6, 0.08)',
                            border: '1px dashed rgba(217, 119, 6, 0.4)',
                            borderRadius: '16px',
                            padding: '4px 10px',
                            fontSize: '0.74rem',
                            color: '#D97706',
                            cursor: 'pointer',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <UserPlus size={12} />
                          <span>+ Vincular SDR Notificador *</span>
                        </button>
                      )}

                      {/* SDR Popover */}
                      {showSdrPicker && (
                        <div
                          ref={sdrPickerRef}
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            zIndex: 120,
                            background: 'var(--adm-bg-card)',
                            border: '1px solid var(--adm-border)',
                            borderRadius: '12px',
                            boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
                            width: '260px',
                            padding: '8px',
                            marginTop: '4px',
                          }}
                        >
                          <input
                            type="text"
                            value={sdrSearchTerm}
                            onChange={(e) => setSdrSearchTerm(e.target.value)}
                            placeholder="Buscar SDR..."
                            autoFocus
                            style={{
                              width: '100%',
                              background: 'var(--adm-bg-input)',
                              border: '1px solid var(--adm-border)',
                              borderRadius: '6px',
                              padding: '6px 8px',
                              fontSize: '0.76rem',
                              color: 'var(--adm-text-title)',
                              outline: 'none',
                              marginBottom: '6px',
                            }}
                          />
                          <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {sdrCollaborators
                              .filter(c => (c?.name || '').toLowerCase().includes(sdrSearchTerm.toLowerCase()))
                              .map(c => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    setSdrAssigneeId(c.id);
                                    setShowSdrPicker(false);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: sdrAssigneeId === c.id ? 'rgba(217, 119, 6, 0.15)' : 'transparent',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '6px 8px',
                                    cursor: 'pointer',
                                    width: '100%',
                                    textAlign: 'left',
                                  }}
                                >
                                  <img 
                                    src={c.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name || 'SDR')}&background=D97706&color=FFFFFF`}
                                    alt={c.name}
                                    style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }}
                                  />
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--adm-text-title)', fontWeight: 600 }}>{c.name}</span>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>{c.role?.toUpperCase()}</span>
                                  </div>
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Painel de Lembretes Automáticos de Notificação */}
                    {isCreateMode && (
                      <div style={{
                        background: 'rgba(217, 119, 6, 0.05)',
                        border: '1px solid rgba(217, 119, 6, 0.2)',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        marginTop: '2px',
                      }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                          <input 
                            type="checkbox" 
                            checked={enableAutoReminders} 
                            onChange={(e) => setEnableAutoReminders(e.target.checked)} 
                          />
                          <span>Gerar 2 tarefas de lembrete/follow-up automáticas para o SDR</span>
                        </label>
                        {enableAutoReminders && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.72rem', color: 'var(--adm-text-muted)', paddingLeft: '18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>1ª Notificação:</span>
                              <select
                                value={reminder1Days}
                                onChange={(e) => setReminder1Days(Number(e.target.value))}
                                style={{ background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', borderRadius: '4px', padding: '2px 4px', fontSize: '0.72rem', color: 'var(--adm-text-title)' }}
                              >
                                <option value={7}>7 dias antes</option>
                                <option value={5}>5 dias antes</option>
                                <option value={3}>3 dias antes</option>
                                <option value={2}>2 dias antes</option>
                              </select>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>2ª Notificação (Confirmação):</span>
                              <select
                                value={reminder2Days}
                                onChange={(e) => setReminder2Days(Number(e.target.value))}
                                style={{ background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', borderRadius: '4px', padding: '2px 4px', fontSize: '0.72rem', color: 'var(--adm-text-title)' }}
                              >
                                <option value={1}>24h antes</option>
                                <option value={2}>48h antes</option>
                                <option value={0}>No dia do evento</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 6. TIPO (Seletor Profissional com Ícones Lucide SVG, sem Emojis) */}
              <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', alignItems: 'center', minHeight: '34px', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--adm-text-muted)', fontSize: '0.82rem' }}>
                  <RotateCw size={15} color="var(--adm-text-muted)" />
                  <span>{contextInfo.typeLabel} {contextInfo.key === 'visits_tastings' ? '*' : ''}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                  {!isCustomTypeEditing ? (
                    <div style={{ position: 'relative' }}>
                      <button
                        type="button"
                        onClick={() => setShowTypePicker(!showTypePicker)}
                        style={{
                          background: 'var(--adm-bg-input)',
                          color: customType ? 'var(--adm-text-title)' : '#D97706',
                          border: customType ? '1px solid var(--adm-border)' : '1px dashed #D97706',
                          borderRadius: '8px',
                          padding: '5px 12px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {customType ? (
                          <>
                            {renderTaskTypeLucideIcon(customType, 14)}
                            <span>{customType}</span>
                          </>
                        ) : (
                          <span style={{ color: '#D97706', fontStyle: 'italic' }}>+ Selecione o tipo de agendamento *</span>
                        )}
                        <ChevronDown size={13} color="var(--adm-text-muted)" />
                      </button>

                      {/* Dropdown Popover com Ícones SVG Lucide */}
                      {showTypePicker && (
                        <div
                          ref={typePickerRef}
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            zIndex: 130,
                            background: 'var(--adm-bg-card)',
                            border: '1px solid var(--adm-border)',
                            borderRadius: '12px',
                            boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
                            width: '240px',
                            padding: '6px',
                            marginTop: '4px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            maxHeight: '260px',
                            overflowY: 'auto',
                          }}
                        >
                          {contextInfo.types.map(t => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => {
                                setCustomType(t);
                                setShowTypePicker(false);

                                const lead = leads.find(l => l.id === selectedLeadId);
                                const client = (clients || []).find(c => c.id === selectedClientId);
                                const entityName = lead?.name || client?.name || client?.birthdayPersonName;

                                if (entityName && (!title || title.includes('/') || isCreateMode)) {
                                  setTitle(`${entityName} / ${t}`);
                                }

                                if (task) {
                                  const autoTitle = entityName && (!task.title || task.title.includes('/')) ? `${entityName} / ${t}` : task.title;
                                  updateTask(task.id, {
                                    customType: t,
                                    ...(autoTitle !== task.title ? { title: autoTitle } : {}),
                                    customProperties: { ...(task.customProperties || {}), customType: t }
                                  });
                                }
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '7px 10px',
                                borderRadius: '6px',
                                background: customType === t ? 'var(--adm-accent-bg)' : 'transparent',
                                border: 'none',
                                color: customType === t ? 'var(--adm-accent)' : 'var(--adm-text-title)',
                                fontSize: '0.78rem',
                                fontWeight: customType === t ? 700 : 500,
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.12s ease',
                              }}
                              onMouseEnter={(e) => {
                                if (customType !== t) e.currentTarget.style.background = 'var(--adm-bg-input)';
                              }}
                              onMouseLeave={(e) => {
                                if (customType !== t) e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              {renderTaskTypeLucideIcon(t, 14)}
                              <span style={{ flex: 1 }}>{t}</span>
                              {customType === t && <Check size={13} color="var(--adm-accent)" />}
                            </button>
                          ))}

                          {contextInfo.allowCustom && (
                            <div style={{ borderTop: '1px solid var(--adm-border)', marginTop: '4px', paddingTop: '4px' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowTypePicker(false);
                                  setIsCustomTypeEditing(true);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '7px 10px',
                                  borderRadius: '6px',
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--adm-accent)',
                                  fontSize: '0.76rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  width: '100%',
                                  textAlign: 'left',
                                }}
                              >
                                <Edit3 size={13} />
                                <span>Outro (Personalizado)...</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="text"
                        value={customType}
                        onChange={(e) => setCustomType(e.target.value)}
                        onBlur={() => {
                          setIsCustomTypeEditing(false);
                          handleCustomTypeBlur();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setIsCustomTypeEditing(false);
                            handleCustomTypeBlur();
                          }
                        }}
                        placeholder="Ex: Entrega de Amostras..."
                        autoFocus
                        style={{
                          background: 'var(--adm-bg-input)',
                          color: 'var(--adm-text-title)',
                          border: '1px solid var(--adm-accent)',
                          borderRadius: '8px',
                          padding: '5px 10px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          outline: 'none',
                          width: '180px',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setIsCustomTypeEditing(false)}
                        style={{
                          background: 'var(--adm-accent)',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#FFFFFF',
                          padding: '5px 10px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        OK
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 7. PRIORIDADE */}
              <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', alignItems: 'center', minHeight: '34px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--adm-text-muted)', fontSize: '0.82rem' }}>
                  <AlertCircle size={15} color="var(--adm-text-muted)" />
                  <span>Prioridade</span>
                </div>
                <div>
                  <select
                    value={priority}
                    onChange={(e) => {
                      const newPr = e.target.value as TaskPriority;
                      setPriority(newPr);
                      if (task) updateTask(task.id, { priority: newPr });
                    }}
                    style={{
                      background: 'var(--adm-bg-input)',
                      color: priority === 'urgent' ? '#EF4444' : priority === 'high' ? '#F59E0B' : priority === 'medium' ? '#3B82F6' : priority === 'low' ? '#94A3B8' : 'var(--adm-text-muted)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="none">Sem prioridade</option>
                    <option value="low">Baixa</option>
                    <option value="medium">Normal / Média</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
              </div>

              {/* ── PROPRIEDADES ADICIONAIS (Accordion retrátil com seta) ── */}
              <div style={{ marginTop: '10px', borderTop: '1px dashed var(--adm-border)', paddingTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsAdditionalPropsOpen(!isAdditionalPropsOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--adm-text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    padding: '4px 0',
                    marginBottom: isAdditionalPropsOpen ? '10px' : '0',
                  }}
                >
                  <ChevronDown 
                    size={14} 
                    style={{ 
                      transform: isAdditionalPropsOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                      transition: 'transform 0.15s ease' 
                    }} 
                  />
                  <span>Propriedades Adicionais {propertyDefinitions.length > 0 && `(${propertyDefinitions.length})`}</span>
                </button>

                {isAdditionalPropsOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'fadeIn 0.15s ease-out' }}>
                    {/* A. VINCULAR A UM LEAD OU CLIENTE (Exibido aqui apenas no contexto 'general' pois nos demais já é fixo no topo) */}
                    {contextInfo.key === 'general' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', alignItems: 'flex-start', minHeight: '34px', position: 'relative' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--adm-text-muted)', fontSize: '0.82rem' }}>
                            <Layout size={15} color="var(--adm-text-muted)" />
                            <span>Vínculo</span>
                          </div>
                          {isManagerOrAdmin && (
                            <div style={{ display: 'flex', gap: '2px', background: 'var(--adm-bg-input)', padding: '2px', borderRadius: '6px', width: 'fit-content' }}>
                              <button
                                type="button"
                                onClick={() => setLinkMode('lead')}
                                style={{
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '2px 6px',
                                  fontSize: '0.66rem',
                                  fontWeight: 700,
                                  background: linkMode === 'lead' ? 'var(--adm-accent)' : 'transparent',
                                  color: linkMode === 'lead' ? '#FFFFFF' : 'var(--adm-text-muted)',
                                  cursor: 'pointer',
                                }}
                              >
                                Lead
                              </button>
                              <button
                                type="button"
                                onClick={() => setLinkMode('client')}
                                style={{
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '2px 6px',
                                  fontSize: '0.66rem',
                                  fontWeight: 700,
                                  background: linkMode === 'client' ? 'var(--adm-accent)' : 'transparent',
                                  color: linkMode === 'client' ? '#FFFFFF' : 'var(--adm-text-muted)',
                                  cursor: 'pointer',
                                }}
                              >
                                Cliente
                              </button>
                            </div>
                          )}
                        </div>

                        <div style={{ position: 'relative' }}>
                          {linkMode === 'lead' ? (
                            /* Seletor de Lead do CRM */
                            selectedLead ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (selectedLeadId && onOpenLead) {
                                      onOpenLead(selectedLeadId);
                                      onClose();
                                    }
                                  }}
                                  style={{
                                    background: 'rgba(2, 132, 199, 0.12)',
                                    color: '#0284C7',
                                    border: '1px solid rgba(2, 132, 199, 0.35)',
                                    borderRadius: '8px',
                                    padding: '4px 10px',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                  }}
                                >
                                  <span>Lead: {selectedLead.name}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSelectLead('')}
                                  style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer', fontSize: '0.7rem' }}
                                >
                                  (desvincular)
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setShowLeadPicker(!showLeadPicker)}
                                style={{
                                  background: 'transparent',
                                  border: '1px dashed var(--adm-border)',
                                  borderRadius: '8px',
                                  padding: '4px 10px',
                                  fontSize: '0.76rem',
                                  color: 'var(--adm-text-muted)',
                                  cursor: 'pointer',
                                }}
                              >
                                + Selecionar Lead do CRM
                              </button>
                            )
                          ) : (
                            /* Seletor de Cliente do Pós-Venda */
                            selectedClient ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span
                                  style={{
                                    background: 'rgba(124, 58, 237, 0.12)',
                                    color: '#7C3AED',
                                    border: '1px solid rgba(124, 58, 237, 0.35)',
                                    borderRadius: '8px',
                                    padding: '4px 10px',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                  }}
                                >
                                  <span>Cliente: {selectedClient.name || selectedClient.birthdayPersonName}</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleSelectClient('')}
                                  style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer', fontSize: '0.7rem' }}
                                >
                                  (desvincular)
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setShowClientPicker(!showClientPicker)}
                                style={{
                                  background: 'transparent',
                                  border: '1px dashed var(--adm-border)',
                                  borderRadius: '8px',
                                  padding: '4px 10px',
                                  fontSize: '0.76rem',
                                  color: 'var(--adm-text-muted)',
                                  cursor: 'pointer',
                                }}
                              >
                                + Selecionar Cliente / Debutante
                              </button>
                            )
                          )}

                          {/* Lead Picker Popover */}
                          {showLeadPicker && (
                            <div
                              ref={leadPickerRef}
                              style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                zIndex: 120,
                                background: 'var(--adm-bg-card)',
                                border: '1px solid var(--adm-border)',
                                borderRadius: '12px',
                                boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
                                width: '280px',
                                padding: '8px',
                                marginTop: '4px',
                              }}
                            >
                              <input
                                type="text"
                                value={leadSearchTerm}
                                onChange={(e) => setLeadSearchTerm(e.target.value)}
                                placeholder="Buscar lead por nome..."
                                autoFocus
                                style={{
                                  width: '100%',
                                  background: 'var(--adm-bg-input)',
                                  border: '1px solid var(--adm-border)',
                                  borderRadius: '6px',
                                  padding: '6px 8px',
                                  fontSize: '0.76rem',
                                  color: 'var(--adm-text-title)',
                                  outline: 'none',
                                  marginBottom: '6px',
                                }}
                              />
                              <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                {leads
                                  .filter(l => (l?.name || '').toLowerCase().includes(leadSearchTerm.toLowerCase()))
                                  .map(l => (
                                    <button
                                      key={l.id}
                                      type="button"
                                      onClick={() => handleSelectLead(l.id)}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        background: 'transparent',
                                        border: 'none',
                                        borderRadius: '6px',
                                        padding: '6px 8px',
                                        cursor: 'pointer',
                                        width: '100%',
                                        textAlign: 'left',
                                      }}
                                    >
                                      <span style={{ fontSize: '0.78rem', color: 'var(--adm-text-title)', fontWeight: 600 }}>{l.name}</span>
                                      <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>{getLeadStageLabel(l.stage)}</span>
                                    </button>
                                  ))}
                              </div>
                            </div>
                          )}

                          {/* Client Picker Popover */}
                          {showClientPicker && (
                            <div
                              ref={clientPickerRef}
                              style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                zIndex: 120,
                                background: 'var(--adm-bg-card)',
                                border: '1px solid var(--adm-border)',
                                borderRadius: '12px',
                                boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
                                width: '280px',
                                padding: '8px',
                                marginTop: '4px',
                              }}
                            >
                              <input
                                type="text"
                                value={clientSearchTerm}
                                onChange={(e) => setClientSearchTerm(e.target.value)}
                                placeholder="Buscar cliente por nome..."
                                autoFocus
                                style={{
                                  width: '100%',
                                  background: 'var(--adm-bg-input)',
                                  border: '1px solid var(--adm-border)',
                                  borderRadius: '6px',
                                  padding: '6px 8px',
                                  fontSize: '0.76rem',
                                  color: 'var(--adm-text-title)',
                                  outline: 'none',
                                  marginBottom: '6px',
                                }}
                              />
                              <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                {(clients || [])
                                  .filter(c => (c?.name || c?.birthdayPersonName || c?.payerName || '').toLowerCase().includes(clientSearchTerm.toLowerCase()))
                                  .map(c => (
                                    <button
                                      key={c.id}
                                      type="button"
                                      onClick={() => handleSelectClient(c.id)}
                                      style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                        gap: '2px',
                                        background: 'transparent',
                                        border: 'none',
                                        borderRadius: '6px',
                                        padding: '6px 8px',
                                        cursor: 'pointer',
                                        width: '100%',
                                        textAlign: 'left',
                                      }}
                                    >
                                      <span style={{ fontSize: '0.78rem', color: 'var(--adm-text-title)', fontWeight: 600 }}>{c.name || c.birthdayPersonName}</span>
                                      <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>{c.payerName ? `Resp: ${c.payerName}` : ''} {c.eventDate ? `• Festa: ${c.eventDate}` : ''}</span>
                                    </button>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* B. PROPRIEDADES CUSTOMIZADAS DINÂMICAS (com menu ::: Image 2) */}
                    {propertyDefinitions.map(prop => (
                      <div key={prop.id} style={{ display: 'grid', gridTemplateColumns: '170px 1fr', alignItems: 'center', minHeight: '34px', position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--adm-text-muted)', fontSize: '0.82rem', position: 'relative' }}>
                          {!isHomeContext && (
                            <button
                              type="button"
                              onClick={() => setActivePropertyMenuId(activePropertyMenuId === prop.id ? null : prop.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--adm-text-muted)',
                                cursor: 'pointer',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                              title="Opções da propriedade"
                            >
                              <GripVertical size={14} />
                            </button>
                          )}
                          <Tag size={14} />
                          {editingPropertyId === prop.id ? (
                            <input
                              type="text"
                              value={editingPropertyName}
                              onChange={(e) => setEditingPropertyName(e.target.value)}
                              onBlur={() => handleSaveRenameProperty(prop.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRenameProperty(prop.id);
                                if (e.key === 'Escape') setEditingPropertyId(null);
                              }}
                              autoFocus
                              style={{
                                background: 'var(--adm-bg-input)',
                                border: '1px solid var(--adm-accent)',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontSize: '0.78rem',
                                color: 'var(--adm-text-title)',
                                outline: 'none',
                                width: '100px',
                              }}
                            />
                          ) : (
                            <span>{prop.name}</span>
                          )}

                          {/* Property Options Popover (Image 2 Reference) */}
                          {activePropertyMenuId === prop.id && (
                            <div
                              ref={propMenuRef}
                              style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                zIndex: 130,
                                background: 'var(--adm-bg-card)',
                                border: '1px solid var(--adm-border)',
                                borderRadius: '10px',
                                boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
                                width: '180px',
                                padding: '6px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPropertyId(prop.id);
                                  setEditingPropertyName(prop.name);
                                  setActivePropertyMenuId(null);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  width: '100%',
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--adm-text-title)',
                                  fontSize: '0.78rem',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                              >
                                <Edit2 size={13} color="var(--adm-text-muted)" />
                                <span>Renomear</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDuplicateProperty(prop)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  width: '100%',
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--adm-text-title)',
                                  fontSize: '0.78rem',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                              >
                                <Copy size={13} color="var(--adm-text-muted)" />
                                <span>Duplicar</span>
                              </button>

                              <div style={{ borderTop: '1px solid var(--adm-border)', margin: '4px 0' }} />

                              <button
                                type="button"
                                onClick={() => handleDeleteProperty(prop.id)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  width: '100%',
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#EF4444',
                                  fontSize: '0.78rem',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                              >
                                <Trash2 size={13} color="#EF4444" />
                                <span>Excluir propriedade</span>
                              </button>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {prop.type === 'checkbox' ? (
                            <input
                              type="checkbox"
                              checked={Boolean(customProperties[prop.id])}
                              onChange={(e) => handleCustomPropertyChange(prop.id, e.target.checked)}
                            />
                          ) : prop.type === 'number' ? (
                            <input
                              type="number"
                              value={customProperties[prop.id] || ''}
                              onChange={(e) => handleCustomPropertyChange(prop.id, e.target.value)}
                              style={{
                                background: 'var(--adm-bg-input)',
                                border: '1px solid var(--adm-border)',
                                borderRadius: '8px',
                                padding: '4px 10px',
                                fontSize: '0.8rem',
                                color: 'var(--adm-text-title)',
                                outline: 'none',
                              }}
                            />
                          ) : (
                            <input
                              type="text"
                              value={customProperties[prop.id] || ''}
                              onChange={(e) => handleCustomPropertyChange(prop.id, e.target.value)}
                              placeholder={`Preencher ${prop.name.toLowerCase()}...`}
                              style={{
                                background: 'var(--adm-bg-input)',
                                border: '1px solid var(--adm-border)',
                                borderRadius: '8px',
                                padding: '4px 10px',
                                fontSize: '0.8rem',
                                color: 'var(--adm-text-title)',
                                outline: 'none',
                                width: '100%',
                                maxWidth: '320px',
                              }}
                            />
                          )}
                        </div>
                      </div>
                    ))}

                    {/* C. BOTÃO "+ ADICIONAR PROPRIEDADE" (Oculto no contexto do Início) */}
                    {!isHomeContext && (
                      <div style={{ position: 'relative', marginTop: '4px' }}>
                        <button
                          type="button"
                          onClick={() => setShowAddPropertyMenu(!showAddPropertyMenu)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--adm-accent)',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            padding: '4px 0',
                          }}
                        >
                          <Plus size={14} />
                          <span>Adicionar propriedade</span>
                        </button>

                        {/* 10 Supported Types Dropdown Menu */}
                        {showAddPropertyMenu && (
                          <div
                            ref={addPropertyRef}
                            style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              zIndex: 120,
                              background: 'var(--adm-bg-card)',
                              border: '1px solid var(--adm-border)',
                              borderRadius: '12px',
                              boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
                              width: '240px',
                              padding: '8px',
                              marginTop: '4px',
                            }}
                          >
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--adm-text-muted)', textTransform: 'uppercase', padding: '4px 8px' }}>
                              Tipos de Propriedade
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2px', maxHeight: '220px', overflowY: 'auto' }}>
                              {[
                                { type: 'text' as CustomPropertyType, label: 'Texto simples', icon: <FileText size={14} /> },
                                { type: 'number' as CustomPropertyType, label: 'Número', icon: <Hash size={14} /> },
                                { type: 'select' as CustomPropertyType, label: 'Seleção única', icon: <ListFilter size={14} /> },
                                { type: 'multi_select' as CustomPropertyType, label: 'Seleção múltipla', icon: <Tag size={14} /> },
                                { type: 'date' as CustomPropertyType, label: 'Data personalizada', icon: <Calendar size={14} /> },
                                { type: 'checkbox' as CustomPropertyType, label: 'Caixa de seleção', icon: <CheckSquare size={14} /> },
                                { type: 'url' as CustomPropertyType, label: 'Link / URL', icon: <Globe size={14} /> },
                                { type: 'email' as CustomPropertyType, label: 'E-mail', icon: <Mail size={14} /> },
                                { type: 'phone' as CustomPropertyType, label: 'Telefone', icon: <Phone size={14} /> },
                                { type: 'address' as CustomPropertyType, label: 'Endereço', icon: <MapPin size={14} /> },
                              ].map(item => (
                                <button
                                  key={item.type}
                                  type="button"
                                  onClick={() => {
                                    setNewPropType(item.type);
                                    setShowAddPropertyMenu(false);
                                    setNewPropModalOpen(true);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 8px',
                                    borderRadius: '6px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--adm-text-title)',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    fontSize: '0.78rem',
                                  }}
                                >
                                  {item.icon}
                                  <span>{item.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── COMENTÁRIOS E HISTÓRICO (Persistência Real e Cascade) ── */}
            {task && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '0.84rem', color: 'var(--adm-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageSquare size={14} />
                  <span>Comentários</span>
                </div>

                <form onSubmit={handleAddComment}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder="Adicione um comentário..."
                      style={{
                        width: '100%',
                        background: 'var(--adm-bg-input)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '8px',
                        padding: '8px 36px 8px 12px',
                        fontSize: '0.82rem',
                        color: 'var(--adm-text-body)',
                        outline: 'none',
                      }}
                    />
                    {newCommentText.trim() && (
                      <button
                        type="submit"
                        disabled={isSubmittingComment}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'var(--adm-accent)',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Send size={13} color="#FFFFFF" />
                      </button>
                    )}
                  </div>
                </form>

                {/* Comments Stream */}
                {comments.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                    {comments.map(c => (
                      <div 
                        key={c.id} 
                        style={{
                          display: 'flex',
                          gap: '10px',
                          background: 'var(--adm-bg-input)',
                          border: '1px solid var(--adm-border)',
                          borderRadius: '8px',
                          padding: '8px 12px',
                        }}
                      >
                        <img 
                          src={c.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.authorName)}&background=14A9D7&color=FFFFFF`}
                          alt={c.authorName}
                          style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover', marginTop: '2px', flexShrink: 0 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
                            <span style={{ fontWeight: 700, color: 'var(--adm-text-title)' }}>{c.authorName}</span>
                            <span>•</span>
                            <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--adm-text-body)', lineHeight: 1.5, wordBreak: 'break-word' }}>
                            {c.text}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 1. Content / Bloco de Notas Inteligente (Anotações & Observações da Tarefa) */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '140px', marginTop: '6px' }}>
              <textarea
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  setObservations(e.target.value);
                }}
                onBlur={handleContentBlur}
                placeholder="Comece a digitar anotações, observações ou detalhes sobre a tarefa..."
                style={{
                  width: '100%',
                  flex: 1,
                  minHeight: '130px',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--adm-text-body)',
                  fontSize: '0.94rem',
                  lineHeight: 1.6,
                  fontFamily: "'Inter', sans-serif",
                  resize: 'none',
                  padding: 0,
                }}
              />
            </div>

            {/* 2. SEÇÃO INFERIOR: RESULTADO / RESOLUÇÃO DA TAREFA (DESTACADO & FIXO NA BASE) */}
            <div 
              ref={resolutionRef}
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px', 
                padding: '14px', 
                borderRadius: '12px', 
                border: (resolutionHighlight && !resolution.trim() && !allowEmptyResolution)
                  ? '1.5px solid #EF4444'
                  : resolution.trim() 
                    ? '1px solid rgba(16, 185, 129, 0.4)' 
                    : '1px solid rgba(245, 158, 11, 0.4)', 
                background: (resolutionHighlight && !resolution.trim() && !allowEmptyResolution)
                  ? 'rgba(239, 68, 68, 0.06)'
                  : resolution.trim() 
                    ? 'rgba(16, 185, 129, 0.05)' 
                    : 'rgba(245, 158, 11, 0.05)',
                boxShadow: (resolutionHighlight && !resolution.trim() && !allowEmptyResolution)
                  ? '0 0 0 4px rgba(239, 68, 68, 0.15)'
                  : 'none',
                transition: 'all 0.2s ease',
                marginTop: 'auto',
              }}
            >
              {resolutionHighlight && !resolution.trim() && !allowEmptyResolution && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#DC2626',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  marginBottom: '2px',
                }}>
                  <AlertCircle size={15} color="#DC2626" />
                  <span>Para finalizar esta tarefa, preencha qual foi o resultado / desfecho dela.</span>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                  <CheckCircle2 size={16} color={resolution.trim() ? '#10B981' : (resolutionHighlight && !allowEmptyResolution) ? '#EF4444' : '#F59E0B'} />
                  <span>Resultado / Resolução da Tarefa</span>
                </div>
                <span 
                  style={{ 
                    fontSize: '0.7rem', 
                    fontWeight: 700, 
                    padding: '2px 8px', 
                    borderRadius: '20px', 
                    background: resolution.trim() ? 'rgba(16, 185, 129, 0.15)' : (resolutionHighlight && !allowEmptyResolution) ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)', 
                    color: resolution.trim() ? '#10B981' : (resolutionHighlight && !allowEmptyResolution) ? '#EF4444' : '#F59E0B' 
                  }}
                >
                  {resolution.trim() ? 'Preenchido' : allowEmptyResolution ? 'Em Branco (Permitido)' : 'Pendente de Resolução'}
                </span>
              </div>

              <textarea
                value={resolution}
                onChange={(e) => {
                  setResolution(e.target.value);
                  if (e.target.value.trim()) setResolutionHighlight(false);
                }}
                onBlur={handleResolutionBlur}
                placeholder="Descreva o desfecho ou resultado desta tarefa (ex: Degustação realizada e cardápio aprovado; Proposta final enviada...)"
                style={{
                  width: '100%',
                  minHeight: '65px',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--adm-text-body)',
                  fontSize: '0.86rem',
                  lineHeight: 1.5,
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 500,
                  resize: 'vertical',
                }}
              />

              {/* Opção para permitir resultado em branco */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: '4px', borderTop: '1px dashed var(--adm-border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--adm-text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                  <input 
                    type="checkbox" 
                    checked={allowEmptyResolution} 
                    onChange={(e) => {
                      setAllowEmptyResolution(e.target.checked);
                      if (e.target.checked) setResolutionHighlight(false);
                    }} 
                  />
                  <span>Deixar resultado em branco (concluir sem resolução)</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* ── MODAL: ADICIONAR NOVA PROPRIEDADE ── */}
      {newPropModalOpen && (
        <div 
          onClick={() => setNewPropModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            zIndex: 1300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--adm-bg-card)',
              border: '1px solid var(--adm-border)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '360px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
              Nova Propriedade ({newPropType})
            </h3>
            <div>
              <label style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)', display: 'block', marginBottom: '4px' }}>
                Nome do Campo
              </label>
              <input
                type="text"
                value={newPropName}
                onChange={(e) => setNewPropName(e.target.value)}
                placeholder="Ex: Telefone secundário, Link do Drive..."
                autoFocus
                style={{
                  width: '100%',
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '6px',
                  padding: '8px',
                  fontSize: '0.82rem',
                  color: 'var(--adm-text-title)',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setNewPropModalOpen(false)}
                style={{ background: 'transparent', border: '1px solid var(--adm-border)', color: 'var(--adm-text-muted)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddCustomProperty}
                style={{ background: 'var(--adm-accent)', border: 'none', color: '#FFFFFF', padding: '6px 14px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}



      {/* ── MODAL: CONFIRMAR EXCLUSÃO ── */}
      <AdminConfirmModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Excluir Tarefa"
        itemName={task?.title}
        message="Tem certeza que deseja apagar esta tarefa? Todos os comentários e propriedades vinculadas serão removidos permanentemente."
      />

      {/* ── PRINT STYLING ── */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .smart-note-container, .smart-note-container * {
            visibility: visible;
          }
          .smart-note-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            box-shadow: none !important;
            border: none !important;
            background: #FFFFFF !important;
            color: #000000 !important;
          }
          .smart-note-backdrop {
            position: static !important;
            background: transparent !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </>
  );
};
