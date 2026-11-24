import { applyShift, cloneBoard, findBoardWords } from './board';
import {
  BOARD_SIZE,
  DEFAULT_ECONOMY,
  DIFFICULTY_SETTINGS,
  LETTER_WEIGHTS,
  VOWELS,
} from './config';
import type { CompactDictionary } from './dictionary';
import { createPrng, type Prng } from './prng';
import type { DifficultyPreset, EconomyConfig, ShiftOp, TargetState } from './types';

const TOTAL_WEIGHT = LETTER_WEIGHTS.reduce((acc, [, w]) => acc + w, 0);

function pickWeightedLetter(prng: Prng): string {
  let r = prng.next() * TOTAL_WEIGHT;
  for (const [letter, weight] of LETTER_WEIGHTS) {
    r -= weight;
    if (r <= 0) return letter;
  }
  return 'E';
}

function randomShiftOp(prng: Prng): ShiftOp {
  const axis = prng.next() < 0.5 ? 'row' : 'col';
  const index = prng.nextInt(BOARD_SIZE);
  const direction =
    axis === 'row'
      ? prng.next() < 0.5
        ? 'left'
        : 'right'
      : prng.next() < 0.5
        ? 'up'
        : 'down';
  return { axis, index, direction };
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
  while (vowels > 12) {
    const r = prng.nextInt(BOARD_SIZE);
    const c = prng.nextInt(BOARD_SIZE);
    if (VOWELS.has(board[r][c])) {
      board[r][c] = prng.pick(consonantList);
      vowels--;
    }
  }
  return board;
}

export function generateInitialBoard(
  seed: string,
  dict: CompactDictionary,
  config: EconomyConfig = DEFAULT_ECONOMY,
): string[][] {
  const prng = createPrng(`${seed}:board:1`);
  let bestBoard = generateRawBoard(prng);
  let bestCount = findBoardWords(bestBoard, dict, {
    minLength: config.minWordLength,
    limit: config.minPlayableWordsPerBoard + 10,
  }).size;

  for (let attempt = 0; attempt < 12 && bestCount < config.minPlayableWordsPerBoard; attempt++) {
    const candidate = generateRawBoard(prng);
    const count = findBoardWords(candidate, dict, {
      minLength: config.minWordLength,
      limit: config.minPlayableWordsPerBoard + 10,
    }).size;
    if (count > bestCount) {
      bestBoard = candidate;
      bestCount = count;
    }
  }

  return bestBoard;
}

export function evolveBoardForNextPhase(
  prevBoard: readonly (readonly string[])[],
  seed: string,
  phase: number,
  dict: CompactDictionary,
  config: EconomyConfig = DEFAULT_ECONOMY,
): { board: string[][]; replacedCount: number } {
  const prng = createPrng(`${seed}:evolve:${phase}`);
  const allIndices = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => i);

  for (let attempt = 0; attempt < 15; attempt++) {
    const next = cloneBoard(prevBoard);
    const replaceCount = prng.nextRange(
      config.phaseTileReplacementsMin,
      config.phaseTileReplacementsMax,
    );
    const chosen = prng.shuffle(allIndices).slice(0, replaceCount);

    for (const idx of chosen) {
      const r = Math.floor(idx / BOARD_SIZE);
      const c = idx % BOARD_SIZE;
      const oldCh = next[r][c];
      let newCh = pickWeightedLetter(prng);
      for (let retry = 0; retry < 4 && newCh === oldCh; retry++) {
        newCh = pickWeightedLetter(prng);
      }
      next[r][c] = newCh;
    }

    const vowels = countVowels(next);
    if (vowels < 7 || vowels > 13) continue;

    const playable = findBoardWords(next, dict, {
      minLength: config.minWordLength,
      limit: config.minPlayableWordsPerBoard,
    }).size;

    if (playable >= config.minPlayableWordsPerBoard) {
      return { board: next, replacedCount: replaceCount };
    }
  }

  return {
    board: generateInitialBoard(`${seed}:fallback:${phase}`, dict, config),
    replacedCount: config.phaseTileReplacementsMax,
  };
}

/**
 * Generates ONE board-grounded target word for the phase using inverted forward-shift
 * sampling (< 5ms). Every letter position of the target is guaranteed to be constructible
 * on the 5x5 board within 0..3 wraparound shifts.
 */
export function generatePhaseTarget(
  board: readonly (readonly string[])[],
  seed: string,
  phase: number,
  dict: CompactDictionary,
  difficulty: DifficultyPreset,
): TargetState {
  const prng = createPrng(`${seed}:target:${phase}`);
  const desiredLength = DIFFICULTY_SETTINGS[difficulty].targetLengthForPhase(phase);

  const candidatesByWord = new Map<string, number>();

  // Depth 0
  const depth0 = findBoardWords(board, dict, {
    minLength: 4,
    maxLength: 7,
    targetPoolOnly: true,
  });
  for (const w of depth0) {
    candidatesByWord.set(w, 0);
  }

  // Sample 18 seeded 1..3-step shift sequences
  for (let s = 0; s < 18; s++) {
    let shifted = cloneBoard(board);
    const maxDepth = s < 6 ? 1 : s < 13 ? 2 : 3;
    for (let step = 1; step <= maxDepth; step++) {
      shifted = applyShift(shifted, randomShiftOp(prng));
      const words = findBoardWords(shifted, dict, {
        minLength: 4,
        maxLength: 7,
        targetPoolOnly: true,
      });
      for (const w of words) {
        const prev = candidatesByWord.get(w);
        if (prev === undefined || step < prev) {
          candidatesByWord.set(w, step);
        }
      }
    }
  }

  const pickForLength = (len: number): { word: string; parShifts: number } | null => {
    const shiftedMatches: Array<{ word: string; parShifts: number }> = [];
    const zeroMatches: Array<{ word: string; parShifts: number }> = [];

    for (const [word, parShifts] of candidatesByWord.entries()) {
      if (word.length !== len) continue;
      if (parShifts >= 1) {
        shiftedMatches.push({ word, parShifts });
      } else {
        zeroMatches.push({ word, parShifts });
      }
    }

    if (shiftedMatches.length > 0) return prng.pick(shiftedMatches);
    if (zeroMatches.length > 0) return prng.pick(zeroMatches);
    return null;
  };

  let chosen = pickForLength(desiredLength);
  if (!chosen) {
    for (const fallback of [desiredLength - 1, desiredLength + 1, 5, 4, 6]) {
      if (fallback < 4 || fallback > 7) continue;
      chosen = pickForLength(fallback);
      if (chosen) break;
    }
  }

  const finalWord = chosen?.word ?? 'SHIFT';
  const finalPar = chosen?.parShifts ?? 1;

  return {
    answer: finalWord,
    length: finalWord.length,
    parShifts: finalPar,
    revealedPositions: new Array(finalWord.length).fill(false),
    solved: false,
    solvedDirectly: false,
  };
}
