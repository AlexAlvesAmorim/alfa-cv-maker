import { useState } from 'react';
import type { ResumeData } from '../types';
import { downloadResumePdf } from '../utils/pdfExport';
import { downloadResumeDocx } from '../utils/docxExport';
import { sendResumeByEmail } from '../utils/emailShare';
import { PdfPreviewModal } from './PdfPreviewModal';

interface SummaryCardProps {
  resume: ResumeData;
  onRestart: () => void;
}

const FIELD_LABELS: Array<{ key: keyof ResumeData; label: string }> = [
  { key: 'fullName', label: 'Nome' },
  { key: 'targetRole', label: 'Objetivo' },
  { key: 'layout', label: 'Modelo escolhido' },
  { key: 'contact', label: 'Contato' },
  { key: 'summary', label: 'Resumo profissional' },
  { key: 'experience', label: 'Experiência' },
  { key: 'education', label: 'Formação' },
  { key: 'skills', label: 'Habilidades' },
  { key: 'languages', label: 'Idiomas' },
];

export function SummaryCard({ resume, onRestart }: SummaryCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: 'error' | 'info' } | null>(null);
  const [emailBusy, setEmailBusy] = useState(false);

  function handleDownload(kind: 'pdf' | 'docx') {
    setNotice(null);
    try {
      if (kind === 'pdf') {
        downloadResumePdf(resume);
      } else {
        void downloadResumeDocx(resume);
      }
    } catch {
      setNotice({ text: 'Não foi possível gerar o arquivo. Tente novamente.', tone: 'error' });
    }
  }

  async function handleEmail() {
    setNotice(null);
    setEmailBusy(true);
    try {
      const result = await sendResumeByEmail(resume);
      setNotice(
        result === 'shared'
          ? { text: 'Compartilhamento aberto — escolha seu app de e-mail.', tone: 'info' }
          : { text: 'Baixamos o PDF e abrimos seu e-mail — só anexar e enviar.', tone: 'info' },
      );
    } catch {
      setNotice({ text: 'Envio cancelado ou indisponível neste navegador.', tone: 'error' });
    } finally {
      setEmailBusy(false);
    }
  }

  return (
    <section className="summary-card">
      <h2 className="summary-card__title">Resumo do seu currículo</h2>
      <dl className="summary-card__grid">
        {FIELD_LABELS.map(({ key, label }) => (
          <div className="summary-card__item" key={key}>
            <dt>{label}</dt>
            <dd>{resume[key] || 'Não informado'}</dd>
          </div>
        ))}
        <div className="summary-card__item">
          <dt>Foto 3x4</dt>
          <dd>{resume.photo ? 'Adicionada (entra no modelo Moderno/Executivo/Clean/Minimal)' : 'Não informada'}</dd>
        </div>
      </dl>
      <div className="summary-card__actions">
        <button type="button" className="btn btn--primary" onClick={() => setPreviewOpen(true)}>
          Pré-visualizar PDF
        </button>
        <button type="button" className="btn btn--outline" onClick={() => handleDownload('pdf')}>
          Baixar PDF
        </button>
        <button type="button" className="btn btn--outline" onClick={() => handleDownload('docx')}>
          Baixar DOCX
        </button>
        <button type="button" className="btn btn--outline" disabled={emailBusy} onClick={() => void handleEmail()}>
          {emailBusy ? 'Abrindo e-mail...' : 'Enviar por e-mail'}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onRestart}>
          Recomeçar
        </button>
      </div>
      {notice && <p className={`summary-card__notice ${notice.tone === 'error' ? 'is-error' : ''}`}>{notice.text}</p>}
      {previewOpen && <PdfPreviewModal resume={resume} onClose={() => setPreviewOpen(false)} />}
    </section>
  );
}
