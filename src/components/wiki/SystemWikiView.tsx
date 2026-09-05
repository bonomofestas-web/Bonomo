import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  BookOpen, Sparkles, Briefcase, Crown, Link2, Cpu, HelpCircle, 
  Search, X, ChevronRight, CheckCircle2, AlertCircle, Lightbulb, 
  Check, ArrowLeft, ArrowRight, Printer,
  Layers, Share2, Filter
} from 'lucide-react';
import { WIKI_ARTICLES, WIKI_CATEGORIES } from './wikiData';

interface SystemWikiViewProps {
  // Purely informational Wiki - zero access/login buttons as requested
}

const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  BookOpen,
  Sparkles,
  Briefcase,
  Crown,
  Link2,
  Cpu,
  HelpCircle,
};

export const SystemWikiView: React.FC<SystemWikiViewProps> = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAudience, setSelectedAudience] = useState<string>('all');
  const [activeArticleId, setActiveArticleId] = useState<string>(() => {
    // Check hash anchor on initial mount
    const hash = window.location.hash.replace(/^#/, '');
    if (hash && WIKI_ARTICLES.some(a => a.id === hash)) {
      return hash;
    }
    return WIKI_ARTICLES[0].id;
  });
  const [copiedLink, setCopiedLink] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const articleContentRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut: Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen to hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (hash && WIKI_ARTICLES.some(a => a.id === hash)) {
        setActiveArticleId(hash);
        articleContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Filtered articles
  const filteredArticles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return WIKI_ARTICLES.filter(article => {
      // Category filter
      if (selectedCategory !== 'all' && article.category !== selectedCategory) {
        return false;
      }
      // Audience filter
      if (selectedAudience !== 'all') {
        const matchesAudience = article.targetAudience.some(
          aud => aud.toLowerCase() === selectedAudience.toLowerCase() || aud === 'Todos'
        );
        if (!matchesAudience) return false;
      }
      // Search query
      if (query) {
        const inTitle = article.title.toLowerCase().includes(query);
        const inSummary = article.summary.toLowerCase().includes(query);
        const inHowItWorks = article.howItWorks.toLowerCase().includes(query);
        const inTags = article.tags.some(tag => tag.toLowerCase().includes(query));
        const inSteps = article.steps?.some(step => 
          step.title.toLowerCase().includes(query) || 
          step.action.toLowerCase().includes(query) ||
          (step.details && step.details.toLowerCase().includes(query))
        );
        return inTitle || inSummary || inHowItWorks || inTags || inSteps;
      }
      return true;
    });
  }, [searchQuery, selectedCategory, selectedAudience]);

  // Active article
  const activeArticle = useMemo(() => {
    return WIKI_ARTICLES.find(a => a.id === activeArticleId) || filteredArticles[0] || WIKI_ARTICLES[0];
  }, [activeArticleId, filteredArticles]);

  // Current index for next/previous navigation
  const currentIndex = useMemo(() => {
    return WIKI_ARTICLES.findIndex(a => a.id === activeArticle.id);
  }, [activeArticle]);

  const prevArticle = currentIndex > 0 ? WIKI_ARTICLES[currentIndex - 1] : null;
  const nextArticle = currentIndex < WIKI_ARTICLES.length - 1 ? WIKI_ARTICLES[currentIndex + 1] : null;

  const handleSelectArticle = (id: string) => {
    setActiveArticleId(id);
    window.location.hash = id;
    setIsMobileMenuOpen(false);
    articleContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyArticleLink = () => {
    const url = `${window.location.origin}/wiki#${activeArticle.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
      color: '#0F172A',
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* ── Top Bar Header (Light Blue Theme) ── */}
      <header style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '14px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}>
        {/* Brand & Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2px 8px',
            borderRadius: '10px',
            background: '#F0F9FF',
            border: '1px solid #BAE6FD',
          }}>
            <img
              src="/f5_logo.png"
              alt="F5 System"
              style={{
                height: '34px',
                width: 'auto',
                maxWidth: '140px',
                objectFit: 'contain',
              }}
            />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0369A1', letterSpacing: '-0.3px' }}>
                F5 System
              </span>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                padding: '3px 9px',
                borderRadius: '6px',
                background: '#E0F2FE',
                color: '#0284C7',
                border: '1px solid #BAE6FD'
              }}>
                Wiki Oficial & Documentação
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 500 }}>
              Manual Completo de Funcionalidades, Tutoriais de Uso e Regras de Negócio
            </div>
          </div>
        </div>

        {/* Action Tools (Share & Print only - ZERO links to CRM or Debutante App) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setIsMobileMenuOpen(prev => !prev)}
            className="md:hidden"
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              background: '#F1F5F9',
              border: '1px solid #CBD5E1',
              color: '#334155',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Layers size={16} />
            <span>Tópicos</span>
          </button>

          <button
            onClick={handleCopyArticleLink}
            title="Copiar link direto para este artigo"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              background: copiedLink ? '#DCFCE7' : '#F8FAFC',
              border: copiedLink ? '1px solid #86EFAC' : '1px solid #CBD5E1',
              color: copiedLink ? '#15803D' : '#334155',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {copiedLink ? <Check size={15} color="#15803D" /> : <Share2 size={15} color="#0284C7" />}
            <span>{copiedLink ? 'Link Copiado!' : 'Compartilhar Artigo'}</span>
          </button>

          <button
            onClick={handlePrint}
            title="Imprimir ou Salvar em PDF"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              background: '#F8FAFC',
              border: '1px solid #CBD5E1',
              color: '#334155',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Printer size={15} color="#0284C7" />
            <span className="hidden sm:inline">Imprimir / PDF</span>
          </button>
        </div>
      </header>

      {/* ── Main Container: Sidebar + Article Reader ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        maxWidth: '1600px',
        width: '100%',
        margin: '0 auto',
        padding: '24px',
        gap: '24px',
        boxSizing: 'border-box',
      }}>
        {/* ── Left Sidebar (Table of Contents & Filters) ── */}
        <aside style={{
          width: '340px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }} className={isMobileMenuOpen ? 'block' : 'hidden md:flex'}>
          {/* Quick Search Input */}
          <div style={{
            position: 'relative',
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #CBD5E1',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
          }}>
            <Search size={17} color="#0284C7" style={{ position: 'absolute', left: '12px', top: '11px' }} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar funcionalidade... (Ctrl+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#0F172A',
                fontSize: '0.88rem',
                padding: '9px 36px 9px 38px',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '9px',
                  background: 'transparent',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: '2px',
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Categories Navigation Bar */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
          }}>
            <div style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              color: '#0369A1',
              padding: '4px 8px 8px 8px',
            }}>
              Módulos do F5 System
            </div>
            {WIKI_CATEGORIES.map(cat => {
              const IconComp = CATEGORY_ICON_MAP[cat.icon] || BookOpen;
              const isSelected = selectedCategory === cat.id;
              const count = cat.id === 'all' 
                ? WIKI_ARTICLES.length 
                : WIKI_ARTICLES.filter(a => a.category === cat.id).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    if (cat.id !== 'all') {
                      const first = WIKI_ARTICLES.find(a => a.category === cat.id);
                      if (first && activeArticle.category !== cat.id) {
                        handleSelectArticle(first.id);
                      }
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: isSelected ? '#EFF6FF' : 'transparent',
                    border: isSelected ? '1px solid #BAE6FD' : '1px solid transparent',
                    color: isSelected ? '#0284C7' : '#334155',
                    fontSize: '0.84rem',
                    fontWeight: isSelected ? 800 : 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IconComp size={16} color={isSelected ? '#0284C7' : '#64748B'} />
                    <span>{cat.label}</span>
                  </div>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '6px',
                    background: isSelected ? '#BAE6FD' : '#F1F5F9',
                    color: isSelected ? '#0369A1' : '#64748B',
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Articles List in Sidebar with Audience Filter */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            padding: '12px',
            flex: 1,
            maxHeight: 'calc(100vh - 350px)',
            overflowY: 'auto',
            scrollbarColor: '#CBD5E1 #FFFFFF',
            scrollbarWidth: 'thin',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 6px 4px 6px',
            }}>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                color: '#0369A1',
              }}>
                Artigos ({filteredArticles.length})
              </span>
            </div>

            {/* Audience Filter Pills */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              overflowX: 'auto',
              padding: '0 2px 8px 2px',
              scrollbarWidth: 'none',
              borderBottom: '1px solid #F1F5F9',
              marginBottom: '4px',
            }}>
              <Filter size={12} color="#0284C7" style={{ flexShrink: 0, marginRight: '2px' }} />
              {[
                { id: 'all', label: 'Todos' },
                { id: 'comercial', label: 'Comercial' },
                { id: 'sdr', label: 'SDR' },
                { id: 'closer', label: 'Closer' },
                { id: 'pós-venda', label: 'Pós-Venda' },
                { id: 'debutante', label: 'Debutante' },
                { id: 'desenvolvedor', label: 'Dev' },
              ].map(aud => (
                <button
                  key={aud.id}
                  onClick={() => setSelectedAudience(aud.id)}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '0.68rem',
                    fontWeight: selectedAudience === aud.id ? 800 : 500,
                    background: selectedAudience === aud.id ? '#E0F2FE' : '#F8FAFC',
                    color: selectedAudience === aud.id ? '#0369A1' : '#64748B',
                    border: selectedAudience === aud.id ? '1px solid #BAE6FD' : '1px solid #E2E8F0',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {aud.label}
                </button>
              ))}
            </div>

            {filteredArticles.length === 0 ? (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94A3B8', fontSize: '0.84rem' }}>
                Nenhuma funcionalidade encontrada para &quot;{searchQuery}&quot;.
              </div>
            ) : (
              filteredArticles.map(article => {
                const isActive = article.id === activeArticle.id;
                return (
                  <button
                    key={article.id}
                    onClick={() => handleSelectArticle(article.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: isActive 
                        ? '#F0F9FF' 
                        : '#FAFAFA',
                      border: isActive 
                        ? '1px solid #0284C7' 
                        : '1px solid #F1F5F9',
                      color: isActive ? '#0369A1' : '#334155',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <span style={{
                        fontSize: '0.85rem',
                        fontWeight: isActive ? 800 : 600,
                        color: isActive ? '#0284C7' : '#0F172A',
                        lineHeight: 1.3,
                      }}>
                        {article.title}
                      </span>
                      {isActive && <ChevronRight size={15} color="#0284C7" style={{ flexShrink: 0 }} />}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#64748B' }}>
                      <span>{article.categoryLabel}</span>
                      {article.steps && (
                        <span>• {article.steps.length} passos</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ── Right Content: Article Detail Reader (Light Theme) ── */}
        <main
          ref={articleContentRef}
          style={{
            flex: 1,
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            padding: '36px 44px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 120px)',
            boxSizing: 'border-box',
            scrollbarColor: '#CBD5E1 #F8FAFC',
            scrollbarWidth: 'thin',
          }}
        >
          {/* Article Header */}
          <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '24px', marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                padding: '4px 10px',
                borderRadius: '6px',
                background: '#E0F2FE',
                color: '#0369A1',
                border: '1px solid #BAE6FD',
              }}>
                {activeArticle.categoryLabel}
              </span>

              {activeArticle.targetAudience.map(aud => (
                <span
                  key={aud}
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: '6px',
                    background: '#F1F5F9',
                    color: '#475569',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  {aud}
                </span>
              ))}
            </div>

            <h1 style={{
              fontSize: '2rem',
              fontWeight: 900,
              color: '#0F172A',
              margin: '0 0 14px 0',
              lineHeight: 1.25,
              letterSpacing: '-0.5px',
            }}>
              {activeArticle.title}
            </h1>

            <p style={{
              fontSize: '1.05rem',
              color: '#475569',
              lineHeight: 1.6,
              margin: 0,
            }}>
              {activeArticle.summary}
            </p>
          </div>

          {/* How It Works Behind The Scenes */}
          <section style={{ marginBottom: '32px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '1.15rem',
              fontWeight: 800,
              color: '#0F172A',
              marginBottom: '14px',
            }}>
              <Cpu size={20} color="#0284C7" />
              <span>Como Funciona nos Bastidores</span>
            </div>
            <div style={{
              background: '#F0F9FF',
              border: '1px solid #BAE6FD',
              borderRadius: '12px',
              padding: '18px 24px',
              fontSize: '0.94rem',
              color: '#0369A1',
              lineHeight: 1.65,
              fontWeight: 500,
            }}>
              {activeArticle.howItWorks}
            </div>
          </section>

          {/* Step By Step Practical Tutorial */}
          {activeArticle.steps && activeArticle.steps.length > 0 && (
            <section style={{ marginBottom: '36px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '1.15rem',
                fontWeight: 800,
                color: '#0F172A',
                marginBottom: '18px',
              }}>
                <CheckCircle2 size={20} color="#0284C7" />
                <span>Passo a Passo Prático (Tutorial de Execução)</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {activeArticle.steps.map((step) => (
                  <div
                    key={step.stepNumber}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '18px 22px',
                      display: 'flex',
                      gap: '16px',
                      alignItems: 'flex-start',
                      boxShadow: '0 1px 4px rgba(0, 0, 0, 0.03)',
                    }}
                  >
                    {/* Step Number Circle */}
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                      color: '#FFFFFF',
                      fontWeight: 900,
                      fontSize: '0.92rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)',
                    }}>
                      {step.stepNumber}
                    </div>

                    {/* Step Content */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                        {step.title}
                      </div>
                      <div style={{ fontSize: '0.92rem', color: '#334155', lineHeight: 1.5, marginBottom: step.details ? '6px' : 0 }}>
                        {step.action}
                      </div>
                      {step.details && (
                        <div style={{
                          fontSize: '0.84rem',
                          color: '#475569',
                          lineHeight: 1.55,
                          whiteSpace: 'pre-line',
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          marginTop: '8px',
                        }}>
                          {step.details}
                        </div>
                      )}
                      {step.tips && (
                        <div style={{
                          fontSize: '0.8rem',
                          color: '#B45309',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '8px',
                          fontWeight: 700,
                        }}>
                          <Lightbulb size={14} color="#D97706" />
                          <span>{step.tips}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Business Rules & Guidelines */}
          {activeArticle.businessRules && activeArticle.businessRules.length > 0 && (
            <section style={{ marginBottom: '32px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '1.15rem',
                fontWeight: 800,
                color: '#0F172A',
                marginBottom: '14px',
              }}>
                <AlertCircle size={20} color="#D97706" />
                <span>Regras de Negócio & Diretrizes</span>
              </div>
              <div style={{
                background: '#FFFBEB',
                border: '1px solid #FDE68A',
                borderRadius: '12px',
                padding: '16px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}>
                {activeArticle.businessRules.map((rule, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#D97706',
                      marginTop: '7px',
                      flexShrink: 0,
                    }} />
                    <span style={{ fontSize: '0.88rem', color: '#92400E', lineHeight: 1.55, fontWeight: 500 }}>
                      {rule}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* VIP Pro Tips */}
          {activeArticle.vipTips && activeArticle.vipTips.length > 0 && (
            <section style={{ marginBottom: '36px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
                border: '1px solid #BAE6FD',
                borderRadius: '14px',
                padding: '20px 24px',
                display: 'flex',
                gap: '16px',
                alignItems: 'flex-start',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.08)',
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0369A1', marginBottom: '6px' }}>
                    Dica VIP de Alta Performance
                  </div>
                  {activeArticle.vipTips.map((tip, idx) => (
                    <div key={idx} style={{ fontSize: '0.9rem', color: '#0C4A6E', lineHeight: 1.55, fontWeight: 500 }}>
                      {tip}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Tags */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid #E2E8F0',
            paddingTop: '20px',
            marginBottom: '32px',
            flexWrap: 'wrap',
            gap: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 600, marginRight: '4px' }}>Tags:</span>
              {activeArticle.tags.map(tag => (
                <span
                  key={tag}
                  style={{
                    fontSize: '0.74rem',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: '#F1F5F9',
                    color: '#475569',
                    fontWeight: 600,
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom Pagination: Next & Previous */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            borderTop: '1px solid #E2E8F0',
            paddingTop: '20px',
          }}>
            {prevArticle ? (
              <button
                onClick={() => handleSelectArticle(prevArticle.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '10px',
                  padding: '10px 16px',
                  color: '#334155',
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <ArrowLeft size={16} color="#0284C7" />
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Anterior</div>
                  <div style={{ fontWeight: 800, color: '#0F172A' }}>{prevArticle.title}</div>
                </div>
              </button>
            ) : <div />}

            {nextArticle ? (
              <button
                onClick={() => handleSelectArticle(nextArticle.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '10px',
                  padding: '10px 16px',
                  color: '#334155',
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  textAlign: 'right',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Próximo</div>
                  <div style={{ fontWeight: 800, color: '#0F172A' }}>{nextArticle.title}</div>
                </div>
                <ArrowRight size={16} color="#0284C7" />
              </button>
            ) : <div />}
          </div>
        </main>
      </div>
    </div>
  );
};
