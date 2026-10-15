import { describe, expect, it } from 'vitest';
import { analyzeForJob, type AtsResult } from './utils/atsAnalyzer';
import { blockerBullets, inferJobSubtitle, inferJobTitle } from './utils/matchCard';
import { EMPTY_RESUME } from './types';

function baseResult(overrides: Partial<AtsResult> = {}): AtsResult {
  return {
    score: 0,
    verdict: { label: 'Alinhamento baixo', tone: 'low', message: '' },
    required: { matched: [], missing: [] },
    differentials: { matched: [], missing: [] },
    general: { matched: [], missing: [] },
    stacks: { missing: [] },
    seniority: [],
    strongMatches: [],
    totalKeywords: 0,
    ...overrides,
  };
}

describe('contras: só o que a vaga pediu e falta', () => {
  it('com requisitos, ignora diferenciais e prosa geral', () => {
    const result = baseResult({
      required: { matched: [], missing: ['kubernetes', 'sql'] },
      differentials: { matched: [], missing: ['docker'] },
      general: { matched: [], missing: ['backend solutions'] },
      stacks: { missing: ['kubernetes'] },
      seniority: ['3 anos de experiência'],
    });
    const bullets = blockerBullets(result).join(' | ').toLowerCase();
    expect(bullets).toContain('kubernetes');
    expect(bullets).toContain('sql');
    expect(bullets).toContain('3 anos de experiência');
    expect(bullets).not.toContain('docker');
    expect(bullets).not.toContain('backend solutions');
  });

  it('sem requisitos, cai para stacks/diferenciais (nunca prosa geral)', () => {
    const result = baseResult({
      differentials: { matched: [], missing: ['docker'] },
      general: { matched: [], missing: ['backend solutions'] },
      stacks: { missing: ['kubernetes'] },
    });
    const bullets = blockerBullets(result).join(' | ').toLowerCase();
    expect(bullets).toContain('kubernetes');
    expect(bullets).toContain('docker');
    expect(bullets).not.toContain('backend solutions');
  });

  it('níveis contraditórios se anulam nos contras', () => {
    const result = baseResult({
      required: { matched: [], missing: ['sql'] },
      seniority: ['Nível júnior', 'Nível sênior'],
    });
    const bullets = blockerBullets(result).join(' | ').toLowerCase();
    expect(bullets).toContain('sql');
    expect(bullets).not.toContain('júnior');
    expect(bullets).not.toContain('sênior');
  });

  it('nível único continua como impeditivo', () => {
    const result = baseResult({
      required: { matched: [], missing: ['sql'] },
      seniority: ['Nível sênior'],
    });
    expect(blockerBullets(result).join(' | ')).toContain('Nível sênior');
  });
});

describe('título: pula cabeçalho e publieditorial', () => {
  const verdict = { label: 'Alinhamento baixo', tone: 'low' as const, message: '' };

  it('pula "Sobre a vaga" e usa o cargo real', () => {
    expect(
      inferJobTitle('Sobre a vaga\nDesenvolvedor React — Estágio\nVaga para estudantes'),
    ).toBe('Desenvolvedor React — Estágio');
  });

  it('pula apresentação da empresa e usa o cargo-alvo', () => {
    expect(
      inferJobTitle(
        "Sobre a vaga\nAt BairesDev, we've been leading the way in technology",
        'Desenvolvedor React',
      ),
    ).toBe('Desenvolvedor React');
  });

  it('subtítulo pula cabeçalho e usa veredito como fallback', () => {
    const result = baseResult({ verdict, totalKeywords: 10 });
    expect(inferJobSubtitle('Vaga React\nRequisitos: SQL e Java', result)).toBe(
      '10 termos relevantes • Alinhamento baixo',
    );
  });
});

describe('analyzer: sem falsos contras', () => {
  const resume = {
    ...EMPTY_RESUME,
    skills: 'React, TypeScript, Git',
    summary: 'Desenvolvedor front-end com experiência em React.',
  };

  it('entende cabeçalho "Requirements" em inglês', () => {
    const result = analyzeForJob(resume, 'Requirements: Kubernetes and Docker.');
    expect(result.required.missing).toContain('kubernetes');
    expect(result.required.missing).toContain('docker');
  });

  it('idade da empresa não vira requisito de experiência', () => {
    const result = analyzeForJob(
      resume,
      'Nossa empresa tem 15 anos de mercado.\nRequisitos: SQL.',
    );
    expect(result.seniority.join(' ')).not.toMatch(/15 anos/);
  });

  it('não cobra bigrama que o currículo já cobre por partes', () => {
    const devResume = { ...EMPTY_RESUME, skills: 'Java', summary: 'Developer with experience.' };
    const result = analyzeForJob(devResume, 'Requirements: Java developer.');
    expect(result.required.missing).not.toContain('java developer');
    expect(result.required.matched).toContain('java');
    expect(result.required.matched).toContain('developer');
  });

  it('prosa geral não vaza para os contras quando há requisitos', () => {
    const result = analyzeForJob(
      resume,
      'Requirements: React.\nYou will be building backend solutions with modern JavaScript.',
    );
    const bullets = blockerBullets(result).join(' | ').toLowerCase();
    expect(bullets).not.toContain('backend solutions');
    expect(bullets).not.toContain('modern javascript');
  });
});
