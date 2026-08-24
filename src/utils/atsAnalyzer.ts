import type { ResumeData } from '../types';
import { experienceText } from './resumeContent';

const STOPWORDS = new Set([
  'a', 'as', 'o', 'os', 'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'um', 'uma', 'uns', 'umas',
  'para', 'por', 'com', 'sem', 'no', 'na', 'nos', 'nas', 'ao', 'aos', 'à', 'às', 'que', 'se',
  'ser', 'sao', 'são', 'como', 'mais', 'menos', 'ou', 'até', 'ate', 'após', 'apos', 'entre',
  'sobre', 'the', 'and', 'for', 'with', 'you', 'your', 'our', 'will', 'are', 'have', 'has',
  'this', 'that', 'from', 'not', 'but', 'all', 'can', 'job', 'vaga', 'empresa', 'candidato',
  'candidata', 'pessoa', 'estará', 'estara', 'deve', 'deverá', 'devera', 'onde', 'qual',
  'novo', 'nova', 'novos', 'novas', 'seus', 'suas', 'pelo', 'pela', 'dos', 'das', 'área',
  'area', 'experiência', 'experiencia', 'conhecimentos', 'conhecimento', 'desejável',
  'desejavel', 'necessário', 'necessario', 'responsável', 'responsavel', 'atividades',
]);

const REQUIRED_PATTERN = /requisit|obrigat[óo]ri|necess[áa]ri|imprescind[íi]vel|o que esperamos|voc[êe] (vai|ir[áa])/i;
const DIFFERENTIAL_PATTERN = /diferencia|desej[áa]vel|\bplus\b/i;
const SECTION_RESET_PATTERN = /^(benef[íi]cios|oferecemos|sal[áa]rio|sobre a vaga|sobre n[óo]s|responsabilidades|atribui[çc][õo]es|atividades|o que voc[êe] (fara|far[áa]))\b/i;

export type KeywordStrength = 'forte' | 'media' | 'fraca';

