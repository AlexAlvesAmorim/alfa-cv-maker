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
