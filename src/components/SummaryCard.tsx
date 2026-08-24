import { useState } from 'react';
import type { ResumeData, ResumeField } from '../types';
import { ACCENT_PRESETS, saveBlob } from '../utils/resumeContent';
import { analyzeForJob, type AtsResult } from '../utils/atsAnalyzer';
import { AtsReport } from './AtsReport';
import { PdfPreviewModal } from './PdfPreviewModal';

interface SummaryCardProps {
  resume: ResumeData;
  onRestart: () => void;
  onEditField: (field: ResumeField) => void;
  onAccentChange: (hex: string) => void;
}

const FIELD_LABELS: Array<{ key: 'fullName' | 'targetRole' | 'layout' | 'contact' | 'summary' | 'education' | 'skills' | 'languages'; label: string }> = [
  { key: 'fullName', label: 'Nome' },
  { key: 'targetRole', label: 'Objetivo' },
  { key: 'layout', label: 'Modelo escolhido' },
  { key: 'contact', label: 'Contato' },
  { key: 'summary', label: 'Resumo profissional' },
  { key: 'education', label: 'Formação' },
  { key: 'skills', label: 'Habilidades' },
  { key: 'languages', label: 'Idiomas' },
];

export function SummaryCard({ resume, onRestart, onEditField, onAccentChange }: SummaryCardProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; tone: 'error' | 'info' } | null>(null);
  const [emailBusy, setBusy] = useState<'email' | 'letter' | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [atsResult, setAtsResult] = useState<AtsResult | null>(null);

  async function handleDownload(kind: 'pdf' | 'docx') {
    setNotice(null);
    try {
      if (kind === 'pdf') {
        const { downloadResumePdf } = await import('../utils/pdfExport');
        downloadResumePdf(resume);
      } else {
        const { downloadResumeDocx } = await import('../utils/docxExport');
        await downloadResumeDocx(resume);
      }
    } catch {
      setNotice({ text: 'Não foi possível gerar o arquivo. Tente novamente.', tone: 'error' });
    }
  }

  async function handlePreview() {
    setNotice(null);
    try {
      const { buildResumePdf } = await import('../utils/pdfExport');
      setPreviewUrl(URL.createObjectURL(buildResumePdf(resume)));
    } catch {
      setNotice({ text: 'Não foi possível gerar a pré-visualização.', tone: 'error' });
    }
  }

  async function handleEmail() {
    setNotice(null);
    setBusy('email');
    try {
      const { sendResumeByEmail } = await import('../utils/emailShare');
      const result = await sendResumeByEmail(resume);
      setNotice(
        result === 'shared'
          ? { text: 'Compartilhamento aberto — escolha seu app de e-mail.', tone: 'info' }
          : { text: 'Baixamos o PDF e abrimos seu e-mail — só anexar e enviar.', tone: 'info' },
      );
    } catch {
      setNotice({ text: 'Envio cancelado ou indisponível neste navegador.', tone: 'error' });
    } finally {
      setBusy(null);
    }
  }

  async function handleCoverLetter() {
    setNotice(null);
    setBusy('letter');
    try {
      const { buildCoverLetterPdf } = await import('../utils/coverLetter');
      const blob = buildCoverLetterPdf(resume);
      saveBlob(blob, `carta-apresentacao-${resume.fullName.toLowerCase().replace(/\s+/g, '-') || 'alfa'}.pdf`);
    } catch {
      setNotice({ text: 'Não foi possível gerar a carta. Tente novamente.', tone: 'error' });
    } finally {
      setBusy(null);
    }
  }

  function handleAnalyze() {
    setAtsResult(analyzeForJob(resume, jobDescription));
  }

  return (
    <section className="summary-card">
      <h2 className="summary-card__title">Resumo do seu currículo</h2>
      <p className="summary-card__hint">Clique em qualquer campo para editá-lo no chat.</p>
      <dl className="summary-card__grid">
        {FIELD_LABELS.map(({ key, label }) => (
          <div className="summary-card__item" key={key}>
            <dt>{label}</dt>
            <dd>
              <button type="button" className="summary-card__edit" onClick={() => onEditField(key)}>
                {resume[key] || 'Não informado'}
              </button>
            </dd>
          </div>
        ))}
        <div className="summary-card__item">
          <dt>Experiências</dt>
          <dd>
            <button type="button" className="summary-card__edit" onClick={() => onEditField('experiences')}>
              {resume.experiences.length > 0
                ? resume.experiences.map((experience) => experience.role).join(', ')
                : 'Não informadas'}
            </button>
          </dd>
        </div>
        <div className="summary-card__item">
          <dt>Foto 3x4</dt>
          <dd>{resume.photo ? 'Adicionada' : 'Não informada'}</dd>
        </div>
      </dl>

      <div className="summary-card__accent">
        <span>Cor de destaque:</span>
        <div className="summary-card__swatches">
          <button
            type="button"
            className={`swatch ${resume.accentColor === '' ? 'swatch--active' : ''}`}
            style={{ background: 'linear-gradient(135deg, #B3121F, #5F0A12)' }}
            onClick={() => onAccentChange('')}
            aria-label="Cor padrão"
            title="Padrão do modelo"
          />
          {ACCENT_PRESETS.map((preset) => (
            <button
              key={preset.hex}
              type="button"
              className={`swatch ${resume.accentColor === preset.hex ? 'swatch--active' : ''}`}
              style={{ background: preset.hex }}
              onClick={() => onAccentChange(preset.hex)}
              aria-label={preset.name}
              title={preset.name}
            />
          ))}
        </div>
      </div>

      <div className="summary-card__actions">
        <button type="button" className="btn btn--primary" onClick={() => void handlePreview()}>
          Pré-visualizar PDF
        </button>
        <button type="button" className="btn btn--outline" onClick={() => void handleDownload('pdf')}>
          Baixar PDF
        </button>
        <button type="button" className="btn btn--outline" onClick={() => void handleDownload('docx')}>
          Baixar DOCX
        </button>
        <button type="button" className="btn btn--outline" disabled={emailBusy !== null} onClick={() => void handleEmail()}>
          {emailBusy === 'email' ? 'Abrindo e-mail...' : 'Enviar por e-mail'}
        </button>
        <button type="button" className="btn btn--outline" disabled={emailBusy !== null} onClick={() => void handleCoverLetter()}>
          {emailBusy === 'letter' ? 'Gerando...' : 'Carta de apresentação'}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onRestart}>
          Recomeçar
        </button>
      </div>
      {notice && <p className={`summary-card__notice ${notice.tone === 'error' ? 'is-error' : ''}`}>{notice.text}</p>}

      <div className="ats-analyzer">
        <h3 className="ats-analyzer__title">Analisador de vaga (score ATS)</h3>
        <p className="ats-analyzer__hint">
          Cole aqui a descrição da vaga e veja o quão alinhado seu currículo está com as palavras-chave dela.
        </p>
        <textarea
          className="ats-analyzer__input"
          placeholder="Cole a descrição da vaga..."
          value={jobDescription}
          onChange={(event) => setJobDescription(event.target.value)}
          rows={4}
        />
        <button type="button" className="btn btn--outline" disabled={jobDescription.trim().length < 20} onClick={handleAnalyze}>
          Analisar compatibilidade
        </button>
        {atsResult && <AtsReport result={atsResult} />}
      </div>

      {previewUrl && <PdfPreviewModal url={previewUrl} resume={resume} onClose={() => setPreviewUrl(null)} />}
    </section>
  );
}
