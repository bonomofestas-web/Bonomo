import { Select } from '../ui';
import { usePresenceContext } from '../../hooks/usePresence';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  ChevronDown, Check, 
  Users, Sparkles, ExternalLink, 
  FileText, Copy, Plus, Trash2, Tag,
  Shield, MessageSquare,
  Gift, Award, Star,
  Compass, UserPlus, CheckCircle2, Eye, X, Building2,
  ChevronLeft, Workflow, Archive
} from 'lucide-react';
import { toast } from 'sonner';
import { isPhoneMatch } from '../../services/leadService';
import { isDependentRole, linkDependentFromFicha } from '../../utils/familyLinkSync';
import { useAdminState } from '../../context/AdminStateContext';
import { maskPhoneInput, formatPhone } from '../../utils/phoneFormatter';
import { renderFunnelOrStageIcon } from '../../utils/funnelIconLibrary';
import { relationshipLabel } from '../../utils/roleLabels';
import { collectPhoneHolders, findPhoneConflict, duplicatePhoneMessage } from '../../utils/phoneDuplicates';
import { WhatsAppBrandIcon } from './WhatsAppBrandIcon';
import { AdminLeadReadOnlyModal } from './AdminLeadReadOnlyModal';
import { ClientContractSection } from './ClientContractSection';
import { AdminLinkContractModal } from './AdminLinkContractModal';
import { AdminConfirmModal } from './AdminConfirmModal';
import { isUserMaster, isUserManager } from '../../utils/accessPermissions';
import { contractService } from '../../services/contractService';
import { contactService } from '../../services/contactService';
import type { Lead, ClientStage, LeadContact, ContractFunnelPlacement, Contract } from '../../types/admin';

interface AdminClientDrawerInspectorProps {
  lead: Lead;
  onStageChange: (stage: ClientStage) => void;
  onToggleCollapse?: () => void;
  onOpenDebutanteApp?: (slug: string) => void;
  onOpenFullInspector?: (clientId: string) => void;
  readOnly?: boolean;
}

const POST_SALE_STAGES: { id: ClientStage; label: string; color: string; bg: string; border: string; icon: string }[] = [
  { 
    id: 'onboarding', 
    label: 'ONBOARDING & BOAS-VINDAS', 
    color: '#3B82F6', 
    bg: 'rgba(59, 130, 246, 0.12)', 
    border: 'rgba(59, 130, 246, 0.4)',
    icon: 'inbox' 
  },
  { 
    id: 'planning', 
    label: 'PLANEJAMENTO & CRONOGRAMA', 
    color: '#F59E0B', 
    bg: 'rgba(245, 158, 11, 0.12)', 
    border: 'rgba(245, 158, 11, 0.4)',
    icon: 'calendar' 
  },
  { 
    id: 'suppliers', 
    label: 'DEFINIÇÃO DE FORNECEDORES', 
    color: '#8B5CF6', 
    bg: 'rgba(139, 92, 246, 0.12)', 
    border: 'rgba(139, 92, 246, 0.4)',
    icon: 'building' 
  },
  { 
    id: 'final_alignment', 
    label: 'ALINHAMENTO FINAL (RETA FINAL)', 
    color: '#6366F1', 
    bg: 'rgba(99, 102, 241, 0.12)', 
    border: 'rgba(99, 102, 241, 0.4)',
    icon: 'check-circle' 
  },
  { 
    id: 'party_day', 
    label: 'SEMANA DA FESTA / EVENTO', 
    color: '#EAB308', 
    bg: 'rgba(234, 179, 8, 0.12)', 
    border: 'rgba(234, 179, 8, 0.4)',
    icon: 'sparkles' 
  },
  { 
    id: 'completed', 
    label: 'FESTA REALIZADA', 
    color: '#10B981', 
    bg: 'rgba(16, 185, 129, 0.12)', 
    border: 'rgba(16, 185, 129, 0.4)',
    icon: 'party-popper' 
  },
];

// Funis de pos-venda realmente vinculados ao contrato (contract_funnel_placements), somente leitura.
// Cada funil e um setor independente: a etapa so muda no Kanban do proprio funil.
const LinkedFunnelsProgress: React.FC<{ clientId?: string }> = ({ clientId }) => {
  const { funnels, clients, currentUser } = useAdminState();
  const masterId = currentUser?.masterId || currentUser?.id || '';
  // Clicar leva ao funil (se o usuario tem acesso); a etapa so muda no quadro do proprio funil
  const openFunnel = (funnelId: string) => {
    if (!funnels.some(f => f.id === funnelId)) { toast.error('Você não tem acesso a este funil.'); return; }
    const mine = (clients || []).find(c => c.id === clientId);
    const clone = mine?.commercialLeadId
      ? (clients || []).find(c => c.funnelId === funnelId && c.commercialLeadId === mine.commercialLeadId)
      : undefined;
    window.dispatchEvent(new CustomEvent('admin_switch_tab', { detail: { tab: 'post-sale-crm', funnelId, clientId: clone?.id } }));
  };
  const [placements, setPlacements] = useState<ContractFunnelPlacement[] | null>(null);

  const load = useCallback(async () => {
    if (!clientId || !masterId) { setPlacements([]); return; }
    setPlacements(await contractService.getPlacementsByClient(clientId, masterId));
  }, [clientId, masterId]);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    const onChanged = () => { load(); };
    window.addEventListener('f5:contracts-changed', onChanged);
    return () => window.removeEventListener('f5:contracts-changed', onChanged);
  }, [load]);

  const rows = (placements || []).map(p => {
    const funnel = funnels.find(f => f.id === p.funnelId);
    const stages = funnel?.stages || [];
    const idx = stages.findIndex(s => s.id === p.stageId);
    const percent = p.status === 'completed'
      ? 100
      : stages.length > 0 && idx >= 0 ? Math.round(((idx + 1) / stages.length) * 100) : 0;
    return { p, funnelName: funnel?.name || p.funnelName || 'Funil', stageName: idx >= 0 ? stages[idx].name : p.stageId, percent };
  });
  const average = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.percent, 0) / rows.length) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
          <Workflow size={12} color="#8B5CF6" />
          <span>Funis do Contrato</span>
        </div>
        {rows.length > 0 && (
          <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#8B5CF6' }}>Progressão média {average}%</span>
        )}
      </div>
      {placements === null ? (
        <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>Carregando...</span>
      ) : rows.length === 0 ? (
        <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>Nenhum funil vinculado a este contrato.</span>
      ) : rows.map(r => (
        <div
          key={r.p.id}
          role="button"
          tabIndex={0}
          title="Abrir este funil"
          onClick={() => openFunnel(r.p.funnelId)}
          onKeyDown={(e) => { if (e.key === 'Enter') openFunnel(r.p.funnelId); }}
          style={{ padding: '7px 9px', borderRadius: '8px', background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '0.72rem' }}>
            <strong style={{ color: 'var(--adm-text-title)' }}>{r.funnelName}</strong>
            <span style={{ color: 'var(--adm-text-muted)', fontWeight: 700 }}>{r.percent}%</span>
          </div>
          <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', marginTop: '1px' }}>Etapa: {r.stageName}</div>
          <div style={{ height: '5px', borderRadius: '3px', background: 'var(--adm-border)', overflow: 'hidden', marginTop: '5px' }}>
            <div style={{ width: `${r.percent}%`, height: '100%', background: '#8B5CF6' }} />
          </div>
        </div>
      ))}
    </div>
  );
};

