import { jsPDF } from 'jspdf';
import type { ResumeData } from '../types';
import {
  accentRgb,
  buildSections,
  classifyContactPart,
  orderedContactParts,
  sanitizeResumeForPdf,
  fileNameFor,
  getTemplateId,
  initialsOf,
  saveBlob,
  shadeRgb,
  type ResumeSection,
} from './resumeContent';

const PAGE_W = 210;
const PAGE_H = 297;

type RGB = [number, number, number];

const BLOOD: RGB = [179, 18, 31];
const INK: RGB = [34, 20, 22];
const BODY: RGB = [55, 45, 47];
const MUTED: RGB = [110, 95, 97];
const BLACK: RGB = [0, 0, 0];
const SIDEBAR_TEXT: RGB = [255, 221, 225];
const SLATE: RGB = [63, 78, 99];
const SLATE_HEAD: RGB = [51, 64, 79];
const LIGHT_BLUE: RGB = [214, 222, 231];
const TEAL: RGB = [66, 199, 208];
const GRAY_BG: RGB = [242, 242, 240];
const DIVIDER: RGB = [217, 217, 214];
const DARK2: RGB = [46, 46, 44];
const MID: RGB = [90, 90, 88];

interface Cursor {
  doc: jsPDF;
  y: number;
}

function ensureSpace(cursor: Cursor, neededMm: number, topY = 22): void {
  if (cursor.y + neededMm > PAGE_H - 14) {
    cursor.doc.addPage();
    cursor.y = topY;
  }
}

interface HeadingOptions {
  font?: string;
  ruleColor?: RGB;
  upper?: boolean;
  size?: number;
  centered?: boolean;
  charSpace?: number;
}

function drawHeading(cursor: Cursor, text: string, x: number, width: number, color: RGB, options: HeadingOptions = {}): void {
  const { font = 'helvetica', ruleColor, upper = false, size = 12, centered = false, charSpace = 0 } = options;
  const label = upper ? text.toUpperCase() : text;
  ensureSpace(cursor, 13);
  cursor.doc.setFont(font, 'bold');
  cursor.doc.setFontSize(size);
  cursor.doc.setTextColor(...color);
  cursor.doc.text(label, centered ? PAGE_W / 2 : x, cursor.y, {
    align: centered ? 'center' : 'left',
    charSpace: charSpace || undefined,
  });
  cursor.y += 2.2;
  if (ruleColor) {
    cursor.doc.setDrawColor(...ruleColor);
    cursor.doc.setLineWidth(0.3);
    cursor.doc.line(x, cursor.y, x + width, cursor.y);
  }
  cursor.y += 7.5;
}

interface BulletOptions {
  font?: string;
  size?: number;
  dot?: string;
}

function drawBullets(cursor: Cursor, items: string[], x: number, maxWidth: number, textColor: RGB, dotColor: RGB | null, options: BulletOptions = {}): void {
  const { font = 'helvetica', size = 10.5, dot = '•' } = options;
  const lineHeight = size * 0.5;
  cursor.doc.setFont(font, 'normal');
  cursor.doc.setFontSize(size);

  for (const item of items) {
    const indent = dotColor ? 5 : 0;
    const lines = cursor.doc.splitTextToSize(item, maxWidth - indent) as string[];
    ensureSpace(cursor, lines.length * lineHeight + 2);
    if (dotColor) {
      cursor.doc.setTextColor(...dotColor);
      cursor.doc.text(dot, x, cursor.y);
    }
    cursor.doc.setTextColor(...textColor);
    lines.forEach((line, index) => {
      cursor.doc.text(line, x + indent, cursor.y + index * lineHeight);
    });
    cursor.y += lines.length * lineHeight + 2.4;
  }
  cursor.y += 3.5;
}

interface ParagraphOptions {
  font?: string;
  size?: number;
  align?: 'left' | 'center' | 'justify';
}

function drawParagraph(cursor: Cursor, text: string, x: number, maxWidth: number, color: RGB, options: ParagraphOptions = {}): void {
  const { font = 'helvetica', size = 10.5, align = 'left' } = options;
  const lineHeight = size * 0.5;
  cursor.doc.setFont(font, 'normal');
  cursor.doc.setFontSize(size);
  const lines = cursor.doc.splitTextToSize(text, maxWidth) as string[];
  ensureSpace(cursor, lines.length * lineHeight + 2);
  cursor.doc.setTextColor(...color);
  lines.forEach((line, index) => {
    cursor.doc.text(line, x, cursor.y + index * lineHeight, { align: align === 'left' ? 'left' : align, maxWidth });
  });
  cursor.y += lines.length * lineHeight + 5;
}

interface FieldLinesOptions {
  font?: string;
  style?: 'normal' | 'bold' | 'italic' | 'bolditalic';
  size?: number;
  color?: RGB;
  align?: 'left' | 'center';
  lineGap?: number;
}

/* Nome, cargo e contato com quebra de linha: o chat limita o tamanho dos campos
   (FIELD_CONSTRAINTS), mas a importacao nao — uma linha unica centralizada com
   texto importado estourava a margem da pagina. */
