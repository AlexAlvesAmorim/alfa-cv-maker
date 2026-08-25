import type { Experience, ResumeData } from '../types';

export interface ImportResult {
  fields: Partial<ResumeData>;
  recognized: string[];
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]{2,}/;
const LINKEDIN_RE = /linkedin\.com|github\.com|\blattes\b/i;
const PHONE_RE = /(\+\d{1,2}\s?)?\(?\d{2}\)?\s?(9\s?\d{4}|[2-5]\d{3})[- ]?\d{4}/;
const CITY_RE = /[A-ZÁ-Ú][a-zá-ú]+(\sde\s[A-ZÁ-Ú][a-zá-ú]+)*\s*\/\s*[A-Z]{2}\b/;
const YEAR_RANGE_PHONE_TRAP = /(19|20)\d{2}\s*[-–—]\s*(19|20)\d{2}/;

const SECTION_PATTERNS: Array<[keyof ResumeData, RegExp]> = [
  ['summary', /^resumo|^objetivo|^perfil|^about/i],
  ['experiences', /^experi[êe]nc|^hist[óo]rico profissional|^emprego|^carreira/i],
  ['education', /^forma[çc][ãa]o|^escolaridade|^educa[çc][ãa]o|^acad[êe]mic|^cursos?/i],
  ['skills', /^habilidades|^compet[êe]ncias|^qualifica[çc][õo]es|^conhecimentos|^skills|^tecnologias/i],
  ['languages', /^idiomas|^l[íi]nguas/i],
];

const PERIOD_RE =
  /(?:(?:19|20)\d{2}|[01]?\d\/(?:19|20)\d{2})\s*(?:-|–|—|até|a\s)\s*(?:(?:19|20)\d{2}|[01]?\d\/(?:19|20)\d{2}|atualmente?|presente|hoje)|atualmente|(?:desde|de)\s+(?:19|20)\d{2}\b/i;

export async function extractTextFromFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('Arquivo muito grande — o limite é 10 MB.');
  }
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return extractPdfText(await file.arrayBuffer());
  if (name.endsWith('.docx')) return extractDocxText(await file.arrayBuffer());
  if (name.endsWith('.txt') || file.type.startsWith('text/')) return file.text();
  throw new Error('Formato não suportado — envie PDF, DOCX ou TXT.');
}

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const loadingTask = pdfjs.getDocument({ data: buffer });
  const doc = await loadingTask.promise;
  const pageLines: string[][] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const rows = new Map<number, string[]>();

    for (const item of content.items) {
      if (!('str' in item)) continue;
      const text = item.str.replace(/\s+/g, ' ').trim();
      if (!text) continue;
      const y = Math.round(item.transform[5]);
      const row = rows.get(y);
      if (row) row.push(text);
      else rows.set(y, [text]);
    }

    const lines = [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, parts]) => joinLine(parts));
    pageLines.push(lines.filter(Boolean));
  }

  await loadingTask.destroy();
  return pageLines.flat().join('\n');
}

function joinLine(parts: string[]): string {
  let line = '';
  for (const part of parts) {
    if (line === '') line = part;
    else line += line.endsWith('-') ? part : ` ${part}`;
  }
  return line.trim();
}

async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}

function isSectionHeader(line: string): keyof ResumeData | null {
  if (line.length > 40) return null;
  for (const [section, pattern] of SECTION_PATTERNS) {
    const match = line.match(pattern);
    if (!match) continue;
    const remainder = line.slice(match[0].length).replace(/[^a-zà-ú]/gi, '');
    return remainder.length <= 24 ? section : null;
  }
  return null;
}

function isContactLine(line: string): boolean {
  if (YEAR_RANGE_PHONE_TRAP.test(line)) {
    return EMAIL_RE.test(line) || LINKEDIN_RE.test(line) || CITY_RE.test(line);
  }
  return EMAIL_RE.test(line) || LINKEDIN_RE.test(line) || PHONE_RE.test(line) || CITY_RE.test(line);
}

function looksLikeName(line: string): boolean {
  if (line.length < 3 || line.length > 60) return false;
  const tokens = line.split(/\s+/);
  if (tokens.length < 2 || tokens.length > 6) return false;
  if (/curr[íi]culo|curriculum|resume/i.test(line)) return false;
  return tokens.every((token) => /^[A-ZÁÚÀÂÃÉÊÍÓÔÕÇÜ]/.test(token));
}

