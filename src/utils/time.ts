let debugNowMs: number | null = null;

export const nowMs = (): number => debugNowMs ?? Date.now();

export const advanceDebugNowMs = (deltaMs: number): number => {
  debugNowMs = (debugNowMs ?? Date.now()) + Math.max(0, Math.floor(deltaMs));
  return debugNowMs;
};

export const resetDebugNowMs = (): void => {
  debugNowMs = null;
};

export const formatSeconds = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
