import { findLineMatches } from './board';
import { BOARD_SIZE, LETTER_WEIGHTS, VOWELS } from './config';
import type { CompactDictionary } from './dictionary';
import { createPrng, type Prng } from './prng';
import type { MinMatchLength } from './types';

const TOTAL_WEIGHT = LETTER_WEIGHTS.reduce((acc, [, w]) => acc + w, 0);

export function pickWeightedLetter(prng: Prng): string {
  let r = prng.next() * TOTAL_WEIGHT;
  for (const [letter, weight] of LETTER_WEIGHTS) {
    r -= weight;
    if (r <= 0) return letter;
  }
  return 'E';
}

function countVowels(board: readonly (readonly string[])[]): number {
  let count = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (VOWELS.has(board[r][c])) count++;
    }
  }
  return count;
}

function generateRawBoard(prng: Prng): string[][] {
  const board: string[][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row: string[] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      row.push(pickWeightedLetter(prng));
    }
    board.push(row);
  }

  const vowelList = ['A', 'E', 'I', 'O', 'U'];
  const consonantList = ['R', 'T', 'N', 'S', 'L', 'C', 'D', 'P', 'M', 'H'];
  let vowels = countVowels(board);
  while (vowels < 8) {
    const r = prng.nextInt(BOARD_SIZE);
    const c = prng.nextInt(BOARD_SIZE);
    if (!VOWELS.has(board[r][c])) {
      board[r][c] = prng.pick(vowelList);
      vowels++;
    }
  }
  while (vowels > 11) {
    const r = prng.nextInt(BOARD_SIZE);
    const c = prng.nextInt(BOARD_SIZE);
    if (VOWELS.has(board[r][c])) {
      board[r][c] = prng.pick(consonantList);
      vowels--;
    }
  }
  return board;
}

/**
 * Generates a calm starting 5x5 board with healthy vowel density
 * and ZERO pre-existing matches so the board doesn't explode before the player's first move.
 */
export function generateCalmStartingBoard(
  seed: string,
  dict: CompactDictionary,
  minMatchLength: MinMatchLength = 4,
): string[][] {
  const prng = createPrng(`${seed}:start-board`);

  for (let attempt = 0; attempt < 40; attempt++) {
    const candidate = generateRawBoard(prng);
    if (findLineMatches(candidate, dict, minMatchLength).length === 0) {
      return candidate;
    }
  }

  // Fallback: break any remaining match by replacing one letter in each match
  const board = generateRawBoard(prng);
  for (let guard = 0; guard < 10; guard++) {
    const matches = findLineMatches(board, dict, minMatchLength);
    if (matches.length === 0) break;
    for (const m of matches) {
      const target = m.coords[1];
      board[target.row][target.col] = pickWeightedLetter(prng);
    }
  }
  return board;
}

/**
 * Deterministically draws a replacement letter for a cleared tile position,
 * preferring a different letter than the one being replaced.
 */
export function drawReplacementLetter(seed: string, cursor: number, previousLetter: string): string {
  const prng = createPrng(`${seed}:draw:${cursor}`);
  let next = pickWeightedLetter(prng);
  for (let i = 0; i < 4 && next === previousLetter; i++) {
    next = pickWeightedLetter(prng);
  }
  return next;
}
