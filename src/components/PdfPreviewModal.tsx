import { useEffect, useState } from 'react';
import type { ResumeData } from '../types';
import { buildResumePdf, downloadResumePdf } from '../utils/pdfExport';

interface PdfPreviewModalProps {
  resume: ResumeData;
  onClose: () => void;
}

export function PdfPreviewModal({ resume, onClose }: PdfPreviewModalProps) {
  const [url] = useState(() => {
    try {
      return URL.createObjectURL(buildResumePdf(resume));
    } catch {
      return '';
    }
  });
  const error = url === '';

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Pré-visualização do currículo em PDF"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal__header">
          <h2 className="modal__title">Pré-visualização — exatamente como o PDF será gerado</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>
        <div className="modal__body">
          {error ? (
            <p className="modal__error">{error}</p>
          ) : (
            <iframe className="modal__frame" src={url} title="Pré-visualização do currículo" />
          )}
        </div>
        <div className="modal__footer">
          <button type="button" className="btn btn--primary" onClick={() => downloadResumePdf(resume)}>
            Baixar PDF
          </button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
