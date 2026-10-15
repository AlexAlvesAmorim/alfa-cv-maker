import { useContext, useMemo } from 'react';
import { ThemeContext } from './context';
import { THEMES } from './themes';

export function useTheme() {
  const context = useContext(ThemeContext);
  return useMemo(() => ({ ...context, themes: THEMES }), [context]);
}
