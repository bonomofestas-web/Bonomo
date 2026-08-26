import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import type { 
  TabType, 
  JourneySubTab,
  JourneyStatus,
  CapacityConquestReward,
  VenueTheme, 
  DebutanteProfile, 
  Milestone, 
  Referral, 
  Guest, 
  Appointment, 
  Benefit,
  VipReward,
  VipRewardStatus,
  ReferralGroup,
  GuestGroup,
  GuestStatus,
  MilestoneStatus
} from '../types';
import type { DebutanteAccount } from '../types/admin';
import { 
  mockThemes, 
  mockDebutante, 
  mockMilestones, 
  mockBenefits,
  mockVipRewards
} from '../data/mockData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { leadService } from '../services/leadService';

export type ScenarioKey = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'T2' | 'T3' | 'T9';

/**
 * SOURCE OF TRUTH: calculateVipRewards (Regra de Ativação do Primeiro Presente)
 * - Se convertedSales >= requiredSales -> 'completed' (CONQUISTADO / DOURADO)
 * - Se index === firstUncompletedIdx (ex: 1º presente Apple Watch com 0 vendas) OU convertedSales > 0 -> 'in_progress' (EM PROGRESSO / ANDAMENTO)
 * - Demais presentes futuros não iniciados -> 'locked' (BLOQUEADO)
 */
export const calculateVipRewards = (
  baseRewards: VipReward[],
  convertedSales: number
): VipReward[] => {
  const firstUncompletedIdx = baseRewards.findIndex(r => convertedSales < r.requiredSales);

  return baseRewards.map((r, index) => {
    let status: VipRewardStatus = 'locked';
    if (convertedSales >= r.requiredSales) {
      status = 'completed';
    } else if (index === firstUncompletedIdx || (convertedSales > 0 && convertedSales < r.requiredSales)) {
      status = 'in_progress';
    } else {
      status = 'locked';
    }
    return {
      ...r,
      status
    };
  });
};

const sampleNames = [
  'Sophia Alencar', 'Beatriz Vasconcelos', 'Camila Martins', 'Isadora Prado',
  'Larissa Freire', 'Luana Guimarães', 'Mariana Lima', 'Valentina Rossi',
  'Giovanna Martins', 'Gabriela Duarte', 'Julia Nogueira', 'Manuela Castro',
  'Helena Silveira', 'Leticia Mendes', 'Alice Barbosa', 'Yasmin Fonseca',
  'Laura Peixoto', 'Rafaela Albuquerque', 'Bruna Figueiredo', 'Fernanda Paes',
  'Livia Ribeiro', 'Carolina Sampaio', 'Juliana Ramos', 'Lorena Azevedo',
  'Clara Toledo', 'Rebeca Vasconcelos', 'Melissa Correia', 'Emanuelle Rocha',
  'Vitoria Campos', 'Bianca Farias'
];

const sampleGroups: ReferralGroup[] = ['Escola', 'Família', 'Judô', 'Amigos', 'Academia', 'Faculdade', 'Outros'];

