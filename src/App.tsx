import { useEffect, useRef, useState } from 'react';
import './App.css';
import { Header } from './components/Header';
import { ChatMessage } from './components/ChatMessage';
import { TypingIndicator } from './components/TypingIndicator';
import { SuggestionChips } from './components/SuggestionChips';
import { ChatInput } from './components/ChatInput';
import { SummaryCard } from './components/SummaryCard';
import { PhotoUpload } from './components/PhotoUpload';
import { ExperienceForm } from './components/ExperienceForm';
import type { ProcessedPhoto } from './utils/photo';
import { EMPTY_RESUME, SKIP_VALUE, type Message, type ResumeData, type ResumeField } from './types';
import { FINISH_MESSAGE, STEPS, WELCOME_MESSAGE } from './data/steps';
import { suggestionsFor } from './data/dynamicSuggestions';
import { cleanFullName } from './utils/resumeContent';

const BOT_DELAY_MS = 900;
const DRAFT_KEY = 'alfa-cv-draft-v1';

interface Draft {
  resume: ResumeData;
  stepIndex: number;
}

function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Draft;
    if (!draft.resume || typeof draft.stepIndex !== 'number') return null;
    if (draft.stepIndex < 0 || draft.stepIndex > STEPS.length) return null;
    return draft;
  } catch {
    return null;
  }
}

export default function App() {
  const draftRef = useRef<Draft | null>(null);
  if (draftRef.current === null) {
    draftRef.current = loadDraft();
  }
  const draft = draftRef.current;

  const [messages, setMessages] = useState<Message[]>(() => [{ id: 0, from: 'bot', text: WELCOME_MESSAGE }]);
  const [stepIndex, setStepIndex] = useState(() => draft?.stepIndex ?? 0);
  const [resume, setResume] = useState<ResumeData>(() => draft?.resume ?? EMPTY_RESUME);
  const [isTyping, setIsTyping] = useState(false);
  const [draftText, setDraftText] = useState('');

  const nextIdRef = useRef(1);
  const timerRef = useRef<number | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const didStartRef = useRef(false);

  useEffect(() => {
    if (resume !== EMPTY_RESUME || stepIndex > 0) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ resume, stepIndex } satisfies Draft));
    }
  }, [resume, stepIndex]);

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
    if (draft) {
      pushMessage('bot', 'Bem-vindo de volta! Recuperei seu rascunho salvo neste navegador.');
      timerRef.current = window.setTimeout(() => {
        pushMessage('bot', stepIndex >= STEPS.length ? FINISH_MESSAGE : STEPS[stepIndex].question);
      }, BOT_DELAY_MS);
    } else {
      timerRef.current = window.setTimeout(() => pushMessage('bot', STEPS[0].question), BOT_DELAY_MS);
    }
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
  const isFormStep = currentStep?.id === 'experiences' || currentStep?.id === 'photo';

  function suggestionsNow(): string[] {
    if (!currentStep || isTyping || finished || isFormStep) return [];
    if (currentStep.dynamic) {
      return suggestionsFor(currentStep.id, resume) ?? currentStep.suggestions;
    }
    return currentStep.suggestions;
  }

  function advanceStep() {
    const nextQuestion = stepIndex + 1 < STEPS.length ? STEPS[stepIndex + 1].question : FINISH_MESSAGE;
    setStepIndex((index) => index + 1);
    setDraftText('');
    botSay(nextQuestion);
  }

  function goBack() {
    if (isTyping || stepIndex === 0) return;
    const target = Math.min(stepIndex, STEPS.length - 1) - (finished ? 0 : 1);
    if (target < 0) return;
    setIsTyping(false);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setStepIndex(target);
    setDraftText('');
    botSay(STEPS[target].question);
  }

  function editField(field: ResumeField) {
    const target = STEPS.findIndex((step) => step.id === field);
    if (target < 0 || isTyping) return;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setIsTyping(false);
    setStepIndex(target);
    botSay(STEPS[target].question);
  }

  function submitPhoto(result: ProcessedPhoto) {
    if (!currentStep || currentStep.id !== 'photo' || finished || isTyping) return;
    pushMessage('user', 'Foto 3x4 adicionada');
    setResume((prev) => ({ ...prev, photo: result.photo, photoCircle: result.photoCircle }));
    advanceStep();
  }

  function submitExperiences(list: typeof resume.experiences) {
    if (!currentStep || currentStep.id !== 'experiences' || finished || isTyping) return;
    if (list.length === 0) {
      pushMessage('user', 'Não tenho experiência formal');
    } else {
      pushMessage('user', `${list.length} experiência${list.length > 1 ? 's' : ''} adicionada${list.length > 1 ? 's' : ''}`);
    }
    setResume((prev) => ({ ...prev, experiences: list }));
    advanceStep();
  }

  function handleSend(rawText: string) {
    const isSkip = rawText === SKIP_VALUE;
    const text = isSkip ? 'Pular esta etapa' : rawText.trim();
    if (text === '' || !currentStep || finished || isTyping) return;

    if (isFormStep) {
      const formName = currentStep.id === 'photo' ? '"Escolher foto (3x4)"' : 'o formulário de experiências';
      botSay(`Para esta etapa, use ${formName} aqui embaixo.`);
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
    localStorage.removeItem(DRAFT_KEY);
    draftRef.current = null;
    setMessages([]);
    nextIdRef.current = 1;
    setStepIndex(0);
    setResume(EMPTY_RESUME);
    setIsTyping(false);
    setDraftText('');
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
          {finished && (
            <SummaryCard
              resume={resume}
              onRestart={handleRestart}
              onEditField={editField}
              onAccentChange={(hex) => setResume((prev) => ({ ...prev, accentColor: hex }))}
            />
          )}
          <div ref={bottomRef} />
        </div>
        {!finished && (
          <>
            {currentStep?.id === 'photo' && <PhotoUpload disabled={isTyping} onPhoto={submitPhoto} />}
            {currentStep?.id === 'experiences' && (
              <ExperienceForm initial={resume.experiences} disabled={isTyping} onSave={submitExperiences} />
            )}
            {currentStep && !isFormStep && (
              <SuggestionChips
                suggestions={suggestionsNow()}
                optional={currentStep.optional ?? false}
                onPick={handleSend}
              />
            )}
            <ChatInput
              value={draftText}
              placeholder={currentStep?.placeholder ?? 'Digite aqui...'}
              disabled={inputDisabled || isFormStep}
              canGoBack={stepIndex > 0 && !isTyping}
              onBack={goBack}
              onChange={setDraftText}
              onSend={() => handleSend(draftText)}
            />
          </>
        )}
      </main>
    </div>
  );
}
