import React from 'react';
import { User, Phone } from 'lucide-react';
import type { Contact } from '../../../types/admin';
import { formatPhone } from '../../../utils/phoneFormatter';

interface ContactSuggestionsDropdownProps {
  suggestions: Contact[];
  onSelect: (contact: Contact) => void;
}

export const ContactSuggestionsDropdown: React.FC<ContactSuggestionsDropdownProps> = ({
  suggestions,
  onSelect,
}) => {
  if (!suggestions.length) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(100% + 4px)',
        left: 0,
        right: 0,
        zIndex: 120,
        backgroundColor: 'var(--adm-bg-card, #FFFFFF)',
        border: '1px solid var(--adm-border, #CBD5E1)',
        borderRadius: '10px',
        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.22)',
        padding: '4px',
        maxHeight: '220px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
      }}
    >
      <div style={{ fontSize: '0.64rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--adm-text-muted)', padding: '4px 8px 2px', letterSpacing: '0.4px' }}>
        Contatos encontrados nesta unidade
      </div>
      {suggestions.map(contact => {
        const phone = formatPhone(contact.whatsappPhone || contact.primaryPhone || '');
        return (
          <button
            key={contact.id}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(contact);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '7px 10px',
              borderRadius: '7px',
              border: 'none',
              background: 'transparent',
              textAlign: 'left',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--adm-bg-hover, rgba(0,0,0,0.05))'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'var(--adm-accent-bg, rgba(2, 132, 199, 0.12))',
              color: 'var(--adm-accent, #0284C7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <User size={14} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--adm-text-title)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {contact.name}
              </div>
              {phone && (
                <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Phone size={10} />
                  <span>{phone}</span>
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};
