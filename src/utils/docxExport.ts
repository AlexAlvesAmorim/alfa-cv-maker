import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import type { ResumeData } from '../types';
import {
  accentHex,
  buildSections,
  classifyContactPart,
  orderedContactParts,
  fileNameFor,
  getTemplateId,
  initialsOf,
  saveBlob,
} from './resumeContent';

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

const ACCENT = 'B3121F';
const DARK_RED = '5F0A12';
const INK = '221416';
const BODY = '372D2F';
const MUTED = '6E5F61';
const SLATE = '3F4E63';
const SLATE_HEAD = '33404F';
const LIGHT_BLUE = 'D6DEE7';
const TEAL = '42C7D0';
const GRAY_BG = 'F2F2F0';
const DARK2 = '2E2E2C';

interface RunOptions {
  size?: number;
  bold?: boolean;
  italics?: boolean;
  color?: string;
  font?: string;
}

function run(text: string, options: RunOptions = {}): TextRun {
  return new TextRun({
    text,
    size: options.size ?? 21,
    bold: options.bold ?? false,
    italics: options.italics ?? false,
    color: options.color ?? BODY,
    font: options.font,
  });
}

function paragraph(children: TextRun[], afterSpacing = 120): Paragraph {
  return new Paragraph({ children, spacing: { after: afterSpacing, line: 276 } });
}

function bullet(text: string, color = BODY): Paragraph {
  return new Paragraph({
    children: [run(text, { color })],
    bullet: { level: 0 },
    spacing: { after: 60, line: 264 },
  });
}

interface HeadingOptions {
  upper?: boolean;
  ruleColor?: string;
  centered?: boolean;
  right?: boolean;
  size?: number;
  italics?: boolean;
  font?: string;
}

function heading(text: string, color: string, options: HeadingOptions = {}): Paragraph {
  const { upper = false, ruleColor, centered = false, right = false, size = 25, italics = false, font = 'Calibri' } = options;
  const label = upper ? text.toUpperCase() : text;
  return new Paragraph({
    alignment: centered ? AlignmentType.CENTER : right ? AlignmentType.RIGHT : AlignmentType.LEFT,
    children: [new TextRun({ text: label, bold: true, size, color, italics, font })],
    border: ruleColor
      ? { bottom: { style: BorderStyle.SINGLE, size: 8, color: ruleColor, space: 3 } }
      : undefined,
    spacing: { before: 220, after: 120 },
  });
}

function dottedSeparator(color = '7A7A78'): Paragraph {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.DOTTED, size: 12, color, space: 2 } },
    spacing: { before: 60, after: 200 },
    children: [],
  });
}

function baseDocument(font: string, children: (Paragraph | Table)[], zeroMargins = false): Document {
  return new Document({
    styles: {
      default: {
        document: {
          run: { font, size: 21, color: BODY },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: zeroMargins
              ? { top: 0, right: 0, bottom: 0, left: 0 }
              : { top: 1000, right: 1100, bottom: 1000, left: 1100 },
          },
        },
        children,
      },
    ],
  });
}

function centered(text: string, options: RunOptions & { after?: number }): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [run(text, options)],
    spacing: { after: options.after ?? 80 },
  });
}

function photoParagraph(dataUrl: string, widthPx: number, heightPx: number, centeredImage = true): Paragraph {
  return new Paragraph({
    alignment: centeredImage ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { after: 200 },
    children: [
      new ImageRun({
        data: dataUrlToBytes(dataUrl),
        type: 'png',
        transformation: { width: widthPx, height: heightPx },
      }),
    ],
  });
}

/* ---------- CLÁSSICO ---------- */

function buildClassicChildren(resume: ResumeData): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [
    centered(resume.fullName || 'Nome não informado', { size: 40, bold: true, color: INK, after: 40 }),
    centered(resume.targetRole || '', { size: 23, italics: true, color: MUTED, after: 40 }),
  ];
  for (const part of orderedContactParts(resume.contact)) {
    children.push(centered(part, { size: 18, color: MUTED, after: 20 }));
  }
  children.push(new Paragraph({ spacing: { after: 140 }, children: [] }));
  for (const section of buildSections(resume)) {
    children.push(heading(section.title, INK, { upper: true, ruleColor: '000000', centered: true }));
    if (section.title === 'Habilidades') {
      children.push(centered(section.items.join('  •  '), { size: 21, color: BODY }));
    } else {
      for (const item of section.items) children.push(bullet(item));
    }
  }
  return children;
}

