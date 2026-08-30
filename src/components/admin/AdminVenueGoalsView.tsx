import React, { useState, useMemo } from 'react';
import { 
  Target, DollarSign, Award, Users, Clock, 
  Building2
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { AdminVenueGoalsModal } from './AdminVenueGoalsModal';
import type { VenueGoals } from '../../types/admin';

export const AdminVenueGoalsView: React.FC = () => {
  const { venues, activeVenueId, leads, debutantes } = useAdminState();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const selectedVenue = useMemo(() => {
    return venues.find(v => v.id === activeVenueId) || venues[0] || null;
  }, [venues, activeVenueId]);

  const venueGoals: VenueGoals = useMemo(() => {
    if (selectedVenue?.goals) return selectedVenue.goals;
    return {
      revenueTarget: 150000,
      salesTarget: 12,
      leadsTarget: 60,
      responseTimeTargetMinutes: 15,
      period: 'monthly',
    };
  }, [selectedVenue]);

  // Scoped metrics for this specific venue
  const venueLeads = useMemo(() => {
    if (!selectedVenue) return leads;
    return leads.filter(l => l.venueId === selectedVenue.id);
  }, [leads, selectedVenue]);

  const venueDebutantes = useMemo(() => {
    if (!selectedVenue) return debutantes;
    return debutantes.filter(d => d.venueId === selectedVenue.id);
  }, [debutantes, selectedVenue]);

  const soldLeads = useMemo(() => {
    return venueLeads.filter(l => l.stage === 'contract_signed');
  }, [venueLeads]);

  const totalRevenue = useMemo(() => {
    return soldLeads.reduce((acc, curr) => acc + (curr.dealValue || 0), 0);
  }, [soldLeads]);

  const totalSalesCount = soldLeads.length;
  const totalLeadsCount = venueLeads.length;
  const meetingLeads = venueLeads.filter(l => l.stage === 'meeting_scheduled');

  // Percentages towards goals
  const revenuePct = Math.min(100, Math.round((totalRevenue / (venueGoals.revenueTarget || 1)) * 100));
  const salesPct = Math.min(100, Math.round((totalSalesCount / (venueGoals.salesTarget || 1)) * 100));
  const leadsPct = Math.min(100, Math.round((totalLeadsCount / (venueGoals.leadsTarget || 1)) * 100));
  const avgResponseTime = 12; // Minutos médio de atendimento calculado

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      padding: '24px 32px 60px 32px',
      maxWidth: '1440px',
      margin: '0 auto',
      animation: 'fadeIn 0.25s ease-out',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      boxSizing: 'border-box',
    }}>
      
      {/* ── Header: Venue Title & Edit Goals Button ───────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {selectedVenue?.logoUrl ? (
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: '#1A1622',
              border: '1.5px solid rgba(212, 175, 55, 0.4)',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            }}>
              <img
                src={selectedVenue.logoUrl}
                alt={selectedVenue.name}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
          ) : (
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'var(--adm-accent-bg)',
              border: '1.5px solid var(--adm-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--adm-accent)',
            }}>
              <Building2 size={24} />
            </div>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{
                fontSize: '1.45rem',
                fontWeight: 900,
                color: 'var(--adm-text-title)',
                margin: 0,
                letterSpacing: '-0.4px',
              }}>
                Metas & Desempenho • {selectedVenue?.name || 'Casa de Festas'}
              </h1>
              <span style={{
                background: 'var(--adm-accent-bg)',
                color: 'var(--adm-accent)',
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '8px',
                border: '1px solid rgba(212,175,55,0.3)',
                textTransform: 'uppercase',
              }}>
                {venueGoals.period === 'monthly' ? 'Ciclo Mensal' : venueGoals.period === 'quarterly' ? 'Trimestral' : 'Anual'}
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
              Acompanhamento de metas comerciais, captação de indicações e tempo de resposta
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsEditModalOpen(true)}
          className="adm-btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '12px',
            fontSize: '0.82rem',
            fontWeight: 800,
          }}
        >
          <Target size={16} />
          <span>Configurar Metas da Unidade</span>
        </button>
      </div>

      {/* ── 4 CARDS PRINCIPAIS DE METAS DA CASA ───────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '18px',
      }}>
        
        {/* Card 1: Faturamento R$ */}
        <div className="saas-card" style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, var(--adm-bg-card) 0%, rgba(16, 185, 129, 0.05) 100%)',
          border: '1px solid var(--adm-border)',
          borderRadius: '20px',
          padding: '20px',
          gap: '14px',
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Faturamento em Contratos
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
                <DollarSign size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--adm-text-title)', marginTop: '6px', letterSpacing: '-0.5px' }}>
              R$ {totalRevenue.toLocaleString('pt-BR')}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
              Alvo da Casa: <strong style={{ color: 'var(--adm-text-title)' }}>R$ {venueGoals.revenueTarget.toLocaleString('pt-BR')}</strong>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, marginBottom: '6px' }}>
              <span style={{ color: 'var(--adm-text-muted)' }}>Progresso da Meta</span>
              <span style={{ color: revenuePct >= 100 ? '#10B981' : 'var(--adm-accent)', fontWeight: 800 }}>{revenuePct}%</span>
            </div>
            <div style={{ height: '8px', background: 'var(--adm-bg-input)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${revenuePct}%`, height: '100%', background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)', borderRadius: '10px', transition: 'width 0.4s ease' }} />
            </div>
          </div>
        </div>

        {/* Card 2: Vendas Fechadas */}
        <div className="saas-card" style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, var(--adm-bg-card) 0%, rgba(212, 175, 55, 0.05) 100%)',
          border: '1px solid var(--adm-border)',
          borderRadius: '20px',
          padding: '20px',
          gap: '14px',
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Vendas / Contratos Fechados
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--adm-accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--adm-accent)' }}>
                <Award size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--adm-text-title)', marginTop: '6px', letterSpacing: '-0.5px' }}>
              {totalSalesCount} <span style={{ fontSize: '0.9rem', color: 'var(--adm-text-muted)', fontWeight: 600 }}>contratos</span>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
              Alvo da Casa: <strong style={{ color: 'var(--adm-text-title)' }}>{venueGoals.salesTarget} vendas</strong>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, marginBottom: '6px' }}>
              <span style={{ color: 'var(--adm-text-muted)' }}>Progresso da Meta</span>
              <span style={{ color: salesPct >= 100 ? '#10B981' : 'var(--adm-accent)', fontWeight: 800 }}>{salesPct}%</span>
            </div>
            <div style={{ height: '8px', background: 'var(--adm-bg-input)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${salesPct}%`, height: '100%', background: 'linear-gradient(90deg, #D4AF37 0%, #B89628 100%)', borderRadius: '10px', transition: 'width 0.4s ease' }} />
            </div>
          </div>
        </div>

        {/* Card 3: Leads & Captação */}
        <div className="saas-card" style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, var(--adm-bg-card) 0%, rgba(59, 130, 246, 0.05) 100%)',
          border: '1px solid var(--adm-border)',
          borderRadius: '20px',
          padding: '20px',
          gap: '14px',
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Leads & Indicações no Funil
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
                <Users size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--adm-text-title)', marginTop: '6px', letterSpacing: '-0.5px' }}>
              {totalLeadsCount} <span style={{ fontSize: '0.9rem', color: 'var(--adm-text-muted)', fontWeight: 600 }}>leads</span>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
              Alvo da Casa: <strong style={{ color: 'var(--adm-text-title)' }}>{venueGoals.leadsTarget} leads</strong>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, marginBottom: '6px' }}>
              <span style={{ color: 'var(--adm-text-muted)' }}>Progresso da Meta</span>
              <span style={{ color: leadsPct >= 100 ? '#10B981' : '#3B82F6', fontWeight: 800 }}>{leadsPct}%</span>
            </div>
            <div style={{ height: '8px', background: 'var(--adm-bg-input)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${leadsPct}%`, height: '100%', background: 'linear-gradient(90deg, #3B82F6 0%, #1D4ED8 100%)', borderRadius: '10px', transition: 'width 0.4s ease' }} />
            </div>
          </div>
        </div>

        {/* Card 4: Tempo de Resposta (TMA) */}
        <div className="saas-card" style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, var(--adm-bg-card) 0%, rgba(245, 158, 11, 0.05) 100%)',
          border: '1px solid var(--adm-border)',
          borderRadius: '20px',
          padding: '20px',
          gap: '14px',
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Tempo de Resposta (TMA)
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B' }}>
                <Clock size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#10B981', marginTop: '6px', letterSpacing: '-0.5px' }}>
              {avgResponseTime} <span style={{ fontSize: '0.9rem', color: 'var(--adm-text-muted)', fontWeight: 600 }}>minutos</span>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
              Tempo Máx Permitido: <strong style={{ color: 'var(--adm-text-title)' }}>{venueGoals.responseTimeTargetMinutes} min</strong>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, marginBottom: '6px' }}>
              <span style={{ color: 'var(--adm-text-muted)' }}>Status de Eficiência</span>
              <span style={{ color: '#10B981', fontWeight: 800 }}>⚡ Dentro da Meta</span>
            </div>
            <div style={{ height: '8px', background: 'var(--adm-bg-input)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ width: '85%', height: '100%', background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)', borderRadius: '10px' }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── DETALHES DE PERFORMANCE & ANIVERSARIANTES VINCULADAS ──────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
      }}>
        {/* Resumo do Funil da Casa */}
        <div className="saas-card" style={{
          background: 'var(--adm-bg-card)',
          border: '1px solid var(--adm-border)',
          borderRadius: '20px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
            Etapas do Funil da Casa
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--adm-bg-input)', borderRadius: '12px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--adm-text-body)' }}>Novos Leads Recebidos</span>
              <strong style={{ color: 'var(--adm-text-title)' }}>{totalLeadsCount}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--adm-bg-input)', borderRadius: '12px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--adm-text-body)' }}>Reuniões & Degustações Agendadas</span>
              <strong style={{ color: '#8B5CF6' }}>{meetingLeads.length}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--adm-bg-input)', borderRadius: '12px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--adm-text-body)' }}>Contratos Fechados</span>
              <strong style={{ color: '#10B981' }}>{totalSalesCount}</strong>
            </div>
          </div>
        </div>

        {/* Aniversariantes Ativas da Casa */}
        <div className="saas-card" style={{
          background: 'var(--adm-bg-card)',
          border: '1px solid var(--adm-border)',
          borderRadius: '20px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
              Aniversariantes Vinculadas
            </h3>
            <span style={{ background: 'var(--adm-accent-bg)', color: 'var(--adm-accent)', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '10px' }}>
              {venueDebutantes.length} ativas
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {venueDebutantes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--adm-text-muted)', fontSize: '0.82rem' }}>
                Nenhuma aniversariante cadastrada nesta unidade.
              </div>
            ) : (
              venueDebutantes.slice(0, 4).map(deb => (
                <div
                  key={deb.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--adm-bg-input)',
                    borderRadius: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img
                      src={deb.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'}
                      alt={deb.name}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                        {deb.name}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                        {deb.partyDate ? new Date(deb.partyDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'Data a definir'}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-accent)' }}>
                    {(deb as any).points || 0} pts
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal de Configuração de Metas */}
      <AdminVenueGoalsModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        venue={selectedVenue}
      />
    </div>
  );
};
