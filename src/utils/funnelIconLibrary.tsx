import React, { useState, useMemo } from 'react';
import {
  Target, DollarSign, Trophy, Award, Crown, Rocket, Flame, Zap,
  TrendingUp, Percent, Briefcase, BarChart3, ShieldCheck, BadgeCheck,
  Star, Coins, Wallet, MessageSquare, MessagesSquare, Phone,
  PhoneCall, PhoneForwarded, PhoneIncoming, PhoneMissed, Mail, MailCheck,
  Send, Headphones, Radio, Bell, Video, Inbox, Bot, PartyPopper, Gift,
  Music, Camera, Sparkles, Cake, Heart, Smile, Wine, GlassWater,
  Utensils, Tent, MapPin, Ticket, Gem, Palette, Flower2, Calendar,
  CalendarCheck, CalendarDays, CalendarHeart, Clock, Hourglass, Timer,
  Compass, Flag, Milestone, Bookmark, Pin, ListTodo, ClipboardCheck,
  Users, UserCheck, UserPlus, UserX, Handshake, Store, Building2,
  ShoppingBag, ShoppingCart, Layers, FileText, FileSignature, FileCheck,
  Receipt, Calculator, CheckCircle2, CheckSquare, XCircle, AlertTriangle,
  AlertOctagon, HelpCircle, Shield, Snowflake, Thermometer, ThermometerSun,
  ThermometerSnowflake, Sun, Moon, PauseCircle, PlayCircle, ThumbsUp,
  ThumbsDown, HeartHandshake, HeartCrack, Eye, EyeOff, Filter,
  RefreshCw, BatteryCharging, BatteryWarning, Search, X
} from 'lucide-react';

export interface IconOption {
  id: string;
  label: string;
  category: 'temperatura' | 'vendas' | 'comunicacao' | 'festas' | 'agenda' | 'equipe';
  icon: React.ComponentType<{ size?: number; color?: string; className?: string; style?: React.CSSProperties }>;
}

