import { Logo } from './Logo';

interface HeaderProps {
  step: number;
  totalSteps: number;
  mode: 'chat' | 'match';
  onModeChange: (mode: 'chat' | 'match') => void;
}

export function Header({ step, totalSteps, mode, onModeChange }: HeaderProps) {
  const progress = Math.round((step / totalSteps) * 100);
  const inChat = mode === 'chat';

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
          <p className="header__subtitle">
            {inChat ? 'Monte seu currículo apenas conversando' : 'Alfa Match — o encaixe entre currículo e vaga'}
          </p>
        </div>
      </div>

      <div className="header__side">
        {inChat && (
          <div
            className="header__progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-label={`Etapa ${step} de ${totalSteps}`}
          >
            <div className="header__progress-bar">
              <div className="header__progress-fill" style={{ transform: `scaleX(${progress / 100})` }} />
            </div>
            <span className="header__progress-label">{step}/{totalSteps}</span>
          </div>
        )}
        <button
          type="button"
          className={`header__mode-btn ${!inChat ? 'header__mode-btn--active' : ''}`}
          aria-pressed={!inChat}
          onClick={() => onModeChange(inChat ? 'match' : 'chat')}
        >
          {!inChat ? '← Assistente' : 'Alfa Match'}
        </button>
      </div>
    </header>
  );
}
