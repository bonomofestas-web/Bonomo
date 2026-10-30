import React, { useState, useMemo } from 'react';
import { 
  Sparkles, CheckCircle2, ArrowRight,
  Calendar, RefreshCw, AlertCircle
} from 'lucide-react';
import { CHANGELOG_DATA } from '../../data/changelogData';

export const PublicChangelogView: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'major' | 'feature' | 'security'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    return CHANGELOG_DATA.filter(item => {
      if (selectedFilter !== 'all') {
        if (selectedFilter === 'major' && item.type !== 'major') return false;
        if (selectedFilter === 'feature' && item.type !== 'feature' && item.type !== 'major') return false;
        if (selectedFilter === 'security' && item.type !== 'security') return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchSummary = item.summary.toLowerCase().includes(q);
        const matchVersion = item.version.toLowerCase().includes(q);
        const matchFeature = item.features.some(f => 
          f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)
        );
        return matchTitle || matchSummary || matchVersion || matchFeature;
      }

      return true;
    });
  }, [selectedFilter, searchQuery]);

  const getStatusBadge = (status: 'new' | 'improved' | 'deprecated' | 'replaced') => {
    switch (status) {
      case 'new':
        return (
          <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <CheckCircle2 size={10} /> Novo Recurso
          </span>
        );
      case 'improved':
        return (
          <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <RefreshCw size={10} /> Aprimorado
          </span>
        );
      case 'deprecated':
        return (
          <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <AlertCircle size={10} /> Descontinuado
          </span>
        );
      case 'replaced':
        return (
          <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <RefreshCw size={10} /> Substituído
          </span>
        );
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0B0F19',
      color: '#E2E8F0',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      padding: '40px 20px 80px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      {/* ── HEADER PÚBLICO DE DEPLOYS ── */}
      <header style={{
        maxWidth: '860px',
        width: '100%',
        marginBottom: '40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #1E293B, #0F172A)',
              border: '1.5px solid rgba(59, 130, 246, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3B82F6',
              fontWeight: 900,
              fontSize: '1.1rem',
              letterSpacing: '-0.5px',
              boxShadow: '0 4px 16px rgba(59, 130, 246, 0.25)',
            }}>
              F5
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#F8FAFC', margin: 0, letterSpacing: '-0.4px' }}>
                  Central de Atualizações
                </h1>
                <span style={{ fontSize: '0.70rem', fontWeight: 800, padding: '3px 8px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                  Histórico de Deploys
                </span>
              </div>
              <p style={{ fontSize: '0.84rem', color: '#94A3B8', margin: '4px 0 0 0' }}>
                Acompanhe em ordem cronológica todos os lançamentos, novos recursos, melhorias e evolução da plataforma F5 System.
              </p>
            </div>
          </div>

          <a
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#F8FAFC',
              fontSize: '0.80rem',
              fontWeight: 700,
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
              e.currentTarget.style.borderColor = '#3B82F6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            <span>Acessar o Painel</span>
            <ArrowRight size={14} />
          </a>
        </div>

        {/* ── BARRA DE FILTROS E BUSCA ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 16px',
          borderRadius: '12px',
          background: '#131B2E',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          {/* Botões de Filtro */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', marginRight: '4px' }}>
              Filtrar:
            </span>
            <button
              type="button"
              onClick={() => setSelectedFilter('all')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: 'none',
                background: selectedFilter === 'all' ? '#3B82F6' : 'rgba(255, 255, 255, 0.05)',
                color: selectedFilter === 'all' ? '#FFFFFF' : '#94A3B8',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.12s ease',
              }}
            >
              Todas ({CHANGELOG_DATA.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('major')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: 'none',
                background: selectedFilter === 'major' ? '#10B981' : 'rgba(255, 255, 255, 0.05)',
                color: selectedFilter === 'major' ? '#FFFFFF' : '#94A3B8',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.12s ease',
              }}
            >
              Grandes Atualizações
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('security')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: 'none',
                background: selectedFilter === 'security' ? '#8B5CF6' : 'rgba(255, 255, 255, 0.05)',
                color: selectedFilter === 'security' ? '#FFFFFF' : '#94A3B8',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.12s ease',
              }}
            >
              Segurança & Infra
            </button>
          </div>

          {/* Campo de Busca */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por recurso, versão ou termo..."
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              background: '#0B0F19',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#F8FAFC',
              fontSize: '0.76rem',
              outline: 'none',
              minWidth: '220px',
            }}
          />
        </div>
      </header>

      {/* ── LINHA DO TEMPO CRONOLÓGICA DE ATUALIZAÇÕES ── */}
      <main style={{
        maxWidth: '860px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
        position: 'relative',
      }}>
        {filteredItems.map((item, index) => {
          const isLatest = index === 0 && selectedFilter === 'all';
          return (
            <article
              key={item.id}
              style={{
                position: 'relative',
                background: '#131B2E',
                borderRadius: '16px',
                border: isLatest ? '1.5px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                padding: '24px',
                boxShadow: isLatest 
                  ? '0 12px 36px rgba(59, 130, 246, 0.12), 0 2px 10px rgba(0,0,0,0.4)'
                  : '0 4px 20px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {/* Header do Release */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '0.84rem',
                      fontWeight: 900,
                      padding: '3px 10px',
                      borderRadius: '8px',
                      background: isLatest ? '#3B82F6' : 'rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      letterSpacing: '0.3px',
                    }}>
                      {item.version}
                    </span>

                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: item.type === 'major' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                      color: item.type === 'major' ? '#10B981' : '#94A3B8',
                    }}>
                      {item.badge}
                    </span>

                    {isLatest && (
                      <span style={{
                        fontSize: '0.64rem',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(59, 130, 246, 0.2)',
                        color: '#60A5FA',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}>
                        <Sparkles size={10} /> Versão Atual
                      </span>
                    )}
                  </div>

                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F8FAFC', margin: 0, lineHeight: 1.3 }}>
                    {item.title}
                  </h2>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.74rem', color: '#94A3B8' }}>
                  <Calendar size={13} />
                  <span>{item.date}</span>
                </div>
              </div>

              {/* Resumo Executivo */}
              <p style={{ fontSize: '0.86rem', color: '#CBD5E1', margin: 0, lineHeight: 1.55 }}>
                {item.summary}
              </p>

              {/* Lista Detalhada de Funcionalidades */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                paddingTop: '16px',
              }}>
                <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Recursos & Mudanças Implementadas:
                </span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {item.features.map((feature, fIdx) => (
                    <div
                      key={fIdx}
                      style={{
                        background: 'rgba(0, 0, 0, 0.25)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#F1F5F9' }}>
                          {feature.name}
                        </span>
                        {getStatusBadge(feature.status)}
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: 0, lineHeight: 1.45 }}>
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          );
        })}

        {filteredItems.length === 0 && (
          <div style={{
            background: '#131B2E',
            borderRadius: '16px',
            border: '1px dashed rgba(255, 255, 255, 0.1)',
            padding: '50px 20px',
            textAlign: 'center',
            color: '#94A3B8',
          }}>
            Nenhuma atualização encontrada para os termos selecionados.
          </div>
        )}
      </main>

      {/* ── FOOTER PÚBLICO ── */}
      <footer style={{
        marginTop: '60px',
        textAlign: 'center',
        fontSize: '0.74rem',
        color: '#64748B',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}>
        <span>F5 System • Plataforma Oficial de Gestão para Redes de Casas de Festas</span>
        <span>Isolamento Multi-Tenant Garantido • Tecnologia Cloudflare R2 & Supabase</span>
      </footer>
    </div>
  );
};
