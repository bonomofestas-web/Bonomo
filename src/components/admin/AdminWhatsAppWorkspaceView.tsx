import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  MessageSquare, Search, SlidersHorizontal, Send, Mic,
  FileText, ChevronRight, ChevronLeft, ChevronDown, Calendar,
  Plus, Check, X, Clock, PhoneCall, Eye, Building2, UserPlus, CheckSquare,
  GitBranch, Users, Trash2, Zap, Smile, Image as ImageIcon,
  Headphones, Pause, Play, CheckCircle2, Edit3, AlertCircle, AlertTriangle, Copy,
  History, RefreshCw, MoreVertical, CheckCheck, DollarSign, TrendingUp, Folder,
  ExternalLink, ShieldCheck, Sparkles, ShoppingBag, Video
} from 'lucide-react';
import { IcpTargetUserIcon } from './IcpTargetUserIcon';
import { WhatsAppBrandIcon } from './WhatsAppBrandIcon';
import { SafeAvatar } from './SafeAvatar';
import { WhatsAppAudioMessage } from './WhatsAppAudioMessage';
import { WhatsAppDocumentMessage } from './WhatsAppDocumentMessage';

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
import { uazapiSseService } from '../../services/uazapiSseService';
import { leadService, mergeAndSortActivities } from '../../services/leadService';
import { whatsappMediaService } from '../../services/whatsappMediaService';
import { isSupabaseConfigured } from '../../lib/supabase';
import { AdminLeadInspector } from './AdminLeadInspector';
import { AdminClientDrawerInspector } from './AdminClientDrawerInspector';
import { AdminTaskDetailModal } from './AdminTaskDetailModal';
import { AdminTaskCompletionModal } from './AdminTaskCompletionModal';
import { AdminConfirmModal } from './AdminConfirmModal';
import { 
  AdminBulkMoveFunnelModal, 
  AdminBulkMoveStageModal, 
  AdminBulkAssignModal 
} from './AdminLeadActionModals';
import { formatPhone } from '../../utils/phoneFormatter';
import { generateUuid } from '../../utils/uuid';
import { getLeadPendingWaitingTime, getLeadWaitTimeSla } from '../../utils/leadSorting';
import type { Lead, LeadActivity, CrmStage, ClientStage, AdminTask, ClientUpsellSale, ClientDocument } from '../../types/admin';

export const formatWhatsAppDateDivider = (timestamp?: string | number | Date): string => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
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

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

