import React, { useRef, useState, useEffect, useMemo } from 'react';
import { 
  X, Check, Download, Share2, Calendar, 
  MapPin, Users, User, Building2, ShieldCheck, Loader2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { useAdminState } from '../../context/AdminStateContext';
import { isPhoneMatch } from '../../services/leadService';
import type { CommercialCommitmentType } from '../../types/admin';

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
}

export const AdminAppointmentReceiptModal: React.FC<AdminAppointmentReceiptModalProps> = ({
  receipt,
  onClose,
}) => {
  const printableCardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const { leads } = useAdminState();

  const isVisit = receipt.type === 'visit';
  const themeColor = isVisit ? '#10B981' : '#D97706';
  const typeLabel = isVisit ? 'Visita Comercial' : 'Degustação Gastronômica';
  const formattedCode = receipt.code.startsWith('#') ? receipt.code : `#${receipt.code}`;

  // Pre-conversão das imagens em data URL para garantir que o html2canvas capture 100% sem erros de CORS
  const [closerPhotoDataUrl, setCloserPhotoDataUrl] = useState<string | null>(receipt.closerPhotoUrl || null);
  const [venueLogoDataUrl, setVenueLogoDataUrl] = useState<string | null>(receipt.venueLogoUrl || null);

  useEffect(() => {
    let isMounted = true;

    // Helper para converter URL remota para Data URL base64
    const convertUrlToDataUrl = async (url: string): Promise<string> => {
      if (url.startsWith('data:')) return url;
      try {
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) return url;
        const blob = await res.blob();
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string) || url);
          reader.onerror = () => resolve(url);
          reader.readAsDataURL(blob);
        });
      } catch {
        return url;
      }
    };

    if (receipt.closerPhotoUrl) {
      convertUrlToDataUrl(receipt.closerPhotoUrl).then(data => {
        if (isMounted && data) setCloserPhotoDataUrl(data);
      });
    }

    if (receipt.venueLogoUrl) {
      convertUrlToDataUrl(receipt.venueLogoUrl).then(data => {
        if (isMounted && data) setVenueLogoDataUrl(data);
      });
    }

    return () => {
      isMounted = false;
    };
  }, [receipt.closerPhotoUrl, receipt.venueLogoUrl]);

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

  // Função para baixar a imagem PNG idêntica ao que está na tela via html2canvas (Resolução Retina 2x)
  const handleDownloadImage = async () => {
    if (!printableCardRef.current || isDownloading) return;
    setIsDownloading(true);
    try {
      // Pequena pausa para garantir renderização estável
      await new Promise(r => setTimeout(r, 100));

      const canvas = await html2canvas(printableCardRef.current, {
        scale: 2, // 2x para nitidez cristalina
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#FFFFFF',
        logging: false,
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
      await new Promise(r => setTimeout(r, 100));

      // 1. Gera a imagem PNG do comprovante idêntica ao que está na tela
      const canvas = await html2canvas(printableCardRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#FFFFFF',
        logging: false,
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

      // 3. Dispara evento customizado para o chat anexar a foto imediatamente
      window.dispatchEvent(new CustomEvent('f5_attach_to_chat', { detail: attachmentPayload }));

      // 4. Se tivermos o ID do lead, direciona o operador para a conversa no WhatsApp
      if (targetLeadId) {
        window.dispatchEvent(new CustomEvent('admin_switch_tab', { 
          detail: { tab: 'whatsapp', leadId: targetLeadId } 
        }));
      }

      // 5. Fecha o modal de comprovante para exibir o chat com o anexo pronto
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
          width: '100%',
          boxShadow: '0 25px 60px -15px rgba(0,0,0,0.3)',
          overflow: 'hidden',
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
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    background: '#000000',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0,
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                  }}>
                    {venueLogoDataUrl || receipt.venueLogoUrl ? (
                      <img 
                        src={venueLogoDataUrl || receipt.venueLogoUrl} 
                        crossOrigin="anonymous" 
                        alt={receipt.venueName} 
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                      />
                    ) : (
                      <Building2 size={22} color="#D4AF37" />
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
                      CONTRATANTE / LEAD
                    </span>
                    <strong style={{ display: 'block', fontSize: '0.85rem', color: '#0F172A', marginTop: '2px' }}>
                      {receipt.leadName}
                    </strong>
                    {receipt.leadPhone && (
                      <span style={{ fontSize: '0.72rem', color: '#64748B' }}>{receipt.leadPhone}</span>
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
                    background: '#E2E8F0',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748B',
                    flexShrink: 0,
                    border: '2px solid #FFFFFF',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  }}>
                    {closerPhotoDataUrl || receipt.closerPhotoUrl ? (
                      <img 
                        src={closerPhotoDataUrl || receipt.closerPhotoUrl} 
                        crossOrigin="anonymous" 
                        alt={receipt.closerName} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    ) : (
                      <User size={24} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                      Anfitrião da Recepção
                    </div>
                    <div style={{ fontSize: '0.90rem', fontWeight: 800, color: '#0F172A', marginTop: '1px' }}>
                      {receipt.closerName} {receipt.closerRoleTitle && (
                        <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#64748B' }}>
                          ({receipt.closerRoleTitle})
                        </span>
                      )}
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, justifyContent: 'flex-end' }}>
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
