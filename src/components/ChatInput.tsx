import { useRef, type KeyboardEvent } from 'react';
import { ArrowLeft, CornerDownLeft, SendHorizontal } from 'lucide-react';

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
        <ArrowLeft size={18} />
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
        aria-describedby="chat-input-hint"
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
        <CornerDownLeft size={18} aria-hidden="true" />
      </button>
      <button
        className="chat-input__send"
        type="submit"
        disabled={disabled || value.trim() === ''}
        aria-label="Enviar"
        title="Enviar (Enter)"
      >
        <SendHorizontal size={20} aria-hidden="true" />
      </button>
      <span id="chat-input-hint" className="sr-only">
        Enter envia a resposta. Shift mais Enter adiciona uma nova linha.
      </span>
    </form>
  );
}
