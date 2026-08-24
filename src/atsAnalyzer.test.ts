import { describe, expect, it } from 'vitest';
import { analyzeForJob } from './utils/atsAnalyzer';
import { EMPTY_RESUME, type ResumeData } from './types';

const resume: ResumeData = {
  ...EMPTY_RESUME,
  targetRole: 'Desenvolvedor Front-end',
  skills: 'React, TypeScript, Git, CSS',
  summary: 'Desenvolvedor front-end com experiência em React e TypeScript.',
};

describe('analyzeForJob', () => {
  it('da nota alta quando o curriculo cobre a vaga', () => {
    const result = analyzeForJob(resume, 'Vaga para desenvolvedor front-end: React, TypeScript e CSS.');
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.verdict.tone).toBe('high');
    expect(result.strongMatches).toContain('react');
  });

  it('aponta palavras-chave ausentes', () => {
    const result = analyzeForJob(resume, 'Vaga para desenvolvedor front-end: React, Kubernetes, Docker e GraphQL.');
    expect(result.score).toBeLessThan(100);
    expect(result.general.missing).toContain('kubernetes');
    expect(result.general.missing).toContain('docker');
  });

  it('separa requisitos de diferenciais pela descricao', () => {
    const description = [
      'Vaga para analista de dados.',
      'Requisitos: SQL e Power BI.',
      'Diferenciais: Python.',
    ].join('\n');
    const result = analyzeForJob(resume, description);

    expect(result.required.missing).toContain('sql');
    expect(result.required.missing).toContain('power bi');
    expect(result.differentials.missing).toContain('python');
  });

  it('valoriza requisitos acima de termos gerais no score', () => {
    const comRequisito = analyzeForJob(resume, 'Requisitos: React.');
    const comGeral = analyzeForJob(resume, 'Ambiente colaborativo e dinâmico.');
    expect(comRequisito.score).toBeGreaterThan(comGeral.score);
  });

  it('retorna zero para descricao vazia', () => {
    const result = analyzeForJob(resume, '');
    expect(result.score).toBe(0);
    expect(result.totalKeywords).toBe(0);
  });
});
