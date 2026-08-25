import { useState } from 'react';
import { SKIP_VALUE } from '../types';

interface SuggestionChipsProps {
  suggestions: string[];
  extraSuggestions?: string[];
  optional: boolean;
  onPick: (value: string) => void;
}

export function SuggestionChips({ suggestions, extraSuggestions = [], optional, onPick }: SuggestionChipsProps) {
  const [expanded, setExpanded] = useState(false);
  const extrasVisible = expanded ? extraSuggestions : [];

  if (suggestions.length === 0 && extraSuggestions.length === 0 && !optional) return null;

  return (
    <div className="suggestion-chips">
      {suggestions.map((text) => (
        <button key={text} type="button" className="chip" onClick={() => onPick(text)}>
          {text}
        </button>
      ))}
      {!expanded && extraSuggestions.length > 0 && (
        <button
          type="button"
          className="chip chip--more"
          onClick={() => setExpanded(true)}
          aria-label={`Ver mais ${extraSuggestions.length} opções de objetivo`}
        >
          Ver mais {extraSuggestions.length} opções ↓
        </button>
      )}
      {extrasVisible.map((text) => (
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
