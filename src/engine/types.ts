export type GameMode = 'solo' | 'daily';

export type MinMatchLength = 4 | 5;

export type ShiftAxis = 'row' | 'col';
export type ShiftDirection = 'left' | 'right' | 'up' | 'down';

export interface Coord {
  row: number;
  col: number;
}

export interface ShiftOp {
  axis: ShiftAxis;
  index: number; // 0..4
  direction: ShiftDirection;
}

export interface WordMatch {
  word: string;
  axis: 'horizontal' | 'vertical';
  coords: Coord[];
  score: number;
}

export interface CascadeStep {
  stepNumber: number; // 1 = initial match, 2+ = cascade combo
  matches: WordMatch[];
  matchedCoords: Coord[];
  boardBeforeReplace: string[][];
  boardAfterReplace: string[][];
  stepScore: number;
}

export interface SavedWordRecord {
  id: string;
  word: string;
  axis: 'horizontal' | 'vertical';
  score: number;
  combo: number;
  shiftNumber: number;
}

export interface EconomyConfig {
  scoreFourLetter: number;
  scoreFiveLetter: number;
  dailyShiftLimit: number;
  maxCascadesPerShift: number;
}

export interface RunStats {
  shiftsMade: number;
  totalWordsFound: number;
  uniqueWordsCount: number;
  fiveLetterWords: number;
  bestCombo: number;
  longestWord: string;
}

export type GameAction =
  | { type: 'SHIFT'; op: ShiftOp }
  | { type: 'UNDO_SHIFT' };

export interface GameState {
  schemaVersion: number;
  gameId: string;
  seed: string;
  dictionaryVersion: string;
  mode: GameMode;
  minMatchLength: MinMatchLength;
  board: string[][];
  score: number;
  shiftsMade: number;
  tileDrawCursor: number; // deterministic counter for seeded replacement tiles
  savedWords: SavedWordRecord[];
  lastShiftUndoable: ShiftOp | null;
  dailyComplete: boolean;
  stats: RunStats;
  updatedAt: string;
}

export interface DispatchResult {
  state: GameState;
  cascades: CascadeStep[];
  error?: string;
}
