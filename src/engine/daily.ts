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
 * Never includes hidden target answers.
 */
export function formatDailyShareSummary(state: GameState): string {
  const dateLabel = state.seed.replace(/^daily-/, '');
  const totalSolved = state.stats.targetsSolvedByGuess + state.stats.targetsSolvedOnBoard;
  const totalTargets = totalSolved + state.stats.targetsRevealed;
  const boardStars = '★'.repeat(Math.min(15, state.stats.targetsSolvedOnBoard));
  const guessChecks = '■'.repeat(Math.min(15, state.stats.targetsSolvedByGuess));
  const revealedDots = '·'.repeat(Math.min(15, state.stats.targetsRevealed));

  return [
    `Oh! Shift Daily · ${dateLabel}`,
    `Score: ${state.score} | Phases: ${state.stats.phasesCleared}/${DEFAULT_ECONOMY.dailyPhaseCount}`,
    `Targets: ${totalSolved}/${totalTargets} ${boardStars}${guessChecks}${revealedDots}`,
    `Words: ${state.stats.totalWordsFound} | Shifts: ${state.stats.shiftsSpent} | Board Bonuses: ${state.stats.targetsSolvedOnBoard}`,
  ].join('\n');
}
