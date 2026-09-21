import { useEffect, useRef, useState } from 'react';
import type { Experience, ResumeData } from '../types';
import { analyzeForJob, type AtsResult } from '../utils/atsAnalyzer';
import { experienceText } from '../utils/resumeContent';
import type { ImportResult } from '../utils/resumeImport';
import { extractFirstUrl, resolveJobDescription } from '../utils/jobUrl';
import { AtsReport } from './AtsReport';
import { AnalysisModal } from './AnalysisModal';
import { ImportResume } from './ImportResume';

interface AlfaMatchProps {
  resume: ResumeData;
  onBack: () => void;
  onResumeUpdate: (fields: Partial<ResumeData>) => void;
}

function parseExperienceLines(text: string): Experience[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [head, ...rest] = line.split(':');
      const achievement = rest.join(':').trim();
      const headParts = head.split(' — ');
      return {
        role: headParts[0]?.trim() ?? line,
        company: headParts[1]?.trim() ?? '',
        period: '',
        achievement,
      };
    });
}

export function AlfaMatch({ resume, onBack, onResumeUpdate }: AlfaMatchProps) {
  const [jobDescription, setJobDescription] = useState('');
  const [fields, setFields] = useState({
    targetRole: resume.targetRole,
    summary: resume.summary,
    experiences: experienceText(resume.experiences.length > 0 ? resume : { ...resume, experiences: [] }),
    education: resume.education,
    skills: resume.skills,
    languages: resume.languages,
  });
  const [result, setResult] = useState<AtsResult | null>(null);
  const [importedName, setImportedName] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  // null = modal fechado, 0..3 = fase da animacao
  const [modalStep, setModalStep] = useState<number | null>(null);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const onResumeUpdateRef = useRef(onResumeUpdate);
  useEffect(() => {
    onResumeUpdateRef.current = onResumeUpdate;
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onResumeUpdateRef.current({
        targetRole: fields.targetRole,
        summary: fields.summary,
        education: fields.education,
        skills: fields.skills,
        languages: fields.languages,
        experiences: parseExperienceLines(fields.experiences),
      });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [fields]);

  function update(field: keyof typeof fields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
    setResult(null);
  }

  function handleImported(result: ImportResult) {
    const imported = result.fields;
    onResumeUpdate(imported);
    setFields((current) => ({
      targetRole: imported.targetRole ?? current.targetRole,
      summary: imported.summary ?? current.summary,
      experiences: imported.experiences
        ? imported.experiences
            .map((experience) =>
              [
                experience.role,
                experience.company,
                experience.period ? `(${experience.period})` : '',
              ]
                .filter(Boolean)
                .join(' — ') + (experience.achievement ? `: ${experience.achievement}` : ''),
            )
            .join('\n')
        : current.experiences,
      education: imported.education ?? current.education,
      skills: imported.skills ?? current.skills,
      languages: imported.languages ?? current.languages,
    }));
    setImportedName(result.recognized.join(', '));
  }

  async function handleAnalyze() {
    if (modalStep !== null) return;
    setFetchError(null);
    setResult(null);
    setModalStep(0);
    let description = jobDescription;
    const url = extractFirstUrl(description);
    if (url && description.trim().length < 400) {
      setFetching(true);
      try {
        description = await resolveJobDescription(description);
        if (description.trim().length < 20) throw new Error('thin');
        setJobDescription(description);
      } catch {
        closeModal();
        setFetchError(
          'Não conseguimos ler o anúncio por esse link — alguns sites bloqueiam a leitura automática. '
            + 'Copie o texto da descrição e cole aqui.',
        );
        return;
      } finally {
        setFetching(false);
      }
    }
    const draftResume: ResumeData = {
      ...resume,
      targetRole: fields.targetRole,
      summary: fields.summary,
      education: fields.education,
      skills: fields.skills,
      languages: fields.languages,
      experiences: parseExperienceLines(fields.experiences),
    };
    const found = analyzeForJob(draftResume, description);
    // a analise em si é rapida, as fases sao pra dar feedback visual
    timersRef.current.push(window.setTimeout(() => setModalStep(1), 700));
    timersRef.current.push(window.setTimeout(() => setModalStep(2), 1500));
    timersRef.current.push(
      window.setTimeout(() => {
        setResult(found);
        setModalStep(3);
      }, 2200),
    );
  }

  function closeModal() {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    setFetching(false);
    setModalStep(null);
  }

  function seeResult() {
    if (result) setModalStep(3);
  }

  const canAnalyze = jobDescription.trim().length >= 20 && !fetching && modalStep === null;

  return (
    <div className="alfa-match">
      <div className="alfa-match__hero">
        <button type="button" className="alfa-match__back" onClick={onBack}>
          ← Voltar ao assistente
        </button>
        <h1 className="alfa-match__title">
          Alfa <span>Match</span>
        </h1>
        <p className="alfa-match__tagline">
          O encaixe entre o seu currículo e a vaga — antes do recrutador ver.
        </p>
      </div>

      <div className="alfa-match__grid">
        <section className="alfa-match__panel">
          <h2 className="alfa-match__panel-title">1. A vaga</h2>
          <p className="alfa-match__hint">
            Cole a descrição completa da vaga — ou só o link dela (LinkedIn, Gupy, Catho, Nerdin...).
          </p>
          <textarea
            className="ats-analyzer__input alfa-match__vaga"
            placeholder="Cole aqui a descrição da vaga ou o link do anúncio..."
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            rows={12}
          />
          {fetchError && (
            <p className="alfa-match__error" role="alert">
              {fetchError}
            </p>
          )}
          <button
            type="button"
            className="btn btn--primary alfa-match__analyze"
            disabled={!canAnalyze}
            onClick={() => void handleAnalyze()}
          >
            {fetching ? 'Buscando a vaga...' : 'Analisar compatibilidade'}
          </button>
          {result && modalStep === null && (
            <button type="button" className="btn btn--outline" onClick={seeResult}>
              Ver resultado ({result.score}%)
            </button>
          )}
        </section>

        <section className="alfa-match__panel">
          <h2 className="alfa-match__panel-title">2. Seu currículo</h2>
          <p className="alfa-match__hint">
            {resume.fullName
              ? `Pré-preenchido com os dados de ${resume.fullName} — ajuste se quiser.`
              : 'Anexe seu currículo atual ou preencha os campos abaixo.'}
          </p>
          <ImportResume variant="match" onImported={handleImported} />
          {importedName && (
            <p className="alfa-match__imported" role="status">
              Currículo importado — reconheci: {importedName}.
            </p>
          )}
          {(
            [
              ['targetRole', 'Objetivo / cargo'],
              ['summary', 'Resumo profissional'],
              ['experiences', 'Experiências (uma por linha: Cargo — Empresa: conquista)'],
              ['skills', 'Habilidades (separadas por vírgula)'],
              ['education', 'Formação'],
              ['languages', 'Idiomas'],
            ] as Array<[keyof typeof fields, string]>
          ).map(([field, label]) => (
            <label className="alfa-match__field" key={field}>
              <span>{label}</span>
              <textarea
                className="ats-analyzer__input"
                rows={field === 'experiences' ? 4 : 2}
                value={fields[field]}
                onChange={(event) => update(field, event.target.value)}
              />
            </label>
          ))}
        </section>
      </div>

      {modalStep !== null && (
        <AnalysisModal
          step={modalStep}
          score={result?.score ?? null}
          tone={result?.verdict.tone ?? 'mid'}
          label={result?.verdict.label ?? ''}
          report={result ? <AtsReport result={result} /> : undefined}
          onCancel={closeModal}
          onClose={() => setModalStep(null)}
        />
      )}
    </div>
  );
}
