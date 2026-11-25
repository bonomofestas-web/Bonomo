import { useState, useEffect } from 'react';
import { contactService } from '../services/contactService';
import type { Contact } from '../types/admin';
import { sanitizeBrazilianPhone } from '../utils/phoneFormatter';

interface UseUnitContactLookupParams {
  masterId?: string;
  venueId?: string;
  nameQuery: string;
  phoneValue: string;
  enabled: boolean;
}

/**
 * Busca de contatos estritamente isolada por masterId e unidade (venueId).
 * Contatos que existem apenas em outras unidades nunca aparecem nas sugestões
 * nem disparam aviso de duplicidade na unidade atual.
 */
export function useUnitContactLookup({
  masterId,
  venueId,
  nameQuery,
  phoneValue,
  enabled,
}: UseUnitContactLookupParams) {
  const [suggestions, setSuggestions] = useState<Contact[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [sameUnitPhoneMatch, setSameUnitPhoneMatch] = useState<Contact | null>(null);

  // Autocomplete por nome (estritamente escopado à unidade atual)
  useEffect(() => {
    if (!enabled || !masterId || !venueId) {
      setSuggestions([]);
      return;
    }
    const q = nameQuery.trim();
    if (q.length < 2 || (selectedContact && selectedContact.name.trim().toLowerCase() === q.toLowerCase())) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    setLoadingSuggestions(true);
    const timer = setTimeout(async () => {
      try {
        const res = await contactService.getContacts({
          masterId,
          search: q,
          venueIds: [venueId],
          limit: 6,
        });
        if (!cancelled) setSuggestions(res);
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setLoadingSuggestions(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, masterId, venueId, nameQuery, selectedContact]);

  // Verificação de duplicidade de telefone APENAS na unidade atual
  useEffect(() => {
    if (!enabled || !masterId || !venueId) {
      setSameUnitPhoneMatch(null);
      return;
    }
    const digits = sanitizeBrazilianPhone(phoneValue);
    if (digits.length < 10) {
      setSameUnitPhoneMatch(null);
      return;
    }
    const last8 = digits.slice(-8);
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await contactService.getContacts({
          masterId,
          search: last8,
          venueIds: [venueId],
          limit: 3,
        });
        if (cancelled) return;
        const exact = res.find(c => {
          const p1 = sanitizeBrazilianPhone(c.primaryPhone || '');
          const p2 = sanitizeBrazilianPhone(c.whatsappPhone || '');
          return p1.endsWith(last8) || p2.endsWith(last8);
        }) || null;
        setSameUnitPhoneMatch(exact);
      } catch {
        if (!cancelled) setSameUnitPhoneMatch(null);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, masterId, venueId, phoneValue]);

  const clearLookup = () => {
    setSuggestions([]);
    setSelectedContact(null);
    setSameUnitPhoneMatch(null);
  };

  return {
    suggestions,
    loadingSuggestions,
    selectedContact,
    setSelectedContact,
    sameUnitPhoneMatch,
    clearLookup,
  };
}