export const AdminClientDrawerInspector: React.FC<AdminClientDrawerInspectorProps> = ({
  lead,
  onStageChange,
  onToggleCollapse,
  onOpenDebutanteApp,
  readOnly = false,
}) => {
  const { 
    clients, 
    collaborators, 
    venues, 
    debutantes,
    leads,
    funnels,
    updateClient,
    updateClientStage,
    deleteClient,
    updateLeadData,
    linkClientDebutante,
    addDebutanteAccount,
    currentUser,
  } = useAdminState();
  usePresenceContext(lead ? { type: 'client', id: lead.id, label: lead.debutanteName } : null);

  const [activeTab, setActiveTab] = useState<'ficha' | 'debutante' | 'comercial'>('ficha');
  const [copiedLink, setCopiedLink] = useState(false);
  const [previewLeadId, setPreviewLeadId] = useState<string | null>(null);
  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false);
  const [isSuccessManagerDropdownOpen, setIsSuccessManagerDropdownOpen] = useState(false);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [showCustomTagInput, setShowCustomTagInput] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  // Subcontatos Form
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [isAddContactMenuOpen, setIsAddContactMenuOpen] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRole, setNewContactRole] = useState<'copayer' | 'mother' | 'father' | 'guardian' | 'dependent' | 'self' | 'other'>('copayer');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactCpf, setNewContactCpf] = useState('');
  const [newContactIsDecisor, setNewContactIsDecisor] = useState(false);

  // Localizar o cliente real no estado
  const client = useMemo(() => {
    return clients.find(c => c.id === lead.id || c.commercialLeadId === lead.id) || null;
  }, [clients, lead.id]);

  // Lead Comercial Original
  const commercialLead = useMemo(() => {
    if (client?.commercialLeadId) {
      return leads.find(l => l.id === client.commercialLeadId) || null;
    }
    return leads.find(l => l.id === lead.id || (l.phone && client?.payerPhone && l.phone === client.payerPhone)) || null;
  }, [leads, client, lead]);

  // Origem do Cliente / Lead
  const isFromCommercialSale = Boolean(
    client?.commercialLeadId || 
    (client?.commercialHistory && client.commercialHistory.closedBy) ||
    (commercialLead && ((commercialLead.stage as any) === 'deal_closed' || (commercialLead.stage as any) === 'ganho' || (commercialLead.stage as any) === 'contract_signed'))
  );

  const isFromWhatsAppInbox = Boolean(
    !isFromCommercialSale && (
      lead.whatsappJid || 
      lead.source === 'whatsapp' || 
      lead.group === 'WhatsApp' || 
      lead.subSource?.toLowerCase().includes('whatsapp') ||
      lead.subSource?.toLowerCase().includes('entrada')
    )
  );

  const commercialFunnelName = useMemo(() => {
    if (commercialLead?.funnelId) {
      const f = funnels.find(fn => fn.id === commercialLead.funnelId);
      if (f) return f.name;
    }
    return 'Funil Comercial';
  }, [commercialLead, funnels]);

  const activePostSaleStages = useMemo(() => {
    const targetFunnelId = client?.funnelId || lead.funnelId;
    const matchedFunnel = targetFunnelId ? funnels.find(f => f.id === targetFunnelId) : undefined;
    if (matchedFunnel?.stages && matchedFunnel.stages.length > 0) {
      const isEntryActive = Boolean(matchedFunnel.isEntryStageActive || matchedFunnel.enableInboxStage);
      let list = [...matchedFunnel.stages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      if (!isEntryActive) {
        list = list.filter((st, idx) => {
          if (st.id === 'new_lead' || st.id === 'entry') return false;
          const n = (st.name || '').toLowerCase().trim();
          if (idx === 0 && !st.isWon && !st.isLoss && (n === 'entrada do cliente' || n === 'novo lead' || n === 'entrada')) return false;
          return true;
        });
      }
      if (matchedFunnel.isWonStageEnabled === false) {
        list = list.filter(st => !st.isWon && st.id !== 'completed');
      }
      return list.map(st => ({
        id: st.id as ClientStage,
        label: st.name,
        color: st.color || '#3B82F6',
        bg: `${st.color || '#3B82F6'}1F`,
        border: `${st.color || '#3B82F6'}66`,
        icon: st.icon || 'layers',
      }));
    }
    return POST_SALE_STAGES;
  }, [client?.funnelId, lead.funnelId, funnels]);

  const currentStage = (client?.stage || lead.stage || activePostSaleStages[0]?.id || 'onboarding') as ClientStage;
  const currentStageConfig = activePostSaleStages.find(s => s.id === currentStage) || activePostSaleStages[0] || POST_SALE_STAGES[0];
  const currentStageIndex = Math.max(0, activePostSaleStages.findIndex(s => s.id === currentStage));

  const linkedDebutante = useMemo(() => {
    if (client?.debutanteId) return debutantes.find(d => d.id === client.debutanteId);
    if (lead.debutanteId) return debutantes.find(d => d.id === lead.debutanteId);
    if (client?.debutanteSlug) return debutantes.find(d => d.slug === client.debutanteSlug);
    return null;
  }, [debutantes, client, lead]);

  const debutanteSlug = client?.debutanteSlug || lead.debutanteSlug || linkedDebutante?.slug || (client?.name || lead.name || 'festa').toLowerCase().replace(/[^a-z0-9]/g, '-');
  const baseValue = client?.baseContractValue ?? (client?.dealValue || lead.dealValue || 0);
  
  // Gestor de Sucesso responsável
  const successManagerCollab = useMemo(() => {
    const sId = client?.assignedSuccessManagerId || client?.assignedToId || lead.sdrId;
    if (sId) return collaborators.find(c => c.id === sId);
    const sName = client?.assignedSuccessManagerName || client?.assignedTo || lead.assignedTo;
    if (sName) return collaborators.find(c => c.name === sName);
    return undefined;
  }, [collaborators, client, lead]);

  const [copiedContractCode, setCopiedContractCode] = useState(false);

  // Contrato (documento do sistema) ligado a este cliente: sem ele, a ficha nao mostra dados do evento, valores nem agenda
  const fichaMasterId = (client as any)?.masterId || currentUser?.masterId || currentUser?.id || '';
  const [linkedContract, setLinkedContract] = useState<Contract | null>(null);
  const [contractLoading, setContractLoading] = useState(true);
  const [isLinkContractOpen, setIsLinkContractOpen] = useState(false);
  const [isDeleteClientOpen, setIsDeleteClientOpen] = useState(false);
  const canRemoveClient = isUserMaster(currentUser) || isUserManager(currentUser);

  // Cartao de credito vem do CONTATO (acompanha a pessoa em qualquer contrato); se o contato ainda nao tem, usa o que veio do comercial
  const cardPhone = client?.payerPhone || lead.phone || '';
  const [creditCard, setCreditCard] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    const fallback = (client as any)?.hasCreditCard ?? (lead as any)?.hasCreditCard ?? null;
    setCreditCard(typeof fallback === 'boolean' ? fallback : null);
    if (!cardPhone || !fichaMasterId) return;
    void contactService.getHasCreditCard(fichaMasterId, cardPhone).then(r => { if (alive && r && r.value !== null) setCreditCard(r.value); });
    return () => { alive = false; };
  }, [cardPhone, fichaMasterId, client?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const saveCreditCard = async (v: boolean) => {
    setCreditCard(v);
    const ok = await contactService.setHasCreditCard(fichaMasterId, cardPhone, v);
    if (!ok) toast.warning('Cartão marcado, mas o contato desta pessoa não foi encontrado para guardar a informação.');
  };

  const loadLinkedContract = useCallback(async () => {
    if (!client?.id || !fichaMasterId) { setLinkedContract(null); setContractLoading(false); return; }
    setLinkedContract(await contractService.getContractByClientId(client.id, fichaMasterId));
    setContractLoading(false);
  }, [client?.id, fichaMasterId]);
  useEffect(() => { setContractLoading(true); void loadLinkedContract(); }, [loadLinkedContract]);
  useEffect(() => {
    const onChanged = () => { void loadLinkedContract(); };
    window.addEventListener('f5:contracts-changed', onChanged);
    return () => window.removeEventListener('f5:contracts-changed', onChanged);
  }, [loadLinkedContract]);
  const contractCodeDisplay = useMemo(() => {
    // Pos-venda usa o CODIGO DE CLIENTE (CLI-...); o codigo de contrato foi descontinuado nesta tela
    return client?.code || lead.code || '';
  }, [client?.code, lead.code]);

  const handleCopyContractCode = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(contractCodeDisplay);
    setCopiedContractCode(true);
    toast.success(`Código do cliente ${contractCodeDisplay} copiado!`);
    setTimeout(() => setCopiedContractCode(false), 2000);
  };

  const handleCopyDebutanteLink = () => {
    if (!debutanteSlug) return;
    const url = `${window.location.origin}/app/${debutanteSlug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // ── Pós-Venda Tags ──
  const clientFunnel = useMemo(() => {
    const fid = client?.funnelId || lead.funnelId;
    return (funnels || []).find(f => f.id === fid) || (funnels || []).find(f => f.isPostSale) || null;
  }, [funnels, client?.funnelId, lead.funnelId]);

  const activeClientTags = useMemo(() => {
    const raw = client?.tags || lead.tags || [];
    return raw.filter(t => t.toLowerCase() !== 'new_lead' && t.toLowerCase() !== 'new-lead');
  }, [client?.tags, lead.tags]);

  const availableTags = useMemo(() => {
    const defaultTags = ['VIP', 'Urgente', 'Atenção', 'Contrato Assinado', 'Degustação Pendente', 'Cronograma OK', 'Fornecedores OK'];
    const funnelTags = clientFunnel?.predefinedTags || [];
    const combined = Array.from(new Set([...funnelTags, ...defaultTags]));
    const currentTags = activeClientTags.map(t => t.trim().toLowerCase());
    return combined.filter(t => !currentTags.includes(t.trim().toLowerCase()) && t.toLowerCase() !== 'new_lead' && t.toLowerCase() !== 'new-lead');
  }, [clientFunnel, activeClientTags]);

  const handleAddTag = (tagToAdd?: string) => {
    const val = (tagToAdd || newTagInput).trim();
    if (!val) return;
    if (val.toLowerCase() === 'new_lead' || val.toLowerCase() === 'new-lead') {
      setNewTagInput('');
      setIsTagDropdownOpen(false);
      setShowCustomTagInput(false);
      return;
    }
    const currentTags = client?.tags || lead.tags || [];
    if (!currentTags.some(t => t.toLowerCase() === val.toLowerCase())) {
      const nextTags = [...currentTags, val];
      if (client) {
        updateClient(client.id, { tags: nextTags });
      }
      updateLeadData(lead.id, { tags: nextTags });
    }
    setNewTagInput('');
    setIsTagDropdownOpen(false);
    setShowCustomTagInput(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = client?.tags || lead.tags || [];
    const nextTags = currentTags.filter(t => t !== tagToRemove);
    if (client) {
      updateClient(client.id, { tags: nextTags });
    }
    updateLeadData(lead.id, { tags: nextTags });
  };

  const handleDirectWhatsApp = (phone?: string, text?: string) => {
    const raw = phone || client?.payerPhone || lead.phone || '';
    const clean = raw.replace(/\D/g, '');
    if (!clean) return;
    const fullNum = clean.startsWith('55') ? clean : `55${clean}`;
    const url = text 
      ? `https://wa.me/${fullNum}?text=${encodeURIComponent(text)}`
      : `https://wa.me/${fullNum}`;
    window.open(url, '_blank');
  };

  // Numero repetido DENTRO do proprio cliente/contrato (contratante, homenageada, outros contatos): bloqueia
  const newContactPhoneConflict = findPhoneConflict(newContactPhone, collectPhoneHolders(client));

  const handleAddSubContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !newContactName.trim() || !newContactPhone.trim()) return;
    if (newContactPhoneConflict) {
      toast.error(duplicatePhoneMessage(newContactPhoneConflict, 'cliente'));
      return;
    }

    const newContact: LeadContact = {
      id: `cnt_${Date.now()}`,
      name: newContactName.trim(),
      phone: newContactPhone.trim(),
      role: newContactRole,
      email: newContactEmail.trim() || undefined,
      cpf: newContactCpf.trim() || undefined,
      isPrimaryDecisionMaker: newContactIsDecisor,
    };

    const updatedContacts = [...(client.contacts || []), newContact];
    updateClient(client.id, { contacts: updatedContacts });

    // Dependente: vira contato (ou reconhece o existente), entra no grupo familiar nos dois sentidos
    // e aparece tambem na ficha comercial de origem
    if (isDependentRole(newContact.role) && newContact.phone) {
      const originLead = (leads || []).find(l => l.id === client.commercialLeadId || l.id === client.originalLeadId);
      void linkDependentFromFicha({
        masterId: currentUser?.masterId || currentUser?.id,
        parentContactId: originLead?.contactId,
        parentPhone: client.payerPhone || originLead?.phone,
        member: newContact,
        venueId: client.venueId,
      }).then(outcome => {
        if (outcome === 'created') toast.success('Dependente criado como contato e vinculado ao grupo familiar.');
        else if (outcome === 'existing') toast.success('Contato já existente reconhecido e vinculado ao grupo familiar (nos dois sentidos).');
      });
      if (originLead && !(originLead.contacts || []).some(x => x.phone && isPhoneMatch(x.phone, newContact.phone))) {
        updateLeadData(originLead.id, { contacts: [...(originLead.contacts || []), { ...newContact, role: 'dependent' }] });
      }
    }

    setNewContactName('');
    setNewContactPhone('');
    setNewContactEmail('');
    setNewContactCpf('');
    setNewContactIsDecisor(false);
    setIsAddingContact(false);
  };

  const handleRemoveSubContact = (contactId: string) => {
    if (!client) return;
    const updated = (client.contacts || []).filter(c => c.id !== contactId);
    updateClient(client.id, { contacts: updated });
  };

  const handleCreateDebutanteAccount = () => {
    if (!client) return;
    const newAcc = addDebutanteAccount({
      name: client.birthdayPersonName || client.name,
      venueId: client.venueId,
      partyDate: client.eventDate || client.partyDate || new Date().toISOString().split('T')[0],
      phone: client.birthdayPersonPhone || client.payerPhone || '',
      email: client.payerEmail || '',
      hasJourneyEnabled: true,
      baseGuestLimit: client.guestCount || 150,
    });
    if (newAcc?.id) {
      linkClientDebutante(client.id, newAcc.id);
    }
  };

  // Estilos Padronizados F5 System
  const cardStyle: React.CSSProperties = {
    background: 'var(--adm-bg-card)',
    border: '1px solid var(--adm-border)',
    borderRadius: '10px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
  };

  const cardRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.76rem',
    minHeight: '26px',
    gap: '8px',
  };

  const cardLabelStyle: React.CSSProperties = {
    width: '108px',
    flexShrink: 0,
    color: 'var(--adm-text-muted)',
    fontSize: '0.74rem',
    fontWeight: 600,
  };

  const cardValueStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minWidth: 0,
  };

  const seamlessInputStyle: React.CSSProperties = {
    width: '100%',
    textAlign: 'left',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px dashed transparent',
    borderRadius: '0',
    padding: '2px 4px',
    color: 'var(--adm-text-title)',
    fontSize: '0.80rem',
    fontWeight: 600,
    outline: 'none',
    transition: 'all 0.15s ease',
  };

  const sectionTitleStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.70rem',
    fontWeight: 800,
    color: 'var(--adm-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginTop: '4px',
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--adm-bg-card)',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      overflow: 'hidden',
    }}>
      {/* ── TOP HEADER (Status Ativo + Nome Editável + Código CLI + Collapse) ── */}
      <div style={{
        padding: '12px 14px 10px',
        borderBottom: '1px solid rgba(20, 169, 215, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        background: 'linear-gradient(180deg, #0B111A 0%, #0F1724 100%)',
        color: '#FFFFFF',
      }}>
        {/* Linha 1: nome (editavel, igual ao comercial) + acoes */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          {linkedContract ? (
            <div
              title="O nome segue o padrão do contrato"
              style={{ flex: 1, minWidth: 0, fontSize: '0.92rem', fontWeight: 900, color: '#FFFFFF', padding: '2px 4px', overflowWrap: 'anywhere', lineHeight: 1.25 }}
            >
              {linkedContract.contractTitle || linkedContract.title || client?.name || lead.name}
            </div>
          ) : (
            <input
              type="text"
              value={client?.name ?? lead.name}
              disabled={readOnly}
              onChange={(e) => { if (client) updateClient(client.id, { name: e.target.value }); else updateLeadData(lead.id, { name: e.target.value } as any); }}
              title={readOnly ? 'Nome bloqueado para edição' : 'Clique para editar o nome do cliente'}
              style={{
                flex: 1, minWidth: 0, background: 'transparent', border: '1px solid transparent', borderRadius: '6px',
                color: '#FFFFFF', fontSize: '0.92rem', fontWeight: 900, padding: '2px 4px', outline: 'none',
                fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: readOnly ? 'default' : 'text',
              }}
              onFocus={(e) => { if (!readOnly) { e.target.style.background = 'rgba(255,255,255,0.08)'; e.target.style.borderColor = 'rgba(20, 169, 215, 0.5)'; } }}
              onBlur={(e) => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'transparent'; }}
            />
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {!readOnly && client && (
              <button
                type="button"
                onClick={() => { updateClientStage(client.id, 'archived' as ClientStage); toast.success('Cliente arquivado.'); onToggleCollapse?.(); }}
                title="Arquivar cliente"
                style={{ background: 'rgba(139, 92, 246, 0.18)', border: '1px solid rgba(139, 92, 246, 0.45)', color: '#A78BFA', cursor: 'pointer', padding: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}
              >
                <Archive size={14} />
              </button>
            )}
            {!readOnly && client && canRemoveClient && (
              <button
                type="button"
                onClick={() => setIsDeleteClientOpen(true)}
                title="Remover cliente"
                style={{ background: 'rgba(239, 68, 68, 0.18)', border: '1px solid rgba(239, 68, 68, 0.45)', color: '#F87171', cursor: 'pointer', padding: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}
              >
                <Trash2 size={14} />
              </button>
            )}
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title="Recolher ficha do cliente"
                style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(20, 169, 215, 0.3)', color: '#14A9D7', borderRadius: '6px', padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ChevronLeft size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Linha 2: codigo de cliente + situacao do contrato */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.4)', borderRadius: '6px', padding: '2px 7px' }}>
            <span style={{ fontSize: '0.60rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase' }}>CLIENTE:</span>
            <span style={{ fontSize: '0.70rem', fontWeight: 900, color: '#06B6D4', letterSpacing: '0.6px', fontFamily: "'Poppins', monospace" }}>{contractCodeDisplay}</span>
            <button
              type="button"
              onClick={handleCopyContractCode}
              title="Copiar código do cliente"
              style={{ background: 'transparent', border: 'none', color: copiedContractCode ? '#10B981' : '#06B6D4', cursor: 'pointer', padding: '1px 2px', display: 'flex', alignItems: 'center', marginLeft: '3px' }}
            >
              {copiedContractCode ? <Check size={11} /> : <Copy size={11} />}
            </button>
          </div>
          <span style={{
            fontSize: '0.62rem', fontWeight: 700, padding: '2px 7px', borderRadius: '6px',
            background: linkedContract || currentStage === 'completed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.18)',
            color: linkedContract || currentStage === 'completed' ? '#34D399' : '#CBD5E1',
            border: `1px solid ${linkedContract || currentStage === 'completed' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(148, 163, 184, 0.35)'}`,
            display: 'inline-flex', alignItems: 'center', gap: '4px',
          }}>
            <Shield size={10} /> {currentStage === 'completed' ? 'Festa Realizada' : (linkedContract ? 'Contrato vinculado' : 'Sem contrato')}
          </span>
        </div>

        {/* ── ETAPA DO FUNIL DE PÓS-VENDA (DROPDOWN + PROGRESS BAR) ── */}
        <div style={{ position: 'relative', marginTop: '2px' }}>
          <div
            onClick={() => !readOnly && setIsStageDropdownOpen(!isStageDropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              background: currentStageConfig.bg,
              border: `1px solid ${currentStageConfig.border}`,
              borderLeft: `3.5px solid ${currentStageConfig.color}`,
              borderRadius: '8px',
              cursor: readOnly ? 'default' : 'pointer',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: currentStageConfig.color,
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
              {renderFunnelOrStageIcon(currentStageConfig.icon, 13, currentStageConfig.color)}
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentStageConfig.label}
              </span>
            </div>
            {!readOnly && (
              <ChevronDown 
                size={13} 
                style={{ 
                  transform: isStageDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
                  transition: 'transform 0.15s ease',
                  flexShrink: 0,
                  opacity: 0.8,
                }} 
              />
            )}
          </div>

          {/* Barra de Progresso Colorida das Etapas Reais do Funil */}
          <div style={{ display: 'flex', gap: '3px', marginTop: '5px' }}>
            {activePostSaleStages.map((stg, idx) => {
              const isFilled = idx <= currentStageIndex;
              return (
                <div
                  key={stg.id}
                  onClick={() => {
                    if (readOnly || !client) return;
                    updateClient(client.id, { stage: stg.id });
                    onStageChange(stg.id);
                  }}
                  title={stg.label}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    background: isFilled ? stg.color : 'var(--adm-border)',
                    cursor: readOnly ? 'default' : 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                />
              );
            })}
          </div>

          {/* Menu Dropdown de Seleção de Etapa */}
          {isStageDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 5px)',
              left: 0,
              right: 0,
              maxHeight: '420px',
              overflowY: 'auto',
              background: 'var(--adm-bg-card)',
              border: '1px solid var(--adm-border)',
              borderRadius: '8px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              zIndex: 70,
              padding: '5px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}>
              {activePostSaleStages.map(stg => {
                const isSelected = currentStage === stg.id;
                return (
                  <div
                    key={stg.id}
                    onClick={() => {
                      if (client) {
                        updateClient(client.id, { stage: stg.id });
                      }
                      onStageChange(stg.id);
                      setIsStageDropdownOpen(false);
                    }}
                    style={{
                      padding: '7px 10px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                      fontWeight: isSelected ? 800 : 600,
                      color: isSelected ? stg.color : 'var(--adm-text-title)',
                      background: isSelected ? stg.bg : 'transparent',
                      transition: 'all 0.1s ease',
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--adm-bg-hover)'; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {renderFunnelOrStageIcon(stg.icon, 12, stg.color)}
                      <span>{stg.label}</span>
                    </div>
                    {isSelected && <Check size={13} color={stg.color} />}
                  </div>
                );
              })}

            </div>
          )}
        </div>

        {/* ── SUB-ABAS DA FICHA DO CLIENTE ── */}
        <div style={{ display: 'flex', gap: '4px', marginTop: '2px', borderBottom: '1px solid var(--adm-border)', paddingBottom: '2px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('ficha')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'ficha' ? '2px solid var(--adm-accent, #06B6D4)' : '2px solid transparent',
              padding: '5px 8px',
              color: activeTab === 'ficha' ? 'var(--adm-text-title)' : 'var(--adm-text-muted)',
              fontSize: '0.72rem',
              fontWeight: activeTab === 'ficha' ? 800 : 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <FileText size={12} />
            <span>Ficha</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('debutante')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'debutante' ? '2px solid var(--adm-accent, #06B6D4)' : '2px solid transparent',
              padding: '5px 8px',
              color: activeTab === 'debutante' ? 'var(--adm-text-title)' : 'var(--adm-text-muted)',
              fontSize: '0.72rem',
              fontWeight: activeTab === 'debutante' ? 800 : 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Sparkles size={12} color="#EC4899" />
            <span>App da Debutante</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('comercial')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'comercial' ? '2px solid var(--adm-accent, #06B6D4)' : '2px solid transparent',
              padding: '5px 8px',
              color: activeTab === 'comercial' ? 'var(--adm-text-title)' : 'var(--adm-text-muted)',
              fontSize: '0.72rem',
              fontWeight: activeTab === 'comercial' ? 800 : 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Compass size={12} color="#06B6D4" />
            <span>Origem</span>
          </button>
        </div>
      </div>

      {/* ── CONTEÚDO DAS ABAS ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        
        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* ABA 1: FICHA COMPLETA DO CLIENTE                                 */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'ficha' && (
          <>
            {/* ── BARRA DE TAGS & UNIDADE FÍSICA ── */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '6px',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--adm-border)',
            }}>
              {/* Unidade Física Fixa */}
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  background: 'rgba(20, 169, 215, 0.14)',
                  color: '#14A9D7',
                  border: '1px solid rgba(20, 169, 215, 0.4)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  flexShrink: 0,
                }}
              >
                <Building2 size={11} color="#14A9D7" />
                <span>{venues?.find(v => v.id === (client?.venueId || lead.venueId))?.name || client?.venueName || lead.venueName || 'Unidade não definida'}</span>
              </span>

              {/* Tags Ativas */}
              {activeClientTags.map(tag => (
                <span
                  key={tag}
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    background: 'rgba(20, 169, 215, 0.15)',
                    color: '#14A9D7',
                    border: '1px solid rgba(20, 169, 215, 0.35)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexShrink: 0,
                  }}
                >
                  <Tag size={10} color="#14A9D7" />
                  <span>{tag}</span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      style={{ background: 'transparent', border: 'none', color: '#14A9D7', cursor: 'pointer', padding: 0, display: 'flex' }}
                      title={`Remover tag ${tag}`}
                    >
                      <X size={11} />
                    </button>
                  )}
                </span>
              ))}

              {/* Botão + Tag com Popover Dropdown */}
              {!readOnly && (
                <div style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTagDropdownOpen(prev => !prev);
                      setShowCustomTagInput(false);
                    }}
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      background: isTagDropdownOpen ? 'rgba(20, 169, 215, 0.25)' : 'var(--adm-bg-input)',
                      color: isTagDropdownOpen ? '#14A9D7' : 'var(--adm-text-muted)',
                      border: `1px dashed ${isTagDropdownOpen ? '#14A9D7' : 'var(--adm-border)'}`,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Plus size={11} />
                    <span>Tag</span>
                  </button>

                  {isTagDropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: '6px',
                      background: 'var(--adm-bg-card)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '10px',
                      padding: '6px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                      zIndex: 100,
                      minWidth: '200px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                    }}>
                      {availableTags.map(tag => (
                        <div
                          key={tag}
                          onClick={() => handleAddTag(tag)}
                          style={{
                            padding: '6px 10px',
                            cursor: 'pointer',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            color: 'var(--adm-text-title)',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'background 0.12s ease',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <span>{tag}</span>
                          <Plus size={12} color="var(--adm-text-muted)" />
                        </div>
                      ))}

                      {/* Opção Personalizada */}
                      {!showCustomTagInput ? (
                        <div
                          onClick={() => setShowCustomTagInput(true)}
                          style={{
                            padding: '6px 10px',
                            cursor: 'pointer',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            color: 'var(--adm-accent)',
                            borderRadius: '6px',
                            borderTop: availableTags.length > 0 ? '1px solid var(--adm-border)' : 'none',
                            marginTop: availableTags.length > 0 ? '2px' : 0,
                            paddingTop: availableTags.length > 0 ? '6px' : '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <Plus size={12} />
                          <span>Personalizado...</span>
                        </div>
                      ) : (
                        <div style={{
                          display: 'flex',
                          gap: '4px',
                          padding: '4px 0 2px',
                          borderTop: availableTags.length > 0 ? '1px solid var(--adm-border)' : 'none',
                          marginTop: '2px',
                        }}>
                          <input
                            type="text"
                            autoFocus
                            placeholder="Nome da tag..."
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTag();
                              }
                              if (e.key === 'Escape') {
                                setShowCustomTagInput(false);
                              }
                            }}
                            style={{
                              flex: 1,
                              background: 'var(--adm-bg-input)',
                              border: '1px solid var(--adm-border)',
                              color: 'var(--adm-text-title)',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              fontSize: '0.72rem',
                              outline: 'none',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleAddTag()}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              background: 'var(--adm-accent)',
                              border: 'none',
                              color: '#FFFFFF',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            <Check size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── SEÇÃO: GESTÃO DO PÓS-VENDA & VALORES ── */}
            <div style={sectionTitleStyle}>
              <Shield size={12} color="#06B6D4" />
              <span>Responsável</span>
            </div>

            <div style={cardStyle}>
              {/* Gestor de Sucesso Responsável */}
              <div style={{ ...cardRowStyle, position: 'relative' }}>
                <span style={cardLabelStyle}>Gestor Sucesso</span>
                <div style={cardValueStyle}>
                  <div
                    onClick={() => !readOnly && setIsSuccessManagerDropdownOpen(!isSuccessManagerDropdownOpen)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      cursor: !readOnly ? 'pointer' : 'default',
                      padding: '3px 6px',
                      borderRadius: '6px',
                      background: isSuccessManagerDropdownOpen ? 'var(--adm-bg-hover)' : 'transparent',
                    }}
                  >
                    {successManagerCollab ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: 'rgba(6, 182, 212, 0.15)',
                          border: '1px solid rgba(6, 182, 212, 0.35)',
                          color: '#06B6D4',
                          fontSize: '0.64rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          overflow: 'hidden',
                        }}>
                          {successManagerCollab.avatarUrl ? (
                            <img src={successManagerCollab.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            successManagerCollab.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--adm-text-title)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {successManagerCollab.name}
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', fontStyle: 'italic' }}>
                        Atribuir Gestor...
                      </span>
                    )}
                    {!readOnly && <ChevronDown size={11} color="var(--adm-text-muted)" />}
                  </div>

                  {/* Dropdown de Gestor de Sucesso */}
                  {isSuccessManagerDropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: '110px',
                      right: 0,
                      marginTop: '4px',
                      background: 'var(--adm-bg-card)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                      zIndex: 80,
                      maxHeight: '180px',
                      overflowY: 'auto',
                    }}>
                      <div
                        onClick={() => {
                          if (client) {
                            updateClient(client.id, { assignedSuccessManagerId: undefined, assignedSuccessManagerName: undefined, assignedTo: undefined });
                          }
                          setIsSuccessManagerDropdownOpen(false);
                        }}
                        style={{
                          padding: '6px 8px',
                          cursor: 'pointer',
                          color: '#EF4444',
                          borderBottom: '1px solid var(--adm-border)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                        }}
                      >
                        Nenhum (Desatribuir)
                      </div>
                      {collaborators.map(collab => (
                        <div
                          key={collab.id}
                          onClick={() => {
                            if (client) {
                              updateClient(client.id, {
                                assignedSuccessManagerId: collab.id,
                                assignedSuccessManagerName: collab.name,
                                assignedTo: collab.name,
                              });
                            }
                            setIsSuccessManagerDropdownOpen(false);
                          }}
                          style={{
                            padding: '6px 8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.72rem',
                            fontWeight: collab.id === successManagerCollab?.id ? 800 : 500,
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: 'rgba(6, 182, 212, 0.15)',
                            fontSize: '0.60rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#06B6D4',
                          }}>
                            {collab.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{collab.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* ── SEÇÃO: PARTES ENVOLVIDAS NO CONTRATO ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
              <div style={sectionTitleStyle}>
                <Users size={12} color="var(--adm-accent)" />
                <span>Informações do Cliente</span>
              </div>
              {!readOnly && (
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setIsAddContactMenuOpen(!isAddContactMenuOpen)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      border: '1px solid var(--adm-border)',
                      background: isAddContactMenuOpen ? 'var(--adm-accent-bg)' : 'var(--adm-bg-input)',
                      color: 'var(--adm-accent, #06B6D4)',
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Plus size={11} />
                    <span>Adicionar Pessoa</span>
                    <ChevronDown size={11} />
                  </button>

                  {isAddContactMenuOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '4px',
                      background: 'var(--adm-bg-card, #ffffff)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '8px',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                      padding: '4px',
                      minWidth: '190px',
                      zIndex: 50,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}>
                      <button
                        type="button"
                        onClick={() => {
                          setNewContactRole('copayer');
                          setNewContactIsDecisor(true);
                          setIsAddingContact(true);
                          setIsAddContactMenuOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--adm-text-title)',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        <UserPlus size={12} color="var(--adm-accent)" />
                        <span>Adicionar Novo Contato</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setNewContactRole('dependent');
                          setNewContactIsDecisor(false);
                          setIsAddingContact(true);
                          setIsAddContactMenuOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--adm-text-title)',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        <Users size={12} color="#10B981" />
                        <span>Adicionar Dependente Familiar</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 1. Card do Contratante / Pagante */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--adm-accent, #06B6D4)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Shield size={11} /> Contratante / Pagante
                </span>
                <span style={{ fontSize: '0.58rem', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', background: 'rgba(6, 182, 212, 0.12)', color: '#06B6D4' }}>
                  Decisor Principal
                </span>
              </div>

              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Nome</span>
                <div style={cardValueStyle}>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={client?.payerName || (lead as any).payerName || ''}
                    placeholder="Nome do contratante..."
                    onChange={(e) => client && updateClient(client.id, { payerName: e.target.value })}
                    style={seamlessInputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                  />
                </div>
              </div>

              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Relação</span>
                <div style={cardValueStyle}>
                  <Select
                    disabled={readOnly || !client}
                    value={(() => {
                      const r = String(client?.payerRelationship || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
                      if (r === 'mother' || r.includes('mae')) return 'mother';
                      if (r === 'father' || r.includes('pai')) return 'father';
                      if (r === 'guardian' || r.includes('responsavel')) return 'guardian';
                      if (r === 'self' || r.includes('proprio') || r.includes('debutante') || r.includes('aniversariante')) return 'self';
                      if (r === 'other' || r.includes('outro')) return 'other';
                      return '';
                    })()}
                    onChange={(e) => client && updateClient(client.id, { payerRelationship: (e.target.value || undefined) as any })}
                    style={{ width: '100%', height: '30px', fontSize: '0.76rem', borderRadius: '8px', padding: '0 8px' }}
                  >
                    <option value="">Não informado</option>
                    <option value="mother">Mãe</option>
                    <option value="father">Pai</option>
                    <option value="guardian">Responsável legal</option>
                    <option value="self">Debutante / Aniversariante</option>
                    <option value="other">Outro</option>
                  </Select>
                </div>
              </div>

              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>WhatsApp</span>
                <div style={cardValueStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                    <input
                      type="text"
                      disabled={readOnly}
                      value={maskPhoneInput(client?.payerPhone || lead.phone || '')}
                      placeholder="(00) 00000-0000"
                      onChange={(e) => client && updateClient(client.id, { payerPhone: e.target.value })}
                      style={seamlessInputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                    />
                    {(client?.payerPhone || lead.phone) && (
                      <button
                        type="button"
                        onClick={() => handleDirectWhatsApp(client?.payerPhone || lead.phone)}
                        title="Conversar no WhatsApp"
                        style={{
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          borderRadius: '4px',
                          color: '#10B981',
                          padding: '2px 5px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        <MessageSquare size={9} />
                        <span>Zap</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>E-mail</span>
                <div style={cardValueStyle}>
                  <input
                    type="email"
                    disabled={readOnly}
                    value={client?.payerEmail || lead.email || ''}
                    placeholder="email@exemplo.com"
                    onChange={(e) => client && updateClient(client.id, { payerEmail: e.target.value })}
                    style={seamlessInputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                  />
                </div>
              </div>

              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>CPF</span>
                <div style={cardValueStyle}>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={client?.payerCpf || ''}
                    placeholder="000.000.000-00"
                    onChange={(e) => client && updateClient(client.id, { payerCpf: e.target.value })}
                    style={seamlessInputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                  />
                </div>
              </div>

              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Cartão de crédito</span>
                <div style={{ ...cardValueStyle, gap: '4px' }}>
                  {[{ v: true, l: 'Sim' }, { v: false, l: 'Não' }].map(opt => (
                    <button
                      key={opt.l}
                      type="button"
                      disabled={readOnly}
                      onClick={() => saveCreditCard(opt.v)}
                      style={{
                        padding: '2px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--adm-border)',
                        background: creditCard === opt.v ? (opt.v ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)') : 'var(--adm-bg-input)',
                        color: creditCard === opt.v ? (opt.v ? '#059669' : 'var(--adm-text-title)') : 'var(--adm-text-muted)',
                        fontSize: '0.68rem',
                        fontWeight: creditCard === opt.v ? 800 : 500,
                        cursor: readOnly ? 'default' : 'pointer',
                      }}
                    >
                      {opt.l}
                    </button>
                  ))}
                  {creditCard === null && <span style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>Não informado</span>}
                </div>
              </div>
            </div>

            {/* Form Inline Adicionar Contato / Dependente */}
            {isAddingContact && !readOnly && (
              <form onSubmit={handleAddSubContact} style={{ ...cardStyle, background: 'var(--adm-bg-input)' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                  {newContactRole === 'dependent' ? 'Adicionar Dependente Familiar' : 'Adicionar Novo Contato / Copagante'}
                </span>
                
                <input
                  type="text"
                  required
                  placeholder="Nome completo..."
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  style={{
                    background: 'var(--adm-bg-card)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '5px',
                    padding: '4px 6px',
                    fontSize: '0.74rem',
                    color: 'var(--adm-text-title)',
                  }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <Select
                    value={newContactRole}
                    onChange={(e) => setNewContactRole(e.target.value as any)}
                    style={{
                      background: 'var(--adm-bg-card)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '5px',
                      padding: '4px 6px',
                      fontSize: '0.72rem',
                      color: 'var(--adm-text-title)',
                    }}
                  >
                    <option value="copayer">Copagante</option>
                    <option value="mother">Mãe</option>
                    <option value="father">Pai</option>
                    <option value="guardian">Responsável Legal</option>
                    <option value="dependent">Dependente Familiar</option>
                    <option value="other">Outro Contato</option>
                  </Select>

                  <input
                    type="text"
                    required
                    placeholder="WhatsApp..."
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    style={{
                      background: 'var(--adm-bg-card)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '5px',
                      padding: '4px 6px',
                      fontSize: '0.74rem',
                      color: 'var(--adm-text-title)',
                    }}
                  />
                {newContactPhoneConflict && (
                  <div style={{ fontSize: '0.70rem', fontWeight: 600, color: '#EF4444' }}>
                    {duplicatePhoneMessage(newContactPhoneConflict, 'cliente')}
                  </div>
                )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: 'var(--adm-text-title)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={newContactIsDecisor}
                      onChange={(e) => setNewContactIsDecisor(e.target.checked)}
                      style={{ accentColor: '#10B981' }}
                    />
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Star size={12} color="#F59E0B" fill="#F59E0B" /> É Decisor Financeiro (Copagante)
                    </span>
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '2px' }}>
                  <button
                    type="button"
                    onClick={() => setIsAddingContact(false)}
                    style={{ padding: '3px 6px', borderRadius: '4px', border: '1px solid var(--adm-border)', background: 'transparent', fontSize: '0.68rem', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit" disabled={Boolean(newContactPhoneConflict)} title={newContactPhoneConflict ? duplicatePhoneMessage(newContactPhoneConflict, 'cliente') : undefined}
                    style={{ padding: '3px 8px', borderRadius: '4px', border: 'none', background: 'var(--adm-accent, #06B6D4)', color: '#FFF', fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer' }}
                  >
                    Salvar
                  </button>
                </div>
              </form>
            )}

            {/* 3. Lista de Copagantes e Contatos Adicionais */}
            {((client?.contacts || lead.contacts || [])).filter(c => c.name !== client?.payerName).map((cnt, idx) => {
              const isCopayer = cnt.role === 'copayer' || cnt.isPrimaryDecisionMaker;
              const isDependent = cnt.role === 'dependent';
              const roleLabel = isCopayer ? 'Copagante / Decisor' : (isDependent ? 'Dependente Familiar' : relationshipLabel(cnt.role, 'Contato'));

              return (
                <div
                  key={cnt.id || idx}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border)',
                    background: 'var(--adm-bg-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                        {cnt.name}
                      </span>
                      <span style={{
                        fontSize: '0.58rem',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: '4px',
                        background: isCopayer ? 'rgba(16, 185, 129, 0.15)' : (isDependent ? 'rgba(59, 130, 246, 0.12)' : 'rgba(6, 182, 212, 0.12)'),
                        color: isCopayer ? '#10B981' : (isDependent ? '#3B82F6' : '#06B6D4'),
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}>
                        {isCopayer ? <Star size={10} color="#10B981" fill="#10B981" /> : null}
                        {roleLabel}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>
                      {formatPhone(cnt.phone)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    {cnt.phone && (
                      <button
                        type="button"
                        onClick={() => handleDirectWhatsApp(cnt.phone)}
                        title="Zap"
                        style={{
                          padding: '2px 5px',
                          borderRadius: '4px',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#10B981',
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        <MessageSquare size={9} />
                        <span>Zap</span>
                      </button>
                    )}
                    {!readOnly && cnt.id && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSubContact(cnt.id)}
                        title="Excluir Contato"
                        style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '2px' }}
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* ── CONTRATO: vincular / dados do evento / pessoas / valores (so com contrato) ── */}
            {client && (
              <ClientContractSection
                client={client}
                contract={linkedContract}
                loading={contractLoading}
                masterId={fichaMasterId}
                readOnly={readOnly}
                onOpenLink={() => setIsLinkContractOpen(true)}
              />
            )}

            {/* ── FUNIS RELACIONADOS (somente leitura; clicar abre o funil se houver acesso) ── */}
            <LinkedFunnelsProgress clientId={client?.id} />

            {client && (
              <AdminLinkContractModal
                isOpen={isLinkContractOpen}
                clientId={client.id}
                masterId={fichaMasterId}
                venueId={client.venueId || lead.venueId}
                onClose={() => setIsLinkContractOpen(false)}
                onLinked={(patch) => { updateClient(client.id, patch as any); void loadLinkedContract(); }}
              />
            )}

            <AdminConfirmModal
              isOpen={isDeleteClientOpen}
              onClose={() => setIsDeleteClientOpen(false)}
              onConfirm={() => {
                if (!client) return;
                deleteClient(client.id);
                setIsDeleteClientOpen(false);
                toast.success('Cliente removido.');
                onToggleCollapse?.();
              }}
              title="Remover cliente"
              message="O card do cliente será removido do pós-venda. O contrato, se houver, continua na seção Contratos."
              itemName={client?.name || lead.name}
              confirmText="Sim, remover"
            />
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* ABA 2: APP DA DEBUTANTE (CENTRAL DE ACOMPANHAMENTO & JORNADA)      */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'debutante' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Header do App da Debutante */}
            <div style={{
              padding: '10px 12px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.10) 0%, rgba(212, 175, 55, 0.12) 100%)',
              border: '1px solid rgba(236, 72, 153, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={16} color="#EC4899" />
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                      App da Debutante
                    </h4>
                    <span style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>
                      /app/{debutanteSlug}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={handleCopyDebutanteLink}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid rgba(212, 175, 55, 0.4)',
                      background: 'rgba(212, 175, 55, 0.15)',
                      color: copiedLink ? '#10B981' : '#D4AF37',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {copiedLink ? <Check size={11} /> : <Copy size={11} />}
                    <span>{copiedLink ? 'Copiado' : 'Copiar Link'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenDebutanteApp) {
                        onOpenDebutanteApp(debutanteSlug);
                      } else {
                        window.open(`/app/${debutanteSlug}`, '_blank');
                      }
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #EC4899 0%, #D4AF37 100%)',
                      color: '#FFF',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 8px rgba(236, 72, 153, 0.25)',
                    }}
                  >
                    <ExternalLink size={11} />
                    <span>Abrir App</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Se Não Houver Debutante Vinculada */}
            {!linkedDebutante && !client?.debutanteId ? (
              <div style={{
                background: 'var(--adm-bg-card)',
                border: '1.5px dashed var(--adm-border)',
                borderRadius: '12px',
                padding: '24px 16px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}>
                <Sparkles size={28} color="#EC4899" style={{ opacity: 0.5 }} />
                <h5 style={{ margin: 0, fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                  Acesso ao App não vinculado
                </h5>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--adm-text-muted)', maxWidth: '280px' }}>
                  Crie uma conta para a debutante poder montar a lista de convidados e participar da Jornada de Presentes.
                </p>
                <button
                  type="button"
                  onClick={handleCreateDebutanteAccount}
                  style={{
                    marginTop: '6px',
                    padding: '7px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #EC4899 0%, #D4AF37 100%)',
                    color: '#FFF',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Sparkles size={14} /> Ativar App da Debutante Agora
                </button>
              </div>
            ) : (
              /* Métricas do App em Tempo Real */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {/* Card Convidados */}
                  <div style={{
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#3B82F6', fontSize: '0.68rem', fontWeight: 700 }}>
                      <Users size={12} />
                      <span>Lista de Convidados</span>
                    </div>
                    <strong style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>
                      {linkedDebutante?.guests?.length || 0}
                    </strong>
                    <span style={{ fontSize: '0.62rem', color: '#10B981', fontWeight: 700 }}>
                      {linkedDebutante?.guests?.filter(g => g.status === 'confirmed').length || 0} confirmados
                    </span>
                  </div>

                  {/* Card Indicações */}
                  <div style={{
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#8B5CF6', fontSize: '0.68rem', fontWeight: 700 }}>
                      <Sparkles size={12} />
                      <span>Amigas Indicadas</span>
                    </div>
                    <strong style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>
                      {linkedDebutante?.validReferrals || linkedDebutante?.referrals?.length || 0}
                    </strong>
                    <span style={{ fontSize: '0.62rem', color: 'var(--adm-text-muted)' }}>
                      Jornada de Presentes
                    </span>
                  </div>
                </div>

                {/* Card Destaque: Indicações Vendidas */}
                <div style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.10)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: 'rgba(16, 185, 129, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#10B981',
                    }}>
                      <Gift size={15} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#10B981' }}>
                        Indicações Fechadas / Vendas:
                      </div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                        {linkedDebutante?.convertedReferralSales || linkedDebutante?.referrals?.filter(r => (r.status as string) === 'won' || (r.status as string) === 'contract_signed').length || 0} amigas fecharam contrato
                      </span>
                    </div>
                  </div>

                  {(linkedDebutante?.phone || client?.birthdayPersonPhone || client?.payerPhone) && (
                    <button
                      type="button"
                      onClick={() => handleDirectWhatsApp(
                        linkedDebutante?.phone || client?.birthdayPersonPhone || client?.payerPhone,
                        `Oi ${client?.birthdayPersonName || 'linda'}! Passando para te dar uma notícia maravilhosa do seu App F5: uma das suas amigas indicadas fechou festa com a gente e você desbloqueou um novo benefício exclusivo!`
                      )}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: 'none',
                        background: '#10B981',
                        color: '#FFF',
                        fontSize: '0.66rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <MessageSquare size={10} />
                      <span>Avisar no Zap</span>
                    </button>
                  )}
                </div>

                {/* Prêmios e Bônus Desbloqueados */}
                <div style={{ ...cardStyle, marginTop: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 800, color: '#D4AF37' }}>
                    <Award size={13} color="#D4AF37" />
                    <span>Prêmios & Bônus Desbloqueados</span>
                  </div>

                  {linkedDebutante?.vipRewards && linkedDebutante.vipRewards.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {linkedDebutante.vipRewards.map((rew, rIdx) => (
                        <div key={rIdx} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: 'rgba(212, 175, 55, 0.10)',
                          fontSize: '0.72rem',
                          color: 'var(--adm-text-title)',
                          fontWeight: 700,
                        }}>
                          <Star size={11} color="#D4AF37" fill="#D4AF37" />
                          <span>{rew.name || (rew as any).title}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.70rem', color: 'var(--adm-text-muted)', fontStyle: 'italic', padding: '4px 0' }}>
                      Jornada ativa. Conforme as amigas indicadas avançarem no comercial, os prêmios serão listados aqui.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* ABA 3: ORIGEM DO CLIENTE (WHATSAPP INBOX / MANUAL / VENDA NO CRM)  */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'comercial' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* 1. SE FOI CONVERTIDO VIA VENDA NO COMERCIAL */}
            {isFromCommercialSale ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{
                  background: 'var(--adm-bg-card)',
                  border: '1.5px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.08)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#10B981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <CheckCircle2 size={18} />
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.82rem', color: 'var(--adm-text-title)' }}>
                          Venda Realizada no Comercial
                        </strong>
                        <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>
                          Convertido para Pós-Venda após fechamento de contrato
                        </div>
                      </div>
                    </div>

                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: '6px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#10B981',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                    }}>
                      GANHO NO CRM
                    </span>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '6px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    fontSize: '0.70rem',
                  }}>
                    <div>
                      <span style={{ color: 'var(--adm-text-muted)', display: 'block', fontSize: '0.62rem' }}>Funil de Venda:</span>
                      <strong style={{ color: 'var(--adm-accent)' }}>
                        {commercialFunnelName}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--adm-text-muted)', display: 'block', fontSize: '0.62rem' }}>Fechador (Closer):</span>
                      <strong style={{ color: 'var(--adm-text-title)' }}>
                        {client?.commercialHistory?.closedBy || commercialLead?.closerName || commercialLead?.assignedTo || 'Equipe Comercial'}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--adm-text-muted)', display: 'block', fontSize: '0.62rem' }}>Data do Contrato:</span>
                      <strong style={{ color: 'var(--adm-text-title)' }}>
                        {client?.contractDate ? new Date(client.contractDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Fechado'}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--adm-text-muted)', display: 'block', fontSize: '0.62rem' }}>Valor Fechado:</span>
                      <strong style={{ color: '#10B981' }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(baseValue)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Card Clicável do Lead Comercial (Modo Visualização / Espectador) */}
                <div style={{
                  background: 'var(--adm-bg-card)',
                  border: '1.5px solid var(--adm-border)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)',
                      color: '#FFF',
                      fontWeight: 800,
                      fontSize: '0.74rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {(commercialLead?.name || client?.name || 'L').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {commercialLead?.name || client?.name}
                      </div>
                      <div style={{ fontSize: '0.64rem', color: '#6366F1', fontWeight: 700 }}>
                        {commercialLead?.code || client?.commercialLeadCode || 'LEAD COMERCIAL'} • Modo Espectador
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPreviewLeadId(commercialLead?.id || client?.commercialLeadId || lead.id)}
                    style={{
                      background: 'var(--adm-accent-bg)',
                      border: '1px solid var(--adm-accent)',
                      borderRadius: '6px',
                      color: 'var(--adm-accent)',
                      padding: '4px 10px',
                      fontSize: '0.70rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      flexShrink: 0,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Eye size={12} />
                    <span>Visualizar Ficha</span>
                  </button>
                </div>

                {/* Relatório do Closer (Passagem de Bastão) se existir */}
                {(client?.commercialHistory?.closerReport || (commercialLead as any)?.closerReport) && (
                  <div style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.05) 100%)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 800, color: '#6366F1' }}>
                      <FileText size={12} />
                      <span>Relatório do Closer (Passagem de Bastão)</span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--adm-text-title)', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                      {client?.commercialHistory?.closerReport || (commercialLead as any)?.closerReport}
                    </div>
                  </div>
                )}
              </div>
            ) : isFromWhatsAppInbox ? (
              /* 2. SE ENTROU VIA CAIXA DE ENTRADA / WHATSAPP */
              <div style={{
                background: 'var(--adm-bg-card)',
                border: '1.5px solid rgba(37, 211, 102, 0.35)',
                borderRadius: '12px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                boxShadow: '0 4px 16px rgba(37, 211, 102, 0.08)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(37, 211, 102, 0.15)',
                    color: '#25D366',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <WhatsAppBrandIcon size={20} color="#25D366" />
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.84rem', color: 'var(--adm-text-title)', display: 'block' }}>
                      Iniciado via Caixa de Entrada (WhatsApp)
                    </strong>
                    <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                      Iniciado diretamente por mensagem na Caixa de Entrada do Pós-Venda
                    </span>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  fontSize: '0.72rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--adm-text-muted)' }}>Data & Hora de Entrada:</span>
                    <strong style={{ color: 'var(--adm-text-title)' }}>
                      {new Date(lead.createdAt || client?.createdAt || Date.now()).toLocaleDateString('pt-BR')} às {new Date(lead.createdAt || client?.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--adm-text-muted)' }}>Canal / Instância:</span>
                    <span style={{
                      fontWeight: 700,
                      color: '#25D366',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: 'rgba(37, 211, 102, 0.12)',
                    }}>
                      {lead.sourceName || lead.venueName || client?.venueName || 'WhatsApp'}
                    </span>
                  </div>
                  {(lead.phone || client?.payerPhone) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--adm-text-muted)' }}>Número do WhatsApp:</span>
                      <strong style={{ color: 'var(--adm-text-title)' }}>
                        {formatPhone(lead.phone || client?.payerPhone || '')}
                      </strong>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* 3. SE FOI CRIADO MANUALMENTE */
              <div style={{
                background: 'var(--adm-bg-card)',
                border: '1.5px solid rgba(6, 182, 212, 0.35)',
                borderRadius: '12px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                boxShadow: '0 4px 16px rgba(6, 182, 212, 0.08)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(6, 182, 212, 0.15)',
                    color: '#06B6D4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <UserPlus size={18} color="#06B6D4" />
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.84rem', color: 'var(--adm-text-title)', display: 'block' }}>
                      Criado Manualmente
                    </strong>
                    <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                      Cadastro realizado manualmente no painel de Pós-Venda
                    </span>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  fontSize: '0.72rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--adm-text-muted)' }}>Cadastrado Por:</span>
                    <strong style={{ color: 'var(--adm-text-title)' }}>
                      {client?.assignedSuccessManagerName || client?.assignedTo || 'Equipe Pós-Venda'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--adm-text-muted)' }}>Data de Cadastro:</span>
                    <strong style={{ color: 'var(--adm-text-title)' }}>
                      {new Date(client?.createdAt || lead.createdAt || Date.now()).toLocaleDateString('pt-BR')} às {new Date(client?.createdAt || lead.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Visualização da Ficha Comercial em Modo Espectador */}
      {previewLeadId && commercialLead && (
        <AdminLeadReadOnlyModal lead={commercialLead} onClose={() => setPreviewLeadId(null)} />
      )}
    </div>
  );
};
