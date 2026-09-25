import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, Compass, PhoneCall, FileText, Gift,
  AlertCircle, Plus, Trash2, KeyRound, Tag, Target,
  QrCode, RefreshCw, CheckCircle2, Smartphone, Key, Copy, Check
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { uazapiService } from '../../services/uazapiService';
import { formatPhone } from '../../utils/phoneFormatter';
import type { Source, SourceType, FormField, FormFieldType, WhatsAppSubSource } from '../../types/sources';

interface AdminSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceToEdit?: Source | null;
}

const DEFAULT_FORM_FIELDS: FormField[] = [
  { id: 'name', label: 'Nome Completo', type: 'text', required: true, placeholder: 'Ex: Maria Silva' },
  { id: 'phone', label: 'WhatsApp', type: 'phone', required: true, placeholder: '(21) 99999-9999' },
  { id: 'eventDate', label: 'Data Prevista do Evento', type: 'date', required: false },
  { id: 'guestsCount', label: 'Estimativa de Convidados', type: 'number', required: false, placeholder: 'Ex: 150' },
  { id: 'notes', label: 'Observações / Como nos conheceu?', type: 'textarea', required: false, placeholder: 'Conte-nos um pouco sobre a sua festa...' },
];

export const AdminSourceModal: React.FC<AdminSourceModalProps> = ({
  isOpen,
  onClose,
  sourceToEdit,
}) => {
  const { venues, funnels, activeVenueId, addSource, updateSource } = useAdminState();

  const [name, setName] = useState('');
  const [venueId, setVenueId] = useState('');
  const [type, setType] = useState<SourceType>('form');
  const [funnelId, setFunnelId] = useState('');
  const [whatsappInstanceId, setWhatsappInstanceId] = useState('');
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // WhatsApp Live Connection State (QR Code + Pairing Code)
  const [connectionMode, setConnectionMode] = useState<'qrcode' | 'pairing_code'>('qrcode');
  const [pairingPhone, setPairingPhone] = useState('');
  const [pairingCodeData, setPairingCodeData] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [copiedPairingCode, setCopiedPairingCode] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [connectedPhone, setConnectedPhone] = useState<string>('');
  const [connectedProfileName, setConnectedProfileName] = useState<string>('');
  const [connectedAvatar, setConnectedAvatar] = useState<string>('');
  const pollIntervalRef = useRef<any>(null);

  // WhatsApp Sub-sources
  const [subSources, setSubSources] = useState<WhatsAppSubSource[]>([]);
  const [newSubName, setNewSubName] = useState('');
  const [newSubKeyword, setNewSubKeyword] = useState('');
  const [newSubFunnelId, setNewSubFunnelId] = useState('');

  // Form Specifics
  const [formTitle, setFormTitle] = useState('Solicite seu Orçamento');
  const [formDescription, setFormDescription] = useState('Preencha os dados abaixo e nossa equipe entrará em contato rapidamente.');
  const [formFields, setFormFields] = useState<FormField[]>(DEFAULT_FORM_FIELDS);
  const [successMessage, setSuccessMessage] = useState('Obrigado! Recebemos sua solicitação e entraremos em contato via WhatsApp.');
  const [buttonText, setButtonText] = useState('Enviar Solicitação');

  // Error & Submit State
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Limpa intervalo de polling ao desmontar
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Initialize or populate form
  useEffect(() => {
    if (isOpen) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setQrCodeData(null);
      setPairingCodeData(null);
      setIsConnecting(false);

      if (sourceToEdit) {
        setName(sourceToEdit.name || '');
        setVenueId(sourceToEdit.venueId || (venues[0]?.id || ''));
        setType(sourceToEdit.type || 'form');
        setFunnelId(sourceToEdit.funnelId || '');
        setWhatsappInstanceId(sourceToEdit.whatsappInstanceId || '');
        setSlug(sourceToEdit.slug || '');
        setStatus(sourceToEdit.status || 'active');

        const config = (sourceToEdit.configuration as any) || {};
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
        
        const availableFunnels = funnels.filter(f => !f.isPostSale && (!defaultVenue || f.venueId === defaultVenue || f.venueId === 'all'));
        const fallbackFunnel = availableFunnels[0]?.id || funnels.find(f => !f.isPostSale)?.id || funnels[0]?.id || '';

        setName('');
        setVenueId(defaultVenue);
        setType('whatsapp_api');
        setFunnelId(fallbackFunnel);
        setWhatsappInstanceId('');
        setSlug('');
        setStatus('active');
        setSubSources([]);
        setConnectedPhone('');
        setConnectedProfileName('');
        setConnectedAvatar('');
        setConnectionStatus('disconnected');
        setNewSubName('');
        setNewSubKeyword('');
        setNewSubFunnelId('');
        setFormTitle('Solicite seu Orçamento');
        setFormDescription('Preencha os dados abaixo e nossa equipe entrará em contato rapidamente.');
        setFormFields(DEFAULT_FORM_FIELDS);
        setSuccessMessage('Obrigado! Recebemos sua solicitação e entraremos em contato via WhatsApp.');
        setButtonText('Enviar Solicitação');
      }
      setErrorMsg('');
    }
  }, [isOpen, sourceToEdit, activeVenueId, venues, funnels]);

  // Agrupamento de Funis Comerciais e Pós-Venda
  const commercialFunnels = useMemo(() => {
    return funnels.filter(f => !f.isPostSale && f.category !== 'Pós-Venda' && !f.name?.toLowerCase().includes('pós-venda'));
  }, [funnels]);

  const postSaleFunnels = useMemo(() => {
    return funnels.filter(f => f.isPostSale || f.category === 'Pós-Venda' || f.name?.toLowerCase().includes('pós-venda'));
  }, [funnels]);

  // Handler para iniciar Conexão (QR Code ou Pairing Code) via UAZAPI
  const handleStartConnection = async (mode: 'qrcode' | 'pairing_code') => {
    if (!name.trim()) {
      setErrorMsg('Por favor, informe primeiro o Nome da Origem antes de conectar.');
      return;
    }

    if (mode === 'pairing_code') {
      const cleanPhone = pairingPhone.replace(/\D/g, '');
      if (!cleanPhone || cleanPhone.length < 10) {
        setErrorMsg('Informe o número de telefone com DDD para gerar o código de pareamento (ex: 21988459201).');
        return;
      }
    }

    setIsConnecting(true);
    setErrorMsg('');
    setPairingCodeData(null);
    setQrCodeData(null);

    try {
      let token = whatsappInstanceId.trim();

      // Se ainda não tem token de instância, cria no servidor UAZAPI
      if (!token && uazapiService.getAdminToken()) {
        const instanceName = `f5_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
        const created = await uazapiService.createInstance(instanceName);
        if (created.token) {
          token = created.token;
          setWhatsappInstanceId(token);
        }
      }

      if (!token) {
        token = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        setWhatsappInstanceId(token);
      }

      // Prepara payload
      let cleanPhone = '';
      if (mode === 'pairing_code') {
        let rawPhone = pairingPhone.replace(/\D/g, '');
        if (rawPhone.length === 10 || rawPhone.length === 11) {
          rawPhone = `55${rawPhone}`;
        }
        cleanPhone = rawPhone;
      }

      // Inicia a conexão
      const connectRes = await uazapiService.connectInstance(token, {
        phone: cleanPhone || undefined,
        browser: 'auto',
        systemName: name || 'F5 System',
      });

      if (connectRes.status === 'connected' || connectRes.loggedIn) {
        setConnectionStatus('connected');
        setQrCodeData(null);
        setPairingCodeData(null);
        if (connectRes.instance?.owner) setConnectedPhone(connectRes.instance.owner);
        if (connectRes.instance?.profileName) setConnectedProfileName(connectRes.instance.profileName);
        if (connectRes.instance?.profilePicUrl) setConnectedAvatar(connectRes.instance.profilePicUrl);
        return;
      }

      if (connectRes.pairingCode) {
        setPairingCodeData(connectRes.pairingCode);
        setConnectionStatus('connecting');
      } else if (connectRes.qrcode) {
        setQrCodeData(connectRes.qrcode);
        setConnectionStatus('connecting');
      } else {
        setConnectionStatus('connecting');
      }

      // Polling de verificação de status a cada 2s
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      
      pollIntervalRef.current = setInterval(async () => {
        try {
          const statusRes = await uazapiService.getInstanceStatus(token);
          if (statusRes.status === 'connected' || statusRes.loggedIn) {
            clearInterval(pollIntervalRef.current);
            setConnectionStatus('connected');
            setQrCodeData(null);
            setPairingCodeData(null);
            if (statusRes.phone) setConnectedPhone(statusRes.phone);
            if (statusRes.profileName) setConnectedProfileName(statusRes.profileName);
            if (statusRes.profilePictureUrl) setConnectedAvatar(statusRes.profilePictureUrl);
          }
        } catch {
          // Ignora falhas transitórias
        }
      }, 2000);

    } catch (err: any) {
      console.warn('Conexão UAZAPI:', err);
      setErrorMsg(err.message || 'Falha ao iniciar conexão com a UAZAPI.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCopyPairingCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedPairingCode(true);
    setTimeout(() => setCopiedPairingCode(false), 2000);
  };

  const handleDisconnect = async () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (whatsappInstanceId) {
      await uazapiService.disconnectInstance(whatsappInstanceId).catch(() => {});
    }
    setConnectionStatus('disconnected');
    setQrCodeData(null);
    setPairingCodeData(null);
    setConnectedPhone('');
    setConnectedProfileName('');
    setConnectedAvatar('');
  };

  // Auto-generate slug when typing name for forms
  const handleNameChange = (val: string) => {
    setName(val);
    if (!sourceToEdit && !slug && type === 'form') {
      const generated = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setSlug(generated);
    }
  };

  const handleAddField = () => {
    const newField: FormField = {
      id: `custom_${Date.now()}`,
      label: 'Novo Campo',
      type: 'text',
      required: false,
      placeholder: 'Digite a resposta...',
    };
    setFormFields([...formFields, newField]);
  };

  const handleRemoveField = (fieldId: string) => {
    setFormFields(formFields.filter(f => f.id !== fieldId));
  };

  const handleUpdateField = (fieldId: string, updates: Partial<FormField>) => {
    setFormFields(formFields.map(f => f.id === fieldId ? { ...f, ...updates } : f));
  };

  const handleAddSubSource = () => {
    if (!newSubName.trim()) {
      setErrorMsg('Informe o nome da sub-origem (ex: Instagram, Google Ads, TikTok).');
      return;
    }
    if (!newSubKeyword.trim()) {
      setErrorMsg('Informe a palavra-chave ou frase de identificação da primeira mensagem.');
      return;
    }

    const sub: WhatsAppSubSource = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: newSubName.trim(),
      keyword: newSubKeyword.trim().toLowerCase(),
      funnelId: newSubFunnelId || undefined,
    };

    setSubSources(prev => [...prev, sub]);
    setNewSubName('');
    setNewSubKeyword('');
    setNewSubFunnelId('');
    setErrorMsg('');
  };

  const handleRemoveSubSource = (subId: string) => {
    setSubSources(prev => prev.filter(s => s.id !== subId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Por favor, informe o nome da origem.');
      return;
    }
    if (!venueId) {
      setErrorMsg('Selecione uma Casa de Festa obrigatória.');
      return;
    }

    if (type === 'form' && !slug.trim()) {
      setErrorMsg('Informe um slug único para a URL pública do formulário.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formattedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');

      const configuration = {
        ...(type === 'whatsapp_api' ? {
          instanceName: whatsappInstanceId,
          connectedPhone,
          connectedProfileName,
          connectedAvatar,
          subSources
        } : {}),
        ...(type === 'form' ? { title: formTitle, description: formDescription, fields: formFields, successMessage, buttonText } : {}),
        ...(type === 'referral' ? { systemManaged: true } : {}),
      };

      if (sourceToEdit) {
        await updateSource(sourceToEdit.id, {
          name: name.trim(),
          venueId,
          type,
          funnelId,
          whatsappInstanceId: whatsappInstanceId || undefined,
          status,
          slug: type === 'form' ? formattedSlug : undefined,
          configuration,
        });
      } else {
        await addSource({
          name: name.trim(),
          venueId,
          type,
          funnelId,
          whatsappInstanceId: whatsappInstanceId || undefined,
          status,
          slug: type === 'form' ? formattedSlug : undefined,
          configuration,
        });
      }

      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Ocorreu um erro ao salvar a origem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="adm-modal-overlay" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px',
    }}>
      <div className="adm-modal-content" style={{
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '740px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.4)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        
        {/* Modal Header */}
        <div style={{
          padding: '24px 24px 18px 24px',
          borderBottom: '1px solid var(--adm-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'var(--adm-accent-bg)',
              color: 'var(--adm-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Compass size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                {sourceToEdit ? 'Configurar Origem de Entrada' : 'Nova Origem de Leads'}
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', margin: '2px 0 0 0' }}>
                Conecte WhatsApp via QR Code ou crie formulários com roteamento para Funil Comercial ou Pós-Venda.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {errorMsg && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#EF4444',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Tipo de Origem */}
          {/* 1. Seleção do Tipo de Origem ou Banner de Indicação Nativa */}
          {type === 'referral' ? (
            <div style={{
              background: 'linear-gradient(135deg, rgba(20, 169, 215, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)',
              border: '1.5px solid rgba(20, 169, 215, 0.35)',
              borderRadius: '14px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--adm-accent)', fontWeight: 800, fontSize: '0.88rem' }}>
                <Gift size={18} />
                <span>Origem Nativa • Indicações no App (Aniversariantes & Debutantes)</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--adm-text-muted)', lineHeight: '1.45' }}>
                Esta é uma origem padrão gerenciada automaticamente pelo sistema para a unidade selecionada.
                O nome e tipo são protegidos. <strong>Configure abaixo apenas o Funil de Destino</strong> para onde os leads indicados serão enviados.
              </p>
            </div>
          ) : (
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: '8px' }}>
                Tipo de Origem
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Formulário Público */}
                <div
                  onClick={() => setType('form')}
                  style={{
                    padding: '16px 14px',
                    borderRadius: '14px',
                    border: type === 'form' ? '2px solid var(--adm-accent)' : '1px solid var(--adm-border)',
                    background: type === 'form' ? 'var(--adm-accent-bg)' : 'var(--adm-bg-input)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: type === 'form' ? 'var(--adm-accent)' : 'var(--adm-text-title)', fontWeight: 800, fontSize: '0.86rem' }}>
                      <FileText size={18} />
                      <span>Formulário Público</span>
                    </div>
                    <span style={{ fontSize: '0.66rem', fontWeight: 800, padding: '2px 6px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                      Landing Page
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', lineHeight: '1.35' }}>
                    Página de captura pública ou link compartilhável para orçamentos e leads externos.
                  </div>
                </div>

                {/* WhatsApp API (UAZAPI Conexão Direta) */}
                <div
                  onClick={() => setType('whatsapp_api')}
                  style={{
                    padding: '16px 14px',
                    borderRadius: '14px',
                    border: type === 'whatsapp_api' ? '2px solid #10B981' : '1px solid var(--adm-border)',
                    background: type === 'whatsapp_api' ? 'rgba(16, 185, 129, 0.12)' : 'var(--adm-bg-input)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: type === 'whatsapp_api' ? '#10B981' : 'var(--adm-text-title)', fontWeight: 800, fontSize: '0.86rem' }}>
                      <PhoneCall size={18} />
                      <span>WhatsApp API (UAZAPI)</span>
                    </div>
                    <span style={{ fontSize: '0.66rem', fontWeight: 800, padding: '2px 6px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      QR Code Live
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', lineHeight: '1.35' }}>
                    Conexão direta de número comercial via QR Code, mensagens e rastreio automático.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. Casa de Festa e Funil Padrão (Obrigatórios) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: '6px' }}>
                Casa de Festa (Unidade) <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                value={venueId}
                disabled={type === 'referral'}
                onChange={(e) => {
                  setVenueId(e.target.value);
                  const newVenueFunnels = funnels.filter(f => f.venueId === e.target.value || f.venueId === 'all');
                  if (newVenueFunnels.length > 0 && !newVenueFunnels.some(f => f.id === funnelId)) {
                    setFunnelId(newVenueFunnels[0].id);
                  }
                }}
                className="adm-input"
                style={{
                  width: '100%',
                  height: '42px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  opacity: type === 'referral' ? 0.7 : 1,
                  cursor: type === 'referral' ? 'not-allowed' : 'pointer'
                }}
                required
              >
                {venues.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: type === 'referral' ? 'var(--adm-accent)' : 'var(--adm-text-title)', marginBottom: '6px' }}>
                {type === 'referral' ? 'Funil de Destino dos Leads Indicados *' : 'Funil de Destino (Opcional)'}
              </label>
              <select
                value={funnelId}
                onChange={(e) => setFunnelId(e.target.value)}
                className="adm-input"
                style={{
                  width: '100%',
                  height: '42px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  borderColor: 'var(--adm-accent)',
                  boxShadow: type === 'referral' ? '0 0 0 1.5px rgba(20, 169, 215, 0.35)' : 'none'
                }}
              >
                <option value="">-- Sem Funil Vinculado (Definir Depois) --</option>
                {commercialFunnels.length > 0 && (
                  <optgroup label="💼 Funis Comerciais (Vendas)">
                    {commercialFunnels.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="🌟 Pós-Venda (Sucesso do Cliente)">
                  {postSaleFunnels.length > 0 ? (
                    postSaleFunnels.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))
                  ) : (
                    <option value="post_sale_default">👑 Sucesso do Cliente (Pós-Venda Padrão)</option>
                  )}
                </optgroup>
              </select>
            </div>
          </div>

          {/* 3. Nome da Origem e Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--adm-text-title)', marginBottom: '6px' }}>
                Nome da Origem <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                disabled={type === 'referral'}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={type === 'whatsapp_api' ? 'Ex: WhatsApp Comercial Barra' : 'Ex: Formulário Site Oficial'}
                className="adm-input"
                style={{
                  width: '100%',
                  height: '42px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  opacity: type === 'referral' ? 0.7 : 1,
                  cursor: type === 'referral' ? 'not-allowed' : 'text'
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--adm-text-title)', marginBottom: '6px' }}>
                Status da Origem
              </label>
              <select
                value={status}
                disabled={type === 'referral'}
                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                className="adm-input"
                style={{
                  width: '100%',
                  height: '42px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  opacity: type === 'referral' ? 0.7 : 1,
                  cursor: type === 'referral' ? 'not-allowed' : 'pointer'
                }}
              >
                <option value="active">Ativa (Recebendo)</option>
                <option value="inactive">Inativa (Pausada)</option>
              </select>
            </div>
          </div>

          {/* 4. Configuração Específica: WhatsApp API com Pareamento por QR Code */}
          {type === 'whatsapp_api' && (
            <div style={{
              background: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
              borderRadius: '16px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--adm-text-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PhoneCall size={16} color="#10B981" />
                  <span>Conexão WhatsApp (UAZAPI)</span>
                </div>
                {connectionStatus === 'connected' ? (
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.2)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.4)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={13} />
                    <span>Conectado</span>
                  </span>
                ) : (
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '8px', background: 'rgba(234, 179, 8, 0.15)', color: '#EAB308', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                    Desconectado
                  </span>
                )}
              </div>

              {/* CARD DE CONEXÃO / QR CODE */}
              {connectionStatus === 'connected' ? (
                <div style={{
                  background: 'var(--adm-bg-card)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '14px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {connectedAvatar ? (
                      <img 
                        src={connectedAvatar} 
                        alt="WhatsApp Avatar" 
                        style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #10B981' }} 
                      />
                    ) : (
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Smartphone size={24} />
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                        {connectedProfileName || name || 'Sessão WhatsApp Ativa'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: 700, marginTop: '2px' }}>
                        📱 {formatPhone(connectedPhone || whatsappInstanceId) || 'Número Conectado'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDisconnect}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#EF4444',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Desconectar
                  </button>
                </div>
              ) : (
                <div style={{
                  background: 'var(--adm-bg-card)',
                  border: '1px dashed var(--adm-border)',
                  borderRadius: '14px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '16px',
                  textAlign: 'center',
                }}>
                  {/* Seletor de Modo */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setConnectionMode('qrcode');
                        setPairingCodeData(null);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: connectionMode === 'qrcode' ? '1.5px solid #10B981' : '1px solid var(--adm-border)',
                        background: connectionMode === 'qrcode' ? 'rgba(16, 185, 129, 0.12)' : 'var(--adm-bg-input)',
                        color: connectionMode === 'qrcode' ? '#10B981' : 'var(--adm-text-body)',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <QrCode size={14} />
                      <span>QR Code</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setConnectionMode('pairing_code');
                        setQrCodeData(null);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: connectionMode === 'pairing_code' ? '1.5px solid #10B981' : '1px solid var(--adm-border)',
                        background: connectionMode === 'pairing_code' ? 'rgba(16, 185, 129, 0.12)' : 'var(--adm-bg-input)',
                        color: connectionMode === 'pairing_code' ? '#10B981' : 'var(--adm-text-body)',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <Key size={14} />
                      <span>Código de Pareamento</span>
                    </button>
                  </div>

                  {/* QR Code */}
                  {connectionMode === 'qrcode' && (
                    qrCodeData ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          background: '#FFFFFF',
                          padding: '12px',
                          borderRadius: '12px',
                          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                        }}>
                          <img 
                            src={qrCodeData.startsWith('data:') || qrCodeData.startsWith('http') ? qrCodeData : `data:image/png;base64,${qrCodeData}`} 
                            alt="QR Code WhatsApp" 
                            style={{ width: '180px', height: '180px', display: 'block' }} 
                          />
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-title)', fontWeight: 700 }}>
                          Abra o WhatsApp no seu celular &gt; Aparelhos Conectados &gt; Conectar Aparelho
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <RefreshCw size={12} className="spin" />
                          <span>Aguardando leitura da câmera...</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleStartConnection('qrcode')}
                          disabled={isConnecting}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--adm-text-muted)',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          Atualizar QR Code
                        </button>
                      </div>
                    ) : (
                      <>
                        <div style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '16px',
                          background: 'rgba(16, 185, 129, 0.12)',
                          color: '#10B981',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <QrCode size={26} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                            Parear WhatsApp via QR Code
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', maxWidth: '420px', marginTop: '3px' }}>
                            Clique no botão abaixo para gerar o QR Code oficial de autenticação.
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleStartConnection('qrcode')}
                          disabled={isConnecting}
                          className="adm-btn-primary"
                          style={{
                            height: '38px',
                            padding: '0 18px',
                            borderRadius: '10px',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: '#10B981',
                            color: '#FFFFFF',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          {isConnecting ? <RefreshCw size={14} className="spin" /> : <QrCode size={16} />}
                          <span>{isConnecting ? 'Gerando QR Code...' : 'Gerar QR Code de Conexão'}</span>
                        </button>
                      </>
                    )
                  )}

                  {/* Pairing Code */}
                  {connectionMode === 'pairing_code' && (
                    pairingCodeData ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '380px' }}>
                        <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-muted)' }}>
                          CÓDIGO DE PAREAMENTO DE 8 DÍGITOS
                        </div>
                        <div style={{
                          fontSize: '1.8rem',
                          fontWeight: 900,
                          letterSpacing: '4px',
                          fontFamily: 'monospace',
                          color: '#10B981',
                          background: 'rgba(16, 185, 129, 0.1)',
                          padding: '10px 20px',
                          borderRadius: '12px',
                          border: '2px dashed #10B981',
                        }}>
                          {pairingCodeData}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyPairingCode(pairingCodeData)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            border: '1px solid var(--adm-border)',
                            background: copiedPairingCode ? '#10B981' : 'var(--adm-bg-input)',
                            color: copiedPairingCode ? '#FFF' : 'var(--adm-text-body)',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {copiedPairingCode ? <Check size={13} /> : <Copy size={13} />}
                          <span>{copiedPairingCode ? 'Copiado!' : 'Copiar Código'}</span>
                        </button>
                        <div style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <RefreshCw size={12} className="spin" />
                          <span>No WhatsApp: Aparelhos conectados &gt; Conectar com número de telefone.</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '16px',
                          background: 'rgba(16, 185, 129, 0.12)',
                          color: '#10B981',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Key size={26} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                            Parear por Código (Telefone)
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', maxWidth: '420px', marginTop: '3px' }}>
                            Digite o número com DDD para receber o código numérico de 8 dígitos.
                          </div>
                        </div>

                        <input
                          type="text"
                          value={pairingPhone}
                          onChange={(e) => setPairingPhone(e.target.value)}
                          placeholder="Ex: (21) 98845-9201"
                          className="adm-input"
                          style={{ width: '220px', height: '38px', borderRadius: '8px', fontSize: '0.82rem', textAlign: 'center', fontWeight: 700 }}
                        />

                        <button
                          type="button"
                          onClick={() => handleStartConnection('pairing_code')}
                          disabled={isConnecting}
                          className="adm-btn-primary"
                          style={{
                            height: '38px',
                            padding: '0 18px',
                            borderRadius: '10px',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: '#10B981',
                            color: '#FFFFFF',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          {isConnecting ? <RefreshCw size={14} className="spin" /> : <Key size={16} />}
                          <span>{isConnecting ? 'Gerando Código...' : 'Gerar Código de Pareamento'}</span>
                        </button>
                      </>
                    )
                  )}
                </div>
              )}

              {/* Sub-origens Manager */}
              <div style={{
                background: 'var(--adm-bg-card)',
                border: '1px solid var(--adm-border)',
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--adm-text-title)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <KeyRound size={14} color="var(--adm-accent)" />
                      <span>Sub-origens com Palavras-chave & Roteamento por Funil</span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                      A primeira mensagem enviada pelo lead é lida automaticamente. Se contiver a palavra-chave, a sub-origem é atribuída e o lead vai para o funil configurado.
                    </div>
                  </div>
                </div>

                {/* Sub-sources List */}
                {subSources.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                    {subSources.map(sub => {
                      const subFunnel = funnels.find(f => f.id === sub.funnelId);
                      return (
                        <div
                          key={sub.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            background: 'var(--adm-bg-input)',
                            borderRadius: '10px',
                            border: '1px solid var(--adm-border)',
                            fontSize: '0.76rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600, color: 'var(--adm-text-title)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Tag size={12} color="var(--adm-text-title)" /> {sub.name}
                            </span>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '6px',
                              background: 'rgba(59, 130, 246, 0.12)',
                              color: '#3B82F6',
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              fontFamily: 'monospace'
                            }}>
                              "{sub.keyword}"
                            </span>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '6px',
                              background: 'rgba(212, 175, 55, 0.1)',
                              color: 'var(--adm-accent)',
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}>
                              <Target size={11} color="var(--adm-accent)" /> {subFunnel?.name || 'Funil Padrão da Origem'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveSubSource(sub.id)}
                            style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                            title="Remover sub-origem"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{
                    padding: '16px',
                    textAlign: 'center',
                    color: 'var(--adm-text-muted)',
                    fontSize: '0.74rem',
                    background: 'var(--adm-bg-input)',
                    borderRadius: '10px',
                    border: '1px dashed var(--adm-border)',
                  }}>
                    Nenhuma sub-origem cadastrada. Leads recebidos sem palavra-chave serão identificados apenas como <strong>WhatsApp</strong>.
                  </div>
                )}

                {/* Add Sub-source Form */}
                <div style={{
                  padding: '12px',
                  background: 'var(--adm-bg-input)',
                  borderRadius: '10px',
                  border: '1px solid var(--adm-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                    + Adicionar Nova Sub-origem
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1.5fr auto', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      placeholder="Ex: Instagram"
                      className="adm-input"
                      style={{ height: '34px', fontSize: '0.74rem', borderRadius: '6px' }}
                    />
                    <input
                      type="text"
                      value={newSubKeyword}
                      onChange={(e) => setNewSubKeyword(e.target.value)}
                      placeholder="Palavra-chave: ex: insta"
                      className="adm-input"
                      style={{ height: '34px', fontSize: '0.74rem', borderRadius: '6px' }}
                    />
                    <select
                      value={newSubFunnelId}
                      onChange={(e) => setNewSubFunnelId(e.target.value)}
                      className="adm-input"
                      style={{ height: '34px', fontSize: '0.74rem', borderRadius: '6px' }}
                    >
                      <option value="">Funil Padrão ({commercialFunnels.find(f => f.id === funnelId)?.name || postSaleFunnels.find(f => f.id === funnelId)?.name || 'Padrão'})</option>
                      {commercialFunnels.length > 0 && (
                        <optgroup label="💼 Funis Comerciais">
                          {commercialFunnels.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="🌟 Pós-Venda (Sucesso do Cliente)">
                        {postSaleFunnels.length > 0 ? (
                          postSaleFunnels.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))
                        ) : (
                          <option value="post_sale_default">👑 Sucesso do Cliente</option>
                        )}
                      </optgroup>
                    </select>
                    <button
                      type="button"
                      onClick={handleAddSubSource}
                      className="adm-btn-primary"
                      style={{ height: '34px', padding: '0 12px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, whiteSpace: 'nowrap' }}
                    >
                      <Plus size={14} />
                      <span>Adicionar</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. Configuração Específica: Formulário */}
          {type === 'form' && (
            <div style={{
              background: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--adm-text-title)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={16} color="var(--adm-accent)" />
                <span>Configuração do Formulário Público</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '4px' }}>
                    Título do Formulário
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Solicite seu Orçamento"
                    className="adm-input"
                    style={{ width: '100%', height: '38px', borderRadius: '8px', fontSize: '0.8rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '4px' }}>
                    Slug / Link do Form (/f/:slug) <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="orcamento-site"
                    className="adm-input"
                    style={{ width: '100%', height: '38px', borderRadius: '8px', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '4px' }}>
                  Descrição / Subtítulo
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Preencha os campos abaixo..."
                  className="adm-input"
                  style={{ width: '100%', height: '38px', borderRadius: '8px', fontSize: '0.8rem' }}
                />
              </div>

              {/* Campos do Formulário */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                    Campos do Formulário ({formFields.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddField}
                    style={{
                      background: 'var(--adm-accent)',
                      color: '#000',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Plus size={12} />
                    <span>Adicionar Campo</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {formFields.map((field) => (
                    <div
                      key={field.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px',
                        background: 'var(--adm-bg-card)',
                        borderRadius: '8px',
                        border: '1px solid var(--adm-border)',
                      }}
                    >
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                        placeholder="Rótulo do campo"
                        className="adm-input"
                        style={{ flex: 2, height: '32px', fontSize: '0.74rem', borderRadius: '6px' }}
                      />
                      <select
                        value={field.type}
                        onChange={(e) => handleUpdateField(field.id, { type: e.target.value as FormFieldType })}
                        className="adm-input"
                        style={{ flex: 1, height: '32px', fontSize: '0.74rem', borderRadius: '6px' }}
                      >
                        <option value="text">Texto</option>
                        <option value="phone">WhatsApp</option>
                        <option value="email">E-mail</option>
                        <option value="date">Data</option>
                        <option value="number">Número</option>
                        <option value="textarea">Área de Texto</option>
                      </select>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: 'var(--adm-text-muted)', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => handleUpdateField(field.id, { required: e.target.checked })}
                        />
                        Obrigatório
                      </label>
                      {formFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveField(field.id)}
                          style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: '0.72rem', color: 'var(--adm-accent)', background: 'var(--adm-accent-bg)', padding: '8px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={13} color="var(--adm-accent)" />
                <span>URL pública do Formulário: <strong>{typeof window !== 'undefined' ? window.location.origin : ''}/f/{slug || 'seu-form'}</strong></span>
              </div>
            </div>
          )}

          {/* 6. Configuração Específica: Indicação */}
          {type === 'referral' && (
            <div style={{
              background: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--adm-text-title)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Gift size={16} color="var(--adm-accent)" />
                <span>Origem Nativa de Indicações das Debutantes</span>
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)', lineHeight: '1.4' }}>
                Todos os novos leads gerados pelas aniversariantes desta casa entrarão automaticamente no <strong>Funil de Destino</strong> selecionado acima.
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            paddingTop: '12px',
            borderTop: '1px solid var(--adm-border)',
          }}>
            <button
              type="button"
              onClick={onClose}
              className="adm-btn-secondary"
              style={{ padding: '10px 18px', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 700 }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="adm-btn-primary"
              style={{ padding: '10px 22px', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 800 }}
            >
              {isSubmitting ? 'Salvando...' : sourceToEdit ? 'Salvar Alterações' : 'Criar Origem'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