/* ---------- ATS (padrão Bateman) ---------- */

function buildAtsChildren(resume: ResumeData): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [
    centered(resume.fullName || 'Nome não informado', { size: 44, bold: true, color: '000000', after: 120 }),
  ];

  const LABELS: Record<string, string> = { address: 'Endereço: ', phone: 'Telefone: ', email: 'E-mail: ', link: 'LinkedIn: ' };
  const contactPartsList = orderedContactParts(resume.contact);
  if (contactPartsList.length > 0) {
    children.push(heading('Informações Pessoais', '000000', { centered: true, size: 26, ruleColor: '000000' }));
    for (const part of contactPartsList) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: LABELS[classifyContactPart(part)], bold: true, size: 20, color: '000000' }),
            new TextRun({ text: part, size: 20, color: '282828' }),
          ],
          spacing: { after: 40 },
        }),
      );
    }
    children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
  }

  if (resume.summary.trim()) {
    children.push(heading('Resumo', '000000', { centered: true, size: 26, ruleColor: '000000' }));
    children.push(paragraph([run(resume.summary.trim(), { color: '282828' })], 160));
  }

  for (const section of buildSections(resume)) {
    if (section.title === 'Formação Acadêmica') {
      children.push(heading('Formação', '000000', { centered: true, size: 26, ruleColor: '000000' }));
      for (const item of section.items) children.push(bullet(item, '282828'));
    }
    if (section.title === 'Experiência Profissional') {
      children.push(heading('Experiência Profissional', '000000', { centered: true, size: 26, ruleColor: '000000' }));
      for (const item of section.items) children.push(bullet(item, '282828'));
    }
    if (section.title === 'Habilidades') {
      children.push(heading('Habilidades', '000000', { centered: true, size: 26, ruleColor: '000000' }));
      children.push(paragraph([run(section.items.join('  |  '), { color: '282828' })]));
    }
    if (section.title === 'Idiomas') {
      children.push(heading('Idiomas', '000000', { centered: true, size: 26, ruleColor: '000000' }));
      children.push(paragraph([run(section.items.join('   |   '), { color: '282828' })]));
    }
  }
  return children;
}

/* ---------- XYZ (padrão Sofia) ---------- */

function buildXyzChildren(resume: ResumeData): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [
    centered((resume.fullName || 'Nome não informado').toUpperCase(), { size: 40, bold: true, color: DARK2, after: 40 }),
    centered((resume.targetRole || '').toUpperCase(), { size: 20, color: MUTED, after: 40 }),
  ];
  for (const part of orderedContactParts(resume.contact)) {
    children.push(centered(part, { size: 18, color: MUTED, after: 20 }));
  }
  children.push(
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: 'D9D9D6', space: 4 } },
      spacing: { after: 220 },
      children: [],
    }),
  );

  const sections = buildSections(resume);
  if (resume.summary.trim()) {
    children.push(heading('Perfil Profissional', DARK2, { centered: true }));
    children.push(paragraph([run(resume.summary.trim())], 160));
  }
  for (const section of sections) {
    if (section.title === 'Formação Acadêmica') {
      children.push(heading('Formação Acadêmica', DARK2, {}));
      children.push(paragraph([run(section.items.join('  |  '), { bold: true, color: DARK2 })]));
    }
    if (section.title === 'Experiência Profissional') {
      children.push(heading('Experiência Profissional', DARK2, {}));
      for (const item of section.items) children.push(bullet(item));
    }
    if (section.title === 'Habilidades') {
      children.push(heading('Habilidades', DARK2, {}));
      children.push(paragraph([run(section.items.map((item) => `• ${item}`).join('   '), {})]));
    }
    if (section.title === 'Idiomas') {
      children.push(heading('Idiomas', DARK2, {}));
      children.push(paragraph([run(section.items.join('   |   '))]));
    }
  }
  return children;
}

