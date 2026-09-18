import type { AtsResult } from '../utils/atsAnalyzer';

function MissingGroup({
  title,
  missing,
  hint,
  tone = 'missing',
}: {
  title: string;
  missing: string[];
  hint?: string;
  tone?: 'missing' | 'info';
}) {
  if (missing.length === 0) return null;
  return (
    <div className="ats-group">
      <h4 className="ats-group__title">{title}</h4>
      {hint && <p className="ats-group__legend">{hint}</p>}
      <div className="ats-group__keywords">
        {missing.map((keyword) => (
          <span
            className={`ats-keyword ${tone === 'info' ? 'ats-keyword--info' : 'ats-keyword--missing'}`}
            key={`f-${keyword}`}
            title={tone === 'info' ? 'Pedido na descrição da vaga' : 'Não encontrada no seu currículo'}
          >
            {keyword}
            {tone === 'missing' && <span className="sr-only"> — ausente no seu currículo</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AtsReport({ result }: { result: AtsResult }) {
  // Stacks aparecem no bloco próprio — fora dos grupos por zona para não duplicar.
  const stackSet = new Set(result.stacks.missing);
  const nonStack = (list: string[]) => list.filter((k) => !stackSet.has(k));
  const reqRest = nonStack(result.required.missing);
  const difRest = nonStack(result.differentials.missing);
  const genRest = nonStack(result.general.missing.slice(0, 12));
  const missingCount =
    result.stacks.missing.length + reqRest.length + difRest.length + genRest.length;
  return (
    <div className="ats-analyzer__result">
      <div className={`ats-verdict ats-verdict--${result.verdict.tone}`}>
        <span className="ats-verdict__score" aria-label={`Compatibilidade de ${result.score} por cento`}>
          {result.score}%
        </span>
        <div className="ats-verdict__body">
          <span className="ats-verdict__label">{result.verdict.label}</span>
          <p className="ats-verdict__message">{result.verdict.message}</p>
          <div
            className="ats-score-bar"
            role="progressbar"
            aria-valuenow={result.score}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Barra de compatibilidade: ${result.score}%`}
          >
            <span
              className={`ats-score-bar__fill ats-score-bar__fill--${result.verdict.tone}`}
              style={{ width: `${result.score}%` }}
            />
          </div>
        </div>
      </div>

      {missingCount === 0 ? (
        <p className="ats-strong" role="status">
          Nada em falta — seu currículo cobre todos os termos identificados na vaga.
        </p>
      ) : (
        <>
          <h3 className="ats-improve-title">O que pode melhorar</h3>
          <p className="ats-group__legend">
            Adicione estes termos ao currículo apenas se forem verdade sobre você.
          </p>
          <MissingGroup
            title="Stacks e ferramentas em falta"
            missing={result.stacks.missing}
            hint="O que o robô mais procura: linguagens, frameworks e ERPs."
          />
          <MissingGroup
            title="Requisitos em falta"
            missing={reqRest}
            hint="Prioridade máxima — formação, função e pontos-chave."
          />
          <MissingGroup
            title="Diferenciais em falta"
            missing={difRest}
          />
          <MissingGroup
            title="Outros termos em falta"
            missing={genRest}
          />
          <MissingGroup
            title="Experiência e nível pedidos"
            missing={result.seniority}
            hint="Confira se o seu currículo deixa isso claro."
            tone="info"
          />
        </>
      )}
      <p className="ats-analyzer__detail">
        {result.totalKeywords} termos relevantes identificados na vaga (benefícios e dados da
        empresa são ignorados). Inventar experiências derruba você na entrevista.
      </p>
    </div>
  );
}
