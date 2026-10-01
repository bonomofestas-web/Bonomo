/**
 * Utilitário de Link de Entrada / Convite Direto para Colaboradores (F5 System)
 * Permite que novos colaboradores acessem diretamente sem depender de e-mail de confirmação.
 */

export function generateCollabInviteLink(collab: { id: string; email: string; name?: string }): string {
  const payload = JSON.stringify({
    id: collab.id,
    email: collab.email.toLowerCase().trim(),
    name: collab.name?.trim() || '',
    created: Date.now(),
  });
  const token = btoa(encodeURIComponent(payload));
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return `${baseUrl}/?collab_invite=${token}`;
}

export function decodeCollabInviteToken(token: string): { id: string; email: string; name?: string } | null {
  try {
    const raw = decodeURIComponent(atob(token));
    const parsed = JSON.parse(raw);
    if (parsed && parsed.id && parsed.email) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
