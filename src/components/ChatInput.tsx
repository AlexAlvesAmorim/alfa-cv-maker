import { useRef, type KeyboardEvent } from 'react';

interface ChatInputProps {
  value: string;
  placeholder: string;
  disabled: boolean;
  canGoBack: boolean;
  onBack: () => void;
  onChange: (value: string) => void;
  onSend: () => void;
}

export function ChatInput({ value, placeholder, disabled, canGoBack, onBack, onChange, onSend }: ChatInputProps) {
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  }

  function insertNewline() {
    const el = fieldRef.current;
    onChange(`${value}\n`);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.selectionStart = el.selectionEnd = el.value.length;
    });
  }

  return (
    <form
      className="chat-input"
      onSubmit={(event) => {
        event.preventDefault();
        onSend();
      }}
    >
      <button
        className="chat-input__back"
        type="button"
        onClick={onBack}
        disabled={!canGoBack}
        aria-label="Voltar etapa anterior"
        title="Voltar etapa"
      >
        ←
      </button>
      <textarea
        ref={fieldRef}
        className="chat-input__field"
        rows={2}
        value={value}
        placeholder={disabled ? 'Processando sua resposta...' : placeholder}
        disabled={disabled}
        aria-label="Sua resposta"
        aria-multiline="true"
        title="Enter envia · Shift+Enter adiciona nova linha"
        onChange={(event) => {
          onChange(event.target.value);
          const el = event.target;
          el.style.height = 'auto';
          el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
        }}
        onKeyDown={handleKeyDown}
      />
      <button
        className="chat-input__newline"
        type="button"
        onClick={insertNewline}
        disabled={disabled}
        aria-label="Adicionar nova linha"
        title="Nova linha"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 10 4 15l5 5" />
          <path d="M4 15h9a7 7 0 0 1 0 14h-2" />
        </svg>
      </button>
      <button
        className="chat-input__send"
        type="submit"
        disabled={disabled || value.trim() === ''}
        aria-label="Enviar"
        title="Enviar (Enter)"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
        </svg>
      </button>
    </form>
  );
}
