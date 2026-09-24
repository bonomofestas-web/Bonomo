import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowLeft, FileText, Plus, ExternalLink, Check, Copy, Trash2, 
  Clock, Sparkles, Send, CheckCircle2, MessageSquare, Shield, Heart,
  FileCheck, Users, ChevronDown, CheckSquare, Edit3, DollarSign, Gem,
  X, ShoppingBag, Crown, PhoneCall, Zap
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { formatPhone } from '../../utils/phoneFormatter';
import { uazapiService } from '../../services/uazapiService';
import { whatsappMediaService } from '../../services/whatsappMediaService';
import { AdminConfirmModal } from './AdminConfirmModal';
import { AdminTaskDetailModal } from './AdminTaskDetailModal';
import { AdminTaskCompletionModal } from './AdminTaskCompletionModal';
import type { ClientStage, ClientDocument, LeadContact, AdminTask, TaskStatus, ClientUpsellSale } from '../../types/admin';

interface AdminClientInspectorProps {
  clientId: string | null;
  onClose: () => void;
  onOpenDebutanteApp?: (slug: string) => void;
  onOpenCommercialLead?: (leadId: string) => void;
}

const STAGE_CONFIG: Record<ClientStage, { label: string; color: string; bg: string; border: string }> = {
  onboarding: { 
    label: 'Onboarding & Boas-Vindas', 
    color: '#3B82F6', 
    bg: 'rgba(59, 130, 246, 0.12)', 
    border: '#3B82F6' 
  },
  planning: { 
    label: 'Planejamento & Cronograma', 
    color: '#F59E0B', 
    bg: 'rgba(245, 158, 11, 0.12)', 
    border: '#F59E0B' 
  },
  suppliers: { 
    label: 'Definição de Fornecedores', 
    color: '#8B5CF6', 
    bg: 'rgba(139, 92, 246, 0.12)', 
    border: '#8B5CF6' 
  },
  final_alignment: { 
    label: 'Alinhamento Final (Reta Final)', 
    color: '#6366F1', 
    bg: 'rgba(99, 102, 241, 0.12)', 
    border: '#6366F1' 
  },
  party_day: { 
    label: 'Semana do Evento / Festa', 
    color: '#EAB308', 
    bg: 'rgba(234, 179, 8, 0.12)', 
    border: '#EAB308' 
  },
  completed: { 
    label: 'Festa Realizada (Sucesso)', 
    color: '#10B981', 
    bg: 'rgba(16, 185, 129, 0.12)', 
    border: '#10B981' 
  },
  archived: { 
    label: 'Arquivado', 
    color: '#6B7280', 
    bg: 'rgba(107, 114, 128, 0.12)', 
    border: '#6B7280' 
  }
};

const STAGES_ORDER: ClientStage[] = [
  'onboarding', 
  'planning', 
  'suppliers', 
  'final_alignment', 
  'party_day', 
  'completed'
];

