import { DateField, Select } from '../ui';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, User, Plus, Phone, Mail, Briefcase,
  CheckCircle2, FileText, ExternalLink,
  Edit3, X, Clock, ShieldCheck, CheckSquare,
  MessageSquare, Building2, Trash2, ArrowUpDown, CalendarRange, MapPin, Search, MoreVertical
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { contactService, ContactDuplicateError } from '../../services/contactService';
import { formatPhone } from '../../utils/phoneFormatter';
import { generateUuid } from '../../utils/uuid';
import { toast } from 'sonner';
import type { Contact, ContactDependent, ContactListFilter, Lead, Contract, AdminTabType } from '../../types/admin';
import { supplierService } from '../../services/supplierService';
import { VenueChip } from './contacts/VenueChip';
import { DateRangeField } from '../ui';
import { useScreenSearch } from '../../utils/screenSearch';
import { SupplierPanel } from './contacts/SupplierPanel';
import { ConvertContactModal } from './contacts/ConvertContactModal';
import { canAccessFinance, canViewContractDocument } from '../../utils/accessPermissions';
import { findPhoneConflict, duplicatePhoneMessage } from '../../utils/phoneDuplicates';
import { ContractQuickViewModal } from './ContractQuickViewModal';

interface AdminContactsViewProps {
  onNavigateTab?: (tab: AdminTabType, params?: any) => void;
  onOpenLead?: (leadId: string, funnelId?: string) => void;
  initialContactId?: string | null; // Contato a abrir (vindo da busca global)
  onInitialContactOpened?: () => void;
}

// Sanitização de nomes na UI para remover emojis gráficos de cadastros externos
function cleanDisplayName(name?: string): string {
  if (!name) return '';
  return name.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu, '').trim() || name;
}

