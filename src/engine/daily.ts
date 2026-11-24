import { DEFAULT_ECONOMY } from './config';
import type { CompactDictionary } from './dictionary';
import { createNewGame } from './reducer';
import type { GameState } from './types';

export const MILESTONE_PHASES = [5, 10, 20, 40, 60, 100] as const;

/**
 * Formats a Date into local YYYY-MM-DD without UTC timezone shift.
 */
export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function createDailyGame(dateKey: string, dict: CompactDictionary): GameState {
  return createNewGame({
    seed: `daily-${dateKey}`,
    mode: 'daily',
    difficulty: 'standard',
    dict,
    gameId: `ohshift-daily-${dateKey}`,
  });
}

export function getMilestoneLabel(phasesCleared: number): string | null {
  if ((MILESTONE_PHASES as readonly number[]).includes(phasesCleared)) {
    return `Milestone Reached: ${phasesCleared} Phases Cleared!`;
  }
  return null;
}

/**
 * Generates a spoiler-free shareable summary for a completed Daily 5-Phase Challenge.
 */
export function formatDailyShareSummary(state: GameState): string {
  const dateLabel = state.seed.replace(/^daily-/, '');
  const stars = '★'.repeat(state.stats.directSolves);
  const checks = '■'.repeat(Math.max(0, state.stats.targetsSolved - state.stats.directSolves));

  return [
    `Oh! Shift Daily · ${dateLabel}`,
    `Score: ${state.score} | Phases: ${state.stats.phasesCleared}/${DEFAULT_ECONOMY.dailyPhaseCount} ${stars}${checks}`,
    `Words: ${state.stats.totalWordsFound} | Shifts: ${state.stats.shiftsSpent} | Direct Solves: ${state.stats.directSolves}`,
  ].join('\n');
}
