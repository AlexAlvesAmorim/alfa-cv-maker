import { describe, expect, it } from 'vitest';
import { parseResumeText } from './utils/resumeImport';

const SAMPLE = `Maria Oliveira Santos
(11) 98888-7777 | maria@email.com | São Paulo/SP | linkedin.com/in/maria

Objetivo: Analista de Suporte Comercial

Resumo
Profissional dedicada com 5 anos de atendimento ao cliente e foco em resultado.

Experiência Profissional
Consultora de Vendas - Loja Alfa (2021 - Atualmente): Superei a meta em 25% reorganizando o funil
Atendente Comercial — Padaria Centro | 2019-2021

Formação Acadêmica
Administração - Faculdade X (cursando 5º semestre)

Habilidades
Vendas, Excel, Atendimento ao cliente, Negociação

Idiomas
Inglês intermediário`;

describe('importação de currículo', () => {
  it('reconhece as seções principais de um currículo pt-BR', () => {
    const { fields, recognized } = parseResumeText(SAMPLE);

    expect(fields.fullName).toBe('Maria Oliveira Santos');
    expect(fields.contact).toContain('maria@email.com');
    expect(fields.contact).toContain('(11) 98888-7777');
    expect(fields.targetRole).toBe('Analista de Suporte Comercial');
    expect(fields.summary).toContain('atendimento ao cliente');
    expect(fields.experiences).toHaveLength(2);
    expect(fields.experiences?.[0]?.role).toBe('Consultora de Vendas');
    expect(fields.experiences?.[0]?.company).toContain('Loja Alfa');
    expect(fields.experiences?.[0]?.period).toMatch(/2021/i);
    expect(fields.experiences?.[1]?.company).toContain('Padaria Centro');
    expect(fields.education).toContain('Faculdade X');
    expect(fields.skills).toContain('Excel');
    expect(fields.languages).toContain('Inglês intermediário');
    expect(recognized.length).toBeGreaterThanOrEqual(6);
  });

  it('ignora anos como telefone e nao confunde titulo com nome', () => {
    const { fields } = parseResumeText(
      'Currículo\nJoão Pedro Almeida\n2023-2025\nExperiências\nAuxiliar de Logística — Distribuidora ABC',
    );

    expect(fields.fullName).toBe('João Pedro Almeida');
    expect(fields.contact ?? '').not.toContain('2023');
    expect(fields.experiences?.[0]?.role).toBe('Auxiliar de Logística');
  });

  it('retorna vazio para texto sem seções reconhecíveis', () => {
    const result = parseResumeText('qualquer coisa solta sem estrutura nenhuma mesmo');
    expect(result.recognized).toHaveLength(0);
    expect(result.fields.fullName).toBeUndefined();
  });
});
// Currículo pronto no estilo real (cabeçalho com headline, cidade com hífen,
// seção de projetos longa, tabela de competências, subtítulos e cabeçalho combinado)
const REFERENCE_STYLE = `ALEX ALVES AMORIM
Desenvolvedor Front-End | React • TypeScript • Electron
Jacarepaguá, Rio de Janeiro - RJ | alex@mail.com | (21) 97680-7111
github.com/AlexAlvesAmorim | linkedin.com/in/alex-a-amorim
Portfólio + releases + demos | https://eu-alex-dev-hub-project.vercel.app/

RESUMO PROFISSIONAL
Desenvolvedor Front-End com certificação e 15 anos de suporte técnico.

PROJETOS EM DESTAQUE - PRODUTOS COM CÓDIGO, RELEASE E DEMO
ALFA PDF Reader | TypeScript | Electron
• Leitor PDF desktop para Windows.
• Multi-abas e auto-update.

COMPETÊNCIAS TÉCNICAS
Desenvolvimento
React.js, TypeScript, Node.js
Qualidade & DevOps
Vitest, Docker

EXPERIÊNCIA PROFISSIONAL
Desenvolvedor Front-End Freelancer - ALVS Soluções Tecnológicas 2023 - Atual
Projetos sob demanda - em paralelo ao vínculo CLT
• Concepção e entrega de 5 produtos autorais.
• Interfaces responsivas e acessíveis.
Técnico de TI N3 - InfoMorais.com 2022 - Atual
Vínculo CLT atual | Referência técnica da equipe
• Diagnósticos avançados em hardware.

FORMAÇÃO ACADÊMICA, CERTIFICAÇÕES E IDIOMAS
• CS50x - Harvard University - Certificado 2026
• Inglês Intermediário - leitura técnica fluente`;

describe('importação de currículo pronto (estilo referência)', () => {
  it('lê nome, objetivo, contato completo e cabeçalhos longos', () => {
    const { fields } = parseResumeText(REFERENCE_STYLE);

    expect(fields.fullName).toBe('ALEX ALVES AMORIM');
    expect(fields.targetRole).toBe('Desenvolvedor Front-End | React • TypeScript • Electron');
    expect(fields.contact).toContain('Rio de Janeiro - RJ');
    expect(fields.contact).toContain('alex@mail.com');
    expect(fields.contact).toContain('(21) 97680-7111');
    expect(fields.contact).toContain('github.com/AlexAlvesAmorim');
    expect(fields.contact).toContain('https://eu-alex-dev-hub-project.vercel.app/');
    expect(fields.contact ?? '').not.toContain('Desenvolvedor Front-End | React');
    expect(fields.summary).toContain('certificação');
    expect(fields.summary).toContain('ALFA PDF Reader');
    expect(fields.education).toContain('CS50x');
    expect(fields.education ?? '').not.toContain('Inglês');
  });

  it('não cria experiências fantasmas: 2 empregos com conquistas agregadas', () => {
    const { fields } = parseResumeText(REFERENCE_STYLE);

    expect(fields.experiences).toHaveLength(2);
    expect(fields.experiences?.[0]?.role).toBe('Desenvolvedor Front-End Freelancer');
    expect(fields.experiences?.[0]?.company).toContain('ALVS');
    expect(fields.experiences?.[0]?.period).toMatch(/2023/);
    // Subtítulo + bullets viram conquista multilinha (um bullet por linha no PDF)
    expect(fields.experiences?.[0]?.achievement).toContain('Projetos sob demanda');
    expect(fields.experiences?.[0]?.achievement).toContain('Concepção e entrega');
    expect(fields.experiences?.[0]?.achievement).toContain('Interfaces responsivas');
    expect(fields.experiences?.[1]?.role).toBe('Técnico de TI N3');
    expect(fields.experiences?.[1]?.company).toContain('InfoMorais');
    expect(fields.experiences?.[1]?.achievement).toContain('Vínculo CLT atual');
    expect(fields.experiences?.[1]?.achievement).toContain('Diagnósticos avançados');
  });

  it('limpa rótulos da tabela de competências e puxa o idioma', () => {
    const { fields } = parseResumeText(REFERENCE_STYLE);

    expect(fields.skills).toContain('React.js');
    expect(fields.skills).toContain('Vitest');
    expect(fields.skills ?? '').not.toContain('Desenvolvimento');
    expect(fields.skills ?? '').not.toContain('Qualidade & DevOps');
    expect(fields.languages).toContain('Inglês Intermediário');
  });
});