/* ---------- MODERNO / EXECUTIVO (sidebar com tabela) ---------- */

interface SidebarTableOptions {
  fill: string;
  bandFill?: string;
  titleColor?: string;
}

function buildSidebarCell(resume: ResumeData, options: SidebarTableOptions): TableCell {
  const children: Paragraph[] = [];

  if (resume.photoCircle) {
    children.push(photoParagraph(resume.photoCircle, 110, 110));
  } else {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 500, after: 300 },
        children: [new TextRun({ text: initialsOf(resume.fullName), bold: true, size: 56, color: 'FFFFFF' })],
      }),
    );
  }

  children.push(sidebarTitle('Contato', options.titleColor));
  for (const part of orderedContactParts(resume.contact)) children.push(sidebarParagraph(part, options.titleColor));

  const sections = buildSections(resume);
  const skills = sections.find((section) => section.title === 'Habilidades');
  if (skills) {
    children.push(sidebarTitle('Competências', options.titleColor));
    for (const skill of skills.items) children.push(sidebarParagraph(`▪ ${skill}`, options.titleColor));
  }

  const languages = sections.find((section) => section.title === 'Idiomas');
  if (languages) {
    children.push(sidebarTitle('Idiomas', options.titleColor));
    for (const language of languages.items) children.push(sidebarParagraph(`▪ ${language}`, options.titleColor));
  }

  return new TableCell({
    shading: { fill: options.fill },
    margins: { top: 400, bottom: 400, left: 340, right: 340 },
    verticalAlign: VerticalAlign.TOP,
    width: { size: 3800, type: WidthType.DXA },
    children,
  });
}

function sidebarParagraph(text: string, color = 'FFFFFF'): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 18, color })],
    spacing: { after: 70, line: 250 },
  });
}

function sidebarTitle(text: string, color = 'FFFFFF'): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 20, color })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color, space: 2 } },
    spacing: { before: 260, after: 130 },
  });
}

function buildMainCellChildren(resume: ResumeData, accent: string, ruleColor: string): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [
    paragraph([run(resume.fullName || 'Nome não informado', { size: 52, bold: true, color: INK })], 40),
    paragraph([run(resume.targetRole || '', { size: 24, color: accent })], 60),
  ];

  const sections = buildSections(resume);
  if (resume.summary.trim()) {
    children.push(heading('Síntese', accent, { ruleColor, size: 24, upper: true }));
    children.push(paragraph([run(resume.summary.trim())]));
  }
  for (const section of sections) {
    if (section.title === 'Experiência Profissional') {
      children.push(heading('Experiência Profissional', accent, { ruleColor, size: 24, upper: true }));
      for (const item of section.items) children.push(bullet(item));
    }
    if (section.title === 'Formação Acadêmica') {
      children.push(heading('Formação Acadêmica', accent, { ruleColor, size: 24, upper: true }));
      for (const item of section.items) children.push(paragraph([run(item, { bold: true, color: DARK2 })], 80));
    }
  }
  return children;
}

const NO_BORDER = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};

function buildCanvaDoc(resume: ResumeData): Document {
  const table = new Table({
    width: { size: 11906, type: WidthType.DXA },
    columnWidths: [3800, 8106],
    borders: NO_BORDER,
    rows: [
      new TableRow({
        children: [
          buildSidebarCell(resume, { fill: accentHex(resume, DARK_RED) }),
          new TableCell({
            margins: { top: 500, bottom: 500, left: 420, right: 420 },
            verticalAlign: VerticalAlign.TOP,
            width: { size: 8106, type: WidthType.DXA },
            children: buildMainCellChildren(resume, accentHex(resume, ACCENT), 'EBC4C7'),
          }),
        ],
      }),
    ],
  });
  return baseDocument('Calibri', [table], true);
}

