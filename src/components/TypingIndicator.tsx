import { Logo } from './Logo';

export function TypingIndicator() {
  return (
    <div className="chat-message chat-message--bot">
      <span className="chat-message__avatar">
        <Logo size={30} />
      </span>
      <div className="chat-message__bubble typing" role="status" aria-label="Assistente digitando">
        <span className="typing__dot" />
        <span className="typing__dot" />
        <span className="typing__dot" />
      </div>
    </div>
  );
}
