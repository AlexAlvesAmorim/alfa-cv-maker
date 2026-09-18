import { describe, expect, it } from 'vitest';
import { buildResumePdf } from './utils/pdfExport';
import { buildResumeDocx } from './utils/docxExport';
import { TEMPLATES } from './data/templates';
import { FICTIONAL_RESUME } from './data/fictionalResume';
import { EMPTY_RESUME } from './types';

// teste bem simples so pra garantir que nenhum modelo quebra na hora de gerar
describe('export pdf', () => {
  it('gera pdf pra cada modelo sem quebrar', () => {
    for (const t of TEMPLATES) {
      const blob = buildResumePdf({ ...FICTIONAL_RESUME, layout: t.value });
      expect(blob.type).toBe('application/pdf');
      expect(blob.size).toBeGreaterThan(1000);
    }
  });

  it('gera pdf mesmo com curriculo vazio', () => {
    const blob = buildResumePdf(EMPTY_RESUME);
    expect(blob.size).toBeGreaterThan(500);
  });
});

describe('export docx', () => {
  it('gera docx com os dados de exemplo', async () => {
    const blob = await buildResumeDocx(FICTIONAL_RESUME);
    expect(blob.size).toBeGreaterThan(1000);
  });

  it('gera docx mesmo vazio sem dar erro', async () => {
    const blob = await buildResumeDocx(EMPTY_RESUME);
    expect(blob.size).toBeGreaterThan(500);
  });
});
