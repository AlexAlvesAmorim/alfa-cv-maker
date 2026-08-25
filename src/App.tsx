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
import { TemplatePicker } from './components/TemplatePicker';
import { AlfaMatch } from './components/AlfaMatch';
import { ImportResume } from './components/ImportResume';
import type { ProcessedPhoto } from './utils/photo';
import type { ImportResult } from './utils/resumeImport';
import { EMPTY_RESUME, SKIP_VALUE, type Message, type ResumeData, type ResumeField } from './types';
import { FINISH_MESSAGE, STEPS, WELCOME_MESSAGE } from './data/steps';
import { extraSuggestionsFor, recommendedTemplateId, suggestionsFor } from './data/dynamicSuggestions';
import { findTemplateByInput } from './data/templates';
import { cleanFullName } from './utils/resumeContent';

const BOT_DELAY_MS = 900;
const DRAFT_KEY = 'alfa-cv-draft-v2';

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
  const [mode, setMode] = useState<'chat' | 'match'>('chat');
  const [returnToSummary, setReturnToSummary] = useState(false);

  const nextIdRef = useRef(1);
  const timerRef = useRef<number | null>(null);
  const draftTimerRef = useRef<number | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const didStartRef = useRef(false);

  useEffect(() => {
    if (draftTimerRef.current !== null) window.clearTimeout(draftTimerRef.current);
    if (resume === EMPTY_RESUME && stepIndex === 0) return;
    draftTimerRef.current = window.setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ resume, stepIndex } satisfies Draft));
    }, 400);
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
  const isFormStep =
    currentStep?.id === 'experiences' || currentStep?.id === 'photo' || currentStep?.id === 'layout';

  function suggestionsNow(): { main: string[]; extra: string[] } {
    if (!currentStep || isTyping || finished || isFormStep) return { main: [], extra: [] };
    if (currentStep.dynamic) {
      return {
        main: suggestionsFor(currentStep.id, resume) ?? currentStep.suggestions,
        extra: extraSuggestionsFor(currentStep.id),
      };
    }
    return { main: currentStep.suggestions, extra: [] };
  }

  function flushBot() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsTyping(false);
  }

  function advanceStep() {
    if (returnToSummary) {
      setReturnToSummary(false);
      setStepIndex(STEPS.length);
      setDraftText('');
      setIsTyping(true);
      timerRef.current = window.setTimeout(() => {
        setIsTyping(false);
        pushMessage('bot', 'Pronto! Atualizei o painel abaixo com o que você ajustou.');
      }, BOT_DELAY_MS);
      return;
    }
    const nextQuestion = stepIndex + 1 < STEPS.length ? STEPS[stepIndex + 1].question : FINISH_MESSAGE;
    setStepIndex((index) => index + 1);
    setDraftText('');
    botSay(nextQuestion);
  }

  function goBack() {
    if (stepIndex === 0) return;
    const target = Math.min(stepIndex, STEPS.length - 1) - (finished ? 0 : 1);
    if (target < 0) return;
    flushBot();
    setReturnToSummary(false);
    setStepIndex(target);
    setDraftText('');
    botSay(STEPS[target].question);
  }

  function editField(field: ResumeField) {
    const target = STEPS.findIndex((step) => step.id === field);
    if (target < 0 || isTyping) return;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setIsTyping(false);
    setReturnToSummary(true);
    setStepIndex(target);
    botSay(STEPS[target].question);
  }

  function submitPhoto(result: ProcessedPhoto) {
    if (!currentStep || currentStep.id !== 'photo' || finished) return;
    flushBot();
    pushMessage('user', 'Foto 3x4 adicionada');
    setResume((prev) => ({ ...prev, photo: result.photo, photoCircle: result.photoCircle }));
    advanceStep();
  }

  function submitExperiences(list: typeof resume.experiences) {
    if (!currentStep || currentStep.id !== 'experiences' || finished) return;
    flushBot();
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
    if (text === '' || !currentStep || finished) return;

    if (isFormStep) {
      flushBot();
      if (currentStep.id === 'layout') {
        if (isSkip) {
          pushMessage('user', text);
          setResume((prev) => ({ ...prev, layout: '' }));
          advanceStep();
          return;
        }
        const match = findTemplateByInput(rawText);
        pushMessage('user', text);
        if (!match) {
          botSay(
            'Não encontrei um modelo com esse nome. Escolha um dos cards acima — o destacado como '
              + '"Recomendado" é o que combina mais com o seu perfil.',
          );
          return;
        }
        setResume((prev) => ({ ...prev, layout: match.value }));
        advanceStep();
        return;
      }
      const formName = currentStep.id === 'photo' ? '"Escolher foto (3x4)"' : 'o formulário de experiências';
      botSay(`Para esta etapa, use ${formName} aqui embaixo.`);
      return;
    }

    if (isTyping) return;

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
    setReturnToSummary(false);
    pushMessage('bot', WELCOME_MESSAGE);
    timerRef.current = window.setTimeout(() => pushMessage('bot', STEPS[0].question), BOT_DELAY_MS);
  }

  function handleImported(result: ImportResult) {
    flushBot();
    pushMessage('user', 'Importei meu currículo atual');
    setResume((prev) => ({ ...prev, ...result.fields }));
    setStepIndex(STEPS.length);
    setDraftText('');
    setIsTyping(true);
    timerRef.current = window.setTimeout(() => {
      setIsTyping(false);
      pushMessage(
        'bot',
        `Reconheci: ${result.recognized.join(', ')}. Revise no painel abaixo — clique em qualquer campo para ajustar, `
          + 'escolha o modelo e baixe em PDF ou DOCX.',
      );
    }, BOT_DELAY_MS);
  }

  return (
    <div className="app">
      <Header
        step={Math.min(stepIndex + 1, STEPS.length)}
        totalSteps={STEPS.length}
        mode={mode}
        onModeChange={setMode}
      />
      {mode === 'match' ? (
        <main className="chat">
          <AlfaMatch
            resume={resume}
            onBack={() => setMode('chat')}
            onResumeUpdate={(fields) => setResume((prev) => ({ ...prev, ...fields }))}
          />
        </main>
      ) : (
      <main className="chat">
        <div className="chat__messages" role="log" aria-label="Conversa com o assistente">
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
            {currentStep?.id === 'layout' && (
              <TemplatePicker
                selected={resume.layout}
                disabled={false}
                recommended={recommendedTemplateId(resume)}
                onPick={handleSend}
              />
            )}
            {currentStep?.id === 'photo' && <PhotoUpload disabled={false} onPhoto={submitPhoto} />}
            {currentStep?.id === 'experiences' && (
              <ExperienceForm initial={resume.experiences} disabled={false} onSave={submitExperiences} />
            )}
            {currentStep && !isFormStep && (() => {
              const suggestions = suggestionsNow();
              return (
                <SuggestionChips
                  suggestions={suggestions.main}
                  extraSuggestions={suggestions.extra}
                  optional={currentStep.optional ?? false}
                  onPick={handleSend}
                />
              );
            })()}
            {stepIndex === 0 && !isTyping && <ImportResume variant="chat" onImported={handleImported} />}
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
      )}
    </div>
  );
}
