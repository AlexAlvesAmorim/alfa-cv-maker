import { Logo } from './Logo';

interface HeaderProps {
  step: number;
  totalSteps: number;
}

export function Header({ step, totalSteps }: HeaderProps) {
  const progress = Math.round((step / totalSteps) * 100);

  return (
    <header className="header">
      <div className="header__brand">
        <span className="header__logo">
          <Logo size={44} />
        </span>
        <div>
          <h1 className="header__title">
            Alfa <span>Curriculum Maker</span>
          </h1>
          <p className="header__subtitle">Monte seu currículo apenas conversando</p>
        </div>
      </div>
      <div className="header__progress" aria-label={`Etapa ${step} de ${totalSteps}`}>
        <div className="header__progress-bar">
          <div className="header__progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="header__progress-label">{step}/{totalSteps}</span>
      </div>
    </header>
  );
}
