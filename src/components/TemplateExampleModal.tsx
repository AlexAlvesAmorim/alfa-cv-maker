import { useEffect } from 'react';
import { Modal } from './Modal';

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
      title={`Exemplo preenchido — modelo ${label}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--primary" onClick={onUse}>
            Usar este modelo
          </button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Fechar
          </button>
        </>
      }
    >
      <iframe className="modal__frame" src={url} title={`Exemplo de currículo no modelo ${label}`} />
    </Modal>
  );
}
