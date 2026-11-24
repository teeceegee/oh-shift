import { BOARD_SIZE } from './config';
import type { CompactDictionary } from './dictionary';
import type { Coord, ShiftOp } from './types';

const NEIGHBOR_DELTAS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

export function cloneBoard(board: readonly (readonly string[])[]): string[][] {
  return board.map((row) => row.slice());
}

export function isInBounds(coord: Coord): boolean {
  return coord.row >= 0 && coord.row < BOARD_SIZE && coord.col >= 0 && coord.col < BOARD_SIZE;
}

export function areAdjacent(a: Coord, b: Coord): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return (dr <= 1 && dc <= 1) && (dr !== 0 || dc !== 0);
}

export interface PathValidationResult {
  valid: boolean;
  word: string;
  reason?: string;
}

export function validatePath(board: readonly (readonly string[])[], path: readonly Coord[]): PathValidationResult {
  if (path.length === 0) {
    return { valid: false, word: '', reason: 'Path is empty' };
  }

  const visited = new Set<number>();
  let word = '';

  for (let i = 0; i < path.length; i++) {
    const coord = path[i];
    if (!isInBounds(coord)) {
      return { valid: false, word: '', reason: 'Tile coordinate out of bounds' };
    }
    const key = coord.row * BOARD_SIZE + coord.col;
    if (visited.has(key)) {
      return { valid: false, word: '', reason: 'Cannot reuse the same tile in one word' };
    }
    if (i > 0 && !areAdjacent(path[i - 1], coord)) {
      return { valid: false, word: '', reason: 'Selected tiles must be adjacent' };
    }
    visited.add(key);
    word += board[coord.row][coord.col];
  }

  return { valid: true, word };
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

export function getBoardLetterCounts(board: readonly (readonly string[])[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const ch = board[r][c];
      counts[ch] = (counts[ch] ?? 0) + 1;
    }
  }
  return counts;
}

export interface FindWordsOptions {
  minLength?: number;
  maxLength?: number;
  targetPoolOnly?: boolean;
  limit?: number;
}

/**
 * Fast prefix-pruned DFS over the 5x5 board.
 * Uses binary-search prefix checks on CompactDictionary (~1ms per board).
 */
export function findBoardWords(
  board: readonly (readonly string[])[],
  dict: CompactDictionary,
  options: FindWordsOptions = {},
): Set<string> {
  const minLength = options.minLength ?? 3;
  const maxLength = options.maxLength ?? 8;
  const targetPoolOnly = options.targetPoolOnly ?? false;
  const limit = options.limit ?? Infinity;

  const found = new Set<string>();
  const visited = new Uint8Array(BOARD_SIZE * BOARD_SIZE);

  const hasPrefix = targetPoolOnly
    ? (p: string) => dict.hasTargetPrefix(p)
    : (p: string) => dict.hasPrefix(p);
  const hasWord = targetPoolOnly
    ? (w: string) => dict.isTargetWord(w)
    : (w: string) => dict.hasWord(w);

  const dfs = (row: number, col: number, prefix: string) => {
    if (found.size >= limit) return;
    const idx = row * BOARD_SIZE + col;
    visited[idx] = 1;

    const nextWord = prefix + board[row][col];
    if (nextWord.length >= minLength && hasWord(nextWord)) {
      found.add(nextWord);
      if (found.size >= limit) {
        visited[idx] = 0;
        return;
      }
    }

    if (nextWord.length < maxLength && hasPrefix(nextWord)) {
      for (let i = 0; i < NEIGHBOR_DELTAS.length; i++) {
        const nr = row + NEIGHBOR_DELTAS[i][0];
        const nc = col + NEIGHBOR_DELTAS[i][1];
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
          if (!visited[nr * BOARD_SIZE + nc]) {
            dfs(nr, nc, nextWord);
            if (found.size >= limit) break;
          }
        }
      }
    }

    visited[idx] = 0;
  };

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (found.size >= limit) break;
      dfs(r, c, '');
    }
  }

  return found;
}
