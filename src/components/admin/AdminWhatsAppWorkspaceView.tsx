import { DateField, Select , MonthYearSwitcher } from '../ui';
import { createPortal } from 'react-dom';
import { usePresenceContext } from '../../hooks/usePresence';
import { animateList } from '../../utils/animateList';
import { toast } from 'sonner';
import { formatMonthYear } from '../ui';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  MessageSquare, Search, SlidersHorizontal, Send, Mic,
  FileText, ChevronRight, ChevronLeft, ChevronDown, Calendar,
  Plus, Check, X, Clock, PhoneCall, Eye, Building2, User, UserPlus, CheckSquare,
  GitBranch, Users, Trash2, Zap, Smile, Image as ImageIcon,
  Headphones, Pause, Play, CheckCircle2, Edit3, AlertCircle, AlertTriangle, Copy,
  History, RefreshCw, MoreVertical, CheckCheck, DollarSign, TrendingUp, Folder,
  ExternalLink, ShieldCheck, Sparkles, ShoppingBag, Video, Download, Loader2, Camera,
  Target, Lock, RotateCcw, XCircle, Flame, ArrowUpDown, ArrowUp, ArrowDown, BadgeCheck, UserCheck, Smartphone, QrCode,
  Reply, ArrowRightLeft, Link2, Forward, Filter
} from 'lucide-react';
import { IcpTargetUserIcon } from './IcpTargetUserIcon';
import { isFinanceSource } from '../../utils/financeSource';
import { getUserTaskSectors } from '../../utils/taskSector';
import { SupplierToggleButton } from './contacts/SupplierToggleButton';
import { contactService } from '../../services/contactService';
import { mqlBadge } from '../../utils/mqlScore';
import { WhatsAppBrandIcon } from './WhatsAppBrandIcon';
import { SafeAvatar } from './SafeAvatar';
import { WhatsAppAudioMessage } from './WhatsAppAudioMessage';
import { WhatsAppDocumentMessage } from './WhatsAppDocumentMessage';
import { WhatsAppContactMessage } from './WhatsAppContactMessage';
import { AdminPostSaleChannelModal } from './AdminPostSaleChannelModal';

const InstagramIcon: React.FC<{ size?: number; className?: string; color?: string }> = ({ size = 16, className = '', color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);
import { useAdminState } from '../../context/AdminStateContext';
import { uazapiService } from '../../services/uazapiService';
import { isMessagingPaused, MESSAGING_PAUSED_TEXT } from '../../utils/messagingPause';
import { useMessagingPause } from '../../hooks/useMessagingPause';
import { MessagingPausedBanner } from './MessagingPausedBanner';
import { uazapiSseService } from '../../services/uazapiSseService';
import { isSupabaseConfigured } from '../../lib/supabase';
import { leadService, mergeAndSortActivities, isPhoneMatch, normalizeMessageId } from '../../services/leadService';
import { contractService } from '../../services/contractService';
import { getContractDocuments } from '../../utils/contractDocuments';
import { whatsappMediaService, MediaDownloadError, describeMediaFailure, resolveMediaMessageIds } from '../../services/whatsappMediaService';

// Ids da UAZAPI de uma mensagem: o id pode estar em metadata (webhook) ou no campo principal da atividade (envio/SSE)
// Valores de preenchimento que o sistema grava no campo de nome da homenageada: nao sao pessoas e nunca viram contato
const PLACEHOLDER_PERSON_NAMES = new Set(['indicação externa', 'indicacao externa', 'whatsapp direto', 'sem indicação', 'sem indicacao', 'direto', 'lead sem nome', 'teste', 'protagonista']);

const mediaIdsOf = (a: { metadata?: any; messageId?: string }) =>
  resolveMediaMessageIds({ ...(a.metadata || {}), messageId: a.metadata?.messageId || a.messageId });
import { renderWhatsAppFormattedText } from '../../utils/whatsappFormatter';
import { describePendingMedia } from '../../utils/mediaStoragePolicy';
import { mediaStorageService } from '../../services/mediaStorageService';
import { WhatsAppFormattingToolbar } from './WhatsAppFormattingToolbar';
import { AdminLeadInspector } from './AdminLeadInspector';
import { AdminClientDrawerInspector } from './AdminClientDrawerInspector';
import { AdminLinkContractorModal } from './AdminLinkContractorModal';
import { AdminLeadReadOnlyModal } from './AdminLeadReadOnlyModal';
import { ChannelAvatar } from './ChannelBadge';
import { channelOfLead } from '../../utils/channels';
import { funnelSenders, leadCarriedSourceIds, lastIncomingSourceId, lastSystemSentSourceId, lastInteractionSourceId, recommendSender, readManualSender, saveManualSender } from '../../utils/senderResolver';
import { AdminNewLeadModal } from './AdminNewLeadModal';
import { AdminTransferLeadVenueModal } from './AdminTransferLeadVenueModal';
import { AdminTaskDetailModal, renderTaskTypeLucideIcon } from './AdminTaskDetailModal';
import { AdminTaskCompletionModal } from './AdminTaskCompletionModal';
import { AdminConfirmModal } from './AdminConfirmModal';
import { AdminDuplicateLeadModal } from './AdminDuplicateLeadModal';
import { DocumentFileUploadZone } from './DocumentFileUploadZone';
import { TASK_PRIORITY_OPTIONS, getTaskPriorityConfig, isTaskOverdue } from '../../utils/taskColors';
import {
  AdminBulkMoveFunnelModal,
  AdminBulkMoveStageModal,
  AdminBulkAssignModal
} from './AdminLeadActionModals';
import { formatPhone, maskPhoneInput } from '../../utils/phoneFormatter';
import { generateUuid } from '../../utils/uuid';
import { getLeadPendingWaitingTime, getLeadWaitTimeSla, getLeadConversationTime } from '../../utils/leadSorting';
import { renderFunnelOrStageIcon } from '../../utils/funnelIconLibrary';
import { getDefaultPostSaleFunnelId, filterExtraPostSaleLeads } from '../../utils/funnelUtils';
import type { Lead, LeadActivity, CrmStage, ClientStage, AdminTask, TaskStatus, ClientUpsellSale, ClientDocument, PostSaleChannelConfig, LeadEventType } from '../../types/admin';

export const formatWhatsAppDateDivider = (timestamp?: string | number | Date): string => {
  if (!timestamp) return '';
  let date: Date;
  if (typeof timestamp === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(timestamp)) {
    const [y, m, d] = timestamp.split('-').map(Number);
    date = new Date(y, m - 1, d);
  } else {
    date = new Date(timestamp);
  }
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffTime = today.getTime() - target.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'HOJE';
  }
  if (diffDays === 1) {
    return 'ONTEM';
  }
  if (diffDays === -1) {
    return 'AMANHÃ';
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

interface AdminWhatsAppWorkspaceViewProps {
  initialLeadId?: string;
  onLeadOpened?: () => void;
  activeFunnelId?: string;
  searchQuery?: string;
  leadOwnershipFilter?: 'all' | 'open' | 'mine';
  sortBy?: string;
  onClose?: () => void;
  isEmbeddedInFunnel?: boolean;
  /** Mostra so a conversa (sem lista de conversas e sem ficha): usado dentro de modais que ja trazem os dados do cliente */
  chatOnly?: boolean;
  /** Numero obrigatorio de envio e de leitura (ex.: conexao fixa do Financeiro): so ele aparece e so ele envia */
  forcedSourceId?: string;
  initialComposerTab?: 'whatsapp' | 'notes' | 'tasks' | 'appointments' | 'upsell' | 'documents';
  isPostSale?: boolean;
  onOpenDebutanteApp?: (slug: string) => void;
  onOpenClientFullProfile?: (clientId: string) => void;
  isMultiSelectActive?: boolean;
  onToggleMultiSelect?: (active: boolean) => void;
  selectedLeadIds?: string[];
  onSelectedLeadIdsChange?: (ids: string[]) => void;
}

const UPSELL_CATEGORIES: Record<string, { label: string; color: string; bg: string }> = {
  foto_video: { label: 'Foto & Vídeo', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)' },
  decoracao: { label: 'Decoração & Cenografia', color: '#EC4899', bg: 'rgba(236, 72, 153, 0.12)' },
  atracoes: { label: 'Atrações & DJ', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)' },
  bar_bebidas: { label: 'Bar & Coquetéis', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  estrutura: { label: 'Estrutura & Iluminação', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' },
  alimentacao: { label: 'Gastronomia & Pista', color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.12)' },
  outro: { label: 'Outro Opcional', color: '#6B7280', bg: 'rgba(107, 114, 128, 0.12)' },
};

const POST_SALE_STAGE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  onboarding: { label: 'ONBOARDING & BOAS-VINDAS', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)' },
  planning: { label: 'PLANEJAMENTO & CRONOGRAMA', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' },
  suppliers: { label: 'DEFINIÇÃO DE FORNECEDORES', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)' },
  final_alignment: { label: 'ALINHAMENTO FINAL', color: '#6366F1', bg: 'rgba(99, 102, 241, 0.12)' },
  party_day: { label: 'SEMANA DA FESTA', color: '#EAB308', bg: 'rgba(234, 179, 8, 0.12)' },
  completed: { label: 'FESTA REALIZADA', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  archived: { label: 'ARQUIVADO', color: '#6B7280', bg: 'rgba(107, 114, 128, 0.12)' },
};

const WHATSAPP_EMOJI_LIST = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
  '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
  '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
  '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
  '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
  '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯',
  '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
  '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈',
  '👍', '👎', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅',
  '🤳', '💪', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
  '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟',
  '🎉', '🎊', '🎈', '🎂', '🎁', '👑', '💍', '💎', '🌟', '⭐',
  '✨', '🔥', '⚡', '💥', '☀️', '🌙', '🥂', '🍾', '🍹', '🍷',
  '🍸', '🍺', '🍻', '🍰', '🧁', '🏰', '📍', '📞', '📅', '🕒',
  '✅', '❌', 'ℹ️', '⚠️', '🚀', '🎯', '💯', '💐', '🌹', '🌸'
];

/**
 * Remove redundância do nome do autor em anotações automáticas de auditoria,
 * retornando frases diretas como "Alterou...", "Adicionou...", "Definiu...", etc.
 */
function cleanActionText(rawText?: string, authorName?: string, actTitle?: string): string {
  let text = (rawText || actTitle || '').trim();
  if (!text) return '';

  if (authorName) {
    const escaped = authorName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const firstName = authorName.split(' ')[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const authorRegex = new RegExp(`^(${escaped}|${firstName})\\s+`, 'i');
    text = text.replace(authorRegex, '');
  }

  // Normaliza prefixos para tom direto e limpo
  text = text.replace(/^preencheu o valor de venda em\s+/i, 'Alterou o valor de venda para ');
  text = text.replace(/^preencheu o valor de entrada em\s+/i, 'Alterou o valor de entrada para ');
  text = text.replace(/^preencheu\s+/i, 'Alterou ');
  text = text.replace(/^definiu\s+/i, 'Definiu ');

  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Retorna no máximo nome e sobrenome (2 palavras) para evitar poluição visual nos canais
 */
function formatPersonShortName(name: string): string {
  if (!name) return '';
  const clean = name.replace(/\s+/g, ' ').trim();
  const parts = clean.split(' ');
  if (parts.length <= 2) return clean;
  if (['de', 'da', 'do', 'dos', 'e'].includes(parts[1].toLowerCase()) && parts[2]) {
    return `${parts[0]} ${parts[2]}`;
  }
  return `${parts[0]} ${parts[1]}`;
}

/**
 * Extrai apenas o nome da Aniversariante / Protagonista (1º e 2º nome) + Evento
 * Removendo categoricamente qualquer nome de contratante/pagante
 * Ex: "Vitória Rodrigues • 15 Anos"
 */
function formatContractHonoreeTitle(contractOrClient: any): string | null {
  if (!contractOrClient) return null;

  const sanitize = (str?: string) => {
    if (!str) return '';
    return str
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu, '')
      .replace(/^(?:r{2,3}|erl|lead)[-\s_]+/i, '')
      .replace(/\([^)]*\)/gi, '')
      .replace(/\b15A?\s+[A-Za-zÀ-ÿ]+(?:\s+\d{2}\/\d{2}\/\d{2,4})?/gi, '')
      .replace(/\b\d{2}\/\d{2}\/\d{2,4}\b/g, '')
      .replace(/•\s*(?:15\s*Anos|Casamento|Infantil|Corporativo)/gi, '')
      .replace(/\b15\s*Anos\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const getFirstTwoNames = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).join(' ');
  };

  // 1. Payer / Contratante (para saber quem remover se presente)
  const payerRaw = contractOrClient.payerName || contractOrClient.payer_name || '';
  const payerClean = sanitize(payerRaw);
  const payerWords = payerClean.toLowerCase().split(/\s+/).filter(w => w.length >= 3);

  // 2. Tipo de evento normalizado
  let evt = contractOrClient.eventType || contractOrClient.event_type || contractOrClient.eventTypeName || '';
  const evtLower = String(evt).toLowerCase();
  if (evtLower.includes('15') || evtLower.includes('quinze') || evtLower.includes('debut')) {
    evt = '15 Anos';
  } else if (evtLower.includes('casamento') || evtLower.includes('noiv')) {
    evt = 'Casamento';
  } else if (evtLower.includes('infantil') || evtLower.includes('kids')) {
    evt = 'Infantil';
  } else if (evtLower.includes('corp')) {
    evt = 'Corporativo';
  } else if (!evt) {
    evt = '15 Anos';
  }

  // 3. Candidato a Homenageada / Aniversariante / Protagonista
  let honoreeCandidate = '';

  const rawBday = contractOrClient.birthdayPersonName || contractOrClient.birthday_person_name || contractOrClient.debutanteName || contractOrClient.debutante_name || contractOrClient.honoreeName || '';
  if (rawBday && sanitize(rawBday).toLowerCase() !== payerClean.toLowerCase()) {
    honoreeCandidate = rawBday;
  }

  const rawTitle = contractOrClient.contractTitle || contractOrClient.contract_title || contractOrClient.title || contractOrClient.name || '';
  const candidateToSplit = honoreeCandidate || rawTitle;

  if (!honoreeCandidate || (payerWords.length > 0 && payerWords.some(w => honoreeCandidate.toLowerCase().includes(w)))) {
    const parts = candidateToSplit.split(/[•–—]|\s+-\s+/).map((p: string) => sanitize(p)).filter(Boolean);
    if (parts.length >= 2) {
      const isFirstPayer = payerWords.length > 0 && payerWords.some(w => parts[0].toLowerCase().includes(w));
      if (isFirstPayer && parts[1]) {
        honoreeCandidate = parts[1];
      } else {
        const nonPayer = parts.find((p: string) => !payerWords.some((w: string) => p.toLowerCase().includes(w)));
        honoreeCandidate = nonPayer || parts[1] || parts[0];
      }
    } else if (parts.length === 1 && !honoreeCandidate) {
      honoreeCandidate = parts[0];
    }
  }

  // Remove qualquer menção remanescente às palavras do payer
  if (payerWords.length > 0 && honoreeCandidate) {
    for (const w of payerWords) {
      const regex = new RegExp(`\\b${w}\\b`, 'gi');
      honoreeCandidate = honoreeCandidate.replace(regex, '').trim();
    }
  }

  // Snapshot fallback
  if (!honoreeCandidate && contractOrClient.clientSnapshot) {
    const snap = contractOrClient.clientSnapshot;
    honoreeCandidate = snap.birthdayPersonName || snap.debutanteName || snap.birthday_person_name || '';
  }

  let cleaned = sanitize(honoreeCandidate);
  if (!cleaned) {
    cleaned = sanitize(contractOrClient.name || 'Cliente');
  }

  const shortName = getFirstTwoNames(cleaned || 'Aniversariante');
  return `${shortName} • ${evt}`;
}

/**
 * Comprime imagens no lado do cliente usando Canvas HTML5 gerando WebP otimizado
 */
async function compressImageToWebpDataUrl(file: File, maxWidth = 1280, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(readerEvent.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/webp', quality);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(readerEvent.target?.result as string);
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Renderiza texto com formatação nativa do WhatsApp (*bold*, _italic_, ~strike~, code, citações, listas, URLs)
 */
function renderFormattedTextWithLinks(text?: string, isDarkMode = false): React.ReactNode {
  if (!text) return null;
  return renderWhatsAppFormattedText(text, { isDarkMode });
}

/**
 * Utilitários para o editor com formatação direta estilo WhatsApp
 * Delimitadores (*, _, ~, ```) permanecem visíveis com o estilo visual aplicado inline.
 */
function getCaretCharacterOffsetWithin(element: Node): number {
  let caretOffset = 0;
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    caretOffset = preCaretRange.toString().length;
  }
  return caretOffset;
}

function setCaretPosition(element: Node, offset: number) {
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  let currentOffset = 0;
  let found = false;

  function traverse(node: Node) {
    if (found) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const len = node.textContent?.length || 0;
      if (currentOffset + len >= offset) {
        range.setStart(node, Math.min(offset - currentOffset, len));
        range.collapse(true);
        found = true;
        return;
      }
      currentOffset += len;
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        traverse(node.childNodes[i]);
        if (found) return;
      }
    }
  }

  traverse(element);
  if (!found) {
    range.selectNodeContents(element);
    range.collapse(false);
  }
  sel.removeAllRanges();
  sel.addRange(range);
}

function htmlToWhatsAppText(html: string): string {
  if (!html) return '';
  const temp = document.createElement('div');
  temp.innerHTML = html;

  function traverse(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      let children = '';
      el.childNodes.forEach(child => {
        children += traverse(child);
      });

      if (tag === 'b' || tag === 'strong') {
        const trimmed = children.trim();
        if (trimmed.startsWith('*') && trimmed.endsWith('*')) return children;
        return trimmed ? `*${trimmed}*` : '';
      }
      if (tag === 'i' || tag === 'em') {
        const trimmed = children.trim();
        if (trimmed.startsWith('_') && trimmed.endsWith('_')) return children;
        return trimmed ? `_${trimmed}_` : '';
      }
      if (tag === 's' || tag === 'strike' || tag === 'del') {
        const trimmed = children.trim();
        if (trimmed.startsWith('~') && trimmed.endsWith('~')) return children;
        return trimmed ? `~${trimmed}~` : '';
      }
      if (tag === 'code') {
        const trimmed = children.trim();
        if (trimmed.startsWith('```') && trimmed.endsWith('```')) return children;
        return trimmed ? `\`\`\`${trimmed}\`\`\`` : '';
      }
      if (tag === 'br') {
        return '\n';
      }
      if (tag === 'div' || tag === 'p') {
        return children ? `\n${children}` : '\n';
      }
      return children;
    }
    return '';
  }

  return traverse(temp).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function whatsappTextToHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/```([^`\n]+)```/g, '<code style="font-family:monospace;background:rgba(255,255,255,0.1);padding:1px 3px;border-radius:3px;">```$1```</code>')
    .replace(/(^|[\s.,;:!?([{])\*([^*\n\r]+)\*($|[\s.,;:!?)]])/g, '$1<strong style="font-weight:700;">*$2*</strong>$3')
    .replace(/(^|[\s.,;:!?([{])_([^_\n\r]+)_($|[\s.,;:!?)]])/g, '$1<em style="font-style:italic;">_$2_</em>$3')
    .replace(/(^|[\s.,;:!?([{])~([^~\n\r]+)~($|[\s.,;:!?)]])/g, '$1<del style="text-decoration:line-through;">~$2~</del>$3')
    .replace(/\n/g, '<br>');
}

interface WhatsAppMessageInputBoxProps {
  leadId: string;
  isDarkMode: boolean;
  disabled?: boolean;
  onSendMessageText: (text: string) => void;
  onTriggerComposing: () => void;
  onStartAudioRecording: () => void;
  isSpectator?: boolean;
  hasPendingAttachment?: boolean;
  hasStagedMedia?: boolean;
  pendingAttachmentCaption?: string;
}

const WhatsAppMessageInputBox: React.FC<WhatsAppMessageInputBoxProps> = React.memo(({
  leadId,
  isDarkMode,
  disabled,
  onSendMessageText,
  onTriggerComposing,
  onStartAudioRecording,
  isSpectator,
  hasPendingAttachment,
  hasStagedMedia,
  pendingAttachmentCaption,
}) => {
  const { quickMessages } = useAdminState();
  const [hasText, setHasText] = useState(false);
  const [showFormatBar, setShowFormatBar] = useState(false);
  const [isSlashActive, setIsSlashActive] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [selectedQuickIndex, setSelectedQuickIndex] = useState(0);

  const editorRef = useRef<HTMLDivElement>(null);
  const lastComposingCallRef = useRef<number>(0);

  // Inicializa o conteúdo do editor ao trocar de lead ou preenche com a legenda inicial
  useEffect(() => {
    if (editorRef.current) {
      if (pendingAttachmentCaption) {
        editorRef.current.innerHTML = whatsappTextToHtml(pendingAttachmentCaption);
        setHasText(true);
      } else {
        editorRef.current.innerHTML = '';
        setHasText(false);
      }
    }
    setIsSlashActive(false);
    setShowFormatBar(false);
  }, [leadId, pendingAttachmentCaption]);

  // Filtra no máximo 3 sugestões de mensagens rápidas ativas baseadas no slashQuery
  const matchingQuickMessages = useMemo(() => {
    if (!isSlashActive) return [];
    const q = slashQuery.toLowerCase();
    const filtered = (quickMessages || []).filter(qm =>
      qm.isActive && qm.keyword.toLowerCase().startsWith(q)
    );
    return filtered.slice(0, 3);
  }, [quickMessages, isSlashActive, slashQuery]);

  const checkSlashTrigger = () => {
    if (!editorRef.current) return;
    const plainText = editorRef.current.innerText || '';
    const sel = window.getSelection();
    let textBeforeCaret = plainText;
    if (sel && sel.focusNode) {
      const nodeText = sel.focusNode.textContent || '';
      textBeforeCaret = nodeText.slice(0, sel.focusOffset);
    }
    const match = textBeforeCaret.match(/(?:^|\s)\/([a-zA-Z0-9_\-]*)$/);
    if (match) {
      setIsSlashActive(true);
      setSlashQuery(match[1]);
      setSelectedQuickIndex(0);
    } else {
      setIsSlashActive(false);
      setSlashQuery('');
    }
  };

  const handleInput = () => {
    if (!editorRef.current) return;
    const currentHtml = editorRef.current.innerHTML;
    const text = (editorRef.current.innerText || '').trim();
    setHasText(text.length > 0 || currentHtml.includes('<img'));
    checkSlashTrigger();

    // Formatação em tempo real estilo WhatsApp:
    // Se o usuário digitou ou modificou delimitadores (*, _, ~, ```), atualiza os spans com estilo
    // preservando a posição exata do cursor e mantendo os delimitadores visíveis.
    const rawWhatsAppText = htmlToWhatsAppText(currentHtml);
    const formattedHtml = whatsappTextToHtml(rawWhatsAppText);
    if (editorRef.current && currentHtml !== formattedHtml && (
      currentHtml.includes('*') || currentHtml.includes('_') || currentHtml.includes('~') || currentHtml.includes('```') ||
      currentHtml.includes('<strong>') || currentHtml.includes('<em>') || currentHtml.includes('<del>') || currentHtml.includes('<code>')
    )) {
      const caretOffset = getCaretCharacterOffsetWithin(editorRef.current);
      editorRef.current.innerHTML = formattedHtml;
      setCaretPosition(editorRef.current, caretOffset);
    }

    const now = Date.now();
    if (now - lastComposingCallRef.current > 3000) {
      lastComposingCallRef.current = now;
      onTriggerComposing();
    }
  };

  const checkSelection = () => {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
      setShowFormatBar(true);
    } else {
      setShowFormatBar(false);
    }
  };

  const applyQuickMessage = (qm: typeof quickMessages[0]) => {
    if (!qm || !editorRef.current) return;
    // Substitui a chamada do atalho /peloTexto pela mensagem formatada visualmente
    const htmlToInsert = whatsappTextToHtml(qm.message);
    const plainText = editorRef.current.innerText || '';
    const slashIdx = plainText.lastIndexOf('/' + slashQuery);

    if (slashIdx >= 0) {
      const beforeSlash = plainText.slice(0, slashIdx);
      const afterSlash = plainText.slice(slashIdx + slashQuery.length + 1);
      editorRef.current.innerHTML = whatsappTextToHtml(beforeSlash) + htmlToInsert + (afterSlash ? ' ' + whatsappTextToHtml(afterSlash) : ' ');
    } else {
      editorRef.current.innerHTML = htmlToInsert + ' ';
    }

    setHasText(true);
    setIsSlashActive(false);
    setSlashQuery('');

    // Posiciona o cursor no final do editor
    requestAnimationFrame(() => {
      if (!editorRef.current) return;
      editorRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    });
  };

  const handleExecFormat = (format: 'bold' | 'italic' | 'strike' | 'monospace' | 'quote' | 'bullet' | 'number') => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setShowFormatBar(false);
      return;
    }

    const range = sel.getRangeAt(0);
    const selectedText = range.toString();
    if (!selectedText) {
      setShowFormatBar(false);
      return;
    }

    let marker = '';
    let endMarker = '';
    let styledTag = 'strong';
    let styleAttr = 'font-weight:700;';

    if (format === 'bold') {
      marker = '*';
      endMarker = '*';
      styledTag = 'strong';
      styleAttr = 'font-weight:700;';
    } else if (format === 'italic') {
      marker = '_';
      endMarker = '_';
      styledTag = 'em';
      styleAttr = 'font-style:italic;';
    } else if (format === 'strike') {
      marker = '~';
      endMarker = '~';
      styledTag = 'del';
      styleAttr = 'text-decoration:line-through;';
    } else if (format === 'monospace') {
      marker = '```';
      endMarker = '```';
      styledTag = 'code';
      styleAttr = 'font-family:monospace;background:rgba(255,255,255,0.1);padding:1px 3px;border-radius:3px;';
    } else if (format === 'quote') {
      const quoted = selectedText.split('\n').map(l => `> ${l}`).join('\n');
      document.execCommand('insertText', false, quoted);
      setShowFormatBar(false);
      handleInput();
      return;
    } else if (format === 'bullet') {
      const bulleted = selectedText.split('\n').map(l => `- ${l}`).join('\n');
      document.execCommand('insertText', false, bulleted);
      setShowFormatBar(false);
      handleInput();
      return;
    } else if (format === 'number') {
      const numbered = selectedText.split('\n').map((l, i) => `${i + 1}. ${l}`).join('\n');
      document.execCommand('insertText', false, numbered);
      setShowFormatBar(false);
      handleInput();
      return;
    }

    // Toggle: se a seleção já possui os marcadores correspondentes, desfaz
    if (selectedText.startsWith(marker) && selectedText.endsWith(endMarker) && selectedText.length >= marker.length + endMarker.length) {
      const unformatted = selectedText.slice(marker.length, selectedText.length - endMarker.length);
      document.execCommand('insertText', false, unformatted);
    } else {
      // Insere com os delimitadores visíveis e estilização nativa
      const newText = `${marker}${selectedText}${endMarker}`;
      const elem = document.createElement(styledTag);
      elem.setAttribute('style', styleAttr);
      elem.textContent = newText;
      range.deleteContents();
      range.insertNode(elem);

      // Reposiciona o cursor logo após o elemento formatado
      const newRange = document.createRange();
      newRange.setStartAfter(elem);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }

    setShowFormatBar(false);
    handleInput();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // 1. Navegação no autocomplete de mensagens rápidas com '/'
    if (isSlashActive && matchingQuickMessages.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedQuickIndex(prev => (prev + 1) % matchingQuickMessages.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedQuickIndex(prev => (prev - 1 + matchingQuickMessages.length) % matchingQuickMessages.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applyQuickMessage(matchingQuickMessages[selectedQuickIndex]);
        return;
      }
      if (e.key === 'Escape' || e.key === ' ') {
        setIsSlashActive(false);
        return;
      }
    }

    // 2. Envio de mensagem com Enter (Shift+Enter quebra a linha)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      triggerSend();
    }
  };

  const triggerSend = () => {
    if (!editorRef.current) return;
    const finalFormattedText = htmlToWhatsAppText(editorRef.current.innerHTML);
    if ((finalFormattedText.trim() || hasPendingAttachment || hasStagedMedia) && !disabled && !isSpectator) {
      editorRef.current.innerHTML = '';
      setHasText(false);
      setIsSlashActive(false);
      setShowFormatBar(false);
      onSendMessageText(finalFormattedText);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: 0, gap: '6px' }}>
      {/* ── POPOVER DE AUTOCOMPLETE DE MENSAGENS RÁPIDAS (EXIBE NO MÁXIMO 3 SUGESTÕES) ── */}
      {isSlashActive && matchingQuickMessages.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: 0,
            width: '100%',
            maxWidth: '380px',
            background: isDarkMode ? '#1e293b' : '#ffffff',
            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Cabeçalho Limpo sem contagem e sem instrução cinza */}
          <div
            style={{
              padding: '8px 12px',
              background: isDarkMode ? '#0f172a' : '#f8fafc',
              borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#14A9D7',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={13} />
              <span>Mensagens Rápidas</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {matchingQuickMessages.map((qm, idx) => {
              const isSelected = idx === selectedQuickIndex;
              return (
                <div
                  key={qm.id}
                  onClick={() => applyQuickMessage(qm)}
                  onMouseEnter={() => setSelectedQuickIndex(idx)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    background: isSelected
                      ? (isDarkMode ? 'rgba(20, 169, 215, 0.18)' : '#e0f2fe')
                      : 'transparent',
                    borderLeft: isSelected ? '3px solid #14A9D7' : '3px solid transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    transition: 'all 0.1s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '0.80rem',
                        color: isSelected ? '#14A9D7' : (isDarkMode ? '#f8fafc' : '#0f172a'),
                      }}
                    >
                      /{qm.keyword}
                    </span>
                    <span style={{ fontSize: '0.64rem', color: isDarkMode ? '#64748b' : '#94a3b8' }}>
                      {qm.createdBy}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '0.74rem',
                      color: isDarkMode ? '#94a3b8' : '#64748b',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {qm.message}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── BARRA FLUTUANTE DE FORMATAÇÃO DIRETA NA SELEÇÃO DE TEXTO ── */}
      {showFormatBar && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: 0,
            zIndex: 1001,
          }}
        >
          <WhatsAppFormattingToolbar
            onExecFormat={handleExecFormat}
            isDarkMode={isDarkMode}
            position="floating"
          />
        </div>
      )}

      {/* ── CAMPO DE DIGITAÇÃO COM FORMATAÇÃO VISUAL DIRETA (SEM PRÉVIA FLUTUANTE) ── */}
      <div
        ref={editorRef}
        contentEditable={!disabled && !isSpectator}
        onInput={handleInput}
        onSelect={checkSelection}
        onKeyUp={checkSelection}
        onMouseUp={checkSelection}
        onKeyDown={handleKeyDown}
        data-placeholder={hasStagedMedia ? "Adicionar legenda... (opcional)" : hasPendingAttachment ? "Adicionar uma legenda à foto (opcional)..." : isSpectator ? "Modo espectador (apenas leitura)" : "Digite uma mensagem ou digite / para atalhos"}
        style={{
          flex: 1,
          minHeight: '24px',
          maxHeight: '120px',
          overflowY: 'auto',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: isDarkMode ? '#e9edef' : '#111b21',
          fontSize: '0.86rem',
          padding: '6px 4px',
          lineHeight: '1.45',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          cursor: (disabled || isSpectator) ? 'not-allowed' : 'text',
        }}
      />

      {(hasText || hasPendingAttachment || hasStagedMedia) ? (
        <button
          type="button"
          onClick={triggerSend}
          title="Enviar mensagem (Enter)"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: '#00a884',
            border: 'none',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 168, 132, 0.3)',
            flexShrink: 0,
          }}
        >
          <Send size={16} />
        </button>
      ) : (
        <button
          type="button"
          onClick={onStartAudioRecording}
          title="Gravar mensagem de voz"
          style={{
            background: 'transparent',
            border: 'none',
            color: isDarkMode ? '#8696a0' : '#54656f',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.15s ease',
            flexShrink: 0,
          }}
        >
          <Mic size={20} />
        </button>
      )}
    </div>
  );
});

export const AdminWhatsAppWorkspaceView: React.FC<AdminWhatsAppWorkspaceViewProps> = ({
  initialLeadId,
  onLeadOpened,
  activeFunnelId,
  searchQuery = '',
  leadOwnershipFilter,
  sortBy,
  onClose,
  isEmbeddedInFunnel = false,
  chatOnly = false,
  forcedSourceId,
  initialComposerTab,
  isPostSale = false,
  onOpenDebutanteApp,
  onOpenClientFullProfile,
  isMultiSelectActive,
  onToggleMultiSelect,
  selectedLeadIds: propSelectedLeadIds,
  onSelectedLeadIdsChange,
}) => {
  const {
    leads,
    clients,
    funnels,
    venues,
    sources,
    collaborators,
    currentUser,
    viewingAsCollaborator,
    theme,
    activeVenueId,
    updateLeadData,
    updateLeadActivity,
    addLeadNote,
    addClientNote,
    updateLeadStage,
    updateClientStage,
    updateClient,
    addClientDocument,
    addClientUpsellSale,
    updateClientUpsellSale,
    deleteClientUpsellSale,
    deleteLead,
    reassignLeadFunnel,
    mqlQuestions,
    tasks,
    addTask,
    updateTask,
    deleteTask,
    completeTaskWithFeedback,
    updateFunnel,
    addLeadActivity,
    markLeadAsRead,
    loadOlderLeadActivities,
    loadLeadConversationDays,
    prefetchLeadConversations,
    syncWhatsAppHistoryGap,
    systemSlaConfig,
  } = useAdminState();

  const hasIcpConfigured = (targetLead: Lead) => {
    // Lead ja respondido mantem o MQL da epoca; funil sem MQL vinculado = sem MQL
    if (targetLead.mqlSnapshot?.questions?.length) return true;
    if (!mqlQuestions || mqlQuestions.length === 0 || !targetLead.funnelId) return false;
    return mqlQuestions.some(q => q.funnelId === targetLead.funnelId || !!q.funnelIds?.includes(targetLead.funnelId as string));
  };

  const commercialFunnels = useMemo(() => {
    return (funnels || []).filter(f => !f.isPostSale && f.category !== 'Pós-Venda' && f.category !== 'pos_venda');
  }, [funnels]);

  const postSaleFunnels = useMemo(() => {
    return (funnels || []).filter(f =>
      f.isPostSale ||
      f.category === 'Pós-Venda' ||
      f.category === 'pos_venda' ||
      f.name?.toLowerCase().includes('pós-venda') ||
      f.name?.toLowerCase().includes('pos venda') ||
      f.name?.toLowerCase().includes('sucesso do cliente') ||
      f.name?.toLowerCase().includes('sucesso')
    );
  }, [funnels]);

  const [selectedFunnelId, setSelectedFunnelId] = useState<string>(() => {
    if (activeFunnelId) return activeFunnelId;
    if (isPostSale) return 'all_post_sale';
    const isUserPosVenda = currentUser?.role === 'pos_venda' ||
      (currentUser as any)?.primarySector === 'pos_venda' ||
      (currentUser as any)?.department === 'pos_venda';
    if (isUserPosVenda) return 'all_post_sale';

    try {
      const savedKey = `f5_wa_funnel_${currentUser?.id || 'default'}`;
      const saved = localStorage.getItem(savedKey);
      if (saved) return saved;
    } catch { }

    return 'all';
  });

  useEffect(() => {
    if (activeFunnelId) {
      setSelectedFunnelId(activeFunnelId);
    } else if (isPostSale) {
      setSelectedFunnelId('all_post_sale');
    } else if (selectedFunnelId && selectedFunnelId !== 'all' && selectedFunnelId !== 'all_commercial' && selectedFunnelId !== 'all_post_sale' && selectedFunnelId !== 'post_sale_default' && funnels.length > 0) {
      const exists = funnels.some(f => f.id === selectedFunnelId);
      if (!exists) {
        setSelectedFunnelId('all');
      }
    }
  }, [activeFunnelId, isPostSale, funnels, selectedFunnelId]);

  const handleSelectFunnel = (id: string) => {
    setSelectedFunnelId(id);
    setIsFunnelSelectOpen(false);
    try {
      localStorage.setItem(`f5_wa_funnel_${currentUser?.id || 'default'}`, id);
    } catch { }
  };

  const activeFunnel = (selectedFunnelId && selectedFunnelId !== 'all' && selectedFunnelId !== 'all_commercial' && selectedFunnelId !== 'all_post_sale' && selectedFunnelId !== 'post_sale_default')
    ? funnels.find(f => f.id === selectedFunnelId)
    : (activeFunnelId ? funnels.find(f => f.id === activeFunnelId) : null);

  const isPostSaleFunnel = Boolean(
    isPostSale ||
    selectedFunnelId === 'all_post_sale' ||
    selectedFunnelId === 'post_sale' ||
    selectedFunnelId === 'post_sale_default' ||
    activeFunnel?.isPostSale ||
    activeFunnel?.category === 'Pós-Venda' ||
    activeFunnel?.category === 'pos_venda' ||
    activeFunnel?.name?.toLowerCase().includes('pós-venda') ||
    activeFunnel?.name?.toLowerCase().includes('pos venda') ||
    activeFunnel?.name?.toLowerCase().includes('sucesso do cliente') ||
    activeFunnel?.name?.toLowerCase().includes('sucesso') ||
    activeFunnelId === 'post_sale_default' ||
    (activeFunnelId && activeFunnelId.includes('pos_venda')) ||
    (activeFunnelId && activeFunnelId.includes('post_sale')) ||
    (currentUser?.role === 'pos_venda' && (!selectedFunnelId || selectedFunnelId === 'all' || selectedFunnelId === 'all_post_sale' || selectedFunnelId === 'post_sale_default'))
  );
  const effectiveUser = viewingAsCollaborator || currentUser;
  const isReadOnlyForPosVenda = effectiveUser?.role === 'pos_venda' && !isPostSaleFunnel;

  const isManagerOrMaster = useMemo(() => {
    const user = viewingAsCollaborator || currentUser;
    if (!user) return false;
    const role = (user.role as string) || '';
    const roleTitle = ((user as any).roleTitle || '').toLowerCase();
    const department = ((user as any).department || '').toLowerCase();
    const sectors: string[] = (user && 'sectors' in user && Array.isArray((user as any).sectors) && (user as any).sectors.length > 0)
      ? (user as any).sectors
      : (role === 'admin' ? ['gerencia', 'comercial', 'pos_venda'] : role === 'pos_venda' ? ['pos_venda', 'comercial'] : ['comercial']);
    return (
      role === 'master' || 
      (role === 'admin' && sectors.includes('gerencia')) || 
      role === 'gerencia' || 
      role === 'gerente' || 
      department === 'gerencia' ||
      department === 'diretoria' ||
      sectors.includes('gerencia') ||
      sectors.includes('diretoria') ||
      roleTitle.includes('geren') || 
      roleTitle.includes('direto') ||
      Boolean((user as any).isDev)
    );
  }, [currentUser, viewingAsCollaborator]);

  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [isTransferVenueModalOpen, setIsTransferVenueModalOpen] = useState(false);
  const [isLinkContractorModalOpen, setIsLinkContractorModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(() => {
    if (initialLeadId) return initialLeadId;
    if (isEmbeddedInFunnel) return null;
    try {
      if (typeof window !== 'undefined') {
        const p = new URLSearchParams(window.location.search);
        const urlId = p.get('lead_id');
        if (urlId) return urlId;
      }
      const saved = localStorage.getItem(`f5_wa_selected_lead_${currentUser?.id || 'default'}`) || localStorage.getItem('f5_wa_active_lead_id');
      if (saved) return saved;
    } catch {}
    return null;
  });
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isFunnelSelectOpen, setIsFunnelSelectOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const funnelSelectRef = useRef<HTMLDivElement>(null);
  const isChatClosedByUserRef = useRef<boolean>(false);

  // Sincroniza persistência do lead aberto no WhatsApp para reload (F5) e URL
  useEffect(() => {
    try {
      const key = `f5_wa_selected_lead_${currentUser?.id || 'default'}`;
      if (selectedLeadId) {
        localStorage.setItem(key, selectedLeadId);
        localStorage.setItem('f5_wa_active_lead_id', selectedLeadId);
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.set('lead_id', selectedLeadId);
          window.history.replaceState({}, '', url.toString());
        }
      } else {
        localStorage.removeItem(key);
        localStorage.removeItem('f5_wa_active_lead_id');
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('lead_id');
          window.history.replaceState({}, '', url.toString());
        }
      }
    } catch {}
  }, [selectedLeadId, currentUser?.id]);

  // Audio 1: Sincroniza busca com o nome do lead selecionado e permite destravar ao limpar
  useEffect(() => {
    if (searchQuery) {
      setSearchTerm(searchQuery);
    }
  }, [searchQuery]);

  // Busca central do menu superior filtra a lista de conversas (modo standalone)
  useEffect(() => {
    if (isEmbeddedInFunnel) return;
    const onFilter = (e: Event) => setSearchTerm(String((e as CustomEvent).detail?.query ?? ''));
    window.addEventListener('f5_whatsapp_filter_query', onFilter);
    return () => window.removeEventListener('f5_whatsapp_filter_query', onFilter);
  }, [isEmbeddedInFunnel]);

  useEffect(() => {
    const handleGlobalFilter = (e: any) => {
      const q = e.detail?.query || '';
      setSearchTerm(q);
    };
    window.addEventListener('f5_crm_filter_query', handleGlobalFilter);
    return () => window.removeEventListener('f5_crm_filter_query', handleGlobalFilter);
  }, []);

  useEffect(() => {
    if (initialLeadId) {
      isChatClosedByUserRef.current = false;
      setSelectedLeadId(initialLeadId);
      if (onLeadOpened) {
        onLeadOpened();
      }
    }
  }, [initialLeadId, onLeadOpened]);

  const handleCloseActiveChat = () => {
    isChatClosedByUserRef.current = true;
    lastInitialLeadIdRef.current = undefined;
    setSelectedLeadId(null);
    setSearchTerm('');
    try {
      localStorage.removeItem('f5_wa_active_lead_id');
      if (currentUser?.id) {
        localStorage.removeItem(`f5_wa_selected_lead_${currentUser.id}`);
      }
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('lead_id');
        window.history.replaceState({}, '', url.toString());
      }
    } catch {}
    if (isEmbeddedInFunnel && onClose) {
      onClose();
    }
  };

  // Ordenação Local com Persistência
  const [localSortBy, setLocalSortBy] = useState<string>(() => {
    if (sortBy) return sortBy;
    try {
      const saved = localStorage.getItem(`f5_wa_sort_${currentUser?.id || 'default'}`);
      if (saved) return saved;
    } catch { }
    return 'waiting_time';
  });

  const [duplicateModalLead, setDuplicateModalLead] = useState<Lead | null>(null);

  const handleUpdateSortBy = (val: string) => {
    setLocalSortBy(val);
    try {
      localStorage.setItem(`f5_wa_sort_${currentUser?.id || 'default'}`, val);
    } catch { }
  };

  // Quick Filter Tabs State: 'open' | 'my' | 'all'
  const [quickFilter, setQuickFilter] = useState<'open' | 'my' | 'all'>(() => {
    try {
      const saved = localStorage.getItem(`f5_wa_quick_${currentUser?.id || 'default'}`);
      if (saved === 'open' || saved === 'my' || saved === 'all') return saved;
    } catch { }
    return 'open';
  });

  // Aba Fornecedores: so quem atua no pos-venda ou no financeiro (e a gerencia)
  const [suppliersTab, setSuppliersTab] = useState(false);
  const canSeeSuppliersTab = getUserTaskSectors(currentUser).some(sec => sec === 'pos_venda' || sec === 'financeiro');
  const [supplierPhoneKeys, setSupplierPhoneKeys] = useState<Set<string>>(new Set());
  const phoneKey = (p?: string | null) => String(p || '').replace(/\D/g, '').slice(-8);
  useEffect(() => {
    const mid = currentUser?.masterId || currentUser?.id;
    if (!canSeeSuppliersTab || !mid) return;
    let alive = true;
    void contactService.getSuppliers(mid).then(list => {
      if (!alive) return;
      const keys = new Set<string>();
      list.forEach(c => [c.primaryPhone, c.whatsappPhone, c.secondaryPhone].forEach(ph => { const k = phoneKey(ph); if (k.length === 8) keys.add(k); }));
      setSupplierPhoneKeys(keys);
    });
    const refresh = () => { void contactService.getSuppliers(mid).then(list => { if (!alive) return; const keys = new Set<string>(); list.forEach(c => [c.primaryPhone, c.whatsappPhone, c.secondaryPhone].forEach(ph => { const k = phoneKey(ph); if (k.length === 8) keys.add(k); })); setSupplierPhoneKeys(keys); }); };
    window.addEventListener('f5:suppliers-changed', refresh);
    return () => { alive = false; window.removeEventListener('f5:suppliers-changed', refresh); };
  }, [canSeeSuppliersTab, currentUser?.masterId, currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpdateQuickFilter = (val: 'open' | 'my' | 'all') => {
    setSuppliersTab(false);
    setQuickFilter(val);
    try {
      localStorage.setItem(`f5_wa_quick_${currentUser?.id || 'default'}`, val);
    } catch { }
  };

  // Focus / Drawer behavior based on entry point
  // Somente quando embutido no Kanban (funil comercial ou pos-venda) a ficha abre por padrao.
  // No modo WhatsApp (menu Mensagens) a conversa fica aberta e a ficha fechada, como no WhatsApp.
  const isOpenedFromCrmOrKanban = Boolean(isEmbeddedInFunnel);

  // Conversas de terceiros: so master/gerencia/admin/dev veem a aba "Todos" no modo WhatsApp.
  // Demais usuarios veem apenas leads proprios ou sem responsavel.
  const canSeeAllConversations = Boolean(
    isEmbeddedInFunnel ||
    currentUser?.role === 'gerencia' ||
    (currentUser as any)?.role === 'admin' ||
    (currentUser as any)?.role === 'master' ||
    (currentUser as any)?.isDev
  );

  // Side Drawer: Lead Inspector (Ficha do Lead / Contrato)
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(() => isOpenedFromCrmOrKanban && Boolean(initialLeadId));
  const [isReadOnlyModalOpen, setIsReadOnlyModalOpen] = useState(false);
  const [highlightMissingFields, setHighlightMissingFields] = useState<boolean>(false);

  // Coluna Lateral de Conversas: Recuada por padrão ao abrir pelo CRM / Kanban quando já há lead selecionado (Modo Foco)
  const isPostSaleWorkspace = Boolean(isPostSaleFunnel || isPostSale);
  const [isConversationsCollapsed, setIsConversationsCollapsed] = useState<boolean>(() => isOpenedFromCrmOrKanban && Boolean(initialLeadId));

  useEffect(() => {
    if (isOpenedFromCrmOrKanban && selectedLeadId) {
      setIsConversationsCollapsed(true);
      setIsInspectorOpen(true);
    }
  }, [selectedLeadId, isOpenedFromCrmOrKanban]);

  // Detailed Filters State
  const [filterVenueId, setFilterVenueId] = useState<string>('all');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterCollaboratorId, setFilterCollaboratorId] = useState<string>('all');
  const [filterTemperature, setFilterTemperature] = useState<string>('all');

  // Composer Mode: 'whatsapp' | 'notes' | 'tasks' | 'appointments' | 'upsell' | 'documents'
  const [composerTab, setComposerTab] = useState<'whatsapp' | 'notes' | 'tasks' | 'appointments' | 'upsell' | 'documents'>(initialComposerTab || 'whatsapp');

  useEffect(() => {
    if (initialComposerTab) {
      setComposerTab(initialComposerTab);
    }
  }, [initialComposerTab]);

  // Carregamento incremental sob demanda de mensagens do passado (reverse infinite scroll)
  const [isLoadingOlder, setIsLoadingOlder] = useState<boolean>(false);
  const [reachedBeginningMap, setReachedBeginningMap] = useState<Record<string, boolean>>({});
  const isFetchingOlderRef = useRef<boolean>(false);
  const loadOlderMessagesRef = useRef<() => void>(() => {});

  // Modais de Vendas & Upsell / Documentos / Detalhe de Tarefa
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<AdminTask | null>(null);
  const [isUpsellModalOpen, setIsUpsellModalOpen] = useState(false);
  const [editingUpsell, setEditingUpsell] = useState<ClientUpsellSale | null>(null);
  const [upsellTitle, setUpsellTitle] = useState('');
  const [upsellCategory, setUpsellCategory] = useState<string>('foto_video');
  const [upsellValue, setUpsellValue] = useState<string>('');
  const [upsellDate, setUpsellDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [upsellTime, setUpsellTime] = useState<string>(() => new Date().toTimeString().slice(0, 5));
  const [upsellResponsibleId, setUpsellResponsibleId] = useState<string>(() => currentUser?.id || '');
  const [upsellPaymentStatus, setUpsellPaymentStatus] = useState<'pago' | 'pendente' | 'parcelado'>('pago');
  const [upsellPaymentMethod, setUpsellPaymentMethod] = useState<string>('PIX');
  const [upsellNotes, setUpsellNotes] = useState('');

  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState<ClientDocument['type']>('contract');
  const [docFileUrl, setDocFileUrl] = useState('');
  const [docFileSize, setDocFileSize] = useState('');
  const [docFileName, setDocFileName] = useState('');
  const [docSizeBytes, setDocSizeBytes] = useState<number | undefined>(undefined);
  const [isDocUploading, setIsDocUploading] = useState(false);

  // WhatsApp / Note Text
  const [messageText, setMessageText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // Popups: Anexos, Emojis e Figurinhas (Stickers)
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [activeEmojiTab, setActiveEmojiTab] = useState<'emojis' | 'stickers'>('emojis');
  const [customStickers, setCustomStickers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('f5_custom_stickers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const attachmentMenuRef = useRef<HTMLDivElement>(null);

  // Anexo pendente no chat (ex: comprovante de agendamento compartilhado)
  const [pendingAttachment, setPendingAttachment] = useState<{
    leadId: string;
    dataUrl: string;
    fileName: string;
    caption?: string;
    timestamp: number;
  } | null>(null);
  const [previewAttachmentUrl, setPreviewAttachmentUrl] = useState<string | null>(null);

  // Mídia Estagiada para envio no chat (com suporte a legenda, preview e cancelamento)
  const [stagedMedia, setStagedMedia] = useState<{
    file: File;
    previewUrl: string;
    category: 'image' | 'video' | 'document' | 'audio';
    fileName: string;
    fileSize: number;
  } | null>(null);

  // Modal de Compartilhamento de Contato (vCard)
  const [isShareContactModalOpen, setIsShareContactModalOpen] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [customContactName, setCustomContactName] = useState('');
  const [customContactPhone, setCustomContactPhone] = useState('');

  // Recurso de Responder Mensagem (Quote / Reply)
  const [replyingToMessage, setReplyingToMessage] = useState<LeadActivity | null>(null);
  const [, setHighlightedMsgId] = useState<string | null>(null);

  // Limpa mensagem respondida e mídia estagiada ao alternar entre leads
  useEffect(() => {
    setReplyingToMessage(null);
    if (stagedMedia?.previewUrl) {
      URL.revokeObjectURL(stagedMedia.previewUrl);
    }
    setStagedMedia(null);
  }, [selectedLeadId]);

  // Escuta anexos do sessionStorage ou evento customizado ao carregar/trocar lead
  useEffect(() => {
    const checkPending = () => {
      try {
        const raw = sessionStorage.getItem('f5_pending_chat_attachment');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (!parsed.leadId || parsed.leadId === selectedLeadId)) {
            setPendingAttachment(parsed);
            sessionStorage.removeItem('f5_pending_chat_attachment');
          }
        }
      } catch {}
    };

    checkPending();

    const handleCustomAttach = (e: any) => {
      if (e.detail) {
        if (!e.detail.leadId || e.detail.leadId === selectedLeadId) {
          setPendingAttachment(e.detail);
        }
      }
    };

    window.addEventListener('f5_attach_to_chat', handleCustomAttach);
    return () => window.removeEventListener('f5_attach_to_chat', handleCustomAttach);
  }, [selectedLeadId]);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const attachmentButtonRef = useRef<HTMLButtonElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const fileDocInputRef = useRef<HTMLInputElement>(null);
  const fileMediaInputRef = useRef<HTMLInputElement>(null);
  const fileAudioInputRef = useRef<HTMLInputElement>(null);
  const fileStickerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleDismissPopups = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        isAttachmentMenuOpen &&
        attachmentMenuRef.current &&
        !attachmentMenuRef.current.contains(target) &&
        attachmentButtonRef.current &&
        !attachmentButtonRef.current.contains(target)
      ) {
        setIsAttachmentMenuOpen(false);
      }

      if (
        isEmojiPickerOpen &&
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(target) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(target)
      ) {
        setIsEmojiPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleDismissPopups);
    return () => document.removeEventListener('mousedown', handleDismissPopups);
  }, [isAttachmentMenuOpen, isEmojiPickerOpen]);

  // Live Real-Time WhatsApp Instance Statuses
  const [liveInstanceStatuses, setLiveInstanceStatuses] = useState<Record<string, {
    connected: boolean;
    status: string;
    avatar?: string;
    phone?: string;
    profileName?: string;
  }>>({});

  // Inline Task / Follow-up Completion State
  const [inlineCompletingTaskId, setInlineCompletingTaskId] = useState<string | null>(null);
  const [inlineResolutionText, setInlineResolutionText] = useState<string>('');
  const [inlineCompletingOutcome, setInlineCompletingOutcome] = useState<'success' | 'unsuccessful'>('success');

  // Tipos Oficiais de Follow-up (Idêntico ao Bloco de Notas Inteligente)
  const FOLLOWUP_TYPES = [
    'Follow-up WhatsApp',
    'Follow-up Ligação',
    'Envio de Proposta',
    'Reunião Comercial',
    'Negociação',
    'Fechamento',
  ];

  // Quick Follow-up Composer States
  const [quickFollowupType, setQuickFollowupType] = useState<string>('Follow-up WhatsApp');
  const [isQuickTypePickerOpen, setIsQuickTypePickerOpen] = useState(false);
  const [isCustomTypeEditing, setIsCustomTypeEditing] = useState(false);
  const [customTypeInput, setCustomTypeInput] = useState('');
  const quickTypePickerRef = useRef<HTMLDivElement>(null);

  const [quickFollowupDate, setQuickFollowupDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [quickFollowupTime, setQuickFollowupTime] = useState<string>('14:00');
  const [quickFollowupNote, setQuickFollowupNote] = useState<string>('');
  const [isQuickDatePickerOpen, setIsQuickDatePickerOpen] = useState(false);
  const [quickCalendarMonth, setQuickCalendarMonth] = useState<Date>(() => new Date());
  const quickDatePickerRef = useRef<HTMLDivElement>(null);

  // Popover de Prioridade individual nos cards de follow-up
  const [priorityMenuTaskId, setPriorityMenuTaskId] = useState<string | null>(null);
  const priorityMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutsidePriority = (e: MouseEvent) => {
      if (priorityMenuRef.current && !priorityMenuRef.current.contains(e.target as Node)) {
        setPriorityMenuTaskId(null);
      }
    };
    if (priorityMenuTaskId) {
      document.addEventListener('mousedown', handleClickOutsidePriority);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutsidePriority);
    };
  }, [priorityMenuTaskId]);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    const handleClickOutsideQuickType = (e: MouseEvent) => {
      if (quickTypePickerRef.current && !quickTypePickerRef.current.contains(e.target as Node)) {
        setIsQuickTypePickerOpen(false);
        setIsCustomTypeEditing(false);
      }
    };
    if (isQuickTypePickerOpen) {
      document.addEventListener('mousedown', handleClickOutsideQuickType);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideQuickType);
    };
  }, [isQuickTypePickerOpen]);

  useEffect(() => {
    const handleClickOutsideQuickDate = (e: MouseEvent) => {
      if (quickDatePickerRef.current && !quickDatePickerRef.current.contains(e.target as Node)) {
        setIsQuickDatePickerOpen(false);
      }
    };
    if (isQuickDatePickerOpen) {
      document.addEventListener('mousedown', handleClickOutsideQuickDate);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideQuickDate);
    };
  }, [isQuickDatePickerOpen]);

  const quickCalendarDays = useMemo(() => {
    const year = quickCalendarMonth.getFullYear();
    const month = quickCalendarMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: { day: number; dateStr: string; isCurrentMonth: boolean; isToday: boolean; isSelected: boolean }[] = [];

    // Mês anterior
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = month === 0 ? 12 : month;
      const y = month === 0 ? year - 1 : year;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === quickFollowupDate,
      });
    }

    // Mês atual
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === quickFollowupDate,
      });
    }

    // Próximo mês
    const totalSlots = 42; // sempre 6 semanas
    const remaining = totalSlots - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = month + 2 > 12 ? 1 : month + 2;
      const y = month + 2 > 12 ? year + 1 : year;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === quickFollowupDate,
      });
    }

    return days;
  }, [quickCalendarMonth, quickFollowupDate, todayStr]);

  const quickMonthTitle = useMemo(() => {
    const m = formatMonthYear(quickCalendarMonth);
    return m.charAt(0).toUpperCase() + m.slice(1);
  }, [quickCalendarMonth]);

  const formatQuickDateLabel = (dateStr: string) => {
    if (!dateStr) return 'Definir data';
    if (dateStr === todayStr) return 'Hoje';
    if (dateStr === tomorrowStr) return 'Amanhã';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return dateStr;
  };

  // Note Multimedia Attachments & Recording States
  const [isNoteRecording, setIsNoteRecording] = useState(false);
  const [isNoteAudioPaused, setIsNoteAudioPaused] = useState(false);
  const [noteRecordingSeconds, setNoteRecordingSeconds] = useState(0);
  const noteRecordingTimerRef = useRef<any>(null);
  const noteMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const noteAudioChunksRef = useRef<Blob[]>([]);
  const noteAudioStreamRef = useRef<MediaStream | null>(null);
  const noteDocInputRef = useRef<HTMLInputElement>(null);
  const noteMediaInputRef = useRef<HTMLInputElement>(null);
  const noteAudioInputRef = useRef<HTMLInputElement>(null);

  // Lightbox Modal para Fotos e Vídeos
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; type: 'image' | 'video'; title?: string } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxMedia(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isDarkMode = theme === 'dark' || currentUser?.theme === 'dark' || (typeof document !== 'undefined' && (document.body.classList.contains('admin-theme-dark') || document.documentElement.classList.contains('dark') || document.querySelector('.admin-theme-dark') !== null));

  // Tooltip de erro de mensagem
  const [copiedErrorId, setCopiedErrorId] = useState<string | null>(null);

  // Modal de Tarefas & Agendamentos (Padrão Unificado do Cliente)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<AdminTask | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<AdminTask | null>(null);
  const [completingTask, setCompletingTask] = useState<any | null>(null);

  // Timeline Scroll to Bottom Refs & Effects
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Multi-Select Mode States & Handlers (Sincronizado perfeitamente com o CRM / Funil)
  const [internalMultiSelectMode, setInternalMultiSelectMode] = useState(Boolean(isMultiSelectActive));
  const isMultiSelectMode = isMultiSelectActive !== undefined ? isMultiSelectActive : internalMultiSelectMode;
  const setIsMultiSelectMode = (action: React.SetStateAction<boolean>) => {
    const next = typeof action === 'function' ? action(isMultiSelectMode) : action;
    setInternalMultiSelectMode(next);
    onToggleMultiSelect?.(next);
  };

  const [internalSelectedLeadIds, setInternalSelectedLeadIds] = useState<string[]>([]);
  const selectedLeadIds = propSelectedLeadIds !== undefined ? propSelectedLeadIds : internalSelectedLeadIds;
  const setSelectedLeadIds = (action: React.SetStateAction<string[]>) => {
    const next = typeof action === 'function' ? action(selectedLeadIds) : action;
    setInternalSelectedLeadIds(next);
    onSelectedLeadIdsChange?.(next);
  };

  const [bulkStageModalOpen, setBulkStageModalOpen] = useState(false);
  const [bulkAssigneeModalOpen, setBulkAssigneeModalOpen] = useState(false);
  const [bulkFunnelModalOpen, setBulkFunnelModalOpen] = useState(false);

  const bulkAllowedStages = useMemo(() => {
    const targetFunnel = activeFunnel || funnels[0];
    let rawStages = targetFunnel?.stages || [];
    if (!isManagerOrMaster && effectiveUser?.id) {
      rawStages = rawStages.filter(st => {
        if (!st.allowedCollaboratorIds || st.allowedCollaboratorIds.length === 0) return true;
        return st.allowedCollaboratorIds.includes(effectiveUser.id);
      });
    }
    return rawStages;
  }, [activeFunnel, funnels, isManagerOrMaster, effectiveUser]);

  useEffect(() => {
    if (isMultiSelectActive !== undefined) {
      setInternalMultiSelectMode(isMultiSelectActive);
      if (!isMultiSelectActive && propSelectedLeadIds === undefined) {
        setInternalSelectedLeadIds([]);
      }
    }
  }, [isMultiSelectActive, propSelectedLeadIds]);

  const scrollToBottom = useCallback((behavior: 'auto' | 'smooth' = 'auto') => {
    if (timelineContainerRef.current) {
      timelineContainerRef.current.scrollTop = timelineContainerRef.current.scrollHeight;
    }
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
  }, []);

  // Menu de 3 Pontinhos no Card do Lead & Exclusão Direta
  const [activeLeadMenuId, setActiveLeadMenuId] = useState<string | null>(null);
  // Posicao do botao de 3 pontinhos: o menu abre em camada fixa (portal) para nao ser cortado pela lista nem ficar atras do campo de mensagem
  const [activeLeadMenuRect, setActiveLeadMenuRect] = useState<{ top: number; bottom: number; left: number } | null>(null);
  useEffect(() => {
    if (!activeLeadMenuId) return;
    const close = () => setActiveLeadMenuId(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); };
  }, [activeLeadMenuId]);
  const [leadToDeleteDirectly, setLeadToDeleteDirectly] = useState<Lead | null>(null);

  useEffect(() => {
    const handleClickOutsideMenu = () => setActiveLeadMenuId(null);
    window.addEventListener('click', handleClickOutsideMenu);
    return () => window.removeEventListener('click', handleClickOutsideMenu);
  }, []);

  // Sincronização e Recuperação de Histórico de Mensagens (Gap Catch-Up)
  const [isHistorySyncModalOpen, setIsHistorySyncModalOpen] = useState(false);
  const [syncTimeWindow, setSyncTimeWindow] = useState<number>(360); // 6 horas padrão
  const [isSyncingHistory, setIsSyncingHistory] = useState(false);
  const [syncHistoryResult, setSyncHistoryResult] = useState<{ recoveredCount: number; newLeadsCount: number; updatedLeadsCount: number } | null>(null);


  const handleRunHistorySync = async () => {
    setIsSyncingHistory(true);
    setSyncHistoryResult(null);
    try {
      const res = await syncWhatsAppHistoryGap({ timeWindowMinutes: syncTimeWindow });
      setSyncHistoryResult(res);
    } catch (err: any) {
      toast.error(`Erro ao sincronizar mensagens: ${err.message || 'Falha de conexão com a instância'}`);
    } finally {
      setIsSyncingHistory(false);
    }
  };

  // Recuperação sob demanda de mensagens com chave pendente [Undecryptable]
  const [resyncingLeadIds, setResyncingLeadIds] = useState<Set<string>>(new Set());
  const lastUndecryptableAutoResyncRef = useRef<Record<string, number>>({});

  const handleResyncUndecryptable = async (targetLead: Lead) => {
    if (!targetLead?.id || resyncingLeadIds.has(targetLead.id)) return;
    setResyncingLeadIds(prev => new Set(prev).add(targetLead.id));
    try {
      await syncWhatsAppHistoryGap({ timeWindowMinutes: 360, createMissingLeads: false });
    } catch (err) {
      console.warn('[Resync Undecryptable Warning]:', err);
    } finally {
      setResyncingLeadIds(prev => {
        const next = new Set(prev);
        next.delete(targetLead.id);
        return next;
      });
    }
  };



  const toggleLeadSelection = (leadId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedLeadIds(prev =>
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  const handleBulkMoveStage = (targetStage: CrmStage) => {
    selectedLeadIds.forEach(id => {
      updateLeadStage(id, targetStage);
    });
    setBulkStageModalOpen(false);
    setSelectedLeadIds([]);
    setIsMultiSelectMode(false);
  };

  const handleBulkAssignCollab = (collabId: string) => {
    const targetCollab = collaborators.find(c => c.id === collabId);
    if (!targetCollab) return;
    selectedLeadIds.forEach(id => {
      updateLeadData(id, {
        sdrId: targetCollab.id,
        sdrName: targetCollab.name,
        assignedTo: targetCollab.name,
      });
    });
    setBulkAssigneeModalOpen(false);
    setSelectedLeadIds([]);
    setIsMultiSelectMode(false);
  };

  const handleBulkMoveFunnel = async (targetFunnelId: string, targetStageId?: string) => {
    for (const id of selectedLeadIds) {
      await reassignLeadFunnel(id, targetFunnelId, targetStageId);
    }
    setBulkFunnelModalOpen(false);
    setSelectedLeadIds([]);
    setIsMultiSelectMode(false);
  };

  const handleBulkDelete = () => {
    if (confirm(`Deseja realmente excluir os ${selectedLeadIds.length} leads selecionados? Essa ação não pode ser desfeita.`)) {
      selectedLeadIds.forEach(id => {
        deleteLead(id);
      });
      setSelectedLeadIds([]);
      setIsMultiSelectMode(false);
    }
  };

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Close filter dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
      if (funnelSelectRef.current && !funnelSelectRef.current.contains(event.target as Node)) {
        setIsFunnelSelectOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter Active check (controls gear icon color)
  const isFilterActive = useMemo(() => {
    return filterVenueId !== 'all' || filterStage !== 'all' || filterCollaboratorId !== 'all' || filterTemperature !== 'all';
  }, [filterVenueId, filterStage, filterCollaboratorId, filterTemperature]);

  // Set de IDs dos colaboradores para identificação precisa de mensagens da equipe
  const collabIds = useMemo(() => new Set((collaborators || []).map(c => c.id)), [collaborators]);



  // Hora REAL da ultima mensagem (fonte unica: lista, ordenacao e SLA). Nunca updatedAt/createdAt/lastInteractionAt.
  const getLastMessageTime = (l: Lead) => getLeadConversationTime(l);

  // Client adapter for Post-Sale funnels
  const clientsAsLeads = useMemo<Lead[]>(() => {
    if (!isPostSaleFunnel) return [];
    const rawLeadsList = leads || [];

    // Mapeia telefones de leads por funil para unificação instantânea de mensagens de familiares
    const leadByFunnelPhone = new Map<string, Lead>();
    for (const l of rawLeadsList) {
      if (!l || !l.phone) continue;
      const d = l.phone.replace(/\D/g, '');
      if (d.length >= 8) {
        leadByFunnelPhone.set(`${l.funnelId || 'default'}|${d.slice(-8)}`, l);
      }
    }

    return (clients || []).map(c => {
      const pName = c.birthdayPersonName || c.name || 'Cliente';
      const cPayer = c.payerName || '';
      const formattedDisplayName = (cPayer && pName && cPayer.toLowerCase().trim() !== pName.toLowerCase().trim())
        ? `${cPayer.trim()} • ${pName.trim()}`
        : (cPayer.trim() || pName.trim() || 'Cliente');
      const cPhone = c.payerPhone || '';
      const cNotes = Array.isArray(c.notes) ? c.notes : [];

      // INIBIÇÃO ESTRITA: Conversas e históricos comerciais NUNCA são importados para o cliente de pós-venda.
      // O cliente preserva apenas suas próprias atividades pós-venda e a Passagem de Bastão.
      const clientDirectActivities: LeadActivity[] = (c as any).activities || [];
      const noteActivities = cNotes.map((n: any) => ({
        id: n.id || `note_${Date.now()}_${Math.random()}`,
        leadId: c.id,
        type: (n.type === 'whatsapp' || (typeof n.text === 'string' && n.text.toLowerCase().includes('whatsapp'))) ? ('contact' as const) : ('note' as const),
        title: n.title || 'Mensagem / Nota',
        text: n.text || '',
        timestamp: n.createdAt || new Date().toISOString(),
        authorName: n.authorName || 'Gestor de Sucesso',
      }));
      const mergedActivities = [...clientDirectActivities];
      for (const nAct of noteActivities) {
        if (!mergedActivities.some(a => a.id === nAct.id)) {
          mergedActivities.push(nAct);
        }
      }
      // UNIFICAÇÃO DE MENSAGENS DE TODOS OS NÚMEROS REGISTRADOS NO CONTRATO (Pós-Venda):
      // Busca mensagens no mesmo funil/instância para o telefone principal e para TODOS os contatos da família (mãe, pai, etc.)
      const cardPhones = new Set<string>();
      if (cPhone) {
        const d = cPhone.replace(/\D/g, '');
        if (d.length >= 8) cardPhones.add(d.slice(-8));
      }
      if (Array.isArray(c.contacts)) {
        c.contacts.forEach((ct: any) => {
          if (ct?.phone) {
            const cd = ct.phone.replace(/\D/g, '');
            if (cd.length >= 8) cardPhones.add(cd.slice(-8));
          }
        });
      }

      // Coleta atividades de todos os leads de familiares registrados neste contrato dentro do mesmo funil
      cardPhones.forEach(digits => {
        const key = `${c.funnelId || 'default'}|${digits}`;
        const fl = leadByFunnelPhone.get(key);
        if (fl && fl.id !== c.id) {
          const flActs = (fl.activities || []) as LeadActivity[];
          const cachedFlActs = leadService.getActivitiesFromCache(fl.id);
          const candidateActs = [...flActs];
          cachedFlActs.forEach(ca => {
            if (!candidateActs.some(a => a.id === ca.id)) candidateActs.push(ca);
          });

          if (candidateActs.length > 0) {
            mergedActivities.splice(0, mergedActivities.length, ...mergeAndSortActivities(mergedActivities, candidateActs, c.id));
          }
        }
      });

      mergedActivities.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Extrai última mensagem agregada da família para exibição no card da lista
      const lastContactAct = [...mergedActivities].reverse().find(a => a.type === 'contact' || (a as any).type === 'whatsapp');

      return {
        id: c.id,
        code: c.code || `CLI-${c.id.slice(0, 5).toUpperCase()}`,
        debutanteId: c.debutanteId || c.id,
        debutanteName: pName,
        debutanteSlug: c.debutanteSlug || c.id.slice(0, 8),
        name: formattedDisplayName,
        eventType: (c.eventType as LeadEventType) || undefined,
        phone: cPhone,
        email: c.payerEmail || '',
        age: c.birthdayPersonAge || 15,
        group: 'Pós-Venda',
        venueId: c.venueId || '',
        venueName: c.venueName,
        stage: (c.stage || 'onboarding') as unknown as CrmStage,
        dealValue: c.dealValue || c.baseContractValue || 0,
        contractValue: c.dealValue || c.baseContractValue || 0,
        baseContractValue: c.baseContractValue,
        partyDate: c.partyDate || c.eventDate || '',
        eventDate: c.eventDate || c.partyDate || '',
        funnelId: c.funnelId || 'post_sale_default',
        assignedTo: c.assignedSuccessManagerName || c.assignedTo || '',
        sdrId: c.assignedSuccessManagerId || c.assignedToId || '',
        sdrName: c.assignedSuccessManagerName || c.assignedTo || '',
        closerId: c.assignedSuccessManagerId || c.assignedToId || '',
        closerName: c.assignedSuccessManagerName || c.assignedTo || '',
        payerName: cPayer,
        payerPhone: cPhone,
        payerEmail: c.payerEmail || '',
        payerCpf: c.payerCpf || '',
        upsellSales: c.upsellSales || [],
        documents: c.documents || [],
        source: 'f5_system' as any,
        sourceName: 'F5 System',
        subSource: 'Sucesso do Cliente',
        temperature: undefined,
        isValidated: true,
        pointsGranted: 1,
        participants: [],
        tasks: [],
        createdAt: c.createdAt || c.contractDate || new Date().toISOString(),
        updatedAt: c.updatedAt || c.contractDate || new Date().toISOString(),
        activities: mergedActivities,
        lastMessageText: lastContactAct?.text || (c as any).lastMessageText,
        lastMessageAt: lastContactAct?.timestamp || (c as any).lastMessageAt,
        lastMessageDirection: (lastContactAct?.authorId === 'lead' || lastContactAct?.title?.toLowerCase().includes('recebid')) ? 'incoming' : 'outgoing',
        contacts: (c.contacts && c.contacts.length > 0) ? (c.contacts as any) : [
          {
            id: `payer_${c.id}`,
            name: cPayer,
            phone: cPhone,
            email: c.payerEmail || '',
            role: c.payerRelationship || 'decision_maker',
            isPrimaryDecisionMaker: true,
          }
        ],
        isClient: true,
      };
    });
  }, [isPostSaleFunnel, clients, leads, activeFunnelId]);

  const sourceLeads = useMemo(() => {
    const rawLeads = leads; // Usa estritamente leads (scopedLeads isolado por tenant)
    const combined = isPostSaleFunnel
      ? [...clientsAsLeads, ...filterExtraPostSaleLeads(rawLeads || [], clients || [], { forKanbanOnly: false })]
      : (rawLeads || []);

    // REGRA DE OURO DA INBOX:
    // Mesmo número em funis diferentes = cards legítimos e independentes (respeitando a esteira de cada funil)!
    // No MESMO funil com o MESMO número: NUNCA duplica card (elimina gêmeos na lista de mensagens).
    const seenFunnelPhones = new Map<string, Lead>();
    const deduped: Lead[] = [];

    for (const lead of combined) {
      if (!lead || !lead.id) continue;
      const phoneDigits = (lead.phone || '').replace(/\D/g, '').slice(-8);
      // Chave única de conversa: funil + últimos 8 dígitos do telefone (ou id se não tiver telefone)
      const chatKey = phoneDigits.length >= 8
        ? `${lead.funnelId || 'default'}|${phoneDigits}`
        : `id_${lead.id}`;

      const existing = seenFunnelPhones.get(chatKey);
      if (!existing) {
        seenFunnelPhones.set(chatKey, lead);
        deduped.push(lead);
      } else {
        // Se já existe um card com a mesma chave e o atual for o cliente oficial do pós-venda (com dados de contrato), ele substitui o lead solto
        if (lead.isClient && !existing.isClient) {
          const idx = deduped.findIndex(l => l.id === existing.id);
          if (idx !== -1) {
            deduped[idx] = lead;
          }
          seenFunnelPhones.set(chatKey, lead);
        }
      }
    }

    return deduped;
  }, [isPostSaleFunnel, clientsAsLeads, leads, clients, activeFunnel]);

  // Filtered Leads List
  const filteredLeads = useMemo(() => {
    const currentFunnel = activeFunnel;

    // For Post-Sale: only filter by global activeVenueId or filterVenueId, never by a commercial funnel's venueId
    const globalVenueFilter = (activeVenueId !== 'all' && activeVenueId !== 'multi') ? activeVenueId : null;

    const targetVenueId = isPostSaleFunnel
      ? (filterVenueId !== 'all' ? filterVenueId : globalVenueFilter)
      : (filterVenueId !== 'all' ? filterVenueId : globalVenueFilter);

    const term = (isEmbeddedInFunnel && searchQuery) ? searchQuery : searchTerm;
    const hasSearch = Boolean(term && term.trim());
    const cleanSearch = hasSearch ? term.toLowerCase().trim() : '';
    const cleanDigits = hasSearch ? cleanSearch.replace(/\D/g, '') : '';

    const scopedMasterId = effectiveUser?.masterId || currentUser?.masterId || effectiveUser?.id || currentUser?.id;
    const allowedVenueIds = new Set(venues.map(v => v.id));

    const result = sourceLeads.filter(lead => {
      // ── BLINDAGEM MULTI-TENANT (Defesa em Profundidade Absoluta) ──
      // Garante que o lead pertença obrigatoriamente às casas do usuário logado
      if (effectiveUser && !(effectiveUser as any).isDev) {
        if (lead.venueId && !allowedVenueIds.has(lead.venueId)) {
          return false;
        }
        if (!lead.venueId && lead.masterId && scopedMasterId && lead.masterId !== scopedMasterId) {
          return false;
        }
      }

      // Blindagem Estrita de Acesso por Etapa (Áudios 4 & 5):
      // Gerente e Master sempre têm acesso irrestrito a todas as etapas e funis.
      // Usuários normais só visualizam leads da etapa se ela não for restrita OU se o usuário estiver explicitamente em allowedCollaboratorIds.
      if (!isManagerOrMaster && effectiveUser?.id) {
        const leadFunnel = lead.funnelId ? funnels.find(f => f.id === lead.funnelId) : (currentFunnel || funnels[0]);
        if (leadFunnel && Array.isArray(leadFunnel.stages)) {
          const rawStage = String(lead.stage || '').trim().toLowerCase();
          const leadStageConfig = leadFunnel.stages.find(st => {
            const sId = String(st.id || '').trim().toLowerCase();
            const sKey = String((st as any).key || '').trim().toLowerCase();
            const sName = String(st.name || '').trim().toLowerCase();
            if (sId === rawStage || sKey === rawStage || sName === rawStage) return true;
            if ((!rawStage || rawStage === 'new_lead' || rawStage === 'onboarding' || rawStage.includes('entrada') || rawStage.includes('novo lead')) &&
                (sId === 'new_lead' || sId === 'onboarding' || sName.includes('entrada') || sName.includes('novo lead') || (st as any).isFixed)) {
              return true;
            }
            if ((rawStage.includes('conectad') || rawStage.includes('negocia') || rawStage === 'in_negotiation' || rawStage === 'qualificacao') &&
                (sId === 'in_negotiation' || sId === 'qualificacao' || sName.includes('conectad') || sName.includes('negocia'))) {
              return true;
            }
            if ((rawStage.includes('agendad') || rawStage.includes('visita') || rawStage === 'scheduled' || rawStage === 'meeting_scheduled') &&
                (sId === 'scheduled' || sId === 'meeting_scheduled' || Boolean(st.isMeetingStage) || sName.includes('agendad') || sName.includes('visita'))) {
              return true;
            }
            if ((rawStage.includes('degusta') || rawStage.includes('decis') || rawStage === 'decision' || rawStage === 'degustacao') &&
                (sId === 'decision' || sId === 'degustacao' || sName.includes('degusta') || sName.includes('decis'))) {
              return true;
            }
            if ((rawStage.includes('fechad') || rawStage.includes('ganho') || rawStage === 'deal_closed' || rawStage === 'contract_signed') &&
                (Boolean(st.isWon) || sId === 'deal_closed' || sId === 'contract_signed' || sName.includes('fechad') || sName.includes('ganho'))) {
              return true;
            }
            if ((rawStage.includes('perdid') || rawStage.includes('recusad') || rawStage.includes('cancelad') || rawStage === 'lost') &&
                (Boolean(st.isLoss) || sId === 'lost' || sName.includes('perdid') || sName.includes('recusad') || sName.includes('cancelad'))) {
              return true;
            }
            return false;
          }) || (!rawStage ? leadFunnel.stages[0] : undefined);

          if (leadStageConfig && Array.isArray(leadStageConfig.allowedCollaboratorIds) && leadStageConfig.allowedCollaboratorIds.length > 0) {
            if (!leadStageConfig.allowedCollaboratorIds.includes(effectiveUser.id)) {
              return false; // BLOQUEIO TOTAL E ABSOLUTO (inclusive na busca!)
            }
          }
        }
      }

      // 0. Se houver busca explícita digitada pelo usuário, ela tem precedência total na localização do lead:
      if (hasSearch) {
        const matchesName = (lead.name || '').toLowerCase().includes(cleanSearch);
        const leadDigits = (lead.phone || '').replace(/\D/g, '');
        const matchesPhone = cleanDigits.length >= 4 && (leadDigits.includes(cleanDigits) || (leadDigits.length >= 8 && cleanDigits.includes(leadDigits.slice(-8))));
        const matchesJid = Boolean(lead.whatsappJid && lead.whatsappJid.toLowerCase().includes(cleanSearch));
        const lidStr = (lead.whatsappLid || (lead.customFieldValues as any)?.whatsappLid || (lead.customFieldValues as any)?.whatsapp_lid || '');
        const matchesLid = Boolean(lidStr && (lidStr.toLowerCase().includes(cleanSearch) || (cleanDigits.length >= 4 && lidStr.replace(/\D/g, '').includes(cleanDigits))));
        const matchesDeb = (lead.debutanteName || '').toLowerCase().includes(cleanSearch);
        const matchesPayer = ((lead as any).payerName || '').toLowerCase().includes(cleanSearch);
        const matchesCode = (lead.code || '').toLowerCase().includes(cleanSearch);

        const isMatched = matchesName || matchesPhone || matchesJid || matchesLid || matchesDeb || matchesPayer || matchesCode;
        if (!isMatched) {
          return false;
        }
        return true;
      }

      // 1. Funnel Matching (Filtro Estrito por Funil)
      if (selectedFunnelId === 'all' || selectedFunnelId === 'all_commercial') {
        const lFunnel = lead.funnelId ? funnels.find(f => f.id === lead.funnelId) : null;
        const isLeadPostSale = lead.isClient || lead.group === 'Pós-Venda' || Boolean(lFunnel && (lFunnel.isPostSale || lFunnel.category === 'Pós-Venda' || lFunnel.category === 'pos_venda'));
        if (isLeadPostSale) {
          return false;
        }
      } else if (selectedFunnelId === 'all_post_sale') {
        const lFunnel = lead.funnelId ? funnels.find(f => f.id === lead.funnelId) : null;
        const isLeadPostSale = lead.isClient || lead.group === 'Pós-Venda' || Boolean(lFunnel && (lFunnel.isPostSale || lFunnel.category === 'Pós-Venda' || lFunnel.category === 'pos_venda'));
        if (!isLeadPostSale) {
          return false;
        }
      } else if (currentFunnel) {
        const leadFunnelMatches =
          lead.funnelId === currentFunnel.id ||
          lead.funnelId?.toLowerCase().trim() === currentFunnel.name.toLowerCase().trim() ||
          (!lead.funnelId && currentFunnel.isPrimary && !currentFunnel.isPostSale && currentFunnel.category !== 'Pós-Venda') ||
          ((!lead.funnelId || lead.funnelId === 'post_sale_default') && isPostSaleFunnel && (currentFunnel.id === 'post_sale_default' || currentFunnel.id === getDefaultPostSaleFunnelId(postSaleFunnels)));
        if (!leadFunnelMatches) {
          return false;
        }
      } else if (selectedFunnelId === 'post_sale_default') {
        const isDefault = lead.funnelId === 'post_sale_default' || !lead.funnelId || lead.isClient || lead.group === 'Pós-Venda';
        if (!isDefault) {
          return false;
        }
      }

      // Se o usuário filtrou explicitamente por uma casa específica no dropdown de filtro:
      if (filterVenueId !== 'all') {
        if (lead.venueId && lead.venueId !== filterVenueId) {
          if (lead.id !== selectedLeadId && lead.id !== initialLeadId) return false;
        }
      } else if (!currentFunnel && !isPostSaleFunnel) {
        // Se NÃO há funil específico selecionado (ex: "Todos os Funis Comerciais") e há filtro de unidade:
        if (targetVenueId && lead.venueId && lead.venueId !== targetVenueId) {
          // Se o lead pertence a um funil compartilhado que inclui targetVenueId, ele deve ser aceito
          const leadFunnel = funnels.find(f => f.id === lead.funnelId);
          const isSharedWithTarget = leadFunnel && (
            leadFunnel.venueId === targetVenueId ||
            (Array.isArray(leadFunnel.sharedVenueIds) && leadFunnel.sharedVenueIds.includes(targetVenueId)) ||
            (Array.isArray((leadFunnel as any).shared_venue_ids) && (leadFunnel as any).shared_venue_ids.includes(targetVenueId))
          );
          if (!isSharedWithTarget && lead.id !== selectedLeadId && lead.id !== initialLeadId) return false;
        }
      }

      // 2. Ownership / Quick Filter Tabs
      const effectiveOwnership = suppliersTab ? 'supplier' : ((isEmbeddedInFunnel && leadOwnershipFilter) ? leadOwnershipFilter : quickFilter);
      if (effectiveOwnership === 'supplier') {
        // Conversas de contatos marcados como fornecedor (nao importa quem atendeu)
        const phones = [lead.phone, ...((lead.contacts || []).map(ct => ct.phone))];
        if (!phones.some(ph => supplierPhoneKeys.has(phoneKey(ph)))) return false;
      } else if (effectiveOwnership === 'open') {
        // Estritamente leads SEM RESPONSÁVEL comercial atribuído
        const hasAssignee = Boolean(
          lead.assignedTo || 
          lead.sdrId || 
          lead.closerId || 
          (lead.sdrName && lead.sdrName.trim()) || 
          (lead.closerName && lead.closerName.trim())
        );
        if (hasAssignee && lead.id !== selectedLeadId && lead.id !== initialLeadId) {
          return false;
        }

        const s = lead.stage as string;
        if (isPostSaleFunnel) {
          if (s === 'completed' || s === 'festa_realizada' || s === 'lost' || s === 'cancelado' || s === 'archived') {
            if (lead.id !== selectedLeadId && lead.id !== initialLeadId) {
              return false;
            }
          }
        } else {
          if (s === 'contract_signed' || s === 'deal_closed' || s === 'contrato_fechado' || s === 'lost' || s === 'cancelado') {
            if (lead.id !== selectedLeadId && lead.id !== initialLeadId) {
              return false;
            }
          }
        }
      } else if (effectiveOwnership === 'my' || effectiveOwnership === 'mine') {
        const targetUserId = effectiveUser?.id || currentUser?.id;
        const targetUserName = (effectiveUser?.name || currentUser?.name || '').trim().toLowerCase();
        if (isPostSaleFunnel) {
          const isMyClient =
            Boolean(targetUserId && (lead.sdrId === targetUserId || lead.closerId === targetUserId || lead.assignedTo === targetUserId)) ||
            Boolean(targetUserName && (
              (lead.assignedTo && lead.assignedTo.trim().toLowerCase() === targetUserName) ||
              (lead.sdrName && lead.sdrName.trim().toLowerCase() === targetUserName)
            ));
          if (!isMyClient && lead.id !== selectedLeadId && lead.id !== initialLeadId) return false;
        } else {
          // Estritamente leads atribuídos ao usuário logado (NUNCA trazer leads de terceiros)
          const isMyLead =
            Boolean(targetUserId && (lead.sdrId === targetUserId || lead.closerId === targetUserId || lead.assignedTo === targetUserId)) ||
            Boolean(targetUserName && (
              (lead.assignedTo && lead.assignedTo.trim().toLowerCase() === targetUserName) ||
              (lead.sdrName && lead.sdrName.trim().toLowerCase() === targetUserName) ||
              (lead.closerName && lead.closerName.trim().toLowerCase() === targetUserName)
            ));
          if (!isMyLead && lead.id !== selectedLeadId && lead.id !== initialLeadId) return false;
        }
      } else if (!canSeeAllConversations) {
        // "Todos" para usuario comum: apenas leads proprios ou ainda sem responsavel
        const targetUserId = effectiveUser?.id || currentUser?.id;
        const targetUserName = (effectiveUser?.name || currentUser?.name || '').trim().toLowerCase();
        const hasAssignee = Boolean(
          lead.assignedTo || lead.sdrId || lead.closerId ||
          (lead.sdrName && lead.sdrName.trim()) || (lead.closerName && lead.closerName.trim())
        );
        const isMine =
          Boolean(targetUserId && (lead.sdrId === targetUserId || lead.closerId === targetUserId || lead.assignedTo === targetUserId)) ||
          Boolean(targetUserName && (
            (lead.assignedTo && lead.assignedTo.trim().toLowerCase() === targetUserName) ||
            (lead.sdrName && lead.sdrName.trim().toLowerCase() === targetUserName) ||
            (lead.closerName && lead.closerName.trim().toLowerCase() === targetUserName)
          ));
        if (hasAssignee && !isMine && lead.id !== selectedLeadId && lead.id !== initialLeadId) return false;
      }

      // 3. Specific venue filter
      if (filterVenueId !== 'all' && lead.venueId !== filterVenueId) {
        if (lead.id !== selectedLeadId && lead.id !== initialLeadId) return false;
      }

      // 4. Stage filter
      if (filterStage !== 'all' && lead.stage !== filterStage) {
        if (lead.id !== selectedLeadId && lead.id !== initialLeadId) return false;
      }

      // 5. Collaborator filter
      if (filterCollaboratorId !== 'all') {
        const matchesSdr = lead.sdrId === filterCollaboratorId;
        const matchesCloser = lead.closerId === filterCollaboratorId;
        const matchesAssigned = lead.assignedTo === filterCollaboratorId;
        if (!matchesSdr && !matchesCloser && !matchesAssigned && lead.id !== selectedLeadId && lead.id !== initialLeadId) return false;
      }

      // 6. Temperature filter (only for commercial leads)
      if (!isPostSaleFunnel && filterTemperature !== 'all' && lead.temperature !== filterTemperature) {
        if (lead.id !== selectedLeadId && lead.id !== initialLeadId) return false;
      }

      return true;
    });

    return result.sort((a, b) => {
      const effectiveSort = (isEmbeddedInFunnel && sortBy) ? sortBy : localSortBy;

      if (effectiveSort === 'waiting_time') {
        const waitA = getLeadPendingWaitingTime(a, collabIds);
        const waitB = getLeadPendingWaitingTime(b, collabIds);

        const hasPendingA = waitA > 0;
        const hasPendingB = waitB > 0;

        // 1. Leads com mensagem pendente do cliente ficam no topo absoluto
        if (hasPendingA && hasPendingB) {
          // Maior tempo de espera no topo (quem espera há mais tempo primeiro)
          return waitB - waitA;
        }
        if (hasPendingA && !hasPendingB) return -1;
        if (!hasPendingA && hasPendingB) return 1;

        // 2. Leads SEM pendência (já respondidos pela equipe ou sem mensagens trocadas):
        // Ficam estritamente abaixo dos pendentes, ordenados pela mensagem/atividade mais recente
        return getLastMessageTime(b) - getLastMessageTime(a);
      }

      if (effectiveSort === 'party_date') {
        const timeA = (a.partyDate || a.eventDate) ? new Date((a.partyDate || a.eventDate) + 'T12:00:00').getTime() : 9999999999999;
        const timeB = (b.partyDate || b.eventDate) ? new Date((b.partyDate || b.eventDate) + 'T12:00:00').getTime() : 9999999999999;
        return timeA - timeB;
      }
      if (effectiveSort === 'highest_value') {
        const valA = a.dealValue || 0;
        const valB = b.dealValue || 0;
        return valB - valA;
      }
      if (effectiveSort === 'alphabetical' || effectiveSort === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (effectiveSort === 'name_desc') {
        return (b.name || '').localeCompare(a.name || '');
      }
      if (effectiveSort === 'recent' || effectiveSort === 'message_recent') {
        return getLastMessageTime(b) - getLastMessageTime(a);
      }
      if (effectiveSort === 'message_oldest') {
        return getLastMessageTime(a) - getLastMessageTime(b);
      }
      if (effectiveSort === 'temperature') {
        const tempOrder: Record<string, number> = { hot: 3, warm: 2, cold: 1 };
        const scoreA = tempOrder[a.temperature || 'cold'] || 0;
        const scoreB = tempOrder[b.temperature || 'cold'] || 0;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return getLastMessageTime(b) - getLastMessageTime(a);
      }
      if (effectiveSort === 'oldest') {
        return new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime();
      }
      return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
    });
  }, [canSeeAllConversations, sourceLeads, activeFunnel, selectedFunnelId, postSaleFunnels, funnels, activeVenueId, isPostSaleFunnel, quickFilter, leadOwnershipFilter, sortBy, localSortBy, filterVenueId, filterStage, filterCollaboratorId, filterTemperature, searchTerm, searchQuery, currentUser, effectiveUser, viewingAsCollaborator, selectedLeadId, initialLeadId, isEmbeddedInFunnel, collabIds, suppliersTab, supplierPhoneKeys]);

  // ── Janela da caixa de entrada (como o WhatsApp Web): 40 conversas e +10 a cada rolagem ──────────────
  // As 20 ultimas mensagens de cada conversa visivel (e das proximas 10) sao pre-carregadas em lote para abrir sem "carregando".
  const INBOX_INITIAL = 40;
  const INBOX_STEP = 10;
  const [visibleCount, setVisibleCount] = useState(INBOX_INITIAL);
  const inboxSentinelRef = useRef<HTMLDivElement>(null);
  const inboxFilterSignature = `${suppliersTab ? 'forn' : ''}${quickFilter}|${filterVenueId}|${filterCollaboratorId}|${filterTemperature}|${filterStage}|${searchTerm}|${searchQuery}|${localSortBy}|${selectedFunnelId}|${leadOwnershipFilter}`;
  useEffect(() => { setVisibleCount(INBOX_INITIAL); }, [inboxFilterSignature]);
  // Conversa selecionada fora da janela: amplia a janela para ela aparecer
  useEffect(() => {
    if (!selectedLeadId) return;
    const idx = filteredLeads.findIndex(l => l.id === selectedLeadId);
    if (idx >= visibleCount) setVisibleCount(idx + INBOX_STEP);
  }, [selectedLeadId, filteredLeads]); // eslint-disable-line react-hooks/exhaustive-deps
  const visibleLeads = useMemo(() => filteredLeads.slice(0, visibleCount), [filteredLeads, visibleCount]);
  useEffect(() => {
    void prefetchLeadConversations(filteredLeads.slice(0, visibleCount + INBOX_STEP).map(l => l.id), 20);
  }, [filteredLeads, visibleCount, prefetchLeadConversations]);

  useEffect(() => {
    const el = inboxSentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) setVisibleCount(c => c + INBOX_STEP);
    }, { rootMargin: '300px' });
    io.observe(el);
    return () => io.disconnect();
  }, [visibleCount, filteredLeads.length]);

  const lastInitialLeadIdRef = useRef<string | undefined>(initialLeadId);

  // Sincronização inteligente de seleção: preserva a escolha manual do usuário e do lead recém-criado
  useEffect(() => {
    // Se o usuário fechou intencionalmente a conversa e não há seleção ativa, respeita o fechamento
    if (isChatClosedByUserRef.current && !selectedLeadId) {
      return;
    }

    // Se o initialLeadId mudou externamente (ex: clicou em outro lead pelo Kanban ou lista)
    if (initialLeadId && initialLeadId !== lastInitialLeadIdRef.current) {
      lastInitialLeadIdRef.current = initialLeadId;
      isChatClosedByUserRef.current = false;
      setSelectedLeadId(initialLeadId);
      if (onLeadOpened) {
        onLeadOpened();
      }
      return;
    }

    // Se ainda não temos seleção mas temos initialLeadId válido presente em filteredLeads
    if (!selectedLeadId && initialLeadId && filteredLeads.some(l => l.id === initialLeadId)) {
      isChatClosedByUserRef.current = false;
      setSelectedLeadId(initialLeadId);
      if (onLeadOpened) {
        onLeadOpened();
      }
      return;
    }

    // Se o lead selecionado ainda existe na lista filtrada, preserva estritamente a escolha manual do usuário!
    if (selectedLeadId && filteredLeads.some(l => l.id === selectedLeadId)) {
      return;
    }

    // Se o lead selecionado existe no banco/sourceLeads, preserva a seleção (evita reset no reload)
    if (selectedLeadId && sourceLeads.some(l => l.id === selectedLeadId)) {
      return;
    }

    // Fallback: se não há seleção válida e o usuário NÃO fechou intencionalmente a conversa, seleciona o primeiro disponível
    // (Apenas no modo WhatsApp standalone; quando embutido no Kanban, abre vazio aguardando o clique do usuário)
    if (!selectedLeadId && !isChatClosedByUserRef.current && filteredLeads.length > 0) {
      if (!isEmbeddedInFunnel) {
        setSelectedLeadId(filteredLeads[0].id);
      }
    } else if (!selectedLeadId) {
      setSelectedLeadId(null);
    }
  }, [filteredLeads, sourceLeads, initialLeadId, selectedLeadId, isEmbeddedInFunnel, onLeadOpened]);

  const selectedLead = useMemo(() => {
    return sourceLeads.find(l => l.id === selectedLeadId) || null;
  }, [sourceLeads, selectedLeadId]);

  // Carrega imediatamente as atividades do lead/cliente selecionado quando aberto
  useEffect(() => {
    if (!selectedLeadId) return;
    const currentActs = selectedLead?.activities || [];
    const hasChat = currentActs.some(a => a.type === 'contact' || (a as any).type === 'whatsapp');
    if (!hasChat) {
      void prefetchLeadConversations([selectedLeadId], 40);
    }
  }, [selectedLeadId, selectedLead?.activities, prefetchLeadConversations]);

  // Contrato Mestre de Pós-Venda associado ao lead selecionado (ex: Carla Nogueira vinculada ao contrato do Antônio / Vitória)
  const targetContractClient = useMemo(() => {
    if (!selectedLead) return null;
    if ((selectedLead as any).contractNumber || (selectedLead as any).contractTitle) {
      return selectedLead;
    }
    const contractRefId = (selectedLead as any).associated_contract_id || (selectedLead as any).contractId;
    if (contractRefId) {
      const found = clients.find(cl => (cl.id === contractRefId || (cl as any).contractNumber === contractRefId) && (!selectedLead.funnelId || !cl.funnelId || cl.funnelId === selectedLead.funnelId));
      if (found) return found;
    }
    if (selectedLead.phone) {
      const lDigits = selectedLead.phone.replace(/\D/g, '').slice(-8);
      if (lDigits.length >= 8) {
        const found = clients.find(cl => {
          // BLINDAGEM DE FUNIL: Nunca associar cliente/contrato de outro funil!
          if (selectedLead.funnelId && cl.funnelId && cl.funnelId !== selectedLead.funnelId) return false;
          if (cl.payerPhone && cl.payerPhone.replace(/\D/g, '').slice(-8) === lDigits) return true;
          if (Array.isArray(cl.contacts) && cl.contacts.some(ct => ct.phone && ct.phone.replace(/\D/g, '').slice(-8) === lDigits)) return true;
          return false;
        });
        if (found) return found;
      }
    }
    return selectedLead;
  }, [selectedLead, clients]);

  const isPostSaleNoContract = useMemo(() => {
    if (!selectedLead) return false;
    const isPost = Boolean(isPostSaleFunnel || isPostSale || selectedLead.isClient || selectedLead.group === 'Pós-Venda');
    if (!isPost) return false;
    const hasCt = Boolean(
      (selectedLead as any)?.contractId ||
      (selectedLead as any)?.hasContract ||
      (targetContractClient && (targetContractClient as any).contractNumber) ||
      clients.some(c => (c.id === selectedLead.id || (c as any).leadId === selectedLead.id) && Boolean((c as any).hasContract || (c as any).contractId))
    );
    return !hasCt;
  }, [selectedLead, isPostSaleFunnel, isPostSale, clients, targetContractClient]);
  usePresenceContext(selectedLead ? { type: (selectedLead as any).isClient ? 'client' : 'lead', id: selectedLead.id, label: selectedLead.debutanteName } : null);

  useEffect(() => {
    // Modo foco (lista recolhida) so quando embutido no Kanban; no menu Mensagens a lista fica sempre aberta
    if (isOpenedFromCrmOrKanban && (isPostSaleWorkspace || (selectedLead && (selectedLead as any).isClient)) && selectedLeadId) {
      setIsConversationsCollapsed(true);
    }
  }, [selectedLeadId, isPostSaleWorkspace, selectedLead, isOpenedFromCrmOrKanban]);

  // ── ABAS SETORIAIS DE WHATSAPP (COMERCIAL E PÓS-VENDA) ─────────────────────────────
  const isPostSaleChat = Boolean(isPostSaleFunnel || selectedLead?.isClient);

  // Funil ativo que contém as configurações de canais setoriais (tanto comercial quanto pós-venda)
  const activeChannelsFunnel = useMemo(() => {
    if (activeFunnel) {
      return activeFunnel;
    }
    if (selectedLead?.funnelId) {
      const f = funnels.find(fun => fun.id === selectedLead.funnelId);
      if (f) return f;
    }
    const targetVenue = selectedLead?.venueId || activeVenueId;
    return funnels.find(f => (
      !targetVenue || targetVenue === 'all' || f.venueId === targetVenue || (Array.isArray(f.sharedVenueIds) && f.sharedVenueIds.includes(targetVenue))
    )) || null;
  }, [activeFunnel, selectedLead?.funnelId, selectedLead?.venueId, activeVenueId, funnels]);

  const [activePostSaleChannelId, setActivePostSaleChannelId] = useState<string>('geral');
  const [isPostSaleChannelModalOpen, setIsPostSaleChannelModalOpen] = useState(false);
  const [editingPostSaleChannel, setEditingPostSaleChannel] = useState<PostSaleChannelConfig | null>(null);

  const isMasterOrManager = Boolean(
    currentUser?.role === 'gerencia' || 
    (currentUser as any)?.role === 'admin' || 
    (currentUser as any)?.role === 'master' ||
    (currentUser as any)?.isDev
  );

  const isGeneralHidden = Boolean(activeChannelsFunnel?.hideGeneralChannel);

  const allPostSaleChannels = useMemo(() => {
    const raw = (activeChannelsFunnel?.postSaleChannels || (activeChannelsFunnel as any)?.duplicateRuleConfig?._postSaleChannels || []) as PostSaleChannelConfig[];
    return raw;
  }, [activeChannelsFunnel]);

  const visiblePostSaleChannels = useMemo(() => {
    if (isMasterOrManager) return allPostSaleChannels;
    return allPostSaleChannels.filter(c => 
      !c.allowedCollaboratorIds || 
      c.allowedCollaboratorIds.length === 0 || 
      c.allowedCollaboratorIds.includes(currentUser?.id || '')
    );
  }, [allPostSaleChannels, isMasterOrManager, currentUser?.id]);

  const activePostSaleChannel = useMemo(() => {
    if (activePostSaleChannelId === 'geral') return null;
    return allPostSaleChannels.find(c => c.id === activePostSaleChannelId) || null;
  }, [allPostSaleChannels, activePostSaleChannelId]);

  const forcedSource = useMemo(() => (forcedSourceId ? (sources || []).find(s => s.id === forcedSourceId) || null : null), [forcedSourceId, sources]);
  const channelExclusiveSource = useMemo(() => {
    if (forcedSource) return forcedSource;
    if (!activePostSaleChannel?.instanceId) return null;
    return (sources || []).find(s => s.id === activePostSaleChannel.instanceId) || null;
  }, [forcedSource, activePostSaleChannel?.instanceId, sources]);

  // Se a aba geral estiver oculta e estiver no 'geral', chaveia para o primeiro canal visível
  useEffect(() => {
    if (isGeneralHidden && activePostSaleChannelId === 'geral' && visiblePostSaleChannels.length > 0) {
      setActivePostSaleChannelId(visiblePostSaleChannels[0].id);
    } else if (activePostSaleChannelId !== 'geral') {
      const exists = visiblePostSaleChannels.some(c => c.id === activePostSaleChannelId);
      if (!exists) {
        setActivePostSaleChannelId(isGeneralHidden && visiblePostSaleChannels.length > 0 ? visiblePostSaleChannels[0].id : 'geral');
      }
    }
  }, [isGeneralHidden, visiblePostSaleChannels, activePostSaleChannelId]);

  const handleSavePostSaleChannel = (channel: PostSaleChannelConfig) => {
    if (!activeChannelsFunnel) return;
    const currentList = activeChannelsFunnel.postSaleChannels || [];
    const existingIndex = currentList.findIndex(c => c.id === channel.id);
    let updated: PostSaleChannelConfig[];
    if (existingIndex >= 0) {
      updated = currentList.map(c => c.id === channel.id ? channel : c);
    } else {
      updated = [...currentList, channel];
    }
    updateFunnel(activeChannelsFunnel.id, {
      postSaleChannels: updated,
      duplicateRuleConfig: {
        ...(activeChannelsFunnel.duplicateRuleConfig || {}),
        _postSaleChannels: updated,
      }
    } as any);
    setActivePostSaleChannelId(channel.id);
  };

  const handleDeletePostSaleChannel = (channelId: string) => {
    if (!activeChannelsFunnel) return;
    const updated = (activeChannelsFunnel.postSaleChannels || []).filter(c => c.id !== channelId);
    updateFunnel(activeChannelsFunnel.id, {
      postSaleChannels: updated,
      duplicateRuleConfig: {
        ...(activeChannelsFunnel.duplicateRuleConfig || {}),
        _postSaleChannels: updated,
      }
    } as any);
    if (activePostSaleChannelId === channelId) {
      setActivePostSaleChannelId(isGeneralHidden && updated.length > 0 ? updated[0].id : 'geral');
    }
  };

  const handleToggleHideGeneralChannel = (hide: boolean) => {
    if (!activeChannelsFunnel) return;
    updateFunnel(activeChannelsFunnel.id, {
      hideGeneralChannel: hide,
    } as any);
    if (hide && activePostSaleChannelId === 'geral' && visiblePostSaleChannels.length > 0) {
      setActivePostSaleChannelId(visiblePostSaleChannels[0].id);
    }
  };

  useEffect(() => {
    try {
      const openSection = localStorage.getItem('f5_wa_open_section');
      if (openSection) {
        localStorage.removeItem('f5_wa_open_section');
        if (openSection === 'followup' || openSection === 'tasks') {
          setIsInspectorOpen(true);
          setComposerTab('tasks');
        } else if (openSection === 'won_missing') {
          setIsInspectorOpen(true);
          setHighlightMissingFields(true);
        }
      }
    } catch {}
  }, [selectedLead?.id]);

  // Download manual sob demanda de mídia recuperada (Economia de Storage)
  const [downloadingMediaIds, setDownloadingMediaIds] = useState<Set<string>>(new Set());
  // Etapa atual do download híbrido (API -> celular) e último motivo de falha, por mensagem, para o card mostrar o que acontece
  const [mediaStageById, setMediaStageById] = useState<Record<string, string>>({});
  const [mediaFailNoteById, setMediaFailNoteById] = useState<Record<string, string>>({});
  // Audios/imagens que nao carregam (URL expirada, arquivo vazio): viram o cartao "toque para sincronizar"
  const [brokenMediaIds, setBrokenMediaIds] = useState<Set<string>>(new Set());
  const markMediaBroken = React.useCallback((id: string) => {
    setBrokenMediaIds(prev => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  const handleManualDownloadMedia = async (act: LeadActivity) => {
    if (!selectedLead || downloadingMediaIds.has(act.id)) return;
    // Ids da UAZAPI (completo owner:messageid e curto). Nunca usa o UUID interno da atividade.
    const messageIds = mediaIdsOf(act);
    if (messageIds.length === 0) {
      toast.warning('Esta mensagem não tem identificador da UAZAPI salvo. Sincronize o histórico novamente para recuperá-lo.');
      return;
    }

    // Chip correto: origem gravada na própria mensagem > origem do lead > única instância do tenant
    const meta: any = act.metadata || {};
    const whatsappSources = (sources || []).filter(s => s.type === 'whatsapp_api' && s.whatsappInstanceId);
    const messageSource =
      whatsappSources.find(s => s.id === (meta.sourceId || meta.senderSourceId || (act as any).instanceId)) ||
      whatsappSources.find(s => s.id === selectedLead.sourceId) ||
      (whatsappSources.length === 1 ? whatsappSources[0] : undefined);
    const instanceToken = messageSource?.whatsappInstanceId || meta.instanceToken || '';

    if (!instanceToken) {
      toast.warning('Não foi possível identificar o chip do WhatsApp desta mensagem. Abra a origem correta e tente de novo.');
      return;
    }

    setDownloadingMediaIds(prev => new Set(prev).add(act.id));
    setMediaFailNoteById(prev => { const n = { ...prev }; delete n[act.id]; return n; });

    // Âncora do history-sync: mensagem mais NOVA do mesmo chat com id da UAZAPI (o pedido traz as mensagens anteriores a ela)
    const actTime = new Date(act.timestamp || 0).getTime();
    const anchorAct = (selectedLead.activities || [])
      .filter(a => a.id !== act.id && new Date(a.timestamp || 0).getTime() > actTime && mediaIdsOf(a).length > 0)
      .sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime())[0];
    const leadDigits = String(selectedRecipientPhone || selectedLead.phone || '').replace(/\D/g, '');
    const anchor = leadDigits.length >= 8 && anchorAct
      ? {
          number: `${leadDigits}@s.whatsapp.net`,
          messageid: mediaIdsOf(anchorAct)[0],
          timestamp: new Date(anchorAct.timestamp).getTime(),
          fromMe: anchorAct.authorId === 'whatsapp_mobile' || (anchorAct.title || '').toLowerCase().includes('enviad'),
        }
      : undefined;
    const stageText: Record<string, string> = {
      api: 'Baixando pela API...',
      phone: 'Pedindo ao celular...',
      retry: 'Aguardando o celular enviar...',
    };

    try {
      const res = await whatsappMediaService.ingestWithPhoneFallback({
        instanceToken,
        messageId: messageIds[0],
        fallbackMessageIds: messageIds.slice(1),
        instanceId: messageSource?.id || 'default', // pasta no R2 por origem (nunca o token)
        transcribeAudio: false,
      }, {
        anchor,
        onStage: (stage) => setMediaStageById(prev => ({ ...prev, [act.id]: stageText[stage] })),
      });

      if (res.permanentR2Url) {
        const updatedActivities = (selectedLead.activities || []).map(a => {
          if (a.id === act.id) {
            return {
              ...a,
              mediaUrl: res.permanentR2Url,
              needsManualDownload: false,
              metadata: {
                ...(a.metadata || {}),
                needsManualDownload: false,
                permanentR2Url: res.permanentR2Url,
              }
            };
          }
          return a;
        });

        updateLeadData(selectedLead.id, { activities: updatedActivities });
        setBrokenMediaIds(prev => { const n = new Set(prev); n.delete(act.id); return n; });
        mediaStorageService.register({
          masterId: currentUser?.masterId || currentUser?.id || '',
          venueId: selectedLead.venueId,
          sourceId: messageSource?.id,
          leadId: selectedLead.id,
          activityId: act.id,
          messageId: messageIds[0],
          mediaType: act.mediaType,
          mimetype: res.mimetype,
          fileName: res.fileName,
          sizeBytes: res.fileSize,
          r2Key: res.r2Key,
          publicUrl: res.permanentR2Url,
          status: 'stored',
        });
        if (isSupabaseConfigured) {
          leadService.updateActivity(act.id, {
            mediaUrl: res.permanentR2Url,
            metadata: {
              ...(act.metadata || {}),
              needsManualDownload: false,
              permanentR2Url: res.permanentR2Url,
            }
          }).catch(() => {});
        }
      }
    } catch (err: any) {
      if (err instanceof MediaDownloadError && err.kind === 'phone') {
        // Mesmo pedindo ao celular não veio: orienta o usuário e diz QUAL chip precisa estar ativo
        const chipLabel = messageSource
          ? `${messageSource.name}${(messageSource.configuration as any)?.connectedPhone ? ` (${(messageSource.configuration as any).connectedPhone})` : ''}`
          : 'deste chip';
        setMediaFailNoteById(prev => ({ ...prev, [act.id]: 'Celular não respondeu - abra o WhatsApp e tente de novo' }));
        toast.error(`Não foi possível puxar esta mídia. Abra o WhatsApp no celular do chip ${chipLabel} e deixe-o aberto (ou em segundo plano) com internet. Depois toque em baixar para tentar de novo.`, { duration: 12000 });
      } else if (err instanceof MediaDownloadError) {
        toast.error(describeMediaFailure(err.kind));
      } else {
        toast.error(`Falha ao baixar mídia: ${err?.message || 'Mídia indisponível no servidor do WhatsApp'}`);
      }
    } finally {
      setDownloadingMediaIds(prev => {
        const next = new Set(prev);
        next.delete(act.id);
        return next;
      });
    }
  };

  // Lista de destinatários disponíveis na ficha com prioridade máxima para o Decisor
  const allRecipientsWithInfo = useMemo(() => {
    if (!selectedLead) return [];
    const list: Array<{
      key: string;
      phone: string;
      name: string;
      label: string;
      role: string;
      roleBadge: string;
      isDecisor: boolean;
      isMain: boolean;
      avatarUrl?: string;
      noPhone?: boolean;
    }> = [];
    const seenPhones = new Set<string>();
    const normPhone = (p?: string) => (p || '').replace(/\D/g, '').slice(-9);
    const leadAny = selectedLead as any;
    const mainPhone = (selectedLead.phone || leadAny.whatsapp || leadAny.payerPhone)?.trim();

    const translateRole = (r?: string) => {
      if (!r || r.toLowerCase().trim() === 'indefinido') return 'Cliente';
      const low = r.toLowerCase().trim();
      if (low === 'mother' || low === 'mae' || low === 'mãe') return 'Mãe';
      if (low === 'father' || low === 'pai') return 'Pai';
      if (low === 'debutante' || low === 'aniversariante' || low === 'protagonista' || low === 'homenageada' || low === 'homenageado') return 'Protagonista';
      if (low === 'contractor' || low === 'contratante' || low === 'payer' || low === 'pagante') return 'Contratante Pagante';
      if (low === 'copayer' || low === 'copagante') return 'Copagante';
      if (low === 'dependent' || low === 'dependente') return 'Dependente Familiar';
      if (low === 'responsible' || low === 'responsavel' || low === 'responsável') return 'Contratante Pagante';
      if (low === 'guardian') return 'Responsável';
      if (low === 'self') return 'Próprio';
      if (low === 'client' || low === 'cliente') return 'Cliente';
      if (low === 'other' || low === 'outro') return 'Contato';
      return r;
    };

    const cleanRoleLabel = (rawName?: string) => {
      if (!rawName) return '';
      return rawName
        .replace(/\(15A?[^)]*\)/gi, '')
        .replace(/•\s*15\s*Anos/gi, '')
        .replace(/•\s*Casamento/gi, '')
        .replace(/•\s*Infantil/gi, '')
        .replace(/15\s*Anos/gi, '')
        .replace(/\s*\((mother|father|mae|mãe|pai|aniversariante|debutante|responsavel|responsável|outro|other|decisor)\)\s*/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const resolveAvatarForPhone = (phone?: string): string | undefined => {
      if (!phone) return undefined;
      const digits = normPhone(phone);
      if (!digits) return undefined;

      // 1. Procura em sourceLeads e leads gerais
      const matchingLead = (sourceLeads || []).concat(leads || []).find(l => {
        const lp = normPhone(l.phone);
        const match = lp && (lp === digits || lp.includes(digits) || digits.includes(lp));
        return match && (l.avatarUrl || (l as any).custom_field_values?.avatarUrl || (l as any).customFieldValues?.avatarUrl);
      });
      const leadAv = matchingLead?.avatarUrl || (matchingLead as any)?.custom_field_values?.avatarUrl || (matchingLead as any)?.customFieldValues?.avatarUrl;
      if (leadAv) return leadAv;

      // 2. Procura nos contatos dos clientes em clients
      for (const cl of (clients || [])) {
        if (Array.isArray(cl.contacts)) {
          const matchCt: any = cl.contacts.find((c: any) => {
            const cp = normPhone(c.primary_phone || c.primaryPhone || c.phone);
            return cp && (cp === digits || cp.includes(digits) || digits.includes(cp)) && (c.profile_picture_url || c.profilePictureUrl || c.avatarUrl);
          });
          if (matchCt) {
            return matchCt.profile_picture_url || matchCt.profilePictureUrl || matchCt.avatarUrl;
          }
        }
      }

      return undefined;
    };

    if (selectedLead.contacts && selectedLead.contacts.length > 0) {
      selectedLead.contacts.forEach((c, idx) => {
        const clean = c.phone?.trim();
        const isSameAsMainPhone = Boolean(mainPhone && clean && normPhone(clean) === normPhone(mainPhone));
        if (clean && !isSameAsMainPhone && !seenPhones.has(normPhone(clean))) {
          seenPhones.add(normPhone(clean));
          const isDec = Boolean(!isPostSaleNoContract && (c.isPrimaryDecisionMaker || leadAny.decisionMaker === c.role || leadAny.decisionMaker === c.name || (leadAny.decisionMaker === 'mae' && c.role?.toLowerCase().includes('m'))));
          const rBadge = translateRole(c.role);
          const rawName = c.name || selectedLead.name || 'Contato';
          const cleanName = cleanRoleLabel(rawName);
          list.push({
            key: `contact-${c.id || idx}-${clean}`,
            phone: clean,
            name: cleanName,
            label: cleanName,
            role: c.role || 'Contato',
            roleBadge: rBadge,
            isDecisor: isDec,
            isMain: false,
            avatarUrl: (c as any).avatarUrl || (c as any).photoUrl || resolveAvatarForPhone(clean) || (clean === selectedLead.phone ? selectedLead.avatarUrl : undefined),
          });
        }
      });
    }

    // Contratante Pagante / Cliente (sem contrato)
    const contractorRole = isPostSaleNoContract
      ? 'Cliente'
      : (leadAny.payerRelationship 
        ? translateRole(leadAny.payerRelationship) 
        : (selectedLead.name && /\((mother|mae|mãe)\)/i.test(selectedLead.name) ? 'Mãe (Contratante)' : 
          (selectedLead.name && /\((father|pai)\)/i.test(selectedLead.name) ? 'Pai (Contratante)' : 'Contratante Pagante')));

    const extractPayerFromTitle = (title?: string) => {
      if (!title) return '';
      if (title.includes('•')) return title.split('•')[0].trim();
      if (title.includes(' - ')) return title.split(' - ')[0].trim();
      return title;
    };

    const rawContractorName = isPostSaleNoContract
      ? (extractPayerFromTitle(selectedLead.name) || leadAny.payerName || 'Cliente')
      : (leadAny.payerName || extractPayerFromTitle(selectedLead.name) || 'Contratante');
    const cleanMainName = cleanRoleLabel(rawContractorName);

    if (mainPhone && !seenPhones.has(normPhone(mainPhone))) {
      seenPhones.add(normPhone(mainPhone));
      const isDec = Boolean(!isPostSaleNoContract && (leadAny.isDecisionMaker || !list.some(l => l.isDecisor)));
      list.push({
        key: `contractor-main-${mainPhone}`,
        phone: mainPhone,
        name: cleanMainName,
        label: cleanMainName,
        role: contractorRole,
        roleBadge: contractorRole,
        isDecisor: isDec,
        isMain: true,
        avatarUrl: resolveAvatarForPhone(mainPhone) || selectedLead.avatarUrl,
      });
    }

    // Protagonista do Evento (Debutante / Noivos / Aniversariante)
    let debName = cleanRoleLabel(leadAny.birthdayPersonName || selectedLead.debutanteName || leadAny.debutante_name);
    if ((!debName || debName.toLowerCase() === cleanMainName.toLowerCase()) && selectedLead.name) {
      const match15A = selectedLead.name.match(/(?:15A?|\()\s*([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)?)\s+\d{2}\/\d{2}/i);
      if (match15A && match15A[1] && !/^(anos?|festa|evento|confraterniz)/i.test(match15A[1])) {
        debName = cleanRoleLabel(match15A[1]);
      } else {
        const matchDash = selectedLead.name.match(/[–-]\s*([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)?)/i);
        if (matchDash && matchDash[1] && !/^(15\s*anos?|casamento|infantil)/i.test(matchDash[1])) {
          debName = cleanRoleLabel(matchDash[1]);
        }
      }
    }

    const debutantePhone = (leadAny.birthdayPersonPhone || leadAny.debutantePhone || leadAny.debutante_phone)?.trim();
    if (debutantePhone && !seenPhones.has(normPhone(debutantePhone))) {
      seenPhones.add(normPhone(debutantePhone));
      list.push({
        key: `protagonist-${debutantePhone}`,
        phone: debutantePhone,
        name: debName || 'Protagonista',
        label: debName || 'Protagonista',
        role: 'Protagonista',
        roleBadge: 'Protagonista do Evento',
        isDecisor: false,
        isMain: false,
        avatarUrl: resolveAvatarForPhone(debutantePhone),
      });
    } else if (!debutantePhone && debName && !PLACEHOLDER_PERSON_NAMES.has(debName.trim().toLowerCase()) && debName.toLowerCase() !== cleanMainName.toLowerCase()) {
      // Homenageada sem telefone proprio: aparece apenas como informacao (chip desabilitado), sem canal de envio
      list.push({
        key: `protagonist-nophone-${debName}`,
        phone: '',
        name: debName,
        label: debName,
        role: 'Protagonista',
        roleBadge: 'Protagonista do Evento',
        isDecisor: false,
        isMain: false,
        avatarUrl: undefined,
        noPhone: true,
      });
    }

    const motherPhone = leadAny.motherPhone?.trim();
    if (motherPhone && !seenPhones.has(normPhone(motherPhone))) {
      seenPhones.add(normPhone(motherPhone));
      const cleanMomName = cleanRoleLabel(leadAny.motherName) || 'Mãe';
      list.push({
        key: `mother-${motherPhone}`,
        phone: motherPhone,
        name: cleanMomName,
        label: cleanMomName,
        role: 'Mãe',
        roleBadge: 'Mãe',
        isDecisor: leadAny.decisionMaker === 'mae',
        isMain: false,
        avatarUrl: resolveAvatarForPhone(motherPhone),
      });
    }

    const fatherPhone = leadAny.fatherPhone?.trim();
    if (fatherPhone && !seenPhones.has(normPhone(fatherPhone))) {
      seenPhones.add(normPhone(fatherPhone));
      const cleanDadName = cleanRoleLabel(leadAny.fatherName) || 'Pai';
      list.push({
        key: `father-${fatherPhone}`,
        phone: fatherPhone,
        name: cleanDadName,
        label: cleanDadName,
        role: 'Pai',
        roleBadge: 'Pai',
        isDecisor: leadAny.decisionMaker === 'pai',
        isMain: false,
        avatarUrl: resolveAvatarForPhone(fatherPhone),
      });
    }

    // Se o lead atual estiver vinculado a um contrato mestre (ex: Carla vinculada ao contrato do Antônio / Vitória),
    // puxa também os contatos do contrato para que apareçam na alternância familiar no topo do chat:
    if (targetContractClient && targetContractClient.id !== selectedLead.id) {
      const tc = targetContractClient as any;
      if (Array.isArray(tc.contacts)) {
        tc.contacts.forEach((c: any, idx: number) => {
          const clean = c.phone?.trim();
          if (clean && !seenPhones.has(normPhone(clean))) {
            seenPhones.add(normPhone(clean));
            const rawName = c.name || 'Contato';
            const cleanName = cleanRoleLabel(rawName);
            list.push({
              key: `contract-contact-${c.id || idx}-${clean}`,
              phone: clean,
              name: cleanName,
              label: cleanName,
              role: c.role || 'Contato',
              roleBadge: translateRole(c.role),
              isDecisor: Boolean(c.isPrimaryDecisionMaker || tc.decisionMaker === c.role),
              isMain: false,
              avatarUrl: c.avatarUrl || c.photoUrl || resolveAvatarForPhone(clean),
            });
          }
        });
      }
      if (tc.payerPhone && !seenPhones.has(normPhone(tc.payerPhone))) {
        seenPhones.add(normPhone(tc.payerPhone));
        const pName = cleanRoleLabel(tc.payerName || tc.name || 'Contratante');
        list.push({
          key: `contract-payer-${tc.payerPhone}`,
          phone: tc.payerPhone,
          name: pName,
          label: pName,
          role: 'Contratante Pagante',
          roleBadge: 'Contratante Pagante',
          isDecisor: true,
          isMain: false,
          avatarUrl: resolveAvatarForPhone(tc.payerPhone) || tc.avatarUrl,
        });
      }
    }

    // Ordenação por mensagem mais recente de cada pessoa da família (quem interagiu por último fica no topo à esquerda)
    const getPhoneLastInteractionTime = (phone?: string) => {
      if (!phone) return 0;
      const digits = phone.replace(/\D/g, '').slice(-8);
      if (!digits) return 0;
      let latest = 0;
      const allActs = [
        ...(selectedLead?.activities || []),
        ...((targetContractClient as any)?.activities || [])
      ];
      for (const a of allActs) {
        if (a.type !== 'contact') continue;
        const actPhone = (
          (a.metadata as any)?.fromPhone ||
          (a.metadata as any)?.customerPhone ||
          (a.metadata as any)?.recipientPhone ||
          (a.metadata as any)?.phone ||
          (a as any).phone ||
          ''
        ).replace(/\D/g, '').slice(-8);
        const at = new Date(a.date || a.createdAt || (a as any).timestamp || 0).getTime();
        if (actPhone === digits || (!actPhone && normPhone(selectedLead.phone || '').slice(-8) === digits)) {
          if (at > latest) latest = at;
        }
      }
      return latest;
    };

    list.sort((a, b) => {
      const timeA = getPhoneLastInteractionTime(a.phone);
      const timeB = getPhoneLastInteractionTime(b.phone);
      if (timeB !== timeA) return timeB - timeA;
      return (b.isDecisor ? 1 : 0) - (a.isDecisor ? 1 : 0);
    });

    return list;
  }, [selectedLead, isPostSaleNoContract, targetContractClient, sourceLeads, leads, clients]);

  // Apenas quem tem telefone proprio pode receber mensagem; os demais so aparecem como chip informativo
  const availableRecipients = useMemo(() => allRecipientsWithInfo.filter(r => !r.noPhone), [allRecipientsWithInfo]);

  const [selectedRecipientKey, setSelectedRecipientKey] = useState<string>('');
  // Quando o usuario escolhe um contato manualmente nesta conversa, a escolha dele prevalece sobre o "ultimo que escreveu"
  const recipientTouchedRef = useRef<string | null>(null);
  const lastInboundPhone = useMemo(() => {
    let best: { at: number; phone: string } | null = null;
    for (const a of selectedLead?.activities || []) {
      if (a.type !== 'contact' || !/recebid/i.test(a.title || '')) continue;
      const ph = (a.metadata as any)?.fromPhone as string | undefined;
      if (!ph) continue;
      const at = new Date(a.timestamp || 0).getTime();
      if (!best || at > best.at) best = { at, phone: ph };
    }
    return best?.phone;
  }, [selectedLead?.activities]);
  const [selectedRecipientPhone, setSelectedRecipientPhone] = useState<string>('');

  const activeRecipient = useMemo(() => {
    const sendable = (availableRecipients || []).filter(r => !r.noPhone);
    if (sendable.length === 0) return null;
    if (selectedRecipientKey) {
      const found = sendable.find(r => r.key === selectedRecipientKey);
      if (found) return found;
    }
    if (selectedRecipientPhone) {
      const found = sendable.find(r => r.phone === selectedRecipientPhone);
      if (found) return found;
    }
    return sendable[0];
  }, [availableRecipients, selectedRecipientKey, selectedRecipientPhone]);

  // Quem esta do outro lado do chat: o contato principal usa nome/foto do lead; qualquer outro contato (familiar, dependente)
  // usa os proprios dados e NUNCA herda a foto/nome do principal (sem foto => iniciais).
  const peerOfRecipient = useCallback((r?: { name?: string; avatarUrl?: string; isMain?: boolean; phone?: string } | null) => {
    if (r && r.name) {
      return {
        name: r.name,
        avatarUrl: r.avatarUrl || undefined,
      };
    }
    const raw = (selectedLead as any)?.payerName || selectedLead?.name || '';
    const clean = raw.includes('•') ? raw.split('•')[0].trim() : (raw.includes(' - ') ? raw.split(' - ')[0].trim() : raw);
    return {
      name: clean || 'Cliente',
      avatarUrl: (selectedLead as any)?.avatarUrl || (selectedLead as any)?.profilePicUrl || undefined,
    };
  }, [selectedLead]);
  const chatPeer = useMemo(() => peerOfRecipient(activeRecipient), [peerOfRecipient, activeRecipient]);
  // Dono de uma mensagem recebida: casa o numero gravado na atividade com os contatos da ficha; senao, o chat aberto
  const peerOfActivity = useCallback((act: any) => {
    const digits = (v: unknown) => String(v || '').replace(/\D/g, '');
    const m = act?.metadata || {};
    const ap = digits(act?.recipientPhone || m.recipientPhone || m.fromPhone || m.senderPhone || m.phone || m.from || m.remoteJid);
    if (ap.length >= 8) {
      const owner = (availableRecipients || []).find(r => digits(r.phone).length >= 8 && isPhoneMatch(r.phone, ap));
      if (owner) return peerOfRecipient(owner);
    }
    return chatPeer;
  }, [availableRecipients, peerOfRecipient, chatPeer]);

  useEffect(() => {
    if (availableRecipients.length > 0) {
      const touched = recipientTouchedRef.current === selectedLead?.id;
      // Preserva a pessoa escolhida se ela continua na lista (evita voltar ao 1o item a cada atualizacao do lead)
      const keep = selectedRecipientKey ? availableRecipients.find(r => r.key === selectedRecipientKey) : undefined;
      if (keep && touched) {
        setSelectedRecipientPhone(keep.phone);
        return;
      }
      // Padrao: o contato pelo qual o cliente escreveu por ultimo; senao o que ja estava; senao o primeiro (decisor)
      const tail = (p?: string) => (p || '').replace(/\D/g, '').slice(-9);
      const byLast = lastInboundPhone ? availableRecipients.find(r => tail(r.phone) && tail(r.phone) === tail(lastInboundPhone)) : undefined;
      const pick = byLast || keep || availableRecipients[0];
      setSelectedRecipientKey(pick.key);
      setSelectedRecipientPhone(pick.phone);
    } else if (selectedLead?.phone) {
      setSelectedRecipientKey('lead-main');
      setSelectedRecipientPhone(selectedLead.phone);
    } else {
      setSelectedRecipientKey('');
      setSelectedRecipientPhone('');
    }
  }, [selectedLead?.id, availableRecipients, lastInboundPhone]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ref para garantir que o gatilho de visualização ocorra exclusivamente na ABERTURA da conversa e não fique marcando repetidamente
  const openedLeadForViewRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedLead?.id) {
      openedLeadForViewRef.current = null;
      return;
    }

    // Se já processou a abertura desta conversa, não repete enquanto a conversa continuar selecionada
    if (openedLeadForViewRef.current === selectedLead.id) {
      return;
    }
    openedLeadForViewRef.current = selectedLead.id;

    // 1. Se a conversa está encerrada, não marca visualização
    const acts = selectedLead.activities || [];
    const isSessionEnded = acts.some(a => {
      const meta = (a as any).metadata;
      const titleLower = (a.title || '').toLowerCase();
      return meta?.isSessionEnd === true || titleLower.includes('conversa encerrada') || titleLower.includes('atendimento finalizado');
    });

    if (isSessionEnded) {
      if ((selectedLead.unreadCount || 0) > 0) {
        markLeadAsRead(selectedLead.id);
      }
      return;
    }

    // 2. Verifica se há tempo de espera pendente do cliente (se o atendente/equipe foi o último a responder, retorna -1)
    const collabIdSet = new Set((collaborators || []).map(c => c.id));
    if (currentUser?.id) collabIdSet.add(currentUser.id);
    const waitingTime = getLeadPendingWaitingTime(selectedLead, collabIdSet);

    const activePhoneDigits = (activeRecipient?.phone || selectedLead.phone || '').replace(/\D/g, '').slice(-8);
    const matchingLeadToMark = (sourceLeads || []).find(l => (l.phone || '').replace(/\D/g, '').slice(-8) === activePhoneDigits) || selectedLead;

    // Marca visualização APENAS para o lead do contato que foi realmente aberto
    if (waitingTime > 0) {
      markLeadAsRead(matchingLeadToMark.id);
    } else if ((matchingLeadToMark.unreadCount || 0) > 0) {
      markLeadAsRead(matchingLeadToMark.id);
    }

    // 3. Auto-recuperação pontual de mensagens [Undecryptable] ao abrir a conversa (máximo 1x a cada 120s por lead, sem loops excessivos)
    const hasUndecryptable = acts.some(a => {
      const textLower = (a.text || '').toLowerCase();
      const titleLower = (a.title || '').toLowerCase();
      return textLower.includes('[undecryptable]') || textLower.includes('não foi possível descriptografar') ||
             titleLower.includes('[undecryptable]') || titleLower.includes('não foi possível descriptografar');
    });

    if (hasUndecryptable) {
      const lastAttempt = lastUndecryptableAutoResyncRef.current[selectedLead.id] || 0;
      if (Date.now() - lastAttempt > 120000) {
        lastUndecryptableAutoResyncRef.current[selectedLead.id] = Date.now();
        syncWhatsAppHistoryGap({ timeWindowMinutes: 360, createMissingLeads: false }).catch(() => {});
      }
    }
  }, [selectedLead?.id, collaborators, currentUser?.id, markLeadAsRead]);

  const [isSenderDropdownOpen, setIsSenderDropdownOpen] = useState(false);
  const [isRecipientDropdownOpen, setIsRecipientDropdownOpen] = useState(false);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const senderDropdownRef = useRef<HTMLDivElement>(null);
  const recipientDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (senderDropdownRef.current && !senderDropdownRef.current.contains(target)) {
        setIsSenderDropdownOpen(false);
      }
      if (recipientDropdownRef.current && !recipientDropdownRef.current.contains(target)) {
        setIsRecipientDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getSourceInstanceToken = useCallback((src?: any): string => {
    if (!src) return '';
    return (
      src.whatsappInstanceId ||
      src.configuration?.instanceToken ||
      src.configuration?.token ||
      src.configuration?.instanceKey ||
      ''
    ).trim();
  }, []);

  const sourcesRef = useRef(sources);
  useEffect(() => {
    sourcesRef.current = sources;
  }, [sources]);

  // Background Live Status Checker para todas as instâncias WhatsApp do F5 System (blindado contra loops de re-render e egress)
  useEffect(() => {
    let isMounted = true;

    const checkStatuses = async () => {
      const currentSources = sourcesRef.current || [];
      const waSources = currentSources.filter(
        s => s.type === 'whatsapp_api' && Boolean(getSourceInstanceToken(s))
      );
      for (const src of waSources) {
        const token = getSourceInstanceToken(src);
        if (!token) continue;
        try {
          const res = await uazapiService.getInstanceStatus(token);
          if (!isMounted) return;
          const isConn = Boolean(res.connected || res.loggedIn || res.status === 'connected');
          setLiveInstanceStatuses(prev => ({
            ...prev,
            [src.id]: {
              connected: isConn,
              status: res.status || (isConn ? 'connected' : 'disconnected'),
              avatar: res.profilePictureUrl || (src.configuration as any)?.profilePicUrl,
              phone: res.phone || (src.configuration as any)?.connectedPhone,
              profileName: res.profileName || (src.configuration as any)?.profileName,
            }
          }));
        } catch {
          // Ignora timeout em background
        }
      }
    };

    checkStatuses();
    const interval = setInterval(checkStatuses, 45000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [getSourceInstanceToken]);

  // Verifica se uma instância está efetivamente conectada (Live + Fallback)
  const isSourceOnline = (src?: any): boolean => {
    if (!src) return false;
    if (src.status === 'inactive') return false;
    if (liveInstanceStatuses[src.id] !== undefined) {
      return liveInstanceStatuses[src.id].connected;
    }
    const config = (src.configuration as any) || {};
    if (config.connectionStatus === 'disconnected' || config.isConnected === false) return false;
    if (config.connectionStatus === 'connected' || config.isConnected === true) return true;
    return Boolean(config.connectedPhone && config.connectionStatus !== 'disconnected');
  };

  const getSourceAvatar = (src?: any): string | undefined => {
    if (!src) return undefined;
    if (liveInstanceStatuses[src.id]?.avatar) return liveInstanceStatuses[src.id].avatar;
    const config = (src.configuration as any) || {};
    return config.profilePicUrl || config.avatarUrl || config.connectedAvatar || config.profilePictureUrl;
  };

  const getSourceCleanLabel = (src: any) => {
    const livePhone = liveInstanceStatuses[src.id]?.phone;
    const phone = livePhone || (src.configuration as any)?.connectedPhone || src.whatsappInstanceId || '';
    const formatted = phone ? formatPhone(phone) : '';
    const rawName = src.name || 'WhatsApp';
    const cleanName = rawName.replace(/\(F5 System\)/gi, '').replace(/F5 System/gi, '').trim();
    return {
      cleanName: cleanName || 'WhatsApp Comercial',
      formattedPhone: formatted || phone,
    };
  };

  // Conclusão Inline de Follow-up com salvamento automático no Histórico e Auditoria
  const handleCompleteInlineTask = async (task: AdminTask, resolution: string, outcome: 'success' | 'unsuccessful' = 'success') => {
    const defaultText = outcome === 'success' ? 'Follow-up realizado com sucesso.' : 'Follow-up sem sucesso / sem contato.';
    const cleanRes = resolution.trim() || defaultText;
    const completedTimestamp = new Date().toISOString();
    if (updateTask) {
      updateTask(task.id, {
        status: 'completed',
        customStatusId: outcome === 'success' ? 'st_completed_success' : 'st_completed_unsuccessful',
        completedAt: completedTimestamp,
        resolution: cleanRes,
        customProperties: {
          ...(task.customProperties || {}),
          resolution: cleanRes,
          outcome,
        }
      });
    }

    // Registro automático na linha do tempo
    const author = currentUser?.name || 'Colaborador';
    const auditNoteText = outcome === 'success'
      ? `✅ Follow-up realizado com sucesso por ${author}: "${cleanRes}"`
      : `⚠️ Follow-up sem sucesso por ${author}: "${cleanRes}"`;
    if (isPostSaleFunnel || selectedLead?.isClient) {
      addClientNote(selectedLead!.id, auditNoteText);
    } else if (selectedLead) {
      addLeadNote(selectedLead.id, auditNoteText);
    }

    setInlineCompletingTaskId(null);
    setInlineResolutionText('');
  };

  // Criação Rápida de Follow-up pelo Composer Inferior
  const handleCreateQuickFollowup = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedLead) return;

    // Formata a data do evento do lead se existir (ex: 18/12/27)
    const eventDateRaw = selectedLead.partyDate || selectedLead.eventDate;
    let eventDateLabel = '';
    if (eventDateRaw) {
      try {
        const parts = String(eventDateRaw).split('T')[0].split('-');
        if (parts.length === 3) {
          eventDateLabel = `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`;
        }
      } catch { }
    }

    const typeLabel = quickFollowupType || 'Follow-up WhatsApp';
    // Padrão solicitado: [Nome da pessoa] [Data do Evento] • [Tipo do Follow-up]
    const cleanTitle = eventDateLabel
      ? `${selectedLead.name} ${eventDateLabel} • ${typeLabel}`
      : `${selectedLead.name} • ${typeLabel}`;

    const isFuture = quickFollowupDate > todayStr;
    const initialStatus: TaskStatus = 'todo';
    const customStatusId = isFuture ? 'st_scheduled' : 'st_todo';

    if (addTask) {
      addTask({
        leadId: selectedLead.id,
        leadName: selectedLead.name,
        title: cleanTitle,
        description: quickFollowupNote.trim() || undefined,
        content: quickFollowupNote.trim() || undefined,
        type: typeLabel as any,
        customType: typeLabel,
        dueDate: quickFollowupDate,
        dueTime: quickFollowupTime,
        priority: 'medium',
        status: initialStatus,
        customStatusId: customStatusId,
        isFollowUp: true,
        createdById: currentUser?.id || 'admin',
        createdByName: currentUser?.name || 'Equipe',
        assignedToIds: currentUser?.id ? [currentUser.id] : [],
        venueId: selectedLead.venueId,
        customProperties: {
          observations: quickFollowupNote.trim() || undefined,
          customType: typeLabel,
          status: isFuture ? 'scheduled' : 'todo',
        }
      });
    }

    setQuickFollowupNote('');
  };

  // Instancias disponiveis para responder: as do FUNIL ATUAL do lead/contrato, com envio habilitado (check do funil).
  // Uma instancia pertence a um unico funil; lead transferido de funil so enxerga as instancias do funil novo.
  const senderFunnelId = selectedLead?.funnelId || (selectedLead?.isClient ? (activeFunnelId || undefined) : undefined);
  const venueSenderSources = useMemo(() => {
    const allWhatsappSources = (sources || []).filter(
      s => s.type === 'whatsapp_api' && !isFinanceSource(s) &&
        Boolean(getSourceInstanceToken(s) || (s.configuration as any)?.connectedPhone)
    );

    // Isolamento por unidade continua valendo (vazamento zero entre unidades)
    const leadVenueId = selectedLead?.venueId;
    const byVenue = allWhatsappSources.filter(s => {
      if (leadVenueId && leadVenueId !== 'all' && leadVenueId !== 'multi') return s.venueId === leadVenueId;
      if (activeVenueId && activeVenueId !== 'all' && activeVenueId !== 'multi') return s.venueId === activeVenueId;
      return true;
    });

    // Lead sem funil (funil e opcional): vale a regra por casa
    if (!senderFunnelId) return byVenue;
    return funnelSenders(byVenue, funnels.find(f => f.id === senderFunnelId) || { id: senderFunnelId }, () => true, leadCarriedSourceIds(selectedLead as any, (selectedLead as any)?.activities));
  }, [sources, funnels, selectedLead, selectedLead?.venueId, senderFunnelId, activeVenueId, getSourceInstanceToken]);

  const [selectedSenderSourceId, setSelectedSenderSourceId] = useState<string>('');
  const manuallySelectedSenderLeadIdRef = useRef<string | null>(null);

  // Chip da ultima mensagem enviada PELO SISTEMA para este lead
  const lastSentSourceId = useMemo(() => lastSystemSentSourceId(selectedLead?.activities), [selectedLead?.activities]);
  // Numero por onde o cliente falou por ultimo: ao abrir a conversa, ja vem selecionado (so ao abrir, nao troca sozinho depois)
  const lastIncomingSourceIdValue = useMemo(() => lastIncomingSourceId(selectedLead?.activities), [selectedLead?.activities]);
  // Chip da ULTIMA INTERAÇÃO real na conversa (seja enviada por celular/web, pelo sistema ou recebida do cliente)
  const lastInteractionSourceIdValue = useMemo(() => lastInteractionSourceId(selectedLead?.activities), [selectedLead?.activities]);
  const lastIncomingRef = useRef<string | undefined>(undefined);
  lastIncomingRef.current = lastIncomingSourceIdValue;

  useEffect(() => {
    if (!selectedLead) {
      setSelectedSenderSourceId('');
      manuallySelectedSenderLeadIdRef.current = null;
      return;
    }
    // Escolha manual (desta sessao ou salva): vale enquanto o chip continuar disponivel no funil atual do lead
    const manualId = (manuallySelectedSenderLeadIdRef.current === selectedLead.id && selectedSenderSourceId)
      ? selectedSenderSourceId
      : readManualSender(selectedLead.id);
    const rec = recommendSender(venueSenderSources.map(s => s.id), {
      manualId,
      lastInteractionId: lastInteractionSourceIdValue,
      lastIncomingId: lastIncomingRef.current,
      lastSentId: lastSentSourceId,
      originId: selectedLead.sourceId,
    });
    setSelectedSenderSourceId(rec?.id || '');
  }, [selectedLead?.id, selectedLead?.sourceId, lastInteractionSourceIdValue, lastSentSourceId, Boolean(lastIncomingSourceIdValue), venueSenderSources]); // eslint-disable-line react-hooks/exhaustive-deps

  const baseSenderSource = useMemo(() => {
    return venueSenderSources.find(s => s.id === selectedSenderSourceId) || venueSenderSources[0] || null;
  }, [venueSenderSources, selectedSenderSourceId]);

  const activeSenderSource = useMemo(() => {
    // Escolha manual do usuário no seletor de instâncias tem prioridade absoluta
    if (selectedSenderSourceId) {
      const manual = venueSenderSources.find(s => s.id === selectedSenderSourceId);
      if (manual) return manual;
    }
    if (channelExclusiveSource) {
      return channelExclusiveSource;
    }
    return baseSenderSource;
  }, [selectedSenderSourceId, channelExclusiveSource, baseSenderSource, venueSenderSources]);

  const isSenderDisconnected = useMemo(() => {
    if (!activeSenderSource) return true;
    return !isSourceOnline(activeSenderSource);
  }, [activeSenderSource]);

  const connectedAlternativeSource = useMemo(() => {
    // Busca alternativa exclusivamente dentro das instâncias permitidas da unidade do lead
    return venueSenderSources.find(s => s.id !== activeSenderSource?.id && isSourceOnline(s)) || null;
  }, [venueSenderSources, activeSenderSource]);

  const activeSenderToken = useMemo(
    () => (activeSenderSource ? getSourceInstanceToken(activeSenderSource) : ''),
    [activeSenderSource, getSourceInstanceToken],
  );

  // Garantia antes de qualquer envio: precisa haver chip habilitado no funil e ele precisa estar conectado.
  // Nunca troca de numero sozinho; quem decide e o usuario.
  const ensureSenderReady = useCallback((): boolean => {
    if (isMessagingPaused()) {
      toast.error(MESSAGING_PAUSED_TEXT);
      return false;
    }
    if (!activeSenderSource || !activeSenderToken) {
      toast.warning('Nenhum WhatsApp habilitado para envio neste funil. Habilite um número nas configurações do funil.');
      return false;
    }
    if (isSenderDisconnected) {
      toast.error(`O WhatsApp ${activeSenderSource.name} está desconectado. Reconecte ou escolha outro número do funil.`);
      return false;
    }
    return true;
  }, [activeSenderSource, activeSenderToken, isSenderDisconnected]);

  // Sincronização de foto de perfil do WhatsApp via UAZAPI:
  // - Trigger: quando a conversa é aberta E avatar_refreshed_at > 7 dias ou null
  // - Persiste no R2 com path fixo avatars/{master_id}/picture_{contact_code}.jpg
  // - Mantém a última foto se UAZAPI não retornar (nunca apaga)
  useEffect(() => {
    if (!selectedLead || !activeSenderToken || !isSupabaseConfigured) return;

    const masterId = effectiveUser?.masterId || currentUser?.masterId || effectiveUser?.id || currentUser?.id;
    if (!masterId) return;

    let isMounted = true;

    // Sincroniza a foto de cada contato do lead/família na Central de Contatos (TTL 7 dias)
    const contactsToCheck = new Map<string, string>();
    if (selectedLead.phone) contactsToCheck.set(selectedLead.phone.replace(/\D/g, ''), selectedLead.name || '');
    (selectedLead.contacts || []).forEach((c: any) => {
      if (c?.phone) contactsToCheck.set(c.phone.replace(/\D/g, ''), c.name || '');
    });
    if (targetContractClient) {
      if ((targetContractClient as any).payerPhone) {
        contactsToCheck.set((targetContractClient as any).payerPhone.replace(/\D/g, ''), (targetContractClient as any).payerName || '');
      }
      (((targetContractClient as any).contacts) || []).forEach((c: any) => {
        if (c?.phone) contactsToCheck.set(c.phone.replace(/\D/g, ''), c.name || '');
      });
    }
    (availableRecipients || []).forEach(r => {
      if (r?.phone) contactsToCheck.set(r.phone.replace(/\D/g, ''), r.name || '');
    });

    contactsToCheck.forEach((cName, cPhone) => {
      if (cPhone.length < 8) return;
      whatsappMediaService.syncContactAvatar({ phone: cPhone, name: cName }, activeSenderToken, masterId)
        .then(res => {
          if (res.updated && res.avatarUrl && isMounted) {
            if (cPhone === (selectedLead.phone || '').replace(/\D/g, '')) {
              updateLeadData(selectedLead.id, { avatarUrl: res.avatarUrl });
            }
          }
        })
        .catch(() => { });
    });

    return () => {
      isMounted = false;
    };
  }, [selectedLead?.id, activeSenderToken, targetContractClient?.id]);

  const messagingPaused = useMessagingPause(); // pausa geral: desabilita o compositor
  const isManager = currentUser?.role === 'master' || currentUser?.role === 'admin';
  const isLeadSpectator = useMemo(() => {
    if (!selectedLead || isManager) return false;
    if (isReadOnlyForPosVenda) return true;
    if (currentUser?.role === 'sdr' || currentUser?.role === 'closer') {
      const isAssigned = (selectedLead.sdrId && selectedLead.sdrId === currentUser.id) ||
        (selectedLead.closerId && selectedLead.closerId === currentUser.id) ||
        (selectedLead.assignedTo && selectedLead.assignedTo === currentUser.name);
      return !isAssigned;
    }
    return false;
  }, [selectedLead, isManager, isReadOnlyForPosVenda, currentUser]);

  // Controle de rolagem do chat para não prender o usuário quando ele sobe para ler mensagens antigas
  const isUserScrolledUpRef = useRef<boolean>(false);
  const isManualUserScrollRef = useRef<boolean>(false);
  const lastScrolledLeadIdRef = useRef<string | null>(null);
  const lastScrolledTabRef = useRef<string | null>(null);
  const lastScrolledChipRef = useRef<string | null>(null);
  const lastScrolledRecipientRef = useRef<string | null>(null);

  const handleTimelineScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    
    // Se o usuário rolou para perto do fundo (menos de 50px), reseta qualquer trava de scroll
    if (distanceFromBottom <= 50) {
      isUserScrolledUpRef.current = false;
      isManualUserScrollRef.current = false;
    } else if (isManualUserScrollRef.current && distanceFromBottom > 70) {
      // Só marca como scrolled up se foi uma ação intencional do usuário (wheel / touch)
      isUserScrolledUpRef.current = true;
    }

    // Se o usuário rolou até o topo (menos de 80px do topo) e existem mensagens anteriores no banco
    if (el.scrollTop < 80 && !isFetchingOlderRef.current && selectedLeadId && !reachedBeginningMap[selectedLeadId]) {
      loadOlderMessagesRef.current();
    }
  }, [selectedLeadId, reachedBeginningMap]);

  // Controle de Presença em Tempo Real (Digitando... / Gravando áudio...) isolado por telefone de contato
  const lastPresenceTimeRef = useRef<number>(0);
  const presenceTimerRef = useRef<any>(null);
  const currentLeadPhoneRef = useRef<string>('');

  // Presenca na lista de conversas: "digitando..." / "gravando audio..." ao lado de cada lead (chave = ultimos 8 digitos)
  const [listPresence, setListPresence] = useState<Record<string, 'composing' | 'recording'>>({});
  const listPresenceTimersRef = useRef<Record<string, any>>({});
  useEffect(() => {
    const unsub = uazapiSseService.onPresence((evt) => {
      const key = (evt.phone || '').replace(/\D/g, '').slice(-8);
      if (key.length < 8) return;
      clearTimeout(listPresenceTimersRef.current[key]);
      if (evt.presence === 'composing' || evt.presence === 'recording') {
        const kind = evt.presence;
        setListPresence(prev => ({ ...prev, [key]: kind }));
        listPresenceTimersRef.current[key] = setTimeout(() => {
          setListPresence(prev => { const n = { ...prev }; delete n[key]; return n; });
        }, kind === 'recording' ? 15000 : 10000);
      } else {
        setListPresence(prev => { if (!prev[key]) return prev; const n = { ...prev }; delete n[key]; return n; });
      }
    });
    return () => {
      unsub();
      Object.values(listPresenceTimersRef.current).forEach(t => clearTimeout(t));
    };
  }, []);

  // Presença do Cliente / Lead em Tempo Real (Digitando... / Gravando áudio...)
  const [customerPresence, setCustomerPresence] = useState<{ isTyping: boolean; isRecording: boolean }>({ isTyping: false, isRecording: false });
  const customerPresenceTimerRef = useRef<any>(null);

  useEffect(() => {
    const unsub = uazapiSseService.onPresence((evt) => {
      const currentPhone = selectedRecipientPhone || selectedLead?.phone || '';
      const cleanIncoming = (evt.phone || '').replace(/\D/g, '');
      const incomingJidDigits = (evt.jid || '').replace(/@.*$/, '').replace(/\D/g, '');

      // Casa por telefone (tolera 9o digito e DDI) ou pelo LID/JID gravado no lead
      const leadIds = [
        (selectedLead as any)?.whatsappLid,
        (selectedLead as any)?.whatsappJid,
      ].map(v => String(v || '').replace(/@.*$/, '').replace(/\D/g, '')).filter(Boolean);
      const matchesPhone = isPhoneMatch(currentPhone, cleanIncoming);
      const matchesLid = leadIds.some(id => id === cleanIncoming || (incomingJidDigits && id === incomingJidDigits));

      if (matchesPhone || matchesLid) {
        if (customerPresenceTimerRef.current) clearTimeout(customerPresenceTimerRef.current);

        if (evt.presence === 'composing') {
          setCustomerPresence({ isTyping: true, isRecording: false });
          customerPresenceTimerRef.current = setTimeout(() => {
            setCustomerPresence({ isTyping: false, isRecording: false });
          }, 10000);
        } else if (evt.presence === 'recording') {
          setCustomerPresence({ isTyping: false, isRecording: true });
          customerPresenceTimerRef.current = setTimeout(() => {
            setCustomerPresence({ isTyping: false, isRecording: false });
          }, 15000);
        } else {
          setCustomerPresence({ isTyping: false, isRecording: false });
        }
      }
    });

    return () => {
      unsub();
      if (customerPresenceTimerRef.current) clearTimeout(customerPresenceTimerRef.current);
    };
  }, [selectedLead?.id, selectedLead?.phone, (selectedLead as any)?.whatsappLid, (selectedLead as any)?.whatsappJid, selectedRecipientPhone]);

  const triggerComposingPresence = () => {
    const targetPhone = selectedRecipientPhone || selectedLead?.phone;
    if (!targetPhone || !activeSenderToken) return;

    const now = Date.now();
    // Reenvia presença de digitando a cada 4 segundos enquanto o atendente estiver digitando
    if (now - lastPresenceTimeRef.current > 4000) {
      lastPresenceTimeRef.current = now;
      uazapiService.sendPresence(activeSenderToken, {
        number: targetPhone,
        presence: 'composing',
        delay: 15,
      }).catch(() => { });
    }

    // Se parar de digitar por 8 segundos de inatividade completa, envia 'paused'
    if (presenceTimerRef.current) clearTimeout(presenceTimerRef.current);
    presenceTimerRef.current = setTimeout(() => {
      if (activeSenderToken && targetPhone) {
        uazapiService.sendPresence(activeSenderToken, {
          number: targetPhone,
          presence: 'paused',
        }).catch(() => { });
      }
    }, 8000);
  };

  useEffect(() => {
    const oldPhone = currentLeadPhoneRef.current;
    const newPhone = selectedRecipientPhone || selectedLead?.phone || '';
    if (oldPhone && oldPhone !== newPhone && activeSenderToken) {
      if (presenceTimerRef.current) clearTimeout(presenceTimerRef.current);
      uazapiService.sendPresence(activeSenderToken, {
        number: oldPhone,
        presence: 'paused',
      }).catch(() => { });
    }
    currentLeadPhoneRef.current = newPhone;
    setCustomerPresence({ isTyping: false, isRecording: false });
    return () => {
      if (presenceTimerRef.current) clearTimeout(presenceTimerRef.current);
    };
  }, [selectedLead?.id, selectedRecipientPhone, activeSenderToken]);

  // Obtém metadados enriquecidos da origem / WhatsApp que disparou a mensagem internamente
  const getAppSenderMetadata = useCallback(() => {
    const effectiveSender = activeSenderSource;
    const cleanInfo = effectiveSender ? getSourceCleanLabel(effectiveSender) : null;
    const avatar = effectiveSender ? getSourceAvatar(effectiveSender) : undefined;
    const rawPhone = (effectiveSender?.configuration as any)?.connectedPhone || (effectiveSender?.configuration as any)?.whatsappNumber || effectiveSender?.whatsappInstanceId || '';
    const senderName = cleanInfo?.cleanName || effectiveSender?.name || 'WhatsApp';
    const isChannelActive = Boolean(activePostSaleChannel);

    return {
      sentFromApp: true,
      instanceId: effectiveSender?.id,
      recipientPhone: selectedRecipientPhone || selectedLead?.phone,
      senderSourceId: effectiveSender?.id,
      senderSourceName: senderName,
      senderPhone: rawPhone,
      senderAvatar: avatar || '',
      senderProfileName: (effectiveSender?.configuration as any)?.connectedProfileName || '',
      channelId: (activePostSaleChannelId !== 'geral') ? activePostSaleChannelId : undefined,
      channelName: isChannelActive ? activePostSaleChannel?.name : undefined,
    };
  }, [activeSenderSource, selectedRecipientPhone, selectedLead?.phone, getSourceCleanLabel, getSourceAvatar, activePostSaleChannel, activePostSaleChannelId]);

  // Envio do anexo pendente no chat (ex: comprovante de agendamento compartilhado)
  const handleSendPendingAttachment = async (customCaption?: string) => {
    if (!pendingAttachment || !selectedLead || isLeadSpectator) return;
    if (!ensureSenderReady()) return;
    const attachmentToSend = pendingAttachment;
    setPendingAttachment(null);

    const caption = customCaption !== undefined ? customCaption : (messageText.trim() || attachmentToSend.caption || '');
    setMessageText('');

    const targetPhone = selectedRecipientPhone || selectedLead.phone;
    const author = currentUser?.name || (isPostSaleFunnel || selectedLead.isClient ? 'Gestor de Sucesso' : 'Equipe Comercial');

    // Detecta tipo real do anexo pelo nome do arquivo
    const lowerFileName = (attachmentToSend.fileName || '').toLowerCase();
    const isDocumentFile = /\.(pdf|docx?|xlsx?|pptx?|txt|zip|rar|csv|odt|ods)$/i.test(lowerFileName);
    const isVideoFile = /\.(mp4|mov|avi|webm|mkv)$/i.test(lowerFileName);
    const isAudioFile = /\.(ogg|mp3|opus|wav|m4a|aac)$/i.test(lowerFileName);
    // Fallback: se a dataUrl indicar tipo
    const dataUrlMime = (attachmentToSend.dataUrl || '').split(';')[0].replace('data:', '').toLowerCase();
    const detectedCategory: 'image' | 'document' | 'video' | 'audio' =
      isDocumentFile || dataUrlMime.startsWith('application/') || dataUrlMime === 'text/plain'
        ? 'document'
        : isVideoFile || dataUrlMime.startsWith('video/')
        ? 'video'
        : isAudioFile || dataUrlMime.startsWith('audio/')
        ? 'audio'
        : 'image';

    const activityId = generateUuid();
    const existingActs = selectedLead.activities || [];
    const lastActTime = existingActs.reduce((max, a) => Math.max(max, new Date(a.timestamp || 0).getTime()), 0);
    const finalTimestampIso = new Date(Math.max(Date.now(), lastActTime + 1000)).toISOString();

    const newActivity: LeadActivity = {
      id: activityId,
      leadId: selectedLead.id,
      timestamp: finalTimestampIso,
      type: 'contact',
      title: detectedCategory === 'document'
        ? `Documento: ${attachmentToSend.fileName}`
        : detectedCategory === 'video'
        ? 'Vídeo enviado'
        : detectedCategory === 'audio'
        ? 'Áudio enviado'
        : 'Foto enviada',
      text: caption || undefined,
      mediaUrl: attachmentToSend.dataUrl,
      mediaType: detectedCategory,
      authorName: author,
      authorId: currentUser?.id,
      authorAvatarUrl: currentUser?.avatarUrl,
      metadata: {
        ...getAppSenderMetadata(),
        fileName: attachmentToSend.fileName,
        caption: caption || undefined,
        isAppointmentReceipt: true,
      },
    } as any;

    const updatedActivities = mergeAndSortActivities(selectedLead.activities || [], [newActivity], selectedLead.id);
    updateLeadData(selectedLead.id, {
      activities: updatedActivities,
      updatedAt: new Date().toISOString().split('T')[0],
    });

    if (isSupabaseConfigured) {
      leadService.addActivity(selectedLead.id, newActivity)
        .catch(err => console.error('Erro ao salvar comprovante no Supabase:', err));
    }

    if (targetPhone && activeSenderToken) {
      try {
        const captionText = caption || undefined;
        const mediaPayload: any = {
          number: targetPhone,
          file: attachmentToSend.dataUrl,
          type: detectedCategory,
          fileName: attachmentToSend.fileName,
          text: captionText,
          caption: captionText,
          ptt: false,
          delay: 0,
        };
        // Para documentos, o campo oficial da UAZAPI é docName
        if (detectedCategory === 'document') {
          mediaPayload.docName = attachmentToSend.fileName;
        }
        await uazapiService.sendMedia(activeSenderToken, mediaPayload);
      } catch (err) {
        console.error('Falha no envio de comprovante UAZAPI:', err);
      }
    }
  };

  // Rolagem suave e highlight animado até a mensagem respondida
  const handleScrollToQuotedMessage = (targetId?: string) => {
    if (!targetId) return;
    let targetEl = document.getElementById(`msg-${targetId}`);
    if (!targetEl) {
      const matchingAct = (selectedLead?.activities || []).find(
        a => a.id === targetId || a.messageId === targetId || (a as any).wamid === targetId
      );
      if (matchingAct) {
        targetEl = document.getElementById(`msg-${matchingAct.id}`);
      }
    }

    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMsgId(targetId);
      targetEl.classList.remove('f5-msg-blink-highlight');
      void targetEl.offsetWidth; // Força reflow no navegador
      targetEl.classList.add('f5-msg-blink-highlight');
      setTimeout(() => {
        targetEl?.classList.remove('f5-msg-blink-highlight');
        setHighlightedMsgId(null);
      }, 1800);
    }
  };

  // Handle Send Message / Note
  const handleSendMessage = async (e?: React.FormEvent, directText?: string) => {
    if (e) e.preventDefault();
    if (isMessagingPaused()) { toast.error(MESSAGING_PAUSED_TEXT); return; } // pausa geral de mensagens
    const textToUse = directText !== undefined ? directText : messageText;

    // Se houver anexo pendente no chat, encaminha para o envio de mídia
    if (pendingAttachment && (!pendingAttachment.leadId || pendingAttachment.leadId === selectedLead?.id)) {
      await handleSendPendingAttachment(textToUse.trim());
      return;
    }

    // Se houver mídia estagiada no chat (foto, vídeo ou documento selecionado), dispara com a legenda
    if (stagedMedia) {
      await handleSendStagedMedia(textToUse.trim());
      return;
    }

    if (!selectedLead || !textToUse.trim() || isLeadSpectator) return;

    if (presenceTimerRef.current) clearTimeout(presenceTimerRef.current);
    const textToSend = textToUse.trim();
    const author = currentUser?.name || (isPostSaleFunnel || selectedLead.isClient ? 'Gestor de Sucesso' : 'Equipe Comercial');
    setMessageText('');

    // Prepara payload de citação caso esteja respondendo a uma mensagem
    const quotePayload = replyingToMessage ? {
      id: replyingToMessage.id,
      messageId: replyingToMessage.messageId,
      sender: replyingToMessage.authorName || (replyingToMessage.type === 'contact' ? selectedLead?.name || 'Lead' : 'Você'),
      text: replyingToMessage.text || (replyingToMessage.mediaType === 'audio' ? 'Mensagem de voz' : replyingToMessage.mediaType === 'image' ? 'Foto' : replyingToMessage.mediaType === 'video' ? 'Vídeo' : 'Documento'),
      type: (replyingToMessage.mediaType || 'text') as any,
      mediaUrl: replyingToMessage.mediaUrl,
      audioDuration: (replyingToMessage as any).mediaDuration || (replyingToMessage as any).durationText,
    } : undefined;

    const replyingTargetMsg = replyingToMessage;
    setReplyingToMessage(null);

    let newActivity: LeadActivity;

    // Garante que o timestamp da mensagem enviada seja estritamente posterior a todas as mensagens anteriores
    const existingActs = selectedLead.activities || [];
    const lastActTime = existingActs.reduce((max, a) => Math.max(max, new Date(a.timestamp || 0).getTime()), 0);
    const finalTimestampIso = new Date(Math.max(Date.now(), lastActTime + 1000)).toISOString();

    if (composerTab === 'notes') {
      if (selectedLead.isClient) {
        addClientNote(selectedLead.id, textToSend);
      } else {
        addLeadNote(selectedLead.id, textToSend);
      }
      return;
    }

    if (!ensureSenderReady()) return;

    newActivity = {
      id: generateUuid(),
      leadId: selectedLead.id,
      timestamp: finalTimestampIso,
      type: 'contact',
      title: `Mensagem enviada via WhatsApp`,
      text: textToSend,
      authorName: currentUser?.name || author,
      authorId: currentUser?.id,
      authorAvatarUrl: currentUser?.avatarUrl,
      status: 'sending',
      quotedMessage: quotePayload,
      channelId: (activePostSaleChannelId !== 'geral') ? activePostSaleChannelId : undefined,
      channelName: (activePostSaleChannel) ? activePostSaleChannel.name : undefined,
      instanceId: activeSenderSource?.id,
      metadata: {
        ...getAppSenderMetadata(),
        isOptimistic: true,
      },
    } as any;

    const updatedActivities = mergeAndSortActivities(selectedLead.activities || [], [newActivity], selectedLead.id);
    updateLeadData(selectedLead.id, {
      activities: updatedActivities,
      updatedAt: new Date().toISOString().split('T')[0],
      lastInteractionAt: finalTimestampIso,
      lastMessageDirection: 'outgoing',
      lastMessageText: textToSend.slice(0, 200),
      lastMessageAt: finalTimestampIso,
    });

    // Disparo oficial via UAZAPI
    let targetPhone = selectedRecipientPhone || selectedLead.phone;
    let effectiveToken = activeSenderToken;


    if (targetPhone && effectiveToken) {
      // Limpa presença de digitando imediatamente para liberar a entrega
      uazapiService.sendPresence(effectiveToken, {
        number: targetPhone,
        presence: 'paused',
      }).catch(() => { });

      try {
        const sendRes = await uazapiService.sendText(effectiveToken, {
          number: targetPhone,
          text: textToSend,
          linkPreview: textToSend.includes('http://') || textToSend.includes('https://'),
          readchat: true,
          track_source: 'f5_system',
          track_id: `msg_${Date.now()}`,
          replyid: replyingTargetMsg ? (replyingTargetMsg.messageId || replyingTargetMsg.id) : undefined,
        });

        // Se a API retornou erro no corpo da resposta
        if ((sendRes as any)?.error || (sendRes as any)?.status === 'error') {
          throw new Error((sendRes as any)?.message || (sendRes as any)?.error || 'Erro retornado pela API do WhatsApp.');
        }

        const returnedMessageId = (sendRes as any)?.messageId || (sendRes as any)?.key?.id || (sendRes as any)?.id;

        // Sucesso no envio: marca status como sent e atualiza atômicamente sem sobrescrever mensagens subsequentes
        if (newActivity) {
          const sentActivity: LeadActivity = {
            ...newActivity,
            status: 'sent',
            errorMessage: undefined,
            messageId: returnedMessageId || newActivity.id,
          };
          updateLeadActivity(selectedLead.id, newActivity.id, {
            status: 'sent',
            errorMessage: undefined,
            messageId: returnedMessageId || newActivity.id,
          });

          if (isSupabaseConfigured) {
            leadService.addActivity(selectedLead.id, sentActivity)
              .catch(err => console.error('Erro ao salvar mensagem no Supabase:', err));
            leadService.update(selectedLead.id, {
              updatedAt: new Date().toISOString().split('T')[0],
              lastInteractionAt: finalTimestampIso,
              lastMessageDirection: 'outgoing',
              lastMessageText: textToSend.slice(0, 200),
              lastMessageAt: finalTimestampIso,
            }).catch(() => { });
          }
        }

        // Sincroniza foto de perfil na Central de Contatos (TTL de 7 dias com propagação automática)
        const currentMasterId = effectiveUser?.masterId || currentUser?.masterId || effectiveUser?.id || currentUser?.id;
        if (currentMasterId && activeSenderToken && targetPhone) {
          whatsappMediaService.syncContactAvatar({ phone: targetPhone, name: selectedLead.name }, activeSenderToken, currentMasterId)
            .then(res => {
              if (res.updated && res.avatarUrl) {
                if (targetPhone === selectedLead.phone) {
                  updateLeadData(selectedLead.id, { avatarUrl: res.avatarUrl });
                }
              }
            })
            .catch(() => { });
        }
      } catch (err: any) {
        console.error('Disparo UAZAPI falhou:', err);
        const errMsg = err?.message || 'Falha ao conectar com o WhatsApp via UAZAPI';
        if (newActivity) {
          const failedActivity: LeadActivity = { ...newActivity, status: 'failed', errorMessage: errMsg };
          updateLeadActivity(selectedLead.id, newActivity.id, {
            status: 'failed',
            errorMessage: errMsg,
          });

          if (isSupabaseConfigured) {
            leadService.addActivity(selectedLead.id, failedActivity)
              .catch(e => console.error('Erro ao salvar falha de envio no Supabase:', e));
          }
        }
      }
    } else {
      const missingReason = !activeSenderToken
        ? 'Nenhum canal de WhatsApp conectado para esta casa de festa. Conecte em Origens.'
        : 'Número de telefone do destinatário inválido ou ausente.';
      console.warn('[WhatsApp Send Warning]:', missingReason, { targetPhone, activeSenderToken });

      if (newActivity) {
        const failedActivity: LeadActivity = { ...newActivity, status: 'failed', errorMessage: missingReason };
        const currentActivities = updatedActivities.map(a => a.id === newActivity!.id ? failedActivity : a);
        updateLeadData(selectedLead.id, {
          activities: currentActivities,
        });

        if (isSupabaseConfigured) {
          leadService.addActivity(selectedLead.id, failedActivity)
            .catch(e => console.error('Erro ao salvar aviso no Supabase:', e));
        }
      }
    }
  };

  // Estado de reenvio em andamento
  const [retryingMessageId, setRetryingMessageId] = useState<string | null>(null);

  // Reenviar mensagem que falhou
  const handleRetryMessage = async (activity: LeadActivity) => {
    if (!selectedLead || !activity || retryingMessageId) return;
    if (!ensureSenderReady()) return;

    const targetPhone = selectedRecipientPhone || selectedLead.phone;
    if (!activeSenderToken || !targetPhone) {
      toast.warning(!activeSenderToken ? 'Nenhum canal de WhatsApp conectado para esta unidade.' : 'Telefone do destinatário não encontrado.');
      return;
    }

    setRetryingMessageId(activity.id);

    try {
      if (activity.mediaUrl && activity.mediaType && activity.mediaType !== 'text') {
        // Reenvia mídia
        await uazapiService.sendMedia(activeSenderToken, {
          number: targetPhone,
          file: activity.mediaUrl,
          type: activity.mediaType as any,
          caption: activity.text,
          ptt: activity.mediaType === 'audio',
        });
      } else {
        // Reenvia texto
        const textContent = activity.text || activity.title || '';
        const res = await uazapiService.sendText(activeSenderToken, {
          number: targetPhone,
          text: textContent,
          linkPreview: textContent.includes('http://') || textContent.includes('https://'),
          readchat: true,
          track_source: 'f5_system',
          track_id: `retry_${Date.now()}`,
        });
        if ((res as any)?.error || (res as any)?.status === 'error') {
          throw new Error((res as any)?.message || (res as any)?.error || 'Erro na API do WhatsApp');
        }
      }

      // Sucesso: remove o status de erro e marca como enviado
      const updatedActivity: LeadActivity = {
        ...activity,
        status: 'sent',
        errorMessage: undefined,
      };

      const updatedActivities = (selectedLead.activities || []).map(a =>
        a.id === activity.id ? updatedActivity : a
      );

      updateLeadData(selectedLead.id, { activities: updatedActivities });

      if (isSupabaseConfigured) {
        leadService.updateActivity(activity.id, { status: 'sent', errorMessage: undefined as any }).catch(() => { });
      }
    } catch (err: any) {
      console.error('Falha ao reenviar mensagem:', err);
      const errMsg = err?.message || 'Falha ao conectar com o WhatsApp via UAZAPI';
      const updatedActivity: LeadActivity = {
        ...activity,
        status: 'failed',
        errorMessage: errMsg,
      };

      const updatedActivities = (selectedLead.activities || []).map(a =>
        a.id === activity.id ? updatedActivity : a
      );

      updateLeadData(selectedLead.id, { activities: updatedActivities });

      if (isSupabaseConfigured) {
        leadService.updateActivity(activity.id, { status: 'failed', errorMessage: errMsg }).catch(() => { });
      }
    } finally {
      setRetryingMessageId(null);
    }
  };



  /**
   * Helper para checar se a conversa de qualquer lead está encerrada
   */
  const checkLeadConversationClosed = useCallback((lead: Lead): boolean => {
    if (!lead?.activities || lead.activities.length === 0) return false;
    const chatActivities = (lead.activities || []).filter(a => {
      const isViewAudit = (a as any).metadata?.isViewAudit === true || a.title === 'Mensagem Visualizada' || (a.text && a.text.includes('visualizou esta mensagem'));
      if (isViewAudit) return false;
      return a.type === 'contact' || (a as any).type === 'whatsapp';
    });
    if (chatActivities.length === 0) return false;

    const sortedActs = [...chatActivities].sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      if (timeA !== timeB) return timeA - timeB;
      const isEndA = Boolean((a as any).metadata?.isSessionEnd || (a.title || '').toLowerCase().includes('conversa encerrada'));
      const isEndB = Boolean((b as any).metadata?.isSessionEnd || (b.title || '').toLowerCase().includes('conversa encerrada'));
      if (isEndA && !isEndB) return 1;
      if (!isEndA && isEndB) return -1;
      return 0;
    });

    const lastAct = sortedActs[sortedActs.length - 1];
    return Boolean(
      (lastAct as any).metadata?.isSessionEnd === true ||
      (lastAct.title || '').toLowerCase().includes('conversa encerrada') ||
      (lastAct.text || '').toLowerCase().includes('atendimento encerrado') ||
      (lastAct.title || '').toLowerCase().includes('atendimento finalizado')
    );
  }, []);

  /**
   * Finaliza / Encerra o atendimento da conversa atual especificamente do número/destinatário em aberto
   */
  const handleEndConversation = async (targetLeadId?: string) => {
    const activePhone = activeRecipient?.phone || selectedRecipientPhone || selectedLead?.phone || '';
    const activeDigits = activePhone.replace(/\D/g, '').slice(-8);
    const matchingLead = (sourceLeads || []).find(l => (l.phone || '').replace(/\D/g, '').slice(-8) === activeDigits) || selectedLead;
    const targetLead = targetLeadId ? (sourceLeads.find(l => l.id === targetLeadId) || selectedLead) : matchingLead;
    if (!targetLead) return;

    // Regra do Áudio 2: Garante timestamp estritamente posterior à última mensagem da conversa
    const currentActivities = targetLead.activities || [];
    const lastActTime = currentActivities.reduce((max, a) => Math.max(max, new Date(a.timestamp || 0).getTime()), 0);
    const finalTimestampIso = new Date(Math.max(Date.now(), lastActTime + 1000)).toISOString();

    const activeName = activeRecipient?.name ? ` (${activeRecipient.name})` : '';

    const endSessionActivity: LeadActivity = {
      id: generateUuid(),
      leadId: targetLead.id,
      type: 'contact',
      title: 'Conversa Encerrada',
      text: `Atendimento encerrado por ${currentUser?.name || 'Equipe'}${activeName}`,
      authorName: currentUser?.name || 'Equipe',
      authorId: currentUser?.id || 'team',
      authorAvatarUrl: currentUser?.avatarUrl,
      timestamp: finalTimestampIso,
      status: 'read',
    };
    (endSessionActivity as any).metadata = {
      isSessionEnd: true,
      closedById: currentUser?.id,
      closedByName: currentUser?.name,
      recipientPhone: activePhone,
      phone: activePhone,
      fromMe: true,
    };

    const updatedActivities = [...currentActivities, endSessionActivity];

    updateLeadData(targetLead.id, {
      activities: updatedActivities,
      updatedAt: finalTimestampIso,
    });

    if (isSupabaseConfigured) {
      leadService.addActivity(targetLead.id, endSessionActivity).catch(err => {
        console.error('Erro ao persistir encerramento de conversa no Supabase:', err);
      });
      leadService.update(targetLead.id, { updatedAt: finalTimestampIso }).catch(() => { });
    }
  };

  // Tarefas Unificadas do Lead (Combina tarefas internas do lead com tarefas globais atribuídas ao leadId)
  const combinedLeadTasks = useMemo(() => {
    if (!selectedLead) return [];
    const fromLead = selectedLead.tasks || [];
    const fromGlobal = (tasks || []).filter(t => t.leadId === selectedLead.id || t.customProperties?.leadId === selectedLead.id);
    const map = new Map<string, any>();
    fromLead.forEach(t => map.set(t.id, t));
    fromGlobal.forEach(t => {
      const existing = map.get(t.id);
      map.set(t.id, {
        ...existing,
        ...t,
        description: t.title || t.description || existing?.description || 'Tarefa sem título',
      });
    });
    const sorted = Array.from(map.values()).sort((a, b) => {
      const dateA = a.dueDate || (a.createdAt ? a.createdAt.split('T')[0] : '');
      const dateB = b.dueDate || (b.createdAt ? b.createdAt.split('T')[0] : '');
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      const cmp = dateA.localeCompare(dateB);
      if (cmp !== 0) return cmp;
      const timeA = a.dueTime || '';
      const timeB = b.dueTime || '';
      return timeA.localeCompare(timeB);
    });
    return sorted;
  }, [selectedLead, tasks]);

  // Lista consolidada de agendamentos e compromissos do contrato/lead
  const clientAppointments = useMemo(() => {
    if (!selectedLead) return [];
    const list: any[] = [];

    if (selectedLead.visitCommitment) {
      list.push({
        id: 'visit_commitment',
        type: 'visit',
        typeLabel: 'Visita Técnica',
        title: 'Visita Técnica Oficial',
        date: selectedLead.visitCommitment.date,
        time: selectedLead.visitCommitment.time,
        venueName: (selectedLead.visitCommitment as any).venueName || selectedLead.venueName || 'Unidade Bonomo',
        status: selectedLead.visitCommitment.status || 'confirmed',
        pax: selectedLead.visitCommitment.pax,
        closerName: (selectedLead.visitCommitment as any).closerName || selectedLead.closerName,
      });
    }

    if (selectedLead.tastingCommitment) {
      list.push({
        id: 'tasting_commitment',
        type: 'tasting',
        typeLabel: 'Degustação',
        title: 'Degustação Gastronômica',
        date: selectedLead.tastingCommitment.date,
        time: selectedLead.tastingCommitment.time,
        venueName: (selectedLead.tastingCommitment as any).venueName || selectedLead.venueName || 'Unidade Bonomo',
        status: selectedLead.tastingCommitment.status || 'confirmed',
        pax: selectedLead.tastingCommitment.pax,
        closerName: (selectedLead.tastingCommitment as any).closerName || selectedLead.closerName,
      });
    }

    (combinedLeadTasks || []).forEach(t => {
      const isApp = t.type === 'meeting' || t.type === 'appointment' || t.type === 'visit' || t.type === 'tasting' || (t as any).isCommitment || (t as any).customProperties?.type === 'appointment';
      if (isApp) {
        list.push({
          id: t.id,
          type: t.type || 'appointment',
          typeLabel: t.type === 'visit' ? 'Visita' : t.type === 'tasting' ? 'Degustação' : 'Compromisso',
          title: t.title || t.description || 'Compromisso Operacional',
          date: t.dueDate || '',
          time: t.dueTime || '',
          venueName: (t as any).venueName || selectedLead.venueName || 'Unidade Bonomo',
          status: t.status === 'completed' ? 'completed' : 'scheduled',
          pax: (t as any).customProperties?.pax,
          closerName: (t as any).assignedToName,
          notes: (t as any).content || t.description,
        });
      }
    });

    return list;
  }, [selectedLead, combinedLeadTasks]);

  // Cliente Atual & Métricas Financeiras / Upsell / Documentos
  const currentClient = useMemo(() => {
    if (!selectedLead) return null;
    return clients.find(c => c.id === selectedLead.id) || null;
  }, [clients, selectedLead]);

  const baseContract = currentClient?.baseContractValue ?? (selectedLead as any)?.contractValue ?? selectedLead?.dealValue ?? 42000;
  const downPayment = currentClient?.contractDownPayment ?? (selectedLead as any)?.contractDownPayment ?? 0;
  const installmentsRemaining = currentClient?.contractInstallmentsRemaining ?? Math.max(0, baseContract - downPayment);

  const clientUpsells = useMemo<ClientUpsellSale[]>(() => {
    return (currentClient?.upsellSales || (selectedLead as any)?.upsellSales || []) as ClientUpsellSale[];
  }, [currentClient, selectedLead]);

  const totalUpsell = useMemo(() => {
    return clientUpsells.reduce((acc: number, s: ClientUpsellSale) => acc + (Number(s.value) || 0), 0);
  }, [clientUpsells]);

  const upsellAVista = useMemo(() => {
    return clientUpsells.filter(s => s.paymentStatus === 'pago').reduce((acc: number, s: ClientUpsellSale) => acc + (Number(s.value) || 0), 0);
  }, [clientUpsells]);

  const upsellParcelado = useMemo(() => {
    return clientUpsells.filter(s => s.paymentStatus !== 'pago').reduce((acc: number, s: ClientUpsellSale) => acc + (Number(s.value) || 0), 0);
  }, [clientUpsells]);

  const totalCashReceived = downPayment + upsellAVista;
  const totalForecastedRemaining = installmentsRemaining + upsellParcelado;
  const totalRentabilidade = baseContract + totalUpsell;

  // Arquivos do contrato do sistema vinculado ao cliente: entram em "Documentos Contratuais" (somente leitura)
  const [linkedContractDocs, setLinkedContractDocs] = useState<ClientDocument[]>([]);
  const contractDocsMasterId = currentUser?.masterId || currentUser?.id || '';
  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!currentClient?.id || !contractDocsMasterId) { if (alive) setLinkedContractDocs([]); return; }
      const ct = await contractService.getContractByClientId(currentClient.id, contractDocsMasterId);
      if (!alive) return;
      if (!ct) { setLinkedContractDocs([]); return; }
      const files = getContractDocuments(ct);
      setLinkedContractDocs(files.map((f, i) => ({
        id: `contract_file_${ct.id}_${i}`, clientId: currentClient.id, title: f.name, name: f.name,
        type: 'contract', fileUrl: f.url, url: f.url, uploadedAt: ct.approvedAt || ct.createdAt,
      } as ClientDocument)));
    };
    void load();
    const onChanged = () => { void load(); };
    window.addEventListener('f5:contracts-changed', onChanged);
    return () => { alive = false; window.removeEventListener('f5:contracts-changed', onChanged); };
  }, [currentClient?.id, contractDocsMasterId]);

  const clientDocuments = useMemo<ClientDocument[]>(() => {
    const own = (currentClient?.documents || (selectedLead as any)?.documents || []) as ClientDocument[];
    return [...linkedContractDocs, ...own];
  }, [currentClient, selectedLead, linkedContractDocs]);

  const handleSaveUpsell = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!upsellTitle.trim() || !upsellValue || !selectedLead) return;
    const numVal = parseFloat(upsellValue.toString().replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    if (numVal <= 0) return;

    const clientId = currentClient?.id || selectedLead.id;
    const finalDate = upsellDate || new Date().toISOString().split('T')[0];
    const finalTime = upsellTime || new Date().toTimeString().slice(0, 5);
    const sellerCollab = collaborators.find(c => c.id === upsellResponsibleId) || currentUser;

    if (editingUpsell) {
      updateClientUpsellSale(clientId, editingUpsell.id, {
        title: upsellTitle.trim(),
        category: upsellCategory,
        value: numVal,
        saleDate: finalDate,
        saleTime: finalTime,
        soldAt: `${finalDate}T${finalTime}:00`,
        responsibleId: sellerCollab?.id,
        responsibleName: sellerCollab?.name || editingUpsell.responsibleName || 'Administrador',
        paymentStatus: upsellPaymentStatus,
        paymentMethod: upsellPaymentMethod,
        notes: upsellNotes.trim() || undefined,
      });
    } else {
      addClientUpsellSale(clientId, {
        title: upsellTitle.trim(),
        category: upsellCategory,
        value: numVal,
        venueId: currentClient?.venueId || selectedLead?.venueId,
        saleDate: finalDate,
        saleTime: finalTime,
        soldAt: `${finalDate}T${finalTime}:00`,
        paymentStatus: upsellPaymentStatus,
        paymentMethod: upsellPaymentMethod,
        responsibleId: sellerCollab?.id,
        responsibleName: sellerCollab?.name || 'Administrador',
        notes: upsellNotes.trim() || undefined,
      });
    }

    setIsUpsellModalOpen(false);
    setEditingUpsell(null);
    setUpsellTitle('');
    setUpsellValue('');
    setUpsellNotes('');
    setUpsellTime(new Date().toTimeString().slice(0, 5));
  };

  const handleDeleteUpsell = (saleId: string) => {
    const clientId = currentClient?.id || selectedLead?.id;
    if (!clientId) return;
    if (window.confirm('Tem certeza que deseja remover esta venda adicional / upsell?')) {
      deleteClientUpsellSale(clientId, saleId);
    }
  };

  const handleSaveDoc = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isDocUploading) return;
    if (!docTitle.trim() || !docFileUrl.trim()) return;
    const clientId = currentClient?.id || selectedLead?.id;
    if (!clientId) return;

    addClientDocument(clientId, {
      title: docTitle.trim(),
      name: docFileName || docTitle.trim(),
      type: docType,
      fileUrl: docFileUrl.trim(),
      url: docFileUrl.trim(),
      fileSize: docFileSize || 'Arquivo Anexado',
      sizeBytes: docSizeBytes,
    });

    setIsDocModalOpen(false);
    setDocTitle('');
    setDocFileUrl('');
    setDocFileSize('');
    setDocFileName('');
    setDocSizeBytes(undefined);
  };

  const handleDeleteDoc = (docId: string) => {
    const clientId = currentClient?.id || selectedLead?.id;
    if (!clientId) return;
    if (window.confirm('Tem certeza que deseja remover este documento?')) {
      if (currentClient) {
        updateClient(currentClient.id, {
          documents: (currentClient.documents || []).filter(d => d.id !== docId),
        });
      }
    }
  };

  // Media file handlers
  const handleTriggerFileInput = (type: 'document' | 'media' | 'audio') => {
    setIsAttachmentMenuOpen(false);
    if (type === 'document' && fileDocInputRef.current) fileDocInputRef.current.click();
    if (type === 'media' && fileMediaInputRef.current) fileMediaInputRef.current.click();
    if (type === 'audio' && fileAudioInputRef.current) fileAudioInputRef.current.click();
  };

  const handleSelectFilesForStaging = (
    e: React.ChangeEvent<HTMLInputElement>,
    forcedCategory?: 'document' | 'image' | 'video' | 'audio'
  ) => {
    const file = e.target.files?.[0];
    if (!file || !selectedLead) {
      e.target.value = '';
      return;
    }
    e.target.value = '';

    const isVid = file.type.startsWith('video');
    const isAud = file.type.startsWith('audio');
    const isImg = file.type.startsWith('image');
    const category: 'document' | 'image' | 'video' | 'audio' =
      forcedCategory || (isVid ? 'video' : isImg ? 'image' : isAud ? 'audio' : 'document');

    if (stagedMedia?.previewUrl) {
      URL.revokeObjectURL(stagedMedia.previewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    setStagedMedia({
      file,
      previewUrl,
      category,
      fileName: file.name,
      fileSize: file.size,
    });
  };

  const handleCancelStagedMedia = () => {
    if (stagedMedia?.previewUrl) {
      URL.revokeObjectURL(stagedMedia.previewUrl);
    }
    setStagedMedia(null);
  };

  const handleSendStagedMedia = async (customCaption?: string) => {
    if (!stagedMedia || !selectedLead || isLeadSpectator) return;
    if (!ensureSenderReady()) return;
    const mediaItem = stagedMedia;
    setStagedMedia(null);

    const caption = customCaption !== undefined ? customCaption : messageText.trim();
    setMessageText('');

    const targetPhone = selectedRecipientPhone || selectedLead.phone;
    const author = currentUser?.name || (isPostSaleFunnel || selectedLead.isClient ? 'Gestor de Sucesso' : 'Equipe Comercial');

    const activityId = generateUuid();
    const existingActs = selectedLead.activities || [];
    const lastActTime = existingActs.reduce((max, a) => Math.max(max, new Date(a.timestamp || 0).getTime()), 0);
    const finalTimestampIso = new Date(Math.max(Date.now(), lastActTime + 1000)).toISOString();

    const quotePayload = replyingToMessage ? {
      id: replyingToMessage.id,
      messageId: replyingToMessage.messageId,
      sender: replyingToMessage.authorName || (replyingToMessage.type === 'contact' ? selectedLead?.name || 'Lead' : 'Você'),
      text: replyingToMessage.text || (replyingToMessage.mediaType === 'audio' ? 'Mensagem de voz' : replyingToMessage.mediaType === 'image' ? 'Foto' : replyingToMessage.mediaType === 'video' ? 'Vídeo' : 'Documento'),
      type: (replyingToMessage.mediaType || 'text') as any,
      mediaUrl: replyingToMessage.mediaUrl,
    } : undefined;
    const replyingTargetMsg = replyingToMessage;
    setReplyingToMessage(null);

    const fallbackText = caption || (
      mediaItem.category === 'audio' ? `🎵 ${mediaItem.fileName}` :
      mediaItem.category === 'document' ? mediaItem.fileName :
      mediaItem.category === 'video' ? '🎥 Vídeo' :
      mediaItem.category === 'image' ? '📷 Foto' :
      mediaItem.fileName
    );

    // Atividade otimista usa blob: URL para renderização instantânea sem sobrecarregar LocalStorage/memória
    const newActivity: LeadActivity = {
      id: activityId,
      leadId: selectedLead.id,
      timestamp: finalTimestampIso,
      type: 'contact',
      title: mediaItem.category === 'image' ? 'Foto enviada' : mediaItem.category === 'video' ? 'Vídeo enviado' : mediaItem.category === 'audio' ? 'Áudio enviado' : `Documento: ${mediaItem.fileName}`,
      text: fallbackText,
      mediaUrl: mediaItem.previewUrl,
      mediaType: mediaItem.category,
      authorName: currentUser?.name || author,
      authorId: currentUser?.id,
      authorAvatarUrl: currentUser?.avatarUrl,
      quotedMessage: quotePayload,
      metadata: {
        ...getAppSenderMetadata(),
        fileName: mediaItem.fileName,
        caption: caption || undefined,
        isOptimistic: true,
      },
    } as any;

    const updatedActivities = mergeAndSortActivities(selectedLead.activities || [], [newActivity], selectedLead.id);
    updateLeadData(selectedLead.id, {
      activities: updatedActivities,
      updatedAt: new Date().toISOString().split('T')[0],
    });

    // 1. Converte em Base64 estritamente para envio na UAZAPI
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(mediaItem.file);
    }).catch(err => {
      console.error('Erro ao ler arquivo para envio UAZAPI:', err);
      return null;
    });

    if (targetPhone && activeSenderToken && base64Data) {
      try {
        const mediaRes = await uazapiService.sendMedia(activeSenderToken, {
          number: targetPhone,
          file: base64Data,
          type: mediaItem.category === 'audio' ? 'audio' : mediaItem.category === 'video' ? 'video' : mediaItem.category === 'image' ? 'image' : 'document',
          fileName: mediaItem.fileName,
          ...(mediaItem.category === 'document' ? { docName: mediaItem.fileName } : {}),
          caption: caption || (mediaItem.category === 'document' ? mediaItem.fileName : undefined),
          replyid: replyingTargetMsg ? (replyingTargetMsg.messageId || replyingTargetMsg.id) : undefined,
          ptt: false,
          delay: 0,
        });
        const mediaMsgId = (mediaRes as any)?.messageId || (mediaRes as any)?.key?.id || (mediaRes as any)?.id;
        if (mediaMsgId) {
          updateLeadActivity(selectedLead.id, activityId, { messageId: mediaMsgId });
        }
      } catch (err) {
        console.error('Falha no envio de mídia UAZAPI:', err);
      }
    }

    // 2. Upload assíncrono para o Cloudflare R2 para obter URL permanente
    whatsappMediaService.uploadOutboundMedia(mediaItem.file, activeSenderToken || 'default')
      .then(({ publicUrl }) => {
        if (publicUrl) {
          updateLeadActivity(selectedLead.id, activityId, { mediaUrl: publicUrl, mediaType: mediaItem.category });
          if (isSupabaseConfigured) {
            leadService.addActivity(selectedLead.id, {
              ...newActivity,
              mediaUrl: publicUrl,
            }).catch(err => console.error('Erro ao salvar mídia permanente no Supabase:', err));
          }
        }
      })
      .catch(err => {
        console.warn('Erro ao salvar mídia enviada no R2:', err);
        if (isSupabaseConfigured) {
          leadService.addActivity(selectedLead.id, {
            ...newActivity,
            mediaUrl: undefined,
          }).catch(() => { });
        }
      });
  };

  const handleShareContact = async (name: string, phone: string) => {
    if (!selectedLead || !ensureSenderReady()) return;
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) {
      toast.error('Telefone de contato inválido.');
      return;
    }

    const author = currentUser?.name || 'Equipe Comercial';
    const targetPhone = selectedRecipientPhone || selectedLead.phone;
    const activityId = generateUuid();
    const existingActs = selectedLead.activities || [];
    const lastActTime = existingActs.reduce((max, a) => Math.max(max, new Date(a.timestamp || 0).getTime()), 0);
    const finalTimestampIso = new Date(Math.max(Date.now(), lastActTime + 1000)).toISOString();

    const formattedCleanPhone = formatPhone(cleanPhone);
    const newActivity: LeadActivity = {
      id: activityId,
      leadId: selectedLead.id,
      timestamp: finalTimestampIso,
      type: 'contact',
      title: 'Contato compartilhado via WhatsApp',
      text: `👤 Contato: ${name} (${formattedCleanPhone})`,
      mediaType: 'vcard' as any,
      authorName: currentUser?.name || author,
      authorId: currentUser?.id,
      authorAvatarUrl: currentUser?.avatarUrl,
      status: 'sent',
      metadata: {
        ...getAppSenderMetadata(),
        isContactCard: true,
        contactName: name,
        contactPhone: cleanPhone,
        isOptimistic: true,
      },
    } as any;

    const updatedActivities = mergeAndSortActivities(selectedLead.activities || [], [newActivity], selectedLead.id);
    updateLeadData(selectedLead.id, {
      activities: updatedActivities,
      updatedAt: new Date().toISOString().split('T')[0],
    });

    if (isSupabaseConfigured) {
      leadService.addActivity(selectedLead.id, newActivity)
        .catch(err => console.error('Erro ao salvar contato no Supabase:', err));
    }

    if (targetPhone && activeSenderToken) {
      try {
        await uazapiService.sendContact(activeSenderToken, {
          number: targetPhone,
          contactName: name,
          contactPhone: cleanPhone,
        });
      } catch (err) {
        console.error('Falha ao enviar contato via UAZAPI:', err);
      }
    }

    setIsShareContactModalOpen(false);
    setContactSearchQuery('');
    setCustomContactName('');
    setCustomContactPhone('');
    toast.success(`Contato de "${name}" compartilhado com sucesso!`);
  };

  const handleCreateLeadFromContactCard = async (name: string, phone: string) => {
    const masterId = currentUser?.masterId || currentUser?.id || '';
    if (!activeFunnel?.id || !masterId) {
      toast.error('Nenhum funil ativo selecionado.');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const venueId = selectedLead?.venueId || (venues?.[0]?.id || '');
    try {
      const { supabase } = await import('../../lib/supabase');
      const leadId = generateUuid();
      const newLeadData: any = {
        id: leadId,
        name: name || 'Novo Lead',
        phone: cleanPhone,
        funnel_id: activeFunnel.id,
        venue_id: venueId,
        master_id: masterId,
        stage: 'entrada',
        notes: `Criado a partir de contato compartilhado no chat do lead ${selectedLead?.name || ''}.`,
      };
      await supabase.from('leads').insert([newLeadData]);
      toast.success(`Lead "${name}" criado com sucesso no funil!`);
    } catch (err: any) {
      toast.error('Erro ao criar lead: ' + (err.message || 'Falha no banco'));
    }
  };

  const handleSaveContactFromCard = async (name: string, phone: string) => {
    const masterId = currentUser?.masterId || currentUser?.id || '';
    if (!masterId) return;
    const cleanPhone = phone.replace(/\D/g, '');
    try {
      const { supabase } = await import('../../lib/supabase');
      const { data: existing } = await supabase
        .from('contacts')
        .select('id')
        .eq('master_id', masterId)
        .or(`primary_phone.ilike.%${cleanPhone.slice(-8)}%,secondary_phone.ilike.%${cleanPhone.slice(-8)}%`)
        .maybeSingle();

      if (existing) {
        toast.info('Este contato já está cadastrado na sua Central de Contatos.');
        return;
      }

      await supabase.from('contacts').insert([{
        master_id: masterId,
        full_name: name,
        primary_phone: cleanPhone,
        notes: `Salvo via WhatsApp a partir de contato recebido.`,
      }]);
      toast.success(`Contato "${name}" salvo na Central de Contatos!`);
    } catch (err: any) {
      toast.error('Erro ao salvar contato: ' + (err.message || 'Falha no banco'));
    }
  };

  // Envio de Figurinha / Sticker no WhatsApp
  const handleSendSticker = async (stickerUrl: string) => {
    if (!ensureSenderReady()) return;
    if (!selectedLead || isLeadSpectator || !stickerUrl) return;
    setIsEmojiPickerOpen(false);

    const author = currentUser?.name || 'Equipe Comercial';
    const activityId = generateUuid();
    const existingActs = selectedLead.activities || [];
    const lastActTime = existingActs.reduce((max, a) => Math.max(max, new Date(a.timestamp || 0).getTime()), 0);
    const finalTimestampIso = new Date(Math.max(Date.now(), lastActTime + 1000)).toISOString();

    const newActivity: LeadActivity = {
      id: activityId,
      leadId: selectedLead.id,
      timestamp: finalTimestampIso,
      type: 'contact',
      title: 'Figurinha enviada via WhatsApp',
      text: '✨ Figurinha',
      mediaUrl: stickerUrl,
      mediaType: 'image',
      authorName: currentUser?.name || author,
      authorId: currentUser?.id,
      authorAvatarUrl: currentUser?.avatarUrl,
      status: 'sent',
      metadata: {
        ...getAppSenderMetadata(),
        isOptimistic: true,
      },
    } as any;

    const updatedActivities = mergeAndSortActivities(selectedLead.activities || [], [newActivity], selectedLead.id);
    updateLeadData(selectedLead.id, {
      activities: updatedActivities,
      updatedAt: new Date().toISOString().split('T')[0],
    });

    if (isSupabaseConfigured) {
      leadService.addActivity(selectedLead.id, newActivity)
        .catch(err => console.error('Erro ao salvar figurinha no Supabase:', err));
    }

    const targetPhone = selectedRecipientPhone || selectedLead.phone;
    if (targetPhone && activeSenderToken) {
      try {
        await uazapiService.sendSticker(activeSenderToken, {
          number: targetPhone,
          file: stickerUrl,
        });
      } catch (err) {
        console.error('Falha no envio de figurinha UAZAPI:', err);
      }
    }
  };

  const handleUploadCustomSticker = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      if (base64) {
        setCustomStickers(prev => {
          const updated = [base64, ...prev.filter(s => s !== base64)].slice(0, 30);
          try {
            localStorage.setItem('f5_custom_stickers', JSON.stringify(updated));
          } catch { }
          return updated;
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Real Audio Recording Handlers (MediaRecorder)
  const startAudioRecording = async () => {
    if (isMessagingPaused()) { toast.error(MESSAGING_PAUSED_TEXT); return; } // pausa geral de mensagens
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.warning('Seu navegador não possui suporte para gravação de áudio ou a página não está em HTTPS.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/ogg; codecs=opus')
        ? 'audio/ogg; codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm; codecs=opus')
          ? 'audio/webm; codecs=opus'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : '';

      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(200);

      setIsRecording(true);
      setIsAudioPaused(false);
      setRecordingSeconds(0);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);

      const targetPhone = selectedRecipientPhone || selectedLead?.phone;
      if (targetPhone && activeSenderToken) {
        uazapiService.sendPresence(activeSenderToken, {
          number: targetPhone,
          presence: 'recording',
          delay: 60,
        }).catch(() => { });
      }
    } catch (err: any) {
      console.warn('Erro ao acessar microfone:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.warning('Permissão de microfone negada. Por favor, habilite o acesso ao microfone nas configurações do seu navegador para gravar áudios.');
      } else {
        toast.warning('Não foi possível iniciar a gravação de áudio: ' + (err.message || 'Verifique o microfone'));
      }
      setIsRecording(false);
    }
  };

  const pauseAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsAudioPaused(true);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const resumeAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsAudioPaused(false);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    }
  };

  const cancelRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop();
      } catch { }
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
    }
    setIsRecording(false);
    setIsAudioPaused(false);
    setRecordingSeconds(0);
    audioChunksRef.current = [];

    const targetPhone = selectedRecipientPhone || selectedLead?.phone;
    if (targetPhone && activeSenderToken) {
      uazapiService.sendPresence(activeSenderToken, {
        number: targetPhone,
        presence: 'paused',
      }).catch(() => { });
    }
  };

  const stopAndSendAudio = () => {
    if (!ensureSenderReady()) return;
    if (!selectedLead) return;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    const durationStr = `${Math.floor(recordingSeconds / 60)}:${(recordingSeconds % 60).toString().padStart(2, '0')}`;
    const author = currentUser?.name || 'Equipe Comercial';

    const finalizeAndSend = (base64Audio?: string, audioBlob?: Blob) => {
      const activityId = generateUuid();
      const existingActs = selectedLead.activities || [];
      const lastActTime = existingActs.reduce((max, a) => Math.max(max, new Date(a.timestamp || 0).getTime()), 0);
      const finalTimestampIso = new Date(Math.max(Date.now(), lastActTime + 1000)).toISOString();

      const newActivity: LeadActivity = {
        id: activityId,
        leadId: selectedLead.id,
        timestamp: finalTimestampIso,
        type: 'contact',
        title: `Mensagem de voz enviada (${durationStr})`,
        text: `🎵 Mensagem de voz (${durationStr})`,
        mediaUrl: base64Audio,
        mediaType: 'audio',
        authorName: currentUser?.name || author,
        authorId: currentUser?.id,
        authorAvatarUrl: currentUser?.avatarUrl,
        metadata: {
        ...getAppSenderMetadata(),
        isOptimistic: true,
      },
      } as any;

      const updatedActivities = mergeAndSortActivities(selectedLead.activities || [], [newActivity], selectedLead.id);
      updateLeadData(selectedLead.id, {
        activities: updatedActivities,
        updatedAt: new Date().toISOString().split('T')[0],
      });

      if (isSupabaseConfigured) {
        leadService.addActivity(selectedLead.id, newActivity)
          .catch(err => console.error('Erro ao salvar áudio no Supabase:', err));
      }

      const targetPhone = selectedRecipientPhone || selectedLead.phone;
      if (targetPhone && activeSenderToken && base64Audio) {
        uazapiService.sendMedia(activeSenderToken, {
          number: targetPhone,
          file: base64Audio,
          type: 'myaudio',
          ptt: true,
          fileName: `voice_${Date.now()}.ogg`,
          delay: 0,
        }).catch(err => {
          console.error('Erro ao disparar áudio UAZAPI (myaudio):', err);
          uazapiService.sendMedia(activeSenderToken, {
            number: targetPhone,
            file: base64Audio,
            type: 'audio',
            ptt: true,
            fileName: `voice_${Date.now()}.ogg`,
            delay: 0,
          }).catch(err2 => console.error('Fallback áudio UAZAPI (audio):', err2));
        });
      }

      // Background Cloudflare R2 Upload para persistência permanente (sem travar envio)
      if (audioBlob) {
        whatsappMediaService.uploadOutboundMedia(audioBlob, activeSenderToken || 'default')
          .then(({ publicUrl }) => {
            if (publicUrl) {
              updateLeadActivity(selectedLead.id, activityId, { mediaUrl: publicUrl });
            }
          })
          .catch(err => console.warn('Erro ao enviar áudio para R2:', err));
      }
    };

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/ogg; codecs=opus';
        const isOgg = mimeType.includes('ogg');
        const ext = isOgg ? 'ogg' : 'webm';
        const audioFile = new File(audioChunksRef.current, `voice_${Date.now()}.${ext}`, { type: isOgg ? 'audio/ogg' : 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          finalizeAndSend(reader.result as string, audioFile);
        };
        reader.readAsDataURL(audioFile);
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(t => t.stop());
        }
      };
      try {
        mediaRecorderRef.current.stop();
      } catch {
        finalizeAndSend();
      }
    } else {
      finalizeAndSend();
    }

    setIsRecording(false);
    setIsAudioPaused(false);
    setRecordingSeconds(0);
  };

  const resetFilters = () => {
    setFilterVenueId('all');
    setFilterStage('all');
    setFilterCollaboratorId('all');
    setFilterTemperature('all');
  };

  // Atividades do Lead com cache instantâneo de LocalStorage e consolidação de conversas da família/contrato
  const effectiveLeadActivities = useMemo(() => {
    const actMap = new Map<string, LeadActivity>();

    // 1. Atividades do lead selecionado
    const memActs = selectedLead?.activities || [];
    memActs.forEach(a => { if (a && a.id) actMap.set(a.id, a); });

    // 2. Cache local do lead selecionado
    if (selectedLeadId) {
      const cached = leadService.getActivitiesFromCache(selectedLeadId);
      cached.forEach(a => { if (a && a.id && !actMap.has(a.id)) actMap.set(a.id, a); });
    }

    // 3. Se houver contrato vinculado (ex: Carla associada ao contrato do Antônio), mescla atividades do contrato
    // Blindagem de Funil: Só mescla se pertencer rigorosamente ao MESMO funil!
    if (targetContractClient && targetContractClient.id !== selectedLead?.id) {
      const tcFunnel = targetContractClient.funnelId;
      const slFunnel = selectedLead?.funnelId;
      const isSameFunnel = !tcFunnel || !slFunnel || tcFunnel === slFunnel;
      if (isSameFunnel) {
        const tcActs = (targetContractClient as any).activities || [];
        tcActs.forEach((a: LeadActivity) => { if (a && a.id && !actMap.has(a.id)) actMap.set(a.id, a); });
        const cachedTc = leadService.getActivitiesFromCache(targetContractClient.id);
        cachedTc.forEach(a => { if (a && a.id && !actMap.has(a.id)) actMap.set(a.id, a); });
      }
    }

    // 4. Varre sourceLeads e leads gerais para encontrar leads individuais de familiares (ex: lead da Carla quando estamos no contrato do Antônio)
    // REGRA SUPREMA DO F5 SYSTEM:
    // Mesmo WhatsApp em funis diferentes NUNCA se misturam nem centralizam (origem do funil respeitada 100%).
    // Exclui o telefone do titular para não buscar o mesmo cliente em outros funis/cards.
    const selectedLeadPhone = (selectedLead?.phone || '').replace(/\D/g, '');
    const familyPhones = (availableRecipients || [])
      .map(r => (r.phone || '').replace(/\D/g, ''))
      .filter(p => p.length >= 8 && (!selectedLeadPhone || p.slice(-8) !== selectedLeadPhone.slice(-8)));

    if (familyPhones.length > 0 && targetContractClient) {
      const candidates = (sourceLeads || []).concat(leads || []);
      const scannedIds = new Set<string>();
      candidates.forEach(sl => {
        if (!sl || sl.id === selectedLead?.id || scannedIds.has(sl.id)) return;
        // Blindagem de Funil: Se pertencer a outro funil, isolamento absoluto!
        if (sl.funnelId && selectedLead?.funnelId && sl.funnelId !== selectedLead.funnelId) return;

        // Só mescla se estiver vinculado ao mesmo contrato oficial
        const slContractId = (sl as any).contractId || (sl as any).contract_id;
        const targetContractId = targetContractClient.id || (targetContractClient as any).contractId;
        if (slContractId && targetContractId && slContractId !== targetContractId) return;

        scannedIds.add(sl.id);
        const slP = (sl.phone || '').replace(/\D/g, '');
        if (slP && familyPhones.some(fp => fp.slice(-8) === slP.slice(-8))) {
          const enrich = (act: LeadActivity): LeadActivity => ({
            ...act,
            recipientPhone: (act as any).recipientPhone || (act as any).metadata?.recipientPhone || (act as any).metadata?.fromPhone || sl.phone,
            metadata: {
              ...((act as any).metadata || {}),
              fromPhone: (act as any).metadata?.fromPhone || sl.phone,
              recipientPhone: (act as any).metadata?.recipientPhone || sl.phone,
            }
          } as any);
          (sl.activities || []).forEach(a => { if (a && a.id && !actMap.has(a.id)) actMap.set(a.id, enrich(a)); });
          const cachedSl = leadService.getActivitiesFromCache(sl.id);
          cachedSl.forEach(a => { if (a && a.id && !actMap.has(a.id)) actMap.set(a.id, enrich(a)); });
        }
      });
    }

    const all = Array.from(actMap.values());

    // Se o lead possui uma última mensagem gravada mas nenhuma atividade de chat foi carregada ainda,
    // projeta a mensagem na linha do tempo para a caixa de diálogo não ficar em branco enquanto busca do banco
    if (selectedLead && selectedLead.lastMessageText && !all.some(a => a.type === 'contact' || (a as any).type === 'whatsapp')) {
      all.push({
        id: `preview_act_${selectedLead.id}`,
        leadId: selectedLead.id,
        type: 'contact',
        title: selectedLead.lastMessageDirection === 'outgoing' ? 'Mensagem enviada' : 'Mensagem recebida',
        text: selectedLead.lastMessageText,
        authorName: selectedLead.lastMessageDirection === 'outgoing' ? 'Equipe' : (selectedLead.name || 'Cliente'),
        authorAvatarUrl: selectedLead.lastMessageDirection === 'outgoing' ? 'whatsapp_brand' : '',
        timestamp: selectedLead.lastMessageAt || selectedLead.updatedAt || new Date().toISOString(),
        status: selectedLead.lastMessageDirection === 'outgoing' ? 'sent' : 'delivered',
      } as LeadActivity);
    }

    all.sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());
    return all;
  }, [selectedLead?.activities, selectedLead?.lastMessageText, selectedLead?.lastMessageAt, selectedLead?.lastMessageDirection, selectedLeadId, targetContractClient, availableRecipients, sourceLeads, leads]);

  /**
   * Identifica se a conversa ativa (específica do destinatário em aberto) já está com atendimento encerrado
   * (Lembrando da regra: auditorias de visualização NÃO contam como reabertura da conversa)
   */
  const isConversationClosed = useMemo(() => {
    const baseActs = (effectiveLeadActivities && effectiveLeadActivities.length > 0) ? effectiveLeadActivities : (selectedLead?.activities || []);
    if (baseActs.length === 0) return false;
    const currentChatPhone = (activeRecipient?.phone || selectedRecipientPhone || selectedLead?.phone || '').replace(/\D/g, '').slice(-8);

    const chatActivities = baseActs.filter(a => {
      const isViewAudit = (a as any).metadata?.isViewAudit === true || a.title === 'Mensagem Visualizada' || (a.text && a.text.includes('visualizou esta mensagem'));
      if (isViewAudit) return false;
      const isChat = a.type === 'contact' || (a as any).type === 'whatsapp';
      if (!isChat) return false;

      // Se temos telefone ativo na conversa, verifica se a atividade pertence ao destinatário ativo
      if (currentChatPhone) {
        const actPhone = (
          (a as any).recipientPhone ||
          (a as any).metadata?.recipientPhone ||
          (a as any).metadata?.fromPhone ||
          (a as any).metadata?.phone ||
          (a as any).phone ||
          ''
        ).replace(/\D/g, '').slice(-8);
        if (actPhone && actPhone !== currentChatPhone) return false;
      }
      return true;
    });

    if (chatActivities.length === 0) return false;

    const sortedActs = [...chatActivities].sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      if (timeA !== timeB) return timeA - timeB;
      const isEndA = Boolean((a as any).metadata?.isSessionEnd || (a.title || '').toLowerCase().includes('conversa encerrada'));
      const isEndB = Boolean((b as any).metadata?.isSessionEnd || (b.title || '').toLowerCase().includes('conversa encerrada'));
      if (isEndA && !isEndB) return 1;
      if (!isEndA && isEndB) return -1;
      return 0;
    });

    const lastAct = sortedActs[sortedActs.length - 1];
    const isSessionEnd = Boolean(
      (lastAct as any).metadata?.isSessionEnd === true ||
      (lastAct.title || '').toLowerCase().includes('conversa encerrada') ||
      (lastAct.text || '').toLowerCase().includes('atendimento encerrado') ||
      (lastAct.title || '').toLowerCase().includes('atendimento finalizado')
    );
    return isSessionEnd;
  }, [effectiveLeadActivities, selectedLead?.activities, activeRecipient?.phone, selectedRecipientPhone, selectedLead?.phone]);

  // Timeline Activities (Chat do WhatsApp - Exclusivamente mensagens de conversação e anotações internas)
  const timelineActivities = useMemo(() => {
    if (!effectiveLeadActivities) return [];

    // Filtra estritamente apenas mensagens reais trocadas com o lead e marcadores transitórios de caixa de mensagem (visualização e encerramento de sessão)
    const chatOnly = effectiveLeadActivities.filter(a => {
      // 1. Rejeita tipos de eventos internos de CRM
      if (
        a.type === 'status_change' ||
        a.type === 'creation' ||
        a.type === 'assignment' ||
        a.type === 'validation' ||
        a.type === 'deal_closed' ||
        a.type === 'task_created' ||
        a.type === 'task_completed'
      ) {
        return false;
      }

      // 2. Proteção textual defensiva: bloqueia logs de auditoria e propriedades de CRM mesmo se gravados como contact ou note
      const rawLower = `${a.title || ''} ${a.text || ''}`.toLowerCase();
      if (
        rawLower.includes('realocado de') ||
        rawLower.includes('status movido de') ||
        rawLower.includes('lead cadastrado via') ||
        rawLower.includes('lead migrado do funil') ||
        rawLower.includes('realocação de funil') ||
        rawLower.includes('etapa alterada') ||
        rawLower.includes('valor de venda') ||
        rawLower.includes('valor de entrada') ||
        rawLower.includes('data do evento alterada') ||
        rawLower.includes('urgência alterada') ||
        rawLower.includes('follow-up concluído') ||
        rawLower.includes('tarefa agendada')
      ) {
        return false;
      }

      // Marcadores específicos de caixa de mensagem (visualização ou encerramento de sessão)
      const isViewAudit = (a as any).metadata?.isViewAudit === true || a.title === 'Mensagem Visualizada' || (a.text && a.text.includes('visualizou esta mensagem'));
      const isSessionEnd = (a as any).metadata?.isSessionEnd === true || rawLower.includes('conversa encerrada') || rawLower.includes('atendimento finalizado');

      if (isViewAudit || isSessionEnd) {
        return true;
      }

      // Apenas mensagens reais de WhatsApp (não notas internas de CRM)
      return (
        a.type === 'contact' ||
        (a as any).type === 'whatsapp'
      );
    });

    // Chats separados por contato (um lugar so, varias conversas): cada mensagem pertence ao numero com quem foi trocada.
    // So divide quando a ficha tem 2+ numeros diferentes. Mensagem de numero desconhecido/antigo fica no chat do contato principal.
    const phoneDigits = (v: unknown) => String(v || '').replace(/\D/g, '');
    const isInstancePhone = (p: string) => {
      const clean = phoneDigits(p);
      if (clean.length < 8) return false;
      return (sources || []).some(s => {
        const sp = phoneDigits((s.configuration as any)?.connectedPhone || (s.configuration as any)?.whatsappNumber || '');
        return sp.length >= 8 && isPhoneMatch(sp, clean);
      });
    };
    const knownRecipients = (availableRecipients || []).filter(r => !r.noPhone && phoneDigits(r.phone).length >= 8);
    const distinctRecipientPhones: string[] = [];
    knownRecipients.forEach(r => { if (!distinctRecipientPhones.some(p => isPhoneMatch(p, r.phone))) distinctRecipientPhones.push(r.phone); });
    const splitByContact = distinctRecipientPhones.length > 1;
    const selectedChatPhone = activeRecipient?.phone || '';
    const primaryChatPhone = (knownRecipients.find(r => r.isMain) || knownRecipients[0])?.phone || '';
    const activityContactPhone = (a: any): string => {
      const candidates = [
        a.recipientPhone,
        a.metadata?.recipientPhone,
        a.metadata?.contactPhone,
        a.metadata?.fromPhone,
        a.metadata?.remoteJid,
        a.metadata?.phone,
        a.metadata?.senderPhone,
        a.metadata?.to,
        a.metadata?.from,
      ];
      for (const c of candidates) {
        const d = phoneDigits(c);
        if (d.length >= 8 && !isInstancePhone(d)) return d;
      }
      return '';
    };

    // Conversa por NÚMERO (Multi-Chip / Instâncias do Funil):
    // Cada mensagem pertence estritamente à instância com a qual foi trocada.
    // Ao alternar para outra instância (ex: ERL 9915), o chat inicia limpo como um novo WhatsApp Web daquele número.
    const resolveMsgChip = (a: any): string => {
      // 1. Identificador direto gravado na atividade ou nos metadados
      const direct = a.instanceId || a.metadata?.senderSourceId || a.metadata?.sourceId || a.metadata?.instanceId;
      if (direct) return String(direct);

      // 2. Prefixo de telefone no messageId (padrão UAZAPI: '5521996803826:3EB0...' ou 'ownerPhone:...')
      const rawMsgId = String(a.metadata?.messageId || a.messageId || a.metadata?.waId || a.metadata?.wamid || '');
      if (rawMsgId.includes(':')) {
        const ownerDigits = rawMsgId.split(':')[0].replace(/\D/g, '');
        if (ownerDigits.length >= 8) {
          const match = (sources || []).find(s => {
            const p = String((s.configuration as any)?.connectedPhone || (s.configuration as any)?.whatsappNumber || '').replace(/\D/g, '');
            return p && (p.includes(ownerDigits) || ownerDigits.includes(p));
          });
          if (match) return match.id;
        }
      }

      // 3. Telefone explícito do remetente/instância gravado nos metadados
      const sPhone = String(a.metadata?.senderPhone || a.metadata?.instancePhone || a.metadata?.connectedPhone || '').replace(/\D/g, '');
      if (sPhone.length >= 8) {
        const match = (sources || []).find(s => {
          const p = String((s.configuration as any)?.connectedPhone || (s.configuration as any)?.whatsappNumber || '').replace(/\D/g, '');
          return p && (p.includes(sPhone) || sPhone.includes(p));
        });
        if (match) return match.id;
      }

      // 4. Se a mensagem foi enviada para um número específico (inbound) gravado no destination/to/remoteJid
      const toPhone = String(a.metadata?.to || a.metadata?.toPhone || a.metadata?.destinationJid || '').replace(/\D/g, '');
      if (toPhone.length >= 8) {
        const match = (sources || []).find(s => {
          const p = String((s.configuration as any)?.connectedPhone || (s.configuration as any)?.whatsappNumber || '').replace(/\D/g, '');
          return p && (p.includes(toPhone) || toPhone.includes(p));
        });
        if (match) return match.id;
      }

      // 5. Nome da fonte ou remetente gravado nos metadados (ex: "POS VENDA GLORIA")
      const sName = String(a.metadata?.senderSourceName || '').trim().toLowerCase();
      if (sName) {
        const match = (sources || []).find(s => {
          const sn = (s.name || '').toLowerCase();
          return sn === sName || sn.includes(sName) || sName.includes(sn);
        });
        if (match) return match.id;
      }

      // 6. UUID da instância presente no link de áudio ou mídia no Cloudflare R2
      const textStr = String(a.text || (a as any).description || '');
      if (textStr.includes('/whatsapp/')) {
        const match = (sources || []).find(s => s.id && textStr.includes(`/whatsapp/${s.id}/`));
        if (match) return match.id;
      }

      return '';
    };

    const hasMultipleSenders = (venueSenderSources || []).length > 1 || (sources || []).filter(s => s.type === 'whatsapp_api').length > 1;
    const selectedChipId = forcedSource ? forcedSource.id : (hasMultipleSenders ? (activeSenderSource?.id || '') : '');

    // Filtra pelo canal setorial selecionado (Comercial) ou bilateralidade multi-decisor (Pós-Venda)
    const filteredByChannel = chatOnly.filter(a => {
      const isSessionMarker = Boolean((a as any).metadata?.isSessionEnd || (a as any).metadata?.isViewAudit || (a.title || '').toLowerCase().includes('conversa encerrada'));
      if (isSessionMarker) return true;

      // Isolamento total entre instâncias (Multi-Chip)
      if (selectedChipId) {
        const chip = resolveMsgChip(a);
        if (chip) {
          // Se a mensagem pertence comprovadamente a outro chip, oculta deste chat
          if (chip !== selectedChipId) return false;
        } else {
          // Mensagem sem chip explícito (ex: mensagens legadas anteriores ao isolamento multi-chip):
          // Pertencem estritamente ao chip padrão onde a conversa foi originada
          const defaultLeadChipId = selectedLead?.sourceId || (targetContractClient as any)?.sourceId || (selectedLead?.activities ? lastSystemSentSourceId(selectedLead.activities) : '') || '';
          if (defaultLeadChipId) {
            if (selectedChipId !== defaultLeadChipId) {
              return false;
            }
          } else {
            // Se o lead/contrato não tem chip de origem gravado, associa ao chip principal do canal/funil
            const funnelPrimaryChip = venueSenderSources.find(s => s.id === (activeChannelsFunnel?.postSaleChannels?.[0]?.instanceId)) || venueSenderSources[0];
            if (funnelPrimaryChip && selectedChipId !== funnelPrimaryChip.id) {
              return false;
            }
          }
        }
      }

      if (splitByContact && selectedChatPhone) {
        const ap = activityContactPhone(a);
        const ownerPhone = ap.length >= 8 ? distinctRecipientPhones.find(p => isPhoneMatch(p, ap)) : undefined;
        if (ownerPhone) {
          if (!isPhoneMatch(ownerPhone, selectedChatPhone)) return false;
        } else {
          // Se não encontrou pelo ap, verifica metadata ou leadId original
          const rawP = ((a as any).recipientPhone || (a as any).metadata?.recipientPhone || (a as any).metadata?.fromPhone || (a as any).metadata?.phone || '').replace(/\D/g, '');
          if (rawP.length >= 8 && isPhoneMatch(rawP, selectedChatPhone)) {
            // Pertence ao contato selecionado!
          } else if (!isPhoneMatch(primaryChatPhone, selectedChatPhone)) {
            return false;
          }
        }
      }

      // No Pós-Venda: abas nominais multi-decisor com histórico bilateral (sem aba Geral)
      if (isPostSaleChat) {
        if (selectedRecipientPhone) {
          const cleanRec = selectedRecipientPhone.replace(/\D/g, '');
          const rawActPhone = (
            (a as any).recipientPhone ||
            (a as any).metadata?.recipientPhone ||
            (a as any).metadata?.contactPhone ||
            (a as any).metadata?.fromPhone ||
            (a as any).metadata?.remoteJid ||
            (a as any).metadata?.phone ||
            (a as any).metadata?.to ||
            (a as any).metadata?.from ||
            ''
          ).replace(/\D/g, '');

          // Se for telefone de uma de nossas instâncias, não é o telefone de um contato divergente
          const actPhone = isInstancePhone(rawActPhone) ? '' : rawActPhone;

          if (actPhone && cleanRec && actPhone.length >= 8 && cleanRec.length >= 8 && !isPhoneMatch(actPhone, cleanRec)) {
            return false;
          }
        }
        return true;
      }

      // Se a aba Geral estiver oculta/desativada e estamos no Geral: área 100% limpa (sem mensagens)
      if (isGeneralHidden && activePostSaleChannelId === 'geral') {
        return false;
      }

      const actChannelId = (a as any).channelId || (a as any).metadata?.channelId;
      
      // Se estiver em um setor/canal específico (ex: Teste, Recepção, etc.):
      // Exibe rigorosamente apenas as mensagens enviadas neste setor!
      if (activePostSaleChannelId && activePostSaleChannelId !== 'geral') {
        return actChannelId === activePostSaleChannelId;
      }

      // Se estiver na aba Geral: exibe apenas mensagens gerais (sem setor específico ou marcadas como geral)
      if (activePostSaleChannelId === 'geral') {
        return !actChannelId || actChannelId === 'geral';
      }

      return true;
    });

    // Deduplicação inteligente de mensagens repetidas (por id e por conteúdo idêntico no mesmo minuto)
    // Deduplicação estrita de mensagens (por ID da atividade e por messageId do WhatsApp)
    // NUNCA descarta mensagens sequenciais com o mesmo texto se possuírem IDs distintos!
    const seenIds = new Set<string>();
    const seenMsgIds = new Set<string>();
    const deduped: LeadActivity[] = [];

    const sorted = [...filteredByChannel].sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      if (timeA !== timeB) return timeA - timeB;

      // Desempate cirúrgico para mesmo timestamp:
      // Marcadores de encerramento de sessão SEMPRE devem ficar após as mensagens de conversa
      const isSessionEndA = Boolean((a as any).metadata?.isSessionEnd || (a.title || '').toLowerCase().includes('conversa encerrada'));
      const isSessionEndB = Boolean((b as any).metadata?.isSessionEnd || (b.title || '').toLowerCase().includes('conversa encerrada'));
      if (isSessionEndA && !isSessionEndB) return 1;
      if (!isSessionEndA && isSessionEndB) return -1;

      return 0;
    });

    for (const act of sorted) {
      if (act.id && seenIds.has(act.id)) continue;
      if (act.id) seenIds.add(act.id);

      // REGRA MESTRA: O messageId é o REI absoluto!
      // Se a mensagem possui messageId, deduplica estritamente por ele (normalizado sem prefixo)
      const rawMsgId = act.messageId || (act.metadata as any)?.messageId || (act.metadata as any)?.waId;
      const actMsgId = normalizeMessageId(rawMsgId);
      if (actMsgId) {
        if (seenMsgIds.has(actMsgId)) continue;
        seenMsgIds.add(actMsgId);

        // Se uma mensagem otimista anterior com o mesmo texto já estiver na timeline nos últimos 8 segundos, substitui
        const prevOptIdx = deduped.findIndex(p => {
          const pMsgId = normalizeMessageId(p.messageId || (p.metadata as any)?.messageId);
          if (pMsgId) return false;
          const pText = (p.text || p.title || '').trim().toLowerCase();
          const cText = (act.text || act.title || '').trim().toLowerCase();
          if (pText && pText === cText) {
            const pTime = new Date(p.timestamp || 0).getTime();
            const cTime = new Date(act.timestamp || 0).getTime();
            return Math.abs(cTime - pTime) < 8000;
          }
          return false;
        });
        if (prevOptIdx !== -1) {
          deduped[prevOptIdx] = act;
          continue;
        }
      } else {
        // Se a mensagem veio SEM messageId:
        // Compara com a última mensagem adicionada na timeline para evitar duplicação imediata de renderização
        const prevAct = deduped[deduped.length - 1];
        if (prevAct) {
          const prevText = (prevAct.text || prevAct.title || '').trim().toLowerCase();
          const currText = (act.text || act.title || '').trim().toLowerCase();
          if (prevText && prevText === currText) {
            const prevTime = new Date(prevAct.timestamp || 0).getTime();
            const currTime = new Date(act.timestamp || 0).getTime();
            const diffSec = Math.abs(currTime - prevTime) / 1000;
            // Se tem o mesmo texto exato e ocorreu em até 8 segundos sem messageId: é duplicata de renderização/webhook
            if (diffSec <= 8) {
              continue;
            }
          }
        }
      }

      deduped.push(act);
    }

    return deduped;
  }, [effectiveLeadActivities, isPostSaleChat, activePostSaleChannelId, availableRecipients, activeRecipient, activeSenderSource?.id, venueSenderSources, sources, selectedLead?.sourceId, forcedSource]);

  // Auto-scroll robusto: garante que ao abrir qualquer conversa ou ao carregar mensagens, ela SEMPRE abre no final!
  useEffect(() => {
    if (!selectedLeadId || (composerTab !== 'whatsapp' && composerTab !== 'notes')) {
      return;
    }

    const isDifferentLead = lastScrolledLeadIdRef.current !== selectedLeadId;
    const isDifferentTab = lastScrolledTabRef.current !== composerTab;
    const isDifferentChip = lastScrolledChipRef.current !== activeSenderSource?.id;
    const isDifferentRec = lastScrolledRecipientRef.current !== (selectedRecipientPhone || activeRecipient?.phone);

    if (isDifferentLead || isDifferentTab || isDifferentChip || isDifferentRec) {
      lastScrolledLeadIdRef.current = selectedLeadId;
      lastScrolledTabRef.current = composerTab;
      lastScrolledChipRef.current = activeSenderSource?.id || null;
      lastScrolledRecipientRef.current = (selectedRecipientPhone || activeRecipient?.phone) || null;
      isUserScrolledUpRef.current = false;
      isManualUserScrollRef.current = false;
      
      scrollToBottom('auto');
      const t1 = setTimeout(() => scrollToBottom('auto'), 50);
      const t2 = setTimeout(() => scrollToBottom('auto'), 150);
      const t3 = setTimeout(() => scrollToBottom('auto'), 350);
      const t4 = setTimeout(() => scrollToBottom('auto'), 700);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
      };
    }

    // Se o usuário NÃO subiu intencionalmente, mantém SEMPRE no final conforme as mensagens são renderizadas
    if (!isUserScrolledUpRef.current && !isFetchingOlderRef.current) {
      scrollToBottom('auto');
      const t = setTimeout(() => scrollToBottom('auto'), 100);
      return () => clearTimeout(t);
    }
  }, [selectedLeadId, composerTab, activeSenderSource?.id, selectedRecipientPhone, activeRecipient?.phone, timelineActivities.length, scrollToBottom]);

  // Numeros (WhatsApp) que ja falaram neste lead: 2+ => aparece o seletor "WhatsApp A / B" acima da conversa
  const chatChipSources = useMemo(() => {
    const ids = new Set<string>();
    for (const a of (effectiveLeadActivities || []) as any[]) {
      const id = a.instanceId || a.metadata?.senderSourceId || a.metadata?.sourceId || a.metadata?.instanceId;
      if (id) ids.add(id);
    }
    if (ids.size < 2) return [];
    return (sources || []).filter(src => ids.has(src.id));
  }, [effectiveLeadActivities, sources]);

  // Nao lidas por numero: mensagens recebidas pelo OUTRO numero depois da ultima vez que a conversa dele foi vista.
  // A troca de numero e feita so no seletor de baixo; aqui so alertamos (ponto/contador no seletor).
  const [chipSeenTick, setChipSeenTick] = useState(0);
  const chipSeenKey = (leadId: string, chipId: string) => `${leadId}|${chipId}`;
  const readChipSeen = (): Record<string, number> => { try { return JSON.parse(localStorage.getItem('f5_chip_seen_v1') || '{}'); } catch { return {}; } };
  useEffect(() => {
    if (!selectedLead || chatChipSources.length < 2) return;
    const seen = readChipSeen();
    const now = Date.now();
    let changed = false;
    for (const src of chatChipSources) {
      const k = chipSeenKey(selectedLead.id, src.id);
      // numero em foco: sempre visto agora; os outros: marco inicial na primeira abertura
      if (src.id === activeSenderSource?.id || seen[k] === undefined) { seen[k] = now; changed = true; }
    }
    if (changed) { try { localStorage.setItem('f5_chip_seen_v1', JSON.stringify(seen)); } catch { /* sem armazenamento */ } setChipSeenTick(t => t + 1); }
  }, [selectedLead?.id, activeSenderSource?.id, chatChipSources, (effectiveLeadActivities || []).length]); // eslint-disable-line react-hooks/exhaustive-deps

  const unreadByChip = useMemo<Record<string, number>>(() => {
    const out: Record<string, number> = {};
    if (!selectedLead || chatChipSources.length < 2) return out;
    const seen = readChipSeen();
    for (const a of (effectiveLeadActivities || []) as any[]) {
      if (a.authorId !== 'lead') continue;
      const chip = a.instanceId || a.metadata?.senderSourceId || a.metadata?.sourceId || a.metadata?.instanceId;
      if (!chip || chip === activeSenderSource?.id) continue;
      const since = seen[chipSeenKey(selectedLead.id, chip)];
      if (since !== undefined && new Date(a.timestamp || 0).getTime() > since) out[chip] = (out[chip] || 0) + 1;
    }
    return out;
  }, [effectiveLeadActivities, chatChipSources, selectedLead?.id, activeSenderSource?.id, chipSeenTick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Função para carregar lote anterior de mensagens do histórico (rolagem para o passado)
  const loadOlderMessages = useCallback(async () => {
    if (!selectedLeadId || isFetchingOlderRef.current || reachedBeginningMap[selectedLeadId]) {
      return;
    }

    isFetchingOlderRef.current = true;
    setIsLoadingOlder(true);

    const container = timelineContainerRef.current;
    const prevScrollHeight = container ? container.scrollHeight : 0;
    const prevScrollTop = container ? container.scrollTop : 0;

    try {
      // Pega o timestamp da mensagem mais antiga atualmente visível no chat
      const oldestAct = timelineActivities[0];
      const beforeTimestamp = oldestAct?.timestamp || new Date().toISOString();

      const count = await loadOlderLeadActivities(selectedLeadId, beforeTimestamp, 40);

      if (count < 40) {
        setReachedBeginningMap(prev => ({ ...prev, [selectedLeadId]: true }));
      }

      // Restaura com precisão de pixel a posição da rolagem para que a visualização não dê salto
      if (count > 0 && container) {
        requestAnimationFrame(() => {
          if (timelineContainerRef.current) {
            const newScrollHeight = timelineContainerRef.current.scrollHeight;
            timelineContainerRef.current.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
          }
        });
      }
    } catch (err) {
      console.error('Erro ao carregar mensagens anteriores:', err);
    } finally {
      setIsLoadingOlder(false);
      isFetchingOlderRef.current = false;
    }
  }, [selectedLeadId, timelineActivities, reachedBeginningMap, loadOlderLeadActivities]);

  // Mantém a ref sincronizada para acionamento durante a rolagem rápida
  useEffect(() => {
    loadOlderMessagesRef.current = loadOlderMessages;
  }, [loadOlderMessages]);

  // Carrega a janela de mensagens dos últimos 3 dias de conversa (ancorada na data da última mensagem do lead)
  useEffect(() => {
    if (!selectedLeadId || (composerTab !== 'whatsapp' && composerTab !== 'notes')) return;
    loadLeadConversationDays(selectedLeadId, 3);

    // Carrega mensagens do banco para cada número registrado na família deste contrato no mesmo funil
    const familyDigits = new Set<string>();
    if (availableRecipients && availableRecipients.length > 0) {
      availableRecipients.forEach(r => {
        if (r.phone) {
          const d = r.phone.replace(/\D/g, '');
          if (d.length >= 8) familyDigits.add(d.slice(-8));
        }
      });
    }
    if (selectedLead && Array.isArray(selectedLead.contacts)) {
      selectedLead.contacts.forEach((ct: any) => {
        if (ct?.phone) {
          const d = ct.phone.replace(/\D/g, '');
          if (d.length >= 8) familyDigits.add(d.slice(-8));
        }
      });
    }

    if (familyDigits.size > 0) {
      const allCandidates = (leads || []).concat(sourceLeads || []);
      allCandidates.forEach(sl => {
        if (!sl || sl.id === selectedLeadId) return;
        if (sl.funnelId && selectedLead?.funnelId && sl.funnelId !== selectedLead.funnelId) return;
        const slDigits = (sl.phone || '').replace(/\D/g, '').slice(-8);
        if (slDigits.length >= 8 && familyDigits.has(slDigits)) {
          loadLeadConversationDays(sl.id, 3);
        }
      });
    }
  }, [selectedLeadId, composerTab, loadLeadConversationDays, availableRecipients, selectedLead, leads, sourceLeads]);

  // Histórico de Ações e Anotações Internas (Aba Histórico - Sem mensagens de chat do cliente e sem marcadores de caixa de mensagem)
  const historyActivities = useMemo(() => {
    if (!selectedLead?.activities) return [];
    const items = selectedLead.activities.filter(a => {
      // Exclui marcadores transitórios de caixa de mensagem (visualização e encerramento de sessão não são histórico do CRM)
      const isViewAudit = (a as any).metadata?.isViewAudit === true || a.title === 'Mensagem Visualizada' || (a.text && a.text.includes('visualizou esta mensagem'));
      const isSessionEnd = (a as any).metadata?.isSessionEnd === true || (a.title && a.title.toLowerCase().includes('conversa encerrada')) || (a.title && a.title.toLowerCase().includes('atendimento finalizado'));

      if (isViewAudit || isSessionEnd) {
        return false;
      }

      return (
        a.type === 'note' ||
        a.type === 'status_change' ||
        a.type === 'assignment' ||
        a.type === 'creation' ||
        a.type === 'deal_closed' ||
        a.type === 'validation' ||
        a.type === 'task_created' ||
        a.type === 'task_completed'
      );
    });
    const sorted = [...items].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Deduplicação inteligente de ações do histórico
    const deduped: LeadActivity[] = [];
    const seenIds = new Set<string>();
    const seenFingerprints = new Set<string>();

    for (const act of sorted) {
      if (act.id && seenIds.has(act.id)) continue;
      if (act.id) seenIds.add(act.id);

      const minuteBucket = Math.floor(new Date(act.timestamp || 0).getTime() / 60000);
      const textKey = (act.text || act.title || '').trim().toLowerCase();
      const authorKey = (act.authorName || '').trim().toLowerCase();
      const fingerprint = `${act.type}_${minuteBucket}_${authorKey}_${textKey}`;

      if (fingerprint && seenFingerprints.has(fingerprint)) {
        continue;
      }
      seenFingerprints.add(fingerprint);
      deduped.push(act);
    }

    return deduped;
  }, [selectedLead?.activities]);

  const notesCount = useMemo(() => historyActivities.length, [historyActivities]);

  const icpRating = useMemo(() => {
    if (!selectedLead || !hasIcpConfigured(selectedLead)) return null;
    // Sem resposta = Indefinido (nunca zero). Notas: Ruim, Bom, Muito bom, Incrivel.
    const badge = mqlBadge(selectedLead.mqlScore, selectedLead.mqlAnswers);
    if (badge.isUndefined) {
      return {
        score: undefined,
        label: badge.label,
        color: 'var(--adm-text-muted)',
        bg: 'var(--adm-bg-card)',
        border: 'var(--adm-border)',
        isUndefined: true,
      };
    }
    return { score: selectedLead.mqlScore ?? 0, label: badge.label, color: badge.color, bg: badge.bg, border: badge.border, isUndefined: false };
  }, [selectedLead, mqlQuestions]);

  // Filtros de Casa, Atendente e Temperatura. `inline` = abertos na barra de cima; senao empilhados no popover (Kanban embutido).
  const renderFilterSelects = (inline: boolean) => {
    const base: React.CSSProperties = inline
      ? { width: '100%', height: '38px', fontSize: '0.78rem', borderRadius: '10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: '#E2E8F0', padding: '0 10px', outline: 'none', cursor: 'pointer' }
      : { width: '100%', height: '36px', fontSize: '0.78rem', borderRadius: '9px', background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', color: 'var(--adm-text-title)', padding: '0 10px', outline: 'none', cursor: 'pointer' };
    const labelStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.70rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' };
    const field = (key: string, icon: React.ReactNode, label: string, control: React.ReactNode, flex: number) => (
      <div key={key} style={inline ? { flex: `${flex} 1 0`, minWidth: 0 } : undefined}>
        {!inline && <label style={labelStyle}>{icon}<span>{label}</span></label>}
        {control}
      </div>
    );
    return [
      field('venue', <Building2 size={12} />, 'Casa de Festa', (
        <Select value={filterVenueId} onChange={(e) => setFilterVenueId(e.target.value)} style={base} title="Casa de Festa">
          <option value="all">Todas as Casas de Festa</option>
          {venues.map(v => (<option key={v.id} value={v.id}>{v.name}</option>))}
        </Select>
      ), 1.1),
      field('collab', <UserCheck size={12} />, 'Atendente / Responsável', (
        <Select value={filterCollaboratorId} onChange={(e) => setFilterCollaboratorId(e.target.value)} style={base} title="Atendente / Responsável">
          <option value="all">Todos os Atendentes</option>
          {collaborators.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
        </Select>
      ), 1.1),
      field('temp', <Flame size={12} />, 'Temperatura do Lead', (
        <Select value={filterTemperature} onChange={(e) => setFilterTemperature(e.target.value)} style={base} title="Temperatura do Lead">
          <option value="all">Todas as Temperaturas</option>
          <option value="hot">Quente (Alta Probabilidade)</option>
          <option value="warm">Morno (Em Negociação)</option>
          <option value="cold">Frio (Inicial)</option>
        </Select>
      ), 1),
    ];
  };

  return (
    <div style={{
      height: chatOnly ? '100%' : isEmbeddedInFunnel ? 'calc(100vh - 100px)' : '100%',
      display: 'flex',
      flex: 1,
      width: '100%',
      background: 'var(--adm-bg-card)',
      borderRadius: 0,
      border: 'none',
      borderTop: '1px solid var(--adm-border)',
      overflow: 'hidden',
      margin: 0,
      boxShadow: 'none',
      fontFamily: "'Inter', sans-serif",
      position: 'relative',
    }}>

      {/* ── COLUNA 1: TRILHO COMPACTO OU LISTA DE CONVERSAS ─────────────── */}
      {chatOnly ? null : isConversationsCollapsed ? (
        <div 
          onClick={() => setIsConversationsCollapsed(false)}
          title="Expandir Conversas / Contratos"
          style={{
            order: 1,
            width: '44px',
            minWidth: '44px',
            maxWidth: '44px',
            borderRight: '1px solid var(--adm-border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'var(--adm-bg-card)',
            cursor: 'pointer',
            padding: '12px 0',
            transition: 'background 0.15s ease',
            userSelect: 'none',
            zIndex: 10,
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-input)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--adm-bg-card)'}
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: isPostSaleFunnel ? 'rgba(6, 182, 212, 0.15)' : 'rgba(37, 211, 102, 0.15)',
            color: isPostSaleFunnel ? '#06B6D4' : '#25D366',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
          }}>
            <WhatsAppBrandIcon size={18} color={isPostSaleFunnel ? '#06B6D4' : '#25D366'} />
          </div>

          <div style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontSize: '0.70rem',
            fontWeight: 800,
            color: 'var(--adm-text-muted)',
            letterSpacing: '0.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span>Conversas</span>
            <ChevronRight size={13} style={{ transform: 'rotate(90deg)' }} />
          </div>
        </div>
      ) : (
        <div style={{
          order: 1,
          display: 'flex',
          width: '340px',
          minWidth: '300px',
          maxWidth: '360px',
          borderRight: '1px solid var(--adm-border)',
          flexDirection: 'column',
          background: 'var(--adm-bg-card)',
        }}>
        {/* Top Header & Search Bar */}
        <div style={{
          padding: isEmbeddedInFunnel ? '12px 16px' : '16px',
          borderBottom: '1px solid var(--adm-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: isEmbeddedInFunnel ? '0px' : '12px',
          background: 'var(--adm-bg-input)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: isEmbeddedInFunnel ? 'flex' : 'none', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: isPostSaleFunnel ? 'rgba(6, 182, 212, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                color: isPostSaleFunnel ? '#06B6D4' : 'var(--adm-accent, #6366F1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <MessageSquare size={16} color={isPostSaleFunnel ? '#06B6D4' : 'var(--adm-accent, #6366F1)'} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0, whiteSpace: 'nowrap' }}>
                  Caixa de Entrada
                </h2>
                {isEmbeddedInFunnel && (
                  <div style={{
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    color: isPostSaleFunnel ? '#06B6D4' : 'var(--adm-accent)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                    marginTop: '1px',
                  }}>
                    {activeFunnel?.name || (isPostSaleFunnel ? 'Pós-Venda' : 'Comercial')}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isMultiSelectMode ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    fontSize: '0.70rem',
                    fontWeight: 800,
                    color: isPostSaleFunnel ? '#06B6D4' : 'var(--adm-accent, #6366F1)',
                    background: isPostSaleFunnel ? 'rgba(6, 182, 212, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                    padding: '2px 6px',
                    borderRadius: '6px'
                  }}>
                    {selectedLeadIds.length} sel.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMultiSelectMode(false);
                      onToggleMultiSelect?.(false);
                      setSelectedLeadIds([]);
                    }}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#EF4444',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '0.74rem', color: isPostSaleFunnel ? '#06B6D4' : 'var(--adm-text-muted)', fontWeight: 800, whiteSpace: 'nowrap' }}>
                    {filteredLeads.length} {isPostSaleFunnel ? (filteredLeads.length === 1 ? 'cliente' : 'clientes') : (filteredLeads.length === 1 ? 'lead' : 'leads')}
                  </div>
                  {/* Botão de Recolher Conversas */}
                  <button
                    type="button"
                    onClick={() => setIsConversationsCollapsed(true)}
                    title="Recolher Lista de Conversas"
                    style={{
                      background: 'var(--adm-bg-card)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '6px',
                      color: 'var(--adm-text-muted)',
                      padding: '3px 6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--adm-accent)';
                      e.currentTarget.style.borderColor = 'var(--adm-accent)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--adm-text-muted)';
                      e.currentTarget.style.borderColor = 'var(--adm-border)';
                    }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {!isEmbeddedInFunnel && (
            <>
              {/* Funnel Selector Pill / Dropdown for Standalone WhatsApp */}
              <div ref={funnelSelectRef} style={{ position: 'relative', width: '100%' }}>
                <button
                  type="button"
                  onClick={() => setIsFunnelSelectOpen(!isFunnelSelectOpen)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    background: isPostSaleFunnel ? 'rgba(6, 182, 212, 0.12)' : 'var(--adm-bg-card)',
                    border: `1px solid ${isPostSaleFunnel ? 'rgba(6, 182, 212, 0.4)' : 'var(--adm-border)'}`,
                    color: isPostSaleFunnel ? '#06B6D4' : 'var(--adm-text-title)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {isPostSaleFunnel ? (
                        <Users size={14} color="#06B6D4" />
                      ) : selectedFunnelId === 'all' ? (
                        <Target size={14} color="var(--adm-accent)" />
                      ) : (
                        renderFunnelOrStageIcon(
                          activeFunnel?.icon || 'layers',
                          14,
                          (activeFunnel as any)?.color || activeFunnel?.badgeColor || 'var(--adm-accent)'
                        )
                      )}
                    </div>
                    <span>
                      {selectedFunnelId === 'all' || selectedFunnelId === 'all_commercial'
                        ? 'Todos os Funis Comerciais'
                        : selectedFunnelId === 'all_post_sale'
                          ? 'Todos os Funis de Pós-Venda'
                          : (activeFunnel?.name || (isPostSaleFunnel ? 'Pós-Venda' : 'Funil Comercial'))}
                    </span>
                  </div>
                  <ChevronRight size={13} style={{ transform: isFunnelSelectOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease' }} />
                </button>

                {isFunnelSelectOpen && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    background: 'var(--adm-bg-card)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '10px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                    padding: '5px',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    maxHeight: '340px',
                    overflowY: 'auto',
                  }}>
                    {/* ── BLOCO 1: FUNIL COMERCIAL ── */}
                    <div style={{
                      fontSize: '0.58rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      color: 'var(--adm-text-muted)',
                      letterSpacing: '0.6px',
                      padding: '4px 8px 2px',
                    }}>
                      Funil Comercial
                    </div>

                    {/* Todos os Funis Comerciais */}
                    <button
                      type="button"
                      onClick={() => handleSelectFunnel('all')}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: (selectedFunnelId === 'all' || selectedFunnelId === 'all_commercial') ? 'var(--adm-accent-bg)' : 'transparent',
                        border: 'none',
                        color: (selectedFunnelId === 'all' || selectedFunnelId === 'all_commercial') ? 'var(--adm-accent)' : 'var(--adm-text-title)',
                        fontSize: '0.74rem',
                        fontWeight: (selectedFunnelId === 'all' || selectedFunnelId === 'all_commercial') ? 800 : 600,
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedFunnelId !== 'all' && selectedFunnelId !== 'all_commercial') e.currentTarget.style.background = 'var(--adm-bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        if (selectedFunnelId !== 'all' && selectedFunnelId !== 'all_commercial') e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Target size={14} color="var(--adm-accent)" />
                        <span>Todos os Funis Comerciais</span>
                      </div>
                      {(selectedFunnelId === 'all' || selectedFunnelId === 'all_commercial') && <Check size={12} />}
                    </button>

                    {/* Funis Comerciais Individuais */}
                    {commercialFunnels.map(f => {
                      const isSelected = selectedFunnelId === f.id;
                      const funnelColor = (f as any).color || f.badgeColor || f.stages?.[0]?.color || 'var(--adm-accent)';
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => handleSelectFunnel(f.id)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '6px',
                            background: isSelected ? `${funnelColor}18` : 'transparent',
                            border: isSelected ? `1px solid ${funnelColor}40` : '1px solid transparent',
                            color: isSelected ? funnelColor : 'var(--adm-text-title)',
                            fontSize: '0.74rem',
                            fontWeight: isSelected ? 800 : 500,
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.12s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.background = 'var(--adm-bg-hover)';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <div style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '6px',
                              background: `${funnelColor}22`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              {renderFunnelOrStageIcon(f.icon || 'layers', 12, funnelColor)}
                            </div>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {f.name}
                            </span>
                          </div>
                          {isSelected && <Check size={12} color={funnelColor} />}
                        </button>
                      );
                    })}

                    {/* ── LINHA DIVISÓRIA ── */}
                    <div style={{
                      height: '1px',
                      background: 'var(--adm-border)',
                      margin: '5px 2px',
                    }} />

                    {/* ── BLOCO 2: PÓS-VENDA ── */}
                    <div style={{
                      fontSize: '0.58rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      color: '#06B6D4',
                      letterSpacing: '0.6px',
                      padding: '4px 8px 2px',
                    }}>
                      Pós-Venda
                    </div>

                    {/* Todos os Funis de Pós-Venda */}
                    <button
                      type="button"
                      onClick={() => handleSelectFunnel('all_post_sale')}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: selectedFunnelId === 'all_post_sale' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                        border: selectedFunnelId === 'all_post_sale' ? '1px solid rgba(6, 182, 212, 0.35)' : '1px solid transparent',
                        color: selectedFunnelId === 'all_post_sale' ? '#06B6D4' : 'var(--adm-text-title)',
                        fontSize: '0.74rem',
                        fontWeight: selectedFunnelId === 'all_post_sale' ? 800 : 600,
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedFunnelId !== 'all_post_sale') e.currentTarget.style.background = 'var(--adm-bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        if (selectedFunnelId !== 'all_post_sale') e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={14} color="#06B6D4" />
                        <span>Todos os Funis de Pós-Venda</span>
                      </div>
                      {selectedFunnelId === 'all_post_sale' && <Check size={12} color="#06B6D4" />}
                    </button>

                    {/* Funis de Pós-Venda Individuais */}
                    {postSaleFunnels.length > 0 ? (
                      postSaleFunnels.map(f => {
                        const isSelected = selectedFunnelId === f.id;
                        const funnelColor = (f as any).color || f.badgeColor || '#06B6D4';
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => handleSelectFunnel(f.id)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              background: isSelected ? `${funnelColor}18` : 'transparent',
                              border: isSelected ? `1px solid ${funnelColor}40` : '1px solid transparent',
                              color: isSelected ? funnelColor : 'var(--adm-text-title)',
                              fontSize: '0.74rem',
                              fontWeight: isSelected ? 800 : 500,
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              transition: 'all 0.12s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.background = 'var(--adm-bg-hover)';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                              <div style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '6px',
                                background: `${funnelColor}22`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}>
                                {renderFunnelOrStageIcon(f.icon || 'shield-check', 12, funnelColor)}
                              </div>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {f.name}
                              </span>
                            </div>
                            {isSelected && <Check size={12} color={funnelColor} />}
                          </button>
                        );
                      })
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSelectFunnel('post_sale_default')}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          background: selectedFunnelId === 'post_sale_default' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                          border: selectedFunnelId === 'post_sale_default' ? '1px solid rgba(6, 182, 212, 0.35)' : '1px solid transparent',
                          color: selectedFunnelId === 'post_sale_default' ? '#06B6D4' : 'var(--adm-text-title)',
                          fontSize: '0.74rem',
                          fontWeight: selectedFunnelId === 'post_sale_default' ? 800 : 500,
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Users size={12} color="#06B6D4" />
                          <span>Sucesso do Cliente</span>
                        </div>
                        {selectedFunnelId === 'post_sale_default' && <Check size={12} color="#06B6D4" />}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Filter Tabs: Em Aberto | Meus Leads / Meus Clientes | Todos */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'var(--adm-bg-card)',
                padding: '3px',
                borderRadius: '10px',
                border: '1px solid var(--adm-border)',
              }}>
                <button
                  type="button"
                  onClick={() => handleUpdateQuickFilter('open')}
                  style={{
                    flex: 1,
                    padding: '6px 4px',
                    borderRadius: '7px',
                    background: quickFilter === 'open' ? (isPostSaleFunnel ? 'rgba(6, 182, 212, 0.15)' : 'var(--adm-accent-bg)') : 'transparent',
                    border: quickFilter === 'open' ? `1px solid ${isPostSaleFunnel ? '#06B6D4' : 'var(--adm-accent)'}` : '1px solid transparent',
                    color: quickFilter === 'open' ? (isPostSaleFunnel ? '#06B6D4' : 'var(--adm-accent)') : 'var(--adm-text-muted)',
                    fontSize: '0.72rem',
                    fontWeight: quickFilter === 'open' ? 800 : 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Em Aberto
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateQuickFilter('my')}
                  style={{
                    flex: 1,
                    padding: '6px 4px',
                    borderRadius: '7px',
                    background: quickFilter === 'my' ? (isPostSaleFunnel ? 'rgba(6, 182, 212, 0.15)' : 'var(--adm-accent-bg)') : 'transparent',
                    border: quickFilter === 'my' ? `1px solid ${isPostSaleFunnel ? '#06B6D4' : 'var(--adm-accent)'}` : '1px solid transparent',
                    color: quickFilter === 'my' ? (isPostSaleFunnel ? '#06B6D4' : 'var(--adm-accent)') : 'var(--adm-text-muted)',
                    fontSize: '0.72rem',
                    fontWeight: quickFilter === 'my' ? 800 : 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isPostSaleFunnel ? 'Meus Clientes' : 'Meus Leads'}
                </button>
                {canSeeAllConversations && (
                <button
                  type="button"
                  onClick={() => handleUpdateQuickFilter('all')}
                  style={{
                    flex: 1,
                    padding: '6px 4px',
                    borderRadius: '7px',
                    background: quickFilter === 'all' ? (isPostSaleFunnel ? 'rgba(6, 182, 212, 0.15)' : 'var(--adm-accent-bg)') : 'transparent',
                    border: quickFilter === 'all' ? `1px solid ${isPostSaleFunnel ? '#06B6D4' : 'var(--adm-accent)'}` : '1px solid transparent',
                    color: quickFilter === 'all' ? (isPostSaleFunnel ? '#06B6D4' : 'var(--adm-accent)') : 'var(--adm-text-muted)',
                    fontSize: '0.72rem',
                    fontWeight: quickFilter === 'all' ? 800 : 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Todos
                </button>
                )}
                {canSeeSuppliersTab && (
                <button
                  type="button"
                  onClick={() => setSuppliersTab(true)}
                  style={{
                    flex: 1,
                    padding: '6px 4px',
                    borderRadius: '7px',
                    background: suppliersTab ? 'rgba(245, 158, 11, 0.16)' : 'transparent',
                    border: suppliersTab ? '1px solid #F59E0B' : '1px solid transparent',
                    color: suppliersTab ? '#B45309' : 'var(--adm-text-muted)',
                    fontSize: '0.72rem',
                    fontWeight: suppliersTab ? 800 : 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Fornecedores
                </button>
                )}
              </div>

              {/* Busca + Ordenar (icone) + Filtros (engrenagem) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={15} color="var(--adm-text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={isPostSaleFunnel ? "Buscar por cliente ou telefone..." : "Buscar por lead ou telefone..."}
                    className="adm-input"
                    style={{
                      width: '100%',
                      paddingLeft: '32px',
                      paddingRight: searchTerm ? '32px' : '10px',
                      height: '38px',
                      borderRadius: '10px',
                      fontSize: '0.78rem',
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      color: 'var(--adm-text-title)',
                      outline: 'none',
                    }}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      title="Limpar pesquisa e ver todas as conversas"
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'var(--adm-bg-elevated)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--adm-text-muted)',
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Ordenar: so o icone; abre menu com icones */}
                <div ref={sortDropdownRef} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setIsSortDropdownOpen(v => !v)}
                    title="Ordenar conversas"
                    aria-label="Ordenar conversas"
                    style={{
                      width: '38px', height: '38px', borderRadius: '10px',
                      border: isSortDropdownOpen ? '1px solid var(--adm-accent)' : '1px solid var(--adm-border)',
                      background: isSortDropdownOpen ? 'var(--adm-accent-bg)' : 'var(--adm-bg-card)',
                      color: isSortDropdownOpen ? 'var(--adm-accent)' : '#9E988D',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s ease',
                    }}
                  >
                    <ArrowUpDown size={17} />
                  </button>
                  {isSortDropdownOpen && (
                    <div style={{
                      position: 'absolute', top: '100%', right: 0, marginTop: '8px', width: '250px', background: 'var(--adm-bg-card)',
                      border: '1px solid var(--adm-border)', borderRadius: '14px', padding: '6px', boxShadow: '0 20px 48px rgba(0,0,0,0.5)', zIndex: 9999,
                      display: 'flex', flexDirection: 'column', gap: '2px', fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}>
                      {([
                        { id: 'waiting_time', label: 'Tempo de espera', hint: 'Prioridade SLA', icon: <Clock size={15} /> },
                        { id: 'recent', label: 'Mais recentes', hint: 'Última mensagem primeiro', icon: <ArrowDown size={15} /> },
                        { id: 'oldest', label: 'Mais antigas', hint: 'Mensagem mais velha primeiro', icon: <ArrowUp size={15} /> },
                        { id: 'name_asc', label: 'Nome (A - Z)', hint: 'Ordem alfabética', icon: <span style={{ fontSize: '0.64rem', fontWeight: 900, letterSpacing: '-0.02em' }}>A-Z</span> },
                        { id: 'temperature', label: 'Temperatura do lead', hint: 'Quentes primeiro', icon: <Flame size={15} /> },
                      ] as const).map(opt => {
                        const active = localSortBy === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => { handleUpdateSortBy(opt.id); setIsSortDropdownOpen(false); }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '9px', border: 'none', textAlign: 'left', cursor: 'pointer',
                              background: active ? 'var(--adm-accent-bg)' : 'transparent', color: active ? 'var(--adm-accent)' : 'var(--adm-text-title)',
                            }}
                          >
                            <span style={{ width: '22px', display: 'inline-flex', justifyContent: 'center', flexShrink: 0 }}>{opt.icon}</span>
                            <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{opt.label}</span>
                              <span style={{ fontSize: '0.66rem', fontWeight: 500, color: 'var(--adm-text-muted)' }}>{opt.hint}</span>
                            </span>
                            {active && <Check size={14} />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Filtros (engrenagem) */}
                <div ref={filterDropdownRef} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                    title={isFilterActive ? 'Filtros ativos' : 'Filtrar conversas'}
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      border: isFilterActive ? '1px solid var(--adm-accent)' : isEmbeddedInFunnel ? '1px solid var(--adm-border)' : '1px solid rgba(255,255,255,0.14)',
                      background: isFilterActive ? 'var(--adm-accent-bg)' : isEmbeddedInFunnel ? 'var(--adm-bg-card)' : 'rgba(255,255,255,0.08)',
                      color: isFilterActive ? 'var(--adm-accent)' : isEmbeddedInFunnel ? '#9E988D' : '#E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <SlidersHorizontal size={17} />
                  </button>

                  {/* Filter Popover Dropdown Redesenhado (Audio 1) */}
                  {isFilterDropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '8px',
                      width: '300px',
                      background: 'var(--adm-bg-card)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '16px',
                      padding: '16px',
                      boxShadow: '0 20px 48px rgba(0,0,0,0.5)',
                      zIndex: 9999,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <SlidersHorizontal size={14} color="var(--adm-accent)" />
                          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                            Filtros
                          </span>
                        </div>
                        {isFilterActive && (
                          <button
                            type="button"
                            onClick={resetFilters}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--adm-accent)',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            Limpar Filtros
                          </button>
                        )}
                      </div>

                      {renderFilterSelects(false)}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {messagingPaused && (
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--adm-border)' }}>
            <MessagingPausedBanner compact />
          </div>
        )}

        {/* Leads Conversations Scrollable List */}
        <div ref={animateList} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {filteredLeads.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--adm-text-muted)' }}>
              <MessageSquare size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <div style={{ fontSize: '0.86rem', fontWeight: 700 }}>Nenhuma conversa encontrada</div>
              <div style={{ fontSize: '0.72rem', marginTop: '2px' }}>Ajuste os filtros ou o termo de busca</div>
            </div>
          ) : (
            visibleLeads.map(lead => {
              const isSelected = selectedLeadId === lead.id;
              const venue = venues.find(v => v.id === lead.venueId);
              const lastActivity = lead.activities?.[lead.activities.length - 1];

              // Busca mensagem real de chat nas atividades do lead
              const lastMessageActivity = (lead.activities || [])
                .slice()
                .reverse()
                .find(a => (a.type === 'contact' || (a.type === 'creation' && Boolean(a.text))) && (a.text || a.mediaUrl));
              // Prévia persistida (lead.lastMessageText) quando mais recente que a última atividade carregada, ou quando não há atividades
              const persistedPreviewIsNewer = Boolean(lead.lastMessageText) && (
                !lastMessageActivity ||
                new Date(lead.lastMessageAt || 0).getTime() > new Date(lastMessageActivity.timestamp || 0).getTime()
              );
              let rawMessageText = persistedPreviewIsNewer ? (lead.lastMessageText || '') : (lastMessageActivity?.text || '');

              // Fallback 1: Se não houver mensagem em activities, recuperar do lead.notes apenas se for mensagem real capturada pelo webhook
              if (!rawMessageText && lead.notes && typeof lead.notes === 'string') {
                const trimmedNotes = lead.notes.trim();
                const webhookMatch = trimmedNotes.match(/(?:Conversa iniciada via WhatsApp|Primeira mensagem via WhatsApp|Mensagem recebida via WhatsApp):\s*["“]?([\s\S]*?)["”]?(\n|$)/i);
                if (webhookMatch && webhookMatch[1]) {
                  rawMessageText = webhookMatch[1].trim();
                }
              }

              // Limpa tags internas como [media:...] ou [failed:...]
              let cleanedText = rawMessageText
                .replace(/^\[media:[^\]]+\]\s*/i, '')
                .replace(/^\[failed:[^\]]+\]\s*/i, '')
                .trim();

              if (cleanedText.startsWith('[Undecryptable]')) {
                cleanedText = 'Mensagem recebida';
              }

              const explicitMediaType = lastMessageActivity?.mediaType;
              const hasExplicitImage = explicitMediaType === 'image' ||
                cleanedText.toLowerCase().includes('[imagem]') ||
                cleanedText.toLowerCase().includes('[foto]') ||
                cleanedText.includes('📷') ||
                cleanedText.startsWith('data:image') ||
                cleanedText.includes('imageMessage') ||
                /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(cleanedText);

              const hasExplicitVideo = explicitMediaType === 'video' ||
                cleanedText.toLowerCase().includes('[vídeo]') ||
                cleanedText.toLowerCase().includes('[video]') ||
                cleanedText.includes('🎥') ||
                cleanedText.includes('🎬') ||
                cleanedText.startsWith('data:video') ||
                cleanedText.includes('videoMessage') ||
                /\.(mp4|mov|avi|webm)(\?.*)?$/i.test(cleanedText);

              const hasExplicitDoc = explicitMediaType === 'document' ||
                cleanedText.toLowerCase().includes('[documento]') ||
                cleanedText.toLowerCase().includes('[arquivo]') ||
                cleanedText.includes('📄') ||
                cleanedText.includes('documentMessage') ||
                /\.(pdf|docx?|xlsx?|pptx?|txt|zip)(\?.*)?$/i.test(cleanedText);

              const isAudioMsg = !hasExplicitImage && !hasExplicitVideo && !hasExplicitDoc && (
                explicitMediaType === 'audio' ||
                cleanedText.toLowerCase().includes('[áudio]') ||
                cleanedText.toLowerCase().includes('[audio]') ||
                cleanedText.includes('🎵') ||
                cleanedText.startsWith('data:audio') ||
                cleanedText.includes('.mp3') ||
                cleanedText.includes('.ogg') ||
                cleanedText.includes('.opus') ||
                cleanedText.includes('audioMessage') ||
                (cleanedText.includes('mmg.whatsapp.net') && (cleanedText.includes('mimetype":"audio') || cleanedText.includes('ptt'))) ||
                lastMessageActivity?.title?.toLowerCase().includes('voz') ||
                lastMessageActivity?.title?.toLowerCase().includes('áudio')
              );

              const isImageMsg = !isAudioMsg && hasExplicitImage;
              const isVideoMsg = !isAudioMsg && !isImageMsg && hasExplicitVideo;
              const isDocMsg = !isAudioMsg && !isImageMsg && !isVideoMsg && hasExplicitDoc;

              // Extrai tempo/duração do áudio se disponível (ex: "(0:15)" ou "(1:20)")
              const durationMatch = cleanedText.match(/\((\d+:\d{2})\)/) || lastMessageActivity?.title?.match(/\((\d+:\d{2})\)/);
              const audioDuration = durationMatch ? durationMatch[1] : null;

              let cleanPreviewText = '';
              if (isAudioMsg) {
                cleanPreviewText = audioDuration ? `Áudio (${audioDuration})` : 'Áudio';
              } else if (isImageMsg) {
                const caption = cleanedText.replace(/\[(imagem|foto)\]/gi, '').replace(/📷/g, '').trim();
                cleanPreviewText = (caption && caption !== 'Foto') ? `Foto: ${caption}` : 'Foto';
              } else if (isVideoMsg) {
                const caption = cleanedText.replace(/\[(vídeo|video)\]/gi, '').replace(/[🎥🎬]/g, '').trim();
                cleanPreviewText = (caption && caption !== 'Vídeo') ? `Vídeo: ${caption}` : 'Vídeo';
              } else if (isDocMsg) {
                const docName = cleanedText.replace(/\[(documento|arquivo)\]/gi, '').replace(/📄\s*(Documento:?)?/g, '').trim();
                cleanPreviewText = docName ? `Documento: ${docName}` : 'Documento';
              } else {
                cleanPreviewText = cleanedText || 'Nenhuma mensagem recente';
              }

              const lastTime = getLeadConversationTime(lead) || undefined;
              const pendingWaitMs = getLeadPendingWaitingTime(lead, collabIds);
              const sla = getLeadWaitTimeSla(pendingWaitMs, systemSlaConfig);

              const hasRealName = Boolean(lead.name && lead.name.trim() !== '' && !lead.name.startsWith('LEAD-') && lead.name !== lead.code);
              const displayName = hasRealName ? lead.name : (lead.code || 'Lead sem nome');

              // Contrato vinculado (seja titular pagante, dependente ou lead com contrato associado)
              const linkedContract = (() => {
                if ((lead as any).associated_contract_id) {
                  const c = clients.find(cl => cl.id === (lead as any).associated_contract_id);
                  if (c) return c;
                }
                const cDirect = clients.find(cl => cl.id === lead.id || cl.commercialLeadId === lead.id);
                if (cDirect) return cDirect;
                if (lead.phone) {
                  const lDigits = lead.phone.replace(/\D/g, '').slice(-8);
                  if (lDigits.length >= 8) {
                    return clients.find(cl => {
                      if (cl.payerPhone && cl.payerPhone.replace(/\D/g, '').slice(-8) === lDigits) return true;
                      if (Array.isArray(cl.contacts) && cl.contacts.some(ct => ct.phone && ct.phone.replace(/\D/g, '').slice(-8) === lDigits)) return true;
                      return false;
                    });
                  }
                }
                return null;
              })();
              const linkedContractTitle = linkedContract ? formatContractHonoreeTitle(linkedContract) : null;

              const sdrCollab = lead.sdrId ? collaborators.find(c => c.id === lead.sdrId) : (lead.assignedTo ? collaborators.find(c => c.name === lead.assignedTo) : undefined);
              const closerCollab = lead.closerId ? collaborators.find(c => c.id === lead.closerId) : undefined;
              const hasTwoDistinct = Boolean(sdrCollab && closerCollab && sdrCollab.id !== closerCollab.id);
              const singleCollab = sdrCollab || closerCollab;

              const isLeadSelectedInMulti = selectedLeadIds.includes(lead.id);
              const hasSlaAlert = sla.level !== 'none' && sla.level !== 'recent';

              const itemBg = (isMultiSelectMode && isLeadSelectedInMulti)
                ? 'rgba(99, 102, 241, 0.12)'
                : hasSlaAlert
                  ? (isSelected ? (sla.level === 'red' ? 'rgba(239, 68, 68, 0.12)' : sla.level === 'orange' ? 'rgba(249, 115, 22, 0.10)' : 'rgba(234, 179, 8, 0.08)') : sla.cardBg)
                  : (isSelected ? 'var(--adm-accent-bg)' : 'transparent');

              const itemBorderLeft = (isMultiSelectMode && isLeadSelectedInMulti)
                ? '3px solid var(--adm-accent, #6366F1)'
                : hasSlaAlert
                  ? (isSelected ? `4px solid ${sla.color}` : `3px solid ${sla.color}`)
                  : (isSelected ? '3px solid var(--adm-accent)' : '3px solid transparent');

              return (
                <div
                  key={lead.id}
                  onClick={() => {
                    isChatClosedByUserRef.current = false;
                    if (isMultiSelectMode) {
                      toggleLeadSelection(lead.id);
                      return;
                    }
                    if (lead.unreadCount && lead.unreadCount > 0) {
                      markLeadAsRead(lead.id);
                    }
                    setSelectedLeadId(lead.id);
                    if (isOpenedFromCrmOrKanban) {
                      setIsInspectorOpen(true);
                      setIsConversationsCollapsed(true);
                    } else {
                      setIsInspectorOpen(false);
                    }
                  }}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--adm-border)',
                    background: itemBg,
                    borderLeft: itemBorderLeft,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !(isMultiSelectMode && isLeadSelectedInMulti)) {
                      e.currentTarget.style.background = hasSlaAlert ? (sla.level === 'red' ? 'rgba(239, 68, 68, 0.09)' : sla.level === 'orange' ? 'rgba(249, 115, 22, 0.08)' : 'rgba(234, 179, 8, 0.06)') : 'var(--adm-bg-input)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected && !(isMultiSelectMode && isLeadSelectedInMulti)) {
                      e.currentTarget.style.background = itemBg;
                    }
                  }}
                >
                  {/* Multi-Select Checkbox */}
                  {isMultiSelectMode && (
                    <div
                      onClick={(e) => toggleLeadSelection(lead.id, e)}
                      style={{
                        paddingTop: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isLeadSelectedInMulti}
                        onChange={() => { }}
                        style={{
                          cursor: 'pointer',
                          accentColor: 'var(--adm-accent, #6366F1)',
                          width: '14px',
                          height: '14px',
                        }}
                      />
                    </div>
                  )}

                  {/* Lead Avatar com o selo do canal (WhatsApp hoje; Instagram, Facebook... quando conectados) */}
                  <ChannelAvatar size={38} channel={channelOfLead(lead, sources || [])}>
                    <SafeAvatar
                      src={lead.avatarUrl}
                      name={displayName}
                      size={38}
                    />
                  </ChannelAvatar>

                  {/* Info Column */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {/* 1. Linha Superior: Nome do Usuário + Contrato Vinculado (Pequenininho) + Menu 3 Pontinhos + Horário no Topo Direito */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {displayName}
                          </div>

                        {/* Menu de 3 Pontinhos (Ações Rápidas do Lead) */}
                        <div style={{ position: 'relative' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const r = e.currentTarget.getBoundingClientRect();
                              setActiveLeadMenuRect({ top: r.top, bottom: r.bottom, left: r.left });
                              setActiveLeadMenuId(activeLeadMenuId === lead.id ? null : lead.id);
                            }}
                            title="Opções do lead"
                            style={{
                              background: activeLeadMenuId === lead.id ? 'var(--adm-border)' : 'transparent',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '2px',
                              cursor: 'pointer',
                              color: 'var(--adm-text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--adm-text-title)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--adm-text-muted)'}
                          >
                            <MoreVertical size={13} />
                          </button>

                          {activeLeadMenuId === lead.id && activeLeadMenuRect && createPortal(
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: 'fixed',
                                // abre para baixo; se nao couber (ex.: ultimas conversas), abre para cima
                                ...(window.innerHeight - activeLeadMenuRect.bottom < 260
                                  ? { bottom: window.innerHeight - activeLeadMenuRect.top + 4 }
                                  : { top: activeLeadMenuRect.bottom + 4 }),
                                left: Math.min(activeLeadMenuRect.left, window.innerWidth - 200),
                                maxHeight: 'calc(100vh - 24px)',
                                overflowY: 'auto',
                                zIndex: 99999,
                                background: 'var(--adm-bg-card, #FFFFFF)',
                                border: '1px solid var(--adm-border, #CBD5E1)',
                                borderRadius: '8px',
                                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.25)',
                                padding: '4px',
                                minWidth: '160px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveLeadMenuId(null);
                                  setIsMultiSelectMode(true);
                                  onToggleMultiSelect?.(true);
                                  if (!selectedLeadIds.includes(lead.id)) {
                                    setSelectedLeadIds(prev => [...prev, lead.id]);
                                  }
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '6px 8px',
                                  borderRadius: '5px',
                                  border: 'none',
                                  background: 'transparent',
                                  color: 'var(--adm-text-title)',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  width: '100%',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-input)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <CheckSquare size={12} color="#10B981" />
                                <span>Selecionar Lead</span>
                              </button>

                              {(() => {
                                const isLeadClosed = checkLeadConversationClosed(lead);
                                return (
                                  <button
                                    type="button"
                                    disabled={isLeadClosed}
                                    onClick={() => {
                                      if (isLeadClosed) return;
                                      setActiveLeadMenuId(null);
                                      handleEndConversation(lead.id);
                                    }}
                                    title={isLeadClosed ? 'Conversa já encerrada' : 'Encerrar Conversa'}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      padding: '6px 8px',
                                      borderRadius: '5px',
                                      border: 'none',
                                      background: 'transparent',
                                      color: isLeadClosed ? 'var(--adm-text-muted)' : '#10B981',
                                      fontSize: '0.72rem',
                                      fontWeight: 600,
                                      cursor: isLeadClosed ? 'not-allowed' : 'pointer',
                                      opacity: isLeadClosed ? 0.6 : 1,
                                      textAlign: 'left',
                                      width: '100%',
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!isLeadClosed) e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)';
                                    }}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                  >
                                    <CheckCheck size={12} color={isLeadClosed ? 'var(--adm-text-muted)' : '#10B981'} />
                                    <span>{isLeadClosed ? 'Conversa Encerrada' : 'Encerrar Conversa'}</span>
                                  </button>
                                );
                              })()}

                              <div style={{ height: '1px', background: 'var(--adm-border)', margin: '2px 0' }} />

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveLeadMenuId(null);
                                  setSelectedLeadIds([lead.id]);
                                  setBulkStageModalOpen(true);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '6px 8px',
                                  borderRadius: '5px',
                                  border: 'none',
                                  background: 'transparent',
                                  color: 'var(--adm-text-title)',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  width: '100%',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-input)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <CheckSquare size={12} color="var(--adm-accent, #6366F1)" />
                                <span>Mudar de Etapa</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveLeadMenuId(null);
                                  setSelectedLeadIds([lead.id]);
                                  setBulkFunnelModalOpen(true);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '6px 8px',
                                  borderRadius: '5px',
                                  border: 'none',
                                  background: 'transparent',
                                  color: 'var(--adm-text-title)',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  width: '100%',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-input)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <GitBranch size={12} color="#F59E0B" />
                                <span>Mudar de Funil</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveLeadMenuId(null);
                                  setSelectedLeadIds([lead.id]);
                                  setBulkAssigneeModalOpen(true);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '6px 8px',
                                  borderRadius: '5px',
                                  border: 'none',
                                  background: 'transparent',
                                  color: 'var(--adm-text-title)',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  width: '100%',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-input)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <Users size={12} color="#3B82F6" />
                                <span>Atribuir Responsável</span>
                              </button>

                              <div style={{ height: '1px', background: 'var(--adm-border)', margin: '2px 0' }} />

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveLeadMenuId(null);
                                  setLeadToDeleteDirectly(lead);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '6px 8px',
                                  borderRadius: '5px',
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#EF4444',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  width: '100%',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <Trash2 size={12} color="#EF4444" />
                                <span>Excluir Lead</span>
                              </button>
                            </div>,
                            document.body
                          )}
                        </div>
                      </div>

                      {/* Contrato Vinculado exibido pequenininho logo abaixo do nome */}
                      {linkedContractTitle && (
                        <div
                          title={`Contrato Vinculado: ${linkedContractTitle}`}
                          style={{
                            fontSize: '0.64rem',
                            color: '#D4AF37',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            marginTop: '2px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          <FileText size={10} color="#D4AF37" style={{ flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{linkedContractTitle}</span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          {pendingWaitMs > 0 && (
                            <span
                              title={`Cliente aguardando resposta há ${sla.formattedTime} (${sla.label})`}
                              style={{
                                fontSize: '0.62rem',
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: sla.bg,
                                color: sla.color,
                                border: `1px solid ${sla.border}`,
                                whiteSpace: 'nowrap',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              <Clock size={10} color={sla.color} strokeWidth={2.5} />
                              <span>{sla.formattedTime}</span>
                            </span>
                          )}
                          <div style={{ fontSize: '0.64rem', color: (lead.unreadCount && lead.unreadCount > 0) ? '#10B981' : 'var(--adm-text-muted)', fontWeight: (lead.unreadCount && lead.unreadCount > 0) ? 800 : 600 }}>
                            {lastTime ? (() => {
                              const d = new Date(lastTime);
                              const now = new Date();
                              const isToday = d.toDateString() === now.toDateString();
                              return isToday
                                ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
                            })() : ''}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. Linha Intermediária: Prévia Real da Mensagem + Badge de Não Lidas na Mesma Linha à Direita */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '6px',
                      minHeight: '16px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        overflow: 'hidden',
                        flex: 1,
                        minWidth: 0,
                      }}>
                        {isAudioMsg ? (
                          <Mic size={11} color="#10B981" style={{ flexShrink: 0 }} />
                        ) : isImageMsg ? (
                          <ImageIcon size={11} color="#3B82F6" style={{ flexShrink: 0 }} />
                        ) : isVideoMsg ? (
                          <Video size={11} color="#EC4899" style={{ flexShrink: 0 }} />
                        ) : isDocMsg ? (
                          <FileText size={11} color="#8B5CF6" style={{ flexShrink: 0 }} />
                        ) : null}
                        <span style={{
                          fontSize: '0.72rem',
                          color: (lead.unreadCount && lead.unreadCount > 0) ? 'var(--adm-text-title)' : 'var(--adm-text-muted)',
                          fontWeight: (lead.unreadCount && lead.unreadCount > 0) ? 700 : 500,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {(() => {
                            const pres = listPresence[(lead.phone || '').replace(/\D/g, '').slice(-8)];
                            if (pres === 'composing') return <span style={{ color: '#00a884', fontWeight: 700, animation: 'pulse 1.2s infinite' }}>digitando...</span>;
                            if (pres === 'recording') return <span style={{ color: '#00a884', fontWeight: 700, animation: 'pulse 1.2s infinite', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Mic size={11} color="#00a884" />gravando áudio...</span>;
                            return cleanPreviewText || (lastActivity?.title || 'Sem mensagens recentes');
                          })()}
                        </span>
                        {(() => {
                          // Lead com mensagens de 2+ numeros: mostra por qual numero foi a ultima mensagem
                          const chipOfAct = (a: any): string => a.instanceId || a.metadata?.senderSourceId || a.metadata?.sourceId || a.metadata?.instanceId || '';
                          const chatActs = (lead.activities || []).filter(a => a.type === 'contact');
                          if (new Set(chatActs.map(chipOfAct).filter(Boolean)).size < 2) return null;
                          const lastChip = chipOfAct(chatActs[chatActs.length - 1]);
                          const src = lastChip ? (sources || []).find(x => x.id === lastChip) : null;
                          if (!src) return null;
                          return (
                            <span title={`Última mensagem pelo número ${getSourceCleanLabel(src).cleanName}`} style={{ flexShrink: 0, maxWidth: '90px', fontSize: '0.6rem', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', background: 'var(--adm-bg-input)', color: 'var(--adm-text-muted)', border: '1px solid var(--adm-border)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              via {getSourceCleanLabel(src).cleanName}
                            </span>
                          );
                        })()}
                      </div>
                      {Boolean(lead.unreadCount && lead.unreadCount > 0) && (
                        <div style={{
                          background: '#10B981',
                          color: '#fff',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          borderRadius: '10px',
                          padding: '1px 6px',
                          minWidth: '18px',
                          height: '18px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center',
                          lineHeight: '1',
                          flexShrink: 0,
                        }}>
                          {lead.unreadCount}
                        </div>
                      )}
                    </div>

                    {/* 3. Linha Inferior: Funil na Frente (com Logo) + Unidade com Ícone (Mesma Altura Uniforme) */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginTop: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                        {/* 1º Badge: Funil (com Logo ou Ícone na Frente) */}
                        {(() => {
                          const leadFunnel = funnels.find(f => f.id === lead.funnelId) || activeFunnel;
                          if (!leadFunnel?.name) return null;
                          const hasCustomImg = Boolean(leadFunnel.customImageUrl || (leadFunnel.icon && (leadFunnel.icon.startsWith('http') || leadFunnel.icon.startsWith('/') || leadFunnel.icon.startsWith('data:'))));
                          const funnelColor = leadFunnel.badgeColor || '#6366F1';

                          return (
                            <span 
                              title={`Funil: ${leadFunnel.name}`}
                              style={{
                                height: '20px',
                                boxSizing: 'border-box',
                                fontSize: '0.62rem',
                                fontWeight: 800,
                                padding: '0 6px',
                                borderRadius: '4px',
                                background: `${funnelColor}18`,
                                color: funnelColor,
                                border: `1px solid ${funnelColor}45`,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                whiteSpace: 'nowrap',
                                letterSpacing: '0.2px',
                                flexShrink: 0,
                              }}
                            >
                              {hasCustomImg ? (
                                <img 
                                  src={leadFunnel.customImageUrl || leadFunnel.icon} 
                                  alt="" 
                                  style={{ width: '12px', height: '12px', borderRadius: '2px', objectFit: 'cover', flexShrink: 0 }} 
                                />
                              ) : leadFunnel.icon ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                                  {renderFunnelOrStageIcon(leadFunnel.icon, 11, funnelColor)}
                                </span>
                              ) : (
                                <Filter size={10} color={funnelColor} style={{ flexShrink: 0 }} />
                              )}
                              <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {leadFunnel.name}
                              </span>
                            </span>
                          );
                        })()}

                        {/* 2º Badge: Unidade (com Ícone de Prédio e Mesma Altura Uniforme) */}
                        {venue && (
                          <span 
                            title={`Unidade: ${venue.name}`}
                            style={{
                              height: '20px',
                              boxSizing: 'border-box',
                              fontSize: '0.60rem',
                              fontWeight: 700,
                              padding: '0 6px',
                              borderRadius: '4px',
                              background: 'rgba(59, 130, 246, 0.12)',
                              color: '#3B82F6',
                              border: '1px solid rgba(59, 130, 246, 0.35)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}
                          >
                            <Building2 size={10} color="#3B82F6" style={{ flexShrink: 0 }} />
                            <span style={{ maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{venue.name}</span>
                          </span>
                        )}

                        {/* Stage Badge opcional se aplicável (não exibe 'new_lead' ou 'entry') */}
                        {(() => {
                          const isLeadPostSale = Boolean(
                            lead.isClient ||
                            lead.group === 'Pós-Venda' ||
                            (lead.funnelId && funnels.find(f => f.id === lead.funnelId)?.isPostSale) ||
                            (lead.funnelId && funnels.find(f => f.id === lead.funnelId)?.category === 'Pós-Venda') ||
                            isPostSaleFunnel
                          );
                          const leadFunnel = funnels.find(f => f.id === lead.funnelId) || activeFunnel;
                          const stgKey = (lead.stage as string) || '';
                          const customStage = leadFunnel?.stages?.find(s => s.id === stgKey);
                          const stgCfg = isLeadPostSale
                            ? ((customStage ? { label: customStage.name, color: customStage.color || '#3B82F6', bg: `${customStage.color || '#3B82F6'}15` } : null) || POST_SALE_STAGE_CONFIG[stgKey])
                            : (customStage ? { label: customStage.name, color: customStage.color || '#3B82F6', bg: `${customStage.color || '#3B82F6'}15` } : null);

                          if (stgKey && stgKey !== 'new_lead' && stgKey !== 'entry' && stgCfg) {
                            return (
                              <span style={{
                                height: '20px',
                                boxSizing: 'border-box',
                                fontSize: '0.58rem',
                                fontWeight: 800,
                                padding: '0 5px',
                                borderRadius: '4px',
                                background: stgCfg.bg,
                                color: stgCfg.color,
                                border: `1px solid ${stgCfg.color}40`,
                                display: 'inline-flex',
                                alignItems: 'center',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                              }}>
                                {stgCfg.label}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>

                      {/* Avatares do SDR & Closer (Sobrepostos se forem diferentes, Único se for o mesmo, UserPlus se desatribuído) */}
                      <div style={{ flexShrink: 0 }}>
                        {hasTwoDistinct ? (
                          <div
                            title={`SDR: ${sdrCollab!.name} | Closer: ${closerCollab!.name}`}
                            style={{
                              position: 'relative',
                              width: '28px',
                              height: '18px',
                            }}
                          >
                            {/* Closer (fundo / direita) */}
                            <div style={{
                              position: 'absolute',
                              left: '10px',
                              top: 0,
                              zIndex: 1,
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              background: 'rgba(249, 115, 22, 0.2)',
                              border: '1.2px solid var(--adm-bg-card)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.54rem',
                              fontWeight: 800,
                              color: '#F97316',
                              overflow: 'hidden',
                            }}>
                              {closerCollab!.avatarUrl ? (
                                <img src={closerCollab!.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                closerCollab!.name.charAt(0).toUpperCase()
                              )}
                            </div>

                            {/* SDR (frente / esquerda) */}
                            <div style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              zIndex: 2,
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              background: 'rgba(20, 169, 215, 0.2)',
                              border: '1.2px solid var(--adm-bg-card)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.54rem',
                              fontWeight: 800,
                              color: 'var(--adm-accent)',
                              overflow: 'hidden',
                            }}>
                              {sdrCollab!.avatarUrl ? (
                                <img src={sdrCollab!.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                sdrCollab!.name.charAt(0).toUpperCase()
                              )}
                            </div>
                          </div>
                        ) : singleCollab ? (
                          <div
                            title={`Responsável: ${singleCollab.name}`}
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              background: 'rgba(20, 169, 215, 0.15)',
                              border: '1.2px solid var(--adm-accent)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.56rem',
                              fontWeight: 800,
                              color: 'var(--adm-accent)',
                              overflow: 'hidden',
                            }}
                          >
                            {singleCollab.avatarUrl ? (
                              <img src={singleCollab.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              singleCollab.name.charAt(0).toUpperCase()
                            )}
                          </div>
                        ) : (
                          <div
                            title="Sem responsável comercial (Livre para assumir)"
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              border: '1px dashed var(--adm-border)',
                              background: 'var(--adm-bg-input)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--adm-text-muted)',
                            }}
                          >
                            <UserPlus size={10} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {filteredLeads.length > visibleCount && (
            <div ref={inboxSentinelRef} style={{ flexShrink: 0, padding: '10px 0 14px 0', textAlign: 'center', fontSize: '0.7rem', color: 'var(--adm-text-muted)' }}>
              Carregando mais conversas...
            </div>
          )}
        </div>
      </div>
      )}

      {/* ── COLUNA 2: INSPECTOR DO LEAD / FICHA DO CONTRATO (SEMPRE CENTRAL) ──────────── */}
      {!chatOnly && isInspectorOpen && selectedLead ? (
        <div style={{
          order: 2,
          width: '390px',
          minWidth: '350px',
          maxWidth: '430px',
          borderRight: '1px solid var(--adm-border)',
          borderLeft: 'none',
          background: 'var(--adm-bg-card)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          animation: 'fadeIn 0.15s ease-out',
        }}>
          {isPostSaleFunnel || selectedLead.isClient || (targetContractClient && (targetContractClient as any).contractNumber) ? (
            <AdminClientDrawerInspector
              lead={(targetContractClient || selectedLead) as any}
              onStageChange={(newStage: ClientStage) => {
                updateClientStage((targetContractClient || selectedLead).id, newStage);
              }}
              onToggleCollapse={() => setIsInspectorOpen(false)}
              onOpenDebutanteApp={onOpenDebutanteApp}
              onOpenFullInspector={onOpenClientFullProfile}
              onLeadMerged={(targetId) => setSelectedLeadId(targetId)}
              readOnly={isReadOnlyForPosVenda || isLeadSpectator}
            />
          ) : (
            <AdminLeadInspector
              lead={selectedLead}
              isPostSale={false}
              highlightMissingFields={highlightMissingFields}
              onStageChange={(newStage: CrmStage) => {
                updateLeadStage(selectedLead.id, newStage);
              }}
              onToggleCollapse={() => {
                setIsInspectorOpen(false);
                setHighlightMissingFields(false);
              }}
              readOnly={isReadOnlyForPosVenda || isLeadSpectator}
              selectedRecipientPhone={selectedRecipientPhone || selectedLead?.phone}
              onSelectRecipientPhone={(phone) => setSelectedRecipientPhone(phone)}
            />
          )}
        </div>
      ) : null}

      {/* ── COLUNA 3: ÁREA DE CHAT / ATENDIMENTO & OPERAÇÃO (SEMPRE À DIREITA) ─────────── */}
      <div style={{
        order: 3,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--adm-bg-card)',
        minWidth: '380px',
      }}>
        {selectedLead ? (
          <>
            {/* Chat Top Header */}
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--adm-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--adm-bg-input)',
              gap: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                {!isInspectorOpen && (
                  <button
                    type="button"
                    onClick={() => setIsInspectorOpen(true)}
                    aria-label={isPostSaleFunnel || selectedLead.isClient ? 'Abrir ficha do contrato' : 'Abrir ficha do lead'}
                    title={isPostSaleFunnel || selectedLead.isClient ? 'Abrir ficha do contrato' : 'Abrir ficha do lead'}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '40px',
                      flexShrink: 0,
                      padding: 0,
                      borderRadius: '8px',
                      background: 'var(--adm-bg-card)',
                      border: '1.5px solid var(--adm-border)',
                      color: 'var(--adm-text-title)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <ChevronRight size={16} />
                  </button>
                )}
                <SafeAvatar
                  src={activeRecipient?.avatarUrl || chatPeer.avatarUrl}
                  name={activeRecipient?.name || chatPeer.name || selectedLead.name}
                  size={40}
                  border={activeRecipient?.isDecisor ? "2px solid #10B981" : "1.5px solid var(--adm-accent)"}
                />

                <div style={{ minWidth: 0, flex: 1 }}>
                  {(() => {
                    const hasRealLeadName = Boolean(selectedLead.name && selectedLead.name.trim() !== '' && !selectedLead.name.startsWith('LEAD-') && selectedLead.name !== selectedLead.code);
                    const baseDisplayName = hasRealLeadName ? selectedLead.name : (selectedLead.code || 'Lead sem nome');
                    const headerDisplayName = activeRecipient?.name && !activeRecipient.name.startsWith('LEAD-')
                      ? activeRecipient.name
                      : (chatPeer.name || baseDisplayName);

                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--adm-text-title)', margin: 0 }}>
                          {headerDisplayName}
                        </h3>

                        {isPostSaleWorkspace ? (
                          activeRecipient?.roleBadge && activeRecipient.roleBadge !== 'indefinido' && activeRecipient.roleBadge !== 'Cliente' ? (
                            <span
                              style={{
                                fontSize: '0.66rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: activeRecipient.roleBadge.toLowerCase().includes('debut') || activeRecipient.roleBadge.toLowerCase().includes('homenag')
                                  ? 'rgba(236, 72, 153, 0.12)'
                                  : 'rgba(59, 130, 246, 0.12)',
                                color: activeRecipient.roleBadge.toLowerCase().includes('debut') || activeRecipient.roleBadge.toLowerCase().includes('homenag')
                                  ? '#EC4899'
                                  : '#2563EB',
                                border: activeRecipient.roleBadge.toLowerCase().includes('debut') || activeRecipient.roleBadge.toLowerCase().includes('homenag')
                                  ? '1px solid rgba(236, 72, 153, 0.3)'
                                  : '1px solid rgba(59, 130, 246, 0.3)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <span>{activeRecipient.roleBadge}</span>
                            </span>
                          ) : null
                        ) : (
                          <>
                            {activeRecipient?.roleBadge && activeRecipient.roleBadge !== 'indefinido' && (
                              <span style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: 'rgba(16, 185, 129, 0.12)',
                                color: '#10B981',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                              }}>
                                {activeRecipient.roleBadge}
                              </span>
                            )}

                            {activeRecipient?.isDecisor && !isPostSaleNoContract && (
                              <span
                                title="Decisor Principal do Contrato"
                                style={{
                                  fontSize: '0.66rem',
                                  fontWeight: 700,
                                  padding: '2px 7px',
                                  borderRadius: '6px',
                                  background: 'rgba(245, 158, 11, 0.15)',
                                  color: '#F59E0B',
                                  border: '1px solid rgba(245, 158, 11, 0.35)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Sparkles size={11} color="#F59E0B" />
                                <span>Decisor</span>
                              </span>
                            )}
                          </>
                        )}
                        {(() => {
                          if (!selectedLead.phone) return null;
                          const cleanP = selectedLead.phone.replace(/\D/g, '');
                          if (cleanP.length < 8) return null;
                          const isTargetClient = Boolean(selectedLead.isClient || selectedLead.group === 'Pós-Venda');
                          const hasDup = (sourceLeads || []).some(l => {
                            if (l.id === selectedLead.id) return false;
                            if (l.masterId && selectedLead.masterId && l.masterId !== selectedLead.masterId) return false;
                            if (l.funnelId !== selectedLead.funnelId) return false;
                            const isLClient = Boolean(l.isClient || l.group === 'Pós-Venda');
                            if (isTargetClient !== isLClient) return false;
                            return isPhoneMatch(l.phone, selectedLead.phone);
                          });
                          if (!hasDup) return null;
                          return (
                            <button
                              type="button"
                              onClick={() => setDuplicateModalLead(selectedLead)}
                              title="Clique para resolver duplicidade (Manter ou Mesclar)"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 7px',
                                borderRadius: '6px',
                                fontSize: '0.66rem',
                                fontWeight: 800,
                                background: 'rgba(245, 158, 11, 0.15)',
                                border: '1px solid rgba(245, 158, 11, 0.40)',
                                color: '#F59E0B',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.15)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
                            >
                              <Copy size={10} strokeWidth={2.5} />
                              <span>{isTargetClient ? 'Cliente Duplicado' : 'Lead Duplicado'}</span>
                            </button>
                          );
                        })()}
                        {!hasRealLeadName && selectedLead.code && (
                          <span style={{
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: 'var(--adm-bg-card)',
                            color: 'var(--adm-text-muted)',
                            border: '1px solid var(--adm-border)',
                          }}>
                            {selectedLead.code}
                          </span>
                        )}
                        {icpRating && (
                          <span style={{
                            fontSize: '0.66rem',
                            fontWeight: 600,
                            padding: '2px 7px',
                            borderRadius: '6px',
                            background: icpRating.bg,
                            color: icpRating.color,
                            border: `1px solid ${icpRating.border}`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}>
                            <IcpTargetUserIcon size={12} color={icpRating.color} /> {icpRating.label} {!icpRating.isUndefined ? `(${icpRating.score}%)` : ''}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                  <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {customerPresence.isTyping ? (
                      <span style={{ color: '#00a884', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#00a884', display: 'inline-block', boxShadow: '0 0 6px #00a884' }} />
                        digitando...
                      </span>
                    ) : customerPresence.isRecording ? (
                      <span style={{ color: '#00a884', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Mic size={12} color="#00a884" />
                        gravando áudio...
                      </span>
                    ) : (
                      <>
                        {isPostSaleWorkspace ? (
                          <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
                            Gestor de Sucesso: <strong style={{ color: 'var(--adm-text-title)' }}>{selectedLead.assignedTo || selectedLead.sdrName || 'Não atribuído'}</strong>
                          </span>
                        ) : (
                          <>
                            <PhoneCall size={11} /> {formatPhone(activeRecipient?.phone || selectedRecipientPhone || selectedLead.phone || (selectedLead as any).payerPhone) || 'Sem telefone'} • {isPostSaleFunnel || selectedLead.isClient ? `Gestor de Sucesso: ${selectedLead.assignedTo || selectedLead.sdrName || 'Não atribuído'}` : (selectedLead.sdrName ? `SDR: ${selectedLead.sdrName}` : 'Sem SDR')}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Actions (Ficha do Contrato + Encerrar Conversa + Fechar se aplicável) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {(isPostSaleFunnel || isPostSale) && !isLeadSpectator && !linkedContractDocs.length && !(currentClient as any)?.hasContract && !(currentClient as any)?.contractId && (
                  <button
                    type="button"
                    onClick={() => setIsLinkContractorModalOpen(true)}
                    title="Vincular este cliente a um contrato existente no sistema"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 12px',
                      borderRadius: '8px',
                      background: 'rgba(2, 132, 199, 0.12)',
                      border: '1px solid rgba(2, 132, 199, 0.35)',
                      color: '#0284C7',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(2, 132, 199, 0.20)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(2, 132, 199, 0.12)'; }}
                  >
                    <Link2 size={13} />
                    <span>Vincular Contrato</span>
                  </button>
                )}
                {!isLeadSpectator && selectedLead?.phone && !(isPostSaleWorkspace || (selectedLead as any).contractId || (selectedLead as any).associated_contract_id || (targetContractClient && (targetContractClient as any).contractNumber)) && (
                  <SupplierToggleButton masterId={effectiveUser?.masterId || currentUser?.masterId || effectiveUser?.id || currentUser?.id || ''} name={selectedLead.name} phone={selectedLead.phone} venueId={selectedLead.venueId} />
                )}
                {!isLeadSpectator && (
                  <button
                    type="button"
                    disabled={isConversationClosed}
                    onClick={() => !isConversationClosed && handleEndConversation()}
                    title={isConversationClosed ? "Conversa já encerrada. Aguardando nova mensagem para reabrir." : "Encerrar conversa e finalizar tempo de atendimento (Zera pendência de SLA)"}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 12px',
                      borderRadius: '8px',
                      background: isConversationClosed 
                        ? (isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)') 
                        : 'rgba(16, 185, 129, 0.12)',
                      border: isConversationClosed 
                        ? (isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)') 
                        : '1px solid rgba(16, 185, 129, 0.35)',
                      color: isConversationClosed ? 'var(--adm-text-muted)' : '#10B981',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: isConversationClosed ? 'not-allowed' : 'pointer',
                      opacity: isConversationClosed ? 0.6 : 1,
                      transition: 'all 0.15s ease',
                      boxShadow: isConversationClosed ? 'none' : '0 1px 3px rgba(16, 185, 129, 0.08)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isConversationClosed) e.currentTarget.style.background = 'rgba(16, 185, 129, 0.20)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isConversationClosed) e.currentTarget.style.background = 'rgba(16, 185, 129, 0.12)';
                    }}
                  >
                    <CheckCheck size={14} />
                    <span>{isConversationClosed ? 'Conversa Encerrada' : 'Encerrar Conversa'}</span>
                  </button>
                )}

                {/* Botão Único de Fechar Conversa (Estilo WhatsApp Web - Não fecha a tela geral) */}
                <button
                  type="button"
                  onClick={handleCloseActiveChat}
                  title="Fechar conversa e voltar à visualização geral"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    color: 'var(--adm-text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#EF4444';
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--adm-text-muted)';
                    e.currentTarget.style.borderColor = 'var(--adm-border)';
                    e.currentTarget.style.background = 'var(--adm-bg-input)';
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Spectator Mode Notice Banner */}
            {isLeadSpectator && (
              <div style={{
                background: 'rgba(148, 163, 184, 0.08)',
                borderBottom: '1px solid var(--adm-border)',
                padding: '8px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.74rem',
                color: 'var(--adm-text-muted)',
              }}>
                <Eye size={14} color="var(--adm-accent)" />
                <span style={{ flex: 1 }}><strong>Modo Espectador:</strong> Este lead pertence a <strong>{selectedLead.assignedTo || 'outro colaborador'}</strong>. Apenas visualização permitida.</span>
                <button
                  type="button"
                  onClick={() => setIsReadOnlyModalOpen(true)}
                  style={{
                    background: 'var(--adm-accent-bg)', border: '1px solid var(--adm-accent)', borderRadius: '6px',
                    color: 'var(--adm-accent)', padding: '4px 10px', fontSize: '0.70rem', fontWeight: 800, cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  Visualizar ficha
                </button>
              </div>
            )}
            {isReadOnlyModalOpen && selectedLead && (
              <AdminLeadReadOnlyModal lead={selectedLead} onClose={() => setIsReadOnlyModalOpen(false)} />
            )}
            {isLinkContractorModalOpen && selectedLead && (
              <AdminLinkContractorModal
                leadId={selectedLead.id}
                venueId={selectedLead.venueId || (selectedLead as any).venue_id || activeVenueId}
                onClose={() => setIsLinkContractorModalOpen(false)}
                onLinked={(_ct, targetLeadId) => {
                  setIsLinkContractorModalOpen(false);
                  if (targetLeadId) setSelectedLeadId(targetLeadId);
                }}
              />
            )}

            {/* ── BARRA DE CANAIS DE CONTATO CONECTADOS (PÓS-VENDA) ── */}
            {(isPostSaleWorkspace || allRecipientsWithInfo.length > 1) && (
                <div style={{
                  padding: '7px 20px',
                  borderBottom: '1px solid var(--adm-border)',
                  background: 'var(--adm-bg-card)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    marginRight: '2px',
                    flexShrink: 0,
                    color: 'var(--adm-text-muted)',
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                  }} title="Conversar com" aria-label="Conversar com">
                    <MessageSquare size={14} color="var(--adm-accent, #06B6D4)" />
                  </div>

                  {(availableRecipients.length > 0 ? allRecipientsWithInfo : [{
                    key: 'default-contractor',
                    phone: selectedLead?.phone || '',
                    name: selectedLead?.name || (isPostSaleNoContract ? 'Cliente' : 'Contratante'),
                    label: selectedLead?.name || (isPostSaleNoContract ? 'Cliente' : 'Contratante'),
                    role: isPostSaleNoContract ? 'Cliente' : 'Contratante',
                    roleBadge: isPostSaleNoContract ? 'Cliente' : 'Contratante Pagante',
                    isDecisor: !isPostSaleNoContract,
                    isMain: true,
                    avatarUrl: selectedLead?.avatarUrl,
                  }]).map((rec) => {
                    const isSelected = activeRecipient?.key
                      ? activeRecipient.key === rec.key
                      : (selectedRecipientPhone || activeRecipient?.phone || selectedLead?.phone) === rec.phone;

                    const isProtagonist = rec.roleBadge.toLowerCase().includes('protagonista') || rec.roleBadge.toLowerCase().includes('debut') || rec.roleBadge.toLowerCase().includes('noiv');
                    const isDecisor = rec.isDecisor || rec.isMain || rec.roleBadge.toLowerCase().includes('contratante');
                    const shortName = formatPersonShortName(rec.name);

                    return (
                      <button
                        key={rec.key || `${rec.name}-${rec.roleBadge}-${rec.phone}`}
                        type="button"
                        disabled={rec.noPhone}
                        onClick={() => {
                          if (rec.noPhone) return;
                          recipientTouchedRef.current = selectedLead?.id || null;
                          if (rec.key) setSelectedRecipientKey(rec.key);
                          if (rec.phone) setSelectedRecipientPhone(rec.phone);
                        }}
                        title={rec.noPhone ? `${rec.name} (${rec.roleBadge}) - sem telefone cadastrado` : `Conversar com ${rec.name} (${rec.roleBadge})${rec.phone ? ` • ${formatPhone(rec.phone)}` : ''}`}
                        style={{
                          opacity: rec.noPhone ? 0.55 : 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 12px',
                          borderRadius: '8px',
                          fontSize: '0.74rem',
                          fontWeight: isSelected ? 800 : 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          flexShrink: 0,
                          fontFamily: "'Inter', sans-serif",
                          border: isSelected
                            ? (isProtagonist ? '1.5px solid #EC4899' : isDecisor ? '1.5px solid #10B981' : '1.5px solid #3B82F6')
                            : '1px solid var(--adm-border)',
                          background: isSelected
                            ? (isProtagonist ? 'rgba(236, 72, 153, 0.12)' : isDecisor ? 'rgba(16, 185, 129, 0.12)' : 'rgba(59, 130, 246, 0.12)')
                            : 'var(--adm-bg-input)',
                          color: isSelected
                            ? (isProtagonist ? '#DB2777' : isDecisor ? '#059669' : '#2563EB')
                            : 'var(--adm-text-title)',
                          boxShadow: isSelected 
                            ? (isProtagonist ? '0 1px 6px rgba(236, 72, 153, 0.18)' : isDecisor ? '0 1px 6px rgba(16, 185, 129, 0.18)' : '0 1px 6px rgba(59, 130, 246, 0.18)') 
                            : 'none',
                        }}
                      >
                        {rec.avatarUrl ? (
                          <img
                            src={rec.avatarUrl}
                            alt={rec.name}
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: isSelected 
                              ? (isProtagonist ? '#EC4899' : isDecisor ? '#10B981' : '#3B82F6') 
                              : 'var(--adm-border)',
                            color: isSelected ? '#FFFFFF' : 'var(--adm-text-muted)',
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            {(rec.name || 'C').slice(0, 1).toUpperCase()}
                          </div>
                        )}

                        <span style={{ fontWeight: isSelected ? 800 : 600 }}>{shortName}</span>

                        {isDecisor ? (
                          <span
                            title="Decisor"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px',
                              borderRadius: '4px',
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: isSelected ? '#059669' : '#10B981',
                            }}
                          >
                            <BadgeCheck size={12} style={{ flexShrink: 0 }} />
                          </span>
                        ) : isProtagonist ? (
                          <span
                            title="Protagonista do Evento"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px',
                              borderRadius: '4px',
                              background: 'rgba(236, 72, 153, 0.15)',
                              color: isSelected ? '#DB2777' : '#EC4899',
                            }}
                          >
                            <Sparkles size={12} style={{ flexShrink: 0 }} />
                          </span>
                        ) : (
                          <span
                            title={rec.roleBadge || 'Grupamento Familiar'}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px',
                              borderRadius: '4px',
                              background: 'rgba(59, 130, 246, 0.15)',
                              color: isSelected ? '#2563EB' : '#3B82F6',
                            }}
                          >
                            <Users size={12} style={{ flexShrink: 0 }} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
            )}



            {/* Barra de Abas Setoriais de WhatsApp (Exclusivo Comercial - apenas canais configurados) */}
            {!isPostSaleWorkspace && composerTab === 'whatsapp' && visiblePostSaleChannels.length > 0 && (
              <div style={{
                  padding: '7px 20px',
                  borderBottom: '1px solid var(--adm-border)',
                  background: 'var(--adm-bg-input)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                  fontFamily: "'Inter', sans-serif",
                }}>

                  {/* Demais canais setoriais configurados */}
                  {visiblePostSaleChannels.map(ch => {
                    const isSelected = activePostSaleChannelId === ch.id;
                    const channelColor = ch.color || '#8B5CF6';
                    return (
                      <div key={ch.id} style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setActivePostSaleChannelId(ch.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '5px 12px',
                            borderRadius: isMasterOrManager ? '8px 0 0 8px' : '8px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            border: isSelected
                              ? `1.5px solid ${channelColor}`
                              : '1px solid var(--adm-border)',
                            background: isSelected
                              ? `${channelColor}1A`
                              : 'var(--adm-bg-card)',
                            color: isSelected
                              ? channelColor
                              : 'var(--adm-text-title)',
                            boxShadow: isSelected ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                          }}
                        >
                          <span style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            background: channelColor,
                            display: 'inline-block',
                          }} />
                          <span>{ch.name}</span>
                          {ch.instanceId && (
                            <Smartphone size={11} color={channelColor} />
                          )}
                        </button>

                        {/* Botão de Configurar Canal (Master e Gerente) */}
                        {isMasterOrManager && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPostSaleChannel(ch);
                              setIsPostSaleChannelModalOpen(true);
                            }}
                            title={`Configurar canal ${ch.name}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '5px 7px',
                              borderRadius: '0 8px 8px 0',
                              border: isSelected ? `1.5px solid ${channelColor}` : '1px solid var(--adm-border)',
                              borderLeft: 'none',
                              background: isSelected ? `${channelColor}1A` : 'var(--adm-bg-card)',
                              color: isSelected ? channelColor : 'var(--adm-text-muted)',
                              cursor: 'pointer',
                              fontSize: '0.72rem',
                            }}
                          >
                            <Edit3 size={11} />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* Botão [+] Adicionar Novo Canal Setorial (Master ou Gerente) */}
                  {isMasterOrManager && activeChannelsFunnel && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPostSaleChannel(null);
                        setIsPostSaleChannelModalOpen(true);
                      }}
                      title="Adicionar Novo Setor de Atendimento no WhatsApp"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '5px 10px',
                        borderRadius: '8px',
                        border: '1px dashed var(--adm-accent)',
                        background: 'var(--adm-accent-bg)',
                        color: 'var(--adm-accent)',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        flexShrink: 0,
                      }}
                    >
                      <Plus size={12} strokeWidth={2.5} />
                      <span>Novo Setor</span>
                    </button>
                  )}
                </div>
            )}

            {/* ── TIMELINE DINÂMICA CONECTADA À ABA DO COMPOSER ── */}
            <div
              ref={timelineContainerRef}
              onScroll={handleTimelineScroll}
              onWheel={() => { isManualUserScrollRef.current = true; }}
              onTouchMove={() => { isManualUserScrollRef.current = true; }}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                background: composerTab === 'whatsapp'
                  ? (() => {
                      // Com múltiplas instâncias na unidade/funil, o fundo muda sutilmente conforme o WhatsApp ativo
                      const senderIdx = venueSenderSources.length > 1
                        ? Math.max(0, venueSenderSources.findIndex(src => src.id === activeSenderSource?.id))
                        : 0;
                      // Paletas clássicas e elegantes adaptadas por instância:
                      // 0: Bege clássico original do WhatsApp
                      // 1: Esverdeado pastel sutil WhatsApp
                      // 2: Azulado suave / Celeste
                      // 3: Lavanda / Lilás suave
                      // 4: Âmbar / Areia sutil
                      const darkPalette = ['#0B141A', '#0A1815', '#0B1520', '#14121F', '#1A160E'];
                      const lightPalette = ['#EFEAE2', '#E3ECE7', '#E5EEF5', '#ECE8F3', '#F5EFE6'];
                      return (isDarkMode ? darkPalette : lightPalette)[senderIdx % 5];
                    })()
                  : 'radial-gradient(ellipse at 50% 10%, rgba(212, 175, 55, 0.03) 0%, transparent 60%)',
                transition: 'background 0.3s ease',
              }}>
              {/* 1. ABA WHATSAPP: Exibe histórico de mensagens com layout bilateral */}
              {composerTab === 'whatsapp' && (
                <>
                  {/* Badge Flutuante no Topo com a Instância Ativa (Foto, Nome e Telefone) */}
                  {activeSenderSource && (
                    <div style={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 8,
                      display: 'flex',
                      justifyContent: 'center',
                      marginBottom: '8px',
                      pointerEvents: 'none',
                    }}>
                      <div
                        style={{
                          pointerEvents: 'auto',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 10px 3px 5px',
                          borderRadius: '20px',
                          background: isDarkMode ? 'rgba(30, 41, 59, 0.90)' : 'rgba(255, 255, 255, 0.94)',
                          backdropFilter: 'blur(8px)',
                          WebkitBackdropFilter: 'blur(8px)',
                          border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.08)',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                          fontSize: '0.68rem',
                          color: 'var(--adm-text-title)',
                          maxWidth: '92%',
                          animation: 'fadeIn 0.2s ease-out',
                          userSelect: 'none',
                        }}
                        title={`Canal de disparo atual: ${getSourceCleanLabel(activeSenderSource).cleanName} (${getSourceCleanLabel(activeSenderSource).formattedPhone || ''})`}
                      >
                        {/* Avatar da Instância ou Ícone do WhatsApp */}
                        {getSourceAvatar(activeSenderSource) ? (
                          <img
                            src={getSourceAvatar(activeSenderSource)!}
                            alt=""
                            style={{ width: 17, height: 17, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                          />
                        ) : (
                          <div style={{
                            width: 17,
                            height: 17,
                            borderRadius: '50%',
                            background: isSourceOnline(activeSenderSource) ? '#25D366' : '#EF4444',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            <WhatsAppBrandIcon size={10} color="#FFFFFF" />
                          </div>
                        )}

                        {/* Ponto verde de conexão */}
                        <span style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: isSourceOnline(activeSenderSource) ? '#10B981' : '#EF4444',
                          flexShrink: 0,
                        }} />

                        {/* Nome da Instância */}
                        <span style={{ fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {getSourceCleanLabel(activeSenderSource).cleanName}
                        </span>

                        {/* Telefone da Instância */}
                        {getSourceCleanLabel(activeSenderSource).formattedPhone && (
                          <span style={{ color: 'var(--adm-text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            • {getSourceCleanLabel(activeSenderSource).formattedPhone}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Top status indicator for older messages loading */}
                  {isLoadingOlder ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      margin: '4px auto 10px auto',
                      borderRadius: '20px',
                      background: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
                      color: 'var(--adm-text-muted)',
                      fontSize: '0.74rem',
                      width: 'fit-content',
                    }}>
                      <Loader2 size={13} className="animate-spin" color="var(--adm-accent)" />
                      <span>Carregando mensagens anteriores...</span>
                    </div>
                  ) : !reachedBeginningMap[selectedLeadId || ''] && timelineActivities.length > 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 10px 0' }}>
                      <button
                        type="button"
                        onClick={loadOlderMessages}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 14px',
                          borderRadius: '16px',
                          border: '1px solid var(--adm-border)',
                          background: isDarkMode ? '#1e293b' : '#ffffff',
                          color: 'var(--adm-text-title)',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--adm-accent-bg)'; e.currentTarget.style.color = 'var(--adm-accent)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = isDarkMode ? '#1e293b' : '#ffffff'; e.currentTarget.style.color = 'var(--adm-text-title)'; }}
                      >
                        <Clock size={12} />
                        <span>Carregar mensagens anteriores</span>
                      </button>
                    </div>
                  ) : reachedBeginningMap[selectedLeadId || ''] && timelineActivities.length > 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '6px 12px',
                      margin: '4px auto 8px auto',
                      color: 'var(--adm-text-muted)',
                      fontSize: '0.70rem',
                      fontWeight: 500,
                      opacity: 0.7,
                    }}>
                      Início do histórico de mensagens
                    </div>
                  ) : null}

                  {timelineActivities.length === 0 ? (
                    isLoadingOlder ? (
                      <div style={{ textAlign: 'center', padding: '60px 20px', color: isDarkMode ? '#8696a0' : '#667781' }}>
                        <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px auto', color: 'var(--adm-accent)' }} />
                        <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Buscando mensagens do histórico...</div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '60px 20px', color: isDarkMode ? '#8696a0' : '#667781' }}>
                        <MessageSquare size={36} style={{ opacity: 0.3, marginBottom: '8px' }} />
                        <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>Nenhuma mensagem trocada ainda</div>
                        <div style={{ fontSize: '0.74rem', marginTop: '4px' }}>Digite uma mensagem abaixo para iniciar o atendimento via WhatsApp.</div>
                      </div>
                    )
                  ) : (
                    timelineActivities.map((act, idx) => {
                      const isIncoming = act.authorId === 'lead' ||
                        act.authorName?.toLowerCase().includes('lead') ||
                        act.authorName?.toLowerCase().includes('cliente') ||
                        act.title?.toLowerCase().includes('recebid') ||
                        (act.type === 'creation' && !act.authorName?.includes('API'));

                      const isBot = act.authorId === 'system_bot' ||
                        act.authorName?.toLowerCase().includes('bot') ||
                        act.authorName?.toLowerCase().includes('robô') ||
                        act.authorName?.toLowerCase().includes('roleta');

                      const checkIsIncoming = (a: LeadActivity | null) => {
                        if (!a) return false;
                        return a.authorId === 'lead' ||
                          a.authorName?.toLowerCase().includes('lead') ||
                          a.authorName?.toLowerCase().includes('cliente') ||
                          a.title?.toLowerCase().includes('recebid') ||
                          (a.type === 'creation' && !a.authorName?.includes('API'));
                      };

                      const checkIsBot = (a: LeadActivity | null) => {
                        if (!a) return false;
                        return a.authorId === 'system_bot' ||
                          a.authorName?.toLowerCase().includes('bot') ||
                          a.authorName?.toLowerCase().includes('robô') ||
                          a.authorName?.toLowerCase().includes('roleta');
                      };

                      const prevAct = idx > 0 ? timelineActivities[idx - 1] : null;
                      const nextAct = idx < timelineActivities.length - 1 ? timelineActivities[idx + 1] : null;

                      const actTime = act.timestamp ? new Date(act.timestamp).getTime() : 0;
                      const prevTime = prevAct?.timestamp ? new Date(prevAct.timestamp).getTime() : 0;
                      const nextTime = nextAct?.timestamp ? new Date(nextAct.timestamp).getTime() : 0;

                      // Checagem de mudança de data estilo WhatsApp
                      const isDifferentDayFromPrev = (() => {
                        if (idx === 0) return true;
                        if (!prevAct || !prevAct.timestamp || !act.timestamp) return false;
                        const d1 = new Date(prevAct.timestamp);
                        const d2 = new Date(act.timestamp);
                        return d1.getFullYear() !== d2.getFullYear() ||
                          d1.getMonth() !== d2.getMonth() ||
                          d1.getDate() !== d2.getDate();
                      })();

                      const dateDividerText = isDifferentDayFromPrev && act.timestamp ? formatWhatsAppDateDivider(act.timestamp) : '';

                      const isSameAsPrev = Boolean(
                        !isDifferentDayFromPrev &&
                        !isBot && prevAct && !checkIsBot(prevAct) &&
                        checkIsIncoming(prevAct) === isIncoming &&
                        Math.abs(actTime - prevTime) < 120000
                      );

                      const isSameAsNext = Boolean(
                        !isBot && nextAct && !checkIsBot(nextAct) &&
                        checkIsIncoming(nextAct) === isIncoming &&
                        Math.abs(nextTime - actTime) < 120000
                      );

                      const formattedTime = act.timestamp ? new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                      const renderDateDivider = () => {
                        if (!isDifferentDayFromPrev || !dateDividerText) return null;
                        return (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '100%',
                              margin: idx === 0 ? '6px 0 14px 0' : '20px 0 14px 0',
                              position: 'relative',
                              userSelect: 'none',
                              zIndex: 2,
                            }}
                          >
                            <div style={{ flex: 1, height: '1px', background: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.07)' }} />
                            <div
                              style={{
                                margin: '0 12px',
                                background: isDarkMode ? '#182229' : '#ffffff',
                                color: isDarkMode ? '#8696a0' : '#54656f',
                                fontSize: '0.70rem',
                                fontWeight: 700,
                                letterSpacing: '0.04em',
                                padding: '4px 14px',
                                borderRadius: '8px',
                                boxShadow: isDarkMode ? '0 1px 3px rgba(0,0,0,0.45)' : '0 1px 2px rgba(11,20,26,0.12)',
                                border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                textTransform: 'uppercase',
                              }}
                            >
                              <span>{dateDividerText}</span>
                            </div>
                            <div style={{ flex: 1, height: '1px', background: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.07)' }} />
                          </div>
                        );
                      };

                      const isSessionEnd = Boolean(
                        (act as any).metadata?.isSessionEnd ||
                        act.title?.toLowerCase().includes('conversa encerrada') ||
                        act.title?.toLowerCase().includes('atendimento finalizado')
                      );

                      if (isSessionEnd) {
                        return (
                          <React.Fragment key={act.id}>
                            {renderDateDivider()}
                            <div style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '12px',
                              margin: '16px 0 12px 0',
                            }}>
                              <div style={{ flex: 1, height: '1px', background: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 16px',
                                borderRadius: '999px',
                                background: isDarkMode ? 'rgba(16, 185, 129, 0.12)' : '#ecfdf5',
                                border: isDarkMode ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid #a7f3d0',
                                color: isDarkMode ? '#34d399' : '#047857',
                                fontSize: '0.74rem',
                                fontWeight: 600,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                              }}>
                                <CheckCheck size={14} style={{ flexShrink: 0 }} />
                                <span>Conversa encerrada por <strong>{act.authorName || (act as any).metadata?.closedByName || 'Equipe'}</strong></span>
                                {formattedTime && <span style={{ opacity: 0.7, fontSize: '0.68rem', marginLeft: '4px' }}>• {formattedTime}</span>}
                              </div>
                              <div style={{ flex: 1, height: '1px', background: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
                            </div>
                          </React.Fragment>
                        );
                      }

                      const isHandover = Boolean(
                        (act.metadata as any)?.isHandover ||
                        act.authorId === 'system_handover' ||
                        act.title?.includes('Passagem de Bastão') ||
                        act.text?.includes('PASSAGEM DE BASTÃO')
                      );
                      if (isHandover) {
                        return (
                          <React.Fragment key={act.id}>
                            {renderDateDivider()}
                            <div
                              id={`msg-${act.id}`}
                              style={{
                                alignSelf: 'center',
                                width: '100%',
                                maxWidth: '520px',
                                margin: '14px auto',
                                borderRadius: '14px',
                                background: isDarkMode
                                  ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))'
                                  : 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
                                border: isDarkMode ? '1.5px solid rgba(6, 182, 212, 0.4)' : '1.5px solid rgba(6, 182, 212, 0.5)',
                                boxShadow: isDarkMode ? '0 8px 24px rgba(0, 0, 0, 0.35)' : '0 8px 20px rgba(0, 0, 0, 0.08)',
                                overflow: 'hidden',
                              }}
                            >
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 14px',
                                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(8, 145, 178, 0.25))',
                                borderBottom: isDarkMode ? '1px solid rgba(6, 182, 212, 0.2)' : '1px solid rgba(6, 182, 212, 0.25)',
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{
                                    width: '26px',
                                    height: '26px',
                                    borderRadius: '8px',
                                    background: '#06B6D4',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#ffffff',
                                  }}>
                                    <ArrowRightLeft size={14} />
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#06B6D4', letterSpacing: '0.5px' }}>
                                      F5 SYSTEM • PASSAGEM DE BASTÃO
                                    </div>
                                    <div style={{ fontSize: '0.66rem', color: isDarkMode ? 'var(--adm-text-muted)' : '#64748b' }}>
                                      Transição Oficial: Comercial ➔ Pós-Venda
                                    </div>
                                  </div>
                                </div>
                                <span style={{
                                  fontSize: '0.62rem',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  background: 'rgba(6, 182, 212, 0.2)',
                                  color: '#06B6D4',
                                  border: '1px solid rgba(6, 182, 212, 0.35)',
                                }}>
                                  Venda Concluída
                                </span>
                              </div>
                              <div style={{
                                padding: '12px 14px',
                                fontSize: '0.76rem',
                                lineHeight: '1.5',
                                whiteSpace: 'pre-wrap',
                                color: isDarkMode ? 'var(--adm-text-title)' : '#1e293b',
                              }}>
                                {act.text}
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      }

                      if (isBot) {
                        return (
                          <React.Fragment key={act.id}>
                            {renderDateDivider()}
                            <div style={{ alignSelf: 'center', maxWidth: '85%', margin: '6px 0', display: 'flex', alignItems: 'center', gap: '8px', background: isDarkMode ? 'rgba(212, 175, 55, 0.08)' : 'rgba(212, 175, 55, 0.15)', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '12px', padding: '8px 14px' }}>
                              <img src="/logo_f5.png" alt="F5" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                              <div style={{ fontSize: '0.74rem', color: isDarkMode ? 'var(--adm-text-title)' : '#1e293b' }}>
                                <strong style={{ color: isDarkMode ? 'var(--adm-accent)' : '#b45309' }}>{act.title || 'Automação F5 System'}:</strong> {act.text}
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      }

                      const isViewAudit = act.title === 'Mensagem Visualizada' || (act.text && act.text.includes('visualizou esta mensagem'));
                      if (isViewAudit) {
                        return (
                          <React.Fragment key={act.id}>
                            {renderDateDivider()}
                            <div style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              margin: '6px 0',
                            }}>
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 12px',
                                borderRadius: '999px',
                                background: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
                                color: isDarkMode ? '#8696a0' : '#64748b',
                                fontSize: '0.68rem',
                                fontWeight: 500,
                              }}>
                                <span>{act.text}</span>
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      }

                      const needsManualDownload = Boolean(act.needsManualDownload || (act as any).metadata?.needsManualDownload);
                      let effectiveMediaUrl = act.mediaUrl;
                      let effectiveMediaType: LeadActivity['mediaType'] = act.mediaType;
                      let effectiveText = act.text || '';

                      if (effectiveText && effectiveText.startsWith('{') && (effectiveText.includes('mimetype') || effectiveText.includes('audio') || effectiveText.includes('image') || effectiveText.includes('document') || effectiveText.includes('video') || effectiveText.includes('ptt') || effectiveText.includes('directPath') || effectiveText.includes('mmg.whatsapp.net'))) {
                        try {
                          const parsed = JSON.parse(effectiveText);
                          const parsedUrl = parsed.URL || parsed.url || parsed.fileURL || parsed.mediaUrl || parsed.directPath;
                          const mimetype = String(parsed.mimetype || parsed.mime || '').toLowerCase();
                          if (parsedUrl) {
                            effectiveMediaUrl = effectiveMediaUrl || parsedUrl;
                            if (mimetype.includes('image') || effectiveText.includes('imageMessage')) {
                              effectiveMediaType = 'image';
                              effectiveText = parsed.caption || parsed.text || '📷 Foto';
                            } else if (mimetype.includes('video') || effectiveText.includes('videoMessage')) {
                              effectiveMediaType = 'video';
                              effectiveText = parsed.caption || parsed.text || '🎥 Vídeo';
                            } else if (mimetype.includes('audio') || parsed.ptt || effectiveText.includes('ptt') || effectiveText.includes('audioMessage')) {
                              effectiveMediaType = 'audio';
                              effectiveText = '🎵 Mensagem de voz';
                            } else if (mimetype.includes('pdf') || mimetype.includes('document') || effectiveText.includes('documentMessage')) {
                              effectiveMediaType = 'document';
                              effectiveText = parsed.fileName ? `📄 Documento: ${parsed.fileName}` : (parsed.caption || parsed.text || '📄 Documento');
                            }
                          }
                        } catch {
                          const urlMatch = effectiveText.match(/"URL"\s*:\s*"([^"]+)"/i) || effectiveText.match(/https:\/\/mmg\.whatsapp\.net[^\s"'}]+/i);
                          if (urlMatch) {
                            effectiveMediaUrl = effectiveMediaUrl || urlMatch[1] || urlMatch[0];
                            const lowerText = effectiveText.toLowerCase();
                            const capMatch = effectiveText.match(/"caption"\s*:\s*"([^"]+)"/i);
                            const parsedCaption = capMatch ? capMatch[1] : '';

                            if (lowerText.includes('image') || /\.(jpg|jpeg|png|webp|gif)/i.test(effectiveMediaUrl)) {
                              effectiveMediaType = 'image';
                              effectiveText = parsedCaption || '📷 Foto';
                            } else if (lowerText.includes('video') || /\.(mp4|mov|webm)/i.test(effectiveMediaUrl)) {
                              effectiveMediaType = 'video';
                              effectiveText = parsedCaption || '🎥 Vídeo';
                            } else if (lowerText.includes('document') || lowerText.includes('pdf') || /\.(pdf|docx?|xlsx?)/i.test(effectiveMediaUrl)) {
                              effectiveMediaType = 'document';
                              effectiveText = parsedCaption || '📄 Documento';
                            } else if (lowerText.includes('audio') || lowerText.includes('ptt') || /\.(ogg|mp3|opus|wav)/i.test(effectiveMediaUrl)) {
                              effectiveMediaType = 'audio';
                              effectiveText = '🎵 Mensagem de voz';
                            }
                          }
                        }
                      }

                      // Auto-correção caso o mediaType tenha vindo gravado como 'audio' por fallback legado
                      if (effectiveMediaUrl) {
                        if (/\.(jpe?g|png|webp|gif|svg|bmp|heic)(\?.*)?$/i.test(effectiveMediaUrl)) {
                          effectiveMediaType = 'image';
                        } else if (/\.(mp4|mov|webm|mkv|avi)(\?.*)?$/i.test(effectiveMediaUrl)) {
                          effectiveMediaType = 'video';
                        } else if (/\.(pdf|docx?|xlsx?|pptx?|txt|csv|zip)(\?.*)?$/i.test(effectiveMediaUrl)) {
                          effectiveMediaType = 'document';
                        }
                      }

                      const isSticker = effectiveMediaType === 'sticker' || effectiveText?.includes('✨ Figurinha');
                      const msgRawContent = effectiveMediaUrl || effectiveText || '';
                      const isInstagramMsg = Boolean(msgRawContent && /https?:\/\/(www\.)?instagram\.com/i.test(msgRawContent));
                      const instagramMsgUrl = msgRawContent.match(/https?:\/\/(?:www\.)?instagram\.com[^\s]*/i)?.[0] || msgRawContent;

                      const isTitleOrTextAudio = Boolean(
                        act.title?.toLowerCase().includes('voz') ||
                        act.title?.toLowerCase().includes('áudio') ||
                        effectiveText?.includes('🎵') ||
                        effectiveMediaType === 'audio' ||
                        act.mediaType === 'audio'
                      );

                      const isContactMsg = Boolean(
                        (effectiveMediaType as any) === 'vcard' ||
                        (act.mediaType as any) === 'vcard' ||
                        (act.metadata as any)?.isContactCard ||
                        (effectiveText && effectiveText.startsWith('👤 Contato:'))
                      );

                      const hasExplicitNonAudioMedia = !isTitleOrTextAudio && !isContactMsg && (
                        effectiveMediaType === 'image' || act.mediaType === 'image' ||
                        effectiveMediaType === 'video' || act.mediaType === 'video' ||
                        (effectiveMediaType === 'document' && !act.mediaUrl?.includes('.bin')) ||
                        isSticker
                      );

                      const isAudioMsg = !isContactMsg && (isTitleOrTextAudio || (!hasExplicitNonAudioMedia && Boolean(
                        effectiveMediaType === 'audio' ||
                        act.mediaType === 'audio' ||
                        (effectiveMediaUrl && (
                          effectiveMediaUrl.startsWith('data:audio') ||
                          (/\.(ogg|mp3|opus|wav|m4a|aac|bin)(\?.*)?$/i.test(effectiveMediaUrl) && isTitleOrTextAudio) ||
                          /\.(ogg|mp3|opus|wav|m4a|aac)(\?.*)?$/i.test(effectiveMediaUrl) ||
                          (effectiveMediaUrl.includes('mmg.whatsapp.net') && (effectiveText.includes('🎵') || effectiveText.toLowerCase().includes('voz') || effectiveText.toLowerCase().includes('áudio')))
                        ))
                      )));

                      // Audio/foto sem arquivo utilizavel (nao baixado, URL expirada ou que falhou ao carregar): mostra o
                      // cartao de sincronizacao (API e, se preciso, celular) em vez de um player falso de 1 segundo
                      const needsMediaRecovery = Boolean(
                        needsManualDownload ||
                        brokenMediaIds.has(act.id) ||
                        (isIncoming && (isAudioMsg || effectiveMediaType === 'image') && !effectiveMediaUrl && mediaIdsOf(act).length > 0)
                      );

                      if (isIncoming) {
                        // Balão à Esquerda (Lead / Cliente)
                        return (
                          <React.Fragment key={act.id}>
                            {renderDateDivider()}
                            <div
                              id={`msg-${act.id}`}
                              onMouseEnter={() => setHoveredMsgId(act.id)}
                              onMouseLeave={() => setHoveredMsgId(null)}
                              style={{
                                alignSelf: 'flex-start',
                                maxWidth: '75%',
                                display: 'flex',
                                alignItems: 'flex-end',
                                gap: '8px',
                                margin: isSameAsPrev ? '1px 0' : '6px 0 1px 0',
                              }}
                            >
                              {/* Avatar do Lead: só exibe no último balão do grupo consecutivo */}
                              {!isSameAsNext ? (
                                peerOfActivity(act).avatarUrl ? (
                                  <img
                                    src={peerOfActivity(act).avatarUrl}
                                    alt={peerOfActivity(act).name}
                                    style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', border: isDarkMode ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid rgba(0,0,0,0.1)', flexShrink: 0 }}
                                  />
                                ) : (
                                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#e0e7ff', color: '#3B82F6', fontWeight: 800, fontSize: '0.74rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1.5px solid rgba(59, 130, 246, 0.35)' }}>
                                    {(peerOfActivity(act).name || 'L').charAt(0).toUpperCase()}
                                  </div>
                                )
                              ) : (
                                <div style={{ width: '30px', flexShrink: 0 }} />
                              )}

                              {/* Conteúdo: Sticker Solto vs Balão Clássico */}
                              {isSticker && effectiveMediaUrl ? (
                                <div
                                  style={{ display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer' }}
                                  onClick={() => setLightboxMedia({ url: effectiveMediaUrl!, type: 'image', title: 'Figurinha' })}
                                >
                                  <img
                                    src={effectiveMediaUrl}
                                    alt="Figurinha"
                                    style={{ maxWidth: '140px', maxHeight: '140px', objectFit: 'contain', background: 'transparent' }}
                                  />
                                  <span style={{ fontSize: '0.62rem', color: isDarkMode ? '#8696a0' : '#667781' }}>{formattedTime}</span>
                                </div>
                              ) : (
                                <div 
                                  onDoubleClick={() => setReplyingToMessage(act)}
                                  title="Duplo clique para responder"
                                  style={{
                                    background: isDarkMode ? '#202c33' : '#ffffff',
                                    border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
                                    borderRadius: isSameAsPrev ? '12px' : '14px 14px 14px 2px',
                                    padding: '7px 11px',
                                    color: isDarkMode ? '#e9edef' : '#111b21',
                                    boxShadow: isDarkMode ? '0 1px 2px rgba(0,0,0,0.3)' : '0 1px 0.5px rgba(11,20,26,.13)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '3px',
                                    maxWidth: (act.mediaType === 'image' || effectiveMediaType === 'image') && (act.mediaUrl || effectiveMediaUrl) ? '340px' : undefined,
                                    width: (act.mediaType === 'image' || effectiveMediaType === 'image') && (act.mediaUrl || effectiveMediaUrl) ? 'fit-content' : undefined,
                                  }}
                                >
                                  {Boolean((act as any)?.metadata?.isForwarded || (act as any)?.isForwarded) && (
                                    <div style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '0.66rem',
                                      fontStyle: 'italic',
                                      color: isDarkMode ? '#8696a0' : '#667781',
                                      marginBottom: '3px',
                                      userSelect: 'none',
                                    }}>
                                      <Forward size={12} style={{ transform: 'scaleX(-1)' }} />
                                      <span>Encaminhada</span>
                                    </div>
                                  )}
                                  {!isSameAsPrev && (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginBottom: '2px' }}>
                                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: isDarkMode ? '#53bdeb' : '#128c7e' }}>
                                        {peerOfActivity(act).name || act.authorName || 'Cliente'}
                                      </span>
                                      <span style={{ fontSize: '0.62rem', color: isDarkMode ? '#8696a0' : '#667781' }}>
                                        {formattedTime}
                                      </span>
                                    </div>
                                  )}

                                  {/* Citação da Mensagem Respondida (Quote Box no topo do balão) */}
                                  {act.quotedMessage && (
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleScrollToQuotedMessage(act.quotedMessage?.id || act.quotedMessage?.messageId);
                                      }}
                                      title="Clique para ir até a mensagem respondida"
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '5px 8px',
                                        borderRadius: '6px',
                                        background: isDarkMode ? 'rgba(0, 0, 0, 0.28)' : 'rgba(0, 0, 0, 0.06)',
                                        borderLeft: '4px solid #25d366',
                                        cursor: 'pointer',
                                        marginBottom: '4px',
                                        overflow: 'hidden',
                                        transition: 'background 0.15s ease',
                                      }}
                                      onMouseEnter={(e) => { e.currentTarget.style.background = isDarkMode ? 'rgba(0, 0, 0, 0.42)' : 'rgba(0, 0, 0, 0.1)'; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.background = isDarkMode ? 'rgba(0, 0, 0, 0.28)' : 'rgba(0, 0, 0, 0.06)'; }}
                                    >
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden', flex: 1 }}>
                                        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#25d366', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                          {act.quotedMessage.sender || 'Mensagem'}
                                        </span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: isDarkMode ? '#aebac1' : '#54656f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                          {act.quotedMessage.type === 'audio' && <Mic size={13} color="#25d366" />}
                                          {act.quotedMessage.type === 'image' && <Camera size={13} color="#8696a0" />}
                                          {act.quotedMessage.type === 'video' && <Video size={13} color="#8696a0" />}
                                          {act.quotedMessage.type === 'document' && <FileText size={13} color="#8696a0" />}
                                          <span>
                                            {act.quotedMessage.type === 'audio'
                                              ? (act.quotedMessage.audioDuration || '0:04')
                                              : (act.quotedMessage.text || 'Mídia')}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Conteúdo: Instagram Card, Áudio Player, Foto, Vídeo, Documento ou Texto */}
                                  {needsMediaRecovery ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                      <div onClick={() => handleManualDownloadMedia(act)} title="Toque para sincronizar (API e celular)" style={{ cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '12px',
                                        padding: '8px 12px',
                                        borderRadius: '10px',
                                        background: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                        minWidth: '220px',
                                        maxWidth: '290px',
                                      }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                          <div style={{
                                            width: '34px',
                                            height: '34px',
                                            borderRadius: '50%',
                                            background: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: isDarkMode ? '#8696a0' : '#64748b',
                                            flexShrink: 0,
                                          }}>
                                            {isAudioMsg ? <Mic size={18} /> : (effectiveMediaType === 'image' || act.mediaType === 'image') ? <Camera size={18} /> : (effectiveMediaType === 'video' || act.mediaType === 'video') ? <Video size={18} /> : <FileText size={18} />}
                                          </div>
                                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                                            <span style={{ fontSize: '0.80rem', fontWeight: 600, color: isDarkMode ? '#e9edef' : '#111b21', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                              {isAudioMsg ? 'Mensagem de voz' : (effectiveMediaType === 'image' || act.mediaType === 'image') ? 'Foto' : (effectiveMediaType === 'video' || act.mediaType === 'video') ? 'Vídeo' : (act.text || 'Documento')}
                                            </span>
                                            <span style={{ fontSize: '0.67rem', color: isDarkMode ? '#8696a0' : '#64748b' }}>
                                              {downloadingMediaIds.has(act.id) ? (mediaStageById[act.id] || 'Baixando...') : (mediaFailNoteById[act.id] || describePendingMedia(act.metadata))}
                                            </span>
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => handleManualDownloadMedia(act)}
                                          disabled={downloadingMediaIds.has(act.id)}
                                          title="Sincronizar mídia (API e celular)"
                                          style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            border: isDarkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.12)',
                                            background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                                            color: isDarkMode ? '#d1d7db' : '#54656f',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: downloadingMediaIds.has(act.id) ? 'wait' : 'pointer',
                                            flexShrink: 0,
                                          }}
                                        >
                                          {downloadingMediaIds.has(act.id) ? (
                                            <Loader2 size={16} className="animate-spin" />
                                          ) : (
                                            <Download size={16} />
                                          )}
                                        </button>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: '2px' }}>
                                        <span style={{ fontSize: '0.62rem', color: isDarkMode ? '#8696a0' : '#667781' }}>{formattedTime}</span>
                                      </div>
                                    </div>
                                  ) : isInstagramMsg ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '300px' }}>
                                      <a
                                        href={instagramMsgUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                          display: 'flex',
                                          flexDirection: 'column',
                                          borderRadius: '10px',
                                          overflow: 'hidden',
                                          border: isDarkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.08)',
                                          background: isDarkMode ? '#1e293b' : '#ffffff',
                                          textDecoration: 'none',
                                          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                          transition: 'transform 0.15s ease',
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                                      >
                                        <div style={{
                                          padding: '10px 12px',
                                          background: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          color: '#ffffff'
                                        }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <InstagramIcon size={17} />
                                            <span style={{ fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.01em' }}>Instagram</span>
                                          </div>
                                          <ExternalLink size={14} />
                                        </div>
                                        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>
                                            Publicação ou Reel do Instagram
                                          </span>
                                          <span style={{ fontSize: '0.70rem', color: isDarkMode ? '#94a3b8' : '#64748b', wordBreak: 'break-all', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {instagramMsgUrl}
                                          </span>
                                        </div>
                                      </a>
                                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', paddingRight: '2px' }}>
                                        <span style={{ fontSize: '0.62rem', color: isDarkMode ? '#8696a0' : '#667781' }}>{formattedTime}</span>
                                      </div>
                                    </div>
                                  ) : isAudioMsg ? (
                                    <WhatsAppAudioMessage
                                      src={effectiveMediaUrl}
                                      durationText={effectiveText?.includes('(') ? effectiveText.match(/\((.*?)\)/)?.[1] : undefined}
                                      onBroken={() => markMediaBroken(act.id)}
                                      isIncoming={true}
                                      authorName={peerOfActivity(act).name}
                                      avatarUrl={peerOfActivity(act).avatarUrl}
                                      formattedTime={formattedTime}
                                      isDarkMode={isDarkMode}
                                      status="read"
                                    />
                                  ) : effectiveMediaType === 'image' && effectiveMediaUrl ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <div
                                        style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer' }}
                                        onClick={() => setLightboxMedia({ url: effectiveMediaUrl!, type: 'image', title: act.text || 'Foto' })}
                                      >
                                        <img onError={() => markMediaBroken(act.id)}
                                          src={effectiveMediaUrl}
                                          alt={act.text || 'Foto'}
                                          style={{
                                            maxWidth: '340px',
                                            maxHeight: '380px',
                                            width: '100%',
                                            height: 'auto',
                                            borderRadius: '8px',
                                            objectFit: 'contain',
                                            display: 'block',
                                            background: 'rgba(0,0,0,0.05)',
                                          }}
                                        />
                                        {/* Selo translúcido de hora no canto inferior direito */}
                                        <div style={{
                                          position: 'absolute',
                                          bottom: '6px',
                                          right: '6px',
                                          padding: '2px 7px',
                                          borderRadius: '10px',
                                          background: 'rgba(0, 0, 0, 0.45)',
                                          backdropFilter: 'blur(4px)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          color: '#ffffff',
                                          fontSize: '0.62rem',
                                          fontWeight: 500,
                                        }}>
                                          <span>{formattedTime}</span>
                                        </div>
                                      </div>
                                      {act.text && act.text !== '📷 Foto' && (
                                        <div style={{ fontSize: '0.84rem', lineHeight: 1.4, color: isDarkMode ? '#e9edef' : '#111b21', padding: '2px 4px' }}>
                                          {renderFormattedTextWithLinks(act.text, isDarkMode)}
                                        </div>
                                      )}
                                    </div>
                                  ) : act.mediaType === 'video' && act.mediaUrl ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <div
                                        onClick={() => setLightboxMedia({ url: act.mediaUrl!, type: 'video', title: act.text || 'Vídeo' })}
                                        style={{ position: 'relative', cursor: 'pointer', maxWidth: '280px', maxHeight: '240px', borderRadius: '8px', overflow: 'hidden', background: '#000' }}
                                      >
                                        <video src={act.mediaUrl} style={{ width: '100%', maxHeight: '240px', objectFit: 'cover', display: 'block' }} />
                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                                          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
                                            <Play size={20} style={{ marginLeft: '3px' }} fill="#fff" />
                                          </div>
                                        </div>
                                        {/* Selo translúcido de hora no canto inferior direito */}
                                        <div style={{
                                          position: 'absolute',
                                          bottom: '6px',
                                          right: '6px',
                                          padding: '2px 7px',
                                          borderRadius: '10px',
                                          background: 'rgba(0, 0, 0, 0.45)',
                                          backdropFilter: 'blur(4px)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          color: '#ffffff',
                                          fontSize: '0.62rem',
                                          fontWeight: 500,
                                        }}>
                                          <span>{formattedTime}</span>
                                        </div>
                                      </div>
                                      {act.text && act.text !== '🎥 Vídeo' && (
                                        <div style={{ fontSize: '0.84rem', lineHeight: 1.4, color: isDarkMode ? '#e9edef' : '#111b21', padding: '2px 4px' }}>
                                          {renderFormattedTextWithLinks(act.text, isDarkMode)}
                                        </div>
                                      )}
                                    </div>
                                  ) : act.mediaType === 'document' && act.mediaUrl ? (
                                    <WhatsAppDocumentMessage
                                      url={act.mediaUrl}
                                      filename={act.text}
                                      isIncoming={true}
                                      formattedTime={formattedTime}
                                      isDarkMode={isDarkMode}
                                      status="read"
                                    />
                                  ) : isContactMsg ? (
                                    <WhatsAppContactMessage
                                      contactName={(act.metadata as any)?.contactName || act.text?.replace(/^👤 Contato:\s*/i, '').replace(/\s*\([^)]*\)$/, '') || 'Contato'}
                                      contactPhone={(act.metadata as any)?.contactPhone || act.text?.match(/\(([^)]+)\)$/)?.[1] || ''}
                                      isIncoming={true}
                                      formattedTime={formattedTime}
                                      isDarkMode={isDarkMode}
                                      onCreateLead={() => handleCreateLeadFromContactCard(
                                        (act.metadata as any)?.contactName || act.text?.replace(/^👤 Contato:\s*/i, '').replace(/\s*\([^)]*\)$/, '') || 'Contato',
                                        (act.metadata as any)?.contactPhone || act.text?.match(/\(([^)]+)\)$/)?.[1] || ''
                                      )}
                                      onSaveContact={() => handleSaveContactFromCard(
                                        (act.metadata as any)?.contactName || act.text?.replace(/^👤 Contato:\s*/i, '').replace(/\s*\([^)]*\)$/, '') || 'Contato',
                                        (act.metadata as any)?.contactPhone || act.text?.match(/\(([^)]+)\)$/)?.[1] || ''
                                      )}
                                    />
                                  ) : (
                                    <div style={{ fontSize: '0.84rem', lineHeight: 1.45, whiteSpace: 'pre-wrap', color: isDarkMode ? '#e9edef' : '#111b21', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '8px' }}>
                                      {Boolean(
                                        (act.text && (act.text.includes('[Undecryptable]') || act.text.toLowerCase().includes('não foi possível descriptografar'))) ||
                                        (act.title && (act.title.includes('[Undecryptable]') || act.title.toLowerCase().includes('não foi possível descriptografar')))
                                      ) ? (
                                        <div style={{
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '6px',
                                          padding: '6px 8px',
                                          borderRadius: '8px',
                                          background: isDarkMode ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.08)',
                                          border: '1px solid rgba(245, 158, 11, 0.35)',
                                          minWidth: '220px',
                                          maxWidth: '310px',
                                        }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Lock size={13} color="#F59E0B" />
                                            <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#F59E0B' }}>
                                              Criptografia Ponta a Ponta
                                            </span>
                                          </div>
                                          <div style={{ fontSize: '0.72rem', lineHeight: 1.35, color: isDarkMode ? '#e2e8f0' : '#334155' }}>
                                            Não foi possível descriptografar esta mensagem no momento da recepção. Abra o WhatsApp no celular para sincronizar as chaves.
                                          </div>
                                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '2px', paddingTop: '4px', borderTop: '1px dashed rgba(245, 158, 11, 0.25)' }}>
                                            <button
                                              type="button"
                                              onClick={() => selectedLead && handleResyncUndecryptable(selectedLead)}
                                              disabled={Boolean(selectedLead && resyncingLeadIds.has(selectedLead.id))}
                                              style={{
                                                background: 'rgba(245, 158, 11, 0.18)',
                                                border: '1px solid rgba(245, 158, 11, 0.45)',
                                                borderRadius: '6px',
                                                padding: '3px 8px',
                                                color: isDarkMode ? '#FDE68A' : '#B45309',
                                                fontSize: '0.66rem',
                                                fontWeight: 700,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                cursor: selectedLead && resyncingLeadIds.has(selectedLead.id) ? 'wait' : 'pointer',
                                              }}
                                            >
                                              <RotateCcw size={10} className={selectedLead && resyncingLeadIds.has(selectedLead.id) ? 'animate-spin' : ''} />
                                              <span>{selectedLead && resyncingLeadIds.has(selectedLead.id) ? 'Sincronizando...' : 'Sincronizar mensagem'}</span>
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <span>{renderFormattedTextWithLinks(act.text || act.title, isDarkMode)}</span>
                                      )}
                                      {isSameAsPrev && (
                                        <span style={{ fontSize: '0.60rem', color: isDarkMode ? '#8696a0' : '#667781', flexShrink: 0 }}>{formattedTime}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Botão de Responder Mensagem no Hover do Balão do Lead */}
                              {hoveredMsgId === act.id && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReplyingToMessage(act);
                                  }}
                                  title="Responder esta mensagem"
                                  style={{
                                    background: isDarkMode ? '#202c33' : '#ffffff',
                                    border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #d1d7db',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
                                    borderRadius: '50%',
                                    width: '28px',
                                    height: '28px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: isDarkMode ? '#8696a0' : '#54656f',
                                    flexShrink: 0,
                                    marginBottom: '4px',
                                    transition: 'all 0.15s ease',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.color = '#25d366';
                                    e.currentTarget.style.transform = 'scale(1.1)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.color = isDarkMode ? '#8696a0' : '#54656f';
                                    e.currentTarget.style.transform = 'scale(1)';
                                  }}
                                >
                                  <Reply size={14} />
                                </button>
                              )}
                            </div>
                          </React.Fragment>
                        );
                      }

                      // Balão à Direita (Usuário Logado no F5 ou WhatsApp Celular/Web Oficial)
                      const isExternalWa = act.authorName === 'WhatsApp App / Web' ||
                        act.authorId === 'whatsapp_mobile' ||
                        act.authorAvatarUrl === 'whatsapp_brand' ||
                        act.title?.toLowerCase().includes('celular') ||
                        act.title?.toLowerCase().includes('web');

                      const authorAvatar = isExternalWa ? undefined : (act.authorAvatarUrl || currentUser?.avatarUrl);
                      const authorName = isExternalWa ? 'WhatsApp App / Web' : (act.authorName || currentUser?.name || 'Você');
                      const isFailedMsg = act.status === 'failed' || Boolean(act.errorMessage);

                      // Identificação da Instância de WhatsApp que disparou a mensagem internamente
                      const meta = (act as any).metadata;

                      // 1. Tenta encontrar a source pelo ID gravado nos metadados da mensagem
                      const matchedSourceById = meta?.senderSourceId 
                        ? (sources || []).find(s => s.id === meta.senderSourceId) 
                        : null;

                      // 2. Se não houver nos metadados, busca pela sourceId do lead (se for WhatsApp)
                      const leadSource = (sources || []).find(s => s.type === 'whatsapp_api' && s.id === selectedLead?.sourceId);

                      // 3. Fallback para a instância de envio ativa no chat ou a primeira da casa do lead
                      const leadVenueWa = (sources || []).find(s => s.type === 'whatsapp_api' && s.venueId === selectedLead?.venueId);
                      const resolvedSource = matchedSourceById || leadSource || activeSenderSource || leadVenueWa;

                      const cleanSourceInfo = resolvedSource ? getSourceCleanLabel(resolvedSource) : null;
                      const displayedSenderName = meta?.senderSourceName || cleanSourceInfo?.cleanName || resolvedSource?.name || 'WhatsApp Comercial';

                      const rawPhone = meta?.senderPhone || 
                        (resolvedSource?.configuration as any)?.connectedPhone || 
                        (resolvedSource?.configuration as any)?.whatsappNumber || 
                        resolvedSource?.whatsappInstanceId || '';
                      const displayedSenderPhone = formatPhone(rawPhone) || cleanSourceInfo?.formattedPhone || rawPhone;

                      const displayedSenderAvatar = meta?.senderAvatar || (resolvedSource ? getSourceAvatar(resolvedSource) : undefined);

                      return (
                        <React.Fragment key={act.id}>
                          {renderDateDivider()}
                          <div
                            id={`msg-${act.id}`}
                            onMouseEnter={() => setHoveredMsgId(act.id)}
                            onMouseLeave={() => setHoveredMsgId(null)}
                            style={{
                              alignSelf: 'flex-end',
                              maxWidth: '85%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: '8px',
                              margin: isSameAsPrev ? '1px 0' : '6px 0 1px 0',
                            }}
                          >
                            {/* Hover à Esquerda da Mensagem Enviada: Identifica exatamente qual WhatsApp da empresa efetuou o disparo */}
                            <div
                              style={{
                                opacity: hoveredMsgId === act.id ? 1 : 0,
                                visibility: hoveredMsgId === act.id ? 'visible' : 'hidden',
                                transition: 'opacity 0.16s ease-in-out',
                                pointerEvents: hoveredMsgId === act.id ? 'auto' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                                border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.07)',
                                color: 'var(--adm-text-muted)',
                                fontSize: '0.68rem',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                userSelect: 'none',
                                boxShadow: isDarkMode ? '0 1px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.06)',
                              }}
                              title={`${isExternalWa ? 'WhatsApp App / Web • ' : ''}Disparado por ${displayedSenderName}${displayedSenderPhone ? ` (${displayedSenderPhone})` : ''}`}
                            >
                              <span style={{ color: 'var(--adm-text-muted)', fontWeight: 500 }}>
                                <ArrowUp size={13} aria-label="Disparado por" />
                              </span>

                              {displayedSenderAvatar ? (
                                <img
                                  src={displayedSenderAvatar}
                                  alt={displayedSenderName}
                                  style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                                />
                              ) : (
                                <div style={{
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '50%',
                                  background: '#25D366',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}>
                                  <WhatsAppBrandIcon size={10} color="#FFFFFF" />
                                </div>
                              )}

                              <span>
                                {isExternalWa && (
                                  <span style={{ fontWeight: 600, color: '#10B981', marginRight: '4px' }}>
                                    App/Web •
                                  </span>
                                )}
                                <strong style={{ color: isDarkMode ? 'var(--adm-text-title)' : '#1e293b' }}>
                                  {displayedSenderName}
                                </strong>
                                {displayedSenderPhone && (
                                  <span style={{ opacity: 0.85, marginLeft: '4px' }}>
                                    • {displayedSenderPhone}
                                  </span>
                                )}
                              </span>
                            </div>

                            {/* Botão de Responder Mensagem no Hover do Balão Enviado */}
                            {hoveredMsgId === act.id && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReplyingToMessage(act);
                                }}
                                title="Responder esta mensagem"
                                style={{
                                  background: isDarkMode ? '#202c33' : '#ffffff',
                                  border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #d1d7db',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
                                  borderRadius: '50%',
                                  width: '28px',
                                  height: '28px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  color: isDarkMode ? '#8696a0' : '#54656f',
                                  flexShrink: 0,
                                  transition: 'all 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = '#25d366';
                                  e.currentTarget.style.transform = 'scale(1.1)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = isDarkMode ? '#8696a0' : '#54656f';
                                  e.currentTarget.style.transform = 'scale(1)';
                                }}
                              >
                                <Reply size={14} />
                              </button>
                            )}

                            {/* Conteúdo: Sticker Solto vs Balão Clássico */}
                            {isSticker && act.mediaUrl ? (
                              <div
                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', cursor: 'pointer' }}
                                onClick={() => setLightboxMedia({ url: act.mediaUrl!, type: 'image', title: 'Figurinha' })}
                              >
                                <img
                                  src={act.mediaUrl}
                                  alt="Figurinha"
                                  style={{ maxWidth: '140px', maxHeight: '140px', objectFit: 'contain', background: 'transparent' }}
                                />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ fontSize: '0.62rem', color: isDarkMode ? '#8696a0' : '#667781' }}>{formattedTime}</span>
                                  <CheckCircle2 size={11} color="#53bdeb" />
                                </div>
                              </div>
                            ) : (
                              <div 
                                onDoubleClick={() => setReplyingToMessage(act)}
                                title={isExternalWa ? `Duplo clique para responder • Enviada via WhatsApp (${displayedSenderName}${displayedSenderPhone ? ` • ${displayedSenderPhone}` : ''})` : "Duplo clique para responder"}
                                style={{
                                  background: isFailedMsg
                                    ? (isDarkMode ? 'rgba(239, 68, 68, 0.22)' : '#fee2e2')
                                    : (isDarkMode ? '#005c4b' : '#d9fdd3'),
                                  border: isFailedMsg
                                    ? (isDarkMode ? '1.5px solid #EF4444' : '1.5px solid #ef4444')
                                    : (isDarkMode ? '1px solid rgba(255, 255, 255, 0.06)' : 'none'),
                                  borderRadius: isSameAsPrev ? '12px' : '14px 14px 2px 14px',
                                  padding: '7px 11px',
                                  color: isDarkMode ? '#e9edef' : '#111b21',
                                  boxShadow: isFailedMsg
                                    ? '0 2px 10px rgba(239, 68, 68, 0.3)'
                                    : (isDarkMode ? '0 1px 2px rgba(0,0,0,0.3)' : '0 1px 0.5px rgba(11,20,26,.13)'),
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '4px',
                                  position: 'relative',
                                  maxWidth: (act.mediaType === 'image' || effectiveMediaType === 'image') && (act.mediaUrl || effectiveMediaUrl) ? '340px' : undefined,
                                  width: (act.mediaType === 'image' || effectiveMediaType === 'image') && (act.mediaUrl || effectiveMediaUrl) ? 'fit-content' : undefined,
                                }}
                              >
                                {Boolean((act as any)?.metadata?.isForwarded || (act as any)?.isForwarded) && (
                                  <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.66rem',
                                    fontStyle: 'italic',
                                    color: isDarkMode ? '#aebac1' : '#667781',
                                    marginBottom: '3px',
                                    userSelect: 'none',
                                  }}>
                                    <Forward size={12} style={{ transform: 'scaleX(-1)' }} />
                                    <span>Encaminhada</span>
                                  </div>
                                )}
                                {!isSameAsPrev && (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginBottom: '2px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span 
                                        title={isExternalWa ? `App/Web • ${displayedSenderName}${displayedSenderPhone ? ` • ${displayedSenderPhone}` : ''}` : undefined}
                                        style={{ fontSize: '0.72rem', fontWeight: 800, color: isFailedMsg ? '#EF4444' : (isDarkMode ? '#d9fdd3' : '#008069'), cursor: isExternalWa ? 'help' : 'default' }}
                                      >
                                        {authorName}
                                      </span>
                                      {Boolean((act as any).channelName || meta?.channelName) && (
                                        <span style={{
                                          fontSize: '0.62rem',
                                          fontWeight: 700,
                                          padding: '1px 5px',
                                          borderRadius: '4px',
                                          background: isDarkMode ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.12)',
                                          color: isDarkMode ? '#93c5fd' : '#2563eb',
                                          border: '1px solid rgba(59, 130, 246, 0.3)',
                                        }}>
                                          {(act as any).channelName || meta?.channelName}
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
                                      <span style={{ fontSize: '0.62rem', color: isFailedMsg ? '#EF4444' : (isDarkMode ? '#8696a0' : '#667781') }}>
                                        {formattedTime}
                                      </span>
                                      {isFailedMsg ? (
                                        <AlertCircle size={13} color="#EF4444" />
                                      ) : (
                                        <CheckCircle2 size={11} color="#53bdeb" />
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Citação da Mensagem Respondida (Quote Box no topo do balão) */}
                                {act.quotedMessage && (
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleScrollToQuotedMessage(act.quotedMessage?.id || act.quotedMessage?.messageId);
                                    }}
                                    title="Clique para ir até a mensagem respondida"
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      padding: '5px 8px',
                                      borderRadius: '6px',
                                      background: isDarkMode ? 'rgba(0, 0, 0, 0.28)' : 'rgba(0, 0, 0, 0.06)',
                                      borderLeft: '4px solid #25d366',
                                      cursor: 'pointer',
                                      marginBottom: '4px',
                                      overflow: 'hidden',
                                      transition: 'background 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = isDarkMode ? 'rgba(0, 0, 0, 0.42)' : 'rgba(0, 0, 0, 0.1)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = isDarkMode ? 'rgba(0, 0, 0, 0.28)' : 'rgba(0, 0, 0, 0.06)'; }}
                                  >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden', flex: 1 }}>
                                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#25d366', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {act.quotedMessage.sender || 'Mensagem'}
                                      </span>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: isDarkMode ? '#aebac1' : '#54656f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {act.quotedMessage.type === 'audio' && <Mic size={13} color="#25d366" />}
                                        {act.quotedMessage.type === 'image' && <Camera size={13} color="#8696a0" />}
                                        {act.quotedMessage.type === 'video' && <Video size={13} color="#8696a0" />}
                                        {act.quotedMessage.type === 'document' && <FileText size={13} color="#8696a0" />}
                                        <span>
                                          {act.quotedMessage.type === 'audio'
                                            ? (act.quotedMessage.audioDuration || '0:04')
                                            : (act.quotedMessage.text || 'Mídia')}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Conteúdo: Instagram Card, Áudio Player, Foto, Vídeo, Documento ou Texto */}
                                {needsMediaRecovery ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                    <div onClick={() => handleManualDownloadMedia(act)} title="Toque para sincronizar (API e celular)" style={{ cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: '12px',
                                      padding: '8px 12px',
                                      borderRadius: '10px',
                                      background: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.04)',
                                      minWidth: '220px',
                                      maxWidth: '290px',
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                        <div style={{
                                          width: '34px',
                                          height: '34px',
                                          borderRadius: '50%',
                                          background: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          color: isDarkMode ? '#8696a0' : '#64748b',
                                          flexShrink: 0,
                                        }}>
                                          {isAudioMsg ? <Mic size={18} /> : (effectiveMediaType === 'image' || act.mediaType === 'image') ? <Camera size={18} /> : (effectiveMediaType === 'video' || act.mediaType === 'video') ? <Video size={18} /> : <FileText size={18} />}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                                          <span style={{ fontSize: '0.80rem', fontWeight: 600, color: isDarkMode ? '#e9edef' : '#111b21', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                            {isAudioMsg ? 'Mensagem de voz' : (effectiveMediaType === 'image' || act.mediaType === 'image') ? 'Foto' : (effectiveMediaType === 'video' || act.mediaType === 'video') ? 'Vídeo' : (act.text || 'Documento')}
                                          </span>
                                          <span style={{ fontSize: '0.67rem', color: isDarkMode ? '#8696a0' : '#64748b' }}>
                                            {downloadingMediaIds.has(act.id) ? (mediaStageById[act.id] || 'Baixando...') : (mediaFailNoteById[act.id] || describePendingMedia(act.metadata))}
                                          </span>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleManualDownloadMedia(act)}
                                        disabled={downloadingMediaIds.has(act.id)}
                                        title="Baixar mídia"
                                        style={{
                                          width: '32px',
                                          height: '32px',
                                          borderRadius: '50%',
                                          border: isDarkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.12)',
                                          background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                                          color: isDarkMode ? '#d1d7db' : '#54656f',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          cursor: downloadingMediaIds.has(act.id) ? 'wait' : 'pointer',
                                          flexShrink: 0,
                                        }}
                                      >
                                        {downloadingMediaIds.has(act.id) ? (
                                          <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                          <Download size={16} />
                                        )}
                                      </button>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', paddingRight: '2px' }}>
                                      <span style={{ fontSize: '0.62rem', color: isDarkMode ? '#8696a0' : '#667781' }}>{formattedTime}</span>
                                      <CheckCircle2 size={11} color="#53bdeb" />
                                    </div>
                                  </div>
                                ) : isInstagramMsg ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '300px' }}>
                                    <a
                                      href={instagramMsgUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        borderRadius: '10px',
                                        overflow: 'hidden',
                                        border: isDarkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.08)',
                                        background: isDarkMode ? '#1e293b' : '#ffffff',
                                        textDecoration: 'none',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                        transition: 'transform 0.15s ease',
                                      }}
                                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                                    >
                                      <div style={{
                                        padding: '10px 12px',
                                        background: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        color: '#ffffff'
                                      }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <InstagramIcon size={17} />
                                          <span style={{ fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.01em' }}>Instagram</span>
                                        </div>
                                        <ExternalLink size={14} />
                                      </div>
                                      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>
                                          Publicação ou Reel do Instagram
                                        </span>
                                        <span style={{ fontSize: '0.70rem', color: isDarkMode ? '#94a3b8' : '#64748b', wordBreak: 'break-all', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                          {instagramMsgUrl}
                                        </span>
                                      </div>
                                    </a>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', paddingRight: '2px' }}>
                                      <span style={{ fontSize: '0.62rem', color: isDarkMode ? '#8696a0' : '#667781' }}>{formattedTime}</span>
                                      {isFailedMsg ? (
                                        <AlertCircle size={13} color="#EF4444" />
                                      ) : (
                                        <CheckCircle2 size={11} color="#53bdeb" />
                                      )}
                                    </div>
                                  </div>
                                ) : isAudioMsg ? (
                                  <WhatsAppAudioMessage
                                    src={effectiveMediaUrl}
                                    durationText={effectiveText?.includes('(') ? effectiveText.match(/\((.*?)\)/)?.[1] : undefined}
                                    onBroken={() => markMediaBroken(act.id)}
                                    isIncoming={false}
                                    authorName={authorName}
                                    avatarUrl={authorAvatar}
                                    formattedTime={formattedTime}
                                    isDarkMode={isDarkMode}
                                    status={act.status === 'failed' ? 'failed' : 'read'}
                                  />
                                ) : (act.mediaType === 'image' || effectiveMediaType === 'image') && (act.mediaUrl || effectiveMediaUrl) ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div
                                      style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer' }}
                                      onClick={() => setLightboxMedia({ url: (act.mediaUrl || effectiveMediaUrl)!, type: 'image', title: act.text || 'Foto' })}
                                    >
                                      <img onError={() => markMediaBroken(act.id)}
                                        src={act.mediaUrl || effectiveMediaUrl}
                                        alt={act.text || 'Foto'}
                                        style={{
                                          maxWidth: '340px',
                                          maxHeight: '380px',
                                          width: '100%',
                                          height: 'auto',
                                          borderRadius: '8px',
                                          objectFit: 'contain',
                                          display: 'block',
                                          background: 'rgba(0,0,0,0.05)',
                                        }}
                                      />
                                      {/* Selo translúcido de hora no canto inferior direito */}
                                      <div style={{
                                        position: 'absolute',
                                        bottom: '6px',
                                        right: '6px',
                                        padding: '2px 7px',
                                        borderRadius: '10px',
                                        background: 'rgba(0, 0, 0, 0.45)',
                                        backdropFilter: 'blur(4px)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        color: '#ffffff',
                                        fontSize: '0.62rem',
                                        fontWeight: 500,
                                      }}>
                                        <span>{formattedTime}</span>
                                        <CheckCircle2 size={11} color="#53bdeb" />
                                      </div>
                                    </div>
                                    {act.text && act.text !== '📷 Foto' && (
                                      <div style={{ fontSize: '0.84rem', lineHeight: 1.4, color: isDarkMode ? '#e9edef' : '#111b21', padding: '2px 4px' }}>
                                        {renderFormattedTextWithLinks(act.text, isDarkMode)}
                                      </div>
                                    )}
                                  </div>
                                ) : act.mediaType === 'video' && act.mediaUrl ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div
                                      onClick={() => setLightboxMedia({ url: act.mediaUrl!, type: 'video', title: act.text || 'Vídeo' })}
                                      style={{ position: 'relative', cursor: 'pointer', maxWidth: '280px', maxHeight: '240px', borderRadius: '8px', overflow: 'hidden', background: '#000' }}
                                    >
                                      <video src={act.mediaUrl} style={{ width: '100%', maxHeight: '240px', objectFit: 'cover', display: 'block' }} />
                                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                                        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
                                          <Play size={20} style={{ marginLeft: '3px' }} fill="#fff" />
                                        </div>
                                      </div>
                                      {/* Selo translúcido de hora no canto inferior direito */}
                                      <div style={{
                                        position: 'absolute',
                                        bottom: '6px',
                                        right: '6px',
                                        padding: '2px 7px',
                                        borderRadius: '10px',
                                        background: 'rgba(0, 0, 0, 0.45)',
                                        backdropFilter: 'blur(4px)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        color: '#ffffff',
                                        fontSize: '0.62rem',
                                        fontWeight: 500,
                                      }}>
                                        <span>{formattedTime}</span>
                                        <CheckCircle2 size={11} color="#53bdeb" />
                                      </div>
                                    </div>
                                    {act.text && act.text !== '🎥 Vídeo' && (
                                      <div style={{ fontSize: '0.84rem', lineHeight: 1.4, color: isDarkMode ? '#e9edef' : '#111b21', padding: '2px 4px' }}>
                                        {renderFormattedTextWithLinks(act.text, isDarkMode)}
                                      </div>
                                    )}
                                  </div>
                                ) : act.mediaType === 'document' && act.mediaUrl ? (
                                  <WhatsAppDocumentMessage
                                    url={act.mediaUrl}
                                    filename={act.text}
                                    isIncoming={false}
                                    formattedTime={formattedTime}
                                    isDarkMode={isDarkMode}
                                    status={act.status === 'failed' ? 'failed' : 'read'}
                                  />
                                ) : isContactMsg ? (
                                  <WhatsAppContactMessage
                                    contactName={(act.metadata as any)?.contactName || act.text?.replace(/^👤 Contato:\s*/i, '').replace(/\s*\([^)]*\)$/, '') || 'Contato'}
                                    contactPhone={(act.metadata as any)?.contactPhone || act.text?.match(/\(([^)]+)\)$/)?.[1] || ''}
                                    isIncoming={false}
                                    formattedTime={formattedTime}
                                    isDarkMode={isDarkMode}
                                    status={act.status === 'failed' ? 'failed' : 'read'}
                                  />
                                ) : (
                                  <div style={{ fontSize: '0.84rem', lineHeight: 1.45, whiteSpace: 'pre-wrap', color: isDarkMode ? '#e9edef' : '#111b21', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '8px' }}>
                                    {Boolean(
                                      (act.text && (act.text.includes('[Undecryptable]') || act.text.toLowerCase().includes('não foi possível descriptografar'))) ||
                                      (act.title && (act.title.includes('[Undecryptable]') || act.title.toLowerCase().includes('não foi possível descriptografar')))
                                    ) ? (
                                      <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px',
                                        padding: '6px 8px',
                                        borderRadius: '8px',
                                        background: isDarkMode ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.08)',
                                        border: '1px solid rgba(245, 158, 11, 0.35)',
                                        minWidth: '220px',
                                        maxWidth: '310px',
                                      }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <Lock size={13} color="#F59E0B" />
                                          <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#F59E0B' }}>
                                            Criptografia Ponta a Ponta
                                          </span>
                                        </div>
                                        <div style={{ fontSize: '0.72rem', lineHeight: 1.35, color: isDarkMode ? '#e2e8f0' : '#334155' }}>
                                          Não foi possível descriptografar esta mensagem no momento do envio. Abra o WhatsApp no celular para sincronizar as chaves.
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '2px', paddingTop: '4px', borderTop: '1px dashed rgba(245, 158, 11, 0.25)' }}>
                                          <button
                                            type="button"
                                            onClick={() => selectedLead && handleResyncUndecryptable(selectedLead)}
                                            disabled={Boolean(selectedLead && resyncingLeadIds.has(selectedLead.id))}
                                            style={{
                                              background: 'rgba(245, 158, 11, 0.18)',
                                              border: '1px solid rgba(245, 158, 11, 0.45)',
                                              borderRadius: '6px',
                                              padding: '3px 8px',
                                              color: isDarkMode ? '#FDE68A' : '#B45309',
                                              fontSize: '0.66rem',
                                              fontWeight: 700,
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '4px',
                                              cursor: selectedLead && resyncingLeadIds.has(selectedLead.id) ? 'wait' : 'pointer',
                                            }}
                                          >
                                            <RotateCcw size={10} className={selectedLead && resyncingLeadIds.has(selectedLead.id) ? 'animate-spin' : ''} />
                                            <span>{selectedLead && resyncingLeadIds.has(selectedLead.id) ? 'Sincronizando...' : 'Sincronizar mensagem'}</span>
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <span>{renderFormattedTextWithLinks(act.text || act.title, isDarkMode)}</span>
                                    )}
                                    {isSameAsPrev && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                                        <span style={{ fontSize: '0.60rem', color: isFailedMsg ? '#EF4444' : (isDarkMode ? '#8696a0' : '#667781') }}>{formattedTime}</span>
                                        {isFailedMsg ? (
                                          <AlertCircle size={10} color="#EF4444" />
                                        ) : (
                                          <CheckCircle2 size={10} color="#53bdeb" />
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Card de Falha e Ação Direta para Tentar Novamente */}
                                {isFailedMsg && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      marginTop: '6px',
                                      padding: '8px 10px',
                                      borderRadius: '8px',
                                      background: isDarkMode ? 'rgba(0, 0, 0, 0.45)' : 'rgba(255, 255, 255, 0.85)',
                                      border: '1px solid rgba(239, 68, 68, 0.45)',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '6px',
                                      textAlign: 'left',
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <AlertCircle size={12} /> Falha no Envio
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const errText = act.errorMessage || 'Falha ao enviar mensagem no WhatsApp.';
                                          navigator.clipboard.writeText(errText);
                                          setCopiedErrorId(act.id);
                                          setTimeout(() => setCopiedErrorId(null), 2000);
                                        }}
                                        title="Copiar mensagem do erro"
                                        style={{
                                          background: 'rgba(239, 68, 68, 0.15)',
                                          border: '1px solid rgba(239, 68, 68, 0.3)',
                                          color: isDarkMode ? '#FCA5A5' : '#DC2626',
                                          borderRadius: '5px',
                                          padding: '2px 6px',
                                          fontSize: '0.62rem',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '3px',
                                        }}
                                      >
                                        {copiedErrorId === act.id ? <Check size={10} color="#10B981" /> : <Copy size={10} />}
                                        <span>{copiedErrorId === act.id ? 'Copiado' : 'Copiar'}</span>
                                      </button>
                                    </div>

                                    <div style={{ fontSize: '0.70rem', color: isDarkMode ? '#FCA5A5' : '#991B1B', lineHeight: 1.35, wordBreak: 'break-word', fontWeight: 500 }}>
                                      {act.errorMessage || 'A API do WhatsApp não confirmou o envio desta mensagem.'}
                                    </div>

                                    <button
                                      type="button"
                                      disabled={retryingMessageId === act.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRetryMessage(act);
                                      }}
                                      style={{
                                        width: '100%',
                                        background: '#EF4444',
                                        border: 'none',
                                        color: '#FFFFFF',
                                        borderRadius: '6px',
                                        padding: '7px 10px',
                                        fontSize: '0.72rem',
                                        fontWeight: 800,
                                        cursor: retryingMessageId === act.id ? 'wait' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        boxShadow: '0 2px 4px rgba(239, 68, 68, 0.35)',
                                        opacity: retryingMessageId === act.id ? 0.7 : 1,
                                        transition: 'all 0.15s ease',
                                      }}
                                    >
                                      <RefreshCw size={11} className={retryingMessageId === act.id ? 'animate-spin' : ''} />
                                      <span>{retryingMessageId === act.id ? 'Reenviando...' : 'Tentar Novamente'}</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Avatar do Autor: Se for WhatsApp App / Web Oficial externo, exibe ícone oficial do WhatsApp */}
                            {!isSameAsNext ? (
                              isExternalWa ? (
                                <div
                                  title={`Mensagem enviada pelo celular ou WhatsApp Web (${displayedSenderName})`}
                                  style={{
                                    width: '30px',
                                    height: '30px',
                                    borderRadius: '50%',
                                    background: '#25D366',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    border: '1.5px solid #25D366',
                                    boxShadow: '0 2px 6px rgba(37, 211, 102, 0.35)',
                                  }}
                                >
                                  <WhatsAppBrandIcon size={16} color="#FFFFFF" />
                                </div>
                              ) : (
                                <SafeAvatar
                                  src={authorAvatar}
                                  name={authorName}
                                  size={30}
                                  border="1.5px solid #00a884"
                                />
                              )
                            ) : (
                              <div style={{ width: '30px', flexShrink: 0 }} />
                            )}
                          </div>
                        </React.Fragment>
                      );
                    })
                  )}

                  {/* Balão animado de Digitação do Cliente (Lead) */}
                  {(customerPresence.isTyping || customerPresence.isRecording) && (
                    <div
                      style={{
                        alignSelf: 'flex-start',
                        maxWidth: '75%',
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: '8px',
                        margin: '4px 0',
                      }}
                    >
                      <SafeAvatar
                        src={chatPeer.avatarUrl}
                        name={chatPeer.name}
                        size={30}
                        border={isDarkMode ? '1.5px solid var(--adm-border)' : '1.5px solid rgba(0,0,0,0.1)'}
                      />
                      <div style={{
                        background: isDarkMode ? '#202c33' : '#ffffff',
                        border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
                        borderRadius: '14px 14px 14px 2px',
                        padding: '8px 14px',
                        color: isDarkMode ? '#8696a0' : '#667781',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.25)' : '0 1px 0.5px rgba(11,20,26,.13)',
                      }}>
                        {customerPresence.isRecording ? (
                          <>
                            <Mic size={14} color="#00a884" />
                            <span style={{ fontSize: '0.78rem', color: '#00a884', fontWeight: 600 }}>gravando áudio...</span>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: '0.78rem', color: isDarkMode ? '#8696a0' : '#667781', fontWeight: 600 }}>digitando</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#00a884', display: 'inline-block' }} />
                              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#00a884', display: 'inline-block' }} />
                              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#00a884', display: 'inline-block' }} />
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* 2. ABA HISTÓRICO: Exibe lista de anotações internas e ações do sistema (sem mensagens do cliente) */}
              {composerTab === 'notes' && (
                historyActivities.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--adm-text-muted)' }}>
                    <FileText size={36} style={{ opacity: 0.3, marginBottom: '8px' }} />
                    <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>Nenhum histórico registrado</div>
                    <div style={{ fontSize: '0.74rem', marginTop: '4px' }}>Registre anotações privadas da equipe sobre este lead abaixo.</div>
                  </div>
                ) : (
                  historyActivities.map((act, idx) => {
                    // Identifica se é nota advinda de Follow-up / Tarefa
                    const isTaskOrFollowUpNote = Boolean(
                      act.type === 'task_completed' ||
                      act.type === 'task_created' ||
                      (act as any).customProperties?.isFollowUp ||
                      (act as any).customProperties?.taskId ||
                      (act as any).taskId ||
                      act.title?.toLowerCase().includes('follow-up') ||
                      act.title?.toLowerCase().includes('tarefa') ||
                      act.title?.toLowerCase().includes('agendamento') ||
                      act.title?.toLowerCase().includes('reagendado')
                    );

                    // Identifica se é ação automática do sistema/auditoria
                    const isAutomaticNote = !isTaskOrFollowUpNote && (
                      act.type !== 'note' ||
                      (Boolean(act.title) && act.title !== 'Nota Interna' && act.title !== 'Observação registrada') ||
                      Boolean((act as any).isAutomatic)
                    );

                    // Identifica se é ação puramente robô/sistema sem colaborador humano
                    const isPureBotOrSystem =
                      act.authorId === 'system_bot' ||
                      (!act.authorId && (!act.authorName || act.authorName.toLowerCase().includes('bot') || act.authorName.toLowerCase() === 'sistema'));

                    // Verifica se foi feita pelo usuário logado
                    const isMine = !isPureBotOrSystem && Boolean(
                      currentUser && (
                        (act.authorId && act.authorId === currentUser.id) ||
                        (act.authorName && currentUser.name && act.authorName.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
                      )
                    );

                    // Nome do autor para exibição
                    const authorDisplayName = act.authorName || (isMine ? currentUser?.name : 'Colaborador') || 'Colaborador';

                    // Foto do autor
                    const authorAvatar = isMine
                      ? (currentUser?.avatarUrl || act.authorAvatarUrl)
                      : act.authorAvatarUrl;

                    // Texto limpo sem redundância do nome
                    const cleanText = cleanActionText(act.text, act.authorName || currentUser?.name, act.title);

                    // Título da nota
                    const titleLabel = isTaskOrFollowUpNote
                      ? `${authorDisplayName} (Resumo Follow-up)`
                      : isAutomaticNote
                        ? `${authorDisplayName} (Nota Automática do Sistema)`
                        : `${authorDisplayName} (Nota Interna)`;

                    // Formatação de data/hora
                    const actDate = new Date(act.timestamp);
                    const timeStr = isNaN(actDate.getTime())
                      ? ''
                      : actDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    const prevAct = idx > 0 ? historyActivities[idx - 1] : null;

                    // Checagem de mudança de data estilo WhatsApp
                    const isDifferentDayFromPrev = (() => {
                      if (idx === 0) return true;
                      if (!prevAct || !prevAct.timestamp || !act.timestamp) return false;
                      const d1 = new Date(prevAct.timestamp);
                      const d2 = new Date(act.timestamp);
                      return d1.getFullYear() !== d2.getFullYear() ||
                        d1.getMonth() !== d2.getMonth() ||
                        d1.getDate() !== d2.getDate();
                    })();

                    const dateDividerText = isDifferentDayFromPrev && act.timestamp ? formatWhatsAppDateDivider(act.timestamp) : '';

                    const renderDateDivider = () => {
                      if (!isDifferentDayFromPrev || !dateDividerText) return null;
                      return (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%',
                            margin: idx === 0 ? '6px 0 14px 0' : '20px 0 14px 0',
                            position: 'relative',
                            userSelect: 'none',
                            zIndex: 2,
                          }}
                        >
                          <div style={{ flex: 1, height: '1px', background: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.07)' }} />
                          <div
                            style={{
                              margin: '0 12px',
                              background: isDarkMode ? '#182229' : '#ffffff',
                              color: isDarkMode ? '#8696a0' : '#54656f',
                              fontSize: '0.70rem',
                              fontWeight: 700,
                              letterSpacing: '0.04em',
                              padding: '4px 14px',
                              borderRadius: '8px',
                              boxShadow: isDarkMode ? '0 1px 3px rgba(0,0,0,0.45)' : '0 1px 2px rgba(11,20,26,0.12)',
                              border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              textTransform: 'uppercase',
                            }}
                          >
                            <span>{dateDividerText}</span>
                          </div>
                          <div style={{ flex: 1, height: '1px', background: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.07)' }} />
                        </div>
                      );
                    };

                    // 1. Caso seja puramente robô/sistema sem colaborador humano
                    if (isPureBotOrSystem) {
                      return (
                        <React.Fragment key={act.id}>
                          {renderDateDivider()}
                          <div
                            style={{
                              alignSelf: 'flex-start',
                              maxWidth: '85%',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '10px',
                              margin: '4px 0',
                            }}
                          >
                            {/* Logo F5 / Bot Avatar */}
                            <div style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              background: '#0F1724',
                              border: '1.5px solid #8B5CF6',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              flexShrink: 0,
                            }}>
                              <img
                                src="/logo_f5.png"
                                alt="F5"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                                style={{ width: '22px', height: '22px', objectFit: 'contain' }}
                              />
                              <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#8B5CF6' }}>F5</span>
                            </div>

                            {/* Balão do Sistema */}
                            <div style={{
                              background: isDarkMode ? 'rgba(139, 92, 246, 0.14)' : 'rgba(139, 92, 246, 0.08)',
                              border: '1.5px solid rgba(139, 92, 246, 0.35)',
                              borderRadius: '14px',
                              borderTopLeftRadius: '3px',
                              padding: '10px 14px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8B5CF6', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <Zap size={12} color="#8B5CF6" />
                                  <span>Bot F5 System (Nota Automática do Sistema)</span>
                                </span>
                                <span style={{ fontSize: '0.62rem', color: 'var(--adm-text-muted)' }}>
                                  {timeStr}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-body)', lineHeight: '1.4' }}>
                                {cleanText}
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    }

                    // 2. Anotação de Usuário (Follow-up / Tarefa, Nota Interna Manual ou Auditoria do Sistema)
                    // Alinhada à DIREITA se for do usuário logado (isMine), e à ESQUERDA se for de outro colaborador
                    // Cores idênticas e perfeitamente legíveis para representar a mesma categoria em ambos os lados
                    const noteThemeColor = isTaskOrFollowUpNote
                      ? '#F59E0B'
                      : isAutomaticNote
                        ? '#8B5CF6'
                        : '#0284C7';

                    const noteBg = isTaskOrFollowUpNote
                      ? (isDarkMode ? 'rgba(245, 158, 11, 0.14)' : 'rgba(245, 158, 11, 0.10)')
                      : isAutomaticNote
                        ? (isDarkMode ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.10)')
                        : (isDarkMode ? 'rgba(2, 132, 199, 0.15)' : 'rgba(2, 132, 199, 0.10)');

                    const noteBorder = isTaskOrFollowUpNote
                      ? '1.5px solid rgba(245, 158, 11, 0.45)'
                      : isAutomaticNote
                        ? '1.5px solid rgba(139, 92, 246, 0.40)'
                        : '1.5px solid rgba(2, 132, 199, 0.35)';

                    return (
                      <React.Fragment key={act.id}>
                        {renderDateDivider()}
                        <div
                          style={{
                            alignSelf: isMine ? 'flex-end' : 'flex-start',
                            maxWidth: '82%',
                            display: 'flex',
                            flexDirection: isMine ? 'row-reverse' : 'row',
                            alignItems: 'flex-start',
                            gap: '10px',
                            margin: '5px 0',
                          }}
                        >
                          {/* Foto / Avatar do Colaborador */}
                          {authorAvatar ? (
                            <img
                              src={authorAvatar}
                              alt={authorDisplayName}
                              style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: `1.5px solid ${noteThemeColor}`,
                                flexShrink: 0,
                              }}
                            />
                          ) : (
                            <div style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              background: isTaskOrFollowUpNote
                                ? 'rgba(245, 158, 11, 0.18)'
                                : isAutomaticNote
                                  ? 'rgba(139, 92, 246, 0.18)'
                                  : 'rgba(2, 132, 199, 0.15)',
                              border: `1.5px solid ${noteThemeColor}`,
                              color: noteThemeColor,
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              {(authorDisplayName || 'U').slice(0, 2).toUpperCase()}
                            </div>
                          )}

                          {/* Balão da Anotação */}
                          <div style={{
                            background: noteBg,
                            border: noteBorder,
                            borderRadius: '14px',
                            borderTopRightRadius: isMine ? '3px' : '14px',
                            borderTopLeftRadius: isMine ? '14px' : '3px',
                            padding: '10px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            boxShadow: isTaskOrFollowUpNote
                              ? '0 2px 8px rgba(245, 158, 11, 0.12)'
                              : isAutomaticNote
                                ? '0 2px 8px rgba(139, 92, 246, 0.12)'
                                : '0 1px 3px rgba(0,0,0,0.05)',
                          }}>
                            {/* Header do Balão: Nome + Tipo de Nota + Botão Ver Tarefa + Horário */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                              <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                color: noteThemeColor,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}>
                                {isTaskOrFollowUpNote ? (
                                  <Calendar size={12} color="#F59E0B" />
                                ) : isAutomaticNote ? (
                                  <Zap size={12} color="#8B5CF6" />
                                ) : (
                                  <FileText size={12} color="#0284C7" />
                                )}
                                <span>{titleLabel}</span>
                              </span>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {isTaskOrFollowUpNote && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (selectedLead) {
                                        setIsInspectorOpen(true);
                                      }
                                    }}
                                    title="Abrir Ficha do Cliente no CRM"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '2px 7px',
                                      borderRadius: '5px',
                                      background: 'rgba(245, 158, 11, 0.18)',
                                      border: '1px solid rgba(245, 158, 11, 0.4)',
                                      color: '#F59E0B',
                                      fontSize: '0.62rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(245, 158, 11, 0.28)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(245, 158, 11, 0.18)')}
                                  >
                                    <CheckSquare size={10} />
                                    <span>Ver Tarefa</span>
                                  </button>
                                )}

                                <span style={{ fontSize: '0.62rem', color: 'var(--adm-text-muted)', whiteSpace: 'nowrap' }}>
                                  {timeStr}
                                </span>
                              </div>
                            </div>

                            {/* Conteúdo da Anotação: Áudio, Imagem, Vídeo, Documento ou Texto */}
                            {act.mediaType === 'audio' || (act.mediaUrl && (act.mediaUrl.startsWith('data:audio') || act.mediaUrl.endsWith('.ogg') || act.mediaUrl.endsWith('.mp3') || act.mediaUrl.endsWith('.opus') || act.mediaUrl.endsWith('.wav') || act.mediaUrl.includes('.ogg?') || act.mediaUrl.includes('.mp3?'))) ? (
                              <div style={{ marginTop: '4px' }}>
                                <WhatsAppAudioMessage
                                  src={act.mediaUrl}
                                  isIncoming={!isMine}
                                  authorName={authorDisplayName}
                                  avatarUrl={authorAvatar}
                                  formattedTime={timeStr}
                                  isDarkMode={isDarkMode}
                                />
                              </div>
                            ) : act.mediaType === 'image' && act.mediaUrl ? (
                              <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <img
                                  src={act.mediaUrl}
                                  alt="Anexo"
                                  onClick={() => setLightboxMedia({ url: act.mediaUrl!, type: 'image', title: act.title || 'Foto em anotação' })}
                                  style={{
                                    maxWidth: '340px',
                                    maxHeight: '340px',
                                    width: '100%',
                                    height: 'auto',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    objectFit: 'contain',
                                    border: '1px solid var(--adm-border)',
                                  }}
                                />
                                {cleanText && (
                                  <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-body)', lineHeight: '1.45', whiteSpace: 'pre-wrap' }}>
                                    {renderFormattedTextWithLinks(cleanText)}
                                  </div>
                                )}
                              </div>
                            ) : act.mediaType === 'video' && act.mediaUrl ? (
                              <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <video
                                  src={act.mediaUrl}
                                  controls
                                  style={{
                                    maxWidth: '300px',
                                    maxHeight: '220px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--adm-border)',
                                  }}
                                />
                                {cleanText && (
                                  <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-body)', lineHeight: '1.45', whiteSpace: 'pre-wrap' }}>
                                    {renderFormattedTextWithLinks(cleanText)}
                                  </div>
                                )}
                              </div>
                            ) : act.mediaType === 'document' && act.mediaUrl ? (
                              <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <a
                                  href={act.mediaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    background: 'var(--adm-bg-card)',
                                    border: '1px solid var(--adm-border)',
                                    color: 'var(--adm-accent, #6366F1)',
                                    textDecoration: 'none',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                  }}
                                >
                                  <FileText size={16} />
                                  <span>{cleanText || 'Visualizar documento anexado'}</span>
                                  <ExternalLink size={12} />
                                </a>
                              </div>
                            ) : (
                              <div style={{
                                fontSize: '0.8rem',
                                color: 'var(--adm-text-body)',
                                lineHeight: '1.45',
                                whiteSpace: 'pre-wrap',
                                fontWeight: isAutomaticNote ? 500 : 400,
                              }}>
                                {renderFormattedTextWithLinks(cleanText)}
                              </div>
                            )}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )
              )}

              {/* Âncora invisível para rolagem automática até o final da conversa */}
              <div ref={messagesEndRef} style={{ height: '1px', flexShrink: 0 }} />

              {/* 3. ABA TAREFAS / FOLLOW-UPS: Exibe tarefas agendadas com separadores de data e sem cabeçalho redundante */}
              {composerTab === 'tasks' && (
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', overflowY: 'auto' }}>
                  {combinedLeadTasks.length === 0 ? (
                    <div style={{
                      background: 'var(--adm-bg-card)',
                      border: '1px dashed var(--adm-border)',
                      borderRadius: '12px',
                      padding: '40px 20px',
                      textAlign: 'center',
                      color: 'var(--adm-text-muted)',
                    }}>
                      <CheckSquare size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
                      <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 600 }}>
                        {isPostSaleFunnel ? 'Nenhuma tarefa vinculada a este cliente.' : 'Nenhum follow-up agendado para este lead.'}
                      </p>
                      <p style={{ margin: '4px 0 12px', fontSize: '0.74rem' }}>
                        {isPostSaleFunnel ? 'Crie compromissos como visita técnica ou alinhamento final.' : 'Agende um follow-up rápido pela barra inferior abaixo.'}
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {combinedLeadTasks.map((task, idx) => {
                        const isDone = task.status === 'completed';
                        const isLate = isTaskOverdue(task);
                        const collabLabel = (task as any).assignedToName || task.createdByName || (task.assignedToIds && task.assignedToIds.length ? 'Equipe' : null);
                        const isInlineCompleting = inlineCompletingTaskId === task.id;
                        const outcome: 'success' | 'unsuccessful' = (task as any).customProperties?.outcome ||
                          ((task.customStatusId === 'st_completed_unsuccessful' || (task.resolution || '').toLowerCase().includes('sem sucesso') || (task.resolution || '').toLowerCase().includes('sem contato')) ? 'unsuccessful' : 'success');

                        // Hierarquia de Título e Resumo: Nome da pessoa + Data evento • Tipo
                        let cleanTitle = task.title || task.description || 'Follow-up';
                        let summaryNote = task.description && task.description !== task.title ? task.description : (task.content || '');

                        // Compatibilidade com títulos legados que concatenavam ': '
                        if (cleanTitle.includes(': ')) {
                          const parts = cleanTitle.split(': ');
                          cleanTitle = parts[0];
                          if (!summaryNote) {
                            summaryNote = parts.slice(1).join(': ');
                          }
                        }

                        // Detecção de data e divisor de data estilo histórico/WhatsApp
                        const taskDateStr = task.dueDate || (task.createdAt ? task.createdAt.split('T')[0] : '');
                        const prevTask = idx > 0 ? combinedLeadTasks[idx - 1] : null;
                        const prevDateStr = prevTask ? (prevTask.dueDate || (prevTask.createdAt ? prevTask.createdAt.split('T')[0] : '')) : null;
                        const isDifferentDayFromPrev = idx === 0 || taskDateStr !== prevDateStr;
                        const dateDividerText = isDifferentDayFromPrev && taskDateStr ? formatWhatsAppDateDivider(taskDateStr) : '';

                        // Detecção de status de data futura
                        const isScheduled = Boolean(task.dueDate && task.dueDate > todayStr && task.status !== 'in_progress' && !isDone);
                        const displayTaskType = (task as any).customType || (task as any).customProperties?.customType || task.type;
                        const prioConfig = getTaskPriorityConfig(task.priority);
                        const isPriorityMenuOpen = priorityMenuTaskId === task.id;

                        return (
                          <React.Fragment key={task.id}>
                            {/* Divisor de data idêntico à aba Histórico */}
                            {isDifferentDayFromPrev && dateDividerText && (
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '100%',
                                  margin: idx === 0 ? '4px 0 10px 0' : '16px 0 10px 0',
                                  position: 'relative',
                                  userSelect: 'none',
                                  zIndex: 1,
                                }}
                              >
                                <div style={{ flex: 1, height: '1px', background: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.07)' }} />
                                <div
                                  style={{
                                    margin: '0 12px',
                                    background: isDarkMode ? '#182229' : '#ffffff',
                                    color: isDarkMode ? '#8696a0' : '#54656f',
                                    fontSize: '0.70rem',
                                    fontWeight: 700,
                                    letterSpacing: '0.04em',
                                    padding: '4px 14px',
                                    borderRadius: '8px',
                                    boxShadow: isDarkMode ? '0 1px 3px rgba(0,0,0,0.45)' : '0 1px 2px rgba(11,20,26,0.12)',
                                    border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  <span>{dateDividerText}</span>
                                </div>
                                <div style={{ flex: 1, height: '1px', background: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.07)' }} />
                              </div>
                            )}

                            <div
                              style={{
                                background: 'var(--adm-bg-card)',
                                border: `1px solid ${isDone ? (outcome === 'unsuccessful' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)') : isLate ? 'rgba(239, 68, 68, 0.3)' : 'var(--adm-border)'}`,
                                borderRadius: '10px',
                                padding: '12px 16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                              }}
                            >
                              {/* 1. TOPO: TÍTULO DA TAREFA COM BADGES E BOTÃO VER */}
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                    <strong style={{
                                      fontSize: '0.86rem',
                                      color: isDone ? 'var(--adm-text-muted)' : 'var(--adm-text-title)',
                                      textDecoration: isDone ? 'line-through' : 'none',
                                      fontWeight: 700,
                                    }}>
                                      {cleanTitle}
                                    </strong>

                                    {/* Popover Moderno de Prioridade */}
                                    <div style={{ position: 'relative' }}>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPriorityMenuTaskId(isPriorityMenuOpen ? null : task.id);
                                        }}
                                        title="Alterar prioridade"
                                        style={{
                                          fontSize: '11px',
                                          padding: '2px 8px',
                                          borderRadius: '6px',
                                          fontWeight: 700,
                                          background: prioConfig.bgColor,
                                          color: prioConfig.color,
                                          border: `1px solid ${prioConfig.borderColor}`,
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '5px',
                                          transition: 'all 0.12s ease',
                                        }}
                                      >
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: prioConfig.color }} />
                                        <span>{prioConfig.label}</span>
                                      </button>

                                      {isPriorityMenuOpen && (
                                        <div
                                          ref={priorityMenuRef}
                                          style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            marginTop: '4px',
                                            zIndex: 60,
                                            background: isDarkMode ? '#1e293b' : '#ffffff',
                                            border: '1px solid var(--adm-border)',
                                            borderRadius: '8px',
                                            padding: '4px',
                                            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '2px',
                                            minWidth: '135px',
                                          }}
                                        >
                                          {TASK_PRIORITY_OPTIONS.map((opt) => (
                                            <button
                                              key={opt.id}
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (updateTask) updateTask(task.id, { priority: opt.id as any });
                                                setPriorityMenuTaskId(null);
                                              }}
                                              style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '5px 8px',
                                                borderRadius: '5px',
                                                border: 'none',
                                                background: task.priority === opt.id ? (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)') : 'transparent',
                                                color: opt.color,
                                                fontSize: '0.72rem',
                                                fontWeight: task.priority === opt.id ? 800 : 600,
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                width: '100%',
                                              }}
                                            >
                                              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: opt.color }} />
                                              <span>{opt.label}</span>
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    {/* Etiqueta do Tipo da Tarefa (priorizando customType ex: Follow-up Ligação) */}
                                    {displayTaskType && (
                                      <span style={{
                                        fontSize: '11px',
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        fontWeight: 600,
                                        background: 'var(--adm-bg-input)',
                                        color: 'var(--adm-text-title)',
                                        border: '1px solid var(--adm-border)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                      }}>
                                        {renderTaskTypeLucideIcon(displayTaskType, 12)}
                                        <span>{displayTaskType}</span>
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Ação: Botão Ver para abrir a Ficha do Cliente no CRM */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (selectedLead) {
                                      setIsInspectorOpen(true);
                                    }
                                  }}
                                  title="Ver Ficha do Cliente no CRM"
                                  style={{
                                    background: 'var(--adm-bg-input)',
                                    border: '1px solid var(--adm-border)',
                                    borderRadius: '6px',
                                    padding: '5px 9px',
                                    color: 'var(--adm-accent, #0284C7)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    flexShrink: 0,
                                  }}
                                >
                                  <Eye size={13} />
                                  <span>Ver</span>
                                </button>
                              </div>

                              {/* 2. RESUMO DO FOLLOW-UP (EM DESTAQUE SE PREENCHIDO) */}
                              {summaryNote && (
                                <div style={{
                                  background: 'var(--adm-bg-input)',
                                  border: '1px solid var(--adm-border)',
                                  borderRadius: '8px',
                                  padding: '8px 12px',
                                  fontSize: '0.76rem',
                                  color: 'var(--adm-text-title)',
                                  lineHeight: 1.45,
                                  whiteSpace: 'pre-wrap',
                                }}>
                                  <span style={{
                                    fontSize: '0.66rem',
                                    fontWeight: 700,
                                    color: 'var(--adm-text-muted)',
                                    display: 'block',
                                    marginBottom: '3px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                  }}>
                                    Resumo do Follow-up:
                                  </span>
                                  {summaryNote}
                                </div>
                              )}

                              {/* 3. LINHA DE PRAZOS E RESPONSÁVEL */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: isLate ? '#EF4444' : undefined, fontWeight: isLate ? 700 : 500 }}>
                                  <Clock size={12} />
                                  {task.dueDate ? `Prazo: ${new Date(task.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')} ${(task as any).dueTime ? `às ${(task as any).dueTime}` : ''}` : 'Sem prazo'}
                                  {isLate && ' (Atrasada)'}
                                </span>
                                {collabLabel && (
                                  <span>Resp: <strong style={{ color: 'var(--adm-text-title)' }}>{collabLabel}</strong></span>
                                )}
                                {isDone && (task as any).completedAt && (
                                  <span style={{ color: outcome === 'unsuccessful' ? '#EF4444' : '#10B981', fontWeight: 600 }}>
                                    • Finalizado em {new Date((task as any).completedAt).toLocaleString('pt-BR')}
                                  </span>
                                )}
                              </div>

                              {/* 4. FLUXO DE STATUS / ETAPAS CONFORME A DATA */}
                              {isDone ? (
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  paddingTop: '8px',
                                  borderTop: '1px solid var(--adm-border)',
                                  flexWrap: 'wrap',
                                  gap: '8px',
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>
                                      Resultado:
                                    </span>
                                    {outcome === 'unsuccessful' ? (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        padding: '3px 9px',
                                        borderRadius: '6px',
                                        background: 'rgba(239, 68, 68, 0.12)',
                                        border: '1px solid rgba(239, 68, 68, 0.35)',
                                        color: '#EF4444',
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                      }}>
                                        <XCircle size={12} />
                                        <span>Sem Sucesso</span>
                                      </span>
                                    ) : (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        padding: '3px 9px',
                                        borderRadius: '6px',
                                        background: 'rgba(16, 185, 129, 0.12)',
                                        border: '1px solid rgba(16, 185, 129, 0.35)',
                                        color: '#10B981',
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                      }}>
                                        <CheckCircle2 size={12} />
                                        <span>Realizado com Sucesso</span>
                                      </span>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (updateTask) updateTask(task.id, { status: 'in_progress', completedAt: undefined });
                                    }}
                                    title="Reabrir este follow-up"
                                    style={{
                                      background: 'transparent',
                                      border: '1px solid var(--adm-border)',
                                      borderRadius: '6px',
                                      padding: '3px 8px',
                                      color: 'var(--adm-text-muted)',
                                      fontSize: '0.68rem',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                  >
                                    <RotateCcw size={11} />
                                    <span>Reabrir</span>
                                  </button>
                                </div>
                              ) : (
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  paddingTop: '8px',
                                  borderTop: '1px solid var(--adm-border)',
                                  flexWrap: 'wrap',
                                }}>
                                  <span style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginRight: '2px' }}>
                                    Etapa:
                                  </span>

                                  {/* Se data for futura (isScheduled): badge Agendado e ações desabilitadas/cinzas */}
                                  {isScheduled ? (
                                    <>
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          padding: '4px 10px',
                                          borderRadius: '6px',
                                          border: '1px solid rgba(59, 130, 246, 0.4)',
                                          background: 'rgba(59, 130, 246, 0.12)',
                                          color: '#3B82F6',
                                          fontSize: '0.70rem',
                                          fontWeight: 700,
                                        }}
                                        title="Agendado para data futura"
                                      >
                                        <Calendar size={11} />
                                        <span>Agendado</span>
                                      </span>

                                      <button
                                        type="button"
                                        disabled
                                        title="Disponível a partir da data agendada"
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          padding: '4px 10px',
                                          borderRadius: '6px',
                                          border: '1px solid var(--adm-border)',
                                          background: 'var(--adm-bg-input)',
                                          color: 'var(--adm-text-muted)',
                                          fontSize: '0.70rem',
                                          fontWeight: 500,
                                          opacity: 0.45,
                                          cursor: 'not-allowed',
                                        }}
                                      >
                                        <span>Em Execução</span>
                                      </button>

                                      <button
                                        type="button"
                                        disabled
                                        title="Disponível a partir da data agendada"
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          padding: '4px 10px',
                                          borderRadius: '6px',
                                          border: '1px solid var(--adm-border)',
                                          background: 'var(--adm-bg-input)',
                                          color: 'var(--adm-text-muted)',
                                          fontSize: '0.70rem',
                                          fontWeight: 500,
                                          opacity: 0.45,
                                          cursor: 'not-allowed',
                                        }}
                                      >
                                        <CheckCircle2 size={12} />
                                        <span>Com Sucesso</span>
                                      </button>

                                      <button
                                        type="button"
                                        disabled
                                        title="Disponível a partir da data agendada"
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          padding: '4px 10px',
                                          borderRadius: '6px',
                                          border: '1px solid var(--adm-border)',
                                          background: 'var(--adm-bg-input)',
                                          color: 'var(--adm-text-muted)',
                                          fontSize: '0.70rem',
                                          fontWeight: 500,
                                          opacity: 0.45,
                                          cursor: 'not-allowed',
                                        }}
                                      >
                                        <XCircle size={12} />
                                        <span>Sem Sucesso</span>
                                      </button>
                                    </>
                                  ) : (
                                    /* Quando a data for hoje ou passada: NÃO tem botão Não Iniciada (já é o estado padrão). Exibe os 3 ativos: */
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (updateTask) updateTask(task.id, { status: 'in_progress', customStatusId: 'st_in_progress' });
                                        }}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          padding: '4px 10px',
                                          borderRadius: '6px',
                                          border: `1px solid ${task.status === 'in_progress' ? 'rgba(147, 51, 234, 0.4)' : 'var(--adm-border)'}`,
                                          background: task.status === 'in_progress' ? 'rgba(147, 51, 234, 0.15)' : 'var(--adm-bg-input)',
                                          color: task.status === 'in_progress' ? '#A855F7' : 'var(--adm-text-muted)',
                                          fontSize: '0.70rem',
                                          fontWeight: task.status === 'in_progress' ? 800 : 600,
                                          cursor: 'pointer',
                                          transition: 'all 0.12s ease',
                                        }}
                                      >
                                        <span>Em Execução</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (inlineCompletingTaskId === task.id && inlineCompletingOutcome === 'success') {
                                            setInlineCompletingTaskId(null);
                                          } else {
                                            setInlineCompletingTaskId(task.id);
                                            setInlineCompletingOutcome('success');
                                            setInlineResolutionText('');
                                          }
                                        }}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          padding: '4px 10px',
                                          borderRadius: '6px',
                                          border: `1px solid ${isInlineCompleting && inlineCompletingOutcome === 'success' ? '#10B981' : 'rgba(16, 185, 129, 0.3)'}`,
                                          background: isInlineCompleting && inlineCompletingOutcome === 'success' ? '#10B981' : 'rgba(16, 185, 129, 0.08)',
                                          color: isInlineCompleting && inlineCompletingOutcome === 'success' ? '#FFFFFF' : '#10B981',
                                          fontSize: '0.70rem',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          transition: 'all 0.12s ease',
                                        }}
                                        title="Concluir follow-up com sucesso"
                                      >
                                        <CheckCircle2 size={12} />
                                        <span>Com Sucesso</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (inlineCompletingTaskId === task.id && inlineCompletingOutcome === 'unsuccessful') {
                                            setInlineCompletingTaskId(null);
                                          } else {
                                            setInlineCompletingTaskId(task.id);
                                            setInlineCompletingOutcome('unsuccessful');
                                            setInlineResolutionText('');
                                          }
                                        }}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          padding: '4px 10px',
                                          borderRadius: '6px',
                                          border: `1px solid ${isInlineCompleting && inlineCompletingOutcome === 'unsuccessful' ? '#EF4444' : 'rgba(239, 68, 68, 0.3)'}`,
                                          background: isInlineCompleting && inlineCompletingOutcome === 'unsuccessful' ? '#EF4444' : 'rgba(239, 68, 68, 0.08)',
                                          color: isInlineCompleting && inlineCompletingOutcome === 'unsuccessful' ? '#FFFFFF' : '#EF4444',
                                          fontSize: '0.70rem',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          transition: 'all 0.12s ease',
                                        }}
                                        title="Concluir follow-up sem sucesso (sem contato, recusa, etc)"
                                      >
                                        <XCircle size={12} />
                                        <span>Sem Sucesso</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}

                            {/* 5. CAIXA INLINE DE JUSTIFICATIVA OBRIGATÓRIA */}
                            {isInlineCompleting && (
                              <div style={{
                                marginTop: '4px',
                                padding: '12px',
                                borderRadius: '8px',
                                background: inlineCompletingOutcome === 'success'
                                  ? (isDarkMode ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4')
                                  : (isDarkMode ? 'rgba(239, 68, 68, 0.08)' : '#fef2f2'),
                                border: `1px solid ${inlineCompletingOutcome === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                animation: 'fadeIn 0.15s ease-out',
                              }}>
                                <div style={{
                                  fontSize: '0.74rem',
                                  fontWeight: 800,
                                  color: inlineCompletingOutcome === 'success' ? '#10B981' : '#EF4444',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                }}>
                                  {inlineCompletingOutcome === 'success' ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                                  <span>
                                    {inlineCompletingOutcome === 'success'
                                      ? 'O que aconteceu neste follow-up com sucesso? (Obrigatório, salvo no histórico):'
                                      : 'Por que este follow-up não teve sucesso? (Obrigatório, salvo no histórico):'}
                                  </span>
                                </div>
                                <textarea
                                  value={inlineResolutionText}
                                  onChange={(e) => setInlineResolutionText(e.target.value)}
                                  placeholder={inlineCompletingOutcome === 'success'
                                    ? "Descreva o retorno do cliente ou resultado positivo do contato..."
                                    : "Descreva o motivo do insucesso (não atendeu, número inválido, desistiu, etc)..."}
                                  className="adm-input"
                                  autoFocus
                                  style={{
                                    minHeight: '62px',
                                    fontSize: '0.78rem',
                                    padding: '8px',
                                    borderRadius: '6px',
                                    resize: 'vertical',
                                  }}
                                />
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setInlineCompletingTaskId(null);
                                      setInlineResolutionText('');
                                    }}
                                    style={{
                                      padding: '5px 11px',
                                      borderRadius: '6px',
                                      border: '1px solid var(--adm-border)',
                                      background: 'transparent',
                                      fontSize: '0.72rem',
                                      color: 'var(--adm-text-muted)',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!inlineResolutionText.trim()) {
                                        toast.warning('Por favor, informe a justificativa ou resultado do follow-up.');
                                        return;
                                      }
                                      handleCompleteInlineTask(task, inlineResolutionText, inlineCompletingOutcome);
                                    }}
                                    style={{
                                      padding: '6px 14px',
                                      borderRadius: '6px',
                                      border: 'none',
                                      background: inlineCompletingOutcome === 'success' ? '#10B981' : '#EF4444',
                                      color: '#fff',
                                      fontSize: '0.74rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                    }}
                                  >
                                    <Check size={13} />
                                    <span>Salvar e Finalizar Follow-up</span>
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* 6. REGISTRO DE RESOLUÇÃO SE JÁ CONCLUÍDO */}
                            {(task.resolution || (task as any).customProperties?.resolution) && !isInlineCompleting && (
                              <div style={{
                                background: outcome === 'unsuccessful' ? 'rgba(239, 68, 68, 0.06)' : 'rgba(16, 185, 129, 0.06)',
                                borderLeft: `3px solid ${outcome === 'unsuccessful' ? '#EF4444' : '#10B981'}`,
                                padding: '6px 10px',
                                borderRadius: '0 6px 6px 0',
                                fontSize: '0.72rem',
                                color: 'var(--adm-text-title)',
                              }}>
                                <span style={{
                                  fontWeight: 700,
                                  color: outcome === 'unsuccessful' ? '#EF4444' : '#10B981',
                                  display: 'block',
                                  fontSize: '0.68rem',
                                  textTransform: 'uppercase',
                                  marginBottom: '2px',
                                }}>
                                  {outcome === 'unsuccessful' ? 'Motivo do Insucesso:' : 'Resultado Registrado / O que aconteceu:'}
                                </span>
                                {task.resolution || (task as any).customProperties?.resolution}
                              </div>
                            )}
                          </div>
                        </React.Fragment>
                      );
                    })}
                    </div>
                  )}
                </div>
              )}

              {/* 3.1 ABA AGENDAMENTOS: Compromissos do Contrato */}
              {composerTab === 'appointments' && (
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', overflowY: 'auto' }}>
                  {/* Top Bar com Ação de Agendamento */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.90rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                        Compromissos & Agendamentos do Contrato
                      </h4>
                      <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
                        Visitas técnicas, degustações gastronômicas e reuniões de alinhamento com a família.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingTask({ type: 'appointment', title: 'Novo Agendamento', customProperties: { type: 'appointment' } } as any);
                        setIsTaskModalOpen(true);
                      }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        background: '#D97706',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 8px rgba(217, 119, 6, 0.25)',
                      }}
                    >
                      <Plus size={14} />
                      <span>Novo Agendamento</span>
                    </button>
                  </div>

                  {clientAppointments.length === 0 ? (
                    <div style={{
                      background: 'var(--adm-bg-card)',
                      border: '1px dashed var(--adm-border)',
                      borderRadius: '12px',
                      padding: '40px 20px',
                      textAlign: 'center',
                      color: 'var(--adm-text-muted)',
                    }}>
                      <Calendar size={36} style={{ opacity: 0.35, marginBottom: '8px', color: '#D97706' }} />
                      <p style={{ margin: 0, fontSize: '0.86rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                        Nenhum agendamento cadastrado para este contrato.
                      </p>
                      <p style={{ margin: '4px 0 14px', fontSize: '0.74rem' }}>
                        Clique em "Novo Agendamento" para marcar uma visita técnica, degustação ou alinhamento.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                      {clientAppointments.map((app) => {
                        const isVisit = app.type === 'visit';
                        const isTasting = app.type === 'tasting';
                        const themeColor = isVisit ? '#10B981' : isTasting ? '#D97706' : '#3B82F6';

                        return (
                          <div
                            key={app.id}
                            style={{
                              background: 'var(--adm-bg-card)',
                              border: `1.5px solid ${themeColor}33`,
                              borderLeft: `4px solid ${themeColor}`,
                              borderRadius: '10px',
                              padding: '12px 14px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                              <span style={{
                                fontSize: '0.64rem',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                background: `${themeColor}15`,
                                color: themeColor,
                                border: `1px solid ${themeColor}30`,
                              }}>
                                {app.typeLabel || (isVisit ? 'Visita Técnica' : isTasting ? 'Degustação' : 'Compromisso')}
                              </span>

                              <span style={{
                                fontSize: '0.64rem',
                                fontWeight: 700,
                                color: app.status === 'completed' ? '#10B981' : '#F59E0B',
                              }}>
                                {app.status === 'completed' ? 'Realizado' : 'Confirmado'}
                              </span>
                            </div>

                            <h5 style={{ margin: 0, fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                              {app.title}
                            </h5>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Calendar size={12} color={themeColor} />
                                <span>{app.date ? `${app.date} às ${app.time || '14:00'}` : 'Data a definir'}</span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Building2 size={12} color="var(--adm-text-muted)" />
                                <span>{app.venueName || 'Unidade Bonomo'}</span>
                              </div>

                              {app.closerName && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Users size={12} color="var(--adm-text-muted)" />
                                  <span>Responsável: <strong>{app.closerName}</strong></span>
                                </div>
                              )}

                              {app.pax && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Users size={12} color="#D97706" />
                                  <span>Pax: <strong>{app.pax} {app.pax === 1 ? 'convidado' : 'convidados'}</strong></span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 4. ABA VENDAS & UPSELL: Dashboard Financeiro Completo + Lista de Upsells */}
              {composerTab === 'upsell' && (
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', overflowY: 'auto' }}>
                  {/* Header da Aba */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: 'var(--adm-text-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <DollarSign size={18} color="#10B981" />
                        <span>Vendas & Upsell</span>
                        <span style={{
                          fontSize: '0.70rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#10B981',
                        }}>
                          {clientUpsells.length} {clientUpsells.length === 1 ? 'Serviço' : 'Serviços'}
                        </span>
                      </h3>
                      <p style={{ margin: '3px 0 0 0', fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
                        Gestão financeira consolidada, contrato base e adicionais contratados
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingUpsell(null);
                        setUpsellTitle('');
                        setUpsellCategory('foto_video');
                        setUpsellValue('');
                        setUpsellPaymentStatus('pago');
                        setUpsellPaymentMethod('PIX');
                        setUpsellNotes('');
                        setIsUpsellModalOpen(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        color: '#FFF',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                      }}
                    >
                      <Plus size={14} />
                      <span>+ Registrar Venda Adicional / Upsell</span>
                    </button>
                  </div>

                  {/* 5 CARDS FINANCEIROS */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '12px',
                  }}>
                    {/* Card 1: Contrato Base */}
                    <div style={{
                      background: 'var(--adm-bg-card)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Contrato Base
                        </span>
                        <FileText size={14} color="#8B5CF6" />
                      </div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                        R$ {baseContract.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                        Valor principal fechado
                      </span>
                    </div>

                    {/* Card 2: Serviços Extras / Upsell */}
                    <div style={{
                      background: 'var(--adm-bg-card)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Serviços Extras / Upsell
                        </span>
                        <Sparkles size={14} color="#10B981" />
                      </div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10B981' }}>
                        R$ {totalUpsell.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                        +{clientUpsells.length} adicionais contratados
                      </span>
                    </div>

                    {/* Card 3: Dinheiro em Caixa (Recebido) */}
                    <div style={{
                      background: 'var(--adm-bg-card)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Dinheiro em Caixa
                        </span>
                        <CheckCircle2 size={14} color="#10B981" />
                      </div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10B981' }}>
                        R$ {totalCashReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                        Entrada + Upsells Pagos
                      </span>
                    </div>

                    {/* Card 4: Dinheiro Previsto (A Receber) */}
                    <div style={{
                      background: 'var(--adm-bg-card)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Dinheiro Previsto
                        </span>
                        <Clock size={14} color="#F59E0B" />
                      </div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#F59E0B' }}>
                        R$ {totalForecastedRemaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                        Saldo + Upsells Pendentes
                      </span>
                    </div>

                    {/* Card 5: Rentabilidade Geral */}
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(99, 102, 241, 0.12) 100%)',
                      border: '1.5px solid rgba(99, 102, 241, 0.35)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Rentabilidade Geral
                        </span>
                        <TrendingUp size={14} color="#3B82F6" />
                      </div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                        R$ {totalRentabilidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                        Total Consolidado com Upsell
                      </span>
                    </div>
                  </div>

                  {/* ESTRUTURA DE PAGAMENTO DO CONTRATO BASE */}
                  <div style={{
                    background: 'var(--adm-bg-card)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '10px',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--adm-border)', paddingBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldCheck size={16} color="var(--adm-accent, #6366F1)" />
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                          Estrutura de Pagamento do Contrato Base
                        </span>
                      </div>
                      <span style={{
                        fontSize: '0.70rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: '#10B981',
                      }}>
                        Contrato Fechado
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                      <div style={{ background: 'var(--adm-bg-input)', borderRadius: '8px', padding: '10px 12px' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', display: 'block' }}>Valor do Contrato</span>
                        <strong style={{ fontSize: '0.90rem', color: 'var(--adm-text-title)' }}>
                          R$ {baseContract.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </strong>
                      </div>

                      <div style={{ background: 'var(--adm-bg-input)', borderRadius: '8px', padding: '10px 12px' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', display: 'block' }}>Entrada (Sinal)</span>
                        <strong style={{ fontSize: '0.90rem', color: '#10B981' }}>
                          R$ {downPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </strong>
                      </div>

                      <div style={{ background: 'var(--adm-bg-input)', borderRadius: '8px', padding: '10px 12px' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', display: 'block' }}>Saldo Parcelado Restante</span>
                        <strong style={{ fontSize: '0.90rem', color: '#F59E0B' }}>
                          R$ {installmentsRemaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* LISTA DE SERVIÇOS ADICIONAIS CONTRATADOS (UPSELLS) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShoppingBag size={16} color="#10B981" />
                        <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                          Serviços Adicionais e Opcionais Contratados ({clientUpsells.length})
                        </span>
                      </div>
                    </div>

                    {clientUpsells.length === 0 ? (
                      <div style={{
                        background: 'var(--adm-bg-card)',
                        border: '1px dashed var(--adm-border)',
                        borderRadius: '12px',
                        padding: '36px 20px',
                        textAlign: 'center',
                        color: 'var(--adm-text-muted)',
                      }}>
                        <Sparkles size={32} style={{ opacity: 0.35, marginBottom: '8px', color: '#10B981' }} />
                        <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>Nenhum opcional ou venda adicional registrada ainda.</p>
                        <p style={{ margin: '4px 0 14px', fontSize: '0.74rem' }}>Ofereça serviços complementares como foto 360, bar de drinks, DJ ou cenografia temática.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUpsell(null);
                            setUpsellTitle('');
                            setUpsellCategory('foto_video');
                            setUpsellValue('');
                            setUpsellPaymentStatus('pago');
                            setUpsellPaymentMethod('PIX');
                            setUpsellNotes('');
                            setIsUpsellModalOpen(true);
                          }}
                          style={{
                            padding: '7px 14px',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#10B981',
                            color: '#FFF',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          + Registrar Primeira Venda Adicional
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {clientUpsells.map(sale => {
                          const catConfig = UPSELL_CATEGORIES[sale.category] || UPSELL_CATEGORIES.outro;
                          const isPaid = sale.paymentStatus === 'pago';
                          const isPending = sale.paymentStatus === 'pendente';

                          return (
                            <div
                              key={sale.id}
                              style={{
                                background: 'var(--adm-bg-card)',
                                border: '1px solid var(--adm-border)',
                                borderRadius: '10px',
                                padding: '12px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px',
                                flexWrap: 'wrap',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                <div style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '8px',
                                  background: catConfig.bg,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}>
                                  <Sparkles size={16} color={catConfig.color} />
                                </div>

                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <strong style={{ fontSize: '0.84rem', color: 'var(--adm-text-title)' }}>
                                      {sale.title}
                                    </strong>
                                    <span style={{
                                      fontSize: '0.64rem',
                                      fontWeight: 700,
                                      padding: '1px 7px',
                                      borderRadius: '4px',
                                      background: catConfig.bg,
                                      color: catConfig.color,
                                    }}>
                                      {catConfig.label}
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px', fontSize: '0.70rem', color: 'var(--adm-text-muted)', flexWrap: 'wrap' }}>
                                    <span>
                                      Data: {sale.saleDate ? new Date(sale.saleDate + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                                      {sale.saleTime ? ` às ${sale.saleTime}` : sale.createdAt ? ` às ${new Date(sale.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                                    </span>
                                    {sale.responsibleName && <span>Vendido por: <strong style={{ color: 'var(--adm-text-title)' }}>{sale.responsibleName}</strong></span>}
                                    {sale.paymentMethod && <span>Forma: {sale.paymentMethod}</span>}
                                    {sale.notes && <span>Obs: {sale.notes}</span>}
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#10B981' }}>
                                    R$ {Number(sale.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </div>
                                  <span style={{
                                    fontSize: '0.64rem',
                                    fontWeight: 700,
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    background: isPaid ? 'rgba(16, 185, 129, 0.12)' : isPending ? 'rgba(245, 158, 11, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                                    color: isPaid ? '#10B981' : isPending ? '#F59E0B' : '#3B82F6',
                                    display: 'inline-block',
                                  }}>
                                    {isPaid ? 'Pago à Vista' : isPending ? 'A Receber' : 'Parcelado'}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingUpsell(sale);
                                      setUpsellTitle(sale.title);
                                      setUpsellCategory(sale.category);
                                      setUpsellValue(String(sale.value));
                                      setUpsellDate(sale.saleDate);
                                      setUpsellTime(sale.saleTime || (sale.createdAt ? new Date(sale.createdAt).toTimeString().slice(0, 5) : '12:00'));
                                      setUpsellResponsibleId(sale.responsibleId || currentUser?.id || '');
                                      setUpsellPaymentStatus(sale.paymentStatus || 'pago');
                                      setUpsellPaymentMethod(sale.paymentMethod || 'PIX');
                                      setUpsellNotes(sale.notes || '');
                                      setIsUpsellModalOpen(true);
                                    }}
                                    title="Editar Venda Adicional"
                                    style={{
                                      background: 'var(--adm-bg-input)',
                                      border: '1px solid var(--adm-border)',
                                      borderRadius: '6px',
                                      padding: '6px',
                                      color: 'var(--adm-text-muted)',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUpsell(sale.id)}
                                    title="Excluir Venda Adicional"
                                    style={{
                                      background: 'rgba(239, 68, 68, 0.08)',
                                      border: '1px solid rgba(239, 68, 68, 0.2)',
                                      borderRadius: '6px',
                                      padding: '6px',
                                      color: '#EF4444',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 5. ABA DOCUMENTOS & ANEXOS */}
              {composerTab === 'documents' && (
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: 'var(--adm-text-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Folder size={18} color="#F59E0B" />
                        <span>Documentos & Anexos</span>
                        <span style={{
                          fontSize: '0.70rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: '#F59E0B',
                        }}>
                          {clientDocuments.length} {clientDocuments.length === 1 ? 'Arquivo' : 'Arquivos'}
                        </span>
                      </h3>
                      <p style={{ margin: '3px 0 0 0', fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
                        Contratos, recibos, termos e documentos anexados deste cliente
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setDocTitle('');
                        setDocType('contract');
                        setDocFileUrl('');
                        setDocFileSize('');
                        setIsDocModalOpen(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#F59E0B',
                        color: '#FFF',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(245, 158, 11, 0.25)',
                      }}
                    >
                      <Plus size={14} />
                      <span>+ Adicionar Documento</span>
                    </button>
                  </div>

                  {clientDocuments.length === 0 ? (
                    <div style={{
                      background: 'var(--adm-bg-card)',
                      border: '1px dashed var(--adm-border)',
                      borderRadius: '12px',
                      padding: '40px 20px',
                      textAlign: 'center',
                      color: 'var(--adm-text-muted)',
                    }}>
                      <Folder size={34} style={{ opacity: 0.35, marginBottom: '8px', color: '#F59E0B' }} />
                      <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>Nenhum documento anexado ainda.</p>
                      <p style={{ margin: '4px 0 14px', fontSize: '0.74rem' }}>Faça upload do contrato assinado, aditivos ou comprovantes de sinal.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setDocTitle('');
                          setDocType('contract');
                          setDocFileUrl('');
                          setDocFileSize('');
                          setIsDocModalOpen(true);
                        }}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#F59E0B',
                          color: '#FFF',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        + Anexar Primeiro Documento
                      </button>
                    </div>
                  ) : (() => {
                    const typeLabels: Record<string, { label: string; color: string }> = {
                      contract: { label: 'Contrato Principal', color: '#8B5CF6' },
                      amendment: { label: 'Aditivo Contratual', color: '#3B82F6' },
                      receipt: { label: 'Comprovante / Recibo', color: '#10B981' },
                      id_document: { label: 'Documento / RG / CPF', color: '#F59E0B' },
                      other: { label: 'Outro Anexo', color: '#6B7280' },
                    };

                    const isContractual = (d: any) => {
                      const t = String(d.type || '').toLowerCase();
                      const title = String(d.title || d.name || '').toLowerCase();
                      return t === 'contract' || t === 'amendment' || t === 'receipt' || title.includes('contrato') || title.includes('aditivo') || title.includes('recibo') || title.includes('sinal') || title.includes('termo');
                    };

                    const contractualDocs = clientDocuments.filter(isContractual);
                    const eventDocs = clientDocuments.filter(d => !isContractual(d));

                    const renderDocCard = (doc: any) => {
                      const tInfo = typeLabels[doc.type] || typeLabels.other;
                      const isComercialOrigin = Boolean(doc.sector === 'comercial' || doc.origin === 'comercial' || doc.uploadedByRole === 'closer' || doc.uploadedByRole === 'sdr');
                      const author = doc.authorName || doc.uploadedByName || (isComercialOrigin ? (selectedLead.sdrName || 'Comercial') : (selectedLead.assignedTo || 'Pós-Venda'));

                      return (
                        <div
                          key={doc.id}
                          style={{
                            background: 'var(--adm-bg-card)',
                            border: '1px solid var(--adm-border)',
                            borderRadius: '10px',
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                              <FileText size={18} color={tInfo.color} />
                              <div style={{ minWidth: 0 }}>
                                <strong style={{ fontSize: '0.82rem', color: 'var(--adm-text-title)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {doc.title || doc.name || 'Documento'}
                                </strong>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                  <span style={{ fontSize: '0.64rem', color: tInfo.color, fontWeight: 700 }}>
                                    {tInfo.label}
                                  </span>
                                  <span style={{
                                    fontSize: '0.58rem',
                                    fontWeight: 700,
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    background: isComercialOrigin ? 'rgba(99, 102, 241, 0.12)' : 'rgba(6, 182, 212, 0.12)',
                                    color: isComercialOrigin ? '#6366F1' : '#06B6D4',
                                    border: `1px solid ${isComercialOrigin ? 'rgba(99, 102, 241, 0.3)' : 'rgba(6, 182, 212, 0.3)'}`,
                                  }}>
                                    {isComercialOrigin ? 'Comercial' : 'Pós-Venda'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {!String(doc.id).startsWith('contract_file_') && (
                            <button
                              type="button"
                              onClick={() => handleDeleteDoc(doc.id)}
                              title="Remover Documento"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--adm-text-muted)',
                                cursor: 'pointer',
                                padding: '2px',
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--adm-border)' }}>
                            <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                              <span>Por: <strong style={{ color: 'var(--adm-text-title)' }}>{author}</strong></span>
                              <span>{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('pt-BR') : 'Data não informada'}</span>
                            </div>

                            {(doc.fileUrl || doc.url) && (
                              <a
                                href={doc.fileUrl || doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.70rem',
                                  fontWeight: 700,
                                  color: 'var(--adm-accent, #6366F1)',
                                  textDecoration: 'none',
                                }}
                              >
                                <span>Visualizar</span>
                                <ExternalLink size={11} />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    };

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        {/* Seção 1: Documentos Contratuais */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                            <ShieldCheck size={14} color="#8B5CF6" />
                            <h4 style={{ margin: 0, fontSize: '0.80rem', fontWeight: 800, color: 'var(--adm-text-title)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                              Documentos Contratuais
                            </h4>
                            <span style={{ fontSize: '0.64rem', fontWeight: 700, padding: '1px 6px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.15)', color: '#8B5CF6' }}>
                              {contractualDocs.length}
                            </span>
                          </div>
                          {contractualDocs.length === 0 ? (
                            <div style={{ padding: '12px 14px', borderRadius: '8px', border: '1px dashed var(--adm-border)', color: 'var(--adm-text-muted)', fontSize: '0.72rem' }}>
                              Nenhum documento contratual anexado ainda.
                            </div>
                          ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                              {contractualDocs.map(renderDocCard)}
                            </div>
                          )}
                        </div>

                        {/* Seção 2: Documentos do Evento */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                            <Folder size={14} color="#06B6D4" />
                            <h4 style={{ margin: 0, fontSize: '0.80rem', fontWeight: 800, color: 'var(--adm-text-title)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                              Documentos do Evento
                            </h4>
                            <span style={{ fontSize: '0.64rem', fontWeight: 700, padding: '1px 6px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', color: '#06B6D4' }}>
                              {eventDocs.length}
                            </span>
                          </div>
                          {eventDocs.length === 0 ? (
                            <div style={{ padding: '12px 14px', borderRadius: '8px', border: '1px dashed var(--adm-border)', color: 'var(--adm-text-muted)', fontSize: '0.72rem' }}>
                              Nenhum documento de evento anexado ainda (menus, briefings, croquis).
                            </div>
                          ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                              {eventDocs.map(renderDocCard)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Indicador Flutuante / Live de Digitando / Gravando Áudio do Cliente no Chat */}
              {composerTab === 'whatsapp' && (customerPresence.isTyping || customerPresence.isRecording) && (
                <div style={{
                  alignSelf: 'flex-start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: isDarkMode ? '#202c33' : '#ffffff',
                  border: isDarkMode ? '1px solid rgba(0, 168, 132, 0.3)' : '1px solid rgba(0, 168, 132, 0.4)',
                  borderRadius: '14px 14px 14px 2px',
                  padding: '8px 14px',
                  color: '#00a884',
                  boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.25)' : '0 2px 8px rgba(0,0,0,0.08)',
                  margin: '4px 0',
                }}>
                  {customerPresence.isRecording ? (
                    <>
                      <Mic size={15} color="#00a884" />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isDarkMode ? '#e9edef' : '#111827' }}>
                        {chatPeer.name ? `${chatPeer.name} está gravando áudio...` : 'Gravando áudio...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00a884' }} />
                 
... [truncated for diff preview]
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00a884' }} />
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00a884' }} />
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isDarkMode ? '#e9edef' : '#111827', marginLeft: '4px' }}>
                        {chatPeer.name ? `${chatPeer.name} está digitando...` : 'Digitando...'}
                      </span>
                    </>
                  )}
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* ── MULTI-TAB COMPOSER: WHATSAPP | TIMELINE | TAREFAS | UPSELL | DOCUMENTOS ── */}
            {/* Hidden Native File Inputs for WhatsApp Uploads */}
            <input
              ref={fileDocInputRef}
              type="file"
              style={{ display: 'none' }}
              accept="*/*"
              onChange={(e) => handleSelectFilesForStaging(e, 'document')}
            />
            <input
              ref={fileMediaInputRef}
              type="file"
              style={{ display: 'none' }}
              accept="image/*,video/*"
              onChange={(e) => handleSelectFilesForStaging(e)}
            />
            <input
              ref={fileAudioInputRef}
              type="file"
              style={{ display: 'none' }}
              accept="audio/*"
              onChange={(e) => handleSelectFilesForStaging(e, 'audio')}
            />

            {/* Hidden Native File Inputs for Note Multimedia Uploads */}
            <input
              ref={noteDocInputRef}
              type="file"
              style={{ display: 'none' }}
              accept=".pdf,.doc,.docx,.xlsx,.xls,.txt,.csv"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !selectedLead) return;
                e.target.value = '';
                const reader = new FileReader();
                reader.onload = () => {
                  const dataUrl = reader.result as string;
                  const act: LeadActivity = {
                    id: generateUuid(),
                    leadId: selectedLead.id,
                    timestamp: new Date().toISOString(),
                    type: 'note',
                    title: 'Documento Anexado',
                    text: file.name,
                    mediaUrl: dataUrl,
                    mediaType: 'document',
                    authorName: currentUser?.name || 'Colaborador',
                    authorId: currentUser?.id,
                    authorAvatarUrl: currentUser?.avatarUrl,
                  };
                  if (addLeadActivity) addLeadActivity(selectedLead.id, act);
                  else addLeadNote(selectedLead.id, `[Documento] ${file.name}`);
                };
                reader.readAsDataURL(file);
              }}
            />
            <input
              ref={noteMediaInputRef}
              type="file"
              style={{ display: 'none' }}
              accept="image/*,video/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !selectedLead) return;
                e.target.value = '';
                const isVid = file.type.startsWith('video');
                let finalUrl = '';
                if (!isVid) {
                  finalUrl = await compressImageToWebpDataUrl(file);
                } else {
                  finalUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                  });
                }
                const act: LeadActivity = {
                  id: generateUuid(),
                  leadId: selectedLead.id,
                  timestamp: new Date().toISOString(),
                  type: 'note',
                  title: isVid ? 'Vídeo Anexado na Nota' : 'Foto Anexada na Nota',
                  text: file.name,
                  mediaUrl: finalUrl,
                  mediaType: isVid ? 'video' : 'image',
                  authorName: currentUser?.name || 'Colaborador',
                  authorId: currentUser?.id,
                  authorAvatarUrl: currentUser?.avatarUrl,
                };
                if (addLeadActivity) addLeadActivity(selectedLead.id, act);
                else addLeadNote(selectedLead.id, `[${act.title}] ${file.name}`);
              }}
            />
            <input
              ref={noteAudioInputRef}
              type="file"
              style={{ display: 'none' }}
              accept="audio/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file || !selectedLead) return;
                e.target.value = '';
                const reader = new FileReader();
                reader.onload = () => {
                  const dataUrl = reader.result as string;
                  const act: LeadActivity = {
                    id: generateUuid(),
                    leadId: selectedLead.id,
                    timestamp: new Date().toISOString(),
                    type: 'note',
                    title: 'Áudio Anexado na Nota',
                    text: file.name,
                    mediaUrl: dataUrl,
                    mediaType: 'audio',
                    authorName: currentUser?.name || 'Colaborador',
                    authorId: currentUser?.id,
                    authorAvatarUrl: currentUser?.avatarUrl,
                  };
                  if (addLeadActivity) addLeadActivity(selectedLead.id, act);
                  else addLeadNote(selectedLead.id, `[Áudio] ${file.name}`);
                };
                reader.readAsDataURL(file);
              }}
            />

            {messagingPaused ? (
              <div style={{ padding: '14px 16px', borderTop: '1px solid var(--adm-border)', background: 'var(--adm-bg-input)' }}>
                <MessagingPausedBanner />
              </div>
            ) : isLeadSpectator ? (
              <div style={{
                padding: '16px 20px',
                background: 'var(--adm-bg-input)',
                borderTop: '1px solid var(--adm-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <Eye size={20} color="var(--adm-accent)" />
                <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-title)', lineHeight: 1.45 }}>
                  <strong style={{ color: 'var(--adm-accent)' }}>Modo Espectador:</strong> Você está visualizando este lead em modo somente leitura (atribuído a {selectedLead.assignedTo || 'outro colaborador'}). Envio de mensagens e notas são permitidos apenas para o responsável ou gerentes.
                </div>
              </div>
            ) : isReadOnlyForPosVenda ? (
              <div style={{
                padding: '16px 20px',
                background: 'rgba(6, 182, 212, 0.08)',
                borderTop: '1px solid rgba(6, 182, 212, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <Eye size={20} color="#06B6D4" />
                <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-title)', lineHeight: 1.45 }}>
                  <strong style={{ color: '#06B6D4' }}>Modo Observador Comercial (Pós-Venda):</strong> Você pode acompanhar o histórico de conversas e notas deste lead. O envio de mensagens e interação direta neste funil são exclusivos do time comercial (habilitados em funis de Pós-Venda).
                </div>
              </div>
            ) : (
              <div style={{
                padding: '10px 16px 14px 16px',
                borderTop: '1px solid var(--adm-border)',
                background: 'var(--adm-bg-input)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                {/* Tab Selector Pills (5 Abas Unificadas) */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderBottom: '1px solid var(--adm-border)',
                  paddingBottom: '8px',
                  overflowX: 'auto',
                }}>
                  {/* 1. WhatsApp */}
                  <button
                    type="button"
                    onClick={() => setComposerTab('whatsapp')}
                    style={{
                      padding: '5px 11px',
                      borderRadius: '8px',
                      background: composerTab === 'whatsapp' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                      border: composerTab === 'whatsapp' ? '1px solid #10B981' : '1px solid transparent',
                      color: composerTab === 'whatsapp' ? '#10B981' : 'var(--adm-text-muted)',
                      fontSize: '0.74rem',
                      fontWeight: composerTab === 'whatsapp' ? 800 : 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <MessageSquare size={13} />
                    <span>WhatsApp</span>
                  </button>

                  {/* 2. Histórico (Anotações & Auditoria) */}
                  <button
                    type="button"
                    onClick={() => setComposerTab('notes')}
                    style={{
                      padding: '5px 11px',
                      borderRadius: '8px',
                      background: composerTab === 'notes' ? 'var(--adm-accent-bg)' : 'transparent',
                      border: composerTab === 'notes' ? '1px solid var(--adm-accent)' : '1px solid transparent',
                      color: composerTab === 'notes' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                      fontSize: '0.74rem',
                      fontWeight: composerTab === 'notes' ? 800 : 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <FileText size={13} />
                    <span>Histórico</span>
                    <span style={{
                      fontSize: '0.64rem',
                      padding: '1px 5px',
                      borderRadius: '10px',
                      background: composerTab === 'notes' ? 'var(--adm-accent)' : 'var(--adm-border)',
                      color: composerTab === 'notes' ? '#fff' : 'var(--adm-text-muted)',
                      fontWeight: 700,
                    }}>
                      {notesCount}
                    </span>
                  </button>

                  {/* 3. Follow-ups (Leads) ou Tarefas & Agendamentos (Clientes) */}
                  <button
                    type="button"
                    onClick={() => setComposerTab('tasks')}
                    style={{
                      padding: '5px 11px',
                      borderRadius: '8px',
                      background: composerTab === 'tasks' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                      border: composerTab === 'tasks' ? '1px solid #3B82F6' : '1px solid transparent',
                      color: composerTab === 'tasks' ? '#60A5FA' : 'var(--adm-text-muted)',
                      fontSize: '0.74rem',
                      fontWeight: composerTab === 'tasks' ? 800 : 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <CheckSquare size={13} />
                    <span>Tarefas</span>
                    <span style={{
                      fontSize: '0.64rem',
                      padding: '1px 5px',
                      borderRadius: '10px',
                      background: composerTab === 'tasks' ? '#3B82F6' : 'var(--adm-border)',
                      color: composerTab === 'tasks' ? '#fff' : 'var(--adm-text-muted)',
                      fontWeight: 700,
                    }}>
                      {combinedLeadTasks.length}
                    </span>
                  </button>

                  {/* Agendamentos (Pós-Venda / Clientes) */}
                  {(isPostSaleFunnel || (selectedLead as any).isClient) && (
                    <button
                      type="button"
                      onClick={() => setComposerTab('appointments')}
                      style={{
                        padding: '5px 11px',
                        borderRadius: '8px',
                        background: composerTab === 'appointments' ? 'rgba(217, 119, 6, 0.15)' : 'transparent',
                        border: composerTab === 'appointments' ? '1px solid #D97706' : '1px solid transparent',
                        color: composerTab === 'appointments' ? '#D97706' : 'var(--adm-text-muted)',
                        fontSize: '0.74rem',
                        fontWeight: composerTab === 'appointments' ? 800 : 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Calendar size={13} />
                      <span>Agendamentos</span>
                      <span style={{
                        fontSize: '0.64rem',
                        padding: '1px 5px',
                        borderRadius: '10px',
                        background: composerTab === 'appointments' ? '#D97706' : 'var(--adm-border)',
                        color: composerTab === 'appointments' ? '#fff' : 'var(--adm-text-muted)',
                        fontWeight: 700,
                      }}>
                        {clientAppointments.length}
                      </span>
                    </button>
                  )}

                  {/* 4. Vendas & Upsell (Exclusivo Pós-Venda / Clientes) */}
                  {(isPostSaleFunnel || (selectedLead as any).isClient) && (
                    <button
                      type="button"
                      onClick={() => setComposerTab('upsell')}
                      style={{
                        padding: '5px 11px',
                        borderRadius: '8px',
                        background: composerTab === 'upsell' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                        border: composerTab === 'upsell' ? '1px solid #10B981' : '1px solid transparent',
                        color: composerTab === 'upsell' ? '#10B981' : 'var(--adm-text-muted)',
                        fontSize: '0.74rem',
                        fontWeight: composerTab === 'upsell' ? 800 : 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <DollarSign size={13} />
                      <span>Vendas & Upsell</span>
                      <span style={{
                        fontSize: '0.64rem',
                        padding: '1px 5px',
                        borderRadius: '10px',
                        background: composerTab === 'upsell' ? '#10B981' : 'var(--adm-border)',
                        color: composerTab === 'upsell' ? '#fff' : 'var(--adm-text-muted)',
                        fontWeight: 700,
                      }}>
                        {clientUpsells.length}
                      </span>
                    </button>
                  )}

                  {/* 5. Documentos & Anexos (Exclusivo Pós-Venda / Clientes) */}
                  {(isPostSaleFunnel || (selectedLead as any).isClient) && (
                    <button
                      type="button"
                      onClick={() => setComposerTab('documents')}
                      style={{
                        padding: '5px 11px',
                        borderRadius: '8px',
                        background: composerTab === 'documents' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                        border: composerTab === 'documents' ? '1px solid #F59E0B' : '1px solid transparent',
                        color: composerTab === 'documents' ? '#F59E0B' : 'var(--adm-text-muted)',
                        fontSize: '0.74rem',
                        fontWeight: composerTab === 'documents' ? 800 : 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Folder size={13} />
                      <span>Documentos & Anexos</span>
                      <span style={{
                        fontSize: '0.64rem',
                        padding: '1px 5px',
                        borderRadius: '10px',
                        background: composerTab === 'documents' ? '#F59E0B' : 'var(--adm-border)',
                        color: composerTab === 'documents' ? '#fff' : 'var(--adm-text-muted)',
                        fontWeight: 700,
                      }}>
                        {clientDocuments.length}
                      </span>
                    </button>
                  )}
                </div>

                {/* COMPOSER AREA ACCORDING TO ACTIVE TAB */}
                {composerTab === 'upsell' ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--adm-bg-card)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '10px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--adm-text-title)' }}>
                      <DollarSign size={15} color="#10B981" />
                      <span>Gestão financeira, contrato base e vendas adicionais deste cliente</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingUpsell(null);
                        setUpsellTitle('');
                        setUpsellCategory('foto_video');
                        setUpsellValue('');
                        setUpsellPaymentStatus('pago');
                        setUpsellPaymentMethod('PIX');
                        setUpsellNotes('');
                        setIsUpsellModalOpen(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 12px',
                        borderRadius: '7px',
                        border: 'none',
                        background: '#10B981',
                        color: '#FFF',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={13} />
                      <span>+ Registrar Venda Adicional</span>
                    </button>
                  </div>
                ) : composerTab === 'documents' ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--adm-bg-card)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '10px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--adm-text-title)' }}>
                      <Folder size={15} color="#F59E0B" />
                      <span>Repositório de contratos assinados, recibos e documentos do cliente</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDocTitle('');
                        setDocType('contract');
                        setDocFileUrl('');
                        setDocFileSize('');
                        setIsDocModalOpen(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 12px',
                        borderRadius: '7px',
                        border: 'none',
                        background: '#F59E0B',
                        color: '#FFF',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={13} />
                      <span>+ Adicionar Documento</span>
                    </button>
                  </div>
                ) : composerTab === 'tasks' ? (
                  /* 3. COMPOSER: QUICK FOLLOW-UP BAR NO FORMATO CHAT WHATSAPP COM PRÉ-CONFIGURAÇÕES */
                  <div style={{ padding: '4px 12px 12px 12px' }}>
                    <form onSubmit={handleCreateQuickFollowup} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      background: 'var(--adm-bg-card)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '12px',
                      padding: '10px 12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      position: 'relative',
                    }}>
                      {/* LINHA SUPERIOR: PRÉ-CONFIGURAÇÕES (TIPO DO FOLLOW-UP + DATA E HORÁRIO) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {/* 1. Seletor Dropdown Elegante de Tipos (Idêntico à Ficha do Bloco de Notas) */}
                        <div style={{ position: 'relative' }} ref={quickTypePickerRef}>
                          {!isCustomTypeEditing ? (
                            <button
                              type="button"
                              onClick={() => setIsQuickTypePickerOpen(!isQuickTypePickerOpen)}
                              style={{
                                background: 'var(--adm-bg-input)',
                                color: 'var(--adm-text-title)',
                                border: '1px solid var(--adm-border)',
                                borderRadius: '8px',
                                padding: '6px 12px',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '7px',
                                transition: 'all 0.15s ease',
                              }}
                              title="Alterar tipo de follow-up"
                            >
                              {renderTaskTypeLucideIcon(quickFollowupType, 14)}
                              <span>{quickFollowupType}</span>
                              <ChevronDown size={13} color="var(--adm-text-muted)" />
                            </button>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <input
                                type="text"
                                value={customTypeInput}
                                onChange={(e) => setCustomTypeInput(e.target.value)}
                                placeholder="Nome do tipo..."
                                autoFocus
                                className="adm-input"
                                style={{ height: '32px', fontSize: '0.76rem', padding: '0 8px', borderRadius: '6px', width: '150px' }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (customTypeInput.trim()) {
                                      setQuickFollowupType(customTypeInput.trim());
                                    }
                                    setIsCustomTypeEditing(false);
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (customTypeInput.trim()) {
                                    setQuickFollowupType(customTypeInput.trim());
                                  }
                                  setIsCustomTypeEditing(false);
                                }}
                                style={{ padding: '5px 8px', borderRadius: '6px', background: 'var(--adm-accent, #0284C7)', border: 'none', color: '#fff', cursor: 'pointer' }}
                              >
                                <Check size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsCustomTypeEditing(false)}
                                style={{ padding: '5px 8px', borderRadius: '6px', background: 'transparent', border: '1px solid var(--adm-border)', color: 'var(--adm-text-muted)', cursor: 'pointer' }}
                              >
                                <X size={12} />
                              </button>
                            </div>
                          )}

                          {/* Popover Dropdown de Tipos */}
                          {isQuickTypePickerOpen && (
                            <div
                              style={{
                                position: 'absolute',
                                bottom: '100%',
                                left: 0,
                                marginBottom: '6px',
                                zIndex: 999,
                                background: 'var(--adm-bg-card)',
                                border: '1px solid var(--adm-border)',
                                borderRadius: '12px',
                                boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
                                width: '240px',
                                padding: '6px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                              }}
                            >
                              {FOLLOWUP_TYPES.map(t => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => {
                                    setQuickFollowupType(t);
                                    setIsQuickTypePickerOpen(false);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '7px 10px',
                                    borderRadius: '6px',
                                    background: quickFollowupType === t ? 'rgba(2, 132, 199, 0.12)' : 'transparent',
                                    border: 'none',
                                    color: quickFollowupType === t ? 'var(--adm-accent, #0284C7)' : 'var(--adm-text-title)',
                                    fontSize: '0.78rem',
                                    fontWeight: quickFollowupType === t ? 700 : 500,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                  }}
                                >
                                  {renderTaskTypeLucideIcon(t, 14)}
                                  <span style={{ flex: 1 }}>{t}</span>
                                  {quickFollowupType === t && <Check size={13} color="var(--adm-accent, #0284C7)" />}
                                </button>
                              ))}

                              <div style={{ borderTop: '1px solid var(--adm-border)', marginTop: '4px', paddingTop: '4px' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsQuickTypePickerOpen(false);
                                    setCustomTypeInput('');
                                    setIsCustomTypeEditing(true);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '7px 10px',
                                    borderRadius: '6px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--adm-accent, #0284C7)',
                                    fontSize: '0.76rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    width: '100%',
                                    textAlign: 'left',
                                  }}
                                >
                                  <Edit3 size={13} />
                                  <span>Outro (Personalizado)...</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 2. Seletor Popover de Data e Horário Unificados */}
                        <div style={{ position: 'relative' }} ref={quickDatePickerRef}>
                          <button
                            type="button"
                            onClick={() => setIsQuickDatePickerOpen(!isQuickDatePickerOpen)}
                            style={{
                              background: 'var(--adm-bg-input)',
                              color: 'var(--adm-text-title)',
                              border: '1px solid var(--adm-border)',
                              borderRadius: '8px',
                              padding: '6px 12px',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '7px',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            title="Escolher data e horário do follow-up"
                          >
                            <Calendar size={14} style={{ color: 'var(--adm-accent, #0284C7)' }} />
                            <span>
                              {formatQuickDateLabel(quickFollowupDate)}
                              {quickFollowupTime ? ` às ${quickFollowupTime}` : ''}
                            </span>
                            <ChevronDown size={13} style={{ color: 'var(--adm-text-muted)' }} />
                          </button>

                          {isQuickDatePickerOpen && (
                            <div style={{
                              position: 'absolute',
                              bottom: '100%',
                              left: 0,
                              marginBottom: '6px',
                              zIndex: 999,
                              background: 'var(--adm-bg-card)',
                              border: '1px solid var(--adm-border)',
                              borderRadius: '14px',
                              boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                              width: '275px',
                              padding: '14px',
                              boxSizing: 'border-box',
                            }}>
                              {/* Top Header com Mês e Atalhos */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <MonthYearSwitcher year={quickCalendarMonth.getFullYear()} month={quickCalendarMonth.getMonth()} label={quickMonthTitle}
                                  onChange={(y, m) => setQuickCalendarMonth(new Date(y, m, 1))} style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--adm-text-title)' }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setQuickFollowupDate(todayStr);
                                    }}
                                    style={{
                                      background: 'rgba(2, 132, 199, 0.12)',
                                      border: '1px solid rgba(2, 132, 199, 0.25)',
                                      color: 'var(--adm-accent, #0284C7)',
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      padding: '2px 6px',
                                      borderRadius: '5px',
                                    }}
                                  >
                                    Hoje
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setQuickFollowupDate(tomorrowStr);
                                    }}
                                    style={{
                                      background: 'transparent',
                                      border: '1px solid var(--adm-border)',
                                      color: 'var(--adm-text-muted)',
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      padding: '2px 6px',
                                      borderRadius: '5px',
                                    }}
                                  >
                                    Amanhã
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setQuickCalendarMonth(new Date(quickCalendarMonth.getFullYear(), quickCalendarMonth.getMonth() - 1, 1))}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer', padding: '3px' }}
                                  >
                                    <ChevronLeft size={15} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setQuickCalendarMonth(new Date(quickCalendarMonth.getFullYear(), quickCalendarMonth.getMonth() + 1, 1))}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer', padding: '3px' }}
                                  >
                                    <ChevronRight size={15} />
                                  </button>
                                </div>
                              </div>

                              {/* Dias da Semana */}
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '0.66rem', color: 'var(--adm-text-muted)', marginBottom: '6px', fontWeight: 700 }}>
                                <span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span>
                              </div>

                              {/* Grid de Dias */}
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center', marginBottom: '10px' }}>
                                {quickCalendarDays.map((d, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => {
                                      setQuickFollowupDate(d.dateStr);
                                    }}
                                    style={{
                                      background: d.isSelected 
                                        ? 'var(--adm-accent, #0284C7)' 
                                        : (d.isToday ? 'rgba(2, 132, 199, 0.15)' : 'transparent'),
                                      color: d.isSelected 
                                        ? '#FFFFFF' 
                                        : (d.isCurrentMonth ? 'var(--adm-text-title)' : 'var(--adm-text-muted)'),
                                      border: d.isToday && !d.isSelected ? '1px solid var(--adm-accent, #0284C7)' : 'none',
                                      borderRadius: '6px',
                                      padding: '5px 0',
                                      fontSize: '0.74rem',
                                      fontWeight: d.isSelected || d.isToday ? 800 : 500,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {d.day}
                                  </button>
                                ))}
                              </div>

                              {/* Toggles & Options padrão Bloco de Notas Inteligente */}
                              <div style={{ borderTop: '1px solid var(--adm-border)', marginTop: '8px', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.74rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <span style={{ color: 'var(--adm-text-title)', fontWeight: 600 }}>Incluir hora</span>
                                  <input 
                                    type="checkbox" 
                                    checked={Boolean(quickFollowupTime)} 
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setQuickFollowupTime('14:00');
                                      } else {
                                        setQuickFollowupTime('');
                                      }
                                    }} 
                                  />
                                </div>

                                {Boolean(quickFollowupTime) && (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: 'var(--adm-bg-input)', padding: '4px 8px', borderRadius: '6px' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <Clock size={12} color="var(--adm-accent, #0284C7)" />
                                      Horário:
                                    </span>
                                    <input
                                      type="time"
                                      value={quickFollowupTime}
                                      onChange={(e) => setQuickFollowupTime(e.target.value)}
                                      className="adm-input"
                                      style={{
                                        height: '26px',
                                        fontSize: '0.74rem',
                                        borderRadius: '4px',
                                        padding: '0 6px',
                                        width: '88px',
                                        fontWeight: 600,
                                      }}
                                    />
                                  </div>
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setQuickFollowupDate(todayStr);
                                      setQuickFollowupTime('');
                                      setIsQuickDatePickerOpen(false);
                                    }}
                                    style={{ background: 'transparent', border: 'none', color: '#EF4444', fontSize: '0.72rem', cursor: 'pointer', padding: 0 }}
                                  >
                                    Limpar
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setIsQuickDatePickerOpen(false)}
                                    style={{
                                      padding: '3px 10px',
                                      borderRadius: '6px',
                                      background: 'var(--adm-accent, #0284C7)',
                                      border: 'none',
                                      color: '#fff',
                                      fontSize: '0.70rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Pronto
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* LINHA INFERIOR: CAIXA DE TEXTO ESTILO CHAT WHATSAPP + BOTÃO ENVIAR */}
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                        <textarea
                          value={quickFollowupNote}
                          onChange={(e) => setQuickFollowupNote(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleCreateQuickFollowup();
                            }
                          }}
                          placeholder="Resumo do follow-up (opcional)... [Enter para agendar]"
                          className="adm-input"
                          rows={2}
                          style={{
                            flex: 1,
                            minHeight: '40px',
                            maxHeight: '120px',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            padding: '8px 12px',
                            background: 'var(--adm-bg-input)',
                            color: 'var(--adm-text-title)',
                            border: '1px solid var(--adm-border)',
                            resize: 'none',
                            lineHeight: 1.4,
                          }}
                        />

                        <button
                          type="submit"
                          className="adm-btn-primary"
                          style={{
                            height: '40px',
                            padding: '0 16px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            background: 'var(--adm-accent, #0284C7)',
                            border: '1px solid var(--adm-accent, #0284C7)',
                            color: '#FFFFFF',
                            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
                            whiteSpace: 'nowrap',
                          }}
                          title="Agendar follow-up (Enter)"
                        >
                          <Send size={13} />
                          <span>Agendar Follow-up</span>
                        </button>
                      </div>
                    </form>
                  </div>
                ) : composerTab === 'notes' ? (
                  /* 4. COMPOSER: ANOTAÇÕES MULTIMÍDIA COM GRAVADOR DE VOZ E COMPRESSÃO */
                  isNoteRecording ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: isDarkMode ? '#202c33' : '#ffffff',
                      borderRadius: '24px',
                      padding: '6px 14px',
                      gap: '12px',
                      border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
                      boxShadow: isDarkMode ? '0 2px 10px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,0,0,0.06)',
                    }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (noteRecordingTimerRef.current) clearInterval(noteRecordingTimerRef.current);
                          if (noteMediaRecorderRef.current && noteMediaRecorderRef.current.state !== 'inactive') {
                            noteMediaRecorderRef.current.stop();
                          }
                          if (noteAudioStreamRef.current) {
                            noteAudioStreamRef.current.getTracks().forEach(t => t.stop());
                          }
                          setIsNoteRecording(false);
                          setIsNoteAudioPaused(false);
                          setNoteRecordingSeconds(0);
                        }}
                        title="Cancelar gravação de áudio"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: isDarkMode ? '#8696a0' : '#64748b',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={18} />
                      </button>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: '#ef4444',
                          boxShadow: isNoteAudioPaused ? 'none' : '0 0 8px #ef4444',
                          animation: isNoteAudioPaused ? 'none' : 'pulse 1.2s infinite',
                        }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isDarkMode ? '#e9edef' : '#111827', fontFamily: 'monospace' }}>
                          {Math.floor(noteRecordingSeconds / 60)}:{(noteRecordingSeconds % 60).toString().padStart(2, '0')}
                        </span>
                      </div>

                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', height: '24px', overflow: 'hidden' }}>
                        {[4, 8, 14, 20, 12, 18, 22, 16, 10, 18, 24, 14, 8, 16, 22, 12, 6, 15, 20, 10].map((h, idx) => (
                          <div
                            key={idx}
                            style={{
                              width: '3px',
                              borderRadius: '2px',
                              backgroundColor: isNoteAudioPaused ? (isDarkMode ? '#8696a0' : '#94a3b8') : 'var(--adm-accent, #6366F1)',
                              height: isNoteAudioPaused ? '4px' : `${Math.max(4, (h * ((noteRecordingSeconds % 3 + 1) * 0.4 + 0.3)))}px`,
                              transition: 'height 0.15s ease',
                            }}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          if (!noteMediaRecorderRef.current || !selectedLead) return;
                          if (noteRecordingTimerRef.current) clearInterval(noteRecordingTimerRef.current);
                          const recorder = noteMediaRecorderRef.current;
                          recorder.onstop = () => {
                            const audioBlob = new Blob(noteAudioChunksRef.current, { type: 'audio/ogg; codecs=opus' });
                            const reader = new FileReader();
                            reader.onload = () => {
                              const dataUrl = reader.result as string;
                              const act: LeadActivity = {
                                id: generateUuid(),
                                leadId: selectedLead.id,
                                timestamp: new Date().toISOString(),
                                type: 'note',
                                title: 'Áudio Gravado na Nota',
                                text: `Nota de voz gravada (${Math.floor(noteRecordingSeconds / 60)}:${(noteRecordingSeconds % 60).toString().padStart(2, '0')})`,
                                mediaUrl: dataUrl,
                                mediaType: 'audio',
                                authorName: currentUser?.name || 'Colaborador',
                                authorId: currentUser?.id,
                                authorAvatarUrl: currentUser?.avatarUrl,
                              };
                              if (addLeadActivity) addLeadActivity(selectedLead.id, act);
                              else addLeadNote(selectedLead.id, act.text || 'Nota de voz gravada');
                            };
                            reader.readAsDataURL(audioBlob);
                            if (noteAudioStreamRef.current) {
                              noteAudioStreamRef.current.getTracks().forEach(t => t.stop());
                            }
                          };
                          recorder.stop();
                          setIsNoteRecording(false);
                          setIsNoteAudioPaused(false);
                          setNoteRecordingSeconds(0);
                        }}
                        title="Salvar áudio na nota"
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--adm-accent, #6366F1)',
                          border: 'none',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)',
                        }}
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSendMessage} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* Quick Preset Pills */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {['Tentativa 1 (Sem resposta)', 'Tentativa 2 (Caixa postal)', 'Orçamento enviado', 'Visita confirmada'].map(preset => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setMessageText(prev => prev ? `${prev} - ${preset}` : preset)}
                            style={{
                              background: 'var(--adm-bg-card)',
                              border: '1px solid var(--adm-border)',
                              borderRadius: '6px',
                              padding: '3px 8px',
                              fontSize: '0.68rem',
                              color: 'var(--adm-text-muted)',
                              cursor: 'pointer',
                            }}
                          >
                            + {preset}
                          </button>
                        ))}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Botão de Anexo na Nota */}
                        <button
                          type="button"
                          onClick={() => noteMediaInputRef.current?.click()}
                          title="Anexar foto ou vídeo na nota (comprimido em WebP)"
                          style={{
                            background: 'var(--adm-bg-card)',
                            border: '1px solid var(--adm-border)',
                            borderRadius: '10px',
                            width: '42px',
                            height: '42px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--adm-text-muted)',
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          <ImageIcon size={18} />
                        </button>

                        <button
                          type="button"
                          onClick={() => noteDocInputRef.current?.click()}
                          title="Anexar documento na nota"
                          style={{
                            background: 'var(--adm-bg-card)',
                            border: '1px solid var(--adm-border)',
                            borderRadius: '10px',
                            width: '42px',
                            height: '42px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--adm-text-muted)',
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          <FileText size={18} />
                        </button>

                        <input
                          type="text"
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          placeholder="Escreva uma nota interna sobre o atendimento deste lead..."
                          className="adm-input"
                          style={{ flex: 1, height: '42px', borderRadius: '12px', fontSize: '0.82rem' }}
                        />

                        {messageText.trim().length > 0 ? (
                          <button
                            type="submit"
                            className="adm-btn-primary"
                            style={{
                              height: '42px',
                              padding: '0 16px',
                              borderRadius: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                            }}
                          >
                            <Check size={14} />
                            <span>Salvar Nota</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                                noteAudioStreamRef.current = stream;
                                noteAudioChunksRef.current = [];
                                const mediaRecorder = new MediaRecorder(stream);
                                noteMediaRecorderRef.current = mediaRecorder;
                                mediaRecorder.ondataavailable = (e) => {
                                  if (e.data && e.data.size > 0) {
                                    noteAudioChunksRef.current.push(e.data);
                                  }
                                };
                                mediaRecorder.start(200);
                                setIsNoteRecording(true);
                                setIsNoteAudioPaused(false);
                                setNoteRecordingSeconds(0);
                                noteRecordingTimerRef.current = setInterval(() => {
                                  setNoteRecordingSeconds(prev => prev + 1);
                                }, 1000);
                              } catch {
                                toast.warning('Permissão de microfone necessária para gravar áudio na nota.');
                              }
                            }}
                            title="Gravar nota de voz"
                            style={{
                              background: 'var(--adm-bg-card)',
                              border: '1px solid var(--adm-border)',
                              borderRadius: '10px',
                              width: '42px',
                              height: '42px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--adm-text-muted)',
                              cursor: 'pointer',
                              flexShrink: 0,
                            }}
                          >
                            <Mic size={18} />
                          </button>
                        )}
                      </div>
                    </form>
                  )
                ) : (
                  /* 3. COMPOSER: WHATSAPP REAL (Áudios 2, 3, 4 e Prints 1, 2, 3) */
                  isRecording ? (
                    /* ── BARRA DE GRAVAÇÃO DE ÁUDIO AO VIVO ESTILO WHATSAPP WEB REAL (Print 3) ── */
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: isDarkMode ? '#202c33' : '#ffffff',
                      borderRadius: '24px',
                      padding: '6px 14px',
                      gap: '12px',
                      border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
                      boxShadow: isDarkMode ? '0 2px 10px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,0,0,0.06)',
                    }}>
                      {/* Botão de Lixeira (Cancelar e Descartar Áudio) */}
                      <button
                        type="button"
                        onClick={cancelRecording}
                        title="Cancelar gravação"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: isDarkMode ? '#8696a0' : '#64748b',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'color 0.15s ease',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={(e) => e.currentTarget.style.color = isDarkMode ? '#8696a0' : '#64748b'}
                      >
                        <Trash2 size={18} />
                      </button>

                      {/* Ponto Vermelho Pulsante + Cronômetro 0:00 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: '#ef4444',
                          boxShadow: isAudioPaused ? 'none' : '0 0 8px #ef4444',
                          animation: isAudioPaused ? 'none' : 'pulse 1.2s infinite',
                        }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isDarkMode ? '#e9edef' : '#111827', fontFamily: 'monospace' }}>
                          {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')}
                        </span>
                      </div>

                      {/* Visualizador de Ondas de Áudio / Waveform Animado */}
                      <div style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '3px',
                        height: '24px',
                        overflow: 'hidden',
                      }}>
                        {[4, 8, 14, 20, 12, 18, 22, 16, 10, 18, 24, 14, 8, 16, 22, 12, 6, 15, 20, 10].map((h, idx) => (
                          <div
                            key={idx}
                            style={{
                              width: '3px',
                              borderRadius: '2px',
                              backgroundColor: isAudioPaused ? (isDarkMode ? '#8696a0' : '#94a3b8') : '#00a884',
                              height: isAudioPaused ? '4px' : `${Math.max(4, (h * ((recordingSeconds % 3 + 1) * 0.4 + 0.3)))}px`,
                              transition: 'height 0.15s ease',
                            }}
                          />
                        ))}
                      </div>

                      {/* Botão Pausar / Retomar Gravação */}
                      <button
                        type="button"
                        onClick={isAudioPaused ? resumeAudioRecording : pauseAudioRecording}
                        title={isAudioPaused ? "Retomar gravação" : "Pausar gravação"}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: isDarkMode ? '#8696a0' : '#64748b',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isAudioPaused ? <Play size={18} color="#00a884" /> : <Pause size={18} color="#ef4444" />}
                      </button>

                      {/* Botão Verde de Envio Direto (Sem preview intermediário) */}
                      <button
                        type="button"
                        onClick={stopAndSendAudio}
                        title="Enviar áudio agora"
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: '#00a884',
                          border: 'none',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(0, 168, 132, 0.4)',
                          transition: 'transform 0.15s ease',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  ) : (
                    /* ── BARRA DE INPUT ARREDONDADA ESTILO WHATSAPP WEB REAL (Print 1 & 2) ── */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
                      {/* Linha Superior: Remetente WhatsApp & Destinatário Decisor */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                        {/* Remetente WhatsApp Conectado (Isolado por Casa de Festa / Fixo por Canal) */}
                        <div ref={senderDropdownRef} style={{ position: 'relative' }}>
                          <button
                            type="button"
                            disabled={Boolean(channelExclusiveSource)}
                            onClick={() => {
                              if (!channelExclusiveSource) {
                                setIsSenderDropdownOpen(prev => !prev);
                              }
                            }}
                            title={channelExclusiveSource ? (forcedSource ? 'Número fixo do Financeiro' : `Chip Dedicado do Setor "${activePostSaleChannel?.name}" (Fixo e Imutável)`) : 'Selecionar instância de envio'}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '7px',
                              background: 'var(--adm-bg-card)',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              border: isSenderDisconnected 
                                ? '1px solid rgba(239, 68, 68, 0.4)' 
                                : channelExclusiveSource 
                                ? '1px solid rgba(212, 175, 55, 0.4)'
                                : isSenderDropdownOpen 
                                ? '1px solid #10B981' 
                                : '1px solid var(--adm-border)',
                              cursor: channelExclusiveSource ? 'default' : 'pointer',
                              transition: 'all 0.15s ease',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                            }}
                          >
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>
                              <ArrowUp size={13} aria-label="Disparado por" />
                            </span>

                            {/* WhatsApp Avatar ou Logo fica DEPOIS do texto 'Disparado por:' e ANTES do nome */}
                            {(() => {
                              const activeAvatar = getSourceAvatar(activeSenderSource);
                              if (activeAvatar) {
                                return (
                                  <img
                                    src={activeAvatar}
                                    alt="WhatsApp"
                                    style={{
                                      width: '18px',
                                      height: '18px',
                                      borderRadius: '50%',
                                      objectFit: 'cover',
                                      flexShrink: 0,
                                      border: `1px solid ${isSenderDisconnected ? '#EF4444' : '#10B981'}`
                                    }}
                                  />
                                );
                              }
                              return (
                                <div style={{
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '50%',
                                  background: isSenderDisconnected ? '#EF4444' : '#25D366',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}>
                                  <WhatsAppBrandIcon size={11} color="#FFFFFF" />
                                </div>
                              );
                            })()}

                            {activeSenderSource ? (() => {
                              const info = getSourceCleanLabel(activeSenderSource);
                              const online = !isSenderDisconnected;
                              return (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  fontWeight: 800,
                                  fontSize: '0.72rem',
                                  color: online ? (isDarkMode ? '#34D399' : '#059669') : '#EF4444',
                                  whiteSpace: 'nowrap',
                                }}>
                                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: online ? '#10B981' : '#EF4444', display: 'inline-block', flexShrink: 0 }} />
                                  <span style={{ whiteSpace: 'nowrap' }}>{info.cleanName}</span>
                                  {info.formattedPhone && (
                                    <span style={{ opacity: 0.85, fontWeight: 700, whiteSpace: 'nowrap' }}>• {info.formattedPhone}</span>
                                  )}
                                </span>
                              );
                            })() : (
                              <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#EF4444', whiteSpace: 'nowrap' }}>
                                Nenhuma instância disponível
                              </span>
                            )}

                            {channelExclusiveSource ? (
                              <span 
                                title={`Chip Exclusivo do Setor ${activePostSaleChannel?.name}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  background: 'rgba(212, 175, 55, 0.15)',
                                  color: '#D4AF37',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  fontSize: '0.62rem',
                                  fontWeight: 800,
                                  marginLeft: '2px',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0,
                                }}
                              >
                                <Lock size={10} />
                                <span>Fixo</span>
                              </span>
                            ) : (
                              venueSenderSources.length > 1 && (
                                <ChevronDown
                                  size={13}
                                  style={{
                                    transform: isSenderDropdownOpen ? 'rotate(180deg)' : 'rotate(0)',
                                    transition: 'transform 0.15s ease',
                                    color: 'var(--adm-text-muted)',
                                    marginLeft: '2px',
                                    flexShrink: 0,
                                  }}
                                />
                              )
                            )}
                            {Object.values(unreadByChip).some(n => n > 0) && (
                              <span title="Mensagem não lida em outro número" style={{ minWidth: 16, height: 16, borderRadius: 8, background: '#EF4444', color: '#fff', fontSize: '0.6rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', marginLeft: 2, flexShrink: 0 }}>
                                {Object.values(unreadByChip).reduce((x, y) => x + y, 0)}
                              </span>
                            )}
                          </button>

                          {/* Popup Dropdown de Instâncias (bloqueado em canais com chip dedicado) */}
                          {!channelExclusiveSource && isSenderDropdownOpen && venueSenderSources.length > 0 && (
                            <div style={{
                              position: 'absolute',
                              bottom: 'calc(100% + 6px)',
                              left: 0,
                              zIndex: 9999,
                              minWidth: '420px',
                              maxWidth: '480px',
                              background: 'var(--adm-bg-card, #1e293b)',
                              border: '1px solid var(--adm-border)',
                              borderRadius: '12px',
                              boxShadow: '0 12px 28px rgba(0,0,0,0.28)',
                              padding: '8px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              animation: 'fadeIn 0.15s ease-out',
                            }}>
                              <div style={{ padding: '4px 8px 6px', fontSize: '0.68rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Selecione a Instância de Disparo
                              </div>

                              {venueSenderSources.map(src => {
                                const isOnline = isSourceOnline(src);
                                const isSelected = activeSenderSource?.id === src.id;
                                const info = getSourceCleanLabel(src);
                                const vName = venues.find(v => v.id === src.venueId)?.name;
                                const instanceAvatar = getSourceAvatar(src);

                                return (
                                  <div
                                    key={src.id}
                                    onClick={() => {
                                      if (!isOnline) return; // Impede selecionar desconectado
                                      setSelectedSenderSourceId(src.id);
                                      if (selectedLead) {
                                        manuallySelectedSenderLeadIdRef.current = selectedLead.id;
                                        saveManualSender(selectedLead.id, src.id);
                                      }
                                      setIsSenderDropdownOpen(false);
                                    }}
                                    title={!isOnline ? 'Instância desconectada. Reconecte em Configurações > Origens.' : `Disparar por ${info.cleanName}`}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: '12px',
                                      padding: '9px 12px',
                                      borderRadius: '8px',
                                      cursor: isOnline ? 'pointer' : 'not-allowed',
                                      opacity: isOnline ? 1 : 0.85,
                                      background: isSelected
                                        ? (isDarkMode ? 'rgba(16, 185, 129, 0.18)' : '#ecfdf5')
                                        : !isOnline
                                          ? 'rgba(239, 68, 68, 0.08)'
                                          : 'transparent',
                                      border: isSelected
                                        ? '1.5px solid rgba(16, 185, 129, 0.5)'
                                        : !isOnline
                                          ? '1.5px solid rgba(239, 68, 68, 0.35)'
                                          : '1px solid transparent',
                                      transition: 'all 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                      if (isOnline && !isSelected) e.currentTarget.style.background = 'var(--adm-bg-input)';
                                    }}
                                    onMouseLeave={(e) => {
                                      if (isOnline && !isSelected) e.currentTarget.style.background = 'transparent';
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                      {instanceAvatar ? (
                                        <SafeAvatar name={info.cleanName} src={instanceAvatar} size={30} />
                                      ) : (
                                        <div style={{
                                          width: '30px',
                                          height: '30px',
                                          borderRadius: '50%',
                                          background: isOnline ? '#25D366' : '#EF4444',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          flexShrink: 0,
                                          boxShadow: isOnline ? '0 1px 4px rgba(37, 211, 102, 0.3)' : '0 1px 4px rgba(239, 68, 68, 0.3)',
                                        }}>
                                          <WhatsAppBrandIcon size={16} color="#FFFFFF" />
                                        </div>
                                      )}

                                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: '2px', flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexWrap: 'nowrap' }}>
                                          <span style={{ fontSize: '0.80rem', fontWeight: 800, color: isOnline ? 'var(--adm-text-title)' : '#EF4444', whiteSpace: 'nowrap' }}>
                                            {info.cleanName}
                                          </span>
                                          {vName && (
                                            <span style={{ fontSize: '0.62rem', padding: '1px 7px', borderRadius: '4px', background: 'var(--adm-bg-input)', color: 'var(--adm-text-muted)', border: '1px solid var(--adm-border)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                              {vName}
                                            </span>
                                          )}
                                        </div>
                                        {info.formattedPhone && (
                                          <span style={{ fontSize: '0.70rem', color: isOnline ? 'var(--adm-text-muted)' : '#EF4444', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                            {info.formattedPhone}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                      {(unreadByChip[src.id] || 0) > 0 && (
                                        <span title="Mensagens não lidas neste número" style={{ minWidth: 18, height: 18, borderRadius: 9, background: '#EF4444', color: '#fff', fontSize: '0.64rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', flexShrink: 0 }}>
                                          {unreadByChip[src.id]}
                                        </span>
                                      )}
                                      <span style={{
                                        fontSize: '0.64rem',
                                        fontWeight: 800,
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        background: isOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                        color: isOnline ? '#10B981' : '#EF4444',
                                        border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                        whiteSpace: 'nowrap',
                                        flexShrink: 0,
                                      }}>
                                        {isOnline ? 'Online' : 'Desconectada'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Seletor de Contato / Destinatário */}
                        {availableRecipients.length > 0 && (
                          <div ref={recipientDropdownRef} style={{ position: 'relative' }}>
                            {availableRecipients.length === 1 ? (
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: 'var(--adm-bg-card)',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                border: '1px solid var(--adm-border)',
                              }}>
                                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>
                                  <ArrowDown size={13} aria-label="Enviado para" />
                                </span>

                                {/* Foto / Avatar do destinatário antes do nome */}
                                {peerOfRecipient(availableRecipients[0]).avatarUrl ? (
                                  <img
                                    src={peerOfRecipient(availableRecipients[0]).avatarUrl}
                                    alt={availableRecipients[0].name}
                                    style={{
                                      width: '18px',
                                      height: '18px',
                                      borderRadius: '50%',
                                      objectFit: 'cover',
                                      flexShrink: 0,
                                      border: '1px solid #10B981'
                                    }}
                                  />
                                ) : (
                                  <div style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    background: 'rgba(16, 185, 129, 0.2)',
                                    color: '#10B981',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.60rem',
                                    fontWeight: 800,
                                    flexShrink: 0,
                                    border: '1px solid #10B981'
                                  }}>
                                    {(availableRecipients[0].name || 'C').slice(0, 1).toUpperCase()}
                                  </div>
                                )}

                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span>{formatPersonShortName(availableRecipients[0].name)}</span>
                                  {availableRecipients[0].isDecisor ? (
                                    <span title="Decisor" style={{ display: 'inline-flex', alignItems: 'center' }}><BadgeCheck size={11} color="#10B981" /></span>
                                  ) : availableRecipients[0].roleBadge?.toLowerCase().includes('protagonista') ? (
                                    <span title="Protagonista" style={{ display: 'inline-flex', alignItems: 'center' }}><Sparkles size={11} color="#EC4899" /></span>
                                  ) : (
                                    <span title="Familiar" style={{ display: 'inline-flex', alignItems: 'center' }}><Users size={11} color="#3B82F6" /></span>
                                  )}
                                </span>
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setIsRecipientDropdownOpen(prev => !prev)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: 'var(--adm-bg-card)',
                                    padding: '4px 10px',
                                    borderRadius: '8px',
                                    border: isRecipientDropdownOpen ? '1px solid #10B981' : '1px solid var(--adm-border)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                  }}
                                >
                                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>
                                    <ArrowDown size={13} aria-label="Enviado para" />
                                  </span>

                                  {(() => {
                                    const currentRec = availableRecipients.find(r => (selectedRecipientKey && r.key === selectedRecipientKey) || ((selectedRecipientPhone || selectedLead?.phone) === r.phone)) || availableRecipients[0];
                                    const recAvatar = peerOfRecipient(currentRec).avatarUrl;

                                    return (
                                      <>
                                        {recAvatar ? (
                                          <img
                                            src={recAvatar}
                                            alt={currentRec.name}
                                            style={{
                                              width: '18px',
                                              height: '18px',
                                              borderRadius: '50%',
                                              objectFit: 'cover',
                                              flexShrink: 0,
                                              border: '1px solid #10B981'
                                            }}
                                          />
                                        ) : (
                                          <div style={{
                                            width: '18px',
                                            height: '18px',
                                            borderRadius: '50%',
                                            background: 'rgba(16, 185, 129, 0.2)',
                                            color: '#10B981',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.60rem',
                                            fontWeight: 800,
                                            flexShrink: 0,
                                            border: '1px solid #10B981'
                                          }}>
                                            {(currentRec.name || 'C').slice(0, 1).toUpperCase()}
                                          </div>
                                        )}

                                        <span style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '5px',
                                          fontSize: '0.72rem',
                                          fontWeight: 800,
                                          color: '#10B981',
                                        }}>
                                          <span>{formatPersonShortName(currentRec.name)}</span>
                                          {currentRec.isDecisor ? (
                                            <span title="Decisor" style={{ display: 'inline-flex', alignItems: 'center' }}><BadgeCheck size={11} color="#10B981" /></span>
                                          ) : currentRec.roleBadge?.toLowerCase().includes('protagonista') ? (
                                            <span title="Protagonista" style={{ display: 'inline-flex', alignItems: 'center' }}><Sparkles size={11} color="#EC4899" /></span>
                                          ) : (
                                            <span title="Familiar" style={{ display: 'inline-flex', alignItems: 'center' }}><Users size={11} color="#3B82F6" /></span>
                                          )}
                                        </span>
                                      </>
                                    );
                                  })()}
                                  <ChevronDown
                                    size={13}
                                    style={{
                                      transform: isRecipientDropdownOpen ? 'rotate(180deg)' : 'rotate(0)',
                                      transition: 'transform 0.15s ease',
                                      color: 'var(--adm-text-muted)',
                                      marginLeft: '2px'
                                    }}
                                  />
                                </button>

                                {/* Dropdown Menu de Destinatários */}
                                {isRecipientDropdownOpen && (
                                  <div style={{
                                    position: 'absolute',
                                    bottom: 'calc(100% + 6px)',
                                    right: 0,
                                    zIndex: 9999,
                                    minWidth: '290px',
                                    background: 'var(--adm-bg-card, #1e293b)',
                                    border: '1px solid var(--adm-border)',
                                    borderRadius: '12px',
                                    boxShadow: '0 12px 28px rgba(0,0,0,0.28)',
                                    padding: '6px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                    animation: 'fadeIn 0.15s ease-out',
                                  }}>
                                    <div style={{ padding: '6px 8px 4px', fontSize: '0.68rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                      Selecione o Destinatário
                                    </div>

                                    {availableRecipients.map((rec) => {
                                      const isSelected = activeRecipient?.key 
                                        ? activeRecipient.key === rec.key 
                                        : (selectedRecipientPhone || selectedLead?.phone) === rec.phone;
                                      return (
                                        <div
                                          key={rec.key || rec.phone}
                                          onClick={() => {
                                            recipientTouchedRef.current = selectedLead?.id || null;
                                            if (rec.key) setSelectedRecipientKey(rec.key);
                                            if (rec.phone) setSelectedRecipientPhone(rec.phone);
                                            setIsRecipientDropdownOpen(false);
                                          }}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: '10px',
                                            padding: '8px 10px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            background: isSelected
                                              ? (isDarkMode ? 'rgba(16, 185, 129, 0.18)' : '#ecfdf5')
                                              : 'transparent',
                                            border: isSelected
                                              ? '1.5px solid rgba(16, 185, 129, 0.5)'
                                              : '1px solid transparent',
                                            transition: 'all 0.15s ease',
                                          }}
                                          onMouseEnter={(e) => {
                                            if (!isSelected) e.currentTarget.style.background = 'var(--adm-bg-input)';
                                          }}
                                          onMouseLeave={(e) => {
                                            if (!isSelected) e.currentTarget.style.background = 'transparent';
                                          }}
                                        >
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0, flex: 1 }}>
                                            <SafeAvatar
                                              name={rec.name}
                                              src={rec.avatarUrl}
                                              size={28}
                                            />

                                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                                                  {rec.name}
                                                </span>
                                                {rec.isMain && (
                                                  <span style={{ fontSize: '0.60rem', padding: '1px 5px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6', fontWeight: 800 }}>
                                                    Principal
                                                  </span>
                                                )}
                                                {rec.roleBadge && rec.roleBadge !== 'Principal' && rec.roleBadge !== 'Contato' && (
                                                  <span style={{ fontSize: '0.60rem', padding: '1px 5px', borderRadius: '4px', background: 'var(--adm-bg-input)', color: 'var(--adm-text-muted)', border: '1px solid var(--adm-border)', fontWeight: 700 }}>
                                                    {rec.roleBadge}
                                                  </span>
                                                )}
                                                {rec.isDecisor && (
                                                  <span style={{ fontSize: '0.60rem', padding: '1px 5px', borderRadius: '4px', background: 'rgba(212, 175, 55, 0.15)', color: '#D4AF37', fontWeight: 800 }}>
                                                    Decisor
                                                  </span>
                                                )}
                                              </div>
                                              {rec.phone && (
                                                <span style={{ fontSize: '0.70rem', color: 'var(--adm-text-muted)', fontWeight: 600 }}>
                                                  {formatPhone(rec.phone)}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Banner de Alerta se o Remetente Selecionado estiver Desconectado */}
                      {isSenderDisconnected && activeSenderSource && (
                        <div style={{
                          background: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.35)',
                          borderRadius: '10px',
                          padding: '6px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          flexWrap: 'wrap',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#EF4444', fontWeight: 700 }}>
                            <AlertTriangle size={14} color="#EF4444" />
                            <span>
                              {channelExclusiveSource 
                                ? <>O chip dedicado do setor <strong>{activePostSaleChannel?.name}</strong> ({activeSenderSource.name}) está desconectado.</>
                                : <>A instância <strong>{activeSenderSource.name}</strong> está desconectada do WhatsApp.</>
                              }
                            </span>
                          </div>

                          {/* Se for canal setorial exclusivo com chip fixo: NÃO sugere mudar para outro número. Se for Master/Gerente, exibe botão de QR Code */}
                          {channelExclusiveSource ? (
                            isMasterOrManager ? (
                              <button
                                type="button"
                                onClick={() => {
                                  window.dispatchEvent(new CustomEvent('admin_switch_tab', { detail: { tab: 'sources' } }));
                                }}
                                title="Abrir Central de Origens para escanear o QR Code deste número"
                                style={{
                                  background: '#14A9D7',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '4px 10px',
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  boxShadow: '0 2px 6px rgba(20, 169, 215, 0.35)',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <QrCode size={13} />
                                <span>Conectar no QR Code (Origens)</span>
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', fontWeight: 600 }}>
                                Solicite à gerência a reconexão deste chip.
                              </span>
                            )
                          ) : (
                            /* No Geral: permite alternar para outra instância online */
                            connectedAlternativeSource && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSenderSourceId(connectedAlternativeSource.id);
                                  if (selectedLead) saveManualSender(selectedLead.id, connectedAlternativeSource.id);
                                  if (selectedLead) {
                                    manuallySelectedSenderLeadIdRef.current = selectedLead.id;
                                  }
                                }}
                                style={{
                                  background: '#10B981',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '3px 9px',
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Zap size={11} />
                                <span>Mudar para {connectedAlternativeSource.name} (Online)</span>
                              </button>
                            )
                          )}
                        </div>
                      )}

                      {/* Popover de Anexos Suspenso (Documento, Fotos e vídeos, Áudio) */}
                      {isAttachmentMenuOpen && (
                        <div
                          ref={attachmentMenuRef}
                          style={{
                            position: 'absolute',
                            bottom: 'calc(100% + 8px)',
                            left: '8px',
                            background: isDarkMode ? '#233138' : '#ffffff',
                            borderRadius: '16px',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                            border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
                            padding: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            zIndex: 9999,
                            minWidth: '180px',
                          }}
                        >
                          {/* 1. Documento (Roxo) */}
                          <button
                            type="button"
                            onClick={() => handleTriggerFileInput('document')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '10px 14px',
                              borderRadius: '10px',
                              background: 'transparent',
                              border: 'none',
                              color: isDarkMode ? '#e9edef' : '#111b21',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'background 0.15s ease',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#7f66ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                              <FileText size={15} />
                            </div>
                            <span>Documento</span>
                          </button>

                          {/* 2. Fotos e vídeos (Azul) */}
                          <button
                            type="button"
                            onClick={() => handleTriggerFileInput('media')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '10px 14px',
                              borderRadius: '10px',
                              background: 'transparent',
                              border: 'none',
                              color: isDarkMode ? '#e9edef' : '#111b21',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'background 0.15s ease',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#007bff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                              <ImageIcon size={15} />
                            </div>
                            <span>Fotos e vídeos</span>
                          </button>

                          {/* 3. Áudio (Laranja) */}
                          <button
                            type="button"
                            onClick={() => handleTriggerFileInput('audio')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '10px 14px',
                              borderRadius: '10px',
                              background: 'transparent',
                              border: 'none',
                              color: isDarkMode ? '#e9edef' : '#111b21',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'background 0.15s ease',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#ff6b00', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                              <Headphones size={15} />
                            </div>
                            <span>Áudio</span>
                          </button>

                          {/* 4. Contato (Verde Esmeralda) */}
                          <button
                            type="button"
                            onClick={() => {
                              setIsAttachmentMenuOpen(false);
                              setIsShareContactModalOpen(true);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '10px 14px',
                              borderRadius: '10px',
                              background: 'transparent',
                              border: 'none',
                              color: isDarkMode ? '#e9edef' : '#111b21',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'background 0.15s ease',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#00a884', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                              <User size={15} />
                            </div>
                            <span>Contato</span>
                          </button>
                        </div>
                      )}

                      {/* Popover de Emojis e Figurinhas (Stickers) Suspenso */}
                      {isEmojiPickerOpen && (
                        <div
                          ref={emojiPickerRef}
                          style={{
                            position: 'absolute',
                            bottom: 'calc(100% + 8px)',
                            left: '42px',
                            background: isDarkMode ? '#233138' : '#ffffff',
                            borderRadius: '16px',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
                            border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                            padding: '10px',
                            zIndex: 9999,
                            width: '330px',
                            boxSizing: 'border-box',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                          }}
                        >
                          {/* Seletor de Abas: Emojis vs Figurinhas */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderBottom: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)', paddingBottom: '8px' }}>
                            <button
                              type="button"
                              onClick={() => setActiveEmojiTab('emojis')}
                              style={{
                                flex: 1,
                                padding: '5px 8px',
                                borderRadius: '8px',
                                border: 'none',
                                background: activeEmojiTab === 'emojis' ? '#00a884' : (isDarkMode ? 'rgba(255,255,255,0.06)' : '#f0f2f5'),
                                color: activeEmojiTab === 'emojis' ? '#fff' : (isDarkMode ? '#8696a0' : '#54656f'),
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '5px',
                              }}
                            >
                              <span>🙂 Emojis</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setActiveEmojiTab('stickers')}
                              style={{
                                flex: 1,
                                padding: '5px 8px',
                                borderRadius: '8px',
                                border: 'none',
                                background: activeEmojiTab === 'stickers' ? '#00a884' : (isDarkMode ? 'rgba(255,255,255,0.06)' : '#f0f2f5'),
                                color: activeEmojiTab === 'stickers' ? '#fff' : (isDarkMode ? '#8696a0' : '#54656f'),
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '5px',
                              }}
                            >
                              <span>✨ Figurinhas</span>
                            </button>
                          </div>

                          {activeEmojiTab === 'emojis' ? (
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(8, 34px)',
                              justifyContent: 'center',
                              gap: '4px',
                              maxHeight: '220px',
                              overflowY: 'auto',
                            }}>
                              {WHATSAPP_EMOJI_LIST.map((emoji, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setMessageText(prev => prev + emoji);
                                    setIsEmojiPickerOpen(false);
                                  }}
                                  style={{
                                    width: '34px',
                                    height: '34px',
                                    padding: 0,
                                    background: 'transparent',
                                    border: 'none',
                                    fontSize: '1.25rem',
                                    lineHeight: 1,
                                    cursor: 'pointer',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'background 0.1s ease',
                                    userSelect: 'none',
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          ) : (
                            /* Aba de Figurinhas (Stickers) Limpa & Customizável */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.7rem', color: isDarkMode ? '#8696a0' : '#64748b', fontWeight: 600 }}>Figurinhas da Empresa</span>
                                <button
                                  type="button"
                                  onClick={() => fileStickerInputRef.current?.click()}
                                  style={{
                                    background: 'rgba(0, 168, 132, 0.15)',
                                    border: '1px solid rgba(0, 168, 132, 0.35)',
                                    color: '#00a884',
                                    borderRadius: '6px',
                                    padding: '2px 7px',
                                    fontSize: '0.66rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  + Nova Figurinha
                                </button>
                              </div>

                              <input
                                ref={fileStickerInputRef}
                                type="file"
                                accept="image/png,image/webp,image/jpeg,image/gif"
                                style={{ display: 'none' }}
                                onChange={handleUploadCustomSticker}
                              />

                              {customStickers.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '28px 12px', color: isDarkMode ? '#8696a0' : '#64748b' }}>
                                  <div style={{ fontSize: '0.80rem', fontWeight: 700, marginBottom: '4px', color: isDarkMode ? '#e2e8f0' : '#1e293b' }}>
                                    Nenhuma figurinha personalizada ainda
                                  </div>
                                  <div style={{ fontSize: '0.72rem', lineHeight: 1.4 }}>
                                    Clique em <strong>"+ Nova Figurinha"</strong> para fazer upload de figurinhas oficiais do seu negócio (.png, .webp, .gif).
                                  </div>
                                </div>
                              ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                  {customStickers.map((c, i) => (
                                    <button
                                      key={i}
                                      type="button"
                                      onClick={() => handleSendSticker(c)}
                                      title={`Enviar figurinha personalizada ${i + 1}`}
                                      style={{
                                        padding: '6px',
                                        borderRadius: '10px',
                                        background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                                        border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'transform 0.15s ease, background 0.15s ease',
                                        aspectRatio: '1',
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'scale(1.06)';
                                        e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'scale(1)';
                                        e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
                                      }}
                                    >
                                      <img
                                        src={c}
                                        alt={`Figurinha ${i + 1}`}
                                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                      />
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Barra de Pré-Visualização de Anexo no Chat (ex: Comprovante Oficial de Agendamento) */}
                      {pendingAttachment && (!pendingAttachment.leadId || pendingAttachment.leadId === selectedLead.id) && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          background: isDarkMode ? '#233138' : '#e9edef',
                          border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #d1d7db',
                          borderBottom: 'none',
                          borderRadius: '16px 16px 0 0',
                          padding: '10px 14px',
                          marginBottom: '-1px',
                          boxShadow: '0 -2px 10px rgba(0,0,0,0.06)',
                          width: '100%',
                          boxSizing: 'border-box',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                            {/* Miniatura Clicável com Efeito de Preview */}
                            <div 
                              onClick={() => setPreviewAttachmentUrl(pendingAttachment.dataUrl)}
                              title="Clique para visualizar o comprovante ampliado"
                              style={{
                                width: '52px',
                                height: '52px',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                border: '1.5px solid var(--adm-accent, #10B981)',
                                background: '#ffffff',
                                flexShrink: 0,
                                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                                cursor: 'pointer',
                                position: 'relative',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              <img
                                src={pendingAttachment.dataUrl}
                                alt={pendingAttachment.fileName}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '0.82rem',
                                fontWeight: 800,
                                color: isDarkMode ? '#e9edef' : '#111b21',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}>
                                <Sparkles size={14} color="#10B981" />
                                <span>{pendingAttachment.fileName}</span>
                              </div>
                              <div style={{
                                fontSize: '0.72rem',
                                color: isDarkMode ? '#8696a0' : '#667781',
                                marginTop: '2px',
                              }}>
                                Comprovante oficial anexado • Clique na foto para ampliar
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <span style={{
                              fontSize: '0.70rem',
                              fontWeight: 700,
                              color: '#10B981',
                              background: 'rgba(16, 185, 129, 0.12)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              padding: '3px 8px',
                              borderRadius: '6px',
                            }}>
                              Pronto para envio
                            </span>

                            <button
                              type="button"
                              onClick={() => setPendingAttachment(null)}
                              style={{
                                background: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '28px',
                                height: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: isDarkMode ? '#8696a0' : '#54656f',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              title="Remover comprovante do chat"
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                                e.currentTarget.style.color = '#EF4444';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
                                e.currentTarget.style.color = isDarkMode ? '#8696a0' : '#54656f';
                              }}
                            >
                              <X size={15} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Modal de Pré-Visualização da Imagem Anexada em Tela Cheia */}
                      {previewAttachmentUrl && (
                        <div 
                          onClick={() => setPreviewAttachmentUrl(null)}
                          style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.85)',
                            backdropFilter: 'blur(6px)',
                            zIndex: 999999,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '24px',
                            animation: 'fadeIn 0.2s ease-out',
                          }}
                        >
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              position: 'relative',
                              maxWidth: '90vw',
                              maxHeight: '90vh',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => setPreviewAttachmentUrl(null)}
                              style={{
                                position: 'absolute',
                                top: '-40px',
                                right: '0',
                                background: 'rgba(255,255,255,0.15)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ffffff',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              title="Fechar visualização"
                            >
                              <X size={18} />
                            </button>
                            <img 
                              src={previewAttachmentUrl} 
                              alt="Pré-visualização do comprovante" 
                              style={{
                                maxWidth: '100%',
                                maxHeight: '85vh',
                                borderRadius: '12px',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                objectFit: 'contain',
                              }}
                            />
                          </div>
                        </div>
                      )}

                                            {/* Cápsula Arredondada Estilo WhatsApp Web */}
                      {isGeneralHidden && activePostSaleChannelId === 'geral' ? (
                        <div style={{
                          padding: '12px 18px',
                          background: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                          border: '1px dashed var(--adm-border)',
                          borderRadius: '16px',
                          textAlign: 'center',
                          color: 'var(--adm-text-muted)',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          width: '100%',
                          boxSizing: 'border-box',
                        }}>
                          Canal Geral desativado para este funil. Selecione ou crie um setor acima para conversar com o lead.
                        </div>
                      ) : (
                        <>
                          {/* Barra de Resposta de Mensagem Acima do Campo de Input (Quote Preview) */}
                          {replyingToMessage && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 14px 8px 14px',
                          background: isDarkMode ? '#1e282f' : '#f0f2f5',
                          borderRadius: '16px 16px 0 0',
                          border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #d1d7db',
                          borderBottom: isDarkMode ? '1px solid rgba(255,255,255,0.04)' : '1px solid #e2e8f0',
                          boxShadow: isDarkMode ? 'none' : '0 -1px 2px rgba(11,20,26,0.04)',
                          width: '100%',
                          boxSizing: 'border-box',
                          gap: '12px',
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            overflow: 'hidden',
                            flex: 1,
                          }}>
                            {/* Barra vertical verde (idêntica às fotos do usuário) */}
                            <div style={{
                              width: '4px',
                              height: '32px',
                              borderRadius: '2px',
                              background: '#25d366',
                              flexShrink: 0,
                            }} />

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden', flex: 1 }}>
                              <span style={{
                                fontSize: '0.80rem',
                                fontWeight: 700,
                                color: '#25d366',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}>
                                {replyingToMessage.authorName || (replyingToMessage.type === 'contact' ? selectedLead?.name || 'Lead' : 'Você')}
                              </span>

                              {/* Conteúdo resumido */}
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '0.78rem',
                                color: isDarkMode ? '#aebac1' : '#667781',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}>
                                {replyingToMessage.mediaType === 'audio' || (replyingToMessage.mediaUrl && replyingToMessage.mediaUrl.startsWith('data:audio')) ? (
                                  <>
                                    <Mic size={14} color="#25d366" />
                                    <span>{(replyingToMessage as any).durationText || (replyingToMessage as any).mediaDuration || '0:04'}</span>
                                  </>
                                ) : replyingToMessage.mediaType === 'image' ? (
                                  <>
                                    <Camera size={14} color="#8696a0" />
                                    <span>Foto</span>
                                  </>
                                ) : replyingToMessage.mediaType === 'video' ? (
                                  <>
                                    <Video size={14} color="#8696a0" />
                                    <span>Vídeo</span>
                                  </>
                                ) : replyingToMessage.mediaType === 'document' ? (
                                  <>
                                    <FileText size={14} color="#8696a0" />
                                    <span>{replyingToMessage.text || 'Documento'}</span>
                                  </>
                                ) : (
                                  <span>{replyingToMessage.text || 'Mensagem'}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Botão Cancelar Resposta X */}
                          <button
                            type="button"
                            onClick={() => setReplyingToMessage(null)}
                            title="Cancelar resposta"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: isDarkMode ? '#8696a0' : '#54656f',
                              cursor: 'pointer',
                              padding: '5px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'color 0.15s ease',
                              flexShrink: 0,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = isDarkMode ? '#8696a0' : '#54656f')}
                          >
                            <X size={18} />
                          </button>
                        </div>
                      )}

                      {/* Prévia Estagiada de Mídia (Foto, Vídeo ou Documento) antes do envio com suporte a legenda */}
                      {stagedMedia && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: isDarkMode ? '#182229' : '#f0f2f5',
                          borderTopLeftRadius: '16px',
                          borderTopRightRadius: '16px',
                          border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #d1d7db',
                          borderBottom: 'none',
                          gap: '12px',
                          boxShadow: '0 -2px 6px rgba(0,0,0,0.03)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', flex: 1 }}>
                            {stagedMedia.category === 'image' ? (
                              <img
                                src={stagedMedia.previewUrl}
                                alt="Prévia"
                                onClick={() => setLightboxMedia({ url: stagedMedia.previewUrl, type: 'image', title: stagedMedia.fileName })}
                                style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', cursor: 'pointer', border: '1px solid var(--adm-border)' }}
                                title="Clique para ampliar imagem"
                              />
                            ) : stagedMedia.category === 'video' ? (
                              <div
                                onClick={() => setLightboxMedia({ url: stagedMedia.previewUrl, type: 'video', title: stagedMedia.fileName })}
                                style={{ position: 'relative', width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Clique para pré-visualizar vídeo"
                              >
                                <video src={stagedMedia.previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <Play size={16} color="#fff" style={{ position: 'absolute' }} fill="#fff" />
                              </div>
                            ) : stagedMedia.category === 'audio' ? (
                              <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#ff6b00', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                                <Headphones size={22} />
                              </div>
                            ) : (
                              <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#7f66ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                                <FileText size={22} />
                              </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: isDarkMode ? '#f1f5f9' : '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {stagedMedia.fileName}
                              </span>
                              <span style={{ fontSize: '0.70rem', color: isDarkMode ? '#94a3b8' : '#64748b' }}>
                                {(stagedMedia.fileSize / (1024 * 1024)).toFixed(1)} MB • {stagedMedia.category === 'image' ? 'Foto selecionada' : stagedMedia.category === 'video' ? 'Vídeo selecionado' : stagedMedia.category === 'audio' ? 'Áudio selecionado' : 'Documento'} (digite a legenda abaixo)
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleCancelStagedMedia}
                            title="Remover anexo"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: isDarkMode ? '#8696a0' : '#54656f',
                              cursor: 'pointer',
                              padding: '5px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = isDarkMode ? '#8696a0' : '#54656f')}
                          >
                            <X size={18} />
                          </button>
                        </div>
                      )}

                      <form onSubmit={handleSendMessage} style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: isDarkMode ? '#202c33' : '#ffffff',
                        borderRadius: (Boolean(stagedMedia) || Boolean(pendingAttachment && (!pendingAttachment.leadId || pendingAttachment.leadId === selectedLead.id)) || Boolean(replyingToMessage)) ? '0 0 16px 16px' : '24px',
                        padding: '4px 8px 4px 10px',
                        border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #d1d7db',
                        borderTop: (Boolean(stagedMedia) || Boolean(pendingAttachment && (!pendingAttachment.leadId || pendingAttachment.leadId === selectedLead.id)) || Boolean(replyingToMessage)) ? 'none' : (isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #d1d7db'),
                        boxShadow: isDarkMode ? 'none' : '0 1px 2px rgba(11,20,26,0.08)',
                        gap: '8px',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}>
                        {/* Botão + (Anexos) */}
                        <button
                          ref={attachmentButtonRef}
                          type="button"
                          onClick={() => {
                            setIsAttachmentMenuOpen(!isAttachmentMenuOpen);
                            setIsEmojiPickerOpen(false);
                          }}
                          title="Anexar arquivo ou mídia"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: isAttachmentMenuOpen ? '#00a884' : (isDarkMode ? '#8696a0' : '#54656f'),
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 0.15s ease',
                            flexShrink: 0,
                          }}
                        >
                          <Plus size={20} />
                        </button>

                        {/* Botão 🙂 (Emojis) */}
                        <button
                          ref={emojiButtonRef}
                          type="button"
                          onClick={() => {
                            setIsEmojiPickerOpen(!isEmojiPickerOpen);
                            setIsAttachmentMenuOpen(false);
                          }}
                          title="Inserir emoji"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: isEmojiPickerOpen ? '#00a884' : (isDarkMode ? '#8696a0' : '#54656f'),
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 0.15s ease',
                            flexShrink: 0,
                          }}
                        >
                          <Smile size={20} />
                        </button>

                        {/* Campo de Texto & Botões Isolados (Zero Lentidão ao Digitar) */}
                        <WhatsAppMessageInputBox
                          leadId={selectedLead.id}
                          isDarkMode={isDarkMode}
                          disabled={!activeSenderToken || isSenderDisconnected}
                          isSpectator={isLeadSpectator}
                          hasPendingAttachment={Boolean(pendingAttachment && (!pendingAttachment.leadId || pendingAttachment.leadId === selectedLead.id))}
                          hasStagedMedia={Boolean(stagedMedia)}
                          pendingAttachmentCaption={pendingAttachment?.caption}
                          onSendMessageText={(text) => handleSendMessage(undefined, text)}
                          onTriggerComposing={triggerComposingPresence}
                          onStartAudioRecording={startAudioRecording}
                        />
                      </form>
                    </>
                  )}
                    </div>
                  )
                )}
              </div>
            )}
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: isDarkMode ? '#111b21' : '#f0f2f5',
            padding: '32px 20px',
            textAlign: 'center',
            userSelect: 'none',
            borderLeft: isDarkMode ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.06)',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '24px',
              background: isDarkMode ? 'rgba(37, 211, 102, 0.12)' : 'rgba(37, 211, 102, 0.1)',
              border: isDarkMode ? '1px solid rgba(37, 211, 102, 0.25)' : '1px solid rgba(37, 211, 102, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              boxShadow: '0 8px 24px rgba(37, 211, 102, 0.15)',
            }}>
              <WhatsAppBrandIcon size={42} />
            </div>

            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: isDarkMode ? '#e9edef' : '#111b21',
              margin: '0 0 8px 0',
              letterSpacing: '-0.3px',
            }}>
              Selecione uma conversa
            </h3>

            <p style={{
              fontSize: '0.86rem',
              color: isDarkMode ? '#8696a0' : '#667781',
              maxWidth: '420px',
              lineHeight: 1.55,
              margin: '0 0 24px 0',
            }}>
              Escolha um lead na lista para ver o histórico e responder, ou cadastre um novo.
            </p>

            <button
              type="button"
              onClick={() => setIsNewLeadModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 22px',
                borderRadius: '12px',
                background: 'var(--adm-accent, #14A9D7)',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(20, 169, 215, 0.35)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(20, 169, 215, 0.45)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(20, 169, 215, 0.35)';
              }}
            >
              <UserPlus size={18} />
              <span>Cadastrar Lead</span>
            </button>
          </div>
        )}
      </div>

      {/* ── BARRA FLUTUANTE DE AÇÕES EM MASSA (SELEÇÃO MÚLTIPLA NA CAIXA DE ENTRADA) ── */}
      {isMultiSelectMode && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          background: 'var(--adm-bg-card, #1E293B)',
          border: '1px solid var(--adm-border, #334155)',
          borderRadius: '8px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--adm-text-title, #FFFFFF)' }}>
            <span style={{ color: 'var(--adm-accent, #6366F1)' }}>{selectedLeadIds.length}</span> de {filteredLeads.length} selecionado(s)
          </div>

          <button
            type="button"
            onClick={() => {
              if (selectedLeadIds.length === filteredLeads.length) {
                setSelectedLeadIds([]);
              } else {
                setSelectedLeadIds(filteredLeads.map(l => l.id));
              }
            }}
            style={{
              padding: '4px 8px',
              borderRadius: '5px',
              border: '1px solid var(--adm-border, #475569)',
              background: 'transparent',
              color: 'var(--adm-text-secondary, #94A3B8)',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {selectedLeadIds.length === filteredLeads.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
          </button>

          <div style={{ height: '18px', width: '1px', background: 'var(--adm-border, #334155)' }} />

          {/* Ação 0: Mudar Funil */}
          <button
            type="button"
            disabled={selectedLeadIds.length === 0}
            onClick={() => setBulkFunnelModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              background: selectedLeadIds.length > 0 ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: selectedLeadIds.length > 0 ? '#F59E0B' : 'var(--adm-text-muted, #64748B)',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: selectedLeadIds.length > 0 ? 'pointer' : 'not-allowed',
              opacity: selectedLeadIds.length > 0 ? 1 : 0.5,
            }}
          >
            <GitBranch size={13} color="#F59E0B" />
            <span>Mudar Funil</span>
          </button>

          {/* Ação 1: Mover Etapa */}
          <button
            type="button"
            disabled={selectedLeadIds.length === 0}
            onClick={() => setBulkStageModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              background: selectedLeadIds.length > 0 ? 'var(--adm-bg-input, #0F172A)' : 'transparent',
              border: '1px solid var(--adm-border, #334155)',
              color: selectedLeadIds.length > 0 ? 'var(--adm-text-title, #FFFFFF)' : 'var(--adm-text-muted, #64748B)',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: selectedLeadIds.length > 0 ? 'pointer' : 'not-allowed',
              opacity: selectedLeadIds.length > 0 ? 1 : 0.5,
            }}
          >
            <GitBranch size={13} color="#3B82F6" />
            <span>Mover Etapa</span>
          </button>

          {/* Ação 2: Atribuir Responsável */}
          <button
            type="button"
            disabled={selectedLeadIds.length === 0}
            onClick={() => setBulkAssigneeModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              background: selectedLeadIds.length > 0 ? 'var(--adm-bg-input, #0F172A)' : 'transparent',
              border: '1px solid var(--adm-border, #334155)',
              color: selectedLeadIds.length > 0 ? 'var(--adm-text-title, #FFFFFF)' : 'var(--adm-text-muted, #64748B)',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: selectedLeadIds.length > 0 ? 'pointer' : 'not-allowed',
              opacity: selectedLeadIds.length > 0 ? 1 : 0.5,
            }}
          >
            <Users size={13} color="#10B981" />
            <span>Atribuir Responsável</span>
          </button>

          {/* Ação 3: Excluir Múltiplos */}
          <button
            type="button"
            disabled={selectedLeadIds.length === 0}
            onClick={handleBulkDelete}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              background: selectedLeadIds.length > 0 ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: selectedLeadIds.length > 0 ? '#EF4444' : 'var(--adm-text-muted, #64748B)',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: selectedLeadIds.length > 0 ? 'pointer' : 'not-allowed',
              opacity: selectedLeadIds.length > 0 ? 1 : 0.5,
            }}
          >
            <Trash2 size={13} />
            <span>Excluir</span>
          </button>

          <div style={{ height: '18px', width: '1px', background: 'var(--adm-border, #334155)' }} />

          {/* Botão Fechar Seleção Múltipla */}
          <button
            type="button"
            onClick={() => {
              setSelectedLeadIds([]);
              setIsMultiSelectMode(false);
            }}
            title="Cancelar seleção"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--adm-text-muted, #94A3B8)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Modais de Ações em Massa */}
      <AdminBulkMoveFunnelModal
        isOpen={bulkFunnelModalOpen}
        onClose={() => setBulkFunnelModalOpen(false)}
        count={selectedLeadIds.length}
        funnels={funnels}
        currentFunnelId={activeFunnelId || undefined}
        onConfirm={handleBulkMoveFunnel}
      />

      <AdminBulkMoveStageModal
        isOpen={bulkStageModalOpen}
        onClose={() => setBulkStageModalOpen(false)}
        count={selectedLeadIds.length}
        stages={bulkAllowedStages}
        onConfirm={handleBulkMoveStage}
      />

      <AdminBulkAssignModal
        isOpen={bulkAssigneeModalOpen}
        onClose={() => setBulkAssigneeModalOpen(false)}
        count={selectedLeadIds.length}
        collaborators={collaborators}
        onConfirm={handleBulkAssignCollab}
      />

      {/* Modais de Tarefas e Agendamentos */}
      <AdminTaskDetailModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        task={editingTask}
        initialClientId={selectedLead?.isClient ? selectedLead.id : undefined}
        initialLeadId={selectedLead && !selectedLead.isClient ? selectedLead.id : undefined}
      />

      <AdminTaskCompletionModal
        isOpen={!!completingTask}
        taskTitle={completingTask?.title || completingTask?.description || ''}
        onClose={() => setCompletingTask(null)}
        onConfirm={(feedback) => {
          if (completingTask) {
            completeTaskWithFeedback(completingTask.id, feedback);
            setCompletingTask(null);
          }
        }}
      />

      <AdminConfirmModal
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={() => {
          if (taskToDelete) {
            deleteTask(taskToDelete.id);
            setTaskToDelete(null);
          }
        }}
        title="Excluir Tarefa"
        message={`Deseja realmente excluir a tarefa "${taskToDelete?.title || taskToDelete?.description}"?`}
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        danger={true}
      />

      {/* Modal de Confirmação de Exclusão Direta de Lead */}
      <AdminConfirmModal
        isOpen={!!leadToDeleteDirectly}
        onClose={() => setLeadToDeleteDirectly(null)}
        onConfirm={() => {
          if (leadToDeleteDirectly) {
            deleteLead(leadToDeleteDirectly.id);
            if (selectedLeadId === leadToDeleteDirectly.id) {
              setSelectedLeadId(null);
            }
            setLeadToDeleteDirectly(null);
          }
        }}
        title="Excluir Lead"
        message={`Tem certeza que deseja excluir o lead "${leadToDeleteDirectly?.name}"? Esta ação é irreversível.`}
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        danger={true}
      />

      {/* Modal de Recuperação de Histórico de Mensagens Pós-Desconexão */}
      {isHistorySyncModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '16px',
        }}>
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Header */}
            <div style={{
              padding: '18px 22px',
              borderBottom: '1px solid var(--adm-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--adm-bg-input)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <History size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                    Recuperação de Histórico WhatsApp
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', fontWeight: 500 }}>
                    Sincronização de mensagens perdidas pós-queda ou reconexão
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsHistorySyncModalOpen(false)}
                disabled={isSyncingHistory}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--adm-text-muted)',
                  cursor: isSyncingHistory ? 'not-allowed' : 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--adm-text-body)', lineHeight: 1.5 }}>
                Se o WhatsApp ou a internet foram desconectados temporariamente, selecione o intervalo de tempo abaixo para resgatar automaticamente todas as mensagens e novos contatos enviados/recebidos nesse período.
              </p>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--adm-text-title)', marginBottom: '8px' }}>
                  Intervalo de Tempo para Recuperação:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { label: 'Última 1 hora', minutes: 60 },
                    { label: 'Últimas 3 horas', minutes: 180 },
                    { label: 'Últimas 6 horas', minutes: 360 },
                    { label: 'Últimas 24 horas', minutes: 1440 },
                    { label: 'Últimos 3 dias', minutes: 4320 },
                    { label: 'Últimos 7 dias', minutes: 10080 },
                  ].map(opt => {
                    const isSelected = syncTimeWindow === opt.minutes;
                    return (
                      <button
                        key={opt.minutes}
                        type="button"
                        onClick={() => setSyncTimeWindow(opt.minutes)}
                        disabled={isSyncingHistory}
                        style={{
                          padding: '10px 8px',
                          borderRadius: '10px',
                          border: `1.5px solid ${isSelected ? '#10B981' : 'var(--adm-border)'}`,
                          background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'var(--adm-bg-input)',
                          color: isSelected ? '#10B981' : 'var(--adm-text-title)',
                          fontSize: '0.76rem',
                          fontWeight: isSelected ? 800 : 600,
                          cursor: isSyncingHistory ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s ease',
                          textAlign: 'center',
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Resultado da Sincronização */}
              {syncHistoryResult && (
                <div style={{
                  padding: '14px',
                  borderRadius: '10px',
                  background: syncHistoryResult.recoveredCount > 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                  border: `1px solid ${syncHistoryResult.recoveredCount > 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                  color: syncHistoryResult.recoveredCount > 0 ? '#10B981' : '#3B82F6',
                  fontSize: '0.80rem',
                }}>
                  <div style={{ fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={16} />
                    <span>Sincronização Concluída com Sucesso!</span>
                  </div>
                  <div style={{ color: 'var(--adm-text-title)', fontSize: '0.76rem', lineHeight: 1.4 }}>
                    • <strong>{syncHistoryResult.recoveredCount}</strong> mensagens resgatadas.<br />
                    • <strong>{syncHistoryResult.newLeadsCount}</strong> novos leads captados e inseridos no CRM.<br />
                    • <strong>{syncHistoryResult.updatedLeadsCount}</strong> conversas atualizadas e reordenadas.
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '14px 22px',
              borderTop: '1px solid var(--adm-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              background: 'var(--adm-bg-input)',
            }}>
              <button
                type="button"
                onClick={() => setIsHistorySyncModalOpen(false)}
                disabled={isSyncingHistory}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--adm-border)',
                  background: 'transparent',
                  color: 'var(--adm-text-muted)',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  cursor: isSyncingHistory ? 'not-allowed' : 'pointer',
                }}
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={handleRunHistorySync}
                disabled={isSyncingHistory}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isSyncingHistory ? '#94A3B8' : '#10B981',
                  color: '#fff',
                  fontSize: '0.80rem',
                  fontWeight: 800,
                  cursor: isSyncingHistory ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                }}
              >
                {isSyncingHistory ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Sincronizando Mensagens...</span>
                  </>
                ) : (
                  <>
                    <History size={14} />
                    <span>Recuperar Mensagens</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL LIGHTBOX FULLSCREEN PARA FOTOS E VÍDEOS ── */}
      {lightboxMedia && (
        <div
          onClick={() => setLightboxMedia(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100000,
            background: 'rgba(0, 0, 0, 0.92)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Top Bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 24px',
              background: 'rgba(0, 0, 0, 0.65)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#fff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 700 }}>
                {lightboxMedia.title || (lightboxMedia.type === 'image' ? 'Visualização de Foto' : 'Visualização de Vídeo')}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <a
                href={lightboxMedia.url}
                download
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
              >
                <span>Baixar</span>
              </a>
              <button
                type="button"
                onClick={() => setLightboxMedia(null)}
                title="Fechar (ESC)"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Media Display Area */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              overflow: 'hidden',
            }}
          >
            {lightboxMedia.type === 'image' ? (
              <img
                src={lightboxMedia.url}
                alt={lightboxMedia.title || 'Foto'}
                onClick={(e) => e.stopPropagation()}
                style={{
                  maxWidth: '92vw',
                  maxHeight: '82vh',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
                }}
              />
            ) : (
              <video
                src={lightboxMedia.url}
                controls
                autoPlay
                onClick={(e) => e.stopPropagation()}
                style={{
                  maxWidth: '92vw',
                  maxHeight: '82vh',
                  borderRadius: '8px',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
                  background: '#000',
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: REGISTRAR / EDITAR VENDA ADICIONAL (UPSELL) ── */}
      {isUpsellModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px',
          }}
          onClick={() => {
            setIsUpsellModalOpen(false);
            setEditingUpsell(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--adm-bg-card, #1E293B)',
              border: '1px solid var(--adm-border)',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--adm-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--adm-bg-input)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarSign size={18} color="#10B981" />
                <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                  {editingUpsell ? 'Editar Venda Adicional / Upsell' : 'Registrar Venda Adicional (Upsell)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUpsellModalOpen(false);
                  setEditingUpsell(null);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--adm-text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveUpsell} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-title)', marginBottom: '5px' }}>
                  Título / Nome do Serviço Extra:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Cabine de Fotos 360, Bar Premium, Robô de LED..."
                  value={upsellTitle}
                  onChange={(e) => setUpsellTitle(e.target.value)}
                  className="adm-input"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-title)', marginBottom: '5px' }}>
                    Categoria:
                  </label>
                  <Select
                    value={upsellCategory}
                    onChange={(e) => setUpsellCategory(e.target.value)}
                    className="adm-input"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', fontSize: '0.82rem' }}
                  >
                    {Object.entries(UPSELL_CATEGORIES).map(([catKey, cat]) => (
                      <option key={catKey} value={catKey}>
                        {cat.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-title)', marginBottom: '5px' }}>
                    Valor do Serviço (R$):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="Ex: 2500"
                    value={upsellValue}
                    onChange={(e) => setUpsellValue(e.target.value)}
                    className="adm-input"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-title)', marginBottom: '5px' }}>
                    Status do Pagamento:
                  </label>
                  <Select
                    value={upsellPaymentStatus}
                    onChange={(e) => setUpsellPaymentStatus(e.target.value as any)}
                    className="adm-input"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', fontSize: '0.82rem' }}
                  >
                    <option value="pago">Pago à Vista (Liquidado)</option>
                    <option value="pendente">Pendente / A Receber</option>
                    <option value="parcelado">Parcelado (Nas Mensalidades)</option>
                  </Select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-title)', marginBottom: '5px' }}>
                    Forma de Pagamento:
                  </label>
                  <Select
                    value={upsellPaymentMethod}
                    onChange={(e) => setUpsellPaymentMethod(e.target.value)}
                    className="adm-input"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', fontSize: '0.82rem' }}
                  >
                    <option value="PIX">PIX</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Boleto Bancário">Boleto Bancário</option>
                    <option value="Transferência">Transferência Bancária</option>
                    <option value="Dinheiro">Dinheiro</option>
                  </Select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.8fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-title)', marginBottom: '5px' }}>
                    Data do Fechamento / Venda:
                  </label>
                  <DateField
                    required
                    value={upsellDate}
                    onChange={(e) => setUpsellDate(e.target.value)}
                    className="adm-input"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-title)', marginBottom: '5px' }}>
                    Horário da Venda *:
                  </label>
                  <input
                    type="time"
                    required
                    value={upsellTime}
                    onChange={(e) => setUpsellTime(e.target.value)}
                    className="adm-input"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-title)', marginBottom: '5px' }}>
                  Vendido por (Colaborador) *:
                </label>
                <Select
                  value={upsellResponsibleId}
                  onChange={(e) => setUpsellResponsibleId(e.target.value)}
                  className="adm-input"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', fontSize: '0.82rem' }}
                >
                  {collaborators.filter(c => c.active !== false).map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
                  ))}
                </Select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-title)', marginBottom: '5px' }}>
                  Observações / Detalhes Operacionais:
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Incluso 3h de duração com equipe uniformizada..."
                  value={upsellNotes}
                  onChange={(e) => setUpsellNotes(e.target.value)}
                  className="adm-input"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '0.80rem', resize: 'vertical' }}
                />
              </div>

              {/* Modal Footer */}
              <div style={{
                marginTop: '10px',
                paddingTop: '14px',
                borderTop: '1px solid var(--adm-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '10px',
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsUpsellModalOpen(false);
                    setEditingUpsell(null);
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border)',
                    background: 'transparent',
                    color: 'var(--adm-text-muted)',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#10B981',
                    color: '#FFF',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                  }}
                >
                  {editingUpsell ? 'Salvar Alterações' : 'Salvar Venda Adicional'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADICIONAR DOCUMENTO / ANEXO ── */}
      {isDocModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px',
          }}
          onClick={() => setIsDocModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--adm-bg-card, #1E293B)',
              border: '1px solid var(--adm-border)',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--adm-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--adm-bg-input)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Folder size={18} color="#F59E0B" />
                <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                  Anexar Documento do Cliente
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDocModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--adm-text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveDoc} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-title)', marginBottom: '5px' }}>
                  Título / Identificação do Arquivo:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Contrato Assinado - Pacote Ouro, Comprovante Entrada..."
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="adm-input"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-title)', marginBottom: '5px' }}>
                  Tipo de Documento:
                </label>
                <Select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as any)}
                  className="adm-input"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', fontSize: '0.82rem' }}
                >
                  <option value="contract">Contrato Principal</option>
                  <option value="amendment">Aditivo Contratual</option>
                  <option value="receipt">Comprovante de Pagamento / Recibo</option>
                  <option value="id_document">Documento Pessoal / RG / CPF</option>
                  <option value="other">Outro Anexo / Foto</option>
                </Select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-title)', marginBottom: '5px' }}>
                  Upload do Arquivo *:
                </label>
                <DocumentFileUploadZone
                  fileUrl={docFileUrl}
                  fileSize={docFileSize}
                  fileName={docFileName}
                  onUploadingChange={setIsDocUploading}
                  onUploaded={({ url, fileName, fileSize, sizeBytes }) => {
                    setDocFileUrl(url);
                    setDocFileName(fileName);
                    setDocFileSize(fileSize);
                    setDocSizeBytes(sizeBytes);
                    if (!docTitle.trim()) {
                      setDocTitle(fileName.replace(/\.[^/.]+$/, ''));
                    }
                  }}
                  onClear={() => {
                    setDocFileUrl('');
                    setDocFileName('');
                    setDocFileSize('');
                    setDocSizeBytes(undefined);
                  }}
                />
              </div>

              {/* Modal Footer */}
              <div style={{
                marginTop: '10px',
                paddingTop: '14px',
                borderTop: '1px solid var(--adm-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '10px',
              }}>
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border)',
                    background: 'transparent',
                    color: 'var(--adm-text-muted)',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isDocUploading || !docFileUrl || !docTitle.trim()}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#F59E0B',
                    color: '#FFF',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: (isDocUploading || !docFileUrl || !docTitle.trim()) ? 'not-allowed' : 'pointer',
                    opacity: (isDocUploading || !docFileUrl || !docTitle.trim()) ? 0.55 : 1,
                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                  }}
                >
                  {isDocUploading ? 'Enviando...' : 'Anexar Documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: DETALHES DE TAREFA / FOLLOW-UP ── */}
      {Boolean(selectedTaskForDetail) && (
        <AdminTaskDetailModal
          isOpen={Boolean(selectedTaskForDetail)}
          onClose={() => setSelectedTaskForDetail(null)}
          task={selectedTaskForDetail}
          workspaceContext="followup"
        />
      )}

      {/* ── MODAL: CADASTRO RÁPIDO DE NOVO LEAD ── */}
      <AdminNewLeadModal
        isOpen={isNewLeadModalOpen}
        onClose={() => setIsNewLeadModalOpen(false)}
        defaultFunnelId={activeFunnel?.id}
        defaultVenueId={activeFunnel?.venueId !== 'all' ? activeFunnel?.venueId : undefined}
        currentFunnelName={activeFunnel?.name}
        onLeadCreated={(newLeadId) => {
          setSelectedLeadId(newLeadId);
          setIsNewLeadModalOpen(false);
        }}
      />

      {/* ── MODAL: TRANSFERÊNCIA DE UNIDADE DO LEAD (GERÊNCIA E MASTER) ── */}
      {selectedLead && (
        <AdminTransferLeadVenueModal
          isOpen={isTransferVenueModalOpen}
          onClose={() => setIsTransferVenueModalOpen(false)}
          lead={selectedLead}
        />
      )}

      {/* ── MODAL: ABA SETORIAL DE WHATSAPP (COMERCIAL E PÓS-VENDA) ── */}
      {activeChannelsFunnel && (
        <AdminPostSaleChannelModal
          isOpen={isPostSaleChannelModalOpen}
          onClose={() => {
            setIsPostSaleChannelModalOpen(false);
            setEditingPostSaleChannel(null);
          }}
          activeFunnel={activeChannelsFunnel}
          editingChannel={editingPostSaleChannel}
          sources={sources}
          collaborators={collaborators}
          onSaveChannel={handleSavePostSaleChannel}
          onDeleteChannel={handleDeletePostSaleChannel}
          hideGeneralChannel={isGeneralHidden}
          onToggleHideGeneralChannel={handleToggleHideGeneralChannel}
        />
      )}

      {/* ── MODAL: RESOLUÇÃO DE LEAD DUPLICADO ── */}
      <AdminDuplicateLeadModal
        isOpen={Boolean(duplicateModalLead)}
        onClose={() => setDuplicateModalLead(null)}
        lead={duplicateModalLead}
      />

      {/* ── MODAL: COMPARTILHAR CONTATO (vCard) ── */}
      {isShareContactModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px',
          }}
          onClick={() => setIsShareContactModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--adm-bg-card, #1E293B)',
              border: '1px solid var(--adm-border)',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '460px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '85vh',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--adm-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--adm-bg-input)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={18} color="#00a884" />
                <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                  Compartilhar Contato
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsShareContactModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--adm-text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
              {/* Busca de Contatos na Base */}
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-muted)', display: 'block', marginBottom: '6px' }}>
                  Pesquisar na base de contatos / leads / equipe:
                </label>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--adm-text-muted)' }} />
                  <input
                    type="text"
                    value={contactSearchQuery}
                    onChange={(e) => setContactSearchQuery(e.target.value)}
                    placeholder="Digite o nome ou telefone..."
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '8px 12px 8px 32px',
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      color: 'var(--adm-text-title)',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Lista filtrada de contatos */}
              {contactSearchQuery.trim().length > 1 && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  maxHeight: '160px',
                  overflowY: 'auto',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '8px',
                  padding: '4px',
                  background: 'var(--adm-bg-input)',
                }}>
                  {(() => {
                    const q = contactSearchQuery.toLowerCase();
                    const results: Array<{ id: string; name: string; phone: string; role: string }> = [];

                    // 1. Leads
                    (leads || []).forEach(l => {
                      if (l.phone && (l.name?.toLowerCase().includes(q) || l.phone.includes(q))) {
                        results.push({ id: `lead-${l.id}`, name: l.name || 'Lead', phone: l.phone, role: 'Lead' });
                      }
                      (l.contacts || []).forEach(c => {
                        if (c.phone && (c.name?.toLowerCase().includes(q) || c.phone.includes(q))) {
                          results.push({ id: `sub-${c.id}`, name: c.name || 'Contato', phone: c.phone, role: c.role || 'Contato' });
                        }
                      });
                    });

                    // 2. Colaboradores
                    (collaborators || []).forEach(col => {
                      if (col.phone && (col.name?.toLowerCase().includes(q) || col.phone.includes(q))) {
                        results.push({ id: `col-${col.id}`, name: col.name, phone: col.phone, role: 'Equipe' });
                      }
                    });

                    // Deduplica por telefone
                    const seenPhones = new Set<string>();
                    const unique = results.filter(r => {
                      const clean = r.phone.replace(/\D/g, '').slice(-8);
                      if (seenPhones.has(clean)) return false;
                      seenPhones.add(clean);
                      return true;
                    }).slice(0, 10);

                    if (unique.length === 0) {
                      return (
                        <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.76rem', color: 'var(--adm-text-muted)' }}>
                          Nenhum contato encontrado com este termo.
                        </div>
                      );
                    }

                    return unique.map(item => (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          background: 'var(--adm-bg-card)',
                          gap: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                          <span style={{ fontSize: '0.80rem', fontWeight: 700, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.name}
                          </span>
                          <span style={{ fontSize: '0.70rem', color: 'var(--adm-text-muted)' }}>
                            {formatPhone(item.phone)} • {item.role}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleShareContact(item.name, item.phone)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: '#00a884',
                            border: 'none',
                            color: '#fff',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          Enviar
                        </button>
                      </div>
                    ));
                  })()}
                </div>
              )}

              {/* Separador */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--adm-border)' }} />
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>Ou digite manualmente</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--adm-border)' }} />
              </div>

              {/* Campos manuais */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Nome do contato..."
                  value={customContactName}
                  onChange={(e) => setCustomContactName(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 12px',
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    color: 'var(--adm-text-title)',
                    outline: 'none',
                  }}
                />
                <input
                  type="text"
                  placeholder="WhatsApp do contato..."
                  value={customContactPhone}
                  onChange={(e) => setCustomContactPhone(maskPhoneInput(e.target.value))}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 12px',
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    color: 'var(--adm-text-title)',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setIsShareContactModalOpen(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px solid var(--adm-border)',
                    color: 'var(--adm-text-muted)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!customContactName.trim() || !customContactPhone.trim()}
                  onClick={() => handleShareContact(customContactName.trim(), customContactPhone.trim())}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: (!customContactName.trim() || !customContactPhone.trim()) ? 'var(--adm-border)' : '#00a884',
                    border: 'none',
                    color: '#fff',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: (!customContactName.trim() || !customContactPhone.trim()) ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(0, 168, 132, 0.25)',
                  }}
                >
                  Compartilhar Contato
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};