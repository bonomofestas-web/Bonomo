import type { VenueTheme, DebutanteProfile, Milestone, Referral, Guest, Appointment, Benefit, VipReward } from '../types';

export const mockThemes: VenueTheme[] = [
  {
    id: 'rio_lounge',
    name: 'Espaço Rio Lounge',
    tagline: 'Onde momentos exclusivos se transformam em memórias inesquecíveis',
    logoUrl: '/logo_riio_lounge.png',
    primaryColor: '#FF4D8D', // Radiant Pink Accent
    secondaryColor: '#E8B4B8', // Soft Rose Gold
    accentColor: '#F59E0B', // Champagne Gold
    glowColor: 'rgba(255, 77, 141, 0.4)',
    bgDark: '#0B0512', // Midnight Plum Deep
    bgCard: 'rgba(22, 11, 30, 0.85)',
    fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
  },
  {
    id: 'palacio_roseiras',
    name: 'Palácio das Roseiras',
    tagline: 'Elegância clássica e jardins mágicos para seus 15 anos',
    primaryColor: '#F59E0B', // Champagne Gold
    secondaryColor: '#FDE68A', // Warm Light Gold
    accentColor: '#10B981', // Emerald Accent
    glowColor: 'rgba(245, 158, 11, 0.35)',
    bgDark: '#061613', // Deep Emerald Dark
    bgCard: 'rgba(15, 38, 33, 0.85)',
    fontFamily: "'Playfair Display', 'Plus Jakarta Sans', sans-serif",
  },
  {
    id: 'castelo_crystal',
    name: 'Castelo Crystal',
    tagline: 'A celebração dos seus 15 anos digna de uma verdadeira rainha',
    primaryColor: '#A78BFA', // Electric Violet / Lavender
    secondaryColor: '#DDD6FE', // Soft Diamond Sparkle
    accentColor: '#F43F5E', // Glowing Coral Rose
    glowColor: 'rgba(167, 139, 250, 0.35)',
    bgDark: '#08091A', // Deep Sapphire Blue
    bgCard: 'rgba(20, 23, 50, 0.85)',
    fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
  }
];

const initialStart = new Date().toISOString();
const initialCycleEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const initialMaxEnd = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();

export const mockDebutante: DebutanteProfile = {
  id: 'deb_maria_01',
  name: 'Maria Eduarda',
  partyDate: '2027-04-18',
  partyDaysLeft: 245,
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  receptionMessage: 'É com muita alegria que convidamos você para celebrar esse momento tão especial na vida da Maria Eduarda. Esperamos você para tornar essa noite ainda mais inesquecível!',
  validReferrals: 0,
  totalTargetReferrals: 30,
  journeyProgressPercentage: 0,
  convertedReferralSales: 0,
  baseGuestLimit: 250,
  extraGuestsUnlocked: 0,
  currentGuestLimit: 250,
  journeyCycle: {
    journeyStartDate: initialStart,
    journeyMaximumEndDate: initialMaxEnd,
    currentCycleStartDate: initialStart,
    currentCycleEndDate: initialCycleEnd,
    cycleRenewalTarget: 3,
    cycleRenewalProgress: 0,
    journeyStatus: 'active'
  },
  venueId: 'villa_diamond',
};

export const mockMilestones: Milestone[] = [];

export const mockReferrals: Referral[] = [];

export const mockGuests: Guest[] = [];

export const mockAppointments: Appointment[] = [];

export const mockBenefits: Benefit[] = [];

export const mockVipRewards: VipReward[] = [];

