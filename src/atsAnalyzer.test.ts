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
    expect(result.missing).toHaveLength(0);
  });

  it('aponta palavras-chave ausentes', () => {
    const result = analyzeForJob(resume, 'Vaga para desenvolvedor front-end: React, Kubernetes, Docker e GraphQL.');
    expect(result.score).toBeLessThan(100);
    expect(result.missing).toContain('kubernetes');
    expect(result.missing).toContain('docker');
  });

  it('retorna zero para descricao vazia', () => {
    const result = analyzeForJob(resume, '');
    expect(result.score).toBe(0);
    expect(result.totalKeywords).toBe(0);
  });
});
