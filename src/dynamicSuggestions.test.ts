import { describe, expect, it } from 'vitest';
import { suggestionsFor } from './data/dynamicSuggestions';
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

  it('inclui frases prontas de objetivo no passo alvo', () => {
    const suggestions = suggestionsFor('targetRole', salesResume) ?? [];
    expect(suggestions.some((item) => item.startsWith('Sou iniciante na carreira'))).toBe(true);
    expect(suggestions.length).toBeGreaterThan(20);
  });

  it('sugere pacote de habilidades da area', () => {
    const skills = suggestionsFor('skills', salesResume) ?? [];
    expect(skills[0]).toContain('Vendas');
  });

  it('retorna null para etapas sem dinamismo', () => {
    expect(suggestionsFor('fullName', salesResume)).toBeNull();
  });
});
