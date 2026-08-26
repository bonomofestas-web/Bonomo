import React from 'react';
import { Calendar, MapPin, UserCheck } from 'lucide-react';
import type { Appointment } from '../../types';

interface AppointmentCardProps {
  appointment: Appointment;
  isNext: boolean;
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment, isNext }) => {
  const isConfirmed = appointment.status === 'confirmed';

  return (
    <div 
      className="appointment-card-wrapper"
      style={{
        marginBottom: '16px',
        border: isNext ? '1.5px solid #D4AF37' : '1px solid rgba(212, 175, 55, 0.22)',
        background: isNext 
          ? 'linear-gradient(135deg, #181410 0%, #0E0E0E 100%)'
          : 'linear-gradient(135deg, #141414 0%, #0E0E0E 100%)',
        borderRadius: '20px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isNext 
          ? '0 8px 24px rgba(0,0,0,0.7), 0 0 16px rgba(212,175,55,0.18)' 
          : '0 4px 16px rgba(0,0,0,0.5)',
        transition: 'transform 0.15s ease, border-color 0.2s ease',
      }}
    >
      {isNext && (
        <div style={{
          position: 'absolute',
          top: '0',
          right: '0',
          background: 'linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA7C11 100%)',
          color: '#000000',
          padding: '4px 14px',
          borderBottomLeftRadius: '12px',
          fontSize: '0.68rem',
          fontWeight: 800,
          letterSpacing: '1px',
          fontFamily: "'Cinzel', serif",
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}>
          PRÓXIMO COMPROMISSO
        </div>
      )}

      <div className="appointment-card-grid">
        {/* Date Box Badge */}
        <div className="appointment-date-box" style={{
          background: '#181818',
          border: '1.5px solid rgba(212, 175, 55, 0.35)',
          borderRadius: '16px',
          padding: '14px 12px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          <Calendar size={18} color="#D4AF37" style={{ marginBottom: '3px' }} />
          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', fontFamily: "'Cinzel', serif" }}>
            {appointment.date.split('-')[2]}/{appointment.date.split('-')[1]}
          </span>
          <span style={{ fontSize: '0.74rem', color: '#E8C98D', fontWeight: 700, fontFamily: "'Montserrat', sans-serif" }}>
            {appointment.time} h
          </span>
        </div>

        {/* Info */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <span className="badge" style={{ 
              background: 'rgba(212, 175, 55, 0.15)', 
              color: '#E8C98D', 
              border: '1px solid rgba(212, 175, 55, 0.35)',
              fontSize: '0.68rem', 
              padding: '3px 10px',
              fontFamily: "'Cinzel', serif",
            }}>
              {appointment.category}
            </span>
            <span style={{ 
              fontSize: '0.78rem', 
              color: isConfirmed ? '#34D399' : '#E8C98D', 
              fontWeight: 700,
              fontFamily: "'Montserrat', sans-serif",
            }}>
              {isConfirmed ? '✓ Confirmado' : '⏳ Agendado'}
            </span>
          </div>

          <h3 style={{ 
            fontSize: '1.15rem', 
            fontWeight: 800, 
            marginBottom: '5px',
            color: '#FFFFFF',
            fontFamily: "'Montserrat', sans-serif",
          }}>
            {appointment.title}
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.82rem', color: '#B5AFA4', flexWrap: 'wrap', marginBottom: '6px', fontFamily: "'Montserrat', sans-serif" }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={13} color="#D4AF37" /> {appointment.location}
            </span>
            {appointment.address && (
              <span style={{ color: '#888', fontSize: '0.75rem' }}>
                ({appointment.address})
              </span>
            )}
          </div>

          {appointment.responsibleName && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(212, 175, 55, 0.12)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              borderRadius: '8px',
              padding: '4px 10px',
              fontSize: '0.74rem',
              color: '#F5E6BE',
              marginTop: '4px',
              marginBottom: '4px',
              fontFamily: "'Montserrat', sans-serif",
            }}>
              <UserCheck size={13} color="#D4AF37" />
              <span>Responsável: <strong style={{ color: '#FFD700' }}>{appointment.responsibleName}</strong> ({appointment.responsibleRole || 'Equipe'}{appointment.responsiblePhone ? ` • ${appointment.responsiblePhone}` : ''})</span>
            </div>
          )}

          {appointment.notes && (
            <p style={{
              fontSize: '0.78rem',
              color: '#E8C98D',
              background: '#1A1814',
              padding: '8px 12px',
              borderRadius: '10px',
              borderLeft: '3px solid #D4AF37',
              margin: '6px 0 0 0',
              fontFamily: "'Montserrat', sans-serif",
            }}>
              💡 {appointment.notes}
            </p>
          )}
        </div>
      </div>

      <style>{`
        .appointment-card-wrapper {
          padding: 20px 24px;
        }

        .appointment-card-grid {
          display: grid;
          grid-template-columns: 110px 1fr;
          gap: 20px;
          align-items: center;
        }

        @media (max-width: 600px) {
          .appointment-card-wrapper {
            padding: 16px 16px !important;
          }

          .appointment-card-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }

          .appointment-date-box {
            flex-direction: row !important;
            justify-content: center !important;
            gap: 10px !important;
            padding: 10px 14px !important;
          }
        }
      `}</style>
    </div>
  );
};
