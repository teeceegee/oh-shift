import type { DifficultyPreset, EconomyConfig } from './types';

export const SCHEMA_VERSION = 2;
export const BOARD_SIZE = 5;

export const DEFAULT_ECONOMY: EconomyConfig = {
  minWordLength: 3,
  startingShiftTokens: 3,
  maxShiftTokens: 8,
  wordsPerShiftToken: 2,
  longWordBonusLength: 6,
  rescuePenalty: 50,
  targetBaseScore: 100,
  targetLengthStepScore: 25,
  directSolveBonusScore: 75,
  directSolveBonusShifts: 1,
  efficiencyWordPar: 8,
  efficiencyBonusPerWord: 15,
  phaseCompletionBonus: 100,
  phaseTileReplacementsMin: 3,
  phaseTileReplacementsMax: 5,
  minPlayableWordsPerBoard: 25,
  dailyPhaseCount: 5,
};

export interface DifficultySettings {
  startingShiftBonus: number;
  targetLengthForPhase: (phase: number) => number;
}

export const DIFFICULTY_SETTINGS: Record<DifficultyPreset, DifficultySettings> = {
  relaxed: {
    startingShiftBonus: 1,
    targetLengthForPhase: (phase) => (phase <= 3 ? 4 : 5),
  },
  standard: {
    startingShiftBonus: 0,
    targetLengthForPhase: (phase) => {
      if (phase <= 2) return 4;
      if (phase <= 5) return 5;
      return 6;
    },
  },
  expert: {
    startingShiftBonus: 0,
    targetLengthForPhase: (phase) => {
      if (phase <= 2) return 5;
      if (phase <= 5) return 6;
      return 7;
    },
  },
};

/**
 * Balanced UK English letter weights tuned for 5x5 word-grid density.
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
