import type { DifficultyPreset, EconomyConfig } from './types';

export const SCHEMA_VERSION = 1;
export const BOARD_SIZE = 5;

export const DEFAULT_ECONOMY: EconomyConfig = {
  minWordLength: 3,
  startingShiftTokens: 2,
  maxShiftTokens: 8,
  wordsPerShiftToken: 2,
  longWordBonusLength: 6,
  insightPerWord: 1,
  insightPerLongWord: 2,
  baseMaxGuesses: 6,
  clueCost: 2,
  extraGuessesCost: 2,
  extraGuessesGrant: 2,
  revealPenalty: 25,
  rescuePenalty: 50,
  boardConstructionBonusScore: 50,
  boardConstructionBonusShifts: 1,
  targetBaseScore: 100,
  targetLengthStepScore: 25,
  unusedGuessBonus: 20,
  phaseCompletionBonus: 100,
  phaseTileReplacementsMin: 3,
  phaseTileReplacementsMax: 5,
  minPlayableWordsPerBoard: 25,
  dailyPhaseCount: 5,
};

export interface DifficultySettings {
  startingCluesPerTarget: number;
  startingShiftBonus: number;
  startingInsight: number;
  targetLengthsByPhase: (phase: number) => [number, number, number];
}

export const DIFFICULTY_SETTINGS: Record<DifficultyPreset, DifficultySettings> = {
  relaxed: {
    startingCluesPerTarget: 2,
    startingShiftBonus: 1,
    startingInsight: 2,
    targetLengthsByPhase: (phase) => (phase <= 2 ? [4, 4, 5] : [4, 5, 5]),
  },
  standard: {
    startingCluesPerTarget: 1,
    startingShiftBonus: 0,
    startingInsight: 1,
    targetLengthsByPhase: (phase) => {
      if (phase <= 2) return [4, 5, 5];
      if (phase <= 6) return [4, 5, 6];
      return [5, 6, 6];
    },
  },
  expert: {
    startingCluesPerTarget: 1,
    startingShiftBonus: 0,
    startingInsight: 0,
    targetLengthsByPhase: (phase) => {
      if (phase <= 2) return [4, 5, 6];
      if (phase <= 5) return [5, 6, 6];
      return [5, 6, 7];
    },
  },
};

/**
 * Balanced UK English letter weights tuned for 5x5 Boggle/word-grid density.
 * Ensures ~39% vowels and avoids rare letters clogging the grid.
 */
export const LETTER_WEIGHTS: ReadonlyArray<readonly [string, number]> = [
  ['E', 12],
  ['A', 9],
  ['I', 8],
  ['O', 8],
  ['U', 4],
  ['R', 7],
  ['T', 7],
  ['N', 7],
  ['S', 7],
  ['L', 6],
  ['C', 4],
  ['D', 5],
  ['P', 4],
  ['M', 4],
  ['H', 4],
  ['G', 3],
  ['B', 3],
  ['F', 2],
  ['Y', 3],
  ['W', 2],
  ['K', 2],
  ['V', 1],
  ['X', 1],
  ['Z', 1],
  ['J', 1],
];

export const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);
