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

function scoreForLength(len: number, config: EconomyConfig): number {
  if (len >= 5) return config.scoreFiveLetter;
  if (len === 4) return config.scoreFourLetter;
  return config.scoreThreeLetter;
}

/**
 * Finds the longest valid horizontal (left -> right) and/or vertical (top -> bottom)
 * UK English word starting at the tapped tile `coord`.
 * Checks against the full 76,524-word UK English dictionary so any deliberate word
 * the player spots is accepted.
 */
export function findMatchesStartingAt(
  board: readonly (readonly string[])[],
  coord: Coord,
  dict: CompactDictionary,
  minMatchLength: MinMatchLength = 3,
  config: EconomyConfig = DEFAULT_ECONOMY,
): WordMatch[] {
  const { row, col } = coord;
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return [];

  const matches: WordMatch[] = [];

  // 1. Horizontal (left -> right starting at coord)
  const maxHoriz = BOARD_SIZE - col;
  for (let len = maxHoriz; len >= minMatchLength; len--) {
    let word = '';
    const coords: Coord[] = [];
    for (let dc = 0; dc < len; dc++) {
      word += board[row][col + dc];
      coords.push({ row, col: col + dc });
    }
    if (dict.hasWord(word)) {
      matches.push({
        word,
        axis: 'horizontal',
        coords,
        score: scoreForLength(len, config),
      });
      break;
    }
  }

  // 2. Vertical (top -> bottom starting at coord)
  const maxVert = BOARD_SIZE - row;
  for (let len = maxVert; len >= minMatchLength; len--) {
    let word = '';
    const coords: Coord[] = [];
    for (let dr = 0; dr < len; dr++) {
      word += board[row + dr][col];
      coords.push({ row: row + dr, col });
    }
    if (dict.hasWord(word)) {
      matches.push({
        word,
        axis: 'vertical',
        coords,
        score: scoreForLength(len, config),
      });
      break;
    }
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
