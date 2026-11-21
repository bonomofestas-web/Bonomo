import React, { useEffect, useState } from 'react';
import { Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { contactService } from '../../../services/contactService';
import { ConvertContactModal } from './ConvertContactModal';

interface Props {
  masterId: string;
  name: string;
  phone?: string;
  venueId?: string;
}

/**
 * Marca o contato da conversa como fornecedor (vale no comercial e no pos-venda). Se o contato ainda nao existe na
 * Central de Contatos, ele e criado pelo telefone. Depois disso aparece na aba Fornecedores das Mensagens e no Contato.
 */
export const SupplierToggleButton: React.FC<Props> = ({ masterId, name, phone, venueId }) => {
  const [isSupplier, setIsSupplier] = useState(false);
  const [contactId, setContactId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [modalContact, setModalContact] = useState<null | { id: string; name: string; primaryPhone?: string }>(null);

  useEffect(() => {
    let alive = true;
    setIsSupplier(false); setContactId(null);
    if (!masterId || !phone) return;
    void contactService.findExisting(masterId, { phones: [phone] }).then(c => { if (alive && c) { setContactId(c.id); setIsSupplier(Boolean(c.isSupplier)); } });
    return () => { alive = false; };
  }, [masterId, phone]);

  const toggle = async () => {
    if (!phone) { toast.warning('Esta conversa não tem telefone para identificar o contato.'); return; }
    setBusy(true);
    try {
      let id = contactId;
      if (!id) {
        const { contact } = await contactService.findOrCreateContact({ masterId, name: name || 'Fornecedor', primaryPhone: phone, venueId });
        id = contact.id;
        setContactId(id);
      }
      if (isSupplier) {
        if (!window.confirm('Desmarcar este contato como fornecedor? A ficha e os orçamentos continuam guardados.')) return;
        if (!(await contactService.setSupplier(id, masterId, false))) { toast.error('Não foi possível alterar.'); return; }
        setIsSupplier(false);
        window.dispatchEvent(new Event('f5:suppliers-changed'));
        return;
      }
      // Marcar como fornecedor: aviso e confirmacao (bloqueia se houver contrato; ativos de funil sao perdidos)
      setModalContact({ id, name: name || 'Contato', primaryPhone: phone });
    } catch (err: any) {
      toast.error(err?.message || 'Não foi possível alterar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
    <button type="button" onClick={toggle} disabled={busy}
      title={isSupplier ? 'Este contato é fornecedor. Clique para desmarcar.' : 'Marcar este contato como fornecedor'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, cursor: 'pointer', fontSize: '0.74rem', fontWeight: 700,
        background: isSupplier ? 'rgba(245,158,11,0.18)' : 'transparent',
        border: `1px solid ${isSupplier ? 'rgba(245,158,11,0.55)' : 'var(--adm-border)'}`,
        color: isSupplier ? '#B45309' : 'var(--adm-text-muted)', opacity: busy ? 0.6 : 1,
      }}>
      <Briefcase size={14} />
      <span>{isSupplier ? 'Fornecedor' : 'Marcar fornecedor'}</span>
    </button>
    {modalContact && (
      <ConvertContactModal masterId={masterId} contact={modalContact} target="supplier" by={{}}
        onClose={() => setModalContact(null)}
        onDone={() => { setModalContact(null); setIsSupplier(true); window.dispatchEvent(new Event('f5:suppliers-changed')); }} />
    )}
    </>
  );
};
