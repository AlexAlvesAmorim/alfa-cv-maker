import { jsPDF } from 'jspdf';
import type { ResumeData } from '../types';
import { orderedContactParts } from './resumeContent';

export function buildCoverLetterPdf(resume: ResumeData): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const marginX = 22;
  const contentW = 210 - marginX * 2;
  let y = 26;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(34, 20, 22);
  doc.text(resume.fullName || 'Nome não informado', marginX, y);
  y += 5.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(110, 95, 97);
  for (const part of orderedContactParts(resume.contact)) {
    doc.text(part, marginX, y);
    y += 4.4;
  }

  y += 4;
  doc.setDrawColor(179, 18, 31);
  doc.setLineWidth(0.8);
  doc.line(marginX, y, marginX + contentW, y);
  y += 12;

  doc.setFontSize(10);
  doc.setTextColor(55, 45, 47);
  doc.text(new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }), marginX, y);
  y += 10;

  doc.text('À equipe de Recrutamento,', marginX, y);
  y += 8;

  const role = resume.targetRole || 'a oportunidade';
  const intro = `Meu nome é ${resume.fullName || '(seu nome)'} e escrevo para demonstrar meu interesse em ${role}. `;
  const summaryBody = resume.summary.trim()
    ? `${resume.summary.trim()} `
    : '';
  const experienceBody =
    resume.experiences.length > 0
      ? `Entre minhas experiências recentes, destaco: ${resume.experiences
          .slice(0, 2)
          .map((experience) => experience.achievement || experience.role)
          .filter(Boolean)
          .join('; ')}. `
      : 'Estou em busca da primeira oportunidade formal, e trago disposição, disciplina e vontade de aprender. ';
  const closing = 'Coloco-me à disposição para uma conversa e agradeço a atenção dedicada à minha candidatura.';

  const body = doc.splitTextToSize(`${intro}${summaryBody}${experienceBody}${closing}`, contentW) as string[];
  const lineHeight = 5.2;
  for (const line of body) {
    if (y > 262) {
      doc.addPage();
      y = 26;
    }
    doc.text(line, marginX, y, { maxWidth: contentW, align: 'justify' });
    y += lineHeight;
  }

  y += 14;
  if (y > 270) {
    doc.addPage();
    y = 26;
  }
  doc.text('Atenciosamente,', marginX, y);
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.text(resume.fullName || '', marginX, y);

  return new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
}
