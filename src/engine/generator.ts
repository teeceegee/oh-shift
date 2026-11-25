import { BOARD_SIZE, LETTER_WEIGHTS, VOWELS } from './config';
import { createPrng, type Prng } from './prng';

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

/**
 * Generates a balanced 5x5 starting board with healthy vowel density (8..11 vowels).
 */
export function generateStartingBoard(seed: string): string[][] {
  const prng = createPrng(`${seed}:start-board`);
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
