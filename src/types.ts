export type Sender = 'bot' | 'user';

export interface Message {
  id: number;
  from: Sender;
  text: string;
}

export interface ResumeData {
  fullName: string;
  targetRole: string;
  layout: string;
  contact: string;
  summary: string;
  experience: string;
  education: string;
  skills: string;
  languages: string;
  photo: string;
  photoCircle: string;
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
  experience: '',
  education: '',
  skills: '',
  languages: '',
  photo: '',
  photoCircle: '',
};

export const SKIP_VALUE = '__skip__';
