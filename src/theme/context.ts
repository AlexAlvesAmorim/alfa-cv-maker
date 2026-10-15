import { createContext } from 'react';
import { DEFAULT_THEME, type ThemeId } from './themes';

export interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

/** Valor padrão seguro: telas/testes sem provider renderizam no tema original. */
export const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
});
