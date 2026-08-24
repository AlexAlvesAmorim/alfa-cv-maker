import type { ResumeData, ResumeField } from '../types';
import { experienceText } from '../utils/resumeContent';
import { OBJECTIVE_PHRASES } from './objectivePhrases';
import { SUMMARY_TEMPLATES } from './summaryTemplates';

interface RoleProfile {
  area: string;
  pattern: RegExp;
  roles: string[];
  skills: string;
}

const PROFILES: RoleProfile[] = [
  {
    area: 'vendas',
    pattern: /vendas|cliente|atendimento|comercial|loja|caixa/i,
    roles: ['Consultor de Vendas', 'Atendente Comercial', 'Analista de Suporte Comercial'],
    skills: 'Vendas, Atendimento ao cliente, Negociação, Organização, Excel',
  },
  {
    area: 'marketing',
    pattern: /marketing|m[íi]dia|conte[úu]do|campanha|social|seo/i,
    roles: ['Assistente de Marketing', 'Analista de Mídias Sociais', 'Criador(a) de Conteúdo'],
    skills: 'Marketing digital, Redes sociais, Copywriting, Analytics, Criatividade',
  },
  {
    area: 'design',
    pattern: /design|figma|arte|visual|layout|banner/i,
    roles: ['Designer UI/UX', 'Designer Gráfico', 'Designer Digital'],
    skills: 'Figma, Design visual, Prototipagem, Tipografia, Criatividade',
  },
  {
    area: 'educacao',
    pattern: /ensino|aula|aluno|professor|tutor|escola|pedagogia/i,
    roles: ['Professor(a)', 'Tutor(a) Educacional', 'Instrutor(a)'],
    skills: 'Comunicação, Didática, Planejamento de aulas, Paciente e empático(a)',
  },
  {
    area: 'saude',
    pattern: /psicolog|sa[úu]de|cl[íi]nica|enfermagem|fisioterapia/i,
    roles: ['Psicólogo(a)', 'Assistente de Saúde', 'Atendente de Clínica'],
    skills: 'Escuta ativa, Empatia, Prontuários e registros, Ética profissional',
  },
  {
    area: 'juridico',
    pattern: /jur[íi]dico|direito|advocacia|peti[çc][ãa]o|audi[êe]ncia|c[íi]vel/i,
    roles: ['Advogado(a)', 'Estagiário(a) de Direito', 'Assistente Jurídico'],
    skills: 'Pesquisa jurídica, Redação de petições, Direito civil e trabalhista, Organização documental',
  },
  {
    area: 'rh',
    pattern: /recursos humanos|\brh\b|recrutamento|gest[ãa]o de pessoas|clima organizacional|turnover/i,
    roles: ['Analista de RH', 'Assistente de Departamento Pessoal', 'Recrutador(a)'],
    skills: 'Recrutamento e seleção, Departamento pessoal, Entrevistas, Clima organizacional, Pacote Office',
  },
  {
    area: 'financeiro',
    pattern: /financeiro|concilia[çc][ãa]o|fluxo de caixa|contabil|cont[áa]bil|custos|cobran[çc]a/i,
    roles: ['Analista Financeiro', 'Assistente Financeiro', 'Auxiliar de Cobrança'],
    skills: 'Conciliação bancária, Fluxo de caixa, Excel, Análise de custos, Contas a pagar e receber',
  },
  {
    area: 'logistica',
    pattern: /log[íi]stica|expedi[çc][ãa]o|almoxarifado|recebimento|frota|motorista|estoque/i,
    roles: ['Auxiliar de Logística', 'Analista de Logística', 'Operador(a) de Expedição'],
    skills: 'Controle de estoque, Expedição, Organização de cargas, Excel, Proatividade',
  },
  {
    area: 'tech',
    pattern: /site|código|codigo|react|front|programa|sistema|dev|aplicativo|suporte|inform[áa]tica/i,
    roles: ['Desenvolvedor(a) Front-end', 'Desenvolvedor(a) Web', 'Analista de Sistemas'],
    skills: 'React, TypeScript, Git, HTML, CSS, Resolução de problemas',
  },
  {
    area: 'administrativo',
    pattern: /administrativo|planilha|excel|faturamento|escrit[óo]rio/i,
    roles: ['Assistente Administrativo', 'Auxiliar Financeiro', 'Analista Administrativo'],
    skills: 'Pacote Office, Excel intermediário, Organização, Rotinas administrativas',
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

  return [
    `Profissional experiente, com conquistas mensuráveis como: "${highlight}". Busco atuar como ${role} gerando resultado desde o primeiro dia.`,
    `Histórico sólido em entregas com impacto — destaque: "${highlight}". Pronto(a) para elevar os números da equipe como ${role}.`,
    `Carreira construída sobre resultados: ${highlight}. Busco nova oportunidade como ${role} em um ambiente desafiador.`,
  ];
}

export function suggestionsFor(stepId: ResumeField, resume: ResumeData): string[] | null {
  if (stepId === 'targetRole') {
    const profiles = detectProfiles(resume);
    const roleSuggestions =
      profiles.length > 0
        ? (() => {
            const roles = new Set<string>();
            profiles.forEach((profile) => profile.roles.forEach((role) => roles.add(role)));
            return [...roles].slice(0, 3);
          })()
        : DEFAULT_ROLES;
    return [...roleSuggestions, ...OBJECTIVE_PHRASES];
  }

  if (stepId === 'skills') {
    const profiles = detectProfiles(resume);
    return profiles.length > 0 ? [profiles[0].skills] : [DEFAULT_SKILLS];
  }

  if (stepId === 'summary') {
    const areas = new Set(detectProfiles(resume).map((profile) => profile.area));
    const matchedTemplates = SUMMARY_TEMPLATES.filter(
      (template) =>
        areas.has(template.area) || (hasNoFormalExperience(resume) && template.area === 'iniciante'),
    );
    return [...matchedTemplates.slice(0, 2).map((template) => template.text), ...buildSummarySuggestions(resume)];
  }

  return null;
}
