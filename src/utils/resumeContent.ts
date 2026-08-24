import type { ResumeData } from '../types';

export type TemplateId = 'classic' | 'ats' | 'xyz' | 'canva' | 'executivo' | 'clean' | 'minimal';

export interface ResumeSection {
  title: string;
  items: string[];
}

export function getTemplateId(layout: string): TemplateId {
  const value = layout.toLowerCase();
  if (value.includes('clássico') || value.includes('classico')) return 'classic';
  if (value.includes('ats')) return 'ats';
  if (value.includes('xyz') || value.includes('google')) return 'xyz';
  if (value.includes('executivo')) return 'executivo';
  if (value.includes('clean') || value.includes('elegante')) return 'clean';
  if (value.includes('minimal')) return 'minimal';
  return 'canva';
}

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n|;\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function splitSkills(text: string): string[] {
  return text
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean);
}

export function contactParts(contact: string): string[] {
  const parts = contact.split('|');
  const cleaned = parts.map((part) => part.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : contact.trim() ? [contact.trim()] : [];
}

const PHONE_PATTERN = /^(\(?\d{2}\)?[\s-]?)?(9?\d{4}[-\s]?\d{3,4})(\s+x\d+)?$/;

export function classifyContactPart(part: string): 'phone' | 'email' | 'address' | 'link' {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(part)) return 'email';
  if (PHONE_PATTERN.test(part)) return 'phone';
  if (/linkedin|github|http|www\.|behance|portfolio/i.test(part)) return 'link';
  return 'address';
}

const TYPE_ORDER: Record<ReturnType<typeof classifyContactPart>, number> = {
  phone: 0,
  email: 1,
  address: 2,
  link: 3,
};

export function orderedContactParts(contact: string): string[] {
  return [...contactParts(contact)].sort(
    (a, b) => TYPE_ORDER[classifyContactPart(a)] - TYPE_ORDER[classifyContactPart(b)],
  );
}

export function buildSections(resume: ResumeData): ResumeSection[] {
  const raw: ResumeSection[] = [
    { title: 'Resumo', items: resume.summary.trim() ? [resume.summary.trim()] : [] },
    { title: 'Experiência Profissional', items: splitLines(resume.experience) },
    { title: 'Formação Acadêmica', items: splitLines(resume.education) },
    { title: 'Habilidades', items: splitSkills(resume.skills) },
    { title: 'Idiomas', items: splitLines(resume.languages) },
  ];
  return raw.filter((section) => section.items.length > 0);
}

export function initialsOf(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter((word) => word.length > 1);
  if (words.length === 0) return 'CV';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}

const LOWERCASE_CONNECTORS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

export function cleanFullName(raw: string): string {
  const stripped = raw
    .replace(/^["'\s]+|["'\s]+$/g, '')
    .replace(/^(ok+,?\s*)?(tudo bem[?!]?\s*,?\s*)?(oi+,?\s*)?(olá+,?\s*)?((o\s+)?meu nome( é| e| eh))\s*/i, '')
    .replace(/^(eu\s+)?(me\s+)?(chamo|sou\s+(o\s+|a\s+)?)\s*/i, '')
    .replace(/^(prazer,?\s*)(meu nome( é| e)|eu sou|sou)?\s*/i, '')
    .replace(/[.!?,;]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return stripped
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      if (index > 0 && LOWERCASE_CONNECTORS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
}

export function fileNameFor(resume: ResumeData, extension: 'pdf' | 'docx'): string {
  const base = slugify(resume.fullName) || 'curriculo-alfa';
  return `${base}.${extension}`;
}

export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
