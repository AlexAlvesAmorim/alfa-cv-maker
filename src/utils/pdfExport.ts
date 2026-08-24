import { jsPDF } from 'jspdf';
import type { ResumeData } from '../types';
import {
  buildSections,
  classifyContactPart,
  orderedContactParts,
  fileNameFor,
  getTemplateId,
  initialsOf,
  saveBlob,
  type ResumeSection,
} from './resumeContent';

const PAGE_W = 210;
const PAGE_H = 297;

type RGB = [number, number, number];

const BLOOD: RGB = [179, 18, 31];
const DARK_RED: RGB = [95, 10, 18];
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
}

function drawHeading(cursor: Cursor, text: string, x: number, width: number, color: RGB, options: HeadingOptions = {}): void {
  const { font = 'helvetica', ruleColor, upper = false, size = 12, centered = false } = options;
  const label = upper ? text.toUpperCase() : text;
  ensureSpace(cursor, 12);
  cursor.doc.setFont(font, 'bold');
  cursor.doc.setFontSize(size);
  cursor.doc.setTextColor(...color);
  cursor.doc.text(label, centered ? PAGE_W / 2 : x, cursor.y, { align: centered ? 'center' : 'left' });
  cursor.y += 1.8;
  if (ruleColor) {
    cursor.doc.setDrawColor(...ruleColor);
    cursor.doc.setLineWidth(0.4);
    cursor.doc.line(x, cursor.y, x + width, cursor.y);
  }
  cursor.y += 6;
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
    cursor.y += lines.length * lineHeight + 1.8;
  }
  cursor.y += 2.5;
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
  cursor.y += lines.length * lineHeight + 4;
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
      cursor.y += 1.6;
    }
    maxBottom = Math.max(maxBottom, cursor.y);
  });
  cursor.y = maxBottom + 2;
}

