import { useRef, useState } from 'react';

interface PhotoUploadProps {
  disabled: boolean;
  onPhoto: (photo: { photo: string; photoCircle: string }) => void;
}

type Status = 'idle' | 'working' | 'error';

const STATUS_TEXT: Record<Status, string> = {
  idle: 'JPG ou PNG. A remoção de fundo acontece no seu navegador.',
  working: 'Removendo o fundo... o primeiro uso baixa o modelo de IA e pode demorar.',
  error: 'Não consegui processar essa imagem. Tente outra foto.',
};

export function PhotoUpload({ disabled, onPhoto }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>('idle');

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus('working');
    try {
      const { processPhotoFile } = await import('../utils/photo');
      const result = await processPhotoFile(file);
      setStatus('idle');
      onPhoto(result);
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="photo-upload">
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleChange} />
      <button
        type="button"
        className="photo-upload__btn"
        disabled={disabled || status === 'working'}
        onClick={() => inputRef.current?.click()}
      >
        Escolher foto (3x4)
      </button>
      <span className="photo-upload__status" data-state={status}>
        {STATUS_TEXT[status]}
      </span>
    </div>
  );
}
