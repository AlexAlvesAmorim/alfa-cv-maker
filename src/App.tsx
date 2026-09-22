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
import { useDraft } from './hooks/useDraft';
import { useLivePreview } from './hooks/useLivePreview';
import { BOT_DELAY_MS, useChatBot } from './hooks/useChatBot';
import { Modal } from './components/Modal';
import { PrintPreview } from './components/PrintPreview';
import type { ProcessedPhoto } from './utils/photo';
import type { ImportResult } from './utils/resumeImport';
import { FIELD_CONSTRAINTS, SKIP_VALUE, type ResumeField } from './types';
import { FINISH_MESSAGE, STEPS, WELCOME_MESSAGE, phaseForStep } from './data/steps';
import { extraSuggestionsFor, recommendedTemplateId, suggestionsFor } from './data/dynamicSuggestions';
import { findTemplateByInput } from './data/templates';
import { cleanFullName } from './utils/resumeContent';

export default function App() {
  const { resume, setResume, stepIndex, setStepIndex, clearDraft, initialDraft: draft } = useDraft();
  const { messages, isTyping, setIsTyping, pushMessage, botSay, flushBot, resetChat, timerRef } =
    useChatBot(WELCOME_MESSAGE);
  const [draftText, setDraftText] = useState('');
  const [mode, setMode] = useState<'chat' | 'match'>('chat');
  const [returnToSummary, setReturnToSummary] = useState(false);

  const chatLogRef = useRef<HTMLDivElement | null>(null);
  const didStartRef = useRef(false);
  const pendingImportRef = useRef<ImportResult | null>(null);
  const [confirmingImport, setConfirmingImport] = useState(false);
  const [liveExpanded, setLiveExpanded] = useState(false);

  const finished = stepIndex >= STEPS.length;
  const livePreviewUrl = useLivePreview(resume, stepIndex, finished);

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
    clearDraft();
    pendingImportRef.current = null;
    setConfirmingImport(false);
    setDraftText('');
    setReturnToSummary(false);
    resetChat(WELCOME_MESSAGE);
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
              <section className="live-preview" aria-label="Prévia ao vivo do currículo">
                <header className="live-preview__header">
                  <div className="live-preview__id">
                    <span className="live-preview__icon" aria-hidden="true">
                      <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 1.5h5.5L13 5v9.5H4z" />
                        <path d="M9.5 1.5V5H13" />
                        <path d="M6 8h4M6 10.2h4" />
                      </svg>
                    </span>
                    <span className="live-preview__titles">
                      <span className="live-preview__title">
                        Prévia ao vivo
                        <span className="live-badge" aria-label="atualizando ao vivo">
                          <span className="live-badge__dot" aria-hidden="true" />
                          AO VIVO
                        </span>
                      </span>
                      <span className="live-preview__hint">O documento vai ganhando forma enquanto você digita</span>
                    </span>
                  </div>
                  <div className="live-preview__tools">
                    <span className="live-preview__pill">A4 · PDF</span>
                    <button
                      type="button"
                      className="live-preview__expand"
                      onClick={() => setLiveExpanded(true)}
                      aria-label="Ampliar prévia do currículo"
                    >
                      <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M9.5 2.5h4v4M13.5 2.5 9 7M6.5 13.5h-4v-4M2.5 13.5 7 9" />
                      </svg>
                      Ampliar
                    </button>
                  </div>
                </header>
                <div className="live-preview__stage">
                  <div className="live-preview__sheet">
                    <iframe title="Prévia do currículo" src={livePreviewUrl} className="live-preview__frame" loading="lazy" />
                  </div>
                </div>
                <footer className="live-preview__footer">
                  <span>Rascunho automático — sem salvar nada ainda</span>
                  <span className="live-preview__page">página 1 de 1</span>
                </footer>
              </section>
            )}
            {liveExpanded && livePreviewUrl && (
              <Modal
                size="print"
                eyebrow="Prévia de impressão · A4 · PDF"
                title="Seu currículo até aqui"
                onClose={() => setLiveExpanded(false)}
                footer={
                  <>
                    <p className="modal__note">É assim que o PDF está ficando — continue para refinar.</p>
                    <div className="modal__actions">
                      <button type="button" className="btn btn--primary" onClick={() => setLiveExpanded(false)}>
                        Continuar editando
                      </button>
                    </div>
                  </>
                }
              >
                <PrintPreview
                  url={livePreviewUrl}
                  title="Prévia ampliada do currículo"
                  metaLeft="Rascunho ao vivo · atualiza a cada etapa"
                />
              </Modal>
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
