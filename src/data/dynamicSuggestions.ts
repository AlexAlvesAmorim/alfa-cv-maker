import type { ResumeData, ResumeField } from '../types';
import { experienceText } from '../utils/resumeContent';

interface RoleProfile {
  pattern: RegExp;
  roles: string[];
  skills: string;
}

const PROFILES: RoleProfile[] = [
  {
    pattern: /vendas|cliente|atendimento|comercial|loja|caixa/i,
    roles: ['Consultor de Vendas', 'Atendente Comercial', 'Analista de Suporte Comercial'],
    skills: 'Vendas, Atendimento ao cliente, Negociação, Organização, Excel',
  },
  {
    pattern: /site|código|codigo|react|front|programa|sistema|dev|aplicativo/i,
    roles: ['Desenvolvedor(a) Front-end', 'Desenvolvedor(a) Web', 'Analista de Sistemas'],
    skills: 'React, TypeScript, Git, HTML, CSS, Resolução de problemas',
  },
  {
    pattern: /ensino|aula|aluno|professor|tutor|escola/i,
    roles: ['Professor(a)', 'Tutor(a) Educacional', 'Instrutor(a)'],
    skills: 'Comunicação, Didática, Planejamento de aulas, Paciente e empático(a)',
  },
  {
    pattern: /marketing|m[íi]dia|conte[úu]do|campanha|social/i,
    roles: ['Assistente de Marketing', 'Analista de Mídias Sociais', 'Criador(a) de Conteúdo'],
    skills: 'Marketing digital, Redes sociais, Copywriting, Analytics, Criatividade',
  },
  {
    pattern: /estoque|administrativo|planilha|excel|financeiro|faturamento/i,
    roles: ['Assistente Administrativo', 'Auxiliar Financeiro', 'Analista Administrativo'],
    skills: 'Pacote Office, Excel intermediário, Organização, Controle de estoque',
  },
  {
    pattern: /design|figma|arte|visual|layout|banner/i,
    roles: ['Designer UI/UX', 'Designer Gráfico', 'Designer Digital'],
    skills: 'Figma, Design visual, Prototipagem, Tipografia, Criatividade',
  },
];

const DEFAULT_ROLES = ['Assistente Administrativo', 'Atendente', 'Auxiliar de Operações'];
const DEFAULT_SKILLS =
  'Comunicação, Trabalho em equipe, Organização, Pró-atividade, Facilidade para aprender';

function detectProfiles(resume: ResumeData): RoleProfile[] {
  const haystack = `${experienceText(resume)} ${resume.summary} ${resume.targetRole}`;
  return PROFILES.filter((profile) => profile.pattern.test(haystack));
}

function firstExperienceLine(resume: ResumeData): string {
  const first = resume.experiences[0];
  if (!first) return '';
  const line = [first.role, first.company, first.achievement].filter(Boolean).join(' - ');
  return line.length > 110 ? `${line.slice(0, 107).trimEnd()}...` : line;
}

function hasNoFormalExperience(resume: ResumeData): boolean {
  return resume.experiences.length === 0;
}

function roleFor(resume: ResumeData): string {
  const profiles = detectProfiles(resume);
  return profiles.length > 0 ? profiles[0].roles[0] : resume.targetRole || 'profissional';
}

function buildSummarySuggestions(resume: ResumeData): string[] {
  const role = roleFor(resume).toLowerCase();
  const highlight = firstExperienceLine(resume);

  if (hasNoFormalExperience(resume)) {
    return [
      `Busco minha primeira oportunidade como ${role}, com muita vontade de aprender, dedicação total e disposição para crescer junto com a empresa.`,
      `Perfil dedicado e organizado, em início de carreira como ${role}, complementando a formação com estudos e projetos próprios.`,
      `Profissional em desenvolvimento, focado em conquistar espaço como ${role} através de comprometimento, pontualidade e trabalho em equipe.`,
    ];
  }

  const base = [
    `Profissional experiente, com conquistas mensuráveis como: "${highlight}". Busco atuar como ${role} gerando resultado desde o primeiro dia.`,
    `Histórico sólido em entregas com impacto — destaque: "${highlight}". Pronto(a) para elevar os números da equipe como ${role}.`,
    `Carreira construída sobre resultados: ${highlight}. Busco nova oportunidade como ${role} em um ambiente desafiador.`,
  ];
  return base;
}

export function suggestionsFor(stepId: ResumeField, resume: ResumeData): string[] | null {
  if (stepId === 'targetRole') {
    const profiles = detectProfiles(resume);
    if (profiles.length > 0) {
      const roles = new Set<string>();
      profiles.forEach((profile) => profile.roles.forEach((role) => roles.add(role)));
      return [...roles].slice(0, 4);
    }
    return DEFAULT_ROLES;
  }

  if (stepId === 'skills') {
    const profiles = detectProfiles(resume);
    return profiles.length > 0 ? [profiles[0].skills] : [DEFAULT_SKILLS];
  }

  if (stepId === 'summary') {
    return buildSummarySuggestions(resume);
  }

  return null;
}