function drawDotted(cursor: Cursor, x1: number, x2: number, color: RGB = [122, 122, 120]): void {
  cursor.doc.setFillColor(...color);
  for (let x = x1; x < x2; x += 3.4) {
    cursor.doc.rect(x, cursor.y - 0.9, 1.3, 1.3, 'F');
  }
  cursor.y += 5;
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
  const marginX = 20;
  const contentW = PAGE_W - marginX * 2;
  const cursor: Cursor = { doc, y: 24 };

  doc.setFont(style.font, 'bold');
  doc.setFontSize(style.nameSize);
  doc.setTextColor(...INK);
  const nameX = style.centeredName ? PAGE_W / 2 : marginX;
  doc.text(resume.fullName || 'Nome não informado', nameX, cursor.y, { align: 'center' });
  cursor.y += 7;

  doc.setFont(style.font, 'normal');
  doc.setFontSize(11.5);
  doc.setTextColor(...style.accent);
  doc.text(resume.targetRole || '', nameX, cursor.y, { align: 'center' });
  cursor.y += 5.5;

  const contactItems = orderedContactParts(resume.contact);
  if (contactItems.length > 0) {
    doc.setFont(style.font, 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    const lineGap = 4.4;
    ensureSpace(cursor, contactItems.length * lineGap);
    contactItems.forEach((part) => {
      doc.text(part, nameX, cursor.y, { align: 'center' });
      cursor.y += lineGap;
    });
    cursor.y += 1;
  }

  doc.setDrawColor(...style.accent);
  doc.setLineWidth(0.5);
  doc.line(marginX, cursor.y, marginX + contentW, cursor.y);
  cursor.y += 8;

  sectioned(buildSections(resume), [], (section) => {
    drawHeading(cursor, section.title, marginX, contentW, style.accent, {
      font: style.font,
      ruleColor: style.accent,
      upper: style.upperHeadings,
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
  const marginX = 18;
  const contentW = PAGE_W - marginX * 2;
  const cursor: Cursor = { doc, y: 24 };
  const sections = buildSections(resume);
  const find = (title: string) => sections.find((section) => section.title === title);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...BLACK);
  doc.text(resume.fullName || 'Nome não informado', PAGE_W / 2, cursor.y, { align: 'center' });
  cursor.y += 11;

  const contactBlock: Array<[string, string]> = [];
  const LABELS: Record<string, string> = { address: 'Endereço:', phone: 'Telefone:', email: 'E-mail:', link: 'LinkedIn:' };
  orderedContactParts(resume.contact).forEach((part) => {
    contactBlock.push([LABELS[classifyContactPart(part)], part]);
  });
  if (contactBlock.length > 0) {
    drawHeading(cursor, 'Informações Pessoais', marginX, contentW, BLACK, { centered: true, ruleColor: BLACK, size: 13 });
    for (const [label, value] of contactBlock) {
      ensureSpace(cursor, 5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...BLACK);
      doc.text(label, marginX + 4, cursor.y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, marginX + 34, cursor.y);
      cursor.y += 5.2;
    }
    cursor.y += 4;
  }

  if (resume.summary.trim()) {
    drawHeading(cursor, 'Resumo', marginX, contentW, BLACK, { centered: true, ruleColor: BLACK, size: 13 });
    drawParagraph(cursor, resume.summary.trim(), marginX, contentW, BODY, { align: 'justify', size: 10.5 });
    cursor.y += 2;
  }

  const education = find('Formação Acadêmica');
  if (education) {
    drawHeading(cursor, 'Formação', marginX, contentW, BLACK, { centered: true, ruleColor: BLACK, size: 13 });
    drawBullets(cursor, education.items, marginX, contentW, DARK2, null, { size: 10.5 });
  }

  const experience = find('Experiência Profissional');
  if (experience) {
    drawHeading(cursor, 'Experiência Profissional', marginX, contentW, BLACK, { centered: true, ruleColor: BLACK, size: 13 });
    drawBullets(cursor, experience.items, marginX, contentW, BODY, MID, { size: 10, dot: '·' });
  }

  const skills = find('Habilidades');
  if (skills) {
    drawHeading(cursor, 'Habilidades', marginX, contentW, BLACK, { centered: true, ruleColor: BLACK, size: 13 });
    drawColumns(cursor, skills.items, marginX + 4, contentW - 4, 3, DARK2, { size: 9.5, dot: '-' });
  }

  const languages = find('Idiomas');
  if (languages) {
    drawHeading(cursor, 'Idiomas', marginX, contentW, BLACK, { centered: true, ruleColor: BLACK, size: 13 });
    drawParagraph(cursor, languages.items.join('   |   '), marginX, contentW, BODY, { size: 10 });
  }
}

/* ---------- XYZ (padrão Sofia) ---------- */

function renderXyz(doc: jsPDF, resume: ResumeData): void {
  const marginX = 18;
  const contentW = PAGE_W - marginX * 2;
  const cursor: Cursor = { doc, y: 22 };
  const sections = buildSections(resume);
  const find = (title: string) => sections.find((section) => section.title === title);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...DARK2);
  doc.text((resume.fullName || 'Nome não informado').toUpperCase(), PAGE_W / 2, cursor.y, { align: 'center' });
  cursor.y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...MID);
  doc.text((resume.targetRole || '').toUpperCase(), PAGE_W / 2, cursor.y, { align: 'center' });
  cursor.y += 5;

  orderedContactParts(resume.contact).forEach((part) => {
    doc.setFontSize(9);
    doc.text(part, PAGE_W / 2, cursor.y, { align: 'center' });
    cursor.y += 4.2;
  });

  doc.setDrawColor(...DIVIDER);
  doc.setLineWidth(0.6);
  doc.line(marginX, cursor.y, marginX + contentW, cursor.y);
  cursor.y += 8;

  if (resume.summary.trim()) {
    drawHeading(cursor, 'Perfil Profissional', marginX, contentW, DARK2, { centered: true, size: 12 });
    drawParagraph(cursor, resume.summary.trim(), marginX, contentW, BODY, { align: 'justify', size: 9.5 });
    cursor.y += 2;
  }

  const education = find('Formação Acadêmica');
  if (education) {
    drawHeading(cursor, 'Formação Acadêmica', marginX, contentW, DARK2, { size: 12 });
    drawColumns(cursor, education.items, marginX, contentW, 2, DARK2, { size: 9.5, bold: true });
  }

  const experience = find('Experiência Profissional');
  if (experience) {
    drawHeading(cursor, 'Experiência Profissional', marginX, contentW, DARK2, { size: 12 });
    drawBullets(cursor, experience.items, marginX, contentW, BODY, DARK2, { size: 9.5 });
  }

  const skills = find('Habilidades');
  if (skills) {
    drawHeading(cursor, 'Habilidades', marginX, contentW, DARK2, { size: 12 });
    drawColumns(cursor, skills.items, marginX, contentW, 3, BODY, { size: 9.5, dot: '•' });
  }

  const languages = find('Idiomas');
  if (languages) {
    drawHeading(cursor, 'Idiomas', marginX, contentW, DARK2, { size: 12 });
    drawColumns(cursor, languages.items, marginX, contentW, Math.min(languages.items.length, 3), BODY, { size: 9.5 });
  }
}

/* ---------- MODERNO (padrão Marina, marca vermelha) ---------- */

function renderCanva(doc: jsPDF, resume: ResumeData): void {
  const sidebarW = 70;
  doc.setFillColor(...DARK_RED);
  doc.rect(0, 0, sidebarW, PAGE_H, 'F');
  doc.setFillColor(...BLOOD);
  doc.rect(0, 0, sidebarW, 46, 'F');

  const cursor: Cursor = { doc, y: 0 };
  drawPhotoCircle(cursor, resume, sidebarW / 2, 46, 19);

  let sideY = 76;
  const sideX = 10;
  const sideW = sidebarW - sideX * 2;

  const sidebarSection = (title: string) => {
    doc.setDrawColor(...SIDEBAR_TEXT);
    doc.setLineWidth(0.5);
    doc.setLineDashPattern([1.6, 1.4], 0);
    doc.line(sideX, sideY - 3.4, sideX + sideW, sideY - 3.4);
    doc.setLineDashPattern([], 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), sideX, sideY);
    sideY += 6.5;
  };

  sidebarSection('Contato');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  for (const part of orderedContactParts(resume.contact)) {
    const lines = doc.splitTextToSize(part, sideW) as string[];
    ensureSpace(cursor, lines.length * 4.4, 60);
    doc.setTextColor(...SIDEBAR_TEXT);
    lines.forEach((line, index) => doc.text(line, sideX, sideY + index * 4.4));
    sideY += lines.length * 4.4 + 1.6;
  }
  sideY += 6;

  const sections = buildSections(resume);
  const skills = sections.find((section) => section.title === 'Habilidades');
  if (skills) {
    sidebarSection('Competências');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    for (const skill of skills.items) {
      const lines = doc.splitTextToSize(skill, sideW - 4) as string[];
      ensureSpace(cursor, lines.length * 4.4, 60);
      doc.setFillColor(255, 255, 255);
      doc.rect(sideX, sideY - 2.2, 1.8, 1.8, 'F');
      doc.setTextColor(...SIDEBAR_TEXT);
      lines.forEach((line, index) => doc.text(line, sideX + 4, sideY + index * 4.4));
      sideY += lines.length * 4.4 + 1.4;
    }
    sideY += 6;
  }

  const languages = sections.find((section) => section.title === 'Idiomas');
  if (languages) {
    sidebarSection('Idiomas');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    for (const language of languages.items) {
      const lines = doc.splitTextToSize(language, sideW - 4) as string[];
      ensureSpace(cursor, lines.length * 4.4, 60);
      doc.setFillColor(255, 255, 255);
      doc.rect(sideX, sideY - 2.2, 1.8, 1.8, 'F');
      doc.setTextColor(...SIDEBAR_TEXT);
      lines.forEach((line, index) => doc.text(line, sideX + 4, sideY + index * 4.4));
      sideY += lines.length * 4.4 + 1.4;
    }
  }

  const mainX = sidebarW + 12;
  const mainW = PAGE_W - mainX - 14;
  const main: Cursor = { doc, y: 26 };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  const nameLines = doc.splitTextToSize(resume.fullName || 'Nome não informado', mainW) as string[];
  nameLines.forEach((line, index) => doc.text(line, mainX, main.y + index * 8));
  main.y += nameLines.length * 8 + 1;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11.5);
  doc.setTextColor(...BLOOD);
  doc.text(resume.targetRole || '', mainX, main.y);
  main.y += 8;

  const mainHeading = (title: string) => {
    ensureSpace(main, 14);
    doc.setDrawColor(...BLOOD);
    doc.setLineWidth(1);
    doc.line(mainX, main.y, mainX + mainW, main.y);
    main.y += 5.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...BLOOD);
    doc.text(title.toUpperCase(), mainX, main.y);
    main.y += 7;
  };

  if (resume.summary.trim()) {
    mainHeading('Síntese');
    drawParagraph(main, resume.summary.trim(), mainX, mainW, BODY, { size: 10 });
  }

  const experience = sections.find((section) => section.title === 'Experiência Profissional');
  if (experience) {
    mainHeading('Experiência Profissional');
    drawBullets(main, experience.items, mainX, mainW, BODY, BLOOD, { size: 10 });
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
  doc.text('Gerado com Alfa Curriculum Maker', mainX, PAGE_H - 8);
}

