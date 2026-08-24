import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { ResumeData } from '../src/types';
import { buildResumePdf } from '../src/utils/pdfExport';
import { buildResumeDocx } from '../src/utils/docxExport';

const LAYOUTS = [
  'Clássico (Curriculum Vitae tradicional)',
  'ATS (padrão para robôs de RH)',
  'XYZ (padrão Google)',
  'Moderno (barra lateral com foto)',
  'Executivo (faixa escura com foto)',
  'Clean (elegante, serif com foto)',
  'Minimal (duas colunas sóbrias)',
];

const base: ResumeData = {
  fullName: 'Maria Oliveira Santos',
  targetRole: 'Desenvolvedora Front-end Júnior',
  layout: '',
  contact: 'maria@email.com | (11) 98888-7777 | São Paulo/SP | linkedin.com/in/maria',
  summary:
    'Estudante de Análise e Desenvolvimento de Sistemas buscando a primeira oportunidade como desenvolvedora front-end, com projetos práticos em React e TypeScript.',
  experience:
    'Reduzi o tempo de carregamento do site institucional em 40%, otimizando imagens e cache\nSuperei a meta de atendimento em 25% no semestre, reorganizando o funil de tickets',
  education: 'Análise e Desenvolvimento de Sistemas - Faculdade Alfa (cursando 3º semestre)',
  skills: 'React, TypeScript, Git, CSS, comunicação, trabalho em equipe',
  languages: 'Inglês intermediário',
};

const outDir = join(process.cwd(), 'smoke-out');
mkdirSync(outDir, { recursive: true });

for (const layout of LAYOUTS) {
  const resume: ResumeData = { ...base, layout };
  const slug = layout.split(' ')[0].toLowerCase().replace(/[^a-zà-ú]/g, '');

  const pdfBlob = buildResumePdf(resume);
  const pdfBuf = Buffer.from(await pdfBlob.arrayBuffer());
  writeFileSync(join(outDir, `${slug}.pdf`), pdfBuf);

  const docxBlob = await buildResumeDocx(resume);
  const docxBuf = Buffer.from(await docxBlob.arrayBuffer());
  writeFileSync(join(outDir, `${slug}.docx`), docxBuf);

  const pdfOk = pdfBuf.subarray(0, 4).toString('ascii') === '%PDF';
  const docxOk = docxBuf.subarray(0, 2).toString('ascii') === 'PK';
  console.log(`${slug}: PDF ${pdfOk ? 'OK' : 'FALHOU'} (${pdfBuf.length} bytes) | DOCX ${docxOk ? 'OK' : 'FALHOU'} (${docxBuf.length} bytes)`);
}
console.log('CONCLUIDO');
