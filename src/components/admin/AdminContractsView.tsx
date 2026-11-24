import { Select, Checkbox, DateRangeField } from '../ui';
import { HeaderActions, headerPrimaryButtonStyle } from './HeaderActions';
import { useScreenSearch, screenQueryTerm } from '../../utils/screenSearch';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText, CheckCircle2, Building2,
  Clock, ShieldCheck, Calendar,
  AlertTriangle, RefreshCw, X, ArrowLeft,
  User, Users, Kanban, Receipt, ArrowRightLeft,
  Check, Send, History, CheckSquare, Plus
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { toast } from 'sonner';
import { contractService } from '../../services/contractService';
import { getExtraContractDocuments } from '../../utils/contractDocuments';
import { ContractTeamAssignModal } from './ContractTeamAssignModal';
import { canEditContractTeam, canSeeApprovedContracts, canViewContractDocument } from '../../utils/accessPermissions';
import { ContractClosingWorkspace } from './contracts/ContractClosingWorkspace';
import { ContractFormModal } from './contracts/ContractFormModal';
import { paymentTextLines } from '../../utils/paymentPlan';
import { PaymentTextList } from './contracts/PaymentTextList';
import { ContractBoard, type BoardCard } from './contracts/ContractBoard';
import { ProposalDetailModal } from './contracts/ProposalDetailModal';
import { LeadWorkspaceModal } from './LeadWorkspaceModal';
import { proposalService } from '../../services/proposalService';
import { leadService } from '../../services/leadService';
import { formatPhone } from '../../utils/phoneFormatter';
import { SafeAvatar } from './SafeAvatar';
import type { Contract, AdminTabType, ContractFunnelPlacement, Proposal, ContractApprovalStatus } from '../../types/admin';


// Cache em memoria por (master|aba|unidade|busca): evita lista vazia ao voltar para a tela
const contractsListCache = new Map<string, Contract[]>();
const CONTRACTS_PAGE_SIZE = 100;
const EVENT_TYPE_FILTERS = [{ value: '15_anos', label: '15 Anos' }, { value: 'casamento', label: 'Casamento' }, { value: 'aniversario', label: 'Aniversário' }, { value: 'bodas', label: 'Bodas' }, { value: 'corporativo', label: 'Corporativo' }, { value: 'outro', label: 'Outro' }];

interface AdminContractsViewProps {
  onNavigateTab?: (tab: AdminTabType, params?: any) => void;
  onOpenLead?: (leadId: string, funnelId?: string) => void;
  onOpenContractKanban?: (contractId: string, funnelId?: string, clientId?: string) => void;
  initialContractId?: string | null;
  onInitialContractOpened?: () => void;
}