export const FUNNEL_AND_STAGE_ICONS: IconOption[] = [
  // 🌡️ Temperaturas, Status de Leads & Negociação
  { id: 'flame', label: 'Quente / Alta Conversão', category: 'temperatura', icon: Flame },
  { id: 'sun', label: 'Morno / Em Aquecimento', category: 'temperatura', icon: Sun },
  { id: 'snowflake', label: 'Frio / Congelado / Sem Contato', category: 'temperatura', icon: Snowflake },
  { id: 'thermometer', label: 'Termômetro / Temperatura Lead', category: 'temperatura', icon: Thermometer },
  { id: 'thermometer-sun', label: 'Termômetro Alto / Super Quente', category: 'temperatura', icon: ThermometerSun },
  { id: 'thermometer-snow', label: 'Termômetro Baixo / Esfriando', category: 'temperatura', icon: ThermometerSnowflake },
  { id: 'filter', label: 'Funil / Triagem / SDR', category: 'temperatura', icon: Filter },
  { id: 'zap', label: 'Raio / Urgente / Prioritário', category: 'temperatura', icon: Zap },
  { id: 'refresh-cw', label: 'Retorno / Reengajamento', category: 'temperatura', icon: RefreshCw },
  { id: 'pause-circle', label: 'Pausado / Standby / Em Espera', category: 'temperatura', icon: PauseCircle },
  { id: 'play-circle', label: 'Em Andamento / Ativo', category: 'temperatura', icon: PlayCircle },
  { id: 'moon', label: 'Inativo / Dormindo / Sem Retorno', category: 'temperatura', icon: Moon },
  { id: 'thumbs-up', label: 'Positivo / Aprovado / Interessado', category: 'temperatura', icon: ThumbsUp },
  { id: 'thumbs-down', label: 'Sem Interesse / Descarte', category: 'temperatura', icon: ThumbsDown },
  { id: 'eye', label: 'Visualizado / Proposta Aberta', category: 'temperatura', icon: Eye },
  { id: 'eye-off', label: 'Não Visualizado / Sem Leitura', category: 'temperatura', icon: EyeOff },
  { id: 'heart-handshake', label: 'Acordo / Alinhado / Fechado', category: 'temperatura', icon: HeartHandshake },
  { id: 'heart-crack', label: 'Desengajado / Perda de Lead', category: 'temperatura', icon: HeartCrack },
  { id: 'battery-charging', label: 'Nutrindo / Reativando', category: 'temperatura', icon: BatteryCharging },
  { id: 'battery-warning', label: 'Atenção / Risco de Perda', category: 'temperatura', icon: BatteryWarning },
  { id: 'alert-octagon', label: 'Bloqueio / Crítico / Impedimento', category: 'temperatura', icon: AlertOctagon },
  { id: 'help', label: 'Dúvida / Em Análise / Indeciso', category: 'temperatura', icon: HelpCircle },

  // 🎯 Vendas & Negócios
  { id: 'target', label: 'Alvo / Meta de Vendas', category: 'vendas', icon: Target },
  { id: 'dollar', label: 'Fechamento / Venda R$', category: 'vendas', icon: DollarSign },
  { id: 'trophy', label: 'Troféu / Negócio Ganho', category: 'vendas', icon: Trophy },
  { id: 'award', label: 'Medalha / Destaque Comercial', category: 'vendas', icon: Award },
  { id: 'crown', label: 'Coroa / Cliente VIP', category: 'vendas', icon: Crown },
  { id: 'rocket', label: 'Foguete / Aceleração / Fast Track', category: 'vendas', icon: Rocket },
  { id: 'trending-up', label: 'Crescimento / Alta Performance', category: 'vendas', icon: TrendingUp },
  { id: 'percent', label: 'Desconto / Condição Especial', category: 'vendas', icon: Percent },
  { id: 'briefcase', label: 'Maleta / Executivo / Proposta', category: 'vendas', icon: Briefcase },
  { id: 'bar-chart', label: 'Métricas / Relatório / Indicadores', category: 'vendas', icon: BarChart3 },
  { id: 'coins', label: 'Moedas / Faturamento / Entrada', category: 'vendas', icon: Coins },
  { id: 'wallet', label: 'Carteira / Pagamento / Sinal', category: 'vendas', icon: Wallet },
  { id: 'file-signature', label: 'Contrato Assinado', category: 'vendas', icon: FileSignature },
  { id: 'file-check', label: 'Documentação Aprovada', category: 'vendas', icon: FileCheck },
  { id: 'receipt', label: 'Recibo / Comprovante Financeiro', category: 'vendas', icon: Receipt },
  { id: 'calculator', label: 'Orçamento / Cálculo de Proposta', category: 'vendas', icon: Calculator },
  { id: 'badge-check', label: 'Selo / Homologado', category: 'vendas', icon: BadgeCheck },
  { id: 'star', label: 'Estrela / Oportunidade Ouro', category: 'vendas', icon: Star },

  // 💬 Comunicação & SDR
  { id: 'message', label: 'WhatsApp / Mensagem Individual', category: 'comunicacao', icon: MessageSquare },
  { id: 'messages', label: 'Conversas / Chat em Andamento', category: 'comunicacao', icon: MessagesSquare },
  { id: 'phone', label: 'Telefone / Chamada', category: 'comunicacao', icon: Phone },
  { id: 'phone-call', label: 'Ligação Ativa / Em Linha', category: 'comunicacao', icon: PhoneCall },
  { id: 'phone-incoming', label: 'Chamada Recebida / Contato Feito', category: 'comunicacao', icon: PhoneIncoming },
  { id: 'phone-missed', label: 'Ligação Perdida / Retornar', category: 'comunicacao', icon: PhoneMissed },
  { id: 'phone-forward', label: 'Transferência / SDR para Closer', category: 'comunicacao', icon: PhoneForwarded },
  { id: 'mail', label: 'E-mail / Proposta Enviada', category: 'comunicacao', icon: Mail },
  { id: 'mail-check', label: 'E-mail Aberto / Confirmado', category: 'comunicacao', icon: MailCheck },
  { id: 'send', label: 'Enviar / Disparo de Mensagem', category: 'comunicacao', icon: Send },
  { id: 'bot', label: 'Robô / Automação de Triagem', category: 'comunicacao', icon: Bot },
  { id: 'headphones', label: 'Suporte / Atendimento Humanizado', category: 'comunicacao', icon: Headphones },
  { id: 'radio', label: 'Transmissão / Campanha em Massa', category: 'comunicacao', icon: Radio },
  { id: 'bell', label: 'Notificação / Alerta de Retorno', category: 'comunicacao', icon: Bell },
  { id: 'video', label: 'Vídeo Chamada / Apresentação Online', category: 'comunicacao', icon: Video },
  { id: 'inbox', label: 'Caixa de Entrada / Novo Lead', category: 'comunicacao', icon: Inbox },

  // 🎉 Eventos, Festas & Debutantes
  { id: 'party', label: 'Festa / Comemoração', category: 'festas', icon: PartyPopper },
  { id: 'gift', label: 'Presente / Debutante', category: 'festas', icon: Gift },
  { id: 'cake', label: 'Bolo / Aniversário / Casamento', category: 'festas', icon: Cake },
  { id: 'sparkles', label: 'Brilho / Encantamento / Mágico', category: 'festas', icon: Sparkles },
  { id: 'heart', label: 'Coração / Sonho / Festa dos Sonhos', category: 'festas', icon: Heart },
  { id: 'music', label: 'Música / DJ / Show / Balada', category: 'festas', icon: Music },
  { id: 'camera', label: 'Foto & Vídeo / Cobertura', category: 'festas', icon: Camera },
  { id: 'wine', label: 'Brinde / Open Bar / Coquetel', category: 'festas', icon: Wine },
  { id: 'glass-water', label: 'Degustação / Bebidas', category: 'festas', icon: GlassWater },
  { id: 'utensils', label: 'Buffet / Jantar / Gastronomia', category: 'festas', icon: Utensils },
  { id: 'tent', label: 'Espaço / Salão / Cenário', category: 'festas', icon: Tent },
  { id: 'gem', label: 'Premium / Alta Joalheria / Luxo', category: 'festas', icon: Gem },
  { id: 'palette', label: 'Decoração / Cenografia / Paleta', category: 'festas', icon: Palette },
  { id: 'flower2', label: 'Flores / Ambientação / Paisagismo', category: 'festas', icon: Flower2 },
  { id: 'ticket', label: 'Convite / Ingresso do Evento', category: 'festas', icon: Ticket },
  { id: 'smile', label: 'Experiência / Satisfação do Cliente', category: 'festas', icon: Smile },
  { id: 'map-pin', label: 'Localização / Visita Presencial', category: 'festas', icon: MapPin },

  // 📅 Agenda, Tempo & Planejamento
  { id: 'calendar', label: 'Calendário / Agendado', category: 'agenda', icon: Calendar },
  { id: 'calendar-check', label: 'Data Confirmada / Reservada', category: 'agenda', icon: CalendarCheck },
  { id: 'calendar-days', label: 'Cronograma / Agenda Completa', category: 'agenda', icon: CalendarDays },
  { id: 'calendar-heart', label: 'Data Especial do Evento', category: 'agenda', icon: CalendarHeart },
  { id: 'clock', label: 'Relógio / Em Andamento', category: 'agenda', icon: Clock },
  { id: 'hourglass', label: 'Ampulheta / Aguardando Resposta', category: 'agenda', icon: Hourglass },
  { id: 'timer', label: 'Cronômetro / Contagem Regressiva', category: 'agenda', icon: Timer },
  { id: 'compass', label: 'Bússola / Direcionamento Estratégico', category: 'agenda', icon: Compass },
  { id: 'flag', label: 'Bandeira / Marco do Funil', category: 'agenda', icon: Flag },
  { id: 'milestone', label: 'Milestone / Ponto Crítico', category: 'agenda', icon: Milestone },
  { id: 'bookmark', label: 'Salvo / Marcador de Pauta', category: 'agenda', icon: Bookmark },
  { id: 'pin', label: 'Fixado no Topo / Destaque', category: 'agenda', icon: Pin },
  { id: 'list-todo', label: 'Checklist / Tarefas Pendentes', category: 'agenda', icon: ListTodo },
  { id: 'clipboard-check', label: 'Checklist Concluído / Validado', category: 'agenda', icon: ClipboardCheck },

  // 👥 Equipe, Clientes & Gestão
  { id: 'users', label: 'Equipe / Time de Atendimento', category: 'equipe', icon: Users },
  { id: 'user-check', label: 'Cliente Validado / Cadastrado', category: 'equipe', icon: UserCheck },
  { id: 'user-plus', label: 'Novo Contato / Lead Cadastrado', category: 'equipe', icon: UserPlus },
  { id: 'user-x', label: 'Desistência / Não Compareceu', category: 'equipe', icon: UserX },
  { id: 'handshake', label: 'Parceria / Acordo Comercial', category: 'equipe', icon: Handshake },
  { id: 'building', label: 'Unidade / Casa de Festas', category: 'equipe', icon: Building2 },
  { id: 'store', label: 'Espaço Comercial / Loja', category: 'equipe', icon: Store },
  { id: 'shop', label: 'Pacote / Loja de Opcionais', category: 'equipe', icon: ShoppingBag },
  { id: 'shopping-cart', label: 'Contratação / Carrinho Fechado', category: 'equipe', icon: ShoppingCart },
  { id: 'layers', label: 'Etapas do Funil / Processo', category: 'equipe', icon: Layers },
  { id: 'file-text', label: 'Contrato / Proposta Comercial', category: 'equipe', icon: FileText },
  { id: 'shield', label: 'Segurança Jurídica / Garantia', category: 'equipe', icon: Shield },
  { id: 'shield-check', label: 'Pós-Venda / Sucesso do Cliente', category: 'equipe', icon: ShieldCheck },
  { id: 'check', label: 'Sucesso / Venda Ganha', category: 'equipe', icon: CheckCircle2 },
  { id: 'check-square', label: 'Validado / Concluído', category: 'equipe', icon: CheckSquare },
  { id: 'x-circle', label: 'Perdido / Cancelado / Descarte', category: 'equipe', icon: XCircle },
  { id: 'alert', label: 'Atenção / Pendência Operacional', category: 'equipe', icon: AlertTriangle },
];

