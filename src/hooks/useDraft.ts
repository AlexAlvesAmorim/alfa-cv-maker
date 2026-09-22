import { useEffect, useState } from 'react';
import { EMPTY_RESUME, type ResumeData } from '../types';
import { STEPS } from '../data/steps';

export const DRAFT_KEY = 'alfa-cv-draft-v3';

export interface Draft {
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

/** Rascunho automático em localStorage (com fallback sem foto se estourar a cota). */
export function useDraft() {
  // Lazy initializer: lê o storage uma vez por montagem, sem ref durante o render.
  const [initialDraft] = useState<Draft | null>(loadDraft);
  const [resume, setResume] = useState<ResumeData>(() => ({ ...EMPTY_RESUME, ...(initialDraft?.resume ?? {}) }));
  const [stepIndex, setStepIndex] = useState(() => initialDraft?.stepIndex ?? 0);

  useEffect(() => {
    if (resume === EMPTY_RESUME && stepIndex === 0) return;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ resume, stepIndex } satisfies Draft));
      } catch {
        try {
          // Foto em base64 estoura a cota do localStorage (~5MB).
          // Tenta de novo sem a foto: o texto continua salvo, a foto fica só na sessão.
          const { photo: _photo, photoCircle: _photoCircle, ...resumeWithoutPhoto } = resume;
          localStorage.setItem(
            DRAFT_KEY,
            JSON.stringify({ resume: { ...resumeWithoutPhoto, photo: '', photoCircle: '' }, stepIndex } satisfies Draft),
          );
        } catch {
          // modo privado ou cota cheia — o app segue funcionando sem rascunho
        }
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [resume, stepIndex]);

  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // sem acesso ao storage — segue sem limpar
    }
    setResume(EMPTY_RESUME);
    setStepIndex(0);
  }

  return { resume, setResume, stepIndex, setStepIndex, clearDraft, initialDraft };
}