function drawFieldLines(cursor: Cursor, text: string, x: number, maxWidth: number, options: FieldLinesOptions = {}): void {
  const { font = 'helvetica', style = 'normal', size = 10, color = BODY, align = 'left', lineGap = 2 } = options;
  const clean = text.trim();
  if (!clean) return;
  const lineHeight = size * 0.5;
  cursor.doc.setFont(font, style);
  cursor.doc.setFontSize(size);
  cursor.doc.setTextColor(...color);
  const lines = cursor.doc.splitTextToSize(clean, maxWidth) as string[];
  ensureSpace(cursor, lines.length * lineHeight + 2);
  lines.forEach((line, index) => {
    if (align === 'center') {
      cursor.doc.text(line, PAGE_W / 2, cursor.y + index * lineHeight, { align: 'center' });
    } else {
      cursor.doc.text(line, x, cursor.y + index * lineHeight);
    }
  });
  cursor.y += lines.length * lineHeight + lineGap;
}

function drawColumns(
  cursor: Cursor,
  items: string[],
  x: number,
  width: number,
  cols: number,
  color: RGB,
  options: BulletOptions & { bold?: boolean } = {},
): void {
  const { font = 'helvetica', size = 10, dot = '', bold = false } = options;
  const colW = width / cols;
  const columns: string[][] = Array.from({ length: cols }, () => []);
  items.forEach((item, index) => columns[index % cols].push(item));
  const startY = cursor.y;
  let maxBottom = startY;

  columns.forEach((columnItems, columnIndex) => {
    cursor.y = startY;
    const columnX = x + columnIndex * colW;
    cursor.doc.setFont(font, bold ? 'bold' : 'normal');
    cursor.doc.setFontSize(size);
    cursor.doc.setTextColor(...color);
    for (const item of columnItems) {
      const prefix = dot ? `${dot} ` : '';
      const lines = cursor.doc.splitTextToSize(item, colW - 4) as string[];
      ensureSpace(cursor, lines.length * size * 0.5 + 2);
      lines.forEach((line, lineIndex) => {
        cursor.doc.text(lineIndex === 0 ? `${prefix}${line}` : `  ${line}`, columnX, cursor.y);
        cursor.y += size * 0.5;
      });
      cursor.y += 2.2;
    }
    maxBottom = Math.max(maxBottom, cursor.y);
  });
  cursor.y = maxBottom + 3;
}

function drawDotted(cursor: Cursor, x1: number, x2: number, color: RGB = [150, 150, 148]): void {
  cursor.doc.setFillColor(...color);
  for (let x = x1; x < x2; x += 4.2) {
    cursor.doc.rect(x, cursor.y - 0.8, 1.1, 1.1, 'F');
  }
  cursor.y += 6;
}

function drawPhotoCircle(cursor: Cursor, resume: ResumeData, cx: number, cy: number, r: number): void {
  if (resume.photoCircle) {
    cursor.doc.addImage(resume.photoCircle, 'PNG', cx - r, cy - r, r * 2, r * 2);
  } else {
    cursor.doc.setFont('helvetica', 'bold');
    cursor.doc.setFontSize(15);
    cursor.doc.setTextColor(255, 255, 255);
    cursor.doc.text(initialsOf(resume.fullName), cx, cy + 2, { align: 'center' });
  }
  cursor.doc.setDrawColor(255, 255, 255);
  cursor.doc.setLineWidth(1.2);
  cursor.doc.circle(cx, cy, r, 'S');
}

function sectioned(sections: ResumeSection[], skip: string[], render: (section: ResumeSection) => void): void {
  for (const section of sections) {
    if (!skip.includes(section.title)) render(section);
  }
}

/* ---------- CLÁSSICO ---------- */

interface SingleColumnStyle {
  font: 'times' | 'helvetica';
  accent: RGB;
  nameSize: number;
  centeredName: boolean;
  upperHeadings: boolean;
  headingRule: boolean;
}

const CLASSIC_STYLE: SingleColumnStyle = {
  font: 'times',
  accent: BLACK,
  nameSize: 20,
  centeredName: true,
  upperHeadings: true,
  headingRule: true,
};

function renderClassic(doc: jsPDF, resume: ResumeData): void {
  const style = CLASSIC_STYLE;
  const marginX = 17;
  const contentW = PAGE_W - marginX * 2;
  const cursor: Cursor = { doc, y: 26 };

  doc.setFont(style.font, 'bold');
  doc.setFontSize(style.nameSize);
  doc.setTextColor(...INK);
  drawFieldLines(cursor, resume.fullName || 'Nome não informado', marginX, contentW, {
    font: style.font,
    style: 'bold',
    size: style.nameSize,
    color: INK,
    align: 'center',
    lineGap: 3,
  });

  drawFieldLines(cursor, resume.targetRole, marginX, contentW, {
    font: style.font,
    size: 11.5,
    color: style.accent,
    align: 'center',
    lineGap: 3,
  });

  const contactItems = orderedContactParts(resume.contact);
  if (contactItems.length > 0) {
    for (const part of contactItems) {
      drawFieldLines(cursor, part, marginX, contentW, {
        font: style.font,
        size: 9.5,
        color: MUTED,
        align: 'center',
        lineGap: 1.8,
      });
    }
    cursor.y += 1;
  }

  doc.setDrawColor(...style.accent);
  doc.setLineWidth(0.3);
  doc.line(marginX, cursor.y, marginX + contentW, cursor.y);
  cursor.y += 10;

  sectioned(buildSections(resume), [], (section) => {
    drawHeading(cursor, section.title, marginX, contentW, style.accent, {
      font: style.font,
      ruleColor: style.accent,
      upper: style.upperHeadings,
      charSpace: 0.4,
    });
    if (section.title === 'Habilidades') {
      drawParagraph(cursor, section.items.join('  •  '), marginX, contentW, BODY, { font: style.font });
    } else {
      drawBullets(cursor, section.items, marginX, contentW, BODY, null, { font: style.font });
    }
  });
}

