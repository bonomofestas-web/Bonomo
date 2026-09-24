import React, { useState, useMemo } from 'react';
import { 
  X, History, Search, CheckSquare, Square, DownloadCloud, 
  AlertTriangle, ArrowDownLeft, ArrowUpRight, 
  MessageSquare, CheckCircle2 
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { uazapiService } from '../../services/uazapiService';
import { formatPhone } from '../../utils/phoneFormatter';
import { SafeAvatar } from './SafeAvatar';
import { isGenericOrFamilyNickname, mergeAndSortActivities, findMatchingLead } from '../../services/leadService';
import { leadService } from '../../services/leadService';
import { isLidIdentifier } from '../../services/uazapiSseService';
import { generateUuid } from '../../utils/uuid';
import type { Source } from '../../types/sources';
import type { Lead, LeadActivity, CrmStage } from '../../types/admin';

interface TriageChatGroup {
  phone: string;
  name: string;
  profilePicUrl?: string;
  rawJid: string;
  rawLid: string;
  incomingCount: number;
  outgoingCount: number;
  totalCount: number;
  lastMessageText: string;
  lastMessageTime: string;
  lastMessageIsFromMe: boolean;
  messages: Array<{
    timestamp: string;
    text: string;
    fromMe: boolean;
    mediaUrl?: string;
    mediaType?: 'text' | 'image' | 'video' | 'audio' | 'document';
    rawPayload?: any;
  }>;
  selected: boolean;
  targetFunnelId?: string;
  targetStage?: CrmStage;
  existingLeadId?: string;
}

interface AdminWhatsAppHistoryTriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: Source | null;
}

