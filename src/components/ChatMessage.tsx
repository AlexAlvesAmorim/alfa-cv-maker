import { memo } from 'react';
import type { Message } from '../types';
import { Logo } from './Logo';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = memo(function ChatMessage({ message }: ChatMessageProps) {
  const isBot = message.from === 'bot';

  return (
    <div className={`chat-message ${isBot ? 'chat-message--bot' : 'chat-message--user'}`}>
      {isBot && (
        <span className="chat-message__avatar">
          <Logo size={30} />
        </span>
      )}
      <div className="chat-message__bubble">
        {message.text.split('\n').map((line, index) => (
          <p key={index}>{line || '\u00A0'}</p>
        ))}
      </div>
    </div>
  );
});