function buildExecutivoDoc(resume: ResumeData): Document {
  const headerTable = new Table({
    width: { size: 11906, type: WidthType.DXA },
    columnWidths: [3200, 8706],
    borders: NO_BORDER,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: SLATE },
            verticalAlign: VerticalAlign.CENTER,
            width: { size: 3200, type: WidthType.DXA },
            children: [
              resume.photoCircle
                ? photoParagraph(resume.photoCircle, 110, 110)
                : new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: initialsOf(resume.fullName), bold: true, size: 48, color: 'FFFFFF' })],
                  }),
            ],
          }),
          new TableCell({
            shading: { fill: SLATE },
            verticalAlign: VerticalAlign.CENTER,
            width: { size: 8706, type: WidthType.DXA },
            children: [
              new Paragraph({
                children: [new TextRun({ text: resume.fullName || 'Nome não informado', bold: true, size: 56, color: 'FFFFFF' })],
                spacing: { after: 60 },
              }),
              new Paragraph({
                children: [new TextRun({ text: (resume.targetRole || '').toUpperCase(), size: 24, color: LIGHT_BLUE })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const sidebarChildren: Paragraph[] = [];
  sidebarChildren.push(sidebarTitle('Contato', SLATE_HEAD));
  for (const part of orderedContactParts(resume.contact)) sidebarChildren.push(sidebarParagraph(part, '372D2F'));

  const sections = buildSections(resume);
  const languages = sections.find((section) => section.title === 'Idiomas');
  if (languages) {
    sidebarChildren.push(sidebarTitle('Idiomas', SLATE_HEAD));
    for (const language of languages.items) sidebarChildren.push(sidebarParagraph(language, '372D2F'));
  }
  const skills = sections.find((section) => section.title === 'Habilidades');
  if (skills) {
    sidebarChildren.push(sidebarTitle('Habilidades', SLATE_HEAD));
    for (const skill of skills.items) sidebarChildren.push(sidebarParagraph(`▪ ${skill}`, '372D2F'));
  }

  const contentTable = new Table({
    width: { size: 11906, type: WidthType.DXA },
    columnWidths: [3800, 8106],
    borders: NO_BORDER,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            margins: { top: 400, bottom: 400, left: 340, right: 340 },
            width: { size: 3800, type: WidthType.DXA },
            children: sidebarChildren,
          }),
          new TableCell({
            margins: { top: 400, bottom: 400, left: 420, right: 420 },
            width: { size: 8106, type: WidthType.DXA },
            children: buildMainCellChildren(resume, accentHex(resume, SLATE_HEAD), LIGHT_BLUE).slice(1),
          }),
        ],
      }),
    ],
  });

  return baseDocument('Calibri', [headerTable, new Paragraph({ children: [] }), contentTable], true);
}

/* ---------- CLEAN (serif elegante) ---------- */

function buildCleanChildren(resume: ResumeData): (Paragraph | Table)[] {
  const accent = accentHex(resume, TEAL);
  const children: (Paragraph | Table)[] = [];

  if (resume.photo) {
    children.push(
      new Table({
        width: { size: 10466, type: WidthType.DXA },
        columnWidths: [6800, 3666],
        borders: NO_BORDER,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 6800, type: WidthType.DXA },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: resume.fullName || 'Nome não informado', bold: true, italics: true, size: 56, color: accent, font: 'Georgia' })],
                    spacing: { after: 120 },
                  }),
                  ...orderedContactParts(resume.contact).map(
                    (part) =>
                      new Paragraph({
                        children: [new TextRun({ text: part, bold: true, size: 21, color: DARK2, font: 'Georgia' })],
                        spacing: { after: 40 },
                      }),
                  ),
                ],
              }),
              new TableCell({
                width: { size: 3666, type: WidthType.DXA },
                children: [photoParagraph(resume.photo, 120, 160)],
              }),
            ],
          }),
        ],
      }),
    );
  } else {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: resume.fullName || 'Nome não informado', bold: true, italics: true, size: 56, color: accent, font: 'Georgia' })],
        spacing: { after: 120 },
      }),
    );
    for (const part of orderedContactParts(resume.contact)) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: part, bold: true, size: 21, color: DARK2, font: 'Georgia' })],
          spacing: { after: 40 },
        }),
      );
    }
  }

  children.push(dottedSeparator());

  if (resume.targetRole.trim()) {
    children.push(heading('Profissão', accent, { italics: true, font: 'Georgia', size: 30 }));
    children.push(paragraph([run(resume.targetRole.trim(), { font: 'Georgia' })], 140));
  }

  if (resume.summary.trim()) {
    children.push(heading('Qualificação Profissional', accent, { italics: true, font: 'Georgia', size: 30 }));
    children.push(paragraph([run(resume.summary.trim(), { font: 'Georgia' })], 140));
  }

  for (const section of buildSections(resume)) {
    const titles: Record<string, string> = {
      'Experiência Profissional': 'Experiência Profissional',
      'Formação Acadêmica': 'Formação',
      Habilidades: 'Habilidades',
      Idiomas: 'Idiomas',
    };
    const title = titles[section.title];
    if (!title) continue;
    children.push(heading(title, accent, { italics: true, font: 'Georgia', size: 30 }));
    if (section.title === 'Habilidades') {
      children.push(paragraph([run(section.items.join('  •  '), { font: 'Georgia' })], 140));
    } else {
      for (const item of section.items) children.push(bullet(item));
    }
    children.push(dottedSeparator());
  }

  return children;
}

