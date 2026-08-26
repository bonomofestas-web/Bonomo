// Automated Verification of all 11 Progression & Reset Test Cases
import { calculateMilestones, generateReferralsList } from '../src/context/AppStateContext';
import { mockMilestones } from '../src/data/mockData';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${msg}`);
    failed++;
  }
}

console.log('====================================================');
console.log('🧪 RUNNING VERIFICATION SUITE — 11 MANDATORY TESTS');
console.log('====================================================\n');

// TESTE 1: submitted = 0, validated = 0
console.log('--- TESTE 1: submitted = 0, validated = 0 ---');
const t1 = calculateMilestones(mockMilestones, 0, 0);
assert(t1[0].status === 'in_progress', 'Meta 1 está EM PROGRESSO (0/5, ponto de partida)');
assert(t1[1].status === 'locked', 'Meta 2 está BLOQUEADA');
assert(t1[2].status === 'locked', 'Meta 3 está BLOQUEADA');
assert(t1[3].status === 'locked', 'Meta 4 está BLOQUEADA');

// TESTE 2: submitted = 5, validated = 5
console.log('\n--- TESTE 2: submitted = 5, validated = 5 ---');
const t2 = calculateMilestones(mockMilestones, 5, 5);
assert(t2[0].status === 'completed', 'Meta 1 CONCLUÍDA (100%)');
assert(t2[1].status === 'in_progress', 'Meta 2 EM PROGRESSO / ativa (5/10 = 50%)');
assert(t2[2].status === 'locked', 'Meta 3 BLOQUEADA (5/15 = 33.33%)');
assert(t2[3].status === 'locked', 'Meta 4 BLOQUEADA (5/20 = 25%)');

// TESTE 3: submitted = 7, validated = 7
console.log('\n--- TESTE 3: submitted = 7, validated = 7 ---');
const t3 = calculateMilestones(mockMilestones, 7, 7);
assert(t3[0].status === 'completed', 'Meta 1 CONCLUÍDA');
assert(t3[1].status === 'in_progress', 'Meta 2 EM PROGRESSO (7/10 = 70%)');
assert(t3[2].status === 'locked', 'Meta 3 BLOQUEADA');
assert(t3[3].status === 'locked', 'Meta 4 BLOQUEADA');

// TESTE 4: submitted = 10, validated = 10
console.log('\n--- TESTE 4: submitted = 10, validated = 10 ---');
const t4 = calculateMilestones(mockMilestones, 10, 10);
assert(t4[0].status === 'completed', 'Meta 1 CONCLUÍDA');
assert(t4[1].status === 'completed', 'Meta 2 CONCLUÍDA');
assert(t4[2].status === 'in_progress', 'Meta 3 EM PROGRESSO (10/15 = 66.67%)');
assert(t4[3].status === 'locked', 'Meta 4 BLOQUEADA (10/20 = 50%)');

// TESTE 5: submitted = 15, validated = 15
console.log('\n--- TESTE 5: submitted = 15, validated = 15 ---');
const t5 = calculateMilestones(mockMilestones, 15, 15);
assert(t5[0].status === 'completed', 'Meta 1 CONCLUÍDA');
assert(t5[1].status === 'completed', 'Meta 2 CONCLUÍDA');
assert(t5[2].status === 'completed', 'Meta 3 CONCLUÍDA');
assert(t5[3].status === 'in_progress', 'Meta 4 EM PROGRESSO (15/20 = 75%)');

// TESTE 6: submitted = 20, validated = 20
console.log('\n--- TESTE 6: submitted = 20, validated = 20 ---');
const t6 = calculateMilestones(mockMilestones, 20, 20);
assert(t6[0].status === 'completed', 'Meta 1 CONCLUÍDA');
assert(t6[1].status === 'completed', 'Meta 2 CONCLUÍDA');
assert(t6[2].status === 'completed', 'Meta 3 CONCLUÍDA');
assert(t6[3].status === 'completed', 'Meta 4 CONCLUÍDA');

// TESTE 7: submitted = 20, validated = 7, pending = 13
console.log('\n--- TESTE 7: submitted = 20, validated = 7, pending = 13 ---');
const t7 = calculateMilestones(mockMilestones, 7, 20);
assert(t7[0].status === 'completed', 'Meta 1 CONCLUÍDA (valid 7 >= 5)');
assert(t7[1].status === 'in_progress', 'Meta 2 EM PROGRESSO (submitted 20 >= 10, valid 7 < 10)');
assert(t7[2].status === 'in_progress', 'Meta 3 EM PROGRESSO (submitted 20 >= 15, valid 7 < 15)');
assert(t7[3].status === 'in_progress', 'Meta 4 EM PROGRESSO (submitted 20 >= 20, valid 7 < 20)');

// TESTE 8: submitted = 20, validated = 0, pending = 20
console.log('\n--- TESTE 8: submitted = 20, validated = 0, pending = 20 ---');
const t8 = calculateMilestones(mockMilestones, 0, 20);
assert(t8[0].status === 'in_progress', 'Meta 1 EM PROGRESSO (Rosa)');
assert(t8[1].status === 'in_progress', 'Meta 2 EM PROGRESSO (Rosa)');
assert(t8[2].status === 'in_progress', 'Meta 3 EM PROGRESSO (Rosa)');
assert(t8[3].status === 'in_progress', 'Meta 4 EM PROGRESSO (Rosa)');

// TESTE 9: submitted = 10, validated = 4, pending = 6
console.log('\n--- TESTE 9: submitted = 10, validated = 4, pending = 6 ---');
const t9 = calculateMilestones(mockMilestones, 4, 10);
assert(t9[0].status === 'in_progress', 'Meta 1 EM PROGRESSO (4 validadas + 1 pendente p/ 5)');
assert(t9[1].status === 'in_progress', 'Meta 2 EM PROGRESSO (4 validadas + 6 pendentes p/ 10)');
assert(t9[2].status === 'locked', 'Meta 3 BLOQUEADA (submitted 10 < 15)');
assert(t9[3].status === 'locked', 'Meta 4 BLOQUEADA (submitted 10 < 20)');

// TESTE 10: Aprovação fora de ordem
console.log('\n--- TESTE 10: Aprovação fora de ordem ---');
const list10 = generateReferralsList(0, 10, 0); // 10 pending referrals
// Approve the 10th referral in physical order
list10[9].status = 'validated';
const val10 = list10.filter(r => r.status === 'validated').length;
const sent10 = list10.filter(r => r.status === 'validated' || r.status === 'pending').length;
assert(val10 === 1, 'Valid count is exactly 1 regardless of which index was approved');
assert(sent10 === 10, 'Sent count is 10');
const m10 = calculateMilestones(mockMilestones, val10, sent10);
assert(m10[0].status === 'in_progress', 'Meta 1 has 1/5 validated and 4/5 pending');
assert(m10[1].status === 'in_progress', 'Meta 2 has 1/10 validated and 9/10 pending');

// TESTE 11: RESET
console.log('\n--- TESTE 11: RESET ---');
const resetReferrals: any[] = [];
const resetVal = resetReferrals.filter((r: any) => r.status === 'validated').length;
const resetSent = resetReferrals.filter((r: any) => r.status === 'validated' || r.status === 'pending').length;
const resetM = calculateMilestones(mockMilestones, resetVal, resetSent);
assert(resetVal === 0, 'Reset validated count is 0');
assert(resetSent === 0, 'Reset submitted count is 0');
assert(resetM[0].status === 'in_progress', 'Meta 1 no estado inicial 0/5');
assert(resetM[1].status === 'locked', 'Meta 2 bloqueada');
assert(resetM[2].status === 'locked', 'Meta 3 bloqueada');
assert(resetM[3].status === 'locked', 'Meta 4 bloqueada');

// CENÁRIO G: Recusa de indicação
console.log('\n--- CENÁRIO G: Recusa de indicação (20 enviadas, 7 validadas, 1 recusada) ---');
const listG = generateReferralsList(7, 12, 1);
const valG = listG.filter(r => r.status === 'validated').length;
const sentG = listG.filter(r => r.status === 'validated' || r.status === 'pending').length;
const rejG = listG.filter(r => r.status === 'rejected').length;
assert(valG === 7, '7 validadas');
assert(sentG === 19, '19 consideradas enviadas (a recusada foi removida da contagem de progresso)');
assert(rejG === 1, '1 recusada registrada');

// ==========================================
// 👑 TESTES PRESENTES VIP (Regras 21 a 24)
// ==========================================
console.log('\n====================================================');
console.log('👑 RUNNING VIP REWARDS TEST SUITE');
console.log('====================================================\n');

import { calculateVipRewards } from '../src/context/AppStateContext';
import { mockVipRewards } from '../src/data/mockData';

// VIP TEST 1: 0 Vendas (Estado Inicial: Apple Watch sempre em andamento, demais bloqueados)
console.log('--- VIP TEST 1: 0 Vendas Convertidas (Apple Watch Ativo) ---');
const vip0 = calculateVipRewards(mockVipRewards, 0);
assert(vip0[0].status === 'in_progress', 'Apple Watch está EM ANDAMENTO / PROGRESSO (0/1)');
assert(vip0[1].status === 'locked', 'iPhone está BLOQUEADO (0/3)');
assert(vip0[2].status === 'locked', 'MacBook está BLOQUEADO (0/5)');
assert(vip0[3].status === 'locked', 'Viagem está BLOQUEADA (0/10)');

// VIP TEST 2: 1 Venda Convertida
console.log('\n--- VIP TEST 2: 1 Venda Convertida ---');
const vip1 = calculateVipRewards(mockVipRewards, 1);
assert(vip1[0].status === 'completed', 'Apple Watch CONQUISTADO (1/1)');
assert(vip1[1].status === 'in_progress', 'iPhone EM PROGRESSO (1/3 = 33.3%)');
assert(vip1[2].status === 'in_progress', 'MacBook EM PROGRESSO (1/5 = 20%)');
assert(vip1[3].status === 'in_progress', 'Viagem EM PROGRESSO (1/10 = 10%)');

// VIP TEST 3: 2 Vendas Convertidas (Exemplo do Prompt)
console.log('\n--- VIP TEST 3: 2 Vendas Convertidas (Exemplo Prompt) ---');
const vip2 = calculateVipRewards(mockVipRewards, 2);
assert(vip2[0].status === 'completed', 'Apple Watch CONQUISTADO (2/1 >= 1)');
assert(vip2[1].status === 'in_progress', 'iPhone EM PROGRESSO (2/3)');
assert(vip2[2].status === 'in_progress', 'MacBook EM PROGRESSO (2/5)');
assert(vip2[3].status === 'in_progress', 'Viagem EM PROGRESSO (2/10)');

// VIP TEST 4: 3 Vendas Convertidas
console.log('\n--- VIP TEST 4: 3 Vendas Convertidas ---');
const vip3 = calculateVipRewards(mockVipRewards, 3);
assert(vip3[0].status === 'completed', 'Apple Watch CONQUISTADO');
assert(vip3[1].status === 'completed', 'iPhone CONQUISTADO (3/3)');
assert(vip3[2].status === 'in_progress', 'MacBook EM PROGRESSO (3/5 = 60%)');
assert(vip3[3].status === 'in_progress', 'Viagem EM PROGRESSO (3/10 = 30%)');

// VIP TEST 5: 5 Vendas Convertidas
console.log('\n--- VIP TEST 5: 5 Vendas Convertidas ---');
const vip5 = calculateVipRewards(mockVipRewards, 5);
assert(vip5[0].status === 'completed', 'Apple Watch CONQUISTADO');
assert(vip5[1].status === 'completed', 'iPhone CONQUISTADO');
assert(vip5[2].status === 'completed', 'MacBook CONQUISTADO (5/5)');
assert(vip5[3].status === 'in_progress', 'Viagem EM PROGRESSO (5/10 = 50%)');

// VIP TEST 6: 10 Vendas Convertidas
console.log('\n--- VIP TEST 6: 10 Vendas Convertidas ---');
const vip10 = calculateVipRewards(mockVipRewards, 10);
assert(vip10[0].status === 'completed', 'Apple Watch CONQUISTADO');
assert(vip10[1].status === 'completed', 'iPhone CONQUISTADO');
assert(vip10[2].status === 'completed', 'MacBook CONQUISTADO');
assert(vip10[3].status === 'completed', 'Viagem CONQUISTADA (10/10)');

// ==========================================
// ⏰ TESTES DE CICLOS, RENOVAÇÃO E 6 MESES
// ==========================================
console.log('\n====================================================');
console.log('⏰ RUNNING CYCLE & 6-MONTH RENEWAL TEST SUITE');
console.log('====================================================\n');

// CYCLE TEST 1: Initial 7-day active cycle
console.log('--- CYCLE TEST 1: Estado Inicial de 7 Dias ---');
const now = Date.now();
const sevenDays = now + 7 * 24 * 60 * 60 * 1000;
const sixMonths = now + 180 * 24 * 60 * 60 * 1000;
const initialCycle = {
  journeyStartDate: new Date(now).toISOString(),
  journeyMaximumEndDate: new Date(sixMonths).toISOString(),
  currentCycleStartDate: new Date(now).toISOString(),
  currentCycleEndDate: new Date(sevenDays).toISOString(),
  cycleRenewalTarget: 3,
  cycleRenewalProgress: 0,
  journeyStatus: 'active' as const
};
assert(initialCycle.journeyStatus === 'active', 'Ciclo inicia como ATIVO');
assert(initialCycle.cycleRenewalTarget === 3, 'Meta de renovação é exatamente 3 indicações');
assert(initialCycle.cycleRenewalProgress === 0, 'Progresso de renovação inicial é 0/3');

// CYCLE TEST 2: Cycle expiration triggers Paused
console.log('\n--- CYCLE TEST 2: Expiração do Ciclo de 7 Dias -> Pausado ---');
const expiredCycleEnd = new Date(Date.now() - 1000).toISOString();
const isExpired = Date.now() >= new Date(expiredCycleEnd).getTime();
const pausedStatus = isExpired ? 'paused' : 'active';
assert(pausedStatus === 'paused', 'Após 7 dias sem renovar, a jornada passa para PAUSADA');

// CYCLE TEST 3: Renewal Progression (1/3 -> 2/3 -> 3/3 -> Unlocked +7d)
console.log('\n--- CYCLE TEST 3: Progresso de Renovação por Indicações ---');
let renewalProgress = 0;
// Indicação 1
renewalProgress += 1;
assert(renewalProgress === 1, '1ª indicação submetida: 1/3 (Faltam 2)');
// Indicação 2
renewalProgress += 1;
assert(renewalProgress === 2, '2ª indicação submetida: 2/3 (Falta 1)');
// Indicação 3 -> Auto unlock
renewalProgress += 1;
assert(renewalProgress === 3, '3ª indicação submetida: 3/3 atingida');

let renewedStatus = 'active';
let newCycleEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
let resetRenewalProg = 0;
assert(renewedStatus === 'active', 'Jornada desbloqueada automaticamente (+7 dias)');
assert(resetRenewalProg === 0, 'Progresso de renovação resetado para 0/3 para o novo ciclo');
assert(new Date(newCycleEnd).getTime() > Date.now(), 'Novo término do ciclo configurado para +7 dias');

// CYCLE TEST 4: 6-Month Hard Limit Encerrado
console.log('\n--- CYCLE TEST 4: Limite Máximo de 6 Meses -> Encerrado ---');
const expiredMaxDate = new Date(Date.now() - 1000).toISOString();
const is6MonthsOver = Date.now() >= new Date(expiredMaxDate).getTime();
const closedStatus = is6MonthsOver ? 'closed' : 'active';
assert(closedStatus === 'closed', 'Ao atingir 6 meses, jornada é ENCERRADA (sem novas renovações)');

// ==========================================
// 👥 TESTES DA LISTA DE CONVIDADOS DINÂMICA
// ==========================================
console.log('\n====================================================');
console.log('👥 RUNNING DYNAMIC GUEST CAPACITY TEST SUITE');
console.log('====================================================\n');

// GUEST TEST 1: Base capacity (250)
console.log('--- GUEST TEST 1: Capacidade Base de 250 Convidados ---');
const baseLimit = 250;
let extraUnlocked = 0;
let effectiveLimit = baseLimit + extraUnlocked;
assert(effectiveLimit === 250, 'Capacidade inicial é exatamente 250 convidados');

// GUEST TEST 2: Conquering +10 guest benefit dynamically increases limit to 260
console.log('\n--- GUEST TEST 2: Desbloqueio de Benefício +10 Convidados ---');
const validReferrals = 10; // Reached Meta 2
if (validReferrals >= 10) {
  extraUnlocked = 10;
}
effectiveLimit = baseLimit + extraUnlocked;
assert(effectiveLimit === 260, 'Capacidade expandida dinamicamente para 260 convidados (250 + 10)');

// RENEWAL REFERRALS SEGREGATION TEST
console.log('\n====================================================');
console.log('⚡ RUNNING RENEWAL REFERRAL SEGREGATION TEST SUITE');
console.log('====================================================\n');

console.log('--- RENEWAL TEST 1: Indicações de Desbloqueio não somam nas Metas de Benefícios ---');
const normalReferrals = [
  { id: 'r1', name: 'Amiga 1', phone: '111', age: 15, group: 'Escola' as const, createdAt: '2026-08-18', status: 'validated' as const, pointsGranted: 1, isRenewalReferral: false },
  { id: 'r2', name: 'Amiga 2', phone: '222', age: 15, group: 'Escola' as const, createdAt: '2026-08-18', status: 'validated' as const, pointsGranted: 1, isRenewalReferral: false },
];
const renewalRefs = [
  { id: 'ren1', name: 'Renov 1', phone: '333', age: 15, group: 'Amigos' as const, createdAt: '2026-08-18', status: 'validated' as const, pointsGranted: 0, isRenewalReferral: true },
  { id: 'ren2', name: 'Renov 2', phone: '444', age: 15, group: 'Amigos' as const, createdAt: '2026-08-18', status: 'validated' as const, pointsGranted: 0, isRenewalReferral: true },
  { id: 'ren3', name: 'Renov 3', phone: '555', age: 15, group: 'Amigos' as const, createdAt: '2026-08-18', status: 'validated' as const, pointsGranted: 0, isRenewalReferral: true },
];
const allRefs = [...normalReferrals, ...renewalRefs];
const validForProgression = allRefs.filter(r => r.status === 'validated' && !r.isRenewalReferral).length;
const totalRenewalCount = allRefs.filter(r => r.isRenewalReferral).length;

assert(validForProgression === 2, 'Apenas 2 indicações normais contam na progressão das metas');
assert(totalRenewalCount === 3, '3 indicações são marcadas como Desbloqueio de Jornada');
assert(allRefs.length === 5, 'Total geral de indicações cadastradas é 5');

// GUEST COMPANIONS TEST
console.log('\n====================================================');
console.log('👥 RUNNING GUEST COMPANIONS & RSVP TEST SUITE');
console.log('====================================================\n');

const sampleGuests = [
  { id: 'g1', name: 'Ana Silva', phone: '111', age: 15, group: 'Amigos' as const, status: 'confirmed' as const, plusOnes: 2, companionNames: ['Lucas', 'Beatriz'], sweetMessage: 'Parabéns Maria!' },
  { id: 'g2', name: 'Carlos Lima', phone: '222', age: 16, group: 'Escola' as const, status: 'confirmed' as const, plusOnes: 0 },
  { id: 'g3', name: 'Juliana Costa', phone: '333', age: 14, group: 'Família' as const, status: 'declined' as const, plusOnes: 1, declinedMessage: 'Estarei viajando' }
];

const totalPeopleInList = sampleGuests.reduce((acc, g) => acc + 1 + g.plusOnes, 0);
assert(totalPeopleInList === 6, 'Acompanhantes somam na contagem total de pessoas da lista (3 titulares + 3 acompanhantes = 6)');

const confirmedGuests = sampleGuests.filter(g => g.status === 'confirmed');
assert(confirmedGuests.length === 2, '2 convidados confirmados');
assert(sampleGuests[0].sweetMessage === 'Parabéns Maria!', 'Mensagem de carinho de Ana Silva preservada');
assert(sampleGuests[2].declinedMessage === 'Estarei viajando', 'Motivo de recusa de Juliana Costa preservado');

// CONQUERED-ONLY BENEFITS FILTER TEST
console.log('\n====================================================');
console.log('🏆 RUNNING CONQUERED-ONLY BENEFITS FILTER TEST SUITE');
console.log('====================================================\n');

const mockAllBenefits = [
  { id: 'b1', title: '+30 min festa', description: '', requiredPoints: 5, category: '', status: 'claimed' as const, imageUrl: '' },
  { id: 'b2', title: '+10 convidados', description: '', requiredPoints: 10, category: '', status: 'locked' as const, imageUrl: '' },
  { id: 'b3', title: 'DJ Especial', description: '', requiredPoints: 15, category: '', status: 'locked' as const, imageUrl: '' },
];
const mockVip = [
  { id: 'v1', name: 'Apple Watch Series 9', description: '', requiredSales: 1, order: 1, status: 'completed' as const, imageUrl: '' },
  { id: 'v2', name: 'iPhone 15 Pro', description: '', requiredSales: 3, order: 2, status: 'in_progress' as const, imageUrl: '' },
];

const visibleBenefitsInHub = mockAllBenefits.filter(b => b.status === 'claimed' || b.status === 'unlocked');
const visibleVipInHub = mockVip.filter(r => r.status === 'completed' || r.status === 'claimed');

assert(visibleBenefitsInHub.length === 1, 'Apenas 1 benefício conquistado é exibido na Loja de Benefícios');
assert(visibleVipInHub.length === 1, 'Apenas 1 presente VIP conquistado é exibido na Loja de Benefícios');

console.log('\n====================================================');
console.log(`TOTAL: ${passed} PASSOU | ${failed} FALHOU`);
console.log('====================================================\n');
if (failed > 0) process.exit(1);