export const generateReferralsList = (validatedCount: number, pendingCount: number, rejectedCount: number = 0): Referral[] => {
  const result: Referral[] = [];
  let nameIndex = 0;

  for (let i = 0; i < validatedCount; i++) {
    const name = sampleNames[nameIndex % sampleNames.length] + (nameIndex >= sampleNames.length ? ` (${Math.floor(nameIndex / sampleNames.length) + 1})` : '');
    nameIndex++;
    result.push({
      id: `ref_val_${i + 1}`,
      name,
      phone: `(21) 9${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      age: 14 + (i % 2),
      group: sampleGroups[i % sampleGroups.length],
      notes: 'Indicação validada pela equipe comercial.',
      createdAt: `2026-08-${String(Math.min(28, 1 + i)).padStart(2, '0')}`,
      status: 'validated',
      pointsGranted: 1
    });
  }

  for (let i = 0; i < pendingCount; i++) {
    const name = sampleNames[nameIndex % sampleNames.length] + (nameIndex >= sampleNames.length ? ` (${Math.floor(nameIndex / sampleNames.length) + 1})` : '');
    nameIndex++;
    result.push({
      id: `ref_pend_${i + 1}`,
      name,
      phone: `(21) 9${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      age: 14 + (i % 2),
      group: sampleGroups[(i + 2) % sampleGroups.length],
      notes: 'Aguardando validação da equipe comercial.',
      createdAt: '2026-08-16',
      status: 'pending',
      pointsGranted: 0
    });
  }

  for (let i = 0; i < rejectedCount; i++) {
    const name = sampleNames[nameIndex % sampleNames.length] + (nameIndex >= sampleNames.length ? ` (${Math.floor(nameIndex / sampleNames.length) + 1})` : '');
    nameIndex++;
    result.push({
      id: `ref_rej_${i + 1}`,
      name,
      phone: `(21) 9${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      age: 14 + (i % 2),
      group: sampleGroups[(i + 4) % sampleGroups.length],
      notes: 'Indicação recusada comercialmente (não elegível).',
      createdAt: '2026-08-15',
      status: 'rejected',
      pointsGranted: 0
    });
  }

  return result;
};

/**
 * SOURCE OF TRUTH: calculateMilestones
 * For each milestone:
 * - If validatedCount >= target -> 'completed' (CONCLUÍDO / DOURADO + CHECK)
 * - Else if submittedCount >= target OR it is the first uncompleted active milestone -> 'in_progress' (EM PROGRESSO / ROSA)
 * - Else -> 'locked' (BLOQUEADO / CINZA + CADEADO)
 */
export const calculateMilestones = (
  baseMilestones: Milestone[], 
  validCount: number, 
  submittedCount: number
): Milestone[] => {
  const firstUncompletedIdx = baseMilestones.findIndex(m => validCount < m.requiredReferrals);

  return baseMilestones.map((m, index) => {
    let newStatus: MilestoneStatus = 'locked';
    let tag = 'BLOQUEADO';

    if (validCount >= m.requiredReferrals) {
      newStatus = 'completed';
      tag = 'CONCLUÍDO';
    } else if (submittedCount >= m.requiredReferrals || index === firstUncompletedIdx) {
      newStatus = 'in_progress';
      tag = 'EM PROGRESSO';
    } else {
      newStatus = 'locked';
      tag = 'BLOQUEADO';
    }

    return {
      ...m,
      status: newStatus,
      badgeTag: tag
    };
  });
};

interface AppStateContextType {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  journeySubTab: JourneySubTab;
  setJourneySubTab: (tab: JourneySubTab) => void;
  currentTheme: VenueTheme;
  themes: VenueTheme[];
  switchTheme: (themeId: string) => void;
  debutante: DebutanteProfile;
  milestones: Milestone[];
  referrals: Referral[];
  guests: Guest[];
  appointments: Appointment[];
  benefits: Benefit[];
  vipRewards: VipReward[];
  convertedReferralSales: number;
  pendingReferralsCount: number;
  validatedReferralsCount: number;
  sentReferralsCount: number;
  conquestMilestone: Milestone | null;
  conquestVipReward: VipReward | null;
  conquestCapacityReward: CapacityConquestReward | null;
  cycleRenewalSuccess: boolean;
  closeConquestModal: () => void;
  closeConquestVipModal: () => void;
  closeConquestCapacityModal: () => void;
  closeCycleRenewalSuccessModal: () => void;
  // Modal UI Controls
  isReferralModalOpen: boolean;
  setIsReferralModalOpen: (open: boolean) => void;
  isSelfRegisterModalOpen: boolean;
  setIsSelfRegisterModalOpen: (open: boolean) => void;
  selectedInviteGuest: Guest | null;
  setSelectedInviteGuest: (guest: Guest | null) => void;
  // Actions
  addReferral: (data: { name: string; phone: string; age: number; group: ReferralGroup; notes?: string }) => void;
  validateReferral: (referralId: string) => void;
  rejectReferral: (referralId: string) => void;
  simulateAddValidReferral: () => void;
  simulateAddPendingReferral: () => void;
  simulateAddVipSale: () => void;
  setVipSalesCount: (count: number) => void;
  // Cycle & 6-Month Timer Actions
  simulateExpireCycle: () => void;
  simulateExpire6Months: () => void;
  simulateResetCycleTimer: () => void;
  simulateSetCycleRemainingHours: (hours: number) => void;
  simulateAddRenewalReferral: () => void;
  applyScenario: (scenario: ScenarioKey) => void;
  addGuest: (data: Omit<Guest, 'id'>) => string;
  updateGuest: (guestId: string, data: Partial<Guest>) => void;
  deleteGuest: (guestId: string) => void;
  confirmGuestByDebutante: (guestId: string) => void;
  selfRegisterGuest: (data: { name: string; phone: string; age: number; gender?: import('../types').GuestGender; group: GuestGroup; plusOnes: number; companionNames?: string[]; sweetMessage?: string }) => void;
  updateGuestStatus: (guestId: string, status: GuestStatus) => void;
  confirmGuestRsvp: (guestId: string, sweetMessage?: string, companionNames?: string[]) => void;
  declineGuestRsvp: (guestId: string, declinedMessage?: string) => void;
  updateInviteSettings: (data: { useCustomInvitePhoto: boolean; customInvitePhotoUrl?: string; receptionMessage?: string }) => void;
  claimBenefit: (benefitId: string) => void;
  claimMilestoneReward: (milestoneId: string) => void;
  resetState: () => void;
  loadDemoData: () => void;
  isMobileFrame: boolean;
  toggleMobileFrame: () => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export const AppStateProvider: React.FC<{ 
  children: React.ReactNode;
  initialAccount?: DebutanteAccount;
}> = ({ children, initialAccount }) => {
  const [activeTab, setActiveTab] = useState<TabType>('journey');
  const [journeySubTab, setJourneySubTab] = useState<JourneySubTab>('benefits');
  const [themes] = useState<VenueTheme[]>(mockThemes);
  const [currentTheme, setCurrentTheme] = useState<VenueTheme>(mockThemes[0]);
  
  const [debutante, setDebutante] = useState<DebutanteProfile>(() => {
    if (initialAccount) {
      return {
        id: initialAccount.id,
        name: initialAccount.name,
        slug: initialAccount.slug,
        partyDate: initialAccount.partyDate,
        partyDaysLeft: initialAccount.partyDaysLeft,
        avatarUrl: initialAccount.avatarUrl,
        phone: initialAccount.phone,
        hasJourneyEnabled: initialAccount.hasJourneyEnabled,
        welcomeVideoUrl: initialAccount.welcomeVideoUrl,
        hasSeenWelcomeVideo: initialAccount.hasSeenWelcomeVideo,
        validReferrals: initialAccount.validReferrals,
        totalTargetReferrals: initialAccount.totalTargetReferrals,
        journeyProgressPercentage: initialAccount.journeyProgressPercentage,
        convertedReferralSales: initialAccount.convertedReferralSales,
        baseGuestLimit: initialAccount.baseGuestLimit,
        extraGuestsUnlocked: initialAccount.extraGuestsUnlocked,
        currentGuestLimit: initialAccount.currentGuestLimit,
        journeyCycle: initialAccount.journeyCycle,
        venueId: initialAccount.venueId,
      };
    }
    return {
      ...mockDebutante,
      hasJourneyEnabled: true,
      hasSeenWelcomeVideo: true,
    };
  });
  
  const [milestones, setMilestones] = useState<Milestone[]>(() => 
    initialAccount?.milestones && initialAccount.milestones.length > 0
      ? initialAccount.milestones
      : calculateMilestones(mockMilestones, debutante.validReferrals, 0)
  );
  
  const [referrals, setReferrals] = useState<Referral[]>(() => 
    initialAccount?.referrals || []
  );
  const [guests, setGuests] = useState<Guest[]>(() => 
    initialAccount?.guests || []
  );
  const [appointments] = useState<Appointment[]>(() => 
    initialAccount?.appointments || []
  );
  const [benefits, setBenefits] = useState<Benefit[]>(mockBenefits.map(b => ({ ...b, status: 'locked' as const })));
  const [convertedReferralSales, setConvertedReferralSalesState] = useState<number>(initialAccount?.convertedReferralSales || 0);
  const [vipRewards, setVipRewards] = useState<VipReward[]>(() => 
    initialAccount?.vipRewards && initialAccount.vipRewards.length > 0 
      ? initialAccount.vipRewards 
      : calculateVipRewards(mockVipRewards, initialAccount?.convertedReferralSales || 0)
  );

  // Sync when initialAccount prop changes
  useEffect(() => {
    if (initialAccount) {
      setDebutante({
        id: initialAccount.id,
        name: initialAccount.name,
        slug: initialAccount.slug,
        partyDate: initialAccount.partyDate,
        partyDaysLeft: initialAccount.partyDaysLeft,
        avatarUrl: initialAccount.avatarUrl,
        phone: initialAccount.phone,
        hasJourneyEnabled: initialAccount.hasJourneyEnabled,
        welcomeVideoUrl: initialAccount.welcomeVideoUrl,
        hasSeenWelcomeVideo: initialAccount.hasSeenWelcomeVideo,
        validReferrals: initialAccount.validReferrals,
        totalTargetReferrals: initialAccount.totalTargetReferrals,
        journeyProgressPercentage: initialAccount.journeyProgressPercentage,
        convertedReferralSales: initialAccount.convertedReferralSales,
        baseGuestLimit: initialAccount.baseGuestLimit,
        extraGuestsUnlocked: initialAccount.extraGuestsUnlocked,
        currentGuestLimit: initialAccount.currentGuestLimit,
        journeyCycle: initialAccount.journeyCycle,
        venueId: initialAccount.venueId,
      });
      if (initialAccount.milestones && initialAccount.milestones.length > 0) {
        setMilestones(initialAccount.milestones);
      }
      if (initialAccount.vipRewards && initialAccount.vipRewards.length > 0) {
        setVipRewards(initialAccount.vipRewards);
      }
      setGuests(initialAccount.guests || []);
      setReferrals(initialAccount.referrals || []);
      setConvertedReferralSalesState(initialAccount.convertedReferralSales || 0);
    }
  }, [initialAccount]);

  // Persist Debutante Account changes to localStorage so reloading retains 100% of user data
  useEffect(() => {
    if (!debutante.id) return;
    try {
      const savedDebs = localStorage.getItem('bonomo_admin_debutantes_v7');
      if (savedDebs) {
        const debs: DebutanteAccount[] = JSON.parse(savedDebs);
        const updatedDebs = debs.map(d => {
          if (d.id === debutante.id || d.slug === debutante.slug) {
            return {
              ...d,
              name: debutante.name,
              partyDate: debutante.partyDate,
              partyDaysLeft: debutante.partyDaysLeft,
              avatarUrl: debutante.avatarUrl,
              phone: debutante.phone,
              hasJourneyEnabled: debutante.hasJourneyEnabled,
              welcomeVideoUrl: debutante.welcomeVideoUrl,
              hasSeenWelcomeVideo: debutante.hasSeenWelcomeVideo,
              validReferrals: debutante.validReferrals,
              totalTargetReferrals: debutante.totalTargetReferrals,
              journeyProgressPercentage: debutante.journeyProgressPercentage,
              convertedReferralSales: debutante.convertedReferralSales,
              baseGuestLimit: debutante.baseGuestLimit,
              extraGuestsUnlocked: debutante.extraGuestsUnlocked,
              currentGuestLimit: debutante.currentGuestLimit,
              journeyCycle: debutante.journeyCycle,
              useCustomInvitePhoto: debutante.useCustomInvitePhoto,
              customInvitePhotoUrl: debutante.customInvitePhotoUrl,
              receptionMessage: debutante.receptionMessage,
              guests,
              referrals,
              milestones,
              vipRewards,
              updatedAt: new Date().toISOString(),
            };
          }
          return d;
        });
        localStorage.setItem('bonomo_admin_debutantes_v7', JSON.stringify(updatedDebs));
      }
    } catch (e) {
      console.error('Error saving debutante to localStorage:', e);
    }
  }, [debutante, guests, referrals, milestones, vipRewards]);
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(false);
  const [conquestMilestone, setConquestMilestone] = useState<Milestone | null>(null);
  const [conquestVipReward, setConquestVipReward] = useState<VipReward | null>(null);
  const [conquestCapacityReward, setConquestCapacityReward] = useState<CapacityConquestReward | null>(null);
  const [cycleRenewalSuccess, setCycleRenewalSuccess] = useState<boolean>(false);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState<boolean>(false);
  const [isSelfRegisterModalOpen, setIsSelfRegisterModalOpen] = useState<boolean>(false);
  const [selectedInviteGuest, setSelectedInviteGuest] = useState<Guest | null>(null);

  const prevValidRef = useRef<number>(0);
  const prevVipSalesRef = useRef<number>(0);
  const prevCapacityRef = useRef<number>(250);

  // Apply theme variables to root :root element
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary', currentTheme.primaryColor);
    root.style.setProperty('--primary-light', currentTheme.secondaryColor);
    root.style.setProperty('--secondary', currentTheme.secondaryColor);
    root.style.setProperty('--accent', currentTheme.accentColor);
    root.style.setProperty('--glow', currentTheme.glowColor);
    root.style.setProperty('--bg-dark', currentTheme.bgDark);
    root.style.setProperty('--bg-card', currentTheme.bgCard);
    root.style.setProperty('--font-family', currentTheme.fontFamily);
  }, [currentTheme]);

  const switchTheme = (themeId: string) => {
    const found = themes.find(t => t.id === themeId);
    if (found) {
      setCurrentTheme(found);
    }
  };

  // Web Audio Synth Victory Chime (4-note ascending celebration)
  const playVictoryChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.35);
      });
    } catch (e) {
      console.log('Audio autoplay prevented or unavailable:', e);
    }
  };

  // Check Cycle & 6-Month Hard Limit Status
  useEffect(() => {
    const timer = setInterval(() => {
      setDebutante(prev => {
        const now = Date.now();
        const maxEnd = new Date(prev.journeyCycle.journeyMaximumEndDate).getTime();
        const cycleEnd = new Date(prev.journeyCycle.currentCycleEndDate).getTime();

        let newStatus: JourneyStatus = prev.journeyCycle.journeyStatus;
        if (now >= maxEnd) {
          newStatus = 'closed';
        } else if (now >= cycleEnd) {
          if (prev.journeyCycle.journeyStatus === 'active') {
            newStatus = 'paused';
          }
        } else {
          if (prev.journeyCycle.journeyStatus === 'paused' && now < cycleEnd) {
            newStatus = 'active';
          }
        }

        if (newStatus !== prev.journeyCycle.journeyStatus) {
          return {
            ...prev,
            journeyCycle: {
              ...prev.journeyCycle,
              journeyStatus: newStatus
            }
          };
        }
        return prev;
      });
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  // Central State Re-sync based on updated referrals array
  // IMPORTANT: Indicações de renovação (isRenewalReferral = true) NÃO contam na progressão das Metas 1, 2, 3 e 4!
  const syncStateFromReferrals = useCallback((updatedReferrals: Referral[], suppressPopup: boolean = false) => {
    const validCount = updatedReferrals.filter(r => r.status === 'validated' && !r.isRenewalReferral).length;
    const sentCount = updatedReferrals.filter(r => (r.status === 'validated' || r.status === 'pending') && !r.isRenewalReferral).length;
    const prevValid = prevValidRef.current;
    prevValidRef.current = validCount;

    const totalTarget = debutante.totalTargetReferrals;
    const newProgress = Math.min(100, Math.round((validCount / totalTarget) * 100));

    // Dynamic guest limit calculation (250 base + 10 if Meta 2 / Benefit 2 is conquered)
    const hasGuestCapacityBonus = validCount >= 10;
    const extraGuests = hasGuestCapacityBonus ? 10 : 0;
    const newGuestLimit = 250 + extraGuests;
    const prevCapacity = prevCapacityRef.current;
    prevCapacityRef.current = newGuestLimit;

    setDebutante(prev => ({
      ...prev,
      validReferrals: validCount,
      journeyProgressPercentage: newProgress,
      extraGuestsUnlocked: extraGuests,
      currentGuestLimit: newGuestLimit
    }));

    // Trigger Guest Capacity Unlocked feedback if newly conquered
    if (!suppressPopup && newGuestLimit > prevCapacity) {
      setConquestCapacityReward({
        previousLimit: prevCapacity,
        newLimit: newGuestLimit,
        bonus: 10
      });
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#34D399', '#FFD700', '#FF5C9A', '#FFF']
      });
      playVictoryChime();
    }

    const newMilestones = calculateMilestones(mockMilestones, validCount, sentCount);
    setMilestones(newMilestones);

    // Check if a milestone was newly conquered with this validation
    if (!suppressPopup && validCount > prevValid) {
      const newlyConquered = newMilestones.find(
        m => validCount >= m.requiredReferrals && prevValid < m.requiredReferrals
      );

      if (newlyConquered) {
        setConquestMilestone(newlyConquered);
        confetti({
          particleCount: 140,
          spread: 85,
          origin: { y: 0.5 },
          colors: ['#FFD700', '#FF3B70', '#E8C98D', '#2CE0A3', '#FFFFFF']
        });
        playVictoryChime();
      }
    }

    // Update Benefits status based on requiredPoints
    setBenefits(prevBenefits =>
      prevBenefits.map(b => {
        let bStatus: MilestoneStatus = b.status;
        if (validCount >= b.requiredPoints) {
          bStatus = 'claimed';
        } else {
          bStatus = 'locked';
        }
        return { ...b, status: bStatus };
      })
    );
  }, [debutante.totalTargetReferrals]);

  // Update VIP Sales Count & Trigger VIP Conquest if target met
  const updateVipSales = useCallback((newCount: number, suppressPopup: boolean = false) => {
    const prevSales = prevVipSalesRef.current;
    prevVipSalesRef.current = newCount;

    setConvertedReferralSalesState(newCount);
    setDebutante(prev => ({
      ...prev,
      convertedReferralSales: newCount
    }));

    const updatedVipRewards = calculateVipRewards(mockVipRewards, newCount);
    setVipRewards(updatedVipRewards);

    if (!suppressPopup && newCount > prevSales) {
      const newlyConquered = updatedVipRewards.find(
        r => newCount >= r.requiredSales && prevSales < r.requiredSales
      );

      if (newlyConquered) {
        setConquestVipReward(newlyConquered);
        confetti({
          particleCount: 160,
          spread: 90,
          origin: { y: 0.45 },
          colors: ['#FFD700', '#F59E0B', '#E8C98D', '#FFF', '#FF3B70']
        });
        playVictoryChime();
      }
    }
  }, []);

  const simulateAddVipSale = () => {
    updateVipSales(convertedReferralSales + 1, false);
  };

  const setVipSalesCount = (count: number) => {
    updateVipSales(count, true);
  };

  // Helper to advance cycle renewal progress when a referral is added
  const processCycleRenewalOnReferral = () => {
    setDebutante(prev => {
      const maxEnd = new Date(prev.journeyCycle.journeyMaximumEndDate).getTime();
      const currentRenewal = prev.journeyCycle.cycleRenewalProgress;
      const nextRenewal = currentRenewal + 1;

      if (nextRenewal >= 3) {
        // Unlock new 7-day cycle!
        const now = Date.now();
        const cycleSevenDays = now + 7 * 24 * 60 * 60 * 1000;
        const cappedCycleEnd = new Date(Math.min(cycleSevenDays, maxEnd)).toISOString();

        setCycleRenewalSuccess(true);
        confetti({
          particleCount: 160,
          spread: 90,
          origin: { y: 0.45 },
          colors: ['#FFD700', '#FF5C9A', '#34D399', '#FFF']
        });
        playVictoryChime();

        return {
          ...prev,
          journeyCycle: {
            ...prev.journeyCycle,
            currentCycleStartDate: new Date(now).toISOString(),
            currentCycleEndDate: cappedCycleEnd,
            cycleRenewalProgress: 0,
            journeyStatus: 'active'
          }
        };
      } else {
        return {
          ...prev,
          journeyCycle: {
            ...prev.journeyCycle,
            cycleRenewalProgress: nextRenewal
          }
        };
      }
    });
  };

  // Add a new referral from debutante (starts as 'pending' and registers in CRM)
  const addReferral = (data: { name: string; phone: string; age: number; group: ReferralGroup; notes?: string }) => {
    const isPaused = debutante.journeyCycle.journeyStatus === 'paused';
    const newRefId = `ref_${Date.now()}`;
    const newRef: Referral = {
      id: newRefId,
      name: data.name,
      phone: data.phone,
      age: data.age,
      group: data.group,
      notes: data.notes,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'pending',
      pointsGranted: 0,
      isRenewalReferral: isPaused
    };

    const nextList = [newRef, ...referrals];
    setReferrals(nextList);
    syncStateFromReferrals(nextList, false);

    // If journey was paused, advance renewal progress towards 3/3
    if (isPaused) {
      processCycleRenewalOnReferral();
    }

    // Automatically register as a new lead in CRM (localStorage & Supabase)
    try {
      const savedLeads = localStorage.getItem('bonomo_admin_leads_v7');
      const leadsList: import('../types/admin').Lead[] = savedLeads ? JSON.parse(savedLeads) : [];
      const newLeadId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const newLead: import('../types/admin').Lead = {
        id: newLeadId,
        debutanteId: debutante.id,
        debutanteName: debutante.name,
        debutanteSlug: debutante.slug || 'deb_slug',
        venueId: debutante.venueId || 'rio_lounge',
        name: data.name,
        phone: data.phone,
        age: data.age,
        group: data.group,
        notes: data.notes,
        stage: 'new_lead',
        isValidated: false,
        pointsGranted: 0,
        participants: [],
        tasks: [],
        activities: [
          {
            id: `act_${Date.now()}`,
            leadId: newLeadId,
            timestamp: new Date().toISOString(),
            type: 'creation',
            title: `Indicação enviada pela aniversariante ${debutante.name}`,
            authorName: debutante.name,
          }
        ],
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
      };
      localStorage.setItem('bonomo_admin_leads_v7', JSON.stringify([newLead, ...leadsList]));

      // Background Supabase Sync
      if (isSupabaseConfigured) {
        leadService.upsert(newLead);
        supabase.from('referrals').insert({
          id: newRefId,
          debutante_id: debutante.id,
          lead_id: newLeadId,
          name: data.name,
          phone: data.phone,
          age: data.age,
          group: data.group,
          notes: data.notes,
          status: 'pending',
          points_granted: 0,
          is_renewal_referral: isPaused,
        });
      }
    } catch (e) {
      console.error('Error creating lead in localStorage/Supabase:', e);
    }
  };

  // Simulate commercial team validating a pending referral
  const validateReferral = (referralId: string) => {
    const nextList = referrals.map(r => 
      r.id === referralId ? { ...r, status: 'validated' as const, pointsGranted: 1 } : r
    );
    setReferrals(nextList);
    syncStateFromReferrals(nextList, false);
  };

  // Simulate commercial team rejecting a pending referral
  const rejectReferral = (referralId: string) => {
    const nextList = referrals.map(r => 
      r.id === referralId ? { ...r, status: 'rejected' as const, pointsGranted: 0 } : r
    );
    setReferrals(nextList);
    syncStateFromReferrals(nextList, true);
  };

  // Instant simulation: Add a validated referral directly
  const simulateAddValidReferral = () => {
    const validCount = referrals.filter(r => r.status === 'validated').length;
    const randomName = sampleNames[validCount % sampleNames.length];
    
    const newRef: Referral = {
      id: `ref_sim_val_${Date.now()}`,
      name: `${randomName} (${validCount + 1}ª)`,
      phone: '(21) 99999-0000',
      age: 14,
      group: 'Escola',
      notes: 'Indicação validada via simulação em tempo real.',
      createdAt: new Date().toISOString().split('T')[0],
      status: 'validated',
      pointsGranted: 1,
      isRenewalReferral: false
    };

    const nextList = [newRef, ...referrals];
    setReferrals(nextList);
    syncStateFromReferrals(nextList, false);
  };

  // Instant simulation: Add a pending referral directly
  const simulateAddPendingReferral = () => {
    const sentCount = referrals.filter(r => r.status === 'validated' || r.status === 'pending').length;
    const randomName = sampleNames[(sentCount + 7) % sampleNames.length];

    const newRef: Referral = {
      id: `ref_sim_pend_${Date.now()}`,
      name: `${randomName} (Pendente ${sentCount + 1})`,
      phone: '(21) 98888-1111',
      age: 15,
      group: 'Amigos',
      notes: 'Nova indicação aguardando validação comercial.',
      createdAt: new Date().toISOString().split('T')[0],
      status: 'pending',
      pointsGranted: 0,
      isRenewalReferral: false
    };

    const nextList = [newRef, ...referrals];
    setReferrals(nextList);
    syncStateFromReferrals(nextList, false);
  };

  // Simulation: Add 1 renewal referral step (1/3 -> 2/3 -> 3/3 -> Unlock)
  const simulateAddRenewalReferral = () => {
    const sentCount = referrals.filter(r => r.status === 'validated' || r.status === 'pending').length;
    const randomName = sampleNames[(sentCount + 3) % sampleNames.length];

    const newRef: Referral = {
      id: `ref_sim_renew_${Date.now()}`,
      name: `${randomName} (Desbloqueio ${sentCount + 1})`,
      phone: '(21) 98888-2222',
      age: 15,
      group: 'Amigos',
      notes: 'Indicação feita para desbloquear a jornada.',
      createdAt: new Date().toISOString().split('T')[0],
      status: 'pending',
      pointsGranted: 0,
      isRenewalReferral: true
    };

    const nextList = [newRef, ...referrals];
    setReferrals(nextList);
    syncStateFromReferrals(nextList, false);
    processCycleRenewalOnReferral();
  };

  // Simulation: Expire 7-day cycle (triggers Paused state)
  const simulateExpireCycle = () => {
    setDebutante(prev => ({
      ...prev,
      journeyCycle: {
        ...prev.journeyCycle,
        currentCycleEndDate: new Date(Date.now() - 1000 * 60).toISOString(),
        journeyStatus: 'paused'
      }
    }));
  };

  // Simulation: Expire 6-Month Hard Limit (triggers Closed state)
  const simulateExpire6Months = () => {
    setDebutante(prev => ({
      ...prev,
      journeyCycle: {
        ...prev.journeyCycle,
        journeyMaximumEndDate: new Date(Date.now() - 1000 * 60).toISOString(),
        currentCycleEndDate: new Date(Date.now() - 1000 * 60).toISOString(),
        journeyStatus: 'closed'
      }
    }));
  };

  // Simulation: Set remaining hours on cycle (e.g. 144h for 6d, 72h for 3d, 24h for urgent)
  const simulateSetCycleRemainingHours = (hours: number) => {
    const now = Date.now();
    const cycleEnd = new Date(now + hours * 60 * 60 * 1000).toISOString();
    setDebutante(prev => ({
      ...prev,
      journeyCycle: {
        ...prev.journeyCycle,
        currentCycleEndDate: cycleEnd,
        journeyStatus: hours <= 0 ? 'paused' : 'active'
      }
    }));
  };

  // Simulation: Reset cycle to fresh 7 days
  const simulateResetCycleTimer = () => {
    const now = Date.now();
    const cycleSevenDays = now + 7 * 24 * 60 * 60 * 1000;
    const sixMonths = now + 180 * 24 * 60 * 60 * 1000;

    setDebutante(prev => ({
      ...prev,
      journeyCycle: {
        journeyStartDate: new Date(now).toISOString(),
        journeyMaximumEndDate: new Date(sixMonths).toISOString(),
        currentCycleStartDate: new Date(now).toISOString(),
        currentCycleEndDate: new Date(cycleSevenDays).toISOString(),
        cycleRenewalTarget: 3,
        cycleRenewalProgress: 0,
        journeyStatus: 'active'
      }
    }));
  };

  // Apply predefined user testing scenarios
  const applyScenario = (scenario: ScenarioKey) => {
    let nextList: Referral[] = [];

    switch (scenario) {
      case 'A': // Teste 1 / Cenário A: 0 enviadas / 0 validadas
        nextList = [];
        break;
      case 'B': // Teste 8 / Cenário B: 20 enviadas / 0 validadas (20 pendentes)
        nextList = generateReferralsList(0, 20, 0);
        break;
      case 'C': // Teste 7 / Cenário C: 20 enviadas / 7 validadas (13 pendentes)
        nextList = generateReferralsList(7, 13, 0);
        break;
      case 'D': // Teste 4 / Cenário D: 20 enviadas / 10 validadas (10 pendentes)
        nextList = generateReferralsList(10, 10, 0);
        break;
      case 'E': // Teste 5 / Cenário E: 20 enviadas / 15 validadas (5 pendentes)
        nextList = generateReferralsList(15, 5, 0);
        break;
      case 'F': // Teste 6 / Cenário F: 20 enviadas / 20 validadas (0 pendentes)
        nextList = generateReferralsList(20, 0, 0);
        break;
      case 'G': // Cenário G: 20 enviadas / 7 validadas / 1 recusada -> 19 consideradas (7 validadas, 12 pendentes, 1 recusada)
        nextList = generateReferralsList(7, 12, 1);
        break;
      case 'T2': // Teste 2: 5 enviadas / 5 validadas
        nextList = generateReferralsList(5, 0, 0);
        break;
      case 'T3': // Teste 3: 7 enviadas / 7 validadas
        nextList = generateReferralsList(7, 0, 0);
        break;
      case 'T9': // Teste 9: 10 enviadas / 4 validadas (6 pendentes)
        nextList = generateReferralsList(4, 6, 0);
        break;
      default:
        nextList = [];
    }

    setReferrals(nextList);
    syncStateFromReferrals(nextList, true);
  };

  // Guest Management
  const addGuest = (data: Omit<Guest, 'id'>): string => {
    const mainGuestId = `g_${Date.now()}`;
    const companionsList = (data.companionNames || []).filter(n => n.trim() !== '');

    // If debutante specified companions directly (Option A - Preencher agora)
    const companionGuests: Guest[] = companionsList.map((compName, idx) => ({
      id: `g_comp_${Date.now()}_${idx + 1}`,
      name: compName.trim(),
      phone: data.phone,
      age: data.age,
      group: data.group,
      status: data.status,
      plusOnes: 0,
      isCompanion: true,
      parentGuestId: mainGuestId,
      parentGuestName: data.name,
      origin: data.origin || 'manual',
      confirmedAt: data.status === 'confirmed' ? new Date().toISOString().split('T')[0] : undefined,
    }));

    const newGuest: Guest = {
      ...data,
      id: mainGuestId,
      origin: data.origin || 'manual',
      allowedCapacity: data.allowedCapacity || (companionsList.length > 0 ? companionsList.length + 1 : 1),
      plusOnes: companionsList.length,
      companionNames: companionsList.length > 0 ? companionsList : undefined,
      companionGuestIds: companionGuests.map(c => c.id),
      isLinkExpired: data.status === 'confirmed',
      confirmedAt: data.status === 'confirmed' ? new Date().toISOString().split('T')[0] : undefined
    };

    setGuests(prev => [newGuest, ...companionGuests, ...prev]);
    return mainGuestId;
  };

  const updateGuest = (guestId: string, data: Partial<Guest>) => {
    setGuests(prev => prev.map(g => g.id === guestId ? { ...g, ...data } : g));
  };

  const deleteGuest = (guestId: string) => {
    setGuests(prev => prev.filter(g => g.id !== guestId && g.parentGuestId !== guestId));
  };

  const confirmGuestByDebutante = (guestId: string) => {
    const today = new Date().toISOString().split('T')[0];
    setGuests(prev => {
      const target = prev.find(g => g.id === guestId);
      if (!target) return prev;

      return prev.map(g => {
        if (g.id === guestId) {
          return {
            ...g,
            status: 'confirmed' as const,
            confirmationSource: 'debutante' as const,
            isLinkExpired: true,
            confirmedAt: today
          };
        }
        if (g.parentGuestId === guestId) {
          return {
            ...g,
            status: 'confirmed' as const,
            confirmationSource: 'debutante' as const,
            isLinkExpired: true,
            confirmedAt: today
          };
        }
        return g;
      });
    });
    confetti({
      particleCount: 100,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FF5C9A', '#34D399', '#FFF']
    });
    playVictoryChime();
  };

  const updateGuestStatus = (guestId: string, status: GuestStatus) => {
    setGuests(prev => 
      prev.map(g => g.id === guestId ? { 
        ...g, 
        status, 
        isLinkExpired: status === 'confirmed' ? true : g.isLinkExpired,
        confirmedAt: status === 'confirmed' ? new Date().toISOString().split('T')[0] : undefined 
      } : g)
    );
  };

  // Self-register a guest from public invite link
  const selfRegisterGuest = (data: { name: string; phone: string; age: number; gender?: import('../types').GuestGender; group: GuestGroup; plusOnes: number; companionNames?: string[]; sweetMessage?: string }) => {
    const mainGuestId = `g_self_${Date.now()}`;
    const companionsList = (data.companionNames || []).filter(n => n.trim() !== '');
    const today = new Date().toISOString().split('T')[0];
    
    // Create independent companion guest records
    const companionGuests: Guest[] = companionsList.map((compName, idx) => ({
      id: `g_comp_${Date.now()}_${idx + 1}`,
      name: compName.trim(),
      phone: data.phone,
      age: data.age,
      gender: 'female',
      group: data.group,
      status: 'confirmed',
      plusOnes: 0,
      isCompanion: true,
      parentGuestId: mainGuestId,
      parentGuestName: data.name,
      origin: 'general_link',
      confirmationSource: 'guest',
      isLinkExpired: true,
      confirmedAt: today,
      isSelfRegistered: true
    }));

    const mainGuest: Guest = {
      id: mainGuestId,
      name: data.name,
      phone: data.phone,
      age: data.age,
      gender: data.gender || 'female',
      group: data.group,
      status: 'confirmed',
      origin: 'general_link',
      confirmationSource: 'guest',
      isLinkExpired: true,
      allowedCapacity: companionsList.length + 1,
      plusOnes: companionsList.length,
      companionNames: companionsList.length > 0 ? companionsList : undefined,
      companionGuestIds: companionGuests.map(c => c.id),
      sweetMessage: data.sweetMessage,
      isSelfRegistered: true,
      confirmedAt: today
    };

    setGuests(prev => [mainGuest, ...companionGuests, ...prev]);
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FF5C9A', '#34D399', '#FFF']
    });
    playVictoryChime();
  };

  const confirmGuestRsvp = (guestId: string, sweetMessage?: string, companionNames?: string[]) => {
    setGuests(prev => {
      const existing = prev.find(g => g.id === guestId);
      if (!existing) return prev;

      const companionsList = (companionNames || existing.companionNames || []).filter(n => n.trim() !== '');
      const today = new Date().toISOString().split('T')[0];

      const newCompanionGuests: Guest[] = companionsList.map((compName, idx) => ({
        id: `g_comp_${guestId}_${idx + 1}`,
        name: compName.trim(),
        phone: existing.phone,
        age: existing.age,
        group: existing.group,
        status: 'confirmed',
        plusOnes: 0,
        isCompanion: true,
        parentGuestId: guestId,
        parentGuestName: existing.name,
        origin: existing.origin || 'individual_link',
        confirmationSource: 'guest',
        isLinkExpired: true,
        confirmedAt: today,
        isSelfRegistered: true
      }));

      const updatedMain: Guest = {
        ...existing,
        status: 'confirmed',
        confirmationSource: 'guest',
        isLinkExpired: true,
        sweetMessage: sweetMessage || existing.sweetMessage,
        plusOnes: companionsList.length,
        companionNames: companionsList.length > 0 ? companionsList : undefined,
        companionGuestIds: newCompanionGuests.map(c => c.id),
        confirmedAt: today
      };

      const withoutOldCompanions = prev.filter(g => g.id !== guestId && g.parentGuestId !== guestId);
      return [updatedMain, ...newCompanionGuests, ...withoutOldCompanions];
    });
  };

  const declineGuestRsvp = (guestId: string, declinedMessage?: string) => {
    setGuests(prev => prev.map(g => g.id === guestId ? {
      ...g,
      status: 'declined' as const,
      declinedMessage: declinedMessage || g.declinedMessage
    } : g));
  };

  const updateInviteSettings = (data: {
    useCustomInvitePhoto: boolean;
    customInvitePhotoUrl?: string;
    receptionMessage?: string;
  }) => {
    setDebutante(prev => ({
      ...prev,
      useCustomInvitePhoto: data.useCustomInvitePhoto,
      customInvitePhotoUrl: data.customInvitePhotoUrl !== undefined ? data.customInvitePhotoUrl : prev.customInvitePhotoUrl,
      receptionMessage: data.receptionMessage !== undefined ? data.receptionMessage.slice(0, 300) : prev.receptionMessage,
    }));
  };

  // Claim a Benefit
  const claimBenefit = (benefitId: string) => {
    setBenefits(prev => 
      prev.map(b => b.id === benefitId ? {
        ...b,
        status: 'claimed',
        voucherCode: `CUPOM-${b.id.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
        claimedAt: new Date().toISOString().split('T')[0]
      } : b)
    );
  };

  // Claim a Milestone Reward (compatibility)
  const claimMilestoneReward = (milestoneId: string) => {
    setMilestones(prev =>
      prev.map(m => m.id === milestoneId ? {
        ...m,
        status: 'completed',
        badgeTag: 'CONCLUÍDO'
      } : m)
    );
  };

  /**
   * RESET (Rule 17 & 18):
   * ALWAYS resets to ZERO state:
   * submittedCount = 0, validatedCount = 0, pendingCount = 0, rejectedCount = 0, convertedReferralSales = 0
   * Resets cycle timer to fresh 7 days active.
   * NEVER restores mock data!
   */
  const resetState = () => {
    prevValidRef.current = 0;
    prevVipSalesRef.current = 0;
    prevCapacityRef.current = 250;

    const now = Date.now();
    const cycleSevenDays = now + 7 * 24 * 60 * 60 * 1000;
    const sixMonths = now + 180 * 24 * 60 * 60 * 1000;

    setDebutante({
      ...mockDebutante,
      validReferrals: 0,
      journeyProgressPercentage: 0,
      convertedReferralSales: 0,
      baseGuestLimit: 250,
      extraGuestsUnlocked: 0,
      currentGuestLimit: 250,
      journeyCycle: {
        journeyStartDate: new Date(now).toISOString(),
        journeyMaximumEndDate: new Date(sixMonths).toISOString(),
        currentCycleStartDate: new Date(now).toISOString(),
        currentCycleEndDate: new Date(cycleSevenDays).toISOString(),
        cycleRenewalTarget: 3,
        cycleRenewalProgress: 0,
        journeyStatus: 'active'
      }
    });
    setMilestones(calculateMilestones(mockMilestones, 0, 0));
    setReferrals([]);
    setBenefits(mockBenefits.map(b => ({ ...b, status: 'locked' as const })));
    setConvertedReferralSalesState(0);
    setVipRewards(calculateVipRewards(mockVipRewards, 0));
    setConquestMilestone(null);
    setConquestVipReward(null);
    setConquestCapacityReward(null);
    setCycleRenewalSuccess(false);
    setJourneySubTab('benefits');
  };

  // Optional Demo Loader (Rule 19: separate from reset!)
  const loadDemoData = () => {
    applyScenario('C');
    updateVipSales(2, true);
  };

  const validatedReferralsCount = referrals.filter(r => r.status === 'validated').length;
  const pendingReferralsCount = referrals.filter(r => r.status === 'pending').length;
  const sentReferralsCount = validatedReferralsCount + pendingReferralsCount;

  return (
    <AppStateContext.Provider value={{
      activeTab,
      setActiveTab,
      journeySubTab,
      setJourneySubTab,
      currentTheme,
      themes,
      switchTheme,
      debutante,
      milestones,
      referrals,
      guests,
      appointments,
      benefits,
      vipRewards,
      convertedReferralSales,
      pendingReferralsCount,
      validatedReferralsCount,
      sentReferralsCount,
      conquestMilestone,
      conquestVipReward,
      conquestCapacityReward,
      cycleRenewalSuccess,
      closeConquestModal: () => setConquestMilestone(null),
      closeConquestVipModal: () => setConquestVipReward(null),
      closeConquestCapacityModal: () => setConquestCapacityReward(null),
      closeCycleRenewalSuccessModal: () => setCycleRenewalSuccess(false),
      isReferralModalOpen,
      setIsReferralModalOpen,
      isSelfRegisterModalOpen,
      setIsSelfRegisterModalOpen,
      selectedInviteGuest,
      setSelectedInviteGuest,
      addReferral,
      validateReferral,
      rejectReferral,
      simulateAddValidReferral,
      simulateAddPendingReferral,
      simulateAddVipSale,
      setVipSalesCount,
      simulateExpireCycle,
      simulateExpire6Months,
      simulateResetCycleTimer,
      simulateSetCycleRemainingHours,
      simulateAddRenewalReferral,
      applyScenario,
      addGuest,
      updateGuest,
      deleteGuest,
      confirmGuestByDebutante,
      selfRegisterGuest,
      updateGuestStatus,
      confirmGuestRsvp,
      declineGuestRsvp,
      updateInviteSettings,
      claimBenefit,
      claimMilestoneReward,
      resetState,
      loadDemoData,
      isMobileFrame,
      toggleMobileFrame: () => setIsMobileFrame(prev => !prev)
    }}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};
