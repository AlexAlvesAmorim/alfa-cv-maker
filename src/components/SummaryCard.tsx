import { useEffect, useRef, useState } from 'react';
import { EMPTY_RESUME, type Project, type ResumeData, type ResumeField } from '../types';
import { ACCENT_PRESETS, DENSITY_OPTIONS, densityScale, saveBlob } from '../utils/resumeContent';
import { analyzeForJob, type AtsResult } from '../utils/atsAnalyzer';
import { extractFirstUrl, resolveJobDescription } from '../utils/jobUrl';
import { AtsReport } from './AtsReport';
import { AnalysisModal } from './AnalysisModal';
import { ImportResume } from './ImportResume';
import { PdfPreviewModal } from './PdfPreviewModal';

interface SummaryCardProps {
  resume: ResumeData;
  onRestart: () => void;
  onEditField: (field: ResumeField) => void;
  onAccentChange: (hex: string) => void;
  onResumeUpdate: (fields: Partial<ResumeData>) => void;
  onGoMatch: () => void;
}

const FIELD_LABELS: Array<{ key: 'layout'; label: string }> = [
  { key: 'layout', label: 'Modelo escolhido' },
];

type ManualTextKey = 'fullName' | 'targetRole' | 'contact' | 'summary' | 'education' | 'skills' | 'languages';

const MANUAL_TEXT_FIELDS: Array<{ key: ManualTextKey; label: string; rows: number }> = [
  { key: 'fullName', label: 'Nome', rows: 1 },
  { key: 'targetRole', label: 'Objetivo', rows: 1 },
  { key: 'contact', label: 'Contato', rows: 2 },
  { key: 'summary', label: 'Resumo profissional', rows: 5 },
  { key: 'education', label: 'Formação', rows: 4 },
  { key: 'skills', label: 'Habilidades', rows: 3 },
  { key: 'languages', label: 'Idiomas', rows: 2 },
];

