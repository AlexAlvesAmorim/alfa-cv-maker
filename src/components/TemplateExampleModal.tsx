import { useEffect } from 'react';
import { Modal } from './Modal';
import { PrintPreview } from './PrintPreview';

interface TemplateExampleModalProps {
  url: string;
  label: string;
  onUse: () => void;
  onClose: () => void;
}

export function TemplateExampleModal({ url, label, onUse, onClose }: TemplateExampleModalProps) {
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  return (
    <Modal
      size="print"
      eyebrow="Prévia de impressão · A4 · PDF"
      title={`Exemplo preenchido — modelo ${label}`}
      onClose={onClose}
      footer={
        <>
          <p className="modal__note">O PDF final sai exatamente assim, em folha A4.</p>
          <div className="modal__actions">
            <button type="button" className="btn btn--primary" onClick={onUse}>
              Usar este modelo
            </button>
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Fechar
            </button>
          </div>
        </>
      }
    >
      <PrintPreview
        url={url}
        title={`Exemplo de currículo no modelo ${label}`}
        metaLeft="Documento de exemplo · dados fictícios"
      />
    </Modal>
  );
}
