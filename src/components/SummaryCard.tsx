import { useEffect, useRef, useState } from 'react';
import { EMPTY_RESUME, type ResumeData, type ResumeField } from '../types';
import { ACCENT_PRESETS, saveBlob } from '../utils/resumeContent';
import { analyzeForJob, type AtsResult } from '../utils/atsAnalyzer';
import { extractFirstUrl, resolveJobDescription } from '../utils/jobUrl';
import { AtsReport } from './AtsReport';
import { ImportResume } from './ImportResume';
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
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [downloaded, setDownloaded] = useState<'pdf' | 'docx' | null>(null);
  const [fetchingJob, setFetchingJob] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [importedResume, setImportedResume] = useState<ResumeData | null>(null);
  const [analysisTarget, setAnalysisTarget] = useState<'maker' | 'imported'>('maker');
  const [comparison, setComparison] = useState<{ maker: number; imported: number | null } | null>(null);
  const downloadedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (downloadedTimerRef.current !== null) window.clearTimeout(downloadedTimerRef.current);
    };
  }, []);

  const contactMissingEmail = resume.contact.trim() !== '' && !/@/.test(resume.contact);
  const jobLength = jobDescription.trim().length;

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
      setDownloaded(kind);
      if (downloadedTimerRef.current !== null) window.clearTimeout(downloadedTimerRef.current);
      downloadedTimerRef.current = window.setTimeout(() => setDownloaded(null), 2500);
      setNotice({
        text: kind === 'pdf' ? 'PDF baixado — confira seus downloads ✓' : 'DOCX baixado — confira seus downloads ✓',
        tone: 'info',
      });
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

  async function handleAnalyze() {
    setFetchError(null);
    let description = jobDescription;
    const url = extractFirstUrl(description);
    if (url && description.trim().length < 400) {
      setFetchingJob(true);
      try {
        description = await resolveJobDescription(description);
        if (description.trim().length < 20) throw new Error('thin');
        setJobDescription(description.slice(0, 4000));
      } catch {
        setFetchError(
          'Não conseguimos ler o anúncio por esse link — alguns sites bloqueiam a leitura automática. '
            + 'Cole o texto da descrição no campo acima.',
        );
        return;
      } finally {
        setFetchingJob(false);
      }
    }

    const makerResult = analyzeForJob(resume, description);
    const importedResult = importedResume ? analyzeForJob(importedResume, description) : null;
    const selectedIsImported = analysisTarget === 'imported' && importedResult !== null;
    setAtsResult(selectedIsImported ? importedResult : makerResult);
    setComparison({ maker: makerResult.score, imported: importedResult ? importedResult.score : null });
  }

  function handleCompareImport(result: { fields: Partial<ResumeData> }) {
    setImportedResume({ ...EMPTY_RESUME, ...result.fields });
    setAnalysisTarget('imported');
  }

  function removeComparison() {
    setImportedResume(null);
    setAnalysisTarget('maker');
    setComparison(null);
  }

  return (
    <section className="summary-card">
      <h2 className="summary-card__title">Pronto! Seu currículo está completo.</h2>
      <p className="summary-card__hint">Revise abaixo, baixe no formato que precisar e, se quiser, ajuste qualquer campo com um clique.</p>

      <section className="summary-card__zone" aria-label="Seu currículo">
        <h3 className="summary-card__zone-title">Seu currículo</h3>
        <dl className="summary-card__grid">
          {FIELD_LABELS.map(({ key, label }) => (
            <div className="summary-card__item" key={key}>
              <dt>{label}</dt>
              <dd>
                <button type="button" className="summary-card__edit" onClick={() => onEditField(key)}>
                  {resume[key] || 'Não informado'}
                </button>
                {key === 'contact' && contactMissingEmail && (
                  <p className="summary-card__warn" role="status">
                    Falta um e-mail no contato — muitos RH descartam currículo sem e-mail.
                  </p>
                )}
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
            <dd>
              <button type="button" className="summary-card__edit" onClick={() => onEditField('photo')}>
                {resume.photo ? 'Adicionada' : 'Não adicionada — clicar para adicionar'}
              </button>
            </dd>
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
              aria-pressed={resume.accentColor === ''}
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
                aria-pressed={resume.accentColor === preset.hex}
                aria-label={preset.name}
                title={preset.name}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="summary-card__zone" aria-label="Baixar e compartilhar">
        <h3 className="summary-card__zone-title">Baixar e compartilhar</h3>
        <div className="summary-card__actions">
          <button type="button" className="btn btn--primary" onClick={() => void handleDownload('pdf')}>
            {downloaded === 'pdf' ? 'Baixado ✓' : 'Baixar PDF'}
          </button>
          <button type="button" className="btn btn--outline" onClick={() => void handlePreview()}>
            Pré-visualizar
          </button>
          <button type="button" className="btn btn--outline" onClick={() => void handleDownload('docx')}>
            {downloaded === 'docx' ? 'Baixado ✓' : 'Baixar DOCX'}
          </button>
          <button type="button" className="btn btn--outline" disabled={emailBusy !== null} onClick={() => void handleEmail()}>
            {emailBusy === 'email' ? 'Abrindo e-mail...' : 'Enviar por e-mail'}
          </button>
          <button type="button" className="btn btn--outline" disabled={emailBusy !== null} onClick={() => void handleCoverLetter()}>
            {emailBusy === 'letter' ? 'Gerando...' : 'Carta de apresentação'}
          </button>
        </div>
        {notice && (
          <p role="status" className={`summary-card__notice ${notice.tone === 'error' ? 'is-error' : ''}`}>
            {notice.text}
          </p>
        )}
      </section>

      <section className="summary-card__zone ats-analyzer" aria-label="Analisador de vaga">
        <h3 className="ats-analyzer__title">Analisar compatibilidade com a vaga (score ATS)</h3>
        <p className="ats-analyzer__hint">
          Cole a descrição da vaga — ou só o link do anúncio (LinkedIn, Gupy, Catho, Nerdin...) — e veja o quão
          alinhado seu currículo está com as palavras-chave dela.
        </p>
        <textarea
          className="ats-analyzer__input"
          placeholder="Cole a descrição da vaga ou o link do anúncio..."
          value={jobDescription}
          onChange={(event) => setJobDescription(event.target.value)}
          rows={4}
          aria-label="Descrição ou link da vaga"
        />
        {fetchError && (
          <p className="summary-card__warn" role="status">
            {fetchError}
          </p>
        )}
        {!importedResume && <ImportResume variant="compare" onImported={handleCompareImport} />}
        {importedResume && (
          <div className="summary-card__segmented" role="group" aria-label="Currículo em análise">
            <button
              type="button"
              aria-pressed={analysisTarget === 'maker'}
              onClick={() => setAnalysisTarget('maker')}
            >
              Criado no Maker
            </button>
            <button
              type="button"
              aria-pressed={analysisTarget === 'imported'}
              onClick={() => setAnalysisTarget('imported')}
            >
              Meu PDF importado
            </button>
            <button
              type="button"
              className="summary-card__uncompare"
              onClick={removeComparison}
              aria-label="Remover currículo importado da comparação"
            >
              ✕
            </button>
          </div>
        )}
        <button
          type="button"
          className="btn btn--outline"
          disabled={jobLength < 20 || fetchingJob}
          onClick={() => void handleAnalyze()}
        >
          {fetchingJob ? 'Buscando a vaga...' : 'Analisar compatibilidade'}
        </button>
        {jobLength < 20 && !fetchingJob && (
          <p className="ats-analyzer__requirement" role="status">
            {jobLength === 0
              ? 'Cole o texto da vaga (ou o link dela) acima para liberar o botão.'
              : `Falta pouco — cole mais um pouco da vaga para liberar a análise (${jobLength}/20 caracteres).`}
          </p>
        )}
        <div aria-live="polite">
          {comparison && comparison.imported !== null && (
            <div className="summary-card__compare">
              <div
                className={`compare-pill ${comparison.maker >= comparison.imported ? 'compare-pill--winner' : ''}`}
              >
                <span className="compare-pill__label">Criado no Maker</span>
                <span className="compare-pill__score">{comparison.maker}%</span>
                {comparison.maker >= comparison.imported && (
                  <span className="compare-pill__tag">Melhor encaixe nesta vaga</span>
                )}
              </div>
              <div
                className={`compare-pill ${comparison.imported > comparison.maker ? 'compare-pill--winner' : ''}`}
              >
                <span className="compare-pill__label">Meu PDF importado</span>
                <span className="compare-pill__score">{comparison.imported}%</span>
                {comparison.imported > comparison.maker && (
                  <span className="compare-pill__tag">Melhor encaixe nesta vaga</span>
                )}
              </div>
            </div>
          )}
          {atsResult && <AtsReport result={atsResult} />}
        </div>
      </section>

      <footer className="summary-card__danger">
        {confirmRestart ? (
          <>
            <span role="alert">Isso apaga tudo que você preencheu neste navegador.</span>
            <button type="button" className="btn btn--danger" onClick={onRestart}>
              Sim, apagar tudo
            </button>
            <button type="button" className="btn btn--outline" onClick={() => setConfirmRestart(false)}>
              Não, manter meu currículo
            </button>
          </>
        ) : (
          <button type="button" className="btn btn--ghost" onClick={() => setConfirmRestart(true)}>
            Recomeçar do zero
          </button>
        )}
      </footer>

      {previewUrl && <PdfPreviewModal url={previewUrl} resume={resume} onClose={() => setPreviewUrl(null)} />}
    </section>
  );
}
