import { useEffect, useState } from 'react';
import { isMessagingPaused, onMessagingPauseChange } from '../utils/messagingPause';

/** true enquanto o envio/recebimento de mensagens do WhatsApp estiver pausado (chave remota whatsapp_messaging). */
export function useMessagingPause(): boolean {
  const [paused, setPaused] = useState<boolean>(() => isMessagingPaused());
  useEffect(() => {
    setPaused(isMessagingPaused());
    return onMessagingPauseChange(setPaused);
  }, []);
  return paused;
}
