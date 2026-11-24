import { findBoardWords } from './board';
import { DEFAULT_ECONOMY } from './config';
import type { CompactDictionary } from './dictionary';
import { evolveBoardForNextPhase } from './generator';
import type { EconomyConfig, GameState } from './types';

/**
 * Counts valid board words not yet found in the current phase.
 */
export function countEligibleBoardWords(
  board: readonly (readonly string[])[],
  foundWords: readonly string[],
  dict: CompactDictionary,
  config: EconomyConfig = DEFAULT_ECONOMY,
): number {
  const foundSet = new Set(foundWords);
  const all = findBoardWords(board, dict, {
    minLength: config.minWordLength,
    maxLength: 8,
  });
  let eligible = 0;
  for (const w of all) {
    if (!foundSet.has(w)) eligible++;
  }
  return eligible;
}

/**
 * Returns true if the player has 0 shift tokens and 0 remaining unfound board words.
 */
export function isBoardDeadlocked(
  state: GameState,
  dict: CompactDictionary,
  config: EconomyConfig = DEFAULT_ECONOMY,
): boolean {
  if (state.shiftTokens > 0) return false;
  return countEligibleBoardWords(state.board, state.foundWords, dict, config) === 0;
}

/**
 * Deterministic rescue refresh: replaces 3-5 tiles, guarantees playable words,
 * grants 1 recovery shift token, and applies a score penalty (floor 0).
 */
export function buildRescueBoard(
  state: GameState,
  dict: CompactDictionary,
  config: EconomyConfig = DEFAULT_ECONOMY,
): { board: string[][]; replacedCount: number } {
  const rescueSeed = `${state.seed}:rescue:${state.phase}:${state.rescueCount + 1}`;
  return evolveBoardForNextPhase(state.board, rescueSeed, state.phase, dict, config);
}
