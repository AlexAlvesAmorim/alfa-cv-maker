import { describe, expect, it } from 'vitest';
import { breakRowOnGap, parseResumeText } from './utils/resumeImport';

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

  it('secao Objetivo curta vira cargo, nao resumo', () => {
    const { fields, recognized } = parseResumeText(
      'Alex Alves Amorim\nalex@email.com\nObjetivo\nAnalista de Suporte Comercial\nResumo\nProfissional dedicada com foco em resultado.',
    );
    expect(fields.targetRole).toBe('Analista de Suporte Comercial');
    expect(fields.summary).toContain('foco em resultado');
    expect(recognized).toContain('objetivo');
  });

  it('captura o cargo logo abaixo do nome (PDF exportado pelo app)', () => {
    const { fields } = parseResumeText(
      'Alex Alves Amorim\nDesenvolvedor Front-end Júnior\n(11) 98888-7777 | alex@email.com\nResumo\nTrabalho com React e TypeScript.',
    );
    expect(fields.fullName).toBe('Alex Alves Amorim');
    expect(fields.targetRole).toBe('Desenvolvedor Front-end Júnior');
    expect(fields.summary).toContain('React');
  });

  it('reconhece Idioma no singular, Education/Experience em ingles e Sintese como resumo', () => {
    const { fields, recognized } = parseResumeText(
      'Maria Oliveira Santos\nSíntese\nProfissional com 5 anos de atendimento.\nExperience\nConsultora — Loja Alfa\nEducation\nAdministração - Faculdade X\nIdioma\nInglês intermediário',
    );
    expect(fields.summary).toContain('atendimento');
    expect(fields.experiences?.[0]?.role).toBe('Consultora');
    expect(fields.education).toContain('Faculdade X');
    expect(fields.languages).toContain('Inglês intermediário');
    expect(recognized).toContain('idiomas');
    expect(recognized).toContain('formação');
  });

  it('resgata contato e nome mesmo após seções (layout com barra lateral)', () => {
    const { fields } = parseResumeText(
      'Habilidades\nReact, Git\nAlex Alves Amorim\nIdiomas\nInglês intermediário\n(11) 99999-8888',
    );
    expect(fields.fullName).toBe('Alex Alves Amorim');
    expect(fields.contact).toContain('(11) 99999-8888');
    expect(fields.languages).toContain('Inglês');
  });

  it('valor inline no cabecalho ("Idiomas: Inglês") nao se perde', () => {
    const { fields } = parseResumeText('João Pedro Almeida\nIdiomas: Inglês intermediário');
    expect(fields.languages).toContain('Inglês intermediário');
  });

  it('recupera secao mesclada ao conteudo em linha longa', () => {
    const { fields, recognized } = parseResumeText(
      'Alex Alves Amorim\nalex@email.com\nIDIOMAS Inglês intermediário com conversação fluente todos os dias\nFORMAÇÃO ACADÊMICA – Administração de Empresas na Faculdade XYZ',
    );
    expect(fields.languages).toContain('Inglês');
    expect(fields.education).toContain('Administração');
    expect(recognized).toContain('idiomas');
    expect(recognized).toContain('formação');
  });

  it('ignora rodape de PDF exportado e nao polui a formacao', () => {
    const { fields } = parseResumeText(
      'Alex Alves Amorim\nFormação Acadêmica\nAdministração - Faculdade X\nGerado com Alfa Curriculum Maker',
    );
    expect(fields.education).toBe('Administração - Faculdade X');
  });

  it('cargo colado no nome resgatado da barra lateral vira objetivo', () => {
    const { fields } = parseResumeText(
      'CONTATO\n(11) 99999-8888\nHabilidades\nReact\nAlex Alves Amorim\nDesenvolvedor Front-end\nIdiomas\nInglês intermediário',
    );
    expect(fields.fullName).toBe('Alex Alves Amorim');
    expect(fields.targetRole).toBe('Desenvolvedor Front-end');
    expect(fields.languages).toContain('Inglês');
  });

  it('Perfil Profissional e Sobre mim viram resumo', () => {
    const { fields } = parseResumeText(
      'Maria Oliveira Santos\nPerfil Profissional\nProfissional com foco em resultado e metas claras.',
    );
    expect(fields.summary).toContain('foco em resultado');
  });

  it('cabecalho com enfeite ainda vira secao', () => {
    const { fields } = parseResumeText(
      'João Pedro Almeida\n— Experiência Profissional —\nAuxiliar — Loja X (2022-2023): bati a meta\n• Formação Acadêmica •\nEnsino Médio Completo',
    );
    expect(fields.experiences?.[0]?.role).toBe('Auxiliar');
    expect(fields.education).toContain('Ensino Médio');
  });

  it('frase normal comecando com palavra de secao nao vira secao', () => {
    const { fields } = parseResumeText(
      'Maria Oliveira Santos\nResumo\nExperiência em vendas\nHabilidades\nVendas',
    );
    expect(fields.summary).toContain('Experiência em vendas');
    expect(fields.experiences).toBeUndefined();
    expect(fields.skills).toContain('Vendas');
  });

  it('nao mistura duas colunas que estao na mesma altura', () => {
    const lines = breakRowOnGap([
      { x: 10, width: 50, text: '(11) 99999-8888' },
      { x: 300, width: 80, text: 'Experiência Profissional' },
    ]);
    expect(lines).toEqual(['(11) 99999-8888', 'Experiência Profissional']);
  });

  it('mantem palavras perto uma da outra na mesma linha', () => {
    const lines = breakRowOnGap([
      { x: 10, width: 30, text: 'Maria' },
      { x: 45, width: 40, text: 'Oliveira' },
    ]);
    expect(lines).toEqual(['Maria Oliveira']);
  });
});