const ICON_MAP = new Map<string, IconOption>();
FUNNEL_AND_STAGE_ICONS.forEach(item => {
  ICON_MAP.set(item.id, item);
});

// Helper universal de renderização de ícone com aliases de estágios e fallbacks inteligentes
export const renderFunnelOrStageIcon = (
  iconName?: string,
  size = 15,
  color?: string,
  fallback = 'target'
): React.ReactNode => {
  const iconColor = color || 'currentColor';
  if (!iconName) {
    const FallbackComp = ICON_MAP.get(fallback)?.icon || Target;
    return <FallbackComp size={size} color={iconColor} />;
  }

  // Alias map for common stage and funnel IDs
  const normalized = iconName.toLowerCase().trim();
  let resolvedId = normalized;

  if (normalized === 'in_negotiation' || normalized === 'in_analysis' || normalized === 'qualificacao') resolvedId = 'clock';
  else if (normalized === 'scheduled' || normalized === 'meeting_scheduled' || normalized === 'visita_agendada' || normalized === 'agendamentos') resolvedId = 'calendar';
  else if (normalized === 'decision' || normalized === 'degustacao') resolvedId = 'award';
  else if (normalized === 'deal_closed' || normalized === 'contract_signed' || normalized === 'contrato_fechado' || normalized === 'ganho') resolvedId = 'dollar';
  else if (normalized === 'lost' || normalized === 'cancelado' || normalized === 'recusado' || normalized === 'perdido') resolvedId = 'x-circle';
  else if (normalized === 'new_lead' || normalized === 'onboarding' || normalized === 'entrada') resolvedId = 'inbox';
  else if (normalized === 'party_day' || normalized === 'festa') resolvedId = 'party';
  else if (normalized === 'planning') resolvedId = 'calendar-check';
  else if (normalized === 'suppliers') resolvedId = 'briefcase';
  else if (normalized === 'final_alignment') resolvedId = 'timer';
  else if (normalized === 'quente' || normalized === 'hot') resolvedId = 'flame';
  else if (normalized === 'morno' || normalized === 'warm') resolvedId = 'sun';
  else if (normalized === 'frio' || normalized === 'cold') resolvedId = 'snowflake';
  else if (normalized === 'termometro') resolvedId = 'thermometer';
  else if (normalized === 'sdr' || normalized === 'triagem') resolvedId = 'filter';

  const match = ICON_MAP.get(resolvedId);
  if (match) {
    const IconComponent = match.icon;
    return <IconComponent size={size} color={iconColor} />;
  }

  // Fallback
  const FallbackComp = ICON_MAP.get(fallback)?.icon || Target;
  return <FallbackComp size={size} color={iconColor} />;
};

