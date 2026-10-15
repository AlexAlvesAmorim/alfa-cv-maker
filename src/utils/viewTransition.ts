/** Troca de tela com cross-fade nativo; sem suporte vira setState comum. */
export function withViewTransition(update: () => void): void {
  const canTransition =
    typeof document !== 'undefined' &&
    typeof document.startViewTransition === 'function' &&
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: no-preference)').matches === true;
  if (canTransition) {
    document.startViewTransition(update);
  } else {
    update();
  }
}