export function SummaryCard({ resume, onRestart, onEditField, onAccentChange, onResumeUpdate, onGoMatch }: SummaryCardProps) {
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
  // null = modal fechado, 0..3 = fase da animacao
  const [modalStep, setModalStep] = useState<number | null>(null);
  // edicao manual inline (sem voltar para o chat)
  const [editingKey, setEditingKey] = useState<ManualTextKey | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const downloadedTimerRef = useRef<number | null>(null);
  const timersRef = useRef<number[]>([]);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      if (downloadedTimerRef.current !== null) window.clearTimeout(downloadedTimerRef.current);
      timers.forEach((timer) => window.clearTimeout(timer));
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

  async function performAnalysis(target: 'maker' | 'imported', importedData: ResumeData | null, showModal = true) {
    if (showModal && modalStep !== null) return;
    setFetchError(null);
    setTruncatedNotice('');
    if (showModal) setModalStep(0);
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
        if (showModal) closeModal();
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
    const selected = selectedIsImported ? importedResult : makerResult;
    if (!showModal) {
      setAtsResult(selected);
      setComparison({ maker: makerResult.score, imported: importedResult ? importedResult.score : null });
      return;
    }
    // a analise em si é rapida, as fases sao pra dar feedback visual
    timersRef.current.push(window.setTimeout(() => setModalStep(1), 700));
    timersRef.current.push(window.setTimeout(() => setModalStep(2), 1500));
    timersRef.current.push(
      window.setTimeout(() => {
        setAtsResult(selected);
        setComparison({ maker: makerResult.score, imported: importedResult ? importedResult.score : null });
        setModalStep(3);
      }, 2200),
    );
  }

  function closeModal() {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    setFetchingJob(false);
    setModalStep(null);
  }

  function seeResult() {
    if (atsResult) setModalStep(3);
  }

  function selectTarget(target: 'maker' | 'imported') {
    setAnalysisTarget(target);
    if (jobDescription.trim().length >= 20) {
      void performAnalysis(target, importedResume, false);
    }
  }

  function handleCompareImport(result: { fields: Partial<ResumeData> }) {
    const built = { ...EMPTY_RESUME, ...result.fields };
    setImportedResume(built);
    setAnalysisTarget('imported');
    if (jobDescription.trim().length >= 20) {
      void performAnalysis('imported', built, false);
    }
  }

  function startManualEdit(key: ManualTextKey) {
    setEditingValue(resume[key] ?? '');
    setEditingKey(key);
  }

  function saveManualEdit() {
    if (editingKey) onResumeUpdate({ [editingKey]: editingValue } as Partial<ResumeData>);
    setEditingKey(null);
  }

  function updateProject(index: number, patch: Partial<Project>) {
    onResumeUpdate({ projects: resume.projects.map((project, i) => (i === index ? { ...project, ...patch } : project)) });
  }

  function removeProject(index: number) {
    onResumeUpdate({ projects: resume.projects.filter((_, i) => i !== index) });
  }

  function addProject() {
    onResumeUpdate({ projects: [...resume.projects, { title: '', stack: '', link: '', bullets: [] }] });
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
          {MANUAL_TEXT_FIELDS.map(({ key, label, rows }) => (
            <div className="summary-card__item" key={key}>
              <dt>{label}</dt>
              <dd>
                {editingKey === key ? (
                  <div className="summary-card__manual">
                    <label className="summary-card__manual-label" htmlFor={`manual-${key}`}>
                      Editar {label.toLowerCase()}
                    </label>
                    <textarea
                      id={`manual-${key}`}
                      className="summary-card__manual-input"
                      rows={rows}
                      value={editingValue}
                      onChange={(event) => setEditingValue(event.target.value)}
                    />
                    <div className="summary-card__manual-actions">
                      <button type="button" className="btn btn--primary" onClick={saveManualEdit}>
                        Salvar
                      </button>
                      <button type="button" className="btn btn--outline" onClick={() => setEditingKey(null)}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="summary-card__text" style={{ whiteSpace: 'pre-line' }}>
                      {resume[key] || 'Não informado'}
                    </p>
                    <button type="button" className="summary-card__edit" onClick={() => startManualEdit(key)} aria-label={`Editar ${label} manualmente`}>
                      Editar
                    </button>
                  </>
                )}
                {key === 'contact' && contactMissingEmail && (
                  <p className="summary-card__warn" role="status">
                    Falta um e-mail no contato — muitos RH descartam currículo sem e-mail.
                  </p>
                )}
              </dd>
            </div>
          ))}
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
            <dt>Projetos</dt>
            <dd>
              {resume.projects.length === 0 && (
                <p className="summary-card__text">Não informados — importe um PDF com projetos para preencher.</p>
              )}
              {resume.projects.map((project, index) => (
                <div className="summary-card__project" key={index}>
                  <label className="summary-card__manual-label" htmlFor={`project-title-${index}`}>
                    Projeto {index + 1} — título
                  </label>
                  <input
                    id={`project-title-${index}`}
                    className="summary-card__manual-input"
                    value={project.title}
                    onChange={(event) => updateProject(index, { title: event.target.value })}
                    placeholder="Nome do projeto"
                  />
                  <label className="summary-card__manual-label" htmlFor={`project-stack-${index}`}>
                    Stack
                  </label>
                  <input
                    id={`project-stack-${index}`}
                    className="summary-card__manual-input"
                    value={project.stack}
                    onChange={(event) => updateProject(index, { stack: event.target.value })}
                    placeholder="React | TypeScript"
                  />
                  <label className="summary-card__manual-label" htmlFor={`project-link-${index}`}>
                    Link
                  </label>
                  <input
                    id={`project-link-${index}`}
                    className="summary-card__manual-input"
                    value={project.link}
                    onChange={(event) => updateProject(index, { link: event.target.value })}
                    placeholder="github.com/voce/projeto"
                  />
                  <label className="summary-card__manual-label" htmlFor={`project-bullets-${index}`}>
                    Conquistas (uma por linha)
                  </label>
                  <textarea
                    id={`project-bullets-${index}`}
                    className="summary-card__manual-input"
                    rows={3}
                    value={project.bullets.join('\n')}
                    onChange={(event) => updateProject(index, { bullets: event.target.value.split(/\r?\n/) })}
                    placeholder="O que esse projeto entrega"
                  />
                  <button type="button" className="summary-card__restart-link" onClick={() => removeProject(index)}>
                    Excluir projeto
                  </button>
                </div>
              ))}
              <button type="button" className="chip chip--save" onClick={addProject}>
                + Adicionar projeto
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
        <div className="summary-card__accent">
          <span>Tamanho do texto:</span>
          <div className="summary-card__segmented" role="group" aria-label="Tamanho do texto na exportação">
            {DENSITY_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={Math.abs(densityScale(resume) - option.scale) < 0.001}
                onClick={() => onResumeUpdate({ fontScale: option.scale })}
                title={option.id === 'enxuto' ? 'Fonte menor — cabe em menos páginas' : option.id === 'amplo' ? 'Fonte maior — mais páginas' : 'Tamanho padrão da referência'}
              >
                {option.label}
              </button>
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
          disabled={jobLength < 20 || fetchingJob || modalStep !== null}
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
          {atsResult && modalStep === null && (
            <button type="button" className="btn btn--outline" onClick={seeResult} style={{ marginTop: 10 }}>
              Ver resultado ({atsResult.score}%)
            </button>
          )}
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
      {modalStep !== null && (
        <AnalysisModal
          step={modalStep}
          score={atsResult?.score ?? null}
          tone={atsResult?.verdict.tone ?? 'mid'}
          label={atsResult?.verdict.label ?? ''}
          report={
            atsResult ? (
              <>
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
                <AtsReport result={atsResult} />
              </>
            ) : undefined
          }
          onCancel={closeModal}
          onClose={() => setModalStep(null)}
        />
      )}
    </section>
  );
}
