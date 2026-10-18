import React, { useRef, useState, useEffect, useMemo } from 'react';
import { 
  X, Check, Download, Share2, Calendar, 
  MapPin, Users, Building2, ShieldCheck, Loader2,
  Bell, ChevronDown, ChevronUp, Clock, CheckCircle2, XCircle, Sparkles
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { useAdminState } from '../../context/AdminStateContext';
import { isPhoneMatch } from '../../services/leadService';
import { formatPhone } from '../../utils/phoneFormatter';
import type { CommercialCommitmentType, AdminTask } from '../../types/admin';

export interface AppointmentReceiptData {
  id?: string;
  leadId?: string;
  type: CommercialCommitmentType;
  code: string; // Ex: AGV-10492 ou AGD-30291
  leadName: string;
  leadPhone?: string;
  leadEmail?: string;
  venueName: string;
  venueAddress?: string;
  venueLogoUrl?: string;
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm
  pax: number;
  closerName: string;
  closerRoleTitle?: string;
  closerPhotoUrl?: string;
  createdByName?: string;
  createdAtStr?: string;
  notes?: string;
}

interface AdminAppointmentReceiptModalProps {
  receipt: AppointmentReceiptData;
  onClose: () => void;
  tasks?: AdminTask[];
}

export const AdminAppointmentReceiptModal: React.FC<AdminAppointmentReceiptModalProps> = ({
  receipt,
  onClose,
  tasks = [],
}) => {
  const printableCardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const { leads, venues, collaborators, currentUser } = useAdminState();

  const isVisit = receipt.type === 'visit';
  const themeColor = isVisit ? '#10B981' : '#D97706';
  const typeLabel = isVisit ? 'Visita Comercial' : 'Degustação Gastronômica';
  const formattedCode = receipt.code.startsWith('#') ? receipt.code : `#${receipt.code}`;

  // Localização inteligente com fallback nos dados globais caso a URL venha ausente no payload
  const effectiveVenueLogo = useMemo(() => {
    if (receipt.venueLogoUrl) return receipt.venueLogoUrl;
    const v = venues.find(v => 
      (receipt.venueName && v.name.trim().toLowerCase() === receipt.venueName.trim().toLowerCase()) ||
      v.id === (receipt as any).venueId
    );
    return v?.logoUrl || (v as any)?.logo_url || '';
  }, [receipt.venueLogoUrl, receipt.venueName, venues]);

  const effectiveCloserPhoto = useMemo(() => {
    if (receipt.closerPhotoUrl && receipt.closerPhotoUrl.trim()) return receipt.closerPhotoUrl;
    const cleanCloserName = (receipt.closerName || '').trim().toLowerCase();
    const closerFirstName = cleanCloserName.split(/\s+/)[0];

    const c = collaborators.find(c => {
      const cName = (c.name || '').trim().toLowerCase();
      const cFirstName = cName.split(/\s+/)[0];
      return (
        c.id === (receipt as any).closerId ||
        c.id === (receipt as any).responsibleCollaboratorId ||
        (cleanCloserName && (cName === cleanCloserName || cName.includes(cleanCloserName) || cleanCloserName.includes(cName))) ||
        (closerFirstName && closerFirstName.length >= 3 && cFirstName === closerFirstName)
      );
    });

    if (c) return c.avatarUrl || (c as any)?.photoUrl || (c as any)?.avatar_url || '';

    if (currentUser?.name && cleanCloserName) {
      const curName = currentUser.name.trim().toLowerCase();
      const curFirstName = curName.split(/\s+/)[0];
      if (curName === cleanCloserName || curName.includes(cleanCloserName) || cleanCloserName.includes(curName) || (closerFirstName && closerFirstName === curFirstName)) {
        return currentUser.avatarUrl || (currentUser as any)?.photoUrl || (currentUser as any)?.avatar_url || '';
      }
    }
    return '';
  }, [receipt.closerPhotoUrl, receipt.closerName, collaborators, currentUser]);

  // Estados de imagem pré-convertida para Data URL (evita tainted canvas) e controle de erro
  const [closerPhotoDataUrl, setCloserPhotoDataUrl] = useState<string | null>(null);
  const [venueLogoDataUrl, setVenueLogoDataUrl] = useState<string | null>(null);
  const [venueLogoFailed, setVenueLogoFailed] = useState(false);
  const [closerPhotoFailed, setCloserPhotoFailed] = useState(false);

  // Visualização e acompanhamento de tarefas de Confirmação 1 e 2
  const [showConfirmationTasks, setShowConfirmationTasks] = useState(false);

  const notif1 = useMemo(() => {
    if (!tasks || !receipt.id) return null;
    return tasks.find(t => 
      (t.customProperties?.parentTaskId === receipt.id && t.customProperties?.notificationNumber === 1) ||
      (receipt.leadId && t.leadId === receipt.leadId && (t.title.toLowerCase().includes('notificar sobre') || t.title.toLowerCase().includes('lembrete: notificar')))
    );
  }, [tasks, receipt.id, receipt.leadId]);

  const notif2 = useMemo(() => {
    if (!tasks || !receipt.id) return null;
    return tasks.find(t => 
      (t.customProperties?.parentTaskId === receipt.id && t.customProperties?.notificationNumber === 2) ||
      (receipt.leadId && t.leadId === receipt.leadId && (t.title.toLowerCase().includes('confirmar presença') || t.title.toLowerCase().includes('confirmação 24h')))
    );
  }, [tasks, receipt.id, receipt.leadId]);

  const evaluateNotif = (notif: AdminTask | null | undefined, _notifNumber: 1 | 2) => {
    const deactivatedTooltip = 'Esta confirmação foi desativada pelo motivo do evento ser muito próximo da data (não foi possível criar tarefa retroativa).';

    if (!notif) {
      return {
        status: 'disabled' as const,
        label: 'Desativada',
        tooltip: deactivatedTooltip,
        isPositive: false,
        isDisabled: true,
        sdrName: 'SDR Automático',
        dueDate: 'Não programada',
      };
    }

    const sdrId = notif.assignedToIds?.[0];
    const sdrCollab = collaborators.find(c => c.id === sdrId);
    const sdrName = sdrCollab?.name || notif.createdByName || 'SDR Responsável';

    if (notif.status !== 'completed') {
      return {
        status: 'pending' as const,
        label: 'Pendente',
        tooltip: 'Aguardando o momento hábil de contato pelo SDR.',
        isPositive: false,
        isDisabled: false,
        sdrName,
        dueDate: notif.dueDate ? `${notif.dueDate.split('-').reverse().join('/')}${notif.dueTime ? ` às ${notif.dueTime}` : ''}` : 'A definir',
      };
    }

    const resText = `${notif.resolution || ''} ${notif.observations || ''}`.toLowerCase();
    const isNegative = resText.includes('cancelad') || resText.includes('não') || resText.includes('desmarc') || resText.includes('ausente') || resText.includes('negativ');

    if (isNegative) {
      return {
        status: 'negative' as const,
        label: 'Não Confirmado',
        tooltip: 'O cliente informou que não poderá comparecer.',
        isPositive: false,
        isDisabled: false,
        sdrName,
        dueDate: notif.dueDate ? notif.dueDate.split('-').reverse().join('/') : 'Realizado',
      };
    }

    return {
      status: 'positive' as const,
      label: 'Confirmado',
      tooltip: 'Presença confirmada pelo cliente com sucesso.',
      isPositive: true,
      isDisabled: false,
      sdrName,
      dueDate: notif.dueDate ? notif.dueDate.split('-').reverse().join('/') : 'Realizado',
    };
  };

  const eval1 = evaluateNotif(notif1, 1);
  const eval2 = evaluateNotif(notif2, 2);

  const presenceSummary = useMemo(() => {
    if (eval1.isPositive && eval2.isPositive) {
      return {
        label: 'Mais que Confirmado (100%)',
        bg: '#ECFDF5',
        text: '#047857',
        border: '#A7F3D0',
        icon: <Sparkles size={14} color="#059669" />,
      };
    }
    if (eval1.isDisabled && eval2.isPositive) {
      return {
        label: 'Confirmado (100%)',
        bg: '#ECFDF5',
        text: '#047857',
        border: '#A7F3D0',
        icon: <Sparkles size={14} color="#059669" />,
      };
    }
    if (eval1.isDisabled && eval2.isDisabled) {
      return {
        label: 'Confirmado Imediato (100%)',
        bg: '#ECFDF5',
        text: '#047857',
        border: '#A7F3D0',
        icon: <Sparkles size={14} color="#059669" />,
      };
    }
    if (eval1.isPositive || eval2.isPositive) {
      return {
        label: 'Cliente Confirmado (50%)',
        bg: '#EFF6FF',
        text: '#1D4ED8',
        border: '#BFDBFE',
        icon: <Check size={14} color="#2563EB" />,
      };
    }
    return {
      label: 'Não Confirmado (0%)',
      bg: '#F8FAFC',
      text: '#64748B',
      border: '#E2E8F0',
      icon: <Clock size={14} color="#94A3B8" />,
    };
  }, [eval1, eval2]);

  // Helper robusto para converter URL remota para Data URL base64 contornando bloqueios CORS
  const convertRemoteUrlToBase64 = async (url: string): Promise<string> => {
    if (!url) return '';
    if (url.startsWith('data:')) return url;

    // 1. Tenta fetch com mode: 'cors' direto (Cloudflare R2 agora com CORS habilitado)
    try {
      const res = await fetch(url, { mode: 'cors', cache: 'force-cache' });
      if (res.ok) {
        const blob = await res.blob();
        return await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string) || url);
          reader.onerror = () => resolve(url);
          reader.readAsDataURL(blob);
        });
      }
    } catch {
      // Fallback
    }

    // 2. Se falhar, tenta via proxy de imagens se disponível
    if (url.includes('r2.dev') || url.includes('cloudflarestorage.com')) {
      try {
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
          const blob = await res.blob();
          return await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string) || url);
            reader.onerror = () => resolve(url);
            reader.readAsDataURL(blob);
          });
        }
      } catch {}
    }

    // 3. Fallback via elemento Image nativo com canvas offscreen
    return new Promise<string>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
            return;
          }
        } catch {
          // Continua para fallback
        }
        resolve(url);
      };
      img.onerror = () => resolve(url);
      img.src = url;
    });
  };

  useEffect(() => {
    let isMounted = true;

    if (effectiveCloserPhoto) {
      convertRemoteUrlToBase64(effectiveCloserPhoto).then(data => {
        if (isMounted && data) setCloserPhotoDataUrl(data);
      });
    }

    if (effectiveVenueLogo) {
      convertRemoteUrlToBase64(effectiveVenueLogo).then(data => {
        if (isMounted && data) setVenueLogoDataUrl(data);
      });
    }

    return () => {
      isMounted = false;
    };
  }, [effectiveCloserPhoto, effectiveVenueLogo]);

  // Formata a data por extenso
  const formattedDate = useMemo(() => {
    if (!receipt.dateStr) return '';
    try {
      const [y, m, d] = receipt.dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return receipt.dateStr;
    }
  }, [receipt.dateStr]);

  // Localiza o lead correspondente com fallback inteligente por telefone ou nome
  const targetLeadId = useMemo(() => {
    if (receipt.leadId) return receipt.leadId;
    const match = leads.find(l => 
      (receipt.leadPhone && isPhoneMatch(l.phone, receipt.leadPhone)) ||
      (receipt.leadName && l.name.trim().toLowerCase() === receipt.leadName.trim().toLowerCase())
    );
    return match?.id || '';
  }, [receipt.leadId, receipt.leadPhone, receipt.leadName, leads]);

  // Assegura que todas as imagens estejam em Base64 antes de invocar html2canvas
  const ensureImagesConverted = async () => {
    const [resolvedVenueLogo, resolvedCloserPhoto] = await Promise.all([
      effectiveVenueLogo ? convertRemoteUrlToBase64(effectiveVenueLogo) : Promise.resolve(null),
      effectiveCloserPhoto ? convertRemoteUrlToBase64(effectiveCloserPhoto) : Promise.resolve(null),
    ]);
    if (resolvedVenueLogo) setVenueLogoDataUrl(resolvedVenueLogo);
    if (resolvedCloserPhoto) setCloserPhotoDataUrl(resolvedCloserPhoto);
    // Aguarda ciclo de renderização
    await new Promise(r => setTimeout(r, 60));
  };

  // Função para baixar a imagem PNG idêntica ao que está na tela via html2canvas (Resolução Retina 2x)
  const handleDownloadImage = async () => {
    if (!printableCardRef.current || isDownloading) return;
    setIsDownloading(true);
    try {
      await ensureImagesConverted();

      const canvas = await html2canvas(printableCardRef.current, {
        scale: 2, // 2x para nitidez cristalina
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FFFFFF',
        logging: false,
        imageTimeout: 15000,
      });

      const imageURL = canvas.toDataURL('image/png');
      const cleanCode = receipt.code.replace(/[^a-zA-Z0-9_-]/g, '');
      const link = document.createElement('a');
      link.download = `comprovante_${cleanCode || 'agendamento'}.png`;
      link.href = imageURL;
      link.click();
    } catch (err) {
      console.error('Erro ao gerar imagem:', err);
      alert('Não foi possível gerar a imagem idêntica do comprovante.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Função para compartilhar a foto anexada dentro do chat do lead no sistema (sem abrir WhatsApp Web externo)
  const handleShareToChat = async () => {
    if (!printableCardRef.current || isSharing) return;
    setIsSharing(true);
    try {
      await ensureImagesConverted();

      // 1. Gera a imagem PNG do comprovante idêntica ao que está na tela
      const canvas = await html2canvas(printableCardRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FFFFFF',
        logging: false,
        imageTimeout: 15000,
      });

      const dataUrl = canvas.toDataURL('image/png');
      const cleanCode = receipt.code.replace(/[^a-zA-Z0-9_-]/g, '');
      const fileName = `comprovante_${cleanCode || 'agendamento'}.png`;

      const defaultCaption = `Olá, ${receipt.leadName}! Segue o seu comprovante oficial de agendamento de ${typeLabel} (${formattedCode}) na ${receipt.venueName}.`;

      const attachmentPayload = {
        leadId: targetLeadId || '',
        leadPhone: receipt.leadPhone,
        leadName: receipt.leadName,
        dataUrl,
        fileName,
        caption: defaultCaption,
        timestamp: Date.now(),
      };

      // 2. Salva no sessionStorage para que o chat do WhatsApp leia de forma persistente
      try {
        sessionStorage.setItem('f5_pending_chat_attachment', JSON.stringify(attachmentPayload));
      } catch (e) {
        console.warn('Erro ao salvar no sessionStorage:', e);
      }

      // 3. Dispara evento customizado para o chat anexar a foto imediatamente na conversa ativa
      window.dispatchEvent(new CustomEvent('f5_attach_to_chat', { detail: attachmentPayload }));

      // 4. Fecha o modal de comprovante para permitir que o atendente visualize o anexo na conversa onde já está
      onClose();
    } catch (err) {
      console.error('Erro ao anexar comprovante no chat:', err);
      alert('Não foi possível anexar o comprovante no chat.');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15,23,42,0.75)',
      backdropFilter: 'blur(5px)',
      zIndex: 1500,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div 
        style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          maxWidth: '560px',
          maxHeight: '92vh',
          overflowY: 'auto',
          width: '100%',
          boxShadow: '0 25px 60px -15px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid rgba(226,232,240,0.8)',
          position: 'relative',
        }}
      >
        {/* Botão Fechar no Topo Direito (Fora da Área Imprimível) */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'var(--adm-bg-surface, #F1F5F9)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748B',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            zIndex: 10,
          }}
          title="Fechar comprovante"
        >
          <X size={18} />
        </button>

        {/* ═══════════════════════════════════════════════════════════════════
            ÁREA IMPRIMÍVEL DO COMPROVANTE (CAPTURA EXATA VIA HTML2CANVAS)
            ═══════════════════════════════════════════════════════════════════ */}
        <div 
          ref={printableCardRef}
          style={{
            background: '#FFFFFF',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
          }}
        >
          {/* Top Accent Stripe */}
          <div style={{ height: '8px', background: themeColor, width: '100%' }} />

          {/* Conteúdo Central do Cartão */}
          <div style={{ padding: '32px 32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Círculo com Ícone de Confirmação */}
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: isVisit ? 'rgba(16,185,129,0.12)' : 'rgba(217,119,6,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: themeColor,
              marginBottom: '16px',
              border: `2px solid ${isVisit ? 'rgba(16,185,129,0.3)' : 'rgba(217,119,6,0.3)'}`,
              boxShadow: `0 8px 20px ${themeColor}22`,
            }}>
              <Check size={32} strokeWidth={3} />
            </div>

            <h2 style={{ margin: '0 0 4px', fontSize: '1.35rem', fontWeight: 900, color: '#0F172A', textAlign: 'center' }}>
              Agendamento de {typeLabel} Confirmado
            </h2>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#F1F5F9',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 800,
              color: '#475569',
              marginTop: '6px',
            }}>
              <span>CÓDIGO:</span>
              <span style={{ color: themeColor, letterSpacing: '0.5px' }}>{formattedCode}</span>
            </div>

            {/* Cartão de Detalhes Estilo Ticket */}
            <div style={{
              width: '100%',
              marginTop: '24px',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              background: '#F8FAFC',
              overflow: 'hidden',
            }}>
              {/* Header do Local com Logo */}
              <div style={{
                padding: '14px 18px',
                background: '#FFFFFF',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: '#0F172A',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0,
                    border: '1.5px solid #1E293B',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                  }}>
                    {!venueLogoFailed && (venueLogoDataUrl || effectiveVenueLogo) ? (
                      <img 
                        src={venueLogoDataUrl || effectiveVenueLogo} 
                        alt={receipt.venueName || 'Unidade'} 
                        onError={() => setVenueLogoFailed(true)}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} 
                      />
                    ) : (
                      <Building2 size={24} color="#F8FAFC" />
                    )}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#0F172A' }}>
                      {receipt.venueName}
                    </h4>
                    {receipt.venueAddress && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                        <MapPin size={11} color="#94A3B8" />
                        <span>{receipt.venueAddress}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: themeColor,
                  background: isVisit ? 'rgba(16,185,129,0.1)' : 'rgba(217,119,6,0.1)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                }}>
                  {isVisit ? 'VISITA' : 'DEGUSTAÇÃO'}
                </div>
              </div>

              {/* Grid de Informações Chave */}
              <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Data e Horário em Destaque */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: `${themeColor}14`,
                    color: themeColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Calendar size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.70rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                      Data & Horário Confirmado
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0F172A', marginTop: '2px' }}>
                      {receipt.timeStr} • <span style={{ textTransform: 'capitalize' }}>{formattedDate}</span>
                    </div>
                  </div>
                </div>

                {/* Informações do Cliente e Acompanhantes */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                    <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748B' }}>
                      CLIENTE
                    </span>
                    <strong style={{ display: 'block', fontSize: '0.85rem', color: '#0F172A', marginTop: '2px' }}>
                      {receipt.leadName}
                    </strong>
                    {receipt.leadPhone && (
                      <span style={{ fontSize: '0.72rem', color: '#64748B' }}>{formatPhone(receipt.leadPhone) || receipt.leadPhone}</span>
                    )}
                  </div>

                  <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                    <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748B' }}>
                      ACOMPANHANTES (PAX)
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <Users size={16} color={themeColor} />
                      <strong style={{ fontSize: '0.85rem', color: '#0F172A' }}>
                        Até {receipt.pax} {receipt.pax === 1 ? 'pessoa' : 'pessoas'}
                      </strong>
                    </div>
                    <span style={{ fontSize: '0.70rem', color: '#94A3B8' }}>Limite liberado</span>
                  </div>
                </div>

                {/* Closer / Anfitrião com Foto Real e Cargo entre Parênteses */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    letterSpacing: '0.5px',
                    flexShrink: 0,
                    border: '2px solid #E2E8F0',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                  }}>
                    {!closerPhotoFailed && (closerPhotoDataUrl || effectiveCloserPhoto) ? (
                      <img 
                        src={closerPhotoDataUrl || effectiveCloserPhoto} 
                        alt={receipt.closerName || 'Anfitrião'} 
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          if (closerPhotoDataUrl && effectiveCloserPhoto && e.currentTarget.src !== effectiveCloserPhoto) {
                            e.currentTarget.src = effectiveCloserPhoto;
                          } else {
                            setCloserPhotoFailed(true);
                          }
                        }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} 
                      />
                    ) : (
                      (() => {
                        const nameParts = (receipt.closerName || '').trim().split(/\s+/).filter(Boolean);
                        const initials = nameParts.length >= 2 
                          ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
                          : (nameParts[0] ? nameParts[0].slice(0, 2).toUpperCase() : 'AF');
                        return (
                          <span style={{ color: '#F8FAFC', textShadow: '0 1px 2px rgba(0,0,0,0.4)', fontWeight: 900 }}>{initials}</span>
                        );
                      })()
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                      Anfitrião da Recepção
                    </div>
                    <div style={{ fontSize: '0.90rem', fontWeight: 800, color: '#0F172A', marginTop: '1px' }}>
                      {receipt.closerName}
                    </div>
                  </div>
                </div>
              </div>

              {/* Rodapé Interno com Emissão */}
              <div style={{
                padding: '10px 18px',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.70rem',
                color: '#94A3B8',
              }}>
                <span>Agendado por: {receipt.createdByName || 'Equipe Comercial'}</span>
                <span>{receipt.createdAtStr ? `Criado em: ${receipt.createdAtStr}` : 'F5 System Oficial'}</span>
              </div>
            </div>

            {/* Selo Oficial de Autenticidade F5 System no Comprovante */}
            <div style={{
              marginTop: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.68rem',
              fontWeight: 700,
              color: '#94A3B8',
              letterSpacing: '0.3px',
            }}>
              <ShieldCheck size={14} color={themeColor} />
              <span>Documento Oficial de Confirmação • F5 System</span>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            PAINEL EXPANSÍVEL: TAREFAS DE CONFIRMAÇÃO (1 E 2)
            ═══════════════════════════════════════════════════════════════════ */}
        {showConfirmationTasks && (
          <div style={{
            margin: '0 24px 16px 24px',
            padding: '16px',
            borderRadius: '14px',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: '#EFF6FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563EB',
                }}>
                  <Bell size={15} />
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>
                    Fluxo de Confirmação de Presença
                  </div>
                  <div style={{ fontSize: '0.70rem', color: '#64748B' }}>
                    Acompanhamento operacional das notificações ao cliente
                  </div>
                </div>
              </div>

              {/* Métrica de Presença */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.72rem',
                fontWeight: 800,
                background: presenceSummary.bg,
                color: presenceSummary.text,
                border: `1px solid ${presenceSummary.border}`,
              }}>
                {presenceSummary.icon}
                <span>{presenceSummary.label}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
              {/* Card Confirmação 1 */}
              <div style={{
                padding: '12px',
                borderRadius: '10px',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#334155' }}>
                    Confirmação 1 (Dias antes)
                  </span>
                  <span 
                    title={eval1.tooltip}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 7px',
                      borderRadius: '6px',
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      background: eval1.status === 'positive' ? '#ECFDF5' : eval1.status === 'negative' ? '#FEF2F2' : eval1.status === 'disabled' ? '#F1F5F9' : '#FFFBEB',
                      color: eval1.status === 'positive' ? '#047857' : eval1.status === 'negative' ? '#B91C1C' : eval1.status === 'disabled' ? '#64748B' : '#B45309',
                      border: `1px solid ${eval1.status === 'positive' ? '#A7F3D0' : eval1.status === 'negative' ? '#FECACA' : eval1.status === 'disabled' ? '#CBD5E1' : '#FDE68A'}`,
                      cursor: 'help',
                    }}
                  >
                    {eval1.status === 'positive' && <CheckCircle2 size={11} />}
                    {eval1.status === 'negative' && <XCircle size={11} />}
                    {eval1.status === 'pending' && <Clock size={11} />}
                    <span>{eval1.label}</span>
                  </span>
                </div>
                <div style={{ fontSize: '0.70rem', color: '#64748B', lineHeight: 1.4 }}>
                  <div><strong>SDR:</strong> {eval1.sdrName}</div>
                  <div><strong>Previsão:</strong> {eval1.dueDate}</div>
                  {eval1.isDisabled && (
                    <div style={{ marginTop: '6px', fontSize: '0.65rem', color: '#94A3B8', fontStyle: 'italic', lineHeight: 1.3 }}>
                      {eval1.tooltip}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Confirmação 2 */}
              <div style={{
                padding: '12px',
                borderRadius: '10px',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#334155' }}>
                    Confirmação 2 (24h antes)
                  </span>
                  <span 
                    title={eval2.tooltip}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 7px',
                      borderRadius: '6px',
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      background: eval2.status === 'positive' ? '#ECFDF5' : eval2.status === 'negative' ? '#FEF2F2' : eval2.status === 'disabled' ? '#F1F5F9' : '#FFFBEB',
                      color: eval2.status === 'positive' ? '#047857' : eval2.status === 'negative' ? '#B91C1C' : eval2.status === 'disabled' ? '#64748B' : '#B45309',
                      border: `1px solid ${eval2.status === 'positive' ? '#A7F3D0' : eval2.status === 'negative' ? '#FECACA' : eval2.status === 'disabled' ? '#CBD5E1' : '#FDE68A'}`,
                      cursor: 'help',
                    }}
                  >
                    {eval2.status === 'positive' && <CheckCircle2 size={11} />}
                    {eval2.status === 'negative' && <XCircle size={11} />}
                    {eval2.status === 'pending' && <Clock size={11} />}
                    <span>{eval2.label}</span>
                  </span>
                </div>
                <div style={{ fontSize: '0.70rem', color: '#64748B', lineHeight: 1.4 }}>
                  <div><strong>SDR:</strong> {eval2.sdrName}</div>
                  <div><strong>Previsão:</strong> {eval2.dueDate}</div>
                  {eval2.isDisabled && (
                    <div style={{ marginTop: '6px', fontSize: '0.65rem', color: '#94A3B8', fontStyle: 'italic', lineHeight: 1.3 }}>
                      {eval2.tooltip}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            BARRA DE AÇÕES INFERIOR EM LINHA ÚNICA
            ═══════════════════════════════════════════════════════════════════ */}
        <div style={{
          padding: '16px 24px',
          background: '#F8FAFC',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#475569',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Fechar
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            {/* Botão Ver Tarefas de Confirmação (1 e 2) */}
            <button
              type="button"
              onClick={() => setShowConfirmationTasks(prev => !prev)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7px',
                padding: '10px 14px',
                borderRadius: '10px',
                background: showConfirmationTasks ? '#EFF6FF' : '#FFFFFF',
                border: showConfirmationTasks ? '1.5px solid #2563EB' : '1px solid #CBD5E1',
                color: showConfirmationTasks ? '#1D4ED8' : '#334155',
                fontSize: '0.80rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Acompanhar tarefas de Confirmação 1 (dias antes) e Confirmação 2 (horas antes)"
            >
              <Bell size={15} color={showConfirmationTasks ? '#2563EB' : '#64748B'} />
              <span>Confirmações (1 e 2)</span>
              {showConfirmationTasks ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {/* Botão Baixar Imagem PNG Idêntica */}
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isDownloading || isSharing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                background: '#FFFFFF',
                border: '1px solid #0284C7',
                color: '#0284C7',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: (isDownloading || isSharing) ? 'not-allowed' : 'pointer',
                opacity: (isDownloading || isSharing) ? 0.7 : 1,
                transition: 'all 0.15s ease',
              }}
              title="Baixar comprovante oficial em imagem PNG exatamente igual ao que vê na tela"
            >
              {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              <span>{isDownloading ? 'Gerando...' : 'Baixar (PNG)'}</span>
            </button>

            {/* Botão Compartilhar: Envia para o Chat dentro do Sistema */}
            <button
              type="button"
              onClick={handleShareToChat}
              disabled={isDownloading || isSharing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '10px',
                background: '#10B981',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: (isDownloading || isSharing) ? 'not-allowed' : 'pointer',
                opacity: (isDownloading || isSharing) ? 0.7 : 1,
                boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
                transition: 'all 0.15s ease',
              }}
              title="Anexar a foto do comprovante no chat para enviar ao lead dentro do sistema"
            >
              {isSharing ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
              <span>{isSharing ? 'Anexando no Chat...' : 'Compartilhar'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
