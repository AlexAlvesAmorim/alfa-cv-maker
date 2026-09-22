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
const CITY_DASH_RE = /[A-ZÁ-Ú][a-zá-ú]+(?:\s+(?:de|do|da|dos|das)\s+[A-ZÁ-Ú][a-zá-ú]+)*(?:\s+[A-ZÁ-Ú][a-zá-ú]+){0,3},\s*[A-ZÁ-Ú][a-zá-ú]+(?:\s+[A-ZÁ-Ú][a-zá-ú]+)*\s*-\s*[A-Z]{2}\b/;
const URL_RE = /https?:\/\/|www\./i;
const YEAR_RANGE_PHONE_TRAP = /(19|20)\d{2}\s*[-–—]\s*(19|20)\d{2}/;

type BucketKey = 'summary' | 'objective' | 'experiences' | 'education' | 'skills' | 'languages';

const SECTION_PATTERNS: Array<[BucketKey, RegExp]> = [
  // objetivo separado do resumo: vira cargo (ou resumo quando é texto longo)
  ['objective', /^objetivo|^cargo|^pretens[ãa]o|^career objective|^objective/i],
  ['summary', /^resumo|^perfil|^perfil profissional|^s[íi]ntese|^qualifica[çc][ãa]o profissional|^apresenta[çc][ãa]o|^sobre mim|^about|^summary/i],
  ['summary', /^projetos?(?=\s+em\s+destaque\b|\s*[:\-–—]|\s*$)|^portf[óo]lio/i],
  ['experiences', /^experi[êe]ncias?|^experience|^professional experience|^work experience|^employment|^hist[óo]rico profissional|^emprego|^carreira|^atuacao profissional|^trajetoria/i],
  ['education', /^forma[çc][ãa]o|^escolaridade|^educa[çc][ãa]o|^education|^acad[êe]mic|^academic|^hist[óo]rico acad[êe]mico|^cursos?|^certifica[çc][õo]es/i],
  ['skills', /^habilidades?|^compet[êe]ncia?s?|^qualifica[çc][õo]es|^conhecimentos?|^skills?|^soft skills|^hard skills|^tecnologias?|^ferramentas/i],
  ['languages', /^idiomas?|^l[íi]nguas?|^languages?|^language/i],
];

const PERIOD_RE =
  /(?:(?:19|20)\d{2}|[01]?\d\/(?:19|20)\d{2})\s*(?:-|–|—|até|a\s)\s*(?:(?:19|20)\d{2}|[01]?\d\/(?:19|20)\d{2}|atual(?:mente)?|presente|hoje)|(?:desde|de)\s+(?:19|20)\d{2}\b/i;

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

async function setupPdfWorker(pdfjs: typeof import('pdfjs-dist')): Promise<void> {
  // Lazy de propósito: testes unitários (parseResumeText) nunca encostam no worker.
  // Estratégia 1 (preferida no Vite): ?worker + workerPort — não depende de URL pública.
  try {
    const mod = (await import('pdfjs-dist/build/pdf.worker.min.mjs?worker')) as unknown;
    const WorkerCtor =
      typeof mod === 'function'
        ? (mod as new () => Worker)
        : mod !== null && typeof mod === 'object' && 'default' in mod
          ? (mod as { default: new () => Worker }).default
          : null;
    if (WorkerCtor && typeof Worker !== 'undefined') {
      pdfjs.GlobalWorkerOptions.workerPort = new WorkerCtor();
      return;
    }
  } catch (err) {
    console.error('[Alfa] pdf ?worker falhou, tentando ?url', err);
  }
  // Estratégia 2 (fallback): ?url + workerSrc.
  try {
    const mod = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')) as unknown;
    const src =
      typeof mod === 'string'
        ? mod
        : mod !== null && typeof mod === 'object' && 'default' in mod
          ? (mod as { default?: unknown }).default
          : null;
    if (typeof src === 'string' && src.length > 0) {
      pdfjs.GlobalWorkerOptions.workerSrc = src;
      return;
    }
    console.error('[Alfa] pdf ?url voltou formato inesperado', mod);
  } catch (err) {
    console.error('[Alfa] pdf ?url falhou', err);
  }
  throw new Error('worker-unavailable');
}

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  try {
    await setupPdfWorker(pdfjs);
  } catch (err) {
    console.error('[Alfa] setupPdfWorker falhou', err);
    throw new Error('Leitor de PDF indisponível neste navegador — tente um DOCX ou TXT.');
  }
  const loadingTask = pdfjs.getDocument({ data: buffer });
  try {
    const doc = await loadingTask.promise;
    const pageLines: string[][] = [];

    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      // Agrupa por linha (Y) e ordena por coluna (X): sem isso, layouts com
      // barra lateral/tabela saem com o texto embaralhado.
      const rows = new Map<number, RowPart[]>();

      for (const item of content.items) {
        if (!('str' in item)) continue;
        const text = item.str.replace(/\s+/g, ' ').trim();
        if (!text) continue;
        const y = Math.round(item.transform[5]);
        const x = item.transform[4];
        const part = { x, width: item.width, text };
        const row = rows.get(y);
        if (row) row.push(part);
        else rows.set(y, [part]);
      }

      const lines = [...rows.entries()]
        .sort((a, b) => b[0] - a[0])
        .flatMap(([, parts]) => breakRowOnGap(parts.sort((a, b) => a.x - b.x)));
      pageLines.push(lines.filter(Boolean));
    }

    return pageLines.flat().join('\n');
  } catch (err) {
    console.error('[Alfa] getDocument/getTextContent falhou', err);
    throw new Error('Não consegui ler esse PDF — se for escaneado/imagem, tente um DOCX ou TXT.');
  } finally {
    await loadingTask.destroy().catch(() => undefined);
  }
}