/* ---------- EXECUTIVO (faixa azul-acinzentada) ---------- */

function renderExecutivo(doc: jsPDF, resume: ResumeData): void {
  doc.setFillColor(...SLATE);
  doc.rect(0, 0, PAGE_W, 54, 'F');

  const cursor: Cursor = { doc, y: 0 };
  drawPhotoCircle(cursor, resume, 40, 27, 19);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text(resume.fullName || 'Nome não informado', 70, 24);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(...LIGHT_BLUE);
  doc.text((resume.targetRole || '').toUpperCase(), 70, 33);

  let sideY = 68;
  const sideX = 14;
  const sideW = 60;

  const sideHeading = (title: string) => {
    ensureSpace(cursor, 12, 60);
    sideY += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...SLATE_HEAD);
    doc.text(title.toUpperCase(), sideX, sideY);
    sideY += 1.8;
    doc.setDrawColor(...SLATE_HEAD);
    doc.setLineWidth(0.5);
    doc.line(sideX, sideY, sideX + sideW, sideY);
    sideY += 5.5;
  };

  const sideLines = (items: string[]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...BODY);
    for (const item of items) {
      const lines = doc.splitTextToSize(item, sideW) as string[];
      ensureSpace(cursor, lines.length * 4.6, 60);
      lines.forEach((line, index) => doc.text(line, sideX, sideY + index * 4.6));
      sideY += lines.length * 4.6 + 1.5;
    }
    sideY += 3;
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
      ensureSpace(cursor, lines.length * 4.6, 60);
      doc.setFillColor(...SLATE_HEAD);
      doc.rect(sideX, sideY - 2.3, 1.8, 1.8, 'F');
      doc.setTextColor(...BODY);
      lines.forEach((line, index) => doc.text(line, sideX + 4, sideY + index * 4.6));
      sideY += lines.length * 4.6 + 1.4;
    }
  }

  const mainX = 86;
  const mainW = PAGE_W - mainX - 14;
  const main: Cursor = { doc, y: 66 };

  const mainHeading = (title: string) => {
    ensureSpace(main, 14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(...SLATE_HEAD);
    doc.text(title.toUpperCase(), mainX, main.y);
    main.y += 2;
    doc.setDrawColor(...LIGHT_BLUE);
    doc.setLineWidth(0.6);
    doc.line(mainX, main.y, mainX + mainW, main.y);
    main.y += 7;
  };

  if (resume.summary.trim()) {
    mainHeading('Perfil Profissional');
    drawParagraph(main, resume.summary.trim(), mainX, mainW, BODY, { size: 10 });
  }

  const experience = sections.find((section) => section.title === 'Experiência Profissional');
  if (experience) {
    mainHeading('Experiência Profissional');
    drawBullets(main, experience.items, mainX, mainW, BODY, SLATE, { size: 10 });
  }

  const education = sections.find((section) => section.title === 'Formação Acadêmica');
  if (education) {
    mainHeading('Formação Acadêmica');
    drawBullets(main, education.items, mainX, mainW, DARK2, null, { size: 10 });
  }
}

