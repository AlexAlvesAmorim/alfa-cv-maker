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
  onGoMatch: () => void;
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

export function SummaryCard({ resume, onRestart, onEditField, onAccentChange, onGoMatch }: SummaryCardProps) {
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
  const [truncatedNotice, setTruncatedNotice] = useState('');
  const [downloadedEver, setDownloadedEver] = useState(false);
  const downloadedTimerRef = useRef<number | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

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
      setDownloadedEver(true);
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

  async function performAnalysis(target: 'maker' | 'imported', importedData: ResumeData | null) {
    setFetchError(null);
    setTruncatedNotice('');
    let description = jobDescription;
    const url = extractFirstUrl(description);
    if (url && description.trim().length < 400) {
      setFetchingJob(true);
      try {
        description = await resolveJobDescription(description);
        if (description.trim().length < 20) throw new Error('thin');
        if (description.length > 4000) {
          description = description.slice(0, 4000);
          setTruncatedNotice('Descrição longa — analisamos os primeiros 4.000 caracteres.');
        }
        setJobDescription(description);
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
    const importedResult = importedData ? analyzeForJob(importedData, description) : null;
    const selectedIsImported = target === 'imported' && importedResult !== null;
    setAtsResult(selectedIsImported ? importedResult : makerResult);
    setComparison({ maker: makerResult.score, imported: importedResult ? importedResult.score : null });
  }

  function selectTarget(target: 'maker' | 'imported') {
    setAnalysisTarget(target);
    if (jobDescription.trim().length >= 20) {
      void performAnalysis(target, importedResume);
    }
  }

  function handleCompareImport(result: { fields: Partial<ResumeData> }) {
    const built = { ...EMPTY_RESUME, ...result.fields };
    setImportedResume(built);
    setAnalysisTarget('imported');
    if (jobDescription.trim().length >= 20) {
      void performAnalysis('imported', built);
    }
  }

  function removeComparison() {
    setImportedResume(null);
    setAnalysisTarget('maker');
    setComparison(null);
  }

  return (
    <section className="summary-card" aria-label="Currículo pronto">
      <div className={`summary-card__hero ${downloadedEver ? 'summary-card__hero--celebrated' : ''}`}>
        <h2 ref={titleRef} tabIndex={-1} className="summary-card__title">
          {downloadedEver ? 'Currículo na mão ✓' : 'Pronto! Seu currículo está completo.'}
        </h2>
        <p className="summary-card__hint">Baixe agora — revise abaixo se quiser ajustar antes de enviar.</p>
        <button type="button" className="btn btn--primary btn--hero" onClick={() => void handleDownload('pdf')}>
          {downloaded === 'pdf' ? 'Baixado ✓' : 'Baixar PDF'}
        </button>
        <div className="summary-card__secondary">
          <button type="button" className="btn btn--outline" onClick={() => void handlePreview()}>
            Pré-visualizar
          </button>
          <button type="button" className="btn btn--outline" onClick={() => void handleDownload('docx')}>
            {downloaded === 'docx' ? 'Baixado ✓' : 'Baixar DOCX'}
          </button>
        </div>
        <details className="summary-card__more">
          <summary>Mais opções de envio</summary>
          <div className="summary-card__more-actions">
            <button type="button" className="btn btn--outline" disabled={emailBusy !== null} onClick={() => void handleEmail()}>
              {emailBusy === 'email' ? 'Abrindo e-mail...' : 'Enviar por e-mail'}
            </button>
            <button type="button" className="btn btn--outline" disabled={emailBusy !== null} onClick={() => void handleCoverLetter()}>
              {emailBusy === 'letter' ? 'Gerando...' : 'Carta de apresentação'}
            </button>
          </div>
        </details>
        {!downloaded && (
          <p className="summary-card__hint summary-card__hint--tip" role="note">
            Dica: use Pré-visualizar para conferir antes de baixar.
          </p>
        )}
        {notice && (
          <p role="status" className={`summary-card__notice ${notice.tone === 'error' ? 'is-error' : ''}`}>
            {notice.text}
          </p>
        )}
        {downloadedEver && (
          <div className="summary-card__next">
            <p className="summary-card__next-text">
              <strong>Último passo antes de enviar:</strong> teste o encaixe do seu currículo com a vaga — palavra por palavra.
            </p>
            <button type="button" className="btn btn--primary" onClick={onGoMatch}>
              Testar no Alfa Match
            </button>
          </div>
        )}
      </div>

      <details className="summary-card__review">
        <summary className="summary-card__review-summary">
          <span>Seu currículo</span>
          <span className="summary-card__review-hint">10 campos · toque para revisar</span>
        </summary>
        <div className="summary-card__review-body">
        <dl className="summary-card__grid">
          {FIELD_LABELS.map(({ key, label }) => (
            <div className="summary-card__item" key={key}>
              <dt>{label}</dt>
              <dd>
                <button
                  type="button"
                  className="summary-card__edit"
                  onClick={() => onEditField(key)}
                  aria-label={`Editar ${label}: ${resume[key] || 'não informado'}`}
                >
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
              <button type="button" className="summary-card__edit" onClick={() => onEditField('experiences')} aria-label={`Editar Experiências: ${resume.experiences.length > 0 ? resume.experiences.map((experience) => experience.role).join(', ') : 'não informadas'}`}>
                {resume.experiences.length > 0
                  ? resume.experiences.map((experience) => experience.role).join(', ')
                  : 'Não informadas'}
              </button>
            </dd>
          </div>
          <div className="summary-card__item">
            <dt>Foto 3x4</dt>
            <dd>
              <button type="button" className="summary-card__edit" onClick={() => onEditField('photo')} aria-label={`Editar Foto 3x4: ${resume.photo ? 'adicionada' : 'não adicionada'}`}>
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
        </div>
      </details>

      <details className="summary-card__ats-toggle">
        <summary>Já baixou? Analise a compatibilidade com a vaga <span style={{fontWeight:400, color:'var(--text-muted)'}}>— opcional, ATS explica o encaixe palavra a palavra</span></summary>
        <section className="summary-card__zone ats-analyzer" aria-label="Analisador de vaga">
        <h3 className="ats-analyzer__title">Alfa Match — score ATS da vaga</h3>
        <p className="ats-analyzer__hint">
          ATS é o robô que filtra currículos antes do RH. Cole a descrição da vaga — ou só o link (LinkedIn, Gupy, Catho) — e veja o quão
          alinhado seu currículo está. Só inclua no currículo o que for verdade sobre você.
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
          <p className="summary-card__warn" role="alert">
            {fetchError} <button type="button" className="chip" style={{marginLeft:8}} onClick={() => void performAnalysis(analysisTarget, importedResume)}>Tentar novamente</button>
          </p>
        )}
        {!importedResume && <ImportResume variant="compare" onImported={handleCompareImport} />}
        {importedResume && (
          <div className="summary-card__segmented" role="group" aria-label="Currículo em análise">
            <button
              type="button"
              aria-pressed={analysisTarget === 'maker'}
              onClick={() => selectTarget('maker')}
            >
              Criado no Maker
            </button>
            <button
              type="button"
              aria-pressed={analysisTarget === 'imported'}
              onClick={() => selectTarget('imported')}
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
          onClick={() => void performAnalysis(analysisTarget, importedResume)}
        >
          {fetchingJob ? 'Buscando a vaga...' : 'Analisar compatibilidade'}
        </button>
        {truncatedNotice && (
          <p className="ats-analyzer__requirement" role="status">
            {truncatedNotice}
          </p>
        )}
        {jobLength < 20 && !fetchingJob && (
          <p className="ats-analyzer__requirement" role="status">
            {jobLength === 0
              ? 'Cole o texto da vaga (ou o link dela) acima para liberar o botão.'
              : `Falta pouco — cole mais um pouco da vaga para liberar a análise (${jobLength}/20 caracteres).`}
          </p>
        )}
        <div aria-live="polite">
          {comparison && comparison.imported !== null && (
            <>
              <div className="summary-card__compare">
                <div
                  className={`compare-pill ${comparison.maker > comparison.imported ? 'compare-pill--winner' : ''}`}
                >
                  <span className="compare-pill__label">Criado no Maker</span>
                  <span className="compare-pill__score">{comparison.maker}%</span>
                  {comparison.maker > comparison.imported && (
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
              {comparison.maker === comparison.imported && (
                <p className="ats-analyzer__requirement" role="status">
                  Empate técnico — os dois currículos têm o mesmo score nesta vaga.
                </p>
              )}
            </>
          )}
          {atsResult && <AtsReport result={atsResult} />}
        </div>
        </section>
      </details>

      <footer className="summary-card__danger summary-card__danger--subtle">
        {confirmRestart ? (
          <>
            <span role="alert">Isso apaga tudo que você preencheu neste navegador.</span>
            <button type="button" className="btn btn--danger" onClick={onRestart}>
              Sim, apagar tudo
            </button>
            <button type="button" className="btn btn--outline" onClick={() => setConfirmRestart(false)}>
              Não, manter
            </button>
          </>
        ) : (
          <button type="button" className="summary-card__restart-link" onClick={() => setConfirmRestart(true)}>
            Recomeçar do zero
          </button>
        )}
      </footer>

      {previewUrl && <PdfPreviewModal url={previewUrl} resume={resume} onClose={() => setPreviewUrl(null)} />}
    </section>
  );
}
