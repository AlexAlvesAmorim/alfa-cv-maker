import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  isThemeId,
  migrateThemeId,
  themeMeta,
  type ThemeId,
} from './themes';
import { ThemeContext } from './context';

function readStoredTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    // Migra valores antigos (ocean→noturno, forest/system→blood).
    const migrated = migrateThemeId(stored);
    if (migrated) return migrated;
  } catch {
    // Navegador sem localStorage (privado/restrito): segue no padrão.
  }
  return DEFAULT_THEME;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(readStoredTheme);
  const firstApply = useRef(true);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = themeMeta(theme).dark ? 'dark' : 'light';
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', themeMeta(theme).swatch[0]);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignora: tema aplica na sessão mesmo sem persistência.
    }

    // Transição suave só na troca (não no primeiro paint), fora do reduced-motion.
    if (firstApply.current) {
      firstApply.current = false;
      return;
    }
    if (window.matchMedia?.('(prefers-reduced-motion: no-preference)').matches) {
      document.documentElement.classList.add('theming');
      const timer = window.setTimeout(() => {
        document.documentElement.classList.remove('theming');
      }, 350);
      return () => window.clearTimeout(timer);
    }
  }, [theme]);

  // Sincroniza abas: trocou numa, troca nas outras.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== THEME_STORAGE_KEY) return;
      const migrated = migrateThemeId(event.newValue);
      if (migrated) setThemeState(migrated);
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setTheme = useCallback((next: ThemeId) => {
    if (isThemeId(next)) setThemeState(next);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
