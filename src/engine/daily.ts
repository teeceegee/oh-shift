import { DEFAULT_ECONOMY } from './config';
import type { CompactDictionary } from './dictionary';
import { createNewGame } from './reducer';
import type { GameState, MinMatchLength } from './types';

export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function createDailyGame(
  dateKey: string,
  dict: CompactDictionary,
  minMatchLength: MinMatchLength = 4,
): GameState {
  return createNewGame({
    seed: `daily-${dateKey}`,
    mode: 'daily',
    minMatchLength,
    dict,
    gameId: `ohshift-daily-${dateKey}`,
  });
}

export function formatDailyShareSummary(state: GameState): string {
  const dateLabel = state.seed.replace(/^daily-/, '');
  return [
    `Oh! Shift Daily · ${dateLabel}`,
    `Score: ${state.score} in ${state.shiftsMade}/${DEFAULT_ECONOMY.dailyShiftLimit} shifts`,
    `Words: ${state.stats.totalWordsFound} (${state.stats.fiveLetterWords} five-letter · Best Combo: ${state.stats.bestCombo}×)`,
  ].join('\n');
}
