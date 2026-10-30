import React, { useState, useMemo } from 'react';
import {
  Zap, Plus, Search, Edit3, Trash2, CheckCircle2,
  XCircle, User, Calendar, MessageSquare, LayoutGrid, List as ListIcon, CheckCheck
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { AdminQuickMessageModal } from './AdminQuickMessageModal';
import { AdminConfirmModal } from './AdminConfirmModal';
import { renderWhatsAppFormattedText } from '../../utils/whatsappFormatter';
import type { QuickMessage } from '../../types/admin';

export const AdminQuickMessagesView: React.FC = () => {
  const { quickMessages, deleteQuickMessage, toggleQuickMessageActive } = useAdminState();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [messageToEdit, setMessageToEdit] = useState<QuickMessage | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<QuickMessage | null>(null);

  const filteredMessages = useMemo(() => {
    return (quickMessages || []).filter(msg => {
      // Filtro de status
      if (statusFilter === 'active' && !msg.isActive) return false;
      if (statusFilter === 'inactive' && msg.isActive) return false;

      // Busca por palavra-chave ou texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().replace(/^\//, '');
        const matchKeyword = msg.keyword.toLowerCase().includes(q);
        const matchText = msg.message.toLowerCase().includes(q);
        const matchCreator = (msg.createdBy || '').toLowerCase().includes(q);
        return matchKeyword || matchText || matchCreator;
      }
      return true;
    });
  }, [quickMessages, statusFilter, searchQuery]);

  const handleOpenNewModal = () => {
    setMessageToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (msg: QuickMessage) => {
    setMessageToEdit(msg);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (messageToDelete) {
      await deleteQuickMessage(messageToDelete.id);
      setMessageToDelete(null);
    }
  };

  const formatCreationDate = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div
      style={{
        padding: '24px',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* ── TOPO / CABEÇALHO UNIFICADO ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          background: 'var(--adm-bg-card, #1e293b)',
          padding: '20px 24px',
          borderRadius: '14px',
          border: '1px solid var(--adm-border, rgba(255, 255, 255, 0.1))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(20, 169, 215, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#14A9D7',
            }}
          >
            <Zap size={22} />
          </div>
          <div>
            <h1
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--adm-text-title, #f8fafc)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              Mensagens Rápidas
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(20, 169, 215, 0.15)',
                  color: '#14A9D7',
                }}
              >
                {quickMessages.length} cadastradas
              </span>
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.80rem', color: 'var(--adm-text-muted, #94a3b8)' }}>
              Defina atalhos de barra (/) para disparar mensagens e respostas prontas com agilidade no WhatsApp.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenNewModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '9px',
            background: '#14A9D7',
            border: 'none',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '0.84rem',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
            boxShadow: '0 2px 8px rgba(20, 169, 215, 0.3)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#1091b9')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#14A9D7')}
        >
          <Plus size={16} />
          <span>Nova Mensagem Rápida</span>
        </button>
      </div>

      {/* ── BARRA DE BUSCA E FILTROS ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        {/* Campo de Busca */}
        <div
          style={{
            position: 'relative',
            flex: '1 1 300px',
            maxWidth: '450px',
          }}
        >
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--adm-text-muted, #94a3b8)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por atalho, mensagem ou autor..."
            style={{
              width: '100%',
              padding: '10px 12px 10px 36px',
              borderRadius: '9px',
              background: 'var(--adm-bg-card, #1e293b)',
              border: '1px solid var(--adm-border, rgba(255, 255, 255, 0.1))',
              color: 'var(--adm-text-title, #f8fafc)',
              fontSize: '0.84rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Filtros de Status */}
        <div
          style={{
            display: 'inline-flex',
            borderRadius: '8px',
            background: 'var(--adm-bg-card, #1e293b)',
            border: '1px solid var(--adm-border, rgba(255, 255, 255, 0.1))',
            padding: '3px',
            gap: '2px',
          }}
        >
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: statusFilter === 'all' ? '#14A9D7' : 'transparent',
              color: statusFilter === 'all' ? '#ffffff' : 'var(--adm-text-muted, #94a3b8)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.12s ease',
            }}
          >
            Todas ({quickMessages.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: statusFilter === 'active' ? '#10B981' : 'transparent',
              color: statusFilter === 'active' ? '#ffffff' : 'var(--adm-text-muted, #94a3b8)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.12s ease',
            }}
          >
            Ativas ({quickMessages.filter(m => m.isActive).length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('inactive')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: statusFilter === 'inactive' ? '#64748b' : 'transparent',
              color: statusFilter === 'inactive' ? '#ffffff' : 'var(--adm-text-muted, #94a3b8)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.12s ease',
            }}
          >
            Inativas ({quickMessages.filter(m => !m.isActive).length})
          </button>
        </div>

        {/* Alternador de Modo de Visualização (Cards vs Lista) */}
        <div
          style={{
            display: 'inline-flex',
            borderRadius: '8px',
            background: 'var(--adm-bg-card, #1e293b)',
            border: '1px solid var(--adm-border, rgba(255, 255, 255, 0.1))',
            padding: '3px',
            gap: '2px',
            marginLeft: 'auto',
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            title="Visualização em Cards"
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: 'none',
              background: viewMode === 'grid' ? '#14A9D7' : 'transparent',
              color: viewMode === 'grid' ? '#ffffff' : 'var(--adm-text-muted, #94a3b8)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
              transition: 'all 0.12s ease',
            }}
          >
            <LayoutGrid size={14} /> Cards
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            title="Visualização em Lista"
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: 'none',
              background: viewMode === 'list' ? '#14A9D7' : 'transparent',
              color: viewMode === 'list' ? '#ffffff' : 'var(--adm-text-muted, #94a3b8)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
              transition: 'all 0.12s ease',
            }}
          >
            <ListIcon size={14} /> Lista
          </button>
        </div>
      </div>

      {/* ── LISTAGEM DE MENSAGENS RÁPIDAS ── */}
      {filteredMessages.length === 0 ? (
        <div
          style={{
            background: 'var(--adm-bg-card, #1e293b)',
            borderRadius: '14px',
            border: '1px dashed var(--adm-border, rgba(255, 255, 255, 0.15))',
            padding: '50px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--adm-text-muted, #94a3b8)',
            }}
          >
            <MessageSquare size={24} />
          </div>
          <div style={{ fontSize: '0.94rem', fontWeight: 600, color: 'var(--adm-text-title, #f8fafc)' }}>
            Nenhuma mensagem rápida encontrada
          </div>
          <div style={{ fontSize: '0.80rem', color: 'var(--adm-text-muted, #94a3b8)', maxWidth: '400px' }}>
            {searchQuery
              ? 'Tente ajustar os termos de busca para encontrar o atalho desejado.'
              : 'Clique no botão acima para cadastrar seu primeiro atalho de mensagem rápida.'}
          </div>
        </div>
      ) : viewMode === 'list' ? (
        /* ── MODO LISTA (TABELA COMPACTA E EFICIENTE) ── */
        <div
          style={{
            background: 'var(--adm-bg-card, #1e293b)',
            borderRadius: '12px',
            border: '1px solid var(--adm-border, rgba(255, 255, 255, 0.1))',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '140px 1fr 180px 100px 90px',
              padding: '12px 16px',
              background: 'rgba(0, 0, 0, 0.2)',
              borderBottom: '1px solid var(--adm-border, rgba(255, 255, 255, 0.08))',
              fontSize: '0.74rem',
              fontWeight: 700,
              color: 'var(--adm-text-muted, #94a3b8)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            <div>Atalho</div>
            <div>Mensagem (WhatsApp)</div>
            <div>Criado por</div>
            <div style={{ textAlign: 'center' }}>Status</div>
            <div style={{ textAlign: 'right' }}>Ações</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredMessages.map((msg, index) => (
              <div
                key={msg.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr 180px 100px 90px',
                  alignItems: 'center',
                  padding: '12px 16px',
                  gap: '12px',
                  borderBottom: index < filteredMessages.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                  opacity: msg.isActive ? 1 : 0.6,
                  transition: 'background 0.12s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Atalho */}
                <div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: 'rgba(20, 169, 215, 0.15)',
                      border: '1px solid rgba(20, 169, 215, 0.3)',
                      color: '#14A9D7',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                    }}
                  >
                    /{msg.keyword}
                  </span>
                </div>

                {/* Balão WhatsApp Compacto */}
                <div style={{ minWidth: 0, paddingRight: '8px' }}>
                  <div
                    style={{
                      background: '#efeae2',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      border: '1px solid rgba(0,0,0,0.06)',
                      display: 'inline-flex',
                      flexDirection: 'column',
                      maxWidth: '100%',
                    }}
                  >
                    <div
                      style={{
                        background: '#d9fdd3',
                        color: '#111b21',
                        padding: '4px 8px',
                        borderRadius: '6px 0px 6px 6px',
                        fontSize: '0.80rem',
                        lineHeight: 1.4,
                        boxShadow: '0 1px 1px rgba(11,20,26,0.12)',
                        wordBreak: 'break-word',
                      }}
                    >
                      {renderWhatsAppFormattedText(msg.message, { isDarkMode: false })}
                    </div>
                  </div>
                </div>

                {/* Criado por & Data */}
                <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted, #94a3b8)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ color: 'var(--adm-text-title, #f8fafc)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <User size={12} /> {msg.createdBy || 'Sistema'}
                  </span>
                  <span style={{ fontSize: '0.70rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={11} /> {formatCreationDate(msg.createdAt)}
                  </span>
                </div>

                {/* Status Toggle */}
                <div style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => toggleQuickMessageActive(msg.id, !msg.isActive)}
                    style={{
                      border: 'none',
                      background: msg.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.12)',
                      color: msg.isActive ? '#10B981' : '#94a3b8',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {msg.isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    {msg.isActive ? 'Ativa' : 'Inativa'}
                  </button>
                </div>

                {/* Ações */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(msg)}
                    title="Editar mensagem"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--adm-text-muted, #94a3b8)',
                      cursor: 'pointer',
                      padding: '5px',
                      borderRadius: '6px',
                      display: 'flex',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#14A9D7')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--adm-text-muted, #94a3b8)')}
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessageToDelete(msg)}
                    title="Excluir mensagem"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--adm-text-muted, #94a3b8)',
                      cursor: 'pointer',
                      padding: '5px',
                      borderRadius: '6px',
                      display: 'flex',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--adm-text-muted, #94a3b8)')}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '16px',
          }}
        >
          {filteredMessages.map((msg) => (
            <div
              key={msg.id}
              style={{
                background: 'var(--adm-bg-card, #1e293b)',
                borderRadius: '12px',
                border: msg.isActive
                  ? '1px solid var(--adm-border, rgba(255, 255, 255, 0.1))'
                  : '1px solid rgba(255, 255, 255, 0.05)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                opacity: msg.isActive ? 1 : 0.65,
                transition: 'all 0.15s ease',
              }}
            >
              {/* Header do Card: Atalho e Ações */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: 'rgba(20, 169, 215, 0.15)',
                      border: '1px solid rgba(20, 169, 215, 0.3)',
                      color: '#14A9D7',
                      fontWeight: 700,
                      fontSize: '0.86rem',
                    }}
                  >
                    /{msg.keyword}
                  </span>
                  {msg.isActive ? (
                    <span
                      style={{
                        fontSize: '0.66rem',
                        fontWeight: 600,
                        color: '#10B981',
                        background: 'rgba(16, 185, 129, 0.12)',
                        padding: '2px 6px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <CheckCircle2 size={10} /> Ativa
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: '0.66rem',
                        fontWeight: 600,
                        color: '#94a3b8',
                        background: 'rgba(148, 163, 184, 0.12)',
                        padding: '2px 6px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <XCircle size={10} /> Inativa
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {/* Switch Ativo/Inativo */}
                  <button
                    type="button"
                    onClick={() => toggleQuickMessageActive(msg.id, !msg.isActive)}
                    title={msg.isActive ? 'Desativar atalho' : 'Ativar atalho'}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: msg.isActive ? '#10B981' : '#64748b',
                      cursor: 'pointer',
                      padding: '5px',
                      borderRadius: '6px',
                      display: 'flex',
                    }}
                  >
                    {msg.isActive ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  </button>

                  {/* Editar */}
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(msg)}
                    title="Editar mensagem rápida"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--adm-text-muted, #94a3b8)',
                      cursor: 'pointer',
                      padding: '5px',
                      borderRadius: '6px',
                      display: 'flex',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#14A9D7')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--adm-text-muted, #94a3b8)')}
                  >
                    <Edit3 size={16} />
                  </button>

                  {/* Excluir */}
                  <button
                    type="button"
                    onClick={() => setMessageToDelete(msg)}
                    title="Excluir mensagem rápida"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--adm-text-muted, #94a3b8)',
                      cursor: 'pointer',
                      padding: '5px',
                      borderRadius: '6px',
                      display: 'flex',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--adm-text-muted, #94a3b8)')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Corpo da Mensagem (Simulação WhatsApp com Fundo Claro e Balão Verde) */}
              <div
                style={{
                  background: '#efeae2',
                  borderRadius: '10px',
                  padding: '12px',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  minHeight: '85px',
                }}
              >
                <div
                  style={{
                    alignSelf: 'flex-end',
                    maxWidth: '92%',
                    background: '#d9fdd3',
                    color: '#111b21',
                    padding: '7px 10px 5px 12px',
                    borderRadius: '8px 0px 8px 8px',
                    boxShadow: '0 1px 1px rgba(11,20,26,0.13)',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.84rem',
                      lineHeight: 1.45,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {renderWhatsAppFormattedText(msg.message, { isDarkMode: false })}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '3px',
                      marginTop: '3px',
                      fontSize: '0.68rem',
                      color: '#667781',
                    }}
                  >
                    <span>12:00</span>
                    <CheckCheck size={14} color="#53bdeb" />
                  </div>
                </div>
              </div>

              {/* Rodapé: Criado por e Data de criação */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.70rem',
                  color: 'var(--adm-text-muted, #94a3b8)',
                  paddingTop: '4px',
                  borderTop: '1px solid var(--adm-border, rgba(255, 255, 255, 0.06))',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <User size={12} />
                  <span>{msg.createdBy || 'Sistema'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={12} />
                  <span>{formatCreationDate(msg.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação / Edição */}
      <AdminQuickMessageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        messageToEdit={messageToEdit}
      />

      {/* Modal de Confirmação de Exclusão */}
      <AdminConfirmModal
        isOpen={Boolean(messageToDelete)}
        title="Excluir Mensagem Rápida"
        message={`Tem certeza que deseja excluir o atalho "/${messageToDelete?.keyword}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir Atalho"
        cancelText="Cancelar"
        danger={true}
        onConfirm={handleConfirmDelete}
        onClose={() => setMessageToDelete(null)}
      />
    </div>
  );
};