interface RowPart {
  x: number;
  width: number;
  text: string;
}

// buraco grande entre dois pedacos = outra coluna, nao pode misturar
export function breakRowOnGap(parts: RowPart[]): string[] {
  const lines: string[] = [];
  let current: string[] = [];
  let prevRight = -Infinity;
  for (const part of parts) {
    if (current.length > 0 && part.x - prevRight > 60) {
      lines.push(joinLine(current));
      current = [];
    }
    current.push(part.text);
    prevRight = part.x + part.width;
  }
  if (current.length > 0) lines.push(joinLine(current));
  return lines.filter(Boolean);
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

interface HeaderHit {
  key: BucketKey;
  /** Valor na própria linha ("Idiomas: Inglês", "FORMAÇÃO X – Administração"). */
  inline?: string;
}

function inlineValue(line: string): string | null {
  const inline = line.match(/[:–—-]\s*(.{3,200})\s*$/) ?? line.match(/\s{2,}(.{3,200})\s*$/);
  if (!inline) return null;
  const value = inline[1].trim();
  if (!value || value.length < 3 || PERIOD_RE.test(value)) return null;
  return value;
}

/** Palavras que só completam o título ("Acadêmica") — descartadas do valor colado. */
const QUALIFIER_RE = /^(acad[êe]mica|academico|profissional|complementar|t[ée]cnic[oa]s?|superior|medio)\b\s*/i;

/** Tira o qualificador do resto; exige conteúdo iniciado em maiúscula. */
function splitGlued(rest: string): string | null {
  const content = rest.replace(QUALIFIER_RE, '').trim();
  if (!content || content.length < 3 || !/^[A-ZÀ-ÚÜ]/.test(content)) return null;
  return content;
}

function isSectionHeader(line: string): HeaderHit | null {
  // tira enfeite do comeco ("— Experiência —", "• Habilidades")
  const clean = line.replace(/^[-•*·—–|~=\s]+/, '').trim() || line;
  // Cabeçalho combinado ("FORMAÇÃO, CERTIFICAÇÕES E IDIOMAS"): vira educação;
  // o idioma é separado depois em parseResumeText.
  if (/forma/i.test(clean) && /certifica/i.test(clean)) return { key: 'education' };
  if (clean.length <= 40) {
    for (const [section, pattern] of SECTION_PATTERNS) {
      const match = clean.match(pattern);
      if (!match) continue;
      const rest = clean.slice(match[0].length).trim();
      // sobra de plural ("Experiências" -> "as") ou pedaco do titulo ("a Profissional")
      const restNorm = rest.replace(/^[a-zà-ú]{1,3}\s+(?=[A-ZÀ-ÚÜ])/, '');
      // resto colado precisa parecer titulo (": Inglês", "Acadêmica", "Inglês").
      // se for frase normal ("em vendas") é conteudo, nao cabecalho.
      if (restNorm && !/^[:–—-]/.test(restNorm) && !QUALIFIER_RE.test(restNorm) && !/^[A-ZÀ-ÚÜ]/.test(restNorm) && restNorm.length > 3) continue;
      const remainder = clean.slice(match[0].length).replace(/[^a-zà-ú]/gi, '');
      if (remainder.length > 24) continue;
      // "Idiomas: Inglês" (separador) ou "IDIOMAS Inglês" (colado)
      const value = inlineValue(clean) ?? splitGlued(restNorm);
      if (value && isSectionHeaderShallow(value) === null) return { key: section, inline: value };
      return { key: section };
    }
    return null;
  }
  // Linha longa: cabeçalho mesclado ao conteúdo ("IDIOMAS Inglês ...",
  // "FORMAÇÃO ACADÊMICA – Administração ...").
  for (const [section, pattern] of SECTION_PATTERNS) {
    const withSep = new RegExp(`^(${pattern.source})\\b([^:–—-]{0,28}?)\\s*[:–—-]\\s*(.{3,200})$`, 'i');
    const sepMatch = clean.match(withSep);
    if (sepMatch) {
      const qualifier = (sepMatch[2] ?? '').trim();
      // Qualificador precisa ser continuação de título ("Acadêmica"), não frase ("em vendas")
      if (qualifier && !/^[A-ZÀ-ÚÜ]/.test(qualifier)) continue;
      const value = (sepMatch[3] ?? '').trim();
      if (!value || PERIOD_RE.test(value)) continue;
      return { key: section, inline: value };
    }
    // Sem separador: chave + até 3 palavras em maiúscula + conteúdo em maiúscula.
    // A chave casa sem case-sensitive; o resto é case-sensitive de propósito.
    const keyMatch = clean.match(new RegExp(`^(${pattern.source})\\b`, 'i'));
    if (!keyMatch) continue;
    const gluedMatch = clean
      .slice(keyMatch[0].length)
      .match(/^((?:\s+[A-ZÀ-ÚÜ][\wà-úü'-]*){0,3})\s+([A-ZÀ-ÚÜ].{2,200})$/);
    if (!gluedMatch) continue;
    const qualifier = (gluedMatch[1] ?? '').trim();
    const stripped = qualifier.replace(QUALIFIER_RE, '').trim();
    // Se sobrou algo do qualificador além do título, não é cabeçalho ("Experiência em vendas")
    if (stripped && !QUALIFIER_RE.test(`${qualifier} `)) continue;
    const value = splitGlued(`${stripped ? `${stripped} ` : ''}${(gluedMatch[2] ?? '').trim()}`);
    if (!value || PERIOD_RE.test(value)) continue;
    return { key: section, inline: value };
  }
  return null;
}

/** Checagem rasa (só linha curta) para não recursar na recuperação longa. */
function isSectionHeaderShallow(line: string): BucketKey | null {
  if (line.length > 40) return null;
  for (const [section, pattern] of SECTION_PATTERNS) {
    const match = line.match(pattern);
    if (!match) continue;
    const remainder = line.slice(match[0].length).replace(/[^a-zà-ú]/gi, '');
    if (remainder.length <= 24) return section;
  }
  return null;
}

/** Rodapé/número de página de PDF exportado — nunca é conteúdo. */
function isFooterLine(line: string): boolean {
  return /^(gerado com .{0,60}|p[aá]gina \d+|\d+\s*\/\s*\d+)$/i.test(line);
}

/** Linha curta com cara de cargo ("Desenvolvedor Front-end Júnior"). */
function looksLikeRole(line: string): boolean {
  const words = line.split(/\s+/);
  return (
    !isContactLine(line) && line.length >= 3 && line.length <= 80 && words.length <= 8
    && /^[A-ZÀ-ÚÜ]/.test(line) && !/[.!?…:;|]$/.test(line) && !/[|;]/.test(line)
  );
}

function isContactLine(line: string): boolean {
  if (YEAR_RANGE_PHONE_TRAP.test(line)) {
    return EMAIL_RE.test(line) || LINKEDIN_RE.test(line) || CITY_RE.test(line);
  }
  return EMAIL_RE.test(line) || LINKEDIN_RE.test(line) || PHONE_RE.test(line) || CITY_RE.test(line) || URL_RE.test(line) || CITY_DASH_RE.test(line);
}

function looksLikeName(line: string): boolean {
  if (line.length < 3 || line.length > 60) return false;
  const tokens = line.split(/\s+/);
  if (tokens.length < 2 || tokens.length > 6) return false;
  if (/curr[íi]culo|curriculum|resume/i.test(line)) return false;
  // Só letras (nada de vírgula/ponto): "React, Git" não é nome.
  // Vale Title Case ("Maria") ou CAIXA ALTA ("ALVES").
  return tokens.every((token) => /^([A-ZÀ-ÚÜ]{2,}|[A-ZÀ-ÚÜ][a-zà-úü'-]+)$/.test(token));
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

function isPeriodFragment(line: string): boolean {
  const clean = line.trim();
  return /^(?:(?:19|20)\d{2}|[01]?\d\/(?:19|20)\d{2})(?:\s*(?:-|–|—|até|a)\s*(?:(?:19|20)\d{2}|[01]?\d\/(?:19|20)\d{2}|atual(?:mente)?|presente|hoje))?$|^(?:atual(?:mente)?|presente|hoje)$/i.test(clean);
}

function isContinuationLine(line: string): boolean {
  const separator = line.search(/\s+[—–]\s+|\s+-\s+|:\s+/);
  if (separator === -1) return true; // sem separador: fragmento do bloco anterior
  const after = line.slice(separator).replace(/^\s*[—–:-]\s*/, '');
  return after.length > 0 && /^[a-zá-ú]/.test(after); // continuação começa minúscula
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

  const buckets: Partial<Record<BucketKey, string[]>> = {};
  const contactParts: string[] = [];
  const summaryPrelude: string[] = [];
  let fullName = '';
  let current: BucketKey | null = null;
  let preludeObjective = '';
  let expectRoleNext = false;

  lines.forEach((line, lineIdx) => {
    if (isFooterLine(line)) return;
    const header = isSectionHeader(line);
    if (header) {
      current = header.key;
      if (!buckets[current]) buckets[current] = [];
      if (header.inline) buckets[current]?.push(header.inline);
      expectRoleNext = false;
      return;
    }
    // Cargo colado no nome (nome resgatado de sidebar ou linha seguinte do cabeçalho)
    if (expectRoleNext && !preludeObjective && current !== 'experiences' && looksLikeRole(line)) {
      preludeObjective = line;
      expectRoleNext = false;
      return;
    }
    expectRoleNext = false;
    if (current) {
      // Contato no meio de seção (layout 2 colunas/barra lateral): resgata
      if (current !== 'experiences' && current !== 'objective' && isContactLine(line)) {
        contactParts.push(line);
        return;
      }
      // Nome após as seções (sidebar extraída antes do cabeçalho)
      if (
        !fullName && lineIdx < 15 && current !== 'experiences'
        && !isContactLine(line) && !/[|:;—–]|\s-\s/.test(line) && !PERIOD_RE.test(line)
        && looksLikeName(line)
      ) {
        fullName = line;
        expectRoleNext = true;
        return;
      }
      const bucket = buckets[current];
      if (bucket) bucket.push(line);
      return;
    }
    const objectiveMatch = line.match(/^(?:objetivo|cargo)\s*:\s*(.{3,80})/i);
    if (objectiveMatch && !preludeObjective) {
      preludeObjective = objectiveMatch[1].split(/[.;\n]/)[0].trim();
      return;
    }
    if (!fullName && !isContactLine(line) && looksLikeName(line)) {
      fullName = line;
      expectRoleNext = true;
      return;
    }
    // Cargo logo abaixo do nome, sem rótulo (ex.: PDFs exportados pelo app)
    if (fullName && !preludeObjective && summaryPrelude.length === 0 && looksLikeRole(line)) {
      preludeObjective = line;
      return;
    }
    if (isContactLine(line)) {
      contactParts.push(line);
      return;
    }
    // "Desenvolvedor Front-End | React • TypeScript" logo no topo é o objetivo
    if (!preludeObjective && line.includes('|') && line.length <= 90 && !/[.!?]$/.test(line)) {
      preludeObjective = line;
      return;
    }
    summaryPrelude.push(line);
  });

  const sectionSummary = (buckets.summary ?? []).join('\n').trim();
  const preludeSummary = summaryPrelude.join(' ').replace(/\s+/g, ' ').slice(0, 600).trim();

  // Seção "Objetivo/Cargo": texto curto = cargo; texto longo = resumo (+1ª linha curta vira cargo)
  const objectiveLines = buckets.objective ?? [];
  let objectiveRole = '';
  let objectiveSummary = '';
  if (objectiveLines.length > 0) {
    const text = objectiveLines.join('\n').trim();
    const first = objectiveLines[0].trim();
    const labeled = text.match(/^(?:objetivo|cargo(?: alvo| pretendido)?|pretens[ãa]o)\s*:?\s*(.{3,80})/i);
    if (labeled) {
      objectiveRole = labeled[1].split(/[.;\n]/)[0].trim();
    } else if (!text.includes('\n') && text.length <= 80) {
      objectiveRole = text;
    } else {
      objectiveSummary = text;
      if (first && first.length <= 80 && !/[.!?…]$/.test(first)) objectiveRole = first;
    }
  }

  const hasAnchor =
    Boolean(fullName) ||
    contactParts.length > 0 ||
    objectiveLines.length > 0 ||
    Object.values(buckets).some((bucket) => (bucket?.length ?? 0) > 0);
  const summary = sectionSummary || objectiveSummary || (hasAnchor ? preludeSummary : '');

  const experiences: Experience[] = [];
  for (const rawLine of buckets.experiences ?? []) {
    const trimmed = rawLine.trim();
    if (trimmed.length < 3) continue;
    const last = experiences[experiences.length - 1];
    // Linha só com período ("2022", "• Atual"): completa o emprego anterior
    const periodOnly = trimmed.replace(/^[-•*·]+\s*/, '');
    if (isPeriodFragment(periodOnly)) {
      if (last && !last.period) last.period = periodOnly;
      continue;
    }
    // Bullets ("• ...") detalham a conquista do emprego anterior, não são empregos novos
    if (/^[-•*·]/.test(trimmed) && last) {
      const detail = trimmed.replace(/^[-•*·]+\s*/, '');
      if (detail) last.achievement = last.achievement ? `${last.achievement}\n${detail}` : detail;
      continue;
    }
    const parsed = parseExperienceLine(trimmed);
    if (!parsed) continue;
    // Sem período e sem cara de "Função - Empresa": subtítulo/itálico do bloco anterior
    if (!parsed.period && last && isContinuationLine(trimmed)) {
      last.achievement = last.achievement ? `${last.achievement}\n${trimmed}` : trimmed;
      continue;
    }
    experiences.push(parsed);
    if (experiences.length >= 15) break;
  }

  const fields: Partial<ResumeData> = {};

  if (fullName) fields.fullName = fullName;
  if (contactParts.length > 0) fields.contact = [...new Set(contactParts)].join(' | ');
  if (summary) {
    fields.summary = summary;
    const role = preludeObjective || objectiveRole || inferTargetRole(summary);
    if (role) fields.targetRole = role;
  } else {
    const role = preludeObjective || objectiveRole;
    if (role) fields.targetRole = role;
  }
  if (experiences.length > 0) fields.experiences = experiences;
  let educationLines = buckets.education ?? [];
  const rawSkillLines = buckets.skills ?? [];
  const languageLines = buckets.languages ?? [];
  // Import de tabela categorizada: rótulos soltos ("Qualidade & DevOps") não são habilidades
  const skillLines = rawSkillLines.some((line) => line.includes(','))
    ? rawSkillLines.filter((line) => line.includes(',') || line.split(/\s+/).length > 4 || line.length > 28)
    : rawSkillLines;
  if (educationLines.length > 0) fields.education = educationLines.join('\n');
  if (skillLines.length > 0) fields.skills = skillLines.join(', ');
  if (languageLines.length > 0) fields.languages = languageLines.join(', ');
  else if (educationLines.length > 0) {
    // "FORMAÇÃO, CERTIFICAÇÕES E IDIOMAS" combinada: puxa o idioma de lá
    const moved = educationLines.filter((line) => /^[-•*·\s]*(ingl[êe]s|espanhol|franc[êe]s|alem[ãa]o|italiano|mandarim|japon[êe]s|idioma)/i.test(line));
    if (moved.length > 0) {
      fields.languages = moved.join(', ');
      educationLines = educationLines.filter((line) => !moved.includes(line));
      if (educationLines.length > 0) fields.education = educationLines.join('\n');
      else delete fields.education;
    }
  }

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
