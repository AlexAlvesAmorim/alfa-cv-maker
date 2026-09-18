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

  it('ignora palavras comuns, beneficios e dados da empresa', () => {
    const description = [
      'Somos a maior fabricante de equipamentos do Brasil, com matriz em São Paulo.',
      'Requisitos: SQL, Delphi e Sapiens ERP.',
      'Diferenciais: Python e plano de saúde Bradesco.',
      'Benefícios: vale refeição, cesta básica, gympass, seguro de vida e bolsa educação.',
      'Será você que vai manter tudo tranquilo em família.',
    ].join('\n');
    const result = analyzeForJob(resume, description);
    const allMissing = [
      ...result.required.missing,
      ...result.differentials.missing,
      ...result.general.missing,
      ...result.stacks.missing,
    ];
    for (const noise of ['sera', 'voce', 'mes', 'refeicao', 'gympass', 'somos', 'matriz', 'familia', 'tranquila', 'manter']) {
      expect(allMissing).not.toContain(noise);
    }
    expect(result.stacks.missing).toContain('sql');
    expect(result.stacks.missing).toContain('delphi');
    expect(result.totalKeywords).toBeLessThan(30);
  });

  it('extrai senioridade: anos de experiencia, ingles e nivel', () => {
    const result = analyzeForJob(
      resume,
      'Vaga para desenvolvedor pleno com 3 anos de experiência. Requisitos: inglês avançado, SQL.',
    );
    expect(result.seniority).toContain('3 anos de experiência');
    expect(result.seniority).toContain('Inglês avançado');
    expect(result.seniority).toContain('Nível pleno');
  });

  it('filtra jargao de anuncio: conjugacoes, adjetivos e web generica', () => {
    const description = [
      'Requisitos: buscamos familiaridade com Karma e Protractor, proficiência e habilidades.',
      'Diferenciais: pós-graduação, ambiente que apoiam, assistência médica e classe mundial.',
      'Web dinâmicas e web utilizando Angular.',
    ].join('\n');
    const result = analyzeForJob(resume, description);
    const allMissing = [
      ...result.required.missing,
      ...result.differentials.missing,
      ...result.general.missing,
      ...result.stacks.missing,
    ];
    for (const noise of [
      'buscamos', 'familiaridade', 'habilidades', 'proficiencia', 'futuro', 'ambiente',
      'apoiam', 'classe mundial', 'consecutivo', 'web dinâmicas', 'web utilizando', 'web',
    ]) {
      expect(allMissing).not.toContain(noise);
    }
    expect(result.stacks.missing).toContain('karma');
    expect(result.stacks.missing).toContain('protractor');
    expect(result.stacks.missing).toContain('angular');
  });
});
