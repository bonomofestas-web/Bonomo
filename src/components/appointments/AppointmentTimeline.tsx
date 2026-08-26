import React, { useState } from 'react';
import { Calendar, Filter } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { AppointmentCard } from './AppointmentCard';

export const AppointmentTimeline: React.FC = () => {
  const { appointments } = useAppState();
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

  const categories = ['Todas', 'Buffet & Degustação', 'Vestido de Gala', 'Ensaio Fotográfico', 'Maquiagem & Cabelo', 'Decoração & Flores'];

  const filteredAppointments = selectedCategory === 'Todas'
    ? appointments
    : appointments.filter(a => a.category === selectedCategory);

  return (
    <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
      {/* ── 1. Universal Top Header (Icon + Title + Subtitle) ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '20px',
      }}>
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          aspectRatio: '1 / 1',
          flexShrink: 0,
          background: 'rgba(212, 175, 55, 0.15)',
          border: '1.5px solid rgba(212, 175, 55, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 16px rgba(212, 175, 55, 0.25)',
        }}>
          <Calendar size={24} color="#D4AF37" />
        </div>

        <div>
          <h1 style={{
            fontSize: 'clamp(1.4rem, 4vw, 1.9rem)',
            fontWeight: 800,
            color: '#FFFFFF',
            margin: '0 0 4px 0',
            fontFamily: 'Poppins, sans-serif',
            letterSpacing: '-0.3px',
          }}>
            Compromissos
          </h1>
          <p style={{
            color: '#B5AFA4',
            fontSize: '0.84rem',
            margin: 0,
            fontFamily: "'Montserrat', sans-serif",
            lineHeight: 1.35,
          }}>
            Acompanhe as datas e horários dos compromissos oficiais da sua festa
          </p>
        </div>
      </div>

      {/* ── 2. Category Filters (Invisible Scrollbar, Touch-Swipe) ── */}
      <div 
        className="hide-scrollbar" 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          marginBottom: '20px', 
          overflowX: 'auto', 
          width: '100%', 
          padding: '4px 0 6px 0',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <Filter size={14} color="#D4AF37" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.76rem', color: '#D4AF37', fontWeight: 800, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: "'Cinzel', serif" }}>Categoria:</span>
        {categories.map(cat => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                background: isSelected ? 'linear-gradient(135deg, #D4AF37 0%, #AA7C11 100%)' : '#141414',
                color: isSelected ? '#000000' : '#E0DACD',
                border: isSelected ? '1px solid #FFFFFF' : '1px solid rgba(212, 175, 55, 0.25)',
                padding: '6px 16px',
                borderRadius: '20px',
                fontWeight: isSelected ? 800 : 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: isSelected ? '0 2px 10px rgba(212, 175, 55, 0.35)' : 'none',
                transition: 'all 0.2s ease',
                flexShrink: 0,
                lineHeight: 1.2,
                fontFamily: "'Montserrat', sans-serif",
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* ── 3. Timeline List ── */}
      {filteredAppointments.length === 0 ? (
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(212, 175, 55, 0.2)',
          borderRadius: '16px',
          padding: '48px 24px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          animation: 'fadeIn 0.2s ease-out',
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(212, 175, 55, 0.1)',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#D4AF37',
          }}>
            <Calendar size={28} />
          </div>
          <div>
            <h3 style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: '#FFFFFF',
              margin: '0 0 6px 0',
              fontFamily: 'Poppins, sans-serif',
            }}>
              Ainda não foram definidos compromissos para você
            </h3>
            <p style={{
              fontSize: '0.82rem',
              color: '#B5AFA4',
              margin: 0,
              maxWidth: '380px',
              lineHeight: 1.4,
              fontFamily: "'Montserrat', sans-serif",
            }}>
              Assim que sua assessoria ou casa de festas agendar degustações, ensaios ou reuniões, eles aparecerão detalhados aqui com datas e horários.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredAppointments.map((app, index) => (
            <AppointmentCard
              key={app.id}
              appointment={app}
              isNext={index === 0 && selectedCategory === 'Todas'}
            />
          ))}
        </div>
      )}
    </div>
  );
};
