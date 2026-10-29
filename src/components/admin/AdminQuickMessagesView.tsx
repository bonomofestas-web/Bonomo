import React, { useState, useMemo } from 'react';
import {
  Zap, Plus, Search, Edit3, Trash2, CheckCircle2,
  XCircle, User, Calendar, MessageSquare
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

              {/* Corpo da Mensagem (Renderizado com o formatador nativo do WhatsApp) */}
              <div
                style={{
                  background: '#0b141a',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div
                  style={{
                    color: '#e9edef',
                    fontSize: '0.82rem',
                    lineHeight: 1.45,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {renderWhatsAppFormattedText(msg.message, { isDarkMode: true })}
                </div>
              </div>

              {/* Rodapé: Criado por e Data de criação (Requisito do Áudio 2) */}
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
