import { useEffect, useRef, useState } from 'react';

interface PhotoUploadProps {
  disabled: boolean;
  onPhoto: (photo: { photo: string; photoCircle: string }) => void;
}

type Status = 'idle' | 'working' | 'error';

const SLOW_HINT_SECONDS = 20;
const VERY_SLOW_HINT_SECONDS = 45;

function statusText(status: Status, elapsed: number): { main: string; hint: string | null } {
  if (status === 'idle') {
    return { main: 'JPG ou PNG. A remoção de fundo acontece no seu navegador.', hint: null };
  }
  if (status === 'error') {
    return {
      main: 'Não consegui processar essa imagem. Escolha outra foto ou pule esta etapa.',
      hint: null,
    };
  }
  if (elapsed >= VERY_SLOW_HINT_SECONDS) {
    return {
      main: `Processando há ${elapsed}s — conexão lenta pode atrasar o download do modelo.`,
      hint: 'Demorando demais? Cancele e pule esta etapa; você pode adicionar a foto depois.',
    };
  }
  if (elapsed >= SLOW_HINT_SECONDS) {
    return {
      main: `Removendo o fundo... (${elapsed}s)`,
      hint: 'O primeiro uso baixa o modelo de IA e pode demorar um pouco.',
    };
  }
  return { main: 'Removendo o fundo...', hint: null };
}

export function PhotoUpload({ disabled, onPhoto }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Incremented on cancel/unmount so a late-resolving promise is discarded.
  const runRef = useRef(0);
  const [status, setStatus] = useState<Status>('idle');
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (status !== 'working') return;
    const startedAt = Date.now();
    setElapsed(0);
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [status]);

  useEffect(() => () => { runRef.current += 1; }, []);

  function cancel() {
    runRef.current += 1;
    setStatus('idle');
  }

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatus('error');
      return;
    }

    const run = ++runRef.current;
    setStatus('working');
    try {
      const { processPhotoFile } = await import('../utils/photo');
      const result = await processPhotoFile(file);
      if (runRef.current !== run) return; // canceled or superseded
      setStatus('idle');
      onPhoto(result);
    } catch {
      if (runRef.current !== run) return;
      setStatus('error');
    }
  }

  const working = status === 'working';
  const { main, hint } = statusText(status, elapsed);

  return (
    <div className="photo-upload">
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleChange} />
      <button
        type="button"
        className="photo-upload__btn"
        disabled={disabled || working}
        onClick={() => inputRef.current?.click()}
        aria-describedby="photo-help"
      >
        {status === 'error' ? 'Tentar outra foto' : 'Escolher foto (3x4)'}
      </button>
      {working && (
        <button type="button" className="photo-upload__cancel" onClick={cancel}>
          Cancelar
        </button>
      )}
      <span className="photo-upload__status" data-state={status} role="status" aria-live="polite">
        {working && <span className="photo-upload__spinner" aria-hidden="true" />}
        <span>
          {main}
          {hint && <span className="photo-upload__hint">{hint}</span>}
        </span>
      </span>
      <span id="photo-help" className="sr-only">Foto 3x4 é o formato de documento 3cm por 4cm. O fundo será removido no seu navegador, sem envio ao servidor.</span>
    </div>
  );
}
