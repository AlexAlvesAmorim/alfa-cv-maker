import { useEffect, useRef, type ReactNode } from 'react';

// as 4 fases que aparecem no modal, na ordem
const ANALYSIS_STEPS = [
  'Carregando',
  'Verificando compatibilidade',
  'Terminando análise',
  'Análise concluída',
];

interface AnalysisModalProps {
  step: number;
  score: number | null;
  tone: 'high' | 'mid' | 'low';
  label: string;
  report?: ReactNode;
  onCancel: () => void;
  onClose: () => void;
}

export function AnalysisModal({ step, score, tone, label, report, onCancel, onClose }: AnalysisModalProps) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const done = step >= ANALYSIS_STEPS.length - 1;

  useEffect(() => {
    boxRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  function closeOnOverlay(event: React.MouseEvent) {
    if (event.target === event.currentTarget) onCancel();
  }

  return (
    <div className="modal-overlay" onClick={closeOnOverlay}>
      <div
        ref={boxRef}
        className={`modal analysis-modal ${done && report ? 'analysis-modal--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Analisando compatibilidade com a vaga"
        tabIndex={-1}
      >
        <div className="modal__header">
          <h2 className="modal__title">Alfa Match — analisando</h2>
          <button type="button" className="modal__close" onClick={onCancel} aria-label="Cancelar análise">
            ✕
          </button>
        </div>
        <div className="modal__body analysis-modal__body">
          <div className={`analysis-modal__ring ${done ? `analysis-modal__ring--${tone}` : ''}`} aria-hidden="true">
            {done && score !== null ? (
              <span className="analysis-modal__score">{score}%</span>
            ) : (
              <span className="photo-upload__spinner analysis-modal__spinner" />
            )}
          </div>
          <p className="analysis-modal__status" role="status" aria-live="polite">
            {done ? 'Análise concluída ✓' : `${ANALYSIS_STEPS[Math.min(step, ANALYSIS_STEPS.length - 1)]}...`}
          </p>
          {done && label !== '' && <p className="analysis-modal__verdict">{label}</p>}
          <div
            className="analysis-modal__bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(((Math.min(step, 3) + 1) / ANALYSIS_STEPS.length) * 100)}
            aria-label="Progresso da análise"
          >
            <span
              className={`analysis-modal__fill ${done ? `analysis-modal__fill--${tone}` : ''}`}
              style={{ width: `${((Math.min(step, 3) + 1) / ANALYSIS_STEPS.length) * 100}%` }}
            />
          </div>
          <ol className="analysis-steps">
            {ANALYSIS_STEPS.map((name, index) => {
              const state = done || index < step ? 'done' : index === step ? 'doing' : 'todo';
              return (
                <li
                  key={name}
                  className={`analysis-step analysis-step--${state}`}
                  aria-current={state === 'doing' ? 'step' : undefined}
                >
                  <span className="analysis-step__mark" aria-hidden="true">
                    {state === 'done' ? '✓' : state === 'doing' ? '' : index + 1}
                    {state === 'doing' && <span className="photo-upload__spinner analysis-step__spinner" />}
                  </span>
                  {name}
                  {state === 'done' && <span className="sr-only"> (concluído)</span>}
                </li>
              );
            })}
          </ol>
          {done && report && <div className="analysis-modal__report">{report}</div>}
        </div>
        <div className="modal__footer">
          {done ? (
            <button type="button" className="btn btn--primary" onClick={onClose} autoFocus>
              Fechar
            </button>
          ) : (
            <button type="button" className="btn btn--outline" onClick={onCancel}>
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
