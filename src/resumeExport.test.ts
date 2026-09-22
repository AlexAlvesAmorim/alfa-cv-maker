import { describe, expect, it } from 'vitest';
import { jsPDF } from 'jspdf';
import { buildResumePdf, renderResumeDoc } from './utils/pdfExport';
import { buildResumeDocx } from './utils/docxExport';
import { TEMPLATES } from './data/templates';
import { FICTIONAL_RESUME } from './data/fictionalResume';
import { EMPTY_RESUME, type ResumeData } from './types';

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

  it('nao quebra se veio da importacao sem modelo escolhido', async () => {
    const importado = { ...FICTIONAL_RESUME };
    delete (importado as Partial<ResumeData>).layout;
    const pdf = buildResumePdf(importado as ResumeData);
    expect(pdf.size).toBeGreaterThan(1000);
    const docx = await buildResumeDocx(importado as ResumeData);
    expect(docx.size).toBeGreaterThan(500);
  });
});

// Curriculo tipico VINDO DE IMPORTACAO: textos longos, sem os limites do chat
// (FIELD_CONSTRAINTS nao se aplica ao import). Ja gerou texto fora da margem
// (cargo de linha unica no Canva/Executivo/Minimal) e pagina extra no ATS.
const IMPORTADO_LONGO: ResumeData = {
  fullName: 'ALEX ALVES AMORIM',
  targetRole: 'Desenvolvedor Front-End | React • TypeScript • Electron • Node.js e Suporte Técnico Avançado',
  layout: '',
  contact:
    'Jacarepaguá, Rio de Janeiro - RJ | alex@mail.com | (21) 97680-7111 | github.com/AlexAlvesAmorim | linkedin.com/in/alex-a-amorim | https://eu-alex-dev-hub-project.vercel.app/',
  summary:
    'Desenvolvedor Front-End com certificação CS50x e mais de 15 anos de experiência em suporte técnico avançado e atendimento ao cliente corporativo. Especialista em React, TypeScript e Electron com histórico de entrega de produtos desktop e web, interfaces responsivas e acessíveis, com foco em performance e código limpo.',
  experiences: [
    {
      role: 'Desenvolvedor Front-End Freelancer',
      company: 'ALVS Soluções Tecnológicas',
      period: '2023 - Atual',
      achievement:
        'Projetos sob demanda - em paralelo ao vínculo CLT\nConcepção e entrega de 5 produtos autorais com stack moderna\nInterfaces responsivas e acessíveis com foco em performance',
    },
    {
      role: 'Técnico de TI N3',
      company: 'InfoMorais.com',
      period: '2022 - Atual',
      achievement: 'Vínculo CLT atual | Referência técnica da equipe\nDiagnósticos avançados em hardware e redes corporativas',
    },
    {
      role: 'Analista de Suporte Técnico Sênior',
      company: 'Empresa de Telecomunicações XYZ S.A.',
      period: '2015 - 2022',
      achievement:
        'Atendimento a clientes corporativos de grande porte\nRedução de 40% no tempo médio de resolução de chamados',
    },
  ],
  education:
    'Análise e Desenvolvimento de Sistemas — Universidade Federal do Rio de Janeiro (concluído)\nCS50x - Harvard University - Certificado 2026',
  skills: 'React.js, TypeScript, Node.js, Electron, JavaScript, HTML5, CSS3, Git, Docker, Vitest, Figma, Redes, Hardware',
  languages: 'Inglês Intermediário - leitura técnica fluente\nEspanhol Básico',
  photo: '',
  photoCircle: '',
  accentColor: '',
};

interface TrackedOverflow {
  template: string;
  text: string;
  x: number;
  y: number;
  w: number;
  page: number;
  kind: 'horizontal' | 'vertical';
}

function renderTracked(resume: ResumeData): { pages: number; overflows: TrackedOverflow[] } {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const overflows: TrackedOverflow[] = [];
  let page = 1;
  const origAddPage = doc.addPage.bind(doc) as (...args: never[]) => unknown;
  doc.addPage = ((...args: never[]) => {
    page += 1;
    return origAddPage(...args);
  }) as typeof doc.addPage;
  const origText = doc.text.bind(doc) as (
    text: string | string[],
    x: number,
    y: number,
    options?: { align?: string },
  ) => unknown;
  doc.text = ((text: string | string[], x: number, y: number, options?: { align?: string }) => {
    const str = Array.isArray(text) ? text.join('') : String(text ?? '');
    if (str.trim() !== '' && Number.isFinite(x) && Number.isFinite(y)) {
      const align = options?.align ?? 'left';
      const w = doc.getTextWidth(str);
      const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
      if (left < 8 || left + w > 202) {
        overflows.push({ template: '', text: str.slice(0, 60), x, y, w, page, kind: 'horizontal' });
      }
      if (y < 8 || y > 290) {
        overflows.push({ template: '', text: str.slice(0, 60), x, y, w, page, kind: 'vertical' });
      }
    }
    return origText(text, x, y, options);
  }) as typeof doc.text;
  renderResumeDoc(doc, resume);
  return { pages: doc.getNumberOfPages(), overflows };
}

describe('export pdf de curriculo importado', () => {
  it('nenhum modelo desenha texto fora da pagina', () => {
    const failures: TrackedOverflow[] = [];
    for (const t of TEMPLATES) {
      const { overflows } = renderTracked({ ...IMPORTADO_LONGO, layout: t.value });
      for (const overflow of overflows) failures.push({ ...overflow, template: t.id });
    }
    expect(failures).toEqual([]);
  });

  it('curriculo importado nao vira mais paginas que o normal', () => {
    for (const t of TEMPLATES) {
      const { pages } = renderTracked({ ...IMPORTADO_LONGO, layout: t.value });
      expect(pages, `modelo ${t.id}`).toBeLessThanOrEqual(2);
    }
  });
});
