import { useEffect } from 'react';
import { Modal } from './Modal';
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
      title="Pré-visualização — exatamente como o PDF será gerado"
      onClose={onClose}
      footer={
        <>
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
        </>
      }
    >
      {url ? (
        <iframe className="modal__frame" src={url} title="Pré-visualização do currículo" />
      ) : (
        <p className="modal__error">Não foi possível gerar a pré-visualização.</p>
      )}
    </Modal>
  );
}
