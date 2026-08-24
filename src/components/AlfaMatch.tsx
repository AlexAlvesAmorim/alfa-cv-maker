import { useState } from 'react';
import type { ResumeData } from '../types';
import { analyzeForJob, type AtsResult } from '../utils/atsAnalyzer';
import { experienceText } from '../utils/resumeContent';
import { AtsReport } from './AtsReport';

interface AlfaMatchProps {
  resume: ResumeData;
  onBack: () => void;
}

export function AlfaMatch({ resume, onBack }: AlfaMatchProps) {
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

  function update(field: keyof typeof fields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
    setResult(null);
  }

  function handleAnalyze() {
    const draftResume: ResumeData = {
      ...resume,
      targetRole: fields.targetRole,
      summary: fields.summary,
      education: fields.education,
      skills: fields.skills,
      languages: fields.languages,
      experiences: fields.experiences
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
        }),
    };
    setResult(analyzeForJob(draftResume, jobDescription));
  }

  const canAnalyze = jobDescription.trim().length >= 20;

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
          <p className="alfa-match__hint">Cole a descrição completa da vaga, incluindo requisitos e diferenciais.</p>
          <textarea
            className="ats-analyzer__input alfa-match__vaga"
            placeholder="Cole aqui a descrição da vaga..."
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            rows={12}
          />
          <button type="button" className="btn btn--primary alfa-match__analyze" disabled={!canAnalyze} onClick={handleAnalyze}>
            Analisar compatibilidade
          </button>
        </section>

        <section className="alfa-match__panel">
          <h2 className="alfa-match__panel-title">2. Seu currículo</h2>
          <p className="alfa-match__hint">
            {resume.fullName
              ? `Pré-preenchido com os dados de ${resume.fullName} — ajuste se quiser.`
              : 'Preencha o essencial (ou faça seu currículo no assistente depois).'}
          </p>
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

      {result && (
        <section className="alfa-match__report">
          <h2 className="alfa-match__panel-title">3. Resultado do encaixe</h2>
          <AtsReport result={result} />
        </section>
      )}
    </div>
  );
}
