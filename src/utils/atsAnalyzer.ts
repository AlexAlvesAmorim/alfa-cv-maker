import type { ResumeData } from '../types';
import { experienceText } from './resumeContent';

/* ============ stopwords: PT comum + verbos genéricos + benefícios + boilerplate ============ */

const STOPWORDS = new Set([
  'a', 'as', 'o', 'os', 'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'um', 'uma', 'uns', 'umas',
  'para', 'por', 'com', 'sem', 'no', 'na', 'nos', 'nas', 'ao', 'aos', 'que', 'se',
  'como', 'mais', 'menos', 'ou', 'ate', 'apos', 'entre', 'sobre', 'sob', 'desde', 'durante',
  'contra', 'segundo', 'conforme', 'apesar', 'embora', 'caso', 'quando', 'onde', 'qual', 'quais',
  'quanto', 'quantos', 'tudo', 'nada', 'algo', 'alguem', 'ninguem', 'cada', 'outro', 'outra',
  'outros', 'outras', 'mesmo', 'mesma', 'tal', 'tais', 'tanto', 'tao', 'muito', 'muita',
  'muitos', 'muitas', 'pouco', 'pouca', 'poucos', 'poucas', 'bastante', 'demais', 'ainda',
  'ja', 'tambem', 'somente', 'apenas', 'sempre', 'nunca', 'jamais', 'hoje', 'ontem', 'amanha',
  'aqui', 'ai', 'ali', 'la', 'este', 'esta', 'estes', 'estas', 'esse', 'essa', 'esses', 'essas',
  'aquele', 'aquela', 'aqueles', 'aquelas', 'isto', 'isso', 'aquilo', 'meu', 'minha', 'meus',
  'minhas', 'seu', 'sua', 'seus', 'suas', 'nosso', 'nossa', 'nossos', 'nossas', 'ele', 'ela',
  'eles', 'elas', 'vos', 'mim', 'ti', 'si', 'lhe', 'lhes', 'voce', 'voces', 'qualquer',
  'todo', 'toda', 'todos', 'todas', 'pra', 'pro',
  // verbos genéricos + conjugações (descrevem deveres, não skills)
  'ser', 'estar', 'ter', 'fazer', 'ir', 'vir', 'dar', 'ver', 'querer', 'poder', 'dever',
  'precisar', 'buscar', 'atuar', 'trabalhar', 'colaborar', 'participar', 'ajudar', 'apoiar',
  'garantir', 'assegurar', 'manter', 'realizar', 'executar', 'acompanhar', 'entregar',
  'utilizar', 'usar', 'uso', 'focar', 'tornar', 'ficar', 'deixar', 'passar', 'continuar',
  'seguir', 'incluir', 'incluindo', 'conter', 'possuir', 'haver', 'existir', 'tratar',
  'visar', 'identificar', 'relacionar', 'documentar', 'validar', 'produzir', 'alterar',
  'treinar', 'fornecer', 'atualizar', 'atualizado', 'atualizada', 'sera', 'serao', 'sao',
  'seja', 'sejam', 'esteja', 'estejam', 'tenha', 'tenham', 'faca', 'facam', 'fazem', 'fara',
  'farao', 'vai', 'vao', 'ira', 'irao', 'devem', 'deverao', 'precisam', 'buscam', 'tiver',
  'tiverem', 'tera', 'terao', 'estara', 'estarao', 'devera', 'devera', 'pode', 'podem',
  'deve', 'obedecer', 'obedecido', 'obedecidos', 'cumprir', 'exigir', 'exigido', 'mediante',
  'atraves', 'entrega', 'entregas', 'garantia', 'apoio', 'ajuda', 'suporte',
  // substantivos/adjetivos genéricos de vaga
  'vaga', 'vagas', 'empresa', 'empresas', 'candidato', 'candidata', 'pessoa', 'pessoas',
  'area', 'conhecimento', 'conhecimentos', 'experiencia', 'desejavel', 'necessario',
  'responsavel', 'atividade', 'atividades', 'requisito', 'requisitos', 'diferencial',
  'diferenciais', 'plus', 'obrigatorio', 'obrigatoria', 'imprescindivel', 'requerido',
  'perfil', 'cargo', 'funcao', 'posicao', 'oportunidade', 'desafio', 'rotina',
  'projeto', 'projetos', 'processo', 'processos', 'sistema', 'sistemas', 'software',
  'programa', 'programas', 'programacao', 'programar', 'tecnologia', 'tecnologias',
  'avanco', 'avancos', 'atual', 'atuais', 'solucao', 'solucoes', 'resultado', 'resultados',
  'meta', 'metas', 'prazo', 'prazos', 'orcamento', 'orcamentos', 'relatorio', 'relatorios',
  'documento', 'documentacao', 'dado', 'dados', 'informacao', 'informacoes', 'recurso',
  'recursos', 'adicional', 'adicionais', 'geral', 'gerais', 'especifico', 'especifica',
  'especificacao', 'detalhe', 'detalhes', 'maneira', 'qualidade', 'qualificacao',
  'qualificacoes', 'essencial', 'principal', 'diversos', 'diversas', 'varios', 'varias',
  'grande', 'grandes', 'pequeno', 'novo', 'nova', 'novos', 'novas', 'melhor', 'melhores',
  'maior', 'maiores', 'menor', 'menores', 'otimo', 'excelente', 'dinamico', 'colaborativo',
  'proativo', 'comunicativo', 'organizado', 'pontual', 'dedicado', 'focado', 'comprometido',
  'resiliente', 'flexivel', 'adaptavel', 'criativo', 'inovador', 'disponivel', 'efetivo',
  'alto', 'alta', 'baixo', 'baixa', 'amplo', 'ampla', 'completo', 'completa', 'incompleto',
  'incompleta', 'unico', 'unica', 'primeiro', 'segundo', 'terceiro', 'duplo', 'triplo',
  'dobro', 'metade', 'vez', 'vezes', 'meio', 'meia', 'forma', 'jeito', 'coisa', 'lado',
  'frente', 'tras', 'dentro', 'fora', 'junto', 'longe', 'perto', 'numero', 'codigo',
  'item', 'itens', 'anexo', 'abaixo', 'acima', 'seguir', 'seguinte', 'etc', 'exemplo',
  'via', 'versus', 'aka',
  // benefícios / salário (nunca são skill)
  'beneficio', 'beneficios', 'vale', 'vales', 'refeicao', 'alimentacao', 'transporte',
  'fretado', 'cesta', 'basica', 'auxilio', 'convenio', 'convenios', 'plano', 'planos',
  'seguro', 'vida', 'saude', 'odonto', 'odontologico', 'dentario', 'bradesco', 'sulamerica',
  'wellhub', 'gympass', 'totalpass', 'sesi', 'sesc', 'wex', 'remuneracao', 'salario',
  'pagamento', 'reais', 'valor', 'mes', 'ferias', 'plr', 'clt', 'pj', 'contrato',
  'contratacao', 'regime', 'horario', 'expediente', 'escala', 'hibrido', 'presencial',
  'remoto', 'home', 'office', 'aniversario', 'aniversariante', 'bolsa', 'desconto',
  'descontos', 'kit', 'natal', 'presente', 'festa', 'brinde', 'churrasco', 'happy',
  'hour', 'premiacao', 'comissao', 'bonificacao', 'gratificacao', 'noturno',
  'insalubridade', 'periculosidade', 'fgts', 'inss', 'licenca', 'dissidio', 'reajuste',
  'creche', 'auxilio-creche', 'estacionamento', 'combustivel', 'milhas',
  // empresa / local / boilerplate
  'somos', 'missao', 'historia', 'fundada', 'fundacao', 'matriz', 'filial', 'unidade',
  'unidades', 'fabrica', 'escritorio', 'local', 'localizado', 'localizada', 'sede',
  'pais', 'brasil', 'exterior', 'regiao', 'capital', 'interior', 'paulo', 'janeiro',
  'mineiro', 'carioca', 'paulista', 'ceara', 'bahia', 'pernambuco', 'parana', 'sul',
  'norte', 'nordeste', 'sudeste', 'cidade', 'estado', 'bairro', 'rua', 'avenida', 'cep',
  'site', 'telefone', 'email', 'contato', 'mercado', 'segmento', 'setor', 'ramo',
  'cliente', 'clientes', 'fornecedor', 'parceiro', 'confianca', 'familia', 'familiar',
  'tranquilo', 'tranquila', 'alegria', 'alegre', 'momento', 'viva', 'inclusivo',
  'inclusiva', 'diversidade', 'sustentavel', 'equipe', 'time', 'times', 'grupo',
  'colegas', 'gestor', 'lideranca', 'diretoria', 'presidencia', 'acionista', 'fundador',
  'fabricante', 'fabricacao', 'equipamento', 'equipamentos', 'franquia', 'loja', 'lojas',
  // tempo / unidades (senioridade é extraída à parte, aqui é ruído)
  'ano', 'anos', 'meses', 'dia', 'dias', 'diario', 'diaria', 'semana', 'semanas',
  'hora', 'horas', 'minuto', 'minutos',
  // web / miscelânea técnica fraca
  'https', 'http', 'www', 'nota', 'notas',
  // soft-skills genéricas e substantivos fracos
  'saber', 'gostar', 'atuacao', 'vivencia', 'pratica', 'praticas', 'relacionamento',
  'proatividade', 'comprometimento', 'organizacao', 'comunicacao', 'dominio', 'solido',
  'solida', 'basico', 'intermediario', 'avancado', 'fluente', 'formacao', 'escolaridade',
  // conjugações 1ª pessoa / imperativos típicos de anúncio ("buscamos alguém")
  'buscamos', 'buscando', 'busca', 'procurar', 'procura', 'procuram', 'procuramos',
  'oferecer', 'oferece', 'esperar', 'espera', 'esperamos', 'esperado', 'desejar',
  'deseja', 'desejamos', 'desejado', 'desejada', 'quer', 'queremos', 'precisamos',
  'necessitar', 'necessita', 'necessitamos', 'valorizar', 'valoriza', 'valorizamos',
  'valorizado', 'acreditar', 'acredita', 'acreditamos', 'gosta', 'gostamos', 'amar',
  'amamos', 'tem', 'temos', 'faz', 'fazemos', 'trabalhamos', 'trabalha', 'atuamos',
  'atuando', 'atua', 'criar', 'cria', 'criamos', 'criacao', 'construir', 'construimos',
  'construcao', 'resolver', 'resolve', 'resolucao', 'lidar', 'crescer', 'crescimento',
  'aprender', 'aprendizado', 'melhorar', 'melhoria', 'melhorias', 'otimizar',
  'otimizacao', 'automatizar', 'automatizado', 'automatizada', 'automatizados', 'escalar',
  'apoia', 'apoiam', 'apoiamos', 'apoiando', 'conhecer', 'conhece', 'conhecem',
  'conheca', 'conheco', 'algum', 'alguma', 'alguns', 'algumas', 'abastecer', 'abastece',
  'abastecem', 'capacitar', 'capacita', 'capacitam', 'capacitaremos', 'capacitacao',
  // adjetivos/substantivos genéricos que sobram como chip
  'habilidade', 'habilidades', 'competencia', 'competencias', 'capacidade', 'familiaridade',
  'proficiencia', 'nocao', 'nocoes', 'fundamento', 'fundamentos', 'logica', 'estrutura',
  'estruturas', 'categoria', 'categorias', 'classe', 'mundial', 'futuro', 'consecutivo',
  'consecutiva', 'dinamica', 'dinamicas', 'utilizando', 'utilizado', 'utilizada',
  'desenvolvendo', 'desenvolvido', 'desenvolvida', 'trabalhando', 'ambiente', 'aplicativo',
  'aplicativos', 'app', 'apps', 'digital', 'escalavel', 'robusto', 'robusta', 'performar',
  'performance', 'manual', 'manuais', 'tempo', 'assistencia', 'web', 'website',
  // EN genérico
  'the', 'and', 'for', 'with', 'you', 'your', 'our', 'will', 'are', 'have', 'has',
  'had', 'been', 'being', 'who', 'what', 'when', 'where', 'which', 'while', 'about',
  'into', 'over', 'after', 'before', 'between', 'through', 'during', 'including',
  'within', 'without', 'must', 'should', 'would', 'could', 'shall', 'might', 'need',
  'needs', 'required', 'requirements', 'bonus', 'benefits', 'benefit', 'salary',
  'health', 'insurance', 'paid', 'time', 'off', 'day', 'days', 'free', 'meal', 'food',
  'remote', 'hybrid', 'experience', 'knowledge', 'skills', 'skill', 'company', 'team',
  'role', 'job', 'jobs', 'position', 'candidate', 'apply', 'hiring', 'join', 'us', 'we',
  'work', 'working', 'looking', 'seeking', 'seek', 'want', 'help', 'support', 'ensure',
  'maintain', 'perform', 'execute', 'deliver', 'drive', 'build', 'grow', 'fast',
  'paced', 'great', 'good', 'best', 'top', 'new', 'big', 'small', 'high', 'low',
  'full', 'part', 'key', 'core', 'main', 'diverse', 'plus', 'life', 'dental', 'gym',
  'office', 'home', 'vision',
]);

