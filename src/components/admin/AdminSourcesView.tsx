import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Compass, Plus, FileText, PhoneCall, Gift,
  Copy, Check, Code,
  CheckCircle2, XCircle, Search, Building2,
  Target, Zap, Crown, AlertTriangle, QrCode,
  RefreshCw, X
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { AdminSourceEditorView } from './AdminSourceEditorView';
import { AdminSourceEmbedModal } from './AdminSourceEmbedModal';
import { AdminWhatsAppConnectModal } from './AdminWhatsAppConnectModal';
import { AdminWhatsAppHistoryTriageModal } from './AdminWhatsAppHistoryTriageModal';
import { formatPhone } from '../../utils/phoneFormatter';
import { uazapiService } from '../../services/uazapiService';
import type { Source } from '../../types/sources';

export const AdminSourcesView: React.FC = () => {
  const { sources, venues, funnels, leads, activeVenueId, toggleSourceStatus, updateSource } = useAdminState();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [sourceToEdit, setSourceToEdit] = useState<Source | null>(null);
  const [embedModalSource, setEmbedModalSource] = useState<Source | null>(null);
  const [connectModalSource, setConnectModalSource] = useState<Source | null>(null);
  const [historyTriageSource, setHistoryTriageSource] = useState<Source | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Status em tempo real consultado diretamente na UAZAPI
  const [liveStatuses, setLiveStatuses] = useState<Record<string, {
    status: 'connected' | 'disconnected' | 'checking';
    phone?: string;
    profileName?: string;
    avatar?: string;
    lastChecked?: number;
  }>>({});
  const [isCheckingInstances, setIsCheckingInstances] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const isCheckingRef = useRef(false);

  const handleDirectDisconnect = async (source: Source, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Deseja realmente desconectar a sessão do WhatsApp "${source.name}"?`)) {
      return;
    }
    const token = source.whatsappInstanceId || (source.configuration as any)?.token || (source.configuration as any)?.instanceToken;
    setDisconnectingId(source.id);
    try {
      if (token) {
        await uazapiService.disconnectInstance(token).catch(() => {});
      }
    } catch (err) {
      console.warn('Erro ao desconectar instância:', err);
    }

    setLiveStatuses(prev => ({
      ...prev,
      [source.id]: { status: 'disconnected', lastChecked: Date.now() },
    }));

    updateSource(source.id, {
      status: 'inactive',
      configuration: {
        ...(source.configuration as any),
        connectedPhone: undefined,
        connectedProfileName: undefined,
        connectedAvatar: undefined,
        isConnected: false,
        connectionStatus: 'disconnected',
        disconnectedAt: new Date().toISOString(),
      },
    });
    setDisconnectingId(null);
  };

  // Verificação ativa de conexões com a UAZAPI para todas as instâncias de WhatsApp
  const checkAllWhatsAppInstances = async () => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;
    setIsCheckingInstances(true);

    try {
      const waSources = sources.filter(s => s.type === 'whatsapp_api');
      for (const src of waSources) {
        const config = (src.configuration as any) || {};
        const token = (src.whatsappInstanceId || config.instanceToken || config.token || config.instanceKey || '').trim();
        
        if (!token) {
          setLiveStatuses(prev => ({
            ...prev,
            [src.id]: { status: 'disconnected', lastChecked: Date.now() }
          }));
          continue;
        }

        setLiveStatuses(prev => ({
          ...prev,
          [src.id]: { ...(prev[src.id] || {}), status: 'checking' }
        }));

        try {
          const res = await uazapiService.getInstanceStatus(token);
          const isConnected = res.connected === true || res.status === 'connected' || res.loggedIn === true;
          const newStatus: 'connected' | 'disconnected' = isConnected ? 'connected' : 'disconnected';

          setLiveStatuses(prev => ({
            ...prev,
            [src.id]: {
              status: newStatus,
              phone: res.phone || config.connectedPhone,
              profileName: res.profileName || config.connectedProfileName,
              avatar: res.profilePictureUrl || config.connectedAvatar,
              lastChecked: Date.now(),
            }
          }));

          // Se o status retornado diferir do persistido no banco, atualiza no Supabase
          if (config.connectionStatus !== newStatus || config.isConnected !== isConnected) {
            updateSource(src.id, {
              configuration: {
                ...config,
                connectionStatus: newStatus,
                isConnected,
                connectedPhone: res.phone || config.connectedPhone,
                connectedProfileName: res.profileName || config.connectedProfileName,
                connectedAvatar: res.profilePictureUrl || config.connectedAvatar,
              }
            }).catch(() => {});
          }
        } catch (err) {
          console.warn(`[AdminSourcesView] Falha ao consultar status da instância ${src.name}:`, err);
          setLiveStatuses(prev => ({
            ...prev,
            [src.id]: { status: 'disconnected', lastChecked: Date.now() }
          }));
          if (config.connectionStatus !== 'disconnected' || config.isConnected !== false) {
            updateSource(src.id, {
              configuration: {
                ...config,
                connectionStatus: 'disconnected',
                isConnected: false,
              }
            }).catch(() => {});
          }
        }
      }
    } finally {
      setIsCheckingInstances(false);
      isCheckingRef.current = false;
    }
  };

  // Eliminação de polling contínuo para não extrapolar limites do Supabase/API.
  // As atualizações de desconexão/conexão ocorrem de forma passiva via Webhook Push da UAZAPI.
  useEffect(() => {
    // Checagem pontual única na montagem da tela se houver instâncias sem status
    checkAllWhatsAppInstances();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Função para contagem precisa e dinâmica de leads captados por origem
  const getSourceLeadCount = (src: Source): number => {
    const config = (src.configuration as any) || {};
    const rawConnectedPhone = (config.connectedPhone || src.whatsappInstanceId || '').replace(/\D/g, '');
    const cleanToken = (src.whatsappInstanceId || config.token || config.instanceToken || '').trim();

    const matchingLeads = (leads || []).filter(l => {
      // 1. Vínculo primário por ID da Origem
      if (l.sourceId === src.id) return true;

      // 2. Vínculo secundário inteligente por telefone do WhatsApp ou suborigem
      if (src.type === 'whatsapp_api') {
        const sub = (l.subSource || '').replace(/\D/g, '');
        if (rawConnectedPhone && sub && sub === rawConnectedPhone) return true;

        const waSender = ((l as any).whatsappSenderPhone || '').replace(/\D/g, '');
        if (rawConnectedPhone && waSender && waSender === rawConnectedPhone) return true;

        // Se nas anotações ou título consta explicitamente a instância
        const acts = l.activities || [];
        const hasAct = acts.some(a => {
          if (cleanToken && (a as any).instanceToken === cleanToken) return true;
          return false;
        });
        if (hasAct) return true;
      }

      return false;
    });

    return Math.max(matchingLeads.length, src.totalLeads || 0);
  };

  // Filter sources by active venue (from global switcher) or specific selection
  const activeVenue = useMemo(() => {
    return venues.find(v => v.id === activeVenueId) || null;
  }, [venues, activeVenueId]);

  const filteredSources = useMemo(() => {
    return sources.filter(s => {
      // 1. Filter by active venue if set
      if (activeVenueId && activeVenueId !== 'all' && activeVenueId !== 'multi') {
        if (s.venueId !== activeVenueId) return false;
      }

      // 2. Filter by Type
      if (selectedTypeFilter !== 'all' && s.type !== selectedTypeFilter) return false;

      // 3. Search term
      if (searchTerm.trim()) {
        const clean = searchTerm.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(clean);
        const matchesSlug = (s.slug || '').toLowerCase().includes(clean);
        const venueName = venues.find(v => v.id === s.venueId)?.name || '';
        const matchesVenue = venueName.toLowerCase().includes(clean);
        if (!matchesName && !matchesSlug && !matchesVenue) return false;
      }

      return true;
    });
  }, [sources, activeVenueId, selectedTypeFilter, searchTerm, venues]);

  // Aggregate Metrics (Dinâmicas e fiéis à realidade da pipeline)
  const totalSourcesCount = filteredSources.length;
  const activeSourcesCount = filteredSources.filter(s => s.status === 'active').length;
  const totalLeadsGenerated = filteredSources.reduce((acc, s) => acc + getSourceLeadCount(s), 0);
  const connectedWhatsAppCount = filteredSources.filter(s => {
    if (s.type !== 'whatsapp_api') return false;
    const live = liveStatuses[s.id];
    if (live) return live.status === 'connected';
    const conf = (s.configuration as any) || {};
    return conf.connectionStatus === 'connected' || (conf.connectedPhone && conf.isConnected !== false && conf.connectionStatus !== 'disconnected');
  }).length;

  const handleCopyLink = (source: Source) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://app.bonomofestas.com.br';
    const link = `${baseUrl}/f/${source.slug || source.id}`;

    navigator.clipboard.writeText(link);
    setCopiedId(source.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderTypeBadge = (type: Source['type']) => {
    switch (type) {
      case 'whatsapp_api':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <PhoneCall size={12} />
            <span>WhatsApp API</span>
          </span>
        );
      case 'form':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, background: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <FileText size={12} />
            <span>Formulário</span>
          </span>
        );
      case 'referral':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, background: 'var(--adm-accent-bg)', color: 'var(--adm-accent)', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
            <Gift size={12} />
            <span>Indicação no App</span>
          </span>
        );
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, background: 'rgba(100, 116, 139, 0.12)', color: '#94A3B8', border: '1px solid rgba(100, 116, 139, 0.3)' }}>
            <Compass size={12} />
            <span>{type}</span>
          </span>
        );
    }
  };

  // Se estiver em modo de edição/criação, renderiza a tela completa na Área de Conteúdo
  if (isEditing) {
    return (
      <AdminSourceEditorView
        sourceToEdit={sourceToEdit}
        onBack={() => {
          setIsEditing(false);
          setSourceToEdit(null);
        }}
        onSaved={() => {
          setIsEditing(false);
          setSourceToEdit(null);
        }}
      />
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      padding: '24px 32px 60px 32px',
      width: '100%',
      animation: 'fadeIn 0.25s ease-out',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      boxSizing: 'border-box',
    }}>
      <style>{`
        @keyframes pulsePendingAlert {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
          50% { transform: scale(1.03); box-shadow: 0 0 0 7px rgba(239, 68, 68, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>
      
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '14px',
            background: 'var(--adm-accent-bg)',
            border: '1.5px solid var(--adm-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--adm-accent)',
          }}>
            <Compass size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0, letterSpacing: '-0.4px' }}>
                Origens & Rastreamento de Leads
              </h1>
              {activeVenue && (
                <span style={{ background: 'var(--adm-accent-bg)', color: 'var(--adm-accent)', fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '8px', border: '1px solid rgba(212,175,55,0.3)' }}>
                  {activeVenue.name}
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
              Portas de entrada do CRM: Canais de WhatsApp Oficial, Formulários Públicos e Indicações de Debutantes
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setSourceToEdit(null);
            setIsEditing(true);
          }}
          className="adm-btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '12px',
            fontSize: '0.82rem',
            fontWeight: 800,
          }}
        >
          <Plus size={16} />
          <span>Criar Nova Origem</span>
        </button>
      </div>

      {/* ── 3 KPI Metric Cards (Focados exclusivamente em Resultados Reais) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
      }}>
        <div className="saas-card" style={{ background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '18px', padding: '18px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
            Origens Ativas
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--adm-text-title)', marginTop: '4px' }}>
            {activeSourcesCount} <span style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)', fontWeight: 600 }}>/ {totalSourcesCount} cadastradas</span>
          </div>
        </div>

        <div className="saas-card" style={{ background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '18px', padding: '18px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
            Total de Leads Captados
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--adm-accent)', marginTop: '4px' }}>
            {totalLeadsGenerated} <span style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)', fontWeight: 600 }}>oportunidades geradas</span>
          </div>
        </div>

        <div className="saas-card" style={{ background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '18px', padding: '18px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
            WhatsApp API Pareados
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#10B981', marginTop: '4px' }}>
            {connectedWhatsAppCount} <span style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)', fontWeight: 600 }}>instâncias online</span>
          </div>
        </div>
      </div>

      {/* ── Filters & Search Toolbar ─────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '16px',
        padding: '12px 18px',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '240px', maxWidth: '400px' }}>
          <Search size={16} color="var(--adm-text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, link ou casa..."
            className="adm-input"
            style={{ width: '100%', paddingLeft: '36px', height: '38px', borderRadius: '10px', fontSize: '0.8rem' }}
          />
        </div>

        {/* Type Filter Tabs & Verificação de Conexão */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'Todas' },
            { id: 'whatsapp_api', label: 'WhatsApp API' },
            { id: 'form', label: 'Formulários' },
            { id: 'referral', label: 'Indicações' },
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedTypeFilter(f.id)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: selectedTypeFilter === f.id ? '1px solid var(--adm-accent)' : '1px solid var(--adm-border)',
                background: selectedTypeFilter === f.id ? 'var(--adm-accent-bg)' : 'transparent',
                color: selectedTypeFilter === f.id ? 'var(--adm-accent)' : 'var(--adm-text-body)',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {f.label}
            </button>
          ))}

          <button
            type="button"
            onClick={checkAllWhatsAppInstances}
            disabled={isCheckingInstances}
            title="Consultar status de conexão em tempo real diretamente na UAZAPI"
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#10B981',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: isCheckingInstances ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <RefreshCw size={12} style={{ animation: isCheckingInstances ? 'spin 1s linear infinite' : 'none' }} />
            <span>{isCheckingInstances ? 'Verificando...' : 'Verificar Conexões'}</span>
          </button>
        </div>
      </div>

      {/* ── Sources Table ────────────────────────────────────────────────── */}
      <div className="saas-card" style={{
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '20px',
        overflow: 'hidden',
      }}>
        {filteredSources.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--adm-text-muted)' }}>
            <Compass size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
              Nenhuma origem encontrada
            </div>
            <div style={{ fontSize: '0.78rem', marginTop: '4px', maxWidth: '380px', margin: '4px auto 0 auto' }}>
              Conecte números de WhatsApp com sub-origens inteligentes, crie formulários públicos ou utilize as indicações nativas das debutantes.
            </div>
            <button
              type="button"
              onClick={() => {
                setSourceToEdit(null);
                setIsEditing(true);
              }}
              style={{
                marginTop: '16px',
                background: 'var(--adm-accent)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 20px',
                fontSize: '0.84rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(20, 169, 215, 0.3)',
              }}
            >
              <Plus size={16} />
              <span>Cadastrar Primeira Origem</span>
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: 'var(--adm-bg-input)', borderBottom: '1px solid var(--adm-border)' }}>
                  <th style={{ padding: '14px 18px', fontWeight: 800, color: 'var(--adm-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Origem</th>
                  <th style={{ padding: '14px 18px', fontWeight: 800, color: 'var(--adm-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Tipo</th>
                  <th style={{ padding: '14px 18px', fontWeight: 800, color: 'var(--adm-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Casa de Festa</th>
                  <th style={{ padding: '14px 18px', fontWeight: 800, color: 'var(--adm-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Funil Padrão</th>
                  <th style={{ padding: '14px 18px', fontWeight: 800, color: 'var(--adm-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Configuração</th>
                  <th style={{ padding: '14px 18px', fontWeight: 800, color: 'var(--adm-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '14px 18px', fontWeight: 800, color: 'var(--adm-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Leads Captados</th>
                  <th style={{ padding: '14px 18px', fontWeight: 800, color: 'var(--adm-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredSources.map((source: Source) => {
                  const venue = venues.find(v => v.id === source.venueId);
                  const funnel = funnels.find(f => f.id === source.funnelId);
                  const isCopied = copiedId === source.id;

                  // Estado de Conexão WhatsApp
                  const config = (source.configuration as any) || {};
                  const live = liveStatuses[source.id];
                  const rawPhone = live?.phone || config.connectedPhone || source.whatsappInstanceId || '';
                  const isExplicitlyDisconnected = config.isConnected === false || source.status === 'inactive' || config.connectionStatus === 'disconnected';
                  const effectiveStatus = live ? live.status : (isExplicitlyDisconnected ? 'disconnected' : (config.connectedPhone ? 'connected' : 'disconnected'));
                  const isConnected = effectiveStatus === 'connected' && source.status === 'active';
                  const isChecking = effectiveStatus === 'checking';
                  const isDisconnected = effectiveStatus === 'disconnected' || !isConnected;
                  const displayName = live?.profileName || config.connectedProfileName || config.whatsappDisplayName || source.name;
                  const avatar = live?.avatar || config.connectedAvatar;
                  const hasNeverConnected = !config.connectedPhone && !source.whatsappInstanceId && !isConnected;

                  // Alertas de Pendência (Desconectada ou Sem Funil Padrão)
                  const hasMissingFunnel = !source.funnelId || !funnel;
                  const hasDisconnectionAlert = source.type === 'whatsapp_api' && (isDisconnected || !isConnected);
                  const hasAlert = hasMissingFunnel || hasDisconnectionAlert;

                  // Condição estrita de Status Ativado: Funil vinculado e WhatsApp 100% conectado
                  const isFullyActive = source.status === 'active' && !hasMissingFunnel && (source.type !== 'whatsapp_api' || isConnected);

                  return (
                    <tr
                      key={source.id}
                      onClick={() => {
                        setSourceToEdit(source);
                        setIsEditing(true);
                      }}
                      style={{
                        borderBottom: '1px solid var(--adm-border)',
                        transition: 'background 0.15s ease',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-input)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      title="Clique na origem para abrir a tela de edição e configurações"
                    >
                      {/* Nome & Slug com Símbolo de Alerta */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {hasAlert && (
                            <span 
                              title={
                                hasMissingFunnel && hasDisconnectionAlert
                                  ? "Atenção: Origem desconectada e sem funil comercial vinculado!"
                                  : hasMissingFunnel
                                    ? "Atenção: Origem sem funil comercial padrão vinculado!"
                                    : "Atenção: WhatsApp desconectado ou com falha de conexão!"
                              }
                              style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                flexShrink: 0,
                                animation: 'pulsePendingAlert 2s infinite ease-in-out',
                              }}
                            >
                              <AlertTriangle size={16} color="#EF4444" />
                            </span>
                          )}
                          <div>
                            <div style={{ fontWeight: 800, color: 'var(--adm-text-title)' }}>
                              {source.name}
                            </div>
                            {source.slug && source.type === 'form' && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', marginTop: '2px', fontFamily: 'monospace' }}>
                                /f/{source.slug}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Tipo */}
                      <td style={{ padding: '14px 18px' }}>
                        {renderTypeBadge(source.type)}
                      </td>

                      {/* Casa */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--adm-text-body)' }}>
                          <Building2 size={14} color="var(--adm-accent)" />
                          <span>{venue?.name || 'Geral'}</span>
                        </div>
                      </td>

                      {/* Funil de Destino */}
                      <td style={{ padding: '14px 18px' }}>
                        {source.funnelId && funnel ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 8px',
                            borderRadius: '8px',
                            background: 'rgba(212, 175, 55, 0.1)',
                            border: '1px solid rgba(212, 175, 55, 0.25)',
                            color: 'var(--adm-accent)',
                            fontWeight: 600,
                            fontSize: '0.72rem',
                          }}>
                            <Target size={12} color="var(--adm-accent)" /> {funnel.name}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSourceToEdit(source);
                              setIsEditing(true);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '5px 10px',
                              borderRadius: '8px',
                              background: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid #EF4444',
                              color: '#EF4444',
                              fontWeight: 800,
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              animation: 'pulsePendingAlert 2s infinite ease-in-out',
                            }}
                            title="Clique para vincular esta origem a um funil comercial"
                          >
                            <AlertTriangle size={13} color="#EF4444" />
                            <span>⚠️ Funil Pendente (Clique para vincular)</span>
                          </button>
                        )}
                      </td>

                      {/* Configuração & Sub-origens */}
                      <td style={{ padding: '14px 18px' }}>
                        {source.type === 'whatsapp_api' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {isChecking ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0' }}>
                                <RefreshCw size={13} color="#F59E0B" style={{ animation: 'spin 1s linear infinite' }} />
                                <span style={{ fontSize: '0.72rem', color: '#F59E0B', fontWeight: 700 }}>
                                  Verificando status com WhatsApp...
                                </span>
                              </div>
                            ) : isConnected ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {avatar ? (
                                  <img 
                                    src={avatar} 
                                    alt="WhatsApp" 
                                    style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #10B981' }} 
                                  />
                                ) : (
                                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Zap size={14} color="#10B981" />
                                  </div>
                                )}
                                <div>
                                  <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-title)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 6px #10B981' }} />
                                    {formatPhone(rawPhone) || rawPhone}
                                  </div>
                                  {displayName && (
                                    <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                                      {displayName}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <AlertTriangle size={14} color="#EF4444" />
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.74rem', color: '#EF4444', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />
                                    Desconectado
                                  </div>
                                  <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>
                                    {rawPhone ? (formatPhone(rawPhone) || rawPhone) : 'Sem número pareado'}
                                  </div>
                                </div>
                              </div>
                            )}

                          </div>
                        )}
                        {source.type === 'form' && (
                          <div style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <FileText size={12} color="var(--adm-accent)" /> {source.configuration?.fields?.length || 5} campos • Link público ativo
                          </div>
                        )}
                        {source.type === 'referral' && (
                          <div style={{ fontSize: '0.76rem', color: 'var(--adm-accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Crown size={12} color="var(--adm-accent)" /> App das Aniversariantes & Debutantes
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSourceStatus(source.id, !isFullyActive);
                            }}
                            style={{
                              border: 'none',
                              background: isFullyActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                              color: isFullyActive ? '#10B981' : '#64748B',
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              width: 'fit-content',
                            }}
                          >
                            {isFullyActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            <span>{isFullyActive ? 'Ativado' : 'Desativado'}</span>
                          </button>
                        </div>
                      </td>

                      {/* Leads Captados (Dinâmico em tempo real) */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 800, color: 'var(--adm-text-title)', fontSize: '0.85rem' }}>
                          {getSourceLeadCount(source)} leads
                        </div>
                      </td>

                      {/* Ações */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          {/* Botão de Conexão/Desconexão para WhatsApp */}
                          {source.type === 'whatsapp_api' && (() => {
                            // Estado 1: Primeira Conexão (Verde com QR Code "Conectar")
                            if (hasNeverConnected) {
                              return (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConnectModalSource(source);
                                  }}
                                  title="Primeira conexão: Ler QR Code ou Gerar Código de Pareamento"
                                  style={{
                                    background: 'rgba(16, 185, 129, 0.15)',
                                    border: '1px solid #10B981',
                                    color: '#10B981',
                                    cursor: 'pointer',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '0.74rem',
                                    fontWeight: 800,
                                    transition: 'all 0.15s ease',
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.25)'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)'}
                                >
                                  <QrCode size={13} />
                                  <span>Conectar</span>
                                </button>
                              );
                            }

                            // Estado 2: Desconectado / Queda de Sessão (Vermelho com QR Code "Reconectar")
                            if (isDisconnected) {
                              return (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConnectModalSource(source);
                                  }}
                                  title="WhatsApp desconectado: Clique para ler QR Code e reconectar"
                                  style={{
                                    background: '#EF4444',
                                    border: '1px solid #DC2626',
                                    color: '#FFFFFF',
                                    cursor: 'pointer',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '0.74rem',
                                    fontWeight: 800,
                                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                                    transition: 'all 0.15s ease',
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                >
                                  <QrCode size={13} />
                                  <span>Reconectar</span>
                                </button>
                              );
                            }

                            // Estado 3: Conectado (Desconectar com ícone X)
                            return (
                              <button
                                type="button"
                                disabled={disconnectingId === source.id}
                                onClick={(e) => handleDirectDisconnect(source, e)}
                                title="WhatsApp conectado: Clique para desconectar sessão"
                                style={{
                                  background: 'rgba(239, 68, 68, 0.08)',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  color: '#EF4444',
                                  cursor: 'pointer',
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  transition: 'all 0.15s ease',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                              >
                                <X size={13} color="#EF4444" />
                                <span>{disconnectingId === source.id ? 'Desconectando...' : 'Desconectar'}</span>
                              </button>
                            );
                          })()}

                          {/* Copiar Link & Embed (Apenas Formulários) */}
                          {source.type === 'form' && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyLink(source);
                                }}
                                title="Copiar link do formulário público"
                                className="adm-btn-secondary"
                                style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                {isCopied ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                                <span>{isCopied ? 'Copiado!' : 'Link'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEmbedModalSource(source);
                                }}
                                title="Gerar código Embed"
                                className="adm-btn-secondary"
                                style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Code size={13} />
                                <span>Embed</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Conexão WhatsApp */}
      <AdminWhatsAppConnectModal
        isOpen={!!connectModalSource}
        onClose={() => setConnectModalSource(null)}
        source={connectModalSource}
        onOpenHistoryTriage={() => setHistoryTriageSource(connectModalSource)}
      />

      {/* Modal de Triagem Pré-CRM de Histórico */}
      <AdminWhatsAppHistoryTriageModal
        isOpen={!!historyTriageSource}
        onClose={() => setHistoryTriageSource(null)}
        source={historyTriageSource}
      />

      {/* Modal de Código Embed */}
      <AdminSourceEmbedModal
        isOpen={!!embedModalSource}
        onClose={() => setEmbedModalSource(null)}
        source={embedModalSource}
      />
    </div>
  );
};

