export type Sender = 'bot' | 'user';

export interface Message {
  id: number;
  from: Sender;
  text: string;
}

export interface Experience {
  role: string;
  company: string;
  period: string;
  achievement: string;
}

export interface ResumeData {
  fullName: string;
  targetRole: string;
  layout: string;
  contact: string;
  summary: string;
  experiences: Experience[];
  education: string;
  skills: string;
  languages: string;
  photo: string;
  photoCircle: string;
  accentColor: string;
}

// Constraint values for hardening (can be overridden per deployment)
export const FIELD_CONSTRAINTS = {
  fullName: { maxLength: 100, pattern: /^[A-Za-zÀ-ÿ'\s-]+$/ },
  targetRole: { maxLength: 100, pattern: /^[A-Za-zÀ-ÿ0-9'\s\-/()]+$/ },
  layout: { maxLength: 50 },
  contact: { maxLength: 500, pattern: /^[^\n]+$/ },
  summary: { maxLength: 2000 },
  education: { maxLength: 1000 },
  skills: { maxLength: 800 },
  languages: { maxLength: 300 },
  // dataURL PNG ~ 300KB-2MB base64; limite generoso para não bloquear foto válida
  photo: { maxLength: 5_000_000 },
  photoCircle: { maxLength: 5_000_000 },
  accentColor: { pattern: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/ },
} as const;

export type ResumeField = keyof ResumeData;

export interface ChatStep {
  id: ResumeField;
  question: string;
  placeholder: string;
  suggestions: string[];
  optional?: boolean;
  dynamic?: boolean;
}

export const EMPTY_RESUME: ResumeData = {
  fullName: '',
  targetRole: '',
  layout: '',
  contact: '',
  summary: '',
  experiences: [],
  education: '',
  skills: '',
  languages: '',
  photo: '',
  photoCircle: '',
  accentColor: '',
};

export const SKIP_VALUE = '__skip__';