export const AdminContractsView: React.FC<AdminContractsViewProps> = ({
  onNavigateTab,
  onOpenLead,
  onOpenContractKanban,
  initialContractId,
  onInitialContractOpened,
}) => {
  const {
    currentUser,
    venues,
    funnels,
    theme,
    collaborators,
    leads,
    getFeatureStatus,
  } = useAdminState();
  // Com o Financeiro ligado, a aprovacao e dele; desligado (producao inicial), a gerencia homologa como antes
  const financeEnabled = getFeatureStatus('finance') === 'active';
  const canSeeApproved = canSeeApprovedContracts(currentUser);
  const canViewDocs = canViewContractDocument(currentUser);
  const canEditClosing = (currentUser?.role || '').toLowerCase() !== 'financeiro';

  const isLight = theme === 'light';
  // Responsaveis para o filtro: quem pode ser Especialista ou SDR (equipe comercial; se ninguem marcado, todos os ativos)
  const responsibleOptions = useMemo(() => {
    const active = collaborators.filter(c => c.active !== false);
    const commercial = active.filter(c => (c.sectors || []).includes('comercial') || (c.jobRoles || []).some(j => j.startsWith('comercial:')));
    return (commercial.length ? commercial : active).slice().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [collaborators]);

  // Foto do colaborador (SDR/Closer) pelo id; fallback por nome quando o contrato nao guarda o id
  const collabAvatar = (id?: string | null, name?: string | null): string | undefined => {
    const byId = id ? collaborators.find(c => c.id === id) : undefined;
    const found = byId || (name ? collaborators.find(c => c.name === name) : undefined);
    return found?.avatarUrl || undefined;
  };

  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  // Contrato aberto na aba Em fechamento (null = quadro)
  const [closingId, setClosingId] = useState<string | null>(null);
  // Registro manual de contrato (comercial que ainda vende fora do WhatsApp do F5 System)
  const [formModal, setFormModal] = useState<{ mode: 'create' } | null>(null);
  // Propostas ativas (primeira etapa do quadro; nao contam como contrato fechado)
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [proposalDetail, setProposalDetail] = useState<Proposal | null>(null);
  // Proposta com lead: abre o painel ficha + WhatsApp para conversar com o cliente sem sair do quadro
  const [proposalWorkspace, setProposalWorkspace] = useState<Proposal | null>(null);
  const [proposalForm, setProposalForm] = useState<{ kind: 'new' | 'edit' | 'convert'; proposal?: Proposal } | null>(null);
  // A busca vem da barra do topo (filtra ao vivo); nao ha barra propria aqui
  const screenSearch = useScreenSearch();
  const searchQuery = screenQueryTerm(screenSearch);
  const [venueFilterLocal, setSelectedVenueFilter] = useState<string>('all');
  const selectedVenueFilter = venueFilterLocal !== 'all' ? venueFilterLocal : screenSearch.venueId;
  // Filtros da lista: situacao (so em Contratos aprovados), responsavel (especialista ou SDR), tipo de evento e periodo da festa
  const [statusFilter, setStatusFilter] = useState<'active' | 'canceled' | 'all'>('active');
  const [responsibleFilter, setResponsibleFilter] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [eventRange, setEventRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const approvedStatuses: ContractApprovalStatus[] = statusFilter === 'active' ? ['approved', 'completed'] : statusFilter === 'canceled' ? ['canceled'] : ['approved', 'completed', 'canceled'];
  const listFilters = {
    responsibleId: responsibleFilter || undefined,
    eventType: eventTypeFilter || undefined,
    eventFrom: eventRange.start || undefined,
    eventTo: eventRange.end || undefined,
  };
  const hasListFilters = Boolean(responsibleFilter || eventTypeFilter || eventRange.start || eventRange.end || (activeTab === 'approved' && statusFilter !== 'active'));
  const clearListFilters = () => { setResponsibleFilter(''); setEventTypeFilter(''); setEventRange({ start: '', end: '' }); setStatusFilter('active'); };
  const cacheKey = `${currentUser?.masterId || currentUser?.id || ''}|${activeTab}|${selectedVenueFilter}|${searchQuery.trim()}|${statusFilter}|${responsibleFilter}|${eventTypeFilter}|${eventRange.start}|${eventRange.end}`;
  // Lista inicial vem do cache (stale-while-revalidate): trocar de aba e voltar nao zera a tela
  const [contracts, setContracts] = useState<Contract[]>(() => contractsListCache.get(cacheKey) || []);
  const [loading, setLoading] = useState(() => !contractsListCache.has(cacheKey));
  // Totais REAIS vindos do banco (a lista mostra só uma página; o número nunca sai do tamanho dela)
  const [tabTotals, setTabTotals] = useState<{ pending: number | null; approved: number | null }>({ pending: null, approved: null });
  const [loadingMore, setLoadingMore] = useState(false);

  // Drawer de Detalhes do Contrato
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  // Marcacao de SDR/Closer em lote: a selecao fica guardada mesmo quando a busca muda e a linha sai da tela
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());
  const [teamModalIds, setTeamModalIds] = useState<string[] | null>(null);
  // Modo de selecao: desligado por padrao; ligado, clicar em qualquer ponto da linha marca/desmarca
  const [selectMode, setSelectMode] = useState(false);
  const canEditTeam = canEditContractTeam(currentUser);
  const togglePicked = (id: string) => setPickedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  // Modal de Homologação (Seleção de Funis de Pós-Venda)
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [selectedPostSaleFunnelIds, setSelectedPostSaleFunnelIds] = useState<string[]>([]);
  const [lockEventDate, setLockEventDate] = useState<boolean>(true);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  // Modal de Solicitar Ajuste / Devolver
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmittingRejection, setIsSubmittingRejection] = useState(false);

  // Cancelamento 100% de contrato aprovado: somente gerente (geral/comercial) e master
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [contractPlacements, setContractPlacements] = useState<ContractFunnelPlacement[]>([]);

  const scopedMasterId = currentUser?.masterId || currentUser?.id || '00000000-0000-0000-0000-000000000001';

  const canCancelContract = useMemo(() => {
    if (!currentUser) return false;
    const role = (currentUser.role || '').toLowerCase();
    const commRole = ((currentUser as any).commercialRole || '').toLowerCase();
    return ['master', 'gerente_geral', 'gerente_comercial'].some(r => r === role || r === commRole);
  }, [currentUser]);

  // Permissão para homologar/rejeitar contratos (Gerência Comercial, Geral, Master ou Admin)
  const canApproveContract = useMemo(() => {
    if (!currentUser) return false;
    const role = (currentUser.role || '').toLowerCase();
    const commRole = ((currentUser as any).commercialRole || '').toLowerCase();
    return (
      role === 'master' ||
      role === 'admin' ||
      role === 'gerente_comercial' ||
      role === 'gerente_geral' ||
      commRole === 'gerente_comercial' ||
      commRole === 'gerente_geral'
    );
  }, [currentUser]);

  // Carrega contratos da aba atual
  const loadContracts = useCallback(async () => {
    if (!scopedMasterId) return;
    const cached = contractsListCache.get(cacheKey);
    if (cached) setContracts(cached);
    else { setContracts([]); setLoading(true); }
    try {
      const venueIds = selectedVenueFilter === 'all'
        ? (currentUser?.role === 'master' ? undefined : currentUser?.venueIds)
        : [selectedVenueFilter];

      const search = searchQuery.trim() || undefined;
      const [res, pendingTotal, approvedTotal] = await Promise.all([
        contractService.getContracts({
          masterId: scopedMasterId,
          venueIds,
          ...(activeTab === 'pending' ? { approvalStatus: 'pending_approval' as const } : { statuses: approvedStatuses }),
          ...listFilters,
          search,
          limit: CONTRACTS_PAGE_SIZE,
        }),
        // Totais REAIS do banco para as duas abas (mesmos filtros de unidade e busca)
        contractService.countContracts({ masterId: scopedMasterId, venueIds, approvalStatus: 'pending_approval', ...listFilters, search }),
        contractService.countContracts({ masterId: scopedMasterId, venueIds, statuses: approvedStatuses, ...listFilters, search }),
      ]);

      contractsListCache.set(cacheKey, res);
      setTabTotals({ pending: pendingTotal, approved: approvedTotal });
      setContracts(res);
      // Mantem o drawer aberto sincronizado com a versao mais recente
      setSelectedContract(prev => (prev ? res.find(c => c.id === prev.id) || prev : prev));
    } catch (err) {
      console.error('[AdminContractsView] Erro ao carregar contratos:', err);
    } finally {
      setLoading(false);
    }
  }, [scopedMasterId, activeTab, selectedVenueFilter, searchQuery, currentUser, cacheKey]); // cacheKey inclui todos os filtros da lista

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  const loadProposals = useCallback(async () => {
    if (!scopedMasterId) return;
    const all = await proposalService.list({ masterId: scopedMasterId, status: 'active' });
    // Mesmo escopo de unidades da lista de contratos
    const venueIds = selectedVenueFilter === 'all'
      ? (currentUser?.role === 'master' ? undefined : currentUser?.venueIds)
      : [selectedVenueFilter];
    setProposals(venueIds && venueIds.length ? all.filter(p => !p.venueId || venueIds.includes(p.venueId)) : all);
  }, [scopedMasterId, selectedVenueFilter, currentUser]);

  useEffect(() => { void loadProposals(); }, [loadProposals]);

  const activeTotal = tabTotals[activeTab];
  const hasMoreContracts = activeTotal !== null && contracts.length < activeTotal;

  // Próxima página do banco (mesmos filtros e busca)
  const loadMoreContracts = async () => {
    if (loadingMore || !scopedMasterId) return;
    setLoadingMore(true);
    try {
      const venueIds = selectedVenueFilter === 'all'
        ? (currentUser?.role === 'master' ? undefined : currentUser?.venueIds)
        : [selectedVenueFilter];
      const next = await contractService.getContracts({
        masterId: scopedMasterId,
        venueIds,
        ...(activeTab === 'pending' ? { approvalStatus: 'pending_approval' as const } : { statuses: approvedStatuses }),
        ...listFilters,
        search: searchQuery.trim() || undefined,
        limit: CONTRACTS_PAGE_SIZE,
        offset: contracts.length,
      });
      setContracts(prev => {
        const ids = new Set(prev.map(c => c.id));
        const merged = [...prev, ...next.filter(c => !ids.has(c.id))];
        contractsListCache.set(cacheKey, merged);
        return merged;
      });
    } finally {
      setLoadingMore(false);
    }
  };

  // Tempo real: o AdminStateContext dispara este evento quando contracts/placements mudam
  useEffect(() => {
    const onChanged = () => { loadContracts(); };
    window.addEventListener('f5:contracts-changed', onChanged);
    return () => window.removeEventListener('f5:contracts-changed', onChanged);
  }, [loadContracts]);

  // Funis vinculados do contrato aberto (atualiza em tempo real junto com a lista)
  const selectedContractId = selectedContract?.id;
  useEffect(() => {
    if (!selectedContractId || !isDrawerOpen) { setContractPlacements([]); return; }
    let cancelled = false;
    const load = () => contractService.getPlacementsByContract(selectedContractId, scopedMasterId)
      .then(rows => { if (!cancelled) setContractPlacements(rows); });
    load();
    window.addEventListener('f5:contracts-changed', load);
    return () => { cancelled = true; window.removeEventListener('f5:contracts-changed', load); };
  }, [selectedContractId, isDrawerOpen, scopedMasterId]);

  const handleConfirmCancel = async () => {
    if (!selectedContract || !canCancelContract) return;
    if (!cancelReason.trim()) {
      toast.warning('Informe o motivo do cancelamento.');
      return;
    }
    setIsSubmittingCancel(true);
    try {
      const res = await contractService.cancelContract({
        contractId: selectedContract.id,
        masterId: scopedMasterId,
        reason: cancelReason.trim(),
        actor: {
          id: currentUser?.id || '',
          name: currentUser?.name || 'Gerência',
          role: currentUser?.role || '',
          commercialRole: (currentUser as any)?.commercialRole,
        },
      });
      if (!res.success) throw new Error(res.message || 'Falha ao cancelar contrato.');
      toast.success(`Contrato ${selectedContract.contractCode} cancelado e removido de todos os funis.`);
      setIsCancelModalOpen(false);
      setIsDrawerOpen(false);
      setCancelReason('');
      loadContracts();
    } catch (err: any) {
      toast.error(`Erro ao cancelar contrato: ${err.message || 'Falha de comunicação'}`);
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Jornada real do lead (lead_stage_history): etapas, entrada/saida e tempo em cada uma
  const [journey, setJourney] = useState<Awaited<ReturnType<typeof leadService.getStageHistory>>>([]);
  const journeyLeadId = selectedContract?.originLeadId || selectedContract?.leadId;
  useEffect(() => {
    if (!journeyLeadId || !isDrawerOpen) { setJourney([]); return; }
    let cancelled = false;
    leadService.getStageHistory(journeyLeadId, scopedMasterId).then(rows => { if (!cancelled) setJourney(rows); });
    return () => { cancelled = true; };
  }, [journeyLeadId, isDrawerOpen, scopedMasterId]);

  // Abertura direta vinda da busca global: abre o drawer do contrato na aba correta
  useEffect(() => {
    if (!initialContractId || !scopedMasterId) return;
    let cancelled = false;
    contractService.getContractById(initialContractId, scopedMasterId).then(ctr => {
      if (cancelled) return;
      if (!ctr) {
        toast.info('Contrato não encontrado.');
      } else {
        // Quem nao ve os aprovados (comercial) abre so os detalhes, sem trocar de aba nem ver o documento
        if (ctr.approvalStatus === 'pending_approval') { setActiveTab('pending'); setClosingId(ctr.id); }
        else if (canSeeApproved) setActiveTab('approved');
        handleOpenContract(ctr);
      }
      onInitialContractOpened?.();
    });
    return () => { cancelled = true; };
  }, [initialContractId, scopedMasterId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Abre drawer completo do contrato
  const handleOpenContract = (contract: Contract) => {
    setSelectedContract(contract);

    // Prepara funis de pós-venda disponíveis para a unidade do contrato
    const venuePostSaleFunnels = funnels.filter(f => f.isPostSale && f.venueId === contract.venueId);
    const initialFunnelIds = contract.targetPosSaleFunnelIds || contract.targetPostSaleFunnelIds;
    if (initialFunnelIds && initialFunnelIds.length > 0) {
      setSelectedPostSaleFunnelIds(initialFunnelIds);
    } else if (venuePostSaleFunnels.length > 0) {
      setSelectedPostSaleFunnelIds([venuePostSaleFunnels[0].id]);
    } else {
      setSelectedPostSaleFunnelIds([]);
    }

    setIsDrawerOpen(true);
  };

  // Redireciona o usuário DIRETAMENTE para o lead no Funil Comercial (sem abrir WhatsApp)
  const handleOpenLeadInFunnel = () => {
    if (!selectedContract) return;

    const leadId = selectedContract.originLeadId;
    const funnelId = selectedContract.originFunnelId;

    if (!leadId) {
      toast.info(`Este contrato (${selectedContract.contractCode}) não possui um Lead de origem vinculado.`);
      return;
    }

    if (onOpenLead) {
      onOpenLead(leadId, funnelId);
    } else if (onNavigateTab) {
      onNavigateTab('crm', { leadId, funnelId });
    }
  };

  // Alterna seleção de funis de pós-venda para homologação
  const handleTogglePostSaleFunnel = (funnelId: string) => {
    setSelectedPostSaleFunnelIds(prev =>
      prev.includes(funnelId) ? prev.filter(id => id !== funnelId) : [...prev, funnelId]
    );
  };

  // Executar Homologação do Contrato
  const handleConfirmApproval = async () => {
    if (!selectedContract || !canApproveContract) return;

    setIsSubmittingApproval(true);
    try {
      const res = await contractService.approveContract({
        contractId: selectedContract.id,
        masterId: scopedMasterId,
        approverUser: {
          id: currentUser?.id || 'admin',
          name: currentUser?.name || 'Gerência Comercial',
          role: currentUser?.role || 'master',
        },
        targetPosSaleFunnelIds: selectedPostSaleFunnelIds,
        lockEventDate,
      });

      if (!res.success) {
        throw new Error(res.message || 'Falha ao homologar contrato.');
      }

      toast.success(`Contrato ${selectedContract.contractCode} homologado com sucesso!`, {
        description: 'Snapshot imutável gravado, card distribuído para o pós-venda e data reservada.',
      });
      setIsApproveModalOpen(false);
      setIsDrawerOpen(false);
      loadContracts();
    } catch (err: any) {
      toast.error(`Erro ao aprovar contrato: ${err.message || 'Falha de comunicação'}`);
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // Executar Devolução / Solicitar Ajuste (Retorna ao Closer com Criação de Tarefa)
  const handleConfirmRejection = async () => {
    if (!selectedContract || !canApproveContract) return;
    if (!rejectionReason.trim()) {
      toast.warning('Informe obrigatoriamente o motivo do ajuste.');
      return;
    }

    setIsSubmittingRejection(true);
    try {
      const res = await contractService.rejectContract({
        contractId: selectedContract.id,
        masterId: scopedMasterId,
        rejectionReason: rejectionReason.trim(),
        approverUser: {
          id: currentUser?.id || 'admin',
          name: currentUser?.name || 'Gerência',
          role: currentUser?.role || 'master',
        },
      });

      if (!res.success) {
        throw new Error(res.message || 'Falha ao devolver contrato.');
      }

      toast.success(`Contrato ${selectedContract.contractCode} devolvido para ajuste!`, {
        description: `O lead voltou ao funil comercial em modo de alteração contratual e uma tarefa urgente (24h) foi criada para o Closer ${selectedContract.closerName || 'responsável'}.`,
      });
      setIsRejectModalOpen(false);
      setIsDrawerOpen(false);
      setRejectionReason('');
      loadContracts();
    } catch (err: any) {
      toast.error(`Erro ao solicitar ajuste: ${err.message || 'Falha de comunicação'}`);
    } finally {
      setIsSubmittingRejection(false);
    }
  };

  // Funis de pós-venda disponíveis para a unidade do contrato selecionado
  const availablePostSaleFunnels = useMemo(() => {
    if (!selectedContract) return [];
    return funnels.filter(f => f.isPostSale && f.venueId === selectedContract.venueId);
  }, [selectedContract, funnels]);

  // Estilos padronizados para Dark / Light
  const colors = {
    bgApp: isLight ? '#F8FAFC' : '#08070D',
    bgHeader: isLight ? '#FFFFFF' : '#0B0912',
    bgCard: isLight ? '#FFFFFF' : '#111A29',
    bgCardSub: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.03)',
    bgDrawer: isLight ? '#FFFFFF' : '#0D1424',
    border: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)',
    borderSub: isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.06)',
    textTitle: isLight ? '#0F172A' : '#F8FAFC',
    textBody: isLight ? '#334155' : '#CBD5E1',
    textMuted: isLight ? '#64748B' : '#94A3B8',
    primary: '#0284C7',
    success: '#059669',
    danger: '#DC2626',
    warning: '#D97706',
  };
  const filterSelectStyle: React.CSSProperties = { padding: '7px 10px', borderRadius: '8px', border: `1px solid ${colors.border}`, backgroundColor: colors.bgCard, color: colors.textTitle, fontSize: '0.8rem', outline: 'none' };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: '100%',
      backgroundColor: colors.bgApp,
      color: colors.textBody,
      overflow: 'hidden',
    }}>
      {/* Cabeçalho da página: título, ação principal, abas e filtros */}
      <div style={{
        padding: '18px 24px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.bgHeader,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: colors.textTitle, letterSpacing: '-0.2px' }}>
              Central de Contratos
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: colors.textMuted, maxWidth: '640px', lineHeight: 1.45 }}>
              Acompanhe as vendas em fechamento e os contratos homologados. O contrato nasce na venda e segue até o financeiro.
            </p>
          </div>

          {canEditClosing && (
            <HeaderActions>
              <button type="button" onClick={() => setProposalForm({ kind: 'new' })} style={{ ...headerPrimaryButtonStyle, background: 'transparent', color: 'var(--adm-text-title)', border: '1px solid var(--adm-border)' }}>
                <FileText size={15} /> Nova proposta
              </button>
              <button type="button" onClick={() => setFormModal({ mode: 'create' })} style={headerPrimaryButtonStyle}>
                <Plus size={15} /> Novo contrato
              </button>
            </HeaderActions>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          {/* Abas */}
          <div style={{
            display: 'flex',
            backgroundColor: colors.bgCardSub,
            padding: '3px',
            borderRadius: '10px',
            border: `1px solid ${colors.border}`,
          }}>
            <button
              onClick={() => setActiveTab('pending')}
              style={{
                padding: '7px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'pending' ? colors.primary : 'transparent',
                color: activeTab === 'pending' ? '#FFFFFF' : colors.textMuted,
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                transition: 'all 0.15s ease',
              }}
            >
              <Clock size={14} />
              <span>Em fechamento</span>
              <span style={{
                fontSize: '0.7rem',
                padding: '1px 6px',
                borderRadius: '5px',
                backgroundColor: activeTab === 'pending' ? 'rgba(0,0,0,0.25)' : colors.border,
                color: activeTab === 'pending' ? '#FFFFFF' : colors.textMuted,
                fontWeight: 800,
              }}>
                {tabTotals.pending ?? '•'}
              </span>
            </button>

            {canSeeApproved && <button
              onClick={() => setActiveTab('approved')}
              style={{
                padding: '7px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'approved' ? colors.primary : 'transparent',
                color: activeTab === 'approved' ? '#FFFFFF' : colors.textMuted,
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                transition: 'all 0.15s ease',
              }}
            >
              <CheckCircle2 size={14} />
              <span>Contratos aprovados</span>
              <span style={{
                fontSize: '0.7rem',
                padding: '1px 6px',
                borderRadius: '5px',
                backgroundColor: activeTab === 'approved' ? 'rgba(0,0,0,0.25)' : colors.border,
                color: activeTab === 'approved' ? '#FFFFFF' : colors.textMuted,
                fontWeight: 800,
              }}>
                {tabTotals.approved ?? '•'}
              </span>
            </button>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {!canApproveContract && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.74rem',
                color: colors.warning,
                backgroundColor: isLight ? '#FEF3C7' : 'rgba(217, 119, 6, 0.1)',
                padding: '5px 10px',
                borderRadius: '8px',
                border: `1px solid ${isLight ? '#FDE68A' : 'rgba(217, 119, 6, 0.2)'}`,
              }}>
                <ShieldCheck size={13} />
                <span>Homologação restrita à gerência comercial ou master</span>
              </div>
            )}

            {venues.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building2 size={14} color={colors.textMuted} />
                <Select
                  value={selectedVenueFilter}
                  onChange={e => setSelectedVenueFilter(e.target.value)}
                  style={{
                    padding: '7px 10px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.bgCard,
                    color: colors.textTitle,
                    fontSize: '0.8rem',
                    outline: 'none',
                  }}
                >
                  <option value="all">Todas as unidades</option>
                  {venues.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </Select>
              </div>
            )}

            {activeTab === 'approved' && (
              <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'active' | 'canceled' | 'all')} style={filterSelectStyle} title="Situação do contrato">
                <option value="active">Ativos</option>
                <option value="canceled">Cancelados</option>
                <option value="all">Todos (ativos e cancelados)</option>
              </Select>
            )}
            <Select value={responsibleFilter} onChange={e => setResponsibleFilter(e.target.value)} style={filterSelectStyle} title="Especialista ou SDR responsável">
              <option value="">Todos os responsáveis</option>
              {responsibleOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select value={eventTypeFilter} onChange={e => setEventTypeFilter(e.target.value)} style={filterSelectStyle} title="Tipo de evento">
              <option value="">Todos os tipos</option>
              {EVENT_TYPE_FILTERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
            <DateRangeField className="adm-input" start={eventRange.start} end={eventRange.end} onChange={(x, y) => setEventRange({ start: x, end: y })} placeholder="Data da festa" />
            {hasListFilters && (
              <button type="button" onClick={clearListFilters} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 10px', borderRadius: 8, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textMuted, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                <X size={12} /> Limpar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Miolo de Conteúdo Rolável */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 24px',
      }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '12px' }}>
            <RefreshCw size={24} className="animate-spin" color={colors.primary} />
            <span style={{ fontSize: '0.82rem', color: colors.textMuted }}>Carregando contratos...</span>
          </div>
        ) : contracts.length === 0 && !(activeTab === 'pending' && proposals.length > 0) ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 24px',
            textAlign: 'center',
            backgroundColor: colors.bgCard,
            border: `1px solid ${colors.border}`,
            borderRadius: '10px',
          }}>
            <FileText size={36} color={colors.textMuted} style={{ marginBottom: '12px' }} />
            <h3 style={{ margin: '0 0 6px 0', fontSize: '0.96rem', fontWeight: 700, color: colors.textTitle }}>
              {activeTab === 'pending' ? 'Nenhuma venda em fechamento' : 'Nenhum contrato aprovado'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.78rem', color: colors.textMuted, maxWidth: '420px' }}>
              {activeTab === 'pending'
                ? 'Quando um lead for arrastado para a venda, o contrato aparece aqui para o especialista completar documentos e condições de pagamento. Você também pode registrar uma venda manualmente.'
                : 'Os contratos aprovados e ativos no pós-venda serão listados aqui com auditoria perpétua.'}
            </p>
            {activeTab === 'pending' && canEditClosing && (
              <button
                type="button"
                onClick={() => setFormModal({ mode: 'create' })}
                style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 18px', borderRadius: '9px', border: 'none', backgroundColor: colors.primary, color: '#FFFFFF', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer' }}
              >
                <Plus size={15} />
                <span>Registrar contrato</span>
              </button>
            )}
          </div>
        ) : activeTab === 'pending' ? (
          /* ABA 1: FECHAMENTO. Quadro por etapa; clicar abre a ficha (mesma estrutura da aprovacao do financeiro) */
          <div style={closingId && contracts.some(c => c.id === closingId) ? { margin: '-20px -24px', height: 'calc(100% + 40px)' } : undefined}>
            {closingId && contracts.some(c => c.id === closingId) ? (
              <ContractClosingWorkspace
                contracts={contracts}
                masterId={scopedMasterId}
                canEdit={canEditClosing}
                canViewDocs={canViewDocs}
                selectedId={closingId}
                onSelect={setClosingId}
                onBack={() => setClosingId(null)}
                height="100%"
                onChanged={() => loadContracts()}
              />
            ) : (
              <div>
                <ContractBoard height="calc(100vh - 235px)"
                  showProposals
                  cards={[...proposals.map<BoardCard>(p => ({
                    id: p.id,
                    stage: 'proposta',
                    title: p.title,
                    payer: p.clientSnapshot?.payerName || p.clientSnapshot?.name,
                    venueId: p.venueId || '',
                    total: p.totalAmount,
                    eventDate: p.eventDate,
                    closer: p.closerName || undefined,
                    sdr: p.sdrName || undefined,
                    tag: p.source === 'importacao' ? 'Proposta histórica' : 'Proposta',
                  })), ...contracts.map<BoardCard>(c => ({
                    id: c.id,
                    stage: (c.fillStage || 'pendente'),
                    title: c.contractTitle || c.title || c.clientSnapshot?.name || c.contractCode,
                    payer: c.clientSnapshot?.payerName || c.clientSnapshot?.name,
                    venueId: c.venueId,
                    total: c.totalAmount || 0,
                    eventDate: c.eventDate,
                    signal: c.signalAmount,
                    entry: c.entryAmount,
                    closer: c.closerName,
                    sdr: c.sdrName,
                    message: c.financeMessage ? `Financeiro: ${c.financeMessage}` : undefined,
                    missing: contractService.getFillMissing(c).length,
                    tag: (c.commercialFieldsSnapshot as any)?.registroManual ? 'Registro manual' : (c.commercialFieldsSnapshot as any)?.propostaOrigem ? 'Veio de proposta' : undefined,
                  }))]}
                  onOpen={(id) => { const p = proposals.find(x => x.id === id); if (!p) { setClosingId(id); return; } if (p.leadId && leads.some(l => l.id === p.leadId)) setProposalWorkspace(p); else setProposalDetail(p); }}
                  emptyText="Nenhuma venda"
                />
              </div>
            )}
          </div>
        ) : (
          /* ======================================================== */
          /* ABA 2: TABELA DE CONTRATOS HOMOLOGADOS & ATIVOS         */
          /* ======================================================== */
          <div style={{
            backgroundColor: colors.bgCard,
            border: `1px solid ${colors.border}`,
            borderRadius: '10px',
            overflow: 'hidden',
          }}>
            {canEditTeam && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '8px 16px', borderBottom: `1px solid ${colors.border}`, backgroundColor: selectMode ? (isLight ? '#E0F2FE' : 'rgba(2,132,199,0.15)') : colors.bgCardSub, fontSize: '0.76rem', color: colors.textTitle }}>
                {!selectMode ? (
                  <button type="button" onClick={() => setSelectMode(true)} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, backgroundColor: 'transparent', color: colors.textTitle, fontWeight: 700, cursor: 'pointer', fontSize: '0.74rem' }}>
                    <CheckSquare size={13} /> Selecionar
                  </button>
                ) : (
                  <>
                    <strong>{pickedIds.size} selecionado(s)</strong>
                    <span style={{ color: colors.textMuted }}>Clique em qualquer ponto da linha para marcar.</span>
                    <button type="button" onClick={() => setPickedIds(prev => { const n = new Set(prev); contracts.forEach(c => n.add(c.id)); return n; })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.primary, fontWeight: 700, fontSize: '0.74rem' }}>Todos os listados ({contracts.length})</button>
                    <button type="button" onClick={() => setPickedIds(prev => { const n = new Set(prev); contracts.filter(c => !c.sdrName && !c.closerName).forEach(c => n.add(c.id)); return n; })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.primary, fontWeight: 700, fontSize: '0.74rem' }}>Só os sem responsável</button>
                    {pickedIds.size > 0 && (
                      <button type="button" onClick={() => setPickedIds(new Set())} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, fontWeight: 700, fontSize: '0.74rem' }}>Limpar</button>
                    )}
                    <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 8 }}>
                      <button type="button" onClick={() => { setSelectMode(false); setPickedIds(new Set()); }} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, backgroundColor: 'transparent', color: colors.textTitle, fontWeight: 700, cursor: 'pointer', fontSize: '0.74rem' }}>Cancelar</button>
                      <button type="button" disabled={pickedIds.size === 0} onClick={() => setTeamModalIds(Array.from(pickedIds))} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', backgroundColor: colors.primary, color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '0.76rem', opacity: pickedIds.size === 0 ? 0.5 : 1 }}>Definir SDR / Closer</button>
                    </span>
                  </>
                )}
              </div>
            )}
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.80rem' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                <tr style={{
                  backgroundColor: colors.bgCardSub,
                  borderBottom: `1px solid ${colors.border}`,
                  color: colors.textMuted,
                  textTransform: 'uppercase',
                  fontSize: '0.70rem',
                  letterSpacing: '0.5px',
                  fontWeight: 700,
                }}>
                  {canEditTeam && selectMode && <th style={{ padding: '12px 8px 12px 16px', width: 28 }} />}
                  <th style={{ padding: '12px 16px', width: '170px' }}>Contrato</th>
                  <th style={{ padding: '12px 16px' }}>Cliente / contrato</th>
                  <th style={{ padding: '12px 16px', width: '130px' }}>Data da festa</th>
                  <th style={{ padding: '12px 16px', width: '210px' }}>Equipe da venda</th>
                  <th style={{ padding: '12px 16px', width: '130px' }}>Valor total</th>
                  <th style={{ padding: '12px 16px', width: '200px' }}>Homologado por</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', width: '120px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map(ctr => {
                  const clientName = ctr.clientSnapshot?.name || ctr.contact?.name || 'Cliente';
                  const totalAmount = ctr.totalAmount || ctr.contractValue || 0;
                  const venueObj = venues.find(v => v.id === ctr.venueId);
                  const venueTitle = ctr.venueName || venueObj?.name || 'Unidade';

                  return (
                    <tr
                      key={ctr.id}
                      onClick={() => (selectMode ? togglePicked(ctr.id) : handleOpenContract(ctr))}
                      style={{
                        borderBottom: `1px solid ${colors.borderSub}`,
                        cursor: 'pointer',
                        backgroundColor: selectMode && pickedIds.has(ctr.id) ? (isLight ? '#E0F2FE' : 'rgba(2,132,199,0.15)') : undefined,
                        transition: 'background-color 0.1s ease',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.bgCardSub)}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = selectMode && pickedIds.has(ctr.id) ? (isLight ? '#E0F2FE' : 'rgba(2,132,199,0.15)') : 'transparent')}
                    >
                      {canEditTeam && selectMode && (
                        <td style={{ padding: '12px 8px 12px 16px' }}>
                          <span style={{ pointerEvents: 'none', display: 'inline-flex' }}><Checkbox checked={pickedIds.has(ctr.id)} /></span>
                        </td>
                      )}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          whiteSpace: 'nowrap',
                          fontSize: '0.76rem',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: isLight ? '#E0F2FE' : 'rgba(2, 132, 199, 0.15)',
                          color: colors.primary,
                        }}>
                          {ctr.contractCode}
                        </span>
                        {ctr.approvalStatus === 'canceled' && (
                          <span style={{ display: 'block', marginTop: 4, width: 'fit-content', fontSize: '0.62rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: 'rgba(220,38,38,0.12)', color: '#DC2626', textTransform: 'uppercase' }}>Cancelado</span>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <strong style={{ color: colors.textTitle, display: 'block' }}>
                          {(ctr.contractTitle || ctr.title || clientName || 'Contrato').replace(/\?{2,}/g, ' - ').replace(/\?/g, '').trim()}
                        </strong>
                        <span style={{ fontSize: '0.72rem', color: colors.textMuted }}>
                          {(ctr.contractTitle || ctr.title) ? `${(clientName || '').replace(/\?{2,}/g, ' - ').replace(/\?/g, '').trim()} • ${venueTitle}` : venueTitle}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: colors.textTitle }}>
                          <Calendar size={12} color={colors.primary} />
                          {ctr.eventDate ? new Date(ctr.eventDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'A definir'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <div style={{ fontSize: '0.74rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {ctr.closerName ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <SafeAvatar src={collabAvatar(ctr.closerId, ctr.closerName)} name={ctr.closerName} size={20} />
                              <span>Especialista: <strong style={{ color: colors.textTitle }}>{ctr.closerName}</strong></span>
                            </div>
                          ) : !ctr.sdrName && (
                            <span style={{ color: colors.textMuted, fontStyle: 'italic' }}>Sem responsável definido</span>
                          )}
                          {ctr.sdrName && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.textMuted }}>
                              <SafeAvatar src={collabAvatar(ctr.sdrId, ctr.sdrName)} name={ctr.sdrName} size={20} />
                              <span>SDR: {ctr.sdrName}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px', fontWeight: 800, color: colors.textTitle }}>
                        R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>

                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <span style={{
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          padding: '3px 9px',
                          borderRadius: '999px',
                          backgroundColor: isLight ? '#D1FAE5' : 'rgba(5, 150, 105, 0.15)',
                          color: colors.success,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          maxWidth: '100%',
                        }}>
                          <ShieldCheck size={12} style={{ flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ctr.approvedByName || 'Gerência'}</span>
                        </span>
                        {ctr.approvedAt && (
                          <span style={{ display: 'block', fontSize: '0.68rem', color: colors.textMuted, marginTop: '2px' }}>
                            {new Date(ctr.approvedAt).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenContract(ctr);
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: `1px solid ${colors.border}`,
                            backgroundColor: colors.bgCard,
                            color: colors.textTitle,
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Ver detalhes
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && hasMoreContracts && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '18px 0 4px 0' }}>
            <span style={{ fontSize: '0.74rem', color: colors.textMuted }}>
              Mostrando {contracts.length} de {activeTotal}
            </span>
            <button
              type="button"
              onClick={loadMoreContracts}
              disabled={loadingMore}
              style={{ padding: '8px 18px', borderRadius: '8px', border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textTitle, fontSize: '0.78rem', fontWeight: 700, cursor: loadingMore ? 'wait' : 'pointer' }}
            >
              {loadingMore ? 'Carregando...' : 'Carregar mais contratos'}
            </button>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* TELA DO CONTRATO: DRAWER LATERAL AMPLO (VISÃO COMPLETA)     */}
      {/* ============================================================ */}
      {isDrawerOpen && selectedContract && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.70)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setIsDrawerOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '860px',
              height: '100%',
              backgroundColor: colors.bgDrawer,
              borderLeft: `1px solid ${colors.border}`,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.25)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header do Drawer */}
            <div style={{
              padding: '16px 24px',
              borderBottom: `1px solid ${colors.border}`,
              backgroundColor: colors.bgHeader,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  style={{
                    background: 'none',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '6px',
                    padding: '6px',
                    cursor: 'pointer',
                    color: colors.textTitle,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                      fontFamily: 'monospace',
                      fontSize: '0.80rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: isLight ? '#E0F2FE' : 'rgba(2, 132, 199, 0.15)',
                      color: colors.primary,
                    }}>
                      {selectedContract.contractCode}
                    </span>

                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: selectedContract.approvalStatus === 'approved'
                        ? (isLight ? '#D1FAE5' : 'rgba(5, 150, 105, 0.15)')
                        : (isLight ? '#FEF3C7' : 'rgba(245, 158, 11, 0.15)'),
                      color: selectedContract.approvalStatus === 'approved' ? colors.success : colors.warning,
                    }}>
                      {selectedContract.approvalStatus === 'approved' ? 'Homologado & Ativo' : 'Aguardando Aprovação'}
                    </span>
                  </div>

                  <h2 style={{ margin: '4px 0 0 0', fontSize: '1.15rem', fontWeight: 800, color: colors.textTitle }}>
                    {selectedContract.contractTitle || selectedContract.title || `Contrato: ${selectedContract.clientSnapshot?.name || selectedContract.contact?.name || 'Cliente'}`}
                  </h2>
                  {(selectedContract.contractTitle || selectedContract.title) && (
                    <div style={{ fontSize: '0.74rem', color: colors.textMuted, marginTop: '2px' }}>
                      Contratante: <strong style={{ color: colors.textTitle }}>{selectedContract.clientSnapshot?.name || selectedContract.contact?.name || 'Cliente'}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Botão de Atalho para Abrir Lead DIRETAMENTE no Funil Comercial */}
              <button
                onClick={handleOpenLeadInFunnel}
                style={{
                  backgroundColor: colors.primary,
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 14px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                }}
              >
                <Kanban size={14} />
                <span>Abrir Lead no Funil Comercial</span>
              </button>
            </div>

            {/* Conteúdo Rolável do Drawer */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}>
              {/* Resumo explicativo do contrato */}
              {(() => {
                const c = selectedContract;
                const money = (v?: number) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                const saldo = c.balanceAmount ?? Math.max(0, (c.totalAmount || 0) - (c.entryAmount || 0) - (c.signalAmount || 0));
                const fmt = (d?: string | null) => (d ? new Date(`${String(d).split('T')[0]}T12:00:00`).toLocaleDateString('pt-BR') : 'a definir');
                const tipo = c.eventType === '15_anos' ? 'Festa de 15 anos' : (c.eventType || 'Evento');
                const lines = paymentTextLines(c.paymentSummary);
                const facts: Array<[string, string]> = [
                  ['Tipo do evento', tipo], ['Data da festa', fmt(c.eventDate)], ['Convidados', String(c.guestCount || 0)],
                  ['Pacote', c.packageName || '—'], ['Unidade', c.venueName || '—'], ['Contrato fechado em', fmt(c.closedAt || c.createdAt)],
                  ['SDR', c.sdrName || '—'], ['Closer', c.closerName || '—'],
                  ['Aprovado por', c.approvedByName ? `${c.approvedByName}${c.approvedAt ? ` em ${fmt(c.approvedAt)}` : ''}` : '—'],
                ];
                return (
                  <div style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: colors.primary, textTransform: 'uppercase' }}>
                      <FileText size={14} /><span>Resumo do contrato</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.84rem', lineHeight: 1.5, color: colors.textBody }}>
                      {tipo} para <strong>{c.guestCount || 0} convidados</strong> em <strong>{fmt(c.eventDate)}</strong>, na unidade <strong>{c.venueName || '—'}</strong>, no valor total de <strong>{money(c.totalAmount)}</strong>.
                      {(c.signalAmount || 0) > 0 || (c.entryAmount || 0) > 0 ? <> O cliente pagou ou combinou {(c.signalAmount || 0) > 0 ? <>sinal de <strong>{money(c.signalAmount)}</strong></> : null}{(c.signalAmount || 0) > 0 && (c.entryAmount || 0) > 0 ? ' e ' : ''}{(c.entryAmount || 0) > 0 ? <>entrada de <strong>{money(c.entryAmount)}</strong></> : null}; o restante é de <strong>{money(saldo)}</strong>.</> : <> O restante a pagar é de <strong>{money(saldo)}</strong>.</>}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                      {([['Valor total', c.totalAmount, colors.textTitle], ['Sinal', c.signalAmount, colors.success], ['Entrada', c.entryAmount, colors.success], ['Saldo restante', saldo, colors.warning]] as Array<[string, number | undefined, string]>).map(([l, v, col]) => (
                        <div key={l} style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: colors.bgCardSub, border: `1px solid ${colors.borderSub}` }}>
                          <div style={{ fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', color: colors.textMuted }}>{l}</div>
                          <div style={{ fontSize: '1.02rem', fontWeight: 900, color: col }}>{money(v)}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', columnGap: '24px' }}>
                      {facts.map(([l, v]) => (
                        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '6px 0', borderBottom: `1px dashed ${colors.borderSub}`, fontSize: '0.78rem' }}>
                          <span style={{ color: colors.textMuted }}>{l}</span><strong style={{ color: colors.textTitle, textAlign: 'right' }}>{v}</strong>
                        </div>
                      ))}
                    </div>
                    {lines.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: colors.textMuted, marginBottom: '6px' }}>Como o cliente vai pagar (conforme o contrato)</div>
                        <PaymentTextList lines={lines} />
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Grid: Dados do Cliente & Pessoas Relacionadas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                
                {/* Bloco 1: Dados do Cliente Contratante */}
                <div style={{
                  backgroundColor: colors.bgCard,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: colors.primary, textTransform: 'uppercase' }}>
                    <User size={14} />
                    <span>Dados do Cliente Contratante</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: colors.textMuted }}>Nome:</span>
                      <strong style={{ color: colors.textTitle }}>
                        {selectedContract.clientSnapshot?.name || selectedContract.contact?.name || 'Cliente'}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: colors.textMuted }}>Código Contato:</span>
                      <strong style={{ fontFamily: 'monospace', color: colors.primary }}>
                        {selectedContract.contact?.code || 'CONT-VINCULADO'}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: colors.textMuted }}>CPF:</span>
                      <span style={{ color: colors.textTitle, fontFamily: 'monospace' }}>
                        {selectedContract.clientSnapshot?.cpf || selectedContract.contact?.cpf || 'Não informado'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: colors.textMuted }}>Telefone / WhatsApp:</span>
                      <strong style={{ color: colors.primary }}>
                        {formatPhone(selectedContract.clientSnapshot?.phone || selectedContract.contact?.primaryPhone || '')}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: colors.textMuted }}>E-mail:</span>
                      <span style={{ color: colors.textTitle }}>
                        {selectedContract.clientSnapshot?.email || selectedContract.contact?.email || 'Não informado'}
                      </span>
                    </div>

                    <div>
                      <span style={{ color: colors.textMuted, display: 'block' }}>Endereço Residencial:</span>
                      <span style={{ color: colors.textTitle }}>
                        {selectedContract.clientSnapshot?.address
                          ? `${selectedContract.clientSnapshot.address}, ${selectedContract.clientSnapshot.neighborhood || ''} - ${selectedContract.clientSnapshot.city || ''}`
                          : (selectedContract.contact?.street ? `${selectedContract.contact.street}, ${selectedContract.contact.neighborhood || ''}` : 'Não informado')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bloco 2: Pessoas Relacionadas ao Contrato */}
                <div style={{
                  backgroundColor: colors.bgCard,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: colors.warning, textTransform: 'uppercase' }}>
                    <Users size={14} />
                    <span>Pessoas Relacionadas ao Contrato</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem' }}>
                    {/* Homenageada / Debutante */}
                    <div style={{ padding: '8px 10px', borderRadius: '6px', backgroundColor: colors.bgCardSub, border: `1px solid ${colors.borderSub}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <strong style={{ color: colors.textTitle }}>
                          {selectedContract.clientSnapshot?.birthdayPersonName || selectedContract.eventTitle || 'Debutante'}
                        </strong>
                        <span style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: '4px', backgroundColor: 'rgba(236, 72, 153, 0.15)', color: '#EC4899', fontWeight: 700 }}>
                          Homenageada
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: colors.textMuted, marginTop: '2px' }}>
                        Data da Festa: {selectedContract.eventDate ? new Date(selectedContract.eventDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'A definir'}
                      </div>
                    </div>

                    {/* Dependentes / Cônjuge Cadastrados no Contato */}
                    {selectedContract.contact?.dependents && selectedContract.contact.dependents.length > 0 ? (
                      selectedContract.contact.dependents.map((dep, idx) => (
                        <div key={dep.id || idx} style={{ padding: '8px 10px', borderRadius: '6px', backgroundColor: colors.bgCardSub, border: `1px solid ${colors.borderSub}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <strong style={{ color: colors.textTitle }}>{dep.name}</strong>
                            <span style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: '4px', backgroundColor: colors.borderSub, color: colors.textMuted }}>
                              {dep.relationship || 'Familiar'}
                            </span>
                          </div>
                          {dep.birthDate && (
                            <div style={{ fontSize: '0.72rem', color: colors.textMuted, marginTop: '2px' }}>
                              Nascimento: {new Date(dep.birthDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '8px 10px', borderRadius: '6px', backgroundColor: colors.bgCardSub, border: `1px solid ${colors.borderSub}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <strong style={{ color: colors.textTitle }}>Co-Responsável Financeiro</strong>
                          <span style={{ fontSize: '0.68rem', color: colors.textMuted }}>Titular Adicional</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: colors.textMuted, marginTop: '2px' }}>
                          Avalista ou cônjuge registrado no fechamento do contrato.
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Bloco 3: Contrato Formal Assinado & Condições Financeiras */}
              <div style={{
                backgroundColor: colors.bgCard,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: colors.success, textTransform: 'uppercase' }}>
                    <ShieldCheck size={14} />
                    <span>Contrato Formal Assinado & Comprovantes</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: colors.success, fontWeight: 600 }}>
                    Assinatura Digital Válida
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', fontSize: '0.78rem' }}>
                  <div style={{ padding: '10px 12px', borderRadius: '6px', backgroundColor: colors.bgCardSub, border: `1px solid ${colors.borderSub}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={24} color={colors.primary} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ color: colors.textTitle, display: 'block', fontSize: '0.80rem' }}>
                        Contrato_{selectedContract.contractCode}.pdf
                      </strong>
                      <span style={{ fontSize: '0.70rem', color: colors.textMuted }}>Documento formal assinado</span>
                      {selectedContract.contractFileUrl && !canViewDocs ? (
                        <span style={{ fontSize: '0.70rem', color: colors.textMuted, display: 'block', marginTop: '2px' }}>Anexado. O documento abre no Pós-venda e no Financeiro.</span>
                      ) : selectedContract.contractFileUrl ? (
                        <a href={selectedContract.contractFileUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.72rem', color: colors.primary, fontWeight: 700, display: 'block', marginTop: '2px' }}>
                          Abrir / baixar contrato
                        </a>
                      ) : (
                        <span style={{ fontSize: '0.70rem', color: colors.textMuted, display: 'block', marginTop: '2px' }}>
                          Sem arquivo anexado
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ padding: '10px 12px', borderRadius: '6px', backgroundColor: colors.bgCardSub, border: `1px solid ${colors.borderSub}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Receipt size={24} color={colors.success} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ color: colors.textTitle, display: 'block', fontSize: '0.80rem' }}>
                        Entrada / Sinal (Comprovante)
                      </strong>
                      <span style={{ fontSize: '0.70rem', color: colors.textMuted }}>
                        Valores combinados:
                      </span>
                      <span style={{ fontSize: '0.82rem', color: colors.success, fontWeight: 800, display: 'block', marginTop: '2px' }}>
                        Sinal R$ {(selectedContract.signalAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} · Entrada R$ {(selectedContract.entryAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      {selectedContract.paymentFileUrl && !canViewDocs ? (
                        <span style={{ fontSize: '0.70rem', color: colors.textMuted, display: 'block', marginTop: '2px' }}>Anexado. O documento abre no Pós-venda e no Financeiro.</span>
                      ) : selectedContract.paymentFileUrl ? (
                        <a href={selectedContract.paymentFileUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.72rem', color: colors.success, fontWeight: 700, display: 'block', marginTop: '3px' }}>
                          Abrir / baixar comprovante
                        </a>
                      ) : (
                        <span style={{ fontSize: '0.70rem', color: colors.textMuted, display: 'block', marginTop: '2px' }}>
                          Sem anexo de comprovante
                        </span>
                      )}
                    </div>
                  </div>

                  {canViewDocs && getExtraContractDocuments(selectedContract).map((doc, i) => (
                    <div key={`${doc.url}-${i}`} style={{ padding: '10px 12px', borderRadius: '6px', backgroundColor: colors.bgCardSub, border: `1px solid ${colors.borderSub}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FileText size={24} color={colors.textMuted} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ color: colors.textTitle, display: 'block', fontSize: '0.80rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.name}>{doc.name}</strong>
                        <span style={{ fontSize: '0.70rem', color: colors.textMuted, textTransform: 'capitalize' }}>{doc.kind}</span>
                        <a href={doc.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.72rem', color: colors.primary, fontWeight: 700, display: 'block', marginTop: '2px' }}>
                          Abrir / baixar
                        </a>
                      </div>
                    </div>
                  ))}

                </div>
              </div>

              {/* Bloco 4: Passagem de Bastão (Handover Comercial -> Pós-Venda) */}
              <div style={{
                backgroundColor: colors.bgCard,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#A855F7', textTransform: 'uppercase' }}>
                    <ArrowRightLeft size={14} />
                    <span>Passagem de Bastão (Briefing Comercial para o Pós-Venda)</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: colors.textMuted, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    {canEditTeam && (
                      <button type="button" onClick={() => setTeamModalIds([selectedContract.id])} style={{ padding: '3px 10px', borderRadius: 6, border: `1px solid ${colors.primary}`, background: 'transparent', color: colors.primary, fontWeight: 800, cursor: 'pointer', fontSize: '0.70rem' }}>Editar SDR / Closer</button>
                    )}
                    {selectedContract.closerName ? 'Preenchido pelo Closer: ' + selectedContract.closerName : 'Closer ainda não definido'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px', fontSize: '0.78rem' }}>
                  <div style={{ padding: '10px 12px', borderRadius: '6px', backgroundColor: colors.bgCardSub, border: `1px solid ${colors.borderSub}` }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: colors.textTitle, display: 'block', marginBottom: '4px' }}>
                      Ficha do Fechamento Comercial:
                    </span>
                    <p style={{ margin: 0, color: colors.textMuted, fontSize: '0.76rem', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
                      {selectedContract.handoverNotes || (selectedContract.commercialFieldsSnapshot as any)?.debutanteWishes || 'Conforme alinhamento comercial'}
                    </p>
                  </div>

                  <div style={{ padding: '10px 12px', borderRadius: '6px', backgroundColor: colors.bgCardSub, border: `1px solid ${colors.borderSub}` }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: colors.textTitle, display: 'block', marginBottom: '4px' }}>
                      Combinados, Promessas e Condições Especiais:
                    </span>
                    <p style={{ margin: 0, color: colors.textMuted, fontSize: '0.76rem', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
                      {((selectedContract.commercialFieldsSnapshot as any)?.familyPromises)
                        || ((selectedContract.commercialFieldsSnapshot as any)?.closerNotes)
                        || 'Nenhum combinado registrado no fechamento'}
                    </p>
                    {(() => {
                      const sc = ((selectedContract.commercialFieldsSnapshot as any)?.specialConditions || {}) as { financeiro?: string; decoracao?: string; outros?: string };
                      const rows: Array<[string, string | undefined]> = [['Financeiro', sc.financeiro], ['Decoração', sc.decoracao], ['Outras', sc.outros]];
                      const filled = rows.filter(([, v]) => v);
                      if (filled.length === 0) return null;
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                          {filled.map(([label, v]) => (
                            <div key={label} style={{ fontSize: '0.74rem', color: colors.textMuted, whiteSpace: 'pre-wrap' }}>
                              <strong style={{ color: colors.textTitle }}>{label}:</strong> {v}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Bloco 5: Histórico da Jornada do Lead */}
              <div style={{
                backgroundColor: colors.bgCard,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: colors.primary, textTransform: 'uppercase' }}>
                  <History size={14} />
                  <span>Histórico da Jornada do Lead (Até a Assinatura)</span>
                </div>

                {journey.length > 0 && (() => {
                  const fmtDur = (ms: number) => {
                    const mins = Math.max(0, Math.round(ms / 60000));
                    if (mins < 60) return `${mins} min`;
                    const h = Math.floor(mins / 60);
                    if (h < 24) return `${h}h ${String(mins % 60).padStart(2, '0')}min`;
                    const d = Math.floor(h / 24);
                    return `${d}d ${h % 24}h`;
                  };
                  const start = new Date(journey[0].enteredAt).getTime();
                  const endRef = selectedContract.submittedAt || selectedContract.approvedAt || selectedContract.createdAt;
                  const end = endRef ? new Date(endRef).getTime() : Date.now();
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem' }}>
                      <div style={{ color: colors.textMuted, fontSize: '0.72rem' }}>
                        Tempo total na esteira até o fechamento: <strong style={{ color: colors.textTitle }}>{fmtDur(end - start)}</strong>
                      </div>
                      {journey.map((h, i) => {
                        const funnel = funnels.find(f => f.id === h.funnelId);
                        const name = h.stageName || funnel?.stages?.find(s => s.id === h.stageId)?.name || h.stageId;
                        const leftMs = h.leftAt ? new Date(h.leftAt).getTime() : end;
                        return (
                          <div key={`${h.stageId}-${i}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '6px 10px', borderRadius: '6px', backgroundColor: colors.bgCardSub, border: `1px solid ${colors.borderSub}` }}>
                            <div>
                              <strong>{i + 1}. {name}</strong>
                              {funnel ? <span style={{ color: colors.textMuted }}> · {funnel.name}</span> : null}
                              {h.movedByName ? <span style={{ color: colors.textMuted }}> · por {h.movedByName}</span> : null}
                            </div>
                            <span style={{ color: colors.textMuted, fontSize: '0.70rem', whiteSpace: 'nowrap' }}>
                              {new Date(h.enteredAt).toLocaleDateString('pt-BR')} · {fmtDur(Math.max(0, leftMs - new Date(h.enteredAt).getTime()))}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                <div style={{ display: journey.length > 0 ? 'none' : 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: '6px', backgroundColor: colors.bgCardSub, border: `1px solid ${colors.borderSub}` }}>
                    <div>
                      <strong>1. Entrada do Lead:</strong> Campanha Comercial ({selectedContract.venueName})
                    </div>
                    <span style={{ color: colors.textMuted, fontSize: '0.70rem' }}>
                      {new Date(selectedContract.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: '6px', backgroundColor: colors.bgCardSub, border: `1px solid ${colors.borderSub}` }}>
                    <div>
                      <strong>2. Atendimento & Qualificação:</strong> {selectedContract.sdrName ? 'Contato conduzido pelo SDR ' + selectedContract.sdrName : 'SDR ainda não definido'}
                    </div>
                    <span style={{ color: colors.textMuted, fontSize: '0.70rem' }}>SDR Atribuído</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: '6px', backgroundColor: colors.bgCardSub, border: `1px solid ${colors.borderSub}` }}>
                    <div>
                      <strong>3. Visita / Degustação Presencial:</strong> {selectedContract.closerName ? 'Conduzida pelo Closer ' + selectedContract.closerName : 'Closer ainda não definido'}
                    </div>
                    <span style={{ color: colors.textMuted, fontSize: '0.70rem' }}>Concluída</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: '6px', backgroundColor: colors.bgCardSub, border: `1px solid ${colors.borderSub}` }}>
                    <div>
                      <strong>4. Fechamento Comercial:</strong> Contrato assinado e enviado para homologação
                    </div>
                    <span style={{ color: colors.success, fontSize: '0.70rem', fontWeight: 700 }}>Concluído</span>
                  </div>
                </div>
              </div>

              {/* Bloco 6: Funis de Pós-Venda vinculados (clique para abrir o contrato no funil) */}
              {(selectedContract.approvalStatus === 'approved' || selectedContract.approvalStatus === 'completed') && (
                <div style={{
                  backgroundColor: colors.bgCard,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: colors.primary, textTransform: 'uppercase' }}>
                    <Kanban size={14} />
                    <span>Funis vinculados a este contrato</span>
                  </div>
                  {contractPlacements.length === 0 ? (
                    <span style={{ fontSize: '0.76rem', color: colors.textMuted }}>Nenhum funil de pós-venda vinculado.</span>
                  ) : contractPlacements.map(pl => {
                    const funnel = funnels.find(f => f.id === pl.funnelId);
                    const stageName = funnel?.stages?.find(s => s.id === pl.stageId)?.name || pl.stageId;
                    return (
                      <button
                        key={pl.id}
                        type="button"
                        onClick={() => {
                          setIsDrawerOpen(false);
                          onOpenContractKanban?.(selectedContract.id, pl.funnelId, selectedContract.clientId);
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
                          padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', textAlign: 'left',
                          backgroundColor: colors.bgCardSub, border: `1px solid ${colors.borderSub}`, color: colors.textTitle,
                        }}
                      >
                        <span style={{ fontWeight: 700, fontSize: '0.80rem' }}>{pl.funnelName || funnel?.name || 'Funil'}</span>
                        <span style={{ fontSize: '0.72rem', color: colors.textMuted }}>
                          Etapa: {stageName}{pl.status === 'completed' ? ' (concluído)' : ''} · Abrir no funil
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

            </div>

            {/* Rodapé Fixo do Drawer com Ações */}
            <div style={{
              padding: '16px 24px',
              borderTop: `1px solid ${colors.border}`,
              backgroundColor: colors.bgHeader,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  backgroundColor: 'transparent',
                  border: `1px solid ${colors.border}`,
                  color: colors.textMuted,
                  cursor: 'pointer',
                  fontSize: '0.80rem',
                  fontWeight: 600,
                }}
              >
                Fechar Visualização
              </button>

              {selectedContract.approvalStatus === 'approved' && canCancelContract && (
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(true)}
                  style={{
                    padding: '8px 16px', borderRadius: '6px', backgroundColor: 'transparent',
                    color: colors.danger, border: `1px solid ${colors.danger}`, fontWeight: 700,
                    cursor: 'pointer', fontSize: '0.80rem', display: 'flex', alignItems: 'center', gap: '6px',
                  }}
                >
                  <X size={14} />
                  <span>Cancelar contrato</span>
                </button>
              )}

              {selectedContract.approvalStatus === 'pending_approval' && !financeEnabled && canApproveContract && (selectedContract.fillStage || 'pendente') === 'preenchido' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* Botão Solicitar Ajuste / Devolver */}
                  <button
                    type="button"
                    onClick={() => setIsRejectModalOpen(true)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      backgroundColor: colors.danger,
                      color: '#FFFFFF',
                      border: 'none',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.80rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <AlertTriangle size={14} />
                    <span>Negar contrato / Solicitar alteração</span>
                  </button>

                  {/* Botão Homologar Venda */}
                  <button
                    type="button"
                    onClick={() => setIsApproveModalOpen(true)}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '6px',
                      backgroundColor: colors.success,
                      color: '#FFFFFF',
                      border: 'none',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.80rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <CheckCircle2 size={15} />
                    <span>Homologar Venda</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: CONFIRMAR HOMOLOGAÇÃO & DISTRIBUIÇÃO PÓS-VENDA     */}
      {/* ============================================================ */}
      {isApproveModalOpen && selectedContract && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.80)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: colors.bgCard,
            border: `1px solid ${colors.border}`,
            borderRadius: '10px',
            width: '100%',
            maxWidth: '520px',
            padding: '22px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: 800, color: colors.success, textTransform: 'uppercase' }}>
                <ShieldCheck size={14} />
                <span>Homologação Formal de Venda</span>
              </div>
              <h3 style={{ margin: '4px 0 0 0', fontSize: '1.05rem', fontWeight: 800, color: colors.textTitle }}>
                Homologar {selectedContract.contractCode}
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: colors.textMuted }}>
                Cliente: {selectedContract.clientSnapshot?.name || selectedContract.contact?.name} • Valor: R$ {(selectedContract.totalAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            {/* Alerta de Snapshot Perpétuo */}
            <div style={{
              padding: '12px',
              borderRadius: '6px',
              backgroundColor: isLight ? '#E0F2FE' : 'rgba(2, 132, 199, 0.1)',
              border: `1px solid ${isLight ? '#BAE6FD' : 'rgba(2, 132, 199, 0.25)'}`,
              fontSize: '0.76rem',
              color: colors.textTitle,
              lineHeight: '1.4',
            }}>
              <strong>Congelamento Jurídico Unilateral:</strong> Ao homologar, todos os dados do contrato, cliente e equipe da venda serão gravados de forma permanente e imutável no banco de dados.
            </div>

            {/* Seleção de Funis de Pós-Venda */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: colors.textTitle, textTransform: 'uppercase' }}>
                Distribuição Automática no Pós-Venda:
              </span>

              {availablePostSaleFunnels.length === 0 ? (
                <span style={{ fontSize: '0.76rem', color: colors.warning }}>
                  Nenhum funil de pós-venda configurado para esta unidade física.
                </span>
              ) : (
                availablePostSaleFunnels.map(fn => {
                  const isChecked = selectedPostSaleFunnelIds.includes(fn.id);
                  return (
                    <label
                      key={fn.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        backgroundColor: isChecked ? (isLight ? '#E0F2FE' : 'rgba(2, 132, 199, 0.15)') : colors.bgCardSub,
                        border: `1px solid ${isChecked ? colors.primary : colors.borderSub}`,
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleTogglePostSaleFunnel(fn.id)}
                        style={{ accentColor: colors.primary, cursor: 'pointer' }}
                      />
                      <div style={{ fontSize: '0.78rem' }}>
                        <strong style={{ color: colors.textTitle, display: 'block' }}>{fn.name}</strong>
                        <span style={{ color: colors.textMuted, fontSize: '0.70rem' }}>
                          Etapa inicial: {fn.stages?.[0]?.name || (fn.stages?.[0] as any)?.title || 'Entrada'}
                        </span>
                      </div>
                    </label>
                  );
                })
              )}

              {/* Checkbox para Bloqueio de Data na Agenda */}
              {selectedContract.eventDate && (
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  backgroundColor: lockEventDate ? (isLight ? '#D1FAE5' : 'rgba(5, 150, 105, 0.12)') : colors.bgCardSub,
                  border: `1px solid ${lockEventDate ? colors.success : colors.borderSub}`,
                  cursor: 'pointer',
                }}>
                  <input
                    type="checkbox"
                    checked={lockEventDate}
                    onChange={(e) => setLockEventDate(e.target.checked)}
                    style={{ accentColor: colors.success, cursor: 'pointer' }}
                  />
                  <div style={{ fontSize: '0.78rem' }}>
                    <strong style={{ color: colors.textTitle, display: 'block' }}>
                      Bloquear Data na Agenda Oficial da Unidade
                    </strong>
                    <span style={{ color: colors.textMuted, fontSize: '0.70rem' }}>
                      Bloqueia o dia {new Date(selectedContract.eventDate + 'T12:00:00').toLocaleDateString('pt-BR')} no {selectedContract.venueName} para novas festas.
                    </span>
                  </div>
                </label>
              )}
            </div>

            {/* Ações */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: `1px solid ${colors.borderSub}` }}>
              <button
                type="button"
                onClick={() => setIsApproveModalOpen(false)}
                disabled={isSubmittingApproval}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  backgroundColor: 'transparent',
                  border: `1px solid ${colors.border}`,
                  color: colors.textMuted,
                  cursor: 'pointer',
                  fontSize: '0.80rem',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmApproval}
                disabled={isSubmittingApproval}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  backgroundColor: colors.success,
                  border: 'none',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  cursor: isSubmittingApproval ? 'wait' : 'pointer',
                  fontSize: '0.80rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Check size={14} />
                <span>{isSubmittingApproval ? 'Homologando...' : 'Confirmar Homologação & Enviar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: SOLICITAR AJUSTE / DEVOLVER (CRIA TAREFA PRO CLOSER)*/}
      {/* ============================================================ */}
      {isCancelModalOpen && selectedContract && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10002, padding: '20px' }}>
          <div style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '10px', width: '100%', maxWidth: '500px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: 800, color: colors.danger, textTransform: 'uppercase' }}>
              <AlertTriangle size={14} />
              <span>Cancelamento definitivo</span>
            </div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: colors.textTitle }}>
              Cancelar {selectedContract.contractCode}
            </h3>
            <p style={{ margin: 0, fontSize: '0.78rem', color: colors.textMuted, lineHeight: 1.45 }}>
              O contrato sai de todos os funis vinculados. O documento e o snapshot ficam preservados para consulta. Esta ação não pode ser desfeita pela tela.
            </p>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Motivo do cancelamento (obrigatório)"
              rows={4}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${colors.border}`, backgroundColor: colors.bgCardSub, color: colors.textTitle, fontSize: '0.80rem', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                disabled={isSubmittingCancel}
                onClick={() => { setIsCancelModalOpen(false); setCancelReason(''); }}
                style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, cursor: 'pointer', fontSize: '0.80rem', fontWeight: 600 }}
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={isSubmittingCancel}
                onClick={handleConfirmCancel}
                style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: colors.danger, color: '#FFFFFF', border: 'none', cursor: isSubmittingCancel ? 'wait' : 'pointer', fontSize: '0.80rem', fontWeight: 700 }}
              >
                {isSubmittingCancel ? 'Cancelando...' : 'Confirmar cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isRejectModalOpen && selectedContract && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10002,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: colors.bgCard,
            border: `1px solid ${colors.border}`,
            borderRadius: '10px',
            width: '100%',
            maxWidth: '500px',
            padding: '22px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: 800, color: colors.danger, textTransform: 'uppercase' }}>
                <AlertTriangle size={14} />
                <span>Solicitar Ajuste / Correção do Contrato</span>
              </div>
              <h3 style={{ margin: '4px 0 0 0', fontSize: '1.05rem', fontWeight: 800, color: colors.textTitle }}>
                Devolver {selectedContract.contractCode} para Revisão
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: colors.textMuted }}>
                Closer Responsável: <strong style={{ color: colors.textTitle }}>{selectedContract.closerName}</strong>
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: colors.textTitle }}>
                Observação / Motivo do Ajuste (Obrigatório):
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Ex: O comprovante de PIX está ilegível ou falta anexo da certidão..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  backgroundColor: colors.bgApp,
                  border: `1px solid ${colors.border}`,
                  color: colors.textTitle,
                  fontSize: '0.80rem',
                  outline: 'none',
                  resize: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* O que o sistema executará */}
            <div style={{
              padding: '10px 12px',
              borderRadius: '6px',
              backgroundColor: colors.bgCardSub,
              border: `1px solid ${colors.borderSub}`,
              fontSize: '0.74rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}>
              <span style={{ fontWeight: 700, color: colors.textTitle, textTransform: 'uppercase', fontSize: '0.68rem' }}>
                Automações Executadas ao Devolver:
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.textMuted }}>
                <Check size={12} color={colors.success} />
                <span>O contrato muda para status de ajuste comercial.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.textMuted }}>
                <Check size={12} color={colors.success} />
                <span>Gera uma <strong>Tarefa Prioritária</strong> na Central de Tarefas para o Closer <strong>{selectedContract.closerName}</strong>.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.textMuted }}>
                <Check size={12} color={colors.success} />
                <span>O card do Lead no Funil Comercial fica sinalizado para correção.</span>
              </div>
            </div>

            {/* Ações */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px', borderTop: `1px solid ${colors.borderSub}` }}>
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                disabled={isSubmittingRejection}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  backgroundColor: 'transparent',
                  border: `1px solid ${colors.border}`,
                  color: colors.textMuted,
                  cursor: 'pointer',
                  fontSize: '0.80rem',
                }}
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmRejection}
                disabled={isSubmittingRejection}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  backgroundColor: colors.danger,
                  border: 'none',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  cursor: isSubmittingRejection ? 'wait' : 'pointer',
                  fontSize: '0.80rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Send size={13} />
                <span>{isSubmittingRejection ? 'Devolvendo...' : 'Confirmar Devolução & Criar Tarefa'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {formModal && (
        <ContractFormModal
          mode="create"
          masterId={scopedMasterId || ''}
          onClose={() => setFormModal(null)}
          onSaved={(created) => {
            setFormModal(null);
            contractsListCache.clear();
            setClosingId(created.id);
            if (activeTab === 'pending') void loadContracts();
            else setActiveTab('pending');
          }}
        />
      )}

      {proposalWorkspace && (
        <LeadWorkspaceModal
          items={[{ key: proposalWorkspace.id, leadId: proposalWorkspace.leadId as string, funnelId: leads.find(l => l.id === proposalWorkspace.leadId)?.funnelId, title: proposalWorkspace.title, subtitle: proposalWorkspace.proposalCode }]}
          onClose={() => setProposalWorkspace(null)}
          headerExtra={() => {
            const pr = proposalWorkspace;
            const fact = (label: string, value?: string | number | null) => value ? <span key={label} style={{ fontSize: '0.76rem', color: colors.textMuted }}>{label}: <strong style={{ color: colors.textTitle }}>{value}</strong></span> : null;
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', padding: '8px 16px' }}>
                {fact('Valor', `R$ ${(pr.totalAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)}
                {fact('Festa', pr.eventDate ? pr.eventDate.split('T')[0].split('-').reverse().join('/') : null)}
                {fact('Convidados', pr.guestCount)}
                {fact('Pacote', pr.packageName)}
                {fact('Especialista', pr.closerName)}
                {fact('SDR', pr.sdrName)}
                {pr.fileUrl && <a href={pr.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.76rem', fontWeight: 800, color: colors.primary, textDecoration: 'none' }}>Abrir a proposta</a>}
                <button type="button" onClick={() => { setProposalDetail(pr); setProposalWorkspace(null); }} style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: 8, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textTitle, fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer' }}>
                  Editar, virar contrato ou marcar como perdida
                </button>
              </div>
            );
          }}
        />
      )}

      {proposalDetail && (
        <ProposalDetailModal
          proposal={proposalDetail}
          masterId={scopedMasterId || ''}
          canEdit={canEditClosing}
          onClose={() => setProposalDetail(null)}
          onEdit={(p) => { setProposalDetail(null); setProposalForm({ kind: 'edit', proposal: p }); }}
          onConvert={(p) => { setProposalDetail(null); setProposalForm({ kind: 'convert', proposal: p }); }}
          onChanged={() => { setProposalDetail(null); void loadProposals(); }}
        />
      )}

      {proposalForm && (
        <ContractFormModal
          mode="create"
          masterId={scopedMasterId || ''}
          proposalMode={proposalForm.kind !== 'convert'}
          proposal={proposalForm.proposal}
          onClose={() => setProposalForm(null)}
          onSavedProposal={() => { setProposalForm(null); setActiveTab('pending'); void loadProposals(); }}
          onSaved={(created) => {
            setProposalForm(null);
            contractsListCache.clear();
            void loadProposals();
            setActiveTab('pending');
            setClosingId(created.id);
            void loadContracts();
          }}
        />
      )}

      {teamModalIds && (
        <ContractTeamAssignModal
          contractIds={teamModalIds}
          masterId={scopedMasterId || ''}
          collaborators={collaborators}
          author={{ id: currentUser?.id, name: currentUser?.name, role: currentUser?.role }}
          titles={Object.fromEntries(contracts.map(c => [c.id, c.contractTitle || c.title || c.contractCode]))}
          onClose={() => setTeamModalIds(null)}
          onDone={() => { setTeamModalIds(null); setPickedIds(new Set()); setSelectMode(false); setSelectedContract(null); setIsDrawerOpen(false); contractsListCache.clear(); void loadContracts(); }}
        />
      )}
    </div>
  );
};
