import { describe, expect, it } from 'vitest';
import { extraSuggestionsFor, recommendedTemplateId, suggestionsFor } from './data/dynamicSuggestions';
import { EMPTY_RESUME, type ResumeData } from './types';

const salesResume: ResumeData = {
  ...EMPTY_RESUME,
  experiences: [
    {
      role: 'Vendedora',
      company: 'Loja Alfa',
      period: '2023-2025',
      achievement: 'Superei a meta de vendas em 25% reorganizando o funil de atendimento ao cliente',
    },
  ],
};

describe('sugestões dinâmicas', () => {
  it('detecta area comercial nas experiencias', () => {
    const roles = suggestionsFor('targetRole', salesResume) ?? [];
    expect(roles.some((role) => /vendas|comercial/i.test(role))).toBe(true);
  });

  it('cita a conquista no resumo', () => {
    const summaries = suggestionsFor('summary', salesResume) ?? [];
    expect(summaries.length).toBeGreaterThanOrEqual(4);
    expect(summaries.some((summary) => summary.toLowerCase().includes('vendas'))).toBe(true);
  });

  it('usa modo primeira oportunidade sem experiências', () => {
    const summaries = suggestionsFor('summary', EMPTY_RESUME) ?? [];
    expect(summaries.length).toBeGreaterThanOrEqual(4);
    expect(summaries.some((summary) => summary.includes('primeira oportunidade'))).toBe(true);
  });

  it('limita sugestoes principais do alvo e guarda frases nos extras', () => {
    const suggestions = suggestionsFor('targetRole', salesResume) ?? [];
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.length).toBeLessThanOrEqual(4);
    expect(suggestions.some((role) => /vendas|comercial/i.test(role))).toBe(true);

    const extras = extraSuggestionsFor('targetRole');
    expect(extras.some((item) => item.startsWith('Sou iniciante na carreira'))).toBe(true);
  });

  it('recomenda modelo conforme o momento de carreira', () => {
    expect(recommendedTemplateId(EMPTY_RESUME)).toBe('ats');
    expect(recommendedTemplateId(salesResume)).toBe('xyz');
    const semConquista: ResumeData = {
      ...salesResume,
      experiences: [{ ...salesResume.experiences[0], achievement: '' }],
    };
    expect(recommendedTemplateId(semConquista)).toBe('classic');
  });

  it('sugere pacote de habilidades da area', () => {
    const skills = suggestionsFor('skills', salesResume) ?? [];
    expect(skills[0]).toContain('Vendas');
  });

  it('retorna null para etapas sem dinamismo', () => {
    expect(suggestionsFor('fullName', salesResume)).toBeNull();
  });
});
