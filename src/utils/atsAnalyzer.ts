import type { ResumeData } from '../types';
import { experienceText } from './resumeContent';

const STOPWORDS = new Set([
  'a', 'as', 'o', 'os', 'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'um', 'uma', 'uns', 'umas',
  'para', 'por', 'com', 'sem', 'no', 'na', 'nos', 'nas', 'ao', 'aos', 'à', 'às', 'que', 'se',
  'ser', 'sao', 'são', 'como', 'mais', 'menos', 'ou', 'até', 'ate', 'após', 'apos', 'entre',
  'sobre', 'the', 'and', 'for', 'with', 'you', 'your', 'our', 'will', 'are', 'have', 'has',
  'this', 'that', 'from', 'not', 'but', 'all', 'can', 'job', 'vaga', 'empresa', 'candidato',
]);

export interface AtsResult {
  score: number;
  matched: string[];
  missing: string[];
  totalKeywords: number;
}

export function resumeSearchText(resume: ResumeData): string {
  return [
    resume.fullName,
    resume.targetRole,
    resume.summary,
    experienceText(resume),
    resume.education,
    resume.skills,
    resume.languages,
  ]
    .join(' ')
    .toLowerCase();
}

export function analyzeForJob(resume: ResumeData, jobDescription: string): AtsResult {
  const resumeText = resumeSearchText(resume);
  const words = jobDescription
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9+#.]+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word) && !/^\d+$/.test(word));

  const uniqueKeywords = [
    ...new Set(
      words
        .map((word) => word.replace(/^[.]+|[.]+$/g, ''))
        .filter((word) => word.length > 2 && !STOPWORDS.has(word)),
    ),
  ];
  const matched = uniqueKeywords.filter((keyword) => resumeText.includes(keyword));
  const missing = uniqueKeywords.filter((keyword) => !resumeText.includes(keyword));
  const score = uniqueKeywords.length === 0 ? 0 : Math.round((matched.length / uniqueKeywords.length) * 100);

  return {
    score,
    matched,
    missing: missing.slice(0, 15),
    totalKeywords: uniqueKeywords.length,
  };
}