/* ---------- ATS (padrão Bateman) ---------- */

function renderAts(doc: jsPDF, resume: ResumeData): void {
  const marginX = 17;
  const contentW = PAGE_W - marginX * 2;
  const cursor: Cursor = { doc, y: 24 };
  const sections = buildSections(resume);
  const find = (title: string) => sections.find((section) => section.title === title);

  drawFieldLines(cursor, resume.fullName || 'Nome não informado', marginX, contentW, {
    style: 'bold',
    size: 22,
    color: BLACK,
    align: 'center',
    lineGap: 3,
  });

  drawFieldLines(cursor, resume.targetRole, marginX, contentW, {
    style: 'bold',
    size: 11,
    color: BLACK,
    align: 'center',
    lineGap: 2,
  });

  const contactBlock: Array<[string, string]> = [];
  const LABELS: Record<string, string> = { address: 'Endereço:', phone: 'Telefone:', email: 'E-mail:', link: 'LinkedIn:' };
  orderedContactParts(resume.contact).forEach((part) => {
    contactBlock.push([LABELS[classifyContactPart(part)], part]);
  });
  if (contactBlock.length > 0) {
    drawHeading(cursor, 'Informações Pessoais', marginX, contentW, BLACK, { centered: true, ruleColor: BLACK, size: 12.5, charSpace: 0.3 });
    for (const [label, value] of contactBlock) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const valueLines = doc.splitTextToSize(value, contentW - 38) as string[];
      ensureSpace(cursor, valueLines.length * 5 + 1);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...BLACK);
      doc.text(label, marginX + 4, cursor.y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BLACK);
      valueLines.forEach((line, index) => {
        doc.text(line, marginX + 34, cursor.y + index * 5);
      });
      cursor.y += valueLines.length * 5 + 0.6;
    }
    cursor.y += 6;
  }

  if (resume.summary.trim()) {
    drawHeading(cursor, 'Resumo', marginX, contentW, BLACK, { centered: true, ruleColor: BLACK, size: 12.5, charSpace: 0.3 });
    drawParagraph(cursor, resume.summary.trim(), marginX, contentW, BODY, { align: 'justify', size: 10.5 });
    cursor.y += 3;
  }

  const education = find('Formação Acadêmica');
  if (education) {
    drawHeading(cursor, 'Formação', marginX, contentW, BLACK, { centered: true, ruleColor: BLACK, size: 12.5, charSpace: 0.3 });
    drawBullets(cursor, education.items, marginX, contentW, DARK2, null, { size: 10.5 });
  }

  const experience = find('Experiência Profissional');
  if (experience) {
    drawHeading(cursor, 'Experiência Profissional', marginX, contentW, BLACK, { centered: true, ruleColor: BLACK, size: 12.5, charSpace: 0.3 });
    drawBullets(cursor, experience.items, marginX, contentW, BODY, MID, { size: 10, dot: '·' });
  }

  const skills = find('Habilidades');
  if (skills) {
    drawHeading(cursor, 'Habilidades', marginX, contentW, BLACK, { centered: true, ruleColor: BLACK, size: 12.5, charSpace: 0.3 });
    drawColumns(cursor, skills.items, marginX + 4, contentW - 4, 3, DARK2, { size: 9.5, dot: '-' });
  }

  const languages = find('Idiomas');
  if (languages) {
    drawHeading(cursor, 'Idiomas', marginX, contentW, BLACK, { centered: true, ruleColor: BLACK, size: 12.5, charSpace: 0.3 });
    drawParagraph(cursor, languages.items.join('   |   '), marginX, contentW, BODY, { size: 10 });
  }
}

/* Bloco de experiência compartilhado (ATS Dev + XYZ), no padrão da referência:
   "Função - Empresa" em negrito 11pt com o período à direita na cor de
   destaque, conquistas em bullets (um por linha do texto). */
interface ExperienceBlockColors {
  company: RGB;
  period: RGB;
  body: RGB;
  bullet: RGB;
}

function hasJobs(resume: ResumeData): boolean {
  return resume.experiences.some(
    (job) => job.company.trim() !== '' || job.role.trim() !== '' || job.achievement.trim() !== '',
  );
}

// Quebra a conquista em bullets: uma linha vira um bullet; se for linha única
// com separadores "•", cada trecho vira um bullet (comum em texto colado).
function splitAchievements(achievement: string): string[] {
  const bullets: string[] = [];
  for (const rawLine of achievement.split(/\r?\n/)) {
    const parts = rawLine.split(/\s*[•▪◦]\s*/);
    for (let part of parts) {
      part = part.replace(/^[-–—]\s+/, '').trim();
      if (part) bullets.push(part);
    }
  }
  return bullets;
}

