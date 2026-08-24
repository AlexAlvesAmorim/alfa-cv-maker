import { SKIP_VALUE } from '../types';

interface SuggestionChipsProps {
  suggestions: string[];
  optional: boolean;
  onPick: (value: string) => void;
}

export function SuggestionChips({ suggestions, optional, onPick }: SuggestionChipsProps) {
  if (suggestions.length === 0 && !optional) return null;

  return (
    <div className="suggestion-chips">
      {suggestions.map((text) => (
        <button key={text} type="button" className="chip" onClick={() => onPick(text)}>
          {text}
        </button>
      ))}
      {optional && (
        <button type="button" className="chip chip--skip" onClick={() => onPick(SKIP_VALUE)}>
          Pular esta etapa
        </button>
      )}
    </div>
  );
}