export const AdminContactsView: React.FC<AdminContactsViewProps> = ({
  onNavigateTab,
  onOpenLead,
  initialContactId,
  onInitialContactOpened,
}) => {
  const {
    currentUser,
    venues,
    funnels,
    leads,
    collaborators,
    activeVenueId,
    tasks,
    theme,
  } = useAdminState();

  const isLight = theme === 'light';

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const selectedContactRef = React.useRef<Contact | null>(null);
  selectedContactRef.current = selectedContact;
  const [loading, setLoading] = useState(true);
  const [localSearch, setLocalSearch] = useState('');

  // Ativos 360 do contato selecionado
  const [contactAssets, setContactAssets] = useState<{
    leads: Lead[];
    contracts: Contract[];
    dependents: ContactDependent[];
  }>({ leads: [], contracts: [], dependents: [] });
  const [_loadingAssets, setLoadingAssets] = useState(false);

  // Modais de edição, criação e detalhes de contrato
  const [isNewContactModalOpen, setIsNewContactModalOpen] = useState(false);
  const [isEditContactModalOpen, setIsEditContactModalOpen] = useState(false);
  const [isAddDependentModalOpen, setIsAddDependentModalOpen] = useState(false);
  const [viewingContract, setViewingContract] = useState<Contract | null>(null);
  // Aba do detalhe: visao geral ou ficha de fornecedor/colaborador
  const [detailTab, setDetailTab] = useState<'geral' | 'fornecedor'>('geral');
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [collabServiceType, setCollabServiceType] = useState('');
  const [savingCollabLink, setSavingCollabLink] = useState(false);

  // Formulário Rápido de Novo Contato
  const [quickForm, setQuickForm] = useState({
    name: '',
    phone: '',
    email: '',
    venueId: '',
  });

  // Formulário Completo de Contato
  const [formData, setFormData] = useState({
    name: '',
    primaryPhone: '',
    whatsappPhone: '',
    email: '',
    cpf: '',
    rg: '',
    profession: '',
    birthDate: '',
    postalCode: '',
    street: '',
    streetNumber: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    notes: '',
  });

  // Formulário de Dependente
  const [dependentForm, setDependentForm] = useState({
    name: '',
    relationship: 'Filho(a) / Debutante',
    birthDate: '',
    cpf: '',
    phone: '',
    notes: '',
  });

  const scopedMasterId = currentUser?.masterId || currentUser?.id || '00000000-0000-0000-0000-000000000001';
  // Aprovar/reprovar orcamentos de fornecedor: financeiro, pos-venda e gerencia
  const canDecideQuotes = canAccessFinance(currentUser) || canViewContractDocument(currentUser);
  // Transicao de contato: fornecedor ou colaborador (sempre com aviso e confirmacao)
  const [convertTarget, setConvertTarget] = useState<null | { contact: Contact; target: 'supplier' | 'collaborator' }>(null);
  const toggleSupplier = async (c: Contact) => {
    if (!c.isSupplier) { setConvertTarget({ contact: c, target: 'supplier' }); return; }
    if (!window.confirm('Desmarcar este contato como fornecedor? A ficha e os orçamentos continuam guardados.')) return;
    const ok = await contactService.setSupplier(c.id, scopedMasterId, false);
    if (!ok) { toast.error('Não foi possível alterar.'); return; }
    applyContactUpdate({ ...c, isSupplier: false });
    setDetailTab('geral');
    toast.success('Contato não é mais fornecedor.');
  };
  const applyContactUpdate = (updated: Contact) => {
    setSelectedContact(updated);
    setContacts(prev => prev.map(x => (x.id === updated.id ? updated : x)));
    setSearchResults(prev => (prev ? prev.map(x => (x.id === updated.id ? updated : x)) : prev));
  };
  const onConverted = (c: Contact, target: 'supplier' | 'collaborator') => {
    setConvertTarget(null);
    window.dispatchEvent(new Event('f5:suppliers-changed'));
    if (target === 'supplier') {
      applyContactUpdate({ ...c, isSupplier: true });
      setDetailTab('fornecedor');
    } else {
      applyContactUpdate({ ...c, isCollaborator: true });
      setDetailTab('geral');
    }
  };

  const CONTACTS_PAGE_SIZE = 100;
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // Busca SEMPRE no banco: resultados paginados + total real da busca
  const [searchResults, setSearchResults] = useState<Contact[] | null>(null);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  // Total REAL de contatos no banco (não o tamanho da página carregada)
  const [totalContacts, setTotalContacts] = useState(0);
  // Busca local dedicada da tela de Contatos (independente do Ctrl+K universal)
  const screenSearch = useScreenSearch();
  const activeSearchTerm = localSearch.trim();
  // Filtros da lista: Contrato ativo e Fornecedor (consulta no banco, igual a busca)
  const [listFilter, setListFilter] = useState<ContactListFilter>('all');
  const [venueFilter, setVenueFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<'recent' | 'oldest' | 'az' | 'za'>('recent');
  const [createdRange, setCreatedRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const effectiveVenue = venueFilter !== 'all' ? venueFilter : screenSearch.venueId;
  const venueIdsFilter = effectiveVenue !== 'all' ? [effectiveVenue] : undefined;
  const serverMode = Boolean(activeSearchTerm) || listFilter !== 'all' || effectiveVenue !== 'all' || sortKey !== 'recent' || Boolean(createdRange.start);
  const listParams = { filter: listFilter, venueIds: venueIdsFilter, sort: sortKey, createdFrom: createdRange.start || undefined, createdTo: createdRange.end || undefined };
  const [activeContractIds, setActiveContractIds] = useState<Set<string>>(new Set());
  const [quoteCounts, setQuoteCounts] = useState<Map<string, { total: number; pendente: number; aprovado: number }>>(new Map());

  const refreshTotalContacts = useCallback(async () => {
    if (!scopedMasterId) return;
    setTotalContacts(await contactService.countContacts({ masterId: scopedMasterId }));
  }, [scopedMasterId]);

  // Carrega a próxima página (da lista ou da busca, sempre pelo banco)
  const loadMoreContacts = async () => {
    if (loadingMore || !scopedMasterId) return;
    setLoadingMore(true);
    try {
      if (serverMode) {
        const next = await contactService.getContacts({
          masterId: scopedMasterId,
          ...listParams,
          search: activeSearchTerm,
          limit: CONTACTS_PAGE_SIZE,
          offset: searchResults?.length || 0,
        });
        setSearchResults(prev => {
          const base = prev || [];
          const ids = new Set(base.map(c => c.id));
          return [...base, ...next.filter(c => !ids.has(c.id))];
        });
      } else {
        const next = await contactService.getContacts({
          masterId: scopedMasterId,
          limit: CONTACTS_PAGE_SIZE,
          offset: contacts.length,
        });
        setContacts(prev => {
          const ids = new Set(prev.map(c => c.id));
          return [...prev, ...next.filter(c => !ids.has(c.id))];
        });
        setHasMore(next.length === CONTACTS_PAGE_SIZE);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  // Busca no servidor (cobre toda a base): primeira página + total real da busca
  useEffect(() => {
    if (!serverMode || !scopedMasterId) { setSearchResults(null); setSearchTotal(0); setSearchLoading(false); return; }
    let cancelled = false;
    setSearchLoading(true);
    const t = setTimeout(async () => {
      const [res, total] = await Promise.all([
        contactService.getContacts({ masterId: scopedMasterId, search: activeSearchTerm, ...listParams, limit: CONTACTS_PAGE_SIZE }),
        contactService.countContacts({ masterId: scopedMasterId, search: activeSearchTerm, filter: listFilter, venueIds: venueIdsFilter, createdFrom: listParams.createdFrom, createdTo: listParams.createdTo }),
      ]);
      if (cancelled) return;
      setSearchResults(res);
      setSearchTotal(total);
      setSearchLoading(false);
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [activeSearchTerm, listFilter, effectiveVenue, sortKey, createdRange.start, createdRange.end, scopedMasterId]);

  // Tags da lista (Contrato ativo / Fornecedor com orcamentos) dos contatos visiveis
  useEffect(() => {
    const ids = (serverMode ? (searchResults || []) : contacts).map(c => c.id);
    if (!scopedMasterId || ids.length === 0) return;
    let alive = true;
    void contactService.getActiveContractContactIds(scopedMasterId, ids).then(set => { if (alive) setActiveContractIds(prev => new Set([...prev, ...set])); });
    const supplierIds = (serverMode ? (searchResults || []) : contacts).filter(c => c.isSupplier).map(c => c.id);
    if (supplierIds.length > 0) void supplierService.getQuoteCounts(scopedMasterId, supplierIds).then(m => { if (alive) setQuoteCounts(prev => new Map([...prev, ...m])); });
    return () => { alive = false; };
  }, [contacts, searchResults, serverMode, scopedMasterId]);

  // Carrega contatos
  const loadContacts = useCallback(async () => {
    if (!scopedMasterId) return;
    setLoading(true);
    try {
      const res = await contactService.getContacts({
        masterId: scopedMasterId,
        limit: CONTACTS_PAGE_SIZE,
      });

      setContacts(res);
      setHasMore(res.length === CONTACTS_PAGE_SIZE);
      void refreshTotalContacts();

      // Selecao vinda da busca global (ou ja feita pelo usuario) nunca e sobrescrita pelo recarregamento da lista
      if (selectedContactRef.current) return;

      // Checa se há um contato selecionado vindo da busca global
      const savedContactId = typeof window !== 'undefined' ? localStorage.getItem('f5_selected_contact_id') : null;
      if (savedContactId) {
        const found = res.find(c => c.id === savedContactId);
        if (found) {
          setSelectedContact(found);
          try { localStorage.removeItem('f5_selected_contact_id'); } catch { }
          return;
        }
      }

      if (res.length > 0 && (!selectedContact || !res.some(c => c.id === selectedContact.id))) {
        setSelectedContact(res[0]);
      } else if (res.length === 0) {
        setSelectedContact(null);
      }
    } catch (err) {
      console.error('[AdminContactsView] Erro ao carregar contatos:', err);
    } finally {
      setLoading(false);
    }
  }, [scopedMasterId, refreshTotalContacts]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  // Abre o contato escolhido na busca global, mesmo fora da primeira pagina da lista
  useEffect(() => {
    if (!initialContactId || !scopedMasterId) return;
    let cancelled = false;
    (async () => {
      const found = await contactService.getContactById(initialContactId, scopedMasterId);
      if (cancelled) return;
      if (found) {
        setLocalSearch('');
        setSelectedContact(found);
      } else {
        toast.error('Contato não encontrado.');
      }
      onInitialContactOpened?.();
    })();
    return () => { cancelled = true; };
  }, [initialContactId, scopedMasterId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listener para evento de novo contato disparado pela barra superior
  useEffect(() => {
    const handleOpen = () => {
      setQuickForm({
        name: '',
        phone: '',
        email: '',
        venueId: activeVenueId && activeVenueId !== 'all' ? activeVenueId : (venues[0]?.id || ''),
      });
      setIsNewContactModalOpen(true);
    };
    window.addEventListener('f5_open_new_contact', handleOpen);
    return () => window.removeEventListener('f5_open_new_contact', handleOpen);
  }, [activeVenueId, venues]);

  // Casas de festas vinculadas a este contato
  const contactVenues = useMemo(() => {
    if (!selectedContact) return [];
    const venueIdSet = new Set<string>();
    (selectedContact.venueIds || []).forEach(vId => venueIdSet.add(vId));
    contactAssets.leads.forEach(l => { if (l.venueId) venueIdSet.add(l.venueId); });
    contactAssets.contracts.forEach(c => { if (c.venueId) venueIdSet.add(c.venueId); });
    return venues.filter(v => venueIdSet.has(v.id));
  }, [selectedContact, contactAssets, venues]);

  // Permissão de apagar contato (Apenas Master e Gerência)
  const canDeleteContact = currentUser?.role === 'master' || currentUser?.role === 'admin' || currentUser?.role === 'gerencia';

  // Exclusão do contato
  const [_isDeletingContact, setIsDeletingContact] = useState(false);
  const handleDeleteContact = async () => {
    if (!selectedContact || !scopedMasterId) return;
    const confirm = window.confirm(`Deseja realmente excluir o contato "${selectedContact.name}"? Esta ação removerá o contato do sistema.`);
    if (!confirm) return;

    setIsDeletingContact(true);
    try {
      const res = await contactService.deleteContact(selectedContact.id, scopedMasterId);
      if (res.success) {
        toast.success('Contato excluído com sucesso!');
        setSelectedContact(null);
        await loadContacts();
      } else {
        toast.error(res.message || 'Erro ao excluir contato');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir contato');
    } finally {
      setIsDeletingContact(false);
    }
  };

  // Carrega ativos 360 do contato selecionado
  useEffect(() => {
    if (!selectedContact?.id || !scopedMasterId) {
      setContactAssets({ leads: [], contracts: [], dependents: [] });
      return;
    }

    let isMounted = true;
    setLoadingAssets(true);

    contactService.getContactAssets(selectedContact.id, scopedMasterId)
      .then(assets => {
        if (!isMounted) return;
        // Combina com leads em memória
        const memoryLeads = leads.filter(l =>
          l.contactId === selectedContact.id ||
          (l.phone && selectedContact.primaryPhone && l.phone.replace(/\D/g, '') === selectedContact.primaryPhone.replace(/\D/g, ''))
        );
        const combinedLeadsMap = new Map<string, Lead>();
        assets.leads.forEach(l => combinedLeadsMap.set(l.id, l));
        memoryLeads.forEach(l => combinedLeadsMap.set(l.id, l));

        setContactAssets({
          leads: Array.from(combinedLeadsMap.values()),
          contracts: assets.contracts,
          dependents: selectedContact.dependents || [],
        });
      })
      .catch(err => {
        console.error('[AdminContactsView] Erro ao carregar ativos 360:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingAssets(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedContact?.id, scopedMasterId, leads, selectedContact?.dependents]);

  // Iniciar edição do contato
  const handleStartEdit = (contact: Contact) => {
    setFormData({
      name: contact.name || '',
      primaryPhone: contact.primaryPhone || '',
      whatsappPhone: contact.whatsappPhone || contact.secondaryPhone || contact.primaryPhone || '',
      email: contact.email || '',
      cpf: contact.cpf || '',
      rg: contact.rg || '',
      profession: contact.profession || '',
      birthDate: contact.birthDate || '',
      postalCode: contact.postalCode || '',
      street: contact.street || '',
      streetNumber: contact.streetNumber || contact.number || '',
      complement: contact.complement || '',
      neighborhood: contact.neighborhood || '',
      city: contact.city || '',
      state: contact.state || '',
      notes: contact.notes || '',
    });
    setIsEditContactModalOpen(true);
  };

  // Salvar novo contato (Rápido: Nome + Telefone)
  const handleCreateQuickContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickForm.name.trim() || !quickForm.phone.trim()) {
      toast.warning('Nome e Telefone principal são obrigatórios.');
      return;
    }

    try {
      const newContact = await contactService.createContact({
        masterId: scopedMasterId,
        name: quickForm.name.trim(),
        primaryPhone: quickForm.phone.replace(/\D/g, ''),
        email: quickForm.email.trim() || undefined,
        venueId: quickForm.venueId || (activeVenueId && activeVenueId !== 'all' ? activeVenueId : undefined),
      });

      if (newContact) {
        toast.success('Contato cadastrado com sucesso!');
        setContacts(prev => [newContact, ...prev]);
        void refreshTotalContacts();
        setSelectedContact(newContact);
        setIsNewContactModalOpen(false);
        setQuickForm({ name: '', phone: '', email: '', venueId: '' });
      }
    } catch (err: any) {
      if (err instanceof ContactDuplicateError && err.existing) {
        const dup = err.existing;
        toast.warning(`Já cadastrado: ${dup.name}`, { action: { label: 'Abrir', onClick: () => { setSelectedContact(dup); setIsNewContactModalOpen(false); } } });
        return;
      }
      toast.error(`Erro ao criar contato: ${err.message || 'Falha de comunicação'}`);
    }
  };

  // Salvar atualização do contato
  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact?.id) return;

    try {
      const updated = await contactService.updateContact(selectedContact.id, scopedMasterId, {
        name: formData.name.trim(),
        primaryPhone: formData.primaryPhone.replace(/\D/g, ''),
        secondaryPhone: formData.whatsappPhone ? formData.whatsappPhone.replace(/\D/g, '') : undefined,
        whatsappPhone: formData.whatsappPhone ? formData.whatsappPhone.replace(/\D/g, '') : undefined,
        email: formData.email.trim() || undefined,
        cpf: formData.cpf.trim() || undefined,
        rg: formData.rg.trim() || undefined,
        profession: formData.profession.trim() || undefined,
        birthDate: formData.birthDate || undefined,
        postalCode: formData.postalCode.trim() || undefined,
        street: formData.street.trim() || undefined,
        number: formData.streetNumber.trim() || undefined,
        streetNumber: formData.streetNumber.trim() || undefined,
        complement: formData.complement.trim() || undefined,
        neighborhood: formData.neighborhood.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      });

      if (updated) {
        toast.success('Contato atualizado com sucesso!');
        setContacts(prev => prev.map(c => c.id === updated.id ? updated : c));
        setSelectedContact(updated);
        setIsEditContactModalOpen(false);
      }
    } catch (err: any) {
      toast.error(`Erro ao salvar contato: ${err.message || 'Falha de comunicação'}`);
    }
  };

  // Numero do dependente nao pode repetir o do titular nem o de outro dependente do mesmo contato
  const dependentPhoneConflict = selectedContact
    ? findPhoneConflict(dependentForm.phone, [
        { label: `${selectedContact.name || 'Titular'} (titular)`, phone: selectedContact.primaryPhone },
        ...(contactAssets.dependents || []).map(d => ({
          label: `${(d as any).dependentContact?.name || 'Dependente'} (${d.kinship || 'dependente'})`,
          phone: (d as any).dependentContact?.primaryPhone,
        })),
      ])
    : undefined;

  // Adicionar dependente ao grupo familiar
  const handleAddDependent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dependentPhoneConflict) {
      toast.error(duplicatePhoneMessage(dependentPhoneConflict, 'contato'));
      return;
    }
    if (!selectedContact?.id || !dependentForm.name.trim()) {
      toast.warning('Nome do dependente é obrigatório.');
      return;
    }

    try {
      const linked = await contactService.linkFamilyMember({
        masterId: scopedMasterId,
        parentContactId: selectedContact.id,
        name: dependentForm.name,
        phone: dependentForm.phone,
        cpf: dependentForm.cpf,
        birthDate: dependentForm.birthDate || undefined,
        notes: dependentForm.notes.trim() || undefined,
        kinship: dependentForm.relationship,
        fallbackPhone: `${selectedContact.primaryPhone}#${Date.now().toString().slice(-4)}`,
      });

      if (linked) {
        const depItem: ContactDependent = linked.dependent || {
          id: generateUuid(),
          masterId: scopedMasterId,
          parentContactId: selectedContact.id,
          dependentContactId: linked.contact.id,
          kinship: dependentForm.relationship,
          createdAt: new Date().toISOString(),
          dependentContact: linked.contact,
        };

        toast.success(linked.created ? 'Familiar cadastrado e criado como contato.' : 'Contato já existente reconhecido e vinculado ao grupo familiar (nos dois sentidos).');
        setContactAssets(prev => ({
          ...prev,
          dependents: [...prev.dependents, depItem],
        }));
        setIsAddDependentModalOpen(false);
        setDependentForm({
          name: '',
          relationship: 'Filho(a) / Debutante',
          birthDate: '',
          cpf: '',
          phone: '',
          notes: '',
        });
      } else {
        toast.error('Não foi possível vincular: confira nome e telefone (a pessoa não pode ser o próprio titular).');
      }
    } catch (err: any) {
      toast.error(`Erro ao adicionar dependente: ${err.message || 'Falha de comunicação'}`);
    }
  };

  // Lista exibida: com busca, SÓ o que o banco devolveu (nunca filtra a lista carregada na tela)
  const filteredContacts = useMemo(() => {
    if (!serverMode) return contacts;
    return searchResults || [];
  }, [contacts, serverMode, searchResults]);
  // Filtrando: o contato aberto acompanha a lista (abre o primeiro resultado quando o atual saiu)
  useEffect(() => {
    if (!serverMode || !searchResults || searchResults.length === 0) return;
    if (!selectedContact || !searchResults.some(c => c.id === selectedContact.id)) setSelectedContact(searchResults[0]);
  }, [searchResults]); // eslint-disable-line react-hooks/exhaustive-deps
  const searchHasMore = serverMode && (searchResults?.length || 0) < searchTotal;

  // Nome real da etapa do lead
  const getStageRealName = (lead: Lead) => {
    const funnel = funnels.find(f => f.id === lead.funnelId);
    if (funnel?.stages) {
      const st = funnel.stages.find(s => s.id === lead.stage);
      if (st) return st.name || (st as any).title;
    }
    const stageMap: Record<string, string> = {
      new_lead: 'Novo Lead',
      contact_made: 'Contato Realizado',
      presentation_scheduled: 'Visita Agendada',
      proposal_sent: 'Proposta Enviada',
      negotiation: 'Negociação',
      won: 'Fechado',
      lost: 'Perdido',
    };
    return stageMap[lead.stage as string] || lead.stage || 'Entrada';
  };

  // Tarefas vinculadas aos leads deste contato
  const contactTasks = useMemo(() => {
    if (!contactAssets.leads || contactAssets.leads.length === 0) return [];
    const leadIds = new Set(contactAssets.leads.map(l => l.id));
    return (tasks || []).filter(t => t.leadId && leadIds.has(t.leadId));
  }, [contactAssets.leads, tasks]);

  // Separação estrita de Ativos: Clientes no Pós-Venda vs Leads Comerciais
  const postSaleClients = useMemo(() => {
    return (contactAssets.leads || []).filter(l => {
      const funnel = funnels.find(f => f.id === l.funnelId);
      return Boolean(
        funnel?.isPostSale ||
        funnel?.category === 'Pós-Venda' ||
        funnel?.name?.toLowerCase().includes('pós-venda') ||
        funnel?.name?.toLowerCase().includes('pos-venda') ||
        l.isClient ||
        l.group === 'Pós-Venda' ||
        (Array.isArray(l.tags) && l.tags.some(t => t.toLowerCase() === 'cliente'))
      );
    });
  }, [contactAssets.leads, funnels]);

  const commercialLeads = useMemo(() => {
    return (contactAssets.leads || []).filter(l => {
      const funnel = funnels.find(f => f.id === l.funnelId);
      return !Boolean(
        funnel?.isPostSale ||
        funnel?.category === 'Pós-Venda' ||
        funnel?.name?.toLowerCase().includes('pós-venda') ||
        funnel?.name?.toLowerCase().includes('pos-venda') ||
        l.isClient ||
        l.group === 'Pós-Venda' ||
        (Array.isArray(l.tags) && l.tags.some(t => t.toLowerCase() === 'cliente'))
      );
    });
  }, [contactAssets.leads, funnels]);

  // Idade calculada
  const calculateAge = (birthDateStr?: string) => {
    if (!birthDateStr) return null;
    try {
      const birth = new Date(birthDateStr + 'T12:00:00');
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age >= 0 ? `${age} anos` : null;
    } catch {
      return null;
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: '100%',
      backgroundColor: isLight ? '#F8FAFC' : '#0B111E',
      color: isLight ? '#0F172A' : '#FFFFFF',
      overflow: 'hidden',
    }}>
      {/* Workspace Bilateral */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
      }}>
        {/* Lado Esquerdo: Lista de Contatos com Busca Local */}
        <div style={{
          width: '320px',
          minWidth: '280px',
          borderRight: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)'}`,
          backgroundColor: isLight ? '#FFFFFF' : '#0E1726',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header da Coluna com Contagem e Botão Novo */}
          <div style={{
            padding: '12px 16px',
            borderBottom: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.06)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.02)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} color={isLight ? '#2563EB' : '#60A5FA'} />
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: isLight ? '#0F172A' : '#FFFFFF' }}>
                Contatos
              </span>
              <span style={{
                fontSize: '0.70rem',
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: '6px',
                backgroundColor: isLight ? '#EFF6FF' : 'rgba(59, 130, 246, 0.2)',
                color: isLight ? '#1D4ED8' : '#60A5FA',
              }}>
                {serverMode ? searchTotal : totalContacts}
              </span>
            </div>

          </div>

          {/* Filtros da lista (a busca fica so no menu de cima) */}
          {(() => {
            const line = isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.10)';
            const muted = isLight ? '#64748B' : '#94A3B8';
            const field: React.CSSProperties = { width: '100%', height: 34, fontSize: '0.76rem', borderRadius: 9, background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.04)', border: `1px solid ${line}`, paddingLeft: 30, color: isLight ? '#0F172A' : '#FFFFFF' };
            const withIcon = (icon: React.ReactNode, control: React.ReactNode) => (
              <div style={{ position: 'relative', minWidth: 0 }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: muted, display: 'inline-flex', zIndex: 1, pointerEvents: 'none' }}>{icon}</span>
                {control}
              </div>
            );
            const hasActive = Boolean(createdRange.start) || venueFilter !== 'all' || sortKey !== 'recent' || listFilter !== 'all';
            return (
              <div style={{ padding: '14px', borderBottom: `1px solid ${line}`, display: 'flex', flexDirection: 'column', gap: 10, backgroundColor: isLight ? '#FFFFFF' : '#0E1726' }}>
                {/* Busca local dedicada de Contatos */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={14} color={muted} style={{ position: 'absolute', left: 10, pointerEvents: 'none' }} />
                  <input
                    type="text"
                    value={localSearch}
                    onChange={e => setLocalSearch(e.target.value)}
                    placeholder="Buscar contato por nome, telefone ou CPF..."
                    style={{
                      width: '100%',
                      height: 34,
                      fontSize: '0.76rem',
                      borderRadius: 9,
                      background: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${line}`,
                      paddingLeft: 30,
                      paddingRight: localSearch ? 28 : 10,
                      color: isLight ? '#0F172A' : '#FFFFFF',
                      outline: 'none',
                    }}
                  />
                  {localSearch && (
                    <button
                      type="button"
                      onClick={() => setLocalSearch('')}
                      title="Limpar busca"
                      style={{ position: 'absolute', right: 8, background: 'none', border: 'none', cursor: 'pointer', color: muted, display: 'flex', padding: 2 }}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Segmentos: Todos | Contrato ativo | Extras */}
                <div style={{ display: 'flex', padding: 3, gap: 2, borderRadius: 10, background: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.05)' }}>
                  {([
                    { k: 'all', label: 'Todos', active: listFilter === 'all' },
                    { k: 'active_contract', label: 'Contrato ativo', active: listFilter === 'active_contract' },
                    { k: 'extras', label: 'Extras', active: listFilter === 'extras' || listFilter === 'supplier' || listFilter === 'collaborator' },
                  ] as const).map(item => (
                    <button key={item.k} type="button" onClick={() => setListFilter(item.k)}
                      style={{
                        flex: 1, padding: '6px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap',
                        background: item.active ? (isLight ? '#FFFFFF' : '#1E3A5F') : 'transparent',
                        boxShadow: item.active && isLight ? '0 1px 3px rgba(15,23,42,0.12)' : 'none',
                        color: item.active ? '#2563EB' : muted,
                      }}>
                      {item.label}
                    </button>
                  ))}
                </div>

                {(listFilter === 'extras' || listFilter === 'supplier' || listFilter === 'collaborator') && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    {([['extras', 'Todos Extras'], ['supplier', 'Fornecedores'], ['collaborator', 'Colaboradores']] as Array<[ContactListFilter, string]>).map(([k, label]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setListFilter(k)}
                        style={{
                          flex: 1,
                          padding: '4px 6px',
                          borderRadius: 6,
                          border: `1px solid ${listFilter === k ? 'rgba(245, 158, 11, 0.5)' : line}`,
                          background: listFilter === k ? 'rgba(245, 158, 11, 0.14)' : 'transparent',
                          color: listFilter === k ? '#D97706' : muted,
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {withIcon(<Building2 size={14} />, (
                  <Select className="adm-input" value={venueFilter} onChange={e => setVenueFilter(e.target.value)} title="Unidade dos ativos do contato" style={field}>
                    <option value="all">Todas as unidades</option>
                    {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </Select>
                ))}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {withIcon(<ArrowUpDown size={14} />, (
                    <Select className="adm-input" value={sortKey} onChange={e => setSortKey(e.target.value as any)} title="Ordem" style={field}>
                      <option value="recent">Mais recentes</option>
                      <option value="oldest">Mais antigos</option>
                      <option value="az">Nome A–Z</option>
                      <option value="za">Nome Z–A</option>
                    </Select>
                  ))}
                  {withIcon(<CalendarRange size={14} />, (
                    <DateRangeField className="adm-input" start={createdRange.start} end={createdRange.end} onChange={(x, y) => setCreatedRange({ start: x, end: y })} placeholder="Período" style={{ ...field, width: '100%' }} />
                  ))}
                </div>

                {hasActive && (
                  <button type="button" onClick={() => { setCreatedRange({ start: '', end: '' }); setVenueFilter('all'); setSortKey('recent'); setListFilter('all'); }}
                    style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.72rem', fontWeight: 700, color: '#2563EB' }}>
                    Limpar filtros
                  </button>
                )}
              </div>
            );
          })()}

          {/* Lista com Rolagem */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {(loading && contacts.length === 0) || (serverMode && searchLoading && !searchResults) ? (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: isLight ? '#64748B' : '#94A3B8' }}>
                <Clock size={20} className="animate-spin" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                <span style={{ fontSize: '0.8rem' }}>Carregando contatos...</span>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: isLight ? '#64748B' : '#94A3B8' }}>
                <Users size={30} style={{ margin: '0 auto 8px auto', opacity: 0.3 }} />
                <p style={{ margin: '0 0 4px 0', fontSize: '0.82rem', fontWeight: 600, color: isLight ? '#0F172A' : '#FFFFFF' }}>
                  {localSearch ? 'Nenhum contato encontrado' : 'Nenhum contato cadastrado'}
                </p>
                <p style={{ margin: 0, fontSize: '0.74rem' }}>
                  {localSearch ? 'Tente outro termo de busca' : 'Clique em "+ Novo" para cadastrar'}
                </p>
              </div>
            ) : (
              filteredContacts.map(c => {
                const isSelected = selectedContact?.id === c.id;
                const cleanName = cleanDisplayName(c.name);
                const initials = (cleanName || 'Contato')
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map(n => n[0].toUpperCase())
                  .join('');

                const photo = c.profilePictureUrl || (c as any).avatarUrl;

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedContact(c)}
                    style={{
                      padding: '10px 14px',
                      borderBottom: `1px solid ${isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.04)'}`,
                      backgroundColor: isSelected
                        ? (isLight ? '#EFF6FF' : 'rgba(59, 130, 246, 0.15)')
                        : 'transparent',
                      borderLeft: isSelected ? '3px solid #2563EB' : '3px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.12s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.03)';
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {/* Avatar / Foto - Sem Neon */}
                    {photo ? (
                      <img
                        src={photo}
                        alt={cleanName}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: isSelected ? '2px solid #2563EB' : `1px solid ${isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.12)'}`,
                          flexShrink: 0,
                          boxShadow: 'none',
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: isSelected ? '#2563EB' : (isLight ? '#E2E8F0' : '#1E293B'),
                        color: isSelected ? '#FFFFFF' : (isLight ? '#475569' : '#FFFFFF'),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        flexShrink: 0,
                        boxShadow: 'none',
                      }}>
                        {initials}
                      </div>
                    )}

                    {/* Informações Resumidas */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <span style={{
                          fontWeight: 600,
                          fontSize: '0.84rem',
                          color: isLight ? '#0F172A' : '#FFFFFF',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {cleanName}
                        </span>
                        {c.code && (
                          <span style={{
                            fontSize: '0.64rem',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            backgroundColor: isLight ? '#EFF6FF' : 'rgba(59, 130, 246, 0.2)',
                            color: isLight ? '#1D4ED8' : '#60A5FA',
                            letterSpacing: '0.3px',
                            flexShrink: 0,
                          }}>
                            {c.code}
                          </span>
                        )}
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '2px',
                        fontSize: '0.72rem',
                        color: isLight ? '#64748B' : '#94A3B8',
                      }}>
                        <Phone size={10} color={isLight ? '#2563EB' : '#60A5FA'} />
                        <span>{formatPhone(c.primaryPhone) || c.primaryPhone}</span>
                      </div>
                      {(activeContractIds.has(c.id) || c.isSupplier || c.isCollaborator) && (
                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                          {activeContractIds.has(c.id) && (
                            <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '1px 7px', borderRadius: '999px', background: 'rgba(16,185,129,0.15)', color: '#059669' }}>Contrato ativo</span>
                          )}
                          {c.isCollaborator && (
                            <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '1px 7px', borderRadius: '999px', background: 'rgba(139,92,246,0.16)', color: '#7C3AED' }}>Colaborador</span>
                          )}
                          {c.isSupplier && (
                            <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '1px 7px', borderRadius: '999px', background: 'rgba(245,158,11,0.18)', color: '#B45309' }}>
                              Fornecedor{quoteCounts.get(c.id)?.pendente ? ` · ${quoteCounts.get(c.id)!.pendente} orçamento(s) pendente(s)` : ''}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            {(serverMode ? searchHasMore : hasMore) && (
              <button
                type="button"
                onClick={loadMoreContacts}
                disabled={loadingMore}
                style={{ width: '100%', padding: '12px', background: 'transparent', border: 'none', borderTop: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)'}`, color: isLight ? '#475569' : '#94A3B8', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
              >
                {loadingMore ? 'Carregando...' : 'Carregar mais contatos'}
              </button>
            )}
          </div>
        </div>

        {/* Lado Direito: Perfil 360 Completo */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          backgroundColor: isLight ? '#F8FAFC' : '#0B111E',
          padding: '20px 28px',
        }}>
          {selectedContact ? (
            <div style={{ maxWidth: '1120px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>

              {/* Header do Contato Selecionado */}
              <div style={{
                backgroundColor: isLight ? '#FFFFFF' : '#111C2E',
                border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '8px',
                padding: '18px 22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px',
                boxShadow: isLight ? '0 1px 3px rgba(0, 0, 0, 0.04)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {/* Foto do Contato - SEM NEON */}
                  {(selectedContact.profilePictureUrl || (selectedContact as any).avatarUrl) ? (
                    <img
                      src={selectedContact.profilePictureUrl || (selectedContact as any).avatarUrl}
                      alt={selectedContact.name}
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.15)'}`,
                        boxShadow: 'none',
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '50%',
                      backgroundColor: isLight ? '#2563EB' : '#1E293B',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                      fontWeight: 700,
                      boxShadow: 'none',
                      border: `1px solid ${isLight ? '#2563EB' : 'rgba(255, 255, 255, 0.15)'}`,
                    }}>
                      {(cleanDisplayName(selectedContact.name) || 'C')
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map(n => n[0].toUpperCase())
                        .join('')}
                    </div>
                  )}

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h2 style={{
                        margin: 0,
                        fontSize: '1.2rem',
                        fontWeight: 700,
                        color: isLight ? '#0F172A' : '#FFFFFF',
                      }}>
                        {cleanDisplayName(selectedContact.name)}
                      </h2>
                      {selectedContact.code && (
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '6px',
                          backgroundColor: isLight ? '#EFF6FF' : 'rgba(59, 130, 246, 0.2)',
                          color: isLight ? '#1D4ED8' : '#60A5FA',
                          border: `1px solid ${isLight ? '#BFDBFE' : 'rgba(59, 130, 246, 0.35)'}`,
                        }}>
                          {selectedContact.code}
                        </span>
                      )}

                      {activeContractIds.has(selectedContact.id) && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: 'rgba(16,185,129,0.15)', color: '#059669' }}>Contrato ativo</span>
                      )}
                      {selectedContact.isSupplier && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: 'rgba(245,158,11,0.18)', color: '#B45309' }}>Fornecedor</span>
                      )}
                      {selectedContact.isCollaborator && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: 'rgba(139,92,246,0.16)', color: '#7C3AED' }}>Colaborador</span>
                      )}

                      {/* Unidades Físicas Vinculadas (Casas de Festa) */}
                      {contactVenues.map(v => (
                        <span key={v.id} style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.70rem',
                          fontWeight: 600,
                          padding: '2px 7px',
                          borderRadius: '6px',
                          backgroundColor: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.08)',
                          color: isLight ? '#334155' : '#E2E8F0',
                          border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.12)'}`,
                        }}>
                          <Building2 size={11} color={isLight ? '#64748B' : '#94A3B8'} />
                          {v.name}
                        </span>
                      ))}
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginTop: '4px',
                      fontSize: '0.78rem',
                      color: isLight ? '#64748B' : '#94A3B8',
                      flexWrap: 'wrap',
                    }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={12} color={isLight ? '#2563EB' : '#60A5FA'} />
                        {formatPhone(selectedContact.primaryPhone) || selectedContact.primaryPhone}
                      </span>
                      {selectedContact.email && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Mail size={12} color={isLight ? '#64748B' : '#CBD5E1'} />
                          {selectedContact.email}
                        </span>
                      )}
                      {selectedContact.cpf && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <ShieldCheck size={12} color="#10B981" />
                          CPF: {selectedContact.cpf}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botões de Ação Únicos + Menu 3 Pontinhos */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', position: 'relative' }}>
                  {selectedContact.isSupplier && (
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '5px 10px', borderRadius: 999, background: 'rgba(245,158,11,0.16)', color: '#B45309' }}>
                      Fornecedor
                    </span>
                  )}
                  {selectedContact.isCollaborator && (
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '5px 10px', borderRadius: 999, background: 'rgba(139,92,246,0.16)', color: '#7C3AED' }}>
                      Colaborador
                    </span>
                  )}
                  {onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab('whatsapp', { phone: selectedContact.primaryPhone })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '7px 12px',
                        backgroundColor: isLight ? '#ECFDF5' : 'rgba(16, 185, 129, 0.15)',
                        color: isLight ? '#059669' : '#34D399',
                        border: `1px solid ${isLight ? '#A7F3D0' : 'rgba(16, 185, 129, 0.35)'}`,
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <MessageSquare size={13} />
                      WhatsApp
                    </button>
                  )}

                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setIsHeaderMenuOpen(v => !v)}
                      title="Mais ações do contato"
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.14)'}`,
                        backgroundColor: isLight ? '#F8FAFC' : '#162238',
                        color: isLight ? '#0F172A' : '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <MoreVertical size={15} />
                    </button>

                    {isHeaderMenuOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 6px)',
                          right: 0,
                          width: '220px',
                          backgroundColor: isLight ? '#FFFFFF' : '#111C2E',
                          border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.14)'}`,
                          borderRadius: '10px',
                          boxShadow: '0 12px 32px rgba(0,0,0,0.28)',
                          padding: '6px',
                          zIndex: 999,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '3px',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => { setIsHeaderMenuOpen(false); void toggleSupplier(selectedContact); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 10px', borderRadius: '7px', border: 'none', textAlign: 'left', cursor: 'pointer',
                            background: 'transparent', color: isLight ? '#0F172A' : '#E2E8F0', fontSize: '0.78rem', fontWeight: 600,
                          }}
                        >
                          <Briefcase size={14} color="#D97706" />
                          <span>{selectedContact.isSupplier ? 'Desmarcar Fornecedor' : 'Marcar como Fornecedor'}</span>
                        </button>

                        {!selectedContact.isCollaborator ? (
                          <button
                            type="button"
                            onClick={() => { setIsHeaderMenuOpen(false); setConvertTarget({ contact: selectedContact, target: 'collaborator' }); }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 10px', borderRadius: '7px', border: 'none', textAlign: 'left', cursor: 'pointer',
                              background: 'transparent', color: isLight ? '#0F172A' : '#E2E8F0', fontSize: '0.78rem', fontWeight: 600,
                            }}
                          >
                            <Users size={14} color="#7C3AED" />
                            <span>Transformar em Colaborador</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={async () => {
                              setIsHeaderMenuOpen(false);
                              if (!window.confirm('Desmarcar este contato como colaborador?')) return;
                              const ok = await contactService.setCollaborator(selectedContact.id, scopedMasterId, false, null);
                              if (ok) {
                                applyContactUpdate({ ...selectedContact, isCollaborator: false, collaboratorId: null });
                                toast.success('Contato não é mais colaborador.');
                              }
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 10px', borderRadius: '7px', border: 'none', textAlign: 'left', cursor: 'pointer',
                              background: 'transparent', color: isLight ? '#0F172A' : '#E2E8F0', fontSize: '0.78rem', fontWeight: 600,
                            }}
                          >
                            <Users size={14} color="#7C3AED" />
                            <span>Desmarcar Colaborador</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => { setIsHeaderMenuOpen(false); handleStartEdit(selectedContact); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 10px', borderRadius: '7px', border: 'none', textAlign: 'left', cursor: 'pointer',
                            background: 'transparent', color: isLight ? '#0F172A' : '#E2E8F0', fontSize: '0.78rem', fontWeight: 600,
                          }}
                        >
                          <Edit3 size={14} color="#2563EB" />
                          <span>Editar Dados</span>
                        </button>

                        {canDeleteContact && (
                          <button
                            type="button"
                            onClick={() => { setIsHeaderMenuOpen(false); void handleDeleteContact(); }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 10px', borderRadius: '7px', border: 'none', textAlign: 'left', cursor: 'pointer',
                              background: 'transparent', color: '#EF4444', fontSize: '0.78rem', fontWeight: 600,
                            }}
                          >
                            <Trash2 size={14} color="#EF4444" />
                            <span>Excluir Contato</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {(selectedContact.isSupplier || selectedContact.isCollaborator) && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  {([
                    ['geral', 'Visão geral'],
                    ['fornecedor', selectedContact.isSupplier ? 'Fornecedor & Orçamentos' : 'Contratos & Orçamentos'],
                  ] as const).map(([k, label]) => (
                    <button key={k} type="button" onClick={() => setDetailTab(k)}
                      style={{ padding: '7px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, border: 'none', background: detailTab === k ? 'rgba(37,99,235,0.14)' : 'transparent', color: detailTab === k ? '#2563EB' : (isLight ? '#64748B' : '#94A3B8') }}>
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {(selectedContact.isSupplier || selectedContact.isCollaborator) && detailTab === 'fornecedor' ? (
                <SupplierPanel
                  contact={selectedContact}
                  masterId={scopedMasterId}
                  canDecide={canDecideQuotes}
                  userName={currentUser?.name}
                  onProfileSaved={profile => { setSelectedContact({ ...selectedContact, supplierProfile: profile }); setContacts(prev => prev.map(c => (c.id === selectedContact.id ? { ...c, supplierProfile: profile } : c))); }}
                />
              ) : (<>

              {/* Grid: Dados Cadastrais & Grupo Familiar */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                gap: '18px',
              }}>
                {/* 1. Informações Cadastrais Completas */}
                <div style={{
                  backgroundColor: isLight ? '#FFFFFF' : '#111C2E',
                  border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)'}`,
                  borderRadius: '8px',
                  padding: '20px',
                  boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.03)' : 'none',
                }}>
                  <h3 style={{
                    margin: '0 0 16px 0',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    color: isLight ? '#0F172A' : '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <User size={16} color={isLight ? '#2563EB' : '#3B82F6'} />
                    Dados Cadastrais & Pessoais
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.82rem' }}>
                    <div>
                      <span style={{ color: isLight ? '#64748B' : '#94A3B8', display: 'block', marginBottom: '2px', fontSize: '0.72rem' }}>
                        Telefone Principal
                      </span>
                      <strong style={{ color: isLight ? '#0F172A' : '#FFFFFF' }}>
                        {formatPhone(selectedContact.primaryPhone) || selectedContact.primaryPhone}
                      </strong>
                    </div>

                    <div>
                      <span style={{ color: isLight ? '#64748B' : '#94A3B8', display: 'block', marginBottom: '2px', fontSize: '0.72rem' }}>
                        WhatsApp / Secundário
                      </span>
                      <strong style={{ color: isLight ? '#0F172A' : '#FFFFFF' }}>
                        {formatPhone(selectedContact.whatsappPhone || selectedContact.secondaryPhone || '') || 'Mesmo do principal'}
                      </strong>
                    </div>

                    <div>
                      <span style={{ color: isLight ? '#64748B' : '#94A3B8', display: 'block', marginBottom: '2px', fontSize: '0.72rem' }}>
                        E-mail
                      </span>
                      <strong style={{ color: isLight ? '#0F172A' : '#FFFFFF' }}>
                        {selectedContact.email || 'Não informado'}
                      </strong>
                    </div>

                    <div>
                      <span style={{ color: isLight ? '#64748B' : '#94A3B8', display: 'block', marginBottom: '2px', fontSize: '0.72rem' }}>
                        CPF
                      </span>
                      <strong style={{ color: isLight ? '#0F172A' : '#FFFFFF' }}>
                        {selectedContact.cpf || 'Não informado'}
                      </strong>
                    </div>

                    <div>
                      <span style={{ color: isLight ? '#64748B' : '#94A3B8', display: 'block', marginBottom: '2px', fontSize: '0.72rem' }}>
                        RG
                      </span>
                      <strong style={{ color: isLight ? '#0F172A' : '#FFFFFF' }}>
                        {selectedContact.rg || 'Não informado'}
                      </strong>
                    </div>

                    <div>
                      <span style={{ color: isLight ? '#64748B' : '#94A3B8', display: 'block', marginBottom: '2px', fontSize: '0.72rem' }}>
                        Profissão / Ocupação
                      </span>
                      <strong style={{ color: isLight ? '#0F172A' : '#FFFFFF' }}>
                        {selectedContact.profession || 'Não informado'}
                      </strong>
                    </div>

                    <div>
                      <span style={{ color: isLight ? '#64748B' : '#94A3B8', display: 'block', marginBottom: '2px', fontSize: '0.72rem' }}>
                        Data de Nascimento
                      </span>
                      <strong style={{ color: isLight ? '#0F172A' : '#FFFFFF' }}>
                        {selectedContact.birthDate ? (
                          `${new Date(selectedContact.birthDate + 'T12:00:00').toLocaleDateString('pt-BR')} ${calculateAge(selectedContact.birthDate) ? `(${calculateAge(selectedContact.birthDate)})` : ''}`
                        ) : 'Não informado'}
                      </strong>
                    </div>

                    <div>
                      <span style={{ color: isLight ? '#64748B' : '#94A3B8', display: 'block', marginBottom: '2px', fontSize: '0.72rem' }}>
                        CEP
                      </span>
                      <strong style={{ color: isLight ? '#0F172A' : '#FFFFFF' }}>
                        {selectedContact.postalCode || 'Não informado'}
                      </strong>
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: isLight ? '#64748B' : '#94A3B8', display: 'block', marginBottom: '2px', fontSize: '0.72rem' }}>
                        Endereço Completo
                      </span>
                      <strong style={{ color: isLight ? '#0F172A' : '#FFFFFF', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={13} color={isLight ? '#2563EB' : '#60A5FA'} style={{ flexShrink: 0 }} />
                        {selectedContact.street ? (
                          `${selectedContact.street}, ${selectedContact.streetNumber || selectedContact.number || 'S/N'}${selectedContact.complement ? ` - ${selectedContact.complement}` : ''} • ${selectedContact.neighborhood || ''} • ${selectedContact.city || ''}/${selectedContact.state || ''}`
                        ) : 'Endereço não cadastrado'}
                      </strong>
                    </div>

                    {selectedContact.notes && (
                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ color: isLight ? '#64748B' : '#94A3B8', display: 'block', marginBottom: '2px', fontSize: '0.72rem' }}>
                          Observações
                        </span>
                        <p style={{ margin: 0, color: isLight ? '#334155' : '#E2E8F0', whiteSpace: 'pre-wrap', fontSize: '0.80rem' }}>
                          {selectedContact.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Grupo Familiar & Dependentes */}
                <div style={{
                  backgroundColor: isLight ? '#FFFFFF' : '#111C2E',
                  border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)'}`,
                  borderRadius: '8px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.03)' : 'none',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                  }}>
                    <h3 style={{
                      margin: 0,
                      fontSize: '0.92rem',
                      fontWeight: 700,
                      color: isLight ? '#0F172A' : '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}>
                      <Users size={16} color="#10B981" />
                      Grupo Familiar & Dependentes
                    </h3>
                    <button
                      onClick={() => setIsAddDependentModalOpen(true)}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: isLight ? '#ECFDF5' : 'rgba(16, 185, 129, 0.15)',
                        color: isLight ? '#059669' : '#34D399',
                        border: `1px solid ${isLight ? '#A7F3D0' : 'rgba(16, 185, 129, 0.35)'}`,
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Plus size={13} />
                      Adicionar Familiar
                    </button>
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    {contactAssets.dependents.length === 0 ? (
                      <div style={{
                        padding: '26px 16px',
                        textAlign: 'center',
                        color: isLight ? '#64748B' : '#94A3B8',
                        backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.02)',
                        borderRadius: '6px',
                        border: `1px dashed ${isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.08)'}`,
                      }}>
                        <Users size={24} style={{ margin: '0 auto 6px auto', opacity: 0.3 }} />
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.82rem', color: isLight ? '#0F172A' : '#FFFFFF' }}>
                          Nenhum familiar cadastrado
                        </p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.74rem' }}>
                          Cadastre aniversariantes, noivos ou debutantes para acompanhar aniversários e agendas.
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {contactAssets.dependents.map(dep => {
                          const depName = cleanDisplayName(dep.name || dep.dependentContact?.name || 'Dependente');
                          const depRel = dep.relationship || dep.kinship || dep.dependentContact?.relationshipRole || 'Dependente';
                          const depBirth = dep.birthDate || dep.dependentContact?.birthDate;

                          return (
                            <div
                              key={dep.id}
                              style={{
                                padding: '10px 14px',
                                borderRadius: '6px',
                                backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.03)',
                                border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.06)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <strong style={{ fontSize: '0.84rem', color: isLight ? '#0F172A' : '#FFFFFF' }}>
                                    {depName}
                                  </strong>
                                  <span style={{
                                    fontSize: '0.68rem',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: isLight ? '#ECFDF5' : 'rgba(16, 185, 129, 0.15)',
                                    color: isLight ? '#059669' : '#34D399',
                                    fontWeight: 600,
                                  }}>
                                    {depRel}
                                  </span>
                                </div>
                                {depBirth && (
                                  <span style={{ fontSize: '0.74rem', color: isLight ? '#64748B' : '#94A3B8', marginTop: '2px', display: 'block' }}>
                                    Nascimento: {new Date(depBirth + 'T12:00:00').toLocaleDateString('pt-BR')} {calculateAge(depBirth) ? `• ${calculateAge(depBirth)}` : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SESSÃO 1: CLIENTES/LEADS OU GESTÃO DE PARCEIRO/COLABORADOR */}
              {(selectedContact.isSupplier || selectedContact.isCollaborator) ? (
                <div style={{
                  backgroundColor: isLight ? '#FFFFFF' : '#111C2E',
                  border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)'}`,
                  borderRadius: '8px',
                  padding: '20px',
                  boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.03)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 700, color: isLight ? '#0F172A' : '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Briefcase size={16} color={selectedContact.isSupplier ? '#D97706' : '#7C3AED'} />
                        {selectedContact.isSupplier && selectedContact.isCollaborator
                          ? 'Gestão de Fornecedor & Colaborador'
                          : selectedContact.isSupplier
                            ? 'Gestão de Fornecedor & Orçamentos'
                            : 'Gestão de Colaborador & Contratos'}
                      </h3>
                      <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: isLight ? '#64748B' : '#94A3B8' }}>
                        Contatos extras não mantêm leads ou clientes ativos em funis comerciais/pós-venda. Gerencie vínculo, tipo de serviço, contratos e orçamentos abaixo.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDetailTab('fornecedor')}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#2563EB',
                        color: '#FFFFFF',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Gerenciar Contratos & Orçamentos
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: isLight ? '#64748B' : '#94A3B8', marginBottom: '4px' }}>
                        Tipo de Serviço / Segmento
                      </label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="text"
                          className="adm-input"
                          value={collabServiceType || selectedContact.supplierProfile?.serviceType || selectedContact.supplierProfile?.segment || ''}
                          onChange={(e) => setCollabServiceType(e.target.value)}
                          placeholder="Ex: Fotografia, Buffet, Garçom, Decoração..."
                          style={{ flex: 1, height: '34px', fontSize: '0.78rem' }}
                        />
                        <button
                          type="button"
                          disabled={savingCollabLink}
                          onClick={async () => {
                            const nextService = (collabServiceType || selectedContact.supplierProfile?.serviceType || selectedContact.supplierProfile?.segment || '').trim();
                            setSavingCollabLink(true);
                            const nextProfile = { ...(selectedContact.supplierProfile || {}), serviceType: nextService, segment: nextService || selectedContact.supplierProfile?.segment };
                            const ok = await contactService.setSupplier(selectedContact.id, scopedMasterId, Boolean(selectedContact.isSupplier), nextProfile);
                            setSavingCollabLink(false);
                            if (ok) {
                              applyContactUpdate({ ...selectedContact, supplierProfile: nextProfile });
                              toast.success('Tipo de serviço salvo.');
                            } else {
                              toast.error('Erro ao salvar tipo de serviço.');
                            }
                          }}
                          style={{
                            padding: '0 12px',
                            borderRadius: '7px',
                            border: 'none',
                            background: '#059669',
                            color: '#FFFFFF',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Salvar
                        </button>
                      </div>
                    </div>

                    {selectedContact.isCollaborator && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: isLight ? '#64748B' : '#94A3B8', marginBottom: '4px' }}>
                          Vínculo com Base de Funcionários
                        </label>
                        <Select
                          className="adm-input"
                          value={selectedContact.collaboratorId || ''}
                          onChange={async (e) => {
                            const cId = e.target.value || null;
                            const ok = await contactService.setCollaborator(selectedContact.id, scopedMasterId, true, cId);
                            if (ok) {
                              applyContactUpdate({ ...selectedContact, isCollaborator: true, collaboratorId: cId });
                              toast.success(cId ? 'Vínculo com colaborador atualizado.' : 'Vínculo removido.');
                            } else {
                              toast.error('Não foi possível vincular colaborador.');
                            }
                          }}
                          style={{ width: '100%', height: '34px', fontSize: '0.78rem' }}
                        >
                          <option value="">Selecionar colaborador da equipe...</option>
                          {collaborators.map(col => (
                            <option key={col.id} value={col.id}>
                              {col.name} {col.role ? `(${col.role})` : ''}
                            </option>
                          ))}
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
              {/* SESSÃO 1A: CLIENTES NO PÓS-VENDA */}
              <div style={{
                backgroundColor: isLight ? '#FFFFFF' : '#111C2E',
                border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)'}`,
                borderRadius: '8px',
                padding: '20px',
                boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.03)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '0.94rem',
                    fontWeight: 700,
                    color: isLight ? '#0F172A' : '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <ShieldCheck size={16} color={isLight ? '#059669' : '#10B981'} />
                    Clientes no Pós-Venda ({postSaleClients.length})
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: isLight ? '#64748B' : '#94A3B8' }}>
                    Clientes em esteira e atendimento de pós-venda
                  </span>
                </div>

                {postSaleClients.length === 0 ? (
                  <div style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    color: isLight ? '#64748B' : '#94A3B8',
                    backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '6px',
                  }}>
                    <ShieldCheck size={24} style={{ margin: '0 auto 6px auto', opacity: 0.3 }} />
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.82rem', color: isLight ? '#0F172A' : '#FFFFFF' }}>
                      Nenhum cliente ativo no pós-venda
                    </p>
                    <p style={{ margin: '3px 0 0 0', fontSize: '0.74rem' }}>
                      Quando este contato contrata uma festa ou é vinculado a um contrato, ele é acompanhado no pós-venda.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {postSaleClients.map(lead => {
                      const funnel = funnels.find(f => f.id === lead.funnelId);
                      const venue = venues.find(v => v.id === lead.venueId);

                      return (
                        <div
                          key={lead.id}
                          style={{
                            padding: '14px 16px',
                            borderRadius: '8px',
                            backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.03)',
                            border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '8px',
                              backgroundColor: isLight ? '#ECFDF5' : 'rgba(16, 185, 129, 0.15)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: isLight ? '#059669' : '#10B981',
                            }}>
                              <ShieldCheck size={18} />
                            </div>

                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <strong style={{ color: isLight ? '#0F172A' : '#FFFFFF', fontSize: '0.88rem' }}>
                                  {funnel?.name || 'Pós-Venda'}
                                </strong>
                                <span style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: isLight ? '#ECFDF5' : 'rgba(16, 185, 129, 0.2)',
                                  color: isLight ? '#047857' : '#34D399',
                                  letterSpacing: '0.5px',
                                }}>
                                  CLIENTE
                                </span>
                                {lead.code && (
                                  <span style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: isLight ? '#FEF3C7' : 'rgba(212, 175, 55, 0.2)',
                                    color: isLight ? '#B45309' : '#D4AF37',
                                    letterSpacing: '0.5px',
                                  }}>
                                    {lead.code}
                                  </span>
                                )}
                                <span style={{
                                  fontSize: '0.70rem',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: isLight ? '#ECFDF5' : 'rgba(16, 185, 129, 0.2)',
                                  color: isLight ? '#047857' : '#34D399',
                                  fontWeight: 600,
                                }}>
                                  Etapa: {getStageRealName(lead)}
                                </span>
                              </div>

                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                marginTop: '4px',
                                fontSize: '0.76rem',
                                color: isLight ? '#64748B' : '#94A3B8',
                                flexWrap: 'wrap',
                              }}>
                                <VenueChip venueId={lead.venueId} fallbackName={venue?.name} />
                                {lead.dealValue ? <span>Valor: <strong style={{ color: '#10B981' }}>R$ {lead.dealValue.toLocaleString('pt-BR')}</strong></span> : null}
                                {lead.partyDate && <span>Festa: <strong>{new Date(lead.partyDate + 'T12:00:00').toLocaleDateString('pt-BR')}</strong></span>}
                              </div>
                            </div>
                          </div>

                          {/* Acesso ao Pós-Venda */}
                          {onOpenLead && (
                            <button
                              onClick={() => onOpenLead(lead.id, lead.funnelId)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '7px 12px',
                                backgroundColor: isLight ? '#ECFDF5' : 'rgba(16, 185, 129, 0.2)',
                                color: isLight ? '#047857' : '#34D399',
                                border: `1px solid ${isLight ? '#A7F3D0' : 'rgba(16, 185, 129, 0.35)'}`,
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <ExternalLink size={13} />
                              Abrir no Pós-Venda
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SESSÃO 1B: LEADS COMERCIAIS ATIVOS */}
              <div style={{
                backgroundColor: isLight ? '#FFFFFF' : '#111C2E',
                border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)'}`,
                borderRadius: '8px',
                padding: '20px',
                boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.03)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '0.94rem',
                    fontWeight: 700,
                    color: isLight ? '#0F172A' : '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <Briefcase size={16} color={isLight ? '#2563EB' : '#3B82F6'} />
                    Leads Comerciais ({commercialLeads.length})
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: isLight ? '#64748B' : '#94A3B8' }}>
                    Oportunidades em funis comerciais de venda
                  </span>
                </div>

                {commercialLeads.length === 0 ? (
                  <div style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    color: isLight ? '#64748B' : '#94A3B8',
                    backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '6px',
                  }}>
                    <Briefcase size={24} style={{ margin: '0 auto 6px auto', opacity: 0.3 }} />
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.82rem', color: isLight ? '#0F172A' : '#FFFFFF' }}>
                      Nenhum lead comercial ativo
                    </p>
                    <p style={{ margin: '3px 0 0 0', fontSize: '0.74rem' }}>
                      Quando este contato interage com campanhas comerciais ou WhatsApp, o card do lead é posicionado no funil.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {commercialLeads.map(lead => {
                      const funnel = funnels.find(f => f.id === lead.funnelId);
                      const venue = venues.find(v => v.id === lead.venueId);

                      return (
                        <div
                          key={lead.id}
                          style={{
                            padding: '14px 16px',
                            borderRadius: '8px',
                            backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.03)',
                            border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '8px',
                              backgroundColor: isLight ? '#EFF6FF' : 'rgba(59, 130, 246, 0.15)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: isLight ? '#2563EB' : '#3B82F6',
                            }}>
                              <Briefcase size={18} />
                            </div>

                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <strong style={{ color: isLight ? '#0F172A' : '#FFFFFF', fontSize: '0.88rem' }}>
                                  {funnel?.name || 'Funil Comercial'}
                                </strong>
                                <span style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: isLight ? '#EFF6FF' : 'rgba(59, 130, 246, 0.2)',
                                  color: isLight ? '#1D4ED8' : '#60A5FA',
                                  letterSpacing: '0.5px',
                                }}>
                                  LEAD
                                </span>
                                {lead.commercialCode && (
                                  <span style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: isLight ? '#FEF3C7' : 'rgba(212, 175, 55, 0.2)',
                                    color: isLight ? '#B45309' : '#D4AF37',
                                    letterSpacing: '0.5px',
                                  }}>
                                    {lead.commercialCode}
                                  </span>
                                )}
                                <span style={{
                                  fontSize: '0.70rem',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: isLight ? '#EFF6FF' : 'rgba(59, 130, 246, 0.2)',
                                  color: isLight ? '#1D4ED8' : '#60A5FA',
                                  fontWeight: 600,
                                }}>
                                  Etapa: {getStageRealName(lead)}
                                </span>
                              </div>

                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                marginTop: '4px',
                                fontSize: '0.76rem',
                                color: isLight ? '#64748B' : '#94A3B8',
                                flexWrap: 'wrap',
                              }}>
                                <VenueChip venueId={lead.venueId} fallbackName={venue?.name} />
                                {lead.sdrName && <span>SDR: <strong style={{ color: isLight ? '#0F172A' : '#E2E8F0' }}>{lead.sdrName}</strong></span>}
                                {lead.closerName && <span>Closer: <strong style={{ color: isLight ? '#0F172A' : '#E2E8F0' }}>{lead.closerName}</strong></span>}
                                {lead.dealValue ? <span>Valor: <strong style={{ color: '#10B981' }}>R$ {lead.dealValue.toLocaleString('pt-BR')}</strong></span> : null}
                                {lead.createdAt && <span>Entrada: {new Date(lead.createdAt).toLocaleDateString('pt-BR')}</span>}
                              </div>
                            </div>
                          </div>

                          {/* Acesso ao CRM */}
                          {onOpenLead && (
                            <button
                              onClick={() => onOpenLead(lead.id, lead.funnelId)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '7px 12px',
                                backgroundColor: isLight ? '#EFF6FF' : 'rgba(59, 130, 246, 0.2)',
                                color: isLight ? '#1D4ED8' : '#60A5FA',
                                border: `1px solid ${isLight ? '#BFDBFE' : 'rgba(59, 130, 246, 0.35)'}`,
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <ExternalLink size={13} />
                              Abrir no CRM Comercial
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
                </>
              )}

              {/* SESSÃO 2: CONTRATOS DE EVENTOS */}
              <div style={{
                backgroundColor: isLight ? '#FFFFFF' : '#111C2E',
                border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)'}`,
                borderRadius: '8px',
                padding: '20px',
                boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.03)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '0.94rem',
                    fontWeight: 700,
                    color: isLight ? '#0F172A' : '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <FileText size={16} color="#D4AF37" />
                    Contratos de Eventos ({contactAssets.contracts.length})
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: isLight ? '#64748B' : '#94A3B8' }}>
                    Contratos formalizados e histórico imutável
                  </span>
                </div>

                {contactAssets.contracts.length === 0 ? (
                  <div style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    color: isLight ? '#64748B' : '#94A3B8',
                    backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '6px',
                  }}>
                    <FileText size={24} style={{ margin: '0 auto 6px auto', opacity: 0.3 }} />
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.82rem', color: isLight ? '#0F172A' : '#FFFFFF' }}>
                      Nenhum contrato formalizado para este contato
                    </p>
                    <p style={{ margin: '3px 0 0 0', fontSize: '0.74rem' }}>
                      Após o fechamento comercial, o contrato aprovado é catalogado nesta sessão com blindagem jurídica unilateral.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {contactAssets.contracts.map(ctr => (
                      <div
                        key={ctr.id}
                        style={{
                          padding: '14px 16px',
                          borderRadius: '8px',
                          backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.03)',
                          border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '8px',
                            backgroundColor: ctr.approvalStatus === 'approved' ? (isLight ? '#ECFDF5' : 'rgba(16, 185, 129, 0.15)') : (isLight ? '#FEF3C7' : 'rgba(245, 158, 11, 0.15)'),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: ctr.approvalStatus === 'approved' ? '#10B981' : '#F59E0B',
                          }}>
                            <FileText size={18} />
                          </div>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <strong style={{ color: '#D4AF37', fontSize: '0.90rem', fontFamily: 'monospace' }}>
                                {ctr.contractCode}
                              </strong>
                              <span style={{
                                fontSize: '0.70rem',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                backgroundColor: ctr.approvalStatus === 'approved' ? (isLight ? '#ECFDF5' : 'rgba(16, 185, 129, 0.15)') : (isLight ? '#FEF3C7' : 'rgba(245, 158, 11, 0.15)'),
                                color: ctr.approvalStatus === 'approved' ? '#059669' : '#D97706',
                                fontWeight: 600,
                              }}>
                                {ctr.approvalStatus === 'approved' ? 'Aprovado / Vigente' : 'Aguardando Homologação'}
                              </span>
                            </div>

                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              marginTop: '4px',
                              fontSize: '0.76rem',
                              color: isLight ? '#64748B' : '#94A3B8',
                              flexWrap: 'wrap',
                            }}>
                              <VenueChip venueId={ctr.venueId} fallbackName={ctr.venueName} />
                              {ctr.eventDate && <span>Festa: <strong style={{ color: isLight ? '#0F172A' : '#E2E8F0' }}>{new Date(ctr.eventDate + 'T12:00:00').toLocaleDateString('pt-BR')}</strong></span>}
                              {(ctr.totalAmount || ctr.contractValue) ? <span>Valor: <strong style={{ color: '#10B981' }}>R$ {(ctr.totalAmount || ctr.contractValue || 0).toLocaleString('pt-BR')}</strong></span> : null}
                              {ctr.closerName && <span>Closer: <strong style={{ color: isLight ? '#0F172A' : '#E2E8F0' }}>{ctr.closerName}</strong></span>}
                              {ctr.approvedByName && <span>Aprovado por: <strong style={{ color: '#059669' }}>{ctr.approvedByName}</strong></span>}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => setViewingContract(ctr)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '7px 12px',
                            backgroundColor: isLight ? '#FEF3C7' : 'rgba(212, 175, 55, 0.15)',
                            color: isLight ? '#B45309' : '#D4AF37',
                            border: `1px solid ${isLight ? '#FDE68A' : 'rgba(212, 175, 55, 0.35)'}`,
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <FileText size={13} />
                          Ver Contrato
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SESSÃO 3: TAREFAS OPERACIONAIS */}
              <div style={{
                backgroundColor: isLight ? '#FFFFFF' : '#111C2E',
                border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)'}`,
                borderRadius: '8px',
                padding: '20px',
                boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.03)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '0.94rem',
                    fontWeight: 700,
                    color: isLight ? '#0F172A' : '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <CheckSquare size={16} color="#A855F7" />
                    Tarefas & Próximas Ações ({contactTasks.length})
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: isLight ? '#64748B' : '#94A3B8' }}>
                    Compromissos e pendências operacionais
                  </span>
                </div>

                {contactTasks.length === 0 ? (
                  <div style={{
                    padding: '20px 16px',
                    textAlign: 'center',
                    color: isLight ? '#64748B' : '#94A3B8',
                    backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '6px',
                  }}>
                    <CheckCircle2 size={22} style={{ margin: '0 auto 4px auto', color: '#10B981', opacity: 0.8 }} />
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.82rem', color: isLight ? '#0F172A' : '#FFFFFF' }}>
                      Nenhuma tarefa pendente para este contato
                    </p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem' }}>
                      Tudo em dia! Tarefas adicionadas aos leads aparecem aqui.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {contactTasks.map(t => (
                      <div
                        key={t.id}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '6px',
                          backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.03)',
                          border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.06)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CheckSquare size={15} color={t.status === 'completed' ? '#10B981' : '#A855F7'} />
                          <div>
                            <strong style={{ color: isLight ? '#0F172A' : '#FFFFFF', fontSize: '0.82rem' }}>{t.title}</strong>
                            <div style={{ fontSize: '0.72rem', color: isLight ? '#64748B' : '#94A3B8', marginTop: '1px', display: 'flex', gap: '8px' }}>
                              <VenueChip venueId={t.venueId || leads.find(l => l.id === t.leadId)?.venueId} />
                              {t.dueDate && <span>Vencimento: {t.dueDate}</span>}
                              {t.assignedToName && <span>Responsável: {t.assignedToName}</span>}
                            </div>
                          </div>
                        </div>

                        <span style={{
                          fontSize: '0.66rem',
                          fontWeight: 600,
                          padding: '1px 7px',
                          borderRadius: '6px',
                          backgroundColor: t.status === 'completed' ? (isLight ? '#ECFDF5' : 'rgba(16, 185, 129, 0.15)') : (isLight ? '#FEF3C7' : 'rgba(245, 158, 11, 0.15)'),
                          color: t.status === 'completed' ? '#059669' : '#D97706',
                        }}>
                          {t.status === 'completed' ? 'Concluída' : 'Pendente'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              </>)}
            </div>
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: isLight ? '#64748B' : '#94A3B8',
              padding: '40px',
            }}>
              <Users size={48} style={{ opacity: 0.3, marginBottom: '14px' }} />
              <h3 style={{ margin: '0 0 4px 0', color: isLight ? '#0F172A' : '#FFFFFF', fontSize: '1.05rem' }}>
                Nenhum contato selecionado
              </h3>
              <p style={{ margin: 0, fontSize: '0.82rem' }}>
                Selecione um contato na lista à esquerda ou busque no topo do sistema.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Cadastro Rápido de Novo Contato */}
      {isNewContactModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
          backdropFilter: 'blur(3px)',
        }}>
          <div style={{
            backgroundColor: isLight ? '#FFFFFF' : '#111C2E',
            border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.15)'}`,
            borderRadius: '10px',
            width: '100%',
            maxWidth: '460px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.02)',
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '1.05rem',
                fontWeight: 700,
                color: isLight ? '#0F172A' : '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <Users size={18} color="#2563EB" />
                Cadastrar Novo Contato
              </h2>
              <button
                onClick={() => setIsNewContactModalOpen(false)}
                style={{ background: 'none', border: 'none', color: isLight ? '#64748B' : '#94A3B8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateQuickContact} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: isLight ? '#475569' : '#94A3B8', marginBottom: '4px', fontWeight: 600 }}>
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={quickForm.name}
                  onChange={e => setQuickForm({ ...quickForm, name: e.target.value })}
                  placeholder="Ex: Fernanda Souza"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: isLight ? '#F8FAFC' : '#162238',
                    border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.12)'}`,
                    color: isLight ? '#0F172A' : '#FFFFFF',
                    fontSize: '0.86rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: isLight ? '#475569' : '#94A3B8', marginBottom: '4px', fontWeight: 600 }}>
                  Telefone / WhatsApp Principal *
                </label>
                <input
                  type="text"
                  required
                  value={quickForm.phone}
                  onChange={e => setQuickForm({ ...quickForm, phone: e.target.value })}
                  placeholder="(21) 99999-9999"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: isLight ? '#F8FAFC' : '#162238',
                    border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.12)'}`,
                    color: isLight ? '#0F172A' : '#FFFFFF',
                    fontSize: '0.86rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: isLight ? '#475569' : '#94A3B8', marginBottom: '4px' }}>
                  E-mail (opcional)
                </label>
                <input
                  type="email"
                  value={quickForm.email}
                  onChange={e => setQuickForm({ ...quickForm, email: e.target.value })}
                  placeholder="cliente@email.com"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: isLight ? '#F8FAFC' : '#162238',
                    border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.12)'}`,
                    color: isLight ? '#0F172A' : '#FFFFFF',
                    fontSize: '0.86rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: isLight ? '#475569' : '#94A3B8', marginBottom: '4px' }}>
                  Unidade Principal (opcional)
                </label>
                <Select
                  value={quickForm.venueId}
                  onChange={e => setQuickForm({ ...quickForm, venueId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: isLight ? '#F8FAFC' : '#162238',
                    border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.12)'}`,
                    color: isLight ? '#0F172A' : '#FFFFFF',
                    fontSize: '0.86rem',
                    outline: 'none',
                  }}
                >
                  <option value="">Todas as unidades</option>
                  {venues.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </Select>
              </div>

              <div style={{
                marginTop: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '8px',
              }}>
                <button
                  type="button"
                  onClick={() => setIsNewContactModalOpen(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    backgroundColor: 'transparent',
                    border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.12)'}`,
                    color: isLight ? '#64748B' : '#94A3B8',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    backgroundColor: '#2563EB',
                    border: 'none',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                  }}
                >
                  Salvar Contato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edição Completa de Contato */}
      {isEditContactModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
          backdropFilter: 'blur(3px)',
        }}>
          <div style={{
            backgroundColor: isLight ? '#FFFFFF' : '#111C2E',
            border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.15)'}`,
            borderRadius: '10px',
            width: '100%',
            maxWidth: '640px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.02)',
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '1.05rem',
                fontWeight: 700,
                color: isLight ? '#0F172A' : '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <Edit3 size={18} color="#2563EB" />
                Editar Dados do Contato
              </h2>
              <button
                onClick={() => setIsEditContactModalOpen(false)}
                style={{ background: 'none', border: 'none', color: isLight ? '#64748B' : '#94A3B8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateContact} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: isLight ? '#475569' : '#94A3B8', marginBottom: '3px', fontWeight: 600 }}>
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        backgroundColor: isLight ? '#F8FAFC' : '#162238',
                        border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.12)'}`,
                        color: isLight ? '#0F172A' : '#FFFFFF',
                        fontSize: '0.84rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: isLight ? '#475569' : '#94A3B8', marginBottom: '3px', fontWeight: 600 }}>
                      Telefone Principal *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.primaryPhone}
                      onChange={e => setFormData({ ...formData, primaryPhone: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        backgroundColor: isLight ? '#F8FAFC' : '#162238',
                        border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.12)'}`,
                        color: isLight ? '#0F172A' : '#FFFFFF',
                        fontSize: '0.84rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: isLight ? '#475569' : '#94A3B8', marginBottom: '3px' }}>
                      WhatsApp Secundário
                    </label>
                    <input
                      type="text"
                      value={formData.whatsappPhone}
                      onChange={e => setFormData({ ...formData, whatsappPhone: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        backgroundColor: isLight ? '#F8FAFC' : '#162238',
                        border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.12)'}`,
                        color: isLight ? '#0F172A' : '#FFFFFF',
                        fontSize: '0.84rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: isLight ? '#475569' : '#94A3B8', marginBottom: '3px' }}>
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        backgroundColor: isLight ? '#F8FAFC' : '#162238',
                        border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.12)'}`,
                        color: isLight ? '#0F172A' : '#FFFFFF',
                        fontSize: '0.84rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: isLight ? '#475569' : '#94A3B8', marginBottom: '3px' }}>
                      CPF
                    </label>
                    <input
                      type="text"
                      value={formData.cpf}
                      onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        backgroundColor: isLight ? '#F8FAFC' : '#162238',
                        border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.12)'}`,
                        color: isLight ? '#0F172A' : '#FFFFFF',
                        fontSize: '0.84rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: isLight ? '#475569' : '#94A3B8', marginBottom: '3px' }}>
                      RG
                    </label>
                    <input
                      type="text"
                      value={formData.rg}
                      onChange={e => setFormData({ ...formData, rg: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        backgroundColor: isLight ? '#F8FAFC' : '#162238',
                        border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.12)'}`,
                        color: isLight ? '#0F172A' : '#FFFFFF',
                        fontSize: '0.84rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: isLight ? '#475569' : '#94A3B8', marginBottom: '3px' }}>
                      Profissão / Ocupação
                    </label>
                    <input
                      type="text"
                      value={formData.profession}
                      onChange={e => setFormData({ ...formData, profession: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        backgroundColor: isLight ? '#F8FAFC' : '#162238',
                        border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.12)'}`,
                        color: isLight ? '#0F172A' : '#FFFFFF',
                        fontSize: '0.84rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: isLight ? '#475569' : '#94A3B8', marginBottom: '3px' }}>
                      Data de Nascimento
                    </label>
                    <DateField
                      value={formData.birthDate}
                      onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        backgroundColor: isLight ? '#F8FAFC' : '#162238',
                        border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.12)'}`,
                        color: isLight ? '#0F172A' : '#FFFFFF',
                        fontSize: '0.84rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: isLight ? '#475569' : '#94A3B8', marginBottom: '3px' }}>
                      CEP
                    </label>
                    <input
                      type="text"
                      value={formData.postalCode}
                      onChange={e => setFormData({ ...formData, postalCode: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        backgroundColor: isLight ? '#F8FAFC' : '#162238',
                        border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.12)'}`,
                        color: isLight ? '#0F172A' : '#FFFFFF',
                        fontSize: '0.84rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: isLight ? '#475569' : '#94A3B8', marginBottom: '3px' }}>
                      Endereço (Rua, Número, Bairro, Cidade, Estado)
                    </label>
                    <input
                      type="text"
                      value={formData.street}
                      onChange={e => setFormData({ ...formData, street: e.target.value })}
                      placeholder="Ex: Av. das Américas, 500 - Barra da Tijuca, Rio de Janeiro - RJ"
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        backgroundColor: isLight ? '#F8FAFC' : '#162238',
                        border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.12)'}`,
                        color: isLight ? '#0F172A' : '#FFFFFF',
                        fontSize: '0.84rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: isLight ? '#475569' : '#94A3B8', marginBottom: '3px' }}>
                      Observações Internas
                    </label>
                    <textarea
                      rows={2}
                      value={formData.notes}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Anotações sobre preferências..."
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        backgroundColor: isLight ? '#F8FAFC' : '#162238',
                        border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.12)'}`,
                        color: isLight ? '#0F172A' : '#FFFFFF',
                        fontSize: '0.84rem',
                        outline: 'none',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{
                padding: '14px 20px',
                borderTop: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '8px',
              }}>
                <button
                  type="button"
                  onClick={() => setIsEditContactModalOpen(false)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    backgroundColor: 'transparent',
                    border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.12)'}`,
                    color: isLight ? '#64748B' : '#94A3B8',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '7px 16px',
                    borderRadius: '6px',
                    backgroundColor: '#2563EB',
                    border: 'none',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                  }}
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Adicionar Familiar */}
      {isAddDependentModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
          backdropFilter: 'blur(3px)',
        }}>
          <div style={{
            backgroundColor: isLight ? '#FFFFFF' : '#111C2E',
            border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.15)'}`,
            borderRadius: '10px',
            width: '100%',
            maxWidth: '460px',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.02)',
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '1.05rem',
                fontWeight: 700,
                color: isLight ? '#0F172A' : '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <Users size={18} color="#10B981" />
                Adicionar Membro Familiar
              </h2>
              <button
                onClick={() => setIsAddDependentModalOpen(false)}
                style={{ background: 'none', border: 'none', color: isLight ? '#64748B' : '#94A3B8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddDependent}>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: isLight ? '#475569' : '#94A3B8', marginBottom: '3px', fontWeight: 600 }}>
                    Nome do Familiar *
                  </label>
                  <input
                    type="text"
                    required
                    value={dependentForm.name}
                    onChange={e => setDependentForm({ ...dependentForm, name: e.target.value })}
                    placeholder="Ex: Beatriz Souza"
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      backgroundColor: isLight ? '#F8FAFC' : '#162238',
                      border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.12)'}`,
                      color: isLight ? '#0F172A' : '#FFFFFF',
                      fontSize: '0.84rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: isLight ? '#475569' : '#94A3B8', marginBottom: '3px' }}>
                      Papel / Grau
                    </label>
                    <Select
                      value={dependentForm.relationship}
                      onChange={e => setDependentForm({ ...dependentForm, relationship: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        backgroundColor: isLight ? '#F8FAFC' : '#162238',
                        border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.12)'}`,
                        color: isLight ? '#0F172A' : '#FFFFFF',
                        fontSize: '0.84rem',
                        outline: 'none',
                      }}
                    >
                      <option value="Filho(a) / Debutante">Filho(a) / Debutante</option>
                      <option value="Cônjuge / Noivo(a)">Cônjuge / Noivo(a)</option>
                      <option value="Aniversariante">Aniversariante</option>
                      <option value="Pai/Mãe">Pai/Mãe</option>
                      <option value="Irmão(ã)">Irmão(ã)</option>
                      <option value="Outro">Outro</option>
                    </Select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: isLight ? '#475569' : '#94A3B8', marginBottom: '3px' }}>
                      Data de Nascimento
                    </label>
                    <DateField
                      value={dependentForm.birthDate}
                      onChange={e => setDependentForm({ ...dependentForm, birthDate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        backgroundColor: isLight ? '#F8FAFC' : '#162238',
                        border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.12)'}`,
                        color: isLight ? '#0F172A' : '#FFFFFF',
                        fontSize: '0.84rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: isLight ? '#475569' : '#94A3B8', marginBottom: '3px' }}>
                      Telefone / Celular (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="(21) 99999-9999"
                      value={dependentForm.phone}
                      onChange={e => setDependentForm({ ...dependentForm, phone: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        backgroundColor: isLight ? '#F8FAFC' : '#162238',
                        border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.12)'}`,
                        color: isLight ? '#0F172A' : '#FFFFFF',
                        fontSize: '0.84rem',
                        outline: 'none',
                      }}
                    />
                  {dependentPhoneConflict && (
                    <div style={{ fontSize: '0.70rem', fontWeight: 600, color: '#EF4444', marginTop: '4px' }}>
                      {duplicatePhoneMessage(dependentPhoneConflict, 'contato')}
                    </div>
                  )}
                  </div>
                </div>
              </div>

              <div style={{
                padding: '14px 20px',
                borderTop: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '8px',
              }}>
                <button
                  type="button"
                  onClick={() => setIsAddDependentModalOpen(false)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    backgroundColor: 'transparent',
                    border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.12)'}`,
                    color: isLight ? '#64748B' : '#94A3B8',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={Boolean(dependentPhoneConflict)}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '6px',
                    backgroundColor: '#10B981',
                    border: 'none',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                  }}
                >
                  Salvar Familiar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {convertTarget && (
        <ConvertContactModal masterId={scopedMasterId} contact={convertTarget.contact} target={convertTarget.target} by={{ id: currentUser?.id, name: currentUser?.name }}
          onClose={() => setConvertTarget(null)} onDone={t => onConverted(convertTarget.contact, t)} />
      )}

      {/* Ver contrato: mesma ficha da Agenda de Eventos (sem acesso ao documento para quem nao pode) */}
      <ContractQuickViewModal contract={viewingContract} onClose={() => setViewingContract(null)} />
    </div>
  );
};
