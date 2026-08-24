import type { ResumeData } from '../src/types';
import { cleanFullName, orderedContactParts } from '../src/utils/resumeContent';
import { suggestionsFor } from '../src/data/dynamicSuggestions';
import { buildResumePdf } from '../src/utils/pdfExport';
import { buildResumeDocx } from '../src/utils/docxExport';

let failures = 0;
function check(label: string, condition: boolean): void {
  console.log(`${condition ? 'PASSOU' : 'FALHOU'} | ${label}`);
  if (!condition) failures += 1;
}

const nameCases: Array<[string, string]> = [
  ['meu nome é maria da silva', 'Maria da Silva'],
  ['Meu nome é João Pedro Almeida.', 'João Pedro Almeida'],
  ['sou o pedro henrique', 'Pedro Henrique'],
  ['JOÃO pedro almeida', 'João Pedro Almeida'],
  ['prazer, meu nome é Ana Souza!', 'Ana Souza'],
  ['Ana de Tal', 'Ana de Tal'],
];

for (const [input, expected] of nameCases) {
  const got = cleanFullName(input);
  check(`nome "${input}" => "${got}"`, got === expected);
}

const contact = orderedContactParts('linkedin.com/in/maria | maria@email.com | São Paulo/SP | (11) 98888-7777');
check(
  `ordem contato => ${contact.join(' >> ')}`,
  contact[0].includes('98888') && contact[1].includes('@') && contact[2].includes('Paulo') && contact[3].includes('linkedin'),
);

const salesResume: ResumeData = {
  fullName: 'Maria Oliveira Santos',
  targetRole: '',
  layout: 'XYZ',
  contact: '(11) 98888-7777 | maria@email.com | São Paulo/SP',
  summary: '',
  experiences: [
    {
      role: 'Vendedora',
      company: 'Loja Alfa',
      period: '2023-2025',
      achievement: 'Superei a meta de vendas em 25% reorganizando o funil de atendimento ao cliente',
    },
  ],
  education: '',
  skills: '',
  languages: '',
  photo: '',
  photoCircle: '',
  accentColor: '',
};

const roles = suggestionsFor('targetRole', salesResume) ?? [];
console.log(`Cargos sugeridos (vendas): ${roles.join(', ')}`);
check('objetivo dinâmico detecta área comercial', roles.some((role) => /vendas|comercial/i.test(role)));

const summaries = suggestionsFor('summary', salesResume) ?? [];
console.log(`Primeiro resumo sugerido: ${summaries[0]?.slice(0, 90)}...`);
check(
  'resumo dinâmico cita a conquista',
  summaries.length >= 4 && summaries.some((item) => item.toLowerCase().includes('vendas')),
);

const skills = suggestionsFor('skills', salesResume) ?? [];
console.log(`Habilidades sugeridas: ${skills[0]}`);
check('habilidades dinâmicas do pacote comercial', skills[0]?.includes('Vendas') === true);

const juniorResume: ResumeData = { ...salesResume, experiences: [] };
const juniorSummaries = suggestionsFor('summary', juniorResume) ?? [];
console.log(`Resumo iniciante: ${juniorSummaries[0]?.slice(0, 80)}...`);
check(
  'modo primeira oportunidade ativado',
  juniorSummaries.some((item) => item.includes('primeira oportunidade')),
);

const objectives = suggestionsFor('targetRole', salesResume) ?? [];
check('frases prontas de objetivo disponíveis', objectives.some((item) => item.startsWith('Sou iniciante na carreira')));

const LAYOUTS = [
  'Clássico (Curriculum Vitae tradicional)',
  'ATS (padrão para robôs de RH)',
  'XYZ (padrão Google)',
  'Moderno (barra lateral com foto)',
  'Executivo (faixa escura com foto)',
  'Clean (elegante, serif com foto)',
  'Minimal (duas colunas sóbrias)',
];

for (const layout of LAYOUTS) {
  const accent = layout.startsWith('XYZ') ? '#1A73E8' : '';
  const resume: ResumeData = { ...salesResume, layout, accentColor: accent };
  const pdfOk = Buffer.from(await buildResumePdf(resume).arrayBuffer()).subarray(0, 4).toString() === '%PDF';
  const docxOk = Buffer.from(await (await buildResumeDocx(resume)).arrayBuffer()).subarray(0, 2).toString() === 'PK';
  check(`${layout.split(' ')[0]}: PDF ${pdfOk ? 'OK' : 'FALHOU'} | DOCX ${docxOk ? 'OK' : 'FALHOU'}`, pdfOk && docxOk);
}

console.log(failures === 0 ? 'TODOS OS TESTES PASSARAM' : `${failures} TESTE(S) FALHARAM`);
process.exit(failures === 0 ? 0 : 1);
