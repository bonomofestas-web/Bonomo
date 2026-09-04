export type MilestoneStatus = 'locked' | 'in_progress' | 'unlocked' | 'claimed' | 'completed';
export type ReferralStatus = 'pending' | 'validated' | 'rejected';
export type ReferralGroup = 'Escola' | 'Família' | 'Judô' | 'Faculdade' | 'Amigos' | 'Academia' | 'Outros';

export type GuestStatus = 'confirmed' | 'pending' | 'declined';
export type GuestGroup = 'Família' | 'Escola' | 'Amigos' | 'VIPs' | 'Outros';

export type AppointmentCategory = 
  | 'Buffet & Degustação' 
  | 'Vestido de Gala' 
  | 'Maquiagem & Cabelo' 
  | 'Decoração & Flores' 
  | 'Ensaio Fotográfico' 
  | 'DJ & Pista' 
  | 'Cerimonial';

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed';

export type TabType = 'journey' | 'referrals' | 'guests' | 'appointments' | 'benefits';

export type JourneySubTab = 'benefits' | 'vip_rewards';

export type JourneyStatus = 'active' | 'paused' | 'closed';

export interface CapacityConquestReward {
  previousLimit: number;
  newLimit: number;
  bonus: number;
}

export interface JourneyCycleState {
  journeyStartDate: string; // ISO string when journey started
  journeyMaximumEndDate: string; // ISO string for hard limit of exactly 6 months
  currentCycleStartDate: string; // ISO string
  currentCycleEndDate: string; // ISO string (currentCycleStartDate + 7 days, capped at maximumEndDate)
  cycleRenewalTarget: number; // Always 3
  cycleRenewalProgress: number; // 0, 1, 2, 3
  journeyStatus: JourneyStatus;
}

export interface VenueTheme {
  id: string;
  name: string;
  tagline: string;
  description?: string;
  address?: string;
  logoUrl?: string;
  photoUrl?: string;
  venueBallroomUrl?: string;
  yearsInBusiness?: number;
  eventsCompleted?: number;
  guestsDelighted?: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  glowColor: string;
  bgDark: string;
  bgCard: string;
  fontFamily: string;
}

export interface VenueProfile {
  id: string;
  name: string;
  tagline: string;
  logoUrl?: string;
  ballroomImageUrl: string;
  description: string;
  experienceText: string;
  address: string;
  yearsInBusiness: number;
  eventsCompleted: number;
  guestsDelighted: number;
  googleMapsEmbedUrl: string;
  googleMapsLink: string;
  wazeLink: string;
  defaultDressCode: string;
}

export interface DebutanteProfile {
  id: string;
  name: string;
  slug?: string; // ex: maria-eduarda-2027
  partyDate: string; // YYYY-MM-DD
  partyDaysLeft: number;
  avatarUrl: string;
  phone?: string;
  customInvitePhotoUrl?: string; // Foto personalizada exclusiva para o convite
  useCustomInvitePhoto?: boolean; // Se true, usa a customInvitePhotoUrl no convite
  receptionMessage?: string; // Mensagem personalizada de recepção para o convite (máx 300 chars)
  hasJourneyEnabled?: boolean; // Se false: apenas Convidados e Compromissos
  isJourneyPending?: boolean; // Se true: jornada aguardando vinculação pelo admin
  welcomeVideoUrl?: string; // URL do vídeo de abertura no primeiro acesso
  hasSeenWelcomeVideo?: boolean; // Se já assistiu a introdução
  validReferrals: number;
  totalTargetReferrals: number;
  journeyProgressPercentage: number;
  convertedReferralSales: number;
  baseGuestLimit: number;
  extraGuestsUnlocked: number;
  currentGuestLimit: number;
  journeyCycle: JourneyCycleState;
  venueId: string;
}

export type VipRewardStatus = 'locked' | 'in_progress' | 'claimed' | 'completed';

export interface VipReward {
  id: string;
  name: string;
  subtitle?: string;
  description: string;
  imageUrl: string;
  requiredSales: number;
  order: number;
  status: VipRewardStatus;
  badgeTag?: string;
  highlight?: string;
  estimatedValue?: number; // Valor estimado financeiro em R$
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  requiredReferrals: number;
  rewardTitle: string;
  rewardDescription: string;
  rewardImageUrl: string;
  status: MilestoneStatus;
  unlockedAt?: string;
  claimedAt?: string;
  iconName: string;
  badgeTag: string;
  estimatedValue?: number; // Valor estimado financeiro em R$
}

export interface Referral {
  id: string;
  name: string;
  phone: string;
  age: number;
  group: ReferralGroup;
  notes?: string;
  createdAt: string;
  status: ReferralStatus;
  pointsGranted: number;
  isRenewalReferral?: boolean; // Se true, foi feita para desbloquear a jornada (não soma na progressão de metas)
  rejectionReason?: string; // Motivo da recusa informado pela gestão
}

export type GuestOrigin = 'general_link' | 'individual_link' | 'manual';
export type CompanionMode = 'fill_now' | 'fill_later';
export type ConfirmationSource = 'guest' | 'debutante';

export type GuestGender = 'female' | 'male' | 'other';

export interface CompanionDetail {
  name: string;
  age: number;
  gender: GuestGender;
}

export interface Guest {
  id: string;
  name: string;
  phone: string;
  age: number;
  gender?: GuestGender;
  group: GuestGroup;
  status: GuestStatus;
  plusOnes: number;
  companionNames?: string[]; // Nomes dos acompanhantes
  companionDetails?: CompanionDetail[]; // Detalhes completos (nome, idade, gênero)
  sweetMessage?: string; // Mensagem de carinho para a debutante
  declinedMessage?: string; // Mensagem de recusa de convite
  isSelfRegistered?: boolean; // Se cadastrado via link público de convite
  confirmedAt?: string;
  
  // Configurações de Convite Individual & Origem
  origin?: GuestOrigin;
  allowedCapacity?: number; // Quantidade total de pessoas permitidas (ex: 2 pessoas)
  companionMode?: CompanionMode; // 'fill_now' (preenchido pela debutante) ou 'fill_later' (convidado preenche depois)
  confirmationSource?: ConfirmationSource; // 'guest' ou 'debutante'
  isLinkExpired?: boolean; // Se true, o link individual não permite nova confirmação
  isReferred?: boolean; // Se esta convidada (12 a 14 anos) já foi indicada como futura debutante
  referralId?: string; // ID da indicação vinculada

  // Relacionamento de Acompanhante como convidado independente:
  isCompanion?: boolean; // Se true, este registro é um acompanhante
  parentGuestId?: string; // ID do convidado titular / principal
  parentGuestName?: string; // Nome do convidado titular / principal
  companionGuestIds?: string[]; // IDs dos registros de acompanhantes vinculados a este titular

  // Remoção segura da lista (Áudio 4)
  isRemoved?: boolean; // Se true, foi movido para a aba 'Removidos' sem exclusão do banco
}

export interface Appointment {
  id: string;
  title: string;
  category: AppointmentCategory;
  date: string;
  time: string;
  location: string;
  address?: string;
  status: AppointmentStatus;
  notes?: string;
  responsibleCollaboratorId?: string;
  responsibleName?: string;
  responsibleRole?: string;
  responsiblePhone?: string;
  venueId?: string;
}

export interface Benefit {
  id: string;
  title: string;
  description: string;
  requiredPoints: number;
  category: string;
  status: MilestoneStatus;
  imageUrl: string;
  voucherCode?: string;
  claimedAt?: string;
  estimatedValue?: number; // Valor financeiro estimado em R$
}
