import type { AtsResult } from './atsAnalyzer';

function firstLines(text: string, max = 5): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .filter((line) => line.length > 0 && !/^https?:\/\//i.test(line))
    .slice(0, max);
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function normLine(line: string): string {
  return line.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Linhas que são cabeçalho de seção — nunca servem de título da vaga. */
const HEADER_LIKE =
  /^(sobre a vaga|a vaga|sobre nos|quem somos|a empresa|nossa empresa|requisitos?|requirements?|diferenciais?|beneficios?|benefits?|responsabilidades|responsibilities|about (us|the company)|what we offer|o que oferecemos)\b/;

/** Apresentação institucional — fala da empresa, não do cargo. */
const BOILERPLATE_LIKE =
  /(somos|fundad|leading the way|cutting edge|we've been|we have been|for over \d|ha \d+ anos|maior fabricante|global company|presente em \d|nossa historia|nossa cultura)/;

function isSkippableTitle(line: string): boolean {
  const n = normLine(line);
  return HEADER_LIKE.test(n) || BOILERPLATE_LIKE.test(n);
}

/** Título da vaga: 1ª linha de conteúdo real — pula "Sobre a vaga" e publieditorial. */
export function inferJobTitle(jobDescription: string, fallbackRole = ''): string {
  const lines = firstLines(jobDescription, 6);
  const pick = lines.find((line) => line.length >= 4 && !isSkippableTitle(line));
  if (pick) return truncate(pick, 80);
  const role = fallbackRole.trim().replace(/\s+/g, ' ');
  if (role) return truncate(role, 80);
  return 'Análise da vaga';
}

/** Subtítulo: 2ª linha de conteúdo (sem cabeçalhos); senão resumo do veredito. */
export function inferJobSubtitle(jobDescription: string, result: AtsResult): string {
  const lines = firstLines(jobDescription, 5);
  const title = inferJobTitle(jobDescription, '');
  const titleHead = title.slice(0, 40);
  const sub = lines.find(
    (line) =>
      line.length >= 4
      && line !== title
      && !line.startsWith(titleHead)
      && !isSkippableTitle(line),
  );
  if (sub) return truncate(sub, 120);
  return `${result.totalKeywords} termos relevantes • ${result.verdict.label}`;
}

function capitalize(term: string): string {
  const t = term.trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function unique(list: string[]): string[] {
  return [...new Set(list.map((s) => s.trim()).filter(Boolean))];
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Prefere o termo mais longo: "sapiens" some se "sapiens erp" está na lista.
 *  Só vale por palavra inteira — "java" NÃO some por causa de "javascript". */
function preferLongest(list: string[]): string[] {
  const lower = list.map((s) => s.toLowerCase());
  return list.filter((item, i) => {
    const needle = item.toLowerCase();
    return !lower.some(
      (other, j) =>
        j !== i
        && other !== needle
        && new RegExp(`(^|\\s)${escapeRegExp(needle)}($|\\s)`).test(other),
    );
  });
}

/** Pontos fortes: tudo que casou, priorizando requisitos. */
export function matchedBullets(result: AtsResult, limit = 8): string[] {
  const all = preferLongest(
    unique([
      ...result.required.matched,
      ...result.differentials.matched,
      ...result.general.matched,
      ...result.strongMatches,
    ]),
  );
  const req = new Set(result.required.matched);
  all.sort((a, b) => Number(req.has(b)) - Number(req.has(a)));
  return all.slice(0, limit).map(capitalize);
}

function isLevelSignal(item: string): boolean {
  return /^n[ií]vel\s/i.test(item.trim());
}

/** Contras = SÓ o que a empresa pediu e falta no currículo.
 *  Com seção de requisitos detectada: senioridade + requisitos em falta
 *  (que já incluem as stacks pedidas). Sem requisitos: cai para stacks e
 *  diferenciais — nunca prosa genérica da apresentação da empresa.
 *  Níveis contraditórios ("júnior" + "sênior" no mesmo anúncio) se anulam:
 *  continuam nos detalhes, mas não viram impeditivo. */
export function blockerBullets(result: AtsResult, limit = 6): string[] {
  const levels = result.seniority.filter(isLevelSignal);
  const seniority = levels.length > 1
    ? result.seniority.filter((s) => !isLevelSignal(s))
    : result.seniority;
  const req = unique(result.required.missing);
  const base =
    req.length > 0
      ? [...seniority, ...req]
      : [
        ...seniority,
        ...result.stacks.missing.slice(0, 4),
        ...result.differentials.missing.slice(0, 2),
      ];
  return preferLongest(unique(base)).slice(0, limit).map(capitalize);
}

export function scopeTitle(score: number): string {
  if (score >= 75) return 'Você já trabalha com boa parte do escopo';
  if (score >= 45) return 'Você cobre parte do escopo';
  return 'Poucos pontos em comum por enquanto';
}