export interface AtsResult {
  score: number;
  verdict: { label: string; tone: 'high' | 'mid' | 'low'; message: string };
  required: { matched: string[]; missing: string[] };
  differentials: { matched: string[]; missing: string[] };
  general: { matched: string[]; missing: string[] };
  strongMatches: string[];
  totalKeywords: number;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function extractKeywords(text: string): string[] {
  const tokens = normalize(text)
    .split(/[^a-z0-9+#.]+/)
    .map((word) => word.replace(/^[.]+|[.]+$/g, ''))
    .filter(Boolean);

  const unigrams = tokens.filter(
    (word) => word.length > 2 && !STOPWORDS.has(word) && !/^\d+$/.test(word),
  );
  const result: string[] = [...new Set(unigrams)];

  for (let i = 0; i < tokens.length - 1; i += 1) {
    const a = tokens[i];
    const b = tokens[i + 1];
    if (a.length < 2 || b.length < 2 || STOPWORDS.has(a) || STOPWORDS.has(b)) continue;
    const bigram = `${a} ${b}`;
    if (bigram.length > 6 && !result.includes(bigram)) result.push(bigram);
  }
  return result;
}

function splitZones(description: string): { required: string; differential: string; general: string } {
  const buckets = { required: [] as string[], differential: [] as string[], general: [] as string[] };
  let mode: keyof typeof buckets = 'general';
  for (const rawLine of description.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (REQUIRED_PATTERN.test(line)) mode = 'required';
    else if (DIFFERENTIAL_PATTERN.test(line)) mode = 'differential';
    else if (SECTION_RESET_PATTERN.test(line)) mode = 'general';
    buckets[mode].push(line);
  }
  return {
    required: buckets.required.join('\n'),
    differential: buckets.differential.join('\n'),
    general: buckets.general.join('\n'),
  };
}

function resumeLayers(resume: ResumeData): { strong: string; medium: string; weak: string } {
  return {
    strong: `${resume.skills} ${experienceText(resume)} ${resume.languages}`.toLowerCase(),
    medium: `${resume.summary} ${resume.targetRole}`.toLowerCase(),
    weak: `${resume.fullName} ${resume.education} ${resume.contact}`.toLowerCase(),
  };
}

function strengthOf(keyword: string, layers: { strong: string; medium: string; weak: string }): KeywordStrength | null {
  if (layers.strong.includes(keyword)) return 'forte';
  if (layers.medium.includes(keyword)) return 'media';
  if (layers.weak.includes(keyword)) return 'fraca';
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
      message: 'Há alinhamento, mas palavras-chave importantes da vaga não aparecem no seu currículo. Ajuste os itens ausentes para passar pela triagem automática.',
    };
  }
  return {
    label: 'Alinhamento baixo',
    tone: 'low',
    message: 'Poucos requisitos da vaga foram encontrados no seu currículo. Complete as palavras-chave ausentes — apenas com o que for verdade sobre sua experiência.',
  };
}

const ZONE_WEIGHTS = { required: 3, differential: 1.5, general: 2 } as const;

export function analyzeForJob(resume: ResumeData, jobDescription: string): AtsResult {
  const zones = splitZones(jobDescription);
  const layers = resumeLayers(resume);

  const zoneKeywords = {
    required: extractKeywords(zones.required),
    differential: extractKeywords(zones.differential),
    general: extractKeywords(zones.general),
  };

  const seen = new Map<string, { zone: keyof typeof ZONE_WEIGHTS; strength: KeywordStrength }>();

  const consider = (zone: keyof typeof ZONE_WEIGHTS, keywords: string[]) => {
    for (const keyword of keywords) {
      if (seen.has(keyword)) continue;
      const strength = strengthOf(keyword, layers);
      if (strength === null) continue;
      seen.set(keyword, { zone, strength });
    }
  };

  consider('required', zoneKeywords.required);
  consider('differential', zoneKeywords.differential);
  consider('general', zoneKeywords.general);

  const allKeywords = extractKeywords(jobDescription);

  const dropNoiseBigrams = (zoneKeywords: string[]) =>
    zoneKeywords.filter((keyword) => {
      if (!keyword.includes(' ')) return true;
      if (seen.has(keyword)) return true;
      return !keyword.split(' ').every((part) => seen.has(part));
    });

  const missingByZone = {
    required: dropNoiseBigrams(zoneKeywords.required.filter((keyword) => !seen.has(keyword))),
    differential: dropNoiseBigrams(zoneKeywords.differential.filter((keyword) => !seen.has(keyword))),
    general: dropNoiseBigrams(zoneKeywords.general.filter((keyword) => !seen.has(keyword))),
  };

  const activeByZone = {
    required: dropNoiseBigrams(zoneKeywords.required),
    differential: dropNoiseBigrams(zoneKeywords.differential),
    general: dropNoiseBigrams(zoneKeywords.general),
  };

  let earned = 0;
  let possible = 0;
  const strongMatches: string[] = [];
  const matchedByZone = { required: [] as string[], differential: [] as string[], general: [] as string[] };

  for (const zone of ['required', 'differential', 'general'] as const) {
    for (const keyword of activeByZone[zone]) {
      const entry = seen.get(keyword);
      if (!entry) continue;
      const weight = ZONE_WEIGHTS[entry.zone];
      possible += weight;
      earned += weight;
      matchedByZone[entry.zone].push(keyword);
      if (entry.strength === 'forte') strongMatches.push(keyword);
    }
    possible += ZONE_WEIGHTS[zone] * missingByZone[zone].length;
  }

  const score = possible === 0 ? 0 : Math.round((earned / possible) * 100);

  return {
    score,
    verdict: verdictFor(score),
    required: { matched: matchedByZone.required, missing: missingByZone.required },
    differentials: { matched: matchedByZone.differential, missing: missingByZone.differential },
    general: { matched: matchedByZone.general, missing: missingByZone.general },
    strongMatches,
    totalKeywords: allKeywords.length,
  };
}
