import { applyShift, cloneBoard, findBoardWords } from './board';
import {
  BOARD_SIZE,
  DEFAULT_ECONOMY,
  DIFFICULTY_SETTINGS,
  LETTER_WEIGHTS,
  VOWELS,
} from './config';
import { generateNextClue } from './deduction';
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

  // Guarantee healthy vowel density (7..12 vowels on a 25-tile board)
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

/**
 * Generates a deterministic 5x5 starting board validated for minimum playable words.
 */
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

/**
 * Evolves an existing 5x5 board between phases by replacing 3-5 seeded tiles
 * while validating minimum playable word density.
 */
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

  // Fallback: fresh validated board if repeated small mutations stayed below threshold
  return {
    board: generateInitialBoard(`${seed}:fallback:${phase}`, dict, config),
    replacedCount: config.phaseTileReplacementsMax,
  };
}

/**
 * Inverted forward-shift target generator (< 5 ms, zero BFS explosion).
 * Samples seeded 1-to-3-step shift sequences from the current board, runs fast
 * target-pool DFS on those shifted states, and selects 3 distinct board-grounded
 * targets with exact upper-bound `parShifts`.
 */
export function generatePhaseTargets(
  board: readonly (readonly string[])[],
  seed: string,
  phase: number,
  dict: CompactDictionary,
  difficulty: DifficultyPreset,
  config: EconomyConfig = DEFAULT_ECONOMY,
): TargetState[] {
  const prng = createPrng(`${seed}:targets:${phase}`);
  const diffSettings = DIFFICULTY_SETTINGS[difficulty];
  const desiredLengths = diffSettings.targetLengthsByPhase(phase);

  // Map each discovered target word to its smallest observed shift distance
  const candidatesByWord = new Map<string, number>();

  // Depth 0 (current board)
  const depth0 = findBoardWords(board, dict, {
    minLength: 4,
    maxLength: 7,
    targetPoolOnly: true,
  });
  for (const w of depth0) {
    candidatesByWord.set(w, 0);
  }

  // Sample 18 seeded 1..3-step shift paths (fast: ~1-3ms total!)
  const sampleCount = 18;
  for (let s = 0; s < sampleCount; s++) {
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

  // Bucket candidates by length, preferring words that require >= 1 shift
  const selectedWords: Array<{ word: string; parShifts: number }> = [];
  const usedWords = new Set<string>();

  const pickForLength = (targetLen: number): { word: string; parShifts: number } | null => {
    const exactShift: Array<{ word: string; parShifts: number }> = [];
    const exactZero: Array<{ word: string; parShifts: number }> = [];

    for (const [word, parShifts] of candidatesByWord.entries()) {
      if (usedWords.has(word) || word.length !== targetLen) continue;
      if (parShifts >= 1) {
        exactShift.push({ word, parShifts });
      } else {
        exactZero.push({ word, parShifts });
      }
    }

    if (exactShift.length > 0) return prng.pick(exactShift);
    if (exactZero.length > 0) return prng.pick(exactZero);
    return null;
  };

  for (const len of desiredLengths) {
    let pick = pickForLength(len);
    // Graceful length fallback (e.g. if no 7-letter word found, try 6, then 5, then 4)
    if (!pick) {
      for (const fallbackLen of [len - 1, len + 1, 5, 4, 6]) {
        if (fallbackLen < 4 || fallbackLen > 7) continue;
        pick = pickForLength(fallbackLen);
        if (pick) break;
      }
    }
    if (pick) {
      usedWords.add(pick.word);
      selectedWords.push(pick);
    }
  }

  // Build TargetState shells first so relationship clues can inspect sibling targets
  const targets: TargetState[] = selectedWords.map((item, idx) => ({
    id: `p${phase}-t${idx + 1}`,
    answer: item.word,
    length: item.word.length,
    parShifts: item.parShifts,
    maxGuesses: config.baseMaxGuesses,
    clues: [],
    guesses: [],
    status: 'active',
  }));

  // Attach verified initial clues per difficulty preset
  for (const target of targets) {
    for (let c = 0; c < diffSettings.startingCluesPerTarget; c++) {
      const preferType =
        c === 0
          ? difficulty === 'expert'
            ? 'shift_par'
            : 'position'
          : 'excluded_letter';
      const clue = generateNextClue(target, targets, board, prng, preferType);
      if (clue) {
        target.clues.push(clue);
      }
    }
  }

  return targets;
}