/* ============ dicionário profissional: stacks, funções, formação ============ */

const TECH = new Set([
  'javascript', 'js', 'typescript', 'ts', 'python', 'java', 'c#', 'c++', 'php', 'ruby',
  'go', 'kotlin', 'swift', 'dart', 'flutter', 'delphi', 'pascal', 'cobol', 'vba', 'scala',
  'rust', 'perl', 'lua', 'html', 'css', 'sass', 'scss', 'less', 'react', 'angular', 'vue',
  'vuejs', 'next', 'nextjs', 'nuxt', 'svelte', 'jquery', 'bootstrap', 'tailwind', 'ionic',
  'xamarin', 'cordova', 'pwa', 'node', 'express', 'nest', 'nestjs', 'django', 'flask',
  'fastapi', 'spring', 'laravel', 'symfony', 'rails', 'dotnet', 'aspnet', 'blazor', 'net',
  'android', 'ios', 'sql', 'mysql', 'postgres', 'oracle', 'sqlserver', 'mongodb', 'redis',
  'elasticsearch', 'sqlite', 'mariadb', 'firebird', 'nosql', 'etl', 'power_bi', 'tableau',
  'qlik', 'excel', 'pandas', 'numpy', 'spark', 'hadoop', 'bi', 'erp', 'sapiens', 'sap',
  'totvs', 'protheus', 'datasul', 'salesforce', 'dynamics', 'webservice', 'webservices',
  'api', 'apis', 'rest', 'restful', 'soap', 'graphql', 'json', 'xml', 'aws', 'azure',
  'gcp', 'docker', 'kubernetes', 'k8s', 'terraform', 'jenkins', 'gitlab', 'github',
  'linux', 'debian', 'ubuntu', 'windows', 'server', 'servidor', 'servidores', 'redes',
  'infraestrutura', 'infra', 'zabbix', 'grafana', 'prometheus', 'git', 'jira',
  'confluence', 'figma', 'scrum', 'kanban', 'agile', 'devops', 'tdd', 'bdd', 'ddd',
  'microservicos', 'microsservicos', 'microservices', 'mvc', 'mvvm', 'solid', 'clean',
  'embarcado', 'embarcados', 'firmware', 'iot', 'automacao', 'clp', 'lgpd', 'owasp',
  'pentest', 'criptografia', 'jest', 'cypress', 'selenium', 'junit', 'pytest', 'qa',
  'frontend', 'front_end', 'backend', 'fullstack', 'full_stack', 'mobile', 'desktop',
  'legado', 'legacy', 'framework', 'frameworks', 'banco_dados', 'crm', 'fiscal',
  'contabil', 'financeiro', 'folha', 'estoque', 'faturamento', 'nfe', 'sped', 'cnh',
  'ci', 'cd', 'tech', 'tech_lead', 'scrum_master', 'product_owner', 'machine_learning',
  'deep_learning',   'ciencia_dados', 'sql_server', 'pl_sql', 'react_native', 'nativo',
  'nativa', 'testes_automatizados', 'karma', 'protractor', 'jasmine', 'mocha',
  'webpack', 'eslint',
]);