function parseExperienceLine(raw: string): Experience | null {
  const line = raw.trim().replace(/^[-•*·]+\s*/, '');
  if (line.length < 3) return null;

  const periodMatch = line.match(PERIOD_RE);
  const period = periodMatch ? periodMatch[0].trim() : '';
  const remainder = periodMatch ? line.replace(periodMatch[0], ' ').trim() : line;

  const parts = remainder
    .split(/\s*[—–|:]\s*|\s+-\s+/)
    .map((part) => part.replace(/\(\s*\)/g, '').trim())
    .filter(Boolean);

  return {
    role: parts[0] ?? line,
    company: parts[1] ?? '',
    period,
    achievement: parts.slice(2).join('. '),
  };
}

function inferTargetRole(summary: string): string {
  const match = summary.match(/^(?:objetivo|cargo alvo|cargo)\s*:?\s*(.{3,80})/i);
  if (!match) return '';
  return match[1].split(/[.;\n]/)[0].trim();
}

export function parseResumeText(text: string): ImportResult {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const buckets: Partial<Record<'summary' | 'experiences' | 'education' | 'skills' | 'languages', string[]>> = {};
  const contactParts: string[] = [];
  const summaryPrelude: string[] = [];
  let fullName = '';
  let current: keyof typeof buckets | null = null;
  let preludeObjective = '';

  for (const line of lines) {
    const header = isSectionHeader(line);
    if (header) {
      current = header as keyof typeof buckets;
      if (!buckets[current]) buckets[current] = [];
      continue;
    }
    if (current) {
      const bucket = buckets[current];
      if (bucket) bucket.push(line);
      continue;
    }
    const objectiveMatch = line.match(/^(?:objetivo|cargo)\s*:\s*(.{3,80})/i);
    if (objectiveMatch && !preludeObjective) {
      preludeObjective = objectiveMatch[1].split(/[.;\n]/)[0].trim();
      continue;
    }
    if (!fullName && !isContactLine(line) && looksLikeName(line)) {
      fullName = line;
      continue;
    }
    if (isContactLine(line)) {
      contactParts.push(line);
      continue;
    }
    summaryPrelude.push(line);
  }

  const sectionSummary = (buckets.summary ?? []).join('\n').trim();
  const preludeSummary = summaryPrelude.join(' ').replace(/\s+/g, ' ').slice(0, 600).trim();
  const hasAnchor =
    Boolean(fullName) ||
    contactParts.length > 0 ||
    Object.values(buckets).some((bucket) => (bucket?.length ?? 0) > 0);
  const summary = sectionSummary || (hasAnchor ? preludeSummary : '');

  const experiences = (buckets.experiences ?? [])
    .map(parseExperienceLine)
    .filter((experience): experience is Experience => experience !== null)
    .slice(0, 15);

  const fields: Partial<ResumeData> = {};

  if (fullName) fields.fullName = fullName;
  if (contactParts.length > 0) fields.contact = [...new Set(contactParts)].join(' | ');
  if (summary) {
    fields.summary = summary;
    const role = preludeObjective || inferTargetRole(summary);
    if (role) fields.targetRole = role;
  }
  if (experiences.length > 0) fields.experiences = experiences;
  const educationLines = buckets.education ?? [];
  const skillLines = buckets.skills ?? [];
  const languageLines = buckets.languages ?? [];
  if (educationLines.length > 0) fields.education = educationLines.join('\n');
  if (skillLines.length > 0) fields.skills = skillLines.join(', ');
  if (languageLines.length > 0) fields.languages = languageLines.join(', ');

  const recognized: string[] = [];
  if (fields.fullName) recognized.push('nome');
  if (fields.contact) recognized.push('contato');
  if (fields.targetRole) recognized.push('objetivo');
  if (fields.summary) recognized.push('resumo');
  if (fields.experiences) recognized.push(`${fields.experiences.length} experiência${fields.experiences.length > 1 ? 's' : ''}`);
  if (fields.education) recognized.push('formação');
  if (fields.skills) recognized.push('habilidades');
  if (fields.languages) recognized.push('idiomas');

  return { fields, recognized };
}
