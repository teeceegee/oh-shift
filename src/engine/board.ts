import { BOARD_SIZE, DEFAULT_ECONOMY } from './config';
import type { CompactDictionary } from './dictionary';
import type { Coord, EconomyConfig, MinMatchLength, ShiftOp, WordMatch } from './types';

export function cloneBoard(board: readonly (readonly string[])[]): string[][] {
  return board.map((row) => row.slice());
}

/**
 * Applies a single-step cyclic wraparound shift to a row or column.
 * Example: [S, T, A, R, E] shifted right -> [E, S, T, A, R].
 */
export function applyShift(board: readonly (readonly string[])[], op: ShiftOp): string[][] {
  if (op.index < 0 || op.index >= BOARD_SIZE) {
    throw new Error(`Shift index out of bounds: ${op.index}`);
  }
  const next = cloneBoard(board);

  if (op.axis === 'row') {
    const row = next[op.index];
    if (op.direction === 'right') {
      const last = row[BOARD_SIZE - 1];
      for (let c = BOARD_SIZE - 1; c > 0; c--) row[c] = row[c - 1];
      row[0] = last;
    } else if (op.direction === 'left') {
      const first = row[0];
      for (let c = 0; c < BOARD_SIZE - 1; c++) row[c] = row[c + 1];
      row[BOARD_SIZE - 1] = first;
    } else {
      throw new Error(`Invalid direction '${op.direction}' for row shift`);
    }
  } else {
    const col = op.index;
    if (op.direction === 'down') {
      const last = next[BOARD_SIZE - 1][col];
      for (let r = BOARD_SIZE - 1; r > 0; r--) next[r][col] = next[r - 1][col];
      next[0][col] = last;
    } else if (op.direction === 'up') {
      const first = next[0][col];
      for (let r = 0; r < BOARD_SIZE - 1; r++) next[r][col] = next[r + 1][col];
      next[BOARD_SIZE - 1][col] = first;
    } else {
      throw new Error(`Invalid direction '${op.direction}' for col shift`);
    }
  }

  return next;
}

export function invertShift(op: ShiftOp): ShiftOp {
  const inverseMap: Record<ShiftOp['direction'], ShiftOp['direction']> = {
    left: 'right',
    right: 'left',
    up: 'down',
    down: 'up',
  };
  return {
    axis: op.axis,
    index: op.index,
    direction: inverseMap[op.direction],
  };
}

/**
 * Automatically spots all horizontal (left -> right) and vertical (top -> bottom)
 * common UK English words of length 5 (checked first) or 4 (if minMatchLength === 4).
 * Uses the curated common UK word list (targetWords) so every auto-spotted word
 * is immediately recognisable and never obscure jargon.
 */
export function findLineMatches(
  board: readonly (readonly string[])[],
  dict: CompactDictionary,
  minMatchLength: MinMatchLength = 4,
  config: EconomyConfig = DEFAULT_ECONOMY,
): WordMatch[] {
  const matches: WordMatch[] = [];

  const scanLine = (letters: string[], coords: Coord[], axis: 'horizontal' | 'vertical') => {
    const full = letters.join('');
    // 1. Check full 5-letter word first (takes priority over 4-letter subwords on the same line)
    if (dict.isTargetWord(full)) {
      matches.push({
        word: full,
        axis,
        coords,
        score: config.scoreFiveLetter,
      });
      return;
    }

    // 2. If 4-letter matching is enabled, check [0..3] and [1..4]
    if (minMatchLength <= 4) {
      const left4 = full.slice(0, 4);
      const right4 = full.slice(1, 5);
      if (dict.isTargetWord(left4)) {
        matches.push({
          word: left4,
          axis,
          coords: coords.slice(0, 4),
          score: config.scoreFourLetter,
        });
      } else if (dict.isTargetWord(right4)) {
        matches.push({
          word: right4,
          axis,
          coords: coords.slice(1, 5),
          score: config.scoreFourLetter,
        });
      }
    }
  };

  // Horizontal rows (left -> right)
  for (let r = 0; r < BOARD_SIZE; r++) {
    const letters = board[r].slice();
    const coords = [0, 1, 2, 3, 4].map((c) => ({ row: r, col: c }));
    scanLine(letters, coords, 'horizontal');
  }

  // Vertical columns (top -> bottom)
  for (let c = 0; c < BOARD_SIZE; c++) {
    const letters = [0, 1, 2, 3, 4].map((r) => board[r][c]);
    const coords = [0, 1, 2, 3, 4].map((r) => ({ row: r, col: c }));
    scanLine(letters, coords, 'vertical');
  }

  return matches;
}

export function collectUniqueCoords(matches: readonly WordMatch[]): Coord[] {
  const seen = new Set<number>();
  const coords: Coord[] = [];
  for (const m of matches) {
    for (const c of m.coords) {
      const key = c.row * BOARD_SIZE + c.col;
      if (!seen.has(key)) {
        seen.add(key);
        coords.push(c);
      }
    }
  }
  return coords;
}
