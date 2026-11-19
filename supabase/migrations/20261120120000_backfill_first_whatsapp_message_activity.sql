-- Reparo de dados: leads criados pelo WhatsApp ate 15/11 guardaram a primeira mensagem so em leads.notes
-- ("Primeira mensagem via WhatsApp: ..." / "Conversa iniciada via WhatsApp: ..."), sem a atividade em lead_activities.
-- Resultado: a lista de conversas mostrava a mensagem (vem de notes) e o chat abria vazio.
-- Esta migration cria a atividade de chat que faltava, UMA por lead, so para leads que nao tem nenhuma atividade de chat.
-- Idempotente: depois de rodar, o lead passa a ter atividade e nao entra de novo. Nao altera nem apaga nada existente.
-- Escopo: so leads (ja isolados por master_id); nenhuma tabela nova, nenhuma policy nova.

INSERT INTO public.lead_activities (lead_id, type, title, text, author_name, timestamp, status, metadata)
SELECT
    l.id,
    'contact',
    CASE WHEN l.notes LIKE 'Conversa iniciada via WhatsApp:%' THEN 'Mensagem enviada via WhatsApp (Celular/Web)' ELSE 'Mensagem recebida no WhatsApp' END,
    btrim(regexp_replace(regexp_replace(l.notes, '^[^:]*:\s*"?', ''), '"?\s*$', '')),
    CASE WHEN l.notes LIKE 'Conversa iniciada via WhatsApp:%' THEN 'Equipe' ELSE COALESCE(NULLIF(btrim(l.debutante_name), ''), 'Contato') END,
    COALESCE(l.last_interaction_at, l.created_at),
    'delivered',
    jsonb_build_object('backfilled_from_notes', true)
FROM public.leads l
WHERE l.notes ~ '^(Conversa iniciada via WhatsApp|Primeira mensagem via WhatsApp|Mensagem recebida via WhatsApp):'
  AND btrim(regexp_replace(regexp_replace(l.notes, '^[^:]*:\s*"?', ''), '"?\s*$', '')) <> ''
  AND NOT EXISTS (
      SELECT 1 FROM public.lead_activities a
      WHERE a.lead_id = l.id AND a.type IN ('contact', 'whatsapp')
  );
