import type { DebugLog } from '../types/game';

export const appendLog = (
  logs: DebugLog[],
  entry: DebugLog,
  maxLogs: number
): DebugLog[] => {
  const next = [...logs, entry];
  return next.slice(Math.max(0, next.length - maxLogs));
};