const ROLE_EDU = new Set([
  'desenvolvedor', 'desenvolvedora', 'developer', 'dev', 'analista', 'engenheiro',
  'engenheira', 'engineer', 'arquiteto', 'arquiteta', 'tecnico', 'tecnica', 'assistente',
  'auxiliar', 'estagiario', 'trainee', 'junior', 'pleno', 'senior', 'especialista',
  'coordenador', 'coordenadora', 'gerente', 'dba', 'tester', 'consultor', 'consultora',
  'ensino_superior', 'ensino_medio', 'curso_tecnico', 'graduacao', 'graduado',
  'graduada', 'bacharel', 'bacharelado', 'tecnologo', 'mba', 'mestrado', 'doutorado',
  'pos', 'certificacao', 'computacao', 'informatica', 'engenharia', 'ingles',
  'ciencia_computacao', 'analise_sistemas', 'pos_graduacao',
]);

/** Rótulo legível para compostos internos (underscore). */
const DISPLAY_OF: Record<string, string> = {
  banco_dados: 'banco de dados',
  front_end: 'front-end',
  full_stack: 'full-stack',
  power_bi: 'power bi',
  sql_server: 'sql server',
  pl_sql: 'pl/sql',
  tech_lead: 'tech lead',
  scrum_master: 'scrum master',
  product_owner: 'product owner',
  ensino_superior: 'ensino superior',
  ensino_medio: 'ensino médio',
  curso_tecnico: 'curso técnico',
  ciencia_dados: 'ciência de dados',
  ciencia_computacao: 'ciência da computação',
  analise_sistemas: 'análise de sistemas',
  machine_learning: 'machine learning',
  deep_learning: 'deep learning',
  react_native: 'react native',
  testes_automatizados: 'testes automatizados',
  pos_graduacao: 'pós-graduação',
};

