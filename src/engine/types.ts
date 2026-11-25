export type GameMode = 'solo' | 'daily';

export type MinMatchLength = 3 | 4 | 5;

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

export interface FlashStep {
  matches: WordMatch[];
  matchedCoords: Coord[];
  boardBeforeReplace: string[][];
  boardAfterReplace: string[][];
  stepScore: number;
  crossBonus: boolean;
}

export interface SavedWordRecord {
  id: string;
  word: string;
  axis: 'horizontal' | 'vertical';
  score: number;
  crossBonus: boolean;
  shiftNumber: number;
}

export interface EconomyConfig {
  scoreThreeLetter: number;
  scoreFourLetter: number;
  scoreFiveLetter: number;
  crossWordBonus: number;
  dailyShiftLimit: number;
}

export interface RunStats {
  shiftsMade: number;
  totalWordsFound: number;
  uniqueWordsCount: number;
  fiveLetterWords: number;
  crossWordsFound: number;
  longestWord: string;
}

export type GameAction =
  | { type: 'SHIFT'; op: ShiftOp }
  | { type: 'CLAIM_AT'; coord: Coord }
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
  tileDrawCursor: number;
  savedWords: SavedWordRecord[];
  lastShiftUndoable: ShiftOp | null;
  dailyComplete: boolean;
  stats: RunStats;
  updatedAt: string;
}

export interface DispatchResult {
  state: GameState;
  flash: FlashStep | null;
  error?: string;
}
