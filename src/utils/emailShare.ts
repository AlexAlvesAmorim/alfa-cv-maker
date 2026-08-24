import type { ResumeData } from '../types';
import { fileNameFor } from './resumeContent';

export type EmailResult = 'shared' | 'mailto';

export async function sendResumeByEmail(resume: ResumeData): Promise<EmailResult> {
  const { buildResumePdf, downloadResumePdf } = await import('./pdfExport');
  const pdfBlob = buildResumePdf(resume);
  const pdfFile = new File([pdfBlob], fileNameFor(resume, 'pdf'), { type: 'application/pdf' });

  const canShareFiles =
    typeof navigator !== 'undefined' &&
    'canShare' in navigator &&
    'share' in navigator &&
    navigator.canShare({ files: [pdfFile] });

  if (canShareFiles) {
    await navigator.share({
      files: [pdfFile],
      title: `Currículo - ${resume.fullName}`,
      text: 'Segue meu currículo em anexo.',
    });
    return 'shared';
  }

  downloadResumePdf(resume);

  const subject = encodeURIComponent(
    `Currículo - ${resume.fullName}${resume.targetRole ? ` - ${resume.targetRole}` : ''}`,
  );
  const body = encodeURIComponent(
    [
      'Olá,',
      '',
      `Segue em anexo o meu currículo${resume.targetRole ? ` para a vaga de ${resume.targetRole}` : ''}.`,
      '',
      'Dados rápidos:',
      `- Nome: ${resume.fullName}`,
      `- Contato: ${resume.contact}`,
      '',
      '(O PDF já foi baixado — basta anexar neste e-mail.)',
    ].join('\n'),
  );
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
  return 'mailto';
}
