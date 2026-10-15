import { afterEach, describe, expect, it, vi } from 'vitest';
import { withViewTransition } from './utils/viewTransition';

const originalMatchMedia = window.matchMedia;
const docRecord = document as unknown as Record<string, unknown>;
const originalStartViewTransition = docRecord.startViewTransition;

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches }) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  if (originalStartViewTransition === undefined) {
    delete docRecord.startViewTransition;
  } else {
    docRecord.startViewTransition = originalStartViewTransition;
  }
  vi.restoreAllMocks();
});

describe('withViewTransition', () => {
  it('executa direto sem a API', () => {
    const update = vi.fn();
    withViewTransition(update);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('delega para a API quando há suporte e sem reduced-motion', () => {
    mockMatchMedia(true);
    const starter = vi.fn((update: () => void) => {
      update();
    });
    docRecord.startViewTransition = starter;
    const update = vi.fn();
    withViewTransition(update);
    expect(starter).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('pula a API com reduced-motion', () => {
    mockMatchMedia(false);
    const starter = vi.fn((update: () => void) => {
      update();
    });
    docRecord.startViewTransition = starter;
    const update = vi.fn();
    withViewTransition(update);
    expect(starter).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
  });
});
