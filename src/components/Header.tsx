import { ArrowLeft } from 'lucide-react';
import { Logo } from './Logo';
import { ThemePicker } from './ThemePicker';

interface HeaderProps {
  step: number;
  totalSteps: number;
  phase: string;
  mode: 'chat' | 'match';
  onModeChange: (mode: 'chat' | 'match') => void;
}

export function Header({ step, totalSteps, phase, mode, onModeChange }: HeaderProps) {
  const progress = Math.round((step / totalSteps) * 100);
  const inChat = mode === 'chat';

  // Compact progress for mobile: just "Etapa X de Y" + visible bar
  const compactProgress = inChat ? (
    <div
      className="header__progress header__progress--compact"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
      aria-label={`Etapa ${step} de ${totalSteps}`}
    >
      <div className="header__progress-bar">
        <div className="header__progress-fill" style={{ transform: `scaleX(${progress / 100})` }} />
      </div>
      <span className="header__progress-label">Etapa {step} de {totalSteps}</span>
    </div>
  ) : null;

  // Full progress for desktop: phase + step/total
  const fullProgress = inChat ? (
    <div
      className="header__progress header__progress--full"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
      aria-label={`${phase} — etapa ${step} de ${totalSteps}`}
    >
      <div className="header__progress-bar">
        <div className="header__progress-fill" style={{ transform: `scaleX(${progress / 100})` }} />
      </div>
      <span className="header__progress-label">{phase}</span>
    </div>
  ) : null;

  return (
    <header className="header">
      <div className="header__brand">
        <span className="header__logo">
          <Logo size={42} />
        </span>
        <div>
          <h1 className="header__title">
            Alfa <span>Curriculum Maker</span>
          </h1>
          <p className="header__subtitle" aria-live="polite">
            {inChat ? 'Monte seu currículo apenas conversando' : 'Alfa Match — o encaixe entre currículo e vaga'}
          </p>
        </div>
      </div>

      <div className="header__side">
        {fullProgress}
        {compactProgress}
        <ThemePicker />
        <button
          type="button"
          className={`header__mode-btn ${!inChat ? 'header__mode-btn--active' : ''}`}
          aria-pressed={!inChat}
          onClick={() => onModeChange(inChat ? 'match' : 'chat')}
        >
          {!inChat ? (
            <>
              <ArrowLeft size={14} aria-hidden="true" /> Assistente
            </>
          ) : (
            'Alfa Match'
          )}
        </button>
      </div>
    </header>
  );
}