import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search, X, Users, Briefcase, FileText,
  ChevronRight, Building2, ExternalLink, Tag, UserCheck
} from 'lucide-react';

// ── Chip inline do input ────────────────────────────────────────────────────
interface FilterChipProps {
  label: string;
  onRemove: () => void;
  isLight: boolean;
}
const FilterChip: React.FC<FilterChipProps> = ({ label, onRemove, isLight }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 7px 2px 8px',
      borderRadius: '5px',
      backgroundColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.1)',
      border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255,255,255,0.18)'}`,
      color: isLight ? '#334155' : '#CBD5E1',
      fontSize: '0.72rem',
      fontWeight: 600,
      whiteSpace: 'nowrap',
      flexShrink: 0,
      lineHeight: 1,
    }}
  >
    {label}
    <button
      type="button"
      onClick={onRemove}
      title={`Remover filtro ${label}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        background: 'none',
        border: 'none',
        padding: '1px',
        cursor: 'pointer',
        color: isLight ? '#64748B' : '#94A3B8',
        lineHeight: 0,
      }}
    >
      <X size={12} />
    </button>
  </span>
);
import { useAdminState } from '../../context/AdminStateContext';
import { contactService } from '../../services/contactService';
import { contractService } from '../../services/contractService';
import { formatPhone } from '../../utils/phoneFormatter';
import type { Contact, Lead, Contract, ContractFunnelPlacement, AdminTabType } from '../../types/admin';

interface AdminGlobalSearchProps {
  activeTab: AdminTabType;
  activeFunnelId?: string | null;
  onNavigateTab: (tab: AdminTabType, funnelId?: string | null, params?: any) => void;
  onOpenLead: (leadId: string, funnelId?: string) => void;
  onOpenContact: (contactId: string) => void;
  onFilterFunnelLeads?: (query: string) => void;
}

export type SearchCategoryFilter = 'all' | 'contacts' | 'leads' | 'contracts';

export const AdminGlobalSearch: React.FC<AdminGlobalSearchProps> = ({
  activeTab,
  activeFunnelId,
  onNavigateTab,
  onOpenLead,
  onOpenContact,
  onFilterFunnelLeads,
}) => {
  const {
    currentUser,
    venues,
    funnels,
    leads,
    collaborators,
    theme,
  } = useAdminState();

  const isLight = theme === 'light';

  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<SearchCategoryFilter>('all');
  const [selectedVenueFilter, setSelectedVenueFilter] = useState<string>('all');
  const [selectedCollaboratorFilter, setSelectedCollaboratorFilter] = useState<string>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');

  // Resultados assíncronos de contatos e contratos
  const [contactsResults, setContactsResults] = useState<Contact[]>([]);
  const [contractsResults, setContractsResults] = useState<Contract[]>([]);
  // Atendimentos de pos-venda (placements) dos contratos encontrados
  const [placementsResults, setPlacementsResults] = useState<ContractFunnelPlacement[]>([]);
  const [loadingAsync, setLoadingAsync] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const prevTabRef = useRef(activeTab);
  useEffect(() => {
    // Ao entrar/sair do WhatsApp a busca central recomeça vazia (ela filtra conversas ali)
    if (prevTabRef.current !== activeTab && (prevTabRef.current === 'whatsapp' || activeTab === 'whatsapp')) {
      setSearchQuery('');
      window.dispatchEvent(new CustomEvent('f5_whatsapp_filter_query', { detail: { query: '' } }));
    }
    prevTabRef.current = activeTab;
  }, [activeTab]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const scopedMasterId = currentUser?.masterId || currentUser?.id || '00000000-0000-0000-0000-000000000001';

  // Extrai todas as tags únicas dos leads cadastrados para o filtro
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    leads.forEach(l => {
      if (Array.isArray(l.tags)) {
        l.tags.forEach(t => {
          if (t && t.trim()) tagSet.add(t.trim());
        });
      }
    });
    return Array.from(tagSet).sort();
  }, [leads]);

  // Atalho de teclado global Ctrl+K ou Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => {
          const next = !prev;
          if (next) setTimeout(() => inputRef.current?.focus(), 60);
          return next;
        });
      } else if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Se o usuário fechar e estiver no funil comercial, aplica filtro local do funil
  const handleClose = () => {
    setIsOpen(false);
    if (activeTab === 'crm' && onFilterFunnelLeads) {
      onFilterFunnelLeads(searchQuery.trim());
    }
  };

  // Busca assíncrona de Contatos e Contratos no Supabase quando digita
  useEffect(() => {
    if (!isOpen || !searchQuery.trim() || searchQuery.trim().length < 2) {
      setContactsResults([]);
      setContractsResults([]);
      setPlacementsResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingAsync(true);
      try {
        const [cList, ctrList] = await Promise.all([
          contactService.getContacts({
            masterId: scopedMasterId,
            search: searchQuery.trim(),
            limit: 20,
          }),
          contractService.getContracts({
            masterId: scopedMasterId,
            search: searchQuery.trim(),
            limit: 20,
          }),
        ]);

        setContactsResults(cList);
        setContractsResults(ctrList);
        const approvedIds = ctrList.filter(c => c.approvalStatus === 'approved').map(c => c.id);
        setPlacementsResults(await contractService.getPlacementsByContracts(approvedIds, scopedMasterId));
      } catch (err) {
        console.error('[Kommo Search] Erro na busca remota:', err);
      } finally {
        setLoadingAsync(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, isOpen, scopedMasterId]);

  // Filtragem local de Leads do CRM em tempo real com suporte a Unidade, Colaborador e Tag
  const filteredLeads = useMemo(() => {
    if (!searchQuery.trim() && selectedTagFilter === 'all' && selectedCollaboratorFilter === 'all' && selectedVenueFilter === 'all') {
      return [];
    }

    const q = searchQuery.toLowerCase().trim();
    const qDigits = q.replace(/\D/g, '');

    return leads.filter(l => {
      // Filtro de Unidade
      if (selectedVenueFilter !== 'all' && l.venueId !== selectedVenueFilter) return false;

      // Filtro de Colaborador (SDR ou Closer atribuído)
      if (selectedCollaboratorFilter !== 'all') {
        const matchCollab =
          l.sdrId === selectedCollaboratorFilter ||
          l.closerId === selectedCollaboratorFilter ||
          l.createdBy === selectedCollaboratorFilter ||
          (l as any).assignedTo === selectedCollaboratorFilter;
        if (!matchCollab) return false;
      }

      // Filtro de Tag / Etiqueta
      if (selectedTagFilter !== 'all') {
        if (!Array.isArray(l.tags) || !l.tags.includes(selectedTagFilter)) return false;
      }

      // Se não digitou query textual mas selecionou filtro, lista os leads correspondentes
      if (!q) return true;

      const matchName = l.name?.toLowerCase().includes(q);
      const matchPhone = qDigits.length >= 3 && l.phone?.includes(qDigits);
      const matchCode = (l.commercialCode || l.code)?.toLowerCase().includes(q);
      const matchMsg = l.activities?.some(a => a.text?.toLowerCase().includes(q));
      const matchTag = l.tags?.some(t => t.toLowerCase().includes(q));

      return matchName || matchPhone || matchCode || matchMsg || matchTag;
    }).slice(0, 20);
  }, [leads, searchQuery, selectedVenueFilter, selectedCollaboratorFilter, selectedTagFilter]);

  // Contatos filtrados por unidade
  const displayContacts = useMemo(() => {
    return contactsResults.filter(c => {
      if (selectedVenueFilter === 'all') return true;
      return c.venueIds?.includes(selectedVenueFilter);
    });
  }, [contactsResults, selectedVenueFilter]);

  // Contratos filtrados por unidade e colaborador
  const displayContracts = useMemo(() => {
    return contractsResults.filter(ctr => {
      if (selectedVenueFilter !== 'all' && ctr.venueId !== selectedVenueFilter) return false;
      if (selectedCollaboratorFilter !== 'all') {
        const matchCollab =
          ctr.closerId === selectedCollaboratorFilter ||
          ctr.sdrId === selectedCollaboratorFilter;
        if (!matchCollab) return false;
      }
      return true;
    });
  }, [contractsResults, selectedVenueFilter, selectedCollaboratorFilter]);

  // Total de correspondências
  const totalMatches = displayContacts.length + filteredLeads.length + displayContracts.length;

  // Nome do funil atual se estiver no CRM
  const currentActiveFunnel = useMemo(() => {
    if (activeTab === 'crm' && activeFunnelId) {
      return funnels.find(f => f.id === activeFunnelId);
    }
    return null;
  }, [activeTab, activeFunnelId, funnels]);

  // Helper para nome real da etapa do lead
  const getStageRealName = (lead: Lead) => {
    const funnel = funnels.find(f => f.id === lead.funnelId);
    if (funnel?.stages) {
      const st = funnel.stages.find(s => s.id === lead.stage);
      if (st) return st.name || (st as any).title;
    }
    const stageMap: Record<string, string> = {
      new_lead: 'Novo Lead',
      contact_made: 'Contato Feito',
      presentation_scheduled: 'Visita Agendada',
      proposal_sent: 'Proposta Enviada',
      negotiation: 'Negociação',
      won: 'Fechado',
      lost: 'Perdido',
    };
    return stageMap[lead.stage as string] || lead.stage || 'Entrada';
  };

  const hasActiveFilters = selectedVenueFilter !== 'all' || selectedCollaboratorFilter !== 'all' || selectedTagFilter !== 'all';

  const clearAllFilters = () => {
    setSelectedVenueFilter('all');
    setSelectedCollaboratorFilter('all');
    setSelectedTagFilter('all');
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '340px',
        minWidth: '340px',
        maxWidth: '340px',
        boxSizing: 'border-box',
      }}
    >
      {/* ── 1. BARRA DE BUSCA OFICIAL NO CABEÇALHO (CHIPS INLINE + LARGURA FIXA) ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: isLight ? '#FFFFFF' : '#141E30',
          border: `1.5px solid ${isOpen ? '#14A9D7' : isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.12)'}`,
          borderRadius: '8px',
          padding: '5px 10px',
          width: '100%',
          boxSizing: 'border-box',
          boxShadow: isOpen ? '0 0 12px rgba(20, 169, 215, 0.25)' : 'none',
          transition: 'all 0.15s ease',
          flexWrap: 'nowrap',
          overflow: 'hidden',
        }}
      >
        <Search size={15} color="#14A9D7" style={{ flexShrink: 0 }} />

        {/* ── Chips de filtros ativos DENTRO do input ── */}
        {selectedVenueFilter !== 'all' && (() => {
          const v = venues.find(v => v.id === selectedVenueFilter);
          return v ? (
            <FilterChip
              key="chip-venue"
              label={v.name}
              onRemove={() => setSelectedVenueFilter('all')}
              isLight={isLight}
            />
          ) : null;
        })()}
        {selectedCollaboratorFilter !== 'all' && (() => {
          const c = collaborators?.find(c => c.id === selectedCollaboratorFilter);
          return c ? (
            <FilterChip
              key="chip-collab"
              label={c.name.split(' ').slice(0, 2).join(' ')}
              onRemove={() => setSelectedCollaboratorFilter('all')}
              isLight={isLight}
            />
          ) : null;
        })()}
        {selectedTagFilter !== 'all' && (
          <FilterChip
            key="chip-tag"
            label={`#${selectedTagFilter}`}
            onRemove={() => setSelectedTagFilter('all')}
            isLight={isLight}
          />
        )}

        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          readOnly={hasActiveFilters}
          onChange={e => {
            if (hasActiveFilters) return;
            setSearchQuery(e.target.value);
            if (activeTab === 'whatsapp') {
              // No WhatsApp a busca central filtra a lista de conversas ao vivo
              window.dispatchEvent(new CustomEvent('f5_whatsapp_filter_query', { detail: { query: e.target.value } }));
              return;
            }
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => { if (activeTab !== 'whatsapp') setIsOpen(true); }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (onFilterFunnelLeads) {
                onFilterFunnelLeads(searchQuery.trim());
              }
              setIsOpen(false);
            } else if (e.key === 'Escape') {
              handleClose();
            }
          }}
          placeholder={
            hasActiveFilters
              ? ''
              : activeTab === 'whatsapp'
              ? 'Buscar conversas...'
              : currentActiveFunnel
              ? `Buscar em ${currentActiveFunnel.name}...`
              : 'Buscar contatos, leads, contratos...'
          }
          style={{
            flex: 1,
            minWidth: 0,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: isLight ? '#0F172A' : '#FFFFFF',
            fontSize: '0.80rem',
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: hasActiveFilters ? 'default' : 'text',
          }}
        />
        {(searchQuery || hasActiveFilters) ? (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              clearAllFilters();
              if (onFilterFunnelLeads) onFilterFunnelLeads('');
              if (activeTab === 'whatsapp') window.dispatchEvent(new CustomEvent('f5_whatsapp_filter_query', { detail: { query: '' } }));
            }}
            title="Limpar busca e filtros"
            style={{
              background: 'none',
              border: 'none',
              color: isLight ? '#64748B' : '#94A3B8',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        ) : (
          <span style={{
            fontSize: '0.64rem',
            fontWeight: 700,
            padding: '1px 5px',
            borderRadius: '4px',
            backgroundColor: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.08)',
            color: isLight ? '#475569' : '#94A3B8',
            fontFamily: 'monospace',
            border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.1)'}`,
            flexShrink: 0,
            pointerEvents: 'none',
          }}>
            Ctrl K
          </span>
        )}
      </div>

      {/* ── 2. POPOVER DE RESULTADOS: CENTRALIZADO E ALINHADO LOGO ABAIXO DA BUSCA ── */}
      {isOpen && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '760px',
            maxWidth: '92vw',
            maxHeight: '75vh',
            backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
            border: `1.5px solid ${isLight ? '#CBD5E1' : 'rgba(20, 169, 215, 0.35)'}`,
            borderRadius: '14px',
            boxShadow: isLight
              ? '0 20px 40px -10px rgba(0, 0, 0, 0.25)'
              : '0 25px 50px -12px rgba(0, 0, 0, 0.95), 0 0 25px rgba(20, 169, 215, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 99999,
            animation: 'fadeIn 0.12s ease-out',
          }}
        >
          {/* Header da Busca no Popover: Dica de Enter & Fechar */}
          <div style={{
            padding: '10px 16px',
            borderBottom: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)'}`,
            backgroundColor: isLight ? '#F8FAFC' : '#141E30',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.74rem', color: isLight ? '#475569' : '#94A3B8', fontWeight: 600 }}>
                Pressione <strong style={{ color: '#14A9D7' }}>Enter</strong> para filtrar o funil atual ou selecione um resultado:
              </span>
            </div>
            <button
              type="button"
              onClick={handleClose}
              title="Fechar (Esc)"
              style={{
                background: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.06)',
                border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '6px',
                padding: '3px 8px',
                color: isLight ? '#475569' : '#94A3B8',
                fontSize: '0.70rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Esc
            </button>
          </div>

          {/* Barra de Filtros Avançados: Categorias, Unidades, Colaboradores e Tags */}
          <div style={{
            padding: '10px 18px',
            borderBottom: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.06)'}`,
            backgroundColor: isLight ? '#FFFFFF' : '#0B111E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
              gap: '10px',
            }}>
              {/* Chips de Categoria */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: `Todos (${totalMatches})` },
                  { id: 'contacts', label: `Contatos (${displayContacts.length})`, icon: <Users size={12} /> },
                  { id: 'leads', label: `Leads Comerciais (${filteredLeads.length})`, icon: <Briefcase size={12} /> },
                  { id: 'contracts', label: `Contratos (${displayContracts.length})`, icon: <FileText size={12} /> },
                ].map(cat => {
                  const isSelected = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id as SearchCategoryFilter)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: `1px solid ${isSelected ? '#14A9D7' : isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)'}`,
                        backgroundColor: isSelected
                          ? (isLight ? 'rgba(20, 169, 215, 0.12)' : 'rgba(20, 169, 215, 0.22)')
                          : (isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.02)'),
                        color: isSelected ? '#14A9D7' : (isLight ? '#475569' : '#94A3B8'),
                        fontSize: '0.76rem',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      {cat.icon}
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Filtros em Dropdowns (Unidade, Colaborador, Etiqueta) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* 1. Unidade */}
                {venues.length > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Building2 size={13} color={isLight ? '#64748B' : '#94A3B8'} />
                    <select
                      value={selectedVenueFilter}
                      onChange={e => setSelectedVenueFilter(e.target.value)}
                      style={{
                        backgroundColor: isLight ? '#F8FAFC' : '#162238',
                        border: `1px solid ${selectedVenueFilter !== 'all' ? '#14A9D7' : isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.1)'}`,
                        borderRadius: '6px',
                        color: isLight ? '#0F172A' : '#E2E8F0',
                        fontSize: '0.74rem',
                        padding: '4px 6px',
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="all">Todas as Casas</option>
                      {venues.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 2. Colaborador */}
                {collaborators && collaborators.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <UserCheck size={13} color={isLight ? '#64748B' : '#94A3B8'} />
                    <select
                      value={selectedCollaboratorFilter}
                      onChange={e => setSelectedCollaboratorFilter(e.target.value)}
                      style={{
                        backgroundColor: isLight ? '#F8FAFC' : '#162238',
                        border: `1px solid ${selectedCollaboratorFilter !== 'all' ? '#14A9D7' : isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.1)'}`,
                        borderRadius: '6px',
                        color: isLight ? '#0F172A' : '#E2E8F0',
                        fontSize: '0.74rem',
                        padding: '4px 6px',
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="all">Todos Colaboradores</option>
                      {collaborators.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 3. Etiqueta / Tag */}
                {availableTags.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Tag size={13} color={isLight ? '#64748B' : '#94A3B8'} />
                    <select
                      value={selectedTagFilter}
                      onChange={e => setSelectedTagFilter(e.target.value)}
                      style={{
                        backgroundColor: isLight ? '#F8FAFC' : '#162238',
                        border: `1px solid ${selectedTagFilter !== 'all' ? '#10B981' : isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.1)'}`,
                        borderRadius: '6px',
                        color: isLight ? '#0F172A' : '#E2E8F0',
                        fontSize: '0.74rem',
                        padding: '4px 6px',
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="all">Todas as Tags</option>
                      {availableTags.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                )}

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    title="Limpar todos os filtros"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#EF4444',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: '2px 6px',
                    }}
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {/* Contexto do Funil Atual */}
            {currentActiveFunnel && (
              <div style={{
                padding: '7px 20px',
                backgroundColor: isLight ? 'rgba(20, 169, 215, 0.08)' : 'rgba(20, 169, 215, 0.12)',
                borderBottom: `1px solid ${isLight ? 'rgba(20, 169, 215, 0.15)' : 'rgba(20, 169, 215, 0.2)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: isLight ? '#0284C7' : '#38BDF8',
              }}>
                <span>
                  Buscando em todo o sistema. Ao fechar, o filtro será mantido no funil <strong>{currentActiveFunnel.name}</strong>.
                </span>
                <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Pressione Enter para filtrar o Kanban</span>
              </div>
            )}

            {/* Área de Resultados com Scroll */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {!searchQuery.trim() && !hasActiveFilters ? (
                <div style={{ padding: '36px 20px', textAlign: 'center', color: isLight ? '#64748B' : '#94A3B8' }}>
                  <Search size={32} style={{ margin: '0 auto 10px auto', opacity: 0.3 }} color="#14A9D7" />
                  <p style={{ margin: '0 0 6px 0', fontWeight: 700, color: isLight ? '#0F172A' : '#FFFFFF' }}>
                    Central de Busca Integrada do F5 System
                  </p>
                  <p style={{ margin: 0, fontSize: '0.8rem' }}>
                    Digite um nome, telefone, CPF, código CONT/LEAD/CTR ou utilize os filtros de Etiquetas e Colaboradores acima.
                  </p>
                </div>
              ) : totalMatches === 0 && !loadingAsync ? (
                <div style={{ padding: '36px 20px', textAlign: 'center', color: isLight ? '#64748B' : '#94A3B8' }}>
                  <p style={{ margin: '0 0 6px 0', fontWeight: 700, color: isLight ? '#0F172A' : '#FFFFFF' }}>
                    Nenhum resultado encontrado
                  </p>
                  <p style={{ margin: 0, fontSize: '0.8rem' }}>
                    Tente buscar por outro termo ou limpe os filtros aplicados.
                  </p>
                </div>
              ) : (
                <>
                  {/* 1. SEÇÃO DE CONTATOS */}
                  {(activeCategory === 'all' || activeCategory === 'contacts') && displayContacts.length > 0 && (
                    <div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '10px',
                        color: '#60A5FA',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        <Users size={14} />
                        Contatos ({displayContacts.length})
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '8px' }}>
                        {displayContacts.map(c => {
                          const initials = (c.name || 'C')
                            .split(' ')
                            .filter(Boolean)
                            .slice(0, 2)
                            .map(n => n[0].toUpperCase())
                            .join('');

                          const matchedLeads = leads.filter(l => l.contactId === c.id || (l.phone && c.primaryPhone && l.phone.replace(/\D/g, '') === c.primaryPhone.replace(/\D/g, '')));

                          return (
                            <div
                              key={c.id}
                              onClick={() => {
                                onOpenContact(c.id);
                                handleClose();
                              }}
                              style={{
                                padding: '12px 14px',
                                borderRadius: '8px',
                                backgroundColor: isLight ? '#F8FAFC' : '#162238',
                                border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)'}`,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.backgroundColor = isLight ? '#EDF2F7' : 'rgba(59, 130, 246, 0.12)';
                                e.currentTarget.style.borderColor = '#3B82F6';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.backgroundColor = isLight ? '#F8FAFC' : '#162238';
                                e.currentTarget.style.borderColor = isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)';
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                                <div style={{
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '50%',
                                  backgroundColor: '#3B82F6',
                                  color: '#FFFFFF',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.85rem',
                                  fontWeight: 700,
                                  flexShrink: 0,
                                }}>
                                  {initials}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <strong style={{ color: isLight ? '#0F172A' : '#FFFFFF', fontSize: '0.86rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {c.name}
                                    </strong>
                                    {c.code && (
                                      <span style={{
                                        fontSize: '0.66rem',
                                        padding: '1px 5px',
                                        borderRadius: '4px',
                                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                                        color: isLight ? '#1D4ED8' : '#60A5FA',
                                        fontWeight: 700,
                                      }}>
                                        {c.code}
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.74rem', color: isLight ? '#64748B' : '#94A3B8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>{formatPhone(c.primaryPhone) || c.primaryPhone}</span>
                                    {c.cpf && <span>• CPF: {c.cpf}</span>}
                                  </div>
                                  {matchedLeads.length > 0 && (
                                    <div style={{ marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                      {matchedLeads.map(l => (
                                        <span key={l.id}
                                          role="button"
                                          title="Abrir este lead no funil"
                                          onClick={(e) => {
                                            // O chip abre o LEAD no funil; o restante do card abre o contato
                                            e.stopPropagation();
                                            onOpenLead(l.id, l.funnelId);
                                            handleClose();
                                          }}
                                          style={{
                                          fontSize: '0.66rem',
                                          padding: '1px 6px',
                                          borderRadius: '4px',
                                          backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                          color: '#34D399',
                                          fontWeight: 600,
                                          cursor: 'pointer',
                                        }}>
                                          Lead: {funnels.find(f => f.id === l.funnelId)?.name || 'Comercial'} ({getStageRealName(l)})
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <ChevronRight size={16} color="#94A3B8" style={{ flexShrink: 0 }} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 2. SEÇÃO DE LEADS COMERCIAIS */}
                  {(activeCategory === 'all' || activeCategory === 'leads') && filteredLeads.length > 0 && (
                    <div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '10px',
                        color: '#10B981',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        <Briefcase size={14} />
                        Leads Comerciais ({filteredLeads.length})
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '8px' }}>
                        {filteredLeads.map(l => {
                          const funnel = funnels.find(f => f.id === l.funnelId);
                          const venue = venues.find(v => v.id === l.venueId);

                          return (
                            <div
                              key={l.id}
                              onClick={() => {
                                onOpenLead(l.id, l.funnelId);
                                handleClose();
                              }}
                              style={{
                                padding: '12px 14px',
                                borderRadius: '8px',
                                backgroundColor: isLight ? '#F8FAFC' : '#162238',
                                border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)'}`,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.backgroundColor = isLight ? '#EDF2F7' : 'rgba(16, 185, 129, 0.12)';
                                e.currentTarget.style.borderColor = '#10B981';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.backgroundColor = isLight ? '#F8FAFC' : '#162238';
                                e.currentTarget.style.borderColor = isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)';
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <strong style={{ color: isLight ? '#0F172A' : '#FFFFFF', fontSize: '0.86rem' }}>
                                    {l.name}
                                  </strong>
                                  {l.commercialCode && (
                                    <span style={{
                                      fontSize: '0.66rem',
                                      padding: '1px 5px',
                                      borderRadius: '4px',
                                      backgroundColor: 'rgba(212, 175, 55, 0.15)',
                                      color: isLight ? '#B45309' : '#D4AF37',
                                      fontWeight: 700,
                                    }}>
                                      {l.commercialCode}
                                    </span>
                                  )}
                                  <span style={{
                                    fontSize: '0.68rem',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                                    color: isLight ? '#1D4ED8' : '#60A5FA',
                                    fontWeight: 600,
                                  }}>
                                    {getStageRealName(l)}
                                  </span>
                                  {Array.isArray(l.tags) && l.tags.map(tag => (
                                    <span
                                      key={tag}
                                      style={{
                                        fontSize: '0.64rem',
                                        padding: '1px 5px',
                                        borderRadius: '3px',
                                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                        color: '#34D399',
                                        fontWeight: 600,
                                      }}
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                </div>

                                <div style={{ fontSize: '0.74rem', color: isLight ? '#64748B' : '#94A3B8', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span>Funil: {funnel?.name || 'Comercial'}</span>
                                  {venue && <span>• {venue.name}</span>}
                                  {l.phone && <span>• {formatPhone(l.phone)}</span>}
                                  {l.dealValue ? <span>• R$ {l.dealValue.toLocaleString('pt-BR')}</span> : null}
                                </div>
                              </div>

                              <ExternalLink size={14} color={isLight ? '#64748B' : '#94A3B8'} style={{ flexShrink: 0 }} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 3. SEÇÃO DE CONTRATOS */}
                  {(activeCategory === 'all' || activeCategory === 'contracts') && displayContracts.length > 0 && (
                    <div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '10px',
                        color: '#D4AF37',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        <FileText size={14} />
                        Contratos - documento ({displayContracts.length})
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '8px' }}>
                        {displayContracts.map(ctr => (
                          <div
                            key={ctr.id}
                            onClick={() => {
                              // Contrato (documento): abre o drawer do contrato na tela de Contratos
                              onNavigateTab('contracts', undefined, { contractId: ctr.id });
                              handleClose();
                            }}
                            style={{
                              padding: '12px 14px',
                              borderRadius: '8px',
                              backgroundColor: isLight ? '#F8FAFC' : '#162238',
                              border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)'}`,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '12px',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.backgroundColor = isLight ? '#EDF2F7' : 'rgba(212, 175, 55, 0.12)';
                              e.currentTarget.style.borderColor = '#D4AF37';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.backgroundColor = isLight ? '#F8FAFC' : '#162238';
                              e.currentTarget.style.borderColor = isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)';
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <strong style={{ color: isLight ? '#B45309' : '#D4AF37', fontSize: '0.86rem', fontFamily: 'monospace' }}>
                                  {ctr.contractCode}
                                </strong>
                                <span style={{ color: isLight ? '#0F172A' : '#FFFFFF', fontSize: '0.84rem', fontWeight: 600 }}>
                                  {ctr.clientSnapshot?.name || ctr.contact?.name || 'Cliente'}
                                </span>
                                <span style={{
                                  fontSize: '0.68rem',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: ctr.approvalStatus === 'approved' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                  color: ctr.approvalStatus === 'approved' ? (isLight ? '#059669' : '#34D399') : (isLight ? '#D97706' : '#FBBF24'),
                                  fontWeight: 600,
                                }}>
                                  {ctr.approvalStatus === 'approved' ? 'Aprovado' : 'Aguardando Aprovação'}
                                </span>
                              </div>

                              <div style={{ fontSize: '0.74rem', color: isLight ? '#64748B' : '#94A3B8', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>{ctr.venueName}</span>
                                {ctr.eventDate && <span>• Festa: {new Date(ctr.eventDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>}
                                {(ctr.totalAmount || ctr.contractValue) ? <span>• R$ {(ctr.totalAmount || ctr.contractValue || 0).toLocaleString('pt-BR')}</span> : null}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                              {ctr.clientId && ctr.approvalStatus === 'approved' && (
                                <button
                                  type="button"
                                  title="Abrir este contrato na esteira do funil de pós-venda"
                                  onClick={e => {
                                    e.stopPropagation();
                                    const fid = (ctr.targetPosSaleFunnelIds || ctr.targetPostSaleFunnelIds || [])[0];
                                    onNavigateTab('post-sale-crm', fid, { clientId: ctr.clientId });
                                    handleClose();
                                  }}
                                  style={{
                                    padding: '3px 8px', borderRadius: '5px', cursor: 'pointer',
                                    border: '1px solid #D4AF37', background: 'transparent',
                                    color: isLight ? '#B45309' : '#D4AF37', fontSize: '0.68rem', fontWeight: 700,
                                  }}
                                >
                                  Ver na esteira
                                </button>
                              )}
                              <ExternalLink size={14} color="#D4AF37" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4. ATENDIMENTO PÓS-VENDA (placements: funil, etapa e responsável) */}
                  {(activeCategory === 'all' || activeCategory === 'contracts') && placementsResults.length > 0 && (
                    <div>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px',
                        color: '#06B6D4', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                      }}>
                        <Briefcase size={14} />
                        Atendimento pós-venda ({placementsResults.length})
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '8px' }}>
                        {placementsResults.map(p => {
                          const ctr = contractsResults.find(c => c.id === p.contractId);
                          const funnel = funnels.find(f => f.id === p.funnelId);
                          const stageName = funnel?.stages?.find(s => s.id === p.stageId)?.name || p.stageId;
                          const owner = collaborators?.find(c => c.id === p.assignedTo)?.name;
                          return (
                            <div
                              key={p.id}
                              onClick={() => {
                                onNavigateTab('post-sale-crm', p.funnelId, { clientId: ctr?.clientId });
                                handleClose();
                              }}
                              style={{
                                padding: '12px 14px', borderRadius: '8px', cursor: 'pointer',
                                backgroundColor: isLight ? '#F8FAFC' : '#162238',
                                border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <strong style={{ color: isLight ? '#0F172A' : '#FFFFFF', fontSize: '0.84rem' }}>
                                    {ctr?.clientSnapshot?.name || ctr?.contact?.name || 'Cliente'}
                                  </strong>
                                  {ctr?.contractCode && (
                                    <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: isLight ? '#B45309' : '#D4AF37' }}>{ctr.contractCode}</span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: isLight ? '#64748B' : '#94A3B8', marginTop: '3px' }}>
                                  {p.funnelName} • Etapa: {stageName}
                                </div>
                                <div style={{ fontSize: '0.72rem', marginTop: '2px', color: owner ? '#06B6D4' : '#F59E0B', fontWeight: 600 }}>
                                  Responsável: {owner || 'Sem responsável'}
                                </div>
                              </div>
                              <ChevronRight size={16} color="#06B6D4" style={{ flexShrink: 0 }} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer do Command Palette */}
            <div style={{
              padding: '8px 20px',
              borderTop: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)'}`,
              backgroundColor: isLight ? '#F8FAFC' : '#0B111E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.72rem',
              color: isLight ? '#64748B' : '#94A3B8',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span>Pressione <strong>Esc</strong> para fechar</span>
                <span>Filtros instantâneos por <strong>Unidade</strong>, <strong>Colaborador</strong> e <strong>Etiqueta</strong></span>
              </div>
              <span style={{ color: '#14A9D7', fontWeight: 600 }}>F5 Command Palette</span>
            </div>
          </div>
        )}
      </div>
  );
};