function displayOf(token: string): string {
  return DISPLAY_OF[token] ?? token.replace(/_/g, ' ');
}

export type KeywordStrength = 'forte' | 'media' | 'fraca';

export interface AtsResult {
  score: number;
  verdict: { label: string; tone: 'high' | 'mid' | 'low'; message: string };
  required: { matched: string[]; missing: string[] };
  differentials: { matched: string[]; missing: string[] };
  general: { matched: string[]; missing: string[] };
  /** Stacks/ferramentas em falta (subconjunto priorizado dos ausentes). */
  stacks: { missing: string[] };
  /** Sinais de senioridade pedidos na vaga (anos, inglês, nível). */
  seniority: string[];
  strongMatches: string[];
  totalKeywords: number;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Canon: normaliza + funde compostos (front-end→front_end, banco de dados→banco_dados...). */
function canon(text: string): string {
  return normalize(text)
    .replace(/[-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\bbanco\s+de\s+dados\b/g, 'banco_dados')
    .replace(/\bbase\s+de\s+dados\b/g, 'banco_dados')
    .replace(/\bpos\s+graduacao\b/g, 'pos_graduacao')
    .replace(/\bciencia\s+(da\s+)?computacao\b/g, 'ciencia_computacao')
    .replace(/\banalise\s+(e\s+desenvolvimento\s+)?de\s+sistemas\b/g, 'analise_sistemas')
    .replace(/\bensino\s+superior\b/g, 'ensino_superior')
    .replace(/\bensino\s+medio\b/g, 'ensino_medio')
    .replace(/\bcurso\s+tecnico\b/g, 'curso_tecnico')
    .replace(/\bmachine\s+learning\b/g, 'machine_learning')
    .replace(/\bdeep\s+learning\b/g, 'deep_learning')
    .replace(/\bciencia\s+de\s+dados\b/g, 'ciencia_dados')
    .replace(/\bdata\s+science\b/g, 'ciencia_dados')
    .replace(/\bpower\s+bi\b/g, 'power_bi')
    .replace(/\bsql\s+server\b/g, 'sql_server')
    .replace(/\bpl\s*\/?\s*sql\b/g, 'pl_sql')
    .replace(/\bmy\s+sql\b/g, 'mysql')
    .replace(/\bnode\s*\.?\s*js\b/g, 'node')
    .replace(/\bnext\s*\.?\s*js\b/g, 'nextjs')
    .replace(/\bvue\s*\.?\s*js\b/g, 'vue')
    .replace(/\breact\s+native\b/g, 'react_native')
    .replace(/\bfront\s+end\b/g, 'front_end')
    .replace(/\bfull\s+stack\b/g, 'full_stack')
    .replace(/\btech\s+lead\b/g, 'tech_lead')
    .replace(/\bscrum\s+master\b/g, 'scrum_master')
    .replace(/\bproduct\s+owner\b/g, 'product_owner')
    .replace(/\btestes\s+automatizados\b/g, 'testes_automatizados')
    .replace(/\bpostgresql\b/g, 'postgres');
}

const REQUIRED_HEADER = /(^|[\s:])requisit|obrigatori|necessari|imprescindivel|o que esperamos|perfil (desejado|buscado|procurado)|o que voce precisa|voce vai (fazer|atuar|trabalhar)/;
const DIFFERENTIAL_HEADER = /diferencia|desejavel|\bplus\b|sera um diferencial|pontos? extras?|sera considerado diferencial/;
const IGNORED_HEADER = /^(beneficios?|vantagens|o que oferecemos|remuneracao|salario|bolsa|horario|jornada|local( de trabalho)?|sobre (a |)(empresa|nos|a vaga)|quem somos|a empresa|nossa empresa|informacoes da empresa|contratacao)\b/;
const RESET_GENERAL = /^(responsabilidades|atribuicoes|atividades|o que voce (fara|faz)|suas atividades|dia a dia|principais atividades|suas responsabilidades)\b/;
/** Frases de benefício/salário/boilerplate: ignoradas onde quer que apareçam. */
const NOISE_LINE = /vale\s?(refeicao|alimentacao|transporte)|cesta\s*basica|auxilio|convenio|plano\s*(de\s*)?saude|seguro\s*de\s*vida|assistencia\s*(medica|odontologica)|gympass|wellhub|totalpass|day\s*off|aniversari|bolsa\s*(de\s*)?(estudo|educacao|idioma)|desconto|kit\s*(natal|bem|boas)|festa\s*de|brinde|churrasco|happy\s*hour|r\$\s*[\d.]|salario\s*(de\s*)?(r\$|[\d.])|remuneracao|participacao\s*nos\s*lucros|\bplr\b|oferecemos|somos\s|maior\s*fabricante|nossa\s*(empresa|historia|cultura)|sobre\s*nos|quem\s*somos|matriz\s|filial\s|escritorio|fabrica|fundad[ao]|ha\s*\d+\s*anos\s*no\s*mercado|presente\s*em\s*\d+|videocirurgia/;

type Zone = 'required' | 'differential' | 'general';

/** Quebra a descrição em fragmentos curtos (linhas, listas, frases). */
function fragmentsOf(description: string): string[] {
  const out: string[] = [];
  for (const line of description.split(/\r?\n/)) {
    // ':' separa cabeçalho do conteúdo (evita "front-end react"); '/' quebra ci/cd
    for (const chunk of line.split(/[;•▪●○◦|/:]+/)) {
      // vírgula separa itens de lista — evita bigramas falsos tipo "react typescript"
      for (const part of chunk.split(/,/)) {
        // ponto + maiúscula/número = fim de frase (preserva node.js)
        for (const sent of part.split(/\.\s+(?=[A-ZÃÕÇÁÉÍÓÚ0-9])/)) {
          const s = sent.trim().replace(/\s+/g, ' ');
          if (s) out.push(s);
        }
      }
    }
  }
  return out;
}

function splitZones(description: string): Record<Zone, string[]> {
  const buckets: Record<Zone | 'ignored', string[]> = { required: [], differential: [], general: [], ignored: [] };
  let mode: Zone | 'ignored' = 'general';
  for (const frag of fragmentsOf(description)) {
    const c = canon(` ${frag} `);
    if (REQUIRED_HEADER.test(c)) mode = 'required';
    else if (DIFFERENTIAL_HEADER.test(c)) mode = 'differential';
    else if (IGNORED_HEADER.test(c)) mode = 'ignored';
    else if (RESET_GENERAL.test(c)) mode = 'general';
    else if (NOISE_LINE.test(c)) {
      // Salva o que presta: "Python e plano de saúde" → aproveita "Python".
      for (const part of frag.split(/\s+e\s+|\s+com\s+/i)) {
        const trimmed = part.trim();
        if (!trimmed || NOISE_LINE.test(canon(` ${trimmed} `))) continue;
        buckets[mode].push(trimmed);
      }
      continue;
    }
    if (mode === 'ignored') {
      buckets.ignored.push(frag);
      continue;
    }
    buckets[mode].push(frag);
  }
  return { required: buckets.required, differential: buckets.differential, general: buckets.general };
}

interface TermInfo {
  display: string;
  freq: number;
  tech: boolean;
  roleEdu: boolean;
}

function isNumeric(tok: string): boolean {
  return /^[\d.,/_-]+$/.test(tok) || (/\d/.test(tok) && !TECH.has(tok));
}

function tokenizeFragment(frag: string): string[] {
  return canon(` ${frag} `)
    .split(/[^a-z0-9+#._]+/)
    .map((w) => w.replace(/^[-._]+|[-._]+$/g, ''))
    .filter(Boolean);
}

/** Extrai termos de uma zona, com frequência e flags. Bigramas só dentro do fragmento. */
function extractZoneTerms(frags: string[]): Map<string, TermInfo> {
  const map = new Map<string, TermInfo>();
  const add = (token: string) => {
    const entry = map.get(token);
    if (entry) entry.freq += 1;
    else {
      map.set(token, {
        display: displayOf(token),
        freq: 1,
        tech: TECH.has(token),
        roleEdu: ROLE_EDU.has(token),
      });
    }
  };
  const keepUnigram = (tok: string): boolean => {
    if (tok.length < 2 || STOPWORDS.has(tok) || isNumeric(tok)) return false;
    if (tok.length === 2 && !TECH.has(tok)) return false;
    return true;
  };
  for (const frag of frags) {
    // Bigramas só entre vizinhos reais (sem pular stopwords): evita "typescript css".
    const raw = tokenizeFragment(frag);
    const ok = raw.map(keepUnigram);
    for (let i = 0; i < raw.length; i += 1) {
      if (ok[i]) add(raw[i]);
    }
    for (let i = 0; i < raw.length - 1; i += 1) {
      if (!ok[i] || !ok[i + 1]) continue;
      const a = raw[i];
      const b = raw[i + 1];
      if (a.length < 2 || b.length < 2) continue;
      const aTech = TECH.has(a);
      const bTech = TECH.has(b);
      const compound = ROLE_EDU.has(a) && ROLE_EDU.has(b);
      if (!aTech && !bTech && !compound && (a.length < 5 || b.length < 5)) continue;
      const bigram = `${a} ${b}`;
      if (bigram.length <= 6 || map.has(bigram)) {
        if (map.has(bigram)) add(bigram);
        continue;
      }
      map.set(bigram, {
        display: `${displayOf(a)} ${displayOf(b)}`,
        freq: 1,
        tech: aTech || bTech,
        roleEdu: compound,
      });
    }
  }
  // Suprime unigramas cobertos por um bigrama ("sapiens erp" substitui "sapiens"+"erp").
  const covered = new Set<string>();
  for (const key of map.keys()) {
    if (!key.includes(' ')) continue;
    for (const part of key.split(' ')) covered.add(part);
  }
  for (const part of covered) {
    const entry = map.get(part);
    if (entry && !part.includes(' ')) map.delete(part);
  }
  return map;
}

/** Nível/senioridade/idioma pedidos na vaga (do texto bruto, antes dos filtros). */
function extractSeniority(raw: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (s: string) => {
    const t = s.trim().replace(/\s+/g, ' ');
    const k = t.toLowerCase();
    if (t && t.length <= 42 && !seen.has(k)) {
      seen.add(k);
      out.push(t);
    }
  };
  const ACCENT: Record<string, string> = {
    experiencia: 'experiência', pratica: 'prática', atuacao: 'atuação', vivencia: 'vivência',
    fluente: 'fluente', avancado: 'avançado', intermediario: 'intermediário', basico: 'básico',
    tecnico: 'técnico', junior: 'júnior', pleno: 'pleno', senior: 'sênior', trainee: 'trainee',
    estagio: 'estágio',
  };
  const c = ` ${canon(raw)} `;
  const yearRe = /(\d{1,2})\s*\+?\s*(anos?|meses?)(?:\s*de\s*(experiencia|atuacao|vivencia|pratica))?/g;
  let m: RegExpExecArray | null;
  while ((m = yearRe.exec(c)) !== null) {
    const n = Number(m[1]);
    if (n <= 0 || n > 30) continue;
    const unit = m[2].startsWith('mes') ? 'meses' : 'anos';
    push(`${m[1]} ${unit}${m[3] ? ` de ${ACCENT[m[3]] ?? m[3]}` : ''}`);
  }
  const engRe = /\bingles\s*(fluente|avancado|intermediario|basico|tecnico)?/g;
  while ((m = engRe.exec(c)) !== null) {
    push(m[1] ? `Inglês ${ACCENT[m[1]] ?? m[1]}` : 'Inglês');
  }
  const levelRe = /\b(junior|pleno|senior|trainee|estagio)\b/g;
  while ((m = levelRe.exec(c)) !== null) {
    push(`Nível ${ACCENT[m[1]] ?? m[1]}`);
  }
  return out.slice(0, 6);
}

function resumeLayers(resume: ResumeData): { strong: string; medium: string; weak: string } {
  return {
    strong: canon(`${resume.skills} ${experienceText(resume)} ${resume.languages}`),
    medium: canon(`${resume.summary} ${resume.targetRole}`),
    weak: canon(`${resume.fullName} ${resume.education} ${resume.contact}`),
  };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const BOUND = '[^a-z0-9+#_]';

function layerContains(layer: string, key: string): boolean {
  if (!key) return false;
  if (key.includes(' ')) return layer.includes(key);
  return new RegExp(`(^|${BOUND})${escapeRegExp(key)}(${BOUND}|$)`).test(layer);
}

function strengthOf(
  key: string,
  layers: { strong: string; medium: string; weak: string },
): KeywordStrength | null {
  if (layerContains(layers.strong, key)) return 'forte';
  if (layerContains(layers.medium, key)) return 'media';
  if (layerContains(layers.weak, key)) return 'fraca';
  return null;
}

function verdictFor(score: number): AtsResult['verdict'] {
  if (score >= 75) {
    return {
      label: 'Candidatura forte',
      tone: 'high',
      message: 'Seu currículo cobre a maior parte do que a vaga pede. Revise os termos ausentes abaixo — se forem verdade sobre você, inclua-os antes de enviar.',
    };
  }
  if (score >= 45) {
    return {
      label: 'Quase lá',
      tone: 'mid',
      message: 'Há alinhamento, mas pontos importantes da vaga não aparecem no seu currículo. Ajuste os itens ausentes para passar pela triagem automática.',
    };
  }
  return {
    label: 'Alinhamento baixo',
    tone: 'low',
    message: 'Poucos requisitos da vaga foram encontrados no seu currículo. Complete os itens ausentes — apenas com o que for verdade sobre sua experiência.',
  };
}

const ZONE_WEIGHTS = { required: 3, differential: 1.5, general: 2 } as const;
const CAPS: Record<Zone, number> = { required: 20, differential: 12, general: 10 };

interface ActiveTerm {
  key: string;
  display: string;
  tech: boolean;
  zone: Zone;
}

export function analyzeForJob(resume: ResumeData, jobDescription: string): AtsResult {
  const empty: AtsResult = {
    score: 0,
    verdict: verdictFor(0),
    required: { matched: [], missing: [] },
    differentials: { matched: [], missing: [] },
    general: { matched: [], missing: [] },
    stacks: { missing: [] },
    seniority: [],
    strongMatches: [],
    totalKeywords: 0,
  };
  if (!jobDescription.trim()) return empty;

  const seniority = extractSeniority(jobDescription);
  const zones = splitZones(jobDescription);
  const layers = resumeLayers(resume);

  // casa cada termo na zona de maior prioridade (sem duplicar entre zonas)
  const assigned = new Map<string, ActiveTerm>();
  const rankOf = (t: TermInfo) => (t.tech ? 3 : t.roleEdu ? 2 : 1) + Math.min(t.freq - 1, 4) * 0.25;
  for (const zone of ['required', 'differential', 'general'] as const) {
    const terms = [...extractZoneTerms(zones[zone]).entries()]
      .filter(([key]) => !assigned.has(key))
      .sort((a, b) => rankOf(b[1]) - rankOf(a[1]) || a[1].display.localeCompare(b[1].display))
      .slice(0, CAPS[zone]);
    for (const [key, info] of terms) {
      assigned.set(key, { key, display: info.display, tech: info.tech, zone });
    }
  }
  const active = [...assigned.values()];
  if (active.length === 0) return { ...empty, seniority };

  const seen = new Map<string, { zone: Zone; strength: KeywordStrength }>();
  for (const term of active) {
    const strength = strengthOf(term.key, layers);
    if (strength !== null) seen.set(term.key, { zone: term.zone, strength });
  }

  let earned = 0;
  let possible = 0;
  const strongMatches: string[] = [];
  const matchedByZone: Record<Zone, string[]> = { required: [], differential: [], general: [] };
  const missingByZone: Record<Zone, string[]> = { required: [], differential: [], general: [] };

  for (const term of active) {
    const weight = ZONE_WEIGHTS[term.zone] * (term.tech ? 1.5 : 1);
    possible += weight;
    const entry = seen.get(term.key);
    if (!entry) {
      missingByZone[term.zone].push(term.display);
      continue;
    }
    earned += weight;
    matchedByZone[entry.zone].push(term.display);
    if (entry.strength === 'forte') strongMatches.push(term.display);
  }

  const score = possible === 0 ? 0 : Math.round((earned / possible) * 100);

  const stackSeen = new Set<string>();
  const stacksMissing: string[] = [];
  for (const zone of ['required', 'differential', 'general'] as const) {
    for (const term of active) {
      if (term.zone !== zone || !term.tech || seen.has(term.key) || stackSeen.has(term.key)) continue;
      stackSeen.add(term.key);
      stacksMissing.push(term.display);
    }
  }

  return {
    score,
    verdict: verdictFor(score),
    required: { matched: matchedByZone.required, missing: missingByZone.required },
    differentials: { matched: matchedByZone.differential, missing: missingByZone.differential },
    general: { matched: matchedByZone.general, missing: missingByZone.general },
    stacks: { missing: stacksMissing.slice(0, 15) },
    seniority,
    strongMatches,
    totalKeywords: active.length,
  };
}
