import { describe, expect, it } from 'vitest';
import { buildResumePdf } from './utils/pdfExport';
import { EMPTY_RESUME, type ResumeData } from './types';

// O jsPDF grava os streams sem compressão e em WinAnsi: dá para ler o
// conteúdo (texto + operações "Tf" de tamanho) decodificando como latin1.
async function pdfRaw(blob: Blob): Promise<string> {
  return Buffer.from(await blob.arrayBuffer()).toString('latin1');
}

// Último tamanho de fonte ("11", "10", "9.5"...) selecionado antes da posição.
function lastFontSizeBefore(raw: string, index: number): string | null {
  const before = raw.slice(Math.max(0, index - 400), index);
  const matches = [...before.matchAll(/(\d+(?:\.\d+)?) Tf/g)].map((match) => match[1]);
  return matches.length > 0 ? matches[matches.length - 1] : null;
}

function resumeBase(layout: string): ResumeData {
  return {
    ...EMPTY_RESUME,
    fullName: 'Alex Alves Amorim',
    targetRole: 'Designer UI/UX',
    layout,
    contact: 'alex@mail.com | (21) 97680-7111',
    summary: 'Histórico sólido com impacto.',
    experiences: [
      {
        role: 'Técnico de TI',
        company: 'InfoMorais.com',
        period: '2022 Atual',
        achievement: 'Suporte avançado a hardware.\nRedes LAN/WAN e firewall.',
      },
    ],
    education: 'Análise de Sistemas',
    skills: 'React, Git',
    languages: 'Inglês intermediário',
  };
}

describe.each([
  ['ats-dev', 'ATS Dev (projetos com stack — inspirado PDF Alex)'],
  ['xyz', 'XYZ (padrão Google)'],
])('experiência no template %s', (_id, layout) => {
  it('segue a referência: "Função - Empresa" 11pt, período 10pt, bullets por linha', async () => {
    const raw = await pdfRaw(buildResumePdf(resumeBase(layout)));

    const headIdx = raw.indexOf('Técnico de TI - InfoMorais.com');
    const periodIdx = raw.indexOf('2022 Atual');
    expect(headIdx).toBeGreaterThan(-1);
    expect(periodIdx).toBeGreaterThan(-1);

    // Cabeçalho do bloco em 11pt, período em 10pt, na sequência (esq -> dir).
    expect(lastFontSizeBefore(raw, headIdx)).toBe('11');
    expect(lastFontSizeBefore(raw, periodIdx)).toBe('10');
    expect(headIdx).toBeLessThan(periodIdx);

    // Cada linha da conquista vira um bullet próprio.
    expect(raw).toContain('Suporte avançado a hardware.');
    expect(raw).toContain('Redes LAN/WAN e firewall.');
  });
});

describe('experiência incompleta', () => {
  it('não quebra o PDF', async () => {
    const raw = await pdfRaw(
      buildResumePdf({
        ...EMPTY_RESUME,
        fullName: 'Nome Teste',
        layout: 'XYZ (padrão Google)',
        experiences: [{ role: '', company: '', period: '', achievement: '' }],
      }),
    );
    expect(raw).toContain('NOME TESTE'); // o template usa caixa alta no nome
  });
});
