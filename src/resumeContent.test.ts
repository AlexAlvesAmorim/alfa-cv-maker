import { describe, expect, it } from 'vitest';
import {
  buildSections,
  cleanFullName,
  experienceLine,
  experienceText,
  getTemplateId,
  orderedContactParts,
} from './utils/resumeContent';
import { EMPTY_RESUME, type ResumeData } from './types';

describe('cleanFullName', () => {
  it('remove prefases comuns e capitaliza', () => {
    expect(cleanFullName('meu nome é maria da silva')).toBe('Maria da Silva');
    expect(cleanFullName('sou o pedro henrique')).toBe('Pedro Henrique');
    expect(cleanFullName('prazer, meu nome é Ana Souza!')).toBe('Ana Souza');
  });

  it('mantem conectores em minuscula', () => {
    expect(cleanFullName('Ana de Tal')).toBe('Ana de Tal');
    expect(cleanFullName('JOÃO pedro almeida')).toBe('João Pedro Almeida');
  });
});

describe('orderedContactParts', () => {
  it('ordena telefone, email, endereco e link', () => {
    const ordered = orderedContactParts('linkedin.com/in/maria | maria@email.com | São Paulo/SP | (11) 98888-7777');
    expect(ordered[0]).toContain('98888');
    expect(ordered[1]).toContain('@');
    expect(ordered[2]).toContain('Paulo');
    expect(ordered[3]).toContain('linkedin');
  });
});

describe('getTemplateId', () => {
  it('mapeia o texto escolhido para o template correto', () => {
    expect(getTemplateId('Clássico (Curriculum Vitae tradicional)')).toBe('classic');
    expect(getTemplateId('ATS (padrão para robôs de RH)')).toBe('ats');
    expect(getTemplateId('XYZ (padrão Google)')).toBe('xyz');
    expect(getTemplateId('Moderno (barra lateral com foto)')).toBe('canva');
    expect(getTemplateId('Executivo (faixa escura com foto)')).toBe('executivo');
    expect(getTemplateId('Clean (elegante, serif com foto)')).toBe('clean');
    expect(getTemplateId('Minimal (duas colunas sóbrias)')).toBe('minimal');
    expect(getTemplateId('qualquer outra coisa')).toBe('canva');
  });
});

describe('experiências estruturadas', () => {
  const experience = { role: 'Dev', company: 'Alfa', period: '2024-2025', achievement: 'Entreguei 3 projetos' };

  it('monta a linha da experiência', () => {
    expect(experienceLine(experience)).toBe('Dev Alfa (2024-2025): Entreguei 3 projetos');
  });

  it('experienceText junta todas as linhas', () => {
    const resume: ResumeData = { ...EMPTY_RESUME, experiences: [experience] };
    expect(experienceText(resume)).toBe('Dev Alfa (2024-2025): Entreguei 3 projetos');
  });

  it('buildSections inclui experiencias e ignora secoes vazias', () => {
    const resume: ResumeData = { ...EMPTY_RESUME, experiences: [experience], skills: 'React, Git' };
    const titles = buildSections(resume).map((section) => section.title);
    expect(titles).toEqual(['Experiência Profissional', 'Habilidades']);
  });
});