interface FunnelIconPickerProps {
  selectedIcon?: string;
  onSelectIcon: (iconId: string) => void;
  onClose: () => void;
  accentColor?: string;
  title?: string;
}

export const FunnelIconPicker: React.FC<FunnelIconPickerProps> = ({
  selectedIcon,
  onSelectIcon,
  onClose,
  accentColor = 'var(--adm-accent, #3B82F6)',
  title = 'Escolha um Ícone',
}) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'Todos' },
    { id: 'temperatura', label: '🌡️ Status & Termômetro' },
    { id: 'vendas', label: '🎯 Vendas' },
    { id: 'comunicacao', label: '💬 Mensagens & SDR' },
    { id: 'festas', label: '🎉 Festas' },
    { id: 'agenda', label: '📅 Agenda' },
    { id: 'equipe', label: '👥 Equipe' },
  ];

  const filteredIcons = useMemo(() => {
    let list = FUNNEL_AND_STAGE_ICONS;
    if (activeCategory !== 'all') {
      list = list.filter(i => i.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i => i.id.toLowerCase().includes(q) || i.label.toLowerCase().includes(q));
    }
    return list;
  }, [activeCategory, search]);

  return (
    <div
      data-no-drag
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        left: 0,
        zIndex: 250,
        width: '360px',
        backgroundColor: 'var(--adm-bg-card, #1E1A29)',
        border: '1px solid var(--adm-border, rgba(255, 255, 255, 0.12))',
        borderRadius: '14px',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.55)',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        animation: 'fadeIn 0.18s ease-out',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={14} color={accentColor} />
          <span style={{ fontSize: '0.80rem', fontWeight: 800, color: 'var(--adm-text-title, #FFFFFF)' }}>
            {title}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--adm-text-muted)',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Search Input */}
      <div style={{ position: 'relative', width: '100%' }}>
        <Search
          size={13}
          color="var(--adm-text-muted)"
          style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)' }}
        />
        <input
          type="text"
          placeholder="Buscar ícone (ex: quente, frio, morno, whats, venda)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          style={{
            width: '100%',
            backgroundColor: 'var(--adm-bg-input, #13101E)',
            border: '1px solid var(--adm-border, rgba(255,255,255,0.1))',
            borderRadius: '8px',
            padding: '6px 10px 6px 28px',
            fontSize: '0.74rem',
            color: 'var(--adm-text-title, #FFFFFF)',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Category Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }} className="custom-scrollbar">
        {categories.map(cat => {
          const isCatActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              style={{
                fontSize: '0.66rem',
                fontWeight: isCatActive ? 800 : 600,
                padding: '4px 8px',
                borderRadius: '6px',
                border: isCatActive ? `1px solid ${accentColor}` : '1px solid transparent',
                backgroundColor: isCatActive ? `${accentColor}25` : 'rgba(255,255,255,0.04)',
                color: isCatActive ? accentColor : 'var(--adm-text-muted)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.12s ease',
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Icons Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '6px',
          maxHeight: '230px',
          overflowY: 'auto',
          paddingRight: '2px',
        }}
        className="custom-scrollbar"
      >
        {filteredIcons.map(opt => {
          const IconComp = opt.icon;
          const isSelected = selectedIcon === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onSelectIcon(opt.id);
                onClose();
              }}
              title={opt.label}
              style={{
                width: '46px',
                height: '42px',
                borderRadius: '8px',
                backgroundColor: isSelected ? `${accentColor}30` : 'var(--adm-bg-input, #13101E)',
                border: isSelected ? `1.5px solid ${accentColor}` : '1px solid var(--adm-border, rgba(255,255,255,0.08))',
                color: isSelected ? accentColor : 'var(--adm-text-body, #E2E8F0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.14s ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = accentColor;
                  e.currentTarget.style.color = accentColor;
                  e.currentTarget.style.transform = 'scale(1.08)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = 'var(--adm-border, rgba(255,255,255,0.08))';
                  e.currentTarget.style.color = 'var(--adm-text-body, #E2E8F0)';
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
            >
              <IconComp size={18} />
              {isSelected && (
                <div
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: accentColor,
                  }}
                />
              )}
            </button>
          );
        })}

        {filteredIcons.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '20px 0', textAlign: 'center', color: 'var(--adm-text-muted)', fontSize: '0.74rem' }}>
            Nenhum ícone encontrado para "{search}"
          </div>
        )}
      </div>

      {/* Selected Indicator Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--adm-border, rgba(255,255,255,0.08))', paddingTop: '8px', fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
        <span>{filteredIcons.length} ícones disponíveis</span>
        {selectedIcon && (
          <span style={{ fontWeight: 700, color: 'var(--adm-text-title)' }}>
            Atual: {FUNNEL_AND_STAGE_ICONS.find(i => i.id === selectedIcon)?.label || selectedIcon}
          </span>
        )}
      </div>
    </div>
  );
};
