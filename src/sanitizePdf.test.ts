import { describe, expect, it } from 'vitest';
import { sanitizeForPdf, sanitizeResumeForPdf } from './utils/resumeContent';
import { EMPTY_RESUME } from './types';

// Tudo que a fonte WinAnsi do jsPDF sabe desenhar (mais \n e \t).
const PDF_SAFE = /^[\x20-\x7E\xA0-\xFF\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u0192\u02C6\u02DC\u2013\u2014\u2018\u2019\u201A\u201C\u201D\u201E\u2020\u2021\u2022\u2026\u2030\u2039\u203A\u20AC\n\t]*$/;

describe('sanitizeForPdf', () => {
  it('remove icones de contato (o bug do "O=Uc" na previa)', () => {
    const dirty = '✉️ alex.a.amorim@outlook.com | 📞 (21) 97680-7111 | 🔗 github.com/AlexAlvesAmorim';
    const clean = sanitizeForPdf(dirty);
    expect(clean).toBe('alex.a.amorim@outlook.com | (21) 97680-7111 | github.com/AlexAlvesAmorim');
    expect(clean).toMatch(PDF_SAFE);
  });

  it('preserva acentos, cedilha, bullets e travessao', () => {
    const text = 'Análise e Desenvolvimento — São Paulo/SP • Formação Acadêmica “ótima”';
    expect(sanitizeForPdf(text)).toBe(text);
  });

  it('converte setas para ASCII sem perder o sentido', () => {
    expect(sanitizeForPdf('Júnior → Pleno')).toBe('Júnior -> Pleno');
  });

  it('some com emojis no meio do texto mas mantem as palavras', () => {
    const clean = sanitizeForPdf('Reduzi o tempo em 35% 🚀 com foco em acessibilidade ✅');
    expect(clean).toBe('Reduzi o tempo em 35% com foco em acessibilidade');
    expect(clean).toMatch(PDF_SAFE);
  });

  it('remove caracteres zero-width e preserva quebras de linha', () => {
    const clean = sanitizeForPdf('linha um\u200B\nlinha dois\uFEFF');
    expect(clean).toBe('linha um\nlinha dois');
  });

  it('nunca devolve caractere fora do WinAnsi', () => {
    const dirty = 'Teste ★ ☆ ✓ ✔ → ← mengganggu čočka € “” ‘’ … ‰ × © ® ™ ° º ª § ¶';
    expect(sanitizeForPdf(dirty)).toMatch(PDF_SAFE);
  });
});

describe('sanitizeResumeForPdf', () => {
  it('limpa todos os campos de texto e mantem o resto intacto', () => {
    const resume = {
      ...EMPTY_RESUME,
      fullName: 'Alex Alves Amorim',
      targetRole: 'Designer UI/UX 🎨',
      layout: 'ats-dev',
      contact: '✉️ alex@mail.com | (21) 97680-7111',
      summary: 'Histórico sólido 🚀 com impacto.',
      experiences: [
        { role: 'Técnico 📞', company: 'InfoMorais.com', period: '2022', achievement: 'Suporte ✅ top' },
      ],
      education: 'Análise 📚 de Sistemas',
      skills: 'React, Comunicação ⭐',
      languages: 'Inglês intermediário',
      photo: 'data:image/png;base64,AAA',
      accentColor: '#B3121F',
    };
    const safe = sanitizeResumeForPdf(resume);
    expect(safe.targetRole).toBe('Designer UI/UX');
    expect(safe.contact).toBe('alex@mail.com | (21) 97680-7111');
    expect(safe.experiences[0].role).toBe('Técnico');
    expect(safe.experiences[0].achievement).toBe('Suporte top');
    expect(safe.layout).toBe('ats-dev');
    expect(safe.photo).toBe('data:image/png;base64,AAA');
    expect(safe.accentColor).toBe('#B3121F');
    for (const value of [
      safe.fullName, safe.targetRole, safe.contact, safe.summary,
      safe.education, safe.skills, safe.languages,
      ...safe.experiences.flatMap((experience) => [
        experience.role, experience.company, experience.period, experience.achievement,
      ]),
    ]) {
      expect(value).toMatch(PDF_SAFE);
    }
  });
});
