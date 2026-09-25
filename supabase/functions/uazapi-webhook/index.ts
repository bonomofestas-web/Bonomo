// Follow this setup guide to integrate the Deno runtime into your project:
// https://deno.land/manual/getting_started/setup_your_environment

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function isLidIdentifier(id?: string): boolean {
  if (!id) return false;
  if (typeof id === "string" && id.includes("@lid")) return true;
  const digits = String(id).replace(/\D/g, "");
  if (!digits) return false;
  if (digits.length >= 14) return true;
  if (digits.length >= 12 && !digits.startsWith("55")) return true;
  return false;
}

function extractRealWhatsAppPhone(msg: any, payload?: any): string {
  const remoteJid = msg?.key?.remoteJid || msg?.remoteJid || payload?.remoteJid || "";
  if (remoteJid && typeof remoteJid === "string" && remoteJid.includes("@s.whatsapp.net")) {
    const p = remoteJid.replace(/:\d+@/, "@").replace(/@.*$/, "").replace(/\D/g, "");
    if (p.length >= 10 && p.length <= 13 && !isLidIdentifier(p)) {
      return p;
    }
  }

  const candidates: any[] = [
    msg?.key?.participantPn,
    msg?.key?.remoteJidPn,
    msg?.participantPn,
    msg?.remoteJidPn,
    msg?.senderPhone,
    msg?.phone,
    payload?.phone,
    payload?.senderPhone,
    payload?.sender_phone,
    msg?.sender_phone,
    msg?.sender,
    msg?.from,
    msg?.key?.participant,
    msg?.participant,
    msg?.author,
    payload?.sender,
    payload?.from,
    msg?.key?.remoteJid,
    msg?.remoteJid,
  ];

  for (const c of candidates) {
    if (!c || typeof c !== "string") continue;
    if (c.includes("@lid")) continue;
    const withoutDevice = c.replace(/:\d+@/, "@");
    const clean = withoutDevice.replace(/@.*$/, "").replace(/\D/g, "");
    if (clean.length >= 10 && clean.length <= 13 && !isLidIdentifier(clean)) {
      return clean;
    }
  }

  for (const c of candidates) {
    if (!c || typeof c !== "string") continue;
    if (c.includes("@lid")) continue;
    const clean = c.replace(/:\d+@/, "@").replace(/@.*$/, "").replace(/\D/g, "");
    if (clean.length >= 8 && clean.length <= 14 && !isLidIdentifier(clean)) {
      return clean;
    }
  }

  return "";
}

function extractSenderName(msg: any, payload?: any): string {
  const candidates = [
    msg?.pushName,
    msg?.notifyName,
    msg?.verifiedBizName,
    msg?.senderName,
    msg?.name,
    payload?.pushName,
    payload?.notifyName,
    payload?.verifiedBizName,
    payload?.senderName,
    payload?.name,
    msg?.key?.pushName,
    msg?.authorName,
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 0) {
      const trimmed = c.trim();
      if (!/^\d+$/.test(trimmed) && !trimmed.includes("@")) {
        return trimmed;
      }
    }
  }
  return "";
}

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, token, admintoken",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method === "GET") {
    return new Response(JSON.stringify({ status: "active", message: "F5 System UAZAPI Webhook Edge Function" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  // 1. Responde 200 IMEDIATAMENTE (Regra mandatória UAZAPI)
  let rawBody: any = null;
  try {
    rawBody = await req.json();
  } catch {
    return new Response(JSON.stringify({ success: true, received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }

  // Processamento assíncrono em segundo plano
  (async () => {
    try {
      if (!rawBody) return;
      const payload = rawBody;
      const eventType = (payload.EventType || payload.event || payload.type || "").toString().toLowerCase();
      const instanceToken = payload.token || req.headers.get("token") || "";
      const instanceName = payload.instanceName || payload.instance || "";

      console.log(`[Edge Function UAZAPI] Event: ${eventType} | Instance: ${instanceName || instanceToken.substring(0, 8)}`);

      // Status de conexão
      if (eventType === "connection" || eventType === "status" || eventType.includes("connection")) {
        const rawStatus = (payload.status || payload.state || payload.data?.status || payload.data?.state || (payload.connected === true ? "connected" : ""));
        const statusNormalized = typeof rawStatus === "string" ? rawStatus.toLowerCase() : "";
        const isConnected = statusNormalized === "connected" || statusNormalized === "open";
        const isDisconnected = statusNormalized === "disconnected" || statusNormalized === "close" || statusNormalized === "hibernated";

        if (instanceToken && (isConnected || isDisconnected)) {
          const finalStatus = isConnected ? "connected" : "disconnected";
          await supabase
            .from("whatsapp_instances")
            .update({ status: finalStatus, updated_at: new Date().toISOString() })
            .eq("token", instanceToken);
        }
        return;
      }

      // Mensagens
      if (eventType === "messages" || eventType === "messages.upsert" || eventType === "messages_update") {
        const msg = payload.message || payload.data?.message || payload.data || payload;
        const isFromMe = msg.fromMe === true || msg.key?.fromMe === true || payload.fromMe === true;

        // Se a mensagem foi originada pela API, ignora (evita loops)
        if (payload.wasSentByApi === true || msg.wasSentByApi === true) return;

        const phone = extractRealWhatsAppPhone(msg, payload);
        if (!phone) return;

        let text = msg.body || msg.text || msg.conversation || msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
        const senderName = extractSenderName(msg, payload);

        // Verifica se é mensagem de mídia
        const mediaType = msg.mediaType || (msg.message?.imageMessage ? "image" : msg.message?.audioMessage ? "audio" : msg.message?.videoMessage ? "video" : msg.message?.documentMessage ? "document" : "text");
        const mediaUrl = msg.mediaUrl || msg.fileURL || msg.url || undefined;

        // Procura lead correspondente pelo telefone no CRM
        const { data: existingLeads } = await supabase
          .from("leads")
          .select("id, name, phone, unread_count")
          .ilike("phone", `%${phone.slice(-8)}%`)
          .limit(1);

        const targetLead = existingLeads?.[0];

        // Se lead existir, registra atividade e incrementa contador de não lidas se recebida
        if (targetLead) {
          const newUnread = isFromMe ? 0 : (targetLead.unread_count || 0) + 1;
          await supabase
            .from("leads")
            .update({
              last_interaction_at: new Date().toISOString(),
              unread_count: newUnread,
            })
            .eq("id", targetLead.id);

          await supabase.from("lead_activities").insert({
            lead_id: targetLead.id,
            type: "whatsapp_message",
            content: text || `[${mediaType}]`,
            sender: isFromMe ? "user" : "client",
            metadata: {
              phone,
              senderName,
              mediaType,
              mediaUrl,
              fromMe: isFromMe,
              timestamp: new Date().toISOString(),
            },
          });
        }
      }
    } catch (err) {
      console.error("[Edge Function UAZAPI Error]:", err);
    }
  })();

  return new Response(JSON.stringify({ success: true, received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});