const UPSELL_CATEGORIES: Record<string, { label: string; color: string; bg: string }> = {
  foto_video: { label: 'Foto & Vídeo', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)' },
  atracoes: { label: 'Atrações & Shows', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' },
  bar_bebidas: { label: 'Bebidas & Bar', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  decoracao: { label: 'Decoração & Efeitos', color: '#EC4899', bg: 'rgba(236, 72, 153, 0.12)' },
  estrutura: { label: 'Estrutura & Horas Extras', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)' },
  alimentacao: { label: 'Gastronomia & Extras', color: '#EAB308', bg: 'rgba(234, 179, 8, 0.12)' },
  outro: { label: 'Outro Serviço', color: '#64748B', bg: 'rgba(100, 116, 139, 0.12)' },
};

export const AdminClientInspector: React.FC<AdminClientInspectorProps> = ({
  clientId,
  onClose,
  onOpenDebutanteApp,
  onOpenCommercialLead,
}) => {
  const { 
    clients, 
    debutantes, 
    venues,
    sources,
    collaborators,
    updateClient,
    updateClientStage, 
    deleteClient,
    addClientNote,
    addClientDocument,
    linkClientDebutante,
    addDebutanteAccount,
    addClientUpsellSale,
    deleteClientUpsellSale,
    tasks,
    updateTask,
    deleteTask,
    completeTaskWithFeedback,
  } = useAdminState();

  const [activeTab, setActiveTab] = useState<'timeline' | 'whatsapp' | 'tasks' | 'documents' | 'commercial'>('whatsapp');
  const [newNote, setNewNote] = useState('');
  const [copiedAppUrl, setCopiedAppUrl] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false);
  
  // Upsell Modal & Form State
  const [isUpsellModalOpen, setIsUpsellModalOpen] = useState(false);
  const [upsellTitle, setUpsellTitle] = useState('');
  const [upsellCategory, setUpsellCategory] = useState<string>('foto_video');
  const [upsellValue, setUpsellValue] = useState<string>('');
  const [upsellDate, setUpsellDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [upsellPaymentMethod, setUpsellPaymentMethod] = useState<string>('PIX');
  const [upsellPaymentStatus, setUpsellPaymentStatus] = useState<'pago' | 'pendente' | 'parcelado'>('pago');
  const [upsellPaymentType, setUpsellPaymentType] = useState<'a_vista' | 'parcelado' | 'sinal'>('a_vista');
  const [upsellInstallmentsCount, setUpsellInstallmentsCount] = useState<number>(1);
  const [upsellResponsibleId, setUpsellResponsibleId] = useState<string>('');
  const [upsellNotes, setUpsellNotes] = useState<string>('');
  const [upsellToDelete, setUpsellToDelete] = useState<ClientUpsellSale | null>(null);
  
  // Task detail modal & completion state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<AdminTask | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<AdminTask | null>(null);
  const [completingTask, setCompletingTask] = useState<AdminTask | null>(null);
  
  // Document Upload Modal state
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState<ClientDocument['type']>('contract');
  const [docFileUrl, setDocFileUrl] = useState('');

  // Subcontact Form state
  const [isAddingSubContact, setIsAddingSubContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRole, setNewContactRole] = useState<'father' | 'mother' | 'guardian' | 'self' | 'other'>('mother');
  const [newContactEmail, setNewContactEmail] = useState('');

  // Optional Fields toggles
  const [showPayerEmail, setShowPayerEmail] = useState(false);
  const [showPayerCpf, setShowPayerCpf] = useState(false);
  const [showPayerAddress, setShowPayerAddress] = useState(false);

  const [whatsappCustomMsg, setWhatsappCustomMsg] = useState('');
  const [selectedClientRecipientPhone, setSelectedClientRecipientPhone] = useState<string>('');

  if (!clientId) return null;

  const client = clients.find(c => c.id === clientId);
  if (!client) return null;

  const linkedDebutante = client.debutanteId ? debutantes.find(d => d.id === client.debutanteId) : null;
  const stageInfo = STAGE_CONFIG[client.stage] || STAGE_CONFIG.onboarding;

  // Lista de destinatários com prioridade para o Decisor
  const clientRecipients = useMemo(() => {
    if (!client) return [];
    const list: Array<{ phone: string; label: string; role: string; isDecisor: boolean }> = [];
    const seen = new Set<string>();
    const clientAny = client as any;

    if (client.payerPhone && !seen.has(client.payerPhone.trim())) {
      seen.add(client.payerPhone.trim());
      list.push({
        phone: client.payerPhone.trim(),
        label: `${client.payerName || 'Contratante'} (Decisor)`,
        role: 'Decisor',
        isDecisor: true,
      });
    }

    if (clientAny.phone && !seen.has(clientAny.phone.trim())) {
      seen.add(clientAny.phone.trim());
      list.push({
        phone: clientAny.phone.trim(),
        label: `${client.birthdayPersonName || client.name || 'Aniversariante'}`,
        role: 'Aniversariante',
        isDecisor: false,
      });
    }

    if (client.contacts && client.contacts.length > 0) {
      client.contacts.forEach(c => {
        if (c.phone && !seen.has(c.phone.trim())) {
          seen.add(c.phone.trim());
          list.push({
            phone: c.phone.trim(),
            label: `${c.name} (${c.role || 'Contato'})`,
            role: c.role || 'Contato',
            isDecisor: Boolean(c.isPrimaryDecisionMaker),
          });
        }
      });
    }

    list.sort((a, b) => (b.isDecisor ? 1 : 0) - (a.isDecisor ? 1 : 0));
    return list;
  }, [client]);

  useEffect(() => {
    if (clientRecipients.length > 0) {
      setSelectedClientRecipientPhone(clientRecipients[0].phone);
    } else if (client?.payerPhone) {
      setSelectedClientRecipientPhone(client.payerPhone);
    }
  }, [client?.id, clientRecipients]);

  // WhatsApp Sender Selection para Pós-Venda
  const connectedSenderSources = useMemo(() => {
    return (sources || []).filter(s => s.type === 'whatsapp_api' && s.status === 'active' && ((s.configuration as any)?.connectedPhone || s.whatsappInstanceId));
  }, [sources]);

  const [selectedSenderSourceId, setSelectedSenderSourceId] = useState<string>('');

  useEffect(() => {
    if (connectedSenderSources.length > 0) {
      const matchVenue = connectedSenderSources.find(s => s.venueId === client?.venueId);
      setSelectedSenderSourceId(matchVenue ? matchVenue.id : connectedSenderSources[0].id);
    } else {
      setSelectedSenderSourceId('');
    }
  }, [connectedSenderSources, client?.venueId]);

  const activeSenderSource = useMemo(() => {
    return connectedSenderSources.find(s => s.id === selectedSenderSourceId) || connectedSenderSources[0] || null;
  }, [connectedSenderSources, selectedSenderSourceId]);

  const clientTasks = useMemo(() => {
    if (!client) return [];
    return tasks.filter(t => 
      t.debutanteId === client.id ||
      t.debutanteId === client.debutanteId ||
      t.customProperties?.clientId === client.id ||
      t.customProperties?.debutanteId === client.debutanteId ||
      (client.commercialLeadId && (t.leadId === client.commercialLeadId || t.customProperties?.leadId === client.commercialLeadId))
    );
  }, [tasks, client.id, client.debutanteId, client.commercialLeadId]);

  const handleTaskStageChange = (task: AdminTask, newStatus: TaskStatus) => {
    if (newStatus === 'completed') {
      setCompletingTask(task);
    } else {
      updateTask(task.id, {
        status: newStatus,
        customStatusId: newStatus === 'in_progress' ? 'st_in_progress' : 'st_todo',
        completedAt: undefined,
      });
    }
  };

  const handleCopyAppUrl = () => {
    const slug = client.debutanteSlug || linkedDebutante?.slug;
    if (!slug) return;
    const url = `${window.location.origin}/app/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedAppUrl(true);
    setTimeout(() => setCopiedAppUrl(false), 2000);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    addClientNote(client.id, newNote.trim());
    setNewNote('');
  };

  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) return;
    addClientDocument(client.id, {
      title: docTitle.trim(),
      type: docType,
      fileUrl: docFileUrl.trim() || '#',
      fileSize: '1.5 MB',
    });
    setDocTitle('');
    setDocFileUrl('');
    setIsDocModalOpen(false);
  };

  const handleCreateAndLinkDebutante = () => {
    const deb = addDebutanteAccount({
      name: client.birthdayPersonName || client.name,
      venueId: client.venueId || venues[0]?.id || '',
      partyDate: client.eventDate,
      phone: client.payerPhone,
      email: client.payerEmail,
    });
    linkClientDebutante(client.id, deb.id);
  };

  const handleUnlinkDebutante = () => {
    linkClientDebutante(client.id, null);
  };

  const handleAddSubContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) return;

    const newContact: LeadContact = {
      id: `cnt_${Date.now()}`,
      name: newContactName.trim(),
      phone: newContactPhone.trim(),
      role: newContactRole,
      email: newContactEmail.trim() || undefined,
      isPrimaryDecisionMaker: false,
    };

    const updatedContacts = [...(client.contacts || []), newContact];
    updateClient(client.id, { contacts: updatedContacts });

    setNewContactName('');
    setNewContactPhone('');
    setNewContactEmail('');
    setIsAddingSubContact(false);
  };

  const handleRemoveSubContact = (contactId: string) => {
    const updated = (client.contacts || []).filter(c => c.id !== contactId);
    updateClient(client.id, { contacts: updated });
  };

  const handleCreateUpsellSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!upsellTitle.trim() || !upsellValue) return;

    const numericVal = parseFloat(upsellValue.replace(/[^0-9.,]/g, '').replace(',', '.'));
    if (isNaN(numericVal) || numericVal <= 0) {
      alert('Por favor, insira um valor numérico válido.');
      return;
    }

    const selectedCollab = collaborators.find(c => c.id === upsellResponsibleId);

    addClientUpsellSale(client.id, {
      title: upsellTitle.trim(),
      category: upsellCategory,
      value: numericVal,
      saleDate: upsellDate || new Date().toISOString().split('T')[0],
      paymentMethod: upsellPaymentMethod,
      paymentStatus: upsellPaymentStatus,
      paymentType: upsellPaymentType,
      installmentsCount: upsellPaymentType === 'parcelado' ? (Number(upsellInstallmentsCount) || 1) : undefined,
      responsibleId: upsellResponsibleId || undefined,
      responsibleName: selectedCollab?.name || undefined,
      notes: upsellNotes.trim() || undefined,
    });

    setIsUpsellModalOpen(false);
    setUpsellTitle('');
    setUpsellValue('');
    setUpsellNotes('');
    setUpsellCategory('foto_video');
  };

  const handleDirectWhatsApp = (phone?: string, customText?: string) => {
    const target = (phone || selectedClientRecipientPhone || client?.payerPhone || '').replace(/\D/g, '');
    if (!target) {
      alert('Nenhum número de WhatsApp válido encontrado para este contato.');
      return;
    }
    const textParam = customText ? `?text=${encodeURIComponent(customText)}` : '';
    window.open(`https://wa.me/55${target}${textParam}`, '_blank');
  };

  const handleSendClientUazapiMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!whatsappCustomMsg.trim() || !client) return;

    const textToSend = whatsappCustomMsg.trim();
    const targetPhone = selectedClientRecipientPhone || client.payerPhone || (client as any).phone;
    setWhatsappCustomMsg('');

    if (targetPhone) {
      // Registra no histórico do cliente
      addClientNote(client.id, `[WhatsApp Enviado para ${formatPhone(targetPhone)}]: ${textToSend}`);

      // Disparo real via UAZAPI
      if (activeSenderSource?.whatsappInstanceId) {
        try {
          await uazapiService.sendText(activeSenderSource.whatsappInstanceId, {
            number: targetPhone,
            text: textToSend,
          });

          // Sincroniza foto de perfil se o cliente ainda não tiver
          if (!(client as any).avatarUrl) {
            uazapiService.fetchProfilePicture(activeSenderSource.whatsappInstanceId, targetPhone)
              .then(async (rawAvatar) => {
                if (rawAvatar) {
                  const permanentR2Avatar = await whatsappMediaService.syncWhatsAppAvatarToR2(targetPhone, rawAvatar);
                  updateClient(client.id, {
                    avatarUrl: permanentR2Avatar,
                  } as any);
                }
              })
              .catch(() => {});
          }
        } catch (err) {
          console.warn('Disparo UAZAPI Pós-venda:', err);
        }
      }
    }
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const sectionTitleStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 2px 2px',
    fontSize: '0.72rem',
    fontWeight: 800,
    color: 'var(--adm-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--adm-bg-card)',
    border: '1px solid var(--adm-border)',
    borderRadius: '12px',
    padding: '12px 14px',
    margin: 0,
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
  };

  const cardRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.78rem',
    minHeight: '28px',
    gap: '8px',
    paddingTop: '2px',
    paddingBottom: '2px',
  };

  const cardLabelStyle: React.CSSProperties = {
    width: '110px',
    flexShrink: 0,
    color: 'var(--adm-text-muted)',
    fontSize: '0.76rem',
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
    padding: '3px 4px',
    color: 'var(--adm-text-title)',
    fontSize: '0.82rem',
    fontWeight: 600,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    transition: 'border-color 0.15s ease, background 0.15s ease',
  };

  const cardSelectStyle: React.CSSProperties = {
    background: 'var(--adm-bg-input)',
    border: '1px solid var(--adm-border)',
    borderRadius: '6px',
    padding: '4px 8px',
    color: 'var(--adm-text-title)',
    fontSize: '0.78rem',
    fontWeight: 600,
    outline: 'none',
    boxSizing: 'border-box',
    cursor: 'pointer',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    width: '100%',
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--adm-bg-app)',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      overflow: 'hidden',
      color: 'var(--adm-text-body)',
    }}>
      {/* ── Top Header Bar (Full Content Area Header) ── */}
      <div style={{
        height: '60px',
        borderBottom: '1px solid var(--adm-border)',
        background: 'var(--adm-bg-card)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        zIndex: 20,
      }}>
        {/* Left: Voltar + Código + Nome da Aniversariante */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid var(--adm-border)',
              background: 'var(--adm-bg-input)',
              color: 'var(--adm-text-title)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={14} />
            <span>Voltar ao Kanban</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span style={{
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.04em',
              backgroundColor: 'rgba(212, 175, 55, 0.15)',
              color: 'var(--adm-accent, #B8860B)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              flexShrink: 0,
            }}>
              {client.code}
            </span>

            <h1 style={{
              margin: 0,
              fontSize: '1.1rem',
              fontWeight: 800,
              color: 'var(--adm-text-title)',
              letterSpacing: '-0.2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {client.birthdayPersonName || client.name}
            </h1>

            {client.birthdayPersonAge && (
              <span style={{ fontSize: '12px', color: 'var(--adm-text-muted)', fontWeight: 600, flexShrink: 0 }}>
                ({client.birthdayPersonAge} Anos)
              </span>
            )}
          </div>
        </div>

        {/* Right: Stage Selector + Delete + Debutante Link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {/* Stage Dropdown Selector */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsStageDropdownOpen(!isStageDropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: `1px solid ${stageInfo.border}`,
                backgroundColor: stageInfo.bg,
                color: stageInfo.color,
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              <span>Etapa: {stageInfo.label}</span>
              <ChevronDown size={14} />
            </button>

            {isStageDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '6px',
                background: 'var(--adm-bg-card)',
                border: '1px solid var(--adm-border)',
                borderRadius: '10px',
                padding: '4px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                zIndex: 100,
                minWidth: '220px',
              }}>
                {STAGES_ORDER.map(stg => {
                  const cfg = STAGE_CONFIG[stg];
                  const isSelected = client.stage === stg;
                  return (
                    <div
                      key={stg}
                      onClick={() => {
                        updateClientStage(client.id, stg);
                        setIsStageDropdownOpen(false);
                      }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.76rem',
                        fontWeight: isSelected ? 800 : 500,
                        color: isSelected ? cfg.color : 'var(--adm-text-title)',
                        backgroundColor: isSelected ? cfg.bg : 'transparent',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isSelected ? cfg.bg : 'var(--adm-bg-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isSelected ? cfg.bg : 'transparent'}
                    >
                      <span>{cfg.label}</span>
                      {isSelected && <Check size={14} />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Delete Client */}
          <button
            type="button"
            onClick={() => setIsDeleting(true)}
            title="Excluir Cliente"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#EF4444',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* ── Main Workspace Body (Split 2 Columns) ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* ── LEFT COLUMN: Ficha Cadastral (Scrollable, ~420px) ── */}
        <div style={{
          width: '420px',
          borderRight: '1px solid var(--adm-border)',
          background: 'var(--adm-bg-card)',
          overflowY: 'auto',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          flexShrink: 0,
        }}>
          {/* Seção 1: Aniversariante & Evento */}
          <div style={sectionTitleStyle}>
            <Heart size={13} color="var(--adm-accent)" />
            <span>Aniversariante & Evento</span>
          </div>

          <div style={cardStyle}>
            <div style={cardRowStyle}>
              <span style={cardLabelStyle}>Aniversariante</span>
              <div style={cardValueStyle}>
                <input
                  type="text"
                  value={client.birthdayPersonName || client.name}
                  onChange={(e) => updateClient(client.id, { birthdayPersonName: e.target.value, name: e.target.value })}
                  style={seamlessInputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; e.currentTarget.style.background = 'var(--adm-bg-input)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; e.currentTarget.style.background = 'transparent'; }}
                />
              </div>
            </div>

            <div style={cardRowStyle}>
              <span style={cardLabelStyle}>Idade que fará</span>
              <div style={cardValueStyle}>
                <input
                  type="number"
                  value={client.birthdayPersonAge || 15}
                  onChange={(e) => updateClient(client.id, { birthdayPersonAge: Number(e.target.value) || 15 })}
                  style={{ ...seamlessInputStyle, width: '70px' }}
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                />
                <span style={{ fontSize: '11px', color: 'var(--adm-text-muted)' }}>Anos</span>
              </div>
            </div>

            <div style={cardRowStyle}>
              <span style={cardLabelStyle}>Data Nascimento</span>
              <div style={cardValueStyle}>
                <input
                  type="date"
                  value={client.birthdayPersonBirthdate || ''}
                  onChange={(e) => updateClient(client.id, { birthdayPersonBirthdate: e.target.value })}
                  style={seamlessInputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                />
              </div>
            </div>

            <div style={cardRowStyle}>
              <span style={cardLabelStyle}>Data da Festa</span>
              <div style={cardValueStyle}>
                <input
                  type="date"
                  value={client.eventDate || ''}
                  onChange={(e) => updateClient(client.id, { eventDate: e.target.value })}
                  style={{ ...seamlessInputStyle, fontWeight: 700, color: '#F59E0B' }}
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                />
              </div>
            </div>

            <div style={cardRowStyle}>
              <span style={cardLabelStyle}>Horário</span>
              <div style={cardValueStyle}>
                <input
                  type="text"
                  value={client.eventTime || '20:00 às 02:00'}
                  onChange={(e) => updateClient(client.id, { eventTime: e.target.value })}
                  placeholder="Ex: 20:00 às 02:00"
                  style={seamlessInputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                />
              </div>
            </div>

            <div style={cardRowStyle}>
              <span style={cardLabelStyle}>Casa de Festas</span>
              <div style={cardValueStyle}>
                <select
                  value={client.venueId || ''}
                  onChange={(e) => {
                    const matched = venues.find(v => v.id === e.target.value);
                    updateClient(client.id, { venueId: e.target.value, venueName: matched?.name || client.venueName });
                  }}
                  style={cardSelectStyle}
                >
                  {venues.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={cardRowStyle}>
              <span style={cardLabelStyle}>Convidados</span>
              <div style={cardValueStyle}>
                <input
                  type="number"
                  value={client.guestCount || 150}
                  onChange={(e) => updateClient(client.id, { guestCount: Number(e.target.value) || 0 })}
                  style={{ ...seamlessInputStyle, width: '90px' }}
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                />
                <span style={{ fontSize: '11px', color: 'var(--adm-text-muted)' }}>Pessoas</span>
              </div>
            </div>
          </div>

          {/* Seção 2: Contratante & Decisores */}
          <div style={{ ...sectionTitleStyle, marginTop: '4px' }}>
            <Users size={13} color="var(--adm-accent)" />
            <span>Contratante & Decisores</span>
          </div>

          <div style={cardStyle}>
            {/* Decisor Principal */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid var(--adm-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>Decisor Principal</span>
                <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', fontWeight: 700 }}>
                  Principal
                </span>
              </div>

              {client.payerPhone && (
                <button
                  type="button"
                  onClick={() => handleDirectWhatsApp(client.payerPhone)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'rgba(37, 211, 102, 0.12)',
                    color: '#25D366',
                    border: '1px solid rgba(37, 211, 102, 0.35)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <MessageSquare size={11} fill="#25D366" />
                  <span>WhatsApp</span>
                </button>
              )}
            </div>

            <div style={cardRowStyle}>
              <span style={cardLabelStyle}>Nome</span>
              <div style={cardValueStyle}>
                <input
                  type="text"
                  value={client.payerName || ''}
                  onChange={(e) => updateClient(client.id, { payerName: e.target.value })}
                  style={seamlessInputStyle}
                  placeholder="Nome do responsável..."
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                />
              </div>
            </div>

            <div style={cardRowStyle}>
              <span style={cardLabelStyle}>Parentesco</span>
              <div style={cardValueStyle}>
                <select
                  value={client.payerRelationship || 'mother'}
                  onChange={(e) => updateClient(client.id, { payerRelationship: e.target.value as any })}
                  style={cardSelectStyle}
                >
                  <option value="mother">Mãe</option>
                  <option value="father">Pai</option>
                  <option value="guardian">Responsável Legal</option>
                  <option value="self">A própria Aniversariante</option>
                  <option value="other">Outro</option>
                </select>
              </div>
            </div>

            <div style={cardRowStyle}>
              <span style={cardLabelStyle}>Telefone / Zap</span>
              <div style={cardValueStyle}>
                <input
                  type="text"
                  value={client.payerPhone || ''}
                  onChange={(e) => updateClient(client.id, { payerPhone: e.target.value })}
                  style={seamlessInputStyle}
                  placeholder="(21) 99999-9999"
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                />
              </div>
            </div>

            {/* Optional Payer Fields */}
            {(client.payerEmail || showPayerEmail) ? (
              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>E-mail</span>
                <div style={cardValueStyle}>
                  <input
                    type="email"
                    value={client.payerEmail || ''}
                    onChange={(e) => updateClient(client.id, { payerEmail: e.target.value })}
                    style={seamlessInputStyle}
                    placeholder="email@exemplo.com"
                    onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                  />
                </div>
              </div>
            ) : null}

            {(client.payerCpf || showPayerCpf) ? (
              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>CPF</span>
                <div style={cardValueStyle}>
                  <input
                    type="text"
                    value={client.payerCpf || ''}
                    onChange={(e) => updateClient(client.id, { payerCpf: e.target.value })}
                    style={seamlessInputStyle}
                    placeholder="000.000.000-00"
                    onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                  />
                </div>
              </div>
            ) : null}

            {(client.payerAddress || client.payerNeighborhood || showPayerAddress) ? (
              <>
                <div style={cardRowStyle}>
                  <span style={cardLabelStyle}>Endereço</span>
                  <div style={cardValueStyle}>
                    <input
                      type="text"
                      value={client.payerAddress || ''}
                      onChange={(e) => updateClient(client.id, { payerAddress: e.target.value })}
                      style={seamlessInputStyle}
                      placeholder="Rua, número..."
                      onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                    />
                  </div>
                </div>
                <div style={cardRowStyle}>
                  <span style={cardLabelStyle}>Bairro / Cidade</span>
                  <div style={{ ...cardValueStyle, gap: '6px' }}>
                    <input
                      type="text"
                      value={client.payerNeighborhood || ''}
                      onChange={(e) => updateClient(client.id, { payerNeighborhood: e.target.value })}
                      style={seamlessInputStyle}
                      placeholder="Bairro"
                      onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                    />
                    <input
                      type="text"
                      value={client.payerCity || ''}
                      onChange={(e) => updateClient(client.id, { payerCity: e.target.value })}
                      style={seamlessInputStyle}
                      placeholder="Cidade"
                      onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                    />
                  </div>
                </div>
              </>
            ) : null}

            {/* Optional Field Adder Buttons */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingTop: '4px', borderTop: '1px solid var(--adm-border)' }}>
              {!client.payerEmail && !showPayerEmail && (
                <button
                  type="button"
                  onClick={() => setShowPayerEmail(true)}
                  style={{
                    background: 'transparent',
                    border: '1px dashed var(--adm-border)',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.68rem',
                    color: 'var(--adm-text-muted)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Plus size={10} /> E-mail
                </button>
              )}
              {!client.payerCpf && !showPayerCpf && (
                <button
                  type="button"
                  onClick={() => setShowPayerCpf(true)}
                  style={{
                    background: 'transparent',
                    border: '1px dashed var(--adm-border)',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.68rem',
                    color: 'var(--adm-text-muted)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Plus size={10} /> CPF
                </button>
              )}
              {!client.payerAddress && !showPayerAddress && (
                <button
                  type="button"
                  onClick={() => setShowPayerAddress(true)}
                  style={{
                    background: 'transparent',
                    border: '1px dashed var(--adm-border)',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.68rem',
                    color: 'var(--adm-text-muted)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Plus size={10} /> Endereço / Bairro
                </button>
              )}
            </div>

            {/* Subcontatos cadastrados */}
            {(client.contacts || []).map(cnt => (
              <div key={cnt.id} style={{
                background: 'var(--adm-bg-input)',
                border: '1px solid var(--adm-border)',
                borderRadius: '8px',
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                marginTop: '4px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                    {cnt.name} ({cnt.role === 'mother' ? 'Mãe' : cnt.role === 'father' ? 'Pai' : cnt.role || 'Contato'})
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {cnt.phone && (
                      <button
                        type="button"
                        onClick={() => handleDirectWhatsApp(cnt.phone)}
                        style={{ background: 'transparent', border: 'none', color: '#25D366', cursor: 'pointer', padding: 0 }}
                      >
                        <MessageSquare size={12} fill="#25D366" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveSubContact(cnt.id)}
                      style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 0 }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
                  {formatPhone(cnt.phone)} {cnt.email ? `• ${cnt.email}` : ''}
                </div>
              </div>
            ))}

            {/* Adicionar Subcontato */}
            {isAddingSubContact ? (
              <form onSubmit={handleAddSubContact} style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', borderRadius: '8px', padding: '10px', marginTop: '6px' }}>
                <input
                  type="text"
                  placeholder="Nome do contato..."
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  style={seamlessInputStyle}
                  required
                />
                <input
                  type="text"
                  placeholder="Telefone / WhatsApp..."
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  style={seamlessInputStyle}
                  required
                />
                <select
                  value={newContactRole}
                  onChange={(e) => setNewContactRole(e.target.value as any)}
                  style={cardSelectStyle}
                >
                  <option value="father">Pai</option>
                  <option value="mother">Mãe</option>
                  <option value="guardian">Responsável</option>
                  <option value="other">Outro</option>
                </select>
                <input
                  type="email"
                  placeholder="E-mail (opcional)..."
                  value={newContactEmail}
                  onChange={(e) => setNewContactEmail(e.target.value)}
                  style={seamlessInputStyle}
                />
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <button type="button" onClick={() => setIsAddingSubContact(false)} style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', fontSize: '0.72rem', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button type="submit" style={{ background: 'var(--adm-accent)', border: 'none', color: '#FFF', borderRadius: '6px', padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                    Salvar
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingSubContact(true)}
                style={{
                  background: 'transparent',
                  border: '1px dashed var(--adm-border)',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '0.72rem',
                  color: 'var(--adm-accent)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  marginTop: '4px',
                }}
              >
                <Plus size={12} /> Adicionar Contato / Responsável
              </button>
            )}
          </div>

          {/* Seção 3: Contrato & Negociação (Pós-Venda) */}
          <div style={{ ...sectionTitleStyle, marginTop: '4px' }}>
            <FileCheck size={13} color="var(--adm-accent)" />
            <span>Contrato & Negociação</span>
          </div>

          <div style={cardStyle}>
            {/* Status do Contrato */}
            <div style={cardRowStyle}>
              <span style={cardLabelStyle}>Status Contrato</span>
              <div style={cardValueStyle}>
                <select
                  value={client.contractStatus || 'aguardando_sinal'}
                  onChange={(e) => updateClient(client.id, { contractStatus: e.target.value as any })}
                  style={{
                    ...cardSelectStyle,
                    fontWeight: 800,
                    color: client.contractStatus === 'contrato_assinado' ? '#10B981' : client.contractStatus === 'sinal_pago' ? '#3B82F6' : '#F59E0B',
                  }}
                >
                  <option value="aguardando_sinal">⏳ Aguardando Sinal</option>
                  <option value="sinal_pago">💰 Sinal Pago</option>
                  <option value="contrato_enviado">📤 Contrato Enviado</option>
                  <option value="contrato_assinado">✅ Contrato Assinado</option>
                </select>
              </div>
            </div>

            {/* Data de Assinatura */}
            <div style={cardRowStyle}>
              <span style={cardLabelStyle}>Assinado em</span>
              <div style={cardValueStyle}>
                <input
                  type="date"
                  value={client.contractSignedAt || ''}
                  onChange={(e) => updateClient(client.id, { contractSignedAt: e.target.value })}
                  style={seamlessInputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                />
              </div>
            </div>

            {/* Pagamento do Sinal / Entrada */}
            <div style={{ ...cardRowStyle, borderTop: '1px solid var(--adm-border)', paddingTop: '6px' }}>
              <span style={cardLabelStyle}>Sinal / Entrada</span>
              <div style={{ ...cardValueStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.74rem', color: client.signalPaid ? '#10B981' : 'var(--adm-text-title)', fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={Boolean(client.signalPaid)}
                    onChange={(e) => updateClient(client.id, { signalPaid: e.target.checked })}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>{client.signalPaid ? 'Sinal Pago' : 'Pendente'}</span>
                </label>

                <input
                  type="number"
                  placeholder="Valor R$"
                  value={client.contractDownPayment !== undefined ? client.contractDownPayment : (client.signalValue || '')}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    const totalVal = client.baseContractValue !== undefined ? client.baseContractValue : (client.dealValue || 0);
                    updateClient(client.id, { 
                      contractDownPayment: val, 
                      signalValue: val,
                      contractInstallmentsRemaining: Math.max(0, totalVal - val)
                    });
                  }}
                  style={{ ...seamlessInputStyle, width: '90px', fontWeight: 700, color: '#10B981' }}
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = '#10B981'; }}
                  onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                />
              </div>
            </div>

            {/* Restante Parcelado */}
            <div style={cardRowStyle}>
              <span style={cardLabelStyle}>Restante Parc.</span>
              <div style={{ ...cardValueStyle, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#F59E0B', fontWeight: 800, fontSize: '0.78rem' }}>R$</span>
                <input
                  type="number"
                  placeholder="Restante"
                  value={client.contractInstallmentsRemaining !== undefined ? client.contractInstallmentsRemaining : Math.max(0, (client.baseContractValue !== undefined ? client.baseContractValue : (client.dealValue || 0)) - (client.contractDownPayment ?? client.signalValue ?? 0))}
                  onChange={(e) => updateClient(client.id, { contractInstallmentsRemaining: Number(e.target.value) || 0 })}
                  style={{ ...seamlessInputStyle, fontWeight: 700, color: '#F59E0B' }}
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = '#F59E0B'; }}
                  onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                />
                <select
                  value={client.contractInstallmentsCount || 10}
                  onChange={(e) => updateClient(client.id, { contractInstallmentsCount: Number(e.target.value) || 1 })}
                  style={{ ...cardSelectStyle, width: '70px', fontSize: '0.72rem' }}
                >
                  {[1,2,3,4,5,6,7,8,9,10,12,15,18,24].map(n => (
                    <option key={n} value={n}>{n}x</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pacote Vendido */}
            <div style={cardRowStyle}>
              <span style={cardLabelStyle}>Pacote</span>
              <div style={cardValueStyle}>
                <input
                  type="text"
                  value={client.packageSold || ''}
                  onChange={(e) => updateClient(client.id, { packageSold: e.target.value })}
                  style={seamlessInputStyle}
                  placeholder="Ex: Pacote Ouro..."
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                />
              </div>
            </div>

            {/* Valor Total do Contrato */}
            <div style={cardRowStyle}>
              <span style={cardLabelStyle}>Contrato Base</span>
              <div style={{ ...cardValueStyle, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: '#10B981', fontWeight: 800, fontSize: '0.82rem' }}>R$</span>
                <input
                  type="number"
                  value={client.baseContractValue !== undefined ? client.baseContractValue : (client.dealValue || 0)}
                  onChange={(e) => {
                    const totalVal = Number(e.target.value) || 0;
                    const down = client.contractDownPayment !== undefined ? client.contractDownPayment : (client.signalValue || 0);
                    updateClient(client.id, { 
                      dealValue: totalVal,
                      baseContractValue: totalVal,
                      contractInstallmentsRemaining: Math.max(0, totalVal - down)
                    });
                  }}
                  style={{ ...seamlessInputStyle, fontWeight: 800, color: '#10B981' }}
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = '#10B981'; }}
                  onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                />
              </div>
            </div>

            {/* Condições de Pagamento */}
            <div style={cardRowStyle}>
              <span style={cardLabelStyle}>Condições Pgto</span>
              <div style={cardValueStyle}>
                <input
                  type="text"
                  value={client.paymentTerms || ''}
                  onChange={(e) => updateClient(client.id, { paymentTerms: e.target.value })}
                  style={seamlessInputStyle}
                  placeholder="Ex: Entrada + 10x sem juros..."
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--adm-accent)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                />
              </div>
            </div>
          </div>

          {/* Seção 4: App da Debutante & Convidados */}
          <div style={{ ...sectionTitleStyle, marginTop: '4px' }}>
            <Sparkles size={13} color="var(--adm-accent)" />
            <span>App da Debutante & Convidados</span>
          </div>

          <div style={cardStyle}>
            {client.debutanteId || client.debutanteSlug || linkedDebutante ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    color: '#10B981',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    <CheckCircle2 size={12} /> /app/{client.debutanteSlug || linkedDebutante?.slug}
                  </span>

                  <button
                    type="button"
                    onClick={handleUnlinkDebutante}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--adm-text-muted)',
                      fontSize: '0.68rem',
                      cursor: 'pointer',
                    }}
                  >
                    Desvincular
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const slug = client.debutanteSlug || linkedDebutante?.slug;
                      if (slug) {
                        if (onOpenDebutanteApp) {
                          onOpenDebutanteApp(slug);
                        } else {
                          window.open(`/app/${slug}`, '_blank');
                        }
                      }
                    }}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: 'var(--adm-accent, #B8860B)',
                      color: '#FFF',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <ExternalLink size={13} />
                    <span>Acessar App Debutante</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyAppUrl}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--adm-border)',
                      backgroundColor: 'var(--adm-bg-input)',
                      color: copiedAppUrl ? '#10B981' : 'var(--adm-text-title)',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {copiedAppUrl ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedAppUrl ? 'Copiado' : 'Link'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'center', padding: '6px 0' }}>
                <p style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', margin: 0 }}>
                  Este cliente ainda não possui acesso ao App de Confirmação & Convidados.
                </p>
                <button
                  type="button"
                  onClick={handleCreateAndLinkDebutante}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '9px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--adm-accent, #B8860B)',
                    color: '#FFF',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(212, 175, 55, 0.25)',
                  }}
                >
                  <Sparkles size={14} />
                  <span>Criar / Vincular Acesso Debutante</span>
                </button>
              </div>
            )}
          </div>

          {/* Seção 5: Histórico Comercial Original */}
          {client.commercialHistory && (
            <>
              <div style={{ ...sectionTitleStyle, marginTop: '4px' }}>
                <Shield size={13} color="var(--adm-accent)" />
                <span>Histórico Comercial do Lead</span>
              </div>
              <div style={cardStyle}>
                <div style={cardRowStyle}>
                  <span style={cardLabelStyle}>Origem</span>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                    {client.commercialHistory.origin || 'Comercial CRM'}
                  </span>
                </div>
                <div style={cardRowStyle}>
                  <span style={cardLabelStyle}>Fechado Por</span>
                  <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--adm-text-title)' }}>
                    {client.commercialHistory.closedBy || 'Equipe Comercial'}
                  </span>
                </div>
                {client.commercialLeadId && onOpenCommercialLead && (
                  <button
                    type="button"
                    onClick={() => onOpenCommercialLead(client.commercialLeadId!)}
                    style={{
                      marginTop: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--adm-border)',
                      background: 'var(--adm-bg-input)',
                      color: 'var(--adm-accent)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <ExternalLink size={12} />
                    <span>Ver Ficha Original do Lead</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── RIGHT COLUMN: Timeline, WhatsApp, Documentos ── */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--adm-bg-app)',
        }}>
          {/* Tabs Bar */}
          <div style={{
            height: '46px',
            borderBottom: '1px solid var(--adm-border)',
            background: 'var(--adm-bg-card)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 20px',
            gap: '8px',
          }}>
            <button
              type="button"
              onClick={() => setActiveTab('whatsapp')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'whatsapp' ? 'var(--adm-bg-input)' : 'transparent',
                color: activeTab === 'whatsapp' ? '#25D366' : 'var(--adm-text-muted)',
                fontWeight: activeTab === 'whatsapp' ? 800 : 500,
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              <MessageSquare size={14} />
              <span>WhatsApp & Mensagens</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'timeline' ? 'var(--adm-bg-input)' : 'transparent',
                color: activeTab === 'timeline' ? 'var(--adm-text-title)' : 'var(--adm-text-muted)',
                fontWeight: activeTab === 'timeline' ? 800 : 500,
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              <Clock size={14} />
              <span>Timeline & Histórico</span>
              <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6', fontWeight: 700 }}>
                {(client.activities || []).length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'tasks' ? 'var(--adm-bg-input)' : 'transparent',
                color: activeTab === 'tasks' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                fontWeight: activeTab === 'tasks' ? 800 : 500,
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              <CheckSquare size={14} />
              <span>Tarefas & Agendamentos</span>
              <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', fontWeight: 700 }}>
                {clientTasks.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('commercial')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'commercial' ? 'var(--adm-bg-input)' : 'transparent',
                color: activeTab === 'commercial' ? '#059669' : 'var(--adm-text-muted)',
                fontWeight: activeTab === 'commercial' ? 800 : 500,
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              <DollarSign size={14} />
              <span>Vendas & Upsell</span>
              <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', fontWeight: 700 }}>
                {(client.upsellSales || []).length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('documents')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'documents' ? 'var(--adm-bg-input)' : 'transparent',
                color: activeTab === 'documents' ? 'var(--adm-text-title)' : 'var(--adm-text-muted)',
                fontWeight: activeTab === 'documents' ? 800 : 500,
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              <FileText size={14} />
              <span>Documentos & Anexos</span>
              <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '10px', background: 'rgba(212, 175, 55, 0.12)', color: '#B8860B', fontWeight: 700 }}>
                {(client.documents || []).length}
              </span>
            </button>
          </div>

          {/* Tab 1: WhatsApp & Comunicação */}
          {activeTab === 'whatsapp' && (
            <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
              <div style={{
                background: 'var(--adm-bg-card)',
                border: '1px solid var(--adm-border)',
                borderRadius: '12px',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(37, 211, 102, 0.15)',
                    border: '1px solid rgba(37, 211, 102, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#25D366',
                  }}>
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                      Comunicação Direta de Pós-Venda
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--adm-text-muted)' }}>
                      Envie comunicados, confirmações e cronogramas diretamente para os contatos da ficha
                    </p>
                  </div>
                </div>

                {/* Remetente WhatsApp Conectado */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--adm-bg-input)', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--adm-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 700, color: '#10B981' }}>
                    <Zap size={13} color="#10B981" />
                    <span>Disparando através de:</span>
                    {connectedSenderSources.length > 1 ? (
                      <select
                        value={selectedSenderSourceId}
                        onChange={(e) => setSelectedSenderSourceId(e.target.value)}
                        style={{ background: 'transparent', border: 'none', color: '#10B981', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer', outline: 'none' }}
                      >
                        {connectedSenderSources.map(src => (
                          <option key={src.id} value={src.id} style={{ background: '#1E293B', color: '#FFF' }}>
                            {src.name} ({(src.configuration as any)?.connectedPhone || 'Conectado'})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span style={{ fontWeight: 800, color: 'var(--adm-text-title)' }}>
                        {activeSenderSource?.name || 'WhatsApp Pós-Venda'} {activeSenderSource ? `(${(activeSenderSource.configuration as any)?.connectedPhone || 'Conectado'})` : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Seletor Multi-Destinatário com Foco no Decisor */}
                {clientRecipients.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--adm-bg-input)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--adm-border)' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--adm-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <PhoneCall size={11} /> Destinatário Selecionado (Prioridade Decisor):
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      {clientRecipients.map((rec) => {
                        const isSelected = selectedClientRecipientPhone === rec.phone;
                        return (
                          <button
                            key={rec.phone}
                            type="button"
                            onClick={() => setSelectedClientRecipientPhone(rec.phone)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'var(--adm-bg-card)',
                              border: isSelected ? '1px solid #10B981' : '1px solid var(--adm-border)',
                              color: isSelected ? '#10B981' : 'var(--adm-text-title)',
                              fontSize: '0.72rem',
                              fontWeight: isSelected ? 800 : 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            {rec.isDecisor && <Crown size={12} color="#D4AF37" />}
                            <span>{rec.label} • {formatPhone(rec.phone)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Custom Message Sender */}
                <form onSubmit={handleSendClientUazapiMessage} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={whatsappCustomMsg}
                    onChange={(e) => setWhatsappCustomMsg(e.target.value)}
                    placeholder={`Escreva uma mensagem para ${clientRecipients.find(r => r.phone === selectedClientRecipientPhone)?.label || client.payerName}...`}
                    className="adm-input"
                    style={{ flex: 1, height: '40px', borderRadius: '8px', fontSize: '0.78rem' }}
                  />
                  <button
                    type="submit"
                    disabled={!whatsappCustomMsg.trim()}
                    className="adm-btn-primary"
                    style={{
                      height: '40px',
                      padding: '0 16px',
                      borderRadius: '8px',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#10B981',
                      color: '#FFF',
                      border: 'none',
                    }}
                  >
                    <Send size={13} />
                    <span>Enviar</span>
                  </button>
                </form>

                {/* Quick Message Templates */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
                    Modelos Rápidos de Mensagens
                  </span>

                  {[
                    {
                      label: '🎉 Boas-vindas & Onboarding',
                      text: `Olá ${client.payerName}! É um prazer ter você e a ${client.birthdayPersonName} conosco na Bonomo Festas. Estamos iniciando a organização da sua festa para o dia ${new Date(client.eventDate).toLocaleDateString('pt-BR')}.`,
                    },
                    {
                      label: '📋 Envio do Link do App',
                      text: client.debutanteSlug ? `Olá ${client.birthdayPersonName}! Segue o link exclusivo do seu App de Convidados e Confirmação: ${window.location.origin}/app/${client.debutanteSlug}` : 'Acesse o App da Debutante.',
                    },
                    {
                      label: '🍰 Agendamento de Degustação / Visita',
                      text: `Olá ${client.payerName}! Gostaríamos de agendar a degustação do menu e a visita técnica da festa da ${client.birthdayPersonName}. Qual o melhor dia para vocês?`,
                    },
                  ].map((tpl, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleDirectWhatsApp(selectedClientRecipientPhone || client.payerPhone, tpl.text)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: 'var(--adm-bg-input)',
                        border: '1px solid var(--adm-border)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'background 0.12s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--adm-bg-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--adm-bg-input)'}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ fontSize: '0.78rem', color: 'var(--adm-text-title)', display: 'block' }}>{tpl.label}</strong>
                        <p style={{ margin: '2px 0 0', fontSize: '0.70rem', color: 'var(--adm-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tpl.text}</p>
                      </div>
                      <Send size={13} color="#25D366" style={{ marginLeft: '8px', flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Timeline & Atividades */}
          {activeTab === 'timeline' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Activity List */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(client.activities || []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--adm-text-muted)' }}>
                    <Clock size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontSize: '0.84rem' }}>Nenhuma atividade registrada ainda neste cliente.</p>
                  </div>
                ) : (
                  [...(client.activities || [])].reverse().map(act => (
                    <div
                      key={act.id}
                      style={{
                        background: 'var(--adm-bg-card)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-accent)' }}>
                          {act.createdBy || 'Sistema'}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                          {new Date(act.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.80rem', color: 'var(--adm-text-title)', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                        {act.description}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Note Bar */}
              <form onSubmit={handleAddNote} style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--adm-border)',
                background: 'var(--adm-bg-card)',
                display: 'flex',
                gap: '10px',
              }}>
                <input
                  type="text"
                  placeholder="Adicionar nota operacional ou registro de atendimento..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '0.82rem',
                    color: 'var(--adm-text-title)',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={!newNote.trim()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--adm-accent, #B8860B)',
                    color: '#FFF',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: newNote.trim() ? 'pointer' : 'default',
                    opacity: newNote.trim() ? 1 : 0.5,
                  }}
                >
                  <Send size={14} />
                  <span>Registrar</span>
                </button>
              </form>
            </div>
          )}

          {/* Tab 3: Tarefas & Agendamentos */}
          {activeTab === 'tasks' && (
            <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                    Tarefas & Agendamentos do Pós-Venda
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--adm-text-muted)' }}>
                    Gerencie degustações, visitas técnicas, revisões de contratos e pendências deste cliente
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingTask(null);
                    setIsTaskModalOpen(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--adm-accent, #B8860B)',
                    color: '#FFF',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(212, 175, 55, 0.25)',
                  }}
                >
                  <Plus size={14} />
                  <span>Nova Tarefa / Agendamento</span>
                </button>
              </div>

              {clientTasks.length === 0 ? (
                <div style={{
                  background: 'var(--adm-bg-card)',
                  border: '1px dashed var(--adm-border)',
                  borderRadius: '12px',
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: 'var(--adm-text-muted)',
                }}>
                  <CheckSquare size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 600 }}>Nenhuma tarefa vinculada a este cliente.</p>
                  <p style={{ margin: '4px 0 12px', fontSize: '0.74rem' }}>Crie compromissos como degustação, envio de contrato ou visita técnica.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTask(null);
                      setIsTaskModalOpen(true);
                    }}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '6px',
                      border: '1px solid var(--adm-border)',
                      background: 'var(--adm-bg-input)',
                      color: 'var(--adm-text-title)',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    + Criar Primeira Tarefa
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {clientTasks.map(task => {
                    const isDone = task.status === 'completed';
                    const isLate = !isDone && Boolean(task.dueDate) && new Date(task.dueDate!) < new Date();
                    const collabLabel = task.createdByName || (task.assignedToIds && task.assignedToIds.length ? 'Equipe' : null);

                    return (
                      <div
                        key={task.id}
                        style={{
                          background: 'var(--adm-bg-card)',
                          border: `1px solid ${isDone ? 'rgba(16, 185, 129, 0.25)' : isLate ? 'rgba(239, 68, 68, 0.3)' : 'var(--adm-border)'}`,
                          borderRadius: '10px',
                          padding: '12px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                              <strong style={{
                                fontSize: '0.86rem',
                                color: isDone ? 'var(--adm-text-muted)' : 'var(--adm-text-title)',
                                textDecoration: isDone ? 'line-through' : 'none',
                              }}>
                                {task.title}
                              </strong>
                              {task.priority && (
                                <span style={{
                                  fontSize: '10px',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 700,
                                  background: task.priority === 'urgent' || task.priority === 'high' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                                  color: task.priority === 'urgent' || task.priority === 'high' ? '#EF4444' : '#3B82F6',
                                }}>
                                  {task.priority === 'urgent' ? 'Urgente' : task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                                </span>
                              )}
                              {task.type && (
                                <span style={{
                                  fontSize: '10px',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 600,
                                  background: 'var(--adm-bg-input)',
                                  color: 'var(--adm-text-muted)',
                                  border: '1px solid var(--adm-border)',
                                }}>
                                  {task.type}
                                </span>
                              )}
                            </div>

                            {task.description && (
                              <p style={{ margin: '0 0 6px', fontSize: '0.76rem', color: 'var(--adm-text-muted)', lineHeight: 1.4 }}>
                                {task.description}
                              </p>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: isLate ? '#EF4444' : undefined, fontWeight: isLate ? 700 : 500 }}>
                                <Clock size={12} />
                                {task.dueDate ? `Prazo: ${new Date(task.dueDate).toLocaleDateString('pt-BR')}` : 'Sem prazo'}
                                {isLate && ' (Atrasada)'}
                              </span>
                              {collabLabel && (
                                <span>Resp: <strong style={{ color: 'var(--adm-text-title)' }}>{collabLabel}</strong></span>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTask(task);
                                setIsTaskModalOpen(true);
                              }}
                              title="Editar Tarefa Completa"
                              style={{
                                background: 'var(--adm-bg-input)',
                                border: '1px solid var(--adm-border)',
                                borderRadius: '6px',
                                padding: '6px',
                                color: 'var(--adm-text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setTaskToDelete(task)}
                              title="Excluir Tarefa"
                              style={{
                                background: 'rgba(239, 68, 68, 0.08)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '6px',
                                padding: '6px',
                                color: '#EF4444',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* 3-Stage Status Pill Selector */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          paddingTop: '8px',
                          borderTop: '1px solid var(--adm-border)',
                          flexWrap: 'wrap',
                        }}>
                          <span style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginRight: '4px' }}>
                            Etapa da Tarefa:
                          </span>
                          {(['todo', 'in_progress', 'completed'] as TaskStatus[]).map(statusKey => {
                            const isCurrent = task.status === statusKey;
                            const labels: Record<TaskStatus, string> = {
                              todo: 'Não Iniciada',
                              in_progress: 'Em Execução',
                              waiting: 'Aguardando',
                              completed: 'Finalizada',
                              no_result: 'Sem Resultado',
                              no_show: 'No-show',
                              cancelled: 'Cancelada',
                            };

                            let activeBg = 'var(--adm-bg-input)';
                            let activeColor = 'var(--adm-text-muted)';
                            let activeBorder = 'var(--adm-border)';

                            if (isCurrent) {
                              if (statusKey === 'completed') {
                                activeBg = 'rgba(16, 185, 129, 0.15)';
                                activeColor = '#10B981';
                                activeBorder = 'rgba(16, 185, 129, 0.4)';
                              } else if (statusKey === 'in_progress') {
                                activeBg = 'rgba(59, 130, 246, 0.15)';
                                activeColor = '#3B82F6';
                                activeBorder = 'rgba(59, 130, 246, 0.4)';
                              } else {
                                activeBg = 'rgba(245, 158, 11, 0.15)';
                                activeColor = '#F59E0B';
                                activeBorder = 'rgba(245, 158, 11, 0.4)';
                              }
                            }

                            return (
                              <button
                                key={statusKey}
                                type="button"
                                onClick={() => handleTaskStageChange(task, statusKey)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 9px',
                                  borderRadius: '6px',
                                  border: `1px solid ${activeBorder}`,
                                  background: activeBg,
                                  color: activeColor,
                                  fontSize: '0.70rem',
                                  fontWeight: isCurrent ? 800 : 500,
                                  cursor: 'pointer',
                                  transition: 'all 0.12s ease',
                                }}
                              >
                                {isCurrent && statusKey === 'completed' && <CheckCircle2 size={11} />}
                                <span>{labels[statusKey]}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Resolution / Feedback if completed */}
                        {task.resolution && (
                          <div style={{
                            background: 'rgba(16, 185, 129, 0.06)',
                            borderLeft: '3px solid #10B981',
                            padding: '6px 10px',
                            borderRadius: '0 6px 6px 0',
                            fontSize: '0.72rem',
                            color: 'var(--adm-text-title)',
                          }}>
                            <span style={{ fontWeight: 700, color: '#10B981', display: 'block', fontSize: '0.68rem', textTransform: 'uppercase' }}>
                              Registro de Conclusão / O que aconteceu:
                            </span>
                            {task.resolution}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Vendas & Upsell (Serviços Adicionais, Caixa vs Previsto & Rentabilidade) */}
          {activeTab === 'commercial' && (() => {
            const baseContract = client.baseContractValue !== undefined ? client.baseContractValue : (client.dealValue || 0);
            const downPayment = client.contractDownPayment !== undefined ? client.contractDownPayment : (client.signalValue || (client.signalPaid ? baseContract * 0.3 : 0));
            const installmentsRemaining = client.contractInstallmentsRemaining !== undefined ? client.contractInstallmentsRemaining : Math.max(0, baseContract - downPayment);
            const installmentsCount = client.contractInstallmentsCount || 10;
            const signalIsPaid = Boolean(client.signalPaid);

            const upsells = client.upsellSales || [];
            const totalUpsell = upsells.reduce((acc, u) => acc + (Number(u.value) || 0), 0);
            
            // Upsell breakdown
            const upsellAVista = upsells
              .filter(u => u.paymentType === 'a_vista' || u.paymentType === 'sinal' || (!u.paymentType && u.paymentStatus === 'pago'))
              .reduce((acc, u) => acc + (Number(u.value) || 0), 0);
            
            const upsellParcelado = upsells
              .filter(u => u.paymentType === 'parcelado' || (!u.paymentType && u.paymentStatus === 'parcelado'))
              .reduce((acc, u) => acc + (Number(u.value) || 0), 0);

            // Dinheiro em Caixa (Recebido: Sinal do Contrato Pago + Upsells Pagos/À Vista)
            const dinheiroCaixa = (signalIsPaid ? downPayment : 0) + upsellAVista;

            // Dinheiro Previsto (A Receber: Restante Parcelado + Upsells Parcelados + Sinal se Pendente)
            const dinheiroPrevisto = installmentsRemaining + upsellParcelado + (!signalIsPaid ? downPayment : 0);

            // Rentabilidade Total
            const totalRentabilidade = baseContract + totalUpsell;
            const growthPercent = baseContract > 0 ? ((totalUpsell / baseContract) * 100).toFixed(1) : '0';

            return (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '24px', gap: '20px' }}>
                
                {/* 1. 5 KPI CARDS BANNER */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px' }}>
                  
                  {/* Card 1: Contrato Base */}
                  <div style={{
                    background: 'var(--adm-bg-card)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Contrato Base
                      </span>
                      <FileText size={15} color="var(--adm-accent)" />
                    </div>
                    <strong style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--adm-text-title)', letterSpacing: '-0.3px' }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(baseContract)}
                    </strong>
                    <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                      Sinal: <strong style={{ color: signalIsPaid ? '#10B981' : '#F59E0B' }}>R$ {downPayment.toLocaleString('pt-BR')}</strong> ({signalIsPaid ? 'Pago' : 'Pendente'})
                    </div>
                  </div>

                  {/* Card 2: Serviços Extras / Upsell */}
                  <div style={{
                    background: 'var(--adm-bg-card)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Serviços Extras / Upsell
                      </span>
                      <Gem size={15} color="#059669" />
                    </div>
                    <strong style={{ fontSize: '1.15rem', fontWeight: 800, color: '#059669', letterSpacing: '-0.3px' }}>
                      +{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalUpsell)}
                    </strong>
                    <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                      <strong style={{ color: '#059669' }}>{upsells.length} serviços</strong> • +{growthPercent}% sobre base
                    </div>
                  </div>

                  {/* Card 3: Dinheiro em Caixa (Recebido) */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.05) 100%)',
                    border: '1.5px solid rgba(16, 185, 129, 0.35)',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    boxShadow: '0 2px 6px rgba(16, 185, 129, 0.08)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        🟢 Dinheiro em Caixa
                      </span>
                      <span style={{ fontSize: '0.58rem', fontWeight: 800, background: '#10B981', color: '#FFF', padding: '1px 5px', borderRadius: '4px' }}>
                        RECEBIDO
                      </span>
                    </div>
                    <strong style={{ fontSize: '1.20rem', fontWeight: 900, color: '#047857', letterSpacing: '-0.3px' }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dinheiroCaixa)}
                    </strong>
                    <div style={{ fontSize: '0.66rem', color: '#059669', fontWeight: 600, marginTop: '2px' }}>
                      Sinal pago + Extras à vista
                    </div>
                  </div>

                  {/* Card 4: Dinheiro Previsto (A Receber) */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.05) 100%)',
                    border: '1.5px solid rgba(245, 158, 11, 0.35)',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    boxShadow: '0 2px 6px rgba(245, 158, 11, 0.08)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        🟡 Dinheiro Previsto
                      </span>
                      <span style={{ fontSize: '0.58rem', fontWeight: 800, background: '#F59E0B', color: '#FFF', padding: '1px 5px', borderRadius: '4px' }}>
                        A RECEBER
                      </span>
                    </div>
                    <strong style={{ fontSize: '1.20rem', fontWeight: 900, color: '#B45309', letterSpacing: '-0.3px' }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dinheiroPrevisto)}
                    </strong>
                    <div style={{ fontSize: '0.66rem', color: '#D97706', fontWeight: 600, marginTop: '2px' }}>
                      Restante parcelado + Extras a vencer
                    </div>
                  </div>

                  {/* Card 5: Rentabilidade Total */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(184, 134, 11, 0.05) 100%)',
                    border: '1.5px solid rgba(212, 175, 55, 0.4)',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    boxShadow: '0 2px 6px rgba(212, 175, 55, 0.1)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        💰 Rentabilidade Geral
                      </span>
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: 'var(--adm-accent, #B8860B)',
                        color: '#FFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.58rem',
                        fontWeight: 800,
                      }}>
                        $
                      </div>
                    </div>
                    <strong style={{ fontSize: '1.25rem', fontWeight: 900, color: '#92400E', letterSpacing: '-0.3px' }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRentabilidade)}
                    </strong>
                    <div style={{ fontSize: '0.66rem', color: '#B8860B', fontWeight: 600, marginTop: '2px' }}>
                      Receita total acumulada da unidade
                    </div>
                  </div>
                </div>

                {/* 2. Detalhamento Financeiro do Contrato Base */}
                <div style={{
                  background: 'var(--adm-bg-card)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                        Estrutura de Pagamento do Contrato Base
                      </h4>
                      <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
                        Valores acordados no fechamento comercial: Entrada/Sinal e saldo parcelado
                      </p>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: signalIsPaid ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                      border: `1px solid ${signalIsPaid ? '#10B981' : '#F59E0B'}40`,
                    }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: signalIsPaid ? '#10B981' : '#F59E0B' }}>
                        {signalIsPaid ? '✓ Sinal Quitado em Caixa' : '⏳ Aguardando Sinal'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    {/* Valor Contrato Base */}
                    <div style={{ background: 'var(--adm-bg-input)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--adm-border)' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', fontWeight: 600, display: 'block' }}>Contrato Base Fechado</span>
                      <strong style={{ fontSize: '0.94rem', color: 'var(--adm-text-title)' }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(baseContract)}
                      </strong>
                    </div>

                    {/* Sinal / Entrada */}
                    <div style={{ background: 'var(--adm-bg-input)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--adm-border)' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', fontWeight: 600, display: 'block' }}>Sinal / Entrada</span>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                        <strong style={{ fontSize: '0.94rem', color: signalIsPaid ? '#10B981' : 'var(--adm-text-title)' }}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(downPayment)}
                        </strong>
                        <span style={{
                          fontSize: '0.60rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: signalIsPaid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: signalIsPaid ? '#10B981' : '#F59E0B',
                        }}>
                          {signalIsPaid ? 'EM CAIXA' : 'PENDENTE'}
                        </span>
                      </div>
                    </div>

                    {/* Saldo Restante Parcelado */}
                    <div style={{ background: 'var(--adm-bg-input)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--adm-border)' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', fontWeight: 600, display: 'block' }}>Saldo Restante ({installmentsCount}x)</span>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                        <strong style={{ fontSize: '0.94rem', color: '#F59E0B' }}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(installmentsRemaining)}
                        </strong>
                        <span style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', fontWeight: 600 }}>
                          {installmentsCount > 0 ? `${installmentsCount}x de R$ ${(installmentsRemaining / installmentsCount).toFixed(2)}` : 'À vista'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Lista de Serviços Extras (Upsells) */}
                <div style={{
                  background: 'var(--adm-bg-card)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                        Serviços Adicionais e Opcionais Contratados (Upsells)
                      </h3>
                      <p style={{ margin: '3px 0 0 0', fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
                        Itens comercializados no pós-venda (foto/vídeo extra, coreografia, open bar, cabines 360, etc.)
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setUpsellTitle('');
                        setUpsellValue('');
                        setUpsellNotes('');
                        setUpsellDate(new Date().toISOString().split('T')[0]);
                        setUpsellPaymentMethod('PIX');
                        setUpsellPaymentStatus('pago');
                        setUpsellPaymentType('a_vista');
                        setUpsellInstallmentsCount(1);
                        setUpsellCategory('foto_video');
                        setUpsellResponsibleId(collaborators[0]?.id || '');
                        setIsUpsellModalOpen(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#10B981',
                        color: '#FFF',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                      }}
                    >
                      <Plus size={14} />
                      <span>Registrar Venda Adicional / Upsell</span>
                    </button>
                  </div>

                  {upsells.length === 0 ? (
                    <div style={{
                      border: '1.5px dashed var(--adm-border)',
                      borderRadius: '10px',
                      padding: '36px 20px',
                      textAlign: 'center',
                      color: 'var(--adm-text-muted)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                    }}>
                      <ShoppingBag size={30} style={{ opacity: 0.35 }} />
                      <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Nenhuma venda adicional ou upsell registrada ainda.</span>
                      <span style={{ fontSize: '0.72rem' }}>Clique no botão acima para adicionar itens extras e opcionais deste cliente.</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {upsells.map(sale => {
                        const catConfig = UPSELL_CATEGORIES[sale.category] || UPSELL_CATEGORIES.outro;
                        const isAVista = sale.paymentType === 'a_vista' || sale.paymentType === 'sinal' || (!sale.paymentType && sale.paymentStatus === 'pago');

                        return (
                          <div
                            key={sale.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 14px',
                              borderRadius: '8px',
                              background: 'var(--adm-bg-input, #F8FAFC)',
                              border: '1px solid var(--adm-border)',
                              gap: '12px',
                              flexWrap: 'wrap',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '200px', flex: 1 }}>
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: catConfig.bg,
                                color: catConfig.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}>
                                <Gem size={15} />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <strong style={{ fontSize: '0.82rem', color: 'var(--adm-text-title)' }}>
                                  {sale.title}
                                </strong>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span style={{
                                    fontSize: '0.58rem',
                                    fontWeight: 700,
                                    padding: '1px 6px',
                                    borderRadius: '999px',
                                    background: catConfig.bg,
                                    color: catConfig.color,
                                    border: `1px solid ${catConfig.color}40`,
                                  }}>
                                    {catConfig.label.toUpperCase()}
                                  </span>

                                  {/* Payment Type Badge */}
                                  <span style={{
                                    fontSize: '0.58rem',
                                    fontWeight: 800,
                                    padding: '1px 6px',
                                    borderRadius: '999px',
                                    background: isAVista ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                                    color: isAVista ? '#059669' : '#D97706',
                                    border: `1px solid ${isAVista ? '#10B981' : '#F59E0B'}40`,
                                  }}>
                                    {sale.paymentType === 'sinal' ? 'SINAL' : isAVista ? 'À VISTA (EM CAIXA)' : `PARCELADO ${sale.installmentsCount ? `(${sale.installmentsCount}X)` : ''}`}
                                  </span>

                                  {sale.paymentMethod && (
                                    <span style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>
                                      • {sale.paymentMethod}
                                    </span>
                                  )}
                                  {sale.responsibleName && (
                                    <span style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>
                                      • Vendedor: <strong style={{ color: 'var(--adm-text-body)' }}>{sale.responsibleName}</strong>
                                    </span>
                                  )}
                                  {sale.saleDate && (
                                    <span style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>
                                      • {new Date(sale.saleDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                                    </span>
                                  )}
                                </div>
                                {sale.notes && (
                                  <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                                    Obs: {sale.notes}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={{ fontSize: '0.90rem', fontWeight: 800, color: '#047857' }}>
                                  +{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.value)}
                                </span>
                                <span style={{
                                  fontSize: '0.56rem',
                                  fontWeight: 700,
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  background: sale.paymentStatus === 'pago' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                                  color: sale.paymentStatus === 'pago' ? '#10B981' : '#F59E0B',
                                  textTransform: 'uppercase',
                                }}>
                                  {sale.paymentStatus || 'pago'}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => setUpsellToDelete(sale)}
                                title="Excluir venda de serviço"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--adm-text-muted)',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  borderRadius: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--adm-text-muted)'}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Tab 5: Documentos & Anexos */}
          {activeTab === 'documents' && (
            <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                    Documentos e Contratos Anexados
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--adm-text-muted)' }}>
                    Armazenamento seguro de contratos, comprovantes e anexos operacionais
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--adm-accent, #B8860B)',
                    color: '#FFF',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={14} />
                  <span>Anexar Documento</span>
                </button>
              </div>

              {(client.documents || []).length === 0 ? (
                <div style={{
                  background: 'var(--adm-bg-card)',
                  border: '1px dashed var(--adm-border)',
                  borderRadius: '12px',
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: 'var(--adm-text-muted)',
                }}>
                  <FileText size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '0.82rem' }}>Nenhum documento anexado ainda.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                  {(client.documents || []).map(doc => (
                    <div
                      key={doc.id}
                      style={{
                        background: 'var(--adm-bg-card)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <FileText size={16} color="var(--adm-accent)" />
                        <span style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)' }}>{doc.fileSize || '1 MB'}</span>
                      </div>
                      <strong style={{ fontSize: '0.78rem', color: 'var(--adm-text-title)' }}>{doc.title}</strong>
                      <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                        {doc.type === 'contract' ? 'Contrato' : doc.type === 'receipt' ? 'Comprovante' : 'Anexo'} • {new Date(doc.uploadedAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Document Upload Modal ── */}
      {isDocModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px',
        }}>
          <form onSubmit={handleAddDocument} style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '440px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
              Anexar Documento ao Cliente
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>Título do Documento</label>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="Ex: Contrato Assinado, Comprovante de Entrada..."
                required
                style={{
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: 'var(--adm-text-title)',
                  fontSize: '0.82rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>Tipo de Documento</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as any)}
                style={cardSelectStyle}
              >
                <option value="contract">Contrato</option>
                <option value="receipt">Comprovante de Pagamento</option>
                <option value="layout">Planta / Layout da Festa</option>
                <option value="other">Outro</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>Link / URL do Arquivo</label>
              <input
                type="text"
                value={docFileUrl}
                onChange={(e) => setDocFileUrl(e.target.value)}
                placeholder="https://..."
                style={{
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: 'var(--adm-text-title)',
                  fontSize: '0.82rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setIsDocModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--adm-text-muted)',
                  fontSize: '0.80rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{
                  background: 'var(--adm-accent, #B8860B)',
                  border: 'none',
                  color: '#FFF',
                  borderRadius: '8px',
                  padding: '8px 18px',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Salvar Anexo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Client Task Detail Modal (Create / Edit) ── */}
      <AdminTaskDetailModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        task={editingTask}
        initialClientId={client.id}
        initialLeadId={client.commercialLeadId || undefined}
      />

      {/* ── Task Completion Feedback Modal ── */}
      <AdminTaskCompletionModal
        isOpen={!!completingTask}
        taskTitle={completingTask?.title || ''}
        onClose={() => setCompletingTask(null)}
        onConfirm={(feedback) => {
          if (completingTask) {
            completeTaskWithFeedback(completingTask.id, feedback);
            setCompletingTask(null);
          }
        }}
      />

      {/* ── Confirm Task Deletion Modal ── */}
      <AdminConfirmModal
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={() => {
          if (taskToDelete) {
            deleteTask(taskToDelete.id);
            setTaskToDelete(null);
          }
        }}
        title="Excluir Tarefa"
        message={`Deseja realmente excluir a tarefa "${taskToDelete?.title}"?`}
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        danger={true}
      />

      {/* ── Confirm Delete Client Modal ── */}
      <AdminConfirmModal
        isOpen={isDeleting}
        onClose={() => setIsDeleting(false)}
        onConfirm={() => {
          deleteClient(client.id);
          setIsDeleting(false);
          onClose();
        }}
        title="Excluir Cliente"
        message={`Deseja realmente remover o cliente "${client.birthdayPersonName || client.name}" (${client.code}) do sistema de Pós-Venda? Esta ação não pode ser desfeita.`}
        confirmText="Sim, Excluir Cliente"
        cancelText="Cancelar"
        danger={true}
      />

      {/* ── Confirm Delete Upsell Sale Modal ── */}
      <AdminConfirmModal
        isOpen={!!upsellToDelete}
        onClose={() => setUpsellToDelete(null)}
        onConfirm={() => {
          if (upsellToDelete) {
            deleteClientUpsellSale(client.id, upsellToDelete.id);
            setUpsellToDelete(null);
          }
        }}
        title="Excluir Venda de Serviço"
        message={`Deseja realmente remover o serviço extra "${upsellToDelete?.title}" (${upsellToDelete ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(upsellToDelete.value) : ''})? O valor total do contrato será recalculado automaticamente.`}
        confirmText="Sim, Excluir Serviço"
        cancelText="Cancelar"
        danger={true}
      />

      {/* ── Create Upsell Sale Modal ── */}
      {isUpsellModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px',
        }}>
          <form onSubmit={handleCreateUpsellSale} style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Gem size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                    Registrar Venda Adicional / Upsell
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
                    Cliente: {client.birthdayPersonName || client.name} ({client.code})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUpsellModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer', padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Título do Serviço */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                Item / Serviço Contratado *
              </label>
              <input
                type="text"
                value={upsellTitle}
                onChange={(e) => setUpsellTitle(e.target.value)}
                placeholder="Ex: Cabine 360 Graus, Coreografia Especial, Open Bar..."
                required
                style={{
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  color: 'var(--adm-text-title)',
                  fontSize: '0.82rem',
                }}
              />
            </div>

            {/* Categoria & Valor */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                  Categoria *
                </label>
                <select
                  value={upsellCategory}
                  onChange={(e) => setUpsellCategory(e.target.value)}
                  style={{
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '8px',
                    padding: '9px 10px',
                    color: 'var(--adm-text-title)',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  <option value="foto_video">Foto & Vídeo</option>
                  <option value="atracoes">Atrações & Shows</option>
                  <option value="bar_bebidas">Bebidas & Bar</option>
                  <option value="decoracao">Decoração & Efeitos</option>
                  <option value="estrutura">Estrutura & Horas Extras</option>
                  <option value="alimentacao">Gastronomia & Extras</option>
                  <option value="outro">Outro Serviço</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                  Valor da Venda (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={upsellValue}
                  onChange={(e) => setUpsellValue(e.target.value)}
                  placeholder="0,00"
                  required
                  style={{
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    color: 'var(--adm-text-title)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                  }}
                />
              </div>
            </div>

            {/* Data, Tipo de Pagamento & Parcelas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                  Data da Venda *
                </label>
                <input
                  type="date"
                  value={upsellDate}
                  onChange={(e) => setUpsellDate(e.target.value)}
                  required
                  style={{
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    color: 'var(--adm-text-title)',
                    fontSize: '0.80rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                  Tipo / Condição *
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <select
                    value={upsellPaymentType}
                    onChange={(e) => {
                      const newType = e.target.value as 'a_vista' | 'parcelado' | 'sinal';
                      setUpsellPaymentType(newType);
                      if (newType === 'a_vista' || newType === 'sinal') {
                        setUpsellPaymentStatus('pago');
                      } else {
                        setUpsellPaymentStatus('parcelado');
                      }
                    }}
                    style={{
                      flex: 1,
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      color: 'var(--adm-text-title)',
                      fontSize: '0.80rem',
                      cursor: 'pointer',
                      fontWeight: 700,
                    }}
                  >
                    <option value="a_vista">À Vista (Em Caixa)</option>
                    <option value="sinal">Sinal / Entrada</option>
                    <option value="parcelado">Parcelado (A Receber)</option>
                  </select>

                  {upsellPaymentType === 'parcelado' && (
                    <select
                      value={upsellInstallmentsCount}
                      onChange={(e) => setUpsellInstallmentsCount(Number(e.target.value) || 1)}
                      style={{
                        width: '70px',
                        background: 'var(--adm-bg-input)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '8px',
                        padding: '8px 6px',
                        color: 'var(--adm-text-title)',
                        fontSize: '0.80rem',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      {[2,3,4,5,6,7,8,9,10,12,15,18,24].map(n => (
                        <option key={n} value={n}>{n}x</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Forma de Pagamento & Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                  Forma de Pagamento
                </label>
                <select
                  value={upsellPaymentMethod}
                  onChange={(e) => setUpsellPaymentMethod(e.target.value)}
                  style={{
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    color: 'var(--adm-text-title)',
                    fontSize: '0.80rem',
                    cursor: 'pointer',
                  }}
                >
                  <option value="PIX">PIX</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Cartão Parcelado">Cartão Parcelado</option>
                  <option value="Boleto Bancário">Boleto Bancário</option>
                  <option value="Transferência / Ted">Transferência / Ted</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                  Status do Pagamento
                </label>
                <select
                  value={upsellPaymentStatus}
                  onChange={(e) => setUpsellPaymentStatus(e.target.value as any)}
                  style={{
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    color: 'var(--adm-text-title)',
                    fontSize: '0.80rem',
                    cursor: 'pointer',
                  }}
                >
                  <option value="pago">Pago / Quitado</option>
                  <option value="pendente">Pendente / A Cobrar</option>
                  <option value="parcelado">Parcelado</option>
                </select>
              </div>
            </div>

            {/* Responsável */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                Vendedor / Responsável
              </label>
              <select
                value={upsellResponsibleId}
                onChange={(e) => setUpsellResponsibleId(e.target.value)}
                style={{
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  color: 'var(--adm-text-title)',
                  fontSize: '0.80rem',
                  cursor: 'pointer',
                }}
              >
                <option value="">Selecione o colaborador...</option>
                {collaborators.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
                ))}
              </select>
            </div>

            {/* Observações */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                Observações / Detalhes Contratuais (Opcional)
              </label>
              <textarea
                value={upsellNotes}
                onChange={(e) => setUpsellNotes(e.target.value)}
                placeholder="Ex: Incluso 3 horas de operação com 2 monitores e adereços..."
                rows={2}
                style={{
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: 'var(--adm-text-title)',
                  fontSize: '0.80rem',
                  resize: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setIsUpsellModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--adm-text-muted)',
                  fontSize: '0.80rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{
                  background: '#10B981',
                  border: 'none',
                  color: '#FFF',
                  borderRadius: '8px',
                  padding: '9px 20px',
                  fontSize: '0.80rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                }}
              >
                Salvar Venda Adicional
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
