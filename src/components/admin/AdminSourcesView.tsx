import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SourcesHealthPanel } from './SourcesHealthPanel';
import {
  Compass, Plus, FileText, Gift, ChevronRight, Search, RefreshCw,
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { AdminSourceEditorView } from './AdminSourceEditorView';
import { AdminSourceDetailView } from './AdminSourceDetailView';
import { SourceSparkline } from './SourceSparkline';
import { FunnelKindIcon, isPostSaleFunnel } from './FunnelKindIcon';
import { HeaderActions } from './HeaderActions';
import { AdminSourceEmbedModal } from './AdminSourceEmbedModal';
import { AdminWhatsAppConnectModal } from './AdminWhatsAppConnectModal';
import { isFinanceSource } from '../../utils/financeSource';
import { AdminWhatsAppSyncModal } from './AdminWhatsAppSyncModal';
import { formatPhone } from '../../utils/phoneFormatter';
import { uazapiService } from '../../services/uazapiService';
import { SmartVenueLogo } from '../common/SmartVenueLogo';
import { ChannelAvatar } from './ChannelBadge';
import { channelOfSource } from '../../utils/channels';
import { contactsOfSource, countByDay, getSourceConnection, leadsOfSource, type LiveSourceStatus } from '../../utils/sourceMetrics';
import type { Source } from '../../types/sources';
import type { Venue } from '../../types/admin';

type ScreenView = 'list' | 'detail' | 'edit';

export const AdminSourcesView: React.FC = () => {
  const { sources, venues, funnels, leads, activeVenueId, toggleSourceStatus, updateSource } = useAdminState();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  // Lista -> Detalhe (somente leitura) -> Editar. Nova origem vai direto ao editor.
  const [view, setView] = useState<ScreenView>('list');
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [sourceToEdit, setSourceToEdit] = useState<Source | null>(null);
  const [embedModalSource, setEmbedModalSource] = useState<Source | null>(null);
  const [connectModalSource, setConnectModalSource] = useState<Source | null>(null);
  const [historyTriageSource, setHistoryTriageSource] = useState<Source | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Status em tempo real consultado diretamente na UAZAPI
  const [liveStatuses, setLiveStatuses] = useState<Record<string, LiveSourceStatus & { lastChecked?: number }>>({});
  const [isCheckingInstances, setIsCheckingInstances] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const isCheckingRef = useRef(false);

  const handleDirectDisconnect = async (source: Source) => {
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
          console.warn(`[AdminSourcesView] Falha transitória ao consultar status da instância ${src.name}:`, err);
          // Não sobrescreve o banco com falso 'disconnected' em caso de oscilação transitória de rede
        }
      }
    } finally {
      setIsCheckingInstances(false);
      isCheckingRef.current = false;
    }
  };

  // Sem polling contínuo (limites do Supabase/API). Checagem pontual na montagem; o resto chega por webhook.
  useEffect(() => {
    checkAllWhatsAppInstances();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter sources by active venue (from global switcher) or specific selection
  const filteredSources = useMemo(() => {
    return sources.filter(s => {
      if (activeVenueId && activeVenueId !== 'all' && activeVenueId !== 'multi') {
        if (s.venueId !== activeVenueId) return false;
      }
      if (selectedTypeFilter !== 'all' && s.type !== selectedTypeFilter) return false;
      if (searchTerm.trim()) {
        const clean = searchTerm.toLowerCase();
        const phone = String((s.configuration as any)?.connectedPhone || '');
        const venueName = venues.find(v => v.id === s.venueId)?.name || '';
        const matches = s.name.toLowerCase().includes(clean)
          || (s.slug || '').toLowerCase().includes(clean)
          || phone.includes(clean.replace(/\D/g, '') || '§')
          || venueName.toLowerCase().includes(clean);
        if (!matches) return false;
      }
      return true;
    });
  }, [sources, activeVenueId, selectedTypeFilter, searchTerm, venues]);

  // Movimento por origem: contatos unicos e contatos novos por dia nos ultimos 7 dias (so dados ja carregados)
  const movement = useMemo(() => {
    const out: Record<string, { total: number; perDay: number[]; last7: number }> = {};
    for (const s of filteredSources) {
      const people = contactsOfSource(leadsOfSource(s, leads)).people;
      const perDay = countByDay(people.map(p => p.firstAt), 7);
      out[s.id] = { total: people.length, perDay, last7: perDay.reduce((a, b) => a + b, 0) };
    }
    return out;
  }, [filteredSources, leads]);

  // Uma lista so, por casa. Dentro de cada casa, as origens se dividem pelo FUNIL de origem: funil de pos-venda = Pos-venda;
  // todo o resto (inclusive formulario, indicacao e origem sem funil) entra como lead para fim comercial = Comercial.
  type VenueGroup = { venueId: string; venue: Venue | null; venueName: string; commercial: Source[]; postSale: Source[]; finance: Source[]; total: number; contacts: number };
  const venueGroups = useMemo(() => {
    const relevantVenues = venues.filter(v => {
      if (activeVenueId && activeVenueId !== 'all' && activeVenueId !== 'multi') return v.id === activeVenueId;
      return true;
    });
    const typeOrder = (s: Source) => (s.type === 'whatsapp_api' ? 0 : s.type === 'form' ? 1 : 2);
    const sortSources = (list: Source[]) => [...list].sort((a, b) => typeOrder(a) - typeOrder(b) || a.name.localeCompare(b.name));
    const isPostSaleSource = (s: Source) => isPostSaleFunnel(funnels.find(f => f.id === s.funnelId) || (s.funnelId === 'post_sale_default' ? { id: s.funnelId, isPostSale: true } : undefined));

    const build = (venueId: string, venue: Venue | null, venueName: string, list: Source[]): VenueGroup => ({
      venueId, venue, venueName,
      commercial: sortSources(list.filter(s => !isFinanceSource(s) && !isPostSaleSource(s))),
      postSale: sortSources(list.filter(s => !isFinanceSource(s) && isPostSaleSource(s))),
      finance: sortSources(list.filter(isFinanceSource)),
      total: list.length,
      contacts: list.reduce((acc, s) => acc + (movement[s.id]?.total || 0), 0),
    });

    const groups: VenueGroup[] = [];
    for (const v of relevantVenues) {
      const vSources = filteredSources.filter(s => s.venueId === v.id);
      if (vSources.length > 0) groups.push(build(v.id, v, v.name, vSources));
    }
    const unassigned = filteredSources.filter(s => !s.venueId || s.venueId === 'all' || !venues.some(v => v.id === s.venueId));
    if (unassigned.length > 0) groups.push(build('unassigned', null, 'Origens gerais', unassigned));
    return groups;
  }, [filteredSources, venues, funnels, activeVenueId, movement]);

  const connectedCount = filteredSources.filter(s => s.type === 'whatsapp_api' && getSourceConnection(s, liveStatuses[s.id]).isConnected).length;
  const whatsappCount = filteredSources.filter(s => s.type === 'whatsapp_api').length;
  const contacts7 = filteredSources.reduce((a, s) => a + (movement[s.id]?.last7 || 0), 0);

  const handleCopyLink = (source: Source) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://app.bonomofestas.com.br';
    navigator.clipboard.writeText(`${baseUrl}/f/${source.slug || source.id}`);
    setCopiedId(source.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openDetail = (source: Source) => { setSelectedSourceId(source.id); setView('detail'); };
  const openEditor = (source: Source | null) => { setSourceToEdit(source); setView('edit'); };

  const selectedSource = selectedSourceId ? sources.find(s => s.id === selectedSourceId) || null : null;

  const modals = (
    <>
      <AdminWhatsAppConnectModal
        isOpen={!!connectModalSource}
        onClose={() => setConnectModalSource(null)}
        source={connectModalSource}
        onOpenHistoryTriage={() => setHistoryTriageSource(connectModalSource)}
        onNavigateToEditSource={(sourceToOpen) => {
          setConnectModalSource(null);
          openEditor(sourceToOpen);
        }}
      />
      <AdminWhatsAppSyncModal isOpen={!!historyTriageSource} onClose={() => setHistoryTriageSource(null)} source={historyTriageSource} />
      <AdminSourceEmbedModal isOpen={!!embedModalSource} onClose={() => setEmbedModalSource(null)} source={embedModalSource} />
    </>
  );

  // ── Editor ───────────────────────────────────────────────────────────────
  if (view === 'edit') {
    const backTo = () => {
      const keep = sourceToEdit;
      setSourceToEdit(null);
      if (keep) { setSelectedSourceId(keep.id); setView('detail'); } else { setView('list'); }
    };
    return <AdminSourceEditorView sourceToEdit={sourceToEdit} onBack={backTo} onSaved={backTo} />;
  }

  // ── Detalhe (somente leitura) ────────────────────────────────────────────
  if (view === 'detail' && selectedSource) {
    return (
      <>
        <AdminSourceDetailView
          source={selectedSource}
          live={liveStatuses[selectedSource.id]}
          copied={copiedId === selectedSource.id}
          isDisconnecting={disconnectingId === selectedSource.id}
          onBack={() => { setView('list'); setSelectedSourceId(null); }}
          onEdit={() => openEditor(selectedSource)}
          onConnect={() => setConnectModalSource(selectedSource)}
          onSync={() => setHistoryTriageSource(selectedSource)}
          onDisconnect={() => handleDirectDisconnect(selectedSource)}
          onCopyLink={() => handleCopyLink(selectedSource)}
          onEmbed={() => setEmbedModalSource(selectedSource)}
          onToggleStatus={(active) => toggleSourceStatus(selectedSource.id, active)}
        />
        {modals}
      </>
    );
  }

  // ── Lista ────────────────────────────────────────────────────────────────
  const th: React.CSSProperties = { padding: '12px 18px', fontWeight: 800, color: 'var(--adm-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.4px' };

  const renderStatusPill = (source: Source) => {
    const conn = getSourceConnection(source, liveStatuses[source.id]);
    let text = source.status === 'active' ? 'Ativa' : 'Pausada';
    let color = source.status === 'active' ? '#10B981' : '#64748B';
    if (source.type === 'whatsapp_api') {
      if (conn.isChecking) { text = 'Verificando'; color = '#F59E0B'; }
      else if (conn.isConnected) { text = 'Conectado'; color = '#10B981'; }
      else { text = conn.hasNeverConnected ? 'Sem número' : 'Desconectado'; color = '#EF4444'; }
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 800, color, background: `${color}1F`, border: `1px solid ${color}55` }}>
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color }} /> {text}
      </span>
    );
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '18px', padding: '24px 32px 60px 32px', width: '100%',
      animation: 'fadeIn 0.25s ease-out', fontFamily: "'Plus Jakarta Sans', sans-serif", boxSizing: 'border-box',
    }}>
      <SourcesHealthPanel />

      <HeaderActions>
        <button
          type="button"
          onClick={() => openEditor(null)}
          className="adm-btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 800 }}
        >
          <Plus size={16} />
          <span>Nova origem</span>
        </button>
      </HeaderActions>

      {/* Resumo em uma linha */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ fontSize: '0.84rem', color: 'var(--adm-text-muted)', fontWeight: 600 }}>
          <strong style={{ color: 'var(--adm-text-title)' }}>{filteredSources.length}</strong> {filteredSources.length === 1 ? 'origem' : 'origens'}
          {whatsappCount > 0 && <> · <strong style={{ color: connectedCount === whatsappCount ? '#10B981' : '#F59E0B' }}>{connectedCount} de {whatsappCount}</strong> WhatsApps conectados</>}
          {' '}· <strong style={{ color: 'var(--adm-text-title)' }}>{contacts7}</strong> contatos novos em 7 dias
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} color="var(--adm-text-muted)" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar origem, número ou casa"
              className="adm-input"
              style={{ width: '260px', paddingLeft: '34px', height: '36px', borderRadius: '10px', fontSize: '0.8rem' }}
            />
          </div>
          {[{ id: 'all', label: 'Todas' }, { id: 'whatsapp_api', label: 'WhatsApp' }, { id: 'form', label: 'Formulários' }, { id: 'referral', label: 'Indicações' }].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedTypeFilter(f.id)}
              style={{
                padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.74rem', fontWeight: 700,
                border: selectedTypeFilter === f.id ? '1px solid var(--adm-accent)' : '1px solid var(--adm-border)',
                background: selectedTypeFilter === f.id ? 'var(--adm-accent-bg)' : 'transparent',
                color: selectedTypeFilter === f.id ? 'var(--adm-accent)' : 'var(--adm-text-body)',
              }}
            >
              {f.label}
            </button>
          ))}
          <button
            type="button"
            onClick={checkAllWhatsAppInstances}
            disabled={isCheckingInstances}
            title="Consultar a conexão dos WhatsApps agora"
            style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--adm-border)', background: 'transparent', color: 'var(--adm-text-muted)', cursor: isCheckingInstances ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: 700 }}
          >
            <RefreshCw size={12} style={{ animation: isCheckingInstances ? 'spin 1s linear infinite' : 'none' }} />
            {isCheckingInstances ? 'Verificando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      <div className="saas-card" style={{ background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '18px', overflow: 'hidden' }}>
        {filteredSources.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--adm-text-muted)' }}>
            <Compass size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>Nenhuma origem encontrada</div>
            <div style={{ fontSize: '0.78rem', margin: '4px auto 0 auto', maxWidth: '380px' }}>
              Conecte um número de WhatsApp, crie um formulário público ou use as indicações do app.
            </div>
            <button
              type="button"
              onClick={() => openEditor(null)}
              style={{ marginTop: '16px', background: 'var(--adm-accent)', color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '0.84rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Plus size={16} /> Cadastrar primeira origem
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: 'var(--adm-bg-input)', borderBottom: '1px solid var(--adm-border)' }}>
                  <th style={th}>Origem</th>
                  <th style={th}>Funil de origem</th>
                  <th style={th}>Situação</th>
                  <th style={th}>Últimos 7 dias</th>
                  <th style={{ ...th, width: '36px' }} />
                </tr>
              </thead>
              <tbody>
                {venueGroups.map((group, groupIndex) => {
                  const groupLogo = group.venue ? (group.venue.logoUrl || (group.venue as any)?.logo_url) : undefined;
                  return (
                    <React.Fragment key={group.venueId}>
                      {/* Casa de festa: logo, nome e total */}
                      <tr style={{ background: 'var(--adm-bg-input)', borderTop: groupIndex > 0 ? '2px solid var(--adm-border)' : 'none', borderBottom: '1px solid var(--adm-border)' }}>
                        <td colSpan={5} style={{ padding: '10px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <SmartVenueLogo src={groupLogo} alt={group.venueName} size={34} borderRadius={9} />
                              <span style={{ fontSize: '0.92rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>{group.venueName}</span>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>
                                {group.total} {group.total === 1 ? 'origem' : 'origens'}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>
                              {group.contacts} {group.contacts === 1 ? 'contato' : 'contatos'}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {[
                        { key: 'commercial', label: 'Comercial', postSale: false, list: group.commercial },
                        { key: 'post_sale', label: 'Pós-venda', postSale: true, list: group.postSale },
                        { key: 'finance', label: 'Financeiro (conexão fixa, único número do Financeiro)', postSale: false, list: group.finance },
                      ].filter(part => part.list.length > 0).map(part => (
                        <React.Fragment key={part.key}>
                          {/* Rotulo discreto do tipo de funil */}
                          <tr>
                            <td colSpan={5} style={{ padding: '7px 18px 3px 18px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.64rem', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--adm-text-muted)', opacity: 0.75 }}>
                                <FunnelKindIcon postSale={part.postSale} size={11} /> {part.label}
                              </span>
                            </td>
                          </tr>

                          {part.list.map(source => {
                            const conn = getSourceConnection(source, liveStatuses[source.id]);
                            const funnel = funnels.find(f => f.id === source.funnelId);
                            const mv = movement[source.id] || { total: 0, perDay: new Array(7).fill(0), last7: 0 };
                            const isWa = source.type === 'whatsapp_api';
                            const needsAttention = isWa && !conn.isChecking && !conn.isConnected;
                            const subtitle = isWa
                              ? (conn.rawPhone ? (formatPhone(conn.rawPhone) || conn.rawPhone) : 'Sem número conectado')
                              : source.type === 'form' ? `/f/${source.slug || ''}` : source.type === 'referral' ? 'Indicações do app' : 'Link rastreável';
                            const fColor = funnel ? (funnel.badgeColor || (funnel as any)?.color || '#D4AF37') : '#F59E0B';

                            return (
                              <tr
                                key={source.id}
                                onClick={() => openDetail(source)}
                                style={{ borderBottom: '1px solid var(--adm-border)', cursor: 'pointer', transition: 'background 0.15s ease', boxShadow: needsAttention ? 'inset 3px 0 0 #EF4444' : 'none' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-input)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <td style={{ padding: '13px 18px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                                    <ChannelAvatar size={36} channel={channelOfSource(source)}>
                                      {conn.avatar ? (
                                        <img src={conn.avatar} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                                      ) : (
                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--adm-bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                          {isWa ? <Compass size={17} color="var(--adm-text-muted)" /> : source.type === 'form' ? <FileText size={17} color="var(--adm-accent)" /> : <Gift size={17} color="#8B5CF6" />}
                                        </div>
                                      )}
                                    </ChannelAvatar>
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{ fontWeight: 800, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }} title={source.name}>
                                        {source.name}
                                      </div>
                                      <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>{subtitle}</div>
                                    </div>
                                  </div>
                                </td>

                                <td style={{ padding: '13px 18px' }}>
                                  {funnel ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.78rem', color: fColor }}>
                                      <FunnelKindIcon postSale={isPostSaleFunnel(funnel)} size={13} /> {funnel.name}
                                    </span>
                                  ) : isFinanceSource(source) ? (
                                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#0369A1' }}>Fixo do Financeiro</span>
                                  ) : (
                                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#F59E0B' }}>Sem funil</span>
                                  )}
                                </td>

                                <td style={{ padding: '13px 18px' }}>{renderStatusPill(source)}</td>

                                <td style={{ padding: '13px 18px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <SourceSparkline values={mv.perDay} />
                                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: mv.last7 > 0 ? 'var(--adm-text-title)' : 'var(--adm-text-muted)', whiteSpace: 'nowrap' }}>
                                      {mv.last7 > 0 ? `+${mv.last7}` : '0'}
                                    </span>
                                  </div>
                                </td>

                                <td style={{ padding: '13px 12px', textAlign: 'right' }}>
                                  <ChevronRight size={16} color="var(--adm-text-muted)" />
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modals}
    </div>
  );
};
