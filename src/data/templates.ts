import type { TemplateId } from '../utils/resumeContent';

export interface TemplateInfo {
  id: TemplateId;
  value: string;
  label: string;
  description: string;
}

export const TEMPLATES: TemplateInfo[] = [
  {
    id: 'classic',
    value: 'Clássico (Curriculum Vitae tradicional)',
    label: 'Clássico',
    description: 'CV tradicional, serif — áreas formais',
  },
  {
    id: 'ats',
    value: 'ATS (padrão para robôs de RH)',
    label: 'ATS',
    description: 'Otimizado para robôs de triagem de RH',
  },
  {
    id: 'xyz',
    value: 'XYZ (padrão Google)',
    label: 'XYZ Google',
    description: 'Conquistas medidas, visual limpo',
  },
  {
    id: 'canva',
    value: 'Moderno (barra lateral com foto)',
    label: 'Moderno',
    description: 'Barra lateral colorida com foto',
  },
  {
    id: 'executivo',
    value: 'Executivo (faixa escura com foto)',
    label: 'Executivo',
    description: 'Faixa escura, visual sênior',
  },
  {
    id: 'clean',
    value: 'Clean (elegante, serif com foto)',
    label: 'Clean',
    description: 'Elegante, serif, com foto 3x4',
  },
  {
    id: 'minimal',
    value: 'Minimal (duas colunas sóbrias)',
    label: 'Minimal',
    description: 'Duas colunas sóbrias e discretas',
  },
];