interface AdminWhatsAppWorkspaceViewProps {
  initialLeadId?: string;
  activeFunnelId?: string;
  searchQuery?: string;
  leadOwnershipFilter?: 'all' | 'open' | 'mine';
  sortBy?: string;
  onClose?: () => void;
  isEmbeddedInFunnel?: boolean;
  initialComposerTab?: 'whatsapp' | 'notes' | 'tasks' | 'upsell' | 'documents';
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
 * Renderiza texto com links clicáveis seguros (target="_blank") para URLs
 */
function renderFormattedTextWithLinks(text?: string, isDarkMode = false): React.ReactNode {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: isDarkMode ? '#53bdeb' : '#0284c7',
            textDecoration: 'underline',
            wordBreak: 'break-all',
            fontWeight: 600,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

export const AdminWhatsAppWorkspaceView: React.FC<AdminWhatsAppWorkspaceViewProps> = ({
  initialLeadId,
  activeFunnelId,
  searchQuery = '',
  leadOwnershipFilter,
  sortBy,
  onClose,
  isEmbeddedInFunnel = false,
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
    updateSource,
    addLeadActivity,
    markLeadAsRead,
    syncWhatsAppHistoryGap,
  } = useAdminState();

  const hasIcpConfigured = (targetLead: Lead) => {
    if (!mqlQuestions || mqlQuestions.length === 0) return false;
    return mqlQuestions.some(q =>
      (targetLead.funnelId && ((q.funnelIds && q.funnelIds.includes(targetLead.funnelId)) || q.funnelId === targetLead.funnelId)) ||
      (q.venueIds && q.venueIds.length > 0 && q.venueIds.includes(targetLead.venueId)) ||
      q.venueId === targetLead.venueId ||
      q.venueId === 'all'
    );
  };

  const [selectedFunnelId, setSelectedFunnelId] = useState<string>(() => {
    if (activeFunnelId) return activeFunnelId;
    if (isPostSale) return 'post_sale_default';
    const isUserPosVenda = currentUser?.role === 'pos_venda' || 
      (currentUser as any)?.primarySector === 'pos_venda' || 
      (currentUser as any)?.department === 'pos_venda';
    if (isUserPosVenda) return 'post_sale_default';

    try {
      const savedKey = `f5_wa_funnel_${currentUser?.id || 'default'}`;
      const saved = localStorage.getItem(savedKey);
      if (saved) return saved;
    } catch {}

    return 'all';
  });

  useEffect(() => {
    if (activeFunnelId) {
      setSelectedFunnelId(activeFunnelId);
    } else if (isPostSale) {
      setSelectedFunnelId('post_sale_default');
    } else if (selectedFunnelId && selectedFunnelId !== 'all' && selectedFunnelId !== 'post_sale_default' && funnels.length > 0) {
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
    } catch {}
  };

  const activeFunnel = (selectedFunnelId && selectedFunnelId !== 'all' && selectedFunnelId !== 'post_sale_default') 
    ? funnels.find(f => f.id === selectedFunnelId) 
    : (activeFunnelId ? funnels.find(f => f.id === activeFunnelId) : null);

  const isPostSaleFunnel = Boolean(
    isPostSale ||
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
    (currentUser?.role === 'pos_venda' && (!selectedFunnelId || selectedFunnelId === 'all' || selectedFunnelId === 'post_sale_default'))
  );
  const isReadOnlyForPosVenda = currentUser?.role === 'pos_venda' && !isPostSaleFunnel;

  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(initialLeadId || null);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isFunnelSelectOpen, setIsFunnelSelectOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const funnelSelectRef = useRef<HTMLDivElement>(null);

  // Ordenação Local com Persistência
  const [localSortBy, setLocalSortBy] = useState<string>(() => {
    if (sortBy) return sortBy;
    try {
      const saved = localStorage.getItem(`f5_wa_sort_${currentUser?.id || 'default'}`);
      if (saved) return saved;
    } catch {}
    return 'waiting_time';
  });

  const handleUpdateSortBy = (val: string) => {
    setLocalSortBy(val);
    try {
      localStorage.setItem(`f5_wa_sort_${currentUser?.id || 'default'}`, val);
    } catch {}
  };

  // Quick Filter Tabs State: 'open' | 'my' | 'all'
  const [quickFilter, setQuickFilter] = useState<'open' | 'my' | 'all'>(() => {
    try {
      const saved = localStorage.getItem(`f5_wa_quick_${currentUser?.id || 'default'}`);
      if (saved === 'open' || saved === 'my' || saved === 'all') return saved;
    } catch {}
    return 'open';
  });

  const handleUpdateQuickFilter = (val: 'open' | 'my' | 'all') => {
    setQuickFilter(val);
    try {
      localStorage.setItem(`f5_wa_quick_${currentUser?.id || 'default'}`, val);
    } catch {}
  };

  // Side Drawer: Lead Inspector (Ficha do Lead)
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(isEmbeddedInFunnel);

  // Detailed Filters State
  const [filterVenueId, setFilterVenueId] = useState<string>('all');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterCollaboratorId, setFilterCollaboratorId] = useState<string>('all');
  const [filterTemperature, setFilterTemperature] = useState<string>('all');

  // Composer Mode: 'whatsapp' | 'notes' | 'tasks' | 'upsell' | 'documents'
  const [composerTab, setComposerTab] = useState<'whatsapp' | 'notes' | 'tasks' | 'upsell' | 'documents'>(initialComposerTab || 'whatsapp');

  useEffect(() => {
    if (initialComposerTab) {
      setComposerTab(initialComposerTab);
    }
  }, [initialComposerTab]);

  // Modais de Vendas & Upsell / Documentos / Detalhe de Tarefa
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<AdminTask | null>(null);
  const [isUpsellModalOpen, setIsUpsellModalOpen] = useState(false);
  const [editingUpsell, setEditingUpsell] = useState<ClientUpsellSale | null>(null);
  const [upsellTitle, setUpsellTitle] = useState('');
  const [upsellCategory, setUpsellCategory] = useState<string>('foto_video');
  const [upsellValue, setUpsellValue] = useState<string>('');
  const [upsellDate, setUpsellDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [upsellPaymentStatus, setUpsellPaymentStatus] = useState<'pago' | 'pendente' | 'parcelado'>('pago');
  const [upsellPaymentMethod, setUpsellPaymentMethod] = useState<string>('PIX');
  const [upsellNotes, setUpsellNotes] = useState('');

  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState<ClientDocument['type']>('contract');
  const [docFileUrl, setDocFileUrl] = useState('');
  const [docFileSize, setDocFileSize] = useState('');
  
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

  // Quick Follow-up Composer States
  const [quickFollowupType, setQuickFollowupType] = useState<string>('Ligação WhatsApp');
  const [quickFollowupDate, setQuickFollowupDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [quickFollowupTime, setQuickFollowupTime] = useState<string>('14:00');
  const [quickFollowupNote, setQuickFollowupNote] = useState<string>('');

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

  const isDarkMode = currentUser?.theme === 'dark' || (typeof document !== 'undefined' && document.body.classList.contains('admin-theme-dark'));

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
      alert(`Erro ao sincronizar mensagens: ${err.message || 'Falha de conexão com a instância'}`);
    } finally {
      setIsSyncingHistory(false);
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

  // Sync initialLeadId prop & maintain inspector open if embedded in funnel
  useEffect(() => {
    if (initialLeadId) {
      setSelectedLeadId(initialLeadId);
      if (isEmbeddedInFunnel) {
        setIsInspectorOpen(true);
      }
    }
  }, [initialLeadId, isEmbeddedInFunnel]);

  // Sync searchQuery prop
  useEffect(() => {
    if (searchQuery) {
      setSearchTerm(searchQuery);
    }
  }, [searchQuery]);

  // Close filter dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
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



  const getLastMessageTime = (l: Lead) => {
    const contactActs = (l.activities || []).filter(a => (a.type === 'contact' || (a.type === 'creation' && Boolean(a.text))) && (a.text || a.mediaUrl));
    if (contactActs.length > 0) {
      const maxTime = contactActs.reduce((max, a) => Math.max(max, new Date(a.timestamp || 0).getTime()), 0);
      if (maxTime > 0) return maxTime;
    }
    return new Date(l.updatedAt || l.createdAt || 0).getTime();
  };

  // Client adapter for Post-Sale funnels
  const clientsAsLeads = useMemo<Lead[]>(() => {
    if (!isPostSaleFunnel) return [];
    return (clients || []).map(c => {
      const pName = c.birthdayPersonName || c.name || 'Cliente';
      const cPayer = c.payerName || pName;
      const cPhone = c.payerPhone || '';
      const cNotes = Array.isArray(c.notes) ? c.notes : [];

      const matchingLead = leads.find(l => l.id === c.id || (cPhone && l.phone && l.phone.replace(/\D/g, '') === cPhone.replace(/\D/g, '')));
      const leadActivities = matchingLead?.activities || [];
      const noteActivities = cNotes.map((n: any) => ({
        id: n.id || `note_${Date.now()}_${Math.random()}`,
        leadId: c.id,
        type: (n.type === 'whatsapp' || (typeof n.text === 'string' && n.text.toLowerCase().includes('whatsapp'))) ? ('contact' as const) : ('note' as const),
        title: n.title || 'Mensagem / Nota',
        text: n.text || '',
        timestamp: n.createdAt || new Date().toISOString(),
        authorName: n.authorName || 'Gestor de Sucesso',
      }));
      const mergedActivities = [...leadActivities];
      for (const nAct of noteActivities) {
        if (!mergedActivities.some(a => a.id === nAct.id)) {
          mergedActivities.push(nAct);
        }
      }
      mergedActivities.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      return {
        id: c.id,
        code: c.code || `CLI-${c.id.slice(0, 5).toUpperCase()}`,
        debutanteId: c.debutanteId || c.id,
        debutanteName: pName,
        debutanteSlug: c.debutanteSlug || c.id.slice(0, 8),
        name: pName,
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
        funnelId: activeFunnelId || 'post_sale_default',
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
        temperature: 'hot' as const,
        isValidated: true,
        pointsGranted: 1,
        participants: [],
        tasks: [],
        createdAt: c.createdAt || c.contractDate || new Date().toISOString(),
        updatedAt: c.updatedAt || c.contractDate || new Date().toISOString(),
          activities: mergedActivities,
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
    if (isPostSaleFunnel) {
      const existingClientIds = new Set(clientsAsLeads.map(c => c.id));
      const postSaleLeads = (leads || []).filter(l => 
        (l.isClient || l.group === 'Pós-Venda' || (activeFunnel && l.funnelId === activeFunnel.id)) &&
        !existingClientIds.has(l.id)
      );
      return [...clientsAsLeads, ...postSaleLeads];
    }
    return leads;
  }, [isPostSaleFunnel, clientsAsLeads, leads, activeFunnel]);

  // Filtered Leads List
  const filteredLeads = useMemo(() => {
    const currentFunnel = activeFunnel;
    
    // For Post-Sale: only filter by global activeVenueId or filterVenueId, never by a commercial funnel's venueId
    const globalVenueFilter = (activeVenueId !== 'all' && activeVenueId !== 'multi') ? activeVenueId : null;
    const targetVenueId = isPostSaleFunnel
      ? (filterVenueId !== 'all' ? filterVenueId : globalVenueFilter)
      : ((currentFunnel?.venueId && currentFunnel.venueId !== 'all') ? currentFunnel.venueId : globalVenueFilter);

    const term = (isEmbeddedInFunnel && searchQuery) ? searchQuery : searchTerm;
    const hasSearch = Boolean(term && term.trim());
    const cleanSearch = hasSearch ? term.toLowerCase().trim() : '';
    const cleanDigits = hasSearch ? cleanSearch.replace(/\D/g, '') : '';

    const result = sourceLeads.filter(lead => {
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
        if (!isMatched && lead.id !== selectedLeadId && lead.id !== initialLeadId) {
          return false;
        }
        return true;
      }

      // 1. Funnel & Venue Matching
      if (!isPostSaleFunnel) {
        if (currentFunnel && lead.funnelId) {
          if (lead.funnelId !== currentFunnel.id) {
            if (lead.id !== selectedLeadId && lead.id !== initialLeadId) return false;
          }
        }
      }
      
      if (targetVenueId && lead.venueId && lead.venueId !== targetVenueId) {
        if (lead.id !== selectedLeadId && lead.id !== initialLeadId) return false;
      }

      // 2. Ownership / Quick Filter Tabs
      const effectiveOwnership = (isEmbeddedInFunnel && leadOwnershipFilter) ? leadOwnershipFilter : quickFilter;
      if (effectiveOwnership === 'open') {
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
        if (isPostSaleFunnel) {
          const isMyClient = 
            Boolean(currentUser?.id && (lead.sdrId === currentUser.id || lead.closerId === currentUser.id)) ||
            Boolean(currentUser?.name && (lead.assignedTo?.toLowerCase() === currentUser.name.toLowerCase() || lead.sdrName?.toLowerCase() === currentUser.name.toLowerCase()));
          if (!isMyClient && lead.id !== selectedLeadId && lead.id !== initialLeadId) return false;
        } else {
          const isMyLead = 
            Boolean(currentUser?.id && (lead.sdrId === currentUser.id || lead.closerId === currentUser.id)) ||
            Boolean(currentUser?.name && (lead.sdrName === currentUser.name || lead.closerName === currentUser.name || lead.assignedTo === currentUser.name)) ||
            Boolean(currentUser?.id && (lead.participants || []).some(p => p.collaboratorId === currentUser.id));
          if (!isMyLead && lead.id !== selectedLeadId && lead.id !== initialLeadId) return false;
        }
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
  }, [sourceLeads, activeFunnel, activeVenueId, isPostSaleFunnel, quickFilter, leadOwnershipFilter, sortBy, localSortBy, filterVenueId, filterStage, filterCollaboratorId, filterTemperature, searchTerm, searchQuery, currentUser, selectedLeadId, initialLeadId, isEmbeddedInFunnel, collabIds]);

  const lastInitialLeadIdRef = useRef<string | undefined>(initialLeadId);

  // Sincronização inteligente de seleção: preserva a escolha manual do usuário e do lead recém-criado
  useEffect(() => {
    // Se o initialLeadId mudou externamente (ex: clicou em outro lead pelo Kanban ou criou novo lead), atualiza a seleção
    if (initialLeadId && initialLeadId !== lastInitialLeadIdRef.current) {
      lastInitialLeadIdRef.current = initialLeadId;
      setSelectedLeadId(initialLeadId);
      return;
    }

    // Se temos um initialLeadId ativo e ele está presente em filteredLeads mas não está selecionado, seleciona ele
    if (initialLeadId && selectedLeadId !== initialLeadId && filteredLeads.some(l => l.id === initialLeadId)) {
      setSelectedLeadId(initialLeadId);
      return;
    }

    // Se temos um initialLeadId e ele é a seleção atual, NUNCA reseta para filteredLeads[0]
    if (initialLeadId && selectedLeadId === initialLeadId) {
      return;
    }

    // Se a lista mudou e o lead selecionado não existe mais na lista filtrada, seleciona o primeiro
    if (filteredLeads.length > 0) {
      if (!selectedLeadId || !filteredLeads.some(l => l.id === selectedLeadId)) {
        setSelectedLeadId(filteredLeads[0].id);
      }
    } else {
      setSelectedLeadId(null);
    }
  }, [filteredLeads, initialLeadId, selectedLeadId]);

  const selectedLead = useMemo(() => {
    return sourceLeads.find(l => l.id === selectedLeadId) || null;
  }, [sourceLeads, selectedLeadId]);

  // Lista de destinatários disponíveis na ficha com prioridade máxima para o Decisor
  const availableRecipients = useMemo(() => {
    if (!selectedLead) return [];
    const list: Array<{ 
      phone: string; 
      name: string;
      label: string; 
      role: string; 
      roleBadge: string;
      isDecisor: boolean; 
      isMain: boolean;
      avatarUrl?: string; 
    }> = [];
    const seenPhones = new Set<string>();
    const leadAny = selectedLead as any;

    const translateRole = (r?: string) => {
      if (!r) return 'Contato';
      const low = r.toLowerCase().trim();
      if (low === 'mother' || low === 'mae' || low === 'mãe') return 'Mãe';
      if (low === 'father' || low === 'pai') return 'Pai';
      if (low === 'debutante' || low === 'aniversariante') return 'Aniversariante';
      if (low === 'contractor' || low === 'contratante') return 'Contratante';
      if (low === 'responsible' || low === 'responsavel' || low === 'responsável') return 'Responsável';
      if (low === 'other' || low === 'outro') return 'Contato';
      return r;
    };

    const cleanRoleLabel = (rawName?: string) => {
      if (!rawName) return '';
      return rawName.replace(/\s*\((mother|father|mae|mãe|pai|aniversariante|debutante|responsavel|responsável|outro|other|decisor)\)\s*/gi, '').trim();
    };

    if (selectedLead.contacts && selectedLead.contacts.length > 0) {
      selectedLead.contacts.forEach(c => {
        const clean = c.phone?.trim();
        if (clean && !seenPhones.has(clean)) {
          seenPhones.add(clean);
          const isDec = Boolean(c.isPrimaryDecisionMaker || leadAny.decisionMaker === c.role || leadAny.decisionMaker === c.name || (leadAny.decisionMaker === 'mae' && c.role?.toLowerCase().includes('m')));
          const rBadge = translateRole(c.role);
          const rawName = c.name || selectedLead.name || 'Contato';
          const cleanName = cleanRoleLabel(rawName);
          list.push({
            phone: clean,
            name: cleanName,
            label: cleanName,
            role: c.role || 'Contato',
            roleBadge: rBadge,
            isDecisor: isDec,
            isMain: false,
            avatarUrl: (c as any).avatarUrl || (c as any).photoUrl || (clean === selectedLead.phone ? selectedLead.avatarUrl : undefined),
          });
        }
      });
    }

    const mainPhone = (selectedLead.phone || leadAny.whatsapp || leadAny.payerPhone)?.trim();
    if (mainPhone && !seenPhones.has(mainPhone)) {
      seenPhones.add(mainPhone);
      const isDec = Boolean(leadAny.isDecisionMaker || !list.some(l => l.isDecisor));
      const cleanMainName = cleanRoleLabel(selectedLead.name || 'Lead Principal');
      list.push({
        phone: mainPhone,
        name: cleanMainName,
        label: cleanMainName,
        role: 'Principal',
        roleBadge: 'Principal',
        isDecisor: isDec,
        isMain: true,
        avatarUrl: selectedLead.avatarUrl,
      });
    }

    const motherPhone = leadAny.motherPhone?.trim();
    if (motherPhone && !seenPhones.has(motherPhone)) {
      seenPhones.add(motherPhone);
      const cleanMomName = cleanRoleLabel(leadAny.motherName) || 'Mãe';
      list.push({
        phone: motherPhone,
        name: cleanMomName,
        label: cleanMomName,
        role: 'Mãe',
        roleBadge: 'Mãe',
        isDecisor: leadAny.decisionMaker === 'mae',
        isMain: false,
        avatarUrl: undefined,
      });
    }

    const debutantePhone = (leadAny.debutantePhone || leadAny.debutante_phone)?.trim();
    if (debutantePhone && !seenPhones.has(debutantePhone)) {
      seenPhones.add(debutantePhone);
      const cleanDebName = cleanRoleLabel(selectedLead.debutanteName || leadAny.debutante_name) || 'Debutante';
      list.push({
        phone: debutantePhone,
        name: cleanDebName,
        label: cleanDebName,
        role: 'Debutante',
        roleBadge: 'Aniversariante',
        isDecisor: leadAny.decisionMaker === 'debutante' || leadAny.decisionMaker === 'aniversariante',
        isMain: false,
        avatarUrl: undefined,
      });
    }

    const fatherPhone = leadAny.fatherPhone?.trim();
    if (fatherPhone && !seenPhones.has(fatherPhone)) {
      seenPhones.add(fatherPhone);
      const cleanDadName = cleanRoleLabel(leadAny.fatherName) || 'Pai';
      list.push({
        phone: fatherPhone,
        name: cleanDadName,
        label: cleanDadName,
        role: 'Pai',
        roleBadge: 'Pai',
        isDecisor: leadAny.decisionMaker === 'pai',
        isMain: false,
        avatarUrl: undefined,
      });
    }

    // O Decisor Principal SEMPRE fica no topo absoluto da lista de destinatários
    list.sort((a, b) => (b.isDecisor ? 1 : 0) - (a.isDecisor ? 1 : 0));
    return list;
  }, [selectedLead]);

  const [selectedRecipientPhone, setSelectedRecipientPhone] = useState<string>('');

  useEffect(() => {
    if (availableRecipients.length > 0) {
      // Prioridade máxima automática: O primeiro item após a ordenação é o Decisor
      setSelectedRecipientPhone(availableRecipients[0].phone);
    } else if (selectedLead?.phone) {
      setSelectedRecipientPhone(selectedLead.phone);
    } else {
      setSelectedRecipientPhone('');
    }
  }, [selectedLead?.id, availableRecipients]);

  const [isSenderDropdownOpen, setIsSenderDropdownOpen] = useState(false);
  const [isRecipientDropdownOpen, setIsRecipientDropdownOpen] = useState(false);
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

  // Background Live Status Checker para todas as instâncias WhatsApp do F5 System
  useEffect(() => {
    if (!sources || sources.length === 0) return;
    let isMounted = true;

    const checkStatuses = async () => {
      const waSources = sources.filter(
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

          // Se o status divergir do configurado no banco, atualiza no context
          const currentCfg = (src.configuration as any) || {};
          if (currentCfg.isConnected !== isConn && updateSource) {
            updateSource(src.id, {
              configuration: {
                ...currentCfg,
                isConnected: isConn,
                connectionStatus: isConn ? 'connected' : 'disconnected',
                profilePicUrl: res.profilePictureUrl || currentCfg.profilePicUrl,
                connectedPhone: res.phone || currentCfg.connectedPhone,
              }
            });
          }
        } catch {
          // Ignora timeout em background
        }
      }
    };

    checkStatuses();
    const interval = setInterval(checkStatuses, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [sources, getSourceInstanceToken, updateSource]);

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
  const handleCompleteInlineTask = async (task: AdminTask, resolution: string) => {
    const cleanRes = resolution.trim() || 'Follow-up realizado com sucesso.';
    const completedTimestamp = new Date().toISOString();
    if (updateTask) {
      updateTask(task.id, {
        status: 'completed',
        customStatusId: 'st_completed',
        completedAt: completedTimestamp,
        resolution: cleanRes,
      });
    }

    // Registro automático na linha do tempo
    const author = currentUser?.name || 'Colaborador';
    const auditNoteText = `📌 Follow-up concluído por ${author}: "${cleanRes}"`;
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

    const title = quickFollowupNote.trim() 
      ? `${selectedLead.name} - ${quickFollowupType}: ${quickFollowupNote.trim()}`
      : `${selectedLead.name} - ${quickFollowupType}`;

    if (addTask) {
      addTask({
        leadId: selectedLead.id,
        leadName: selectedLead.name,
        title,
        description: quickFollowupNote.trim() || `Follow-up agendado via painel WhatsApp`,
        type: quickFollowupType as any,
        dueDate: quickFollowupDate,
        dueTime: quickFollowupTime,
        priority: 'medium',
        status: 'todo',
        isFollowUp: true,
        createdById: currentUser?.id || 'admin',
        createdByName: currentUser?.name || 'Equipe',
        assignedToIds: currentUser?.id ? [currentUser.id] : [],
        venueId: selectedLead.venueId,
      });
    }

    setQuickFollowupNote('');
  };

  // WhatsApp Sender Selection isolado e vinculado estritamente à Casa de Festa do Lead
  const venueSenderSources = useMemo(() => {
    const allWhatsappSources = (sources || []).filter(
      s => s.type === 'whatsapp_api' &&
           Boolean(getSourceInstanceToken(s) || (s.configuration as any)?.connectedPhone)
    );

    if (selectedLead?.venueId && selectedLead.venueId !== 'all') {
      const matchVenue = allWhatsappSources.filter(s => s.venueId === selectedLead.venueId);
      if (matchVenue.length > 0) return matchVenue;
    }

    if (activeVenueId && activeVenueId !== 'all' && activeVenueId !== 'multi') {
      const matchGlobal = allWhatsappSources.filter(s => s.venueId === activeVenueId);
      if (matchGlobal.length > 0) return matchGlobal;
    }

    return allWhatsappSources;
  }, [sources, selectedLead?.venueId, activeVenueId]);

  const [selectedSenderSourceId, setSelectedSenderSourceId] = useState<string>('');
  const manuallySelectedSenderLeadIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedLead) {
      setSelectedSenderSourceId('');
      manuallySelectedSenderLeadIdRef.current = null;
      return;
    }

    // Se o usuário selecionou manualmente a instância para este lead, preserva a escolha do usuário
    if (manuallySelectedSenderLeadIdRef.current === selectedLead.id && selectedSenderSourceId) {
      if (venueSenderSources.some(s => s.id === selectedSenderSourceId)) {
        return;
      }
    }

    const leadVenueId = selectedLead.venueId;
    const funnelPriorities = (activeFunnel as any)?.priorityWhatsappPerVenue as Record<string, string> | undefined;

    // 1. Prioridade configurada no Funil para a Casa de Festa deste Lead
    if (leadVenueId && funnelPriorities?.[leadVenueId]) {
      const targetId = funnelPriorities[leadVenueId];
      const targetSource = venueSenderSources.find(s => s.id === targetId);
      if (targetSource) {
        setSelectedSenderSourceId(targetId);
        return;
      }
    }

    // 2. Número pelo qual o Lead veio (sourceId do lead, se for WhatsApp da mesma Casa de Festa e estiver online)
    if (selectedLead.sourceId) {
      const foundSource = venueSenderSources.find(s => s.id === selectedLead.sourceId);
      if (foundSource && isSourceOnline(foundSource)) {
        setSelectedSenderSourceId(selectedLead.sourceId);
        return;
      }
    }

    // 3. WhatsApp Padrão do Funil (se online)
    const funnelDefaultId = (activeFunnel as any)?.defaultWhatsAppSourceId || (activeFunnel as any)?.defaultWhatsappSourceId;
    if (funnelDefaultId) {
      const foundDef = venueSenderSources.find(s => s.id === funnelDefaultId);
      if (foundDef && isSourceOnline(foundDef)) {
        setSelectedSenderSourceId(funnelDefaultId);
        return;
      }
    }

    // 4. Primeiro WhatsApp conectado ONLINE disponível para a Casa de Festa deste Lead
    const firstOnline = venueSenderSources.find(s => isSourceOnline(s));
    if (firstOnline) {
      setSelectedSenderSourceId(firstOnline.id);
      return;
    }

    // 5. Fallback geral
    if (venueSenderSources.length > 0) {
      setSelectedSenderSourceId(venueSenderSources[0].id);
    } else {
      setSelectedSenderSourceId('');
    }
  }, [selectedLead?.id, selectedLead?.venueId, selectedLead?.sourceId, activeFunnel, venueSenderSources]);

  const activeSenderSource = useMemo(() => {
    return venueSenderSources.find(s => s.id === selectedSenderSourceId) || venueSenderSources[0] || null;
  }, [venueSenderSources, selectedSenderSourceId]);

  const isSenderDisconnected = useMemo(() => {
    if (!activeSenderSource) return true;
    return !isSourceOnline(activeSenderSource);
  }, [activeSenderSource]);

  const connectedAlternativeSource = useMemo(() => {
    const onlineInVenue = venueSenderSources.find(s => s.id !== activeSenderSource?.id && isSourceOnline(s));
    if (onlineInVenue) return onlineInVenue;
    return (sources || []).find(s => s.type === 'whatsapp_api' && s.id !== activeSenderSource?.id && isSourceOnline(s)) || null;
  }, [venueSenderSources, activeSenderSource, sources]);

  const activeSenderToken = useMemo(() => {
    if (activeSenderSource) {
      const tok = getSourceInstanceToken(activeSenderSource);
      if (tok) return tok;
    }
    const anyWa = (sources || []).find(s => s.type === 'whatsapp_api' && getSourceInstanceToken(s));
    return getSourceInstanceToken(anyWa);
  }, [activeSenderSource, sources]);

  // Sincronização automática da foto de perfil do WhatsApp para o Lead e Contatos vinculados
  useEffect(() => {
    if (!selectedLead || !activeSenderToken) return;

    const phonesToFetch: Array<{ phone: string; isMain: boolean; contactId?: string }> = [];

    if (selectedLead.phone && !selectedLead.avatarUrl) {
      phonesToFetch.push({ phone: selectedLead.phone, isMain: true });
    }

    if (selectedLead.contacts && selectedLead.contacts.length > 0) {
      selectedLead.contacts.forEach((c: any) => {
        if (c.phone && !c.avatarUrl && !c.photoUrl) {
          phonesToFetch.push({ phone: c.phone, isMain: false, contactId: c.id });
        }
      });
    }

    if (phonesToFetch.length === 0) return;

    let isMounted = true;
    phonesToFetch.forEach(async (item) => {
      try {
        const pic = await uazapiService.fetchProfilePicture(activeSenderToken, item.phone);
        if (pic && isMounted) {
          if (item.isMain) {
            updateLeadData(selectedLead.id, { avatarUrl: pic });
            if (isSupabaseConfigured) {
              leadService.update(selectedLead.id, { avatarUrl: pic }).catch(() => {});
            }
          } else if (item.contactId) {
            const updatedContacts = (selectedLead.contacts || []).map((c: any) => 
              c.id === item.contactId ? { ...c, avatarUrl: pic } : c
            );
            updateLeadData(selectedLead.id, { contacts: updatedContacts });
            if (isSupabaseConfigured) {
              leadService.update(selectedLead.id, { contacts: updatedContacts }).catch(() => {});
            }
          }
        }
      } catch (err) {
        // Silencioso se não houver foto pública
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedLead?.id, selectedLead?.avatarUrl, activeSenderToken]);

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

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (selectedLeadId && (composerTab === 'whatsapp' || composerTab === 'notes')) {
      scrollToBottom('auto');
      const timer = setTimeout(() => scrollToBottom('auto'), 120);
      return () => clearTimeout(timer);
    }
  }, [selectedLeadId, composerTab, selectedLead?.activities, scrollToBottom]);

  // Controle de Presença em Tempo Real (Digitando... / Gravando áudio...) isolado por telefone de contato
  const lastPresenceTimeRef = useRef<number>(0);
  const presenceTimerRef = useRef<any>(null);
  const currentLeadPhoneRef = useRef<string>('');

  // Presença do Cliente / Lead em Tempo Real (Digitando... / Gravando áudio...)
  const [customerPresence, setCustomerPresence] = useState<{ isTyping: boolean; isRecording: boolean }>({ isTyping: false, isRecording: false });
  const customerPresenceTimerRef = useRef<any>(null);

  useEffect(() => {
    const unsub = uazapiSseService.onPresence((evt) => {
      const currentPhone = selectedRecipientPhone || selectedLead?.phone || '';
      const cleanCurrent = currentPhone.replace(/\D/g, '');
      const cleanIncoming = (evt.phone || '').replace(/\D/g, '');

      if (cleanCurrent && cleanIncoming && (cleanCurrent === cleanIncoming || cleanCurrent.endsWith(cleanIncoming) || cleanIncoming.endsWith(cleanCurrent))) {
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
  }, [selectedLead?.id, selectedRecipientPhone]);

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
      }).catch(() => {});
    }

    // Se parar de digitar por 8 segundos de inatividade completa, envia 'paused'
    if (presenceTimerRef.current) clearTimeout(presenceTimerRef.current);
    presenceTimerRef.current = setTimeout(() => {
      if (activeSenderToken && targetPhone) {
        uazapiService.sendPresence(activeSenderToken, {
          number: targetPhone,
          presence: 'paused',
        }).catch(() => {});
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
      }).catch(() => {});
    }
    currentLeadPhoneRef.current = newPhone;
    setCustomerPresence({ isTyping: false, isRecording: false });
    return () => {
      if (presenceTimerRef.current) clearTimeout(presenceTimerRef.current);
    };
  }, [selectedLead?.id, selectedRecipientPhone, activeSenderToken]);

  // Handle Send Message / Note
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedLead || !messageText.trim() || isLeadSpectator) return;

    if (presenceTimerRef.current) clearTimeout(presenceTimerRef.current);
    const textToSend = messageText.trim();
    const author = currentUser?.name || (isPostSaleFunnel || selectedLead.isClient ? 'Gestor de Sucesso' : 'Equipe Comercial');
    setMessageText('');

    let newActivity: LeadActivity | null = null;

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
    };

    const updatedActivities = mergeAndSortActivities(selectedLead.activities || [], [newActivity], selectedLead.id);
    updateLeadData(selectedLead.id, {
      activities: updatedActivities,
      updatedAt: new Date().toISOString().split('T')[0],
    });

    // Disparo oficial via UAZAPI
    let targetPhone = selectedRecipientPhone || selectedLead.phone;
    let effectiveToken = activeSenderToken;

    // Se o remetente atual estiver desconectado mas houver outro online, auto-chaveia para entregar a mensagem
    if (isSenderDisconnected && connectedAlternativeSource) {
      const altToken = getSourceInstanceToken(connectedAlternativeSource);
      if (altToken) {
        effectiveToken = altToken;
        setSelectedSenderSourceId(connectedAlternativeSource.id);
        manuallySelectedSenderLeadIdRef.current = selectedLead.id;
      }
    }

    if (targetPhone && effectiveToken) {
      // Limpa presença de digitando imediatamente para liberar a entrega
      uazapiService.sendPresence(effectiveToken, {
        number: targetPhone,
        presence: 'paused',
      }).catch(() => {});

      try {
        const sendRes = await uazapiService.sendText(effectiveToken, {
          number: targetPhone,
          text: textToSend,
          linkPreview: textToSend.includes('http://') || textToSend.includes('https://'),
          readchat: true,
          track_source: 'f5_system',
          track_id: `msg_${Date.now()}`,
        });

        // Se a API retornou erro no corpo da resposta
        if ((sendRes as any)?.error || (sendRes as any)?.status === 'error') {
          throw new Error((sendRes as any)?.message || (sendRes as any)?.error || 'Erro retornado pela API do WhatsApp.');
        }

        // Sucesso no envio: marca status como sent e persiste no Supabase
        if (newActivity) {
          const sentActivity: LeadActivity = { ...newActivity, status: 'sent', errorMessage: undefined };
          const finalActivities = updatedActivities.map(a => a.id === newActivity!.id ? sentActivity : a);
          updateLeadData(selectedLead.id, {
            activities: finalActivities,
            updatedAt: new Date().toISOString().split('T')[0],
          });

          if (isSupabaseConfigured) {
            leadService.addActivity(selectedLead.id, sentActivity)
              .catch(err => console.error('Erro ao salvar mensagem no Supabase:', err));
            leadService.update(selectedLead.id, {
              updatedAt: new Date().toISOString().split('T')[0],
            }).catch(() => {});
          }
        }

        // Sincroniza foto de perfil se o lead ainda não tiver foto no R2
        if (!selectedLead.avatarUrl) {
          uazapiService.fetchChatContactInfo(activeSenderToken, targetPhone)
            .then(async (info) => {
              if (info.profilePicUrl && info.profilePicUrl !== selectedLead.avatarUrl) {
                const permanentR2Avatar = await whatsappMediaService.syncWhatsAppAvatarToR2(info.realPhone || targetPhone, info.profilePicUrl);
                const finalAvatar = permanentR2Avatar || info.profilePicUrl;
                updateLeadData(selectedLead.id, { avatarUrl: finalAvatar });
                if (isSupabaseConfigured) {
                  leadService.update(selectedLead.id, { avatarUrl: finalAvatar }).catch(() => {});
                }
              }
            })
            .catch(() => {});
        }
      } catch (err: any) {
        console.error('Disparo UAZAPI falhou:', err);
        const errMsg = err?.message || 'Falha ao conectar com o WhatsApp via UAZAPI';
        if (newActivity) {
          const failedActivity: LeadActivity = { ...newActivity, status: 'failed', errorMessage: errMsg };
          const currentActivities = updatedActivities.map(a => a.id === newActivity!.id ? failedActivity : a);
          updateLeadData(selectedLead.id, {
            activities: currentActivities,
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

    const targetPhone = selectedRecipientPhone || selectedLead.phone;
    if (!activeSenderToken || !targetPhone) {
      alert(!activeSenderToken ? 'Nenhum canal de WhatsApp conectado para esta unidade.' : 'Telefone do destinatário não encontrado.');
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
        leadService.updateActivity(activity.id, { status: 'sent', errorMessage: undefined as any }).catch(() => {});
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
        leadService.updateActivity(activity.id, { status: 'failed', errorMessage: errMsg }).catch(() => {});
      }
    } finally {
      setRetryingMessageId(null);
    }
  };

  /**
   * Finaliza / Encerra o atendimento da conversa atual, registrando o encerramento no histórico e zerando a pendência de resposta (SLA)
   */
  const handleEndConversation = async (targetLeadId?: string) => {
    const targetLead = targetLeadId ? sourceLeads.find(l => l.id === targetLeadId) : selectedLead;
    if (!targetLead) return;

    const now = new Date().toISOString();
    const endSessionActivity: LeadActivity = {
      id: generateUuid(),
      leadId: targetLead.id,
      type: 'contact',
      title: 'Conversa Encerrada',
      text: `Atendimento encerrado por ${currentUser?.name || 'Equipe'}`,
      authorName: currentUser?.name || 'Equipe',
      authorId: currentUser?.id || 'team',
      authorAvatarUrl: currentUser?.avatarUrl,
      timestamp: now,
      status: 'read',
    };
    (endSessionActivity as any).metadata = {
      isSessionEnd: true,
      closedById: currentUser?.id,
      closedByName: currentUser?.name,
      fromMe: true,
    };

    const currentActivities = targetLead.activities || [];
    const updatedActivities = [...currentActivities, endSessionActivity];

    updateLeadData(targetLead.id, { 
      activities: updatedActivities,
      updatedAt: now,
    });

    if (isSupabaseConfigured) {
      leadService.addActivity(targetLead.id, endSessionActivity).catch(err => {
        console.error('Erro ao persistir encerramento de conversa no Supabase:', err);
      });
      leadService.update(targetLead.id, { updatedAt: now }).catch(() => {});
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
    return Array.from(map.values());
  }, [selectedLead, tasks]);

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

  const clientDocuments = useMemo<ClientDocument[]>(() => {
    return (currentClient?.documents || (selectedLead as any)?.documents || []) as ClientDocument[];
  }, [currentClient, selectedLead]);

  const handleSaveUpsell = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!upsellTitle.trim() || !upsellValue || !selectedLead) return;
    const numVal = parseFloat(upsellValue.toString().replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    if (numVal <= 0) return;

    const clientId = currentClient?.id || selectedLead.id;

    if (editingUpsell) {
      updateClientUpsellSale(clientId, editingUpsell.id, {
        title: upsellTitle.trim(),
        category: upsellCategory,
        value: numVal,
        saleDate: upsellDate,
        paymentStatus: upsellPaymentStatus,
        paymentMethod: upsellPaymentMethod,
        notes: upsellNotes.trim() || undefined,
      });
    } else {
      addClientUpsellSale(clientId, {
        title: upsellTitle.trim(),
        category: upsellCategory,
        value: numVal,
        saleDate: upsellDate,
        paymentStatus: upsellPaymentStatus,
        paymentMethod: upsellPaymentMethod,
        responsibleId: currentUser?.id,
        responsibleName: currentUser?.name || 'Administrador',
        notes: upsellNotes.trim() || undefined,
      });
    }

    setIsUpsellModalOpen(false);
    setEditingUpsell(null);
    setUpsellTitle('');
    setUpsellValue('');
    setUpsellNotes('');
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
    if (!docTitle.trim() || !docFileUrl.trim()) return;
    const clientId = currentClient?.id || selectedLead?.id;
    if (!clientId) return;

    addClientDocument(clientId, {
      title: docTitle.trim(),
      name: docTitle.trim(),
      type: docType,
      fileUrl: docFileUrl.trim(),
      url: docFileUrl.trim(),
      fileSize: docFileSize || 'PDF / Documento',
    });

    setIsDocModalOpen(false);
    setDocTitle('');
    setDocFileUrl('');
    setDocFileSize('');
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

  const handleSendUploadedFile = async (e: React.ChangeEvent<HTMLInputElement>, fileCategory: 'document' | 'image' | 'video' | 'audio') => {
    const file = e.target.files?.[0];
    if (!file || !selectedLead) return;

    const author = currentUser?.name || 'Equipe Comercial';
    const reader = new FileReader();

    reader.onload = async () => {
      const base64Data = reader.result as string;

      const activityId = generateUuid();
      const existingActs = selectedLead.activities || [];
      const lastActTime = existingActs.reduce((max, a) => Math.max(max, new Date(a.timestamp || 0).getTime()), 0);
      const finalTimestampIso = new Date(Math.max(Date.now(), lastActTime + 1000)).toISOString();

      const newActivity: LeadActivity = {
        id: activityId,
        leadId: selectedLead.id,
        timestamp: finalTimestampIso,
        type: 'contact',
        title: `${fileCategory === 'image' ? 'Foto' : fileCategory === 'video' ? 'Vídeo' : fileCategory === 'audio' ? 'Áudio' : 'Documento'} enviado: ${file.name}`,
        text: fileCategory === 'audio' ? `🎵 ${file.name}` : `Arquivo enviado via WhatsApp: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
        mediaUrl: base64Data,
        mediaType: fileCategory,
        authorName: currentUser?.name || author,
        authorId: currentUser?.id,
        authorAvatarUrl: currentUser?.avatarUrl,
      };

      const updatedActivities = mergeAndSortActivities(selectedLead.activities || [], [newActivity], selectedLead.id);
      updateLeadData(selectedLead.id, {
        activities: updatedActivities,
        updatedAt: new Date().toISOString().split('T')[0],
      });

      if (isSupabaseConfigured) {
        leadService.addActivity(selectedLead.id, newActivity)
          .catch(err => console.error('Erro ao salvar mídia no Supabase:', err));
      }

      const targetPhone = selectedRecipientPhone || selectedLead.phone;
      if (targetPhone && activeSenderToken) {
        try {
          await uazapiService.sendMedia(activeSenderToken, {
            number: targetPhone,
            file: base64Data,
            type: fileCategory === 'audio' ? 'audio' : (fileCategory === 'image' || fileCategory === 'video') ? 'image' : 'document',
            fileName: file.name,
            caption: file.name,
            ptt: false,
            delay: 0,
          });
        } catch (err) {
          console.error('Falha no envio de mídia UAZAPI:', err);
        }
      }

      // Background Cloudflare R2 Upload
      whatsappMediaService.uploadOutboundMedia(file, activeSenderToken || 'default')
        .then(({ publicUrl }) => {
          if (publicUrl) {
            updateLeadActivity(selectedLead.id, activityId, { mediaUrl: publicUrl });
          }
        })
        .catch(err => console.warn('Erro ao salvar mídia enviada no R2:', err));
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Envio de Figurinha / Sticker no WhatsApp
  const handleSendSticker = async (stickerUrl: string) => {
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
    };

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
          } catch {}
          return updated;
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Real Audio Recording Handlers (MediaRecorder)
  const startAudioRecording = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.start(200);
      }
    } catch (err) {
      console.warn('Permissão de microfone:', err);
    }

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
      }).catch(() => {});
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
      } catch {}
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
      }).catch(() => {});
    }
  };

  const stopAndSendAudio = () => {
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
      };

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
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/ogg; codecs=opus' });
        const reader = new FileReader();
        reader.onloadend = () => {
          finalizeAndSend(reader.result as string, audioBlob);
        };
        reader.readAsDataURL(audioBlob);
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

  // Timeline Activities (Chat do WhatsApp - Exclusivamente mensagens de conversação e anotações internas)
  const timelineActivities = useMemo(() => {
    if (!selectedLead?.activities) return [];
    
    // Filtra estritamente apenas mensagens de chat e notas de conversa (remove logs de CRM como status_change, creation, assignment, validation, realocação de funil)
    const chatOnly = selectedLead.activities.filter(a => {
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

      // 2. Proteção textual defensiva: bloqueia logs de sistema mesmo se gravados como contact
      const rawLower = `${a.title || ''} ${a.text || ''}`.toLowerCase();
      if (
        rawLower.includes('realocado de') ||
        rawLower.includes('status movido de') ||
        rawLower.includes('lead cadastrado via') ||
        rawLower.includes('lead migrado do funil') ||
        rawLower.includes('realocação de funil') ||
        rawLower.includes('etapa alterada')
      ) {
        return false;
      }

      return (
        a.type === 'contact' || 
        a.type === 'note' || 
        (a as any).type === 'whatsapp' ||
        (a as any).metadata?.isSessionEnd
      );
    });

    // Deduplicação inteligente de mensagens repetidas (por id e por conteúdo idêntico no mesmo minuto)
    const seenIds = new Set<string>();
    const seenFingerprints = new Set<string>();
    const deduped: LeadActivity[] = [];

    const sorted = [...chatOnly].sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());

    for (const act of sorted) {
      if (act.id && seenIds.has(act.id)) continue;
      if (act.id) seenIds.add(act.id);

      const minuteBucket = Math.floor(new Date(act.timestamp || 0).getTime() / 60000);
      const textKey = (act.text || act.title || '').trim().toLowerCase();
      const authorKey = (act.authorName || '').trim().toLowerCase();
      const fingerprint = `${act.type}_${minuteBucket}_${authorKey}_${textKey}`;

      if (textKey && act.type === 'contact' && seenFingerprints.has(fingerprint)) {
        continue;
      }
      if (textKey && act.type === 'contact') {
        seenFingerprints.add(fingerprint);
      }

      deduped.push(act);
    }

    return deduped;
  }, [selectedLead?.activities]);

  // Histórico de Ações e Anotações Internas (Aba Histórico - Sem mensagens de chat do cliente)
  const historyActivities = useMemo(() => {
    if (!selectedLead?.activities) return [];
    const items = selectedLead.activities.filter(a => 
      a.type === 'note' || 
      a.type === 'status_change' || 
      a.type === 'assignment' || 
      a.type === 'creation' || 
      a.type === 'deal_closed' || 
      a.type === 'validation' ||
      a.type === 'task_created' ||
      a.type === 'task_completed'
    );
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
    const hasAnswers = Boolean(
      selectedLead.mqlAnswers && 
      Object.keys(selectedLead.mqlAnswers).some(k => Boolean(selectedLead.mqlAnswers![k]))
    );
    if (!hasAnswers && (selectedLead.mqlScore === undefined || selectedLead.mqlScore === 0)) {
      return {
        score: undefined,
        label: 'Indefinido',
        color: 'var(--adm-text-muted)',
        bg: 'var(--adm-bg-card)',
        border: 'var(--adm-border)',
        isUndefined: true,
      };
    }
    const score = selectedLead.mqlScore ?? 0;
    const isTop = score >= 80 || selectedLead.mqlLevel === 'top';
    const isQualified = (score >= 50 && score < 80) || selectedLead.mqlLevel === 'qualified';
    const label = isTop ? 'ICP A' : isQualified ? 'ICP B' : 'ICP C';
    const color = isTop ? '#10B981' : isQualified ? '#F59E0B' : '#EF4444';
    const bg = isTop ? 'rgba(16, 185, 129, 0.15)' : isQualified ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)';
    const border = isTop ? 'rgba(16, 185, 129, 0.35)' : isQualified ? 'rgba(245, 158, 11, 0.35)' : 'rgba(239, 68, 68, 0.35)';
    return { score, label, color, bg, border, isUndefined: false };
  }, [selectedLead, mqlQuestions]);

  return (
    <div style={{
      height: isEmbeddedInFunnel ? 'calc(100vh - 100px)' : '100%',
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
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      position: 'relative',
    }}>
      
      {/* ── COLUNA 1: LISTA DE CONVERSAS / LEADS ───────────────────────── */}
      <div style={{
        width: '340px',
        minWidth: '300px',
        maxWidth: '360px',
        borderRight: '1px solid var(--adm-border)',
        display: 'flex',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: isPostSaleFunnel ? 'rgba(6, 182, 212, 0.15)' : 'rgba(37, 211, 102, 0.15)',
                color: isPostSaleFunnel ? '#06B6D4' : '#25D366',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <WhatsAppBrandIcon size={18} color={isPostSaleFunnel ? '#06B6D4' : '#25D366'} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                  {isEmbeddedInFunnel ? 'Caixa de Entrada' : 'WhatsApp Atendimento'}
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
                    {isPostSaleFunnel ? '👑 Sucesso do Cliente' : (activeFunnel?.name || 'Comercial')}
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
                <div style={{ fontSize: '0.74rem', color: isPostSaleFunnel ? '#06B6D4' : 'var(--adm-text-muted)', fontWeight: 800 }}>
                  {filteredLeads.length} {isPostSaleFunnel ? (filteredLeads.length === 1 ? 'cliente' : 'clientes') : (filteredLeads.length === 1 ? 'lead' : 'leads')}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: '0.85rem' }}>{isPostSaleFunnel ? '👑' : (activeFunnel?.icon || '🎯')}</span>
                    <span>
                      {selectedFunnelId === 'all' 
                        ? 'Todos os Funis Comerciais' 
                        : (selectedFunnelId === 'post_sale_default' || selectedFunnelId === 'post_sale'
                          ? 'Sucesso do Cliente (Pós-Venda)'
                          : (activeFunnel?.name || 'Funil Comercial'))}
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
                    maxHeight: '220px',
                    overflowY: 'auto',
                  }}>
                    <button
                      type="button"
                      onClick={() => handleSelectFunnel('all')}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: selectedFunnelId === 'all' ? 'var(--adm-accent-bg)' : 'transparent',
                        border: 'none',
                        color: selectedFunnelId === 'all' ? 'var(--adm-accent)' : 'var(--adm-text-title)',
                        fontSize: '0.74rem',
                        fontWeight: selectedFunnelId === 'all' ? 800 : 500,
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>💬 Todos os Funis Comerciais</span>
                      {selectedFunnelId === 'all' && <Check size={12} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectFunnel('post_sale_default')}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: isPostSaleFunnel ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                        border: 'none',
                        color: isPostSaleFunnel ? '#06B6D4' : 'var(--adm-text-title)',
                        fontSize: '0.74rem',
                        fontWeight: isPostSaleFunnel ? 800 : 500,
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>👑 Sucesso do Cliente (Pós-Venda)</span>
                      {isPostSaleFunnel && <Check size={12} color="#06B6D4" />}
                    </button>

                    {(funnels || []).filter(f => !f.isPostSale && f.category !== 'Pós-Venda').map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handleSelectFunnel(f.id)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          background: selectedFunnelId === f.id ? 'var(--adm-accent-bg)' : 'transparent',
                          border: 'none',
                          color: selectedFunnelId === f.id ? 'var(--adm-accent)' : 'var(--adm-text-title)',
                          fontSize: '0.74rem',
                          fontWeight: selectedFunnelId === f.id ? 800 : 500,
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>{f.icon || '🎯'} {f.name}</span>
                        {selectedFunnelId === f.id && <Check size={12} />}
                      </button>
                    ))}
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
              </div>

              {/* Search + Filter Button with Gear/Icon */}
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
                      height: '38px',
                      borderRadius: '10px',
                      fontSize: '0.78rem',
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      color: 'var(--adm-text-title)',
                      outline: 'none',
                    }}
                  />
                </div>

            {/* Filter Toggle Button */}
            <div ref={filterDropdownRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                title={isFilterActive ? 'Filtros ativos' : 'Filtrar conversas'}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  border: isFilterActive ? '1px solid var(--adm-accent)' : '1px solid var(--adm-border)',
                  background: isFilterActive ? 'var(--adm-accent-bg)' : 'var(--adm-bg-card)',
                  color: isFilterActive ? 'var(--adm-accent)' : '#9E988D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <SlidersHorizontal size={17} />
              </button>

              {/* Filter Popover Dropdown */}
              {isFilterDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  width: '280px',
                  background: '#141118',
                  border: '1px solid rgba(212, 175, 55, 0.35)',
                  borderRadius: '16px',
                  padding: '16px',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.8)',
                  zIndex: 9999,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#FFF' }}>Filtros & Ordenação</span>
                    {isFilterActive && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        style={{ background: 'transparent', border: 'none', color: '#D4AF37', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                  {/* Ordenação Local com Prioridade de Tempo de Espera */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#9E988D', marginBottom: '4px' }}>
                      Ordenar Conversas
                    </label>
                    <select
                      value={localSortBy}
                      onChange={(e) => handleUpdateSortBy(e.target.value)}
                      className="adm-input"
                      style={{ width: '100%', height: '34px', fontSize: '0.76rem', borderRadius: '8px' }}
                    >
                      <option value="waiting_time">⏱️ Tempo de Espera (Prioridade)</option>
                      <option value="recent">🕒 Mensagens Recentes</option>
                      <option value="oldest">⏳ Mensagens Antigas</option>
                      <option value="name_asc">🔤 Nome (A - Z)</option>
                      <option value="temperature">🔥 Temperatura do Lead</option>
                    </select>
                  </div>

                  {/* Filter: Venue */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#9E988D', marginBottom: '4px' }}>
                      Casa de Festa
                    </label>
                    <select
                      value={filterVenueId}
                      onChange={(e) => setFilterVenueId(e.target.value)}
                      className="adm-input"
                      style={{ width: '100%', height: '34px', fontSize: '0.76rem', borderRadius: '8px' }}
                    >
                      <option value="all">Todas as Casas</option>
                      {venues.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filter: Collaborator */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#9E988D', marginBottom: '4px' }}>
                      Responsável Comercial
                    </label>
                    <select
                      value={filterCollaboratorId}
                      onChange={(e) => setFilterCollaboratorId(e.target.value)}
                      className="adm-input"
                      style={{ width: '100%', height: '34px', fontSize: '0.76rem', borderRadius: '8px' }}
                    >
                      <option value="all">Todos os Atendentes</option>
                      {collaborators.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.role.toUpperCase()})</option>
                      ))}
                    </select>
                  </div>

                  {/* Filter: Temperature */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#9E988D', marginBottom: '4px' }}>
                      Temperatura do Lead
                    </label>
                    <select
                      value={filterTemperature}
                      onChange={(e) => setFilterTemperature(e.target.value)}
                      className="adm-input"
                      style={{ width: '100%', height: '34px', fontSize: '0.76rem', borderRadius: '8px' }}
                    >
                      <option value="all">Todas as Temperaturas</option>
                      <option value="hot">Quente (Alta Probabilidade)</option>
                      <option value="warm">Morno (Em Negociação)</option>
                      <option value="cold">Frio (Inicial)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
            </>
          )}
        </div>

        {/* Leads Conversations Scrollable List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {filteredLeads.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--adm-text-muted)' }}>
              <MessageSquare size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <div style={{ fontSize: '0.86rem', fontWeight: 700 }}>Nenhuma conversa encontrada</div>
              <div style={{ fontSize: '0.72rem', marginTop: '2px' }}>Ajuste os filtros ou o termo de busca</div>
            </div>
          ) : (
            filteredLeads.map(lead => {
              const isSelected = selectedLeadId === lead.id;
              const venue = venues.find(v => v.id === lead.venueId);
              const lastActivity = lead.activities?.[lead.activities.length - 1];

              // Apenas mensagens REAIS de chat (tipo contact com texto ou mídia) aparecem no preview da caixa de entrada
              const lastMessageActivity = (lead.activities || [])
                .slice()
                .reverse()
                .find(a => a.type === 'contact' && (a.text || a.mediaUrl));
              const rawMessageText = lastMessageActivity?.text || '';
              // Limpa tags internas como [media:...] ou [failed:...]
              let cleanedText = rawMessageText
                .replace(/^\[media:[^\]]+\]\s*/i, '')
                .replace(/^\[failed:[^\]]+\]\s*/i, '')
                .trim();

              const isAudioMsg = (
                lastMessageActivity?.mediaType === 'audio' ||
                cleanedText.toLowerCase().includes('[áudio]') || 
                cleanedText.toLowerCase().includes('[audio]') || 
                cleanedText.includes('🎵') ||
                cleanedText.startsWith('data:audio') || 
                cleanedText.includes('.mp3') || 
                cleanedText.includes('.ogg') ||
                cleanedText.startsWith('{"URL"') ||
                cleanedText.includes('mmg.whatsapp.net') ||
                lastMessageActivity?.title?.toLowerCase().includes('voz') ||
                lastMessageActivity?.title?.toLowerCase().includes('áudio')
              );

              const isImageMsg = (
                !isAudioMsg && (
                  lastMessageActivity?.mediaType === 'image' ||
                  cleanedText.toLowerCase().includes('[imagem]') || 
                  cleanedText.toLowerCase().includes('[foto]') || 
                  cleanedText.includes('📷') ||
                  cleanedText.startsWith('data:image') ||
                  /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(cleanedText)
                )
              );

              const isVideoMsg = (
                !isAudioMsg && !isImageMsg && (
                  lastMessageActivity?.mediaType === 'video' ||
                  cleanedText.toLowerCase().includes('[vídeo]') || 
                  cleanedText.toLowerCase().includes('[video]') || 
                  cleanedText.includes('🎥') ||
                  cleanedText.includes('🎬') ||
                  cleanedText.startsWith('data:video') ||
                  /\.(mp4|mov|avi|webm)(\?.*)?$/i.test(cleanedText)
                )
              );

              const isDocMsg = (
                !isAudioMsg && !isImageMsg && !isVideoMsg && (
                  lastMessageActivity?.mediaType === 'document' ||
                  cleanedText.toLowerCase().includes('[documento]') || 
                  cleanedText.toLowerCase().includes('[arquivo]') || 
                  cleanedText.includes('📄') ||
                  /\.(pdf|docx?|xlsx?|pptx?|txt|zip)(\?.*)?$/i.test(cleanedText)
                )
              );

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

              const lastTime = lastMessageActivity?.timestamp || lead.updatedAt;
              const pendingWaitMs = getLeadPendingWaitingTime(lead, collabIds);
              const sla = getLeadWaitTimeSla(pendingWaitMs);

              const hasRealName = Boolean(lead.name && lead.name.trim() !== '' && !lead.name.startsWith('LEAD-') && lead.name !== lead.code);
              const displayName = hasRealName ? lead.name : (lead.code || 'Lead sem nome');
              
              const isIndication = lead.source === 'indicacao' || Boolean(lead.debutanteName && lead.debutanteName !== 'Indicação Externa' && lead.debutanteName !== 'WhatsApp Direto');
              const rawOrigin = lead.subSource || lead.sourceName || (lead.source === 'whatsapp' ? 'WhatsApp' : lead.source === 'instagram' ? 'Instagram' : lead.source === 'parceria' ? 'Parceria' : lead.source === 'evento_externo' ? 'Evento Externo' : lead.source);
              const originLabel = isIndication ? 'Indicação' : (rawOrigin === 'Direto' ? null : rawOrigin);

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
                    if (isMultiSelectMode) {
                      toggleLeadSelection(lead.id);
                      return;
                    }
                    if (lead.unreadCount && lead.unreadCount > 0) {
                      markLeadAsRead(lead.id);
                    }
                    setSelectedLeadId(lead.id);
                    if (isEmbeddedInFunnel) {
                      setIsInspectorOpen(true);
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
                        onChange={() => {}}
                        style={{
                          cursor: 'pointer',
                          accentColor: 'var(--adm-accent, #6366F1)',
                          width: '14px',
                          height: '14px',
                        }}
                      />
                    </div>
                  )}

                  {/* Lead Avatar */}
                  <SafeAvatar
                    src={lead.avatarUrl}
                    name={displayName}
                    size={38}
                  />

                  {/* Info Column */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {/* 1. Linha Superior: Nome do Usuário + Menu 3 Pontinhos + Horário no Topo Direito */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {displayName}
                        </div>

                        {/* Menu de 3 Pontinhos (Ações Rápidas do Lead) */}
                        <div style={{ position: 'relative' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
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

                          {activeLeadMenuId === lead.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
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

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveLeadMenuId(null);
                                  handleEndConversation(lead.id);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '6px 8px',
                                  borderRadius: '5px',
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#10B981',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  width: '100%',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <CheckCheck size={12} color="#10B981" />
                                <span>Encerrar Conversa</span>
                              </button>

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
                            </div>
                          )}
                        </div>
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
                        {Boolean(lead.unreadCount && lead.unreadCount > 0) && (
                          <div style={{
                            background: '#10B981',
                            color: '#fff',
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            borderRadius: '10px',
                            padding: '1px 5px',
                            minWidth: '18px',
                            textAlign: 'center',
                            lineHeight: '1.2',
                          }}>
                            {lead.unreadCount}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 2. Linha Intermediária: Prévia Real da Mensagem */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      minHeight: '14px',
                      overflow: 'hidden',
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
                        flex: 1,
                      }}>
                        {cleanPreviewText || (lastActivity?.title || 'Sem mensagens recentes')}
                      </span>
                    </div>

                    {/* 3. Linha Inferior: Etiquetas à Esquerda + Avatar do Responsável no Canto Inferior Direito */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginTop: '1px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                        {venue && (
                          <span style={{
                            fontSize: '0.60rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: 'rgba(59, 130, 246, 0.12)',
                            color: '#3B82F6',
                            border: '1px solid rgba(59, 130, 246, 0.35)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            whiteSpace: 'nowrap',
                          }}>
                            <Building2 size={10} color="#3B82F6" />
                            <span>{venue.name}</span>
                          </span>
                        )}

                        {isPostSaleFunnel ? (
                          <>
                            {/* Stage Badge for Post-Sale */}
                            {(() => {
                              const stgKey = (lead.stage as string) || 'onboarding';
                              const stgCfg = POST_SALE_STAGE_CONFIG[stgKey] || { label: stgKey, color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' };
                              return (
                                <span style={{
                                  fontSize: '0.58rem',
                                  fontWeight: 800,
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  background: stgCfg.bg,
                                  color: stgCfg.color,
                                  border: `1px solid ${stgCfg.color}40`,
                                  whiteSpace: 'nowrap',
                                }}>
                                  {stgCfg.label}
                                </span>
                              );
                            })()}

                            {/* Party Date Badge with Countdown */}
                            {(lead.partyDate || lead.eventDate) && (() => {
                              const pStr = (lead.partyDate || lead.eventDate) as string;
                              const pTime = new Date(pStr + 'T12:00:00').getTime();
                              const diff = Math.ceil((pTime - Date.now()) / (1000 * 60 * 60 * 24));
                              return (
                                <span style={{
                                  fontSize: '0.58rem',
                                  fontWeight: 700,
                                  color: '#F59E0B',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  whiteSpace: 'nowrap',
                                }}>
                                  <Calendar size={10} color="#F59E0B" />
                                  {new Date(pStr + 'T12:00:00').toLocaleDateString('pt-BR')} {diff >= 0 ? `(${diff}d)` : ''}
                                </span>
                              );
                            })()}

                            {/* Deal Value */}
                            {lead.dealValue ? (
                              <span style={{
                                fontSize: '0.62rem',
                                fontWeight: 800,
                                color: '#10B981',
                                whiteSpace: 'nowrap',
                              }}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(lead.dealValue)}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <>
                            {originLabel && (
                              <span style={{
                                fontSize: '0.60rem',
                                fontWeight: 700,
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: isIndication ? 'rgba(212, 175, 55, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                                color: isIndication ? '#D4AF37' : '#10B981',
                                border: `1px solid ${isIndication ? 'rgba(212, 175, 55, 0.35)' : 'rgba(16, 185, 129, 0.25)'}`,
                                whiteSpace: 'nowrap',
                              }}>
                                {originLabel}
                              </span>
                            )}
                            {hasIcpConfigured(lead) && (() => {
                              const hasAns = Boolean(lead.mqlAnswers && Object.keys(lead.mqlAnswers).some(k => Boolean(lead.mqlAnswers![k])));
                              const isUndef = !hasAns && (lead.mqlScore === undefined || lead.mqlScore === 0);
                              if (isUndef) {
                                return (
                                  <span style={{
                                    fontSize: '0.58rem',
                                    fontWeight: 700,
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    background: 'var(--adm-bg-card)',
                                    color: 'var(--adm-text-muted)',
                                    border: '1px solid var(--adm-border)',
                                    whiteSpace: 'nowrap',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                  }}>
                                    <IcpTargetUserIcon size={10} color="var(--adm-text-muted)" />
                                    <span>Indefinido</span>
                                  </span>
                                );
                              }
                              const isTop = (lead.mqlScore ?? 0) >= 80 || lead.mqlLevel === 'top';
                              const isQual = ((lead.mqlScore ?? 0) >= 50 && (lead.mqlScore ?? 0) < 80) || lead.mqlLevel === 'qualified';
                              const lbl = isTop ? 'ICP A' : isQual ? 'ICP B' : 'ICP C';
                              const col = isTop ? '#10B981' : isQual ? '#F59E0B' : '#EF4444';
                              const bgCol = isTop ? 'rgba(16,185,129,0.12)' : isQual ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)';
                              return (
                                <span style={{
                                  fontSize: '0.58rem',
                                  fontWeight: 700,
                                  padding: '1px 4px',
                                  borderRadius: '4px',
                                  background: bgCol,
                                  color: col,
                                  whiteSpace: 'nowrap',
                                }}>
                                  {lbl}
                                </span>
                              );
                            })()}
                          </>
                        )}
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
        </div>
      </div>

      {/* ── COLUNA 2: INSPECTOR DO LEAD / CLIENTE (EXPANSÍVEL) ──────────── */}
      {isInspectorOpen && selectedLead && (
        <div style={{
          width: '430px',
          minWidth: '380px',
          maxWidth: '460px',
          borderRight: '1px solid var(--adm-border)',
          background: 'var(--adm-bg-card)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          animation: 'fadeIn 0.15s ease-out',
        }}>
          {isPostSaleFunnel || selectedLead.isClient ? (
            <AdminClientDrawerInspector
              lead={selectedLead}
              onStageChange={(newStage: ClientStage) => {
                updateClientStage(selectedLead.id, newStage);
              }}
              onToggleCollapse={() => setIsInspectorOpen(false)}
              onOpenDebutanteApp={onOpenDebutanteApp}
              onOpenFullInspector={onOpenClientFullProfile}
              readOnly={isReadOnlyForPosVenda || isLeadSpectator}
            />
          ) : (
            <AdminLeadInspector
              lead={selectedLead}
              isPostSale={false}
              onStageChange={(newStage: CrmStage) => {
                updateLeadStage(selectedLead.id, newStage);
              }}
              onToggleCollapse={() => setIsInspectorOpen(false)}
              readOnly={isReadOnlyForPosVenda || isLeadSpectator}
              selectedRecipientPhone={selectedRecipientPhone || selectedLead?.phone}
              onSelectRecipientPhone={(phone) => setSelectedRecipientPhone(phone)}
            />
          )}
        </div>
      )}

      {/* ── COLUNA 3: ÁREA DE CHAT / TIMELINE & COMPOSER ─────────────────── */}
      <div style={{
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
                {/* Botão com Setinha para Abrir/Fechar a Ficha do Lead */}
                <button
                  type="button"
                  onClick={() => setIsInspectorOpen(!isInspectorOpen)}
                  title={isInspectorOpen ? 'Recolher Ficha do Lead' : 'Expandir Ficha do Lead'}
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    background: isInspectorOpen ? 'var(--adm-accent-bg)' : 'var(--adm-bg-card)',
                    border: `1.5px solid ${isInspectorOpen ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                    color: isInspectorOpen ? 'var(--adm-accent)' : 'var(--adm-text-title)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                >
                  {isInspectorOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>

                <SafeAvatar
                  src={selectedLead.avatarUrl}
                  name={selectedLead.name}
                  size={40}
                  border="1.5px solid var(--adm-accent)"
                />

                <div style={{ minWidth: 0, flex: 1 }}>
                  {(() => {
                    const hasRealLeadName = Boolean(selectedLead.name && selectedLead.name.trim() !== '' && !selectedLead.name.startsWith('LEAD-') && selectedLead.name !== selectedLead.code);
                    const headerDisplayName = hasRealLeadName ? selectedLead.name : (selectedLead.code || 'Lead sem nome');

                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--adm-text-title)', margin: 0 }}>
                          {headerDisplayName}
                        </h3>
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
                        <PhoneCall size={11} /> {formatPhone(selectedLead.phone || (selectedLead as any).payerPhone) || 'Sem telefone'} • {isPostSaleFunnel || selectedLead.isClient ? `Gestor de Sucesso: ${selectedLead.assignedTo || selectedLead.sdrName || 'Não atribuído'}` : (selectedLead.sdrName ? `SDR: ${selectedLead.sdrName}` : 'Sem SDR')}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Actions (Encerrar Conversa + Fechar se aplicável) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {!isLeadSpectator && (
                  <button
                    type="button"
                    onClick={() => handleEndConversation()}
                    title="Encerrar conversa e finalizar tempo de atendimento (Zera pendência de SLA)"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 12px',
                      borderRadius: '8px',
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      color: '#10B981',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 3px rgba(16, 185, 129, 0.08)',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.20)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.12)'}
                  >
                    <CheckCheck size={14} />
                    <span>Encerrar Conversa</span>
                  </button>
                )}

                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--adm-border)',
                      color: 'var(--adm-text-muted)',
                      borderRadius: '8px',
                      padding: '7px 10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Fechar Visualização"
                  >
                    <X size={15} />
                  </button>
                )}
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
                <span><strong>Modo Espectador:</strong> Este lead pertence a <strong>{selectedLead.assignedTo || 'outro colaborador'}</strong>. Apenas visualização permitida.</span>
              </div>
            )}

            {/* ── TIMELINE DINÂMICA CONECTADA À ABA DO COMPOSER ── */}
            <div 
              ref={timelineContainerRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                background: composerTab === 'whatsapp'
                  ? (isDarkMode 
                      ? '#0b141a' 
                      : '#efeae2')
                  : 'radial-gradient(ellipse at 50% 10%, rgba(212, 175, 55, 0.03) 0%, transparent 60%)',
            }}>
              {/* 1. ABA WHATSAPP: Exibe histórico de mensagens com layout bilateral */}
              {composerTab === 'whatsapp' && (
                <>
                  {timelineActivities.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: isDarkMode ? '#8696a0' : '#667781' }}>
                      <MessageSquare size={36} style={{ opacity: 0.3, marginBottom: '8px' }} />
                      <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>Nenhuma mensagem trocada ainda</div>
                      <div style={{ fontSize: '0.74rem', marginTop: '4px' }}>Digite uma mensagem abaixo para iniciar o atendimento via WhatsApp.</div>
                    </div>
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

                      let effectiveMediaUrl = act.mediaUrl;
                      let effectiveMediaType: LeadActivity['mediaType'] = act.mediaType;
                      let effectiveText = act.text || '';

                      if (effectiveText && effectiveText.startsWith('{') && (effectiveText.includes('mimetype') || effectiveText.includes('audio') || effectiveText.includes('ptt') || effectiveText.includes('directPath') || effectiveText.includes('mmg.whatsapp.net'))) {
                        try {
                          const parsed = JSON.parse(effectiveText);
                          const parsedUrl = parsed.URL || parsed.url || parsed.fileURL || parsed.mediaUrl || parsed.directPath;
                          const mimetype = String(parsed.mimetype || parsed.mime || '').toLowerCase();
                          if (parsedUrl) {
                            effectiveMediaUrl = effectiveMediaUrl || parsedUrl;
                            if (mimetype.includes('image')) {
                              effectiveMediaType = 'image';
                              effectiveText = '📷 Foto';
                            } else if (mimetype.includes('video')) {
                              effectiveMediaType = 'video';
                              effectiveText = '🎥 Vídeo';
                            } else if (mimetype.includes('audio') || parsed.ptt || effectiveText.includes('ptt') || effectiveText.includes('audioMessage')) {
                              effectiveMediaType = 'audio';
                              effectiveText = '🎵 Mensagem de voz';
                            }
                          }
                        } catch {
                          const urlMatch = effectiveText.match(/"URL"\s*:\s*"([^"]+)"/i) || (effectiveText.includes('audio') ? effectiveText.match(/https:\/\/mmg\.whatsapp\.net[^\s"'}]+/i) : null);
                          if (urlMatch) {
                            effectiveMediaUrl = effectiveMediaUrl || urlMatch[1] || urlMatch[0];
                            effectiveMediaType = 'audio';
                            effectiveText = '🎵 Mensagem de voz';
                          }
                        }
                      }

                      const isSticker = effectiveMediaType === 'sticker' || effectiveText?.includes('✨ Figurinha');
                      const msgRawContent = effectiveMediaUrl || effectiveText || '';
                      const isInstagramMsg = Boolean(msgRawContent && /https?:\/\/(www\.)?instagram\.com/i.test(msgRawContent));
                      const instagramMsgUrl = msgRawContent.match(/https?:\/\/(?:www\.)?instagram\.com[^\s]*/i)?.[0] || msgRawContent;
                      const isAudioMsg = Boolean(
                        effectiveMediaType === 'audio' || 
                        (effectiveMediaUrl && (
                          effectiveMediaUrl.startsWith('data:audio') || 
                          /\.(ogg|mp3|opus|wav|m4a|aac)(\?.*)?$/i.test(effectiveMediaUrl) ||
                          (effectiveMediaUrl.includes('mmg.whatsapp.net') && (effectiveText.includes('🎵') || effectiveText.includes('voz')))
                        ))
                      );

                      if (isIncoming) {
                        // Balão à Esquerda (Lead / Cliente)
                        return (
                          <React.Fragment key={act.id}>
                            {renderDateDivider()}
                            <div
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
                              (selectedLead as any).avatarUrl ? (
                                <img
                                  src={(selectedLead as any).avatarUrl}
                                  alt={selectedLead.name}
                                  style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', border: isDarkMode ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid rgba(0,0,0,0.1)', flexShrink: 0 }}
                                />
                              ) : (
                                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#e0e7ff', color: '#3B82F6', fontWeight: 800, fontSize: '0.74rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1.5px solid rgba(59, 130, 246, 0.35)' }}>
                                  {(selectedLead.name || 'L').charAt(0).toUpperCase()}
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
                              <div style={{
                                background: isDarkMode ? '#202c33' : '#ffffff',
                                border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
                                borderRadius: isSameAsPrev ? '12px' : '14px 14px 14px 2px',
                                padding: '7px 11px',
                                color: isDarkMode ? '#e9edef' : '#111b21',
                                boxShadow: isDarkMode ? '0 1px 2px rgba(0,0,0,0.3)' : '0 1px 0.5px rgba(11,20,26,.13)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '3px',
                              }}>
                                {!isSameAsPrev && (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginBottom: '2px' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: isDarkMode ? '#53bdeb' : '#128c7e' }}>
                                      {selectedLead.name || act.authorName || 'Cliente'}
                                    </span>
                                    <span style={{ fontSize: '0.62rem', color: isDarkMode ? '#8696a0' : '#667781' }}>
                                      {formattedTime}
                                    </span>
                                  </div>
                                )}

                                {/* Conteúdo: Instagram Card, Áudio Player, Foto, Vídeo, Documento ou Texto */}
                                {isInstagramMsg ? (
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
                                    isIncoming={true}
                                    authorName={selectedLead.name}
                                    avatarUrl={(selectedLead as any)?.avatarUrl || (selectedLead as any)?.profilePicUrl}
                                    formattedTime={formattedTime}
                                    isDarkMode={isDarkMode}
                                    status="read"
                                  />
                                ) : effectiveMediaType === 'image' && effectiveMediaUrl ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div 
                                      style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer' }}
                                      onClick={() => setLightboxMedia({ url: act.mediaUrl!, type: 'image', title: act.text || 'Foto' })}
                                    >
                                      <img
                                        src={act.mediaUrl}
                                        alt={act.text || 'Foto'}
                                        style={{
                                          maxWidth: '280px',
                                          maxHeight: '280px',
                                          width: '100%',
                                          borderRadius: '8px',
                                          objectFit: 'cover',
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
                                ) : (
                                  <div style={{ fontSize: '0.84rem', lineHeight: 1.45, whiteSpace: 'pre-wrap', color: isDarkMode ? '#e9edef' : '#111b21', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '8px' }}>
                                    <span>{renderFormattedTextWithLinks(act.text || act.title, isDarkMode)}</span>
                                    {isSameAsPrev && (
                                      <span style={{ fontSize: '0.60rem', color: isDarkMode ? '#8696a0' : '#667781', flexShrink: 0 }}>{formattedTime}</span>
                                    )}
                                  </div>
                                )}
                              </div>
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

                    return (
                      <React.Fragment key={act.id}>
                        {renderDateDivider()}
                        <div
                          style={{
                            alignSelf: 'flex-end',
                            maxWidth: '75%',
                            display: 'flex',
                            alignItems: 'flex-end',
                            gap: '8px',
                            margin: isSameAsPrev ? '1px 0' : '6px 0 1px 0',
                          }}
                        >
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
                            <div style={{
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
                            }}>
                              {!isSameAsPrev && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginBottom: '2px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: isFailedMsg ? '#EF4444' : (isDarkMode ? '#d9fdd3' : '#008069') }}>
                                      {authorName}
                                    </span>
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

                              {/* Conteúdo: Instagram Card, Áudio Player, Foto, Vídeo, Documento ou Texto */}
                              {isInstagramMsg ? (
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
                                  isIncoming={false}
                                  authorName={authorName}
                                  avatarUrl={authorAvatar}
                                  formattedTime={formattedTime}
                                  isDarkMode={isDarkMode}
                                  status={act.status === 'failed' ? 'failed' : 'read'}
                                />
                              ) : act.mediaType === 'image' && act.mediaUrl ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div 
                                    style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer' }}
                                    onClick={() => setLightboxMedia({ url: act.mediaUrl!, type: 'image', title: act.text || 'Foto' })}
                                  >
                                    <img
                                      src={act.mediaUrl}
                                      alt={act.text || 'Foto'}
                                      style={{
                                        maxWidth: '280px',
                                        maxHeight: '280px',
                                        width: '100%',
                                        borderRadius: '8px',
                                        objectFit: 'cover',
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
                              ) : (
                                <div style={{ fontSize: '0.84rem', lineHeight: 1.45, whiteSpace: 'pre-wrap', color: isDarkMode ? '#e9edef' : '#111b21', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '8px' }}>
                                  <span>{renderFormattedTextWithLinks(act.text || act.title, isDarkMode)}</span>
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

                          {/* Avatar do Autor: Se for WhatsApp App / Web Oficial externo, exibe ícone do WhatsApp */}
                          {!isSameAsNext ? (
                            isExternalWa ? (
                              <div
                                title="Mensagem enviada pelo celular ou WhatsApp Web"
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
                        src={(selectedLead as any).avatarUrl}
                        name={selectedLead.name}
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
                  historyActivities.map((act) => {
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

                    const linkedTaskId = (act as any).customProperties?.taskId || (act as any).taskId;

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

                    // 1. Caso seja puramente robô/sistema sem colaborador humano
                    if (isPureBotOrSystem) {
                      return (
                        <div
                          key={act.id}
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
                            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(139, 92, 246, 0.12) 100%)',
                            border: '1px solid rgba(139, 92, 246, 0.35)',
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
                      );
                    }

                    // 2. Anotação de Usuário (Follow-up / Tarefa, Nota Interna Manual ou Auditoria do Sistema)
                    // Alinhada à DIREITA se for do usuário logado (isMine), e à ESQUERDA se for de outro colaborador
                    const noteThemeColor = isTaskOrFollowUpNote 
                      ? '#F59E0B' 
                      : isAutomaticNote 
                      ? '#8B5CF6' 
                      : '#0284C7';

                    const noteBg = isTaskOrFollowUpNote
                      ? (isMine ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.08)')
                      : isAutomaticNote
                      ? (isMine 
                          ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.18) 0%, rgba(99, 102, 241, 0.12) 100%)' 
                          : 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(139, 92, 246, 0.08) 100%)')
                      : (isMine ? 'rgba(2, 132, 199, 0.12)' : 'var(--adm-bg-input)');

                    const noteBorder = isTaskOrFollowUpNote
                      ? '1.5px solid rgba(245, 158, 11, 0.45)'
                      : isAutomaticNote
                      ? '1.5px solid rgba(139, 92, 246, 0.40)'
                      : (isMine ? '1px solid rgba(2, 132, 199, 0.35)' : '1px solid var(--adm-border)');

                    return (
                      <div
                        key={act.id}
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
                                    const foundTask = tasks.find(t => t.id === linkedTaskId || (t.leadId === selectedLead?.id && t.isFollowUp));
                                    if (foundTask) {
                                      setSelectedTaskForDetail(foundTask);
                                    } else {
                                      // Fallback gracioso
                                      setSelectedTaskForDetail({
                                        id: linkedTaskId || act.id,
                                        title: act.title || 'Follow-up do Lead',
                                        type: 'follow_up',
                                        status: 'completed',
                                        priority: 'medium',
                                        leadId: selectedLead?.id,
                                        assignedToId: act.authorId,
                                        assignedToName: act.authorName,
                                        dueDate: act.timestamp?.split('T')[0] || new Date().toISOString().split('T')[0],
                                        dueTime: '12:00',
                                        resolution: act.text,
                                        isFollowUp: true,
                                      } as any);
                                    }
                                  }}
                                  title="Visualizar detalhes desta tarefa / follow-up"
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
                                  maxWidth: '280px',
                                  maxHeight: '220px',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  objectFit: 'cover',
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
                    );
                  })
                )
              )}

              {/* Âncora invisível para rolagem automática até o final da conversa */}
              <div ref={messagesEndRef} style={{ height: '1px', flexShrink: 0 }} />

              {/* 3. ABA TAREFAS / FOLLOW-UPS: Exibe tarefas agendadas no mesmo padrão rico do Cliente */}
              {composerTab === 'tasks' && (
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: 'var(--adm-text-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isPostSaleFunnel ? <Calendar size={18} color="var(--adm-accent, #6366F1)" /> : <PhoneCall size={18} color="#3B82F6" />}
                        <span>{isPostSaleFunnel ? 'Tarefas & Agendamentos' : 'Follow-ups do Lead'}</span>
                      </h3>
                      <p style={{ margin: '3px 0 0 0', fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
                        {isPostSaleFunnel 
                          ? 'Acompanhamento de prazos, compromissos e pendências operacionais deste cliente'
                          : 'Histórico e próximos contatos / follow-ups agendados com este lead'}
                      </p>
                    </div>

                    {isPostSaleFunnel && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTask(null);
                          setIsTaskModalOpen(true);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: 'var(--adm-accent, #6366F1)',
                          color: '#FFF',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)',
                        }}
                      >
                        <Plus size={14} />
                        <span>Nova Tarefa / Agendamento</span>
                      </button>
                    )}
                  </div>

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
                      {combinedLeadTasks.map(task => {
                        const isDone = task.status === 'completed';
                        const isLate = !isDone && Boolean(task.dueDate) && new Date(task.dueDate!) < new Date();
                        const collabLabel = (task as any).assignedToName || task.createdByName || (task.assignedToIds && task.assignedToIds.length ? 'Equipe' : null);
                        const isInlineCompleting = inlineCompletingTaskId === task.id;

                        return (
                          <div
                            key={task.id}
                            style={{
                              background: 'var(--adm-bg-card)',
                              border: `1px solid ${isDone ? 'rgba(16, 185, 129, 0.25)' : isLate ? 'rgba(239, 68, 68, 0.3)' : 'var(--adm-border)'}`,
                              borderRadius: '10px',
                              padding: '12px 16px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                  <strong style={{
                                    fontSize: '0.86rem',
                                    color: isDone ? 'var(--adm-text-muted)' : 'var(--adm-text-title)',
                                    textDecoration: isDone ? 'line-through' : 'none',
                                  }}>
                                    {task.title || task.description}
                                  </strong>
                                  {task.priority && (
                                    <span style={{
                                      fontSize: '10px',
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      fontWeight: 700,
                                      background: task.priority === 'urgent' || task.priority === 'high' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                                      color: task.priority === 'urgent' || task.priority === 'high' ? '#EF4444' : '#3B82F6',
                                    }}>
                                      {task.priority === 'urgent' ? 'Urgente' : task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                                    </span>
                                  )}
                                  {task.type && (
                                    <span style={{
                                      fontSize: '10px',
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      fontWeight: 600,
                                      background: 'var(--adm-bg-input)',
                                      color: 'var(--adm-text-muted)',
                                      border: '1px solid var(--adm-border)',
                                    }}>
                                      {task.type}
                                    </span>
                                  )}
                                </div>

                                {task.description && task.title && task.description !== task.title && (
                                  <p style={{ margin: '0 0 6px', fontSize: '0.76rem', color: 'var(--adm-text-muted)', lineHeight: 1.4 }}>
                                    {task.description}
                                  </p>
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: isLate ? '#EF4444' : undefined, fontWeight: isLate ? 700 : 500 }}>
                                    <Clock size={12} />
                                    {task.dueDate ? `Prazo: ${new Date(task.dueDate).toLocaleDateString('pt-BR')} ${(task as any).dueTime ? `às ${(task as any).dueTime}` : ''}` : 'Sem prazo'}
                                    {isLate && ' (Atrasada)'}
                                  </span>
                                  {collabLabel && (
                                    <span>Resp: <strong style={{ color: 'var(--adm-text-title)' }}>{collabLabel}</strong></span>
                                  )}
                                  {isDone && (task as any).completedAt && (
                                    <span style={{ color: '#10B981', fontWeight: 600 }}>
                                      • Concluído em {new Date((task as any).completedAt).toLocaleString('pt-BR')}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Action Buttons: Eye Icon for details & smart notes */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTask(task);
                                    setIsTaskModalOpen(true);
                                  }}
                                  title="Ver detalhes e notas inteligentes"
                                  style={{
                                    background: 'var(--adm-bg-input)',
                                    border: '1px solid var(--adm-border)',
                                    borderRadius: '6px',
                                    padding: '6px 8px',
                                    color: 'var(--adm-accent, #6366F1)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                  }}
                                >
                                  <Eye size={14} />
                                  <span>Ver</span>
                                </button>
                              </div>
                            </div>

                            {/* 3-Stage Status Pill Selector */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              paddingTop: '8px',
                              borderTop: '1px solid var(--adm-border)',
                              flexWrap: 'wrap',
                            }}>
                              <span style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginRight: '4px' }}>
                                Etapa:
                              </span>
                              {(['todo', 'in_progress', 'completed'] as any[]).map(statusKey => {
                                const isCurrent = task.status === statusKey;
                                const labels: Record<string, string> = {
                                  todo: 'Não Iniciada',
                                  in_progress: 'Em Execução',
                                  waiting: 'Aguardando',
                                  completed: 'Finalizada',
                                };

                                let activeBg = 'var(--adm-bg-input)';
                                let activeColor = 'var(--adm-text-muted)';
                                let activeBorder = 'var(--adm-border)';

                                if (isCurrent) {
                                  if (statusKey === 'completed') {
                                    activeBg = 'rgba(16, 185, 129, 0.15)';
                                    activeColor = '#10B981';
                                    activeBorder = 'rgba(16, 185, 129, 0.4)';
                                  } else if (statusKey === 'in_progress') {
                                    activeBg = 'rgba(59, 130, 246, 0.15)';
                                    activeColor = '#3B82F6';
                                    activeBorder = 'rgba(59, 130, 246, 0.4)';
                                  } else {
                                    activeBg = 'rgba(245, 158, 11, 0.15)';
                                    activeColor = '#F59E0B';
                                    activeBorder = 'rgba(245, 158, 11, 0.4)';
                                  }
                                }

                                return (
                                  <button
                                    key={statusKey}
                                    type="button"
                                    onClick={() => {
                                      if (statusKey === 'completed') {
                                        if (isDone) {
                                          if (updateTask) updateTask(task.id, { status: 'todo', completedAt: undefined });
                                        } else {
                                          setInlineCompletingTaskId(prev => prev === task.id ? null : task.id);
                                          setInlineResolutionText('');
                                        }
                                      } else {
                                        setInlineCompletingTaskId(null);
                                        if (updateTask) updateTask(task.id, { status: statusKey, customStatusId: statusKey === 'in_progress' ? 'st_in_progress' : 'st_todo', completedAt: undefined });
                                      }
                                    }}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '4px 9px',
                                      borderRadius: '6px',
                                      border: `1px solid ${activeBorder}`,
                                      background: activeBg,
                                      color: activeColor,
                                      fontSize: '0.70rem',
                                      fontWeight: isCurrent ? 800 : 500,
                                      cursor: 'pointer',
                                      transition: 'all 0.12s ease',
                                    }}
                                  >
                                    {isCurrent && statusKey === 'completed' && <CheckCircle2 size={11} />}
                                    <span>{labels[statusKey]}</span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Inline Completion Box */}
                            {isInlineCompleting && (
                              <div style={{
                                marginTop: '4px',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                background: isDarkMode ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4',
                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                animation: 'fadeIn 0.15s ease-out',
                              }}>
                                <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#10B981' }}>
                                  O que aconteceu neste follow-up? (Salvo automaticamente no histórico):
                                </div>
                                <textarea
                                  value={inlineResolutionText}
                                  onChange={(e) => setInlineResolutionText(e.target.value)}
                                  placeholder="Descreva o retorno do cliente ou resultado do contato..."
                                  className="adm-input"
                                  style={{
                                    minHeight: '60px',
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
                                      padding: '5px 10px',
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
                                    onClick={() => handleCompleteInlineTask(task, inlineResolutionText)}
                                    style={{
                                      padding: '6px 14px',
                                      borderRadius: '6px',
                                      border: 'none',
                                      background: '#10B981',
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
                                    <span>Concluir e Salvar no Histórico</span>
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Resolution / Feedback if completed */}
                            {(task.resolution || (task as any).customProperties?.resolution) && !isInlineCompleting && (
                              <div style={{
                                background: 'rgba(16, 185, 129, 0.06)',
                                borderLeft: '3px solid #10B981',
                                padding: '6px 10px',
                                borderRadius: '0 6px 6px 0',
                                fontSize: '0.72rem',
                                color: 'var(--adm-text-title)',
                              }}>
                                <span style={{ fontWeight: 700, color: '#10B981', display: 'block', fontSize: '0.68rem', textTransform: 'uppercase' }}>
                                  Registro de Conclusão / O que aconteceu:
                                </span>
                                {task.resolution || (task as any).customProperties?.resolution}
                              </div>
                            )}
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
                                    <span>Data: {sale.saleDate ? new Date(sale.saleDate + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</span>
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
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                      {clientDocuments.map(doc => {
                        const typeLabels: Record<string, { label: string; color: string }> = {
                          contract: { label: 'Contrato Principal', color: '#8B5CF6' },
                          amendment: { label: 'Aditivo Contratual', color: '#3B82F6' },
                          receipt: { label: 'Comprovante / Recibo', color: '#10B981' },
                          id_document: { label: 'Documento / RG / CPF', color: '#F59E0B' },
                          other: { label: 'Outro Anexo', color: '#6B7280' },
                        };
                        const tInfo = typeLabels[doc.type] || typeLabels.other;

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
                                  <span style={{ fontSize: '0.64rem', color: tInfo.color, fontWeight: 700 }}>
                                    {tInfo.label}
                                  </span>
                                </div>
                              </div>

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
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--adm-border)' }}>
                              <span style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>
                                {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('pt-BR') : 'Anexo'}
                              </span>

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
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Indicador Flutuante / Live de Digitando / Gravando Áudio do Cliente no Chat */}
              {composerTab === 'whatsapp' && (customerPresence.isTyping || customerPresence.isRecording) && (
                <div style={{
                  alignSelf: 'flex-start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#202c33',
                  border: '1px solid rgba(0, 168, 132, 0.3)',
                  borderRadius: '14px 14px 14px 2px',
                  padding: '8px 14px',
                  color: '#00a884',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                  margin: '4px 0',
                }}>
                  {customerPresence.isRecording ? (
                    <>
                      <Mic size={15} color="#00a884" />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e9edef' }}>
                        {selectedLead.name ? `${selectedLead.name} está gravando áudio...` : 'Gravando áudio...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00a884' }} />
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00a884' }} />
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00a884' }} />
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e9edef', marginLeft: '4px' }}>
                        {selectedLead.name ? `${selectedLead.name} está digitando...` : 'Digitando...'}
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
              accept=".pdf,.doc,.docx,.xlsx,.xls,.txt,.csv"
              onChange={(e) => handleSendUploadedFile(e, 'document')}
            />
            <input
              ref={fileMediaInputRef}
              type="file"
              style={{ display: 'none' }}
              accept="image/*,video/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const isVid = file.type.startsWith('video');
                  handleSendUploadedFile(e, isVid ? 'video' : 'image');
                }
              }}
            />
            <input
              ref={fileAudioInputRef}
              type="file"
              style={{ display: 'none' }}
              accept="audio/*"
              onChange={(e) => handleSendUploadedFile(e, 'audio')}
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

            {isLeadSpectator ? (
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
                  {isPostSaleFunnel ? <Calendar size={13} /> : <PhoneCall size={13} />}
                  <span>{isPostSaleFunnel ? 'Tarefas & Agendamentos' : 'Follow-ups'}</span>
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
                /* 3. COMPOSER: QUICK FOLLOW-UP BAR */
                <form onSubmit={handleCreateQuickFollowup} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--adm-bg-card)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '12px',
                  padding: '8px 12px',
                  flexWrap: 'wrap',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <select
                      value={quickFollowupType}
                      onChange={(e) => setQuickFollowupType(e.target.value)}
                      className="adm-input"
                      style={{ height: '36px', fontSize: '0.74rem', borderRadius: '8px', padding: '0 8px', fontWeight: 700 }}
                    >
                      <option value="Ligação WhatsApp">📞 Ligação WhatsApp</option>
                      <option value="Mensagem WhatsApp">💬 Mensagem</option>
                      <option value="Reunião / Visita">🤝 Visita / Reunião</option>
                      <option value="Proposta / Orçamento">📄 Enviar Proposta</option>
                      <option value="Outro">📌 Outro Follow-up</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="date"
                      value={quickFollowupDate}
                      onChange={(e) => setQuickFollowupDate(e.target.value)}
                      className="adm-input"
                      style={{ height: '36px', fontSize: '0.74rem', borderRadius: '8px', padding: '0 6px' }}
                    />
                    <input
                      type="time"
                      value={quickFollowupTime}
                      onChange={(e) => setQuickFollowupTime(e.target.value)}
                      className="adm-input"
                      style={{ height: '36px', fontSize: '0.74rem', borderRadius: '8px', padding: '0 6px', width: '80px' }}
                    />
                  </div>

                  <input
                    type="text"
                    value={quickFollowupNote}
                    onChange={(e) => setQuickFollowupNote(e.target.value)}
                    placeholder="Resumo do follow-up (opcional)..."
                    className="adm-input"
                    style={{ flex: 1, minWidth: '160px', height: '36px', borderRadius: '8px', fontSize: '0.76rem' }}
                  />

                  <button
                    type="submit"
                    className="adm-btn-primary"
                    style={{
                      height: '36px',
                      padding: '0 14px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: '#3B82F6',
                    }}
                  >
                    <Plus size={14} />
                    <span>Agendar Follow-up</span>
                  </button>
                </form>
              ) : composerTab === 'notes' ? (
                /* 4. COMPOSER: ANOTAÇÕES MULTIMÍDIA COM GRAVADOR DE VOZ E COMPRESSÃO */
                isNoteRecording ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#202c33',
                    borderRadius: '24px',
                    padding: '6px 14px',
                    gap: '12px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
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
                        color: '#8696a0',
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
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e9edef', fontFamily: 'monospace' }}>
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
                            backgroundColor: isNoteAudioPaused ? '#8696a0' : 'var(--adm-accent, #6366F1)',
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
                              alert('Permissão de microfone necessária para gravar áudio na nota.');
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
                    background: '#202c33',
                    borderRadius: '24px',
                    padding: '6px 14px',
                    gap: '12px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
                  }}>
                    {/* Botão de Lixeira (Cancelar e Descartar Áudio) */}
                    <button
                      type="button"
                      onClick={cancelRecording}
                      title="Cancelar gravação"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#8696a0',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'color 0.15s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#8696a0'}
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
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e9edef', fontFamily: 'monospace' }}>
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
                            backgroundColor: isAudioPaused ? '#8696a0' : '#00a884',
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
                        color: '#8696a0',
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
                      {/* Remetente WhatsApp Conectado (Isolado por Casa de Festa) */}
                      <div ref={senderDropdownRef} style={{ position: 'relative' }}>
                        <button
                          type="button"
                          onClick={() => setIsSenderDropdownOpen(prev => !prev)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '7px',
                            background: 'var(--adm-bg-card)',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            border: isSenderDisconnected ? '1px solid rgba(239, 68, 68, 0.4)' : isSenderDropdownOpen ? '1px solid #10B981' : '1px solid var(--adm-border)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                          }}
                        >
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>
                            Disparado por:
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
                              }}>
                                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: online ? '#10B981' : '#EF4444', display: 'inline-block' }} />
                                <span>{info.cleanName}</span>
                                {info.formattedPhone && (
                                  <span style={{ opacity: 0.85, fontWeight: 700 }}>• {info.formattedPhone}</span>
                                )}
                              </span>
                            );
                          })() : (
                            <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#EF4444' }}>
                              Nenhuma instância disponível
                            </span>
                          )}

                          {venueSenderSources.length > 1 && (
                            <ChevronDown 
                              size={13} 
                              style={{ 
                                transform: isSenderDropdownOpen ? 'rotate(180deg)' : 'rotate(0)', 
                                transition: 'transform 0.15s ease',
                                color: 'var(--adm-text-muted)',
                                marginLeft: '2px'
                              }} 
                            />
                          )}
                        </button>

                        {/* Popup Dropdown de Instâncias */}
                        {isSenderDropdownOpen && venueSenderSources.length > 0 && (
                          <div style={{
                            position: 'absolute',
                            bottom: 'calc(100% + 6px)',
                            left: 0,
                            zIndex: 9999,
                            minWidth: '330px',
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
                                    }
                                    setIsSenderDropdownOpen(false);
                                  }}
                                  title={!isOnline ? 'Instância desconectada. Reconecte em Configurações > Origens.' : `Disparar por ${info.cleanName}`}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '10px',
                                    padding: '8px 10px',
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
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0, flex: 1 }}>
                                    {instanceAvatar ? (
                                      <SafeAvatar name={info.cleanName} src={instanceAvatar} size={28} />
                                    ) : (
                                      <div style={{
                                        width: '28px',
                                        height: '28px',
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

                                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: isOnline ? 'var(--adm-text-title)' : '#EF4444' }}>
                                          {info.cleanName}
                                        </span>
                                        {vName && (
                                          <span style={{ fontSize: '0.62rem', padding: '1px 6px', borderRadius: '4px', background: 'var(--adm-bg-input)', color: 'var(--adm-text-muted)', border: '1px solid var(--adm-border)' }}>
                                            {vName}
                                          </span>
                                        )}
                                      </div>
                                      {info.formattedPhone && (
                                        <span style={{ fontSize: '0.70rem', color: isOnline ? 'var(--adm-text-muted)' : '#EF4444', fontWeight: 600 }}>
                                          {info.formattedPhone}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                    <span style={{
                                      fontSize: '0.64rem',
                                      fontWeight: 800,
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                      background: isOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                      color: isOnline ? '#10B981' : '#EF4444',
                                      border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
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
                                Enviado para:
                              </span>

                              {/* Foto / Avatar do destinatário antes do nome */}
                              {availableRecipients[0].avatarUrl || selectedLead?.avatarUrl ? (
                                <img
                                  src={availableRecipients[0].avatarUrl || selectedLead?.avatarUrl}
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
                                <span>{availableRecipients[0].name}</span>
                                {availableRecipients[0].phone && (
                                  <span style={{ opacity: 0.85, fontWeight: 700 }}>• {formatPhone(availableRecipients[0].phone)}</span>
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
                                  Enviado para:
                                </span>

                                {(() => {
                                  const currentRec = availableRecipients.find(r => (selectedRecipientPhone || selectedLead?.phone) === r.phone) || availableRecipients[0];
                                  const recAvatar = currentRec.avatarUrl || selectedLead?.avatarUrl;

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
                                        <span>{currentRec.name}</span>
                                        {currentRec.phone && (
                                          <span style={{ opacity: 0.85, fontWeight: 700 }}>• {formatPhone(currentRec.phone)}</span>
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
                                    const isSelected = (selectedRecipientPhone || selectedLead?.phone) === rec.phone;
                                    return (
                                      <div
                                        key={rec.phone}
                                        onClick={() => {
                                          setSelectedRecipientPhone(rec.phone);
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
                            A instância <strong>{activeSenderSource.name}</strong> está desconectada do WhatsApp.
                          </span>
                        </div>
                        {connectedAlternativeSource && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSenderSourceId(connectedAlternativeSource.id);
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

                    {/* Cápsula Arredondada Estilo WhatsApp Web */}
                    <form onSubmit={handleSendMessage} style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: isDarkMode ? '#202c33' : '#ffffff',
                      borderRadius: '24px',
                      padding: '4px 8px 4px 10px',
                      border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #d1d7db',
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

                      {/* Campo de Texto (Enter para Enviar) */}
                      <input
                        type="text"
                        value={messageText}
                        onChange={(e) => {
                          setMessageText(e.target.value);
                          if (composerTab === 'whatsapp') {
                            triggerComposingPresence();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e);
                          }
                        }}
                        placeholder="Digite uma mensagem"
                        style={{
                          flex: 1,
                          height: '36px',
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          color: isDarkMode ? '#e9edef' : '#111b21',
                          fontSize: '0.86rem',
                          padding: '0 4px',
                        }}
                      />

                      {/* Botão Dinâmico: Se tiver texto -> Enviar (#00a884); Se vazio -> Microfone */}
                      {messageText.trim().length > 0 ? (
                        <button
                          type="submit"
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
                          onClick={startAudioRecording}
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
                            flexShrink: 0,
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#00a884'}
                          onMouseLeave={(e) => e.currentTarget.style.color = isDarkMode ? '#8696a0' : '#54656f'}
                        >
                          <Mic size={20} />
                        </button>
                      )}
                    </form>
                  </div>
                )
              )}
            </div>
            )}
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--adm-text-muted)', gap: '12px' }}>
            <MessageSquare size={48} style={{ opacity: 0.2 }} />
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
              Selecione uma conversa ao lado
            </div>
            <div style={{ fontSize: '0.8rem', maxWidth: '320px', textAlign: 'center' }}>
              Inicie atendimentos, responda dúvidas e gerencie o histórico de WhatsApp dos seus leads.
            </div>
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
        stages={activeFunnel?.stages || []}
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
                  <select
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
                  </select>
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
                  <select
                    value={upsellPaymentStatus}
                    onChange={(e) => setUpsellPaymentStatus(e.target.value as any)}
                    className="adm-input"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', fontSize: '0.82rem' }}
                  >
                    <option value="pago">Pago à Vista (Liquidado)</option>
                    <option value="pendente">Pendente / A Receber</option>
                    <option value="parcelado">Parcelado (Nas Mensalidades)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-title)', marginBottom: '5px' }}>
                    Forma de Pagamento:
                  </label>
                  <select
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
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-title)', marginBottom: '5px' }}>
                    Data do Fechamento / Venda:
                  </label>
                  <input
                    type="date"
                    required
                    value={upsellDate}
                    onChange={(e) => setUpsellDate(e.target.value)}
                    className="adm-input"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', fontSize: '0.82rem' }}
                  />
                </div>
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
                <select
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
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-title)', marginBottom: '5px' }}>
                  Link / URL do Arquivo:
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://... ou caminho do arquivo"
                  value={docFileUrl}
                  onChange={(e) => setDocFileUrl(e.target.value)}
                  className="adm-input"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-title)', marginBottom: '5px' }}>
                  Tamanho Estimado (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ex: 1.4 MB, 520 KB..."
                  value={docFileSize}
                  onChange={(e) => setDocFileSize(e.target.value)}
                  className="adm-input"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', fontSize: '0.82rem' }}
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
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#F59E0B',
                    color: '#FFF',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                  }}
                >
                  Anexar Documento
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

    </div>
  );
};
