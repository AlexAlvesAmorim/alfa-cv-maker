import { useEffect, useRef, useState } from 'react';
import './App.css';
import { Header } from './components/Header';
import { ChatMessage } from './components/ChatMessage';
import { TypingIndicator } from './components/TypingIndicator';
import { SuggestionChips } from './components/SuggestionChips';
import { ChatInput } from './components/ChatInput';
import { SummaryCard } from './components/SummaryCard';
import { PhotoUpload } from './components/PhotoUpload';
import type { ProcessedPhoto } from './utils/photo';
import { EMPTY_RESUME, SKIP_VALUE, type Message, type ResumeData } from './types';
import { FINISH_MESSAGE, STEPS, WELCOME_MESSAGE } from './data/steps';
import { suggestionsFor } from './data/dynamicSuggestions';
import { cleanFullName } from './utils/resumeContent';

const BOT_DELAY_MS = 900;

export default function App() {
  const [messages, setMessages] = useState<Message[]>(() => [{ id: 0, from: 'bot', text: WELCOME_MESSAGE }]);
  const [stepIndex, setStepIndex] = useState(0);
  const [resume, setResume] = useState<ResumeData>(EMPTY_RESUME);
  const [isTyping, setIsTyping] = useState(false);
  const [draft, setDraft] = useState('');

  const nextIdRef = useRef(1);
  const timerRef = useRef<number | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const didStartRef = useRef(false);

  function pushMessage(from: Message['from'], text: string) {
    setMessages((current) => [...current, { id: nextIdRef.current, from, text }]);
    nextIdRef.current += 1;
  }

  function botSay(text: string) {
    setIsTyping(true);
    timerRef.current = window.setTimeout(() => {
      setIsTyping(false);
      pushMessage('bot', text);
    }, BOT_DELAY_MS);
  }

  useEffect(() => {
    if (didStartRef.current) return;
    didStartRef.current = true;
    timerRef.current = window.setTimeout(() => pushMessage('bot', STEPS[0].question), BOT_DELAY_MS);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const currentStep = STEPS[stepIndex];
  const finished = stepIndex >= STEPS.length;
  const inputDisabled = isTyping || finished;

  function suggestionsNow(): string[] {
    if (!currentStep || isTyping || finished) return [];
    if (currentStep.dynamic) {
      return suggestionsFor(currentStep.id, resume) ?? currentStep.suggestions;
    }
    return currentStep.suggestions;
  }

  function advanceStep() {
    const nextQuestion = stepIndex + 1 < STEPS.length ? STEPS[stepIndex + 1].question : FINISH_MESSAGE;
    setStepIndex((index) => index + 1);
    setDraft('');
    botSay(nextQuestion);
  }

  function submitPhoto(result: ProcessedPhoto) {
    if (!currentStep || currentStep.id !== 'photo' || finished || isTyping) return;
    pushMessage('user', 'Foto 3x4 adicionada');
    setResume((prev) => ({ ...prev, photo: result.photo, photoCircle: result.photoCircle }));
    advanceStep();
  }

  function handleSend(rawText: string) {
    const isSkip = rawText === SKIP_VALUE;
    const text = isSkip ? 'Pular esta etapa' : rawText.trim();
    if (text === '' || !currentStep || finished || isTyping) return;

    if (currentStep.id === 'photo' && !isSkip) {
      botSay('Para a foto, use o botão "Escolher foto (3x4)" aqui embaixo — ou clique em Pular esta etapa.');
      return;
    }

    const storedValue =
      !isSkip && currentStep.id === 'fullName' ? cleanFullName(rawText.trim()) : isSkip ? '' : rawText.trim();

    pushMessage('user', text);
    setResume((prev) => ({ ...prev, [currentStep.id]: storedValue }));

    advanceStep();
  }

  function handleRestart() {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setMessages([]);
    nextIdRef.current = 1;
    setStepIndex(0);
    setResume(EMPTY_RESUME);
    setIsTyping(false);
    setDraft('');
    pushMessage('bot', WELCOME_MESSAGE);
    timerRef.current = window.setTimeout(() => pushMessage('bot', STEPS[0].question), BOT_DELAY_MS);
  }

  return (
    <div className="app">
      <Header step={Math.min(stepIndex + 1, STEPS.length)} totalSteps={STEPS.length} />
      <main className="chat">
        <div className="chat__messages">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {isTyping && <TypingIndicator />}
          {finished && <SummaryCard resume={resume} onRestart={handleRestart} />}
          <div ref={bottomRef} />
        </div>
        {!finished && (
          <>
            {currentStep?.id === 'photo' && <PhotoUpload disabled={isTyping} onPhoto={submitPhoto} />}
            {currentStep && (
              <SuggestionChips
                suggestions={suggestionsNow()}
                optional={currentStep.optional ?? false}
                onPick={handleSend}
              />
            )}
            <ChatInput
              value={draft}
              placeholder={currentStep?.placeholder ?? 'Digite aqui...'}
              disabled={inputDisabled}
              onChange={setDraft}
              onSend={() => handleSend(draft)}
            />
          </>
        )}
      </main>
    </div>
  );
}
