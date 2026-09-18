import { useRef, useState } from 'react';
import type { Message } from '../types';

export const BOT_DELAY_MS = 900;

/** Mensagens do chat + typing indicator (primitivas; orquestração fica no App). */
export function useChatBot(welcomeText: string) {
  const [messages, setMessages] = useState<Message[]>(() => [{ id: 0, from: 'bot', text: welcomeText }]);
  const [isTyping, setIsTyping] = useState(false);
  const nextIdRef = useRef(1);
  const timerRef = useRef<number | null>(null);

  function pushMessage(from: Message['from'], text: string) {
    // ID capturado ANTES do setState: o updater precisa ser puro
    // (StrictMode invoca updaters 2x e o processamento pode ser lazy —
    // ler o ref dentro do updater gerava ids duplicados e sumia bolhas).
    const id = nextIdRef.current;
    nextIdRef.current += 1;
    setMessages((current) => [...current, { id, from, text }]);
  }

  function botSay(text: string) {
    setIsTyping(true);
    // Respostas longas "digitam" por mais tempo, com teto para não travar o fluxo.
    const delay = Math.min(BOT_DELAY_MS + text.length * 4, 1600);
    timerRef.current = window.setTimeout(() => {
      setIsTyping(false);
      pushMessage('bot', text);
    }, delay);
  }

  function flushBot() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsTyping(false);
  }

  function resetChat(nextWelcome: string) {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setMessages([]);
    nextIdRef.current = 1;
    setIsTyping(false);
    pushMessage('bot', nextWelcome);
  }

  return { messages, setMessages, isTyping, setIsTyping, pushMessage, botSay, flushBot, resetChat, timerRef, nextIdRef };
}
