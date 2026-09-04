import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { SupportTicket, SupportTicketMessage, SupportTicketStatus } from '../types/admin';

export const supportService = {
  async getAll(): Promise<SupportTicket[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          id,
          ticket_code,
          user_id,
          user_name,
          user_email,
          user_role,
          venue_id,
          venue_name,
          module,
          description,
          image_url,
          video_url,
          status,
          created_at,
          updated_at,
          messages:support_ticket_messages (
            id,
            ticket_id,
            sender_id,
            sender_name,
            sender_role,
            message,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Erro ao carregar tickets de suporte:', error);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        ticketCode: row.ticket_code,
        userId: row.user_id,
        userName: row.user_name,
        userEmail: row.user_email,
        userRole: row.user_role,
        venueId: row.venue_id,
        venueName: row.venue_name,
        module: row.module,
        description: row.description,
        imageUrl: row.image_url,
        videoUrl: row.video_url,
        status: row.status as SupportTicketStatus,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        messages: ((row.messages || []) as any[]).map(m => ({
          id: m.id,
          ticketId: m.ticket_id,
          senderId: m.sender_id,
          senderName: m.sender_name,
          senderRole: m.sender_role,
          message: m.message,
          createdAt: m.created_at,
        })).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
      }));
    } catch (err) {
      console.warn('Falha inesperada ao buscar tickets:', err);
      return [];
    }
  },

  async createTicket(ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'messages'>): Promise<SupportTicket | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const payload = {
        ticket_code: ticket.ticketCode,
        user_id: ticket.userId,
        user_name: ticket.userName,
        user_email: ticket.userEmail,
        user_role: ticket.userRole,
        venue_id: ticket.venueId || null,
        venue_name: ticket.venueName || null,
        module: ticket.module,
        description: ticket.description,
        image_url: ticket.imageUrl || null,
        video_url: ticket.videoUrl || null,
        status: ticket.status || 'new',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('support_tickets')
        .insert(payload)
        .select()
        .single();

      if (error || !data) {
        console.warn('Erro ao criar ticket no Supabase:', error);
        return null;
      }

      return {
        id: data.id,
        ticketCode: data.ticket_code,
        userId: data.user_id,
        userName: data.user_name,
        userEmail: data.user_email,
        userRole: data.user_role,
        venueId: data.venue_id,
        venueName: data.venue_name,
        module: data.module,
        description: data.description,
        imageUrl: data.image_url,
        videoUrl: data.video_url,
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        messages: [],
      };
    } catch (err) {
      console.warn('Falha ao inserir ticket:', err);
      return null;
    }
  },

  async updateStatus(ticketId: string, status: SupportTicketStatus): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      return !error;
    } catch {
      return false;
    }
  },

  async addMessage(msg: Omit<SupportTicketMessage, 'id' | 'createdAt'>): Promise<SupportTicketMessage | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const payload = {
        ticket_id: msg.ticketId,
        sender_id: msg.senderId,
        sender_name: msg.senderName,
        sender_role: msg.senderRole,
        message: msg.message,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('support_ticket_messages')
        .insert(payload)
        .select()
        .single();

      if (error || !data) {
        console.warn('Erro ao inserir mensagem de suporte:', error);
        return null;
      }

      // Touch ticket updated_at
      await supabase
        .from('support_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', msg.ticketId);

      return {
        id: data.id,
        ticketId: data.ticket_id,
        senderId: data.sender_id,
        senderName: data.sender_name,
        senderRole: data.sender_role,
        message: data.message,
        createdAt: data.created_at,
      };
    } catch (err) {
      console.warn('Falha ao enviar mensagem de suporte:', err);
      return null;
    }
  },
};
