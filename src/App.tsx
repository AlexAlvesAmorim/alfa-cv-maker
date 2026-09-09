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
import { ContactForm } from './components/ContactForm';
import { TemplatePicker } from './components/TemplatePicker';
import { AlfaMatch } from './components/AlfaMatch';
import { ImportResume } from './components/ImportResume';
import { ResumeDoc } from './components/ResumeDoc';
import type { ProcessedPhoto } from './utils/photo';
import type { ImportResult } from './utils/resumeImport';
import { EMPTY_RESUME, FIELD_CONSTRAINTS, SKIP_VALUE, type Message, type ResumeData, type ResumeField } from './types';
import { FINISH_MESSAGE, STEPS, WELCOME_MESSAGE, phaseForStep } from './data/steps';
import { extraSuggestionsFor, recommendedTemplateId, suggestionsFor } from './data/dynamicSuggestions';
import { findTemplateByInput } from './data/templates';
import { cleanFullName } from './utils/resumeContent';

const BOT_DELAY_MS = 900;
const DRAFT_KEY = 'alfa-cv-draft-v3';

interface Draft {
  resume: ResumeData;
  stepIndex: number;
}

function loadDraft(): Draft | null {
  try {
    // Migração v2 -> v3: layout movido de índice 3 para 5; tenta corrigir drafts antigos
    const raw = localStorage.getItem(DRAFT_KEY) ?? localStorage.getItem('alfa-cv-draft-v2');
    if (!raw) return null;
    const draft = JSON.parse(raw) as Draft & { version?: number };
    if (!draft.resume || typeof draft.stepIndex !== 'number') return null;
    if (draft.stepIndex < 0 || draft.stepIndex > STEPS.length) return null;
    // Draft antigo com stepIndex 3 era 'layout' -> agora é 5; se ainda não preencheu targetRole/summary, recua
    if (localStorage.getItem(DRAFT_KEY) === null && draft.stepIndex >= 3) {
      const hasTarget = Boolean(draft.resume.targetRole);
      const hasSummary = Boolean(draft.resume.summary);
      if (!hasTarget || !hasSummary) draft.stepIndex = Math.min(draft.stepIndex, 3);
    }
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
  const chatLogRef = useRef<HTMLDivElement | null>(null);
  const didStartRef = useRef(false);
  const pendingImportRef = useRef<ImportResult | null>(null);
  const [confirmingImport, setConfirmingImport] = useState(false);
  const [livePreviewUrl, setLivePreviewUrl] = useState<string | null>(null);

  const finished = stepIndex >= STEPS.length;

  // Preview ao vivo após passo 4 (quando já tem nome+objetivo+resumo) — sticky
  useEffect(() => {
    const hasContent = resume.fullName.trim() !== '' || resume.targetRole.trim() !== '' || resume.summary.trim() !== '';
    const shouldPreview = !finished && stepIndex >= 3 && hasContent;
    if (!shouldPreview) {
      if (livePreviewUrl) {
        URL.revokeObjectURL(livePreviewUrl);
        setLivePreviewUrl(null);
      }
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const { buildResumePdf } = await import('./utils/pdfExport');
        const blob = buildResumePdf(resume);
        const url = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        setLivePreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch {
        // preview é secundário — falha silenciosa
      }
    }, 600);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume, stepIndex, finished]);

  useEffect(() => {
    return () => {
      if (livePreviewUrl) URL.revokeObjectURL(livePreviewUrl);
    };
  }, [livePreviewUrl]);

  useEffect(() => {
    if (draftTimerRef.current !== null) window.clearTimeout(draftTimerRef.current);
    if (resume === EMPTY_RESUME && stepIndex === 0) return;
    draftTimerRef.current = window.setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ resume, stepIndex } satisfies Draft));
      } catch {
        // modo privado ou cota cheia — o app segue funcionando sem rascunho
      }
    }, 400);
  }, [resume, stepIndex]);

  function pushMessage(from: Message['from'], text: string) {
    setMessages((current) => [...current, { id: nextIdRef.current, from, text }]);
    nextIdRef.current += 1;
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
      // StrictMode desmonta/remonta em dev: libera a guarda para a remontagem recomeçar.
      didStartRef.current = false;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const box = chatLogRef.current;
    if (!box) return;
    if (typeof box.scrollTo === 'function') {
      box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
    } else {
      box.scrollTop = box.scrollHeight;
    }
  }, [messages, isTyping]);

  const currentStep = STEPS[stepIndex];
  const inputDisabled = isTyping || finished;
  const isFormStep =
    currentStep?.id === 'experiences'
    || currentStep?.id === 'photo'
    || currentStep?.id === 'layout'
    || currentStep?.id === 'contact';

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
    if (target < 0) return;
    flushBot();
    setDraftText('');
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

  function skipPhoto() {
    if (!currentStep || currentStep.id !== 'photo' || finished) return;
    flushBot();
    pushMessage('user', 'Pular esta etapa');
    setResume((prev) => ({ ...prev, photo: '', photoCircle: '' }));
    advanceStep();
  }

  function submitContact(contact: string) {
    if (!currentStep || currentStep.id !== 'contact' || finished) return;
    flushBot();
    pushMessage('user', contact ? `Contato: ${contact}` : 'Pular esta etapa');
    setResume((prev) => ({ ...prev, contact }));
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
      const formName =
        currentStep.id === 'photo'
          ? '"Escolher foto (3x4)"'
          : currentStep.id === 'contact'
            ? 'o formulário de contato'
            : 'o formulário de experiências';
      botSay(`Para esta etapa, use ${formName} aqui embaixo.`);
      return;
    }

    if (isTyping) return;

    // Validação real via FIELD_CONSTRAINTS antes de avançar
    if (!isSkip) {
      const raw = rawText.trim();
      const constraints = FIELD_CONSTRAINTS[currentStep.id as keyof typeof FIELD_CONSTRAINTS] as { maxLength?: number; pattern?: RegExp } | undefined;
      if (constraints?.maxLength !== undefined && raw.length > constraints.maxLength) {
        const max = constraints.maxLength;
        flushBot();
        botSay(`Esse campo tem limite de ${max} caracteres e você enviou ${raw.length}. Tente resumir um pouco.`);
        return;
      }
      if (constraints?.pattern && raw.length > 0 && !constraints.pattern.test(raw)) {
        flushBot();
        botSay('Esse campo contém caracteres não permitidos. Use apenas letras, números e pontuação simples.');
        return;
      }
    }

    const storedValue =
      !isSkip && currentStep.id === 'fullName' ? cleanFullName(rawText.trim()) : isSkip ? '' : rawText.trim();

    pushMessage('user', text);
    setResume((prev) => ({ ...prev, [currentStep.id]: storedValue }));

    advanceStep();
  }

  function handleRestart() {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // sem acesso ao storage — segue sem limpar
    }
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

  function applyImport(result: ImportResult) {
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

  function handleImported(result: ImportResult) {
    flushBot();
    const hasExistingData = Object.values(resume).some((value) =>
      Array.isArray(value) ? value.length > 0 : typeof value === 'string' && value.trim() !== '',
    );
    if (!hasExistingData) {
      applyImport(result);
      return;
    }
    pendingImportRef.current = result;
    setConfirmingImport(true);
    pushMessage('user', 'Importei meu currículo atual');
    botSay(
      'Você já preencheu alguns campos aqui — importar o arquivo vai substituí-los pelos dados do PDF. Podemos continuar?',
    );
  }

  function confirmReplace() {
    const result = pendingImportRef.current;
    pendingImportRef.current = null;
    setConfirmingImport(false);
    if (result) applyImport(result);
  }

  function cancelReplace() {
    pendingImportRef.current = null;
    setConfirmingImport(false);
    flushBot();
    botSay('Sem problema! Mantive tudo que você já digitou.');
  }

  return (
    <div className="app">
      <a href="#chat-main" className="skip-link">Pular para o conteúdo</a>
      <Header
        step={Math.min(stepIndex + 1, STEPS.length)}
        totalSteps={STEPS.length}
        phase={phaseForStep(stepIndex, finished)}
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
      <div className="app__body">
      <main id="chat-main" className={`chat ${finished ? 'chat--finished' : ''}`}>
        <div
          className="chat__messages"
          role="log"
          aria-label="Conversa com o assistente"
          aria-live="polite"
          ref={chatLogRef}
        >
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {isTyping && <TypingIndicator />}
        </div>
        {finished && (
          <SummaryCard
            resume={resume}
            onRestart={handleRestart}
            onEditField={editField}
            onAccentChange={(hex) => setResume((prev) => ({ ...prev, accentColor: hex }))}
            onGoMatch={() => setMode('match')}
          />
        )}
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
            {currentStep?.id === 'photo' && (
              <>
                <PhotoUpload disabled={false} onPhoto={submitPhoto} />
                <button type="button" className="chip chip--skip photo-skip" onClick={skipPhoto}>
                  Pular foto por agora — dá para adicionar no painel final
                </button>
              </>
            )}
            {currentStep?.id === 'contact' && (
              <ContactForm initial={resume.contact} disabled={isTyping} onSave={submitContact} />
            )}
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
            {stepIndex <= 2 && !isTyping && !confirmingImport && !finished && (
              <ImportResume variant="chat" onImported={handleImported} />
            )}
            {stepIndex > 2 && stepIndex < 4 && !isTyping && !finished && (
              <p style={{fontSize:'12px', color:'var(--text-muted)', padding:'0 4px'}}>Dica: você pode importar um PDF/DOCX a qualquer momento no painel final para comparar via Alfa Match.</p>
            )}
            {livePreviewUrl && !finished && stepIndex >= 3 && (
              <div className="live-preview" aria-label="Prévia ao vivo do currículo">
                <div className="live-preview__header">
                  <span>Prévia ao vivo</span>
                  <span className="live-preview__hint">atualiza enquanto você digita</span>
                </div>
                <iframe title="Prévia do currículo" src={livePreviewUrl} className="live-preview__frame" loading="lazy" />
              </div>
            )}
            {confirmingImport && (
              <div className="import-confirm">
                <button type="button" className="chip chip--save" onClick={confirmReplace}>
                  Sim, usar os dados do arquivo
                </button>
                <button type="button" className="chip" onClick={cancelReplace}>
                  Não, manter o que digitei
                </button>
              </div>
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
      {!finished && <ResumeDoc resume={resume} finished={finished} />}
      </div>
      )}
    </div>
  );
}