export const AdminWhatsAppHistoryTriageModal: React.FC<AdminWhatsAppHistoryTriageModalProps> = ({
  isOpen,
  onClose,
  source,
}) => {
  const { 
    venues, 
    funnels, 
    activeVenueId, 
    leads, 
    updateLeadData, 
    createLeadFromWhatsApp,
    consolidateAllDuplicateLeads 
  } = useAdminState();

  const [periodDays, setPeriodDays] = useState<'7' | '15' | '30' | 'custom'>('7');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [chats, setChats] = useState<TriageChatGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [globalFunnelId, setGlobalFunnelId] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Define o funil padrão com base na fonte ou na casa de festas
  React.useEffect(() => {
    if (isOpen && source) {
      setErrorMsg('');
      setSuccessMsg('');
      setChats([]);
      setHasSearched(false);
      setImportProgress(null);

      const defaultFunnel = funnels.find(f => f.id === source.funnelId)
        || funnels.find(f => f.venueId === source.venueId && !f.isPostSale)
        || funnels[0];
      if (defaultFunnel) {
        setGlobalFunnelId(defaultFunnel.id);
      }
    }
  }, [isOpen, source?.id, funnels]);

  const venue = venues.find(v => v.id === source?.venueId) || venues[0];
  const targetToken = (source?.whatsappInstanceId || (source?.configuration as any)?.token || (source?.configuration as any)?.instanceToken || '').trim();

  // Executa busca no WhatsApp via UAZAPI
  const handleFetchHistory = async () => {
    if (!targetToken) {
      setErrorMsg('Origem de WhatsApp sem instância conectada configurada.');
      return;
    }

    setIsSearching(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const now = Date.now();
      let startTimestamp = now - 7 * 24 * 60 * 60 * 1000;
      let endTimestamp = now;

      if (periodDays === '15') {
        startTimestamp = now - 15 * 24 * 60 * 60 * 1000;
      } else if (periodDays === '30') {
        startTimestamp = now - 30 * 24 * 60 * 60 * 1000;
      } else if (periodDays === 'custom') {
        if (customStartDate) startTimestamp = new Date(customStartDate + 'T00:00:00').getTime();
        if (customEndDate) endTimestamp = new Date(customEndDate + 'T23:59:59').getTime();
      }

      const recovered = await uazapiService.recoverMessagesInInterval(targetToken, {
        startTimestamp,
        endTimestamp,
        limitPerChat: 50,
      });

      // Agrupa mensagens por telefone/contato
      const chatMap = new Map<string, TriageChatGroup>();

      for (const msg of recovered) {
        const cleanPhone = msg.senderPhone.replace(/\D/g, '');
        if (!cleanPhone || cleanPhone.length < 8) continue;

        const rawJid = msg.rawPayload?.key?.remoteJid || msg.rawPayload?.remoteJid || msg.rawPayload?.chatId || '';
        const rawLid = (isLidIdentifier(msg.senderPhone) ? msg.senderPhone : '') || (rawJid.includes('@lid') ? rawJid : '');

        let group = chatMap.get(cleanPhone);
        if (!group) {
          // Checa se já existe no CRM
          const { matchedLead } = findMatchingLead(leads, {
            phone: cleanPhone,
            jid: rawJid,
            lid: rawLid,
            rawPayload: msg.rawPayload,
          });

          const initialName = matchedLead?.name 
            || (!isGenericOrFamilyNickname(msg.senderName) ? msg.senderName : '')
            || `Contato ${cleanPhone.slice(-4)}`;

          group = {
            phone: cleanPhone,
            name: initialName,
            profilePicUrl: matchedLead?.avatarUrl || msg.profilePicUrl,
            rawJid,
            rawLid,
            incomingCount: 0,
            outgoingCount: 0,
            totalCount: 0,
            lastMessageText: '',
            lastMessageTime: '',
            lastMessageIsFromMe: false,
            messages: [],
            selected: true, // Selecionado por padrão para agilizar
            targetFunnelId: matchedLead?.funnelId || globalFunnelId,
            targetStage: (matchedLead?.stage as CrmStage) || 'new_lead',
            existingLeadId: matchedLead?.id,
          };
          chatMap.set(cleanPhone, group);
        }

        const isFromMe = msg.fromMe === true;
        if (isFromMe) group.outgoingCount++;
        else group.incomingCount++;
        group.totalCount++;

        group.messages.push({
          timestamp: msg.timestamp,
          text: msg.text,
          fromMe: isFromMe,
          mediaUrl: msg.mediaUrl,
          mediaType: msg.mediaType,
          rawPayload: msg.rawPayload,
        });

        // Atualiza última mensagem se for mais recente
        if (!group.lastMessageTime || new Date(msg.timestamp).getTime() > new Date(group.lastMessageTime).getTime()) {
          group.lastMessageText = msg.text;
          group.lastMessageTime = msg.timestamp;
          group.lastMessageIsFromMe = isFromMe;
        }
      }

      const list = Array.from(chatMap.values()).sort((a, b) => 
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );

      setChats(list);
      setHasSearched(true);
      if (list.length === 0) {
        setErrorMsg('Nenhuma conversa encontrada no período selecionado.');
      }
    } catch (err: any) {
      console.error('[Triage Modal] Erro ao buscar histórico:', err);
      setErrorMsg(err?.message || 'Falha ao buscar mensagens do WhatsApp.');
    } finally {
      setIsSearching(false);
    }
  };

  // Filtragem na tabela de triagem
  const filteredChats = useMemo(() => {
    if (!searchTerm.trim()) return chats;
    const clean = searchTerm.toLowerCase().trim();
    const cleanDigits = clean.replace(/\D/g, '');

    return chats.filter(c => {
      const matchName = c.name.toLowerCase().includes(clean);
      const matchPhone = cleanDigits.length >= 3 && c.phone.includes(cleanDigits);
      const matchMsg = c.lastMessageText.toLowerCase().includes(clean);
      return matchName || matchPhone || matchMsg;
    });
  }, [chats, searchTerm]);

  const selectedCount = useMemo(() => chats.filter(c => c.selected).length, [chats]);

  const handleToggleSelectAll = () => {
    const allSelected = chats.length > 0 && chats.every(c => c.selected);
    setChats(prev => prev.map(c => ({ ...c, selected: !allSelected })));
  };

  const handleToggleChat = (phone: string) => {
    setChats(prev => prev.map(c => c.phone === phone ? { ...c, selected: !c.selected } : c));
  };

  const handleNameChange = (phone: string, newName: string) => {
    setChats(prev => prev.map(c => c.phone === phone ? { ...c, name: newName } : c));
  };

  const handleFunnelChange = (phone: string, funnelId: string) => {
    setChats(prev => prev.map(c => c.phone === phone ? { ...c, targetFunnelId: funnelId } : c));
  };

  // Importar selecionados para o CRM
  const handleImportSelected = async () => {
    const toImport = chats.filter(c => c.selected);
    if (toImport.length === 0) {
      setErrorMsg('Selecione pelo menos uma conversa para importar.');
      return;
    }

    setIsImporting(true);
    setErrorMsg('');
    setImportProgress({ current: 0, total: toImport.length });

    let createdCount = 0;
    let updatedCount = 0;

    try {
      for (let i = 0; i < toImport.length; i++) {
        const item = toImport[i];
        setImportProgress({ current: i + 1, total: toImport.length });

        // Ordena mensagens cronologicamente
        item.messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        // Converte mensagens em LeadActivities
        const activities: LeadActivity[] = item.messages.map(m => {
          const isAudio = m.mediaType === 'audio' || m.text.includes('🎵') || m.text.toLowerCase().includes('voz');
          return {
            id: generateUuid(),
            leadId: item.existingLeadId || '',
            timestamp: m.timestamp || new Date().toISOString(),
            type: 'contact',
            title: m.fromMe 
              ? (isAudio ? 'Mensagem de voz enviada (Celular/Web)' : 'Mensagem enviada via WhatsApp (Celular/Web)')
              : (isAudio ? 'Mensagem de voz recebida' : 'Mensagem recebida no WhatsApp'),
            text: m.text,
            mediaUrl: m.mediaUrl,
            mediaType: m.mediaType,
            authorName: m.fromMe ? 'WhatsApp App / Web' : (item.name || 'Cliente (WhatsApp)'),
            authorId: m.fromMe ? 'whatsapp_mobile' : 'lead',
            authorAvatarUrl: m.fromMe ? 'whatsapp_brand' : undefined,
            status: m.fromMe ? 'sent' : 'delivered',
          };
        });

        if (item.existingLeadId) {
          // Lead já existe no CRM: funde o histórico com mergeAndSortActivities
          const existing = leads.find(l => l.id === item.existingLeadId);
          if (existing) {
            const combinedActs = mergeAndSortActivities(existing.activities || [], activities, existing.id);
            const updates: Partial<Lead> = {
              activities: combinedActs,
              updatedAt: new Date().toISOString().split('T')[0],
            };
            if (item.name && isGenericOrFamilyNickname(existing.name) && !isGenericOrFamilyNickname(item.name)) {
              updates.name = item.name;
            }
            if (item.profilePicUrl && !existing.avatarUrl) {
              updates.avatarUrl = item.profilePicUrl;
            }
            updateLeadData(existing.id, updates);
            await leadService.update(existing.id, updates);
            updatedCount++;
          }
        } else {
          // Cria novo Lead com a primeira mensagem e histórico completo
          const firstMsg = item.messages[0];
          const newId = await createLeadFromWhatsApp({
            venueId: source?.venueId || activeVenueId || venue.id,
            phone: item.phone,
            name: item.name,
            firstMessage: firstMsg?.text,
            sourceId: source?.id,
            avatarUrl: item.profilePicUrl,
            fromMe: firstMsg?.fromMe,
            mediaUrl: firstMsg?.mediaUrl,
            mediaType: firstMsg?.mediaType,
            initialFunnelId: item.targetFunnelId || globalFunnelId,
            initialStage: item.targetStage || 'new_lead',
          });

          if (newId) {
            // Se tinha mais de 1 mensagem, anexa as restantes ao lead recém criado
            if (activities.length > 1) {
              const remainingActs = activities.slice(1).map(a => ({ ...a, leadId: newId }));
              for (const act of remainingActs) {
                await leadService.addActivity(newId, act);
              }
            }
            createdCount++;
          }
        }
      }

      await consolidateAllDuplicateLeads();

      setSuccessMsg(`Sucesso! ${createdCount} novos leads criados e ${updatedCount} leads existentes atualizados.`);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('[Triage Modal] Falha ao importar:', err);
      setErrorMsg(err?.message || 'Falha ao importar conversas.');
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  if (!isOpen || !source) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100000,
      padding: '20px',
    }}>
      <div style={{
        background: 'var(--adm-bg-card, #141118)',
        border: '1px solid var(--adm-border, rgba(212, 175, 55, 0.35))',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '920px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--adm-border, rgba(255,255,255,0.08))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10B981',
            }}>
              <History size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title, #FFFFFF)' }}>
                Triagem Pré-CRM de Histórico do WhatsApp
              </h3>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--adm-text-muted, #9E988D)' }}>
                Selecione quais conversas importar para evitar poluir o CRM com grupos ou contatos pessoais
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting || isSearching}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--adm-text-muted, #9E988D)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
          {errorMsg && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #EF4444',
              color: '#EF4444',
              fontSize: '0.76rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <AlertTriangle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid #10B981',
              color: '#10B981',
              fontSize: '0.76rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <CheckCircle2 size={15} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Filtros de Período e Busca */}
          <div style={{
            background: 'var(--adm-bg-input, rgba(255,255,255,0.03))',
            border: '1px solid var(--adm-border, rgba(255,255,255,0.08))',
            borderRadius: '12px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>
                  Período de Histórico:
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {(['7', '15', '30', 'custom'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPeriodDays(p)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: periodDays === p ? '1px solid #10B981' : '1px solid var(--adm-border, rgba(255,255,255,0.1))',
                        background: periodDays === p ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                        color: periodDays === p ? '#10B981' : 'var(--adm-text-title, #FFF)',
                        fontSize: '0.72rem',
                        fontWeight: periodDays === p ? 800 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      {p === 'custom' ? 'Personalizado' : `Últimos ${p} dias`}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleFetchHistory}
                disabled={isSearching || isImporting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 16px',
                  borderRadius: '8px',
                  background: '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: isSearching ? 'wait' : 'pointer',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                }}
              >
                <Search size={13} />
                <span>{isSearching ? 'Buscando Mensagens...' : 'Buscar Conversas'}</span>
              </button>
            </div>

            {/* Inputs de Data Personalizada */}
            {periodDays === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '6px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>Data Inicial:</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="adm-input"
                    style={{ height: '32px', fontSize: '0.74rem', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>Data Final:</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="adm-input"
                    style={{ height: '32px', fontSize: '0.74rem', borderRadius: '6px' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Barra de Ações Rápidas na Tabela */}
          {hasSearched && chats.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: 'transparent',
                    border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                    color: 'var(--adm-text-title, #FFF)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {chats.every(c => c.selected) ? <CheckSquare size={14} color="#10B981" /> : <Square size={14} />}
                  <span>{chats.every(c => c.selected) ? 'Desmarcar Todos' : 'Selecionar Todos'}</span>
                </button>

                <span style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
                  <strong>{selectedCount}</strong> de {chats.length} conversas selecionadas
                </span>
              </div>

              {/* Busca na lista */}
              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={13} color="var(--adm-text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filtrar conversas..."
                  className="adm-input"
                  style={{ width: '100%', height: '32px', paddingLeft: '30px', fontSize: '0.72rem', borderRadius: '6px' }}
                />
              </div>
            </div>
          )}

          {/* Tabela de Triagem */}
          {hasSearched && (
            <div style={{
              border: '1px solid var(--adm-border, rgba(255,255,255,0.08))',
              borderRadius: '10px',
              overflow: 'hidden',
              background: 'var(--adm-bg-input, rgba(255,255,255,0.02))',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.74rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--adm-border, rgba(255,255,255,0.08))' }}>
                    <th style={{ padding: '10px 12px', width: '40px' }}></th>
                    <th style={{ padding: '10px 12px' }}>Contato (Nome / Telefone)</th>
                    <th style={{ padding: '10px 12px', width: '110px' }}>Mensagens</th>
                    <th style={{ padding: '10px 12px' }}>Última Mensagem</th>
                    <th style={{ padding: '10px 12px', width: '180px' }}>Funil de Destino</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredChats.map(c => (
                    <tr 
                      key={c.phone}
                      style={{
                        borderBottom: '1px solid var(--adm-border, rgba(255,255,255,0.04))',
                        background: c.selected ? 'rgba(16, 185, 129, 0.04)' : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={c.selected}
                          onChange={() => handleToggleChat(c.phone)}
                          style={{ cursor: 'pointer', accentColor: '#10B981' }}
                        />
                      </td>

                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <SafeAvatar src={c.profilePicUrl} name={c.name} size={30} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <input
                              type="text"
                              value={c.name}
                              onChange={(e) => handleNameChange(c.phone, e.target.value)}
                              title="Clique para editar o nome antes de importar para o CRM"
                              placeholder="Nome do cliente"
                              style={{
                                width: '100%',
                                background: 'transparent',
                                border: '1px solid transparent',
                                borderRadius: '4px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                color: 'var(--adm-text-title, #FFF)',
                                padding: '2px 4px',
                              }}
                              onFocus={(e) => e.currentTarget.style.border = '1px solid var(--adm-accent, #6366F1)'}
                              onBlur={(e) => e.currentTarget.style.border = '1px solid transparent'}
                            />
                            <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', paddingLeft: '4px' }}>
                              {formatPhone(c.phone)} {c.existingLeadId && <span style={{ color: '#10B981', fontWeight: 800 }}>• Já no CRM</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span 
                            title={`${c.incomingCount} mensagens recebidas`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: 'rgba(59, 130, 246, 0.15)',
                              color: '#3B82F6',
                              fontSize: '0.66rem',
                              fontWeight: 700,
                            }}
                          >
                            <ArrowDownLeft size={10} /> {c.incomingCount}
                          </span>
                          <span 
                            title={`${c.outgoingCount} mensagens enviadas`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#10B981',
                              fontSize: '0.66rem',
                              fontWeight: 700,
                            }}
                          >
                            <ArrowUpRight size={10} /> {c.outgoingCount}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '10px 12px' }}>
                        <div style={{
                          maxWidth: '260px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: 'var(--adm-text-title, #E2E8F0)',
                          fontSize: '0.72rem',
                        }}>
                          {c.lastMessageIsFromMe && <span style={{ color: 'var(--adm-text-muted)' }}>Você: </span>}
                          {c.lastMessageText || 'Mídia enviada'}
                        </div>
                        <div style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)' }}>
                          {c.lastMessageTime ? new Date(c.lastMessageTime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                        </div>
                      </td>

                      <td style={{ padding: '10px 12px' }}>
                        <select
                          value={c.targetFunnelId}
                          onChange={(e) => handleFunnelChange(c.phone, e.target.value)}
                          className="adm-input"
                          style={{
                            width: '100%',
                            height: '28px',
                            fontSize: '0.70rem',
                            borderRadius: '6px',
                          }}
                        >
                          {funnels.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!hasSearched && !isSearching && (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--adm-text-muted)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}>
              <MessageSquare size={36} style={{ opacity: 0.3 }} />
              <div style={{ fontSize: '0.86rem', fontWeight: 700 }}>Nenhuma busca realizada ainda</div>
              <div style={{ fontSize: '0.74rem', maxWidth: '420px' }}>
                Escolha o período acima (ex: últimos 7 dias) e clique em <strong>Buscar Conversas</strong> para carregar o histórico do WhatsApp para triagem.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--adm-border, rgba(255,255,255,0.08))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
            {importProgress ? (
              <span>Importando {importProgress.current} de {importProgress.total}...</span>
            ) : selectedCount > 0 ? (
              <span>{selectedCount} conversas prontas para importar</span>
            ) : null}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isImporting}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: 'transparent',
                border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                color: 'var(--adm-text-muted, #9E988D)',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Fechar
            </button>

            {hasSearched && chats.length > 0 && (
              <button
                type="button"
                onClick={handleImportSelected}
                disabled={selectedCount === 0 || isImporting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 22px',
                  borderRadius: '8px',
                  background: selectedCount > 0 ? '#10B981' : 'rgba(255,255,255,0.1)',
                  color: selectedCount > 0 ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                  border: 'none',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
                  boxShadow: selectedCount > 0 ? '0 2px 10px rgba(16, 185, 129, 0.35)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <DownloadCloud size={15} />
                <span>{isImporting ? 'Importando para o CRM...' : `Importar Selecionados (${selectedCount})`}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
