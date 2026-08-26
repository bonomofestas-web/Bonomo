import React, { useState } from 'react';
import { X, Smartphone, Search, Check, UserPlus } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import type { GuestGroup } from '../../types';

interface ContactItem {
  id: string;
  name: string;
  phone: string;
  age: number;
  gender: 'female' | 'male' | 'other';
  group: GuestGroup;
}

const mockDeviceContacts: ContactItem[] = [
  { id: 'c1', name: 'Larissa Manoela', phone: '(21) 98888-1111', age: 15, gender: 'female', group: 'Escola' },
  { id: 'c2', name: 'Rodrigo Faro', phone: '(21) 97777-2222', age: 48, gender: 'male', group: 'Família' },
  { id: 'c3', name: 'Camila Queiroz', phone: '(21) 96666-3333', age: 15, gender: 'female', group: 'Amigos' },
  { id: 'c4', name: 'Bruna Marquezine', phone: '(21) 95555-4444', age: 14, gender: 'female', group: 'VIPs' },
  { id: 'c5', name: 'Matheus Abreu', phone: '(21) 94444-5555', age: 16, gender: 'male', group: 'Escola' },
];

interface GuestImportContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuestImportContactsModal: React.FC<GuestImportContactsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { addGuest } = useAppState();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(['c1', 'c3']));

  if (!isOpen) return null;

  const filtered = mockDeviceContacts.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleImport = () => {
    const toImport = mockDeviceContacts.filter(c => selectedIds.has(c.id));
    toImport.forEach(c => {
      addGuest({
        name: c.name,
        phone: c.phone,
        age: c.age,
        gender: c.gender,
        group: c.group,
        status: 'pending',
        plusOnes: 0,
        allowedCapacity: 1,
        origin: 'manual',
      });
    });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.82)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '20px',
      animation: 'fadeIn 0.2s ease-out',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #18141C 0%, #0E0A12 100%)',
        border: '1.5px solid rgba(255, 92, 154, 0.45)',
        borderRadius: '24px',
        maxWidth: '440px',
        width: '100%',
        padding: '24px',
        position: 'relative',
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.85)',
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFF',
            cursor: 'pointer',
          }}
        >
          <X size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Smartphone size={22} color="#FF5C9A" />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFF', margin: 0, fontFamily: "'Playfair Display', serif" }}>
            Contatos do Celular
          </h3>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <Search size={16} color="#FF5C9A" style={{ position: 'absolute', left: '12px', top: '11px' }} />
          <input
            type="text"
            placeholder="Buscar nos contatos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              background: '#120E18',
              border: '1px solid rgba(255, 92, 154, 0.35)',
              borderRadius: '16px',
              padding: '9px 14px 9px 36px',
              color: '#FFF',
              fontSize: '0.84rem',
              outline: 'none',
            }}
          />
        </div>

        {/* Contacts List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto', marginBottom: '20px' }}>
          {filtered.map(c => {
            const isSelected = selectedIds.has(c.id);
            return (
              <div
                key={c.id}
                onClick={() => toggleSelect(c.id)}
                style={{
                  background: isSelected ? 'rgba(255, 92, 154, 0.18)' : '#14101A',
                  border: isSelected ? '1.5px solid #FF5C9A' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFF' }}>{c.name}</div>
                  <div style={{ fontSize: '0.74rem', color: '#B5AFA4', marginTop: '2px' }}>
                    {c.phone} • {c.age} anos • {c.gender === 'female' ? 'Feminino' : 'Masculino'}
                  </div>
                </div>

                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: isSelected ? '#FF5C9A' : 'rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFF',
                  flexShrink: 0,
                }}>
                  {isSelected && <Check size={14} strokeWidth={3} />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action button */}
        <button
          onClick={handleImport}
          disabled={selectedIds.size === 0}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #FF5C9A 0%, #E63946 100%)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '24px',
            padding: '12px',
            fontSize: '0.88rem',
            fontWeight: 800,
            cursor: selectedIds.size === 0 ? 'not-allowed' : 'pointer',
            opacity: selectedIds.size === 0 ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontFamily: "'Cinzel', serif",
            boxShadow: '0 4px 16px rgba(255, 92, 154, 0.35)',
          }}
        >
          <UserPlus size={16} />
          <span>Importar {selectedIds.size} Convidado{selectedIds.size === 1 ? '' : 's'}</span>
        </button>
      </div>
    </div>
  );
};