/* ---------- CLEAN (serif elegante) ---------- */

function renderClean(doc: jsPDF, resume: ResumeData): void {
  const marginX = 16;
  const cursor: Cursor = { doc, y: 20 };

  if (resume.photo) {
    doc.addImage(resume.photo, 'PNG', PAGE_W - marginX - 40, 14, 40, 53.3);
    doc.setDrawColor(...TEAL);
    doc.setLineWidth(1);
    doc.roundedRect(PAGE_W - marginX - 41, 13, 42, 55.3, 4, 4, 'S');
  }

  doc.setFont('times', 'bolditalic');
  doc.setFontSize(28);
  doc.setTextColor(...TEAL);
  doc.text(resume.fullName || 'Nome não informado', marginX, cursor.y + 8);
  cursor.y += 15;

  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...DARK2);
  for (const part of orderedContactParts(resume.contact)) {
    const lines = doc.splitTextToSize(part, 120) as string[];
    ensureSpace(cursor, lines.length * 5);
    lines.forEach((line, index) => doc.text(line, marginX, cursor.y + index * 5));
    cursor.y += lines.length * 5 + 0.6;
  }

  cursor.y += 3;
  drawDotted(cursor, marginX, 120);

  const sections = buildSections(resume);
  const find = (title: string) => sections.find((section) => section.title === title);

  const cleanHeading = (title: string) => {
    ensureSpace(cursor, 12);
    doc.setFont('times', 'bolditalic');
    doc.setFontSize(16);
    doc.setTextColor(...TEAL);
    doc.text(title, marginX, cursor.y);
    cursor.y += 6.5;
  };

  if (resume.targetRole.trim()) {
    cleanHeading('Profissão');
    doc.setFont('times', 'normal');
    doc.setFontSize(11.5);
    doc.setTextColor(...BODY);
    doc.text(resume.targetRole.trim(), marginX, cursor.y);
    cursor.y += 7;
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
    drawBullets(cursor, experience.items, marginX, PAGE_W - marginX * 2, BODY, TEAL, { font: 'times', size: 11 });
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
  doc.setFillColor(...GRAY_BG);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  const sections = buildSections(resume);
  const find = (title: string) => sections.find((section) => section.title === title);

  const leftX = 20;
  const leftRight = 76;
  const leftW = leftRight - leftX;

  if (resume.photo) {
    doc.addImage(resume.photo, 'PNG', leftX + (leftW - 36) / 2, 16, 36, 48);
  }

  const leftHeading = (title: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(...DARK2);
    doc.text(title.toUpperCase(), leftRight, leftY);
    leftY += 6.5;
  };

  const leftLines = (items: string[], bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...MID);
    for (const item of items) {
      const lines = doc.splitTextToSize(item, leftW) as string[];
      for (const line of lines) {
        doc.text(line, leftRight, leftY, { align: 'right' });
        leftY += 4.6;
      }
      leftY += 1.2;
    }
    leftY += 4;
  };

  let leftY = resume.photo ? 74 : 22;

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

  doc.setDrawColor(...DIVIDER);
  doc.setLineWidth(0.8);
  doc.line(86, 14, 86, 283);

  const mainX = 94;
  const mainW = PAGE_W - mainX - 16;
  const main: Cursor = { doc, y: 22 };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  doc.setTextColor(...DARK2);
  doc.text((resume.fullName || 'Nome não informado').toUpperCase(), mainX, main.y);
  main.y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...MID);
  doc.text((resume.targetRole || '').toUpperCase(), mainX, main.y);
  main.y += 9;

  if (resume.summary.trim()) {
    drawParagraph(main, resume.summary.trim(), mainX, mainW, BODY, { size: 9.5 });
  }

  const experience = find('Experiência Profissional');
  if (experience) {
    main.y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...DARK2);
    ensureSpace(main, 12);
    doc.text('EXPERIÊNCIA PROFISSIONAL', mainX, main.y);
    main.y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    for (const item of experience.items) {
      const lines = doc.splitTextToSize(item, mainW) as string[];
      ensureSpace(main, lines.length * 4.7 + 3);
      doc.setTextColor(...BODY);
      lines.forEach((line, index) => doc.text(line, mainX, main.y + index * 4.7));
      main.y += lines.length * 4.7 + 3.4;
    }
  }
}

/* ---------- DISPATCH ---------- */

export function buildResumePdf(resume: ResumeData): Blob {
  const template = getTemplateId(resume.layout);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  switch (template) {
    case 'classic':
      renderClassic(doc, resume);
      break;
    case 'ats':
      renderAts(doc, resume);
      break;
    case 'xyz':
      renderXyz(doc, resume);
      break;
    case 'executivo':
      renderExecutivo(doc, resume);
      break;
    case 'clean':
      renderClean(doc, resume);
      break;
    case 'minimal':
      renderMinimal(doc, resume);
      break;
    default:
      renderCanva(doc, resume);
  }
  return new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
}

export function downloadResumePdf(resume: ResumeData): void {
  saveBlob(buildResumePdf(resume), fileNameFor(resume, 'pdf'));
}