function drawExperienceBlocks(
  cursor: Cursor,
  resume: ResumeData,
  x: number,
  maxWidth: number,
  colors: ExperienceBlockColors,
): void {
  const doc = cursor.doc;
  const jobs = resume.experiences.filter(
    (job) => job.company.trim() !== '' || job.role.trim() !== '' || job.achievement.trim() !== '',
  );
  jobs.forEach((job) => {
    const company = job.company.trim();
    const role = job.role.trim();
    const period = job.period.trim();
    const bullets = splitAchievements(job.achievement);
    ensureSpace(cursor, 18);
    // Linha 1: "Função - Empresa" em negrito 11pt + período à direita em 10pt
    const left = [role, company].filter(Boolean).join(' - ') || 'Experiência';
    doc.setFont('helvetica', 'bold');
    if (period) {
      doc.setFontSize(10);
      const periodW = doc.getTextWidth(period);
      doc.setFontSize(11);
      doc.setTextColor(...colors.company);
      const leftLines = doc.splitTextToSize(left, Math.max(maxWidth - periodW - 6, 60)) as string[];
      leftLines.forEach((line: string, idx: number) => {
        doc.text(line, x, cursor.y + idx * 4.6);
      });
      doc.setFontSize(10);
      doc.setTextColor(...colors.period);
      doc.text(period, x + maxWidth, cursor.y, { align: 'right' });
      cursor.y += leftLines.length * 4.6 + 1.4;
    } else {
      doc.setFontSize(11);
      doc.setTextColor(...colors.company);
      const leftLines = doc.splitTextToSize(left, maxWidth) as string[];
      leftLines.forEach((line: string, idx: number) => {
        doc.text(line, x, cursor.y + idx * 4.6);
      });
      cursor.y += leftLines.length * 4.6 + 1.4;
    }
    // Conquistas: um bullet por linha, à esquerda como na referência
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    bullets.forEach((bullet) => {
      const bodyLines = doc.splitTextToSize(bullet, maxWidth - 4) as string[];
      ensureSpace(cursor, bodyLines.length * 4.4 + 2);
      doc.setTextColor(...colors.bullet);
      doc.text('•', x, cursor.y);
      doc.setTextColor(...colors.body);
      bodyLines.forEach((line: string, idx: number) => {
        doc.text(line, x + 3.5, cursor.y + idx * 4.4);
      });
      cursor.y += bodyLines.length * 4.4 + 1;
    });
    cursor.y += 2.4; // respiro entre blocos
  });
  cursor.y += 1;
}

/* ---------- ATS DEV (inspirado PDF Alex - single-column, 100% texto puro) ---------- */

function renderAtsDev(doc: jsPDF, resume: ResumeData): void {
  const marginX = 16;
  const contentW = PAGE_W - marginX * 2;
  const cursor: Cursor = { doc, y: 20 };
  const sections = buildSections(resume);
  const find = (title: string) => sections.find((section) => section.title === title);

  // Header tipo PDF2: nome grande + subtítulo stack + contato em linha única (pipe)
  drawFieldLines(cursor, (resume.fullName || 'Nome não informado').toUpperCase(), marginX, contentW, {
    style: 'bold',
    size: 20,
    color: BLACK,
    align: 'center',
    lineGap: 2,
  });

  drawFieldLines(cursor, resume.targetRole.toUpperCase(), marginX, contentW, {
    style: 'bold',
    size: 10,
    color: SLATE_HEAD,
    align: 'center',
    lineGap: 2,
  });

  const contacts = orderedContactParts(resume.contact);
  if (contacts.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    const contactLine = contacts.join('  |  ');
    const lines = doc.splitTextToSize(contactLine, contentW) as string[];
    lines.forEach((line: string) => {
      doc.text(line, PAGE_W / 2, cursor.y, { align: 'center' });
      cursor.y += 4;
    });
    cursor.y += 1;
  }

  // Linha fina divisória (como nos PDFs)
  doc.setDrawColor(...DIVIDER);
  doc.setLineWidth(0.35);
  doc.line(marginX, cursor.y, marginX + contentW, cursor.y);
  cursor.y += 8;

  if (resume.summary.trim()) {
    drawHeading(cursor, 'Resumo Profissional', marginX, contentW, BLACK, { centered: false, ruleColor: BLACK, size: 11, charSpace: 0.3, upper: true });
    drawParagraph(cursor, resume.summary.trim(), marginX, contentW, BODY, { align: 'justify', size: 9.5 });
    cursor.y += 1;
  }

  if (hasJobs(resume)) {
    // Bloco por experiência: empresa em destaque, função+período compactos, conquista justa
    drawHeading(cursor, 'Experiência Profissional', marginX, contentW, BLACK, { centered: false, ruleColor: BLACK, size: 11, charSpace: 0.3, upper: true });
    cursor.y -= 1.5; // aproxima o primeiro bloco do título
    drawExperienceBlocks(cursor, resume, marginX, contentW, { company: BLACK, period: accentRgb(resume, BLACK), body: BODY, bullet: MID });
  }

  const education = find('Formação Acadêmica');
  if (education) {
    drawHeading(cursor, 'Formação Acadêmica', marginX, contentW, BLACK, { centered: false, ruleColor: BLACK, size: 11, charSpace: 0.3, upper: true });
    drawBullets(cursor, education.items, marginX, contentW, DARK2, null, { size: 9.5, dot: '•' });
  }

  const skills = find('Habilidades');
  if (skills) {
    drawHeading(cursor, 'Habilidades', marginX, contentW, BLACK, { centered: false, ruleColor: BLACK, size: 11, charSpace: 0.3, upper: true });
    // ATS-safe: parágrafo inline com • , não colunas/tabela
    drawParagraph(cursor, skills.items.join('  •  '), marginX, contentW, BODY, { size: 9.2 });
  }

  const languages = find('Idiomas');
  if (languages) {
    drawHeading(cursor, 'Idiomas', marginX, contentW, BLACK, { centered: false, ruleColor: BLACK, size: 11, charSpace: 0.3, upper: true });
    drawParagraph(cursor, languages.items.join('   |   '), marginX, contentW, BODY, { size: 9.2 });
  }
}

/* ---------- XYZ (padrão Sofia) ---------- */