/* ---------- MINIMAL (duas colunas) ---------- */

function buildMinimalDoc(resume: ResumeData): Document {
  const sections = buildSections(resume);
  const find = (title: string) => sections.find((section) => section.title === title);

  const leftChildren: Paragraph[] = [];
  if (resume.photo) leftChildren.push(photoParagraph(resume.photo, 110, 147));

  const leftHeading = (title: string) =>
    leftChildren.push(heading(title, DARK2, { upper: true, size: 25, right: true, ruleColor: 'D9D9D6' }));

  const leftLines = (items: string[], bold = false) => {
    for (const item of items) {
      leftChildren.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: item, size: 19, bold, color: MUTED })],
          spacing: { after: 50 },
        }),
      );
    }
    leftChildren.push(new Paragraph({ spacing: { after: 140 }, children: [] }));
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

  const rightChildren: (Paragraph | Table)[] = [
    new Paragraph({
      children: [new TextRun({ text: (resume.fullName || 'Nome não informado').toUpperCase(), bold: true, size: 60, color: DARK2 })],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: (resume.targetRole || '').toUpperCase(), size: 21, color: MUTED })],
      spacing: { after: 200 },
    }),
  ];
  if (resume.summary.trim()) rightChildren.push(paragraph([run(resume.summary.trim())], 200));

  const experience = find('Experiência Profissional');
  if (experience) {
    rightChildren.push(heading('Experiência Profissional', DARK2, { upper: true, size: 26 }));
    for (const item of experience.items) rightChildren.push(paragraph([run(item)], 140));
  }

  const dividerBorder = {
    ...NO_BORDER,
    right: { style: BorderStyle.SINGLE, size: 8, color: 'D9D9D6' },
  };

  const table = new Table({
    width: { size: 11906, type: WidthType.DXA },
    columnWidths: [4400, 7506],
    borders: NO_BORDER,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: GRAY_BG },
            borders: dividerBorder,
            margins: { top: 400, bottom: 400, left: 340, right: 340 },
            width: { size: 4400, type: WidthType.DXA },
            children: leftChildren,
          }),
          new TableCell({
            shading: { fill: GRAY_BG },
            margins: { top: 400, bottom: 400, left: 420, right: 420 },
            width: { size: 7506, type: WidthType.DXA },
            children: rightChildren,
          }),
        ],
      }),
    ],
  });

  return baseDocument('Calibri', [table], true);
}

/* ---------- DISPATCH ---------- */

export async function buildResumeDocx(resume: ResumeData): Promise<Blob> {
  const template = getTemplateId(resume.layout);
  const docByTemplate: Record<string, Document> = {
    classic: baseDocument('Times New Roman', buildClassicChildren(resume)),
    ats: baseDocument('Calibri', buildAtsChildren(resume)),
    xyz: baseDocument('Calibri', buildXyzChildren(resume)),
    canva: buildCanvaDoc(resume),
    executivo: buildExecutivoDoc(resume),
    clean: baseDocument('Georgia', buildCleanChildren(resume)),
    minimal: buildMinimalDoc(resume),
  };
  return Packer.toBlob(docByTemplate[template]);
}

export async function downloadResumeDocx(resume: ResumeData): Promise<void> {
  saveBlob(await buildResumeDocx(resume), fileNameFor(resume, 'docx'));
}
