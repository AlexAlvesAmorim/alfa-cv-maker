import { describe, expect, it } from 'vitest';
import { extractFirstUrl } from './utils/jobUrl';

describe('link da vaga', () => {
  it('extrai url isolada', () => {
    expect(extractFirstUrl('https://gupy.io/job/abc123')).toBe('https://gupy.io/job/abc123');
  });

  it('extrai url dentro de texto colado', () => {
    const input = 'vaga boa https://www.linkedin.com/jobs/view/123456 confere aí';
    expect(extractFirstUrl(input)).toBe('https://www.linkedin.com/jobs/view/123456');
  });

  it('retorna null sem url', () => {
    expect(extractFirstUrl('Responsável por atendimento ao cliente e rotinas administrativas.')).toBeNull();
  });
});
