interface ChatInputProps {
  value: string;
  placeholder: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
}

export function ChatInput({ value, placeholder, disabled, onChange, onSend }: ChatInputProps) {
  return (
    <form
      className="chat-input"
      onSubmit={(event) => {
        event.preventDefault();
        onSend();
      }}
    >
      <input
        className="chat-input__field"
        type="text"
        value={value}
        placeholder={disabled ? 'Aguarde...' : placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Sua resposta"
      />
      <button className="chat-input__send" type="submit" disabled={disabled || value.trim() === ''} aria-label="Enviar">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
        </svg>
      </button>
    </form>
  );
}
