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
