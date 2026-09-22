import { useState } from 'react';

interface PrintPreviewProps {
  url: string;
  title: string;
  metaLeft: string;
  /** Total de páginas (miniaturas de navegação). Currículos têm 1 na imensa maioria. */
  pages?: number;
}

function withFragment(url: string, fragment: string): string {
  return url.includes('#') ? `${url}&${fragment}` : `${url}#${fragment}`;
}

/**
 * Layout de prévia de impressão: rail fino de miniaturas + página principal ampla.
 * Esconde a sidebar nativa do viewer do PDF (navpanes=0) — ela comia metade
 * da largura — e recoloca a noção de páginas numa rail própria, bem menor.
 */
export function PrintPreview({ url, title, metaLeft, pages = 1 }: PrintPreviewProps) {
  const total = Math.max(1, Math.floor(pages));
  const [page, setPage] = useState(1);
  const current = Math.min(page, total);

  const mainSrc = withFragment(url, `page=${current}&navpanes=0&view=FitH`);

  return (
    <div className="print-stage print-stage--paged">
      <div className="print-meta" aria-hidden="true">
        <span className="print-meta__left">
          <span className="print-meta__dot" />
          {metaLeft}
        </span>
        <span className="print-meta__pill">A4 · 210 × 297 mm</span>
      </div>
      <div className="print-layout">
        <aside className="print-thumbs" aria-label={`Páginas do documento — ${total}`}>
          {Array.from({ length: total }, (_, index) => {
            const number = index + 1;
            const active = number === current;
            return (
              <button
                key={number}
                type="button"
                className={`print-thumb${active ? ' is-active' : ''}`}
                aria-pressed={active}
                aria-label={`Ir para a página ${number}`}
                onClick={() => setPage(number)}
              >
                <span className="print-thumb__paper" aria-hidden="true">
                  <iframe
                    src={withFragment(url, `page=${number}&toolbar=0&navpanes=0&statusbar=0&messages=0&view=Fit`)}
                    title=""
                    tabIndex={-1}
                    scrolling="no"
                    loading="lazy"
                  />
                </span>
                <span className="print-thumb__num">{number}</span>
              </button>
            );
          })}
          <span className="print-thumbs__count" aria-hidden="true">
            {total === 1 ? '1 página' : `${total} páginas`}
          </span>
        </aside>
        <div className="print-sheet">
          <iframe key={current} className="modal__frame" src={mainSrc} title={title} />
        </div>
      </div>
    </div>
  );
}
