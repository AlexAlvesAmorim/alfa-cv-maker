import { useEffect, useState } from 'react';
import type { ResumeData } from '../types';

/** Prévia ao vivo do PDF (debounce + import dinâmico; falha silenciosa). */
export function useLivePreview(resume: ResumeData, stepIndex: number, finished: boolean) {
  const [livePreviewUrl, setLivePreviewUrl] = useState<string | null>(null);

  // Preview ao vivo após passo 4 (quando já tem nome+objetivo+resumo) — sticky
  useEffect(() => {
    const hasContent = resume.fullName.trim() !== '' || resume.targetRole.trim() !== '' || resume.summary.trim() !== '';
    const shouldPreview = !finished && stepIndex >= 3 && hasContent;
    if (!shouldPreview) {
      if (livePreviewUrl) {
        URL.revokeObjectURL(livePreviewUrl);
        setLivePreviewUrl(null);
      }
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const { buildResumePdf } = await import('../utils/pdfExport');
        const blob = buildResumePdf(resume);
        const url = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        setLivePreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch {
        // preview é secundário — falha silenciosa
      }
    }, 600);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume, stepIndex, finished]);

  useEffect(() => {
    return () => {
      if (livePreviewUrl) URL.revokeObjectURL(livePreviewUrl);
    };
  }, [livePreviewUrl]);

  return livePreviewUrl;
}
