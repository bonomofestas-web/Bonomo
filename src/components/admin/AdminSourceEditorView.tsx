import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ArrowLeft, Compass, PhoneCall, FileText,
  Plus, Trash2, Tag,
  QrCode, RefreshCw, CheckCircle2, Smartphone, Building2,
  Check, AlertTriangle, ShieldCheck, Target, Users
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { uazapiService } from '../../services/uazapiService';
import { AdminAddSubSourceModal } from './AdminAddSubSourceModal';
import { AdminWhatsAppConnectModal } from './AdminWhatsAppConnectModal';
import { formatPhone } from '../../utils/phoneFormatter';
import type { Source, SourceType, FormField, WhatsAppSubSource } from '../../types/sources';

interface AdminSourceEditorViewProps {
  sourceToEdit?: Source | null;
  onBack: () => void;
  onSaved: () => void;
}

const DEFAULT_FORM_FIELDS: FormField[] = [
  { id: 'name', label: 'Nome Completo', type: 'text', required: true, placeholder: 'Ex: Maria Silva' },
  { id: 'phone', label: 'WhatsApp', type: 'phone', required: true, placeholder: '(21) 99999-9999' },
  { id: 'eventDate', label: 'Data Prevista do Evento', type: 'date', required: false },
  { id: 'guestsCount', label: 'Estimativa de Convidados', type: 'number', required: false, placeholder: 'Ex: 150' },
  { id: 'notes', label: 'Observações / Como nos conheceu?', type: 'textarea', required: false, placeholder: 'Conte-nos um pouco sobre a sua festa...' },
];

