import type { TemplateId } from '../utils/resumeContent';

export type TemplateKind = 'ats' | 'visual';

export interface TemplateInfo {
  id: TemplateId;
  value: string;
  label: string;
  description: string;
  kind: TemplateKind;
  atsNote?: string;
}

export const TEMPLATES: TemplateInfo[] = [
  {
    id: 'classic',
    value: 'Clássico (Curriculum Vitae tradicional)',
    label: 'Clássico',
    description: 'CV tradicional, serif — áreas formais',
    kind: 'ats',
  },
  {
    id: 'ats',
    value: 'ATS (padrão para robôs de RH)',
    label: 'ATS',
    description: 'Otimizado para robôs de triagem de RH',
    kind: 'ats',
  },
  {
    id: 'ats-dev',
    value: 'ATS Dev (projetos com stack — inspirado PDF Alex)',
    label: 'ATS Dev',
    description: 'ATS com projetos + stack inline, 100% texto puro',
    kind: 'ats',
  },
  {
    id: 'xyz',
    value: 'XYZ (padrão Google)',
    label: 'XYZ Google',
    description: 'Conquistas medidas, visual limpo',
    kind: 'ats',
  },
  {
    id: 'canva',
    value: 'Moderno (barra lateral com foto)',
    label: 'Moderno',
    description: 'Barra lateral colorida com foto',
    kind: 'visual',
    atsNote: 'Visual — pode não passar em ATS com tabela',
  },
  {
    id: 'executivo',
    value: 'Executivo (faixa escura com foto)',
    label: 'Executivo',
    description: 'Faixa escura, visual sênior',
    kind: 'visual',
    atsNote: 'Visual — usa tabela/faixa, não é ATS puro',
  },
  {
    id: 'clean',
    value: 'Clean (elegante, serif com foto)',
    label: 'Clean',
    description: 'Elegante, serif, com foto 3x4',
    kind: 'visual',
    atsNote: 'Visual — serif elegante, prefira ATS para Gupy',
  },
  {
    id: 'minimal',
    value: 'Minimal (duas colunas sóbrias)',
    label: 'Minimal',
    description: 'Duas colunas sóbrias e discretas',
    kind: 'visual',
    atsNote: 'Visual — duas colunas, não é ATS puro',
  },
];

export function findTemplateByInput(input: string): TemplateInfo | null {
  const normalized = input.trim().toLowerCase();
  if (normalized === '') return null;
  return (
    TEMPLATES.find((template) => template.value.toLowerCase() === normalized)
    ?? TEMPLATES.find((template) => template.label.toLowerCase() === normalized)
    ?? (normalized.length >= 3
      ? TEMPLATES.find((template) => template.value.toLowerCase().includes(normalized)) ?? null
      : null)
  );
}