function renderXyz(doc: jsPDF, resume: ResumeData): void {
  const headColor = accentRgb(resume, DARK2);
  const marginX = 17;
  const contentW = PAGE_W - marginX * 2;
  const cursor: Cursor = { doc, y: 22 };
  const sections = buildSections(resume);
  const find = (title: string) => sections.find((section) => section.title === title);

  drawFieldLines(cursor, (resume.fullName || 'Nome não informado').toUpperCase(), marginX, contentW, {
    style: 'bold',
    size: 20,
    color: headColor,
    align: 'center',
    lineGap: 2,
  });

  drawFieldLines(cursor, (resume.targetRole || '').toUpperCase(), marginX, contentW, {
    size: 10,
    color: MID,
    align: 'center',
    lineGap: 2,
  });

  for (const part of orderedContactParts(resume.contact)) {
    drawFieldLines(cursor, part, marginX, contentW, {
      size: 9,
      color: MID,
      align: 'center',
      lineGap: 1.6,
    });
  }

  doc.setDrawColor(...DIVIDER);
  doc.setLineWidth(0.3);
  doc.line(marginX, cursor.y, marginX + contentW, cursor.y);
  cursor.y += 10;

  if (resume.summary.trim()) {
    drawHeading(cursor, 'Perfil Profissional', marginX, contentW, headColor, { centered: true, size: 11.5, charSpace: 0.4 });
    drawParagraph(cursor, resume.summary.trim(), marginX, contentW, BODY, { align: 'justify', size: 9.5 });
    cursor.y += 4;
  }

  const education = find('Formação Acadêmica');
  if (education) {
    drawHeading(cursor, 'Formação Acadêmica', marginX, contentW, headColor, { size: 11.5, charSpace: 0.3 });
    drawColumns(cursor, education.items, marginX, contentW, 2, headColor, { size: 9.5, bold: true });
    cursor.y += 2;
  }

  if (hasJobs(resume)) {
    drawHeading(cursor, 'Experiência Profissional', marginX, contentW, headColor, { size: 11.5, charSpace: 0.3 });
    drawExperienceBlocks(cursor, resume, marginX, contentW, { company: BLACK, period: headColor, body: BODY, bullet: headColor });
  }

  const skills = find('Habilidades');
  if (skills) {
    drawHeading(cursor, 'Habilidades', marginX, contentW, headColor, { size: 11.5, charSpace: 0.3 });
    drawColumns(cursor, skills.items, marginX, contentW, 3, BODY, { size: 9.5, dot: '•' });
  }

  const languages = find('Idiomas');
  if (languages) {
    drawHeading(cursor, 'Idiomas', marginX, contentW, headColor, { size: 11.5, charSpace: 0.3 });
    drawColumns(cursor, languages.items, marginX, contentW, Math.min(languages.items.length, 3), BODY, { size: 9.5 });
  }
}

/* ---------- MODERNO (padrão Marina, marca vermelha) ---------- */

