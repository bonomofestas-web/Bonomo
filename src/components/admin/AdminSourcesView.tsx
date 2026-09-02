import React, { useState, useMemo } from 'react';
import { 
  Compass, Plus, FileText, PhoneCall, Gift,
  Copy, Check, Code, Edit3, Trash2,
  CheckCircle2, XCircle, Search, Building2
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { AdminSourceModal } from './AdminSourceModal';
import { AdminSourceEmbedModal } from './AdminSourceEmbedModal';
import type { Source } from '../../types/sources';

export const AdminSourcesView: React.FC = () => {
  const { sources, venues, funnels, activeVenueId, toggleSourceStatus, deleteSource } = useAdminState();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sourceToEdit, setSourceToEdit] = useState<Source | null>(null);
  const [embedModalSource, setEmbedModalSource] = useState<Source | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  // Aggregate Metrics
  const totalSourcesCount = filteredSources.length;
  const activeSourcesCount = filteredSources.filter(s => s.status === 'active').length;
  const totalEntriesCount = filteredSources.reduce((acc, s) => acc + (s.totalEvents || s.totalClicks || s.totalViews || 0), 0);
  const totalLeadsGenerated = filteredSources.reduce((acc, s) => acc + (s.totalLeads || s.totalSubmits || 0), 0);
  const avgConversionRate = totalEntriesCount > 0 ? Math.round((totalLeadsGenerated / totalEntriesCount) * 100) : 0;

  const handleCopyLink = (source: Source) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://app.bonomofestas.com.br';
    const link = `${baseUrl}/f/${source.slug || source.id}`;

    navigator.clipboard.writeText(link);
    setCopiedId(source.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (source: Source) => {
    if (source.type === 'referral') {
      alert('A Origem de Indicação é nativa do sistema e não pode ser excluída, apenas reconfigurada.');
      return;
    }
    if (confirm(`Tem certeza que deseja excluir a origem "${source.name}"?`)) {
      await deleteSource(source.id);
    }
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

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      padding: '24px 32px 60px 32px',
      maxWidth: '1440px',
      margin: '0 auto',
      animation: 'fadeIn 0.25s ease-out',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      boxSizing: 'border-box',
    }}>
      
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
              Portas de entrada do CRM: Links de WhatsApp, Formulários, APIs e Indicações com roteamento por funil
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setSourceToEdit(null);
            setIsModalOpen(true);
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

      {/* ── 4 KPI Metric Cards ───────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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
            Entradas / Acessos Registrados
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#3B82F6', marginTop: '4px' }}>
            {totalEntriesCount} <span style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)', fontWeight: 600 }}>cliques & views</span>
          </div>
        </div>

        <div className="saas-card" style={{ background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '18px', padding: '18px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
            Leads Criados / Inseridos
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--adm-accent)', marginTop: '4px' }}>
            {totalLeadsGenerated} <span style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)', fontWeight: 600 }}>oportunidades</span>
          </div>
        </div>

        <div className="saas-card" style={{ background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '18px', padding: '18px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
            Taxa Média de Conversão
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#10B981', marginTop: '4px' }}>
            {avgConversionRate}% <span style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)', fontWeight: 600 }}>eficiência</span>
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

        {/* Type Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto' }}>
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
                  <th style={{ padding: '14px 18px', fontWeight: 800, color: 'var(--adm-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Configuração / Sub-origens</th>
                  <th style={{ padding: '14px 18px', fontWeight: 800, color: 'var(--adm-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '14px 18px', fontWeight: 800, color: 'var(--adm-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Leads Captados</th>
                  <th style={{ padding: '14px 18px', fontWeight: 800, color: 'var(--adm-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredSources.map((source) => {
                  const venue = venues.find(v => v.id === source.venueId);
                  const funnel = funnels.find(f => f.id === source.funnelId);
                  const isCopied = copiedId === source.id;
                  const subSources = source.configuration?.subSources || [];

                  return (
                    <tr
                      key={source.id}
                      style={{
                        borderBottom: '1px solid var(--adm-border)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-input)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Nome & Slug */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 800, color: 'var(--adm-text-title)' }}>
                          {source.name}
                        </div>
                        {source.slug && source.type === 'form' && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', marginTop: '2px', fontFamily: 'monospace' }}>
                            /f/{source.slug}
                          </div>
                        )}
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
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '8px',
                          background: 'rgba(212, 175, 55, 0.1)',
                          border: '1px solid rgba(212, 175, 55, 0.25)',
                          color: 'var(--adm-accent)',
                          fontWeight: 700,
                          fontSize: '0.72rem',
                        }}>
                          🎯 {funnel?.name || source.funnelId}
                        </span>
                      </td>

                      {/* Configuração & Sub-origens */}
                      <td style={{ padding: '14px 18px' }}>
                        {source.type === 'whatsapp_api' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ fontSize: '0.76rem', color: 'var(--adm-text-body)', fontWeight: 700 }}>
                              ⚡ {source.whatsappInstanceId || 'Instância Ativa'}
                            </div>
                            {subSources.length > 0 ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                {subSources.map(sub => (
                                  <span
                                    key={sub.id}
                                    title={`Palavra-chave: "${sub.keyword}"`}
                                    style={{
                                      fontSize: '0.64rem',
                                      fontWeight: 800,
                                      padding: '1px 6px',
                                      borderRadius: '6px',
                                      background: 'rgba(16, 185, 129, 0.12)',
                                      color: '#10B981',
                                      border: '1px solid rgba(16, 185, 129, 0.25)',
                                    }}
                                  >
                                    🏷️ {sub.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                                Sem sub-origens (Rastreio Direto)
                              </span>
                            )}
                          </div>
                        )}
                        {source.type === 'form' && (
                          <div style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)' }}>
                            📝 {source.configuration?.fields?.length || 5} campos • Link público ativo
                          </div>
                        )}
                        {source.type === 'referral' && (
                          <div style={{ fontSize: '0.76rem', color: 'var(--adm-accent)', fontWeight: 600 }}>
                            👑 App das Aniversariantes & Debutantes
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 18px' }}>
                        <button
                          type="button"
                          onClick={() => toggleSourceStatus(source.id, source.status !== 'active')}
                          style={{
                            border: 'none',
                            background: source.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                            color: source.status === 'active' ? '#10B981' : '#64748B',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {source.status === 'active' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          <span>{source.status === 'active' ? 'Ativa' : 'Inativa'}</span>
                        </button>
                      </td>

                      {/* Entradas & Leads */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 800, color: 'var(--adm-text-title)' }}>
                          {source.totalLeads || 0} leads
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                          {source.totalEvents || 0} acessos
                        </div>
                      </td>

                      {/* Ações */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          {/* Copiar Link (Apenas Formulários) */}
                          {source.type === 'form' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleCopyLink(source)}
                                title="Copiar link do formulário público"
                                className="adm-btn-secondary"
                                style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                {isCopied ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                                <span>{isCopied ? 'Copiado!' : 'Link'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setEmbedModalSource(source)}
                                title="Gerar código Embed"
                                className="adm-btn-secondary"
                                style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Code size={13} />
                                <span>Embed</span>
                              </button>
                            </>
                          )}

                          {/* Editar */}
                          <button
                            type="button"
                            onClick={() => {
                              setSourceToEdit(source);
                              setIsModalOpen(true);
                            }}
                            title="Editar origem e sub-origens"
                            style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-body)', cursor: 'pointer', padding: '6px', borderRadius: '6px' }}
                          >
                            <Edit3 size={15} />
                          </button>

                          {/* Excluir */}
                          {source.type !== 'referral' && (
                            <button
                              type="button"
                              onClick={() => handleDelete(source)}
                              title="Excluir origem"
                              style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '6px', borderRadius: '6px' }}
                            >
                              <Trash2 size={15} />
                            </button>
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

      {/* Modal de Criação / Edição */}
      <AdminSourceModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSourceToEdit(null);
        }}
        sourceToEdit={sourceToEdit}
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
