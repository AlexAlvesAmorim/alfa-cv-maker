import { CircleCheck, TriangleAlert } from 'lucide-react';
import type { AtsResult } from '../utils/atsAnalyzer';
import { blockerBullets, matchedBullets, scopeTitle } from '../utils/matchCard';

interface MatchCardProps {
  result: AtsResult;
  jobTitle: string;
  jobSubtitle: string;
}

export function MatchCard({ result, jobTitle, jobSubtitle }: MatchCardProps) {
  const tone = result.verdict.tone;
  const matched = matchedBullets(result);
  const blockers = blockerBullets(result);

  return (
    <article className="match-card" aria-label={`Resultado da vaga ${jobTitle}: ${result.score} por cento`}>
      <header className="match-card__head">
        <div className="match-card__titles">
          <h3 className="match-card__title">{jobTitle}</h3>
          {jobSubtitle && <p className="match-card__subtitle">{jobSubtitle}</p>}
        </div>
        <span
          className={`match-card__score match-card__score--${tone}`}
          aria-label={`Compatibilidade de ${result.score} por cento`}
        >
          {result.score}%
        </span>
      </header>

      <div
        className="match-card__bar"
        role="progressbar"
        aria-valuenow={result.score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Barra de compatibilidade: ${result.score}%`}
      >
        <span
          className={`match-card__fill match-card__fill--${tone}`}
          style={{ width: `${result.score}%` }}
        />
      </div>

      <section className="match-card__section" aria-label="Pontos fortes">
        <h4 className="match-card__section-title">
          <CircleCheck size={15} aria-hidden="true" className="match-card__icon match-card__icon--ok" />
          {scopeTitle(result.score)}
        </h4>
        {matched.length === 0 ? (
          <p className="match-card__empty" role="status">
            Nenhum termo da vaga encontrado no currículo ainda.
          </p>
        ) : (
          <ul className="match-card__list">
            {matched.map((item) => (
              <li key={item}>{item}.</li>
            ))}
          </ul>
        )}
      </section>

      {blockers.length > 0 && (
        <section className="match-card__section" aria-label="Possíveis impeditivos">
          <h4 className="match-card__section-title">
            <TriangleAlert size={15} aria-hidden="true" className="match-card__icon match-card__icon--warn" />
            Possível impeditivo
          </h4>
          <ul className="match-card__list">
            {blockers.map((item) => (
              <li key={item}>{item}.</li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
