import { DateField, Select } from '../ui';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, User, Plus, Phone, Mail, Briefcase,
  CheckCircle2, FileText, ExternalLink,
  Edit3, X, Clock, ShieldCheck, CheckSquare,
  MessageSquare, Building2, Trash2, Search, MapPin
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { contactService, ContactDuplicateError } from '../../services/contactService';
import { formatPhone } from '../../utils/phoneFormatter';
import { generateUuid } from '../../utils/uuid';
import { toast } from 'sonner';
import type { Contact, ContactDependent, Lead, Contract, AdminTabType } from '../../types/admin';
import { findPhoneConflict, duplicatePhoneMessage } from '../../utils/phoneDuplicates';

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

  const CONTACTS_PAGE_SIZE = 100;
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // Busca SEMPRE no banco: resultados paginados + total real da busca
  const [searchResults, setSearchResults] = useState<Contact[] | null>(null);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  // Total REAL de contatos no banco (não o tamanho da página carregada)
  const [totalContacts, setTotalContacts] = useState(0);
  const activeSearchTerm = localSearch.trim().length >= 2 ? localSearch.trim() : '';

  const refreshTotalContacts = useCallback(async () => {
    if (!scopedMasterId) return;
    setTotalContacts(await contactService.countContacts({ masterId: scopedMasterId }));
  }, [scopedMasterId]);

  // Carrega a próxima página (da lista ou da busca, sempre pelo banco)
  const loadMoreContacts = async () => {
    if (loadingMore || !scopedMasterId) return;
    setLoadingMore(true);
    try {
      if (activeSearchTerm) {
        const next = await contactService.getContacts({
          masterId: scopedMasterId,
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
    if (!activeSearchTerm || !scopedMasterId) { setSearchResults(null); setSearchTotal(0); setSearchLoading(false); return; }
    let cancelled = false;
    setSearchLoading(true);
    const t = setTimeout(async () => {
      const [res, total] = await Promise.all([
        contactService.getContacts({ masterId: scopedMasterId, search: activeSearchTerm, limit: CONTACTS_PAGE_SIZE }),
        contactService.countContacts({ masterId: scopedMasterId, search: activeSearchTerm }),
      ]);
      if (cancelled) return;
      setSearchResults(res);
      setSearchTotal(total);
      setSearchLoading(false);
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [activeSearchTerm, scopedMasterId]);

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
    if (!activeSearchTerm) return contacts;
    return searchResults || [];
  }, [contacts, activeSearchTerm, searchResults]);
  const searchHasMore = Boolean(activeSearchTerm) && (searchResults?.length || 0) < searchTotal;

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
                {activeSearchTerm ? searchTotal : totalContacts}
              </span>
            </div>

            <button
              onClick={() => {
                setQuickForm({
                  name: '',
                  phone: '',
                  email: '',
                  venueId: activeVenueId && activeVenueId !== 'all' ? activeVenueId : (venues[0]?.id || ''),
                });
                setIsNewContactModalOpen(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.74rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Plus size={13} />
              Novo
            </button>
          </div>

          {/* Campo de Busca Rápida Local */}
          <div style={{
            padding: '8px 12px',
            borderBottom: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.06)'}`,
            backgroundColor: isLight ? '#FFFFFF' : '#0E1726',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              borderRadius: '6px',
              backgroundColor: isLight ? '#F1F5F9' : '#162238',
              border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.1)'}`,
            }}>
              <Search size={13} color={isLight ? '#64748B' : '#94A3B8'} />
              <input
                type="text"
                placeholder="Filtrar por nome, telefone, código..."
                value={localSearch}
                onChange={e => setLocalSearch(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.78rem',
                  color: isLight ? '#0F172A' : '#FFFFFF',
                  width: '100%',
                }}
              />
              {localSearch && (
                <button
                  onClick={() => setLocalSearch('')}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: isLight ? '#94A3B8' : '#64748B' }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Lista com Rolagem */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {(loading && contacts.length === 0) || (activeSearchTerm && searchLoading && !searchResults) ? (
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
                    </div>
                  </div>
                );
              })
            )}
            {(activeSearchTerm ? searchHasMore : hasMore) && (
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

                {/* Botões de Ação Únicos */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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

                  <button
                    onClick={() => handleStartEdit(selectedContact)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '7px 12px',
                      backgroundColor: isLight ? '#F8FAFC' : '#162238',
                      color: isLight ? '#0F172A' : '#FFFFFF',
                      border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.14)'}`,
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Edit3 size={13} />
                    Editar Dados
                  </button>

                  {/* Botão Excluir Contato (Apenas Master e Gerente) */}
                  {canDeleteContact && (
                    <button
                      onClick={handleDeleteContact}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '7px 10px',
                        backgroundColor: isLight ? '#FEF2F2' : 'rgba(239, 68, 68, 0.12)',
                        color: isLight ? '#DC2626' : '#EF4444',
                        border: `1px solid ${isLight ? '#FECACA' : 'rgba(239, 68, 68, 0.25)'}`,
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      title="Excluir este contato do sistema"
                    >
                      <Trash2 size={13} />
                      Excluir
                    </button>
                  )}
                </div>
              </div>

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

              {/* SESSÃO 1: LEADS COMERCIAIS ATIVOS */}
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
                    Leads Comerciais ({contactAssets.leads.length})
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: isLight ? '#64748B' : '#94A3B8' }}>
                    Oportunidades em funis de venda
                  </span>
                </div>

                {contactAssets.leads.length === 0 ? (
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
                      Quando este contato interage com campanhas ou WhatsApp, o card do lead é posicionado no funil.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {contactAssets.leads.map(lead => {
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
                                {venue && <span>Unidade: <strong style={{ color: isLight ? '#0F172A' : '#E2E8F0' }}>{venue.name}</strong></span>}
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
                              Abrir no CRM
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

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
                              <span>Unidade: <strong style={{ color: isLight ? '#0F172A' : '#E2E8F0' }}>{ctr.venueName}</strong></span>
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

      {/* Modal: Ver Detalhes do Contrato */}
      {viewingContract && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
          backdropFilter: 'blur(3px)',
        }}>
          <div style={{
            backgroundColor: isLight ? '#FFFFFF' : '#111C2E',
            border: `1px solid ${isLight ? '#D4AF37' : 'rgba(212, 175, 55, 0.35)'}`,
            borderRadius: '10px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.02)',
            }}>
              <div>
                <h2 style={{
                  margin: 0,
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: isLight ? '#0F172A' : '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  Contrato {viewingContract.contractCode}
                  <span style={{
                    fontSize: '0.70rem',
                    fontWeight: 600,
                    padding: '2px 7px',
                    borderRadius: '4px',
                    backgroundColor: viewingContract.approvalStatus === 'approved' ? (isLight ? '#ECFDF5' : 'rgba(16, 185, 129, 0.2)') : (isLight ? '#FEF3C7' : 'rgba(245, 158, 11, 0.2)'),
                    color: viewingContract.approvalStatus === 'approved' ? '#059669' : '#D97706',
                  }}>
                    {viewingContract.approvalStatus === 'approved' ? 'Aprovado & Ativo' : 'Aguardando Aprovação'}
                  </span>
                </h2>
                <span style={{ fontSize: '0.74rem', color: isLight ? '#64748B' : '#94A3B8' }}>
                  Unidade: {viewingContract.venueName} • Criado em {new Date(viewingContract.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <button
                onClick={() => setViewingContract(null)}
                style={{ background: 'none', border: 'none', color: isLight ? '#64748B' : '#94A3B8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Snapshot Cliente */}
              <div style={{
                backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.02)',
                padding: '14px',
                borderRadius: '8px',
                border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.06)'}`,
              }}>
                <span style={{ fontSize: '0.74rem', color: '#2563EB', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Titular do Contrato (Snapshot Jurídico)
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.80rem' }}>
                  <div>Nome: <strong style={{ color: isLight ? '#0F172A' : '#FFFFFF' }}>{viewingContract.clientSnapshot?.name || 'Cliente'}</strong></div>
                  <div>Telefone: <strong style={{ color: isLight ? '#0F172A' : '#FFFFFF' }}>{formatPhone(viewingContract.clientSnapshot?.phone || '')}</strong></div>
                  <div>CPF: <strong style={{ color: isLight ? '#0F172A' : '#FFFFFF' }}>{viewingContract.clientSnapshot?.cpf || 'Não informado'}</strong></div>
                  <div>E-mail: <strong style={{ color: isLight ? '#0F172A' : '#FFFFFF' }}>{viewingContract.clientSnapshot?.email || 'Não informado'}</strong></div>
                </div>
              </div>

              {/* Condições do Evento */}
              <div style={{
                backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.02)',
                padding: '14px',
                borderRadius: '8px',
                border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.06)'}`,
              }}>
                <span style={{ fontSize: '0.74rem', color: '#10B981', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Condições Comerciais e da Festa
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.80rem' }}>
                  <div>Data da Festa: <strong style={{ color: isLight ? '#0F172A' : '#FFFFFF' }}>{viewingContract.eventDate ? new Date(viewingContract.eventDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'A definir'}</strong></div>
                  <div>Valor do Contrato: <strong style={{ color: '#10B981' }}>R$ {(viewingContract.totalAmount || viewingContract.contractValue || 0).toLocaleString('pt-BR')}</strong></div>
                  <div>Convidados: <strong style={{ color: isLight ? '#0F172A' : '#FFFFFF' }}>{viewingContract.guestCount || 'Não informado'}</strong></div>
                  <div>Pacote: <strong style={{ color: isLight ? '#0F172A' : '#FFFFFF' }}>{viewingContract.packageName || 'Padrão'}</strong></div>
                </div>
              </div>

              {/* Responsáveis Eternos */}
              <div style={{
                backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.02)',
                padding: '14px',
                borderRadius: '8px',
                border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.06)'}`,
              }}>
                <span style={{ fontSize: '0.74rem', color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Responsáveis Preservados
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.80rem' }}>
                  <div>SDR: <strong style={{ color: isLight ? '#0F172A' : '#FFFFFF' }}>{viewingContract.sdrName || 'Não atribuído'}</strong></div>
                  <div>Closer: <strong style={{ color: isLight ? '#0F172A' : '#FFFFFF' }}>{viewingContract.closerName || 'Não atribuído'}</strong></div>
                  <div style={{ gridColumn: 'span 2' }}>
                    Aprovador: <strong style={{ color: viewingContract.approvedByName ? '#059669' : '#D97706' }}>{viewingContract.approvedByName || 'Aguardando aprovação'}</strong>
                    {viewingContract.approvedAt && <span style={{ color: isLight ? '#64748B' : '#94A3B8', fontSize: '0.74rem', marginLeft: '6px' }}>({new Date(viewingContract.approvedAt).toLocaleDateString('pt-BR')})</span>}
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              padding: '14px 20px',
              borderTop: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)'}`,
              display: 'flex',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setViewingContract(null)}
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
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