function renderCanva(doc: jsPDF, resume: ResumeData): void {
  const accent = accentRgb(resume, BLOOD);
  const sidebarColor = shadeRgb(accent, 0.45);
  const sidebarW = 70;
  const paintSidebar = () => {
    doc.setFillColor(...sidebarColor);
    doc.rect(0, 0, sidebarW, PAGE_H, 'F');
    doc.setFillColor(...accent);
    doc.rect(0, 0, sidebarW, 50, 'F');
  };
  paintSidebar();

  const cursor: Cursor = { doc, y: 0 };
  drawPhotoCircle(cursor, resume, sidebarW / 2, 50, 17.5);

  // A lateral tem cursor proprio: antes usava o cursor do cabecalho (y=0) e o
  // ensureSpace nunca disparava — curriculo importado longo saia da pagina.
  const side: Cursor = { doc, y: 84 };
  const ensureSide = (needed: number) => {
    const before = doc.getNumberOfPages();
    ensureSpace(side, needed, 60);
    if (doc.getNumberOfPages() > before) paintSidebar();
  };
  const sideX = 10;
  const sideW = sidebarW - sideX * 2;

  const sidebarSection = (title: string) => {
    ensureSide(14);
    doc.setDrawColor(...SIDEBAR_TEXT);
    doc.setLineWidth(0.35);
    doc.setLineDashPattern([1.4, 1.6], 0);
    doc.line(sideX, side.y - 4.2, sideX + sideW, side.y - 4.2);
    doc.setLineDashPattern([], 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), sideX, side.y, { charSpace: 0.35 });
    side.y += 7.5;
  };

  sidebarSection('Contato');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  for (const part of orderedContactParts(resume.contact)) {
    const lines = doc.splitTextToSize(part, sideW) as string[];
    ensureSide(lines.length * 4.4);
    doc.setTextColor(...SIDEBAR_TEXT);
    lines.forEach((line, index) => doc.text(line, sideX, side.y + index * 4.4));
    side.y += lines.length * 4.4 + 1.6;
  }
  side.y += 6;

  const sections = buildSections(resume);
  const skills = sections.find((section) => section.title === 'Habilidades');
  if (skills) {
    sidebarSection('Competências');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    for (const skill of skills.items) {
      const lines = doc.splitTextToSize(skill, sideW - 4) as string[];
      ensureSide(lines.length * 4.4);
      doc.setFillColor(255, 255, 255);
      doc.rect(sideX, side.y - 2.2, 1.8, 1.8, 'F');
      doc.setTextColor(...SIDEBAR_TEXT);
      lines.forEach((line, index) => doc.text(line, sideX + 4, side.y + index * 4.4));
      side.y += lines.length * 4.4 + 1.4;
    }
    side.y += 6;
  }

  const languages = sections.find((section) => section.title === 'Idiomas');
  if (languages) {
    sidebarSection('Idiomas');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    for (const language of languages.items) {
      const lines = doc.splitTextToSize(language, sideW - 4) as string[];
      ensureSide(lines.length * 4.4);
      doc.setFillColor(255, 255, 255);
      doc.rect(sideX, side.y - 2.2, 1.8, 1.8, 'F');
      doc.setTextColor(...SIDEBAR_TEXT);
      lines.forEach((line, index) => doc.text(line, sideX + 4, side.y + index * 4.4));
      side.y += lines.length * 4.4 + 1.4;
    }
  }

  const mainX = sidebarW + 12;
  const mainW = PAGE_W - mainX - 17;
  const main: Cursor = { doc, y: 28 };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  const nameLines = doc.splitTextToSize(resume.fullName || 'Nome não informado', mainW) as string[];
  nameLines.forEach((line, index) => doc.text(line, mainX, main.y + index * 8.5));
  main.y += nameLines.length * 8.5 + 2;

  drawFieldLines(main, resume.targetRole, mainX, mainW, {
    size: 11.5,
    color: accent,
    lineGap: 4.8,
  });

  const mainHeading = (title: string) => {
    ensureSpace(main, 16);
    doc.setDrawColor(...accent);
    doc.setLineWidth(0.45);
    doc.line(mainX, main.y, mainX + mainW, main.y);
    main.y += 6.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(...accent);
    doc.text(title.toUpperCase(), mainX, main.y, { charSpace: 0.4 });
    main.y += 8.5;
  };

  if (resume.summary.trim()) {
    mainHeading('Síntese');
    drawParagraph(main, resume.summary.trim(), mainX, mainW, BODY, { size: 10 });
  }

  const experience = sections.find((section) => section.title === 'Experiência Profissional');
  if (experience) {
    mainHeading('Experiência Profissional');
    drawBullets(main, experience.items, mainX, mainW, BODY, accent, { size: 10 });
  }

  const education = sections.find((section) => section.title === 'Formação Acadêmica');
  if (education) {
    mainHeading('Formação Acadêmica');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...DARK2);
    for (const item of education.items) {
      const lines = doc.splitTextToSize(item, mainW) as string[];
      ensureSpace(main, lines.length * 4.8 + 2);
      lines.forEach((line, index) => doc.text(line, mainX, main.y + index * 4.8));
      main.y += lines.length * 4.8 + 2.4;
    }
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text('Gerado com Alfa Curriculum Maker', mainX, PAGE_H - 14);
}

/* ---------- EXECUTIVO (faixa azul-acinzentada) ---------- */

function renderExecutivo(doc: jsPDF, resume: ResumeData): void {
  const headColor = accentRgb(resume, SLATE_HEAD);
  doc.setFillColor(...SLATE);
  doc.rect(0, 0, PAGE_W, 58, 'F');

  const cursor: Cursor = { doc, y: 0 };
  drawPhotoCircle(cursor, resume, 40, 29, 17.5);

  const headX = 70;
  const headW = PAGE_W - headX - 17;
  const head: Cursor = { doc, y: 26 };
  // Nome muito longo (comum em importacao) encolhe para caber na faixa de 58mm
  doc.setFont('helvetica', 'bold');
  let headNameSize = 23;
  doc.setFontSize(headNameSize);
  let headNameLines = doc.splitTextToSize(resume.fullName || 'Nome não informado', headW) as string[];
  if (headNameLines.length > 2) {
    headNameSize = 18;
    doc.setFontSize(headNameSize);
    headNameLines = doc.splitTextToSize(resume.fullName || 'Nome não informado', headW) as string[];
  }
  doc.setTextColor(255, 255, 255);
  headNameLines.forEach((line, index) => doc.text(line, headX, head.y + index * headNameSize * 0.5));
  head.y += headNameLines.length * headNameSize * 0.5 + 1;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const roleUpper = (resume.targetRole || '').toUpperCase();
  if (roleUpper.trim()) {
    const roleLines = doc.splitTextToSize(roleUpper, headW) as string[];
    doc.setTextColor(...LIGHT_BLUE);
    roleLines.forEach((line, index) => doc.text(line, headX, head.y + index * 5, { charSpace: 0.5 }));
    head.y += roleLines.length * 5;
  }

  // Lateral com cursor proprio (antes usava o cursor do cabecalho, y=0).
  const side: Cursor = { doc, y: 76 };
  const sideX = 17;
  const sideW = 56;

  const sideHeading = (title: string) => {
    ensureSpace(side, 13, 60);
    side.y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...headColor);
    doc.text(title.toUpperCase(), sideX, side.y, { charSpace: 0.35 });
    side.y += 2.2;
    doc.setDrawColor(...headColor);
    doc.setLineWidth(0.3);
    doc.line(sideX, side.y, sideX + sideW, side.y);
    side.y += 6.5;
  };

  const sideLines = (items: string[]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...BODY);
    for (const item of items) {
      const lines = doc.splitTextToSize(item, sideW) as string[];
      ensureSpace(side, lines.length * 4.6, 60);
      lines.forEach((line, index) => doc.text(line, sideX, side.y + index * 4.6));
      side.y += lines.length * 4.6 + 1.5;
    }
    side.y += 3;
  };

  const sections = buildSections(resume);
  sideHeading('Contato');
  sideLines(orderedContactParts(resume.contact));

  const languages = sections.find((section) => section.title === 'Idiomas');
  if (languages) {
    sideHeading('Idiomas');
    sideLines(languages.items);
  }

  const skills = sections.find((section) => section.title === 'Habilidades');
  if (skills) {
    sideHeading('Habilidades');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    for (const skill of skills.items) {
      const lines = doc.splitTextToSize(skill, sideW - 4) as string[];
      ensureSpace(side, lines.length * 4.6, 60);
      doc.setFillColor(...headColor);
      doc.rect(sideX, side.y - 2.3, 1.8, 1.8, 'F');
      doc.setTextColor(...BODY);
      lines.forEach((line, index) => doc.text(line, sideX + 4, side.y + index * 4.6));
      side.y += lines.length * 4.6 + 1.4;
    }
  }

  const mainX = 86;
  const mainW = PAGE_W - mainX - 17;
  const main: Cursor = { doc, y: 72 };

  const mainHeading = (title: string) => {
    ensureSpace(main, 16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...headColor);
    doc.text(title.toUpperCase(), mainX, main.y, { charSpace: 0.4 });
    main.y += 2.5;
    doc.setDrawColor(...LIGHT_BLUE);
    doc.setLineWidth(0.35);
    doc.line(mainX, main.y, mainX + mainW, main.y);
    main.y += 9;
  };

  if (resume.summary.trim()) {
    mainHeading('Perfil Profissional');
    drawParagraph(main, resume.summary.trim(), mainX, mainW, BODY, { size: 10 });
  }

  const experience = sections.find((section) => section.title === 'Experiência Profissional');
  if (experience) {
    mainHeading('Experiência Profissional');
    drawBullets(main, experience.items, mainX, mainW, BODY, headColor, { size: 10 });
  }

  const education = sections.find((section) => section.title === 'Formação Acadêmica');
  if (education) {
    mainHeading('Formação Acadêmica');
    drawBullets(main, education.items, mainX, mainW, DARK2, null, { size: 10 });
  }
}

