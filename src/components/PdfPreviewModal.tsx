import { useEffect } from 'react';
import { Modal } from './Modal';
import { PrintPreview } from './PrintPreview';
import type { ResumeData } from '../types';

interface PdfPreviewModalProps {
  url: string;
  resume: ResumeData;
  onClose: () => void;
}

export function PdfPreviewModal({ url, resume, onClose }: PdfPreviewModalProps) {
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  return (
    <Modal
      size="print"
      eyebrow="Prévia de impressão · A4 · PDF"
      title="Pré-visualização — exatamente como o PDF será gerado"
      onClose={onClose}
      footer={
        <>
          <p className="modal__note">Confira margens e quebras antes de baixar.</p>
          <div className="modal__actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void import('../utils/pdfExport').then((module) => module.downloadResumePdf(resume))}
            >
              Baixar PDF
            </button>
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Fechar
            </button>
          </div>
        </>
      }
    >
      {url ? (
        <PrintPreview
          url={url}
          title="Pré-visualização do currículo"
          metaLeft="Saída final · folha A4"
        />
      ) : (
        <p className="modal__error">Não foi possível gerar a pré-visualização.</p>
      )}
    </Modal>
  );
}