export const AdminSourceEditorView: React.FC<AdminSourceEditorViewProps> = ({
  sourceToEdit,
  onBack,
  onSaved,
}) => {
  const { 
    sources, 
    venues, 
    funnels, 
    leads, 
    activeVenueId, 
    addSource, 
    updateSource, 
    deleteSource, 
    updateLeadData 
  } = useAdminState();

  // Active Source ID being edited (allows staying in edit view after creating to connect immediately)
  const [currentSourceId, setCurrentSourceId] = useState<string | null>(sourceToEdit?.id || null);
  const isEditMode = Boolean(currentSourceId || sourceToEdit);

  // General Fields
  const [name, setName] = useState('');
  const [venueId, setVenueId] = useState('');
  const [type, setType] = useState<SourceType>('whatsapp_api');
  const [funnelId, setFunnelId] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // WhatsApp Specifics
  const [whatsappDisplayName, setWhatsappDisplayName] = useState('');
  const [whatsappInstanceId, setWhatsappInstanceId] = useState('');
  const [subSources, setSubSources] = useState<WhatsAppSubSource[]>([]);
  const [isAddSubModalOpen, setIsAddSubModalOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  // WhatsApp Live Connection State (QR Code + Pairing Code)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [connectedPhone, setConnectedPhone] = useState<string>('');
  const [connectedProfileName, setConnectedProfileName] = useState<string>('');
  const [connectedAvatar, setConnectedAvatar] = useState<string>('');
  const pollIntervalRef = useRef<any>(null);

  // Form Specifics
  const [slug, setSlug] = useState('');
  const [formTitle, setFormTitle] = useState('Solicite seu Orçamento');
  const [formDescription, setFormDescription] = useState('Preencha os dados abaixo e nossa equipe entrará em contato rapidamente.');
  const [formFields, setFormFields] = useState<FormField[]>(DEFAULT_FORM_FIELDS);
  const [successMessage, setSuccessMessage] = useState('Obrigado! Recebemos sua solicitação e entraremos em contato via WhatsApp.');
  const [buttonText, setButtonText] = useState('Enviar Solicitação');

  // Error & Submit State
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Triagem de Leads da Origem e Exclusão Segura
  const [migrationTargetFunnelId, setMigrationTargetFunnelId] = useState<string>('');
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationSuccessMsg, setMigrationSuccessMsg] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Limpa intervalo de polling ao desmontar
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Initialize or populate form
  useEffect(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    if (sourceToEdit) {
      setCurrentSourceId(sourceToEdit.id);
      setName(sourceToEdit.name || '');
      setVenueId(sourceToEdit.venueId || (venues[0]?.id || ''));
      setType((sourceToEdit.type === 'form' ? 'form' : 'whatsapp_api'));
      setFunnelId(sourceToEdit.funnelId || '');
      setWhatsappInstanceId(sourceToEdit.whatsappInstanceId || '');
      setSlug(sourceToEdit.slug || '');
      setStatus(sourceToEdit.status || 'active');

      const config = (sourceToEdit.configuration as any) || {};
      setWhatsappDisplayName(config.whatsappDisplayName || sourceToEdit.name || '');
      setSubSources(config.subSources || []);
      setConnectedPhone(config.connectedPhone || '');
      setConnectedProfileName(config.connectedProfileName || '');
      setConnectedAvatar(config.connectedAvatar || '');
      if (config.connectedPhone || sourceToEdit.whatsappInstanceId) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }

      setFormTitle(config.title || 'Solicite seu Orçamento');
      setFormDescription(config.description || '');
      setFormFields(config.fields && config.fields.length > 0 ? config.fields : DEFAULT_FORM_FIELDS);
      setSuccessMessage(config.successMessage || 'Obrigado! Entraremos em contato.');
      setButtonText(config.buttonText || 'Enviar Solicitação');
    } else {
      const defaultVenue = (activeVenueId && activeVenueId !== 'all' && activeVenueId !== 'multi') 
        ? activeVenueId 
        : (venues[0]?.id || '');
      
      const availableFunnels = funnels.filter(f => !defaultVenue || f.venueId === defaultVenue || f.venueId === 'all');

      setCurrentSourceId(null);
      setName('');
      setVenueId(defaultVenue);
      setType('whatsapp_api');
      setFunnelId(availableFunnels[0]?.id || 'comercial');
      setWhatsappDisplayName('');
      setWhatsappInstanceId('');
      setSlug('');
      setStatus('active');
      setSubSources([]);
      setConnectedPhone('');
      setConnectedProfileName('');
      setConnectedAvatar('');
      setConnectionStatus('disconnected');
      setFormTitle('Solicite seu Orçamento');
      setFormDescription('Preencha os dados abaixo e nossa equipe entrará em contato rapidamente.');
      setFormFields(DEFAULT_FORM_FIELDS);
      setSuccessMessage('Obrigado! Recebemos sua solicitação e entraremos em contato via WhatsApp.');
      setButtonText('Enviar Solicitação');
    }
    setErrorMsg('');
    setSuccessMsg('');
  }, [sourceToEdit, activeVenueId, venues, funnels]);

  // Agrupamento de Funis
  const commercialFunnels = useMemo(() => {
    return funnels.filter(f => !f.isPostSale && f.category !== 'Pós-Venda' && !f.name?.toLowerCase().includes('pós-venda'));
  }, [funnels]);

  const postSaleFunnels = useMemo(() => {
    return funnels.filter(f => f.isPostSale || f.category === 'Pós-Venda' || f.name?.toLowerCase().includes('pós-venda'));
  }, [funnels]);

  // Lista de funis disponíveis para esta casa de festas
  const availableVenueFunnels = useMemo(() => {
    return funnels.filter(f => !venueId || f.venueId === venueId || f.venueId === 'all');
  }, [funnels, venueId]);

  // Leads captados por esta origem específica
  const originLeads = useMemo(() => {
    if (!currentSourceId) return [];
    const rawPhone = (connectedPhone || whatsappInstanceId || '').replace(/\D/g, '');
    return (leads || []).filter(l => {
      if (l.sourceId === currentSourceId) return true;
      if (type === 'whatsapp_api' && rawPhone) {
        const sub = (l.subSource || '').replace(/\D/g, '');
        if (sub && sub === rawPhone) return true;
        const waSender = ((l as any).whatsappSenderPhone || '').replace(/\D/g, '');
        if (waSender && waSender === rawPhone) return true;
      }
      return false;
    });
  }, [leads, currentSourceId, connectedPhone, whatsappInstanceId, type]);

  // Leads desta origem com funil indefinido ou não mapeado
  const undefinedFunnelLeads = useMemo(() => {
    return originLeads.filter(l => {
      if (!l.funnelId || l.funnelId.trim() === '') return true;
      return !funnels.some(f => f.id === l.funnelId);
    });
  }, [originLeads, funnels]);

  // Migração de leads com funil indefinido para um funil escolhido
  const handleMigrateUndefinedLeads = async () => {
    const targetId = migrationTargetFunnelId || funnelId || availableVenueFunnels[0]?.id;
    if (!targetId) {
      setErrorMsg('Selecione o funil de destino para migrar os leads.');
      return;
    }
    const targetFunnel = funnels.find(f => f.id === targetId);
    if (!targetFunnel) return;

    setIsMigrating(true);
    try {
      const initialStage = targetFunnel.stages?.[0]?.id || 'new_lead';
      for (const l of undefinedFunnelLeads) {
        updateLeadData(l.id, {
          funnelId: targetFunnel.id,
          stage: initialStage as any,
        });
      }
      setMigrationSuccessMsg(`✅ ${undefinedFunnelLeads.length} lead(s) migrado(s) com sucesso para o funil "${targetFunnel.name}"!`);
      setTimeout(() => setMigrationSuccessMsg(''), 5000);
    } catch (err: any) {
      console.error('Erro ao migrar leads:', err);
      setErrorMsg('Erro ao migrar leads.');
    } finally {
      setIsMigrating(false);
    }
  };

  // Migração de um lead individual para um funil específico
  const handleMigrateSingleLead = async (leadId: string, targetFId: string) => {
    const targetFunnel = funnels.find(f => f.id === targetFId);
    if (!targetFunnel) return;
    const initialStage = targetFunnel.stages?.[0]?.id || 'new_lead';
    updateLeadData(leadId, {
      funnelId: targetFunnel.id,
      stage: initialStage as any,
    });
  };

  // Exclusão segura da origem
  const handleDeleteSource = async () => {
    if (!currentSourceId) return;
    const confirmMsg = `Tem certeza que deseja excluir permanentemente a origem "${name}"?\nEsta ação não poderá ser desfeita.`;
    if (!window.confirm(confirmMsg)) return;

    setIsDeleting(true);
    try {
      await deleteSource(currentSourceId);
      onBack();
    } catch (err: any) {
      console.error('Erro ao excluir origem:', err);
      setErrorMsg(err.message || 'Erro ao excluir origem.');
      setIsDeleting(false);
    }
  };

  // Troca de tipo (WhatsApp vs Formulário) com reset gracioso
  const handleTypeChange = (newType: SourceType) => {
    if (newType === type) return;
    setType(newType);
    setErrorMsg('');
    setSuccessMsg('');

    if (newType === 'whatsapp_api') {
      setSlug('');
      setWhatsappDisplayName(name);
    } else if (newType === 'form') {
      const generated = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setSlug(generated);
    }
  };

  // Auto-slug para formulários
  const handleNameChange = (val: string) => {
    setName(val);
    if (!whatsappDisplayName) {
      setWhatsappDisplayName(val);
    }
    if (!currentSourceId && type === 'form') {
      const generated = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setSlug(generated);
    }
  };

  // Sub-origens
  const handleRemoveSubSource = (subId: string) => {
    setSubSources(prev => prev.filter(s => s.id !== subId));
  };

  // Salvar Origem (Criação ou Edição)
  const handleSaveOrigin = async (): Promise<string | null> => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim()) {
      setErrorMsg('Por favor, informe o Nome da Origem.');
      return null;
    }
    if (!venueId) {
      setErrorMsg('Selecione uma Casa de Festa.');
      return null;
    }
    if (!funnelId) {
      setErrorMsg('Selecione o Funil de Destino padrão.');
      return null;
    }

    if (type === 'form' && !slug.trim()) {
      setErrorMsg('Informe um slug único para a URL pública do formulário.');
      return null;
    }

    setIsSubmitting(true);

    try {
      const formattedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');

      const configuration = {
        ...(type === 'whatsapp_api' ? {
          whatsappDisplayName: whatsappDisplayName.trim() || name.trim(),
          instanceName: whatsappInstanceId,
          connectedPhone,
          connectedProfileName,
          connectedAvatar,
          subSources
        } : {}),
        ...(type === 'form' ? { title: formTitle, description: formDescription, fields: formFields, successMessage, buttonText } : {}),
      };

      let savedId = currentSourceId;

      if (currentSourceId) {
        await updateSource(currentSourceId, {
          name: name.trim(),
          venueId,
          type,
          funnelId,
          whatsappInstanceId: whatsappInstanceId || undefined,
          status,
          slug: type === 'form' ? formattedSlug : undefined,
          configuration,
        });
        setSuccessMsg('Origem atualizada com sucesso!');
      } else {
        const created = await addSource({
          name: name.trim(),
          venueId,
          type,
          funnelId,
          whatsappInstanceId: whatsappInstanceId || undefined,
          status,
          slug: type === 'form' ? formattedSlug : undefined,
          configuration,
        });
        savedId = (created as any)?.id || `src_${Date.now()}`;
        setCurrentSourceId(savedId);
        setSuccessMsg('Origem cadastrada com sucesso!');
      }

      setTimeout(() => setSuccessMsg(''), 4000);
      return savedId;
    } catch (err: any) {
      setErrorMsg(err?.message || 'Ocorreu um erro ao salvar a origem.');
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = await handleSaveOrigin();
    if (id) {
      onSaved();
    }
  };

  const handleDisconnect = async () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (whatsappInstanceId) {
      await uazapiService.disconnectInstance(whatsappInstanceId).catch(() => {});
    }
    setConnectionStatus('disconnected');
    setConnectedPhone('');
    setConnectedProfileName('');
    setConnectedAvatar('');

    if (currentSourceId) {
      updateSource(currentSourceId, {
        whatsappInstanceId: undefined,
        configuration: {
          whatsappDisplayName: whatsappDisplayName.trim() || name.trim(),
          instanceName: '',
          connectedPhone: '',
          connectedProfileName: '',
          connectedAvatar: '',
          subSources,
        }
      });
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '28px',
      padding: '32px 40px 80px 40px',
      width: '100%',
      maxWidth: '1200px',
      margin: '0 auto',
      animation: 'fadeIn 0.25s ease-out',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      boxSizing: 'border-box',
    }}>
      
      {/* ── Top Header Navigation ────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'var(--adm-bg-card)',
              border: '1.5px solid var(--adm-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--adm-text-title)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
            title="Voltar para a Lista de Origens"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.55rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0, letterSpacing: '-0.4px' }}>
                {currentSourceId ? `Editar Origem: ${name || 'Porta de Entrada'}` : 'Cadastrar Nova Origem'}
              </h1>
              <span style={{
                padding: '3px 10px',
                borderRadius: '8px',
                fontSize: '0.72rem',
                fontWeight: 800,
                background: type === 'whatsapp_api' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                color: type === 'whatsapp_api' ? '#10B981' : '#3B82F6',
                border: `1px solid ${type === 'whatsapp_api' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(59, 130, 246, 0.35)'}`,
              }}>
                {type === 'whatsapp_api' ? 'WhatsApp Oficial' : 'Formulário Web Público'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--adm-text-muted)' }}>
              Configure a porta de entrada de leads, destinação para os funis comerciais e vinculação da unidade.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              border: '1px solid var(--adm-border)',
              background: 'var(--adm-bg-card)',
              color: 'var(--adm-text-body)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Voltar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="adm-btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 22px',
              borderRadius: '12px',
              fontSize: '0.84rem',
              fontWeight: 800,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            <Check size={16} />
            <span>{isSubmitting ? 'Salvando...' : (currentSourceId ? 'Salvar Alterações' : 'Salvar Origem')}</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div style={{
          padding: '14px 18px',
          borderRadius: '12px',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid #EF4444',
          color: '#EF4444',
          fontSize: '0.82rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div style={{
          padding: '14px 18px',
          borderRadius: '12px',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid #10B981',
          color: '#10B981',
          fontSize: '0.82rem',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ── BLOCO 1: ESCOLHA DO TIPO (APENAS WHATSAPP OU FORMULÁRIO) ─────── */}
      <div style={{
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '20px',
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Compass size={18} color="var(--adm-accent)" />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
              1. Tipo de Canal de Entrada
            </h2>
          </div>
          {isEditMode && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '8px',
              background: 'rgba(100, 116, 139, 0.12)',
              border: '1px solid var(--adm-border)',
              color: 'var(--adm-text-muted)',
              fontSize: '0.72rem',
              fontWeight: 800,
            }}>
              🔒 Canal Definido (Tipo Fixo)
            </span>
          )}
        </div>

        {isEditMode ? (
          /* Modo Edição: O tipo é definitivo e não pode ser alternado */
          <div style={{
            padding: '18px 22px',
            borderRadius: '16px',
            border: `2px solid ${type === 'whatsapp_api' ? '#10B981' : '#3B82F6'}`,
            background: type === 'whatsapp_api' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(59, 130, 246, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: type === 'whatsapp_api' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
              color: type === 'whatsapp_api' ? '#10B981' : '#3B82F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {type === 'whatsapp_api' ? <PhoneCall size={22} /> : <FileText size={22} />}
            </div>
            <div>
              <div style={{ fontSize: '0.96rem', fontWeight: 800, color: type === 'whatsapp_api' ? '#10B981' : '#3B82F6' }}>
                {type === 'whatsapp_api' ? 'WhatsApp Oficial (Instância Conectada)' : 'Formulário Web Público'}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                O tipo de canal não pode ser alterado após a criação para manter a integridade dos leads, histórico e webhooks.
              </div>
            </div>
          </div>
        ) : (
          /* Modo Criação: Permite escolher livremente entre WhatsApp e Formulário */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {/* Card WhatsApp */}
            <div
              onClick={() => handleTypeChange('whatsapp_api')}
              style={{
                padding: '20px',
                borderRadius: '16px',
                border: `2px solid ${type === 'whatsapp_api' ? '#10B981' : 'var(--adm-border)'}`,
                background: type === 'whatsapp_api' ? 'rgba(16, 185, 129, 0.08)' : 'var(--adm-bg-input)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: type === 'whatsapp_api' ? 'rgba(16, 185, 129, 0.2)' : 'var(--adm-bg-card)',
                color: type === 'whatsapp_api' ? '#10B981' : 'var(--adm-text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <PhoneCall size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.94rem', fontWeight: 800, color: type === 'whatsapp_api' ? '#10B981' : 'var(--adm-text-title)' }}>
                  WhatsApp Oficial (QR Code / Pareamento)
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', marginTop: '4px', lineHeight: '1.4' }}>
                  Conexão direta de aparelho WhatsApp. Captura conversas, sincroniza foto de perfil e permite sub-origens por palavra-chave.
                </div>
              </div>
            </div>

            {/* Card Formulário */}
            <div
              onClick={() => handleTypeChange('form')}
              style={{
                padding: '20px',
                borderRadius: '16px',
                border: `2px solid ${type === 'form' ? '#3B82F6' : 'var(--adm-border)'}`,
                background: type === 'form' ? 'rgba(59, 130, 246, 0.08)' : 'var(--adm-bg-input)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: type === 'form' ? 'rgba(59, 130, 246, 0.2)' : 'var(--adm-bg-card)',
                color: type === 'form' ? '#3B82F6' : 'var(--adm-text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <FileText size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.94rem', fontWeight: 800, color: type === 'form' ? '#3B82F6' : 'var(--adm-text-title)' }}>
                  Formulário Web Público
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', marginTop: '4px', lineHeight: '1.4' }}>
                  Página pública com link e código embed para campanhas de tráfego pago, Instagram e landing pages.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── BLOCO 2: DADOS PRINCIPAIS DA ORIGEM ─────────────────────────── */}
      <div style={{
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '20px',
        padding: '28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={18} color="var(--adm-accent)" />
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
            2. Identificação, Casa de Festa & Funil de Destino
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: currentSourceId ? 'repeat(auto-fit, minmax(280px, 1fr))' : 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* Nome da Origem */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: '8px' }}>
              Nome da Origem *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex: Tráfego Pago Instagram, WhatsApp Comercial Barra, etc."
              className="adm-input"
              style={{
                width: '100%',
                height: '46px',
                borderRadius: '12px',
                fontSize: '0.86rem',
                padding: '0 16px',
                background: 'var(--adm-bg-input)',
                border: '1px solid var(--adm-border)',
                color: 'var(--adm-text-title)',
                boxSizing: 'border-box',
              }}
              required
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginTop: '5px' }}>
              Nome identificador para sua equipe comercial saber por onde o lead chegou.
            </div>
          </div>

          {/* Casa de Festa */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: '8px' }}>
              Casa de Festa Vinculada *
            </label>
            <select
              value={venueId}
              onChange={(e) => setVenueId(e.target.value)}
              className="adm-input"
              style={{
                width: '100%',
                height: '46px',
                borderRadius: '12px',
                fontSize: '0.86rem',
                padding: '0 16px',
                background: 'var(--adm-bg-input)',
                border: '1px solid var(--adm-border)',
                color: 'var(--adm-text-title)',
                boxSizing: 'border-box',
                cursor: 'pointer',
              }}
              required
            >
              <option value="" disabled>Selecione uma Casa de Festa...</option>
              {venues.map(v => (
                <option key={v.id} value={v.id}>🏰 {v.name}</option>
              ))}
            </select>
            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginTop: '5px' }}>
              Define a unidade responsável pelos leads que entrarem por este canal.
            </div>
          </div>

          {/* Funil de Destino Principal */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: '8px' }}>
              Funil de Destino Automático *
            </label>
            <select
              value={funnelId}
              onChange={(e) => setFunnelId(e.target.value)}
              className="adm-input"
              style={{
                width: '100%',
                height: '46px',
                borderRadius: '12px',
                fontSize: '0.86rem',
                padding: '0 16px',
                background: 'var(--adm-bg-input)',
                border: '1px solid var(--adm-border)',
                color: 'var(--adm-text-title)',
                boxSizing: 'border-box',
                cursor: 'pointer',
              }}
              required
            >
              <option value="" disabled>Selecione o Funil de Destino...</option>
              <optgroup label="🎯 Funis Comerciais">
                {commercialFunnels.map(f => (
                  <option key={f.id} value={f.id}>🎯 {f.name}</option>
                ))}
              </optgroup>
              <optgroup label="👑 Sucesso do Cliente (Pós-Venda)">
                {postSaleFunnels.length > 0 ? (
                  postSaleFunnels.map(f => (
                    <option key={f.id} value={f.id}>👑 {f.name}</option>
                  ))
                ) : (
                  <option value="post_sale_default">👑 Sucesso do Cliente (Pós-Venda Padrão)</option>
                )}
              </optgroup>
            </select>
            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginTop: '5px' }}>
              Novos leads serão inseridos na 1ª etapa deste funil imediatamente.
            </div>
          </div>

          {/* Status (Apenas na edição de uma origem já cadastrada) */}
          {currentSourceId && (
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: '8px' }}>
                Status da Origem
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '46px' }}>
                <button
                  type="button"
                  onClick={() => setStatus('active')}
                  style={{
                    flex: 1,
                    height: '100%',
                    borderRadius: '10px',
                    border: status === 'active' ? '1.5px solid #10B981' : '1px solid var(--adm-border)',
                    background: status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'var(--adm-bg-input)',
                    color: status === 'active' ? '#10B981' : 'var(--adm-text-muted)',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span>Ativa (Captando)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('inactive')}
                  style={{
                    flex: 1,
                    height: '100%',
                    borderRadius: '10px',
                    border: status === 'inactive' ? '1.5px solid #EF4444' : '1px solid var(--adm-border)',
                    background: status === 'inactive' ? 'rgba(239, 68, 68, 0.15)' : 'var(--adm-bg-input)',
                    color: status === 'inactive' ? '#EF4444' : 'var(--adm-text-muted)',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <span>Pausada / Inativa</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── BLOCO 3: SEÇÃO DE WHATSAPP (APELIDO, SUB-ORIGENS E CONEXÃO) ─── */}
      {type === 'whatsapp_api' && (
        <div style={{
          background: 'var(--adm-bg-card)',
          border: '1px solid var(--adm-border)',
          borderRadius: '20px',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Smartphone size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                  3. Configurações do WhatsApp
                </h2>
                <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                  Defina o apelido do WhatsApp no sistema e cadastre sub-origens por palavra-chave.
                </div>
              </div>
            </div>

            {/* Status Pill na Edição */}
            {currentSourceId && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '0.76rem',
                fontWeight: 800,
                background: connectionStatus === 'connected' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: connectionStatus === 'connected' ? '#10B981' : '#EF4444',
                border: `1px solid ${connectionStatus === 'connected' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: connectionStatus === 'connected' ? '#10B981' : '#EF4444' }} />
                <span>{connectionStatus === 'connected' ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}</span>
              </div>
            )}
          </div>

          {/* 1. Nome/Apelido do WhatsApp */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: '8px' }}>
              Apelido do WhatsApp no Sistema *
            </label>
            <input
              type="text"
              value={whatsappDisplayName}
              onChange={(e) => setWhatsappDisplayName(e.target.value)}
              placeholder="Ex: WhatsApp Comercial Principal, WhatsApp Recepção"
              className="adm-input"
              style={{
                width: '100%',
                maxWidth: '500px',
                height: '44px',
                borderRadius: '10px',
                fontSize: '0.84rem',
                padding: '0 14px',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginTop: '4px' }}>
              Como esse canal será exibido nas conversas do chat e nos relatórios.
            </div>
          </div>

          {/* 2. Sub-origens Inteligentes (Modal Popup) */}
          <div style={{
            borderTop: '1px solid var(--adm-border)',
            paddingTop: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Tag size={15} color="var(--adm-accent)" />
                  <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                    Sub-origens por Palavra-Chave (Opcional)
                  </h3>
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                  Rastreie campanhas e anúncios por palavra-chave na 1ª mensagem do lead.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddSubModalOpen(true)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--adm-border)',
                  background: 'var(--adm-accent-bg)',
                  color: 'var(--adm-accent)',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                  transition: 'all 0.15s ease',
                }}
              >
                <Plus size={14} />
                <span>Adicionar Sub-origem</span>
              </button>
            </div>

            {/* Lista de Sub-origens em Cards Limpos */}
            {subSources.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {subSources.map(sub => {
                  const subFunnel = funnels.find(f => f.id === sub.funnelId);
                  return (
                    <div
                      key={sub.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: 'var(--adm-bg-input)',
                        border: '1px solid var(--adm-border)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                          {sub.name}
                        </span>
                        <span style={{
                          fontSize: '0.72rem',
                          fontFamily: 'monospace',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'rgba(16, 185, 129, 0.12)',
                          color: '#10B981',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                        }}>
                          Palavra-chave: "{sub.keyword}"
                        </span>
                        <span style={{
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'var(--adm-accent-bg)',
                          color: 'var(--adm-accent)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}>
                          <Target size={11} /> {subFunnel?.name || 'Funil Padrão'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveSubSource(sub.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#EF4444',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title="Remover sub-origem"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px dashed var(--adm-border)',
                borderRadius: '10px',
                padding: '14px 18px',
                textAlign: 'center',
                fontSize: '0.76rem',
                color: 'var(--adm-text-muted)',
              }}>
                Nenhuma sub-origem cadastrada. Clique no botão <strong>+ Adicionar Sub-origem</strong> para mapear termos como "Instagram", "Reels" ou "Google".
              </div>
            )}
          </div>

          {/* 3. Área de Conexão WhatsApp (Apenas na Edição de Origem já Cadastrada) */}
          {currentSourceId && (
            <div style={{
              borderTop: '1px solid var(--adm-border)',
              paddingTop: '22px',
            }}>
              {connectionStatus === 'connected' ? (
                <div style={{
                  padding: '20px 24px',
                  borderRadius: '16px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1.5px solid rgba(16, 185, 129, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {connectedAvatar ? (
                      <img
                        src={connectedAvatar}
                        alt="WhatsApp Profile"
                        style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #10B981' }}
                      />
                    ) : (
                      <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.2rem' }}>
                        WA
                      </div>
                    )}

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                          {connectedProfileName || whatsappDisplayName || name || 'WhatsApp Oficial'}
                        </div>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: '#10B981', color: '#FFF' }}>
                          <ShieldCheck size={11} /> Conectado
                        </span>
                      </div>
                      <div style={{ fontSize: '0.84rem', color: '#10B981', fontWeight: 700, marginTop: '3px' }}>
                        📱 {formatPhone(connectedPhone) || 'Número Oficial Vinculado'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDisconnect}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '10px',
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#EF4444',
                      fontSize: '0.80rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <RefreshCw size={14} />
                    <span>Desconectar / Trocar Aparelho</span>
                  </button>
                </div>
              ) : (
                <div style={{
                  padding: '22px 24px',
                  borderRadius: '16px',
                  background: 'var(--adm-bg-input)',
                  border: '1px dashed var(--adm-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: 'rgba(234, 179, 8, 0.15)',
                      color: '#EAB308',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Smartphone size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                        WhatsApp Desconectado
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                        Conecte o aparelho com QR Code ou Código de Pareamento para começar a receber mensagens.
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsConnectModalOpen(true)}
                    className="adm-btn-primary"
                    style={{
                      padding: '10px 20px',
                      borderRadius: '10px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: '#10B981',
                      color: '#FFF',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <QrCode size={16} />
                    <span>Conectar WhatsApp Agora</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── BLOCO 3: SEÇÃO DE FORMULÁRIO (SE TYPE === 'form') ──────────── */}
      {type === 'form' && (
        <div style={{
          background: 'var(--adm-bg-card)',
          border: '1px solid var(--adm-border)',
          borderRadius: '20px',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#3B82F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <FileText size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                3. Configurações do Formulário Público
              </h2>
              <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                Personalize os campos de captura, slug da URL e textos da página de orçamento.
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '18px' }}>
            {/* Slug URL */}
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: '8px' }}>
                Slug da URL Pública *
              </label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', borderRadius: '12px', padding: '0 12px', height: '46px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', fontWeight: 600 }}>/f/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="orcamento-barra"
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--adm-text-title)',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    paddingLeft: '6px',
                  }}
                  required
                />
              </div>
            </div>

            {/* Título */}
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: '8px' }}>
                Título Principal do Formulário
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Solicite seu Orçamento"
                className="adm-input"
                style={{ width: '100%', height: '46px', borderRadius: '12px', fontSize: '0.84rem', padding: '0 14px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: '8px' }}>
              Descrição / Subtítulo
            </label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Preencha os dados abaixo para receber nossa proposta completa."
              className="adm-input"
              style={{ width: '100%', height: '42px', borderRadius: '10px', fontSize: '0.82rem', padding: '0 14px', boxSizing: 'border-box' }}
            />
          </div>

          {/* Mensagem de Sucesso & Texto do Botão */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: '8px' }}>
                Mensagem de Sucesso após Envio
              </label>
              <input
                type="text"
                value={successMessage}
                onChange={(e) => setSuccessMessage(e.target.value)}
                className="adm-input"
                style={{ width: '100%', height: '42px', borderRadius: '10px', fontSize: '0.82rem', padding: '0 14px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: '8px' }}>
                Texto do Botão de Envio
              </label>
              <input
                type="text"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                className="adm-input"
                style={{ width: '100%', height: '42px', borderRadius: '10px', fontSize: '0.82rem', padding: '0 14px', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── BLOCO 4: PAINEL DE TRIAGEM & ACOMPANHAMENTO DE LEADS (NA EDIÇÃO) ─── */}
      {currentSourceId && (
        <div style={{
          background: 'var(--adm-bg-card)',
          border: '1px solid var(--adm-border)',
          borderRadius: '20px',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'rgba(212, 175, 55, 0.15)',
                color: 'var(--adm-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Users size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                  {type === 'whatsapp_api' ? '4. Triagem & Leads Desta Origem' : '3. Triagem & Leads Desta Origem'}
                </h2>
                <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                  Acompanhe os leads captados por esta origem e direcione contatos que chegaram sem funil definido.
                </div>
              </div>
            </div>

            {/* Contadores Resumo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{
                padding: '6px 14px',
                borderRadius: '10px',
                background: 'var(--adm-bg-input)',
                border: '1px solid var(--adm-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', fontWeight: 700 }}>Total Captados:</span>
                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>{originLeads.length}</span>
              </div>

              <div style={{
                padding: '6px 14px',
                borderRadius: '10px',
                background: undefinedFunnelLeads.length > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                border: `1px solid ${undefinedFunnelLeads.length > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                color: undefinedFunnelLeads.length > 0 ? '#EF4444' : '#10B981',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700 }}>Sem Funil:</span>
                <span style={{ fontSize: '0.86rem', fontWeight: 900 }}>{undefinedFunnelLeads.length}</span>
              </div>
            </div>
          </div>

          {/* Feedback de Sucesso da Migração */}
          {migrationSuccessMsg && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid #10B981',
              color: '#10B981',
              fontSize: '0.80rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <CheckCircle2 size={16} />
              <span>{migrationSuccessMsg}</span>
            </div>
          )}

          {/* Se houver leads sem funil, exibe a barra de ação de migração */}
          {undefinedFunnelLeads.length > 0 ? (
            <div style={{
              padding: '18px 22px',
              borderRadius: '16px',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1.5px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={18} color="#F59E0B" />
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#F59E0B' }}>
                    {undefinedFunnelLeads.length} lead(s) aguardando direcionamento para um Funil Comercial
                  </span>
                </div>
              </div>

              {/* Ação em lote para migrar todos */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <select
                  value={migrationTargetFunnelId || funnelId || ''}
                  onChange={(e) => setMigrationTargetFunnelId(e.target.value)}
                  className="adm-input"
                  style={{
                    height: '42px',
                    borderRadius: '10px',
                    fontSize: '0.82rem',
                    padding: '0 14px',
                    background: 'var(--adm-bg-card)',
                    border: '1px solid var(--adm-border)',
                    color: 'var(--adm-text-title)',
                    minWidth: '220px',
                  }}
                >
                  <option value="" disabled>Escolha o funil de destino...</option>
                  <optgroup label="🎯 Funis Comerciais">
                    {commercialFunnels.map(f => (
                      <option key={f.id} value={f.id}>🎯 {f.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="👑 Sucesso do Cliente (Pós-Venda)">
                    {postSaleFunnels.map(f => (
                      <option key={f.id} value={f.id}>👑 {f.name}</option>
                    ))}
                  </optgroup>
                </select>

                <button
                  type="button"
                  onClick={handleMigrateUndefinedLeads}
                  disabled={isMigrating}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    background: '#10B981',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: isMigrating ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Target size={14} />
                  <span>{isMigrating ? 'Migrando leads...' : `Migrar ${undefinedFunnelLeads.length} Lead(s) para este Funil`}</span>
                </button>
              </div>

              {/* Tabela compacta dos leads indefinidos */}
              <div style={{
                maxHeight: '260px',
                overflowY: 'auto',
                border: '1px solid var(--adm-border)',
                borderRadius: '10px',
                background: 'var(--adm-bg-card)',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--adm-bg-input)', borderBottom: '1px solid var(--adm-border)' }}>
                      <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 800, color: 'var(--adm-text-muted)' }}>Lead</th>
                      <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 800, color: 'var(--adm-text-muted)' }}>WhatsApp / Telefone</th>
                      <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 800, color: 'var(--adm-text-muted)' }}>Chegada</th>
                      <th style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 800, color: 'var(--adm-text-muted)' }}>Ação Rápida</th>
                    </tr>
                  </thead>
                  <tbody>
                    {undefinedFunnelLeads.slice(0, 15).map(l => (
                      <tr key={l.id} style={{ borderBottom: '1px solid var(--adm-border)' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                          {l.name}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--adm-text-body)' }}>
                          {formatPhone(l.phone) || l.phone}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--adm-text-muted)' }}>
                          {new Date(l.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleMigrateSingleLead(l.id, migrationTargetFunnelId || funnelId || availableVenueFunnels[0]?.id)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              background: 'rgba(16, 185, 129, 0.15)',
                              border: '1px solid #10B981',
                              color: '#10B981',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Migrar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Nenhum lead com funil indefinido */
            <div style={{
              padding: '16px 20px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.82rem',
              fontWeight: 700,
            }}>
              <CheckCircle2 size={18} />
              <span>
                Todos os {originLeads.length} leads captados por esta origem estão devidamente vinculados aos seus funis comerciais!
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Botão Salvar Flutuante / Fixo no Rodapé ───────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        paddingTop: '16px',
        borderTop: '1px solid var(--adm-border)',
      }}>
        {/* Excluir Origem (Seguro, apenas na edição e não-referral) */}
        <div>
          {currentSourceId && sourceToEdit?.type !== 'referral' && (
            <button
              type="button"
              onClick={handleDeleteSource}
              disabled={isDeleting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 18px',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#EF4444',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                opacity: isDeleting ? 0.6 : 1,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
            >
              <Trash2 size={15} />
              <span>{isDeleting ? 'Excluindo...' : 'Excluir Origem'}</span>
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              border: '1px solid var(--adm-border)',
              background: 'var(--adm-bg-card)',
              color: 'var(--adm-text-body)',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="adm-btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 28px',
              borderRadius: '12px',
              fontSize: '0.86rem',
              fontWeight: 800,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            <Check size={16} />
            <span>{isSubmitting ? 'Salvando...' : (currentSourceId ? 'Salvar Alterações' : 'Salvar Origem')}</span>
          </button>
        </div>
      </div>

      <AdminAddSubSourceModal
        isOpen={isAddSubModalOpen}
        onClose={() => setIsAddSubModalOpen(false)}
        onAddSubSource={(sub) => setSubSources(prev => [...prev, sub])}
      />

      <AdminWhatsAppConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        source={currentSourceId ? (sources.find(s => s.id === currentSourceId) || sourceToEdit || null) : null}
        onConnected={() => {
          setIsConnectModalOpen(false);
          setConnectionStatus('connected');
        }}
      />

    </div>
  );
};