/* ---------- CLEAN (serif elegante) ---------- */

function renderClean(doc: jsPDF, resume: ResumeData): void {
  const accent = accentRgb(resume, TEAL);
  const marginX = 17;
  const cursor: Cursor = { doc, y: 22 };

  if (resume.photo) {
    doc.addImage(resume.photo, 'PNG', PAGE_W - marginX - 40, 14, 40, 53.3);
    doc.setDrawColor(...accent);
    doc.setLineWidth(0.7);
    doc.roundedRect(PAGE_W - marginX - 41, 13, 42, 55.3, 4, 4, 'S');
  }

  doc.setFont('times', 'bolditalic');
  doc.setFontSize(28);
  doc.setTextColor(...accent);
  const nameWidth = PAGE_W - marginX * 2 - (resume.photo ? 52 : 0);
  const nameLines = doc.splitTextToSize(resume.fullName || 'Nome não informado', nameWidth) as string[];
  nameLines.forEach((line, index) => doc.text(line, marginX, cursor.y + 8 + index * 11));
  cursor.y += 15 + (nameLines.length - 1) * 11;

  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...DARK2);
  for (const part of orderedContactParts(resume.contact)) {
    const lines = doc.splitTextToSize(part, 120) as string[];
    ensureSpace(cursor, lines.length * 5);
    lines.forEach((line, index) => doc.text(line, marginX, cursor.y + index * 5));
    cursor.y += lines.length * 5 + 1.2;
  }

  cursor.y += 4;
  drawDotted(cursor, marginX, 120);

  const sections = buildSections(resume);
  const find = (title: string) => sections.find((section) => section.title === title);

  const cleanHeading = (title: string) => {
    ensureSpace(cursor, 13);
    doc.setFont('times', 'bolditalic');
    doc.setFontSize(15);
    doc.setTextColor(...accent);
    doc.text(title, marginX, cursor.y);
    cursor.y += 8;
  };

  if (resume.targetRole.trim()) {
    cleanHeading('Profissão');
    drawParagraph(cursor, resume.targetRole.trim(), marginX, PAGE_W - marginX * 2 - (resume.photo ? 48 : 0), BODY, {
      font: 'times',
      size: 11.5,
    });
    cursor.y += 1.5;
  }

  if (resume.summary.trim()) {
    cleanHeading('Qualificação Profissional');
    drawParagraph(cursor, resume.summary.trim(), marginX, PAGE_W - marginX * 2 - (resume.photo ? 48 : 0), BODY, {
      font: 'times',
      size: 11,
    });
    cursor.y += 1;
  }

  const experience = find('Experiência Profissional');
  if (experience) {
    cleanHeading('Experiência Profissional');
    drawBullets(cursor, experience.items, marginX, PAGE_W - marginX * 2, BODY, accent, { font: 'times', size: 11 });
    cursor.y += 1;
  }

  const education = find('Formação Acadêmica');
  if (education) {
    cleanHeading('Formação');
    drawBullets(cursor, education.items, marginX, PAGE_W - marginX * 2, BODY, null, { font: 'times', size: 11 });
    cursor.y += 1;
  }

  const skills = find('Habilidades');
  if (skills) {
    cleanHeading('Habilidades');
    drawParagraph(cursor, skills.items.join('  •  '), marginX, PAGE_W - marginX * 2, BODY, { font: 'times', size: 11 });
  }

  const languages = find('Idiomas');
  if (languages) {
    cleanHeading('Idiomas');
    drawBullets(cursor, languages.items, marginX, PAGE_W - marginX * 2, BODY, null, { font: 'times', size: 11 });
  }

  cursor.y += 2;
  ensureSpace(cursor, 6);
  drawDotted(cursor, marginX, 120);
}

