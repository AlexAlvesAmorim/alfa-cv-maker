import type { AtsResult } from '../utils/atsAnalyzer';

function KeywordGroup({
  title,
  matched,
  missing,
}: {
  title: string;
  matched: string[];
  missing: string[];
}) {
  if (matched.length === 0 && missing.length === 0) return null;
  return (
    <div className="ats-group">
      <h4 className="ats-group__title">{title}</h4>
      <div className="ats-group__keywords">
        {matched.map((keyword) => (
          <span className="ats-keyword ats-keyword--matched" key={`m-${keyword}`}>
            {keyword}
          </span>
        ))}
        {missing.map((keyword) => (
          <span className="ats-keyword ats-keyword--missing" key={`f-${keyword}`} title="Não encontrada no seu currículo">
            {keyword} +
          </span>
        ))}
      </div>
    </div>
  );
}

export function AtsReport({ result }: { result: AtsResult }) {
  return (
    <div className="ats-analyzer__result">
      <div className={`ats-verdict ats-verdict--${result.verdict.tone}`}>
        <span className="ats-verdict__score">{result.score}%</span>
        <div>
          <span className="ats-verdict__label">{result.verdict.label}</span>
          <p className="ats-verdict__message">{result.verdict.message}</p>
        </div>
      </div>

      {result.strongMatches.length > 0 && (
        <p className="ats-strong">
          Encontrados com força nas suas habilidades e experiências:{' '}
          <strong>{result.strongMatches.slice(0, 8).join(', ')}</strong>
          {result.strongMatches.length > 8 && ` +${result.strongMatches.length - 8}`}
        </p>
      )}

      <KeywordGroup title="Requisitos da vaga" matched={result.required.matched} missing={result.required.missing} />
      <KeywordGroup title="Diferenciais" matched={result.differentials.matched} missing={result.differentials.missing} />
      <KeywordGroup
        title="Outros termos da descrição"
        matched={result.general.matched.slice(0, 12)}
        missing={result.general.missing.slice(0, 12)}
      />
      <p className="ats-analyzer__detail">
        {result.totalKeywords} palavras-chave identificadas na descrição da vaga. Adicione os termos ausentes
        apenas se forem verdade sobre você — inventar experiências derruba você na entrevista.
      </p>
    </div>
  );
}
