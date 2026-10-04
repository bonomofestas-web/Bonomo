import React, { useRef, useState } from 'react';
import { 
  X, Check, Download, Share2, Calendar, 
  MapPin, Users, User, Building2
} from 'lucide-react';
import type { CommercialCommitmentType } from '../../types/admin';

export interface AppointmentReceiptData {
  id?: string;
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
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const isVisit = receipt.type === 'visit';
  const themeColor = isVisit ? '#10B981' : '#D97706';
  const typeLabel = isVisit ? 'Visita Comercial' : 'Degustação Gastronômica';
  const formattedCode = receipt.code.startsWith('#') ? receipt.code : `#${receipt.code}`;

  // Formata a data por extenso
  const formattedDate = React.useMemo(() => {
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

  // Função para baixar a imagem PNG gerada via Canvas nativo
  const handleDownloadImage = async () => {
    setIsDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = 800;
      const height = 1000;
      canvas.width = width;
      canvas.height = height;

      // Fundo elegante
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Top bar com cor do tema
      ctx.fillStyle = themeColor;
      ctx.fillRect(0, 0, width, 16);

      // Header com círculo de confirmação
      ctx.fillStyle = isVisit ? '#ECFDF5' : '#FFFBEB';
      ctx.beginPath();
      ctx.arc(width / 2, 90, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Checkmark no círculo
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(width / 2 - 16, 90);
      ctx.lineTo(width / 2 - 4, 102);
      ctx.lineTo(width / 2 + 18, 78);
      ctx.stroke();

      // Título
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Agendamento de ${typeLabel} Confirmado`, width / 2, 175);

      // Código do comprovante
      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(`CÓDIGO: ${formattedCode}`, width / 2, 210);

      // Linha divisória tracejada
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(60, 240);
      ctx.lineTo(width - 60, 240);
      ctx.stroke();
      ctx.setLineDash([]);

      // Bloco de Informações
      ctx.textAlign = 'left';

      // 1. Cliente / Lead
      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('CLIENTE / CONTRATANTE', 80, 280);
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(receipt.leadName, 80, 310);
      if (receipt.leadPhone) {
        ctx.fillStyle = '#64748B';
        ctx.font = '16px sans-serif';
        ctx.fillText(`Telefone: ${receipt.leadPhone}`, 80, 336);
      }

      // 2. Data e Horário
      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('DATA E HORÁRIO', 80, 390);
      ctx.fillStyle = themeColor;
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(`${receipt.timeStr} • ${formattedDate}`, 80, 422);

      // 3. Unidade e Endereço
      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('LOCAL DO COMPROMISSO', 80, 480);
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(receipt.venueName, 80, 510);
      if (receipt.venueAddress) {
        ctx.fillStyle = '#64748B';
        ctx.font = '16px sans-serif';
        ctx.fillText(receipt.venueAddress, 80, 536);
      }

      // 4. Anfitrião / Closer Responsável
      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('ANFITRIÃO / RESPONSÁVEL', 80, 595);
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 20px sans-serif';
      const roleTxt = receipt.closerRoleTitle ? ` (${receipt.closerRoleTitle})` : '';
      ctx.fillText(`${receipt.closerName}${roleTxt}`, 80, 625);

      // 5. Convidados / PAX
      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('LIMITE DE CONVIDADOS (PAX)', 80, 680);
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(`${receipt.pax} ${receipt.pax === 1 ? 'pessoa' : 'pessoas'}`, 80, 710);

      // Card de Segurança / F5 System
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(60, 760, width - 120, 140);
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.strokeRect(60, 760, width - 120, 140);

      ctx.fillStyle = '#334155';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('CONFIRMAÇÃO OFICIAL DE PRESENÇA', 80, 800);
      ctx.fillStyle = '#64748B';
      ctx.font = '14px sans-serif';
      ctx.fillText('Apresente este cartão ou mencione seu código na recepção da casa.', 80, 830);
      if (receipt.createdAtStr) {
        ctx.fillText(`Emitido em: ${receipt.createdAtStr} por ${receipt.createdByName || 'F5 System'}`, 80, 860);
      }

      // Rodapé
      ctx.fillStyle = '#94A3B8';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('F5 System • Plataforma de Gestão Multi-Unidades', width / 2, 950);

      // Converte para blob e faz o download
      const imageURL = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `comprovante_${receipt.code.replace('#', '')}.png`;
      link.href = imageURL;
      link.click();
    } catch (err) {
      console.error('Erro ao gerar imagem:', err);
      alert('Não foi possível gerar a imagem.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Monta a mensagem para envio via WhatsApp
  const handleShareWhatsApp = () => {
    const roleTxt = receipt.closerRoleTitle ? ` (${receipt.closerRoleTitle})` : '';
    const cleanPhone = (receipt.leadPhone || '').replace(/\D/g, '');
    
    const message = 
      `*AGENDAMENTO CONFIRMADO • ${receipt.venueName.toUpperCase()}*\n\n` +
      `Olá, *${receipt.leadName}*! Seu agendamento de *${typeLabel}* foi confirmado com sucesso!\n\n` +
      `*Código:* ${formattedCode}\n` +
      `*Data:* ${formattedDate}\n` +
      `*Horário:* ${receipt.timeStr}\n` +
      `*Local:* ${receipt.venueName}\n` +
      (receipt.venueAddress ? `*Endereço:* ${receipt.venueAddress}\n` : '') +
      `*Anfitrião(a):* ${receipt.closerName}${roleTxt}\n` +
      `*Acompanhantes:* Até ${receipt.pax} pessoas\n\n` +
      `Aguardamos você para viver uma experiência inesquecível!`;

    const encoded = encodeURIComponent(message);
    const targetUrl = cleanPhone 
      ? `https://wa.me/55${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    window.open(targetUrl, '_blank');
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
        ref={cardRef}
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
        {/* Top Accent Stripe */}
        <div style={{ height: '6px', background: themeColor, width: '100%' }} />

        {/* Botão Fechar no Topo Direito */}
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
          }}
          title="Fechar comprovante"
        >
          <X size={18} />
        </button>

        {/* Conteúdo do Cartão */}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(2,132,199,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0284C7',
                  overflow: 'hidden',
                }}>
                  {receipt.venueLogoUrl ? (
                    <img src={receipt.venueLogoUrl} alt={receipt.venueName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <Building2 size={20} />
                  )}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0F172A' }}>
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

              {/* Closer / Anfitrião com Foto e Cargo entre Parênteses */}
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
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: '#E2E8F0',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748B',
                  flexShrink: 0,
                  border: '2px solid #FFFFFF',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                }}>
                  {receipt.closerPhotoUrl ? (
                    <img src={receipt.closerPhotoUrl} alt={receipt.closerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={22} />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                    Anfitrião da Recepção
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', marginTop: '1px' }}>
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
        </div>

        {/* Barra de Ações Inferior */}
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
              padding: '10px 18px',
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Botão Baixar Imagem PNG */}
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isDownloading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                background: '#FFFFFF',
                border: '1px solid #0284C7',
                color: '#0284C7',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Baixar comprovante em imagem PNG de alta resolução"
            >
              <Download size={16} />
              <span>{isDownloading ? 'Gerando...' : 'Baixar Imagem (PNG)'}</span>
            </button>

            {/* Botão Compartilhar WhatsApp */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '10px',
                background: '#10B981',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
                transition: 'all 0.15s ease',
              }}
              title="Enviar mensagem oficial de confirmação no WhatsApp"
            >
              <Share2 size={16} />
              <span>Compartilhar no WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