/* ---------- MINIMAL (duas colunas) ---------- */

function renderMinimal(doc: jsPDF, resume: ResumeData): void {
  const paintMinimalBg = () => {
    doc.setFillColor(...GRAY_BG);
    doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
    doc.setDrawColor(...DIVIDER);
    doc.setLineWidth(0.4);
    doc.line(86, 14, 86, 283);
  };
  paintMinimalBg();

  const sections = buildSections(resume);
  const find = (title: string) => sections.find((section) => section.title === title);

  const leftX = 17;
  const leftRight = 76;
  const leftW = leftRight - leftX;

  if (resume.photo) {
    doc.addImage(resume.photo, 'PNG', leftX + (leftW - 36) / 2, 16, 36, 48);
  }

  // Coluna esquerda com cursor proprio e repintura do fundo ao paginar
  const left: Cursor = { doc, y: resume.photo ? 74 : 22 };
  const ensureLeft = (needed: number) => {
    const before = doc.getNumberOfPages();
    ensureSpace(left, needed, 22);
    if (doc.getNumberOfPages() > before) paintMinimalBg();
  };

  const leftHeading = (title: string) => {
    ensureLeft(8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...DARK2);
    doc.text(title.toUpperCase(), leftRight, left.y, { align: 'right', charSpace: 0.35 });
    left.y += 7.5;
  };

  const leftLines = (items: string[], bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...MID);
    for (const item of items) {
      const lines = doc.splitTextToSize(item, leftW) as string[];
      ensureLeft(lines.length * 5 + 2);
      for (const line of lines) {
        doc.text(line, leftRight, left.y, { align: 'right' });
        left.y += 5;
      }
      left.y += 1.8;
    }
    left.y += 6;
  };

  const education = find('Formação Acadêmica');
  if (education) {
    leftHeading('Formação');
    leftLines(education.items, true);
  }

  const skills = find('Habilidades');
  if (skills) {
    leftHeading('Habilidades');
    leftLines(skills.items);
  }

  const languages = find('Idiomas');
  if (languages) {
    leftHeading('Idiomas');
    leftLines(languages.items);
  }

  leftHeading('Contato');
  leftLines(orderedContactParts(resume.contact));

  const mainX = 94;
  const mainW = PAGE_W - mainX - 17;
  const main: Cursor = { doc, y: 22 };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  doc.setTextColor(...DARK2);
  const minimalNameLines = doc.splitTextToSize((resume.fullName || 'Nome não informado').toUpperCase(), mainW) as string[];
  minimalNameLines.forEach((line, index) => doc.text(line, mainX, main.y + index * 8, { charSpace: 0.3 }));
  main.y += minimalNameLines.length * 8;

  const minimalRoleLines = doc.splitTextToSize((resume.targetRole || '').toUpperCase(), mainW) as string[];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...MID);
  minimalRoleLines.forEach((line, index) => doc.text(line, mainX, main.y + index * 5, { charSpace: 0.4 }));
  main.y += (minimalRoleLines.length > 0 ? minimalRoleLines.length * 5 : 0) + 5;

  if (resume.summary.trim()) {
    drawParagraph(main, resume.summary.trim(), mainX, mainW, BODY, { size: 9.5 });
  }

  const experience = find('Experiência Profissional');
  if (experience) {
    main.y += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(...DARK2);
    ensureSpace(main, 13);
    doc.text('EXPERIÊNCIA PROFISSIONAL', mainX, main.y, { charSpace: 0.4 });
    main.y += 9;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    for (const item of experience.items) {
      const lines = doc.splitTextToSize(item, mainW) as string[];
      ensureSpace(main, lines.length * 4.7 + 4);
      doc.setTextColor(...BODY);
      lines.forEach((line, index) => doc.text(line, mainX, main.y + index * 4.7));
      main.y += lines.length * 4.7 + 4.2;
    }
  }
}

/* ---------- DISPATCH ---------- */

export function renderResumeDoc(doc: jsPDF, resume: ResumeData): void {
  // Texto do usuario pode trazer emojis/icones (digitados ou importados de outro
  // PDF) que a fonte WinAnsi do jsPDF nao desenha — sanitiza antes de renderizar.
  const data = sanitizeResumeForPdf(resume);
  const template = getTemplateId(data.layout);
  switch (template) {
    case 'classic':
      renderClassic(doc, data);
      break;
    case 'ats':
      renderAts(doc, data);
      break;
    case 'ats-dev':
      renderAtsDev(doc, data);
      break;
    case 'xyz':
      renderXyz(doc, data);
      break;
    case 'executivo':
      renderExecutivo(doc, data);
      break;
    case 'clean':
      renderClean(doc, data);
      break;
    case 'minimal':
      renderMinimal(doc, data);
      break;
    default:
      renderCanva(doc, data);
  }
}

export function buildResumePdfDoc(resume: ResumeData): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  renderResumeDoc(doc, resume);
  return doc;
}

export function buildResumePdf(resume: ResumeData): Blob {
  const doc = buildResumePdfDoc(resume);
  return new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
}

export function downloadResumePdf(resume: ResumeData): void {
  saveBlob(buildResumePdf(resume), fileNameFor(resume, 'pdf'));
}
