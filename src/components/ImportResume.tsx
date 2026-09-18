import { useRef, useState } from 'react';
import { extractTextFromFile, parseResumeText, type ImportResult } from '../utils/resumeImport';

interface ImportResumeProps {
  variant: 'chat' | 'match' | 'compare';
  onImported: (result: ImportResult) => void;
}

const LABELS = {
  chat: {
    button: 'Anexar meu currículo atual',
    busy: 'Lendo seu currículo...',
    hint: 'PDF, DOCX ou TXT — tudo processado aqui no seu navegador.',
  },
  match: {
    button: 'Anexar currículo (PDF, DOCX ou TXT)',
    busy: 'Lendo seu currículo...',
    hint: 'Importamos o texto para os campos abaixo — nada sai do seu navegador.',
  },
  compare: {
    button: 'Comparar com meu PDF/DOCX atual',
    busy: 'Lendo arquivo...',
    hint: 'Uma cópia só para comparar — o currículo criado no Maker não muda.',
  },
} as const;

export function ImportResume({ variant, onImported }: ImportResumeProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugText, setDebugText] = useState<string | null>(null);
  const copy = LABELS[variant];

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setDebugText(null);
    try {
      const text = await extractTextFromFile(file);
      setDebugText(text.slice(0, 1500));
      const result = parseResumeText(text);
      if (result.recognized.length === 0) {
        setError('Não consegui reconhecer seções nesse arquivo — tente outro PDF/DOCX ou preencha pelo assistente.');
        return;
      }
      onImported(result);
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Não foi possível ler o arquivo.';
      // Nunca vazar erro técnico (ex.: "Invalid workerSrc") para o usuário final.
      const friendly = /workerSrc|worker|pdf\.worker|triggering event/i.test(raw)
        ? 'Não consegui abrir esse PDF agora — tente um DOCX ou TXT, ou atualize a página e tente de novo.'
        : raw;
      setError(friendly);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`import-resume import-resume--${variant}`}>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,application/pdf,text/plain"
        className="import-resume__input"
        onChange={(event) => void handleChange(event)}
        disabled={busy}
        hidden
        tabIndex={-1}
      />
      <button
        type="button"
        className="import-resume__btn"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? copy.busy : copy.button}
      </button>
      {!busy && <span className="import-resume__hint">{copy.hint}</span>}
      {error && (
        <p className="import-resume__error" role="alert">
          {error}
        </p>
      )}
      {debugText !== null && (
        <details className="import-debug">
          <summary>Ver o texto lido do arquivo (diagnóstico)</summary>
          <pre className="import-debug__text">{debugText}</pre>
        </details>
      )}
    </div>
  );
}
