import type { EconomyConfig } from './types';

export const SCHEMA_VERSION = 4;
export const BOARD_SIZE = 5;

export const DEFAULT_ECONOMY: EconomyConfig = {
  scoreThreeLetter: 10,
  scoreFourLetter: 25,
  scoreFiveLetter: 50,
  crossWordBonus: 25,
  dailyShiftLimit: 25,
};

/**
 * Balanced UK English letter weights tuned for 5x5 horizontal/vertical word building.
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
